# Verificación y seguridad del artefacto

Este documento reúne lo que se agregó para responder, con evidencia ejecutable,
las observaciones del `dictamen-tesisv4.md` y las cuestiones de la defensa oral.

La idea de fondo: **todo lo que la tesis afirma sobre el artefacto tiene que
poder re-ejecutarlo otra persona**. Donde antes había una descripción en prosa
más una captura, ahora hay además un comando.

---

## 1. Mapa: qué responde cada cosa

| Observación del dictamen | Gravedad | Qué se agregó |
|---|---|---|
| §D8 — la validación por escenarios «mantiene un componente de autorreporte» | **Media** | `tests/escenarios.mjs`: dispara los webhooks reales y verifica el estado en la base |
| Recomendación 5 — «reportar métricas mínimas del entorno controlado» | Opcional | Tiempos medidos por `tests/escenarios.mjs` + `FormularioLeads/scripts/medir-realtime.mjs` |
| Cuestión 1 — ¿cómo evita la doble factura ante peticiones concurrentes? | — | Escenario `aceptacion-atomica`: dispara **dos aceptaciones en paralelo** y verifica que haya una sola factura |
| Cuestión 2 — ¿la RLS está aplicada o sólo en el script? | — | `tests/verificar_rls.mjs`: 24 casos contra un PostgreSQL real |
| Cuestión 3 — ¿sobre qué base se fijaron los umbrales de scoring? | — | Los umbrales son configurables (`SCORING_*`); `tests/scoring.js` prueba 9240 combinaciones |
| Cuestión 4 — ¿qué mitigaciones tiene el token del enlace? | — | Vigencia temporal (`TOKEN_VIGENCIA_DIAS`), revalidada en la base |
| Cuestión 5 — ¿cómo se aseguró la reproducibilidad de E1–E10? | — | La suite escribe `docs/evidencia-validacion.md` en cada corrida |
| Deriva entre documento y código | — | `tests/verificar_afirmaciones.js` recalcula los números que afirma la tesis |

---

## 2. Comandos

```bash
npm test                # suite offline: nodos Code, scoring, tickets, afirmaciones
npm run test:rls        # RLS real sobre un PostgreSQL desechable (necesita Docker)
npm run test:escenarios # validación funcional de punta a punta (necesita el sistema levantado)
```

Las dos primeras corren en CI (`.github/workflows/ci.yml`) en cada push. La
tercera es manual: necesita n8n publicado, la base configurada y las
credenciales, porque **no simula nada**.

---

## 3. Verificación de la RLS

`npm run test:rls` levanta `postgres:16-alpine`, monta el andamiaje mínimo de
Supabase (los roles `anon` / `authenticated` / `service_role`, el esquema `auth`
y la función `auth.uid()`), aplica **`db/schema.sql` tal cual está en el
repositorio** —dos veces, para comprobar que es idempotente— y después intenta,
rol por rol, todo lo que el modelo de seguridad promete impedir.

Los 24 casos cubren:

- **El público (`anon`) no accede a nada**: ni tablas ni vistas.
- **Estar logueado no alcanza**: un usuario sin rol `admin` ve 0 filas — la RLS
  filtra, no da error, que es justamente lo que hace difícil detectarla a ojo.
- **El admin lee el tablero**, incluidas las vistas `security_invoker`.
- **La auditoría está cerrada**: ni siquiera el admin puede leer `logs`.
- **Nadie escribe desde el navegador**: no hay políticas de INSERT/UPDATE/DELETE,
  así que el admin tampoco puede modificar un lead.
- **No hay escalada de privilegios**: un usuario no puede darse el rol `admin`.
- **`profiles` es privada**: cada uno ve sólo su fila.
- **`service_role` (n8n) escribe y lee todo**, que es el diseño declarado.

La respuesta a la cuestión 2 de la defensa pasa a ser: *«está aplicada, y así se
verifica — mirá»*.

> **Alcance.** El harness verifica el **esquema versionado**, que es el artefacto
> que entrega la tesis. Que una instancia productiva concreta tenga ese esquema
> aplicado sigue siendo un paso del desplegador (el reencuadre M2 del dictamen).
> Lo que ya no se puede afirmar es que las políticas «no estén probadas».

---

## 4. Validación funcional (E1–E10)

`tests/escenarios.mjs` ejercita el ciclo completo contra el sistema levantado:
alta de lead HOT y COLD, lectura de la propuesta con y sin token válido,
aceptación concurrente, pago idempotente, rechazo, pedido de cambios, estado del
trabajo y token vencido.

Cada escenario mide cuánto tardó. La corrida escribe
`docs/evidencia-validacion.md` con la tabla de resultados y la de métricas,
listo para citar en §5.

Dos detalles que importan para la defensa:

- **La aceptación concurrente se prueba de verdad**: las dos peticiones salen
  con `Promise.all`, sin esperar a que la primera termine. Es el escenario que
  respalda la afirmación de §4.3.2.
- **La columna «Tabla 9» del reporte se completa sólo donde el mapeo es
  inequívoco** (E8, E9, E10, confirmados por el checklist del dictamen v2). El
  resto queda en `—`: hay que cotejarlo contra el documento antes de citarlo.
  El runner no inventa la correspondencia.

