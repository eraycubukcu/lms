import type { BadgeTone } from '../../components';
import type { AssignmentType, UpcomingTask, UpcomingTaskDto } from '../../types';

const HOUR = 60 * 60 * 1000;

const dayMonthTime = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const weekdayTime = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

const TYPE_TAGS: Record<AssignmentType, { label: string; tone: BadgeTone; icon?: string }> = {
  ASSIGNMENT: { label: 'Ödev', tone: 'info', icon: 'assignment' },
  PROJECT: { label: 'Proje', tone: 'cyan', icon: 'deployed_code' },
  LAB: { label: 'Laboratuvar', tone: 'neutral' },
};

/** Yerel takvim günü farkı (saat dilimine göre; 23:59 → ertesi gün 00:01 = 1 gün). */
function calendarDayDiff(target: Date, now: Date): number {
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOf(target) - startOf(now)) / (24 * HOUR));
}

/** "Cuma 14:00" — Intl "Cuma 14:00" biçimini verir; ilk harf büyütülür. */
function formatWeekdayTime(date: Date): string {
  const text = weekdayTime.format(date);
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
}

/** Son teslime kalan süre: "3 saat kaldı", "Bugün", "Yarın", "N gün kaldı". */
export function formatRemaining(iso: string, now = new Date()): string {
  const target = new Date(iso);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Süre doldu';
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / 60000))} dakika kaldı`;
  const days = calendarDayDiff(target, now);
  if (days === 0) return diff < 12 * HOUR ? `${Math.round(diff / HOUR)} saat kaldı` : 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days} gün kaldı`;
}

/** "27 Ekim 23:59" */
export function formatDayMonthTime(iso: string): string {
  return dayMonthTime.format(new Date(iso)).replace(',', '');
}

/** API kaydını panel kartına çevirir. */
export function toUpcomingTask(dto: UpcomingTaskDto, now = new Date()): UpcomingTask {
  if (dto.kind === 'assignment') {
    const tag = dto.priority === 'HIGH' ? { label: 'Yüksek Öncelik', tone: 'error' as const, icon: 'priority_high' } : TYPE_TAGS[dto.type];
    const late = new Date(dto.dueAt) <= now && dto.lateUntil;
    return {
      id: dto.id,
      kind: 'assignment',
      href: `/gorevler/${dto.id}`,
      tagLabel: tag.label,
      tagTone: tag.tone,
      tagIcon: tag.icon,
      dueLabel: late ? 'Geç teslim' : formatRemaining(dto.dueAt, now),
      title: dto.title,
      description: dto.summary ?? dto.course.title,
      metaIcon: 'schedule',
      metaLabel: formatDayMonthTime(late ? dto.lateUntil! : dto.dueAt),
      actionLabel: 'Teslim Et',
    };
  }

  const upcoming = dto.availability === 'UPCOMING';
  const focus = upcoming ? dto.startsAt : dto.endsAt;
  let dueLabel = 'Açık';
  if (focus) {
    const days = calendarDayDiff(new Date(focus), now);
    dueLabel = upcoming && days <= 6 ? formatWeekdayTime(new Date(focus)) : formatRemaining(focus, now);
  }
  const description = [dto.summary ?? dto.course.title, `${dto.questionCount} Soru`].join(' · ');
  return {
    id: dto.id,
    kind: 'exam',
    href: '/sinavlar',
    tagLabel: 'Çevrim İçi Sınav',
    tagTone: 'brand',
    tagIcon: 'quiz',
    dueLabel,
    title: dto.title,
    description,
    metaIcon: 'timelapse',
    metaLabel: dto.durationMinutes ? `${dto.durationMinutes} Dakika Süre` : 'Süre sınırı yok',
    durationLabel: upcoming ? 'Henüz Başlamadı' : 'Şu An Açık',
    actionLabel: 'Detaylar',
  };
}
