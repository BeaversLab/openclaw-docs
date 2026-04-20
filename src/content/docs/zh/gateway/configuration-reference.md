---
title: "配置参考"
summary: "Gateway(网关) 配置参考，包含核心 OpenClaw 键、默认值以及指向专用子系统参考的链接"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 配置参考

`~/.openclaw/openclaw.json` 的核心配置参考。如需面向任务的概述，请参阅 [配置](/en/gateway/configuration)。

本页涵盖主要的 OpenClaw 配置层面，当子系统拥有自己的深入参考时，会提供外部链接。本页并**不**试图将每个渠道/插件拥有的命令目录或每个深度记忆/QMD 调整项都内联在一页上。

代码真相：

- `openclaw config schema` 打印用于验证和控制 UI 的实时 JSON 架构，并在可用时合并 bundled/plugin/渠道 元数据
- `config.schema.lookup` 返回一个路径范围限定的架构节点，用于向下钻取工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 根据当前架构表面对配置文档基线哈希进行验证

专用深入参考：

- [内存配置参考](/en/reference/memory-config)，涵盖 `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- [斜杠命令](/en/tools/slash-commands)，包含当前的内置 + 捆绑命令目录
- 渠道特定命令层面的所属渠道/插件页面

配置格式为 **JSON5**（允许注释和尾随逗号）。所有字段都是可选的 — 如果省略，OpenClaw 将使用安全默认值。

---

## 渠道

只要存在配置部分，每个渠道都会自动启动（除非 `enabled: false`）。

### 私信和群组访问

所有渠道都支持私信策略和群组策略：

| 私信策略          | 行为                                              |
| ----------------- | ------------------------------------------------- |
| `pairing`（默认） | 未知发件人将获得一次性配对码；所有者必须批准      |
| `allowlist`       | 仅允许 `allowFrom` 中的发送者（或配对的允许存储） |
| `open`            | 允许所有传入私信（需要 `allowFrom: ["*"]`）       |
| `disabled`        | 忽略所有入站私信                                  |

| 群组策略            | 行为                                 |
| ------------------- | ------------------------------------ |
| `allowlist`（默认） | 仅限与配置的允许列表匹配的群组       |
| `open`              | 绕过群组允许列表（提及限制仍然适用） |
| `disabled`          | 阻止所有群组/房间消息                |

<Note>
当提供商的 `groupPolicy` 未设置时，`channels.defaults.groupPolicy` 设置默认值。
配对代码在 1 小时后过期。待处理的私信配对请求上限为 **每个渠道 3 个**。
如果完全缺少提供商块（`channels.<provider>` 缺失），运行时组策略将回退到 `allowlist`（故障关闭）并伴有启动警告。
</Note>

### 渠道模型覆盖

使用 `channels.modelByChannel` 将特定渠道 ID 固定到模型。值接受 `provider/model` 或配置的模型别名。当会话尚未设置模型覆盖（例如，通过 `/model` 设置）时，应用此渠道映射。

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

使用 `channels.defaults` 来配置跨提供商的共享群组策略和心跳行为：

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

- `channels.defaults.groupPolicy`：当未设置提供商级别的 `groupPolicy` 时使用的备用群组策略。
- `channels.defaults.contextVisibility`：所有渠道的默认补充上下文可见性模式。值包括：`all`（默认，包含所有引用/线程/历史上下文），`allowlist`（仅包含来自白名单发送者的上下文），`allowlist_quote`（与白名单相同，但保留显式引用/回复上下文）。单渠道覆盖：`channels.<channel>.contextVisibility`。
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

- 如果存在，出站命令默认使用账号 `default`；否则使用第一个配置的账号 id（已排序）。
- 可选的 `channels.whatsapp.defaultAccount` 会在其与配置的账号 id 匹配时覆盖该备用的默认账号选择。
- 旧版单账号 Baileys 认证目录会通过 `openclaw doctor` 迁移到 `whatsapp/default`。
- 单账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`，`channels.whatsapp.accounts.<id>.dmPolicy`，`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot 令牌：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接），默认账号的回退值为 `TELEGRAM_BOT_TOKEN`。
- 可选的 `channels.telegram.defaultAccount` 会在其与配置的账号 id 匹配时覆盖默认账号选择。
- 在多账户设置（2 个或更多账户 ID）中，设置显式的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；当缺失或无效时，`openclaw doctor` 会发出警告。
- `configWrites: false` 阻止 Telegram 发起的配置写入（超级群组 ID 迁移，`/config set|unset`）。
- 带有 `type: "acp"` 的顶层 `bindings[]` 条目为论坛主题配置持久的 ACP 绑定（在 `match.peer.id` 中使用规范 `chatId:topic:topicId`）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- Telegram 流预览使用 `sendMessage` + `editMessageText`（适用于直接和群组聊天）。
- 重试策略：参见 [重试策略](/en/concepts/retry)。

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

- 令牌：`channels.discord.token`，其中 `DISCORD_BOT_TOKEN` 作为默认账户的回退。
- 提供显式 Discord `token` 的直接出站调用使用该令牌进行调用；账户重试/策略设置仍来自活动运行时快照中选定的账户。
- 可选的 `channels.discord.defaultAccount` 在匹配已配置的账户 ID 时覆盖默认账户选择。
- 使用 `user:<id>` (私信) 或 `channel:<id>` (guild 渠道) 作为投递目标；不接受纯数字 ID。
- Guild 别名使用小写，并将空格替换为 `-`；渠道键使用别名化名称（无 `#`）。建议使用 Guild ID。
- 默认情况下忽略机器人发送的消息。`allowBots: true` 启用它们；使用 `allowBots: "mentions"` 仅接受提及该机器人的机器人消息（自身消息仍被过滤）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（及渠道覆盖）会丢弃提及其他用户或角色但未提及该机器人的消息（不包括 @everyone/@here）。
- `maxLinesPerMessage`（默认为 17）即使消息少于 2000 字符也会拆分过高的消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：Discord 覆盖设置，用于绑定线程的会话功能（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定的交付/路由）
  - `idleHours`：Discord 覆盖设置，用于非活动自动取消聚焦的时间（以小时为单位，`0` 表示禁用）
  - `maxAgeHours`：Discord 覆盖设置，用于硬性最大寿命时间（以小时为单位，`0` 表示禁用）
  - `spawnSubagentSessions`：用于 `sessions_spawn({ thread: true })` 自动线程创建/绑定的可选开关
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目为渠道和线程配置持久的 ACP 绑定（在 `match.peer.id` 中使用渠道/线程 ID）。字段语义在 [ACP Agents](/en/tools/acp-agents#channel-specific-settings) 中共享。
- `channels.discord.ui.components.accentColor` 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.voice` 启用 Discord 语音频道对话以及可选的自动加入 + TTS 覆盖设置。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` DAVE 选项（默认为 `true` 和 `24`）。
- 在反复解密失败后，OpenClaw 还会尝试通过退出并重新加入语音会话来恢复语音接收。
- `channels.discord.streaming` 是规范的流模式键。旧的 `streamMode` 和布尔 `streaming` 值会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射到机器人状态（healthy => 在线，degraded => 空闲，exhausted => 请勿打扰）并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变名称/标签匹配（break-glass 兼容模式）。
- `channels.discord.execApprovals`：Discord 原生执行审批交付和审批人授权。
  - `enabled`: `true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批人时，将激活执行审批。
  - `approvers`: 允许批准执行请求的 Discord 用户 ID。如果省略，则回退到 `commands.ownerAllowFrom`。
  - `agentFilter`: 可选的代理 ID 允许列表。省略以转发所有代理的审批。
  - `sessionFilter`: 可选的会话密钥模式（子字符串或正则表达式）。
  - `target`: 发送审批提示的位置。`"dm"`（默认）发送至审批人私信，`"channel"` 发送至原始渠道，`"both"` 发送至两者。当目标包含 `"channel"` 时，按钮仅可由解析出的审批人使用。
  - `cleanupAfterResolve`: 当 `true` 时，在批准、拒绝或超时后删除审批私信。

**反应通知模式:** `off`（无），`own`（机器人的消息，默认），`all`（所有消息），`allowlist`（从 `guilds.<id>.users` 开始，针对所有消息）。

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
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作为传递目标。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变的邮件主体匹配（应急玻璃兼容模式）。

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

- **Socket 模式** 需要 `botToken` 和 `appToken`（对于默认账号环境变量回退，为 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式** 需要 `botToken` 以及 `signingSecret`（位于根目录或每个账号）。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- Slack 账户快照会公开每个凭据的源/状态字段，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus` 以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示账户是通过 SecretRef 配置的，但当前的命令/运行时路径无法解析密钥值。
- `configWrites: false` 阻止由 Slack 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在匹配已配置的账户 ID 时覆盖默认账户选择。
- `channels.slack.streaming.mode` 是标准的 Slack 流模式键。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生流式传输。旧版 `streamMode`、布尔 `streaming` 和 `nativeStreaming` 值会自动迁移。
- 使用 `user:<id>` (私信) 或 `channel:<id>` 作为交付目标。

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 是按线程隔离（默认）或在渠道间共享。`thread.inheritParent` 将父渠道记录副本复制到新线程。

- Slack 原生流式传输加上 Slack 助手风格的“正在输入...”线程状态需要一个回复线程目标。顶级私信默认保持在线程外，因此它们使用 `typingReaction` 或正常交付，而不是线程式预览。
- `typingReaction` 在回复运行时向入站 Slack 消息添加临时反应，然后在完成时将其移除。使用 Slack 表情符号短代码，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生执行批准交付和批准者授权。架构与 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 用户 ID)、`agentFilter`、`sessionFilter` 和 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| Action group | 默认值  | 备注                   |
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

