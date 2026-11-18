import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import VoiceJournalRecorder from "../components/VoiceJournalRecorder";
import {
  SYMPTOM_LABELS,
  getEnergyLabel,
  getMoodLabel,
  getTodayDateString,
  calculateStreak,
} from "../lib/checkinConstants";

const SYMPTOM_META = {
  nyeri_perut: {
    icon: "healing",
    category: "Siklus & Panggul",
    color: "bg-tertiary-fixed/70 text-on-tertiary-fixed",
    barColor: "bg-tertiary",
  },
  jerawat: {
    icon: "face_retouching_natural",
    category: "Hiperandrogen",
    color: "bg-primary-fixed text-primary",
    barColor: "bg-primary",
  },
  rambut_rontok: {
    icon: "content_cut",
    category: "Hiperandrogen",
    color: "bg-primary-fixed text-primary",
    barColor: "bg-primary-container",
  },
  rambut_berlebih: {
    icon: "spa",
    category: "Hiperandrogen",
    color: "bg-primary-fixed text-primary",
    barColor: "bg-primary-container",
  },
  lelah: {
    icon: "battery_2_bar",
    category: "Metabolisme & Energi",
    color: "bg-secondary-container/70 text-on-secondary-container",
    barColor: "bg-secondary",
  },
  cemas: {
    icon: "psychology",
    category: "Suasana Hati",
    color: "bg-surface-container-high text-primary",
    barColor: "bg-primary",
  },
  kembung: {
    icon: "water_drop",
    category: "Pencernaan",
    color: "bg-secondary-container/70 text-on-secondary-container",
    barColor: "bg-secondary",
  },
  sulit_tidur: {
    icon: "bedtime",
    category: "Istirahat",
    color: "bg-surface-container-high text-on-surface",
    barColor: "bg-primary-container",
  },
};

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function formatDateLongId(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function formatDateShortId(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dt);
}

function groupPeriodEpisodes(checkins = []) {
  const periodDays = checkins
    .filter((c) => c.on_period)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

  if (periodDays.length === 0) return [];

  const episodes = [];
  let current = [periodDays[0]];

  for (let i = 1; i < periodDays.length; i++) {
    const prevDate = new Date(periodDays[i - 1].checkin_date + "T00:00:00");
    const currDate = new Date(periodDays[i].checkin_date + "T00:00:00");
    const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
      current.push(periodDays[i]);
    } else {
      episodes.push(current);
      current = [periodDays[i]];
    }
  }
  episodes.push(current);

  const intensityRank = { ringan: 1, sedang: 2, deras: 3 };

  return episodes
    .map((days) => {
      const start = days[0].checkin_date;
      const end = days[days.length - 1].checkin_date;
      let peakIntensity = "ringan";
      const symptomSet = new Set();

      days.forEach((d) => {
        if (
          d.period_intensity &&
          (intensityRank[d.period_intensity] || 0) >
            (intensityRank[peakIntensity] || 0)
        ) {
          peakIntensity = d.period_intensity;
        }
        (d.symptoms || []).forEach((s) => symptomSet.add(s));
      });

      return {
        startDate: start,
        endDate: end,
        durationDays: days.length,
        peakIntensity,
        symptoms: Array.from(symptomSet).map((s) => SYMPTOM_LABELS[s] || s),
      };
    })
    .reverse();
}

