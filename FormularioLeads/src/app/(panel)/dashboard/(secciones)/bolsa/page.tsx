import EncabezadoPagina from "../../encabezado-pagina";

import BolsaTablero from "./bolsa-tablero";

export default function BolsaPage() {
  return (
    <>
      <EncabezadoPagina
        bajada="Pedidos que otros desarrolladores no pudieron tomar. Los datos del cliente se ven recién si te elige."
        titulo="Bolsa"
      />
      <BolsaTablero />
    </>
  );
}
