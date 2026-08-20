"use client";

import {useCallback, useEffect, useState} from "react";

import {createClient} from "@/lib/supabase/client";

import TrabajoEstadoSelect from "./trabajo-estado-select";

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_BASE;

type LeadEstado =
  | "NUEVO"
  | "PROPUESTA_ENVIADA"
  | "EN_SEGUIMIENTO"
  | "ACEPTADO"
  | "FACTURADO"
  | "CERRADO"
  | "PERDIDO";

type Tier = "HOT" | "WARM" | "COLD" | null;

interface Metrics {
  mes: string;
  total_leads: number;
  conversion_pct: number;
  facturacion: number;
  cobrado: number;
  pendiente: number;
  facturas_vencidas: number;
  tasa_cobro_pct: number;
}

interface Lead {
  lead_id: string;
  nombre: string;
  email: string;
  servicio: string;
  estado: LeadEstado;
  tier: Tier;
  presupuesto: number;
  fecha_ingreso: string;
}

interface FacturaPendiente {
  factura_id: string;
  cliente: string;
  servicio: string;
  monto: number;
  moneda: string;
  fecha_vencimiento: string;
  dias_al_vencimiento: number;
}

interface Trabajo {
  lead_id: string;
  nombre: string;
  servicio: string;
  estado_trabajo: "PENDIENTE" | "EN_PROGRESO" | "EN_REVISION" | "ENTREGADO";
}

interface PedidoCambio {
  lead_id: string;
  nombre: string;
  servicio: string;
  notas: string | null;
}

const FUNNEL_ORDER: LeadEstado[] = [
  "NUEVO",
  "PROPUESTA_ENVIADA",
  "EN_SEGUIMIENTO",
  "ACEPTADO",
  "FACTURADO",
  "CERRADO",
  "PERDIDO",
];

const TIER_COLOR: Record<NonNullable<Tier>, string> = {
  HOT: "text-ochre font-semibold",
  WARM: "text-ink-soft",
  COLD: "text-mist",
};

const ESTADO_COLOR: Record<LeadEstado, string> = {
  NUEVO: "text-ochre",
  PROPUESTA_ENVIADA: "text-muted",
  EN_SEGUIMIENTO: "text-muted",
  ACEPTADO: "text-moss",
  FACTURADO: "text-moss",
  CERRADO: "text-mist",
  PERDIDO: "text-brick",
};

const thClass =
  "border-b border-rule py-3 pr-5 text-left text-[10px] font-medium tracking-[0.16em] text-faint uppercase";

const tdClass = "border-b border-rule-soft py-4 pr-5 text-[14px] text-ink-soft";

const ghostButtonClass =
  "ease border border-rule px-3.5 py-2 text-[11px] tracking-[0.12em] text-muted uppercase transition duration-200 hover:border-brick hover:text-brick";

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";

  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "—";

  return `${value}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-AR");
}

function SectionHeader({num, title}: {num: string; title: string}) {
  return (
    <div className="mb-7 flex items-baseline gap-3">
      <span className="font-serif text-[17px] text-ochre">{num}</span>
      <span className="text-[10px] tracking-[0.2em] text-ink-soft uppercase">{title}</span>
      <div className="h-px flex-1 bg-rule-soft" />
    </div>
  );
}

function KpiCard({label, value, alert}: {label: string; value: string; alert?: boolean}) {
  return (
    <div className="border-t border-rule pt-3.5">
      <p className="mb-2 text-[10px] tracking-[0.16em] text-faint uppercase">{label}</p>
      <p
        className={`font-serif text-[38px] leading-none tracking-tight ${
          alert ? "text-brick" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  max,
  muted,
}: {
  label: string;
  count: number;
  max: number;
  muted?: boolean;
}) {
  const percent = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="flex items-center gap-5">
      <span className="w-44 shrink-0 text-[11px] tracking-[0.12em] text-muted uppercase">
        {label}
      </span>
      <div className="h-1.5 flex-1 bg-rule-soft">
        <div
          className={`h-full ${muted ? "bg-mist" : "bg-ochre"}`}
          style={{width: `${percent}%`}}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-serif text-[20px] text-ink">{count}</span>
    </div>
  );
}

