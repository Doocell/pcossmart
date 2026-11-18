import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, oauthError, setOauthError } = useAuth();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const resetGoogleLoading = () => setGoogleLoading(false);
    window.addEventListener("pageshow", resetGoogleLoading);
    return () => window.removeEventListener("pageshow", resetGoogleLoading);
  }, []);

  const displayError = error || oauthError;

  const handleGoogleSignUp = async () => {
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
          "Pendaftaran Google belum diaktifkan di Supabase Dashboard (Authentication → Providers → Google)."
        );
      } else {
        setError(
          err.message ||
            "Gagal mendaftar dengan Google. Pastikan provider Google sudah diaktifkan di Supabase Dashboard."
        );
      }
    }
  };

  const isNickValid = nickname.trim().length >= 2 && nickname.trim().length <= 30;

  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: "Belum diisi", color: "bg-surface-container-highest" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score++;
    if (password.length >= 10 || /[^A-Za-z0-9]/.test(password)) score++;
    if (score === 1) return { level: 1, label: "Lemah", color: "bg-tertiary-container" };
    if (score === 2) return { level: 2, label: "Sedang", color: "bg-primary" };
    return { level: 3, label: "Kuat", color: "bg-secondary" };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedNick = nickname.trim();
    if (trimmedNick.length < 2 || trimmedNick.length > 30) {
      setError("Nama panggilan harus terdiri dari 2 hingga 30 karakter.");
      return;
    }
    if (!email.trim()) {
      setError("Alamat email wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setLoading(true);
    try {
      const data = await signUp({
        email: email.trim(),
        password,
        nickname: trimmedNick,
      });

      if (data?.session) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/check-email", { state: { email: email.trim() }, replace: true });
      }
    } catch (err) {
      setError(err.message || "Gagal mendaftar. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex flex-col w-full items-center justify-center relative">
        {/* Subtle decorative ambient blurs */}
        <div className="absolute -top-12 -left-16 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-96 h-96 rounded-full bg-secondary-container/25 blur-3xl pointer-events-none" />

        {/* Brand Logo Header */}
        <div className="mb-space-md flex flex-col items-center text-center max-w-md">
          <img
            src="/logopcos.png"
            alt="PCOSmart — Better Understanding, Better Living"
            className="h-9 sm:h-11 w-auto mx-auto object-contain select-none"
          />
        </div>

        {/* Main Sign-up Card Container (Max 440px) */}
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-lg p-5 sm:p-[40px] shadow-[0_12px_36px_-6px_rgba(108,74,182,0.08),0_2px_10px_-2px_rgba(108,74,182,0.04)] relative z-10">
          {/* Header Section */}
          <div className="flex flex-col items-start gap-space-xs mb-space-md sm:mb-space-lg">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px] fill-1">auto_awesome</span>
              <span>PCOSmart ID</span>
            </div>
            <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface tracking-tight mt-1">
              Buat Akun Baru
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Langkah awal merawat harmoni tubuh dan memahami ritme PCOS dengan tenang.
            </p>
          </div>

          {displayError && (
            <div className="w-full bg-error-container/70 rounded-DEFAULT p-space-md mb-space-md flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-[20px] text-error fill-1 mt-0.5">
                error
              </span>
              <p className="font-body-sm text-body-sm text-on-error-container font-medium">
                {displayError}
              </p>
            </div>
          )}

          {/* Registration Form */}
          <form className="flex flex-col gap-space-lg" onSubmit={handleSubmit}>
            {/* Field 1: Nama Panggilan */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="nickname">
                  Nama panggilan
                </label>
                {isNickValid && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                    <span>Nama valid</span>
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Misal: Nadia"
                  maxLength={30}
                  required
                  className="w-full h-[52px] px-space-md rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none transition-all placeholder:text-outline/60 focus:bg-surface-container-low focus:shadow-[0_0_0_3px_rgba(108,74,182,0.18)]"
                />
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant px-space-xs">
                2-30 karakter. Nama yang membuatmu nyaman disapa.
              </p>
            </div>

            {/* Field 2: Email */}
            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
                Email
              </label>
              <div className="relative flex items-center">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  required
                  className="w-full h-[52px] px-space-md rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none transition-all placeholder:text-outline/60 focus:bg-surface-container-low focus:shadow-[0_0_0_3px_rgba(108,74,182,0.18)]"
                />
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant px-space-xs">
                Kami akan mengirimkan tautan aktivasi ke email ini.
              </p>
            </div>

            {/* Field 3: Kata Sandi */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
                  Kata sandi
                </label>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">
                  Min. 8 karakter
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi aman"
                  required
                  className="w-full h-[52px] pl-space-md pr-12 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none transition-all placeholder:text-outline/60 focus:bg-surface-container-low focus:shadow-[0_0_0_3px_rgba(108,74,182,0.18)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                  className="absolute right-3 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>

              {/* Password Strength Meter */}
              <div className="flex flex-col gap-1.5 mt-1 px-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Kekuatan kata sandi
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container flex gap-1 p-0.5">
                  {[1, 2, 3].map((seg) => (
                    <div
                      key={seg}
                      className={`flex-1 h-full rounded-full transition-colors ${passwordStrength.level >= seg ? passwordStrength.color : "bg-transparent"
                        }`}
                    />
                  ))}
                </div>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant px-space-xs">
                Minimal 8 karakter, kombinasi huruf dan angka.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-space-xs mt-space-sm group disabled:opacity-60"
            >
              <span>{loading ? "Mendaftarkan..." : "Daftar"}</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-surface-container-highest" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                atau daftar cepat
              </span>
              <div className="flex-1 h-px bg-surface-container-highest" />
            </div>

            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignUp}
              className="w-full h-12 rounded-full bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container-highest text-on-surface font-label-lg text-label-lg font-bold flex items-center justify-center gap-2.5 shadow-2xs active:scale-[0.99] transition-all disabled:opacity-60"
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
                {googleLoading ? "Menghubungkan Google..." : "Daftar dengan Akun Google"}
              </span>
            </button>

            {/* Sign In Switcher Link */}
            <div className="text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sudah punya akun?
                <Link
                  to="/login"
                  className="font-label-lg text-label-lg text-primary hover:text-primary-container underline underline-offset-4 ml-1 transition-colors"
                >
                  Masuk
                </Link>
              </p>
            </div>
          </form>

          {/* Friendly Privacy Security Note */}
          <div className="mt-space-lg pt-space-md rounded-2xl bg-surface-container-low p-space-sm flex items-start gap-space-sm">
            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[15px] text-secondary">
                verified_user
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
              Data kesehatanmu dienkripsi dan dijaga dengan privasi tingkat tinggi.
            </p>
          </div>
        </div>

        {/* Medical Educational Micro-Footnote */}
        <div className="mt-space-md text-center max-w-sm">
          <p className="font-label-sm text-label-sm text-on-surface-variant/80">
            Dirancang bersama praktisi kesehatan reproduksi wanita untuk manajemen gaya hidup
            holistik PCOS.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
