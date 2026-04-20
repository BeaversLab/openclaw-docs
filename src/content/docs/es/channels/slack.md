---
summary: "Configuración y comportamiento en tiempo de ejecución de Slack (Modo Socket + URLs de solicitud HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

Estado: listo para producción para MDs + canales mediante integraciones de aplicaciones de Slack. El modo predeterminado es el modo Socket; las URLs de solicitudes HTTP también son compatibles.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    Los MD de Slack tienen por defecto el modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/en/tools/slash-commands">
    Comportamiento nativo de comandos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Modo Socket (predeterminado)">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        En la configuración de la aplicación de Slack, presione el botón **[Create New App](https://api.slack.com/apps/new)**:

        - elija **from a manifest** y seleccione un espacio de trabajo para su aplicación
        - pegue el [manifest de ejemplo](#manifest-and-scope-checklist) de abajo y continúe para crear
        - genere un **App-Level Token** (`xapp-...`) con `connections:write`
        - instale la aplicación y copie el **Bot Token** (`xoxb-...`) que se muestra
      </Step>

      <Step title="Configurar OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        Env fallback (cuenta predeterminada solamente):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="URLs de solicitud HTTP">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        En la configuración de la aplicación de Slack, presione el botón **[Create New App](https://api.slack.com/apps/new)**:

        - elija **desde un manifiesto** y seleccione un espacio de trabajo para su aplicación
        - pegue el [manifesto de ejemplo](#manifest-and-scope-checklist) y actualice las URL antes de crear
        - guarde el **Signing Secret** para la verificación de solicitudes
        - instale la aplicación y copie el **Bot Token** (`xoxb-...`) que se muestra

      </Step>

      <Step title="Configurar OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

        <Note>
        Use rutas de webhook únicas para HTTP multicuenta

        Dé a cada cuenta un `webhookPath` distinto (por defecto `/slack/events`) para que los registros no colisionen.
        </Note>

      </Step>

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Lista de verificación de manifiesto y ámbito

<Tabs>
  <Tab title="Socket Mode (default)">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

  </Tab>

  <Tab title="URLs de solicitud HTTP">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

### Configuraciones adicionales del manifiesto

Exponer diferentes funciones que extienden los valores predeterminados anteriores.

<AccordionGroup>
  <Accordion title="Comandos de barra nativos opcionales">

    Se pueden usar múltiples [comandos de barra nativos](#commands-and-slash-behavior) en lugar de un solo comando configurado con matices:

    - Use `/agentstatus` en lugar de `/status` porque el comando `/status` está reservado.
    - No se pueden hacer disponibles más de 25 comandos de barra a la vez.

    Reemplace su sección `features.slash_commands` existente con un subconjunto de [comandos disponibles](/en/tools/slash-commands#command-list):

    <Tabs>
      <Tab title="Modo Socket (predeterminado)">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]"
      },
      {
        "command": "/reset",
        "description": "Reset the current session"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]"
      },
      {
        "command": "/stop",
        "description": "Stop the current run"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
      },
      {
        "command": "/help",
        "description": "Show the short help summary"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="URLs de solicitud HTTP">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reset",
        "description": "Reset the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/stop",
        "description": "Stop the current run",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "Show the short help summary",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost",
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="Ámbitos de autoría opcionales (operaciones de escritura)">
    Añada el ámbito `chat:write.customize` bot si desea que los mensajes salientes utilicen la identidad del agente activo (nombre de usuario e icono personalizados) en lugar de la identidad predeterminada de la aplicación Slack.

    Si utiliza un icono de emoji, Slack espera la sintaxis `:emoji_name:`.

  </Accordion>
  <Accordion title="Ámbitos opcionales de token de usuario (operaciones de lectura)">
    Si configura `channels.slack.userToken`, los ámbitos de lectura típicos son:

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si depende de las lecturas de búsqueda de Slack)

  </Accordion>
</AccordionGroup>

## Modelo de token

- `botToken` + `appToken` son obligatorios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas
  de texto sin formato u objetos SecretRef.
- Los tokens de configuración anulan la reserva de variables de entorno.
- La reserva de variables de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin reserva de variables de entorno) y de forma predeterminada tiene un comportamiento de solo lectura (`userTokenReadOnly: true`).

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack rastrea los campos `*Source` y `*Status`
  por credencial (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef
  u otro origen de secreto no en línea, pero la ruta de comando/tiempo de ejecución actual
  no pudo resolver el valor real.
- En modo HTTP, se incluye `signingSecretStatus`; en modo Socket, el
  par requerido es `botTokenStatus` + `appTokenStatus`.

<Tip>Para acciones/lecturas de directorio, el token de usuario puede preferirse cuando está configurado. Para escrituras, el token de bot sigue siendo el preferido; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y puertas

Las acciones de Slack se controlan mediante `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo      | Predeterminado |
| ---------- | -------------- |
| mensajes   | habilitado     |
| reacciones | habilitado     |
| fijados    | habilitado     |
| memberInfo | habilitado     |
| emojiList  | habilitado     |

Las acciones actuales de mensajes de Slack incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a MD (legado: `channels.slack.dm.policy`):

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`; legado: `channels.slack.dm.allowFrom`)
    - `disabled`

    Marcadores de MD:

    - `dm.enabled` (verdadero predeterminado)
    - `channels.slack.allowFrom` (preferido)
    - `dm.allowFrom` (legado)
    - `dm.groupEnabled` (grupos de MD predeterminado falso)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está configurado.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    El emparejamiento en MD utiliza `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Política de canal">
    `channels.slack.groupPolicy` controla el manejo del canal:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos del canal se encuentra en `channels.slack.channels` y debe usar IDs de canal estables.

    Nota de ejecución: si `channels.slack` falta completamente (configuración solo de env), la ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos del canal y las entradas de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombre de canal no resueltas se mantienen configuradas pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento del canal son primero por ID de forma predeterminada; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están limitados por menciones de forma predeterminada.

    Fuentes de menciones:

    - mención explícita de la aplicación (`<@botId>`)
    - patrones de regex de menciones (`agents.list[].groupChat.mentionPatterns`, alternativa `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en hilos (desactivado cuando `thread.requireExplicitMention` es `true`)

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución al inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - formato de clave `toolsBySender`: `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía se asignan solo a `id:`)

  </Tab>
</Tabs>

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Con el `session.dmScope=main` predeterminado, los MD de Slack colapsan hacia la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas en hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando corresponda.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se recuperan cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).
- `channels.slack.thread.requireExplicitMention` (por defecto `false`): cuando es `true`, suprime las menciones implícitas de hilos para que el bot solo responda a menciones `@bot` explícitas dentro de los hilos, incluso cuando el bot ya haya participado en el hilo. Sin esto, las respuestas en un hilo con participación del bot omiten el filtrado `requireMention`.

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all|batched` (por defecto `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- reserva heredada para chats directos: `channels.slack.dm.replyToMode`

Las etiquetas de respuesta manuales son compatibles:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Nota: `replyToMode="off"` desactiva **todos** los hilos de respuesta en Slack, incluyendo las etiquetas `[[reply_to_*]]` explícitas. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. La diferencia refleja los modelos de hilos de las plataformas: los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en el flujo principal del chat.

## Reacciones de ack

`ackReaction` envía un emoji de reconocimiento mientras OpenClaw procesa un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- reserva de emoji de identidad del agente (`agents.list[].identity.emoji`, si no "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para desactivar la reacción para la cuenta de Slack o globalmente.

## Transmisión de texto

`channels.slack.streaming` controla el comportamiento de vista previa en vivo:

- `off`: desactivar la transmisión de vista previa en vivo.
- `partial` (por defecto): reemplazar el texto de vista previa con la salida parcial más reciente.
- `block`: agregar actualizaciones de vista previa fragmentadas.
- `progress`: mostrar texto de estado de progreso mientras se genera, luego enviar el texto final.

`channels.slack.streaming.nativeTransport` controla el flujo de texto nativo de Slack cuando `channels.slack.streaming.mode` es `partial` (predeterminado: `true`).

- Debe haber un hilo de respuesta disponible para que el flujo de texto nativo y el estado del hilo del asistente de Slack aparezcan. La selección de hilo aún sigue `replyToMode`.
- Las raíces de canales y chats grupales aún pueden usar la vista previa de borrador normal cuando el flujo nativo no está disponible.
- Los MD de Slack de nivel superior permanecen fuera del hilo de forma predeterminada, por lo que no muestran la vista previa estilo hilo; use respuestas de hilo o `typingReaction` si desea un progreso visible allí.
- Los medios y las cargas que no son texto vuelven a la entrega normal.
- Si el flujo falla a mitad de respuesta, OpenClaw vuelve a la entrega normal para las cargas restantes.

Use la vista previa de borrador en lugar del flujo de texto nativo de Slack:

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) se migra automáticamente a `channels.slack.streaming.mode`.
- el booleano `channels.slack.streaming` se migra automáticamente a `channels.slack.streaming.mode` y `channels.slack.streaming.nativeTransport`.
- `channels.slack.nativeStreaming` heredado se migra automáticamente a `channels.slack.streaming.nativeTransport`.

## Respaldo de reacción de escritura

`typingReaction` agrega una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas de hilo, que usan un indicador de estado "escribiendo..." predeterminado.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera códigos cortos (por ejemplo, `"hourglass_flowing_sand"`).
- La reacción se realiza con el mejor esfuerzo y se intenta la limpieza automáticamente después de que se completa la ruta de respuesta o error.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URLs privadas alojadas en Slack (flujo de solicitud autenticado por token) y se escriben en el almacén de medios cuando la recuperación tiene éxito y los límites de tamaño lo permiten.

    El límite de tamaño de entrada en tiempo de ejecución es `20MB` de forma predeterminada, a menos que se anule con `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texto y archivos salientes">
  - los fragmentos de texto usan `channels.slack.textChunkLimit` (por defecto 4000) - `channels.slack.chunkMode="newline"` habilita la división prioritaria de párrafos - los envíos de archivos usan las APIs de carga de Slack y pueden incluir respuestas de hilos (`thread_ts`) - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los envíos de
  canal usan los valores predeterminados de tipo MIME de la canalización de medios
</Accordion>

  <Accordion title="Objetivos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack se abren a través de las APIs de conversación de Slack al enviar a objetivos de usuario.

  </Accordion>
</AccordionGroup>

## Comandos y comportamiento de barra

Los comandos de barra aparecen en Slack como un solo comando configurado o múltiples comandos nativos. Configure `channels.slack.slashCommand` para cambiar los valores predeterminados de los comandos:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Los comandos nativos requieren [configuraciones de manifiesto adicionales](#additional-manifest-settings) en tu aplicación de Slack y se habilitan con `channels.slack.commands.native: true` o `commands.native: true` en su lugar en las configuraciones globales.

- El modo automático de comandos nativos está **desactivado** para Slack, por lo que `commands.native: "auto"` no habilita los comandos nativos de Slack.

```txt
/help
```

Los menús de argumentos nativos utilizan una estrategia de representación adaptativa que muestra un modal de confirmación antes de enviar un valor de opción seleccionado:

- hasta 5 opciones: bloques de botones
- 6-100 opciones: menú de selección estática
- más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando hay controladores de opciones de interactividad disponibles
- límites de Slack excedidos: los valores de opciones codificados vuelven a los botones

```txt
/think
```

Las sesiones de barra usan claves aisladas como `agent:<agentId>:slack:slash:<userId>` y aún enrutan las ejecuciones de comandos a la sesión de conversación objetivo usando `CommandTargetSessionKey`.

## Respuestas interactivas

Slack puede representar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

Habilítelo globalmente:

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

O habilítelo solo para una cuenta de Slack:

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

Cuando está activado, los agentes pueden emitir directivas de respuesta exclusivas de Slack:

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Estas directivas se compilan en Slack Block Kit y dirigen los clics o selecciones de vuelta a través de la ruta de eventos de interacción de Slack existente.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit en sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores brutos creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw recurre a la respuesta de texto original en lugar de enviar una carga de bloques no válida.

## Aprobaciones de ejecución en Slack

Slack puede actuar como un cliente de aprobación nativo con botones e interactivos interactivos, en lugar de recurrir a la interfaz de usuario web o a la terminal.

- Las aprobaciones de ejecución usan `channels.slack.execApprovals.*` para el enrutamiento nativo de MD/canal.
- Las aprobaciones de complementos aún pueden resolverse a través de la misma superficie de botón nativa de Slack cuando la solicitud ya llega a Slack y el tipo de identificación de aprobación es `plugin:`.
- La autorización del aprobador todavía se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las indicaciones de aprobación se procesan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la experiencia de usuario de aprobación principal; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones
por chat no están disponibles o la aprobación manual es la única ruta.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; recurre a `commands.ownerAllowFrom` cuando sea posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o `"auto"` y al menos un
aprobador resuelve. Establezca `enabled: false` para deshabilitar explícitamente Slack como cliente de aprobación nativo.
Establezca `enabled: true` para forzar las aprobaciones nativas cuando los aprobadores resuelvan.

Comportamiento predeterminado sin configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Solo se necesita una configuración nativa explícita de Slack cuando desea anular los aprobadores, agregar filtros o
optar por la entrega al chat de origen:

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

El reenvío compartido de `approvals.exec` es separado. Úselo solo cuando las solicitudes de aprobación de ejecución también deban
enrutarse a otros chats o objetivos explícitos fuera de banda. El reenvío compartido de `approvals.plugin` también es
separado; los botones nativos de Slack aún pueden resolver las aprobaciones de complementos cuando esas solicidades ya llegan
a Slack.

El `/approve` del mismo chat también funciona en canales y MD de Slack que ya soportan comandos. Consulte [Aprobaciones de ejecución](/en/tools/exec-approvals) para el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes y las transmisiones de hilos se asignan a eventos del sistema.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/salir de miembros, canal creado/renombrado y agregar/eliminar fijaciones se asignan a eventos del sistema.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador de hilos y la siembra inicial del contexto del historial de hilos se filtran por las listas de permitidos del remitente configuradas, cuando corresponde.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema estructurados `Slack interaction: ...` con campos de carga útil enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores de selector y metadatos de `workflow_*`
  - eventos modales `view_submission` y `view_closed` con metadatos de canal enrutados y entradas de formulario

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Slack](/en/gateway/configuration-reference#slack)

  Campos de Slack de alta señal:
  - modo/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - acceso DM: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompecristales; manténgalo apagado a menos que sea necesario)
  - acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - operaciones/características: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Verificar, en orden:

    - `groupPolicy`
    - lista de permitidos del canal (`channels.slack.channels`)
    - `requireMention`
    - lista de permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes DM ignorados">
    Verificar:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o heredado `channels.slack.dm.policy`)
    - aprobaciones de vinculación / entradas de lista de permitidos

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Valide los tokens del bot y de la aplicación, así como la habilitación del Modo Socket en la configuración de la aplicación de Slack.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada, pero el tiempo de ejecución actual no pudo resolver el valor respaldado por SecretRef.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Valide:

    - signing secret (secreto de firma)
    - webhook path (ruta del webhook)
    - Slack Request URLs (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

    Si `signingSecretStatus: "configured_unavailable"` aparece en las instantáneas
    de la cuenta, la cuenta HTTP está configurada, pero el tiempo de ejecución actual no pudo resolver el secreto de firma respaldado por SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Verifique si tenía la intención de:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra único (`channels.slack.slashCommand.enabled: true`)

    También compruebe `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Grupos](/en/channels/groups)
- [Seguridad](/en/gateway/security)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Solución de problemas](/en/channels/troubleshooting)
- [Configuración](/en/gateway/configuration)
- [Comandos de barra](/en/tools/slash-commands)
