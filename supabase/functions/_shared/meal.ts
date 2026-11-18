import type { ChatContext } from './context.ts'

export const ALLOWED_MEAL_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedMealMime = (typeof ALLOWED_MEAL_MIMES)[number]
export const MAX_IMAGE_BASE64_LEN = 2_000_000

export type GiCategory = 'rendah' | 'sedang' | 'tinggi'

export interface MealImageInput {
  mime_type: AllowedMealMime
  data: string
}

export interface MealAnalysisResult {
  is_food: boolean
  meal_name: string
  detected_items: string[]
  pcos_score: number | null
  gi_category: GiCategory | null
  glycemic_impact: string
  balancing_tips: string[]
  assistant_reply: string
}

const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/

export function validateMealImageInput(
  raw: unknown,
): { ok: true; value: MealImageInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Foto makanan wajib disertakan.' }
  }
  const obj = raw as Record<string, unknown>
  const mime = typeof obj.mime_type === 'string' ? obj.mime_type.trim().toLowerCase() : ''
  if (!ALLOWED_MEAL_MIMES.includes(mime as AllowedMealMime)) {
    return {
      ok: false,
      error: 'Format gambar harus JPEG, PNG, atau WebP.',
    }
  }
  const rawData = typeof obj.data === 'string' ? obj.data.replace(/\s+/g, '') : ''
  if (!rawData) {
    return { ok: false, error: 'Data gambar tidak boleh kosong.' }
  }
  if (rawData.length > MAX_IMAGE_BASE64_LEN) {
    return {
      ok: false,
      error: 'Ukuran gambar terlalu besar. Coba pilih foto dengan ukuran lebih kecil.',
    }
  }
  if (!BASE64_PATTERN.test(rawData) || rawData.length % 4 === 1) {
    return { ok: false, error: 'Encoding gambar tidak valid.' }
  }
  return {
    ok: true,
    value: {
      mime_type: mime as AllowedMealMime,
      data: rawData,
    },
  }
}

function normalizeGiCategory(val: unknown): GiCategory | null {
  const lower = typeof val === 'string' ? val.trim().toLowerCase() : ''
  if (lower.includes('rendah') || lower === 'low') return 'rendah'
  if (lower.includes('sedang') || lower.includes('menengah') || lower === 'medium') {
    return 'sedang'
  }
  if (lower.includes('tinggi') || lower === 'high') return 'tinggi'
  return null
}

function defaultNonFoodReply(): string {
  return 'Foto yang dikirim belum terlihat jelas sebagai makanan atau minuman ya. Coba ambil ulang foto piring atau gelasmu di tempat yang terang supaya aku bisa mengenali menunya dengan lebih akurat.'
}

export function parseMealAnalysisResponse(rawText: string): MealAnalysisResult {
  const cleaned = (rawText || '').trim()
  let parsed: Record<string, unknown> | null = null

  try {
    const candidate = JSON.parse(cleaned)
    if (candidate && typeof candidate === 'object') {
      parsed = candidate as Record<string, unknown>
    }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        const candidate = JSON.parse(match[0])
        if (candidate && typeof candidate === 'object') {
          parsed = candidate as Record<string, unknown>
        }
      } catch {
        parsed = null
      }
    }
  }

  if (!parsed) {
    return {
      is_food: false,
      meal_name: '',
      detected_items: [],
      pcos_score: null,
      gi_category: null,
      glycemic_impact: '',
      balancing_tips: [],
      assistant_reply: defaultNonFoodReply(),
    }
  }

  const isFood = Boolean(parsed.is_food)
  const assistantReply =
    typeof parsed.assistant_reply === 'string' && parsed.assistant_reply.trim()
      ? parsed.assistant_reply.trim()
      : isFood
      ? 'Berikut perkiraan skor ramah PCOS untuk menu makananmu.'
      : defaultNonFoodReply()

  if (!isFood) {
    return {
      is_food: false,
      meal_name: '',
      detected_items: [],
      pcos_score: null,
      gi_category: null,
      glycemic_impact: '',
      balancing_tips: [],
      assistant_reply: assistantReply,
    }
  }

  const rawScore = Number(parsed.pcos_score)
  const clampedScore = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 65

  const giCategory =
    normalizeGiCategory(parsed.gi_category) ??
    (clampedScore >= 75 ? 'rendah' : clampedScore >= 50 ? 'sedang' : 'tinggi')

  const detectedItems = Array.isArray(parsed.detected_items)
    ? parsed.detected_items
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, 12)
    : []

  const balancingTips = Array.isArray(parsed.balancing_tips)
    ? parsed.balancing_tips
        .map((tip) => (typeof tip === 'string' ? tip.trim() : ''))
        .filter(Boolean)
        .slice(0, 3)
    : []

  const mealName =
    typeof parsed.meal_name === 'string' && parsed.meal_name.trim()
      ? parsed.meal_name.trim().slice(0, 120)
      : detectedItems.slice(0, 3).join(', ') || 'Menu Makanan'

  const glycemicImpact =
    typeof parsed.glycemic_impact === 'string' && parsed.glycemic_impact.trim()
      ? parsed.glycemic_impact.trim()
      : 'Perkiraan dampak glikemik didasarkan pada keseimbangan karbohidrat, protein, dan serat yang terlihat pada foto.'

  return {
    is_food: true,
    meal_name: mealName,
    detected_items: detectedItems,
    pcos_score: clampedScore,
    gi_category: giCategory,
    glycemic_impact: glycemicImpact,
    balancing_tips: balancingTips,
    assistant_reply: assistantReply,
  }
}

