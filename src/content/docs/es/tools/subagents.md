---
summary: "Inicia ejecuciones de agente en segundo plano aisladas que anuncian los resultados al chat del solicitante"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-agentes"
sidebarTitle: "Sub-agentes"
---

Los sub-agentes son ejecuciones de agentes en segundo plano generadas desde una ejecución de agente existente.
Se ejecutan en su propia sesión (`agent:<agentId>:subagent:<uuid>`) y,
cuando terminan, **anuncian** su resultado al canal de chat
solicitante. Cada ejecución de sub-agente se rastrea como una
tarea en segundo plano [background task](/es/automation/tasks).

Objetivos principales:

- Paralelizar el trabajo de "investigación / tarea larga / herramienta lenta" sin bloquear la ejecución principal.
- Mantener los sub-agentes aislados de forma predeterminada (separación de sesión + sandbox opcional).
- Hacer difícil el mal uso de las herramientas: los sub-agentes **no** obtienen herramientas de sesión de forma predeterminada.
- Admitir una profundidad de anidación configurable para patrones de orquestador.

<Note>
  **Nota de costo:** cada subagente tiene su propio contexto y uso de tokens de forma predeterminada. Para tareas pesadas o repetitivas, configure un modelo más económico para los subagentes y mantenga su agente principal en un modelo de mayor calidad. Configure vía `agents.defaults.subagents.model` o anulaciones por agente. Cuando un hijo realmente necesita la transcripción actual del
  solicitante, el agente puede solicitar `context: "fork"` en esa generación. Las sesiones de subagentes vinculadas a hilos predeterminan a `context: "fork"` porque bifurcan la conversación actual en un hilo de seguimiento.
</Note>

## Comando de barra

Use `/subagents` para inspeccionar o controlar ejecuciones de subagentes para la **sesión
currente**:

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

Use el [`/steer <message>`](/es/tools/steer) de nivel superior para dirigir la ejecución activa de la sesión solicitante actual. Use `/subagents steer <id|#> <message>` cuando el objetivo es una ejecución secundaria.

`/subagents info` muestra metadatos de ejecución (estado, marcas de tiempo, id de sesión,
ruta de transcripción, limpieza). Use `sessions_history` para una vista de recuperación
delimitada y filtrada por seguridad; inspeccione la ruta de transcripción en disco cuando
necesite la transcripción completa sin procesar.

### Controles de vinculación de hilos

