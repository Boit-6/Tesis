import AvisosPanel from "../avisos-panel";
import EncabezadoPagina from "../encabezado-pagina";

import InicioSecciones from "./inicio-secciones";

import {getPanelUser} from "@/lib/auth";

export default async function InicioPage() {
  const {espacio} = await getPanelUser();

  return (
    <>
      <EncabezadoPagina titulo="Inicio" />
      <InicioSecciones cobrosActivos={espacio.stripe_cobros_activos} />
      <div className="mt-14">
        <AvisosPanel />
      </div>
    </>
  );
}
