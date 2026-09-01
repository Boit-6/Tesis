# Adenda al informe de evaluación — dos aclaraciones textuales

> Responde a dos observaciones puntuales de redacción/argumentación de un informe de evaluación
> tipo CONEAU sobre `FormularioLeads/tesis.docx`. A diferencia de `dictamen-v6-reejecucion.md`, este
> documento no reevalúa el trabajo: entrega el texto ya redactado, listo para pegar en el `.docx`,
> con la sección exacta de destino y el tipo de intervención (texto nuevo o reemplazo). La
> integración al `.docx` queda a cargo de los autores — ver la nota final. Fecha: **1 de septiembre
> de 2026**.

---

## Bloque 1 — Tensión entre "validación incremental por incremento" y el cierre tardío de las deudas de seguridad

### Observación del informe de evaluación

El §3.2 ("Metodología de desarrollo") declara que el desarrollo avanzó por cinco incrementos
funcionales, "cada uno integrado y validado antes de abordar el siguiente". El Anexo I ("Bitácora de
correcciones durante el desarrollo") muestra, sin embargo, que el cierre de las deudas de seguridad y
de los defectos estructurales de concurrencia/idempotencia de la Tabla 11 (S1–S8) se concentra en el
tramo final del desarrollo, no distribuido incremento por incremento. Eso puede leerse como que la
validación incremental declarada fue más superficial de lo que el texto da a entender hasta ese
tramo, y que el endurecimiento real ocurrió en una fase de revisión concentrada.

### Verificación de los hechos citados

Se verificaron las fechas contra dos fuentes independientes del propio `.docx` (párrafo 268, §3.2, y
la tabla de Anexo I / "Tabla 23") y el historial de Git del repositorio. Las ocho deudas de la Tabla
11 (S1–S8) registran su cierre —total o parcial— entre el **23 y el 31 de agosto de 2026**:

| Fecha | Deuda cerrada/mitigada | Detalle |
|---|---|---|
| 23-ago-2026 | S2 (parcial) | Webhook de pago en modo desarrollo pasa a rechazarse con credenciales de MercadoPago activas |
| 27-ago-2026 | S7 (cerrada) | Rotación de la `service_role` key del proyecto de Supabase |
| 27-ago-2026 | S6 (cerrada) | Idempotencia en la captación (deduplicación por correo + bloqueo del envío) |
| 27-ago-2026 | S5 (parcial/mitigada) | Reconciliación de facturas — proceso programado, sin frontera transaccional propiamente dicha |
| 31-ago-2026 | S1 (parcial) | Token por factura en `pago-confirmado` |
| 31-ago-2026 | S3 (parcial) | Rotación del token de aceptación en cada reenvío |
| 31-ago-2026 | S4 (cerrada) | Rol acotado `n8n_writer`, sin `BYPASSRLS`, en reemplazo de `service_role` |
| 31-ago-2026 | S8 (cerrada) | Firma obligatoria (HMAC) del webhook de MercadoPago |

Fuente primaria de la tabla: Anexo I del `.docx` ("Tabla 23. Bitácora de correcciones durante el
desarrollo"), confirmada además por `docs/verificacion-y-seguridad.md` (§5.1.1, §5.3) y por las fechas
de commit del repositorio (`f026883`, `ac40e36`, `d72084c`, `6ce2695`, `6b37297`, todos con fecha de
commit 2026-08-27 o 2026-08-31). Los cinco casos que el informe de evaluación cita explícitamente
(idempotencia de captación S6, rol `n8n_writer` S4, frontera transaccional/reconciliación S5,
rotación de token S3, firma obligatoria de MercadoPago S8) están confirmados tal cual los describe.
La observación es correcta: la afirmación es sostenible y no requiere corregir ningún dato de la
tesis, solo completar lo que el §3.2 no aclara.

### Ubicación de destino

**§3.2 "Metodología de desarrollo"**, al final del único párrafo que compone ese apartado (el que
termina "...el historial público del repositorio permite verificar la secuencia."). **Texto nuevo**
(no reemplaza nada existente; se agrega a continuación del párrafo actual, como uno o dos párrafos
adicionales dentro del mismo apartado).

Alternativa igualmente válida, si los autores prefieren no extender §3.2: insertar el mismo texto
como nota de apertura del **Anexo I**, antes de la Tabla 23, dado que ese anexo es donde primero se
hace visible la concentración de fechas. Se redacta pensando en la primera ubicación (§3.2), que es
la que un tribunal lee antes de llegar al Anexo I.

### Texto propuesto (listo para copiar y pegar)

Corresponde precisar el alcance de la expresión «cada uno integrado y validado antes de abordar el siguiente» del párrafo anterior, para que no se lea como una afirmación más fuerte de la que sostiene la evidencia del Anexo I. Los cinco incrementos sí se completaron y se validaron de forma secuencial en cuanto a su camino principal: cada uno ejecutó satisfactoriamente la funcionalidad básica que le correspondía —más al menos un camino alternativo, como fija el criterio de cierre ya declarado— antes de que comenzara el siguiente, y el historial de Git permite reconstruir esa secuencia. Lo que no avanzó al mismo ritmo fue la revisión de seguridad, concurrencia e idempotencia. De las ocho deudas que identifica la Tabla 11 (S1 a S8), el Anexo I registra el cierre —total o parcial— de las ocho entre el 23 y el 31 de agosto de 2026: la deuda del pago en modo de desarrollo (S2) el día 23; la rotación de credenciales del proyecto (S7), la deduplicación en la captación (S6) y la reconciliación de facturas ante la ausencia de frontera transaccional (S5) el día 27; y el token por factura en el pago (S1, parcial), la rotación del token de aceptación (S3, parcial), el rol acotado n8n_writer en reemplazo de service_role (S4) y la firma obligatoria del webhook de MercadoPago (S8) el día 31, la fecha de la última corrección registrada en esta bitácora. Ningún incremento posterior al primero cerró su propia deuda de seguridad antes de que comenzara el siguiente: las ocho se abordaron, en los hechos, como una fase de endurecimiento posterior a los cinco incrementos funcionales y concentrada en la última semana del desarrollo, y no incremento por incremento como podría sugerir el criterio de cierre enunciado más arriba.

Se declara esto como una limitación real del proceso de desarrollo, y no del artefacto que se defiende: las ocho deudas de la Tabla 11 quedaron efectivamente cerradas o mitigadas y verificadas contra el sistema real antes de la entrega, con la evidencia ejecutable que documentan el Anexo I y el Capítulo 5, de modo que el resultado final sí incorpora esa revisión. Lo que no puede sostenerse es que el proceso que lo produjo haya sido incremental en el eje de seguridad del mismo modo en que lo fue en el eje funcional: el criterio de cierre efectivamente aplicado a cada incremento evaluaba la ejecución de su camino principal y de un camino alternativo, no su superficie de exposición ni su comportamiento bajo escritura concurrente. De repetirse este trabajo, el criterio de cierre de cada incremento debería incorporar explícitamente una revisión de seguridad y de concurrencia acotada a lo que ese incremento agrega —no solo la ejecución de su camino principal—, en lugar de diferir esa revisión a una fase final previa a la defensa.

---

## Bloque 2 — Por qué no se formula una hipótesis en sentido estricto

### Observación del informe de evaluación

El §3.1 declara que, por tratarse de "un desarrollo tecnológico de carácter aplicado", el trabajo no
formula una hipótesis en sentido estadístico, y adopta en su lugar una "proposición orientadora" con
tres condiciones explícitas de refutación. La decisión es metodológicamente defendible, pero un
tribunal apegado a la letra de un reglamento que exija nominalmente el término "hipótesis" podría
objetarla si el documento no la fundamenta de forma explícita y autocontenida.

### Verificación de los hechos citados

Se ubicó el texto exacto en el `.docx`: el §3.1 ("Tipo y naturaleza del trabajo") efectivamente dice
"por esa razón no se formula una hipótesis en sentido estadístico" y remite a la pregunta de
investigación y a los objetivos. La "Proposición orientadora", con sus tres condiciones de
refutación, no está en el §1.6 como cita el informe de evaluación, sino en el **§1.5** ("Objetivo
general"), inmediatamente después del párrafo que dice "Este trabajo no formula una hipótesis en
sentido convencional [...] El §3.1 desarrolla en detalle el fundamento metodológico de esta
decisión". El §1.6 son los objetivos específicos (OE1–OE6) y no contiene la proposición ni las
condiciones de refutación. Se trata de un error de cita del informe de evaluación, no del `.docx`; el
texto que se propone abajo usa la ubicación correcta (§1.5) y así debería consignarse si se cita esta
observación en cualquier respuesta a la evaluación.

También se confirmó contra el propio documento que §3.1 no define población ni muestra (la revisión
metodológica del Capítulo 3 lo declara "Ausente, declarado" en ambos casos), lo que sostiene el
argumento central del texto propuesto: sin población ni muestra, una hipótesis en sentido estadístico
sería un formalismo sin referente.

### Ubicación de destino

**§3.1 "Tipo y naturaleza del trabajo"**, como apartado nuevo con subtítulo propio, a continuación del
único párrafo que compone hoy ese apartado (el que termina "...el enfoque, cualitativo-descriptivo con
registro de indicadores puntuales de ejecución."). **Texto nuevo** (no reemplaza el párrafo existente;
se agrega como un apartado con su propio encabezado dentro de §3.1).

### Texto propuesto (listo para copiar y pegar)

**Por qué se adopta una proposición orientadora y no una hipótesis estadística**

La afirmación anterior —que este trabajo no formula una hipótesis en sentido estadístico— podría leerse como una omisión antes que como una decisión metodológica, y conviene fundamentarla de forma explícita. Una hipótesis en el sentido de la investigación empírica es un enunciado sobre una población que se contrasta, mediante inferencia estadística, a partir de una muestra: exige, para tener contenido, definir esa población y extraer de ella una muestra sobre la que calcular la probabilidad de un resultado. Este trabajo, como ya declara este mismo apartado y retoma el cuadro metodológico del Capítulo 3, no define ninguna de las dos: no hay un universo de freelancers del que este sistema sea una muestra, ni una serie de observaciones independientes sobre las que calcular un estadístico. Formular en ese contexto una «hipótesis» con la sintaxis de la inferencia estadística —por ejemplo, enunciar una diferencia esperada entre grupos y un nivel de significación para rechazarla— no agregaría rigor: produciría un formalismo vacío de contenido, porque no habría población, muestra ni distribución muestral a la que ese enunciado pudiera referirse. Un desarrollo tecnológico aplicado, en cambio, no contrasta una hipótesis sobre una población: valida un artefacto singular —el sistema construido— mediante escenarios de prueba que ejercitan sus caminos principales y alternativos (§3.7), un criterio de validación distinto en su naturaleza y no una versión debilitada del primero.

Por esa razón, este trabajo adopta en su lugar la proposición orientadora que enuncia el §1.5, con sus tres condiciones explícitas de refutación: que algún flujo del ciclo no pudiera completarse; que el sistema tomara por el profesional una decisión de negocio reservada a él; o que el estado de una oportunidad no pudiera reconstruirse con lo que el sistema persiste. Esa proposición cumple la misma función epistémica que se le exige a una hipótesis —ser un enunciado falsable, sometido a una verificación que podría haberlo refutado y no lo hizo (Capítulo 5)— sin forzar sobre un objeto de estudio que no es una muestra el vocabulario de la inferencia estadística, que presupone que sí lo es. La proposición orientadora es, en ese sentido, funcionalmente equivalente a una hipótesis de trabajo: lo que cambia es el instrumento de contrastación —escenarios de prueba en vez de un estadístico de contraste—, no la exigencia de que el enunciado pudiera haber resultado falso.

[Nota para los autores: si el reglamento de la carrera exigiera nominalmente el término «hipótesis» en la estructura del capítulo metodológico, se sugiere evaluar con la dirección de la carrera si corresponde renombrar el apartado del §1.5 de «Proposición orientadora» a «Hipótesis de trabajo (proposición orientadora)», por conformidad formal con ese reglamento y sin alterar su contenido ni sus tres condiciones de refutación.]

---

## Nota final

Este archivo es un **borrador de texto para que los autores lo integren** en `FormularioLeads/tesis.docx`
— no es una edición del `.docx` en sí (no se tocó ese archivo ni ningún archivo de código del
repositorio). Antes de pegarlo, conviene que los autores:

1. Revisen que el estilo de párrafo aplicado en Word coincida con el resto de §3.1/§3.2 (fuente,
   interlineado, sangría de primera línea).
2. Si se opta por la ubicación alternativa del Bloque 1 (Anexo I en lugar de §3.2), ajusten la
   referencia cruzada del primer párrafo ("del párrafo anterior") en consecuencia.
3. Decidan si corresponde renombrar "Proposición orientadora" según la nota entre corchetes del
   Bloque 2, y si así fuera, actualicen también la única otra mención textual de esa expresión en el
   Capítulo 5 ("Cierre de la proposición orientadora").
