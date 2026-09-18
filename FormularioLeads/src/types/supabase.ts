// Tipos de la base, escritos a mano a partir de `db/schema.sql` (fuente de
// verdad del esquema real). No se generaron con `supabase gen types` porque
// eso requiere una conexión autenticada al proyecto de Supabase en la nube,
// que no está disponible desde acá — pero siguen la misma forma que produce
// esa herramienta, para que el resto del código no note la diferencia.
//
// Si el esquema cambia, hay que reflejarlo acá a mano (o, con acceso al
// proyecto, correr `npx supabase gen types typescript --project-id <ref> >
// src/types/supabase.ts` y pisar este archivo entero).

export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

export type UrgenciaTipo = "alta" | "media" | "baja";

export type ServicioTipo =
  | "desarrollo_web"
  | "ecommerce"
  | "app_movil"
  | "automatizacion"
  | "diseno_ui"
  | "consultoria"
  | "soporte"
  | "marketing"
  | "seo";

export type TierTipo = "HOT" | "WARM" | "COLD";

export type LeadEstadoDb =
  | "NUEVO"
  | "PROPUESTA_ENVIADA"
  | "EN_SEGUIMIENTO"
  | "ACEPTADO"
  | "FACTURADO"
  | "CERRADO"
  | "PERDIDO";

export type PagoEstado = "PENDIENTE" | "COBRADO" | "VENCIDA" | "ANULADA";

export type LogNivel = "INFO" | "RECORDATORIO" | "HOY" | "VENCIDA" | "URGENTE" | "WARN" | "ERROR";

