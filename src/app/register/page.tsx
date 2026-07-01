import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md px-6 pt-6 pb-20">
      <div className="mb-14 border-b border-neutral-800 pb-12">
        <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-amber-500 uppercase">
          Panel interno
        </p>
        <h1 className="text-[clamp(2.4rem,7vw,4rem)] leading-[0.9] font-black tracking-tight text-neutral-100">
          Crear cuenta.
        </h1>
      </div>

      <RegisterForm />
    </main>
  );
}
