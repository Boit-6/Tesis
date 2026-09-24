import type {FacturaPendiente} from "./dashboard-types";

import {SectionHeader, formatDate, formatMoney} from "./dashboard-shared";

import {ghostButtonClass, tdClass, thClass} from "@/lib/constants";

// IV — Facturas por cobrar (PENDIENTE y VENCIDA).
export default function DashboardInvoices({
  facturas,
  onAnular,
}: {
  facturas: FacturaPendiente[];
  onAnular: (facturaId: string) => void;
}) {
  return (
    <section>
      <SectionHeader num="I" title="Facturas por cobrar" />
      {facturas.length === 0 ? (
        <p className="text-muted text-[13px]">No hay facturas por cobrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Facturas por cobrar</caption>
            <thead>
              <tr>
                <th className={thClass}>Factura</th>
                <th className={thClass}>Cliente</th>
                <th className={thClass}>Servicio</th>
                <th className={`${thClass} text-right`}>Monto</th>
                <th className={`${thClass} text-right`}>Vence</th>
                <th className={`${thClass} text-right`}>Días</th>
                <th className={`${thClass} pr-0 text-right`}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((factura) => {
                const vencida = factura.dias_al_vencimiento < 0;
                const venceHoy = factura.dias_al_vencimiento === 0;

                return (
                  <tr key={factura.factura_id}>
                    <td className={`${tdClass} text-mist text-[12.5px]`}>
                      {factura.factura_id}
                      {factura.estado === "VENCIDA" && (
                        <span className="text-brick mt-1 block text-[10px] tracking-[0.14em] uppercase">
                          Vencida
                        </span>
                      )}
                    </td>
                    <td className={`${tdClass} text-ink font-serif text-[18px]`}>
                      {factura.cliente}
                    </td>
                    <td className={tdClass}>{factura.servicio?.replace(/_/g, " ")}</td>
                    <td className={`${tdClass} text-ink text-right`}>
                      {formatMoney(factura.monto)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {formatDate(factura.fecha_vencimiento)}
                    </td>
                    <td
                      className={`${tdClass} text-right ${
                        vencida ? "text-brick" : venceHoy ? "text-ochre" : "text-muted"
                      }`}
                    >
                      {vencida
                        ? `${Math.abs(factura.dias_al_vencimiento)} vencida`
                        : venceHoy
                          ? "hoy"
                          : factura.dias_al_vencimiento}
                    </td>
                    <td className={`${tdClass} pr-0 text-right`}>
                      <button
                        className={ghostButtonClass}
                        type="button"
                        onClick={() => onAnular(factura.factura_id)}
                      >
                        Anular
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
