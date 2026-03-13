---
title: "配置参考"
description: "~/.openclaw/openclaw. 的逐字段完整参考"
summary: "每个 OpenClaw 配置键、默认值和通道设置的完整参考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 配置参考

`~/.openclaw/openclaw.json` 中可用的每个字段。如需面向任务的概述，请参阅 [配置](/en/gateway/configuration)。

配置格式为 **JSON5**（允许注释和尾随逗号）。所有字段均为可选项——如果省略，OpenClaw 将使用安全默认值。

---

## 通道

当其配置部分存在时（除非 `enabled: false`），每个通道会自动启动。

### 私聊和群组访问

所有通道均支持私聊策略和群组策略：

| DM 策略           | 行为                                                        |
| ------------------- | --------------------------------------------------------------- |
| `pairing` (默认) | 未知发送者获得一次性配对码；所有者必须批准 |
| `allowlist`         | 仅 `allowFrom` 中的发送者（或已配对的允许存储）             |
| `open`              | 允许所有入站 DM（需要 `allowFrom: ["*"]`）             |
| `disabled`          | 忽略所有入站 DM                                          |

| 群组策略          | 行为                                               |
| --------------------- | ------------------------------------------------------ |
| `allowlist` (默认) | 仅匹配配置的允许列表的群组          |
| `open`                | 绕过群组允许列表（提及限制仍然适用） |
| `disabled`            | 阻止所有群组/房间消息                          |

<Note>
`channels.defaults.groupPolicy` 设置了当提供方的 `groupPolicy` 未设置时的默认值。
配对码将在 1 小时后过期。待处理的私聊配对请求限制为 **每个频道 3 个**。
如果提供方配置块完全缺失（缺少 `channels.<provider>`），运行时组策略将回退到 `allowlist`（故障关闭/默认拒绝），并在启动时显示警告。
</Note>

### 频道模型覆盖

使用 `channels.modelByChannel` 将特定的频道 ID 固定到某个模型。值接受 `provider/model` 或已配置的模型别名。当会话尚未设置模型覆盖时（例如通过 `/model` 设置），该频道映射生效。

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

### 频道默认值和心跳

使用 `channels.defaults` 来配置跨提供方的共享组策略和心跳行为：

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

- `channels.defaults.groupPolicy`：当提供方级别的 `groupPolicy` 未设置时的回退组策略。
- `channels.defaults.heartbeat.showOk`：在心跳输出中包含健康的频道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：呈现紧凑的指示器风格心跳输出。

### WhatsApp

WhatsApp 通过网关的 Web 频道（Baileys Web）运行。当存在关联的会话时，它会自动启动。

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

<Accordion title="多账号 WhatsApp">

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

- 出站命令默认使用账号 `default`（如果存在）；否则使用第一个配置的账号 ID（按排序）。
- 可选的 `channels.whatsapp.defaultAccount` 会覆盖该回退默认账号选择，当它与已配置的账号 ID 匹配时。
- 旧版单账号 Baileys 认证目录将由 `openclaw doctor` 迁移至 `whatsapp/default`。
- 每账号覆盖设置：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot 令牌：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接），其中 `TELEGRAM_BOT_TOKEN` 作为默认账号的回退选项。
- 可选的 `channels.telegram.defaultAccount` 会在匹配到已配置的账户 ID 时覆盖默认的账户选择。
- 在多账户设置（2个或更多账户 ID）中，设置一个显式的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；`openclaw doctor` 会在缺少此项或无效时发出警告。
- `configWrites: false` 会阻止 Telegram 发起的配置写入（超级群组 ID 迁移、`/config set|unset`）。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目为论坛主题配置持久的 ACP 绑定（在 `match.peer.id` 中使用规范 `chatId:topic:topicId`）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- Telegram 流预览使用 `sendMessage` + `editMessageText`（适用于直接消息和群组聊天）。
- 重试策略：参见 [重试策略](/en/concepts/retry)。

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

- 令牌：`channels.discord.token`，并将 `DISCORD_BOT_TOKEN` 作为默认账户的回退。
- 提供显式 Discord `token` 的直接出站调用将使用该令牌进行调用；账户重试/策略设置仍来自活动运行时快照中选定的账户。
- 可选的 `channels.discord.defaultAccount` 会在匹配到已配置的账户 ID 时覆盖默认的账户选择。
- 使用 `user:<id>`（直接消息）或 `channel:<id>`（公会频道）作为传递目标；不接受纯数字 ID。
- Guild 别名是小写的，并将空格替换为 `-`；频道键使用别名化名称（无 `#`）。优先使用 Guild ID。
- 默认情况下忽略 Bot 发送的消息。`allowBots: true` 会启用它们；使用 `allowBots: "mentions"` 仅接受提及该 Bot 的 Bot 消息（自己的消息仍会被过滤）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖）会丢弃提及其他用户或角色但未提及机器人的消息（@everyone/@here 除外）。
- `maxLinesPerMessage`（默认为 17）即使字符数不足 2000 也会拆分长消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：线程绑定会话功能的 Discord 覆盖（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定交付/路由）
  - `idleHours`：不活动自动取消聚焦的 Discord 覆盖，以小时为单位（`0` 表示禁用）
  - `maxAgeHours`：硬性最大寿命的 Discord 覆盖，以小时为单位（`0` 表示禁用）
  - `spawnSubagentSessions`：`sessions_spawn({ thread: true })` 自动线程创建/绑定的选择加入开关
