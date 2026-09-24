import type {PedidoCambio} from "./dashboard-types";

import {SectionHeader, Tag} from "./dashboard-shared";

import {ghostButtonClass} from "@/lib/constants";

// VI — Pedidos de cambio.
export default function DashboardChanges({
  pedidos,
  onAceptar,
  onRechazar,
}: {
  pedidos: PedidoCambio[];
  onAceptar: (leadId: string) => void;
  onRechazar: (leadId: string) => void;
}) {
  return (
    <section>
      <SectionHeader num="VI" title="Pedidos de cambio" />
      {pedidos.length === 0 ? (
        <p className="text-muted text-[13px]">No hay pedidos de cambio.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {pedidos.map((p) => (
            <div
              key={p.lead_id}
              className="border-rule-soft bg-card max-w-3xl border px-8 py-7 shadow-[0_1px_2px_rgba(25,23,19,0.04)]"
            >
              <div className="mb-3.5 flex flex-wrap items-baseline gap-3">
                <span className="text-ink font-serif text-[22px]">{p.nombre}</span>
                <Tag className="text-faint">{p.servicio?.replace(/_/g, " ")}</Tag>
                <span className="text-mist text-[12px]">{p.lead_id}</span>
              </div>
              <p className="border-ochre text-ink-soft border-l-2 pl-5 font-serif text-[19px] leading-relaxed italic">
                {p.notas}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="ease bg-ink text-paper hover:bg-ochre px-5 py-3 text-[11px] font-medium tracking-[0.14em] uppercase transition duration-200"
                  type="button"
                  onClick={() => onAceptar(p.lead_id)}
                >
                  Aceptar y reenviar
                </button>
                <button
                  className={ghostButtonClass}
                  type="button"
                  onClick={() => onRechazar(p.lead_id)}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
