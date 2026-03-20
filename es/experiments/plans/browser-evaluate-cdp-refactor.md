---
summary: "Plan: aislar browser act:evaluate de la cola de Playwright usando CDP, con plazos de un extremo a otro y una resolución de referencias más segura"
read_when:
  - Trabajando en problemas de tiempo de espera, cancelación o bloqueo de cola del navegador `act:evaluate`
  - Planificación del aislamiento basado en CDP para la ejecución de evaluación
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP Refactor"
---

# Plan de Refactorización de Browser Evaluate CDP

## Contexto

`act:evaluate` ejecuta JavaScript proporcionado por el usuario en la página. Hoy se ejecuta a través de Playwright
(`page.evaluate` o `locator.evaluate`). Playwright serializa los comandos CDP por página, por lo que una
evaluación atascada o de larga duración puede bloquear la cola de comandos de la página y hacer que cada acción posterior
en esa pestaña parezca "atascada".

El PR #13498 agrega una red de seguridad pragmática (evaluación limitada, propagación de cancelación y recuperación
de mejor esfuerzo). Este documento describe una refactorización más grande que hace que `act:evaluate` esté inherentemente
aislado de Playwright, de modo que una evaluación atascada no pueda bloquear las operaciones normales de Playwright.

## Objetivos

- `act:evaluate` no puede bloquear permanentemente las acciones posteriores del navegador en la misma pestaña.
- Los tiempos de espera son la única fuente de verdad de un extremo a otro, para que quien llama pueda confiar en un presupuesto.
- La cancelación y el tiempo de espera se tratan de la misma manera en el envío HTTP y en proceso.
- La orientación de elementos para la evaluación es compatible sin tener que cambiar todo fuera de Playwright.
- Mantener la compatibilidad con versiones anteriores para los llamadores y cargas útiles existentes.

## No objetivos

- Reemplazar todas las acciones del navegador (hacer clic, escribir, esperar, etc.) con implementaciones CDP.
- Eliminar la red de seguridad existente introducida en el PR #13498 (sigue siendo un respaldo útil).
- Introducir nuevas capacidades no seguras más allá de la puerta `browser.evaluateEnabled` existente.
- Agregar aislamiento de procesos (proceso/hilo de trabajo) para la evaluación. Si todavía vemos estados atascados difíciles de recuperar
 después de esta refactorización, esa es una idea de seguimiento.

## Arquitectura Actual (Por Qué Se Bloquea)

A un alto nivel:

- Los llamantes envían `act:evaluate` al servicio de control del navegador.
- El controlador de ruta llama a Playwright para ejecutar el JavaScript.
- Playwright serializa los comandos de página, por lo que una evaluación que nunca termina bloquea la cola.
- Una cola atascada significa que las operaciones posteriores de hacer clic/escribir/esperar en la pestaña pueden parecer bloquearse.

## Arquitectura propuesta

### 1. Propagación de plazo

Introducir un concepto único de presupuesto y derivar todo a partir de él:

- El llamador establece `timeoutMs` (o un plazo en el futuro).
- El tiempo de espera de la solicitud externa, la lógica del gestor de ruta y el presupuesto de ejecución dentro de la página
  todos usan el mismo presupuesto, con un pequeño margen donde sea necesario para la sobrecarga de serialización.
- La cancelación se propaga como un `AbortSignal` en todas partes para que la cancelación sea consistente.

Dirección de implementación:

- Añadir un pequeño ayudante (por ejemplo `createBudget({ timeoutMs, signal })`) que devuelva:
  - `signal`: la señal AbortSignal vinculada
  - `deadlineAtMs`: plazo absoluto
  - `remainingMs()`: presupuesto restante para operaciones secundarias
- Usar este ayudante en:
  - `src/browser/client-fetch.ts` (despacho HTTP y en proceso)
  - `src/node-host/runner.ts` (ruta de proxy)
  - implementaciones de acciones del navegador (Playwright y CDP)

### 2. Motor de evaluación separado (Ruta CDP)

Añadir una implementación de evaluación basada en CDP que no comparta la cola de comandos por página de Playwright.
La propiedad clave es que el transporte de evaluación es una conexión WebSocket separada
y una sesión CDP separada adjunta al objetivo.

Dirección de implementación:

