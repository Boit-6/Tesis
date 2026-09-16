"use client";

import type {PorEnviar} from "./dashboard-types";

import {useState} from "react";

import {SectionHeader, Tag, formatMoney} from "./dashboard-shared";

// Formulario de términos de una propuesta pendiente. El precio arranca vacío a
// propósito: el presupuesto que declaró el interesado se muestra al lado como
// referencia, pero escribirlo es una decisión del profesional, no un valor que
// el sistema arrastre por omisión.
function TerminosPropuesta({
  lead,
  onEnviar,
}: {
  lead: PorEnviar;
  onEnviar: (lead_id: string, precio: number, plazo: string, alcance: string) => Promise<void>;
}) {
  const [precio, setPrecio] = useState("");
  const [plazo, setPlazo] = useState("");
  const [alcance, setAlcance] = useState("");
  const [enviando, setEnviando] = useState(false);

  const valor = Number(precio);
  const valido = Number.isFinite(valor) && valor > 0;

  const campoClass =
    "ease border-rule bg-card text-ink placeholder-mist focus:border-ochre w-full border px-2.5 py-2 text-[13px] transition duration-200 outline-none";

  return (
    <div className="border-rule-soft flex flex-col gap-3 border-b py-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-ink font-serif text-[19px]">{lead.nombre}</span>
        <Tag className={lead.tier === "HOT" ? "text-brick" : "text-ochre"}>
          {lead.tier} · {lead.score}
        </Tag>
        <span className="text-muted text-[13px]">{lead.servicio?.replace(/_/g, " ")}</span>
        <span className="text-mist text-[12.5px]">
          declaró {formatMoney(lead.presupuesto)} · {lead.email}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[9rem_12rem_1fr_auto]">
        <input
          className={campoClass}
          inputMode="decimal"
          placeholder="Precio USD"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />
        <input
          className={campoClass}
          placeholder="Plazo (ej: 2 semanas)"
          value={plazo}
          onChange={(e) => setPlazo(e.target.value)}
        />
        <input
          className={campoClass}
          placeholder="Alcance: qué incluye"
          value={alcance}
          onChange={(e) => setAlcance(e.target.value)}
        />
        <button
          className="ease bg-ink text-paper hover:bg-ochre px-5 py-2 text-[11px] tracking-[0.14em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!valido || enviando}
          type="button"
          onClick={async () => {
            setEnviando(true);
            try {
              await onEnviar(lead.lead_id, valor, plazo.trim(), alcance.trim());
            } finally {
              setEnviando(false);
            }
          }}
        >
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// Propuestas por enviar. Va primero porque es lo único del tablero que bloquea
// el avance del embudo: mientras el profesional no fije los términos, el lead
// calificado no recibe nada.
export default function DashboardProposals({
  porEnviar,
  onEnviar,
}: {
  porEnviar: PorEnviar[];
  onEnviar: (lead_id: string, precio: number, plazo: string, alcance: string) => Promise<void>;
}) {
  if (porEnviar.length === 0) return null;

  return (
    <section>
      <SectionHeader num="0" title={`Propuestas por enviar (${porEnviar.length})`} />
      <p className="text-muted mb-5 max-w-2xl text-[13px] leading-relaxed">
        Estos leads se calificaron como HOT o WARM y esperan que fijes el precio, el plazo y el
        alcance. Recién entonces se les envía la propuesta, y ese precio es el que se factura al
        aceptarla.
      </p>
      {porEnviar.map((lead) => (
        <TerminosPropuesta key={lead.lead_id} lead={lead} onEnviar={onEnviar} />
      ))}
    </section>
  );
}
