import LeadForm from "./components/lead-form";

export default function HomePage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-12 px-6 pt-10 pb-20 sm:px-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
      <div>
        <p className="text-ochre mb-5 text-[10px] tracking-[0.22em] uppercase">Nueva consulta</p>
        <h1 className="text-ink font-serif text-[clamp(2.6rem,6vw,3.2rem)] leading-[1.03] tracking-tight text-pretty">
          Hablemos de tu <em>próximo</em> proyecto.
        </h1>
        <div className="bg-rule-soft my-7 h-px" />
        <p className="text-muted text-[15px] leading-relaxed">
          Completá el formulario y te respondemos en menos de 24&nbsp;horas.
        </p>
        <div className="text-ochre mt-6 flex items-center gap-2">
          <svg
            fill="none"
            height={15}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.4}
            viewBox="0 0 24 24"
            width={15}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 1.8" />
          </svg>
          <span className="text-[13px]">Respuesta en menos de 24 horas</span>
        </div>
      </div>

      <LeadForm />
    </main>
  );
}
