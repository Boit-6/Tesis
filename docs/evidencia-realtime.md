# Medición de propagación al tablero (E7, RNF6)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T17:49:16.828Z |
| Duración | 15.0 s |
| Commit | `177bc9c866be0192d58dde29b56eb7da95c3f045` (177bc9c) |
| Árbol de trabajo | con 2 archivo(s) sin registrar |
| Node.js | v24.18.0 |
| Plataforma | win32 x64 |
| Instrumento | `npm run test:realtime` (scripts/medir-realtime.mjs) |
| Repeticiones | 20 (las que fija el método del §3.7) |
| Umbral | 3000 ms (RNF6) |
| Magnitud | intervalo entre la confirmación de la escritura y la recepción del evento en el cliente; no incluye el repintado de la interfaz |
| Resultado | **OK** (código de salida 0) |

## Salida de la corrida

```
Escenario E7 — actualización en tiempo real del tablero
Umbral RNF6: 3000 ms · repeticiones: 20

Lead observado: LD-1788201138768-5L1N (Cliente Demo Verificacion 2)
Canal abierto.

  repetición 1: 725 ms
  repetición 2: 543 ms
  repetición 3: 544 ms
  repetición 4: 541 ms
  repetición 5: 542 ms
  repetición 6: 537 ms
  repetición 7: 1063 ms
  repetición 8: 543 ms
  repetición 9: 541 ms
  repetición 10: 542 ms
  repetición 11: 552 ms
  repetición 12: 542 ms
  repetición 13: 543 ms
  repetición 14: 540 ms
  repetición 15: 542 ms
  repetición 16: 539 ms
  repetición 17: 541 ms
  repetición 18: 542 ms
  repetición 19: 546 ms
  repetición 20: 544 ms

====================================================
Eventos recibidos : 20 de 20
Latencias (ms)    : 537, 539, 540, 541, 541, 541, 542, 542, 542, 542, 542, 543, 543, 543, 544, 544, 546, 552, 725, 1063
Mínimo            : 537 ms  (0.54 s)
Media             : 578 ms  (0.58 s)
Mediana           : 542 ms  (0.54 s)
p95               : 725 ms  (0.72 s)
Máxima            : 1063 ms  (1.06 s)
Desvío estándar   : 118 ms  (0.12 s)
Nota              : con n = 20 el p95 se resuelve en el penúltimo valor
                    ordenado, contiguo al máximo (§5.2, nota de la Tabla 26).
Umbral RNF6       : 3000 ms
Resultado         : CUMPLE
====================================================
```
