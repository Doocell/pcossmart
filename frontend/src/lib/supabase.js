import { createClient } from "@supabase/supabase-js";
import {
  getLocalSession,
  loadLocalDb,
  makeSessionForUser,
  saveLocalDb,
  setLocalSession,
} from "./localBackend";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum disetel; memakai mode fallback lokal."
  );
}

const rawClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const authListeners = new Set();
let backendMode = "hybrid"; // 'cloud' | 'local' | 'hybrid'

export function getBackendMode() {
  return backendMode;
}

function notifyAuthListeners(event, session) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch (e) {
      console.error(e);
    }
  }
}

function isNetworkError(err) {
  if (!err) return false;
  const msg = String(err.message || err || "").toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("enotfound") ||
    msg.includes("failed to fetch")
  );
}

class LocalQueryBuilder {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.payload = null;
    this.upsertOpts = {};
    this.filters = [];
    this.orderCol = null;
    this.orderAsc = true;
    this.limitCount = null;
    this.singleMode = null; // 'single' | 'maybeSingle'
  }

  select() {
    return this;
  }

  insert(values) {
    this.op = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values) {
    this.op = "update";
    this.payload = values;
    return this;
  }

  upsert(values, opts = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.upsertOpts = opts;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(col, val) {
    this.filters.push((row) => row[col] === val);
    return this;
  }

  gte(col, val) {
    this.filters.push((row) => row[col] >= val);
    return this;
  }

  lte(col, val) {
    this.filters.push((row) => row[col] <= val);
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.orderCol = col;
    this.orderAsc = ascending;
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  async executeLocal() {
    backendMode = "local";
    const db = loadLocalDb();
    const rows = db[this.table] || [];

    if (this.op === "select") {
      let res = rows.filter((r) => this.filters.every((fn) => fn(r)));
      if (this.orderCol) {
        const col = this.orderCol;
        const dir = this.orderAsc ? 1 : -1;
        res = [...res].sort((a, b) =>
          a[col] > b[col] ? dir : a[col] < b[col] ? -dir : 0
        );
      }
      if (this.limitCount != null) {
        res = res.slice(0, this.limitCount);
      }
      if (this.singleMode === "single") {
        if (!res.length) return { data: null, error: { message: "Row not found" } };
        return { data: res[0], error: null };
      }
      if (this.singleMode === "maybeSingle") {
        return { data: res[0] || null, error: null };
      }
      return { data: res, error: null };
    }

    if (this.op === "insert") {
      const inserted = this.payload.map((item) => ({
        id: item.id || crypto.randomUUID(),
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        ...item,
      }));
      db[this.table] = [...rows, ...inserted];
      saveLocalDb(db);
      const out = this.singleMode ? inserted[0] : inserted;
      return { data: out, error: null };
    }

    if (this.op === "upsert") {
      const conflictCols = (this.upsertOpts.onConflict || "id")
        .split(",")
        .map((s) => s.trim());
      const upserted = [];
      const nextRows = [...rows];

      for (const item of this.payload) {
        const idx = nextRows.findIndex((r) =>
          conflictCols.every((c) => r[c] === item[c])
        );
        if (idx >= 0) {
          nextRows[idx] = {
            ...nextRows[idx],
            ...item,
            updated_at: new Date().toISOString(),
          };
          upserted.push(nextRows[idx]);
        } else {
          const created = {
            id: item.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item,
          };
          nextRows.push(created);
          upserted.push(created);
        }
      }

      db[this.table] = nextRows;
      saveLocalDb(db);
      const out = this.singleMode ? upserted[0] : upserted;
      return { data: out, error: null };
    }

    if (this.op === "update") {
      const updated = [];
      db[this.table] = rows.map((r) => {
        if (this.filters.every((fn) => fn(r))) {
          const next = { ...r, ...this.payload, updated_at: new Date().toISOString() };
          updated.push(next);
          return next;
        }
        return r;
      });
      saveLocalDb(db);
      const out = this.singleMode ? updated[0] || null : updated;
      return { data: out, error: null };
    }

    if (this.op === "delete") {
      db[this.table] = rows.filter((r) => !this.filters.every((fn) => fn(r)));
      saveLocalDb(db);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  then(resolve, reject) {
    return this.executeLocal().then(resolve, reject);
  }
}

export const supabase = {
  auth: {
    async getSession() {
      try {
        const res = await rawClient.auth.getSession();
        if (res.data?.session) {
          backendMode = "cloud";
          setLocalSession(null);
          return res;
        }
        // If no active cloud session yet, but user had a local session while Cloud was paused,
        // try upgrading the local session to a real Supabase Cloud session automatically.
        const localSess = getLocalSession();
        if (localSess?.user?.email) {
          const db = loadLocalDb();
          const localUser = db.users.find(
            (u) => u.email.toLowerCase() === localSess.user.email.toLowerCase()
          );
          if (localUser?.password) {
            const signInRes = await rawClient.auth.signInWithPassword({
              email: localUser.email,
              password: localUser.password,
            });
            if (!signInRes.error && signInRes.data?.session) {
              backendMode = "cloud";
              setLocalSession(null);
              return { data: { session: signInRes.data.session }, error: null };
            }
          }
        }
      } catch {
        // Cloud unreachable, fall back to local session
      }
      const localSess = getLocalSession();
      if (localSess) {
        backendMode = "local";
        return { data: { session: localSess }, error: null };
      }
      backendMode = "cloud";
      return { data: { session: null }, error: null };
    },

    onAuthStateChange(callback) {
      authListeners.add(callback);
      const { data } = rawClient.auth.onAuthStateChange((event, session) => {
        if (session) {
          backendMode = "cloud";
          setLocalSession(null);
          callback(event, session);
        } else if (!getLocalSession()) {
          callback(event, null);
        }
      });
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
              data?.subscription?.unsubscribe();
            },
          },
        },
      };
    },

    async signInWithPassword({ email, password }) {
      try {
        const res = await rawClient.auth.signInWithPassword({ email, password });
        if (!res.error && res.data?.session) {
          backendMode = "cloud";
          setLocalSession(null);
          return res;
        }
        if (res.error && !isNetworkError(res.error)) {
          return res;
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          return { data: null, error: err };
        }
      }

      // Automatic fallback to Local Backend Mirror when Supabase Cloud is paused/unreachable
      backendMode = "local";
      const db = loadLocalDb();
      const normalized = email.trim().toLowerCase();
      let user = db.users.find((u) => u.email.toLowerCase() === normalized);

      if (!user) {
        return {
          data: { user: null, session: null },
          error: new Error("Invalid login credentials"),
        };
      }
      if (user.password && user.password !== password) {
        return {
          data: { user: null, session: null },
          error: new Error("Invalid login credentials"),
        };
      }

      const session = makeSessionForUser(user);
      setLocalSession(session);
      notifyAuthListeners("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    },

    async signUp({ email, password, options }) {
      try {
        const res = await rawClient.auth.signUp({ email, password, options });
        if (!res.error) {
          backendMode = "cloud";
          return res;
        }
        if (res.error && !isNetworkError(res.error)) {
          return res;
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          return { data: null, error: err };
        }
      }

      // Automatic fallback to Local Backend Mirror
      backendMode = "local";
      const db = loadLocalDb();
      const normalized = email.trim().toLowerCase();
      let existing = db.users.find((u) => u.email.toLowerCase() === normalized);
      if (existing) {
        return {
          data: null,
          error: new Error("Email ini sudah terdaftar. Silakan masuk."),
        };
      }

      const newUser = {
        id: crypto.randomUUID(),
        email: normalized,
        password,
        user_metadata: options?.data || {},
      };
      db.users.push(newUser);
      saveLocalDb(db);

      const session = makeSessionForUser(newUser);
      setLocalSession(session);
      notifyAuthListeners("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    },

    async signInWithOAuth({ provider = "google", options = {} }) {
      const redirectTo =
        options.redirectTo || `${window.location.origin}/dashboard`;
      try {
        const res = await rawClient.auth.signInWithOAuth({
          provider,
          options: {
            ...options,
            redirectTo,
            queryParams: {
              prompt: "select_account",
              ...(options.queryParams || {}),
            },
          },
        });
        if (!res.error) {
          setLocalSession(null);
          backendMode = "cloud";
        }
        return res;
      } catch (err) {
        return { data: null, error: err };
      }
    },

    async signOut() {
      setLocalSession(null);
      notifyAuthListeners("SIGNED_OUT", null);
      try {
        await rawClient.auth.signOut();
      } catch {
        // ignore network error on cloud signOut
      }
      return { error: null };
    },

    async resend({ email }) {
      if (backendMode === "cloud" && !getLocalSession()) {
        try {
          const res = await rawClient.auth.resend({ type: "signup", email });
          if (!res.error || !isNetworkError(res.error)) return res;
        } catch (err) {
          if (!isNetworkError(err)) return { data: null, error: err };
        }
      }
      return { data: { email }, error: null };
    },
  },

  from(table) {
    if (backendMode === "cloud" && !getLocalSession()) {
      return rawClient.from(table);
    }
    return new LocalQueryBuilder(table);
  },
};

const CRISIS_KEYWORDS = [
  "bunuh diri",
  "ingin mati",
  "mengakhiri hidup",
  "suicide",
  "kill myself",
  "end my life",
  "tidak ingin hidup",
  "lebih baik mati",
  "tidak sanggup menjalani",
];

const SEVERE_KEYWORDS = [
  "menyakiti diri",
  "self harm",
  "melukai diri",
  "menyayat",
  "perdarahan",
  "pusing berkunang",
  "pingsan",
];

const WARNING_KEYWORDS = [
  "putus asa",
  "hopeless",
  "tidak ada harapan",
  "sangat sedih",
  "sangat tertekan",
  "nyeri haid",
  "4 hari berturut",
];

function checkSafetyLocal(message) {
  const lower = message.toLowerCase();
  for (const k of CRISIS_KEYWORDS) {
    if (lower.includes(k)) return "crisis";
  }
  for (const k of SEVERE_KEYWORDS) {
    if (lower.includes(k)) return "severe";
  }
  for (const k of WARNING_KEYWORDS) {
    if (lower.includes(k)) return "warning";
  }
  return "none";
}

function getBannerLocal(level) {
  if (level === "crisis") {
    return {
      type: "crisis",
      title: "Kamu tidak sendirian",
      body: "Hubungi tenaga profesional atau orang terdekat sekarang.",
    };
  }
  if (level === "severe") {
    return {
      type: "see_doctor",
      title: "Perhatian Khusus untuk Kondisimu",
      body: "Kombinasi perdarahan deras berkepanjangan dan pusing memerlukan penanganan medis profesional secepatnya. Jangan menunda untuk berkonsultasi dengan fasilitas kesehatan terdekat.",
    };
  }
  if (level === "warning") {
    return {
      type: "see_doctor",
      title: "Sebaiknya Periksa ke Dokter",
      body: "Fluktuasi nyeri dapat dipicu perubahan hormonal, namun evaluasi langsung oleh dokter spesialis obstetri & ginekologi (Sp.OG) akan memberikan kepastian medis yang paling tepat dan menenangkan untukmu.",
    };
  }
  return null;
}

export async function sendChatMessage({
  message,
  mode = "free",
  context_article_id = null,
  tasks = [],
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    const err = new Error("Sesi kamu berakhir. Silakan masuk lagi.");
    err.code = "UNAUTHENTICATED";
    err.status = 401;
    throw err;
  }

  // Try Cloud Edge Function first if in cloud mode
  let cloudProfile = null;
  let cloudCheckins = [];
  if (backendMode === "cloud" && !getLocalSession()) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message, mode, context_article_id, tasks }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        // In DEV mode, if Cloud Edge Function returns 503 LLM_UNAVAILABLE, fall back gracefully to direct Gemini 3.5 Flash
        if (
          import.meta.env.DEV &&
          (res.status === 503 || data?.error?.code === "LLM_UNAVAILABLE")
        ) {
          const [{ data: pData }, { data: cData }] = await Promise.all([
            rawClient
              .from("profiles")
              .select("nickname, age_range, consent_at")
              .eq("id", session.user.id)
              .maybeSingle(),
            rawClient
              .from("daily_checkins")
              .select("*")
              .eq("user_id", session.user.id)
              .order("checkin_date", { ascending: false })
              .limit(7),
          ]);
          cloudProfile = pData || null;
          cloudCheckins = cData || [];
        } else {
          const err = new Error(
            data?.error?.message || data?.message || "Gagal menghubungi asisten AI."
          );
          err.code = data?.error?.code || "ERROR";
          err.status = res.status;
          throw err;
        }
      } else {
        return data;
      }
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }

  // Local / Dev-Fallback Execution (100% aligned with supabase/functions/chat/index.ts)
  const db = loadLocalDb();
  const userId = session.user.id;
  const profile = cloudProfile || db.profiles.find((p) => p.id === userId);
  if (!profile?.consent_at) {
    const err = new Error("Selesaikan onboarding dulu ya.");
    err.code = "CONSENT_REQUIRED";
    err.status = 403;
    throw err;
  }
  const nickname =
    profile?.nickname ||
    session.user.user_metadata?.nickname ||
    session.user.user_metadata?.given_name ||
    "Sahabat";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const activeCheckins = cloudCheckins.length
    ? cloudCheckins
    : (db.daily_checkins || []).filter((c) => c.user_id === userId);
  const todayCheckin = activeCheckins.find((c) => c.checkin_date === todayStr);

  // Rate limit calculation (20 messages / hour)
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const usedThisHour = (db.chat_messages || []).filter(
    (m) => m.user_id === userId && m.role === "user" && m.created_at >= oneHourAgo
  ).length;

  if (usedThisHour >= 20) {
    const err = new Error("Kamu terlalu cepat. Coba lagi sebentar ya.");
    err.code = "RATE_LIMITED";
    err.status = 429;
    throw err;
  }

  const flagLevel = checkSafetyLocal(message);
  const banner = getBannerLocal(flagLevel);

  const isRecMode = mode === "recommendation";

  // Rule 3: mode === 'recommendation' without today's check-in -> return open_checkin
  if (isRecMode && !todayCheckin && flagLevel === "none") {
    const userMsg = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: "user",
      content: message,
      flag_level: "none",
      meta: null,
      created_at: new Date().toISOString(),
    };
    const modelMsg = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: "model",
      content: `Halo ${nickname} 🌸 Agar rekomendasi aktivitas dan beban harian benar-benar sesuai dengan kondisi tubuhmu hari ini, yuk isi **Check-in Harian** terlebih dahulu (hanya 2 menit). Setelah itu aku akan menyusun jadwal yang pas untukmu!`,
      flag_level: "none",
      meta: {
        card: null,
        sources: [],
        suggested_action: "open_checkin",
      },
      created_at: new Date(Date.now() + 500).toISOString(),
    };
    db.chat_messages = [...(db.chat_messages || []), userMsg, modelMsg];
    saveLocalDb(db);
    return {
      user_message_id: userMsg.id,
      reply: {
        id: modelMsg.id,
        text: modelMsg.content,
        card: null,
        sources: [],
        suggested_action: "open_checkin",
      },
      flag: { level: "none", banner: null },
      usage: { remaining_this_hour: Math.max(0, 20 - usedThisHour - 1) },
    };
  }

  let replyText = "";
  let card = null;
  let sources = [];
  let suggestedAction = null;

  if (flagLevel === "crisis") {
    replyText = `${nickname}, napas pelan-pelan ya. Kamu tidak harus memikul semua beban ini sendirian hari ini. Perasaanmu valid dan tubuhmu layak mendapatkan pendampingan yang penuh welas asih.`;
  } else if (flagLevel === "severe") {
    replyText = `Terima kasih sudah memberitahu kondisimu, ${nickname}. Keluhan perdarahan deras yang disertai rasa lemas atau pusing berkunang-kunang perlu segera diperiksakan ke dokter atau fasilitas kesehatan terdekat agar kamu mendapatkan penanganan yang aman.`;
  } else if (flagLevel === "warning") {
    replyText = `Terima kasih sudah membagikan apa yang kamu rasakan, ${nickname}. Nyeri panggul atau keluhan yang berlangsung intens patut mendapatkan perhatian lebih.`;
  } else {
    // Assemble context matching supabase/functions/_shared/context.ts & gemini.ts
    const recentMsgs = (db.chat_messages || [])
      .filter((m) => m.user_id === userId)
      .slice(-10);

    const userCheckins = activeCheckins;
    const avgEnergy = userCheckins.length
      ? (userCheckins.reduce((s, d) => s + (d.energy || 0), 0) / userCheckins.length).toFixed(1)
      : "3.0";
    const avgMood = userCheckins.length
      ? (userCheckins.reduce((s, d) => s + (d.mood || 0), 0) / userCheckins.length).toFixed(1)
      : "4.0";
    const avgSleep = userCheckins.length
      ? (userCheckins.reduce((s, d) => s + Number(d.sleep_hours || 0), 0) / userCheckins.length).toFixed(1)
      : "7.5";
    const daysOnPeriod = userCheckins.filter((d) => d.on_period).length;
    const last7DaysSummary = userCheckins.length
      ? `7 hari terakhir: ${userCheckins.length} check-in. Rata-rata energi: ${avgEnergy}/5, mood: ${avgMood}/5, tidur: ${avgSleep} jam. Hari haid: ${daysOnPeriod} hari.`
      : "Tidak ada data check-in 7 hari terakhir.";

    const relevantArticles = context_article_id
      ? (db.education_articles || []).filter((a) => a.id === context_article_id)
      : (db.education_articles || []).slice(0, 2);

    const systemPrompt = `Kamu adalah asisten kesehatan yang mendukung perempuan dengan PCOS bernama ${nickname}.
Tugasmu:
- Berikan informasi yang akurat dan empatik
- Fokus pada gaya hidup sehat (makanan, olahraga, tidur, stres)
- Jangan memberikan diagnosis medis atau resep obat
- Sarankan konsultasi dokter untuk keluhan serius
- Gunakan bahasa Indonesia yang ramah dan mudah dipahami
- Jika ada data check-in, berikan saran spesifik berdasarkan kondisi pengguna

PENTING: Jangan pernah menyarankan bunuh diri atau hal berbahaya.`;

    let userPrompt = "";
    if (recentMsgs.length > 0) {
      userPrompt += "Riwayat percakapan terakhir:\n";
      recentMsgs.forEach((m) => {
        userPrompt += `${m.role === "user" ? "User" : "Asisten"}: ${m.content}\n`;
      });
      userPrompt += "\n";
    }
    if (todayCheckin) {
      userPrompt += `Data check-in hari ini:\n- Haid: ${todayCheckin.on_period ? "Ya" : "Tidak"}\n- Energi: ${todayCheckin.energy}/5\n- Mood: ${todayCheckin.mood}/5\n`;
      if (todayCheckin.sleep_hours) userPrompt += `- Tidur: ${todayCheckin.sleep_hours} jam\n`;
      if (todayCheckin.symptoms?.length) {
        userPrompt += `- Gejala: ${todayCheckin.symptoms.join(", ")}\n`;
      }
      userPrompt += "\n";
    }
    userPrompt += `${last7DaysSummary}\n\n`;
    if (relevantArticles.length > 0) {
      userPrompt += "Informasi referensi:\n";
      relevantArticles.forEach((art) => {
        userPrompt += `Judul: ${art.title}\nIsi: ${art.body.substring(0, 500)}...\n\n`;
      });
    }

    if (isRecMode) {
      userPrompt += "\nMode: Rekomendasi Harian\n";
      if (tasks.length > 0) {
        userPrompt += `Tugas hari ini: ${tasks.join(", ")}\n`;
      }
      userPrompt +=
        "Berikan pengantar singkat 1-2 kalimat yang empatik, diikuti blok JSON rekomendasi harian dengan struktur persis berikut:\n" +
        JSON.stringify(
          {
            beban: "ringan | sedang | normal",
            aktivitas: [
              "Judul Aktivitas 1 — Penjelasan singkat manfaatnya untuk hormon/glukosa",
              "Judul Aktivitas 2 — Penjelasan singkat manfaatnya",
              "Judul Aktivitas 3 — Penjelasan singkat manfaatnya",
            ],
            tips_istirahat: "Tips istirahat malam spesifik",
            prioritas_tugas:
              tasks.length > 0 ? tasks : ["Prioritas 1", "Prioritas 2", "Prioritas 3"],
          },
          null,
          2
        ) +
        "\n\n";
    }
    userPrompt += `Pesan user: ${message}\n`;

    // Direct Gemini fallback is guarded to DEV mode only so production builds rely on the Edge Function secret
    const geminiKey = import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY : null;
    const geminiModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite";

    if (geminiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout per contract
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText =
            (geminiData.candidates?.[0]?.content?.parts || [])
              .map((p) => p.text || "")
              .join("")
              .trim() || "";

          if (rawText) {
            if (isRecMode) {
              const jsonMatch = rawText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  card = {
                    beban: parsed.beban || "sedang",
                    aktivitas: Array.isArray(parsed.aktivitas) ? parsed.aktivitas : [],
                    tips_istirahat: parsed.tips_istirahat || "",
                    prioritas_tugas: Array.isArray(parsed.prioritas_tugas)
                      ? parsed.prioritas_tugas
                      : tasks.length > 0
                      ? tasks
                      : null,
                  };
                  const intro = rawText
                    .replace(/```json[\s\S]*?```/g, "")
                    .replace(jsonMatch[0], "")
                    .trim();
                  replyText =
                    intro ||
                    `Tentu, ${nickname}! Berdasarkan catatan check-in harianmu, berikut rekomendasi ritme adaptif dari Gemini AI untukmu hari ini:`;
                } catch {
                  replyText = rawText;
                }
              } else {
                replyText = rawText;
              }
            } else {
              replyText = rawText;
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("Direct Gemini call error, using fallback:", err.message);
      }
    }

    // Topic-aware fallback if Gemini key missing or request failed
    if (!replyText) {
      if (isRecMode) {
        const energyVal = todayCheckin?.energy ?? 3;
        const beban = energyVal <= 2 ? "ringan" : energyVal === 3 ? "sedang" : "normal";
        replyText = `Tentu, ${nickname}! Memperhatikan energi pagimu di level **${energyVal}/5** serta catatan harianmu, berikut ritme adaptif yang dirancang agar kortisol tetap seimbang sekaligus menjaga sensitivitas insulinmu:`;
        card = {
          beban,
          aktivitas: [
            "Jalan Santai 15 Menit Usai Makan — Menstabilkan lonjakan glukosa tanpa membebani kelenjar adrenal. Lakukan dengan tempo santai di area sejuk setelah makan siang.",
            "Hidrasi Teh Spearmint Hangat — Menenangkan pencernaan dan mendukung regulasi androgen alami. Sangat cocok dinikmati antara pukul 15.00–16.30 saat energi mulai turun.",
            "Jeda Napas & Jurnal Refleksi 5 Menit — Menurunkan ketegangan sistem saraf simpatik sebelum tidur. Tuliskan 3 hal kecil yang berjalan lancar untuk mengalihkan cemas hormonal.",
          ],
          tips_istirahat:
            "Usahakan pencahayaan kamar mulai redup 45 menit sebelum tidur untuk menjaga ritme sirkadian melatonin dan kestabilan hormon pemulihan.",
          prioritas_tugas:
            tasks.length > 0
              ? tasks
              : [
                  "Evaluasi bahan sarapan tinggi protein",
                  "Selesaikan laporan kerja tanpa multitasking",
                  "Matikan layar laptop pukul 20.30",
                ],
        };
      } else {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes("tidur") || lowerMsg.includes("kortisol")) {
          replyText = `Halo ${nickname} 🌸 Kualitas tidur sangat berperan dalam menjaga sensitivitas insulin dan menurunkan hormon stres (kortisol) pada PCOS.\n\nBeberapa langkah yang bisa kamu coba malam ini:\n1. **Redupkan Layar 45 Menit Sebelum Tidur:** Membantu produksi melatonin alami.\n2. **Targetkan 7–8 Jam Istirahat:** Tidur yang cukup di jam yang konsisten membantu menyeimbangkan hormon esok pagi.`;
        } else if (
          lowerMsg.includes("camilan") ||
          lowerMsg.includes("gula") ||
          lowerMsg.includes("sarapan") ||
          lowerMsg.includes("insulin")
        ) {
          replyText = `Halo ${nickname} 🌸 Untuk menjaga gula darah dan insulin tetap stabil saat PCOS, pilihlah makanan dengan indeks glikemik rendah yang dikombinasikan dengan protein dan lemak sehat.\n\nContoh pilihan ramah hormon:\n1. **Camilan Sore:** Segenggam kacang almond, edamame rebus, atau yogurt plain dengan biji chia.\n2. **Urutan Makan:** Konsumsi serat (sayur) dan protein lebih dulu sebelum karbohidrat kompleks.`;
        } else {
          replyText = `Halo ${nickname} 🌸 Sangat wajar dan kamu tidak sendirian. Pada PCOS, fluktuasi hormon dan sensitivitas insulin memang kerap memicu rasa kembung atau lelah.\n\nBeberapa langkah lembut yang bisa dicoba:\n1. **Gerak Ringan & Peregangan:** Jalan santai 10–15 menit atau peregangan panggul membantu melancarkan sirkulasi tanpa memicu lonjakan kortisol.\n2. **Hidrasi Hangat:** Minum air hangat atau teh herbal (seperti chamomile/spearmint) untuk menenangkan pencernaan.`;
        }
      }
    }

    sources = relevantArticles.map((art) => ({
      title: art.title,
      article_id: art.id,
      url: art.source_url || null,
    }));
  }

  const userMsg = {
    id: crypto.randomUUID(),
    user_id: userId,
    role: "user",
    content: message,
    flag_level: flagLevel,
    meta: tasks.length > 0 ? { tasks } : null,
    created_at: new Date().toISOString(),
  };

  const modelMsg = {
    id: crypto.randomUUID(),
    user_id: userId,
    role: "model",
    content: replyText,
    flag_level: flagLevel,
    meta: {
      card,
      sources,
      suggested_action: suggestedAction,
      banner,
    },
    created_at: new Date(Date.now() + 600).toISOString(),
  };

  db.chat_messages = [...(db.chat_messages || []), userMsg, modelMsg];
  saveLocalDb(db);

  return {
    user_message_id: userMsg.id,
    reply: {
      id: modelMsg.id,
      text: replyText,
      card,
      sources,
      suggested_action: suggestedAction,
    },
    flag: {
      level: flagLevel,
      banner,
    },
    usage: {
      remaining_this_hour: Math.max(0, 20 - usedThisHour - 1),
    },
  };
}

