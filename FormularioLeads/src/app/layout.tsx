import type {Metadata} from "next";
import type {ReactNode} from "react";

import {Instrument_Sans, Instrument_Serif} from "next/font/google";
import Link from "next/link";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FormularioLeads",
  description: "Captá nuevos clientes.",
  openGraph: {
    title: "FormularioLeads",
    description: "Captá nuevos clientes.",
    url: SITE_URL,
    siteName: "FormularioLeads",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FormularioLeads",
    description: "Captá nuevos clientes.",
  },
};

export default async function RootLayout({children}: {children: ReactNode}) {
  return (
    <html className={`${instrumentSans.variable} ${instrumentSerif.variable}`} lang="es">
      <body className="bg-paper text-ink grid min-h-screen grid-rows-[auto_1fr_auto] font-sans antialiased">
        <a
          className="focus:bg-ink focus:text-paper sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:text-[12px] focus:tracking-[0.1em] focus:uppercase"
          href="#contenido"
        >
          Saltar al contenido
        </a>
        <header className="flex items-center justify-between gap-4 px-6 py-7 sm:px-10">
          <Link
            className="text-ink hover:text-ochre font-serif text-[19px] tracking-tight transition duration-200"
            href="/"
          >
            FormularioLeads
          </Link>
          <span className="text-faint text-[10px] tracking-[0.2em] uppercase">
            Consultas · 2026
          </span>
        </header>
        <div id="contenido">{children}</div>
        <footer className="px-6 py-10 text-center sm:px-10">
          <p className="text-mist text-[10px] tracking-[0.2em] uppercase">© 2026</p>
        </footer>
      </body>
    </html>
  );
}
