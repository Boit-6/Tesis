"use client";

import type {Database} from "@/types/supabase";

import {useEffect, useState} from "react";

import {Tag} from "../../dashboard-shared";
import {EsqueletoBolsa} from "../../esqueletos";

import FormPostulacion from "./form-postulacion";

import {presupuestoDeclarado} from "@/lib/presupuesto";
import {SERVICIO_LEGIBLE, URGENCIA_LEGIBLE} from "@/lib/servicios";
import {createClient} from "@/lib/supabase/client";

export type PedidoBolsa = Database["public"]["Functions"]["bolsa_abierta"]["Returns"][number];

type Pestana = "abiertos" | "postulados" | "propios";

const DIA_MS = 86_400_000;

function diasDesde(fecha: string, ahora: number) {
  return Math.floor((ahora - new Date(fecha).getTime()) / DIA_MS);
}

function textoPublicado(fecha: string, ahora: number) {
  const dias = diasDesde(fecha, ahora);

  if (dias <= 0) return "Publicado hoy";

  return dias === 1 ? "Publicado ayer" : `Publicado hace ${dias} días`;
}

function textoVence(fecha: string, ahora: number) {
  const dias = Math.ceil((new Date(fecha).getTime() - ahora) / DIA_MS);

  if (dias <= 0) return "Vencido";

  return dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
}

// En qué quedó un pedido que no está abierto, visto por quien se postuló o lo
// publicó.
function situacion(p: PedidoBolsa): {texto: string; clase: string} | null {
  if (p.estado === "ASIGNADO") {
    return p.asignado_a_mi
      ? {texto: "¡Te eligieron!", clase: "text-moss"}
      : {
          texto: p.propio ? "El cliente eligió a alguien" : "Eligieron a otro",
          clase: "text-muted",
        };
  }
  if (p.estado === "EN_ELECCION") return {texto: "El cliente está eligiendo", clase: "text-ochre"};
  if (p.estado === "VENCIDO") return {texto: "Venció sin elección", clase: "text-mist"};

  return null;
}

