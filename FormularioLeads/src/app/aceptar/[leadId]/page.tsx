import AceptarPropuesta from "./aceptar-propuesta";

export default async function AceptarPage({
  params,
  searchParams,
}: {
  params: Promise<{leadId: string}>;
  searchParams: Promise<{token?: string}>;
}) {
  const {leadId} = await params;
  const {token} = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-6 pb-20">
      <div className="mb-14 border-b border-neutral-800 pb-12 text-center">
        <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-amber-500 uppercase">
          Aceptar propuesta
        </p>
        <h1 className="text-[clamp(2.4rem,7vw,4rem)] leading-[0.9] font-black tracking-tight text-neutral-100">
          Confirmá tu
          <br />
          propuesta.
        </h1>
      </div>

      <AceptarPropuesta leadId={leadId} token={token ?? ""} />
    </main>
  );
}
