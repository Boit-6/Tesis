# Evidencia de los escenarios E15 y E16

> Generado a partir de `node tests/trazabilidad.mjs` y `node tests/exposicion-webhooks.mjs`.
> **No se edita a mano** salvo para agregar corridas nuevas al final.
>
> A diferencia de la suite principal (`tests/escenarios.mjs`, que regenera
> `docs/evidencia-validacion.md` en cada ejecución), estos dos escenarios no escriben su
> salida a un archivo por sí mismos. Este documento la reproduce tal como se imprimió en
> consola, sin editar, para que E15 y E16 queden respaldados con la misma fecha y la misma
> reproducibilidad que el resto de los escenarios del Capítulo 5.

## E15 — Trazabilidad

**Ejecución:** 2026-08-30T21:56:56Z · **Comando:** `npm run test:trazabilidad` · **n8n:** `http://localhost:5678`

```
E15 — Trazabilidad: reconstrucción del ciclo desde lo registrado

Recorrido del ciclo
  · alta enviada (HTTP 200)
  · lead persistido: LD-1788127017302-BOYW (tier HOT, score 100)
  · propuesta enviada desde el panel (HTTP 200)

Reconstrucción a partir de lo registrado (sólo lecturas a la base)
  línea de tiempo reconstruida:
      2026-08-30T21:55:24.469Z  NUEVO              (fecha_ingreso)
      2026-08-30T21:55:28.120Z  PROPUESTA_ENVIADA  (fecha_propuesta)
      2026-08-30T21:55:31.573Z  auditoría INFO      propuesta_enviada

Comprobaciones
  ✅ el ciclo tiene al menos una transición fechada: 2 marcas
  ✅ la reconstrucción arranca en el alta del lead: NUEVO
  ✅ las marcas temporales son cronológicamente consistentes
  ✅ el estado actual se explica por la última transición fechada: estado=PROPUESTA_ENVIADA · última marca=PROPUESTA_ENVIADA
  ✅ la calificación quedó registrada junto al lead: score=100 tier=HOT
  ✅ los términos que fijó el profesional son recuperables y distintos del presupuesto declarado: precio=8400 · presupuesto declarado=6000
  ✅ el envío de la propuesta quedó fechado: 2026-08-30T21:55:28.12044+00:00
  ✅ el envío dejó rastro en el registro de auditoría: 1 fila(s) en logs
  ✅ los seguimientos registrados permiten auditar su espaciado: 0 seguimiento(s)
  ✅ la oportunidad es identificable y ubicable en el ciclo sólo con la base

  (lead de prueba LD-1788127017302-BOYW eliminado)

Resultado: 10/10 comprobaciones en verde
```

## E16 — Exposición de los webhooks

**Ejecución:** 2026-08-30T21:56:39Z · **Comando:** `npm run test:exposicion` · **n8n:** `http://localhost:5678`

```
E16 — Exposición de los webhooks a un cliente que no es un navegador

Instancia: http://localhost:5678
Cliente:   Node v24.18.0, sin cabecera Origin ni Referer

Respuesta a una invocación sin credencial:

  webhook           mét.  HTTP  ¿exige credencial?  declarado en Tabla 10
  ──────────────────────────────────────────────────────────────────────────
  lead/nuevo        POST  200   NO                  sin auth
  lead-propuesta    GET   200   NO                  sin auth
  lead-acepta       POST  200   NO                  sin auth
  lead-rechaza      POST  200   NO                  sin auth
  lead-modifica     POST  200   NO                  sin auth
  pago-confirmado   GET   200   NO                  sin auth
  mp/notificacion   POST  200   NO                  firma opcional
  propuesta-enviar  POST  403   sí (403)            Header Auth
  proyecto-cerrado  POST  403   sí (403)            Header Auth
  trabajo-estado    POST  403   sí (403)            Header Auth
  lead-cancelar     POST  403   sí (403)            Header Auth
  cambio-aceptar    POST  403   sí (403)            Header Auth
  cambio-rechazar   POST  403   sí (403)            Header Auth

Medición
  · 6 de 13 webhooks atendieron a un cliente sin credencial y sin navegador.
  · 6 de 6 webhooks del panel interno respondieron 403.
  · 1 webhook de pasarela: acepta la notificación y la contrasta contra la API del proveedor (S8).

Consecuencia observada sobre el sistema de registro
  ❗ El alta prosperó: se persistió LD-1788127001806-R28Q (tier WARM, fuente «test_exposicion»)
     desde un cliente que no es un navegador y sin credencial alguna. Es la
     demostración de lo que la nota de la Tabla 10 afirma: CORS es un control
     del navegador, no una autenticación de origen.

  (lead de prueba LD-1788127001806-R28Q eliminado)

Resultado: el reparto coincide con la Tabla 11 (S1)
```

## Nota de reproducibilidad

