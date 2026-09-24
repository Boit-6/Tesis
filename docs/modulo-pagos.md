# Cobro con Stripe Connect (RAMA 8)

Desde el 24-sep-2026 la plataforma es compartida: cada desarrollador cobra sus
propias facturas. El cobro pasó de MercadoPago a **Stripe Connect**, en dólares:

- cada desarrollador conecta **su** cuenta de Stripe (Express) desde el panel;
- lo que paga su cliente va a esa cuenta;
- la plataforma se queda con su comisión (`COMISION_PLATAFORMA_PORCENTAJE`, 1%
  por defecto), que Stripe separa sola en el momento del cobro
  (`application_fee_amount`).

Con MercadoPago la comisión era sólo contable (quedaba anotada para liquidar
aparte) y todo cobraba una única cuenta. MercadoPago Argentina, además, cobra
sólo en pesos.

Sin `STRIPE_SECRET_KEY`, el sistema funciona igual que antes en desarrollo: el
enlace de la factura lleva al pago simulado.

---

## 1. Cómo funciona

### Alta de cobros del desarrollador

Desde **Tu espacio → Cobros online**, el panel llama a `/api/crm/stripe-conectar`.
El route handler le pone el espacio de la sesión (lo que mande el navegador se
ignora) y lo reenvía a n8n con la credencial del panel:

1. `🏦 Webhook - Stripe Conectar` busca el espacio. Si todavía no tiene cuenta,
   la crea (`POST /v1/accounts`, `type=express`, con `Idempotency-Key` por
   espacio: dos clics no crean dos cuentas) y la guarda en
   `espacios.stripe_account_id`.
2. Pide un enlace de onboarding (`POST /v1/account_links`) y el panel redirige
   al desarrollador a Stripe.
3. Stripe lo devuelve a `/dashboard/espacio?stripe=volvio`. El panel llama a
   `stripe-estado`, que lee la cuenta (`GET /v1/accounts/{id}`) y guarda
   `stripe_cobros_activos` (= `charges_enabled`).

El desarrollador no puede escribir `stripe_account_id` ni
`stripe_cobros_activos` (GRANT por columna): si pudiera, cobraría en la cuenta
de otro.

### Emisión de la factura

`Code - Generar ID Factura` arma la factura en USD con su comisión, y
`Code - Resolver Link de Pago` le pone un **enlace propio**:
`<N8N_PUBLIC_URL>webhook/pagar?f=<factura_id>&t=<pago_token>`.

Al emitir no se crea nada en Stripe. Una sesión de Checkout dura como mucho 24
horas y la factura vence en días: si se creara al emitir, el enlace del correo
se vencería antes que la factura.

### El cliente abre el enlace (`💳 Webhook - Pagar Factura`)

`Code - Decidir Pago` resuelve, con la factura y el espacio de la base:

| Caso | Respuesta |
|---|---|
| factura y token no coinciden | 404 "Enlace inválido" |
| ya COBRADO | "Factura pagada" |
| ANULADA | 410 "Factura anulada" |
| sin `STRIPE_SECRET_KEY` | 303 al pago simulado (modo de desarrollo) |
| el desarrollador no habilitó los cobros | "Pago online no disponible", con la indicación de responder el correo |
| todo en orden | crea la sesión de Checkout y redirige (303) |

La sesión es un *destination charge*: `transfer_data[destination]` es la cuenta
del desarrollador y `application_fee_amount` la comisión. El importe sale de la
base, nunca del enlace. `Postgres - Guardar Checkout` guarda la sesión en
`facturas.stripe_checkout_id`.

### Stripe confirma el pago (`💳 Webhook - Stripe`)

Stripe manda `checkout.session.completed` al webhook de la **plataforma** (con
destination charges, la sesión es de la cuenta de la plataforma).
`Code - Verificar Evento Stripe`:

