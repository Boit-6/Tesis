// Pago protegido por hitos (etapa 11). Las mismas reglas que valida
// definir_cobro() en la base (db/schema.sql §12): hasta 10 hitos, título de 3
// a 120 caracteres y monto de al menos US$ 1 con hasta dos decimales. Acá se
// validan antes de mandar, para mostrar el error al lado del campo; la base
// vuelve a validar igual.
import type {HitoEstado, HitoEvento} from "@/types/supabase";

export const MAX_HITOS = 10;

export interface HitoBorrador {
  titulo: string;
  monto: string;
}

const formatoEntero = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const formatoCentavos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// «US$ 300» o «US$ 500,50»: con centavos, siempre los dos decimales.
export function usd(valor: number): string {
  return (Math.round(valor * 100) % 100 ? formatoCentavos : formatoEntero).format(valor);
}

// El monto tal como lo escribió el desarrollador. Admite la coma decimal
// («1500,50»). null = no es un monto válido.
export function leerMonto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");

  if (!/^\d{1,9}(\.\d{1,2})?$/.test(limpio)) return null;
  const valor = Number(limpio);

  return valor >= 1 ? valor : null;
}

export function totalHitos(hitos: HitoBorrador[]): number {
  // En centavos, para que 0.1 + 0.2 no dé 0.30000000000000004.
  const centavos = hitos.reduce((suma, h) => suma + Math.round((leerMonto(h.monto) ?? 0) * 100), 0);

  return centavos / 100;
}

// El primer problema de la lista, o null si se puede mandar.
export function problemaHitos(hitos: HitoBorrador[]): string | null {
  if (hitos.length === 0) return "Agregá al menos un hito.";
  if (hitos.length > MAX_HITOS) return `Hasta ${MAX_HITOS} hitos por proyecto.`;
  for (const [i, h] of hitos.entries()) {
    const largo = h.titulo.trim().length;

    if (largo < 3 || largo > 120)
      return `El hito ${i + 1} necesita un título de 3 a 120 caracteres.`;
    if (leerMonto(h.monto) === null) {
      return `El monto del hito ${i + 1} tiene que ser de al menos US$ 1, con hasta dos decimales.`;
    }
  }

  return null;
}

// Lo que se manda a definir_cobro().
export function hitosParaEnviar(hitos: HitoBorrador[]): {titulo: string; monto: number}[] {
  return hitos.map((h) => ({
    titulo: h.titulo.trim(),
    monto: leerMonto(h.monto) ?? 0,
  }));
}

// Cómo se muestra cada estado, del lado del cliente y del desarrollador.
export const ESTADO_HITO: Record<HitoEstado, string> = {
  PENDIENTE: "Sin pagar",
  FONDEADO: "Pagado, en curso",
  ENTREGADO: "Entregado",
  EN_DISPUTA: "En disputa",
  LIBERADO: "Liberado",
  REEMBOLSADO: "Reembolsado",
  ANULADO: "Anulado",
};

// La línea de tiempo de cada hito.
export const EVENTO_HITO: Record<HitoEvento["tipo"], string> = {
  fondeado: "Pagado: la plata queda retenida",
  entregado: "Entregado",
  aprobado: "Aprobado: se libera al desarrollador",
  liberado_solo: "Liberado solo (pasó el plazo sin respuesta)",
  disputado: "Disputa abierta",
  resuelto: "Disputa resuelta por la plataforma",
  devuelto: "Devuelto al cliente",
  anulado: "Anulado",
  transferido: "Transferido al desarrollador",
  reembolsado: "Reembolsado al cliente",
};

// Color del estado, con los tonos del tema.
export const COLOR_HITO: Record<HitoEstado, string> = {
  PENDIENTE: "text-mist",
  FONDEADO: "text-ochre",
  ENTREGADO: "text-ochre-deep",
  EN_DISPUTA: "text-brick",
  LIBERADO: "text-moss",
  REEMBOLSADO: "text-muted",
  ANULADO: "text-mist line-through",
};

// Cómo resuelve el admin una disputa (etapa 11, paso 5): todo al
// desarrollador, todo de vuelta al cliente o una parte para cada uno.
export type OpcionDisputa = "liberar" | "reembolsar" | "partir";

// Lo que se libera al desarrollador y lo que vuelve al cliente, o null si el
// monto de «partir» no es válido: más de 0 y menos que el total, con hasta
// dos decimales (con 0 o con el total, es reembolsar o liberar todo).
export function repartoDisputa(
  opcion: OpcionDisputa,
  parteTexto: string,
  total: number,
): {liberar: number; reembolsar: number} | null {
  if (opcion === "liberar") return {liberar: total, reembolsar: 0};
  if (opcion === "reembolsar") return {liberar: 0, reembolsar: total};

  const limpio = parteTexto.trim().replace(",", ".");

  if (!/^\d{1,9}(\.\d{1,2})?$/.test(limpio)) return null;
  const centavos = Math.round(Number(limpio) * 100);
  const totalCentavos = Math.round(total * 100);

  if (centavos <= 0 || centavos >= totalCentavos) return null;

  return {
    liberar: centavos / 100,
    reembolsar: (totalCentavos - centavos) / 100,
  };
}
