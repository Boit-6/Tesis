# Preparación de la defensa oral — respuestas a las cuestiones del dictamen (V1)

> Respuestas preparadas a las seis cuestiones de la sección G de `docs/dictamen-tesisv3.md`.
> Cada respuesta está anclada en el código verificado (`workflow/crm_postgres.json`, `db/schema.sql`,
> `FormularioLeads/src/`). Fecha original: 2/7/2026.
>
> **Actualización (agosto 2026):** las preguntas 1, 2, 3 y 5 tienen ahora evidencia ejecutable —no
> solo prosa— documentada en [`docs/verificacion-y-seguridad.md`](verificacion-y-seguridad.md). Las
> respuestas de abajo siguen sirviendo como guion para decirlas en voz alta, pero se actualizaron los
> puntos que ese dictamen daba como pendientes y que ya se cerraron (vigencia del token, RLS
> verificada contra Postgres real). Los números de nodos/webhooks se actualizaron al estado actual
> del artefacto (MercadoPago + módulo de tickets).

---

## 1. Concurrencia en la aceptación: ¿cómo se evita la doble facturación?

**Respuesta.** La transición a `ACEPTADO` es una **actualización condicional atómica**. El nodo
`Postgres - Marcar Aceptado` ejecuta:

```sql
UPDATE leads SET estado = 'ACEPTADO', fecha_aceptacion = now()
WHERE lead_id = $1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO')
RETURNING *;
```

PostgreSQL serializa los `UPDATE` concurrentes sobre la **misma fila** mediante bloqueo de fila:
la primera transacción que toma el lock actualiza el estado y `RETURNING` devuelve **1 fila**; la
segunda, al liberarse el lock, re-evalúa el `WHERE` contra el estado ya confirmado (`ACEPTADO`, que
**no** está en la lista `IN`), afecta **0 filas** y `RETURNING` vuelve vacío. El nodo
`IF - Aceptación Aplicó?` bifurca según si volvió fila (`estado == 'ACEPTADO'`): la rama «aplicó»
genera factura, PDF y notificaciones; la rama vacía va a `No-op - Aceptación Duplicada`, sin segunda
factura. Esto cubre tanto la **reutilización secuencial** del enlace como la **concurrencia real**
(dos pestañas o un doble clic). *Por qué el texto lo describía como pendiente:* el documento se
redactó antes del commit `ea46b7a`; el dictamen v3 lo detectó y §4.3.2 ya fue corregida.

## 2. `service_role` evade la RLS: ¿cómo se garantiza que el tablero solo lea lo autorizado?

**Respuesta.** Son **dos caminos de acceso distintos**:

- **Escritura (n8n):** usa la `service_role` key, que **por diseño evade la RLS** —necesario para que
  el alta de leads y facturas no quede bloqueada por políticas de solo lectura—. Esa clave vive
  únicamente en las credenciales internas de n8n; **no** está en el frontend ni en el repo.
- **Lectura (tablero):** usa la `anon`/publishable key **+ la cookie de sesión** del usuario, y **toda**
  consulta pasa por RLS. Las políticas (`leads_select_authenticated`, etc.) exigen
  `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`; las vistas se declaran
  `security_invoker = true` (respetan la política de la tabla base) y a `anon` se le revocó todo
  (`REVOKE ALL … FROM anon`). Además, `dashboard/page.tsx` **re-verifica** `profile.role === 'admin'`
  en el servidor (defensa en profundidad).

Es decir: aun con la anon key, una sesión sin fila `admin` en `profiles` **no lee nada**. *Actualización:*
esto ya no es solo una afirmación sobre el script: `npm run test:rls` levanta un PostgreSQL real,
aplica `db/schema.sql` **tal cual está en el repositorio** y ejecuta **24 casos** rol por rol
(`anon` sin acceso, usuario sin rol `admin` con 0 filas, `logs` cerrada ni para el admin, sin
escalada de privilegios, `service_role` con acceso completo). *Salvedad que sigue en pie:* que la
instancia Supabase de **producción** concreta tenga ese esquema aplicado sigue siendo un paso del
desplegador (tarea **M2**) — lo que ya no se puede decir es que la RLS «no esté probada».

