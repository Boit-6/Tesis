type Variante = "exito" | "pendiente" | "fallido";

const COPIA: Record<Variante, {eyebrow: string; titulo: string; cuerpo: string; icono: string}> = {
  exito: {
    eyebrow: "Pago acreditado",
    titulo: "¡Listo, gracias!",
    cuerpo: "Registramos tu pago. Ya te avisamos al freelance para que arranque con tu proyecto.",
    icono: "✅",
  },
  pendiente: {
    eyebrow: "Pago en revisión",
    titulo: "Lo estamos procesando.",
    cuerpo:
      "MercadoPago todavía está confirmando el pago (algunos medios tardan un poco). Te avisamos por email en cuanto se acredite.",
    icono: "⏳",
  },
  fallido: {
    eyebrow: "Pago no procesado",
    titulo: "Algo no salió bien.",
    cuerpo:
      "El pago no se pudo completar. Podés volver a intentarlo desde el link de la factura que te llegó por email.",
    icono: "⚠️",
  },
};

export default function PagoResultado({
  variante,
  facturaId,
}: {
  variante: Variante;
  facturaId?: string;
}) {
  const {eyebrow, titulo, cuerpo, icono} = COPIA[variante];

  return (
    <div className="mb-14 border-b border-neutral-800 pb-12 text-center">
      <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-amber-500 uppercase">
        {eyebrow}
      </p>
      <div className="mb-6 text-5xl">{icono}</div>
      <h1 className="text-[clamp(2.4rem,7vw,4rem)] leading-[0.9] font-black tracking-tight text-neutral-100">
        {titulo}
      </h1>
      <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-neutral-500">{cuerpo}</p>
      {facturaId ? (
        <p className="mt-6 font-mono text-[11px] tracking-[0.2em] text-neutral-700 uppercase">
          Factura {facturaId}
        </p>
      ) : null}
    </div>
  );
}