- 顶级 `bindings[]` 条目中带有 `type: "acp"` 的项可配置频道和线程的持久化 ACP 绑定（在 `match.peer.id` 中使用频道/线程 ID）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- `channels.discord.ui.components.accentColor` 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.voice` 启用 Discord 语音频道对话以及可选的自动加入 + TTS 覆盖。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 会传递给 `@discordjs/voice` DAVE 选项（默认为 `true` 和 `24`）。
- 在重复解密失败后，OpenClaw 还会尝试通过离开/重新加入语音会话来恢复语音接收。
- `channels.discord.streaming` 是标准的流模式键。旧的 `streamMode` 和布尔值 `streaming` 会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射到机器人状态（healthy => 在线，degraded => 空闲，exhausted => 忙碌），并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变的名称/标签匹配（应急兼容模式）。

**反应通知模式：** `off`（无），`own`（机器人的消息，默认），`all`（所有消息），`allowlist`（所有消息中来自 `guilds.<id>.users`）。

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
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变的邮箱主体匹配（应急兼容模式）。

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

- **Socket 模式**需要同时提供 `botToken` 和 `appToken`（默认账号环境变量回退为 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（在根级别或每个账号）。
- `configWrites: false` 阻止由 Slack 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 在匹配配置的账号 ID 时覆盖默认账号选择。
- `channels.slack.streaming` 是规范的流模式键。旧版 `streamMode` 和布尔 `streaming` 值会自动迁移。
- 使用 `user:<id>`（DM）或 `channel:<id>` 作为投递目标。

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 是按线程隔离（默认）或在频道间共享。`thread.inheritParent` 会将父频道的对话记录复制到新线程中。

- `typingReaction` 会在回复运行时向传入的 Slack 消息添加一个临时反应，然后在完成时将其移除。使用 Slack 表情符号短代码，例如 `"hourglass_flowing_sand"`。

| Action group | Default | Notes                  |
| ------------ | ------- | ---------------------- |
| reactions    | enabled | React + list reactions |
| messages     | enabled | Read/send/edit/delete  |
| pins         | enabled | Pin/unpin/list         |
| memberInfo   | enabled | Member info            |
| emojiList    | enabled | Custom emoji list      |

### Mattermost

Mattermost 以插件形式提供：`openclaw plugins install @openclaw/mattermost`。

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

聊天模式：`oncall`（在 @-提及时回复，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

当启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl` 必须解析为 OpenClaw 网关端点，并且可从 Mattermost 服务器访问。
- 对于私有/tailnet/内部回调主机，Mattermost 可能需要
  `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回调主机/域名。
  使用主机/域名值，而不是完整的 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在频道中回复之前需要 `@mention`。
- 可选的 `channels.mattermost.defaultAccount` 在匹配配置的帐户 ID 时会覆盖默认帐户选择。

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

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`：将频道启动固定到特定的 Signal 帐户身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 发起的配置写入。
- 可选的 `channels.signal.defaultAccount` 在匹配到已配置的账户 ID 时会覆盖默认的账户选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 通道（基于插件，在 `channels.bluebubbles` 下配置）。

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

- 此处涵盖的核心键路径：`channels.bluebubbles`、`channels.bluebubbles.dmPolicy`。
- 可选的 `channels.bluebubbles.defaultAccount` 在匹配到已配置的账户 ID 时会覆盖默认的账户选择。
- 完整的 BlueBubbles 频道配置记录在 [BlueBubbles](/en/channels/bluebubbles) 中。

### iMessage

OpenClaw 会生成 `imsg rpc`（基于 stdio 的 JSON-RPC）。无需守护进程或端口。

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

- 可选的 `channels.imessage.defaultAccount` 在匹配到已配置的账户 ID 时会覆盖默认的账户选择。

- 需要对 Messages 数据库的完全磁盘访问权限。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 封装器；设置 `remoteHost`（`host` 或 `user@host`）以通过 SCP 获取附件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认值：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密检查，因此请确保中继主机密已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝由 iMessage 发起的配置写入。

<Accordion title="iMessage SSH 封装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Microsoft Teams

Microsoft Teams 基于扩展，在 `channels.msteams` 下配置。

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
- 完整的 Teams 配置（凭据、webhook、DM/群组策略、每个团队/每个频道的覆盖）记录在 [Microsoft Teams](/en/channels/msteams) 中。

### IRC

IRC 基于扩展，在 `channels.irc` 下配置。

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
- 可选的 `channels.irc.defaultAccount` 在匹配到已配置的账户 ID 时会覆盖默认的账户选择。
- 完整的 IRC 频道配置（主机/端口/TLS/频道/允许列表/提及门控）记录在 [IRC](/en/channels/irc) 中。

### 多账户（所有频道）

在每个渠道运行多个账户（每个账户都有自己的 `accountId`）：

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

- 当省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境令牌仅适用于 **默认** 账户。
- 基本频道设置适用于所有账户，除非按账户进行了覆盖。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果您在仍处于单账户顶级渠道配置时通过 `openclaw channels add`（或渠道接入）添加非默认账户，OpenClaw 会首先将账户范围的顶级单账户值移动到 `channels.<channel>.accounts.default` 中，以便原账户继续工作。
- 现有的仅渠道绑定（无 `accountId`）保持匹配默认账户；账户范围的绑定仍然是可选的。
- 当存在命名账户但缺少 `default` 时，`openclaw doctor --fix` 还会通过将账户范围的顶级单账户值移动到 `accounts.default` 中来修复混合形状。

### 其他扩展频道

许多扩展渠道配置为 `channels.<id>` 并在其专门的渠道页面中进行记录（例如飞书、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的渠道索引：[渠道](/en/channels)。

### 群聊提及 gating

群消息默认为 **需要提及**（元数据提及或正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

**提及类型：**

- **元数据提及**：原生平台的 @-mentions。在 WhatsApp 自聊模式下忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的正则表达式模式。始终检查。
- 仅当检测可行（原生提及或至少一个模式）时，才会强制执行提及 gating。

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

`messages.groupChat.historyLimit` 设置全局默认值。渠道可以使用 `channels.<channel>.historyLimit`（或每个账户）覆盖。设置 `0` 以禁用。

#### 私聊历史记录限制

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

解析：每个私聊的覆盖 → 提供商默认 → 无限制（全部保留）。

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

在 `allowFrom` 中包含您自己的号码以启用自聊天模式（忽略原生 @ 提及，仅响应文本模式）：

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

<Accordion title="Command details">

- 文本命令必须是带有前缀 `/` 的**独立**消息。
- `native: "auto"` 为 Discord/Telegram 启用原生命令，Slack 则保持关闭。
- 按频道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。`false` 清除先前注册的命令。
- `channels.telegram.customCommands` 添加额外的 Telegram bot 菜单项。
- `bash: true` 为宿主 shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 且发送者位于 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 启用 `/config`（读取/写入 `openclaw.json`）。对于网关 `chat.send` 客户端，持久化 `/config set|unset` 写入也需要 `operator.admin`；只读 `/config show` 对普通写入作用域的操作员客户端仍然可用。
- `channels.<provider>.configWrites` 限制每个频道的配置变更（默认：true）。
- 对于多账号频道，`channels.<provider>.accounts.<id>.configWrites` 还会限制针对该账号的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `allowFrom` 是针对每个提供商的。设置后，它是**唯一**的授权来源（频道允许列表/配对和 `useAccessGroups` 将被忽略）。
- 当未设置 `allowFrom` 时，`useAccessGroups: false` 允许命令绕过访问组策略。

