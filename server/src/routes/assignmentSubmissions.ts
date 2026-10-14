import type { FastifyInstance } from 'fastify';
import type { AssignmentSubmission } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/rbac.js';
import { AppError } from '../errors.js';
import { assertCanManageCourse } from '../lib/courseAccess.js';
import { assignmentInclude, isVisibleToStudents, serializeAssignment, submissionDeadline } from '../lib/assignments.js';

const MAX_TEXT = 20_000;
const MAX_URL = 2_000;
const MAX_FEEDBACK = 5_000;

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

function serializeSubmission(row: AssignmentSubmission) {
  return {
    id: row.id,
    content: row.content,
    filePath: row.filePath,
    submittedAt: row.submittedAt.toISOString(),
    late: row.late,
    score: row.score,
    feedback: row.feedback,
    gradedAt: row.gradedAt?.toISOString() ?? null,
  };
}

/** Öğrencinin teslim yapabileceği/göreceği ödev: kayıtlı olduğu kursta ve görünür. Değilse 404. */
async function loadStudentAssignment(userId: string, id: string) {
  const row = await prisma.assignment.findUnique({ where: { id } });
  if (!row) throw notFound();
  const enrolled = await prisma.enrollment.findFirst({ where: { userId, courseId: row.courseId }, select: { id: true } });
  if (!enrolled || !isVisibleToStudents(row, new Date())) throw notFound();
  return row;
}

/** Teslim içeriğini ödevin teslim biçimine göre doğrular. */
function parseContent(kind: string, value: unknown): string {
  if (kind === 'FILE') {
    throw new AppError('UNSUPPORTED_SUBMISSION_KIND', 'Dosya ile teslim henüz desteklenmiyor.', 415);
  }
  if (typeof value !== 'string' || value.trim() === '') throw validation('Teslim içeriği (content) zorunludur.');
  const content = value.trim();
  if (kind === 'LINK') {
    let url: URL;
    try {
      url = new URL(content);
    } catch {
      throw validation('Geçerli bir bağlantı girin (https://...).');
    }
    if (url.protocol !== 'https:') throw validation('Bağlantı https:// ile başlamalıdır.');
    if (content.length > MAX_URL) throw validation(`Bağlantı en fazla ${MAX_URL} karakter olabilir.`);
    return content;
  }
  if (content.length > MAX_TEXT) throw validation(`Teslim metni en fazla ${MAX_TEXT} karakter olabilir.`);
  return content;
}

