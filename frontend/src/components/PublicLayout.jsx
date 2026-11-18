import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PUBLIC_INFO_CONTENT = {
  bantuan: {
    title: "Pusat Bantuan PCOSmart",
    icon: "help_outline",
    body: "PCOSmart membantu mencatat gejala harian, pola energi, suara (voice note journaling), dan pertanyaan konsultasi ke dokter Sp.OG. Untuk mulai, pilih Daftar Akun Baru atau Masuk menggunakan email maupun Akun Google aktif.",
  },
  privasi: {
    title: "Privasi & Kedaulatan Data (UU PDP)",
    icon: "verified_user",
    body: "Data catatan kesehatanmu hanya dapat diakses oleh akunmu sendiri (dilindungi Row Level Security & enkripsi transport HTTPS). Kamu dapat mengekspor seluruh datamu (JSON) atau meminta penghapusan data kapan saja melalui menu Profil → Data & Privasi.",
  },
  ketentuan: {
    title: "Ketentuan Penggunaan",
    icon: "gavel",
    body: "PCOSmart adalah pendamping pencatatan gaya hidup dan edukasi nutrisi berbasis sains (WHO, POGI, Monash Guideline). Platform ini BUKAN alat diagnosis medis resmi dan tidak menggantikan konsultasi dokter spesialis.",
  },
  kontak: {
    title: "Kontak & Eskalasi Medis",
    icon: "medical_services",
    body: "Untuk keluhan gawat darurat atau nyeri panggul hebat / perdarahan berkepanjangan, segera kunjungi fasilitas kesehatan terdekat atau hubungi layanan darurat nasional 119 / dokter Sp.OG.",
  },
};

export function PublicHeader({ onOpenInfo }) {
  return (
    <header className="w-full pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(108,74,182,0.04)] sticky top-0 z-40">
      <div className="h-16 max-w-7xl mx-auto px-margin lg:px-margin-desktop flex items-center justify-between">
        <Link to="/" className="flex items-center gap-space-sm group">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">spa</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-none">
              PCOSmart
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-none mt-0.5">
              Sahabat Hormonmu
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-space-md">
          <button
            type="button"
            onClick={() => onOpenInfo?.("bantuan")}
            className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-space-xs px-space-sm rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            <span>Bantuan</span>
          </button>
          <Link
            to="/login"
            title="Masuk Akun"
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ onOpenInfo }) {
  return (
    <footer className="w-full bg-surface-container-low pt-space-md pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-[0_-1px_6px_rgba(108,74,182,0.02)]">
      <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop flex flex-col sm:flex-row items-center justify-between gap-space-xs text-center sm:text-left">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          © 2024 PCOSmart Indonesia. Ruang aman dan suportif kesehatan reproduksi wanita.
        </p>
        <div className="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
          <button
            type="button"
            onClick={() => onOpenInfo?.("privasi")}
            className="hover:text-primary transition-colors"
          >
            Privasi
          </button>
          <span className="opacity-40">•</span>
          <button
            type="button"
            onClick={() => onOpenInfo?.("ketentuan")}
            className="hover:text-primary transition-colors"
          >
            Ketentuan
          </button>
          <span className="opacity-40">•</span>
          <button
            type="button"
            onClick={() => onOpenInfo?.("kontak")}
            className="hover:text-primary transition-colors"
          >
            Kontak Medis
          </button>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }) {
  const [infoKey, setInfoKey] = useState(null);

  useEffect(() => {
    if (!infoKey) return;
    const onKey = (e) => {
      if (e.key === "Escape") setInfoKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoKey]);

  const infoData = infoKey ? PUBLIC_INFO_CONTENT[infoKey] : null;

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex flex-col justify-between overflow-x-clip selection:bg-primary-fixed selection:text-on-primary-fixed">
      <PublicHeader onOpenInfo={setInfoKey} />
      <main className="flex-1 flex flex-col items-center justify-center w-full px-margin lg:px-margin-desktop py-space-md sm:py-space-xl bg-background">
        {children}
      </main>
      <PublicFooter onOpenInfo={setInfoKey} />

      {infoData && (
        <div
          className="fixed inset-0 z-50 bg-[#2B2433]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInfoKey(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-info-title"
            className="w-full max-w-md bg-surface-container-lowest rounded-t-[2rem] sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden -mt-2 mb-1" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{infoData.icon}</span>
                </div>
                <h2
                  id="public-info-title"
                  className="font-headline-sm text-headline-sm text-on-surface font-bold"
                >
                  {infoData.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Tutup informasi"
                onClick={() => setInfoKey(null)}
                className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              {infoData.body}
            </p>
            <button
              type="button"
              onClick={() => setInfoKey(null)}
              className="mt-2 w-full h-11 rounded-full bg-primary text-on-primary font-label-md font-bold"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
