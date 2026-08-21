import {NextResponse} from "next/server";

import {createClient} from "@/lib/supabase/server";

// Base de n8n para llamadas server-side. Se prefiere N8N_BASE (privada) y se cae
// a la pública que ya usa el resto del dashboard.
const N8N_BASE = process.env.N8N_BASE ?? process.env.NEXT_PUBLIC_N8N_BASE;

// Secreto opcional del módulo de tickets. Vive sólo en el servidor: por eso el
// tablero habla con n8n a través de /api/tickets y no directo desde el browser.
const TICKETS_API_KEY = process.env.TICKETS_API_KEY;

export interface Ticket {
  ticket_id: string;
  url: string | null;
  titulo: string;
  estado: string;
  prioridad: string;
  prioridad_inicial: string;
  score: number;
  etiquetas: string[];
  proyecto: string;
  origen: string;
  ref: string;
  notas: string;
  vence: string | null;
  creado: string;
  ultimo_movimiento: string;
  escaladas: number;
  dias_abierto: number;
  dias_quieto: number;
  dias_para_escalar: number | null;
}

export interface TicketsResponse {
  ok: boolean;
  total: number;
  truncado: boolean;
  estados: string[];
  prioridades: string[];
  tickets: Ticket[];
}

// Compuerta de rol: los route handlers no pasan por el gate de /dashboard, así
// que cada uno revalida sesión + rol admin por su cuenta.
export async function requireAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      {ok: false, error: "Faltan las variables de Supabase en el servidor."},
      {status: 500},
    );
  }

  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ok: false, error: "No autenticado."}, {status: 401});

  const {data: profile} = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ok: false, error: "Requiere rol admin."}, {status: 403});
  }

  return null;
}

// Llama a un webhook del módulo de tickets y devuelve la respuesta ya normalizada.
export async function llamarTickets(
  ruta: string,
  init?: {method?: string; body?: unknown},
): Promise<NextResponse> {
  if (!N8N_BASE) {
    return NextResponse.json(
      {ok: false, error: "Falta N8N_BASE / NEXT_PUBLIC_N8N_BASE en el servidor."},
      {status: 500},
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (TICKETS_API_KEY) headers["x-api-key"] = TICKETS_API_KEY;

  try {
    const res = await fetch(`${N8N_BASE}/webhook/${ruta}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    const texto = await res.text();

    // n8n puede responder vacío si la rama se cortó antes del nodo Respond.
    if (!texto) {
      return NextResponse.json(
        {ok: false, error: `n8n respondió vacío (${res.status}).`},
        {status: 502},
      );
    }

    return new NextResponse(texto, {
      status: res.status,
      headers: {"Content-Type": "application/json"},
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {ok: false, error: "No se pudo contactar a n8n. ¿Está levantado y publicado el workflow?"},
      {status: 502},
    );
  }
}
