# Procesos programados: seguimiento (E11) y recordatorios de pago (E12)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T18:45:04.242Z |
| Duración | 2.3 s |
| Commit | `f00916b2e50121426d43ae71da74153773ff38c6` (f00916b) |
| Árbol de trabajo | con 3 archivo(s) sin registrar |
| Node.js | v24.18.0 |
| Plataforma | win32 x64 |
| Instrumento | `npm run test:programados` (tests/procesos-programados.mjs) |
| Escenarios | E11 hasta la transición a PERDIDO · E12 en el escalón RECORDATORIO |
| Disparo | manual desde el editor de n8n (ambos son scheduleTrigger) |
| Resultado | **FALLA** (código de salida 1) |

## Salida de la corrida

```

E11 — seguimiento de propuestas, hasta la transición a PERDIDO
  ✅ el lead existe y es legible sólo con lo que la base persiste
  ❌ el tercer seguimiento se registró: seguimientos = 2
  ❌ la fecha del último seguimiento se actualizó a esta corrida: 2026-08-23T18:42:06.148+00:00
  ❌ el lead quedó en PERDIDO tras agotar los tres intentos: estado = EN_SEGUIMIENTO
  ❌ el envío del seguimiento dejó su fila auditable: 0 fila(s) en seguimientos

E11 — el lote llevaba más de un lead: el señuelo debe avanzar sin perderse
  ❌ el señuelo recibió su primer seguimiento: seguimientos = 0
  ❌ el señuelo NO se marcó como perdido: estado = PROPUESTA_ENVIADA

E12 — recordatorios de pago, escalón RECORDATORIO
  ✅ la factura existe y sigue impaga: estado_pago = PENDIENTE
  ❌ el aviso se contabilizó en la factura: recordatorios_enviados = 0
  ✅ el aviso corresponde al tramo RECORDATORIO (1 a 3 días): 2 día(s) al vencimiento

E12 — escalón URGENTE, en el mismo lote
  ❌ la factura vencida también recibió su aviso: recordatorios_enviados = 0
  ✅ corresponde al tramo URGENTE (más de 3 días vencida): -10 día(s) al vencimiento

Resultado: 4 OK, 8 FALLA
```
