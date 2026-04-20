---
summary: "Sub-agentes: generación de ejecuciones de agente aisladas que anuncian los resultados al chat solicitante"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agentes"
---

# Sub-agentes

Los sub-agentes son ejecuciones de agentes en segundo plano generadas desde una ejecución de agente existente. Se ejecutan en su propia sesión (`agent:<agentId>:subagent:<uuid>`) y, cuando terminan, **anuncian** su resultado en el canal de chat solicitante. Cada ejecución de sub-agente se rastrea como una [tarea en segundo plano](/es/automation/tasks).

## Comando de barra

Use `/subagents` para inspeccionar o controlar las ejecuciones de sub-agente para la **sesión actual**:

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

Controles de vinculación de hilos:

Estos comandos funcionan en canales que admiten vinculaciones de hilos persistentes. Consulte **Canales compatibles con hilos** a continuación.

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` muestra los metadatos de la ejecución (estado, marcas de tiempo, id de sesión, ruta de la transcripción, limpieza).
Use `sessions_history` para una vista de recuperación limitada y filtrada por seguridad; inspeccione
la ruta de la transcripción en el disco cuando necesite la transcripción completa sin procesar.

### Comportamiento de generación (Spawn)

`/subagents spawn` inicia un sub-agente en segundo plano como un comando de usuario, no como un relé interno, y envía una única actualización final de finalización al chat solicitante cuando finaliza la ejecución.

- El comando de generación (spawn) es no bloqueante; devuelve un id de ejecución inmediatamente.
- Al finalizar, el sub-agente anuncia un mensaje de resumen/resultado al canal de chat solicitante.
- La finalización se basa en envío (push). Una vez generado, no sondee `/subagents list`,
  `sessions_list` o `sessions_history` en un bucle solo para esperar a que
  termine; inspeccione el estado solo bajo demanda para la depuración o intervención.
- Al completarse, OpenClaw cierra, lo mejor posible, las pestañas/procesos del navegador rastreados que fueron abiertos por esa sesión de sub-agente antes de que continúe el flujo de limpieza del anuncio.
- Para las generaciones manuales, la entrega es resistente:
  - OpenClaw intenta primero la entrega directa de `agent` con una clave de idempotencia estable.
  - Si la entrega directa falla, recurre al enrutamiento en cola.
  - Si el enrutamiento en cola aún no está disponible, el anuncio se reintenta con un retroceso exponencial corto antes de rendirse finalmente.
- La entrega de finalización mantiene la ruta solicitante resuelta:
  - las rutas de finalización vinculadas al hilo (thread-bound) o a la conversación tienen prioridad cuando están disponibles
  - si el origen de finalización solo proporciona un canal, OpenClaw completa el objetivo/cuenta faltante desde la ruta resuelta de la sesión solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa siga funcionando
- La entrega de finalización a la sesión solicitante es un contexto interno generado en tiempo de ejecución (no texto escrito por el usuario) e incluye:
  - `Result` (texto de respuesta `assistant` visible más reciente, de lo contrario texto de herramienta/toolResult más reciente saneado)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - estadísticas compactas de tiempo de ejecución/tokens
  - una instrucción de entrega que indica al agente solicitante que reescriba con la voz normal del asistente (no reenviar metadatos internos sin procesar)
- `--model` y `--thinking` anulan los valores predeterminados para esa ejecución específica.
- Use `info`/`log` para inspeccionar los detalles y la salida después de la finalización.
- `/subagents spawn` es el modo de un solo disparo (`mode: "run"`). Para sesiones persistentes ligadas a hilos, use `sessions_spawn` con `thread: true` y `mode: "session"`.
- Para sesiones de arnés ACP (Codex, Claude Code, Gemini CLI), use `sessions_spawn` con `runtime: "acp"` y consulte [ACP Agents](/es/tools/acp-agents).

Objetivos principales:

- Paralelizar el trabajo de "investigación / tarea larga / herramienta lenta" sin bloquear la ejecución principal.
- Mantener los sub-agentes aislados de forma predeterminada (separación de sesión + sandbox opcional).
- Hacer difícil el mal uso de las herramientas: los sub-agentes **no** obtienen herramientas de sesión de forma predeterminada.
- Admitir una profundidad de anidación configurable para patrones de orquestador.

Nota sobre costos: cada sub-agente tiene su **propio** contexto y uso de tokens. Para tareas pesadas o repetitivas,
establezca un modelo más económico para los sub-agentes y mantenga su agente principal en un modelo de mayor calidad.
Puede configurar esto mediante `agents.defaults.subagents.model` o anulaciones por agente.

## Herramienta

Use `sessions_spawn`:

- Inicia una ejecución de sub-agente (`deliver: false`, carril global: `subagent`)
- Luego ejecuta un paso de anuncio y publica la respuesta de anuncio en el canal de chat solicitante
- Modelo predeterminado: hereda el llamador a menos que establezca `agents.defaults.subagents.model` (o por agente `agents.list[].subagents.model`); un `sessions_spawn.model` explícito todavía tiene prioridad.
- Pensamiento predeterminado: hereda el llamador a menos que establezca `agents.defaults.subagents.thinking` (o por agente `agents.list[].subagents.thinking`); un `sessions_spawn.thinking` explícito todavía tiene prioridad.
- Tiempo de espera de ejecución predeterminado: si se omite `sessions_spawn.runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` si está configurado; de lo contrario, recurre a `0` (sin tiempo de espera).

Parámetros de la herramienta:

- `task` (obligatorio)
- `label?` (opcional)
- `agentId?` (opcional; se genera bajo otro id de agente si está permitido)
- `model?` (opcional; anula el modelo del subagente; los valores no válidos se omiten y el subagente se ejecuta en el modelo predeterminado con una advertencia en el resultado de la herramienta)
- `thinking?` (opcional; anula el nivel de pensamiento para la ejecución del subagente)
- `runTimeoutSeconds?` (predeterminado en `agents.defaults.subagents.runTimeoutSeconds` cuando se establece, de lo contrario `0`; cuando se establece, la ejecución del subagente se aborta después de N segundos)
- `thread?` (predeterminado `false`; cuando `true`, solicita el enlace de hilo del canal para esta sesión de subagente)
- `mode?` (`run|session`)
  - el predeterminado es `run`
  - si se omiten `thread: true` y `mode`, el predeterminado se convierte en `session`
  - `mode: "session"` requiere `thread: true`
- `cleanup?` (`delete|keep`, predeterminado `keep`)
- `sandbox?` (`inherit|require`, predeterminado `inherit`; `require` rechaza la generación a menos que el tiempo de ejecución del hijo de destino esté en sandbox)
- `sessions_spawn` **no** acepta parámetros de entrega al canal (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Para la entrega, use `message`/`sessions_send` desde la ejecución generada.

## Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un canal, un subagente puede permanecer vinculado a un hilo para que los mensajes de seguimiento del usuario en ese hilo sigan enrutándose a la misma sesión de subagente.

### Canales compatibles con hilos

- Discord (actualmente el único canal compatible): admite sesiones de subagente vinculadas a hilos persistentes (`sessions_spawn` con `thread: true`), controles manuales de hilos (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) y claves de adaptador `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` y `channels.discord.threadBindings.spawnSubagentSessions`.

Flujo rápido:

1. Generar con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"`).
2. OpenClaw crea o vincula un hilo a ese destino de sesión en el canal activo.
3. Las respuestas y los mensajes de seguimiento en ese hilo se dirigen a la sesión vinculada.
4. Use `/session idle` para inspeccionar/actualizar la auto-desactivación por inactividad y `/session max-age` para controlar el límite estricto.
5. Use `/unfocus` para desvincular manualmente.

