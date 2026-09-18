import type {EmailOtpType} from "@supabase/supabase-js";

import {NextResponse, type NextRequest} from "next/server";

import {createClient} from "@/lib/supabase/server";

// Evita el open redirect: `new URL(next, origin)` resuelve tal cual una URL
// absoluta en `next` (ignora `origin` como base), así que hay que comparar el
// origin resultante explícitamente en vez de confiar en el prefijo del string.
export function redirectSeguro(valor: string, origin: string): URL {
  try {
    const resuelta = new URL(valor, origin);

    return resuelta.origin === origin ? resuelta : new URL("/dashboard", origin);
  } catch {
    return new URL("/dashboard", origin);
  }
}

// Maneja el link de confirmación de email que Supabase envía en el registro
// (`emailRedirectTo: /auth/confirm`). Ver src/app/register/register-form.tsx.
export async function GET(request: NextRequest) {
  const {searchParams, origin} = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();

    if (supabase) {
      const {error} = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (!error) return NextResponse.redirect(redirectSeguro(next, origin));
    }
  }

  const errorUrl = new URL("/login", origin);

  errorUrl.searchParams.set("error", "No pudimos confirmar el email. Probá iniciar sesión.");

  return NextResponse.redirect(errorUrl);
}
