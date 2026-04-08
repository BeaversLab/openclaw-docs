---
title: "Referencia de configuración"
summary: "Referencia completa para cada clave de configuración de OpenClaw, valores predeterminados y configuración de canales"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# Referencia de configuración

Todos los campos disponibles en `~/.openclaw/openclaw.json`. Para obtener una descripción general orientada a tareas, consulte [Configuración](/en/gateway/configuration).

El formato de configuración es **JSON5** (se permiten comentarios y comas finales). Todos los campos son opcionales; OpenClaw usa valores predeterminados seguros cuando se omiten.

---

## Canales

Cada canal se inicia automáticamente cuando existe su sección de configuración (a menos que `enabled: false`).

### Acceso a MD y grupos

Todos los canales admiten políticas de MD y políticas de grupos:

| Política de MD             | Comportamiento                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pairing` (predeterminado) | Los remitentes desconocidos reciben un código de vinculación de un solo uso; el propietario debe aprobarlo |
| `allowlist`                | Solo remitentes en `allowFrom` (o almacén de permisos emparejado)                                          |
| `open`                     | Permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)                                              |
| `disabled`                 | Ignorar todos los MD entrantes                                                                             |

| Política de grupo            | Comportamiento                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `allowlist` (predeterminado) | Solo grupos que coincidan con la lista de permitidos configurada                  |
| `open`                       | Omitir las listas de permitidos de grupos (el filtrado por mención aún se aplica) |
| `disabled`                   | Bloquear todos los mensajes de grupo/sala                                         |

<Note>
`channels.defaults.groupPolicy` establece el valor predeterminado cuando el `groupPolicy` de un proveedor no está configurado.
Los códigos de emparejamiento caducan después de 1 hora. Las solicitudes pendientes de emparejamiento por MD están limitadas a **3 por canal**.
Si falta un bloque de proveedor por completo (`channels.<provider>` ausente), la política de grupo en tiempo de ejecución vuelve a `allowlist` (falla cerrada) con una advertencia de inicio.
</Note>

### Invalidaciones de modelo de canal

Use `channels.modelByChannel` para fijar ID de canal específicos a un modelo. Los valores aceptan `provider/model` o alias de modelo configurados. La asignación de canal se aplica cuando una sesión aún no tiene una anulación de modelo (por ejemplo, establecida a través de `/model`).

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

### Valores predeterminados de canal y latido

Use `channels.defaults` para el comportamiento compartido de política de grupo y latido entre proveedores:

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`: política de grupo alternativa cuando un `groupPolicy` a nivel de proveedor no está configurado.
- `channels.defaults.contextVisibility`: modo de visibilidad de contexto suplementario predeterminado para todos los canales. Valores: `all` (predeterminado, incluye todo el contexto citado/hilo/historial), `allowlist` (solo incluye contexto de remitentes en lista de permitidos), `allowlist_quote` (igual que la lista de permitidos pero mantiene el contexto de cita/respuesta explícito). Sobrescritura por canal: `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk`: incluye los estados de canal saludables en la salida de latido.
- `channels.defaults.heartbeat.showAlerts`: incluye los estados degradados/de error en la salida de latido.
- `channels.defaults.heartbeat.useIndicator`: renderiza una salida de latido compacta estilo indicador.

### WhatsApp

WhatsApp se ejecuta a través del canal web de la puerta de enlace (Baileys Web). Se inicia automáticamente cuando existe una sesión vinculada.

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

<Accordion title="Multi-account WhatsApp">

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

- Los comandos salientes por defecto van a la cuenta `default` si está presente; de lo contrario, al primer id de cuenta configurado (ordenado).
- El `channels.whatsapp.defaultAccount` opcional sobrescribe esa selección de cuenta predeterminada de respaldo cuando coincide con un id de cuenta configurado.
- El directorio de autenticación heredado de cuenta única de Baileys es migrado por `openclaw doctor` a `whatsapp/default`.
- Sobrescrituras por cuenta: `channels.whatsapp.accounts.<id>.sendReadReceipts`, `channels.whatsapp.accounts.<id>.dmPolicy`, `channels.whatsapp.accounts.<id>.allowFrom`.

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
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: off; opt in explicitly to avoid preview-edit rate limits)
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

