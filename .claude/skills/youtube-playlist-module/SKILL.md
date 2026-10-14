---
name: youtube-playlist-module
description: Bir YouTube playlist'ini LMS'teki bir kursa yeni modül olarak ekler; her video sıralı bir VIDEO_YOUTUBE dersi olur. "Şu playlisti X kursuna modül olarak ekle", "playlist'ten ders oluştur", "YouTube listesini kursa aktar" gibi isteklerde kullan.
---

# YouTube playlist → kurs modülü

İşi `server/scripts/importYoutubePlaylist.ts` yapar: playlist'i yt-dlp ile okur, kursun sonuna yeni bir modül ekler ve her videoyu sırayla ders olarak oluşturur (`contentType: VIDEO_YOUTUBE`, `contentUrl: https://www.youtube.com/watch?v=<id>`, açıklamada süre). Veritabanına Prisma ile doğrudan yazar; API girişi gerekmez, dev sunucusu açıkken de çalışır.

Komutu her zaman `server/` klasöründen ve **`npx tsx`** ile çalıştır. `npm run import:playlist -- ...` PowerShell'de `--` bayraklarını yuttuğu için kullanma.

```
npx tsx scripts/importYoutubePlaylist.ts --url "<playlist linki>" --course "<kurs id'si veya başlık parçası>" [--title "<modül adı>"] [--publish] [--dry-run] [--force]
```

| Bayrak | Anlamı |
|---|---|
| `--url` | Zorunlu. `list=` parametresi olan playlist bağlantısı (`watch?v=...&list=...` de olur). |
| `--course` | Zorunlu. Kurs id'si ya da başlığın bir parçası. Birden çok/hiç eşleşme olursa betik adayları listeleyip çıkar. |
| `--title` | Modül adı; verilmezse playlist başlığı kullanılır. |
| `--publish` | Dersleri yayında ekler. Verilmezse dersler **Taslak** (varsayılan). |
| `--dry-run` | Sadece ne ekleneceğini yazdırır, veritabanına dokunmaz. |
| `--force` | Aynı adda modül varsa da ekler (normalde tekrar eklemeyi engeller). |

## Adımlar

1. **Bilgileri topla.** Mesajdan playlist linkini ve kursu çıkar. Kurs söylenmemişse sor. Modül adı veya yayın durumu istenmişse ilgili bayrağı ekle; aksi halde varsayılanları kullan (playlist başlığı, Taslak).
2. **yt-dlp'yi kontrol et:** `python -m yt_dlp --version`. Yoksa kullanıcıdan izin alıp `python -m pip install yt-dlp` çalıştır.
3. **Önce `--dry-run`** ile çalıştır. Betik kursu bulamazsa ya da birden çok kurs eşleşirse çıktıdaki listeyi kullanıcıya göster ve hangisi olduğunu sor; sonra kurs id'siyle tekrar dene.
4. **Önizlemeyi göster:** kurs, modül adı ve sırası, ders sayısı ve ders başlıkları (uzunsa ilk ve son birkaçı), atlanan silinmiş/özel videolar. Kullanıcı onaylayınca aynı komutu `--dry-run` olmadan çalıştır.
5. **Sonucu bildir:** eklenen modül ve ders sayısı, dersler Taslak ise İçerik Yönetimi'nden (`/yonetim/kurslar/<courseId>/icerik`) yayınlanması gerektiği.

## Hatalar

- "modül zaten var": aynı playlist daha önce eklenmiş olabilir. Kullanıcıya sor; farklı ad için `--title`, yine de eklemek için `--force`.
- "Playlist okunamadı": playlist özel/silinmiş olabilir ya da yt-dlp eski olabilir (`python -m pip install -U yt-dlp`).
- Komut `Kullanım:` hatası veriyorsa bayraklar betiğe ulaşmamıştır; `npm run` yerine `npx tsx` ile çalıştırdığından emin ol.
