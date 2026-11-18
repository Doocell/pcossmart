import { getTodayDateString } from "./checkinConstants";

const STORAGE_KEY = "pcosmart_local_db_v1";
const SESSION_KEY = "pcosmart_local_session_v1";

function getYesterdayDateStr(daysAgo = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getTodayDateString(d);
}

const DEFAULT_USER_A = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "tester-tester-a@example.com",
  password: "12345678",
  user_metadata: { nickname: "Nadia" },
};

const SEEDED_ARTICLES = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    category: "makanan",
    title: "Mengapa Resistensi Insulin Terkait dengan PCOS?",
    summary:
      "Kenali peran reseptor gula darah dalam produksi hormon androgen dan cara menstabilkannya lewat pilihan serat larut serta karbohidrat kompleks.",
    body: `## Apa Hubungan Insulin dan Hormon Androgen?\n\nBanyak pejuang PCOS bertanya-tanya mengapa berat badan sulit turun atau mengapa rasa ngidam makanan manis terasa sangat kuat di sore hari. Kuncinya sering kali terletak pada satu hormon pengatur metabolisme utama: **insulin**.\n\nKetika sel-sel tubuh menjadi kurang responsif terhadap insulin (kondisi resistensi insulin), pankreas akan memproduksi lebih banyak insulin untuk menjaga gula darah tetap normal. Kadar insulin yang tinggi di dalam darah memicu ovarium untuk memproduksi lebih banyak hormon androgen (seperti testosteron).\n\n- **Mengganggu proses ovulasi alami** dan memanjangkan siklus haid sehingga periode haid menjadi tidak menentu.\n- **Memicu gejala hiperandrogen** seperti jerawat hormonal di garis rahang serta kerontokan rambut di mahkota kepala.\n- **Menyebabkan kelelahan sore hari** akibat fluktuasi gula darah setelah makan.\n\n## 3 Langkah Lembut Menstabilkan Gula Darah Harian\n\nKamu tidak perlu diet ekstrem yang menyiksa. Mulai dengan langkah-langkah mikro yang penuh welas asih pada tubuhmu:\n\n1. **Urutan Makan Cerdas**: Dahului serat (sayuran), lalu protein dan lemak sehat, terakhir karbohidrat kompleks. Ini terbukti meredam lonjakan glukosa hingga 40% tanpa mengurangi porsi makan.\n2. **Gerak Ringan 10 Menit Setelah Makan**: Jalan santai membantu otot menyerap glukosa tanpa membebani pankreas atau menaikkan hormon stres kortisol.\n3. **Cukupi Protein di Sarapan Pagi**: Telur, tempe, tahu, atau yogurt tanpa pemanis membantu menahan rasa lapar hingga siang hari dan menstabilkan kurva energi.`,
    source_name: "Journal of Clinical Endocrinology & Metabolism (JCEM) & POGI",
    source_url:
      "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome",
    read_minutes: 5,
    author: "dr. Amanda Sp.OG",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "20 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCTCAsud9IOMJ6ZR8DrdQSSwxF0C9tx8PUViUFCKTW9lZtnBRmao1RcTwJmboQqMGS8mxb6jc9WjT0DgEEJWiVoMNbU6zoYHFXdp4BoiHcE89tcj6eu7h0HdJSfyUn7pL77WK987a7pWhF1r-qsDutWK3kL1QWEgfGv5sl6jVYK3SwkBlEPCgEb35O5DWvx7Z7AglQRZRxYgGK_NDjw7hdb4t7IyPihVC19Fd_S3cM-",
    tags: ["#ResistensiInsulin", "#GulaDarah", "#HormonAndrogen", "#PolaMakanSeimbang"],
    quick_prompts: [
      "Bagaimana urutan makan untuk sarapan?",
      "Contoh camilan sore ramah insulin?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    category: "apa_itu_pcos",
    title: "Mengenal 4 Tipe Karakteristik PCOS & Sinyal Unik Tubuhmu",
    summary:
      "PCOS bukan satu kondisi seragam. Pelajari perbedaan antara PCOS resistensi insulin, adrenal, inflamasi, dan pasca-pil KB dengan tenang.",
    body: `## Memahami Keunikan Spektrum PCOS\n\nSindrom Ovarium Polikistik (PCOS) tampil berbeda pada setiap perempuan. Mengenali pemicu dominan pada tubuhmu membantu menentukan langkah gaya hidup yang paling tepat sasaran tanpa harus mencoba semua hal sekaligus.\n\n- **Tipe Resistensi Insulin (~70%)**: Ditandai dengan mudah lelah setelah makan, ngidam manis, dan kesulitan mengelola berat badan.\n- **Tipe Adrenal (Stres Kronis)**: Dipicu oleh respons kortisol dan DHEA-S yang tinggi akibat beban pikiran atau kurang istirahat.\n- **Tipe Inflamasi (Peradangan Ringan)**: Sering disertai keluhan pencernaan (kembung), kelelahan otot, atau kulit sensitif.\n- **Tipe Pasca-Kontrasepsi Hormonal**: Muncul sementara ketika tubuh sedang memulai kembali komunikasi alami antara otak dan indung telur.\n\n## Langkah Awal yang Bisa Kamu Lakukan\n\n1. **Catat gejala harianmu selama 14–30 hari** di PCOSmart untuk mengamati pola energi, kualitas tidur, dan suasana hati.\n2. **Bawa ringkasan catatanmu ke dokter Sp.OG** agar evaluasi laboratorium dapat disesuaikan dengan keluhan utamamu.\n\n**Penting:** Hanya tenaga medis yang dapat menegakkan diagnosis klinis PCOS.`,
    source_name: "Monash University International PCOS Guideline (2023)",
    source_url: "https://www.monash.edu/medicine/mchri/pcos",
    read_minutes: 6,
    author: "dr. Ratna Kartika, Sp.OG",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "18 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB3ojbO2m1d87gwTgsZVFLn3uGoukVi2QMhdMJaAXxAD0ZvdoYz3qJbzmHlOuRzeAqG9Qtv6ULTbvjOxBO83f3CPPH-FY-055DCh2fdGyZHQ8M_th5BcIUoJ1fBHsTrRZXzx-mtwqT2QhhAu76BjaSNVitlInxjPzAcYb5IA2rSpahAvYOi8sa5e422p8BrjqIqmxJUOitg_V41xU2TiIHpEBEE2Mvo4YDooeTrUNCh",
    tags: ["#ApaItuPCOS", "#KenaliTubuhmu", "#EdukasiDasar", "#SiklusHaid"],
    quick_prompts: [
      "Apa saja gejala umum PCOS yang perlu dicatat?",
      "Bagaimana cara mempersiapkan konsultasi pertama ke dokter?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    category: "aktivitas_fisik",
    title: "Gerakan Lembut: Olahraga Tanpa Memicu Lonjakan Kortisol",
    summary:
      "Alih-alih olahraga berat yang menstimulasi stres, jalan pagi, pilates, dan latihan kekuatan ringan membantu menormalkan ritme kelenjar adrenal.",
    body: `## Mengapa Olahraga Lebih Keras Belum Tentu Lebih Baik?\n\nPada sebagian perempuan dengan PCOS, latihan kardio intensitas sangat tinggi (HIIT berkepanjangan) saat tubuh sedang kurang tidur justru dapat dibaca otak sebagai sinyal stres fisik, sehingga kelenjar adrenal melepaskan lebih banyak **kortisol**.\n\n- **Jalan Kaki Santai (LISS)**: Berjalan 15–20 menit di pagi hari atau sehabis makan meningkatkan sensitivitas insulin tanpa menguras energi.\n- **Latihan Beban Ringan–Sedang**: Membangun massa otot secara bertahap membantu tubuh memiliki "tempat penyimpanan" glukosa yang lebih luas.\n- **Yoga Restoratif & Peregangan**: Menurunkan ketegangan sistem saraf simpatis dan meredakan kram panggul.\n\n## Tips Memulai Tanpa Beban\n\n1. **Dengarkan sinyal energimu**: Bila energi hari ini di angka 1–2, pilih peregangan 10 menit di atas matras.\n2. **Fokus pada konsistensi, bukan durasi**: 15 menit gerak rutin jauh lebih ramah hormon daripada 2 jam olahraga menguras tenaga di akhir pekan.`,
    source_name: "Monash University PCOS Guideline & Sports Medicine",
    source_url: "https://www.monash.edu/medicine/mchri/pcos",
    read_minutes: 4,
    author: "dr. Nadia Kusuma, Sp.KO",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "15 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBkLA8jicExGY8bNKyZpMpS1zfxvBBY6uDLsXCgkDdvsTvgUEJZRmhz48LdM8Pms1Uw-V8Dm1y0kTxXtxqrdQ3dFmaVvVJS42KCVHaLK7tsUo7q5pDM7zQv1WQe4kFFUplQzOqNWVKd33Z6WEuRAgSh6O4nKhT1-mHT1fbuUJ8INRjBAmT6iQabyB8-GVbHByfhrYadHMK0_OBQvAh7D7NxTDjAYohZo5UXgypI9gw8",
    tags: ["#AktivitasFisik", "#ManajemenKortisol", "#YogaPCOS", "#JalanSantai"],
    quick_prompts: [
      "Olahraga apa yang cocok saat sedang lelah?",
      "Berapa kali seminggu sebaiknya latihan beban ringan?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    category: "tidur_dan_stres",
    title: "Ritme Sirkadian & Pengaruh Tidur Malam pada Keseimbangan Hormon",
    summary:
      "Bagaimana kualitas tidur malam memengaruhi hormon lapar (ghrelin-leptin), sensitivitas insulin, dan ketenangan suasana hati keesokan harinya.",
    body: `## Tidur Nyenyak Adalah Fondasi Regulasi Hormon\n\nKurang tidur satu malam saja dapat menurunkan sensitivitas insulin keesokan harinya hingga 20–25% dan meningkatkan hormon pemicu lapar (*ghrelin*). Itu sebabnya ketika kurang tidur, tubuh secara biologis menginginkan makanan tinggi gula untuk energi cepat.\n\n- **Sinkronisasi Melatonin & Ovulasi**: Melatonin tidak hanya mengatur kantuk, tetapi juga berperan melindungi folikel ovarium dari stres oksidatif.\n- **Menurunkan Kortisol Malam**: Rutinitas malam yang tenang memberi sinyal aman bagi kelenjar adrenal untuk beristirahat.\n\n## 3 Ritual Malam Ramah Hormon\n\n1. **Redupkan layar 45 menit sebelum tidur** agar produksi melatonin alami tidak terhambat cahaya biru.\n2. **Minuman hangat bebas kafein** seperti teh chamomile atau spearmint hangat untuk merilekskan tubuh.\n3. **Teknik napas 4-7-8** selama 3 menit di tempat tidur untuk menenangkan pikiran yang penuh kekhawatiran.`,
    source_name: "WHO & Sleep Research Society",
    source_url:
      "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome",
    read_minutes: 5,
    author: "dr. Amanda Sp.OG",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "12 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9uGMK9ns4Swnn9tLBywoPeqgItB1prtG0qT247EYejTLAq-3vhsP742IIQ_UI88pbP0dDyTMNX6loJXszbuNeHjtxK9b3x4JaACr805ckoxoxJED6Z4M-x3l-xcXwRv8Zco5huW58JayOXP8UJITVTN6bPRRqW9ogqYHhzOca33jXW2Xdye3xrUgyGH5r5nGM9a2KPFM16DDm5zGjN7Ode7bzekOqx7PrFmy7nVaz",
    tags: ["#RitmeSirkadian", "#KualitasTidur", "#ManajemenStres", "#TehSpearmint"],
    quick_prompts: [
      "Bagaimana cara mengatasi sulit tidur saat cemas?",
      "Apa manfaat teh chamomile atau spearmint sebelum tidur?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    category: "makanan",
    title: "Panduan Piring Seimbang & Camilan Sore Ramah Hormon",
    summary:
      "Cara praktis menyusun porsi serat, protein lokal (tempe, telur, ikan), dan karbohidrat kompleks tanpa harus menghitung kalori secara obsesif.",
    body: `## Menyusun Piring Seimbang Tanpa Stres Kalori\n\nMengelola nutrisi untuk PCOS bukan tentang menahan lapar, melainkan **menambah nutrisi pendukung** agar gula darah naik dan turun secara landai.\n\n- **1/2 Piring Sayuran Berserat**: Bayam, brokoli, buncis, timun, atau lalapan segar membantu memperlambat penyerapan gula di usus.\n- **1/4 Piring Protein Berkualitas**: Telur, ikan kembung/tongkol (kaya Omega-3), ayam, tempe, atau tahu.\n- **1/4 Piring Karbohidrat Kompleks**: Nasi merah, ubi rebus, jagung, oat, atau nasi putih yang didampingi porsi serat & protein cukup.\n\n## Ide Camilan Sore Anti-Lemas\n\n1. **Edamame rebus** atau segenggam kacang almond/mete panggang.\n2. **Potongan apel/pir** dengan 1 sendok selai kacang tanpa tambahan gula.\n3. **Yogurt plain** dengan taburan biji chia (*chia seeds*) dan buah beri/pepaya.`,
    source_name: "Kemenkes RI & Endocrine Society Nutrition Guide",
    source_url:
      "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome",
    read_minutes: 5,
    author: "Sari Pramesti, S.Gz, RD",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "08 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA-mh8w7AFKTvFw3xRluvTkpZg_U69_Ls_pndW-1f7Sa_ymAj16K5EU5Uy25YFZUDFzNwfxQbb7AEkv0CI3ijydJ2pzxOWtTW4PqeIKXR6gkAeJ4zmWsH2hcFmputZmU1Cq_F6B2xxdvUtGMrHkGBZM4CLF702RsKjoYY0PakSxI0owxdmpeUEVo9FikUuPzgKc2k7acpbFrOgeubo9FZ423rkr5tdMuuuwmKuyQmyA",
    tags: ["#NutrisiRamahHormon", "#PiringSeimbang", "#CamilanSehat", "#Omega3"],
    quick_prompts: [
      "Ide bekal makan siang praktis untuk ke kampus/kantor?",
      "Bagaimana cara mengurangi ngidam manis di sore hari?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    category: "kapan_ke_dokter",
    title: "Kapan Sebaiknya ke Dokter? Tanda Klinis yang Perlu Diperhatikan",
    summary:
      "Panduan tenang mengenali tanda-tanda siklus, nyeri, atau perdarahan yang memerlukan pemeriksaan langsung oleh dokter spesialis Sp.OG.",
    body: `## Mengenali Sinyal Tubuh yang Membutuhkan Evaluasi Medis\n\nMemantau gejala harian di aplikasi sangat membantu untuk mengenal pola tubuhmu, namun aplikasi tidak pernah menggantikan pemeriksaan langsung oleh dokter. Jangan ragu menjadwalkan konsultasi ke dokter spesialis obstetri dan ginekologi (Sp.OG) bila kamu mengalami:\n\n- **Jeda haid lebih dari 90 hari** (3 bulan berturut-turut tanpa menstruasi) atau siklus yang terus-menerus kurang dari 21 hari.\n- **Perdarahan sangat deras** (misalnya harus mengganti pembalut penuh setiap 1–2 jam selama lebih dari 2 jam berturut-turut) atau haid berlangsung lebih dari 7–8 hari.\n- **Nyeri panggul atau perut bawah yang hebat** hingga mengganggu aktivitas harian dan tidak mereda dengan istirahat biasa.\n- **Perubahan gejala yang cepat**, seperti tumbuhnya rambut halus berlebih secara mendadak atau kerontokan rambut yang makin berat.\n\n## Tips Mempersiapkan Kunjungan ke Dokter\n\n1. **Unduh atau cetak Ringkasan untuk Dokter** dari menu Riwayat di PCOSmart.\n2. **Catat tanggal hari pertama haid terakhir** dan daftar pertanyaan yang ingin kamu diskusikan agar waktu konsultasi lebih optimal.`,
    source_name: "WHO & POGI (Perkumpulan Obstetri dan Ginekologi Indonesia)",
    source_url:
      "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome",
    read_minutes: 4,
    author: "dr. Amanda Sp.OG",
    reviewer: "Ditinjau Tim Medis PCOSmart",
    published_date: "04 Oktober 2026",
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCTCAsud9IOMJ6ZR8DrdQSSwxF0C9tx8PUViUFCKTW9lZtnBRmao1RcTwJmboQqMGS8mxb6jc9WjT0DgEEJWiVoMNbU6zoYHFXdp4BoiHcE89tcj6eu7h0HdJSfyUn7pL77WK987a7pWhF1r-qsDutWK3kL1QWEgfGv5sl6jVYK3SwkBlEPCgEb35O5DWvx7Z7AglQRZRxYgGK_NDjw7hdb4t7IyPihVC19Fd_S3cM-",
    tags: ["#KapanKeDokter", "#KonsultasiSpOG", "#TandaWaspada", "#EvaluasiKlinis"],
    quick_prompts: [
      "Pertanyaan apa saja yang sebaiknya ditanyakan ke dokter Sp.OG?",
      "Apa saja pemeriksaan awal yang biasanya dilakukan dokter?",
    ],
    published: true,
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_DB = {
  users: [
    DEFAULT_USER_A,
    {
      id: "22222222-2222-4222-8222-222222222222",
      email: "tester-b@example.com",
      password: "12345678",
      user_metadata: { nickname: "Rara" },
    },
  ],
  profiles: [
    {
      id: DEFAULT_USER_A.id,
      nickname: "Nadia",
      age_range: "18-24",
      consent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  daily_checkins: [
    {
      id: "c1000000-0000-4000-8000-000000000001",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(1),
      on_period: false,
      period_intensity: null,
      sleep_hours: 7.5,
      energy: 3,
      mood: 4,
      symptoms: ["kembung", "lelah"],
      notes:
        "Hari ini perut sedikit kembung saat siang, namun membaik setelah minum teh chamomile hangat.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "c1000000-0000-4000-8000-000000000002",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(2),
      on_period: false,
      period_intensity: null,
      sleep_hours: 8.0,
      energy: 4,
      mood: 4,
      symptoms: ["kembung"],
      notes: "Tidur nyenyak dan jalan pagi 20 menit.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "c1000000-0000-4000-8000-000000000003",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(3),
      on_period: true,
      period_intensity: "ringan",
      sleep_hours: 7.0,
      energy: 3,
      mood: 3,
      symptoms: ["nyeri_perut", "jerawat"],
      notes: "Hari terakhir haid, aliran sudah ringan.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "c1000000-0000-4000-8000-000000000004",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(4),
      on_period: true,
      period_intensity: "sedang",
      sleep_hours: 6.5,
      energy: 2,
      mood: 3,
      symptoms: ["nyeri_perut", "lelah", "kembung"],
      notes: "Kram perut pagi hari, kompres hangat cukup membantu.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "c1000000-0000-4000-8000-000000000005",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(5),
      on_period: true,
      period_intensity: "deras",
      sleep_hours: 6.0,
      energy: 2,
      mood: 2,
      symptoms: ["nyeri_perut", "lelah", "sulit_tidur"],
      notes: "Hari ke-2 haid aliran cukup deras, memilih istirahat lebih awal.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "c1000000-0000-4000-8000-000000000006",
      user_id: DEFAULT_USER_A.id,
      checkin_date: getYesterdayDateStr(6),
      on_period: true,
      period_intensity: "sedang",
      sleep_hours: 7.0,
      energy: 3,
      mood: 3,
      symptoms: ["nyeri_perut", "jerawat", "cemas"],
      notes: "Hari pertama haid dimulai pagi ini.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  education_articles: SEEDED_ARTICLES,
  chat_messages: [],
};

export function loadLocalDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DB));
      return structuredClone(DEFAULT_DB);
    }
    const parsed = JSON.parse(raw);
    // Upgrade seeded articles if older local storage has fewer than 6 articles
    if (
      !Array.isArray(parsed.education_articles) ||
      parsed.education_articles.length < SEEDED_ARTICLES.length
    ) {
      parsed.education_articles = SEEDED_ARTICLES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

export function saveLocalDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Failed to save local DB:", e);
  }
}

export function getLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.warn("Failed to save local session:", e);
  }
}

export function makeSessionForUser(user) {
  return {
    access_token: `local-jwt-${user.id}`,
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata || {},
    },
  };
}