Controles manuales:

- `/focus <target>` vincula el hilo actual (o crea uno) a un destino de subagente/sesión.
- `/unfocus` elimina el vínculo del hilo vinculado actual.
- `/agents` enumera las ejecuciones activas y el estado del vínculo (`thread:<id>` o `unbound`).
- `/session idle` y `/session max-age` solo funcionan para hilos vinculados enfocados.

Interruptores de configuración:

- Valor predeterminado global: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`
- La sobrescritura del canal y las claves de auto-vinculación al generar son específicas del adaptador. Consulte **Canales compatibles con hilos** más arriba.

Consulte [Referencia de configuración](/es/gateway/configuration-reference) y [Comandos de barra](/es/tools/slash-commands) para obtener detalles actuales del adaptador.

Lista de permitidos:

- `agents.list[].subagents.allowAgents`: lista de ids de agentes que pueden ser objetivo a través de `agentId` (`["*"]` para permitir cualquiera). Predeterminado: solo el agente solicitante.
- `agents.defaults.subagents.allowAgents`: lista de permitidos predeterminada del agente objetivo que se utiliza cuando el agente solicitante no establece su propia `subagents.allowAgents`.
- Protección de herencia del sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`: cuando es true, bloquea las llamadas a `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil). Predeterminado: false.

Descubrimiento:

- Use `agents_list` para ver qué ids de agente están permitidos actualmente para `sessions_spawn`.

Archivo automático:

- Las sesiones de subagentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado: 60).
- Archive usa `sessions.delete` y cambia el nombre de la transcripción a `*.deleted.<timestamp>` (misma carpeta).
- `cleanup: "delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción mediante el cambio de nombre).
- El archivo automático es de mejor esfuerzo; los temporizadores pendientes se pierden si se reinicia la puerta de enlace.
- `runTimeoutSeconds` **no** archiva automáticamente; solo detiene la ejecución. La sesión permanece hasta el archivo automático.
- El archivo automático se aplica por igual a las sesiones de profundidad 1 y de profundidad 2.
- La limpieza del navegador es independiente de la limpieza del archivo: las pestañas/procesos del navegador rastreados se cierran de mejor esfuerzo cuando finaliza la ejecución, incluso si se mantiene el registro de la transcripción/sesión.

