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
  "text-mist border-rule",
  "text-ochre border-ochre/40",
  "text-ochre-deep border-ochre-deep/40",
  "text-brick border-brick/40",
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
      className={`ease bg-card border-l-2 p-3 shadow-[0_1px_2px_rgba(25,23,19,0.04)] transition duration-200 ${
        moviendo ? "opacity-40" : ""
      } ${colorPrioridad(ticket.prioridad, prioridades).split(" ")[1]}`}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", ticket.ticket_id)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`text-[10px] tracking-[0.15em] uppercase ${
            colorPrioridad(ticket.prioridad, prioridades).split(" ")[0]
          }`}
        >
          {ticket.prioridad}
        </span>
        <span className="text-faint text-[10px]">{ticket.score}</span>
      </div>

      <p className="text-ink mb-2 text-[13px] leading-snug">{ticket.titulo}</p>

      {ticket.etiquetas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {ticket.etiquetas.map((etiqueta) => (
            <span key={etiqueta} className="text-faint text-[10px]">
              #{etiqueta}
            </span>
          ))}
        </div>
      )}

      <p className="text-mist mb-3 text-[10px]">
        {ticket.dias_abierto}d abierto
        {ticket.escaladas > 0 && <span className="text-ochre"> · ⬆ ×{ticket.escaladas}</span>}
        {ticket.dias_para_escalar != null && (
          <span className={porEscalar ? "text-brick" : ""}>
            {" "}
            · escala en {ticket.dias_para_escalar}d
          </span>
        )}
      </p>

      <div className="flex items-center gap-3">
        <button
          aria-label={anterior ? `Mover a ${anterior}` : "Sin columna anterior"}
          className="ease text-mist hover:text-ochre disabled:hover:text-mist text-[11px] transition duration-200 disabled:opacity-30"
          disabled={!anterior || moviendo}
          type="button"
          onClick={() => anterior && onMover(ticket.ticket_id, anterior)}
        >
          ←
        </button>
        <button
          aria-label={siguiente ? `Mover a ${siguiente}` : "Sin columna siguiente"}
          className="ease text-mist hover:text-ochre disabled:hover:text-mist text-[11px] transition duration-200 disabled:opacity-30"
          disabled={!siguiente || moviendo}
          type="button"
          onClick={() => siguiente && onMover(ticket.ticket_id, siguiente)}
        >
          →
        </button>
        {ticket.url && (
          <a
            className="ease text-mist hover:text-ochre ml-auto text-[10px] transition duration-200"
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
    return <p className="text-faint text-[11px] tracking-[0.2em] uppercase">Cargando tickets…</p>;
  }

  return (
    <div className="flex flex-col gap-12">
      {error && (
        <div
          className="border-brick bg-brick/5 text-brick border-l-2 px-5 py-3.5 text-[13px]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Alta rápida */}
      <form className="flex flex-wrap items-end gap-4" onSubmit={crear}>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-2">
          <span className="text-faint text-[10px] tracking-[0.2em] uppercase">Nuevo ticket</span>
          <input
            required
            className="ease border-rule text-ink placeholder-mist hover:border-mist focus:border-ochre w-full border-b bg-transparent pb-2 text-[13px] transition duration-200 outline-none"
            placeholder="¿Qué hay pendiente?"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-faint text-[10px] tracking-[0.2em] uppercase">Prioridad</span>
          <select
            className="ease border-rule text-ink hover:border-mist focus:border-ochre cursor-pointer border-b bg-transparent pb-2 text-[12px] transition duration-200 outline-none"
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
          >
            {prioridades.map((p) => (
              <option key={p} className="bg-card text-ink" value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-faint text-[10px] tracking-[0.2em] uppercase">Etiquetas</span>
          <input
            className="ease border-rule text-ink placeholder-mist hover:border-mist focus:border-ochre border-b bg-transparent pb-2 text-[13px] transition duration-200 outline-none"
            placeholder="facturacion, bug"
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
          />
        </label>

        <button
          className="ease border-ochre text-ochre hover:bg-ochre hover:text-paper border px-5 py-2 text-[11px] tracking-[0.2em] uppercase transition duration-200 disabled:opacity-40"
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
              className={`ease flex min-h-[12rem] flex-col gap-3 border-t-2 pt-4 transition duration-200 ${
                columnaActiva === estado ? "border-ochre" : "border-rule"
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
                <h2 className="text-ink-soft text-[11px] tracking-[0.2em] uppercase">
                  {estado.replace(/_/g, " ")}
                </h2>
                <span className="text-mist text-[11px]">{enColumna.length}</span>
              </div>

              {enColumna.length === 0 ? (
                <p className="text-mist text-[11px]">Vacío</p>
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

      <p className="text-mist text-[11px]">
        {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
        {datos?.truncado && " · mostrando los primeros 100"} · la prioridad sube sola cuando un
        ticket queda quieto (cron diario 8:00).
      </p>
    </div>
  );
}
