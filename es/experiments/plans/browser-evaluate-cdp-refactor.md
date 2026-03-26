---
summary: "Plan: aislar browser act:evaluate de la cola de Playwright usando CDP, con plazos de extremo a extremo y resolución de referencias más segura"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "borrador"
last_updated: "2026-02-10"
title: "Reestructuración de CDP de Evaluación del Navegador"
---

# Plan de Reestructuración de CDP de Evaluación del Navegador

## Contexto

`act:evaluate` ejecuta JavaScript proporcionado por el usuario en la página. Hoy se ejecuta a través de Playwright
(`page.evaluate` o `locator.evaluate`). Playwright serializa los comandos CDP por página, por lo que una
evaluación atascada o de larga ejecución puede bloquear la cola de comandos de la página y hacer que cada acción posterior
en esa pestaña parezca "atascada".

El PR #13498 agrega una red de seguridad pragmática (evaluación limitada, propagación de aborto y recuperación
de mejor esfuerzo). Este documento describe una reestructuración más grande que hace que `act:evaluate` esté
inherentemente aislado de Playwright, de modo que una evaluación atascada no puede bloquear las operaciones normales de Playwright.

## Objetivos

- `act:evaluate` no puede bloquear permanentemente las acciones posteriores del navegador en la misma pestaña.
- Los tiempos de espera son la única fuente de verdad de extremo a extremo, de modo que una persona que llama pueda confiar en un presupuesto.
- La anulación y el tiempo de espera se tratan de la misma manera en el despacho HTTP y en proceso.
- La orientación de elementos para la evaluación es compatible sin necesidad de desactivar todo en Playwright.
- Mantener la compatibilidad con versiones anteriores para las personas que llaman existentes y las cargas útiles.

## No objetivos

- Reemplazar todas las acciones del navegador (clic, escribir, esperar, etc.) con implementaciones CDP.
- Eliminar la red de seguridad existente introducida en el PR #13498 (permanece como una alternativa útil).
- Introducir nuevas capacidades no seguras más allá de la puerta `browser.evaluateEnabled` existente.
- Agregar aislamiento de procesos (proceso/hilo de trabajo) para la evaluación. Si después de esta reestructuración todavía vemos estados
  atascados difíciles de recuperar, esa es una idea de seguimiento.

## Arquitectura Actual (Por Qué Se Bloquea)

A un alto nivel:

- Las personas que llaman envían `act:evaluate` al servicio de control del navegador.
- El controlador de ruta llama a Playwright para ejecutar el JavaScript.
- Playwright serializa los comandos de página, por lo que una evaluación que nunca termina bloquea la cola.
- Una cola bloqueada significa que las operaciones posteriores de clic/escritura/espera en la pestaña pueden parecer bloquearse.

## Arquitectura propuesta

### 1. Propagación del plazo (Deadline)

Introducir un único concepto de presupuesto y derivar todo de él:

- El llamante establece `timeoutMs` (o un plazo en el futuro).
- El tiempo de espera de la solicitud externa, la lógica del manejador de ruta y el presupuesto de ejecución dentro de la página
  todos usan el mismo presupuesto, con un pequeño margen donde sea necesario para la sobrecarga de serialización.
- La interrupción (Abort) se propaga como un `AbortSignal` en todas partes para que la cancelación sea consistente.

Dirección de implementación:

- Añadir un pequeño ayudante (por ejemplo `createBudget({ timeoutMs, signal })`) que devuelve:
  - `signal`: la señal de Abort vinculada
  - `deadlineAtMs`: plazo absoluto
  - `remainingMs()`: presupuesto restante para operaciones secundarias
- Usar este ayudante en:
  - `src/browser/client-fetch.ts` (despacho HTTP y en proceso)
  - `src/node-host/runner.ts` (ruta de proxy)
  - implementaciones de acciones del navegador (Playwright y CDP)

### 2. Motor de evaluación separado (ruta CDP)

Añadir una implementación de evaluación basada en CDP que no comparta la cola de comandos por página de Playwright.
La propiedad clave es que el transporte de evaluación es una conexión WebSocket separada
y una sesión CDP separada adjunta al objetivo.

Dirección de implementación:

