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

## Modo con pasarela real (Stripe)

Además del doble de contrato, existe un segundo instrumento:
`tests/adaptador-stripe-e14.mjs`. Habla el mismo contrato HTTP hacia n8n que
`mp-doble.mjs` —los mismos dos endpoints, los mismos auxiliares `/__estado` y
`/__reset`— pero cada llamada dispara una llamada real a la API de Stripe en
modo de prueba: el pago **ocurre** (tarjeta de prueba oficial, PaymentIntent
real), no se fabrica un `status: 'approved'` fijo. La receta es la misma, sólo
cambia el instrumento y el puerto:

```bash
# 1. Adaptador de Stripe (necesita STRIPE_TEST_SECRET_KEY en .env, sk_test_...)
node tests/adaptador-stripe-e14.mjs   # queda escuchando en :8798

# 2. n8n apuntado al adaptador (mismo MP_ACCESS_TOKEN no vacío que en el paso 2 de arriba)
MP_API_BASE=http://host.docker.internal:8798 \
MP_ACCESS_TOKEN=TEST-stripe-e14-local \
  docker compose up -d --force-recreate n8n

# 3. Los mismos tres flujos auxiliares del paso 3 de arriba (si no están ya importados)

# 4. El mismo escenario, apuntado al adaptador en vez del doble
MP_DOBLE_BASE=http://localhost:8798 node tests/e14-cobro-mp.mjs
```

`tests/e14-cobro-mp.mjs` no necesita ningún cambio para esto: ya lee
`MP_DOBLE_BASE` de una variable de entorno, y el adaptador responde con la
misma forma que el doble. Por qué Stripe y no MercadoPago real, qué acredita
esta corrida y qué no, y la restricción del id numérico del pago están
documentadas en la cabecera de `tests/adaptador-stripe-e14.mjs`.

## Alcance

Hay dos instrumentos y acreditan cosas distintas. Contra el **doble**
(`mp-doble.mjs`), la corrida verifica el **artefacto** contra el contrato
documentado de la API de MercadoPago, con el desenlace del pago fabricado.
Contra el **adaptador de Stripe**, la corrida verifica además que esa misma
lógica de cobro —idempotencia, el gate `status === 'approved'`, el ciclo
preferencia→confirmación completo— funciona correctamente cuando la respalda
un pago real de una pasarela real, no fabricado. Ninguna de las dos corridas
verifica el servicio real de **MercadoPago**: esa validación sigue pendiente
y así está declarada en la tesis (Capítulo 8, punto 6).
