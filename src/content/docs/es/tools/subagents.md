---
summary: "Generar ejecuciones de agente en segundo plano aisladas que anuncian los resultados al chat solicitante"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-agentes"
sidebarTitle: "Sub-agentes"
---

Los sub-agentes son ejecuciones de agentes en segundo plano generadas desde una ejecución de agente existente.
Se ejecutan en su propia sesión (`agent:<agentId>:subagent:<uuid>`) y,
cuando terminan, **anuncian** su resultado de vuelta al canal de chat
solicitante. Cada ejecución de sub-agente se rastrea como una
tarea en segundo plano (/en/automation/tasks).

Objetivos principales:

- Paralelizar el trabajo de "investigación / tarea larga / herramienta lenta" sin bloquear la ejecución principal.
- Mantener los sub-agentes aislados de forma predeterminada (separación de sesión + sandbox opcional).
- Hacer difícil el mal uso de las herramientas: los sub-agentes **no** obtienen herramientas de sesión de forma predeterminada.
- Admitir una profundidad de anidación configurable para patrones de orquestador.

<Note>
  **Nota de costo:** cada sub-agente tiene su propio contexto y uso de tokens de forma predeterminada. Para tareas pesadas o repetitivas, configure un modelo más económico para los sub-agentes y mantenga su agente principal en un modelo de mayor calidad. Configure a través de `agents.defaults.subagents.model` o anulaciones por agente. Cuando un hijo necesita genuinamente la transcripción actual
  del solicitante, el agente puede solicitar `context: "fork"` en esa generación.
</Note>

## Comando de barra

Use `/subagents` para inspeccionar o controlar las ejecuciones de sub-agentes para la **sesión
actual**:

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

`/subagents info` muestra los metadatos de la ejecución (estado, marcas de tiempo, id de sesión,
ruta de transcripción, limpieza). Use `sessions_history` para una vista de recuperación
limitada y filtrada por seguridad; inspeccione la ruta de transcripción en el disco cuando
necesite la transcripción completa sin procesar.

### Controles de enlace de hilos