</Accordion>

---

## Agent defaults

### `agents.defaults.workspace`

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

显示在系统提示 Runtime 行中的可选仓库根目录。如果未设置，OpenClaw 会通过从工作区向上遍历来自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自动创建。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.bootstrapMaxChars`

截断前每个工作区引导文件的最大字符数。默认值：`20000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

注入到所有工作区引导文件中的最大字符总数。默认值：`150000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制引导上下文被截断时代理可见的警告文本。
默认值：`"once"`。

- `"off"`：切勿将警告文本注入系统提示词。
- `"once"`：针对每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：每当存在截断时，在每次运行中注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

在进行提供方调用之前，记录/工具图像块中最长图像边的最大像素尺寸。
默认值：`1200`。

较低的值通常会减少大量截图运行时的视觉令牌（vision-token）使用量和请求负载大小。
较高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（非消息时间戳）。默认回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示词中的时间格式。默认值：`auto`（操作系统偏好）。

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

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主要模型。
  - 对象形式设置主要模型以及有序的故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当选定/默认模型无法接受图像输入时，也用作后备路由。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后再回退到尽力而为的提供方默认值。
- `pdfMaxBytesMb`：调用时未传递 `maxBytesMb` 的情况下，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：在 `pdf` 工具的提取回退模式下考虑的默认最大页数。
- `model.primary`：格式为 `provider/model`（例如 `anthropic/claude-opus-4-6`）。如果省略提供商，OpenClaw 假定为 `anthropic`（已弃用）。
- `models`：为 `/model` 配置的模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params` 合并优先级（配置）：`agents.defaults.models["provider/model"].params` 是基础，然后 `agents.list[].params`（匹配的代理 ID）按键覆盖。
- 更改这些字段的配置编写器（例如 `/models set`、`/models set-image` 和回退添加/移除命令）会保存规范的对象形式，并在可能的情况下保留现有的回退列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍然串行化）。默认值：1。

**内置别名简写**（仅在模型位于 `agents.defaults.models` 中时适用）：

| 别名               | 模型                                  |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5-mini`                    |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您配置的别名始终优先于默认值。

除非您设置了 `--thinking off` 或自己定义了 `agents.defaults.models["zai/<model>"].params.thinking`，否则 Z.AI GLM-4.x 模型会自动启用思考模式。
Z.AI 模型在工具调用流式传输时默认启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 可将其禁用。
当未设置明确的思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于纯文本回退运行（无工具调用）的可选 CLI 后端。当 API 提供商失败时，可用作备份。

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

- CLI 后端以文本为先；工具始终被禁用。
- 当设置 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。

### `agents.defaults.heartbeat`

定期心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.2-mini",
        includeReasoning: false,
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
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

- `every`：持续时间字符串（毫秒/秒/分/时）。默认值：`30m`。
- `suppressToolErrorWarnings`：为 true 时，在心跳运行期间抑制工具错误警告负载。
- `directPolicy`：直接/私信投递策略。`allow`（默认）允许直接目标投递。`block` 抑制直接目标投递并发出 `reason=dm-blocked`。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留来自工作区引导文件的 `HEARTBEAT.md`。
- 按代理：设置 `agents.list[].heartbeat`。当任何代理定义了 `heartbeat` 时，**仅这些代理** 运行心跳。
- 心跳运行完整的代理轮次 —— 较短的间隔会消耗更多的 token。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
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

- `mode`：`default` 或 `safeguard`（针对长历史的分块摘要）。参见 [Compaction](/zh/concepts/compaction)。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 会在压缩摘要期间前置内置的不透明标识符保留指导。
- `identifierInstructions`：可选的自定义标识符保留文本，在 `identifierPolicy=custom` 时使用。
- `postCompactionSections`：可选的 AGENTS.md H2/H3 章节名称，用于在压缩后重新注入。默认为 `["Session Startup", "Red Lines"]`；设置为 `[]` 可禁用重新注入。当未设置或显式设置为该默认对时，较旧的 `Every Session`/`Safety` 标题也会被接受作为传统后备选项。
- `model`：可选的 `provider/model-id` 覆盖，仅用于压缩摘要。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时使用此项；未设置时，压缩使用会话的主模型。
- `memoryFlush`：自动压缩前的静默代理轮次，用于存储持久记忆。在工作区为只读时跳过。

### `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪**旧的工具结果**。**不**修改磁盘上的会话历史。

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

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 启用修剪过程。
- `ttl` 控制修剪可以再次运行的频率（在上次缓存接触之后）。
- 修剪首先会对超大的工具结果进行软修剪，然后在必要时硬清除较旧的工具结果。

**软修剪（Soft-trim）** 保留开头和结尾，并在中间插入 `...`。

**硬清除** 会用占位符替换整个工具结果。

注意：

- 图片块永远不会被修剪/清除。
- 比例是基于字符的（近似值），而非确切的 Token 计数。
- 如果存在的助手消息少于 `keepLastAssistants` 条，则跳过修剪。

</Accordion>

有关行为详情，请参阅[会话修剪](/en/concepts/session-pruning)。

### 阻止流式传输

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

- 非 Telegram 频道需要显式设置 `*.blockStreaming: true` 才能启用块回复。
- 频道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每个账户的变体）。Signal/Slack/Discord/Google Chat 默认为 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500ms。每个代理的覆盖设置：`agents.list[].humanDelay`。

有关行为和分块详情，请参阅[流式传输](/en/concepts/streaming)。

### 正在输入指示器

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

- 默认值：直接聊天/提及为 `instant`，未提及的群组聊天为 `message`。
- 每个会话的覆盖设置：`session.typingMode`，`session.typingIntervalSeconds`。

请参阅[正在输入指示器](/en/concepts/typing-indicators)。

### `agents.defaults.sandbox`

