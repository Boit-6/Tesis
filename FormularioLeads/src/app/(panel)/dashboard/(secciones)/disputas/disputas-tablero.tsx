"use client";

import type {OpcionDisputa} from "@/lib/hitos";
import type {Database, DisputaDetalle} from "@/types/supabase";

import {useEffect, useState} from "react";

import {EsqueletoBolsa} from "../../esqueletos";

import {ghostButtonClass} from "@/lib/constants";
import {COLOR_HITO, ESTADO_HITO, EVENTO_HITO, repartoDisputa, usd} from "@/lib/hitos";
import {SERVICIO_LEGIBLE} from "@/lib/servicios";
import {createClient} from "@/lib/supabase/client";

type Abierta = Database["public"]["Functions"]["disputas_abiertas"]["Returns"][number];
type Resuelta = Database["public"]["Functions"]["disputas_resueltas"]["Returns"][number];
type Pestana = "abiertas" | "resueltas";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const tarjetaClass = "border-rule-soft bg-card border";
const campoClass =
  "ease border-rule bg-card text-ink placeholder-mist focus:border-ochre w-full border px-3 py-2.5 text-[14px] transition duration-200 outline-none";
const primarioClass =
  "ease bg-ink text-paper hover:bg-ochre px-4 py-2.5 text-[11px] tracking-[0.14em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40";
const rotuloClass = "text-faint mb-2 text-[10px] tracking-[0.16em] uppercase";

const OPCIONES: {clave: OpcionDisputa; etiqueta: string}[] = [
  {clave: "liberar", etiqueta: "Liberar todo al desarrollador"},
  {clave: "reembolsar", etiqueta: "Reembolsar todo al cliente"},
  {clave: "partir", etiqueta: "Partir"},
];

// Una cita de lo que dijo cada parte.
function Cita({
  quien,
  texto,
  cuando,
  vacio = "Sin nota.",
}: {
  quien: string;
  texto: string | null;
  cuando?: string | null;
  vacio?: string;
}) {
  return (
    <div>
      <p className={rotuloClass}>
        {quien}
        {cuando && ` · ${fecha(cuando)}`}
      </p>
      <p className="text-ink-soft border-rule border-l-2 pl-3 text-[14px] leading-relaxed whitespace-pre-wrap">
        {texto || <span className="text-mist">{vacio}</span>}
      </p>
    </div>
  );
}

