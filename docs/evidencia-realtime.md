# Medición de propagación al tablero (E7, RNF6)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T17:43:16.864Z |
| Duración | 15.6 s |
| Commit | `d1abe08b5cf896f986b92f646c44719755f88661` (d1abe08) |
| Árbol de trabajo | con 7 archivo(s) sin registrar |
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

  repetición 1: 665 ms
  repetición 2: 546 ms
  repetición 3: 543 ms
  repetición 4: 544 ms
  repetición 5: 540 ms
  repetición 6: 544 ms
  repetición 7: 542 ms
  repetición 8: 544 ms
  repetición 9: 543 ms
  repetición 10: 1060 ms
  repetición 11: 546 ms
  repetición 12: 542 ms
  repetición 13: 543 ms
  repetición 14: 541 ms
  repetición 15: 541 ms
  repetición 16: 541 ms
  repetición 17: 540 ms
  repetición 18: 537 ms
  repetición 19: 539 ms
  repetición 20: 539 ms

====================================================
Eventos recibidos : 20 de 20
Latencias (ms)    : 537, 539, 539, 540, 540, 541, 541, 541, 542, 542, 543, 543, 543, 544, 544, 544, 546, 546, 665, 1060
Mínimo            : 537 ms  (0.54 s)
Media             : 574 ms  (0.57 s)
Mediana           : 543 ms  (0.54 s)
p95               : 665 ms  (0.67 s)
Máxima            : 1060 ms  (1.06 s)
Desvío estándar   : 115 ms  (0.11 s)
Nota              : con n = 20 el p95 se resuelve en el penúltimo valor
                    ordenado, contiguo al máximo (§5.2, nota de la Tabla 26).
Umbral RNF6       : 3000 ms
Resultado         : CUMPLE
====================================================
```
