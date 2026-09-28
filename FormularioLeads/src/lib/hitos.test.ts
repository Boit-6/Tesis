import {describe, expect, it} from "vitest";

import {hitosParaEnviar, leerMonto, problemaHitos, totalHitos} from "./hitos";

describe("leerMonto", () => {
  it("acepta enteros, punto y coma decimal", () => {
    expect(leerMonto("300")).toBe(300);
    expect(leerMonto(" 500.5 ")).toBe(500.5);
    expect(leerMonto("1500,75")).toBe(1500.75);
  });

  it("rechaza lo que la base no acepta", () => {
    expect(leerMonto("")).toBeNull();
    expect(leerMonto("0.99")).toBeNull();
    expect(leerMonto("10.555")).toBeNull();
    expect(leerMonto("-5")).toBeNull();
    expect(leerMonto("1e3")).toBeNull();
    expect(leerMonto("1.000,50")).toBeNull();
  });
});

describe("totalHitos", () => {
  it("ignora los montos inválidos y suma sin errores de coma flotante", () => {
    expect(
      totalHitos([
        {titulo: "a", monto: "0.1"},
        {titulo: "b", monto: "1.2"},
      ]),
    ).toBe(1.2);
    expect(
      totalHitos([
        {titulo: "Diseño", monto: "300.10"},
        {titulo: "Desarrollo", monto: "500,20"},
      ]),
    ).toBe(800.3);
  });
});

describe("problemaHitos", () => {
  const bien = {titulo: "Diseño", monto: "300"};

  it("sin problemas, null", () => {
    expect(problemaHitos([bien, {titulo: "Desarrollo", monto: "700"}])).toBeNull();
  });

  it("pide al menos uno y no más de 10", () => {
    expect(problemaHitos([])).toMatch(/al menos un hito/);
    expect(problemaHitos(Array.from({length: 11}, () => bien))).toMatch(/Hasta 10/);
  });

  it("señala el hito con el problema", () => {
    expect(problemaHitos([bien, {titulo: "ab", monto: "10"}])).toMatch(/hito 2 .*título/);
    expect(problemaHitos([bien, {titulo: "Publicación", monto: "0"}])).toMatch(/monto del hito 2/);
  });
});

describe("hitosParaEnviar", () => {
  it("recorta los títulos y convierte los montos", () => {
    expect(hitosParaEnviar([{titulo: "  Diseño ", monto: "1,5"}])).toEqual([
      {titulo: "Diseño", monto: 1.5},
    ]);
  });
});
