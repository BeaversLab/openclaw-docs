---
title: "Referencia de configuración"
description: "Referencia completa campo por campo para ~/.openclaw/openclaw."
summary: "Referencia completa para cada clave de configuración de OpenClaw, valores predeterminados y configuración de canales"
read_when:
  - Necesitas la semántica exacta de la configuración a nivel de campo o los valores predeterminados
  - Estás validando bloques de configuración de canal, modelo, puerta de enlace o herramienta
---

# Referencia de configuración

Todos los campos disponibles en `~/.openclaw/openclaw.json`. Para obtener una descripción general orientada a tareas, consulta [Configuración](/es/gateway/configuration).

El formato de configuración es **JSON5** (se permiten comentarios + comas finales). Todos los campos son opcionales: OpenClaw utiliza valores predeterminados seguros cuando se omiten.

---

## Canales

Cada canal se inicia automáticamente cuando existe su sección de configuración (a menos que `enabled: false`).

### Acceso a MD y grupos

Todos los canales admiten políticas de MD y políticas de grupos:

| Política de MD             | Comportamiento                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pairing` (predeterminado) | Los remitentes desconocidos reciben un código de vinculación de un solo uso; el propietario debe aprobar |
| `allowlist`                | Solo remitentes en `allowFrom` (o almacén de emparejamiento permitido)                                   |
| `open`                     | Permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)                                            |
| `disabled`                 | Ignorar todos los MD entrantes                                                                           |

| Política de grupo            | Comportamiento                                                                |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `allowlist` (predeterminado) | Solo grupos que coinciden con la lista de permitidos configurada              |
| `open`                       | Omitir listas de permitidos de grupos (el filtrado por mención aún se aplica) |
| `disabled`                   | Bloquear todos los mensajes de grupo/sala                                     |

<Note>
`channels.defaults.groupPolicy` establece el valor predeterminado cuando el `groupPolicy` de un proveedor no está configurado.
Los códigos de emparejamiento caducan después de 1 hora. Las solicitudes pendientes de emparejamiento de MD están limitadas a **3 por canal**.
Si falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupo en tiempo de ejecución vuelve a `allowlist` (fail-closed) con una advertencia de inicio.
</Note>

### Invalidaciones de modelo de canal

Usa `channels.modelByChannel` para fijar IDs de canal específicos a un modelo. Los valores aceptan `provider/model` o alias de modelos configurados. La asignación de canales se aplica cuando una sesión aún no tiene una anulación de modelo (por ejemplo, establecida a través de `/model`).

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-4.1",
      },
      telegram: {
        "-1001234567890": "openai/gpt-4.1-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### Valores predeterminados del canal y latido

Usa `channels.defaults` para una política de grupo compartida y el comportamiento de latido en todos los proveedores:

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`: política de grupo de respaldo cuando el `groupPolicy` a nivel de proveedor no está configurado.
- `channels.defaults.heartbeat.showOk`: incluir estados de canal saludables en la salida de latido.
- `channels.defaults.heartbeat.showAlerts`: incluir estados degradados/de error en la salida de latido.
- `channels.defaults.heartbeat.useIndicator`: renderizar salida de latido compacta estilo indicador.

### WhatsApp

WhatsApp se ejecuta a través del canal web del gateway (Baileys Web). Se inicia automáticamente cuando existe una sesión vinculada.

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // blue ticks (false in self-chat mode)
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
}
```

<Accordion title="WhatsApp multicuenta">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

- Los comandos de salida por defecto usan la cuenta `default` si está presente; de lo contrario, la primera id de cuenta configurada (ordenada).
- El opcional `channels.whatsapp.defaultAccount` anula esa selección predeterminada de cuenta de respaldo cuando coincide con una id de cuenta configurada.
- El directorio de autenticación heredado de Baileys de cuenta única es migrado por `openclaw doctor` a `whatsapp/default`.
- Anulaciones por cuenta: `channels.whatsapp.accounts.<id>.sendReadReceipts`, `channels.whatsapp.accounts.<id>.dmPolicy`, `channels.whatsapp.accounts.<id>.allowFrom`.

</Accordion>

### Telegram

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",
      allowFrom: ["tg:123456789"],
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic.",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: off)
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 100,
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
      network: {
        autoSelectFamily: true,
        dnsResultOrder: "ipv4first",
      },
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Token del bot: `channels.telegram.botToken` o `channels.telegram.tokenFile` (solo archivo regular; los enlaces simbólicos son rechazados), con `TELEGRAM_BOT_TOKEN` como respaldo para la cuenta predeterminada.
- El opcional `channels.telegram.defaultAccount` anula la selección predeterminada de cuenta cuando coincide con una id de cuenta configurada.
- En configuraciones multicuenta (2+ ids de cuenta), establezca un predeterminado explícito (`channels.telegram.defaultAccount` o `channels.telegram.accounts.default`) para evitar el enrutamiento de respaldo; `openclaw doctor` advierte cuando esto falta o no es válido.
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Telegram (migraciones de ID de supergrupo, `/config set|unset`).
- Las entradas de nivel superior `bindings[]` con `type: "acp"` configuran enlaces ACP persistentes para temas del foro (use el `chatId:topic:topicId` canónico en `match.peer.id`). La semántica de los campos se comparte en [Agentes ACP](/es/tools/acp-agents#channel-specific-settings).
- Las vistas previas de transmisión de Telegram usan `sendMessage` + `editMessageText` (funciona en chats directos y grupales).
- Política de reintentos: consulte [Política de reintentos](/es/concepts/retry).

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 8,
      allowBots: false,
      actions: {
        reactions: true,
        stickers: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        voiceStatus: true,
        events: true,
        moderation: false,
      },
      replyToMode: "off", // off | first | all
      dmPolicy: "pairing",
      allowFrom: ["1234567890", "123456789012345678"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["openclaw-dm"] },
      guilds: {
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          ignoreOtherMentions: true,
          reactionNotifications: "own",
          users: ["987654321098765432"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "Short answers only.",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      chunkMode: "length", // length | newline
      streaming: "off", // off | partial | block | progress (progress maps to partial on Discord)
      maxLinesPerMessage: 17,
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // opt-in for sessions_spawn({ thread: true })
      },
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

- Token: `channels.discord.token`, con `DISCORD_BOT_TOKEN` como respaldo para la cuenta predeterminada.
- Las llamadas directas de salida que proporcionan un `token` de Discord explícito usan ese token para la llamada; la configuración de reintentos/políticas de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
- Opcional `channels.discord.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con un ID de cuenta configurado.
- Use `user:<id>` (MD) o `channel:<id>` (canal de gremio) como destinos de entrega; los IDs numéricos simples son rechazados.
- Los slugs de gremio están en minúsculas con los espacios reemplazados por `-`; las claves de canal usan el nombre con slug (sin `#`). Se prefieren los IDs de gremio.
- Los mensajes creados por bots se ignoran de forma predeterminada. `allowBots: true` los habilita; use `allowBots: "mentions"` para aceptar solo mensajes de bots que mencionan al bot (los propios mensajes aún se filtran).
- `channels.discord.guilds.<id>.ignoreOtherMentions` (y las anulaciones de canal) descarta mensajes que mencionan a otro usuario o rol pero no al bot (excluyendo @everyone/@here).
- `maxLinesPerMessage` (predeterminado 17) divide los mensajes altos incluso cuando tienen menos de 2000 caracteres.
- `channels.discord.threadBindings` controla el enrutamiento vinculado a hilos de Discord:
  - `enabled`: Anulación de Discord para características de sesión vinculadas a hilos (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, y entrega/enrutamiento vinculado)
  - `idleHours`: Anulación de Discord para el autoenfoque por inactividad en horas (`0` deshabilita)
  - `maxAgeHours`: Anulación de Discord para la antigüedad máxima absoluta en horas (`0` deshabilita)
  - `spawnSubagentSessions`: interruptor de participación opcional para la creación/vinculación automática de hilos de `sessions_spawn({ thread: true })`
