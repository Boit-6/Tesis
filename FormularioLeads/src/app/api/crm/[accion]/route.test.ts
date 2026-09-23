import {NextRequest} from "next/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {requireAdmin} from "@/lib/auth";

// `vi.mock` queda hoisteado por Vitest al tope del archivo, antes que
// cualquier import — no hace falta escribirlo primero a mano.
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

function post(body: unknown) {
  return new NextRequest("http://localhost/api/crm/cancelar", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
  });
}

describe("POST /api/crm/[accion]", () => {
  const envOriginal = {...process.env};

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {
      ...envOriginal,
      N8N_BASE: "http://n8n.local",
      CRM_PANEL_TOKEN: "panel-secreto",
    };
    vi.mocked(requireAdmin).mockReset();
    vi.mocked(requireAdmin).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = {...envOriginal};
  });

  it("respeta lo que devuelva requireAdmin() sin llegar a llamar a n8n", async () => {
    const denegado = new Response(JSON.stringify({ok: false, error: "No autenticado."}), {
      status: 401,
    });

    vi.mocked(requireAdmin).mockResolvedValue(denegado as never);

    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 para una acción fuera de la lista blanca", async () => {
    const {POST} = await import("./route");
    const res = await POST(post({}), {
      params: Promise.resolve({accion: "borrar-toda-la-base"}),
    });

    expect(res.status).toBe(404);
  });

  it("503 (fail-closed) si falta CRM_PANEL_TOKEN, aunque el resto esté bien", async () => {
    delete process.env.CRM_PANEL_TOKEN;

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(503);
  });

  it("500 si falta N8N_BASE / NEXT_PUBLIC_N8N_BASE", async () => {
    delete process.env.N8N_BASE;
    delete process.env.NEXT_PUBLIC_N8N_BASE;

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(500);
  });

  it("400 con un body que no es JSON válido", async () => {
    const {POST} = await import("./route");
    const req = new NextRequest("http://localhost/api/crm/cancelar", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: "esto no es json",
    });
    const res = await POST(req, {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(400);
  });

  it("manda el header del panel a n8n y reenvía su respuesta JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ok: true}), {status: 200}));

    vi.stubGlobal("fetch", fetchMock);

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://n8n.local/webhook/lead-cancelar",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({"x-crm-token": "panel-secreto"}),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ok: true});
  });

  it("502 propio (no expone el token) si n8n rechaza la credencial con 403", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Forbidden", {status: 403})));

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(502);
  });

  it("normaliza a JSON una respuesta vacía de n8n", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 200})));

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ok: true});
  });

  it("502 si no se puede contactar a n8n", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const {POST} = await import("./route");
    const res = await POST(post({lead_id: "LD-1"}), {
      params: Promise.resolve({accion: "cancelar"}),
    });

    expect(res.status).toBe(502);
  });
});
