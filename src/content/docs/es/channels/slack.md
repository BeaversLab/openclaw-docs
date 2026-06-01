---
summary: "Configuración de Slack y comportamiento en tiempo de ejecución (Socket Mode + HTTP Request URLs)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Listo para producción para MDs y canales mediante integraciones de aplicaciones de Slack. El modo predeterminado es Socket Mode; también se admiten URLs de solicitud HTTP.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Slack por defecto están en modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comando nativo y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Elegir entre Socket Mode y URL de solicitud HTTP

Ambos transportes están listos para producción y alcanzan paridad de características para mensajería, comandos de barra, App Home e interactividad. Elija según la forma de implementación, no las características.

| Preocupación                                   | Socket Mode (predeterminado)                                                                                                                                                                                             | URL de solicitud HTTP                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| URL de puerta de enlace pública                | No requerido                                                                                                                                                                                                             | Requerido (DNS, TLS, proxy inverso o túnel)                                                                                 |
| Red saliente                                   | WSS de salida hacia `wss-primary.slack.com` debe ser alcanzable                                                                                                                                                          | Sin WS saliente; solo HTTPS entrante                                                                                        |
| Tokens necesarios                              | Token de bot + Token de nivel de aplicación con `connections:write`                                                                                                                                                      | Token de bot + Secreto de firma                                                                                             |
| Portátil de desarrollo / detrás de un firewall | Funciona tal cual                                                                                                                                                                                                        | Necesita un túnel público (ngrok, Cloudflare Tunnel, Tailscale Funnel) o una puerta de enlace de ensayo                     |
| Escalado horizontal                            | Una sesión de Socket Mode por aplicación por host; múltiples puertas de enlace necesitan aplicaciones de Slack separadas                                                                                                 | Manejador POST sin estado; múltiples réplicas de Gateway pueden compartir una aplicación detrás de un equilibrador de carga |
| Multicuenta en una sola puerta de enlace       | Compatible; cada cuenta abre su propio WS                                                                                                                                                                                | Compatible; cada cuenta necesita un `webhookPath` único (por defecto `/slack/events`) para que los registros no colisionen  |
| Transporte de comandos de barra                | Entregado a través de la conexión WS; se ignora `slash_commands[].url`                                                                                                                                                   | Slack hace POST a `slash_commands[].url`; el campo es obligatorio para que el comando se despache                           |
| Firma de la solicitud                          | No se utiliza (la autenticación es el Token de nivel de aplicación)                                                                                                                                                      | Slack firma cada solicitud; OpenClaw verifica con `signingSecret`                                                           |
| Recuperación ante la caída de la conexión      | La reconexión automática del SDK de Slack está habilitada; OpenClaw también reinicia las sesiones de Socket Mode fallidas con retroceso limitado. Se aplica la sintonización del transporte de tiempo de espera de Pong. | No hay conexión persistente que se caiga; los reintentos son por solicitud desde Slack                                      |

<Note>
  **Elija Socket Mode** para hosts de una sola puerta de enlace, computadoras portátiles de desarrollo y redes locales que puedan alcanzar `*.slack.com` de salida pero no puedan aceptar HTTPS entrante.

**Elija HTTP Request URLs** cuando ejecute múltiples réplicas de Gateway detrás de un equilibrador de carga, cuando WSS de salida está bloqueado pero se permite HTTPS entrante, o cuando ya termine los webhooks de Slack en un proxy inverso.

</Note>

## Instalación

