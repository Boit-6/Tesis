import AvisosPanel from "../avisos-panel";
import EncabezadoPagina from "../encabezado-pagina";

import InicioSecciones from "./inicio-secciones";

import {esAdminPlataforma, getPanelUser} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";

// Las disputas abiertas, sólo para el admin de la plataforma: null para el
// resto (la base igual rechaza la consulta).
async function disputasAbiertas(userId: string): Promise<number | null> {
  if (!(await esAdminPlataforma(userId))) return null;
  const supabase = await createClient();
  const {data} = (await supabase?.rpc("disputas_abiertas")) ?? {data: null};

  return data?.length ?? 0;
}

export default async function InicioPage() {
  const {user, espacio} = await getPanelUser();

  return (
    <>
      <EncabezadoPagina titulo="Inicio" />
      <InicioSecciones
        cobrosActivos={espacio.stripe_cobros_activos}
        disputasAbiertas={await disputasAbiertas(user.id)}
      />
      <div className="mt-14">
        <AvisosPanel />
      </div>
    </>
  );
}
