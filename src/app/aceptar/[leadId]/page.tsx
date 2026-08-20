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
    <main className="mx-auto w-full max-w-2xl px-6 pt-10 pb-20 sm:px-10">
      <div className="mb-10 border-b border-rule pb-8">
        <p className="mb-4 text-[10px] tracking-[0.22em] text-ochre uppercase">Aceptar propuesta</p>
        <h1 className="font-serif text-[clamp(2.4rem,6vw,3rem)] leading-[1.03] tracking-tight text-ink">
          Confirmá tu propuesta.
        </h1>
      </div>

      <AceptarPropuesta leadId={leadId} token={token ?? ""} />
    </main>
  );
}
