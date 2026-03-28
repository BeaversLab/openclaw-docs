---
summary: "Sub-agentes: generación de ejecuciones de agente aisladas que anuncian los resultados al chat solicitante"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agentes"
---

# Sub-agentes

Los sub-agentes son ejecuciones de agente en segundo plano generadas desde una ejecución de agente existente. Se ejecutan en su propia sesión (`agent:<agentId>:subagent:<uuid>`) y, cuando terminan, **anuncian** su resultado al canal de chat solicitante.

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

### Comportamiento de generación (Spawn)

`/subagents spawn` inicia un sub-agente en segundo plano como un comando de usuario, no como un relé interno, y envía una actualización final de finalización al chat solicitante cuando finaliza la ejecución.

- El comando de generación (spawn) es no bloqueante; devuelve un id de ejecución inmediatamente.
- Al finalizar, el sub-agente anuncia un mensaje de resumen/resultado al canal de chat solicitante.
- Para generaciones manuales, la entrega es resistente:
  - OpenClaw intenta la entrega directa `agent` primero con una clave de idempotencia estable.
  - Si la entrega directa falla, recurra al enrutamiento en cola.
  - Si el enrutamiento en cola todavía no está disponible, el anuncio se reintentará con un retroceso exponencial corto antes de la rendición final.
- La entrega de finalización a la sesión solicitante es contexto interno generado en tiempo de ejecución (no texto redactado por el usuario) e incluye:
  - `Result` (texto de respuesta `assistant`, o el último `toolResult` si la respuesta del asistente está vacía)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - estadísticas compactas de tiempo de ejecución/tokens
  - una instrucción de entrega que le indica al agente solicitante que reescriba con la voz normal del asistente (no reenviar metadatos internos sin procesar)
- `--model` y `--thinking` anulan los valores predeterminados para esa ejecución específica.
- Use `info`/`log` para inspeccionar detalles y resultados después de la finalización.
- `/subagents spawn` es el modo de un solo disparo (`mode: "run"`). Para sesiones persistentes ligadas a hilos, use `sessions_spawn` con `thread: true` y `mode: "session"`.
- Para sesiones de arnés ACP (Codex, Claude Code, Gemini CLI), use `sessions_spawn` con `runtime: "acp"` y consulte [ACP Agents](/es/tools/acp-agents).

Objetivos principales:

- Paralelizar el trabajo de "investigación / tarea larga / herramienta lenta" sin bloquear la ejecución principal.
- Mantener los subagentes aislados de forma predeterminada (separación de sesión + sandbox opcional).
- Hacer difícil el mal uso de la superficie de herramientas: los subagentes **no** obtienen herramientas de sesión de forma predeterminada.
- Admitir una profundidad de anidación configurable para patrones de orquestador.

Nota de costos: cada subagente tiene su **propio** contexto y uso de tokens. Para tareas pesadas o repetitivas,
establezca un modelo más económico para los subagentes y mantenga su agente principal en un modelo de mayor calidad.
Puede configurar esto a través de `agents.defaults.subagents.model` o anulaciones por agente.

## Herramienta

Use `sessions_spawn`:

- Inicia una ejecución de subagente (`deliver: false`, carril global: `subagent`)
- Luego ejecuta un paso de anuncio y publica la respuesta de anuncio en el canal de chat solicitante
- Modelo predeterminado: hereda el llamador a menos que establezca `agents.defaults.subagents.model` (o por agente `agents.list[].subagents.model`); un `sessions_spawn.model` explícito aún prevalece.
- Pensamiento predeterminado: hereda el llamador a menos que establezca `agents.defaults.subagents.thinking` (o por agente `agents.list[].subagents.thinking`); un `sessions_spawn.thinking` explícito aún prevalece.
- Tiempo de espera de ejecución predeterminado: si se omite `sessions_spawn.runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` cuando está configurado; de lo contrario, recurre a `0` (sin tiempo de espera).

Parámetros de la herramienta:

- `task` (obligatorio)
- `label?` (opcional)
- `agentId?` (opcional; se genera bajo otro id de agente si está permitido)
- `model?` (opcional; anula el modelo del subagente; los valores no válidos se omiten y el subagente se ejecuta en el modelo predeterminado con una advertencia en el resultado de la herramienta)
- `thinking?` (opcional; anula el nivel de pensamiento para la ejecución del subagente)
- `runTimeoutSeconds?` (por defecto es `agents.defaults.subagents.runTimeoutSeconds` cuando está configurado, de lo contrario `0`; cuando se establece, la ejecución del subagente se aborta después de N segundos)
- `thread?` (predeterminado `false`; cuando `true`, solicita el enlace de hilo del canal para esta sesión de subagente)
- `mode?` (`run|session`)
  - el valor predeterminado es `run`
  - si se omiten `thread: true` y `mode`, el valor predeterminado pasa a ser `session`
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
2. OpenClaw crea o vincula un hilo a ese objetivo de sesión en el canal activo.
3. Las respuestas y mensajes de seguimiento en ese hilo se dirigen a la sesión vinculada.
4. Use `/session idle` para inspeccionar/actualizar el enfoque automático por inactividad y `/session max-age` para controlar el límite estricto.
5. Use `/unfocus` para desvincular manualmente.

