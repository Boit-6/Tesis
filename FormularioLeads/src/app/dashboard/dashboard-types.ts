export type LeadEstado =
  | "NUEVO"
  | "PROPUESTA_ENVIADA"
  | "EN_SEGUIMIENTO"
  | "ACEPTADO"
  | "FACTURADO"
  | "CERRADO"
  | "PERDIDO";

export type Tier = "HOT" | "WARM" | "COLD" | null;

export interface Metrics {
  mes: string;
  total_leads: number;
  conversion_pct: number;
  facturacion: number;
  cobrado: number;
  pendiente: number;
  facturas_vencidas: number;
  tasa_cobro_pct: number;
}

export interface Lead {
  lead_id: string;
  nombre: string;
  email: string;
  servicio: string;
  estado: LeadEstado;
  tier: Tier;
  presupuesto: number;
  fecha_ingreso: string;
}

export interface FacturaPendiente {
  factura_id: string;
  cliente: string;
  servicio: string;
  monto: number;
  moneda: string;
  fecha_vencimiento: string;
  dias_al_vencimiento: number;
}

export interface Trabajo {
  lead_id: string;
  nombre: string;
  servicio: string;
  estado_trabajo: "PENDIENTE" | "EN_PROGRESO" | "EN_REVISION" | "ENTREGADO";
}

export interface PedidoCambio {
  lead_id: string;
  nombre: string;
  servicio: string;
  notas: string | null;
}

// Lead calificado HOT o WARM que todavía espera que el profesional fije los
// términos. Hasta que existió esta pantalla, la propuesta salía sola con el
// importe que el propio interesado había elegido en el formulario.
export interface PorEnviar {
  lead_id: string;
  nombre: string;
  email: string;
  servicio: string;
  tier: Tier;
  score: number;
  presupuesto: number;
  fecha_ingreso: string;
}

// Cuántos leads trae la consulta del coordinador (dashboard-client.tsx) y,
// por lo tanto, a cuántos alcanza la búsqueda en dashboard-leads-table.tsx.
export const LEADS_LIMITE = 200;

export const FUNNEL_ORDER: LeadEstado[] = [
  "NUEVO",
  "PROPUESTA_ENVIADA",
  "EN_SEGUIMIENTO",
  "ACEPTADO",
  "FACTURADO",
  "CERRADO",
  "PERDIDO",
];

export const TIER_COLOR: Record<NonNullable<Tier>, string> = {
  HOT: "text-ochre font-semibold",
  WARM: "text-ink-soft",
  COLD: "text-mist",
};

export const ESTADO_COLOR: Record<LeadEstado, string> = {
  NUEVO: "text-ochre",
  PROPUESTA_ENVIADA: "text-muted",
  EN_SEGUIMIENTO: "text-muted",
  ACEPTADO: "text-moss",
  FACTURADO: "text-moss",
  CERRADO: "text-mist",
  PERDIDO: "text-brick",
};
