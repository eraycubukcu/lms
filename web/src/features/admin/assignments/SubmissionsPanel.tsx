import { useState } from 'react';
import { Badge, Button, Panel, Text, formStyles } from '../../../components';
import type { AssignmentSubmissionRow } from '../../../types';
import { formatDayMonthTime } from '../../dashboard/upcomingTaskMeta';
import { gradeSubmission, useAssignmentSubmissions } from '../../assignments/assignmentApi';
import styles from './AssignmentEditorPage.module.css';

interface SubmissionsPanelProps {
  assignmentId: string;
}

/** Kursa kayıtlı tüm öğrenciler; teslim edenler puanlanabilir. */
export function SubmissionsPanel({ assignmentId }: SubmissionsPanelProps) {
  const { rows, maxScore, loading, error, reload } = useAssignmentSubmissions(assignmentId);
  const submitted = rows.filter((row) => row.submission).length;

  return (
    <Panel title={`Teslimler (${submitted} / ${rows.length})`} icon="inbox">
      {loading && rows.length === 0 && (
        <Text role="body-sm" tone="muted" as="p">
          Yükleniyor…
        </Text>
      )}
      {error && (
        <Text role="body-sm" tone="error" as="p">
          {error}
        </Text>
      )}
      {!loading && !error && rows.length === 0 && (
        <Text role="body-sm" tone="muted" as="p">
          Bu kursa kayıtlı öğrenci yok.
        </Text>
      )}
      <ul className={styles.submissions}>
        {rows.map((row) => (
          <SubmissionRow key={row.student.id} assignmentId={assignmentId} row={row} maxScore={maxScore} onGraded={reload} />
        ))}
      </ul>
    </Panel>
  );
}

function SubmissionRow({
  assignmentId,
  row,
  maxScore,
  onGraded,
}: {
  assignmentId: string;
  row: AssignmentSubmissionRow;
  maxScore: number;
  onGraded: () => void;
}) {
  const { student, submission } = row;
  const [score, setScore] = useState(submission?.score?.toString() ?? '');
  const [feedback, setFeedback] = useState(submission?.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const isLink = submission?.content?.startsWith('https://');

  const save = async () => {
    if (!submission) return;
    setSaving(true);
    setRowError(null);
    try {
      await gradeSubmission(assignmentId, submission.id, Number(score), feedback.trim() || null);
      onGraded();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Puan kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={styles.submission}>
      <div className={styles.submissionHeader}>
        <span>
          <Text role="label-lg" tone="main">
            {student.name}
          </Text>{' '}
          <Text role="body-sm" tone="muted">
            {student.email}
          </Text>
        </span>
        {submission ? (
          <span className={styles.badges}>
            {submission.late && (
              <Badge tone="warning" variant="soft">
                Geç
              </Badge>
            )}
            <Badge tone={submission.gradedAt ? 'success' : 'cyan'} variant="soft">
              {submission.gradedAt ? `Puan: ${submission.score}/${maxScore}` : 'Teslim edildi'}
            </Badge>
          </span>
        ) : (
          <Badge tone="neutral" variant="soft">
            Teslim etmedi
          </Badge>
        )}
      </div>

      {submission && (
        <>
          <Text role="body-sm" tone="muted" as="p">
            {formatDayMonthTime(submission.submittedAt)}
          </Text>
          {isLink ? (
            <a href={submission.content!} target="_blank" rel="noreferrer noopener" className={styles.link}>
              {submission.content}
            </a>
          ) : (
            <Text role="body-md" as="p" className={styles.content}>
              {submission.content}
            </Text>
          )}
          <div className={styles.grade}>
            <label className={formStyles.field}>
              <Text role="label-md">Puan (0–{maxScore})</Text>
              <input
                className={formStyles.input}
                type="number"
                min={0}
                max={maxScore}
                value={score}
                onChange={(event) => setScore(event.target.value)}
              />
            </label>
            <label className={`${formStyles.field} ${styles.feedback}`}>
              <Text role="label-md">Geri bildirim</Text>
              <input className={formStyles.input} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </label>
            <Button variant="secondary" size="sm" disabled={saving || score === ''} onClick={save}>
              {saving ? 'Kaydediliyor…' : 'Puanla'}
            </Button>
          </div>
          {rowError && (
            <Text role="body-sm" tone="error" as="p">
              {rowError}
            </Text>
          )}
        </>
      )}
    </li>
  );
}
