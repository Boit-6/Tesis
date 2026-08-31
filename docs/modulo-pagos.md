# Cobro con MercadoPago (RAMA 8)

El pago dejó de ser simulado. El link de la factura es ahora una **preferencia
real de MercadoPago** (Checkout Pro): el cliente paga con tarjeta o los medios
que habilite su cuenta, y una **notificación de MercadoPago** —no el navegador
del cliente— es lo que marca la factura como cobrada.

Sin `MP_ACCESS_TOKEN` configurado, el sistema sigue funcionando exactamente
como antes (modo de desarrollo): el link marca la factura cobrada a mano. En
cuanto se completan las credenciales reales, el link pasa a ser el checkout
real sin tocar código ni reimportar nada.

---

## 1. Cómo funciona

### Al aceptar la propuesta (RAMA 2)

1. `Code - Generar ID Factura` arma el `factura_id`, calcula la
   `comision_plataforma` (`MP_COMISION_PORCENTAJE` % del monto) y arma el
   cuerpo de la preferencia de MercadoPago.
2. `HTTP - MercadoPago Crear Preferencia` la crea contra
   `POST /checkout/preferences` con `MP_ACCESS_TOKEN`. Si falla (token
   vacío, inválido, o MercadoPago no responde) el nodo sigue con
   `onError: continuar` — la aceptación de la propuesta **nunca** se cae por
   esto.
3. `Code - Resolver Link de Pago` usa el `init_point` que devolvió MP como
   link de pago. Si no hay `init_point` (paso 2 falló o no hay token), cae al
   link de desarrollo (`/webhook/pago-confirmado?factura_id=...`), el mismo
   que existía antes de este cambio.
4. La factura PDF y el email salen igual que siempre; sólo cambia a dónde
   apunta el botón **Pagar ahora**.
5. `Postgres - Insert Factura` guarda `mp_preference_id`, `comision_plataforma`
   y la `moneda` real del cobro (`MP_CURRENCY`) junto con el resto de la
   factura.

### Al confirmarse el pago (nuevo webhook)

MercadoPago llama a `POST /webhook/mp/notificacion` cuando el estado de un
pago cambia:

1. `Code - Leer Notificacion MP` saca el `payment_id` del body (Webhooks v2:
   `{type:"payment", data:{id}}`) o de la query (IPN vieja: `?topic=payment&id=`).
   Si `MP_WEBHOOK_SECRET` está configurado, valida la firma (`x-signature`)
   antes de seguir; sin secreto, no valida (modo por defecto).
2. `HTTP - MercadoPago Obtener Pago` consulta `GET /v1/payments/{id}` — la
   fuente de verdad es la API de MercadoPago, nunca lo que mande el body de
   la notificación (que no está firmado punto a punto).
3. `Code - Procesar Pago MP` sólo deja pasar el pago si `status = approved` y
   trae un `external_reference` (el `factura_id`).
4. `Postgres - Marcar Cobrado MP` hace el mismo `UPDATE ... WHERE estado_pago
   = 'PENDIENTE'` idempotente que ya usaba el modo de desarrollo — una
   notificación repetida (MercadoPago reintenta) no vuelve a disparar el
   Telegram ni la sincronización con Notion.
5. Si aplicó, reusa los mismos nodos de siempre: `Telegram - Pago Recibido`
   y `Postgres - Buscar Card Pago` → `Notion - Estado Pagado`.
6. Responde `200 {"ok":true|false}` siempre — MercadoPago reintenta si no
   recibe 2xx, así que un pago `pending` o una firma inválida responden OK
   igual (sin marcar nada) para no generar reintentos infinitos.

---

## 2. La comisión de la plataforma

`comision_plataforma` = `monto × MP_COMISION_PORCENTAJE / 100` (1% por
defecto), calculada al facturar y guardada en `facturas.comision_plataforma`.

**Es contable, no una transferencia real.** MercadoPago no separa el cobro
entre dos cuentas: todo el monto entra a la cuenta configurada en
`MP_ACCESS_TOKEN`. La comisión queda anotada para liquidarla aparte —
visible por factura (`facturas.comision_plataforma`) y agregada por mes en
`metrics_mensuales.comision_cobrada` (suma sólo sobre lo efectivamente
`COBRADO`).

