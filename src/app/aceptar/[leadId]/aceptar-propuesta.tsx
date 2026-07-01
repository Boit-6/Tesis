"use client";

import {useEffect, useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;

type ApiStatus = "ok" | "ya_procesado" | "invalido";

type Estado = "cargando" | "confirmar" | "enviando" | ApiStatus | "error";

interface LeadInfo {
  nombre?: string;
  servicio?: string;
  presupuesto?: number;
}

interface ApiResponse {
  status?: ApiStatus;
  mensaje?: string;
  lead?: LeadInfo;
}

interface StatusContent {
  symbol: string;
  accent: string;
  title: string;
  message: string;
}

function isApiStatus(value: unknown): value is ApiStatus {
  return value === "ok" || value === "ya_procesado" || value === "invalido";
}

function buildContent(estado: ApiStatus | "error", mensaje?: string): StatusContent {
  switch (estado) {
    case "ok":
      return {
        symbol: "✓",
        accent: "text-amber-400",
        title: "¡Propuesta aceptada!",
        message: mensaje ?? "En breve te llega la factura por email.",
      };
    case "ya_procesado":
      return {
        symbol: "↺",
        accent: "text-neutral-400",
        title: "Enlace ya usado",
        message: mensaje ?? "Este enlace ya fue usado. Si tenés dudas, escribinos.",
      };
    case "invalido":
      return {
        symbol: "✕",
        accent: "text-red-400",
        title: "Enlace no válido",
        message: mensaje ?? "Enlace no válido o vencido.",
      };
    case "error":
      return {
        symbol: "!",
        accent: "text-red-400",
        title: "No pudimos procesar tu aceptación",
        message: "Reintentá en un momento.",
      };
  }
}

function StatusView({accent, symbol, title, message}: StatusContent) {
  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className={`font-mono text-4xl font-black ${accent}`}>{symbol}</span>
      <div>
        <h2 className="text-3xl font-black tracking-tight text-neutral-100">{title}</h2>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">{message}</p>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        Cargando propuesta…
      </span>
      <div className="h-px w-24 animate-pulse bg-amber-400" />
    </div>
  );
}

function ConfirmarView({
  lead,
  enviando,
  onConfirmar,
}: {
  lead: LeadInfo | null;
  enviando: boolean;
  onConfirmar: () => void;
}) {
  const servicio = lead?.servicio ? lead.servicio.replace(/_/g, " ") : "tu servicio";

  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500">
        Confirmá tu aceptación
      </span>
      <div>
        <h2 className="text-3xl font-black tracking-tight text-neutral-100">
          {lead?.nombre ? `Hola, ${lead.nombre}.` : "Hola."}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          Estás por aceptar la propuesta de{" "}
          <span className="capitalize text-neutral-300">{servicio}</span>
          {lead?.presupuesto != null ? (
            <>
              {" "}
              por{" "}
              <span className="font-mono text-amber-400">
                ${lead.presupuesto.toLocaleString("es-AR")} USD
              </span>
            </>
          ) : null}
          . Al confirmar, te enviamos la factura por email.
        </p>
      </div>
      <button
        type="button"
        onClick={onConfirmar}
        disabled={enviando}
        className="bg-amber-400 px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-neutral-950 transition duration-200 ease hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando ? "Procesando…" : "Aceptar propuesta →"}
      </button>
    </div>
  );
}

export default function AceptarPropuesta({leadId, token}: {leadId: string; token: string}) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [mensaje, setMensaje] = useState<string | undefined>(undefined);

  // 1) Al cargar: GET read-only. MIRAR — no muta nada (los pre-fetchers caen acá, sin daño).
  useEffect(() => {
    if (!leadId || !token || !N8N_BASE) {
      setEstado("invalido");

      return;
    }

    const controller = new AbortController();

    async function verPropuesta() {
      try {
        const url = `${N8N_BASE}/webhook/lead-propuesta?lead_id=${encodeURIComponent(
          leadId,
        )}&token=${encodeURIComponent(token)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {"ngrok-skip-browser-warning": "true"},
        });

        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const json: ApiResponse = await response.json();

        if (json.status === "ok") {
          setLead(json.lead ?? null);
          setEstado("confirmar");
        } else if (isApiStatus(json.status)) {
          setEstado(json.status);
        } else {
          setEstado("invalido");
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error(err);
        setEstado("error");
      }
    }

    verPropuesta();

    return () => controller.abort();
  }, [leadId, token]);

  // 2) Al click del botón: POST. ACCIONAR — acá sí se acepta y se dispara la factura.
  async function confirmar() {
    if (!N8N_BASE) {
      setEstado("invalido");

      return;
    }

    setEstado("enviando");

    try {
      const response = await fetch(`${N8N_BASE}/webhook/lead-acepta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({lead_id: leadId, token}),
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      const json: ApiResponse = await response.json();

      setMensaje(json.mensaje);
      setEstado(isApiStatus(json.status) ? json.status : "invalido");
    } catch (err) {
      console.error(err);
      setEstado("error");
    }
  }

  if (estado === "cargando") return <LoadingView />;

  if (estado === "confirmar" || estado === "enviando") {
    return (
      <ConfirmarView enviando={estado === "enviando"} lead={lead} onConfirmar={confirmar} />
    );
  }

  return <StatusView {...buildContent(estado, mensaje)} />;
}
