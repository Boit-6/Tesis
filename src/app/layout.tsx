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

export const metadata: Metadata = {
  title: "FormularioLeads",
  description: "Captá nuevos clientes.",
};

export default async function RootLayout({children}: {children: ReactNode}) {
  return (
    <html className={`${instrumentSans.variable} ${instrumentSerif.variable}`} lang="es">
      <body className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-paper font-sans text-ink antialiased">
        <header className="flex items-center justify-between gap-4 px-6 py-7 sm:px-10">
          <Link
            className="font-serif text-[19px] tracking-tight text-ink transition duration-200 hover:text-ochre"
            href="/"
          >
            FormularioLeads
          </Link>
          <span className="text-[10px] tracking-[0.2em] text-faint uppercase">Consultas · 2026</span>
        </header>
        {children}
        <footer className="px-6 py-10 text-center sm:px-10">
          <p className="text-[10px] tracking-[0.2em] text-mist uppercase">© 2026</p>
        </footer>
      </body>
    </html>
  );
}