Estos comandos funcionan en canales que admiten enlaces persistentes de hilos.
Consulte [Canales que soportan hilos](#thread-supporting-channels) a continuación.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportamiento de inicio

`/subagents spawn` inicia un subagente en segundo plano como un comando de usuario (no un
retransmisor interno) y envía una actualización final de completación de vuelta al
chat solicitante cuando finaliza la ejecución.

<AccordionGroup>
  <Accordion title="Finalización sin bloqueo y basada en inserción">
    - El comando de generación (spawn) es sin bloqueo; devuelve un id de ejecución inmediatamente.
    - Al completarse, el subagente anuncia un mensaje de resumen/resultado de vuelta al canal de chat solicitante.
    - Los turnos del agente que necesitan resultados secundarios deben llamar a `sessions_yield` después de generar el trabajo requerido. Esto finaliza el turno actual y permite que los eventos de finalización lleguen como el siguiente mensaje visible para el modelo.
    - La finalización está basada en inserción. Una vez generado, **no** sondee `/subagents list`, `sessions_list` o `sessions_history` en un bucle solo para esperar a que termine; inspeccione el estado solo bajo demanda para depuración o intervención.
    - El resultado secundario es un informe/evidencia para que el agente solicitante lo sintetice. No es texto de instrucción creado por el usuario y no puede anular la política del sistema, del desarrollador o del usuario.
    - Al completarse, OpenClaw intenta al máximo cerrar las pestañas/procesos del rastreador del navegador abiertos por esa sesión de subagente antes de que continúe el flujo de limpieza del anuncio.

  </Accordion>
  <Accordion title="Resiliencia de entrega de generación manual">
    - OpenClaw devuelve las finalizaciones a la sesión solicitante a través de un turno `agent` con una clave de idempotencia estable.
    - Si la ejecución solicitante aún está activa, OpenClaw primero intenta despertar/dirigir esa ejecución en lugar de iniciar una segunda ruta de respuesta visible.
    - Si no se puede despertar un solicitante activo, OpenClaw recurre a un traspaso de agente solicitante con el mismo contexto de finalización en lugar de descartar el anuncio.
    - Si el traspaso de finalización de agente solicitante falla o no produce salida visible, OpenClaw trata la entrega como fallida y recurre al enrutamiento/reintentos de la cola. No envía el resultado secundario directamente al chat externo.
    - Los traspasos de finalización de grupo y canal siguen la misma política de respuesta visible solo para herramientas de mensaje que los turnos normales de grupo/canal, por lo que el agente solicitante debe usar la herramienta de mensaje cuando sea necesario.
    - Si no se puede usar el traspaso directo, recurre al enrutamiento de cola.
    - Si el enrutamiento de cola aún no está disponible, el anuncio se reintentará con un retroceso exponencial corto antes de rendirse finalmente.
    - La entrega de finalización mantiene la ruta solicitante resuelta: las rutas de finalización vinculadas a hilos o conversaciones ganan cuando están disponibles; si el origen de la finalización solo proporciona un canal, OpenClaw completa el objetivo/cuenta faltante desde la ruta resuelta de la sesión solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa siga funcionando.

  </Accordion>
  <Accordion title="Metadatos de entrega de finalización">
    La entrega de finalización a la sesión solicitante es contexto interno generado en tiempo de ejecución (no texto escrito por el usuario) e incluye:

    - `Result` — último texto de respuesta visible de `assistant`; de lo contrario, el último texto de herramienta/toolResult saneado. Las ejecuciones fallidas terminales no reutilizan el texto de respuesta capturado.
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - Estadísticas compactas de tiempo de ejecución/tokens.
    - Una instrucción de revisión que indica al agente solicitante que verifique el resultado antes de decidir si la tarea original está completada.
    - Orientación de seguimiento que indica al agente solicitante que continúe con la tarea o registre un seguimiento cuando el resultado secundario deje más acción pendiente.
    - Una instrucción de actualización final para la ruta sin más acciones, escrita con la voz normal del asistente sin reenviar los metadatos internos sin procesar.

  </Accordion>
  <Accordion title="Modos y tiempo de ejecución de ACP">
    - `--model` y `--thinking` anulan los valores predeterminados para esa ejecución específica.
    - Use `info`/`log` para inspeccionar detalles y resultados después de completarse.
    - `/subagents spawn` es el modo de un solo disparo (`mode: "run"`). Para sesiones persistentes vinculadas a hilos, use `sessions_spawn` con `thread: true` y `mode: "session"`.
    - Para sesiones de arnés ACP (Claude Code, Gemini CLI, OpenCode, o Codex ACP/acpx explícito), use `sessions_spawn` con `runtime: "acp"` cuando la herramienta anuncie ese tiempo de ejecución. Consulte [ACP delivery model](/es/tools/acp-agents#delivery-model) al depurar completados o bucles de agente a agente. Cuando el complemento `codex` está habilitado, el control de chat/hilo de Codex debería preferir `/codex ...` sobre ACP a menos que el usuario solicite explícitamente ACP/acpx.
    - OpenClaw oculta `runtime: "acp"` hasta que ACP está habilitado, el solicitante no está en sandbox y un complemento de backend como `acpx` está cargado. `runtime: "acp"` espera un id de arnés ACP externo, o una entrada `agents.list[]` con `runtime.type="acp"`; use el tiempo de ejecución de subagente predeterminado para agentes de configuración OpenClaw normales de `agents_list`.

  </Accordion>
</AccordionGroup>

## Modos de contexto

Los subagentes nativos se inician aislados a menos que el solicitante pida explícitamente bifurcar la transcripción actual.

| Modo       | Cuándo usarlo                                                                                                                                                | Comportamiento                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `isolated` | Investigación nueva, implementación independiente, trabajo lento de herramientas o cualquier cosa que se pueda resumir en el texto de la tarea               | Crea una transcripción hija limpia. Este es el valor predeterminado y mantiene un menor uso de tokens. |
| `fork`     | Trabajo que depende de la conversación actual, resultados previos de herramientas o instrucciones matizadas ya presentes en la transcripción del solicitante | Bifurca la transcripción del solicitante en la sesión hija antes de que el hijo se inicie.             |

Use `fork` con moderación. Es para la delegación sensible al contexto, no un
sustituto de escribir un mensaje de tarea claro.

## Herramienta: `sessions_spawn`

Inicia una ejecución de subagente con `deliver: false` en el carril global `subagent`,
luego ejecuta un paso de anuncio y publica la respuesta de anuncio en el canal
de chat del solicitante.

La disponibilidad depende de la política de herramientas efectiva del llamador. Los perfiles `coding` y
`full` exponen `sessions_spawn` de forma predeterminada. El perfil `messaging`
no lo hace; añada `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` para los agentes que deben delegar
trabajo. Las políticas de permitir/denegar de canal/grupo, proveedor, sandbox y por agente pueden
aún eliminar la herramienta después de la etapa del perfil. Use `/tools` de la misma
sesión para confirmar la lista de herramientas efectiva.

**Por defecto:**

- **Modelo:** hereda del llamador a menos que establezca `agents.defaults.subagents.model` (o `agents.list[].subagents.model` por agente); un `sessions_spawn.model` explícito todavía tiene prioridad.
- **Pensamiento (Thinking):** hereda del llamador a menos que establezca `agents.defaults.subagents.thinking` (o `agents.list[].subagents.thinking` por agente); un `sessions_spawn.thinking` explícito todavía tiene prioridad.
- **Tiempo de espera de ejecución:** si se omite `sessions_spawn.runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` cuando está establecido; de lo contrario, recurre a `0` (sin tiempo de espera).
- **Entrega de tareas:** los subagentes nativos reciben la tarea delegada en su primer mensaje visible `[Subagent Task]`. El mensaje del sistema del subagente lleva reglas de tiempo de ejecución y contexto de enrutamiento, no un duplicado oculto de la tarea.

### Modo de aviso de delegación

`agents.defaults.subagents.delegationMode` controla solo la guía del aviso; no cambia la política de herramientas ni impone la delegación.

- `suggest` (predeterminado): mantiene el empuje del aviso estándar para usar subagentes para trabajos más grandes o más lentos.
- `prefer`: indica al agente principal que permanezca receptivo y delegue cualquier cosa más complicada que una respuesta directa a través de `sessions_spawn`.

Las anulaciones por agente usan `agents.list[].subagents.delegationMode`.

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### Parámetros de la herramienta

<ParamField path="task" type="string" required>
  La descripción de la tarea para el subagente.
</ParamField>
<ParamField path="taskName" type="string">
  Identificador estable opcional para la posterior orientación `subagents`. Debe coincidir con `[a-z][a-z0-9_]{0,63}` y no puede ser objetivos reservados como `last` o `all`. Se prefiere cuando el coordinador pueda necesitar dirigir, eliminar o identificar un hijo específico después de generar varios hijos.
</ParamField>
<ParamField path="label" type="string">
  Etiqueta legible por humanos opcional.
</ParamField>
<ParamField path="agentId" type="string">
  Generar bajo otro id de agente cuando lo permita `subagents.allowAgents`.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` es solo para arneses ACP externos (`claude`, `droid`, `gemini`, `opencode`, o Codex ACP/acpx solicitado explícitamente) y para entradas `agents.list[]` cuyo `runtime.type` sea `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Solo para ACP. Reanuda una sesión de arnés ACP existente cuando `runtime: "acp"`; se ignora para generaciones de subagente nativas.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  Solo para ACP. Transmite la salida de ejecución de ACP a la sesión principal cuando `runtime: "acp"`; omitir para generaciones de subagente nativas.
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
  Cuando `true`, solicita el enlace de hilo del canal para esta sesión de subagente.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  Si `thread: true` y `mode` se omiten, el valor predeterminado es `session`. `mode: "session"` requiere `thread: true`.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción a través del cambio de nombre).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rechaza la generación a menos que el tiempo de ejecución del hijo objetivo esté en espacio aislado.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` bifurca la transcripción actual del solicitante en la sesión secundaria. Solo para subagentes nativos. Las generaciones vinculadas a hilos tienen como valor predeterminado `fork`; las generaciones sin hilo tienen como valor predeterminado `isolated`.
</ParamField>

<Warning>`sessions_spawn` **no** acepta parámetros de entrega al canal (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Para la entrega, utilice `message`/`sessions_send` desde la ejecución generada.</Warning>

### Nombres de tareas y orientación

`taskName` es un identificador para la orquestación orientado al modelo, no una clave de sesión.
Úselo para nombres de hijos estables como `review_subagents`,
`linux_validation`, o `docs_update` cuando un coordinador pueda necesitar dirigir
o terminar ese hijo más adelante.

La resolución de objetivos acepta coincidencias exactas de `taskName` y prefijos
sin ambigüedades. La coincidencia está limitada a la misma ventana de objetivos activos/recientes utilizada
por los objetivos numerados `/subagents`, por lo que un hijo completado obsoleto no hace
que un identificador reutilizado sea ambiguo. Si dos hijos activos o recientes comparten el mismo
`taskName`, el objetivo es ambiguo; utilice en su lugar el índice de la lista, la clave de sesión o el
id de ejecución.

Los objetivos reservados `last` y `all` no son valores válidos de `taskName`
porque ya tienen significados de control.

## Herramienta: `sessions_yield`

Finaliza el turno actual del modelo y espera a que lleguen eventos de tiempo de ejecución, principalmente
eventos de finalización de sub-agentes, como el siguiente mensaje. Úselo después
de generar el trabajo secundario requerido cuando el solicitante no pueda producir una respuesta
final hasta que lleguen esas finalizaciones.

`sessions_yield` es la primitiva de espera. No la reemplace con bucles de sondeo
sobre `subagents`, `sessions_list`, `sessions_history`, shell
`sleep`, o sondeo de procesos solo para detectar la finalización del hijo.

Use `sessions_yield` solo cuando la lista de herramientas efectiva de la sesión la incluya. Algunos perfiles de herramientas mínimos o personalizados pueden exponer `sessions_spawn` y `subagents` sin exponer `sessions_yield`; en ese caso, no invente un bucle de sondeo solo para esperar la finalización.

Cuando existen hijos activos, OpenClaw inyecta un bloque de solicitud `Active Subagents` compacto generado en tiempo de ejecución en turnos normales para que el solicitante pueda ver las sesiones hijas actuales, ids de ejecución, estados, etiquetas, tareas y alias de `taskName` sin sondeo. Los campos de tarea y etiqueta en ese bloque se citan como datos, no como instrucciones, porque pueden originarse de argumentos de generación proporcionados por el usuario/modelo.

## Herramienta: `subagents`

Enumera, dirige o termina ejecuciones de sub-agentes generadas propiedad de la sesión solicitante. Está limitado al solicitante actual; un hijo solo puede ver/controlar sus propios hijos controlados.

Use `subagents` para estado bajo demanda, depuración, dirección o terminación. Use `sessions_yield` para esperar eventos de finalización.

## Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un canal, un sub-agente puede permanecer vinculado a un hilo para que los mensajes de seguimiento del usuario en ese hilo sigan enrutándose a la misma sesión de sub-agente.

### Canales que soportan hilos

**Discord** es actualmente el único canal soportado. Soporta sesiones de subagente vinculadas a hilos persistentes (`sessions_spawn` con `thread: true`), controles de hilos manuales (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`), y claves de adaptador `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` y `channels.discord.threadBindings.spawnSessions`.

