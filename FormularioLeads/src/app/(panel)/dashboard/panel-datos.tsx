"use client";

import type {
  FacturaPendiente,
  Lead,
  Metrics,
  PedidoCambio,
  PorEnviar,
  Trabajo,
} from "./dashboard-types";
import type {HitosPropuesta} from "./form-propuesta";
import type {Database} from "@/types/supabase";
import type {ReactNode} from "react";

import {createContext, useCallback, useContext, useEffect, useState} from "react";

import {LEADS_LIMITE} from "./dashboard-types";
import LeadDetalle from "./lead-detalle";

import {useConfirm} from "@/app/components/confirm-dialog";
import {createClient} from "@/lib/supabase/client";

// Facturas pendientes que trae el tablero. A la escala actual no debería
// alcanzarse nunca, pero una consulta sin límite no debería depender de eso.
const FACTURAS_LIMITE = 200;

// Ventana para agrupar los eventos de tiempo real en una sola recarga.
const RECARGA_AGRUPADA_MS = 400;

// Las vistas (`metrics_mensuales`, `facturas_pendientes`) declaran todas sus
// columnas nullable en los tipos generados —ninguna vista puede garantizar
// NOT NULL—, aunque acá vengan siempre de columnas NOT NULL de la tabla base.
// Estos adaptadores son el único lugar que reconcilia esa diferencia, en vez
// de un `as Metrics`/`as FacturaPendiente[]` a ciegas sobre toda la fila.
function aMetrics(
  row: Database["public"]["Views"]["metrics_mensuales"]["Row"] | undefined,
): Metrics | null {
  if (!row) return null;

  return {
    mes: row.mes ?? "",
    total_leads: row.total_leads ?? 0,
    conversion_pct: row.conversion_pct ?? 0,
    facturacion: row.facturacion ?? 0,
    cobrado: row.cobrado ?? 0,
    pendiente: row.pendiente ?? 0,
    facturas_vencidas: row.facturas_vencidas ?? 0,
    tasa_cobro_pct: row.tasa_cobro_pct ?? 0,
    cobrado_cierre_manual: row.cobrado_cierre_manual ?? 0,
  };
}

function aFacturaPendiente(
  row: Database["public"]["Views"]["facturas_pendientes"]["Row"],
): FacturaPendiente | null {
  // `factura_id`, `fecha_vencimiento` y `dias_al_vencimiento` no pueden faltar
  // en la práctica (columnas NOT NULL o calculadas a partir de una): si algún
  // día lo hacen, se descarta la fila en vez de mostrar un dato roto.
  if (
    !row.factura_id ||
    !row.cliente ||
    !row.servicio ||
    row.monto == null ||
    !row.moneda ||
    !row.fecha_vencimiento ||
    row.dias_al_vencimiento == null
  ) {
    return null;
  }

  return {
    estado: "PENDIENTE",
    factura_id: row.factura_id,
    cliente: row.cliente,
    servicio: row.servicio,
    monto: row.monto,
    moneda: row.moneda,
    fecha_vencimiento: row.fecha_vencimiento,
    dias_al_vencimiento: row.dias_al_vencimiento,
  };
}

// Días entre hoy y la fecha de vencimiento, con la misma cuenta que la vista
// `facturas_pendientes` (fecha_vencimiento::date - now()::date).
function diasHasta(fecha: string): number {
  const hoy = new Date();
  const vence = new Date(fecha);

  hoy.setHours(0, 0, 0, 0);
  vence.setHours(0, 0, 0, 0);

  return Math.round((vence.getTime() - hoy.getTime()) / 86_400_000);
}

function aFacturaVencida(
  row: Pick<
    Database["public"]["Tables"]["facturas"]["Row"],
    "factura_id" | "cliente" | "servicio" | "monto" | "moneda" | "fecha_vencimiento"
  >,
): FacturaPendiente {
  return {
    estado: "VENCIDA",
    factura_id: row.factura_id,
    cliente: row.cliente,
    servicio: row.servicio ?? "",
    monto: row.monto,
    moneda: row.moneda,
    fecha_vencimiento: row.fecha_vencimiento,
    dias_al_vencimiento: diasHasta(row.fecha_vencimiento),
  };
}

