import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";
import { supabase } from "../lib/supabase";

export default function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email || "nadia.paramitha@example.com";

  const [timeLeft, setTimeLeft] = useState(48);
  const [toastVisible, setToastVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const handleResend = async () => {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      if (location.state?.email) {
        const { error: resendErr } = await supabase.auth.resend({
          type: "signup",
          email: location.state.email,
        });
        if (resendErr) throw resendErr;
      }
      setTimeLeft(60);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } catch (err) {
      setError(err.message || "Gagal mengirim ulang email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex flex-col w-full items-center justify-center relative">
        {/* Subtle decorative ambient glows */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-16 left-1/3 w-80 h-80 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Main Centered Confirmation Card */}
        <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-lg p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-8px_rgba(108,74,182,0.08),0_4px_12px_-2px_rgba(108,74,182,0.04)] flex flex-col items-center text-center transition-all">
          {/* Large Soft Illustration Badge */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-[#EDE1F8] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[44px] text-primary fill-1">
                mail
              </span>
            </div>
            {/* Teal Verification Checkmark Badge */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center shadow-md ring-4 ring-surface-container-lowest">
              <span className="material-symbols-outlined text-[20px] font-bold">check</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2 tracking-tight">
            Cek emailmu
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Tautan konfirmasi telah kami kirimkan ke:
          </p>

          {/* Email Chip Container */}
          <div className="inline-flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full shadow-sm max-w-full mb-5">
            <span className="material-symbols-outlined text-[18px] text-primary">
              alternate_email
            </span>
            <span className="font-label-lg text-label-lg text-primary truncate max-w-[260px]">
              {email}
            </span>
          </div>

          {/* Friendly Instruction */}
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-6">
            Buka pesan tersebut dan klik tautan konfirmasi untuk mengaktifkan akun PCOSmart kamu.
          </p>

          {error && (
            <div className="w-full mb-4 p-3 rounded-DEFAULT bg-error-container text-on-error-container font-body-sm">
              {error}
            </div>
          )}

          {/* Secondary Tonal Box for Resend Action */}
          <div className="w-full bg-surface-container-low rounded-lg p-space-md flex flex-col items-center gap-space-sm mb-5 transition-colors">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md">
              <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              {timeLeft > 0 ? (
                <span>
                  Kirim ulang email tersedia dalam{" "}
                  <strong className="text-primary font-label-lg text-label-lg">{timeLeft}</strong>s
                </span>
              ) : (
                <span>Belum menerima email verifikasi?</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 0 || loading}
              className={`w-full h-11 px-space-md rounded-full font-label-md text-label-md flex items-center justify-center gap-space-xs transition-all ${
                timeLeft > 0 || loading
                  ? "cursor-not-allowed opacity-50 bg-surface-container-highest text-on-surface-variant"
                  : "cursor-pointer bg-primary-container text-on-primary hover:opacity-90 shadow-sm"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{loading ? "Mengirim..." : "Kirim ulang email"}</span>
            </button>
          </div>

          {/* Tip Note with Calm Soft Styling */}
          <div className="flex items-start gap-space-xs text-left bg-surface-container/60 rounded-DEFAULT p-3 mb-6 w-full">
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5 fill-1">
              lightbulb
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              <strong>Tidak menemukan email?</strong> Coba periksa folder spam atau tab promosi ya.
            </p>
          </div>

          {/* Action Link: Back to Login */}
          <Link
            to="/login"
            className="group inline-flex items-center justify-center gap-space-xs w-full py-2.5 rounded-full font-label-lg text-label-lg text-primary hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>
            <span>Kembali ke Halaman Masuk</span>
          </Link>

          {/* Divider Decorator */}
          <div className="w-12 h-1 rounded-full bg-surface-container-highest my-5" />

          {/* Reassurance Footer Note */}
          <div className="flex items-center justify-center gap-1.5 text-on-surface-variant/80">
            <span className="material-symbols-outlined text-[16px] text-secondary fill-1">
              verified_user
            </span>
            <span className="font-label-sm text-label-sm tracking-normal">
              Data privasimu selalu aman dan terlindungi bersama kami.
            </span>
          </div>
        </div>

        {/* Notification Toast */}
        <div
          className={`fixed bottom-6 z-50 transform transition-all duration-300 ease-out flex items-center gap-2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-full shadow-lg ${
            toastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-16 opacity-0 pointer-events-none"
          }`}
        >
          <span className="material-symbols-outlined text-secondary-fixed text-[20px] fill-1">
            mark_email_read
          </span>
          <span className="font-label-md text-label-md">
            Tautan baru telah dikirimkan ke emailmu!
          </span>
        </div>
      </div>
    </PublicLayout>
  );
}