## Sub-Agentes Anidados

De forma predeterminada, los subagentes no pueden generar sus propios subagentes (`maxSpawnDepth: 1`). Puede habilitar un nivel de anidación estableciendo `maxSpawnDepth: 2`, lo que permite el **patrón de orquestador**: principal → subagente orquestador → sub-subagentes trabajadores.

### Cómo habilitar

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

| Profundidad | Forma de la clave de sesión                  | Rol                                                     | ¿Puede generar?              |
| ----------- | -------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| 0           | `agent:<id>:main`                            | Agente principal                                        | Siempre                      |
| 1           | `agent:<id>:subagent:<uuid>`                 | Subagente (orquestador cuando se permite profundidad 2) | Solo si `maxSpawnDepth >= 2` |
| 2           | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sub-subagente (trabajador hoja)                         | Nunca                        |

### Cadena de anuncios

Los resultados fluyen de vuelta por la cadena:

1. El trabajador de profundidad 2 finaliza → anuncia a su padre (orquestador de profundidad 1)
2. El orquestador de profundidad 1 recibe el anuncio, sintetiza los resultados, finaliza → anuncia al principal
3. El agente principal recibe el anuncio y lo entrega al usuario

Cada nivel solo ve los anuncios de sus hijos directos.

Guía operativa:

- Inicie el trabajo secundario una vez y espere a los eventos de finalización en lugar de construir bucles de sondeo (poll loops) alrededor de `sessions_list`, `sessions_history`, `/subagents list` o comandos de suspensión `exec`.
- Si llega un evento de finalización de un hijo después de que ya haya enviado la respuesta final, el seguimiento correcto es el token silencioso exacto `NO_REPLY` / `no_reply`.

### Política de herramientas por profundidad