function TarjetaPedido({
  pedido,
  ahora,
  onPostular,
}: {
  pedido: PedidoBolsa;
  ahora: number;
  onPostular: (mensaje: string, precio: number, plazo: string) => Promise<void>;
}) {
  const [postulando, setPostulando] = useState(false);
  const estado = situacion(pedido);
  const puedePostularse = pedido.estado === "ABIERTO" && !pedido.propio && !pedido.me_postule;

  return (
    <li className="border-rule-soft bg-card flex flex-col border px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-ink font-serif text-[21px] leading-tight">
          {SERVICIO_LEGIBLE[pedido.servicio]}
        </h3>
        <span className="text-ink text-[14px]">
          {presupuestoDeclarado(pedido.presupuesto_rango, pedido.presupuesto)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        <Tag className={pedido.urgencia === "alta" ? "text-brick" : "text-ochre"}>
          {URGENCIA_LEGIBLE[pedido.urgencia]}
        </Tag>
        {pedido.propio && <Tag className="text-muted">Lo publicaste vos</Tag>}
        {pedido.me_postule && pedido.estado === "ABIERTO" && (
          <Tag className="text-moss">Te postulaste</Tag>
        )}
        {estado && <Tag className={estado.clase}>{estado.texto}</Tag>}
      </div>

      <p className="text-ink-soft mt-3 text-[14.5px] leading-relaxed whitespace-pre-line">
        {pedido.resumen}
      </p>

      <div className="text-mist mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px]">
        <span>
          {textoPublicado(pedido.publicado_en, ahora)}
          {pedido.estado === "ABIERTO" && ` · ${textoVence(pedido.vence_en, ahora)}`} ·{" "}
          {pedido.postulaciones}/{pedido.tope_postulaciones} postulaciones
        </span>
        {puedePostularse && !postulando && (
          <button
            className="ease border-ink text-ink hover:border-ochre hover:text-ochre border px-3.5 py-2 text-[11px] tracking-[0.12em] uppercase transition duration-200"
            type="button"
            onClick={() => setPostulando(true)}
          >
            Postularme
          </button>
        )}
      </div>

      {postulando && (
        <FormPostulacion
          onCancelar={() => setPostulando(false)}
          onEnviar={async (mensaje, precio, plazo) => {
            await onPostular(mensaje, precio, plazo);
            setPostulando(false);
          }}
        />
      )}
    </li>
  );
}

// Bolsa de proyectos: pedidos que otros desarrolladores no pudieron tomar.
// Todo sale de bolsa_abierta(), que no devuelve datos del cliente, y la
// postulación pasa por postularme(), que valida las reglas en la base.
export default function BolsaTablero() {
  const [supabase] = useState(() => createClient());
  const [pestana, setPestana] = useState<Pestana>("abiertos");
  // Lo que devolvió la última carga. `ahora` es la hora de esa carga: los
  // textos «hace N días» y «vence en N días» quedan fijos hasta la próxima.
  const [carga, setCarga] = useState<{
    pedidos: PedidoBolsa[];
    error: string | null;
    ahora: number;
  } | null>(null);

  // Se incrementa para volver a cargar (después de postularse).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase) return;

    // Si cambia la versión antes de que llegue la respuesta, la vieja se
    // descarta.
    let vigente = true;

    supabase.rpc("bolsa_abierta").then(({data, error: err}) => {
      if (vigente) {
        setCarga({
          pedidos: data ?? [],
          error: err ? err.message : null,
          ahora: Date.now(),
        });
      }
    });

    return () => {
      vigente = false;
    };
  }, [supabase, version]);

  if (!supabase) {
    return (
      <p className="text-brick text-[13px]" role="alert">
        Faltan las variables de Supabase.
      </p>
    );
  }

  if (carga === null) return <EsqueletoBolsa />;

  const {pedidos, error, ahora} = carga;

  const grupos: Record<Pestana, PedidoBolsa[]> = {
    abiertos: pedidos.filter((p) => p.estado === "ABIERTO" && !p.propio && !p.me_postule),
    postulados: pedidos.filter((p) => p.me_postule),
    propios: pedidos.filter((p) => p.propio),
  };
  const PESTANAS: {clave: Pestana; etiqueta: string; vacio: string}[] = [
    {
      clave: "abiertos",
      etiqueta: "Abiertos",
      vacio:
        "No hay pedidos abiertos por ahora. Cuando otro desarrollador publique uno, aparece acá.",
    },
    {
      clave: "postulados",
      etiqueta: "Mis postulaciones",
      vacio: "Todavía no te postulaste a ningún pedido.",
    },
    {
      clave: "propios",
      etiqueta: "Publicados por mí",
      vacio: "Cuando no puedas tomar un pedido, lo podés mandar acá desde su detalle.",
    },
  ];
  const actual = PESTANAS.find((p) => p.clave === pestana)!;

  async function postular(pedidoId: string, mensaje: string, precio: number, plazo: string) {
    if (!supabase) throw new Error("Faltan las variables de Supabase.");

    const {error: err} = await supabase.rpc("postularme", {
      p_pedido: pedidoId,
      p_mensaje: mensaje,
      p_precio: precio,
      p_plazo: plazo,
    });

    // El mensaje de la base ya está escrito para una persona («El pedido ya
    // no recibe postulaciones», etc.).
    if (err) throw new Error(err.message);

    setVersion((v) => v + 1);
    setPestana("postulados");
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          className="border-brick bg-brick/5 text-brick border-l-2 px-5 py-3.5 text-[13px]"
          role="alert"
        >
          {error}
        </div>
      )}

      <div
        aria-label="Pedidos"
        className="border-rule grid grid-cols-3 border-b sm:flex sm:gap-1"
        role="tablist"
      >
        {PESTANAS.map((p) => {
          const activa = pestana === p.clave;

          return (
            // En el celular la cantidad va debajo, para que entren las tres;
            // el aria-label es el mismo en todos los tamaños.
            <button
              key={p.clave}
              aria-label={`${p.etiqueta} · ${grupos[p.clave].length}`}
              aria-selected={activa}
              className={`-mb-px flex flex-col items-center gap-0.5 border-b-2 px-2 py-2.5 text-[10.5px] tracking-[0.08em] uppercase transition duration-200 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-[11px] sm:whitespace-nowrap ${
                activa ? "border-ochre text-ochre-deep" : "text-muted border-transparent"
              }`}
              role="tab"
              type="button"
              onClick={() => setPestana(p.clave)}
            >
              <span className="text-center">{p.etiqueta}</span>
              <span className="font-serif text-[16px] tracking-normal sm:font-sans sm:text-[11px]">
                <span className="hidden sm:inline">· </span>
                {grupos[p.clave].length}
              </span>
            </button>
          );
        })}
      </div>

      {grupos[pestana].length === 0 ? (
        <p className="text-muted max-w-lg text-[14px] leading-relaxed">{actual.vacio}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {grupos[pestana].map((p) => (
            <TarjetaPedido
              key={p.id}
              ahora={ahora}
              pedido={p}
              onPostular={(mensaje, precio, plazo) => postular(p.id, mensaje, precio, plazo)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