## 3. Umbrales de scoring por «criterio experto»: ¿base y comportamiento en casos límite?

**Respuesta.** Las ponderaciones y los cortes (`HOT ≥ 70`, `WARM ≥ 40`) se fijaron por **criterio
experto** del dominio freelance, no a partir de datos históricos de conversión; la tesis lo declara
abiertamente (§6): su validez es **«de diseño y no empírica»**, y la calibración con datos reales es
trabajo futuro (#2). Componentes (`Code - Scoring`): presupuesto (hasta 40), urgencia (hasta 30),
servicio (hasta 20), más bonus de teléfono y descripción (+5 c/u).

*Caso límite pedido — presupuesto alto y urgencia baja:* p. ej. USD 5000 (**40**) + urgencia baja
(**5**) + desarrollo_web (**20**) + teléfono (**+5**) + descripción (**+5**) = **75 → HOT**. El
presupuesto **domina** sobre la urgencia: un proyecto grande se prioriza aunque no sea urgente. A la
inversa, un lead urgente pero chico (300 → 10, alta → 30, soporte → 5) = **45 → WARM**. Es una
decisión de diseño explícita: privilegiar el valor económico por sobre la urgencia.

## 4. Token en el `GET /lead-propuesta`: riesgo y mitigaciones

**Respuesta.** El enlace de aceptación lleva el token como parámetro de consulta (`?token=…`) y la
página emite un `GET /lead-propuesta` de **solo lectura** para consultar el estado antes de confirmar,
por lo que el token puede quedar en el **historial del navegador** y en los **logs de acceso** del
servidor. La confirmación en sí (POST) envía el token en el **cuerpo**, no en la URL. El riesgo está
**acotado** por el carácter de un solo uso: una vez `ACEPTADO`, un replay falla (0 filas — ver Q1).
*Actualización:* la primera mitigación **ya se implementó**: `leads.token_expira_en` se estampa al
enviar (o reenviar) la propuesta con `TOKEN_VIGENCIA_DIAS` días de validez (14 por defecto), y las
**cuatro** consultas que aceptan el token (ver propuesta, aceptar, rechazar, pedir cambios) la
revalidan. Los enlaces emitidos antes de la columna siguen funcionando (`IS NULL` los deja pasar).
*Lo que sigue abierto:* no registrar la query string completa en producción, y mover la lectura a
POST — quedan para después del MVP; el token sigue viajando en la URL del `GET`.

## 5. Validación autorreportada: reproducibilidad de E1–E10 y el caso de E10

**Respuesta.** E1–E14 son **escenarios controlados** que ejercitan los caminos principal y
alternativos de cada flujo (se sumaron E11–E14 al crecer el sistema: seguimiento, recordatorios,
métricas y el pago real con MercadoPago); el resultado observado se contrasta con los criterios de
aceptación del diseño (normalización, score/tier, transición de estados en BD, tiempo real).
*Actualización — ya no es solo autorreporte:* `tests/escenarios.mjs` dispara los webhooks reales
contra el sistema levantado y verifica el estado resultante en la base, incluida la aceptación
concurrente (dos peticiones con `Promise.all`, sin esperar a que la primera termine). Cada corrida
escribe `docs/evidencia-validacion.md` con la tabla de resultados, así que la reproducibilidad ya no
depende de que alguien repita a mano lo que dice el documento. *Lo que falta:* varias celdas de la
Tabla de escenarios en el `.docx` siguen en `[registrar]`/`Pendiente` porque esa corrida contra el
sistema real todavía no se hizo — hay que ejecutarla antes de la defensa y volcar los números y
capturas que salgan.

## 6. Credenciales compartidas e instancia local: plan de despliegue y rotación

**Respuesta.** Durante la configuración inicial, las claves `secret`/`service_role` de Supabase (y el
token del bot de Telegram) se compartieron por chat, pero **ninguna** se versionó ni se usó en el
frontend —el frontend solo usa la `anon`/publishable key; n8n usa la `service_role` **solo** en sus
credenciales internas— (Cap. 8, ítem 6). La **rotación (S1)** requiere rol **Owner/Admin** del
proyecto Supabase (de un tercero), por lo que queda pendiente. **Despliegue:** n8n corrió
autoalojado en local **sin URL pública**, lo que impide que un cliente externo alcance los webhooks
(§6). **Plan:** (1) rotar todas las credenciales compartidas al disponer del rol Owner; (2) exponer
n8n tras **HTTPS** con URL estable (túnel o nube) —Trabajos Futuros #1—; (3) completar la
configuración de auth de Supabase (URLs de redirección/confirmación); (4) aplicar y verificar la RLS
en la instancia (**M2**).

---

### Chequeo rápido antes de la defensa
- Tener a mano las tres consultas «atómicas»: `Marcar Aceptado`, `Marcar Cobrado` (`… AND estado_pago='PENDIENTE'`) y el `SELECT` de `Buscar Lead (token)` (`accept_token::uuid`).
- Recordar el conteo real: **141 nodos funcionales (157 con notas), 12 webhooks, 3 procesos programados** (CRM). El módulo de tickets es un workflow aparte: 39 nodos, 3 webhooks, 1 cron.
- Saber señalar en el repo `github.com/Boit-6/Tesis`: `workflow/crm_postgres.json`, `db/schema.sql`, `FormularioLeads/src/`, y la suite de verificación (`npm test`, `npm run test:docker`).
- Antes de grabar/defender: correr `npm run test:escenarios` contra el sistema levantado para completar los `[registrar]`/`Pendiente` que todavía quedan en la tabla de escenarios del `.docx` (ver Q5).

---

## Pregunta nueva a esperar: ¿quién fija el precio?

Hasta el 24-ago-2026 la respuesta honesta habría sido incómoda: **lo fijaba el cliente**. La fila
«Inversión» de la propuesta salía de `leads.presupuesto`, o sea del valor que el propio interesado
elegía en el deslizante del formulario, y ese número se convertía después en el monto de la factura,
el importe del PDF y el precio de la preferencia de MercadoPago, sin que el profesional interviniera
en ningún punto.

Es el hueco más serio que tuvo el trabajo, porque cae justo sobre la condición que la pregunta de
investigación se compromete a sostener: automatizar «sin sacrificar el control del profesional sobre
el proceso».

**Cómo responderlo ahora.** El lead calificado HOT o WARM queda en `NUEVO` y aparece en la sección
«Propuestas por enviar» del tablero, donde el profesional carga precio, plazo y alcance; recién ahí
se genera y se envía la propuesta. El campo de precio arranca vacío a propósito: el presupuesto
declarado se muestra al lado como referencia, no como valor por omisión. El `UPDATE` que guarda los
términos es condicional (`WHERE estado = 'NUEVO' AND tier IN ('HOT','WARM')`), el mismo patrón que
la aceptación, así que repetir la petición no reabre una propuesta ya enviada.

**Si preguntan por qué no está automatizado ese paso**, la respuesta es que automatizarlo sería el
error, no la mejora: un sistema que fija solo el precio de un servicio profesional compromete a quien
lo cobra. La automatización se detiene exactamente donde empieza una decisión comercial, y eso es
una decisión de diseño, no una carencia.

**Si preguntan cómo se detectó**, conviene decirlo tal cual: no salió de leer el código sino de
recorrer la página como la recorrería un cliente. Es el mismo argumento metodológico que sostiene el
dictamen v6 —ejercitar el sistema revela lo que la lectura estática no— aplicado una vez más.

**Detalle que refuerza la respuesta.** Al agregar la comprobación de que el monto facturado coincide
con el precio fijado, el escenario E5 falló: `Code - Generar ID Factura` calculaba el importe pero no
lo exponía en su salida, y aguas abajo el PDF y el `INSERT` seguían leyendo `presupuesto`. Sin esa
aserción el cambio habría parecido aplicado y la factura habría seguido saliendo por el importe del
cliente. Sirve para ilustrar por qué la validación tiene que comparar contra el valor esperado y no
limitarse a comprobar que el flujo no falla.