### Flujo rápido

<Steps>
  <Step title="Generar">`sessions_spawn` con `thread: true` (y opcionalmente `mode: "session"`).</Step>
  <Step title="Vincular">OpenClaw crea o vincula un hilo a ese objetivo de sesión en el canal activo.</Step>
  <Step title="Enrutamiento de seguimientos">Las respuestas y mensajes de seguimiento en ese hilo se enrutan a la sesión vinculada.</Step>
  <Step title="Inspeccionar tiempos de espera">Use `/session idle` para inspeccionar/actualizar la auto-desenfocación por inactividad y `/session max-age` para controlar el límite estricto.</Step>
  <Step title="Desvincular">Use `/unfocus` para desvincular manualmente.</Step>
</Steps>

### Controles manuales

| Comando            | Efecto                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Vincula el hilo actual (o crea uno) a un objetivo de sub-agente/sesión                        |
| `/unfocus`         | Elimina la vinculación del hilo vinculado actual                                              |
| `/agents`          | Lista las ejecuciones activas y el estado de vinculación (`thread:<id>` o `unbound`)          |
| `/session idle`    | Inspecciona/actualiza la auto-desenfocación por inactividad (solo hilos vinculados enfocados) |
| `/session max-age` | Inspecciona/actualiza el límite estricto (solo hilos vinculados enfocados)                    |

