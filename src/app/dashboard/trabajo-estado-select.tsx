"use client";

import {useState} from "react";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;

const ESTADOS = ["PENDIENTE", "EN_PROGRESO", "EN_REVISION", "ENTREGADO"] as const;

const COLOR: Record<string, string> = {
  PENDIENTE: "text-muted border-rule",
  EN_PROGRESO: "text-ochre border-ochre/40",
  EN_REVISION: "text-[#2f5e86] border-[#afc6da]",
  ENTREGADO: "text-moss border-[#b4cca5]",
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
      className={`cursor-pointer border bg-card px-2.5 py-1.5 text-[11px] tracking-[0.08em] uppercase outline-none transition disabled:opacity-40 ${
        error ? "border-brick text-brick" : (COLOR[estado] ?? "text-ink-soft border-rule")
      }`}
      disabled={guardando}
      value={estado}
      onChange={(e) => cambiar(e.target.value)}
    >
      {ESTADOS.map((s) => (
        <option key={s} className="bg-card text-ink" value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
