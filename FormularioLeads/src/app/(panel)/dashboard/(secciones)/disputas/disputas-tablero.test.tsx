import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({createClient: () => ({rpc})}));

const {default: DisputasTablero} = await import("./disputas-tablero");

const abierta = {
  id: "h2",
  lead_id: "LD-1",
  titulo: "Desarrollo",
  monto: 500.5,
  disputa_motivo: "El carrito no calcula los envíos.",
  disputa_abierta_en: "2026-09-28T15:00:00Z",
  entrega_nota: "Tienda en el dominio de prueba",
  espacio_nombre: "Pablo Dev",
  cliente_nombre: "Marta",
  servicio: "ecommerce",
};

const resuelta = {
  id: "h9",
  lead_id: "LD-2",
  titulo: "Diseño",
  monto: 300,
  disputa_motivo: "No era lo pedido",
  monto_liberado: 100,
  monto_reembolsado: 200,
  resolucion_nota: "Se entregó un tercio",
  cerrado_en: "2026-09-27T10:00:00Z",
  cierre: "resuelto",
  resuelto_por: "admin@tesis.local",
  transferido_en: null,
  reembolsado_en: null,
  espacio_nombre: "Lucía Estudio",
  cliente_nombre: "Ana",
  servicio: "desarrollo_web",
};

const detalle = (extra = {}) => ({
  hito: {
    id: "h2",
    orden: 2,
    titulo: "Desarrollo",
    descripcion: null,
    monto: 500.5,
    estado: "EN_DISPUTA",
    comision_porcentaje: 5,
    fondeado_en: null,
    entrega_nota: "Tienda en el dominio de prueba",
    entregado_en: null,
    disputa_motivo: "El carrito no calcula los envíos.",
    disputa_abierta_en: null,
    monto_liberado: 0,
    monto_reembolsado: 0,
    comision: 0,
    resolucion_nota: null,
    cerrado_en: null,
    transferido_en: null,
    reembolsado_en: null,
    resuelto_por: null,
  },
  proyecto: {
    lead_id: "LD-1",
    servicio: "ecommerce",
    cliente_nombre: "Marta",
    espacio_nombre: "Pablo Dev",
    espacio_slug: "pablo-dev",
    de_plataforma: true,
    hitos: [
      {orden: 1, titulo: "Diseño", monto: 300, estado: "LIBERADO"},
      {orden: 2, titulo: "Desarrollo", monto: 500.5, estado: "EN_DISPUTA"},
    ],
  },
  eventos: [
    {
      tipo: "fondeado",
      actor: "cliente",
      detalle: null,
      creado_en: "2026-09-28T12:00:00Z",
    },
    {
      tipo: "disputado",
      actor: "cliente",
      detalle: "El carrito no calcula los envíos.",
      creado_en: "2026-09-28T15:00:00Z",
    },
  ],
  mensajes: [
    {
      autor: "cliente",
      texto: "¿Y el envío a Córdoba?",
      creado_en: "2026-09-28T14:00:00Z",
    },
  ],
  puede_resolver: true,
  ...extra,
});

function responder(det = detalle()) {
  rpc.mockImplementation((fn: string) => {
    if (fn === "disputas_abiertas") return Promise.resolve({data: [abierta], error: null});
    if (fn === "disputas_resueltas") return Promise.resolve({data: [resuelta], error: null});
    if (fn === "disputa_detalle") return Promise.resolve({data: det, error: null});

    return Promise.resolve({data: null, error: null});
  });
}

describe("DisputasTablero", () => {
  beforeEach(() => rpc.mockReset());

  it("muestra la disputa abierta con el motivo y la entrega", async () => {
    responder();
    render(<DisputasTablero />);

    expect(await screen.findByText("Desarrollo")).toBeInTheDocument();
    expect(screen.getByRole("tab", {name: "Abiertas · 1"})).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("El carrito no calcula los envíos.")).toBeInTheDocument();
    expect(screen.getByText("Tienda en el dominio de prueba")).toBeInTheDocument();
  });

  it("al revisar, trae el historial y la conversación", async () => {
    const user = userEvent.setup();

    responder();
    render(<DisputasTablero />);
    await user.click(await screen.findByRole("button", {name: "Revisar y resolver"}));

    expect(rpc).toHaveBeenCalledWith("disputa_detalle", {p_hito: "h2"});
    expect(await screen.findByText("¿Y el envío a Córdoba?")).toBeInTheDocument();
    expect(screen.getByText("Pagado: la plata queda retenida")).toBeInTheDocument();
  });

  it("partir muestra el reparto y resuelve después de confirmar", async () => {
    const user = userEvent.setup();

    responder();
    render(<DisputasTablero />);
    await user.click(await screen.findByRole("button", {name: "Revisar y resolver"}));
    await user.click(await screen.findByLabelText("Partir"));
    await user.type(screen.getByLabelText(/Para el desarrollador/), "200");
    expect(screen.getByText(/Vuelve al cliente/)).toHaveTextContent("300,50");

    const resolver = screen.getByRole("button", {name: "Resolver"});

    expect(resolver).toBeDisabled();
    await user.type(screen.getByLabelText("Por qué se resuelve así"), "Se entregó la mitad");
    await user.click(resolver);
    expect(rpc).not.toHaveBeenCalledWith("resolver_disputa", expect.anything());
    await user.click(screen.getByRole("button", {name: "Sí, resolver"}));

    expect(rpc).toHaveBeenCalledWith("resolver_disputa", {
      p_hito: "h2",
      p_liberar: 200,
      p_nota: "Se entregó la mitad",
    });
    // Vuelve a cargar las listas y pasa a las resueltas.
    expect(await screen.findByRole("tab", {name: "Resueltas · 1"})).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("un monto fuera de rango no deja resolver", async () => {
    const user = userEvent.setup();

    responder();
    render(<DisputasTablero />);
    await user.click(await screen.findByRole("button", {name: "Revisar y resolver"}));
    await user.click(await screen.findByLabelText("Partir"));
    await user.type(screen.getByLabelText(/Para el desarrollador/), "600");
    await user.type(screen.getByLabelText("Por qué se resuelve así"), "Todo al desarrollador");

    expect(screen.getByText(/Tiene que ser más de 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Resolver"})).toBeDisabled();
  });

  it("en un proyecto propio del admin no aparece el formulario", async () => {
    const user = userEvent.setup();

    responder(detalle({puede_resolver: false}));
    render(<DisputasTablero />);
    await user.click(await screen.findByRole("button", {name: "Revisar y resolver"}));

    expect(await screen.findByText(/Es un proyecto tuyo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Resolver"})).not.toBeInTheDocument();
  });

  it("las resueltas dicen quién resolvió y cuánto fue a cada parte", async () => {
    const user = userEvent.setup();

    responder();
    render(<DisputasTablero />);
    await user.click(await screen.findByRole("tab", {name: "Resueltas · 1"}));
    const tarjeta = screen.getByText("Diseño").closest("li")!;

    expect(within(tarjeta).getByText(/Resuelta por admin@tesis.local/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/al cliente/)).toHaveTextContent("200");
    expect(within(tarjeta).getByText("Pendiente de mover en Stripe")).toBeInTheDocument();
  });
});
