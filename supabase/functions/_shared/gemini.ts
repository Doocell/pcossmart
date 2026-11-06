/**
 * Gemini API integration
 */

import type { ChatContext } from './context.ts'

export interface GeminiResponse {
  text: string
  card: any | null
  sources: Array<{ title: string; article_id: string | null; url: string | null }>
}

/**
 * Build system prompt untuk Gemini
 */
function buildSystemPrompt(): string {
  return `Kamu adalah asisten kesehatan yang mendukung perempuan dengan PCOS. 
Tugasmu:
- Berikan informasi yang akurat dan empatik
- Fokus pada gaya hidup sehat (makanan, olahraga, tidur, stres)
- Jangan memberikan diagnosis medis atau resep obat
- Sarankan konsultasi dokter untuk keluhan serius
- Gunakan bahasa Indonesia yang ramah dan mudah dipahami
- Jika ada data check-in, berikan saran spesifik berdasarkan kondisi pengguna

PENTING: Jangan pernah menyarankan bunuh diri atau hal berbahaya.`
}

/**
 * Build user prompt dengan konteks lengkap
 */
function buildUserPrompt(
  message: string,
  context: ChatContext,
  mode: string,
  tasks: string[],
): string {
  let prompt = ''

  // 1. Riwayat chat
  if (context.recentMessages.length > 0) {
    prompt += 'Riwayat percakapan terakhir:\n'
    context.recentMessages.forEach((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Asisten'
      prompt += `${role}: ${msg.content}\n`
    })
    prompt += '\n'
  }

  // 2. Check-in hari ini
  if (context.todayCheckin) {
    const c = context.todayCheckin
    prompt += `Data check-in hari ini:\n`
    prompt += `- Haid: ${c.on_period ? 'Ya' : 'Tidak'}\n`
    prompt += `- Energi: ${c.energy}/5\n`
    prompt += `- Mood: ${c.mood}/5\n`
    if (c.sleep_hours) prompt += `- Tidur: ${c.sleep_hours} jam\n`
    if (c.symptoms && c.symptoms.length > 0) {
      prompt += `- Gejala: ${c.symptoms.join(', ')}\n`
    }
    prompt += '\n'
  }

  // 3. Ringkasan 7 hari
  prompt += context.last7DaysSummary + '\n\n'

  // 4. Artikel relevan
  if (context.relevantArticles.length > 0) {
    prompt += 'Informasi referensi:\n'
    context.relevantArticles.forEach((article) => {
      prompt += `Judul: ${article.title}\n`
      // Ambil 500 karakter pertama dari body
      const preview = article.body.substring(0, 500)
      prompt += `Isi: ${preview}...\n\n`
    })
  }

  // 5. Mode dan tasks
  if (mode === 'recommendation') {
    prompt += '\nMode: Rekomendasi Harian\n'
    if (tasks.length > 0) {
      prompt += `Tugas hari ini: ${tasks.join(', ')}\n`
    }
    prompt +=
      '\nBerikan rekomendasi harian dalam format JSON dengan struktur:\n'
    prompt += JSON.stringify(
      {
        beban: 'ringan/sedang/normal',
        aktivitas: ['aktivitas 1', 'aktivitas 2', 'aktivitas 3'],
        tips_istirahat: 'tips tidur',
        prioritas_tugas:
          tasks.length > 0 ? ['tugas prioritas 1', 'tugas 2'] : null,
      },
      null,
      2,
    )
    prompt += '\n\n'
  }

  // 6. Pesan user
  prompt += `Pesan user: ${message}\n`

  return prompt
}

/**
 * Call Gemini API
 */
export async function callGemini(
  message: string,
  context: ChatContext,
  mode: string,
  tasks: string[],
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(message, context, mode, tasks)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: systemPrompt + '\n\n' + userPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 detik timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Gemini API error:', response.status, errorBody)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    // Parse response
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Maaf, tidak ada respons.'

    // Jika mode recommendation, coba parse JSON
    let card = null
    if (mode === 'recommendation') {
      try {
        // Cari JSON dalam response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          card = JSON.parse(jsonMatch[0])
        }
      } catch {
        console.warn('Failed to parse recommendation JSON, returning text only')
      }
    }

    // Extract sources dari artikel yang dipakai
    const sources = context.relevantArticles.map((article) => ({
      title: article.title,
      article_id: null, // Will be filled from database lookup if needed
      url: null,
    }))

    return {
      text: card ? 'Dari check-in hari ini, ini saran untukmu.' : text,
      card,
      sources,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('Gemini request timeout')
    }

    throw error
  }
}

/**
 * Fallback ke GROQ jika ada
 */
export async function callGroq(
  message: string,
  context: ChatContext,
  mode: string,
  tasks: string[],
): Promise<GeminiResponse> {
  const apiKey = Deno.env.get('GROQ_API_KEY')

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured')
  }

  // Implementasi GROQ similar to Gemini
  // For now, throw error to indicate not implemented
  throw new Error('GROQ fallback not yet implemented')
}

/**
 * Call LLM with fallback
 */
export async function callLLM(
  message: string,
  context: ChatContext,
  mode: string,
  tasks: string[],
): Promise<GeminiResponse> {
  try {
    return await callGemini(message, context, mode, tasks)
  } catch (error: any) {
    console.error('Gemini failed:', error.message)

    // Try GROQ fallback if available
    if (Deno.env.get('GROQ_API_KEY')) {
      try {
        console.log('Trying GROQ fallback...')
        return await callGroq(message, context, mode, tasks)
      } catch (groqError: any) {
        console.error('GROQ fallback also failed:', groqError.message)
      }
    }

    // Both failed, throw LLM_UNAVAILABLE
    throw new Error('LLM_UNAVAILABLE')
  }
}
