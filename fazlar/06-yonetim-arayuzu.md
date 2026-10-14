# Faz 6 — Yönetim Arayüzü (Eğitmen / Admin)

## Hedef
Görevlerin arayüzden oluşturulup yönetilmesi. Kalıp: `features/admin/exams/AdminExamsPage.tsx` + `ExamEditorPage.tsx`.

## Sayfalar
1. **`features/admin/assignments/AdminAssignmentsPage.tsx`** — `/yonetim/gorevler`
   - Tablo: başlık, kurs, tür, öncelik, son tarih, durum (Taslak/Yayında), teslim sayısı (x / kayıtlı).
   - Filtre: kurs, durum, tür. Eylemler: düzenle, yayınla/kaldır, sil.
2. **`AssignmentEditorPage.tsx`** — `/yonetim/gorevler/yeni`, `/yonetim/gorevler/:id`
   - Alanlar: kurs, başlık, kısa açıklama (kart satırı), talimatlar, tür, öncelik, yayın tarihi, son tarih, geç teslim sınırı, maksimum puan, teslim biçimi.
   - **Canlı önizleme:** Faz 5'teki dönüştürücü + `UpcomingTasks` kart görünümüyle "öğrenci böyle görecek".
3. **Teslimler sekmesi** — öğrenci listesi, teslim içeriği/linki, geç rozeti, puan + geri bildirim formu (Faz 3 PATCH).

## Entegrasyon
- Navigasyon: yönetici menü kayıtları `NavMenuItem` ile DB'den geliyorsa yeni öğe seed/admin panelinden eklenir; değilse `navItems.ts`.
- Route'lar `routes/index.tsx`'e, rol koruması mevcut admin route'larıyla aynı şekilde.
- Opsiyonel: ödev yayınlanınca `CalendarEvent (type: "deadline")` otomatik oluşturma — takvimle senkron.

## Kabul kriterleri
- Eğitmen yalnızca kendi kurslarının görevlerini görür/düzenler.
- Form doğrulama hataları sunucu mesajlarıyla Türkçe gösterilir.
- Klavye ile tam kullanılabilir, `:focus-visible` halkaları var.
