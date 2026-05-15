---
title: "Puerto del motor de contexto del arnés de Codex"
summary: "Especificación para hacer que el arnés del servidor de aplicaciones Codex incluido respete los complementos del motor de contexto de OpenClaw"
read_when:
  - You are wiring context-engine lifecycle behavior into the Codex harness
  - You need lossless-claw or another context-engine plugin to work with codex/* embedded harness sessions
  - You are comparing embedded PI and Codex app-server context behavior
---

## Estado

Especificación de implementación preliminar.

## Objetivo

Hacer que el arnés del servidor de aplicaciones Codex incluido respete el mismo contrato de ciclo de vida del motor de contexto de OpenClaw que ya respetan los turnos de PI integrados.

Una sesión que utiliza un modelo `agents.defaults.embeddedHarness.runtime: "codex"` o un
modelo `codex/*` aún debe permitir que el complemento del motor de contexto seleccionado, como
`lossless-claw`, controle el ensamblaje del contexto, la ingestión posterior al turno, el mantenimiento y la
política de compactación a nivel de OpenClaw hasta donde lo permita el límite del servidor de aplicaciones de Codex.

## No objetivos

- No volver a implementar los internos del servidor de aplicaciones de Codex.
- No hacer que la compactación de hilos nativos de Codex produzca un resumen de lossless-claw.
- No requerir que los modelos que no son de Codex usen el arnés de Codex.
- No cambiar el comportamiento de la sesión ACP/acpx. Esta especificación es solo para
  la ruta del arnés del agente integrado no ACP.
- No hacer que los complementos de terceros registren fábricas de extensión del servidor de aplicaciones de Codex;
  el límite de confianza del complemento incluido existente permanece sin cambios.

## Arquitectura actual

El bucle de ejecución integrado resuelve el motor de contexto configurado una vez por ejecución antes
de seleccionar un arnés de bajo nivel concreto:

- `src/agents/pi-embedded-runner/run.ts`
  - inicializa los complementos del motor de contexto
  - llama a `resolveContextEngine(params.config)`
  - pasa `contextEngine` y `contextTokenBudget` a
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` delega en el arnés del agente seleccionado:

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

El arnés del servidor de aplicaciones de Codex está registrado por el complemento Codex incluido:

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

La implementación del arnés de Codex recibe el mismo `EmbeddedRunAttemptParams`
que los intentos respaldados por PI:

- `extensions/codex/src/app-server/run-attempt.ts`

Esto significa que el punto de enlace requerido está en el código controlado por OpenClaw. El límite
externo es el protocolo del servidor de aplicaciones Codex en sí: OpenClaw puede controlar lo que
envía a `thread/start`, `thread/resume` y `turn/start`, y puede observar
las notificaciones, pero no puede cambiar el almacén de subprocesos interno de Codex ni el
compactador nativo.

## Brecha actual

Los intentos de PI integrados llaman al ciclo de vida del motor de contexto directamente:

- bootstrap/mantenimiento antes del intento
- ensamblar antes de la llamada al modelo
- afterTurn o ingest después del intento
- mantenimiento después de un turno exitoso
- compactación del motor de contexto para motores que poseen la compactación

Código PI relevante:

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Los intentos del servidor de aplicaciones Codex actualmente ejecutan enlaces genéricos de arnés de agentes y reflejan
la transcripción, pero no llaman a `params.contextEngine.bootstrap`,
`params.contextEngine.assemble`, `params.contextEngine.afterTurn`,
`params.contextEngine.ingestBatch`, `params.contextEngine.ingest` o
`params.contextEngine.maintain`.

Código de Codex relevante:

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## Comportamiento deseado

Para los turnos del arnés de Codex, OpenClaw debe preservar este ciclo de vida:

1. Leer la transcripción de la sesión OpenClaw reflejada.
2. Arrancar el motor de contexto activo cuando existe un archivo de sesión anterior.
3. Ejecutar el mantenimiento de arranque cuando esté disponible.
4. Ensamblar el contexto utilizando el motor de contexto activo.
5. Convertir el contexto ensamblado en entradas compatibles con Codex.
6. Iniciar o reanudar el hilo de Codex con instrucciones de desarrollador que incluyan cualquier
   `systemPromptAddition` del motor de contexto.
7. Iniciar el turno de Codex con el mensaje orientado al usuario ensamblado.
8. Reflejar el resultado de Codex nuevamente en la transcripción de OpenClaw.
9. Llamar a `afterTurn` si está implementado, de lo contrario `ingestBatch`/`ingest`, utilizando la
   instantánea de la transcripción reflejada.
10. Ejecutar el mantenimiento del turno después de turnos exitosos no abortados.
11. Preservar las señales de compactación nativa de Codex y los enlaces de compactación de OpenClaw.

## Restricciones de diseño

### Codex app-server sigue siendo canónico para el estado del hilo nativo

Codex posee su hilo nativo y cualquier historial extendido interno. OpenClaw no debería intentar mutar el historial interno del servidor de la aplicación (app-server) excepto a través de llamadas a protocolos compatibles.

El espejo de la transcripción de OpenClaw sigue siendo la fuente para las características de OpenClaw:

- historial de chat
- búsqueda
- contabilidad de `/new` y `/reset`
- cambio futuro de modelo o arnés (harness)
- estado del complemento del motor de contexto (context-engine)

### El ensamblaje del motor de contexto debe proyectarse en las entradas de Codex

La interfaz del motor de contexto devuelve OpenClaw `AgentMessage[]`, no un parche de hilo de Codex. El Codex app-server `turn/start` acepta una entrada de usuario actual, mientras que `thread/start` y `thread/resume` aceptan instrucciones del desarrollador.

Por lo tanto, la implementación necesita una capa de proyección. La primera versión segura debe evitar fingir que puede reemplazar el historial interno de Codex. Debe inyectar el contexto ensamblado como material de prompt/instrucción del desarrollador determinista alrededor del turno actual.

### La estabilidad de la caché de prompts es importante

Para motores como lossless-claw, el contexto ensamblado debe ser determinista para entradas sin cambios. No añada marcas de tiempo, ids aleatorios ni ordenamiento no determinista al texto de contexto generado.

### La semántica de selección en tiempo de ejecución no cambia

La selección del arnés permanece como está:

- `runtime: "pi"` fuerza PI
- `runtime: "codex"` selecciona el arnés de Codex registrado
- `runtime: "auto"` permite a los arneses de complementos reclamar proveedores compatibles
- las ejecuciones de `auto` no coincidentes usan PI

Este trabajo cambia lo que sucede después de que se selecciona el arnés de Codex.

## Plan de implementación

### 1. Exportar o reubicar los asistentes de intentos del motor de contexto reutilizables

Hoy, los asistentes de ciclo de vida reutilizables viven bajo el ejecutor de PI:

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

Codex no debería importar desde una ruta de implementación cuyo nombre implique PI si podemos evitarlo.

Crear un módulo neutral respecto al arnés (harness-neutral), por ejemplo:

- `src/agents/harness/context-engine-lifecycle.ts`

Mover o re-exportar:

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- un pequeño envoltorio alrededor de `runContextEngineMaintenance`

Mantenga las importaciones de PI funcionando ya sea reexportando desde los archivos antiguos o actualizando los sitios de llamada de PI en el mismo PR.

Los nombres de los ayudantes neutrales no deben mencionar PI.

Nombres sugeridos:

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. Agregar un asistente de proyección de contexto de Codex

Agregar un nuevo módulo:

- `extensions/codex/src/app-server/context-engine-projection.ts`

Responsabilidades:

- Acepta el `AgentMessage[]` ensamblado, el historial reflejado original y el mensaje actual.
- Determinar qué contexto pertenece a las instrucciones del desarrollador frente a la entrada del usuario actual.
- Conservar el mensaje del usuario actual como la solicitud final accionable.
- Renderizar mensajes anteriores en un formato estable y explícito.
- Evitar metadatos volátiles.

API propuesta:

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: { assembledMessages: AgentMessage[]; originalHistoryMessages: AgentMessage[]; prompt: string; systemPromptAddition?: string }): CodexContextProjection;
```

Primera proyección recomendada:

- Poner `systemPromptAddition` en las instrucciones del desarrollador.
- Poner el contexto de la transcripción ensamblada antes del mensaje actual en `promptText`.
- Etiquetarlo claramente como contexto ensamblado por OpenClaw.
- Mantener el mensaje actual al final.
- Excluir el mensaje del usuario actual duplicado si ya aparece al final.

Ejemplo de forma del mensaje:

```text
OpenClaw assembled context for this turn:

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

Current user request:
...
```

Esto es menos elegante que la cirugía de historial nativa de Codex, pero es implementable dentro de OpenClaw y preserva la semántica del motor de contexto.

Mejora futura: si el servidor de aplicaciones Codex expone un protocolo para reemplazar o complementar el historial de hilos, cambiar esta capa de proyección para usar esa API.

### 3. Conectar el arranque antes del inicio del hilo de Codex

En `extensions/codex/src/app-server/run-attempt.ts`:

- Leer el historial de la sesión reflejada como hoy.
- Determinar si el archivo de sesión existía antes de esta ejecución. Preferir un ayudante que verifique `fs.stat(params.sessionFile)` antes de escribir las reflejos.
- Abrir un `SessionManager` o usar un adaptador de administrador de sesión estrecho si el ayudante lo requiere.
- Llamar al asistente de arranque neutral cuando `params.contextEngine` existe.

Pseudoflujo:

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

Use la misma convención `sessionKey` que el puente de herramientas de Codex y el espejo de transcripciones. Hoy Codex calcula `sandboxSessionKey` a partir de `params.sessionKey` o `params.sessionId`; úselo consistentemente a menos que haya una razón para preservar `params.sessionKey` sin procesar.

### 4. Conecte el ensamblaje antes de `thread/start` / `thread/resume` y `turn/start`

En `runCodexAppServerAttempt`:

1. Construya primero las herramientas dinámicas, para que el motor de contexto vea los nombres de herramientas reales disponibles.
2. Lea el historial de la sesión reflejada.
3. Ejecute el `assemble(...)` del motor de contexto cuando existe `params.contextEngine`.
4. Proyecte el resultado ensamblado en:
   - adición de instrucciones de desarrollador
   - texto de prompt para `turn/start`

La llamada al gancho existente:

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

debería volverse consciente del contexto:

1. calcular instrucciones base de desarrollador con `buildDeveloperInstructions(params)`
2. aplicar el ensamblaje/proyección del motor de contexto
3. ejecutar `before_prompt_build` con el prompt/instrucciones de desarrollador proyectados

Este orden permite que los ganchos de prompt genéricos vean el mismo prompt que recibirá Codex. Si necesitamos paridad estricta con PI, ejecute el ensamblaje del motor de contexto antes de la composición de ganchos, porque PI aplica el `systemPromptAddition` del motor de contexto al prompt del sistema final después de su canalización de prompt. La invariante importante es que tanto el motor de contexto como los ganchos obtengan un orden determinista y documentado.

Orden recomendado para la primera implementación:

1. `buildDeveloperInstructions(params)`
2. `assemble()` del motor de contexto
3. agregar/anexar `systemPromptAddition` a las instrucciones de desarrollador
4. proyectar mensajes ensamblados en el texto del prompt
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. pasar las instrucciones finales de desarrollador a `startOrResumeThread(...)`
7. pasar el texto final del prompt a `buildTurnStartParams(...)`

La especificación debe codificarse en pruebas para que los cambios futuros no la reordenen por accidente.

### 5. Preservar el formato estable del caché de prompts

El asistente de proyección debe producir una salida estable en bytes para entradas idénticas:

- orden de mensajes estable
- etiquetas de rol estables
- sin marcas de tiempo generadas
- sin filtración del orden de claves de objeto
- sin delimitadores aleatorios
- sin ids por ejecución

Use delimitadores fijos y secciones explícitas.

### 6. Conectar post-turn después de la reflexión de la transcripción

El `CodexAppServerEventProjector` de Codex crea un `messagesSnapshot` local para el
turno actual. `mirrorTranscriptBestEffort(...)` escribe esa instantánea en el
espejo de la transcripción de OpenClaw.

Después de que la reflexión tenga éxito o falle, llame al finalizador del motor de contexto con la
mejor instantánea de mensaje disponible:

- Prefiera el contexto completo de la sesión reflejada después de la escritura, porque `afterTurn`
  espera la instantánea de la sesión, no solo el turno actual.
- Recurre a `historyMessages + result.messagesSnapshot` si el archivo de sesión
  no se puede volver a abrir.

Pseudo-flujo:

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

Si la reflexión falla, aún llame a `afterTurn` con la instantánea de respaldo, pero registre
que el motor de contexto está ingiriendo datos de turno de respaldo.

### 7. Normalizar el uso y el contexto de ejecución del caché de solicitudes

Los resultados de Codex incluyen el uso normalizado de las notificaciones de tokens del servidor de aplicaciones cuando
están disponibles. Pase ese uso al contexto de ejecución del motor de contexto.

Si el servidor de aplicaciones Codex eventualmente expone los detalles de lectura/escritura del caché, mápelos en
`ContextEnginePromptCacheInfo`. Hasta entonces, omita `promptCache` en lugar de
inventar ceros.

### 8. Política de compactación

Hay dos sistemas de compactación:

1. Motor de contexto OpenClaw `compact()`
2. Hilo nativo del servidor de aplicaciones Codex `thread/compact/start`

No los confunda silenciosamente.

#### `/compact` y compactación explícita de OpenClaw

Cuando el motor de contexto seleccionado tiene `info.ownsCompaction === true`, la compactación
explícita de OpenClaw debe preferir el resultado del `compact()` del motor de contexto para
el espejo de la transcripción de OpenClaw y el estado del complemento.

Cuando el arnés de Codex seleccionado tiene un enlace de hilo nativo, podemos adicionalmente
solicitar la compactación nativa de Codex para mantener el hilo del servidor de aplicaciones saludable, pero esto
debe reportarse como una acción de backend separada en los detalles.

Comportamiento recomendado:

- Si `contextEngine.info.ownsCompaction === true`:
  - llame al `compact()` del motor de contexto primero
  - luego llame al mejor esfuerzo la compactación nativa de Codex cuando exista un enlace de hilo
  - devuelva el resultado del motor de contexto como resultado principal
  - incluya el estado de compactación nativa de Codex en `details.codexNativeCompaction`
- Si el motor de contexto activo no es el propietario de la compactación:
  - conservar el comportamiento de compactación nativa actual de Codex

Esto probablemente requiera cambiar `extensions/codex/src/app-server/compact.ts` o
envolverlo desde la ruta de compactación genérica, dependiendo de dónde se
invoque `maybeCompactAgentHarnessSession(...)`.

#### Eventos de contextCompaction nativa de Codex en turno

Codex puede emitir eventos de elemento `contextCompaction` durante un turno. Mantenga la emisión
del enlace before/after de compactación actual en `event-projector.ts`, pero no trate
eso como una compactación del motor de contexto completada.

Para los motores que son propietarios de la compactación, emita un diagnóstico explícito cuando Codex realice
de todos modos una compactación nativa:

- nombre de flujo/evento: el flujo `compaction` existente es aceptable
- detalles: `{ backend: "codex-app-server", ownsCompaction: true }`

Esto hace que la división sea auditable.

### 9. Comportamiento de restablecimiento y enlace de sesión

El arnés `reset(...)` de Codex existente borra el enlace del servidor de aplicaciones de Codex del
archivo de sesión de OpenClaw. Conserve ese comportamiento.

Además, asegúrese de que la limpieza del estado del motor de contexto continúe ocurriendo a través de las rutas
del ciclo de vida de la sesión de OpenClaw existentes. No agregue una limpieza específica de Codex a menos que el
ciclo de vida del motor de contexto actualmente pierda eventos de restablecimiento/eliminación para todos los arneses.

### 10. Manejo de errores

Siga la semántica de PI:

- los fallos de arranque advierten y continúan
- los fallos de ensamblaje advierten y recurren a mensajes/prompt de canalización sin ensamblar
- los fallos de afterTurn/ingest advierten y marcan la finalización posterior al turno como fallida
- el mantenimiento se ejecuta solo después de turnos exitosos, no abortados y no cedidos
- los errores de compactación no deben reintentarse como nuevos prompts

Adiciones específicas de Codex:

- Si la proyección del contexto falla, advierta y recurra al prompt original.
- Si el espejo de la transcripción falla, intente aún la finalización del motor de contexto con
  mensajes alternativos.
- Si la compactación nativa de Codex falla después de que la compactación del motor de contexto tiene éxito,
  no haga fallar toda la compactación de OpenClaw cuando el motor de contexto es primario.

## Plan de pruebas

### Pruebas unitarias

Agregue pruebas bajo `extensions/codex/src/app-server`:

1. `run-attempt.context-engine.test.ts`
   - Codex llama a `bootstrap` cuando existe un archivo de sesión.
   - Codex llama a `assemble` con mensajes reflejados, presupuesto de tokens, nombres de herramientas, modo de citas, id del modelo y mensaje.
   - `systemPromptAddition` se incluye en las instrucciones del desarrollador.
   - Los mensajes ensamblados se proyectan en el mensaje antes de la solicitud actual.
   - Codex llama a `afterTurn` después de la reflexión de la transcripción.
   - Sin `afterTurn`, Codex llama a `ingestBatch` o por mensaje `ingest`.
   - El mantenimiento de turnos se ejecuta después de turnos exitosos.
   - El mantenimiento de turnos no se ejecuta en caso de error de mensaje, cancelación o ceda cancelación.

2. `context-engine-projection.test.ts`
   - salida estable para entradas idénticas
   - sin mensaje actual duplicado cuando el historial ensamblado lo incluye
   - maneja el historial vacío
   - preserva el orden de roles
   - incluye la adición del mensaje del sistema solo en las instrucciones del desarrollador

3. `compact.context-engine.test.ts`
   - el resultado principal del motor de contexto propietario gana
   - el estado de compactación nativa de Codex aparece en los detalles cuando también se intenta
   - el fallo nativo de Codex no hace fallar la compactación del motor de contexto propietario
   - el motor de contexto no propietario conserva el comportamiento de compactación nativa actual

### Pruebas existentes para actualizar

- `extensions/codex/src/app-server/run-attempt.test.ts` si está presente, de lo contrario
  pruebas de ejecución de Codex app-server más cercanas.
- `extensions/codex/src/app-server/event-projector.test.ts` solo si cambian los
  detalles del evento de compactación.
- `src/agents/harness/selection.test.ts` no debería necesitar cambios a menos que el comportamiento de la configuración
  cambie; debería permanecer estable.
- Las pruebas del motor de contexto de PI deberían seguir pasando sin cambios.

### Pruebas de integración / en vivo

Agregar o extender las pruebas de humeo del arnés Codex en vivo:

- configurar `plugins.slots.contextEngine` a un motor de prueba
- configurar `agents.defaults.model` a un modelo `codex/*`
- configurar `agents.defaults.embeddedHarness.runtime = "codex"`
- afirmar que el motor de prueba observó:
  - bootstrap
  - ensamblar
  - afterTurn o ingest
  - mantenimiento

Evitar requerir lossless-claw en las pruebas principales de OpenClaw. Usar un complemento falso de motor de contexto pequeño dentro del repositorio.

## Observabilidad

Agregar registros de depuración alrededor de las llamadas del ciclo de vida del motor de contexto de Codex:

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` con motivo
- `codex native compaction completed alongside context-engine compaction`

Evite registrar los mensajes completos o el contenido de la transcripción.

Agregue campos estructurados cuando sea útil:

- `sessionId`
- `sessionKey` redactado u omitido según la práctica de registro existente
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## Migración / compatibilidad

Esto debe ser compatible con versiones anteriores:

- Si no se configura ningún motor de contexto, el comportamiento del motor de contexto heredado debe ser
  equivalente al comportamiento del arnés de Codex actual.
- Si el motor de contexto `assemble` falla, Codex debe continuar con la ruta
  del mensaje original.
- Los enlaces de hilos de Codex existentes deben seguir siendo válidos.
- La huella digital dinámica de herramientas no debe incluir la salida del motor de contexto; de lo contrario,
  cada cambio de contexto podría forzar un nuevo hilo de Codex. Solo el catálogo de herramientas
  debe afectar la huella digital dinámica de herramientas.

## Preguntas abiertas

1. ¿El contexto ensamblado debe inyectarse completamente en el mensaje del usuario, completamente
   en las instrucciones del desarrollador o dividirse?

   Recomendación: dividir. Ponga `systemPromptAddition` en las instrucciones del desarrollador;
   ponga el contexto de la transcripción ensamblada en el contenedor del mensaje del usuario. Esto coincide mejor
   con el protocolo Codex actual sin mutar el historial de hilos nativo.

2. ¿Se debe desactivar la compactación nativa de Codex cuando un motor de contexto posee
   la compactación?

   Recomendación: no, no inicialmente. La compactación nativa de Codex aún puede ser
   necesaria para mantener vivo el hilo del servidor de la aplicación. Pero debe reportarse como
   compactación nativa de Codex, no como compactación del motor de contexto.

3. ¿Debe ejecutarse `before_prompt_build` antes o después del ensamblaje del motor de contexto?

   Recomendación: después de la proyección del motor de contexto para Codex, para que los enlaces genéricos del arnés
   vean las instrucciones reales de mensaje/desarrollador que Codex recibirá. Si la paridad de PI
   requiere lo contrario, codifique el orden elegido en las pruebas y documéntelo
   aquí.

4. ¿Puede el servidor de aplicaciones Codex aceptar una invalidación futura de contexto/historial estructurada?

   Desconocido. Si puede hacerlo, reemplace la capa de proyección de texto con ese protocolo y
   mantenga las llamadas de ciclo de vida sin cambios.

## Criterios de aceptación

- Un turno `codex/*` del arnés integrado invoca el ciclo de vida de ensamblaje del motor de contexto seleccionado.
- Un `systemPromptAddition` del motor de contexto afecta las instrucciones del desarrollador de Codex.
- El contexto ensamblado afecta la entrada del turno de Codex de manera determinista.
- Los turnos exitosos de Codex llaman a `afterTurn` o ingieren el respaldo (fallback).
- Los turnos exitosos de Codex ejecutan el mantenimiento del turno del motor de contexto.
- Los turnos fallidos/abortados/abortados por cesión no ejecutan el mantenimiento del turno.
- La compactación propiedad del motor de contexto sigue siendo primaria para el estado de OpenClaw/complemento.
- La compactación nativa de Codex sigue siendo auditable como comportamiento nativo de Codex.
- El comportamiento del motor de contexto de PI existente no cambia.
- El comportamiento del arnés de Codex existente no cambia cuando no se selecciona ningún motor de contexto que no sea heredado o cuando falla el ensamblaje.