Instale Slack antes de configurar el canal:

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` registra y habilita el complemento. El complemento aún no hace nada hasta que configure la aplicación de Slack y la configuración del canal a continuación. Consulte [Plugins](/es/tools/plugin) para conocer el comportamiento general del complemento y las reglas de instalación.

## Configuración rápida

<Tabs>
  <Tab title="Modo Socket (predeterminado)">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        Abre [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → selecciona tu espacio de trabajo → pega uno de los manifiestos a continuación → **Next** → **Create**.

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** coincide con el conjunto completo de funciones del complemento de Slack: App Home, comandos de barra, archivos, reacciones, anclajes, MD de grupo y lecturas de emojis/grupos de usuarios. Elige **Minimal** cuando la política del espacio de trabajo restringa los alcances — cubre MD, historial de canal/grupo, menciones y comandos de barra, pero omite archivos, reacciones, anclajes, MD de grupo (`mpim:*`), `emoji:read` y `usergroups:read`. Consulta [Manifest and scope checklist](#manifest-and-scope-checklist) para conocer la justificación por alcance y opciones adicionales, como comandos de barra extra.
        </Note>

        Después de que Slack cree la aplicación:

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**: añade `connections:write`, guarda, copia el App-Level Token.
        - **Install App -> Install to Workspace**: copia el Bot User OAuth Token.

      </Step>

      <Step title="Configurar OpenClaw">

        Configuración SecretRef recomendada:

```bash
export SLACK_APP_TOKEN=slack-app-token-example
export SLACK_BOT_TOKEN=slack-bot-token-example
cat > slack.socket.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./slack.socket.patch.json5 --dry-run
openclaw config patch --file ./slack.socket.patch.json5
```

        Alternativa Env (solo cuenta predeterminada):

```bash
SLACK_APP_TOKEN=slack-app-token-example
SLACK_BOT_TOKEN=slack-bot-token-example
```

      </Step>

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="URLs de solicitudes HTTP">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        Abra [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → seleccione su espacio de trabajo → pegue uno de los manifiestos a continuación → reemplace `https://gateway-host.example.com/slack/events` con su URL pública de Gateway → **Next** → **Create**.

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** coincide con el conjunto completo de funciones del complemento de Slack; **Minimal** elimina archivos, reacciones, fijaciones, MD de grupo (`mpim:*`), `emoji:read` y `usergroups:read` para espacios de trabajo restrictivos. Consulte [Lista de verificación de manifiesto y ámbitos](#manifest-and-scope-checklist) para conocer la justificación por ámbito.
        </Note>

        <Info>
          Los tres campos de URL (`slash_commands[].url`, `event_subscriptions.request_url` y `interactivity.request_url` / `message_menu_options_url`) apuntan todos al mismo punto final de OpenClaw. El esquema de manifiesto de Slack requiere que se les asigne nombres por separado, pero OpenClaw enruta por tipo de carga, por lo que un solo `webhookPath` (predeterminado `/slack/events`) es suficiente. Los comandos de barra sin `slash_commands[].url` no harán nada silenciosamente en modo HTTP.
        </Info>

        Después de que Slack cree la aplicación:

        - **Basic Information → App Credentials**: copie el **Signing Secret** para la verificación de solicitudes.
        - **Install App -> Install to Workspace**: copie el Bot User OAuth Token.

      </Step>

      <Step title="Configurar OpenClaw">

        Configuración recomendada de SecretRef:

```bash
export SLACK_BOT_TOKEN=slack-bot-token-example
export SLACK_SIGNING_SECRET=...
cat > slack.http.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: { source: "env", provider: "default", id: "SLACK_SIGNING_SECRET" },
      webhookPath: "/slack/events",
    },
  },
}
JSON5
openclaw config patch --file ./slack.http.patch.json5 --dry-run
openclaw config patch --file ./slack.http.patch.json5
```

        <Note>
        Use rutas de webhook únicas para HTTP multicuenta

        Asigne a cada cuenta un `webhookPath` distinto (predeterminado `/slack/events`) para que los registros no colisionen.
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

## Ajuste del transporte en modo Socket

Por defecto, OpenClaw establece el tiempo de espera de pong del cliente Slack SDK en 15 segundos para el modo Socket. Anule la configuración de transporte solo cuando necesite un ajuste específico del espacio de trabajo o del host:

```json5
{
  channels: {
    slack: {
      mode: "socket",
      socketMode: {
        clientPingTimeout: 20000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
    },
  },
}
```

Use esto solo para espacios de trabajo en modo Socket que registren tiempos de espera de pong/ping del servidor websocket de Slack o se ejecuten en hosts con inanición conocida del bucle de eventos. `clientPingTimeout` es la espera del pong después de que el SDK envía un ping de cliente; `serverPingTimeout` es la espera de los pings del servidor de Slack. Los mensajes y eventos de la aplicación permanecen como estado de la aplicación, no como señales de actividad del transporte.

Notas:

- `socketMode` se ignora en el modo de URL de solicitud HTTP.
- La configuración base de `channels.slack.socketMode` se aplica a todas las cuentas de Slack a menos que se anule. Las anulaciones por cuenta usan `channels.slack.accounts.<accountId>.socketMode`; debido a que es una anulación de objeto, incluya cada campo de ajuste de socket que desee para esa cuenta.
- Solo `clientPingTimeout` tiene un valor predeterminado de OpenClaw (`15000`). `serverPingTimeout` y `pingPongLoggingEnabled` se pasan al SDK de Slack solo cuando se configuran.
- El retroceso de reinicio del modo Socket comienza alrededor de 2 segundos y alcanza un máximo de alrededor de 30 segundos. Los fallos consecutivos recuperables de inicio/espera de inicio se detienen después de 12 intentos; después de una conexión exitosa, las desconexiones recuperables posteriores inician un nuevo ciclo de reintentos. Los errores de autenticación de Slack no recuperables, como `invalid_auth`, tokens revocados o alcances faltantes, fallan rápidamente en lugar de reintentar para siempre.

## Lista de verificación de manifiesto y alcances

El manifiesto base de la aplicación de Slack es el mismo para el modo Socket y las URL de solicitud HTTP. Solo el bloque `settings` (y el comando de barra `url`) difiere.

Manifiesto base (predeterminado de Socket Mode):

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

Para el **modo de URL de solicitud HTTP**, reemplace `settings` con la variante HTTP y agregue `url` a cada comando de barra. Se requiere una URL pública:

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### Configuración adicional del manifiesto

Exponga diferentes características que extiendan los valores predeterminados anteriores.

El manifiesto predeterminado habilita la pestaña **Inicio** de Slack App Home y se suscribe a `app_home_opened`. Cuando un miembro del espacio de trabajo abre la pestaña Inicio, OpenClaw publica una vista de Inicio predeterminada segura con `views.publish`; no se incluye ninguna carga útil de conversación ni configuración privada. La pestaña **Mensajes** permanece habilitada para los mensajes directos de Slack. El manifiesto también habilita los hilos del asistente de Slack con `features.assistant_view`, `assistant:write`, `assistant_thread_started` y `assistant_thread_context_changed`; los hilos del asistente se enrutan a sus propias sesiones de hilos de OpenClaw y mantienen el contexto de hilo proporcionado por Slack disponible para el agente.

<AccordionGroup>
  <Accordion title="Comandos de barra nativos opcionales">

    Se pueden usar múltiples [comandos de barra nativos](#commands-and-slash-behavior) en lugar de un solo comando configurado con matices:

    - Use `/agentstatus` en lugar de `/status` porque el comando `/status` está reservado.
    - No se pueden poner a disposición más de 25 comandos de barra a la vez.

    Reemplace su sección `features.slash_commands` existente con un subconjunto de [comandos disponibles](/es/tools/slash-commands#command-list):

    <Tabs>
      <Tab title="Modo Socket (predeterminado)">

```json
{
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
      "usage_hint": "<level>"
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
      "command": "/approve",
      "description": "Approve or deny pending approval requests",
      "usage_hint": "<id> <decision>"
    },
    {
      "command": "/model",
      "description": "Show or set the model",
      "usage_hint": "[name|#|status]"
    },
    {
      "command": "/models",
      "description": "List providers/models",
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
      "command": "/side",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/usage",
      "description": "Control the usage footer or show cost summary",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab title="URLs de solicitud HTTP">
        Use la misma lista `slash_commands` que en el Modo Socket anterior y agregue `"url": "https://gateway-host.example.com/slack/events"` a cada entrada. Ejemplo:

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]",
      "url": "https://gateway-host.example.com/slack/events"
    },
    {
      "command": "/help",
      "description": "Show the short help summary",
      "url": "https://gateway-host.example.com/slack/events"
    }
  ]
}
```

        Repita ese valor `url` en cada comando de la lista.

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="Ámbitos de autoría opcionales (operaciones de escritura)">
    Agregue el ámbito de bot `chat:write.customize` si desea que los mensajes salientes utilicen la identidad del agente activo (nombre de usuario e icono personalizados) en lugar de la identidad predeterminada de la aplicación de Slack.

    Si usa un icono de emoji, Slack espera la sintaxis `:emoji_name:`.

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    Si configura `channels.slack.userToken`, los alcances de lectura típicos son:

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

- `botToken` + `appToken` son necesarios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas
  de texto sin formato u objetos SecretRef.
- Los tokens de configuración anulan la alternativa de env (env fallback).
- La reserva de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` es solo de configuración (sin reserva de entorno) y el valor predeterminado es el comportamiento de solo lectura (`userTokenReadOnly: true`).

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack rastrea los campos `*Source` y `*Status`
  por credencial (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef
  u otra fuente de secreto que no sea en línea, pero la ruta de comando/tiempo de ejecución
  actual no pudo resolver el valor real.
- En modo HTTP, se incluye `signingSecretStatus`; en modo Socket, el
  par requerido es `botTokenStatus` + `appTokenStatus`.

<Tip>Para acciones/lecturas de directorio, se puede preferir el token de usuario cuando está configurado. Para escrituras, se sigue prefiriendo el token de bot; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y puertas

Las acciones de Slack están controladas por `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo                | Predeterminado |
| -------------------- | -------------- |
| mensajes             | habilitado     |
| reacciones           | habilitado     |
| fijados              | habilitado     |
| informaciónDeMiembro | habilitado     |
| listaDeEmojis        | habilitado     |

Las acciones actuales de mensajes de Slack incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`. `download-file` acepta los IDs de archivo de Slack que se muestran en los marcadores de posición de archivos entrantes y devuelve vistas previas de imágenes para imágenes o metadatos de archivos locales para otros tipos de archivos.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a MD. `channels.slack.allowFrom` es la lista de permitidos (allowlist) canónica para MD.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`)
    - `disabled`

    Marcadores de MD:

    - `dm.enabled` (predeterminado true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (heredado)
    - `dm.groupEnabled` (grupos de MD predeterminado false)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está establecido.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    El `channels.slack.dm.policy` heredado y `channels.slack.dm.allowFrom` todavía se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    El emparejamiento en MD usa `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Política de canal">
    `channels.slack.groupPolicy` controla el manejo de canales:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos (allowlist) de canales se encuentra en `channels.slack.channels` y **debe usar IDs de canal de Slack estables** (por ejemplo `C12345678`) como claves de configuración.

    Nota de ejecución: si `channels.slack` falta completamente (configuración solo por entorno), la ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está establecido).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos de canales y las entradas de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombre de canal no resueltas se mantienen tal como se configuraron pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento de canales son prioridad de ID por defecto; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Las claves basadas en nombres (`#channel-name` o `channel-name`) **no** coinciden bajo `groupPolicy: "allowlist"`. La búsqueda de canales es prioridad de ID por defecto, por lo que una clave basada en nombre nunca se enrutará correctamente y todos los mensajes en ese canal se bloquearán silenciosamente. Esto difiere de `groupPolicy: "open"`, donde la clave del canal no es necesaria para el enrutamiento y una clave basada en nombre parece funcionar.

    Use siempre el ID del canal de Slack como clave. Para encontrarlo: haga clic derecho en el canal en Slack → **Copiar enlace** — el ID (`C...`) aparece al final de la URL.

    Correcto:

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { allow: true, requireMention: true },
          },
        },
      },
    }
    ```

    Incorrecto (bloqueado silenciosamente bajo `groupPolicy: "allowlist"`):

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { allow: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están restringidos por menciones de forma predeterminada.

    Fuentes de mención:

    - mención explícita de la aplicación (`<@botId>`)
    - mención del grupo de usuarios de Slack (`<!subteam^S...>`) cuando el usuario bot es miembro de ese grupo de usuarios; requiere `usergroups:read`
    - patrones de regex de mención (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en hilos (desactivado cuando `thread.requireExplicitMention` es `true`)

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución de inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - formato de clave `toolsBySender`: `channel:`, `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía asignan solo a `id:`)

    `allowBots` es conservador para los canales y canales privados: los mensajes de sala creados por bots se aceptan solo cuando el bot remitente está listado explícitamente en la lista de permitidos `users` de esa sala, o cuando al menos un ID de propietario de Slack explícito de `channels.slack.allowFrom` es actualmente miembro de la sala. Los comodines y las entradas de propietario con nombre para mostrar no satisfacen la presencia del propietario. La presencia del propietario utiliza `conversations.members` de Slack; asegúrese de que la aplicación tenga el alcance de lectura correspondiente para el tipo de sala (`channels:read` para canales públicos, `groups:read` para canales privados). Si la búsqueda de miembros falla, OpenClaw descarta el mensaje de sala creado por el bot.

    Los mensajes de Slack creados por bots aceptados utilizan la [protección de bucle de bot](/es/channels/bot-loop-protection) compartida. Configure `channels.defaults.botLoopProtection` para el presupuesto predeterminado, luego anule con `channels.slack.botLoopProtection` o `channels.slack.channels.<id>.botLoopProtection` cuando un espacio de trabajo o canal necesite un límite diferente.

  </Tab>