interface PanelDatos {
  // true hasta que llega la primera carga: cada página muestra su esqueleto.
  cargando: boolean;
  metrics: Metrics | null;
  funnel: Record<string, number>;
  leads: Lead[];
  facturas: FacturaPendiente[];
  trabajos: Trabajo[];
  pedidos: PedidoCambio[];
  porEnviar: PorEnviar[];
  enviarPropuesta: (
    leadId: string,
    precio: number,
    plazo: string,
    alcance: string,
    hitos: HitosPropuesta,
  ) => Promise<void>;
  cancelar: (leadId: string) => void;
  cerrarProyecto: (leadId: string) => void;
  aceptarCambio: (leadId: string) => Promise<boolean>;
  rechazarCambio: (leadId: string) => Promise<boolean>;
  anularFactura: (facturaId: string) => void;
  rechazarPedido: (
    leadId: string,
    destino: "bolsa" | "descartar",
    resumen: string,
  ) => Promise<boolean>;
  cambiarEstadoTrabajo: (leadId: string, estado: Trabajo["estado_trabajo"]) => void;
  // Abre el detalle del lead en el panel lateral.
  abrirLead: (leadId: string) => void;
}

const PanelDatosContext = createContext<PanelDatos | null>(null);

// Lo usan las páginas del panel (Inicio, Leads, Facturas, Trabajos) para leer
// los datos y disparar las acciones.
export function usePanelDatos() {
  const datos = useContext(PanelDatosContext);

  if (!datos) throw new Error("usePanelDatos se usa dentro de PanelDatosProvider.");

  return datos;
}

