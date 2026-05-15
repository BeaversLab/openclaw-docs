---
summary: "Configuración y comportamiento en tiempo de ejecución de Slack (Socket Mode + URL de solicitud HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Listo para producción para MDs y canales mediante integraciones de aplicaciones de Slack. El modo predeterminado es Socket Mode; también se admiten URLs de solicitud HTTP.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Slack de forma predeterminada están en modo de emparejamiento.
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

| Preocupación                                   | Socket Mode (predeterminado)                                                                                                           | URL de solicitud HTTP                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| URL de puerta de enlace pública                | No requerido                                                                                                                           | Requerido (DNS, TLS, proxy inverso o túnel)                                                                                   |
| Red saliente                                   | WSS saliente a `wss-primary.slack.com` debe ser accesible                                                                              | Sin WS saliente; solo HTTPS entrante                                                                                          |
| Tokens necesarios                              | Token de bot (`xoxb-...`) + Token de nivel de aplicación (`xapp-...`) con `connections:write`                                          | Token de bot (`xoxb-...`) + Secreto de firma                                                                                  |
| Portátil de desarrollo / detrás de un firewall | Funciona tal cual                                                                                                                      | Necesita un túnel público (ngrok, Cloudflare Tunnel, Tailscale Funnel) o una puerta de enlace de ensayo                       |
| Escalado horizontal                            | Una sesión de Socket Mode por aplicación por host; múltiples puertas de enlace necesitan aplicaciones de Slack separadas               | Manejador POST sin estado; múltiples réplicas de Gateway pueden compartir una aplicación detrás de un equilibrador de carga   |
| Multicuenta en una sola puerta de enlace       | Compatible; cada cuenta abre su propio WS                                                                                              | Compatible; cada cuenta necesita un `webhookPath` único (predeterminado `/slack/events`) para que los registros no colisionen |
| Transporte de comandos de barra                | Entregado a través de la conexión WS; se ignora `slash_commands[].url`                                                                 | Slack hace POST a `slash_commands[].url`; el campo es obligatorio para que el comando se envíe                                |
| Firma de la solicitud                          | No se utiliza (la autenticación es el Token de nivel de aplicación)                                                                    | Slack firma cada solicitud; OpenClaw verifica con `signingSecret`                                                             |
| Recuperación ante la caída de la conexión      | El SDK de Slack se vuelve a conectar automáticamente; se aplica la optimización del transporte de tiempo de espera de pong del gateway | No hay conexión persistente que se caiga; los reintentos son por solicitud desde Slack                                        |

<Note>
  **Elija el modo Socket** para hosts de un solo Gateway, computadoras portátiles de desarrollo y redes locales que puedan alcanzar `*.slack.com` de salida pero no acepten HTTPS entrante.

**Elija URL de solicitud HTTP** cuando ejecute múltiples réplicas de Gateway detrás de un equilibrador de carga, cuando WSS de salida está bloqueado pero se permite HTTPS entrante, o cuando ya termina los webhooks de Slack en un proxy inverso.