</Tabs>

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Los enlaces de ruta de Slack aceptan IDs de pares sin procesar además de formas de destino de Slack como `channel:C12345678`, `user:U12345678` y `<@U12345678>`.
- Con el `session.dmScope=main` predeterminado, los MD de Slack colapsan hacia la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Los mensajes ordinarios de nivel superior del canal se mantienen en la sesión por canal, incluso cuando `replyToMode` es distinto de `off`.
- Las respuestas de hilos de Slack usan el `thread_ts` de Slack principal para los sufijos de sesión (`:thread:<threadTs>`), incluso cuando el hilado de respuesta saliente está desactivado con `replyToMode="off"`.
- OpenClaw siembra una raíz de canal de nivel superior elegible en `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` cuando se espera que esa raíz inicie un hilo visible de Slack, de modo que la raíz y las respuestas posteriores del hilo compartan una sesión de OpenClaw. Esto se aplica a eventos `app_mention`, coincidencias de bot explícitas o patrones de mención configurados, y canales `requireMention: false` con `replyToMode` distinto de `off`.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se obtienen cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).
- `channels.slack.thread.requireExplicitMention` (predeterminado `false`): cuando es `true`, suprime las menciones implícitas de hilo para que el bot solo responda a menciones `@bot` explícitas dentro de los hilos, incluso cuando el bot ya ha participado en el hilo. Sin esto, las respuestas en un hilo con participación del bot omiten el filtrado `requireMention`.

