---
title: "配置参考"
summary: "核心 OpenClaw 密钥、默认值及专用子系统参考链接的 Gateway(网关) 配置参考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 配置参考

`~/.openclaw/openclaw.json` 的核心配置参考。如需面向任务的概述，请参阅 [Configuration](/en/gateway/configuration)。

本页涵盖主要的 OpenClaw 配置层面，当子系统拥有自己的深入参考时，会提供外部链接。本页并**不**试图将每个渠道/插件拥有的命令目录或每个深度记忆/QMD 调整项都内联在一页上。

代码真相：

- `openclaw config schema` 打印用于验证和控制 UI 的实时 JSON 架构，并在可用时合并内置/插件/渠道元数据
- `config.schema.lookup` 返回一个路径范围的架构节点，用于钻取工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 根据当前架构层验证配置文档基线哈希

专用深入参考：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置的 [内存配置参考](/en/reference/memory-config)
- 当前内置 + 捆绑命令目录的 [斜杠命令](/en/tools/slash-commands)
- 渠道特定命令层面的所属渠道/插件页面

配置格式为 **JSON5**（允许注释和尾随逗号）。所有字段都是可选的 — 如果省略，OpenClaw 将使用安全默认值。

---

## 渠道

当配置部分存在时，每个渠道会自动启动（除非 `enabled: false`）。

### 私信和群组访问

所有渠道都支持私信策略和群组策略：

| 私信策略          | 行为                                            |
| ----------------- | ----------------------------------------------- |
| `pairing`（默认） | 未知发件人将获得一次性配对码；所有者必须批准    |
| `allowlist`       | 仅 `allowFrom` 中的发件人（或已配对的允许存储） |
| `open`            | 允许所有入站私信（需要 `allowFrom: ["*"]`）     |
| `disabled`        | 忽略所有入站私信                                |

| 群组策略            | 行为                                 |
| ------------------- | ------------------------------------ |
| `allowlist`（默认） | 仅限与配置的允许列表匹配的群组       |
| `open`              | 绕过群组允许列表（提及限制仍然适用） |
| `disabled`          | 阻止所有群组/房间消息                |

<Note>
当提供商的 `groupPolicy` 未设置时，`channels.defaults.groupPolicy` 会设置默认值。
配对代码在 1 小时后过期。待处理的私信配对请求上限为 **每个渠道 3 个**。
如果提供商块完全缺失（缺少 `channels.<provider>`），运行时群组策略将回退到 `allowlist`（故障关闭），并显示启动警告。
</Note>

### 渠道模型覆盖

使用 `channels.modelByChannel` 将特定渠道 ID 固定到模型。值接受 `provider/model` 或配置的模型别名。当会话尚未具有模型覆盖（例如，通过 `/model` 设置）时，渠道映射生效。

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

### 渠道默认值和心跳

使用 `channels.defaults` 配置跨提供商的共享群组策略和心跳行为：

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

- `channels.defaults.groupPolicy`：当提供商级别的 `groupPolicy` 未设置时的回退群组策略。
- `channels.defaults.contextVisibility`：所有渠道的默认补充上下文可见性模式。值：`all`（默认，包含所有引用/线程/历史上下文），`allowlist`（仅包含来自允许列表发送者的上下文），`allowlist_quote`（与允许列表相同，但保留显式引用/回复上下文）。每个渠道的覆盖选项：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳输出中包含健康的渠道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：渲染紧凑的指示器样式的心跳输出。

### WhatsApp

WhatsApp 通过网关的 Web 渠道（Baileys Web）运行。当存在关联会话时，它会自动启动。

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

- 如果存在帐户 `default`，出站命令默认使用该帐户；否则使用第一个配置的帐户 ID（已排序）。
- 可选的 `channels.whatsapp.defaultAccount` 会在匹配配置的帐户 ID 时覆盖该回退默认帐户选择。
- 旧版单帐户 Baileys 认证目录由 `openclaw doctor` 迁移到 `whatsapp/default`。
- 每帐户覆盖项：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot 令牌：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接），其中 `TELEGRAM_BOT_TOKEN` 作为默认帐户的回退。
- 可选的 `channels.telegram.defaultAccount` 会在匹配配置的帐户 ID 时覆盖默认帐户选择。
- 在多帐户设置（2 个或更多帐户 ID）中，设置显式默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；如果缺失或无效，`openclaw doctor` 会发出警告。
- `configWrites: false` 阻止 Telegram 发起的配置写入（超级组 ID 迁移、`/config set|unset`）。
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目为论坛主题配置持久的 ACP 绑定（在 `match.peer.id` 中使用规范 `chatId:topic:topicId`）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- Telegram 流预览使用 `sendMessage` + `editMessageText`（适用于直接聊天和群组聊天）。
- 重试策略：参见 [Retry policy](/en/concepts/retry)。

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

- 令牌：`channels.discord.token`，其中 `DISCORD_BOT_TOKEN` 作为默认帐户的回退。
- 提供显式 Discord `token` 的直接出站调用使用该令牌进行调用；帐户重试/策略设置仍来自活动运行时快照中选定的帐户。
- 当与配置的帐户 ID 匹配时，可选的 `channels.discord.defaultAccount` 会覆盖默认的帐户选择。
- 对于传递目标，使用 `user:<id>` (私信) 或 `channel:<id>` (公会频道)；不接受纯数字 ID。
- 公会名称 别名为小写，并用 `-` 替换空格；频道键使用别名（无 `#`）。建议优先使用公会 ID。
- 默认情况下会忽略机器人发送的消息。`allowBots: true` 可启用此功能；使用 `allowBots: "mentions"` 可仅接受提及该机器人的机器人消息（机器人自己的消息仍会被过滤）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖）会丢弃提及了其他用户或角色但未提及该机器人的消息（不包括 @everyone/@here）。
- `maxLinesPerMessage`（默认为 17）即使在字符数少于 2000 时也会拆分较长的消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：针对线程绑定会话功能的 Discord 覆盖设置（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定传递/路由）
  - `idleHours`：针对非活动自动取消聚焦的小时数 Discord 覆盖设置（`0` 表示禁用）
  - `maxAgeHours`：针对硬性最长保留时间的小时数 Discord 覆盖设置（`0` 表示禁用）
  - `spawnSubagentSessions`：用于 `sessions_spawn({ thread: true })` 自动线程创建/绑定的启用开关
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目可为频道和线程配置持久的 ACP 绑定（在 `match.peer.id` 中使用频道/线程 ID）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- `channels.discord.ui.components.accentColor` 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.voice` 启用 Discord 语音频道对话以及可选的自动加入 + TTS 覆盖设置。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 透传到 `@discordjs/voice` DAVE 选项（默认为 `true` 和 `24`）。
- 在反复解密失败后，OpenClaw 还会尝试通过退出并重新加入语音会话来恢复语音接收。
- `channels.discord.streaming` 是规范的流模式键。旧的 `streamMode` 和布尔 `streaming` 值会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射到机器人在线状态（healthy => 在线，degraded => 空闲，exhausted => 请勿打扰），并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变名称/标签匹配（应急兼容模式）。
- `channels.discord.execApprovals`：Discord 原生执行批准交付和批准人授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出批准人时，执行批准会激活。
  - `approvers`：获准批准执行请求的 Discord 用户 ID。如果省略，则回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的代理 ID 允许列表。省略以转发所有代理的批准。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：发送批准提示的位置。`"dm"`（默认）发送到批准人 %%PH:GLOSSARY:dms:5258c3e3%%，`"channel"` 发送到原始渠道，`"both"` 发送到两者。当目标包含 `"channel"` 时，按钮仅可供已解析的批准人使用。
  - `cleanupAfterResolve`：当为 `true` 时，在批准、拒绝或超时后删除批准 %%PH:GLOSSARY:dms:5258c3e3%%。

**Reaction notification modes:** `off` (无), `own``all``allowlist` (from `guilds.<id>.users` on all messages).

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

- Service account JSON: inline (`serviceAccount`) or file-based (`serviceAccountFile`).
- Service account SecretRef is also supported (`serviceAccountRef`).
- Env fallbacks: `GOOGLE_CHAT_SERVICE_ACCOUNT` or `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Use `spaces/<spaceId>` or `users/<userId>` for delivery targets.
- `channels.googlechat.dangerouslyAllowNameMatching` re-enables mutable email principal matching (break-glass compatibility mode).

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

- **Socket mode** requires both `botToken` and `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` for default account env fallback).
- **HTTP mode** requires `botToken` plus `signingSecret` (at root or per-account).
- `botToken`, `appToken`, `signingSecret`, and `userToken` accept plaintext
  strings or SecretRef objects.
- Slack account snapshots expose per-credential source/status fields such as
  `botTokenSource`, `botTokenStatus`, `appTokenStatus`, and, in HTTP mode,
  `signingSecretStatus`. `configured_unavailable` means the account is
  configured through SecretRef but the current command/runtime path could not
  resolve the secret value.
- `configWrites: false` blocks Slack-initiated config writes.
- Optional `channels.slack.defaultAccount` overrides default account selection when it matches a configured account id.
- `channels.slack.streaming.mode` is the canonical Slack stream mode key. `channels.slack.streaming.nativeTransport` controls Slack's native streaming transport. Legacy `streamMode`, boolean `streaming`, and `nativeStreaming` values are auto-migrated.
- 使用 `user:<id>` (私信) 或 `channel:<id>` 作为传递目标。

