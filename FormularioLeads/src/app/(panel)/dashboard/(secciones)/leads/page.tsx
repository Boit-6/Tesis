"use client";

import DashboardEmbudo from "../../dashboard-embudo";
import DashboardLeadsTable from "../../dashboard-leads-table";
import EncabezadoPagina from "../../encabezado-pagina";
import {usePanelDatos} from "../../panel-datos";

export default function LeadsPage() {
  const {leads, funnel, abrirLead} = usePanelDatos();

  return (
    <>
      <EncabezadoPagina titulo="Leads" />
      <div className="flex flex-col gap-14">
        <DashboardLeadsTable leads={leads} onAbrir={abrirLead} />
        <DashboardEmbudo funnel={funnel} />
      </div>
    </>
  );
}