Controles de hilado de respuestas:

- `channels.slack.replyToMode`: `off|first|all|batched` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- retroalternativa heredada para chats directos: `channels.slack.dm.replyToMode`

Se admiten etiquetas de respuesta manuales:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Para respuestas explícitas de hilos de Slack desde la herramienta `message`, establezca `replyBroadcast: true` con `action: "send"` y `threadId` o `replyTo` para pedir a Slack que también transmita la respuesta del hilo al canal principal. Esto corresponde al indicador `chat.postMessage` `reply_broadcast` de Slack y solo es compatible con envíos de texto o Block Kit, no con cargas de medios.

Cuando una llamada a la herramienta `message` se ejecuta dentro de un hilo de Slack y tiene como objetivo el mismo canal, OpenClaw normalmente hereda el hilo de Slack actual según `replyToMode`. Establezca `topLevel: true` en `action: "send"` o `action: "upload-file"` para forzar un nuevo mensaje de canal principal en su lugar. Se acepta `threadId: null` como la misma opción de exclusión de nivel superior.

<Note>
`replyToMode="off"` deshabilita el hilado de respuestas salientes de Slack, incluidas las etiquetas explícitas `[[reply_to_*]]`. No aplana las sesiones de hilos de Slack entrantes: los mensajes ya publicados dentro de un hilo de Slack aún se enrutan a la sesión `:thread:<threadTs>`. Esto difiere de Telegram, donde las etiquetas explícitas aún se respetan en el modo `"off"`. Los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en línea.
</Note>

## Reacciones de acuse de recibo

`ackReaction` envía un emoji de reconocimiento mientras OpenClaw procesa un mensaje entrante. `ackReactionScope` decide _cuándo_ se envía realmente ese emoji.

### Emoji (`ackReaction`)

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de identidad del agente de retroalternativa (`agents.list[].identity.emoji`, si no `"eyes"` / 👀)

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para deshabilitar la reacción para la cuenta de Slack o globalmente.

### Ámbito (`messages.ackReactionScope`)

El proveedor de Slack lee el ámbito desde `messages.ackReactionScope` (por defecto `"group-mentions"`). Hoy en día no hay una invalidación a nivel de cuenta de Slack o de canal de Slack; el valor es global para la puerta de enlace.

Valores:

- `"all"`: reacciona en mensajes directos y grupos.
- `"direct"`: reacciona solo en mensajes directos.
- `"group-all"`: reacciona en cada mensaje de grupo (sin mensajes directos).
- `"group-mentions"` (predeterminado): reacciona en grupos, pero solo cuando el bot es mencionado (o en grupos mencionables que han optado por participar). **Los mensajes directos están excluidos.**
- `"off"` / `"none"`: nunca reacciona.

<Note>
  El ámbito predeterminado (`"group-mentions"`) no activa reacciones de reconocimiento en mensajes directos. Para ver el `ackReaction` configurado (por ejemplo `"eyes"`) en los mensajes directos entrantes de Slack, configure `messages.ackReactionScope` como `"direct"` o `"all"`. `messages.ackReactionScope` se lee al iniciar el proveedor de Slack, por lo que es necesario reiniciar la puerta de
  enlace para que el cambio surta efecto.
