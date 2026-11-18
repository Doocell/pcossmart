import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "home", label: "Beranda" },
  { to: "/checkin", icon: "edit_note", label: "Check-in" },
  { to: "/chat", icon: "chat_bubble", label: "Asisten" },
  { to: "/education", icon: "menu_book", label: "Edukasi" },
  { to: "/history", icon: "calendar_month", label: "Riwayat" },
  { to: "/profile", icon: "person", label: "Profil" },
];

function getInitials(name) {
  const parts = String(name || "S").trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "S").toUpperCase();
}

function getMobileRouteMeta(pathname, search) {
  const params = new URLSearchParams(search || "");
  if (pathname.startsWith("/checkin")) {
    return { title: "Check-in Harian", showBack: true, showBottomNav: false, backTo: "/dashboard" };
  }
  if (pathname.startsWith("/history")) {
    if (params.get("view") === "doctor") {
      return { title: "Ringkasan untuk Dokter", showBack: true, showBottomNav: false, backTo: "/history" };
    }
    return { title: "Riwayat & Wawasan", showBack: false, showBottomNav: true };
  }
  if (pathname.startsWith("/chat")) {
    return { title: "Asisten AI", showBack: false, showBottomNav: true };
  }
  if (pathname.startsWith("/education")) {
    if (params.get("article")) {
      return { title: "Detail Artikel", showBack: true, showBottomNav: false, backTo: "/education" };
    }
    return { title: "Edukasi PCOS", showBack: false, showBottomNav: true };
  }
  if (pathname.startsWith("/profile")) {
    return { title: "Profil & Pengaturan", showBack: true, showBottomNav: true, backTo: "/dashboard" };
  }
  return { title: "Beranda", showBack: false, showBottomNav: true };
}

