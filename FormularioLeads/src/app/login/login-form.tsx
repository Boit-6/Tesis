"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

import {createClient} from "@/lib/supabase/client";
import {translateAuthError} from "@/lib/supabase/auth-errors";

const inputClass =
  "w-full bg-transparent border-b border-neutral-600 pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400 focus:placeholder-neutral-500";

const labelClass = "block font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-2";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();

    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");

      return;
    }

    setLoading(true);
    try {
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");

      router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err, "No pudimos iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
      {error && (
        <div
          className="border-l-2 border-red-500 pl-4 font-mono text-[12px] text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          required
          autoComplete="email"
          className={inputClass}
          id="email"
          name="email"
          placeholder="tu@email.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          Contraseña
        </label>
        <input
          required
          autoComplete="current-password"
          className={inputClass}
          id="password"
          name="password"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        className="ease w-full bg-amber-400 py-4 font-mono text-[13px] font-bold tracking-[0.2em] text-neutral-950 uppercase transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
        type="submit"
      >
        {loading ? "Ingresando..." : "Ingresar →"}
      </button>

      <p className="text-center font-mono text-[12px] text-neutral-500">
        ¿No tenés cuenta?{" "}
        <Link className="text-amber-500 hover:text-amber-400" href="/register">
          Registrate
        </Link>
      </p>
    </form>
  );
}