- Nuevo módulo, por ejemplo `src/browser/cdp-evaluate.ts`, que:
  - Se conecta al endpoint CDP configurado (socket a nivel de navegador).
  - Usa `Target.attachToTarget({ targetId, flatten: true })` para obtener un `sessionId`.
  - Ejecuta ya sea:
    - `Runtime.evaluate` para evaluación a nivel de página, o
    - `DOM.resolveNode` más `Runtime.callFunctionOn` para evaluación de elemento.
  - En tiempo de espera o cancelación:
    - Envía `Runtime.terminateExecution` de mejor esfuerzo para la sesión.
    - Cierra el WebSocket y devuelve un error claro.

Notas:

- Esto todavía ejecuta JavaScript en la página, por lo que la terminación puede tener efectos secundarios. La ventaja
  es que no bloquea la cola de Playwright, y se puede cancelar en la capa de transporte
  terminando la sesión CDP.

### 3. Historia de Ref (Segmentación de elementos sin una reescritura completa)

La parte difícil es la segmentación de elementos. CDP necesita un manejo DOM o `backendDOMNodeId`, mientras
  que hoy la mayoría de las acciones del navegador usan localizadores Playwright basados en refs de instantáneas.

Enfoque recomendado: mantener las refs existentes, pero adjuntar un id resoluble por CDP opcional.

#### 3.1 Ampliar la información de referencia almacenada

Ampliar los metadatos de referencia de rol almacenados para incluir opcionalmente un ID de CDP:

- Hoy: `{ role, name, nth }`
- Propuesto: `{ role, name, nth, backendDOMNodeId?: number }`

Esto mantiene todas las acciones basadas en Playwright existentes funcionando y permite que la evaluación de CDP acepte
el mismo valor de `ref` cuando el `backendDOMNodeId` está disponible.

#### 3.2 Rellenar backendDOMNodeId en el momento de la instantánea

Al producir una instantánea de rol:

1. Generar el mapa de referencia de rol existente como hoy (rol, nombre, enésimo).
2. Obtener el árbol AX a través de CDP (`Accessibility.getFullAXTree`) y calcular un mapa paralelo de
   `(role, name, nth) -> backendDOMNodeId` usando las mismas reglas de manejo de duplicados.
3. Fusionar el ID nuevamente en la información de referencia almacenada para la pestaña actual.

Si la asignación falla para una referencia, dejar `backendDOMNodeId` sin definir. Esto hace que la función
sea de mejor esfuerzo y segura de implementar.

#### 3.3 Comportamiento de evaluación con referencia

En `act:evaluate`:

- Si `ref` está presente y tiene `backendDOMNodeId`, ejecutar la evaluación de elementos a través de CDP.
- Si `ref` está presente pero no tiene `backendDOMNodeId`, volver a la ruta de Playwright (con
  la red de seguridad).

Escotilla de escape opcional:

- Ampliar la forma de la solicitud para aceptar `backendDOMNodeId` directamente para llamadores avanzados (y
  para depuración), manteniendo `ref` como la interfaz principal.

### 4. Mantener una ruta de recuperación de último recurso

Incluso con la evaluación de CDP, hay otras formas de bloquear una pestaña o una conexión. Mantener los
mecanismos de recuperación existentes (terminar ejecución + desconectar Playwright) como último recurso
para:

- llamadores heredados
- entornos donde se bloquea el adjunto de CDP
- casos extremos inesperados de Playwright

## Plan de implementación (Iteración única)

### Entregables

- Un motor de evaluación basado en CDP que se ejecuta fuera de la cola de comandos por página de Playwright.
- Un único presupuesto de tiempo de espera/aborto de extremo a extremo utilizado de manera consistente por llamadores y manejadores.
- Metadatos de referencia que pueden llevar opcionalmente `backendDOMNodeId` para la evaluación de elementos.
- `act:evaluate` prefiere el motor de CDP cuando es posible y vuelve a Playwright cuando no.
- Pruebas que demuestran que una evaluación bloqueada no bloquea las acciones posteriores.
- Registros/métricas que hacen visibles los fallos y las alternativas de respaldo.

### Lista de verificación de implementación

1. Agregar un asistente de "presupuesto" compartido para vincular `timeoutMs` + el flujo ascendente `AbortSignal` en:
   - un único `AbortSignal`
   - un plazo absoluto
   - un asistente `remainingMs()` para las operaciones posteriores
2. Actualizar todas las rutas de llamada para usar ese asistente, de modo que `timeoutMs` signifique lo mismo en todas partes:
   - `src/browser/client-fetch.ts` (despacho HTTP y en proceso)
   - `src/node-host/runner.ts` (ruta de proxy de nodo)
   - Contenedores CLI que llaman a `/act` (agregar `--timeout-ms` a `browser evaluate`)
