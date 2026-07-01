"use client";

import {useCallback, useEffect, useState} from "react";

import {createClient} from "@/lib/supabase/client";

import TrabajoEstadoSelect from "./trabajo-estado-select";

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
  HOT: "text-amber-400",
  WARM: "text-neutral-300",
  COLD: "text-neutral-500",
};

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
    <div className="mb-8 flex items-center gap-4">
      <span className="font-mono text-[11px] text-neutral-500">{num}</span>
      <span className="font-mono text-[11px] tracking-[0.2em] text-neutral-400 uppercase">
        {title}
      </span>
      <div className="h-px flex-1 bg-neutral-700" />
    </div>
  );
}

function KpiCard({label, value, alert}: {label: string; value: string; alert?: boolean}) {
  return (
    <div className="border-b border-neutral-800 pb-4">
      <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
        {label}
      </p>
      <p className={`font-mono text-2xl font-bold ${alert ? "text-red-400" : "text-amber-400"}`}>
        {value}
      </p>
    </div>
  );
}

function FunnelBar({label, count, max}: {label: string; count: number; max: number}) {
  const percent = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <span className="w-44 shrink-0 font-mono text-[11px] tracking-[0.15em] text-neutral-400 uppercase">
        {label}
      </span>
      <div className="h-2 flex-1 bg-neutral-900">
        <div className="h-full bg-amber-400" style={{width: `${percent}%`}} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[13px] text-neutral-300">
        {count}
      </span>
    </div>
  );
}

