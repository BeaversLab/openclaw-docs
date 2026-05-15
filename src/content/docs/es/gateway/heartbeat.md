---
summary: "Mensajes de sondeo de Heartbeat y reglas de notificación"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Latido"
---

<Note>**¿Latido vs cron?** Consulte [Automatización y tareas](/es/automation) para obtener orientación sobre cuándo usar cada uno.</Note>

Latido ejecuta **turnos periódicos del agente** en la sesión principal para que el modelo pueda resaltar cualquier cosa que requiera atención sin saturarlo.

Latido es un turno de sesión principal programado: **no** crea registros de [tarea en segundo plano](/es/automation/tasks). Los registros de tareas son para trabajos separados (ejecuciones de ACP, subagentes, trabajos cron aislados).

Solución de problemas: [Tareas programadas](/es/automation/cron-jobs#troubleshooting)

## Inicio rápido (principiante)

<Steps>
  <Step title="Elija una cadencia">
    Deje los latidos habilitados (el valor predeterminado es `30m`, o `1h` para la autenticación OAuth/token de Anthropic, incluido el reuso de Claude CLI) o configure su propia cadencia.
  </Step>
  <Step title="Añadir HEARTBEAT.md (opcional)">
    Cree una pequeña `HEARTBEAT.md` lista de verificación o un bloque `tasks:` en el espacio de trabajo del agente.
  </Step>
  <Step title="Decidir a dónde deben ir los mensajes de latido">
    `target: "none"` es el valor predeterminado; configure `target: "last"` para enviar al último contacto.
  </Step>
  <Step title="Ajustes opcionales">
    - Habilite la entrega de razonamiento del latido para transparencia.
    - Use un contexto de arranque ligero si las ejecuciones de latido solo necesitan `HEARTBEAT.md`.
    - Habilite sesiones aisladas para evitar enviar el historial completo de la conversación en cada latido.
    - Restrinja los latidos a horas activas (hora local).

  </Step>
</Steps>

Configuración de ejemplo:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: only inject HEARTBEAT.md from bootstrap files
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        skipWhenBusy: true, // optional: also defer when subagent or nested lanes are busy
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## Valores predeterminados

- Intervalo: `30m` (o `1h` cuando se detecta la autenticación OAuth/token de Anthropic como modo de autenticación, incluido el reuso de Claude CLI). Configure `agents.defaults.heartbeat.every` o por agente `agents.list[].heartbeat.every`; use `0m` para deshabilitar.
- Cuerpo del mensaje (configurable mediante `agents.defaults.heartbeat.prompt`): `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- El mensaje de latido (heartbeat) se envía **verbatim** como mensaje de usuario. El mensaje del sistema incluye una sección "Heartbeat" solo cuando los latidos están habilitados para el agente predeterminado, y la ejecución se marca internamente.
- Cuando los latidos se deshabilitan con `0m`, las ejecuciones normales también omiten `HEARTBEAT.md` del contexto de arranque para que el modelo no vea las instrucciones exclusivas del latido.
- Las horas activas (`heartbeat.activeHours`) se verifican en la zona horaria configurada. Fuera de la ventana, los latidos se omiten hasta el siguiente tick dentro de la ventana.
- Los latidos se posponen automáticamente mientras el trabajo de cron está activo o en cola. Establezca `heartbeat.skipWhenBusy: true` para posponer también en carriles额外 ocupados (trabajo de subagente o comandos anidados); esto es útil para Ollama local y otros hosts con un solo runtime limitados.

## Para qué sirve el mensaje de heartbeat

El mensaje predeterminado es intencionalmente amplio:

- **Tareas en segundo plano**: "Considerar tareas pendientes" incita al agente a revisar los seguimientos (bandeja de entrada, calendario, recordatorios, trabajo en cola) y resaltar cualquier cosa urgente.
- **Registro humano**: "Revisa a tu humano a veces durante el día" incita a un mensaje ocasional ligero de "¿necesitas algo?", pero evita el spam nocturno al usar tu zona horaria local configurada (ver [Timezone](/es/concepts/timezone)).

El latido puede reaccionar a las [tareas en segundo plano](/es/automation/tasks) completadas, pero una ejecución de latido en sí misma no crea un registro de tarea.

Si desea que un latido haga algo muy específico (por ejemplo, "verificar estadísticas de PubSub de Gmail" o "verificar el estado de la puerta de enlace"), establezca `agents.defaults.heartbeat.prompt` (o `agents.list[].heartbeat.prompt`) en un cuerpo personalizado (enviado literalmente).

## Contrato de respuesta

- Si nada necesita atención, responda con **`HEARTBEAT_OK`**.
- Las ejecuciones de latido con capacidades de herramientas pueden, en su lugar, llamar a `heartbeat_respond` con `notify: false` para no tener una actualización visible, o `notify: true` más `notificationText` para una alerta. Cuando está presente, la respuesta estructurada de la herramienta tiene prioridad sobre el texto alternativo.
- Durante las ejecuciones de latido, OpenClaw trata `HEARTBEAT_OK` como un ack cuando aparece al **principio o al final** de la respuesta. El token se elimina y la respuesta se descarta si el contenido restante es **≤ `ackMaxChars`** (predeterminado: 300).
- Si `HEARTBEAT_OK` aparece en el **medio** de una respuesta, no se trata de forma especial.
- Para las alertas, **no** incluya `HEARTBEAT_OK`; devuelva solo el texto de la alerta.

Fuera de los latidos, los `HEARTBEAT_OK` extraviados al principio/final de un mensaje se eliminan y registran; un mensaje que es solo `HEARTBEAT_OK` se descarta.

## Configuración

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for subagent/nested lanes
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "imessage")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### Alcance y precedencia

- `agents.defaults.heartbeat` establece el comportamiento global del heartbeat.
- `agents.list[].heartbeat` se combina encima; si algún agente tiene un bloque `heartbeat`, **solo esos agentes** ejecutan heartbeats.
- `channels.defaults.heartbeat` establece los valores predeterminados de visibilidad para todos los canales.
- `channels.<channel>.heartbeat` anula los valores predeterminados del canal.
- `channels.<channel>.accounts.<id>.heartbeat` (canales multicuenta) anula la configuración por canal.

### Latidos por agente

Si alguna entrada `agents.list[]` incluye un bloque `heartbeat`, **solo esos agentes** ejecutan heartbeats. El bloque por agente se combina encima de `agents.defaults.heartbeat` (por lo que puedes establecer valores predeterminados compartidos una vez y anularlos por agente).

Ejemplo: dos agentes, solo el segundo agente ejecuta latidos.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### Ejemplo de horas activas

Restrinja los latidos al horario laboral en una zona horaria específica:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

Fuera de esta ventana (antes de las 9 a.m. o después de las 10 p.m. hora del Este), se omiten los latidos. El siguiente tick programado dentro de la ventana se ejecutará con normalidad.

### Configuración 24/7

Si desea que los latidos se ejecuten todo el día, use uno de estos patrones:

- Omite `activeHours` por completo (sin restricción de ventana de tiempo; este es el comportamiento predeterminado).
- Establece una ventana de día completo: `activeHours: { start: "00:00", end: "24:00" }`.

<Warning>No establezcas la misma hora para `start` y `end` (por ejemplo, `08:00` a `08:00`). Esto se trata como una ventana de ancho cero, por lo que los heartbeats siempre se omiten.</Warning>

### Ejemplo multicuenta

Usa `accountId` para apuntar a una cuenta específica en canales multicuenta como Telegram:

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### Notas de campo

<ParamField path="every" type="string">
  Intervalo de Heartbeat (cadena de duración; unidad predeterminada = minutos).
</ParamField>
<ParamField path="model" type="string">
  Sobrescritura opcional del modelo para ejecuciones de heartbeat (`provider/model`).
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  Cuando está habilitado, también entrega el mensaje separado `Reasoning:` cuando está disponible (misma forma que `/reasoning on`).
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  Cuando es verdadero, las ejecuciones de heartbeat usan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  Cuando es verdadero, cada heartbeat se ejecuta en una sesión nueva sin historial de conversación previo. Usa el mismo patrón de aislamiento que el cron `sessionTarget: "isolated"`. Reduce drásticamente el costo de tokens por heartbeat. Combine con `lightContext: true` para obtener el máximo ahorro. El enrutamiento de entrega todavía usa el contexto de la sesión principal.
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  Cuando es verdadero, las ejecuciones de heartbeat se difieren en carriles额外的mente ocupados: trabajo de subagente o comandos anidados. Los carriles de Cron siempre difieren los heartbeats, incluso sin esta bandera, por lo que los hosts con modelos locales no ejecutan prompts de cron y heartbeat al mismo tiempo.
</ParamField>
<ParamField path="session" type="string">
  Clave de sesión opcional para ejecuciones de heartbeat.

- `main` (predeterminado): sesión principal del agente.
- Clave de sesión explícita (copiar de `openclaw sessions --json` o de la [CLI de sesiones](/es/cli/sessions)).
- Formatos de clave de sesión: consulte [Sesiones](/es/concepts/session) y [Grupos](/es/channels/groups).

</ParamField>
<ParamField path="target" type="string">
- `last`: enviar al último canal externo utilizado.
- canal explícito: cualquier ID de canal o complemento configurado, por ejemplo `discord`, `matrix`, `telegram` o `whatsapp`.
- `none` (predeterminado): ejecuta el heartbeat pero **no entrega** externamente.

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  Controla el comportamiento de entrega directa/DM. `allow`: permite la entrega directa/DM del heartbeat. `block`: suprime la entrega directa/DM (`reason=dm-blocked`).

</ParamField>
<ParamField path="to" type="string">
  Anulación opcional del destinatario (ID específico del canal, p. ej., E.164 para WhatsApp o un ID de chat de Telegram). Para temas/hilos de Telegram, use `<chatId>:topic:<messageThreadId>`.

</ParamField>
<ParamField path="accountId" type="string">
  ID de cuenta opcional para canales multi-cuenta. Cuando es `target: "last"`, el ID de cuenta se aplica al último canal resuelto si soporta cuentas; de lo contrario se ignora. Si el ID de cuenta no coincide con una cuenta configurada para el canal resuelto, la entrega se omite.

</ParamField>
<ParamField path="prompt" type="string">
  Anula el cuerpo del prompt predeterminado (no se fusiona).

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  Máximo de caracteres permitidos después de `HEARTBEAT_OK` antes de la entrega.

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  Cuando es verdadero, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones del heartbeat.

</ParamField>
<ParamField path="activeHours" type="object">
  Restringe las ejecuciones de heartbeat a una ventana de tiempo. Objeto con `start` (HH:MM, inclusivo; use `00:00` para el inicio del día), `end` (HH:MM exclusivo; `24:00` permitido para el final del día) y `timezone` opcional.

- Omitido o `"user"`: usa su `agents.defaults.userTimezone` si está configurado, de lo contrario, recurre a la zona horaria del sistema host.
- `"local"`: siempre usa la zona horaria del sistema host.
- Cualquier identificador IANA (por ejemplo, `America/New_York`): se usa directamente; si no es válido, recurre al comportamiento `"user"` anterior.
- `start` y `end` no deben ser iguales para una ventana activa; los valores iguales se tratan como de ancho cero (siempre fuera de la ventana).
- Fuera de la ventana activa, los heartbeats se omiten hasta el siguiente tick dentro de la ventana.

</ParamField>

## Comportamiento de entrega

<AccordionGroup>
  <Accordion title="Sesión y enrutamiento de destino">
    - Los latidos se ejecutan en la sesión principal del agente de manera predeterminada (`agent:<id>:<mainKey>`), o `global` cuando `session.scope = "global"`. Establezca `session` para anular a una sesión de canal específica (Discord/WhatsApp/etc.).
    - `session` solo afecta el contexto de ejecución; la entrega se controla mediante `target` y `to`.
    - Para enviar a un canal/destinatario específico, configure `target` + `to`. Con `target: "last"`, la entrega utiliza el último canal externo para esa sesión.
    - Las entregas de latidos permiten destinos directos/DM de manera predeterminada. Establezca `directPolicy: "block"` para suprimir los envíos de destino directo mientras aún se ejecuta el turno de latido.
    - Si la cola principal, el carril de la sesión de destino, el carril cron o un trabajo cron activo están ocupados, el latido se omite y se reintentará más tarde.
    - Si `skipWhenBusy: true`, los carriles de subagente y anidados también difieren las ejecuciones de latido.
    - Si `target` se resuelve sin un destino externo, la ejecución aún ocurre pero no se envía ningún mensaje saliente.

  </Accordion>
  <Accordion title="Visibilidad y comportamiento de omisión">
    - Si `showOk`, `showAlerts` y `useIndicator` están todos deshabilitados, la ejecución se omite de inmediato como `reason=alerts-disabled`.
    - Si solo la entrega de alertas está deshabilitada, OpenClaw aún puede ejecutar el latido, actualizar las marcas de tiempo de las tareas vencidas, restaurar la marca de tiempo de inactividad de la sesión y suprimir la carga útil de alerta externa.
    - Si el destino de latido resuelto admite "escribiendo...", OpenClaw muestra el estado de escribiendo mientras la ejecución del latido está activa. Esto utiliza el mismo destino al que el latido enviaría el resultado del chat y se deshabilita mediante `typingMode: "never"`.

  </Accordion>
  <Accordion title="Ciclo de vida de la sesión y auditoría">
    - Las respuestas solo de Heartbeat **no** mantienen la sesión activa. Los metadatos de Heartbeat pueden actualizar la fila de la sesión, pero la expiración por inactividad usa `lastInteractionAt` del último mensaje real de usuario/canal, y la expiración diaria usa `sessionStartedAt`.
    - El historial de la interfaz de control y de WebChat oculta las solicitudes de Heartbeat y los reconocimientos que son solo OK. La transcripción subyacente de la sesión aún puede contener esos turnos para auditoría/reproducción.
    - Las [tareas en segundo plano](/es/automation/tasks) desacopladas pueden poner en cola un evento del sistema y despertar el Heartbeat cuando la sesión principal debería notar algo rápidamente. Ese despertar no hace que el Heartbeat ejecute una tarea en segundo plano.

  </Accordion>
</AccordionGroup>

## Controles de visibilidad

De forma predeterminada, los reconocimientos `HEARTBEAT_OK` se suprimen mientras se entrega el contenido de la alerta. Puede ajustar esto por canal o por cuenta:

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # Hide HEARTBEAT_OK (default)
      showAlerts: true # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

Precedencia: por cuenta → por canal → valores predeterminados del canal → valores predeterminados integrados.

### Qué hace cada indicador

- `showOk`: envía un reconocimiento `HEARTBEAT_OK` cuando el modelo devuelve una respuesta que es solo OK.
- `showAlerts`: envía el contenido de la alerta cuando el modelo devuelve una respuesta que no es OK.
- `useIndicator`: emite eventos de indicador para las superficies de estado de la interfaz de usuario.

Si **los tres** son falsos, OpenClaw omite la ejecución del Heartbeat por completo (sin llamada al modelo).

### Ejemplos por canal frente a por cuenta

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # all Slack accounts
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suppress alerts for the ops account only
  telegram:
    heartbeat:
      showOk: true
```

### Patrones comunes

| Objetivo                                                           | Configuración                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Comportamiento predeterminado (OKs silenciosos, alertas activadas) | _(no se necesita configuración)_                                                         |
| Completamente silencioso (sin mensajes, sin indicador)             | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Solo indicador (sin mensajes)                                      | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OKs solo en un canal                                               | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (opcional)

Si existe un archivo `HEARTBEAT.md` en el espacio de trabajo, el mensaje predeterminado indica al agente que lo lea. Piénselo como su "lista de verificación de heartbeat": pequeño, estable y seguro de incluir cada 30 minutos.

En ejecuciones normales, `HEARTBEAT.md` solo se inyecta cuando la guía de heartbeat está habilitada para el agente predeterminado. Deshabilitar el cadence del heartbeat con `0m` o establecer `includeSystemPromptSection: false` lo omite del contexto de arranque normal.

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del heartbeat para ahorrar llamadas a la API. Esa omisión se reporta como `reason=empty-heartbeat-file`. Si falta el archivo, el heartbeat aún se ejecuta y el modelo decide qué hacer.

Mantenlo pequeño (una lista de verificación corta o recordatorios) para evitar la hinchazón del prompt.

Ejemplo de `HEARTBEAT.md`:

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### Bloques `tasks:`

`HEARTBEAT.md` también admite un pequeño bloque estructurado `tasks:` para comprobaciones basadas en intervalos dentro del propio heartbeat.

Ejemplo:

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

<AccordionGroup>
  <Accordion title="Comportamiento">
    - OpenClaw analiza el bloque `tasks:` y verifica cada tarea contra su propio `interval`.
    - Solo las tareas **vencidas** se incluyen en el prompt del heartbeat para ese tick.
    - Si no hay tareas vencidas, el heartbeat se omite por completo (`reason=no-tasks-due`) para evitar una llamada al modelo desperdiciada.
    - El contenido que no es de tarea en `HEARTBEAT.md` se conserva y se agrega como contexto adicional después de la lista de tareas vencidas.
    - Las marcas de tiempo de la última ejecución de la tarea se almacenan en el estado de la sesión (`heartbeatTaskState`), por lo que los intervalos sobreviven a los reinicios normales.
    - Las marcas de tiempo de las tareas solo avanzan después de que una ejecución del heartbeat completa su ruta de respuesta normal. Las ejecuciones omitidas de `empty-heartbeat-file` / `no-tasks-due` no marcan las tareas como completadas.

  </Accordion>
</AccordionGroup>

El modo de tarea es útil cuando quieres que un archivo de heartbeat contenga varias comprobaciones periódicas sin pagar por todas ellas en cada tick.

### ¿Puede el agente actualizar HEARTBEAT.md?

Sí, si se lo pides.

`HEARTBEAT.md` es solo un archivo normal en el espacio de trabajo del agente, así que puedes decirle al agente (en un chat normal) algo como:

- "Actualiza `HEARTBEAT.md` para añadir una verificación diaria del calendario."
- "Reescribe `HEARTBEAT.md` para que sea más breve y se centre en el seguimiento de la bandeja de entrada."

Si deseas que esto ocurra de manera proactiva, también puedes incluir una línea explícita en tu prompt de latido (heartbeat) como: "Si la lista de verificación se vuelve obsoleta, actualiza HEARTBEAT.md con una mejor."

<Warning>No pongas secretos (claves API, números de teléfono, tokens privados) en `HEARTBEAT.md` — esto se convierte en parte del contexto del prompt.</Warning>

## Activación manual (a demanda)

Puedes poner en cola un evento del sistema y activar un latido (heartbeat) inmediato con:

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si varios agentes tienen `heartbeat` configurado, una activación manual ejecuta cada uno de esos latidos de agente inmediatamente.

Usa `--mode next-heartbeat` para esperar al siguiente tic programado.

## Entrega de razonamiento (opcional)

De forma predeterminada, los latidos (heartbeats) entregan solo la carga útil de "respuesta" final.

Si deseas transparencia, habilita:

- `agents.defaults.heartbeat.includeReasoning: true`

Cuando está habilitado, los latidos también entregarán un mensaje separado con el prefijo `Reasoning:` (misma forma que `/reasoning on`). Esto puede ser útil cuando el agente gestiona múltiples sesiones/códices y quieres ver por qué decidió enviarte una notificación — pero también puede filtrar más detalles internos de los deseables. Es preferible mantenerlo desactivado en chats grupales.

## Conciencia de costes

Los latidos (heartbeats) ejecutan turnos completos de agente. Intervalos más cortos consumen más tokens. Para reducir el coste:

- Usa `isolatedSession: true` para evitar enviar el historial completo de la conversación (de ~100K tokens a ~2-5K por ejecución).
- Usa `lightContext: true` para limitar los archivos de inicialización (bootstrap) solo a `HEARTBEAT.md`.
- Establece un `model` más económico (p. ej. `ollama/llama3.2:1b`).
- Mantén `HEARTBEAT.md` pequeño.
- Usa `target: "none"` si solo quieres actualizaciones del estado interno.

## Desbordamiento de contexto después del latido

Si un latido dejó anteriormente una sesión existente en un modelo local más pequeño, por ejemplo un modelo Ollama con una ventana de 32k, y el siguiente turno de la sesión principal informa de un desbordamiento de contexto, restablece el modelo de tiempo de ejecución de la sesión al modelo principal configurado. El mensaje de restablecimiento de OpenClaw indica esto cuando el último modelo de tiempo de ejecución coincide con el `heartbeat.model` configurado.

Los latidos actuales conservan el modelo de tiempo de ejecución existente de la sesión compartida después de que se completa la ejecución. Aún puedes usar `isolatedSession: true` para ejecutar latidos en una sesión nueva, combinarlo con `lightContext: true` para el mensaje más pequeño o elegir un modelo de latido con una ventana de contexto lo suficientemente grande para la sesión compartida.

## Relacionado

- [Automatización y tareas](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en segundo plano](/es/automation/tasks) — cómo se realiza el seguimiento del trabajo desacoplado
- [Zona horaria](/es/concepts/timezone) — cómo la zona horaria afecta la programación de los latidos
- [Solución de problemas](/es/automation/cron-jobs#troubleshooting) — depuración de problemas de automatización
