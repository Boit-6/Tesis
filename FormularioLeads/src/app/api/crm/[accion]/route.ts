import type {NextRequest} from "next/server";

import {NextResponse} from "next/server";

import {requireAdmin} from "@/lib/tickets";

// Proxy server-side de las acciones del panel interno hacia n8n.
//
// Estos webhooks mutan el estado del negocio (cancelar un pedido, resolver un
// pedido de cambios, mover el estado del trabajo) y antes se llamaban directo
// desde el navegador, sin credencial: cualquiera que conociera la URL de n8n
// podía dispararlos. Ahora exigen un header que sólo vive en el servidor.
//
// El formulario público y los enlaces del cliente NO pasan por acá: no pueden
// llevar un secreto (el navegador lo expondría) y se protegen con el token UUID.

const N8N_BASE = process.env.N8N_BASE ?? process.env.NEXT_PUBLIC_N8N_BASE;
const PANEL_TOKEN = process.env.CRM_PANEL_TOKEN;
const PANEL_HEADER = process.env.CRM_PANEL_HEADER ?? "x-crm-token";

// Lista blanca: la ruta viene de la URL, así que no puede ser cualquier cosa.
const ACCIONES: Record<string, string> = {
  cancelar: "lead-cancelar",
  "cambio-aceptar": "cambio-aceptar",
  "cambio-rechazar": "cambio-rechazar",
  "trabajo-estado": "trabajo-estado",
};

export async function POST(request: NextRequest, {params}: {params: Promise<{accion: string}>}) {
  const denegado = await requireAdmin();

  if (denegado) return denegado;

  const {accion} = await params;
  const ruta = ACCIONES[accion];

  if (!ruta) {
    return NextResponse.json({ok: false, error: `Acción desconocida: ${accion}`}, {status: 404});
  }

  if (!N8N_BASE) {
    return NextResponse.json(
      {ok: false, error: "Falta N8N_BASE / NEXT_PUBLIC_N8N_BASE en el servidor."},
      {status: 500},
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ok: false, error: "Body inválido."}, {status: 400});
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  if (PANEL_TOKEN) headers[PANEL_HEADER] = PANEL_TOKEN;

  try {
    const res = await fetch(`${N8N_BASE}/webhook/${ruta}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const texto = await res.text();

    if (res.status === 403) {
      return NextResponse.json(
        {ok: false, error: "n8n rechazó la credencial del panel. Revisá CRM_PANEL_TOKEN."},
        {status: 502},
      );
    }

    // Varias de estas ramas responden HTML o vacío: se normaliza a JSON.
    if (!texto) return NextResponse.json({ok: res.ok}, {status: res.ok ? 200 : res.status});

    try {
      return NextResponse.json(JSON.parse(texto), {status: res.status});
    } catch {
      return NextResponse.json({ok: res.ok, respuesta: texto.slice(0, 500)}, {status: res.status});
    }
  } catch (err) {
    console.error(err);

    return NextResponse.json({ok: false, error: "No se pudo contactar a n8n."}, {status: 502});
  }
}
