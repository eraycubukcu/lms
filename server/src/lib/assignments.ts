import type { Prisma } from '@prisma/client';
import { AppError } from '../errors.js';

export const ASSIGNMENT_TYPES = ['ASSIGNMENT', 'PROJECT', 'LAB'] as const;
export const ASSIGNMENT_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export const ASSIGNMENT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export const SUBMISSION_KINDS = ['TEXT', 'LINK', 'FILE'] as const;

export const ASSIGNMENT_LIMITS = {
  minTitle: 3,
  maxTitle: 200,
  maxSummary: 200,
  maxInstructions: 10_000,
  minScore: 1,
  maxScore: 1000,
} as const;

/** PATCH'te değiştirilebilen alanlar (courseId hariç: kurs sonradan değiştirilemez). */
export const ASSIGNMENT_FIELDS = [
  'title',
  'summary',
  'instructions',
  'type',
  'priority',
  'status',
  'availableFrom',
  'dueAt',
  'lateUntil',
  'maxScore',
  'submissionKind',
] as const;

export type RawAssignmentInput = Partial<Record<(typeof ASSIGNMENT_FIELDS)[number], unknown>>;

export interface AssignmentSettings {
  title: string;
  summary: string | null;
  instructions: string | null;
  type: string;
  priority: string;
  status: string;
  availableFrom: Date | null;
  dueAt: Date;
  lateUntil: Date | null;
  maxScore: number;
  submissionKind: string;
}

function validation(message: string): AppError {
  return new AppError('VALIDATION_ERROR', message, 400);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string, fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw validation(`${field} şunlardan biri olmalıdır: ${allowed.join(', ')}.`);
  }
  return value as T;
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw validation(`${field} metin olmalıdır.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw validation(`${field} en fazla ${max} karakter olabilir.`);
  return trimmed === '' ? null : trimmed;
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw validation(`${field} geçerli bir tarih olmalıdır (ISO 8601).`);
  return date;
}

/** Ham gövdeyi doğrular ve veritabanı alanlarına çevirir. Geçersizse 400 fırlatır. */
export function normalizeAssignment(raw: RawAssignmentInput): AssignmentSettings {
  if (typeof raw.title !== 'string') throw validation('Başlık zorunludur.');
  const title = raw.title.trim();
  if (title.length < ASSIGNMENT_LIMITS.minTitle || title.length > ASSIGNMENT_LIMITS.maxTitle) {
    throw validation(`Başlık ${ASSIGNMENT_LIMITS.minTitle}–${ASSIGNMENT_LIMITS.maxTitle} karakter olmalıdır.`);
  }

  const dueAt = optionalDate(raw.dueAt, 'Son teslim tarihi');
  if (!dueAt) throw validation('Son teslim tarihi (dueAt) zorunludur.');
  const availableFrom = optionalDate(raw.availableFrom, 'Yayın tarihi');
  const lateUntil = optionalDate(raw.lateUntil, 'Geç teslim sınırı');
  if (availableFrom && availableFrom >= dueAt) throw validation('Yayın tarihi son teslim tarihinden önce olmalıdır.');
  if (lateUntil && lateUntil <= dueAt) throw validation('Geç teslim sınırı son teslim tarihinden sonra olmalıdır.');

  let maxScore = 100;
  if (raw.maxScore !== undefined) {
    if (
      typeof raw.maxScore !== 'number' ||
      !Number.isInteger(raw.maxScore) ||
      raw.maxScore < ASSIGNMENT_LIMITS.minScore ||
      raw.maxScore > ASSIGNMENT_LIMITS.maxScore
    ) {
      throw validation(`Maksimum puan ${ASSIGNMENT_LIMITS.minScore} ile ${ASSIGNMENT_LIMITS.maxScore} arasında bir tam sayı olmalıdır.`);
    }
    maxScore = raw.maxScore;
  }

  return {
    title,
    summary: optionalText(raw.summary, 'Kısa açıklama', ASSIGNMENT_LIMITS.maxSummary),
    instructions: optionalText(raw.instructions, 'Talimatlar', ASSIGNMENT_LIMITS.maxInstructions),
    type: oneOf(raw.type, ASSIGNMENT_TYPES, 'type', 'ASSIGNMENT'),
    priority: oneOf(raw.priority, ASSIGNMENT_PRIORITIES, 'priority', 'NORMAL'),
    status: oneOf(raw.status, ASSIGNMENT_STATUSES, 'status', 'DRAFT'),
    availableFrom,
    dueAt,
    lateUntil,
    maxScore,
    submissionKind: oneOf(raw.submissionKind, SUBMISSION_KINDS, 'submissionKind', 'TEXT'),
  };
}

/** Mevcut kaydı PATCH birleştirmesi için ham girdiye çevirir. */
export function toRawAssignment(row: AssignmentSettings): RawAssignmentInput {
  return { ...row };
}

export const assignmentInclude = {
  course: { select: { id: true, title: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export type AssignmentRow = Prisma.AssignmentGetPayload<{ include: typeof assignmentInclude }>;

/** Teslim kabul edilen son an: geç teslim sınırı varsa o, yoksa son teslim tarihi. */
export function submissionDeadline(row: { dueAt: Date; lateUntil: Date | null }): Date {
  return row.lateUntil ?? row.dueAt;
}

/** Öğrencinin görebileceği ödev mi: yayında ve (varsa) yayın tarihi gelmiş. */
export function isVisibleToStudents(row: { status: string; availableFrom: Date | null }, now: Date): boolean {
  return row.status === 'PUBLISHED' && (!row.availableFrom || row.availableFrom <= now);
}

export function serializeAssignment(row: AssignmentRow, stats?: { submissionCount: number; enrolledCount: number }) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    instructions: row.instructions,
    type: row.type,
    priority: row.priority,
    status: row.status,
    course: { id: row.course.id, title: row.course.title },
    availableFrom: row.availableFrom?.toISOString() ?? null,
    dueAt: row.dueAt.toISOString(),
    lateUntil: row.lateUntil?.toISOString() ?? null,
    maxScore: row.maxScore,
    submissionKind: row.submissionKind,
    createdBy: row.createdBy ? { id: row.createdBy.id, name: row.createdBy.name } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(stats ?? {}),
  };
}
