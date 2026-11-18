const DEFAULT_NON_FOOD_REPLY =
  "Foto ini belum terbaca dengan jelas sebagai makanan atau minuman. Coba ambil ulang foto menu makanmu di tempat terang agar bisa dianalisis skor ramah PCOS-nya ya!";

function makeNonFoodResult(assistantReply = DEFAULT_NON_FOOD_REPLY) {
  return {
    is_food: false,
    meal_name: null,
    detected_items: [],
    pcos_score: null,
    gi_category: null,
    glycemic_impact: "",
    balancing_tips: [],
    assistant_reply: assistantReply,
  };
}

/**
 * Safely parse and normalize local/DEV Gemini JSON output for meal analysis.
 * Always fails closed to non-food when input is malformed or `is_food` is false.
 */
export function normalizeMealLocal(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      obj = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return makeNonFoodResult();
      try {
        obj = JSON.parse(m[0]);
      } catch {
        return makeNonFoodResult();
      }
    }
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return makeNonFoodResult();
  }

  const isFood =
    obj.is_food === true ||
    (typeof obj.is_food === "string" && obj.is_food.trim().toLowerCase() === "true");

  const assistantReply =
    typeof obj.assistant_reply === "string" && obj.assistant_reply.trim()
      ? obj.assistant_reply.trim()
      : isFood
      ? "Berikut perkiraan skor ramah PCOS untuk menu makananmu."
      : DEFAULT_NON_FOOD_REPLY;

  if (!isFood) {
    return makeNonFoodResult(assistantReply);
  }

  const hasNumericScore =
    typeof obj.pcos_score === "number" ||
    (typeof obj.pcos_score === "string" && obj.pcos_score.trim() !== "");
  const rawScore = hasNumericScore ? Number(obj.pcos_score) : Number.NaN;
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 70;

  const rawGi =
    typeof obj.gi_category === "string" ? obj.gi_category.trim().toLowerCase() : "sedang";
  const giCategory = ["rendah", "sedang", "tinggi"].includes(rawGi) ? rawGi : "sedang";

  const mealName =
    typeof obj.meal_name === "string" && obj.meal_name.trim()
      ? obj.meal_name.trim()
      : "Menu Makanan";

  return {
    is_food: true,
    meal_name: mealName,
    detected_items: Array.isArray(obj.detected_items)
      ? obj.detected_items.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 6)
      : [],
    pcos_score: score,
    gi_category: giCategory,
    glycemic_impact:
      typeof obj.glycemic_impact === "string" ? obj.glycemic_impact.trim() : "",
    balancing_tips: Array.isArray(obj.balancing_tips)
      ? obj.balancing_tips.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 3)
      : [],
    assistant_reply: assistantReply,
  };
}

/**
 * Resolve meal_analysis and replyText when running locally in DEV mode or offline fallback.
 * Never fabricates a 74/100 card if Gemini actually returned non-empty (malformed or non-food) output.
 */
export function resolveLocalMealFallbackReply({ rawText }) {
  if (typeof rawText === "string" && rawText.trim().length > 0) {
    const parsed = normalizeMealLocal(rawText);
    return {
      mealAnalysis: parsed.is_food ? parsed : null,
      replyText: parsed.assistant_reply,
    };
  }

  const offlineMeal = {
    is_food: true,
    meal_name: "Nasi Putih & Telur Balado (Mode Offline)",
    detected_items: ["Nasi putih", "Telur balado", "Tumis sayur"],
    pcos_score: 74,
    gi_category: "sedang",
    glycemic_impact:
      "Kombinasi karbohidrat sederhana dengan protein telur dan serat sayur menjaga lonjakan gula darah tetap moderat.",
    balancing_tips: [
      "Mulai makan dari tumis sayur terlebih dahulu sebelum nasi.",
      "Kurangi sekitar 1/4 porsi nasi bila merasa cepat mengantuk setelah makan.",
    ],
    assistant_reply:
      "Analisis mode offline (contoh perkiraan edukatif): menu sepiring ini tergolong cukup ramah PCOS dengan skor perkiraan 74/100 dan IG sedang.",
  };

  return {
    mealAnalysis: offlineMeal,
    replyText: offlineMeal.assistant_reply,
  };
}

/**
 * Format persisted user message content for meal mode identically to Edge Function chat/index.ts.
 */
export function formatLocalMealUserContent(
  mealAnalysis,
  note = "",
  safetyShortCircuit = false
) {
  const cleanNote = String(note || "").trim();
  if (safetyShortCircuit) {
    return cleanNote || "[Foto Makanan]";
  }
  if (mealAnalysis && mealAnalysis.is_food === true && mealAnalysis.meal_name) {
    const header = `[Foto Makanan: ${mealAnalysis.meal_name} • Skor PCOS ${mealAnalysis.pcos_score}/100 (IG ${mealAnalysis.gi_category})]`;
    return cleanNote ? `${header}\n${cleanNote}` : header;
  }
  const nonFoodHeader = "[Foto Bukan Makanan / Tidak Jelas]";
  return cleanNote ? `${nonFoodHeader}\n${cleanNote}` : nonFoodHeader;
}
