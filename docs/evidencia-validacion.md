# Evidencia de validación funcional

> Generado por `node tests/escenarios.mjs`. **No se edita a mano.**
>
> Cada escenario dispara los webhooks reales de n8n y verifica el estado resultante
> en la base. Reemplaza el autorreporte de §5 por una corrida reproducible: cualquiera
> con el entorno levantado obtiene esta misma tabla.

**Ejecución:** 2026-08-29T03:05:25.284Z  ·  **n8n:** `http://localhost:5678`

## Escenarios

| # | Tabla 9 | Escenario | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | E1 | Un lead de presupuesto alto se califica HOT y queda esperando propuesta | OK | 5308 ms |
| 2 | E1b | El profesional fija precio, plazo y alcance, y recién ahí sale la propuesta | ERROR | 27473 ms |
| 3 | E2 | Un lead de valor medio se califica WARM y también espera propuesta | OK | 4834 ms |
| 4 | E3 | Un lead de presupuesto bajo se califica COLD y NO recibe propuesta | FALLA | 4616 ms |
| 5 | E4 | Un lead inválido se rechaza sin persistirse y queda registrado | OK | 5529 ms |
| 6 | — | La propuesta se lee sólo con el token correcto | ERROR | 1 ms |
| 7 | E5/E6 | Aceptación válida y reutilización del enlace: una sola factura | ERROR | 0 ms |
| 8 | — | El pago simulado es idempotente | ERROR | 0 ms |
| 9 | E8 | El rechazo de la propuesta deja el lead en PERDIDO | ERROR | 28433 ms |
| 10 | E9 | El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje | ERROR | 28996 ms |
| 11 | E10 | El estado del trabajo se actualiza desde el panel y se sincroniza | ERROR | 0 ms |
| 12 | — | Un token vencido no permite aceptar la propuesta | ERROR | 29900 ms |

> La columna «Tabla 9» sólo se completa donde el mapeo con el documento es inequívoco.
> Los `—` hay que cotejarlos contra la Tabla 9 antes de citarlos en la tesis.

## Comprobaciones

### lead-hot — Un lead de presupuesto alto se califica HOT y queda esperando propuesta

- ✅ tier: "HOT"
- ✅ score (40 presupuesto + 30 urgencia + 20 servicio + 5 teléfono + 5 descripción): 100
- ✅ queda esperando los términos del profesional: "NUEVO"
- ✅ todavía no hay precio fijado: null

### propuesta-enviar — El profesional fija precio, plazo y alcance, y recién ahí sale la propuesta

- ✅ el webhook del panel aceptó la credencial (200)
- ❌ Timeout (25000ms) esperando: el lead pase a PROPUESTA_ENVIADA

### lead-warm — Un lead de valor medio se califica WARM y también espera propuesta

- ✅ tier: "WARM"
- ✅ score (20 presupuesto + 15 urgencia + 12 servicio + 0 + 0): 47
- ✅ queda esperando los términos, igual que el HOT: "NUEVO"

### lead-cold — Un lead de presupuesto bajo se califica COLD y NO recibe propuesta

- ✅ tier: "COLD"
- ✅ score (10 presupuesto + 5 urgencia + 5 servicio + 0 + 0): 20
- ✅ sigue en NUEVO (no se le envió propuesta): "NUEVO"
- ❌ fallas registradas al procesar el lead COLD — {"evento":"ERROR_CRITICO","error_msg":"The credential \"Gmail account\" needs to be reconnected. (item 0)"}: 1 (esperaba 0)

### lead-invalido — Un lead inválido se rechaza sin persistirse y queda registrado

- ✅ correo sin arroba: el webhook respondió 200 sin caerse
- ✅ nombre de un carácter: el webhook respondió 200 sin caerse
- ✅ presupuesto cero: el webhook respondió 200 sin caerse
- ✅ las tres condiciones a la vez (entrada de la Tabla 12): el webhook respondió 200 sin caerse
- ✅ filas nuevas en leads para las 4 entradas inválidas: 0
- ✅ filas nuevas en logs con nivel ERROR: 4 (el RNF3 pide al menos 3)

### propuesta-lectura — La propuesta se lee sólo con el token correcto

- ❌ Cannot read properties of undefined (reading 'lead_id')

### aceptacion-atomica — Aceptación válida y reutilización del enlace: una sola factura

- ❌ Cannot read properties of undefined (reading 'lead_id')

### pago-idempotente — El pago simulado es idempotente

- ❌ Cannot destructure property 'factura' of 'ctx.aceptacion-atomica' as it is undefined.

### rechazo — El rechazo de la propuesta deja el lead en PERDIDO

- ❌ Timeout (25000ms) esperando: el lead rechazo tenga propuesta enviada

### pedido-cambios — El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje

- ❌ Timeout (25000ms) esperando: el lead cambios tenga propuesta enviada

### estado-trabajo — El estado del trabajo se actualiza desde el panel y se sincroniza

- ❌ Cannot read properties of undefined (reading 'lead')

### token-vencido — Un token vencido no permite aceptar la propuesta

- ❌ Timeout (25000ms) esperando: el lead vencido tenga propuesta enviada

## Métricas del entorno controlado

> Responde la recomendación 5 del dictamen v4. Son tiempos de punta a punta:
> incluyen la latencia de red, el procesamiento de n8n y los servicios externos.

| Escenario | Medición | Tiempo | Detalle |
|---|---|---|---|
| lead-hot | alta del lead en la base | 1904 ms | POST /lead/nuevo → fila en leads (hot) |
| lead-warm | alta del lead en la base | 1505 ms | POST /lead/nuevo → fila en leads (warm) |
| lead-cold | alta del lead en la base | 819 ms | POST /lead/nuevo → fila en leads (cold) |
| rechazo | alta del lead en la base | 866 ms | POST /lead/nuevo → fila en leads (rechazo) |
| pedido-cambios | alta del lead en la base | 1518 ms | POST /lead/nuevo → fila en leads (cambios) |
| token-vencido | alta del lead en la base | 2206 ms | POST /lead/nuevo → fila en leads (vencido) |