Antes de correrla:

```bash
node tests/escenarios.mjs --verificar   # chequea configuración y conectividad
```

---

## 5. Cambios de seguridad

### 5.1 Vigencia del enlace de aceptación

El token UUID no vencía nunca. Ahora `leads.token_expira_en` se estampa al
enviar (o reenviar) la propuesta, con `TOKEN_VIGENCIA_DIAS` días de validez, y
**todas** las consultas que aceptan el token la revalidan:

```sql
... AND (token_expira_en IS NULL OR token_expira_en > now())
```

`IS NULL` deja pasar los leads anteriores a la columna: los enlaces ya emitidos
siguen funcionando. La condición está en las cuatro consultas que aceptan token
(ver propuesta, aceptar, rechazar, pedir cambios), no sólo en la de aceptación.

### 5.2 Credencial en los webhooks del panel

Los webhooks que dispara el panel interno (`trabajo-estado`, `lead-cancelar`,
`cambio-aceptar`, `cambio-rechazar`) mutan el estado del negocio y **se llamaban
desde el navegador sin ninguna credencial**: cualquiera que conociera la URL
pública de n8n podía cancelar un pedido.

Ahora usan **Header Auth** de n8n y el navegador ya no los llama directo: pasan
por `/api/crm/[accion]`, un route handler de Next.js que revalida sesión + rol
`admin` y agrega el header del lado del servidor.

**Por qué no se hizo lo mismo con el resto.** El formulario público
(`lead/nuevo`) y los enlaces del cliente (`lead-acepta`, `lead-rechaza`,
`lead-modifica`, `lead-propuesta`) no pueden llevar un secreto: los ejecuta el
navegador de un tercero y quedaría expuesto en el código. Esos siguen
protegidos por el token UUID —ahora con vencimiento— que es el mecanismo
adecuado para ese caso. Poner ahí un secreto compartido sería seguridad
aparente.

### 5.3 Qué sigue abierto

- **Rate limiting / captcha en el formulario público.** Hoy nada impide inundar
  `lead/nuevo` con altas falsas. Es la mitigación que corresponde a ese endpoint,
  y queda como trabajo futuro.
- **El token viaja en la query string** del `GET /lead-propuesta`, con lo que
  puede quedar en logs de intermediarios. La vigencia acota la ventana, pero no
  lo elimina.

---

## 6. Robustez

- **La aceptación responde antes de la cadena larga.** Con `executionOrder: v1`
  las ramas corren en el orden del array de conexiones, y la cadena
  factura → Gotenberg → Gmail estaba **antes** del nodo que responde: si algo
  fallaba ahí, el webhook nunca contestaba y el front tiraba
  `Unexpected end of JSON`. Ahora el `Respond` va primero.
- **Los PATCH a Notion no tumban la ejecución** (`onError: continuar`). Cubre más
  casos que un `IF` por `card_id` vacío: página borrada, token revocado, rate
  limit o lead anterior a la integración.
- **`card_id` a prueba de fallos**: si la creación de la card falla, el `UPDATE`
  usa `COALESCE(NULLIF($1, ''), card_id)` y deja el valor como estaba en vez de
  escribir basura.

---

## 7. Índices y restricciones

`db/schema.sql` sumó:

- Índices en `logs` (`creado_en`, `lead_id`, y uno parcial sobre `nivel` para
  `WARN`/`ERROR`): la tabla de auditoría no tenía ninguno y es la que más crece.
- `facturas(estado_pago, fecha_vencimiento)`: resuelve filtro y orden juntos para
  el cron de recordatorios.
- `leads(accept_token, token_expira_en)`: la ruta caliente del flujo de aceptación.
- `chk_facturas_fechas` (`NOT VALID`): exige coherencia de fechas en las filas
  nuevas sin invalidar las existentes, para que el script siga siendo ejecutable
  sobre una base con datos.

> **Honestidad de alcance:** a la escala del MVP estos índices no cambian los
> tiempos de forma observable. Se agregan porque las consultas que los usan ya
> están escritas y son las que crecerían en un uso real. No se presentan como
> una mejora de rendimiento medida.

---

## 8. Coherencia entre el documento y el código

`npm run test:afirmaciones` recalcula desde el repositorio los números que
afirma la tesis (nodos, webhooks, crons, tablas, vistas, enums, umbrales de
scoring) y los compara contra `docs/afirmaciones-tesis.json`.

Los cambios posteriores al corte documental se declaran ahí con
`delta_documentado` + `nota`, de modo que aparecen **explicados** en vez de como
una falla. Hoy hay dos: los 2 nodos que el módulo de tickets sumó al CRM.

> ⚠️ **Pendiente tuyo:** la tesis dice «128 nodos funcionales» y el CRM tiene
> ahora 130. Hay que resolverlo en el `.docx` —lo más limpio es documentar el
> módulo de tickets como extensión posterior fechada, que además muestra
> evolución del trabajo—. El verificador deja el desvío a la vista para que no
> se pase por alto.
