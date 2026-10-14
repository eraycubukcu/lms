import { apiFetch } from '../../lib/apiClient';
import { useApiResource } from '../../lib/useApiResource';
import type {
  AssignmentInput,
  AssignmentItem,
  AssignmentSubmission,
  AssignmentSubmissionRow,
  MyAssignment,
} from '../../types';

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** GET /api/v1/assignments: kullanıcının yönetebildiği görevler. */
export function useManagedAssignments() {
  const { data, loading, error, reload } = useApiResource<{ assignments: AssignmentItem[] }>('/api/v1/assignments');
  return { assignments: data?.assignments ?? [], loading, error, reload };
}

export function useAssignment(id: string | undefined) {
  const { data, setData, loading, error, reload } = useApiResource<{ assignment: AssignmentItem }>(
    id ? `/api/v1/assignments/${id}` : null,
  );
  return { assignment: data?.assignment ?? null, setData, loading, error, reload };
}

export function useAssignmentSubmissions(id: string | undefined) {
  const { data, loading, error, reload } = useApiResource<{ maxScore: number; students: AssignmentSubmissionRow[] }>(
    id ? `/api/v1/assignments/${id}/submissions` : null,
  );
  return { rows: data?.students ?? [], maxScore: data?.maxScore ?? 0, loading, error, reload };
}

export function useMyAssignments() {
  const { data, loading, error } = useApiResource<{ assignments: MyAssignment[] }>('/api/v1/users/me/assignments');
  return { assignments: data?.assignments ?? [], loading, error };
}

export function useMySubmission(id: string | undefined) {
  const { data, setData, loading, error } = useApiResource<{ submission: AssignmentSubmission | null }>(
    id ? `/api/v1/assignments/${id}/submission` : null,
  );
  return { submission: data?.submission ?? null, setData, loading, error };
}

export const createAssignment = (input: AssignmentInput) =>
  apiFetch<{ assignment: AssignmentItem }>('/api/v1/assignments', json('POST', input));

export const updateAssignment = (id: string, input: Partial<AssignmentInput>) =>
  apiFetch<{ assignment: AssignmentItem }>(`/api/v1/assignments/${id}`, json('PATCH', input));

export const deleteAssignment = (id: string) => apiFetch<{ deleted: true }>(`/api/v1/assignments/${id}`, json('DELETE'));

export const setAssignmentPublished = (id: string, published: boolean) =>
  apiFetch<{ assignment: AssignmentItem }>(`/api/v1/assignments/${id}/${published ? 'publish' : 'unpublish'}`, json('POST'));

export const gradeSubmission = (id: string, submissionId: string, score: number, feedback: string | null) =>
  apiFetch<{ submission: AssignmentSubmission }>(
    `/api/v1/assignments/${id}/submissions/${submissionId}`,
    json('PATCH', { score, feedback }),
  );

export const saveMySubmission = (id: string, content: string) =>
  apiFetch<{ submission: AssignmentSubmission }>(`/api/v1/assignments/${id}/submission`, json('PUT', { content }));

export const withdrawMySubmission = (id: string) =>
  apiFetch<{ deleted: true }>(`/api/v1/assignments/${id}/submission`, json('DELETE'));