**Reaction 通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**Thread 会话隔离：** `thread.historyScope` 是按 thread 隔离（默认）或在渠道间共享。`thread.inheritParent` 会将父渠道的转录内容复制到新的 thread。

- Slack 原生流式传输以及 Slack 助手风格的“正在输入...”thread 状态需要一个回复 thread 目标。顶级私信默认保持非 thread 模式，因此它们使用 `typingReaction` 或普通传递，而不是 thread 风格的预览。
- `typingReaction` 在运行回复时向传入的 Slack 消息添加一个临时的 reaction，然后在完成时将其移除。使用 Slack 表情符号 shortcode，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 exec 批准传递和批准者授权。与 Discord 的架构相同：`enabled` (`true`/`false`/`"auto"`)、`approvers`（Slack 用户 ID）、`agentFilter`、`sessionFilter` 和 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| Action group | 默认值  | 备注                   |
| ------------ | ------- | ---------------------- |
| reactions    | enabled | React + list reactions |
| messages     | enabled | Read/send/edit/delete  |
| pins         | enabled | Pin/unpin/list         |
| memberInfo   | enabled | Member info            |
| emojiList    | enabled | Custom emoji list      |

### Mattermost

Mattermost 作为一个插件提供：`openclaw plugins install @openclaw/mattermost`。

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

聊天模式：`oncall`（在 @-mention 时响应，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

当启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl` 必须解析为 OpenClaw 网关端点，并且可从 Mattermost 服务器访问。
- 原生斜杠回调使用 Mattermost 在斜杠命令注册期间返回的每个命令的令牌进行身份验证。如果注册失败或没有激活任何命令，OpenClaw 将拒绝带有 `Unauthorized: invalid command token.` 的回调
- 对于私有/tailnet/内部回调主机，Mattermost 可能要求 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回调主机/域。
  使用主机/域值，而不是完整的 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在渠道中回复之前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：按渠道覆盖提及控制（默认为 `"*"`）。
- 可选的 `channels.mattermost.defaultAccount` 在匹配配置的账户 ID 时覆盖默认账户选择。

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

- `channels.signal.account`：将渠道启动固定到特定的 Signal 账户身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 发起的配置写入。
- 可选的 `channels.signal.defaultAccount` 在匹配配置的账户 ID 时覆盖默认账户选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 路径（插件支持，在 `channels.bluebubbles` 下配置）。

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
- 可选的 `channels.bluebubbles.defaultAccount` 在匹配配置的账户 ID 时覆盖默认账户选择。
- 顶级 `bindings[]` 条目（带有 `type: "acp"`）可以将 BlueBubbles 会话绑定到持久的 ACP 会话。在 `match.peer.id` 中使用 BlueBubbles 句柄或目标字符串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/en/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 渠道配置文档见 [BlueBubbles](/en/channels/bluebubbles)。

### iMessage

OpenClaw 生成 `imsg rpc`（通过 stdio 的 JSON-RPC）。无需守护进程或端口。

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

- 可选的 `channels.imessage.defaultAccount` 会在匹配已配置的帐户 ID 时覆盖默认帐户选择。

- 需要对 Messages 数据库进行完全磁盘访问。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；设置 `remoteHost`（`host` 或 `user@host`）以进行 SCP 附件获取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密钥检查，因此请确保中继主机密钥已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝 iMessage 发起的配置写入。
- 顶级 `bindings[]` 条目（带有 `type: "acp"`）可以将 iMessage 会话绑定到持久的 ACP 会话。在 `match.peer.id` 中使用规范化句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/en/tools/acp-agents#channel-specific-settings)。

<Accordion title="iMessage SSH wrapper example">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 基于扩展并在 `channels.matrix` 下进行配置。

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

- 令牌身份验证使用 `accessToken`；密码身份验证使用 `userId` + `password`。
- `channels.matrix.proxy` 通过指定的 HTTP(S) 代理路由 Matrix HTTP 流量。命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖此设置。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许使用私有/内部主服务器。`proxy` 和此网络选择是独立的控制项。
- `channels.matrix.defaultAccount` 在多账户设置中选择首选账户。
- `channels.matrix.autoJoin` 默认为 `off`，因此被邀请的房间和新的私信风格邀请将被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 设置 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：原生 Matrix 的执行批准传递和批准者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出批准者时，执行批准将被激活。
  - `approvers`：允许批准执行请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的代理 ID 允许列表。省略以转发所有代理的批准。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：发送批准提示的位置。`"dm"`（默认）、`"channel"`（起始房间）或 `"both"`。
  - 按账户覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix 私信如何分组到会话中：`per-user`（默认）按路由对等方共享，而 `per-room` 隔离每个私信房间。
- Matrix 状态探测和实时目录查找使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、定位规则和设置示例记录在 [Matrix](/en/channels/matrix) 中。

### Microsoft Teams

Microsoft Teams 由扩展支持，并在 `channels.msteams` 下进行配置。

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
- 完整的 Teams 配置（凭据、webhook、私信/群组策略、每个团队/每个渠道的覆盖设置）记录在 Microsoft Teams(/en/channels/msteams) 中。

### IRC

IRC 由扩展支持，并在 `channels.irc` 下进行配置。

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
- 当可选的 `channels.irc.defaultAccount` 匹配已配置的帐户 ID 时，它将覆盖默认的帐户选择。
- 完整的 IRC 渠道配置（主机/端口/TLS/渠道/允许列表/提及门控）记录在 IRC(/en/channels/irc) 中。

### 多帐户（所有渠道）

为每个渠道运行多个帐户（每个帐户都有自己的 `accountId`）：

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

- 当省略 `accountId` 时（CLI + 路由），使用 `default`。
- 环境令牌仅适用于**默认**帐户。
- 基本渠道设置适用于所有帐户，除非按帐户覆盖。
- 使用 `bindings[].match.accountId` 将每个帐户路由到不同的代理。
- 如果您在仍处于单帐户顶级渠道配置时通过 `openclaw channels add`（或渠道新手引导）添加非默认帐户，OpenClaw 会首先将帐户范围的顶级单帐户值提升到渠道帐户映射中，以便原始帐户继续工作。大多数渠道会将它们移动到 `channels.<channel>.accounts.default` 中；Matrix 可以改为保留现有的匹配命名/默认目标。
- 现有的仅渠道绑定（没有 `accountId`）继续匹配默认帐户；帐户范围绑定仍然是可选的。
- `openclaw doctor --fix` 还会通过将帐户范围的顶级单帐户值移动到为该渠道选择的提升帐户中来修复混合形状。大多数渠道使用 `accounts.default`；Matrix 可以改为保留现有的匹配命名/默认目标。

### 其他扩展渠道

许多扩展渠道配置为 `channels.<id>`，并在其专门的渠道页面中进行了记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的渠道索引：[Channels](/en/channels)。

### 群聊提及限制

群组消息默认为**需要提及**（元数据提及或安全的正则表达式模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群组聊天。

**提及类型：**

- **元数据提及**：平台原生的 @-提及。在 WhatsApp 自聊模式下被忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正则表达式模式。无效的模式和不安全的嵌套重复将被忽略。
- 仅在能够进行检测时（原生提及或至少一个模式），才会强制执行提及限制。

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

`messages.groupChat.historyLimit` 设置全局默认值。渠道可以使用 `channels.<channel>.historyLimit` 覆盖（或按账户）。设置 `0` 以禁用。

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

解析顺序：每个私信的覆盖 → 提供商默认值 → 无限制（全部保留）。

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

在 `allowFrom` 中包含您自己的号码以启用自聊模式（忽略原生 @-提及，仅响应文本模式）：

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

### 指令（聊天指令处理）

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

- 此块配置命令界面。有关当前内置 + 捆绑的命令目录，请参阅 [Slash Commands](/en/tools/slash-commands)。
- 此页面是 **配置键参考**，而非完整的命令目录。渠道/插件拥有的命令（如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、设备配对 `/pair`、记忆 `/dreaming`、手机控制 `/phone` 和 Talk `/voice`）记录在其各自的渠道/插件页面以及 [Slash Commands](/en/tools/slash-commands) 中。
- 文本命令必须是带有前缀 `/` 的 **独立** 消息。
- `native: "auto"` 为 Discord/Telegram 开启原生命令，保持 Slack 关闭。
- `nativeSkills: "auto"` 为 Discord/Telegram 开启原生技能命令，保持 Slack 关闭。
- 按渠道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。`false` 清除先前注册的命令。
- 使用 `channels.<provider>.commands.nativeSkills` 按渠道覆盖原生技能注册。
- `channels.telegram.customCommands` 添加额外的 Telegram 机器人菜单条目。
- `bash: true` 为主机 Shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 和位于 `tools.elevated.allowFrom.<channel>` 中的发送者。
- `config: true` 启用 `/config`（读取/写入 `openclaw.json`）。对于网关 `chat.send` 客户端，持久化 `/config set|unset` 写入还需要 `operator.admin`；只读 `/config show` 对普通写入范围的 Operator 客户端仍然可用。
- `mcp: true` 为 OpenClaw 管理的 `mcp.servers` 下的 MCP 服务器配置启用 `/mcp`。
- `plugins: true` 启用 `/plugins` 以用于插件发现、安装和启用/禁用控制。
- `channels.<provider>.configWrites` 限制每个渠道的配置变更（默认：true）。
- 对于多账户渠道，`channels.<provider>.accounts.<id>.configWrites` 还限制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 禁用 `/restart` 和网关重启工具操作。默认值：`true`。
- `ownerAllowFrom` 是仅所有者命令/工具的显式所有者允许列表。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 在系统提示中对所有者 ID 进行哈希处理。设置 `ownerDisplaySecret` 以控制哈希。
- `allowFrom` 是针对每个提供商的。设置后，它是 **唯一** 的授权来源（渠道允许列表/配对和 `useAccessGroups` 将被忽略）。
- 当未设置 `allowFrom` 时，`useAccessGroups: false` 允许命令绕过访问组策略。
- 命令文档映射：
  - 内置 + 捆绑目录：[Slash Commands](/en/tools/slash-commands)
  - 特定于渠道的命令界面：[Channels](/en/channels)
  - QQ Bot 命令：[QQ Bot](/en/channels/qqbot)
  - 配对命令：[Pairing](/en/channels/pairing)
  - LINE 卡片命令：[LINE](/en/channels/line)
  - 记忆梦境：[Dreaming](/en/concepts/dreaming)

</Accordion>

---

## Agent 默认值

### `agents.defaults.workspace`

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

系统提示的运行时行中显示的可选仓库根目录。如果未设置，OpenClaw 会通过从工作区向上遍历来自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

针对未设置
`agents.list[].skills` 的代理的可选默认技能允许列表。

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

- 省略 `agents.defaults.skills` 以默认允许无限制技能。
- 省略 `agents.list[].skills` 以继承默认值。
- 设置 `agents.list[].skills: []` 表示无技能。
- 非空的 `agents.list[].skills` 列表是该代理的最终集合；它
  不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自动创建。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何时将工作区引导文件注入系统提示。默认值：`"always"`。

- `"continuation-skip"`：安全继续轮次（在完成的助手响应之后）跳过工作区引导的重新注入，从而减小提示大小。心跳运行和压缩后的重试仍会重建上下文。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
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

在所有工作区引导文件中注入的最大总字符数。默认值：`150000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

