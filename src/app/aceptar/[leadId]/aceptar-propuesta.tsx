"use client";

import {useEffect, useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;

type AcceptStatus = "ok" | "ya_procesado" | "invalido";

type Estado = "cargando" | AcceptStatus | "error";

interface LeadInfo {
  nombre?: string;
  servicio?: string;
}

interface AceptaResponse {
  status?: AcceptStatus;
  mensaje?: string;
  lead?: LeadInfo;
}

interface StatusContent {
  symbol: string;
  accent: string;
  title: string;
  message: string;
}

function isAcceptStatus(value: unknown): value is AcceptStatus {
  return value === "ok" || value === "ya_procesado" || value === "invalido";
}

function buildContent(estado: Exclude<Estado, "cargando">, data: AceptaResponse): StatusContent {
  switch (estado) {
    case "ok": {
      const saludo = data.lead?.nombre ? `Gracias, ${data.lead.nombre}. ` : "";

      return {
        symbol: "✓",
        accent: "text-amber-400",
        title: "¡Propuesta aceptada!",
        message: data.mensaje ?? `${saludo}En breve te llega la factura por email.`,
      };
    }
    case "ya_procesado":
      return {
        symbol: "↺",
        accent: "text-neutral-400",
        title: "Enlace ya usado",
        message: data.mensaje ?? "Este enlace ya fue usado. Si tenés dudas, escribinos.",
      };
    case "invalido":
      return {
        symbol: "✕",
        accent: "text-red-400",
        title: "Enlace no válido",
        message: data.mensaje ?? "Enlace no válido o vencido.",
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
        Procesando tu aceptación…
      </span>
      <div className="h-px w-24 animate-pulse bg-amber-400" />
    </div>
  );
}

export default function AceptarPropuesta({leadId, token}: {leadId: string; token: string}) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [data, setData] = useState<AceptaResponse>({});

  useEffect(() => {
    if (!leadId || !token || !N8N_BASE) {
      setEstado("invalido");

      return;
    }

    const controller = new AbortController();

    async function verificar() {
      try {
        const url = `${N8N_BASE}/webhook/lead-acepta?lead_id=${encodeURIComponent(
          leadId,
        )}&token=${encodeURIComponent(token)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {"ngrok-skip-browser-warning": "true"},
        });

        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const json: AceptaResponse = await response.json();

        setData(json);
        setEstado(isAcceptStatus(json.status) ? json.status : "invalido");
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error(err);
        setEstado("error");
      }
    }

    verificar();

    return () => controller.abort();
  }, [leadId, token]);

  if (estado === "cargando") return <LoadingView />;

  return <StatusView {...buildContent(estado, data)} />;
}
