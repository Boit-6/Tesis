import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {getAdminStatus} from "@/lib/auth";

// `vi.mock` queda hoisteado por Vitest al tope del archivo, antes que
// cualquier import — no hace falta escribirlo primero a mano.
vi.mock("@/lib/auth", () => ({
  getAdminStatus: vi.fn(),
}));

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.mocked(getAdminStatus).mockReset();
  });

  it("500 si faltan las variables de Supabase en el servidor", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue({
      user: null,
      esAdmin: false,
      supabaseDisponible: false,
    });

    const {requireAdmin} = await import("./tickets");
    const res = await requireAdmin();

    expect(res?.status).toBe(500);
  });

  it("401 sin sesión", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue({
      user: null,
      esAdmin: false,
      supabaseDisponible: true,
    });

    const {requireAdmin} = await import("./tickets");
    const res = await requireAdmin();

    expect(res?.status).toBe(401);
  });

  it("403 con sesión pero sin rol admin", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue({
      user: {id: "u1"} as any,
      esAdmin: false,
      supabaseDisponible: true,
    });

    const {requireAdmin} = await import("./tickets");
    const res = await requireAdmin();

    expect(res?.status).toBe(403);
  });

  it("null (deja pasar) cuando hay sesión y rol admin", async () => {
    vi.mocked(getAdminStatus).mockResolvedValue({
      user: {id: "admin-1"} as any,
      esAdmin: true,
      supabaseDisponible: true,
    });

    const {requireAdmin} = await import("./tickets");
    const res = await requireAdmin();

    expect(res).toBeNull();
  });
});

// `N8N_BASE` y `TICKETS_API_KEY` se leen de `process.env` una sola vez, al
// importar el módulo — hace falta resetModules + reimportar para que cada
// test vea su propia combinación de variables.
describe("llamarTickets", () => {
  const envOriginal = {...process.env};

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {...envOriginal};
  });

  afterEach(() => {
    process.env = {...envOriginal};
  });

  it("500 si falta N8N_BASE / NEXT_PUBLIC_N8N_BASE", async () => {
    delete process.env.N8N_BASE;
    delete process.env.NEXT_PUBLIC_N8N_BASE;

    const {llamarTickets} = await import("./tickets");
    const res = await llamarTickets("ticket/listar");

    expect(res.status).toBe(500);
  });

  it("503 (fail-closed) si falta TICKETS_API_KEY, aunque N8N_BASE esté", async () => {
    process.env.N8N_BASE = "http://n8n.local";
    delete process.env.TICKETS_API_KEY;

    const {llamarTickets} = await import("./tickets");
    const res = await llamarTickets("ticket/listar");

    expect(res.status).toBe(503);

    const body = await res.json();

    expect(body.ok).toBe(false);
  });

  it("manda x-api-key y devuelve la respuesta de n8n tal cual cuando todo está configurado", async () => {
    process.env.N8N_BASE = "http://n8n.local";
    process.env.TICKETS_API_KEY = "clave-de-prueba";

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"ok":true,"tickets":[]}', {status: 200}));

    vi.stubGlobal("fetch", fetchMock);

    const {llamarTickets} = await import("./tickets");
    const res = await llamarTickets("ticket/listar");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://n8n.local/webhook/ticket/listar",
      expect.objectContaining({
        headers: expect.objectContaining({"x-api-key": "clave-de-prueba"}),
      }),
    );
    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual({ok: true, tickets: []});
  });

  it("502 si n8n responde vacío", async () => {
    process.env.N8N_BASE = "http://n8n.local";
    process.env.TICKETS_API_KEY = "clave-de-prueba";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 200})));

    const {llamarTickets} = await import("./tickets");
    const res = await llamarTickets("ticket/listar");

    expect(res.status).toBe(502);
  });

  it("502 si no se puede contactar a n8n", async () => {
    process.env.N8N_BASE = "http://n8n.local";
    process.env.TICKETS_API_KEY = "clave-de-prueba";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const {llamarTickets} = await import("./tickets");
    const res = await llamarTickets("ticket/listar");

    expect(res.status).toBe(502);
  });
});
