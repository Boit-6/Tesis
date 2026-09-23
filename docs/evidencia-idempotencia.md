# evidencia idempotencia

| campo | valor |
| --- | --- |
| comando | `node tests/idempotencia.mjs` |
| marca temporal (UTC) | 2026-09-23T16:56:59.282Z |
| commit | 83cbf8e5c82c4b4f554c52b7967a8eeb2846de10 |
| commit (corto) | 83cbf8e |
| arbol de trabajo | CON CAMBIOS SIN CONFIRMAR |
| codigo de salida | 0 |
| duracion | 8.9 s |

## salida

```
· Levantando postgres:16-alpine …
· Aplicando el esquema …

── S6 · Deduplicación por correo en la captación ──

OK    el primer envío del formulario crea el lead
OK    el segundo envío con el mismo correo NO crea un lead nuevo (doble clic)
OK    y tampoco creó una segunda fila en la base
OK    el correo se compara sin distinguir mayúsculas
OK    otro interesado, con otro correo, sí entra
OK    la descripción con comas llegó entera (los parámetros no se partieron)
OK    el lead conserva su puntaje y su nivel
OK    vencida la ventana, el mismo correo vuelve a generar un lead
OK    dos envíos SIMULTÁNEOS del mismo correo dejan un solo lead

── S5 · Reconciliación de la factura perdida ──

OK    la consulta encuentra el lead ACEPTADO sin factura
OK    no toca la aceptación en vuelo (dentro del período de gracia)
OK    no toca el lead que sí tiene factura
OK    la primera corrida del cron emite la factura que faltaba
OK    la segunda corrida NO emite una segunda factura
OK    tampoco la emite si el identificador cambia: el candado es el lead
OK    la base tiene exactamente una factura para ese lead
OK    la factura reconciliada nace PENDIENTE, como cualquier otra
OK    conserva el precio que fijó el profesional, no el presupuesto declarado
OK    el lead pasa a FACTURADO
OK    y una segunda pasada no vuelve a aplicarlo
OK    reconciliado, el lead ya no aparece como pendiente
OK    la factura recuperada entra al circuito de recordatorios de pago

── Cobro por MercadoPago: ningún pago aprobado se pierde en silencio ──

OK    un pago por el monto justo cobra la factura PENDIENTE
OK    y queda registrado que la cobró MercadoPago
OK    la notificación repetida del mismo pago no vuelve a aplicarse
OK    y no genera alerta (MercadoPago reintenta: es ruido esperable)
OK    un pago tardío cobra la factura VENCIDA (antes se perdía)
OK    un pago sobre una factura ANULADA no la cobra
OK    pero deja alerta: la plata ya entró
OK    un pago por menos de lo facturado no cobra la factura
OK    y la alerta dice cuánto se pagó y cuánto se facturó
OK    un pago en otra moneda tampoco la cobra
OK    un segundo pago sobre una factura ya cobrada se detecta como pago doble
OK    un pago que apunta a una factura inexistente deja alerta
OK    un pago no aprobado (factura_id vacío) no toca nada ni alerta
OK    n8n_writer puede dejar la alerta en logs

── metrics_mensuales: una factura ANULADA no es facturación ──

OK    cerrar el proyecto marca la factura como cobrada por cierre, no por un pago
OK    la facturación del mes no suma la anulada (600 + 300 + 100)
OK    lo cobrado es sólo lo COBRADO
OK    lo pendiente suma PENDIENTE y VENCIDA, no la anulada
OK    la tasa de cobro se calcula sobre lo facturado sin anular (60 %)
OK    las vencidas se siguen contando aparte
OK    el tablero puede separar lo cobrado sólo por cierre

── Aceptación: el token se revalida en el mismo UPDATE ──

OK    con un token que no es el vigente no se acepta
OK    con el token vencido no se acepta
OK    con el token vigente se acepta
OK    y una segunda aceptación con el mismo token no vuelve a aplicar

Resultado: 47 OK, 0 FALLA
```
