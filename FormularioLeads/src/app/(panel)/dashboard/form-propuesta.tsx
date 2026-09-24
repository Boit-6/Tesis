"use client";

import {useState} from "react";

// Términos de una propuesta pendiente. El precio arranca vacío a propósito:
// el presupuesto que declaró el interesado se muestra como referencia en el
// detalle del lead, pero escribirlo es una decisión del profesional, no un
// valor que el sistema arrastre por omisión.
export default function FormPropuesta({
  onEnviar,
}: {
  onEnviar: (precio: number, plazo: string, alcance: string) => Promise<void>;
}) {
  const [precio, setPrecio] = useState("");
  const [plazo, setPlazo] = useState("");
  const [alcance, setAlcance] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valor = Number(precio);
  const valido = Number.isFinite(valor) && valor > 0;

  const campoClass =
    "ease border-rule bg-card text-ink placeholder-mist focus:border-ochre w-full border px-3 py-2.5 text-[14px] transition duration-200 outline-none";
  const etiquetaClass = "text-faint mb-1.5 block text-[10px] tracking-[0.16em] uppercase";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valido || enviando) return;
        setEnviando(true);
        setError(null);
        try {
          await onEnviar(valor, plazo.trim(), alcance.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo enviar la propuesta.");
        } finally {
          setEnviando(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={etiquetaClass}>Precio (USD)</span>
          <input
            className={campoClass}
            inputMode="decimal"
            placeholder="1500"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>
        <label>
          <span className={etiquetaClass}>Plazo</span>
          <input
            className={campoClass}
            placeholder="2 semanas"
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
          />
        </label>
      </div>
      <label>
        <span className={etiquetaClass}>Alcance</span>
        <textarea
          className={`${campoClass} resize-y`}
          placeholder="Qué incluye la propuesta"
          rows={3}
          value={alcance}
          onChange={(e) => setAlcance(e.target.value)}
        />
      </label>
      {error && (
        <p className="text-brick text-[13px]" role="alert">
          {error}
        </p>
      )}
      <button
        className="ease bg-ink text-paper hover:bg-ochre py-3.5 text-[11px] tracking-[0.16em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!valido || enviando}
        type="submit"
      >
        {enviando ? "Enviando…" : "Enviar propuesta"}
      </button>
      <p className="text-mist text-[12px] leading-relaxed">
        Ese precio es el que se factura cuando el cliente acepta.
      </p>
    </form>
  );
}