- Token de bot: `channels.telegram.botToken` o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos), con `TELEGRAM_BOT_TOKEN` como respaldo para la cuenta predeterminada.
- El `channels.telegram.defaultAccount` opcional sobrescribe la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.
- En configuraciones de multicuenta (2+ ids de cuenta), establezca un predeterminado explícito (`channels.telegram.defaultAccount` o `channels.telegram.accounts.default`) para evitar el enrutamiento de respaldo; `openclaw doctor` avisa cuando esto falta o no es válido.
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Telegram (migraciones de ID de supergrupo, `/config set|unset`).
- Las entradas de `bindings[]` de nivel superior con `type: "acp"` configuran enlaces ACP persistentes para temas del foro (use `chatId:topic:topicId` canónico en `match.peer.id`). La semántica de los campos se comparte en [ACP Agents](/en/tools/acp-agents#channel-specific-settings).
- Las vistas previas de transmisiones de Telegram usan `sendMessage` + `editMessageText` (funciona en chats directos y grupales).
- Política de reintentos: consulte [Retry policy](/en/concepts/retry).

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 100,
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
      replyToMode: "off", // off | first | all | batched
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
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["987654321098765432"],
        agentFilter: ["default"],
        sessionFilter: ["discord:"],
        target: "dm", // dm | channel | both
        cleanupAfterResolve: false,
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

- Token: `channels.discord.token`, con `DISCORD_BOT_TOKEN` como alternativa para la cuenta predeterminada.
- Las llamadas salientes directas que proporcionan un `token` de Discord explícito usan ese token para la llamada; la configuración de reintentos/políticas de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
- `channels.discord.defaultAccount` opcional anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.
- Use `user:<id>` (MD) o `channel:<id>` (canal de gremio) para destinos de entrega; los IDs numéricos simples son rechazados.
- Los slugs de gremio están en minúsculas con los espacios reemplazados por `-`; las claves de canal usan el nombre con slug (sin `#`). Se prefieren los IDs de gremio.
- Los mensajes escritos por bots se ignoran de forma predeterminada. `allowBots: true` los habilita; use `allowBots: "mentions"` para aceptar solo mensajes de bot que mencionen al bot (los mensajes propios aún se filtran).
- `channels.discord.guilds.<id>.ignoreOtherMentions` (y las anulaciones de canal) descarta mensajes que mencionan a otro usuario o rol pero no al bot (excluyendo @everyone/@here).
- `maxLinesPerMessage` (predeterminado 17) divide mensajes largos incluso cuando tienen menos de 2000 caracteres.
- `channels.discord.threadBindings` controla el enrutamiento vinculado a hilos de Discord:
  - `enabled`: Anulación de Discord para características de sesión vinculadas a hilos (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y entrega/enrutamiento vinculado)
  - `idleHours`: Anulación de Discord para el auto-enfoque por inactividad en horas (`0` lo desactiva)
  - `maxAgeHours`: Anulación de Discord para la antigüedad máxima estricta en horas (`0` lo desactiva)
  - `spawnSubagentSessions`: interruptor de participación opcional para la creación/vinculación automática de hilos `sessions_spawn({ thread: true })`
- Las entradas `bindings[]` de nivel superior con `type: "acp"` configuran enlaces ACP persistentes para canales e hilos (use el id del canal/hilo en `match.peer.id`). La semántica de los campos se comparte en [ACP Agents](/en/tools/acp-agents#channel-specific-settings).
- `channels.discord.ui.components.accentColor` establece el color de acento para los contenedores de componentes de Discord v2.
- `channels.discord.voice` habilita las conversaciones en canales de voz de Discord y anulaciones opcionales de unión automática + TTS.
- `channels.discord.voice.daveEncryption` y `channels.discord.voice.decryptionFailureTolerance` se pasan a las opciones DAVE de `@discordjs/voice` (`true` y `24` por defecto).
- OpenClaw además intenta la recuperación de recepción de voz saliendo y volviendo a unirse a una sesión de voz después de fallos repetidos de desencriptado.
- `channels.discord.streaming` es la clave canónica del modo de transmisión. Los valores heredados `streamMode` y booleanos `streaming` se migran automáticamente.
- `channels.discord.autoPresence` mapea la disponibilidad de tiempo de ejecución a la presencia del bot (saludable => en línea, degradado => inactivo, agotado => no molestar) y permite anulaciones opcionales del texto de estado.
- `channels.discord.dangerouslyAllowNameMatching` rehabilita la coincidencia de nombre/etiqueta mutable (modo de compatibilidad de emergencia).
- `channels.discord.execApprovals`: entrega de aprobación de ejecución nativa de Discord y autorización de aprobadores.
  - `enabled`: `true`, `false` o `"auto"` (por defecto). En modo automático, las aprobaciones de ejecución se activan cuando los aprobadores se pueden resolver desde `approvers` o `commands.ownerAllowFrom`.
  - `approvers`: IDs de usuario de Discord autorizados para aprobar solicitudes de ejecución. Recurre a `commands.ownerAllowFrom` cuando se omite.
  - `agentFilter`: lista blanca opcional de ID de agentes. Omita para reenviar aprobaciones para todos los agentes.
  - `sessionFilter`: patrones opcionales de clave de sesión (subcadena o regex).
  - `target`: dónde enviar los mensajes de aprobación. `"dm"` (predeterminado) envía a los MD de los aprobadores, `"channel"` envía al canal de origen, `"both"` envía a ambos. Cuando el objetivo incluye `"channel"`, los botones solo pueden ser utilizados por aprobadores resueltos.
  - `cleanupAfterResolve`: cuando es `true`, elimina los MD de aprobación después de la aprobación, denegación o tiempo de espera.

**Modos de notificación de reacción:** `off` (ninguno), `own` (mensajes del bot, predeterminado), `all` (todos los mensajes), `allowlist` (de `guilds.<id>.users` en todos los mensajes).

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
- Alternativas de entorno (env fallbacks): `GOOGLE_CHAT_SERVICE_ACCOUNT` o `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Use `spaces/<spaceId>` o `users/<userId>` para los objetivos de entrega.
- `channels.googlechat.dangerouslyAllowNameMatching` vuelve a activar la coincidencia de entidades principales de correo electrónico mutable (modo de compatibilidad de ruptura de cristal).

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
      replyToMode: "off", // off | first | all | batched
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
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["U123"],
        agentFilter: ["default"],
        sessionFilter: ["slack:"],
        target: "dm", // dm | channel | both
      },
    },
  },
}
```

- El **modo de socket** requiere tanto `botToken` como `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` para la alternativa de entorno de cuenta predeterminada).
- El **modo HTTP** requiere `botToken` más `signingSecret` (en la raíz o por cuenta).
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas
  de texto plano u objetos SecretRef.
- Las instantáneas de la cuenta de Slack exponen campos de origen/estado por credencial, como `botTokenSource`, `botTokenStatus`, `appTokenStatus` y, en modo HTTP, `signingSecretStatus`. `configured_unavailable` significa que la cuenta está configurada a través de SecretRef, pero la ruta del comando/tiempo de ejecución actual no pudo resolver el valor del secreto.
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Slack.
- El `channels.slack.defaultAccount` opcional anula la selección de cuenta predeterminada cuando coincide con una ID de cuenta configurada.
- `channels.slack.streaming` es la clave canónica del modo de flujo. Los valores heredados de `streamMode` y el booleano `streaming` se migran automáticamente.
- Use `user:<id>` (MD) o `channel:<id>` como destinos de entrega.

**Modos de notificación de reacción:** `off`, `own` (predeterminado), `all`, `allowlist` (desde `reactionAllowlist`).

**Aislamiento de sesión de hilo:** `thread.historyScope` es por hilo (predeterminado) o compartido en todo el canal. `thread.inheritParent` copia la transcripción del canal principal a los nuevos hilos.

- `typingReaction` agrega una reacción temporal al mensaje entrante de Slack mientras se ejecuta una respuesta y la elimina al completarse. Use un código corto de emoji de Slack, como `"hourglass_flowing_sand"`.
- `channels.slack.execApprovals`: Entrega de aprobación de ejecución nativa de Slack y autorización del aprobador. Mismo esquema que Discord: `enabled` (`true`/`false`/`"auto"`), `approvers` (ID de usuario de Slack), `agentFilter`, `sessionFilter` y `target` (`"dm"`, `"channel"` o `"both"`).

| Grupo de acción | Predeterminado | Notas                          |
| --------------- | -------------- | ------------------------------ |
| reacciones      | habilitado     | Reaccionar + listar reacciones |
| mensajes        | habilitado     | Leer/enviar/editar/eliminar    |
| pines           | habilitado     | Fijar/Desfijar/Listar          |
| memberInfo      | habilitado     | Información del miembro        |
| emojiList       | habilitado     | Lista de emoji personalizados  |

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
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
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

Modos de chat: `oncall` (responder al @mención, predeterminado), `onmessage` (todos los mensajes), `onchar` (mensajes que comienzan con el prefijo de activación).

Cuando los comandos nativos de Mattermost están habilitados:

- `commands.callbackPath` debe ser una ruta (por ejemplo, `/api/channels/mattermost/command`), no una URL completa.
- `commands.callbackUrl` debe resolverse al endpoint de la puerta de enlace OpenClaw y ser accesible desde el servidor Mattermost.
- Las devoluciones de llamada de barra nativas se autentican con los tokens por comando devueltos por Mattermost durante el registro de comandos de barra. Si el registro falla o no se activan comandos, OpenClaw rechaza las devoluciones de llamada con `Unauthorized: invalid command token.`
- Para hosts de devolución de llamada privados/tailnet/internos, Mattermost puede requerir que `ServiceSettings.AllowedUntrustedInternalConnections` incluya el host/dominio de devolución de llamada. Use valores de host/dominio, no URLs completas.
- `channels.mattermost.configWrites`: permitir o denegar escrituras de configuración iniciadas por Mattermost.
- `channels.mattermost.requireMention`: requerir `@mention` antes de responder en los canales.
- `channels.mattermost.groups.<channelId>.requireMention`: anulación de control de menciones por canal (`"*"` para el predeterminado).
- Opcional `channels.mattermost.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una id de cuenta configurada.

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

**Modos de notificación de reacción:** `off`, `own` (predeterminado), `all`, `allowlist` (de `reactionAllowlist`).

- `channels.signal.account`: fijar el inicio del canal a una identidad de cuenta de Signal específica.
- `channels.signal.configWrites`: permitir o denegar escrituras de configuración iniciadas por Signal.
- Opcional `channels.signal.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una id de cuenta configurada.

### BlueBubbles

BlueBubbles es la ruta recomendada para iMessage (con complemento, configurado en `channels.bluebubbles`).

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

- Rutas de clave principales cubiertas aquí: `channels.bluebubbles`, `channels.bluebubbles.dmPolicy`.
- Opcional `channels.bluebubbles.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.
- Las entradas `bindings[]` de nivel superior con `type: "acp"` pueden vincular conversaciones de BlueBubbles a sesiones ACP persistentes. Utilice un identificador o cadena de destino de BlueBubbles (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) en `match.peer.id`. Semántica de campo compartida: [ACP Agents](/en/tools/acp-agents#channel-specific-settings).
- La configuración completa del canal BlueBubbles está documentada en [BlueBubbles](/en/channels/bluebubbles).

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

- Opcional `channels.imessage.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.

- Requiere acceso de disco completo a la base de datos de Messages.
- Prefiera destinos `chat_id:<id>`. Use `imsg chats --limit 20` para listar chats.
- `cliPath` puede apuntar a un contenedor SSH; configure `remoteHost` (`host` o `user@host`) para la obtención de archivos adjuntos SCP.
- `attachmentRoots` y `remoteAttachmentRoots` restringen las rutas de archivos adjuntos entrantes (predeterminado: `/Users/*/Library/Messages/Attachments`).
- SCP utiliza una verificación estricta de la clave del host, por lo que debe asegurarse de que la clave del host de relay ya exista en `~/.ssh/known_hosts`.
- `channels.imessage.configWrites`: permitir o denegar escrituras de configuración iniciadas por iMessage.
- Las entradas `bindings[]` de nivel superior con `type: "acp"` pueden vincular conversaciones de iMessage a sesiones ACP persistentes. Utilice un identificador normalizado o un destino de chat explícito (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) en `match.peer.id`. Semántica de campo compartida: [ACP Agents](/en/tools/acp-agents#channel-specific-settings).

<Accordion title="Ejemplo de contenedor SSH para iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix está respaldado por extensiones y se configura en `channels.matrix`.

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
      encryption: true,
      initialSyncLimit: 20,
      defaultAccount: "ops",
      accounts: {
        ops: {
          name: "Ops",
          userId: "@ops:example.org",
          accessToken: "syt_ops_xxx",
        },
        alerts: {
          userId: "@alerts:example.org",
          password: "secret",
          proxy: "http://127.0.0.1:7891",
        },
      },
    },
  },
}
```

- La autenticación por token usa `accessToken`; la autenticación por contraseña usa `userId` + `password`.
- `channels.matrix.proxy` enruta el tráfico HTTP de Matrix a través de un proxy HTTP(S) explícito. Las cuentas con nombre pueden anularlo con `channels.matrix.accounts.<id>.proxy`.
- `channels.matrix.allowPrivateNetwork` permite servidores domésticos (homeservers) privados/internos. `proxy` y `allowPrivateNetwork` son controles independientes.
- `channels.matrix.defaultAccount` selecciona la cuenta preferida en configuraciones multicuenta.
- `channels.matrix.execApprovals`: entrega de aprobaciones de ejecución nativa de Matrix y autorización de aprobadores.
  - `enabled`: `true`, `false` o `"auto"` (predeterminado). En modo automático, las aprobaciones de ejecución se activan cuando se pueden resolver los aprobadores desde `approvers` o `commands.ownerAllowFrom`.
  - `approvers`: IDs de usuario de Matrix (p. ej., `@owner:example.org`) permitidos para aprobar solicitudes de ejecución.
  - `agentFilter`: lista blanca opcional de ID de agente. Omitir para reenviar aprobaciones para todos los agentes.
  - `sessionFilter`: patrones de clave de sesión opcionales (subcadena o regex).
  - `target`: dónde enviar los mensajes de aprobación. `"dm"` (predeterminado), `"channel"` (sala de origen) o `"both"`.
  - Anulaciones por cuenta: `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope` controla cómo se agrupan los MD de Matrix en sesiones: `per-user` (predeterminado) comparte por par enrutado, mientras que `per-room` aísla cada sala de MD.
- Las sondas de estado de Matrix y las búsquedas de directorio en vivo utilizan la misma política de proxy que el tráfico de tiempo de ejecución.
- La configuración completa de Matrix, las reglas de orientación y los ejemplos de configuración están documentados en [Matrix](/en/channels/matrix).

### Microsoft Teams

Microsoft Teams está respaldado por extensiones y se configura en `channels.msteams`.

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

- Rutas de clave principales cubiertas aquí: `channels.msteams`, `channels.msteams.configWrites`.
- Toda la configuración de Teams (credenciales, webhook, política de DM/grupo, anulaciones por equipo/canal) está documentada en [Microsoft Teams](/en/channels/msteams).

### IRC

IRC está respaldado por extensiones y se configura en `channels.irc`.

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

- Rutas de clave principal cubiertas aquí: `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- El opcional `channels.irc.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una ID de cuenta configurada.
- La configuración completa del canal IRC (host/puerto/TLS/canales/listas de permitidos/filtrado de menciones) está documentada en [IRC](/en/channels/irc).

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

- Se usa `default` cuando se omite `accountId` (CLI + enrutamiento).
- Los tokens de entorno solo se aplican a la cuenta **predeterminada**.
- La configuración base del canal se aplica a todas las cuentas, a menos que se anule por cuenta.
- Use `bindings[].match.accountId` para enrutar cada cuenta a un agente diferente.
- Si agrega una cuenta no predeterminada a través de `openclaw channels add` (o incorporación del canal) mientras todavía está en una configuración de canal de nivel superior de cuenta única, OpenClaw promueve primero los valores de cuenta única de nivel superior con ámbito de cuenta al mapa de cuentas del canal para que la cuenta original siga funcionando. La mayoría de los canales los mueven a `channels.<channel>.accounts.default`; Matrix, en cambio, puede conservar un destino con nombre/predeterminado coincidente existente.
- Los enlaces existentes solo de canal (sin `accountId`) siguen coincidiendo con la cuenta predeterminada; los enlaces con ámbito de cuenta siguen siendo opcionales.
- `openclaw doctor --fix` también repara formas mixtas moviendo los valores de cuenta única de nivel superior con ámbito de cuenta a la cuenta promovida elegida para ese canal. La mayoría de los canales usan `accounts.default`; Matrix, en cambio, puede conservar un destino con nombre/predeterminado coincidente existente.

### Otros canales de extensión

Muchos canales de extensión se configuran como `channels.<id>` y se documentan en sus páginas de canal dedicadas (por ejemplo, Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat y Twitch).
Vea el índice completo de canales: [Canales](/en/channels).

### Filtrado de menciones en chats grupales

Los mensajes grupales de forma predeterminada **requieren mención** (mención en metadatos o patrones de expresiones regulares seguros). Se aplica a chats grupales de WhatsApp, Telegram, Discord, Google Chat e iMessage.

**Tipos de mención:**

- **Menciones de metadatos**: Menciones con @ nativas de la plataforma. Se ignoran en el modo de chat propio de WhatsApp.
- **Patrones de texto**: Patrones de expresiones regulares seguros en `agents.list[].groupChat.mentionPatterns`. Se ignoran los patrones no válidos y las repeticiones anidadas no seguras.
- El filtrado de menciones solo se aplica cuando la detección es posible (menciones nativas o al menos un patrón).

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

#### Límites del historial de MD

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

Resolución: anulación por MD → valor predeterminado del proveedor → sin límite (se retiene todo).

Soportados: `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Modo de chat propio

Incluya su propio número en `allowFrom` para habilitar el modo de chat propio (ignora las menciones con @ nativas, solo responde a patrones de texto):

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

- Los comandos de texto deben ser mensajes **independientes** con `/` al inicio.
- `native: "auto"` activa los comandos nativos para Discord/Telegram, deja Slack desactivado.
- Sobrescribir por canal: `channels.discord.commands.native` (bool o `"auto"`). `false` borra los comandos registrados anteriormente.
- `channels.telegram.customCommands` añade entradas de menú adicionales al bot de Telegram.
- `bash: true` habilita `! <cmd>` para el shell del host. Requiere `tools.elevated.enabled` y remitente en `tools.elevated.allowFrom.<channel>`.
- `config: true` habilita `/config` (lee/escribe `openclaw.json`). Para clientes del gateway `chat.send`, las escrituras persistentes `/config set|unset` también requieren `operator.admin`; `/config show` de solo lectura permanece disponible para clientes operador normales con ámbito de escritura.
- `channels.<provider>.configWrites` limita las mutaciones de configuración por canal (predeterminado: true).
- Para canales multicuenta, `channels.<provider>.accounts.<id>.configWrites` también limita las escrituras que apuntan a esa cuenta (por ejemplo `/allowlist --config --account <id>` o `/config set channels.<provider>.accounts.<id>...`).
- `allowFrom` es por proveedor. Cuando se establece, es la **única** fuente de autorización (listas de permitidos/emparejamiento del canal y `useAccessGroups` se ignoran).
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

Raíz opcional del repositorio que se muestra en la línea de tiempo de ejecución del prompt del sistema. Si no se establece, OpenClaw la detecta automáticamente navegando hacia arriba desde el espacio de trabajo.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Lista de permitidos de habilidades (skills) predeterminada opcional para agentes que no establecen
`agents.list[].skills`.

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

- Omita `agents.defaults.skills` para tener habilidades sin restricciones de forma predeterminada.
- Omite `agents.list[].skills` para heredar los valores predeterminados.
- Establece `agents.list[].skills: []` para no tener habilidades.
- Una lista `agents.list[].skills` no vacía es el conjunto final para ese agente; no se fusiona con los valores predeterminados.

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

Controla el texto de advertencia visible para el agente cuando se trunca el contexto de arranque.
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

Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil de la solicitud para ejecuciones con muchas capturas de pantalla.
Los valores más altos preservan más detalles visuales.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Zona horaria para el contexto del prompt del sistema (no las marcas de tiempo de los mensajes). Recurre a la zona horaria del host.

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
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
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
  - Lo utiliza la ruta de la herramienta `image` como su configuración de modelo de visión.
  - También se utiliza como enrutamiento alternativo cuando el modelo seleccionado/predeterminado no puede aceptar entrada de imagen.