当引导上下文被截断时，控制代理可见的警告文本。
默认值：`"once"`。

- `"off"`：从不将警告文本注入系统提示。
- `"once"`：每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：每次运行时存在截断均注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

在调用提供商之前，transcript/工具 图像块中图像最长边的最大像素尺寸。
默认值：`1200`。

较低的值通常会减少大量截图运行时的视觉令牌使用量和请求负载大小。
较高的值可以保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（而非消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统偏好）。

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

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主要模型。
  - 对象形式设置主要模型以及有序的故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当选定/默认模型无法接受图像输入时，也用作故障转移路由。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的图像生成功能以及任何生成图像的未来工具/插件界面使用。
  - 典型值：用于原生 Gemini 图像生成的 `google/gemini-3.1-flash-image-preview`，用于 fal 的 `fal/fal-ai/flux/dev`，或用于 OpenAI Images 的 `openai/gpt-image-1`。
  - 如果直接选择提供商/模型，请同时配置匹配的提供商 auth/API 密钥（例如 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 的 `OPENAI_API_KEY`，`fal/*` 的 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍然可以推断出支持身份验证的提供商默认值。它首先尝试当前默认提供商，然后按提供商 ID 顺序尝试剩余的注册图像生成提供商。
- `musicGenerationModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由共享的音乐生成功能和内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.5+`。
  - 如果省略，`music_generate` 仍然可以推断出基于身份验证的提供商默认值。它会首先尝试当前的默认提供商，然后按提供商 ID 的顺序尝试其余已注册的音乐生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商身份验证/API 密钥。
- `videoGenerationModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由共享的视频生成功能和内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推断出基于身份验证的提供商默认值。它会首先尝试当前的默认提供商，然后按提供商 ID 的顺序尝试其余已注册的视频生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商身份验证/API 密钥。
  - 捆绑的 Qwen 视频生成提供商目前支持最多 1 个输出视频、1 个输入图像、4 个输入视频、10 秒的持续时间，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后再回退到解析后的会话/默认模型。
- `pdfMaxBytesMb`：调用时未传递 `maxBytesMb` 的情况下，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考虑的默认最大页数。
- `verboseDefault`：代理的默认详细级别。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `elevatedDefault`：代理的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.4`）。如果省略提供商，OpenClaw 会首先尝试别名，然后针对该确切的模型 ID 尝试唯一配置的提供商匹配，仅在此之后才会回退到配置的默认提供商（已弃用的兼容性行为，因此首选显式的 `provider/model`）。如果该提供商不再暴露配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示过时的已移除提供商的默认值。
- `models`：为 `/model` 配置的模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 处设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）被 `agents.defaults.models["provider/model"].params`（每个模型）覆盖，然后 `agents.list[].params`（匹配的 agent id）按键覆盖。详情请参阅 [Prompt Caching](/en/reference/prompt-caching)。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 和回退添加/删除命令）会保存规范的对象形式，并在可能的情况下保留现有的回退列表。
- `maxConcurrent`：跨会话的最大并行 agent 运行次数（每个会话仍然序列化）。默认值：4。

**内置别名简写**（仅当模型处于 `agents.defaults.models` 时适用）：

| 别名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您配置的别名始终优先于默认值。

Z.AI GLM-4.x 模型会自动启用思考模式，除非您设置了 `--thinking off` 或自己定义了 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型默认为工具调用流式传输启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 以禁用它。
Anthropic Claude 4.6 模型在未设置显式思考级别时默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于仅文本回退运行（无工具调用）的可选 CLI 后端。当 API 提供商失败时，可用作备份。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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

- CLI 后端以文本为主；工具始终处于禁用状态。
- 当设置了 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。

### `agents.defaults.heartbeat`

定期心跳运行。

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

- `every`：持续时间字符串（毫秒/秒/分/小时）。默认值：`30m`（API 密钥认证）或 `1h`（OAuth 认证）。设置为 `0m` 可禁用。
- `suppressToolErrorWarnings`：当为 true 时，在心跳运行期间抑制工具错误警告负载。
- `directPolicy`：直接/私信传递策略。`allow`（默认）允许直接目标传递。`block` 抑制直接目标传递并发出 `reason=dm-blocked`。
- `lightContext`：当为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：当为 true 时，每次心跳都在没有先前对话历史记录的新会话中运行。与 cron `sessionTarget: "isolated"` 的隔离模式相同。将每次心跳的 token 成本从约 100K 降低到约 2-5K token。
- 按代理：设置 `agents.list[].heartbeat`。当任何代理定义了 `heartbeat` 时，**仅这些代理**运行心跳。
- 心跳运行完整的代理轮次 — 间隔越短消耗的 token 越多。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
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

