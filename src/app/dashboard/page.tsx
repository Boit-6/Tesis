import {redirect} from "next/navigation";

import DashboardClient from "./dashboard-client";

import {createClient} from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: {user},
  } = supabase ? await supabase.auth.getUser() : {data: {user: null}};

  if (!user) redirect("/login");

  const {data: profile} = supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : {data: null};

  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-8 pb-20 sm:px-10">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-8">
        <div>
          <p className="mb-4 text-[10px] tracking-[0.22em] text-ochre uppercase">Panel interno</p>
          <h1 className="font-serif text-[clamp(2.6rem,6vw,3.25rem)] leading-none tracking-tight text-ink">
            Dashboard<span className="text-ochre">.</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-[12.5px] text-faint">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              className="ease text-[11px] tracking-[0.14em] text-muted uppercase transition duration-200 hover:text-ochre"
              type="submit"
            >
              Salir →
            </button>
          </form>
        </div>
      </div>

      <DashboardClient />
    </main>
  );
}