Ambas corridas se ejecutaron contra la misma instancia local de n8n (`docker compose up -d`,
puerto 5678) y la misma Supabase declarada en `.env`, en la sesión del 30 de agosto de 2026,
con quince segundos de diferencia entre una y otra. Los datos de prueba son ficticios
(`test_trazabilidad`, `test_exposicion`) conforme al protocolo de la Tabla 4, y ambos scripts
eliminan el lead que crean al finalizar. Los resultados coinciden exactamente con lo que
declaran la Tabla 11 (S1) y la Tabla 12 (E15, E16) del documento.

## E16 — Reejecución tras el cierre de S8 (firma obligatoria)

**Ejecución:** 2026-08-31T15:20:30Z · **Comando:** `npm run test:exposicion` · **n8n:** `http://localhost:5678`

El 31 de agosto de 2026 se cerró la deuda S8 de la Tabla 11: el nodo `Code - Leer Notificacion MP`
pasó de aceptar por defecto una notificación sin firma (`firmaValida = true` inicial) a
rechazarla por defecto (`firmaValida = false` inicial), con `MP_WEBHOOK_SECRET` obligatorio.
Esta corrida reejecuta E16 contra el sistema real ya con el cambio aplicado y reimportado en
la instancia de n8n (workflow `kRyDrREl40a1if0K`, reactivado y con el contenedor recreado para
tomar el nuevo valor por defecto de `MP_WEBHOOK_SECRET` en `docker-compose.yml`).

```
E16 — Exposición de los webhooks a un cliente que no es un navegador

Instancia: http://localhost:5678
Cliente:   Node v24.18.0, sin cabecera Origin ni Referer

Respuesta a una invocación sin credencial:

  webhook           mét.  HTTP  ¿exige credencial?  declarado en Tabla 10
  ──────────────────────────────────────────────────────────────────────────
  lead/nuevo        POST  200   NO                  sin auth
  lead-propuesta    GET   200   NO                  sin auth
  lead-acepta       POST  200   NO                  sin auth
  lead-rechaza      POST  200   NO                  sin auth
  lead-modifica     POST  200   NO                  sin auth
  pago-confirmado   GET   200   NO                  sin auth
  mp/notificacion   POST  200   NO                  firma obligatoria
  propuesta-enviar  POST  403   sí (403)            Header Auth
  proyecto-cerrado  POST  403   sí (403)            Header Auth
  trabajo-estado    POST  403   sí (403)            Header Auth
  lead-cancelar     POST  403   sí (403)            Header Auth
  cambio-aceptar    POST  403   sí (403)            Header Auth
  cambio-rechazar   POST  403   sí (403)            Header Auth

Medición
  · 6 de 13 webhooks atendieron a un cliente sin credencial y sin navegador.
  · 6 de 6 webhooks del panel interno respondieron 403.
  · mp/notificacion: notificación SIN firma → se ignoró sin persistir cambios (S8 cerrada).

Consecuencia observada sobre el sistema de registro
  ❗ El alta prosperó: se persistió LD-1788189630394-IKL3 (tier WARM, fuente «test_exposicion»)
     desde un cliente que no es un navegador y sin credencial alguna. Es la
     demostración de lo que la nota de la Tabla 10 afirma: CORS es un control
     del navegador, no una autenticación de origen.

  (lead de prueba LD-1788189630394-IKL3 eliminado)

Resultado S1: el reparto coincide con la Tabla 11
Resultado S8: la firma es obligatoria: una notificación sin firmar se ignora
```

**Nota sobre S1.** El reparto de S1 no cambió: 6 de 13 webhooks siguen sin autenticar el origen
y 6 de 6 del panel siguen exigiendo Header Auth. `mp/notificacion` nunca contó para ese reparto
(vive en su propio grupo, `pasarela`, ajeno a los conteos de S1) — el cierre de S8 se mide por
separado, a partir de si la notificación sin firma se aplica o se ignora, porque el webhook de
pasarela responde HTTP 200 en los dos casos por diseño (para que MercadoPago no reintente); la
señal está en el cuerpo de la respuesta, no en el código de estado.

**Nota complementaria — E14 contra el doble, con la firma ya obligatoria.** La misma sesión
reejecutó `node tests/e14-cobro-mp.mjs` (contra `tests/mp-doble.mjs`, con `MP_API_BASE` del
contenedor apuntado temporalmente a `http://host.docker.internal:8799` y repuesto al valor por
defecto al terminar) para confirmar que el camino firmado sigue aplicándose correctamente tras
el cierre de S8: las quince comprobaciones del escenario, incluidas las dos de idempotencia,
terminaron en verde (`estado_pago` PENDIENTE → COBRADO, `mp_payment_id` persistido y sin cambio
ante la notificación repetida). El detalle completo de E14 se reporta en la Tabla 12 (§5.1).
