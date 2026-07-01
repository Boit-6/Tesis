import {createServerClient} from "@supabase/ssr";
import {NextResponse, type NextRequest} from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Rutas internas que requieren sesión. Agregar acá para proteger más rutas.
const PROTECTED_ROUTES = ["/dashboard"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({request});

  // Si faltan las env vars dejamos pasar el request tal cual: el consumidor final
  // (páginas/componentes) ya muestra un aviso claro cuando `supabase` es null.
  if (!supabaseUrl || !supabaseAnonKey) return supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const {name, value} of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({request});

        for (const {name, value, options} of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // No usar getSession() acá: getUser() revalida el token contra Supabase Auth en
  // vez de confiar en la cookie tal cual.
  const {
    data: {user},
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
