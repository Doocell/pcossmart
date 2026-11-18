import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";

const ENERGY_OPTIONS = [
  { val: "Lelah", emoji: "😴", label: "Lelah" },
  { val: "Cukup", emoji: "🌸", label: "Cukup" },
  { val: "Bugar", emoji: "✨", label: "Bugar" },
];

const AFFIRMATIONS = [
  "Tubuhku berhak mendapatkan ketenangan.",
  "Kemajuan kecil setiap hari adalah sebuah kemenangan.",
  "Siklusku adalah ritme alamiku, bukan kegagalan.",
  "Hari ini aku memilih bernapas perlahan dan penuh kasih.",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedEnergy, setSelectedEnergy] = useState("Cukup");
  const [affirmationIdx, setAffirmationIdx] = useState(0);

  return (
    <PublicLayout>
      <div className="flex flex-col w-full">
        <div className="relative w-full max-w-[1240px] mx-auto lg:min-h-[760px] flex items-center justify-center p-0 sm:p-2 lg:p-6">
          {/* Ambient Organic Background Blooms */}
          <div className="absolute -top-16 -left-16 w-96 h-96 bg-primary-fixed/35 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute -bottom-20 right-4 w-[420px] h-[420px] bg-secondary-container/40 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-surface-container-high/60 rounded-full blur-2xl pointer-events-none -z-10" />

          {/* Main Split Layout Container */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
            {/* LEFT PANEL: Soft Warm Supportive Illustration & Value Canvas */}
            <div className="lg:col-span-7 bg-surface-container rounded-lg p-5 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden shadow-sm">
              {/* Subtle Ambient Gradient Layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high opacity-80 pointer-events-none" />

              {/* Upper Content: Header, Overline, Main Title */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest shadow-sm mb-4 sm:mb-6">
                  <span className="material-symbols-outlined text-[16px] text-secondary fill-1">
                    favorite
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
                    Ruang Nyaman & Terpercaya
                  </span>
                </div>

                <h1 className="font-headline-lg-mobile sm:font-headline-lg lg:font-display-lg text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg text-on-surface tracking-tight leading-tight mb-3 sm:mb-4">
                  Pahami tubuhmu, <br />
                  <span className="text-primary font-bold">satu hari satu catatan.</span>
                </h1>

                <p className="font-body-sm sm:font-body-lg text-body-sm sm:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                  Perjalanan PCOS bukan perlombaan, melainkan proses penuh welas asih. Bersama
                  PCOSmart, dengarkan setiap bahasa lembut tubuhmu, peluk ritme alamimu, dan temukan
                  harmoni keseharian tanpa rasa cemas.
                </p>
              </div>

              {/* Middle Visual: Soft Editorial Lifestyle Snapshot + Organic Rhythm Wave */}
              <div className="relative z-10 my-5 sm:my-8">
                <div className="relative rounded-lg overflow-hidden bg-surface-container-lowest p-2.5 sm:p-3 shadow-md max-w-lg">
                  <div className="relative h-36 sm:h-44 rounded-DEFAULT overflow-hidden">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      alt="Wanita mencatat jurnal kesehatan dengan tenang"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9htJVvW3x27i0jA0FkLrE3OgW5h0rZp_vhSCyJKeJVOfFd5GhNnEx0_QWHpphIZXj3V4Cz_n-KYVBOCD6bYWGQDsFNMKi3o0yAP2ilZuzXrM0ImAD7LdI5fwN_azLR8KEErtr-xt954VhCffoYEY2Y-_n5DLHLGifassJaIt5SN7D57KpNoeyiH-b3q3R1ql4lnk5pp1HkvQPJRpKQZDeQvF2onIRvZvMahU2jUWI"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/60 via-transparent to-transparent" />

                    {/* Floating Pill Indicator Inside Photo */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim animate-pulse" />
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                        Siklus Luteal • Hari ke-19
                      </span>
                    </div>

                    {/* Quick Hydration / Calming Rhythm Metric SVG */}
                    <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm">
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <span className="font-label-sm text-label-sm text-primary font-semibold">
                        Ritme Stabil
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Pillars: 3 Supportive Benefits */}
              <div className="relative z-10 flex flex-col gap-3.5">
                <div className="group flex items-start gap-4 p-3.5 rounded-DEFAULT bg-surface-container-lowest/90 hover:bg-surface-container-lowest transition-all shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px] fill-1">
                      calendar_month
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Catatan & Check-in Harian
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug mt-0.5">
                      Kenali sinyal hormonal dan siklusmu setiap hari dengan mudah lewat antarmuka
                      intuitif.
                    </p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 p-3.5 rounded-DEFAULT bg-surface-container-lowest/90 hover:bg-surface-container-lowest transition-all shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px] fill-1">forum</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Asisten AI Empatis
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug mt-0.5">
                      Ruang dengar dan tanya jawab hangat tanpa penghakiman yang siap merespons kapan
                      pun.
                    </p>
                  </div>
                </div>

                <div className="group flex items-start gap-4 p-3.5 rounded-DEFAULT bg-surface-container-lowest/90 hover:bg-surface-container-lowest transition-all shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[20px] fill-1">nutrition</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Edukasi Berbasis Sains
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug mt-0.5">
                      Panduan nutrisi ramah resistensi insulin dan gaya hidup seimbang yang mudah
                      dipraktikkan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Clean Auth Welcome Card */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-lg p-5 sm:p-8 lg:p-10 shadow-md flex flex-col justify-between relative transition-shadow hover:shadow-lg">
                <div>
                  {/* Top Branding Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-[24px]">spa</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">
                          PCOSmart
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Sahabat Kesehatan Reproduksi
                        </span>
                      </div>
                    </div>

                    {/* Soft Pill Badge */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Teman Sehat Hormonal
                    </span>
                  </div>

                  {/* Card Headline & Subheadline */}
                  <div className="mb-6 sm:mb-8">
                    <h2 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-on-surface font-bold tracking-tight mb-2">
                      Mulai Hari Ini dengan Ketenangan
                    </h2>
                    <p className="font-body-sm sm:font-body-md text-body-sm sm:text-body-md text-on-surface-variant leading-relaxed">
                      Pantau kesehatan hormonal dan dapatkan rekomendasi harian yang dipersonalisasi
                      sesuai fase unikmu.
                    </p>
                  </div>

                  {/* Interactive Affirmation Touchpoint (Stitch Mobile) */}
                  <button
                    type="button"
                    onClick={() => setAffirmationIdx((i) => (i + 1) % AFFIRMATIONS.length)}
                    className="w-full mb-5 p-3 rounded-full bg-surface-container-high hover:bg-surface-variant flex items-center justify-center gap-2 text-center text-primary active:scale-[0.98] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      temp_preferences_custom
                    </span>
                    <span className="font-label-sm text-label-sm font-medium leading-snug">
                      &ldquo;{AFFIRMATIONS[affirmationIdx]}&rdquo;
                    </span>
                  </button>

                  {/* Quick Mood / Energy Preview Selector (Micro-interaction) */}
                  <div className="mb-6 sm:mb-8 p-4 rounded-DEFAULT bg-surface-container-low">
                    <label className="block font-label-md text-label-md text-on-surface font-semibold mb-2.5">
                      Bagaimana energi tubuhmu pagi ini?
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      {ENERGY_OPTIONS.map((opt) => {
                        const active = selectedEnergy === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setSelectedEnergy(opt.val)}
                            className={`flex-1 py-2 px-1 rounded-full font-label-sm text-label-sm transition-all flex items-center justify-center gap-1 ${active
                                ? "bg-primary text-on-primary font-semibold shadow-sm"
                                : "bg-surface-container-lowest text-on-surface-variant hover:text-primary"
                              }`}
                          >
                            <span>{opt.emoji}</span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary & Secondary Auth Action Buttons */}
                  <div className="flex flex-col gap-3.5 mb-6">
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="w-full h-12 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-sm group active:scale-[0.99]"
                    >
                      <span>Daftar</span>
                      <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="w-full h-12 rounded-full bg-surface-container-low text-primary hover:bg-surface-container font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                      <span>Masuk</span>
                    </button>
                  </div>

                  {/* Alternative Quick Social / Google Access */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="h-px bg-surface-container-highest flex-1" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant px-2">
                      atau lanjutkan dengan
                    </span>
                    <span className="h-px bg-surface-container-highest flex-1" />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full h-11 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-2.5 transition-colors mb-6"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Akun Google</span>
                  </button>
                </div>

                {/* Bottom Soft Friendly Medical Disclaimer Banner */}
                <div className="p-3.5 rounded-DEFAULT bg-surface-container flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary flex-shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                    <span className="font-semibold text-secondary">Catatan Medis:</span> PCOSmart
                    bukan alat diagnosis medis. Dirancang sebagai pendamping mandiri untuk memahami
                    pola tubuhmu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
