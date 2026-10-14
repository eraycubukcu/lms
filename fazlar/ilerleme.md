# Faz İlerleme Kaydı

Durum değerleri: `BEKLIYOR` | `DEVAM_EDIYOR` | `TAMAMLANDI`
Her faz çalışırken alt adımlar tamamlandıkça "Notlar" sütununa son kontrol noktası yazılır;
yarıda kalan faz bir sonraki tetiklemede buradan devam eder.

| Faz | Dosya | Durum | Notlar (son kontrol noktası) |
|---|---|---|---|
| 1 | 01-veri-modeli.md | TAMAMLANDI | 13:20 PID 11284 kapatıldı; migration uygulandı, client üretildi, mevcut dev.db'ye 2 örnek ödev eklendi (seed.ts de güncel), testler 391/391 geçti. Eski not: | Şema + migration dosyası (20261014085947_assignments) + seed eklendi. ENGEL: dev.db kilitli (port 4000'deki eski node, PID 11284) → migration UYGULANMADI. 12:08, 12:16, 12:24, 12:32, 12:40, 12:48 ve 12:56 tekrar denendi: hâlâ kilitli; `prisma generate` de EPERM (query engine DLL aynı süreçte açık). Sıradaki: süreç kapanınca `npx prisma migrate dev` → generate → seed → npm test |
| 2 | 02-gorev-yonetim-api.md | TAMAMLANDI | lib/assignments.ts + routes/assignments.ts (app.ts'e kayıtlı) + assignments.test.ts (7/7), tsc temiz |
| 3 | 03-teslim-api.md | TAMAMLANDI | routes/assignmentSubmissions.ts + test (4/4). TEXT + LINK; FILE ertelendi (415). StudyActivity kaydı eklenmedi (opsiyonel) |
| 4 | 04-yaklasan-gorevler-api.md | TAMAMLANDI | lib/upcomingTasks.ts + GET /api/v1/users/me/upcoming-tasks (routes/assignments.ts) + test (3/3). Sapma: sınav deneme modeli yok → `attemptState` yerine `availability` (UPCOMING/OPEN) dönüyor |
| 5 | 05-dashboard-entegrasyonu.md | TAMAMLANDI | useUpcomingTasks + upcomingTaskMeta + UpcomingTasks (Link, yükleniyor/hata/boş) + DashboardPage bağlandı; fixture'dan upcomingTasks silindi; typecheck temiz. Sınav linki şimdilik /sinavlar (sınav detay rotası yok). Tarayıcıda elle doğrulanmadı |
| 6 | 06-yonetim-arayuzu.md | TAMAMLANDI | features/admin/assignments (liste + editör + canlı önizleme + SubmissionsPanel puanlama), /yonetim/gorevler rotaları, sidebar öğesi + seed nav kaydı; assignments/assignmentApi.ts + assignmentMeta.ts; typecheck temiz. Takvim senkronu (opsiyonel) yapılmadı. Tarayıcıda elle doğrulanmadı |
| 7 | 07-ogrenci-gorev-sayfasi.md | TAMAMLANDI | GET /api/v1/users/me/assignments (+test); /notlar-ve-gorevler artık dinamik (sekmeli liste), /gorevler/:id detay + teslim/güncelle/geri çek; typecheck temiz. Sınav "Detaylar" → /sinavlar. Tarayıcıda elle doğrulanmadı |
| 8 | 08-test-ve-temizlik.md | TAMAMLANDI | Server 406/406 test, web typecheck + build temiz; tarih etiketleri betikle doğrulandı (web'de test çatısı yok, birim testi eklenmedi); fixture'da upcomingTasks kalmadı; CLAUDE.md güncellendi. gereksinimler.md'de durum sütunu olmadığından değiştirilmedi. Tarayıcıda uçtan uca elle senaryo yapılmadı |
