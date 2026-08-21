"use client";

import type {Ticket, TicketsResponse} from "@/lib/tickets";

import {useCallback, useEffect, useState} from "react";

// Tablero tipo Trello sobre la base de Notion. El estado vive en Notion; acá
// sólo se pinta y se dispara el cambio contra /api/tickets (que va a n8n).
// La prioridad la sube sola el cron de envejecimiento: por eso cada card
// muestra hace cuánto no se mueve y cuánto le falta para escalar.

const ESTADOS_FALLBACK = ["BACKLOG", "EN_CURSO", "BLOQUEADO", "HECHO"];
const PRIORIDADES_FALLBACK = ["BAJA", "MEDIA", "ALTA", "CRITICA"];

// La escala de prioridades es configurable, así que el color se asigna por
// posición en la escala y no por nombre fijo.
const ESCALA_COLOR = [
  "text-neutral-400 border-neutral-700",
  "text-sky-400 border-sky-800",
  "text-amber-400 border-amber-700",
  "text-red-400 border-red-800",
];

function colorPrioridad(prioridad: string, prioridades: string[]) {
  const idx = prioridades.indexOf(prioridad);

  if (idx < 0 || prioridades.length < 2) return ESCALA_COLOR[0];

  const paso = (idx / (prioridades.length - 1)) * (ESCALA_COLOR.length - 1);

  return ESCALA_COLOR[Math.round(paso)];
}

