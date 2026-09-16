import Link from "next/link";

import TicketsBoard from "./tickets-board";

import {getAdminUser} from "@/lib/auth";

// Sin esto, Next.js puede prerenderizar esta página como estática: si
// createClient() devuelve null (env vars de Supabase ausentes en build), la
// verificación de sesión nunca llega a llamar cookies() y no hay ninguna
// señal que fuerce el render dinámico. El gate de admin tiene que correr en
// cada request, no una sola vez al buildear.
export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  await getAdminUser();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-8 pb-20 sm:px-10">
      <div className="border-rule mb-12 flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div>
          <p className="text-ochre mb-4 text-[10px] tracking-[0.22em] uppercase">Panel interno</p>
          <h1 className="text-ink font-serif text-[clamp(2.6rem,6vw,3.25rem)] leading-none tracking-tight">
            Tickets<span className="text-ochre">.</span>
          </h1>
        </div>

        <Link
          className="ease text-muted hover:text-ochre text-[11px] tracking-[0.14em] uppercase transition duration-200"
          href="/dashboard"
        >
          ← Dashboard
        </Link>
      </div>

      <TicketsBoard />
    </main>
  );
}