聊天模式：`oncall`（响应 @提及，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

当启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl` 必须解析为 OpenClaw 网关端点，并且可从 Mattermost 服务器访问。
- 原生斜杠回调使用 Mattermost 在斜杠命令注册期间返回的每条命令令牌进行身份验证。如果注册失败或未激活任何命令，OpenClaw 将拒绝带有 `Unauthorized: invalid command token.` 的回调
- 对于私有/tailnet/内部回调主机，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 来包含回调主机/域名。使用主机/域名值，而不是完整的 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在渠道中回复之前要求 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每个渠道的提及门控覆盖（`"*"` 表示默认）。
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
- `channels.signal.configWrites`: 允许或拒绝 Signal 发起的配置写入。
- 可选的 `channels.signal.defaultAccount` 在匹配到已配置的账户 ID 时覆盖默认的账户选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 路径（由插件支持，在 `channels.bluebubbles` 下配置）。

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

- 此处涵盖的核心键路径：`channels.bluebubbles`，`channels.bluebubbles.dmPolicy`。
- 可选的 `channels.bluebubbles.defaultAccount` 在匹配到已配置的账户 ID 时覆盖默认的账户选择。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 BlueBubbles 对话绑定到持久的 ACP 会话。在 `match.peer.id` 中使用 BlueBubbles 句柄或目标字符串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP Agents](/en/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 渠道配置记录在 [BlueBubbles](/en/channels/bluebubbles) 中。

### iMessage

OpenClaw 生成 `imsg rpc`（通过 stdio 通信的 JSON-RPC）。无需守护进程或端口。

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

- 可选的 `channels.imessage.defaultAccount` 在匹配到已配置的账户 ID 时覆盖默认的账户选择。

- 需要对 Messages 数据库进行完全磁盘访问。
- 首选 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；设置 `remoteHost`（`host` 或 `user@host`）以通过 SCP 获取附件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制传入附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密检查，因此请确保中继主机密已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`: 允许或拒绝 iMessage 发起的配置写入。
- 带有 `type: "acp"` 的顶级 `bindings[]` 条目可以将 iMessage 会话绑定到持久的 ACP 会话。在 `match.peer.id` 中使用规范化句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义：[ACP 代理](/en/tools/acp-agents#channel-specific-settings)。

<Accordion title="iMessage SSH 封装示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由扩展支持，并在 `channels.matrix` 下进行配置。

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
- `channels.matrix.proxy` 将 Matrix HTTP 流量通过显式 HTTP(S) 代理进行路由。命名帐户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许使用私有/内部主服务器。`proxy` 和此网络选择加入是独立的控制项。
- `channels.matrix.defaultAccount` 在多帐户设置中选择首选帐户。
- `channels.matrix.autoJoin` 默认为 `off`，因此受邀房间和新的 私信 风格邀请将被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 设置 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生执行批准传递和批准者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出批准者时，执行批准将激活。
  - `approvers`：允许批准执行请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的代理 ID 允许列表。省略以转发所有代理的批准。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：批准提示的发送位置。`"dm"`（默认）、`"channel"`（原始房间），或 `"both"`。
  - 每个账户的覆盖设置：`channels.matrix.accounts.<id>.execApprovals`。
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

- 此处涵盖的核心键路径：`channels.msteams`，`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭据、webhook、私信/群组策略、每个团队/每个渠道的覆盖设置）记录在 [Microsoft Teams](/en/channels/msteams) 中。

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

- 此处涵盖的核心键路径：`channels.irc`，`channels.irc.dmPolicy`，`channels.irc.configWrites`，`channels.irc.nickserv.*`。
- 可选的 `channels.irc.defaultAccount` 在匹配已配置的账户 ID 时覆盖默认账户选择。
- 完整的 IRC 渠道配置（主机/端口/TLS/渠道/允许列表/提及门控）记录在 [IRC](/en/channels/irc) 中。

### 多帐户（所有渠道）

每个渠道运行多个账户（每个都有自己的 `accountId`）：

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
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果您在仍使用单账户顶级渠道配置时通过 `openclaw channels add`（或渠道新手引导）添加非默认账户，OpenClaw 会首先将账户范围的单账户顶级值提升到渠道账户映射中，以便原始账户继续工作。大多数渠道将它们移动到 `channels.<channel>.accounts.default` 中；Matrix 可以改为保留现有的匹配命名/默认目标。
- 现有的仅渠道绑定（无 `accountId`）保持匹配默认账户；账户范围绑定仍然是可选的。
- `openclaw doctor --fix` 还会通过将账户范围的顶层单账户值移动到为该渠道选择的提升账户来修复混合形状。大多数渠道使用 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标。

### 其他扩展渠道

许多扩展渠道配置为 `channels.<id>` 并在其专用渠道页面中记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
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

`messages.groupChat.historyLimit` 设置全局默认值。渠道可以使用 `channels.<channel>.historyLimit` 覆盖（或每个账户）。设置 `0` 以禁用。

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

<Accordion title="命令详情">

- 此块配置命令界面。有关当前内置 + 捆绑命令目录，请参阅 [Slash Commands](/en/tools/slash-commands)。
- 此页面是**配置键参考**，不是完整的命令目录。渠道/插件拥有的命令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`，记录在其各自的渠道/插件页面以及 [Slash Commands](/en/tools/slash-commands) 中。
- 文本命令必须是**独立的**消息，并以 `/` 开头。
- `native: "auto"` 为 Discord/Telegram 启用原生命令，保持 Slack 关闭。
- `nativeSkills: "auto"` 为 Discord/Telegram 启用原生技能命令，保持 Slack 关闭。
- 按渠道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。`false` 清除先前注册的命令。
- 使用 `channels.<provider>.commands.nativeSkills` 按渠道覆盖原生技能注册。
- `channels.telegram.customCommands` 添加额外的 Telegram 机器人菜单条目。
- `bash: true` 为主机 shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 和发件人在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 启用 `/config`（读取/写入 `openclaw.json`）。对于网关 `chat.send` 客户端，持久性 `/config set|unset` 写入也需要 `operator.admin`；只读 `/config show` 对普通写入作用域的操作员客户端仍然可用。
- `mcp: true` 为 OpenClaw 管理的 MCP 服务器配置（在 `mcp.servers` 下）启用 `/mcp`。
- `plugins: true` 为插件发现、安装和启用/禁用控制启用 `/plugins`。
- `channels.<provider>.configWrites` 限制每个渠道的配置更改（默认值：true）。
- 对于多账户渠道，`channels.<provider>.accounts.<id>.configWrites` 还限制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 禁用 `/restart` 和网关重启工具操作。默认值：`true`。
- `ownerAllowFrom` 是仅限所有者命令/工具的显式所有者允许列表。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 对系统提示中的所有者 ID 进行哈希处理。设置 `ownerDisplaySecret` 以控制哈希处理。
- `allowFrom` 是按提供商设置的。设置后，它是**唯一**的授权来源（渠道允许列表/配对和 `useAccessGroups` 被忽略）。
- `useAccessGroups: false` 允许命令在未设置 `allowFrom` 时绕过访问组策略。
- 命令文档映射：
  - 内置 + 捆绑目录：[Slash Commands](/en/tools/slash-commands)
  - 特定于渠道的命令界面：[Channels](/en/channels)
  - QQ Bot 命令：[QQ Bot](/en/channels/qqbot)
  - 配对命令：[Pairing](/en/channels/pairing)
  - LINE 卡片命令：[LINE](/en/channels/line)
  - 记忆 dreaming：[Dreaming](/en/concepts/dreaming)

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

针对未设置 `agents.list[].skills` 的代理的可选默认技能允许列表。

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

- 省略 `agents.defaults.skills` 以默认允许不受限制的技能。
- 省略 `agents.list[].skills` 以继承默认值。
- 将 `agents.list[].skills: []` 设置为空表示不使用任何技能。
- 非空的 `agents.list[].skills` 列表是该代理的最终集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自动创建。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何时将工作区引导文件注入系统提示。默认值：`"always"`。

- `"continuation-skip"`：安全连续轮次（在完成助手响应之后）跳过工作区引导的重新注入，从而减少提示大小。心跳运行和压缩后重试仍会重建上下文。

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

所有工作区引导文件中注入的最大总字符数。默认值：`150000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制引导上下文被截断时代理可见的警告文本。
默认值：`"once"`。

- `"off"`：切勿将警告文本注入系统提示。
- `"once"`：针对每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：当存在截断时，在每次运行时注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文预算所有权映射

OpenClaw 拥有多个大容量的提示/上下文预算，它们被有意地按子系统拆分，而不是全部通过一个通用旋钮流动。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  正常工作区启动引导注入。
- `agents.defaults.startupContext.*`:
  单次 `/new` 和 `/reset` 启动前奏，包括最近的每日
  `memory/*.md` 文件。
- `skills.limits.*`:
  注入到系统提示中的精简技能列表。
- `agents.defaults.contextLimits.*`:
  受限的运行时摘录和注入的运行时拥有块。
- `memory.qmd.limits.*`:
  索引内存搜索片段和注入大小调整。

仅当一个代理需要不同的预算时，才使用匹配的特定代理覆盖：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在裸 `/new` 和 `/reset`
运行时注入的首轮启动前奏。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

受限运行时上下文表面的共享默认值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：添加截断元数据和续行通知之前的默认 `memory_get` 摘录上限。
- `memoryGetDefaultLines`：当省略 `lines` 时的默认 `memory_get` 行窗口。
- `toolResultMaxChars`：用于持久化结果和
  溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`：在压缩后
  刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 设置的特定代理覆盖。省略的字段继承
自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入到系统提示中的精简技能列表的全局上限。这
不影响按需读取 `SKILL.md` 文件。

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

技能提示预算的特定代理覆盖。

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

在提供商调用之前，记录/工具图像块中最长图像边的最大像素尺寸。
默认值：`1200`。

较低的值通常会减少在大量截图运行中的视觉令牌使用量和请求负载大小。
较高的值会保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（不是消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统首选项）。

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
      embeddedHarness: {
        runtime: "auto", // auto | pi | registered harness id, e.g. codex
        fallback: "pi", // pi | none
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
  - 被 `image` 工具路径用作其视觉模型配置。
  - 当选定的/默认模型无法接受图像输入时，也用作故障转移路由。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的图像生成功能以及任何生成图像的未来工具/插件界面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用于原生 Gemini 图像生成，`fal/fal-ai/flux/dev` 用于 fal，或 `openai/gpt-image-1` 用于 OpenAI Images。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商 auth/API 密钥（例如，`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用于 `google/*`，`OPENAI_API_KEY` 用于 `openai/*`，`FAL_KEY` 用于 `fal/*`）。
  - 如果省略，`image_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的已注册图像生成提供商。
- `musicGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的音乐生成功能和内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.5+`。
  - 如果省略，`music_generate` 仍然可以推断支持认证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册音乐生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商认证/API 密钥。
- `videoGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的视频生成功能和内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推断支持认证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册视频生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商认证/API 密钥。
  - 捆绑的 Qwen 视频生成提供商最多支持 1 个输出视频、1 个输入图像、4 个输入视频、10 秒时长，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后再回退到解析的会话/默认模型。
- `pdfMaxBytesMb`：当调用时未传递 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考虑的默认最大页数。
- `verboseDefault`：代理的默认详细级别。取值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `elevatedDefault`：代理的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.4`）。如果您省略提供商，OpenClaw 会首先尝试别名，然后尝试与该确切模型 ID 匹配的唯一配置提供商，最后才回退到配置的默认提供商（已弃用的兼容性行为，因此建议显式使用 `provider/model`）。如果该提供商不再暴露配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示过时的已移除提供商的默认值。
- `models`：`/model` 的已配置模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 处设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）被 `agents.defaults.models["provider/model"].params`（每个模型）覆盖，然后 `agents.list[].params`（匹配的代理 ID）按键覆盖。有关详细信息，请参阅 [Prompt Caching](/en/reference/prompt-caching)。
- `embeddedHarness`：默认的低级嵌入式代理运行时策略。使用 `runtime: "auto"` 让已注册的插件工具声明支持的模型，使用 `runtime: "pi"` 强制使用内置 PI 工具，或者使用已注册的工具 ID，如 `runtime: "codex"`。设置 `fallback: "none"` 以禁用自动 PI 回退。
- 改变这些字段的配置编写器（例如 `/models set`、`/models set-image` 和回退添加/移除命令）会保存规范的对象形式，并尽可能保留现有的回退列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍然是串行的）。默认值：4。

### `agents.defaults.embeddedHarness`

`embeddedHarness` 控制哪个低级执行器运行嵌入式代理轮次。
大多数部署应保持默认的 `{ runtime: "auto", fallback: "pi" }`。
当受信任的插件提供原生工具时使用它，例如捆绑的
Codex 应用服务器工具。

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

- `runtime`：`"auto"`、`"pi"` 或已注册的插件工具 ID。捆绑的 Codex 插件注册 `codex`。
- `fallback`：`"pi"` 或 `"none"`。`"pi"` 将内置 PI 工具保留为兼容性回退。`"none"` 使缺失或不支持的插件工具选择失败，而不是静默使用 PI。
- 环境覆盖：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 覆盖 `runtime`；`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 为该进程禁用 PI 回退。
- 对于仅 Codex 的部署，设置 `model: "codex/gpt-5.4"`、`embeddedHarness.runtime: "codex"` 和 `embeddedHarness.fallback: "none"`。
- 这仅控制嵌入式聊天工具。媒体生成、视觉、PDF、音乐、视频和 TTS 仍然使用其提供商/模型设置。

**内置别名简写**（仅当模型位于 `agents.defaults.models` 中时适用）：

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

除非您设置了 `--thinking off` 或自行定义 `agents.defaults.models["zai/<model>"].params.thinking`，否则 Z.AI GLM-4.x 模型会自动启用思考模式。
Z.AI 模型默认为工具调用流式传输启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 即可禁用它。
当未设置显式思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于纯文本回退运行（无工具调用）的可选 CLI 后端。当 API 提供商发生故障时，可作为备份使用。

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

- CLI 后端以文本为主；工具始终被禁用。
- 当设置了 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。

### `agents.defaults.systemPromptOverride`

使用固定字符串替换整个由 OpenClaw 组装的系统提示词。在默认级别（`agents.defaults.systemPromptOverride`）或每个代理（`agents.list[].systemPromptOverride`）处设置。每个代理的值优先；空或仅包含空格的值将被忽略。适用于受控的提示词实验。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.heartbeat`

周期性心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`：持续时间字符串（毫秒/秒/分/小时）。默认值：`30m`（API 密钥认证）或 `1h`（OAuth 认证）。设置为 `0m` 以禁用。
- `includeSystemPromptSection`：如果为 false，则从系统提示词中省略心跳部分，并跳过将 `HEARTBEAT.md` 注入到引导上下文中。默认值：`true`。
- `suppressToolErrorWarnings`：为 true 时，在心跳运行期间抑制工具错误警告负载。
- `timeoutSeconds`：心跳 Agent 回合中止前允许的最长时间（秒）。保留未设置以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/私信传递策略。`allow`（默认）允许直接目标传递。`block` 抑制直接目标传递并发出 `reason=dm-blocked`。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都在没有先前对话历史的新会话中运行。与 cron `sessionTarget: "isolated"` 的隔离模式相同。将每次心跳的 token 成本从约 100K 降低到约 2-5K token。
- 每个 Agent：设置 `agents.list[].heartbeat`。当任何 Agent 定义 `heartbeat` 时，**只有这些 Agent** 运行心跳。
- 心跳运行完整的 Agent 回合 —— 较短的间隔会消耗更多的 token。

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

- `mode`：`default` 或 `safeguard`（用于长历史的分块摘要）。参见 [Compaction](/en/concepts/compaction)。
- `provider`：已注册的压缩提供商插件 ID。设置后，调用提供商的 `summarize()` 而不是内置 LLM 摘要。失败时回退到内置。设置提供商会强制 `mode: "safeguard"`。参见 [Compaction](/en/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止单次压缩操作前允许的最长时间（秒）。默认：`900`。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间添加内置的不透明标识符保留指导。
- `identifierInstructions`：在 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `postCompactionSections`：压缩后要重新注入的可选 AGENTS.md H2/H3 节名称。默认为 `["Session Startup", "Red Lines"]`；设置 `[]` 以禁用重新注入。如果未设置或显式设置为该默认对，较旧的 `Every Session`/`Safety` 标题也将作为传统回退被接受。
- `model`：仅用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时，请使用此选项；如果未设置，压缩将使用会话的主模型。
- `notifyUser`：当为 `true` 时，在压缩开始时向用户发送简短通知（例如，“正在压缩上下文...”）。默认情况下禁用，以保持压缩静默。
- `memoryFlush`：自动压缩前的静默代理轮次，用于存储持久记忆。当工作区为只读时跳过。

### `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪 **旧工具结果**。**不会** 修改磁盘上的会话历史记录。

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

<Accordion title="cache-ttl mode behavior">

- `mode: "cache-ttl"` 启用修剪过程。
- `ttl` 控制修剪可以再次运行的频率（在最后一次缓存接触之后）。
- 修剪首先软修剪过大的工具结果，然后在需要时硬清除较旧的工具结果。

**软修剪** 保留开头和结尾并在中间插入 `...`。

**硬清除** 用占位符替换整个工具结果。

注意：

- 图像块永远不会被修剪/清除。
- 比率是基于字符的（大约的），而不是确切的令牌计数。
- 如果存在的助手消息少于 `keepLastAssistants` 条，则跳过修剪。

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

- 非 Telegram 渠道需要显式的 `*.blockStreaming: true` 才能启用块回复。
- 通道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每个账户的变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500毫秒。每个代理的覆盖：`agents.list[].humanDelay`。

有关行为和分块详情，请参阅 [流式传输](/en/concepts/streaming)。

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

- 默认值：直接聊天/提及使用 `instant`，未提及的群组聊天使用 `message`。
- 每个会话的覆盖：`session.typingMode`，`session.typingIntervalSeconds`。

请参阅 [正在输入指示器](/en/concepts/typing-indicators)。

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

<Accordion title="沙箱详细信息">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用 SSH 支持的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，特定于运行时的设置会移至
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 格式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于每个作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：内联内容或 SecretRef，OpenClaw 会在运行时将其具象化为临时文件
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略控件

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- SecretRef 支持的 `*Data` 值会在沙箱会话开始前从活动机密运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后初始化远程工作区一次
- 然后保持远程 SSH 工作区为标准
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

- `mirror`：执行前从本地初始化远程，执行后同步回本地；本地工作区保持标准
- `remote`：创建沙箱时初始化远程一次，然后保持远程工作区为标准

在 `remote` 模式下，在 OpenClaw 之外进行的主机本地编辑在初始化步骤后不会自动同步到沙箱中。
传输是通过 SSH 进入 OpenShell 沙箱，但插件拥有沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出口、可写根目录、root 用户。

**容器默认为 `network: "none"`** — 如果代理需要出站访问，请设置为 `"bridge"`（或自定义桥接网络）。
`"host"` 被阻止。除非您显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（应急/破窗），否则 `"container:<id>"` 默认被阻止。

**入站附件** 被暂存到活动工作区中的 `media/inbound/*`。

**`docker.binds`** 挂载其他主机目录；全局和每个代理的绑定项会被合并。

**沙箱隔离浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 被注入到系统提示中。不需要 `openclaw.json` 中的 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 认证，并且 OpenClaw 会发出一个短令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙箱隔离会话以主机浏览器为目标。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当您明确需要全局桥接连接时才设置为 `bridge`。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站限制为 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将其他主机目录挂载到沙箱浏览器容器中。设置时（包括 `[]`），它会替换浏览器容器的 `docker.binds`。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了调整：
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
    默认启用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用。
  - 如果您的工作流程依赖于扩展，`OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 会重新启用它们。
  - `--renderer-process-limit=2` 可以通过
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改；设置 `0` 以使用 Chromium 的
    默认进程限制。
  - 当启用 `noSandbox` 时，加上 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 默认值是容器镜像基线；使用具有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙箱隔离和 `sandbox.docker.binds` 仅适用于 Docker。

构建镜像：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list`（每个代理的覆盖项）

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
        embeddedHarness: { runtime: "auto", fallback: "pi" },
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

- `id`：稳定的代理 ID（必需）。
- `default`：当设置了多个时，第一个生效（会记录警告）。如果未设置任何值，则列表中的第一个条目为默认值。
- `model`：字符串形式仅覆盖 `primary`；对象形式 `{ primary, fallbacks }` 覆盖两者（`[]` 禁用全局回退）。仅覆盖 `primary` 的定时任务仍将继承默认回退，除非您设置了 `fallbacks: []`。
- `params`：合并到 `agents.defaults.models` 中选定模型条目的每个代理流参数。使用此选项可以在不重复整个模型目录的情况下设置代理特定的覆盖项，如 `cacheRetention`、`temperature` 或 `maxTokens`。
- `skills`：可选的每个代理技能允许列表。如果省略，代理在设置时继承 `agents.defaults.skills`；显式列表会替换默认值而不是合并，而 `[]` 表示没有技能。
- `thinkingDefault`：可选的每个代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive`）。当未设置每条消息或会话覆盖项时，覆盖此代理的 `agents.defaults.thinkingDefault`。
- `reasoningDefault`：可选的每个代理默认推理可见性（`on | off | stream`）。当未设置每条消息或会话推理覆盖项时适用。
- `fastModeDefault`：可选的每个代理快速模式默认值（`true | false`）。当未设置每条消息或会话快速模式覆盖项时适用。
- `embeddedHarness`：可选的每个代理底层控制策略覆盖项。使用 `{ runtime: "codex", fallback: "none" }` 可以使一个代理仅使用 Codex，同时其他代理保留默认的 PI 回退。
- `runtime`：可选的每个代理运行时描述符。当代理默认为 ACP harness 会话时，使用 `type: "acp"` 并带有 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：从 `emoji` 派生 `ackReaction`，从 `name`/`emoji` 派生 `mentionPatterns`。
- `subagents.allowAgents`：用于 `sessions_spawn` 的代理 ID 允许列表（`["*"]` = 任意；默认：仅限同一代理）。
- 沙箱隔离继承保护：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝以非沙箱隔离模式运行的目标。
- `subagents.requireAgentId`：如果为 true，则阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件；默认：false）。

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

- `type`（可选）：`route` 用于普通路由（缺少类型时默认为 route），`acp` 用于持久化 ACP 会话绑定。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任意账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；特定于渠道）
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` （精确，无对等/公会/团队）
5. `match.accountId: "*"` （渠道范围）
6. 默认智能体

在每个层级中，第一个匹配的 `bindings` 条目胜出。

对于 `type: "acp"` 条目，OpenClaw 通过精确的对话身份（`match.channel` + 账户 + `match.peer.id`）进行解析，并且不使用上述路由绑定层级顺序。

### 每智能体访问配置文件

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

有关优先级详细信息，请参阅 [Multi-Agent 沙箱 & Tools](/en/tools/multi-agent-sandbox-tools)。

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

<Accordion title="Session 字段详情">

- **`scope`**: 群聊上下文的基本会话分组策略。
  - `per-sender` (默认): 每个发送者在渠道上下文中获得一个隔离的会话。
  - `global`: 渠道上下文中的所有参与者共享一个会话（仅在打算共享上下文时使用）。
- **`dmScope`**: 私信如何分组。
  - `main`: 所有私信共享主会话。
  - `per-peer`: 跨渠道按发送者 ID 隔离。
  - `per-channel-peer`: 按渠道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`: 按账户 + 渠道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**: 将规范 ID 映射到提供商前缀的对等体，用于跨渠道会话共享。
- **`reset`**: 主要重置策略。`daily` 在 `atHour` 本地时间重置；`idle` 在 `idleMinutes` 后重置。如果两者都配置了，则以先过期的为准。
- **`resetByType`**: 按类型的覆盖项（`direct`、`group`、`thread`）。遗留的 `dm` 被接受为 `direct` 的别名。
- **`parentForkMaxTokens`**: 创建分叉线程会话时允许的最大父会话 `totalTokens`（默认 `100000`）。
  - 如果父 `totalTokens` 高于此值，OpenClaw 将启动一个新的线程会话，而不是继承父转录历史记录。
  - 设置 `0` 可禁用此保护并始终允许父分叉。
- **`mainKey`**: 遗留字段。运行时始终为主直接聊天存储桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: 代理对代理交换期间的最大回复轮数（整数，范围：`0`–`5`）。`0` 禁用乒乓链。
- **`sendPolicy`**: 按 `channel`、`chatType`（`direct|group|channel`，带有遗留的 `dm` 别名）、`keyPrefix` 或 `rawKeyPrefix` 匹配。先拒绝者胜。
- **`maintenance`**: 会话存储清理 + 保留控制。
  - `mode`: `warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`: 过期条目的时间截断（默认 `30d`）。
  - `maxEntries`: `sessions.json` 中的最大条目数（默认 `500`）。
  - `rotateBytes`: 当 `sessions.json` 超过此大小时轮换（默认 `10mb`）。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 转录档案的保留期。默认为 `pruneAfter`；设置 `false` 以禁用。
  - `maxDiskBytes`: 可选的会话目录磁盘预算。在 `warn` 模式下，它记录警告；在 `enforce` 模式下，它会先删除最旧的人工制品/会话。
  - `highWaterBytes`: 预算清理后的可选目标。默认为 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**: 线程绑定会话功能的全局默认值。
  - `enabled`: 主默认开关（提供商可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`: 默认的非活动自动取消专注时长，以小时为单位（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`: 默认的硬性最大时长，以小时为单位（`0` 禁用；提供商可以覆盖）

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

按渠道/账户覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析顺序（最具体优先）：account → 渠道 → global。`""` 会禁用并停止级联。`"auto"` 衍生自 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述             | 示例                        |
| ----------------- | ---------------- | --------------------------- |
| `{model}`         | 简短的模型名称   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整的模型标识符 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称       | `anthropic`                 |
| `{thinkingLevel}` | 当前的思考层级   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身份名称   | （与 `"auto"` 相同）        |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为活跃 Agent 的 `identity.emoji`，否则为 `"👀"`。设置为 `""` 以禁用。
- 按渠道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：account → 渠道 → `messages.ackReaction` → identity fallback。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord 和 Telegram 上回复后移除确认。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上启用生命周期状态反应。
  在 Slack 和 Discord 上，未设置会在确认反应处于活动状态时保持状态反应启用。
  在 Telegram 上，必须将其显式设置为 `true` 才能启用生命周期状态反应。

### 入站防抖

将同一发送者快速发送的纯文本消息合并为一个 Agent 回合。媒体/附件会立即刷新。控制命令会绕过防抖。

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
- `summaryModel` 覆盖 `agents.defaults.model.primary` 以进行自动总结。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（选择性加入）。
- API 密钥回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 覆盖 OpenAI TTS 端点。解析顺序为配置，然后是 `OPENAI_TTS_BASE_URL`，最后是 `https://api.openai.com/v1`。
- 当 `openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音验证。

---

## Talk

Talk 模式（macOS/iOS/Android）的默认值。

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
- 旧版扁平化 Talk 密钥（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性，并会自动迁移到 `talk.providers.<provider>` 中。
- 语音 ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API 密钥时应用。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `silenceTimeoutMs` 控制 Talk 模式在用户静音后发送转录内容之前等待的时间。未设置时保留平台默认的暂停窗口（`700 ms on macOS and Android, 900 ms on iOS`）。

---

## Tools

### Tool profiles

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置了一个基础允许列表：

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

全局工具允许/拒绝策略（拒绝优先）。不区分大小写，支持 `*` 通配符。即使 Docker 沙箱处于关闭状态也会应用。

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
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

控制沙箱外的提升 exec 访问权限：

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

- 每个代理的覆盖设置（`agents.list[].tools.elevated`）只能进行进一步限制。
- `/elevated on|off|ask|full` 存储每个会话的状态；内联指令应用于单条消息。
- 提升的 `exec` 绕过沙箱隔离并使用配置的转义路径（默认为 `gateway`，当 exec 目标为 `node` 时为 `node`）。

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

工具循环安全检查**默认处于禁用状态**。设置 `enabled: true` 以激活检测。
设置可以在 `tools.loopDetection` 中全局定义，并在 `agents.list[].tools.loopDetection` 处按代理覆盖。

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

- `historySize`: 为循环分析保留的最大工具调用历史记录。
- `warningThreshold`: 用于警告的重复无进展模式阈值。
- `criticalThreshold`: 用于阻止关键循环的更高重复阈值。
- `globalCircuitBreakerThreshold`: 任何无进展运行的硬停止阈值。
- `detectors.genericRepeat`: 对重复的相同工具/相同参数调用发出警告。
- `detectors.knownPollNoProgress`：对已知轮询工具（`process.poll`、`command_status` 等）进行警告/阻止。
- `detectors.pingPong`：对交替的无进度对模式进行警告/阻止。
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

**Provider entry** (`type: "provider"` or omitted):

- `provider`: API 提供商 id (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
- `model`: 模型 id override
- `profile` / `preferredProfile`: `auth-profiles.json` profile selection

**CLI entry** (`type: "cli"`):

- `command`: executable to run
- `args`: templated args (supports `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.)

**Common fields:**

- `capabilities`: optional list (`image`, `audio`, `video`). Defaults: `openai`/`anthropic`/`minimax` → image, `google` → image+audio+video, `groq` → audio.
- `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: per-entry overrides.
- Failures fall back to the next entry.

Provider auth follows standard order: `auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`.

**Async completion fields:**

- `asyncCompletion.directSend`: when `true`, completed async `music_generate`
  and `video_generate` tasks try direct 渠道 delivery first. Default: `false`
  (legacy requester-会话 wake/模型-delivery path).

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

控制会话工具（`sessions_list`、`sessions_history`、`sessions_send`）可以针对哪些会话。

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

- `self`：仅限当前会话密钥。
- `tree`：当前会话 + 由当前会话生成的会话（子代理）。
- `agent`：属于当前代理 ID 的任何会话（如果您在同一代理 ID 下运行每个发送者的会话，则可能包括其他用户）。
- `all`：任何会话。跨代理定位仍需 `tools.agentToAgent`。
- 沙箱钳制：当当前会话处于沙箱隔离状态且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，可见性会被强制设为 `tree`，即使设置了 `tools.sessions.visibility="all"`。

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
- 文件会被具体化到子工作空间的 `.openclaw/attachments/<uuid>/` 中，并带有 `.manifest.json`。
- 附件内容会从转录持久化中自动编辑掉。
- Base64 输入将经过严格的字母表/填充检查和预解码大小保护验证。
- 目录的文件权限为 `0700`，文件的权限为 `0600`。
- 清理遵循 `cleanup` 策略：`delete` 始终移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

### `tools.experimental`

实验性内置工具标志。除非适用严格的代理式 GPT-5 自动启用规则，否则默认关闭。

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

- `planTool`：启用结构化的 `update_plan` 工具，用于非平凡的多步骤工作跟踪。
- 默认值：`false`，除非对于 OpenAI 或 OpenAI Codex GPT-5 系列运行，将 `agents.defaults.embeddedPi.executionContract`（或每个代理的覆盖）设置为 `"strict-agentic"`。设置 `true` 以在该范围之外强制启用该工具，或设置 `false` 以即使在严格代理 GPT-5 运行中也保持禁用。
- 启用后，系统提示词还会添加使用指南，以便模型仅将其用于实质性工作，并且最多保留一步 `in_progress`。

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
- `allowAgents`：当请求代理未设置其自己的 `subagents.allowAgents` 时，`sessions_spawn` 的目标代理 ID 默认允许列表（`["*"]` = 任意；默认值：仅限同一代理）。
- `runTimeoutSeconds`：当工具调用省略 `runTimeoutSeconds` 时，`sessions_spawn` 的默认超时（秒）。`0` 表示没有超时。
- 每个子代理工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

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
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`，一个遗留的环境变量别名）覆盖代理配置根目录。
- 匹配提供商 ID 的合并优先级：
  - 非空的代理 `models.json` `baseUrl` 值优先。
  - 非空的代理 `apiKey` 值仅在该提供商在当前配置/身份验证配置文件上下文中不由 SecretRef 管理时才优先。
  - SecretRef 管理的提供商 `apiKey` 值是从源标记（环境变量引用为 `ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）刷新，而不是持久化解析的机密。
  - 由 SecretRef 管理的提供商标头值会从源标记刷新（环境变量引用为 `secretref-env:ENV_VAR_NAME`，文件/执行引用为 `secretref-managed`）。
  - 为空或缺失的 agent `apiKey`/`baseUrl` 将回退到配置中的 `models.providers`。
  - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置和隐式目录值之间的较大者。
  - 匹配的模型 `contextTokens` 在存在时保留显式的运行时上限；使用它可以在不更改原生模型元数据的情况下限制有效上下文。
  - 当您希望配置完全重写 `models.json` 时，请使用 `models.mode: "replace"`。
  - 标记持久性以源为权威：标记是从活动源配置快照（解析前）写入的，而不是从解析后的运行时密钥值写入的。

### Provider 字段详细信息

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：按提供商 ID 键入的自定义提供商映射。
- `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：提供商凭据（优先使用 SecretRef/env 替换）。
- `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：对于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求中（默认值：`true`）。
- `models.providers.*.authHeader`：在需要时强制在 `Authorization` 标头中传输凭据。
- `models.providers.*.baseUrl`：上游 API 基础 URL。
- `models.providers.*.headers`：用于代理/租户路由的额外静态标头。
- `models.providers.*.request`：模型提供商 HTTP 请求的传输覆盖。
  - `request.headers`：额外的标头（与提供商默认值合并）。值接受 SecretRef。
  - `request.auth`：认证策略覆盖。模式：`"provider-default"`（使用提供商内置认证）、`"authorization-bearer"`（带有 `token`）、`"header"`（带有 `headerName`、`value`，可选 `prefix`）。
  - `request.proxy`：HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（带有 `url`）。两种模式都接受可选的 `tls` 子对象。
  - `request.tls`：直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均接受 SecretRef）、`serverName`、`insecureSkipVerify`。
  - `request.allowPrivateNetwork`：当为 `true` 时，允许通过提供商 HTTP 获取防护机制向 `baseUrl` 发起 HTTPS 请求，即使 DNS 解析到私有、CGNAT 或类似范围的地址（操作员选择加入以信任自托管的 OpenAI 兼容端点）。WebSocket 针对标头/TLS 使用相同的 `request`，但不使用该获取 SSRF 防护。默认为 `false`。
- `models.providers.*.models`：显式的提供商模型目录条目。
- `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。
- `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。当您希望获得比模型原生 `contextWindow` 更小的有效上下文预算时使用此项。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：可选的兼容性提示。对于具有非空非本机 `baseUrl`（主机不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 会在运行时将其强制设为 `false`。空/省略的 `baseUrl` 保持默认 OpenAI 行为。
- `models.providers.*.models.*.compat.requiresStringContent`：可选的兼容性提示，用于仅支持字符串的 OpenAI 兼容聊天端点。当 `true` 时，OpenClaw 会在发送请求之前将纯文本 `messages[].content` 数组展平为纯字符串。
- `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自动发现设置的根节点。
- `plugins.entries.amazon-bedrock.config.discovery.enabled`：开启或关闭隐式发现。
- `plugins.entries.amazon-bedrock.config.discovery.region`：用于发现的 AWS 区域。
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用于定向发现的可选提供商 ID 过滤器。
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：发现刷新的轮询间隔。
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已发现模型的回退上下文窗口。
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已发现模型的回退最大输出令牌数。

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

Cerebras 使用 `cerebras/zai-glm-4.7`；Z.AI 直连使用 `zai/glm-4.7`。

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

设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。Zen 目录使用 `opencode/...` 引用，Go 目录使用 `opencode-go/...` 引用。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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
- 编程端点（默认）：`https://api.z.ai/api/coding/paas/v4`
- 对于通用端点，请定义一个自定义提供商并覆盖基础 URL。

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

原生 Moonshot 端点在共享的 `openai-completions` 传输上声明流式传输使用兼容性，并且 OpenClaw 密钥偏重于端点能力，而不仅仅是内置提供商 id。

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

基础 URL 应省略 `/v1`（Anthropic 客户端会附加它）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

</Accordion>

<Accordion title="MiniMax M2.7 (direct)">

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
模型目录默认仅包含 M2.7。
在兼容 Anthropic 的流式传输路径上，OpenClaw 默认禁用 MiniMax 思考功能，除非您明确自行设置 `thinking`。`/fast on` 或
`params.fastMode: true` 会将 `MiniMax-M2.7` 重写为
`MiniMax-M2.7-highspeed`。

</Accordion>

<Accordion title="本地模型 (LM Studio)">

参见 [本地模型](/en/gateway/local-models)。简而言之：在性能强劲的硬件上通过 LM Studio Responses API 运行大型本地模型；保持托管模型合并作为后备。

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

- `allowBundled`：可选的仅限内置 Skills 的允许列表（托管/工作区 Skills 不受影响）。
- `load.extraDirs`：额外的共享 Skills 根目录（优先级最低）。
- `install.preferBrew`：如果为 true，则在回退到其他类型的安装程序之前，当 `brew` 可用时优先使用 Homebrew 安装程序。
- `install.nodeManager`：针对 `metadata.openclaw.install` 规范的节点安装程序偏好（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false` 即使已内置/安装也会禁用 Skill。
- `entries.<skillKey>.apiKey`：为声明主要环境变量的 Skills 提供的便捷设置（纯文本字符串或 SecretRef 对象）。

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
- 设备发现接受原生 OpenClaw 插件以及兼容的 Codex 包和 Claude 包，包括无清单文件的 Claude 默认布局包。
- **配置更改需要重启网关。**
- `allow`：可选的允许列表（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API 密钥便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当 `false` 时，核心阻止 `before_prompt_build` 并忽略来自旧版 `before_agent_start` 的提示词修改字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件挂钩和受支持的包提供的挂钩目录。
- `plugins.entries.<id>.subagent.allowModelOverride`: 明确信任此插件以请求针对后台子代理运行的每次运行 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`: 用于受信任子代理覆盖的规范 `provider/model` 目标的可选允许列表。仅当您有意想要允许任何 `"*"` 时才使用 `"*"`。
- `plugins.entries.<id>.config`: 插件定义的配置对象（如果有可用的原生 OpenClaw 插件架构，则由其验证）。
- `plugins.entries.firecrawl.config.webFetch`: Firecrawl 网页获取提供商设置。
  - `apiKey`: Firecrawl API 密钥（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、传统的 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`: Firecrawl API 基础 URL（默认：`https://api.firecrawl.dev`）。
  - `onlyMainContent`: 仅从页面提取主要内容（默认：`true`）。
  - `maxAgeMs`: 最大缓存时间（以毫秒为单位，默认：`172800000` / 2 天）。
  - `timeoutSeconds`: 抓取请求超时时间（以秒为单位，默认：`60`）。
- `plugins.entries.xai.config.xSearch`: xAI X 搜索（Grok 网页搜索）设置。
  - `enabled`: 启用 X 搜索提供商。
  - `model`: 用于搜索的 Grok WhatsApp（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`: 记忆梦想设置。有关阶段和阈值，请参阅[梦想](/en/concepts/dreaming)。
  - `enabled`: 主控梦想开关（默认 `false`）。
  - `frequency`: 每次完整梦境扫描的 cron 频率（默认为 `"0 3 * * *"`）。
  - 阶段策略和阈值是实现细节（非面向用户的配置键）。
- 完整的记忆配置位于[记忆配置参考](/en/reference/memory-config)中：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 启用的 Claude bundle 插件还可以从 `settings.json` 提供嵌入式 Pi 默认值；OpenClaw 会将这些作为清理过的代理设置应用，而不是作为原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的内存插件 id，或使用 `"none"` 禁用内存插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 id；默认为 `"legacy"`，除非您安装并选择了其他引擎。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理的安装元数据。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 将 `plugins.installs.*` 视为托管状态；优先使用 CLI 命令而不是手动编辑。

请参阅 [插件](/en/tools/plugin)。

---

## 浏览器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
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

- `evaluateEnabled: false` 会禁用 `act:evaluate` 和 `wait --fn`。
- 未设置时 `ssrfPolicy.dangerouslyAllowPrivateNetwork` 被禁用，因此浏览器导航默认保持严格模式。
- 仅当您有意信任私有网络浏览器导航时，才设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在严格模式下，远程 CDP 配置文件端点 (`profiles.*.cdpUrl`) 在可达性/发现检查期间同样受制于私有网络阻止。
- `ssrfPolicy.allowPrivateNetwork` 作为旧版别名仍然受支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外处理。
- 远程配置文件仅支持附加（禁用启动/停止/重置）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)；当您的提供商为您提供直接的 DevTools WebSocket URL 时，请使用 WS(S)。
- `existing-session` 配置文件仅限主机使用，并使用 Chrome MCP 而不是 CDP。
- `existing-session` 配置文件可以设置 `userDataDir` 来定位特定的
  基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- `existing-session` 配置文件保留当前的 Chrome MCP 路由限制：
  快照/引用驱动的操作而不是 CSS 选择器定位、单文件上传钩子、无对话框超时覆盖、无
  `wait --load networkidle`，以及无
  `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地托管 `openclaw` 配置文件会自动分配 `cdpPort` 和 `cdpUrl`；仅
  为远程 CDP 显式设置 `cdpUrl`。
- 自动检测顺序：默认浏览器（如果基于 Chromium）→ Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务：仅限环回（端口派生自 `gateway.port`，默认为 `18791`）。
- `extraArgs` 将额外的启动标志附加到本地 Chromium 启动（例如
  `--disable-gpu`、窗口大小调整或调试标志）。

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
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
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

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非设置为 `local`，否则Gateway(网关)拒绝启动。
- `port`：WS + HTTP 的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **旧版绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意**：默认的 `loopback` 绑定在容器内监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量到达 `eth0`，因此网关无法访问。请使用 `--network host`，或设置 `bind: "lan"`（或配合 `customBindHost: "0.0.0.0"` 使用 `bind: "custom"`）以在所有接口上监听。
- **身份验证**：默认情况下需要。非回环绑定需要网关身份验证。实际上，这意味着共享令牌/密码或具有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。新手引导向导默认生成一个令牌。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），请将 `gateway.auth.mode` 显式设置为 `token` 或 `password`。当两者都已配置但未设置模式时，启动和服务安装/修复流程将失败。
- `gateway.auth.mode: "none"`：显式的无身份验证模式。仅用于受信任的本地回环设置；新手引导提示有意不提供此选项。
- `gateway.auth.mode: "trusted-proxy"`：将身份验证委托给身份感知反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [受信任的代理身份验证](/en/gateway/trusted-proxy-auth)）。此模式期望**非回环**代理源；同主机回环反向代理不满足受信任代理身份验证。
- `gateway.auth.allowTailscale`：当 `true` 时，Tailscale Serve 身份标头可以满足控制 UI/WebSocket 身份验证（通过 `tailscale whois` 验证）。HTTP API 端点**不**使用该 Tailscale 标头身份验证；它们遵循网关的正常 HTTP 身份验证模式。此无令牌流程假设网关主机受信任。当 `tailscale.mode = "serve"` 时默认为 `true`。
- `gateway.auth.rateLimit`：可选的身份验证失败限制器。适用于每个客户端 IP 和每个身份验证范围（共享密钥和设备令牌分别跟踪）。被阻止的尝试返回 `429` + `Retry-After`。
  - 在异步 Tailscale Serve 控制 UI 路径上，同一 `{scope, clientIp}` 的失败尝试在失败写入之前会被序列化。因此，来自同一客户端的并发错误尝试可能会在第二个请求时触发限制器，而不是两者都作为普通不匹配通过。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当您有意希望也对 localhost 流量进行速率限制时（用于测试设置或严格的代理部署），请设置 `false`。
- 浏览器源 WS 身份验证尝试始终受到限制，并禁用回环豁免（针对基于浏览器的 localhost 暴力破解的深度防御）。
- 在回环上，这些浏览器源锁定是按规范化的 `Origin` 值隔离的，因此来自一个 localhost 源的重复失败不会自动锁定不同的源。
- `tailscale.mode`：`serve`（仅 tailnet，回环绑定）或 `funnel`（公开，需要身份验证）。
- `controlUi.allowedOrigins`：Gateway(网关) WebSocket 连接的显式浏览器源允许列表。当浏览器客户端预期来自非回环源时是必需的。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，为有意依赖 Host 头源策略的部署启用 Host 头源回退。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，`remote.url` 必须是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端紧急覆盖，允许明文 `ws://` 连接到受信任的专用网络 IP；默认情况下明文仍仅限回环。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不配置网关身份验证。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本将基于中继的注册发布到网关后使用的外部 APNs 中继的基本 HTTPS URL。此 URL 必须与编译到 iOS 版本中的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到中继的发送超时（以毫秒为单位）。默认为 `10000`。
- 基于中继的注册被委托给特定的网关身份。配对的 iOS 应用获取 `gateway.identity.get`，将该身份包含在中继注册中，并将注册范围的发送授予转发给网关。另一个网关无法重用该存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中继配置的临时环境覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅限开发的回环 HTTP 中继 URL 的应急措施。生产环境中继 URL 应保持在 HTTPS 上。
- `gateway.channelHealthCheckMinutes`：渠道健康监视间隔（以分钟为单位）。设置 `0` 以全局禁用健康监视重启。默认值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧套接字阈值（以分钟为单位）。保持此值大于或等于 `gateway.channelHealthCheckMinutes`。默认值：`30`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户在滚动小时内的最大健康监视重启次数。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：针对健康监视重启的每个渠道选择退出，同时保持全局监视处于启用状态。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户渠道的每个账户覆盖。设置后，它优先于渠道级别的覆盖。
- 本地网关调用路径仅当 `gateway.auth.*` 未设置时才能将 `gateway.remote.*` 作为回退使用。
- 如果通过 SecretRef 显式配置 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析将失败关闭（无远程回退屏蔽）。
- `trustedProxies`：终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出您控制的代理。回环条目对于同主机代理/本地检测设置（例如 Tailscale Serve 或本地反向代理）仍然有效，但它们**不会**使回环请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`：当 `true` 时，如果 `X-Forwarded-For` 缺失，网关接受 `X-Real-IP`。默认为 `false` 以实现故障关闭行为。
- `gateway.tools.deny`：为 HTTP `POST /tools/invoke` 阻止的额外工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中删除工具名称。

</Accordion>

### OpenAI 兼容端点

- Chat Completions：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入强化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的允许列表被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 获取。
- 可选的响应强化标头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅为您控制的 HTTPS 源设置；请参阅 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一台主机上运行多个网关，使用唯一的端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`），`--profile <name>`（使用 `~/.openclaw-<name>`）。

请参阅 [Multiple Gateways](/en/gateway/multiple-gateways)。

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

- `enabled`：在网关监听器处启用 TLS 终止（HTTPS/WSS）（默认值：`false`）。
- `autoGenerate`：当未配置显式文件时，自动生成本地自签名证书/密钥对；仅用于本地/开发环境。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；请保持权限受限。
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

- `mode`：控制如何在运行时应用配置编辑。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置更改时始终重启网关进程。
  - `"hot"`：在进程内应用更改而无需重启。
  - `"hybrid"`（默认）：先尝试热重载；如果需要则回退到重启。
- `debounceMs`：应用配置更改前的防抖动窗口（以毫秒为单位）（非负整数）。
- `deferralTimeoutMs`：在强制重启之前等待进行中操作的最大毫秒数（默认：`300000` = 5 分钟）。

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

Auth：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
Query-string hook 令牌将被拒绝。

验证和安全注意事项：

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 必须与 `gateway.auth.token` **不同**；重用 Gateway(网关) 令牌将被拒绝。
- `hooks.path` 不能是 `/`；请使用专用的子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true` 时，才会接受来自请求负载的 `sessionKey`（默认：`false`）。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析

<Accordion title="映射详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的负载字段。
- 诸如 `{{messages[0].subject}}` 之类的模板从负载中读取。
- `transform` 可以指向返回 hook 操作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且必须停留在 `hooks.transformsDir` 内部（绝对路径和路径遍历将被拒绝）。
- `agentId` 路由到特定的代理；未知的 ID 将回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许所有，`[]` = 拒绝所有）。
- `defaultSessionKey`：可选的固定会话密钥，用于没有显式 `sessionKey` 的 hook 代理运行。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用者设置 `sessionKey`（默认：`false`）。
- `allowedSessionKeyPrefixes`：显式 `sessionKey` 值（请求 + 映射）的可选前缀允许列表，例如 `["hook:"]`。
- `deliver: true` 将最终回复发送到渠道；`channel` 默认为 `last`。
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

- 配置后，Gateway(网关) 会在启动时自动启动 `gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可禁用。
- 不要与 Gateway(网关) 一起运行单独的 `gog gmail watch serve`。

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

- 在 Gateway(网关) 端口下通过 HTTP 提供可由代理编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅限本地：保持 `gateway.bind: "loopback"`（默认）。
- 非环回绑定：Canvas 路由需要 Gateway(网关) 认证（令牌/密码/受信任代理），与其他 Gateway(网关) HTTP 表面相同。
- 节点 WebView 通常不发送认证头；在节点配对并连接后，Gateway(网关) 会通告用于 Canvas/A2UI 访问的节点范围限定功能 URL。
- 功能 URL 绑定到活动的节点 WS 会话并很快过期。不使用基于 IP 的回退。
- 将实时重新加载客户端注入到提供的 HTML 中。
- 如果为空，则自动创建初始 `index.html`。
- 同时在 `/__openclaw__/a2ui/` 提供服务 A2UI。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，请禁用实时重新加载。

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

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。对于跨网络发现，请搭配 DNS 服务器（推荐 CoreDNS）+ Tailscale 分离 DNS。

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

- 仅当进程环境缺少该键时，才会应用内联环境变量。
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（均不覆盖现有变量）。
- `shellEnv`：从您的登录 Shell 配置文件中导入缺失的预期键名。
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
- 缺失/空变量会在加载配置时引发错误。
- 使用 `$${VAR}` 进行转义以表示字面量 `${VAR}`。
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
- `source: "exec"` id 不得包含 `.` 或 `..` 斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据表面

- 规范矩阵： [SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- `secrets apply` 目标支持的 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用包含在运行时解析和审计覆盖范围内。

### Secret 提供商配置

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

注意：

- `file` 提供商支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必须为 `"value"`）。
- `exec` 提供商需要绝对的 `command` 路径，并在 stdin/stdout 上使用协议载荷。
- 默认情况下，会拒绝符号链接命令路径。设置 `allowSymlinkCommand: true` 以允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则受信任目录检查将应用于解析后的目标路径。
- `exec` 子环境默认为最小化；使用 `passEnv` 显式传递所需的变量。
- Secret 引用在激活时解析为内存快照，然后请求路径仅读取该快照。
- 活动表面过滤在激活期间应用：启用的表面上的未解析引用将导致启动/重新加载失败，而非活动表面将被跳过并输出诊断信息。

---

## 认证存储

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

- 每个代理的配置文件存储在 `<agentDir>/auth-profiles.json`。
- 对于静态凭证模式，`auth-profiles.json` 支持值级引用（`keyRef` 用于 `api_key`，`tokenRef` 用于 `token`）。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持基于 SecretRef 的身份验证配置文件凭证。
- 静态运行时凭证来自内存中解析的快照；一旦发现，旧的静态 `auth.json` 条目将被清除。
- 从 `~/.openclaw/credentials/oauth.json` 导入旧版 OAuth。
- 请参阅 [OAuth](/en/concepts/oauth)。
- Secrets 运行时行为和 `audit/configure/apply` 工具：[Secrets 管理](/en/gateway/secrets)。

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

- `billingBackoffHours`：当配置文件因真实的计费/信用不足错误而失败时的基本退避时间（以小时为单位，默认：`5`）。即使在 `401`/`403` 响应中，明确的计费文本也可能出现在此处，但提供商特定的文本匹配器仍归因于拥有它们的提供商（例如 OpenRouter
  `Key limit exceeded`）。可重试的 HTTP `402` 使用时间窗口或
  组织/工作区支出限制消息则保留在 `rate_limit` 路径
  中。
- `billingBackoffHoursByProvider`：每个提供商的计费退避小时数可选覆盖值。
- `billingMaxHours`：计费退避指数增长的封顶小时数（默认：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失败的基本退避时间（以分钟为单位，默认：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的封顶分钟数（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动时间窗口（以小时为单位，默认：`24`）。
- `overloadedProfileRotations`：针对过载错误，在切换到模型回退之前，同一提供商的认证配置文件最大轮换次数（默认值：`1`）。提供商繁忙类型的错误（如 `ModelNotReadyException`）属于此类。
- `overloadedBackoffMs`：在重试过载的提供商/配置文件轮换之前的固定延迟（默认值：`0`）。
- `rateLimitedProfileRotations`：针对速率限制错误，在切换到模型回退之前，同一提供商的认证配置文件最大轮换次数（默认值：`1`）。该速率限制分组包含提供商特定的文本，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 当 `--verbose` 时，`consoleLevel` 会增加到 `debug`。
- `maxFileBytes`：停止写入之前的最大日志文件大小（以字节为单位，正整数；默认值：`524288000` = 500 MB）。生产环境部署请使用外部日志轮换。

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

- `enabled`：检测输出的主控开关（默认值：`true`）。
- `flags`：用于启用定向日志输出的标志字符串数组（支持通配符，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：当会话保持在处理状态时，发出卡顿会话警告的时间阈值（单位：毫秒）。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认值：`false`）。
- `otel.endpoint`：用于 OTel 导出的收集器 URL。
- `otel.protocol`：`"http/protobuf"`（默认值）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求一起发送的额外 HTTP/gRPC 元数据头部。
- `otel.serviceName`：资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用链路追踪、指标或日志导出。
- `otel.sampleRate`：链路追踪采样率 `0`–`1`。
- `otel.flushIntervalMs`：定期遥测刷新间隔（毫秒）。
- `cacheTrace.enabled`：记录嵌入式运行的缓存追踪快照（默认：`false`）。
- `cacheTrace.filePath`：缓存追踪 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存追踪输出中包含的内容（全部默认为：`true`）。

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

- `channel`：npm/git 安装的发布渠道 —— `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：在网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`：为软件包安装启用后台自动更新（默认：`false`）。
- `auto.stableDelayHours`：稳定版渠道自动应用前的最小延迟（小时）（默认：`6`；最大值：`168`）。
- `auto.stableJitterHours`：额外的稳定版渠道发布分布窗口（小时）（默认：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：测试版渠道检查的运行频率（小时）（默认：`1`；最大值：`24`）。

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

- `enabled`：全局 ACP 功能开关（默认：`false`）。
- `dispatch.enabled`：ACP 会话轮次调度的独立开关（默认：`true`）。设置为 `false` 可在阻止执行的同时保持 ACP 命令可用。
- `backend`：默认 ACP 运行时后端 ID（必须匹配已注册的 ACP 运行时插件）。
- `defaultAgent`：当生成未指定显式目标时的备用 ACP 目标代理 ID。
- `allowedAgents`：允许用于 ACP 运行时会话的代理 ID 白名单；空表示没有额外限制。
- `maxConcurrentSessions`：最大并发活动 ACP 会话数。
- `stream.coalesceIdleMs`：流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`：拆分流式块投影前的最大块大小。
- `stream.repeatSuppression`：抑制每轮重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 逐个流式传输；`"final_only"` 缓冲直到轮次终止事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件后可见文本之前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每个 ACP 轮次投射的最大助手输出字符数。
- `stream.maxSessionUpdateChars`：投射的 ACP 状态/更新行的最大字符数。
- `stream.tagVisibility`：流式事件的标签名称到布尔可见性覆盖的记录。
- `runtime.ttlMinutes`：ACP 会话工作程序在符合清理条件前的空闲 TTL（分钟）。
- `runtime.installCommand`：初始化 ACP 运行时环境时运行的可选安装命令。

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
  - `"default"`：固定中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`：无标语文本（横幅标题/版本仍显示）。
- 要隐藏整个横幅（不仅仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

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

请参阅 [Agent defaults](#agent-defaults) 下的 `agents.list` 身份字段。

---

## 网桥（已弃用，已移除）

当前版本不再包含 TCP 网桥。节点通过 Gateway(网关) WebSocket 连接。`bridge.*` 键不再是配置架构的一部分（验证会失败，直到移除；`openclaw doctor --fix` 可以剥离未知键）。

<Accordion title="旧版网桥配置（历史参考）">

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

- `sessionRetention`：在从 `sessions.json` 中修剪之前，保留已完成的隔离 cron 运行会话的时间。同时控制已归档的已删除 cron 脚本的清理。默认值：`24h`；设置为 `false` 以禁用。
- `runLog.maxBytes`：每次运行日志文件 (`cron/runs/<jobId>.jsonl`) 在修剪前的最大大小。默认值：`2_000_000` 字节。
- `runLog.keepLines`：触发运行日志修剪时保留的最新行数。默认值：`2000`。
- `webhookToken`：用于 cron webhook POST 传递 (`delivery.mode = "webhook"`) 的 bearer 令牌，如果省略则不发送 auth 标头。
- `webhook`：已弃用的旧版后备 webhook URL (http/https)，仅用于仍有 `notify: true` 的存储作业。

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

- `maxAttempts`：一次性作业在瞬态错误上的最大重试次数（默认值：`3`；范围：`0`–`10`）。
- `backoffMs`：每次重试尝试的退避延迟数组（以毫秒为单位）（默认值：`[30000, 60000, 300000]`；1–10 个条目）。
- `retryOn`：触发重试的错误类型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重试所有瞬态类型。

仅适用于一次性 cron 作业。周期性作业使用单独的失败处理。

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

- `enabled`：为定时任务启用失败警报（默认：`false`）。
- `after`：触发警报前的连续失败次数（正整数，最小值：`1`）。
- `cooldownMs`：针对同一任务的重复警报之间的最小毫秒数（非负整数）。
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

- 所有任务中定时失败通知的默认目标。
- `mode`：`"announce"` 或 `"webhook"`；当存在足够的目标数据时，默认为 `"announce"`。
- `channel`：公告传递的渠道覆盖。`"last"` 重用最后已知的传递渠道。
- `to`：显式的公告目标或 Webhook URL。Webhook 模式必需。
- `accountId`：用于传递的可选账号覆盖。
- 每个任务的 `delivery.failureDestination` 会覆盖此全局默认值。
- 当既未设置全局也未设置单任务失败目标时，已经通过 `announce` 传递的任务将在失败时回退到该主要公告目标。
- `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 任务，除非任务的主要 `delivery.mode` 是 `"webhook"`。

参见 [定时任务](/en/automation/cron-jobs)。隔离的定时执行会被作为 [后台任务](/en/automation/tasks) 进行跟踪。

---

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的入站消息正文                           |
| `{{RawBody}}`      | 原始正文（无历史记录/发送器包装器）          |
| `{{BodyStripped}}` | Body with group mentions stripped            |
| `{{From}}`         | 发送方标识符                                 |
| `{{To}}`           | 目标标识符                                   |
| `{{MessageSid}}`   | 频道消息 ID                                  |
| `{{SessionId}}`    | 当前会话 UUID                                |
| `{{IsNewSession}}` | 创建新会话时 `"true"`                        |
| `{{MediaUrl}}`     | 入站媒体伪 URL                               |
| `{{MediaPath}}`    | 本地媒体路径                                 |
| `{{MediaType}}`    | 媒体类型（image/audio/document/…）           |
| `{{Transcript}}`   | 音频转录                                     |
| `{{Prompt}}`       | 针对 CLI 条目解析的媒体提示词                |
| `{{MaxChars}}`     | 针对 CLI 条目解析的最大输出字符数            |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群组主题（尽力而为）                         |
| `{{GroupMembers}}` | 群组成员预览（尽力而为）                     |
| `{{SenderName}}`   | 发送方显示名称（尽力而为）                   |
| `{{SenderE164}}`   | 发送方电话号码（尽力而为）                   |
| `{{Provider}}`     | 提供商提示（whatsapp, telegram, discord 等） |

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

- 单个文件：替换包含的对象。
- 文件数组：按顺序深度合并（后者覆盖前者）。
- 同级键：在包含之后合并（覆盖包含的值）。
- 嵌套包含：最多深 10 层。
- 路径：相对于包含文件解析，但必须保持在顶级配置目录（`openclaw.json` 的 `dirname`）内。仅当 `../` 形式仍然在该边界内解析时，才允许使用绝对/`../` 形式。
- 错误：针对缺失文件、解析错误和循环包含的清晰消息。

---

_相关：[Configuration](/en/gateway/configuration) · [Configuration Examples](/en/gateway/configuration-examples) · [Doctor](/en/gateway/doctor)_