export function formatIndonesianDate(date = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const mobileMeta = getMobileRouteMeta(location.pathname, location.search);
  const nickname = profile?.nickname || "Sahabat";
  const initials = getInitials(nickname);

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/education?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/education");
    }
  };

  const todayFormatted = formatIndonesianDate();

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Desktop Sidebar (Matches Stitch 260px fixed sidebar) */}
      <aside className="print:hidden hidden lg:flex fixed left-0 top-0 h-screen w-[260px] bg-surface-container-low z-50 flex-col justify-between p-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-space-md">
          <div className="flex items-center gap-space-sm px-2 py-1">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-rounded text-[22px]">spa</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary leading-tight">
                PCOSmart
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Sahabat Siklus
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all ${
                    isActive
                      ? "bg-primary-container text-on-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-rounded text-[20px] ${
                        isActive ? "fill-1" : ""
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-label-lg text-label-lg">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-surface-container p-3 rounded-2xl flex items-start gap-2.5">
            <span className="material-symbols-rounded text-secondary text-[20px] mt-0.5 shrink-0">
              health_and_safety
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="font-label-sm text-label-sm text-on-surface leading-tight font-medium">
                PCOSmart bukan alat diagnosis medis resmi.
              </p>
              <span className="text-[11px] text-on-surface-variant leading-tight">
                Konsultasikan dengan dokter spesialis untuk evaluasi klinis.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center justify-between px-3 py-2 rounded-full text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-all"
          >
            <span className="flex items-center gap-2.5 font-label-md text-label-md">
              <span className="material-symbols-rounded text-[18px]">help</span>
              Pusat Bantuan
            </span>
            <span className="material-symbols-rounded text-[16px]">chevron_right</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-full text-error hover:bg-error-container/30 transition-all font-label-md text-label-md text-left w-full"
          >
            <span className="material-symbols-rounded text-[18px]">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper with Top Header */}
      <div className="lg:pl-[260px] print:pl-0">
        <header className="print:hidden fixed top-0 left-0 lg:left-[260px] right-0 pt-safe bg-surface/85 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          {/* Mobile Header (Matches Stitch mobile_tab / mobile_stack) */}
          <div className="flex lg:hidden h-16 px-margin items-center justify-between gap-2">
            {mobileMeta.showBack ? (
              <div className="flex items-center gap-space-xs min-w-0">
                <button
                  type="button"
                  aria-label="Kembali"
                  onClick={() =>
                    (window.history.state?.idx ?? 0) > 0
                      ? navigate(-1)
                      : navigate(mobileMeta.backTo || "/dashboard")
                  }
                  className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate leading-tight">
                  {mobileMeta.title}
                </h1>
              </div>
            ) : (
              <div className="flex flex-col justify-center min-w-0 pr-space-sm">
                <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider leading-none">
                  PCOSmart
                </span>
                <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate leading-tight mt-0.5">
                  {mobileMeta.title}
                </h1>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate("/chat")}
                aria-label="Buka Asisten AI"
                className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors relative"
              >
                <span className="material-symbols-rounded text-[20px]">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-tertiary-container" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                aria-label={`Profil ${nickname}`}
                className={`w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md font-bold shadow-sm transition-transform active:scale-95 ${
                  location.pathname.startsWith("/profile")
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : ""
                }`}
              >
                {initials}
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex h-16 max-w-[1200px] mx-auto px-space-lg items-center justify-between gap-space-md">
            {/* Left: Date */}
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-rounded text-primary text-[20px]">
                calendar_month
              </span>
              <span className="font-label-md text-label-md font-medium text-on-surface">
                {todayFormatted}
              </span>
            </div>

            {/* Center: Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-space-md flex-1 max-w-md"
            >
              <div className="relative w-full">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nutrisi, gejala, atau artikel..."
                  className="w-full h-10 pl-10 pr-space-md bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-sm font-body-sm rounded-full outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm"
                />
              </div>
            </form>

            {/* Right: Notification & User Pill */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/chat")}
                title="Rekomendasi Asisten AI"
                className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors relative"
              >
                <span className="material-symbols-rounded text-[20px]">notifications</span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-tertiary-container" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2.5 pl-1 text-right"
              >
                <div className="flex-col text-right flex">
                  <span className="font-label-md text-label-md font-semibold text-on-surface leading-tight">
                    {nickname}
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary leading-tight">
                    Usia {profile?.age_range || "Aktif"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold">
                  <span className="material-symbols-rounded text-on-primary text-[20px]">
                    person
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main
          className={`w-full pt-[calc(4rem+env(safe-area-inset-top,0px))] lg:pt-16 ${
            mobileMeta.showBottomNav
              ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"
              : "pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
          } lg:pb-8 print:pt-0 print:pb-0 bg-surface min-h-screen`}
        >
          <div className="max-w-[1200px] mx-auto px-margin sm:px-space-lg py-space-md lg:py-space-lg print:p-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (Matches Stitch 5-tab bar with floating Check-in CTA) */}
      {mobileMeta.showBottomNav && (
        <nav
          aria-label="Navigasi Mobile"
          className="print:hidden lg:hidden fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(108,74,182,0.06)]"
        >
          <div className="h-20 px-space-xs flex items-center justify-around max-w-md mx-auto">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors group ${
                  isActive ? "text-primary font-bold" : "text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-12 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span
                      className={`material-symbols-rounded text-[24px] transition-transform group-active:scale-90 ${
                        isActive ? "fill-1" : ""
                      }`}
                    >
                      home
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm tracking-tight">Beranda</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors group ${
                  isActive ? "text-primary font-bold" : "text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-12 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span
                      className={`material-symbols-rounded text-[24px] transition-transform group-active:scale-90 ${
                        isActive ? "fill-1" : ""
                      }`}
                    >
                      calendar_month
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm tracking-tight">Riwayat</span>
                </>
              )}
            </NavLink>

            <div className="flex flex-col items-center justify-center px-space-xs">
              <NavLink
                to="/checkin"
                aria-label="Isi Check-in Harian"
                className="-mt-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_8px_20px_rgba(84,48,156,0.35)] flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all"
              >
                <span className="material-symbols-rounded text-[28px]">edit_note</span>
              </NavLink>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 tracking-tight">
                Check-in
              </span>
            </div>

            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors group ${
                  isActive ? "text-primary font-bold" : "text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-12 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span
                      className={`material-symbols-rounded text-[24px] transition-transform group-active:scale-90 ${
                        isActive ? "fill-1" : ""
                      }`}
                    >
                      chat_bubble
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm tracking-tight">Asisten</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/education"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors group ${
                  isActive ? "text-primary font-bold" : "text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-12 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span
                      className={`material-symbols-rounded text-[24px] transition-transform group-active:scale-90 ${
                        isActive ? "fill-1" : ""
                      }`}
                    >
                      menu_book
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm tracking-tight">Edukasi</span>
                </>
              )}
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  );
}
