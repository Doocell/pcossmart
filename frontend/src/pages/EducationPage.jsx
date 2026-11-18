import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BOOKMARK_STORAGE_KEY = "pcosmart_bookmarked_articles_v1";

const CATEGORY_TABS = [
  { id: "all", label: "Semua Topik", icon: "apps" },
  { id: "apa_itu_pcos", label: "Apa itu PCOS", icon: "spa" },
  { id: "makanan", label: "Nutrisi & Makanan", icon: "restaurant" },
  { id: "aktivitas_fisik", label: "Aktivitas Fisik", icon: "directions_walk" },
  { id: "tidur_dan_stres", label: "Tidur & Stres", icon: "bedtime" },
  { id: "kapan_ke_dokter", label: "Kapan ke Dokter", icon: "stethoscope" },
];

const POPULAR_TOPIC_SUGGESTIONS = [
  { label: "✨ Resistensi Insulin", query: "insulin" },
  { label: "🥑 Nutrisi Ramah Hormon", query: "piring seimbang" },
  { label: "🌿 Teh Spearmint & Tidur", query: "tidur" },
  { label: "🧘‍♀️ Manajemen Kortisol", query: "kortisol" },
  { label: "🩺 Konsultasi Dokter", query: "dokter" },
];

function normalizeCategorySlug(rawCategory = "") {
  const c = rawCategory.toLowerCase().trim();
  if (c.includes("pcos") || c === "apa_itu_pcos") return "apa_itu_pcos";
  if (
    c.includes("makan") ||
    c.includes("nutrisi") ||
    c === "makanan"
  ) {
    return "makanan";
  }
  if (
    c.includes("aktivitas") ||
    c.includes("olahraga") ||
    c.includes("gaya hidup") ||
    c === "aktivitas_fisik"
  ) {
    return "aktivitas_fisik";
  }
  if (
    c.includes("tidur") ||
    c.includes("stres") ||
    c.includes("mental") ||
    c === "tidur_dan_stres"
  ) {
    return "tidur_dan_stres";
  }
  if (c.includes("dokter") || c === "kapan_ke_dokter") return "kapan_ke_dokter";
  return "apa_itu_pcos";
}

function getCategoryMeta(rawCategory = "") {
  const slug = normalizeCategorySlug(rawCategory);
  switch (slug) {
    case "makanan":
      return {
        slug,
        label: "Nutrisi & Makanan",
        icon: "restaurant",
        badgeClass: "bg-secondary-container/80 text-on-secondary-container",
        textClass: "text-secondary",
      };
    case "aktivitas_fisik":
      return {
        slug,
        label: "Aktivitas Fisik",
        icon: "directions_walk",
        badgeClass: "bg-primary-fixed text-primary",
        textClass: "text-primary",
      };
    case "tidur_dan_stres":
      return {
        slug,
        label: "Tidur & Stres",
        icon: "bedtime",
        badgeClass: "bg-tertiary-fixed text-on-tertiary-fixed",
        textClass: "text-tertiary",
      };
    case "kapan_ke_dokter":
      return {
        slug,
        label: "Kapan ke Dokter",
        icon: "clinical_notes",
        badgeClass: "bg-error-container/80 text-on-error-container",
        textClass: "text-tertiary",
      };
    case "apa_itu_pcos":
    default:
      return {
        slug: "apa_itu_pcos",
        label: "Apa itu PCOS",
        icon: "spa",
        badgeClass: "bg-primary-fixed text-primary",
        textClass: "text-primary",
      };
  }
}

const DEFAULT_FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCTCAsud9IOMJ6ZR8DrdQSSwxF0C9tx8PUViUFCKTW9lZtnBRmao1RcTwJmboQqMGS8mxb6jc9WjT0DgEEJWiVoMNbU6zoYHFXdp4BoiHcE89tcj6eu7h0HdJSfyUn7pL77WK987a7pWhF1r-qsDutWK3kL1QWEgfGv5sl6jVYK3SwkBlEPCgEb35O5DWvx7Z7AglQRZRxYgGK_NDjw7hdb4t7IyPihVC19Fd_S3cM-";