- El rol y el alcance de control se escriben en los metadatos de la sesión en el momento de la creación. Esto evita que las claves de sesión planas o restauradas recuperen accidentalmente privilegios de orquestador.
- **Profundidad 1 (orchestrator, cuando `maxSpawnDepth >= 2`)**: Obtiene `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` para que pueda administrar a sus hijos. Otras herramientas de sesión/sistema siguen denegadas.
- **Profundidad 1 (leaf, cuando `maxSpawnDepth == 1`)**: Sin herramientas de sesión (comportamiento predeterminado actual).
- **Profundidad 2 (leaf worker)**: Sin herramientas de sesión: `sessions_spawn` siempre se deniega en la profundidad 2. No puede generar más hijos.

### Límite de generación por agente

Cada sesión de agente (a cualquier profundidad) puede tener como máximo `maxChildrenPerAgent` (predeterminado: 5) hijos activos a la vez. Esto evita una expansión incontrolada desde un único orquestador.

### Detención en cascada

Detener un orquestador de profundidad 1 detiene automáticamente a todos sus hijos de profundidad 2:

- `/stop` en el chat principal detiene todos los agentes de profundidad 1 y se propaga a sus hijos de profundidad 2.
- `/subagents kill <id>` detiene un subagente específico y se propaga a sus hijos.
- `/subagents kill all` detiene todos los subagentes para el solicitante y se propaga.

## Autenticación

La autenticación del subagente se resuelve por **id. de agente**, no por tipo de sesión:

- La clave de sesión del subagente es `agent:<agentId>:subagent:<uuid>`.
- El almacén de autenticación se carga desde el `agentDir` de ese agente.
- Los perfiles de autenticación del agente principal se combinan como un **respaldo**; los perfiles del agente anulan los perfiles principales en caso de conflicto.

Nota: la combinación es aditiva, por lo que los perfiles principales siempre están disponibles como respaldos. Todavía no se admite una autenticación totalmente aislada por agente.

## Anuncio

Los sub-agentes informan a través de un paso de anuncio:

- El paso de anuncio se ejecuta dentro de la sesión del sub-agente (no la sesión solicitante).
- Si el sub-agente responde exactamente `ANNOUNCE_SKIP`, no se publica nada.
- Si el último texto del asistente es el token silencioso exacto `NO_REPLY` / `no_reply`,
  la salida del anuncio se suprime incluso si existía un progreso visible anterior.
- De lo contrario, la entrega depende de la profundidad del solicitante:
  - las sesiones solicitantes de nivel superior usan una llamada de seguimiento `agent` con entrega externa (`deliver=true`)
  - las sesiones subagentes solicitantes anidadas reciben una inyección de seguimiento interna (`deliver=false`) para que el orquestador pueda sintetizar los resultados secundarios en la sesión
  - si una sesión subagente solicitante anidada ha desaparecido, OpenClaw recurre al solicitante de esa sesión cuando está disponible
- Para las sesiones solicitantes de nivel superior, la entrega directa en modo de finalización primero resuelve cualquier ruta de conversación/hilo vinculada y anulación de enlace, luego completa los campos de destino del canal faltantes desde la ruta almacenada de la sesión solicitante. Esto mantiene las finalizaciones en el chat/tema correcto incluso cuando el origen de la finalización solo identifica el canal.
- La agregación de finalizaciones secundarias se limita a la ejecución solicitante actual al crear hallazgos de finalización anidados, evitando que las salidas secundarias obsoletas de ejecuciones anteriores filtren en el anuncio actual.
- Las respuestas de anuncio preservan el enrutamiento de hilo/tema cuando está disponible en los adaptadores de canal.
- El contexto de anuncio se normaliza a un bloque de eventos interno estable:
  - fuente (`subagent` o `cron`)
  - clave/id de sesión secundaria
  - tipo de anuncio + etiqueta de tarea
  - línea de estado derivada del resultado en tiempo de ejecución (`success`, `error`, `timeout` o `unknown`)
  - contenido del resultado seleccionado del último texto visible del asistente, de lo contrario el último texto de herramienta/toolResult saneado
  - una instrucción de seguimiento que describe cuándo responder frente a cuándo permanecer en silencio
