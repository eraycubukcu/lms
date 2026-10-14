import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, Icon, Text, formStyles } from '../../components';
import { PageContainer } from '../../layout/PageContainer';
import { formatDayMonthTime, formatRemaining } from '../dashboard/upcomingTaskMeta';
import { saveMySubmission, useAssignment, useMySubmission, withdrawMySubmission } from './assignmentApi';
import { ASSIGNMENT_TYPES, MY_STATES, PRIORITIES, myState } from './assignmentMeta';
import styles from './AssignmentDetailPage.module.css';

/** Öğrenci görev ayrıntısı ve teslim formu: /gorevler/:id */
export function AssignmentDetailPage() {
  const { id } = useParams();
  const { assignment, loading, error } = useAssignment(id);
  const { submission, setData: setSubmission, loading: submissionLoading } = useMySubmission(assignment ? id : undefined);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setContent(submission?.content ?? '');
  }, [submission]);

  if (loading) {
    return (
      <PageContainer>
        <Text role="body-md" tone="muted" as="p">
          Yükleniyor…
        </Text>
      </PageContainer>
    );
  }
  if (error || !assignment) {
    return (
      <PageContainer>
        <Card padding="lg" elevation="1">
          <Text role="title-md" as="h1">
            Görev bulunamadı
          </Text>
          <Text role="body-md" tone="muted" as="p">
            Görev kaldırılmış, henüz yayınlanmamış ya da bu kursa kayıtlı olmayabilirsin.
          </Text>
          <Link to="/notlar-ve-gorevler" className={styles.back}>
            Görevlerime dön
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const now = new Date();
  const deadline = new Date(assignment.lateUntil ?? assignment.dueAt);
  const open = now <= deadline;
  const isLate = now > new Date(assignment.dueAt);
  const graded = Boolean(submission?.gradedAt);
  const canEdit = open && !graded;
  const canWithdraw = Boolean(submission) && !graded && !isLate;
  const state = MY_STATES[myState({ open, submission })];
  const isLink = assignment.submissionKind === 'LINK';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await saveMySubmission(assignment.id, content);
      setSubmission({ submission: result.submission });
      setNotice(result.submission.late ? 'Teslim alındı (geç teslim).' : 'Teslim alındı.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Teslim gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    setFormError(null);
    setNotice(null);
    setBusy(true);
    try {
      await withdrawMySubmission(assignment.id);
      setSubmission({ submission: null });
      setNotice('Teslim geri çekildi.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Teslim geri çekilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <Link to="/notlar-ve-gorevler" className={styles.back}>
        ← Görevlerim
      </Link>

      <Card padding="lg" elevation="1">
        <div className={styles.header}>
          <span className={styles.badges}>
            <Badge tone="info" variant="soft">
              {ASSIGNMENT_TYPES[assignment.type].label}
            </Badge>
            {assignment.priority === 'HIGH' && (
              <Badge tone={PRIORITIES.HIGH.tone} variant="soft" icon="priority_high">
                Yüksek Öncelik
              </Badge>
            )}
            <Badge tone={state.tone} variant="soft">
              {state.label}
            </Badge>
          </span>
          <Text role="label-md" tone="secondary">
            {assignment.course.title}
          </Text>
          <Text role="headline-md" as="h1">
            {assignment.title}
          </Text>
          {assignment.summary && (
            <Text role="body-md" tone="muted" as="p">
              {assignment.summary}
            </Text>
          )}
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>
              <Text role="label-md" tone="muted">
                Son teslim
              </Text>
            </dt>
            <dd>
              <Icon name="schedule" size="sm" />{' '}
              <Text role="body-md">
                {formatDayMonthTime(assignment.dueAt)}
                {!isLate ? ` · ${formatRemaining(assignment.dueAt)}` : ''}
              </Text>
            </dd>
          </div>
          {assignment.lateUntil && (
            <div>
              <dt>
                <Text role="label-md" tone="muted">
                  Geç teslim sınırı
                </Text>
              </dt>
              <dd>
                <Text role="body-md">{formatDayMonthTime(assignment.lateUntil)}</Text>
              </dd>
            </div>
          )}
          <div>
            <dt>
              <Text role="label-md" tone="muted">
                Puan
              </Text>
            </dt>
            <dd>
              <Text role="body-md">
                {graded ? `${submission!.score} / ${assignment.maxScore}` : `${assignment.maxScore} üzerinden`}
              </Text>
            </dd>
          </div>
        </dl>

        {assignment.instructions && (
          <section className={styles.section} aria-label="Talimatlar">
            <Text role="title-md" as="h2">
              Talimatlar
            </Text>
            <Text role="body-md" as="p" className={styles.instructions}>
              {assignment.instructions}
            </Text>
          </section>
        )}
      </Card>

      {graded && submission && (
        <Card padding="lg" elevation="1">
          <Text role="title-md" as="h2">
            Değerlendirme
          </Text>
          <Text role="headline-sm" as="p" tone="success">
            {submission.score} / {assignment.maxScore}
          </Text>
          {submission.feedback && (
            <Text role="body-md" as="p" className={styles.instructions}>
              {submission.feedback}
            </Text>
          )}
        </Card>
      )}

      <Card padding="lg" elevation="1">
        <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
          <Text role="title-md" as="h2">
            Teslimin
          </Text>
          {submission && (
            <Text role="body-sm" tone="muted" as="p">
              Son gönderim: {formatDayMonthTime(submission.submittedAt)}
              {submission.late ? ' (geç)' : ''}
            </Text>
          )}

          {assignment.submissionKind === 'FILE' ? (
            <Text role="body-md" tone="muted" as="p">
              Bu görev dosya ile teslim ediliyor; dosya yükleme henüz desteklenmiyor. Eğitmeninle iletişime geç.
            </Text>
          ) : (
            <label className={formStyles.field}>
              <Text role="label-md">{isLink ? 'Bağlantı (https://...)' : 'Cevabın'}</Text>
              {isLink ? (
                <input
                  className={formStyles.input}
                  type="url"
                  inputMode="url"
                  placeholder="https://github.com/..."
                  value={content}
                  disabled={!canEdit || submissionLoading}
                  onChange={(event) => setContent(event.target.value)}
                />
              ) : (
                <textarea
                  className={formStyles.textarea}
                  rows={8}
                  value={content}
                  disabled={!canEdit || submissionLoading}
                  onChange={(event) => setContent(event.target.value)}
                />
              )}
            </label>
          )}

          {!open && !graded && (
            <Text role="body-sm" tone="error" as="p">
              Teslim süresi doldu; artık gönderim kabul edilmiyor.
            </Text>
          )}
          {graded && (
            <Text role="body-sm" tone="muted" as="p">
              Teslimin puanlandı; artık değiştirilemez.
            </Text>
          )}
          {formError && (
            <div className={formStyles.error} role="alert">
              <Text role="body-sm" tone="error">
                {formError}
              </Text>
            </div>
          )}
          {notice && (
            <div className={formStyles.success} role="status">
              <Text role="body-sm" tone="success">
                {notice}
              </Text>
            </div>
          )}

          {assignment.submissionKind !== 'FILE' && (
            <div className={formStyles.actions}>
              {canWithdraw && (
                <Button type="button" variant="ghost" disabled={busy} onClick={handleWithdraw}>
                  Teslimi geri çek
                </Button>
              )}
              <Button type="submit" variant="primary" iconEnd="send" disabled={!canEdit || busy || content.trim() === ''}>
                {submission ? 'Teslimi güncelle' : 'Teslim et'}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </PageContainer>
  );
}
