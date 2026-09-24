"use client";

import type {ServicioTipo} from "@/types/supabase";

import {useEffect, useState} from "react";

import {Cargando, Esqueleto} from "@/app/components/esqueleto";
import {presupuestoDeclarado} from "@/lib/presupuesto";
import {SERVICIO_LEGIBLE} from "@/lib/servicios";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;
const HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  ...(process.env.NODE_ENV === "development" ? {"ngrok-skip-browser-warning": "true"} : {}),
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Postulacion {
  id: string;
  espacio: string;
  mensaje: string;
  precio: number;
  plazo: string;
}

interface Pedido {
  status: "ok";
  estado: "ABIERTO" | "EN_ELECCION" | "ASIGNADO" | "VENCIDO";
  servicio: ServicioTipo;
  presupuesto_rango: string | null;
  presupuesto: number;
  resumen: string;
  cliente_nombre: string;
  elegido_nombre: string | null;
  postulaciones: Postulacion[];
}

type Vista =
  | {tipo: "cargando"}
  | {tipo: "invalido"}
  | {tipo: "pedido"; pedido: Pedido}
  | {tipo: "elegido"; espacio: string};

const tarjetaClass =
  "border-rule-soft bg-card border shadow-[0_1px_2px_rgba(25,23,19,0.04),0_12px_32px_-18px_rgba(25,23,19,0.18)]";

const formatoUsd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function Aviso({titulo, children}: {titulo: string; children: React.ReactNode}) {
  return (
    <div className={`${tarjetaClass} flex flex-col gap-4 px-8 py-12 sm:px-11`}>
      <h2 className="text-ink font-serif text-[30px] leading-tight tracking-tight">{titulo}</h2>
      <p className="text-muted max-w-md text-[14.5px] leading-relaxed">{children}</p>
    </div>
  );
}

function EsqueletoEleccion() {
  return (
    <Cargando className="flex flex-col gap-6" etiqueta="Cargando las postulaciones…">
      <div className={`${tarjetaClass} flex flex-col gap-3 px-6 py-5`}>
        <Esqueleto className="h-2.5 w-24" />
        <Esqueleto className="h-5 w-48" />
        <Esqueleto className="h-4 w-full" />
      </div>
      {Array.from({length: 2}, (_, i) => (
        <div key={i} className={`${tarjetaClass} flex flex-col gap-3 px-6 py-5`}>
          <div className="flex justify-between gap-4">
            <Esqueleto className="h-6 w-40" />
            <Esqueleto className="h-6 w-24" />
          </div>
          <Esqueleto className="h-3 w-28" />
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-4/5" />
          <Esqueleto className="mt-2 h-11 w-44" />
        </div>
      ))}
    </Cargando>
  );
}

