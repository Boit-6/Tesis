# evidencia idempotencia

| campo | valor |
| --- | --- |
| comando | `node tests/idempotencia.mjs` |
| marca temporal (UTC) | 2026-09-23T16:42:18.979Z |
| commit | 095b250fb42b08f2001da58262882944ee0b8232 |
| commit (corto) | 095b250 |
| arbol de trabajo | CON CAMBIOS SIN CONFIRMAR |
| codigo de salida | 0 |
| duracion | 8.1 s |

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

Resultado: 35 OK, 0 FALLA
```
