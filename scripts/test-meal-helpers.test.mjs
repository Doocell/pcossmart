import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_MEAL_MIMES,
  MAX_IMAGE_BASE64_LEN,
  formatMealUserContent,
  parseMealAnalysisResponse,
  validateMealImageInput,
} from "../supabase/functions/_shared/meal.ts";

describe("validateMealImageInput", () => {
  it("accepts valid jpeg base64 payload within size limit", () => {
    const res = validateMealImageInput({
      mime_type: "image/jpeg",
      data: "aGVsbG8td29ybGQ=",
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.value.mime_type, "image/jpeg");
      assert.equal(res.value.data, "aGVsbG8td29ybGQ=");
    }
  });

  it("rejects unsupported mime types such as image/gif", () => {
    assert.deepEqual(ALLOWED_MEAL_MIMES, ["image/jpeg", "image/png", "image/webp"]);
    const res = validateMealImageInput({
      mime_type: "image/gif",
      data: "aGVsbG8=",
    });
    assert.equal(res.ok, false);
  });

  it("rejects empty or non-base64 strings", () => {
    assert.equal(validateMealImageInput({ mime_type: "image/png", data: "" }).ok, false);
    assert.equal(
      validateMealImageInput({ mime_type: "image/png", data: "not!valid*base64@@@" }).ok,
      false
    );
  });

  it("rejects payloads larger than MAX_IMAGE_BASE64_LEN", () => {
    assert.equal(MAX_IMAGE_BASE64_LEN, 2_000_000);
    const oversized = "A".repeat(MAX_IMAGE_BASE64_LEN + 4);
    const res = validateMealImageInput({ mime_type: "image/webp", data: oversized });
    assert.equal(res.ok, false);
  });
});

describe("parseMealAnalysisResponse", () => {
  it("normalizes valid food JSON and clamps score to 0..100", () => {
    const raw = JSON.stringify({
      is_food: true,
      meal_name: "Nasi Putih & Ayam Bakar",
      detected_items: ["Nasi putih", "Ayam bakar", "Lalapan"],
      pcos_score: 120.4,
      gi_category: "Tinggi",
      glycemic_impact: "Nasi putih cukup cepat menaikkan gula darah.",
      balancing_tips: ["Dahului makan sayur dan ayam sebelum nasi.", "Kurangi 1/4 porsi nasi."],
      assistant_reply: "Menu ini sudah mengandung protein bagus dari ayam bakar.",
    });
    const parsed = parseMealAnalysisResponse(raw);
    assert.equal(parsed.is_food, true);
    assert.equal(parsed.meal_name, "Nasi Putih & Ayam Bakar");
    assert.deepEqual(parsed.detected_items, ["Nasi putih", "Ayam bakar", "Lalapan"]);
    assert.equal(parsed.pcos_score, 100);
    assert.equal(parsed.gi_category, "tinggi");
    assert.equal(parsed.balancing_tips.length, 2);
  });

  it("clears nutrition fields when is_food is false", () => {
    const raw = JSON.stringify({
      is_food: false,
      meal_name: "Laptop",
      detected_items: ["Keyboard"],
      pcos_score: 50,
      gi_category: "sedang",
      glycemic_impact: "N/A",
      balancing_tips: ["Ambil foto makanan"],
      assistant_reply: "Foto belum menunjukkan makanan ya. Coba foto piring makanmu dari atas.",
    });
    const parsed = parseMealAnalysisResponse(raw);
    assert.equal(parsed.is_food, false);
    assert.equal(parsed.pcos_score, null);
    assert.equal(parsed.gi_category, null);
    assert.deepEqual(parsed.detected_items, []);
    assert.match(parsed.assistant_reply, /makanan/i);
  });

  it("falls back safely when LLM output is malformed non-JSON", () => {
    const parsed = parseMealAnalysisResponse("Maaf saya bingung memproses gambar ini.");
    assert.equal(parsed.is_food, false);
    assert.equal(parsed.pcos_score, null);
    assert.equal(parsed.gi_category, null);
    assert.ok(parsed.assistant_reply.length > 0);
  });
});

describe("formatMealUserContent", () => {
  it("formats food analysis summary with optional user note", () => {
    const text = formatMealUserContent(
      {
        is_food: true,
        meal_name: "Gado-gado Lontong",
        detected_items: ["Sayuran", "Telur", "Bumbu kacang", "Lontong"],
        pcos_score: 78,
        gi_category: "sedang",
        glycemic_impact: "Sayur dan protein telur membantu meredam gula darah.",
        balancing_tips: ["Makan sayur terlebih dahulu."],
        assistant_reply: "Pilihan yang seimbang!",
      },
      "Ini makan siangku"
    );
    assert.equal(
      text,
      "[Foto Makanan: Gado-gado Lontong • Skor PCOS 78/100 (IG sedang)]\nIni makan siangku"
    );
  });

  it("formats food summary without trailing newline when note is empty", () => {
    const text = formatMealUserContent(
      {
        is_food: true,
        meal_name: "Oatmeal Chia",
        detected_items: ["Oat", "Chia seeds"],
        pcos_score: 88,
        gi_category: "rendah",
        glycemic_impact: "Serat larut tinggi.",
        balancing_tips: [],
        assistant_reply: "Bagus!",
      },
      "   "
    );
    assert.equal(text, "[Foto Makanan: Oatmeal Chia • Skor PCOS 88/100 (IG rendah)]");
  });

  it("formats unclear/non-food placeholder cleanly", () => {
    assert.equal(
      formatMealUserContent(null, ""),
      "[Foto Bukan Makanan / Tidak Jelas]"
    );
  });
});
