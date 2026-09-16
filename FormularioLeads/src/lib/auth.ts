import type {User} from "@supabase/supabase-js";

import {redirect} from "next/navigation";

import {createClient} from "@/lib/supabase/server";

export interface EstadoAdmin {
  user: User | null;
  esAdmin: boolean;
  supabaseDisponible: boolean;
}

// Núcleo compartido de la verificación de rol: sesión + profiles.role==='admin'.
// No redirige ni responde nada — cada consumidor decide cómo comunicar el
// resultado (una Server Component redirige, un route handler responde JSON).
export async function getAdminStatus(): Promise<EstadoAdmin> {
  const supabase = await createClient();

  if (!supabase) return {user: null, esAdmin: false, supabaseDisponible: false};

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) return {user: null, esAdmin: false, supabaseDisponible: true};

  const {data: profile} = await supabase.from("profiles").select("role").eq("id", user.id).single();

  return {user, esAdmin: profile?.role === "admin", supabaseDisponible: true};
}

// Compuerta de rol para las páginas del panel: exige sesión + rol admin, o
// redirige (sin sesión -> /login, con sesión pero sin rol -> /).
export async function getAdminUser(): Promise<User> {
  const {user, esAdmin} = await getAdminStatus();

  if (!user) redirect("/login");
  if (!esAdmin) redirect("/");

  return user;
}