- Las entradas `bindings[]` de nivel superior con `type: "acp"` configuran enlaces ACP persistentes para canales e hilos (use el ID de canal/hilo en `match.peer.id`). La semántica de los campos se comparte en [ACP Agents](/es/tools/acp-agents#channel-specific-settings).
- `channels.discord.ui.components.accentColor` establece el color de acento para los contenedores de componentes de Discord v2.
- `channels.discord.voice` habilita las conversaciones en canales de voz de Discord y anulaciones opcionales de unión automática + TTS.
- `channels.discord.voice.daveEncryption` y `channels.discord.voice.decryptionFailureTolerance` pasan a las opciones DAVE de `@discordjs/voice` (`true` y `24` por defecto).
- OpenClaw además intenta la recuperación de recepción de voz saliendo/volviendo a entrar a una sesión de voz después de fallos repetidos de desencriptado.
- `channels.discord.streaming` es la clave canónica del modo de transmisión. Los valores heredados `streamMode` y booleanos `streaming` se migran automáticamente.
- `channels.discord.autoPresence` asigna la disponibilidad de tiempo de ejecución a la presencia del bot (saludable => en línea, degradado => inactivo, agotado => no molestar) y permite anulaciones opcionales de texto de estado.
- `channels.discord.dangerouslyAllowNameMatching` vuelve a habilitar la coincidencia de nombre/etiqueta mutable (modo de compatibilidad de emergencia).

**Modos de notificación de reacción:** `off` (ninguno), `own` (mensajes del bot, por defecto), `all` (todos los mensajes), `allowlist` (de `guilds.<id>.users` en todos los mensajes).

### Google Chat

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",
      dm: {
        enabled: true,
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

- JSON de cuenta de servicio: en línea (`serviceAccount`) o basado en archivos (`serviceAccountFile`).
- También se admite SecretRef de cuenta de servicio (`serviceAccountRef`).
- Alternativas de entorno: `GOOGLE_CHAT_SERVICE_ACCOUNT` o `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Use `spaces/<spaceId>` o `users/<userId>` para los destinos de entrega.
- `channels.googlechat.dangerouslyAllowNameMatching` vuelve a habilitar la coincidencia de entidades principales de correo mutable (modo de compatibilidad de emergencia).

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      dmPolicy: "pairing",
      allowFrom: ["U123", "U456", "*"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["G123"] },
      channels: {
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Short answers only.",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all
      thread: {
        historyScope: "thread", // thread | channel
        inheritParent: false,
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true,
      },
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true,
      },
      typingReaction: "hourglass_flowing_sand",
      textChunkLimit: 4000,
      chunkMode: "length",
      streaming: "partial", // off | partial | block | progress (preview mode)
      nativeStreaming: true, // use Slack native streaming API when streaming=partial
      mediaMaxMb: 20,
    },
  },
}
```

- **Modo de socket** requiere tanto `botToken` como `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` para la alternativa de entorno de cuenta predeterminada).
- **Modo HTTP** requiere `botToken` además de `signingSecret` (en la raíz o por cuenta).
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Slack.
- Opcional `channels.slack.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.
- `channels.slack.streaming` es la clave canónica del modo de transmisión. Los valores heredados `streamMode` y booleanos `streaming` se migran automáticamente.
- Use `user:<id>` (DM) or `channel:<id>` para los objetivos de entrega.

**Modos de notificación de reacción:** `off`, `own` (predeterminado), `all`, `allowlist` (desde `reactionAllowlist`).

**Aislamiento de sesión de hilo:** `thread.historyScope` es por hilo (predeterminado) o compartido en el canal. `thread.inheritParent` copia la transcripción del canal principal a nuevos hilos.

- `typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras se ejecuta una respuesta, y luego la elimina al completarse. Usa un shortcode de emoji de Slack como `"hourglass_flowing_sand"`.

| Grupo de acción | Predeterminado | Notas                          |
| --------------- | -------------- | ------------------------------ |
| reacciones      | habilitado     | Reaccionar + listar reacciones |
| mensajes        | habilitado     | Leer/enviar/editar/eliminar    |
| fijados         | habilitado     | Fijar/Desfijar/Listar          |
| memberInfo      | habilitado     | Información de miembro         |
| emojiList       | habilitado     | Lista de emojis personalizados |

### Mattermost

Mattermost se distribuye como complemento: `openclaw plugins install @openclaw/mattermost`.

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
      oncharPrefixes: [">", "!"],
      commands: {
        native: true, // opt-in
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Optional explicit URL for reverse-proxy/public deployments
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

Modos de chat: `oncall` (responder al @@mención, predeterminado), `onmessage` (cada mensaje), `onchar` (mensajes que comienzan con el prefijo de activador).

Cuando los comandos nativos de Mattermost están habilitados:

- `commands.callbackPath` debe ser una ruta (por ejemplo `/api/channels/mattermost/command`), no una URL completa.
- `commands.callbackUrl` debe resolver al punto de conexión de la pasarela OpenClaw y ser accesible desde el servidor Mattermost.
- Para hosts de devolución de llamada privados/tailnet/internos, Mattermost puede requerir
  `ServiceSettings.AllowedUntrustedInternalConnections` para incluir el host/dominio de devolución de llamada.
  Usa valores de host/dominio, no URLs completas.
- `channels.mattermost.configWrites`: permitir o denegar escrituras de configuración iniciadas por Mattermost.
- `channels.mattermost.requireMention`: requerir `@mention` antes de responder en los canales.
- Opcional `channels.mattermost.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.

### Signal

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123", // optional account binding
      dmPolicy: "pairing",
      allowFrom: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      configWrites: true,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**Modos de notificación de reacción:** `off`, `own` (predeterminado), `all`, `allowlist` (desde `reactionAllowlist`).

- `channels.signal.account`: fijar el inicio del canal a una identidad de cuenta de Signal específica.
- `channels.signal.configWrites`: permitir o denegar escrituras de configuración iniciadas por Signal.
- Opcional `channels.signal.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.

### BlueBubbles

BlueBubbles es la ruta recomendada para iMessage (con complemento, configurado bajo `channels.bluebubbles`).

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      dmPolicy: "pairing",
      // serverUrl, password, webhookPath, group controls, and advanced actions:
      // see /channels/bluebubbles
    },
  },
}
```

- Rutas clave principales cubiertas aquí: `channels.bluebubbles`, `channels.bluebubbles.dmPolicy`.
- Opcional `channels.bluebubbles.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.
- La configuración completa del canal BlueBubbles está documentada en [BlueBubbles](/es/channels/bluebubbles).

### iMessage

OpenClaw genera `imsg rpc` (JSON-RPC sobre stdio). No se requiere demonio ni puerto.

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host",
      dmPolicy: "pairing",
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50,
      includeAttachments: false,
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      mediaMaxMb: 16,
      service: "auto",
      region: "US",
    },
  },
}
```

- Opcional `channels.imessage.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.

- Requiere acceso de disco completo a la base de datos de Messages.
- Prefiera los destinos `chat_id:<id>`. Use `imsg chats --limit 20` para listar chats.
- `cliPath` puede apuntar a un contenedor SSH; configure `remoteHost` (`host` o `user@host`) para la obtención de archivos adjuntos SCP.
- `attachmentRoots` y `remoteAttachmentRoots` restringen las rutas de los archivos adjuntos entrantes (predeterminado: `/Users/*/Library/Messages/Attachments`).
- SCP utiliza verificación estricta de clave de host, por lo tanto, asegúrese de que la clave de host del relé ya exista en `~/.ssh/known_hosts`.
- `channels.imessage.configWrites`: permitir o denegar escrituras de configuración iniciadas por iMessage.

<Accordion title="Ejemplo de contenedor SSH de iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Microsoft Teams

Microsoft Teams está respaldado por una extensión y se configura bajo `channels.msteams`.

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, team/channel policies:
      // see /channels/msteams
    },
  },
}
```

- Rutas clave principales cubiertas aquí: `channels.msteams`, `channels.msteams.configWrites`.
- La configuración completa de Teams (credenciales, webhook, política de DM/grupo, anulaciones por equipo/canal) está documentada en [Microsoft Teams](/es/channels/msteams).

### IRC

IRC está respaldado por una extensión y se configura bajo `channels.irc`.

```json5
{
  channels: {
    irc: {
      enabled: true,
      dmPolicy: "pairing",
      configWrites: true,
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "${IRC_NICKSERV_PASSWORD}",
        register: false,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

- Rutas clave principales cubiertas aquí: `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- Opcional `channels.irc.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.
- La configuración completa del canal IRC (host/puerto/TLS/canales/listas blancas/filtrado de menciones) está documentada en [IRC](/es/channels/irc).

### Multicuenta (todos los canales)

Ejecutar varias cuentas por canal (cada una con su propio `accountId`):

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- `default` se usa cuando se omite `accountId` (CLI + enrutamiento).
- Los tokens de entorno solo se aplican a la cuenta **predeterminada**.
- La configuración base del canal se aplica a todas las cuentas a menos que se anule por cuenta.
- Use `bindings[].match.accountId` para enrutar cada cuenta a un agente diferente.
- Si agrega una cuenta no predeterminada a través de `openclaw channels add` (o incorporación de canales) mientras aún está en una configuración de canal de nivel superior de cuenta única, OpenClaw mueve primero los valores de cuenta única de nivel superior con ámbito de cuenta a `channels.<channel>.accounts.default` para que la cuenta original siga funcionando.
- Los enlaces existentes solo de canal (sin `accountId`) siguen coincidiendo con la cuenta predeterminada; los enlaces con ámbito de cuenta siguen siendo opcionales.
- `openclaw doctor --fix` también repara formas mixtas moviendo los valores de cuenta única de nivel superior con ámbito de cuenta a `accounts.default` cuando existen cuentas con nombre pero falta `default`.

### Otros canales de extensión

Muchos canales de extensión se configuran como `channels.<id>` y se documentan en sus páginas de canal dedicadas (por ejemplo, Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat y Twitch).
Vea el índice completo de canales: [Canales](/es/channels).

### Filtrado de menciones en chats de grupo

Los mensajes de grupo tienen como valor predeterminado **requerir mención** (mención en metadatos o patrones de regex seguros). Se aplica a los grupos de WhatsApp, Telegram, Discord, Google Chat e iMessage.

**Tipos de mención:**

- **Menciones de metadatos**: Menciones de @ nativas de la plataforma. Se ignoran en el modo de chat propio de WhatsApp.
- **Patrones de texto**: Patrones de regex seguros en `agents.list[].groupChat.mentionPatterns`. Los patrones no válidos y la repetición anidada insegura se ignoran.
- El filtrado de menciones se aplica solo cuando la detección es posible (menciones nativas o al menos un patrón).

```json5
{
  messages: {
    groupChat: { historyLimit: 50 },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` establece el valor predeterminado global. Los canales pueden anularlo con `channels.<channel>.historyLimit` (o por cuenta). Establezca `0` para desactivar.

#### Límites de historial de MD

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,
      dms: {
        "123456789": { historyLimit: 50 },
      },
    },
  },
}
```

Resolución: anulación por MD → valor predeterminado del proveedor → sin límite (se conservan todos).

Soportados: `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Modo de chat propio

