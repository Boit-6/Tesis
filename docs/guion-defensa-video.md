# Guion de defensa en video — Trabajo Final (10 min)

> **Trabajo:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e
> implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente.*
> **Autores:** Mateo Morgui y Tobías Rivas. **Director:** Alberto Cortez. **Institución:** Tecnicatura
> Universitaria en Programación, UTN–FRM.
>
> Guion cronometrado a **10:00**, repartido en **partes iguales**: Mateo **5:00** y Tobías **5:00**.
> Los tiempos son una guía; leer con naturalidad. Los datos, cifras y afirmaciones están tomados del
> documento y del artefacto (`workflow/crm_postgres.json`, `db/schema.sql`, `FormularioLeads/src/`).

## Reparto del tiempo

| Bloque | Tramo | Quién | Duración |
|---|---|---|---|
| Apertura (parte 1) | 0:00–0:25 | **Mateo** | 25 s |
| Apertura (parte 2) | 0:25–0:45 | **Tobías** | 20 s |
| Problema y motivación | 0:45–2:00 | **Mateo** | 1:15 |
| Pregunta de investigación y objetivos | 2:00–3:00 | **Tobías** | 1:00 |
| Marco teórico / antecedentes | 3:00–4:30 | **Mateo** | 1:30 |
| Metodología (enfoque, requisitos, arquitectura) | 4:30–5:40 | **Tobías** | 1:10 |
| Metodología (validación por escenarios) | 5:40–6:30 | **Mateo** | 0:50 |
| Resultados | 6:30–8:00 | **Tobías** | 1:30 |
| Discusión y conclusiones | 8:00–9:00 | **Mateo** | 1:00 |
| Limitaciones, trabajo futuro y cierre | 9:00–10:00 | **Tobías** | 1:00 |

> **Mateo:** 0:25 + 1:15 + 1:30 + 0:50 + 1:00 = **5:00** · **Tobías:** 0:20 + 1:00 + 1:10 + 1:30 + 1:00 = **5:00**

---

## [0:00–0:25] Apertura e identificación · **MATEO**

"Buenos días. Mi nombre es **Mateo Morgui** y, junto a mi compañero Tobías Rivas, presento nuestro
trabajo final titulado *«Automatización de un sistema de tickets para freelancers con n8n»*,
desarrollado bajo la dirección de **Alberto Cortez** en la Tecnicatura Universitaria en Programación
de la UTN."

## [0:25–0:45] Apertura — hoja de ruta · **TOBÍAS**

"En los próximos diez minutos vamos a recorrer el **problema** que
motivó el trabajo, la **pregunta de investigación** y los **objetivos**, el **marco teórico**, la
**metodología** y la arquitectura que construimos, los **resultados** de la validación y, para cerrar,
las **conclusiones**, las limitaciones y las líneas de trabajo futuro."

## [0:45–2:00] Problema y motivación · **MATEO**

"El freelance profesional gestiona su ciclo comercial de forma **manual y fragmentada**: las consultas
llegan dispersas, las propuestas se escriben a mano, el seguimiento queda en la memoria y los cobros
se persiguen por chat. El resultado es concreto: **se pierde tiempo y se proyecta
poca profesionalidad**.

Y no es un problema menor: el trabajo independiente viene creciendo de forma sostenida —los investigadores Kässi y
Lehdonvirta, de la Universidad de Oxford, reportan un aumento cercano al **21 %** en la economía freelance, y la OIT confirma la
tendencia—, con lo cual cada vez más personas enfrentan esta misma gestión artesanal, sin
herramientas a su medida. Las soluciones del mercado son caras, atan al usuario a una plataforma y no
le dan propiedad sobre sus propios datos.

El **para qué** de nuestro trabajo es, entonces, darle al freelance un pipeline que automatice de
punta a punta ese ciclo comercial: desde que entra un lead hasta el cobro y el cierre."

