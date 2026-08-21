import type {Metadata} from "next";
import type {ReactNode} from "react";

import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "FormularioLeads",
  description: "Captá nuevos clientes.",
};

export default async function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="es">
      <body className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[#0d0d0d] font-sans antialiased">
        <header className="flex items-center justify-center px-6 py-6">
          <Link
            className="ease font-mono text-[11px] tracking-[0.25em] text-neutral-600 uppercase transition duration-200 hover:text-neutral-300"
            href="/"
          >
            FormularioLeads
          </Link>
        </header>
        {children}
        <footer className="py-8 text-center">
          <p className="font-mono text-[11px] tracking-[0.25em] text-neutral-600 uppercase">
            © 2026
          </p>
        </footer>
      </body>
    </html>
  );
}
