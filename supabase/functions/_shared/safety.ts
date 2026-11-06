/**
 * Safety filtering untuk deteksi konten berisiko
 */

export type FlagLevel = 'none' | 'warning' | 'severe' | 'crisis'

export interface SafetyResult {
  level: FlagLevel
  reason?: string
}

// Kata kunci untuk deteksi krisis
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

const SEVERE_KEYWORDS = [
  'menyakiti diri',
  'self harm',
  'melukai diri',
  'menyayat',
]

const WARNING_KEYWORDS = [
  'putus asa',
  'hopeless',
  'tidak ada harapan',
  'sangat sedih',
  'sangat tertekan',
]

/**
 * Check message for crisis/safety keywords
 */
export function checkSafety(message: string): SafetyResult {
  const lowerMessage = message.toLowerCase()

  // Check crisis level
  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: 'crisis',
        reason: `Crisis keyword detected: ${keyword}`,
      }
    }
  }

  // Check severe level
  for (const keyword of SEVERE_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: 'severe',
        reason: `Severe keyword detected: ${keyword}`,
      }
    }
  }

  // Check warning level
  for (const keyword of WARNING_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      return {
        level: 'warning',
        reason: `Warning keyword detected: ${keyword}`,
      }
    }
  }

  return { level: 'none' }
}

/**
 * Get crisis banner message
 */
export function getCrisisBanner() {
  return {
    type: 'crisis' as const,
    title: 'Kami peduli denganmu',
    message:
      'Jika kamu dalam keadaan darurat, silakan hubungi layanan krisis:\n\n' +
      '🆘 Hotline 119 (24/7)\n' +
      '📞 Into The Light: 1500-454\n' +
      '💬 Sejiwa: 119 ext 8',
    actions: [
      {
        label: 'Hubungi 119',
        type: 'tel',
        value: '119',
      },
    ],
  }
}

/**
 * Get severe banner message
 */
export function getSevereBanner() {
  return {
    type: 'severe' as const,
    title: 'Kami di sini untukmu',
    message:
      'Sepertinya kamu sedang mengalami masa sulit. Pertimbangkan untuk berbicara dengan profesional:\n\n' +
      '📞 Hotline 119\n' +
      '💬 Sejiwa: 119 ext 8',
    actions: [],
  }
}

/**
 * Get warning banner message
 */
export function getWarningBanner() {
  return {
    type: 'warning' as const,
    title: 'Jaga dirimu ya',
    message:
      'Kalau kamu merasa kewalahan, tidak apa-apa untuk mencari bantuan. ' +
      'Kamu bisa hubungi layanan konseling atau berbicara dengan orang terdekat.',
    actions: [],
  }
}

/**
 * Get appropriate banner based on flag level
 */
export function getBanner(level: FlagLevel) {
  switch (level) {
    case 'crisis':
      return getCrisisBanner()
    case 'severe':
      return getSevereBanner()
    case 'warning':
      return getWarningBanner()
    default:
      return null
  }
}
