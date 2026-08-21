import type {NextRequest} from "next/server";

import {NextResponse} from "next/server";

import {llamarTickets, requireAdmin} from "@/lib/tickets";

// Proxy server-side hacia el módulo de tickets de n8n. El browser nunca ve la
// TICKETS_API_KEY ni el token de Notion.

// GET /api/tickets?estado=&prioridad=&abiertos=&limite=
export async function GET(request: NextRequest) {
  const denegado = await requireAdmin();

  if (denegado) return denegado;

  const params = new URLSearchParams();

  for (const clave of ["estado", "prioridad", "proyecto", "abiertos", "limite"]) {
    const valor = request.nextUrl.searchParams.get(clave);

    if (valor) params.set(clave, valor);
  }

  const qs = params.toString();

  return llamarTickets(`ticket/listar${qs ? `?${qs}` : ""}`);
}

// POST /api/tickets  → crea un ticket desde el tablero
export async function POST(request: NextRequest) {
  const denegado = await requireAdmin();

  if (denegado) return denegado;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ok: false, error: "Body inválido."}, {status: 400});
  }

  const titulo = String(body.titulo ?? "").trim();

  if (!titulo) {
    return NextResponse.json({ok: false, error: 'Falta "titulo".'}, {status: 400});
  }

  return llamarTickets("ticket/nuevo", {
    method: "POST",
    body: {
      titulo,
      prioridad: body.prioridad,
      estado: body.estado,
      etiquetas: body.etiquetas,
      notas: body.notas,
      vence: body.vence,
      origen: "DASHBOARD",
    },
  });
}
