"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  Loader2, CheckCircle2, X,
  Snowflake, Mountain, Wind, Star,
} from "lucide-react";
import { Session } from "next-auth";

// ---------------------------------------------------------------------------
// Custom SVG icons
// ---------------------------------------------------------------------------

function SnowboardIcon() {
  return (
    <svg width="18" height="30" viewBox="0 0 12 22" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="10" height="20" rx="5" />
      <rect x="3" y="8"  width="6" height="1.5" rx="0.75" fill="rgba(0,0,0,0.18)" />
      <rect x="3" y="12" width="6" height="1.5" rx="0.75" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

function SkiIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="7"  y1="3" x2="7"  y2="18" />
      <path d="M4 18 Q7 22 10 18" />
      <line x1="17" y1="3" x2="17" y2="18" />
      <path d="M14 18 Q17 22 20 18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Image carousel
// ---------------------------------------------------------------------------

const CAROUSEL_IMAGES = [
  "/carousel/1.jpg",
  "/carousel/2.jpg",
  "/carousel/3.jpg",
  "/carousel/4.jpg",
  "/carousel/5.jpg",
  "/carousel/6.jpg",
  "/carousel/7.jpg",
  "/carousel/8.jpg",
  "/carousel/9.jpg",
  "/carousel/10.jpg",
  "/carousel/11.jpg",
  "/carousel/12.jpg",
  "/carousel/13.jpg",
  "/carousel/14.jpg",
];

function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % CAROUSEL_IMAGES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-md my-5"
      style={{ aspectRatio: "16/9", minHeight: "140px" }}
    >
      {CAROUSEL_IMAGES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flying background — icons + phrases
// ---------------------------------------------------------------------------

type FlyingItem =
  | { kind: "icon";   el: React.ReactNode }
  | { kind: "phrase"; text: string; size: string };

const BASE_ITEMS: FlyingItem[] = [
  { kind: "icon",   el: <Snowflake size={32} strokeWidth={1.5} /> },
  { kind: "phrase", text: "YA ERA",                               size: "1.5rem"  },
  { kind: "icon",   el: <Mountain  size={34} strokeWidth={1.5} /> },
  { kind: "phrase", text: "¿Nos vamos a Francia o qué?",         size: "0.95rem" },
  { kind: "icon",   el: <Wind      size={28} strokeWidth={1.5} /> },
  { kind: "phrase", text: "Esto está crudo hermano",              size: "1.1rem"  },
  { kind: "icon",   el: <SkiIcon /> },
  { kind: "phrase", text: "La estoy pasando bieeen raro",        size: "0.9rem"  },
  { kind: "icon",   el: <SnowboardIcon /> },
  { kind: "phrase", text: "Hola seño buen día",                  size: "1rem"    },
  { kind: "icon",   el: <Snowflake size={22} strokeWidth={1.5} /> },
  { kind: "phrase", text: "YEAH P-E-P-UUUU",                     size: "1.6rem"  },
  { kind: "icon",   el: <Star      size={26} strokeWidth={1.5} /> },
  { kind: "phrase", text: "se me bajó el ashuuucar",             size: "1rem"    },
  { kind: "icon",   el: <Mountain  size={28} strokeWidth={1.5} /> },
  { kind: "phrase", text: "es que me gustan toodas",             size: "1.1rem"  },
  { kind: "icon",   el: <Wind      size={22} strokeWidth={1.5} /> },
  { kind: "phrase", text: "DELFI HACE EL VLOG DE CÓRDOBA",       size: "0.85rem" },
  { kind: "icon",   el: <Snowflake size={30} strokeWidth={1.5} /> },
  { kind: "phrase", text: "Mierda loco, cebola, cooñoo",       size: "0.9rem"  },
  { kind: "icon",   el: <SkiIcon /> },
  { kind: "phrase", text: "Diablo",                             size: "1.8rem"  },
  { kind: "icon",   el: <SnowboardIcon /> },
  { kind: "phrase", text: "Wa happen",                          size: "1.2rem"  },
  { kind: "icon",   el: <Star size={24} strokeWidth={1.5} /> },
  { kind: "phrase", text: "Pero no ves que son liimones",      size: "0.95rem" },
  { kind: "icon",   el: <Snowflake size={26} strokeWidth={1.5} /> },
  { kind: "phrase", text: "NOOOOOOOOOOO samal",                 size: "1.3rem"  },
];

interface ConfigItem {
  item: FlyingItem;
  id: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  rot: number;
  dur: number;
  del: number;
}

function FlyingBackground() {
  const [config, setConfig] = useState<ConfigItem[]>([]);

  useEffect(() => {
    const total = BASE_ITEMS.length;
    const cols = 4;
    const rows = Math.ceil(total / cols);
    const cellW = 100 / cols;
    const cellH = 100 / rows;

    setConfig(
      BASE_ITEMS.map((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = col * cellW + Math.random() * cellW * 0.75 + cellW * 0.1;
        const sy = row * cellH + Math.random() * cellH * 0.75 + cellH * 0.1;
        const angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const dist  = 25 + Math.random() * 30;
        const ex    = sx + Math.cos(angle) * dist;
        const ey    = sy + Math.sin(angle) * dist;
        return {
          item, id: i, sx, sy, ex, ey,
          rot: Math.random() * 200 - 100,
          dur: 22 + Math.random() * 18,
          del: (i / total) * 6,
        };
      })
    );
  }, []);

  if (config.length === 0) return null;

  const css = config
    .map(
      (c) => `
        @keyframes fly-${c.id} {
          0%   { transform: translate(${c.sx}vw, ${c.sy}vh) rotate(0deg);         opacity: 0; }
          8%   { opacity: 0.55; }
          92%  { opacity: 0.55; }
          100% { transform: translate(${c.ex}vw, ${c.ey}vh) rotate(${c.rot}deg); opacity: 0; }
        }
      `
    )
    .join("");

  return (
    <>
      <style>{css}</style>
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        {config.map((c) => (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              color: "rgba(255,255,255,0.6)",
              animation: `fly-${c.id} ${c.dur}s ${c.del}s ease-in-out infinite`,
              animationFillMode: "both",
            }}
          >
            {c.item.kind === "icon" ? (
              c.item.el
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-pacifico), cursive",
                  fontSize: c.item.size,
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {c.item.text}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Interfaces & constants
// ---------------------------------------------------------------------------

const RUBROS = [
  "Hotel",
  "Bar/Restaurante",
  "Escuela de Ski",
  "Tienda",
  "Rental",
  "Centro de Ski",
  "Spa/Bienestar",
  "Guardería/Childcare",
  "Otro",
] as const;

interface LanguageEntry {
  language: string;
  level: string;
}

interface ApplicationFormData {
  name: string;
  cv: File | null;
  cvBase64: string | null;
  jobTypes: string[];
  languages: LanguageEntry[];
  availFrom: string;
  availTo: string;
  hasEUPassport: boolean;
  cartas: Record<string, string | null>;
}

interface FormErrors {
  name?: string;
  cv?: string;
  jobTypes?: string;
  languages?: string;
  dates?: string;
  submit?: string;
}

interface TemplateStartData {
  template: string;
  subject: string;
  formData: ApplicationFormData;
}

// ---------------------------------------------------------------------------
// Date helper
// ---------------------------------------------------------------------------

function isValidDate(s: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
  const [d, m, y] = s.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// ---------------------------------------------------------------------------
// Shared card with French tricolor stripe
// ---------------------------------------------------------------------------

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative bg-white rounded-3xl shadow-2xl overflow-hidden ${className}`}>
      <div className="flex h-2">
        <div className="flex-1 bg-french-blue" />
        <div className="flex-1 bg-white border-t border-gray-200" />
        <div className="flex-1 bg-french-red" />
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function LoginView({
  signingIn,
  onSignIn,
}: {
  signingIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2d5e] to-[#0055A4] flex items-center justify-center py-12 overflow-hidden">
      <FlyingBackground />
      <Card className="relative z-10 max-w-sm w-full mx-4">
        <div className="text-center">
          <h1 className="font-display text-5xl text-french-blue leading-tight">
            The Annex
          </h1>
          <p className="text-sm font-semibold text-gray-400 mt-1 tracking-widest uppercase">
            Val Thorens
          </p>
        </div>

        <ImageCarousel />

        <p className="text-gray-500 text-sm leading-relaxed text-center">
          Enviá tu CV a todos los empleadores de la estación en minutos.
        </p>

        <div className="mt-6">
          <button
            onClick={onSignIn}
            disabled={signingIn}
            className="w-full bg-white border-2 border-gray-200 rounded-xl py-3 px-6 flex items-center justify-center gap-3 hover:border-french-blue hover:bg-blue-50 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 font-semibold text-gray-700 shadow-sm"
          >
            {signingIn ? (
              <Loader2 className="w-5 h-5 animate-spin text-french-blue" />
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>{signingIn ? "Redirigiendo..." : "Iniciar sesión con Google"}</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Solo pedimos permiso para enviar emails desde tu cuenta.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SSE types + ProgressView
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: "searching"; message: string }
  | { type: "discovery_complete"; total: number }
  | { type: "scraping"; employer: string; email: string | null }
  | { type: "generating"; employer: string }
  | { type: "sent"; employer: string; email: string }
  | { type: "logged"; employer: string }
  | { type: "send_error"; employer: string; error: string }
  | { type: "complete"; sent: number; skipped: number };

interface LogLine {
  text: string;
  color: "blue" | "green" | "red" | "gray";
}

function eventToLogLine(ev: SSEEvent): LogLine | null {
  switch (ev.type) {
    case "searching":
      return { text: ev.message, color: "blue" };
    case "discovery_complete":
      return { text: `Se encontraron ${ev.total} empleadores`, color: "blue" };
    case "scraping":
      return ev.email === null
        ? { text: `${ev.employer}: sin email, omitido`, color: "gray" }
        : { text: `${ev.employer}: email encontrado (${ev.email})`, color: "blue" };
    case "generating":
      return { text: `Generando email para ${ev.employer}...`, color: "blue" };
    case "sent":
      return { text: `Email enviado a ${ev.employer}`, color: "green" };
    case "logged":
      return { text: `${ev.employer} registrado en Google Sheets`, color: "blue" };
    case "send_error":
      return { text: `Error con ${ev.employer}: ${ev.error}`, color: "red" };
    case "complete":
      return null;
  }
}

function ProgressView({
  response,
  onReset,
}: {
  response: Response;
  onReset: () => void;
}) {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<{ sent: number; skipped: number } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!response.body) {
      setLogLines([{ text: "Error: no se pudo leer la respuesta del servidor.", color: "red" }]);
      setSummary({ sent: 0, skipped: 0 });
      return;
    }
    let cancelled = false;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    async function read() {
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const dataLines = part
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice(6));
          if (dataLines.length === 0) continue;
          let ev: SSEEvent;
          try {
            ev = JSON.parse(dataLines.join("\n"));
          } catch {
            continue;
          }
          if (ev.type === "complete") {
            setSummary({ sent: ev.sent, skipped: ev.skipped });
          } else {
            const logLine = eventToLogLine(ev);
            if (logLine) setLogLines((prev) => [...prev, logLine]);
          }
        }
      }
    }
    read().catch(() => {
      // Stream interrumpido — el evento complete normalmente cubre el cierre.
    });
    return () => {
      cancelled = true;
      reader.cancel().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines.length]);

  const wrapper = (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2d5e] to-[#0055A4] flex items-center justify-center py-12 overflow-hidden">
      <FlyingBackground />
      <div className="relative z-10 max-w-md w-full mx-4">
        <Card>
          {summary ? (
            <div className="text-center">
              <CheckCircle2 className="text-green-600 w-12 h-12 mx-auto" />
              <h2 className="font-display text-2xl text-french-blue mt-3">Proceso completado</h2>
              <div className="flex justify-center gap-8 mt-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">{summary.sent}</p>
                  <p className="text-sm text-gray-500 mt-1">emails enviados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-400">{summary.skipped}</p>
                  <p className="text-sm text-gray-500 mt-1">empleadores omitidos</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Registrado en Google Sheets
              </p>
              <button
                onClick={onReset}
                className="w-full bg-french-blue text-white rounded-xl py-3 px-6 text-base font-bold hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 mt-8 shadow-lg shadow-blue-200"
              >
                Volver al formulario
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl text-french-blue">The Annex</h2>
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-5 h-5 animate-spin text-french-blue" />
                <p className="text-lg font-semibold text-gray-800">Proceso en curso...</p>
              </div>
              <div className="mt-4 max-h-80 overflow-y-auto rounded-xl bg-gray-50 border border-gray-200 p-3 flex flex-col gap-1">
                {logLines.map((l, i) => (
                  <p
                    key={i}
                    className={`text-sm leading-snug ${
                      l.color === "green"
                        ? "text-green-600"
                        : l.color === "red"
                        ? "text-french-red"
                        : l.color === "gray"
                        ? "text-gray-400"
                        : "text-french-blue"
                    }`}
                  >
                    {l.text}
                  </p>
                ))}
                <div ref={logEndRef} />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );

  return wrapper;
}

function FormView({
  session,
  onSubmitTemplate,
}: {
  session: Session;
  onSubmitTemplate: (data: TemplateStartData) => void;
}) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: "",
    cv: null,
    cvBase64: null,
    jobTypes: [],
    languages: [{ language: "", level: "nativo" }],
    availFrom: "",
    availTo: "",
    hasEUPassport: false,
    cartas: {},
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(data: ApplicationFormData): FormErrors {
    const errs: FormErrors = {};
    if (!data.name.trim()) errs.name = "El nombre es obligatorio";
    if (!data.cv) errs.cv = "Solo se aceptan archivos PDF de hasta 5 MB";
    if (data.jobTypes.length === 0)
      errs.jobTypes = "Selecciona al menos un tipo de trabajo";
    if (data.languages.every(l => !l.language.trim()))
      errs.languages = "Indica al menos un idioma";
    if (!data.availFrom || !data.availTo) {
      errs.dates = "Indica las fechas de disponibilidad";
    } else if (!isValidDate(data.availFrom) || !isValidDate(data.availTo)) {
      errs.dates = "Formato: dd/mm/aaaa (ej: 15/12/2025)";
    } else {
      const [fd, fm, fy] = data.availFrom.split("/").map(Number);
      const [td, tm, ty] = data.availTo.split("/").map(Number);
      const from = new Date(fy, fm - 1, fd);
      const to   = new Date(ty, tm - 1, td);
      if (from >= to) errs.dates = "La fecha de inicio debe ser anterior a la de fin";
    }
    return errs;
  }

  function handleFile(file: File) {
    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, cv: "Solo se aceptan archivos PDF de hasta 5 MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      setFormData((d) => ({ ...d, cv: file, cvBase64: base64 }));
      setErrors((e) => ({ ...e, cv: undefined }));
    };
    reader.readAsDataURL(file);
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          jobTypes: formData.jobTypes,
          languages: formData.languages.filter(l => l.language.trim()),
          availFrom: formData.availFrom,
          availTo: formData.availTo,
          hasEUPassport: formData.hasEUPassport,
        }),
      });
      if (!res.ok) throw new Error("Error al generar el template");
      const { template, subject } = await res.json();
      setIsSubmitting(false);
      onSubmitTemplate({ template, subject, formData });
    } catch {
      setErrors((e) => ({
        ...e,
        submit: "Error al generar el email. Intentalo de nuevo.",
      }));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2d5e] to-[#0055A4] py-12 overflow-hidden">
      <FlyingBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4">
        <Card>
          <div className="flex items-center justify-between mb-8 -mt-2">
            <div>
              <h2 className="font-display text-2xl text-french-blue">The Annex</h2>
              <p className="text-xs text-gray-400 mt-0.5">{session.user?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-gray-400 hover:text-french-red transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-french-red"
            >
              Cerrar sesión
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Nombre */}
            <div>
              <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Nombre completo
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  setErrors((prev) => ({
                    ...prev,
                    name: trimmed ? undefined : "El nombre es obligatorio",
                  }));
                }}
                placeholder="Juan García"
                className={`text-base w-full border-2 rounded-xl px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors ${
                  errors.name ? "border-french-red" : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.name && <p className="text-sm text-french-red mt-1">{errors.name}</p>}
            </div>

            {/* Pasaporte europeo */}
            <label className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all duration-150 ${
              formData.hasEUPassport
                ? "border-french-blue bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="checkbox"
                checked={formData.hasEUPassport}
                onChange={(e) => setFormData((d) => ({ ...d, hasEUPassport: e.target.checked }))}
                className="accent-french-blue w-4 h-4 flex-shrink-0"
              />
              <div>
                <p className={`text-sm font-semibold ${formData.hasEUPassport ? "text-french-blue" : "text-gray-700"}`}>
                  Tengo pasaporte europeo 🇪🇺
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Pasaporte de algún país de la Unión Europea</p>
              </div>
            </label>

            {/* CV */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Curriculum Vitae (PDF)
              </label>
              {formData.cv ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border-2 border-green-200 mt-2">
                  <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">
                    {formData.cv.name}
                  </span>
                  <button
                    type="button"
                    aria-label="Eliminar CV cargado"
                    onClick={() => setFormData((d) => ({ ...d, cv: null, cvBase64: null }))}
                    className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-french-red transition-colors h-9 w-9 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  aria-label="Cargar archivo PDF del curriculum"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 mt-2 ${
                    isDragOver
                      ? "border-french-blue bg-blue-50 scale-[1.02]"
                      : errors.cv
                      ? "border-french-red bg-red-50"
                      : "border-gray-200 hover:border-french-blue hover:bg-blue-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-600">Arrastra tu CV o haz click</p>
                  <p className="text-xs text-gray-400 mt-1">PDF · Max 5 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {errors.cv && <p className="text-sm text-french-red mt-1">{errors.cv}</p>}
            </div>

            {/* Tipo de trabajo */}
            <div>
              <label className="text-sm font-semibold text-gray-700">Tipo de trabajo</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Hotel", "Restaurante", "Bar", "Escuela de ski", "Tienda", "Otro"].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 text-sm cursor-pointer rounded-xl border-2 px-3 py-2 transition-all duration-150 ${
                      formData.jobTypes.includes(type)
                        ? "border-french-blue bg-blue-50 text-french-blue font-semibold"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.jobTypes.includes(type)}
                      onChange={(e) => {
                        setFormData((d) => ({
                          ...d,
                          jobTypes: e.target.checked
                            ? [...d.jobTypes, type]
                            : d.jobTypes.filter((t) => t !== type),
                        }));
                      }}
                      className="accent-french-blue"
                    />
                    {type}
                  </label>
                ))}
              </div>
              {errors.jobTypes && (
                <p className="text-sm text-french-red mt-1">{errors.jobTypes}</p>
              )}
            </div>

            {/* Idiomas */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Idiomas que hablas</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((d) => ({
                      ...d,
                      languages: [...d.languages, { language: "", level: "nativo" }],
                    }))
                  }
                  className="text-xs text-french-blue font-semibold hover:underline"
                >
                  + Agregar idioma
                </button>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {formData.languages.map((entry, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={entry.language}
                      onChange={(e) => {
                        const langs = [...formData.languages];
                        langs[i] = { ...langs[i], language: e.target.value };
                        setFormData((d) => ({ ...d, languages: langs }));
                      }}
                      placeholder="Español"
                      className="flex-1 text-sm border-2 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors border-gray-200 hover:border-gray-300"
                    />
                    <select
                      value={entry.level}
                      onChange={(e) => {
                        const langs = [...formData.languages];
                        langs[i] = { ...langs[i], level: e.target.value };
                        setFormData((d) => ({ ...d, languages: langs }));
                      }}
                      className="text-sm border-2 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors border-gray-200 bg-white"
                    >
                      <option value="nativo">Nativo</option>
                      <option value="básico">Básico</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                    </select>
                    {formData.languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((d) => ({
                            ...d,
                            languages: d.languages.filter((_, j) => j !== i),
                          }))
                        }
                        className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-french-red transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.languages && (
                <p className="text-sm text-french-red mt-1">{errors.languages}</p>
              )}
            </div>

            {/* Cartas de presentación */}
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Cartas de presentación por rubro{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">
                Se adjunta la carta del rubro correspondiente al empleador. PDF · Max 5 MB.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RUBROS.map((rubro) => {
                  const carta = formData.cartas[rubro];
                  return (
                    <div
                      key={rubro}
                      className={`rounded-xl border-2 px-3 py-2 flex items-center justify-between gap-2 ${
                        carta ? "border-green-200 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{rubro}</p>
                        {carta && <p className="text-xs text-green-600">PDF cargado ✓</p>}
                      </div>
                      {carta ? (
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((d) => ({
                              ...d,
                              cartas: { ...d.cartas, [rubro]: null },
                            }))
                          }
                          className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-french-red transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "application/pdf";
                            input.onchange = (ev) => {
                              const file = (ev.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              if (
                                file.type !== "application/pdf" ||
                                file.size > 5 * 1024 * 1024
                              )
                                return;
                              const reader = new FileReader();
                              reader.onload = (re) => {
                                const b64 = re.target?.result as string;
                                setFormData((d) => ({
                                  ...d,
                                  cartas: { ...d.cartas, [rubro]: b64 },
                                }));
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          className="text-xs text-french-blue font-semibold hover:underline flex-shrink-0"
                        >
                          Subir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disponibilidad */}
            <div>
              <label className="text-sm font-semibold text-gray-700">Disponibilidad</label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="availFrom" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Desde
                  </label>
                  <input
                    id="availFrom"
                    type="text"
                    value={formData.availFrom}
                    onChange={(e) => setFormData((d) => ({ ...d, availFrom: e.target.value }))}
                    onBlur={() => {
                      const errs = validate(formData);
                      setErrors((e) => ({ ...e, dates: errs.dates }));
                    }}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    className={`text-base w-full border-2 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors ${
                      errors.dates ? "border-french-red" : "border-gray-200 hover:border-gray-300"
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor="availTo" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hasta
                  </label>
                  <input
                    id="availTo"
                    type="text"
                    value={formData.availTo}
                    onChange={(e) => setFormData((d) => ({ ...d, availTo: e.target.value }))}
                    onBlur={() => {
                      const errs = validate(formData);
                      setErrors((e) => ({ ...e, dates: errs.dates }));
                    }}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    className={`text-base w-full border-2 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors ${
                      errors.dates ? "border-french-red" : "border-gray-200 hover:border-gray-300"
                    }`}
                  />
                </div>
              </div>
              {errors.dates && (
                <p className="text-sm text-french-red mt-1">{errors.dates}</p>
              )}
            </div>

            {/* Submit */}
            {errors.submit && (
              <p className="text-sm text-french-red">{errors.submit}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-french-blue text-white rounded-xl py-4 px-6 text-base font-bold hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-french-blue focus:ring-offset-2 shadow-lg shadow-blue-200 ${
                isSubmitting ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                "Enviar candidatura 🚀"
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template preview + confirm
// ---------------------------------------------------------------------------

function TemplateView({
  template: initialTemplate,
  subject: initialSubject,
  formData,
  onConfirm,
  onBack,
}: {
  template: string;
  subject: string;
  formData: ApplicationFormData;
  onConfirm: (response: Response) => void;
  onBack: () => void;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [subject, setSubject] = useState(initialSubject);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      const cvBase64Data = formData.cvBase64?.includes(",")
        ? formData.cvBase64.split(",")[1]
        : formData.cvBase64;

      const cartasB64: Record<string, string> = {};
      for (const [rubro, b64] of Object.entries(formData.cartas)) {
        if (b64) {
          cartasB64[rubro] = b64;
        }
      }

      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          cvBase64: cvBase64Data,
          jobTypes: formData.jobTypes,
          languages: formData.languages.filter((l) => l.language.trim()),
          availFrom: formData.availFrom,
          availTo: formData.availTo,
          hasEUPassport: formData.hasEUPassport,
          template,
          subject,
          cartas: cartasB64,
        }),
      });
      if (!response.ok || !response.body) throw new Error("El servidor rechazó la solicitud");
      setIsSubmitting(false);
      onConfirm(response);
    } catch {
      setError("Error al iniciar el proceso. Intentalo de nuevo.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2d5e] to-[#0055A4] py-12 overflow-hidden">
      <FlyingBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4">
        <Card>
          <h2 className="font-display text-2xl text-french-blue mb-1">Revisá el email</h2>
          <p className="text-xs text-gray-400 mb-6">
            Editá libremente.{" "}
            <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">[EMPLEADOR]</span> y{" "}
            <span className="font-mono bg-gray-100 px-1 rounded text-gray-600">[RUBRO]</span>{" "}
            se reemplazan por cada empleador.
          </p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm w-full border-2 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors border-gray-200 hover:border-gray-300"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Cuerpo del email</label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={14}
                className="text-sm w-full border-2 rounded-xl px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors border-gray-200 hover:border-gray-300 resize-y font-mono leading-relaxed"
              />
            </div>
          </div>

          {error && <p className="text-sm text-french-red mt-3">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 border-2 border-gray-200 text-gray-600 rounded-xl py-3 px-4 text-sm font-semibold hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-[2] bg-french-blue text-white rounded-xl py-3 px-6 text-base font-bold hover:bg-blue-800 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando...
                </span>
              ) : (
                "Confirmar y enviar 🚀"
              )}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<"login" | "form" | "template" | "progress">("login");
  const [runResponse, setRunResponse] = useState<Response | null>(null);
  const [templateStart, setTemplateStart] = useState<TemplateStartData | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  if (status === "loading") return null;

  if (status === "authenticated") {
    if (view === "progress" && runResponse)
      return (
        <ProgressView
          response={runResponse}
          onReset={() => { setRunResponse(null); setView("form"); }}
        />
      );
    if (view === "template" && templateStart)
      return (
        <TemplateView
          template={templateStart.template}
          subject={templateStart.subject}
          formData={templateStart.formData}
          onConfirm={(res) => { setRunResponse(res); setView("progress"); }}
          onBack={() => setView("form")}
        />
      );
    return (
      <FormView
        session={session}
        onSubmitTemplate={(data) => { setTemplateStart(data); setView("template"); }}
      />
    );
  }

  return (
    <LoginView
      signingIn={signingIn}
      onSignIn={() => { setSigningIn(true); signIn("google"); }}
    />
  );
}
