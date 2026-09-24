import Link from "next/link";

import AvisosPanel from "../avisos-panel";
import EncabezadoPagina from "../encabezado-pagina";

import InicioSecciones from "./inicio-secciones";

import {getPanelUser} from "@/lib/auth";

export default async function InicioPage() {
  const {espacio} = await getPanelUser();

  return (
    <>
      <EncabezadoPagina
        acciones={
          !espacio.stripe_cobros_activos && (
            <Link
              className="text-ochre hover:text-ochre-deep text-[12.5px] transition duration-200"
              href="/dashboard/espacio"
            >
              Activá los cobros online →
            </Link>
          )
        }
        titulo="Inicio"
      />
      <div className="flex flex-col gap-14">
        <AvisosPanel />
        <InicioSecciones />
      </div>
    </>
  );
}
