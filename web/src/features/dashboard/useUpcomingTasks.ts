import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import type { UpcomingTaskDto, UpcomingTasksResponse } from '../../types';

/** Teslim bekleyen ödevler ve kapanmamış sınavlar: GET /api/v1/users/me/upcoming-tasks */
export function useUpcomingTasks(limit = 3) {
  const [items, setItems] = useState<UpcomingTaskDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<UpcomingTasksResponse>(`/api/v1/users/me/upcoming-tasks?limit=${limit}`)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Görevler yüklenemedi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { items, total, loading, error, reload };
}
