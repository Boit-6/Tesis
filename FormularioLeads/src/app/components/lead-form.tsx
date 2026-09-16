"use client";

import {useEffect, useRef, useState} from "react";
import {useForm} from "react-hook-form";
import Link from "next/link";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;
const WEBHOOK_URL = `${N8N_BASE}/webhook/lead-nuevo`;

const SERVICIOS = [
  "Desarrollo Web",
  "Diseño UX/UI",
  "Marketing Digital",
  "SEO / Posicionamiento",
  "Consultoría",
  "Otro",
];

const URGENCIAS = [
  {value: "baja", label: "Baja", detalle: "puedo esperar"},
  {value: "media", label: "Media", detalle: "próximas semanas"},
  {value: "alta", label: "Alta", detalle: "lo antes posible"},
];

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  presupuesto: number;
  descripcion: string;
  urgencia: string;
  consentimiento: boolean;
}

const INITIAL_FORM: FormData = {
  nombre: "",
  email: "",
  telefono: "",
  servicio: "",
  presupuesto: 1000,
  descripcion: "",
  urgencia: "",
  consentimiento: false,
};

const PRESUPUESTO_MIN = 100;
// El tope era 5000, que es exactamente donde empieza el tramo más alto del
// scoring: un proyecto de 20.000 tenía que declararse como uno de 5.000 y los
// dos quedaban indistinguibles en la base, en el tablero y en la propuesta. El
// sistema existe para priorizar y perdía la información justo en la franja que
// más le importa. Subir el tope no toca la tabla de puntajes —de 5000 para
// arriba se siguen sumando los mismos 40 puntos— pero deja de descartar el dato.
const PRESUPUESTO_MAX = 20000;
const PRESUPUESTO_STEP = 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "w-full border-b border-rule bg-transparent pt-1 pb-3 text-[15px] text-ink placeholder-mist outline-none transition duration-200 ease hover:border-mist focus:border-ochre focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre";

const labelClass = "mb-2 block text-[10px] tracking-[0.16em] text-faint uppercase";

const errorTextClass = "mt-1.5 text-[12px] text-brick";

const dotClass = "size-3.5 shrink-0 rounded-full bg-card transition duration-200";

function SectionHeader({num, title}: {num: string; title: string}) {
  return (
    <div className="mb-6 flex items-baseline gap-3">
      <span className="text-ochre font-serif text-[17px]">{num}</span>
      <span className="text-ink-soft text-[10px] tracking-[0.2em] uppercase">{title}</span>
      <div className="bg-rule-soft h-px flex-1" />
    </div>
  );
}

