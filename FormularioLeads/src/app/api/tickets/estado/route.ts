import type {NextRequest} from "next/server";

import {NextResponse} from "next/server";

import {llamarTickets, requireAdmin} from "@/lib/tickets";

// POST /api/tickets/estado → mueve un ticket de columna o le cambia la prioridad.
export async function POST(request: NextRequest) {
  const denegado = await requireAdmin();

  if (denegado) return denegado;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ok: false, error: "Body inválido."}, {status: 400});
  }

  const ticketId = String(body.ticket_id ?? "").trim();

  if (!ticketId) {
    return NextResponse.json({ok: false, error: 'Falta "ticket_id".'}, {status: 400});
  }

  return llamarTickets("ticket/estado", {
    method: "POST",
    body: {
      ticket_id: ticketId,
      estado: body.estado,
      prioridad: body.prioridad,
      notas: body.notas,
    },
  });
}