### Interruptores de configuración

- **Predeterminado global:** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Las **claves de anulación de canal y auto-vinculación al generar** son específicas del adaptador. Consulte [Canales compatibles con hilos](#thread-supporting-channels) más arriba.

Consulte [Referencia de configuración](/es/gateway/configuration-reference) y
[Comandos de barra](/es/tools/slash-commands) para obtener detalles del adaptador actual.

### Lista de permitidos

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Lista de IDs de agentes que pueden ser objetivo mediante `agentId` explícito (`["*"]` permite cualquier objetivo configurado). Predeterminado: solo el agente solicitante. Si estableces una lista y aún deseas que el solicitante se genere a sí mismo con `agentId`, incluye el ID del solicitante en la lista.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Lista blanca de agentes objetivo predeterminada que se utiliza cuando el agente solicitante no establece su propia `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquea las llamadas a `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil). Anulación por agente: `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Tiempo de espera por llamada para los intentos de entrega de anuncios de `agent` de la puerta de enlace. Los valores son milisegundos enteros positivos y se limitan al máximo seguro del temporizador de la plataforma. Los reintentos transitorios pueden hacer que la espera total del anuncio sea mayor que un tiempo de espera configurado.
</ParamField>

Si la sesión solicitante está en espacio aislado (sandboxed), `sessions_spawn` rechaza los objetivos
que se ejecutarían sin espacio aislado.

### Descubrimiento

Usa `agents_list` para ver qué ids de agentes están permitidos actualmente para
`sessions_spawn`. La respuesta incluye el modelo efectivo y los metadatos de tiempo de ejecución integrados de cada agente listado para que las personas que llaman puedan distinguir entre PI, servidor de aplicaciones Codex
y otros tiempos de ejecución nativos configurados.

### Archivo automático

- Las sesiones de sub-agentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado `60`).
- El archivo utiliza `sessions.delete` y cambia el nombre de la transcripción a `*.deleted.<timestamp>` (misma carpeta).
- `cleanup: "delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción mediante el cambio de nombre).
- El archivo automático es de mejor esfuerzo; los temporizadores pendientes se pierden si se reinicia la puerta de enlace.
- `runTimeoutSeconds` **no** archiva automáticamente; solo detiene la ejecución. La sesión permanece hasta el archivado automático.
- El archivado automático se aplica por igual a las sesiones de profundidad 1 y de profundidad 2.
- La limpieza del navegador es independiente de la limpieza del archivo: las pestañas/procesos del navegador rastreados se cierran con el mejor esfuerzo posible cuando finaliza la ejecución, incluso si se mantiene el registro de la transcripción/sesión.

