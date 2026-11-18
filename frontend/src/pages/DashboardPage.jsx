import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  SYMPTOM_LABELS,
  calculateStreak,
  getEnergyLabel,
  getMoodLabel,
  getTodayDateString,
  getTopSymptoms,
} from "../lib/checkinConstants";

const FALLBACK_ARTICLES = [
  {
    id: "fallback-1",
    category: "Nutrisi Seimbang",
    title: "Mengapa Resistensi Insulin Terkait dengan PCOS?",
    body: "Kenali peran reseptor gula darah dalam produksi hormon dan cara mengimbanginya lewat pilihan karbohidrat kompleks.",
    readTime: "4 min baca",
    badgeColor: "text-secondary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAx6phnfhlZHnCMVz19FVDgOcOFw82MRa1wpuegs-sVATevsPlaHQG3tpxGvO6oZ5md8kDhPvuT9sxJ4ZBkyu3RVTwS0P-rUcS6elOJBWdVW6OFwi_fndg4uYwB_s0ZuARiYX7-B8s6iHed9Q_k72nuQmgEcevPmKzkHlCw9CT5c8n8Oi77jf1VzglIz0lTllSYCQI4Pf2Bs7cpTphhYHl8ewGh5jkMfsvWtuy4e5vv",
  },
  {
    id: "fallback-2",
    category: "Gaya Hidup",
    title: "Gerakan Lembut untuk Mengurangi Kortisol Pagi Hari",
    body: "Alih-alih olahraga berat yang menstimulasi stres, stretching ringan dan jalan pagi membantu menormalkan ritme kelenjar adrenal.",
    readTime: "5 min baca",
    badgeColor: "text-primary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDFE5KOAf2HDdu5ni_wh8e0YM3JySDUea-gxgQXulG98-RJqqaVOzT4h4vIoOJmhufkZDOoFbyCHTVweeHqMzSAwcw-ETPQNQVUmO5Kf2dmr8ZUYfJwTjmErQyouT9mslcz6jAdseJ0Blo68Rvy6JN2zc--yD2EM43AEjISlrjWr9HU9nIh2CjzkrT1HytR1Gx35Pr14hv4th6WfQvTJxyyGGxchbPyhCI6gmCZgoGs",
  },
  {
    id: "fallback-3",
    category: "Kesehatan Mental",
    title: "Memahami Fluktuasi Mood Tanpa Menyalahkan Diri",
    body: "Perubahan emosi adalah respon biologis hormon progesteron dan estrogen. Beri dirimu ruang dan kelembutan.",
    readTime: "3 min baca",
    badgeColor: "text-tertiary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCBKrqaCigOioLACdXnDN8SA6D1F2ZMll6Jmq0Qp8G27QeZ69NsaxKY7B-qTK19omjw79oqfbtYwK2WLeKu52uv5k6ztBoPkiXMaEzu9_BKzrT7XurVHAfogVZlyQWYHGbFs17VOxE58_dwJkbxqth6C18NGBQeFvjrD7hUeq4WJt94QhN_RBrpOLtWXknovSdRQrvaNVhdWkV0JieVtnXLfpZDVWieAgenazNmEaus",
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [checkins, setCheckins] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));

  const todayStr = getTodayDateString();

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [{ data: checkinRows }, { data: articleRows }] = await Promise.all([
          supabase
            .from("daily_checkins")
            .select("*")
            .eq("user_id", user.id)
            .order("checkin_date", { ascending: false })
            .limit(30),
          supabase
            .from("education_articles")
            .select("id, category, title, summary, body, image_url, read_minutes, created_at")
            .eq("published", true)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        if (!active) return;
        setCheckins(checkinRows || []);
        setArticles(articleRows || []);
      } catch (err) {
        console.error("Dashboard load error:", err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user]);

  const todayCheckin = checkins.find((c) => c.checkin_date === todayStr) || null;
  const latestCheckin = todayCheckin || checkins[0] || null;
  const streak = calculateStreak(checkins);
  const topSymptoms = getTopSymptoms(checkins, 3);

  const displayArticles =
    articles.length > 0
      ? articles.map((a, idx) => ({
          ...a,
          summary:
            a.summary ||
            (a.body ? a.body.replace(/[#*_>`-]/g, "").trim() : ""),
          readTime: `${a.read_minutes || 4} min baca`,
          badgeColor: FALLBACK_ARTICLES[idx % 3].badgeColor,
          image: a.image_url || FALLBACK_ARTICLES[idx % 3].image,
        }))
      : FALLBACK_ARTICLES;

  const energyScore = latestCheckin?.energy ?? 3;
  const moodScore = latestCheckin?.mood ?? 4;
  const sleepHours = latestCheckin?.sleep_hours != null ? Number(latestCheckin.sleep_hours) : 7.5;
  const onPeriod = latestCheckin?.on_period ?? false;

  return (
    <div className="flex flex-col w-full gap-space-md lg:gap-space-lg">
      {/* Salutation & Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm sm:gap-space-md">
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-on-surface tracking-tight flex items-center gap-2">
              Halo, {profile?.nickname || "Sahabat"}{" "}
              <span className="material-symbols-rounded text-primary text-[22px] sm:text-[26px]">
                auto_awesome
              </span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shadow-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              {todayCheckin ? "Sudah Check-in Hari Ini" : "Siap Check-in Hari Ini"}
            </span>
          </div>
          <p className="font-body-sm sm:font-body-md text-body-sm sm:text-body-md text-on-surface-variant max-w-2xl">
            Bagaimana kabar tubuh dan energimu hari ini? Ambil jeda sejenak untuk mendengarkan
            sinyal dirimu dengan penuh penerimaan.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center gap-2 px-space-md py-1.5 bg-surface-container rounded-full text-on-surface">
            <span className="material-symbols-rounded text-primary text-[18px]">favorite</span>
            <span className="font-label-sm text-label-sm font-semibold">Ritme Tenang</span>
          </div>
        </div>
      </div>

      {/* 12-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md lg:gap-space-lg items-start">
        {/* MAIN CONTENT AREA (Columns 1-8) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md lg:gap-space-lg min-w-0">
          {/* 1. Large Hero Interactive Check-In Card */}
          <section className="relative overflow-hidden rounded-[24px] bg-surface-container-low shadow-[0_8px_24px_-4px_rgba(108,74,182,0.08)] p-4 sm:p-space-lg md:p-space-xl">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary-fixed-dim/30 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-secondary-fixed/40 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-space-md">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                {todayCheckin ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                    <span className="material-symbols-rounded text-[16px] fill-1">
                      check_circle
                    </span>
                    Sudah diisi hari ini • Tersimpan aman
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm">
                    <span className="material-symbols-rounded text-[16px]">hourglass_empty</span>
                    Belum diisi hari ini • 2 menit saja
                  </span>
                )}

                <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-rounded text-tertiary-container text-[16px]">
                    local_fire_department
                  </span>
                  <span>
                    Runtunan <strong>{streak} hari aktif</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-space-xs max-w-xl">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Dengarkan Sinyal Tubuhmu Hari Ini
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Mencatat perubahan energi, suasana hati, dan gejala membantumu mengenali pola
                  hormon tanpa rasa cemas ataupun tuntutan kesempurnaan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs">
                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="bg-surface-container-lowest p-space-md rounded-[20px] flex items-center justify-between shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-primary-container/15 flex items-center justify-center text-primary">
                      <span className="material-symbols-rounded text-[20px]">bolt</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Tingkat Energi
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {todayCheckin
                          ? `${todayCheckin.energy}/5 (${getEnergyLabel(todayCheckin.energy)})`
                          : "Siap dicatat"}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-rounded text-outline text-[18px]">
                    {todayCheckin ? "edit" : "add"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="bg-surface-container-lowest p-space-md rounded-[20px] flex items-center justify-between shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-secondary-fixed/40 flex items-center justify-center text-secondary">
                      <span className="material-symbols-rounded text-[20px]">mood</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Suasana Hati
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {todayCheckin
                          ? `${todayCheckin.mood}/5 (${getMoodLabel(todayCheckin.mood)})`
                          : "Pilih rasa"}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-rounded text-outline text-[18px]">
                    {todayCheckin ? "edit" : "add"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="bg-surface-container-lowest p-space-md rounded-[20px] flex items-center justify-between shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                      <span className="material-symbols-rounded text-[20px]">self_improvement</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Gejala Fisik
                      </span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">
                        {todayCheckin
                          ? `${todayCheckin.symptoms?.length || 0} gejala`
                          : "Pilih gejala"}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-rounded text-outline text-[18px]">
                    {todayCheckin ? "edit" : "add"}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md hover:shadow-lg transition-all active:scale-[0.99] group"
                >
                  <span>
                    {todayCheckin ? "Sunting Check-in Hari Ini" : "Isi Check-in Sekarang"}
                  </span>
                  <span className="material-symbols-rounded text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>

                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-rounded text-[16px] text-secondary">
                    check_circle
                  </span>
                  {latestCheckin
                    ? `Catatan terakhir: ${latestCheckin.checkin_date}`
                    : "Belum ada catatan sebelumnya"}
                </span>
              </div>
            </div>
          </section>

          {/* 2. Ringkasan Tubuhmu Hari Ini */}
          <section className="flex flex-col gap-space-md bg-surface-container-lowest rounded-[24px] p-space-lg shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-secondary">
                  <span className="material-symbols-rounded text-[18px]">monitoring</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Ringkasan Tubuhmu Hari Ini
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {todayCheckin ? "Data hari ini" : "Estimasi berdasar catatan terakhir"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
              <div className="bg-surface-container-low p-space-md rounded-2xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-rounded text-primary text-[15px]">bolt</span>{" "}
                  Energi
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {energyScore}/5
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-secondary">
                    {getEnergyLabel(energyScore)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${(energyScore / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-rounded text-secondary text-[15px]">mood</span>{" "}
                  Suasana Hati
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {moodScore}/5
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-secondary">
                    {getMoodLabel(moodScore)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${(moodScore / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-rounded text-primary text-[15px]">bedtime</span>{" "}
                  Durasi Tidur
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {sleepHours.toFixed(1)}
                  </span>
                  <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                    jam
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (sleepHours / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-surface-container-low p-space-md rounded-2xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-rounded text-tertiary text-[15px]">
                    water_drop
                  </span>{" "}
                  Siklus Haid
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-surface capitalize">
                    {onPeriod ? latestCheckin?.period_intensity || "Ya" : "Tidak"}
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">
                    {onPeriod ? "haid" : "aktif"}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      onPeriod ? "bg-tertiary-container" : "bg-surface-variant"
                    }`}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs pt-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                Sinyal yang terakhir tercatat:
              </span>
              <div className="flex flex-wrap gap-2 items-center">
                {latestCheckin?.symptoms?.length ? (
                  latestCheckin.symptoms.map((sym) => (
                    <div
                      key={sym}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md"
                    >
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {SYMPTOM_LABELS[sym] || sym}
                    </div>
                  ))
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary-fixed/30 text-on-secondary-container font-label-md text-label-md">
                    <span className="material-symbols-rounded text-[16px]">check</span>
                    Kondisi nyaman & stabil
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="inline-flex items-center gap-1 text-primary hover:text-primary-container font-label-sm text-label-sm ml-1 transition-colors"
                >
                  <span className="material-symbols-rounded text-[16px]">edit</span>
                  Perbarui
                </button>
              </div>
            </div>
          </section>

          {/* 3. Edukasi & Wawasan Hormon */}
          <section className="flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Edukasi & Wawasan Hormon
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Panduan lembut berbasis sains untuk mendukung perjalanan kesehatanmu.
                </p>
              </div>
              <Link
                to="/education"
                className="hidden sm:inline-flex items-center gap-1 text-primary font-label-md text-label-md hover:underline"
              >
                Lihat Semua Pustaka
                <span className="material-symbols-rounded text-[18px]">chevron_right</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              {displayArticles.map((art) => (
                <article
                  key={art.id}
                  onClick={() => navigate(`/education?article=${art.id}`)}
                  className="bg-surface-container-lowest rounded-[24px] p-space-md flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                >
                  <div className="flex flex-col gap-space-sm">
                    <div className="w-full h-36 rounded-2xl overflow-hidden bg-surface-container relative">
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt={art.title}
                        src={art.image}
                      />
                      <span
                        className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md ${art.badgeColor} font-label-sm text-label-sm font-semibold shadow-sm`}
                      >
                        {art.category}
                      </span>
                    </div>
                    <div className="flex flex-col gap-space-xs pt-1">
                      <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                        <span className="material-symbols-rounded text-[14px]">schedule</span>
                        <span>{art.readTime}</span>
                      </div>
                      <h4 className="font-label-lg text-label-lg text-on-surface font-semibold group-hover:text-primary transition-colors leading-snug">
                        {art.title}
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                        {art.summary || art.body}
                      </p>
                    </div>
                  </div>
                  <div className="pt-space-md flex items-center justify-between text-primary font-label-sm text-label-sm font-semibold">
                    <span>Baca panduan</span>
                    <span className="material-symbols-rounded text-[16px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* SIDE PANEL (Columns 9-12) */}
        <aside className="lg:col-span-4 flex flex-col gap-space-lg">
          {/* 1. Rekomendasi Hari Ini (Asisten AI) */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-surface-container-high via-surface-container to-secondary-fixed/20 p-space-lg shadow-sm">
            <div className="flex items-center gap-space-sm mb-space-sm">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-rounded text-[20px]">auto_awesome</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg text-on-surface font-bold">
                  Rekomendasi Hari Ini
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  Asisten PCOSmart
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest/90 backdrop-blur-sm p-space-md rounded-2xl flex flex-col gap-space-md shadow-sm mb-space-md">
              <div className="flex items-start gap-space-xs">
                <span className="material-symbols-rounded text-secondary text-[20px] mt-0.5">
                  wb_twilight
                </span>
                <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                  {todayCheckin
                    ? `"Berdasarkan check-in hari ini (energi ${todayCheckin.energy}/5, tidur ${todayCheckin.sleep_hours} jam), prioritaskan hidrasi hangat dan jeda peregangan ringan 15 menit."`
                    : `"Untuk menjaga keseimbangan hormon hari ini, prioritaskan sarapan tinggi protein dan jalan santai 15 menit agar gula darah tetap stabil."`}
                </p>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-space-xs">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Saran harian personal
                </span>
                <span className="text-outline text-[12px]">Siap berdiskusi</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="w-full h-11 px-space-md rounded-full bg-surface-container-highest hover:bg-secondary-container text-primary hover:text-on-secondary-container font-label-md text-label-md flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span className="material-symbols-rounded text-[18px]">chat_bubble</span>
              <span>Tanya Asisten PCOSmart</span>
            </button>
          </div>

          {/* 2. Pola & Siklus Hormon */}
          <div className="bg-surface-container-lowest rounded-[24px] p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                  <span className="material-symbols-rounded text-[18px]">cycle</span>
                </div>
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface">
                  Pola & Siklus Hormon
                </h3>
              </div>
              <span
                className="material-symbols-rounded text-outline text-[18px]"
                title="Informasi ritme siklus"
              >
                info
              </span>
            </div>

            <div className="flex flex-col gap-space-xs bg-surface-container-low p-space-md rounded-2xl">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Total Catatan 30 Hari Terakhir
              </span>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-display-lg text-display-lg text-primary font-bold">
                  {loading ? "..." : checkins.length}
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">catatan</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Runtunan aktif: <strong>{streak} hari berturut-turut</strong>
              </span>
            </div>

            <div className="bg-secondary-fixed/20 p-space-md rounded-2xl flex items-start gap-space-sm">
              <span className="material-symbols-rounded text-secondary text-[20px] mt-0.5">
                spa
              </span>
              <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                Siklus PCOS unik pada tiap tubuh dan fluktuasi adalah hal yang wajar. Kami berfokus
                memahami polamu, bukan mendikte jadwal yang kaku.
              </p>
            </div>
          </div>

          {/* 3. Gejala Paling Sering (Bulan Ini) */}
          <div className="bg-surface-container-lowest rounded-[24px] p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                  <span className="material-symbols-rounded text-[18px]">bar_chart</span>
                </div>
                <h3 className="font-label-lg text-label-lg font-bold text-on-surface">
                  Gejala Paling Sering
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Bulan Ini</span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Paling sering tercatat dalam 30 hari terakhir.
            </p>

            <div className="flex flex-col gap-space-md">
              {topSymptoms.length === 0 ? (
                <div className="p-3 rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm">
                  Belum ada gejala yang tercatat pada 30 hari terakhir.
                </div>
              ) : (
                topSymptoms.map((item, idx) => {
                  const colors = [
                    { dot: "bg-primary", text: "text-primary", bar: "bg-primary" },
                    { dot: "bg-secondary", text: "text-secondary", bar: "bg-secondary" },
                    {
                      dot: "bg-tertiary-container",
                      text: "text-tertiary",
                      bar: "bg-tertiary-container",
                    },
                  ][idx % 3];
                  const pct = Math.min(100, Math.max(20, item.count * 10));
                  return (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between font-label-md text-label-md">
                        <span className="text-on-surface font-medium flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          {item.label}
                        </span>
                        <span className={`font-semibold ${colors.text}`}>{item.count} hari</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-space-xs">
              <Link
                to="/history"
                className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm hover:underline"
              >
                <span>Lihat riwayat bulanan lengkap</span>
                <span className="material-symbols-rounded text-[16px]">chevron_right</span>
              </Link>
            </div>
          </div>

          {/* 4. Friendly Medical Disclaimer Badge */}
          <div className="bg-surface-container-high/60 p-space-md rounded-2xl flex items-start gap-space-sm text-on-surface-variant">
            <span className="material-symbols-rounded text-secondary text-[20px] shrink-0 mt-0.5">
              verified_user
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                Catatan Pendamping:
              </span>
              <p className="font-label-sm text-label-sm leading-relaxed">
                PCOSmart bukan alat diagnosis medis. Selalu konsultasikan dengan dokter spesialis
                untuk evaluasi klinis menyeluruh.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