</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // react in DMs and groups
  },
}
```

## Text streaming

`channels.slack.streaming` controla el comportamiento de la vista previa en vivo:

- `off`: desactiva la transmisión de vista previa en vivo.
- `partial` (predeterminado): reemplaza el texto de vista previa con la última salida parcial.
- `block`: añade actualizaciones de vista previa fragmentadas.
- `progress`: muestra el texto de estado de progreso mientras se genera, y luego envía el texto final.
- `streaming.preview.toolProgress`: cuando la vista previa de borrador está activa, envía las actualizaciones de herramientas/progreso al mismo mensaje de vista previa editado (predeterminado: `true`). Configure `false` para mantener mensajes de herramientas/progreso separados.
- `streaming.preview.commandText` / `streaming.progress.commandText`: establezca en `status` para mantener líneas compactas de progreso de herramientas mientras se oculta el texto de comando/exec sin procesar (predeterminado: `raw`).

Ocultar el texto de comando/ejecución sin procesar mientras se mantienen las líneas de progreso compactas:

```json
{
  "channels": {
    "slack": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

`channels.slack.streaming.nativeTransport` controla la transmisión de texto nativa de Slack cuando `channels.slack.streaming.mode` es `partial` (predeterminado: `true`).

Las tarjetas de tareas de progreso nativas de Slack son opcionales para el modo de progreso. Establezca `channels.slack.streaming.progress.nativeTaskCards` en `true` con `channels.slack.streaming.mode="progress"` para enviar una tarjeta de plan/tarea nativa de Slack mientras se ejecuta el trabajo y luego actualizar la misma tarjeta de tareas al finalizar. Sin esta marca, el modo de progreso mantiene el comportamiento de vista previa de borrador portátil.

- Debe haber un hilo de respuesta disponible para que aparezca la transmisión de texto nativa y el estado del hilo del asistente de Slack. La selección de hilo todavía sigue `replyToMode`.
- Las raíces de nivel superior de canales, chats grupales y MDs aún pueden usar la vista previa de borrador normal cuando la transmisión nativa no está disponible o no existe un hilo de respuesta.
- Los MDs de nivel superior de Slack permanecen fuera del hilo de forma predeterminada, por lo que no muestran la vista previa de flujo/estado nativa estilo hilo de Slack; en su lugar, OpenClaw publica y edita una vista previa de borrador en el MD.
- Las cargas útiles de medios y las que no son de texto vuelven a la entrega normal.
- Los finales de medios/errores cancelan las ediciones de vista previa pendientes; los finales de texto/bloque elegibles solo se envían cuando pueden editar la vista previa en su lugar.
- Si la transmisión falla a mitad de una respuesta, OpenClaw vuelve a la entrega normal para las cargas útiles restantes.

Usar la vista previa de borrador en lugar de la transmisión de texto nativa de Slack:

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

Optar por las tarjetas de tareas de progreso nativas de Slack:

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          nativeTaskCards: true,
          render: "rich",
        },
      },
    },
  },
}
```

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode`.
- el valor booleano `channels.slack.streaming` es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode` y `channels.slack.streaming.nativeTransport`.
- el valor heredado `channels.slack.nativeStreaming` es un alias de tiempo de ejecución para `channels.slack.streaming.nativeTransport`.
- Ejecute `openclaw doctor --fix` para reescribir la configuración de transmisión de Slack persistente a las claves canónicas.

## Respaldo de reacción de escribiendo

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas en hilos, que usan un indicador de estado "escribiendo..." predeterminado.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera shortcodes (por ejemplo `"hourglass_flowing_sand"`).
- La reacción es de mejor esfuerzo y la limpieza se intenta automáticamente después de que se completa la ruta de respuesta o error.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URL privadas alojadas en Slack (flujo de solicitud autenticado por token) y se escriben en el almacén de medios cuando la descarga tiene éxito y los límites de tamaño lo permiten. Los marcadores de posición de archivos incluyen el `fileId` de Slack para que los agentes puedan obtener el archivo original con `download-file`.

    Las descargas usan tiempos de espera limitados de inactividad y totales. Si la recuperación del archivo de Slack se detiene o falla, OpenClaw continúa procesando el mensaje y recurre al marcador de posición del archivo.

    El límite de tamaño de entrada en tiempo de ejecución es `20MB` de forma predeterminada, a menos que se anule con `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texto y archivos salientes">
    - los fragmentos de texto usan `channels.slack.textChunkLimit` (predeterminado 4000)
    - `channels.slack.chunkMode="newline"` habilita la división prioritaria de párrafos
    - el envío de archivos usa las APIs de carga de Slack y puede incluir respuestas de hilos (`thread_ts`)
    - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los envíos de canales usan los valores predeterminados de tipo MIME de la canalización de medios

  </Accordion>

  <Accordion title="Destinos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MD de Slack de solo texto/bloques pueden publicarse directamente en los ID de usuario; las cargas de archivos y los envíos en hilos abren el MD primero a través de las APIs de conversación de Slack porque esas rutas requieren un ID de conversación concreto.

  </Accordion>
</AccordionGroup>

## Comandos y comportamiento de barras

