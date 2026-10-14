import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Text, formStyles } from '../../../components';
import { PageContainer } from '../../../layout/PageContainer';
import { useCurrentUser } from '../../../data/useCurrentUser';
import type { AssignmentInput, AssignmentItem, AssignmentPriority, AssignmentType, SubmissionKind } from '../../../types';
import { useEventCourses } from '../../calendar/useEventCourses';
import { toDateTimeInput } from '../../calendar/dateUtils';
import { UpcomingTasks } from '../../dashboard/components';
import { toUpcomingTask } from '../../dashboard/upcomingTaskMeta';
import { ASSIGNMENT_STATUS, ASSIGNMENT_TYPES, PRIORITIES, SUBMISSION_KINDS, keysOf } from '../../assignments/assignmentMeta';
import { createAssignment, setAssignmentPublished, updateAssignment, useAssignment } from '../../assignments/assignmentApi';
import { SubmissionsPanel } from './SubmissionsPanel';
import styles from './AssignmentEditorPage.module.css';

interface FormState {
  courseId: string;
  title: string;
  summary: string;
  instructions: string;
  type: AssignmentType;
  priority: AssignmentPriority;
  availableFrom: string;
  dueAt: string;
  lateUntil: string;
  maxScore: string;
  submissionKind: SubmissionKind;
}

const local = (iso: string | null) => (iso ? toDateTimeInput(new Date(iso)) : '');
const iso = (value: string) => (value ? new Date(value).toISOString() : null);

function defaultState(): FormState {
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  due.setHours(23, 59, 0, 0);
  return {
    courseId: '',
    title: '',
    summary: '',
    instructions: '',
    type: 'ASSIGNMENT',
    priority: 'NORMAL',
    availableFrom: '',
    dueAt: toDateTimeInput(due),
    lateUntil: '',
    maxScore: '100',
    submissionKind: 'TEXT',
  };
}

function fromItem(item: AssignmentItem): FormState {
  return {
    courseId: item.course.id,
    title: item.title,
    summary: item.summary ?? '',
    instructions: item.instructions ?? '',
    type: item.type,
    priority: item.priority,
    availableFrom: local(item.availableFrom),
    dueAt: local(item.dueAt),
    lateUntil: local(item.lateUntil),
    maxScore: String(item.maxScore),
    submissionKind: item.submissionKind,
  };
}

function toInput(state: FormState): AssignmentInput {
  return {
    title: state.title.trim(),
    summary: state.summary.trim() || null,
    instructions: state.instructions.trim() || null,
    type: state.type,
    priority: state.priority,
    availableFrom: iso(state.availableFrom),
    dueAt: iso(state.dueAt) ?? '',
    lateUntil: iso(state.lateUntil),
    maxScore: Number(state.maxScore),
    submissionKind: state.submissionKind,
  };
}

