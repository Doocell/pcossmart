import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { formatIndonesianDate } from "../components/AppShell";
import VoiceJournalRecorder from "../components/VoiceJournalRecorder";
import {
  ENERGY_STEPS,
  FLOW_OPTIONS,
  MOOD_STEPS,
  SYMPTOM_LABELS,
  SYMPTOM_OPTIONS,
  calculateStreak,
  getEnergyLabel,
  getMoodLabel,
  getTodayDateString,
} from "../lib/checkinConstants";

export default function CheckinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const dateParam = searchParams.get("date");
  const todayStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getTodayDateString();
  const todayFormatted = (() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return formatIndonesianDate(new Date(y, m - 1, d));
  })();

  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingCheckin, setExistingCheckin] = useState(null);
  const [savedForDate, setSavedForDate] = useState(null);
  const [savedTimeLabel, setSavedTimeLabel] = useState("Baru saja");
  const showSavedSuccess = savedForDate === todayStr;
  const [recentCheckins, setRecentCheckins] = useState([]);

  // Form state matching daily_checkins schema
  const [onPeriod, setOnPeriod] = useState(false);
  const [periodIntensity, setPeriodIntensity] = useState("sedang");
  const [symptoms, setSymptoms] = useState([]);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [notes, setNotes] = useState("");
  const [voiceMeta, setVoiceMeta] = useState(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadTodayAndRecent() {
      setLoading(true);
      setError("");
      try {
        const { data, error: fetchErr } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", user.id)
          .order("checkin_date", { ascending: false })
          .limit(90);

        if (fetchErr) throw fetchErr;
        if (!active) return;

        const rows = data || [];
        setRecentCheckins(rows);

        const todayRow = rows.find((r) => r.checkin_date === todayStr);
        if (todayRow) {
          setExistingCheckin(todayRow);
          setOnPeriod(Boolean(todayRow.on_period));
          setPeriodIntensity(todayRow.period_intensity || "sedang");
          setSymptoms(todayRow.symptoms || []);
          setEnergy(todayRow.energy ?? 3);
          setMood(todayRow.mood ?? 4);
          setSleepHours(todayRow.sleep_hours != null ? Number(todayRow.sleep_hours) : 7.5);
          setNotes(location.state?.prefillNotes || todayRow.notes || "");
        } else {
          setExistingCheckin(null);
          setOnPeriod(false);
          setPeriodIntensity("sedang");
          setSymptoms([]);
          setEnergy(3);
          setMood(4);
          setSleepHours(7.5);
          setNotes(location.state?.prefillNotes || "");
        }
      } catch (err) {
        if (active) setError(err.message || "Gagal memuat data check-in.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTodayAndRecent();
    return () => {
      active = false;
    };
  }, [user, todayStr, location.state?.prefillNotes]);

  const toggleSymptom = (id) => {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const adjustSleep = (delta) => {
    setSleepHours((prev) => {
      const next = Math.round((prev + delta) * 2) / 2;
      return Math.max(0, Math.min(24, next));
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        user_id: user.id,
        checkin_date: todayStr,
        on_period: onPeriod,
        period_intensity: onPeriod ? periodIntensity : null,
        sleep_hours: sleepHours,
        energy,
        mood,
        symptoms,
        notes: notes.trim().slice(0, 500) || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: saveErr } = await supabase
        .from("daily_checkins")
        .upsert(payload, { onConflict: "user_id,checkin_date" })
        .select()
        .single();

      if (saveErr) throw saveErr;
      setExistingCheckin(data);
      setRecentCheckins((prev) => {
        const filtered = prev.filter((r) => r.checkin_date !== todayStr);
        return [data, ...filtered];
      });
      setSavedTimeLabel(
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(new Date())
      );
      setSavedForDate(todayStr);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Gagal menyimpan check-in harian. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const streak = calculateStreak(recentCheckins);
  const harmonyPct = Math.min(100, Math.max(55, 65 + streak * 5));

  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-primary">
        <span className="material-symbols-rounded animate-spin text-[36px]">
          progress_activity
        </span>
        <p className="font-label-md text-label-md text-on-surface-variant">
          Memuat jurnal check-in harianmu...
        </p>
      </div>
    );
  }

  // Matches Stitch Screen 38: PCOSmart - Check-in Berhasil Tersimpan
  if (showSavedSuccess) {
    const savedTime = savedTimeLabel;

    return (
      <div className="w-full flex items-center justify-center py-space-md sm:py-space-xl">
        <div className="w-full max-w-[640px] flex flex-col items-center">
          <div className="relative w-full flex flex-col items-center">
            <div className="absolute -top-12 w-72 h-72 rounded-full bg-primary-fixed-dim/20 blur-3xl pointer-events-none -z-10" />
            <div className="absolute -top-6 right-10 w-48 h-48 rounded-full bg-secondary-fixed/30 blur-2xl pointer-events-none -z-10" />

            {/* Main Success Card */}
            <div className="w-full bg-surface-container-lowest rounded-lg p-space-lg sm:p-space-xl shadow-[0_12px_36px_-6px_rgba(84,48,156,0.08),0_2px_12px_-2px_rgba(84,48,156,0.04)] flex flex-col items-center text-center">
              {/* Gentle Animated Emblem */}
              <div className="relative mb-space-lg">
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full bg-secondary-fixed/40 animate-ping opacity-30" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-surface-container to-surface-bright flex items-center justify-center shadow-sm">
                    <div className="relative flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-[40px] select-none fill-1">
                        eco
                      </span>
                      <div className="absolute -bottom-1 -right-2 w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px] fill-1">
                          favorite
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined absolute bottom-1 -left-2 text-secondary text-[16px] opacity-75">
                  verified
                </span>
              </div>

              {/* Privacy Badge */}
              <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-secondary-container/50 text-on-secondary-container mb-space-md">
                <span className="material-symbols-outlined text-[16px] fill-1">lock</span>
                <span className="font-label-sm text-label-sm tracking-wide">
                  Tersimpan dengan Aman • 100% Privat
                </span>
              </div>

              {/* Empathetic Headline */}
              <h1 className="font-headline-md text-headline-md text-on-surface mb-space-sm leading-snug tracking-tight max-w-[520px]">
                Terima kasih sudah meluangkan waktu untuk tubuhmu,{" "}
                {profile?.nickname || "Sahabat"}{" "}
                <span className="inline-block hover:rotate-12 transition-transform cursor-default">
                  ✨
                </span>
              </h1>

              {/* Body Text */}
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[540px] mb-space-xl leading-relaxed">
                Check-in harianmu untuk{" "}
                <strong className="text-on-surface font-semibold">{todayFormatted}</strong> telah
                tersimpan dengan aman. Memahami tubuh adalah perjalanan bertahap, dan kamu sudah
                mengambil langkah bermakna hari ini.
              </p>

              {/* Summary Snapshot Card */}
              <div className="w-full bg-surface-container rounded-lg p-space-md sm:p-space-lg mb-space-xl text-left relative overflow-hidden">
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[96px] text-primary/5 select-none pointer-events-none">
                  calendar_month
                </span>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      checklist_rtl
                    </span>
                    <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
                      Ringkasan Catatan Hari Ini
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest/80 px-2.5 py-1 rounded-full">
                    {savedTime} WIB
                  </span>
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm sm:gap-space-md">
                  <div className="bg-surface-container-lowest/90 rounded-DEFAULT p-space-sm flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
                      <span className="material-symbols-outlined text-[20px] fill-1">
                        water_drop
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Siklus Haid
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate capitalize">
                        {onPeriod ? periodIntensity : "Tidak Haid"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest/90 rounded-DEFAULT p-space-sm flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[20px] fill-1">healing</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Gejala Fisik
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                        {symptoms.length} Gejala
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest/90 rounded-DEFAULT p-space-sm flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                      <span className="material-symbols-outlined text-[20px] fill-1">bolt</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Tingkat Energi
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                        {energy} dari 5
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest/90 rounded-DEFAULT p-space-sm flex items-center gap-space-sm">
                    <div className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0">
                      <span className="material-symbols-outlined text-[20px] fill-1">
                        sentiment_satisfied
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        Kondisi Mood
                      </span>
                      <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                        {getMoodLabel(mood)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest/90 rounded-DEFAULT p-space-sm flex items-center gap-space-sm col-span-2">
                    <div className="w-9 h-9 rounded-full bg-primary-fixed-dim/60 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[20px] fill-1">bedtime</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Kualitas Tidur
                        </span>
                        <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                          {sleepHours.toFixed(1)} jam{" "}
                          {sleepHours >= 7 && sleepHours <= 9 ? "(Optimal)" : ""}
                        </span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full"
                          style={{ width: `${Math.min(100, (sleepHours / 9) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Symptoms Pill Tags */}
                {symptoms.length > 0 && (
                  <div className="mt-space-md pt-space-sm flex flex-wrap gap-1.5 items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant mr-1">
                      Gejala tercatat:
                    </span>
                    {symptoms.map((sym) => (
                      <span
                        key={sym}
                        className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm"
                      >
                        {SYMPTOM_LABELS[sym] || sym}
                      </span>
                    ))}
                  </div>
                )}

                {/* Transcribed / Written Journal Report Snapshot */}
                {notes && notes.trim() && (
                  <div className="mt-space-md pt-space-sm border-t border-surface-container-highest/60 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-[16px]">
                          {voiceMeta?.hasVoiceNote ? "graphic_eq" : "sticky_note_2"}
                        </span>
                        {voiceMeta?.hasVoiceNote
                          ? "Laporan Jurnal (Hasil Transkripsi Voice Note)"
                          : "Catatan Jurnal Harian"}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface italic bg-surface-container-lowest/90 p-3 rounded-xl">
                      “{notes.trim()}”
                    </p>
                  </div>
                )}
              </div>

              {/* Primary & Secondary CTA Actions */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-space-sm sm:gap-space-md mb-space-lg">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/chat", { state: { autoMode: "recommendation" } })
                  }
                  className="w-full sm:w-auto flex-1 h-12 sm:h-14 px-space-lg bg-primary hover:bg-primary-container text-on-primary rounded-full font-label-lg text-label-lg flex items-center justify-center gap-space-sm transition-all shadow-[0_4px_16px_rgba(108,74,182,0.24)] hover:shadow-[0_6px_20px_rgba(108,74,182,0.32)]"
                >
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                  <span>Lihat Rekomendasi Hari Ini (Asisten AI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto h-12 sm:h-14 px-space-lg bg-surface-container hover:bg-surface-container-high text-primary rounded-full font-label-lg text-label-lg flex items-center justify-center transition-colors"
                >
                  <span>Kembali ke Beranda</span>
                </button>
              </div>

              {/* Edit Check-in Secondary Link */}
              <div className="flex items-center justify-center gap-1 text-on-surface-variant font-body-sm text-body-sm mb-space-sm">
                <span>Ingin mengubah catatan?</span>
                <button
                  type="button"
                  onClick={() => setSavedForDate(null)}
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5 focus:outline-none"
                >
                  <span>Klik untuk edit check-in</span>
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </div>
            </div>

            {/* Soft Medical Disclaimer Footer */}
            <div className="w-full mt-space-md flex items-center justify-center gap-space-xs text-center px-space-md py-space-sm rounded-full bg-surface-container-low/80 text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">
                info
              </span>
              <p className="font-label-sm text-label-sm">
                PCOSmart bukan pengganti diagnosis medis dokter. Catatan ini dirancang untuk
                observasi gaya hidup mandiri.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Matches Stitch Screen 18 (Check-in Harian) & Screen 21 (Edit Mode)
  return (
    <div className="grid grid-cols-12 gap-space-lg items-start">
      {/* LEFT & CENTER AREA: Form Card (Columns 1-8) */}
      <div className="col-span-12 lg:col-span-8 flex flex-col items-center">
        <div className="w-full max-w-[640px] flex flex-col gap-space-lg">
          {/* Edit Mode Notification Banner if already filled today */}
          {existingCheckin && (
            <div className="bg-secondary-container/50 p-space-md rounded-lg flex items-start gap-space-md shadow-sm">
              <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px] fill-1">check_circle</span>
              </div>
              <div className="flex flex-col gap-space-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-secondary-container font-semibold">
                    Catatan Hari Ini Sudah Tersimpan
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-medium bg-surface-container-lowest/80 px-2 py-0.5 rounded-full">
                    Mode Edit Aktif
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Kamu sudah mengisi check-in hari ini. Kamu dapat memperbarui data kapan saja jika
                  ada perubahan sinyal tubuh.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error-container text-on-error-container p-space-md rounded-lg flex items-start gap-space-sm">
              <span className="material-symbols-rounded text-[20px] mt-0.5">error</span>
              <p className="font-body-sm text-body-sm font-medium">{error}</p>
            </div>
          )}

          <div className="w-full bg-surface-container-lowest rounded-lg p-4 sm:p-space-lg md:p-space-xl shadow-xl flex flex-col gap-space-md sm:gap-space-lg relative overflow-x-clip">
            {/* Ambient Decorative Gradient Blur */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-primary-fixed-dim/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -left-20 w-44 h-44 bg-secondary-fixed/40 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm relative z-10">
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  Jurnal Kesehatan Holistik
                </span>
                <h1 className="font-headline-sm sm:font-headline-md text-headline-sm sm:text-headline-md text-on-surface mt-1">
                  {todayFormatted}
                </h1>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-sm sm:font-label-md text-label-sm sm:text-label-md shrink-0">
                <span className="material-symbols-outlined text-[16px]">
                  {existingCheckin ? "edit" : "edit_calendar"}
                </span>
                {existingCheckin ? "Sunting Catatan" : "Catatan Harian"}
              </span>
            </div>

            {/* Section 1: Siklus & Haid */}
            <div className="bg-surface-container-low rounded-lg p-space-md sm:p-space-lg flex flex-col gap-space-md relative z-10 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-rounded text-[20px]">water_drop</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Sedang haid hari ini?
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Lacak fase menstruasi secara cermat
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={onPeriod}
                  onClick={() => setOnPeriod((v) => !v)}
                  className={`w-14 h-8 rounded-full p-1 transition-colors relative focus:outline-none shadow-sm cursor-pointer ${onPeriod ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-surface-container-lowest transition-transform shadow-md flex items-center justify-center ${onPeriod ? "translate-x-6" : "translate-x-0"
                      }`}
                  >
                    {onPeriod && (
                      <span className="material-symbols-outlined text-primary text-[14px]">
                        check
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Segmented Control Intensitas */}
              <div
                className={`flex flex-col gap-space-xs pt-space-xs transition-opacity duration-300 ${onPeriod ? "opacity-100" : "opacity-40 pointer-events-none"
                  }`}
              >
                <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  Intensitas Aliran Darah
                </label>
                <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-1.5 rounded-full shadow-sm">
                  {FLOW_OPTIONS.map((flow) => {
                    const active = periodIntensity === flow.value;
                    return (
                      <button
                        key={flow.value}
                        type="button"
                        onClick={() => setPeriodIntensity(flow.value)}
                        className={`py-2 px-3 rounded-full font-label-md text-label-md transition-all text-center ${active
                            ? "bg-primary-container text-on-primary font-bold shadow-sm"
                            : "text-on-surface-variant hover:text-primary"
                          }`}
                      >
                        {flow.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Gejala */}
            <div className="flex flex-col gap-space-sm relative z-10">
              <div className="flex items-center justify-between">
                <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    healing
                  </span>
                  Gejala yang Dirasakan Hari Ini
                </label>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {symptoms.length} gejala dipilih
                </span>
              </div>

              {/* Multi-select chips */}
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((sym) => {
                  const selected = symptoms.includes(sym.id);
                  return (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => toggleSymptom(sym.id)}
                      className={`group flex items-center gap-1.5 px-4 py-1.5 h-9 rounded-full font-label-md text-label-md transition-all cursor-pointer ${selected
                          ? "bg-primary-container/15 text-primary font-semibold shadow-sm"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                    >
                      {selected && (
                        <span className="material-symbols-rounded text-[16px] text-primary">
                          check_circle
                        </span>
                      )}
                      <span>{sym.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Tingkat Energi (5-step) */}
            <div className="flex flex-col gap-space-sm relative z-10">
              <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">bolt</span>
                Tingkat Energi
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {ENERGY_STEPS.map((item) => {
                  const active = energy === item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setEnergy(item.step)}
                      className={`flex flex-col items-center justify-center px-1 py-2 sm:p-3 rounded-xl transition-all text-center min-h-[68px] ${active
                          ? "bg-primary-container text-on-primary font-bold shadow-md scale-[1.02]"
                          : "bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant"
                        }`}
                    >
                      <span
                        className={`material-symbols-rounded text-[20px] sm:text-[24px] ${active ? "text-on-primary" : "text-outline"
                          }`}
                      >
                        bolt
                      </span>
                      <span
                        className={`text-[10px] sm:text-label-sm mt-1 leading-tight break-words w-full line-clamp-2 ${active ? "text-on-primary font-bold" : "text-on-surface-variant"
                          }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Suasana Hati (Mood) (5-step) */}
            <div className="flex flex-col gap-space-sm relative z-10">
              <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  sentiment_satisfied
                </span>
                Suasana Hati (Mood)
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {MOOD_STEPS.map((item) => {
                  const active = mood === item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setMood(item.step)}
                      className={`flex flex-col items-center justify-center px-1 py-2 sm:p-3 rounded-xl transition-all text-center min-h-[68px] ${active
                          ? "bg-secondary-container text-on-secondary-container font-bold shadow-md scale-[1.02]"
                          : "bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant"
                        }`}
                    >
                      <span
                        className={`material-symbols-rounded text-[20px] sm:text-[24px] ${active ? "text-on-secondary-container fill-1" : item.color
                          }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`text-[10px] sm:text-label-sm mt-1 leading-tight break-words w-full line-clamp-2 ${active
                            ? "text-on-secondary-container font-bold"
                            : "text-on-surface-variant"
                          }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Jam Tidur Semalam */}
            <div className="bg-surface-container-low rounded-lg p-space-md sm:p-space-lg flex flex-col gap-space-sm relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[20px]">bedtime</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Jam Tidur Semalam
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Kualitas istirahat memulihkan sensitivitas insulin
                    </span>
                  </div>
                </div>

                {/* Stepper controls */}
                <div className="flex items-center gap-2 bg-surface-container-lowest px-2 py-1 rounded-full shadow-sm">
                  <button
                    type="button"
                    onClick={() => adjustSleep(-0.5)}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="font-headline-sm text-headline-sm text-primary font-bold w-20 text-center">
                    {sleepHours.toFixed(1)} jam
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustSleep(0.5)}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Cukup istirahat membantu regenerasi hormon dan menstabilkan kortisol harian.
              </p>
            </div>

            {/* Section 6: Catatan Pribadi & Voice Recorder Journaling */}
            <div className="flex flex-col gap-space-sm relative z-10">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="catatan-input"
                  className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-rounded text-primary text-[20px]">
                    sticky_note_2
                  </span>
                  Catatan & Jurnal Suara Harian (Opsional)
                </label>
                <span className="font-label-sm text-label-sm text-outline">
                  {notes.length} / 500 karakter
                </span>
              </div>

              {/* Voice Recorder & Speech-to-Text Transcriber */}
              <VoiceJournalRecorder
                key={todayStr}
                value={notes}
                onChange={setNotes}
                maxLength={500}
                onVoiceMetaChange={setVoiceMeta}
              />

              <div className="relative bg-surface-container-low rounded-lg p-space-md focus-within:ring-2 focus-within:ring-primary transition-all">
                <textarea
                  id="catatan-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Tuliskan atau gunakan tombol 'Mulai Rekam Suara' di atas untuk mentranskrip voice note menjadi teks laporan harianmu..."
                  className="w-full bg-transparent border-0 outline-none resize-none text-body-md font-body-md text-on-surface placeholder:text-outline"
                />
              </div>
            </div>

            {/* Action Buttons (Sticky bottom CTA bar on mobile stack mode) */}
            <div className="sticky bottom-0 lg:static z-30 bg-surface-container-lowest/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none -mx-4 sm:-mx-space-lg md:-mx-space-xl px-4 sm:px-space-lg md:px-space-xl lg:mx-0 lg:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] lg:py-0 border-t border-surface-container-highest/50 lg:border-0 flex flex-col sm:flex-row items-center gap-space-sm sm:gap-space-md">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:flex-1 h-12 sm:h-11 bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg rounded-full flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-rounded text-[20px]">
                  {existingCheckin ? "save" : "check"}
                </span>
                <span>
                  {saving
                    ? "Menyimpan..."
                    : existingCheckin
                      ? "Perbarui Check-in"
                      : "Simpan Check-in Hari Ini"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto px-6 h-11 rounded-full font-label-lg text-label-lg text-primary hover:bg-surface-container transition-all cursor-pointer"
              >
                Batal / Kembali
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL: Live Summary Panel (Columns 9-12) */}
      <div className="col-span-12 lg:col-span-4 sticky top-24">
        <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-xl flex flex-col gap-space-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-rounded text-[20px]">analytics</span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                  Live Summary
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Pratinjau Catatanmu
                </h2>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
          </div>

          <div className="flex flex-col gap-space-sm">
            <div className="p-space-md rounded-xl bg-surface-container-low flex items-center gap-space-sm transition-all hover:bg-surface-container">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
                <span className="material-symbols-rounded text-[20px]">calendar_month</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Status Haid
                </span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate capitalize">
                  {onPeriod
                    ? `Haid Aktif (Intensitas ${periodIntensity})`
                    : "Tidak Sedang Haid"}
                </span>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1.5 transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-primary text-[18px]">healing</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Gejala Terdeteksi
                  </span>
                </div>
                <span className="font-label-sm text-label-sm font-bold text-primary bg-primary-container/20 px-2 py-0.5 rounded-full">
                  {symptoms.length} Dipilih
                </span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {symptoms.length === 0 ? (
                  <span className="font-label-sm text-label-sm text-outline italic">
                    Tidak ada gejala dirasakan
                  </span>
                ) : (
                  symptoms.map((sym) => (
                    <span
                      key={sym}
                      className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm"
                    >
                      {SYMPTOM_LABELS[sym] || sym}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Energi</span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">
                  {energy}
                  <span className="text-body-sm font-normal text-outline">/5</span>
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-medium truncate w-full">
                  {getEnergyLabel(energy)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Mood</span>
                <span className="font-headline-sm text-headline-sm text-secondary font-bold mt-0.5">
                  {mood}
                  <span className="text-body-sm font-normal text-outline">/5</span>
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-medium truncate w-full">
                  {getMoodLabel(mood)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tidur</span>
                <span className="font-headline-sm text-headline-sm text-tertiary-container font-bold mt-0.5">
                  {sleepHours.toFixed(1)}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-medium">Jam</span>
              </div>
            </div>

            {/* Live Journal / Voice Note Preview in Right Panel */}
            {notes && notes.trim() && (
              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1.5 border border-primary-fixed/60">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1.5">
                    <span className="material-symbols-rounded text-[16px]">
                      {voiceMeta?.hasVoiceNote ? "mic" : "notes"}
                    </span>
                    {voiceMeta?.hasVoiceNote
                      ? "Transkrip Voice Note"
                      : "Catatan Jurnal"}
                  </span>
                  {voiceMeta?.hasVoiceNote && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                      Suara → Teks
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant italic line-clamp-3">
                  “{notes.trim()}”
                </p>
              </div>
            )}
          </div>

          <div className="bg-surface-container-high/60 rounded-xl p-space-md flex items-center gap-space-md">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-surface-container-highest"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-secondary transition-all duration-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${harmonyPct}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <span className="absolute font-label-md text-label-md font-bold text-on-surface">
                {harmonyPct}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-bold">
                Keseimbangan Siklus
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Konsistensi pencatatan kamu mencapai {streak} hari beruntun! Pertahankan
                ritmemu.
              </span>
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl p-space-md flex items-start gap-space-sm">
            <span className="material-symbols-rounded text-primary text-[22px] mt-0.5 shrink-0">
              spa
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant italic leading-relaxed">
              “Setiap data yang kamu catat adalah bentuk kepedulian terhadap tubuhmu sendiri.”
            </p>
          </div>

          <div className="w-full h-28 rounded-xl overflow-hidden relative shadow-sm">
            <img
              className="w-full h-full object-cover"
              alt="Teh herbal dan jurnal tenang"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM_f2U7AmomJL3HqW1GUO6qmmwpJR6hIP3z1a76CYfr12EG3FOnXle-aaoDSheeNbHeJ6VD3G7qaXi8c7E9oB-MvPqA3QmiTFfhZLcP88VkUdX9UkMgmFZXmP7a3GYnCD4WBvH8ahMeM_0lo0MacLHE1VklhKEN5LVzHjY6BiihiiDH5bj3DYvYdcM8kY4qVrkhqyWxWGHOtQuLB7AiY0G_N_MKGe8GQzoLkO8BThj"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/60 via-transparent to-transparent flex items-end p-3">
              <span className="font-label-sm text-label-sm text-on-primary font-medium flex items-center gap-1.5">
                <span className="material-symbols-rounded text-[16px]">favorite</span>
                Dengarkan sinyal tubuhmu setiap hari
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