- `imageGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Es utilizado por la capacidad compartida de generación de imágenes y cualquier superficie futura de herramienta/complemento que genere imágenes.
  - Valores típicos: `google/gemini-3.1-flash-image-preview` para la generación de imágenes nativa de Gemini, `fal/fal-ai/flux/dev` para fal, o `openai/gpt-image-1` para OpenAI Images.
  - Si selecciona un proveedor/modelo directamente, configure también la clave de autenticación/API del proveedor correspondiente (por ejemplo, `GEMINI_API_KEY` o `GOOGLE_API_KEY` para `google/*`, `OPENAI_API_KEY` para `openai/*`, `FAL_KEY` para `fal/*`).
  - Si se omite, `image_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor.
- `musicGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Es utilizado por la capacidad compartida de generación de música y la herramienta integrada `music_generate`.
  - Valores típicos: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` o `minimax/music-2.5+`.
  - Si se omite, `music_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de música registrados restantes en orden de ID de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la clave de autenticación/API del proveedor correspondiente.
- `videoGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad compartida de generación de video y la herramienta integrada `video_generate`.
  - Valores típicos: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, o `qwen/wan2.7-r2v`.
  - Si se omite, `video_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta con el proveedor predeterminado actual, luego con los proveedores de generación de video registrados restantes en orden de ID de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor coincidente.
  - El proveedor de generación de video Qwen incluido actualmente admite hasta 1 video de salida, 1 imagen de entrada, 4 videos de entrada, 10 segundos de duración, y opciones a nivel de proveedor `size`, `aspectRatio`, `resolution`, `audio` y `watermark`.
- `pdfModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la herramienta `pdf` para el enrutamiento de modelos.
  - Si se omite, la herramienta PDF recurre a `imageModel`, y luego al modelo predeterminado/sesión resuelto.
- `pdfMaxBytesMb`: límite de tamaño de PDF predeterminado para la herramienta `pdf` cuando no se pasa `maxBytesMb` en el momento de la llamada.
- `pdfMaxPages`: número máximo de páginas predeterminado considerado por el modo de reserva de extracción en la herramienta `pdf`.
- `verboseDefault`: nivel detallado predeterminado para agentes. Valores: `"off"`, `"on"`, `"full"`. Predeterminado: `"off"`.
- `elevatedDefault`: nivel de salida elevado predeterminado para agentes. Valores: `"off"`, `"on"`, `"ask"`, `"full"`. Predeterminado: `"on"`.
- `model.primary`: formato `provider/model` (p. ej. `openai/gpt-5.4`). Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única de proveedor configurado para ese id de modelo exacto, y solo luego recurre al proveedor predeterminado configurado (comportamiento de compatibilidad obsoleto, por lo que se prefiere `provider/model` explícito). Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de un proveedor eliminado.
- `models`: el catálogo de modelos configurado y la lista de permitidos para `/model`. Cada entrada puede incluir `alias` (atajo) y `params` (específico del proveedor, por ejemplo `temperature`, `maxTokens`, `cacheRetention`, `context1m`).
- `params`: parámetros predeterminados globales del proveedor aplicados a todos los modelos. Establecer en `agents.defaults.params` (p. ej. `{ cacheRetention: "long" }`).
- Precedencia de fusión de `params` (config): `agents.defaults.params` (base global) es anulado por `agents.defaults.models["provider/model"].params` (por modelo), luego `agents.list[].params` (id de agente coincidente) anula por clave. Vea [Prompt Caching](/en/reference/prompt-caching) para más detalles.
- Los escritores de configuración que mutan estos campos (por ejemplo `/models set`, `/models set-image` y comandos de agregar/eliminar de respaldo) guardan el forma de objeto canónica y preservan las listas de respaldo existentes cuando es posible.
- `maxConcurrent`: máximo de ejecuciones de agente en paralelo entre sesiones (cada sesión aún serializada). Predeterminado: 4.

**Atajos de alias integrados** (solo se aplican cuando el modelo está en `agents.defaults.models`):

| Alias               | Modelo                                 |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

Los alias configurados siempre tienen prioridad sobre los predeterminados.

Los modelos Z.AI GLM-4.x habilitan automáticamente el modo de pensamiento a menos que establezca `--thinking off` o defina `agents.defaults.models["zai/<model>"].params.thinking` usted mismo.
Los modelos Z.AI habilitan `tool_stream` de forma predeterminada para la transmisión de llamadas a herramientas. Establezca `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
Los modelos Anthropic Claude 4.6 utilizan por defecto el pensamiento `adaptive` cuando no se establece un nivel de pensamiento explícito.

- Sesiones compatibles cuando se establece `sessionArg`.
- Transferencia de imagen compatible cuando `imageArg` acepta rutas de archivo.

### `agents.defaults.heartbeat`

Ejecuciones periódicas de latido.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
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

- `every`: cadena de duración (ms/s/m/h). Predeterminado: `30m` (autenticación con clave de API) o `1h` (autenticación OAuth). Establezca en `0m` para desactivar.
- `suppressToolErrorWarnings`: cuando es true, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `directPolicy`: política de entrega directa/DM. `allow` (predeterminado) permite la entrega a destino directo. `block` suprime la entrega a destino directo y emite `reason=dm-blocked`.
- `lightContext`: cuando es true, las ejecuciones de latido utilizan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es true, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Mismo patrón de aislamiento que cron `sessionTarget: "isolated"`. Reduce el costo de tokens por latido de ~100K a ~2-5K tokens.
- Por agente: establecer `agents.list[].heartbeat`. Cuando cualquier agente define `heartbeat`, **solo esos agentes** ejecutan latidos.
- Los latidos ejecutan turnos completos del agente: intervalos más cortos consumen más tokens.

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
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        notifyUser: true, // send a brief notice when compaction starts (default: false)
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`: `default` o `safeguard` (resumen fragmentado para historiales largos). Consulte [Compaction](/en/concepts/compaction).
- `timeoutSeconds`: segundos máximos permitidos para una sola operación de compactación antes de que OpenClaw la aborte. Predeterminado: `900`.
- `identifierPolicy`: `strict` (predeterminado), `off` o `custom`. `strict` antepone la guía integrada de retención de identificadores opacos durante el resumen de compactación.
- `identifierInstructions`: texto personalizado opcional para la preservación de identificadores que se usa cuando `identifierPolicy=custom`.
- `postCompactionSections`: nombres de sección H2/H3 opcionales de AGENTS.md para volver a inyectar después de la compactación. De forma predeterminada es `["Session Startup", "Red Lines"]`; establezca `[]` para deshabilitar la reinyección. Cuando no está establecido o se establece explícitamente en ese par predeterminado, los encabezados más antiguos `Every Session`/`Safety` también se aceptan como alternativa heredada.
- `model`: anulación opcional de `provider/model-id` solo para el resumen de compactación. Úselo cuando la sesión principal debe mantener un modelo pero los resúmenes de compactación deben ejecutarse en otro; cuando no está establecido, la compactación utiliza el modelo principal de la sesión.
- `notifyUser`: cuando es `true`, envía un breve aviso al usuario cuando comienza la compactación (por ejemplo, "Compactando contexto..."). Deshabilitado de forma predeterminada para mantener la compactación silenciosa.
- `memoryFlush`: turno de agente silencioso antes de la auto-compactación para almacenar recuerdos duraderos. Se omite cuando el espacio de trabajo es de solo lectura.

### `agents.defaults.contextPruning`

Elimina **resultados de herramientas antiguos** del contexto en memoria antes de enviarlos a la LLM. **No** modifica el historial de sesiones en disco.

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
- `ttl` controla la frecuencia con la que se puede ejecutar de nuevo la poda (después del último toque al caché).
- La poda realiza un recorte suave primero en los resultados de herramientas excesivamente grandes y luego un borrado duro de los resultados de herramientas más antiguos si es necesario.

**Soft-trim** (recorte suave) mantiene el principio + el final e inserta `...` en el medio.

**Hard-clear** (borrado duro) reemplaza todo el resultado de la herramienta con el marcador de posición.

Notas:

- Los bloques de imagen nunca se recortan/borran.
- Las proporciones se basan en caracteres (aproximadas), no en recuentos exactos de tokens.
- Si existen menos de `keepLastAssistants` mensajes del asistente, se omite la poda.

</Accordion>

Consulte [Poda de sesión](/en/concepts/session-pruning) para obtener detalles sobre el comportamiento.

### Transmisión por bloques

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

- Los canales que no sean Telegram requieren `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
- Anulaciones de canal: `channels.<channel>.blockStreamingCoalesce` (y variantes por cuenta). Signal/Slack/Discord/Google Chat predeterminado `minChars: 1500`.
- `humanDelay`: pausa aleatoria entre respuestas en bloque. `natural` = 800–2500ms. Anulación por agente: `agents.list[].humanDelay`.

Consulte [Transmisión (Streaming)](/en/concepts/streaming) para obtener detalles sobre el comportamiento y la división en fragmentos.

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

- Predeterminados: `instant` para chats directos/menciones, `message` para chats de grupo sin mención.
- Anulaciones por sesión: `session.typingMode`, `session.typingIntervalSeconds`.

Consulte [Indicadores de escritura](/en/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandbox opcional para el agente integrado. Consulte [Sandbox](/en/gateway/sandboxing) para obtener la guía completa.

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
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Detalles del entorno aislado">

**Backend:**

- `docker`: tiempo de ejecución de Docker local (predeterminado)
- `ssh`: tiempo de ejecución remoto genérico con respaldo SSH
- `openshell`: tiempo de ejecución de OpenShell

Cuando se selecciona `backend: "openshell"`, la configuración específica del tiempo de ejecución se mueve a
`plugins.entries.openshell.config`.

**Configuración del backend SSH:**

- `target`: destino SSH en formato `user@host[:port]`
- `command`: comando de cliente SSH (predeterminado: `ssh`)
- `workspaceRoot`: raíz remota absoluta utilizada para espacios de trabajo por ámbito
- `identityFile` / `certificateFile` / `knownHostsFile`: archivos locales existentes pasados a OpenSSH
- `identityData` / `certificateData` / `knownHostsData`: contenidos en línea o SecretRefs que OpenClaw materializa en archivos temporales en tiempo de ejecución
- `strictHostKeyChecking` / `updateHostKeys`: controles de política de claves de host de OpenSSH

**Precedencia de autenticación SSH:**

- `identityData` tiene prioridad sobre `identityFile`
- `certificateData` tiene prioridad sobre `certificateFile`
- `knownHostsData` tiene prioridad sobre `knownHostsFile`
- los valores `*Data` respaldados por SecretRef se resuelven desde la instantánea activa del tiempo de ejecución de secretos antes de que inicie la sesión del entorno aislado

**Comportamiento del backend SSH:**

- inicializa el espacio de trabajo remoto una vez después de crear o recrear
- luego mantiene el espacio de trabajo SSH remoto como canónico
- enruta `exec`, herramientas de archivos y rutas de medios a través de SSH
- no sincroniza los cambios remotos con el host automáticamente
- no admite contenedores del navegador del entorno aislado

**Acceso al espacio de trabajo:**

- `none`: espacio de trabajo del entorno aislado por ámbito bajo `~/.openclaw/sandboxes`
- `ro`: espacio de trabajo del entorno aislado en `/workspace`, espacio de trabajo del agente montado como de solo lectura en `/agent`
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

- `mirror`: inicializar el remoto desde lo local antes de la ejecución, sincronizar de vuelta después de la ejecución; el espacio de trabajo local se mantiene canónico
- `remote`: inicializar el remoto una vez cuando se crea el entorno aislado, luego mantener el espacio de trabajo remoto canónico

En el modo `remote`, las ediciones locales en el host realizadas fuera de OpenClaw no se sincronizan automáticamente en el entorno aislado después del paso de inicialización.
El transporte es SSH hacia el entorno aislado de OpenShell, pero el complemento posee el ciclo de vida del entorno aislado y la sincronización de espejo opcional.

**`setupCommand`** se ejecuta una vez después de la creación del contenedor (vía `sh -lc`). Necesita salida de red, raíz grabable, usuario root.

**Los contenedores tienen `network: "none"` de forma predeterminada** — establézcalo en `"bridge"` (o una red de puente personalizada) si el agente necesita acceso de salida.
`"host"` está bloqueado. `"container:<id>"` está bloqueado de forma predeterminada a menos que establezca explícitamente
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (romper-cristal).

**Los datos adjuntos entrantes** se preparan en `media/inbound/*` en el espacio de trabajo activo.

**`docker.binds`** monta directorios adicionales del host; los enlaces globales y por agente se combinan.

**Navegador en entorno aislado** (`sandbox.browser.enabled`): Chromium + CDP en un contenedor. URL de noVNC inyectada en el mensaje del sistema. No requiere `browser.enabled` en `openclaw.json`.
El acceso de observador de noVNC utiliza autenticación VNC de forma predeterminada y OpenClaw emite una URL de token de corta duración (en lugar de exponer la contraseña en la URL compartida).

- `allowHostControl: false` (predeterminado) impide que las sesiones en el entorno aislado apunten al navegador del host.
- `network` se predetermina a `openclaw-sandbox-browser` (red de puente dedicada). Establézcalo en `bridge` solo cuando desee explícitamente conectividad de puente global.
- `cdpSourceRange` opcionalmente restringe el ingreso de CDP en el borde del contenedor a un rango CIDR (por ejemplo `172.21.0.1/32`).
- `sandbox.browser.binds` monta directorios adicionales del host solo en el contenedor del navegador en entorno aislado. Cuando se establece (incluyendo `[]`), reemplaza `docker.binds` para el contenedor del navegador.
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
  - `--disable-extensions` (habilitado de forma predeterminada)
  - `--disable-3d-apis`, `--disable-software-rasterizer` y `--disable-gpu` están
    habilitados de forma predeterminada y se pueden deshabilitar con
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si el uso de WebGL/3D lo requiere.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` vuelve a habilitar las extensiones si su flujo de trabajo
    depende de ellas.
  - `--renderer-process-limit=2` se puede cambiar con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`; establezca `0` para usar el límite de
    procesos predeterminado de Chromium.
  - además de `--no-sandbox` y `--disable-setuid-sandbox` cuando `noSandbox` está habilitado.
  - Los valores predeterminados son la línea base de la imagen del contenedor; use una imagen de navegador personalizada con un punto de
    entrada personalizado para cambiar los valores predeterminados del contenedor.

</Accordion>

El aislamiento del navegador y `sandbox.docker.binds` son actualmente solo para Docker.

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
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        skills: ["docs-search"], // replaces agents.defaults.skills when set
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

- `id`: id de agente estable (obligatorio).
- `default`: cuando se establecen varios, gana el primero (se registra una advertencia). Si no se establece ninguno, la primera entrada de la lista es la predeterminada.
- `model`: la forma de cadena solo anula `primary`; la forma de objeto `{ primary, fallbacks }` anula ambos (`[]` desactiva los respaldos globales). Los trabajos de Cron que solo anulan `primary` aún heredan los respaldos predeterminados a menos que establezcas `fallbacks: []`.
- `params`: parámetros de flujo por agente fusionados sobre la entrada de modelo seleccionada en `agents.defaults.models`. Úsalo para anulaciones específicas del agente como `cacheRetention`, `temperature` o `maxTokens` sin duplicar el catálogo completo de modelos.
- `skills`: lista de permitidos de habilidades opcional por agente. Si se omite, el agente hereda `agents.defaults.skills` cuando está configurado; una lista explícita reemplaza los valores predeterminados en lugar de fusionarse, y `[]` significa sin habilidades.
- `thinkingDefault`: nivel de pensamiento predeterminado opcional por agente (`off | minimal | low | medium | high | xhigh | adaptive`). Anula `agents.defaults.thinkingDefault` para este agente cuando no se establece una anulación por mensaje o por sesión.
- `reasoningDefault`: visibilidad de razonamiento predeterminada opcional por agente (`on | off | stream`). Se aplica cuando no se establece una anulación de razonamiento por mensaje o por sesión.
- `fastModeDefault`: predeterminado opcional por agente para el modo rápido (`true | false`). Se aplica cuando no se establece una anulación de modo rápido por mensaje o por sesión.
- `runtime`: descriptor de tiempo de ejecución opcional por agente. Usa `type: "acp"` con `runtime.acp` predeterminados (`agent`, `backend`, `mode`, `cwd`) cuando el agente deba usar por defecto sesiones de arnés ACP.
- `identity.avatar`: ruta relativa al espacio de trabajo, URL `http(s)` o URI `data:`.
- `identity` deriva valores predeterminados: `ackReaction` de `emoji`, `mentionPatterns` de `name`/`emoji`.
- `subagents.allowAgents`: lista blanca de IDs de agentes para `sessions_spawn` (`["*"]` = cualquiera; valor predeterminado: solo el mismo agente).
- Protección de herencia del sandbox: si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.
- `subagents.requireAgentId`: cuando es verdadero, bloquea las llamadas a `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil; valor predeterminado: false).

---

## Enrutamiento multiagente

Ejecute múltiples agentes aislados dentro de una sola puerta de enlace. Consulte [Multi-Agent](/en/concepts/multi-agent).

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

- `type` (opcional): `route` para el enrutamiento normal (el tipo faltante predetermina a route), `acp` para enlaces de conversación ACP persistentes.
- `match.channel` (obligatorio)
- `match.accountId` (opcional; `*` = cualquier cuenta; omitido = cuenta predeterminada)
- `match.peer` (opcional; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (opcional; específico del canal)
- `acp` (opcional; solo para `type: "acp"`): `{ mode, label, cwd, backend }`

**Orden de coincidencia determinista:**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exacto, sin par/gremio/equipo)
5. `match.accountId: "*"` (todo el canal)
6. Agente predeterminado

Dentro de cada nivel, gana la primera entrada coincidente de `bindings`.

Para las entradas de `type: "acp"`, OpenClaw se resuelve por la identidad exacta de la conversación (`match.channel` + cuenta + `match.peer.id`) y no utiliza el orden de nivel de vinculación de ruta anterior.

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
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
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
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

</Accordion>

Consulte [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) para obtener detalles sobre la precedencia.

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

<Accordion title="Detalles de los campos de sesión">

- **`scope`**: estrategia de agrupación de sesiones base para contextos de chat grupal.
  - `per-sender` (predeterminado): cada remitente obtiene una sesión aislada dentro de un contexto de canal.
  - `global`: todos los participantes en un contexto de canal comparten una única sesión (úsese solo cuando se pretenda un contexto compartido).
- **`dmScope`**: cómo se agrupan los MD.
  - `main`: todos los MD comparten la sesión principal.
  - `per-peer`: aislar por id de remitente entre canales.
  - `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
  - `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para multicuenta).
- **`identityLinks`**: mapear ids canónicos a pares con prefijo de proveedor para compartir sesiones entre canales.
- **`reset`**: política de restablecimiento principal. `daily` restablece a la `atHour` hora local; `idle` restablece después de `idleMinutes`. Cuando ambos están configurados, gana el que expire primero.
- **`resetByType`**: anulaciones por tipo (`direct`, `group`, `thread`). El campo heredado `dm` se acepta como alias para `direct`.
- **`parentForkMaxTokens`**: `totalTokens` máxima de la sesión padre permitida al crear una sesión de hilo bifurcada (predeterminado `100000`).
  - Si la `totalTokens` de la sesión padre supera este valor, OpenClaw inicia una sesión de hilo nueva en lugar de heredar el historial de transcripciones de la padre.
  - Establezca `0` para desactivar esta protección y permitir siempre la bifurcación de la padre.
- **`mainKey`**: campo heredado. El tiempo de ejecución ahora siempre usa `"main"` para el depósito principal de chat directo.
- **`agentToAgent.maxPingPongTurns`**: máximo de turnos de respuesta entre agentes durante los intercambios de agente a agente (entero, rango: `0`–`5`). `0` desactiva la encadenación de ping-pong.
- **`sendPolicy`**: coincidencia por `channel`, `chatType` (`direct|group|channel`, con alias heredado `dm`), `keyPrefix` o `rawKeyPrefix`. Prima la primera denegación.
- **`maintenance`**: controles de limpieza y retención del almacén de sesiones.
  - `mode`: `warn` emite solo advertencias; `enforce` aplica la limpieza.
  - `pruneAfter`: límite de antigüedad para entradas obsoletas (predeterminado `30d`).
  - `maxEntries`: número máximo de entradas en `sessions.json` (predeterminado `500`).
  - `rotateBytes`: rotar `sessions.json` cuando exceda este tamaño (predeterminado `10mb`).
  - `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>`. Por defecto es `pruneAfter`; establezca `false` para desactivar.
  - `maxDiskBytes`: presupuesto de disco opcional del directorio de sesiones. En modo `warn` registra advertencias; en modo `enforce` elimina primero los artefactos/sesiones más antiguos.
  - `highWaterBytes`: objetivo opcional después de la limpieza del presupuesto. Por defecto es `80%` de `maxDiskBytes`.
- **`threadBindings`**: valores predeterminados globales para funciones de sesión vinculadas a hilos.
  - `enabled`: interruptor maestro predeterminado (los proveedores pueden anular; Discord usa `channels.discord.threadBindings.enabled`)
  - `idleHours`: inactividad predeterminada de auto-desenfoque en horas (`0` desactiva; los proveedores pueden anular)
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

Sobrescrituras por canal/cuenta: `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Resolución (gana el más específico): cuenta → canal → global. `""` desactiva y detiene la cascada. `"auto"` deriva `[{identity.name}]`.

**Variables de plantilla:**

| Variable          | Descripción                       | Ejemplo                     |
| ----------------- | --------------------------------- | --------------------------- |
| `{model}`         | Nombre corto del modelo           | `claude-opus-4-6`           |
| `{modelFull}`     | Identificador completo del modelo | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nombre del proveedor              | `anthropic`                 |
| `{thinkingLevel}` | Nivel de pensamiento actual       | `high`, `low`, `off`        |
| `{identity.name}` | Nombre de identidad del agente    | (igual que `"auto"`)        |

Las variables no distinguen entre mayúsculas y minúsculas. `{think}` es un alias para `{thinkingLevel}`.

### Reacción de ack

- Por defecto es `identity.emoji` del agente activo, de lo contrario `"👀"`. Establezca `""` para desactivar.
- Sobrescrituras por canal: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Orden de resolución: cuenta → canal → `messages.ackReaction` → reserva de identidad.
- Ámbito: `group-mentions` (predeterminado), `group-all`, `direct`, `all`.
- `removeAckAfterReply`: elimina el ack después de la respuesta en Slack, Discord y Telegram.
- `messages.statusReactions.enabled`: habilita las reacciones de estado del ciclo de vida en Slack, Discord y Telegram.
  En Slack y Discord, sin configurar mantiene las reacciones de estado habilitadas cuando las reacciones de ack están activas.
  En Telegram, establézcalo explícitamente en `true` para habilitar las reacciones de estado del ciclo de vida.

### Antirrebote de entrada

Agrupa mensajes rápidos de solo texto del mismo remitente en un solo turno del agente. Los medios/adjuntos se envían inmediatamente. Los comandos de control omiten el antirrebote.

### TTS (texto a voz)

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

- `auto` controla el TTS automático. `/tts off|always|inbound|tagged` anula esto por sesión.
- `summaryModel` anula `agents.defaults.model.primary` para el resumen automático.
- `modelOverrides` está habilitado de forma predeterminada; `modelOverrides.allowProvider` tiene como valor predeterminado `false` (opt-in).
- Las claves de API recurren a `ELEVENLABS_API_KEY`/`XI_API_KEY` y `OPENAI_API_KEY`.
- `openai.baseUrl` anula el punto de conexión TTS de OpenAI. El orden de resolución es: configuración, luego `OPENAI_TTS_BASE_URL`, luego `https://api.openai.com/v1`.
- Cuando `openai.baseUrl` apunta a un punto de conexión que no es de OpenAI, OpenClaw lo trata como un servidor TTS compatible con OpenAI y relaja la validación de modelo/voz.

---

## Talk

Valores predeterminados para el modo Talk (macOS/iOS/Android).

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
    },
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- `talk.provider` debe coincidir con una clave en `talk.providers` cuando se configuran múltiples proveedores de Talk.
- Las claves planas heredadas de Talk (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) son solo por compatibilidad y se migran automáticamente a `talk.providers.<provider>`.
- Los IDs de voz recurren a `ELEVENLABS_VOICE_ID` o `SAG_VOICE_ID`.
- `providers.*.apiKey` acepta cadenas de texto plano u objetos SecretRef.
- La reserva de `ELEVENLABS_API_KEY` se aplica solo cuando no se configura ninguna clave de API de Talk.
- `providers.*.voiceAliases` permite que las directivas de Talk usen nombres descriptivos.
- `silenceTimeoutMs` controla cuánto tiempo espera el modo Talk después del silencio del usuario antes de enviar la transcripción. Si no está establecido, se mantiene la ventana de pausa predeterminada de la plataforma (`700 ms on macOS and Android, 900 ms on iOS`).

---

## Herramientas

### Perfiles de herramientas

`tools.profile` establece una lista blanca base antes de `tools.allow`/`tools.deny`:

La incorporación local establece de forma predeterminada las nuevas configuraciones locales en `tools.profile: "coding"` si no se establece (se preservan los perfiles explícitos existentes).

| Perfil      | Incluye                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | Solo `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Sin restricción (igual que sin establecer)                                                                                      |

### Grupos de herramientas

| Grupo              | Herramientas                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` se acepta como alias para `exec`)                                           |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `cron`, `gateway`                                                                                                       |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`                                                                                                           |
| `group:media`      | `image`, `image_generate`, `video_generate`, `tts`                                                                      |
| `group:openclaw`   | Todas las herramientas integradas (excluye los complementos del proveedor)                                              |

### `tools.allow` / `tools.deny`

Política global de permitir/denegar herramientas (prevalece la denegación). No distingue entre mayúsculas y minúsculas, admite comodines `*`. Se aplica incluso cuando el entorno acotado de Docker está desactivado.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

Restrinja aún más las herramientas para proveedores o modelos específicos. Orden: perfil base → perfil del proveedor → permitir/denegar.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

Controla el acceso de ejecución elevada fuera del entorno acotado:

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

- La anulación por agente (`agents.list[].tools.elevated`) solo puede restringir aún más.
- `/elevated on|off|ask|full` almacena el estado por sesión; las directivas en línea se aplican a un solo mensaje.
- `exec` elevado omite el sandboxing y utiliza la ruta de escape configurada (`gateway` de forma predeterminada, o `node` cuando el destino de ejecución es `node`).

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
        allowModels: ["gpt-5.4"],
      },
    },
  },
}
```

### `tools.loopDetection`

Las comprobaciones de seguridad de bucle de herramientas están **deshabilitadas de forma predeterminada**. Establezca `enabled: true` para activar la detección.
La configuración se puede definir globalmente en `tools.loopDetection` y anulada por agente en `agents.list[].tools.loopDetection`.

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

- `historySize`: máximo historial de llamadas a herramientas retenido para el análisis de bucles.
- `warningThreshold`: umbral de patrón repetitivo sin progreso para advertencias.
- `criticalThreshold`: umbral de repetición más alto para bloquear bucles críticos.
- `globalCircuitBreakerThreshold`: umbral de parada forzada para cualquier ejecución sin progreso.
- `detectors.genericRepeat`: advertir sobre llamadas repetidas con la misma herramienta y los mismos argumentos.
- `detectors.knownPollNoProgress`: advertir/bloquear en herramientas de sondeo conocidas (`process.poll`, `command_status`, etc.).
- `detectors.pingPong`: advertir/bloquear en patrones de pares alternantes sin progreso.
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
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

Configura la comprensión de medios entrantes (imagen/audio/vídeo):

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // opt-in: send finished async music/video directly to the channel
      },
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

<Accordion title="Campos de entrada del modelo de medios">

**Entrada de proveedor** (`type: "provider"` u omitida):

- `provider`: ID del proveedor de API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
- `model`: anulación del ID del modelo
- `profile` / `preferredProfile`: selección de perfil de `auth-profiles.json`

**Entrada de CLI** (`type: "cli"`):

- `command`: ejecutable a ejecutar
- `args`: argumentos con plantillas (soporta `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.)

**Campos comunes:**

- `capabilities`: lista opcional (`image`, `audio`, `video`). Valores predeterminados: `openai`/`anthropic`/`minimax` → imagen, `google` → imagen+audio+vídeo, `groq` → audio.
- `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: anulaciones por entrada.
- Los fallos recurren a la siguiente entrada.

La autenticación del proveedor sigue el orden estándar: `auth-profiles.json` → vars de entorno → `models.providers.*.apiKey`.

**Campos de finalización asíncrona:**

- `asyncCompletion.directSend`: cuando `true`, las tareas asíncronas `music_generate`
  y `video_generate` completadas intentan primero la entrega directa a través del canal. Valor predeterminado: `false`
  (ruta de entrega de modelo/despertar de sesión solicitante heredada).

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

Controla qué sesiones pueden ser objeto de las herramientas de sesión (`sessions_list`, `sessions_history`, `sessions_send`).

Por defecto: `tree` (sesión actual + sesiones generadas por ella, como subagentes).

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
- `agent`: cualquier sesión que pertenezca al id de agente actual (puede incluir otros usuarios si ejecutas sesiones por remitente bajo el mismo id de agente).
- `all`: cualquier sesión. El direccionamiento entre agentes todavía requiere `tools.agentToAgent`.
- Límite de espacio aislado (sandbox): cuando la sesión actual está en espacio aislado y `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilidad se fuerza a `tree` incluso si `tools.sessions.visibility="all"`.

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
- El contenido de los archivos adjuntos se redacta automáticamente de la persistencia de la transcripción.
- Las entradas Base64 se validan con comprobaciones estrictas de alfabeto/relleno y un protector de tamaño previo a la decodificación.
- Los permisos de archivo son `0700` para directorios y `0600` para archivos.
- La limpieza sigue la política `cleanup`: `delete` siempre elimina los archivos adjuntos; `keep` los conserva solo cuando `retainOnSessionKeep: true`.

### `tools.experimental`

Marcadores de herramientas integradas experimentales. Desactivadas por defecto a menos que se aplique una regla de activación automática específica del tiempo de ejecución.

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

Notas:

- `planTool`: habilita la herramienta estructurada `update_plan` para el seguimiento de trabajo de varios pasos no trivial.
- Por defecto: `false` para proveedores que no son de OpenAI. Las ejecuciones de OpenAI y OpenAI Codex la habilitan automáticamente.
- Cuando está habilitado, el system prompt también añade orientación de uso para que el modelo solo lo utilice para trabajo sustancial y mantenga como máximo un paso `in_progress`.

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`: modelo predeterminado para sub-agentes generados. Si se omite, los sub-agentes heredan el modelo del llamador.
- `allowAgents`: lista de permitidos (allowlist) predeterminada de IDs de agente objetivo para `sessions_spawn` cuando el agente solicitante no establece su propio `subagents.allowAgents` (`["*"]` = cualquiera; predeterminado: solo el mismo agente).
- `runTimeoutSeconds`: tiempo de espera predeterminado (segundos) para `sessions_spawn` cuando la llamada a la herramienta omite `runTimeoutSeconds`. `0` significa sin tiempo de espera.
- Política de herramientas por sub-agente: `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Proveedores personalizados y URLs base

OpenClaw utiliza el catálogo de modelos integrado. Añada proveedores personalizados a través de `models.providers` en la configuración o `~/.openclaw/agents/<agentId>/agent/models.json`.

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
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- Use `authHeader: true` + `headers` para necesidades de autenticación personalizadas.
- Anule la raíz de configuración del agente con `OPENCLAW_AGENT_DIR` (o `PI_CODING_AGENT_DIR`, un alias de variable de entorno heredado).
- Precedencia de fusión para IDs de proveedores coincidentes:
  - Los valores no vacíos del agente `models.json` `baseUrl` tienen prioridad.
  - Los valores no vacíos del agente `apiKey` tienen prioridad solo cuando ese proveedor no es gestionado por SecretRef en el contexto de configuración/auth-profile actual.
  - Los valores `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para refs de entorno, `secretref-managed` para refs de archivo/exec) en lugar de persistir los secretos resueltos.
  - Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para refs de entorno, `secretref-managed` para refs de archivo/exec).
  - Los valores `apiKey`/`baseUrl` del agente vacíos o ausentes recurren a `models.providers` en la configuración.
  - El modelo coincidente `contextWindow`/`maxTokens` usa el valor más alto entre la configuración explícita y los valores implícitos del catálogo.
  - El modelo coincidente `contextTokens` conserva un límite explícito de tiempo de ejecución cuando está presente; úselo para limitar el contexto efectivo sin cambiar los metadatos nativos del modelo.
  - Use `models.mode: "replace"` cuando desee que la configuración reescriba completamente `models.json`.
  - La persistencia de los marcadores es autoritativa en la fuente: los marcadores se escriben desde la instantánea de configuración de la fuente activa (pre-resolución), no desde los valores secretos resueltos en tiempo de ejecución.

### Detalles de los campos del proveedor

- `models.mode`: comportamiento del catálogo del proveedor (`merge` o `replace`).
- `models.providers`: mapa de proveedores personalizados clave por id. de proveedor.
- `models.providers.*.api`: adaptador de solicitud (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc).
- `models.providers.*.apiKey`: credencial del proveedor (se prefiere sustitución de SecretRef/env).
- `models.providers.*.auth`: estrategia de autenticación (`api-key`, `token`, `oauth`, `aws-sdk`).
- `models.providers.*.injectNumCtxForOpenAICompat`: para Ollama + `openai-completions`, inyecta `options.num_ctx` en las solicitudes (predeterminado: `true`).
- `models.providers.*.authHeader`: fuerza el transporte de credenciales en el encabezado `Authorization` cuando sea necesario.
- `models.providers.*.baseUrl`: URL base de la API ascendente.
- `models.providers.*.headers`: encabezados estáticos adicionales para el enrutamiento de proxy/inquilino.
- `models.providers.*.request`: anulaciones de transporte para las solicitudes HTTP del modelo-proveedor.
  - `request.headers`: encabezados adicionales (fusionados con los predeterminados del proveedor). Los valores aceptan SecretRef.
  - `request.auth`: anulación de la estrategia de autenticación. Modos: `"provider-default"` (usar la autenticación integrada del proveedor), `"authorization-bearer"` (con `token`), `"header"` (con `headerName`, `value`, `prefix` opcional).
  - `request.proxy`: anulación del proxy HTTP. Modos: `"env-proxy"` (usar variables de entorno `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (con `url`). Ambos modos aceptan un subobjeto `tls` opcional.
  - `request.tls`: anulación de TLS para conexiones directas. Campos: `ca`, `cert`, `key`, `passphrase` (todos aceptan SecretRef), `serverName`, `insecureSkipVerify`.
- `models.providers.*.models`: entradas explícitas del catálogo de modelos del proveedor.
- `models.providers.*.models.*.contextWindow`: metadatos nativos de la ventana de contexto del modelo.
- `models.providers.*.models.*.contextTokens`: límite de contexto en tiempo de ejecución opcional. Úselo cuando desee un presupuesto de contexto efectivo más pequeño que la `contextWindow` nativa del modelo.
- `models.providers.*.models.*.compat.supportsDeveloperRole`: sugerencia de compatibilidad opcional. Para `api: "openai-completions"` con una `baseUrl` no nativa y no vacía (host no `api.openai.com`), OpenClaw fuerza esto a `false` en tiempo de ejecución. Una `baseUrl` vacía u omitida mantiene el comportamiento predeterminado de OpenAI.
- `plugins.entries.amazon-bedrock.config.discovery`: raíz de configuración de autodescubrimiento de Bedrock.
- `plugins.entries.amazon-bedrock.config.discovery.enabled`: activar/desactivar el descubrimiento implícito.
- `plugins.entries.amazon-bedrock.config.discovery.region`: región de AWS para el descubrimiento.
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter`: filtro de proveedor-id opcional para el descubrimiento dirigido.
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`: intervalo de sondeo para la actualización del descubrimiento.
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`: ventana de contexto de respaldo para los modelos descubiertos.
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`: número máximo de tokens de salida de respaldo para modelos descubiertos.

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

Establezca `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`). Use refs `opencode/...` para el catálogo Zen o refs `opencode-go/...` para el catálogo Go. Atajo: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`.

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

Establezca `ZAI_API_KEY`. `z.ai/*` y `z-ai/*` son alias aceptados. Atajo: `openclaw onboard --auth-choice zai-api-key`.

- Endpoint general: `https://api.z.ai/api/paas/v4`
- Endpoint de codificación (predeterminado): `https://api.z.ai/api/coding/paas/v4`
- Para el endpoint general, defina un proveedor personalizado con la anulación de la URL base.

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
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
        ],
      },
    },
  },
}
```

Para el endpoint de China: `baseUrl: "https://api.moonshot.cn/v1"` o `openclaw onboard --auth-choice moonshot-api-key-cn`.

Los endpoints nativos de Moonshot anuncian compatibilidad de uso de streaming en el transporte
compartido `openai-completions`, y OpenClaw ahora usa eso basándose en las capacidades del
endpoint en lugar de solo el id del proveedor integrado.

</Accordion>

<Accordion title="Kimi Coding">

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi/kimi-code" },
      models: { "kimi/kimi-code": { alias: "Kimi Code" } },
    },
  },
}
```

Proveedor integrado compatible con Anthropic. Atajo: `openclaw onboard --auth-choice kimi-code-api-key`.

</Accordion>

<Accordion title="Sintético (compatible con Anthropic)">

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

<Accordion title="MiniMax M2.7 (directo)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.7" },
      models: {
        "minimax/MiniMax-M2.7": { alias: "Minimax" },
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
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

Establezca `MINIMAX_API_KEY`. Atajos:
`openclaw onboard --auth-choice minimax-global-api` o
`openclaw onboard --auth-choice minimax-cn-api`.
El catálogo de modelos ahora por defecto es solo M2.7.
En la ruta de streaming compatible con Anthropic, OpenClaw deshabilita el pensamiento de MiniMax
por defecto a menos que establezca explícitamente `thinking` usted mismo. `/fast on` o
`params.fastMode: true` reescribe `MiniMax-M2.7` a
`MiniMax-M2.7-highspeed`.

</Accordion>

<Accordion title="Modelos locales (LM Studio)">

Vea [Modelos locales](/en/gateway/local-models). TL;DR: ejecute un modelo local grande a través de la API de Responses de LM Studio en hardware potente; mantenga los modelos alojados combinados para fallback.

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
      nodeManager: "npm", // npm | pnpm | yarn | bun
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

- `allowBundled`: lista de permitidos opcional solo para habilidades incluidas (las habilidades gestionadas/del espacio de trabajo no se ven afectadas).
- `load.extraDirs`: raíces de habilidades compartidas adicionales (menor precedencia).
- `install.preferBrew`: cuando es verdadero, prefiera los instaladores de Homebrew cuando `brew` esté
  disponible antes de recurrir a otros tipos de instaladores.
- `install.nodeManager`: preferencia del instalador de nodos para `metadata.openclaw.install`
  especificaciones (`npm` | `pnpm` | `yarn` | `bun`).
- `entries.<skillKey>.enabled: false` deshabilita una habilidad incluso si está incluida/instalada.
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
- Discovery acepta complementos nativos de OpenClaw además de paquetes compatibles de Codex y Claude, incluyendo paquetes de diseño predeterminado de Claude sin manifiesto.
- **Los cambios de configuración requieren reiniciar el gateway.**
- `allow`: lista blanca opcional (solo se cargan los complementos listados). `deny` tiene prioridad.
- `plugins.entries.<id>.apiKey`: campo de conveniencia de clave API a nivel de complemento (cuando es compatible con el complemento).
- `plugins.entries.<id>.env`: mapa de variables de entorno con ámbito de complemento.
- `plugins.entries.<id>.hooks.allowPromptInjection`: cuando `false`, el núcleo bloquea `before_prompt_build` e ignora los campos de modificación de prompts del `before_agent_start` heredado, mientras preserva el `modelOverride` y el `providerOverride` heredados. Aplicable a enlaces de complementos nativos y directorios de enlaces proporcionados por paquetes compatibles.
- `plugins.entries.<id>.subagent.allowModelOverride`: confiar explícitamente en este complemento para solicitar anulaciones de `provider` y `model` por ejecución para ejecuciones de subagentes en segundo plano.
- `plugins.entries.<id>.subagent.allowedModels`: lista blanca opcional de objetivos `provider/model` canónicos para anulaciones de subagentes de confianza. Use `"*"` solo cuando intencionalmente desee permitir cualquier modelo.
- `plugins.entries.<id>.config`: objeto de configuración definido por el complemento (validado por el esquema del complemento nativo de OpenClaw cuando está disponible).
- `plugins.entries.firecrawl.config.webFetch`: configuración del proveedor de recuperación web de Firecrawl.
  - `apiKey`: clave API de Firecrawl (acepta SecretRef). Recurre a `plugins.entries.firecrawl.config.webSearch.apiKey`, `tools.web.fetch.firecrawl.apiKey` heredado, o la variable de entorno `FIRECRAWL_API_KEY`.
  - `baseUrl`: URL base de la API de Firecrawl (predeterminado: `https://api.firecrawl.dev`).
  - `onlyMainContent`: extraer solo el contenido principal de las páginas (predeterminado: `true`).
  - `maxAgeMs`: antigüedad máxima de la caché en milisegundos (predeterminado: `172800000` / 2 días).
  - `timeoutSeconds`: tiempo de espera de la solicitud de raspado en segundos (predeterminado: `60`).
- `plugins.entries.xai.config.xSearch`: configuración de xAI X Search (búsqueda web de Grok).
  - `enabled`: habilita el proveedor X Search.
  - `model`: modelo Grok a usar para la búsqueda (p. ej., `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming`: configuración de soñar con la memoria (experimental). Consulta [Dreaming](/en/concepts/dreaming) para obtener información sobre fases y umbrales.
  - `enabled`: interruptor maestro de soñar (por defecto `false`).
  - `frequency`: cadencia cron para cada barrido completo de soñar (`"0 3 * * *"` por defecto).
  - la política de fase y los umbrales son detalles de implementación (no claves de configuración visibles para el usuario).
- Los complementos del paquete Claude habilitados también pueden contribuir con valores predeterminados de Pi integrados desde `settings.json`; OpenClaw los aplica como configuraciones de agente sanitizadas, no como parches de configuración sin procesar de OpenClaw.
- `plugins.slots.memory`: elige el id del complemento de memoria activo, o `"none"` para desactivar los complementos de memoria.
- `plugins.slots.contextEngine`: elige el id del complemento del motor de contexto activo; por defecto es `"legacy"` a menos que instales y selecciones otro motor.
- `plugins.installs`: metadatos de instalación administrados por CLI utilizados por `openclaw plugins update`.
  - Incluye `source`, `spec`, `sourcePath`, `installPath`, `version`, `resolvedName`, `resolvedVersion`, `resolvedSpec`, `integrity`, `shasum`, `resolvedAt`, `installedAt`.
  - Trate `plugins.installs.*` como estado gestionado; prefiera los comandos de CLI sobre las ediciones manuales.

Consulte [Plugins](/en/tools/plugin).

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

- `evaluateEnabled: false` desactiva `act:evaluate` y `wait --fn`.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` por defecto es `true` cuando no está configurado (modelo de red confiable).
- Establezca `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` para una navegación estricta solo pública del navegador.
- En modo estricto, los endpoints de perfiles CDP remotos (`profiles.*.cdpUrl`) están sujetos al mismo bloqueo de red privada durante las verificaciones de alcance/descubrimiento.
- `ssrfPolicy.allowPrivateNetwork` sigue siendo compatible como un alias heredado.
- En modo estricto, use `ssrfPolicy.hostnameAllowlist` y `ssrfPolicy.allowedHostnames` para excepciones explícitas.
- Los perfiles remotos son solo de conexión (start/stop/reset deshabilitados).
- `profiles.*.cdpUrl` acepta `http://`, `https://`, `ws://` y `wss://`.
  Use HTTP(S) cuando desee que OpenClaw descubra `/json/version`; use WS(S)
  cuando su proveedor le proporcione una URL directa de WebSocket DevTools.
- Los perfiles `existing-session` son solo de host y usan Chrome MCP en lugar de CDP.
- Los perfiles `existing-session` pueden establecer `userDataDir` para apuntar a un perfil
  específico de navegador basado en Chromium como Brave o Edge.
- Los perfiles `existing-session` mantienen los límites de ruta actuales de Chrome MCP:
  acciones impulsadas por snapshot/ref en lugar de orientación por selector CSS, ganchos de carga
  de un solo archivo, sin anulaciones de tiempo de espera de diálogo, sin `wait --load networkidle` y sin
  `responsebody`, exportación de PDF, intercepción de descargas o acciones por lotes.
- Los perfiles `openclaw` gestionados localmente asignan automáticamente `cdpPort` y `cdpUrl`; solo
  establezca `cdpUrl` explícitamente para CDP remoto.
- Orden de detección automática: navegador predeterminado si está basado en Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- Servicio de control: solo loopback (puerto derivado de `gateway.port`, por defecto `18791`).
- `extraArgs` añade banderas de lanzamiento adicionales al inicio local de Chromium (por ejemplo
  `--disable-gpu`, tamaño de ventana o banderas de depuración).

---

## IU

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

- `seamColor`: color de acento para el cromo de la IU de la aplicación nativa (tinte de burbuja del Modo Hablar, etc.).
- `assistant`: Sobrescritura de identidad de la interfaz de control. Recurre a la identidad del agente activo.

---

## Pasarela

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

<Accordion title="Detalles de campos de la pasarela">

- `mode`: `local` (ejecutar pasarela) o `remote` (conectarse a una pasarela remota). La pasarela se niega a iniciarse a menos que `local`.
- `port`: puerto único multiplexado para WS + HTTP. Precedencia: `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind`: `auto`, `loopback` (predeterminado), `lan` (`0.0.0.0`), `tailnet` (solo IP de Tailscale) o `custom`.
- **Alias de enlace heredados**: utilice los valores del modo de enlace en `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), no los alias de host (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Nota de Docker**: el enlace `loopback` predeterminado escucha en `127.0.0.1` dentro del contenedor. Con la red bridge de Docker (`-p 18789:18789`), el tráfico llega a `eth0`, por lo que la pasarela es inalcanzable. Utilice `--network host` o configure `bind: "lan"` (o `bind: "custom"` con `customBindHost: "0.0.0.0"`) para escuchar en todas las interfaces.
- **Auth**: requerido de forma predeterminada. Los enlaces que no son de loopback requieren autenticación de la pasarela. En la práctica, esto significa un token/contraseña compartido o un proxy inverso con conocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`. El asistente de incorporación genera un token de forma predeterminada.
- Si se configuran tanto `gateway.auth.token` como `gateway.auth.password` (incluyendo SecretRefs), configure `gateway.auth.mode` explícitamente a `token` o `password`. Los flujos de inicio y de instalación/reparación del servicio fallan cuando ambos están configurados y el modo no está establecido.
- `gateway.auth.mode: "none"`: modo sin autenticación explícito. Úselo solo para configuraciones de loopback local confiables; esto intencionalmente no se ofrece en los mensajes de incorporación.
- `gateway.auth.mode: "trusted-proxy"`: delega la autenticación a un proxy inverso con conocimiento de identidad y confía en los encabezados de identidad de `gateway.trustedProxies` (consulte [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)). Este modo espera una fuente de proxy que **no sea** de loopback; los proxies inversos de loopback en el mismo host no satisfacen la autenticación de proxy confiable.
- `gateway.auth.allowTailscale`: cuando es `true`, los encabezados de identidad de Tailscale Serve pueden satisfacer la autenticación de Control UI/WebSocket (verificados mediante `tailscale whois`). Los puntos finales de la API HTTP **no** utilizan esa autenticación de encabezado de Tailscale; siguen el modo de autenticación HTTP normal de la pasarela en su lugar. Este flujo sin token asume que el host de la pasarela es confiable. El valor predeterminado es `true` cuando `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit`: limitador opcional de autenticaciones fallidas. Se aplica por IP de cliente y por ámbito de autenticación (shared-secret y device-token se rastrean de forma independiente). Los intentos bloqueados devuelven `429` + `Retry-After`.
  - En la ruta asíncrona de Control UI de Tailscale Serve, los intentos fallidos para el mismo `{scope, clientIp}` se serializan antes de la escritura del fallo. Por lo tanto, los malos intentos simultáneos del mismo cliente pueden activar el limitador en la segunda solicitud en lugar de que ambos compitan como simples discordancias.
  - `gateway.auth.rateLimit.exemptLoopback` es `true` de forma predeterminada; configure `false` cuando desee intencionalmente que el tráfico de localhost también tenga una tasa limitada (para configuraciones de prueba o implementaciones de proxy estrictas).
- Los intentos de autenticación WS de origen del navegador siempre se limitan con la exención de loopback deshabilitada (defensa en profundidad contra la fuerza bruta de localhost basada en el navegador).
- En loopback, esos bloqueos de origen del navegador se aíslan por valor `Origin` normalizado, por lo que los fallos repetidos de un origen de localhost no bloquean automáticamente un origen diferente.
- `tailscale.mode`: `serve` (solo tailnet, enlace de loopback) o `funnel` (público, requiere autenticación).
- `controlUi.allowedOrigins`: lista de permitidos explícita de origen del navegador para las conexiones WebSocket de la pasarela. Requerido cuando se esperan clientes de navegador de orígenes que no son de loopback.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: modo peligroso que habilita la reserva de origen del encabezado Host para implementaciones que dependen intencionalmente de la política de origen del encabezado Host.
- `remote.transport`: `ssh` (predeterminado) o `direct` (ws/wss). Para `direct`, `remote.url` debe ser `ws://` o `wss://`.
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: anulación de emergencia del lado del cliente que permite `ws://` en texto plano a IPs de red privada confiables; el valor predeterminado sigue siendo solo loopback para texto plano.
- `gateway.remote.token` / `.password` son campos de credenciales de cliente remoto. Por sí mismos no configuran la autenticación de la pasarela.
- `gateway.push.apns.relay.baseUrl`: URL HTTPS base para el relé APNs externo utilizado por las compilaciones oficiales/TestFlight de iOS después de que publican registros respaldados por relé a la pasarela. Esta URL debe coincidir con la URL del relé compilada en la compilación de iOS.
- `gateway.push.apns.relay.timeoutMs`: tiempo de espera de envío de pasarela a relé en milisegundos. El valor predeterminado es `10000`.
- Los registros respaldados por relé se delegan a una identidad de pasarela específica. La aplicación iOS emparejada obtiene `gateway.identity.get`, incluye esa identidad en el registro de relé y reenvía una concesión de envío con ámbito de registro a la pasarela. Otra pasarela no puede reutilizar ese registro almacenado.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: anulaciones de entorno temporales para la configuración de relé anterior.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: salida de emergencia solo para desarrollo para URLs de relé HTTP de loopback. Las URL de relé de producción deben mantenerse en HTTPS.
- `gateway.channelHealthCheckMinutes`: intervalo del monitor de salud del canal en minutos. Configure `0` para deshabilitar globalmente los reinicios del monitor de salud. Predeterminado: `5`.
- `gateway.channelStaleEventThresholdMinutes`: umbral de socket obsoleto en minutos. Mantenga esto mayor o igual a `gateway.channelHealthCheckMinutes`. Predeterminado: `30`.
- `gateway.channelMaxRestartsPerHour`: máximo de reinicios del monitor de salud por canal/cuenta en una hora móvil. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: opción de no participación por canal para los reinicios del monitor de salud mientras se mantiene el monitor global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación por cuenta para canales multicuenta. Cuando se establece, tiene prioridad sobre la anulación a nivel de canal.
- Las rutas de llamada de la pasarela local pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente a través de SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de reserva remota).
- `trustedProxies`: IPs de proxy inverso que terminan TLS o inyectan encabezados de cliente reenviado. Solo liste los proxies que controle. Las entradas de loopback siguen siendo válidas para configuraciones de proxy/detección local en el mismo host (por ejemplo, Tailscale Serve o un proxy inverso local), pero **no** hacen que las solicitudes de loopback sean elegibles para `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback`: cuando es `true`, la pasarela acepta `X-Real-IP` si falta `X-Forwarded-For`. Predeterminado `false` para un comportamiento de fallo cerrado.
- `gateway.tools.deny`: nombres de herramientas adicionales bloqueadas para `POST /tools/invoke` HTTP (extiende la lista de denegación predeterminada).
- `gateway.tools.allow`: elimina nombres de herramientas de la lista de denegación HTTP predeterminada.

</Accordion>

### Endpoints compatibles con OpenAI

- Chat Completions: deshabilitado por defecto. Habilítelo con `gateway.http.endpoints.chatCompletions.enabled: true`.
- Responses API: `gateway.http.endpoints.responses.enabled`.
- Endurecimiento de entrada de URL de Responses:
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Las listas de permitidos vacías se tratan como no establecidas; use `gateway.http.endpoints.responses.files.allowUrl=false`
    y/o `gateway.http.endpoints.responses.images.allowUrl=false` para deshabilitar la obtención de URL.
- Encabezado opcional de endurecimiento de respuesta:
  - `gateway.http.securityHeaders.strictTransportSecurity` (establezca solo para orígenes HTTPS que controle; consulte [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Aislamiento de múltiples instancias

Ejecute múltiples puertas de enlace en un solo host con puertos y directorios de estado únicos:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Indicadores de conveniencia: `--dev` (usa `~/.openclaw-dev` + puerto `19001`), `--profile <name>` (usa `~/.openclaw-<name>`).

Consulte [Multiple Gateways](/en/gateway/multiple-gateways).

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`: habilita la terminación TLS en el oyente de la puerta de enlace (HTTPS/WSS) (predeterminado: `false`).
- `autoGenerate`: genera automáticamente un par certificado/clave local autofirmado cuando no se configuran archivos explícitos; solo para uso local/desarrollo.
- `certPath`: ruta del sistema de archivos al archivo de certificado TLS.
- `keyPath`: ruta del sistema de archivos al archivo de clave privada TLS; manténgala con permisos restringidos.
- `caPath`: ruta opcional del paquete de CA para verificación de cliente o cadenas de confianza personalizadas.

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`: controla cómo se aplican las ediciones de configuración en tiempo de ejecución.
  - `"off"`: ignora las ediciones en vivo; los cambios requieren un reinicio explícito.
  - `"restart"`: siempre reinicia el proceso de puerta de enlace ante cambios de configuración.
  - `"hot"`: aplica los cambios en el proceso sin reiniciar.
  - `"hybrid"` (predeterminado): intenta la recarga en caliente primero; recurre al reinicio si es necesario.
- `debounceMs`: ventana de debounce en ms antes de que se apliquen los cambios de configuración (entero no negativo).
- `deferralTimeoutMs`: tiempo máximo en ms a esperar para operaciones en curso antes de forzar un reinicio (predeterminado: `300000` = 5 minutos).

---

## Ganchos

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
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth: `Authorization: Bearer <token>` o `x-openclaw-token: <token>`.
Los tokens de gancho de cadena de consulta son rechazados.

Notas de validación y seguridad:

- `hooks.enabled=true` requiere un `hooks.token` no vacío.
- `hooks.token` debe ser **distinto** de `gateway.auth.token`; se rechaza reutilizar el token de Gateway.
- `hooks.path` no puede ser `/`; utilice una subruta dedicada como `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, restrinja `hooks.allowedSessionKeyPrefixes` (por ejemplo `["hook:"]`).

**Endpoints:**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - `sessionKey` del payload de la solicitud se acepta solo cuando `hooks.allowRequestSessionKey=true` (predeterminado: `false`).
- `POST /hooks/<name>` → resuelto mediante `hooks.mappings`

<Accordion title="Detalles de mapeo">

- `match.path` coincide con la subruta después de `/hooks` (p. ej., `/hooks/gmail` → `gmail`).
- `match.source` coincide con un campo de carga útil para rutas genéricas.
- Las plantillas como `{{messages[0].subject}}` leen de la carga útil.
- `transform` puede apuntar a un módulo JS/TS que devuelva una acción de hook.
  - `transform.module` debe ser una ruta relativa y permanecer dentro de `hooks.transformsDir` (se rechazan las rutas absolutas y el cruce de directorios).
- `agentId` enruta a un agente específico; los IDs desconocidos vuelven al predeterminado.
- `allowedAgentIds`: restringe el enrutamiento explícito (`*` u omitido = permitir todo, `[]` = denegar todo).
- `defaultSessionKey`: clave de sesión fija opcional para ejecuciones de agente de hook sin `sessionKey` explícito.
- `allowRequestSessionKey`: permite a los llamadores `/hooks/agent` establecer `sessionKey` (predeterminado: `false`).
- `allowedSessionKeyPrefixes`: lista blanca de prefijos opcional para valores `sessionKey` explícitos (solicitud + mapeo), p. ej., `["hook:"]`.
- `deliver: true` envía la respuesta final a un canal; `channel` predeterminado es `last`.
- `model` anula el LLM para esta ejecución de hook (debe permitirse si el catálogo de modelos está configurado).

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
- No ejecute un `gog gmail watch serve` separado junto con Gateway.

---

## Anfitrión de Canvas

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- Sirve HTML/CSS/JS editable por el agente y A2UI a través de HTTP bajo el puerto de Gateway:
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Solo local: mantenga `gateway.bind: "loopback"` (predeterminado).
- Enlaces no loopback: las rutas de canvas requieren autenticación de Gateway (token/contraseña/proxy de confianza), igual que otras superficies HTTP del Gateway.
- Los WebViews de Node normalmente no envían encabezados de autenticación; después de que un nodo está emparejado y conectado, el Gateway anuncia URLs de capacidades con alcance de nodo para el acceso a canvas/A2UI.
- Las URLs de capacidades están vinculadas a la sesión WS del nodo activo y caducan rápidamente. No se usa una reserva basada en IP.
- Inyecta el cliente de recarga en vivo en el HTML servido.
- Crea automáticamente un `index.html` inicial cuando está vacío.
- También sirve A2UI en `/__openclaw__/a2ui/`.
- Los cambios requieren un reinicio del gateway.
- Desactiva la recarga en vivo para directorios grandes o errores de `EMFILE`.

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

Escribe una zona DNS-SD unicast bajo `~/.openclaw/dns/`. Para el descubrimiento entre redes, combinar con un servidor DNS (se recomienda CoreDNS) + DNS dividido de Tailscale.

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

- Las variables de entorno en línea solo se aplican si falta la clave en el entorno del proceso.
- Archivos `.env`: CWD `.env` + `~/.openclaw/.env` (ninguno anula las variables existentes).
- `shellEnv`: importa las claves esperadas faltantes desde el perfil de tu shell de inicio de sesión.
- Consulte [Environment](/en/help/environment) para obtener la precedencia completa.

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
- Las variables faltantes/vacías lanzan un error al cargar la configuración.
- Escape con `$${VAR}` para un `${VAR}` literal.
- Funciona con `$include`.

---

## Secretos

Las referencias a secretos son aditivas: los valores en texto plano todavía funcionan.

### `SecretRef`

Use one object shape:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validación:

- `provider` patrón: `^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` patrón de id: `^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id: puntero JSON absoluto (por ejemplo `"/providers/openai/apiKey"`)
- `source: "exec"` patrón de id: `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- Los ids `source: "exec"` no deben contener `.` o `..` segmentos de ruta delimitados por barras (por ejemplo `a/../b` es rechazado)

### Superficie de credenciales soportada

- Matriz canónica: [Superficie de credenciales SecretRef](/en/reference/secretref-credential-surface)
- Los objetivos `secrets apply` soportan rutas de credenciales `openclaw.json`.
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

- El proveedor `file` soporta `mode: "json"` y `mode: "singleValue"` (`id` debe ser `"value"` en modo singleValue).
- El proveedor `exec` requiere una ruta `command` absoluta y usa cargas de protocolo en stdin/stdout.
- Por defecto, se rechazan las rutas de comandos de enlaces simbólicos. Establezca `allowSymlinkCommand: true` para permitir rutas de enlaces simbólicos mientras se valida la ruta de destino resuelta.
- Si se configura `trustedDirs`, la comprobación de directorio de confianza se aplica a la ruta de destino resuelta.
- El entorno hijo `exec` es mínimo por defecto; pase las variables requeridas explícitamente con `passEnv`.
- Las referencias de secretos se resuelven en el momento de la activación en una instantánea en memoria, luego las rutas de solicitud leen solo la instantánea.
- El filtrado de superficie activa se aplica durante la activación: las referencias no resueltas en superficies habilitadas fallan el inicio/recarga, mientras que las superficies inactivas se omiten con diagnósticos.

---

## Almacenamiento de autenticación

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
    },
  },
}
```

- Los perfiles por agente se almacenan en `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` admite referencias a nivel de valor (`keyRef` para `api_key`, `tokenRef` para `token`) para modos de credenciales estáticas.
- Los perfiles en modo OAuth (`auth.profiles.<id>.mode = "oauth"`) no admiten credenciales de perfil de autenticación respaldadas por SecretRef.
- Las credenciales de tiempo de ejecución estáticas provienen de instantáneas resueltas en memoria; las entradas estáticas heredadas de `auth.json` se eliminan cuando se descubren.
- Importaciones de OAuth heredadas de `~/.openclaw/credentials/oauth.json`.
- Consulte [OAuth](/en/concepts/oauth).
- Comportamiento de tiempo de ejecución de Secrets y herramientas `audit/configure/apply`: [Secrets Management](/en/gateway/secrets).

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours`: retroceso base en horas cuando un perfil falla debido a errores reales
  de facturación/crédito insuficiente (predeterminado: `5`). El texto de facturación explícito aún
  puede llegar aquí incluso en respuestas `401`/`403`, pero los comparadores de texto
  específicos del proveedor permanecen limitados al proveedor que los posee (por ejemplo, OpenRouter
  `Key limit exceeded`). Los mensajes reintentables de ventana de uso HTTP `402` o
  límite de gasto de organización/espacio de trabajo permanecen en su lugar en la ruta `rate_limit`.
- `billingBackoffHoursByProvider`: invalidaciones opcionales por proveedor para las horas de retroceso de facturación.
- `billingMaxHours`: límite en horas para el crecimiento exponencial del retroceso de facturación (predeterminado: `24`).
- `authPermanentBackoffMinutes`: retroceso base en minutos para fallos `auth_permanent` de alta confianza (predeterminado: `10`).
- `authPermanentMaxMinutes`: límite en minutos para el crecimiento del retroceso `auth_permanent` (predeterminado: `60`).
- `failureWindowHours`: ventana móvil en horas utilizada para los contadores de retroceso (predeterminado: `24`).
- `overloadedProfileRotations`: rotaciones máximas del perfil de autenticación del mismo proveedor para errores de sobrecarga antes de cambiar al respaldo del modelo (predeterminado: `1`). Las formas de proveedor ocupado, como `ModelNotReadyException`%, se agrupan aquí.
- `overloadedBackoffMs`: retraso fijo antes de reintentar una rotación de proveedor/perfil sobrecargado (predeterminado: `0`).
- `rateLimitedProfileRotations`: rotaciones máximas del perfil de autenticación del mismo proveedor para errores de límite de velocidad antes de cambiar al respaldo del modelo (predeterminado: `1`). Ese cubo de límite de velocidad incluye texto con forma de proveedor, como `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` y `resource exhausted`.

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
- `maxFileBytes`: tamaño máximo del archivo de registro en bytes antes de que se supriman las escrituras (entero positivo; predeterminado: `524288000` = 500 MB). Utilice la rotación de registros externa para los despliegues de producción.

---

## Diagnóstico

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled`: interruptor maestro para la salida de instrumentación (predeterminado: `true`).
- `flags`: matriz de cadenas de indicadores que habilitan la salida de registro dirigida (admite comodines como `"telegram.*"` o `"*"`).
- `stuckSessionWarnMs`: umbral de edad en ms para emitir advertencias de sesión atascada mientras una sesión permanece en estado de procesamiento.
- `otel.enabled`: habilita la canalización de exportación de OpenTelemetry (predeterminado: `false`).
- `otel.endpoint`: URL del recolector para la exportación de OTel.
- `otel.protocol`: `"http/protobuf"` (predeterminado) o `"grpc"`.
- `otel.headers`: encabezados de metadatos HTTP/gRPC adicionales enviados con las solicitudes de exportación de OTel.
- `otel.serviceName`: nombre del servicio para los atributos de recursos.
- `otel.traces` / `otel.metrics` / `otel.logs`: habilitar la exportación de trazas, métricas o registros.
- `otel.sampleRate`: tasa de muestreo de trazas `0`–`1`.
- `otel.flushIntervalMs`: intervalo de vaciado periódico de telemetría en ms.
- `cacheTrace.enabled`: registrar instantáneas de traza de caché para ejecuciones integradas (predeterminado: `false`).
- `cacheTrace.filePath`: ruta de salida para el JSONL de traza de caché (predeterminado: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`: controlar lo que se incluye en la salida de traza de caché (todos predeterminados: `true`).

---

## Actualizar

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel`: canal de lanzamiento para instalaciones npm/git — `"stable"`, `"beta"` o `"dev"`.
- `checkOnStart`: buscar actualizaciones de npm cuando se inicia la puerta de enlace (predeterminado: `true`).
- `auto.enabled`: habilitar la actualización automática en segundo plano para instalaciones de paquetes (predeterminado: `false`).
- `auto.stableDelayHours`: retraso mínimo en horas antes de la aplicación automática del canal estable (predeterminado: `6`; máximo: `168`).
- `auto.stableJitterHours`: ventana de distribución de lanzamiento adicional del canal estable en horas (predeterminado: `12`; máximo: `168`).
- `auto.betaCheckIntervalHours`: frecuencia con la que se ejecutan las comprobaciones del canal beta en horas (predeterminado: `1`; máximo: `24`).

---

## ACP

```json5
{
  acp: {
    enabled: false,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`: control de características global de ACP (predeterminado: `false`).
- `dispatch.enabled`: puerta de control independiente para el despacho de turnos de sesión ACP (predeterminado: `true`). Establezca `false` para mantener los comandos ACP disponibles mientras se bloquea la ejecución.
- `backend`: id de backend de tiempo de ejecución ACP predeterminado (debe coincidir con un complemento de tiempo de ejecución ACP registrado).
- `defaultAgent`: id del agente objetivo ACP de reserva cuando las generaciones no especifican un objetivo explícito.
- `allowedAgents`: lista de permitidos de ids de agentes permitidos para sesiones de tiempo de ejecución ACP; vacío significa que no hay restricción adicional.
- `maxConcurrentSessions`: máximo de sesiones ACP activas simultáneamente.
- `stream.coalesceIdleMs`: ventana de vaciado de inactividad en ms para texto transmitido.
- `stream.maxChunkChars`: tamaño máximo de fragmento antes de dividir la proyección de bloque transmitido.
- `stream.repeatSuppression`: suprimir líneas de estado/herramienta repetidas por turno (predeterminado: `true`).
- `stream.deliveryMode`: `"live"` transmite incrementalmente; `"final_only"` almacena en el búfer hasta los eventos de terminales de turno.
- `stream.hiddenBoundarySeparator`: separador antes del texto visible después de eventos de herramientas ocultas (predeterminado: `"paragraph"`).
- `stream.maxOutputChars`: máximo de caracteres de salida del asistente proyectados por turno ACP.
- `stream.maxSessionUpdateChars`: máximo de caracteres para las líneas de estado/actualización ACP proyectadas.
- `stream.tagVisibility`: registro de nombres de etiquetas a anulaciones de visibilidad booleana para eventos transmitidos.
- `runtime.ttlMinutes`: TTL de inactividad en minutos para los trabajadores de sesión ACP antes de la limpieza elegible.
- `runtime.installCommand`: comando de instalación opcional para ejecutar al iniciar un entorno de tiempo de ejecución ACP.

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

- `cli.banner.taglineMode` controla el estilo del eslogan del banner:
  - `"random"` (predeterminado): eslogan divertidos/de temporada rotativos.
  - `"default"`: eslogan neutral fijo (`All your chats, one OpenClaw.`).
  - `"off"`: sin texto de eslogan (el título/versión del banner todavía se muestra).
- Para ocultar todo el banner (no solo los eslogans), establezca el entorno `OPENCLAW_HIDE_BANNER=1`.

---

## Asistente

Metadatos escritos por flujos de configuración guiados por CLI (`onboard`, `configure`, `doctor`):

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

Consulte los campos de identidad de `agents.list` en [Valores predeterminados del agente](#agent-defaults).

---

## Puente (heredado, eliminado)

Las compilaciones actuales ya no incluyen el puente TCP. Los nodos se conectan a través del WebSocket de Gateway. Las claves `bridge.*` ya no forman parte del esquema de configuración (la validación falla hasta que se eliminen; `openclaw doctor --fix` puede eliminar las claves desconocidas).

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

- `sessionRetention`: cuánto tiempo mantener las sesiones de ejecución de cron aisladas completadas antes de podarlas de `sessions.json`. También controla la limpieza de las transcripciones de cron eliminadas y archivadas. Predeterminado: `24h`; establezca `false` para desactivar.
- `runLog.maxBytes`: tamaño máximo por archivo de registro de ejecución (`cron/runs/<jobId>.jsonl`) antes de la poda. Predeterminado: `2_000_000` bytes.
- `runLog.keepLines`: líneas más recientes retenidas cuando se activa la poda del registro de ejecución. Predeterminado: `2000`.
- `webhookToken`: token de portador utilizado para la entrega POST del webhook de cron (`delivery.mode = "webhook"`); si se omite, no se envía ningún encabezado de autenticación.
- `webhook`: URL de webhook de retorno heredado obsoleto (http/https) utilizado solo para trabajos almacenados que aún tienen `notify: true`.

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts`: reintentos máximos para trabajos de un solo disparo en errores transitorios (predeterminado: `3`; rango: `0`–`10`).
- `backoffMs`: matriz de retrasos de retroceso en ms para cada intento de reintento (predeterminado: `[30000, 60000, 300000]`; 1–10 entradas).
- `retryOn`: tipos de error que activan reintentos — `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omitir para reintentar todos los tipos transitorios.

Se aplica solo a trabajos de cron de un solo disparo. Los trabajos recurrentes usan un manejo de fallas separado.

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`: activa las alertas de fallo para los trabajos de cron (predeterminado: `false`).
- `after`: fallos consecutivos antes de que se active una alerta (entero positivo, mínimo: `1`).
- `cooldownMs`: milisegundos mínimos entre alertas repetidas para el mismo trabajo (entero no negativo).
- `mode`: modo de entrega — `"announce"` envía a través de un mensaje de canal; `"webhook"` publica en el webhook configurado.
- `accountId`: ID de cuenta o canal opcional para limitar el alcance de la entrega de alertas.

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- Destino predeterminado para las notificaciones de fallo de cron en todos los trabajos.
- `mode`: `"announce"` o `"webhook"`; el valor predeterminado es `"announce"` cuando existen suficientes datos de destino.
- `channel`: anulación del canal para la entrega de anuncios. `"last"` reutiliza el último canal de entrega conocido.
- `to`: destino de anuncio explícito o URL de webhook. Requerido para el modo webhook.
- `accountId`: anulación de cuenta opcional para la entrega.
- Las anulaciones `delivery.failureDestination` por trabajo tienen prioridad sobre este valor predeterminado global.
- Cuando no se establece ningún destino de fallo global ni por trabajo, los trabajos que ya se entregan a través de `announce` ahora recurren a ese destino de anuncio principal en caso de fallo.
- `delivery.failureDestination` solo es compatible con trabajos `sessionTarget="isolated"` a menos que el `delivery.mode` principal del trabajo sea `"webhook"`.

Consulte [Cron Jobs](/en/automation/cron-jobs). Las ejecuciones aisladas de cron se rastrean como [tareas en segundo plano](/en/automation/tasks).

---

## Variables de plantilla del modelo multimedia

Marcadores de posición de plantilla expandidos en `tools.media.models[].args`:

| Variable           | Descripción                                                   |
| ------------------ | ------------------------------------------------------------- |
| `{{Body}}`         | Cuerpo completo del mensaje entrante                          |
| `{{RawBody}}`      | Cuerpo sin procesar (sin contenedores de historial/remitente) |
| `{{BodyStripped}}` | Cuerpo con las menciones de grupo eliminadas                  |
| `{{From}}`         | Identificador del remitente                                   |
| `{{To}}`           | Identificador del destino                                     |
| `{{MessageSid}}`   | ID del mensaje del canal                                      |
| `{{SessionId}}`    | UUID de la sesión actual                                      |
| `{{IsNewSession}}` | `"true"` cuando se crea una nueva sesión                      |
| `{{MediaUrl}}`     | Seudo-URL de medios entrantes                                 |
| `{{MediaPath}}`    | Ruta local de medios                                          |
| `{{MediaType}}`    | Tipo de medio (imagen/audio/documento/…)                      |
| `{{Transcript}}`   | Transcripción de audio                                        |
| `{{Prompt}}`       | Prompt de medios resuelto para entradas de CLI                |
| `{{MaxChars}}`     | Máximo de caracteres de salida resuelto para entradas de CLI  |
| `{{ChatType}}`     | `"direct"` o `"group"`                                        |
| `{{GroupSubject}}` | Asunto del grupo (mejor esfuerzo)                             |
| `{{GroupMembers}}` | Vista previa de los miembros del grupo (mejor esfuerzo)       |
| `{{SenderName}}`   | Nombre para mostrar del remitente (mejor esfuerzo)            |
| `{{SenderE164}}`   | Número de teléfono del remitente (mejor esfuerzo)             |
| `{{Provider}}`     | Sugerencia de proveedor (whatsapp, telegram, discord, etc.)   |

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

- Archivo único: reemplaza el objeto contenedor.
- Array de archivos: fusionados profundamente en orden (los posteriores sobrescriben los anteriores).
- Claves de mismo nivel: fusionadas después de las inclusiones (sobrescriben los valores incluidos).
- Inclusiones anidadas: hasta 10 niveles de profundidad.
- Rutas: resueltas en relación con el archivo que incluye, pero deben permanecer dentro del directorio de configuración de nivel superior (`dirname` de `openclaw.json`). Solo se permiten formas absolutas/`../` cuando aún se resuelven dentro de ese límite.
- Errores: mensajes claros para archivos faltantes, errores de análisis e inclusiones circulares.

---

_Relacionado: [Configuration](/en/gateway/configuration) · [Configuration Examples](/en/gateway/configuration-examples) · [Doctor](/en/gateway/doctor)_
