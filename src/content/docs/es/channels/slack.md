---
summary: "Configuración y comportamiento de ejecución de Slack (Modo Socket + URLs de Solicitud HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Listo para producción para MDs y canales mediante integraciones de aplicaciones de Slack. El modo predeterminado es Socket Mode; también se admiten URLs de solicitud HTTP.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Slack tienen por defecto el modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento nativo de comandos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Elegir entre Socket Mode y URL de solicitud HTTP

Ambos transportes están listos para producción y alcanzan paridad de características para mensajería, comandos de barra, App Home e interactividad. Elija según la forma de implementación, no las características.

| Preocupación                                   | Socket Mode (predeterminado)                                                                                                           | URL de solicitud HTTP                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| URL de puerta de enlace pública                | No requerido                                                                                                                           | Requerido (DNS, TLS, proxy inverso o túnel)                                                                                 |
| Red saliente                                   | El WSS saliente hacia `wss-primary.slack.com` debe ser accesible                                                                       | Sin WS saliente; solo HTTPS entrante                                                                                        |
| Tokens necesarios                              | Token de bot (`xoxb-...`) + Token de nivel de aplicación (`xapp-...`) con `connections:write`                                          | Token de bot (`xoxb-...`) + Signing Secret                                                                                  |
| Portátil de desarrollo / detrás de un firewall | Funciona tal cual                                                                                                                      | Necesita un túnel público (ngrok, Cloudflare Tunnel, Tailscale Funnel) o una puerta de enlace de ensayo                     |
| Escalado horizontal                            | Una sesión de Socket Mode por aplicación por host; múltiples puertas de enlace necesitan aplicaciones de Slack separadas               | Manejador POST sin estado; múltiples réplicas de Gateway pueden compartir una aplicación detrás de un equilibrador de carga |
| Multicuenta en una sola puerta de enlace       | Compatible; cada cuenta abre su propio WS                                                                                              | Compatible; cada cuenta necesita un `webhookPath` único (por defecto `/slack/events`) para que los registros no colisionen  |
| Transporte de comandos de barra                | Entregado a través de la conexión WS; se ignora `slash_commands[].url`                                                                 | Slack hace POST a `slash_commands[].url`; el campo es obligatorio para que el comando se envíe                              |
| Firma de la solicitud                          | No se utiliza (la autenticación es el Token de nivel de aplicación)                                                                    | Slack firma cada solicitud; OpenClaw verifica con `signingSecret`                                                           |
| Recuperación ante la caída de la conexión      | El SDK de Slack se vuelve a conectar automáticamente; se aplica la optimización del transporte de tiempo de espera de pong del gateway | No hay conexión persistente que se caiga; los reintentos son por solicitud desde Slack                                      |

<Note>
  **Elija el Modo Socket** para hosts de una sola pasarela, computadoras portátiles de desarrollo y redes locales que puedan alcanzar `*.slack.com` de forma saliente pero no puedan aceptar HTTPS entrante.

**Elija las URLs de Solicitud HTTP** cuando ejecute varias réplicas de la pasarela detrás de un equilibrador de carga, cuando el WSS saliente está bloqueado pero se permite HTTPS entrante, o cuando ya finalice los webhooks de Slack en un proxy inverso.

</Note>

## Instalación