> Split real (que MercadoPago separe el cobro solo entre dos cuentas
> distintas) existe vía su API de Marketplace, pero requiere que la cuenta
> que cobra autorice por OAuth a una aplicación de MercadoPago aparte —
> bastante más superficie para poco beneficio mientras el sistema sea de un
> solo freelance. Si en algún momento hay varios freelances cobrando cada
> uno a su propia cuenta (ver `roadmap-mejoras.md` #4, multi-usuario), ahí sí
> vale la pena migrar a ese modelo.

---

## 3. Configuración

| Variable | Default | Qué hace |
|---|---|---|
| `MP_ACCESS_TOKEN` | *(vacía)* | Credencial de la cuenta de MercadoPago que cobra. Vacía = modo de desarrollo (sin MercadoPago real). |
| `MP_CURRENCY` | `ARS` | `currency_id` de la preferencia; tiene que coincidir con el país de la cuenta. |
| `MP_COMISION_PORCENTAJE` | `1` | % del monto que se anota como comisión de la plataforma. |
| `MP_WEBHOOK_SECRET` | *(vacía)* | Firma secreta para validar `POST /webhook/mp/notificacion`. Vacía = no se valida (no recomendado en producción). |

`MP_WEBHOOK_SECRET` valida la firma con `require('crypto')` dentro de un nodo
`Code`; hace falta `NODE_FUNCTION_ALLOW_BUILTIN=crypto` en el entorno de n8n
(ya está en `docker-compose.yml`).

Las credenciales salen del panel de developers de MercadoPago
(`https://www.mercadopago.com.ar/developers` → Tus integraciones → tu
aplicación → Credenciales). Las de **prueba** alcanzan para validar el flujo
de punta a punta con una tarjeta de test antes de pasar a las de producción.

---

## 4. Puesta en marcha

1. Crear una aplicación en el panel de developers de MercadoPago.
2. Copiar el Access Token (de prueba primero) a `MP_ACCESS_TOKEN` en el
   `.env` junto al `docker-compose.yml`.
3. `docker compose up -d` (o reiniciar si ya estaba arriba) para que n8n
   tome la variable.
4. Reimportar `workflow/crm_postgres.json` (o sincronizar si n8n está
   conectado a git) y publicar.
5. `db/schema.sql` es idempotente: correrlo de nuevo agrega
   `mp_preference_id`, `mp_payment_id` y `comision_plataforma` a una base ya
   existente sin tocar los datos.
6. Aceptar una propuesta de prueba: el link de la factura tiene que ser un
   checkout de MercadoPago, no el webhook de desarrollo.

---

## 5. Pruebas

`tests/smoke_code_nodes.js` ejecuta el JavaScript real de los nodos `Code`
nuevos (`Code - Generar ID Factura`, `Code - Resolver Link de Pago`, `Code -
Leer Notificacion MP`, `Code - Procesar Pago MP`) con mocks de `$env`/`$input`.
`tests/verificar_sql.mjs` compila la consulta de `Postgres - Marcar Cobrado
MP` contra el esquema real. Ninguno de los dos necesita credenciales de
MercadoPago: validan que el código corre y que el SQL es válido, no que un
pago real se apruebe.

El escenario `pago-idempotente` de `tests/escenarios.mjs` sigue probando el
modo de desarrollo (`GET /webhook/pago-confirmado`), que no cambió: es lo que
permite validar la idempotencia end-to-end sin depender de una cuenta de
MercadoPago en CI.

**Escenario E14 (rama de cobro), dos instrumentos.** `tests/e14-cobro-mp.mjs`
ejercita los nodos reales de esta sección de punta a punta contra dos
backends intercambiables (`MP_API_BASE` apunta a uno u otro, sin tocar el
flujo): `tests/mp-doble.mjs` fabrica el desenlace del pago (`status:
'approved'` fijo) y no necesita ninguna credencial; `tests/adaptador-stripe-
e14.mjs` habla el mismo contrato hacia n8n pero por dentro llama a la API
real de Stripe en modo de prueba, de modo que el pago ocurre de verdad
(tarjeta de prueba oficial, PaymentIntent real) en vez de fabricarse. Ninguno
de los dos prueba el servicio real de MercadoPago —eso sigue exigiendo la
tarjeta de prueba desde el navegador con una cuenta real, hoy bloqueada por
la falla de activación del proveedor (§5.3)—, pero el adaptador de Stripe sí
prueba que la lógica de cobro del artefacto sostiene un ciclo de vida de pago
real y no sólo el que el doble le fabrica. Ver `tests/fixtures-e14/README.md`
para la receta de cada uno.
