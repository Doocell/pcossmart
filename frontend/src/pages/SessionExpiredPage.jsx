import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { useAuth } from "../contexts/AuthContext";

export default function SessionExpiredPage() {
  const navigate = useNavigate();
  const { signIn, user, profile } = useAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRelogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      navigate("/login");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Kata sandi tidak sesuai. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex flex-col w-full relative min-h-0 sm:min-h-[calc(100vh-8rem)] items-center justify-center sm:-my-space-xl py-space-md sm:py-space-xl overflow-hidden">
        {/* Subtle Blurred Dashboard Backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none opacity-40 blur-md scale-105 grid grid-cols-12 gap-gutter-desktop max-w-7xl mx-auto px-margin-desktop py-space-xl"
        >
          <div className="col-span-4 bg-surface-container rounded-lg p-space-lg flex flex-col gap-space-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="w-24 h-4 bg-surface-container-highest rounded-full" />
              <span className="w-8 h-8 rounded-full bg-secondary-container" />
            </div>
            <div className="h-28 rounded-lg bg-surface-container-lowest" />
          </div>
          <div className="col-span-5 bg-surface-container-lowest rounded-lg p-space-lg flex flex-col items-center justify-center gap-space-md shadow-sm">
            <div className="w-40 h-40 rounded-full bg-primary-fixed/40 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-surface-container" />
            </div>
          </div>
          <div className="col-span-3 bg-surface-container rounded-lg p-space-lg flex flex-col gap-space-md shadow-sm" />
        </div>

        <div className="absolute inset-0 bg-background/75 backdrop-blur-md pointer-events-none" />

        {/* Focused Modal Dialog */}
        <div className="relative z-10 w-full max-w-[520px] bg-surface-container-lowest rounded-[28px] p-5 sm:p-10 shadow-[0_20px_50px_-12px_rgba(108,74,182,0.14),0_4px_16px_-2px_rgba(108,74,182,0.06)] flex flex-col items-center text-center transition-all duration-300">
          <div className="relative w-20 h-20 rounded-full bg-[#F0E6F8] flex items-center justify-center mb-space-md shadow-sm">
            <span className="material-symbols-outlined text-[36px] text-primary">schedule</span>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[17px] fill-1">lock</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-space-xs px-3.5 py-1 rounded-full bg-surface-container text-primary font-label-md text-label-md mb-space-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Sesi Terjeda Otomatis</span>
          </div>

          <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-space-xs">
            Sesimu berakhir, silakan masuk lagi.
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[430px] leading-relaxed mb-space-lg">
            Demi keamanan data kesehatan pribadimu, sesi aktif telah berakhir secara otomatis karena
            tidak ada aktivitas. Jangan khawatir, catatan siklus dan kesehatanmu tetap tersimpan
            aman.
          </p>

          {error && (
            <div className="w-full mb-4 p-3 rounded-DEFAULT bg-error-container text-on-error-container font-body-sm">
              {error}
            </div>
          )}

          <form className="w-full flex flex-col gap-space-md text-left" onSubmit={handleRelogin}>
            <div className="flex items-center justify-between p-space-sm pl-space-md bg-surface-container-low rounded-2xl">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shadow-sm">
                  {(profile?.nickname || "S").charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface truncate">
                    {profile?.nickname || "Sahabat PCOSmart"}
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan emailmu"
                    className="font-label-sm text-label-sm text-on-surface-variant bg-transparent outline-none truncate"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="shrink-0 px-3 py-1.5 rounded-full text-primary hover:bg-surface-container-highest font-label-md text-label-md transition-colors"
              >
                Ubah akun
              </button>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                <span>Kata Sandi</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[20px] pointer-events-none">
                  key
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akunmu"
                  required
                  className="w-full h-[52px] pl-11 pr-12 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body-md text-body-md outline-none focus:shadow-[0_0_0_3px_rgba(108,74,182,0.18)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-space-sm pt-space-xs">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-full bg-primary-container text-on-primary hover:bg-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>{loading ? "Memproses..." : "Masuk Kembali"}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full h-[46px] rounded-full bg-surface-container text-primary hover:bg-surface-container-highest font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[19px]">switch_account</span>
                <span>Masuk dengan Akun Lain</span>
              </button>
            </div>
          </form>

          <div className="mt-space-md w-full p-space-sm px-space-md rounded-2xl bg-surface-container flex items-start gap-space-sm text-left">
            <span className="text-[16px] leading-tight shrink-0 select-none mt-0.5">🛡️</span>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              Data jurnal gejala, pola tidur, dan riwayat siklusmu dienkripsi penuh dan terlindungi
              secara privat.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