## Sub-agentes anidados

De forma predeterminada, los sub-agentes no pueden generar sus propios sub-agentes
(`maxSpawnDepth: 1`). Configure `maxSpawnDepth: 2` para habilitar un nivel de
anidación: el patrón de **orquestador**: principal → sub-agente orquestador →
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
        announceTimeoutMs: 120000, // per-call gateway announce timeout
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

Los resultados fluyen hacia arriba por la cadena:

1. El trabajador de profundidad 2 finaliza → anuncia a su padre (orquestador de profundidad 1).
2. El orquestador de profundidad 1 recibe el anuncio, sintetiza los resultados, finaliza → anuncia al principal.
3. El agente principal recibe el anuncio y lo entrega al usuario.

Cada nivel solo ve los anuncios de sus hijos directos.

<Note>
  **Guía operativa:** inicie el trabajo secundario una vez y espere los eventos de finalización en lugar de crear bucles de sondeo alrededor de `sessions_list`, `sessions_history`, `/subagents list`, o comandos de suspensión `exec`. `sessions_list` y `/subagents list` mantienen las relaciones de sesión secundaria enfocadas en el trabajo en vivo: los hijos en vivo permanecen adjuntos, los hijos
  finalizados se mantienen visibles durante una ventana reciente breve y los enlaces secundarios obsoletos solo de almacenamiento se ignoran después de su ventana de vigencia. Esto evita que los metadatos antiguos de `spawnedBy` / `parentSessionKey` resuciten hijos fantasma después del reinicio. Si llega un evento de finalización secundario después de que ya envió la respuesta final, el
  seguimiento correcto es el token silencioso exacto `NO_REPLY` / `no_reply`.
