/**
 * Safety filtering untuk deteksi konten berisiko
 */

export type FlagLevel = 'none' | 'warning' | 'severe' | 'crisis'

export interface SafetyResult {
  level: FlagLevel
  reason?: string
}

// TODO: samakan dengan daftar resmi PRD Bagian 8.3 (daftar ini masih sementara)
const CRISIS_KEYWORDS = [
  'bunuh diri',
  'ingin mati',
  'mengakhiri hidup',
  'suicide',
  'kill myself',
  'end my life',
  'tidak ingin hidup',
  'lebih baik mati',
]

const SEVERE_KEYWORDS = ['menyakiti diri', 'self harm', 'melukai diri', 'menyayat']

const WARNING_KEYWORDS = [
  'putus asa',
  'hopeless',
  'tidak ada harapan',
  'sangat sedih',
  'sangat tertekan',
]

export function checkSafety(message: string): SafetyResult {
  const lower = message.toLowerCase()

  for (const k of CRISIS_KEYWORDS) {
    if (lower.includes(k)) return { level: 'crisis', reason: k }
  }
  for (const k of SEVERE_KEYWORDS) {
    if (lower.includes(k)) return { level: 'severe', reason: k }
  }
  for (const k of WARNING_KEYWORDS) {
    if (lower.includes(k)) return { level: 'warning', reason: k }
  }
  return { level: 'none' }
}

// Teks balasan krisis dikendalikan server (kontrak 6.4).
// Nomor kontak SENGAJA tidak ditulis di sini: kontrak menaruhnya di FE (src/config/crisis.js)
// setelah diverifikasi.
export const CRISIS_REPLY_TEXT =
  'Terima kasih sudah berbagi. Kamu tidak sendirian. Yuk bicara dengan tenaga profesional atau orang yang kamu percaya sekarang.'

// Bentuk banner sesuai kontrak 6.2: { type, title, body }, type = see_doctor | crisis
export function getBanner(level: FlagLevel) {
  switch (level) {
    case 'crisis':
      return {
        type: 'crisis' as const,
        title: 'Kamu tidak sendirian',
        body: 'Hubungi tenaga profesional atau orang terdekat sekarang.',
      }
    case 'severe':
    case 'warning':
      return {
        type: 'see_doctor' as const,
        title: 'Sebaiknya periksa ke dokter',
        body: 'Keluhanmu perlu diperhatikan. Pertimbangkan berkonsultasi dengan dokter atau tenaga profesional.',
      }
    default:
      return null
  }
}