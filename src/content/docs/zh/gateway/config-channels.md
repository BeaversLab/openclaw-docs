---
summary: "SlackDiscordTelegramWhatsAppMatrixiMessage渠道配置：访问控制、配对以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等渠道的特定密钥"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "配置 — 渠道"
---

`channels.*`SlackDiscordTelegramWhatsAppMatrixiMessage 下的按渠道配置密钥。涵盖私信和群组访问、多账户设置、提及控制，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他捆绑渠道插件的按渠道密钥。

有关代理、工具、网关运行时和其他顶级键的信息，请参阅
[配置参考](/zh/gateway/configuration-reference)。

## 渠道

当其配置部分存在时，每个渠道都会自动启动（除非 `enabled: false`）。

### 私信和群组访问

所有渠道都支持私信策略和群组策略：

| 私信策略          | 行为                                              |
| ----------------- | ------------------------------------------------- |
| `pairing`（默认） | 未知发送者会获得一次性配对代码；所有者必须批准    |
| `allowlist`       | 仅限 `allowFrom` 中的发件人（或已配对的允许存储） |
| `open`            | 允许所有入站私信（需要 `allowFrom: ["*"]`）       |
| `disabled`        | 忽略所有传入私信                                  |

| 群组策略            | 行为                                     |
| ------------------- | ---------------------------------------- |
| `allowlist`（默认） | 仅匹配配置的允许列表的群组               |
| `open`              | 绕过群组允许列表（提及 gating 仍然适用） |
| `disabled`          | 阻止所有群组/房间消息                    |

<Note>
当提供商的 `groupPolicy` 未设置时，`channels.defaults.groupPolicy` 设置默认值。
配对码在 1 小时后过期。待处理的私信配对请求上限为 **每个渠道 3 个**。
如果提供商块完全缺失（`channels.<provider>` 不存在），运行时群组策略将回退到 `allowlist`（故障关闭/失败关闭）并显示启动警告。
</Note>

### 渠道模型覆盖

