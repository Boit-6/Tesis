import PagoResultado from "../components/pago-resultado";

export default async function PagoFallidoPage({
  searchParams,
}: {
  searchParams: Promise<{external_reference?: string}>;
}) {
  const {external_reference} = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pt-6 pb-20">
      <PagoResultado facturaId={external_reference} variante="fallido" />
    </main>
  );
}
