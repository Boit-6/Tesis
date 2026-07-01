"use client";

import {useRouter} from "next/navigation";
import {useTransition} from "react";

// Reemplaza al Realtime: re-ejecuta el Server Component y trae datos frescos
// sin recargar toda la página.
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 transition hover:text-amber-400 disabled:opacity-40"
    >
      {isPending ? "Actualizando…" : "↺ Actualizar"}
    </button>
  );
}
