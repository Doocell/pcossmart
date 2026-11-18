import { useCallback, useEffect, useRef, useState } from "react";
import {
  polishJournalWithGemini,
  transcribeAudioWithGemini,
} from "../lib/supabase";

function formatDuration(seconds = 0) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceJournalRecorder({
  value = "",
  onChange,
  maxLength = 500,
  onVoiceMetaChange,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [insertMode, setInsertMode] = useState("append"); // 'append' | 'replace'
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [waveBars, setWaveBars] = useState([
    18, 28, 42, 30, 55, 40, 24, 60, 35, 48, 25, 38, 22, 30,
  ]);

  // Refs for fresh closure access and leak-free lifecycle cleanup
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const latestValueRef = useRef(value);
  const insertModeRef = useRef(insertMode);
  const onChangeRef = useRef(onChange);
  const onVoiceMetaChangeRef = useRef(onVoiceMetaChange);
  const baseNotesSnapshotRef = useRef("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const accumulatedSpeechRef = useRef("");
  const liveTranscriptRef = useRef("");
  const timerRef = useRef(null);
  const simTimeoutRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioUrlRef = useRef(null);
  const durationRef = useRef(0);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    insertModeRef.current = insertMode;
  }, [insertMode]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onVoiceMetaChangeRef.current = onVoiceMetaChange;
  }, [onVoiceMetaChange]);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore close errors
      }
      audioContextRef.current = null;
    }
  }, []);

  const stopAllStreams = useCallback(
    ({ abortOnStop = false } = {}) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopVisualizer();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        if (abortOnStop) {
          mediaRecorderRef.current.onstop = null;
        }
        if (mediaRecorderRef.current.state !== "inactive") {
          try {
            mediaRecorderRef.current.stop();
          } catch {
            // ignore
          }
        }
        if (abortOnStop) {
          mediaRecorderRef.current = null;
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    },
    [stopVisualizer]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (simTimeoutRef.current) {
        clearTimeout(simTimeoutRef.current);
        simTimeoutRef.current = null;
      }
      stopAllStreams({ abortOnStop: true });
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [stopAllStreams]);

  const composeWithSnapshot = useCallback(
    (transcriptText) => {
      const clean = (transcriptText || "").trim();
      if (!clean) return;
      const base = (baseNotesSnapshotRef.current || "").trim();
      const combined =
        insertModeRef.current === "append" && base ? `${base} ${clean}` : clean;
      onChangeRef.current?.(combined.slice(0, maxLength));
    },
    [maxLength]
  );

  const startVisualizer = useCallback(
    (stream) => {
      stopVisualizer();
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateBars = () => {
          if (!isMountedRef.current || !audioContextRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const bars = Array.from({ length: 14 }, (_, idx) => {
            const val = dataArray[idx % dataArray.length] || 0;
            return Math.max(14, Math.min(100, Math.round((val / 255) * 100)));
          });
          setWaveBars(bars);
          animFrameRef.current = requestAnimationFrame(updateBars);
        };
        animFrameRef.current = requestAnimationFrame(updateBars);
      } catch {
        // ignore visualizer setup error
      }
    },
    [stopVisualizer]
  );

  const startSpeechRecognition = useCallback(() => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.lang = "id-ID";
      recognition.continuous = true;
      recognition.interimResults = true;

      let sessionFinal = "";

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += transcriptPiece + " ";
          } else {
            interim += transcriptPiece;
          }
        }
        const merged = [accumulatedSpeechRef.current, sessionFinal, interim]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        liveTranscriptRef.current = merged;
        setLiveTranscript(merged);
      };

      recognition.onerror = () => {
        // Fallback to Gemini multimodal audio transcription on stop
      };

      recognition.onend = () => {
        if (sessionFinal.trim()) {
          accumulatedSpeechRef.current = [
            accumulatedSpeechRef.current,
            sessionFinal.trim(),
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // ignore if SpeechRecognition fails to start
    }
  }, []);

  const handleStartRecording = async () => {
    if (isStartingRef.current || isRecording || transcribing) return;
    isStartingRef.current = true;

    setErrorMsg("");
    setStatusMsg("");
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    accumulatedSpeechRef.current = "";
    durationRef.current = 0;
    setDurationSec(0);
    setIsPaused(false);
    baseNotesSnapshotRef.current = latestValueRef.current || "";

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      isStartingRef.current = false;
      setErrorMsg(
        "Peramban ini tidak mendukung perekaman mikrofon. Gunakan tombol simulasi atau ketik manual."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        isStartingRef.current = false;
        return;
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const supportsCheck = typeof MediaRecorder.isTypeSupported === "function";
      const mimeType =
        supportsCheck && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : supportsCheck && MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }
        if (!isMountedRef.current) return;

        const finalMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        const recordedSecs = Math.max(1, durationRef.current);

        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }
        const nextUrl = URL.createObjectURL(blob);
        audioUrlRef.current = nextUrl;
        setAudioUrl(nextUrl);
        setAudioDuration(recordedSecs);

        const immediateText = liveTranscriptRef.current.trim();
        if (immediateText) {
          composeWithSnapshot(immediateText);
        }

        setTranscribing(true);
        setStatusMsg(
          "Mentranskripsi & merapikan voice note dengan AI Gemini..."
        );

        try {
          const base64Audio = await blobToBase64(blob);
          if (!isMountedRef.current) return;

          const aiTranscript = await transcribeAudioWithGemini(
            base64Audio,
            finalMime,
            immediateText
          );
          if (!isMountedRef.current) return;

          if (aiTranscript && aiTranscript.trim()) {
            composeWithSnapshot(aiTranscript);
            setStatusMsg(
              "Voice note berhasil ditranskripsi menjadi teks jurnal laporan!"
            );
            onVoiceMetaChangeRef.current?.({
              hasVoiceNote: true,
              durationSec: recordedSecs,
              transcribedAt: new Date().toISOString(),
            });
          } else if (immediateText) {
            setStatusMsg(
              "Transkripsi suara langsung berhasil dimasukkan ke catatan."
            );
          } else {
            setStatusMsg("");
            setErrorMsg(
              "Tidak ada ucapan yang terdeteksi. Coba rekam ulang lebih dekat ke mikrofon."
            );
          }
        } catch (err) {
          if (!isMountedRef.current) return;
          if (immediateText) {
            setStatusMsg(
              "Transkripsi suara langsung berhasil dimasukkan ke catatan."
            );
            onVoiceMetaChangeRef.current?.({
              hasVoiceNote: true,
              durationSec: recordedSecs,
              transcribedAt: new Date().toISOString(),
            });
          } else {
            setStatusMsg("");
            setErrorMsg(
              err?.message ||
                "Gagal mentranskripsi suara. Pastikan suara terdengar jelas di mikrofon."
            );
          }
        } finally {
          if (isMountedRef.current) {
            setTranscribing(false);
          }
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      startVisualizer(stream);
      startSpeechRecognition();

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (isMountedRef.current) {
          setDurationSec(durationRef.current);
        }
      }, 1000);
    } catch {
      stopAllStreams({ abortOnStop: true });
      if (isMountedRef.current) {
        setErrorMsg(
          "Izin mikrofon ditolak atau mikrofon tidak ditemukan. Kamu juga bisa menguji fitur ini dengan tombol 'Simulasi Voice Note'."
        );
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleTogglePause = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;

    if (rec.state === "recording") {
      rec.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopVisualizer();
      if (recognitionRef.current) {
        try {
          accumulatedSpeechRef.current = liveTranscriptRef.current;
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } else if (rec.state === "paused") {
      rec.resume();
      setIsPaused(false);
      if (mediaStreamRef.current) {
        startVisualizer(mediaStreamRef.current);
      }
      startSpeechRecognition();
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        if (isMountedRef.current) {
          setDurationSec(durationRef.current);
        }
      }, 1000);
    }
  };

  const handleStopAndTranscribe = () => {
    setIsRecording(false);
    setIsPaused(false);
    stopAllStreams({ abortOnStop: false });
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setLiveTranscript("");
    liveTranscriptRef.current = "";
    accumulatedSpeechRef.current = "";
    stopAllStreams({ abortOnStop: true });
  };

  const handlePolishExistingNotes = async () => {
    const currentText = latestValueRef.current || "";
    if (!currentText.trim() || polishing || transcribing || isRecording) return;

    setPolishing(true);
    setErrorMsg("");
    setStatusMsg("Merapikan bahasa catatan jurnal untuk laporan...");
    try {
      const result = await polishJournalWithGemini(currentText);
      if (!isMountedRef.current) return;
      if (result?.text) {
        onChangeRef.current?.(result.text.slice(0, maxLength));
        setStatusMsg(
          result.polishedByAi
            ? "Catatan jurnal berhasil dirapikan dengan AI!"
            : "Catatan siap digunakan pada laporan (AI belum merespons saat ini)."
        );
      }
    } catch {
      if (isMountedRef.current) {
        setStatusMsg("");
        setErrorMsg("Gagal merapikan teks saat ini.");
      }
    } finally {
      if (isMountedRef.current) {
        setPolishing(false);
      }
    }
  };

  const handleSimulateVoiceNote = () => {
    if (transcribing || isRecording) return;
    baseNotesSnapshotRef.current = latestValueRef.current || "";
    setErrorMsg("");
    setTranscribing(true);
    setStatusMsg("Mensimulasikan rekaman voice note & transkripsi AI...");

    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
    }
    simTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      const sampleTranscript =
        "Hari ini tubuh terasa sedikit cepat lelah di sore hari dan perut agak kembung setelah makan siang, tapi membaik sesudah jalan santai 15 menit dan minum air hangat.";
      composeWithSnapshot(sampleTranscript);
      setAudioDuration(11);
      setTranscribing(false);
      setStatusMsg(
        "Simulasi voice note (00:11) berhasil ditranskripsi ke dalam catatan laporan!"
      );
      onVoiceMetaChangeRef.current?.({
        hasVoiceNote: true,
        durationSec: 11,
        transcribedAt: new Date().toISOString(),
      });
    }, 800);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Voice Journaling Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-surface-container-lowest border border-primary-fixed/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              isRecording
                ? "bg-error text-on-error animate-pulse"
                : "bg-primary-fixed text-primary"
            }`}
          >
            <span className="material-symbols-rounded text-[20px]">
              {isRecording ? "graphic_eq" : "mic"}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md font-bold text-on-surface">
                Voice Note Journaling
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/60 text-on-secondary-container text-[10px] font-bold">
                Speech-to-Text AI
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant">
              Ceritakan keluhan atau perasaanmu lewat suara untuk ditranskrip
              otomatis ke laporan
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isRecording && (
          <div className="flex flex-wrap items-center gap-2">
            {value && value.trim().length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setInsertMode((m) => (m === "append" ? "replace" : "append"))
                }
                title="Mode penyisipan hasil transkrip"
                className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-[11px] font-semibold transition-colors"
              >
                Mode: {insertMode === "append" ? "+ Tambah Teks" : "Ganti Teks"}
              </button>
            )}

            {value && value.trim().length >= 10 && (
              <button
                type="button"
                onClick={handlePolishExistingNotes}
                disabled={polishing || transcribing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-bold transition-all disabled:opacity-50"
              >
                <span
                  className={`material-symbols-rounded text-[16px] ${
                    polishing ? "animate-spin" : ""
                  }`}
                >
                  {polishing ? "progress_activity" : "auto_fix_high"}
                </span>
                <span>{polishing ? "Merapikan..." : "Rapikan Teks (AI)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartRecording}
              disabled={transcribing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold shadow-xs transition-all active:scale-95 disabled:opacity-60"
            >
              <span className="material-symbols-rounded text-[18px]">mic</span>
              <span>
                {transcribing ? "Mentranskripsi..." : "Mulai Rekam Suara"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Active Recording Studio Box */}
      {isRecording && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-fixed/50 via-surface-container-lowest to-secondary-container/30 border-2 border-primary/40 shadow-md flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-error animate-ping" />
              <span className="font-label-md text-label-md font-extrabold text-on-surface">
                {isPaused ? "Rekaman Dijeda" : "Sedang Mendengarkan Suaramu..."}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-on-surface text-surface font-mono text-xs font-bold">
                {formatDuration(durationSec)}
              </span>
            </div>

            {/* Live Soundwave Bars */}
            <div className="flex items-center gap-1 h-8 px-2">
              {waveBars.map((h, i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isPaused ? "bg-outline-variant" : "bg-primary"
                  }`}
                  style={{ height: `${isPaused ? 20 : h}%` }}
                />
              ))}
            </div>

            {/* Recording Controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleTogglePause}
                className="px-3 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-bold border border-outline-variant/40 flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-[16px]">
                  {isPaused ? "play_arrow" : "pause"}
                </span>
                <span>{isPaused ? "Lanjut" : "Jeda"}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelRecording}
                className="px-3 py-1.5 rounded-full bg-surface-container-lowest hover:bg-error-container/40 text-error font-label-sm text-label-sm font-bold border border-error/20"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleStopAndTranscribe}
                className="px-4 py-1.5 rounded-full bg-secondary hover:opacity-95 text-on-secondary font-label-sm text-label-sm font-bold shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-rounded text-[16px]">
                  check_circle
                </span>
                <span>Selesai & Transkrip</span>
              </button>
            </div>
          </div>

          {/* Real-time Interim Speech Preview */}
          <div className="p-3 rounded-xl bg-surface-container-lowest/90 border border-surface-container-highest text-xs text-on-surface-variant flex items-start gap-2">
            <span className="material-symbols-rounded text-primary text-[16px] shrink-0 mt-0.5">
              subtitles
            </span>
            <p className="leading-relaxed italic">
              {liveTranscript
                ? `“${liveTranscript}”`
                : "Silakan berbicara dalam Bahasa Indonesia (contoh: 'Hari ini saya merasa sedikit lelah dan kram perut ringan...')"}
            </p>
          </div>
        </div>
      )}

      {/* Recorded Audio Playback & Status Bar */}
      {(audioUrl || statusMsg || errorMsg) && !isRecording && (
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`material-symbols-rounded text-[18px] shrink-0 ${
                errorMsg
                  ? "text-error"
                  : transcribing
                  ? "text-primary animate-spin"
                  : "text-secondary"
              }`}
            >
              {errorMsg
                ? "error"
                : transcribing
                ? "progress_activity"
                : "check_circle"}
            </span>
            <span
              className={`text-xs font-medium leading-snug ${
                errorMsg ? "text-error" : "text-on-surface-variant"
              }`}
            >
              {errorMsg ||
                statusMsg ||
                `Rekaman suara (${formatDuration(
                  audioDuration
                )}) telah ditranskripsi.`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {audioUrl && (
              <audio
                controls
                src={audioUrl}
                className="h-9 w-full sm:w-auto sm:max-w-[220px]"
              />
            )}
            {errorMsg && (
              <button
                type="button"
                onClick={handleSimulateVoiceNote}
                className="px-3 py-1.5 rounded-full bg-primary-fixed text-primary text-xs font-bold hover:bg-primary-container hover:text-on-primary transition-all"
              >
                Simulasi Voice Note
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
