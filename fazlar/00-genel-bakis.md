# Yaklaşan Görevler — Dinamikleştirme Planı (Genel Bakış)

## Amaç
Dashboard'daki **"Yaklaşan Görevler"** paneli (`web/src/features/dashboard/components/UpcomingTasks.tsx`) bugün
`dashboard.fixtures.ts` içindeki sabit veriden besleniyor. Hedef: panelin tamamen veritabanından gelmesi ve
eğitmen/admin tarafından yönetilebilmesi.

## Mevcut durum
| Parça | Durum |
|---|---|
| `UpcomingTask` tipi (`web/src/types/index.ts:109`) | Hazır metinler taşıyor (`tagLabel`, `dueLabel`, `metaLabel`, `actionLabel`) — sunum verisi, ham veri değil |
| `UpcomingTasks.tsx` | Aksiyon linki `href="#"`, boş durum yok |
| `Exam` modeli + `/api/v1/exams/my` | **Var** → "Çevrim İçi Sınav" kartları buradan beslenebilir |
| `CalendarEvent` (`type: deadline/lab/exam`) | Var ama teslim/öncelik kavramı yok |
| Ödev / Laboratuvar / Proje modeli | **Yok** |
| Teslim (submission) modeli | **Yok** |

## Ekrandaki alanlar → veri kaynağı
| Ekrandaki öğe | Kaynak (hedef) |
|---|---|
| Etiket (Yüksek Öncelik / Çevrim İçi Sınav / Laboratuvar) | `Assignment.type` + `priority`, ya da `Exam` |
| "2 gün kaldı", "Cuma 14:00" | `dueAt` / `Exam.startsAt` → istemcide göreli tarih |
| Başlık / alt açıklama | `title`, `summary` |
| "27 Ekim 23:59" | `dueAt` biçimlenmiş |
| "45 Dakika · Süre Henüz Başlamadı" | `Exam.durationMinutes` + deneme durumu |
| Teslim Et / Detaylar | Teslim durumu + tür → gerçek route |
| "3 Teslim" rozeti | Listelenen (bekleyen) görev sayısı |

## Temel tasarım kararları
1. **Yeni `Assignment` modeli** (ödev, proje, laboratuvar) + **`AssignmentSubmission`**. Sınavlar için mevcut `Exam` tekrar kullanılır, kopyalanmaz.
2. **Tek toplayıcı uç nokta:** `GET /api/v1/users/me/upcoming-tasks` — ödev + sınavları birleştirip tarihe göre sıralar.
3. **API ham veri döner, metni istemci üretir.** "2 gün kaldı" gibi ifadeler `tr-TR` ile frontend'de hesaplanır (saat dilimi ve "şimdi"ye göre doğru kalır).
4. Yetki modeli mevcut kalıbı izler: ADMIN her şeyi, kursa atanmış eğitmen kendi kursunu, öğrenci yalnızca kayıtlı olduğu kursları görür (`lib/courseAccess.ts`).

## Fazlar
| # | Dosya | Kapsam |
|---|---|---|
| 1 | `01-veri-modeli.md` | Prisma şeması, migration, seed |
| 2 | `02-gorev-yonetim-api.md` | Ödev CRUD (admin/eğitmen) |
| 3 | `03-teslim-api.md` | Öğrenci teslimi + eğitmen değerlendirmesi |
| 4 | `04-yaklasan-gorevler-api.md` | Toplayıcı uç nokta |
| 5 | `05-dashboard-entegrasyonu.md` | Paneli API'ye bağlama |
| 6 | `06-yonetim-arayuzu.md` | Eğitmen/admin ödev yönetim sayfası |
| 7 | `07-ogrenci-gorev-sayfasi.md` | Ödev detay + teslim sayfası |
| 8 | `08-test-ve-temizlik.md` | Testler, fixture temizliği, dokümantasyon |

Bağımlılık: 1 → 2 → 3 → 4 → 5; 6, 2'den sonra; 7, 3'ten sonra paralel ilerleyebilir. **Faz 5 sonunda panel tamamen dinamiktir**; 6–7 yönetilebilirliği tamamlar.
