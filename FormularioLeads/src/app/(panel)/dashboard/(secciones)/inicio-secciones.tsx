"use client";

import DashboardChanges from "../dashboard-changes";
import DashboardKpi from "../dashboard-kpi";
import DashboardProposals from "../dashboard-proposals";
import {usePanelDatos} from "../panel-datos";

export default function InicioSecciones() {
  const d = usePanelDatos();

  return (
    <div className="flex flex-col gap-14">
      <DashboardProposals porEnviar={d.porEnviar} onEnviar={d.enviarPropuesta} />
      <DashboardKpi funnel={d.funnel} metrics={d.metrics} />
      <DashboardChanges
        pedidos={d.pedidos}
        onAceptar={d.aceptarCambio}
        onRechazar={d.rechazarCambio}
      />
    </div>
  );
}
