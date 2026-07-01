export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-20 pt-6">
      <div className="mb-14 border-b border-neutral-800 pb-12">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-amber-500">
          Panel interno
        </p>
        <h1 className="text-[clamp(2.4rem,7vw,4rem)] font-black leading-[0.9] tracking-tight text-neutral-100">
          Dashboard.
        </h1>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        Cargando datos…
      </p>
    </main>
  );
}
