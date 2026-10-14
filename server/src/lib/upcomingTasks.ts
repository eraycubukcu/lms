import { prisma } from './prisma.js';
import { effectiveQuestionCount, examAvailability } from './exams.js';

export const UPCOMING_LIMITS = { defaultLimit: 3, maxLimit: 20 } as const;

/**
 * Dashboard "Yaklaşan Görevler" paneli (FR-12): kullanıcının kayıtlı olduğu kurslardaki teslim
 * edilmemiş, süresi dolmamış ödevler ile kapanmamış yayındaki sınavlar. Ham veri döner; "2 gün kaldı"
 * gibi metinleri istemci üretir.
 */
export async function upcomingTasksFor(userId: string, limit: number, now = new Date()) {
  const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } });
  const courseIds = enrollments.map((row) => row.courseId);
  const course = { select: { id: true, title: true } } as const;

  const [assignments, exams] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'PUBLISHED',
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
        AND: [{ OR: [{ dueAt: { gt: now } }, { lateUntil: { gt: now } }] }],
        submissions: { none: { userId } },
      },
      include: { course },
    }),
    prisma.exam.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'PUBLISHED',
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        AND: [{ OR: [{ audience: 'COURSE' }, { candidates: { some: { userId } } }] }],
      },
      include: { course, _count: { select: { questions: true } } },
    }),
  ]);

  const items = [
    ...assignments.map((row) => ({
      sortAt: row.dueAt.getTime(),
      dto: {
        kind: 'assignment' as const,
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        summary: row.summary,
        dueAt: row.dueAt.toISOString(),
        lateUntil: row.lateUntil?.toISOString() ?? null,
        course: row.course,
      },
    })),
    ...exams.map((row) => ({
      // Odak tarihi: başlamamışsa açılış, açıksa kapanış; ikisi de yoksa listenin sonuna.
      sortAt: (examAvailability(row, now) === 'UPCOMING' ? row.startsAt : row.endsAt)?.getTime() ?? Infinity,
      dto: {
        kind: 'exam' as const,
        id: row.id,
        type: row.type,
        title: row.title,
        summary: row.description,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
        durationMinutes: row.durationMinutes,
        questionCount: effectiveQuestionCount(row.randomQuestionCount, row._count.questions),
        availability: examAvailability(row, now),
        course: row.course,
      },
    })),
  ].sort((a, b) => a.sortAt - b.sortAt);

  return { items: items.slice(0, limit).map((item) => item.dto), total: items.length, serverTime: now.toISOString() };
}