Incluya su propio número en `allowFrom` para habilitar el modo de autocomunicación (ignora las @-menciones nativas, solo responde a patrones de texto):

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["reisponde", "@openclaw"] },
      },
    ],
  },
}
```

### Comandos (manejo de comandos de chat)

```json5
{
  commands: {
    native: "auto", // register native commands when supported
    text: true, // parse /commands in chat messages
    bash: false, // allow ! (alias: /bash)
    bashForegroundMs: 2000,
    config: false, // allow /config
    debug: false, // allow /debug
    restart: false, // allow /restart + gateway restart tool
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="Detalles del comando">

- Los comandos de texto deben ser mensajes **independientes** con `/` al principio.
- `native: "auto"` activa los comandos nativos para Discord/Telegram, deja Slack desactivado.
- Sobrescribir por canal: `channels.discord.commands.native` (booleano o `"auto"`). `false` borra los comandos registrados anteriormente.
- `channels.telegram.customCommands` añade entradas adicionales al menú del bot de Telegram.
- `bash: true` habilita `! <cmd>` para el shell del host. Requiere `tools.elevated.enabled` y remitente en `tools.elevated.allowFrom.<channel>`.
- `config: true` habilita `/config` (lee/escribe `openclaw.json`). Para clientes de gateway `chat.send`, las escrituras persistentes `/config set|unset` también requieren `operator.admin`; `/config show` de solo lectura permanece disponible para clientes operadores normales con ámbito de escritura.
- `channels.<provider>.configWrites` restringe las mutaciones de configuración por canal (predeterminado: true).
- Para canales multicuenta, `channels.<provider>.accounts.<id>.configWrites` también restringe las escrituras que tienen como objetivo esa cuenta (por ejemplo `/allowlist --config --account <id>` o `/config set channels.<provider>.accounts.<id>...`).
- `allowFrom` es por proveedor. Cuando se establece, es la **única** fuente de autorización (se ignoran las listas de permitidos/emparejamiento del canal y `useAccessGroups`).
- `useAccessGroups: false` permite que los comandos omitan las políticas de grupo de acceso cuando `allowFrom` no está establecido.

</Accordion>

---

## Valores predeterminados del agente

### `agents.defaults.workspace`

Predeterminado: `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

Raíz del repositorio opcional que se muestra en la línea de tiempo de ejecución del mensaje del sistema. Si no se establece, OpenClaw la detecta automáticamente navegando hacia arriba desde el espacio de trabajo.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skipBootstrap`

Deshabilita la creación automática de archivos de arranque del espacio de trabajo (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.bootstrapMaxChars`

Máximo de caracteres por archivo de arranque del espacio de trabajo antes del truncamiento. Predeterminado: `20000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

Máximo total de caracteres inyectados en todos los archivos de arranque del espacio de trabajo. Predeterminado: `150000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Controla el texto de advertencia visible por el agente cuando se trunca el contexto de arranque.
Predeterminado: `"once"`.

- `"off"`: nunca inyectar texto de advertencia en el prompt del sistema.
- `"once"`: inyectar advertencia una vez por firma de truncamiento única (recomendado).
- `"always"`: inyectar advertencia en cada ejecución cuando existe truncamiento.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

Tamaño máximo en píxeles para el lado más largo de la imagen en bloques de imagen de transcripción/herramienta antes de las llamadas al proveedor.
Predeterminado: `1200`.

Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de carga útil de la solicitud para ejecuciones con muchas capturas de pantalla.
Los valores más altos preservan más detalles visuales.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Zona horaria para el contexto del mensaje del sistema (no las marcas de tiempo de los mensajes). Recurre a la zona horaria del host.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Formato de hora en el prompt del sistema. Predeterminado: `auto` (preferencia del SO).

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - La forma de cadena establece solo el modelo principal.
  - La forma de objeto establece el modelo principal más modelos de conmutación por error ordenados.
- `imageModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la ruta de la herramienta `image` como su configuración de modelo de visión.
  - También se utiliza como enrutamiento de conmutación por error cuando el modelo seleccionado/por defecto no puede aceptar entrada de imagen.
- `imageGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad compartida de generación de imágenes y cualquier superficie futura de herramienta/complemento que genere imágenes.
  - Valores típicos: `google/gemini-3-pro-image-preview` para el flujo nativo estilo Nano Banana, `fal/fal-ai/flux/dev` para fal, o `openai/gpt-image-1` para OpenAI Images.
  - Si se omite, `image_generate` aún puede inferir un proveedor predeterminado de mejor esfuerzo a partir de proveedores de generación de imágenes compatibles con autenticación.
  - Valores típicos: `google/gemini-3-pro-image-preview`, `fal/fal-ai/flux/dev`, `openai/gpt-image-1`.
- `pdfModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la herramienta `pdf` para el enrutamiento de modelos.
  - Si se omite, la herramienta PDF recurre a `imageModel` y luego a los valores predeterminados del proveedor de mejor esfuerzo.
- `pdfMaxBytesMb`: límite de tamaño de PDF predeterminado para la herramienta `pdf` cuando no se pasa `maxBytesMb` en el momento de la llamada.
- `pdfMaxPages`: máximo de páginas predeterminado considerado por el modo de reserva de extracción en la herramienta `pdf`.
- `model.primary`: formato `provider/model` (por ejemplo, `anthropic/claude-opus-4-6`). Si omite el proveedor, OpenClaw asume `anthropic` (obsoleto).
- `models`: el catálogo de modelos configurado y la lista de permitidos para `/model`. Cada entrada puede incluir `alias` (atajo) y `params` (específico del proveedor, por ejemplo `temperature`, `maxTokens`, `cacheRetention`, `context1m`).
- Precedencia de fusión de `params` (config): `agents.defaults.models["provider/model"].params` es la base, luego `agents.list[].params` (id de agente coincidente) anula por clave.
- Los escritores de configuración que mutan estos campos (por ejemplo `/models set`, `/models set-image` y comandos de agregar/eliminar de reserva) guardan el formulario de objeto canónico y preservan las listas de reserva existentes cuando es posible.
- `maxConcurrent`: máximo de ejecuciones de agentes paralelas entre sesiones (cada sesión aún serializada). Predeterminado: 1.

**Atajos de alias integrados** (solo se aplican cuando el modelo está en `agents.defaults.models`):

| Alias               | Modelo                                 |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5-mini`                    |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

Tus alias configurados siempre tienen prioridad sobre los valores predeterminados.

Los modelos Z.AI GLM-4.x habilitan automáticamente el modo de pensamiento a menos que configures `--thinking off` o definas `agents.defaults.models["zai/<model>"].params.thinking` tú mismo.
Los modelos Z.AI habilitan `tool_stream` de forma predeterminada para la transmisión de llamadas a herramientas. Establece `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
Los modelos Anthropic Claude 4.6 tienen como valor predeterminado el pensamiento `adaptive` cuando no se establece ningún nivel de pensamiento explícito.

### `agents.defaults.cliBackends`

Backends de CLI opcionales para ejecuciones de reserva solo de texto (sin llamadas a herramientas). Útil como respaldo cuando fallan los proveedores de API.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- Los backends de CLI son prioritariamente de texto; las herramientas siempre están deshabilitadas.
- Sesiones compatibles cuando se establece `sessionArg`.
- Transferencia de imagen admitida cuando `imageArg` acepta rutas de archivo.

### `agents.defaults.heartbeat`

Ejecuciones periódicas de latido.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.2-mini",
        includeReasoning: false,
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
      },
    },
  },
}
```

- `every`: cadena de duración (ms/s/m/h). Predeterminado: `30m`.
- `suppressToolErrorWarnings`: cuando es verdadero, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `directPolicy`: política de entrega directa/DM. `allow` (predeterminado) permite la entrega a objetivo directo. `block` suprime la entrega a objetivo directo y emite `reason=dm-blocked`.
- `lightContext`: cuando es verdadero, las ejecuciones de latido utilizan un contexto de arranque ligero y conservan solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es verdadero, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Mismo patrón de aislamiento que cron `sessionTarget: "isolated"`. Reduce el costo de tokens por latido de ~100K a ~2-5K tokens.
- Por agente: establezca `agents.list[].heartbeat`. Cuando cualquier agente define `heartbeat`, **solo esos agentes** ejecutan latidos.
- Los latidos ejecutan turnos completos de agente: intervalos más cortos consumen más tokens.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-5", // optional compaction-only model override
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`: `default` o `safeguard` (resumen fragmentado para historiales largos). Consulte [Compaction](/es/concepts/compaction).
- `timeoutSeconds`: máximo de segundos permitidos para una sola operación de compactación antes de que OpenClaw la aborte. Predeterminado: `900`.
- `identifierPolicy`: `strict` (predeterminado), `off`, o `custom`. `strict` antepone la guía integrada de retención de identificadores opacos durante el resumen de compactación.
- `identifierInstructions`: texto opcional personalizado de preservación de identificadores que se usa cuando `identifierPolicy=custom`.
- `postCompactionSections`: nombres de sección H2/H3 opcionales de AGENTS.md para volver a inyectar después de la compactación. Predeterminado en `["Session Startup", "Red Lines"]`; establezca `[]` para desactivar la reinyección. Cuando no está configurado o se establece explícitamente en ese par predeterminado, los encabezados `Every Session`/`Safety` más antiguos también se aceptan como alternativa heredada.
- `model`: anulación opcional de `provider/model-id` solo para el resumen de compactación. Úselo cuando la sesión principal debe mantener un modelo, pero los resúmenes de compactación deben ejecutarse en otro; cuando no está configurado, la compactación usa el modelo principal de la sesión.
- `memoryFlush`: turno de agente silencioso antes de la auto-compactación para almacenar recuerdos duraderos. Se omite cuando el espacio de trabajo es de solo lectura.

### `agents.defaults.contextPruning`

Poda **antiguos resultados de herramientas** del contexto en memoria antes de enviarlos al LLM. **No** modifica el historial de la sesión en el disco.

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="comportamiento del modo cache-ttl">

- `mode: "cache-ttl"` habilita los pases de poda.
- `ttl` controla la frecuencia con la que se puede ejecutar la poda nuevamente (después del último acceso al caché).
- La poda realiza un recorte suave de los resultados de herramientas excesivamente grandes primero, y luego realiza un borrado duro de los resultados de herramientas más antiguos si es necesario.

**Soft-trim** (recorte suave) mantiene el principio y el final e inserta `...` en el medio.

**Hard-clear** (borrado duro) reemplaza todo el resultado de la herramienta con el marcador de posición.

Notas:

- Los bloques de imagen nunca se recortan/borran.
- Las proporciones se basan en caracteres (aproximadas), no en recuentos exactos de tokens.
- Si existen menos de `keepLastAssistants` mensajes del asistente, la poda se omite.

</Accordion>

Consulte [Session Pruning](/es/concepts/session-pruning) para obtener detalles sobre el comportamiento.

### Transmisión en bloque

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
    },
  },
}
```

- Los canales que no son de Telegram requieren `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
- Anulaciones de canal: `channels.<channel>.blockStreamingCoalesce` (y variantes por cuenta). Signal/Slack/Discord/Google Chat predeterminado `minChars: 1500`.
- `humanDelay`: pausa aleatoria entre respuestas en bloque. `natural` = 800–2500ms. Anulación por agente: `agents.list[].humanDelay`.

Consulte [Streaming](/es/concepts/streaming) para obtener detalles sobre el comportamiento y la fragmentación.

### Indicadores de escritura

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- Predeterminados: `instant` para chats directos/menciones, `message` para chats grupales sin mencionar.
- Anulaciones por sesión: `session.typingMode`, `session.typingIntervalSeconds`.

Consulte [Typing Indicators](/es/concepts/typing-indicators).

### `agents.defaults.sandbox`

Sandbox opcional para el agente integrado. Consulte [Sandboxing](/es/gateway/sandboxing) para obtener la guía completa.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Detalles del sandbox">

**Backend:**

