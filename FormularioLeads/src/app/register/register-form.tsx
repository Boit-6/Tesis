"use client";

import {useState} from "react";
import Link from "next/link";

import {createClient} from "@/lib/supabase/client";
import {translateAuthError} from "@/lib/supabase/auth-errors";

const inputClass =
  "w-full border-b border-rule bg-transparent pt-1 pb-3 text-[15px] text-ink placeholder-mist outline-none transition duration-200 ease hover:border-mist focus:border-ochre";

const labelClass = "mb-2 block text-[10px] tracking-[0.16em] text-faint uppercase";

function validate(email: string, password: string, confirmPassword: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) return "El email no tiene un formato válido.";
  if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (password !== confirmPassword) return "Las contraseñas no coinciden.";

  return null;
}

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [sesionActiva, setSesionActiva] = useState(false);

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

      // Si el proyecto tiene "Confirm email" desactivado, signUp ya devuelve una
      // sesión activa. Aun así no se redirige al panel: toda cuenta nueva nace
      // con rol de usuario y el panel la devolvería a la portada sin decir por
      // qué. Se informa acá, que es donde la persona está mirando.
      setSesionActiva(Boolean(data.session));
      setCheckEmail(true);
    } catch (err) {
      setError(translateAuthError(err, "No pudimos crear la cuenta."));
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="border-rule-soft bg-card flex flex-col items-start gap-5 border px-8 py-14">
        <svg
          fill="none"
          height={36}
          stroke="#8f5f22"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.3}
          viewBox="0 0 24 24"
          width={36}
        >
          <rect height="14" rx="1.5" width="18" x="3" y="5" />
          <path d="M3.5 6.5l8.5 6 8.5-6" />
        </svg>
        <h2 className="text-ink font-serif text-[32px] leading-none tracking-tight">
          {sesionActiva ? "Cuenta creada." : "Revisá tu correo."}
        </h2>
        <p className="text-muted max-w-xs text-[14.5px] leading-relaxed">
          {sesionActiva
            ? `Tu cuenta ${email} quedó creada.`
            : `Te enviamos un link de confirmación a ${email}. Confirmalo para poder iniciar sesión.`}
        </p>
        {/* El panel exige rol de administrador (§4.2.3) y toda cuenta nueva nace
            con rol de usuario, así que confirmar el correo no alcanza para
            entrar. Antes esto no se decía en ninguna parte: la cuenta se creaba,
            el registro redirigía al panel y el panel devolvía a la portada sin
            explicación. */}
        <p className="text-faint max-w-xs text-[13px] leading-relaxed">
          El acceso al panel lo habilita un administrador. Hasta entonces vas a poder iniciar sesión
          pero no ver el tablero.
        </p>
      </div>
    );
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
        className="ease bg-ink text-paper hover:bg-ochre w-full py-4.5 text-[11px] font-medium tracking-[0.2em] uppercase transition duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
        type="submit"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-muted text-center text-[13px]">
        ¿Ya tenés cuenta?{" "}
        <Link className="text-ochre underline-offset-4 hover:underline" href="/login">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