Estos comandos funcionan en canales que admiten enlaces de hilos persistentes.
Vea [Canales compatibles con hilos](#thread-supporting-channels) a continuación.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportamiento de generación

`/subagents spawn` inicia un sub-agente en segundo plano como un comando de usuario (no un
relevado interno) y envía una actualización final de completado de vuelta al
chat solicitante cuando finaliza la ejecución.

<AccordionGroup>
  <Accordion title="Finalización sin bloqueo y basada en envío (push)">
    - El comando de generación (spawn) no es bloqueante; devuelve un id de ejecución inmediatamente.
    - Al finalizar, el subagente anuncia un mensaje de resumen/resultado al canal de chat solicitante.
    - La finalización se basa en envío. Una vez generado, **no** sondee `/subagents list`, `sessions_list` o `sessions_history` en un bucle solo para esperar a que termine; inspeccione el estado solo bajo demanda para depuración o intervención.
    - Al finalizar, OpenClaw hace un mejor esfuerzo para cerrar las pestañas/procesos del navegador rastreados abiertos por esa sesión de subagente antes de que continúe el flujo de limpieza del anuncio.
  </Accordion>
  <Accordion title="Resiliencia de entrega de generación manual">
    - OpenClaw intenta primero la entrega directa `agent` con una clave de idempotencia estable.
    - Si la entrega directa falla, recurre al enrutamiento por cola.
    - Si el enrutamiento por cola aún no está disponible, el anuncio se reintentará con un retroceso exponencial corto antes de la renuncia final.
    - La entrega de finalización mantiene la ruta del solicitante resuelta: las rutas de finalización ligadas a hilo o conversación ganan cuando están disponibles; si el origen de finalización solo proporciona un canal, OpenClaw completa el objetivo/cuenta faltante desde la ruta resuelta de la sesión del solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa siga funcionando.
  </Accordion>
  <Accordion title="Metadatos de entrega de finalización">
    La entrega de finalización a la sesión solicitante es contexto interno generado en tiempo de ejecución (no texto escrito por el usuario) e incluye:

    - `Result` — texto de respuesta visible `assistant` más reciente; de lo contrario, texto de herramienta/toolResult más reciente saneado. Las ejecuciones fallidas terminales no reutilizan el texto de respuesta capturado.
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`.
    - Estadísticas compactas de tiempo de ejecución/tokens.
    - Una instrucción de entrega que indica al agente solicitante que reescriba con la voz normal del asistente (no reenviar los metadatos internos sin procesar).

  </Accordion>
  <Accordion title="Modos y tiempo de ejecución de ACP">
    - `--model` y `--thinking` anulan los valores predeterminados para esa ejecución específica.
    - Use `info`/`log` para inspeccionar detalles y resultados después de la finalización.
    - `/subagents spawn` es el modo de un solo disparo (`mode: "run"`). Para sesiones vinculadas a hilos persistentes, use `sessions_spawn` con `thread: true` y `mode: "session"`.
    - Para sesiones de arnés ACP (Claude Code, Gemini CLI, OpenCode, o Codex ACP/acpx explícito), use `sessions_spawn` con `runtime: "acp"` cuando la herramienta anuncie ese tiempo de ejecución. Consulte [Modelo de entrega ACP](/es/tools/acp-agents#delivery-model) al depurar finalizaciones o bucles de agente a agente. Cuando el complemento `codex` está habilitado, el control de chat/hilos de Codex debería preferir `/codex ...` sobre ACP a menos que el usuario solicite explícitamente ACP/acpx.
    - OpenClaw oculta `runtime: "acp"` hasta que ACP está habilitado, el solicitante no está en sandbox, y se carga un complemento de backend como `acpx`. `runtime: "acp"` espera un id de arnés ACP externo, o una entrada `agents.list[]` con `runtime.type="acp"`; use el tiempo de ejecución de subagente predeterminado para agentes de configuración normal de OpenClaw de `agents_list`.
  </Accordion>
</AccordionGroup>

## Modos de contexto

Los sub-agentes nativos se inician aislados a menos que el solicitante pida explícitamente bifurcar la transcripción actual.

| Modo       | Cuándo usarlo                                                                                                                                                | Comportamiento                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Investigación nueva, implementación independiente, trabajo de herramienta lenta, o cualquier cosa que se pueda resumir en el texto de la tarea               | Crea una transcripción secundaria limpia. Este es el valor predeterminado y mantiene el uso de tokens más bajo. |
| `fork`     | Trabajo que depende de la conversación actual, resultados previos de herramientas o instrucciones matizadas ya presentes en la transcripción del solicitante | Bifurca la transcripción del solicitante en la sesión secundaria antes de que comience la secundaria.           |

Use `fork` con moderación. Es para la delegación sensible al contexto, no un
reemplazo para escribir un prompt de tarea claro.

## Herramienta: `sessions_spawn`

Inicia una ejecución de subagente con `deliver: false` en el carril global `subagent`,
luego ejecuta un paso de anuncio y publica la respuesta del anuncio en el canal de
chat solicitante.

La disponibilidad depende de la política de herramientas efectiva de la persona que llama. Los perfiles `coding` y
`full` exponen `sessions_spawn` de forma predeterminada. El perfil `messaging`
no lo hace; agregue `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` para los agentes que deben delegar
trabajo. Las políticas de permitir/denegar de canal/grupo, proveedor, sandbox y por agente aún pueden
eliminar la herramienta después de la etapa del perfil. Use `/tools` desde la misma
sesión para confirmar la lista efectiva de herramientas.

**Valores predeterminados:**

- **Modelo:** hereda de la persona que llama a menos que establezca `agents.defaults.subagents.model` (o `agents.list[].subagents.model` por agente); un `sessions_spawn.model` explícito aún tiene prioridad.
- **Pensamiento:** hereda de la persona que llama a menos que establezca `agents.defaults.subagents.thinking` (o `agents.list[].subagents.thinking` por agente); un `sessions_spawn.thinking` explícito aún tiene prioridad.
- **Tiempo de espera de ejecución:** si se omite `sessions_spawn.runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` cuando está configurado; de lo contrario, recurre a `0` (sin tiempo de espera).

### Parámetros de la herramienta

<ParamField path="task" type="string" required>
  La descripción de la tarea para el subagente.
</ParamField>
<ParamField path="label" type="string">
  Etiqueta legible opcional.
</ParamField>
<ParamField path="agentId" type="string">
  Generar bajo otro id de agente cuando está permitido por `subagents.allowAgents`.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` es solo para arneses ACP externos (`claude`, `droid`, `gemini`, `opencode`, o Codex ACP/acpx solicitado explícitamente) y para entradas `agents.list[]` cuyo `runtime.type` sea `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Solo para ACP. Reanuda una sesión de arnés ACP existente cuando `runtime: "acp"`; se ignora para generaciones de subagentes nativos.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  Solo para ACP. Transmite la salida de ejecución de ACP a la sesión principal cuando `runtime: "acp"`; omitir para generaciones de subagentes nativos.
</ParamField>
<ParamField path="model" type="string">
  Anula el modelo del subagente. Los valores no válidos se omiten y el subagente se ejecuta en el modelo predeterminado con una advertencia en el resultado de la herramienta.
</ParamField>
<ParamField path="thinking" type="string">
  Anula el nivel de pensamiento para la ejecución del subagente.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Por defecto es `agents.defaults.subagents.runTimeoutSeconds` cuando se establece, de lo contrario `0`. Cuando se establece, la ejecución del subagente se aborta después de N segundos.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Cuando es `true`, solicita el enlace del hilo del canal para esta sesión de subagente.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si se omiten `thread: true` y `mode`, el valor predeterminado se convierte en `session`. `mode: "session"` requiere `thread: true`.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción a través de cambiar el nombre).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rechaza la generación a menos que el tiempo de ejecución del hijo objetivo esté en sandbox.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` bifurca la transcripción actual del solicitante en la sesión secundaria. Solo para subagentes nativos. Use `fork` solo cuando el hijo necesita la transcripción actual.
</ParamField>

<Warning>`sessions_spawn` **no** acepta parámetros de entrega al canal (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Para la entrega, usa `message`/`sessions_send` desde la ejecución generada.</Warning>

## Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un canal, un subagente puede mantenerse vinculado
a un hilo para que los mensajes de seguimiento del usuario en ese hilo sigan enrutándose a la
misma sesión del subagente.

### Canales compatibles con hilos

**Discord** es actualmente el único canal compatible. Admite
sesiones persistentes de subagentes vinculadas a hilos (`sessions_spawn` con
`thread: true`), controles manuales de hilos (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`) y claves de adaptador
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` y
`channels.discord.threadBindings.spawnSubagentSessions`.

### Flujo rápido

<Steps>
  <Step title="Generar">`sessions_spawn` con `thread: true` (y opcionalmente `mode: "session"`).</Step>
  <Step title="Vincular">OpenClaw crea o vincula un hilo a ese objetivo de sesión en el canal activo.</Step>
  <Step title="Enrutamiento de seguimientos">Las respuestas y mensajes de seguimiento en ese hilo se enrutan a la sesión vinculada.</Step>
  <Step title="Inspeccionar tiempos de espera">Usa `/session idle` para inspeccionar/actualizar la auto-desactivación por inactividad y `/session max-age` para controlar el límite absoluto.</Step>
  <Step title="Desvincular">Usa `/unfocus` para desvincular manualmente.</Step>
</Steps>

### Controles manuales

| Comando            | Efecto                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Vincula el hilo actual (o crea uno) a un objetivo de subagente/sesión                             |
| `/unfocus`         | Eliminar el enlace para el hilo vinculado actual                                                  |
| `/agents`          | Listar las ejecuciones activas y el estado del enlace (`thread:<id>` o `unbound`)                 |
| `/session idle`    | Inspeccionar/actualizar la auto-desenfoque por inactividad (solo para hilos vinculados enfocados) |
| `/session max-age` | Inspeccionar/actualizar el límite estricto (solo para hilos vinculados enfocados)                 |

### Interruptores de configuración

- **Predeterminado global:** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- **La anulación de canal y las claves de auto-enlace de generación** son específicas del adaptador. Consulte [Canales compatibles con hilos](#thread-supporting-channels) más arriba.

Consulte [Referencia de configuración](/es/gateway/configuration-reference) y
[Comandos de barra](/es/tools/slash-commands) para obtener detalles del adaptador actual.

### Lista de permitidos

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Lista de ids de agentes que pueden ser objetivos a través de `agentId` explícito (`["*"]` permite cualquiera). Predeterminado: solo el agente solicitante. Si establece una lista y aún desea que el solicitante se genere a sí mismo con `agentId`, incluya el id del solicitante en la lista.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Lista de permitidos de agente objetivo predeterminada que se utiliza cuando el agente solicitante no establece su propio `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquear llamadas a `sessions_spawn` que omitan `agentId` (fuerza la selección explícita de perfil). Anulación por agente: `agents.list[].subagents.requireAgentId`.
</ParamField>

Si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos
que se ejecutarían sin sandbox.

### Descubrimiento

Use `agents_list` para ver qué ids de agentes están permitidos actualmente para
`sessions_spawn`. La respuesta incluye el modelo efectivo y los metadatos de tiempo de ejecución incrustados de cada agente listado para que los llamadores puedan distinguir PI, servidor de aplicaciones Codex
y otros tiempos de ejecución nativos configurados.

### Archivo automático

- Las sesiones de sub-agentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (por defecto `60`).
- El archivado usa `sessions.delete` y renombra la transcripción a `*.deleted.<timestamp>` (misma carpeta).
- `cleanup: "delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción mediante el cambio de nombre).
- El archivado automático es de mejor esfuerzo; los temporizadores pendientes se pierden si se reinicia la puerta de enlace.
- `runTimeoutSeconds` **no** archiva automáticamente; solo detiene la ejecución. La sesión permanece hasta el archivado automático.
- El archivado automático se aplica por igual a las sesiones de profundidad 1 y profundidad 2.
- La limpieza del navegador es independiente de la limpieza del archivo: las pestañas/procesos del navegador rastreados se cierran de mejor esfuerzo cuando finaliza la ejecución, incluso si se mantiene el registro de la transcripción/sesión.

## Sub-agentes anidados

Por defecto, los sub-agentes no pueden generar sus propios sub-agentes
(`maxSpawnDepth: 1`). Establezca `maxSpawnDepth: 2` para habilitar un nivel de
anidamiento: el **patrón de orquestador**: principal → sub-agente orquestador →
sub-sub-agentes trabajadores.

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### Niveles de profundidad

| Profundidad | Forma de la clave de sesión                  | Rol                                                      | ¿Puede generar?              |
| ----------- | -------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 0           | `agent:<id>:main`                            | Agente principal                                         | Siempre                      |
| 1           | `agent:<id>:subagent:<uuid>`                 | Sub-agente (orquestador cuando se permite profundidad 2) | Solo si `maxSpawnDepth >= 2` |
| 2           | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sub-sub-agente (trabajador hoja)                         | Nunca                        |

### Cadena de anuncios

Los resultados fluyen de vuelta hacia arriba en la cadena:

1. El trabajador de profundidad 2 finaliza → anuncia a su padre (orquestador de profundidad 1).
2. El orquestador de profundidad 1 recibe el anuncio, sintetiza los resultados, finaliza → anuncia al principal.
3. El agente principal recibe el anuncio y lo entrega al usuario.

Cada nivel solo ve los anuncios de sus hijos directos.

<Note>
  **Orientación operativa:** inicie el trabajo secundario una vez y espere los eventos de finalización en lugar de crear bucles de sondeo alrededor de los comandos de suspensión `sessions_list`, `sessions_history`, `/subagents list` o `exec`. `sessions_list` y `/subagents list` mantienen las relaciones de sesión secundaria centradas en el trabajo en vivo: los hijos en vivo permanecen adjuntos, los
  hijos finalizados se mantienen visibles durante una ventana reciente breve, y los enlaces secundarios obsoletos de solo almacenamiento se ignoran después de su ventana de vigencia. Esto evita que los metadatos antiguos de `spawnedBy` / `parentSessionKey` resuciten hijos fantasmas después del reinicio. Si llega un evento de finalización secundario después de que ya haya enviado la respuesta
  final, el seguimiento correcto es el token silencioso exacto `NO_REPLY` / `no_reply`.
</Note>

### Política de herramientas por profundidad

- El rol y el alcance de control se escriben en los metadatos de la sesión en el momento de la generación. Esto evita que las claves de sesión planas o restauradas recuperen accidentalmente privilegios de orquestador.
- **Profundidad 1 (orquestador, cuando `maxSpawnDepth >= 2`):** obtiene `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` para que pueda administrar a sus hijos. Otras herramientas de sesión/sistema siguen denegadas.
- **Profundidad 1 (hoja, cuando `maxSpawnDepth == 1`):** sin herramientas de sesión (comportamiento predeterminado actual).
- **Profundidad 2 (trabajador hoja):** sin herramientas de sesión — `sessions_spawn` siempre se deniega en la profundidad 2. No puede generar más hijos.

### Límite de generación por agente

Cada sesión de agente (a cualquier profundidad) puede tener como máximo `maxChildrenPerAgent`
(por defecto `5`) hijos activos a la vez. Esto evita una expansión incontrolada
desde un solo orquestador.

### Parada en cascada

Detener un orquestador de profundidad 1 detiene automáticamente a todos sus hijos
de profundidad 2:

- `/stop` en el chat principal detiene a todos los agentes de profundidad 1 y se extiende en cascada a sus hijos de profundidad 2.
- `/subagents kill <id>` detiene un subagente específico y se extiende en cascada a sus hijos.
- `/subagents kill all` detiene todos los subagentes para el solicitante y se extiende en cascada.

## Autenticación

La autenticación del subagente se resuelve por **ID de agente**, no por tipo de sesión:

- La clave de sesión del subagente es `agent:<agentId>:subagent:<uuid>`.
- El almacén de autenticación se carga desde el `agentDir` de ese agente.
- Los perfiles de autenticación del agente principal se fusionan como **respaldo** (fallback); los perfiles del agente anulan a los perfiles principales en caso de conflicto.

La fusión es aditiva, por lo que los perfiles principales siempre están disponibles como respaldo. Todavía no se admite una autenticación totalmente aislada por agente.

## Anuncio

Los subagentes informan a través de un paso de anuncio:

- El paso de anuncio se ejecuta dentro de la sesión del subagente (no la sesión del solicitante).
- Si el subagente responde exactamente `ANNOUNCE_SKIP`, no se publica nada.
- Si el último texto del asistente es exactamente el token silencioso `NO_REPLY` / `no_reply`, la salida del anuncio se suprime incluso si existía un progreso visible anterior.

La entrega depende de la profundidad del solicitante:

- Las sesiones solicitantes de nivel superior utilizan una llamada de seguimiento `agent` con entrega externa (`deliver=true`).
- Las sesiones de subagentes solicitantes anidadas reciben una inyección de seguimiento interna (`deliver=false`) para que el orquestador pueda sintetizar los resultados secundarios en la sesión.
- Si una sesión de subagente solicitante anidada ha desaparecido, OpenClaw recurre al solicitante de esa sesión cuando está disponible.

Para las sesiones solicitantes de nivel superior, la entrega directa en modo de finalización primero resuelve cualquier ruta de conversación/hilo vinculada y anulación de enlace, luego completa los campos de destino del canal faltantes desde la ruta almacenada de la sesión del solicitante. Esto mantiene las finalizaciones en el chat/tema correcto incluso cuando el origen de la finalización solo identifica el canal.

La agregación de finalizaciones secundarias se limita a la ejecución del solicitante actual al construir hallazgos de finalización anidados, evitando que las salidas secundarias obsoletas de ejecuciones anteriores filtren en el anuncio actual. Las respuestas de anuncio preservan el enrutamiento de hilo/tema cuando está disponible en los adaptadores de canal.

### Contexto de anuncio

El contexto de anuncio se normaliza a un bloque de evento interno estable:

| Campo                   | Fuente                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fuente                  | `subagent` o `cron`                                                                                                              |
| Ids de sesión           | Clave/Id de sesión secundaria                                                                                                    |
| Tipo                    | Tipo de anuncio + etiqueta de tarea                                                                                              |
| Estado                  | Derivado del resultado en tiempo de ejecución (`success`, `error`, `timeout` o `unknown`) — **no** inferido del texto del modelo |
| Contenido del resultado | Último texto visible del asistente; de lo contrario, último texto de herramienta/toolResult saneado                              |
| Seguimiento             | Instrucción que describe cuándo responder frente a cuándo permanecer en silencio                                                 |

Las ejecuciones fallidas terminales informan del estado de fallo sin reproducir el texto de respuesta capturado. En caso de tiempo de espera, si el hijo solo logró pasar las llamadas a herramientas, el anuncio puede colapsar ese historial en un breve resumen de progreso parcial en lugar de reproducir la salida cruda de la herramienta.

### Línea de estadísticas

Los payloads de anuncio incluyen una línea de estadísticas al final (incluso cuando están envueltos):

- Tiempo de ejecución (ej. `runtime 5m12s`).
- Uso de tokens (entrada/salida/total).
- Coste estimado cuando la fijación de precios del modelo está configurada (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` y la ruta de la transcripción para que el agente principal pueda obtener el historial a través de `sessions_history` o inspeccionar el archivo en disco.

Los metadatos internos están destinados solo a la orquestación; las respuestas orientadas al usuario deben reescribirse con la voz normal del asistente.

### Por qué preferir `sessions_history`

`sessions_history` es la ruta de orquestación más segura:

- El recuerdo del asistente se normaliza primero: se eliminan las etiquetas de pensamiento; se elimina el andamiaje `<relevant-memories>` / `<relevant_memories>`; se eliminan los bloques de payload XML de llamadas a herramientas en texto plano (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`), incluyendo los payloads truncados que nunca se cierran correctamente; se eliminan los andamiajes de llamadas a herramientas/resultados degradados y los marcadores de contexto histórico; se eliminan los tokens de control del modelo filtrados (`<|assistant|>`, otro ASCII `<|...|>`, ancho completo `<｜...｜>`); se elimina el XML de llamadas a herramientas de MiniMax malformado.
- El texto tipo credencial/token se redacta.
- Los bloques largos pueden truncarse.
- Los historiales muy grandes pueden eliminar filas antiguas o reemplazar una fila sobredimensionada con `[sessions_history omitted: message too large]`.
- La inspección de transcripciones en bruto en disco es el recurso de respaldo cuando necesitas la transcripción completa byte por byte.

## Política de herramientas

Los subagentes utilizan el mismo perfil y la misma canalización de políticas de herramientas que el agente principal o el agente objetivo primero. Después de eso, OpenClaw aplica la capa de restricción de subagente.

Sin ningún `tools.profile` restrictivo, los subagentes obtienen **todas las herramientas excepto
las herramientas de sesión** y las herramientas del sistema:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` sigue siendo una vista de recuperación limitada y saneada aquí también — no
es un volcado de transcripción en bruto.

Cuando `maxSpawnDepth >= 2`, los subagentes orquestadores de profundidad 1 reciben adicionalmente
`sessions_spawn`, `subagents`, `sessions_list` y
`sessions_history` para que puedan gestionar a sus hijos.

### Anular a través de la configuración

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` es un filtro final de solo permiso. Puede reducir
el conjunto de herramientas ya resuelto, pero no puede **volver a agregar** una herramienta eliminada
por `tools.profile`. Por ejemplo, `tools.profile: "coding"` incluye
`web_search`/`web_fetch` pero no la herramienta `browser`. Para permitir
que los subagentes del perfil de codificación usen la automatización del navegador, agregue el navegador en la
etapa de perfil:

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Use `agents.list[].tools.alsoAllow: ["browser"]` por agente cuando solo un
agente deba obtener la automatización del navegador.

## Concurrencia

Los subagentes utilizan un carril de cola dedicado en proceso:

- **Nombre del carril:** `subagent`
- **Concurrencia:** `agents.defaults.subagents.maxConcurrent` (por defecto `8`)

## Actividad y recuperación

OpenClaw no trata la ausencia de `endedAt` como una prueba permanente de que un
subagente sigue vivo. Las ejecuciones no finalizadas anteriores a la ventana de ejecuciones obsoletas
dejan de contar como activas/pendientes en `/subagents list`, resúmenes de estado,
control de finalización de descendientes y verificaciones de concurrencia por sesión.

Después de reiniciar una puerta de enlace, las ejecuciones restauradas obsoletas y sin finalizar se eliminan a menos que su sesión secundaria esté marcada como `abortedLastRun: true`. Esas sesiones secundarias abortadas por el reinicio siguen siendo recuperables a través del flujo de recuperación de huérfanos del subagente, que envía un mensaje de reanudación sintético antes de borrar el marcador de aborto.

<Note>
  Si la generación de un subagente falla con Gateway `PAIRING_REQUIRED` / `scope-upgrade`, verifique el llamador RPC antes de editar el estado de emparejamiento. La coordinación interna de `sessions_spawn` debe conectarse como `client.id: "gateway-client"` con `client.mode: "backend"` a través de autenticación directa de bucle de retorno con token/contraseña compartidos; esa ruta no depende de la
  línea base del alcance de dispositivos emparejados de la CLI. Los llamadores remotos, `deviceIdentity` explícitos, rutas explícitas de token de dispositivo y clientes de navegador/nodo aún necesitan la aprobación normal del dispositivo para actualizaciones de alcance.
</Note>

## Detención

- Enviar `/stop` en el chat solicitante aborta la sesión solicitante y detiene cualquier ejecución activa de subagente generada desde ella, en cascada hacia los hijos anidados.
- `/subagents kill <id>` detiene un subagente específico y hace cascada a sus hijos.

## Limitaciones

- El anuncio del subagente es de **mejor esfuerzo**. Si se reinicia la puerta de enlace, se pierde el trabajo pendiente de "anunciar de vuelta".
- Los subagentes aún comparten los mismos recursos del proceso de la puerta de enlace; trate `maxConcurrent` como una válvula de seguridad.
- `sessions_spawn` siempre es no bloqueante: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- El contexto del subagente solo inyecta `AGENTS.md` + `TOOLS.md` (sin `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` o `BOOTSTRAP.md`).
- La profundidad máxima de anidación es 5 (rango de `maxSpawnDepth`: 1–5). Se recomienda la profundidad 2 para la mayoría de los casos de uso.
- `maxChildrenPerAgent` limita los hijos activos por sesión (predeterminado `5`, rango `1–20`).

## Relacionado

- [Agentes ACP](/es/tools/acp-agents)
- [Envío de agente](/es/tools/agent-send)
- [Tareas en segundo plano](/es/automation/tasks)
- [Herramientas de espacio aislado multiagente](/es/tools/multi-agent-sandbox-tools)
