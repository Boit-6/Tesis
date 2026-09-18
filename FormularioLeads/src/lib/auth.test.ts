import {redirect} from "next/navigation";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {getAdminStatus, getAdminUser} from "./auth";

import {createClient} from "@/lib/supabase/server";

// `vi.mock` queda hoisteado por Vitest al tope del archivo, antes que
// cualquier import — no hace falta escribirlo primero a mano.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((ruta: string) => {
    throw new Error(`REDIRECT:${ruta}`);
  }),
}));

// Reproduce sólo la parte de la cadena de Supabase que usa getAdminStatus:
// `.from("profiles").select("role").eq("id", ...).single()`.
function mockSupabase(options: {user: {id: string} | null; role?: string}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({data: {user: options.user}}),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: options.role ? {role: options.role} : null,
          }),
        }),
      }),
    }),
  };
}

describe("getAdminStatus", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("marca supabaseDisponible en false si faltan las variables de Supabase", async () => {
    vi.mocked(createClient).mockResolvedValue(null);

    const estado = await getAdminStatus();

    expect(estado).toEqual({
      user: null,
      esAdmin: false,
      supabaseDisponible: false,
    });
  });

  it("no llega a pedir el rol si no hay sesión", async () => {
    const supabase = mockSupabase({user: null});

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const estado = await getAdminStatus();

    expect(estado).toEqual({
      user: null,
      esAdmin: false,
      supabaseDisponible: true,
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("esAdmin es true sólo cuando profiles.role === 'admin'", async () => {
    const user = {id: "user-1"};
    const supabase = mockSupabase({user, role: "admin"});

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const estado = await getAdminStatus();

    expect(estado).toEqual({user, esAdmin: true, supabaseDisponible: true});
  });

  it("esAdmin es false para cualquier otro rol, no sólo para 'user'", async () => {
    const user = {id: "user-2"};
    const supabase = mockSupabase({user, role: "otro-rol-inventado"});

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    const estado = await getAdminStatus();

    expect(estado.esAdmin).toBe(false);
  });
});

describe("getAdminUser", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
    vi.mocked(redirect).mockClear();
  });

  it("redirige a /login sin sesión", async () => {
    vi.mocked(createClient).mockResolvedValue(null);

    await expect(getAdminUser()).rejects.toThrow("REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirige a / con sesión pero sin rol admin", async () => {
    const supabase = mockSupabase({user: {id: "u"}, role: "user"});

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(getAdminUser()).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("devuelve el usuario cuando es admin, sin redirigir", async () => {
    const user = {id: "admin-1"};
    const supabase = mockSupabase({user, role: "admin"});

    vi.mocked(createClient).mockResolvedValue(supabase as any);

    await expect(getAdminUser()).resolves.toBe(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});
