const GI_BADGE_MAP = {
  rendah: {
    label: "IG Rendah",
    badgeClass: "bg-secondary-container text-on-secondary-container",
    scoreClass: "bg-secondary-fixed/60 text-secondary",
    icon: "eco",
  },
  sedang: {
    label: "IG Sedang",
    badgeClass: "bg-primary-fixed text-primary",
    scoreClass: "bg-primary-fixed/60 text-primary",
    icon: "balance",
  },
  tinggi: {
    label: "IG Tinggi",
    badgeClass: "bg-tertiary-fixed text-tertiary",
    scoreClass: "bg-tertiary-fixed/70 text-tertiary",
    icon: "lightbulb",
  },
};

/**
 * Displays structured PCOS-friendly meal analysis and glycemic balance tips.
 */
export default function MealScoreCard({ analysis }) {
  if (!analysis || analysis.is_food === false) return null;

  const giMeta = GI_BADGE_MAP[analysis.gi_category] || GI_BADGE_MAP.sedang;
  const score = Number.isFinite(Number(analysis.pcos_score))
    ? Math.max(0, Math.min(100, Math.round(Number(analysis.pcos_score))))
    : 70;
  const items = Array.isArray(analysis.detected_items) ? analysis.detected_items : [];
  const tips = Array.isArray(analysis.balancing_tips) ? analysis.balancing_tips : [];

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 shadow-md border border-outline-variant/20 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary via-primary to-primary-container" />

      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">restaurant</span>
            <span>Skor Ramah PCOS</span>
          </span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug break-words">
            {analysis.meal_name || "Menu Makanan"}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-3 py-1.5 rounded-2xl flex items-baseline gap-1 font-bold tabular-nums ${giMeta.scoreClass}`}
          >
            <span className="text-[20px] leading-none">{score}</span>
            <span className="text-[11px] opacity-80">/100</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold ${giMeta.badgeClass}`}
          >
            <span className="material-symbols-outlined text-[14px]">{giMeta.icon}</span>
            <span>{giMeta.label}</span>
          </span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-surface-container-highest/50">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold block mb-1.5">
            Komponen Terdeteksi
          </span>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.glycemic_impact && (
        <div className="mt-3 p-3 rounded-lg bg-surface-container-low">
          <span className="font-label-sm text-label-sm text-primary font-bold block mb-0.5">
            Perkiraan Dampak Glikemik
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            {analysis.glycemic_impact}
          </p>
        </div>
      )}

      {tips.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">spa</span>
            <span>Saran Piring Seimbang</span>
          </span>
          <ul className="flex flex-col gap-1.5">
            {tips.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface leading-relaxed"
              >
                <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 pt-2.5 border-t border-surface-container-highest/40 font-label-sm text-[11px] text-outline flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px] shrink-0">info</span>
        <span>Perkiraan edukatif berbasis visual foto, bukan alat ukur glukosa medis.</span>
      </p>
    </div>
  );
}