- `Status` no se infiere de la salida del modelo; proviene de señales de resultado en tiempo de ejecución.
- En caso de tiempo de espera, si el hijo solo logró pasar las llamadas a herramientas, el anuncio puede contraer ese historial en un breve resumen de progreso parcial en lugar de reproducir la salida sin procesar de la herramienta.

Las cargas útiles de anuncio incluyen una línea de estadísticas al final (incluso cuando están ajustadas):

- Tiempo de ejecución (p. ej., `runtime 5m12s`)
- Uso de tokens (entrada/salida/total)
- Costo estimado cuando se configura la precios del modelo (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId` y la ruta de la transcripción (para que el agente principal pueda recuperar el historial mediante `sessions_history` o inspeccionar el archivo en disco)
- Los metadatos internos están destinados solo a la orquestación; las respuestas orientadas al usuario deben reescribirse con la voz normal del asistente.

`sessions_history` es la ruta de orquestación más segura:

- el recuerdo del asistente se normaliza primero:
  - las etiquetas de pensamiento se eliminan
  - los bloques de andamiaje `<relevant-memories>` / `<relevant_memories>` se eliminan
  - los bloques de carga útil XML de llamadas a herramientas en texto plano, como `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` y
    `<function_calls>...</function_calls>` se eliminan, incluidas las cargas útiles
    truncadas que nunca se cierran correctamente
  - el andamiaje de llamadas/resultado de herramientas degradado y los marcadores de contexto histórico se eliminan
  - los tokens de control del modelo filtrados, como `<|assistant|>`, otros tokens
    `<|...|>` ASCII y las variantes de `<｜...｜>` de ancho completo se eliminan
  - el XML de llamadas a herramientas de MiniMax malformado se elimina
- el texto similar a credenciales/tokens se redacta
- los bloques largos pueden truncarse
- los historiales muy grandes pueden eliminar filas antiguas o reemplazar una fila demasiado grande con
  `[sessions_history omitted: message too large]`
- la inspección de la transcripción sin procesar en disco es la alternativa cuando necesitas la transcripción completa byte por byte

## Política de herramientas (herramientas de subagentes)

De forma predeterminada, los subagentes obtienen **todas las herramientas excepto las herramientas de sesión** y las herramientas del sistema:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` sigue siendo una vista de recuperación limitada y saneada aquí también; no es
un volcado de la transcripción sin procesar.

Cuando `maxSpawnDepth >= 2`, los sub-agentes orquestadores de profundidad 1 también reciben `sessions_spawn`, `subagents`, `sessions_list` y `sessions_history` para que puedan gestionar a sus hijos.

Anular a través de configuración:

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

## Concurrencia

Los sub-agentes utilizan un carril de cola dedicado en proceso:

- Nombre del carril: `subagent`
- Concurrencia: `agents.defaults.subagents.maxConcurrent` (por defecto `8`)

## Detención

- Enviar `/stop` en el chat del solicitante aborta la sesión del solicitante y detiene cualquier ejecución de sub-agente activa generada desde ella, en cascada a los hijos anidados.
- `/subagents kill <id>` detiene un sub-agente específico y se propaga en cascada a sus hijos.

## Limitaciones

- El anuncio del sub-agente se realiza con el **mejor esfuerzo**. Si se reinicia la puerta de enlace, se pierde el trabajo pendiente de "anunciar de vuelta".
- Los sub-agentes todavía comparten los mismos recursos del proceso de la puerta de enlace; trate `maxConcurrent` como una válvula de seguridad.
- `sessions_spawn` siempre es sin bloqueo: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- El contexto del sub-agente solo inyecta `AGENTS.md` + `TOOLS.md` (sin `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` o `BOOTSTRAP.md`).
- La profundidad máxima de anidamiento es 5 (rango de `maxSpawnDepth`: 1–5). Se recomienda la profundidad 2 para la mayoría de los casos de uso.
- `maxChildrenPerAgent` limita los hijos activos por sesión (por defecto: 5, rango: 1–20).
