"use client";

import {useEffect, useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;
const HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

type ApiStatus = "ok" | "ya_procesado" | "invalido";
// resultados finales por acción + estados de UI
type Estado =
  | "cargando"
  | "confirmar"
  | "pedir_cambios"
  | "enviando"
  | "aceptado"
  | "rechazado"
  | "modificado"
  | "ya_procesado"
  | "invalido"
  | "error";

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

function buildContent(
  estado: "aceptado" | "rechazado" | "modificado" | "ya_procesado" | "invalido" | "error",
  mensaje?: string,
): StatusContent {
  switch (estado) {
    case "aceptado":
      return {
        symbol: "✓",
        accent: "text-amber-400",
        title: "¡Propuesta aceptada!",
        message: mensaje ?? "En breve te llega la factura por email.",
      };
    case "rechazado":
      return {
        symbol: "✕",
        accent: "text-neutral-400",
        title: "Propuesta rechazada",
        message: mensaje ?? "Gracias por avisarnos. Quedamos a disposición.",
      };
    case "modificado":
      return {
        symbol: "✎",
        accent: "text-amber-400",
        title: "Pedido recibido",
        message: mensaje ?? "Recibimos tu pedido. Te contactamos para ajustar la propuesta.",
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
        title: "No pudimos procesar tu solicitud",
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
  onAceptar,
  onPedirCambios,
  onRechazar,
}: {
  lead: LeadInfo | null;
  enviando: boolean;
  onAceptar: () => void;
  onPedirCambios: () => void;
  onRechazar: () => void;
}) {
  const servicio = lead?.servicio ? lead.servicio.replace(/_/g, " ") : "tu servicio";

  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500">
        Confirmá tu decisión
      </span>
      <div>
        <h2 className="text-3xl font-black tracking-tight text-neutral-100">
          {lead?.nombre ? `Hola, ${lead.nombre}.` : "Hola."}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
          Te enviamos la propuesta de{" "}
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
          . ¿Cómo querés seguir?
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onAceptar}
          disabled={enviando}
          className="bg-amber-400 px-8 py-4 font-mono text-[13px] font-bold uppercase tracking-[0.2em] text-neutral-950 transition duration-200 ease hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Procesando…" : "Aceptar propuesta →"}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPedirCambios}
            disabled={enviando}
            className="flex-1 border border-neutral-600 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-neutral-300 transition duration-200 ease hover:border-amber-400 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Pedir cambios
          </button>
          <button
            type="button"
            onClick={onRechazar}
            disabled={enviando}
            className="flex-1 px-4 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-neutral-600 transition duration-200 ease hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

function PedirCambiosView({
  enviando,
  mensaje,
  setMensaje,
  onEnviar,
  onVolver,
}: {
  enviando: boolean;
  mensaje: string;
  setMensaje: (v: string) => void;
  onEnviar: () => void;
  onVolver: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500">
        Pedir cambios
      </span>
      <div className="w-full max-w-sm">
        <p className="mb-4 text-sm leading-relaxed text-neutral-500">
          Contanos qué te gustaría ajustar y te contactamos para revisarlo.
        </p>
        <textarea
          rows={5}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Ej: me gustaría ajustar el precio, sumar SEO y cambiar los colores…"
          className="w-full resize-y border-b border-neutral-600 bg-transparent pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400"
        />
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onEnviar}
            disabled={enviando || mensaje.trim().length < 5}
            className="bg-amber-400 px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-neutral-950 transition duration-200 ease hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Enviando…" : "Enviar pedido →"}
          </button>
          <button
            type="button"
            onClick={onVolver}
            disabled={enviando}
            className="px-4 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-neutral-600 transition duration-200 ease hover:text-neutral-300 disabled:opacity-40"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AceptarPropuesta({leadId, token}: {leadId: string; token: string}) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [mensaje, setMensaje] = useState<string | undefined>(undefined);
  const [pedido, setPedido] = useState("");

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

  // Helper: POST a un webhook de acción (aceptar / rechazar / modificar). ACCIONAR.
  async function accionar(path: string, body: Record<string, unknown>, exito: Estado) {
    if (!N8N_BASE) {
      setEstado("invalido");

      return;
    }

    setEstado("enviando");

    try {
      const response = await fetch(`${N8N_BASE}/webhook/${path}`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({lead_id: leadId, token, ...body}),
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      const json: ApiResponse = await response.json();

      setMensaje(json.mensaje);
      setEstado(json.status === "ok" ? exito : isApiStatus(json.status) ? json.status : "invalido");
    } catch (err) {
      console.error(err);
      setEstado("error");
    }
  }

  function rechazar() {
    if (!window.confirm("¿Seguro que querés rechazar la propuesta? Esta acción no se puede deshacer.")) {
      return;
    }
    accionar("lead-rechaza", {}, "rechazado");
  }

  if (estado === "cargando") return <LoadingView />;

  if (estado === "confirmar" || estado === "enviando") {
    return (
      <ConfirmarView
        enviando={estado === "enviando"}
        lead={lead}
        onAceptar={() => accionar("lead-acepta", {}, "aceptado")}
        onPedirCambios={() => setEstado("pedir_cambios")}
        onRechazar={rechazar}
      />
    );
  }

  if (estado === "pedir_cambios") {
    return (
      <PedirCambiosView
        enviando={false}
        mensaje={pedido}
        setMensaje={setPedido}
        onEnviar={() => accionar("lead-modifica", {mensaje: pedido}, "modificado")}
        onVolver={() => setEstado("confirmar")}
      />
    );
  }

  return <StatusView {...buildContent(estado, mensaje)} />;
}