嵌入式代理的可选 **Docker 沙箱**。有关完整指南，请参阅[沙箱](/en/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
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

<Accordion title="沙箱详情">

**工作区访问：**

- `none`：位于 `~/.openclaw/sandboxes` 下的每个作用域沙箱工作区
- `ro`：位于 `/workspace` 的沙箱工作区，代理工作区以只读方式挂载于 `/agent`
- `rw`：代理工作区以读/写方式挂载于 `/workspace`

**作用域：**

- `session`：每个会话的容器 + 工作区
- `agent`：每个代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出口、可写根目录和 root 用户。

**容器默认使用 `network: "none"`** — 如果智能体需要出站访问，请设置为 `"bridge"`（或自定义桥接网络）。
`"host"` 被阻止。除非您明确设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（break-glass），否则 `"container:<id>"` 默认被阻止。

**入站附件** 暂存到活动工作区中的 `media/inbound/*`。

**`docker.binds`** 挂载额外的主机目录；全局和每个智能体的绑定会合并。

**沙盒浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 被注入到系统提示中。不需要在 `openclaw.json` 中设置 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 身份验证，OpenClaw 会发出一个短期令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙盒会话以主机浏览器为目标。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当您明确需要全局桥接连接时，才设置为 `bridge`。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站流量限制为 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的主机目录挂载到沙盒浏览器容器中。当设置（包括 `[]`）时，它会替换浏览器容器的 `docker.binds`。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了调优：
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
  - `--disable-extensions`（默认启用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu`
    默认启用，如果 WebGL/3D 用途需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用。
  - 如果您的工作流依赖扩展，
    `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 会重新启用扩展。
  - `--renderer-process-limit=2` 可以通过
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改；设置 `0` 以使用 Chromium 的
    默认进程限制。
  - 此外，当启用 `noSandbox` 时，还包括 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 默认值是容器镜像的基准；使用带有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

构建镜像：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list`（每个代理的覆盖）

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

- `id`：稳定的代理 ID（必需）。
- `default`：当设置多个时，第一个生效（记录警告）。如果未设置，则默认为列表的第一个条目。
- `model`：字符串形式仅覆盖 `primary`；对象形式 `{ primary, fallbacks }` 覆盖两者（`[]` 禁用全局回退）。仅覆盖 `primary` 的定时任务仍继承默认回退，除非您设置 `fallbacks: []`。
- `params`：合并到 `agents.defaults.models` 中所选模型条目的每个代理的流参数。将其用于代理特定的覆盖，如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需复制整个模型目录。
- `runtime`：可选的每个代理的运行时描述符。当代理应默认为 ACP 挽具会话时，使用带有 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）的 `type: "acp"`。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：用于 `sessions_spawn` 的代理 ID 白名单（`["*"]` = 任意；默认值：仅限同一代理）。
- 沙箱继承保护：如果请求者会话处于沙箱中，`sessions_spawn` 将拒绝以非沙箱方式运行的目标。

---

## 多代理路由

在一个网关内运行多个隔离的代理。请参阅 [多代理](/en/concepts/multi-agent)。

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

### 绑定匹配字段

- `type`（可选）：`route` 用于正常路由（缺少类型时默认为 route），`acp` 用于持久的 ACP 会话绑定。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；特定于渠道）
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（频道范围）
6. 默认代理

在每个层级中，第一个匹配的 `bindings` 条目获胜。

对于 `type: "acp"` 条目，OpenClaw 通过精确的对话标识（`match.channel` + account + `match.peer.id`）进行解析，并且不使用上述路由绑定层级顺序。

### 每个代理的访问配置文件

<Accordion title="完全访问（无沙箱）">

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

<Accordion title="只读工具 + 工作区">

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

<Accordion title="无文件系统访问权限（仅消息）">

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

有关优先级的详细信息，请参阅 [多智能体沙箱与工具](/en/tools/multi-agent-sandbox-tools)。

---

## 会话

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

<Accordion title="会话字段详情">

- **`dmScope`**：DM 的分组方式。
  - `main`：所有 DM 共享主会话。
  - `per-peer`：跨频道按发送者 ID 隔离。
  - `per-channel-peer`：按频道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账号 + 频道 + 发送者隔离（推荐用于多账号）。
- **`identityLinks`**：将规范 ID 映射到提供商前缀的 peer 以实现跨频道会话共享。
- **`reset`**：主要重置策略。`daily` 在 `atHour` 本地时间重置；`idle` 在 `idleMinutes` 之后重置。当两者都配置时，以先过期的为准。
- **`resetByType`**：按类型覆盖（`direct`、`group`、`thread`）。旧的 `dm` 作为 `direct` 的别名被接受。
- **`parentForkMaxTokens`**：创建分叉线程会话时允许的最大父会话 `totalTokens`（默认为 `100000`）。
  - 如果父 `totalTokens` 超过此值，OpenClaw 将启动一个新的线程会话，而不是继承父记录历史。
  - 将 `0` 设置为禁用此保护并始终允许父分叉。
- **`mainKey`**：旧版字段。运行时现在始终使用 `"main"` 作为主要的直接聊天存储桶。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，带有旧版 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。优先匹配拒绝规则。
- **`maintenance`**：会话存储清理和保留控制。
  - `mode`：`warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`：过期条目的时间截止（默认 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大条目数（默认 `500`）。
  - `rotateBytes`：当 `sessions.json` 超过此大小时进行轮转（默认 `10mb`）。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 对话存档的保留期。默认为 `pruneAfter`；设置为 `false` 以禁用。
  - `maxDiskBytes`：可选的会话目录磁盘预算。在 `warn` 模式下记录警告；在 `enforce` 模式下首先移除最旧的构件/会话。
  - `highWaterBytes`：预算清理后的可选目标。默认为 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：主默认开关（提供程序可覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认的非活动自动取消聚焦时长，以小时为单位（`0` 表示禁用；提供程序可覆盖）
  - `maxAgeHours`：默认的硬性最大时长，以小时为单位（`0` 表示禁用；提供程序可覆盖）

</Accordion>

---

## 消息

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

### 响应前缀

按频道/账户覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析（最具体者优先）：账户 → 频道 → 全局。`""` 禁用并停止级联。`"auto"` 推导 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述                  | 示例                         |
| ----------------- | --------------------- | ---------------------------- |
| `{model}`         | 简短模型名称           | `claude-opus-4-6`             |
| `{modelFull}`     | 完整模型标识符         | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称             | `anthropic`                   |
| `{thinkingLevel}` | 当前思考级别           | `high`, `low`, `off`        |
| `{identity.name}` | Agent 身份名称         | (与 `"auto"` 相同)          |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为当前 Agent 的 `identity.emoji`，否则为 `"👀"`。设置 `""` 以禁用。
- 按频道覆盖：`channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → 身份回退。
- 作用域：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在回复后移除 ack（仅限 Slack/Discord/Telegram/Google Chat）。

### 入站防抖

将来自同一发送者的快速纯文本消息合并为一个代理轮次。媒体/附件会立即刷新。控制命令绕过防抖。

### TTS（文本转语音）

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

- `auto` 控制自动 TTS。`/tts off|always|inbound|tagged` 按会话覆盖。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 以进行自动摘要。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（加入/选用）。
- API 密钥回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 覆盖 OpenAI TTS 端点。解析顺序依次为配置、`OPENAI_TTS_BASE_URL`，然后是 `https://api.openai.com/v1`。
- 当 `openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为 OpenAI 兼容的 TTS 服务器，并放宽模型/语音的验证。

---

## 对话

Talk 模式（macOS/iOS/Android）的默认值。

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

- 语音 ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `apiKey` 和 `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API 密钥时生效。
- `voiceAliases` 允许 Talk 指令使用友好名称。
- `silenceTimeoutMs` 控制 Talk 模式在用户停止说话后等待多久才发送转录文本。未设置时将保持平台默认的暂停窗口（`700 ms on macOS and Android, 900 ms on iOS`）。

---

## 工具

### 工具配置文件

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置一个基础白名单：

本地引导在未设置时将新的本地配置默认设为 `tools.profile: "coding"`（现有的显式配置文件将被保留）。

| 配置文件     | 包含内容                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                     |
| `coding`    | `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`                    |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status` |
| `full`      | 无限制（与未设置相同）                                                            |

### 工具组

| 组              | 工具                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process` (`bash` 被接受为 `exec` 的别名)                            |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                   |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                            |
| `group:web`        | `web_search`, `web_fetch`                                                                |
| `group:ui`         | `browser`, `canvas`                                                                      |
| `group:automation` | `cron`, `gateway`                                                                        |
| `group:messaging`  | `message`                                                                                |
| `group:nodes`      | `nodes`                                                                                  |
| `group:openclaw`   | 所有内置工具（不包括提供商插件）                                           |

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。不区分大小写，支持 `*` 通配符。即使关闭 Docker 沙箱也会应用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

针对特定提供商或模型进一步限制工具。顺序：基础配置 → 提供商配置 → 允许/拒绝。

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

控制提升（主机）执行访问：

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

- 每代理覆盖 (`agents.list[].tools.elevated`) 只能进一步限制。
- `/elevated on|off|ask|full` 按会话存储状态；内联指令应用于单条消息。
- 提升的 `exec` 在宿主机上运行，绕过沙箱。

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

工具循环安全检查 **默认禁用**。设置 `enabled: true` 以激活检测。
可以在 `tools.loopDetection` 中全局定义设置，并在 `agents.list[].tools.loopDetection` 处按代理覆盖。

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

- `historySize`：为循环分析保留的最大工具调用历史。
- `warningThreshold`：针对警告的重复无进展模式阈值。
- `criticalThreshold`：用于阻塞关键循环的更高重复阈值。
- `globalCircuitBreakerThreshold`：任何无进展运行的硬停止阈值。
- `detectors.genericRepeat`：对重复的相同工具/相同参数调用发出警告。
- `detectors.knownPollNoProgress`：对已知的轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
- `detectors.pingPong`：对交替的无进展对模式发出警告/阻止。
- 如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，则验证失败。

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

配置入站媒体理解（图像/音频/视频）：

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

<Accordion title="Media model entry fields">

**Provider entry** (`type: "provider"` 或省略)：

- `provider`：API 提供商 ID（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
- `model`：模型 ID 覆盖
- `profile` / `preferredProfile`：`auth-profiles.json` 配置文件选择

**CLI 入口**（`type: "cli"`）：

- `command`：要运行的可执行文件
- `args`：模板化参数（支持 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等）

**Common fields:**

- `capabilities`：可选列表（`image`、`audio`、`video`）。默认值：`openai`/`anthropic`/`minimax` → 图像，`google` → 图像+音频+视频，`groq` → 音频。
- `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：每个条目的覆盖设置。
- 失败时将回退到下一个条目。

提供商身份验证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

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

控制哪些会话可以成为会话工具（`sessions_list`、`sessions_history`、`sessions_send`）的目标。

默认值：`tree`（当前会话 + 由其生成的会话，例如子代理）。

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

说明：

- `self`：仅当前会话密钥。
- `tree`：当前会话 + 由当前会话生成的会话（子代理）。
- `agent`：属于当前代理 ID 的任何会话（如果您在同一代理 ID 下运行每个发送者的会话，则可能包括其他用户）。
- `all`: 任何会话。跨代理定位仍然需要 `tools.agentToAgent`。
- 沙箱限制：当当前会话处于沙箱状态且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，即使 `tools.sessions.visibility="all"`，可见性也会被强制为 `tree`。

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

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

说明：

- 附件仅支持 `runtime: "subagent"`。ACP 运行时会拒绝它们。
- 文件被具体化到子工作空间中的 `.openclaw/attachments/<uuid>/`，并带有 `.manifest.json`。
- 附件内容会自动从对话记录持久化中编辑掉。
- Base64 输入会通过严格的字母表/填充检查和解码前大小保护进行验证。
- 文件权限：目录为 `0700`，文件为 `0600`。
- 清理遵循 `cleanup` 策略：`delete` 始终移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

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

- `model`: 生成的子代理的默认模型。如果省略，子代理继承调用者的模型。
- `runTimeoutSeconds`: 当工具调用省略 `runTimeoutSeconds` 时，`sessions_spawn` 的默认超时（秒）。`0` 表示没有超时。
- 每个子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义提供商和基础 URL

OpenClaw 使用 pi-coding-agent 模型目录。通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义提供程序。

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

- 使用 `authHeader: true` + `headers` 满足自定义身份验证需求。
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`）覆盖代理配置根目录。
- 匹配提供商 ID 的合并优先级：
  - 非空的代理 `models.json` `baseUrl` 值优先。
  - 非空的代理 `apiKey` 值仅在该提供程序在当前配置/身份验证配置文件上下文中不受 SecretRef 管理时才优先。
  - 受 SecretRef 管理的提供程序 `apiKey` 值从源标记刷新（环境变量引用为 `ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`），而不是持久化已解析的密钥。
  - 受 SecretRef 管理的提供程序标头值从源标记刷新（环境变量引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）。
  - 空或缺失的代理 `apiKey`/`baseUrl` 回退到配置中的 `models.providers`。
  - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置和隐式目录值之间的较高值。
  - 当您希望配置完全重写 `models.json` 时，请使用 `models.mode: "replace"`。
  - 标记持久化以源为权威：标记是从活动源配置快照（解析前）写入的，而不是从已解析的运行时密钥值写入。

### 提供商字段详情

- `models.mode`：提供程序目录行为（`merge` 或 `replace`）。
- `models.providers`：按提供程序 ID 键入的自定义提供程序映射。
- `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：提供程序凭据（首选 SecretRef/环境变量替换）。
- `models.providers.*.auth`：身份验证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：用于 Ollama + `openai-completions`，将 `options.num_ctx` 注入到请求中（默认：`true`）。
- `models.providers.*.authHeader`：在需要时，强制在 `Authorization` 标头中传输凭据。
- `models.providers.*.baseUrl`：上游 API 基础 URL。
- `models.providers.*.headers`：用于代理/租户路由的额外静态标头。
- `models.providers.*.models`：显式提供商模型目录条目。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：可选的兼容性提示。对于具有非空非原生 `baseUrl`（主机不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 在运行时会将其强制设置为 `false`。为空或省略 `baseUrl` 将保留默认的 OpenAI 行为。
- `models.bedrockDiscovery`：Bedrock 自动发现设置根节点。
- `models.bedrockDiscovery.enabled`：开启或关闭发现轮询。
- `models.bedrockDiscovery.region`：用于发现的 AWS 区域。
- `models.bedrockDiscovery.providerFilter`：用于定向发现的可选 provider-id 过滤器。
- `models.bedrockDiscovery.refreshInterval`：发现刷新的轮询间隔。
- `models.bedrockDiscovery.defaultContextWindow`：已发现模型的回退上下文窗口。
- `models.bedrockDiscovery.defaultMaxTokens`：已发现模型的回退最大输出 token 数。

### 提供商示例

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

针对 Cerebras 使用 `cerebras/zai-glm-4.7`；针对 Z.AI 直连使用 `zai/glm-4.7`。

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

设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。针对 Zen 目录使用 `opencode/...` 引用，或针对 Go 目录使用 `opencode-go/...` 引用。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

设置 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是接受的别名。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

- 通用端点：`https://api.z.ai/api/paas/v4`
- 编码端点（默认）：`https://api.z.ai/api/coding/paas/v4`
- 对于通用端点，请定义一个带有基础 URL 覆盖的自定义提供商。

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

对于中国端点：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

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

兼容 Anthropic 的内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

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

Base URL 应省略 `/v1`（Anthropic 客户端会自动追加）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

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

设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-api`。

</Accordion>

<Accordion title="Local models (LM Studio)">

参见 [Local Models](/en/gateway/local-models)。TL;DR：在强力硬件上通过 LM Studio Responses API 运行 MiniMax M2.5；保留托管的模型作为备用。

</Accordion>

---

## 技能

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
      "nano-banana-pro": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：仅针对内置技能的可选允许列表（托管/工作区技能不受影响）。
- `entries.<skillKey>.enabled: false` 会禁用技能，即使其已内置/安装。
- `entries.<skillKey>.apiKey`：便捷配置，用于声明了主要环境变量的技能（纯文本字符串或 SecretRef 对象）。

---

## 插件

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

- 从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 加载。
- **配置更改需要重启网关。**
- `allow`：可选允许列表（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API 密钥便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当 `false` 时，核心阻止 `before_prompt_build` 并忽略旧版 `before_agent_start` 中的提示变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。
- `plugins.entries.<id>.config`：插件定义的配置对象（由插件架构验证）。
- `plugins.slots.memory`：选择活动的记忆插件 id，或使用 `"none"` 禁用记忆插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 id；默认为 `"legacy"`，除非您安装并选择了其他引擎。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理的安装元数据。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 将 `plugins.installs.*` 视为托管状态；首选 CLI 命令而非手动编辑。

请参阅 [Plugins](/en/tools/plugin)。

---

## Browser

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "chrome",
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // relayBindHost: "0.0.0.0", // only when the extension relay must be reachable across namespaces (for example WSL2)
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- 如果未设置，`ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认为 `true`（可信网络模型）。
- 设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` 以进行仅限公开的严格浏览器导航。
- `ssrfPolicy.allowPrivateNetwork` 作为旧版别名仍受支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外处理。
- 远程配置文件仅支持附加（已禁用 start/stop/reset）。
- 自动检测顺序：如果是基于 Chromium 的默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务：仅限环回（端口源自 `gateway.port`，默认 `18791`）。
- `extraArgs` 将额外的启动标志附加到本地 Chromium 启动（例如
  `--disable-gpu`、窗口大小或调试标志）。
- `relayBindHost` 更改 Chrome 扩展程序中继的监听位置。保持未设置以仅限本地访问；仅当中继必须跨越命名空间边界（例如 WSL2）且主机网络已受信任时，才设置显式的非本地绑定地址，例如 `0.0.0.0`。

---

## UI

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

- `seamColor`：原生应用 UI 铬层的强调色（对话模式气泡色调等）。
- `assistant`：控制 UI 身份覆盖。回退到活动代理身份。

---

## Gateway

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

<Accordion title="Gateway field details">

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非设置了 `local`，否则网关拒绝启动。
- `port`：用于 WS + HTTP 的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意事项**：默认的 `loopback` 绑定在容器内部监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量会到达 `eth0`，因此网关无法访问。请使用 `--network host`，或者设置 `bind: "lan"`（或配合 `customBindHost: "0.0.0.0"` 设置 `bind: "custom"`）以在所有接口上监听。
- **Auth**: 默认情况下是必需的。非环回绑定需要共享令牌/密码。入门向导默认会生成一个令牌。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），则必须将 `gateway.auth.mode` 显式设置为 `token` 或 `password`。如果两者都已配置但未设置模式，启动和服务安装/修复流程将会失败。
- `gateway.auth.mode: "none"`：显式的无认证模式。仅用于受信任的本地回环设置；初始化向导故意不提供此选项。
- `gateway.auth.mode: "trusted-proxy"`：将认证委托给具有身份感知的反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)）。
- `gateway.auth.allowTailscale`：当 `true` 时，Tailscale Serve 身份标头可以满足控制 UI/WebSocket 认证（通过 `tailscale whois` 验证）；HTTP API 端点仍需要令牌/密码认证。这种无令牌流程假设网关主机是受信任的。当 `tailscale.mode = "serve"` 时，默认为 `true`。
- `gateway.auth.rateLimit`：可选的认证失败限制器。按客户端 IP 和认证范围应用（共享密钥和设备令牌独立跟踪）。被阻止的尝试返回 `429` + `Retry-After`。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当你故意希望对本地主机流量也进行速率限制时（用于测试设置或严格的代理部署），请设置 `false`。
- 浏览器来源的 WS 身份验证尝试始终受到限制，并禁用环回豁免（针对基于浏览器的本地主机暴力破解的深度防御）。
- `tailscale.mode`：`serve`（仅限 tailnet，回环绑定）或 `funnel`（公开，需要身份验证）。
- `controlUi.allowedOrigins`：用于 Gateway WebSocket 连接的显式浏览器源允许列表。当预期来自非回环源的浏览器客户端时，此项是必需的。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：一种危险模式，为故意依赖 Host 头源策略的部署启用 Host 头源回退。
- `remote.transport`：`ssh`（默认）或 `direct` (ws/wss)。对于 `direct`，`remote.url` 必须为 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端紧急覆盖，允许明文 `ws://` 连接到受信任的专用网络 IP；明文默认保持仅限回环。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不配置网关身份验证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在将基于中继的注册发布到网关后，使用的外部 APNs 中继的基本 HTTPS URL。此 URL 必须与编译到 iOS 版本中的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到中继的发送超时（毫秒）。默认为 `10000`。
- Relay 支持的注册被委托给特定的网关身份。配对的 iOS 应用获取 `gateway.identity.get`，将该身份包含在 relay 注册中，并将注册范围的发送授权转发给网关。其他网关无法重用该存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述 relay 配置的临时环境覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于开发的回环 HTTP relay URL 的应急手段。生产环境的 relay URL 应保持使用 HTTPS。
- 本地网关调用路径仅当 `gateway.auth.*` 未设置时，才能将 `gateway.remote.*` 作为后备。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析将失败关闭（无远程后备屏蔽）。
- `trustedProxies`：终止 TLS 的反向代理 IP。仅列出您控制的代理。
- `allowRealIpFallback`：当 `true` 时，如果缺少 `X-Forwarded-For`，网关接受 `X-Real-IP`。默认为 `false` 以实现失败关闭行为。
- `gateway.tools.deny`：为 HTTP `POST /tools/invoke` 阻止的额外工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- Chat Completions：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入硬化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
- 可选的响应硬化标头：
  - `gateway.http.securityHeaders.strictTransportSecurity` （仅为您控制的 HTTPS 源设置；请参阅 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一台主机上运行多个网关，使用唯一的端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`），`--profile <name>`（使用 `~/.openclaw-<name>`）。

请参阅[多个网关](/en/gateway/multiple-gateways)。

---

## 钩子

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

认证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true` 时，才接受来自请求负载的 `sessionKey`（默认值：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析

<Accordion title="映射详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的负载字段。
- 像 `{{messages[0].subject}}` 这样的模板从负载中读取。
- `transform` 可以指向返回 hook 动作的 JS/TS 模块。
  - `transform.module` 必须是相对路径并保持在 `hooks.transformsDir` 内（绝对路径和遍历操作将被拒绝）。
- `agentId` 路由到特定的 agent；未知 ID 回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许所有，`[]` = 拒绝所有）。
- `defaultSessionKey`：用于没有显式 `sessionKey` 的 hook agent 运行的可选固定会话密钥。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用者设置 `sessionKey`（默认值：`false`）。
- `allowedSessionKeyPrefixes`：显式 `sessionKey` 值（请求 + 映射）的可选前缀允许列表，例如 `["hook:"]`。
- `deliver: true` 将最终回复发送到频道；`channel` 默认为 `last`。
- `model` 覆盖此 hook 运行的 LLM（如果设置了模型目录，则必须允许）。

</Accordion>

### Gmail 集成

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

- 配置后，Gateway 会在启动时自动启动 `gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以禁用。
- 不要在 Gateway 之外运行单独的 `gog gmail watch serve`。

---

## Canvas 主机

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- 在 Gateway 端口下通过 HTTP 提供可由代理编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅限本地：保持 `gateway.bind: "loopback"`（默认）。
- 非环回绑定：canvas 路由需要网关身份验证（令牌/密码/受信任代理），与其他网关 HTTP 表面相同。
- 节点 WebViews 通常不发送身份验证头；在节点配对并连接后，网关会通告节点范围的能力 URL 以用于 canvas/A2UI 访问。
- 能力 URL 绑定到活动的节点 WS 会话并很快过期。不使用基于 IP 的回退。
- 将实时重载客户端注入到提供的 HTML 中。
- 为空时自动创建初始 `index.html`。
- 同时也通过 `/__openclaw__/a2ui/` 提供 A2UI 服务。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，禁用实时重新加载。

---

## 发现

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

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 主机名默认为 `openclaw`。通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域网 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。用于跨网络发现，需配合 DNS 服务器（推荐 CoreDNS）+ Tailscale 分离 DNS。

设置：`openclaw dns setup --apply`。

---

## 环境

### `env`（内联环境变量）

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

- 仅当进程环境中缺少该键时，才会应用内联环境变量。
- `.env` 文件：CWD 中的 `.env` + `~/.openclaw/.env`（均不会覆盖现有变量）。
- `shellEnv`：从您的登录 shell 配置文件中导入缺失的预期键。
- 有关完整优先级，请参阅 [环境](/en/help/environment)。

### 环境变量替换

使用 `${VAR_NAME}` 在任何配置字符串中引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- 缺失/空的变量在加载配置时会引发错误。
- 使用 `$${VAR}` 转义以表示字面意义上的 `${VAR}`。
- 适用于 `$include`。

---

## 机密

机密引用是累加的：纯文本值仍然有效。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

验证：

- `provider` 模式： `^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式： `^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON 指针（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式： `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` ids 不得包含 `.` 或 `..` 斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据范围

- 规范矩阵：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- `secrets apply` 目标受支持的 `openclaw.json` 凭证路径。
- `auth-profiles.json` 引用包含在运行时解析和审计覆盖范围内。

### 密钥提供程序配置

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

备注：

- `file` 提供程序支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必须为 `"value"`）。
- `exec` 提供程序需要绝对的 `command` 路径，并在 stdin/stdout 上使用协议有效载荷。
- 默认情况下，符号链接命令路径会被拒绝。设置 `allowSymlinkCommand: true` 以允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则信任目录检查适用于解析后的目标路径。
- `exec` 子环境默认为最小化；请使用 `passEnv` 显式传递所需的变量。
- 密钥引用在激活时解析为内存快照，然后请求路径仅读取该快照。
- 激活范围过滤在激活期间应用：已启用表面上的未解析引用会导致启动/重新加载失败，而非活动表面则会被跳过并输出诊断信息。

---

## 认证存储

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

- 每个代理的配置文件存储在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支持值级引用（用于 `api_key` 的 `keyRef`，用于 `token` 的 `tokenRef`）。
- 静态运行时凭据来自内存中解析的快照；当发现旧式的静态 `auth.json` 条目时，它们会被清除。
- 从 `~/.openclaw/credentials/oauth.json` 旧版 OAuth 导入。
- 参见 [OAuth](/en/concepts/oauth)。
- 机密运行时行为和 `audit/configure/apply` 工具：[机密管理](/en/gateway/secrets)。

---

## 日志

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

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 设置 `logging.file` 以使用稳定的路径。
- 当 `--verbose` 时，`consoleLevel` 会升级到 `debug`。

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

- `cli.banner.taglineMode` 控制横幅标语样式：
  - `"random"`（默认）：轮换的趣味/季节性标语。
  - `"default"`：固定的中性标语 (`All your chats, one OpenClaw.`)。
  - `"off"`：无标语文本（仍显示横幅标题/版本）。
- 要隐藏整个横幅（而不仅仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导

CLI 向导写入的元数据（`onboard`, `configure`, `doctor`）：

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

## 身份

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

由 macOS 入门助手编写。派生默认值：

- `messages.ackReaction` 来自 `identity.emoji`（回落至 👀）
- `mentionPatterns` 来自 `identity.name`/`identity.emoji`
- `avatar` 接受：相对于工作区的路径、`http(s)` URL 或 `data:` URI

---

## 桥接（已弃用，已移除）

当前构建不再包含 TCP 网桥。节点通过 Gateway WebSocket 连接。`bridge.*` 键不再是配置架构的一部分（移除前验证会失败；`openclaw doctor --fix` 可以去除未知键）。

<Accordion title="Legacy bridge config (historical reference)">

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

- `sessionRetention`：在从 `sessions.json` 中清理之前保留已完成的隔离 cron 运行会话的时间。同时控制已归档的已删除 cron 副本的清理。默认值：`24h`；设置为 `false` 以禁用。
- `runLog.maxBytes`：每次运行日志文件 (`cron/runs/<jobId>.jsonl`) 清理前的最大大小。默认值：`2_000_000` 字节。
- `runLog.keepLines`：触发运行日志清理时保留的最新行数。默认值：`2000`。
- `webhookToken`：用于 cron webhook POST 传递 (`delivery.mode = "webhook"`) 的 bearer 令牌，如果省略则不发送认证头。
- `webhook`：已弃用的旧版回退 webhook URL (http/https)，仅用于仍有 `notify: true` 的存储作业。

参见 [Cron 任务](/en/automation/cron-jobs)。

---

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| Variable           | Description                                       |
| ------------------ | ------------------------------------------------- |
| `{{Body}}`         | 完整的入站消息正文                         |
| `{{RawBody}}`      | 原始正文（无历史记录/发送者包装器）             |
| `{{BodyStripped}}` | 已移除群组提及的正文                 |
| `{{From}}`         | 发送者标识符                                 |
| `{{To}}`           | 目标标识符                            |
| `{{MessageSid}}`   | 频道消息 ID                                |
| `{{SessionId}}`    | 当前会话 UUID                              |
| `{{IsNewSession}}` | 创建新会话时的 `"true"`                 |
| `{{MediaUrl}}`     | 入站媒体伪 URL                          |
| `{{MediaPath}}`    | 本地媒体路径                                  |
| `{{MediaType}}`    | 媒体类型（图片/音频/文档/…）               |
| `{{Transcript}}`   | 音频转录                                  |
| `{{Prompt}}`       | 为 CLI 条目解析的媒体提示             |
| `{{MaxChars}}`     | 为 CLI 条目解析的最大输出字符数         |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                           |
| `{{GroupSubject}}` | 群组主题（尽力）                       |
| `{{GroupMembers}}` | 群组成员预览（尽力）               |
| `{{SenderName}}`   | 发送者显示名称（尽力）                 |
| `{{SenderE164}}`   | 发送者电话号码（尽力）                 |
| `{{Provider}}`     | 提供商提示（whatsapp, telegram, discord 等） |

---

## 配置包括 (`$include`)

将配置拆分为多个文件：

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

**合并行为：**

- 单个文件：替换包含的对象。
- 文件数组：按顺序深度合并（后面的覆盖前面的）。
- 同级键：在包含之后合并（覆盖包含的值）。
- 嵌套包含：最多深 10 层。
- 路径：相对于包含该文件的路径解析，但必须保持在顶级配置目录 (`dirname` 的 `openclaw.json`) 内。仅当解析结果仍在该边界内时，才允许使用绝对/`../` 形式。
- 错误：针对缺失文件、解析错误和循环包含提供明确的消息。

---

_相关：[配置](/en/gateway/configuration) · [配置示例](/en/gateway/configuration-examples) · [诊断工具](/en/gateway/doctor)_

import zh from '/components/footer/zh.mdx';

<zh />