</Note>

### Política de herramientas por profundidad

- El rol y el alcance de control se escriben en los metadatos de la sesión en el momento de la creación. Esto evita que las claves de sesión planas o restauradas recuperen accidentalmente privilegios de orquestador.
- **Profundidad 1 (orquestador, cuando `maxSpawnDepth >= 2`):** obtiene `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` para que pueda gestionar a sus hijos. Las demás herramientas de sesión/sistema siguen denegadas.
- **Profundidad 1 (hoja, cuando `maxSpawnDepth == 1`):** sin herramientas de sesión (comportamiento predeterminado actual).
- **Profundidad 2 (trabajador hoja):** sin herramientas de sesión — `sessions_spawn` siempre se deniega en la profundidad 2. No puede generar más hijos.

### Límite de creación por agente

Cada sesión de agente (a cualquier profundidad) puede tener como máximo `maxChildrenPerAgent`
(por defecto `5`) hijos activos a la vez. Esto evita una proliferación incontrolable
desde un solo orquestador.

### Detención en cascada

Detener un orquestador de profundidad 1 detiene automáticamente a todos sus hijos
de profundidad 2:

- `/stop` en el chat principal detiene todos los agentes de profundidad 1 y se propaga a sus hijos de profundidad 2.
- `/subagents kill <id>` detiene un subagente específico y se propaga a sus hijos.
- `/subagents kill all` detiene todos los subagentes para el solicitante y se propaga.

## Autenticación

La autenticación del subagente se resuelve por **id. de agente**, no por tipo de sesión:

- La clave de sesión del subagente es `agent:<agentId>:subagent:<uuid>`.
- El almacén de autenticación se carga desde el `agentDir` de ese agente.
- Los perfiles de autenticación del agente principal se fusionan como **respaldo**; los perfiles del agente prevalecen sobre los perfiles principales en caso de conflicto.

La fusión es aditiva, por lo que los perfiles principales siempre están disponibles como
respaldos. Todavía no se admite una autenticación totalmente aislada por agente.

## Anuncio

Los subagentes informan a través de un paso de anuncio:

- El paso de anuncio se ejecuta dentro de la sesión del subagente (no la sesión del solicitante).
- Si el subagente responde exactamente `ANNOUNCE_SKIP`, no se publica nada.
- Si el último texto del asistente es el token silencioso exacto `NO_REPLY` / `no_reply`, la salida del anuncio se suprime incluso si existía un progreso visible anterior.

La entrega depende de la profundidad del solicitante:

- Las sesiones solicitantes de nivel superior usan una llamada de seguimiento `agent` con entrega externa (`deliver=true`).
- Las sesiones de subagente solicitantes anidadas reciben una inyección interna de seguimiento (`deliver=false`) para que el orquestador pueda sintetizar los resultados secundarios en la sesión.
- Si una sesión de subagente solicitante anidada ha desaparecido, OpenClaw recurre al solicitante de esa sesión cuando está disponible.

