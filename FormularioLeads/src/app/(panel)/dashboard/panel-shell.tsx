"use client";

import type {ReactNode} from "react";

import Link from "next/link";
import {usePathname} from "next/navigation";

const SECCIONES = [
  {
    href: "/dashboard",
    etiqueta: "Inicio",
    icono: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  },
  {
    href: "/dashboard/leads",
    etiqueta: "Leads",
    icono:
      "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8",
  },
  {
    href: "/dashboard/facturas",
    etiqueta: "Facturas",
    icono: "M7 3.5h7.5L19 8v12.5H7zM14 3.5V8h5M10 12.5h6M10 16h6",
  },
  {
    href: "/dashboard/trabajos",
    etiqueta: "Trabajos",
    icono: "M4 8h16v11H4zM9 8V5.5h6V8M4 13h16",
  },
  {
    href: "/dashboard/bolsa",
    etiqueta: "Bolsa",
    icono: "M4 13.5 6.5 6h11l2.5 7.5M4 13.5V19h16v-5.5M4 13.5h4.5l1 2h5l1-2H20",
  },
  {
    href: "/dashboard/tickets",
    etiqueta: "Tickets",
    icono: "M4.5 5h4v14h-4zM10 5h4v9h-4zM15.5 5h4v6h-4z",
  },
];

function Icono({d}: {d: string}) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height={20}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
      viewBox="0 0 24 24"
      width={20}
    >
      <path d={d} />
    </svg>
  );
}

function esActiva(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

const enlaceSecundario = "text-muted hover:text-ochre text-[12.5px] transition duration-200";

// Enlaces de la cuenta: en el menú lateral (PC) y en el desplegable del
// encabezado (celular).
function EnlacesCuenta({slug, email}: {slug: string; email: string}) {
  return (
    <>
      <Link className={enlaceSecundario} href={`/f/${slug}`} target="_blank">
        Tu formulario ↗
      </Link>
      <Link className={enlaceSecundario} href="/dashboard/espacio">
        Tu espacio
      </Link>
      <span className="text-faint truncate text-[12px]">{email}</span>
      <form action="/auth/signout" method="post">
        <button className={enlaceSecundario} type="submit">
          Salir
        </button>
      </form>
    </>
  );
}

// `configurado`: una cuenta recién confirmada todavía no eligió nombre ni
// dirección. Hasta entonces el panel no tiene secciones que mostrar (las
// manda a /dashboard/espacio), así que se esconde la navegación.
export default function PanelShell({
  espacio,
  email,
  configurado,
  children,
}: {
  espacio: {nombre: string; slug: string};
  email: string;
  configurado: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-rule-soft bg-card sticky top-0 hidden h-screen flex-col border-r px-5 py-7 lg:flex">
        <Link className="px-3" href="/dashboard">
          <span className="text-ink block truncate font-serif text-[21px] leading-tight tracking-tight">
            {espacio.nombre}
          </span>
          <span className="text-faint text-[10px] tracking-[0.2em] uppercase">Panel</span>
        </Link>

        {configurado && (
          <nav aria-label="Secciones del panel" className="mt-10 flex flex-col gap-1">
            {SECCIONES.map((s) => {
              const activa = esActiva(pathname, s.href);

              return (
                <Link
                  key={s.href}
                  aria-current={activa ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[14px] transition duration-200 ${
                    activa ? "bg-ochre/8 text-ochre-deep" : "text-ink-soft hover:text-ochre"
                  }`}
                  href={s.href}
                >
                  <Icono d={s.icono} />
                  {s.etiqueta}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="border-rule-soft mt-auto flex flex-col items-start gap-2.5 border-t px-3 pt-6">
          <EnlacesCuenta email={email} slug={espacio.slug} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-rule-soft flex items-center justify-between gap-4 border-b px-5 py-4 lg:hidden">
          <Link
            className="text-ink truncate font-serif text-[19px] tracking-tight"
            href="/dashboard"
          >
            {espacio.nombre}
          </Link>
          {/* key: se vuelve a montar (cerrado) al cambiar de página. */}
          <details key={pathname} className="relative">
            <summary className="text-ink-soft hover:text-ochre cursor-pointer list-none px-2 py-1 text-[11px] tracking-[0.16em] uppercase [&::-webkit-details-marker]:hidden">
              Cuenta
            </summary>
            <div className="border-rule-soft bg-card absolute right-0 z-30 mt-2 flex w-60 flex-col items-start gap-3 border p-5 shadow-[0_12px_32px_-18px_rgba(25,23,19,0.35)]">
              <EnlacesCuenta email={email} slug={espacio.slug} />
            </div>
          </details>
        </header>

        <main
          className="mx-auto w-full max-w-6xl px-5 pt-8 pb-28 sm:px-10 lg:pt-12 lg:pb-20"
          id="contenido"
        >
          {children}
        </main>
      </div>

      {configurado && (
        <nav
          aria-label="Secciones del panel"
          className="border-rule-soft bg-card fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {SECCIONES.map((s) => {
            const activa = esActiva(pathname, s.href);

            return (
              <Link
                key={s.href}
                aria-current={activa ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] transition duration-200 ${
                  activa ? "text-ochre-deep" : "text-muted"
                }`}
                href={s.href}
              >
                <Icono d={s.icono} />
                {s.etiqueta}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
