"use client";

import {type KeyboardEvent, useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;
const WEBHOOK_URL = `${N8N_BASE}/webhook/lead/nuevo`;

const SERVICIOS = [
  "Desarrollo Web",
  "Diseño UX/UI",
  "Marketing Digital",
  "SEO / Posicionamiento",
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
}

const INITIAL_FORM: FormData = {
  nombre: "",
  email: "",
  telefono: "",
  servicio: "",
  presupuesto: 1000,
  descripcion: "",
  urgencia: "",
};

const PRESUPUESTO_MIN = 100;
const PRESUPUESTO_MAX = 5000;
const PRESUPUESTO_STEP = 100;

function validate(data: FormData): string | null {
  if (data.nombre.trim().length < 2)
    return "El nombre debe tener al menos 2 caracteres.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim()))
    return "El email no tiene un formato válido.";
  if (!data.servicio) return "Debés seleccionar un servicio.";
  if (data.descripcion.trim().length < 20)
    return "La descripción debe tener al menos 20 caracteres.";
  return null;
}

const inputClass =
  "w-full bg-transparent border-b border-neutral-600 pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400 focus:placeholder-neutral-500";

const labelClass =
  "block font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-2";

function SectionHeader({num, title}: {num: string; title: string}) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <span className="font-mono text-[11px] text-neutral-500">{num}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
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
      <div className="pointer-events-none absolute right-0 top-1 text-neutral-700">
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
    ((formData.presupuesto - PRESUPUESTO_MIN) /
      (PRESUPUESTO_MAX - PRESUPUESTO_MIN)) *
    100;

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const {name, value, type} = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "range" ? Number(value) : value,
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

      if (!response.ok)
        throw new Error(`Error del servidor: ${response.status}`);

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

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    handleSubmit();
  }

  if (success) {
    return (
      <div className="flex flex-col items-start gap-6 py-16">
        <span className="font-mono text-4xl font-black text-amber-400">✓</span>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-neutral-100">
            ¡Gracias!
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
            Hemos recibido tus datos correctamente. Nos contactaremos muy
            pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onKeyDown={handleKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-12"
    >
      {error && (
        <div
          role="alert"
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
        >
          {error}
        </div>
      )}

      {/* 01 — Contacto */}
      <section>
        <SectionHeader num="01" title="Contacto" />
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="nombre" className={labelClass}>
              Nombre <span className="text-amber-600">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autoComplete="name"
              placeholder="María González"
              value={formData.nombre}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-amber-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2 sm:max-w-xs">
            <label htmlFor="telefono" className={labelClass}>
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              placeholder="+54 11 1234-5678"
              value={formData.telefono}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* 02 — Proyecto */}
      <section>
        <SectionHeader num="02" title="Proyecto" />
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="servicio" className={labelClass}>
              Servicio <span className="text-amber-600">*</span>
            </label>
            <SelectWrapper>
              <select
                id="servicio"
                name="servicio"
                value={formData.servicio}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer appearance-none pr-6`}
              >
                <option value="" className="bg-[#0d0d0d]">
                  Seleccioná…
                </option>
                {SERVICIOS.map((s) => (
                  <option key={s} value={s} className="bg-[#0d0d0d]">
                    {s}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </div>

          <div>
            <label htmlFor="urgencia" className={labelClass}>
              Urgencia
            </label>
            <SelectWrapper>
              <select
                id="urgencia"
                name="urgencia"
                value={formData.urgencia}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer appearance-none pr-6`}
              >
                <option value="" className="bg-[#0d0d0d]">
                  Seleccioná…
                </option>
                {URGENCIAS.map((u) => (
                  <option key={u.value} value={u.value} className="bg-[#0d0d0d]">
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
            <label htmlFor="presupuesto" className={labelClass}>
              Estimado en USD
            </label>
            <span className="font-mono text-xl font-bold text-amber-400">
              ${formData.presupuesto.toLocaleString("es-AR")}
            </span>
          </div>
          <input
            id="presupuesto"
            name="presupuesto"
            type="range"
            min={PRESUPUESTO_MIN}
            max={PRESUPUESTO_MAX}
            step={PRESUPUESTO_STEP}
            value={formData.presupuesto}
            onChange={handleChange}
            style={{
              background: `linear-gradient(to right, #f59e0b ${sliderPercent}%, #404040 ${sliderPercent}%)`,
            }}
            className="h-px w-full cursor-pointer appearance-none rounded-none outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-[cubic-bezier(.25,.46,.45,.94)]"
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
          <label htmlFor="descripcion" className={labelClass}>
            Contanos tu proyecto <span className="text-amber-600">*</span>
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={5}
            placeholder="Describí brevemente en qué consiste tu proyecto…"
            value={formData.descripcion}
            onChange={handleChange}
            className="w-full resize-y bg-transparent border-b border-neutral-600 pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400"
          />
          <p className="mt-2 font-mono text-[11px] text-neutral-500">
            {formData.descripcion.trim().length} / 20 mín.
          </p>
        </div>
      </section>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-400 py-4 font-mono text-[13px] uppercase tracking-[0.2em] font-bold text-neutral-950 transition duration-200 ease hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Enviando..." : "Enviar consulta →"}
      </button>
    </form>
  );
}