export function AssignmentEditorPage() {
  const { assignmentId } = useParams();
  const isNew = !assignmentId || assignmentId === 'yeni';
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const courses = useEventCourses(user);
  const { assignment, setData, loading, error } = useAssignment(isNew ? undefined : assignmentId);
  const [state, setState] = useState<FormState>(defaultState);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (assignment) setState(fromItem(assignment));
  }, [assignment]);

  useEffect(() => {
    if (isNew && !state.courseId && courses.length > 0) setState((s) => ({ ...s, courseId: courses[0].id }));
  }, [isNew, courses, state.courseId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSaved(false);
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!state.dueAt) {
      setFormError('Son teslim tarihi zorunludur.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const result = await createAssignment({ ...toInput(state), courseId: state.courseId });
        navigate(`/yonetim/gorevler/${result.assignment.id}`, { replace: true });
      } else {
        const result = await updateAssignment(assignmentId!, toInput(state));
        setData({ assignment: result.assignment });
        setSaved(true);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!assignment) return;
    setFormError(null);
    try {
      const result = await setAssignmentPublished(assignment.id, assignment.status !== 'PUBLISHED');
      setData({ assignment: result.assignment });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'İşlem başarısız.');
    }
  };

  // Önizleme: öğrencinin dashboard'da göreceği kart, formdaki güncel değerlerle.
  const courseTitle = courses.find((c) => c.id === state.courseId)?.title ?? assignment?.course.title ?? '';
  const previewDue = iso(state.dueAt);
  const preview = previewDue
    ? toUpcomingTask({
        kind: 'assignment',
        id: assignment?.id ?? 'onizleme',
        type: state.type,
        priority: state.priority,
        title: state.title.trim() || 'Görev başlığı',
        summary: state.summary.trim() || null,
        dueAt: previewDue,
        lateUntil: iso(state.lateUntil),
        course: { id: state.courseId, title: courseTitle },
      })
    : null;

  if (!isNew && loading && !assignment) {
    return (
      <PageContainer>
        <Text role="body-md" tone="muted" as="p">
          Yükleniyor…
        </Text>
      </PageContainer>
    );
  }
  if (!isNew && error) {
    return (
      <PageContainer>
        <Text role="body-md" tone="error" as="p">
          {error}
        </Text>
        <Link to="/yonetim/gorevler">Görev listesine dön</Link>
      </PageContainer>
    );
  }

  const status = assignment ? ASSIGNMENT_STATUS[assignment.status] : null;

  return (
    <PageContainer>
      <div className={styles.header}>
        <div>
          <Link to="/yonetim/gorevler" className={styles.back}>
            ← Görevler
          </Link>
          <Text role="headline-lg" as="h1">
            {isNew ? 'Yeni Görev' : assignment?.title}
          </Text>
          {status && (
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
          )}
        </div>
        {assignment && (
          <Button variant={assignment.status === 'PUBLISHED' ? 'secondary' : 'primary'} onClick={togglePublish}>
            {assignment.status === 'PUBLISHED' ? 'Yayından kaldır' : 'Yayınla'}
          </Button>
        )}
      </div>

      <div className={styles.columns}>
        <Card padding="lg" elevation="1">
          <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={formStyles.row}>
              <label className={formStyles.field}>
                <Text role="label-md">Kurs</Text>
                <select
                  className={formStyles.input}
                  value={state.courseId}
                  disabled={!isNew}
                  onChange={(event) => set('courseId', event.target.value)}
                >
                  {!isNew && assignment && <option value={assignment.course.id}>{assignment.course.title}</option>}
                  {isNew &&
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className={formStyles.field}>
                <Text role="label-md">Başlık</Text>
                <input
                  className={formStyles.input}
                  value={state.title}
                  maxLength={200}
                  required
                  onChange={(event) => set('title', event.target.value)}
                />
              </label>
            </div>

            <label className={formStyles.field}>
              <Text role="label-md">Kısa açıklama (kartta başlığın altında)</Text>
              <input
                className={formStyles.input}
                value={state.summary}
                maxLength={200}
                onChange={(event) => set('summary', event.target.value)}
              />
            </label>

            <label className={formStyles.field}>
              <Text role="label-md">Talimatlar</Text>
              <textarea
                className={formStyles.textarea}
                rows={5}
                value={state.instructions}
                onChange={(event) => set('instructions', event.target.value)}
              />
            </label>

            <div className={formStyles.row3}>
              <label className={formStyles.field}>
                <Text role="label-md">Tür</Text>
                <select className={formStyles.input} value={state.type} onChange={(event) => set('type', event.target.value as AssignmentType)}>
                  {keysOf(ASSIGNMENT_TYPES).map((key) => (
                    <option key={key} value={key}>
                      {ASSIGNMENT_TYPES[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={formStyles.field}>
                <Text role="label-md">Öncelik</Text>
                <select
                  className={formStyles.input}
                  value={state.priority}
                  onChange={(event) => set('priority', event.target.value as AssignmentPriority)}
                >
                  {keysOf(PRIORITIES).map((key) => (
                    <option key={key} value={key}>
                      {PRIORITIES[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={formStyles.field}>
                <Text role="label-md">Maksimum puan</Text>
                <input
                  className={formStyles.input}
                  type="number"
                  min={1}
                  max={1000}
                  value={state.maxScore}
                  onChange={(event) => set('maxScore', event.target.value)}
                />
              </label>
            </div>

            <div className={formStyles.row3}>
              <label className={formStyles.field}>
                <Text role="label-md">Yayın tarihi (isteğe bağlı)</Text>
                <input
                  className={formStyles.input}
                  type="datetime-local"
                  value={state.availableFrom}
                  onChange={(event) => set('availableFrom', event.target.value)}
                />
              </label>
              <label className={formStyles.field}>
                <Text role="label-md">Son teslim</Text>
                <input
                  className={formStyles.input}
                  type="datetime-local"
                  required
                  value={state.dueAt}
                  onChange={(event) => set('dueAt', event.target.value)}
                />
              </label>
              <label className={formStyles.field}>
                <Text role="label-md">Geç teslim sınırı (isteğe bağlı)</Text>
                <input
                  className={formStyles.input}
                  type="datetime-local"
                  value={state.lateUntil}
                  onChange={(event) => set('lateUntil', event.target.value)}
                />
              </label>
            </div>

            <fieldset className={formStyles.fieldset}>
              <legend>
                <Text role="label-md">Teslim biçimi</Text>
              </legend>
              {keysOf(SUBMISSION_KINDS).map((key) => (
                <label key={key} className={formStyles.choice}>
                  <input
                    type="radio"
                    name="submissionKind"
                    value={key}
                    checked={state.submissionKind === key}
                    disabled={key === 'FILE'}
                    onChange={() => set('submissionKind', key)}
                  />
                  <span className={formStyles.choiceText}>
                    <Text role="label-md">{SUBMISSION_KINDS[key].label}</Text>
                    <Text role="body-sm" tone="muted">
                      {SUBMISSION_KINDS[key].hint}
                    </Text>
                  </span>
                </label>
              ))}
            </fieldset>

            {formError && (
              <div className={formStyles.error} role="alert">
                <Text role="body-sm" tone="error">
                  {formError}
                </Text>
              </div>
            )}
            {saved && (
              <div className={formStyles.success} role="status">
                <Text role="body-sm" tone="success">
                  Değişiklikler kaydedildi.
                </Text>
              </div>
            )}

            <div className={formStyles.actions}>
              <Button type="submit" variant="primary" disabled={saving || (isNew && !state.courseId)}>
                {saving ? 'Kaydediliyor…' : isNew ? 'Taslak olarak oluştur' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </Card>

        <aside className={styles.preview} aria-label="Öğrenci önizlemesi">
          <Text role="label-md" tone="muted" as="p">
            Öğrenci dashboard'unda böyle görünecek
          </Text>
          {preview && <UpcomingTasks tasks={[preview]} total={1} />}
        </aside>
      </div>

      {assignment && <SubmissionsPanel assignmentId={assignment.id} />}
    </PageContainer>
  );
}