- Nuevo módulo, por ejemplo `src/browser/cdp-evaluate.ts`, que:
  - Se conecta al punto final CDP configurado (socket a nivel de navegador).
  - Usa `Target.attachToTarget({ targetId, flatten: true })` para obtener un `sessionId`.
  - Ejecuta ya sea:
    - `Runtime.evaluate` para evaluación a nivel de página, o
    - `DOM.resolveNode` más `Runtime.callFunctionOn` para evaluación de elemento.
  - En caso de tiempo de espera o interrupción:
    - Envía `Runtime.terminateExecution` de mejor esfuerzo para la sesión.
    - Cierra el WebSocket y devuelve un error claro.

Notas:

- Esto todavía ejecuta JavaScript en la página, por lo que la terminación puede tener efectos secundarios. La ventaja
  es que no bloquea la cola de Playwright y se puede cancelar en la capa de transporte
  matando la sesión CDP.

### 3. Historia de referencia (Segmentación de elementos sin una reescritura completa)

La parte difícil es la orientación de elementos. CDP necesita un identificador DOM o `backendDOMNodeId`, mientras que hoy la mayoría de las acciones del navegador utilizan localizadores de Playwright basados en referencias de instantáneas.

Enfoque recomendado: mantener las referencias existentes, pero adjuntar un ID resoluble por CDP opcional.

#### 3.1 Extender la información de referencia almacenada

Extender los metadatos de la referencia de rol almacenada para incluir opcionalmente un ID de CDP:

- Hoy: `{ role, name, nth }`
- Propuesto: `{ role, name, nth, backendDOMNodeId?: number }`

Esto mantiene funcionando todas las acciones existentes basadas en Playwright y permite que la evaluación de CDP acepte el mismo valor de `ref` cuando `backendDOMNodeId` está disponible.

#### 3.2 Rellenar backendDOMNodeId en el momento de la instantánea

Al producir una instantánea de rol:

1. Generar el mapa de referencias de rol existente como hoy (rol, nombre, enésimo).
2. Obtener el árbol AX a través de CDP (`Accessibility.getFullAXTree`) y calcular un mapa paralelo de `(role, name, nth) -> backendDOMNodeId` utilizando las mismas reglas de manejo de duplicados.
3. Fusionar el ID nuevamente en la información de referencia almacenada para la pestaña actual.

Si la asignación falla para una referencia, dejar `backendDOMNodeId` sin definir. Esto hace que la función sea de mejor esfuerzo y segura de implementar.

#### 3.3 Comportamiento de evaluación con referencia

En `act:evaluate`:

- Si `ref` está presente y tiene `backendDOMNodeId`, ejecutar la evaluación del elemento a través de CDP.
- Si `ref` está presente pero no tiene `backendDOMNodeId`, volver a la ruta de Playwright (con la red de seguridad).

Escaparate opcional:

- Extender la forma de la solicitud para aceptar `backendDOMNodeId` directamente para quienes llaman avanzados (y para depuración), manteniendo `ref` como la interfaz principal.

### 4. Mantener una ruta de recuperación de último recurso

Incluso con la evaluación de CDP, hay otras formas de bloquear una pestaña o una conexión. Mantener los mecanismos de recuperación existentes (terminar ejecución + desconectar Playwright) como último recurso para:

- quienes llaman heredados
- entornos donde se bloquea el adjunto de CDP
- casos extremos inesperados de Playwright

## Plan de implementación (Iteración única)

### Entregables

- Un motor de evaluación basado en CDP que se ejecuta fuera de la cola de comandos por página de Playwright.
- Un presupuesto único de tiempo de espera/aborto de un extremo a otro utilizado consistentemente por quienes llaman y controladores.
- Metadatos de referencia que pueden llevar opcionalmente `backendDOMNodeId` para la evaluación de elementos.
- `act:evaluate` prefiere el motor CDP cuando sea posible y recurre a Playwright cuando no.
- Pruebas que demuestran que una evaluación atascada no bloquea las acciones posteriores.
- Registros/métricas que hacen visibles los fallos y los retrocesos (fallbacks).

### Lista de verificación de implementación

1. Añadir un auxiliar de "presupuesto" compartido para vincular `timeoutMs` + el flujo ascendente `AbortSignal` en:
   - un único `AbortSignal`
   - una fecha límite absoluta
   - un auxiliar `remainingMs()` para operaciones descendentes
2. Actualizar todas las rutas de la persona que llama para usar ese auxiliar, de modo que `timeoutMs` signifique lo mismo en todas partes:
   - `src/browser/client-fetch.ts` (despacho HTTP y en proceso)
   - `src/node-host/runner.ts` (ruta de proxy de nodo)
   - Envoltorios CLI que llaman a `/act` (añadir `--timeout-ms` a `browser evaluate`)
