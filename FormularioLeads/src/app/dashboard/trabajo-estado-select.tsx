"use client";

import {useState} from "react";

const ESTADOS = ["PENDIENTE", "EN_PROGRESO", "EN_REVISION", "ENTREGADO"] as const;

const COLOR: Record<string, string> = {
  PENDIENTE: "text-neutral-400 border-neutral-700",
  EN_PROGRESO: "text-amber-400 border-amber-700",
  EN_REVISION: "text-sky-400 border-sky-800",
  ENTREGADO: "text-emerald-400 border-emerald-800",
};

// Selector de estado del TRABAJO. Optimista: aplica el cambio en pantalla y lo
// manda a /api/crm/trabajo-estado (route handler que revalida el rol admin y
// agrega la credencial antes de llamar a n8n, que actualiza Supabase + Notion).
// Si falla, revierte.
export default function TrabajoEstadoSelect({leadId, inicial}: {leadId: string; inicial: string}) {
  const [estado, setEstado] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);

  async function cambiar(nuevo: string) {
    if (nuevo === estado) return;

    const previo = estado;

    setEstado(nuevo);
    setGuardando(true);
    setError(false);

    try {
      const res = await fetch("/api/crm/trabajo-estado", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({lead_id: leadId, estado: nuevo}),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.ok === false) throw new Error(json.error ?? `Error ${res.status}`);
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
      className={`cursor-pointer border bg-transparent px-2 py-1 font-mono text-[10px] tracking-[0.1em] uppercase transition outline-none disabled:opacity-40 ${
        error
          ? "border-red-500 text-red-400"
          : (COLOR[estado] ?? "border-neutral-700 text-neutral-300")
      }`}
      disabled={guardando}
      value={estado}
      onChange={(e) => cambiar(e.target.value)}
    >
      {ESTADOS.map((s) => (
        <option key={s} className="bg-[#0d0d0d] text-neutral-200" value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