// El formulario para decidir: una de las tres opciones, la nota que les
// llega a las dos partes y una confirmación, porque mueve plata.
function FormResolver({detalle, onResuelta}: {detalle: DisputaDetalle; onResuelta: () => void}) {
  const [supabase] = useState(() => createClient());
  const [opcion, setOpcion] = useState<OpcionDisputa | null>(null);
  const [parte, setParte] = useState("");
  const [nota, setNota] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {hito} = detalle;
  const reparto = opcion ? repartoDisputa(opcion, parte, hito.monto) : null;
  const comision = reparto ? Math.round(reparto.liberar * hito.comision_porcentaje) / 100 : 0;
  const listo = reparto !== null && nota.trim().length >= 5;

  async function resolver() {
    if (!supabase || !reparto) return;
    setEnviando(true);
    setError(null);
    const {error: err} = await supabase.rpc("resolver_disputa", {
      p_hito: hito.id,
      p_liberar: reparto.liberar,
      p_nota: nota.trim(),
    });

    setEnviando(false);
    if (err) {
      setError(err.message);
      setConfirmando(false);

      return;
    }
    onResuelta();
  }

  return (
    <div className="border-rule flex flex-col gap-4 border-t pt-5">
      <p className={rotuloClass}>Resolver</p>
      <fieldset className="flex flex-col gap-2.5 text-[14px]" disabled={confirmando}>
        <legend className="sr-only">Cómo se reparte el monto</legend>
        {OPCIONES.map((o) => (
          <label key={o.clave} className="text-ink-soft flex cursor-pointer items-center gap-2.5">
            <input
              checked={opcion === o.clave}
              className="accent-ochre"
              name={`opcion-${hito.id}`}
              type="radio"
              onChange={() => setOpcion(o.clave)}
            />
            {o.etiqueta}
          </label>
        ))}
        {opcion === "partir" && (
          <label className="text-muted flex flex-col gap-1.5 pl-6 text-[13px]">
            Para el desarrollador (entre 0 y {usd(hito.monto)})
            <input
              className={`${campoClass} max-w-40 tabular-nums`}
              inputMode="decimal"
              placeholder="250,00"
              value={parte}
              onChange={(e) => setParte(e.target.value)}
            />
          </label>
        )}
      </fieldset>

      {reparto && (
        <p className="text-ink-soft text-[13px] leading-relaxed">
          Al desarrollador: <strong className="text-ink">{usd(reparto.liberar)}</strong>
          {reparto.liberar > 0 &&
            ` (le llegan ${usd(reparto.liberar - comision)}, menos ${hito.comision_porcentaje}% de comisión)`}
          . Vuelve al cliente: <strong className="text-ink">{usd(reparto.reembolsar)}</strong>.
        </p>
      )}
      {opcion === "partir" && parte.trim() !== "" && !reparto && (
        <p className="text-brick text-[13px]">
          Tiene que ser más de 0 y menos que {usd(hito.monto)}, con hasta dos decimales.
        </p>
      )}

      <textarea
        aria-label="Por qué se resuelve así"
        className={`${campoClass} resize-y`}
        disabled={confirmando}
        maxLength={2000}
        placeholder="Por qué se resuelve así: les llega a las dos partes"
        rows={3}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />

      {!confirmando ? (
        <div>
          <button
            className={primarioClass}
            disabled={!listo}
            type="button"
            onClick={() => setConfirmando(true)}
          >
            Resolver
          </button>
        </div>
      ) : (
        <div className="border-brick/40 flex flex-col gap-3 border-l-2 pl-3 text-[14px]">
          <p className="text-ink-soft">
            ¿Confirmás? Se mueve la plata en Stripe y no se puede deshacer.
          </p>
          <div className="flex gap-4">
            <button
              className="ease bg-brick text-paper px-4 py-2.5 text-[11px] tracking-[0.14em] uppercase transition duration-200 hover:opacity-90 disabled:opacity-40"
              disabled={enviando}
              type="button"
              onClick={resolver}
            >
              {enviando ? "Resolviendo…" : "Sí, resolver"}
            </button>
            <button
              className={ghostButtonClass}
              disabled={enviando}
              type="button"
              onClick={() => setConfirmando(false)}
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-brick text-[13px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Lo que se abre al revisar una disputa: los otros hitos, la línea de
// tiempo, la conversación y, si sigue abierta, el formulario.
function Detalle({hitoId, onResuelta}: {hitoId: string; onResuelta: () => void}) {
  const [supabase] = useState(() => createClient());
  const [detalle, setDetalle] = useState<DisputaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let vigente = true;

    supabase.rpc("disputa_detalle", {p_hito: hitoId}).then(({data, error: err}) => {
      if (!vigente) return;
      if (err) setError(err.message);
      else setDetalle(data);
    });

    return () => {
      vigente = false;
    };
  }, [supabase, hitoId]);

  if (error) {
    return (
      <p className="text-brick text-[13px]" role="alert">
        {error}
      </p>
    );
  }
  if (!detalle) return <p className="text-muted text-[13px]">Cargando el detalle…</p>;

  const {proyecto, eventos, mensajes} = detalle;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={rotuloClass}>
          Hitos del proyecto ·{" "}
          {proyecto.de_plataforma ? "llegó por la plataforma" : "cliente propio"}
        </p>
        <ol className="border-rule-soft divide-rule-soft divide-y border-y text-[13px]">
          {proyecto.hitos.map((h) => (
            <li
              key={h.orden}
              className={`flex items-baseline gap-3 py-2 ${h.orden === detalle.hito.orden ? "bg-ochre/5" : ""}`}
            >
              <span className="text-mist w-4 text-right tabular-nums">{h.orden}.</span>
              <span className="text-ink-soft flex-1">{h.titulo}</span>
              <span className={`text-[10.5px] tracking-[0.08em] uppercase ${COLOR_HITO[h.estado]}`}>
                {ESTADO_HITO[h.estado]}
              </span>
              <span className="text-ink tabular-nums">{usd(h.monto)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className={rotuloClass}>Historial del hito</p>
        <ol className="flex flex-col gap-2 text-[13px]">
          {eventos.map((ev, i) => (
            <li key={i} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <span className="text-faint w-32 shrink-0 tabular-nums">{fecha(ev.creado_en)}</span>
              <span className="text-ink-soft">
                {EVENTO_HITO[ev.tipo]}
                {ev.detalle && <span className="text-muted"> — «{ev.detalle}»</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className={rotuloClass}>Conversación entre las partes</p>
        {mensajes.length === 0 ? (
          <p className="text-muted text-[13px]">
            {proyecto.de_plataforma
              ? "No se escribieron mensajes en la plataforma."
              : "Es un cliente propio: no hay conversación en la plataforma."}
          </p>
        ) : (
          <ol className="border-rule-soft flex max-h-80 flex-col gap-3 overflow-y-auto border p-4 text-[13px]">
            {mensajes.map((m, i) => (
              <li key={i} className={m.autor === "cliente" ? "pr-8" : "pl-8 text-right"}>
                <p className="text-faint text-[11px]">
                  {m.autor === "cliente" ? proyecto.cliente_nombre : proyecto.espacio_nombre} ·{" "}
                  {fecha(m.creado_en)}
                </p>
                <p className="text-ink-soft leading-relaxed whitespace-pre-wrap">{m.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {detalle.hito.estado === "EN_DISPUTA" &&
        (detalle.puede_resolver ? (
          <FormResolver detalle={detalle} onResuelta={onResuelta} />
        ) : (
          <p className="text-brick border-rule border-t pt-5 text-[13px]">
            Es un proyecto tuyo: no podés resolver esta disputa. Como desarrollador, podés
            devolverle la plata al cliente desde el detalle del lead.
          </p>
        ))}
    </div>
  );
}

function TarjetaAbierta({disputa, onResuelta}: {disputa: Abierta; onResuelta: () => void}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <li className={`${tarjetaClass} flex flex-col gap-5 px-5 py-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-ink font-serif text-[20px] leading-tight">{disputa.titulo}</h2>
        <span className="text-ink font-serif text-[20px] tabular-nums">{usd(disputa.monto)}</span>
      </div>
      <p className="text-muted -mt-3 text-[12.5px]">
        {disputa.espacio_nombre} ↔ {disputa.cliente_nombre} · {SERVICIO_LEGIBLE[disputa.servicio]} ·{" "}
        {disputa.lead_id}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Cita
          cuando={disputa.disputa_abierta_en}
          quien={`Motivo de ${disputa.cliente_nombre}`}
          texto={disputa.disputa_motivo}
        />
        <Cita
          quien={`Entrega de ${disputa.espacio_nombre}`}
          texto={disputa.entrega_nota}
          vacio="No lo marcó como entregado."
        />
      </div>

      {abierta ? (
        <Detalle hitoId={disputa.id} onResuelta={onResuelta} />
      ) : (
        <div>
          <button className={primarioClass} type="button" onClick={() => setAbierta(true)}>
            Revisar y resolver
          </button>
        </div>
      )}
    </li>
  );
}

function TarjetaResuelta({disputa}: {disputa: Resuelta}) {
  const [abierta, setAbierta] = useState(false);
  const movido =
    (disputa.monto_liberado === 0 || disputa.transferido_en) &&
    (disputa.monto_reembolsado === 0 || disputa.reembolsado_en);

  return (
    <li className={`${tarjetaClass} flex flex-col gap-4 px-5 py-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-ink font-serif text-[18px] leading-tight">{disputa.titulo}</h2>
        <span className="text-faint text-[12px]">{fecha(disputa.cerrado_en)}</span>
      </div>
      <p className="text-muted -mt-2 text-[12.5px]">
        {disputa.espacio_nombre} ↔ {disputa.cliente_nombre} · {disputa.lead_id}
      </p>
      <p className="text-ink-soft text-[13.5px] leading-relaxed">
        {disputa.cierre === "devuelto"
          ? "La cerró el desarrollador devolviendo la plata."
          : `Resuelta por ${disputa.resuelto_por ?? "la plataforma"}.`}{" "}
        <span className="text-moss">{usd(disputa.monto_liberado)} al desarrollador</span> ·{" "}
        <span className="text-ochre-deep">{usd(disputa.monto_reembolsado)} al cliente</span>
        {" · "}
        <span className="text-faint">
          {movido ? "Ya se movió en Stripe" : "Pendiente de mover en Stripe"}
        </span>
      </p>
      {disputa.resolucion_nota && (
        <Cita quien="Nota de la resolución" texto={disputa.resolucion_nota} />
      )}
      {abierta ? (
        <Detalle hitoId={disputa.id} onResuelta={() => undefined} />
      ) : (
        <div>
          <button className={ghostButtonClass} type="button" onClick={() => setAbierta(true)}>
            Ver historial y conversación
          </button>
        </div>
      )}
    </li>
  );
}

// Las disputas de los hitos, para el admin de la plataforma: las abiertas,
// con todo lo que hace falta para decidir, y las ya resueltas.
export default function DisputasTablero() {
  const [supabase] = useState(() => createClient());
  const [abiertas, setAbiertas] = useState<Abierta[] | null>(null);
  const [resueltas, setResueltas] = useState<Resuelta[]>([]);
  const [pestana, setPestana] = useState<Pestana>("abiertas");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let vigente = true;

    Promise.all([supabase.rpc("disputas_abiertas"), supabase.rpc("disputas_resueltas")]).then(
      ([a, r]) => {
        if (!vigente) return;
        setError(a.error?.message ?? r.error?.message ?? null);
        setAbiertas(a.data ?? []);
        setResueltas(r.data ?? []);
      },
    );

    return () => {
      vigente = false;
    };
  }, [supabase, version]);

  if (abiertas === null) return <EsqueletoBolsa />;

  const grupos = {abiertas, resueltas};
  const PESTANAS: {clave: Pestana; etiqueta: string; vacio: string}[] = [
    {
      clave: "abiertas",
      etiqueta: "Abiertas",
      vacio: "No hay disputas abiertas.",
    },
    {
      clave: "resueltas",
      etiqueta: "Resueltas",
      vacio: "Todavía no se resolvió ninguna disputa.",
    },
  ];
  const actual = PESTANAS.find((p) => p.clave === pestana)!;

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

      <div aria-label="Disputas" className="border-rule flex gap-1 border-b" role="tablist">
        {PESTANAS.map((p) => {
          const activa = pestana === p.clave;

          return (
            <button
              key={p.clave}
              aria-selected={activa}
              className={`-mb-px border-b-2 px-3 py-2.5 text-[11px] tracking-[0.08em] whitespace-nowrap uppercase transition duration-200 ${
                activa ? "border-ochre text-ochre-deep" : "text-muted border-transparent"
              }`}
              role="tab"
              type="button"
              onClick={() => setPestana(p.clave)}
            >
              {p.etiqueta} · {grupos[p.clave].length}
            </button>
          );
        })}
      </div>

      {grupos[pestana].length === 0 ? (
        <p className="text-muted text-[14px]">{actual.vacio}</p>
      ) : pestana === "abiertas" ? (
        <ul className="flex flex-col gap-5">
          {abiertas.map((d) => (
            <TarjetaAbierta
              key={d.id}
              disputa={d}
              onResuelta={() => {
                setVersion((v) => v + 1);
                setPestana("resueltas");
              }}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-4">
          {resueltas.map((d) => (
            <TarjetaResuelta key={d.id} disputa={d} />
          ))}
        </ul>
      )}
    </div>
  );
}
