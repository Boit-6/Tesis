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
    <main className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-neutral-800 pb-12">
        <div>
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-amber-500 uppercase">
            Panel interno
          </p>
          <h1 className="text-[clamp(2.4rem,7vw,4rem)] leading-[0.9] font-black tracking-tight text-neutral-100">
            Dashboard.
          </h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span className="font-mono text-[12px] text-neutral-500">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              className="ease font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase transition duration-200 hover:text-amber-400"
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
