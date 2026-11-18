import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json, errorResponse } from '../_shared/http.ts'
import { checkSafety, getBanner, CRISIS_REPLY_TEXT } from '../_shared/safety.ts'
import { assembleContext } from '../_shared/context.ts'
import { callLLM } from '../_shared/gemini.ts'
import {
  formatMealUserContent,
  validateMealImageInput,
  type MealImageInput,
} from '../_shared/meal.ts'

const MODES = ['free', 'recommendation', 'meal_analysis']
const SEVERE_MEAL_SAFETY_REPLY =
  'Terima kasih sudah berbagi. Keluhan atau kondisi serius yang kamu sampaikan perlu perhatian tenaga medis terlebih dahulu sebelum membahas pola makan. Pertimbangkan segera berkonsultasi dengan dokter atau fasilitas kesehatan terdekat ya.'
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Metode tidak didukung.')
  }

  try {
    // 1. Verifikasi JWT
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) {
      return errorResponse(401, 'UNAUTHENTICATED', 'Silakan masuk dulu.')
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: auth, error: authError } = await admin.auth.getUser(token)
    if (authError || !auth.user) {
      return errorResponse(
        401,
        'UNAUTHENTICATED',
        'Sesi kamu berakhir. Silakan masuk lagi.',
      )
    }
    const user = auth.user

    // Cek profil dan consent
    const { data: profile } = await admin
      .from('profiles')
      .select('consent_at')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.consent_at) {
      return errorResponse(
        403,
        'CONSENT_REQUIRED',
        'Selesaikan onboarding dulu ya.',
      )
    }

    // 2. Validasi body
    let body: any
    try {
      body = await req.json()
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Format permintaan tidak valid.')
    }

    const mode = body.mode ?? 'free'
    if (!MODES.includes(mode)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Mode tidak valid.')
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    let validatedImage: MealImageInput | undefined

    if (mode === 'meal_analysis') {
      if (message.length > 1000) {
        return errorResponse(
          400,
          'VALIDATION_ERROR',
          'Catatan makanan maksimal 1000 karakter.',
        )
      }
      const imgResult = validateMealImageInput(body?.image)
      if (!imgResult.ok) {
        return errorResponse(400, 'VALIDATION_ERROR', imgResult.error)
      }
      validatedImage = imgResult.value
    } else {
      if (body?.image !== undefined && body?.image !== null) {
        return errorResponse(
          400,
          'VALIDATION_ERROR',
          'Gambar hanya didukung pada mode analisis makanan.',
        )
      }
      if (message.length < 1 || message.length > 1000) {
        return errorResponse(
          400,
          'VALIDATION_ERROR',
          'Pesan harus 1-1000 karakter.',
        )
      }
    }

    const contextArticleId = body.context_article_id ?? null
    if (contextArticleId !== null && !UUID_RE.test(String(contextArticleId))) {
      return errorResponse(400, 'VALIDATION_ERROR', 'ID artikel tidak valid.')
    }

    const tasks = body.tasks ?? []
    const tasksValid =
      Array.isArray(tasks) &&
      tasks.length <= 10 &&
      tasks.every((t: unknown) => typeof t === 'string' && t.length <= 100)
    if (!tasksValid) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Daftar tugas maksimal 10 item, tiap item maksimal 100 karakter.',
      )
    }

    // TODO Step 6: rate limit + filter krisis
        // 3. Rate limit: maksimal 20 pesan user per jam
    const RATE_LIMIT = 20
    const since = new Date(Date.now() - 3600_000).toISOString()
    const { data: recent, count, error: rlError } = await admin
      .from('chat_messages')
      .select('created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(RATE_LIMIT)
    if (rlError) throw rlError

    const used = count ?? 0
    if (used >= RATE_LIMIT) {
      const oldest = new Date(recent![0].created_at).getTime()
      const retryAfter = Math.max(
        1,
        Math.ceil((oldest + 3600_000 - Date.now()) / 1000),
      )
      return errorResponse(
        429,
        'RATE_LIMITED',
        'Kamu terlalu cepat. Coba lagi sebentar ya.',
        retryAfter,
      )
    }
    const remaining = RATE_LIMIT - used - 1

    // 4. Filter kata bahaya (kode biasa, tanpa LLM)
    const safetyCheck = checkSafety(message)
    const level = safetyCheck.level
    const banner = getBanner(level)
    
    if (level === 'crisis' || (mode === 'meal_analysis' && level === 'severe')) {
      const now = Date.now()
      const safetyReplyText =
        level === 'crisis' ? CRISIS_REPLY_TEXT : SEVERE_MEAL_SAFETY_REPLY
      const safeUserContent =
        mode === 'meal_analysis' ? message || '[Foto Makanan]' : message

      // created_at dibuat eksplisit supaya urutan riwayat pasti (user dulu, lalu model)
      const { data: saved, error: saveError } = await admin
        .from('chat_messages')
        .insert([
          {
            user_id: user.id,
            role: 'user',
            content: safeUserContent,
            flag_level: level,
            created_at: new Date(now).toISOString(),
          },
          {
            user_id: user.id,
            role: 'model',
            content: safetyReplyText,
            flag_level: level,
            meta: { card: null, meal_analysis: null, sources: [] },
            created_at: new Date(now + 1).toISOString(),
          },
        ])
        .select('id, role')
      if (saveError) throw saveError

      return json({
        user_message_id: saved!.find((m) => m.role === 'user')!.id,
        user_message_content: safeUserContent,
        reply: {
          id: saved!.find((m) => m.role === 'model')!.id,
          text: safetyReplyText,
          card: null,
          meal_analysis: null,
          sources: [],
          suggested_action: null,
        },
        flag: { level, banner },
        usage: { remaining_this_hour: remaining },
      })
    }

    // 5. Assemble context untuk Gemini
    const context = await assembleContext(admin, user.id, contextArticleId)

    // 6. Call Gemini/LLM
    let llmResponse
    try {
      llmResponse = await callLLM(message, context, mode, tasks, validatedImage)
    } catch (error: any) {
      if (error.message === 'LLM_UNAVAILABLE') {
        return errorResponse(
          503,
          'LLM_UNAVAILABLE',
          'Asisten sedang sibuk. Coba lagi sebentar ya.',
        )
      }
      throw error
    }

    const savedUserContent =
      mode === 'meal_analysis'
        ? formatMealUserContent(llmResponse.meal_analysis ?? null, message)
        : message

    // 8. Save messages
    const now = Date.now()
    const { data: savedMsgs, error: saveMsgsError } = await admin
      .from('chat_messages')
      .insert([
        {
          user_id: user.id,
          role: 'user',
          content: savedUserContent,
          flag_level: level,
          created_at: new Date(now).toISOString(),
        },
        {
          user_id: user.id,
          role: 'model',
          content: llmResponse.text,
          flag_level: level,
          meta: {
            card: llmResponse.card,
            meal_analysis: llmResponse.meal_analysis ?? null,
            sources: llmResponse.sources,
          },
          created_at: new Date(now + 1).toISOString(),
        },
      ])
      .select('id, role')

    if (saveMsgsError) throw saveMsgsError

    // 8. Return response
    return json({
      user_message_id: savedMsgs!.find((m) => m.role === 'user')!.id,
      user_message_content: savedUserContent,
      reply: {
        id: savedMsgs!.find((m) => m.role === 'model')!.id,
        text: llmResponse.text,
        card: llmResponse.card,
        meal_analysis: llmResponse.meal_analysis ?? null,
        sources: llmResponse.sources,
        suggested_action: null,
      },
      flag: { level, banner },
      usage: { remaining_this_hour: remaining },
    })
  } catch (e) {
    // Jangan log isi pesan pengguna (kontrak 6.7 poin 8)
    console.error('chat error:', e instanceof Error ? e.message : 'unknown')
    return errorResponse(500, 'INTERNAL', 'Terjadi kesalahan. Coba lagi ya.')
  }
})