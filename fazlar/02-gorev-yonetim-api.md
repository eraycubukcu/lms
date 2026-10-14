# Faz 2 — Görev Yönetim API'si (Admin / Eğitmen)

## Hedef
Ödevlerin oluşturulup düzenlenebilmesi. Kalıp olarak `routes/exams.ts` + `lib/exams.ts` ayrımı izlenir.

## Dosyalar
- `server/src/lib/assignments.ts` — doğrulama, DTO dönüşümü, erişim kontrolü
- `server/src/routes/assignments.ts` — uç noktalar, `app.ts` içinde kaydedilir
- `server/src/routes/assignments.test.ts`

## Uç noktalar
| Metot | Yol | Yetki |
|---|---|---|
| GET | `/api/v1/assignments?courseId=&status=` | ADMIN: hepsi; eğitmen: atandığı kurslar |
| GET | `/api/v1/assignments/:id` | Yönetici veya kayıtlı öğrenci (öğrenciye yalnızca PUBLISHED) |
| POST | `/api/v1/assignments` | ADMIN veya kursa atanmış eğitmen |
| PATCH | `/api/v1/assignments/:id` | aynı |
| DELETE | `/api/v1/assignments/:id` | aynı |
| POST | `/api/v1/assignments/:id/publish` · `/unpublish` | aynı |

## Doğrulama kuralları
- `title` 3–200 karakter, `summary` ≤ 200.
- `type`, `priority`, `status`, `submissionKind` izinli değerlerden biri.
- `dueAt` zorunlu; `lateUntil` varsa `> dueAt`; `availableFrom` varsa `< dueAt`.
- `courseId` oluşturulduktan sonra değiştirilemez (Exam ile tutarlı).
- Teslimi olan ödev silinmek istenirse `409` (veya önce yayından kaldırma önerisi).

## Kabul kriterleri
- Yetkisiz kullanıcı 403, olmayan kayıt 404, geçersiz gövde 400 döner (`errors.ts` kalıbı).
- Testler: rol bazlı erişim, doğrulama, yayınlama akışı.
