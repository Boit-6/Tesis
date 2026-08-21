import PagoResultado from "../components/pago-resultado";

export default async function PagoExitosoPage({
  searchParams,
}: {
  searchParams: Promise<{external_reference?: string}>;
}) {
  const {external_reference} = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-10 pb-20 sm:px-10">
      <PagoResultado facturaId={external_reference} variante="exito" />
    </main>
  );
}