export default function HistoryPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.id));
  const [rangeDays, setRangeDays] = useState(30);
  const [forceEmptyPreview, setForceEmptyPreview] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Calendar month state
  const [calendarYear, setCalendarYear] = useState(() =>
    new Date().getFullYear()
  );
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().getMonth()
  );
  const [todayDateRef] = useState(() => getTodayDateString());

  // Slide-over detail drawer state
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Quick Voice Journaling for Report state
  const [showVoiceJournalBox, setShowVoiceJournalBox] = useState(false);
  const [voiceJournalText, setVoiceJournalText] = useState("");
  const [savingVoiceJournal, setSavingVoiceJournal] = useState(false);
  const [voiceJournalSavedMsg, setVoiceJournalSavedMsg] = useState("");
  const [voiceJournalError, setVoiceJournalError] = useState("");

  const viewMode = searchParams.get("view") === "doctor" ? "doctor" : "history";

  useEffect(() => {
    if (!isDrawerOpen && !showHowItWorksModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setShowHowItWorksModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen, showHowItWorksModal]);

  useEffect(() => {
    if (!user?.id) {
      setCheckins([]);
      return;
    }
    let isMounted = true;
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", user.id)
          .order("checkin_date", { ascending: false })
          .limit(90);

        if (!isMounted) return;
        const rows = data || [];
        setCheckins(rows);
        setSelectedDateStr((prev) => prev || rows[0]?.checkin_date || null);
      } catch (err) {
        console.warn("History fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const checkinByDate = useMemo(() => {
    const map = {};
    for (const row of checkins) {
      map[row.checkin_date] = row;
    }
    return map;
  }, [checkins]);

  const filteredCheckins = useMemo(() => {
    if (forceEmptyPreview) return [];
    const [y, m, d] = todayDateRef.split("-").map(Number);
    const cutoff = new Date(y, m - 1, d);
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutoffStr = getTodayDateString(cutoff);
    return checkins.filter((c) => c.checkin_date >= cutoffStr);
  }, [checkins, rangeDays, forceEmptyPreview, todayDateRef]);

  const top5Symptoms = useMemo(() => {
    const counts = {};
    for (const row of filteredCheckins) {
      for (const sym of row.symptoms || []) {
        counts[sym] = (counts[sym] || 0) + 1;
      }
    }
    const total = Math.max(filteredCheckins.length, 1);
    return Object.entries(counts)
      .map(([id, count]) => ({
        id,
        label: SYMPTOM_LABELS[id] || id,
        count,
        percentage: Math.round((count / total) * 100),
        meta: SYMPTOM_META[id] || {
          icon: "monitoring",
          category: "Umum",
          color: "bg-surface-container-high text-on-surface",
          barColor: "bg-primary",
        },
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredCheckins]);

  const stats = useMemo(() => {
    if (filteredCheckins.length === 0) {
      return {
        avgSleep: 0,
        avgEnergy: 0,
        avgMood: 0,
        periodDaysCount: 0,
        streak: 0,
      };
    }
    let sleepSum = 0;
    let sleepCount = 0;
    let energySum = 0;
    let moodSum = 0;
    let periodDaysCount = 0;

    filteredCheckins.forEach((c) => {
      if (c.sleep_hours !== null && c.sleep_hours !== undefined) {
        sleepSum += Number(c.sleep_hours);
        sleepCount++;
      }
      energySum += Number(c.energy || 3);
      moodSum += Number(c.mood || 3);
      if (c.on_period) periodDaysCount++;
    });

    return {
      avgSleep: sleepCount > 0 ? (sleepSum / sleepCount).toFixed(1) : "0.0",
      avgEnergy: (energySum / filteredCheckins.length).toFixed(1),
      avgMood: (moodSum / filteredCheckins.length).toFixed(1),
      periodDaysCount,
      streak: calculateStreak(checkins),
    };
  }, [filteredCheckins, checkins]);

  const periodEpisodes = useMemo(
    () => groupPeriodEpisodes(filteredCheckins),
    [filteredCheckins]
  );

  // Build calendar cells for current month
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }
    const todayStr = getTodayDateString();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const record = forceEmptyPreview ? null : checkinByDate[dateStr];
      cells.push({
        empty: false,
        day,
        dateStr,
        isToday: dateStr === todayStr,
        record,
      });
    }
    return cells;
  }, [calendarYear, calendarMonth, checkinByDate, forceEmptyPreview]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dateStr) => {
    setSelectedDateStr(dateStr);
    setIsDrawerOpen(true);
    if (showVoiceJournalBox) {
      setVoiceJournalText(checkinByDate[dateStr]?.notes || "");
      setVoiceJournalSavedMsg("");
      setVoiceJournalError("");
    }
  };

  const selectedRecord = selectedDateStr ? checkinByDate[selectedDateStr] : null;

  const setDoctorView = (open) => {
    if (open) {
      setSearchParams({ view: "doctor" });
    } else {
      setSearchParams({});
    }
  };

  const handleOpenVoiceJournal = () => {
    const targetDate = selectedDateStr || todayDateRef;
    const existing = checkinByDate[targetDate];
    setVoiceJournalText(existing?.notes || "");
    setVoiceJournalSavedMsg("");
    setVoiceJournalError("");
    setShowVoiceJournalBox((prev) => !prev);
  };

  const handleSaveVoiceJournal = async () => {
    if (!voiceJournalText.trim() || savingVoiceJournal) return;
    if (!user?.id) {
      setVoiceJournalError("Silakan masuk akun terlebih dahulu untuk menyimpan jurnal.");
      return;
    }

    const targetDate = selectedDateStr || todayDateRef;
    const existing = checkinByDate[targetDate];
    if (!existing) {
      navigate(`/checkin?date=${targetDate}`, {
        state: { prefillNotes: voiceJournalText.trim().slice(0, 500) },
      });
      return;
    }

    setSavingVoiceJournal(true);
    setVoiceJournalSavedMsg("");
    setVoiceJournalError("");
    try {
      const { data, error } = await supabase
        .from("daily_checkins")
        .update({
          notes: voiceJournalText.trim().slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      setCheckins((prev) => {
        const rest = prev.filter((r) => r.checkin_date !== targetDate);
        return [data, ...rest].sort((a, b) =>
          b.checkin_date.localeCompare(a.checkin_date)
        );
      });
      setVoiceJournalSavedMsg(
        `Jurnal berhasil disimpan ke laporan tanggal ${formatDateShortId(
          targetDate
        )}!`
      );
    } catch (err) {
      setVoiceJournalError(
        err?.message || "Gagal menyimpan jurnal ke database. Coba lagi ya."
      );
    } finally {
      setSavingVoiceJournal(false);
    }
  };

  const targetVoiceDate = selectedDateStr || todayDateRef;
  const targetVoiceHasCheckin = Boolean(checkinByDate[targetVoiceDate]);

  const renderVoiceJournalPanel = (title, subtitle) => (
    <div className="print:hidden bg-surface-container-lowest rounded-3xl p-6 shadow-md border-2 border-primary-fixed flex flex-col gap-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-rounded text-[22px]">
              record_voice_over
            </span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {title} ({formatDateShortId(targetVoiceDate)})
            </h3>
            <p className="text-xs text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowVoiceJournalBox(false)}
          aria-label="Tutup panel jurnal suara"
          className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-outline"
        >
          <span className="material-symbols-rounded text-[18px]">close</span>
        </button>
      </div>

      <VoiceJournalRecorder
        key={targetVoiceDate}
        value={voiceJournalText}
        onChange={setVoiceJournalText}
        maxLength={500}
      />

      <textarea
        value={voiceJournalText}
        onChange={(e) => setVoiceJournalText(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Hasil transkripsi suara akan muncul di sini dan dapat kamu sunting sebelum disimpan..."
        className="w-full rounded-2xl bg-surface-container-low p-4 text-body-sm text-on-surface border border-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {!targetVoiceHasCheckin && (
        <p className="text-xs text-on-surface-variant bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-primary-fixed/60">
          Tanggal <strong>{formatDateShortId(targetVoiceDate)}</strong> belum
          memiliki catatan check-in lengkap. Klik tombol di bawah untuk
          melanjutkan ke form Check-in membawa transkripsi suara ini agar data
          tidur, energi, dan mood ikut tercatat akurat.
        </p>
      )}

      {voiceJournalError && (
        <p className="text-xs font-semibold text-error flex items-center gap-1">
          <span className="material-symbols-rounded text-[16px]">error</span>
          {voiceJournalError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-secondary">
          {voiceJournalSavedMsg || `${voiceJournalText.length}/500 karakter`}
        </span>
        <button
          type="button"
          onClick={handleSaveVoiceJournal}
          disabled={!voiceJournalText.trim() || savingVoiceJournal}
          className="px-6 py-2.5 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-rounded text-[18px]">
            {targetVoiceHasCheckin ? "save" : "edit_calendar"}
          </span>
          <span>
            {savingVoiceJournal
              ? "Menyimpan..."
              : targetVoiceHasCheckin
              ? "Simpan Jurnal ke Laporan"
              : "Lengkapi Check-in & Simpan Jurnal"}
          </span>
        </button>
      </div>
    </div>
  );

  if (loading && Boolean(user?.id)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-primary">
        <span className="material-symbols-rounded animate-spin text-[36px]">
          progress_activity
        </span>
        <p className="font-label-md text-label-md text-on-surface-variant">
          Memuat riwayat & wawasan hormonmu...
        </p>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: RINGKASAN UNTUK DOKTER (Stitch Screen 7892892b938a40d49fb764f6534543c1)
  // ============================================================================
  if (viewMode === "doctor") {
    const nickname = profile?.nickname || "Nadia";
    const ageRange = profile?.age_range || "18-24";

    return (
      <div className="flex flex-col gap-6 pb-12">
        {/* Top Action Controls (Hidden when printing) */}
        <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-surface-container-low p-4 sm:p-5 rounded-3xl border border-surface-container-highest">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDoctorView(false)}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-all shadow-xs"
            >
              <span className="material-symbols-rounded text-[18px]">
                arrow_back
              </span>
              <span>Kembali ke Riwayat</span>
            </button>
            <div className="flex flex-col">
              <span className="font-label-lg text-label-lg font-bold text-on-surface">
                Mode Konsultasi Medis (Siap Cetak / PDF)
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Tunjukkan layar ini ke dokter Sp.OG atau simpan sebagai PDF.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            <div className="flex items-center p-1 rounded-full bg-surface-container-lowest border border-surface-container-highest shrink-0">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRangeDays(d)}
                  className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all whitespace-nowrap ${
                    rangeDays === d
                      ? "bg-primary-container text-on-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {d} Hari
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenVoiceJournal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-lowest hover:bg-secondary-container/40 text-secondary border border-secondary/30 font-label-md text-label-md font-bold shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-rounded text-[18px]">mic</span>
              <span>Voice Note Jurnal</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md transition-all whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-rounded text-[18px]">print</span>
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Interactive Voice Note Journaling Panel for Report (Hidden when printing) */}
        {showVoiceJournalBox &&
          renderVoiceJournalPanel(
            "Voice Journaling untuk Laporan Dokter",
            "Rekam keluhan atau catatan harianmu dengan suara; otomatis ditranskripsi menjadi teks pada laporan ini."
          )}

        {/* A4 Clinical Summary Sheet */}
        <div className="max-w-[880px] w-full mx-auto bg-surface-container-lowest rounded-3xl p-4 sm:p-10 md:p-12 shadow-[0_12px_40px_rgba(31,25,39,0.06)] border border-surface-container-highest print:shadow-none print:border-none print:p-0 flex flex-col gap-6 sm:gap-8">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-surface-container-highest">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-rounded text-[26px]">
                  clinical_notes
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm font-extrabold text-primary tracking-tight">
                    PCOSmart
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold uppercase tracking-wider">
                    Ringkasan Pasien Mandiri
                  </span>
                </div>
                <h1 className="text-[22px] sm:text-[24px] font-extrabold text-on-surface tracking-tight leading-snug">
                  Ringkasan Observasi Siklus & Gejala Harian
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Laporan terstruktur untuk membantu anamnesis dokter spesialis
                  Obstetri & Ginekologi (Sp.OG).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end text-left sm:text-right font-body-sm text-body-sm text-on-surface-variant shrink-0 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-surface-container-highest">
              <span className="font-label-sm text-[11px] text-outline uppercase font-bold tracking-wider">
                Tanggal Cetak Laporan
              </span>
              <span className="font-bold text-on-surface">
                {formatDateShortId(getTodayDateString())}
              </span>
              <span className="text-[11px] text-secondary font-semibold mt-0.5">
                Rentang Evaluasi: {rangeDays} Hari Terakhir
              </span>
            </div>
          </div>

          {/* Patient Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Nama Panggilan
              </span>
              <span className="text-[15px] font-bold text-on-surface">
                {nickname}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Kelompok Usia
              </span>
              <span className="text-[15px] font-bold text-on-surface">
                {ageRange} Tahun
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Total Hari Tercatat
              </span>
              <span className="text-[15px] font-bold text-primary">
                {filteredCheckins.length} Hari Check-in
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Total Hari Haid
              </span>
              <span className="text-[15px] font-bold text-tertiary">
                {stats.periodDaysCount} Hari Tercatat
              </span>
            </div>
          </div>

          {/* SECTION 01: RIWAYAT EPISODE HAID */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-[12px] font-bold flex items-center justify-center">
                  01
                </span>
                <h2 className="text-[16px] font-bold text-on-surface tracking-tight">
                  Riwayat Episode Haid & Intensitas Perdarahan
                </h2>
              </div>
              <span className="text-[12px] font-medium text-on-surface-variant">
                {periodEpisodes.length} episode teramati
              </span>
            </div>

            {periodEpisodes.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest text-body-sm text-on-surface-variant">
                Belum ada hari haid (`on_period = true`) yang tercatat dalam{" "}
                {rangeDays} hari terakhir.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-surface-container-highest">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b border-surface-container-highest">
                      <th className="py-3 px-4">Rentang Tanggal</th>
                      <th className="py-3 px-4">Durasi Tercatat</th>
                      <th className="py-3 px-4">Intensitas Puncak</th>
                      <th className="py-3 px-4">Gejala Penyerta Saat Haid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest text-[13px]">
                    {periodEpisodes.map((ep, idx) => (
                      <tr key={idx} className="bg-surface-container-lowest">
                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          {formatDateShortId(ep.startDate)} –{" "}
                          {formatDateShortId(ep.endDate)}
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant font-medium">
                          {ep.durationDays} hari
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize bg-tertiary-fixed text-on-tertiary-fixed">
                            Aliran {ep.peakIntensity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-on-surface-variant">
                          {ep.symptoms.length > 0
                            ? ep.symptoms.join(", ")
                            : "Tidak ada keluhan spesifik"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 02: 5 GEJALA PALING SERING MUNCUL */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-[12px] font-bold flex items-center justify-center">
                  02
                </span>
                <h2 className="text-[16px] font-bold text-on-surface tracking-tight">
                  5 Gejala Dominan yang Dilaporkan Pasien
                </h2>
              </div>
              <span className="text-[12px] font-medium text-on-surface-variant">
                Dari {filteredCheckins.length} hari log
              </span>
            </div>

            {top5Symptoms.length === 0 ? (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest text-body-sm text-on-surface-variant">
                Tidak ada gejala spesifik yang dipilih dalam periode ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {top5Symptoms.map((sym, idx) => (
                  <div
                    key={sym.id}
                    className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                        #{idx + 1} • {sym.meta.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-on-surface text-[11px] font-bold border border-surface-container-highest">
                        {sym.count} hari ({sym.percentage}%)
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-on-surface">
                      {sym.label}
                    </span>
                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full ${sym.meta.barColor}`}
                        style={{ width: `${Math.max(sym.percentage, 12)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 03: RATA-RATA KESEJAHTERAAN & CATATAN */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary text-[12px] font-bold flex items-center justify-center">
                03
              </span>
              <h2 className="text-[16px] font-bold text-on-surface tracking-tight">
                Metrik Gaya Hidup Harian & Kutipan Catatan Pasien
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-highest flex flex-col gap-1">
                <span className="text-[12px] text-on-surface-variant font-medium">
                  Rata-rata Durasi Tidur
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[24px] font-extrabold text-on-surface">
                    {stats.avgSleep}
                  </span>
                  <span className="text-[12px] font-semibold text-secondary">
                    jam / malam
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-highest flex flex-col gap-1">
                <span className="text-[12px] text-on-surface-variant font-medium">
                  Rata-rata Skor Energi
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[24px] font-extrabold text-on-surface">
                    {stats.avgEnergy}
                  </span>
                  <span className="text-[12px] font-semibold text-primary">
                    / 5.0 ({getEnergyLabel(Math.round(Number(stats.avgEnergy) || 3))})
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-highest flex flex-col gap-1">
                <span className="text-[12px] text-on-surface-variant font-medium">
                  Rata-rata Suasana Hati
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[24px] font-extrabold text-on-surface">
                    {stats.avgMood}
                  </span>
                  <span className="text-[12px] font-semibold text-secondary">
                    / 5.0 ({getMoodLabel(Math.round(Number(stats.avgMood) || 3))})
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Patient Notes & Voice Transcriptions */}
            {filteredCheckins.some((c) => c.notes && c.notes.trim()) && (
              <div className="mt-1 p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-primary text-[16px]">
                      graphic_eq
                    </span>
                    Laporan Jurnal & Transkripsi Suara Pasien:
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {filteredCheckins
                    .filter((c) => c.notes && c.notes.trim())
                    .slice(0, 8)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="text-[13px] text-on-surface-variant flex items-start gap-2"
                      >
                        <span className="font-bold text-primary shrink-0">
                          [{formatDateShortId(c.checkin_date)}]
                        </span>
                        <span className="italic">&ldquo;{c.notes}&rdquo;</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>

          {/* Mandatory Clinical Disclaimer Footer */}
          <footer className="pt-4 border-t border-surface-container-highest flex items-start gap-3 text-[12px] text-on-surface-variant leading-relaxed">
            <span className="material-symbols-rounded text-secondary text-[20px] shrink-0 mt-0.5">
              verified_user
            </span>
            <div>
              <strong className="text-on-surface font-bold">
                Pernyataan Medis Resmi (Disclaimer):
              </strong>{" "}
              Dokumen ini dihasilkan secara otomatis berdasarkan catatan mandiri
              pengguna di aplikasi PCOSmart dan{" "}
              <strong className="text-on-surface">
                bukan merupakan alat atau hasil diagnosis klinis
              </strong>
              . Seluruh interpretasi medis, pemeriksaan ultrasonografi/laboratorium,
              dan penatalaksanaan terapi sepenuhnya berada di bawah wewenang
              dokter pemeriksa.
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: EMPTY STATE (Stitch Screen 091801bb1d0b42398b7c2ef55c02ca38)
  // ============================================================================
  if (checkins.length === 0 || forceEmptyPreview) {
    return (
      <div className="flex flex-col gap-8 pb-12">
        {/* Header Section with Title & Disabled Range Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
                Tinjauan Siklus & Log Harian
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
              <span className="text-outline font-label-sm text-label-sm">
                0 Data Tercatat
              </span>
              {forceEmptyPreview && (
                <button
                  type="button"
                  onClick={() => setForceEmptyPreview(false)}
                  className="ml-2 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold hover:bg-primary-container hover:text-on-primary transition-all"
                >
                  Kembali ke Data Riwayat ({checkins.length} Hari)
                </button>
              )}
            </div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface font-extrabold tracking-tight">
              Riwayat & Wawasan Hormon
            </h1>
          </div>

          <div className="flex items-center p-1.5 rounded-full bg-surface-container-high/70 self-start md:self-auto shadow-xs">
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-full font-label-md text-label-md text-outline cursor-not-allowed opacity-60"
            >
              7 Hari
            </button>
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-full font-label-md text-label-md text-outline cursor-not-allowed opacity-60"
            >
              30 Hari
            </button>
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-full font-label-md text-label-md text-outline cursor-not-allowed opacity-60"
            >
              90 Hari
            </button>
          </div>
        </div>

        {/* Centered Main Empty State Card Container */}
        <div className="flex justify-center w-full">
          <div className="relative w-full max-w-[760px] bg-surface-container-lowest rounded-3xl p-8 sm:p-12 md:p-14 shadow-xl shadow-primary/5 flex flex-col items-center text-center overflow-hidden border border-surface-container-highest/60">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none" />

            {/* Decorative Illustration: Calming Plant & Calendar Heart Composition */}
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-surface-container flex items-center justify-center relative shadow-inner">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  viewBox="0 0 72 72"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    fill="#6C4AB6"
                    fillOpacity="0.12"
                    height="42"
                    rx="14"
                    width="44"
                    x="14"
                    y="16"
                  />
                  <rect
                    fill="#FFFFFF"
                    height="32"
                    rx="10"
                    width="40"
                    x="16"
                    y="24"
                  />
                  <rect
                    fill="#6C4AB6"
                    height="8"
                    rx="2"
                    width="4"
                    x="22"
                    y="12"
                  />
                  <rect
                    fill="#6C4AB6"
                    height="8"
                    rx="2"
                    width="4"
                    x="46"
                    y="12"
                  />
                  <path
                    d="M36 46C36 39 36 32 36 29"
                    stroke="#006A60"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M36 34C31 32 27 34 26 38C29 39 33 38 36 34Z"
                    fill="#7CD6C8"
                  />
                  <path
                    d="M36 30C41 28 45 30 46 34C43 35 39 34 36 30Z"
                    fill="#98F3E4"
                  />
                  <circle cx="48" cy="46" fill="#6C4AB6" r="9" />
                  <path
                    d="M48 48.5L46.8 47.4C43.5 44.4 42 43.1 42 41.5C42 40.1 43.1 39 44.5 39C45.3 39 46 39.4 46.5 40C47 39.4 47.7 39 48.5 39C49.9 39 51 40.1 51 41.5C51 43.1 49.5 44.4 46.2 47.4L48 48.5Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-6 w-6 bg-secondary text-white items-center justify-center">
                  <span className="material-symbols-rounded text-[14px]">
                    add
                  </span>
                </span>
              </span>
            </div>

            <span className="text-secondary font-label-md text-label-md font-bold tracking-wider uppercase mb-1">
              Langkah Pertama Menuju Pemahaman Diri
            </span>
            <h2 className="text-headline-md font-headline-md text-on-surface font-bold tracking-tight mb-4">
              Belum Ada Catatan Check-in
            </h2>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-xl leading-relaxed mb-8">
              Perjalanan memahami ritme hormonmu dimulai dari satu langkah kecil.
              Dengan mencatat sinyal tubuh—seperti energi, suasana hati, dan
              gejala harian—kamu membantu dirimu melihat pola alami tanpa beban
              atau tuntutan kesempurnaan.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link
                to="/checkin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-primary-container hover:bg-primary text-white font-label-lg text-label-lg font-bold shadow-md shadow-primary/25 transition-all active:scale-95"
              >
                <span className="material-symbols-rounded text-[20px]">
                  add_circle
                </span>
                <span>Isi Check-in Pertama</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-lg text-label-lg font-bold transition-all"
              >
                <span className="material-symbols-rounded text-[20px]">
                  help_outline
                </span>
                <span>Pelajari Cara Kerja Riwayat</span>
              </button>
            </div>

            <div className="mt-8 flex items-center gap-2 text-outline font-label-sm text-label-sm">
              <span className="material-symbols-rounded text-[16px] text-secondary">
                lock
              </span>
              <span>
                Data kesehatanmu terenkripsi secara privat dan aman di perangkat
                ini.
              </span>
            </div>
          </div>
        </div>

        {/* Educational Value Preview Section: 3 Soft Cards */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-secondary text-[22px]">
                auto_awesome
              </span>
              <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">
                Manfaat Melacak Ritme Tubuhmu
              </h3>
            </div>
            <span className="text-outline font-body-sm text-body-sm hidden md:inline">
              Mengapa pencatatan rutin bermakna bagi PCOS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-surface-container-highest/60">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-secondary">
                  <span className="material-symbols-rounded text-[26px]">
                    psychology_alt
                  </span>
                </div>
                <h4 className="text-headline-sm font-headline-sm font-bold text-on-surface leading-snug">
                  Kenali Pola Tanpa Cemas
                </h4>
                <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  Amati bagaimana tingkat energi dan suasana hati berfluktuasi
                  secara wajar sepanjang siklus, membantu merespons kebutuhan
                  tubuh dengan tenang.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-secondary font-label-md text-label-md font-semibold">
                <span>Harmonisasi hormonal</span>
                <span className="material-symbols-rounded text-[16px]">
                  trending_up
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-surface-container-highest/60">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-rounded text-[26px]">
                    self_improvement
                  </span>
                </div>
                <h4 className="text-headline-sm font-headline-sm font-bold text-on-surface leading-snug">
                  Bebas dari Jadwal Kaku
                </h4>
                <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  PCOSmart tidak pernah memprediksi tanggal haid berikutnya
                  secara terburu-buru, melainkan menghargai keunikan ritme
                  biologis tubuhmu.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-primary font-label-md text-label-md font-semibold">
                <span>Fleksibel & bebas stigma</span>
                <span className="material-symbols-rounded text-[16px]">
                  favorite
                </span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-surface-container-highest/60">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-tertiary-container">
                  <span className="material-symbols-rounded text-[26px]">
                    clinical_notes
                  </span>
                </div>
                <h4 className="text-headline-sm font-headline-sm font-bold text-on-surface leading-snug">
                  Siap untuk Diskusi Medis
                </h4>
                <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                  Ekspor ringkasan terstruktur kapan pun kamu ingin
                  berkonsultasi dengan dokter spesialis (Sp.OG) untuk diskusi
                  yang lebih informatif.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-tertiary-container font-label-md text-label-md font-semibold">
                <span>Ringkasan tervalidasi</span>
                <span className="material-symbols-rounded text-[16px]">
                  file_download
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Modal */}
        {showHowItWorksModal && (
          <div
            className="fixed inset-0 bg-on-background/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowHowItWorksModal(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bagaimana Riwayat Bekerja?"
              className="bg-surface-container-lowest max-w-lg w-full max-h-[90dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-3xl p-6 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-8 shadow-2xl relative flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden -mt-2" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-primary">
                  <span className="material-symbols-rounded text-[24px]">
                    insights
                  </span>
                  <h3 className="text-headline-sm font-headline-sm font-bold text-on-surface">
                    Bagaimana Riwayat Bekerja?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHowItWorksModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline transition-colors"
                >
                  <span className="material-symbols-rounded text-[20px]">
                    close
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-3 text-body-sm font-body-sm text-on-surface-variant leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-surface-container-low flex gap-3">
                  <span className="material-symbols-rounded text-secondary text-[20px] shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <p>
                    <strong className="text-on-surface">
                      1. Log Harian Singkat:
                    </strong>{" "}
                    Luangkan 1 menit setiap hari untuk memilih gejala, kualitas
                    tidur, dan suasana hati.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-container-low flex gap-3">
                  <span className="material-symbols-rounded text-secondary text-[20px] shrink-0 mt-0.5">
                    timeline
                  </span>
                  <p>
                    <strong className="text-on-surface">
                      2. Agregasi Pola:
                    </strong>{" "}
                    Setelah beberapa catatan, grafik tren energi dan wawasan
                    gejala teramati akan aktif secara otomatis.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-container-low flex gap-3">
                  <span className="material-symbols-rounded text-secondary text-[20px] shrink-0 mt-0.5">
                    ios_share
                  </span>
                  <p>
                    <strong className="text-on-surface">
                      3. Berbagi Aman:
                    </strong>{" "}
                    Cetak ringkasan berkala dalam format siap-dokter untuk sesi
                    konsultasi Sp.OG Anda.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="w-full mt-2 py-3 rounded-full bg-primary-container text-white font-label-lg text-label-lg font-bold shadow-sm"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: RIWAYAT & WAWASAN HORMON + SLIDE-OVER DETAIL HARI TERPILIH
  // (Stitch Screens 664f2e33d4714422aa9715810d7df19a & 29e8badbba0f4da095cc8b90d2fb349e)
  // ============================================================================
  return (
    <div className="flex flex-col gap-5 sm:gap-7 pb-8 sm:pb-12 relative">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-rounded text-[15px]">
                insights
              </span>
              Tinjauan Siklus & Log Harian
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <span className="text-on-surface-variant font-label-sm text-label-sm font-semibold">
              {filteredCheckins.length} Data Tercatat ({rangeDays} Hari)
            </span>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => setForceEmptyPreview(true)}
                className="text-[11px] font-semibold text-primary underline hover:text-primary-container ml-1"
              >
                Pratinjau Tampilan Kosong
              </button>
            )}
          </div>
          <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-on-surface font-extrabold tracking-tight">
            Riwayat & Wawasan Hormon
          </h1>
          <p className="font-body-sm sm:font-body-md text-body-sm sm:text-body-md text-on-surface-variant max-w-2xl">
            Amati pola gejala, siklus haid, dan keseimbangan harianmu secara
            tenang tanpa penghakiman.
          </p>
        </div>

        {/* Right Controls: Horizontally scrollable on Mobile + Doctor Summary CTA */}
        <div className="-mx-margin px-margin sm:mx-0 sm:px-0 flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center p-1 rounded-full bg-surface-container-high/80 border border-surface-container-highest shrink-0">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={`px-3.5 sm:px-4 py-2 rounded-full font-label-md text-label-md font-semibold transition-all whitespace-nowrap ${
                  rangeDays === d
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {d} Hari
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenVoiceJournal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-fixed hover:bg-primary-container text-primary hover:text-on-primary font-label-md text-label-md font-bold shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-rounded text-[19px]">mic</span>
            <span>Jurnal Suara</span>
          </button>

          <button
            type="button"
            onClick={() => setDoctorView(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-lowest hover:bg-secondary-container/40 text-secondary border border-secondary/30 font-label-md text-label-md font-bold shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-rounded text-[19px]">
              clinical_notes
            </span>
            <span>Ringkasan untuk Dokter</span>
          </button>
        </div>
      </div>

      {/* Quick Voice Journaling Box on Main History View */}
      {showVoiceJournalBox &&
        renderVoiceJournalPanel(
          "Rekam Voice Note Jurnal",
          "Rekam suara untuk ditranskripsi menjadi teks jurnal pada tanggal terpilih."
        )}

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN (5 Cols): Calendar + Consistency + Cycle Note */}
        <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6">
          {/* Interactive Monthly Calendar Card */}
          <section className="bg-surface-container-lowest rounded-3xl p-4 sm:p-6 shadow-sm border border-surface-container-highest/70 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Kalender Observasi
                </span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {MONTH_NAMES_ID[calendarMonth]} {calendarYear}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                  className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-rounded text-[20px]">
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan berikutnya"
                  className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-rounded text-[20px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {DAY_HEADERS.map((d) => (
                <span
                  key={d}
                  className="text-[11px] font-bold text-outline py-1"
                >
                  {d}
                </span>
              ))}

              {calendarCells.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.key} className="h-11" />;
                }
                const isSelected = selectedDateStr === cell.dateStr;
                const hasRecord = Boolean(cell.record);
                const isPeriod = Boolean(cell.record?.on_period);

                let cellStyle =
                  "bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container-high";
                if (isPeriod) {
                  cellStyle =
                    "bg-tertiary-fixed/85 text-on-tertiary-fixed font-bold hover:bg-tertiary-fixed";
                } else if (hasRecord) {
                  cellStyle =
                    "bg-surface-container-high text-on-surface font-semibold hover:bg-primary-fixed/60";
                }
                if (isSelected) {
                  cellStyle =
                    "bg-primary-container text-on-primary font-bold ring-2 ring-primary ring-offset-2 shadow-sm";
                }

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`relative h-11 rounded-2xl flex flex-col items-center justify-center text-[13px] transition-all ${cellStyle}`}
                  >
                    <span>{cell.day}</span>
                    {hasRecord && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          isSelected
                            ? "bg-on-primary"
                            : isPeriod
                            ? "bg-tertiary"
                            : "bg-secondary"
                        }`}
                      />
                    )}
                    {cell.isToday && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend & Quick Inspect CTA */}
            <div className="pt-3 border-t border-surface-container-highest flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-on-surface-variant">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed border border-tertiary" />
                  Haid
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  Check-in
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  Terpilih
                </span>
              </div>

              {selectedDateStr && (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Buka Detail {formatDateShortId(selectedDateStr)}</span>
                  <span className="material-symbols-rounded text-[14px]">
                    open_in_new
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Pola Siklus Hormon (Non-Predictive Empathy Card) */}
          <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container-highest/70 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-tertiary-fixed/70 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-rounded text-[22px]">
                    water_drop
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Pola Siklus Hormon
                  </h3>
                  <span className="text-[12px] text-on-surface-variant">
                    Observasi non-prediktif ramah PCOS
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container text-[11px] font-bold">
                {stats.periodDaysCount} Hari Haid
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-outline uppercase">
                  Episode Tercatat
                </span>
                <span className="text-[18px] font-extrabold text-on-surface">
                  {periodEpisodes.length} Siklus
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Dalam {rangeDays} hari terakhir
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-outline uppercase">
                  Konsistensi Log
                </span>
                <span className="text-[18px] font-extrabold text-primary">
                  {stats.streak} Hari Beruntun
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Tanpa tuntutan sempurna
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low/90 border border-primary-fixed flex items-start gap-2.5">
              <span className="material-symbols-rounded text-primary text-[18px] shrink-0 mt-0.5">
                favorite
              </span>
              <p className="text-[12px] text-on-surface-variant leading-relaxed">
                <strong className="text-on-surface">
                  Mengapa tidak ada hitungan mundur haid?
                </strong>{" "}
                Pada PCOS, jeda ovulasi bisa bergeser secara alami. PCOSmart
                berfokus pada sinyal tubuhmu hari ini agar kamu bebas dari rasa
                cemas saat jadwal bergeser.
              </p>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (7 Cols): Top 5 Symptoms + Daily Wellbeing Trends */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 5 Gejala Teramati Card */}
          <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-sm border border-surface-container-highest/70 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-rounded text-[22px]">
                    bar_chart
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    5 Gejala Teramati
                  </h2>
                  <p className="text-[12px] text-on-surface-variant">
                    Frekuensi sinyal tubuh dari {filteredCheckins.length} hari
                    pencatatan terakhir
                  </p>
                </div>
              </div>
              <Link
                to="/checkin"
                className="text-[12px] font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>+ Tambah Log Hari Ini</span>
              </Link>
            </div>

            {top5Symptoms.length === 0 ? (
              <div className="p-6 rounded-2xl bg-surface-container-low text-center text-body-sm text-on-surface-variant">
                Belum ada gejala yang dipilih pada rentang waktu ini.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {top5Symptoms.map((sym) => (
                  <div
                    key={sym.id}
                    className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-surface-container-highest/60 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${sym.meta.color}`}
                        >
                          <span className="material-symbols-rounded text-[18px]">
                            {sym.meta.icon}
                          </span>
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-on-surface leading-tight">
                            {sym.label}
                          </span>
                          <span className="text-[11px] text-outline font-medium">
                            Kategori: {sym.meta.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-extrabold text-on-surface">
                          {sym.count} Hari
                        </span>
                        <span className="text-[11px] text-on-surface-variant block">
                          {sym.percentage}% dari log
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${sym.meta.barColor}`}
                        style={{ width: `${Math.max(sym.percentage, 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tren Kesejahteraan Harian (Energy, Mood, Sleep) */}
          <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-sm border border-surface-container-highest/70 flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container/60 text-secondary flex items-center justify-center">
                  <span className="material-symbols-rounded text-[22px]">
                    monitoring
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Tren Kesejahteraan Harian
                  </h2>
                  <p className="text-[12px] text-on-surface-variant">
                    Korelasi tidur malam, tingkat energi, dan suasana hati
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Metric Summary Cards with Smooth SVG Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Energi */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-on-surface-variant">
                    Tingkat Energi
                  </span>
                  <span className="material-symbols-rounded text-primary text-[18px]">
                    bolt
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] font-extrabold text-on-surface">
                      {stats.avgEnergy}
                    </span>
                    <span className="text-[12px] text-outline font-semibold">
                      / 5.0
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary">
                    Rata-rata:{" "}
                    {getEnergyLabel(Math.round(Number(stats.avgEnergy) || 3))}
                  </span>
                </div>
                <svg
                  className="w-full h-10 overflow-visible"
                  viewBox="0 0 120 32"
                  fill="none"
                >
                  <path
                    d="M0 24 C20 22, 35 10, 60 14 C85 18, 100 6, 120 8"
                    stroke="#6c4ab6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Suasana Hati */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-on-surface-variant">
                    Suasana Hati
                  </span>
                  <span className="material-symbols-rounded text-secondary text-[18px]">
                    sentiment_satisfied
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] font-extrabold text-on-surface">
                      {stats.avgMood}
                    </span>
                    <span className="text-[12px] text-outline font-semibold">
                      / 5.0
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-secondary">
                    Rata-rata:{" "}
                    {getMoodLabel(Math.round(Number(stats.avgMood) || 4))}
                  </span>
                </div>
                <svg
                  className="w-full h-10 overflow-visible"
                  viewBox="0 0 120 32"
                  fill="none"
                >
                  <path
                    d="M0 20 C25 14, 45 18, 70 10 C90 5, 105 12, 120 7"
                    stroke="#006a60"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Durasi Tidur */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-on-surface-variant">
                    Durasi Tidur
                  </span>
                  <span className="material-symbols-rounded text-tertiary text-[18px]">
                    bedtime
                  </span>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[26px] font-extrabold text-on-surface">
                      {stats.avgSleep}
                    </span>
                    <span className="text-[12px] text-outline font-semibold">
                      jam
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-on-surface-variant">
                    Target optimal: 7–8 jam
                  </span>
                </div>
                <svg
                  className="w-full h-10 overflow-visible"
                  viewBox="0 0 120 32"
                  fill="none"
                >
                  <path
                    d="M0 18 C30 24, 50 8, 80 12 C95 14, 110 8, 120 10"
                    stroke="#99472f"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Recent Daily Log List (Click to open Slide-Over Detail) */}
            <div className="flex flex-col gap-2.5 pt-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-outline">
                Catatan Harian Terbaru (Klik untuk Detail)
              </span>
              <div className="flex flex-col gap-2">
                {filteredCheckins.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectDate(item.checkin_date)}
                    className="w-full text-left p-3.5 rounded-2xl bg-surface-container-low/60 hover:bg-surface-container-high border border-surface-container-highest/70 flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-[13px] ${
                          item.on_period
                            ? "bg-tertiary-fixed text-on-tertiary-fixed"
                            : "bg-primary-fixed text-primary"
                        }`}
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          {item.on_period ? "water_drop" : "event_available"}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-bold text-on-surface">
                            {formatDateLongId(item.checkin_date)}
                          </span>
                          {item.on_period && (
                            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold capitalize">
                              Haid • {item.period_intensity || "Sedang"}
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-on-surface-variant truncate">
                          Tidur {item.sleep_hours ?? "-"}j • Energi{" "}
                          {getEnergyLabel(item.energy)} • Mood{" "}
                          {getMoodLabel(item.mood)}
                          {item.symptoms?.length
                            ? ` • ${item.symptoms
                                .map((s) => SYMPTOM_LABELS[s] || s)
                                .join(", ")}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <span className="material-symbols-rounded text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ====================================================================
          SLIDE-OVER PANEL (BOTTOM SHEET ON MOBILE): DETAIL HARI TERPILIH
          (Stitch Screens 29e8badbba0f4da095cc8b90d2fb349e & 356bba520f98410f80b7b0787c836cf2)
         ==================================================================== */}
      {isDrawerOpen && selectedDateStr && (
        <div
          className="fixed inset-0 z-50 bg-on-background/35 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Detail Hari Terpilih"
            className="w-full sm:w-[470px] max-h-[92dvh] sm:max-h-full h-auto sm:h-full rounded-t-[2rem] sm:rounded-none pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0 bg-surface-container-lowest shadow-2xl border-t sm:border-t-0 sm:border-l border-surface-container-highest flex flex-col justify-between overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 sm:p-6 border-b border-surface-container-highest sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-10 flex flex-col gap-2">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden -mt-1" />
              <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedRecord
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container-high text-outline"
                    }`}
                  >
                    <span className="material-symbols-rounded text-[13px]">
                      {selectedRecord ? "check_circle" : "info"}
                    </span>
                    {selectedRecord ? "Catatan Tersimpan" : "Belum Ada Log"}
                  </span>
                </div>
                <h2 className="text-[20px] font-extrabold text-on-surface tracking-tight">
                  {formatDateLongId(selectedDateStr)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Tutup panel detail"
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-rounded text-[20px]">
                  close
                </span>
              </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 flex flex-col gap-5">
              {!selectedRecord ? (
                <div className="my-auto py-12 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-rounded text-[30px]">
                      edit_calendar
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      Belum Ada Check-in di Tanggal Ini
                    </h3>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed">
                      Tidak apa-apa jika ada hari yang terlewat. Kamu tetap bisa
                      mengisi atau melengkapi catatan hari ini kapan saja.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/checkin?date=${selectedDateStr}`)
                    }
                    className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-container text-on-primary font-bold text-[13px] shadow-sm"
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      add_circle
                    </span>
                    <span>Isi Catatan untuk Tanggal Ini</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Period Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      selectedRecord.on_period
                        ? "bg-tertiary-fixed/50 border-tertiary/20 text-on-tertiary-fixed"
                        : "bg-surface-container-low border-surface-container-highest text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          selectedRecord.on_period
                            ? "bg-tertiary text-on-tertiary"
                            : "bg-secondary-container text-on-secondary-container"
                        }`}
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          {selectedRecord.on_period ? "water_drop" : "spa"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                          Status Siklus Haid
                        </span>
                        <span className="text-[15px] font-extrabold capitalize">
                          {selectedRecord.on_period
                            ? `Sedang Haid • Aliran ${
                                selectedRecord.period_intensity || "Sedang"
                              }`
                            : "Tidak Sedang Haid (Fase Non-Menstruasi)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2x2 Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline uppercase">
                        Durasi Tidur
                      </span>
                      <span className="text-[20px] font-extrabold text-on-surface">
                        {selectedRecord.sleep_hours ?? "-"} Jam
                      </span>
                      <span className="text-[11px] text-secondary font-semibold">
                        {selectedRecord.sleep_hours == null
                          ? "Belum diisi"
                          : Number(selectedRecord.sleep_hours) >= 7
                          ? "Istirahat Cukup"
                          : "Perlu Istirahat Ekstra"}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline uppercase">
                        Tingkat Energi
                      </span>
                      <span className="text-[20px] font-extrabold text-on-surface">
                        {selectedRecord.energy}/5
                      </span>
                      <span className="text-[11px] text-primary font-semibold">
                        {getEnergyLabel(selectedRecord.energy)}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline uppercase">
                        Suasana Hati
                      </span>
                      <span className="text-[20px] font-extrabold text-on-surface">
                        {selectedRecord.mood}/5
                      </span>
                      <span className="text-[11px] text-secondary font-semibold">
                        {getMoodLabel(selectedRecord.mood)}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-outline uppercase">
                        Total Gejala
                      </span>
                      <span className="text-[20px] font-extrabold text-on-surface">
                        {selectedRecord.symptoms?.length || 0} Gejala
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Tercatat di log
                      </span>
                    </div>
                  </div>

                  {/* Symptom Chips */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-outline">
                      Gejala yang Dirasakan
                    </span>
                    {selectedRecord.symptoms?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRecord.symptoms.map((sym) => {
                          const meta = SYMPTOM_META[sym] || {
                            icon: "check_circle",
                            color: "bg-primary-fixed text-primary",
                          };
                          return (
                            <span
                              key={sym}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold ${meta.color}`}
                            >
                              <span className="material-symbols-rounded text-[16px]">
                                {meta.icon}
                              </span>
                              {SYMPTOM_LABELS[sym] || sym}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[13px] text-on-surface-variant">
                        Tidak ada keluhan fisik yang dipilih pada hari ini.
                      </p>
                    )}
                  </div>

                  {/* Personal Notes Quote Box */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-outline">
                      Catatan Pribadi
                    </span>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex items-start gap-2.5">
                      <span className="material-symbols-rounded text-primary text-[20px] shrink-0">
                        format_quote
                      </span>
                      <p className="text-[13px] text-on-surface leading-relaxed italic">
                        {selectedRecord.notes && selectedRecord.notes.trim()
                          ? selectedRecord.notes
                          : "Tidak ada catatan tertulis tambahan untuk hari ini."}
                      </p>
                    </div>
                  </div>

                  {/* AI Companion Insight Box */}
                  <div className="p-4 rounded-2xl bg-primary-fixed/40 border border-primary-fixed flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-primary text-[12px] font-bold">
                      <span className="material-symbols-rounded text-[16px]">
                        auto_awesome
                      </span>
                      <span>Refleksi Lembut Hari Ini</span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant leading-relaxed">
                      {selectedRecord.on_period
                        ? "Tubuhmu sedang bekerja ekstra di fase menstruasi. Prioritaskan asupan hangat, zat besi, dan istirahat tanpa rasa bersalah."
                        : selectedRecord.sleep_hours != null &&
                          Number(selectedRecord.sleep_hours) < 7
                        ? "Tidur di bawah 7 jam dapat memengaruhi sensitivitas insulin dan energi. Pilih jalan santai ringan dan hindari kafein sore hari."
                        : "Keseimbangan tidur dan energimu cukup terjaga. Pertahankan hidrasi dan porsi serat seimbang."}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Sticky Footer Actions */}
            <div className="p-5 border-t border-surface-container-highest bg-surface-container-lowest sticky bottom-0 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/checkin?date=${selectedDateStr}`)}
                className="w-full sm:w-auto flex-1 h-11 px-4 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-rounded text-[18px]">
                  edit
                </span>
                <span>Ubah Catatan</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate("/chat", {
                    state: {
                      prefillPrompt: `Bantu saya memahami catatan check-in saya pada tanggal ${formatDateLongId(
                        selectedDateStr
                      )} dan langkah lembut yang bisa saya lakukan.`,
                    },
                  })
                }
                className="w-full sm:w-auto flex-1 h-11 px-4 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-rounded text-[18px]">
                  chat_spark
                </span>
                <span>Tanya Asisten AI</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
