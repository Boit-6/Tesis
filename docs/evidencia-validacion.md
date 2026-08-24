# Evidencia de validación funcional

> Generado por `node tests/escenarios.mjs`. **No se edita a mano.**
>
> Cada escenario dispara los webhooks reales de n8n y verifica el estado resultante
> en la base. Reemplaza el autorreporte de §5 por una corrida reproducible: cualquiera
> con el entorno levantado obtiene esta misma tabla.

**Ejecución:** 2026-08-24T01:50:45.977Z  ·  **n8n:** `http://localhost:5678`

## Escenarios

| # | Tabla 9 | Escenario | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | E1 | Un lead de presupuesto alto se califica HOT y recibe propuesta | OK | 3151 ms |
| 2 | E2 | Un lead de valor medio se califica WARM y recibe propuesta | OK | 1954 ms |
| 3 | E3 | Un lead de presupuesto bajo se califica COLD y NO recibe propuesta | OK | 4273 ms |
| 4 | E4 | Un lead inválido se rechaza sin persistirse y queda registrado | OK | 3913 ms |
| 5 | — | La propuesta se lee sólo con el token correcto | OK | 648 ms |
| 6 | E5/E6 | Aceptación válida y reutilización del enlace: una sola factura | OK | 13195 ms |
| 7 | — | El pago simulado es idempotente | OK | 4621 ms |
| 8 | E8 | El rechazo de la propuesta deja el lead en PERDIDO | OK | 4829 ms |
| 9 | E9 | El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje | OK | 4401 ms |
| 10 | E10 | El estado del trabajo se actualiza desde el panel y se sincroniza | OK | 831 ms |
| 11 | — | Un token vencido no permite aceptar la propuesta | OK | 6757 ms |

> La columna «Tabla 9» sólo se completa donde el mapeo con el documento es inequívoco.
> Los `—` hay que cotejarlos contra la Tabla 9 antes de citarlos en la tesis.

## Comprobaciones

### lead-hot — Un lead de presupuesto alto se califica HOT y recibe propuesta

- ✅ tier: "HOT"
- ✅ score (40 presupuesto + 30 urgencia + 20 servicio + 5 teléfono + 5 descripción): 100
- ✅ se generó el token de aceptación
- ✅ el token tiene fecha de vencimiento
- ✅ se registró la fecha de propuesta

### lead-warm — Un lead de valor medio se califica WARM y recibe propuesta

- ✅ tier: "WARM"
- ✅ score (20 presupuesto + 15 urgencia + 12 servicio + 0 + 0): 47
- ✅ estado: "PROPUESTA_ENVIADA"

### lead-cold — Un lead de presupuesto bajo se califica COLD y NO recibe propuesta

- ✅ tier: "COLD"
- ✅ score (10 presupuesto + 5 urgencia + 5 servicio + 0 + 0): 20
- ✅ sigue en NUEVO (no se le envió propuesta): "NUEVO"

### lead-invalido — Un lead inválido se rechaza sin persistirse y queda registrado

- ✅ el webhook respondió 200 sin caerse
- ✅ filas nuevas en leads para la entrada inválida: null
- ✅ quedó registrado en logs con nivel ERROR (1 fila/s)

### propuesta-lectura — La propuesta se lee sólo con el token correcto

- ✅ con el token correcto devuelve la propuesta
- ✅ con un token inválido no filtra datos del lead

### aceptacion-atomica — Aceptación válida y reutilización del enlace: una sola factura

- ✅ ninguna de las dos peticiones concurrentes devolvió error de servidor
- ✅ días entre emisión y vencimiento de la factura: 15
- ✅ ninguna de las dos peticiones consecutivas devolvió error de servidor
- ✅ facturas tras cuatro aceptaciones (2 concurrentes + 2 consecutivas): 1
- ✅ el lead quedó en FACTURADO

### pago-idempotente — El pago simulado es idempotente

- ✅ la fecha de cobro no cambió al reusar el enlace: "2026-08-24T01:49:02.720427+00:00"

### rechazo — El rechazo de la propuesta deja el lead en PERDIDO

- ✅ el lead quedó en PERDIDO

### pedido-cambios — El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje

- ✅ el mensaje del cliente quedó guardado en notas

### estado-trabajo — El estado del trabajo se actualiza desde el panel y se sincroniza

- ✅ el webhook del panel aceptó la credencial (403 = revisar CRM_PANEL_TOKEN)
- ✅ el lead tiene card_id: la sincronización con Notion está activa

### token-vencido — Un token vencido no permite aceptar la propuesta

- ✅ el lead NO se aceptó (quedó en PROPUESTA_ENVIADA)
- ✅ no se emitió factura con el token vencido: 0

## Métricas del entorno controlado

> Responde la recomendación 5 del dictamen v4. Son tiempos de punta a punta:
> incluyen la latencia de red, el procesamiento de n8n y los servicios externos.

| Escenario | Medición | Tiempo | Detalle |
|---|---|---|---|
| lead-hot | alta del lead en la base | 2076 ms | POST /lead/nuevo → fila en leads (hot) |
| lead-hot | propuesta enviada | 917 ms | incluye el email de propuesta y la card de Notion |
| lead-warm | alta del lead en la base | 944 ms | POST /lead/nuevo → fila en leads (warm) |
| lead-cold | alta del lead en la base | 908 ms | POST /lead/nuevo → fila en leads (cold) |
| aceptacion-atomica | aceptación → factura emitida | 310 ms | incluye la generación del PDF con Gotenberg y el envío por email |
| aceptacion-atomica | respuesta al navegador | 7024 ms | las dos peticiones de aceptación en paralelo |
| pago-idempotente | pago confirmado | 269 ms | marca la factura como COBRADO |
| rechazo | alta del lead en la base | 1032 ms | POST /lead/nuevo → fila en leads (rechazo) |
| rechazo | rechazo procesado | 262 ms |  |
| pedido-cambios | alta del lead en la base | 1006 ms | POST /lead/nuevo → fila en leads (cambios) |
| pedido-cambios | pedido de cambios procesado | 308 ms |  |
| estado-trabajo | cambio de estado de trabajo | 267 ms | incluye la sincronización con Notion |
| token-vencido | alta del lead en la base | 980 ms | POST /lead/nuevo → fila en leads (vencido) |

**Generación de la factura en PDF (Gotenberg), extremo a extremo:** 310 ms.

