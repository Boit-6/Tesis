import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-6 pt-10 pb-20 sm:px-10">
      <div className="mb-10 border-b border-rule pb-8">
        <p className="mb-4 text-[10px] tracking-[0.22em] text-ochre uppercase">Panel interno</p>
        <h1 className="font-serif text-[clamp(2.4rem,6vw,3rem)] leading-none tracking-tight text-ink">
          Iniciar sesión.
        </h1>
      </div>

      <LoginForm />
    </main>
  );
}
