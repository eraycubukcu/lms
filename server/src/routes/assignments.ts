import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { AppError } from '../errors.js';
import { assertCanManageCourse, assignedCourseIds, canManageCourse } from '../lib/courseAccess.js';
import {
  ASSIGNMENT_FIELDS,
  assignmentInclude,
  isVisibleToStudents,
  normalizeAssignment,
  serializeAssignment,
  toRawAssignment,
  type AssignmentRow,
  type RawAssignmentInput,
} from '../lib/assignments.js';
import { UPCOMING_LIMITS, upcomingTasksFor } from '../lib/upcomingTasks.js';

type AuthUser = NonNullable<Parameters<typeof assertCanManageCourse>[0]>;

function validation(message: string): AppError {
  return new AppError('VALIDATION_ERROR', message, 400);
}

function requireBodyObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validation('İstek gövdesi bir nesne olmalıdır.');
  }
  return body as Record<string, unknown>;
}

const notFound = () => new AppError('NOT_FOUND', 'Görev bulunamadı.', 404);

async function loadManagedAssignment(user: AuthUser, id: string): Promise<AssignmentRow> {
  const row = await prisma.assignment.findUnique({ where: { id }, include: assignmentInclude });
  if (!row) throw notFound();
  await assertCanManageCourse(user, row.courseId);
  return row;
}

/** Yönetim görünümü için teslim ve kayıtlı öğrenci sayıları. */
async function managerStats(row: { id: string; courseId: string }) {
  const [submissionCount, enrolledCount] = await Promise.all([
    prisma.assignmentSubmission.count({ where: { assignmentId: row.id } }),
    prisma.enrollment.count({ where: { courseId: row.courseId } }),
  ]);
  return { submissionCount, enrolledCount };
}

async function setStatus(user: AuthUser, id: string, status: 'DRAFT' | 'PUBLISHED') {
  const row = await loadManagedAssignment(user, id);
  const updated = await prisma.assignment.update({ where: { id: row.id }, data: { status }, include: assignmentInclude });
  return { assignment: serializeAssignment(updated, await managerStats(updated)) };
}