Los comandos de barra aparecen en Slack como un solo comando configurado o múltiples comandos nativos. Configure `channels.slack.slashCommand` para cambiar los valores predeterminados de los comandos:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Los comandos nativos requieren [configuraciones de manifiesto adicionales](#additional-manifest-settings) en su aplicación de Slack y se habilitan con `channels.slack.commands.native: true` o `commands.native: true` en las configuraciones globales en su lugar.

- El modo automático de comandos nativos está **desactivado** para Slack, por lo que `commands.native: "auto"` no habilita los comandos nativos de Slack.

```txt
/help
```

Los menús de argumentos nativos utilizan una estrategia de renderizado adaptativo que muestra un modal de confirmación antes de enviar el valor de una opción seleccionada:

- hasta 5 opciones: bloques de botones
- 6-100 opciones: menú de selección estática
- más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando hay controladores de opciones de interactividad disponibles
- límites de Slack excedidos: los valores de las opciones codificadas vuelven a los botones

```txt
/think
```

Las sesiones de slash usan claves aisladas como `agent:<agentId>:slack:slash:<userId>` y aún enrutan las ejecuciones de comandos a la sesión de conversación de destino usando `CommandTargetSessionKey`.

## Respuestas interactivas

Slack puede renderizar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.
Para nuevos resultados de agente, CLI y complementos, prefiera los botones o bloques de selección compartidos `presentation`. Utilizan la misma ruta de interacción de Slack
mientras que también se degradan en otros canales.

Actívelo globalmente:

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

O actívelo solo para una cuenta de Slack:

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

Cuando está habilitado, los agentes aún pueden emitir directivas de respuesta obsoletas exclusivas de Slack:

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Estas directivas se compilan en Slack Block Kit y enrutan clics o selecciones
a través de la ruta del evento de interacción existente de Slack. Manténgalas para viejas
instrucciones y escapehatches específicos de Slack; use presentación compartida para nuevos
controles portátiles.

Las API del compilador de directivas también están obsoletas para el nuevo código de productor:

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

Use cargas útiles `presentation` y `buildSlackPresentationBlocks(...)` para nuevos
controles renderizados por Slack.

Notas:

- Esta es una interfaz de usuario heredada específica de Slack. Otros canales no traducen las directivas de Slack Block
  Kit en sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores creados por el agente en bruto.
- Si los bloques interactivos generados exceden los límites de Slack Block Kit, OpenClaw recurre a la respuesta de texto original en lugar de enviar una carga útil de bloques no válida.

### Envíos de modales propiedad del complemento

Los complementos de Slack que registran un controlador interactivo también pueden recibir eventos del ciclo de vida modal `view_submission` y `view_closed` antes de que OpenClaw compacte la carga útil para el evento del sistema visible por el agente. Use uno de estos patrones de enrutamiento al abrir un modal de Slack:

- Establezca `callback_id` en `openclaw:<namespace>:<payload>`.
- O conserve un `callback_id` existente y coloque `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`.

El controlador recibe `ctx.interaction.kind` como `view_submission` o
`view_closed`, `inputs` normalizado y el objeto `stateValues` sin procesar completo de Slack. El enrutamiento solo por callback-id es suficiente para invocar el controlador del complemento; incluya los campos de enrutamiento de usuario/sesión del modal `private_metadata` existentes cuando el modal también debe producir un evento del sistema visible por el agente. El agente recibe un evento del sistema `Slack interaction: ...` compacto y redactado. Si el controlador devuelve `systemEvent.summary`, `systemEvent.reference` o `systemEvent.data`, esos campos se incluyen en ese evento compacto para que el agente pueda hacer referencia al almacenamiento propiedad del complemento sin ver la carga completa del formulario.

## Aprobaciones nativas en Slack

Slack puede actuar como un cliente de aprobación nativo con botones e interacciones interactivas, en lugar de recurrir a la interfaz de usuario web o a la terminal.

- Las aprobaciones de ejecución y de complementos pueden renderizarse como indicadores de Block Kit nativos de Slack.
- `channels.slack.execApprovals.*` sigue siendo la habilitación del cliente de aprobación de ejecución nativa y la configuración de enrutamiento de DM/canal.
- Los DM de aprobación de ejecución usan `channels.slack.execApprovals.approvers` o `commands.ownerAllowFrom`.
- Las aprobaciones de complementos usan botones nativos de Slack cuando Slack está habilitado como cliente de aprobación nativo para la sesión de origen, o cuando `approvals.plugin` enruta a la sesión de Slack de origen o a un destino de Slack.
- Los mensajes directos de aprobación de complementos usan los aprobadores de complementos de Slack de `channels.slack.allowFrom`, la cuenta con nombre `allowFrom` o la ruta predeterminada de la cuenta.
- La autorización del aprobador todavía se hace cumplir: los aprobadores de solo ejecución no pueden aprobar solicitudes de complementos a menos que también sean aprobadores de complementos.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las solicitudes de aprobación se renderizan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la UX principal de aprobación; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones
del chat no están disponibles o la aprobación manual es la única ruta.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; se usa `commands.ownerAllowFrom` de forma alternativa cuando es posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está definido o es `"auto"` y al menos un
aprobador de ejecución resuelve. Slack también puede manejar aprobaciones de complementos nativas a través de esta ruta de cliente nativo
cuando los aprobadores de complementos de Slack resuelven y la solicitud coincide con los filtros de cliente nativo. Establece
`enabled: false` para deshabilitar explícitamente Slack como cliente de aprobación nativa. Establece `enabled: true` para
forzar la activación de las aprobaciones nativas cuando los aprobadores resuelven. Deshabilitar las aprobaciones de ejecución de Slack no deshabilita
la entrega de aprobaciones de complementos de Slack nativas que esté habilitada a través de `approvals.plugin`; la entrega de aprobaciones de complementos
usa los aprobadores de complementos de Slack en su lugar.

Comportamiento predeterminado sin una configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

La configuración nativa explícita de Slack solo es necesaria cuando deseas anular los aprobadores, agregar filtros u
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

El reenvío de `approvals.exec` compartido es independiente. Úselo solo cuando los avisos de aprobación de ejecución también deban enrutarse a otros chats o objetivos explícitos fuera de banda. El reenvío de `approvals.plugin` compartido también es independiente; la entrega nativa de Slack suprime ese respaldo solo cuando Slack puede manejar la solicitud de aprobación del complemento de forma nativa.

El `/approve` del mismo chat también funciona en canales y MD de Slack que ya admiten comandos. Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals) para el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes se asignan a eventos del sistema.
- Las transmisiones de hilos (respuestas de hilo "También enviar al canal") se procesan como mensajes de usuario normales.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de incorporación/salida de miembros, creación/cambio de nombre de canal y agregar/eliminar fijaciones se asignan a eventos del sistema.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador del hilo y la siembra inicial del contexto del historial del hilo se filtran mediante listas de permitidos de remitentes configuradas, cuando corresponda.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema `Slack interaction: ...` estructurados con campos de carga útiles enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores de selector y metadatos de `workflow_*`
  - eventos modales `view_submission` y `view_closed` con metadatos de canal enrutados y entradas de formulario