- `docker`: tiempo de ejecución local de Docker (predeterminado)
- `ssh`: tiempo de ejecución remoto genérico respaldado por SSH
- `openshell`: tiempo de ejecución de OpenShell

Cuando se selecciona `backend: "openshell"`, la configuración específica del tiempo de ejecución se mueve a
`plugins.entries.openshell.config`.

**Configuración del backend SSH:**

- `target`: objetivo SSH en formato `user@host[:port]`
- `command`: comando del cliente SSH (predeterminado: `ssh`)
- `workspaceRoot`: raíz remota absoluta utilizada para espacios de trabajo por ámbito
- `identityFile` / `certificateFile` / `knownHostsFile`: archivos locales existentes pasados a OpenSSH
- `identityData` / `certificateData` / `knownHostsData`: contenidos en línea o SecretRefs que OpenClaw materializa en archivos temporales en tiempo de ejecución
- `strictHostKeyChecking` / `updateHostKeys`: controles de política de claves de host de OpenSSH

**Precedencia de autenticación SSH:**

- `identityData` tiene prioridad sobre `identityFile`
- `certificateData` tiene prioridad sobre `certificateFile`
- `knownHostsData` tiene prioridad sobre `knownHostsFile`
- Los valores `*Data` respaldados por SecretRef se resuelven a partir de la instantánea activa de secretos del tiempo de ejecución antes de que comience la sesión del sandbox

**Comportamiento del backend SSH:**

- inicializa el espacio de trabajo remoto una vez después de crear o recrear
- luego mantiene el espacio de trabajo SSH remoto como canónico
- enruta `exec`, herramientas de archivos y rutas de medios a través de SSH
- no sincroniza los cambios remotos con el host automáticamente
- no admite contenedores de navegador sandbox

**Acceso al espacio de trabajo:**

- `none`: espacio de trabajo sandbox por ámbito bajo `~/.openclaw/sandboxes`
- `ro`: espacio de trabajo sandbox en `/workspace`, espacio de trabajo del agente montado como de solo lectura en `/agent`
- `rw`: espacio de trabajo del agente montado como lectura/escritura en `/workspace`

**Ámbito:**

- `session`: contenedor + espacio de trabajo por sesión
- `agent`: un contenedor + espacio de trabajo por agente (predeterminado)
- `shared`: contenedor y espacio de trabajo compartidos (sin aislamiento entre sesiones)

**Configuración del complemento OpenShell:**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**Modo OpenShell:**

- `mirror`: inicializa lo remoto desde lo local antes de la ejecución, sincroniza de vuelta después de la ejecución; el espacio de trabajo local se mantiene canónico
- `remote`: inicializa lo remoto una vez cuando se crea el sandbox, luego mantiene el espacio de trabajo remoto como canónico

En el modo `remote`, las ediciones locales al host realizadas fuera de OpenClaw no se sincronizan en el sandbox automáticamente después del paso de inicialización.
El transporte es SSH hacia el sandbox de OpenShell, pero el complemento posee el ciclo de vida del sandbox y la sincronización opcional del espejo.

**`setupCommand`** se ejecuta una vez después de la creación del contenedor (vía `sh -lc`). Necesita salida de red, raíz grabable, usuario root.

**Los contenedores son `network: "none"` de manera predeterminada** — configure como `"bridge"` (o una red puente personalizada) si el agente necesita acceso saliente.
`"host"` está bloqueado. `"container:<id>"` está bloqueado de manera predeterminada a menos que establezca explícitamente
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (romper cristal).

**Los archivos adjuntos entrantes** se almacenan temporalmente en `media/inbound/*` en el espacio de trabajo activo.

**`docker.binds`** monta directorios de host adicionales; los enlaces globales y por agente se combinan.

**Navegador en sandbox** (`sandbox.browser.enabled`): Chromium + CDP en un contenedor. URL de noVNC inyectada en el prompt del sistema. No requiere `browser.enabled` en `openclaw.json`.
El acceso del observador noVNC utiliza autenticación VNC de manera predeterminada y OpenClaw emite una URL de token de corta duración (en lugar de exponer la contraseña en la URL compartida).

- `allowHostControl: false` (predeterminado) bloquea que las sesiones en sandbox apunten al navegador del host.
- `network` es `openclaw-sandbox-browser` de manera predeterminada (red puente dedicada). Establezca en `bridge` solo cuando desee explícitamente conectividad de puente global.
- `cdpSourceRange` restringe opcionalmente el ingreso de CDP en el borde del contenedor a un rango CIDR (por ejemplo `172.21.0.1/32`).
- `sandbox.browser.binds` monta directorios de host adicionales solo en el contenedor del navegador sandbox. Cuando se establece (incluyendo `[]`), reemplaza `docker.binds` para el contenedor del navegador.
- Los valores predeterminados de lanzamiento se definen en `scripts/sandbox-browser-entrypoint.sh` y se ajustan para hosts de contenedor:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions` (habilitado de manera predeterminada)
  - `--disable-3d-apis`, `--disable-software-rasterizer` y `--disable-gpu` están
    habilitados de manera predeterminada y se pueden deshabilitar con
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si el uso de WebGL/3D lo requiere.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` vuelve a habilitar las extensiones si su flujo de trabajo
    depende de ellas.
  - `--renderer-process-limit=2` se puede cambiar con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`; establezca `0` para usar el límite de
    procesos predeterminado de Chromium.
  - más `--no-sandbox` y `--disable-setuid-sandbox` cuando `noSandbox` está habilitado.
  - Los valores predeterminados son la línea base de la imagen del contenedor; use una imagen de navegador personalizada con un punto de
    entrada personalizado para cambiar los valores predeterminados del contenedor.

</Accordion>

El aislamiento del navegador y `sandbox.docker.binds` son actualmente exclusivos de Docker.

Construir imágenes:

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (anulaciones por agente)

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`: id de agente estable (requerido).
- `default`: cuando se configuran varios, gana el primero (se registra una advertencia). Si no se configura ninguno, la primera entrada de la lista es la predeterminada.
- `model`: el formato de cadena anula solo `primary`; el formato de objeto `{ primary, fallbacks }` anula ambos (`[]` deshabilita los recursos alternativos globales). Los trabajos de Cron que solo anulan `primary` todavía heredan los recursos alternativos predeterminados a menos que configure `fallbacks: []`.
- `params`: parámetros de flujo por agente combinados con la entrada del modelo seleccionado en `agents.defaults.models`. Use esto para anulaciones específicas del agente como `cacheRetention`, `temperature` o `maxTokens` sin duplicar todo el catálogo de modelos.
- `runtime`: descriptor de tiempo de ejecución opcional por agente. Use `type: "acp"` con valores predeterminados `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) cuando el agente deba usar por defecto sesiones de arnés ACP.
- `identity.avatar`: ruta relativa al espacio de trabajo, URL `http(s)` o URI `data:`.
- `identity` deriva valores predeterminados: `ackReaction` de `emoji`, `mentionPatterns` de `name`/`emoji`.
- `subagents.allowAgents`: lista de permitidos de ids de agentes para `sessions_spawn` (`["*"]` = cualquiera; predeterminado: solo el mismo agente).
- Guarda de herencia de sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.

---

## Enrutamiento multiagente

Ejecute múltiples agentes aislados dentro de una sola puerta de enlace. Consulte [Multi-Agent](/es/concepts/multi-agent).

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### Campos de coincidencia de enlace

- `type` (opcional): `route` para enrutamiento normal (si falta el tipo, el valor predeterminado es route), `acp` para enlaces de conversación ACP persistentes.
- `match.channel` (requerido)
- `match.accountId` (opcional; `*` = cualquier cuenta; omitido = cuenta predeterminada)
- `match.peer` (opcional; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (opcional; específico del canal)
- `acp` (opcional; solo para `type: "acp"`): `{ mode, label, cwd, backend }`

**Orden de coincidencia determinista:**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exacto, sin peer/guild/team)
5. `match.accountId: "*"` (todo el canal)
6. Agente predeterminado

Dentro de cada nivel, gana la primera entrada `bindings` coincidente.

Para las entradas `type: "acp"`, OpenClaw resuelve por la identidad exacta de la conversación (`match.channel` + cuenta + `match.peer.id`) y no utiliza el orden de niveles de enlace de ruta anterior.

### Perfiles de acceso por agente

<Accordion title="Acceso completo (sin sandbox)">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Herramientas de solo lectura + espacio de trabajo">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Sin acceso al sistema de archivos (solo mensajería)">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

</Accordion>

Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para obtener detalles sobre la precedencia.

---

## Sesión

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    parentForkMaxTokens: 100000, // skip parent-thread fork above this token count (0 disables)
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional hard budget
      highWaterBytes: "400mb", // optional cleanup target
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unfocus in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    mainKey: "main", // legacy (runtime always uses "main")
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="Detalles del campo de sesión">

- **`dmScope`**: cómo se agrupan los MD.
  - `main`: todos los MD comparten la sesión principal.
  - `per-peer`: aislar por id de remitente a través de canales.
  - `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
  - `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para multicuenta).
- **`identityLinks`**: asignar ids canónicos a pares con prefijo de proveedor para compartir sesiones entre canales.
- **`reset`**: política de restablecimiento principal. `daily` se restablece a la `atHour` hora local; `idle` se restablece después de `idleMinutes`. Cuando ambos están configurados, gana el que expire primero.
- **`resetByType`**: anulaciones por tipo (`direct`, `group`, `thread`). El `dm` heredado se acepta como alias para `direct`.
- **`parentForkMaxTokens`**: `totalTokens` máxima de la sesión principal permitida al crear una sesión de hilo bifurcada (predeterminado `100000`).
  - Si la `totalTokens` de la matriz supera este valor, OpenClaw inicia una sesión de hilo nueva en lugar de heredar el historial de transcripciones de la matriz.
  - Establezca `0` para desactivar esta protección y permitir siempre la bifurcación de la matriz.
- **`mainKey`**: campo heredado. El tiempo de ejecución ahora siempre usa `"main"` para el depósito de chat directo principal.
- **`sendPolicy`**: coincidencia por `channel`, `chatType` (`direct|group|channel`, con alias heredado `dm`), `keyPrefix` o `rawKeyPrefix`. Gana la primera denegación.
- **`maintenance`**: controles de limpieza y retención del almacén de sesiones.
  - `mode`: `warn` emite solo advertencias; `enforce` aplica la limpieza.
  - `pruneAfter`: límite de antigüedad para entradas obsoletas (predeterminado `30d`).
  - `maxEntries`: número máximo de entradas en `sessions.json` (predeterminado `500`).
  - `rotateBytes`: rotar `sessions.json` cuando exceda este tamaño (predeterminado `10mb`).
  - `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>`. El valor predeterminado es `pruneAfter`; establezca `false` para desactivar.
  - `maxDiskBytes`: presupuesto de disco opcional para el directorio de sesiones. En el modo `warn` registra advertencias; en el modo `enforce` elimina primero los artefactos/sesiones más antiguos.
  - `highWaterBytes`: objetivo opcional después de la limpieza del presupuesto. El valor predeterminado es `80%` de `maxDiskBytes`.
- **`threadBindings`**: valores predeterminados globales para funciones de sesión vinculadas a hilos.
  - `enabled`: interruptor principal predeterminado (los proveedores pueden anular; Discord usa `channels.discord.threadBindings.enabled`)
  - `idleHours`: autodesenfoque por inactividad predeterminado en horas (`0` desactiva; los proveedores pueden anular)
  - `maxAgeHours`: edad máxima dura predeterminada en horas (`0` desactiva; los proveedores pueden anular)

</Accordion>

---

## Mensajes

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog | steer+backlog | queue | interrupt
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### Prefijo de respuesta

Anulaciones por canal/cuenta: `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Resolución (gana el más específico): cuenta → canal → global. `""` desactiva y detiene la cascada. `"auto"` deriva `[{identity.name}]`.

