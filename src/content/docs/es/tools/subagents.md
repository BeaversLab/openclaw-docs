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
cuando terminan, **anuncian** su resultado de nuevo al canal de
chat solicitante. Cada ejecución de sub-agente se rastrea como una
tarea en segundo plano (/en/automation/tasks).

Objetivos principales:

- Paralelizar el trabajo de "investigación / tarea larga / herramienta lenta" sin bloquear la ejecución principal.
- Mantener los sub-agentes aislados de forma predeterminada (separación de sesión + sandbox opcional).
- Hacer difícil el mal uso de las herramientas: los sub-agentes **no** obtienen herramientas de sesión de forma predeterminada.
- Admitir una profundidad de anidación configurable para patrones de orquestador.

<Note>
  **Nota de costo:** cada sub-agente tiene su propio contexto y uso de tokens de manera predeterminada. Para tareas pesadas o repetitivas, configure un modelo más económico para los sub-agentes y mantenga su agente principal en un modelo de mayor calidad. Configure a través de `agents.defaults.subagents.model` o anulaciones por agente. Cuando un hijo realmente necesita la transcripción actual del
  solicitante, el agente puede solicitar `context: "fork"` en esa generación. Las sesiones de subagente vinculadas a hilos (thread-bound) predeterminan a `context: "fork"` porque bifurcan la conversación actual en un hilo de seguimiento.
</Note>

## Comando de barra