使用 `channels.modelByChannel` 将特定渠道 ID 固定到模型。值接受 `provider/model` 或已配置的模型别名。当会话尚未具有模型覆盖（例如，通过 `/model` 设置）时，渠道映射生效。

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-5.5",
      },
      telegram: {
        "-1001234567890": "openai/gpt-5.4-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### 渠道默认设置和心跳

使用 `channels.defaults` 来在提供商之间共享组策略和心跳行为：

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

- `channels.defaults.groupPolicy`：当未设置提供商级别的 `groupPolicy` 时的回退组策略。
- `channels.defaults.contextVisibility`：所有渠道的默认补充上下文可见性模式。值：`all`（默认，包含所有引用/线程/历史上下文），`allowlist`（仅包含来自白名单发送者的上下文），`allowlist_quote`（与白名单相同，但保留显式引用/回复上下文）。每渠道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳输出中包含正常的渠道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：渲染紧凑的指示器风格的心跳输出。

### WhatsApp

WhatsApp 通过网关的 web 渠道（Baileys Web）运行。当存在关联的会话时，它会自动启动。

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

<Accordion title="多账户 WhatsApp">

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

- 如果存在，出站命令默认使用账户 `default`；否则使用第一个配置的账户 id（已排序）。
- 可选的 `channels.whatsapp.defaultAccount` 会在其匹配某个已配置的账户 id 时覆盖该回退默认账户选择。
- 旧版单账户 Baileys 认证目录会被 `openclaw doctor` 迁移到 `whatsapp/default` 中。
- 每账户覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot token：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接），默认账户的回退值为 `TELEGRAM_BOT_TOKEN`。
- `apiRoot` 仅为 Telegram Bot API 根目录。请使用 `https://api.telegram.org` 或您自托管/代理的根目录，而不是 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 会移除意外的尾随 `/bot<TOKEN>` 后缀。
- 可选的 `channels.telegram.defaultAccount` 会在匹配到已配置的账号 ID 时覆盖默认的账号选择。
- 在多账号设置（2个或更多账号 ID）中，请设置显式的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；如果缺失或无效，`openclaw doctor` 将发出警告。
- `configWrites: false` 会阻止 Telegram 发起的配置写入（超级群组 ID 迁移，`/config set|unset`）。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目为论坛主题配置持久的 ACP 绑定（在 `match.peer.id` 中使用规范的 `chatId:topic:topicId`）。字段语义在 [ACP Agents](/zh/tools/acp-agents#persistent-channel-bindings) 中共享。
- Telegram 流预览使用 `sendMessage` + `editMessageText`（适用于直接聊天和群组聊天）。
- 重试策略：参见 [重试策略](/zh/concepts/retry)。

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

- 令牌：`channels.discord.token`，并将 `DISCORD_BOT_TOKEN` 作为默认账号的备用。
- 提供显式 Discord `token` 的直接出站调用将使用该令牌进行调用；账号重试/策略设置仍来自活动运行时快照中选定的账号。
- 可选的 `channels.discord.defaultAccount` 会在匹配到已配置的账号 ID 时覆盖默认的账号选择。
- 请使用 `user:<id>` (私信) 或 `channel:<id>` (服务器频道) 作为投递目标；不接受纯数字 ID。
- 服务器 别名均为小写，空格替换为 `-`；频道键使用别名化名称（不含 `#`）。建议优先使用服务器 ID。
- 默认情况下会忽略由机器人撰写的消息。`allowBots: true` 可启用它们；使用 `allowBots: "mentions"` 则仅接受提及该机器人的机器人消息（自身的消息仍会被过滤）。
- 支持机器人发送入站消息的渠道可以使用共享的 [机器人循环保护](/zh/channels/bot-loop-protection)。设置 `channels.defaults.botLoopProtection` 作为基准配对预算，然后仅在某个界面需要不同的限制时覆盖该渠道或账户的设置。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及渠道覆盖）会丢弃提及另一个用户或角色但未提及机器人的消息（不包括 @everyone/@here）。
- `channels.discord.mentionAliases` 在发送之前将稳定的出站 `@handle`Discord 文本映射到 Discord 用户 ID，因此即使瞬态目录缓存为空，也可以确定性地提及已知的队友。按账户覆盖位于 `channels.discord.accounts.<accountId>.mentionAliases` 下。
- `maxLinesPerMessage`（默认为 17）会拆分长消息，即使字符数低于 2000。
- `channels.discord.suppressEmbeds` 默认为 `true`Discord，因此出站 URL 不会展开为 Discord 链接预览，除非被禁用。显式 `embeds` 负载仍正常发送；每条消息的工具调用可以使用 `suppressEmbeds` 进行覆盖。
- `channels.discord.threadBindings`Discord 控制 Discord 线程绑定路由：
  - `enabled`Discord：线程绑定会话功能的 Discord 覆盖（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定传递/路由）
  - `idleHours`Discord：非活动自动取消聚焦的 Discord 覆盖，以小时为单位（`0` 表示禁用）
  - `maxAgeHours`Discord: Discord 硬性最长时限（小时）覆盖设置（`0` 表示禁用）
  - `spawnSessions`: `sessions_spawn({ thread: true })` 和 ACP 线程生成自动线程创建/绑定的开关（默认：`true`）
  - `defaultSpawnContext`: 线程绑定生成的原生子代理上下文（默认为 `"fork"`）
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目为频道和话题配置持久的 ACP 绑定（在 `match.peer.id` 中使用频道/话题 id）。字段语义在 [ACP Agents](/zh/tools/acp-agents#persistent-channel-bindings) 中共享。
- `channels.discord.ui.components.accentColor`Discord 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调的注册保持多久。默认值为 `1800000`（30 分钟），最大值为 `86400000`（24 小时），每个账户的覆盖设置位于 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 之下。较长的值可以使旧按钮/选择/表单可用更长时间，因此请首选适合工作流的最短 TTL。
- `channels.discord.voice` 启用 Discord 语音频道对话以及可选的自动加入、LLM 和 TTS 覆盖。仅文本的 Discord 配置默认关闭语音；设置 `channels.discord.voice.enabled=true` 以选择加入。
- `channels.discord.voice.model` 可选地覆盖用于 LLM 语音频道响应的 Discord 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` DAVE 选项（默认为 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 的初始 `@discordjs/voice` Ready 等待和自动加入尝试（默认为 `30000`）。
- `channels.discord.voice.reconnectGraceMs`OpenClaw 控制断开连接的语音会话在 OpenClaw 将其销毁之前进入重新连接信令所需的时间（默认为 `15000`）。
- Discord 语音播放不会被另一个用户的 speaking-start 事件中断。为避免反馈回路，OpenClaw 在 TTS 播放时会忽略新的语音采集。
- OpenClaw 还会在重复解密失败后，通过离开/重新加入语音会话来尝试语音接收恢复。
- `channels.discord.streaming`Discord 是规范的流模式键。Discord 默认为 `streaming.mode: "progress"`，以便工具/工作进度显示在一条编辑过的预览消息中；设置 `streaming.mode: "off"` 可禁用此功能。传统的 `streamMode` 和布尔 `streaming` 值仍作为运行时别名存在；运行 `openclaw doctor --fix` 可重写持久化配置。
- `channels.discord.autoPresence` 将运行时可用性映射到机器人状态（healthy => online, degraded => idle, exhausted => dnd），并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变的名称/标签匹配（break-glass 兼容模式）。
- `channels.discord.execApprovals`Discord：Discord 原生 exec 审批传递和审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批者时，exec 审批会被激活。
  - `approvers`Discord：被允许批准 exec 请求的 Discord 用户 ID。如果省略，则回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的代理 ID 允许列表。省略此项以转发所有代理的审批。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：发送审批提示的位置。`"dm"`（默认）发送给审批者私信，`"channel"` 发送到原始渠道，`"both"` 同时发送到两者。当目标包含 `"channel"` 时，按钮仅可供已确定的审批者使用。
  - `cleanupAfterResolve`：当 `true` 时，在审批、拒绝或超时后删除审批私信。

**反应通知模式：** `off`（无），`own`（机器人的消息，默认），`all`（所有消息），`allowlist`（仅针对所有消息中 `guilds.<id>.users` 的反应）。

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

- 服务账号 JSON：内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 也支持服务账号 SecretRef（`serviceAccountRef`）。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作为投递目标。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变的电子邮件主体匹配（紧急情况兼容模式）。

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

- **Socket 模式**需要同时提供 `botToken` 和 `appToken`（默认账号环境变量回退使用 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（在根级别或每个账号级别）。
- `socketMode`SlackBoltAPI 将 Slack SDK Socket 模式传输调优参数传递给公共 Bolt 接收器 API。仅在调查 ping/pong 超时或过时的 websocket 行为时使用它。`clientPingTimeout` 默认为 `15000`；`serverPingTimeout` 和 `pingPongLoggingEnabled` 仅在配置时传递。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文
  字符串或 SecretRef 对象。
- Slack 账户快照会公开每个凭据的源/状态字段，例如
  Slack`botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的
  `signingSecretStatus`。`configured_unavailable` 表示该账户
  通过 SecretRef 配置，但当前命令/运行时路径无法
  解析密钥值。
- `configWrites: false`Slack 会阻止 Slack 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在匹配到已配置的账户 ID 时覆盖默认账户选择。
- `channels.slack.streaming.mode`Slack 是 Slack 规范的流模式键。`channels.slack.streaming.nativeTransport`Slack 控制 Slack 的原生流传输。传统的 `streamMode`、布尔值 `streaming` 和 `nativeStreaming` 值仍作为运行时别名保留；运行 `openclaw doctor --fix` 以重写持久化配置。
- `unfurlLinks` 和 `unfurlMedia`Slack 会将 Slack 的 `chat.postMessage` 链接和媒体预览布尔值传递给机器人回复。`unfurlLinks` 默认为 `false`，因此除非启用，否则出站机器人链接不会内联展开；`unfurlMedia` 除非已配置，否则会被省略。在 `channels.slack.accounts.<accountId>` 中设置任一值，以覆盖单个账户的顶级值。
- 使用 `user:<id>` (私信) 或 `channel:<id>` 作为投递目标。

**表情符号通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 是按线程隔离（默认）或在渠道间共享。`thread.inheritParent` 会将父渠道的记录复制到新线程中。

- Slack 原生流式传输以及 Slack 助手风格的“正在输入...”线程状态需要一个回复线程目标。顶层的 Slack 默认情况下不在线程中，因此它们仍然可以通过 Slack 草稿发布和编辑预览进行流式传输，而不是显示线程风格的原生流式传输/状态预览。
- `typingReaction` 在运行回复时向传入的 Slack 消息添加一个临时表情符号，并在完成后将其移除。使用一个 Slack 表情符号代码，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`： Slack 原生审批客户端交付和执行审批人授权。架构与 Discord 相同： `enabled` (`true`/`false`/`"auto"`)， `approvers` (Slack 用户 ID)， `agentFilter`， `sessionFilter`，以及 `target` (`"dm"`， `"channel"`，或 `"both"`)。当 Slack 插件审批人解决时，插件审批可以将此原生客户端路径用于来自 Slack 的请求；还可以通过 `approvals.plugin` 为来自 Slack 的会话或 Slack 目标启用 Slack 原生插件审批交付。插件审批使用 Slack 插件审批人（来自 `allowFrom`）和默认路由，而不是执行审批人。

| 操作组     | 默认    | 说明                |
| ---------- | ------- | ------------------- |
| reactions  | enabled | React + 列出反应    |
| messages   | enabled | 读取/发送/编辑/删除 |
| pins       | enabled | 固定/取消固定/列表  |
| memberInfo | enabled | 成员信息            |
| emojiList  | enabled | 自定义表情符号列表  |

### Mattermost

在当前的 Mattermost 版本中，OpenClaw 作为内置插件随附。较旧或自定义构建版本可以使用
`openclaw plugins install @openclaw/mattermost` 安装当前的 npm 包。在固定版本之前，请检查
[npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost)
以获取当前的分发标签。

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

聊天模式：`oncall`（在 @ 提及时响应，默认），`onmessage`（每条消息），`onchar`（以触发前缀开头的消息）。

当启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl`OpenClawMattermost 必须解析为 OpenClaw 网关端点，并且可以从 Mattermost 服务器访问。
- 原生斜杠回调使用 Mattermost 在斜杠命令注册期间返回的每个命令令牌进行身份验证。如果注册失败或没有激活命令，OpenClaw 将拒绝回调并返回 MattermostOpenClaw`Unauthorized: invalid command token.`
- 对于私有/tailnet/内部回调主机，Mattermost 可能需要 Mattermost`ServiceSettings.AllowedUntrustedInternalConnections` 来包含回调主机/域名。使用主机/域名值，而不是完整的 URL。
- `channels.mattermost.configWrites`Mattermost：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在渠道中回复之前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每个渠道的提及覆盖（默认为 `"*"`）。
- 可选的 `channels.mattermost.defaultAccount` 在匹配配置的帐户 ID 时覆盖默认帐户选择。

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

**反应通知模式：** `off`，`own`（默认），`all`，`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`Signal：将渠道启动固定到特定的 Signal 帐户身份。
- `channels.signal.configWrites`：允许或拒绝由 Signal 发起的配置写入。
- 当与已配置的账户 ID 匹配时，可选的 `channels.signal.defaultAccount` 会覆盖默认账户选择。

### iMessage

OpenClaw 会生成 `imsg rpc`（基于 stdio 的 JSON-RPC）。不需要守护进程或端口。当主机可以授予 Messages 数据库和自动化权限时，这是新的 OpenClaw iMessage 设置的首选方式。

BlueBubbles 支持已被移除。在当前的 OpenClaw 中，`channels.bluebubbles` 不是受支持的运行时配置界面。请将旧配置迁移到 `channels.imessage`；有关简短版本，请使用 [BlueBubbles 移除和 imsg iMessage 路径](/zh/announcements/bluebubbles-imessage)，有关完整的转换表，请参阅 [从 BlueBubbles 迁移](/zh/channels/imessage-from-bluebubbles)。

如果 Gateway(网关) 没有在已登录 Messages 的 Mac 上运行，请保留 `channels.imessage.enabled=true` 并将 `channels.imessage.cliPath` 设置为在该 Mac 上运行 `imsg "$@"` 的 SSH 封装程序。默认的本地 `imsg` 路径仅限 macOS 使用。

在生产环境中依赖 SSH 包装器发送之前，请验证通过该包装器的出站 `imsg send`macOS。某些 macOS TCC 状态会将“消息自动化”分配给 `/usr/libexec/sshd-keygen-wrapper`，这可能导致读取和探测正常工作，但发送因 AppleEvents `-1743` 而失败；请参阅 [SSH wrapper sends fail with AppleEvents -1743](/zh/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743)。

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

- 可选的 `channels.imessage.defaultAccount` 会在匹配到已配置的账户 ID 时覆盖默认的账户选择。

- 需要对消息 数据库拥有完全磁盘访问权限。
- 首选 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；为获取 SCP 附件，需设置 `remoteHost`（`host` 或 `user@host`）。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密检查，因此请确保中继主机密已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝 iMessage 发起的配置写入。
- `channels.imessage.actions.*`：启用同样受 `imsg status` / `openclaw channels status --probe` 限制的私有 API 操作。
- `channels.imessage.includeAttachments` 默认处于关闭状态；在期望代理轮次中有入站媒体之前，请将其设置为 `true`。
- `channels.imessage.catchup.enabled`：选择重放在 Gateway(网关) 关机期间到达的入站消息。
- `channels.imessage.groups`：群组注册表和每个群组的设置。使用 `groupPolicy: "allowlist"` 时，请配置显式的 `chat_id` 键或 `"*"` 通配符条目，以便群组消息能够通过注册表关卡。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 iMessage 会话绑定到持久的 ACP 会话。在 `match.peer.id` 中使用规范化的句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/zh/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由插件支持，配置在 `channels.matrix` 下。

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

- 令牌认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 将 Matrix HTTP 流量通过显式 HTTP(S) 代理进行路由。命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许使用私有/内部主服务器。`proxy` 和此网络选择是独立的控制项。
- `channels.matrix.defaultAccount` 在多账户设置中选择首选账户。
- `channels.matrix.autoJoin` 默认为 `off`，因此受邀房间和新的 风格邀请将被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 设置 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`： Matrix 原生执行审批传递和审批人授权。
  - `enabled`： `true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批人时，执行审批将激活。
  - `approvers`： 被允许批准执行请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`： 可选的代理 ID 允许列表。省略以转发所有代理的审批。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：发送批准提示的位置。`"dm"`（默认）、`"channel"`（源房间）或 `"both"`。
  - 每个账号的覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope`Matrix 控制私信如何归组为会话：`per-user`（默认）按路由对等方共享，而 `per-room` 隔离每个私信房间。
- Matrix 状态探测和实时目录查找使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、定位规则和设置示例记录在 [Matrix](MatrixMatrix/en/channels/matrix) 中。

### Microsoft Teams

Microsoft Teams 由插件支持，并在 Microsoft Teams`channels.msteams` 下进行配置。

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

- 此处涵盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭据、Webhook、私信/组策略、每个团队/每个渠道的覆盖）记录在 [Microsoft Teams](Microsoft Teams/en/channels/msteams) 中。

### IRC

IRC 由插件支持，并在 `channels.irc` 下进行配置。

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

- 此处涵盖的核心键路径：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 当 `channels.irc.defaultAccount` 匹配已配置的账号 ID 时，可选的 `channels.irc.defaultAccount` 会覆盖默认账号选择。
- 完整的 IRC 渠道配置（主机/端口/TLS/渠道/允许列表/提及控制）记录在 [IRC](/zh/channels/irc) 中。

### 多账号（所有渠道）

为每个渠道运行多个账号（每个都有自己的 `accountId`）：

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

- 当省略 `accountId`CLI 时（CLI + 路由），使用 `default`。
- 环境令牌仅适用于 **默认** 账号。
- 基本渠道设置适用于所有账号，除非按账号覆盖。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果您在单账户顶级渠道配置中通过 `openclaw channels add`OpenClaw（或渠道新手引导）添加非默认账户，OpenClaw 会首先将账户范围的顶级单账户值提升到渠道账户映射中，以便原始账户继续工作。大多数渠道会将它们移动到 `channels.<channel>.accounts.default`Matrix 中；Matrix 可以改为保留现有的匹配命名/默认目标。
- 现有的仅渠道绑定（没有 `accountId`）将继续匹配默认账户；账户范围的绑定仍然是可选的。
- `openclaw doctor --fix` 还会通过将账户范围的顶级单账户值移动到为该渠道选择的提升账户中来修复混合形状。大多数渠道使用 `accounts.default`Matrix；Matrix 可以改为保留现有的匹配命名/默认目标。

### 其他插件渠道

许多插件渠道配置为 `channels.<id>`MatrixNostrZaloNextcloudTwitch，并在其专门的渠道页面中进行了记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的渠道索引：[Channels](/zh/channels)。

### 群组提及拦截

群组消息默认为**需要提及**（元数据提及或安全的正则表达式模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群组聊天。

可见回复单独控制。普通的群组、渠道和内部 WebChat 直接请求默认为自动最终投递：最终的助手文本通过旧的可见回复路径发布。当可见输出应仅在代理调用 `message(action=send)` 后发布时，选择启用 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。如果模型在启用的仅工具模式下返回最终文本但未调用消息工具，该最终文本将保持私密，并且网关详细日志会记录被抑制的负载元数据。

仅工具可见回复需要能够可靠调用工具的模型/运行时，建议用于 GPT 5.5 等最新代模型上的共享环境房间。一些较弱的模型可以回答最终文本，但无法理解源可见输出必须使用 `message(action=send)` 发送。对于这些模型，请使用 `"automatic"`，以便最终的助手轮次作为可见回复路径。如果会话日志显示带有 `didSendViaMessagingTool: false` 的助手文本，则表明模型生成了私有的最终文本，而不是调用消息工具。请切换到该渠道的更强工具调用模型，检查网关详细日志以获取被抑制的负载摘要，或者设置 `messages.groupChat.visibleReplies: "automatic"` 以便为每个群组/渠道请求使用可见的最终回复。

如果消息工具在当前工具策略下不可用，OpenClaw 将回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会针对这种不匹配发出警告。

此规则适用于普通的代理最终文本。插件拥有的对话绑定使用拥有插件返回的回复作为已认领绑定线程轮次的可见响应；该插件无需为这些绑定回复调用 `message(action=send)`。

**故障排除：群组 @提及 触发正在输入状态随后沉默（无错误）**

症状：群组/渠道 @提及 显示正在输入指示器，并且网关日志报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间内没有任何消息。发送给同一代理的私信回复正常。

原因：群组/渠道可见回复模式解析为 `"message_tool"`OpenClaw，因此 OpenClaw 会运行轮次，但会抑制最终的助手文本，除非代理调用 `message(action=send)`。在此模式下没有 `NO_REPLY` 约定；没有消息工具调用意味着没有源回复。没有错误，因为抑制是已配置的行为。正常的群组和渠道轮次默认为 `"automatic"`，因此仅当明确设置 `messages.groupChat.visibleReplies`（或全局 `messages.visibleReplies`）为 `"message_tool"` 时，才会出现此症状。Harness `defaultVisibleReplies` 在此处不适用——群组/渠道解析器会忽略它；它仅影响直接/源聊天（Codex harness 会以这种方式抑制直接聊天的最终消息）。

修复方法：选择一个更强大的工具调用模型，删除显式的 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者设置 `messages.groupChat.visibleReplies: "automatic"` 以强制每个群组/渠道请求都有可见回复。网关在文件保存后会热重载 `messages` 配置；仅在部署中禁用文件监视或配置重新加载时才需要重启网关。

**提及类型：**

- **元数据提及**：原生平台 @提及。在 WhatsApp 自聊模式下被忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正则表达式模式。无效的模式和不安全的嵌套重复将被忽略。
- 仅在检测可行（原生提及或至少一种模式）时才会强制执行提及限制。

```json5
{
  messages: {
    visibleReplies: "automatic", // force old automatic final replies for direct/source chats
    groupChat: {
      historyLimit: 50,
      unmentionedInbound: "room_event", // always-on unmentioned room chatter becomes quiet context
      visibleReplies: "message_tool", // opt-in; require message(action=send) for visible room replies
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` 设置全局默认值。渠道可以使用 `channels.<channel>.historyLimit` 覆盖（或按账户覆盖）。设置 `0` 以禁用。

`messages.groupChat.unmentionedInbound: "room_event"` 将未提及的常开群组/渠道消息作为安静的房间上下文提交到支持的渠道。被提及的消息、命令和直接消息仍为用户请求。有关完整的 Discord、Slack 和 Telegram 示例，请参阅 [环境房间事件](/zh/channels/ambient-room-eventsDiscordSlackTelegram)。

`messages.visibleReplies` 是全局源事件默认值；`messages.groupChat.visibleReplies` 会覆盖群组/渠道源事件的设置。当未设置 `messages.visibleReplies`WebChat 时，直接/源聊天使用所选运行时或工具默认值，但内部 WebChat 直接轮次会使用自动最终交付以实现 Pi/Codex 提示词一致性。设置 `messages.visibleReplies: "message_tool"` 以明确要求 `message(action=send)` 用于可见输出。渠道白名单和提及控制仍决定是否处理事件。

#### 私信历史记录限制

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

解析方式：每条私信覆盖 → 提供商默认值 → 无限制（全部保留）。

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

在 `allowFrom` 中包含您自己的号码以启用自聊模式（忽略原生 @提及，仅响应文本模式）：

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

### 命令（聊天命令处理）

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

<Accordion title="Command details">

- 此块配置命令界面。有关当前的内置 + 捆绑命令目录，请参阅 [Slash Commands](/zh/tools/slash-commands)。
- 此页面是**配置键参考**，而非完整的命令目录。渠道/插件拥有的命令（如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`）在其各自的渠道/插件页面以及 [Slash Commands](/zh/tools/slash-commands) 中有记录。
- 文本命令必须是带有前缀 `/` 的**独立**消息。
- `native: "auto"`DiscordTelegramSlack 为 Discord/Telegram 启用原生命令，关闭 Slack 的原生命令。
- `nativeSkills: "auto"`DiscordTelegramSlack 为 Discord/Telegram 启用原生技能命令，关闭 Slack 的原生技能命令。
- 按渠道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`Discord）。对于 Discord，`false` 跳过启动期间的原生命令注册和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 按渠道覆盖原生技能注册。
- `channels.telegram.customCommands`Telegram 添加额外的 Telegram 机器人菜单条目。
- `bash: true` 为主机 Shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 和发件人在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 启用 `/config`（读取/写入 `openclaw.json`）。对于 gateway `chat.send` 客户端，持久的 `/config set|unset` 写入也需要 `operator.admin`；只读 `/config show` 对普通写入作用域的操作员客户端仍然可用。
- `mcp: true` 为 `mcp.servers` 下的 OpenClaw 托管的 MCP 服务器配置启用 `/mcp`OpenClaw。
- `plugins: true` 启用 `/plugins` 以进行插件发现、安装和启用/禁用控制。
- `channels.<provider>.configWrites` 限制每个渠道的配置变更（默认值：true）。
- 对于多账户渠道，`channels.<provider>.accounts.<id>.configWrites` 还会限制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 禁用 `/restart` 和 gateway 重启工具操作。默认值：`true`。
- `ownerAllowFrom` 是仅限所有者的命令和所有者限制的渠道操作的显式所有者允许列表。它与 `allowFrom` 是分开的。
- `ownerDisplay: "hash"` 对系统提示中的所有者 ID 进行哈希处理。设置 `ownerDisplaySecret` 以控制哈希处理。
- `allowFrom` 是针对每个提供商的。设置后，它是**唯一**的授权来源（渠道允许列表/配对和 `useAccessGroups` 将被忽略）。
- `useAccessGroups: false` 允许命令在未设置 `allowFrom` 时绕过访问组策略。
- 命令文档映射：
  - 内置 + 捆绑目录：[Slash Commands](/zh/tools/slash-commands)
  - 特定于渠道的命令界面：[Channels](/zh/channels)
  - QQ Bot 命令：[QQ Bot](/zh/channels/qqbot)
  - 配对命令：[Pairing](/zh/channels/pairing)
  - LINE 卡片命令：[LINE](/zh/channels/line)
  - 内存梦境：[Dreaming](/zh/concepts/dreaming)

</Accordion>

---

## 相关

- [配置参考](/zh/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/zh/gateway/config-agents)
- [渠道概述](/zh/channels)
