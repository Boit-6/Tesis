"use client";

import DashboardWork from "../../dashboard-work";
import EncabezadoPagina from "../../encabezado-pagina";
import {usePanelDatos} from "../../panel-datos";

export default function TrabajosPage() {
  const d = usePanelDatos();

  return (
    <>
      <EncabezadoPagina titulo="Trabajos" />
      <DashboardWork
        trabajos={d.trabajos}
        onCancelar={d.cancelar}
        onCerrar={d.cerrarProyecto}
        onEstadoCambio={d.cambiarEstadoTrabajo}
      />
    </>
  );
}
