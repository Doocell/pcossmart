import { Logo } from "@/components/layout/Logo";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  HeartIcon,
} from "@/components/ui/icons";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/*
 * HALAMAN SEMENTARA (development placeholder).
 * Hanya untuk membuktikan fondasi frontend berjalan. Bukan halaman fitur,
 * akan diganti pada execution task berikutnya.
 */

const palette = [
  { name: "Primary", hex: "#54309C", swatch: "bg-primary", usage: "Tombol utama, logo" },
  { name: "Primary light", hex: "#6C48B4", swatch: "bg-primary-light", usage: "Aksen, hover" },
  { name: "Background", hex: "#FFF7FF", swatch: "bg-background", usage: "Latar halaman" },
  { name: "Tint", hex: "#F8F0FC", swatch: "bg-tint", usage: "Latar chip dan input" },
  { name: "Tint strong", hex: "#F0E4F9", swatch: "bg-tint-strong", usage: "Tab, kartu ringan" },
  { name: "Lilac", hex: "#E8DCF4", swatch: "bg-lilac", usage: "Lingkaran logo, hover" },
  { name: "Teal", hex: "#006860", swatch: "bg-teal", usage: "Teks aksen positif" },
  { name: "Teal soft", hex: "#D4F4F4", swatch: "bg-teal-soft", usage: "Latar badge" },
  { name: "Mint", hex: "#98F0E4", swatch: "bg-mint", usage: "Tombol sekunder" },
  { name: "Peach", hex: "#FCD8D0", swatch: "bg-peach", usage: "Kartu saran hangat" },
  { name: "Clay", hex: "#783018", swatch: "bg-clay", usage: "Teks di atas peach" },
  { name: "Ink", hex: "#1C1824", swatch: "bg-ink", usage: "Teks utama" },
];

export default function Home() {
  const supabaseConfigured = getSupabasePublicEnv() !== null;

  return (
    <PageContainer className="flex flex-1 flex-col gap-6 py-6 sm:py-8 lg:max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <Badge tone="peach">Placeholder pengembangan</Badge>
      </header>

      <div className="rounded-card bg-linear-to-br from-tint-strong via-tint to-teal-soft p-6 sm:p-8">
        <Badge tone="teal">
          <HeartIcon className="size-4" />
          Sahabat Perjalanan Hormonmu
        </Badge>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Selamat Datang di PCOSmart
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          Ruang aman dan teman setia untuk merawat ritme tubuhmu setiap hari.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
          Halaman ini hanya penanda bahwa fondasi frontend (Execution Task 01)
          sudah berjalan. Fitur aplikasi belum dibuat.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-ink">Status fondasi</h2>
          <ul className="mt-4 flex flex-col gap-3 text-base text-ink-muted">
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-teal" />
              <span>Next.js App Router + TypeScript</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-teal" />
              <span>Tailwind CSS dengan design tokens PCOSmart</span>
            </li>
            <li className="flex items-start gap-3">
              {supabaseConfigured ? (
                <>
                  <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-teal" />
                  <span>Supabase: URL dan anon key terisi di .env.local</span>
                </>
              ) : (
                <>
                  <AlertCircleIcon className="mt-0.5 size-5 shrink-0 text-clay" />
                  <span>
                    Supabase: env belum diisi. Salin{" "}
                    <code className="rounded bg-tint px-1.5 py-0.5 text-sm text-ink">
                      .env.local.example
                    </code>{" "}
                    menjadi{" "}
                    <code className="rounded bg-tint px-1.5 py-0.5 text-sm text-ink">
                      .env.local
                    </code>
                    .
                  </span>
                </>
              )}
            </li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Pratinjau komponen</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Hanya contoh tampilan, belum terhubung ke fitur apa pun.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Button fullWidth>Primary</Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="soft" size="md">
                Soft
              </Button>
              <Button variant="mint" size="md">
                Mint
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge>Tint</Badge>
              <Badge tone="teal">Teal</Badge>
              <Badge tone="peach">Peach</Badge>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold text-ink">Palet warna</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Diambil dari desain Figma (PDF ekspor).
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {palette.map((color) => (
              <li key={color.name} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`size-10 shrink-0 rounded-full ring-1 ring-ink/15 ${color.swatch}`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {color.name}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {color.hex} · {color.usage}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card tone="tint">
        <h2 className="text-base font-bold text-primary">Catatan Kesehatan</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          PCOSmart bukan alat diagnosis. Seluruh panduan dirancang untuk
          mendukung gaya hidup sehat dan melengkapi saran dokter spesialis
          obstetri &amp; ginekologimu.
        </p>
      </Card>
    </PageContainer>
  );
}