**Variables de plantilla:**

| Variable          | Descripción                       | Ejemplo                     |
| ----------------- | --------------------------------- | --------------------------- |
| `{model}`         | Nombre corto del modelo           | `claude-opus-4-6`           |
| `{modelFull}`     | Identificador completo del modelo | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nombre del proveedor              | `anthropic`                 |
| `{thinkingLevel}` | Nivel de pensamiento actual       | `high`, `low`, `off`        |
| `{identity.name}` | Nombre de identidad del agente    | (igual que `"auto"`)        |

Las variables no distinguen mayúsculas de minúsculas. `{think}` es un alias de `{thinkingLevel}`.

### Reacción de acuse de recibo

- Por defecto es `identity.emoji` del agente activo, de lo contrario `"👀"`. Establezca `""` para desactivar.
- Anulaciones por canal: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Orden de resolución: cuenta → canal → `messages.ackReaction` → reserva de identidad.
- Ámbito: `group-mentions` (predeterminado), `group-all`, `direct`, `all`.
- `removeAckAfterReply`: elimina el acuse de recibo después de la respuesta (solo Slack/Discord/Telegram/Google Chat).

### Anti-rebote entrante

Agrupa mensajes rápidos de solo texto del mismo remitente en un solo turno del agente. Los archivos multimedia/adjuntos se envían inmediatamente. Los comandos de control omiten el anti-rebote.

### TTS (conversión de texto a voz)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
    },
  },
}
```

- `auto` controla el TTS automático. `/tts off|always|inbound|tagged` anula por sesión.
- `summaryModel` anula `agents.defaults.model.primary` para el resumen automático.
- `modelOverrides` está habilitado de forma predeterminada; `modelOverrides.allowProvider` es `false` de forma predeterminada (opcional).
- Las claves de API recurren a `ELEVENLABS_API_KEY`/`XI_API_KEY` y `OPENAI_API_KEY`.
- `openai.baseUrl` anula el endpoint de TTS de OpenAI. El orden de resolución es la configuración, luego `OPENAI_TTS_BASE_URL`, luego `https://api.openai.com/v1`.
- Cuando `openai.baseUrl` apunta a un endpoint que no es de OpenAI, OpenClaw lo trata como un servidor TTS compatible con OpenAI y relaja la validación de modelo/voz.

---

## Hablar

Valores predeterminados para el modo Hablar (macOS/iOS/Android).

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    voiceAliases: {
      Clawd: "EXAVITQu4vr4xnSDxMaL",
      Roger: "CwhRBWXzGAHq8TQ4Fs17",
    },
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- Los IDs de voz recurren a `ELEVENLABS_VOICE_ID` o `SAG_VOICE_ID`.
- `apiKey` y `providers.*.apiKey` aceptan cadenas de texto sin formato u objetos SecretRef.
- La alternativa de `ELEVENLABS_API_KEY` se aplica solo cuando no se configura ninguna clave de API de Talk.
- `voiceAliases` permite que las directivas de Talk usen nombres amigables.
- `silenceTimeoutMs` controla cuánto tiempo espera el modo Hablar después del silencio del usuario antes de enviar la transcripción. Sin establecer, mantiene la ventana de pausa predeterminada de la plataforma (`700 ms on macOS and Android, 900 ms on iOS`).

---

## Herramientas

### Perfiles de herramientas

`tools.profile` establece una lista de permitidos base antes de `tools.allow`/`tools.deny`:

La incorporación local predetermina las nuevas configuraciones locales a `tools.profile: "coding"` cuando no está establecido (se conservan los perfiles explícitos existentes).

| Perfil      | Incluye                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------- |
| `minimal`   | Solo `session_status`                                                                     |
| `coding`    | `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`                    |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status` |
| `full`      | Sin restricción (lo mismo que sin establecer)                                             |

### Grupos de herramientas

| Grupo              | Herramientas                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process` (`bash` se acepta como un alias para `exec`)                           |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                   |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                            |
| `group:web`        | `web_search`, `web_fetch`                                                                |
| `group:ui`         | `browser`, `canvas`                                                                      |
| `group:automation` | `cron`, `gateway`                                                                        |
| `group:messaging`  | `message`                                                                                |
| `group:nodes`      | `nodes`                                                                                  |
| `group:openclaw`   | Todas las herramientas integradas (excluye complementos de proveedores)                  |

### `tools.allow` / `tools.deny`

Política global de permiso/denegación de herramientas (la denegación prevalece). No distingue mayúsculas/minúsculas, admite comodines `*`. Se aplica incluso cuando el sandbox de Docker está desactivado.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

Restrinja aún más las herramientas para proveedores o modelos específicos. Orden: perfil base → perfil de proveedor → permitir/denegar.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

