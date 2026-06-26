import {createClient, type SupabaseClient} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Solo se usa la publishable / anon key (pública por diseño). La secret key NUNCA va al front.
// Si faltan las variables (p. ej. un build en Vercel sin configurar todavía), exportamos null
// en lugar de romper el build: el dashboard lo detecta y muestra un aviso claro.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