## [2:00–3:00] Pregunta de investigación y objetivos · **TOBÍAS**

"La **pregunta central** que guio el trabajo fue: ¿es posible **automatizar de extremo a extremo** el
ciclo de vida comercial de un freelancer —captación, calificación, propuesta, aceptación, facturación
y cobro— con una arquitectura **orientada a eventos y de bajo código**?

De ahí se desprende nuestro **objetivo general**: diseñar e implementar una plataforma web que
automatice ese ciclo completo. Y lo bajamos a **cinco objetivos específicos**: primero, **captar y
calificar** leads de forma automática mediante un scoring; segundo, **generar y enviar propuestas** y
resolver de forma segura su aceptación, rechazo o pedido de cambios; tercero, **automatizar la
facturación y el cobro**; cuarto, **centralizar la información** en una única fuente de verdad, con
seguridad por rol y un tablero en tiempo real; y quinto, **validar** el sistema con escenarios
controlados. Este es el mapa de lo que vamos a demostrar."

## [3:00–4:30] Marco teórico / antecedentes · **MATEO**

"Nuestro enfoque se apoya en cuatro conceptos. Primero, la **automatización de procesos de negocio**:
modelar el flujo comercial como una secuencia de pasos disparados por eventos. Segundo, la
**arquitectura orientada a eventos** y los **webhooks**, que permiten que cada acción —un lead nuevo,
una aceptación, un pago— dispare el paso siguiente. Tercero, las herramientas de **bajo código**, y en
particular **n8n**, como motor de orquestación. Y cuarto, la noción de **CRM** como sistema que
acompaña el ciclo de vida del cliente.

En cuanto a los antecedentes, nos apoyamos en tres referencias que sostienen el enfoque: **Järvinen y
Taiminen (2016)** sobre automatización en marketing, **Kässi y Lehdonvirta (2018)** sobre el
crecimiento del trabajo freelance, y **Mero y colaboradores (2020)** sobre adopción de la
automatización.

¿Dónde se ubica nuestro aporte? Las plataformas existentes —HubSpot, Pipedrive, Zapier, Make—
resuelven partes del problema, pero con **costo recurrente** y sin **propiedad total del dato**. El
vacío que detectamos, y que constituye nuestra contribución, es un pipeline **auto-alojable, de bajo
costo operativo y con control total sobre los datos**. En una frase: la decisión de **construir** en
lugar de solo **configurar**."

## [4:30–5:40] Metodología — enfoque, requisitos y arquitectura · **TOBÍAS**

"Metodológicamente, este es un trabajo de **desarrollo tecnológico aplicado**: el resultado principal
es un **artefacto de software**, no la contrastación de una hipótesis estadística. Lo construimos con
un ciclo **iterativo-incremental**, partiendo de **requisitos funcionales** y de **requisitos no
funcionales** ordenados según la norma **ISO/IEC 25010**.

La arquitectura está **desacoplada en tres capas**. La capa de **presentación** es un frontend en
**Next.js** sobre Vercel: el formulario de leads, la página de aceptación y el tablero interno. La
capa de **orquestación** es **n8n**, que concentra toda la lógica de negocio: **11 webhooks** y **3
procesos programados**, con **128 nodos** funcionales en total. Y la capa de **datos** es
**PostgreSQL sobre Supabase** como **única fuente de verdad**: cinco tablas, dos vistas calculadas y
seguridad a nivel de fila por rol *admin*. El frontend nunca escribe la base directo: habla con n8n
por HTTP, y n8n es el único que escribe. Así cada capa se cambia sin romper las otras."

## [5:40–6:30] Metodología — validación por escenarios · **MATEO**

"Sobre esa arquitectura, la **validación** se hizo con **escenarios controlados**: definimos diez
casos —del E1 al E10— que ejercitan tanto el camino principal como los alternativos de cada flujo.
Cada escenario tiene una **entrada definida** y una **salida esperada**, que contrastamos contra
criterios objetivos: la normalización de los datos, el score y el *tier* asignados, las transiciones
de estado en la base y la actualización en tiempo real.

