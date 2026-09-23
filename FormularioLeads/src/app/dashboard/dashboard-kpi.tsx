import type {LeadEstado, Metrics} from "./dashboard-types";

import {FunnelBar, KpiCard, SectionHeader, formatMoney, formatPct} from "./dashboard-shared";
import {FUNNEL_ORDER} from "./dashboard-types";

// I — KPIs del mes, II — Embudo de leads.
export default function DashboardKpi({
  metrics,
  funnel,
}: {
  metrics: Metrics | null;
  funnel: Record<string, number>;
}) {
  const funnelMax = Math.max(1, ...FUNNEL_ORDER.map((estado) => funnel[estado] ?? 0));

  return (
    <>
      <section>
        <SectionHeader num="I" title="KPIs del mes" />
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard label="Leads" value={metrics ? String(metrics.total_leads) : "—"} />
          <KpiCard label="Conversión" value={formatPct(metrics?.conversion_pct)} />
          <KpiCard label="Tasa de cobro" value={formatPct(metrics?.tasa_cobro_pct)} />
          <KpiCard label="Facturación" value={formatMoney(metrics?.facturacion)} />
          <KpiCard
            label="Cobrado"
            nota={
              metrics && metrics.cobrado_cierre_manual > 0
                ? `${formatMoney(metrics.cobrado_cierre_manual)} por cierre, sin pago registrado`
                : undefined
            }
            value={formatMoney(metrics?.cobrado)}
          />
          <KpiCard label="Pendiente" value={formatMoney(metrics?.pendiente)} />
          <KpiCard
            alert={!!metrics && metrics.facturas_vencidas > 0}
            label="Facturas vencidas"
            value={metrics ? String(metrics.facturas_vencidas) : "—"}
          />
        </div>
      </section>

      <section>
        <SectionHeader num="II" title="Embudo de leads" />
        <div className="flex flex-col gap-4">
          {FUNNEL_ORDER.map((estado: LeadEstado) => (
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
    </>
  );
}
