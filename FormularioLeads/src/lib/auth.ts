import type {User} from "@supabase/supabase-js";

import {redirect} from "next/navigation";
import {NextResponse} from "next/server";

import {createClient} from "@/lib/supabase/server";

// El espacio del desarrollador: la plataforma es compartida y cada cuenta
// confirmada tiene uno (lo crea la base al confirmar el correo).
export interface Espacio {
  id: string;
  slug: string;
  nombre: string;
  // A dónde le llegan las respuestas de los clientes (Reply-To).
  email_contacto: string | null;
  // NULL hasta que el dueño elige nombre y dirección (alta).
  configurado_en: string | null;
}

export interface EstadoPanel {
  user: User | null;
  espacio: Espacio | null;
  supabaseDisponible: boolean;
}

// Núcleo compartido de la compuerta del panel: sesión + un espacio propio.
// Hasta el 23-sep-2026 se exigía profiles.role === 'admin'; ese rol quedó para
// el administrador de la plataforma y no da acceso a los datos de nadie.
// No redirige ni responde nada — cada consumidor decide cómo comunicar el
// resultado (una Server Component redirige, un route handler responde JSON).
export async function getPanelStatus(): Promise<EstadoPanel> {
  const supabase = await createClient();

  if (!supabase) return {user: null, espacio: null, supabaseDisponible: false};

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) return {user: null, espacio: null, supabaseDisponible: true};

  const {data: espacio} = await supabase
    .from("espacios")
    .select("id, slug, nombre, email_contacto, configurado_en")
    .eq("dueno_id", user.id)
    .maybeSingle();

  return {user, espacio: espacio ?? null, supabaseDisponible: true};
}

// Compuerta de las páginas del panel: exige sesión + espacio, o redirige (sin
// sesión -> /login; con sesión pero sin espacio, que es una cuenta sin
// confirmar -> /).
export async function getPanelUser(): Promise<{
  user: User;
  espacio: Espacio;
}> {
  const {user, espacio} = await getPanelStatus();

  if (!user) redirect("/login");
  if (!espacio) redirect("/");

  return {user, espacio};
}

// Compuerta de los route handlers: no pasan por el gate de /dashboard, así que
// cada uno revalida sesión + espacio por su cuenta. La RLS vuelve a exigir el
// espacio del lado de la base.
export async function requirePanel() {
  const {user, espacio, supabaseDisponible} = await getPanelStatus();

  if (!supabaseDisponible) {
    return NextResponse.json(
      {ok: false, error: "Faltan las variables de Supabase en el servidor."},
      {status: 500},
    );
  }

  if (!user) return NextResponse.json({ok: false, error: "No autenticado."}, {status: 401});

  if (!espacio) {
    return NextResponse.json({ok: false, error: "La cuenta no tiene un espacio."}, {status: 403});
  }

  return null;
}
