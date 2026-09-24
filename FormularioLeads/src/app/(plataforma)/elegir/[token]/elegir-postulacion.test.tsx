import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const TOKEN = "09ff9bde-1075-493d-9095-41394e187c10";
const POSTULACION = "4029fcc2-2550-4cf1-9dfd-b9cd2b0b6658";

const pedido = (extra = {}) => ({
  status: "ok",
  estado: "EN_ELECCION",
  servicio: "desarrollo_web",
  presupuesto_rango: "1000_2000",
  presupuesto: "1000.00",
  resumen: "Web institucional para un estudio contable.",
  cliente_nombre: "Marta",
  elegido_nombre: null,
  postulaciones: [
    {
      id: POSTULACION,
      espacio: "Lucía Estudio",
      mensaje: "Hice webs parecidas.",
      precio: 1200,
      plazo: "3 semanas",
    },
  ],
  ...extra,
});

describe("ElegirPostulacion", () => {
  const envOriginal = {...process.env};

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = {...envOriginal, NEXT_PUBLIC_N8N_BASE: "http://n8n.local"};
  });

  afterEach(() => {
    process.env = {...envOriginal};
  });

  async function renderPagina(token = TOKEN) {
    const {default: ElegirPostulacion} = await import("./elegir-postulacion");

    return render(<ElegirPostulacion token={token} />);
  }

  it("con un token que no es un UUID, ni consulta: avisa que el enlace no sirve", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    await renderPagina("no-es-un-token");

    expect(screen.getByText("Este enlace no funciona.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra las postulaciones y, al confirmar, elige una", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("bolsa-elegir")
        ? new Response(JSON.stringify({status: "ok", espacio_nombre: "Lucía Estudio"}))
        : new Response(JSON.stringify(pedido())),
    );

    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();

    await renderPagina();

    expect(await screen.findByText("Lucía Estudio")).toBeInTheDocument();
    expect(screen.getByText("Plazo estimado: 3 semanas")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `http://n8n.local/webhook/bolsa-postulaciones?t=${TOKEN}`,
      expect.anything(),
    );

    // Dos pasos: elegir y confirmar. Un solo clic no manda nada.
    await user.click(screen.getByRole("button", {name: "Elegir a Lucía Estudio"}));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", {name: "Sí, elegir"}));

    expect(await screen.findByText("¡Listo!")).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({
      t: TOKEN,
      postulacion_id: POSTULACION,
    });
  });

  it("si ya eligió, dice con quién quedó y no ofrece elegir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify(pedido({estado: "ASIGNADO", elegido_nombre: "Lucía Estudio"})),
          ),
      ),
    );
    await renderPagina();

    expect(await screen.findByText("Ya elegiste.")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /Elegir a/})).not.toBeInTheDocument();
  });

  it("si la elección falla (otro la tomó antes), muestra el motivo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("bolsa-elegir")
          ? new Response(
              JSON.stringify({
                status: "invalido",
                mensaje: "El pedido ya se asignó.",
              }),
            )
          : new Response(JSON.stringify(pedido())),
      ),
    );

    const user = userEvent.setup();

    await renderPagina();
    await user.click(await screen.findByRole("button", {name: "Elegir a Lucía Estudio"}));
    await user.click(screen.getByRole("button", {name: "Sí, elegir"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("El pedido ya se asignó.");
  });
});
