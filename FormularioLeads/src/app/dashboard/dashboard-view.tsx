import type {ReactNode} from "react";

export type LeadEstado =
  | "NUEVO"
  | "PROPUESTA_ENVIADA"
  | "EN_SEGUIMIENTO"
  | "ACEPTADO"
  | "FACTURADO"
  | "CERRADO"
  | "PERDIDO";

export type Tier = "HOT" | "WARM" | "COLD" | null;

export interface Metrics {
  mes: string;
  total_leads: number;
  conversion_pct: number;
  facturacion: number;
  cobrado: number;
  pendiente: number;
  facturas_vencidas: number;
  tasa_cobro_pct: number;
}

export interface Lead {
  lead_id: string;
  nombre: string;
  email: string;
  servicio: string;
  estado: LeadEstado;
  tier: Tier;
  presupuesto: number;
  fecha_ingreso: string;
}

export interface FacturaPendiente {
  factura_id: string;
  cliente: string;
  servicio: string;
  monto: number;
  moneda: string;
  fecha_vencimiento: string;
  dias_al_vencimiento: number;
}

export interface DashboardData {
  metrics: Metrics | null;
  funnel: Record<string, number>;
  leads: Lead[];
  facturas: FacturaPendiente[];
  error: string | null;
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
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
        {title}
      </span>
      <div className="h-px flex-1 bg-neutral-700" />
    </div>
  );
}

function KpiCard({label, value, alert}: {label: string; value: string; alert?: boolean}) {
  return (
    <div className="border-b border-neutral-800 pb-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>
      <p
        className={`font-mono text-2xl font-bold ${alert ? "text-red-400" : "text-amber-400"}`}
      >
        {value}
      </p>
    </div>
  );
}

function FunnelBar({label, count, max}: {label: string; count: number; max: number}) {
  const percent = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <span className="w-44 shrink-0 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-400">
        {label}
      </span>
      <div className="h-2 flex-1 bg-neutral-900">
        <div className="h-full bg-amber-400" style={{width: `${percent}%`}} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[13px] text-neutral-300">{count}</span>
    </div>
  );
}

function Tag({children, className = ""}: {children: ReactNode; className?: string}) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${className}`}>
      {children}
    </span>
  );
}

export default function DashboardView({metrics, funnel, leads, facturas, error}: DashboardData) {
  const funnelMax = Math.max(1, ...FUNNEL_ORDER.map((estado) => funnel[estado] ?? 0));

  return (
    <div className="flex flex-col gap-16">
      {error && (
        <div
          role="alert"
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
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
                <tr className="border-b border-neutral-700 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
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
                <tr className="border-b border-neutral-700 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
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
    </div>
  );
}