function TicketCard({
  ticket,
  prioridades,
  estados,
  moviendo,
  onMover,
}: {
  ticket: Ticket;
  prioridades: string[];
  estados: string[];
  moviendo: boolean;
  onMover: (ticketId: string, estado: string) => void;
}) {
  const idx = estados.indexOf(ticket.estado);
  const anterior = idx > 0 ? estados[idx - 1] : null;
  const siguiente = idx >= 0 && idx < estados.length - 1 ? estados[idx + 1] : null;
  const porEscalar = ticket.dias_para_escalar != null && ticket.dias_para_escalar <= 1;

  return (
    <article
      draggable
      className={`border-l-2 bg-neutral-950 p-3 transition ${
        moviendo ? "opacity-40" : ""
      } ${colorPrioridad(ticket.prioridad, prioridades).split(" ")[1]}`}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", ticket.ticket_id)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`font-mono text-[10px] tracking-[0.15em] uppercase ${
            colorPrioridad(ticket.prioridad, prioridades).split(" ")[0]
          }`}
        >
          {ticket.prioridad}
        </span>
        <span className="font-mono text-[10px] text-neutral-500">{ticket.score}</span>
      </div>

      <p className="mb-2 text-[13px] leading-snug text-neutral-100">{ticket.titulo}</p>

      {ticket.etiquetas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {ticket.etiquetas.map((etiqueta) => (
            <span key={etiqueta} className="font-mono text-[10px] text-neutral-500">
              #{etiqueta}
            </span>
          ))}
        </div>
      )}

      <p className="mb-3 font-mono text-[10px] text-neutral-600">
        {ticket.dias_abierto}d abierto
        {ticket.escaladas > 0 && <span className="text-amber-500"> · ⬆ ×{ticket.escaladas}</span>}
        {ticket.dias_para_escalar != null && (
          <span className={porEscalar ? "text-amber-400" : ""}>
            {" "}
            · escala en {ticket.dias_para_escalar}d
          </span>
        )}
      </p>

      <div className="flex items-center gap-3">
        <button
          aria-label={anterior ? `Mover a ${anterior}` : "Sin columna anterior"}
          className="font-mono text-[11px] text-neutral-600 transition hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-600"
          disabled={!anterior || moviendo}
          type="button"
          onClick={() => anterior && onMover(ticket.ticket_id, anterior)}
        >
          ←
        </button>
        <button
          aria-label={siguiente ? `Mover a ${siguiente}` : "Sin columna siguiente"}
          className="font-mono text-[11px] text-neutral-600 transition hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-600"
          disabled={!siguiente || moviendo}
          type="button"
          onClick={() => siguiente && onMover(ticket.ticket_id, siguiente)}
        >
          →
        </button>
        {ticket.url && (
          <a
            className="ml-auto font-mono text-[10px] text-neutral-600 transition hover:text-amber-400"
            href={ticket.url}
            rel="noreferrer"
            target="_blank"
          >
            Notion ↗
          </a>
        )}
      </div>
    </article>
  );
}

export default function TicketsBoard() {
  const [datos, setDatos] = useState<TicketsResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState("MEDIA");
  const [etiquetas, setEtiquetas] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);

      // abiertos=false trae también los cerrados: el tablero muestra la columna HECHO.
      const res = await fetch("/api/tickets?abiertos=false&limite=100", {cache: "no-store"});
      const json = (await res.json()) as TicketsResponse & {error?: string};

      if (!res.ok || !json.ok) throw new Error(json.error ?? `Error ${res.status}`);

      setDatos(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No pudimos cargar los tickets.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estados = datos?.estados?.length ? datos.estados : ESTADOS_FALLBACK;
  const prioridades = datos?.prioridades?.length ? datos.prioridades : PRIORIDADES_FALLBACK;
  const tickets = datos?.tickets ?? [];

  async function mover(ticketId: string, estado: string) {
    const previo = datos;

    setMoviendo(ticketId);

    // Optimista: movemos la card en pantalla y revertimos si el webhook falla.
    setDatos((actual) =>
      actual
        ? {
            ...actual,
            tickets: actual.tickets.map((t) => (t.ticket_id === ticketId ? {...t, estado} : t)),
          }
        : actual,
    );

    try {
      const res = await fetch("/api/tickets/estado", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ticket_id: ticketId, estado}),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error ?? `Error ${res.status}`);

      // Recargamos: el score lo recalcula n8n, no lo adivinamos acá.
      await cargar();
    } catch (err) {
      console.error(err);
      setDatos(previo);
      setError(err instanceof Error ? err.message : "No se pudo mover el ticket.");
    } finally {
      setMoviendo(null);
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();

    const limpio = titulo.trim();

    if (!limpio || creando) return;

    setCreando(true);
    setError(null);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          titulo: limpio,
          prioridad,
          etiquetas: etiquetas
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error ?? `Error ${res.status}`);

      setTitulo("");
      setEtiquetas("");
      await cargar();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo crear el ticket.");
    } finally {
      setCreando(false);
    }
  }

  if (cargando) {
    return (
      <p className="font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
        Cargando tickets…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {error && (
        <div
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Alta rápida */}
      <form className="flex flex-wrap items-end gap-4" onSubmit={crear}>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
            Nuevo ticket
          </span>
          <input
            required
            className="w-full border-b border-neutral-700 bg-transparent pb-2 text-[13px] text-neutral-100 placeholder-neutral-600 transition outline-none focus:border-amber-400"
            placeholder="¿Qué hay pendiente?"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
            Prioridad
          </span>
          <select
            className="cursor-pointer border-b border-neutral-700 bg-transparent pb-2 font-mono text-[12px] text-neutral-100 transition outline-none focus:border-amber-400"
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
          >
            {prioridades.map((p) => (
              <option key={p} className="bg-[#0d0d0d] text-neutral-200" value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
            Etiquetas
          </span>
          <input
            className="border-b border-neutral-700 bg-transparent pb-2 text-[13px] text-neutral-100 placeholder-neutral-600 transition outline-none focus:border-amber-400"
            placeholder="facturacion, bug"
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
          />
        </label>

        <button
          className="border border-amber-500 px-5 py-2 font-mono text-[11px] tracking-[0.2em] text-amber-400 uppercase transition hover:bg-amber-500 hover:text-neutral-950 disabled:opacity-40"
          disabled={creando}
          type="submit"
        >
          {creando ? "Creando…" : "Crear"}
        </button>
      </form>

      {/* Tablero */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {estados.map((estado) => {
          const enColumna = tickets
            .filter((t) => t.estado === estado)
            .sort((a, b) => b.score - a.score);

          return (
            <section
              key={estado}
              className={`flex min-h-[12rem] flex-col gap-3 border-t-2 pt-4 transition ${
                columnaActiva === estado ? "border-amber-400" : "border-neutral-800"
              }`}
              onDragLeave={() => setColumnaActiva((c) => (c === estado ? null : c))}
              onDragOver={(e) => {
                e.preventDefault();
                setColumnaActiva(estado);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setColumnaActiva(null);

                const id = e.dataTransfer.getData("text/plain");

                if (id) mover(id, estado);
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-[11px] tracking-[0.2em] text-neutral-400 uppercase">
                  {estado.replace(/_/g, " ")}
                </h2>
                <span className="font-mono text-[11px] text-neutral-600">{enColumna.length}</span>
              </div>

              {enColumna.length === 0 ? (
                <p className="font-mono text-[11px] text-neutral-700">Vacío</p>
              ) : (
                enColumna.map((ticket) => (
                  <TicketCard
                    key={ticket.ticket_id}
                    estados={estados}
                    moviendo={moviendo === ticket.ticket_id}
                    prioridades={prioridades}
                    ticket={ticket}
                    onMover={mover}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>

      <p className="font-mono text-[11px] text-neutral-600">
        {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
        {datos?.truncado && " · mostrando los primeros 100"} · la prioridad sube sola cuando un
        ticket queda quieto (cron diario 8:00).
      </p>
    </div>
  );
}