export function formatMealUserContent(
  analysis: MealAnalysisResult | null,
  userNote: string,
): string {
  const note = (userNote || '').trim()
  const header =
    analysis && analysis.is_food && analysis.meal_name && analysis.pcos_score !== null && analysis.gi_category
      ? `[Foto Makanan: ${analysis.meal_name} • Skor PCOS ${analysis.pcos_score}/100 (IG ${analysis.gi_category})]`
      : '[Foto Bukan Makanan / Tidak Jelas]'

  return note ? `${header}\n${note}` : header
}

export function buildMealAnalysisPrompt(message: string, context: ChatContext): string {
  let prompt = 'Tugas khusus: Analisis foto makanan pengguna untuk pendampingan nutrisi ramah PCOS berbasis perkiraan Indeks Glikemik (IG).\n'
  prompt += 'Prinsip utama:\n'
  prompt += '- JANGAN menghitung atau menuliskan angka kalori, gram diet ketat, atau diagnosis medis.\n'
  prompt += '- Fokus pada keseimbangan gula darah / resistensi insulin (Piring Seimbang: serat sayur, protein, lemak sehat, karbohidrat kompleks).\n'
  prompt += '- Jika foto BUKAN makanan/minuman atau terlalu gelap/buram sehingga makanan tidak bisa dikenali, wajib isi "is_food": false, pcos_score: null, gi_category: null, dan minta foto yang lebih jelas dengan ramah di "assistant_reply".\n\n'

  if (context.todayCheckin) {
    const c = context.todayCheckin
    prompt += 'Kondisi check-in pengguna hari ini:\n'
    prompt += `- Energi: ${c.energy}/5, Mood: ${c.mood}/5, Haid: ${c.on_period ? 'Ya' : 'Tidak'}\n`
    if (c.symptoms && c.symptoms.length > 0) {
      prompt += `- Gejala: ${c.symptoms.join(', ')}\n`
    }
    prompt += '\n'
  }

  if (context.recentMessages.length > 0) {
    prompt += 'Konteks percakapan terakhir:\n'
    context.recentMessages.slice(-4).forEach((m) => {
      prompt += `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}\n`
    })
    prompt += '\n'
  }

  const trimmedMsg = (message || '').trim()
  prompt += `Catatan pengguna: ${trimmedMsg || 'Tolong analisis foto makanan ini.'}\n\n`
  prompt += 'Kembalikan HANYA JSON valid dengan skema persis berikut:\n'
  prompt += JSON.stringify(
    {
      is_food: true,
      meal_name: 'Nama singkat hidangan (Bahasa Indonesia)',
      detected_items: ['komponen 1', 'komponen 2'],
      pcos_score: 75,
      gi_category: 'rendah | sedang | tinggi',
      glycemic_impact: 'Penjelasan singkat 1-2 kalimat tentang perkiraan respons gula darah/insulin dari komposisi hidangan ini.',
      balancing_tips: [
        'Saran praktis Piring Seimbang 1 (mis. mulai makan sayur/protein dulu)',
        'Saran praktis Piring Seimbang 2',
      ],
      assistant_reply: 'Pesan empatik singkat (2-4 kalimat Bahasa Indonesia) tanpa angka kalori.',
    },
    null,
    2,
  )

  return prompt
}
