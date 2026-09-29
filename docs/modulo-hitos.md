# Pago protegido por hitos (etapa 11, RAMA 14)

Desde el 28-sep-2026 un proyecto se puede cobrar **por hitos**. El
desarrollador divide el trabajo en hasta 10 partes. El cliente paga cada una
por adelantado y la plataforma **retiene** la plata hasta que el cliente
aprueba la entrega: recién ahí se transfiere al desarrollador, menos la
comisión. Si hay un desacuerdo, el cliente abre una **disputa** y la resuelve
el admin de la plataforma.

- Es **obligatorio** en los proyectos que llegaron por la plataforma (la bolsa
  o `/publicar`). Con sus clientes propios, el desarrollador elige entre hitos
  y la factura única de siempre ([`modulo-pagos.md`](modulo-pagos.md)).
- La comisión es del **5 %** sobre lo liberado (`app.comision_hitos`); la
  factura única sigue en 1 %. Se fija al crear el hito: cambiarla no toca lo
  ya acordado.
- Si el cliente no aprueba ni disputa, la entrega se **libera sola a los 7
  días** (`app.hitos_dias_liberacion`).
- Es una simulación: Stripe Connect en modo prueba o, sin claves, el doble
  local `tests/stripe-doble.mjs`.

---

## 1. Estados

```
PENDIENTE ──pago──▶ FONDEADO ──entrega──▶ ENTREGADO ──aprobación o 7 días──▶ LIBERADO
    │                  │                      │
  anular           devolver ─────────────▶ REEMBOLSADO
    ▼                  └──── disputa ────▶ EN_DISPUTA ──resolución del admin──▶ LIBERADO / REEMBOLSADO
 ANULADO                                      (o el desarrollador devuelve)
```

- El cliente puede disputar un hito pagado o entregado. El desarrollador puede
  devolver la plata de uno pagado, entregado o en disputa.
- **LIBERADO** puede tener una parte reembolsada: una disputa partida deja,
  por ejemplo, 250 para el desarrollador y 250,50 de vuelta al cliente.
- Un hito cerrado reparte el monto entero (`monto_liberado + monto_reembolsado
  = monto`, con un CHECK en la tabla).
- Con todos los hitos cerrados, el proyecto pasa a CERRADO y se puede calificar.

Nadie escribe `hitos` ni `hitos_eventos` directo: todo pasa por funciones
SECURITY DEFINER que deciden quién llama (desarrollador, cliente o admin) y qué
puede hacer en cada estado. Cada paso deja un evento en `hitos_eventos`: es la
línea de tiempo que ven las partes y la cola de los avisos.

## 2. Cómo circula la plata

| Paso | Quién | Pieza |
|---|---|---|
| Arma los hitos en la propuesta | desarrollador | `definir_cobro()` desde `form-propuesta.tsx` |
| Paga un hito (en orden) | cliente, en `/proyecto/<token>` | webhook `hito-pagar` → Checkout de la plataforma, sin `transfer_data` |
| Stripe confirma el pago | n8n | webhook `stripe` → `hito_fondeado()` (idempotente; sólo si el monto coincide) |
| Entrega, devuelve o anula | desarrollador, en el detalle del lead | `entregar_hito()`, `devolver_hito()`, `anular_hito()` |
| Aprueba o disputa | cliente, en `/proyecto/<token>` | `aprobar_hito()`, `disputar_hito()` |
| Resuelve una disputa | admin, en `/dashboard/disputas` | `resolver_disputa()` |
| Libera lo vencido y mueve la plata | 💸 Cron - Hitos (cada 5 min) | `liberar_vencidos()`, `hitos_por_mover()`, `hito_movido()` |

La base **decide y registra**; la plata la mueve n8n. Una decisión que mueve
plata deja una marca pendiente (`monto_liberado` sin `stripe_transfer_id`,
`monto_reembolsado` sin `stripe_reembolso_id`) y el cron la ejecuta:

- **transferir** al desarrollador lo liberado menos la comisión
  (`POST /v1/transfers`);
- **reembolsar** al cliente sobre el pago original (`POST /v1/refunds`).

La clave de idempotencia es el id del hito más el movimiento: si el cron corre
dos veces, Stripe devuelve el mismo objeto, y `hito_movido()` lo registra una
sola vez. Un movimiento que falla queda en `logs` y se reintenta en la próxima
pasada.

## 3. Disputas (paso 5)

### Quién hace qué

- **El cliente** abre la disputa desde `/proyecto/<token>` con un motivo (10 a
  2000 caracteres). Puede hacerlo con el hito pagado, aunque todavía no se haya
  entregado. La plata sigue retenida y el cron ya no la libera sola.
- **El desarrollador** ve «Hito en disputa» como urgente en su Inicio y, en el
  detalle del lead, puede darle la razón al cliente y **devolver** la plata.
  Eso cierra la disputa sin el admin.
- **El admin de la plataforma** (`profiles.role = 'admin'`) la resuelve desde
  la sección **Disputas** del panel.

### La sección `/dashboard/disputas`

Sólo existe para el admin: el menú la muestra con un contador y cualquier otra
cuenta recibe la página 404. La base vuelve a exigir el rol en cada función
(`exigir_admin()`), así que la página no es la única barrera.

Cada disputa abierta muestra el motivo del cliente y la entrega del
desarrollador. Al revisarla se ve también:

