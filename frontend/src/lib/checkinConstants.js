export const SYMPTOM_OPTIONS = [
  { id: "nyeri_perut", label: "Nyeri perut" },
  { id: "jerawat", label: "Jerawat" },
  { id: "rambut_rontok", label: "Rambut rontok" },
  { id: "rambut_berlebih", label: "Rambut tumbuh berlebih" },
  { id: "lelah", label: "Lelah" },
  { id: "cemas", label: "Cemas" },
  { id: "kembung", label: "Kembung" },
  { id: "sulit_tidur", label: "Sulit tidur" },
];

export const SYMPTOM_LABELS = Object.fromEntries(
  SYMPTOM_OPTIONS.map((s) => [s.id, s.label])
);

export const ENERGY_STEPS = [
  { step: 1, label: "Sangat Lemah" },
  { step: 2, label: "Kurang" },
  { step: 3, label: "Cukup" },
  { step: 4, label: "Berenergi" },
  { step: 5, label: "Sangat Bugar" },
];

export const MOOD_STEPS = [
  { step: 1, label: "Tertekan", icon: "sentiment_very_dissatisfied", color: "text-tertiary" },
  { step: 2, label: "Cemas", icon: "sentiment_dissatisfied", color: "text-tertiary-container" },
  { step: 3, label: "Netral", icon: "sentiment_neutral", color: "text-outline" },
  { step: 4, label: "Tenang", icon: "sentiment_satisfied", color: "text-secondary" },
  { step: 5, label: "Bahagia", icon: "sentiment_very_satisfied", color: "text-secondary" },
];

export const FLOW_OPTIONS = [
  { value: "ringan", label: "Ringan" },
  { value: "sedang", label: "Sedang" },
  { value: "deras", label: "Deras" },
];

export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getEnergyLabel(step) {
  return ENERGY_STEPS.find((e) => e.step === Number(step))?.label || "Cukup";
}

export function getMoodLabel(step) {
  return MOOD_STEPS.find((m) => m.step === Number(step))?.label || "Tenang";
}

export function calculateStreak(checkins = []) {
  if (!checkins.length) return 0;
  const dateSet = new Set(checkins.map((c) => c.checkin_date));
  let streak = 0;
  const cursor = new Date();
  const todayStr = getTodayDateString(cursor);

  if (!dateSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dStr = getTodayDateString(cursor);
    if (dateSet.has(dStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getTopSymptoms(checkins = [], limit = 3) {
  const counts = {};
  for (const row of checkins) {
    for (const sym of row.symptoms || []) {
      counts[sym] = (counts[sym] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([id, count]) => ({
      id,
      label: SYMPTOM_LABELS[id] || id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
