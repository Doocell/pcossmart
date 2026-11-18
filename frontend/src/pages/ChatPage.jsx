import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { sendChatMessage, supabase } from "../lib/supabase";
import { compressMealImageFile } from "../lib/imageUtils";
import MealScoreCard from "../components/MealScoreCard";
import { useAuth } from "../contexts/AuthContext";
import {
  SYMPTOM_LABELS,
  getEnergyLabel,
  getMoodLabel,
  getTodayDateString,
} from "../lib/checkinConstants";

const SUGGESTED_PROMPTS = [
  {
    category: "Nutrisi Hormon",
    icon: "restaurant",
    iconBg: "bg-secondary-fixed/50 text-secondary group-hover:bg-secondary group-hover:text-on-secondary",
    catColor: "text-secondary",
    prompt: "Bagaimana memilih camilan sore yang ramah gula darah saat PCOS?",
    mode: "free",
  },
  {
    category: "Gerak & Kenyamanan",
    icon: "self_improvement",
    iconBg: "bg-primary-fixed text-primary group-hover:bg-primary group-hover:text-on-primary",
    catColor: "text-primary",
    prompt: "Perutku begah dan kembung hari ini, gerakan apa yang aman dilakukan?",
    mode: "free",
  },
  {
    category: "Siklus Personal",
    icon: "hotel_class",
    iconBg: "bg-tertiary-fixed text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary",
    catColor: "text-tertiary",
    prompt: "Buatkan rekomendasi aktivitas santai berdasarkan check-in pagiku.",
    mode: "recommendation",
  },
];

const SUPPORT_TOPICS = [
  "Bagaimana mengatasi resistensi insulin lewat sarapan?",
  "Ritme tidur terbaik untuk menurunkan kortisol PCOS",
  "Manfaat teh spearmint dan inositol untuk hormon",
  "Cara mengelola stres saat siklus haid belum teratur",
];

const ACTIVITY_STYLES = [
  {
    icon: "hiking",
    iconWrap: "bg-[#006a60]/10 text-secondary",
    tag: "Glukosa",
    tagClass: "bg-secondary-container text-on-secondary-container",
    pinIcon: "directions_walk",
    pinSub: "Regulasi lonjakan glukosa",
  },
  {
    icon: "emoji_food_beverage",
    iconWrap: "bg-primary-fixed text-primary",
    tag: "Hormon",
    tagClass: "bg-primary-fixed-dim text-on-primary-fixed",
    pinIcon: "local_cafe",
    pinSub: "Keseimbangan androgen",
  },
  {
    icon: "menu_book",
    iconWrap: "bg-tertiary-fixed text-tertiary",
    tag: "Sistem Saraf",
    tagClass: "bg-tertiary-container/20 text-tertiary",
    pinIcon: "auto_stories",
    pinSub: "Relaksasi saraf parasimpatik",
  },
];