function Tag({children, className = ""}: {children: React.ReactNode; className?: string}) {
  return (
    <span className={`font-mono text-[10px] tracking-[0.15em] uppercase ${className}`}>
      {children}
    </span>
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

  const cargarDatos = useCallback(async () => {
    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);

      return;
    }

    try {
      setError(null);

      const [resMetrics, resEstados, resLeads, resFacturas, resTrabajos] = await Promise.all([
        supabase.from("metrics_mensuales").select("*").order("mes", {ascending: false}).limit(1),
        supabase.from("leads").select("estado"),
        supabase
          .from("leads")
          .select("lead_id,nombre,email,servicio,estado,tier,presupuesto,fecha_ingreso")
          .order("fecha_ingreso", {ascending: false})
          .limit(20),
        supabase.from("facturas_pendientes").select("*").order("dias_al_vencimiento"),
        supabase
          .from("leads")
          .select("lead_id,nombre,servicio,estado_trabajo")
          .in("estado", ["ACEPTADO", "FACTURADO"])
          .order("fecha_ingreso", {ascending: false}),
      ]);

      const fallo =
        resMetrics.error ?? resEstados.error ?? resLeads.error ?? resFacturas.error ?? resTrabajos.error;

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

  if (loading) {
    return (
      <p className="font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase">
        Cargando datos…
      </p>
    );
  }

  const funnelMax = Math.max(1, ...FUNNEL_ORDER.map((estado) => funnel[estado] ?? 0));

  return (
    <div className="flex flex-col gap-16">
      {error && (
        <div
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* A — KPIs del mes */}
      <section>
        <SectionHeader num="A" title="KPIs del mes" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
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

      {/* B — Embudo de leads */}
      <section>
        <SectionHeader num="B" title="Embudo de leads" />
        <div className="flex flex-col gap-4">
          {FUNNEL_ORDER.map((estado) => (
            <FunnelBar
              key={estado}
              count={funnel[estado] ?? 0}
              label={estado.replace(/_/g, " ")}
              max={funnelMax}
            />
          ))}
        </div>
      </section>

      {/* C — Leads recientes */}
      <section>
        <SectionHeader num="C" title="Leads recientes" />
        {leads.length === 0 ? (
          <p className="font-mono text-[12px] text-neutral-500">Sin leads para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-700 font-mono text-[10px] tracking-[0.15em] text-neutral-500 uppercase">
                  <th className="py-3 pr-4 font-normal">Lead</th>
                  <th className="py-3 pr-4 font-normal">Nombre</th>
                  <th className="py-3 pr-4 font-normal">Servicio</th>
                  <th className="py-3 pr-4 font-normal">Estado</th>
                  <th className="py-3 pr-4 font-normal">Tier</th>
                  <th className="py-3 pr-4 text-right font-normal">Presupuesto</th>
                  <th className="py-3 text-right font-normal">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="border-b border-neutral-900 text-neutral-300">
                    <td className="py-3 pr-4 font-mono text-[12px] text-neutral-500">
                      {lead.lead_id}
                    </td>
                    <td className="py-3 pr-4 text-neutral-100">{lead.nombre}</td>
                    <td className="py-3 pr-4">{lead.servicio?.replace(/_/g, " ")}</td>
                    <td className="py-3 pr-4">
                      <Tag className="text-neutral-400">{lead.estado?.replace(/_/g, " ")}</Tag>
                    </td>
                    <td className="py-3 pr-4">
                      <Tag className={lead.tier ? TIER_COLOR[lead.tier] : "text-neutral-700"}>
                        {lead.tier ?? "—"}
                      </Tag>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {formatMoney(lead.presupuesto)}
                    </td>
                    <td className="py-3 text-right font-mono text-neutral-500">
                      {formatDate(lead.fecha_ingreso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* D — Facturas pendientes */}
      <section>
        <SectionHeader num="D" title="Facturas pendientes" />
        {facturas.length === 0 ? (
          <p className="font-mono text-[12px] text-neutral-500">No hay facturas pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-700 font-mono text-[10px] tracking-[0.15em] text-neutral-500 uppercase">
                  <th className="py-3 pr-4 font-normal">Factura</th>
                  <th className="py-3 pr-4 font-normal">Cliente</th>
                  <th className="py-3 pr-4 font-normal">Servicio</th>
                  <th className="py-3 pr-4 text-right font-normal">Monto</th>
                  <th className="py-3 pr-4 text-right font-normal">Vence</th>
                  <th className="py-3 text-right font-normal">Días</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => {
                  const vencida = factura.dias_al_vencimiento < 0;
                  const venceHoy = factura.dias_al_vencimiento === 0;

                  return (
                    <tr
                      key={factura.factura_id}
                      className={`border-b border-neutral-900 ${vencida ? "text-red-400" : "text-neutral-300"}`}
                    >
                      <td className="py-3 pr-4 font-mono text-[12px]">{factura.factura_id}</td>
                      <td className="py-3 pr-4 text-neutral-100">{factura.cliente}</td>
                      <td className="py-3 pr-4">{factura.servicio?.replace(/_/g, " ")}</td>
                      <td className="py-3 pr-4 text-right font-mono">
                        {formatMoney(factura.monto)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono">
                        {formatDate(factura.fecha_vencimiento)}
                      </td>
                      <td
                        className={`py-3 text-right font-mono ${vencida ? "text-red-400" : venceHoy ? "text-amber-400" : "text-neutral-500"}`}
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

      {/* E — Trabajos activos */}
      <section>
        <SectionHeader num="E" title="Trabajos activos" />
        {trabajos.length === 0 ? (
          <p className="font-mono text-[12px] text-neutral-500">No hay trabajos en curso.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-neutral-700 font-mono text-[10px] tracking-[0.15em] text-neutral-500 uppercase">
                  <th className="py-3 pr-4 font-normal">Lead</th>
                  <th className="py-3 pr-4 font-normal">Cliente</th>
                  <th className="py-3 pr-4 font-normal">Servicio</th>
                  <th className="py-3 font-normal">Estado del trabajo</th>
                </tr>
              </thead>
              <tbody>
                {trabajos.map((t) => (
                  <tr key={t.lead_id} className="border-b border-neutral-900 text-neutral-300">
                    <td className="py-3 pr-4 font-mono text-[12px] text-neutral-500">{t.lead_id}</td>
                    <td className="py-3 pr-4 text-neutral-100">{t.nombre}</td>
                    <td className="py-3 pr-4">{t.servicio?.replace(/_/g, " ")}</td>
                    <td className="py-3">
                      <TrabajoEstadoSelect inicial={t.estado_trabajo} leadId={t.lead_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