Para las sesiones solicitantes de nivel superior, la entrega directa en modo de finalización primero
resuelve cualquier ruta de conversación/hilo vinculada y anulación de enlace, luego completa
los campos de destino del canal faltantes desde la ruta almacenada de la sesión solicitante.
Eso mantiene las finalizaciones en el chat/tema correcto incluso cuando el origen
de la finalización solo identifica el canal.

La agregación de finalizaciones secundarias se limita a la ejecución solicitante actual al
construir hallazgos de finalización anidados, evitando que las salidas secundarias obsoletas de ejecuciones anteriores
se filtren en el anuncio actual. Las respuestas de anuncio preservan
el enrutamiento de hilo/tema cuando está disponible en los adaptadores de canal.

### Contexto de anuncio

El contexto de anuncio se normaliza a un bloque de eventos interno estable:

| Campo                   | Fuente                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fuente                  | `subagent` o `cron`                                                                                                              |
| Ids de sesión           | Clave/id de sesión secundaria                                                                                                    |
| Tipo                    | Tipo de anuncio + etiqueta de tarea                                                                                              |
| Estado                  | Derivado del resultado en tiempo de ejecución (`success`, `error`, `timeout` o `unknown`) — **no** inferido del texto del modelo |
| Contenido del resultado | Texto visible más reciente del asistente, de lo contrario texto de herramienta/toolResult más reciente saneado                   |
| Seguimiento             | Instrucción que describe cuándo responder vs permanecer en silencio                                                              |

Las ejecuciones fallidas terminales informan el estado de falto sin reproducir el
texto de respuesta capturado. En caso de tiempo de espera, si el hijo solo llegó a las llamadas de herramientas, el anuncio
puede colapsar ese historial en un breve resumen de progreso parcial en lugar
de reproducir la salida cruda de la herramienta.

### Línea de estadísticas

Las cargas útiles de anuncio incluyen una línea de estadísticas al final (incluso cuando están envueltas):

- Tiempo de ejecución (ej. `runtime 5m12s`).
- Uso de tokens (entrada/salida/total).
- Coste estimado cuando la fijación de precios del modelo está configurada (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` y la ruta de la transcripción para que el agente principal pueda obtener el historial a través de `sessions_history` o inspeccionar el archivo en disco.

Los metadatos internos están destinados solo para la orquestación; las respuestas dirigidas al usuario deben reescribirse con la voz normal del asistente.

### Por qué preferir `sessions_history`

`sessions_history` es la ruta de orquestación más segura:

- El recuerdo del asistente se normaliza primero: se eliminan las etiquetas de pensamiento; se elimina el andamiaje `<relevant-memories>` / `<relevant_memories>`; se eliminan los bloques de carga útil XML de llamadas a herramientas en texto plano (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`), incluidas las cargas útiles truncadas que nunca se cierran correctamente; se elimina el andamiaje de llamada/resultado de herramientas degradado y los marcadores de contexto histórico; se eliminan los tokens de control de modelo filtrados (`<|assistant|>`, otros `<|...|>` ASCII, `<｜...｜>` de ancho completo); se elimina el XML de llamada a herramientas de MiniMax malformado.
- El texto tipo credencial/token se redacta.
- Los bloques largos pueden truncarse.
- Los historiales muy grandes pueden eliminar filas antiguas o reemplazar una fila sobredimensionada con `[sessions_history omitted: message too large]`.
- La inspección de la transcripción sin procesar en disco es el método de respaldo cuando necesitas la transcripción completa byte por byte.

## Política de herramientas

Los subagentes utilizan el mismo perfil y canalización de políticas de herramientas que el agente principal o de destino primero. Después de eso, OpenClaw aplica la capa de restricción de subagente.