- `mode`：`default` 或 `safeguard`（针对长历史的分块摘要）。请参阅 [Compaction](/en/concepts/compaction)。
- `provider`：已注册的压缩提供商插件 ID。设置后，将调用提供商的 `summarize()`，而不是内置 LLM 摘要。失败时回退到内置。设置提供商会强制启用 `mode: "safeguard"`。请参阅 [Compaction](/en/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止单次压缩操作之前允许的最大秒数。默认值：`900`。
- `identifierPolicy`: `strict` (默认)、`off` 或 `custom`。`strict` 在压缩摘要期间前置内置的不透明标识符保留指导。
- `identifierInstructions`: 可选的自定义标识符保留文本，当 `identifierPolicy=custom` 时使用。
- `postCompactionSections`: 可选的 AGENTS.md H2/H3 部分名称，用于在压缩后重新注入。默认为 `["Session Startup", "Red Lines"]`；设置为 `[]` 可禁用重新注入。当未设置或显式设置为该默认值对时，较旧的 `Every Session`/`Safety` 标题也会被接受作为旧版回退。
- `model`: 可选的 `provider/model-id` 覆盖设置，仅用于压缩摘要。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时使用此选项；未设置时，压缩使用会话的主模型。
- `notifyUser`: 当为 `true` 时，在压缩开始时向用户发送简短通知（例如，“正在压缩上下文...”）。默认情况下禁用，以使压缩保持静默。
- `memoryFlush`: 自动压缩之前的静默代理轮次，用于存储持久记忆。当工作区为只读时跳过。

### `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪**旧工具结果**。**不**修改磁盘上的会话历史记录。

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

- `mode: "cache-ttl"` 启用清理过程。
- `ttl` 控制清理可以再次运行的频率（在最后一次缓存接触之后）。
- 清理会首先软修剪超大的工具结果，然后在需要时硬清除较旧的工具结果。

**软修剪**保留开头 + 结尾，并在中间插入 `...`。

**硬清除**将整个工具结果替换为占位符。

注意：

- 图像块永远不会被修剪/清除。
- 比率是基于字符的（大约值），而不是确切的 token 数量。
- 如果存在的助手消息少于 `keepLastAssistants` 条，则跳过清理。

</Accordion>

有关行为详情，请参阅 [会话修剪](/en/concepts/session-pruning)。

### 分块流式传输

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

- 非 Telegram 渠道需要明确的 `*.blockStreaming: true` 才能启用块回复。
- 渠道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每个账户的变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500ms。每个代理的覆盖：`agents.list[].humanDelay`。

有关行为 + 分块详情，请参阅 [流式传输](/en/concepts/streaming)。

### 输入指示器

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

- 默认值：`instant` 用于直接聊天/提及，`message` 用于未被提及的群组聊天。
- 每个会话的覆盖：`session.typingMode`，`session.typingIntervalSeconds`。

请参阅 [输入指示器](/en/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱隔离。有关完整指南，请参阅 [沙箱隔离](/en/gateway/sandboxing)。

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

<Accordion title="沙箱详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用的基于 SSH 的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，特定于运行时的设置会移至
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 格式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于每个作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：内联内容或 SecretRefs，OpenClaw 在运行时将其具体化为临时文件
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略调整项

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 基于 SecretRef 的 `*Data` 值在沙箱会话开始之前从活动的机密运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后初始化远程工作区一次
- 然后保持远程 SSH 工作区为权威状态
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动将远程更改同步回主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`：位于 `~/.openclaw/sandboxes` 下的每个作用域沙箱工作区
- `ro`：位于 `/workspace` 的沙箱工作区，代理工作区以只读方式挂载于 `/agent`
- `rw`：代理工作区以读/写方式挂载于 `/workspace`

**作用域：**

- `session`：每个会话的容器 + 工作区
- `agent`：每个代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**OpenShell 插件配置：**

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

**OpenShell 模式：**

- `mirror`：执行前从本地初始化远程，执行后同步回；本地工作区保持权威状态
- `remote`：创建沙箱时初始化远程一次，然后保持远程工作区为权威状态

在 `remote` 模式下，在 OpenClaw 之外进行的主机本地编辑不会在初始化步骤后自动同步到沙箱中。
传输是通过 SSH 进入 OpenShell 沙箱，但插件拥有沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出口、可写根目录、root 用户。

**容器默认为 `network: "none"`** — 如果代理需要出站访问，请设置为 `"bridge"`（或自定义桥接网络）。
`"host"` 被阻止。`"container:<id>"` 默认被阻止，除非您显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（紧急情况）。

**入站附件** 被暂存到活动工作区中的 `media/inbound/*`。

**`docker.binds`** 挂载其他主机目录；全局和每个代理的绑定项会被合并。

**沙箱浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 注入到系统提示中。不需要 `browser.enabled` 位于 `openclaw.json` 中。
noVNC 观察者访问默认使用 VNC 身份验证，并且 OpenClaw 会发出一个短期令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙箱会话以主机浏览器为目标。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当您明确希望使用全局桥接连接时才设置为 `bridge`。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站流量限制为 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将额外的主机目录挂载到沙箱浏览器容器中。当设置时（包括 `[]`），它将替换浏览器容器的 `docker.binds`。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了优化：
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
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 默认
    已启用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用它们。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程依赖于扩展程序，则重新启用它们。
  - `--renderer-process-limit=2` 可以通过
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 进行更改；设置 `0` 以使用 Chromium 的
    默认进程限制。
  - 另外当启用 `noSandbox` 时，包含 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 默认值是容器镜像基线；使用带有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙箱隔离和 `sandbox.docker.binds` 目前仅支持 Docker。

构建镜像：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list`（每个代理的覆盖设置）

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

- `id`：稳定的代理 ID（必填）。
- `default`：当设置了多个时，第一个生效（会记录警告）。如果未设置，则默认使用列表中的第一个条目。
- `model`：字符串形式仅覆盖 `primary`；对象形式 `{ primary, fallbacks }` 覆盖两者（`[]` 禁用全局回退）。仅覆盖 `primary` 的定时任务仍会继承默认回退，除非您设置了 `fallbacks: []`。
- `params`：每个代理的流参数，与 `agents.defaults.models` 中所选模型条目合并。将其用于代理特定的覆盖设置，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需复制整个模型目录。
- `skills`：可选的每个代理技能允许列表。如果省略，代理将继承设置的 `agents.defaults.skills`；显式列表会替换默认值而不是合并，并且 `[]` 表示没有技能。
- `thinkingDefault`：可选的每个代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive`）。当未设置每条消息或会话覆盖时，覆盖此代理的 `agents.defaults.thinkingDefault`。
- `reasoningDefault`：可选的每个代理默认推理可见性（`on | off | stream`）。在未设置每条消息或会话推理覆盖时应用。
- `fastModeDefault`：可选的每个代理快速模式默认值（`true | false`）。在未设置每条消息或会话快速模式覆盖时应用。
- `runtime`：可选的每个代理运行时描述符。当代理应默认为 ACP 驱动程序会话时，使用带有 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）的 `type: "acp"`。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：从 `emoji` 派生 `ackReaction`，从 `name`/`emoji` 派生 `mentionPatterns`。
- `subagents.allowAgents`：`sessions_spawn` 的代理 ID 白名单（`["*"]` = 任意；默认：仅限同一代理）。
- 沙箱继承保护：如果请求者的会话处于沙箱隔离状态，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。
- `subagents.requireAgentId`：为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件；默认：false）。

---

## 多代理路由

在一个 Gateway(网关) 内运行多个隔离的代理。请参阅 [Multi-Agent](/en/concepts/multi-agent)。

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

- `type`（可选）：用于正常路由的 `route`（缺少类型默认为 route），用于持久化 ACP 会话绑定的 `acp`。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；特定于渠道）
- `acp`（可选；仅限 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（渠道范围内）
6. 默认代理

在每个层级内，第一个匹配的 `bindings` 条目生效。

对于 `type: "acp"` 条目，OpenClaw 通过精确的会话身份（`match.channel` + account + `match.peer.id`）进行解析，并不使用上述路由绑定层级顺序。

### 每代理访问配置文件

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
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息）">

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

有关优先级的详细信息，请参阅 [Multi-Agent 沙箱 & Tools](/en/tools/multi-agent-sandbox-tools)。

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

- **`scope`**：群聊上下文的基础会话分组策略。
  - `per-sender`（默认）：每个发送者在渠道上下文中获得一个独立的会话。
  - `global`：渠道上下文中的所有参与者共享一个会话（仅在打算共享上下文时使用）。
- **`dmScope`**：私信的分组方式。
  - `main`：所有私信共享主会话。
  - `per-peer`：在渠道之间按发送者 ID 隔离。
  - `per-channel-peer`：按渠道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账户 + 渠道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**：将规范 ID 映射到提供商前缀的对等节点，以便跨渠道共享会话。
- **`reset`**：主要重置策略。`daily` 在 `atHour` 本地时间重置；`idle` 在 `idleMinutes` 之后重置。如果两者都配置了，则先到期的那个生效。
- **`resetByType`**：按类型的覆盖（`direct`、`group`、`thread`）。传统 `dm` 被接受为 `direct` 的别名。
- **`parentForkMaxTokens`**：创建分支线程会话时允许的最大父会话 `totalTokens`（默认 `100000`）。
  - 如果父 `totalTokens` 高于此值，OpenClaw 将启动一个新的线程会话，而不是继承父记录历史。
  - 设置 `0` 以禁用此保护并始终允许父分支。
- **`mainKey`**：传统字段。运行时现在总是对主直接聊天存储桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**：代理之间交换期间的最大回复轮次（整数，范围：`0`–`5`）。`0` 禁用乒乓链接。
- **`sendPolicy`**：按 `channel`、`chatType`（`direct|group|channel`，带有传统 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。优先匹配拒绝规则。
- **`maintenance`**：会话存储清理 + 保留控制。
  - `mode`：`warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`：陈旧条目的时间限制（默认 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大条目数（默认 `500`）。
  - `rotateBytes`：当 `sessions.json` 超过此大小时轮换（默认 `10mb`）。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 记录档案的保留期。默认为 `pruneAfter`；设置 `false` 以禁用。
  - `maxDiskBytes`：可选的会话目录磁盘预算。在 `warn` 模式下，它记录警告；在 `enforce` 模式下，它首先删除最旧的工件/会话。
  - `highWaterBytes`：预算清理后的可选目标。默认为 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**：线程绑定会话功能的全局默认值。
  - `enabled`：主默认开关（提供商可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：默认的非活动自动取消聚焦时间，以小时为单位（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`：默认的硬性最大期限，以小时为单位（`0` 禁用；提供商可以覆盖）

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

每个渠道/账户的覆盖设置：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析规则（优先级最高者获胜）：account → 渠道 → global。`""` 会禁用并停止级联。`"auto"` 会推导 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述           | 示例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 简短模型名称   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识符 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称     | `anthropic`                 |
| `{thinkingLevel}` | 当前思考级别   | `high`、`low`、`off`        |
| `{identity.name}` | 代理身份名称   | （与 `"auto"` 相同）        |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为活动代理的 `identity.emoji`，否则为 `"👀"`。设置 `""` 以禁用。
- 每个渠道的覆盖设置：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：account → 渠道 → `messages.ackReaction` → identity fallback。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord 和 Telegram 上回复后移除确认反应。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上启用生命周期状态反应。
  在 Slack 和 Discord 上，未设置时会在确认反应处于活动状态时保持启用状态反应。
  在 Telegram 上，需将其显式设置为 `true` 以启用生命周期状态反应。

### 入站防抖

将来自同一发送者的连续纯文本消息批处理为单个代理轮次。媒体/附件会立即刷新。控制命令会绕过防抖。

### TTS (text-to-speech)

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

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地首选项，而 `/tts status` 显示有效状态。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（选择性加入）。
- API 密钥回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 覆盖 OpenAI TTS 端点。解析顺序为配置，然后 `OPENAI_TTS_BASE_URL`，然后 `https://api.openai.com/v1`。
- 当 `openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为兼容 OpenAI 的 TTS 服务器并放宽模型/声音验证。

---

## Talk

Talk 模式的默认值（macOS/iOS/Android）。

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

- 当配置了多个 Talk 提供商时，`talk.provider` 必须与 `talk.providers` 中的键匹配。
- 旧的扁平 Talk 密钥（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性，并会自动迁移到 `talk.providers.<provider>` 中。
- 语音 ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API 密钥时应用。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `silenceTimeoutMs` 控制 Talk 模式在用户静音后发送转录之前等待的时间。未设置则保持平台默认暂停窗口（`700 ms on macOS and Android, 900 ms on iOS`）。

---

## 工具

### 工具配置文件

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置基本允许列表：

本地新手引导在未设置时将新的本地配置默认为 `tools.profile: "coding"`（保留现有的显式配置文件）。

| 配置文件    | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                                                             |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | 无限制（与未设置相同）                                                                                                          |

### 工具组

| 组                 | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution`（`bash` 被接受为 `exec` 的别名）                                                    |
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
| `group:openclaw`   | 所有内置工具（不包括提供商插件）                                                                                        |

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。不区分大小写，支持 `*` 通配符。即使当 Docker 沙箱关闭时也会应用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

进一步限制特定提供商或模型的工具。顺序：基础配置文件 → 提供商配置文件 → 允许/拒绝。

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

控制沙箱外的提升执行访问权限：

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
- 提升的 `exec` 绕过沙箱隔离并使用配置的转义路径（默认为 `gateway`，或者当执行目标为 `node` 时为 `node`）。

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

工具循环安全检查**默认禁用**。设置 `enabled: true` 以激活检测。
设置可以在 `tools.loopDetection` 中全局定义，并在 `agents.list[].tools.loopDetection` 中按代理覆盖。

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

- `historySize`：保留用于循环分析的最大工具调用历史记录。
- `warningThreshold`：重复无进展模式的警告阈值。
- `criticalThreshold`：用于阻止严重循环的更高重复阈值。
- `globalCircuitBreakerThreshold`：任何无进展运行的硬停止阈值。
- `detectors.genericRepeat`：对重复的相同工具/相同参数调用发出警告。
- `detectors.knownPollNoProgress`：对已知的轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
- `detectors.pingPong`：对交替的无进度对模式发出警告/阻止。
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

配置入站媒体理解（图像/音频/视频）：

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

<Accordion title="Media 模型 entry fields">

**Provider entry** (`type: "provider"` 或省略):

- `provider`: API 提供商 id (`openai`, `anthropic`, `google`/`gemini`, `groq`, 等)
- `model`: 模型 id 覆盖
- `profile` / `preferredProfile`: `auth-profiles.json` 配置文件选择

**CLI entry** (`type: "cli"`):

- `command`: 要运行的可执行文件
- `args`: 模板化参数 (支持 `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, 等)

**Common fields:**

- `capabilities`: 可选列表 (`image`, `audio`, `video`)。默认值: `openai`/`anthropic`/`minimax` → 图像, `google` → 图像+音频+视频, `groq` → 音频。
- `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: 每个条目的覆盖。
- 失败将回退到下一个条目。

Provider auth 遵循标准顺序: `auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

**Async completion fields:**

- `asyncCompletion.directSend`: 当为 `true` 时，已完成的异步 `music_generate`
  和 `video_generate` 任务会首先尝试直接渠道投递。默认值: `false`
  (旧版 requester-会话 wake/模型-delivery 路径)。

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

控制哪些会话可以由会话工具（`sessions_list`、`sessions_history`、`sessions_send`）作为目标。

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
- `all`：任何会话。跨代理定位仍然需要 `tools.agentToAgent`。
- 沙箱限制：当当前会话处于沙箱隔离状态且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，即使 `tools.sessions.visibility="all"`，可见性也会被强制设为 `tree`。

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
- 文件被具体化到子工作空间中的 `.openclaw/attachments/<uuid>/` 并带有 `.manifest.json`。
- 附件内容会自动从转录持久化中编辑掉。
- Base64 输入会通过严格的字母表/填充检查和预解码大小保护进行验证。
- 目录的文件权限为 `0700`，文件的权限为 `0600`。
- 清理遵循 `cleanup` 策略：`delete` 始终移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

### `tools.experimental`

实验性内置工具标志。除非应用了特定于运行时的自动启用规则，否则默认关闭。

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

说明：

- `planTool`：为非平凡的多步骤工作跟踪启用结构化 `update_plan` 工具。
- 默认值：对于非 OpenAI 提供商为 `false`。OpenAI 和 OpenAI Codex 运行时若未设置则自动启用；设置 `false` 可禁用该自动启用功能。
- 启用后，系统提示词还会添加使用指南，以便模型仅将其用于实质性工作，并最多保持一个步骤 `in_progress`。

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

- `model`：生成的子代理的默认模型。如果省略，子代理将继承调用者的模型。
- `allowAgents`：当请求代理未设置其自己的 `subagents.allowAgents` 时，`sessions_spawn` 的目标代理 ID 的默认允许列表（`["*"]` = 任意；默认值：仅限同一代理）。
- `runTimeoutSeconds`：当工具调用省略 `runTimeoutSeconds` 时，`sessions_spawn` 的默认超时时间（秒）。`0` 表示无超时。
- 按子代理划分的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义提供商和基础 URL

OpenClaw 使用内置模型目录。通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义提供商。

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

- 使用 `authHeader: true` + `headers` 满足自定义身份验证需求。
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`，一个旧版环境变量别名）覆盖代理配置根目录。
- 匹配的提供商 ID 的合并优先级：
  - 非空代理 `models.json` `baseUrl` 值优先。
  - 仅当该提供商在当前配置/身份验证配置文件上下文中不受 SecretRef 管理时，非空代理 `apiKey` 值才优先。
  - SecretRef 管理的提供商 `apiKey` 值从源标记（环境变量引用为 `ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新，而不是持久化已解析的机密。
  - SecretRef 管理的提供商标头值从源标记（环境变量引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新。
  - 空或缺失的代理 `apiKey`/`baseUrl` 将回退到配置中的 `models.providers`。
  - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置和隐式目录值中的较高者。
  - 匹配的模型 `contextTokens` 在存在时保留显式运行时上限；使用它来限制有效上下文而不更改原生模型元数据。
  - 当您希望配置完全重写 `models.json` 时，请使用 `models.mode: "replace"`。
  - 标记持久化是以源为权威的：标记是从活动源配置快照（解析前）写入的，而不是从解析后的运行时密钥值写入的。

### 提供商字段详细信息

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：按提供商 ID 键入的自定义提供商映射。
- `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：提供商凭证（优先使用 SecretRef/环境变量替换）。
- `models.providers.*.auth`：身份验证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：对于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求中（默认：`true`）。
- `models.providers.*.authHeader`：在需要时强制在 `Authorization` 标头中传输凭证。
- `models.providers.*.baseUrl`：上游 API 基础 URL。
- `models.providers.*.headers`：用于代理/租户路由的额外静态标头。
- `models.providers.*.request`：针对模型提供商 HTTP 请求的传输覆盖设置。
  - `request.headers`：额外标头（与提供商默认值合并）。值接受 SecretRef。
  - `request.auth`：身份验证策略覆盖。模式：`"provider-default"`（使用提供商的内置身份验证），`"authorization-bearer"`（配合 `token`），`"header"`（配合 `headerName`、`value`，可选 `prefix`）。
  - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量），`"explicit-proxy"`（配合 `url`）。两种模式都接受一个可选的 `tls` 子对象。
  - `request.tls`：用于直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均接受 SecretRef）、`serverName`、`insecureSkipVerify`。
- `models.providers.*.models`：显式的提供商模型目录条目。
- `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。
- `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。当您想要比模型的原生 `contextWindow` 更小的有效上下文预算时，请使用此选项。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：可选的兼容性提示。对于具有非空非原生 `baseUrl`（主机不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 会在运行时将其强制设置为 `false`。如果 `baseUrl` 为空或省略，则保持默认的 OpenAI 行为。
- `models.providers.*.models.*.compat.requiresStringContent`：用于仅接受字符串的 OpenAI 兼容聊天端点的可选兼容性提示。当 `true` 时，OpenClaw 会在发送请求之前将纯文本 `messages[].content` 数组展平为纯字符串。
- `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自动发现设置根目录。
- `plugins.entries.amazon-bedrock.config.discovery.enabled`：开启或关闭隐式发现。
- `plugins.entries.amazon-bedrock.config.discovery.region`：用于发现的 AWS 区域。
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：可选的提供商 ID 过滤器，用于定向发现。
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：发现刷新的轮询间隔。
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已发现模型的备用上下文窗口。
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已发现模型的备用最大输出令牌数。

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

设置 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是可接受的别名。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

- 通用端点：`https://api.z.ai/api/paas/v4`
- 编码端点（默认）：`https://api.z.ai/api/coding/paas/v4`
- 对于通用端点，请通过基础 URL 覆盖来定义自定义提供商。

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

对于中国端点：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

原生 Moonshot 端点在共享的 `openai-completions` 传输上通告流式使用兼容性，并且 OpenClaw 现在根据端点功能而非仅根据内置提供商 ID 来进行识别。

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

兼容 Anthropic 的内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

</Accordion>

<Accordion title="合成 (Anthropic 兼容)">

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

Base URL 应省略 `/v1` (Anthropic 客户端会附加它)。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

</Accordion>

<Accordion title="MiniMax M2.7 (直连)">

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

设置 `MINIMAX_API_KEY`。快捷方式：
`openclaw onboard --auth-choice minimax-global-api` 或
`openclaw onboard --auth-choice minimax-cn-api`。
模型目录现在默认仅限 M2.7。
在 Anthropic 兼容的流式传输路径上，除非您显式自行设置 `thinking`，否则 OpenClaw 默认禁用 MiniMax 思考功能。`/fast on` 或
`params.fastMode: true` 会将 `MiniMax-M2.7` 重写为
`MiniMax-M2.7-highspeed`。

</Accordion>

<Accordion title="本地模型 (LM Studio)">

参见 [Local Models](/en/gateway/local-models)。TL;DR：在强力硬件上通过 LM Studio Responses API 运行大型本地模型；保持托管模型已合并以作为回退。

</Accordion>

---

## Skills

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

- `allowBundled`：可选的允许列表，仅限内置 skills（托管/工作区 skills 不受影响）。
- `load.extraDirs`：额外的共享 skill 根目录（优先级最低）。
- `install.preferBrew`：如果为 true，则在 `brew` 可用时优先使用 Homebrew 安装程序，然后再回退到其他类型的安装程序。
- `install.nodeManager`：`metadata.openclaw.install` 规范的节点安装程序首选项
  (`npm` | `pnpm` | `yarn` | `bun`)。
- `entries.<skillKey>.enabled: false` 即使已内置/安装也会禁用 skill。
- `entries.<skillKey>.apiKey`：便捷设置，用于声明主要环境变量的 skills（纯文本字符串或 SecretRef 对象）。

---

## Plugins

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
- 设备发现接受原生 OpenClaw 插件以及兼容的 Codex 包和 Claude 包，包括无清单的 Claude 默认布局包。
- **配置更改需要重启网关。**
- `allow`：可选的允许列表（仅加载列出的插件）。`deny` 优先生效。
- `plugins.entries.<id>.apiKey`：插件级别的 API 密钥便捷字段（在插件支持时）。
- `plugins.entries.<id>.env`：插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当 `false` 时，核心会阻止 `before_prompt_build` 并忽略来自旧版 `before_agent_start` 的提示变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件钩子和支持的包提供的钩子目录。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任此插件，以请求针对后台子代理运行的每次运行 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：用于受信任的子代理覆盖的规范 `provider/model` 目标的可选允许列表。仅当您有意允许任何模型时，才使用 `"*"`。
- `plugins.entries.<id>.config`：插件定义的配置对象（在可用时由原生 OpenClaw 插件架构验证）。
- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 网页抓取提供商设置。
  - `apiKey`：Firecrawl API 密钥（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`：Firecrawl API 基础 URL（默认：`https://api.firecrawl.dev`）。
  - `onlyMainContent`：仅从页面中提取主要内容（默认：`true`）。
  - `maxAgeMs`：最大缓存时间，以毫秒为单位（默认：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时时间，以秒为单位（默认：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 网络搜索) 设置。
  - `enabled`：启用 X Search 提供商。
  - `model`：用于搜索的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：内存做梦（实验性）设置。有关阶段和阈值，请参阅 [Dreaming](/en/concepts/dreaming)。
  - `enabled`：主做梦开关（默认为 `false`）。
  - `frequency`：每次完整做梦扫描的 cron 频率（默认为 `"0 3 * * *"`）。
  - 阶段策略和阈值是实现细节（不是面向用户的配置键）。
- 完整的内存配置位于 [Memory configuration reference](/en/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已启用的 Claude bundle 插件还可以从 `settings.json` 贡献嵌入式 Pi 默认值；OpenClaw 会将这些值作为经过清理的代理设置应用，而不是作为原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的内存插件 id，或选择 `"none"` 以禁用内存插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 id；除非您安装并选择了其他引擎，否则默认为 `"legacy"`。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理的安装元数据。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 将 `plugins.installs.*` 视为受管理状态；优先使用 CLI 命令而非手动编辑。

参见 [Plugins](/en/tools/plugin)。

---

## 浏览器

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

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- 如果未设置（受信任网络模型），`ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认为 `true`。
- 设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` 以实现仅限公共浏览器的严格导航。
- 在严格模式下，远程 CDP 配置文件端点（`profiles.*.cdpUrl`）在可达性/发现检查期间受到同样的专用网络阻止。
- `ssrfPolicy.allowPrivateNetwork` 作为传统别名仍受支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外处理。
- 远程配置文件仅支持附加（已禁用 start/stop/reset）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)；
  当您的提供商为您提供直接的 DevTools WebSocket URL 时，请使用 WS(S)。
- `existing-session` 配置文件仅限主机，并使用 Chrome MCP 而非 CDP。
- `existing-session` 配置文件可以设置 `userDataDir` 以针对特定的
  基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- `existing-session` 配置文件保持当前的 Chrome MCP 路由限制：
  快照/ref驱动的操作而非 CSS 选择器定位，单文件上传
  钩子，没有对话框超时覆盖，没有 `wait --load networkidle`，也没有
  `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地托管的 `openclaw` 配置文件自动分配 `cdpPort` 和 `cdpUrl`；
  仅针对远程 CDP 显式设置 `cdpUrl`。
- 自动检测顺序：如果基于 Chromium 则为默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务：仅限环回（端口派生自 `gateway.port`，默认 `18791`）。
- `extraArgs` 将额外的启动标志追加到本地 Chromium 启动参数中（例如
  `--disable-gpu`、窗口大小或调试标志）。

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

- `seamColor`：本机应用 UI chrome 的强调色（对话模式气泡色调等）。
- `assistant`：控制 UI 身份覆盖。回退到活动代理身份。

---

## Gateway(网关)

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

<Accordion title="Gateway(网关) 字段详情">

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非为 `local`，否则 Gateway(网关) 拒绝启动。
- `port`：用于 WS + HTTP 的单个多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意**：默认的 `loopback` 绑定在容器内部监听 `127.0.0.1`。在使用 Docker 桥接网络（`-p 18789:18789`）时，流量到达 `eth0`，因此网关不可达。请使用 `--network host`，或者设置 `bind: "lan"`（或配合 `customBindHost: "0.0.0.0"` 设置 `bind: "custom"`）以在所有接口上监听。
- **身份验证**：默认情况下是必需的。非环回绑定需要网关身份验证。实际上，这意味着共享令牌/密码或具有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。新手引导向导默认会生成一个令牌。
- 如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 两者（包括 SecretRefs），请将 `gateway.auth.mode` 显式设置为 `token` 或 `password`。当配置了两者但未设置模式时，启动和服务安装/修复流程将失败。
- `gateway.auth.mode: "none"`：显式的无身份验证模式。仅用于受信任的本地环回设置；新手引导提示故意不提供此选项。
- `gateway.auth.mode: "trusted-proxy"`：将身份验证委托给身份感知反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [可信代理身份验证](/en/gateway/trusted-proxy-auth)）。此模式期望**非环回**代理源；同主机环回反向代理不满足可信代理身份验证。
- `gateway.auth.allowTailscale`：当为 `true` 时，Tailscale Serve 身份标头可以满足控制 UI/WebSocket 身份验证（通过 `tailscale whois` 验证）。HTTP API 端点**不**使用该 Tailscale 标头身份验证；它们遵循网关的正常 HTTP 身份验证模式。此无令牌流程假定网关主机是受信任的。当为 `tailscale.mode = "serve"` 时，默认为 `true`。
- `gateway.auth.rateLimit`：可选的身份验证失败限制器。适用于每个客户端 IP 和每个身份验证范围（共享密钥和设备令牌分别跟踪）。被阻止的尝试返回 `429` + `Retry-After`。
  - 在异步 Tailscale Serve 控制 UI 路径上，同一 `{scope, clientIp}` 的失败尝试在失败写入之前被序列化。因此，来自同一客户端的并发错误尝试可能会在第二个请求时触发限制器，而不是两者作为简单的不匹配进行竞争。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；如果您有意希望也对本地流量进行速率限制（用于测试设置或严格的代理部署），请设置 `false`。
- 浏览器源 WS 身份验证尝试始终受到限制，并禁用环回豁免（针对基于浏览器的本地暴力破解的深度防御）。
- 在环回上，这些浏览器源锁定是按标准化的 `Origin` 值隔离的，因此来自一个本地源的重复失败不会自动锁定另一个源。
- `tailscale.mode`：`serve`（仅 tailnet，环回绑定）或 `funnel`（公开，需要身份验证）。
- `controlUi.allowedOrigins`：用于 Gateway(网关) WebSocket 连接的显式浏览器源允许列表。当预期来自非环回源的浏览器客户端时，这是必需的。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：一种危险模式，它为故意依赖 Host 头源策略的部署启用 Host 头源回退。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，`remote.url` 必须为 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端紧急覆盖，允许明文 `ws://` 连接到受信任的专用网络 IP；明文的默认设置仍为仅环回。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不配置网关身份验证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 构建版本在向网关发布基于中继的注册后使用的外部 APNs 中继的基本 HTTPS URL。此 URL 必须与编译到 iOS 构建版本中的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到中继的发送超时（毫秒）。默认为 `10000`。
- 基于中继的注册被委托给特定的网关身份。配对的 iOS 应用程序获取 `gateway.identity.get`，将该身份包含在中继注册中，并将注册范围的发送授权转发给网关。另一个网关无法重用该存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中继配置的临时环境覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于开发的环回 HTTP 中继 URL 逃生舱。生产环境中继 URL 应保持在 HTTPS 上。
- `gateway.channelHealthCheckMinutes`：渠道健康监视器间隔（分钟）。设置 `0` 以全局禁用健康监视器重启。默认：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧套接字阈值（分钟）。保持此值大于或等于 `gateway.channelHealthCheckMinutes`。默认：`30`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户在滚动一小时内的最大健康监视器重启次数。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`：针对健康监视器重启的按渠道选择退出，同时保持全局监视器处于启用状态。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户渠道的按账户覆盖。设置后，它优先于渠道级别的覆盖。
- 本地网关调用路径仅当 `gateway.auth.*` 未设置时，才能将 `gateway.remote.*` 作为回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析将以失败关闭（没有远程回退掩盖）。
- `trustedProxies`：终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出您控制的代理。环回条目对于同主机代理/本地检测设置（例如 Tailscale Serve 或本地反向代理）仍然有效，但它们**不会**使环回请求有资格进行 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`：当为 `true` 时，如果缺少 `X-Forwarded-For`，网关将接受 `X-Real-IP`。默认 `false` 以实现失败关闭行为。
- `gateway.tools.deny`：针对 HTTP `POST /tools/invoke` 阻止的额外工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- 聊天补全：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- 响应 API：`gateway.http.endpoints.responses.enabled`。
- 响应 URL 输入硬化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的白名单被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 获取。
- 可选的响应硬化标头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅为您控制的 HTTPS 源设置；请参阅 [可信代理认证](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一台主机上运行多个网关，使用唯一的端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`），`--profile <name>`（使用 `~/.openclaw-<name>`）。

请参阅 [多个网关](/en/gateway/multiple-gateways)。

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

- `enabled`：在网关监听器上启用 TLS 终止（HTTPS/WSS）（默认：`false`）。
- `autoGenerate`：当未配置显式文件时，自动生成本地自签名证书/密钥对；仅供本地/开发使用。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；保持权限受限。
- `caPath`：用于客户端验证或自定义信任链的可选 CA 包路径。

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

- `mode`：控制在运行时如何应用配置编辑。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置更改时始终重启网关进程。
  - `"hot"`：在进程内应用更改而无需重启。
  - `"hybrid"`（默认）：首先尝试热重载；如果需要则回退到重启。
- `debounceMs`：应用配置更改前的去抖动窗口（毫秒）（非负整数）。
- `deferralTimeoutMs`：在强制重启前等待进行中操作的最长时间（以毫秒为单位）（默认值：`300000` = 5 分钟）。

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
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth: `Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查询字符串 Hook 令牌会被拒绝。

验证和安全注意事项：

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 必须与 `gateway.auth.token` **不同**；重用 Gateway(网关) 令牌会被拒绝。
- `hooks.path` 不能是 `/`；请使用专用的子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true` 时，才会接受来自请求正文的 `sessionKey`（默认值：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析

<Accordion title="映射详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的负载字段。
- 像 `{{messages[0].subject}}` 这样的模板从负载中读取。
- `transform` 可以指向返回钩子操作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且必须停留在 `hooks.transformsDir` 内部（绝对路径和遍历路径会被拒绝）。
- `agentId` 路由到特定的代理；未知的 ID 会回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许所有，`[]` = 拒绝所有）。
- `defaultSessionKey`：用于在没有显式 `sessionKey` 的情况下运行钩子代理的可选固定会话密钥。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用者设置 `sessionKey`（默认值：`false`）。
- `allowedSessionKeyPrefixes`：用于显式 `sessionKey` 值（请求 + 映射）的可选前缀允许列表，例如 `["hook:"]`。
- `deliver: true` 将最终回复发送到渠道；`channel` 默认为 `last`。
- `model` 为此钩子运行覆盖 LLM（如果设置了模型目录，则必须允许）。

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

- 配置后，Gateway(网关) 会在启动时自动启动 `gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以禁用。
- 不要在 Gateway(网关) 旁边运行单独的 `gog gmail watch serve`。

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

- 通过 HTTP 在 Gateway(网关) 端口下提供可由代理编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅限本地：保持 `gateway.bind: "loopback"`（默认值）。
- 非环回绑定：canvas 路由需要 Gateway(网关) 认证（令牌/密码/受信任代理），与其他 Gateway(网关) HTTP 表面相同。
- Node WebViews 通常不发送认证头；在节点配对并连接后，Gateway(网关) 会通告用于 canvas/A2UI 访问的节点作用域功能 URL。
- 功能 URL 绑定到活动的节点 WS 会话并很快过期。不使用基于 IP 的回退。
- 将实时重载客户端注入到提供的 HTML 中。
- 如果为空，则自动创建初始 `index.html`。
- 还在 `/__openclaw__/a2ui/` 处提供 A2UI。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，请禁用实时重载。

---

## 设备发现

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
- 主机名默认为 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。对于跨网络发现，请搭配 DNS 服务器（推荐 CoreDNS）+ Tailscale 分离 DNS 使用。

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
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（均不覆盖现有变量）。
- `shellEnv`：从您的登录 Shell 配置文件中导入缺少的预期键名。
- 有关完整的优先级，请参阅 [环境](/en/help/environment)。

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
- 缺失/为空的变量会在加载配置时引发错误。
- 使用 `$${VAR}` 转义以表示字面量 `${VAR}`。
- 适用于 `$include`。

---

## 机密

机密引用是累加的：明文值仍然有效。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

验证：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON 指针（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据界面

- 标准矩阵：[SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- `secrets apply` 目标支持的 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用包含在运行时解析和审计覆盖范围内。

### Secret providers 配置

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

说明：

- `file` 提供商支持 `mode: "json"` 和 `mode: "singleValue"`（`id` 在 singleValue 模式下必须为 `"value"`）。
- `exec` 提供商需要绝对的 `command` 路径，并使用 stdin/stdout 上的协议有效载荷。
- 默认情况下，符号链接命令路径会被拒绝。设置 `allowSymlinkCommand: true` 以允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则受信任目录检查适用于解析后的目标路径。
- `exec` 子环境默认是最小的；通过 `passEnv` 显式传递所需的变量。
- Secret 引用在激活时解析为内存快照，然后请求路径仅读取快照。
- 活动界面过滤在激活期间应用：已启用界面上的未解析引用会导致启动/重新加载失败，而非活动界面会被跳过并输出诊断信息。

---

## Auth 存储

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

- Per-agent 配置文件存储在 `<agentDir>/auth-profiles.json`。
- 对于静态凭证模式，`auth-profiles.json` 支持值级引用（`keyRef` 用于 `api_key`，`tokenRef` 用于 `token`）。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持基于 SecretRef 的 auth-profile 凭证。
- 静态运行时凭证来自内存解析的快照；传统的静态 `auth.json` 条目在被发现时会被清除。
- 从 `~/.openclaw/credentials/oauth.json` 传统导入 OAuth。
- 参见 [OAuth](/en/concepts/oauth)。
- Secrets 运行时行为和 `audit/configure/apply` 工具：[Secrets Management](/en/gateway/secrets)。

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

- `billingBackoffHours`：当配置文件因真正的计费/余额不足错误而失败时，以小时为单位的基础退避时间（默认：`5`）。即使在 `401`/`403` 响应上，显式的计费文本仍可能落入此处，但特定提供商的文本匹配器仍仅限于拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。可重试的 HTTP `402` 使用量窗口或组织/工作区支出限制消息则保留在 `rate_limit` 路径中。
- `billingBackoffHoursByProvider`：可选的针对每个提供商的计费退避小时数覆盖设置。
- `billingMaxHours`：计费退避指数增长的小时数上限（默认：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失败的以分钟为单位的基础退避时间（默认：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的分钟数上限（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动时间窗口，以小时为单位（默认：`24`）。
- `overloadedProfileRotations`：在切换到模型回退之前，针对过载错误的最大同提供商身份验证配置文件轮换次数（默认：`1`）。诸如 `ModelNotReadyException` 之类的提供商繁忙（提供商-busy）类型归于此处。
- `overloadedBackoffMs`：重试过载的提供商/配置文件轮换之前的固定延迟（默认：`0`）。
- `rateLimitedProfileRotations`：在切换到模型回退之前，针对速率限制错误的最大同提供商身份验证配置文件轮换次数（默认：`1`）。该速率限制存储桶包括提供商格式的文本，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

---

## 日志记录

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
- 设置 `logging.file` 以获得稳定的路径。
- 当 `--verbose` 时，`consoleLevel` 会升级到 `debug`。
- `maxFileBytes`：抑制写入之前的日志文件最大大小（以字节为单位）（正整数；默认：`524288000` = 500 MB）。生产环境部署请使用外部日志轮换。

---

## 诊断

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

- `enabled`：检测输出的主开关（默认：`true`）。
- `flags`：用于启用目标日志输出的标志字符串数组（支持通配符，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：当会话保持处理状态时，发出卡顿会话警告的年龄阈值（以毫秒为单位）。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认：`false`）。
- `otel.endpoint`：用于 OTel 导出的收集器 URL。
- `otel.protocol`：`"http/protobuf"`（默认）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求一起发送的额外 HTTP/gRPC 元数据标头。
- `otel.serviceName`: 资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`: 启用追踪、指标或日志导出。
- `otel.sampleRate`: 追踪采样率 `0`–`1`。
- `otel.flushIntervalMs`: 定期遥测刷新间隔（毫秒）。
- `cacheTrace.enabled`: 记录嵌入式运行的缓存追踪快照（默认：`false`）。
- `cacheTrace.filePath`: 缓存追踪 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`: 控制缓存追踪输出中包含的内容（默认均为 `true`）。

---

## 更新

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

- `channel`: npm/git 安装的发布渠道 —— `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`: 网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`: 启用包安装的后台自动更新（默认：`false`）。
- `auto.stableDelayHours`: 稳定版自动应用前的最小延迟小时数（默认：`6`；最大值：`168`）。
- `auto.stableJitterHours`: 额外的稳定版分批发布窗口小时数（默认：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`: 测试版检查的运行频率（小时）（默认：`1`；最大值：`24`）。

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

- `enabled`: 全局 ACP 功能开关（默认：`false`）。
- `dispatch.enabled`: ACP 会话轮次调度的独立开关（默认：`true`）。设置为 `false` 可在阻止执行的同时保持 ACP 命令可用。
- `backend`: 默认 ACP 运行时后端 ID（必须与已注册的 ACP 运行时插件匹配）。
- `defaultAgent`: 当生成未指定显式目标时的备用 ACP 目标代理 ID。
- `allowedAgents`: 允许用于 ACP 运行时会话的代理 ID 白名单；为空表示没有额外限制。
- `maxConcurrentSessions`: 最大并发活动 ACP 会话数。
- `stream.coalesceIdleMs`: 流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`: 分割流式块投影之前的最大块大小。
- `stream.repeatSuppression`: 抑制每轮重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`: `"live"` 递增流式传输；`"final_only"` 缓冲直到轮次终止事件。
- `stream.hiddenBoundarySeparator`: 隐藏工具事件后可见文本之前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`: 每个 ACP 轮次投影的最大助手输出字符数。
- `stream.maxSessionUpdateChars`: 投影的 ACP 状态/更新行的最大字符数。
- `stream.tagVisibility`: 流式事件标签名称到布尔可见性覆盖的记录。
- `runtime.ttlMinutes`: ACP 会话工作器符合清理条件前的空闲 TTL（分钟）。
- `runtime.installCommand`: 引导 ACP 运行时环境时运行的可选安装命令。

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
  - `"random"`（默认）：轮换的有趣/季节性标语。
  - `"default"`: 固定的中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`: 无标语文本（仍显示横幅标题/版本）。
- 要隐藏整个横幅（不仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导

由 CLI 引导式设置流程写入的元数据（`onboard`、`configure`、`doctor`）：

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

请参阅 [Agent 默认值](#agent-defaults) 下的 `agents.list` 标识字段。

---

## 桥接（已弃用，已移除）

当前版本不再包含 TCP 桥接。节点通过 Gateway(网关) WebSocket 连接。`bridge.*` 键不再是配置模式的一部分（除非移除，否则验证失败；`openclaw doctor --fix` 可以剥离未知键）。

<Accordion title="旧版桥接配置（历史参考）">

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

- `sessionRetention`：在从 `sessions.json` 中修剪之前保留已完成的隔离 Cron 运行会话的时长。同时控制已归档的已删除 Cron 记录的清理。默认值：`24h`；设置为 `false` 可禁用。
- `runLog.maxBytes`：修剪前每个运行日志文件 (`cron/runs/<jobId>.jsonl`) 的最大大小。默认值：`2_000_000` 字节。
- `runLog.keepLines`：触发运行日志修剪时保留的最新行数。默认值：`2000`。
- `webhookToken`：用于 Cron Webhook POST 投递 (`delivery.mode = "webhook"`) 的 bearer 令牌，如果省略则不发送身份验证标头。
- `webhook`：已弃用的旧版回退 Webhook URL (http/https)，仅用于仍具有 `notify: true` 的存储作业。

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

- `maxAttempts`：一次性作业在瞬时错误上的最大重试次数（默认值：`3`；范围：`0`–`10`）。
- `backoffMs`：每次重试尝试的退避延迟数组（以毫秒为单位）（默认值：`[30000, 60000, 300000]`；1–10 个条目）。
- `retryOn`：触发重试的错误类型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重试所有瞬时类型。

仅适用于一次性 Cron 作业。周期性作业使用单独的失败处理机制。

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

- `enabled`：为 cron 任务启用失败警报（默认：`false`）。
- `after`：触发警报前的连续失败次数（正整数，最小值：`1`）。
- `cooldownMs`：同一任务的重复警报之间的最小毫秒数（非负整数）。
- `mode`：传递模式 —— `"announce"` 通过渠道消息发送；`"webhook"` 发布到配置的 Webhook。
- `accountId`：用于限定警报传递范围的可选账号或渠道 ID。

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

- 所有 cron 任务失败通知的默认目标。
- `mode`：`"announce"` 或 `"webhook"`；当存在足够的目标数据时，默认为 `"announce"`。
- `channel`：公告传递的渠道覆盖。`"last"` 复用上次已知的传递渠道。
- `to`：显式的公告目标或 webhook URL。Webhook 模式必需。
- `accountId`：用于传递的可选账号覆盖。
- 每个任务的 `delivery.failureDestination` 会覆盖此全局默认值。
- 当既未设置全局也未设置每个任务的失败目标时，已经通过 `announce` 传递的任务现在会在失败时回退到该主要公告目标。
- 除非任务的主要 `delivery.mode` 是 `"webhook"`，否则 `delivery.failureDestination` 仅受 `sessionTarget="isolated"` 任务支持。

请参阅 [Cron 任务](/en/automation/cron-jobs)。隔离的 cron 执行被作为[后台任务](/en/automation/tasks)进行跟踪。

---

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量               | 描述                                           |
| ------------------ | ---------------------------------------------- |
| `{{Body}}`         | 完整的入站消息正文                             |
| `{{RawBody}}`      | 原始正文（无历史记录/发送者包装器）            |
| `{{BodyStripped}}` | 已移除群组提及的消息正文                       |
| `{{From}}`         | 发送方标识符                                   |
| `{{To}}`           | 目标标识符                                     |
| `{{MessageSid}}`   | 频道消息 ID                                    |
| `{{SessionId}}`    | 当前会话 UUID                                  |
| `{{IsNewSession}}` | 创建新会话时为 `"true"`                        |
| `{{MediaUrl}}`     | 入站媒体伪 URL                                 |
| `{{MediaPath}}`    | 本地媒体路径                                   |
| `{{MediaType}}`    | 媒体类型（图片/音频/文档/…）                   |
| `{{Transcript}}`   | 音频转录                                       |
| `{{Prompt}}`       | CLI 条目的已解析媒体提示                       |
| `{{MaxChars}}`     | CLI 条目的已解析最大输出字符数                 |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                        |
| `{{GroupSubject}}` | 群组主题（尽力而为）                           |
| `{{GroupMembers}}` | 群组成员预览（尽力而为）                       |
| `{{SenderName}}`   | 发送方显示名称（尽力而为）                     |
| `{{SenderE164}}`   | 发送方电话号码（尽力而为）                     |
| `{{Provider}}`     | 提供程序提示（whatsapp、telegram、discord 等） |

---

## 配置包含（`$include`）

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

- 单个文件：替换包含它的对象。
- 文件数组：按顺序深度合并（后者覆盖前者）。
- 兄弟键：在包含之后合并（覆盖包含的值）。
- 嵌套包含：最多 10 层深度。
- 路径：相对于包含文件解析，但必须保持在顶级配置目录内（`dirname` 的 `openclaw.json`）。仅当 `../`/绝对形式仍在该边界内解析时，才允许使用。
- 错误：针对缺失文件、解析错误和循环包含提供清晰消息。

---

_相关：[Configuration](/en/gateway/configuration) · [Configuration Examples](/en/gateway/configuration-examples) · [Doctor](/en/gateway/doctor)_