Controla el acceso de ejecución elevado (anfitrión):

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- La anulación por agente (`agents.list[].tools.elevated`) solo puede restringir más.
- `/elevated on|off|ask|full` almacena el estado por sesión; las directivas en línea se aplican a un solo mensaje.
- El `exec` elevado se ejecuta en el anfitrión, omite el sandbox.

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.2"],
      },
    },
  },
}
```

### `tools.loopDetection`

Las comprobaciones de seguridad de bucle de herramientas están **deshabilitadas de forma predeterminada**. Establezca `enabled: true` para activar la detección.
La configuración se puede definir globalmente en `tools.loopDetection` y anuladas por agente en `agents.list[].tools.loopDetection`.

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `historySize`: máximo historial de llamadas a herramientas retenido para el análisis de bucle.
- `warningThreshold`: umbral de patrón de sin progreso repetido para advertencias.
- `criticalThreshold`: umbral repetitivo más alto para bloquear bucles críticos.
- `globalCircuitBreakerThreshold`: umbral de parada forzada para cualquier ejecución sin progreso.
- `detectors.genericRepeat`: advertir sobre llamadas repetidas de la misma herramienta/mismos argumentos.
- `detectors.knownPollNoProgress`: advertir/bloquear herramientas de sondeo conocidas (`process.poll`, `command_status`, etc.).
- `detectors.pingPong`: advertir/bloquear patrones de pares alternos sin progreso.
- Si `warningThreshold >= criticalThreshold` o `criticalThreshold >= globalCircuitBreakerThreshold`, la validación falla.

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // or BRAVE_API_KEY env
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

Configura la comprensión de medios entrantes (imagen/audio/video):

```json5
{
  tools: {
    media: {
      concurrency: 2,
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<Accordion title="Campos de entrada del modelo multimedia">

**Entrada de proveedor** (`type: "provider"` u omitida):

- `provider`: id del proveedor de API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
- `model`: anulación del id del modelo
- `profile` / `preferredProfile`: selección del perfil `auth-profiles.json`

**Entrada CLI** (`type: "cli"`):

- `command`: ejecutable a ejecutar
- `args`: argumentos con plantillas (admite `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.)

**Campos comunes:**

- `capabilities`: lista opcional (`image`, `audio`, `video`). Predeterminados: `openai`/`anthropic`/`minimax` → imagen, `google` → imagen+audio+vídeo, `groq` → audio.
- `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: anulaciones por entrada.
- Los fallos recurren a la siguiente entrada.

La autenticación del proveedor sigue el orden estándar: `auth-profiles.json` → vars de entorno → `models.providers.*.apiKey`.

</Accordion>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

Controla qué sesiones pueden ser objetivo de las herramientas de sesión (`sessions_list`, `sessions_history`, `sessions_send`).

Predeterminado: `tree` (sesión actual + sesiones generadas por ella, como subagentes).

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

Notas:

- `self`: solo la clave de la sesión actual.
- `tree`: sesión actual + sesiones generadas por la sesión actual (subagentes).
- `agent`: cualquier sesión que pertenezca al ID de agente actual (puede incluir otros usuarios si ejecutas sesiones por remitente bajo el mismo ID de agente).
- `all`: cualquier sesión. La orientación entre agentes aún requiere `tools.agentToAgent`.
- Fijación de sandbox: cuando la sesión actual está en modo sandbox y `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilidad se fuerza a `tree` incluso si `tools.sessions.visibility="all"`.

### `tools.sessions_spawn`

Controla el soporte de archivos adjuntos en línea para `sessions_spawn`.

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

Notas:

- Los archivos adjuntos solo son compatibles con `runtime: "subagent"`. El tiempo de ejecución de ACP los rechaza.
- Los archivos se materializan en el espacio de trabajo secundario en `.openclaw/attachments/<uuid>/` con un `.manifest.json`.
- El contenido de los archivos adjuntos se redacta automáticamente de la persistencia de las transcripciones.
- Las entradas Base64 se validan con comprobaciones estrictas de alfabeto y relleno, así como con una protección de tamaño previa a la decodificación.
- Los permisos de archivo son `0700` para directorios y `0600` para archivos.
- La limpieza sigue la política `cleanup`: `delete` siempre elimina los archivos adjuntos; `keep` los conserva solo cuando `retainOnSessionKeep: true`.

### `tools.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        model: "minimax/MiniMax-M2.5",
        maxConcurrent: 1,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`: modelo predeterminado para subagentes generados. Si se omite, los subagentes heredan el modelo de quien realiza la llamada.
- `runTimeoutSeconds`: tiempo de espera predeterminado (segundos) para `sessions_spawn` cuando la llamada a la herramienta omite `runTimeoutSeconds`. `0` significa sin tiempo de espera.
- Política de herramientas por subagente: `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Proveedores personalizados y URL base

OpenClaw utiliza el catálogo de modelos de pi-coding-agent. Añada proveedores personalizados mediante `models.providers` en la configuración o `~/.openclaw/agents/<agentId>/agent/models.json`.

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- Use `authHeader: true` + `headers` para necesidades de autenticación personalizadas.
- Anule la raíz de configuración del agente con `OPENCLAW_AGENT_DIR` (o `PI_CODING_AGENT_DIR`).
- Precedencia de fusión para IDs de proveedores coincidentes:
  - Los valores de agente `models.json` `baseUrl` no vacíos tienen prioridad.
  - Los valores de agente `apiKey` no vacíos tienen prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
  - Los valores del proveedor `apiKey` gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
  - Los valores de cabecera del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
  - Los valores `apiKey`/`baseUrl` del agente vacíos o ausentes recurren a `models.providers` en la configuración.
  - El modelo coincidente `contextWindow`/`maxTokens` utiliza el valor más alto entre la configuración explícita y los valores implícitos del catálogo.
  - Use `models.mode: "replace"` cuando quiera que la configuración reescriba completamente `models.json`.
  - La persistencia de marcadores está autorizada por la fuente: los marcadores se escriben desde la instantánea de configuración de origen activa (pre-resolución), no desde los valores de secretos resueltos en tiempo de ejecución.

### Detalles del campo del proveedor

- `models.mode`: comportamiento del catálogo de proveedores (`merge` o `replace`).
- `models.providers`: mapa de proveedores personalizados clave por id de proveedor.
- `models.providers.*.api`: adaptador de solicitud (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc).
- `models.providers.*.apiKey`: credencial del proveedor (preferir SecretRef/sustitución de entorno).
- `models.providers.*.auth`: estrategia de autenticación (`api-key`, `token`, `oauth`, `aws-sdk`).
- `models.providers.*.injectNumCtxForOpenAICompat`: para Ollama + `openai-completions`, inyecta `options.num_ctx` en las solicitudes (predeterminado: `true`).
- `models.providers.*.authHeader`: fuerza el transporte de credenciales en el encabezado `Authorization` cuando se requiera.
- `models.providers.*.baseUrl`: URL base de la API ascendente.
- `models.providers.*.headers`: encabezados estáticos adicionales para el enrutamiento de proxy/inquilino.
- `models.providers.*.models`: entradas explícitas del catálogo de modelos del proveedor.
- `models.providers.*.models.*.compat.supportsDeveloperRole`: sugerencia de compatibilidad opcional. Para `api: "openai-completions"` con un `baseUrl` no nativo no vacío (host no `api.openai.com`), OpenClaw fuerza esto a `false` en tiempo de ejecución. `baseUrl` vacío/omitido mantiene el comportamiento predeterminado de OpenAI.
- `models.bedrockDiscovery`: raíz de configuraciones de autodescubrimiento de Bedrock.
- `models.bedrockDiscovery.enabled`: activar/desactivar el sondeo de descubrimiento.
- `models.bedrockDiscovery.region`: región de AWS para el descubrimiento.
- `models.bedrockDiscovery.providerFilter`: filtro de id. de proveedor opcional para descubrimiento dirigido.
- `models.bedrockDiscovery.refreshInterval`: intervalo de sondeo para la actualización del descubrimiento.
- `models.bedrockDiscovery.defaultContextWindow`: ventana de contexto alternativa para modelos descubiertos.
- `models.bedrockDiscovery.defaultMaxTokens`: tokens máximos de salida alternativos para modelos descubiertos.

### Ejemplos de proveedores

<Accordion title="Cerebras (GLM 4.6 / 4.7)">

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: {
        primary: "cerebras/zai-glm-4.7",
        fallbacks: ["cerebras/zai-glm-4.6"],
      },
      models: {
        "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
        "cerebras/zai-glm-4.6": { alias: "GLM 4.6 (Cerebras)" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
          { id: "zai-glm-4.6", name: "GLM 4.6 (Cerebras)" },
        ],
      },
    },
  },
}
```

Use `cerebras/zai-glm-4.7` para Cerebras; `zai/glm-4.7` para Z.AI directo.

</Accordion>

<Accordion title="OpenCode">

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-6" },
      models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
    },
  },
}
```

Establezca `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`). Use referencias `opencode/...` para el catálogo Zen o referencias `opencode-go/...` para el catálogo Go. Atajo: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`.

</Accordion>

<Accordion title="Z.AI (GLM-4.7)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} },
    },
  },
}
```

Configure `ZAI_API_KEY`. `z.ai/*` y `z-ai/*` son alias aceptados. Atajo: `openclaw onboard --auth-choice zai-api-key`.

- Endpoint general: `https://api.z.ai/api/paas/v4`
- Endpoint de codificación (predeterminado): `https://api.z.ai/api/coding/paas/v4`
- Para el endpoint general, defina un proveedor personalizado con la sobrescritura de la URL base.

</Accordion>

<Accordion title="Moonshot AI (Kimi)">

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: { "moonshot/kimi-k2.5": { alias: "Kimi K2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Para el endpoint de China: `baseUrl: "https://api.moonshot.cn/v1"` o `openclaw onboard --auth-choice moonshot-api-key-cn`.

</Accordion>

<Accordion title="Kimi Coding">

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: { "kimi-coding/k2p5": { alias: "Kimi K2.5" } },
    },
  },
}
```

Proveedor integrado compatible con Anthropic. Atajo: `openclaw onboard --auth-choice kimi-code-api-key`.

</Accordion>

<Accordion title="Synthetic (Anthropic-compatible)">

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

La URL base debe omitir `/v1` (el cliente de Anthropic lo añade). Atajo: `openclaw onboard --auth-choice synthetic-api-key`.

</Accordion>

<Accordion title="MiniMax M2.5 (direct)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "Minimax" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 15, output: 60, cacheRead: 2, cacheWrite: 10 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Configure `MINIMAX_API_KEY`. Atajo: `openclaw onboard --auth-choice minimax-api`.

</Accordion>

<Accordion title="Local models (LM Studio)">

Consulte [Modelos locales](/es/gateway/local-models). Resumen: ejecute MiniMax M2.5 a través de la API de Respuestas de LM Studio en hardware potente; mantenga los modelos alojados fusionados para reserva.

</Accordion>

---

## Habilidades

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`: lista de permitidos opcional solo para habilidades integradas (las habilidades gestionadas/en el espacio de trabajo no se ven afectadas).
- `entries.<skillKey>.enabled: false` deshabilita una habilidad incluso si está integrada/instalada.
- `entries.<skillKey>.apiKey`: conveniencia para habilidades que declaran una variable de entorno principal (cadena de texto sin formato u objeto SecretRef).

---

## Complementos

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-extension"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- Cargados desde `~/.openclaw/extensions`, `<workspace>/.openclaw/extensions`, además de `plugins.load.paths`.
- El descubrimiento acepta complementos nativos de OpenClaw, además de paquetes de Codex y paquetes de Claude compatibles, incluidos los paquetes de diseño predeterminado de Claude sin manifiesto.
- **Los cambios de configuración requieren reiniciar la puerta de enlace.**
- `allow`: lista de permitidos opcional (solo se cargan los complementos listados). `deny` tiene prioridad.
- `plugins.entries.<id>.apiKey`: campo de comodidad para la clave API a nivel de complemento (cuando el complemento lo admite).
- `plugins.entries.<id>.env`: mapa de variables de entorno con ámbito de complemento.
- `plugins.entries.<id>.hooks.allowPromptInjection`: cuando `false`, el núcleo bloquea `before_prompt_build` e ignora los campos de mutación de solicitudes de `before_agent_start` heredados, al tiempo que preserva los campos `modelOverride` y `providerOverride` heredados. Se aplica a los enlaces de complementos nativos y a los directorios de enlaces proporcionados por paquetes compatibles.
- `plugins.entries.<id>.subagent.allowModelOverride`: confía explícitamente en este complemento para solicitar anulaciones `provider` y `model` por ejecución para ejecuciones de subagentes en segundo plano.
- `plugins.entries.<id>.subagent.allowedModels`: lista de permitidos opcional de objetivos `provider/model` canónicos para anulaciones de subagentes de confianza. Use `"*"` solo cuando intencionalmente desee permitir cualquier modelo.
- `plugins.entries.<id>.config`: objeto de configuración definido por el complemento (validado por el esquema de complemento nativo de OpenClaw cuando está disponible).
- Los complementos de paquetes de Claude habilitados también pueden contribuir con valores predeterminados de Pi integrados desde `settings.json`; OpenClaw aplica esos como configuraciones de agente saneadas, no como parches de configuración de OpenClaw sin procesar.
- `plugins.slots.memory`: elija el id del complemento de memoria activo, o `"none"` para deshabilitar los complementos de memoria.
- `plugins.slots.contextEngine`: elija el id del complemento del motor de contexto activo; el valor predeterminado es `"legacy"` a menos que instale y seleccione otro motor.
- `plugins.installs`: metadatos de instalación administrados por la CLI utilizados por `openclaw plugins update`.
  - Incluye `source`, `spec`, `sourcePath`, `installPath`, `version`, `resolvedName`, `resolvedVersion`, `resolvedSpec`, `integrity`, `shasum`, `resolvedAt`, `installedAt`.
  - Trate `plugins.installs.*` como estado administrado; prefiera los comandos de la CLI sobre las ediciones manuales.

Consulte [Plugins](/es/tools/plugin).

---

