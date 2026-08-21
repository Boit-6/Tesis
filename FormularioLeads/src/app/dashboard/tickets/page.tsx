import Link from "next/link";
import {redirect} from "next/navigation";

import TicketsBoard from "./tickets-board";

import {createClient} from "@/lib/supabase/server";

export default async function TicketsPage() {
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
    <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-20">
      <div className="mb-14 flex items-end justify-between gap-6 border-b border-neutral-800 pb-12">
        <div>
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-amber-500 uppercase">
            Panel interno
          </p>
          <h1 className="text-[clamp(2.4rem,7vw,4rem)] leading-[0.9] font-black tracking-tight text-neutral-100">
            Tickets.
          </h1>
        </div>

        <Link
          className="ease font-mono text-[11px] tracking-[0.2em] text-neutral-500 uppercase transition duration-200 hover:text-amber-400"
          href="/dashboard"
        >
          ← Dashboard
        </Link>
      </div>

      <TicketsBoard />
    </main>
  );
}
