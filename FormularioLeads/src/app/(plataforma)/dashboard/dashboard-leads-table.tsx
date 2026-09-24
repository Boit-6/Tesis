"use client";

import type {Lead} from "./dashboard-types";

import {useState} from "react";

import {SectionHeader, Tag, formatDate} from "./dashboard-shared";
import {ESTADO_COLOR, LEADS_LIMITE, TIER_COLOR} from "./dashboard-types";

import {tdClass, thClass} from "@/lib/constants";
import {presupuestoDeclarado} from "@/lib/presupuesto";

const POR_PAGINA = 15;

// III — Leads recientes: búsqueda + paginado, todo en cliente sobre los
// LEADS_LIMITE más recientes que ya trajo el coordinador.
export default function DashboardLeadsTable({leads}: {leads: Lead[]}) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);

  const q = busqueda.toLowerCase().trim();
  // Se busca también por email: es el dato que el cliente da por teléfono, y
  // antes buscarlo devolvía "sin resultados" aunque el lead estuviera cargado.
  const leadsFiltrados = q
    ? leads.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.lead_id.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q),
      )
    : leads;
  // La consulta trae los 200 leads más recientes. La búsqueda es en cliente, de
  // modo que sólo alcanza a esos 200: hay que decirlo, porque un "sin
  // resultados" sobre un lead que sí existe es peor que no tener buscador.
  const leadsTopeados = leads.length >= LEADS_LIMITE;
  const totalPaginas = Math.max(1, Math.ceil(leadsFiltrados.length / POR_PAGINA));
  const pag = Math.min(pagina, totalPaginas - 1);
  const leadsPagina = leadsFiltrados.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);

  return (
    <section>
      <SectionHeader num="III" title="Leads recientes" />
      <div className="relative mb-6 max-w-sm">
        <svg
          aria-hidden="true"
          className="text-mist pointer-events-none absolute top-3.5 left-3"
          fill="none"
          height={14}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          viewBox="0 0 24 24"
          width={14}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <input
          aria-label="Buscar leads por nombre, email o ID"
          className="ease border-rule bg-card text-ink placeholder-mist focus:border-ochre w-full border py-2.5 pr-3 pl-9 text-[13.5px] transition duration-200 outline-none"
          placeholder="Buscar por nombre, email o ID…"
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(0);
          }}
        />
      </div>
      {leadsTopeados && (
        <p className="text-mist mb-4 text-[12px]">
          La búsqueda alcanza a los {LEADS_LIMITE} leads más recientes, que son los que muestra esta
          tabla. El embudo de arriba sí cuenta el histórico completo.
        </p>
      )}
      {leadsFiltrados.length === 0 ? (
        <p className="text-muted text-[13px]">
          {busqueda ? "Sin resultados para esa búsqueda." : "Sin leads para mostrar."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Leads recientes</caption>
              <thead>
                <tr>
                  <th className={thClass}>Lead</th>
                  <th className={thClass}>Nombre</th>
                  <th className={thClass}>Servicio</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Tier</th>
                  <th className={`${thClass} text-right`}>Presupuesto</th>
                  <th className={`${thClass} pr-0 text-right`}>Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {leadsPagina.map((lead) => (
                  <tr key={lead.lead_id}>
                    <td className={`${tdClass} text-mist text-[12.5px]`}>{lead.lead_id}</td>
                    <td className={`${tdClass} text-ink font-serif text-[18px]`}>{lead.nombre}</td>
                    <td className={tdClass}>{lead.servicio?.replace(/_/g, " ")}</td>
                    <td className={tdClass}>
                      <Tag className={lead.estado ? ESTADO_COLOR[lead.estado] : "text-mist"}>
                        {lead.estado?.replace(/_/g, " ")}
                      </Tag>
                    </td>
                    <td className={tdClass}>
                      <Tag className={lead.tier ? TIER_COLOR[lead.tier] : "text-mist"}>
                        {lead.tier ?? "—"}
                      </Tag>
                    </td>
                    <td className={`${tdClass} text-ink text-right`}>
                      {presupuestoDeclarado(lead.presupuesto_rango, lead.presupuesto)}
                    </td>
                    <td className={`${tdClass} text-mist pr-0 text-right`}>
                      {formatDate(lead.fecha_ingreso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="text-faint mt-6 flex items-center justify-between text-[11px] tracking-[0.12em] uppercase">
              <button
                className="ease border-rule hover:border-ochre hover:text-ochre border px-3.5 py-2 transition duration-200 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={pag === 0}
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </button>
              <span className="text-muted">
                Página {pag + 1} de {totalPaginas} · {leadsFiltrados.length} leads
              </span>
              <button
                className="ease border-rule hover:border-ochre hover:text-ochre border px-3.5 py-2 transition duration-200 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={pag >= totalPaginas - 1}
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
