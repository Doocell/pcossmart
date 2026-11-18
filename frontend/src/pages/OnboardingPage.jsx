import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { useAuth } from "../contexts/AuthContext";

const AGE_OPTIONS = [
  {
    value: "15-17",
    label: "15 – 17",
    icon: "school",
    desc: "Masa remaja & adaptasi pubertas awal.",
    recommended: false,
  },
  {
    value: "18-24",
    label: "18 – 24",
    icon: "psychology_alt",
    desc: "Dewasa muda, masa kuliah & adaptasi karier awal.",
    recommended: true,
  },
  {
    value: "25-34",
    label: "25 – 34",
    icon: "vital_signs",
    desc: "Fase produktif & perencanaan fertilitas atau karier.",
    recommended: false,
  },
  {
    value: "35-44",
    label: "35 – 44",
    icon: "favorite",
    desc: "Transisi hormonal & pemeliharaan kesehatan jangka panjang.",
    recommended: false,
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, saveOnboardingProfile, signOut } = useAuth();

  const [step, setStep] = useState(1);
  const resolvedNick = (
    profile?.nickname ||
    user?.user_metadata?.nickname ||
    user?.user_metadata?.given_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    ""
  )
    .trim()
    .slice(0, 30);
  const [nicknameOverride, setNicknameOverride] = useState(null);
  const nickname =
    nicknameOverride !== null
      ? nicknameOverride
      : resolvedNick.length >= 2
      ? resolvedNick
      : "Sahabat";
  const setNickname = (val) => {
    setNicknameOverride(val);
  };
  const [ageRange, setAgeRange] = useState(profile?.age_range || "18-24");
  const [consentChecked, setConsentChecked] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNextStep = () => {
    setError("");
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nama panggilan harus terdiri dari 2 hingga 30 karakter.");
      return;
    }
    if (!ageRange) {
      setError("Silakan pilih rentang usiamu terlebih dahulu.");
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    setError("");
    if (!consentChecked) {
      setError("Silakan setujui pemrosesan data untuk melanjutkan.");
      return;
    }

    setSaving(true);
    try {
      await saveOnboardingProfile({
        nickname: nickname.trim(),
        age_range: ageRange,
        consent_at: new Date().toISOString(),
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Gagal menyimpan profil onboarding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PublicLayout>
      {step === 1 ? (
        <div className="flex flex-col w-full items-center justify-center">
          <div className="w-full max-w-[820px] relative">
            <div className="absolute -top-12 -left-10 w-72 h-72 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute -bottom-10 -right-8 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Main Stepper Card */}
            <div className="w-full bg-surface-container-lowest rounded-lg p-5 sm:p-8 lg:p-12 shadow-[0_16px_40px_-8px_rgba(108,74,182,0.08),0_4px_16px_-2px_rgba(108,74,182,0.03)] flex flex-col transition-all">
              {/* Stepper Header Section */}
              <div className="flex flex-col gap-space-sm mb-space-lg">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-space-xs px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-md text-label-md">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>Langkah 1 dari 2: Profil Dasar</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    50% Selesai
                  </span>
                </div>

                {/* Pill Progress Bar */}
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div className="h-full w-1/2 bg-primary rounded-full transition-all duration-500 ease-out" />
                </div>

                {/* Step Descriptions Track */}
                <div className="flex items-center justify-between mt-1 text-on-surface-variant">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-primary font-semibold">
                    <span className="material-symbols-outlined text-[15px] fill-1">
                      check_circle
                    </span>
                    <span>1. Rentang Usia (Aktif)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
                    <span className="material-symbols-outlined text-[15px]">
                      radio_button_unchecked
                    </span>
                    <span>2. Persetujuan Privasi</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-space-md p-3.5 rounded-DEFAULT bg-error-container text-on-error-container font-body-sm font-medium">
                  {error}
                </div>
              )}

              {/* Heading & Empathetic Context */}
              <div className="flex flex-col gap-space-xs mb-space-md sm:mb-space-lg">
                <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight">
                  Berapa usiamu saat ini?
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                  Pola hormon dan gejala PCOS bervariasi di setiap fase kehidupan. Informasi ini
                  membantu kami menyesuaikan rekomendasi harian, ritme metabolisme, dan panduan AI
                  secara tepat.
                </p>
              </div>

              {/* Optional Nickname Input if not set */}
              <div className="mb-space-lg">
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Nama Panggilanmu
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={30}
                  placeholder="Misal: Nadia (2-30 karakter)"
                  className="w-full sm:max-w-xs h-11 px-4 rounded-full bg-surface-container-low border border-outline-variant/40 text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Selectable Age Cards: 4 in a row */}
              <fieldset aria-label="Pilih kelompok rentang usia" className="w-full mb-space-lg">
                <legend className="sr-only">Rentang Usia</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                  {AGE_OPTIONS.map((opt) => {
                    const isChecked = ageRange === opt.value;
                    return (
                      <label
                        key={opt.value}
                        onClick={() => setAgeRange(opt.value)}
                        className={`group relative flex flex-col justify-between p-4 sm:p-space-md rounded-2xl transition-all duration-200 cursor-pointer text-left min-h-[128px] sm:min-h-[200px] ${
                          isChecked
                            ? "bg-surface-container shadow-sm ring-2 ring-primary/30"
                            : "bg-surface-container-low hover:bg-surface-container"
                        }`}
                      >
                        <input
                          type="radio"
                          name="age_range"
                          value={opt.value}
                          checked={isChecked}
                          onChange={() => setAgeRange(opt.value)}
                          className="sr-only"
                        />
                        {opt.recommended && (
                          <div className="absolute -top-2.5 right-3 bg-secondary text-on-secondary px-2.5 py-0.5 rounded-full font-label-sm text-label-sm shadow-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] fill-1">
                              star
                            </span>
                            <span>Terbanyak</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between w-full">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-primary group-hover:scale-105 transition-transform ${
                                isChecked ? "bg-primary-fixed" : "bg-surface-container-highest"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {opt.icon}
                              </span>
                            </span>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                isChecked
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "bg-surface-container-highest text-transparent"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </div>
                          </div>
                          <span className="font-headline-sm text-headline-sm text-on-surface mt-2 font-bold tracking-tight">
                            {opt.label}
                          </span>
                          <span className="font-label-sm text-label-sm text-primary font-semibold">
                            Tahun
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-3 leading-snug">
                          {opt.desc}
                        </p>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Privacy Reassurance Banner */}
              <div className="flex items-center gap-space-sm px-space-md py-3 rounded-2xl bg-surface-container text-on-surface-variant mb-space-xl">
                <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 fill-1">
                  verified_user
                </span>
                <p className="font-label-sm text-label-sm leading-normal">
                  <strong className="font-semibold text-on-surface">Data Terenkripsi:</strong>{" "}
                  Informasi usia dijaga secara anonim & terlindungi untuk kebutuhan personalisasi
                  saja tanpa disebarluaskan.
                </p>
              </div>

              {/* Action Footer Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-space-md pt-space-xs">
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full sm:w-auto font-label-lg text-label-lg text-on-surface-variant hover:text-primary py-3 px-space-md rounded-full hover:bg-surface-container transition-colors text-center"
                >
                  Keluar akun
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-8 py-3.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Lanjutkan</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full items-center justify-center py-space-sm sm:py-space-md">
          <div className="relative w-full max-w-[760px]">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute -bottom-16 -right-12 w-72 h-72 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Main Stepper Card */}
            <section className="w-full bg-surface-container-lowest rounded-lg shadow-[0_12px_36px_-6px_rgba(108,74,182,0.09),0_3px_10px_-2px_rgba(108,74,182,0.04)] p-5 sm:p-8 lg:p-12 transition-all">
              {/* Stepper Top Bar */}
              <div className="flex flex-col gap-space-sm mb-space-lg">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-label-md text-label-md text-primary font-semibold">
                      Langkah 2 dari 2: Persetujuan Privasi
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-label-md text-label-md text-secondary font-semibold">
                    <span className="material-symbols-outlined text-[18px] fill-1">verified</span>
                    <span>100% Siap Mulai</span>
                  </div>
                </div>

                {/* Progress Track (100% Complete) */}
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden p-0.5">
                  <div className="h-full bg-secondary rounded-full w-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,106,96,0.3)]" />
                </div>
              </div>

              {error && (
                <div className="mb-space-md p-3.5 rounded-DEFAULT bg-error-container text-on-error-container font-body-sm font-medium">
                  {error}
                </div>
              )}

              {/* Center Shield & Main Header */}
              <div className="text-center flex flex-col items-center mb-space-lg">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary mb-space-md shadow-sm">
                  <span className="material-symbols-outlined text-[34px] fill-1">
                    verified_user
                  </span>
                </div>
                <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight max-w-xl text-center leading-snug">
                  Privasi & Keamanan Datamu Adalah Prioritas Utama
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mt-space-xs text-center">
                  Kenyamanan perjalanan hormonalmu dimulai dari rasa aman. Kami menjaga setiap
                  catatan dengan penuh empati dan perlindungan menyeluruh.
                </p>
              </div>

              {/* 3 Privacy Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm mb-space-lg">
                <div className="bg-surface-container-low hover:bg-surface-container transition-colors p-space-md rounded-DEFAULT flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-1">
                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                  </div>
                  <h2 className="font-label-lg text-label-lg text-on-surface">
                    Tersimpan Aman & Terenkripsi
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Catatan gejala, siklus, dan suasana hatimu dilindungi menggunakan protokol
                    enkripsi standar industri medis termutakhir.
                  </p>
                </div>

                <div className="bg-surface-container-low hover:bg-surface-container transition-colors p-space-md rounded-DEFAULT flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary mb-1">
                    <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                  </div>
                  <h2 className="font-label-lg text-label-lg text-on-surface">
                    Hanya Kamu yang Mengakses
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Kami tidak pernah menjual, menyewakan, atau membagikan riwayat kesehatan
                    personalmu kepada pihak ketiga manapun.
                  </p>
                </div>

                <div className="bg-surface-container-low hover:bg-surface-container transition-colors p-space-md rounded-DEFAULT flex flex-col gap-space-xs">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-container mb-1">
                    <span className="material-symbols-outlined text-[20px]">tune</span>
                  </div>
                  <h2 className="font-label-lg text-label-lg text-on-surface">
                    Kendali Penuh di Tanganmu
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Kamu memiliki hak mutlak untuk mengunduh salinan berkas atau menghapus akun
                    beserta seluruh data tersimpan kapan saja.
                  </p>
                </div>
              </div>

              {/* Non-Diagnosis Disclaimer Banner */}
              <div className="bg-surface-container rounded-DEFAULT p-space-md flex items-start gap-space-sm mb-space-lg">
                <span className="material-symbols-outlined text-secondary shrink-0 text-[22px] mt-0.5 fill-1">
                  info
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">
                    Catatan Penting Penggunaan
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5">
                    PCOSmart adalah pendamping pencatatan mandiri dan edukasi gaya hidup sehat,
                    bukan pengganti diagnosis medis resmi. Konsultasikan selalu keluhan utama ke
                    dokter spesialis obstetri dan ginekologi (Sp.OG).
                  </p>
                </div>
              </div>

              {/* Required Interactive Checkbox Section */}
              <div className="bg-surface-container-low/70 rounded-DEFAULT p-space-md mb-space-xl">
                <label
                  htmlFor="consent-agreement"
                  className="group flex items-start sm:items-center gap-space-sm cursor-pointer select-none"
                >
                  <div className="relative flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <input
                      id="consent-agreement"
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105 ${
                        consentChecked
                          ? "bg-primary-container text-on-primary"
                          : "bg-surface-container-highest text-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] font-bold">check</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold group-hover:text-primary transition-colors">
                      Aku setuju data kesehatanku diproses untuk fitur PCOSmart
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Diperlukan untuk memproses kalender siklus dan rekomendasi ritme nutrisi
                      personal.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-space-md pt-space-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-full text-on-surface-variant font-label-lg text-label-lg hover:text-primary hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={!consentChecked || saving}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-space-sm px-space-xl py-3.5 rounded-full text-on-primary font-label-lg text-label-lg shadow-md transition-all ${
                    !consentChecked || saving
                      ? "bg-primary-container opacity-40 cursor-not-allowed"
                      : "bg-primary-container hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                      <span>Mempersiapkan Dashboard...</span>
                    </>
                  ) : (
                    <>
                      <span>Mulai Perjalanan Seimbangmu</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>

              {/* Compliance Footnote */}
              <div className="mt-space-lg text-center">
                <div className="inline-flex items-center justify-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant opacity-80">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  <span>
                    Standar Privasi Sesuai Regulasi Perlindungan Data Pribadi (UU PDP Republik
                    Indonesia)
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
