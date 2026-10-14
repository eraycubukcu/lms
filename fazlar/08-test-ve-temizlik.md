# Faz 8 — Test, Temizlik ve Dokümantasyon

## Testler
- **Backend** (mevcut `*.test.ts` kalıbı): `assignments.test.ts`, teslim kuralları, `upcomingTasks` filtreleme/sıralama, RBAC.
- **Dönüştürücü birim testleri** (`upcomingTaskMeta`): "Bugün/Yarın/N gün kaldı", gün adı biçimi, Türkçe ay adları, saat dilimi sınırları (gece yarısı).
- **Uçtan uca elle senaryo:**
  1. Eğitmen HIGH öncelikli ödev oluşturur, yayınlar → öğrenci dashboard'unda kırmızı rozetle görünür.
  2. Öğrenci teslim eder → listeden düşer, rozet sayısı azalır.
  3. Eğitmen puanlar → öğrenci detayda puanı görür.
  4. Son tarih geçer → ödev listeden çıkar.

## Temizlik
- `dashboard.fixtures.ts` içindeki `upcomingTasks` ve kullanılmayan tipler silinir.
- `UpcomingTask` tipindeki artık gereksiz alanlar (`kind: TaskKind` → DTO'dan) sadeleştirilir.

## Dokümantasyon
- `CLAUDE.md`: yeni uç noktalar, `Assignment` modeli, "Yaklaşan Görevler artık dinamik" notu.
- `docs/gereksinimler.md`: FR-12 durumu güncellenir.

## Kabul kriterleri
- `npm test` (server) ve `npm run typecheck && npm run build` (web) yeşil.
- Kodda `upcomingTasks` fixture referansı kalmamış.
