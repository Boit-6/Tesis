import LeadForm from "./components/lead-form";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-20 pt-6">
      <div className="mb-14 border-b border-neutral-800 pb-12 text-center">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-amber-500">
          Nueva consulta
        </p>
        <h1 className="text-[clamp(2.4rem,7vw,4rem)] font-black leading-[0.9] tracking-tight text-neutral-100">
          Hablemos de tu<br />próximo proyecto.
        </h1>
        <p className="mx-auto mt-6 max-w-xs text-sm leading-relaxed text-neutral-500">
          Completá el formulario y te respondemos en menos de 24&nbsp;horas.
        </p>
      </div>

      <LeadForm />
    </main>
  );
}
