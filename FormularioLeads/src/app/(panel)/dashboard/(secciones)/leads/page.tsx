"use client";

import DashboardLeadsTable from "../../dashboard-leads-table";
import EncabezadoPagina from "../../encabezado-pagina";
import {usePanelDatos} from "../../panel-datos";

export default function LeadsPage() {
  const {leads} = usePanelDatos();

  return (
    <>
      <EncabezadoPagina titulo="Leads" />
      <DashboardLeadsTable leads={leads} />
    </>
  );
}
