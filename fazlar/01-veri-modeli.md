# Faz 1 — Veri Modeli

## Hedef
Ödev/proje/laboratuvar görevlerini ve öğrenci teslimlerini saklayacak şemayı eklemek.

## Prisma şeması (`server/prisma/schema.prisma`)
Mevcut konvansiyonu izle: enum yerine `String` + `/// Allowed literals:` yorumu, `cuid()`, UTC tarih.

```prisma
/// Kursa ait teslimli görev (FR-12). Sınavlar Exam modelindedir.
model Assignment {
  id            String   @id @default(cuid())
  courseId      String
  course        Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title         String
  /// Kartta başlığın altındaki tek satır (ör. "Dengeli Ağaç (AVL Tree) Gerçekleştirimi").
  summary       String?
  /// Detay sayfasındaki uzun açıklama (düz metin).
  instructions  String?
  /// Allowed literals: "ASSIGNMENT" | "PROJECT" | "LAB"
  type          String   @default("ASSIGNMENT")
  /// Allowed literals: "LOW" | "NORMAL" | "HIGH"
  priority      String   @default("NORMAL")
  /// Allowed literals: "DRAFT" | "PUBLISHED"
  status        String   @default("DRAFT")
  /// Öğrencilere görünmeye başladığı an. Boşsa yayınlanınca hemen.
  availableFrom DateTime?
  dueAt         DateTime
  /// Geç teslime izin verilen son an. Boşsa geç teslim kapalı.
  lateUntil     DateTime?
  maxScore      Int      @default(100)
  /// Allowed literals: "TEXT" | "LINK" | "FILE"
  submissionKind String  @default("TEXT")
  createdById   String?
  createdBy     User?    @relation("AssignmentsCreated", fields: [createdById], references: [id], onDelete: SetNull)
  submissions   AssignmentSubmission[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([courseId, dueAt])
  @@index([status, dueAt])
}

model AssignmentSubmission {
  id           String     @id @default(cuid())
  assignmentId String
  assignment   Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  content      String?    /// TEXT içerik veya LINK URL'i
  filePath     String?    /// FILE için sunucudaki göreli yol
  submittedAt  DateTime   @default(now())
  late         Boolean    @default(false)
  score        Int?
  feedback     String?
  gradedAt     DateTime?
  gradedById   String?

  @@unique([assignmentId, userId])
  @@index([userId])
}
```
`User` ve `Course` modellerine karşı ilişki alanlarını ekle.

## Adımlar
1. Şemayı güncelle → `npx prisma migrate dev --name assignments`.
2. `server/prisma/seed` dosyasına ekrandaki 2 örnek görevi ekle ("Veri Yapıları Proje Ödevi 2" HIGH, "Yapay Zekâ Mini Proje Teslimi" LAB). "SQL Ara Sınavı" için `Exam` seed'i (type QUIZ, `durationMinutes: 45`) kullanılır/eklenir.
3. `dev.db` git'te izlendiği için migration sonrası güncel DB'yi commit'le.

## Kabul kriterleri
- Migration temiz uygulanıyor, `prisma generate` hatasız.
- Seed sonrası Prisma Studio'da 2 ödev + 1 sınav görünüyor.
- Mevcut testler (`npm test`) geçiyor.
