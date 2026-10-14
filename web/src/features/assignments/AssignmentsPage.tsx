import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Icon, Text } from '../../components';
import { PageContainer } from '../../layout/PageContainer';
import { formatDayMonthTime, formatRemaining } from '../dashboard/upcomingTaskMeta';
import { useMyAssignments } from './assignmentApi';
import { ASSIGNMENT_TYPES, MY_STATES, myState } from './assignmentMeta';
import type { MyAssignmentState } from './assignmentMeta';
import styles from './AssignmentsPage.module.css';

type Tab = 'pending' | 'submitted' | 'graded' | 'missed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'submitted', label: 'Teslim Edilen' },
  { key: 'graded', label: 'Puanlanan' },
  { key: 'missed', label: 'Süresi Dolan' },
];

/** Öğrencinin görevleri: GET /api/v1/users/me/assignments */
export function AssignmentsPage() {
  const { assignments, loading, error } = useMyAssignments();
  const [tab, setTab] = useState<Tab>('pending');
  const withState = assignments.map((item) => ({ item, state: myState(item) }));
  const count = (state: MyAssignmentState) => withState.filter((row) => row.state === state).length;
  const visible = withState.filter((row) => row.state === tab);
  // Bitenler en yeni üstte; bekleyenler en yakın son teslim üstte (API sırası).
  if (tab !== 'pending') visible.reverse();

  return (
    <PageContainer>
      <div className={styles.header}>
        <Text role="headline-lg" as="h1">
          Ödevler & Notlar
        </Text>
        <Text role="body-md" tone="muted" as="p">
          {loading ? 'Yükleniyor…' : `${count('pending')} teslim beklemede · ${assignments.length} toplam`}
        </Text>
      </div>

      <div className={styles.tabs} role="group" aria-label="Duruma göre süz">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.tab}
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label} <span className={styles.count}>{count(item.key)}</span>
          </button>
        ))}
      </div>

      {error && (
        <Text role="body-md" tone="error" as="p">
          {error}
        </Text>
      )}
      {!loading && !error && visible.length === 0 && (
        <Card padding="lg" elevation="1">
          <Text role="body-md" tone="muted" as="p">
            Bu sekmede görev yok.
          </Text>
        </Card>
      )}

      <div className={styles.list}>
        {visible.map(({ item, state }) => {
          const badge = MY_STATES[state];
          return (
            <Card key={item.id} padding="lg" elevation="1">
              <Link to={`/gorevler/${item.id}`} className={styles.assignmentItem}>
                <div className={styles.assignmentHeader}>
                  <div>
                    <Text role="label-md" tone="secondary">
                      {item.course.title} · {ASSIGNMENT_TYPES[item.type].label}
                    </Text>
                    <Text role="title-md" as="h3">
                      {item.title}
                    </Text>
                    {item.summary && (
                      <Text role="body-sm" tone="muted">
                        {item.summary}
                      </Text>
                    )}
                  </div>
                  <Badge tone={badge.tone} variant="soft">
                    {state === 'graded' ? `${badge.label}: ${item.submission!.score}/${item.maxScore}` : badge.label}
                  </Badge>
                </div>

                <div className={styles.assignmentFooter}>
                  <div className={styles.dueDate}>
                    <Icon name="schedule" size="sm" />
                    <Text role="body-sm" tone="muted">
                      {formatDayMonthTime(item.dueAt)}
                      {state === 'pending' ? ` · ${formatRemaining(item.dueAt)}` : ''}
                    </Text>
                  </div>
                  <Icon name="arrow_forward" size="sm" />
                </div>
              </Link>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
