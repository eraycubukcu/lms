# Faz 4 — Yaklaşan Görevler Toplayıcı Uç Noktası

## Hedef
Panelin tek istekle beslenmesi: `GET /api/v1/users/me/upcoming-tasks?limit=3`

## Mantık (`server/src/lib/upcomingTasks.ts`)
1. Kullanıcının kayıtlı olduğu kursları bul.
2. **Ödevler:** `status = PUBLISHED`, `availableFrom ≤ şimdi` (veya boş), `(lateUntil ?? dueAt) > şimdi`, kullanıcının teslimi **yok**.
3. **Sınavlar:** `/exams/my` mantığını yeniden kullan (`lib/exams.ts`) — PUBLISHED, `endsAt > şimdi` (veya boş), deneme hakkı kalmış, audience kuralına uyan.
4. Birleştir, "odak tarihi"ne göre artan sırala (ödev → `dueAt`, sınav → `startsAt ?? endsAt`), `limit` uygula (varsayılan 3, max 20). `total` alanında kesilmemiş sayıyı da dön (rozet "3 Teslim" bunu gösterir).

## Yanıt sözleşmesi (ham veri — metin yok)
```ts
type UpcomingTaskDto =
  | {
      kind: 'assignment';
      id: string;
      type: 'ASSIGNMENT' | 'PROJECT' | 'LAB';
      priority: 'LOW' | 'NORMAL' | 'HIGH';
      title: string;
      summary: string | null;
      dueAt: string;          // ISO
      lateUntil: string | null;
      course: { id: string; title: string };
    }
  | {
      kind: 'exam';
      id: string;
      type: 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICE';
      title: string;
      summary: string | null;   // Exam.description
      startsAt: string | null;
      endsAt: string | null;
      durationMinutes: number | null;
      questionCount: number;
      attemptState: 'NOT_STARTED' | 'IN_PROGRESS';
      course: { id: string; title: string };
    };

interface UpcomingTasksResponse { items: UpcomingTaskDto[]; total: number }
```
> "Modül 1-4 Kapsamı · 25 Çoktan Seçmeli Soru" gibi satır: sınav için `summary` + `questionCount`'tan istemcide üretilir.

## Performans
- N+1 olmaması için kurs listesiyle tek `findMany` (`courseId in [...]`) + teslimler `NOT EXISTS` mantığıyla (`submissions: { none: { userId } }`).
- Faz 1'deki `@@index([status, dueAt])` kullanılır.

## Kabul kriterleri
- Teslim edilmiş ödev, süresi geçmiş ödev, taslak ödev ve kayıtsız kurs görevleri listede **yok**.
- Sıralama ve `limit/total` testlerle doğrulanmış.
