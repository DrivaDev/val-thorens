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
// Flying background — icons + phrases
// ---------------------------------------------------------------------------

type FlyingItem =
  | { kind: "icon";   el: React.ReactNode }
  | { kind: "phrase"; text: string; size: string };

const BASE_ITEMS: FlyingItem[] = [
  { kind: "icon",   el: <Snowflake size={32} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Mountain  size={34} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Wind      size={28} strokeWidth={1.5} /> },
  { kind: "icon",   el: <SkiIcon /> },
  { kind: "icon",   el: <SnowboardIcon /> },
  { kind: "icon",   el: <Snowflake size={22} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Star      size={26} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Mountain  size={28} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Wind      size={22} strokeWidth={1.5} /> },
  { kind: "icon",   el: <Snowflake size={30} strokeWidth={1.5} /> },
  { kind: "icon",   el: <SkiIcon /> },
  { kind: "icon",   el: <SnowboardIcon /> },
  { kind: "phrase", text: "YA ERA",                          size: "1.5rem" },
  { kind: "phrase", text: "¿Nos vamos a Francia o qué?",    size: "0.95rem" },
  { kind: "phrase", text: "Esto está crudo hermano",         size: "1.1rem"  },
  { kind: "phrase", text: "La estoy pasando bieeen raro",   size: "0.9rem"  },
  { kind: "phrase", text: "Hola seño buen día",             size: "1rem"    },
  { kind: "phrase", text: "YEAH P-E-P-UUUU",                size: "1.6rem"  },
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
        // Grid-based start positions so elements cover the whole screen evenly
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = col * cellW + Math.random() * cellW * 0.75 + cellW * 0.1;
        const sy = row * cellH + Math.random() * cellH * 0.75 + cellH * 0.1;

        // Travel direction: spread angles evenly across 360° + small random offset
        const angle = (i / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const dist  = 25 + Math.random() * 30; // travel 25–55% of screen
        const ex    = sx + Math.cos(angle) * dist;
        const ey    = sy + Math.sin(angle) * dist;

        return {
          item,
          id:  i,
          sx,  sy,
          ex,  ey,
          rot: Math.random() * 200 - 100,
          dur: 22 + Math.random() * 18,            // 22–40s — slow
          del: (i / total) * 18,                   // staggered, not random
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
          15%  { opacity: 0.55; }
          85%  { opacity: 0.55; }
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
              animationFillMode: "both",   // ← prevents flash at (0,0) during delay
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
// Interfaces
// ---------------------------------------------------------------------------

interface FormData {
  name: string;
  cv: File | null;
  cvBase64: string | null;
  jobTypes: string[];
  languages: string;
  availFrom: string;
  availTo: string;
}

interface FormErrors {
  name?: string;
  cv?: string;
  jobTypes?: string;
  languages?: string;
  dates?: string;
  submit?: string;
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
          <p className="text-gray-500 text-sm mt-4 leading-relaxed">
            Enviá tu CV a todos los empleadores de la estación en minutos.
          </p>
        </div>

        <div className="mt-8">
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

        <p className="text-center text-xs text-gray-400 mt-5">
          Solo pedimos permiso para enviar emails desde tu cuenta.
        </p>
      </Card>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1929] via-[#0d2d5e] to-[#0055A4] flex items-center justify-center py-12 overflow-hidden">
      <FlyingBackground />
      <div role="status" aria-live="polite" className="relative z-10 max-w-md w-full mx-4">
        <Card className="text-center">
          <p className="font-display text-3xl text-french-blue mb-4">The Annex</p>
          <Loader2 className="animate-spin text-french-blue w-12 h-12 mx-auto" />
          <p className="text-lg font-semibold text-gray-800 mt-4">Iniciando proceso...</p>
          <p className="text-sm text-gray-400 mt-2">
            Esto puede tardar varios minutos. ☕
          </p>
          <div className="flex justify-center gap-1 mt-6">
            <div className="w-2 h-2 rounded-full bg-french-blue animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-french-red animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function FormView({
  session,
  onSubmitComplete,
}: {
  session: Session;
  onSubmitComplete: () => void;
}) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    cv: null,
    cvBase64: null,
    jobTypes: [],
    languages: "",
    availFrom: "",
    availTo: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(data: FormData): FormErrors {
    const errs: FormErrors = {};
    if (!data.name.trim()) errs.name = "El nombre es obligatorio";
    if (!data.cv) errs.cv = "Solo se aceptan archivos PDF de hasta 5 MB";
    if (data.jobTypes.length === 0)
      errs.jobTypes = "Selecciona al menos un tipo de trabajo";
    if (!data.languages.trim()) errs.languages = "Indica al menos un idioma";
    if (!data.availFrom || !data.availTo)
      errs.dates = "Indica las fechas de disponibilidad";
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
      fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          cvBase64: formData.cvBase64,
          jobTypes: formData.jobTypes,
          languages: formData.languages,
          availFrom: formData.availFrom,
          availTo: formData.availTo,
          accessToken: session.access_token,
        }),
      }).catch(() => {});
      onSubmitComplete();
    } catch {
      setErrors((e) => ({
        ...e,
        submit: "Error al iniciar el proceso. Intentalo de nuevo.",
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
                onBlur={() => {
                  const errs = validate(formData);
                  setErrors((e) => ({ ...e, name: errs.name }));
                }}
                placeholder="Juan García"
                className={`text-base w-full border-2 rounded-xl px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors ${
                  errors.name ? "border-french-red" : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.name && <p className="text-sm text-french-red mt-1">{errors.name}</p>}
            </div>

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
                  <p className="text-sm font-medium text-gray-600">
                    Arrastra tu CV o haz click
                  </p>
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
              <label htmlFor="languages" className="text-sm font-semibold text-gray-700">
                Idiomas que hablas
              </label>
              <input
                id="languages"
                type="text"
                value={formData.languages}
                onChange={(e) => setFormData((d) => ({ ...d, languages: e.target.value }))}
                onBlur={() => {
                  const errs = validate(formData);
                  setErrors((e) => ({ ...e, languages: errs.languages }));
                }}
                placeholder="Español, Francés, Inglés"
                className={`text-base w-full border-2 rounded-xl px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-french-blue focus:border-transparent transition-colors ${
                  errors.languages ? "border-french-red" : "border-gray-200 hover:border-gray-300"
                }`}
              />
              <p className="text-xs text-gray-400 mt-1">Separalos por comas</p>
              {errors.languages && (
                <p className="text-sm text-french-red mt-1">{errors.languages}</p>
              )}
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
                    type="date"
                    value={formData.availFrom}
                    onChange={(e) => setFormData((d) => ({ ...d, availFrom: e.target.value }))}
                    onBlur={() => {
                      const errs = validate(formData);
                      setErrors((e) => ({ ...e, dates: errs.dates }));
                    }}
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
                    type="date"
                    value={formData.availTo}
                    onChange={(e) => setFormData((d) => ({ ...d, availTo: e.target.value }))}
                    onBlur={() => {
                      const errs = validate(formData);
                      setErrors((e) => ({ ...e, dates: errs.dates }));
                    }}
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
// Main
// ---------------------------------------------------------------------------

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<"login" | "form" | "loading">("login");
  const [signingIn, setSigningIn] = useState(false);

  if (status === "loading") return null;

  if (status === "authenticated") {
    if (view === "loading") return <LoadingView />;
    return <FormView session={session} onSubmitComplete={() => setView("loading")} />;
  }

  return (
    <LoginView
      signingIn={signingIn}
      onSignIn={() => { setSigningIn(true); signIn("google"); }}
    />
  );
}