## Navegador

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` deshabilita `act:evaluate` y `wait --fn`.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` es `true` de forma predeterminada cuando no se establece (modelo de red de confianza).
- Establezca `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` para una navegación del navegador estrictamente pública.
- En modo estricto, los puntos finales del perfil CDP remoto (`profiles.*.cdpUrl`) están sujetos al mismo bloqueo de red privada durante las comprobaciones de accesibilidad/detección.
- `ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como alias heredado.
- En modo estricto, use `ssrfPolicy.hostnameAllowlist` y `ssrfPolicy.allowedHostnames` para excepciones explícitas.
- Los perfiles remotos son solo de conexión (inicio/detención/reinicio deshabilitados).
- Los perfiles `existing-session` son solo de host y usan Chrome MCP en lugar de CDP.
- Los perfiles `existing-session` pueden establecer `userDataDir` para apuntar a un perfil de navegador específico basado en Chromium, como Brave o Edge.
- Orden de autodetección: navegador predeterminado si está basado en Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- Servicio de control: solo loopback (puerto derivado de `gateway.port`, predeterminado `18791`).
- `extraArgs` añade indicadores de inicio adicionales al inicio local de Chromium (por ejemplo, `--disable-gpu`, tamaño de ventana o indicadores de depuración).

---

## Interfaz de usuario

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor`: color de acento para el cromo de la interfaz de usuario de la aplicación nativa (tinte de burbuja del Modo Talk, etc.).
- `assistant`: anulación de identidad de la interfaz de usuario de control. Se remite a la identidad del agente activo.

---

## Puerta de enlace

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Detalles de los campos de Gateway">

- `mode`: `local` (ejecutar gateway) o `remote` (conectarse a un gateway remoto). El gateway se niega a iniciar a menos que `local`.
- `port`: puerto multiplexado único para WS + HTTP. Precedencia: `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind`: `auto`, `loopback` (predeterminado), `lan` (`0.0.0.0`), `tailnet` (solo IP de Tailscale) o `custom`.
- **Alias de enlace heredados**: use los valores del modo de enlace en `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), no los alias de host (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Nota de Docker**: el enlace `loopback` predeterminado escucha en `127.0.0.1` dentro del contenedor. Con la red de puente de Docker (`-p 18789:18789`), el tráfico llega en `eth0`, por lo que el gateway es inaccesible. Use `--network host`, o establezca `bind: "lan"` (o `bind: "custom"` con `customBindHost: "0.0.0.0"`) para escuchar en todas las interfaces.
- **Auth**: requerido de forma predeterminada. Los enlaces no locales requieren un token/contraseña compartida. El asistente de incorporación genera un token de forma predeterminada.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados (incluyendo SecretRefs), establezca `gateway.auth.mode` explícitamente a `token` o `password`. Los flujos de inicio y de instalación/reparación del servicio fallan cuando ambos están configurados y el modo no está establecido.
- `gateway.auth.mode: "none"`: modo explícito sin autenticación. Úselo solo para configuraciones de bucle local confiables; esto intencionalmente no se ofrece en los mensajes de incorporación.
- `gateway.auth.mode: "trusted-proxy"`: delega la autenticación a un proxy inverso con reconocimiento de identidad y confía en los encabezados de identidad de `gateway.trustedProxies` (ver [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).
- `gateway.auth.allowTailscale`: cuando `true`, los encabezados de identidad de Tailscale Serve pueden satisfacer la autenticación de la IU de control/WebSocket (verificados a través de `tailscale whois`); los puntos finales de la API HTTP aún requieren autenticación por token/contraseña. Este flujo sin token asume que el host del gateway es confiable. El valor predeterminado es `true` cuando `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit`: limitador opcional de autenticaciones fallidas. Se aplica por IP de cliente y por ámbito de autenticación (el secreto compartido y el token de dispositivo se rastrean de forma independiente). Los intentos bloqueados devuelven `429` + `Retry-After`.
  - `gateway.auth.rateLimit.exemptLoopback` el valor predeterminado es `true`; establezca `false` cuando intencionalmente desee que el tráfico de localhost también tenga límites de velocidad (para configuraciones de prueba o implementaciones de proxy estrictas).
- Los intentos de autenticación WS de origen del navegador siempre se limitan con la exención de bucle local deshabilitada (defensa en profundidad contra la fuerza bruta de localhost basada en navegador).
- `tailscale.mode`: `serve` (solo tailnet, enlace de bucle local) o `funnel` (público, requiere autenticación).
- `controlUi.allowedOrigins`: lista de permitidos explícita de origen del navegador para las conexiones WebSocket del Gateway. Requerido cuando se esperan clientes de navegador de orígenes que no son de bucle local.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: modo peligroso que habilita la reserva de origen del encabezado Host para las implementaciones que intencionalmente confían en la política de origen del encabezado Host.
- `remote.transport`: `ssh` (predeterminado) o `direct` (ws/wss). Para `direct`, `remote.url` debe ser `ws://` o `wss://`.
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: anulación de emergencia del lado del cliente que permite `ws://` en texto plano a IPs de red privada confiables; el valor predeterminado sigue siendo solo bucle local para texto plano.
- `gateway.remote.token` / `.password` son campos de credenciales de cliente remoto. No configuran la autenticación del gateway por sí mismos.
- `gateway.push.apns.relay.baseUrl`: URL HTTPS base para el relé APNs externo utilizado por las compilaciones oficiales/TestFlight de iOS después de publicar registros respaldados por relé al gateway. Esta URL debe coincidir con la URL del relé compilada en la compilación de iOS.
- `gateway.push.apns.relay.timeoutMs`: tiempo de espera de envío de gateway a relé en milisegundos. El valor predeterminado es `10000`.
- Los registros respaldados por relé se delegan a una identidad específica del gateway. La aplicación iOS emparejada obtiene `gateway.identity.get`, incluye esa identidad en el registro del relé y reenvía un permiso de envío con ámbito de registro al gateway. Otro gateway no puede reutilizar ese registro almacenado.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: anulaciones de entorno temporales para la configuración del relé anterior.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: escape de desarrollo solo para URL de relé HTTP de bucle local. Las URL de relé de producción deben mantenerse en HTTPS.
- `gateway.channelHealthCheckMinutes`: intervalo del monitor de salud del canal en minutos. Establezca `0` para desactivar globalmente los reinicios del monitor de salud. Predeterminado: `5`.
- `gateway.channelStaleEventThresholdMinutes`: umbral de socket obsoleto en minutos. Manténgalo mayor o igual a `gateway.channelHealthCheckMinutes`. Predeterminado: `30`.
- `gateway.channelMaxRestartsPerHour`: máximo de reinicios del monitor de salud por canal/cuenta en una hora móvil. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: opción de no participación por canal para los reinicios del monitor de salud mientras se mantiene el monitor global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación por cuenta para canales multicuenta. Cuando se establece, tiene prioridad sobre la anulación a nivel de canal.
- Las rutas de llamada de la pasarela local pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente a través de SecretRef y no se resuelve, la resolución falla cerrada (sin enmascaramiento de reserva remota).
- `trustedProxies`: IPs de proxy inverso que terminan TLS. Enumere solo los proxies que controla.
- `allowRealIpFallback`: cuando `true`, el gateway acepta `X-Real-IP` si `X-Forwarded-For` falta. Predeterminado `false` para el comportamiento de cierre seguro.
- `gateway.tools.deny`: nombres de herramientas adicionales bloqueadas para el `POST /tools/invoke` HTTP (extiende la lista de denegación predeterminada).
- `gateway.tools.allow`: elimina nombres de herramientas de la lista de denegación HTTP predeterminada.

</Accordion>

### Endpoints compatibles con OpenAI

- Chat Completions: deshabilitado por defecto. Habilítelo con `gateway.http.endpoints.chatCompletions.enabled: true`.
- Responses API: `gateway.http.endpoints.responses.enabled`.
- Responses URL-input hardening:
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Las listas de permitidos vacías se tratan como no establecidas; use `gateway.http.endpoints.responses.files.allowUrl=false`
    y/o `gateway.http.endpoints.responses.images.allowUrl=false` para deshabilitar la obtención de URL.
- Optional response hardening header:
  - `gateway.http.securityHeaders.strictTransportSecurity` (establezca solo para orígenes HTTPS que controle; consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Aislamiento de múltiples instancias

Ejecute múltiples puertas de enlace en un solo host con puertos y directorios de estado únicos:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Marcas de conveniencia: `--dev` (usa `~/.openclaw-dev` + puerto `19001`), `--profile <name>` (usa `~/.openclaw-<name>`).

Consulte [Multiple Gateways](/es/gateway/multiple-gateways).

---

## Hooks

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.2-mini",
      },
    ],
  },
}
```

Auth: `Authorization: Bearer <token>` o `x-openclaw-token: <token>`.

**Endpoints:**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - `sessionKey` de la carga útil de la solicitud se acepta solo cuando `hooks.allowRequestSessionKey=true` (predeterminado: `false`).
- `POST /hooks/<name>` → resuelto a través de `hooks.mappings`

<Accordion title="Detalles del mapeo">

- `match.path` coincide con la sub-ruta después de `/hooks` (p. ej., `/hooks/gmail` → `gmail`).
- `match.source` coincide con un campo del payload para rutas genéricas.
- Las plantillas como `{{messages[0].subject}}` leen del payload.
- `transform` puede apuntar a un módulo JS/TS que devuelva una acción de hook.
  - `transform.module` debe ser una ruta relativa y permanecer dentro de `hooks.transformsDir` (se rechazan las rutas absolutas y el recorrido).
- `agentId` enruta a un agente específico; los IDs desconocidos vuelven al valor predeterminado.
- `allowedAgentIds`: restringe el enrutamiento explícito (`*` u omitido = permitir todo, `[]` = denegar todo).
- `defaultSessionKey`: clave de sesión fija opcional para ejecuciones de agente de hook sin `sessionKey` explícito.
- `allowRequestSessionKey`: permite a los callers `/hooks/agent` establecer `sessionKey` (predeterminado: `false`).
- `allowedSessionKeyPrefixes`: lista de permitidos de prefijo opcional para valores `sessionKey` explícitos (solicitud + mapeo), p. ej., `["hook:"]`.
- `deliver: true` envía la respuesta final a un canal; `channel` tiene como valor predeterminado `last`.
- `model` anula el LLM para esta ejecución de hook (debe estar permitido si se establece el catálogo de modelos).

</Accordion>

### Integración con Gmail

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- Gateway inicia automáticamente `gog gmail watch serve` al arrancar cuando está configurado. Establezca `OPENCLAW_SKIP_GMAIL_WATCHER=1` para desactivar.
- No ejecute un `gog gmail watch serve` separado junto al Gateway.

---

## Host de Canvas

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- Sirve HTML/CSS/JS editable por agentes y A2UI a través de HTTP bajo el puerto del Gateway:
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Solo local: mantenga `gateway.bind: "loopback"` (predeterminado).
- Enlaces no loopback: las rutas de canvas requieren autenticación del Gateway (token/contraseña/proxy de confianza), igual que otras superficies HTTP del Gateway.
- Los WebViews de nodo generalmente no envían encabezados de autenticación; después de que un nodo se empareja y conecta, el Gateway anuncia URL de capacidad con alcance de nodo para el acceso a canvas/A2UI.
- Las URL de capacidad están vinculadas a la sesión WS del nodo activo y expiran rápidamente. No se utiliza una reserva basada en IP.
- Inyecta el cliente de recarga en vivo (live-reload) en el HTML servido.
- Crea automáticamente un `index.html` inicial cuando está vacío.
- También sirve A2UI en `/__openclaw__/a2ui/`.
- Los cambios requieren un reinicio del gateway.
- Desactive la recarga en vivo para directorios grandes o errores de `EMFILE`.

---

## Descubrimiento

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal` (predeterminado): omite `cliPath` + `sshPort` de los registros TXT.
- `full`: incluye `cliPath` + `sshPort`.
- El nombre de host predeterminado es `openclaw`. Anular con `OPENCLAW_MDNS_HOSTNAME`.

