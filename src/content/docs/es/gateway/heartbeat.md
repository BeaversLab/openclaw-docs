---
summary: "Mensajes de sondeo de Heartbeat y reglas de notificación"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **¿Heartbeat o Cron?** Consulte [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat) para obtener orientación sobre cuándo usar cada uno.

Heartbeat ejecuta **turnos de agente periódicos** en la sesión principal para que el modelo pueda
resaltar cualquier cosa que requiera atención sin enviarle spam.

Solución de problemas: [/automation/troubleshooting](/es/automation/troubleshooting)

## Inicio rápido (principiante)

1. Deje los heartbeats habilitados (el valor predeterminado es `30m`, o `1h` para Anthropic OAuth/setup-token) o configure su propio cadencia.
2. Cree una pequeña lista de verificación `HEARTBEAT.md` en el espacio de trabajo del agente (opcional pero recomendado).
3. Decida a dónde deben ir los mensajes de heartbeat (`target: "none"` es el predeterminado; configure `target: "last"` para enviar al último contacto).
4. Opcional: habilite la entrega de razonamiento de heartbeat para mayor transparencia.
5. Opcional: utilice un contexto de arranque ligero si las ejecuciones de heartbeat solo necesitan `HEARTBEAT.md`.
6. Opcional: habilite sesiones aisladas para evitar enviar el historial completo de la conversación en cada heartbeat.
7. Opcional: restrinja los heartbeats a las horas activas (hora local).

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

- Intervalo: `30m` (o `1h` cuando Anthropic OAuth/setup-token es el modo de autenticación detectado). Configure `agents.defaults.heartbeat.every` o por agente `agents.list[].heartbeat.every`; use `0m` para deshabilitar.
- Cuerpo del mensaje (configurable mediante `agents.defaults.heartbeat.prompt`):
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- El mensaje de heartbeat se envía **verbatim** como mensaje de usuario. El mensaje
  del sistema incluye una sección "Heartbeat" y la ejecución se marca internamente.
- Las horas activas (`heartbeat.activeHours`) se verifican en la zona horaria configurada.
  Fuera de la ventana, los heartbeats se omiten hasta el siguiente tic dentro de la ventana.

## Para qué sirve el mensaje de heartbeat

El mensaje predeterminado es intencionalmente amplio:

- **Tareas en segundo plano**: “Consider outstanding tasks” sugiere al agente que revise
  los seguimientos (bandeja de entrada, calendario, recordatorios, trabajo en cola) y destaque cualquier cosa urgente.
- **Verificación humana**: “Checkup sometimes on your human during day time” sugiere un
  mensaje ocasional y ligero de “anything you need?”, pero evita el spam nocturno
  al usar tu zona horaria local configurada (consulta [/concepts/timezone](/es/concepts/timezone)).

Si deseas que un latido haga algo muy específico (p. ej., “check Gmail PubSub
stats” o “verify gateway health”), establece `agents.defaults.heartbeat.prompt` (o
`agents.list[].heartbeat.prompt`) en un cuerpo personalizado (enviado textualmente).

## Contrato de respuesta

- Si no hay nada que requiera atención, responde con **`HEARTBEAT_OK`**.
- Durante las ejecuciones de latido, OpenClaw trata `HEARTBEAT_OK` como un reconocimiento cuando aparece
  al **inicio o al final** de la respuesta. El token se elimina y la respuesta se
  descarta si el contenido restante es **≤ `ackMaxChars`** (predeterminado: 300).
- Si `HEARTBEAT_OK` aparece en el **medio** de una respuesta, no se trata
  de manera especial.
- Para las alertas, **no** incluyas `HEARTBEAT_OK`; devuelve solo el texto de la alerta.

Fuera de los latidos, los `HEARTBEAT_OK` extraviados al inicio/final de un mensaje se eliminan
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

- `agents.defaults.heartbeat` establece el comportamiento global de los latidos.
- `agents.list[].heartbeat` se fusiona encima; si algún agente tiene un bloque `heartbeat`, **solo esos agentes** ejecutan latidos.
- `channels.defaults.heartbeat` establece los valores predeterminados de visibilidad para todos los canales.
- `channels.<channel>.heartbeat` anula los valores predeterminados del canal.
- `channels.<channel>.accounts.<id>.heartbeat` (canales multicuenta) anula la configuración por canal.

### Latidos por agente

