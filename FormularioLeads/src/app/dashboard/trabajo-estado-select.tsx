"use client";

import {useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;

const ESTADOS = ["PENDIENTE", "EN_PROGRESO", "EN_REVISION", "ENTREGADO"] as const;

const COLOR: Record<string, string> = {
  PENDIENTE: "text-neutral-400 border-neutral-700",
  EN_PROGRESO: "text-amber-400 border-amber-700",
  EN_REVISION: "text-sky-400 border-sky-800",
  ENTREGADO: "text-emerald-400 border-emerald-800",
};

// Selector de estado del TRABAJO. Optimista: aplica el cambio en pantalla y lo
// manda al webhook de n8n (que actualiza Supabase + Notion). Si falla, revierte.
export default function TrabajoEstadoSelect({
  leadId,
  inicial,
}: {
  leadId: string;
  inicial: string;
}) {
  const [estado, setEstado] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  async function cambiar(nuevo: string) {
    if (nuevo === estado || !N8N_BASE) return;

    const previo = estado;
    setEstado(nuevo);
    setGuardando(true);
    setError(false);

    try {
      const res = await fetch(`${N8N_BASE}/webhook/trabajo-estado`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"},
        body: JSON.stringify({lead_id: leadId, estado: nuevo}),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
    } catch (err) {
      console.error(err);
      setEstado(previo); // revertir
      setError(true);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <select
      value={estado}
      onChange={(e) => cambiar(e.target.value)}
      disabled={guardando}
      className={`cursor-pointer border bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] outline-none transition disabled:opacity-40 ${
        error ? "border-red-500 text-red-400" : COLOR[estado] ?? "text-neutral-300 border-neutral-700"
      }`}
    >
      {ESTADOS.map((s) => (
        <option key={s} value={s} className="bg-[#0d0d0d] text-neutral-200">
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
