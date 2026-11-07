/**
 * Context assembly untuk Gemini prompt
 */

export interface ChatContext {
  recentMessages: Array<{ role: string; content: string }>
  todayCheckin: any | null
  last7DaysSummary: string
  relevantArticles: Array<{ title: string; body: string }>
}

/**
 * Ambil 10 pesan terakhir dari riwayat chat
 */
export async function getRecentMessages(
  supabase: any,
  userId: string,
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.warn('Failed to fetch recent messages:', error.message)
    return []
  }

  // Reverse agar urutan dari lama ke baru
  return (data || []).reverse()
}

/**
 * Ambil check-in hari ini
 */
export async function getTodayCheckin(
  supabase: any,
  userId: string,
): Promise<any | null> {
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().split('T')[0] // tanggal WIB

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', today)
    .maybeSingle()

  if (error) {
    console.warn('Failed to fetch today checkin:', error.message)
    return null
  }

  return data
}

/**
 * Buat ringkasan 7 hari terakhir
 */
export async function getLast7DaysSummary(
  supabase: any,
  userId: string,
): Promise<string> {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fromDate = sevenDaysAgo.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('checkin_date, on_period, energy, mood, sleep_hours')
    .eq('user_id', userId)
    .gte('checkin_date', fromDate)
    .order('checkin_date', { ascending: true })

  if (error || !data || data.length === 0) {
    return 'Tidak ada data check-in 7 hari terakhir.'
  }

  // Hitung rata-rata
  const avgEnergy = (
    data.reduce((sum, d) => sum + (d.energy || 0), 0) / data.length
  ).toFixed(1)
  const avgMood = (
    data.reduce((sum, d) => sum + (d.mood || 0), 0) / data.length
  ).toFixed(1)
  const avgSleep = (
    data.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / data.length
  ).toFixed(1)
  const daysOnPeriod = data.filter((d) => d.on_period).length

  return `7 hari terakhir: ${data.length} check-in. Rata-rata energi: ${avgEnergy}/5, mood: ${avgMood}/5, tidur: ${avgSleep} jam. Hari haid: ${daysOnPeriod} hari.`
}

/**
 * Ambil artikel relevan berdasarkan mode/context
 */
export async function getRelevantArticles(
  supabase: any,
  contextArticleId: string | null,
): Promise<Array<{ title: string; body: string }>> {
  if (contextArticleId) {
    // Jika ada context article, ambil artikel tersebut
    const { data, error } = await supabase
      .from('education_articles')
      .select('title, body')
      .eq('id', contextArticleId)
      .eq('published', true)
      .single()

    if (!error && data) {
      return [data]
    }
  }

  // Default: ambil 2 artikel random yang published
  const { data, error } = await supabase
    .from('education_articles')
    .select('title, body')
    .eq('published', true)
    .limit(2)

  if (error) {
    console.warn('Failed to fetch articles:', error.message)
    return []
  }

  return data || []
}

/**
 * Assemble full context untuk Gemini
 */
export async function assembleContext(
  supabase: any,
  userId: string,
  contextArticleId: string | null,
): Promise<ChatContext> {
  const [recentMessages, todayCheckin, last7DaysSummary, relevantArticles] =
    await Promise.all([
      getRecentMessages(supabase, userId),
      getTodayCheckin(supabase, userId),
      getLast7DaysSummary(supabase, userId),
      getRelevantArticles(supabase, contextArticleId),
    ])

  return {
    recentMessages,
    todayCheckin,
    last7DaysSummary,
    relevantArticles,
  }
}
