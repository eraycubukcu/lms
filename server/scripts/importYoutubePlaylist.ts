/**
 * YouTube playlist'ini bir kursa yeni modül olarak ekler: her video sıralı bir VIDEO_YOUTUBE dersi olur.
 *
 *   npm run import:playlist -- --url <playlist> --course <id | başlık parçası> [--title <modül adı>]
 *                              [--publish] [--dry-run] [--force]
 *
 * Video listesi yt-dlp ile alınır (`pip install yt-dlp`). Dersler varsayılan olarak DRAFT eklenir.
 * Skill: .claude/skills/youtube-playlist-module/SKILL.md
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../src/lib/prisma.js';

const run = promisify(execFile);

interface Args {
  url: string;
  course: string;
  title?: string;
  publish: boolean;
  dryRun: boolean;
  force: boolean;
}

interface PlaylistEntry {
  id: string;
  title: string;
  duration?: number | null;
}

interface Playlist {
  title: string;
  entries: PlaylistEntry[];
}

const UNAVAILABLE = /^\[(Deleted|Private) video\]$/;

function fail(message: string): never {
  console.error(`Hata: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    if (index === -1) return undefined;
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) fail(`${flag} bir değer bekliyor.`);
    return next;
  };
  const url = value('--url');
  const course = value('--course');
  if (!url || !course) {
    fail('Kullanım: --url <playlist linki> --course <kurs id | başlık> [--title <ad>] [--publish] [--dry-run] [--force]');
  }
  if (!new URL(url).searchParams.get('list')) fail('Bağlantıda playlist kimliği (list=...) yok.');
  return {
    url,
    course,
    title: value('--title'),
    publish: argv.includes('--publish'),
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
  };
}

async function fetchPlaylist(url: string): Promise<Playlist> {
  let stdout: string;
  try {
    ({ stdout } = await run('python', ['-m', 'yt_dlp', '--flat-playlist', '-J', '--no-warnings', url], {
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    }));
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? '';
    if (/No module named yt_dlp/.test(stderr)) fail('yt-dlp kurulu değil. Kurmak için: pip install yt-dlp');
    fail(`Playlist okunamadı: ${stderr.trim() || (err as Error).message}`);
  }
  const data = JSON.parse(stdout) as { title?: string; entries?: PlaylistEntry[] };
  return { title: data.title ?? 'YouTube Playlist', entries: data.entries ?? [] };
}

async function findCourse(query: string) {
  const byId = await prisma.course.findUnique({ where: { id: query }, select: { id: true, title: true } });
  if (byId) return byId;
  const matches = await prisma.course.findMany({
    where: { title: { contains: query } },
    select: { id: true, title: true },
  });
  if (matches.length === 1) return matches[0];
  const all = matches.length > 0 ? matches : await prisma.course.findMany({ select: { id: true, title: true } });
  console.error(matches.length === 0 ? `"${query}" ile eşleşen kurs yok. Kurslar:` : `"${query}" birden çok kursla eşleşti:`);
  for (const course of all) console.error(`  ${course.id}  ${course.title}`);
  process.exit(1);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const course = await findCourse(args.course);
  const playlist = await fetchPlaylist(args.url);
  const moduleTitle = (args.title ?? playlist.title).trim();

  const usable = playlist.entries.filter((entry) => entry.id && !UNAVAILABLE.test(entry.title));
  const skipped = playlist.entries.length - usable.length;
  if (usable.length === 0) fail('Playlist\'te eklenebilecek video yok.');

  const existing = await prisma.module.findFirst({ where: { courseId: course.id, title: moduleTitle }, select: { id: true } });
  if (existing && !args.force) {
    fail(`"${course.title}" kursunda "${moduleTitle}" adlı modül zaten var. Yine de eklemek için --force, farklı ad için --title kullanın.`);
  }

  const last = await prisma.module.aggregate({ where: { courseId: course.id }, _max: { order: true } });
  const moduleOrder = (last._max.order ?? 0) + 1;
  const status = args.publish ? 'PUBLISHED' : 'DRAFT';
  const lessons = usable.map((entry, index) => ({
    title: entry.title.trim(),
    order: index + 1,
    status,
    contentType: 'VIDEO_YOUTUBE',
    contentUrl: `https://www.youtube.com/watch?v=${entry.id}`,
    description: entry.duration ? `Süre: ${formatDuration(entry.duration)}` : null,
  }));

  console.log(`Kurs:   ${course.title} (${course.id})`);
  console.log(`Modül:  ${moduleTitle} (sıra ${moduleOrder})`);
  console.log(`Dersler (${lessons.length}, ${status}):`);
  for (const lesson of lessons) {
    console.log(`  ${String(lesson.order).padStart(3)}. ${lesson.title}${lesson.description ? `  [${lesson.description.slice(6)}]` : ''}`);
  }
  if (skipped > 0) console.log(`Atlanan (silinmiş/özel) video: ${skipped}`);

  if (args.dryRun) {
    console.log('\n--dry-run: veritabanına yazılmadı.');
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const module = await tx.module.create({ data: { courseId: course.id, title: moduleTitle, order: moduleOrder } });
    await tx.lesson.createMany({ data: lessons.map((lesson) => ({ ...lesson, moduleId: module.id })) });
    return module;
  });

  console.log(`\nEklendi: modül ${created.id}, ${lessons.length} ders.`);
  console.log(`İçerik Yönetimi: /yonetim/kurslar/${course.id}/icerik`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