- verifica `Stripe-Signature` (HMAC SHA-256 de `<t>.<cuerpo crudo>` con
  `STRIPE_WEBHOOK_SECRET`, comparación en tiempo constante). El webhook tiene
  `rawBody` porque la firma es sobre el cuerpo tal cual llegó;
- rechaza con 400 si no hay secreto configurado, si la firma no coincide o si
  tiene más de 5 minutos (un evento viejo reenviado no sirve);
- ignora con 200 lo que no es un pago acreditado, para que Stripe no reintente.

`Postgres - Marcar Cobrado Stripe` marca COBRADO sólo desde PENDIENTE o VENCIDA,
y sólo si el monto y la moneda coinciden con la factura (`metodo_cobro =
'STRIPE'`, `stripe_pago_id` = el PaymentIntent). Es idempotente: el reintento
de un pago ya registrado no hace nada.

### Un pago confirmado que no se pudo aplicar

Si el pago no marcó la factura, `Code - Clasificar Pago No Aplicado` distingue
el reintento esperable (mismo PaymentIntent, ya registrado: no se avisa) de lo
que no puede pasar en silencio: factura ANULADA, inexistente, ya cobrada con
otro pago (pago doble) o un importe distinto. Esos casos quedan en `logs` y
generan un aviso **crítico**, que le llega al desarrollador y a la plataforma:
la plata ya entró y puede corresponder un reembolso.

### Anulación

Al anular una factura, si tiene una sesión de Checkout guardada,
`HTTP - Stripe Expirar Checkout` la expira (`POST
/v1/checkout/sessions/{id}/expire`). Así un cliente que había abierto el enlace
antes no puede pagar la factura anulada. Si la sesión ya no estaba abierta,
Stripe responde error y el nodo sigue.

---

## 2. Configuración

| Variable | Para qué |
|---|---|
| `STRIPE_SECRET_KEY` | Clave de la cuenta de Stripe de la plataforma, con Connect activado. Vacía = pago simulado. |
| `STRIPE_WEBHOOK_SECRET` | Secreto del endpoint `<N8N_PUBLIC_URL>webhook/stripe` (evento `checkout.session.completed`). Obligatorio. |
| `STRIPE_API_BASE` | Vacía = `https://api.stripe.com`. Sólo cambia para usar el doble local. |
| `COMISION_PLATAFORMA_PORCENTAJE` | Comisión de la plataforma (1 por defecto). |
| `NEXT_PUBLIC_COMISION_PORCENTAJE` | La misma, para mostrársela al desarrollador en el panel. |

Pasos en Stripe: activar Connect en la cuenta de la plataforma, crear el
endpoint del webhook y copiar su secreto.

---

## 3. Cómo se verificó

- `tests/firmas.mjs`: el nodo real de verificación con firmas válidas, falsas,
  truncadas, viejas y ausentes, y con eventos que no son un pago.
- `tests/idempotencia.mjs`: la consulta real de cobro (PENDIENTE, VENCIDA,
  ANULADA, monto o moneda distintos, pago doble, reintento) y la
  clasificación de lo que no se aplicó.
- `tests/stripe-doble.mjs`: un doble de la API de Stripe (cuentas, onboarding,
  Checkout, expiración y el evento firmado) con el que se probó el circuito de
  punta a punta contra n8n y la base: alta de la cuenta, factura, pago,
  confirmación, avisos, enlace ya pagado, firma falsa, espacio sin cobros y
  anulación con una sesión abierta.

**Pendiente:** la prueba con una cuenta de Stripe real en modo de prueba. El
doble reproduce el contrato documentado, pero no reemplaza a Stripe.

---

## 4. Historia

Hasta el 24-sep-2026 el cobro era con MercadoPago (Checkout Pro): la
preferencia se creaba al emitir la factura, la notificación se verificaba
consultando el pago en la API de MercadoPago y la comisión era sólo contable.
Las columnas `mp_preference_id` y `mp_payment_id` quedan en `facturas` por las
facturas emitidas en esa etapa, que están en ARS.
