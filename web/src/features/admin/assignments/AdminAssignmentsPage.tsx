import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, ConfirmDialog, SearchInput, Text } from '../../../components';
import { PageContainer } from '../../../layout/PageContainer';
import type { AssignmentItem, AssignmentStatus } from '../../../types';
import { ApiError } from '../../../lib/apiClient';
import { searchKey } from '../question-banks/questionMeta';
import { formatDayMonthTime } from '../../dashboard/upcomingTaskMeta';
import { ASSIGNMENT_STATUS, ASSIGNMENT_TYPES, PRIORITIES } from '../../assignments/assignmentMeta';
import { deleteAssignment, setAssignmentPublished, useManagedAssignments } from '../../assignments/assignmentApi';
import styles from '../exams/AdminExamsPage.module.css';

export function AdminAssignmentsPage() {
  const navigate = useNavigate();
  const { assignments, loading, error, reload } = useManagedAssignments();
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'ALL'>('ALL');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<AssignmentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of assignments) map.set(item.course.id, item.course.title);
    return [...map].sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  }, [assignments]);

  const counts = {
    ALL: assignments.length,
    DRAFT: assignments.filter((a) => a.status === 'DRAFT').length,
    PUBLISHED: assignments.filter((a) => a.status === 'PUBLISHED').length,
  };

  const visible = assignments.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (courseFilter && item.course.id !== courseFilter) return false;
    const term = searchKey(search.trim());
    return !term || searchKey(`${item.title} ${item.course.title}`).includes(term);
  });

  const togglePublish = async (item: AssignmentItem) => {
    setActionError(null);
    try {
      await setAssignmentPublished(item.id, item.status !== 'PUBLISHED');
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'İşlem başarısız.');
    }
  };

  const tabs: { key: AssignmentStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'Tümü' },
    { key: 'DRAFT', label: 'Taslak' },
    { key: 'PUBLISHED', label: 'Yayında' },
  ];

  return (
    <PageContainer>
      <div className={styles.header}>
        <div>
          <Text role="headline-lg" as="h1">
            Görev Yönetimi
          </Text>
          <Text role="body-md" tone="muted" as="p">
            Ödev, proje ve laboratuvar görevlerini oluşturun; yayınlananlar öğrencilerin “Yaklaşan Görevler” panelinde görünür.
          </Text>
        </div>
        <div className={styles.headerActions}>
          <Button variant="primary" iconStart="add" onClick={() => navigate('/yonetim/gorevler/yeni')}>
            Yeni Görev
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Duruma göre süz">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={styles.tab}
              aria-pressed={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label} <span className={styles.count}>{counts[tab.key]}</span>
            </button>
          ))}
        </div>
        <SearchInput
          label="Görev ara"
          placeholder="Görev ara"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={styles.search}
        />
        <label className={styles.filter}>
          <span className={styles.srOnly}>Kurs</span>
          <select className={styles.select} value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
            <option value="">Tüm kurslar</option>
            {courseOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(error || actionError) && (
        <Text role="body-md" tone="error" as="p">
          {error ?? actionError}
        </Text>
      )}
      {loading && assignments.length === 0 && (
        <Text role="body-md" tone="muted" as="p">
          Yükleniyor…
        </Text>
      )}
      {!loading && !error && visible.length === 0 && (
        <Card padding="lg" elevation="1">
          <Text role="body-md" tone="muted" as="p">
            {assignments.length === 0 ? 'Henüz görev yok. "Yeni Görev" ile ilkini oluşturun.' : 'Süzgeçlere uyan görev yok.'}
          </Text>
        </Card>
      )}

      {visible.length > 0 && (
        <Card padding="none" elevation="1" className={styles.tableCard}>
          <table className={styles.table}>
            <thead className="label-md">
              <tr>
                <th scope="col">Görev</th>
                <th scope="col">Durum</th>
                <th scope="col">Son Teslim</th>
                <th scope="col">Teslim</th>
                <th scope="col">
                  <span className={styles.srOnly}>İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const status = ASSIGNMENT_STATUS[item.status];
                const priority = PRIORITIES[item.priority];
                return (
                  <tr key={item.id}>
                    <td data-label="Görev">
                      <span className={styles.examCell}>
                        <Text role="label-lg" tone="main">
                          <Link to={`/yonetim/gorevler/${item.id}`} className={styles.examLink}>
                            {item.title}
                          </Link>
                        </Text>
                        <Text role="body-sm" tone="muted">
                          {item.course.title} · {ASSIGNMENT_TYPES[item.type].label}
                        </Text>
                      </span>
                    </td>
                    <td data-label="Durum">
                      <span className={styles.badges}>
                        <Badge tone={status.tone} icon={status.icon}>
                          {status.label}
                        </Badge>
                        {item.priority !== 'NORMAL' && (
                          <Badge tone={priority.tone} variant="soft">
                            {priority.label} öncelik
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td data-label="Son Teslim">
                      <span className={styles.stack}>
                        <Text role="body-sm">{formatDayMonthTime(item.dueAt)}</Text>
                        {item.lateUntil && (
                          <Text role="body-sm" tone="muted">
                            Geç: {formatDayMonthTime(item.lateUntil)}
                          </Text>
                        )}
                      </span>
                    </td>
                    <td data-label="Teslim">
                      <Text role="body-sm">
                        {item.submissionCount ?? 0} / {item.enrolledCount ?? 0}
                      </Text>
                    </td>
                    <td className={styles.actionsCell}>
                      <span className={styles.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconStart={item.status === 'PUBLISHED' ? 'unpublished' : 'publish'}
                          onClick={() => togglePublish(item)}
                        >
                          {item.status === 'PUBLISHED' ? 'Yayından kaldır' : 'Yayınla'}
                          <span className={styles.srOnly}>: {item.title}</span>
                        </Button>
                        <Button variant="ghost" size="sm" iconStart="edit" onClick={() => navigate(`/yonetim/gorevler/${item.id}`)}>
                          Düzenle<span className={styles.srOnly}>: {item.title}</span>
                        </Button>
                        <Button variant="ghost" size="sm" iconStart="delete" onClick={() => setDeleting(item)}>
                          Sil<span className={styles.srOnly}>: {item.title}</span>
                        </Button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {deleting && (
        <ConfirmDialog
          title="Görevi sil"
          confirmLabel="Görevi sil"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteAssignment(deleting.id);
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Görev silinemedi.');
            }
            setDeleting(null);
            reload();
          }}
        >
          <Text role="body-md" as="p">
            “{deleting.title}” görevi silinecek. Teslim alınmış görevler silinemez; bunun yerine yayından kaldırabilirsiniz.
          </Text>
        </ConfirmDialog>
      )}
    </PageContainer>
  );
}