</Note>

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
          **Recommended** coincide con el conjunto completo de funciones del complemento Slack incluido: App Home, comandos de barra, archivos, reacciones, fijaciones y lecturas de grupos de emojis/usergroup. Elige **Minimal** cuando la política del espacio de trabajo restrinja los alcances — cubre mensajes directos, historial de canales/grupos, menciones y comandos de barra, pero omite archivos, reacciones, fijaciones, mensajes directos grupales (`mpim:*`), `emoji:read` y `usergroups:read`. Consulta [Manifest and scope checklist](#manifest-and-scope-checklist) para ver la justificación por alcance y opciones aditivas como comandos de barra adicionales.
        </Note>

        Después de que Slack cree la aplicación:

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**: añade `connections:write`, guarda, copia el valor `xapp-...`.
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

        Env fallback (solo cuenta predeterminada):

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

  <Tab title="URL de solicitud HTTP">
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
          **Recommended** coincide con el conjunto completo de funciones del complemento Slack incluido; **Minimal** elimina archivos, reacciones, pines, MD de grupo (`mpim:*`), `emoji:read` y `usergroups:read` para espacios de trabajo restrictivos. Consulte [Lista de verificación de manifiesto y alcances](#manifest-and-scope-checklist) para conocer la justificación por alcance.
        </Note>

        <Info>
          Los tres campos de URL (`slash_commands[].url`, `event_subscriptions.request_url` y `interactivity.request_url` / `message_menu_options_url`) apuntan al mismo punto de conexión de OpenClaw. El esquema de manifiesto de Slack requiere que se nombren por separado, pero OpenClaw enruta por tipo de carga útil, por lo que un solo `webhookPath` (predeterminado `/slack/events`) es suficiente. Los comandos de barra sin `slash_commands[].url` no harán nada silenciosamente en modo HTTP.
        </Info>

        Después de que Slack cree la aplicación:

        - **Basic Information → App Credentials**: copie el **Signing Secret** para la verificación de solicitudes.
        - **Install App → Install to Workspace**: copie el Token OAuth de usuario de bot `xoxb-...`.

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
        Use rutas de webhook únicas para HTTP multisesión

        Dé a cada cuenta un `webhookPath` distinto (predeterminado `/slack/events`) para que los registros no colisionen.
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

OpenClaw establece el tiempo de espera de pong del cliente del SDK de Slack en 15 segundos de forma predeterminada para el modo Socket. Anule la configuración de transporte solo cuando necesite un ajuste específico del espacio de trabajo o del host:

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

Use esto solo para espacios de trabajo en modo Socket que registren tiempos de espera de pong del websocket de Slack/pings del servidor o que se ejecuten en hosts con inanición conocida del bucle de eventos. `clientPingTimeout` es la espera de pong después de que el SDK envía un ping de cliente; `serverPingTimeout` es la espera de los pings del servidor de Slack. Los mensajes y eventos de la aplicación permanecen como estado de la aplicación, no como señales de actividad del transporte.

## Lista de verificación de manifiesto y alcances

El manifiesto base de la aplicación de Slack es el mismo para el modo Socket y las URL de solicitud HTTP. Solo el bloque `settings` (y el comando de barra `url`) difieren.

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

### Configuración adicional del manifiesto

Muestre diferentes características que amplíen los valores predeterminados anteriores.

El manifiesto predeterminado habilita la pestaña **Home** (Inicio) de la aplicación de Slack y se suscribe a `app_home_opened`. Cuando un miembro del espacio de trabajo abre la pestaña Inicio, OpenClaw publica una vista Inicio predeterminada segura con `views.publish`; no se incluye ninguna carga de conversación ni configuración privada. La pestaña **Messages** (Mensajes) permanece habilitada para los MD de Slack.

<AccordionGroup>
  <Accordion title="Comandos de barra nativos opcionales">

    Se pueden usar múltiples [comandos de barra nativos](#commands-and-slash-behavior) en lugar de un único comando configurado con matices:

    - Use `/agentstatus` en lugar de `/status` porque el comando `/status` está reservado.
    - No se pueden tener más de 25 comandos de barra disponibles a la vez.

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

- `botToken` + `appToken` son necesarios para Socket Mode.
- El modo HTTP requiere `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas
  de texto sin formato u objetos SecretRef.
- Los tokens de configuración anulan la reserva de variables de entorno.
- La reserva de variables de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin reserva de variables de entorno) y tiene como comportamiento predeterminado el de solo lectura (`userTokenReadOnly: true`).

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack realiza un seguimiento de los campos `*Source` y `*Status`
  por credencial (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef
  u otro origen de secreto que no esté en línea, pero que la ruta de comando/ejecución
  actual no pudo resolver el valor real.
- En el modo HTTP, se incluye `signingSecretStatus`; en el modo Socket, el par
  requerido es `botTokenStatus` + `appTokenStatus`.

<Tip>Para las acciones/lecturas de directorio, el token de usuario puede ser el preferido cuando está configurado. Para las escrituras, el token de bot sigue siendo el preferido; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y compuertas

Las acciones de Slack se controlan mediante `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo      | Predeterminado |
| ---------- | -------------- |
| mensajes   | habilitado     |
| reacciones | habilitado     |
| fijaciones | habilitado     |
| memberInfo | habilitado     |
| emojiList  | habilitado     |

Las acciones actuales de mensajes de Slack incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`. `download-file` acepta los ID de archivo de Slack que se muestran en los marcadores de posición de archivos entrantes y devuelve vistas previas de imágenes para imágenes o metadatos de archivos locales para otros tipos de archivos.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a los MD. `channels.slack.allowFrom` es la lista de permitidos (allowlist) canónica para MD.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`)
    - `disabled`

    Marcadores de MD:

    - `dm.enabled` (predeterminado true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (heredado)
    - `dm.groupEnabled` (los MD grupales predeterminan false)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está establecido.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    Los `channels.slack.dm.policy` y `channels.slack.dm.allowFrom` heredados aún se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    El emparejamiento en MD utiliza `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Política de canal">
    `channels.slack.groupPolicy` controla el manejo del canal:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos (allowlist) de canales vive bajo `channels.slack.channels` y **debe usar IDs de canal de Slack estables** (por ejemplo `C12345678`) como claves de configuración.

    Nota de ejecución: si `channels.slack` falta completamente (configuración solo de entorno), el ejecutable vuelve a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos de canales y las entradas de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombres de canal no resueltos se mantienen como están configuradas pero se ignoran para el enrutamiento por defecto
    - la autorización entrante y el enrutamiento de canales son prioridad de ID por defecto; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Las claves basadas en nombres (`#channel-name` o `channel-name`) **no** coinciden bajo `groupPolicy: "allowlist"`. La búsqueda de canal es prioridad de ID por defecto, por lo que una clave basada en nombre nunca enrutará con éxito y todos los mensajes en ese canal se bloquearán silenciosamente. Esto difiere de `groupPolicy: "open"`, donde la clave de canal no es necesaria para el enrutamiento y una clave basada en nombre parece funcionar.

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
    Los mensajes del canal están limitados por menciones de forma predeterminada.

    Fuentes de mención:

    - mención explícita de la aplicación (`<@botId>`)
    - mención de grupo de usuarios de Slack (`<!subteam^S...>`) cuando el usuario bot es miembro de ese grupo de usuarios; requiere `usergroups:read`
    - patrones de expresiones regulares de mención (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de hilo de respuesta al bot (desactivado cuando `thread.requireExplicitMention` es `true`)

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución de inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - formato de clave `toolsBySender`: `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía se asignan solo a `id:`)

    `allowBots` es conservador para canales y canales privados: los mensajes de sala creados por el bot se aceptan solo cuando el bot que envía está listado explícitamente en la lista de permitidos `users` de esa sala, o cuando al menos un ID de propietario explícito de Slack de `channels.slack.allowFrom` es actualmente miembro de la sala. Los comodines y las entradas de propietario con nombre para mostrar no satisfacen la presencia del propietario. La presencia del propietario utiliza `conversations.members` de Slack; asegúrese de que la aplicación tenga el alcance de lectura coincidente para el tipo de sala (`channels:read` para canales públicos, `groups:read` para canales privados). Si la búsqueda de miembros falla, OpenClaw descarta el mensaje de sala creado por el bot.

  </Tab>
</Tabs>

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Los enlaces de ruta de Slack aceptan IDs de pares brutos (raw peer IDs) además de formas de destino de Slack como `channel:C12345678`, `user:U12345678` y `<@U12345678>`.
- Con el `session.dmScope=main` predeterminado, los MD de Slack colapsan a la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas de hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando corresponda.
- En los canales donde OpenClaw maneja mensajes de nivel superior sin requerir una mención explícita, `replyToMode` que no son `off` enruta cada raíz manejada a `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` para que el hilo visible de Slack se asigne a una sesión de OpenClaw desde el primer turno.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se recuperan cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).
- `channels.slack.thread.requireExplicitMention` (predeterminado `false`): cuando es `true`, suprime las menciones implícitas de hilo para que el bot solo responda a menciones `@bot` explícitas dentro de los hilos, incluso cuando el bot ya haya participado en el hilo. Sin esto, las respuestas en un hilo participado por el bot omiten el filtrado `requireMention`.

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all|batched` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- alternativa heredada para chats directos: `channels.slack.dm.replyToMode`

Las etiquetas de respuesta manual son compatibles:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>`replyToMode="off"` desactiva **todos** los hilos de respuesta en Slack, incluidas las etiquetas `[[reply_to_*]]` explícitas. Esto difiere de Telegram, donde las etiquetas explícitas se siguen respetando en el modo `"off"`. Los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en línea.</Note>

## Reacciones de acuse de recibo

`ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de identidad del agente de respaldo (`agents.list[].identity.emoji`, si no "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para desactivar la reacción para la cuenta de Slack o globalmente.

## Transmisión de texto

`channels.slack.streaming` controla el comportamiento de la vista previa en vivo:

- `off`: desactiva la transmisión de la vista previa en vivo.
- `partial` (predeterminado): reemplaza el texto de vista previa con la última salida parcial.
- `block`: añade actualizaciones de vista previa fragmentadas.
- `progress`: muestra el texto de estado de progreso mientras se genera, y luego envía el texto final.
- `streaming.preview.toolProgress`: cuando la vista previa de borrador está activa, enruta las actualizaciones de herramientas/progreso al mismo mensaje de vista previa editado (predeterminado: `true`). Establezca `false` para mantener mensajes de herramientas/progreso separados.
- `streaming.preview.commandText` / `streaming.progress.commandText`: establézcalo en `status` para mantener líneas de progreso de herramientas compactas mientras se oculta el texto de comando/ejecución sin procesar (predeterminado: `raw`).

Ocultar el texto de comando/ejecución sin procesar manteniendo líneas de progreso compactas:

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

- Debe estar disponible un hilo de respuesta para que aparezca la transmisión de texto nativa y el estado del hilo del asistente de Slack. La selección del hilo sigue `replyToMode`.
- Las raíces de canal, chat de grupo y MD de nivel superior aún pueden usar la vista previa de borrador normal cuando la transmisión nativa no está disponible o no existe un hilo de respuesta.
- Los MD de Slack de nivel superior permanecen fuera del hilo de forma predeterminada, por lo que no muestran la vista previa de flujo/estado nativa estilo hilo de Slack; en su lugar, OpenClaw publica y edita una vista previa de borrador en el MD.
- Las cargas útiles multimedia y que no son de texto vuelven a la entrega normal.
- Los finales de medios/errores cancelan las ediciones de vista previa pendientes; los finales de texto/bloque elegibles solo se vacían cuando pueden editar la vista previa en su lugar.
- Si la transmisión falla a mitad de la respuesta, OpenClaw vuelve a la entrega normal para las cargas restantes.

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

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode`.
- El booleano `channels.slack.streaming` es un alias de tiempo de ejecución heredado para `channels.slack.streaming.mode` y `channels.slack.streaming.nativeTransport`.
- El valor heredado `channels.slack.nativeStreaming` es un alias de tiempo de ejecución para `channels.slack.streaming.nativeTransport`.
- Ejecuta `openclaw doctor --fix` para reescribir la configuración de transmisión de Slack persistida a las claves canónicas.

## Alternativa de reacción de escritura

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta, y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas de hilos, que utilizan un indicador de estado "escribiendo..." predeterminado.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera códigos cortos (por ejemplo `"hourglass_flowing_sand"`).
- La reacción se hace con el mejor esfuerzo y se intenta la limpieza automáticamente después de que se completa la respuesta o la ruta de error.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URL privadas alojadas en Slack (flujo de solicitud autenticado por token) y se escriben en el almacén de medios cuando la recuperación tiene éxito y los límites de tamaño lo permiten. Los marcadores de posición de archivos incluyen el `fileId` de Slack para que los agentes puedan recuperar el archivo original con `download-file`.

    Las descargas utilizan tiempos de espera de inactividad y total limitados. Si la recuperación del archivo de Slack se detiene o falla, OpenClaw sigue procesando el mensaje y vuelve al marcador de posición del archivo.

    El límite de tamaño entrante en tiempo de ejecución es `20MB` de forma predeterminada, a menos que sea anulado por `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texto y archivos salientes">
    - los fragmentos de texto usan `channels.slack.textChunkLimit` (por defecto 4000)
    - `channels.slack.chunkMode="newline"` habilita la división优先por párrafos
    - los envíos de archivos usan las APIs de carga de Slack y pueden incluir respuestas de hilos (`thread_ts`)
    - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando se configura; de lo contrario, los envíos de canal usan los predeterminados de tipo MIME de la tubería de medios

  </Accordion>

  <Accordion title="Objetivos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack de solo texto/bloques pueden publicarse directamente en los IDs de usuario; las cargas de archivos y los envíos en hilo abren el MD primero a través de las APIs de conversación de Slack porque esas rutas requieren un ID de conversación concreto.

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

Los comandos nativos requieren [configuraciones de manifiesto adicionales](#additional-manifest-settings) en su aplicación de Slack y se habilitan con `channels.slack.commands.native: true` o `commands.native: true` en su lugar en las configuraciones globales.

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

Las sesiones de barra usan claves aisladas como `agent:<agentId>:slack:slash:<userId>` y todavía enrutan las ejecuciones de comandos a la sesión de conversación objetivo usando `CommandTargetSessionKey`.

## Respuestas interactivas

Slack puede mostrar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

Habilítalo globalmente:

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

O habilítalo solo para una cuenta de Slack:

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

Estas directivas se compilan en Slack Block Kit y enrutan los clics o selecciones de vuelta a través de la ruta de eventos de interacción de Slack existente.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit a sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores sin procesar creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw volvería a la respuesta de texto original en lugar de enviar una carga de bloques no válida.

## Aprobaciones de ejecución en Slack

Slack puede actuar como un cliente de aprobación nativo con botones e interacciones interactivas, en lugar de recurrir a la interfaz de usuario web o al terminal.

- Las aprobaciones de ejecución usan `channels.slack.execApprovals.*` para el enrutamiento nativo de MD/canal.
- Las aprobaciones de complementos aún pueden resolverse a través de la misma superficie de botones nativa de Slack cuando la solicitud ya llega a Slack y el tipo de ID de aprobación es `plugin:`.
- La autorización del aprobador todavía se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de su aplicación de Slack, las solicitudes de aprobación se representan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la experiencia de usuario (UX) de aprobación principal; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones
por chat no están disponibles o la aprobación manual es la única ruta.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; se vuelve a `commands.ownerAllowFrom` cuando sea posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y al menos un
aprobador resuelve. Establezca `enabled: false` para deshabilitar explícitamente Slack como un cliente de aprobación nativo.
Establezca `enabled: true` para forzar las aprobaciones nativas cuando los aprobadores resuelvan.

Comportamiento predeterminado sin configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

La configuración nativa explícita de Slack solo es necesaria cuando desea anular aprobadores, agregar filtros o
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

El reenvío compartido de `approvals.exec` es separado. Úselo solo cuando los mensajes de aprobación de ejecución también deban
enrutarse a otros chats o destinos explícitos fuera de banda. El reenvío compartido de `approvals.plugin` también es
separado; los botones nativos de Slack aún pueden resolver las aprobaciones de complementos cuando esas solicitudes ya aterrizan
en Slack.

El `/approve` del mismo chat también funciona en canales de Slack y MD que ya admiten comandos. Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals) para el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes se asignan a eventos del sistema.
- Las transmisiones de hilos (respuestas de hilo "También enviar al canal") se procesan como mensajes normales de usuario.
- Los eventos de agregar/quitar reacciones se asignan a eventos del sistema.
- Los eventos de incorporación/salida de miembros, canal creado/renombrado y agregar/quitar pin se asignan a eventos del sistema.
- `channel_id_changed` puede migrar claves de configuración de canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador del hilo y la siembra inicial del contexto del historial del hilo se filtran mediante listas de permitidos de remitentes configuradas cuando sea aplicable.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema estructurados `Slack interaction: ...` con campos de carga útil enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores del selector y metadatos `workflow_*`
  - eventos `view_submission` y `view_closed` de modal con metadatos de canal enrutados y entradas de formulario

## Referencia de configuración

Referencia principal: [Referencia de configuración - Slack](/es/gateway/config-channels#slack).

<Accordion title="Campos de Slack de alta señal">

- modo/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- acceso a DM: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- toggle de compatibilidad: `dangerouslyAllowNameMatching` (de emergencia; mantener desactivado a menos que sea necesario)
- acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- operaciones/funciones: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Verifique, en orden:

    - `groupPolicy`
    - lista de permitidos del canal (`channels.slack.channels`) — **las claves deben ser los IDs de los canales** (`C12345678`), no los nombres (`#channel-name`). Las claves basadas en nombres fallan silenciosamente bajo `groupPolicy: "allowlist"` porque el enrutamiento del canal es prioritario por ID de forma predeterminada. Para encontrar un ID: haga clic derecho en el canal en Slack → **Copiar enlace** — el valor `C...` al final de la URL es el ID del canal.
    - `requireMention`
    - lista de permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes de MD ignorados">
    Verifique:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el heredado `channels.slack.dm.policy`)
    - aprobaciones de emparejamiento / entradas de la lista de permitidos
    - eventos de MD del asistente de Slack: los registros detallados que mencionan `drop message_changed`
      generalmente significan que Slack envió un evento de hilo del asistente editado sin un
      remitente humano recuperable en los metadatos del mensaje

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="El modo Socket no se conecta">
    Valide los tokens de bot y de aplicación, y la habilitación del modo Socket en la configuración de la aplicación de Slack.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada, pero el tiempo de ejecución actual no pudo resolver el valor
    respaldado por SecretRef.

  </Accordion>

  <Accordion title="El modo HTTP no recibe eventos">
    Valide:

    - secreto de firma
    - ruta del webhook
    - URLs de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

    Si `signingSecretStatus: "configured_unavailable"` aparece en las instantáneas
    de la cuenta, la cuenta HTTP está configurada pero el tiempo de ejecución actual no pudo
    resolver el secreto de firma respaldado por SecretRef.

  </Accordion>

  <Accordion title="Comandos nativos/de barra que no se ejecutan">
    Verifique si tenía la intención de:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra único (`channels.slack.slashCommand.enabled: true`)

    También verifique `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Referencia de visión de archivos adjuntos

Slack puede adjuntar medios descargados al turno del agente cuando las descargas de archivos de Slack tienen éxito y los límites de tamaño lo permiten. Los archivos de imagen pueden pasarse a través de la ruta de comprensión de medios o directamente a un modelo de respuesta con capacidad de visión; otros archivos se conservan como contexto de archivo descargable en lugar de tratarse como entrada de imagen.

### Tipos de medios compatibles

| Tipo de medio                    | Fuente                           | Comportamiento actual                                                                                      | Notas                                                                                    |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Imágenes JPEG / PNG / GIF / WebP | URL de archivo de Slack          | Descargado y adjunto al turno para su manejo con capacidad de visión                                       | Límite por archivo: `channels.slack.mediaMaxMb` (predeterminado 20 MB)                   |
| Archivos PDF                     | URL de archivo de Slack          | Descargado y expuesto como contexto de archivo para herramientas como `download-file` o `pdf`              | La entrada de Slack no convierte los PDFs en entrada de visión de imagen automáticamente |
| Otros archivos                   | URL de archivo de Slack          | Descargado cuando sea posible y expuesto como contexto de archivo                                          | Los archivos binarios no se tratan como entrada de imagen                                |
| Respuestas de hilos              | Archivos de iniciadores de hilos | Los archivos de mensajes raíz pueden hidratarse como contexto cuando la respuesta no tiene medios directos | Los iniciadores solo de archivos usan un marcador de posición de archivo adjunto         |
| Mensajes con varias imágenes     | Varios archivos de Slack         | Cada archivo se evalúa de forma independiente                                                              | El procesamiento de Slack está limitado a ocho archivos por mensaje                      |

### Canalización entrante

Cuando llega un mensaje de Slack con archivos adjuntos:

1. OpenClaw descarga el archivo desde la URL privada de Slack usando el token del bot (`xoxb-...`).
2. El archivo se escribe en el almacén de medios tras el éxito.
3. Las rutas y los tipos de contenido de los medios descargados se agregan al contexto entrante.
4. Las rutas de modelos/herramientas con capacidad de imagen pueden usar archivos adjuntos de imagen de ese contexto.
5. Los archivos que no son imágenes siguen disponibles como metadatos de archivo o referencias de medios para herramientas que pueden manejarlos.

### Herencia de archivos adjuntos de raíz de hilo

Cuando llega un mensaje en un hilo (tiene un padre `thread_ts`):

- Si la respuesta en sí no tiene medios directos y el mensaje raíz incluido tiene archivos, Slack puede hidratar los archivos raíz como contexto de inicio del hilo.
- Los archivos adjuntos de respuesta directa tienen prioridad sobre los archivos adjuntos del mensaje raíz.
- Un mensaje raíz que solo tiene archivos y ningún texto se representa con un marcador de posición de archivo adjunto para que la alternativa aún pueda incluir sus archivos.

### Manejo de múltiples archivos adjuntos

Cuando un solo mensaje de Slack contiene múltiples archivos adjuntos:

- Cada archivo adjunto se procesa de forma independiente a través de la canalización de medios.
- Las referencias de medios descargados se agregan en el contexto del mensaje.
- El orden de procesamiento sigue el orden de archivos de Slack en la carga útil del evento.
- Un error en la descarga de un archivo adjunto no bloquea a los demás.

### Límites de tamaño, descarga y modelo

- **Límite de tamaño**: 20 MB por archivo de forma predeterminada. Configurable vía `channels.slack.mediaMaxMb`.
- **Fallos de descarga**: Los archivos que Slack no puede servir, URL caducadas, archivos inaccesibles, archivos demasiado grandes y respuestas HTML de autenticación/inicio de sesión de Slack se omiten en lugar de informarse como formatos no admitidos.
- **Modelo de visión**: El análisis de imágenes utiliza el modelo de respuesta activo cuando admite visión, o el modelo de imagen configurado en `agents.defaults.imageModel`.

### Límites conocidos

| Escenario                                              | Comportamiento actual                                                                                       | Solución alternativa                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| URL de archivo de Slack caducada                       | Archivo omitido; no se muestra ningún error                                                                 | Volver a cargar el archivo en Slack                                                             |
| Modelo de visión no configurado                        | Los archivos adjuntos de imagen se almacenan como referencias de medios, pero no se analizan como imágenes  | Configure `agents.defaults.imageModel` o utilice un modelo de respuesta con capacidad de visión |
| Imágenes muy grandes (> 20 MB de forma predeterminada) | Omitidas por límite de tamaño                                                                               | Aumente `channels.slack.mediaMaxMb` si Slack lo permite                                         |
| Archivos adjuntos reenviados/compartidos               | El texto y los medios de imagen/archivo alojados en Slack se realizan con el mayor esfuerzo posible         | Vuelva a compartir directamente en el hilo de OpenClaw                                          |
| Archivos adjuntos PDF                                  | Almacenados como contexto de archivo/medios, no enrutados automáticamente a través de la visión de imágenes | Use `download-file` para metadatos de archivos o la herramienta `pdf` para el análisis de PDF   |

### Documentación relacionada

- [Canalización de comprensión de medios](/es/nodes/media-understanding)
- [Herramienta PDF](/es/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Habilitación de visión de archivos adjuntos de Slack
- Pruebas de regresión: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- Verificación en vivo: [#51354](https://github.com/openclaw/openclaw/issues/51354)

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Slack con la pasarela.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de MD de canales y grupos.
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
