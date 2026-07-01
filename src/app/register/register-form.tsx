"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

import {createClient} from "@/lib/supabase/client";
import {translateAuthError} from "@/lib/supabase/auth-errors";

const inputClass =
  "w-full bg-transparent border-b border-neutral-600 pb-3 pt-1 text-[15px] text-neutral-100 placeholder-neutral-600 outline-none transition duration-200 ease focus:border-amber-400 focus:placeholder-neutral-500";

const labelClass = "block font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-2";

function validate(email: string, password: string, confirmPassword: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) return "El email no tiene un formato válido.";
  if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (password !== confirmPassword) return "Las contraseñas no coinciden.";

  return null;
}

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate(email, password, confirmPassword);

    if (validationError) {
      setError(validationError);

      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setError("Faltan las variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");

      return;
    }

    setLoading(true);
    try {
      const {data, error: signUpError} = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError) throw signUpError;

      // Si el proyecto tiene "Confirm email" desactivado, signUp ya devuelve una sesión activa.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();

        return;
      }

      setCheckEmail(true);
    } catch (err) {
      setError(translateAuthError(err, "No pudimos crear la cuenta."));
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-start gap-6 py-16">
        <span className="font-mono text-4xl font-black text-amber-400">✓</span>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-neutral-100">Revisá tu correo.</h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
            Te enviamos un link de confirmación a {email}. Confirmalo para poder iniciar sesión.
          </p>
        </div>
      </div>
    );
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
          autoComplete="new-password"
          className={inputClass}
          id="password"
          name="password"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="confirmPassword">
          Repetir contraseña
        </label>
        <input
          required
          autoComplete="new-password"
          className={inputClass}
          id="confirmPassword"
          name="confirmPassword"
          placeholder="••••••••"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <button
        className="ease w-full bg-amber-400 py-4 font-mono text-[13px] font-bold tracking-[0.2em] text-neutral-950 uppercase transition duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
        type="submit"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta →"}
      </button>

      <p className="text-center font-mono text-[12px] text-neutral-500">
        ¿Ya tenés cuenta?{" "}
        <Link className="text-amber-500 hover:text-amber-400" href="/login">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