function Tag({children, className = ""}: {children: React.ReactNode; className?: string}) {
  return (
    <span className={`text-[10.5px] tracking-[0.1em] uppercase ${className}`}>{children}</span>
  );
}

export default function DashboardClient() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [facturas, setFacturas] = useState<FacturaPendiente[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCambio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);

  const cargarDatos = useCallback(async () => {
    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);

      return;
    }

    try {
      setError(null);

      const [resMetrics, resEstados, resLeads, resFacturas, resTrabajos, resPedidos] =
        await Promise.all([
          supabase.from("metrics_mensuales").select("*").order("mes", {ascending: false}).limit(1),
          supabase.from("leads").select("estado"),
          supabase
            .from("leads")
            .select("lead_id,nombre,email,servicio,estado,tier,presupuesto,fecha_ingreso")
            .order("fecha_ingreso", {ascending: false})
            .limit(200),
          supabase.from("facturas_pendientes").select("*").order("dias_al_vencimiento"),
          supabase
            .from("leads")
            .select("lead_id,nombre,servicio,estado_trabajo")
            .in("estado", ["ACEPTADO", "FACTURADO"])
            .order("fecha_ingreso", {ascending: false}),
          supabase
            .from("leads")
            .select("lead_id,nombre,servicio,notas")
            .not("notas", "is", null)
            .order("fecha_ingreso", {ascending: false}),
        ]);

      const fallo =
        resMetrics.error ??
        resEstados.error ??
        resLeads.error ??
        resFacturas.error ??
        resTrabajos.error ??
        resPedidos.error;

      if (fallo) throw fallo;

      setMetrics((resMetrics.data?.[0] as Metrics) ?? null);

      const counts: Record<string, number> = {};

      for (const row of (resEstados.data as {estado: string}[] | null) ?? []) {
        counts[row.estado] = (counts[row.estado] ?? 0) + 1;
      }

      setFunnel(counts);
      setLeads((resLeads.data as Lead[] | null) ?? []);
      setFacturas((resFacturas.data as FacturaPendiente[] | null) ?? []);
      setTrabajos((resTrabajos.data as Trabajo[] | null) ?? []);
      setPedidos((resPedidos.data as PedidoCambio[] | null) ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No pudimos cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarDatos();

    if (!supabase) return;

    const client = supabase;

    // Bonus: refresca en vivo cuando entra/cambia un lead.
    const channel = client
      .channel("leads-rt")
      .on("postgres_changes", {event: "*", schema: "public", table: "leads"}, () => cargarDatos())
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [cargarDatos, supabase]);

  async function cancelar(leadId: string) {
    if (!N8N_BASE) return;
    if (!window.confirm("¿Cancelar este pedido? Se marca como PERDIDO y se avisa al cliente."))
      return;

    try {
      const res = await fetch(`${N8N_BASE}/webhook/lead-cancelar`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"},
        body: JSON.stringify({lead_id: leadId}),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      cargarDatos();
    } catch (err) {
      console.error(err);
      setError("No se pudo cancelar el pedido.");
    }
  }

  async function accionCambio(pathWebhook: string, leadId: string) {
    if (!N8N_BASE) return;

    try {
      const res = await fetch(`${N8N_BASE}/webhook/${pathWebhook}`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"},
        body: JSON.stringify({lead_id: leadId}),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      cargarDatos();
    } catch (err) {
      console.error(err);
      setError("No se pudo procesar el pedido de cambio.");
    }
  }

  function aceptarCambio(leadId: string) {
    if (window.confirm("¿Aceptar los cambios y reenviar la propuesta al cliente?")) {
      accionCambio("cambio-aceptar", leadId);
    }
  }

  function rechazarCambio(leadId: string) {
    if (
      window.confirm(
        "¿Rechazar los cambios? Se mantiene la propuesta original y se le avisa al cliente.",
      )
    ) {
      accionCambio("cambio-rechazar", leadId);
    }
  }

  if (loading) {
    return (
      <p className="text-[11px] tracking-[0.2em] text-faint uppercase">Cargando datos…</p>
    );
  }

  const funnelMax = Math.max(1, ...FUNNEL_ORDER.map((estado) => funnel[estado] ?? 0));

  const POR_PAGINA = 15;
  const q = busqueda.toLowerCase().trim();
  const leadsFiltrados = q
    ? leads.filter(
        (l) => l.nombre.toLowerCase().includes(q) || l.lead_id.toLowerCase().includes(q),
      )
    : leads;
  const totalPaginas = Math.max(1, Math.ceil(leadsFiltrados.length / POR_PAGINA));
  const pag = Math.min(pagina, totalPaginas - 1);
  const leadsPagina = leadsFiltrados.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);

  return (
    <div className="flex flex-col gap-14">
      {error && (
        <div
          className="border-l-2 border-brick bg-brick/5 px-5 py-3.5 text-[13px] text-brick"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* I — KPIs del mes */}
      <section>
        <SectionHeader num="I" title="KPIs del mes" />
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Leads" value={metrics ? String(metrics.total_leads) : "—"} />
          <KpiCard label="Conversión" value={formatPct(metrics?.conversion_pct)} />
          <KpiCard label="Tasa de cobro" value={formatPct(metrics?.tasa_cobro_pct)} />
          <KpiCard label="Facturación" value={formatMoney(metrics?.facturacion)} />
          <KpiCard label="Cobrado" value={formatMoney(metrics?.cobrado)} />
          <KpiCard label="Pendiente" value={formatMoney(metrics?.pendiente)} />
          <KpiCard
            alert={!!metrics && metrics.facturas_vencidas > 0}
            label="Facturas vencidas"
            value={metrics ? String(metrics.facturas_vencidas) : "—"}
          />
        </div>
      </section>

      {/* II — Embudo de leads */}
      <section>
        <SectionHeader num="II" title="Embudo de leads" />
        <div className="flex flex-col gap-4">
          {FUNNEL_ORDER.map((estado) => (
            <FunnelBar
              key={estado}
              count={funnel[estado] ?? 0}
              label={estado.replace(/_/g, " ")}
              max={funnelMax}
              muted={estado === "PERDIDO"}
            />
          ))}
        </div>
      </section>

      {/* III — Leads recientes */}
      <section>
        <SectionHeader num="III" title="Leads recientes" />
        <div className="relative mb-6 max-w-sm">
          <svg
            className="pointer-events-none absolute top-3.5 left-3 text-mist"
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
            className="ease w-full border border-rule bg-card py-2.5 pr-3 pl-9 text-[13.5px] text-ink placeholder-mist outline-none transition duration-200 focus:border-ochre"
            placeholder="Buscar por nombre o ID…"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(0);
            }}
          />
        </div>
        {leadsFiltrados.length === 0 ? (
          <p className="text-[13px] text-muted">
            {busqueda ? "Sin resultados para esa búsqueda." : "Sin leads para mostrar."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
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
                      <td className={`${tdClass} text-[12.5px] text-mist`}>{lead.lead_id}</td>
                      <td className={`${tdClass} font-serif text-[18px] text-ink`}>
                        {lead.nombre}
                      </td>
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
                      <td className={`${tdClass} text-right text-ink`}>
                        {formatMoney(lead.presupuesto)}
                      </td>
                      <td className={`${tdClass} pr-0 text-right text-mist`}>
                        {formatDate(lead.fecha_ingreso)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="mt-6 flex items-center justify-between text-[11px] tracking-[0.12em] text-faint uppercase">
                <button
                  className="ease border border-rule px-3.5 py-2 transition duration-200 hover:border-ochre hover:text-ochre disabled:cursor-not-allowed disabled:opacity-30"
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
                  className="ease border border-rule px-3.5 py-2 transition duration-200 hover:border-ochre hover:text-ochre disabled:cursor-not-allowed disabled:opacity-30"
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

      {/* IV — Facturas pendientes */}
      <section>
        <SectionHeader num="IV" title="Facturas pendientes" />
        {facturas.length === 0 ? (
          <p className="text-[13px] text-muted">No hay facturas pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={thClass}>Factura</th>
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Servicio</th>
                  <th className={`${thClass} text-right`}>Monto</th>
                  <th className={`${thClass} text-right`}>Vence</th>
                  <th className={`${thClass} pr-0 text-right`}>Días</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => {
                  const vencida = factura.dias_al_vencimiento < 0;
                  const venceHoy = factura.dias_al_vencimiento === 0;

                  return (
                    <tr key={factura.factura_id}>
                      <td className={`${tdClass} text-[12.5px] text-mist`}>{factura.factura_id}</td>
                      <td className={`${tdClass} font-serif text-[18px] text-ink`}>
                        {factura.cliente}
                      </td>
                      <td className={tdClass}>{factura.servicio?.replace(/_/g, " ")}</td>
                      <td className={`${tdClass} text-right text-ink`}>
                        {formatMoney(factura.monto)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {formatDate(factura.fecha_vencimiento)}
                      </td>
                      <td
                        className={`${tdClass} pr-0 text-right ${
                          vencida ? "text-brick" : venceHoy ? "text-ochre" : "text-muted"
                        }`}
                      >
                        {vencida
                          ? `${Math.abs(factura.dias_al_vencimiento)} vencida`
                          : venceHoy
                            ? "hoy"
                            : factura.dias_al_vencimiento}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* V — Trabajos activos */}
      <section>
        <SectionHeader num="V" title="Trabajos activos" />
        {trabajos.length === 0 ? (
          <p className="text-[13px] text-muted">No hay trabajos en curso.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className={thClass}>Lead</th>
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Servicio</th>
                  <th className={thClass}>Estado del trabajo</th>
                  <th className={`${thClass} pr-0`}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {trabajos.map((t) => (
                  <tr key={t.lead_id}>
                    <td className={`${tdClass} text-[12.5px] text-mist`}>{t.lead_id}</td>
                    <td className={`${tdClass} font-serif text-[18px] text-ink`}>{t.nombre}</td>
                    <td className={tdClass}>{t.servicio?.replace(/_/g, " ")}</td>
                    <td className={tdClass}>
                      <TrabajoEstadoSelect inicial={t.estado_trabajo} leadId={t.lead_id} />
                    </td>
                    <td className={`${tdClass} pr-0`}>
                      <button
                        className={ghostButtonClass}
                        type="button"
                        onClick={() => cancelar(t.lead_id)}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* VI — Pedidos de cambio */}
      <section>
        <SectionHeader num="VI" title="Pedidos de cambio" />
        {pedidos.length === 0 ? (
          <p className="text-[13px] text-muted">No hay pedidos de cambio.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {pedidos.map((p) => (
              <div
                key={p.lead_id}
                className="max-w-3xl border border-rule-soft bg-card px-8 py-7 shadow-[0_1px_2px_rgba(25,23,19,0.04)]"
              >
                <div className="mb-3.5 flex flex-wrap items-baseline gap-3">
                  <span className="font-serif text-[22px] text-ink">{p.nombre}</span>
                  <Tag className="text-faint">{p.servicio?.replace(/_/g, " ")}</Tag>
                  <span className="text-[12px] text-mist">{p.lead_id}</span>
                </div>
                <p className="border-l-2 border-ochre pl-5 font-serif text-[19px] leading-relaxed text-ink-soft italic">
                  {p.notas}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="ease bg-ink px-5 py-3 text-[11px] font-medium tracking-[0.14em] text-paper uppercase transition duration-200 hover:bg-ochre"
                    type="button"
                    onClick={() => aceptarCambio(p.lead_id)}
                  >
                    Aceptar y reenviar
                  </button>
                  <button
                    className={ghostButtonClass}
                    type="button"
                    onClick={() => rechazarCambio(p.lead_id)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