## Referencia de configuración

Referencia principal: [Referencia de configuración - Slack](/es/gateway/config-channels#slack).

<Accordion title="Campos importantes de Slack">

- modo/autenticación: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- acceso a MD: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- interruptor de compatibilidad: `dangerouslyAllowNameMatching` (de emergencia; manténgalo apagado a menos que sea necesario)
- acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls: `unfurlLinks` (predeterminado: `false`), `unfurlMedia` para el control de vista previa de `chat.postMessage` enlaces/medios; establezca `unfurlLinks: true` para volver a activar las vistas previas de enlaces
- operaciones/funciones: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Solución de problemas

<AccordionGroup>
  <Accordion title="No replies in channels">
    Compruebe, en orden:

    - `groupPolicy`
    - lista de permitidos de canales (`channels.slack.channels`) — **las claves deben ser IDs de canales** (`C12345678`), no nombres (`#channel-name`). Las claves basadas en nombres fallan silenciosamente bajo `groupPolicy: "allowlist"` porque el enrutamiento de canales es prioritario por ID de manera predeterminada. Para encontrar un ID: haga clic derecho en el canal en Slack → **Copy link** — el valor `C...` al final de la URL es el ID del canal.
    - `requireMention`
    - lista de permitidos de `users` por canal
    - `messages.groupChat.visibleReplies`: las solicitudes normales de grupo/canal predeterminan a `"automatic"`. Si optó por `"message_tool"` y los registros muestran texto del asistente sin ninguna llamada `message(action=send)`, el modelo perdió la ruta de la herramienta de mensajes visible. El texto final permanece privado en este modo; inspeccione el registro detallado de la puerta de enlace para metadatos de carga útil suprimidos, o configúrelo en `"automatic"` si desea que cada respuesta final normal del asistente se publique a través de la ruta heredada.
    - `messages.groupChat.unmentionedInbound`: si es `"room_event"`, las conversaciones permitidas del canal sin mención son contexto ambiental y permanecen en silencio a menos que el agente llame a la herramienta `message`. Consulte [Ambient room events](/es/channels/ambient-room-events).

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes de DM ignorados">
    Comprobar:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el heredado `channels.slack.dm.policy`)
    - aprobaciones de emparejamiento / entradas de lista de permitidos (`dmPolicy: "open"` todavía requiere `channels.slack.allowFrom: ["*"]`)
    - los mensajes directos de grupo usan el manejo MPIM; habilite `channels.slack.dm.groupEnabled` y, si está configurado, incluya el MPIM en `channels.slack.dm.groupChannels`
    - eventos de DM del Asistente de Slack: los registros detallados que mencionan `drop message_changed`
      generalmente significan que Slack envió un evento de hilo del Asistente editado sin un
      remitente humano recuperable en los metadatos del mensaje

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Modo socket no se conecta">
    Valide los tokens de bot + aplicación y la habilitación del Modo Socket en la configuración de la aplicación de Slack.
    El Token a Nivel de Aplicación necesita `connections:write` y el Token de OAuth de Usuario de Bot
    debe pertenecer a la misma aplicación/espacio de trabajo de Slack que el token de la aplicación.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada pero el tiempo de ejecución actual no pudo resolver el valor
    respaldado por SecretRef.

    Registros como `slack socket mode failed to start; retry ...` son fallos de inicio
    recuperables. Los alcances faltantes, los tokens revocados y la autenticación no válida fallan rápidamente
    en su lugar. Un registro `slack token mismatch ...` significa que el token de bot y el token de aplicación
    parecen pertenecer a diferentes aplicaciones de Slack; corrija las credenciales de la aplicación de Slack.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Valide:

    - signing secret (secreto de firma)
    - webhook path (ruta del webhook)
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - `webhookPath` único por cuenta HTTP
    - la URL pública termina TLS y reenvía las solicitudes a la ruta del Gateway
    - la ruta `request_url` de la aplicación de Slack coincide exactamente con `channels.slack.webhookPath` (por defecto `/slack/events`)

    Si `signingSecretStatus: "configured_unavailable"` aparece en las instantáneas
    de la cuenta, la cuenta HTTP está configurada pero el tiempo de ejecución actual no pudo
    resolver el secreto de firma respaldado por SecretRef.

    Un registro repetido `slack: webhook path ... already registered` significa que dos cuentas HTTP
    están usando el mismo `webhookPath`; asigne una ruta distinta a cada cuenta.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Verifique si tenía la intención de:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra único (`channels.slack.slashCommand.enabled: true`)

    Slack no crea ni elimina comandos de barra automáticamente. `commands.native: "auto"` no habilita los comandos nativos de Slack; use `true` y cree los comandos coincidentes en la aplicación de Slack. En modo HTTP, cada comando de barra de Slack debe incluir la URL del Gateway. En modo Socket, las cargas útiles de los comandos llegan a través del websocket y Slack ignora `slash_commands[].url`.

    También verifique `commands.useAccessGroups`, la autorización de DM, las listas permitidas de canales,
    y las listas permitidas `users` por canal. Slack devuelve errores efímeros para
    los remitentes de comandos de barra bloqueados, incluyendo:

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## Referencia de visión de adjuntos