Si alguna entrada `agents.list[]` incluye un bloque `heartbeat`, **solo esos agentes**
ejecutan latidos. El bloque por agente se fusiona encima de `agents.defaults.heartbeat`
(así puedes establecer valores predeterminados compartidos una vez y anularlos por agente).

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

Fuera de este ventana (antes de las 9 a.m. o después de las 10 p.m. hora del Este), los latidos se omiten. El siguiente tic programado dentro de la ventana se ejecutará normalmente.

### Configuración 24/7

Si desea que los latidos se ejecuten todo el día, use uno de estos patrones:

- Omita `activeHours` por completo (sin restricción de ventana de tiempo; este es el comportamiento predeterminado).
- Establezca una ventana de día completo: `activeHours: { start: "00:00", end: "24:00" }`.

No configure la misma hora para `start` y `end` (por ejemplo, `08:00` a `08:00`).
Esto se trata como una ventana de ancho cero, por lo que los latidos siempre se omiten.

### Ejemplo de multicuenta

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

- `every`: intervalo de latido (cadena de duración; unidad predeterminada = minutos).
- `model`: anulación de modelo opcional para ejecuciones de latido (`provider/model`).
- `includeReasoning`: cuando está habilitado, también entrega el mensaje separado `Reasoning:` cuando está disponible (misma forma que `/reasoning on`).
- `lightContext`: cuando es verdadero, las ejecuciones de latido usan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es verdadero, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Usa el mismo patrón de aislamiento que el cron `sessionTarget: "isolated"`. Reduce drásticamente el costo de tokens por latido. Combine con `lightContext: true` para obtener el máximo ahorro. El enrutamiento de entrega aún usa el contexto de la sesión principal.
- `session`: clave de sesión opcional para ejecuciones de latido.
  - `main` (predeterminado): sesión principal del agente.
  - Clave de sesión explícita (copiada de `openclaw sessions --json` o de la [CLI de sesiones](/es/cli/sessions)).
  - Formatos de clave de sesión: consulte [Sesiones](/es/concepts/session) y [Grupos](/es/channels/groups).
- `target`:
  - `last`: entregar al último canal externo utilizado.
  - canal explícito: `whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`.
  - `none` (predeterminado): ejecutar el latido pero **no entregar** externamente.
- `directPolicy`: controla el comportamiento de entrega directa/DM:
  - `allow` (predeterminado): permite la entrega de latido directo/DM.
  - `block`: suprime la entrega directa/DM (`reason=dm-blocked`).
- `to`: invalidación opcional del destinatario (id específico del canal, p. ej. E.164 para WhatsApp o un id de chat de Telegram). Para temas/hilos de Telegram, use `<chatId>:topic:<messageThreadId>`.
- `accountId`: id de cuenta opcional para canales multicuenta. Cuando `target: "last"`, el id de cuenta se aplica al último canal resuelto si soporta cuentas; de lo contrario se ignora. Si el id de cuenta no coincide con una cuenta configurada para el canal resuelto, la entrega se omite.
- `prompt`: anula el cuerpo del mensaje predeterminado (no se fusiona).
- `ackMaxChars`: caracteres máximos permitidos después de `HEARTBEAT_OK` antes de la entrega.
- `suppressToolErrorWarnings`: cuando es true, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `activeHours`: restringe las ejecuciones de latido a una ventana de tiempo. Objeto con `start` (HH:MM, inclusivo; use `00:00` para el inicio del día), `end` (HH:MM exclusivo; se permite `24:00` para el final del día) y `timezone` opcional.
  - Omitido o `"user"`: usa su `agents.defaults.userTimezone` si está configurado, de lo contrario recurre a la zona horaria del sistema anfitrión.
  - `"local"`: siempre usa la zona horaria del sistema anfitrión.
  - Cualquier identificador IANA (por ejemplo, `America/New_York`): se usa directamente; si no es válido, recurre al comportamiento `"user"` anterior.
  - `start` y `end` no deben ser iguales para una ventana activa; los valores iguales se tratan como de ancho cero (siempre fuera de la ventana).
  - Fuera de la ventana activa, los latidos se omiten hasta el siguiente tick dentro de la ventana.

## Comportamiento de entrega

- Los latidos se ejecutan en la sesión principal del agente de forma predeterminada (`agent:<id>:<mainKey>`),
  o `global` cuando `session.scope = "global"`. Establezca `session` para anular y usar una
  sesión de canal específica (Discord/WhatsApp/etc.).
