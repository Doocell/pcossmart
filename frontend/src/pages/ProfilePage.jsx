import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const PROFILE_TABS = [
  {
    id: "profil",
    label: "Profil Saya",
    subtitle: "Identitas & Siklus Menstruasi",
    icon: "person",
  },
  {
    id: "privasi",
    label: "Data & Privasi",
    subtitle: "Penyimpanan & Ekspor Rekam Medis",
    icon: "shield_lock",
  },
  {
    id: "tentang",
    label: "Tentang PCOSmart",
    subtitle: "Etika, Tim & Regulasi",
    icon: "info",
  },
];

function getInitials(name = "Nadia") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatJoinDate(isoString) {
  if (!isoString) return "12 Agustus 2024";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return "12 Agustus 2024";
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, updateProfileNickname, signOut, deleteAccount } =
    useAuth();

  const tabParam = searchParams.get("tab") || "profil";
  const activeTab = ["profil", "privasi", "tentang"].includes(tabParam)
    ? tabParam
    : "profil";

  const currentNickname =
    profile?.nickname || user?.user_metadata?.nickname || "Sahabat";
  const currentAgeRange = profile?.age_range || "18-24";
  const currentEmail = user?.email || "Akun PCOSmart Aktif";

  // Nickname edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Data & Privacy stats & export state
  const [checkinsCount, setCheckinsCount] = useState(0);
  const [chatsCount, setChatsCount] = useState(0);
  const [downloadingData, setDownloadingData] = useState(false);
  const [downloadToastVisible, setDownloadToastVisible] = useState(false);

  // Modals state (Stitch Screen 71ec659c01504adeb4950eb6a662bdb5)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadUserCounts() {
      const targetUserId = user?.id || profile?.id;
      if (!targetUserId) return;
      try {
        const [{ data: checkinRows }, { data: chatRows }] = await Promise.all([
          supabase
            .from("daily_checkins")
            .select("id")
            .eq("user_id", targetUserId),
          supabase
            .from("chat_messages")
            .select("id")
            .eq("user_id", targetUserId),
        ]);
        if (!active) return;
        setCheckinsCount((checkinRows || []).length);
        setChatsCount((chatRows || []).length);
      } catch {
        // ignore count error
      }
    }
    loadUserCounts();
    return () => {
      active = false;
    };
  }, [user?.id, profile?.id]);

  useEffect(() => {
    if (!deleteModalOpen && !logoutModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDeleteModalOpen(false);
        setLogoutModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteModalOpen, logoutModalOpen]);

  const setTab = (tabId) => {
    setSearchParams(tabId === "profil" ? {} : { tab: tabId }, { replace: true });
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  const handleSaveNickname = async (e) => {
    if (e) e.preventDefault();
    const clean = nicknameInput.trim();
    if (clean.length < 2 || clean.length > 30) {
      setNameError("Nama panggilan wajib 2 hingga 30 karakter.");
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      await updateProfileNickname(clean);
      setIsEditingName(false);
      triggerToast("Perubahan nama panggilan berhasil disimpan.");
    } catch (err) {
      setNameError(err.message || "Gagal menyimpan perubahan nama panggilan.");
    } finally {
      setSavingName(false);
    }
  };

  const handleDownloadData = async () => {
    setDownloadingData(true);
    try {
      const targetUserId = user?.id || profile?.id;
      if (!targetUserId) {
        triggerToast("Sesi pengguna tidak ditemukan.");
        return;
      }
      const [{ data: checkinRows }, { data: chatRows }] = await Promise.all([
        supabase
          .from("daily_checkins")
          .select("*")
          .eq("user_id", targetUserId)
          .order("checkin_date", { ascending: false }),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: true }),
      ]);

      const exportBundle = {
        app: "PCOSmart Health Tracking App",
        version: "2.4.0",
        exported_at: new Date().toISOString(),
        user_profile: {
          id: targetUserId,
          email: currentEmail,
          nickname: currentNickname,
          age_range: currentAgeRange,
          consent_at: profile?.consent_at || null,
          created_at: profile?.created_at || null,
        },
        summary_counts: {
          daily_checkins_count: (checkinRows || []).length,
          chat_messages_count: (chatRows || []).length,
        },
        daily_checkins: checkinRows || [],
        chat_messages: chatRows || [],
      };

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pcosmart-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadToastVisible(true);
      setTimeout(() => {
        setDownloadToastVisible(false);
      }, 5000);
    } catch (err) {
      console.error("Gagal mengunduh data:", err);
      triggerToast("Gagal mengemas berkas data. Coba lagi ya.");
    } finally {
      setDownloadingData(false);
    }
  };

  const handleConfirmLogout = async () => {
    setLogoutModalOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmInput.trim().toUpperCase() !== "HAPUS") return;
    setDeletingAccount(true);
    try {
      await deleteAccount();
      setDeleteModalOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Delete account error:", err);
      setDeletingAccount(false);
    }
  };

  const isDeleteMatch = deleteConfirmInput.trim().toUpperCase() === "HAPUS";

  return (
    <div className="flex flex-col gap-8 pb-14 relative">
      {/* Floating Download Toast (Stitch Screen 19858d2d06554e888ee18790c86491c3) */}
      {downloadToastVisible && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-3.5 px-5 py-3.5 bg-surface-container-lowest text-on-surface rounded-full shadow-[0_12px_32px_-4px_rgba(108,74,182,0.18)] border border-surface-container-highest animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-7 h-7 rounded-full bg-secondary-container/70 flex items-center justify-center text-secondary shrink-0">
            <span className="material-symbols-rounded text-[18px]">
              check_circle
            </span>
          </div>
          <div className="flex flex-col pr-1">
            <p className="font-label-lg text-label-lg font-bold text-on-surface">
              Unduhan Berhasil
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant font-medium">
              Berkas{" "}
              <code className="text-primary font-bold">pcosmart-data.json</code>{" "}
              tersimpan di perangkatmu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDownloadToastVisible(false)}
            aria-label="Tutup pemberitahuan"
            className="ml-2 w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-rounded text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Floating Success Toast (Stitch Screen 617875995e0b4acd9dbe73cb4dbb1f44) */}
      {toastMessage && (
        <div
          id="toast-success"
          className="fixed bottom-24 lg:bottom-8 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-full bg-inverse-surface text-inverse-on-surface shadow-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-on-secondary shrink-0">
            <span className="material-symbols-rounded text-[16px] font-bold">
              check
            </span>
          </div>
          <span className="font-label-md text-label-md font-medium pr-1">
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-inverse-on-surface/70 hover:text-inverse-on-surface transition-colors p-1 rounded-full"
          >
            <span className="material-symbols-rounded text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Page Header Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            {activeTab === "privasi"
              ? "Privasi & Kedaulatan Tubuh"
              : activeTab === "tentang"
              ? "Pengaturan Sistem & Kebijakan • Rilis v2.4.0"
              : "Konfigurasi Akun Mandiri"}
          </div>
          <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-on-surface font-extrabold tracking-tight">
            Profil & Pengaturan
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            {activeTab === "privasi"
              ? "Kontrol penuh atas kepemilikan data kesehatan reproduksi dan privasimu."
              : activeTab === "tentang"
              ? "Informasi versi aplikasi, standar etika data, dan komitmen kesehatan reproduksi."
              : "Kelola identitas, privasi data personal, dan preferensi akun pendampingan hormonmu dengan aman dan transparan."}
          </p>
        </div>

        {/* Right Header Status Pill */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-surface-container-low shadow-2xs border border-outline-variant/30 self-start md:self-auto">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
            <span className="material-symbols-rounded text-[18px]">
              verified_user
            </span>
          </div>
          <div className="flex flex-col pr-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Status Kriptografi
            </span>
            <span className="font-label-md text-label-md text-secondary font-bold">
              Privasi Terlindungi (E2EE)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Navigation Tabs & Content Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Left Navigation Sticky Rail (Horizontal swipe pills on Mobile, Sticky 3-Col Rail on Desktop) */}
        <aside className="lg:col-span-3 flex flex-col gap-3 lg:sticky lg:top-24 min-w-0">
          <nav className="bg-surface-container-lowest p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xs border border-outline-variant/30 flex flex-row lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
            <div className="hidden lg:block px-3.5 py-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
                Kategori Pengaturan
              </span>
            </div>

            {PROFILE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 lg:px-4 lg:py-3.5 rounded-full text-left transition-all group whitespace-nowrap shrink-0 lg:whitespace-normal lg:shrink ${
                    isActive
                      ? "bg-primary-container text-on-primary shadow-sm shadow-primary/20"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <span
                      className={`material-symbols-rounded text-[18px] lg:text-[20px] shrink-0 ${
                        isActive
                          ? "text-on-primary"
                          : "text-outline group-hover:text-primary"
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-label-md lg:font-label-lg text-label-md lg:text-label-lg leading-snug truncate ${
                          isActive ? "font-bold text-on-primary" : "font-semibold"
                        }`}
                      >
                        {tab.label}
                      </span>
                      <span
                        className={`hidden lg:block text-[11px] truncate ${
                          isActive
                            ? "text-on-primary-container opacity-90"
                            : "text-outline"
                        }`}
                      >
                        {tab.subtitle}
                      </span>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="hidden lg:inline-block w-2 h-2 rounded-full bg-secondary-fixed shrink-0" />
                  ) : (
                    <span className="hidden lg:inline-block material-symbols-rounded text-[18px] text-outline opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      chevron_right
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Subtle Support Banner inside Rail */}
          <div className="hidden lg:flex p-4 rounded-3xl bg-surface-container-low border border-outline-variant/20 flex-col gap-2">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-rounded text-[18px]">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm font-bold">
                Tersandikan 256-bit • UU PDP
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-xs leading-relaxed">
              Semua catatan siklus, gejala, dan obrolan bersama Asisten AI
              tersimpan aman tanpa pelacak pihak ketiga.
            </p>
          </div>
        </aside>

        {/* Right Main Content Canvas (9 Cols) */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* ================================================================
              TAB 1: PROFIL SAYA
              (Stitch Screen 617875995e0b4acd9dbe73cb4dbb1f44 & a646cfe2ec5e4573a417e2f1f177c55c)
             ================================================================ */}
          {activeTab === "profil" && (
            <>
              <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_-4px_rgba(108,74,182,0.06)] border border-outline-variant/30 flex flex-col gap-6 sm:gap-8">
                {/* Header Profil & Avatar */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-surface-container-highest/60">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-headline-lg text-headline-lg font-extrabold shadow-inner">
                      {getInitials(currentNickname)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNicknameInput(currentNickname);
                        setIsEditingName(true);
                      }}
                      aria-label="Edit Nama Panggilan"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md"
                    >
                      <span className="material-symbols-rounded text-[16px]">
                        edit
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-1.5 justify-center sm:justify-start">
                      <h2 className="font-headline-md text-headline-md font-extrabold text-on-surface tracking-tight">
                        {currentNickname}
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-md text-label-md font-bold">
                        <span className="material-symbols-rounded text-[14px]">
                          spa
                        </span>
                        Usia {currentAgeRange} Tahun
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                      Pendampingan siklus dan keseimbangan hormon aktif. Catatan
                      harianmu digunakan untuk mempersonalisasi saran Asisten
                      AI.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNicknameInput(currentNickname);
                          setIsEditingName(true);
                        }}
                        className="inline-flex items-center gap-1.5 font-label-md text-label-md text-primary hover:text-primary-container font-bold transition-colors px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-rounded text-[17px]">
                          badge
                        </span>
                        Ubah Nama Panggilan
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/history?view=doctor")}
                        className="inline-flex items-center gap-1.5 font-label-md text-label-md text-secondary hover:text-on-secondary-container font-bold transition-colors px-3.5 py-1.5 rounded-full bg-secondary-container/40 hover:bg-secondary-container/70"
                      >
                        <span className="material-symbols-rounded text-[17px]">
                          clinical_notes
                        </span>
                        Cetak Ringkasan Dokter
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      Informasi Akun Pribadi
                    </h3>
                    <span className="font-label-sm text-label-sm text-outline">
                      Tersinkronisasi otomatis
                    </span>
                  </div>

                  {/* Field 1: Nama Panggilan (Inline Edit matching Stitch Screen) */}
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          Nama Panggilan
                        </span>
                        <span className="text-xs text-secondary font-semibold px-2.5 py-0.5 rounded-full bg-secondary-fixed/50">
                          Digunakan Asisten AI
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName((v) => !v);
                          setNameError("");
                          setNicknameInput(currentNickname);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-container-lowest text-primary hover:bg-primary-container hover:text-on-primary font-label-md text-label-md font-bold transition-all shadow-2xs border border-outline-variant/30"
                      >
                        <span className="material-symbols-rounded text-[15px]">
                          {isEditingName ? "close" : "edit"}
                        </span>
                        <span>
                          {isEditingName ? "Tutup Edit" : "Edit Nama"}
                        </span>
                      </button>
                    </div>

                    {isEditingName ? (
                      <form
                        onSubmit={handleSaveNickname}
                        className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-primary/25 space-y-3"
                      >
                        <div className="relative flex items-center">
                          <input
                            id="nama-input"
                            type="text"
                            maxLength={30}
                            value={nicknameInput}
                            onChange={(e) => {
                              setNicknameInput(e.target.value);
                              if (nameError) setNameError("");
                            }}
                            placeholder="Ketik nama panggilan (2-30 karakter)..."
                            className="w-full h-12 pl-4 pr-28 rounded-full bg-surface-container-lowest border-2 border-primary text-on-surface font-body-md text-body-md focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                          />
                          <span className="absolute right-4 font-label-sm text-label-sm text-outline select-none">
                            {nicknameInput.length}/30 karakter
                          </span>
                        </div>

                        {nameError && (
                          <p className="text-xs font-semibold text-error flex items-center gap-1">
                            <span className="material-symbols-rounded text-[15px]">
                              error
                            </span>
                            {nameError}
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2 text-secondary font-body-sm text-body-sm">
                            <span className="material-symbols-rounded text-[18px]">
                              check_circle
                            </span>
                            <span>
                              {nicknameInput.trim().length >= 2
                                ? "Nama panggilan terlihat ramah & valid"
                                : "Minimal 2 karakter"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingName(false);
                                setNicknameInput(currentNickname);
                                setNameError("");
                              }}
                              className="px-4 py-2 rounded-full font-label-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={savingName}
                              className="px-6 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:opacity-95 shadow-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <span className="material-symbols-rounded text-[16px]">
                                save
                              </span>
                              <span>
                                {savingName ? "Menyimpan..." : "Simpan"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3 rounded-full border border-outline-variant/30">
                        <span className="font-body-md text-body-md text-on-surface font-bold">
                          {currentNickname}
                        </span>
                        <span className="text-xs text-secondary font-semibold">
                          Aktif
                        </span>
                      </div>
                    )}

                    <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      Nama ini digunakan oleh Asisten PCOSmart saat menyapamu di
                      Beranda dan memberikan rekomendasi harian.
                    </p>
                  </div>

                  {/* Field 2: Rentang Usia Fisiologis (Read-only / Locked) */}
                  <div className="p-5 rounded-2xl bg-surface-container-low/60 border border-surface-container-highest/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          Rentang Usia Fisiologis
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold">
                          <span className="material-symbols-rounded text-[13px]">
                            lock
                          </span>
                          Terkunci
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-surface-container-lowest/80 px-4 py-3 rounded-full border border-outline-variant/30">
                      <span className="font-body-md text-body-md text-on-surface font-semibold">
                        {currentAgeRange} tahun
                      </span>
                      <span className="material-symbols-rounded text-secondary text-[18px]">
                        verified
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-xs flex items-start gap-1.5">
                      <span className="material-symbols-rounded text-outline text-[16px] shrink-0 mt-0.5">
                        info
                      </span>
                      <span>
                        Ditentukan saat onboarding awal untuk kalibrasi konteks
                        fisiologis metabolisme dan siklus haid.
                      </span>
                    </p>
                  </div>

                  {/* Field 3: Email Terdaftar & Masa Keanggotaan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-label-lg text-label-lg text-on-surface font-bold">
                            Email Utama
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                            <span className="material-symbols-rounded text-[13px]">
                              check_circle
                            </span>
                            Terverifikasi
                          </span>
                        </div>
                        <div className="font-body-md text-body-md text-on-surface font-semibold truncate mt-2">
                          {currentEmail}
                        </div>
                      </div>
                      <span className="text-xs text-outline">
                        Digunakan untuk autentikasi aman akun PCOSmart
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col justify-between gap-3">
                      <div>
                        <span className="font-label-lg text-label-lg text-on-surface font-bold block mb-1">
                          Masa Keanggotaan
                        </span>
                        <div className="font-body-md text-body-md text-on-surface font-semibold mt-2 flex items-center gap-2">
                          <span className="material-symbols-rounded text-primary text-[20px]">
                            calendar_month
                          </span>
                          <span>
                            Aktif sejak {formatJoinDate(profile?.created_at)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-outline">
                        Total check-in tersimpan: {checkinsCount} catatan harian
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Sesi Perangkat & Keamanan Akun */}
                <div className="pt-6 border-t border-surface-container-highest/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Sesi & Keamanan Akun
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Perangkat aktif yang terhubung dengan kredensial ini.
                      </p>
                    </div>
                    <span className="material-symbols-rounded text-outline">
                      devices
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-2xs border border-outline-variant/20">
                        <span className="material-symbols-rounded text-[20px]">
                          laptop_mac
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-lg text-label-lg text-on-surface font-bold">
                            Peramban Web Saat Ini
                          </span>
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                          <span className="text-[11px] font-bold text-secondary uppercase">
                            Sesi Ini
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                          Indonesia • Token Sesi Terenkripsi • Aktif sekarang
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTab("privasi")}
                      className="text-xs font-bold text-primary hover:underline self-start sm:self-auto px-3 py-1.5 rounded-full hover:bg-surface-container"
                    >
                      Kelola Privasi & Data →
                    </button>
                  </div>

                  {/* Bottom Log Out Zone */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                    <p className="font-body-sm text-body-sm text-on-surface-variant text-xs max-w-md">
                      Pastikan kamu menyimpan catatan check-in harian sebelum
                      keluar jika mengakses dari perangkat bersama.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLogoutModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-tertiary/40 text-tertiary hover:bg-tertiary-fixed hover:border-tertiary font-label-md text-label-md font-bold transition-all"
                    >
                      <span className="material-symbols-rounded text-[18px]">
                        logout
                      </span>
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Lifestyle Integration Tip Card */}
              <div className="p-6 rounded-3xl bg-surface-container-low border border-surface-container-highest/60 flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-rounded text-[22px]">
                    tips_and_updates
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                    Sinkronisasi Jadwal Dokter Mendatang
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Data profil yang akurat memudahkan dokter spesialis
                    kandungan (Sp.OG) membaca ritme siklus ketika kamu mencetak
                    Ringkasan untuk Dokter.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ================================================================
              TAB 2: DATA & PRIVASI (UNDUH DATA & HAPUS AKUN)
              (Stitch Screen 19858d2d06554e888ee18790c86491c3)
             ================================================================ */}
          {activeTab === "privasi" && (
            <>
              {/* 1. Banner Jaminan Privasi */}
              <div className="bg-secondary-container/25 rounded-3xl p-6 lg:p-7 relative overflow-hidden shadow-2xs border border-secondary/20">
                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-secondary-fixed/30 blur-2xl pointer-events-none" />
                <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-fixed-dim/60 flex items-center justify-center text-on-secondary-fixed shrink-0 shadow-xs">
                    <span className="material-symbols-rounded text-[26px]">
                      shield_with_heart
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-secondary-fixed">
                        Prinsip Kerahasiaan PCOSmart
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-secondary font-label-sm text-label-sm font-bold shadow-2xs">
                        Kerahasiaan Utama
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-secondary-container leading-relaxed">
                      Data observasi siklus, log gejala harian, dan obrolan
                      reflektif bersama asisten dilindungi dengan kontrol akses
                      ketat (
                      <span className="font-bold text-secondary">
                        Row-Level Security & Enkripsi
                      </span>
                      ). Kami tidak pernah memperjualbelikan rekam jejak
                      hormonalmu kepada pihak ketiga maupun pengiklan.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Kartu Unduh Datamu (pcosmart-data.json) */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 lg:p-8 shadow-[0_8px_30px_rgba(108,74,182,0.06)] border border-surface-container-highest flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-rounded text-[24px]">
                        folder_zip
                      </span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Ekspor Seluruh Arsip Pribadi
                      </h2>
                      <p className="font-body-sm text-body-sm text-outline">
                        Format interoperabel terbuka bebas vendor lock-in
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-3.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold">
                    Format: JSON Standar
                  </span>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Dapatkan salinan lengkap berkas format standar{" "}
                  <code className="px-2 py-0.5 rounded-md bg-surface-container-high text-primary font-mono text-sm font-bold">
                    pcosmart-data.json
                  </code>
                  . Berkas ini mencakup profil pengguna, seluruh entri riwayat
                  check-in harian, intensitas gejala PCOS, catatan fluktuasi
                  energi/mood, serta transkrip percakapan bersama Asisten AI
                  untuk arsip mandiri.
                </p>

                {/* Ringkasan Data yang Diekspor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest/60">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <span className="material-symbols-rounded text-secondary text-[22px]">
                      person_check
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-outline">
                        Profil & Persetujuan
                      </span>
                      <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        {currentNickname} ({currentAgeRange})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 sm:border-l sm:border-surface-container-highest">
                    <span className="material-symbols-rounded text-primary text-[22px]">
                      vital_signs
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-outline">
                        Log Gejala Harian
                      </span>
                      <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        {checkinsCount} Check-in
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 sm:border-l sm:border-surface-container-highest">
                    <span className="material-symbols-rounded text-tertiary-container text-[22px]">
                      chat_bubble
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-outline">
                        Riwayat Obrolan AI
                      </span>
                      <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        {chatsCount} Pesan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-rounded text-[18px]">
                      storage
                    </span>
                    <span className="font-label-md text-label-md">
                      Siap diunduh langsung ke perangkatmu
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    disabled={downloadingData}
                    className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-md shadow-primary/25 hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    <span
                      className={`material-symbols-rounded text-[20px] ${
                        downloadingData ? "animate-spin" : ""
                      }`}
                    >
                      {downloadingData ? "sync" : "download"}
                    </span>
                    <span>
                      {downloadingData
                        ? "Mengemas Berkas..."
                        : "Unduh Data (pcosmart-data.json)"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Banner Kemitraan Medis */}
              <div className="bg-surface-container-high/60 rounded-3xl p-5 border border-surface-container-highest flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-rounded text-[20px]">
                      stethoscope
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-label-lg text-label-lg text-on-surface font-bold">
                      Membawa Hasil Catatan ke Dokter Spesialis?
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Kamu bisa mencetak atau menyimpan ringkasan visual A4 saat
                      jadwal konsultasi klinis.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/history?view=doctor")}
                  className="shrink-0 px-5 py-2.5 rounded-full bg-surface-container-lowest text-primary hover:bg-surface-container font-label-md text-label-md font-bold transition-all shadow-2xs border border-surface-container-highest"
                >
                  Format Ringkasan Dokter
                </button>
              </div>

              {/* 3. Kartu Zona Bahaya: Hapus Akun & Data Permanen */}
              <div className="bg-[#FFF8F7] rounded-3xl p-7 lg:p-8 shadow-[0_6px_24px_rgba(186,26,26,0.04)] border border-error/20 flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-error-container/60 flex items-center justify-center text-error">
                      <span className="material-symbols-rounded text-[22px]">
                        warning
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline-sm text-headline-sm font-bold text-error">
                          Zona Bahaya
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                          Tindakan Permanen
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Penghapusan akun dan hak untuk dilupakan (Right to
                        Erasure)
                      </p>
                    </div>
                  </div>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Tindakan ini akan menghapus seluruh profil akun, histori
                  siklus menstruasi, catatan check-in harian, dan riwayat
                  percakapan Asisten AI secara permanen tanpa dapat dipulihkan
                  kembali.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-outline">
                    <span className="material-symbols-rounded text-[18px]">
                      shield
                    </span>
                    <span className="font-label-md text-label-md">
                      Memerlukan konfirmasi ketik kata kunci HAPUS
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmInput("");
                      setDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-surface-container-lowest text-error border border-error/30 hover:bg-error-container/40 transition-all font-label-lg text-label-lg font-bold shadow-2xs"
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      delete_forever
                    </span>
                    <span>Hapus Akun & Data...</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ================================================================
              TAB 3: TENTANG APLIKASI & PERNYATAAN MEDIS
              (Stitch Screen 7a791d64451546b49b28870c87fb5033)
             ================================================================ */}
          {activeTab === "tentang" && (
            <>
              {/* 1. Kartu Pengenalan Aplikasi */}
              <article className="bg-surface-container-lowest rounded-3xl p-8 sm:p-10 shadow-xs border border-surface-container-highest flex flex-col gap-8 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none" />
                <div className="absolute right-40 -bottom-20 w-72 h-72 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-surface-container-high relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white shadow-lg shadow-primary/25 shrink-0">
                      <span className="material-symbols-rounded text-[34px]">
                        local_florist
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm font-extrabold text-on-surface tracking-tight">
                          PCOSmart
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/60 text-secondary font-label-sm text-label-sm font-bold">
                          Ekosistem FemTech
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant mt-0.5 font-medium">
                        Sahabat Siklus & Keseimbangan Hormon
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-on-surface self-start sm:self-center">
                    <span className="material-symbols-rounded text-primary text-[18px]">
                      verified
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        Versi 2.4.0
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        Build Stabil • Standar Klinis
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Vignette Strip */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low p-6 flex flex-col md:flex-row items-center gap-6 border border-surface-container-highest/60">
                  <div className="w-full md:w-44 h-28 rounded-xl overflow-hidden shrink-0 shadow-xs">
                    <img
                      className="w-full h-full object-cover"
                      alt="Keseimbangan Hormon PCOSmart"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcwtdKsL6LT6ePaqZlxm55rZkk-uSrV77WULt8JpFwOs1BEjIYpY2EkQuh6-PnENPFAlLj8ZLHbGZlONSSJCRWz4zKSbuS8MD-tb8hUVN9IcZ0-q_9wCaRul0ieUY5uv_s5aPorWYxsaQgHI59Eok3M2bt5eSAuN_Zb5JAtYvhYTr7imS8Qc_BW-yaNh63AVYl3YPD3g2cAYwtA-zAKiGM3jU_qSEfOWX2yj6kVXgx"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                      Ruang Perlindungan & Penerimaan
                    </span>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed max-w-xl">
                      Didesain dengan empati mendalam untuk perempuan yang
                      menjalani hidup berdampingan dengan PCOS: mengikis rasa
                      terisolasi dan mengubah kebingungan menjadi wawasan yang
                      bermartabat.
                    </p>
                  </div>
                </div>

                {/* Deskripsi Aplikasi Mendalam */}
                <div className="flex flex-col gap-3 max-w-[720px] relative z-10">
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Visi Kesejahteraan Holistik
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    PCOSmart hadir sebagai ruang aman dan penuh welas asih bagi
                    perempuan Indonesia dalam memahami dinamika sindrom ovarium
                    polikistik (PCOS). Kami percaya bahwa tubuh perempuan
                    bukanlah mesin dengan kalender kaku; kami memadukan
                    pencatatan ritme harian, edukasi berbasis literatur ilmiah,
                    dan kecerdasan artifisial empatik untuk membantu merawat
                    keseimbangan hormon tanpa rasa cemas maupun rasa bersalah.
                  </p>
                </div>
              </article>

              {/* 2. Kotak Pernyataan Medis & Batasan Wajib */}
              <section className="rounded-3xl bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container-low p-7 sm:p-8 shadow-xs border border-surface-container-highest flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-md shadow-secondary/20 shrink-0">
                    <span className="material-symbols-rounded text-[26px]">
                      medical_services
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-rounded text-secondary text-[18px]">
                        verified
                      </span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Pernyataan Penting: PCOSmart Bukan Alat Diagnosis Medis
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-3xl">
                      PCOSmart dirancang secara eksklusif sebagai media edukasi
                      literasi gaya hidup, pendampingan refleksi kesejahteraan
                      emosional, dan instrumen observasi mandiri. Aplikasi ini
                      tidak memberikan diagnosis medis, terapi farmakologis
                      langsung, maupun resep dokter. Segala keluhan klinis yang
                      berat, gangguan menstruasi akut, atau rencana terapi
                      lanjutan wajib dikonsultasikan secara langsung dengan
                      dokter spesialis obstetri & ginekologi (Sp.OG).
                    </p>
                  </div>
                </div>

                <div className="mt-1 bg-surface-container-lowest/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-surface-container-highest">
                  <div className="flex items-center gap-2 text-on-surface font-label-md text-label-md font-semibold">
                    <span className="material-symbols-rounded text-secondary text-[18px]">
                      check_circle
                    </span>
                    <span>
                      Gunakan data riwayat sebagai bahan diskusi bersama dokter
                      spesialis Anda
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/history?view=doctor")}
                    className="inline-flex items-center gap-1 text-primary font-label-md text-label-md font-bold hover:underline"
                  >
                    <span>Buka Ringkasan Dokter</span>
                    <span className="material-symbols-rounded text-[16px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </section>

              {/* 3. Pilar Nilai & Standar Integritas */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-2xs border border-surface-container-highest flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
                      <span className="material-symbols-rounded text-[24px]">
                        menu_book
                      </span>
                    </div>
                    <h4 className="font-label-lg text-label-lg text-on-surface font-bold leading-tight">
                      Berbasis Sains Terbuka (WHO, POGI & Monash)
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Seluruh materi edukasi dan panduan gaya hidup dikurasi
                      mengacu pada pedoman klinis internasional dan POGI.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary font-label-sm text-label-sm font-bold pt-2">
                    <span className="material-symbols-rounded text-[16px]">
                      biotech
                    </span>
                    <span>Literatur Terverifikasi</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-2xs border border-surface-container-highest flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-secondary-container/50 flex items-center justify-center text-secondary">
                      <span className="material-symbols-rounded text-[24px]">
                        lock_reset
                      </span>
                    </div>
                    <h4 className="font-label-lg text-label-lg text-on-surface font-bold leading-tight">
                      Kendali Penuh & Ekspor Data Terbuka
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Kamu memegang kendali penuh untuk mengunduh salinan data
                      (`pcosmart-data.json`) atau menghapus akun secara permanen
                      kapan saja.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-bold pt-2">
                    <span className="material-symbols-rounded text-[16px]">
                      encrypted
                    </span>
                    <span>Zero-Tracker Architecture</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-2xs border border-surface-container-highest flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
                      <span className="material-symbols-rounded text-[24px]">
                        favorite
                      </span>
                    </div>
                    <h4 className="font-label-lg text-label-lg text-on-surface font-bold leading-tight">
                      Bahasa Empati Tanpa Stigma Tubuh
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      Menolak pendekatan menghakimi. Setiap pesan disusun untuk
                      mendukung kebiasaan mikro yang berkelanjutan.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-tertiary font-label-sm text-label-sm font-bold pt-2">
                    <span className="material-symbols-rounded text-[16px]">
                      sentiment_satisfied
                    </span>
                    <span>Body Neutrality Standard</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: HAPUS AKUN PERMANEN (Ketik "HAPUS")
          (Stitch Screen 71ec659c01504adeb4950eb6a662bdb5)
         ==================================================================== */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 bg-[#2b2433]/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setDeleteModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="w-full max-w-[540px] max-h-[92dvh] overflow-y-auto bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[28px] p-5 sm:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-8 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden mb-4" />
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-error-container/50 flex items-center justify-center text-error shrink-0">
                <span className="material-symbols-rounded text-[30px]">
                  delete_forever
                </span>
              </div>
              <div className="pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container/60 text-error font-label-sm text-label-sm font-bold mb-1.5">
                  <span className="material-symbols-rounded text-[14px]">
                    warning
                  </span>
                  Tindakan Permanen
                </div>
                <h2
                  id="delete-modal-title"
                  className="font-headline-md text-headline-md font-extrabold text-on-surface leading-snug"
                >
                  Hapus Akun PCOSmart?
                </h2>
              </div>
            </div>

            <div className="bg-surface-container-low/80 rounded-2xl p-4 mb-5 border border-surface-container-highest">
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Apakah kamu yakin ingin menghapus akunmu? Seluruh{" "}
                <strong className="text-on-surface">
                  riwayat check-in gejala
                </strong>
                ,{" "}
                <strong className="text-on-surface">pola siklus hormon</strong>,{" "}
                <strong className="text-on-surface">catatan dokter</strong>, dan
                percakapan bersama{" "}
                <strong className="text-on-surface">Asisten AI</strong> akan
                dihapus permanen dari sistem kami. Tindakan ini tidak dapat
                dibatalkan.
              </p>
            </div>

            <div className="space-y-2 mb-6">
              <label
                htmlFor="delete-input"
                className="block font-label-md text-label-md text-on-surface font-semibold"
              >
                Untuk mengonfirmasi, ketik kata{" "}
                <span className="font-extrabold text-error tracking-wider">
                  HAPUS
                </span>{" "}
                pada kotak di bawah ini:
              </label>
              <div className="relative flex items-center">
                <input
                  id="delete-input"
                  type="text"
                  autoComplete="off"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder="Ketik HAPUS"
                  className="w-full h-[52px] px-4 rounded-2xl bg-surface-container-lowest border-2 border-error/50 text-error font-headline-sm text-headline-sm font-extrabold tracking-widest focus:outline-none focus:border-error focus:ring-4 focus:ring-error/15 transition-all uppercase"
                />
                {isDeleteMatch && (
                  <span className="absolute right-4 flex items-center gap-1 text-error text-xs font-bold bg-error-container/50 px-2.5 py-1 rounded-full pointer-events-none">
                    <span className="material-symbols-rounded text-[16px]">
                      check_circle
                    </span>
                    Cocok
                  </span>
                )}
              </div>
              <p className="font-label-sm text-label-sm text-outline flex items-center gap-1.5 pt-0.5">
                <span className="material-symbols-rounded text-[14px]">
                  shield
                </span>
                Ketik kata HAPUS untuk mengaktifkan tombol eksekusi
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-full sm:w-1/2 h-12 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                Batal & Kembali
              </button>
              <button
                type="button"
                disabled={!isDeleteMatch || deletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="w-full sm:w-1/2 h-12 rounded-full bg-error hover:bg-[#a01c15] text-on-error font-label-lg text-label-lg font-bold shadow-md shadow-error/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-rounded text-[18px]">
                  delete
                </span>
                <span>
                  {deletingAccount ? "Menghapus..." : "Hapus Akun Saya"}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: DIALOG KONFIRMASI KELUAR (LOGOUT)
          (Stitch Screen 71ec659c01504adeb4950eb6a662bdb5)
         ==================================================================== */}
      {logoutModalOpen && (
        <div
          className="fixed inset-0 bg-[#2b2433]/45 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setLogoutModalOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Dialog Keluar Akun"
            className="w-full max-w-[400px] sm:max-w-[380px] max-h-[90dvh] overflow-y-auto bg-surface-container-lowest rounded-t-[2rem] sm:rounded-3xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden -mt-1" />
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-secondary-container/60 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-rounded text-[22px]">
                  logout
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                  Sesi Masuk
                </span>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Keluar dari Sesi Ini?
                </h2>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Kamu bisa masuk kembali kapan saja. Data catatan harian dan
              riwayat siklusmu tetap aman tersimpan di akun PCOSmart.
            </p>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 h-11 rounded-full bg-surface-variant/80 hover:bg-surface-variant text-on-surface font-label-md text-label-md font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 h-11 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-rounded text-[17px]">
                  check
                </span>
                <span>Ya, Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
