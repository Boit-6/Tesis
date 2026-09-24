"use client";

import type {Database} from "@/types/supabase";

import {useCallback, useEffect, useState} from "react";

import {SectionHeader, formatDate} from "./dashboard-shared";

import {createClient} from "@/lib/supabase/client";

type Aviso = Database["public"]["Tables"]["avisos"]["Row"];

const MAX_AVISOS = 8;

// El mensaje viene armado para Telegram (HTML con <b> y saltos de línea, con
// los datos del cliente ya escapados). Acá se muestra como texto: se sacan las
// etiquetas y se decodifican las entidades, y React lo vuelve a escapar.
export function textoDeAviso(mensaje: string) {
  return mensaje
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Avisos del espacio que todavía no se leyeron. Los mismos que le llegan al
// desarrollador por correo (los que piden una acción) o por Telegram.
export default function AvisosPanel() {
  const [supabase] = useState(() => createClient());
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [marcando, setMarcando] = useState(false);

  const cargar = useCallback(async () => {
    if (!supabase) return;

    const {data} = await supabase
      .from("avisos")
      .select("*")
      .is("leido_en", null)
      .order("creado_en", {ascending: false})
      .limit(MAX_AVISOS);

    setAvisos(data ?? []);
  }, [supabase]);

  useEffect(() => {
    cargar();

    if (!supabase) return;

    const client = supabase;
    // La RLS filtra los eventos: sólo llegan los del espacio propio.
    const channel = client
      .channel("avisos-rt")
      .on("postgres_changes", {event: "INSERT", schema: "public", table: "avisos"}, () => cargar())
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [cargar, supabase]);

  async function marcarLeidos() {
    if (!supabase || !avisos.length) return;

    setMarcando(true);
    try {
      await supabase
        .from("avisos")
        .update({leido_en: new Date().toISOString()})
        .in(
          "id",
          avisos.map((a) => a.id),
        );
      await cargar();
    } finally {
      setMarcando(false);
    }
  }

  if (!avisos.length) return null;

  return (
    <section aria-label="Avisos" className="mb-14">
      <SectionHeader num="!" title={`Avisos sin leer (${avisos.length})`} />
      <ul className="border-rule-soft bg-card divide-rule-soft divide-y border">
        {avisos.map((a) => (
          <li
            key={a.id}
            className={`px-6 py-4 text-[13.5px] leading-relaxed whitespace-pre-line ${
              a.nivel === "atencion" || a.nivel === "critico" ? "border-l-ochre border-l-2" : ""
            }`}
          >
            <span className="text-faint mr-3 text-[11px]">{formatDate(a.creado_en)}</span>
            {textoDeAviso(a.mensaje)}
          </li>
        ))}
      </ul>
      <button
        className="ease text-muted hover:text-ochre mt-4 text-[11px] tracking-[0.14em] uppercase transition duration-200 disabled:opacity-40"
        disabled={marcando}
        type="button"
        onClick={marcarLeidos}
      >
        {marcando ? "Marcando..." : "Marcar como leídos"}
      </button>
    </section>
  );
}
