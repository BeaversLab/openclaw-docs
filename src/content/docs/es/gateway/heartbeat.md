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

Latido es un turno programado de la sesión principal: **no** crea registros de [tarea en segundo plano](/es/automation/tasks). Los registros de tareas son para trabajos desacoplados (ejecuciones de ACP, subagentes, trabajos cron aislados).

Solución de problemas: [Tareas programadas](/es/automation/cron-jobs#troubleshooting)

## Inicio rápido (principiante)

<Steps>
  <Step title="Elija una cadencia">Deje los latidos habilitados (el valor predeterminado es `30m`, o `1h` para la autenticación por OAuth/token de Anthropic, incluido el reuso de Claude CLI) o configure su propia cadencia.</Step>
  <Step title="Añadir HEARTBEAT.md (opcional)">Cree una pequeña lista de verificación `HEARTBEAT.md` o un bloque `tasks:` en el espacio de trabajo del agente.</Step>
  <Step title="Decidir a dónde deben ir los mensajes de latido">`target: "none"` es el valor predeterminado; configure `target: "last"` para enviar al último contacto.</Step>
  <Step title="Ajustes opcionales">- Habilite la entrega del razonamiento del latido para mayor transparencia. - Use un contexto de arranque ligero si las ejecuciones de latido solo necesitan `HEARTBEAT.md`. - Habilite sesiones aisladas para evitar enviar el historial completo de la conversación en cada latido. - Restrinja los latidos al horario activo (hora local).</Step>
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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## Valores predeterminados

- Intervalo: `30m` (o `1h` cuando la autenticación por OAuth/token de Anthropic es el modo de autenticación detectado, incluido el reuso de Claude CLI). Configure `agents.defaults.heartbeat.every` o `agents.list[].heartbeat.every` por agente; use `0m` para deshabilitar.
- Cuerpo del aviso (configurable mediante `agents.defaults.heartbeat.prompt`): `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- El mensaje de latido (heartbeat) se envía **verbatim** como mensaje de usuario. El mensaje del sistema incluye una sección "Heartbeat" solo cuando los latidos están habilitados para el agente predeterminado, y la ejecución se marca internamente.
- Cuando los latidos están deshabilitados con `0m`, las ejecuciones normales también omiten `HEARTBEAT.md` del contexto de inicialización para que el modelo no vea instrucciones exclusivas de latido.
- Las horas activas (`heartbeat.activeHours`) se verifican en la zona horaria configurada. Fuera de la ventana, los latidos se omiten hasta el siguiente ciclo dentro de la ventana.

## Para qué sirve el mensaje de latido

El mensaje predeterminado es intencionalmente amplio:

- **Tareas en segundo plano**: "Considerar tareas pendientes" impulsa al agente a revisar los seguimientos (bandeja de entrada, calendario, recordatorios, trabajo en cola) y resaltar cualquier cosa urgente.
- **Registro humano**: "Revisa a tu humano ocasionalmente durante el día" impulsa un mensaje ocasional ligero de "¿necesitas algo?", pero evita el spam nocturno al usar tu zona horaria local configurada (ver [Timezone](/es/concepts/timezone)).

El latido puede reaccionar a [tareas en segundo plano](/es/automation/tasks) completadas, pero una ejecución de latido en sí no crea un registro de tarea.

Si deseas que un latido haga algo muy específico (por ejemplo, "verificar estadísticas de Gmail PubSub" o "verificar el estado de la puerta de enlace"), establece `agents.defaults.heartbeat.prompt` (o `agents.list[].heartbeat.prompt`) en un cuerpo personalizado (enviado verbatim).

## Contrato de respuesta

- Si nada requiere atención, responde con **`HEARTBEAT_OK`**.
- Durante las ejecuciones de latido, OpenClaw trata `HEARTBEAT_OK` como un reconocimiento cuando aparece al **principio o al final** de la respuesta. El token se elimina y la respuesta se descarta si el contenido restante es **≤ `ackMaxChars`** (predeterminado: 300).
- Si `HEARTBEAT_OK` aparece en el **medio** de una respuesta, no se trata de forma especial.
- Para las alertas, **no** incluyas `HEARTBEAT_OK`; devuelve solo el texto de la alerta.

Fuera de los latidos, los `HEARTBEAT_OK` errantes al principio/final de un mensaje se eliminan y registran; un mensaje que es solo `HEARTBEAT_OK` se descarta.

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
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "bluebubbles")
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

- `agents.defaults.heartbeat` establece el comportamiento global del latido.
- `agents.list[].heartbeat` se fusiona encima; si algún agente tiene un bloque `heartbeat`, **solo esos agentes** ejecutan heartbeats.
- `channels.defaults.heartbeat` establece los valores predeterminados de visibilidad para todos los canales.
- `channels.<channel>.heartbeat` anula los valores predeterminados del canal.
- `channels.<channel>.accounts.<id>.heartbeat` (canales multicuenta) anula la configuración por canal.

### Latidos por agente

Si alguna entrada `agents.list[]` incluye un bloque `heartbeat`, **solo esos agentes** ejecutan heartbeats. El bloque por agente se fusiona encima de `agents.defaults.heartbeat` (así puedes establecer valores predeterminados compartidos una vez y anularlos por agente).

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

Fuera de este ventana (antes de las 9 a.m. o después de las 10 p.m. hora del Este), los latidos se omiten. El siguiente tic programado dentro de la ventana se ejecutará normalmente.

### Configuración 24/7

Si desea que los latidos se ejecuten todo el día, use uno de estos patrones:

- Omite `activeHours` por completo (sin restricción de ventana de tiempo; este es el comportamiento predeterminado).
- Establece una ventana de día completo: `activeHours: { start: "00:00", end: "24:00" }`.

<Warning>No establezcas la misma hora de `start` y `end` (por ejemplo `08:00` a `08:00`). Eso se trata como una ventana de ancho cero, por lo que los heartbeats siempre se omiten.</Warning>

### Ejemplo multicuenta

Use `accountId` para apuntar a una cuenta específica en canales multicuenta como Telegram:

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
  Intervalo de latido (cadena de duración; unidad predeterminada = minutos).
</ParamField>
<ParamField path="model" type="string">
  Sobrescritura opcional del modelo para ejecuciones de latido (`provider/model`).
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  Cuando está habilitado, también entrega el mensaje separado `Reasoning:` cuando esté disponible (misma forma que `/reasoning on`).
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  Si es verdadero, las ejecuciones de latido utilizan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  Si es verdadero, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Utiliza el mismo patrón de aislamiento que el cron `sessionTarget: "isolated"`. Reduce drásticamente el costo de tokens por latido. Combine con `lightContext: true` para obtener el máximo ahorro. El enrutamiento de entrega todavía utiliza el contexto de la sesión principal.
</ParamField>
<ParamField path="session" type="string">
  Clave de sesión opcional para ejecuciones de latido.

- `main` (predeterminado): sesión principal del agente.
- Clave de sesión explícita (copiada de `openclaw sessions --json` o de la [CLI de sesiones](/es/cli/sessions)).
- Formatos de clave de sesión: consulte [Sesiones](/es/concepts/session) y [Grupos](/es/channels/groups).
  </ParamField>
<ParamField path="target" type="string">
- `last`: entregar al último canal externo utilizado.
- canal explícito: cualquier canal configurado o id de complemento, por ejemplo `discord`, `matrix`, `telegram`, o `whatsapp`.
- `none` (predeterminado): ejecuta el latido pero **no lo entrega** externamente.

  </ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
Controla el comportamiento de entrega directa/DM. `allow`: permite la entrega de latido directa/DM. `block`: suprime la entrega directa/DM (`reason=dm-blocked`).
</ParamField>
<ParamField path="to" type="string">
Sobrescripción opcional del destinatario (id específico del canal, p. ej., E.164 para WhatsApp o un id de chat de Telegram). Para temas/hilos de Telegram, use `<chatId>:topic:<messageThreadId>`.
</ParamField>
<ParamField path="accountId" type="string">
Id de cuenta opcional para canales multicuenta. Cuando `target: "last"`, el id de cuenta se aplica al último canal resuelto si admite cuentas; de lo contrario, se ignora. Si el id de cuenta no coincide con una cuenta configurada para el canal resuelto, se omite la entrega.
</ParamField>
<ParamField path="prompt" type="string">
Sobrescribe el cuerpo del mensaje predeterminado (no se fusiona).
</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
Máximo de caracteres permitidos después de `HEARTBEAT_OK` antes de la entrega.
</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
Cuando es verdadero, suprime las cargas útiles de advertencia de error de herramienta durante las ejecuciones del latido.
</ParamField>
<ParamField path="activeHours" type="object">
Restringe las ejecuciones del latido a una ventana de tiempo. Objeto con `start` (HH:MM, inclusivo; use `00:00` para el inicio del día), `end` (HH:MM exclusivo; `24:00` permitido para el final del día) y `timezone` opcional.

- Omitido o `"user"`: usa su `agents.defaults.userTimezone` si está configurado; de lo contrario, recurre a la zona horaria del sistema anfitrión.
- `"local"`: siempre usa la zona horaria del sistema anfitrión.
- Cualquier identificador IANA (p. ej. `America/New_York`): se usa directamente; si no es válido, vuelve al comportamiento `"user"` anterior.
- `start` y `end` no deben ser iguales para una ventana activa; los valores iguales se tratan como de ancho cero (siempre fuera de la ventana).
- Fuera de la ventana activa, los latidos se omiten hasta el siguiente tic dentro de la ventana.
  </ParamField>

## Comportamiento de entrega

<AccordionGroup>
  <Accordion title="Sesión y enrutamiento de destino">
    - Los latidos se ejecutan en la sesión principal del agente de forma predeterminada (`agent:<id>:<mainKey>`), o `global` cuando `session.scope = "global"`. Configure `session` para anular y usar una sesión de canal específica (Discord/WhatsApp/etc.).
    - `session` solo afecta el contexto de ejecución; la entrega se controla mediante `target` y `to`.
    - Para entregar a un canal/destinatario específico, configure `target` + `to`. Con `target: "last"`, la entrega utiliza el último canal externo para esa sesión.
    - Las entregas de latidos permiten destinos directos/DM de forma predeterminada. Configure `directPolicy: "block"` para suprimir los envíos a destinos directos mientras aún se ejecuta el turno de latido.
    - Si la cola principal está ocupada, el latido se omite y se reintentará más tarde.
    - Si `target` no resuelve a ningún destino externo, la ejecución aún ocurre pero no se envía ningún mensaje saliente.
  </Accordion>
  <Accordion title="Visibilidad y comportamiento de omisión">
    - Si `showOk`, `showAlerts` y `useIndicator` están todos deshabilitados, la ejecución se omite de inmediato como `reason=alerts-disabled`.
    - Si solo la entrega de alertas está deshabilitada, OpenClaw aún puede ejecutar el heartbeat, actualizar las marcas de tiempo de las tareas pendientes, restaurar la marca de tiempo de inactividad de la sesión y suprimir la carga útil de alerta externa.
    - Si el objetivo del heartbeat resuelto admite escribir, OpenClaw muestra que está escribiendo mientras la ejecución del heartbeat está activa. Esto utiliza el mismo objetivo al que el heartbeat enviaría el resultado del chat y está deshabilitado por `typingMode: "never"`.
  </Accordion>
  <Accordion title="Ciclo de vida de la sesión y auditoría">
    - Las respuestas solo de heartbeat **no** mantienen la sesión activa. Los metadatos del heartbeat pueden actualizar la fila de la sesión, pero la expiración por inactividad usa `lastInteractionAt` del último mensaje real de usuario/canal, y la expiración diaria usa `sessionStartedAt`.
    - El historial de la interfaz de usuario de control y WebChat oculta los indicaciones del heartbeat y los reconocimientos que solo son OK. La transcripción subyacente de la sesión aún puede contener esos turnos para auditoría/reproducción.
    - Las [tareas en segundo plano]/en/automation/tasks desacopladas pueden poner en cola un evento del sistema y activar el heartbeat cuando la sesión principal debería notar algo rápidamente. Esa activación no hace que el heartbeat se ejecute como una tarea en segundo plano.
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

- `showOk`: envía un reconocimiento `HEARTBEAT_OK` cuando el modelo devuelve una respuesta que solo es OK.
- `showAlerts`: envía el contenido de la alerta cuando el modelo devuelve una respuesta que no es OK.
- `useIndicator`: emite eventos de indicador para las superficies de estado de la interfaz de usuario.

Si **los tres** son falsos, OpenClaw omite por completo la ejecución del heartbeat (sin llamada al modelo).

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

| Objetivo                                                          | Configuración                                                                            |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportamiento predeterminado (OK silenciosos, alertas activadas) | _(no se necesita configuración)_                                                         |
| Completamente silencioso (sin mensajes, sin indicador)            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Solo indicador (sin mensajes)                                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OKs en un solo canal                                              | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (opcional)

Si existe un archivo `HEARTBEAT.md` en el espacio de trabajo, el mensaje predeterminado le indica al agente que lo lea. Piénsalo como tu "lista de verificación de latidos": pequeño, estable y seguro de incluir cada 30 minutos.

En ejecuciones normales, `HEARTBEAT.md` solo se inyecta cuando la guía de latidos está habilitada para el agente predeterminado. Deshabilitar el cadencia de latidos con `0m` o establecer `includeSystemPromptSection: false` lo omite del contexto de arranque normal.

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API. Esa omisión se reporta como `reason=empty-heartbeat-file`. Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

Manténlo diminuto (lista de verificación corta o recordatorios) para evitar la hinchazón del mensaje.

Ejemplo de `HEARTBEAT.md`:

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### Bloques `tasks:`

`HEARTBEAT.md` también admite un pequeño bloque estructurado `tasks:` para verificaciones basadas en intervalos dentro del propio latido.

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
    - OpenClaw analiza el bloque `tasks:` y verifica cada tarea contra su propio `interval`. - Solo las tareas **vencidas** se incluyen en el mensaje de latido para ese tick. - Si no hay tareas vencidas, el latido se omite por completo (`reason=no-tasks-due`) para evitar una llamada al modelo desperdiciada. - El contenido que no sea de tarea en `HEARTBEAT.md` se conserva y se agrega como contexto
    adicional después de la lista de tareas vencidas. - Las marcas de tiempo de la última ejecución de la tarea se almacenan en el estado de la sesión (`heartbeatTaskState`), por lo que los intervalos sobreviven a los reinicios normales. - Las marcas de tiempo de las tareas solo avanzan después de que una ejecución de latido completa su ruta de respuesta normal. Las ejecuciones omitidas de
    `empty-heartbeat-file` / `no-tasks-due` no marcan las tareas como completadas.
  </Accordion>
</AccordionGroup>

El modo de tarea es útil cuando quieres que un archivo de heartbeat contenga varias comprobaciones periódicas sin pagar por todas ellas en cada tick.

### ¿Puede el agente actualizar HEARTBEAT.md?

Sí, si se lo pides.

`HEARTBEAT.md` es solo un archivo normal en el espacio de trabajo del agente, por lo que puedes decirle al agente (en un chat normal) algo como:

- "Actualiza `HEARTBEAT.md` para añadir una comprobación diaria del calendario."
- "Reescribe `HEARTBEAT.md` para que sea más corto y se centre en el seguimiento de la bandeja de entrada."

Si quieres que esto ocurra de manera proactiva, también puedes incluir una línea explícita en tu prompt de heartbeat como: "Si la lista de verificación se vuelve obsoleta, actualiza HEARTBEAT.md con una mejor."

<Warning>No pongas secretos (claves de API, números de teléfono, tokens privados) en `HEARTBEAT.md` — pasa a ser parte del contexto del prompt.</Warning>

## Despertar manual (bajo demanda)

Puedes poner en cola un evento del sistema y activar un heartbeat inmediato con:

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si varios agentes tienen `heartbeat` configurado, un despertar manual ejecuta cada uno de esos heartbeats de agente inmediatamente.

Usa `--mode next-heartbeat` para esperar al siguiente tick programado.

## Entrega de razonamiento (opcional)

De forma predeterminada, los heartbeats entregan solo la carga útil final de "answer".

Si quieres transparencia, habilita:

- `agents.defaults.heartbeat.includeReasoning: true`

Cuando está habilitado, los heartbeats también entregarán un mensaje separado prefijado con `Reasoning:` (misma forma que `/reasoning on`). Esto puede ser útil cuando el agente gestiona múltiples sesiones/codexes y quieres ver por qué decidió hacerte un ping — pero también puede filtrar más detalle interno del que deseas. Es preferible mantenerlo desactivado en chats grupales.

## Conciencia de costes

Los heartbeats ejecutan turnos completos del agente. Los intervalos más cortos consumen más tokens. Para reducir el coste:

- Usa `isolatedSession: true` para evitar enviar el historial completo de la conversación (de ~100K tokens a ~2-5K por ejecución).
- Usa `lightContext: true` para limitar los archivos de arranque solo a `HEARTBEAT.md`.
- Establece un `model` más barato (por ejemplo, `ollama/llama3.2:1b`).
- Mantén `HEARTBEAT.md` pequeño.
- Usa `target: "none"` si solo quieres actualizaciones del estado interno.

## Relacionado

- [Automatización y Tareas](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Tareas en Segundo Plano](/es/automation/tasks) — cómo se rastrea el trabajo desacoplado
- [Zona Horaria](/es/concepts/timezone) — cómo la zona horaria afecta la programación del heartbeat
- [Solución de Problemas](/es/automation/cron-jobs#troubleshooting) — depuración de problemas de automatización
