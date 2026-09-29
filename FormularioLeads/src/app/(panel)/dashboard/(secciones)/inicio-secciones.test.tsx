import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

const abrirLead = vi.fn();
let hitos: unknown[] = [];

vi.mock("../panel-datos", () => ({
  usePanelDatos: () => ({
    cargando: false,
    metrics: null,
    facturas: [],
    pedidos: [],
    porEnviar: [],
    trabajos: [],
    hitos,
    abrirLead,
    cerrarProyecto: vi.fn(),
  }),
}));

const {default: InicioSecciones} = await import("./inicio-secciones");

const hito = (extra = {}) => ({
  id: "h1",
  lead_id: "LD-1",
  orden: 2,
  titulo: "Desarrollo",
  monto: 500.5,
  estado: "FONDEADO",
  disputa_motivo: null,
  cliente: "Marta Gómez",
  ...extra,
});

function lista() {
  return within(screen.getByRole("list"));
}

describe("Requiere tu atención", () => {
  it("un hito pagado pide la entrega y abre el proyecto", async () => {
    const user = userEvent.setup();

    hitos = [hito()];
    render(<InicioSecciones cobrosActivos />);

    expect(lista().getByText("Hito pagado")).toBeInTheDocument();
    expect(lista().getByText(/2\. Desarrollo · US\$ 500,50 retenidos/)).toBeInTheDocument();
    await user.click(lista().getByRole("button", {name: "Marcar entregado"}));
    expect(abrirLead).toHaveBeenCalledWith("LD-1");
  });

  it("un hito disputado va primero, como urgente, con el motivo", () => {
    hitos = [
      hito(),
      hito({
        id: "h2",
        estado: "EN_DISPUTA",
        disputa_motivo: "No calcula los envíos",
      }),
    ];
    render(<InicioSecciones cobrosActivos />);

    const filas = lista().getAllByRole("listitem");

    expect(filas[0]).toHaveTextContent("Hito en disputa");
    expect(filas[0]).toHaveTextContent("“No calcula los envíos”");
    expect(filas[1]).toHaveTextContent("Hito pagado");
  });

  it("al admin le avisa de las disputas abiertas de la plataforma", () => {
    hitos = [];
    render(<InicioSecciones cobrosActivos disputasAbiertas={2} />);

    expect(lista().getByText("2 hitos en disputa")).toBeInTheDocument();
    expect(lista().getByRole("link", {name: "Revisar"})).toHaveAttribute(
      "href",
      "/dashboard/disputas",
    );
  });

  it("sin nada pendiente, está al día", () => {
    hitos = [];
    render(<InicioSecciones cobrosActivos disputasAbiertas={0} />);

    expect(screen.getByText("Estás al día.")).toBeInTheDocument();
  });
});