// Coordinador: junta los datos del tablero, mantiene la suscripción Realtime
// y los reparte por contexto a cada página. Vive en el layout de las
// secciones, así que cambiar de pestaña no vuelve a consultar ni abre otra
// suscripción. Las secciones no hablan con Supabase ni con /api/crm
// directamente, solo reciben datos y callbacks.
export default function PanelDatosProvider({children}: {children: ReactNode}) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [facturas, setFacturas] = useState<FacturaPendiente[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCambio[]>([]);
  const [porEnviar, setPorEnviar] = useState<PorEnviar[]>([]);
  const [confirmar, ConfirmDialog] = useConfirm();
  const [leadAbierto, setLeadAbierto] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setLoading(false);

      return;
    }

    try {
      setError(null);

      const [
        resMetrics,
        resEstados,
        resLeads,
        resFacturas,
        resVencidas,
        resTrabajos,
        resPedidos,
        resPorEnviar,
      ] = await Promise.all([
        supabase.from("metrics_mensuales").select("*").order("mes", {ascending: false}).limit(1),
        // Cuenta el embudo histórico completo (no solo el mes en curso), a
        // propósito: es la única lectura de todo el tablero que no puede
        // acotarse a metrics_mensuales, que agrupa por mes y no trae todos
        // los estados. A la escala actual (decenas de filas) traer solo la
        // columna `estado` de cada lead no es un costo real.
        supabase.from("leads").select("estado"),
        supabase
          .from("leads")
          .select(
            "lead_id,nombre,email,servicio,estado,tier,presupuesto,presupuesto_rango,fecha_ingreso",
          )
          .order("fecha_ingreso", {ascending: false})
          .limit(LEADS_LIMITE),
        supabase
          .from("facturas_pendientes")
          .select("*")
          .order("dias_al_vencimiento")
          .limit(FACTURAS_LIMITE),
        // La vista sólo trae PENDIENTE (alimenta los recordatorios): las que
        // el cron ya marcó VENCIDA se leen aparte para que no desaparezcan
        // del tablero justo cuando más urge cobrarlas.
        supabase
          .from("facturas")
          .select("factura_id,cliente,servicio,monto,moneda,fecha_vencimiento")
          .eq("estado_pago", "VENCIDA")
          .order("fecha_vencimiento")
          .limit(FACTURAS_LIMITE),
        supabase
          .from("leads")
          .select("lead_id,nombre,servicio,estado_trabajo")
          .in("estado", ["ACEPTADO", "FACTURADO"])
          .order("fecha_ingreso", {ascending: false}),
        // Un pedido de cambios pendiente es un lead que está EN_SEGUIMIENTO y
        // tiene el mensaje del cliente en `notas`. Filtrar sólo por `notas`
        // no alcanza: nada la limpia al resolver el pedido, así que la
        // bandeja se llenaba de leads ya facturados, cerrados o perdidos que
        // alguna vez pidieron un cambio, con sus botones activos y sin forma
        // de sacarlos de la lista. Al resolverse, el lead vuelve a
        // PROPUESTA_ENVIADA y desaparece de acá, que es lo esperable.
        supabase
          .from("leads")
          .select("lead_id,nombre,servicio,notas")
          .eq("estado", "EN_SEGUIMIENTO")
          .not("notas", "is", null)
          .order("fecha_ingreso", {ascending: false}),
        supabase
          .from("leads")
          .select(
            "lead_id,nombre,email,servicio,tier,score,presupuesto,presupuesto_rango,fecha_ingreso",
          )
          .eq("estado", "NUEVO")
          .in("tier", ["HOT", "WARM"])
          .order("score", {ascending: false}),
      ]);

      const fallo =
        resMetrics.error ??
        resEstados.error ??
        resLeads.error ??
        resFacturas.error ??
        resVencidas.error ??
        resTrabajos.error ??
        resPedidos.error ??
        resPorEnviar.error;

      if (fallo) throw fallo;

      setMetrics(aMetrics(resMetrics.data?.[0]));

      const counts: Record<string, number> = {};

      for (const row of resEstados.data ?? []) {
        counts[row.estado] = (counts[row.estado] ?? 0) + 1;
      }

      setFunnel(counts);
      setLeads(resLeads.data ?? []);
      setFacturas(
        [
          ...(resVencidas.data ?? []).map(aFacturaVencida),
          ...(resFacturas.data ?? []).map(aFacturaPendiente).filter((f) => f !== null),
        ].sort((a, b) => a.dias_al_vencimiento - b.dias_al_vencimiento),
      );
      setTrabajos(resTrabajos.data ?? []);
      setPedidos(resPedidos.data ?? []);
      setPorEnviar(resPorEnviar.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No pudimos cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarDatos();

    if (!supabase) return;

    const client = supabase;
    let pendiente: ReturnType<typeof setTimeout> | null = null;

    // Refresca en vivo cuando entra o cambia un lead o una factura, agrupando
    // la ráfaga. Las facturas cambian solas sin tocar su lead: el pago de
    // Stripe, el cron que las marca VENCIDA o una anulación.
    //
    // Cada evento de `postgres_changes` obliga a recargar el tablero entero, que
    // son seis consultas. Sin agrupar, un proceso programado que actualiza N
    // leads de una vez —el de seguimiento de las 9:00 lo hace— disparaba 6N
    // consultas en ráfaga, más de las que costaría sondear. La espera es corta
    // frente al umbral de 3 s del RNF6, así que no compromete la actualidad del
    // dato: sólo evita repetir la misma recarga N veces.
    const recargarAgrupado = () => {
      if (pendiente) clearTimeout(pendiente);
      pendiente = setTimeout(() => {
        pendiente = null;
        cargarDatos();
      }, RECARGA_AGRUPADA_MS);
    };

    const channel = client
      .channel("tablero-rt")
      .on("postgres_changes", {event: "*", schema: "public", table: "leads"}, recargarAgrupado)
      .on("postgres_changes", {event: "*", schema: "public", table: "facturas"}, recargarAgrupado)
      .subscribe();

    return () => {
      if (pendiente) clearTimeout(pendiente);
      client.removeChannel(channel);
    };
  }, [cargarDatos, supabase]);

  // Las acciones del panel van por /api/crm/*, no directo a n8n: el route
  // handler revalida la sesión, que el pedido sea de tu espacio, y agrega la
  // credencial del lado del servidor.
  // El body es genérico (no siempre es `lead_id`: factura-anular manda
  // `factura_id`) porque el route handler sólo reenvía lo que reciba.
  async function accionPanel(accion: string, body: Record<string, unknown>, mensajeError: string) {
    try {
      const res = await fetch(`/api/crm/${accion}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.ok === false || json.status === "invalido") {
        throw new Error(json.error ?? json.mensaje ?? `Error ${res.status}`);
      }

      cargarDatos();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : mensajeError);
    }
  }

  // Fija los términos y dispara el envío de la propuesta. Es el paso que antes
  // no existía: la propuesta salía sola con el importe del formulario público.
  // Con hitos (etapa 11), primero se guardan en la base: definir_cobro()
  // valida quién llama y cada hito, y n8n toma el total de ahí. Sin hitos
  // también se llama, para volver a la factura única si antes había hitos.
  async function enviarPropuesta(
    leadId: string,
    precio: number,
    plazo: string,
    alcance: string,
    hitos: HitosPropuesta,
  ) {
    try {
      if (!supabase) throw new Error("Falta la conexión con la base.");
      const {error: errorCobro} = await supabase.rpc("definir_cobro", {
        p_lead: leadId,
        p_hitos: hitos,
      });

      if (errorCobro) throw new Error(errorCobro.message);

      const res = await fetch("/api/crm/propuesta-enviar", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({lead_id: leadId, precio, plazo, alcance}),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.status === "invalido") {
        throw new Error(json.mensaje ?? json.error ?? `Error ${res.status}`);
      }

      setPorEnviar((prev) => prev.filter((l) => l.lead_id !== leadId));
      cargarDatos();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo enviar la propuesta.");
      // El formulario está en el panel lateral, que tapa el aviso de error del
      // tablero: se relanza para que también lo muestre ahí.
      throw err;
    }
  }

  // «No puedo tomarlo»: a la bolsa o descartado. Devuelve false si el
  // desarrollador se arrepintió en la confirmación; si falla, lanza el error
  // para que lo muestre el panel lateral, que tapa el aviso del tablero.
  async function rechazarPedido(
    leadId: string,
    destino: "bolsa" | "descartar",
    resumen: string,
  ): Promise<boolean> {
    const ok = await confirmar({
      descripcion:
        destino === "bolsa"
          ? "¿Mandar el pedido a la bolsa? Queda como PERDIDO en tu panel, otros desarrolladores lo ven sin los datos del cliente, y le avisamos al cliente."
          : "¿Descartar el pedido? Queda como PERDIDO y le avisamos al cliente que esta vez no podés tomarlo.",
      textoConfirmar: destino === "bolsa" ? "Mandar a la bolsa" : "Descartar",
      peligroso: destino === "descartar",
    });

    if (!ok) return false;

    const res = await fetch("/api/crm/pedido-rechazar", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({lead_id: leadId, destino, resumen}),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.ok === false || json.status !== "ok") {
      throw new Error(json.mensaje ?? json.error ?? `Error ${res.status}`);
    }

    cargarDatos();

    return true;
  }

  async function cancelar(leadId: string) {
    const ok = await confirmar({
      descripcion: "¿Cancelar este pedido? Se marca como PERDIDO y se avisa al cliente.",
      textoConfirmar: "Cancelar pedido",
      peligroso: true,
    });

    if (!ok) return;

    accionPanel("cancelar", {lead_id: leadId}, "No se pudo cancelar el pedido.");
  }

  // Único camino del sistema al estado CERRADO. Sin esta acción el lead se
  // quedaba en FACTURADO para siempre y las dos métricas que se calculan sobre
  // los leads cerrados —Conversión y Tiempo promedio de ciclo— no podían moverse
  // de cero, porque el webhook sólo se podía disparar a mano.
  async function cerrarProyecto(leadId: string) {
    const ok = await confirmar({
      descripcion:
        "¿Cerrar el proyecto? Se marca el lead como CERRADO, se concilia la factura y se le pide un testimonio al cliente.",
      textoConfirmar: "Cerrar proyecto",
    });

    if (!ok) return;

    accionPanel("cerrar", {lead_id: leadId}, "No se pudo cerrar el proyecto.");
  }

  async function aceptarCambio(leadId: string): Promise<boolean> {
    const ok = await confirmar({
      descripcion: "¿Aceptar los cambios y reenviar la propuesta al cliente?",
      textoConfirmar: "Aceptar y reenviar",
    });

    if (ok)
      await accionPanel(
        "cambio-aceptar",
        {lead_id: leadId},
        "No se pudo procesar el pedido de cambio.",
      );

    return ok;
  }

  async function rechazarCambio(leadId: string): Promise<boolean> {
    const ok = await confirmar({
      descripcion:
        "¿Rechazar los cambios? Se mantiene la propuesta original y se le avisa al cliente.",
      textoConfirmar: "Rechazar",
      peligroso: true,
    });

    if (ok) {
      await accionPanel(
        "cambio-rechazar",
        {lead_id: leadId},
        "No se pudo procesar el pedido de cambio.",
      );
    }

    return ok;
  }

  // Cierra la transición ANULADA del enum `pago_estado` (§4.8 y Cap. 8, punto
  // 7): hasta el 01-sep-2026 estaba prevista en el esquema pero ningún botón
  // ni nodo la disparaba. El backend (`Postgres - Marcar Factura Anulada`) ya
  // es quien decide si aplica (sólo PENDIENTE o VENCIDA, nunca COBRADO); acá
  // sólo se pide confirmación y se refresca la lista si se aplicó.
  async function anularFactura(facturaId: string) {
    const ok = await confirmar({
      descripcion: `¿Anular la factura ${facturaId}? No se puede deshacer y deja de contar como pendiente ni como vencida.`,
      textoConfirmar: "Anular factura",
      peligroso: true,
    });

    if (!ok) return;

    accionPanel("factura-anular", {factura_id: facturaId}, "No se pudo anular la factura.");
  }

  const datos: PanelDatos = {
    cargando: loading,
    metrics,
    funnel,
    leads,
    facturas,
    trabajos,
    pedidos,
    porEnviar,
    enviarPropuesta,
    cancelar,
    cerrarProyecto,
    aceptarCambio,
    rechazarCambio,
    anularFactura,
    rechazarPedido,
    cambiarEstadoTrabajo: (leadId, estado) =>
      setTrabajos((prev) =>
        prev.map((x) => (x.lead_id === leadId ? {...x, estado_trabajo: estado} : x)),
      ),
    abrirLead: setLeadAbierto,
  };

  return (
    <PanelDatosContext.Provider value={datos}>
      {error && (
        <div
          className="border-brick bg-brick/5 text-brick mb-10 border-l-2 px-5 py-3.5 text-[13px]"
          role="alert"
        >
          {error}
        </div>
      )}

      {children}

      {leadAbierto && (
        <LeadDetalle
          key={leadAbierto}
          leadId={leadAbierto}
          onAceptarCambio={aceptarCambio}
          onCerrar={() => setLeadAbierto(null)}
          onEnviarPropuesta={enviarPropuesta}
          onRechazarCambio={rechazarCambio}
          onRechazarPedido={rechazarPedido}
        />
      )}

      <ConfirmDialog />
    </PanelDatosContext.Provider>
  );
}
