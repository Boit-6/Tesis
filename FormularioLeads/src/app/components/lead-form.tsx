"use client";

import {useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;
const WEBHOOK_URL = `${N8N_BASE}/webhook/lead/nuevo`;

// TODO: reemplazar por el correo de contacto real antes de publicar (no hay uno definido
// todavía en ningún otro punto del frontend).
const CONTACTO_PRIVACIDAD = "privacidad@tudominio.com";

const SERVICIOS = [
  "Desarrollo Web",
  "E-commerce",
  "App Móvil",
  "Diseño UX/UI",
  "Marketing Digital",
  "SEO / Posicionamiento",
  "Automatización de Procesos",
  "Consultoría",
  "Otro",
];

const URGENCIAS = [
  {value: "baja", label: "Baja — puedo esperar"},
  {value: "media", label: "Media — en las próximas semanas"},
  {value: "alta", label: "Alta — lo antes posible"},
];

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  presupuesto: number;
  descripcion: string;
  urgencia: string;
  aceptaPrivacidad: boolean;
}

const INITIAL_FORM: FormData = {
  nombre: "",
  email: "",
  telefono: "",
  servicio: "",
  presupuesto: 1000,
  descripcion: "",
  urgencia: "",
  aceptaPrivacidad: false,
};

const PRESUPUESTO_MIN = 100;
const PRESUPUESTO_MAX = 5000;
const PRESUPUESTO_STEP = 100;

function validate(data: FormData): string | null {
  if (data.nombre.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(data.email.trim())) return "El email no tiene un formato válido.";
  if (!data.servicio) return "Debés seleccionar un servicio.";
  if (data.descripcion.trim().length < 20)
    return "La descripción debe tener al menos 20 caracteres.";
  if (!data.aceptaPrivacidad)
    return "Tenés que aceptar el tratamiento de tus datos para continuar.";

  return null;
}

const inputClass =
  "w-full bg-transparent border-b border-neutral-600 pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400 focus:placeholder-neutral-500";

const labelClass = "block font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-2";

function SectionHeader({num, title}: {num: string; title: string}) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="font-mono text-[11px] text-neutral-500">{num}</span>
      <span className="font-mono text-[11px] tracking-[0.2em] text-neutral-400 uppercase">
        {title}
      </span>
      <div className="h-px flex-1 bg-neutral-700" />
    </div>
  );
}