- `session` solo afecta el contexto de ejecución; la entrega está controlada por `target` y `to`.
- Para entregar a un canal/destinatario específico, establezca `target` + `to`. Con
  `target: "last"`, la entrega usa el último canal externo para esa sesión.
- Las entregas de latidos permiten objetivos directos/DM de forma predeterminada. Establezca `directPolicy: "block"` para suprimir los envíos a objetivos directos mientras aún se ejecuta el turno de latido.
- Si la cola principal está ocupada, el latido se omite y se reintentará más tarde.
- Si `target` no resuelve a ningún destino externo, la ejecución aún ocurre pero no
  se envía ningún mensaje saliente.
- Las respuestas solo de latido **no** mantienen la sesión activa; se restaura el último `updatedAt`
  para que la expiración por inactividad se comporte normalmente.

## Controles de visibilidad

De forma predeterminada, los reconocimientos `HEARTBEAT_OK` se suprimen mientras se entrega el contenido de la alerta.
Puede ajustar esto por canal o por cuenta:

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

- `showOk`: envía un reconocimiento `HEARTBEAT_OK` cuando el modelo devuelve una respuesta solo de OK.
- `showAlerts`: envía el contenido de la alerta cuando el modelo devuelve una respuesta que no es OK.
- `useIndicator`: emite eventos indicadores para superficies de estado de la interfaz de usuario.

Si **los tres** son falsos, OpenClaw omite la ejecución del latido por completo (sin llamada al modelo).

### Ejemplos por canal vs. por cuenta

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

Si existe un archivo `HEARTBEAT.md` en el espacio de trabajo, el mensaje predeterminado indica
al agente que lo lea. Piénsalo como tu “lista de verificación de latidos”: pequeña, estable y
segura de incluir cada 30 minutos.

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados
markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

Mantenlo pequeño (lista de verificación corta o recordatorios) para evitar la hinchazón del mensaje.

Ejemplo `HEARTBEAT.md`:

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### ¿Puede el agente actualizar HEARTBEAT.md?

Sí — si se lo pides.

`HEARTBEAT.md` es solo un archivo normal en el espacio de trabajo del agente, por lo que puedes decirle
al agente (en un chat normal) algo como:

- “Actualiza `HEARTBEAT.md` para añadir una verificación diaria del calendario.”
- “Reescribe `HEARTBEAT.md` para que sea más breve y se centre en el seguimiento de la bandeja de entrada.”

Si deseas que esto ocurra de manera proactiva, también puedes incluir una línea explícita en
tu mensaje de latido como: “Si la lista de verificación se vuelve obsoleta, actualiza HEARTBEAT.md
con una mejor.”

Nota de seguridad: no pongas secretos (claves de API, números de teléfono, tokens privados) en
`HEARTBEAT.md` — se convierte parte del contexto del mensaje.

## Activación manual (bajo demanda)

Puedes poner en cola un evento del sistema y activar un latido inmediato con:

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si varios agentes tienen `heartbeat` configurado, una activación manual ejecuta cada uno de esos
latidos de agente inmediatamente.

Usa `--mode next-heartbeat` para esperar el siguiente tic programado.

## Entrega del razonamiento (opcional)

De forma predeterminada, los latidos entregan solo la carga útil final de “respuesta”.

Si deseas transparencia, activa:

- `agents.defaults.heartbeat.includeReasoning: true`

Cuando está habilitado, los latidos también entregarán un mensaje separado prefijado
`Reasoning:` (con la misma forma que `/reasoning on`). Esto puede ser útil cuando el agente
está gestionando múltiples sesiones/códices y quieres ver por qué decidió hacerte un ping
— pero también puede filtrar más detalles internos de los que deseas. Es preferible mantenerlo
desactivado en chats grupales.

## Conciencia del costo

Los latidos ejecutan turnos completos del agente. Intervalos más cortos consumen más tokens. Para reducir el costo:

- Usa `isolatedSession: true` para evitar enviar el historial completo de la conversación (de ~100K tokens a ~2-5K por ejecución).
- Usa `lightContext: true` para limitar los archivos de inicio a solo `HEARTBEAT.md`.
- Configura un `model` más barato (p. ej. `ollama/llama3.2:1b`).
- Mantén `HEARTBEAT.md` pequeño.
- Usa `target: "none"` si solo quieres actualizaciones del estado interno.
