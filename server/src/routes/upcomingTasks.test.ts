import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

const DAY = 24 * 60 * 60 * 1000;

describe('GET /api/v1/users/me/upcoming-tasks', () => {
  let app: FastifyInstance;
  let studentToken: string;
  let studentId: string;
  let otherId: string;
  let courseA: string; // student kayıtlı
  let courseB: string; // student kayıtlı değil

  const inDays = (days: number) => new Date(Date.now() + days * DAY);
  const get = (query = '') =>
    app.inject({ method: 'GET', url: `/api/v1/users/me/upcoming-tasks${query}`, headers: { authorization: `Bearer ${studentToken}` } });

  const assignment = (title: string, extra: Record<string, unknown> = {}) =>
    prisma.assignment.create({ data: { courseId: courseA, title, status: 'PUBLISHED', dueAt: inDays(3), ...extra } });

  async function exam(title: string, extra: Record<string, unknown> = {}) {
    const row = await prisma.exam.create({ data: { courseId: courseA, title, status: 'PUBLISHED', ...extra } });
    const bank = await prisma.questionBank.create({ data: { name: 'b', courseId: courseA } });
    const q = await prisma.question.create({ data: { bankId: bank.id, type: 'TRUE_FALSE', stem: 's', content: '{}' } });
    await prisma.examQuestion.create({ data: { examId: row.id, questionId: q.id, position: 1 } });
    return row;
  }

  beforeAll(async () => {
    app = await buildApp();
  });

  beforeEach(async () => {
    await prisma.assignment.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.questionBank.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    const student = await prisma.user.create({ data: { email: 's@example.com', passwordHash: 'x', name: 'S' } });
    const other = await prisma.user.create({ data: { email: 'o@example.com', passwordHash: 'x', name: 'O' } });
    studentId = student.id;
    otherId = other.id;
    studentToken = signToken({ userId: student.id, role: 'STUDENT', roles: ['STUDENT'] });
    const makeCourse = (title: string) =>
      prisma.course.create({ data: { title, description: 'A', category: 'T', level: 'B', status: 'PUBLISHED' } });
    courseA = (await makeCourse('Kurs A')).id;
    courseB = (await makeCourse('Kurs B')).id;
    await prisma.enrollment.create({ data: { userId: student.id, courseId: courseA, method: 'OPEN' } });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('requires authentication and validates limit', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/users/me/upcoming-tasks' })).statusCode).toBe(401);
    expect((await get('?limit=0')).statusCode).toBe(400);
    expect((await get('?limit=21')).statusCode).toBe(400);
    expect((await get('?limit=abc')).statusCode).toBe(400);
  });

  it('lists only actionable assignments and exams', async () => {
    const visible = await assignment('Açık ödev', { priority: 'HIGH', summary: 'AVL' });
    await assignment('Taslak', { status: 'DRAFT' });
    await assignment('Süresi doldu', { dueAt: inDays(-1) });
    await assignment('Geç teslim açık', { dueAt: inDays(-1), lateUntil: inDays(1) });
    await assignment('Henüz yayında değil', { availableFrom: inDays(1) });
    await prisma.assignment.create({ data: { courseId: courseB, title: 'Başka kurs', status: 'PUBLISHED', dueAt: inDays(1) } });
    const submitted = await assignment('Teslim edildi');
    await prisma.assignmentSubmission.create({ data: { assignmentId: submitted.id, userId: studentId, content: 'x' } });
    const othersSubmission = await assignment('Başkası teslim etti');
    await prisma.assignmentSubmission.create({ data: { assignmentId: othersSubmission.id, userId: otherId, content: 'x' } });

    await exam('Açık sınav', { durationMinutes: 45, endsAt: inDays(4) });
    await exam('Kapanmış sınav', { endsAt: inDays(-1) });
    await exam('Taslak sınav', { status: 'DRAFT' });
    await exam('Seçili öğrenciler', { audience: 'SELECTED' });

    const res = await get('?limit=20');
    expect(res.statusCode).toBe(200);
    const titles = res.json().items.map((item: { title: string }) => item.title).sort();
    expect(titles).toEqual(['Açık ödev', 'Açık sınav', 'Başkası teslim etti', 'Geç teslim açık'].sort());
    expect(res.json().total).toBe(4);

    const item = res.json().items.find((row: { id: string }) => row.id === visible.id);
    expect(item).toMatchObject({ kind: 'assignment', priority: 'HIGH', summary: 'AVL', course: { id: courseA, title: 'Kurs A' } });
    const examItem = res.json().items.find((row: { kind: string }) => row.kind === 'exam');
    expect(examItem).toMatchObject({ durationMinutes: 45, questionCount: 1, availability: 'OPEN' });
  });

  it('sorts by focus date and applies the limit while reporting the total', async () => {
    await assignment('Üç gün', { dueAt: inDays(3) });
    await assignment('Bir gün', { dueAt: inDays(1) });
    await exam('İki gün sonra açılır', { startsAt: inDays(2) });
    await exam('Süresiz sınav');

    const res = await get('?limit=3');
    expect(res.json().items.map((item: { title: string }) => item.title)).toEqual(['Bir gün', 'İki gün sonra açılır', 'Üç gün']);
    expect(res.json().total).toBe(4);
    expect(res.json().items[1].availability).toBe('UPCOMING');
    expect((await get()).json().items).toHaveLength(3);
  });
});
