// Pago protegido por hitos (etapa 11). Las mismas reglas que valida
// definir_cobro() en la base (db/schema.sql §12): hasta 10 hitos, título de 3
// a 120 caracteres y monto de al menos US$ 1 con hasta dos decimales. Acá se
// validan antes de mandar, para mostrar el error al lado del campo; la base
// vuelve a validar igual.
import type {HitoEstado} from "@/types/supabase";

export const MAX_HITOS = 10;

export interface HitoBorrador {
  titulo: string;
  monto: string;
}

const formatoUsd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function usd(valor: number): string {
  return formatoUsd.format(valor);
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
