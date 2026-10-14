import type { DashboardData } from '../types';

/**
 * Dashboard için sahte veri. İçerik ui/code.html'deki gerçek Türkçe metinlerden alındı.
 * Backend hazır olduğunda bu dosya yerini API yanıtına bırakır; bileşenler değişmez.
 */
export const dashboardFixture: DashboardData = {
  student: {
    fullName: 'Deniz Akın',
    studentNumber: '202484019',
  },
  term: {
    label: '2024-2025 Güz Dönemi',
    streakDays: 5,
    weeklyGoalHours: 6,
    minutesCompletedToday: 48,
    weeklyGoalProgress: 78,
  },
  weeklyGoalSummary:
    'Harika gidiyorsun! Bu hafta hedeflerinin %78’ini tamamladın. Bugün modern mimari modülünü bitirerek haftalık rozeti kazanabilirsin.',

  kpis: [
    {
      id: 'enrolled',
      label: 'Kayıtlı Kurslar',
      value: '4',
      unit: 'Aktif Dönem',
      icon: 'menu_book',
      iconTone: 'secondary',
      footnote: '2 yeni atanan ders',
      footnoteIcon: 'arrow_upward',
    },
    {
      id: 'completed',
      label: 'Tamamlanan Dersler',
      // Değer, birim ve ilerleme useCourses() sonucundan DashboardPage'de hesaplanır.
      value: '—',
      icon: 'check_circle',
      iconTone: 'secondary',
    },
    {
      id: 'average',
      label: 'Ortalama Başarı',
      // Değer, birim ve dipnot GET /users/me/grades özetinden DashboardPage'de üretilir.
      value: '—',
      icon: 'military_tech',
      iconTone: 'success',
    },
    {
      id: 'studytime',
      label: 'Çalışma Süresi',
      value: '28.5',
      unit: 'Saat / Bu Ay',
      icon: 'timer',
      iconTone: 'cyan',
      footnote: 'Aylık hedef: 35 Saat',
      footnoteIcon: 'schedule',
    },
  ],

  aiGuide: {
    title: 'Yapay Zekâ Ders Rehberi',
    status: 'Aktif ve Hazır',
    // `highlight` bu cümlenin içinde birebir geçmelidir; AiGuideCard metni
    // bu değere göre bölerek ortadaki kısmı vurgular.
    message:
      'SQL Ara Sınavı öncesi eksik olduğun konular tespit edildi: GROUP BY & HAVING konularında 5 pratik soru çözmek ister misin?',
    highlight: 'GROUP BY & HAVING',
    ctaLabel: 'Hızlı Quiz Başlat',
  },

  announcements: [
    {
      id: 'ann-1',
      title: 'Güz Dönemi Ara Sınav Takvimi Güncellendi',
      source: 'Öğrenci İşleri',
      timeAgo: '3 saat önce',
      tone: 'secondary',
    },
    {
      id: 'ann-2',
      title: 'Canlı Soru-Cevap Oturumu: Perşembe 19:00',
      source: 'Dr. Murat Yılmaz',
      timeAgo: 'Dün',
      tone: 'cyan',
    },
    {
      id: 'ann-3',
      title: 'Kampüs Kütüphanesi Dijital Veritabanı Bakımı',
      source: 'Bilgi İşlem Daire Bşk.',
      timeAgo: '2 gün önce',
      tone: 'muted',
    },
  ],
};
