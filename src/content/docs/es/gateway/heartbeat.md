---
summary: "Mensajes de sondeo de Heartbeat y reglas de notificación"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **¿Heartbeat o Cron?** Consulte [Automatización y tareas](/en/automation) para obtener orientación sobre cuándo usar cada uno.

Heartbeat ejecuta **turnos de agente periódicos** en la sesión principal para que el modelo pueda
resaltar cualquier cosa que requiera atención sin enviarle spam.

Heartbeat es un turno programado de la sesión principal: **no** crea registros de [tarea en segundo plano](/en/automation/tasks).
Los registros de tareas son para trabajos separados (ejecuciones de ACP, subagentes, trabajos cron aislados).

Solución de problemas: [Tareas programadas](/en/automation/cron-jobs#troubleshooting)

## Inicio rápido (principiante)

1. Deje los heartbeats habilitados (el valor predeterminado es `30m`, o `1h` para la autenticación OAuth/token de Anthropic, incluido el reúso de Claude CLI) o configure su propia cadencia.
2. Cree una pequeña lista de verificación `HEARTBEAT.md` o un bloque `tasks:` en el espacio de trabajo del agente (opcional pero recomendado).
3. Decida a dónde deben ir los mensajes de heartbeat (`target: "none"` es el predeterminado; configure `target: "last"` para enrutar al último contacto).
4. Opcional: habilite la entrega de razonamiento de latido para mayor transparencia.
5. Opcional: use un contexto de arranque ligero si las ejecuciones de heartbeat solo necesitan `HEARTBEAT.md`.
6. Opcional: habilite sesiones aisladas para evitar enviar el historial completo de la conversación en cada latido.
7. Opcional: restrinja los latidos a las horas activas (hora local).

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

- Intervalo: `30m` (o `1h` cuando la autenticación OAuth/token de Anthropic es el modo de autenticación detectado, incluido el reúso de Claude CLI). Configure `agents.defaults.heartbeat.every` o `agents.list[].heartbeat.every` por agente; use `0m` para desactivar.
- Cuerpo del aviso (configurable mediante `agents.defaults.heartbeat.prompt`):
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- El mensaje de latido se envía **textualmente** como el mensaje de usuario. El mensaje
  del sistema incluye una sección "Latido" y la ejecución se marca internamente.
- Las horas activas (`heartbeat.activeHours`) se verifican en la zona horaria configurada.
  Fuera de la ventana, los heartbeats se omiten hasta el siguiente tic dentro de la ventana.

## Para qué sirve el mensaje de latido

El mensaje predeterminado es intencionalmente amplio:

- **Tareas en segundo plano**: "Considere las tareas pendientes" incita al agente a revisar
  seguimientos (bandeja de entrada, calendario, recordatorios, trabajo en cola) y resaltar cualquier cosa urgente.
- **Registro humano**: "Verifique a veces a su humano durante el día" impulsa un
  mensaje ocasional ligero "¿necesita algo?", pero evita el spam nocturno
  al usar su zona horaria local configurada (consulte [/concepts/timezone](/en/concepts/timezone)).

Heartbeat puede reaccionar a [tareas en segundo plano](/en/automation/tasks) completadas, pero una ejecución de heartbeat en sí misma no crea un registro de tarea.

Si quieres que un latido haga algo muy específico (p. ej., “verificar estadísticas de Gmail PubSub” o “verificar el estado de la puerta de enlace”), establece `agents.defaults.heartbeat.prompt` (o `agents.list[].heartbeat.prompt`) en un cuerpo personalizado (enviado textualmente).

## Contrato de respuesta

- Si no hay nada que requiera atención, responde con **`HEARTBEAT_OK`**.
- Durante las ejecuciones de latido, OpenClaw trata `HEARTBEAT_OK` como un reconocimiento cuando aparece
  al **principio o al final** de la respuesta. El token se elimina y la respuesta se
  descarta si el contenido restante es **≤ `ackMaxChars`** (predeterminado: 300).
- Si `HEARTBEAT_OK` aparece en el **medio** de una respuesta, no se trata
  de forma especial.
- Para las alertas, **no** incluyas `HEARTBEAT_OK`; devuelve solo el texto de la alerta.

Fuera de los latidos, los `HEARTBEAT_OK` errantes al principio/final de un mensaje se eliminan
y registran; un mensaje que es solo `HEARTBEAT_OK` se descarta.

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
- `agents.list[].heartbeat` se fusiona encima; si algún agente tiene un bloque `heartbeat`, **solo esos agentes** ejecutan latidos.
- `channels.defaults.heartbeat` establece los valores predeterminados de visibilidad para todos los canales.
- `channels.<channel>.heartbeat` anula los valores predeterminados del canal.
- `channels.<channel>.accounts.<id>.heartbeat` (canales multicuenta) anula la configuración por canal.

### Latidos por agente

Si alguna entrada `agents.list[]` incluye un bloque `heartbeat`, **solo esos agentes**
ejecutan latidos. El bloque por agente se fusiona encima de `agents.defaults.heartbeat`
(por lo que puedes establecer valores predeterminados compartidos una vez y anularlos por agente).

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

No establezcas la misma hora `start` y `end` (por ejemplo, de `08:00` a `08:00`).
Eso se trata como una ventana de ancho cero, por lo que los latidos siempre se omiten.

### Ejemplo multicuenta

Usa `accountId` para dirigirte a una cuenta específica en canales multicuenta como Telegram:

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

- `every`: intervalo de latido (cadena de duración; unidad predeterminada = minutos).
- `model`: anulación opcional del modelo para las ejecuciones de heartbeat (`provider/model`).
- `includeReasoning`: cuando está habilitado, también entrega el mensaje separado `Reasoning:` cuando esté disponible (misma forma que `/reasoning on`).
- `lightContext`: cuando es verdadero, las ejecuciones de heartbeat utilizan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es verdadero, cada heartbeat se ejecuta en una sesión nueva sin historial de conversación previo. Utiliza el mismo patrón de aislamiento que el cron `sessionTarget: "isolated"`. Reduce drásticamente el coste de tokens por heartbeat. Combínalo con `lightContext: true` para el máximo ahorro. El enrutamiento de entrega todavía utiliza el contexto de la sesión principal.
- `session`: clave de sesión opcional para las ejecuciones de heartbeat.
  - `main` (predeterminado): sesión principal del agente.
  - Clave de sesión explícita (copiada de `openclaw sessions --json` o de la [CLI de sesiones](/en/cli/sessions)).
  - Formatos de clave de sesión: consulta [Sesiones](/en/concepts/session) y [Grupos](/en/channels/groups).
- `target`:
  - `last`: entrega al último canal externo utilizado.
  - canal explícito: cualquier canal configurado o id de complemento, por ejemplo `discord`, `matrix`, `telegram`, o `whatsapp`.
  - `none` (predeterminado): ejecuta el heartbeat pero **no entrega** externamente.
- `directPolicy`: controla el comportamiento de entrega directa/DM:
  - `allow` (predeterminado): permite la entrega de heartbeat directa/DM.
  - `block`: suprime la entrega directa/DM (`reason=dm-blocked`).
- `to`: anulación opcional del destinatario (id específico del canal, p. ej. E.164 para WhatsApp o un id de chat de Telegram). Para temas/hilos de Telegram, usa `<chatId>:topic:<messageThreadId>`.
- `accountId`: id de cuenta opcional para canales multicuenta. Cuando `target: "last"`, el id de cuenta se aplica al último canal resuelto si este soporta cuentas; de lo contrario se ignora. Si el id de cuenta no coincide con una cuenta configurada para el canal resuelto, la entrega se omite.
- `prompt`: sobrescribe el cuerpo del prompt predeterminado (no se fusiona).
- `ackMaxChars`: caracteres máximos permitidos después de `HEARTBEAT_OK` antes de la entrega.
- `suppressToolErrorWarnings`: cuando es verdadero, suprime las cargas útiles de advertencia de error de herramienta durante las ejecuciones de heartbeat.
- `activeHours`: restringe las ejecuciones de heartbeat a una ventana de tiempo. Objeto con `start` (HH:MM, inclusivo; use `00:00` para el inicio del día), `end` (HH:MM exclusivo; se permite `24:00` para el final del día) y `timezone` opcional.
  - Omitido o `"user"`: usa su `agents.defaults.userTimezone` si está configurado; de lo contrario, recurre a la zona horaria del sistema anfitrión.
  - `"local"`: siempre usa la zona horaria del sistema anfitrión.
  - Cualquier identificador IANA (p. ej., `America/New_York`): se usa directamente; si no es válido, recurre al comportamiento `"user"` anterior.
  - `start` y `end` no deben ser iguales para una ventana activa; los valores iguales se tratan como de ancho cero (siempre fuera de la ventana).
  - Fuera de la ventana activa, los latidos se omiten hasta el siguiente tic dentro de la ventana.

## Comportamiento de entrega

- Los heartbeats se ejecutan en la sesión principal del agente de forma predeterminada (`agent:<id>:<mainKey>`),
  o `global` cuando `session.scope = "global"`. Establezca `session` para anular a una
  sesión de canal específica (Discord/WhatsApp/etc.).
- `session` solo afecta el contexto de ejecución; la entrega está controlada por `target` y `to`.
- Para entregar a un canal/destinatario específico, configure `target` + `to`. Con
  `target: "last"`, la entrega usa el último canal externo para esa sesión.
- Las entregas de Heartbeat permiten objetivos directos/DM por defecto. Establezca `directPolicy: "block"` para suprimir los envíos a objetivos directos mientras se sigue ejecutando el turno de heartbeat.
- Si la cola principal está ocupada, el latido se omite y se vuelve a intentar más tarde.
- Si `target` no se resuelve en ningún destino externo, la ejecución aún ocurre pero no se envía ningún mensaje saliente.
- Si `showOk`, `showAlerts` y `useIndicator` están todos deshabilitados, la ejecución se omite por adelantado como `reason=alerts-disabled`.
- Si solo la entrega de alertas está deshabilitada, OpenClaw aún puede ejecutar el heartbeat, actualizar las marcas de tiempo de las tareas vencidas, restaurar la marca de tiempo de inactividad de la sesión y suprimir la carga útil de la alerta externa.
- Las respuestas solo de Heartbeat **no** mantienen la sesión activa; se restaura el último `updatedAt` para que la expiración por inactividad se comporte con normalidad.
- Las [tareas en segundo plano]/en/automation/tasks desacopladas pueden poner en cola un evento del sistema y despertar el heartbeat cuando la sesión principal debería notar algo rápidamente. Ese despertar no hace que el heartbeat ejecute una tarea en segundo plano.

## Controles de visibilidad

Por defecto, los reconocimientos de `HEARTBEAT_OK` se suprimen mientras se entrega el contenido de la alerta. Puede ajustar esto por canal o por cuenta:

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

- `showOk`: envía un reconocimiento de `HEARTBEAT_OK` cuando el modelo devuelve una respuesta de solo OK.
- `showAlerts`: envía el contenido de la alerta cuando el modelo devuelve una respuesta que no es OK.
- `useIndicator`: emite eventos indicadores para las superficies de estado de la interfaz de usuario.

Si **los tres** son falsos, OpenClaw omite la ejecución del heartbeat por completo (sin llamada al modelo).

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

Si existe un archivo `HEARTBEAT.md` en el espacio de trabajo, el mensaje predeterminado indica al agente que lo lea. Piénsalo como tu "lista de verificación de latidos": pequeño, estable y seguro de incluir cada 30 minutos.

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API. Esa omisión se reporta como `reason=empty-heartbeat-file`. Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

Manténlo pequeño (una lista de verificación corta o recordatorios) para evitar la hinchazón del mensaje.

Ejemplo de `HEARTBEAT.md`:

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
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

Comportamiento:

- OpenClaw analiza el bloque `tasks:` y comprueba cada tarea con su propio `interval`.
- Solo las tareas **vencidas** se incluyen en el mensaje del latido para ese tick.
- Si no hay tareas vencidas, el latido se omite por completo (`reason=no-tasks-due`) para evitar una llamada desperdiciada al modelo.
- El contenido que no sea de tarea en `HEARTBEAT.md` se conserva y se agrega como contexto adicional después de la lista de tareas vencidas.
- Las marcas de tiempo de la última ejecución de las tareas se almacenan en el estado de la sesión (`heartbeatTaskState`), por lo que los intervalos sobreviven a los reinicios normales.
- Las marcas de tiempo de las tareas solo avanzan después de que una ejecución de latido completa su ruta normal de respuesta. Las ejecuciones omitidas de `empty-heartbeat-file` / `no-tasks-due` no marcan las tareas como completadas.

El modo de tarea es útil cuando quieres que un archivo de latido contenga varias verificaciones periódicas sin pagar por todas ellas en cada tick.

### ¿Puede el agente actualizar HEARTBEAT.md?

Sí, si se lo pides.

`HEARTBEAT.md` es solo un archivo normal en el espacio de trabajo del agente, por lo que puedes decirle al agente (en un chat normal) algo como:

- "Actualiza `HEARTBEAT.md` para agregar una verificación diaria del calendario."
- "Reescribe `HEARTBEAT.md` para que sea más corto y se centre en el seguimiento de la bandeja de entrada."

Si deseas que esto ocurra de manera proactiva, también puedes incluir una línea explícita en
your heartbeat prompt como: “If the checklist becomes stale, update HEARTBEAT.md
with a better one.”

Nota de seguridad: no pongas secretos (claves de API, números de teléfono, tokens privados) en
`HEARTBEAT.md` — se convierte en parte del contexto del prompt.

## Activación manual (bajo demanda)

Puedes poner en cola un evento del sistema y activar un latido inmediato con:

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si varios agentes tienen `heartbeat` configurado, una activación manual ejecuta cada uno de esos
latidos de agente inmediatamente.

Usa `--mode next-heartbeat` para esperar el siguiente ciclo programado.

## Entrega de razonamiento (opcional)

De manera predeterminada, los latidos entregan solo la carga útil final de "answer".

Si deseas transparencia, habilita:

- `agents.defaults.heartbeat.includeReasoning: true`

Cuando está habilitado, los latidos también entregarán un mensaje separado con el prefijo
`Reasoning:` (misma forma que `/reasoning on`). Esto puede ser útil cuando el agente
está administrando múltiples sesiones/códices y deseas ver por qué decidió hacerte un ping
— pero también puede filtrar más detalles internos de los que deseas. Es preferible mantenerlo
desactivado en chats grupales.

## Conciencia de costos

Los latidos ejecutan turnos completos del agente. Intervalos más cortos consumen más tokens. Para reducir el costo:

- Usa `isolatedSession: true` para evitar enviar el historial completo de la conversación (~100K tokens reducido a ~2-5K por ejecución).
- Usa `lightContext: true` para limitar los archivos de arranque solo a `HEARTBEAT.md`.
- Establece un `model` más económico (por ejemplo, `ollama/llama3.2:1b`).
- Mantén `HEARTBEAT.md` pequeño.
- Usa `target: "none"` si solo deseas actualizaciones del estado interno.

## Relacionado

- [Automatización y tareas](/en/automation) — todos los mecanismos de automatización a un vistazo
- [Tareas en segundo plano](/en/automation/tasks) — cómo se rastrea el trabajo separado
- [Zona horaria](/en/concepts/timezone) — cómo afecta la zona horaria a la programación de los latidos
- [Solución de problemas](/en/automation/cron-jobs#troubleshooting) — depuración de problemas de automatización
