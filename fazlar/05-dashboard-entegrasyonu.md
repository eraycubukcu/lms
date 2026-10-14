# Faz 5 — Dashboard Entegrasyonu

## Hedef
`UpcomingTasks` panelini fixture yerine Faz 4 uç noktasına bağlamak. **Bu fazın sonunda panel tamamen dinamiktir.**

## Adımlar
1. **Tipler** (`web/src/types/index.ts`): `UpcomingTaskDto`, `UpcomingTasksResponse` ekle. Mevcut `UpcomingTask` (sunum modeli) korunur — bileşen API'si değişmez.
2. **Hook** `web/src/features/dashboard/useUpcomingTasks.ts`: `useMyGrades`/`useStudyActivity` ile aynı kalıpta (`loading`, `error`, `data`, `reload`).
3. **Dönüştürücü** `upcomingTaskMeta.ts` — DTO → `UpcomingTask`:
   | Alan | Kural |
   |---|---|
   | `tagLabel/tone/icon` | priority HIGH → "Yüksek Öncelik" / error / `priority_high`; exam → "Çevrim İçi Sınav" / info / `quiz`; LAB → "Laboratuvar" / neutral; PROJECT → "Proje"; ASSIGNMENT → "Ödev" |
   | `dueLabel` | ≤ 7 gün ve sınav → gün adı + saat ("Cuma 14:00"); değilse "N gün kaldı" / "Bugün" / "Yarın" / "N saat kaldı" |
   | `metaIcon/metaLabel` | ödev → `schedule` + "27 Ekim 23:59" (`Intl.DateTimeFormat('tr-TR')`); sınav → `timelapse` + "45 Dakika" |
   | `durationLabel` | sınav → "Süre Henüz Başlamadı" / "Devam Ediyor" |
   | `description` | ödev → `summary`; sınav → `summary · {questionCount} Soru` |
   | `actionLabel` + **`href`** | ödev → "Teslim Et" → `/gorevler/:id`; sınav → "Detaylar" → `/sinavlar/:id` |
   Tarih yardımcılarını `announcementMeta.ts`'teki `formatRelative` ile ortaklaştır.
4. **`UpcomingTask` tipine `href` ekle**; bileşende `<a href="#">` yerine React Router `<Link to={task.href}>`.
5. **Durumlar:** yükleniyor (iskelet 3 kart), hata (tekrar dene butonu), boş ("Yaklaşan görevin yok 🎉" + `task_alt` ikonu). Rozet `total` gösterir, 0 ise gizlenir.
6. `DashboardPage.tsx`: `data.upcomingTasks` yerine hook; `dashboard.fixtures.ts` ve `DashboardData`'dan `upcomingTasks`'ı kaldır.
7. Opsiyonel: panel başlığına "Tümünü gör" → `/gorevler`.

## Kurallar
- Yalnızca token CSS'i (CLAUDE.md), yeni renk yok.
- "Kalan süre" `Date.now()`'a göre hesaplanır; panel açıkken dakikada bir yenileme gerekmez.

## Kabul kriterleri
- DB'deki ödev değişince dashboard yenilemede yansıyor.
- Teslim edilen ödev listeden düşüyor.
- `npm run typecheck` ve build temiz; mobilde taşma yok.
