import {describe, expect, it} from "vitest";

import {redirectSeguro} from "./route";

const ORIGIN = "https://miapp.com";

// Regresión de F0.1 (mitad server-side): mismo bypass que en login-form.tsx,
// acá con `origin` explícito en vez de `window.location.origin`.
describe("redirectSeguro (auth/confirm)", () => {
  it("deja pasar una ruta relativa propia", () => {
    expect(redirectSeguro("/dashboard/tickets", ORIGIN).toString()).toBe(
      "https://miapp.com/dashboard/tickets",
    );
  });

  it("bloquea una URL absoluta a otro origen", () => {
    expect(redirectSeguro("https://evil.com", ORIGIN).toString()).toBe(
      "https://miapp.com/dashboard",
    );
  });

  it("bloquea el bypass de barra invertida (`/\\evil.com`)", () => {
    expect(redirectSeguro("/\\evil.com", ORIGIN).toString()).toBe("https://miapp.com/dashboard");
  });

  it("bloquea protocol-relative (`//evil.com`)", () => {
    expect(redirectSeguro("//evil.com", ORIGIN).toString()).toBe("https://miapp.com/dashboard");
  });

  it("no explota con un valor que ni siquiera parsea como URL", () => {
    expect(redirectSeguro("http://[", ORIGIN).toString()).toBe("https://miapp.com/dashboard");
  });
});
