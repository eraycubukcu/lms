import { Link } from 'react-router-dom';
import { Badge, Button, Icon, Panel, Text } from '../../../components';
import type { UpcomingTask } from '../../../types';
import styles from './UpcomingTasks.module.css';

interface UpcomingTasksProps {
  tasks: UpcomingTask[];
  /** Listede gösterilmeyenler dahil bekleyen görev sayısı (rozet). */
  total: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Teslim tarihi yaklaşan ödev ve sınavlar — FR-12. */
export function UpcomingTasks({ tasks, total, loading = false, error = null, onRetry }: UpcomingTasksProps) {
  const ready = !loading && !error;

  return (
    <Panel
      title="Yaklaşan Görevler"
      icon="pending_actions"
      iconTone="warning"
      action={
        ready && total > 0 ? (
          <Badge tone="warning" variant="soft">
            {total} Teslim
          </Badge>
        ) : undefined
      }
    >
      {loading ? (
        <ul className={styles.list} aria-busy="true" aria-label="Görevler yükleniyor">
          {[0, 1, 2].map((index) => (
            <li key={index} className={`${styles.item} ${styles.skeleton}`} />
          ))}
        </ul>
      ) : error ? (
        <div className={styles.state}>
          <Text role="body-sm" as="p" tone="error">
            {error}
          </Text>
          {onRetry ? (
            <Button variant="ghost" size="sm" iconStart="refresh" onClick={onRetry}>
              Tekrar dene
            </Button>
          ) : null}
        </div>
      ) : tasks.length === 0 ? (
        <div className={styles.state}>
          <Icon name="task_alt" size="lg" />
          <Text role="body-sm" as="p" tone="muted">
            Yaklaşan görevin yok 🎉
          </Text>
        </div>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={`${task.kind}-${task.id}`} className={styles.item}>
              <div className={styles.itemHeader}>
                <Badge tone={task.tagTone} variant="soft" shape="rounded" icon={task.tagIcon}>
                  {task.tagLabel}
                </Badge>
                <Text role="label-md" tone="muted">
                  {task.dueLabel}
                </Text>
              </div>

              <div className={styles.itemBody}>
                <Text role="label-lg" as="h3" tone="main">
                  {task.title}
                </Text>
                <Text role="body-sm" as="p" tone="muted">
                  {task.description}
                </Text>
              </div>

              <div className={styles.itemFooter}>
                <span className={styles.meta}>
                  <Icon name={task.metaIcon} size="sm" />
                  <Text role="body-sm" tone="muted">
                    {task.metaLabel}
                  </Text>
                  {task.durationLabel ? (
                    <Text role="body-sm" tone="muted">
                      {task.durationLabel}
                    </Text>
                  ) : null}
                </span>

                <Link to={task.href} className={styles.action} aria-label={`${task.title}: ${task.actionLabel}`}>
                  <Text role="label-md" tone="inherit">
                    {task.actionLabel}
                  </Text>
                  <Icon name="arrow_forward" size="sm" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
