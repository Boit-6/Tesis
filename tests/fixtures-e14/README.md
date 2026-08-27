# Andamiaje del escenario E14 (cobro con MercadoPago)

Estos tres flujos **no forman parte del sistema**: son andamiaje de prueba para
poder ejecutar el escenario E14 sin depender de la activación de credenciales de
prueba de MercadoPago, que falla del lado del proveedor (§5 de la tesis).

Se importan en la instancia local de n8n, se usan y se borran. Se versionan acá
para que la corrida sea reproducible por un tercero.

| Archivo | Webhook | Para qué |
|---|---|---|
| `preferencia-mp.json` | `POST /webhook/verif-mp-base` | Ejercita el nodo real `HTTP - MercadoPago Crear Preferencia` de forma aislada, para verificar que `MP_API_BASE` enruta al doble. |
| `sembrar-factura-e14.json` | `POST /webhook/sembrar-e14` | Siembra la factura `PENDIENTE` que E14 toma como precondición. |
| `consulta-e14.json` | `GET /webhook/consulta-e14?email=…` | Consulta de sólo lectura del lead y su factura, para verificar el estado en la base. |

## Por qué hace falta sembrar la factura

Los nodos `Gmail - Enviar Propuesta` y `Gmail - Enviar Factura PDF` detienen la
cadena si fallan (comportamiento por defecto de n8n, sin `onError`). Con la
credencial OAuth de Gmail vencida —como ocurre en el entorno de desarrollo— el
flujo no llega a `Insert Factura`, de modo que la factura no puede producirse
recorriendo el camino completo.

La emisión de la factura por el camino completo es lo que verifica **E5**, ya
ejecutado. Lo que **E14** verifica es la rama de cobro, y esa sí se ejercita de
punta a punta con los nodos reales: creación de la preferencia, notificación,
consulta del pago contra la API, transición a `COBRADO` e idempotencia.

## Cómo correr E14

```bash
# 1. Doble de la API de MercadoPago
node tests/mp-doble.mjs            # queda escuchando en :8799

# 2. n8n apuntado al doble (MP_ACCESS_TOKEN no vacío para no caer al modo dev)
MP_API_BASE=http://host.docker.internal:8799 \
MP_ACCESS_TOKEN=TEST-doble-e14-local \
  docker compose up -d --force-recreate n8n

# 3. Importar y publicar los tres flujos de esta carpeta, y reiniciar n8n
for f in tests/fixtures-e14/*.json; do
  docker cp "$f" n8n:/tmp/ && docker exec n8n n8n import:workflow --input=/tmp/$(basename "$f")
done
docker exec n8n n8n publish:workflow --id=tmpConsultaE14
docker exec n8n n8n publish:workflow --id=tmpSembrarE14
docker exec n8n n8n publish:workflow --id=tmpVerifMpBase
docker compose restart n8n

# 4. Correr el escenario
node tests/e14-cobro-mp.mjs
```

Al terminar conviene borrar los tres flujos auxiliares de la instancia y volver
a levantar n8n sin las variables `MP_*` para restituir el modo de desarrollo.

## Alcance

La corrida verifica el **artefacto** contra el contrato documentado de la API de
MercadoPago. **No** verifica el servicio real del proveedor: esa validación
sigue pendiente y así está declarada en la tesis.