Controles manuales:

- `/focus <target>` vincula el hilo actual (o crea uno) a un objetivo de subagente/sesión.
- `/unfocus` elimina el vínculo del hilo vinculado actual.
- `/agents` enumera las ejecuciones activas y el estado del vínculo (`thread:<id>` o `unbound`).
- `/session idle` y `/session max-age` solo funcionan para hilos vinculados con enfoque.

Interruptores de configuración:

- Predeterminado global: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`
- La anulación del canal y las claves de vinculación automática al generar son específicas del adaptador. Consulte **Canales compatibles con hilos** más arriba.

Consulte [Referencia de configuración](/es/gateway/configuration-reference) y [Comandos de barra](/es/tools/slash-commands) para obtener detalles del adaptador actual.

Lista de permitidos:

- `agents.list[].subagents.allowAgents`: lista de IDs de agente a los que se puede apuntar a través de `agentId` (`["*"]` para permitir cualquiera). Predeterminado: solo el agente solicitante.
- Guarda de herencia de sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.

Descubrimiento:

- Use `agents_list` para ver qué ids de agente están permitidos actualmente para `sessions_spawn`.

Autoarchivo:

- Las sesiones de sub-agentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado: 60).
- El archivado usa `sessions.delete` y cambia el nombre de la transcripción a `*.deleted.<timestamp>` (misma carpeta).
- `cleanup: "delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción mediante el cambio de nombre).
- El autoarchivo es de mejor esfuerzo; los temporizadores pendientes se pierden si se reinicia la puerta de enlace.
- `runTimeoutSeconds` **no** autoarchiva; solo detiene la ejecución. La sesión permanece hasta el autoarchivo.
- El autoarchivo se aplica por igual a las sesiones de profundidad 1 y profundidad 2.

## Sub-Agentes Anidados

Por defecto, los sub-agentes no pueden generar sus propios sub-agentes (`maxSpawnDepth: 1`). Puede habilitar un nivel de anidación configurando `maxSpawnDepth: 2`, lo que permite el **patrón de orquestador**: principal → sub-agente orquestador → sub-sub-agentes trabajadores.

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

| Profundidad | Forma de clave de sesión                     | Rol                                                      | ¿Puede generar?              |
| ----------- | -------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 0           | `agent:<id>:main`                            | Agente principal                                         | Siempre                      |
| 1           | `agent:<id>:subagent:<uuid>`                 | Sub-agente (orquestador cuando se permite profundidad 2) | Solo si `maxSpawnDepth >= 2` |
| 2           | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sub-sub-agente (trabajador hoja)                         | Nunca                        |

### Cadena de anuncios

Los resultados fluyen de vuelta por la cadena:

1. El trabajador de profundidad 2 termina → anuncia a su padre (orquestador de profundidad 1)
2. El orquestador de profundidad 1 recibe el anuncio, sintetiza los resultados, termina → anuncia al principal
3. El agente principal recibe el anuncio y lo entrega al usuario

Cada nivel solo ve los anuncios de sus hijos directos.

### Política de herramientas por profundidad

- El rol y el alcance de control se escriben en los metadatos de la sesión en el momento de la generación. Eso evita que las claves de sesión planas o restauradas recuperen accidentalmente privilegios de orquestador.
- **Profundidad 1 (orquestador, cuando `maxSpawnDepth >= 2`)**: Obtiene `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` para que pueda gestionar a sus hijos. Otras herramientas de sesión/sistema siguen denegadas.
- **Profundidad 1 (hoja, cuando `maxSpawnDepth == 1`)**: Sin herramientas de sesión (comportamiento predeterminado actual).
- **Profundidad 2 (trabajador hoja)**: Sin herramientas de sesión — `sessions_spawn` siempre se deniega en la profundidad 2. No puede generar más hijos.

### Límite de generación por agente

Cada sesión de agente (en cualquier profundidad) puede tener como máximo `maxChildrenPerAgent` (predeterminado: 5) hijos activos a la vez. Esto evita una expansión descontrolada desde un solo orquestador.

### Detención en cascada

Detener un orquestador de profundidad 1 detiene automáticamente a todos sus hijos de profundidad 2:

- `/stop` en el chat principal detiene todos los agentes de profundidad 1 y se propaga a sus hijos de profundidad 2.
- `/subagents kill <id>` detiene un sub-agente específico y se propaga a sus hijos.
- `/subagents kill all` detiene todos los sub-agentes para el solicitante y se propaga.

