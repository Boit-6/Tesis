# Verificación de idempotencia (S5 y S6)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T17:42:56.378Z |
| Duración | 13.4 s |
| Commit | `d1abe08b5cf896f986b92f646c44719755f88661` (d1abe08) |
| Árbol de trabajo | con 6 archivo(s) sin registrar |
| Node.js | v24.18.0 |
| Plataforma | win32 x64 |
| Instrumento | `npm run test:idempotencia` (tests/idempotencia.mjs) |
| Imagen de PostgreSQL | `postgres:15-alpine` |
| Requisitos | RNF2 · deudas S5 y S6 de la Tabla 22 |
| Resultado | **OK** (código de salida 0) |

## Salida de la corrida

```
· Levantando postgres:15-alpine …
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

Resultado: 22 OK, 0 FALLA
```
