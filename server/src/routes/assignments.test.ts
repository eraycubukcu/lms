import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

const DAY = 24 * 60 * 60 * 1000;

describe('assignment routes', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let instructorToken: string;
  let studentToken: string;
  let outsiderToken: string;
  let studentId: string;
  let courseA: string; // eğitmen atanmış; student kayıtlı
  let courseB: string; // outsider kayıtlı

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const req = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, token: string, payload?: unknown) =>
    app.inject({ method, url, headers: auth(token), payload: payload as Record<string, unknown> | undefined });

  const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

  async function createAssignment(token = instructorToken, extra: Record<string, unknown> = {}) {
    return req('POST', '/api/v1/assignments', token, {
      courseId: courseA,
      title: 'Proje Ödevi',
      summary: 'AVL ağacı',
      dueAt: inDays(2),
      ...extra,
    });
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

    const makeUser = (email: string, role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT') =>
      prisma.user.create({ data: { email, passwordHash: 'x', name: email, role, roles: role } });
    const admin = await makeUser('admin@example.com', 'ADMIN');
    const instructor = await makeUser('instructor@example.com', 'INSTRUCTOR');
    const student = await makeUser('student@example.com', 'STUDENT');
    const outsider = await makeUser('outsider@example.com', 'STUDENT');
    studentId = student.id;
    const tokenFor = (userId: string, role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT') => signToken({ userId, role, roles: [role] });
    adminToken = tokenFor(admin.id, 'ADMIN');
    instructorToken = tokenFor(instructor.id, 'INSTRUCTOR');
    studentToken = tokenFor(student.id, 'STUDENT');
    outsiderToken = tokenFor(outsider.id, 'STUDENT');

    const makeCourse = (title: string) =>
      prisma.course.create({ data: { title, description: 'A', category: 'T', level: 'B', status: 'PUBLISHED' } });
    courseA = (await makeCourse('Kurs A')).id;
    courseB = (await makeCourse('Kurs B')).id;
    await prisma.courseInstructor.create({ data: { courseId: courseA, userId: instructor.id, position: 1 } });
    await prisma.enrollment.create({ data: { userId: student.id, courseId: courseA, method: 'OPEN' } });
    await prisma.enrollment.create({ data: { userId: outsider.id, courseId: courseB, method: 'OPEN' } });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('lets only course managers create assignments', async () => {
      expect((await createAssignment(studentToken)).statusCode).toBe(403);
      expect((await createAssignment(instructorToken, { courseId: courseB })).statusCode).toBe(403);
      expect((await createAssignment(adminToken, { courseId: courseB })).statusCode).toBe(201);

      const res = await createAssignment(instructorToken, { type: 'PROJECT', priority: 'HIGH' });
      expect(res.statusCode).toBe(201);
      expect(res.json().assignment).toMatchObject({
        title: 'Proje Ödevi',
        summary: 'AVL ağacı',
        type: 'PROJECT',
        priority: 'HIGH',
        status: 'DRAFT',
        maxScore: 100,
        submissionKind: 'TEXT',
        course: { id: courseA, title: 'Kurs A' },
        submissionCount: 0,
        enrolledCount: 1,
      });
    });

    it('validates the body', async () => {
      expect((await createAssignment(instructorToken, { courseId: undefined })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { title: 'ab' })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { dueAt: 'yarın' })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { dueAt: undefined })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { type: 'ESSAY' })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { priority: 'URGENT' })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { maxScore: 0 })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { lateUntil: inDays(1) })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { availableFrom: inDays(3) })).statusCode).toBe(400);
      expect((await createAssignment(instructorToken, { courseId: 'yok' })).statusCode).toBe(404);
    });
  });

  describe('list / read', () => {
    it('scopes the management list to assigned courses', async () => {
      await createAssignment(instructorToken);
      await createAssignment(adminToken, { courseId: courseB, title: 'B ödevi' });

      const mine = await req('GET', '/api/v1/assignments', instructorToken);
      expect(mine.json().assignments.map((a: { title: string }) => a.title)).toEqual(['Proje Ödevi']);
      const all = await req('GET', '/api/v1/assignments', adminToken);
      expect(all.json().assignments).toHaveLength(2);
      expect((await req('GET', '/api/v1/assignments', studentToken)).statusCode).toBe(403);
      expect((await req('GET', '/api/v1/assignments?status=X', adminToken)).statusCode).toBe(400);
    });

    it('shows students only published, available assignments of their courses', async () => {
      const id = (await createAssignment()).json().assignment.id;
      expect((await req('GET', `/api/v1/assignments/${id}`, studentToken)).statusCode).toBe(404);

      await req('POST', `/api/v1/assignments/${id}/publish`, instructorToken);
      const res = await req('GET', `/api/v1/assignments/${id}`, studentToken);
      expect(res.statusCode).toBe(200);
      expect(res.json().assignment.submissionCount).toBeUndefined();
      expect((await req('GET', `/api/v1/assignments/${id}`, outsiderToken)).statusCode).toBe(404);

      await req('PATCH', `/api/v1/assignments/${id}`, instructorToken, { availableFrom: inDays(1) });
      expect((await req('GET', `/api/v1/assignments/${id}`, studentToken)).statusCode).toBe(404);
    });
  });

  describe('update / publish / delete', () => {
    it('merges partial updates and keeps the course fixed', async () => {
      const id = (await createAssignment()).json().assignment.id;
      const res = await req('PATCH', `/api/v1/assignments/${id}`, instructorToken, { priority: 'HIGH', maxScore: 50 });
      expect(res.statusCode).toBe(200);
      expect(res.json().assignment).toMatchObject({ title: 'Proje Ödevi', priority: 'HIGH', maxScore: 50 });

      expect((await req('PATCH', `/api/v1/assignments/${id}`, instructorToken, { courseId: courseB })).statusCode).toBe(400);
      expect((await req('PATCH', `/api/v1/assignments/${id}`, instructorToken, {})).statusCode).toBe(400);
      expect((await req('PATCH', `/api/v1/assignments/${id}`, studentToken, { title: 'xxx' })).statusCode).toBe(403);
      expect((await req('PATCH', '/api/v1/assignments/yok', instructorToken, { title: 'xxx' })).statusCode).toBe(404);
    });

    it('publishes and unpublishes', async () => {
      const id = (await createAssignment()).json().assignment.id;
      expect((await req('POST', `/api/v1/assignments/${id}/publish`, instructorToken)).json().assignment.status).toBe('PUBLISHED');
      expect((await req('POST', `/api/v1/assignments/${id}/unpublish`, instructorToken)).json().assignment.status).toBe('DRAFT');
      expect((await req('POST', `/api/v1/assignments/${id}/publish`, studentToken)).statusCode).toBe(403);
    });

    it('refuses to delete an assignment with submissions', async () => {
      const id = (await createAssignment()).json().assignment.id;
      await prisma.assignmentSubmission.create({ data: { assignmentId: id, userId: studentId, content: 'x' } });
      expect((await req('DELETE', `/api/v1/assignments/${id}`, instructorToken)).statusCode).toBe(409);

      await prisma.assignmentSubmission.deleteMany();
      expect((await req('DELETE', `/api/v1/assignments/${id}`, instructorToken)).statusCode).toBe(200);
      expect(await prisma.assignment.count()).toBe(0);
    });
  });
});
