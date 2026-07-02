# Preparación de la defensa oral — respuestas a las cuestiones del dictamen (V1)

> Respuestas preparadas a las seis cuestiones de la sección G de `docs/dictamen-tesisv3.md`.
> Cada respuesta está anclada en el código verificado (`workflow/crm_postgres.json`, `db/schema.sql`,
> `FormularioLeads/src/`). Fecha: 2/7/2026.

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

Es decir: aun con la anon key, una sesión sin fila `admin` en `profiles` **no lee nada**. *Salvedad
honesta:* el `schema.sql` está verificado contra el modelo, pero **confirmar que la RLS está aplicada
en la instancia Supabase de producción** es la tarea **M2**, aún pendiente.

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
*Mitigaciones previstas (§4.3.2):* (i) **vigencia temporal** (TTL) del token, (ii) **no registrar la
query string completa** en producción, (iii) opcionalmente mover la lectura a POST. *Por qué no se
implementaron aún:* son endurecimientos posteriores al alcance del MVP; el riesgo residual es
aceptable en el entorno controlado y se cierra antes del despliegue real.

## 5. Validación autorreportada: reproducibilidad de E1–E10 y el caso de E10

**Respuesta.** E1–E10 son **escenarios controlados** que ejercitan los caminos principal y
alternativos de cada flujo; el resultado observado se contrasta con los criterios de aceptación del
diseño (normalización, score/tier, transición de estados en BD, tiempo real). **Reproducibilidad:**
cada escenario tiene entrada definida y salida esperada según las reglas de scoring (Tabla 4) y la
máquina de estados (Tabla 7); además, los nodos `Code` están protegidos por la **prueba de humo
automatizada** (`tests/smoke_code_nodes.js`), que ejecuta cada nodo con datos representativos. E1–E9
tienen **figura adjunta** (Figuras 3, 5, 10–16). **E10** (cambio de `estado_trabajo` + sync a Notion)
es la **única** celda sin captura: su comportamiento esperado está definido, pero falta tomar la
evidencia visual (tarea **C2**). No es una falla de funcionamiento, sino de documentación probatoria.

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
- Recordar el conteo real: **128 nodos funcionales (144 con notas), 11 webhooks, 3 procesos programados**.
- Saber señalar en el repo `github.com/Boit-6/Tesis`: `workflow/crm_postgres.json`, `db/schema.sql`, `FormularioLeads/src/`, `tests/smoke_code_nodes.js`.
