import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, oauthError, setOauthError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const resetGoogleLoading = () => setGoogleLoading(false);
    window.addEventListener("pageshow", resetGoogleLoading);
    return () => window.removeEventListener("pageshow", resetGoogleLoading);
  }, []);

  const displayError = error || oauthError;

  const handleGoogleSignIn = async () => {
    setError("");
    setOauthError?.("");
    setGoogleLoading(true);
    try {
      const data = await signInWithGoogle();
      if (!data?.url) {
        setGoogleLoading(false);
      }
    } catch (err) {
      setGoogleLoading(false);
      const msg = String(err.message || "").toLowerCase();
      if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
        setError(
          "Login Google belum diaktifkan di Supabase Dashboard (Authentication → Providers → Google)."
        );
      } else {
        setError(
          err.message ||
          "Gagal menghubungkan Google OAuth. Pastikan provider Google sudah diaktifkan di Supabase Dashboard."
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("invalid login credentials")) {
        setError("Email atau kata sandi salah.");
      } else if (msg.includes("email not confirmed")) {
        setError("Email belum dikonfirmasi. Silakan cek kotak masuk emailmu terlebih dahulu.");
      } else {
        setError(err.message || "Gagal masuk. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex flex-col w-full items-center justify-center relative">
        {/* Subtle decorative ambient glows */}
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-20 -right-16 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Main Login Card (440px max width) */}
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-lg p-5 sm:p-[40px] shadow-[0_8px_32px_-4px_rgba(108,74,182,0.08),0_2px_8px_-1px_rgba(108,74,182,0.04)] flex flex-col transition-all duration-300">
          {/* Header Title & Subtitle */}
          <div className="flex flex-col mb-space-lg text-left">
            <img
              src="/logopcos.png"
              alt="PCOSmart — Better Understanding, Better Living"
              className="h-9 sm:h-10 w-auto object-contain self-start mb-space-sm select-none"
            />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold mb-space-xs">
              Akses Akun
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-space-xs">
              Selamat Datang Kembali
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Masuk untuk mencatat kondisi harian dan berdiskusi dengan asisten AI.
            </p>
          </div>

          {/* Prominent Error Alert Banner (matches Stitch Masuk Akun Error State) */}
          {displayError && (
            <div className="w-full bg-error-container/70 rounded-DEFAULT p-space-md mb-space-lg flex items-start gap-space-sm relative transition-all duration-200">
              <div className="flex-shrink-0 mt-0.5 text-error">
                <span className="material-symbols-outlined text-[20px] fill-1">error</span>
              </div>
              <div className="flex-1 pr-space-md">
                <p className="font-body-sm text-body-sm text-on-error-container font-medium leading-snug">
                  {displayError}
                </p>
                <p className="font-body-sm text-body-sm text-on-error-container/90 mt-1 leading-snug">
                  Silakan periksa kembali kombinasi akunmu atau gunakan opsi Lupa Kata Sandi jika
                  memerlukan bantuan.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup notifikasi error"
                onClick={() => {
                  setError("");
                  setOauthError?.("");
                }}
                className="absolute top-space-sm right-space-sm text-on-error-container/60 hover:text-on-error-container w-7 h-7 rounded-full flex items-center justify-center hover:bg-error-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {resetMsg && (
            <div className="w-full bg-secondary-container/60 rounded-DEFAULT p-space-md mb-space-md flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-[20px] text-secondary mt-0.5">
                mark_email_read
              </span>
              <p className="font-body-sm text-body-sm text-on-secondary-container font-medium">
                {resetMsg}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
            {/* Field 1: Email */}
            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                Email
              </label>
              <div className="relative w-full">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nadia.paramitha@example.com"
                  required
                  aria-invalid={Boolean(error)}
                  className={`w-full h-[52px] rounded-full px-space-lg pr-12 text-on-surface font-body-md text-body-md focus:outline-none transition-all duration-200 ${error
                      ? "bg-error-container/20 focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(186,26,26,0.15)]"
                      : "bg-surface-container-low focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(108,74,182,0.15)]"
                    }`}
                />
                {error && (
                  <div className="absolute inset-y-0 right-0 pr-space-md flex items-center pointer-events-none text-error">
                    <span className="material-symbols-outlined text-[20px] fill-1">info</span>
                  </div>
                )}
              </div>
              {error && (
                <p className="font-label-sm text-label-sm text-error px-space-sm">
                  Alamat email atau kata sandi tidak cocok dengan data kami.
                </p>
              )}
            </div>

            {/* Field 2: Kata Sandi */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                  Kata sandi
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    setResetMsg("");
                    const cleanEmail = email.trim();
                    if (!cleanEmail) {
                      setError("Masukkan alamat email akunmu terlebih dahulu lalu klik Lupa kata sandi.");
                      return;
                    }
                    try {
                      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                        redirectTo: `${window.location.origin}/login`,
                      });
                      if (resetErr) throw resetErr;
                      setResetMsg(`Tautan pemulihan kata sandi telah dikirim ke ${cleanEmail}.`);
                    } catch (err) {
                      setError(err.message || "Gagal mengirim email reset kata sandi.");
                    }
                  }}
                  className="font-label-md text-label-md text-primary-container hover:text-primary transition-colors"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative w-full">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full h-[52px] rounded-full px-space-lg pr-12 bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(108,74,182,0.15)] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                  className="absolute inset-y-0 right-0 pr-space-md flex items-center text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant px-space-sm">
                Periksa penggunaan huruf kapital dan karakter.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-space-xs flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full h-[48px] rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-sm active:scale-[0.99] transition-all duration-200 disabled:opacity-60"
              >
                <span>{loading ? "Memproses..." : "Masuk"}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-surface-container-highest" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                  atau
                </span>
                <div className="flex-1 h-px bg-surface-container-highest" />
              </div>

              <button
                type="button"
                disabled={loading || googleLoading}
                onClick={handleGoogleSignIn}
                className="w-full h-[48px] rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container-highest text-on-surface font-label-lg text-label-lg font-bold flex items-center justify-center gap-2.5 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>
                  {googleLoading ? "Menghubungkan Google..." : "Masuk dengan Akun Google"}
                </span>
              </button>

              {import.meta.env.DEV && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setEmail("tester-tester-a@example.com");
                    setPassword("12345678");
                    setError("");
                    setLoading(true);
                    try {
                      await signIn({
                        email: "tester-tester-a@example.com",
                        password: "12345678",
                      });
                      navigate("/dashboard", { replace: true });
                    } catch (err) {
                      setError(err.message || "Gagal masuk akun uji.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full h-[44px] rounded-full bg-secondary-container/70 hover:bg-secondary-container text-on-secondary-container font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Masuk Cepat Akun Tester (Nadia)</span>
                </button>
              )}
            </div>

            {/* Sign Up Redirection */}
            <div className="text-center pt-space-xs pb-space-xs">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Belum punya akun?
              </span>
              <Link
                to="/register"
                className="font-label-md text-label-md text-primary-container hover:text-primary ml-1 transition-colors"
              >
                Daftar
              </Link>
            </div>
          </form>

          {/* Medical Disclaimer Footnote */}
          <div className="mt-space-md pt-space-md bg-surface-container-low/70 rounded-DEFAULT p-space-sm flex items-start gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 flex-shrink-0">
              health_and_safety
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              <span className="font-medium text-on-surface">PCOSmart</span> bukan alat diagnosis
              medis. Selalu konsultasikan dengan dokter spesialis untuk evaluasi klinis.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