Sin `tools.profile` restrictivo, los subagentes obtienen **todas las herramientas excepto las herramientas de sesión** y las herramientas del sistema:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` sigue siendo una vista de recuerdo limitada y saneada aquí también; no es un volcado de transcripción sin procesar.

Cuando `maxSpawnDepth >= 2`, los subagentes orquestadores de profundidad 1 reciben adicionalmente `sessions_spawn`, `subagents`, `sessions_list` y `sessions_history` para que puedan gestionar a sus hijos.

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

`tools.subagents.tools.allow` es un filtro final de solo permiso. Puede limitar
el conjunto de herramientas ya resuelto, pero no puede **volver a agregar**
un herramienta eliminada por `tools.profile`. Por ejemplo, `tools.profile: "coding"` incluye
`web_search`/`web_fetch` pero no la herramienta `browser`. Para permitir
que los sub-agentes de perfil de codificación usen la automatización del
navegador, agregue el navegador en la etapa de perfil:

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Use `agents.list[].tools.alsoAllow: ["browser"]` por agente cuando solo un
agente deba tener la automatización del navegador.

## Concurrencia

Los sub-agentes utilizan un carril de cola dedicado en proceso:

- **Nombre del carril:** `subagent`
- **Concurrencia:** `agents.defaults.subagents.maxConcurrent` (predeterminado `8`)

## Actividad y recuperación

OpenClaw no trata la ausencia de `endedAt` como una prueba permanente de que un
sub-agente sigue vivo. Las ejecuciones sin terminar anteriores a la ventana
de ejecución obsoleta dejan de contarse como activas/pendientes en `/subagents list`, resúmenes de estado,
control de finalización de descendientes y verificaciones de concurrencia por sesión.

Después de un reinicio de la puerta de enlace, las ejecuciones restauradas obsoletas
sin terminar se eliminan a menos que su sesión secundaria esté marcada como `abortedLastRun: true`. Esas
sesiones secundarias abortadas por reinicio siguen siendo recuperables a través del
flujo de recuperación de huérfanos de sub-agente, que envía un mensaje de reanudación
sintético antes de borrar el marcador de aborto.

La recuperación automática de reinicio está limitada por sesión secundaria. Si el mismo
hijo de sub-agente es aceptado para la recuperación de huérfanos repetidamente dentro de la
ventana de re-cuñación rápida, OpenClaw conserva una lápida de recuperación en esa
sesión y deja de reanudarla automáticamente en reinicios posteriores. Ejecute
`openclaw tasks maintenance --apply` para conciliar el registro de tareas, o
`openclaw doctor --fix` para borrar las marcas de recuperación abortadas obsoletas en
sesiones con lápida.

<Note>
  Si la generación de un subagente falla con Gateway `PAIRING_REQUIRED` / `scope-upgrade`, verifique el llamador RPC antes de editar el estado de emparejamiento. La coordinación interna de `sessions_spawn` debe conectarse como `client.id: "gateway-client"` con `client.mode: "backend"` a través de autenticación directa de token compartido/contraseña de loopback; esa ruta no depende de la línea base
  del ámbito del dispositivo emparejado de la CLI. Los llamadores remotos, `deviceIdentity` explícitos, rutas de token de dispositivo explícitas, y clientes de navegador/nodo aún necesitan la aprobación normal del dispositivo para actualizaciones de ámbito.
</Note>

## Detención

- Enviar `/stop` en el chat solicitante aborta la sesión solicitante y detiene cualquier ejecución de subagente activa generada desde ella, extendiéndose en cascada a los hijos anidados.
- `/subagents kill <id>` detiene un subagente específico y se extiende en cascada a sus hijos.

## Limitaciones

- El anuncio del subagente es con el **mejor esfuerzo**. Si el gateway se reinicia, el trabajo pendiente de "anunciar de vuelta" se pierde.
- Los subagentes aún comparten los mismos recursos del proceso del gateway; trate `maxConcurrent` como una válvula de seguridad.
- `sessions_spawn` siempre es sin bloqueo: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- El contexto del subagente solo inyecta `AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md` y `USER.md` (sin `MEMORY.md`, `HEARTBEAT.md` o `BOOTSTRAP.md`).
- La profundidad máxima de anidamiento es 5 (rango de `maxSpawnDepth`: 1–5). Se recomienda una profundidad de 2 para la mayoría de los casos de uso.
- `maxChildrenPerAgent` limita los hijos activos por sesión (por defecto `5`, rango `1–20`).

## Relacionado

- [Agentes ACP](/es/tools/acp-agents)
- [Envío de agente](/es/tools/agent-send)
- [Tareas en segundo plano](/es/automation/tasks)
- [Herramientas de sandbox multiagente](/es/tools/multi-agent-sandbox-tools)