3. Implementar `src/browser/cdp-evaluate.ts`:
   - conectar al socket CDP a nivel de navegador
   - `Target.attachToTarget` para obtener un `sessionId`
   - ejecutar `Runtime.evaluate` para la evaluación de página
   - ejecutar `DOM.resolveNode` + `Runtime.callFunctionOn` para la evaluación de elemento
   - en caso de tiempo de espera/aborto: mejor esfuerzo `Runtime.terminateExecution` y luego cerrar el socket
4. Extender los metadatos de referencia de rol almacenados para incluir opcionalmente `backendDOMNodeId`:
   - mantener el comportamiento `{ role, name, nth }` existente para las acciones de Playwright
   - agregar `backendDOMNodeId?: number` para la orientación de elementos CDP
5. Rellenar `backendDOMNodeId` durante la creación de la instantánea (mejor esfuerzo):
   - obtener el árbol AX a través de CDP (`Accessibility.getFullAXTree`)
   - calcular `(role, name, nth) -> backendDOMNodeId` y fusionar en el mapa de referencias almacenado
   - si la asignación es ambigua o falta, dejar el ID sin definir
6. Actualizar el enrutamiento `act:evaluate`:
   - si no hay `ref`: usar siempre evaluación CDP
   - si `ref` se resuelve en un `backendDOMNodeId`: usar evaluación de elemento CDP
   - de lo contrario: volver a la evaluación de Playwright (aún limitada y abortable)
7. Mantener la ruta de recuperación de "último recurso" existente como alternativa, no como ruta predeterminada.
8. Agregar pruebas:
   - la evaluación atascada agota el tiempo de espera dentro del presupuesto y el siguiente clic/escritura tiene éxito
   - abortar cancela la evaluación (desconexión del cliente o tiempo de espera) y desbloquea las acciones posteriores
   - los fallos de asignación vuelven correctamente a Playwright
9. Agregar observabilidad:
   - contadores de duración y tiempo de espera de evaluación
   - uso de terminateExecution
   - tasa de respaldo (CDP -> Playwright) y razones

### Criterios de Aceptación

- Un `act:evaluate` deliberadamente colgado devuelve dentro del presupuesto del llamador y no bloquea la pestaña para acciones posteriores.
- `timeoutMs` se comporta de manera consistente en la CLI, la herramienta del agente, el proxy de nodo y las llamadas en proceso.
- Si `ref` se puede asignar a `backendDOMNodeId`, la evaluación del elemento usa CDP; de lo contrario, la ruta de respaldo todavía está limitada y es recuperable.

## Plan de Pruebas

- Pruebas unitarias:
  - Lógica de coincidencia de `(role, name, nth)` entre referencias de rol y nodos del árbol AX.
  - Comportamiento del asistente de presupuesto (margen, matemáticas de tiempo restante).
- Pruebas de integración:
  - El tiempo de espera de la evaluación de CDP devuelve dentro del presupuesto y no bloquea la siguiente acción.
  - La cancelación (abort) anula la evaluación y activa la terminación como mejor esfuerzo.
- Pruebas de contrato:
  - Asegurar que `BrowserActRequest` y `BrowserActResponse` sigan siendo compatibles.

## Riesgos y Mitigaciones

- La asignación es imperfecta:
  - Mitigación: asignación de mejor esfuerzo, respaldo a la evaluación de Playwright y adición de herramientas de depuración.
- `Runtime.terminateExecution` tiene efectos secundarios:
  - Mitigación: usar solo en tiempo de espera/aborto y documentar el comportamiento en los errores.
- Sobrecarga extra:
  - Mitigación: obtener el árbol AX solo cuando se soliciten instantáneas, caché por objetivo y mantener la sesión CDP de corta duración.
- Limitaciones del relé de extensión:
  - Mitigación: usar APIs de conexión a nivel de navegador cuando los sockets por página no están disponibles y mantener la ruta actual de Playwright como respaldo.

## Preguntas Abiertas

- ¿El nuevo motor debe ser configurable como `playwright`, `cdp` o `auto`?
- ¿Queremos exponer un nuevo formato "nodeRef" para usuarios avanzados o mantener solo `ref`?
- ¿Cómo deben participar las instantáneas de marcos y las instantáneas con ámbito de selector en la asignación AX?

import en from "/components/footer/en.mdx";

<en />