Además, los nodos de código están respaldados por una **prueba de humo automatizada** que ejecuta cada
uno con datos representativos. Somos honestos en un punto: el trabajo **no incluye un relevamiento
primario con usuarios reales**; la validación es de la **construcción del artefacto**."

## [6:30–8:00] Resultados · **TOBÍAS**

"Los resultados confirman que el ciclo completo funciona de extremo a extremo. De los diez escenarios,
**E1 a E9 tienen evidencia visual adjunta** —capturas del formulario, del scoring, de la propuesta, de
la aceptación, de la factura y del tablero— y en todos el comportamiento observado coincidió con el
esperado.

Quiero destacar dos resultados técnicos. El primero es el **scoring**: cada lead se clasifica
automáticamente como **HOT** —score mayor o igual a 70— o **WARM** —mayor o igual a 40—, ponderando
presupuesto, urgencia y tipo de servicio; eso decide qué leads reciben propuesta de forma prioritaria.

El segundo, y el más importante en cuanto a robustez, es la **aceptación atómica**. La confirmación de
una propuesta se resuelve con una **actualización condicional**: un `UPDATE` sobre la fila del lead
que solo aplica si el estado todavía lo permite, y que devuelve las filas afectadas. PostgreSQL
serializa las peticiones concurrentes, de modo que si el cliente hace doble clic o abre dos pestañas,
**solo la primera factura**; la segunda afecta cero filas y no genera nada. Con esto **eliminamos la
doble facturación** por concurrencia. Todo esto está respaldado, además, por la prueba de humo
automatizada de los nodos de código."

## [8:00–9:00] Discusión y conclusiones · **MATEO**

"Volviendo a la pregunta de investigación: **sí**, el ciclo comercial del freelance **puede
automatizarse de extremo a extremo** con una arquitectura orientada a eventos de bajo código, y lo
demostramos objetivo por objetivo. Cumplimos los cinco objetivos específicos: captación y scoring,
propuesta y aceptación segura, facturación y cobro, centralización con tablero en tiempo real, y
validación por escenarios.

La **contribución original** del trabajo es haber construido un pipeline **auto-alojable, de bajo
costo y con propiedad total del dato**, frente a las soluciones comerciales de suscripción; es decir,
demostrar que **construir** una solución a medida es viable para este caso. La validez del sistema es
**interna y verificable componente a componente**: cada webhook, cada tabla y cada regla se puede
auditar en el código.

Y somos precisos con el alcance: queda **sugerido, pero no demostrado**, que la solución mejore los
indicadores comerciales reales de un freelance —eso exigiría medir con usuarios en producción—."

## [9:00–10:00] Limitaciones, trabajo futuro y cierre · **TOBÍAS**

"Reconocemos con honestidad las **limitaciones**. Los umbrales del scoring se fijaron por **criterio
experto**, no con datos históricos de conversión: son válidos **de diseño, no empíricamente**. El
sistema corrió **auto-alojado en local**, sin URL pública. El **pago está simulado**, de forma
idempotente. Y la autenticación en la instancia productiva quedó pendiente de verificar.

De ahí se desprende el **trabajo futuro**: **calibrar el scoring** con datos reales de conversión;
**exponer n8n tras HTTPS** con una URL estable para que clientes externos alcancen los webhooks;
**integrar una pasarela de pago real**; y **completar y verificar la seguridad** de la instancia en
producción.

Para cerrar: demostramos que el ciclo comercial de un freelance puede automatizarse de punta a punta
con herramientas de bajo código, un sistema propio y a bajo costo, sin resignar la propiedad de los
datos. Agradecemos a nuestro director, **Alberto Cortez**, al tribunal por su tiempo y a quienes nos
acompañaron en el proceso. **Muchas gracias.**"
