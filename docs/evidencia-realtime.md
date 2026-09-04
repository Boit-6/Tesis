# Medición de propagación al tablero (E7, RNF6)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T17:51:50.508Z |
| Duración | 14.6 s |
| Commit | `f00916b2e50121426d43ae71da74153773ff38c6` (f00916b) |
| Árbol de trabajo | limpio |
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

  repetición 1: 557 ms
  repetición 2: 542 ms
  repetición 3: 541 ms
  repetición 4: 541 ms
  repetición 5: 542 ms
  repetición 6: 538 ms
  repetición 7: 543 ms
  repetición 8: 540 ms
  repetición 9: 543 ms
  repetición 10: 539 ms
  repetición 11: 553 ms
  repetición 12: 543 ms
  repetición 13: 543 ms
  repetición 14: 539 ms
  repetición 15: 545 ms
  repetición 16: 541 ms
  repetición 17: 544 ms
  repetición 18: 544 ms
  repetición 19: 544 ms
  repetición 20: 542 ms

====================================================
Eventos recibidos : 20 de 20
Latencias (ms)    : 538, 539, 539, 540, 541, 541, 541, 542, 542, 542, 543, 543, 543, 543, 544, 544, 544, 545, 553, 557
Mínimo            : 538 ms  (0.54 s)
Media             : 543 ms  (0.54 s)
Mediana           : 543 ms  (0.54 s)
p95               : 553 ms  (0.55 s)
Máxima            : 557 ms  (0.56 s)
Desvío estándar   : 4 ms  (0.00 s)
Nota              : con n = 20 el p95 se resuelve en el penúltimo valor
                    ordenado, contiguo al máximo (§5.2, nota de la Tabla 26).
Umbral RNF6       : 3000 ms
Resultado         : CUMPLE
====================================================
```