export type TrabajoEstadoDb = "PENDIENTE" | "EN_PROGRESO" | "EN_REVISION" | "ENTREGADO";

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: number;
          lead_id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          presupuesto: number;
          urgencia: UrgenciaTipo;
          servicio: ServicioTipo;
          descripcion: string | null;
          fuente: string | null;
          estado: LeadEstadoDb;
          estado_trabajo: TrabajoEstadoDb;
          score: number;
          tier: TierTipo | null;
          seguimientos: number;
          operador_asignado: string | null;
          notas: string | null;
          card_id: string | null;
          accept_token: string;
          token_expira_en: string | null;
          fecha_ingreso: string;
          fecha_propuesta: string | null;
          fecha_ultimo_seguimiento: string | null;
          fecha_aceptacion: string | null;
          fecha_cierre: string | null;
          dias_ciclo_completo: number | null;
          creado_en: string;
          actualizado_en: string;
          precio_propuesto: number | null;
          plazo_propuesto: string | null;
          alcance_propuesto: string | null;
        };
        Insert: {
          id?: number;
          lead_id: string;
          nombre: string;
          email: string;
          telefono?: string | null;
          presupuesto?: number;
          urgencia?: UrgenciaTipo;
          servicio?: ServicioTipo;
          descripcion?: string | null;
          fuente?: string | null;
          estado?: LeadEstadoDb;
          estado_trabajo?: TrabajoEstadoDb;
          score?: number;
          tier?: TierTipo | null;
          seguimientos?: number;
          operador_asignado?: string | null;
          notas?: string | null;
          card_id?: string | null;
          accept_token?: string;
          token_expira_en?: string | null;
          fecha_ingreso?: string;
          fecha_propuesta?: string | null;
          fecha_ultimo_seguimiento?: string | null;
          fecha_aceptacion?: string | null;
          fecha_cierre?: string | null;
          dias_ciclo_completo?: number | null;
          creado_en?: string;
          actualizado_en?: string;
          precio_propuesto?: number | null;
          plazo_propuesto?: string | null;
          alcance_propuesto?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      facturas: {
        Row: {
          id: number;
          factura_id: string;
          lead_id: string;
          cliente: string;
          email: string;
          servicio: ServicioTipo | null;
          monto: number;
          moneda: string;
          estado_pago: PagoEstado;
          recordatorios_enviados: number;
          fecha_emision: string;
          fecha_vencimiento: string;
          fecha_cobro: string | null;
          mp_preference_id: string | null;
          mp_payment_id: string | null;
          comision_plataforma: number;
          fecha_envio_email: string | null;
          creado_en: string;
          pay_url: string | null;
          pago_token: string;
        };
        Insert: {
          id?: number;
          factura_id: string;
          lead_id: string;
          cliente: string;
          email: string;
          servicio?: ServicioTipo | null;
          monto: number;
          moneda?: string;
          estado_pago?: PagoEstado;
          recordatorios_enviados?: number;
          fecha_emision?: string;
          fecha_vencimiento: string;
          fecha_cobro?: string | null;
          mp_preference_id?: string | null;
          mp_payment_id?: string | null;
          comision_plataforma?: number;
          fecha_envio_email?: string | null;
          creado_en?: string;
          pay_url?: string | null;
          pago_token?: string;
        };
        Update: Partial<Database["public"]["Tables"]["facturas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "facturas_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["lead_id"];
          },
        ];
      };
      seguimientos: {
        Row: {
          id: number;
          lead_id: string;
          numero: number;
          canal: string;
          asunto: string | null;
          cuerpo: string | null;
          enviado_en: string;
        };
        Insert: {
          id?: number;
          lead_id: string;
          numero: number;
          canal?: string;
          asunto?: string | null;
          cuerpo?: string | null;
          enviado_en?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seguimientos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "seguimientos_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["lead_id"];
          },
        ];
      };
      logs: {
        Row: {
          id: number;
          workflow: string | null;
          lead_id: string | null;
          evento: string | null;
          nivel: LogNivel;
          detalle: string | null;
          error_msg: string | null;
          creado_en: string;
        };
        Insert: {
          id?: number;
          workflow?: string | null;
          lead_id?: string | null;
          evento?: string | null;
          nivel?: LogNivel;
          detalle?: string | null;
          error_msg?: string | null;
          creado_en?: string;
        };
        Update: Partial<Database["public"]["Tables"]["logs"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: string;
          creado_en: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: string;
          creado_en?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        // FK real a auth.users(id), fuera del esquema `public` que modela este
        // archivo — sin relevancia acá porque nada hace un embed sobre `auth`.
        Relationships: [];
      };
      admin_emails: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_emails"]["Insert"]>;
        Relationships: [];
      };
      rate_limit_log: {
        Row: {
          id: number;
          ip_o_clave: string;
          ruta: string;
          creado_en: string;
        };
        Insert: {
          id?: number;
          ip_o_clave: string;
          ruta: string;
          creado_en?: string;
        };
        Update: Partial<Database["public"]["Tables"]["rate_limit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      // Las vistas son de solo lectura y `security_invoker`: todas sus
      // columnas se declaran opcionales/nullable, igual que hace el propio
      // generador de Supabase (una vista no puede garantizar NOT NULL).
      metrics_mensuales: {
        Row: {
          mes: string | null;
          total_leads: number | null;
          leads_hot: number | null;
          leads_warm: number | null;
          leads_cerrados: number | null;
          leads_perdidos: number | null;
          conversion_pct: number | null;
          tiempo_prom_dias: number | null;
          facturacion: number | null;
          cobrado: number | null;
          pendiente: number | null;
          facturas_vencidas: number | null;
          tasa_cobro_pct: number | null;
          comision_cobrada: number | null;
        };
        Relationships: [];
      };
      facturas_pendientes: {
        Row: {
          id: number | null;
          factura_id: string | null;
          lead_id: string | null;
          cliente: string | null;
          email: string | null;
          servicio: ServicioTipo | null;
          monto: number | null;
          moneda: string | null;
          estado_pago: PagoEstado | null;
          recordatorios_enviados: number | null;
          fecha_emision: string | null;
          fecha_vencimiento: string | null;
          fecha_cobro: string | null;
          mp_preference_id: string | null;
          mp_payment_id: string | null;
          comision_plataforma: number | null;
          fecha_envio_email: string | null;
          creado_en: string | null;
          pay_url: string | null;
          pago_token: string | null;
          dias_al_vencimiento: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      urgencia_tipo: UrgenciaTipo;
      servicio_tipo: ServicioTipo;
      tier_tipo: TierTipo;
      lead_estado: LeadEstadoDb;
      pago_estado: PagoEstado;
      log_nivel: LogNivel;
      trabajo_estado: TrabajoEstadoDb;
    };
    CompositeTypes: Record<string, never>;
  };
}