Slack puede adjuntar medios descargados al turno del agente cuando las descargas de archivos de Slack tienen éxito y los límites de tamaño lo permiten. Los archivos de imagen pueden pasarse a través de la ruta de comprensión de medios o directamente a un modelo de respuesta con capacidad de visión; otros archivos se conservan como contexto de archivo descargable en lugar de ser tratados como entrada de imagen.

### Tipos de medios compatibles

| Tipo de medio                    | Fuente                          | Comportamiento actual                                                                                      | Notas                                                                                    |
| -------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Imágenes JPEG / PNG / GIF / WebP | URL de archivo de Slack         | Descargado y adjunto al turno para el manejo con capacidad de visión                                       | Límite por archivo: `channels.slack.mediaMaxMb` (20 MB de forma predeterminada)          |
| Archivos PDF                     | URL de archivo de Slack         | Descargado y expuesto como contexto de archivo para herramientas como `download-file` o `pdf`              | Slack entrante no convierte los archivos PDF en entrada de imagen-visión automáticamente |
| Otros archivos                   | URL de archivo de Slack         | Descargado cuando sea posible y expuesto como contexto de archivo                                          | Los archivos binarios no se tratan como entrada de imagen                                |
| Respuestas de hilos              | Archivos del iniciador del hilo | Los archivos de mensaje raíz se pueden hidratar como contexto cuando la respuesta no tiene medios directos | Los iniciadores que solo tienen archivos usan un marcador de posición de archivo adjunto |
| Mensajes con múltiples imágenes  | Múltiples archivos de Slack     | Cada archivo se evalúa de forma independiente                                                              | El procesamiento de Slack está limitado a ocho archivos por mensaje                      |

### Canal de entrada

Cuando llega un mensaje de Slack con archivos adjuntos:

1. OpenClaw descarga el archivo desde la URL privada de Slack utilizando el token del bot.
2. El archivo se escribe en el almacén de medios tras una descarga exitosa.
3. Las rutas de los medios descargados y los tipos de contenido se agregan al contexto de entrada.
4. Las rutas de modelo/herramienta con capacidad de imagen pueden usar archivos adjuntos de ese contexto.
5. Los archivos que no son imágenes permanecen disponibles como metadatos de archivo o referencias de medios para herramientas que puedan manejarlos.

### Herencia de adjuntos de raíz de hilo

Cuando llega un mensaje en un hilo (tiene un padre `thread_ts`):

- Si la respuesta en sí no tiene medios directos y el mensaje raíz incluido tiene archivos, Slack puede hidratar los archivos raíz como contexto de iniciador del hilo.
- Los adjuntos de respuesta directa tienen prioridad sobre los adjuntos del mensaje raíz.
- Un mensaje raíz que solo tiene archivos y sin texto se representa con un marcador de posición de adjunto para que la alternativa aún pueda incluir sus archivos.

### Manejo de múltiples adjuntos

Cuando un solo mensaje de Slack contiene múltiples archivos adjuntos:

- Cada adjunto se procesa de forma independiente a través de la canalización de medios.
- Las referencias de medios descargados se agregan en el contexto del mensaje.
- El orden de procesamiento sigue el orden de archivos de Slack en la carga útil del evento.
- Un fallo en la descarga de un adjunto no bloquea a los demás.

### Límites de tamaño, descarga y modelo

- **Límite de tamaño**: 20 MB de forma predeterminada por archivo. Configurable mediante `channels.slack.mediaMaxMb`.
- **Fallos de descarga**: Se omiten los archivos que Slack no puede servir, las URLs caducadas, los archivos inaccesibles, los archivos demasiado grandes y las respuestas HTML de autenticación/inicio de sesión de Slack, en lugar de informarse como formatos no admitidos.
- **Modelo de visión**: El análisis de imágenes utiliza el modelo de respuesta activo cuando admite visión, o el modelo de imagen configurado en `agents.defaults.imageModel`.

### Límites conocidos

| Escenario                                              | Comportamiento actual                                                                                       | Solución                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| URL de archivo de Slack caducada                       | Archivo omitido; no se muestra ningún error                                                                 | Volver a subir el archivo en Slack                                                                |
| Modelo de visión no configurado                        | Los adjuntos de imagen se almacenan como referencias de medios, pero no se analizan como imágenes           | Configure `agents.defaults.imageModel` o utilice un modelo de respuesta con capacidad de visión   |
| Imágenes muy grandes (> 20 MB de forma predeterminada) | Omitido según el límite de tamaño                                                                           | Aumente `channels.slack.mediaMaxMb` si Slack lo permite                                           |
| Adjuntos reenviados/compartidos                        | Los textos y los medios de imagen/archivo alojados en Slack se procesan en la medida de lo posible          | Comparta de nuevo directamente en el hilo de OpenClaw                                             |
| Adjuntos PDF                                           | Almacenados como contexto de archivo/medios, no enrutados automáticamente a través de la visión de imágenes | Use `download-file` para los metadatos del archivo o la herramienta `pdf` para el análisis de PDF |

### Documentación relacionada

- [Canalización de comprensión de medios](/es/nodes/media-understanding)
- [Herramienta PDF](/es/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Habilitación de visión de adjuntos de Slack
- Pruebas de regresión: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- Verificación en vivo: [#51354](https://github.com/openclaw/openclaw/issues/51354)

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Slack con la pasarela.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de canales y mensajes directos de grupo.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a los agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Configuración" icon="sliders" href="/es/gateway/configuration">
    Diseño y precedencia de la configuración.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Catálogo y comportamiento de comandos.
  </Card>
</CardGroup>