function SelectWrapper({children}: {children: React.ReactNode}) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute top-1 right-0 text-neutral-700">
        <svg
          fill="none"
          height={14}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          width={14}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function LeadForm() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sliderPercent =
    ((formData.presupuesto - PRESUPUESTO_MIN) / (PRESUPUESTO_MAX - PRESUPUESTO_MIN)) * 100;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const {name, value, type} = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "range"
            ? Number(value)
            : value,
    }));
  }

  async function handleSubmit() {
    setError(null);
    const validationError = validate(formData);

    if (validationError) {
      setError(validationError);

      return;
    }

    if (!N8N_BASE) {
      setError("Falta la variable NEXT_PUBLIC_N8N_BASE.");

      return;
    }

    setLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          ...formData,
          fuente: "formulario_web",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el formulario. Intentá de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  // No hace falta un onKeyDown en el <form>: con un botón type="submit" el
  // navegador ya dispara onSubmit al presionar Enter en un input de una línea,
  // y respeta el salto de línea dentro del textarea. El listener manual además
  // violaba jsx-a11y/no-noninteractive-element-interactions.

  if (success) {
    return (
      <div className="flex flex-col items-start gap-6 py-16">
        <span className="font-mono text-4xl font-black text-amber-400">✓</span>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-neutral-100">¡Gracias!</h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
            Hemos recibido tus datos correctamente. Nos contactaremos muy pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-12"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {error && (
        <div
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* 01 — Contacto */}
      <section>
        <SectionHeader num="01" title="Contacto" />
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre <span className="text-amber-600">*</span>
            </label>
            <input
              autoComplete="name"
              className={inputClass}
              id="nombre"
              name="nombre"
              placeholder="María González"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email <span className="text-amber-600">*</span>
            </label>
            <input
              autoComplete="email"
              className={inputClass}
              id="email"
              name="email"
              placeholder="tu@email.com"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="sm:col-span-2 sm:max-w-xs">
            <label className={labelClass} htmlFor="telefono">
              Teléfono
            </label>
            <input
              autoComplete="tel"
              className={inputClass}
              id="telefono"
              name="telefono"
              placeholder="+54 11 1234-5678"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
            />
          </div>
        </div>
      </section>

      {/* 02 — Proyecto */}
      <section>
        <SectionHeader num="02" title="Proyecto" />
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="servicio">
              Servicio <span className="text-amber-600">*</span>
            </label>
            <SelectWrapper>
              <select
                className={`${inputClass} cursor-pointer appearance-none pr-6`}
                id="servicio"
                name="servicio"
                value={formData.servicio}
                onChange={handleChange}
              >
                <option className="bg-[#0d0d0d]" value="">
                  Seleccioná…
                </option>
                {SERVICIOS.map((s) => (
                  <option key={s} className="bg-[#0d0d0d]" value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </div>

          <div>
            <label className={labelClass} htmlFor="urgencia">
              Urgencia
            </label>
            <SelectWrapper>
              <select
                className={`${inputClass} cursor-pointer appearance-none pr-6`}
                id="urgencia"
                name="urgencia"
                value={formData.urgencia}
                onChange={handleChange}
              >
                <option className="bg-[#0d0d0d]" value="">
                  Seleccioná…
                </option>
                {URGENCIAS.map((u) => (
                  <option key={u.value} className="bg-[#0d0d0d]" value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </div>
        </div>
      </section>

      {/* 03 — Presupuesto */}
      <section>
        <SectionHeader num="03" title="Presupuesto" />
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <label className={labelClass} htmlFor="presupuesto">
              Estimado en USD
            </label>
            <span className="font-mono text-xl font-bold text-amber-400">
              ${formData.presupuesto.toLocaleString("es-AR")}
            </span>
          </div>
          <input
            className="h-px w-full cursor-pointer appearance-none rounded-none outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-[cubic-bezier(.25,.46,.45,.94)]"
            id="presupuesto"
            max={PRESUPUESTO_MAX}
            min={PRESUPUESTO_MIN}
            name="presupuesto"
            step={PRESUPUESTO_STEP}
            style={{
              background: `linear-gradient(to right, #f59e0b ${sliderPercent}%, #404040 ${sliderPercent}%)`,
            }}
            type="range"
            value={formData.presupuesto}
            onChange={handleChange}
          />
          <div className="flex justify-between font-mono text-[11px] text-neutral-500">
            <span>${PRESUPUESTO_MIN.toLocaleString("es-AR")}</span>
            <span>${PRESUPUESTO_MAX.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </section>

      {/* 04 — Descripción */}
      <section>
        <SectionHeader num="04" title="Descripción" />
        <div>
          <label className={labelClass} htmlFor="descripcion">
            Contanos tu proyecto <span className="text-amber-600">*</span>
          </label>
          <textarea
            className="ease w-full resize-y border-b border-neutral-600 bg-transparent pt-1 pb-3 text-[15px] text-neutral-100 placeholder-neutral-600 transition duration-200 outline-none focus:border-amber-400"
            id="descripcion"
            name="descripcion"
            placeholder="Describí brevemente en qué consiste tu proyecto…"
            rows={5}
            value={formData.descripcion}
            onChange={handleChange}
          />
          <p className="mt-2 font-mono text-[11px] text-neutral-500">
            {formData.descripcion.trim().length} / 20 mín.
          </p>
        </div>
      </section>

      {/* 05 — Privacidad */}
      <section>
        <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
          Tus datos de contacto se usan exclusivamente para gestionar esta consulta y no se
          comparten con terceros salvo los proveedores necesarios para el servicio (envío de correo
          y notificaciones). Podés pedir la baja de tus datos en cualquier momento escribiendo a{" "}
          <a
            className="text-neutral-400 underline underline-offset-2"
            href={`mailto:${CONTACTO_PRIVACIDAD}`}
          >
            {CONTACTO_PRIVACIDAD}
          </a>
          .
        </p>
        <label
          className="flex cursor-pointer items-start gap-3 text-[13px] text-neutral-400"
          htmlFor="aceptaPrivacidad"
        >
          <input
            checked={formData.aceptaPrivacidad}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber-400"
            id="aceptaPrivacidad"
            name="aceptaPrivacidad"
            type="checkbox"
            onChange={handleChange}
          />
          <span>
            Acepto que mis datos sean tratados según lo descripto arriba.{" "}
            <span className="text-amber-600">*</span>
          </span>
        </label>
      </section>

      <button
        className="ease w-full bg-amber-400 py-4 font-mono text-[13px] font-bold tracking-[0.2em] text-neutral-950 uppercase transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
        type="submit"
      >
        {loading ? "Enviando..." : "Enviar consulta →"}
      </button>
    </form>
  );
}