export default function LeadForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<FormData>({defaultValues: INITIAL_FORM, mode: "onBlur"});

  const servicio = watch("servicio");
  const urgencia = watch("urgencia");
  const presupuesto = watch("presupuesto");
  const descripcion = watch("descripcion");

  // Resultado del envío (red/servidor), separado de los errores de validación
  // por campo que ahora resuelve react-hook-form.
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // Cerrojo de envío (deuda S6 de la Tabla 11). `formState.isSubmitting` de
  // react-hook-form depende de un re-render igual que el `loading` manual de
  // antes: entre el primer clic y el repintado hay una ventana en la que un
  // segundo clic —o un Enter repetido— entra igual al submit. La referencia se
  // actualiza de forma síncrona y cierra esa ventana. Es la mitad de la
  // mitigación: la otra es la deduplicación por correo del backend, que es la
  // que vale, porque el navegador no es un lugar donde apoyar una garantía (el
  // webhook es público y `fetch` se puede repetir a mano).
  const enviando = useRef(false);

  const sliderPercent =
    ((presupuesto - PRESUPUESTO_MIN) / (PRESUPUESTO_MAX - PRESUPUESTO_MIN)) * 100;
  const descripcionLength = descripcion.trim().length;

  const onSubmit = handleSubmit(async (data) => {
    if (enviando.current) return;

    setSubmitError(null);

    if (!N8N_BASE) {
      setSubmitError("Falta la variable NEXT_PUBLIC_N8N_BASE.");

      return;
    }

    enviando.current = true;
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          ...data,
          fuente: "formulario_web",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el formulario. Intentá de nuevo.",
      );
    } finally {
      // Se libera siempre: si el envío falló hay que poder reintentar, y si
      // salió bien la pantalla ya pasó a «¡Gracias!» y el formulario no existe.
      enviando.current = false;
    }
  });

  // Foco al resultado del envío: sin esto, un lector de pantalla se queda
  // anunciando el último campo tocado en vez del desenlace del submit.
  useEffect(() => {
    if (success) successRef.current?.focus();
    else if (submitError) submitErrorRef.current?.focus();
  }, [success, submitError]);

  if (success) {
    return (
      <div className="border-rule-soft bg-card flex flex-col items-start gap-5 border px-8 py-16 shadow-[0_1px_2px_rgba(25,23,19,0.04),0_12px_32px_-18px_rgba(25,23,19,0.18)] sm:px-11">
        <svg
          fill="none"
          height={38}
          stroke="#8f5f22"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.3}
          viewBox="0 0 24 24"
          width={38}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.4l2.6 2.6L16 9.6" />
        </svg>
        <h2
          ref={successRef}
          className="text-ink font-serif text-[38px] leading-none tracking-tight outline-none"
          tabIndex={-1}
        >
          ¡Gracias!
        </h2>
        <p className="text-muted max-w-xs text-[14.5px] leading-relaxed">
          Hemos recibido tus datos correctamente. Nos contactaremos muy pronto.
        </p>
      </div>
    );
  }

  return (
    // No hace falta un onKeyDown en el <form>: con un botón type="submit" el
    // navegador ya dispara onSubmit al presionar Enter en un input de una línea,
    // y respeta el salto de línea dentro del textarea. El listener manual además
    // violaba jsx-a11y/no-noninteractive-element-interactions.
    <form
      noValidate
      className="border-rule-soft bg-card border shadow-[0_1px_2px_rgba(25,23,19,0.04),0_12px_32px_-18px_rgba(25,23,19,0.18)]"
      onSubmit={onSubmit}
    >
      {submitError && (
        <div
          ref={submitErrorRef}
          className="border-rule-soft border-l-brick bg-brick/5 text-brick border-b border-l-2 px-8 py-4 text-[13px] outline-none sm:px-10"
          role="alert"
          tabIndex={-1}
        >
          {submitError}
        </div>
      )}

      {/* I — Contacto */}
      <section className="border-rule-soft border-b px-8 py-8 sm:px-10">
        <SectionHeader num="I" title="Contacto" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="nombre">
              Nombre <span className="text-ochre">*</span>
            </label>
            <input
              required
              aria-describedby={errors.nombre ? "nombre-error" : undefined}
              aria-invalid={!!errors.nombre}
              autoComplete="name"
              className={inputClass}
              id="nombre"
              placeholder="María González"
              type="text"
              {...register("nombre", {
                validate: (v) =>
                  v.trim().length >= 2 || "El nombre debe tener al menos 2 caracteres.",
              })}
            />
            {errors.nombre && (
              <p className={errorTextClass} id="nombre-error" role="alert">
                {errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email <span className="text-ochre">*</span>
            </label>
            <input
              required
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={!!errors.email}
              autoComplete="email"
              className={inputClass}
              id="email"
              placeholder="tu@email.com"
              type="email"
              {...register("email", {
                validate: (v) =>
                  EMAIL_REGEX.test(v.trim()) || "El email no tiene un formato válido.",
              })}
            />
            {errors.email && (
              <p className={errorTextClass} id="email-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 sm:max-w-xs">
            <label className={labelClass} htmlFor="telefono">
              Teléfono
            </label>
            <input
              autoComplete="tel"
              className={inputClass}
              id="telefono"
              placeholder="+54 11 1234-5678"
              type="tel"
              {...register("telefono")}
            />
          </div>
        </div>
      </section>

      {/* II — Proyecto */}
      <section className="border-rule-soft border-b px-8 py-8 sm:px-10">
        <SectionHeader num="II" title="Proyecto" />

        <fieldset className="mb-7">
          <legend className={labelClass}>
            Servicio <span className="text-ochre">*</span>
          </legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {SERVICIOS.map((s) => {
              const activo = servicio === s;

              return (
                <label
                  key={s}
                  className={`hover:text-ochre flex cursor-pointer items-center gap-2.5 py-2.5 text-[14px] transition duration-200 ${
                    activo ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  <input
                    required
                    className="peer sr-only"
                    type="radio"
                    value={s}
                    {...register("servicio", {
                      required: "Debés seleccionar un servicio.",
                    })}
                  />
                  <span
                    className={`${dotClass} peer-focus-visible:outline-ochre peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
                      activo ? "border-ochre border-4" : "border-rule border"
                    }`}
                  />
                  <span>{s}</span>
                </label>
              );
            })}
          </div>
          {errors.servicio && (
            <p className={errorTextClass} role="alert">
              {errors.servicio.message}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Urgencia</legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {URGENCIAS.map((u) => {
              const activo = urgencia === u.value;

              return (
                <label
                  key={u.value}
                  className={`hover:text-ochre flex cursor-pointer items-center gap-2.5 py-2.5 text-[14px] transition duration-200 ${
                    activo ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  <input
                    className="peer sr-only"
                    type="radio"
                    value={u.value}
                    {...register("urgencia")}
                  />
                  <span
                    className={`${dotClass} peer-focus-visible:outline-ochre peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${
                      activo ? "border-ochre border-4" : "border-rule border"
                    }`}
                  />
                  <span>
                    {u.label} <span className="text-mist text-[12.5px]">— {u.detalle}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      {/* III — Presupuesto */}
      <section className="border-rule-soft border-b px-8 py-8 sm:px-10">
        <SectionHeader num="III" title="Presupuesto" />
        <div className="flex items-baseline justify-between">
          <label className={labelClass} htmlFor="presupuesto">
            Estimado en USD
          </label>
          <span className="text-ink font-serif text-[40px] leading-none tracking-tight">
            ${presupuesto.toLocaleString("es-AR")}
          </span>
        </div>
        <input
          className="[&::-moz-range-thumb]:bg-ochre [&::-webkit-slider-thumb]:bg-ochre mt-3 h-px w-full cursor-pointer appearance-none rounded-none border-0 outline-none [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition [&::-moz-range-thumb]:duration-200 [&::-moz-range-track]:appearance-none [&::-moz-range-track]:rounded-none [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:transition [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-[cubic-bezier(.25,.46,.45,.94)]"
          id="presupuesto"
          max={PRESUPUESTO_MAX}
          min={PRESUPUESTO_MIN}
          step={PRESUPUESTO_STEP}
          style={{
            background: `linear-gradient(to right, #8f5f22 ${sliderPercent}%, #dcd5c7 ${sliderPercent}%)`,
          }}
          type="range"
          {...register("presupuesto", {valueAsNumber: true})}
        />
        <div className="text-mist mt-4 flex justify-between text-[11px]">
          <span>${PRESUPUESTO_MIN.toLocaleString("es-AR")}</span>
          <span>${PRESUPUESTO_MAX.toLocaleString("es-AR")}</span>
        </div>
      </section>

      {/* IV — Descripción */}
      <section className="px-8 py-8 sm:px-10">
        <SectionHeader num="IV" title="Descripción" />
        <label className={labelClass} htmlFor="descripcion">
          Contanos tu proyecto <span className="text-ochre">*</span>
        </label>
        <textarea
          required
          aria-describedby={errors.descripcion ? "descripcion-error" : undefined}
          aria-invalid={!!errors.descripcion}
          className={`${inputClass} resize-y leading-relaxed`}
          id="descripcion"
          placeholder="Describí brevemente en qué consiste tu proyecto…"
          rows={4}
          {...register("descripcion", {
            validate: (v) =>
              v.trim().length >= 20 || "La descripción debe tener al menos 20 caracteres.",
          })}
        />
        <div className="mt-2 flex items-start justify-between gap-4">
          {errors.descripcion ? (
            <p className={errorTextClass} id="descripcion-error" role="alert">
              {errors.descripcion.message}
            </p>
          ) : (
            <span />
          )}
          <p
            className={`text-right font-serif text-[14px] italic ${
              descripcionLength >= 20 ? "text-moss" : "text-mist"
            }`}
          >
            {descripcionLength} / 20 mín.
          </p>
        </div>
      </section>

      {/* Consentimiento — art. 6 y arts. 11/12 de la Ley 25.326 */}
      <section className="border-rule-soft border-t px-8 py-7 sm:px-10">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed">
          <input
            required
            aria-describedby={errors.consentimiento ? "consentimiento-error" : undefined}
            aria-invalid={!!errors.consentimiento}
            className="border-rule accent-ochre mt-0.5 size-4 shrink-0 cursor-pointer"
            type="checkbox"
            {...register("consentimiento", {
              required: "Debés aceptar la Política de Privacidad para poder enviar el formulario.",
            })}
          />
          <span className="text-ink-soft">
            He leído y acepto el tratamiento de mis datos personales, incluida su transferencia
            internacional a los prestadores mencionados, conforme a la{" "}
            <Link
              className="text-ochre hover:text-ochre-deep underline underline-offset-2"
              href="/privacidad"
              target="_blank"
            >
              Política de Privacidad
            </Link>
            . <span className="text-ochre">*</span>
          </span>
        </label>
        {errors.consentimiento && (
          <p className={errorTextClass} id="consentimiento-error" role="alert">
            {errors.consentimiento.message}
          </p>
        )}
      </section>

      <div className="px-8 pb-9 sm:px-10">
        <button
          className="ease bg-ink text-paper hover:bg-ochre w-full py-5 text-[11px] font-medium tracking-[0.2em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Enviando..." : "Enviar consulta"}
        </button>
      </div>
    </form>
  );
}
