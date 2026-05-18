---
summary: "Configuración de canal: control de acceso, emparejamiento, claves por canal en Slack, Discord, Telegram, WhatsApp, Matrix, iMessage y más"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "Configuración — canales"
---

Claves de configuración por canal bajo `channels.*`. Cubre el acceso a MD y grupos,
configuraciones multicuenta, filtrado de menciones y claves por canal para Slack, Discord,
Telegram, WhatsApp, Matrix, iMessage y otros complementos de canal incluidos.

Para agentes, herramientas, tiempo de ejecución de la puerta de enlace y otras claves de nivel superior, consulte
[Referencia de configuración](/es/gateway/configuration-reference).

## Canales

Cada canal se inicia automáticamente cuando existe su sección de configuración (a menos que `enabled: false`).

### Acceso a MD y grupos

Todos los canales admiten políticas de MD y políticas de grupos:

| Política de MD             | Comportamiento                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pairing` (predeterminado) | Los remitentes desconocidos obtienen un código de emparejamiento de un solo uso; el propietario debe aprobar |
| `allowlist`                | Solo remitentes en `allowFrom` (o almacén de permisos emparejado)                                            |
| `open`                     | Permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)                                                |
| `disabled`                 | Ignorar todos los MD entrantes                                                                               |

| Política de grupos           | Comportamiento                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `allowlist` (predeterminado) | Solo grupos que coincidan con la lista de permitidos configurada                   |
| `open`                       | Omitir las listas de permitidos de grupos (aún se aplica el filtrado de menciones) |
| `disabled`                   | Bloquear todos los mensajes de grupos/salas                                        |

<Note>
`channels.defaults.groupPolicy` establece el valor predeterminado cuando el `groupPolicy` de un proveedor no está configurado.
Los códigos de emparejamiento caducan después de 1 hora. Las solicitudes pendientes de emparejamiento de MD están limitadas a **3 por canal**.
Si falta un bloque de proveedor por completo (`channels.<provider>` ausente), la política de grupo de tiempo de ejecución vuelve a `allowlist` (fail-closed) con una advertencia de inicio.
</Note>

### Invalidaciones del modelo de canal

Use `channels.modelByChannel` para fijar IDs de canal específicos a un modelo. Los valores aceptan `provider/model` o alias de modelo configurados. La asignación de canal se aplica cuando una sesión aún no tiene una anulación de modelo (por ejemplo, establecida a través de `/model`).

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

Use `channels.defaults` para una política de grupo compartida y el comportamiento de latidos en todos los proveedores:

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

- `channels.defaults.groupPolicy`: política de grupo de reserva cuando el `groupPolicy` a nivel de proveedor no está configurado.
- `channels.defaults.contextVisibility`: modo de visibilidad de contexto suplementario predeterminado para todos los canales. Valores: `all` (predeterminado, incluir todo el contexto citado/hilo/historial), `allowlist` (solo incluir contexto de remitentes en la lista de permitidos), `allowlist_quote` (igual que la lista de permitidos pero mantener el contexto de cita/respuesta explícito). Invalidación por canal: `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk`: incluir estados de canal saludables en la salida de heartbeat.
- `channels.defaults.heartbeat.showAlerts`: incluir estados degradados/de error en la salida de heartbeat.
- `channels.defaults.heartbeat.useIndicator`: renderizar salida de heartbeat compacta estilo indicador.

### WhatsApp

WhatsApp se ejecuta a través del canal web de la puerta de enlace (Baileys Web). Se inicia automáticamente cuando existe una sesión vinculada.

```json5
{
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    whatsapp: {
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    },
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
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

- Los comandos salientes por defecto van a la cuenta `default` si está presente; de lo contrario, al primer id de cuenta configurado (ordenado).
- `channels.whatsapp.defaultAccount` opcional anula esa selección de cuenta predeterminada de respaldo cuando coincide con un id de cuenta configurado.
- El directorio de autenticación heredado de cuenta única de Baileys es migrado por `openclaw doctor` a `whatsapp/default`.
- Invalidaciones por cuenta: `channels.whatsapp.accounts.<id>.sendReadReceipts`, `channels.whatsapp.accounts.<id>.dmPolicy`, `channels.whatsapp.accounts.<id>.allowFrom`.

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
      apiRoot: "https://api.telegram.org",
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Token del bot: `channels.telegram.botToken` o `channels.telegram.tokenFile` (solo archivo regular; se rechazan los enlaces simbólicos), con `TELEGRAM_BOT_TOKEN` como respaldo para la cuenta predeterminada.
- `apiRoot` es solo la raíz de la API de Bot de Telegram. Use `https://api.telegram.org` o su propia raíz autohospedada/proxy, no `https://api.telegram.org/bot<TOKEN>`; `openclaw doctor --fix` elimina un sufijo `/bot<TOKEN>` final accidental.
- `channels.telegram.defaultAccount` opcional anula la selección de cuenta predeterminada cuando coincide con un id de cuenta configurado.
- En configuraciones multicuenta (2 o más ids de cuenta), establezca un predeterminado explícito (`channels.telegram.defaultAccount` o `channels.telegram.accounts.default`) para evitar el enrutamiento de respaldo; `openclaw doctor` advierte cuando esto falta o no es válido.
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Telegram (migraciones de ID de supergrupo, `/config set|unset`).
- Las entradas de `bindings[]` de nivel superior con `type: "acp"` configuran enlaces ACP persistentes para temas del foro (use `chatId:topic:topicId` canónico en `match.peer.id`). La semántica de los campos se comparte en [Agentes ACP](/es/tools/acp-agents#persistent-channel-bindings).
- Las vistas previas de transmisiones de Telegram usan `sendMessage` + `editMessageText` (funciona en chats directos y grupales).
- Política de reintentos: consulte [Política de reintentos](/es/concepts/retry).

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
      suppressEmbeds: true,
      chunkMode: "length", // length | newline
      streaming: {
        mode: "progress", // off | partial | block | progress (Discord default: progress)
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
        },
      },
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
        spawnSessions: true,
        defaultSpawnContext: "fork",
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
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
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
- Las llamadas de salida directas que proporcionan un `token` de Discord explícito usan ese token para la llamada; la configuración de reintento/política de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
- Opcional `channels.discord.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una id de cuenta configurada.
- Use `user:<id>` (DM) o `channel:<id>` (canal de gremio) como objetivos de entrega; los IDs numéricos simples se rechazan.
- Los slugs de gremio están en minúsculas con los espacios reemplazados por `-`; las claves de canal usan el nombre en formato slug (sin `#`). Se prefieren los IDs de gremio.
- Los mensajes creados por bots se ignoran de forma predeterminada. `allowBots: true` los habilita; use `allowBots: "mentions"` para aceptar solo mensajes de bots que mencionan al bot (los propios mensajes aún se filtran).
- Los canales que admiten mensajes entrantes creados por bots pueden usar [protección compartida de bucles de bots](/es/channels/bot-loop-protection). Establezca `channels.defaults.botLoopProtection` para los presupuestos base de pares y luego anule el canal o la cuenta solo cuando una superficie necesite límites diferentes.
- `channels.discord.guilds.<id>.ignoreOtherMentions` (y las anulaciones de canal) descarta los mensajes que mencionan a otro usuario o rol pero no al bot (excluyendo @everyone/@here).
- `channels.discord.mentionAliases` asigna el texto de `@handle` saliente establecido a los IDs de usuario de Discord antes de enviar, por lo que los compañeros de equipo conocidos pueden mencionarse de manera determinista incluso cuando el caché de directorio transitorio está vacío. Las anulaciones por cuenta se encuentran en `channels.discord.accounts.<accountId>.mentionAliases`.
- `maxLinesPerMessage` (por defecto 17) divide los mensajes altos incluso cuando tienen menos de 2000 caracteres.
- `channels.discord.suppressEmbeds` por defecto es `true`, por lo que las URL salientes no se expanden en vistas previas de enlaces de Discord a menos que se deshabiliten. Las cargas útiles explícitas de `embeds` todavía se envían normalmente; las llamadas a herramientas por mensaje pueden anular esto con `suppressEmbeds`.
- `channels.discord.threadBindings` controla el enrutamiento vinculado a hilos de Discord:
  - `enabled`: Anulación de Discord para las características de sesión vinculadas a hilos (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y entrega/enrutamiento vinculado)
  - `idleHours`: Anulación de Discord para el autoenfoque por inactividad en horas (`0` lo deshabilita)
  - `maxAgeHours`: Anulación de Discord para la antigüedad máxima estricta en horas (`0` lo deshabilita)
  - `spawnSessions`: interruptor para la creación/enlace automático de hilos de `sessions_spawn({ thread: true })` y generación de hilos de ACP (predeterminado: `true`)
  - `defaultSpawnContext`: contexto nativo del subagente para generaciones vinculadas a hilos (`"fork"` de manera predeterminada)
- Las entradas `bindings[]` de nivel superior con `type: "acp"` configuran enlaces persistentes de ACP para canales e hilos (use el ID de canal/hilo en `match.peer.id`). La semántica de los campos se comparte en [ACP Agents](/es/tools/acp-agents#persistent-channel-bindings).
- `channels.discord.ui.components.accentColor` establece el color de acento para los contenedores de componentes de Discord v2.
- `channels.discord.voice` habilita las conversaciones en canales de voz de Discord y anulaciones opcionales de unión automática + LLM + TTS. Las configuraciones de Discord solo de texto dejan la voz desactivada de manera predeterminada; configure `channels.discord.voice.enabled=true` para optar por participar.
- `channels.discord.voice.model` anula opcionalmente el modelo LLM utilizado para las respuestas en canales de voz de Discord.
- `channels.discord.voice.daveEncryption` y `channels.discord.voice.decryptionFailureTolerance` se pasan a las opciones DAVE de `@discordjs/voice` (`true` y `24` de manera predeterminada).
- `channels.discord.voice.connectTimeoutMs` controla la espera inicial de `@discordjs/voice` Ready para `/vc join` y los intentos de unión automática (`30000` de manera predeterminada).
- `channels.discord.voice.reconnectGraceMs` controla cuánto tiempo puede tardar una sesión de voz desconectada en entrar en la señalización de reconexión antes de que OpenClaw la destruya (`15000` de manera predeterminada).
- La reproducción de voz de Discord no se interrumpe por el evento de inicio de habla de otro usuario. Para evitar bucles de retroalimentación, OpenClaw ignora la nueva captura de voz mientras se reproduce el TTS.
- Además, OpenClaw intenta la recuperación de la recepción de voz saliendo y volviendo a unir a una sesión de voz después de fallos de desencriptación repetidos.
- `channels.discord.streaming` es la clave canónica del modo de transmisión. Discord usa por defecto `streaming.mode: "progress"` para que el progreso de la herramienta/trabajo aparezca en un mensaje de vista previa editado; establezca `streaming.mode: "off"` para desactivarlo. Los valores heredados `streamMode` y los valores booleanos `streaming` siguen siendo alias de tiempo de ejecución; ejecute `openclaw doctor --fix` para reescribir la configuración persistente.
- `channels.discord.autoPresence` asigna la disponibilidad de tiempo de ejecución a la presencia del bot (saludable => en línea, degradado => inactivo, agotado => no molestar) y permite anulaciones opcionales del texto de estado.
- `channels.discord.dangerouslyAllowNameMatching` vuelve a habilitar la coincidencia de nombre/etiqueta mutable (modo de compatibilidad de emergencia).
- `channels.discord.execApprovals`: entrega de aprobación de ejecución nativa de Discord y autorización del aprobador.
  - `enabled`: `true`, `false`, o `"auto"` (predeterminado). En modo automático, las aprobaciones de ejecución se activan cuando los aprobadores se pueden resolver desde `approvers` o `commands.ownerAllowFrom`.
  - `approvers`: IDs de usuario de Discord permitidos para aprobar solicitudes de ejecución. Se recurre a `commands.ownerAllowFrom` cuando se omite.
  - `agentFilter`: lista de permitidos de ID de agente opcional. Omita para reenviar aprobaciones para todos los agentes.
  - `sessionFilter`: patrones de clave de sesión opcionales (subcadena o regex).
  - `target`: dónde enviar los avisos de aprobación. `"dm"` (predeterminado) envía a los MD de los aprobadores, `"channel"` envía al canal de origen, `"both"` envía a ambos. Cuando el destino incluye `"channel"`, los botones solo pueden ser utilizados por los aprobadores resueltos.
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

- Cuenta de servicio JSON: en línea (`serviceAccount`) o basada en archivos (`serviceAccountFile`).
- También se admite SecretRef de cuenta de servicio (`serviceAccountRef`).
- Alternativas de entorno: `GOOGLE_CHAT_SERVICE_ACCOUNT` o `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Use `spaces/<spaceId>` o `users/<userId>` para los destinos de entrega.
- `channels.googlechat.dangerouslyAllowNameMatching` reactiva la coincidencia de entidades principales de correo mutable (modo de compatibilidad de emergencia).

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      socketMode: {
        clientPingTimeout: 15000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
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
      unfurlLinks: false,
      unfurlMedia: false,
      textChunkLimit: 4000,
      chunkMode: "length",
      streaming: {
        mode: "partial", // off | partial | block | progress
        nativeTransport: true, // use Slack native streaming API when mode=partial
      },
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

- **Modo de socket** requiere tanto `botToken` como `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` para la alternativa de entorno de la cuenta predeterminada).
- **Modo HTTP** requiere `botToken` más `signingSecret` (en la raíz o por cuenta).
- `socketMode` pasa la sintonización del transporte de modo de socket del SDK de Slack a la API pública del receptor Bolt. Úselo solo cuando investigue tiempos de espera de ping/pong o comportamientos de websocket obsoletos. `clientPingTimeout` por defecto es `15000`; `serverPingTimeout` y `pingPongLoggingEnabled` se pasan solo cuando están configurados.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas de texto plano u objetos SecretRef.
- Las instantáneas de cuenta de Slack exponen campos de origen/estado por credencial, como `botTokenSource`, `botTokenStatus`, `appTokenStatus` y, en modo HTTP, `signingSecretStatus`. `configured_unavailable` significa que la cuenta está configurada a través de SecretRef, pero la ruta de comando/ejecución actual no pudo resolver el valor del secreto.
- `configWrites: false` bloquea las escrituras de configuración iniciadas por Slack.
- Opcional `channels.slack.defaultAccount` anula la selección de cuenta predeterminada cuando coincide con una ID de cuenta configurada.
- `channels.slack.streaming.mode` es la clave canónica del modo de flujo de Slack. `channels.slack.streaming.nativeTransport` controla el transporte de transmisión nativo de Slack. Los valores heredados `streamMode`, el booleano `streaming` y `nativeStreaming` siguen siendo alias en tiempo de ejecución; ejecute `openclaw doctor --fix` para reescribir la configuración persistente.
- `unfurlLinks` y `unfurlMedia` pasan los valores booleanos de expansión de enlaces y medios de `chat.postMessage` de Slack para las respuestas del bot. `unfurlLinks` por defecto es `false` para que los enlaces salientes del bot no se expandan en línea a menos que se habiliten; `unfurlMedia` se omite a menos que se configure. Establezca cualquiera de los valores en `channels.slack.accounts.<accountId>` para anular el valor de nivel superior para una cuenta.
- Use `user:<id>` (MD) o `channel:<id>` para los destinos de entrega.

**Modos de notificación de reacción:** `off`, `own` (por defecto), `all`, `allowlist` (de `reactionAllowlist`).

**Aislamiento de sesión de hilo:** `thread.historyScope` es por hilo (por defecto) o compartido en el canal. `thread.inheritParent` copia la transcripción del canal principal a nuevos hilos.

- La transmisión nativa de Slack más el estado de hilo de estilo "está escribiendo..." del asistente de Slack requieren un objetivo de hilo de respuesta. Los MDs de nivel superior se mantienen fuera del hilo por defecto, por lo que aún pueden transmitirse a través de vistas previas de borrador y edición de publicaciones de Slack en lugar de mostrar la vista previa de transmisión/estado nativa de estilo hilo.
- `typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras se ejecuta una respuesta, y luego la elimina al completarse. Use un código corto de emoji de Slack como `"hourglass_flowing_sand"`.
- `channels.slack.execApprovals`: entrega nativa de aprobación de ejecución y autorización del aprobador en Slack. Mismo esquema que Discord: `enabled` (`true`/`false`/`"auto"`), `approvers` (IDs de usuario de Slack), `agentFilter`, `sessionFilter`, y `target` (`"dm"`, `"channel"`, o `"both"`).

| Grupo de acción | Predeterminado | Notas                          |
| --------------- | -------------- | ------------------------------ |
| reacciones      | habilitado     | Reaccionar + listar reacciones |
| mensajes        | habilitado     | Leer/enviar/editar/eliminar    |
| fijados         | habilitado     | Fijar/Desfijar/Listar          |
| memberInfo      | habilitado     | Información de miembro         |
| emojiList       | habilitado     | Lista de emojis personalizados |

### Mattermost

Mattermost se distribuye como un complemento incluido en las versiones actuales de OpenClaw. Las compilaciones antiguas o personalizadas pueden instalar un paquete npm actual con `openclaw plugins install @openclaw/mattermost`. Consulte [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) para conocer las dist-tags actuales antes de fijar una versión.

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

Modos de chat: `oncall` (responder al mencionar con @, predeterminado), `onmessage` (cada mensaje), `onchar` (mensajes que comienzan con el prefijo de activación).

Cuando los comandos nativos de Mattermost están habilitados:

- `commands.callbackPath` debe ser una ruta (por ejemplo `/api/channels/mattermost/command`), no una URL completa.
- `commands.callbackUrl` debe resolverse al punto de conexión de la puerta de enlace de OpenClaw y ser accesible desde el servidor Mattermost.
- Las devoluciones de llamada nativas de barra se autentican con los tokens por comando devueltos por Mattermost durante el registro del comando de barra. Si el registro falla o no se activan comandos, OpenClaw rechaza las devoluciones de llamada con `Unauthorized: invalid command token.`
- Para hosts de devolución de llamada privados/tailnet/internos, Mattermost puede requerir que `ServiceSettings.AllowedUntrustedInternalConnections` incluya el host/dominio de devolución de llamada. Use valores de host/dominio, no URL completas.
- `channels.mattermost.configWrites`: permitir o denegar escrituras de configuración iniciadas por Mattermost.
- `channels.mattermost.requireMention`: requerir `@mention` antes de responder en los canales.
- `channels.mattermost.groups.<channelId>.requireMention`: invalidación de filtrado de menciones por canal (`"*"` para el valor predeterminado).
- Opcional `channels.mattermost.defaultAccount` invalida la selección de cuenta predeterminada cuando coincide con un ID de cuenta configurado.

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

- `channels.signal.account`: fija el inicio del canal a una identidad de cuenta de Signal específica.
- `channels.signal.configWrites`: permite o deniega escrituras de configuración iniciadas por Signal.
- Opcional `channels.signal.defaultAccount` invalida la selección de cuenta predeterminada cuando coincide con un ID de cuenta configurado.

### iMessage

OpenClaw genera `imsg rpc` (JSON-RPC sobre stdio). No requiere demonio ni puerto. Esta es la ruta preferida para nuevas configuraciones de iMessage de OpenClaw cuando el host puede otorgar permisos de base de datos de Messages y Automatización.

Se eliminó el soporte para BlueBubbles. `channels.bluebubbles` no es una superficie de configuración de tiempo de ejecución compatible en OpenClaw actual. Migre las configuraciones antiguas a `channels.imessage`; use [Eliminación de BlueBubbles y la ruta iMessage imsg](/es/announcements/bluebubbles-imessage) para la versión corta y [Viniendo de BlueBubbles](/es/channels/imessage-from-bluebubbles) para la tabla de traducción completa.

Si Gateway no se está ejecutando en el Mac de Messages con la sesión iniciada, mantenga `channels.imessage.enabled=true` y configure `channels.imessage.cliPath` en un contenedor SSH que ejecute `imsg "$@"` en ese Mac. La ruta local `imsg` predeterminada es solo para macOS.

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
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
      },
      catchup: {
        enabled: false,
      },
    },
  },
}
```

- Opcional `channels.imessage.defaultAccount` invalida la selección de cuenta predeterminada cuando coincide con un ID de cuenta configurado.

- Requiere acceso completo al disco a la base de datos de Messages.
- Prefiera los objetivos `chat_id:<id>`. Use `imsg chats --limit 20` para listar los chats.
- `cliPath` puede apuntar a un contenedor SSH; configure `remoteHost` (`host` o `user@host`) para la obtención de archivos adjuntos por SCP.
- `attachmentRoots` y `remoteAttachmentRoots` restringen las rutas de datos adjuntos entrantes (predeterminado: `/Users/*/Library/Messages/Attachments`).
- SCP utiliza una verificación estricta de la clave de host, por lo que debe asegurarse de que la clave de host del relay ya exista en `~/.ssh/known_hosts`.
- `channels.imessage.configWrites`: permite o deniega escrituras de configuración iniciadas por iMessage.
- `channels.imessage.actions.*`: habilita acciones de API privada que también están controladas por `imsg status` / `openclaw channels status --probe`.
- `channels.imessage.includeAttachments` está desactivado de forma predeterminada; establézcalo en `true` antes de esperar medios entrantes en los turnos del agente.
- `channels.imessage.catchup.enabled`: opta por reproducir los mensajes entrantes que llegaron mientras el Gateway estaba inactivo.
- `channels.imessage.groups`: registro de grupos y configuraciones por grupo. Con `groupPolicy: "allowlist"`, configure claves `chat_id` explícitas o una entrada con comodín `"*"` para que los mensajes de grupo puedan pasar la puerta del registro.
- Las entradas `bindings[]` de nivel superior con `type: "acp"` pueden vincular conversaciones de iMessage a sesiones ACP persistentes. Utilice un identificador normalizado o un objetivo de chat explícito (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) en `match.peer.id`. Semántica de campo compartida: [ACP Agents](/es/tools/acp-agents#persistent-channel-bindings).

<Accordion title="Ejemplo de contenedor SSH de iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix está respaldado por un complemento y se configura en `channels.matrix`.

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

- La autenticación por token utiliza `accessToken`; la autenticación por contraseña utiliza `userId` + `password`.
- `channels.matrix.proxy` enruta el tráfico HTTP de Matrix a través de un proxy HTTP(S) explícito. Las cuentas con nombre pueden anularlo con `channels.matrix.accounts.<id>.proxy`.
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` permite servidores domésticos privados/internos. `proxy` y esta opción de participación de red son controles independientes.
- `channels.matrix.defaultAccount` selecciona la cuenta preferida en configuraciones de múltiples cuentas.
- `channels.matrix.autoJoin` por defecto es `off`, por lo que se ignoran las salas invitadas y las invitaciones nuevas de estilo DM hasta que establezca `autoJoin: "allowlist"` con `autoJoinAllowlist` o `autoJoin: "always"`.
- `channels.matrix.execApprovals`: entrega nativa de aprobación de ejecución en Matrix y autorización de aprobadores.
  - `enabled`: `true`, `false` o `"auto"` (predeterminado). En modo automático, las aprobaciones de ejecución se activan cuando se pueden resolver los aprobadores desde `approvers` o `commands.ownerAllowFrom`.
  - `approvers`: ID de usuario de Matrix (p. ej., `@owner:example.org`) permitidos para aprobar solicitudes de ejecución.
  - `agentFilter`\_\_: lista blanca opcional de ID de agente. Omita para reenviar aprobaciones para todos los agentes.
  - `sessionFilter`\_\_: patrones de clave de sesión opcionales (subcadena o regex).
  - `target`\_\_: dónde enviar avisos de aprobación. `"dm"` (predeterminado), `"channel"` (sala de origen) o `"both"`.
  - Invalidaciones por cuenta: `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope` controla cómo se agrupan los MD de Matrix en sesiones: `per-user` (predeterminado) comparte por par enrutado, mientras que `per-room` aísla cada sala de MD.
- Las sondas de estado de Matrix y las búsquedas en vivo en el directorio utilizan la misma política de proxy que el tráfico de tiempo de ejecución.
- La configuración completa de Matrix, las reglas de orientación y los ejemplos de configuración están documentados en [Matrix](/es/channels/matrix).

### Microsoft Teams

Microsoft Teams está respaldado por complementos y se configura en `channels.msteams`.

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

- Rutas de clave principal cubiertas aquí: `channels.msteams`, `channels.msteams.configWrites`.
- La configuración completa de Teams (credenciales, webhook, política de MD/grupo, invalidaciones por equipo/canal) está documentada en [Microsoft Teams](/es/channels/msteams).

### IRC

IRC está respaldado por complementos y se configura en `channels.irc`.

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
- `channels.irc.defaultAccount` opcional anula la selección de cuenta predeterminada cuando coincide con una identificación de cuenta configurada.
- La configuración completa del canal IRC (host/puerto/TLS/canales/listas de permitidos/filtrado de menciones) está documentada en [IRC](/es/channels/irc).

### Multicuenta (todos los canales)

Ejecutar múltiples cuentas por canal (cada una con su propio `accountId`):

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
- La configuración base del canal se aplica a todas las cuentas a menos que se anule por cuenta.
- Use `bindings[].match.accountId` para enrutar cada cuenta a un agente diferente.
- Si agrega una cuenta no predeterminada a través de `openclaw channels add` (o incorporación de canales) mientras todavía está en una configuración de canal de nivel superior de cuenta única, OpenClaw promueve primero los valores de nivel superior de cuenta única con ámbito de cuenta al mapa de cuentas del canal para que la cuenta original siga funcionando. La mayoría de los canales los mueven a `channels.<channel>.accounts.default`; Matrix puede conservar en su lugar un objetivo con nombre/predeterminado coincidente existente.
- Los enlaces existentes solo de canal (sin `accountId`) siguen coincidiendo con la cuenta predeterminada; los enlaces con ámbito de cuenta permanecen opcionales.
- `openclaw doctor --fix` también repara formas mixtas moviendo los valores de nivel superior de cuenta única con ámbito de cuenta a la cuenta promovida elegida para ese canal. La mayoría de los canales usan `accounts.default`; Matrix puede conservar en su lugar un objetivo con nombre/predeterminado coincidente existente.

### Otros canales de complementos

Muchos canales de complementos se configuran como `channels.<id>` y están documentados en sus páginas de canal dedicadas (por ejemplo, Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat y Twitch).
Vea el índice completo de canales: [Channels](/es/channels).

### Filtrado de menciones en chat grupal

Los mensajes grupales de forma predeterminada **requieren mención** (mención de metadatos o patrones de expresiones regulares seguros). Se aplica a chats grupales de WhatsApp, Telegram, Discord, Google Chat e iMessage.

Las respuestas visibles se controlan por separado. Las salas de grupos/canales por defecto son `messages.groupChat.visibleReplies: "message_tool"`: OpenClaw aún procesa el turno y le pide al agente que use `message(action=send)` para la salida visible de la sala. Si el modelo devuelve texto final sin llamar a la herramienta de mensaje, ese texto final permanece privado y el registro detallado (verbose) del gateway registra los metadatos de la carga útil suprimida. Establezca `"automatic"` cuando desee que todas las respuestas visibles de grupo usen la ruta de respuesta final heredada. Para aplicar el mismo comportamiento de respuesta visible solo con herramientas a los chats directos también, establezca `messages.visibleReplies: "message_tool"`; el arnés Codex también usa ese comportamiento solo con herramientas como su predeterminado de chat directo sin establecer.

Las respuestas visibles solo con herramientas requieren un modelo/tiempo de ejecución que llame a las herramientas de manera confiable. Si el registro de la sesión muestra texto del asistente con `didSendViaMessagingTool: false`, el modelo produjo texto final privado en lugar de llamar a la herramienta de mensaje. Cambie a un modelo de llamada de herramientas más fuerte para ese canal, inspeccione el registro detallado del gateway para ver el resumen de la carga útil suprimida, o establezca `messages.groupChat.visibleReplies: "automatic"` para usar respuestas finales visibles heredadas para cada solicitud de grupo/canal.

Si la herramienta de mensaje no está disponible bajo la política de herramientas activa, OpenClaw recurre a respuestas visibles automáticas en lugar de suprimir silenciosamente la respuesta. `openclaw doctor` advierte sobre esta discordancia.

El gateway recarga en caliente (hot-reloads) la configuración `messages` después de guardar el archivo. Reinicie solo cuando la observación de archivos o la recarga de configuración esté deshabilitada en el despliegue.

**Tipos de mención:**

- **Menciones de metadatos**: Menciones nativas de @ de la plataforma. Se ignoran en el modo de chat propio de WhatsApp.
- **Patrones de texto**: Patrones de expresiones regulares (regex) seguros en `agents.list[].groupChat.mentionPatterns`. Se ignoran los patrones no válidos y las repeticiones anidadas inseguras.
- El filtrado de menciones se aplica solo cuando es posible la detección (menciones nativas o al menos un patrón).

```json5
{
  messages: {
    visibleReplies: "automatic", // global default for direct/source chats; Codex harness defaults unset direct chats to message_tool
    groupChat: {
      historyLimit: 50,
      unmentionedInbound: "room_event", // always-on unmentioned room chatter becomes quiet context
      visibleReplies: "message_tool", // default; use "automatic" for legacy final replies
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` establece el valor predeterminado global. Los canales pueden anularlo con `channels.<channel>.historyLimit` (o por cuenta). Establezca `0` para deshabilitar.

`messages.groupChat.unmentionedInbound: "room_event"` envía mensajes de grupo/canal siempre activos sin mención como contexto de sala silencioso en los canales compatibles. Los mensajes mencionados, los comandos y los mensajes directos siguen siendo solicitudes de usuario. Consulte [Ambient room events](/es/channels/ambient-room-events) para ver ejemplos completos de Discord, Slack y Telegram.

`messages.visibleReplies` es el valor predeterminado global de eventos de origen; `messages.groupChat.visibleReplies` lo anula para eventos de origen de grupo/canal. Cuando `messages.visibleReplies` no está establecido, un arnés puede proporcionar su propio valor predeterminado directo/de origen; el arnés Codex usa `message_tool` de forma predeterminada. Las listas de permitidos del canal y el filtrado por mención aún deciden si se procesa un evento.

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

Resolución: anulación por MD → valor predeterminado del proveedor → sin límite (se retienen todos).

Compatible con: `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Modo de autocomunicación

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
    nativeSkills: "auto", // register native skill commands when supported
    text: true, // parse /commands in chat messages
    bash: false, // allow ! (alias: /bash)
    bashForegroundMs: 2000,
    config: false, // allow /config
    mcp: false, // allow /mcp
    plugins: false, // allow /plugins
    debug: false, // allow /debug
    restart: true, // allow /restart + gateway restart tool
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw", // raw | hash
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="Detalles del comando">

- Este bloque configura las superficies de comandos. Para el catálogo de comandos integrados + incluidos actual, consulte [Comandos de barra](/es/tools/slash-commands).
- Esta página es una **referencia de claves de configuración**, no el catálogo completo de comandos. Los comandos propiedad del canal/complemento, como QQ Bot `/bot-ping` `/bot-help` `/bot-logs`, LINE `/card`, emparejamiento de dispositivos `/pair`, memoria `/dreaming`, control telefónico `/phone` y Talk `/voice` están documentados en sus páginas de canal/complemento además de en [Comandos de barra](/es/tools/slash-commands).
- Los comandos de texto deben ser mensajes **independientes** con un `/` inicial.
- `native: "auto"` activa los comandos nativos para Discord/Telegram, los deja desactivados para Slack.
- `nativeSkills: "auto"` activa los comandos nativos de habilidades para Discord/Telegram, los deja desactivados para Slack.
- Anular por canal: `channels.discord.commands.native` (bool o `"auto"`). Para Discord, `false` omite el registro y la limpieza de comandos nativos durante el inicio.
- Anule el registro de habilidades nativas por canal con `channels.<provider>.commands.nativeSkills`.
- `channels.telegram.customCommands` añade entradas de menú adicionales para el bot de Telegram.
- `bash: true` habilita `! <cmd>` para el shell del host. Requiere `tools.elevated.enabled` y remitente en `tools.elevated.allowFrom.<channel>`.
- `config: true` habilita `/config` (lee/escribe `openclaw.json`). Para los clientes `chat.send` del gateway, las escrituras persistentes de `/config set|unset` también requieren `operator.admin`; `/config show` de solo lectura permanece disponible para los clientes operadores normales con ámbito de escritura.
- `mcp: true` habilita `/mcp` para la configuración del servidor MCP administrada por OpenClaw bajo `mcp.servers`.
- `plugins: true` habilita `/plugins` para el descubrimiento, instalación y controles de habilitación/deshabilitación de complementos.
- `channels.<provider>.configWrites` limita las mutaciones de configuración por canal (predeterminado: true).
- Para canales multicuenta, `channels.<provider>.accounts.<id>.configWrites` también limita las escrituras dirigidas a esa cuenta (por ejemplo `/allowlist --config --account <id>` o `/config set channels.<provider>.accounts.<id>...`).
- `restart: false` deshabilita `/restart` y las acciones de herramientas de reinicio del gateway. Predeterminado: `true`.
- `ownerAllowFrom` es la lista de permitidos explícita del propietario para comandos/herramientas exclusivas del propietario. Es independiente de `allowFrom`.
- `ownerDisplay: "hash"` aplica hash a los identificadores de propietario en el prompt del sistema. Establezca `ownerDisplaySecret` para controlar el hash.
- `allowFrom` es por proveedor. Cuando se establece, es la **única** fuente de autorización (las listas de permitidas/emparejamiento del canal y `useAccessGroups` se ignoran).
- `useAccessGroups: false` permite que los comandos omitan las políticas de grupo de acceso cuando `allowFrom` no está establecido.
- Mapa de documentación de comandos:
  - catálogo integrado + incluido: [Comandos de barra](/es/tools/slash-commands)
  - superficies de comandos específicas del canal: [Canales](/es/channels)
  - comandos QQ Bot: [QQ Bot](/es/channels/qqbot)
  - comandos de emparejamiento: [Emparejamiento](/es/channels/pairing)
  - comando de tarjeta LINE: [LINE](/es/channels/line)
  - soñar con la memoria: [Soñar](/es/concepts/dreaming)

</Accordion>

---

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference) — claves de nivel superior
- [Configuración — agentes](/es/gateway/config-agents)
- [Descripción general de canales](/es/channels)