## Autenticación

La autenticación del sub-agente se resuelve por **id de agente**, no por tipo de sesión:

- La clave de sesión del sub-agente es `agent:<agentId>:subagent:<uuid>`.
- El almacén de autenticación se carga desde el `agentDir` de ese agente.
- Los perfiles de autenticación del agente principal se fusionan como un **alternativo** (fallback); los perfiles del agente tienen prioridad sobre los perfiles principales en caso de conflicto.

Nota: la fusión es aditiva, por lo que los perfiles principales siempre están disponibles como alternativos. Todavía no se admite una autenticación totalmente aislada por agente.

## Anuncio

Los sub-agentes informan a través de un paso de anuncio:

- El paso de anuncio se ejecuta dentro de la sesión del sub-agente (no la sesión del solicitante).
- Si el sub-agente responde exactamente `ANNOUNCE_SKIP`, no se publica nada.
- De lo contrario, la entrega depende de la profundidad del solicitante:
  - las sesiones solicitantes de nivel superior utilizan una llamada de seguimiento `agent` con entrega externa (`deliver=true`)
  - las sesiones solicitantes de sub-agentes anidadas reciben una inyección de seguimiento interna (`deliver=false`) para que el orquestador pueda sintetizar los resultados de los hijos dentro de la sesión
  - si una sesión de subagente solicitante anidada ha desaparecido, OpenClaw recurre al solicitante de esa sesión cuando está disponible
- La agregación de finalización secundaria se limita a la ejecución del solicitante actual al generar hallazgos de finalización anidados, lo que evita que las salidas secundarias obsoletas de ejecuciones anteriores se filtren en el anuncio actual.
- Las respuestas de anuncio preservan el enrutamiento de hilos/temas cuando está disponible en los adaptadores de canal.
- El contexto de anuncio se normaliza a un bloque de evento interno estable:
  - fuente (`subagent` o `cron`)
  - clave/identificador de sesión secundaria
  - tipo de anuncio + etiqueta de tarea
  - línea de estado derivada del resultado en tiempo de ejecución (`success`, `error`, `timeout` o `unknown`)
  - contenido del resultado del paso de anuncio (o `(no output)` si falta)
  - una instrucción de seguimiento que describe cuándo responder vs. permanecer en silencio
- `Status` no se infiere de la salida del modelo; proviene de las señales de resultado en tiempo de ejecución.

Las cargas útiles de anuncio incluyen una línea de estadísticas al final (incluso cuando están envueltas):

- Tiempo de ejecución (ej., `runtime 5m12s`)
- Uso de tokens (entrada/salida/total)
- Costo estimado cuando la fijación de precios del modelo está configurada (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId` y la ruta de la transcripción (para que el agente principal pueda obtener el historial a través de `sessions_history` o inspeccionar el archivo en el disco)
- Los metadatos internos están destinados solo a la orquestación; las respuestas orientadas al usuario deben reescribirse con la voz normal del asistente.

## Política de herramientas (herramientas de subagente)

De forma predeterminada, los subagentes obtienen **todas las herramientas excepto las herramientas de sesión** y las herramientas del sistema:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

Cuando `maxSpawnDepth >= 2`, los subagentes orquestadores de profundidad-1 adicionalmente reciben `sessions_spawn`, `subagents`, `sessions_list` y `sessions_history` para que puedan gestionar a sus elementos secundarios.

Anular mediante configuración:

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

Los subagentes utilizan un carril de cola dedicado en proceso:

- Nombre del carril: `subagent`
- Concurrencia: `agents.defaults.subagents.maxConcurrent` (predeterminado `8`)

## Detención

- Enviar `/stop` en el chat solicitante aborta la sesión solicitante y detiene cualquier ejecución activa de subagente generada desde ella, en cascada hacia los elementos secundarios anidados.
- `/subagents kill <id>` detiene un subagente específico y se propaga en cascada a sus elementos secundarios.

## Limitaciones

- El anuncio del subagente es de **mejor esfuerzo**. Si se reinicia la puerta de enlace, se pierde el trabajo pendiente de "anunciar de vuelta".
- Los subagentes aún comparten los mismos recursos del proceso de puerta de enlace; trate `maxConcurrent` como una válvula de seguridad.
- `sessions_spawn` siempre es no bloqueante: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- El contexto del subagente solo inyecta `AGENTS.md` + `TOOLS.md` (sin `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` o `BOOTSTRAP.md`).
- La profundidad máxima de anidamiento es 5 (rango de `maxSpawnDepth`: 1–5). Se recomienda una profundidad de 2 para la mayoría de los casos de uso.
- `maxChildrenPerAgent` limita los elementos secundarios activos por sesión (predeterminado: 5, rango: 1–20).