- los otros hitos del proyecto, con el disputado marcado;
- el historial del hito (pago, entrega, disputa…);
- la conversación entre las partes: la de la postulación elegida en la bolsa.
  Un cliente propio no tiene conversación en la plataforma.

Para resolver, el admin elige una de tres opciones:

| Opción | Al desarrollador | Al cliente |
|---|---|---|
| Liberar todo | el monto | 0 |
| Reembolsar todo | 0 | el monto |
| Partir | lo que indique (más de 0 y menos que el monto) | el resto |

La pantalla muestra el reparto antes de confirmar, incluido lo que le llega al
desarrollador después de la comisión. La **nota** es obligatoria (5 a 2000
caracteres) y les llega a las dos partes. Como mueve plata, pide una
confirmación.

La pestaña **Resueltas** lista las cerradas, también las que cerró el
desarrollador devolviendo: quién resolvió (`hitos.resuelto_por`), cuánto fue a
cada parte, la nota y si la plata ya se movió en Stripe.

### Un proyecto propio del admin

El admin también es desarrollador. Una disputa de un proyecto suyo la ve en la
lista, pero **no la puede resolver**: sería juez y parte. La pantalla lo
explica y le indica que, como desarrollador, puede devolver la plata. Esas
disputas no suman en su contador (`puede_resolver` en `disputas_abiertas()`).

### Privacidad de la conversación

`disputa_detalle()` es el único acceso del admin a mensajes ajenos. Se limita
a hitos que se disputaron y sólo trae la conversación de la postulación
elegida; los mensajes con otros postulantes del mismo pedido quedan afuera
(caso de RLS en la sección 30 de `tests/rls/casos.sql`).

### Avisos

`resolver_disputa()` deja un evento `resuelto` y las marcas de transferencia y
reembolso. En su próxima pasada, la RAMA 14:

1. transfiere y reembolsa en Stripe;
2. le manda al cliente «Resolvimos la disputa del hito N» y «Te reembolsamos
   US$ X», con la marca del espacio;
3. le deja al desarrollador el aviso en el panel (y por correo o Telegram, si
   los tiene activos).

## 4. «Requiere tu atención»

El Inicio del panel suma lo que espera una acción de cada uno:

| Entrada | Para | Acción |
|---|---|---|
| Hito pagado | desarrollador | «Entregar»: abre el proyecto |
| Hito en disputa (urgente) | desarrollador | «Ver proyecto»: puede devolver la plata |
| Disputas por resolver (urgente) | admin | «Revisar»: va a `/dashboard/disputas` |

Los hitos entregados no aparecen: esperan al cliente. El panel está suscripto
a los cambios de `hitos` en tiempo real, así que un pago o una disputa del
cliente aparecen sin recargar (medido: 1,4 s, dentro de los 3 s del RNF6).

## 5. Funciones de la base

Todas en la sección 12 de `db/schema.sql`.

| Función | Quién la llama | Qué hace |
|---|---|---|
| `definir_cobro(lead, hitos)` | desarrollador | Arma los hitos antes de que el cliente acepte |
| `ver_proyecto(lead, token)` | las tres partes | La vista del proyecto según quién mira |
| `hito_para_cobrar`, `hito_fondeado` | n8n | Validan y registran el pago |
| `entregar_hito`, `devolver_hito`, `anular_hito` | desarrollador | — |
| `aprobar_hito`, `disputar_hito` | cliente (cuenta o token) | — |
| `disputas_abiertas()` | admin | Las abiertas, con `puede_resolver` |
| `disputas_resueltas(limite)` | admin | Las cerradas, las últimas primero (hasta 200) |
| `disputa_detalle(hito)` | admin | Hitos, historial y conversación de una disputa |
| `resolver_disputa(hito, liberar, nota)` | admin | Cierra la disputa y registra quién la resolvió |
| `liberar_vencidos`, `hitos_por_mover`, `hito_movido` | n8n (cron) | Liberación automática y movimientos en Stripe |

Internas, sin permiso para nadie de afuera: `proyecto_rol()`, `hito_cerrar()`
y `exigir_admin()`.

## 6. Pruebas

- `npm run test:rls`, sección 30: el ciclo completo de un proyecto con tres
  hitos (pago en orden, entrega, aprobación, disputa partida, liberación sola)
  y las barreras de cada rol. Evidencia en [`evidencia-rls.md`](evidencia-rls.md).
- `FormularioLeads`: `disputas-tablero.test.tsx` (las tres opciones, bordes del
  monto y de la nota, confirmación, error de la base, resueltas),
  `inicio-secciones.test.tsx`, `panel-shell.test.tsx` y `lib/hitos.test.ts`.
- En vivo, con el doble de Stripe: una disputa partida 250 / 250,50
  transfirió 237,50 y reembolsó 250,50 sobre el pago original, con los correos
  a las dos partes.

### El doble de Stripe en local

`stripe-doble` guarda el estado en memoria. Si el contenedor se reinicia,
pierde las cuentas y los pagos, y las transferencias o reembolsos del cron
fallan. Se vuelven a registrar desde la base con:

```sh
curl -X POST localhost:12111/__sembrar -H 'content-type: application/json' \
  -d '{"cuentas": ["acct_…"], "pagos": [{"payment_intent": "pi_…", "amount_total": 50050}]}'
```

(`amount_total` en centavos; las cuentas son las `espacios.stripe_account_id`
con los cobros activos y los pagos, los `hitos.stripe_pago_id`).
