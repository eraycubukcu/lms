import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

const DAY = 24 * 60 * 60 * 1000;

describe('assignment submission routes', () => {
  let app: FastifyInstance;
  let instructorToken: string;
  let studentToken: string;
  let student2Token: string;
  let outsiderToken: string;
  let courseA: string;
  let instructorId: string;

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const req = (method: 'GET' | 'PUT' | 'PATCH' | 'DELETE', url: string, token: string, payload?: unknown) =>
    app.inject({ method, url, headers: auth(token), payload: payload as Record<string, unknown> | undefined });
  const inDays = (days: number) => new Date(Date.now() + days * DAY);

  async function assignment(extra: Record<string, unknown> = {}) {
    const row = await prisma.assignment.create({
      data: {
        courseId: courseA,
        title: 'Ödev',
        status: 'PUBLISHED',
        dueAt: inDays(2),
        createdById: instructorId,
        ...extra,
      },
    });
    return row.id;
  }

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    await prisma.assignment.deleteMany();
    await prisma.courseInstructor.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    const makeUser = (email: string, role: 'INSTRUCTOR' | 'STUDENT') =>
      prisma.user.create({ data: { email, passwordHash: 'x', name: email, role, roles: role } });
    const instructor = await makeUser('instructor@example.com', 'INSTRUCTOR');
    const student = await makeUser('b-student@example.com', 'STUDENT');
    const student2 = await makeUser('a-student@example.com', 'STUDENT');
    const outsider = await makeUser('outsider@example.com', 'STUDENT');
    instructorId = instructor.id;
    const tokenFor = (userId: string, role: 'INSTRUCTOR' | 'STUDENT') => signToken({ userId, role, roles: [role] });
    instructorToken = tokenFor(instructor.id, 'INSTRUCTOR');
    studentToken = tokenFor(student.id, 'STUDENT');
    student2Token = tokenFor(student2.id, 'STUDENT');
    outsiderToken = tokenFor(outsider.id, 'STUDENT');

    courseA = (
      await prisma.course.create({ data: { title: 'Kurs A', description: 'A', category: 'T', level: 'B', status: 'PUBLISHED' } })
    ).id;
    await prisma.courseInstructor.create({ data: { courseId: courseA, userId: instructor.id, position: 1 } });
    for (const userId of [student.id, student2.id]) {
      await prisma.enrollment.create({ data: { userId, courseId: courseA, method: 'OPEN' } });
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('lets enrolled students submit, update and withdraw before the deadline', async () => {
    const id = await assignment();
    const url = `/api/v1/assignments/${id}/submission`;
    expect((await req('GET', url, studentToken)).json().submission).toBeNull();
    expect((await req('PUT', url, outsiderToken, { content: 'x' })).statusCode).toBe(404);
    expect((await req('PUT', url, studentToken, { content: '  ' })).statusCode).toBe(400);

    const first = await req('PUT', url, studentToken, { content: 'Cevabım' });
    expect(first.statusCode).toBe(200);
    expect(first.json().submission).toMatchObject({ content: 'Cevabım', late: false, score: null });
    await req('PUT', url, studentToken, { content: 'Güncel cevap' });
    expect((await req('GET', url, studentToken)).json().submission.content).toBe('Güncel cevap');
    expect(await prisma.assignmentSubmission.count()).toBe(1);

    expect((await req('DELETE', url, studentToken)).statusCode).toBe(200);
    expect((await req('DELETE', url, studentToken)).statusCode).toBe(404);
  });

  it('hides drafts and enforces deadlines and late window', async () => {
    const draft = await assignment({ status: 'DRAFT' });
    expect((await req('PUT', `/api/v1/assignments/${draft}/submission`, studentToken, { content: 'x' })).statusCode).toBe(404);

    const closed = await assignment({ dueAt: inDays(-1) });
    expect((await req('PUT', `/api/v1/assignments/${closed}/submission`, studentToken, { content: 'x' })).statusCode).toBe(409);

    const lateOk = await assignment({ dueAt: inDays(-1), lateUntil: inDays(1) });
    const res = await req('PUT', `/api/v1/assignments/${lateOk}/submission`, studentToken, { content: 'x' });
    expect(res.statusCode).toBe(200);
    expect(res.json().submission.late).toBe(true);
    // Son teslim geçtiyse geri çekilemez.
    expect((await req('DELETE', `/api/v1/assignments/${lateOk}/submission`, studentToken)).statusCode).toBe(409);
  });

  it('validates LINK submissions and rejects FILE for now', async () => {
    const link = await assignment({ submissionKind: 'LINK' });
    const url = `/api/v1/assignments/${link}/submission`;
    expect((await req('PUT', url, studentToken, { content: 'bağlantı değil' })).statusCode).toBe(400);
    expect((await req('PUT', url, studentToken, { content: 'http://example.com' })).statusCode).toBe(400);
    expect((await req('PUT', url, studentToken, { content: 'https://github.com/x/y' })).statusCode).toBe(200);

    const file = await assignment({ submissionKind: 'FILE' });
    expect((await req('PUT', `/api/v1/assignments/${file}/submission`, studentToken, { content: 'x' })).statusCode).toBe(415);
  });

  it('lists the student\'s visible assignments with their own submission', async () => {
    const done = await assignment({ title: 'Teslim edilen', dueAt: inDays(1) });
    await assignment({ title: 'Bekleyen', dueAt: inDays(3) });
    await assignment({ title: 'Kapanan', dueAt: inDays(-2) });
    await assignment({ title: 'Taslak', status: 'DRAFT' });
    await req('PUT', `/api/v1/assignments/${done}/submission`, studentToken, { content: 'x' });

    const res = await req('GET', '/api/v1/users/me/assignments', studentToken);
    expect(res.statusCode).toBe(200);
    const list = res.json().assignments;
    expect(list.map((row: { title: string }) => row.title)).toEqual(['Kapanan', 'Teslim edilen', 'Bekleyen']);
    expect(list[0]).toMatchObject({ open: false, submission: null });
    expect(list[1].submission.content).toBe('x');
    expect(list[1].submissionCount).toBeUndefined();
    expect((await req('GET', '/api/v1/users/me/assignments', outsiderToken)).json().assignments).toEqual([]);
  });

  it('lists all enrolled students for managers and lets them grade', async () => {
    const id = await assignment({ maxScore: 20 });
    await req('PUT', `/api/v1/assignments/${id}/submission`, studentToken, { content: 'Cevap' });

    expect((await req('GET', `/api/v1/assignments/${id}/submissions`, studentToken)).statusCode).toBe(403);
    const list = await req('GET', `/api/v1/assignments/${id}/submissions`, instructorToken);
    expect(list.statusCode).toBe(200);
    const students = list.json().students;
    expect(students.map((row: { student: { email: string } }) => row.student.email)).toEqual([
      'a-student@example.com',
      'b-student@example.com',
    ]);
    expect(students[0].submission).toBeNull();
    const submissionId = students[1].submission.id;

    const gradeUrl = `/api/v1/assignments/${id}/submissions/${submissionId}`;
    expect((await req('PATCH', gradeUrl, instructorToken, { score: 21 })).statusCode).toBe(400);
    const graded = await req('PATCH', gradeUrl, instructorToken, { score: 18, feedback: 'İyi iş' });
    expect(graded.statusCode).toBe(200);
    expect(graded.json().submission).toMatchObject({ score: 18, feedback: 'İyi iş' });

    // Puanlanmış teslim öğrenci tarafından değiştirilemez.
    expect((await req('PUT', `/api/v1/assignments/${id}/submission`, studentToken, { content: 'yeni' })).statusCode).toBe(409);
    expect((await req('DELETE', `/api/v1/assignments/${id}/submission`, studentToken)).statusCode).toBe(409);
    expect((await req('GET', `/api/v1/assignments/${id}/submission`, studentToken)).json().submission.score).toBe(18);
    expect((await req('GET', `/api/v1/assignments/${id}/submission`, student2Token)).json().submission).toBeNull();
  });
});