export function registerAssignmentSubmissionRoutes(app: FastifyInstance) {
  const staff = { preHandler: [requireAuth, requireRole('ADMIN', 'INSTRUCTOR')] };
  const authed = { preHandler: [requireAuth] };

  // Öğrencinin tüm görevleri (yayında, kayıtlı kurslarda) ve kendi teslim durumu; son teslime göre.
  app.get('/api/v1/users/me/assignments', authed, async (request) => {
    const userId = request.user!.userId;
    const now = new Date();
    const enrollments = await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } });
    const rows = await prisma.assignment.findMany({
      where: {
        courseId: { in: enrollments.map((row) => row.courseId) },
        status: 'PUBLISHED',
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
      },
      include: { ...assignmentInclude, submissions: { where: { userId } } },
      orderBy: { dueAt: 'asc' },
    });
    return {
      assignments: rows.map(({ submissions, ...row }) => ({
        ...serializeAssignment(row),
        submission: submissions[0] ? serializeSubmission(submissions[0]) : null,
        open: now <= submissionDeadline(row),
      })),
      serverTime: now.toISOString(),
    };
  });

  app.get<{ Params: { id: string } }>('/api/v1/assignments/:id/submission', authed, async (request) => {
    const userId = request.user!.userId;
    const assignment = await loadStudentAssignment(userId, request.params.id);
    const row = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
    });
    return { submission: row ? serializeSubmission(row) : null };
  });

  // Oluşturur veya günceller. Son an (lateUntil ?? dueAt) geçtiyse ya da teslim puanlandıysa reddedilir.
  app.put<{ Params: { id: string }; Body: unknown }>('/api/v1/assignments/:id/submission', authed, async (request) => {
    const userId = request.user!.userId;
    const assignment = await loadStudentAssignment(userId, request.params.id);
    const now = new Date();
    if (now > submissionDeadline(assignment)) {
      throw new AppError('SUBMISSION_CLOSED', 'Bu görevin teslim süresi doldu.', 409);
    }
    const content = parseContent(assignment.submissionKind, requireBodyObject(request.body).content);
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
    });
    if (existing?.gradedAt) {
      throw new AppError('SUBMISSION_GRADED', 'Puanlanmış teslim değiştirilemez.', 409);
    }
    const data = { content, submittedAt: now, late: now > assignment.dueAt };
    const row = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
      create: { ...data, assignmentId: assignment.id, userId },
      update: data,
    });
    return { submission: serializeSubmission(row) };
  });

  app.delete<{ Params: { id: string } }>('/api/v1/assignments/:id/submission', authed, async (request) => {
    const userId = request.user!.userId;
    const assignment = await loadStudentAssignment(userId, request.params.id);
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
    });
    if (!existing) throw new AppError('NOT_FOUND', 'Teslim bulunamadı.', 404);
    if (existing.gradedAt) throw new AppError('SUBMISSION_GRADED', 'Puanlanmış teslim geri çekilemez.', 409);
    if (new Date() > assignment.dueAt) {
      throw new AppError('SUBMISSION_CLOSED', 'Son teslim tarihi geçtikten sonra teslim geri çekilemez.', 409);
    }
    await prisma.assignmentSubmission.delete({ where: { id: existing.id } });
    return { deleted: true };
  });

  // Yönetici görünümü: kursa kayıtlı tüm öğrenciler, teslim edenler ve etmeyenler birlikte.
  app.get<{ Params: { id: string } }>('/api/v1/assignments/:id/submissions', staff, async (request) => {
    const assignment = await prisma.assignment.findUnique({ where: { id: request.params.id } });
    if (!assignment) throw notFound();
    await assertCanManageCourse(request.user!, assignment.courseId);
    const [enrollments, submissions] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: assignment.courseId },
        select: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      }),
      prisma.assignmentSubmission.findMany({ where: { assignmentId: assignment.id } }),
    ]);
    const byUser = new Map(submissions.map((row) => [row.userId, row]));
    return {
      maxScore: assignment.maxScore,
      students: enrollments
        .map(({ user }) => {
          const row = byUser.get(user.id);
          return { student: user, submission: row ? serializeSubmission(row) : null };
        })
        .sort((a, b) => a.student.name.localeCompare(b.student.name, 'tr')),
    };
  });

  app.patch<{ Params: { id: string; submissionId: string }; Body: unknown }>(
    '/api/v1/assignments/:id/submissions/:submissionId',
    staff,
    async (request) => {
      const user = request.user!;
      const assignment = await prisma.assignment.findUnique({ where: { id: request.params.id } });
      if (!assignment) throw notFound();
      await assertCanManageCourse(user, assignment.courseId);
      const submission = await prisma.assignmentSubmission.findFirst({
        where: { id: request.params.submissionId, assignmentId: assignment.id },
      });
      if (!submission) throw new AppError('NOT_FOUND', 'Teslim bulunamadı.', 404);

      const body = requireBodyObject(request.body);
      const { score, feedback } = body;
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > assignment.maxScore) {
        throw validation(`Puan 0 ile ${assignment.maxScore} arasında bir tam sayı olmalıdır.`);
      }
      if (feedback !== undefined && feedback !== null && typeof feedback !== 'string') {
        throw validation('Geri bildirim metin olmalıdır.');
      }
      const feedbackText = typeof feedback === 'string' ? feedback.trim() : null;
      if (feedbackText && feedbackText.length > MAX_FEEDBACK) {
        throw validation(`Geri bildirim en fazla ${MAX_FEEDBACK} karakter olabilir.`);
      }
      const row = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: { score, feedback: feedbackText || null, gradedAt: new Date(), gradedById: user.userId },
      });
      return { submission: serializeSubmission(row) };
    },
  );
}