Use `/subagents` para inspeccionar las ejecuciones de sub-agentes para la **sesión actual**:

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` muestra metadatos de ejecución (estado, marcas de tiempo, id de sesión,
ruta de transcripción, limpieza). Use `sessions_history` para una vista de
recuperación limitada y con filtro de seguridad; inspeccione la ruta de transcripción en disco cuando
necesite la transcripción completa sin procesar.

### Controles de vinculación de hilos

Estos comandos funcionan en canales que admiten vinculaciones de hilos persistentes.
Vea [Canales que soportan hilos](#thread-supporting-channels) a continuación.

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Comportamiento de generación

Los agentes inician sub-agentes en segundo plano con `sessions_spawn`. Las completaciones de sub-agentes
se devuelven como eventos internos de la sesión principal; el agente principal/solicitante decide
si es necesaria una actualización visible para el usuario.

<AccordionGroup>
  <Accordion title="Finalización sin bloqueo y basada en inserción">
    - `sessions_spawn` es sin bloqueo; devuelve un id de ejecución inmediatamente.
    - Al completarse, el subagente informa de vuelta a la sesión padre/solicitante.
    - Los turnos del agente que necesitan resultados secundarios deben llamar a `sessions_yield` después de generar el trabajo necesario. Eso finaliza el turno actual y permite que los eventos de finalización lleguen como el siguiente mensaje visible para el modelo.
    - La finalización se basa en inserción. Una vez generado, **no** sondee `/subagents list`, `sessions_list` o `sessions_history` en un bucle solo para esperar que termine; inspeccione el estado solo bajo demanda para visibilidad de depuración.
    - La salida secundaria es un informe/evidencia para que el agente solicitante lo sintetice. No es texto de instrucción creado por el usuario y no puede anular la política del sistema, desarrollador o usuario.
    - Al completarse, OpenClaw cierra con el mejor esfuerzo las pestañas/procesos del navegador rastreados abiertos por esa sesión de subagente antes de que continúe el flujo de limpieza de anuncio.

  </Accordion>
  <Accordion title="Entrega de finalización">
    - OpenClaw entrega las finalizaciones de vuelta a la sesión solicitante a través de un turno `agent` con una clave de idempotencia estable.
    - Si la ejecución solicitante todavía está activa, OpenClaw primero intenta despertar/dirigir esa ejecución en lugar de iniciar una segunda ruta de respuesta visible.
    - Si un solicitante activo no puede ser despertado, OpenClaw recurre a una transferencia al agente solicitante con el mismo contexto de finalización en lugar de descartar el anuncio.
    - Una transferencia al padre exitosa completa la entrega del subagente incluso cuando el padre decide que no se necesita ninguna actualización visible para el usuario.
    - Los subagentes nativos no obtienen la herramienta de mensaje. Devuelven texto de asistente sin formato al agente padre/solicitante; las respuestas visibles para humanos son propiedad de la política de entrega normal del agente padre/solicitante.
    - Si no se puede utilizar la transferencia directa, se recurre al enrutamiento de cola.
    - Si el enrutamiento de cola aún no está disponible, el anuncio se reintentará con un retroceso exponencial corto antes de la renuncia final.
    - La entrega de finalización mantiene la ruta solicitante resuelta: las rutas de finalización vinculadas al hilo o a la conversación ganan cuando están disponibles; si el origen de la finalización solo proporciona un canal, OpenClaw completa el objetivo/cuenta faltante desde la ruta resuelta de la sesión solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa siga funcionando.

  </Accordion>
  <Accordion title="Metadatos de traspaso de finalización">
    El traspaso de finalización a la sesión solicitante es contexto interno generado en tiempo de ejecución
    (no texto escrito por el usuario) e incluye:

    - `Result` — el último texto de respuesta `assistant` visible del agente secundario. La salida de herramientas/toolResult no se promueve a los resultados secundarios. Las ejecuciones fallidas terminales no reutilizan el texto de respuesta capturado.
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`.
    - Estadísticas compactas de tiempo de ejecución/tokens.
    - Una instrucción de revisión indicando al agente solicitante que verifique el resultado antes de decidir si la tarea original está completa.
    - Guía de seguimiento indicando al agente solicitante que continúe la tarea o registre un seguimiento cuando el resultado secundario requiera más acción.
    - Una instrucción de actualización final para la ruta sin más acción, escrita con la voz normal del asistente sin reenviar metadatos internos sin procesar.

  </Accordion>
  <Accordion title="Modos y tiempo de ejecución de ACP">
    - `--model` y `--thinking` anulan los valores predeterminados para esa ejecución específica.
    - Use `info`/`log` para inspeccionar los detalles y el resultado tras la finalización.
    - Para sesiones persistentes vinculadas a hilos, use `sessions_spawn` con `thread: true` y `mode: "session"`.
    - Si el canal solicitante no admite vinculaciones de hilos, use `mode: "run"` en lugar de reintentar combinaciones vinculadas a hilos imposibles.
    - Para sesiones de arnés ACP (Claude Code, Gemini CLI, OpenCode o Codex ACP/acpx explícito), use `sessions_spawn` con `runtime: "acp"` cuando la herramienta anuncie ese tiempo de ejecución. Consulte [ACP delivery model](/es/tools/acp-agents#delivery-model) al depurar finalizaciones o bucles de agente a agente. Cuando el complemento `codex` está habilitado, el control de chat/hilos de Codex debe preferir `/codex ...` sobre ACP a menos que el usuario solicite explícitamente ACP/acpx.
    - OpenClaw oculta `runtime: "acp"` hasta que ACP está habilitado, el solicitante no está en sandbox y se carga un complemento de backend como `acpx`. `runtime: "acp"` espera un id de arnés ACP externo o una entrada `agents.list[]` con `runtime.type="acp"`; use el tiempo de ejecución de subagente predeterminado para agentes de configuración OpenClaw normales de `agents_list`.

  </Accordion>
</AccordionGroup>

## Modos de contexto

Los subagentes nativos comienzan aislados a menos que el llamador solicite explícitamente bifurcar la transcripción actual.

| Modo       | Cuándo usarlo                                                                                                                                                | Comportamiento                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `isolated` | Investigación fresca, implementación independiente, trabajo de herramienta lento o cualquier cosa que pueda resumirse en el texto de la tarea                | Crea una transcripción secundaria limpia. Este es el valor predeterminado y mantiene el uso de tokens más bajo. |
| `fork`     | Trabajo que depende de la conversación actual, resultados previos de herramientas o instrucciones matizadas ya presentes en la transcripción del solicitante | Bifurca la transcripción del solicitante en la sesión secundaria antes de que el hijo comience.                 |

Use `fork` con moderación. Es para la delegación sensible al contexto, no un
sustituto para escribir un mensaje de tarea claro.

## Herramienta: `sessions_spawn`

Inicia una ejecución de subagente con `deliver: false` en el carril global `subagent`,
luego ejecuta un paso de anuncio y publica la respuesta de anuncio en el canal de
chat solicitante.

La disponibilidad depende de la política de herramientas efectiva del llamador. Los perfiles `coding` y
`full` exponen `sessions_spawn` por defecto. El perfil `messaging` no
lo hace; añada `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"` para los agentes que deben delegar
trabajo. Las políticas de permitir/denegar por canal/grupo, proveedor, sandbox y agente individual pueden
aún eliminar la herramienta después de la etapa del perfil. Use `/tools` desde la misma
sesión para confirmar la lista de herramientas efectiva.

**Valores predeterminados:**

- **Modelo:** hereda el del llamador a menos que establezca `agents.defaults.subagents.model` (o `agents.list[].subagents.model` por agente); un `sessions_spawn.model` explícito todavía tiene prioridad.
- **Pensamiento (Thinking):** hereda el del llamador a menos que establezca `agents.defaults.subagents.thinking` (o `agents.list[].subagents.thinking` por agente); un `sessions_spawn.thinking` explícito todavía tiene prioridad.
- **Tiempo de espera de ejecución:** si se omite `sessions_spawn.runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` cuando está establecido; de lo contrario, recurre a `0` (sin tiempo de espera).
- **Entrega de tareas:** los sub-agentes nativos reciben la tarea delegada en su primer mensaje `[Subagent Task]` visible. El prompt del sistema del sub-agente lleva reglas de tiempo de ejecución y contexto de enrutamiento, no un duplicado oculto de la tarea.

### Modo de mensaje de delegación

`agents.defaults.subagents.delegationMode` controla solo la guía del prompt; no cambia la política de herramientas ni impone la delegación.

- `suggest` (predeterminado): mantiene el empujón del prompt estándar para usar sub-agentes en trabajos más grandes o lentos.
- `prefer`: indica al agente principal que se mantenga receptivo y delegue cualquier cosa que implique más que una respuesta directa a través de `sessions_spawn`.

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
  Identificador estable opcional para identificar un hijo específico en la salida de estado posterior. Debe coincidir con `[a-z][a-z0-9_-]{0,63}` y no puede ser objetivos reservados como `last` o `all`.
</ParamField>
<ParamField path="label" type="string">
  Etiqueta legible por humanos opcional.
</ParamField>
<ParamField path="agentId" type="string">
  Generar bajo otro id de agente configurado cuando lo permita `subagents.allowAgents`.
</ParamField>
<ParamField path="cwd" type="string">
  Directorio de trabajo de tarea opcional para la ejecución hija. Los subagentes nativos todavía cargan archivos de arranque desde el espacio de trabajo del agente objetivo; `cwd` solo cambia dónde las herramientas de tiempo de ejecución y los arneses CLI realizan el trabajo delegado.
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` es solo para arneses ACP externos (`claude`, `droid`, `gemini`, `opencode`, o Codex ACP/acpx solicitado explícitamente) y para entradas `agents.list[]` cuyo `runtime.type` es `acp`.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Solo ACP. Reanuda una sesión de arnés ACP existente cuando `runtime: "acp"`; se ignora para generaciones de subagente nativas.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  Solo ACP. Transmite la salida de ejecución de ACP a la sesión principal cuando `runtime: "acp"`; omitir para generaciones de subagente nativas.
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
  Si `thread: true` y `mode` se omiten, el valor predeterminado pasa a ser `session`. `mode: "session"` requiere `thread: true`.
  Si el enlace de hilo no está disponible para el canal solicitante, use `mode: "run"` en su lugar.
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción a través de cambiar nombre).
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` rechaza la generación a menos que el tiempo de ejecución del hijo de destino esté en sandbox.
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` bifurca la transcripción actual del solicitante en la sesión hija. Solo subagentes nativos. Las generaciones enlazadas a hilos tienen por defecto `fork`; las generaciones sin hilo tienen por defecto `isolated`.
</ParamField>

<Warning>`sessions_spawn` **no** acepta parámetros de entrega de canal (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Los subagentes nativos informan de su último turno de asistente de vuelta al solicitante; la entrega externa se mantiene con el agente principal/solicitante.</Warning>

### Nombres de tareas y direccionamiento

`taskName` es un identificador orientado al modelo para la orquestación, no una clave de sesión.
Úselo para nombres de hijos estables como `review_subagents`,
`linux_validation` o `docs_update` cuando un coordinador pueda necesitar inspeccionar
ese hijo más adelante.

La resolución de objetivos acepta coincidencias exactas de `taskName` y prefijos
sin ambigüedades. La coincidencia se limita a la misma ventana de objetivos activos/recientes utilizada
por los objetivos numerados `/subagents`, por lo que un hijo completado obsoleto no hace
que un identificador reutilizado sea ambiguo. Si dos hijos activos o recientes comparten el mismo
`taskName`, el objetivo es ambiguo; utilice en su lugar el índice de la lista, la clave de sesión o
el id de ejecución.

Los objetivos reservados `last` y `all` no son valores válidos de `taskName`
porque ya tienen significados de control.

## Herramienta: `sessions_yield`

Finaliza el turno actual del modelo y espera a que los eventos de tiempo de ejecución, principalmente
eventos de finalización de subagentes, lleguen como el siguiente mensaje. Úselo después
de generar el trabajo hijo requerido cuando el solicitante no pueda producir una respuesta
final hasta que lleguen esas finalizaciones.

`sessions_yield` es la primitiva de espera. No la reemplace con bucles
de sondeo sobre `subagents`, `sessions_list`, `sessions_history`, shell
`sleep` o sondeo de procesos solo para detectar la finalización del hijo.

Solo use `sessions_yield` cuando la lista efectiva de herramientas de la sesión la
incluya. Algunos perfiles de herramientas mínimos o personalizados pueden exponer `sessions_spawn` y
`subagents` sin exponer `sessions_yield`; en ese caso, no invente
un bucle de sondeo solo para esperar la finalización.

Cuando existen hijos activos, OpenClaw inyecta un bloque de prompts `Active Subagents` generado en tiempo compacto en los turnos normales para que el solicitante pueda ver las sesiones hijas actuales, ids de ejecución, estados, etiquetas, tareas y alias `taskName` sin sondear. Los campos de tarea y etiqueta en ese bloque se citan como datos, no como instrucciones, porque pueden originarse de argumentos de generación proporcionados por el usuario/modelo.

## Herramienta: `subagents`

Enumera las ejecuciones de sub-agentes generadas propiedad de la sesión solicitante. Está limitado al solicitante actual; un hijo solo puede ver sus propios hijos controlados.

Use `subagents` para el estado bajo demanda y la depuración. Use `sessions_yield` para esperar a los eventos de finalización.

## Sesiones vinculadas a hilos (threads)

Cuando los enlaces de hilo (thread bindings) están habilitados para un canal, un sub-agente puede permanecer vinculado a un hilo para que los mensajes de seguimiento del usuario en ese hilo sigan siendo enrutados a la misma sesión de sub-agente.

### Canales compatibles con hilos

**Discord** es actualmente el único canal admitido. Soporta sesiones persistentes de subagentes vinculadas a hilos (`sessions_spawn` con `thread: true`), controles manuales de hilos (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) y claves de adaptador `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` y `channels.discord.threadBindings.spawnSessions`.

### Flujo rápido

<Steps>
  <Step title="Generar">`sessions_spawn` con `thread: true` (y opcionalmente `mode: "session"`).</Step>
  <Step title="Vincular">OpenClaw crea o vincula un hilo a ese objetivo de sesión en el canal activo.</Step>
  <Step title="Rutear seguimientos">Las respuestas y mensajes de seguimiento en ese hilo se enrutan a la sesión vinculada.</Step>
  <Step title="Inspeccionar tiempos de espera">Use `/session idle` para inspeccionar/actualizar la auto-desenfocación por inactividad y `/session max-age` para controlar el límite estricto.</Step>
  <Step title="Desvincular">Use `/unfocus` para desvincular manualmente.</Step>
</Steps>

### Controles manuales

| Comando            | Efecto                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `/focus <target>`  | Vincular el hilo actual (o crear uno) a un objetivo de subagente/sesión                         |
| `/unfocus`         | Eliminar la vinculación para el hilo vinculado actual                                           |
| `/agents`          | Listar ejecuciones activas y estado de vinculación (`thread:<id>` o `unbound`)                  |
| `/session idle`    | Inspeccionar/actualizar la auto-desactivación por inactividad (solo hilos vinculados enfocados) |
| `/session max-age` | Inspeccionar/actualizar el límite estricto (solo hilos vinculados enfocados)                    |

### Interruptores de configuración

- **Predeterminado global:** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Las **claves de anulación de canal y vinculación automática al generarse** son específicas del adaptador. Consulte [Canales compatibles con hilos](#thread-supporting-channels) más arriba.

Consulte [Referencia de configuración](/es/gateway/configuration-reference) y
[Comandos de barra](/es/tools/slash-commands) para obtener detalles del adaptador actual.

### Lista de permitidos

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  Lista de ids de agentes configurados que pueden ser objeto de destino mediante `agentId` explícito (`["*"]` permite cualquier objetivo configurado). Predeterminado: solo el agente solicitante. Si configura una lista y aún desea que el solicitante se genere a sí mismo con `agentId`, incluya el id del solicitante en la lista.
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  Lista blanca de agente objetivo predeterminado configurado que se utiliza cuando el agente solicitante no establece su propio `subagents.allowAgents`.
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  Bloquear llamadas a `sessions_spawn` que omitan `agentId` (fuerza la selección explícita de perfil). Anulación por agente: `agents.list[].subagents.requireAgentId`.
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  Tiempo de espera por llamada para los intentos de entrega de anuncios `agent` de la puerta de enlace. Los valores son milisegundos enteros positivos y se limitan al máximo seguro del temporizador de la plataforma. Los reintentos transitorios pueden hacer que la espera total del anuncio sea más larga que un tiempo de espera configurado.
</ParamField>

Si la sesión solicitante está en modo sandbox, `sessions_spawn` rechaza los objetivos
que se ejecutarían sin modo sandbox.

### Descubrimiento

Use `agents_list` para ver qué ids de agente están permitidos actualmente para
`sessions_spawn`. La respuesta incluye el modelo efectivo de cada agente listado
y metadatos de tiempo de ejecución integrados para que quienes llaman puedan distinguir OpenClaw, Codex
app-server y otros tiempos de ejecución nativos configurados.

Las entradas `allowAgents` deben apuntar a ids de agente configurados en `agents.list[]`.
`["*"]` significa cualquier agente objetivo configurado más el solicitante. Si se elimina una configuración de agente
pero su id permanece en `allowAgents`, `sessions_spawn` rechaza ese id
y `agents_list` lo omite. Ejecute `openclaw doctor --fix` para limpiar entradas
anticuadas de la lista de permitidos, o añada una entrada mínima `agents.list[]` cuando el objetivo deba
permanecer disponible para generación mientras hereda los valores predeterminados.

### Archivo automático

- Las sesiones de sub-agentes se archivan automáticamente después de `agents.defaults.subagents.archiveAfterMinutes` (predeterminado `60`).
- El archivado usa `sessions.delete` y renombra la transcripción a `*.deleted.<timestamp>` (misma carpeta).
- `cleanup: "delete"` archiva inmediatamente después del anuncio (aún mantiene la transcripción mediante cambio de nombre).
- El archivo automático es de mejor esfuerzo; los temporizadores pendientes se pierden si se reinicia la puerta de enlace.
- `runTimeoutSeconds` **no** archiva automáticamente; solo detiene la ejecución. La sesión permanece hasta el archivado automático.
- El archivado automático se aplica por igual a las sesiones de profundidad 1 y de profundidad 2.
- La limpieza del navegador es independiente de la limpieza del archivo: las pestañas/procesos del navegador rastreados se cierran con el mejor esfuerzo posible cuando finaliza la ejecución, incluso si se mantiene el registro de la transcripción/sesión.

## Sub-agentes anidados

De forma predeterminada, los sub-agentes no pueden generar sus propios sub-agentes
(`maxSpawnDepth: 1`). Establezca `maxSpawnDepth: 2` para habilitar un nivel de
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
  **Orientación operativa:** inicie el trabajo secundario una vez y espere los eventos de finalización en lugar de construir bucles de sondeo alrededor de `sessions_list`, `sessions_history`, `/subagents list`, o comandos de suspensión `exec`. `sessions_list` y `/subagents list` mantienen las relaciones de sesión secundaria enfocadas en el trabajo activo: los hijos activos permanecen adjuntos, los
  hijos finalizados se mantienen visibles durante una breve ventana reciente y los enlaces secundarios obsoletos solo de almacén se ignoran después de su ventana de vigencia. Esto evita que los metadatos antiguos de `spawnedBy` / `parentSessionKey` resuciten hijos fantasma después del reinicio. Si llega un evento de finalización secundario después de que ya ha enviado la respuesta final, el
  seguimiento correcto es el token silencioso exacto `NO_REPLY` / `no_reply`.
</Note>

### Política de herramientas por profundidad

- El rol y el alcance de control se escriben en los metadatos de la sesión en el momento de la creación. Esto evita que las claves de sesión planas o restauradas recuperen accidentalmente privilegios de orquestador.
- **Profundidad 1 (orquestador, cuando `maxSpawnDepth >= 2`):** obtiene `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` para que pueda generar hijos e inspeccionar su estado. Otras herramientas de sesión/sistema siguen denegadas.
- **Profundidad 1 (hoja, cuando `maxSpawnDepth == 1`):** sin herramientas de sesión (comportamiento predeterminado actual).
- **Profundidad 2 (trabajador hoja):** sin herramientas de sesión: `sessions_spawn` siempre se deniega en la profundidad 2. No puede generar más hijos.

### Límite de creación por agente

Cada sesión de agente (a cualquier profundidad) puede tener como máximo `maxChildrenPerAgent`
(predeterminado `5`) hijos activos a la vez. Esto evita una expansión incontrolada
desde un solo orquestador.

### Detención en cascada

Detener un orquestador de profundidad 1 detiene automáticamente a todos sus hijos
de profundidad 2:

- `/stop` en el chat principal detiene todos los agentes de profundidad 1 y se propaga a sus hijos de profundidad 2.

## Autenticación

La autenticación del sub-agente se resuelve por **id. de agente**, no por tipo de sesión:

- La clave de sesión del subagente es `agent:<agentId>:subagent:<uuid>`.
- El almacén de autenticación se carga desde el `agentDir` de ese agente.
- Los perfiles de autenticación del agente principal se fusionan como **alternativa** (fallback); los perfiles del agente anulan los perfiles principales en caso de conflicto.

La fusión es aditiva, por lo que los perfiles principales siempre están disponibles como
alternativas. Una autenticación totalmente aislada por agente aún no es compatible.

## Anuncio

Los subagentes informan a través de un paso de anuncio:

- El paso de anuncio se ejecuta dentro de la sesión del subagente (no la sesión del solicitante).
- Si el subagente responde exactamente `ANNOUNCE_SKIP`, no se publica nada.
- Si el último texto del asistente es el token silencioso exacto `NO_REPLY` / `no_reply`, la salida del anuncio se suprime incluso si existía un progreso visible anterior.

La entrega depende de la profundidad del solicitante:

- Las sesiones solicitantes de nivel superior utilizan una llamada de seguimiento `agent` con entrega externa (`deliver=true`).
- Las sesiones de subagente solicitantes anidadas reciben una inyección de seguimiento interna (`deliver=false`) para que el orquestador pueda sintetizar los resultados secundarios en la sesión.
- Si una sesión de subagente solicitante anidada ha desaparecido, OpenClaw recurre al solicitante de esa sesión cuando está disponible.

Para las sesiones solicitantes de nivel superior, la entrega directa en modo de completado primero resuelve cualquier ruta de conversación/hilo vinculada y anulación de enlace, y luego completa los campos faltantes de destino del canal desde la ruta almacenada de la sesión solicitante. Eso mantiene las finalizaciones en el chat/tema correcto incluso cuando el origen de la finalización solo identifica el canal.

La agregación de finalizaciones secundarias tiene el alcance de la ejecución del solicitante actual al crear hallazgos de finalización anidados, evitando que las salidas secundarias obsoletas de ejecuciones anteriores se filtren en el anuncio actual. Las respuestas de anuncio preservan el enrutamiento de hilo/tema cuando está disponible en los adaptadores de canal.

### Contexto de anuncio

El contexto de anuncio se normaliza a un bloque de evento interno estable:

| Campo                   | Fuente                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Fuente                  | `subagent` o `cron`                                                                                                              |
| Ids de sesión           | Clave/Id de sesión secundaria                                                                                                    |
| Tipo                    | Tipo de anuncio + etiqueta de tarea                                                                                              |
| Estado                  | Derivado del resultado en tiempo de ejecución (`success`, `error`, `timeout` o `unknown`) — **no** inferido del texto del modelo |
| Contenido del resultado | Último texto visible del asistente del secundario                                                                                |
| Seguimiento             | Instrucción que describe cuándo responder vs permanecer en silencio                                                              |

Las ejecuciones fallidas terminales informan el estado de falla sin reproducir el texto de respuesta capturado. La salida de herramienta/toolResult no se promueve al texto de resultado secundario.

### Línea de estadísticas

Los payloads de anuncio incluyen una línea de estadísticas al final (incluso cuando están envueltos):

- Tiempo de ejecución (ej. `runtime 5m12s`).
- Uso de tokens (entrada/salida/total).
- Coste estimado cuando la fijación de precios del modelo está configurada (`models.providers.*.models[].cost`).
- `sessionKey`, `sessionId` y la ruta de la transcripción para que el agente principal pueda recuperar el historial a través de `sessions_history` o inspeccionar el archivo en el disco.

Los metadatos internos están destinados solo a la orquestación; las respuestas visibles para el usuario
se deben reescribir con la voz normal del asistente.

### Por qué preferir `sessions_history`

`sessions_history` es la ruta de orquestación más segura:

- El recuerdo del asistente se normaliza primero: se eliminan las etiquetas de pensamiento; se elimina el andamiaje `<relevant-memories>` / `<relevant_memories>`; se eliminan los bloques de payload XML de llamadas a herramientas en texto plano (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`), incluyendo payloads truncados que nunca se cierran correctamente; se elimina el andamiaje de llamadas/resultados de herramientas degradadas y los marcadores de contexto histórico; se eliminan los tokens de control del modelo filtrados (`<|assistant|>`, otros `<|...|>` ASCII, `<｜...｜>` de ancho completo); se elimina el XML de llamadas a herramientas de MiniMax malformado.
- El texto tipo credencial/token se redacta.
- Los bloques largos se pueden truncar.
- Los historiales muy grandes pueden eliminar filas antiguas o reemplazar una fila demasiado grande con `[sessions_history omitted: message too large]`.
- La inspección de transcripciones en bruto en disco es el recurso de respaldo cuando necesitas la transcripción completa byte a byte.

