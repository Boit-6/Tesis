"use client";

import DashboardInvoices from "../../dashboard-invoices";
import EncabezadoPagina from "../../encabezado-pagina";
import {usePanelDatos} from "../../panel-datos";

export default function FacturasPage() {
  const {facturas, anularFactura} = usePanelDatos();

  return (
    <>
      <EncabezadoPagina titulo="Facturas" />
      <DashboardInvoices facturas={facturas} onAnular={anularFactura} />
    </>
  );
}
