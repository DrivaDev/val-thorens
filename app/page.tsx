"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef } from "react";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { Session } from "next-auth";

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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12">
      <div className="bg-white shadow-md rounded-2xl p-8 max-w-sm w-full mx-4">
        <h1 className="text-4xl font-bold text-gray-900 text-center">
          The Annex
        </h1>
        <p className="text-xl font-bold text-gray-500 text-center mt-2">
          Candidaturas Val Thorens
        </p>
        <div className="mt-8">
          <button
            onClick={onSignIn}
            disabled={signingIn}
            className="w-full bg-white border border-gray-300 rounded-lg py-3 px-6 flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Iniciar sesion con Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12">
      <div
        className="bg-white shadow-md rounded-2xl p-8 max-w-lg w-full mx-4 text-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="animate-spin text-french-blue w-10 h-10 mx-auto" />
        <p className="text-base text-gray-600 mt-4">Iniciando proceso...</p>
        <p className="text-sm text-gray-400 text-center mt-1">
          Esto puede tardar varios minutos.
        </p>
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
      setErrors((e) => ({
        ...e,
        cv: "Solo se aceptan archivos PDF de hasta 5 MB",
      }));
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
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
      }).catch(() => {
        // Phase 1: /api/run does not exist yet — ignore network error
        // Phase 2 will implement the route; error handling added in Phase 3
      });
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
    <div className="min-h-screen bg-slate-100 py-12">
      <div className="max-w-lg mx-auto bg-white shadow-md rounded-2xl p-8 mx-4">
        {/* Card header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900">The Annex</h2>
            <p className="text-sm text-gray-500">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-french-blue hover:underline"
          >
            Cerrar sesion
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Campo: Nombre completo */}
          <div>
            <label
              htmlFor="name"
              className="text-sm font-normal text-gray-700"
            >
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((d) => ({ ...d, name: e.target.value }))
              }
              onBlur={() => {
                const errs = validate(formData);
                setErrors((e) => ({ ...e, name: errs.name }));
              }}
              placeholder="Juan Garcia"
              className={`text-base w-full border rounded-lg px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-french-blue ${
                errors.name ? "border-french-red" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-sm text-french-red mt-1">{errors.name}</p>
            )}
          </div>

          {/* Campo: CV en PDF */}
          <div>
            <label className="text-sm font-normal text-gray-700">
              Curriculum Vitae (PDF)
            </label>
            {formData.cv ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-gray-200 mt-2">
                <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-normal text-gray-700 truncate flex-1">
                  {formData.cv.name}
                </span>
                <button
                  type="button"
                  aria-label="Eliminar CV cargado"
                  onClick={() =>
                    setFormData((d) => ({ ...d, cv: null, cvBase64: null }))
                  }
                  className="ml-auto p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-french-red transition-colors h-11 w-11 flex items-center justify-center"
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
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mt-2 ${
                  isDragOver
                    ? "border-french-blue bg-blue-50"
                    : errors.cv
                    ? "border-french-red"
                    : "border-gray-300 hover:border-french-blue"
                }`}
              >
                <p className="text-sm text-gray-500">
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
            {errors.cv && (
              <p className="text-sm text-french-red mt-1">{errors.cv}</p>
            )}
          </div>

          {/* Campo: Tipo de trabajo */}
          <div>
            <label className="text-sm font-normal text-gray-700">
              Tipo de trabajo
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                "Hotel",
                "Restaurante",
                "Bar",
                "Escuela de ski",
                "Tienda",
                "Otro",
              ].map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
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

          {/* Campo: Idiomas */}
          <div>
            <label
              htmlFor="languages"
              className="text-sm font-normal text-gray-700"
            >
              Idiomas que hablas
            </label>
            <input
              id="languages"
              type="text"
              value={formData.languages}
              onChange={(e) =>
                setFormData((d) => ({ ...d, languages: e.target.value }))
              }
              onBlur={() => {
                const errs = validate(formData);
                setErrors((e) => ({ ...e, languages: errs.languages }));
              }}
              placeholder="Ej: Español, Frances, Ingles"
              className={`text-base w-full border rounded-lg px-4 py-3 mt-2 focus:outline-none focus:ring-2 focus:ring-french-blue ${
                errors.languages ? "border-french-red" : "border-gray-300"
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">Separalos por comas</p>
            {errors.languages && (
              <p className="text-sm text-french-red mt-1">
                {errors.languages}
              </p>
            )}
          </div>

          {/* Campo: Disponibilidad */}
          <div>
            <label className="text-sm font-normal text-gray-700">
              Disponibilidad
            </label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label
                  htmlFor="availFrom"
                  className="text-xs text-gray-500"
                >
                  Desde
                </label>
                <input
                  id="availFrom"
                  type="date"
                  value={formData.availFrom}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, availFrom: e.target.value }))
                  }
                  onBlur={() => {
                    const errs = validate(formData);
                    setErrors((e) => ({ ...e, dates: errs.dates }));
                  }}
                  className={`text-base w-full border rounded-lg px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue ${
                    errors.dates ? "border-french-red" : "border-gray-300"
                  }`}
                />
              </div>
              <div>
                <label htmlFor="availTo" className="text-xs text-gray-500">
                  Hasta
                </label>
                <input
                  id="availTo"
                  type="date"
                  value={formData.availTo}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, availTo: e.target.value }))
                  }
                  onBlur={() => {
                    const errs = validate(formData);
                    setErrors((e) => ({ ...e, dates: errs.dates }));
                  }}
                  className={`text-base w-full border rounded-lg px-4 py-3 mt-1 focus:outline-none focus:ring-2 focus:ring-french-blue ${
                    errors.dates ? "border-french-red" : "border-gray-300"
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
            <p className="text-sm text-french-red mt-1">{errors.submit}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-french-blue text-white rounded-lg py-3 px-6 text-base font-bold hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-french-blue focus:ring-offset-2 mt-2 ${
              isSubmitting ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Enviando..." : "Enviar candidatura"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<"login" | "form" | "loading">("login");
  const [signingIn, setSigningIn] = useState(false);

  if (status === "loading") return null;

  // Authenticated → show form or loading
  if (status === "authenticated") {
    if (view === "loading") {
      return <LoadingView />;
    }
    return (
      <FormView
        session={session}
        onSubmitComplete={() => setView("loading")}
      />
    );
  }

  // Unauthenticated → login
  return (
    <LoginView
      signingIn={signingIn}
      onSignIn={() => {
        setSigningIn(true);
        signIn("google");
      }}
    />
  );
}
