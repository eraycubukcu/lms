import type { BadgeTone } from '../../components';
import type { AssignmentPriority, AssignmentStatus, AssignmentType, SubmissionKind } from '../../types';

export const ASSIGNMENT_TYPES: Record<AssignmentType, { label: string }> = {
  ASSIGNMENT: { label: 'Ödev' },
  PROJECT: { label: 'Proje' },
  LAB: { label: 'Laboratuvar' },
};

export const PRIORITIES: Record<AssignmentPriority, { label: string; tone: BadgeTone }> = {
  LOW: { label: 'Düşük', tone: 'neutral' },
  NORMAL: { label: 'Normal', tone: 'info' },
  HIGH: { label: 'Yüksek', tone: 'error' },
};

export const ASSIGNMENT_STATUS: Record<AssignmentStatus, { label: string; tone: BadgeTone; icon: string }> = {
  DRAFT: { label: 'Taslak', tone: 'neutral', icon: 'edit_note' },
  PUBLISHED: { label: 'Yayında', tone: 'success', icon: 'check_circle' },
};

export const SUBMISSION_KINDS: Record<SubmissionKind, { label: string; hint: string }> = {
  TEXT: { label: 'Metin', hint: 'Öğrenci cevabını metin olarak yazar.' },
  LINK: { label: 'Bağlantı', hint: 'Öğrenci https:// bağlantısı gönderir (GitHub, Colab vb.).' },
  FILE: { label: 'Dosya (yakında)', hint: 'Dosya yükleme henüz desteklenmiyor.' },
};

export type MyAssignmentState = 'pending' | 'submitted' | 'graded' | 'missed';

/** Öğrenci açısından görev durumu. */
export function myState(item: { open: boolean; submission: { gradedAt: string | null } | null }): MyAssignmentState {
  if (item.submission?.gradedAt) return 'graded';
  if (item.submission) return 'submitted';
  return item.open ? 'pending' : 'missed';
}

export const MY_STATES: Record<MyAssignmentState, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Teslim Bekleniyor', tone: 'warning' },
  submitted: { label: 'Teslim Edildi', tone: 'cyan' },
  graded: { label: 'Puanlandı', tone: 'success' },
  missed: { label: 'Süresi Doldu', tone: 'error' },
};

export const keysOf = <K extends string>(record: Record<K, unknown>) => Object.keys(record) as K[];
