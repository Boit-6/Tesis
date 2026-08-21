"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

import {createClient} from "@/lib/supabase/client";
import {translateAuthError} from "@/lib/supabase/auth-errors";

const inputClass =
  "w-full border-b border-rule bg-transparent pt-1 pb-3 text-[15px] text-ink placeholder-mist outline-none transition duration-200 ease hover:border-mist focus:border-ochre";

const labelClass = "mb-2 block text-[10px] tracking-[0.16em] text-faint uppercase";

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
          className="border-brick bg-brick/5 text-brick border-l-2 px-5 py-3.5 text-[13px]"
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
        className="ease bg-ink text-paper hover:bg-ochre w-full py-4.5 text-[11px] font-medium tracking-[0.2em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
        type="submit"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>

      <p className="text-muted text-center text-[13px]">
        ¿No tenés cuenta?{" "}
        <Link className="text-ochre underline-offset-4 hover:underline" href="/register">
          Registrate
        </Link>
      </p>
    </form>
  );
}
