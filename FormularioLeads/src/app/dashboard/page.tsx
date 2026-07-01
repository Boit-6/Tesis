import {createServerSupabase} from "@/lib/supabase-server";

import DashboardView, {
  type DashboardData,
  type FacturaPendiente,
  type Lead,
  type Metrics,
  type Trabajo,
} from "./dashboard-view";
import RefreshButton from "./refresh-button";

// El dashboard lee datos en vivo en cada visita: nunca se cachea.
export const dynamic = "force-dynamic";

async function cargarDashboard(): Promise<DashboardData> {
  const supabase = createServerSupabase();

  if (!supabase) {
    return {
      metrics: null,
      funnel: {},
      leads: [],
      trabajos: [],
      facturas: [],
      error: "Faltan las variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
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

    const funnel: Record<string, number> = {};

    for (const row of (resEstados.data as {estado: string}[] | null) ?? []) {
      funnel[row.estado] = (funnel[row.estado] ?? 0) + 1;
    }

    return {
      metrics: (resMetrics.data?.[0] as Metrics) ?? null,
      funnel,
      leads: (resLeads.data as Lead[] | null) ?? [],
      trabajos: (resTrabajos.data as Trabajo[] | null) ?? [],
      facturas: (resFacturas.data as FacturaPendiente[] | null) ?? [],
      error: null,
    };
  } catch (err) {
    console.error(err);

    return {
      metrics: null,
      funnel: {},
      leads: [],
      trabajos: [],
      facturas: [],
      error: err instanceof Error ? err.message : "No pudimos cargar el dashboard.",
    };
  }
}

export default async function DashboardPage() {
  const data = await cargarDashboard();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-6">
      <div className="mb-14 border-b border-neutral-800 pb-12">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-amber-500">
          Panel interno
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-[clamp(2.4rem,7vw,4rem)] font-black leading-[0.9] tracking-tight text-neutral-100">
            Dashboard.
          </h1>
          <RefreshButton />
        </div>
      </div>

      <DashboardView {...data} />
    </main>
  );
}