export function registerAssignmentRoutes(app: FastifyInstance) {
  const staff = { preHandler: [requireAuth, requireRole('ADMIN', 'INSTRUCTOR')] };

  app.get<{ Querystring: { courseId?: string; status?: string } }>('/api/v1/assignments', staff, async (request) => {
    const user = request.user!;
    const { courseId, status } = request.query;
    if (status && status !== 'DRAFT' && status !== 'PUBLISHED') {
      throw validation('status DRAFT veya PUBLISHED olmalıdır.');
    }
    const assigned = await assignedCourseIds(user);
    const rows = await prisma.assignment.findMany({
      where: {
        AND: [
          user.role === 'ADMIN' ? {} : { courseId: { in: [...assigned] } },
          courseId ? { courseId } : {},
          status ? { status } : {},
        ],
      },
      include: { ...assignmentInclude, _count: { select: { submissions: true } } },
      orderBy: [{ dueAt: 'asc' }],
    });
    const courseIds = [...new Set(rows.map((row) => row.courseId))];
    const enrollments = await prisma.enrollment.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _count: { _all: true },
    });
    const enrolledByCourse = new Map(enrollments.map((row) => [row.courseId, row._count._all]));
    return {
      assignments: rows.map((row) =>
        serializeAssignment(row, {
          submissionCount: row._count.submissions,
          enrolledCount: enrolledByCourse.get(row.courseId) ?? 0,
        }),
      ),
    };
  });

  // Yöneticiye tam kayıt; kayıtlı öğrenciye yalnızca görünür (yayında) ödev. Diğerlerine 404.
  app.get<{ Params: { id: string } }>('/api/v1/assignments/:id', { preHandler: [requireAuth] }, async (request) => {
    const user = request.user!;
    const row = await prisma.assignment.findUnique({ where: { id: request.params.id }, include: assignmentInclude });
    if (!row) throw notFound();
    if (await canManageCourse(user, row.courseId)) {
      return { assignment: serializeAssignment(row, await managerStats(row)) };
    }
    const enrolled = await prisma.enrollment.findFirst({
      where: { userId: user.userId, courseId: row.courseId },
      select: { id: true },
    });
    if (!enrolled || !isVisibleToStudents(row, new Date())) throw notFound();
    return { assignment: serializeAssignment(row) };
  });

  app.post<{ Body: unknown }>('/api/v1/assignments', staff, async (request, reply) => {
    const user = request.user!;
    const body = requireBodyObject(request.body);
    if (typeof body.courseId !== 'string' || body.courseId === '') throw validation('courseId zorunludur.');
    const course = await prisma.course.findUnique({ where: { id: body.courseId }, select: { id: true } });
    if (!course) throw new AppError('NOT_FOUND', 'Kurs bulunamadı.', 404);
    await assertCanManageCourse(user, course.id);

    const settings = normalizeAssignment(body as RawAssignmentInput);
    const created = await prisma.assignment.create({
      data: { ...settings, courseId: course.id, createdById: user.userId },
      include: assignmentInclude,
    });
    reply.status(201);
    return { assignment: serializeAssignment(created, await managerStats(created)) };
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/api/v1/assignments/:id', staff, async (request) => {
    const user = request.user!;
    const existing = await loadManagedAssignment(user, request.params.id);
    const body = requireBodyObject(request.body);
    if (body.courseId !== undefined && body.courseId !== existing.courseId) {
      throw validation('Görevin kursu sonradan değiştirilemez; yeni bir görev oluşturun.');
    }
    if (!ASSIGNMENT_FIELDS.some((field) => body[field] !== undefined)) {
      throw validation('Güncellenecek en az bir alan gönderilmelidir.');
    }
    const merged: RawAssignmentInput = toRawAssignment(existing);
    for (const field of ASSIGNMENT_FIELDS) {
      if (body[field] !== undefined) merged[field] = body[field];
    }
    const settings = normalizeAssignment(merged);
    const updated = await prisma.assignment.update({
      where: { id: existing.id },
      data: settings,
      include: assignmentInclude,
    });
    return { assignment: serializeAssignment(updated, await managerStats(updated)) };
  });

  // Teslim almış görev silinmez (öğrenci emeği kaybolmasın); önce yayından kaldırılabilir.
  app.delete<{ Params: { id: string } }>('/api/v1/assignments/:id', staff, async (request) => {
    const row = await loadManagedAssignment(request.user!, request.params.id);
    const submissions = await prisma.assignmentSubmission.count({ where: { assignmentId: row.id } });
    if (submissions > 0) {
      throw new AppError(
        'ASSIGNMENT_HAS_SUBMISSIONS',
        'Teslim alınmış görev silinemez; bunun yerine yayından kaldırabilirsiniz.',
        409,
      );
    }
    await prisma.assignment.deleteMany({ where: { id: row.id } });
    return { deleted: true };
  });

  // Dashboard "Yaklaşan Görevler": teslim bekleyen ödevler + kapanmamış sınavlar, tarihe göre.
  app.get<{ Querystring: { limit?: string } }>(
    '/api/v1/users/me/upcoming-tasks',
    { preHandler: [requireAuth] },
    async (request) => {
      const raw = request.query.limit;
      const limit = raw === undefined ? UPCOMING_LIMITS.defaultLimit : Number(raw);
      if (!Number.isInteger(limit) || limit < 1 || limit > UPCOMING_LIMITS.maxLimit) {
        throw validation(`limit 1 ile ${UPCOMING_LIMITS.maxLimit} arasında bir tam sayı olmalıdır.`);
      }
      return upcomingTasksFor(request.user!.userId, limit);
    },
  );

  app.post<{ Params: { id: string } }>('/api/v1/assignments/:id/publish', staff, async (request) =>
    setStatus(request.user!, request.params.id, 'PUBLISHED'),
  );

  app.post<{ Params: { id: string } }>('/api/v1/assignments/:id/unpublish', staff, async (request) =>
    setStatus(request.user!, request.params.id, 'DRAFT'),
  );
}