### Área amplia (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Escribe una zona DNS-SD unicast bajo `~/.openclaw/dns/`. Para el descubrimiento entre redes, combine con un servidor DNS (se recomienda CoreDNS) + DNS dividido Tailscale.

Configuración: `openclaw dns setup --apply`.

---

## Entorno

### `env` (variables de entorno en línea)

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- Las variables de entorno en línea solo se aplican si al entorno del proceso le falta la clave.
- Archivos `.env`: CWD `.env` + `~/.openclaw/.env` (ninguno anula las variables existentes).
- `shellEnv`: importa las claves esperadas faltantes desde el perfil de su shell de inicio de sesión.
- Consulte [Environment](/es/help/environment) para obtener la precedencia completa.

### Sustitución de variables de entorno

Referencie variables de entorno en cualquier cadena de configuración con `${VAR_NAME}`:

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Solo coinciden los nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`.
- Las variables faltantes o vacías generan un error al cargar la configuración.
- Escape con `$${VAR}` para obtener un `${VAR}` literal.
- Funciona con `$include`.

---

## Secretos

Las referencias secretas son aditivas: los valores de texto sin formato todavía funcionan.

### `SecretRef`

Use una forma de objeto:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validación:

- `provider` patrón: `^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` patrón de id: `^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id: puntero JSON absoluto (por ejemplo `"/providers/openai/apiKey"`)
- `source: "exec"` patrón de id: `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- Los ids `source: "exec"` no deben contener segmentos de ruta delimitados por `.` o `..` `.` (por ejemplo `a/../b` es rechazado)

### Superficie de credenciales compatible

- Matriz canónica: [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)
- Los objetivos `secrets apply` admiten rutas de credenciales `openclaw.json`.
- Las referencias `auth-profiles.json` se incluyen en la resolución en tiempo de ejecución y la cobertura de auditoría.

### Configuración de proveedores de secretos

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

Notas:

- El proveedor `file` admite `mode: "json"` y `mode: "singleValue"` (`id` debe ser `"value"` en modo singleValue).
- El proveedor `exec` requiere una ruta `command` absoluta y utiliza cargas de protocolo en stdin/stdout.
- De forma predeterminada, se rechazan las rutas de comandos de enlaces simbólicos. Configure `allowSymlinkCommand: true` para permitir rutas de enlaces simbólicos mientras valida la ruta de destino resuelta.
- Si `trustedDirs` está configurado, la verificación de directorio confiable se aplica a la ruta de destino resuelta.
- El entorno secundario `exec` es mínimo de forma predeterminada; pase las variables requeridas explícitamente con `passEnv`.
- Las referencias de secretos se resuelven en el momento de la activación en una instantánea en memoria, luego las rutas de solicitud leen solo la instantánea.
- El filtrado de superficie activa se aplica durante la activación: las referencias sin resolver en superficies habilitadas fallan el inicio/recarga, mientras que las superficies inactivas se omiten con diagnóstico.

---

## Almacenamiento de autenticación

```json5
{
  auth: {
    profiles: {
      "anthropic:me@example.com": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"],
    },
  },
}
```

- Los perfiles por agente se almacenan en `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` admite referencias a nivel de valor (`keyRef` para `api_key`, `tokenRef` para `token`).
- Las credenciales estáticas en tiempo de ejecución provienen de instantáneas resueltas en memoria; las entradas estáticas heredadas de `auth.json` se eliminan cuando se descubren.
- Importaciones heredadas de OAuth desde `~/.openclaw/credentials/oauth.json`.
- Consulte [OAuth](/es/concepts/oauth).
- Comportamiento en tiempo de ejecución de Secrets y herramientas de `audit/configure/apply`: [Secrets Management](/es/gateway/secrets).

---

## Registro

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- Archivo de registro predeterminado: `/tmp/openclaw/openclaw-YYYY-MM-DD.log`.
- Establezca `logging.file` para una ruta estable.
- `consoleLevel` aumenta a `debug` cuando `--verbose`.

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` controla el estilo de la eslogan del banner:
  - `"random"` (predeterminado): eslógones divertidos/de temporada rotativos.
  - `"default"`: eslogan neutral fijo (`All your chats, one OpenClaw.`).
  - `"off"`: sin texto de eslogan (el título del banner y la versión aún se muestran).
- Para ocultar todo el banner (no solo los eslóganes), establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

---

## Asistente

Metadatos escritos por los flujos de configuración guiados de la CLI (`onboard`, `configure`, `doctor`):

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## Identidad

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
      },
    ],
  },
}
```

Escrito por el asistente de incorporación de macOS. Deriva valores predeterminados:

- `messages.ackReaction` de `identity.emoji` ( vuelve a 👀)
- `mentionPatterns` de `identity.name`/`identity.emoji`
- `avatar` acepta: ruta relativa al espacio de trabajo, URL `http(s)` o URI `data:`

---

## Puente (heredado, eliminado)

Las compilaciones actuales ya no incluyen el puente TCP. Los nodos se conectan a través del WebSocket de Gateway. Las claves `bridge.*` ya no son parte del esquema de configuración (la validación falla hasta que se eliminen; `openclaw doctor --fix` puede eliminar las claves desconocidas).

<Accordion title="Configuración del puente heredado (referencia histórica)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2,
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention`: cuánto tiempo mantener las sesiones de ejecución de cron aisladas completas antes de eliminarlas de `sessions.json`. También controla la limpieza de las transcripciones de cron archivadas y eliminadas. Predeterminado: `24h`; establezca `false` para desactivar.
- `runLog.maxBytes`: tamaño máximo por archivo de registro de ejecución (`cron/runs/<jobId>.jsonl`) antes de la eliminación. Predeterminado: `2_000_000` bytes.
- `runLog.keepLines`: líneas más recientes retenidas cuando se activa la poda del registro de ejecución. Predeterminado: `2000`.
- `webhookToken`: token de portador utilizado para la entrega POST del webhook de cron (`delivery.mode = "webhook"`), si se omite no se envía ningún encabezado de autenticación.
- `webhook`: URL del webhook de respaldo heredado en desuso (http/https) utilizada solo para trabajos almacenados que todavía tienen `notify: true`.

Consulte [Cron Jobs](/es/automation/cron-jobs).

---

## Variables de plantilla del modelo de medios

Marcadores de posición de plantilla expandidos en `tools.media.models[].args`:

| Variable           | Descripción                                                   |
| ------------------ | ------------------------------------------------------------- |
| `{{Body}}`         | Cuerpo completo del mensaje entrante                          |
| `{{RawBody}}`      | Cuerpo sin procesar (sin contenedores de historial/remitente) |
| `{{BodyStripped}}` | Cuerpo sin las menciones grupales                             |
| `{{From}}`         | Identificador del remitente                                   |
| `{{To}}`           | Identificador del destino                                     |
| `{{MessageSid}}`   | ID del mensaje del canal                                      |
| `{{SessionId}}`    | UUID de la sesión actual                                      |
| `{{IsNewSession}}` | `"true"` cuando se crea una nueva sesión                      |
| `{{MediaUrl}}`     | Pseudo-URL de medios entrantes                                |
| `{{MediaPath}}`    | Ruta de medios local                                          |
| `{{MediaType}}`    | Tipo de medio (imagen/audio/documento/…)                      |
| `{{Transcript}}`   | Transcripción de audio                                        |
| `{{Prompt}}`       | Prompt de medios resuelto para entradas de CLI                |
| `{{MaxChars}}`     | Máximo de caracteres de salida resueltos para entradas de CLI |
| `{{ChatType}}`     | `"direct"` o `"group"`                                        |
| `{{GroupSubject}}` | Asunto del grupo (mejor esfuerzo)                             |
| `{{GroupMembers}}` | Vista previa de los miembros del grupo (mejor esfuerzo)       |
| `{{SenderName}}`   | Nombre para mostrar del remitente (mejor esfuerzo)            |
| `{{SenderE164}}`   | Número de teléfono del remitente (mejor esfuerzo)             |
| `{{Provider}}`     | Indicación del proveedor (whatsapp, telegram, discord, etc.)  |

---

## Inclusiones de configuración (`$include`)

Dividir la configuración en varios archivos:

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**Comportamiento de fusión:**

- Archivo único: reemplaza al objeto contenedor.
- Matriz de archivos: fusionados en profundidad en orden (los posteriores sobrescriben a los anteriores).
- Claves hermanas: fusionadas después de las inclusiones (sobrescriben los valores incluidos).
- Inclusiones anidadas: hasta 10 niveles de profundidad.
- Rutas: se resuelven en relación con el archivo que incluye, pero deben permanecer dentro del directorio de configuración de nivel superior (`dirname` de `openclaw.json`). Las formas absolutas/`../` solo se permiten cuando aún se resuelven dentro de ese límite.
- Errores: mensajes claros para archivos faltantes, errores de análisis e inclusiones circulares.

---

_Relacionado: [Configuración](/es/gateway/configuration) · [Ejemplos de configuración](/es/gateway/configuration-examples) · [Doctor](/es/gateway/doctor)_

import es from "/components/footer/es.mdx";

<es />
