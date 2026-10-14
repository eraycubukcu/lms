# Faz 7 — Öğrenci Görev Detay ve Teslim Sayfası

## Hedef
Kartlardaki "Teslim Et" / "Detaylar" linklerinin gerçek bir sayfaya gitmesi.

## Sayfalar
1. **`/gorevler/:id`** — `features/assignments/AssignmentDetailPage.tsx`
   - Başlık, kurs, tür/öncelik rozetleri, son tarih + geri sayım, talimatlar.
   - Teslim formu (`submissionKind`'e göre metin alanı / link / dosya), gönder · güncelle · geri çek.
   - Teslim sonrası: "Teslim edildi (geç)" durumu; puanlandıysa puan ve geri bildirim.
   - Süre dolduysa form kilitli, bilgi mesajı.
2. **`/gorevler`** — `AssignmentsListPage.tsx`: Bekleyen / Teslim Edilen / Puanlanan sekmeleri (Faz 4 endpoint'ine `status` parametresi veya ayrı `GET /users/me/assignments`).
3. Sınav kartı "Detaylar" → mevcut sınav sayfasına (`/sinavlar/:id`) yönlenir; yeni sayfa gerekmez.

## Opsiyonel
- "Notlar & Görevler" sayfasına (navItems) bu listeyi bağlamak.
- Teslim sonrası dashboard verisinin tazelenmesi (geri dönüşte hook `reload`).

## Kabul kriterleri
- Teslimden sonra dashboard'a dönünce görev listede yok, rozet sayısı azalmış.
- Kayıtsız öğrenci veya taslak ödev URL'si → 404 sayfası.
