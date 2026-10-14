# Faz 3 — Teslim API'si

## Hedef
Öğrencinin "Teslim Et" ile ödev göndermesi, eğitmenin teslimleri görüp puanlaması.

## Uç noktalar
| Metot | Yol | Yetki |
|---|---|---|
| PUT | `/api/v1/assignments/:id/submission` | Kayıtlı öğrenci — oluştur/güncelle (son tarihe kadar) |
| GET | `/api/v1/assignments/:id/submission` | Öğrencinin kendi teslimi |
| DELETE | `/api/v1/assignments/:id/submission` | Öğrenci, son tarih geçmeden geri çekebilir |
| GET | `/api/v1/assignments/:id/submissions` | Yönetici — tüm teslimler + teslim etmeyenler |
| PATCH | `/api/v1/assignments/:id/submissions/:submissionId` | Yönetici — `score`, `feedback` |

## Kurallar
- Şimdi `> lateUntil ?? dueAt` ise teslim `423/409` ile reddedilir.
- `dueAt < şimdi ≤ lateUntil` ise `late = true`.
- Puanlanmış teslim öğrenci tarafından değiştirilemez.
- `submissionKind`: TEXT → `content` zorunlu; LINK → geçerli `https://` URL; FILE → `@fastify/multipart` ile yükleme, boyut/uzantı sınırı (ör. 20 MB, pdf/zip/ipynb). Dosya desteği gerekirse ayrı alt adım olarak ertelenebilir; ilk sürüm TEXT + LINK.
- Teslim yapıldığında `StudyActivity` kaydı eklenebilir (opsiyonel, `lib/activity.ts`).

## Kabul kriterleri
- Kayıtlı olmayan öğrenci 403.
- Son tarih/geç teslim sınırları testlerle doğrulanmış.
- Eğitmen listesi teslim etmeyen kayıtlı öğrencileri de gösteriyor.