## Política de herramientas

Los sub-agentes utilizan el mismo perfil y canalización de políticas de herramientas que el agente padre o
objetivo primero. Después de eso, OpenClaw aplica la capa de restricción de
sub-agente.

Sin ningún `tools.profile` restrictivo, los subagentes obtienen **todas las herramientas excepto la
herramienta de mensaje, las herramientas de sesión y las herramientas del sistema**:

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` sigue siendo una vista de recuperación delimitada y saneada aquí también — no es un volcado de transcripción sin procesar.

Cuando `maxSpawnDepth >= 2`, los sub-agentes orquestadores de profundidad-1 también reciben `sessions_spawn`, `subagents`, `sessions_list` y `sessions_history` para que puedan gestionar a sus elementos secundarios.

### Anular mediante configuración

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

`tools.subagents.tools.allow` es un filtro final de solo permiso. Puede reducir el conjunto de herramientas ya resuelto, pero no puede **volver a agregar** una herramienta eliminada por `tools.profile`. Por ejemplo, `tools.profile: "coding"` incluye `web_search`/`web_fetch` pero no la herramienta `browser`. Para permitir que los sub-agentes de perfil de codificación usen la automatización del navegador, agregue el navegador en la etapa de perfil:

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Use `agents.list[].tools.alsoAllow: ["browser"]` por agente cuando solo un agente deba tener la automatización del navegador.

## Concurrencia

Los sub-agentes utilizan un carril de cola dedicado dentro del proceso:

- **Nombre de carril:** `subagent`
- **Simultaneidad:** `agents.defaults.subagents.maxConcurrent` (por defecto `8`)

## Vitalidad y recuperación

OpenClaw no trata la ausencia de `endedAt` como una prueba permanente de que un sub-agente sigue vivo. Las ejecuciones no finalizadas más antiguas que la ventana de ejecución obsoleta dejan de contarse como activas/pendientes en `/subagents list`, resúmenes de estado, control de finalización de descendientes y comprobaciones de simultaneidad por sesión.

Después de un reinicio de la puerta de enlace, se eliminan las ejecuciones restauradas no finalizadas obsoletas a menos que su sesión secundaria esté marcada como `abortedLastRun: true`. Esas sesiones secundarias abortadas por reinicio siguen siendo recuperables a través del flujo de recuperación de huérfanos del sub-agente, que envía un mensaje de reanudación sintético antes de borrar el marcador de aborto.

La recuperación automática por reinicio está limitada por sesión secundaria. Si el mismo elemento secundario de sub-agente es aceptado para la recuperación de huérfanos repetidamente dentro de la ventana de reinyección rápida, OpenClaw mantiene una lápida de recuperación en esa sesión y deja de reanudarla automáticamente en reinicios posteriores. Ejecute `openclaw tasks maintenance --apply` para conciliar el registro de tareas, o `openclaw doctor --fix` para borrar las marcas de recuperación abortadas obsoletas en las sesiones con lápida.

<Note>
  Si la generación de un subagente falla con Gateway `PAIRING_REQUIRED` / `scope-upgrade`, verifique el llamador RPC antes de editar el estado de emparejamiento. La coordinación interna `sessions_spawn` debe conectarse como `client.id: "gateway-client"` con `client.mode: "backend"` a través de autenticación directa de token compartido/contraseña de loopback; esa ruta no depende de la línea base
  del ámbito de dispositivo emparejado de la CLI. Los llamadores remotos, `deviceIdentity` explícito, rutas explícitas de token de dispositivo y clientes de navegador/nodo aún necesitan la aprobación normal del dispositivo para actualizaciones de ámbito.
</Note>

## Detención

- Enviar `/stop` en el chat solicitante aborta la sesión solicitante y detiene cualquier ejecución activa de subagente generada desde ella, extendiéndose en cascada a los hijos anidados.

## Limitaciones

- El anuncio del subagente es **best-effort** (mejor esfuerzo posible). Si el gateway se reinicia, el trabajo pendiente de "anunciar de vuelta" se pierde.
- Los subagentes aún comparten los mismos recursos del proceso de puerta de enlace; trate `maxConcurrent` como una válvula de seguridad.
- `sessions_spawn` siempre es sin bloqueo: devuelve `{ status: "accepted", runId, childSessionKey }` inmediatamente.
- El contexto del subagente solo inyecta `AGENTS.md` y `TOOLS.md` (sin `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md` o `BOOTSTRAP.md`). Los subagentes nativos de Codex siguen el mismo límite: `TOOLS.md` se mantiene en las instrucciones del hilo de Codex heredadas, mientras que los archivos de persona, identidad y de usuario exclusivos del padre se inyectan como instrucciones de colaboración con ámbito de turno para que los hijos no los clonen.
- La profundidad máxima de anidamiento es 5 (rango `maxSpawnDepth`: 1–5). Se recomienda la profundidad 2 para la mayoría de los casos de uso.
- `maxChildrenPerAgent` limita los hijos activos por sesión (predeterminado `5`, rango `1–20`).

## Relacionado

- [Agentes ACP](/es/tools/acp-agents)
- [Envío de agente](/es/tools/agent-send)
- [Tareas en segundo plano](/es/automation/tasks)
- [Herramientas de sandbox multiagente](/es/tools/multi-agent-sandbox-tools)