Instale Slack antes de configurar el canal:

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` registra y habilita el complemento. El complemento aún no hace nada hasta que configures la aplicación de Slack y la configuración del canal a continuación. Consulta [Plugins](/es/tools/plugin) para conocer el comportamiento general del complemento y las reglas de instalación.

## Configuración rápida

<Tabs>
  <Tab title="Socket Mode (predeterminado)">
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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** coincide con el conjunto completo de funciones del complemento de Slack: App Home, comandos de barra, archivos, reacciones, pines, MD de grupo y lecturas de emojis/grupos de usuarios. Elige **Minimal** cuando la política del espacio de trabajo restrinja los alcances; cubre MD, historial de canales/grupos, menciones y comandos de barra, pero omite archivos, reacciones, pines, MD de grupo (`mpim:*`), `emoji:read` y `usergroups:read`. Consulta [Manifest and scope checklist](#manifest-and-scope-checklist) para conocer la justificación por alcance y las opciones aditivas, como comandos de barra adicionales.
        </Note>

        Una vez que Slack crea la aplicación:

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**: añade `connections:write`, guarda, copia el valor del `xapp-...`.
        - **Install App → Install to Workspace**: copia el Bot User OAuth Token `xoxb-...`.

      </Step>

      <Step title="Configurar OpenClaw">

        Configuración recomendada de SecretRef:

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
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

        Alternativa de entorno (solo cuenta predeterminada):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Iniciar la puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="URL de solicitud HTTP">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        Abre [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → selecciona tu espacio de trabajo → pega uno de los manifiestos a continuación → reemplaza `https://gateway-host.example.com/slack/events` con tu URL pública de Gateway → **Next** → **Create**.

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
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
          **Recommended** (Recomendado) coincide con el conjunto completo de funciones del complemento de Slack; **Minimal** (Mínimo) omite archivos, reacciones, anclajes, mensajes grupales (`mpim:*`), `emoji:read` y `usergroups:read` para espacios de trabajo restrictivos. Consulta [Manifest and scope checklist](#manifest-and-scope-checklist) para ver la justificación por cada ámbito.
        </Note>

        <Info>
          Los tres campos de URL (`slash_commands[].url`, `event_subscriptions.request_url` y `interactivity.request_url` / `message_menu_options_url`) apuntan todos al mismo endpoint de OpenClaw. El esquema de manifiesto de Slack exige que se nombren por separado, pero OpenClaw enruta por tipo de carga, por lo que un solo `webhookPath` (por defecto `/slack/events`) es suficiente. Los comandos de barra sin `slash_commands[].url` no harán nada silenciosamente en modo HTTP.
        </Info>

        Una vez que Slack cree la aplicación:

        - **Basic Information → App Credentials**: copia el **Signing Secret** para la verificación de solicitudes.
        - **Install App → Install to Workspace**: copia el token de OAuth de usuario de Bot `xoxb-...`.

      </Step>

      <Step title="Configurar OpenClaw">

        Configuración recomendada de SecretRef:

```bash
export SLACK_BOT_TOKEN=xoxb-...
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
        Usa rutas de webhook únicas para HTTP multicuenta

        Dale a cada cuenta un `webhookPath` distinto (por defecto `/slack/events`) para que los registros no colisionen.
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

Use esto solo para espacios de trabajo en modo Socket que registren tiempos de espera de pong del websocket de Slack/pings del servidor o que se ejecuten en hosts con inanición conocida del bucle de eventos. `clientPingTimeout` es la espera de pong después de que el SDK envía un ping de cliente; `serverPingTimeout` es la espera de los pings del servidor de Slack. Los mensajes y eventos de la aplicación siguen siendo estado de la aplicación, no señales de actividad del transporte.

## Lista de verificación de manifiesto y alcances

El manifiesto base de la aplicación de Slack es el mismo para el modo Socket y las URLs de solicitud HTTP. Solo difiere el bloque `settings` (y el comando de barra `url`).

Manifiesto base (predeterminado del modo Socket):

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

Para el **modo de URLs de solicitud HTTP**, reemplace `settings` con la variante HTTP y agregue `url` a cada comando de barra. Se requiere una URL pública:

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### Configuraciones adicionales del manifiesto

Exponga diferentes características que extiendan los valores predeterminados anteriores.

El manifiesto predeterminado habilita la pestaña **Home** de la App Home de Slack y se suscribe a `app_home_opened`. Cuando un miembro del espacio de trabajo abre la pestaña Home, OpenClaw publica una vista Home predeterminada segura con `views.publish`; no se incluye ningún payload de conversación ni configuración privada. La pestaña **Messages** permanece habilitada para los DM de Slack.

<AccordionGroup>
  <Accordion title="Comandos de barra nativos opcionales">

    Se pueden usar múltiples [comandos de barra nativos](#commands-and-slash-behavior) en lugar de un solo comando configurado con matices:

    - Use `/agentstatus` en lugar de `/status` porque el comando `/status` está reservado.
    - No se pueden hacer disponibles más de 25 comandos de barra a la vez.

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
    Agregue el ámbito de bot `chat:write.customize` si desea que los mensajes salientes usen la identidad del agente activo (nombre de usuario e icono personalizados) en lugar de la identidad predeterminada de la aplicación de Slack.

    Si usa un icono de emoji, Slack espera la sintaxis `:emoji_name:`.

  </Accordion>
  <Accordion title="Ámbitos de token de usuario opcionales (operaciones de lectura)">
    Si configura `channels.slack.userToken`, los ámbitos de lectura típicos son:

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si depende de lecturas de búsqueda de Slack)

  </Accordion>
</AccordionGroup>

## Modelo de token

- `botToken` + `appToken` son necesarios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas de texto en formato plano u objetos SecretRef.
- Los tokens de configuración anulan el respaldo de entorno (env fallback).
- El respaldo de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin respaldo de entorno) y por defecto tiene un comportamiento de solo lectura (`userTokenReadOnly: true`).

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack rastrea los campos `*Source` y `*Status` por credencial (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef u otra fuente de secreto que no está en línea, pero la ruta del comando/tiempo de ejecución actual no pudo resolver el valor real.
- En modo HTTP, se incluye `signingSecretStatus`; en modo Socket, el par requerido es `botTokenStatus` + `appTokenStatus`.

<Tip>Para las acciones/lecturas de directorio, se puede preferir el token de usuario cuando está configurado. Para las escrituras, se sigue prefiriendo el token de bot; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y puertas (gates)

Las acciones de Slack están controladas por `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo                | Predeterminado |
| -------------------- | -------------- |
| mensajes             | activado       |
| reacciones           | activado       |
| fijados              | activado       |
| informaciónDeMiembro | activado       |
| listaDeEmojis        | activado       |

Las acciones de mensajes de Slack actuales incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`. `download-file` acepta los IDs de archivo de Slack que se muestran en los marcadores de posición de archivos entrantes y devuelve vistas previas de imágenes para imágenes o metadatos de archivos locales para otros tipos de archivos.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a MD. `channels.slack.allowFrom` es la lista blanca (allowlist) canónica de MD.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`)
    - `disabled`

    Marcadores de MD:

    - `dm.enabled` (predeterminado verdadero)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (heredado)
    - `dm.groupEnabled` (grupos de MD predeterminado falso)
    - `dm.groupChannels` (lista blanca de MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propia `allowFrom` no está establecida.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    Los `channels.slack.dm.policy` y `channels.slack.dm.allowFrom` heredados todavía se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    El emparejamiento en MD usa `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` controla el manejo del canal:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos (allowlist) del canal se encuentra en `channels.slack.channels` y **debe usar IDs de canal estables de Slack** (por ejemplo `C12345678`) como claves de configuración.

    Nota de ejecución: si `channels.slack` falta completamente (configuración solo por env), el tiempo de ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos de canales y las entradas de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombres de canal no resueltos se mantienen según lo configurado pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento de canales priorizan el ID de forma predeterminada; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Las claves basadas en nombres (`#channel-name` o `channel-name`) **no** coinciden en `groupPolicy: "allowlist"`. La búsqueda del canal prioriza el ID de forma predeterminada, por lo que una clave basada en nombres nunca enrutará correctamente y todos los mensajes en ese canal se bloquearán silenciosamente. Esto difiere de `groupPolicy: "open"`, donde la clave del canal no es necesaria para el enrutamiento y una clave basada en nombres parece funcionar.

    Utilice siempre el ID del canal de Slack como clave. Para encontrarlo: haga clic derecho en el canal en Slack → **Copiar enlace** — el ID (`C...`) aparece al final de la URL.

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

    Incorrecto (bloqueado silenciosamente en `groupPolicy: "allowlist"`):

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

    Fuentes de menciones:

    - mención explícita de la aplicación (`<@botId>`)
    - mención del grupo de usuarios de Slack (`<!subteam^S...>`) cuando el usuario bot es miembro de ese grupo de usuarios; requiere `usergroups:read`
    - patrones de regex de menciones (`agents.list[].groupChat.mentionPatterns`, alternativa `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de hilo de respuesta al bot (desactivado cuando `thread.requireExplicitMention` es `true`)

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución de inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - formato de clave `toolsBySender`: `channel:`, `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo aún se asignan solo a `id:`)

    `allowBots` es conservador para los canales y canales privados: los mensajes de sala creados por el bot se aceptan solo cuando el bot que envía está explícitamente listado en la lista de permitidos `users` de esa sala, o cuando al menos un ID de propietario de Slack explícito de `channels.slack.allowFrom` es actualmente miembro de la sala. Los comodines y las entradas de propietario con nombre para mostrar no satisfacen la presencia del propietario. La presencia del propietario utiliza `conversations.members` de Slack; asegúrese de que la aplicación tenga el ámbito de lectura coincidente para el tipo de sala (`channels:read` para canales públicos, `groups:read` para canales privados). Si la búsqueda de miembros falla, OpenClaw descarta el mensaje de sala creado por el bot.

  </Tab>
</Tabs>

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Los enlaces de ruta de Slack aceptan IDs de pares sin procesar además de formas de destino de Slack como `channel:C12345678`, `user:U12345678` y `<@U12345678>`.
- Con `session.dmScope=main` predeterminado, los MD de Slack colapsan hacia la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas de hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando sea aplicable.
- En canales donde OpenClaw maneja mensajes de nivel superior sin requerir una mención explícita, las rutas `replyToMode` que no son `off` dirigen cada raíz manejada a `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` para que el hilo visible de Slack se asigne a una sesión de OpenClaw desde el primer turno.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se recuperan cuando comienza una nueva sesión de hilo (predeterminado `20`; configure `0` para desactivar).
- `channels.slack.thread.requireExplicitMention` (predeterminado `false`): cuando es `true`, suprime las menciones implícitas de hilo para que el bot solo responda a menciones `@bot` explícitas dentro de los hilos, incluso cuando el bot ya ha participado en el hilo. Sin esto, las respuestas en un hilo en el que participa el bot omiten el filtrado `requireMention`.

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all|batched` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- reserva heredada para chats directos: `channels.slack.dm.replyToMode`

Se admiten etiquetas de respuesta manuales:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Para respuestas explícitas de hilos de Slack desde la herramienta `message`, establezca `replyBroadcast: true` con `action: "send"` y `threadId` o `replyTo` para pedir a Slack que también transmita la respuesta del hilo al canal principal. Esto se corresponde con el indicador `chat.postMessage` `reply_broadcast` de Slack y solo es compatible con envíos de texto o Block Kit, no con cargas de medios.

Cuando una llamada a la herramienta `message` se ejecuta dentro de un hilo de Slack y apunta al mismo canal, OpenClaw normalmente hereda el hilo actual de Slack según `replyToMode`. Establezca `topLevel: true` en `action: "send"` o `action: "upload-file"` para forzar un nuevo mensaje de canal principal en su lugar. Se acepta `threadId: null` como la misma opción de exclusión de nivel superior.

<Note>`replyToMode="off"` deshabilita **todo** el hilado de respuestas en Slack, incluidas las etiquetas explícitas `[[reply_to_*]]`. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. Los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en línea.</Note>

## Reacciones de acuse de recibo

`ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- respaldo de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para deshabilitar la reacción para la cuenta de Slack o globalmente.

## Transmisión de texto

`channels.slack.streaming` controla el comportamiento de la vista previa en vivo:

- `off`: deshabilitar la transmisión de la vista previa en vivo.
- `partial` (predeterminado): reemplazar el texto de vista previa con la última salida parcial.
- `block`: agregar actualizaciones de vista previa fragmentadas.
- `progress`: mostrar texto de estado de progreso mientras se genera, luego enviar el texto final.
- `streaming.preview.toolProgress`: cuando la vista previa del borrador está activa, envía las actualizaciones de herramientas/progreso al mismo mensaje de vista previa editado (predeterminado: `true`). Establezca `false` para mantener mensajes de herramientas/progreso separados.
- `streaming.preview.commandText` / `streaming.progress.commandText`: establézcalo en `status` para mantener líneas compactas de progreso de herramientas mientras se oculta el texto de comando/ejecución sin procesar (predeterminado: `raw`).

Ocultar el texto de comando/ejecución sin procesar manteniendo líneas compactas de progreso:

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

- Debe haber un hilo de respuesta disponible para que aparezca la transmisión de texto nativa y el estado del hilo del asistente de Slack. La selección del hilo aún sigue `replyToMode`.
- Las raíces de nivel superior de canales, chat de grupo y MDs aún pueden usar la vista previa normal del borrador cuando la transmisión nativa no está disponible o no existe un hilo de respuesta.
- Los MDs de nivel superior de Slack permanecen fuera del hilo de forma predeterminada, por lo que no muestran la vista previa nativa de transmisión/estado estilo hilo de Slack; en su lugar, OpenClaw publica y edita una vista previa de borrador en el MD.
- Las cargas útiles de medios y que no son de texto vuelven a la entrega normal.
- Los finales de medios/errores cancelan las ediciones de vista previa pendientes; los finales de texto/bloque elegibles solo se muestran cuando pueden editar la vista previa en su lugar.
- Si la transmisión falla a mitad de una respuesta, OpenClaw vuelve a la entrega normal para las cargas útiles restantes.

Usar la vista previa del borrador en lugar de la transmisión de texto nativa de Slack:

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

- `channels.slack.streamMode` (`replace | status_final | append`) es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode`.
- el booleano `channels.slack.streaming` es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode` y `channels.slack.streaming.nativeTransport`.
- `channels.slack.nativeStreaming` heredado es un alias de tiempo de ejecución para `channels.slack.streaming.nativeTransport`.
- Ejecute `openclaw doctor --fix` para reescribir la configuración de transmisión de Slack persistente a las claves canónicas.

## Respaldo de reacción de escritura

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta, y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas de hilos, que utilizan un indicador de estado "escribiendo..." predeterminado.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera códigos cortos (por ejemplo `"hourglass_flowing_sand"`).
- La reacción se realiza con el mejor esfuerzo posible y se intenta la limpieza automáticamente después de que se completa la respuesta o la ruta de fallo.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URL privadas alojadas en Slack (flujo de solicitud autenticado por token) y se escriben en el almacén de medios cuando la descarga tiene éxito y los límites de tamaño lo permiten. Los marcadores de posición de archivos incluyen el `fileId` de Slack para que los agentes puedan obtener el archivo original con `download-file`.

    Las descargas utilizan tiempos de espera de inactividad y total limitados. Si la recuperación del archivo de Slack se detiene o falla, OpenClaw continúa procesando el mensaje y recurre al marcador de posición del archivo.

    El límite de tamaño de entrada en tiempo de tiempo de ejecución es `20MB` de forma predeterminada, a menos que sea anulado por `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texto y archivos salientes">
    - los fragmentos de texto utilizan `channels.slack.textChunkLimit` (predeterminado 4000)
    - `channels.slack.chunkMode="newline"` habilita la división prioritaria de párrafos
    - el envío de archivos utiliza las APIs de carga de Slack y puede incluir respuestas de hilos (`thread_ts`)
    - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando se configura; de lo contrario, los envíos del canal utilizan los valores predeterminados de tipo MIME de la canalización de medios

  </Accordion>

  <Accordion title="Objetivos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack de solo texto/bloques pueden publicarse directamente en IDs de usuario; las cargas de archivos y los envíos en hilos abren el MD primero a través de las APIs de conversación de Slack porque esas rutas requieren un ID de conversación concreto.

  </Accordion>
</AccordionGroup>

## Comandos y comportamiento de barra

Los comandos de barra aparecen en Slack como un único comando configurado o múltiples comandos nativos. Configure `channels.slack.slashCommand` para cambiar los valores predeterminados de los comandos:

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

Los menús de argumentos nativos utilizan una estrategia de renderizado adaptativo que muestra un modal de confirmación antes de enviar un valor de opción seleccionado:

- hasta 5 opciones: bloques de botones
- 6-100 opciones: menú de selección estática
- más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando hay controladores de opciones de interactividad disponibles
- límites de Slack excedidos: los valores de opción codificados vuelven a los botones

```txt
/think
```

Las sesiones de barra usan claves aisladas como `agent:<agentId>:slack:slash:<userId>` y aún enrutan las ejecuciones de comandos a la sesión de conversación objetivo usando `CommandTargetSessionKey`.

## Respuestas interactivas

Slack puede renderizar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

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

Cuando está habilitado, los agentes pueden emitir directivas de respuesta exclusivas de Slack:

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Estas directivas se compilan en Slack Block Kit y enrutan clics o selecciones de vuelta a través de la ruta de eventos de interacción de Slack existente.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit a sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores sin procesar creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw recurre a la respuesta de texto original en lugar de enviar una carga de bloques no válida.

## Aprobaciones de ejecución en Slack

Slack puede actuar como un cliente de aprobación nativo con botones interactivos e interacciones, en lugar de recurrir a la interfaz de usuario web o al terminal.

- Las aprobaciones de ejecución usan `channels.slack.execApprovals.*` para el enrutamiento nativo de MD/canales.
- Las aprobaciones de complementos aún pueden resolverse a través de la misma superficie de botones nativa de Slack cuando la solicitud ya llega a Slack y el tipo de ID de aprobación es `plugin:`.
- La autorización del aprobador todavía se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las indicaciones de aprobación se representan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la experiencia de usuario de aprobación principal; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones
por chat no están disponibles o la aprobación manual es la única ruta.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; de forma predeterminada usa `commands.ownerAllowFrom` cuando sea posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y al menos un
aprobador resuelve. Establezca `enabled: false` para deshabilitar Slack explícitamente como cliente de aprobación nativo.
Establezca `enabled: true` para forzar las aprobaciones nativas cuando los aprobadores resuelvan.

Comportamiento predeterminado sin configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

La configuración nativa explícita de Slack solo es necesaria cuando deseas anular los aprobadores, agregar filtros o
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

El reenvío compartido de `approvals.exec` es independiente. Úselo solo cuando las indicaciones de aprobación de ejecución también deban
enrutarse a otros chats o objetivos fuera de banda explícitos. El reenvío compartido de `approvals.plugin` también es
independiente; los botones nativos de Slack aún pueden resolver aprobaciones de complementos cuando esas solicitudes ya llegan
a Slack.

El `/approve` en el mismo chat también funciona en canales de Slack y MD que ya admiten comandos. Consulte [Aprobaciones ejecutivas](/es/tools/exec-approvals) para ver el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes se asignan a eventos del sistema.
- Las transmisiones de hilos (respuestas de hilo "También enviar al canal") se procesan como mensajes de usuario normales.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/salir de miembros, canal creado/renombrado y agregar/eliminar fijaciones se asignan a eventos del sistema.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador del hilo y la inicialización del contexto del historial del hilo se filtran mediante listas de permitidos de remitentes configuradas, cuando corresponde.
- Las acciones de bloques y las interacciones modales emiten eventos de sistema `Slack interaction: ...` estructurados con campos de carga útil enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores del selector y metadatos `workflow_*`
  - eventos modal `view_submission` y `view_closed` con metadatos de canal enrutados y entradas de formulario

## Referencia de configuración

Referencia principal: [Referencia de configuración - Slack](/es/gateway/config-channels#slack).

<Accordion title="Campos importantes de Slack">

- modo/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- acceso a MD: `dm.enabled`, `dmPolicy`, `allowFrom` (legado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompevidrio; manténgalo apagado a menos que sea necesario)
- acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls: `unfurlLinks`, `unfurlMedia` para el control de vista previa de enlace/medios `chat.postMessage`
- ops/funcionalidades: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Solución de problemas

<AccordionGroup>
  <Accordion title="No replies in channels">
    Compruebe, en orden:

    - `groupPolicy`
    - lista de permitidos del canal (`channels.slack.channels`) — **las claves deben ser IDs de canal** (`C12345678`), no nombres (`#channel-name`). Las claves basadas en nombres fallan silenciosamente en `groupPolicy: "allowlist"` porque el enrutamiento del canal prioriza el ID por defecto. Para encontrar un ID: haga clic derecho en el canal en Slack → **Copiar enlace** — el valor `C...` al final de la URL es el ID del canal.
    - `requireMention`
    - lista de permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM messages ignored">
    Compruebe:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el heredado `channels.slack.dm.policy`)
    - aprobaciones de emparejamiento / entradas de lista de permitidos
    - eventos de MD del Asistente de Slack: los registros detallados que mencionan `drop message_changed`
      generalmente significan que Slack envió un evento de hilo del Asistente editado sin un
      remitente humano recuperable en los metadatos del mensaje

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Valide los tokens de bot y de aplicación, y la habilitación del modo Socket en la configuración de la aplicación de Slack.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada pero el tiempo de ejecución actual no pudo resolver el valor
    respaldado por SecretRef.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Valide:

    - secreto de firma
    - ruta del webhook
    - URLs de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

    Si `signingSecretStatus: "configured_unavailable"` aparece en las
    instantáneas de la cuenta, la cuenta HTTP está configurada pero el tiempo de ejecución actual no pudo
    resolver el secreto de firma respaldado por SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Verifique si tenías la intención de:

    - el modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o el modo de comando de barra única (`channels.slack.slashCommand.enabled: true`)

    También verifique `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Referencia de visión de archivos adjuntos

Slack puede adjuntar medios descargados al turno del agente cuando las descargas de archivos de Slack tienen éxito y los límites de tamaño lo permiten. Los archivos de imagen pueden pasarse a través de la ruta de comprensión de medios o directamente a un modelo de respuesta con capacidad de visión; otros archivos se conservan como contexto de archivo descargable en lugar de ser tratados como entrada de imagen.

### Tipos de medios compatibles

| Tipo de medio                    | Fuente                        | Comportamiento actual                                                                                       | Notas                                                                                       |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Imágenes JPEG / PNG / GIF / WebP | URL de archivo de Slack       | Descargado y adjunto al turno para su manejo con capacidad de visión                                        | Límite por archivo: `channels.slack.mediaMaxMb` (predeterminado 20 MB)                      |
| Archivos PDF                     | URL de archivo de Slack       | Descargado y expuesto como contexto de archivo para herramientas como `download-file` o `pdf`               | La entrada de Slack no convierte los PDFs en entrada de visión de imagen automáticamente    |
| Otros archivos                   | URL de archivo de Slack       | Descargado cuando sea posible y expuesto como contexto de archivo                                           | Los archivos binarios no se tratan como entrada de imagen                                   |
| Respuestas de hilos              | Archivos de iniciador de hilo | Los archivos de mensajes raíz se pueden hidratar como contexto cuando la respuesta no tiene medios directos | Los iniciadores que solo contienen archivos usan un marcador de posición de archivo adjunto |
| Mensajes con múltiples imágenes  | Múltiples archivos de Slack   | Cada archivo se evalúa de forma independiente                                                               | El procesamiento de Slack está limitado a ocho archivos por mensaje                         |

### Canalización de entrada

Cuando llega un mensaje de Slack con archivos adjuntos:

1. OpenClaw descarga el archivo desde la URL privada de Slack utilizando el token de bot (`xoxb-...`).
2. El archivo se escribe en el almacén de medios cuando tiene éxito.
3. Las rutas y tipos de contenido de los medios descargados se agregan al contexto de entrada.
4. Las rutas de modelos/herramientas con capacidad de imagen pueden usar archivos adjuntos de imagen de ese contexto.
5. Los archivos que no son imágenes permanecen disponibles como metadatos de archivo o referencias de medios para herramientas que puedan manejarlos.

### Herencia de archivos adjuntos de la raíz del hilo

Cuando llega un mensaje en un hilo (tiene un padre `thread_ts`):

- Si la respuesta en sí no tiene medios directos y el mensaje raíz incluido tiene archivos, Slack puede hidratar los archivos raíz como contexto de inicio de hilo.
- Los archivos adjuntos de respuesta directa tienen prioridad sobre los archivos adjuntos del mensaje raíz.
- Un mensaje raíz que solo tiene archivos y ningún texto se representa con un marcador de posición de archivo adjunto para que el respaldo aún pueda incluir sus archivos.

### Manejo de múltiples archivos adjuntos

Cuando un solo mensaje de Slack contiene múltiples archivos adjuntos:

- Cada archivo adjunto se procesa de forma independiente a través de la canalización de medios.
- Las referencias de medios descargados se agregan al contexto del mensaje.
- El orden de procesamiento sigue el orden de archivos de Slack en la carga útil del evento.
- Un fallo en la descarga de un archivo adjunto no bloquea a los demás.

### Límites de tamaño, descarga y modelo

- **Límite de tamaño**: 20 MB por archivo de forma predeterminada. Configurable mediante `channels.slack.mediaMaxMb`.
- **Fallos de descarga**: Los archivos que Slack no puede servir, las URL caducadas, los archivos inaccesibles, los archivos demasiado grandes y las respuestas HTML de autenticación/inicio de sesión de Slack se omiten en lugar de informarse como formatos no compatibles.
- **Modelo de visión**: El análisis de imágenes utiliza el modelo de respuesta activo cuando admite visión, o el modelo de imagen configurado en `agents.defaults.imageModel`.

### Límites conocidos

| Escenario                                              | Comportamiento actual                                                                                       | Solución alternativa                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| URL de archivo de Slack caducada                       | Archivo omitido; no se muestra ningún error                                                                 | Volver a cargar el archivo en Slack                                                           |
| Modelo de visión no configurado                        | Los archivos adjuntos de imagen se almacenan como referencias de medios, pero no se analizan como imágenes  | Configure `agents.defaults.imageModel` o use un modelo de respuesta con capacidad de visión   |
| Imágenes muy grandes (> 20 MB de forma predeterminada) | Omitidas por límite de tamaño                                                                               | Aumente `channels.slack.mediaMaxMb` si Slack lo permite                                       |
| Archivos adjuntos reenviados/compartidos               | El texto y los medios de imagen/archivo alojados en Slack se procesan con el mejor esfuerzo posible         | Volver a compartir directamente en el hilo de OpenClaw                                        |
| Archivos adjuntos PDF                                  | Almacenados como contexto de archivo/medios, no enrutados automáticamente a través de la visión de imágenes | Use `download-file` para metadatos de archivos o la herramienta `pdf` para el análisis de PDF |

### Documentación relacionada

- [Canalización de comprensión de medios](/es/nodes/media-understanding)
- [Herramienta PDF](/es/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Habilitación de visión de archivos adjuntos de Slack
- Pruebas de regresión: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- Verificación en vivo: [#51354](https://github.com/openclaw/openclaw/issues/51354)

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Slack con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de canales y mensajes directos grupales.
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