function TarjetaPostulacion({
  postulacion,
  onElegir,
}: {
  postulacion: Postulacion;
  onElegir: () => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className={`${tarjetaClass} flex flex-col gap-3 px-6 py-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-ink font-serif text-[23px] leading-tight">{postulacion.espacio}</h3>
        <span className="text-ink font-serif text-[23px]">
          {formatoUsd.format(postulacion.precio)}
        </span>
      </div>
      <p className="text-ochre text-[10.5px] tracking-[0.14em] uppercase">
        Plazo estimado: {postulacion.plazo}
      </p>
      <p className="text-ink-soft text-[14.5px] leading-relaxed whitespace-pre-line">
        {postulacion.mensaje}
      </p>

      {error && (
        <p className="text-brick text-[13px]" role="alert">
          {error}
        </p>
      )}

      {confirmando ? (
        <div className="border-rule-soft mt-1 flex flex-col gap-3 border-t pt-4">
          <p className="text-ink-soft text-[14px] leading-relaxed">
            ¿Elegir a <b>{postulacion.espacio}</b>? Le pasamos tus datos de contacto para que te
            mande la propuesta formal. Los demás no reciben nada.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className="ease bg-ink text-paper hover:bg-ochre px-6 py-3.5 text-[11px] tracking-[0.16em] uppercase transition duration-200 disabled:opacity-40"
              disabled={enviando}
              type="button"
              onClick={async () => {
                setEnviando(true);
                setError(null);
                try {
                  await onElegir();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo elegir.");
                  setEnviando(false);
                }
              }}
            >
              {enviando ? "Enviando…" : "Sí, elegir"}
            </button>
            <button
              className="ease text-mist hover:text-ink px-4 py-3.5 text-[11px] tracking-[0.14em] uppercase transition duration-200 disabled:opacity-40"
              disabled={enviando}
              type="button"
              onClick={() => setConfirmando(false)}
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button
          className="ease border-ink text-ink hover:border-ochre hover:text-ochre mt-1 self-start border px-5 py-3 text-[11px] tracking-[0.14em] uppercase transition duration-200"
          type="button"
          onClick={() => setConfirmando(true)}
        >
          Elegir a {postulacion.espacio}
        </button>
      )}
    </li>
  );
}

// El cliente ve las postulaciones a su pedido (sin que nadie haya visto sus
// datos todavía) y elige una. Todo pasa por n8n con el token del enlace.
export default function ElegirPostulacion({token}: {token: string}) {
  const tokenValido = UUID.test(token) && Boolean(N8N_BASE);
  const [vista, setVista] = useState<Vista>({tipo: "cargando"});

  useEffect(() => {
    if (!tokenValido) return;

    const controller = new AbortController();

    fetch(`${N8N_BASE}/webhook/bolsa-postulaciones?t=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: HEADERS,
    })
      .then((res) => (res.ok ? res.json() : {status: "invalido"}))
      .then((json) =>
        setVista(json.status === "ok" ? {tipo: "pedido", pedido: json} : {tipo: "invalido"}),
      )
      .catch((err) => {
        if (err?.name !== "AbortError") setVista({tipo: "invalido"});
      });

    return () => controller.abort();
  }, [token, tokenValido]);

  async function elegir(postulacionId: string) {
    const res = await fetch(`${N8N_BASE}/webhook/bolsa-elegir`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({t: token, postulacion_id: postulacionId}),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.status !== "ok") {
      throw new Error(json.mensaje ?? "No se pudo elegir. Probá de nuevo en un rato.");
    }

    setVista({tipo: "elegido", espacio: json.espacio_nombre});
  }

  if (!tokenValido || vista.tipo === "invalido") {
    return (
      <Aviso titulo="Este enlace no funciona.">
        Puede que esté incompleto. Abrilo de nuevo desde el correo que te mandamos.
      </Aviso>
    );
  }

  if (vista.tipo === "cargando") return <EsqueletoEleccion />;

  if (vista.tipo === "elegido") {
    return (
      <Aviso titulo="¡Listo!">
        Le pasamos tus datos a <b className="text-ink">{vista.espacio}</b>. Te va a escribir con una
        propuesta formal; también te mandamos un correo con este resumen.
      </Aviso>
    );
  }

  const {pedido} = vista;

  if (pedido.estado === "ASIGNADO") {
    return (
      <Aviso titulo="Ya elegiste.">
        Este pedido quedó con <b className="text-ink">{pedido.elegido_nombre}</b>, que te va a
        escribir con la propuesta.
      </Aviso>
    );
  }

  if (pedido.estado === "VENCIDO") {
    return (
      <Aviso titulo="Este pedido venció.">
        Pasó el plazo de la bolsa sin que se eligiera a nadie. Si todavía necesitás ayuda, podés
        volver a escribirnos.
      </Aviso>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className={`${tarjetaClass} flex flex-col gap-2 px-6 py-5`}>
        <p className="text-faint text-[10px] tracking-[0.16em] uppercase">Tu pedido</p>
        <p className="text-ink font-serif text-[21px] leading-tight">
          {SERVICIO_LEGIBLE[pedido.servicio]} ·{" "}
          {presupuestoDeclarado(pedido.presupuesto_rango, Number(pedido.presupuesto))}
        </p>
        <p className="text-muted text-[14px] leading-relaxed">{pedido.resumen}</p>
      </section>

      {pedido.postulaciones.length === 0 ? (
        <Aviso titulo="Todavía no hay postulaciones.">
          Cuando otros desarrolladores se postulen, te avisamos por correo para que elijas.
        </Aviso>
      ) : (
        <>
          <p className="text-muted max-w-xl text-[14.5px] leading-relaxed">
            Hola {pedido.cliente_nombre}: estos desarrolladores quieren hacer tu proyecto. Los
            precios y plazos son estimados; el que elijas te manda después la propuesta formal.
          </p>
          <ul className="flex flex-col gap-4">
            {pedido.postulaciones.map((p) => (
              <TarjetaPostulacion key={p.id} postulacion={p} onElegir={() => elegir(p.id)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
