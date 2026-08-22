# Evidencia de validación funcional

> Generado por `node tests/escenarios.mjs`. **No se edita a mano.**
>
> Cada escenario dispara los webhooks reales de n8n y verifica el estado resultante
> en la base. Reemplaza el autorreporte de §5 por una corrida reproducible: cualquiera
> con el entorno levantado obtiene esta misma tabla.

**Ejecución:** 2026-08-22T01:21:43.402Z  ·  **n8n:** `http://localhost:5678`

## Escenarios

| # | Tabla 9 | Escenario | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | — | Un lead de presupuesto alto se califica HOT y recibe propuesta | OK | 1987 ms |
| 2 | — | Un lead de presupuesto bajo se califica COLD y NO recibe propuesta | OK | 4215 ms |
| 3 | — | La propuesta se lee sólo con el token correcto | OK | 646 ms |
| 4 | — | Dos aceptaciones simultáneas generan UNA sola factura | OK | 9668 ms |
| 5 | — | El pago simulado es idempotente | OK | 5723 ms |
| 6 | E8 | El rechazo de la propuesta deja el lead en PERDIDO | OK | 3520 ms |
| 7 | E9 | El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje | OK | 3761 ms |
| 8 | E10 | El estado del trabajo se actualiza desde el panel y se sincroniza | OK | 697 ms |
| 9 | — | Un token vencido no permite aceptar la propuesta | OK | 6173 ms |

> La columna «Tabla 9» sólo se completa donde el mapeo con el documento es inequívoco.
> Los `—` hay que cotejarlos contra la Tabla 9 antes de citarlos en la tesis.

## Comprobaciones

### lead-hot — Un lead de presupuesto alto se califica HOT y recibe propuesta

- ✅ tier: "HOT"
- ✅ score (40 presupuesto + 30 urgencia + 20 servicio + 5 teléfono + 5 descripción): 100
- ✅ se generó el token de aceptación
- ✅ el token tiene fecha de vencimiento
- ✅ se registró la fecha de propuesta

### lead-cold — Un lead de presupuesto bajo se califica COLD y NO recibe propuesta

- ✅ tier: "COLD"
- ✅ score por debajo del umbral WARM (20)
- ✅ sigue en NUEVO (no se le envió propuesta): "NUEVO"

### propuesta-lectura — La propuesta se lee sólo con el token correcto

- ✅ con el token correcto devuelve la propuesta
- ✅ con un token inválido no filtra datos del lead

### aceptacion-atomica — Dos aceptaciones simultáneas generan UNA sola factura

- ✅ ninguna de las dos peticiones devolvió error de servidor
- ✅ cantidad de facturas tras dos aceptaciones concurrentes: 1
- ✅ el lead quedó en FACTURADO

### pago-idempotente — El pago simulado es idempotente

- ✅ la fecha de cobro no cambió al reusar el enlace: "2026-08-22T01:20:07.558326+00:00"

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
| lead-hot | alta del lead en la base | 956 ms | POST /lead/nuevo → fila en leads (hot) |
| lead-hot | propuesta enviada | 894 ms | incluye el email de propuesta y la card de Notion |
| lead-cold | alta del lead en la base | 862 ms | POST /lead/nuevo → fila en leads (cold) |
| aceptacion-atomica | aceptación → factura emitida | 254 ms | incluye la generación del PDF con Gotenberg y el envío por email |
| aceptacion-atomica | respuesta al navegador | 4981 ms | las dos peticiones de aceptación en paralelo |
| pago-idempotente | pago confirmado | 248 ms | marca la factura como COBRADO |
| rechazo | alta del lead en la base | 1251 ms | POST /lead/nuevo → fila en leads (rechazo) |
| rechazo | rechazo procesado | 232 ms |  |
| pedido-cambios | alta del lead en la base | 826 ms | POST /lead/nuevo → fila en leads (cambios) |
| pedido-cambios | pedido de cambios procesado | 233 ms |  |
| estado-trabajo | cambio de estado de trabajo | 190 ms | incluye la sincronización con Notion |
| token-vencido | alta del lead en la base | 830 ms | POST /lead/nuevo → fila en leads (vencido) |

**Generación de la factura en PDF (Gotenberg), extremo a extremo:** 254 ms.

