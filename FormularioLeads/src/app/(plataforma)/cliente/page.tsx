import {getClienteUser} from "@/lib/auth";

// El gate usa la sesión en cada request.
export const dynamic = "force-dynamic";

// Panel del cliente. Por ahora muestra el estado vacío: publicar un proyecto
// y verlo acá llegan en los pasos siguientes de la etapa 6.
export default async function ClientePage() {
  const user = await getClienteUser();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pt-10 pb-20 sm:px-10">
      <div className="border-rule mb-10 flex flex-wrap items-end justify-between gap-5 border-b pb-8">
        <div>
          <p className="text-ochre mb-4 text-[10px] tracking-[0.22em] uppercase">{user.email}</p>
          <h1 className="text-ink font-serif text-[clamp(2.4rem,6vw,3rem)] leading-none tracking-tight">
            Mis proyectos<span className="text-ochre">.</span>
          </h1>
        </div>
        <form action="/auth/signout?next=/cliente/entrar" method="post">
          <button
            className="ease text-muted hover:text-ochre text-[11px] tracking-[0.14em] uppercase transition duration-200"
            type="submit"
          >
            Salir
          </button>
        </form>
      </div>

      <p className="text-muted max-w-lg text-[14.5px] leading-relaxed">
        Todavía no publicaste ningún proyecto. Muy pronto vas a poder publicarlo desde acá y recibir
        propuestas de desarrolladores.
      </p>
    </main>
  );
}
