# Tickets

Tablero tipo Trello del panel (`/dashboard/tickets`) para las tareas del
trabajo. Hasta el 23-sep-2026 los tickets vivían en una base de Notion y un
workflow de n8n de 39 nodos traducía entre el tablero y la API de Notion; ahora
son una tabla más de la base y n8n sólo corre el cron de envejecimiento.

## 1. Envejecimiento

Un ticket que nadie toca sube solo de prioridad hasta que se atiende:

| Prioridad | Tolera sin moverse | Peso en el score |
|---|---|---|
| `BAJA` | 10 días | 10 |
| `MEDIA` | 7 días | 25 |
| `ALTA` | 4 días | 50 |
| `CRITICA` | tope, no escala | 80 |

- **Escalada.** Cada día a las 8:00 (`workflow/tickets.json`), los tickets
  abiertos que llevan más días quietos de los que tolera su prioridad suben un
  escalón. Es una sola sentencia SQL, así que dos corridas el mismo día no
  escalan dos veces.
- **Tocar un ticket reinicia el reloj.** Moverlo de columna o cambiarle la
  prioridad (desde el tablero o por una escalada) actualiza
  `ultimo_movimiento`: lo hace el trigger `trg_tickets_movimiento`, no el
  código que lo llama.
- **Score** = peso de la prioridad + 2 por día abierto, con tope 100; un
  ticket en `HECHO` vale 0. No se guarda: lo calcula la vista
  `tickets_tablero` al momento, junto con `dias_abierto`, `dias_quieto` y
  `dias_para_escalar`.

```
día 0   "Renombrar carpeta de assets"   BAJA      score 10
día 10  nadie lo tocó → sube            MEDIA     score 45
día 17  nadie lo tocó → sube            ALTA      score 84
día 21  nadie lo tocó → sube            CRITICA   score 100
```

Después de escalar, el cron manda por Telegram lo que subió y lo que sigue en
`CRITICA` sin resolver (`TICKETS_TELEGRAM_CHAT_ID`, o `TELEGRAM_CHAT_ID`).

La escala está en `db/schema.sql`: los enums `ticket_estado` y
`ticket_prioridad` (el orden del enum es la escala) y las funciones
`ticket_dias_escalada` y `ticket_peso`.

## 2. Cómo entran y se mueven

| Quién | Cómo |
|---|---|
| El tablero | `POST /api/tickets` (crear) y `POST /api/tickets/estado` (mover o cambiar prioridad), con la sesión del admin. La RLS vuelve a exigir el rol `admin` en la base. |
| El CRM | Al aceptarse una propuesta, `Postgres - Crear Tickets Proyecto` siembra los tickets del proyecto con la plantilla `TICKETS_PLANTILLA_PROYECTO` (`Titulo\|PRIORIDAD\|dias_hasta_vencer;…`, con `{cliente}` y `{servicio}`). No duplica si la aceptación se repite. |
| El cron | Sube la prioridad (ver arriba). |

Nadie borra tickets: no hay política ni privilegio de `DELETE`.

## 3. Pruebas

- `npm run test:rls`: que `anon` y un usuario sin rol no lean ni escriban
  tickets, que el admin sí, que nadie los borre y que `n8n_writer` pueda
  sembrarlos.
- `npm run test:idempotencia`: la siembra sin duplicados, el score, el SQL real
  del cron (quién escala y quién no, el tope en `CRITICA`, que una segunda
  corrida no escale) y el cierre al pasar a `HECHO`.
- `FormularioLeads/src/app/api/tickets/estado/route.test.ts` y
  `src/lib/tickets.test.ts`: validación de la API y el mapeo de la vista.
