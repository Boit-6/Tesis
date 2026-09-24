import type {Trabajo} from "./dashboard-types";

import TrabajoEstadoSelect from "./trabajo-estado-select";
import {SectionHeader} from "./dashboard-shared";

import {ghostButtonClass, tdClass, thClass} from "@/lib/constants";

// V — Trabajos activos.
export default function DashboardWork({
  trabajos,
  onEstadoCambio,
  onCerrar,
  onCancelar,
}: {
  trabajos: Trabajo[];
  onEstadoCambio: (leadId: string, estado: Trabajo["estado_trabajo"]) => void;
  onCerrar: (leadId: string) => void;
  onCancelar: (leadId: string) => void;
}) {
  return (
    <section>
      <SectionHeader num="I" title="Trabajos activos" />
      {trabajos.length === 0 ? (
        <p className="text-muted text-[13px]">No hay trabajos en curso.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Trabajos activos</caption>
            <thead>
              <tr>
                <th className={thClass}>Lead</th>
                <th className={thClass}>Cliente</th>
                <th className={thClass}>Servicio</th>
                <th className={thClass}>Estado del trabajo</th>
                <th className={`${thClass} pr-0`}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {trabajos.map((t) => (
                <tr key={t.lead_id}>
                  <td className={`${tdClass} text-mist text-[12.5px]`}>{t.lead_id}</td>
                  <td className={`${tdClass} text-ink font-serif text-[18px]`}>{t.nombre}</td>
                  <td className={tdClass}>{t.servicio?.replace(/_/g, " ")}</td>
                  <td className={tdClass}>
                    <TrabajoEstadoSelect
                      inicial={t.estado_trabajo}
                      leadId={t.lead_id}
                      onCambio={(estado) =>
                        onEstadoCambio(t.lead_id, estado as Trabajo["estado_trabajo"])
                      }
                    />
                  </td>
                  <td className={`${tdClass} pr-0`}>
                    <div className="flex justify-end gap-4">
                      {/* El cierre se ofrece recién con el trabajo entregado:
                          es el paso que faltaba para que el ciclo termine
                          desde la interfaz y no con una petición a mano. */}
                      {t.estado_trabajo === "ENTREGADO" && (
                        <button
                          className={ghostButtonClass}
                          type="button"
                          onClick={() => onCerrar(t.lead_id)}
                        >
                          Cerrar proyecto
                        </button>
                      )}
                      <button
                        className={ghostButtonClass}
                        type="button"
                        onClick={() => onCancelar(t.lead_id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