/**
 * Transcribe recorded audio blob (base64) into Indonesian journal text using Gemini 3.5 Flash multimodal API.
 */
export async function transcribeAudioWithGemini(
  base64Audio,
  mimeType = "audio/webm",
  existingLiveTranscript = ""
) {
  const geminiKey = import.meta.env.DEV
    ? import.meta.env.VITE_GEMINI_API_KEY
    : null;
  const geminiModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite";

  if (!geminiKey) {
    if (existingLiveTranscript.trim()) {
      return existingLiveTranscript.trim().slice(0, 500);
    }
    throw new Error(
      "Kunci API transkripsi suara belum tersedia di mode produksi. Gunakan dikte browser atau ketik manual."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const prompt = existingLiveTranscript.trim()
      ? `Berikut adalah rekaman suara voice note jurnal kesehatan harian pengguna PCOSmart (serta draf transkrip langsung: "${existingLiveTranscript}"). Tolong transkripsikan isi suara pengguna ke dalam Bahasa Indonesia yang alami, rapi, sudut pandang orang pertama ("Saya" atau langsung kalimat jurnal), tanpa mengurangi detail keluhan/perasaan yang disebutkan, dan maksimal 450 karakter. Hanya kembalikan teks hasil transkripsinya saja tanpa tanda kutip atau pengantar.`
      : `Tolong transkripsikan rekaman suara voice note jurnal kesehatan harian pengguna PCOSmart ini ke dalam Bahasa Indonesia yang akurat, rapi, dan alami (maksimal 450 karakter). Jika rekaman hening atau tidak terdengar ucapan, kembalikan tepat kata: [TIDAK_TERDENGAR]. Hanya kembalikan teks hasil transkripsinya saja tanpa tanda kutip atau komentar tambahan.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(
        geminiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType.split(";")[0] || "audio/webm",
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!res.ok) {
      if (existingLiveTranscript.trim()) {
        return existingLiveTranscript.trim().slice(0, 500);
      }
      throw new Error(`Gagal mentranskripsi audio (HTTP ${res.status})`);
    }

    const data = await res.json();
    const rawText = (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    ).trim();

    if (!rawText || rawText.includes("[TIDAK_TERDENGAR]")) {
      if (existingLiveTranscript.trim()) {
        return existingLiveTranscript.trim().slice(0, 500);
      }
      throw new Error(
        "Suara tidak terdengar jelas pada rekaman. Coba berbicara lebih dekat ke mikrofon ya."
      );
    }

    return rawText.replace(/^["']|["']$/g, "").trim().slice(0, 500);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Polish raw spoken/dictated journal notes into a clean, structured daily health note (<= 500 chars).
 */
export async function polishJournalWithGemini(rawText = "") {
  const clean = rawText.trim();
  if (!clean) return { text: "", polishedByAi: false };

  const geminiKey = import.meta.env.DEV
    ? import.meta.env.VITE_GEMINI_API_KEY
    : null;
  const geminiModel = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!geminiKey) return { text: clean.slice(0, 500), polishedByAi: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(
        geminiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Rapikan catatan jurnal harian pasien PCOS berikut menjadi kalimat Bahasa Indonesia yang ringkas, empatik, jelas untuk laporan dokter, tetap dalam sudut pandang penulisnya, dan maksimal 450 karakter. Jangan tambahkan pengantar atau tanda kutip:\n\n"${clean}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 250,
          },
        }),
      }
    );

    if (!res.ok) return { text: clean.slice(0, 500), polishedByAi: false };
    const data = await res.json();
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!out) return { text: clean.slice(0, 500), polishedByAi: false };
    return {
      text: out.replace(/^["']|["']$/g, "").trim().slice(0, 500),
      polishedByAi: true,
    };
  } catch {
    return { text: clean.slice(0, 500), polishedByAi: false };
  } finally {
    clearTimeout(timer);
  }
}
