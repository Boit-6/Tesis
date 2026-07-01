import {createClient, type SupabaseClient} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente de uso EXCLUSIVO en el servidor. La service key bypassea RLS y NUNCA
// debe llegar al browser: por eso la env var NO lleva el prefijo NEXT_PUBLIC_.
// Si faltan las variables devolvemos null y la página muestra un aviso claro.
export function createServerSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
}
