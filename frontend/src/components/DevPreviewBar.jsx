import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getBackendMode } from "../lib/supabase";

const PREVIEW_ROUTES = [
  { path: "/", label: "Welcome / Landing", group: "Auth" },
  { path: "/login", label: "Masuk Akun", group: "Auth" },
  { path: "/register", label: "Daftar Akun", group: "Auth" },
  { path: "/check-email", label: "Cek Emailmu", group: "Auth" },
  { path: "/session-expired", label: "Sesi Berakhir", group: "Auth" },
  { path: "/onboarding", label: "Onboarding (Usia & Privasi)", group: "Auth" },
  { path: "/dashboard", label: "Beranda Dasbor", group: "App" },
  { path: "/checkin", label: "Check-in Harian", group: "App" },
  { path: "/chat", label: "Asisten AI (Chat)", group: "App" },
  { path: "/history", label: "Riwayat & Wawasan", group: "App" },
  { path: "/history?view=doctor", label: "Ringkasan Dokter (A4)", group: "App" },
  { path: "/education", label: "Pustaka Edukasi", group: "App" },
  { path: "/profile", label: "Profil & Pengaturan", group: "App" },
  { path: "/profile?tab=privasi", label: "Data & Privasi (JSON)", group: "App" },
  { path: "/profile?tab=tentang", label: "Tentang PCOSmart", group: "App" },
];

export default function DevPreviewBar({ setPreviewBypass }) {
  const [open, setOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signIn, signOut } = useAuth();

  const handleQuickLoginTesterA = async () => {
    setLoggingIn(true);
    try {
      await signIn({
        email: "tester-tester-a@example.com",
        password: "12345678",
      });
      setPreviewBypass(false);
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleJump = async (routePath) => {
    // Enable preview bypass so public/protected routes don't force-redirect when checking visuals
    setPreviewBypass(true);
    if (
      (routePath === "/dashboard" ||
        routePath === "/checkin" ||
        routePath === "/chat" ||
        routePath.startsWith("/history") ||
        routePath.startsWith("/education") ||
        routePath.startsWith("/profile")) &&
      !user
    ) {
      await handleQuickLoginTesterA();
      setPreviewBypass(true);
    }
    navigate(routePath);
  };

  const mode = getBackendMode();
  const currentFull = location.pathname + (location.search || "");

  return (
    <div className="print:hidden fixed bottom-4 right-4 z-[9999] font-body-sm">
      {open ? (
        <div className="w-80 sm:w-96 bg-inverse-surface text-inverse-on-surface rounded-2xl p-4 shadow-2xl border border-primary-fixed/20">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-secondary-fixed text-[20px]">
                palette
              </span>
              <div>
                <p className="font-label-md font-bold leading-tight">
                  Panel Cek Visual & Backend
                </p>
                <p className="text-[11px] text-inverse-on-surface/70">
                  Mode: {mode === "cloud" ? "Supabase Cloud" : "Local Backend Mirror (Aktif)"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center"
            >
              <span className="material-symbols-rounded text-[18px]">close</span>
            </button>
          </div>

          {/* Auth Status & 1-Click Login */}
          <div className="bg-white/10 rounded-xl p-3 mb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-inverse-on-surface/80">Status Sesi:</span>
              <span className="font-semibold text-secondary-fixed">
                {user ? `Login (${profile?.nickname || user.email})` : "Belum Login"}
              </span>
            </div>

            <div className="flex gap-2">
              {!user ? (
                <button
                  type="button"
                  onClick={handleQuickLoginTesterA}
                  disabled={loggingIn}
                  className="flex-1 py-2 px-3 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-bold hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-rounded text-[16px]">bolt</span>
                  <span>{loggingIn ? "Masuk..." : "1-Klik Login Akun Tester (Nadia)"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="flex-1 py-1.5 px-3 rounded-full bg-error-container text-on-error-container font-label-sm font-semibold hover:opacity-95 transition-all"
                >
                  Logout Sesi
                </button>
              )}
            </div>
          </div>

          {/* Direct Page Switcher */}
          <p className="text-[11px] uppercase tracking-wider text-inverse-on-surface/60 font-semibold mb-2">
            Lompat Langsung ke Halaman (Bebas Redirect):
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
            {PREVIEW_ROUTES.map((r) => {
              const active = r.path.includes("?")
                ? currentFull === r.path
                : location.pathname === r.path && !location.search;
              return (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => handleJump(r.path)}
                  className={`text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                    active
                      ? "bg-primary-container text-on-primary font-bold"
                      : "bg-white/5 hover:bg-white/15 text-inverse-on-surface/90"
                  }`}
                >
                  <span className="truncate">{r.label}</span>
                  <span className="material-symbols-rounded text-[14px] shrink-0">
                    chevron_right
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-11 px-4 rounded-full bg-inverse-surface text-inverse-on-surface shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-primary-fixed/30"
        >
          <span className="material-symbols-rounded text-secondary-fixed text-[18px]">
            visibility
          </span>
          <span className="font-label-md font-semibold">Cek Visual & Quick Login</span>
        </button>
      )}
    </div>
  );
}
