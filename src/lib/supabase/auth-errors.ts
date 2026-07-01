const MESSAGES_BY_CODE: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  user_already_exists: "Ya existe una cuenta con ese email.",
  email_exists: "Ya existe una cuenta con ese email.",
  weak_password: "La contraseña es demasiado débil.",
  email_address_invalid: "El email no tiene un formato válido.",
  email_address_not_authorized: "Ese email no está autorizado para registrarse.",
  email_not_confirmed: "Confirmá tu email antes de iniciar sesión.",
  user_banned: "Esta cuenta está bloqueada.",
  signup_disabled: "El registro de nuevas cuentas está deshabilitado.",
  over_request_rate_limit: "Demasiados intentos. Esperá un momento e intentá de nuevo.",
  over_email_send_rate_limit: "Demasiados intentos. Esperá un momento e intentá de nuevo.",
  same_password: "La nueva contraseña no puede ser igual a la anterior.",
};

function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const {code} = error as {code: unknown};

    if (typeof code === "string") return code;
  }

  return undefined;
}

export function translateAuthError(error: unknown, fallback: string): string {
  const code = getErrorCode(error);

  if (code && MESSAGES_BY_CODE[code]) return MESSAGES_BY_CODE[code];

  return error instanceof Error ? error.message : fallback;
}