3. Implementar `src/browser/cdp-evaluate.ts`:
   - conectar al socket CDP a nivel de navegador
   - `Target.attachToTarget` para obtener un `sessionId`
   - ejecutar `Runtime.evaluate` para la evaluación de página
   - ejecutar `DOM.resolveNode` + `Runtime.callFunctionOn` para la evaluación de elemento
   - en caso de tiempo de espera/interrupción: `Runtime.terminateExecution` de mejor esfuerzo y luego cerrar el socket
4. Ampliar los metadatos de referencia de rol almacenados para incluir opcionalmente `backendDOMNodeId`:
   - mantener el comportamiento existente `{ role, name, nth }` para las acciones de Playwright
   - añadir `backendDOMNodeId?: number` para la orientación de elementos CDP
5. Rellenar `backendDOMNodeId` durante la creación de instantáneas (best-effort):
   - obtener el árbol AX a través de CDP (`Accessibility.getFullAXTree`)
   - calcular `(role, name, nth) -> backendDOMNodeId` y fusionar en el mapa de referencia almacenado
   - si la asignación es ambigua o falta, dejar el ID indefinido
6. Actualizar el enrutamiento `act:evaluate`:
   - si no hay `ref`: usar siempre la evaluación CDP
   - si `ref` se resuelve en un `backendDOMNodeId`: usar la evaluación de elemento CDP
   - de lo contrario: recurrir a la evaluación Playwright (aún limitada y abortable)
7. Mantener la ruta de recuperación de "último recurso" existente como alternativa, no como ruta predeterminada.
8. Añadir pruebas:
   - la evaluación atascada agota el tiempo de espera dentro del presupuesto y el siguiente clic/escritura se realiza correctamente
   - abortar cancela la evaluación (desconexión del cliente o tiempo de espera) y desbloquea las acciones posteriores
   - los fallos de mapeo vuelven a Playwright de forma limpia
9. Añadir observabilidad:
   - duración de la evaluación y contadores de tiempo de espera
   - uso de terminateExecution
   - tasa de retorno (CDP -> Playwright) y motivos

### Criterios de Aceptación

- Una `act:evaluate` deliberadamente colgada devuelve dentro del presupuesto de la persona que llama y no bloquea la pestaña para acciones posteriores.
- `timeoutMs` se comporta de manera consistente en CLI, herramienta de agente, proxy de nodo y llamadas en proceso.
- Si `ref` se puede mapear a `backendDOMNodeId`, la evaluación de elementos usa CDP; de lo contrario, la ruta de retorno todavía está limitada y es recuperable.

## Plan de Pruebas

- Pruebas unitarias:
  - `(role, name, nth)` lógica de coincidencia entre referencias de roles y nodos del árbol AX.
  - Comportamiento del asistente de presupuesto (margen, matemáticas de tiempo restante).
- Pruebas de integración:
  - El tiempo de espera de evaluación de CDP devuelve dentro del presupuesto y no bloquea la siguiente acción.
  - Abortar cancela la evaluación y activa la terminación de mejor esfuerzo.
- Pruebas de contrato:
  - Asegurarse de que `BrowserActRequest` y `BrowserActResponse` sigan siendo compatibles.

## Riesgos y Mitigaciones

- El mapeo es imperfecto:
  - Mitigación: mapeo de mejor esfuerzo, retorno a la evaluación de Playwright y agregar herramientas de depuración.
- `Runtime.terminateExecution` tiene efectos secundarios:
  - Mitigación: usar solo en tiempo de espera/aborto y documentar el comportamiento en los errores.
- Sobrecarga adicional:
  - Mitigación: obtener el árbol AX solo cuando se solicitan instantáneas, caché por objetivo y mantener la sesión CDP corta.
- Limitaciones de relé de extensiones:
  - Mitigación: usar APIs de conexión a nivel de navegador cuando los sockets por página no estén disponibles y mantener la ruta actual de Playwright como retorno.

## Preguntas Abiertas

- ¿El nuevo motor debería ser configurable como `playwright`, `cdp` o `auto`?
- ¿Queremos exponer un nuevo formato "nodeRef" para usuarios avanzados o mantener solo `ref`?
- ¿Cómo deben participar las instantáneas de marcos y las instantáneas con ámbito de selector en el mapeo AX?

import es from "/components/footer/es.mdx";

<es />