function formatTimeWIB(isoString) {
  if (!isoString) return "Baru saja";
  try {
    return (
      new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(isoString)) + " WIB"
    );
  } catch {
    return "Baru saja";
  }
}

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const nickname = profile?.nickname || "Nadia";

  const [messages, setMessages] = useState([]);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [remainingQuota, setRemainingQuota] = useState(20);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [compressingImage, setCompressingImage] = useState(false);
  const [localPhotoPreviews, setLocalPhotoPreviews] = useState({});
  const [sending, setSending] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(user));
  const [errorBanner, setErrorBanner] = useState("");

  // Pinned Recommendation Card & Task Checklist State
  const [pinnedCard, setPinnedCard] = useState(null);
  const [checkedTasks, setCheckedTasks] = useState(() => {
    try {
      const todayKey = `pcosmart_daily_tasks_${new Date().toISOString().slice(0, 10)}`;
      const saved = localStorage.getItem(todayKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [savedHistoryToast, setSavedHistoryToast] = useState(false);

  useEffect(() => {
    try {
      const todayKey = `pcosmart_daily_tasks_${new Date().toISOString().slice(0, 10)}`;
      localStorage.setItem(todayKey, JSON.stringify(checkedTasks));
    } catch {
      // ignore storage errors
    }
  }, [checkedTasks]);

  // Task Modal State (Matches Stitch Screen 36: PCOSmart - Modal Tugas Hari Ini)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [taskList, setTaskList] = useState([
    "Rapat koordinasi tim pagi via Zoom",
    "Belanja bahan sayur berdaun hijau & telur",
    "Jalan santai sore keliling komplek 20 menit",
  ]);

  // Crisis Overlay View State (Matches Stitch Screen 41: Status Krisis - Kamu Tidak Sendirian)
  const [crisisModeActive, setCrisisModeActive] = useState(false);

  const messagesEndRef = useRef(null);
  const recCardRef = useRef(null);
  const taskInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoTriggeredRef = useRef(false);

  const todayStr = getTodayDateString();

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadChatData() {
      setLoadingInitial(true);
      try {
        const [{ data: msgRows }, { data: checkinRows }] = await Promise.all([
          supabase
            .from("chat_messages")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("daily_checkins")
            .select("*")
            .eq("user_id", user.id)
            .eq("checkin_date", todayStr)
            .maybeSingle(),
        ]);

        if (!active) return;
        const loadedMsgs = [...(msgRows || [])].reverse();
        setMessages(loadedMsgs);
        setTodayCheckin(checkinRows || null);

        // Find latest recommendation card if any
        for (let i = loadedMsgs.length - 1; i >= 0; i--) {
          if (loadedMsgs[i].meta?.card) {
            setPinnedCard(loadedMsgs[i].meta.card);
            break;
          }
        }

        // Compute remaining hourly quota
        const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
        const used = loadedMsgs.filter(
          (m) => m.role === "user" && m.created_at >= oneHourAgo
        ).length;
        setRemainingQuota(Math.max(0, 20 - used));
      } catch (err) {
        console.error("Error loading chat data:", err.message);
      } finally {
        if (active) setLoadingInitial(false);
      }
    }

    loadChatData();
    return () => {
      active = false;
    };
  }, [user, todayStr]);

  const openMealPhotoPicker = () => {
    fileInputRef.current?.click();
  };

  const handleSelectMealPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorBanner("");
    setCompressingImage(true);
    try {
      const compressed = await compressMealImageFile(file);
      setSelectedImage(compressed);
    } catch (err) {
      setErrorBanner(
        err.message || "Gagal memproses foto makanan. Coba pilih foto JPEG/PNG lain."
      );
    } finally {
      setCompressingImage(false);
    }
  };

  const contextArticleId = location.state?.contextArticleId || null;

  const handleSend = useCallback(
    async (overrideText = null, mode = "free", customTasks = []) => {
      const activeImage = overrideText === null ? selectedImage : null;
      const effectiveMode = activeImage ? "meal_analysis" : mode;
      const text = (overrideText !== null ? overrideText : inputText).trim();
      if ((!text && !activeImage) || sending || compressingImage) return;
      if (remainingQuota <= 0) {
        setErrorBanner(
          "Kamu terlalu cepat (batas 20 pesan/jam tercapai). Coba lagi sebentar ya."
        );
        return;
      }

      setErrorBanner("");
      if (overrideText === null) {
        setInputText("");
        setSelectedImage(null);
      }
      setSending(true);

      // Optimistic user message
      const tempId = `temp-${Date.now()}`;
      if (activeImage) {
        setLocalPhotoPreviews((prev) => ({
          ...prev,
          [tempId]: activeImage.previewDataUrl,
        }));
      }
      const optimisticUserMsg = {
        id: tempId,
        role: "user",
        content: activeImage
          ? text
            ? `[Foto Makanan]\n${text}`
            : "[Foto Makanan]"
          : text,
        flag_level: "none",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);

      try {
        const res = await sendChatMessage({
          message: text,
          mode: effectiveMode,
          context_article_id: contextArticleId,
          tasks: customTasks,
          image: activeImage
            ? { mime_type: activeImage.mime_type, data: activeImage.data }
            : null,
        });

        if (activeImage && res.user_message_id) {
          setLocalPhotoPreviews((prev) => ({
            ...prev,
            [res.user_message_id]: activeImage.previewDataUrl,
          }));
        }

        const modelMessage = {
          id: res.reply.id,
          role: "model",
          content: res.reply.text,
          flag_level: res.flag?.level || "none",
          meta: {
            card: res.reply.card || null,
            meal_analysis: res.reply.meal_analysis || null,
            sources: res.reply.sources || [],
            suggested_action: res.reply.suggested_action || null,
            banner: res.flag?.banner || null,
          },
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: res.user_message_id,
                  content: res.user_message_content || m.content,
                }
              : m
          ),
          modelMessage,
        ]);

        if (res.reply.card) {
          setPinnedCard(res.reply.card);
          setCheckedTasks({});
        }
        if (res.usage?.remaining_this_hour != null) {
          setRemainingQuota(res.usage.remaining_this_hour);
        }
        if (res.flag?.level === "crisis") {
          setCrisisModeActive(true);
        }
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (overrideText === null && activeImage) {
          setSelectedImage(activeImage);
        }
        if (err.code === "CONSENT_REQUIRED" || err.status === 403) {
          navigate("/onboarding");
          return;
        }
        if (err.code === "UNAUTHENTICATED" || err.status === 401) {
          navigate("/session-expired");
          return;
        }
        setErrorBanner(err.message || "Gagal mengirim pesan. Silakan coba lagi.");
      } finally {
        setSending(false);
      }
    },
    [
      inputText,
      selectedImage,
      compressingImage,
      sending,
      remainingQuota,
      contextArticleId,
      navigate,
    ]
  );

  // Handle auto-recommendation trigger when coming from CheckinPage or Education/History prefill
  useEffect(() => {
    if (
      !loadingInitial &&
      location.state?.autoMode === "recommendation" &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      handleSend(
        "Bisa bantu buatkan rekomendasi aktivitas hari ini berdasarkan check-in dan prioritasku?",
        "recommendation",
        taskList
      );
    } else if (
      !loadingInitial &&
      location.state?.prefillPrompt &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      setInputText(location.state.prefillPrompt);
    }
  }, [loadingInitial, location.state, handleSend, taskList]);

  useEffect(() => {
    if (!taskModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setTaskModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskModalOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleClearConversation = async () => {
    if (user) {
      try {
        await supabase.from("chat_messages").delete().eq("user_id", user.id);
      } catch {
        // Ignore if Cloud RLS restricts DELETE on chat_messages
      }
    }
    setMessages([]);
    setPinnedCard(null);
    setSelectedImage(null);
    setLocalPhotoPreviews({});
    setCrisisModeActive(false);
  };

  const handleAddTask = () => {
    const trimmed = taskInput.trim();
    if (!trimmed) {
      taskInputRef.current?.focus();
      return;
    }
    if (taskList.length >= 10) return;
    setTaskList((prev) => [...prev, trimmed.slice(0, 100)]);
    setTaskInput("");
  };

  const handleRemoveTask = (idx) => {
    setTaskList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitTasksModal = async () => {
    setTaskModalOpen(false);
    await handleSend(
      "Bisa bantu buatkan rekomendasi aktivitas hari ini berdasarkan check-in dan prioritasku?",
      "recommendation",
      taskList
    );
  };

  const focusRecommendationCard = () => {
    recCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Dedicated Crisis View (Matches Stitch Screen 41: PCOSmart Mobile - Status Krisis "Kamu Tidak Sendirian")
  if (crisisModeActive) {
    return (
      <div className="w-full max-w-[680px] mx-auto flex flex-col pb-6">
        {/* Subtle Supportive Context Header Indicator */}
        <div className="pt-1 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">eco</span>
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Ruang Pendampingan Hangat
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/60 px-3 py-1 rounded-full font-semibold">
            Aktif Mendengarkan
          </span>
        </div>

        {/* Recent Distress & Assistant Empathic Turn */}
        <div className="flex flex-col gap-4 py-3">
          <div className="flex justify-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full">
              Hari ini • Ruang Aman
            </span>
          </div>

          {messages.slice(-2).map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex flex-col items-end pl-8">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-[85%]">
                  <p className="font-body-md text-body-md leading-relaxed">{m.content}</p>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 mr-1">
                  Dibaca • {formatTimeWIB(m.created_at)}
                </span>
              </div>
            ) : (
              <div key={m.id} className="flex flex-col items-start pr-6">
                <div className="flex items-start gap-2.5 max-w-full">
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest text-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">spa</span>
                  </div>
                  <div className="bg-surface-container-lowest text-on-surface rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 ml-11">
                  PCOSmart AI • {formatTimeWIB(m.created_at)}
                </span>
              </div>
            )
          )}

          {/* Breathing Anchor Prompt */}
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-3 rounded-2xl shadow-sm">
            <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">air</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tarik napas lembut selama 4 detik, tahan 4 detik, dan hembuskan perlahan...
            </p>
          </div>
        </div>

        {/* Crisis / Supportive Help Card */}
        <section className="mt-2">
          <div className="bg-gradient-to-b from-surface-container-lowest via-secondary-container/20 to-surface-container-low rounded-3xl p-6 shadow-md flex flex-col gap-4">
            <div className="flex flex-col items-center text-center pt-1">
              <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center mb-3 shadow-sm">
                <span className="material-symbols-outlined text-secondary text-[28px] fill-1">
                  favorite
                </span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                Kamu Tidak Sendirian
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 px-2 leading-relaxed max-w-md">
                Saat rasa cemas atau lelah terasa terlalu berat, berbicara dengan seseorang yang
                terlatih bisa membantumu merasa lebih tenang dan didengarkan.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <h3 className="font-label-lg text-label-lg text-on-surface font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  verified_user
                </span>
                Kontak Bantuan Terverifikasi
              </h3>
              <span className="font-label-sm text-label-sm text-secondary bg-surface-container-high px-2.5 py-0.5 rounded-full">
                Bebas Pulsa & Aman
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href="tel:119"
                className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-high/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] fill-1">
                      phone_in_talk
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">
                      Layanan Sejiwa (Kemenkes RI)
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      Konseling psikologis gratis 24 jam
                    </span>
                  </div>
                </div>
                <span className="ml-2 px-3 py-1.5 rounded-full bg-secondary text-on-secondary font-label-md text-label-md shrink-0 flex items-center gap-1 shadow-sm">
                  <span>119 ext. 8</span>
                </span>
              </a>

              <a
                href="https://yayasanpulih.org"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:bg-surface-container-high/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] fill-1">
                      chat_bubble
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">
                      Yayasan Pulih
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      Dukungan konseling trauma & emosional
                    </span>
                  </div>
                </div>
                <span className="ml-2 px-3.5 py-1.5 rounded-full bg-surface-container-highest text-primary font-label-md text-label-md shrink-0 flex items-center gap-1 font-medium">
                  <span>Hubungi</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </a>

              <a
                href="tel:129"
                className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed-dim text-on-secondary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] fill-1">
                      health_and_safety
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">
                      Hotline Sahabat Wanita (SAPA 129)
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      Layanan perlindungan & kesehatan mental 24 jam
                    </span>
                  </div>
                </div>
                <span className="ml-2 px-3.5 py-1.5 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md shrink-0 flex items-center gap-1 font-medium group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                  <span>Hubungi 129</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </a>
            </div>

            <div className="p-3 bg-surface-container-high/60 rounded-2xl flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                sentiment_calm
              </span>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Pilihanmu untuk beristirahat dan meminta bantuan adalah bentuk keberanian besar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCrisisModeActive(false)}
              className="w-full py-3.5 px-4 rounded-full bg-surface-container-highest text-primary font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-primary-fixed transition-colors active:scale-[0.99] mt-1"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Kembali ke Obrolan Santai</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full relative">
      {/* Top Action Breadcrumb & Mode Status (Matches Stitch Screen 27 & 50) */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md bg-surface-container-low px-4 sm:px-space-lg py-space-sm rounded-2xl sm:rounded-full">
        <div className="flex items-center gap-space-sm min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0" />
          <span className="font-label-md text-label-md text-on-surface truncate">
            Ruang AI • Konsultasi & Pendampingan Hormonal
          </span>
          <span className="hidden md:inline-block text-outline-variant font-label-sm">•</span>
          <span className="hidden md:inline-block font-label-sm text-label-sm text-on-surface-variant truncate">
            Personalisasi adaptif berdasarkan catatan harianmu
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest hover:bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">checklist</span>
            <span>Tugas Hari Ini ({taskList.length})</span>
          </button>

          <button
            type="button"
            onClick={handleClearConversation}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Reset Sesi</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Assistant Layout (Chat first on Mobile, Sidebar second; Sidebar first on Desktop) */}
      <div className="flex flex-col lg:flex-row gap-space-md lg:gap-space-lg items-start">
        {/* 1. LEFT CONTEXT PANEL (320px on Desktop, below Chat on Mobile) */}
        <aside className="order-2 lg:order-1 w-full lg:w-[320px] shrink-0 flex flex-col gap-space-md">
          {/* Pinned Recommendation Card (Appears when a Recommendation Card exists, matching Stitch Screen 27) */}
          {pinnedCard && (
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-primary-fixed/25 blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-space-xs mb-space-sm">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px] fill-1">
                    keep
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface text-[1.05rem] font-bold">
                    Rekomendasi Hari Ini
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-label-sm text-label-sm font-semibold capitalize whitespace-nowrap">
                  Beban: {pinnedCard.beban}
                </span>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md line-clamp-2 leading-relaxed">
                3 penyesuaian ritme tubuh berdasarkan catatan energi dan siklusmu hari ini.
              </p>

              <div className="flex flex-col gap-space-xs mb-space-md">
                {(pinnedCard.aktivitas || []).slice(0, 3).map((act, idx) => {
                  const style = ACTIVITY_STYLES[idx % 3];
                  const titlePart = act.split("—")[0].trim();
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-space-sm p-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${style.iconWrap} flex items-center justify-center shrink-0`}
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          {style.pinIcon}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface font-medium truncate">
                          {titlePart}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {style.pinSub}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={focusRecommendationCard}
                className="w-full h-11 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 hover:opacity-95 shadow-sm transition-transform active:scale-[0.99]"
              >
                <span>Buka Rincian Lengkap</span>
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
            </div>
          )}

          {/* Status Quota Card */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-secondary-fixed/40 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Kapasitas Sesi
              </span>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Aktif
              </span>
            </div>

            <div className="flex items-baseline gap-space-xs mb-space-xs">
              <span className="font-display-lg text-headline-lg text-primary font-bold">
                {remainingQuota}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">/ 20 pesan</span>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
              Sisa pesan jam ini:{" "}
              <strong className="text-on-surface font-semibold">{remainingQuota}</strong>
            </p>

            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${(remainingQuota / 20) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-space-xs text-on-surface-variant">
              <span className="font-label-sm text-label-sm">Kuota bergulir</span>
              <span className="font-label-sm text-label-sm font-medium">20 pesan / jam</span>
            </div>
          </div>

          {/* Check-in Context Summary Card */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
            <div className="flex items-center gap-space-sm mb-space-sm">
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px] fill-1">task_alt</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                  Catatan Siklus Hari Ini
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  {todayCheckin ? "Check-in hari ini sudah siap" : "Belum diisi hari ini"}
                </span>
              </div>
            </div>

            {todayCheckin ? (
              <div className="bg-surface-container-low rounded p-space-sm flex flex-col gap-space-xs mb-space-sm">
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Tingkat Energi
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold bg-surface-container-highest px-2 py-0.5 rounded-full text-primary">
                    {todayCheckin.energy}/5 ({getEnergyLabel(todayCheckin.energy)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Mood Dominan
                  </span>
                  <span className="font-label-sm text-label-sm font-medium text-secondary">
                    {getMoodLabel(todayCheckin.mood)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Gejala Utama
                  </span>
                  <span className="font-label-sm text-label-sm font-medium text-tertiary truncate max-w-[140px]">
                    {todayCheckin.symptoms?.length
                      ? todayCheckin.symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(", ")
                      : "Stabil"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low rounded p-space-sm mb-space-sm flex flex-col gap-2">
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Isi check-in harian agar asisten AI dapat menyusun rekomendasi yang akurat.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/checkin")}
                  className="w-full py-1.5 px-3 rounded-full bg-primary-fixed text-primary font-label-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors"
                >
                  Isi Check-in Sekarang
                </button>
              </div>
            )}

            <div className="flex flex-col gap-space-xs pt-1">
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="w-full h-10 px-space-md rounded-full bg-surface-container hover:bg-surface-container-highest text-primary font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">checklist</span>
                <span>Atur Tugas Hari Ini</span>
              </button>
            </div>
          </div>

          {/* Helpful Topics & Safety Demo Triggers Pill Bar */}
          <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold block mb-space-sm">
              Topik Pendukung & Skenario Uji
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={openMealPhotoPicker}
                className="px-2.5 py-1 rounded-full bg-secondary-container/70 text-on-secondary-container font-label-sm text-label-sm font-semibold hover:bg-secondary-container transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                <span>Analisis Foto Makanan</span>
              </button>
              {SUPPORT_TOPICS.map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(topic, "free")}
                  className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-highest hover:text-primary transition-colors text-left"
                >
                  {topic.split(" ")[1]} {topic.split(" ")[2]}
                </button>
              ))}
              {import.meta.env.DEV && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Nyeri haidku sudah berlangsung 4 hari berturut-turut dan terasa lebih berat dari biasanya.",
                        "free"
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-tertiary-fixed/70 text-tertiary font-label-sm text-label-sm hover:bg-tertiary-fixed transition-colors"
                  >
                    ⚠️ Uji Banner Dokter
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Perdarahan keluar sangat deras selama berhari-hari disertai lemas luar biasa dan pusing berkunang-kunang.",
                        "free"
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-error-container/70 text-on-error-container font-label-sm text-label-sm hover:bg-error-container transition-colors"
                  >
                    🚨 Uji Alert Medis
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSend(
                        "Aku merasa lelah sekali dengan kondisi PCOS ini, rasanya cemas dan tidak sanggup menjalani hari-hari seperti ini lagi...",
                        "free"
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-secondary-container/70 text-on-secondary-container font-label-sm text-label-sm hover:bg-secondary-container transition-colors"
                  >
                    💚 Uji Status Krisis
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Privacy & Security Notice Badge */}
          <div className="bg-surface-container-high/60 rounded-lg p-space-md flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-primary">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span className="font-label-md text-label-md font-semibold">
                Keamanan & Privasi Terjaga
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              PCOSmart bukan alat diagnosis medis resmi. Informasi bersifat edukasi gaya hidup &
              pendampingan emosional sehari-hari.
            </p>
          </div>
        </aside>

        {/* 2. RIGHT CHAT AREA (Flex-1, prioritized first on Mobile) */}
        <section className="order-1 lg:order-2 flex-1 w-full bg-surface-container-lowest rounded-xl shadow-sm flex flex-col min-h-[540px] sm:min-h-[680px] overflow-hidden">
          {/* Chat Header */}
          <header className="px-4 sm:px-space-lg py-3 sm:py-space-md bg-surface-container-low/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary-fixed-dim ring-2 ring-surface-container-lowest" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                    Asisten PCOSmart
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold shrink-0 whitespace-nowrap">
                    AI Empatis
                  </span>
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant leading-tight flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">info</span>
                  Asisten ini bukan pengganti dokter spesialis obstetri & ginekologi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-xs shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleSend(
                    "Bisa bantu buatkan rekomendasi aktivitas hari ini berdasarkan check-in dan prioritasku?",
                    "recommendation",
                    taskList
                  )
                }
                className="h-9 px-space-md rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors"
              >
                <span>📌</span>
                <span className="hidden sm:inline">Rekomendasi Hari Ini</span>
              </button>
              <button
                type="button"
                onClick={handleClearConversation}
                title="Bersihkan percakapan"
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              </button>
            </div>
          </header>

          {errorBanner && (
            <div className="mx-space-lg mt-space-sm p-3 rounded-DEFAULT bg-error-container text-on-error-container font-body-sm flex items-center justify-between">
              <span>{errorBanner}</span>
              <button type="button" onClick={() => setErrorBanner("")}>
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Empty State Welcome Hero (Matches Stitch Screen 10) */}
          {messages.length === 0 ? (
            <div className="flex-1 px-space-lg py-space-xl flex flex-col items-center justify-center text-center">
              <div className="relative mb-space-md group">
                <div className="w-24 h-24 rounded-full bg-primary-fixed/50 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    viewBox="0 0 64 64"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="32" cy="32" fill="#F6E9FE" r="28" />
                    <path
                      d="M18 20C18 15.5817 21.5817 12 26 12H38C42.4183 12 46 15.5817 46 20V32C46 36.4183 42.4183 40 38 40H26L20 45V39.6C18.8 38 18 36.1 18 34V20Z"
                      fill="#D1BCFF"
                      opacity="0.45"
                    />
                    <path
                      d="M32 18C33.5 24 37.5 28 42 29C37 32 34 36.5 32 43C30 36.5 27 32 22 29C26.5 28 30.5 24 32 18Z"
                      fill="#006A60"
                    />
                    <path
                      d="M32 23C33 27 35.8 29.5 39 30.5C35.5 32.5 33.5 35.5 32 40C30.5 35.5 28.5 32.5 25 30.5C28.2 29.5 31 27 32 23Z"
                      fill="#98F3E4"
                    />
                    <circle cx="32" cy="32" fill="#54309C" r="2.5" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-on-secondary shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                </div>
              </div>

              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold max-w-lg mb-space-xs leading-snug">
                Halo {nickname}, ada yang ingin kamu tanyakan hari ini?
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-lg leading-relaxed">
                Ceritakan apa yang dirasakan tubuhmu atau pilih topik pembuka di bawah ini untuk
                memulai percakapan empatik bebas rasa cemas.
              </p>

              {/* 3 Suggested Prompt Cards */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-space-sm text-left mb-space-md">
                {SUGGESTED_PROMPTS.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleSend(
                        card.prompt,
                        card.mode,
                        card.mode === "recommendation" ? taskList : []
                      )
                    }
                    className="group p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all duration-200 flex flex-col justify-between text-left hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-space-sm transition-colors ${card.iconBg}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm uppercase tracking-wider font-bold block mb-1 ${card.catColor}`}
                      >
                        {card.category}
                      </span>
                      <p className="font-label-lg text-label-lg text-on-surface leading-snug">
                        {card.prompt}
                      </p>
                    </div>
                    <div className="mt-space-md flex items-center gap-1 text-primary font-label-sm text-label-sm font-semibold opacity-90 group-hover:opacity-100">
                      <span>Tanyakan ini</span>
                      <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-highest/60 text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  favorite
                </span>
                Ruang dengar aman, berbasis sains terkini untuk keseimbangan hormon wanita
              </div>
            </div>
          ) : (
            /* Messages Stream Container (Matches Stitch Screen 50 & 27) */
            <div className="flex-1 overflow-y-auto px-3 sm:px-space-lg py-space-md flex flex-col gap-space-md max-h-[600px]">
              <div className="flex items-center gap-space-md my-space-xs">
                <div className="h-px bg-surface-container-highest flex-1" />
                <span className="font-label-sm text-label-sm text-outline px-space-sm uppercase tracking-wider">
                  Hari Ini
                </span>
                <div className="h-px bg-surface-container-highest flex-1" />
              </div>

              {messages.map((msg) => {
                if (msg.role === "user") {
                  const previewUrl = localPhotoPreviews[msg.id];
                  const rawContent = String(msg.content || "");
                  const hasPhotoTag =
                    rawContent.startsWith("[Foto Makanan") ||
                    rawContent.startsWith("[Foto Bukan Makanan");
                  const [firstLine, ...restLines] = rawContent.split("\n");
                  const noteBody = restLines.join("\n").trim();
                  const photoLabel = hasPhotoTag
                    ? firstLine.replace(/^\[|\]$/g, "")
                    : "";

                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end gap-space-sm pl-6 sm:pl-12 ml-auto max-w-[580px]"
                    >
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-space-md py-3.5 shadow-sm flex flex-col gap-2">
                          {previewUrl && (
                            <img
                              src={previewUrl}
                              alt="Foto makanan pengguna"
                              className="w-48 sm:w-56 max-h-48 object-cover rounded-xl bg-surface-container-lowest/20"
                            />
                          )}
                          {hasPhotoTag && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-on-primary/15 text-on-primary font-label-sm text-label-sm font-medium self-start">
                              <span className="material-symbols-outlined text-[15px] shrink-0">
                                photo_camera
                              </span>
                              <span className="break-words">{photoLabel}</span>
                            </div>
                          )}
                          {(!hasPhotoTag || noteBody) && (
                            <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">
                              {hasPhotoTag ? noteBody : rawContent}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm px-1">
                          <span>{formatTimeWIB(msg.created_at)}</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary">
                            done_all
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center text-label-md font-bold shrink-0 mt-1">
                        {nickname.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                  );
                }

                const card = msg.meta?.card;
                const mealAnalysis = msg.meta?.meal_analysis;
                const sources = msg.meta?.sources || [];
                const suggestedAction = msg.meta?.suggested_action;
                const flagLevel = msg.flag_level || "none";
                const banner = msg.meta?.banner;

                return (
                  <div key={msg.id} className="flex items-start gap-space-sm max-w-[680px]">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">spa</span>
                    </div>

                    <div className="flex flex-col gap-space-md flex-1 min-w-0">
                      {/* Main Assistant Text Bubble */}
                      <div className="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-sm p-space-md shadow-sm flex flex-col gap-space-md">
                        <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </p>

                        {/* Suggested Action: Open Check-in (Rule #3 when recommendation requested without check-in) */}
                        {suggestedAction === "open_checkin" && (
                          <div className="p-3.5 rounded-DEFAULT bg-primary-fixed/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary">
                                edit_calendar
                              </span>
                              <span className="font-label-md text-on-surface font-semibold">
                                Check-in hari ini belum terisi
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate("/checkin")}
                              className="w-full sm:w-auto px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm font-semibold hover:bg-primary-container transition-all shrink-0 text-center"
                            >
                              Isi Check-in Sekarang
                            </button>
                          </div>
                        )}

                        {/* Article Sources Chips (Matches Stitch Screen 50) */}
                        {sources.length > 0 && (
                          <div className="flex flex-col gap-space-xs pt-space-xs bg-surface-container-lowest/90 p-space-sm rounded-DEFAULT">
                            <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface font-semibold">
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                auto_stories
                              </span>
                              <span>Rujukan Artikel Edukasi:</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {sources.map((src, idx) => (
                                <Link
                                  key={idx}
                                  to={`/education${src.article_id ? `?article=${src.article_id}` : ""}`}
                                  className="group inline-flex items-center gap-1.5 max-w-full px-3 sm:px-space-md py-1.5 rounded-full bg-secondary-container/40 hover:bg-secondary-container text-secondary font-label-sm text-label-sm transition-all shadow-sm"
                                >
                                  <span className="material-symbols-outlined text-[16px] shrink-0">
                                    menu_book
                                  </span>
                                  <span className="truncate max-w-[200px] sm:max-w-[260px]">
                                    Sumber: {src.title}
                                  </span>
                                  <span className="material-symbols-outlined text-[14px] shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform">
                                    arrow_forward
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamp & Micro-actions */}
                        <div className="flex items-center justify-between pt-1 font-label-sm text-label-sm text-on-surface-variant">
                          <span>{formatTimeWIB(msg.created_at)}</span>
                          {flagLevel === "crisis" && (
                            <button
                              type="button"
                              onClick={() => setCrisisModeActive(true)}
                              className="text-secondary font-semibold hover:underline"
                            >
                              Buka Kartu Kontak Bantuan
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Soft Warning Banner (Matches Stitch Screen 14 Turn 1) */}
                      {flagLevel === "warning" && banner && (
                        <div className="bg-tertiary-fixed rounded-lg p-space-md shadow-sm flex flex-col space-y-space-xs">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-7 h-7 rounded-full bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px] fill-1">
                                warning
                              </span>
                            </div>
                            <h2 className="font-headline-sm text-headline-sm text-on-tertiary-fixed leading-tight">
                              {banner.title}
                            </h2>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant leading-relaxed">
                            {banner.body}
                          </p>
                          <div className="pt-space-xs flex items-center gap-space-sm">
                            <button
                              type="button"
                              onClick={() => navigate("/checkin")}
                              className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-surface-container-lowest text-tertiary font-label-md text-label-md shadow-sm hover:bg-surface-container transition-all"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                schedule
                              </span>
                              <span>Catat Gejala Hari Ini</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Severe Alert Banner (Matches Stitch Screen 14 Turn 2) */}
                      {flagLevel === "severe" && banner && (
                        <div className="bg-error-container rounded-lg p-space-md shadow-sm flex flex-col space-y-space-sm">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-8 h-8 rounded-full bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
                              <span className="material-symbols-outlined text-[20px] fill-1">
                                error
                              </span>
                            </div>
                            <div>
                              <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-bold">
                                Prioritas Medis
                              </span>
                              <h2 className="font-headline-sm text-headline-sm text-on-error-container leading-tight">
                                {banner.title}
                              </h2>
                            </div>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-error-container leading-relaxed">
                            {banner.body}
                          </p>
                          <div className="bg-surface-container-lowest/80 rounded-DEFAULT p-space-sm flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-on-surface">
                              <span className="material-symbols-outlined text-error text-[16px]">
                                check_circle
                              </span>
                              <span className="font-label-md text-label-md">
                                Pastikan ada pendamping di dekatmu
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-on-surface">
                              <span className="material-symbols-outlined text-error text-[16px]">
                                check_circle
                              </span>
                              <span className="font-label-md text-label-md">
                                Hindari aktivitas fisik berat & minum air hangat
                              </span>
                            </div>
                          </div>
                          <div className="pt-space-xs flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => navigate("/history?view=doctor")}
                              className="flex-1 flex items-center justify-center gap-space-xs h-11 px-4 rounded-full bg-primary-container text-on-primary font-label-md shadow-sm hover:bg-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                picture_as_pdf
                              </span>
                              <span>Siapkan Ringkasan untuk Dokter</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Structured Meal Score Card */}
                      {mealAnalysis && <MealScoreCard analysis={mealAnalysis} />}

                      {/* FULL 'Rekomendasi Hari Ini' CARD (Matches Stitch Screen 27) */}
                      {card && (
                        <div
                          ref={recCardRef}
                          className="bg-surface-container-lowest rounded-lg p-6 shadow-md border border-outline-variant/20 relative overflow-hidden transition-all duration-300"
                        >
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary-container" />
                          <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-space-xs">
                                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                  Rekomendasi Hari Ini untuk {nickname}
                                </h2>
                                <span className="text-lg">✨</span>
                              </div>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">
                                Ritme Hormon Adaptif • Beban Kerja Terkelola
                              </span>
                            </div>

                            <div className="flex items-center gap-space-sm">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2F8F83]/15 text-[#006a60] font-label-md text-label-md font-semibold capitalize">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#006a60]" />
                                Beban: {card.beban}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPinnedCard(card)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary text-on-surface-variant font-label-sm text-label-sm font-medium transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">keep</span>
                                <span className="hidden sm:inline">Disematkan di Kiri</span>
                              </button>
                            </div>
                          </div>

                          {/* 3 Activity Items */}
                          <div className="flex flex-col gap-space-sm mb-space-lg">
                            {(card.aktivitas || []).map((act, idx) => {
                              const style = ACTIVITY_STYLES[idx % 3];
                              const [titlePart, descPart] = act.includes("—")
                                ? act.split("—")
                                : [act, ""];
                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-space-md p-space-md rounded-2xl bg-surface-container-low hover:bg-surface-container/70 transition-all"
                                >
                                  <div
                                    className={`w-11 h-11 rounded-2xl ${style.iconWrap} flex items-center justify-center shrink-0 shadow-sm`}
                                  >
                                    <span className="material-symbols-outlined text-[24px]">
                                      {style.icon}
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="font-headline-sm text-[1.02rem] text-on-surface font-semibold">
                                        {titlePart.trim()}
                                      </h3>
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${style.tagClass}`}
                                      >
                                        {style.tag}
                                      </span>
                                    </div>
                                    {descPart && (
                                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                                        {descPart.trim()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Tips Istirahat Block */}
                          {card.tips_istirahat && (
                            <div className="mb-space-lg rounded-2xl bg-surface-container p-space-md flex items-start gap-space-sm">
                              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-[20px]">
                                  bedtime
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-label-lg text-label-lg text-primary font-bold">
                                  Tips Istirahat Malam
                                </span>
                                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                                  {card.tips_istirahat}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Checklist Prioritas Tugas */}
                          {card.prioritas_tugas?.length > 0 && (
                            <div className="mb-space-lg">
                              <div className="flex items-center justify-between mb-space-sm">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-primary text-[20px]">
                                    playlist_add_check
                                  </span>
                                  <h3 className="font-headline-sm text-[1rem] text-on-surface font-bold">
                                    Prioritas Tugas Kamu Hari Ini
                                  </h3>
                                </div>
                                <span className="font-label-sm text-label-sm text-secondary font-semibold">
                                  {
                                    card.prioritas_tugas.filter((_, idx) => checkedTasks[idx])
                                      .length
                                  }{" "}
                                  dari {card.prioritas_tugas.length} selesai
                                </span>
                              </div>

                              <div className="flex flex-col gap-2">
                                {card.prioritas_tugas.map((t, idx) => {
                                  const isDone = Boolean(checkedTasks[idx]);
                                  return (
                                    <label
                                      key={idx}
                                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={() =>
                                          setCheckedTasks((prev) => ({
                                            ...prev,
                                            [idx]: !prev[idx],
                                          }))
                                        }
                                        className="w-5 h-5 accent-primary rounded cursor-pointer"
                                      />
                                      <span
                                        className={`font-body-sm text-body-sm text-on-surface flex-1 ${
                                          isDone ? "line-through opacity-70" : ""
                                        }`}
                                      >
                                        {t}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                                          isDone
                                            ? "bg-secondary-container text-secondary"
                                            : "bg-surface-container-highest text-on-surface-variant"
                                        }`}
                                      >
                                        {isDone ? "Selesai" : "Fokus"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Bottom Card Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setTaskModalOpen(true)}
                                className="h-10 px-4 rounded-full bg-primary text-on-primary font-label-md font-semibold hover:opacity-95 shadow-sm flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[18px]">sync</span>
                                <span>Perbarui Tugas</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSavedHistoryToast(true);
                                  setTimeout(() => setSavedHistoryToast(false), 2500);
                                }}
                                className="h-10 px-4 rounded-full bg-surface-container hover:bg-surface-container-highest text-primary font-label-md font-semibold transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                <span>Simpan ke Riwayat</span>
                              </button>
                            </div>
                            {savedHistoryToast && (
                              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                                ✓ Tersimpan ke riwayat harian
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-center gap-space-sm pl-1 pt-1">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-space-md py-2 rounded-full text-on-surface-variant font-label-sm text-label-sm">
                    <span>Asisten sedang merangkai saran hangat...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Bottom Input Area with Mobile Horizontal Quick Prompts */}
          <div className="p-3 sm:p-space-md bg-surface-container-lowest border-t border-surface-container-highest/40">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelectMealPhoto}
              className="hidden"
            />
            <div className="flex lg:hidden items-center gap-2 overflow-x-auto no-scrollbar pb-2.5">
              <button
                type="button"
                onClick={openMealPhotoPicker}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all"
              >
                <span>📸</span>
                <span>Analisis Foto Makanan</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSend(
                    "Berikan rekomendasi menu makan dan aktivitas ramah PCOS hari ini",
                    "recommendation",
                    taskList
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm whitespace-nowrap shrink-0 active:scale-95 transition-all"
              >
                <span>✨</span>
                <span>Rekomendasi hari ini</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm whitespace-nowrap shrink-0 active:scale-95 transition-all"
              >
                <span>📋</span>
                <span>Tugas hari ini ({taskList.length})</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSend("Bagaimana cara meredakan perut kembung dan lelah akibat PCOS?", "free")
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm whitespace-nowrap shrink-0 active:scale-95 transition-all"
              >
                <span>🌿</span>
                <span>Tips kembung & lelah</span>
              </button>
            </div>
            {(compressingImage || selectedImage) && (
              <div className="mb-2 flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/25">
                {compressingImage ? (
                  <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md px-1">
                    <span className="material-symbols-outlined text-[18px] animate-spin text-primary">
                      progress_activity
                    </span>
                    <span>Memperkecil foto makanan agar cepat dianalisis...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={selectedImage.previewDataUrl}
                        alt="Preview foto makanan"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-xs"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          {selectedImage.fileName}
                        </span>
                        <span className="font-label-sm text-label-sm text-secondary font-medium">
                          Siap dianalisis (~{Math.max(1, Math.round(selectedImage.byteSize / 1024))} KB)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Hapus foto makanan"
                      onClick={() => setSelectedImage(null)}
                      className="w-8 h-8 rounded-full hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </>
                )}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex flex-col gap-1.5"
            >
              <div className="relative flex items-center bg-surface-container-low rounded-full px-space-md py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:bg-surface-container-lowest transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(true)}
                  title="Atur Tugas Hari Ini"
                  className="w-8 h-8 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </button>
                <button
                  type="button"
                  onClick={openMealPhotoPicker}
                  disabled={sending || compressingImage}
                  title="Unggah Foto Makanan (Snap & Score)"
                  aria-label="Unggah Foto Makanan"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ml-0.5 ${
                    selectedImage
                      ? "bg-secondary-container text-secondary"
                      : "text-on-surface-variant hover:text-secondary hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={1000}
                  placeholder={
                    selectedImage
                      ? "Tambahkan catatan makanan (opsional) atau langsung kirim..."
                      : "Ketik pesan, unggah foto makanan, atau pilih topik di atas..."
                  }
                  className="w-full bg-transparent px-space-sm py-2 text-on-surface placeholder:text-outline font-body-md text-body-md outline-none"
                />
                <span className="font-label-sm text-label-sm text-outline shrink-0 mr-2 tabular-nums">
                  {inputText.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={
                    (!inputText.trim() && !selectedImage) ||
                    sending ||
                    compressingImage ||
                    remainingQuota <= 0
                  }
                  title="Kirim pesan"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                    (inputText.trim() || selectedImage) &&
                    !sending &&
                    !compressingImage &&
                    remainingQuota > 0
                      ? "bg-primary text-on-primary shadow-sm hover:bg-primary-container cursor-pointer"
                      : "bg-surface-container-highest text-outline cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>

              <div className="flex items-center justify-between px-space-md text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-secondary">lock</span>
                  Pesanmu privat & terlindungi
                </span>
                <div className="flex items-center gap-space-sm">
                  <span className="hidden sm:inline">Tekan</span>
                  <kbd className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                    Enter untuk kirim
                  </kbd>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Modal Dialog Overlay: Tugas Hari Ini (Bottom Sheet on Mobile, Centered Dialog on Desktop) */}
      {taskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2B2433]/35 backdrop-blur-[3px] p-0 sm:p-space-md transition-all duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTaskModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="w-full max-w-[540px] max-h-[90dvh] overflow-y-auto bg-surface-container-lowest rounded-t-[2rem] sm:rounded-[28px] p-5 sm:p-space-lg md:p-space-xl pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-space-lg md:pb-space-xl shadow-xl flex flex-col gap-space-md sm:gap-space-lg relative"
          >
            <div className="w-12 h-1.5 rounded-full bg-outline-variant/50 mx-auto sm:hidden -mt-1 mb-1" />
            {/* Modal Header */}
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px] fill-1">checklist</span>
              </div>
              <div className="flex flex-col flex-1 pr-6">
                <h2
                  id="task-modal-title"
                  className="font-headline-md text-headline-md text-on-surface leading-tight"
                >
                  Tugas Hari Ini
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  Tambahkan daftar tugas harianmu agar asisten dapat menyesuaikan tingkat beban
                  rekomendasi (Maksimal 10 tugas).
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup modal"
                onClick={() => setTaskModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline hover:text-on-surface transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Task Input Row & Counter */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm">
                <div className="relative flex-1">
                  <input
                    ref={taskInputRef}
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTask();
                      }
                    }}
                    maxLength={100}
                    placeholder="Ketik rencana tugas... (maks. 100 karakter)"
                    className="w-full h-[50px] px-space-md pr-16 bg-surface-container-low rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_2px_#6c4ab6] transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-sm text-label-sm text-outline pointer-events-none">
                    {taskInput.length}/100
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={taskList.length >= 10}
                  className="h-[50px] px-space-md rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-1 shadow-sm transition-all active:scale-95 shrink-0 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Tambah</span>
                </button>
              </div>
              <div className="flex items-center justify-between px-space-xs mt-0.5">
                <span className="font-label-sm text-label-sm text-outline">
                  Gunakan kalimat ringkas & jelas
                </span>
                <span className="font-label-sm text-label-sm font-semibold text-primary">
                  {taskList.length} / 10 tugas aktif
                </span>
              </div>
            </div>

            {/* Task List Items */}
            <div className="flex flex-col gap-space-xs max-h-[220px] overflow-y-auto pr-1">
              {taskList.map((task, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between p-space-md bg-surface-container-low hover:bg-surface-container rounded-DEFAULT transition-all duration-150"
                >
                  <div className="flex items-center gap-space-sm min-w-0 pr-2">
                    <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-md text-label-md text-on-surface truncate">
                        {task}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        {task.length}/100 kar.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(idx)}
                    title="Hapus tugas"
                    className="w-8 h-8 rounded-full text-outline hover:text-error hover:bg-error-container/40 flex items-center justify-center transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Pale Teal Callout Information */}
            <div className="p-space-md rounded-DEFAULT bg-secondary-container/40 flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 shrink-0 fill-1">
                info
              </span>
              <p className="font-label-md text-label-md text-on-secondary-fixed leading-snug">
                Asisten akan memadukan ritme energi check-in harianmu dengan beban tugas di atas
                untuk menjadwalkan interval istirahat yang ramah kortisol.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-space-md pt-space-xs">
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="h-12 px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitTasksModal}
                className="h-12 px-space-lg rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center gap-space-sm shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px] fill-1">auto_awesome</span>
                <span>Buat Rekomendasi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
