import {z} from "zod";

// Valida las variables de entorno reales del front (ver .env.example) contra
// un schema explícito, en vez de dejar que un typo o una variable faltante se
// note recién en tiempo de ejecución dentro de un componente cualquiera.
//
// Ojo: hoy ningún archivo importa este módulo. `createClient()` (ver
// src/lib/supabase/client.ts y server.ts) ya tolera Supabase sin configurar
// devolviendo null, y las rutas que dependen de CRM_PANEL_TOKEN/TICKETS_API_KEY
// ya devuelven 503 cuando faltan (F2.13). Adoptar este helper es un cambio de
// comportamiento (pasa de fallback silencioso a `parse()` que tira si falta un
// campo requerido) y no corresponde hacerlo en esta ronda.
const envSchema = z.object({
  // Requeridas: sin esto no hay app funcional (front público y dashboard).
  NEXT_PUBLIC_N8N_BASE: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Opcionales, todas con un fallback documentado en el propio código o en
  // .env.example — dejarlas vacías es un estado válido, no un error.
  N8N_BASE: z.string().url().optional(),
  CRM_PANEL_HEADER: z.string().min(1).optional(),
  CRM_PANEL_TOKEN: z.string().optional(),
  TICKETS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_EMAIL_CONTACTO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  NEXT_PUBLIC_N8N_BASE: process.env.NEXT_PUBLIC_N8N_BASE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  N8N_BASE: process.env.N8N_BASE,
  CRM_PANEL_HEADER: process.env.CRM_PANEL_HEADER,
  CRM_PANEL_TOKEN: process.env.CRM_PANEL_TOKEN,
  TICKETS_API_KEY: process.env.TICKETS_API_KEY,
  NEXT_PUBLIC_EMAIL_CONTACTO: process.env.NEXT_PUBLIC_EMAIL_CONTACTO,
});
