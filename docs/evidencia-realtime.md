# evidencia realtime

| campo | valor |
| --- | --- |
| comando | `node scripts/medir-realtime.mjs --n 20` |
| marca temporal (UTC) | 2026-09-03T00:17:11.220Z |
| commit | 04f7d0d0f7d60d12c625ae3cd9da1e6f562eaa04 |
| commit (corto) | 04f7d0d |
| arbol de trabajo | CON CAMBIOS SIN CONFIRMAR |
| codigo de salida | 0 |
| duracion | 14.3 s |

## salida

```
Escenario E7 — actualización en tiempo real del tablero
Umbral RNF6: 3000 ms · repeticiones: 20

Lead observado: LD-E11E12-RECORDATORIO (Cliente E12 Recordatorio)
Canal abierto.

  repetición 1: 641 ms
  repetición 2: 534 ms
  repetición 3: 521 ms
  repetición 4: 540 ms
  repetición 5: 528 ms
  repetición 6: 539 ms
  repetición 7: 533 ms
  repetición 8: 535 ms
  repetición 9: 538 ms
  repetición 10: 540 ms
  repetición 11: 522 ms
  repetición 12: 525 ms
  repetición 13: 541 ms
  repetición 14: 540 ms
  repetición 15: 525 ms
  repetición 16: 538 ms
  repetición 17: 540 ms
  repetición 18: 539 ms
  repetición 19: 538 ms
  repetición 20: 530 ms

====================================================
Eventos recibidos : 20 de 20
Latencias (ms)    : 521, 522, 525, 525, 528, 530, 533, 534, 535, 538, 538, 538, 539, 539, 540, 540, 540, 540, 541, 641
Máxima            : 641 ms
p95               : 541 ms  (0.54 s)
Umbral RNF6       : 3000 ms
Resultado         : CUMPLE
====================================================
```