function formatInlineBold(text = "") {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderStructuredBody(body = "") {
  const blocks = body
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, idx) => {
    if (block.startsWith("## ")) {
      return (
        <h2
          key={idx}
          className="text-[21px] sm:text-[22px] font-bold text-[#2B2433] tracking-tight pt-2"
        >
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }

    const lines = block.split("\n").map((l) => l.trim());
    const isBulletList = lines.every((l) => l.startsWith("- "));
    if (isBulletList) {
      const icons = ["event_repeat", "face_retouching_natural", "favorite"];
      return (
        <div key={idx} className="flex flex-col gap-2.5 py-1">
          {lines.map((line, i) => (
            <div
              key={i}
              className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest/80 hover:border-primary-fixed transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-secondary-container/50 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                <span className="material-symbols-rounded text-[18px]">
                  {icons[i % icons.length]}
                </span>
              </div>
              <p className="text-[14px] text-on-surface leading-relaxed">
                {formatInlineBold(line.replace(/^-\s+/, ""))}
              </p>
            </div>
          ))}
        </div>
      );
    }

    const isNumberedList = lines.every((l) => /^\d+\.\s+/.test(l));
    if (isNumberedList) {
      return (
        <div key={idx} className="flex flex-col gap-3 py-1">
          {lines.map((line, i) => {
            const cleanText = line.replace(/^\d+\.\s+/, "");
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest shadow-2xs flex items-start gap-4"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[15px] shrink-0 shadow-xs ${
                    i % 2 === 1
                      ? "bg-secondary text-on-secondary"
                      : "bg-primary-container text-on-primary"
                  }`}
                >
                  {i + 1}
                </div>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  {formatInlineBold(cleanText)}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <p key={idx} className="text-[16px] text-on-surface-variant leading-relaxed">
        {formatInlineBold(block)}
      </p>
    );
  });
}

export default function EducationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Detail View state
  const [readingProgress, setReadingProgress] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [feedbackVote, setFeedbackVote] = useState(null);

  const queryParam = searchParams.get("q") || "";
  const activeArticleId = searchParams.get("article") || "";
  const [searchInput, setSearchInput] = useState(queryParam);

  // Sync searchInput when URL ?q= changes from AppShell top search bar
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    let isMounted = true;
    async function loadArticles() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("education_articles")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        setArticles(data || []);
      } catch (err) {
        console.warn("Failed to load education articles:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadArticles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reading progress listener when viewing an article
  useEffect(() => {
    if (!activeArticleId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFeedbackVote(null);
    setReadingProgress(0);

    const handleScroll = () => {
      const docElem = document.documentElement;
      const totalHeight = docElem.scrollHeight - docElem.clientHeight;
      if (totalHeight > 0) {
        const pct = (docElem.scrollTop / totalHeight) * 100;
        setReadingProgress(Math.min(100, Math.max(0, pct)));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeArticleId]);

  const toggleBookmark = (id, e) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleSearchChange = (val) => {
    setSearchInput(val);
    const nextParams = {};
    if (val.trim()) nextParams.q = val;
    if (activeArticleId) nextParams.article = activeArticleId;
    setSearchParams(nextParams, { replace: true });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSelectedCategory("all");
    setOnlyBookmarked(false);
    setSearchParams({}, { replace: true });
  };

  const openArticle = (id) => {
    const nextParams = { article: id };
    if (searchInput.trim()) nextParams.q = searchInput.trim();
    setSearchParams(nextParams);
  };

  const closeArticle = () => {
    const nextParams = {};
    if (searchInput.trim()) nextParams.q = searchInput.trim();
    setSearchParams(nextParams);
  };

  const filteredArticles = useMemo(() => {
    const q = searchInput.toLowerCase().trim();
    return articles.filter((art) => {
      const catSlug = normalizeCategorySlug(art.category);
      const matchesCat =
        selectedCategory === "all" || catSlug === selectedCategory;
      const matchesBookmark =
        !onlyBookmarked || bookmarkedIds.includes(art.id);
      const matchesQuery =
        !q ||
        (art.title || "").toLowerCase().includes(q) ||
        (art.summary || "").toLowerCase().includes(q) ||
        (art.body || "").toLowerCase().includes(q) ||
        (art.category || "").toLowerCase().includes(q) ||
        (art.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesBookmark && matchesQuery;
    });
  }, [articles, searchInput, selectedCategory, onlyBookmarked, bookmarkedIds]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return articles.find((a) => a.id === activeArticleId) || null;
  }, [articles, activeArticleId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-primary">
        <span className="material-symbols-rounded animate-spin text-[36px]">
          progress_activity
        </span>
        <p className="font-label-md text-label-md text-on-surface-variant">
          Memuat Pustaka Edukasi Hormon...
        </p>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: DETAIL ARTIKEL EDUKASI (Stitch Screen 8dda824ae65a4866886833dc7aa8c75a)
  // ============================================================================
  if (activeArticleId && !activeArticle) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center text-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-surface-container text-primary flex items-center justify-center">
          <span className="material-symbols-rounded text-[32px]">article</span>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
          Artikel Belum Tersedia
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
          Materi yang kamu cari belum dimuat atau tautannya sudah berubah. Yuk kembali ke katalog pustaka edukasi.
        </p>
        <button
          type="button"
          onClick={closeArticle}
          className="h-11 px-6 rounded-full bg-primary-container text-on-primary font-label-md font-bold shadow-sm hover:bg-primary transition-colors"
        >
          Kembali ke Pustaka Edukasi
        </button>
      </div>
    );
  }

  if (activeArticle) {
    const catMeta = getCategoryMeta(activeArticle.category);
    const isSaved = bookmarkedIds.includes(activeArticle.id);
    const relatedArticles = articles
      .filter((a) => a.id !== activeArticle.id)
      .slice(0, 2);
    const quickPrompts = activeArticle.quick_prompts || [
      "Bagaimana menerapkan panduan artikel ini sehari-hari?",
      "Contoh langkah kecil dari artikel ini untuk kondisiku?",
    ];
    const tags = activeArticle.tags || [
      "#EdukasiPCOS",
      "#KeseimbanganHormon",
      "#GayaHidupLembut",
    ];

    const handleShare = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        // ignore clipboard error
      }
    };

    return (
      <div className="flex flex-col gap-6 pb-4 lg:pb-14">
        {/* Breadcrumb & Subtle Top Reading Progress Bar */}
        <div className="w-full flex flex-col gap-3 pb-2">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-on-surface-variant text-[13px] font-medium flex-wrap"
          >
            <button
              type="button"
              onClick={closeArticle}
              className="hover:text-primary transition-colors flex items-center gap-1.5 font-semibold"
            >
              <span className="material-symbols-rounded text-[16px]">
                menu_book
              </span>
              <span>Pustaka Edukasi</span>
            </button>
            <span className="material-symbols-rounded text-outline-variant text-[14px]">
              chevron_right
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(catMeta.slug);
                closeArticle();
              }}
              className="hover:text-primary transition-colors font-semibold text-secondary"
            >
              {catMeta.label}
            </button>
            <span className="material-symbols-rounded text-outline-variant text-[14px]">
              chevron_right
            </span>
            <span className="text-on-surface font-semibold truncate max-w-xs md:max-w-md">
              {activeArticle.title}
            </span>
          </nav>

          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full transition-all duration-150"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        </div>

        {/* 12-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT / MAIN READING COLUMN (Columns 1-8) */}
          <article className="lg:col-span-8 flex flex-col gap-7 max-w-[740px] w-full">
            <header className="flex flex-col gap-4">
              <div>
                <button
                  type="button"
                  onClick={closeArticle}
                  className="hidden lg:inline-flex items-center gap-2 text-secondary hover:text-on-secondary-container font-bold text-[13px] group py-1 transition-all"
                >
                  <span className="material-symbols-rounded text-[18px] group-hover:-translate-x-1 transition-transform">
                    arrow_back
                  </span>
                  <span>Kembali ke Pustaka Edukasi</span>
                </button>
              </div>

              {/* Categories & Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold tracking-tight ${catMeta.badgeClass}`}
                >
                  <span className="material-symbols-rounded text-[15px]">
                    {catMeta.icon}
                  </span>
                  {catMeta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/60 text-primary text-[12px] font-semibold">
                  <span className="material-symbols-rounded text-[15px]">
                    verified
                  </span>
                  Tinjauan Klinis Terverifikasi
                </span>
              </div>

              {/* Article Title */}
              <h1 className="text-[28px] sm:text-[34px] font-extrabold text-[#2B2433] tracking-tight leading-[1.25]">
                {activeArticle.title}
              </h1>

              {/* Author, Reviewer & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-4 border-b border-surface-container-high">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shadow-xs">
                    <span className="material-symbols-rounded text-[22px]">
                      stethoscope
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] text-on-surface font-bold">
                        {activeArticle.author || "dr. Amanda Sp.OG"}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span className="text-[12px] text-secondary font-semibold">
                        {activeArticle.reviewer || "Ditinjau Tim Medis PCOSmart"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-on-surface-variant font-medium">
                      <span>
                        {activeArticle.published_date || "20 Oktober 2024"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">
                          timer
                        </span>
                        {activeArticle.read_minutes || 5} menit baca
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bookmark & Share Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(activeArticle.id, e)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-colors text-[13px] font-semibold ${
                      isSaved
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      {isSaved ? "bookmark" : "bookmark_border"}
                    </span>
                    <span>{isSaved ? "Tersimpan" : "Simpan"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors text-[13px] font-semibold"
                  >
                    <span className="material-symbols-rounded text-[18px]">
                      {shareCopied ? "check" : "share"}
                    </span>
                    <span>{shareCopied ? "Tautan Disalin!" : "Bagikan"}</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Featured Visual Banner Image */}
            <div className="relative w-full rounded-3xl overflow-hidden bg-surface-container shadow-sm border border-surface-container-highest/60">
              <img
                src={activeArticle.image_url || DEFAULT_FALLBACK_IMAGE}
                alt={activeArticle.title}
                className="w-full h-64 sm:h-80 object-cover object-center"
              />
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-inverse-surface/80 backdrop-blur-md rounded-full text-inverse-on-surface text-[12px] font-medium flex items-center gap-1.5">
                <span className="material-symbols-rounded text-[14px]">
                  spa
                </span>
                Keseimbangan Endokrin
              </div>
            </div>

            {/* Lead Summary Callout Box */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-primary-fixed/80 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[14px]">
                <span className="material-symbols-rounded text-[20px]">
                  lightbulb
                </span>
                <span>Intisari Panduan</span>
              </div>
              <p className="text-[15px] text-on-surface leading-relaxed font-medium">
                {activeArticle.summary}
              </p>
            </div>

            {/* Structured Article Body */}
            <div className="flex flex-col gap-4">
              {renderStructuredBody(activeArticle.body)}
            </div>

            {/* Feedback Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-high/60 border border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-primary text-[26px]">
                  sentiment_satisfied
                </span>
                <div className="flex flex-col">
                  <span className="text-[14px] text-on-surface font-bold">
                    {feedbackVote
                      ? "Terima kasih atas tanggapanmu!"
                      : "Apakah artikel ini membantumu?"}
                  </span>
                  <span className="text-[12px] text-on-surface-variant">
                    Beri kami tanggapan untuk terus memperkaya pustaka edukasi
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackVote("up")}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                    feedbackVote === "up"
                      ? "bg-primary-container text-on-primary border-primary-container"
                      : "bg-surface-container-lowest border-surface-container-highest text-on-surface-variant hover:bg-primary-fixed hover:text-primary"
                  }`}
                  title="Bermanfaat"
                >
                  <span className="material-symbols-rounded text-[18px]">
                    thumb_up
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackVote("down")}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                    feedbackVote === "down"
                      ? "bg-tertiary-container text-on-tertiary border-tertiary-container"
                      : "bg-surface-container-lowest border-surface-container-highest text-on-surface-variant hover:bg-surface-dim"
                  }`}
                  title="Perlu Penjelasan Lebih"
                >
                  <span className="material-symbols-rounded text-[18px]">
                    thumb_down
                  </span>
                </button>
              </div>
            </div>

            {/* MANDATORY: Sumber Ilmiah & Bacaan Lanjutan */}
            <section className="p-4 sm:p-6 rounded-2xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-3">
              <div className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-rounded text-primary text-[22px]">
                  library_books
                </span>
                <h4 className="text-[16px] text-on-surface font-bold tracking-tight">
                  Sumber Ilmiah & Bacaan Lanjutan
                </h4>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                PCOSmart berkomitmen menyajikan informasi berbasis bukti
                (evidence-based medicine) yang dirujuk dari jurnal peer-reviewed
                dan pedoman organisasi medis terdaftar:
              </p>
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-[13px] text-secondary font-bold shrink-0">
                    1.
                  </span>
                  <span className="text-[13px] text-on-surface font-semibold">
                    {activeArticle.source_name ||
                      "WHO & International PCOS Guideline"}
                  </span>
                </div>
                {activeArticle.source_url && (
                  <a
                    href={activeArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-secondary hover:text-on-secondary-container flex items-center gap-1 text-[12px] font-bold"
                  >
                    <span>Tautan Eksternal</span>
                    <span className="material-symbols-rounded text-[14px]">
                      arrow_outward
                    </span>
                  </a>
                )}
              </div>
            </section>

            {/* MANDATORY: Non-Clinical Medical Disclaimer Banner */}
            <section className="p-5 rounded-2xl bg-surface-container-highest/90 border border-surface-container-highest flex items-start gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                <span className="material-symbols-rounded text-[22px]">
                  health_and_safety
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] text-on-surface font-bold">
                  Pemberitahuan Medis Penting
                </span>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  Informasi ini bukan pengganti saran dokter. Seluruh materi
                  edukasi di PCOSmart disusun semata-mata untuk literasi gaya
                  hidup dan dukungan mandiri. Konsultasikan gejala dan rencana
                  terapi klinis dengan dokter spesialis obstetri & ginekologi
                  (Sp.OG) atau endokrinolog.
                </p>
              </div>
            </section>
          </article>

          {/* RIGHT COLUMN (Sticky Side Panel: Columns 9-12) */}
          <aside className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
            {/* Primary Sticky Card: AI Pendamping Empatis */}
            <div className="rounded-3xl p-6 bg-surface-container-lowest border border-surface-container-highest shadow-[0_8px_24px_-4px_rgba(108,74,182,0.08)] flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary-fixed-dim/40 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary text-[12px] font-bold">
                  <span className="material-symbols-rounded text-[16px] text-primary">
                    auto_awesome
                  </span>
                  AI Pendamping Empatis
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"
                  title="Asisten Siaga"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-[17px] font-bold text-on-surface tracking-tight leading-snug">
                  Ada hal yang ingin kamu tanyakan dari artikel ini?
                </h3>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Asisten PCOSmart memahami konteks artikel ini dan siap
                  membantumu menyusun langkah praktis yang sesuai kondisimu hari
                  ini.
                </p>
              </div>

              {/* Quick Prompt Chips */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[11px] text-outline uppercase tracking-wider font-bold">
                  Pertanyaan Cepat:
                </span>
                {quickPrompts.map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      navigate("/chat", {
                        state: {
                          contextArticleId: activeArticle.id,
                          prefillPrompt: promptText,
                        },
                      })
                    }
                    className="text-left p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-on-surface text-[12px] font-semibold transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">&ldquo;{promptText}&rdquo;</span>
                    <span className="material-symbols-rounded text-outline group-hover:text-primary text-[18px] shrink-0">
                      send
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/chat", {
                    state: {
                      contextArticleId: activeArticle.id,
                      prefillPrompt: `Saya baru membaca artikel "${activeArticle.title}". Bisa bantu jelaskan bagaimana menerapkannya untuk kondisiku?`,
                    },
                  })
                }
                className="w-full h-11 rounded-full bg-primary-container hover:bg-primary text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_20px_-4px_rgba(108,74,182,0.35)] transition-all"
              >
                <span className="material-symbols-rounded text-[19px]">
                  chat_spark
                </span>
                <span>Mulai Tanya Asisten</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-on-surface-variant text-[11px] font-medium pt-1">
                <span className="material-symbols-rounded text-[13px]">
                  lock
                </span>
                <span>Privasi percakapan tersimpan aman</span>
              </div>
            </div>

            {/* Card: Bacaan Terkait */}
            {relatedArticles.length > 0 && (
              <div className="rounded-3xl p-5 bg-surface-container-lowest border border-surface-container-highest shadow-xs flex flex-col gap-3">
                <span className="text-[11px] uppercase tracking-wider text-outline font-bold">
                  Bacaan Terkait
                </span>
                {relatedArticles.map((rel, idx) => {
                  const relCat = getCategoryMeta(rel.category);
                  return (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() => openArticle(rel.id)}
                      className={`group flex gap-3 items-center p-2 rounded-xl hover:bg-surface-container-low transition-colors text-left ${
                        idx > 0
                          ? "border-t border-surface-container-high/60 pt-3"
                          : ""
                      }`}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container shrink-0 relative border border-surface-container-highest">
                        <img
                          src={rel.image_url || DEFAULT_FALLBACK_IMAGE}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="inline-flex items-center gap-1 text-[11px] text-secondary font-bold">
                          <span className="material-symbols-rounded text-[13px]">
                            {relCat.icon}
                          </span>
                          {relCat.label}
                        </span>
                        <h4 className="text-[13px] text-on-surface font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {rel.title}
                        </h4>
                        <span className="text-[11px] text-on-surface-variant mt-0.5">
                          {rel.read_minutes || 5} menit baca
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Card: Topik Terkait */}
            <div className="p-5 rounded-3xl bg-surface-container-low border border-surface-container-highest flex flex-col gap-2.5">
              <span className="text-[11px] uppercase tracking-wider text-outline font-bold">
                Topik Terkait
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const clean = tag.replace(/^#/, "");
                      setSelectedCategory("all");
                      setOnlyBookmarked(false);
                      setSearchInput(clean);
                      setSearchParams({ q: clean });
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-surface-container-highest text-on-surface-variant hover:text-primary hover:border-primary text-[12px] font-semibold transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky Mobile Action Bar for Article Reader (mobile_stack) */}
        <div className="lg:hidden sticky bottom-0 z-30 -mx-margin px-margin pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-surface/95 backdrop-blur-md border-t border-surface-container-highest/60 flex items-center gap-2.5">
          <button
            type="button"
            onClick={(e) => toggleBookmark(activeArticle.id, e)}
            aria-label={isSaved ? "Hapus dari tersimpan" : "Simpan artikel"}
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isSaved
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-rounded text-[22px]">
              {isSaved ? "bookmark" : "bookmark_border"}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate("/chat", {
                state: {
                  contextArticleId: activeArticle.id,
                  prefillPrompt: `Saya baru membaca artikel "${activeArticle.title}". Bisa bantu jelaskan bagaimana menerapkannya untuk kondisiku?`,
                },
              })
            }
            className="flex-1 h-12 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-rounded text-[20px]">chat_spark</span>
            <span>Tanyakan ke Asisten AI</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1 & 3: DAFTAR ARTIKEL EDUKASI + PENCARIAN TIDAK DITEMUKAN
  // (Stitch Screens c73aa89ed1a247099be56f1b6cf25bbd & 725358e828e54261b55f21fb2d77e00c)
  // ============================================================================
  return (
    <div className="flex flex-col gap-5 sm:gap-8 pb-8 sm:pb-14">
      {/* Header Pencarian & Kategori */}
      <header className="flex flex-col gap-3 sm:gap-4">
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-surface-container text-primary font-label-md text-label-md font-bold shadow-2xs">
          <span className="material-symbols-rounded text-[18px]">
            menu_book
          </span>
          <span>Pustaka Edukasi Hormon</span>
        </div>

        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-[#2B2433] font-extrabold tracking-tight">
            Katalog Artikel & Panduan Hormon
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
            Pelajari ritme tubuh, nutrisi ramah resistensi insulin, dan panduan
            gaya hidup seimbang berbasis sains.
          </p>
        </div>

        {/* Search Bar Large */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2 w-full">
          <div className="relative flex-1 w-full flex items-center bg-surface-container-lowest rounded-full shadow-xs border border-surface-container-highest">
            <span className="material-symbols-rounded absolute left-5 text-outline text-[22px] pointer-events-none">
              search
            </span>
            <input
              id="edukasi-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari artikel edukasi, nutrisi, atau gejala..."
              className="w-full h-14 pl-14 pr-12 rounded-full bg-transparent text-[#2B2433] font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container/40"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Hapus kata kunci"
                className="absolute right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-rounded text-[18px]">
                  close
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyBookmarked((b) => !b)}
            className={`h-14 px-6 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-xs ${
              onlyBookmarked
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-primary hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-rounded text-[20px]">
              {onlyBookmarked ? "bookmark" : "bookmarks"}
            </span>
            <span>Tersimpan ({bookmarkedIds.length})</span>
          </button>
        </div>

        {/* Barisan Chip Kategori (Edge-to-edge swipeable on Mobile) */}
        <div className="-mx-margin px-margin sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mt-1">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-5 py-2.5 rounded-full font-label-md text-label-md font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-primary-container text-on-primary shadow-sm shadow-primary/20"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-rounded text-[17px]">
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ====================================================================
          EMPTY SEARCH STATE (Stitch Screen 725358e828e54261b55f21fb2d77e00c)
         ==================================================================== */}
      {filteredArticles.length === 0 ? (
        <>
          <section className="max-w-[760px] w-full mx-auto my-4 p-8 sm:p-10 rounded-3xl bg-surface-container-lowest shadow-[0_8px_30px_rgba(108,74,182,0.06)] border border-surface-container-highest/60 relative overflow-hidden">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-surface-container rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="relative flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center relative mb-2 shadow-inner">
                <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-xs">
                  <span className="material-symbols-rounded text-[34px]">
                    search_off
                  </span>
                </div>
                <span className="material-symbols-rounded absolute -top-1 -right-1 text-secondary text-[24px]">
                  local_florist
                </span>
              </div>

              <h2 className="font-headline-md text-headline-md font-bold text-[#2B2433] mt-3">
                Artikel Tidak Ditemukan
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mt-3 leading-relaxed">
                Kami tidak menemukan artikel dengan kata kunci{" "}
                <span className="font-label-md font-bold text-primary bg-surface-container px-2.5 py-0.5 rounded-full">
                  &ldquo;{searchInput || "filter terpilih"}&rdquo;
                </span>
                . Jangan khawatir, perjalanan hormon dan ovulasi alami adalah
                proses bertahap. Kamu bisa mencoba kata kunci umum atau telusuri
                topik populer di bawah.
              </p>

              {/* Two Central Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3.5 mt-7">
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="h-12 px-7 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-2 shadow-md shadow-primary/25 hover:bg-primary transition-all active:scale-95"
                >
                  <span className="material-symbols-rounded text-[18px]">
                    refresh
                  </span>
                  <span>Hapus Pencarian</span>
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-12 px-7 rounded-full bg-surface-container text-primary font-label-lg text-label-lg font-bold hover:bg-surface-container-high transition-all active:scale-95"
                >
                  Lihat Semua Artikel
                </button>
              </div>

              {/* Popular Topic Suggestions */}
              <div className="w-full mt-8 pt-6 border-t border-surface-container-highest flex flex-col items-center">
                <span className="font-label-md text-label-md text-outline font-semibold">
                  Atau coba telusuri topik yang sering dicari:
                </span>
                <div className="flex flex-wrap justify-center gap-2 mt-3.5">
                  {POPULAR_TOPIC_SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setSelectedCategory("all");
                        setOnlyBookmarked(false);
                        handleSearchChange(item.query);
                      }}
                      className="px-4 py-2 rounded-full bg-surface-container-low text-primary hover:bg-secondary-container hover:text-on-secondary-container font-label-md text-label-md font-semibold transition-all shadow-2xs"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Companion Box inside Empty State */}
              <div className="w-full mt-7 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-surface-container via-surface-container-low to-secondary-container/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-xs border border-surface-container-highest">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-rounded text-[24px]">
                      smart_toy
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                    Punya pertanyaan khusus tentang topik{" "}
                    <span className="font-bold text-primary">
                      {searchInput || "PCOS"}
                    </span>
                    ? Tanyakan langsung secara privat ke{" "}
                    <span className="font-bold text-primary">
                      Asisten AI PCOSmart
                    </span>
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/chat", {
                      state: {
                        prefillPrompt: searchInput
                          ? `Bisa jelaskan secara tenang dan berbasis bukti medis mengenai "${searchInput}" terkait PCOS?`
                          : "Bisa bantu jelaskan panduan gaya hidup sehat untuk PCOS?",
                      },
                    })
                  }
                  className="shrink-0 h-10 px-5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:bg-primary shadow-xs transition-all whitespace-nowrap"
                >
                  Tanya Asisten AI
                </button>
              </div>
            </div>
          </section>

          {/* Recommended Reading Fallback Grid */}
          <section className="mt-6 flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-rounded text-secondary text-[26px]">
                  auto_stories
                </span>
                <h3 className="font-headline-md text-headline-md font-bold text-[#2B2433]">
                  Rekomendasi Bacaan untuk Keseimbangan Tubuh
                </h3>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="font-label-lg text-label-lg font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua ({articles.length})</span>
                <span className="material-symbols-rounded text-[20px]">
                  arrow_forward
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.slice(0, 3).map((art) => {
                const cat = getCategoryMeta(art.category);
                const isSaved = bookmarkedIds.includes(art.id);
                return (
                  <article
                    key={art.id}
                    onClick={() => openArticle(art.id)}
                    className="cursor-pointer flex flex-col bg-surface-container-lowest rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-surface-container-highest/60 transition-all duration-300 group"
                  >
                    <div className="relative w-full h-48 overflow-hidden bg-surface-container">
                      <img
                        src={art.image_url || DEFAULT_FALLBACK_IMAGE}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3.5 left-3.5">
                        <span className="px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-secondary font-label-sm text-label-sm font-bold shadow-xs">
                          {cat.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(art.id, e)}
                        aria-label="Simpan Artikel"
                        className={` absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center transition-colors shadow-xs ${
                          isSaved
                            ? "text-primary"
                            : "text-outline hover:text-primary"
                        }`}
                      >
                        <span className="material-symbols-rounded text-[20px]">
                          {isSaved ? "bookmark" : "bookmark_border"}
                        </span>
                      </button>
                    </div>
                    <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary font-semibold">
                          <span className="material-symbols-rounded text-[16px]">
                            verified
                          </span>
                          <span>Ditinjau Tim Medis</span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm font-bold text-[#2B2433] group-hover:text-primary transition-colors line-clamp-2">
                          {art.title}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                          {art.summary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/60">
                        <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline">
                          <span className="material-symbols-rounded text-[16px]">
                            schedule
                          </span>
                          <span>{art.read_minutes || 5} min baca</span>
                        </div>
                        <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Baca Selengkapnya
                          <span className="material-symbols-rounded text-[16px]">
                            chevron_right
                          </span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        /* ====================================================================
           3-COLUMN ARTICLE CATALOG GRID (Stitch Screen c73aa89ed1a247099be56f1b6cf25bbd)
           ==================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((art) => {
            const cat = getCategoryMeta(art.category);
            const isSaved = bookmarkedIds.includes(art.id);
            return (
              <article
                key={art.id}
                onClick={() => openArticle(art.id)}
                className="cursor-pointer flex flex-col bg-surface-container-lowest rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-surface-container-highest/70 transition-all duration-300 group"
              >
                <div className="relative w-full h-40 sm:h-48 overflow-hidden bg-surface-container">
                  <img
                    src={art.image_url || DEFAULT_FALLBACK_IMAGE}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3.5 left-3.5">
                    <span
                      className={`px-3 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md font-label-sm text-label-sm font-bold shadow-xs inline-flex items-center gap-1.5 ${cat.textClass}`}
                    >
                      <span className="material-symbols-rounded text-[14px]">
                        {cat.icon}
                      </span>
                      {cat.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(art.id, e)}
                    aria-label="Simpan Artikel"
                    className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center transition-colors shadow-xs ${
                      isSaved
                        ? "text-primary"
                        : "text-outline hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-rounded text-[20px]">
                      {isSaved ? "bookmark" : "bookmark_border"}
                    </span>
                  </button>
                </div>

                <div className="p-4 sm:p-6 flex flex-col flex-1 justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-secondary font-semibold">
                      <span className="material-symbols-rounded text-[16px]">
                        verified
                      </span>
                      <span>
                        {art.reviewer || "Ditinjau Tim Medis PCOSmart"}
                      </span>
                    </div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-[#2B2433] group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {art.title}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/60">
                    <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-outline font-medium">
                      <span className="material-symbols-rounded text-[16px]">
                        schedule
                      </span>
                      <span>{art.read_minutes || 5} min baca</span>
                    </div>
                    <span className="font-label-md text-label-md text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Baca Selengkapnya
                      <span className="material-symbols-rounded text-[16px]">
                        chevron_right
                      </span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer Banner Kurasi Edukasi Medis */}
      <div className="mt-4 p-6 rounded-3xl bg-surface-container-lowest border border-surface-container-highest/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-[26px]">
              verified_user
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-lg text-label-lg font-bold text-[#2B2433]">
              Standar Kurasi Edukasi PCOSmart
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed max-w-2xl">
              Seluruh artikel ditinjau mengacu pada pedoman klinis WHO, POGI,
              dan Monash University International PCOS Guideline untuk menjamin
              keakuratan ilmiah tanpa klaim diagnosis.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            navigate("/chat", {
              state: {
                prefillPrompt:
                  "Apa saja yang perlu saya persiapkan sebelum berkonsultasi ke dokter Sp.OG?",
              },
            })
          }
          className="shrink-0 h-11 px-6 rounded-full bg-surface-container text-secondary font-label-md text-label-md font-bold hover:bg-secondary-container transition-colors flex items-center gap-1.5"
        >
          <span>Diskusi dengan Asisten</span>
          <span className="material-symbols-rounded text-[18px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}
