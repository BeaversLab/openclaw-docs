---
summary: "~/.openclaw/openclaw.json 的所有配置选项及示例"
read_when:
  - "Adding or modifying config fields"
title: "配置"
---

# 配置 🔧

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 **JSON5** 配置（允许注释和尾随逗号）。

如果文件缺失，OpenClaw 使用安全的默认值（嵌入式 Pi 代理 + 每个发送者的会话 + 工作区 `~/.openclaw/workspace`）。您通常只需要配置来：

- 限制谁可以触发机器人（`channels.whatsapp.allowFrom`、`channels.telegram.allowFrom` 等）
- 控制群组白名单 + 提及行为（`channels.whatsapp.groups`、`channels.telegram.groups`、`channels.discord.guilds`、`agents.list[].groupChat`）
- 自定义消息前缀（`messages`）
- 设置代理的工作区（`agents.defaults.workspace` 或 `agents.list[].workspace`）
- 调整嵌入式代理默认值（`agents.defaults`）和会话行为（`session`）
- 设置每个代理的身份（`agents.list[].identity`）

> **配置新手？** 查看配置示例指南[(/en/gateway/configuration-examples)]，获取带有详细解释的完整示例！

## 严格配置验证

OpenClaw 只接受完全匹配架构的配置。未知键、格式错误的类型或无效值会导致 Gateway **拒绝启动**以确保安全。

验证失败时：

- Gateway 无法启动。
- 仅允许诊断命令（例如：`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`、`openclaw service`、`openclaw help`）。
- 运行 `openclaw doctor` 查看确切问题。
- 运行 `openclaw doctor --fix`（或 `--yes`）应用迁移/修复。

除非您明确选择加入 `--fix`/`--yes`，否则 Doctor 永远不会写入更改。

## 架构 + UI 提示

Gateway 通过 `config.schema` 为 UI 编辑器公开配置的 JSON Schema 表示。控制 UI 从此架构渲染表单，并提供**原始 JSON** 编辑器作为应急方案。

频道插件和扩展可以为其配置注册架构 + UI 提示，因此频道设置在应用程序之间保持架构驱动，而无需硬编码表单。

提示（标签、分组、敏感字段）与架构一起提供，以便客户端可以在不硬编码配置知识的情况下渲染更好的表单。

## 应用 + 重启（RPC）

使用 `config.apply` 验证 + 写入完整配置并一步重启 Gateway。它会写入重启标记，并在 Gateway 恢复后 ping 最后一个活动会话。

警告：`config.apply` 会替换**整个配置**。如果您只想更改几个键，请使用 `config.patch` 或 `openclaw config set`。请保留 `~/.openclaw/openclaw.json` 的备份。

参数：

- `raw`（字符串）— 整个配置的 JSON5 负载
- `baseHash`（可选）— 来自 `config.get` 的配置哈希（当配置已存在时必需）
- `sessionKey`（可选）— 用于唤醒 ping 的最后活动会话键
- `note`（可选）— 要包含在重启标记中的注释
- `restartDelayMs`（可选）— 重启前的延迟（默认 2000）

示例（通过 `gateway call`）：

```bash
openclaw gateway call config.get --params '{}' # capture payload.hash
openclaw gateway call config.apply --params '{
  "raw": "{\\n  agents: { defaults: { workspace: \\"~/.openclaw/workspace\\" } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 部分更新（RPC）

使用 `config.patch` 将部分更新合并到现有配置中，而不会破坏不相关的键。它应用 JSON 合并补丁语义：

- 对象递归合并
- `null` 删除键
- 数组替换
  与 `config.apply` 类似，它会验证、写入配置、存储重启标记，并安排 Gateway 重启（当提供 `sessionKey` 时可选唤醒）。

参数：

- `raw`（字符串）— 仅包含要更改的键的 JSON5 负载
- `baseHash`（必需）— 来自 `config.get` 的配置哈希
- `sessionKey`（可选）— 用于唤醒 ping 的最后活动会话键
- `note`（可选）— 要包含在重启标记中的注释
- `restartDelayMs`（可选）— 重启前的延迟（默认 2000）

示例：

```bash
openclaw gateway call config.get --params '{}' # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{\\n  channels: { telegram: { groups: { \\"*\\": { requireMention: false } } } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 最小配置（推荐的起点）

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

使用以下命令构建默认镜像一次：

```bash
scripts/sandbox-setup.sh
```

## 自聊天模式（推荐用于群组控制）

为了防止机器人在群组中响应 WhatsApp @提及（仅响应特定的文本触发器）：

```json5
{
  agents: {
    defaults: { workspace: "~/.openclaw/workspace" },
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["@openclaw", "reisponde"] },
      },
    ],
  },
  channels: {
    whatsapp: {
      // Allowlist is DMs only; including your own number enables self-chat mode.
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
}
```

## 配置包含（`$include`）

使用 `$include` 指令将配置拆分为多个文件。这适用于：

- 组织大型配置（例如，每个客户端的代理定义）
- 在环境之间共享通用设置
- 将敏感配置分开保存

### 基本用法

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },

  // Include a single file (replaces the key's value)
  agents: { $include: "./agents.json5" },

  // Include multiple files (deep-merged in order)
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

```json5
// ~/.openclaw/agents.json5
{
  defaults: { sandbox: { mode: "all", scope: "session" } },
  list: [{ id: "main", workspace: "~/.openclaw/workspace" }],
}
```

### 合并行为

- **单个文件**：替换包含 `$include` 的对象
- **文件数组**：按顺序深度合并文件（后面的文件覆盖前面的文件）
- **带有同级键**：同级键在包含之后合并（覆盖包含的值）
- **同级键 + 数组/基本类型**：不支持（包含的内容必须是对象）

```json5
// Sibling keys override included values
{
  $include: "./base.json5", // { a: 1, b: 2 }
  b: 99, // Result: { a: 1, b: 99 }
}
```

### 嵌套包含

包含的文件本身可以包含 `$include` 指令（最多 10 层深度）：

```json5
// clients/mueller.json5
{
  agents: { $include: "./mueller/agents.json5" },
  broadcast: { $include: "./mueller/broadcast.json5" },
}
```

### 路径解析

- **相对路径**：相对于包含文件解析
- **绝对路径**：按原样使用
- **父目录**：`../` 引用按预期工作

```json5
{ "$include": "./sub/config.json5" }      // relative
{ "$include": "/etc/openclaw/base.json5" } // absolute
{ "$include": "../shared/common.json5" }   // parent dir
```

### 错误处理

- **文件缺失**：清晰的错误并显示已解析的路径
- **解析错误**：显示哪个包含文件失败
- **循环包含**：检测并报告包含链

### 示例：多客户法律设置

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789, auth: { token: "secret" } },

  // Common agent defaults
  agents: {
    defaults: {
      sandbox: { mode: "all", scope: "session" },
    },
    // Merge agent lists from all clients
    list: { $include: ["./clients/mueller/agents.json5", "./clients/schmidt/agents.json5"] },
  },

  // Merge broadcast configs
  broadcast: {
    $include: ["./clients/mueller/broadcast.json5", "./clients/schmidt/broadcast.json5"],
  },

  channels: { whatsapp: { groupPolicy: "allowlist" } },
}
```

```json5
// ~/.openclaw/clients/mueller/agents.json5
[
  { id: "mueller-transcribe", workspace: "~/clients/mueller/transcribe" },
  { id: "mueller-docs", workspace: "~/clients/mueller/docs" },
]
```

```json5
// ~/.openclaw/clients/mueller/broadcast.json5
{
  "120363403215116621@g.us": ["mueller-transcribe", "mueller-docs"],
}
```

## 常用选项

### 环境变量 + `.env`

OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量。

此外，它加载：

- 当前工作目录中的 `.env`（如果存在）
- 来自 `~/.openclaw/.env` 的全局后备 `.env`（也称为 `$OPENCLAW_STATE_DIR/.env`）

两个 `.env` 文件都不会覆盖现有的环境变量。

您还可以在配置中提供内联环境变量。仅当进程环境中缺少该键时才应用这些变量（相同的非覆盖规则）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

有关完整优先级和来源，请参阅 [/environment](/zh/environment)。

### `env.shellEnv`（可选）

可选便利功能：如果启用且尚未设置任何预期键，OpenClaw 会运行您的登录 shell 并仅导入缺失的预期键（从不覆盖）。这实际上会获取您的 shell 配置文件。

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

环境变量等效项：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

### 配置中的环境变量替换

您可以使用 `${VAR_NAME}` 语法在任何配置字符串值中直接引用环境变量。变量在配置加载时、验证之前进行替换。

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
  gateway: {
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

**规则：**

- 仅匹配大写环境变量名称：`[A-Z_][A-Z0-9_]*`
- 缺失或空的环境变量在配置加载时抛出错误
- 使用 `${VAR}` 转义以输出字面量 `${VAR}`
- 适用于 `$include`（包含的文件也会获得替换）

**内联替换：**

```json5
{
  models: {
    providers: {
      custom: {
        baseUrl: "${CUSTOM_API_BASE}/v1", // → "https://api.example.com/v1"
      },
    },
  },
}
```

### 认证存储（OAuth + API 密钥）

OpenClaw 在以下位置存储**每个代理的**认证配置文件（OAuth + API 密钥）：

- `<agentDir>/auth-profiles.json`（默认：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`）

另请参阅：[/concepts/oauth](/zh/concepts/oauth)

传统 OAuth 导入：

- `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）

嵌入式 Pi 代理在以下位置维护运行时缓存：

- `<agentDir>/auth.json`（自动管理；请勿手动编辑）

传统代理目录（多代理之前）：

- `~/.openclaw/agent/*`（通过 `openclaw doctor` 迁移到 `~/.openclaw/agents/<defaultAgentId>/agent/*`）

覆盖：

- OAuth 目录（仅传统导入）：`OPENCLAW_OAUTH_DIR`
- 代理目录（默认代理根覆盖）：`OPENCLAW_AGENT_DIR`（首选），`PI_CODING_AGENT_DIR`（传统）

首次使用时，OpenClaw 会将 `oauth.json` 条目导入到 `auth-profiles.json`。

### `auth`

认证配置文件的可选元数据。这**不**存储秘密；它将配置文件 ID 映射到提供商 + 模式（以及可选的电子邮件），并定义用于故障转移的提供商轮换顺序。

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

### `agents.list[].identity`

用于默认值和 UX 的可选每个代理的身份。这由 macOS 入门助手编写。

如果设置，OpenClaw 会派生默认值（仅在您未明确设置它们时）：

- `messages.ackReaction` 来自**活动代理**的 `identity.emoji`（回退到 👀）
- `agents.list[].groupChat.mentionPatterns` 来自代理的 `identity.name`/`identity.emoji`（因此”@Samantha”可以在 Telegram/Slack/Discord/Google Chat/iMessage/WhatsApp 的群组中使用）
- `identity.avatar` 接受相对于工作区的图像路径或远程 URL/数据 URL。本地文件必须位于代理工作区内。

`identity.avatar` 接受：

- 相对于工作区的路径（必须保持在代理工作区内）
- `http(s)` URL
- `data:` URI

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

### `wizard`

由 CLI 向导（`onboard`、`configure`、`doctor`）编写的元数据。

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

### `logging`

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- 如果您需要稳定的路径，请将 `logging.file` 设置为 `/tmp/openclaw/openclaw.log`。
- 控制台输出可以通过以下方式单独调整：
  - `logging.consoleLevel`（默认为 `info`，当 `--verbose` 时提升到 `debug`）
  - `logging.consoleStyle`（`pretty` | `compact` | `json`）
- 工具摘要可以被编辑以避免泄露秘密：
  - `logging.redactSensitive`（`off` | `tools`，默认：`tools`）
  - `logging.redactPatterns`（正则表达式字符串数组；覆盖默认值）

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools",
    redactPatterns: [
      // Example: override defaults with your own rules.
      "\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1",
      "/\\bsk-[A-Za-z0-9_-]{8,}\\b/gi",
    ],
  },
}
```

### `channels.whatsapp.dmPolicy`

控制如何处理 WhatsApp 直接聊天（DM）：

- `"pairing"`（默认）：未知发送者获得配对码；所有者必须批准
- `"allowlist"`：仅允许 `channels.whatsapp.allowFrom` 中的发送者（或配对的允许存储）
- `"open"`：允许所有传入的 DM（**要求** `channels.whatsapp.allowFrom` 包含 `"*"`）
- `"disabled"`：忽略所有传入的 DM

配对码在 1 小时后过期；机器人仅在新请求创建时发送配对码。待处理的 DM 配对请求默认限制为**每个频道 3 个**。

配对批准：

- `openclaw pairing list whatsapp`
- `openclaw pairing approve whatsapp <code>`

### `channels.whatsapp.allowFrom`

可能触发 WhatsApp 自动回复的 E.164 电话号码白名单（**仅 DM**）。
如果为空且 `channels.whatsapp.dmPolicy="pairing"`，未知发送者将收到配对码。
对于群组，请使用 `channels.whatsapp.groupPolicy` + `channels.whatsapp.groupAllowFrom`。

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000, // optional outbound chunk size (chars)
      chunkMode: "length", // optional chunking mode (length | newline)
      mediaMaxMb: 50, // optional inbound media cap (MB)
    },
  },
}
```

### `channels.whatsapp.sendReadReceipts`

控制是否将传入的 WhatsApp 消息标记为已读（蓝色勾选）。默认：`true`。

自聊天模式始终跳过已读回执，即使在启用时也是如此。

每个账户的覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`。

```json5
{
  channels: {
    whatsapp: { sendReadReceipts: false },
  },
}
```

### `channels.whatsapp.accounts`（多账户）

在一个 Gateway 中运行多个 WhatsApp 账户：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {}, // optional; keeps the default id stable
        personal: {},
        biz: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

说明：

- 传出命令默认使用账户 `default`（如果存在）；否则使用第一个配置的账户 ID（排序）。
- 传统的单账户 Baileys 认证目录通过 `openclaw doctor` 迁移到 `whatsapp/default`。

### `channels.telegram.accounts` / `channels.discord.accounts` / `channels.googlechat.accounts` / `channels.slack.accounts` / `channels.mattermost.accounts` / `channels.signal.accounts` / `channels.imessage.accounts`

每个频道运行多个账户（每个账户都有自己的 `accountId` 和可选的 `name`）：

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

说明：

- 当省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境令牌仅适用于**默认**账户。
- 基本频道设置（群组策略、提及门控等）适用于所有账户，除非每个账户覆盖。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的 agents.defaults。

### 群聊提及门控（`agents.list[].groupChat` + `messages.groupChat`）

群消息默认为**需要提及**（元数据提及或正则表达式模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

**提及类型：**

- **元数据提及**：原生平台 @提及（例如，WhatsApp 点击提及）。在 WhatsApp 自聊天模式下被忽略（参见 `channels.whatsapp.allowFrom`）。
- **文本模式**：在 `agents.list[].groupChat.mentionPatterns` 中定义的正则表达式模式。无论自聊天模式如何，始终检查。
- 仅当可能进行提及检测时（原生提及或至少一个 `mentionPattern`），才会强制执行提及门控。

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

`messages.groupChat.historyLimit` 设置群组历史上下文的全局默认值。频道可以使用 `channels.<channel>.historyLimit` 覆盖（或 `channels.<channel>.accounts.*.historyLimit` 用于多账户）。设置 `0` 以禁用历史包装。

#### DM 历史限制

DM 对话使用由代理管理的基于会话的历史。您可以限制每个 DM 会话保留的用户回合数：

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30, // limit DM sessions to 30 user turns
      dms: {
        "123456789": { historyLimit: 50 }, // per-user override (user ID)
      },
    },
  },
}
```

解析顺序：

1. 每个 DM 的覆盖：`channels.<provider>.dms[userId].historyLimit`
2. 提供商默认值：`channels.<provider>.dmHistoryLimit`
3. 无限制（保留所有历史）

支持的提供商：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

每个代理的覆盖（设置时优先，甚至 `[]`）：

```json5
{
  agents: {
    list: [
      { id: "work", groupChat: { mentionPatterns: ["@workbot", "\\+15555550123"] } },
      { id: "personal", groupChat: { mentionPatterns: ["@homebot", "\\+15555550999"] } },
    ],
  },
}
```

提及门控默认值存在于每个频道（`channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`、`channels.discord.guilds`）。当设置 `*.groups` 时，它也充当群组白名单；包含 `"*"` 以允许所有群组。

要**仅**响应特定的文本触发器（忽略原生 @提及）：

```json5
{
  channels: {
    whatsapp: {
      // Include your own number to enable self-chat mode (ignore native @-mentions).
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          // Only these text patterns will trigger responses
          mentionPatterns: ["reisponde", "@openclaw"],
        },
      },
    ],
  },
}
```

### 群组策略（每个频道）

使用 `channels.*.groupPolicy` 控制是否接受群组/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["tg:123456789", "@alice"],
    },
    signal: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: {
          channels: { help: { allow: true } },
        },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
  },
}
```

说明：

- `"open"`：群组绕过白名单；提及门控仍然适用。
- `"disabled"`：阻止所有群组/房间消息。
- `"allowlist"`：仅允许匹配配置的白名单的群组/房间。
- 当未设置提供商的 `groupPolicy` 时，`channels.defaults.groupPolicy` 设置默认值。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams 使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- Discord/Slack 使用频道白名单（`channels.discord.guilds.*.channels`、`channels.slack.channels`）。
- 群组 DM（Discord/Slack）仍由 `dm.groupEnabled` + `dm.groupChannels` 控制。
- 默认为 `groupPolicy: "allowlist"`（除非被 `channels.defaults.groupPolicy` 覆盖）；如果未配置白名单，群组消息将被阻止。

### 多代理路由（`agents.list` + `bindings`）

在一个 Gateway 中运行多个隔离的代理（独立工作区、`agentDir`、会话）。传入消息通过绑定路由到代理。

- `agents.list[]`：每个代理的覆盖。
  - `id`：稳定的代理 ID（必需）。
  - `default`：可选；当设置多个时，第一个获胜并记录警告。
    如果未设置任何值，列表中的**第一个条目**是默认代理。
  - `name`：代理的显示名称。
  - `workspace`：默认 `~/.openclaw/workspace-<agentId>`（对于 `main`，回退到 `agents.defaults.workspace`）。
  - `agentDir`：默认 `~/.openclaw/agents/<agentId>/agent`。
  - `model`：每个代理的默认模型，覆盖该代理的 `agents.defaults.model`。
    - 字符串形式：`"provider/model"`，仅覆盖 `agents.defaults.model.primary`
    - 对象形式：`{ primary, fallbacks }`（回退覆盖 `agents.defaults.model.fallbacks`；`[]` 禁用该代理的全局回退）
  - `identity`：每个代理的名称/主题/表情符号（用于提及模式 + 确认反应）。
  - `groupChat`：每个代理的提及门控（`mentionPatterns`）。
  - `sandbox`：每个代理的沙箱配置（覆盖 `agents.defaults.sandbox`）。
    - `mode`：`"off"` | `"non-main"` | `"all"`
    - `workspaceAccess`：`"none"` | `"ro"` | `"rw"`
    - `scope`：`"session"` | `"agent"` | `"shared"`
    - `workspaceRoot`：自定义沙箱工作区根目录
    - `docker`：每个代理的 docker 覆盖（例如 `image`、`network`、`env`、`setupCommand`、限制；当 `scope: "shared"` 时忽略）
    - `browser`：每个代理的沙箱浏览器覆盖（当 `scope: "shared"` 时忽略）
    - `prune`：每个代理的沙箱修剪覆盖（当 `scope: "shared"` 时忽略）
  - `subagents`：每个代理的子代理默认值。
    - `allowAgents`：来自此代理的 `sessions_spawn` 的代理 ID 白名单（`["*"]` = 允许任何；默认：仅相同代理）
  - `tools`：每个代理的工具限制（在沙箱工具策略之前应用）。
    - `profile`：基本工具配置文件（在允许/拒绝之前应用）
    - `allow`：允许的工具名称数组
    - `deny`：拒绝的工具名称数组（拒绝获胜）
- `agents.defaults`：共享代理默认值（模型、工作区、沙箱等）。
- `bindings[]`：将传入消息路由到 `agentId`。
  - `match.channel`（必需）
  - `match.accountId`（可选；`*` = 任何账户；省略 = 默认账户）
  - `match.peer`（可选；`{ kind: dm|group|channel, id }`）
  - `match.guildId` / `match.teamId`（可选；特定于频道）

确定性匹配顺序：

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（频道范围，无 peer/guild/team）
6. 默认代理（`agents.list[].default`，否则第一个列表条目，否则 `"main"`）

在每个匹配层中，`bindings` 中的第一个匹配条目获胜。

#### 每个代理的访问配置文件（多代理）

每个代理都可以携带自己的沙箱 + 工具策略。使用此功能在一个 Gateway 中混合访问级别：

- **完全访问**（个人代理）
- **只读**工具 + 工作区
- **无文件系统访问**（仅消息/会话工具）

有关优先级和其他示例，请参阅[多代理沙箱和工具](/zh/multi-agent-sandbox-tools)。

完全访问（无沙箱）：

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

只读工具 + 只读工作区：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "ro",
        },
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

无文件系统访问（启用消息/会话工具）：

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: {
          mode: "all",
          scope: "agent",
          workspaceAccess: "none",
        },
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

示例：两个 WhatsApp 账户 → 两个代理：

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
  channels: {
    whatsapp: {
      accounts: {
        personal: {},
        biz: {},
      },
    },
  },
}
```

### `tools.agentToAgent`（可选）

代理到代理消息是可选的：

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

### `messages.queue`

控制代理运行已处于活动状态时传入消息的行为。

```json5
{
  messages: {
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog (steer+backlog ok) | interrupt (queue=steer legacy)
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
        discord: "collect",
        imessage: "collect",
        webchat: "collect",
      },
    },
  },
}
```

### `messages.inbound`

对来自**同一发送者**的快速传入消息进行防抖，使多个连续消息变成单个代理回合。防抖作用域为每个频道 + 对话，并使用最新消息进行回复线程/ID。

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

说明：

- 防抖批处理**仅文本**消息；媒体/附件立即刷新。
- 控制命令（例如 `/queue`、`/new`）绕过防抖，因此它们保持独立。

### `commands`（聊天命令处理）

控制如何在连接器上启用聊天命令。

```json5
{
  commands: {
    native: "auto", // register native commands when supported (auto)
    text: true, // parse slash commands in chat messages
    bash: false, // allow ! (alias: /bash) (host-only; requires tools.elevated allowlists)
    bashForegroundMs: 2000, // bash foreground window (0 backgrounds immediately)
    config: false, // allow /config (writes to disk)
    debug: false, // allow /debug (runtime-only overrides)
    restart: false, // allow /restart + gateway restart tool
    useAccessGroups: true, // enforce access-group allowlists/policies for commands
  },
}
```

说明：

- 文本命令必须作为**独立**消息发送，并使用前缀 `/`（无纯文本别名）。
- `commands.text: false` 禁用解析聊天消息以获取命令。
- `commands.native: "auto"`（默认）为 Discord/Telegram 打开原生命令，并关闭 Slack；不支持的频道保持仅文本。
- 设置 `commands.native: true|false` 以强制全部，或使用 `channels.discord.commands.native`、`channels.telegram.commands.native`、`channels.slack.commands.native`（布尔值或 `"auto"`）覆盖每个频道。`false` 在启动时清除 Discord/Telegram 上先前注册的命令；Slack 命令在 Slack 应用中管理。
- `channels.telegram.customCommands` 添加额外的 Telegram 机器人菜单条目。名称被标准化；与原生命令的冲突将被忽略。
- `commands.bash: true` 启用 `! <cmd>` 以运行主机 shell 命令（`/bash <cmd>` 也可以作为别名）。需要 `tools.elevated.enabled` 并在 `tools.elevated.allowFrom.<channel>` 中将发送者列入白名单。
- `commands.bashForegroundMs` 控制 bash 在后台运行之前等待多长时间。当 bash 作业运行时，新的 `! <cmd>` 请求被拒绝（一次一个）。
- `commands.config: true` 启用 `/config`（读取/写入 `openclaw.json`）。
- `channels.<provider>.configWrites` 门控由该频道发起的配置变更（默认：true）。这适用于 `/config set|unset` 加上提供商特定的自动迁移（Telegram 超级组 ID 更改、Slack 频道 ID 更改）。
- `commands.debug: true` 启用 `/debug`（仅运行时覆盖）。
- `commands.restart: true` 启用 `/restart` 和 Gateway 工具重启操作。
- `commands.useAccessGroups: false` 允许命令绕过访问组白名单/策略。
- 斜杠命令和指令仅被**授权发送者**尊重。授权来自频道白名单/配对加上 `commands.useAccessGroups`。

### `web`（WhatsApp 网络频道运行时）

WhatsApp 通过 Gateway 的网络频道（Baileys Web）运行。当存在链接的会话时，它会自动启动。
设置 `web.enabled: false` 以默认保持关闭。

```json5
{
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

### `channels.telegram`（机器人传输）

仅当存在 `channels.telegram` 配置部分时，OpenClaw 才会启动 Telegram。机器人令牌从 `channels.telegram.botToken`（或 `channels.telegram.tokenFile`）解析，`TELEGRAM_BOT_TOKEN` 作为默认账户的后备。
设置 `channels.telegram.enabled: false` 以禁用自动启动。
多账户支持位于 `channels.telegram.accounts` 下（参见上面的多账户部分）。环境令牌仅适用于默认账户。
设置 `channels.telegram.configWrites: false` 以阻止 Telegram 发起的配置写入（包括超极群组 ID 迁移和 `/config set|unset`）。

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["tg:123456789"], // optional; "open" requires ["*"]
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
      historyLimit: 50, // include last N group messages as context (0 disables)
      replyToMode: "first", // off | first | all
      linkPreview: true, // toggle outbound link previews
      streamMode: "partial", // off | partial | block (draft streaming; separate from block streaming)
      draftChunk: {
        // optional; only for streamMode=block
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph", // paragraph | newline | sentence
      },
      actions: { reactions: true, sendMessage: true }, // tool action gates (false disables)
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 5,
      retry: {
        // outbound retry policy
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
      network: {
        // transport overrides
        autoSelectFamily: false,
      },
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook", // requires webhookSecret
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

草稿流式传输说明：

- 使用 Telegram `sendMessageDraft`（草稿气泡，不是真实消息）。
- 需要**私人聊天主题**（DM 中的 message_thread_id；机器人已启用主题）。
- `/reasoning stream` 将推理流式传输到草稿中，然后发送最终答案。
  重试策略默认值和行为记录在[重试策略](/zh/concepts/retry) 中。

### `channels.discord`（机器人传输）

通过设置机器人令牌和可选门控来配置 Discord 机器人：
多账户支持位于 `channels.discord.accounts` 下（参见上面的多账户部分）。环境令牌仅适用于默认账户。

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 8, // clamp inbound media size
      allowBots: false, // allow bot-authored messages
      actions: {
        // tool action gates (false disables)
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
      dm: {
        enabled: true, // disable all DMs when false
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["1234567890", "steipete"], // optional DM allowlist ("open" requires ["*"])
        groupEnabled: false, // enable group DMs
        groupChannels: ["openclaw-dm"], // optional group DM allowlist
      },
      guilds: {
        "123456789012345678": {
          // guild id (preferred) or slug
          slug: "friends-of-openclaw",
          requireMention: false, // per-guild default
          reactionNotifications: "own", // off | own | all | allowlist
          users: ["987654321098765432"], // optional per-guild user allowlist
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
      historyLimit: 20, // include last N guild messages as context
      textChunkLimit: 2000, // optional outbound text chunk size (chars)
      chunkMode: "length", // optional chunking mode (length | newline)
      maxLinesPerMessage: 17, // soft max lines per message (Discord UI clipping)
      retry: {
        // outbound retry policy
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

仅当存在 `channels.discord` 配置部分时，OpenClaw 才会启动 Discord。令牌从 `channels.discord.token` 解析，`DISCORD_BOT_TOKEN` 作为默认账户的后备（除非 `channels.discord.enabled` 是 `false`）。在为 cron/CLI 命令指定传递目标时，请使用 `user:<id>`（DM）或 `channel:<id>`（公会频道）；裸数字 ID 有歧义并被拒绝。
公会 slug 为小写，空格替换为 `-`；频道键使用 slug 频道名称（无前缀 `#`）。首选公会 ID 作为键以避免重命名歧义。
默认情况下会忽略机器人编写的消息。使用 `channels.discord.allowBots` 启用（自己的消息仍会被过滤以防止自回复循环）。
反应通知模式：

- `off`：无反应事件。
- `own`：机器人自己消息上的反应（默认）。
- `all`：所有消息上的所有反应。
- `allowlist`：来自 `guilds.<id>.users` 在所有消息上的反应（空列表禁用）。
  传出文本按 `channels.discord.textChunkLimit` 分块（默认 2000）。设置 `channels.discord.chunkMode="newline"` 以在长度分块之前按空行（段落边界）拆分。Discord 客户端可能会裁剪非常高的消息，因此 `channels.discord.maxLinesPerMessage`（默认 17）会拆分长的多行回复，即使低于 2000 个字符。
  重试策略默认值和行为记录在[重试策略](/zh/concepts/retry) 中。

### `channels.googlechat`（Chat API 网络钩子）

Google Chat 通过 HTTP 网络钩子运行，具有应用级认证（服务账户）。
多账户支持位于 `channels.googlechat.accounts` 下（参见上面的多账户部分）。环境变量仅适用于默认账户。

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; improves mention detection
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["users/1234567890"], // optional; "open" requires ["*"]
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

说明：

- 服务账户 JSON 可以是内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 默认账户的环境后备：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- `audienceType` + `audience` 必须匹配 Chat 应用的网络钩子认证配置。
- 设置传递目标时，请使用 `spaces/<spaceId>` 或 `users/<userId|email>`。

### `channels.slack`（套接字模式）

Slack 在套接字模式下运行，需要机器人令牌和应用令牌：

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["U123", "U456", "*"], // optional; "open" requires ["*"]
        groupEnabled: false,
        groupChannels: ["G123"],
      },
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
      historyLimit: 50, // include last N channel/group messages as context (0 disables)
      allowBots: false,
      reactionNotifications: "own", // off | own | all | allowlist
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
      textChunkLimit: 4000,
      chunkMode: "length",
      mediaMaxMb: 20,
    },
  },
}
```

多账户支持位于 `channels.slack.accounts` 下（参见上面的多账户部分）。环境令牌仅适用于默认账户。

当提供商已启用并且两个令牌都已设置（通过配置或 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）时，OpenClaw 会启动 Slack。在为 cron/CLI 命令指定传递目标时，请使用 `user:<id>`（DM）或 `channel:<id>`。
设置 `channels.slack.configWrites: false` 以阻止 Slack 发起的配置写入（包括频道 ID 迁移和 `/config set|unset`）。

默认情况下会忽略机器人编写的消息。使用 `channels.slack.allowBots` 或 `channels.slack.channels.<id>.allowBots` 启用。

反应通知模式：

- `off`：无反应事件。
- `own`：机器人自己消息上的反应（默认）。
- `all`：所有消息上的所有反应。
- `allowlist`：来自 `channels.slack.reactionAllowlist` 在所有消息上的反应（空列表禁用）。

线程会话隔离：

- `channels.slack.thread.historyScope` 控制线程历史是每个线程（`thread`，默认）还是在频道之间共享（`channel`）。
- `channels.slack.thread.inheritParent` 控制新线程会话是否继承父频道记录（默认：false）。

Slack 操作组（门控 `slack` 工具操作）：
| 操作组 | 默认 | 说明 |
| --- | --- | --- |
| reactions | enabled | 反应 + 列出反应 |
| messages | enabled | 读取/发送/编辑/删除 |
| pins | enabled | 固定/取消固定/列出 |
| memberInfo | enabled | 成员信息 |
| emojiList | enabled | 自定义表情符号列表 |

### `channels.mattermost`（机器人令牌）

Mattermost 作为插件提供，不随核心安装捆绑。
首先安装它：`openclaw plugins install @openclaw/mattermost`（或 `./extensions/mattermost` 从 git 检出）。

Mattermost 需要机器人令牌和服务器的基 URL：

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
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

当账户已配置（机器人令牌 + 基 URL）并启用时，OpenClaw 会启动 Mattermost。令牌 + 基 URL 从 `channels.mattermost.botToken` + `channels.mattermost.baseUrl` 或 `MATTERMOST_BOT_TOKEN` + `MATTERMOST_URL` 解析，用于默认账户（除非 `channels.mattermost.enabled` 是 `false`）。

聊天模式：

- `oncall`（默认）：仅在 @提及时响应频道消息。
- `onmessage`：响应每个频道消息。
- `onchar`：当消息以触发前缀开头时响应（`channels.mattermost.oncharPrefixes`，默认 `[">", "!"]`）。

访问控制：

- 默认 DM：`channels.mattermost.dmPolicy="pairing"`（未知发送者获得配对码）。
- 公共 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。
- 群组：默认 `channels.mattermost.groupPolicy="allowlist"`（提及门控）。使用 `channels.mattermost.groupAllowFrom` 限制发送者。

多账户支持位于 `channels.mattermost.accounts` 下（参见上面的多账户部分）。环境变量仅适用于默认账户。
指定传递目标时，请使用 `channel:<id>` 或 `user:<id>`（或 `@username`）；裸 ID 被视为频道 ID。

### `channels.signal`（signal-cli）

Signal 反应可以发出系统事件（共享反应工具）：

```json5
{
  channels: {
    signal: {
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50, // include last N group messages as context (0 disables)
    },
  },
}
```

反应通知模式：

- `off`：无反应事件。
- `own`：机器人自己消息上的反应（默认）。
- `all`：所有消息上的所有反应。
- `allowlist`：来自 `channels.signal.reactionAllowlist` 在所有消息上的反应（空列表禁用）。

### `channels.imessage`（imsg CLI）

OpenClaw 生成 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要守护进程或端口。

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host", // SCP for remote attachments when using SSH wrapper
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50, // include last N group messages as context (0 disables)
      includeAttachments: false,
      mediaMaxMb: 16,
      service: "auto",
      region: "US",
    },
  },
}
```

多账户支持位于 `channels.imessage.accounts` 下（参见上面的多账户部分）。

说明：

- 需要对消息 DB 的完全磁盘访问。
- 第一次发送将提示消息自动化权限。
- 首选 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `channels.imessage.cliPath` 可以指向包装脚本（例如 `ssh` 到另一台运行 `imsg rpc` 的 Mac）；使用 SSH 密钥避免密码提示。
- 对于远程 SSH 包装器，设置 `channels.imessage.remoteHost` 以在启用 `includeAttachments` 时通过 SCP 获取附件。

包装器示例：

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

### `agents.defaults.workspace`

设置代理用于文件操作的**单一全局工作区目录**。

默认：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果启用 `agents.defaults.sandbox`，非主会话可以使用自己在 `agents.defaults.sandbox.workspaceRoot` 下的每个作用域工作区覆盖此设置。

### `agents.defaults.repoRoot`

可选的存储库根目录，显示在系统提示的运行时行中。如果未设置，OpenClaw 会尝试通过从工作区（和当前工作目录）向上走来检测 `.git` 目录。路径必须存在才能使用。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md` 和 `BOOTSTRAP.md`）的自动创建。

将其用于工作区文件来自存储库的预播种部署。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.bootstrapMaxChars`

在截断之前注入到系统提示中的每个工作区引导文件的最大字符数。默认：`20000`。

当文件超过此限制时，OpenClaw 会记录警告并注入截断的
head/tail with a marker.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.userTimezone`

Sets the user’s timezone for **system prompt context** (not for timestamps in
message envelopes). If unset, OpenClaw uses the host timezone at runtime.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Controls the **time format** shown in the system prompt’s Current Date & Time section.
Default: `auto` (OS preference).

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `messages`

Controls inbound/outbound prefixes and optional ack reactions.
See [Messages](/zh/concepts/messages) for queueing, sessions, and streaming context.

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions",
    removeAckAfterReply: false,
  },
}
```

`responsePrefix` is applied to **all outbound replies** (tool summaries, block
streaming, final replies) across channels unless already present.

Overrides can be configured per channel and per account:

- `channels.<channel>.responsePrefix`
- `channels.<channel>.accounts.<id>.responsePrefix`

Resolution order (most specific wins):

1. `channels.<channel>.accounts.<id>.responsePrefix`
2. `channels.<channel>.responsePrefix`
3. `messages.responsePrefix`

Semantics:

- `undefined` falls through to the next level.
- `""` explicitly disables the prefix and stops the cascade.
- `"auto"` derives `[{identity.name}]` for the routed agent.

Overrides apply to all channels, including extensions, and to every outbound reply kind.

If `messages.responsePrefix` is unset, no prefix is applied by default. WhatsApp self-chat
replies are the exception: they default to `[{identity.name}]` when set, otherwise
`[openclaw]`, so same-phone conversations stay legible.
Set it to `"auto"` to derive `[{identity.name}]` for the routed agent (when set).

#### Template variables

The `responsePrefix` string can include template variables that resolve dynamically:

| Variable          | Description            | Example                     |
| ----------------- | ---------------------- | --------------------------- |
| `{model}`         | Short model name       | `claude-opus-4-5`, `gpt-4o` |
| `{modelFull}`     | Full model identifier  | `anthropic/claude-opus-4-5` |
| `{provider}`      | Provider name          | `anthropic`, `openai`       |
| `{thinkingLevel}` | Current thinking level | `high`, `low`, `off`        |
| `{identity.name}` | Agent identity name    | (same as `"auto"` mode)     |

Variables are case-insensitive (`{MODEL}` = `{model}`). `{think}` is an alias for `{thinkingLevel}`.
Unresolved variables remain as literal text.

```json5
{
  messages: {
    responsePrefix: "[{model} | think:{thinkingLevel}]",
  },
}
```

Example output: `[claude-opus-4-5 | think:high] Here's my response...`

WhatsApp inbound prefix is configured via `channels.whatsapp.messagePrefix` (deprecated:
`messages.messagePrefix`). Default stays **unchanged**: `"[openclaw]"` when
`channels.whatsapp.allowFrom` is empty, otherwise `""` (no prefix). When using
`"[openclaw]"`, OpenClaw will instead use `[{identity.name}]` when the routed
agent has `identity.name` set.

`ackReaction` sends a best-effort emoji reaction to acknowledge inbound messages
on channels that support reactions (Slack/Discord/Telegram/Google Chat). Defaults to the
active agent’s `identity.emoji` when set, otherwise `"👀"`. Set it to `""` to disable.

`ackReactionScope` controls when reactions fire:

- `group-mentions` (default): only when a group/room requires mentions **and** the bot was mentioned
- `group-all`: all group/room messages
- `direct`: direct messages only
- `all`: all messages

`removeAckAfterReply` removes the bot’s ack reaction after a reply is sent
(Slack/Discord/Telegram/Google Chat only). Default: `false`.

#### `messages.tts`

Enable text-to-speech for outbound replies. When on, OpenClaw generates audio
using ElevenLabs or OpenAI and attaches it to responses. Telegram uses Opus
voice notes; other channels send MP3 audio.

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all (include tool/block replies)
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true,
      },
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
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
    },
  },
}
```

Notes:

- `messages.tts.auto` controls auto‑TTS (`off`, `always`, `inbound`, `tagged`).
- `/tts off|always|inbound|tagged` sets the per‑session auto mode (overrides config).
- `messages.tts.enabled` 是传统的；doctor 会将其迁移到 `messages.tts.auto`。
- `prefsPath` 存储本地覆盖（提供商/限制/摘要）。
- `maxTextLength` 是 TTS 输入的硬上限；摘要被截断以适应。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
  - 接受 `provider/model` 或来自 `agents.defaults.models` 的别名。
- `modelOverrides` 启用模型驱动的覆盖，如 `[[tts:...]]` 标签（默认启用）。
- `/tts limit` 和 `/tts summary` 控制每个用户的摘要设置。
- `apiKey` 值回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `elevenlabs.baseUrl` 覆盖 ElevenLabs API 基 URL。
- `elevenlabs.voiceSettings` 支持 `stability`/`similarityBoost`/`style`（0..1）、`useSpeakerBoost` 和 `speed`（0.5..2.0）。

### `talk`

Talk 模式的默认值（macOS/iOS/Android）。语音 ID 在未设置时回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
`apiKey` 在未设置时回退到 `ELEVENLABS_API_KEY`（或 Gateway 的 shell 配置文件）。
`voiceAliases` 允许 Talk 指令使用友好名称（例如 `"voice":"Clawd"`）。

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
    interruptOnSpeech: true,
  },
}
```

### `agents.defaults`

控制嵌入式代理运行时（模型/思考/详细/超时）。
`agents.defaults.models` 定义配置的模型目录（并充当 `/model` 的白名单）。
`agents.defaults.model.primary` 设置默认模型；`agents.defaults.model.fallbacks` 是全局后备。
`agents.defaults.imageModel` 是可选的，**仅在主模型缺少图像输入时使用**。
每个 `agents.defaults.models` 条目可以包括：

- `alias`（可选模型快捷方式，例如 `/opus`）。
- `params`（可选的提供商特定 API 参数，传递给模型请求）。

`params` 也应用于流式运行（嵌入式代理 + 压缩）。目前支持的键：`temperature`、`maxTokens`。这些与调用时选项合并；调用者提供的值获胜。`temperature` 是一个高级旋钮——保持未设置，除非您知道模型的默认值并且需要更改。

Example:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5-20250929": {
          params: { temperature: 0.6 },
        },
        "openai/gpt-5.2": {
          params: { maxTokens: 8192 },
        },
      },
    },
  },
}
```

Z.AI GLM-4.x 模型自动启用思考模式，除非您：

- 设置 `--thinking off`，或
- 自己定义 `agents.defaults.models["zai/<model>"].params.thinking`。

OpenClaw 还提供了一些内置的别名简写。默认值仅在模型已存在于 `agents.defaults.models` 中时应用：

- `opus` -> `anthropic/claude-opus-4-5`
- `sonnet` -> `anthropic/claude-sonnet-4-5`
- `gpt` -> `openai/gpt-5.2`
- `gpt-mini` -> `openai/gpt-5-mini`
- `gemini` -> `google/gemini-3-pro-preview`
- `gemini-flash` -> `google/gemini-3-flash-preview`

如果您自己配置相同的别名（不区分大小写），您的值获胜（默认值从不覆盖）。

示例：Opus 4.5 主模型与 MiniMax M2.1 后备（托管 MiniMax）：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "minimax/MiniMax-M2.1": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: ["minimax/MiniMax-M2.1"],
      },
    },
  },
}
```

MiniMax 认证：设置 `MINIMAX_API_KEY`（环境变量）或配置 `models.providers.minimax`。

#### `agents.defaults.cliBackends`（CLI 后备）

可选的 CLI 后端，用于仅文本后备运行（无工具调用）。当 API 提供商失败时，这些作为备份路径很有用。当您配置接受文件路径的 `imageArg` 时，支持图像直通。

Notes:

- CLI backends are **text-first**; tools are always disabled.
- Sessions are supported when `sessionArg` is set; session ids are persisted per backend.
- For `claude-cli`, defaults are wired in. Override the command path if PATH is minimal
  (launchd/systemd).

Example:

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

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "Opus" },
        "anthropic/claude-sonnet-4-1": { alias: "Sonnet" },
        "openrouter/deepseek/deepseek-r1:free": {},
        "zai/glm-4.7": {
          alias: "GLM",
          params: {
            thinking: {
              type: "enabled",
              clear_thinking: false,
            },
          },
        },
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "openrouter/deepseek/deepseek-r1:free",
          "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        ],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      heartbeat: {
        every: "30m",
        target: "last",
      },
      maxConcurrent: 3,
      subagents: {
        model: "minimax/MiniMax-M2.1",
        maxConcurrent: 1,
        archiveAfterMinutes: 60,
      },
      exec: {
        backgroundMs: 10000,
        timeoutSec: 1800,
        cleanupMs: 1800000,
      },
      contextTokens: 200000,
    },
  },
}
```

#### `agents.defaults.contextPruning`（工具结果修剪）

`agents.defaults.contextPruning` 在向 LLM 发送请求之前立即从内存上下文中修剪**旧工具结果**。
它**不**修改磁盘上的会话历史（`*.jsonl` 保持完整）。

这旨在减少随着时间推移积累大量工具输出的健谈代理的令牌使用。

高级：

- 永不触及用户/助手消息。
- 保护最后的 `keepLastAssistants` 条助手消息（此后没有工具结果被修剪）。
- 保护引导前缀（在第一条用户消息之前的任何内容都不会被修剪）。
- 模式：
  - `adaptive`：当估计的上下文比率超过 `softTrimRatio` 时，软修剪超大的工具结果（保留头/尾）。
    然后在估计的上下文比率超过 `hardClearRatio` 并且有足够的可修剪工具结果体积（`minPrunableToolChars`）时，硬清除最旧的可修剪工具结果。
  - `aggressive`：在截止之前用 `hardClear.placeholder` 替换所有可修剪工具结果（无比率检查）。

软修剪与硬修剪（发送到 LLM 的上下文中发生了什么变化）：

- **软修剪**：仅针对_超大_工具结果。保留开头 + 结尾，并在中间插入 `...`。
  - 之前：`toolResult("…very long output…")`
  - 之后：`toolResult("HEAD…\n...\n…TAIL\n\n[Tool result trimmed: …]")`
- **硬清除**：用占位符替换整个工具结果。
  - 之前：`toolResult("…very long output…")`
  - 之后：`toolResult("[Old tool result content cleared]")`

说明/当前限制：

- 包含**图像块的工具结果被跳过**（目前从不修剪/清除）。
- 估计的”上下文比率”基于**字符**（近似），而不是精确的令牌。
- 如果会话还没有至少 `keepLastAssistants` 条助手消息，则跳过修剪。
- 在 `aggressive` 模式下，`hardClear.enabled` 被忽略（可修剪工具结果总是被 `hardClear.placeholder` 替换）。

默认（自适应）：

```json5
{
  agents: { defaults: { contextPruning: { mode: "adaptive" } } },
}
```

要禁用：

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

默认值（当 `mode` 是 `"adaptive"` 或 `"aggressive"` 时）：

- `keepLastAssistants`：`3`
- `softTrimRatio`：`0.3`（仅自适应）
- `hardClearRatio`：`0.5`（仅自适应）
- `minPrunableToolChars`：`50000`（仅自适应）
- `softTrim`：`{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`（仅自适应）
- `hardClear`：`{ enabled: true, placeholder: "[Old tool result content cleared]" }`

示例（激进，最小）：

```json5
{
  agents: { defaults: { contextPruning: { mode: "aggressive" } } },
}
```

示例（自适应调整）：

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "adaptive",
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        // Optional: restrict pruning to specific tools (deny wins; supports "*" wildcards)
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

有关行为详情，请参阅[/concepts/session-pruning](/zh/concepts/session-pruning)。

#### `agents.defaults.compaction`（预留空间 + 内存刷新）

`agents.defaults.compaction.mode` 选择压缩摘要策略。默认为 `default`；设置 `safeguard` 以启用分块摘要来处理非常长的历史。请参阅[/concepts/compaction](/zh/concepts/compaction)。

`agents.defaults.compaction.reserveTokensFloor` 为 Pi 压缩强制执行最小 `reserveTokens` 值（默认：`20000`）。将其设置为 `0` 以禁用下限。

`agents.defaults.compaction.memoryFlush` 在自动压缩之前运行**静默**代理回合，指示模型在磁盘上存储持久记忆（例如 `memory/YYYY-MM-DD.md`）。当会话令牌估算超过压缩限制以下的软阈值时触发。

传统默认值：

- `memoryFlush.enabled`：`true`
- `memoryFlush.softThresholdTokens`：`4000`
- `memoryFlush.prompt` / `memoryFlush.systemPrompt`：具有 `NO_REPLY` 的内置默认值
- 注意：当会话工作区为只读时跳过内存刷新（`agents.defaults.sandbox.workspaceAccess: "ro"` 或 `"none"`）。

示例（调整）：

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard",
        reserveTokensFloor: 24000,
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

块流式传输：

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖：`*.blockStreaming`（和每个账户的变体）以强制打开/关闭块流式传输。非 Telegram 频道需要显式 `*.blockStreaming: true` 来启用块回复。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`（默认：text_end）。
- `agents.defaults.blockStreamingChunk`：流式块的软分块。默认为 800–1200 个字符，优先段落分隔符（`\n\n`），然后是换行符，然后是句子。
  示例：
  ```json5
  {
    agents: { defaults: { blockStreamingChunk: { minChars: 800, maxChars: 1200 } } },
  }
  ```
- `agents.defaults.blockStreamingCoalesce`：在发送之前合并流式块。
  默认为 `{ idleMs: 1000 }` 并从 `blockStreamingChunk` 继承 `minChars`，其中 `maxChars` 上限为频道文本限制。Signal/Slack/Discord/Google Chat 默认为 `minChars: 1500`，除非被覆盖。
  频道覆盖：`channels.whatsapp.blockStreamingCoalesce`、`channels.telegram.blockStreamingCoalesce`、`channels.discord.blockStreamingCoalesce`、`channels.slack.blockStreamingCoalesce`、`channels.mattermost.blockStreamingCoalesce`、`channels.signal.blockStreamingCoalesce`、`channels.imessage.blockStreamingCoalesce`、`channels.msteams.blockStreamingCoalesce`、`channels.googlechat.blockStreamingCoalesce`（和每个账户的变体）。
- `agents.defaults.humanDelay`: randomized pause between **block replies** after the first.
  Modes: `off` (default), `natural` (800–2500ms), `custom` (use `minMs`/`maxMs`).
  Per-agent override: `agents.list[].humanDelay`.
  Example:
  ```json5
  {
    agents: { defaults: { humanDelay: { mode: "natural" } } },
  }
  ```
  See [/concepts/streaming](/zh/concepts/streaming) for behavior + chunking details.

Typing indicators:

- `agents.defaults.typingMode`: `"never" | "instant" | "thinking" | "message"`. Defaults to
  `instant` for direct chats / mentions and `message` for unmentioned group chats.
- `session.typingMode`: per-session override for the mode.
- `agents.defaults.typingIntervalSeconds`: how often the typing signal is refreshed (default: 6s).
- `session.typingIntervalSeconds`: per-session override for the refresh interval.
  See [/concepts/typing-indicators](/zh/concepts/typing-indicators) for behavior details.

`agents.defaults.model.primary` should be set as `provider/model` (e.g. `anthropic/claude-opus-4-5`).
Aliases come from `agents.defaults.models.*.alias` (e.g. `Opus`).
If you omit the provider, OpenClaw currently assumes `anthropic` as a temporary
deprecation fallback.
Z.AI models are available as `zai/<model>` (e.g. `zai/glm-4.7`) and require
`ZAI_API_KEY` (or legacy `Z_AI_API_KEY`) in the environment.

`agents.defaults.heartbeat` 配置定期心跳运行：

- `every`：持续时间字符串（`ms`、`s`、`m`、`h`）；默认单位分钟。默认：`30m`。设置 `0m` 以禁用。
- `model`：心跳运行的可选覆盖模型（`provider/model`）。
- `includeReasoning`：当 `true` 时，心跳在可用时也会传递单独的 `Reasoning:` 消息（与 `/reasoning on` 形状相同）。默认：`false`。
- `session`：可选会话键，用于控制心跳在哪个会话中运行。默认：`main`。
- `to`：可选的接收者覆盖（特定于频道的 ID，例如 WhatsApp 的 E.164、Telegram 的聊天 ID）。
- `target`：可选的传递频道（`last`、`whatsapp`、`telegram`、`discord`、`slack`、`msteams`、`signal`、`imessage`、`none`）。默认：`last`。
- `prompt`：心跳体的可选覆盖（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。覆盖逐字发送；如果您仍想要文件读取，请包含 `Read HEARTBEAT.md` 行。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之后传递之前允许的最大字符数（默认：300）。

每个代理的心跳：

- 设置 `agents.list[].heartbeat` 以启用或覆盖特定代理的心跳设置。
- 如果任何代理条目定义了 `heartbeat`，**仅那些代理**运行心跳；默认值成为这些代理的共享基线。

心跳运行完整的代理回合。较短的间隔会消耗更多令牌；请注意 `every`，保持 `HEARTBEAT.md` 很小，和/或选择更便宜的 `model`。

`tools.exec` 配置后台执行默认值：

- `backgroundMs`：自动后台之前的时间（毫秒，默认 10000）
- `timeoutSec`：在此运行时间后自动终止（秒，默认 1800）
- `cleanupMs`：在内存中保留已完成会话的时间（毫秒，默认 1800000）
- `notifyOnExit`：当后台执行退出时将系统事件 + 请求心跳排队（默认 true）
- `applyPatch.enabled`：启用实验性 `apply_patch`（仅 OpenAI/OpenAI Codex；默认 false）
- `applyPatch.allowModels`：模型 ID 的可选白名单（例如 `gpt-5.2` 或 `openai/gpt-5.2`）
  注意：`applyPatch` 仅在 `tools.exec` 下。

`tools.web` 配置网络搜索 + 获取工具：

- `tools.web.search.enabled`（默认：当密钥存在时为 true）
- `tools.web.search.apiKey`（推荐：通过 `openclaw configure --section web` 设置，或使用 `BRAVE_API_KEY` 环境变量）
- `tools.web.search.maxResults`（1–10，默认 5）
- `tools.web.search.timeoutSeconds`（默认 30）
- `tools.web.search.cacheTtlMinutes`（默认 15）
- `tools.web.fetch.enabled`（默认 true）
- `tools.web.fetch.maxChars`（默认 50000）
- `tools.web.fetch.maxCharsCap`（默认 50000；限制配置/工具调用的 maxChars）
- `tools.web.fetch.timeoutSeconds`（默认 30）
- `tools.web.fetch.cacheTtlMinutes`（默认 15）
- `tools.web.fetch.userAgent`（可选覆盖）
- `tools.web.fetch.readability`（默认 true；禁用以仅使用基本 HTML 清理）
- `tools.web.fetch.firecrawl.enabled`（当设置 API 密钥时默认为 true）
- `tools.web.fetch.firecrawl.apiKey`（可选；默认为 `FIRECRAWL_API_KEY`）
- `tools.web.fetch.firecrawl.baseUrl`（默认 https://api.firecrawl.dev）
- `tools.web.fetch.firecrawl.onlyMainContent`（默认 true）
- `tools.web.fetch.firecrawl.maxAgeMs`（可选）
- `tools.web.fetch.firecrawl.timeoutSeconds`（可选）

`tools.media` 配置传入媒体理解（图像/音频/视频）：

- `tools.media.models`：共享模型列表（按能力标记；在每个能力列表之后使用）。
- `tools.media.concurrency`：最大并发能力运行（默认 2）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - `enabled`：退出开关（配置模型时默认为 true）。
  - `prompt`：可选的提示覆盖（图像/视频自动附加 `maxChars` 提示）。
  - `maxChars`：最大输出字符数（图像/视频默认 500；音频未设置）。
  - `maxBytes`：要发送的最大媒体大小（默认：图像 10MB，音频 20MB，视频 50MB）。
  - `timeoutSeconds`：请求超时（默认：图像 60s，音频 60s，视频 120s）。
  - `language`：可选音频提示。
  - `attachments`：附件策略（`mode`、`maxAttachments`、`prefer`）。
  - `scope`：可选门控（第一个匹配获胜）带有 `match.channel`、`match.chatType` 或 `match.keyPrefix`。
  - `models`：模型条目的有序列表；失败或超大媒体回退到下一个条目。
- 每个 `models[]` 条目：
  - 提供商条目（`type: "provider"` 或省略）：
    - `provider`：API 提供商 ID（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）。
    - `model`：模型 ID 覆盖（图像必需；音频提供商默认为 `gpt-4o-mini-transcribe`/`whisper-large-v3-turbo`，视频为 `gemini-3-flash-preview`）。
    - `profile` / `preferredProfile`：认证配置文件选择。
  - CLI 条目（`type: "cli"`）：
    - `command`：要运行的可执行文件。
    - `args`：模板化参数（支持 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等）。
  - `capabilities`：可选列表（`image`、`audio`、`video`）以门控共享条目。省略时默认：`openai`/`anthropic`/`minimax` → 图像，`google` → 图像+音频+视频，`groq` → 音频。
  - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language` 可以按条目覆盖。

如果未配置模型（或 `enabled: false`），则跳过理解；模型仍然接收原始附件。

提供商认证遵循标准模型认证顺序（认证配置文件、环境变量如 `OPENAI_API_KEY`/`GROQ_API_KEY`/`GEMINI_API_KEY` 或 `models.providers.*.apiKey`）。

Example:

```json5
{
  tools: {
    media: {
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

`agents.defaults.subagents` 配置子代理默认值：

- `model`：生成的子代理的默认模型（字符串或 `{ primary, fallbacks }`）。如果省略，子代理继承调用者的模型，除非每个代理或每次调用覆盖。
- `maxConcurrent`：最大并发子代理运行（默认 1）
- `archiveAfterMinutes`：在 N 分钟后自动存档子代理会话（默认 60；设置 `0` 以禁用）
- 每个子代理工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`（拒绝获胜）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置**基本工具白名单**：

- `minimal`: `session_status` only
- `coding`: `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging`: `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full`: no restriction (same as unset)

每个代理的覆盖：`agents.list[].tools.profile`。

示例（默认仅消息，也允许 Slack + Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

示例（编码配置文件，但在各处拒绝 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

`tools.byProvider` 让您可以**进一步限制**特定提供商（或单个 `provider/model`）的工具。
每个代理的覆盖：`agents.list[].tools.byProvider`。

顺序：基本配置文件 → 提供商配置文件 → 允许/拒绝策略。
提供商键接受 `provider`（例如 `google-antigravity`）或 `provider/model`
（例如 `openai/gpt-5.2`）。

示例（保留全局编码配置文件，但 Google Antigravity 使用最少工具）：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

示例（提供商/模型特定的允许列表）：

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

`tools.allow` / `tools.deny` 配置全局工具允许/拒绝策略（拒绝获胜）。
匹配不区分大小写并支持 `*` 通配符（`"*"` 表示所有工具）。
即使 Docker 沙箱**关闭**，也会应用此策略。

示例（在各处禁用 browser/canvas）：

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

工具组（简写）在**全局**和**每个代理**工具策略中有效：

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: all built-in OpenClaw tools (excludes provider plugins)

`tools.elevated` 控制提升（主机）exec 访问：

- `enabled`：允许提升模式（默认 true）
- `allowFrom`：每个频道的允许列表（空 = 已禁用）
  - `whatsapp`：E.164 号码
  - `telegram`：聊天 ID 或用户名
  - `discord`：用户 ID 或用户名（如果省略则回退到 `channels.discord.dm.allowFrom`）
  - `signal`：E.164 号码
  - `imessage`：句柄/聊天 ID
  - `webchat`：会话 ID 或用户名

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["steipete", "1234567890123"],
      },
    },
  },
}
```

每个代理的覆盖（进一步限制）：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        tools: {
          elevated: { enabled: false },
        },
      },
    ],
  },
}
```

说明：

- `tools.elevated` 是全局基线。`agents.list[].tools.elevated` 只能进一步限制（两者都必须允许）。
- `/elevated on|off|ask|full` 存储每个会话键的状态；内联指令应用于单个消息。
- 提升 `exec` 在主机上运行并绕过沙箱。
- 工具策略仍然适用；如果 `exec` 被拒绝，则无法使用提升模式。

`agents.defaults.maxConcurrent` 设置跨会话可以并行执行的嵌入式代理运行的最大数量。
每个会话仍然是串行的（每次每个会话键一个运行）。默认：1。

### `agents.defaults.sandbox`

嵌入式代理的可选 **Docker 沙箱**。适用于非主会话，使其无法访问您的主机系统。

详情：[沙箱](/zh/gateway/sandboxing)

默认值（如果启用）：

- 作用域：`"agent"`（每个代理一个容器 + 工作区）
- 基于 Debian bookworm-slim 的镜像
- 代理工作区访问：`workspaceAccess: "none"`（默认）
  - `"none"`：在 `~/.openclaw/sandboxes` 下使用每个作用域的沙箱工作区
- `"ro"`：将沙箱工作区保留在 `/workspace`，并以只读方式在 `/agent` 挂载代理工作区（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"`：以读/写方式在 `/workspace` 挂载代理工作区
- 自动修剪：空闲 > 24 小时 或 存在 > 7 天
- 工具策略：仅允许 `exec`、`process`、`read`、`write`、`edit`、`apply_patch`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`（拒绝获胜）
  - 通过 `tools.sandbox.tools` 配置，通过 `agents.list[].tools.sandbox.tools` 每个代理覆盖
  - 沙箱策略中支持工具组简写：`group:runtime`、`group:fs`、`group:sessions`、`group:memory`（参见[沙箱 vs 工具策略 vs 提升](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)）
- 可选的沙箱浏览器（Chromium + CDP，noVNC 观察器）
- 加固选项：`network`、`user`、`pidsLimit`、`memory`、`cpus`、`ulimits`、`seccompProfile`、`apparmorProfile`

警告：`scope: "shared"` 表示共享容器和共享工作区。没有跨会话隔离。使用 `scope: "session"` 进行每个会话隔离。

传统：`perSession` 仍然支持（`true` → `scope: "session"`、`false` → `scope: "shared"`）。

`setupCommand` 在容器创建后运行**一次**（通过 `sh -lc` 在容器内部）。
对于软件包安装，确保网络出口、可写的根文件系统和 root 用户。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
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
          // Per-agent override (multi-agent): agents.list[].sandbox.docker.*
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
          binds: ["/var/run/docker.sock:/var/run/docker.sock", "/home/user/source:/source:rw"],
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          containerPrefix: "openclaw-sbx-browser-",
          cdpPort: 9222,
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          allowedControlUrls: ["http://10.0.0.42:18791"],
          allowedControlHosts: ["browser.lab.local", "10.0.0.42"],
          allowedControlPorts: [18791],
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7, // 0 disables max-age pruning
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

使用以下命令构建默认沙箱镜像：

```bash
scripts/sandbox-setup.sh
```

注意：沙箱容器默认为 `network: "none"`；如果代理需要出站访问，请将 `agents.defaults.sandbox.docker.network`
设置为 `"bridge"`（或您的自定义网络）。

注意：传入附件暂存到活动工作区的 `media/inbound/*`。使用 `workspaceAccess: "rw"` 时，这意味着文件被写入代理工作区。

注意：`docker.binds` 挂载其他主机目录；全局和每个代理的绑定会被合并。

使用以下命令构建可选的浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

当 `agents.defaults.sandbox.browser.enabled=true` 时，浏览器工具使用沙箱
Chromium 实例 (CDP)。如果启用 noVNC（headless=false 时默认），noVNC URL 会注入到系统提示中，以便代理可以引用它。
这不需要在主配置中设置 `browser.enabled`；沙箱控制 URL 按会话注入。

`agents.defaults.sandbox.browser.allowHostControl`（默认：false）允许
沙箱会话通过浏览器工具（`target: "host"`）明确针对**主机**浏览器控制服务器。
如果您需要严格的沙箱隔离，请保持关闭。

远程控制的允许列表：

- `allowedControlUrls`：`target: "custom"` 允许的确切控制 URL。
- `allowedControlHosts`：允许的主机名（仅主机名，无端口）。
- `allowedControlPorts`：允许的端口（默认：http=80，https=443）。
  默认值：所有允许列表均未设置（无限制）。`allowHostControl` 默认为 false。

### `models`（自定义提供商 + 基本 URL）

OpenClaw 使用 **pi-coding-agent** 模型目录。您可以通过编写
`~/.openclaw/agents/<agentId>/agent/models.json` 或在 `models.providers` 下的 OpenClaw 配置中定义相同的架构来添加自定义提供商
（LiteLLM、本地 OpenAI 兼容服务器、Anthropic 代理等）。
提供商概览 + 示例：[/concepts/model-providers](/zh/concepts/model-providers)。

当存在 `models.providers` 时，OpenClaw 在启动时将 `models.json` 写入/合并到
`~/.openclaw/agents/<agentId>/agent/` 中：

- 默认行为：**合并**（保留现有提供商，按名称覆盖）
- 设置 `models.mode: "replace"` 以覆盖文件内容

通过 `agents.defaults.model.primary`（提供商/模型）选择模型。

```json5
{
  agents: {
    defaults: {
      model: { primary: "custom-proxy/llama-3.1-8b" },
      models: {
        "custom-proxy/llama-3.1-8b": {},
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions",
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

### OpenCode Zen（多模型代理）

OpenCode Zen 是一个具有每个模型端点的多模型 Gateway。OpenClaw 使用
来自 pi-ai 的内置 `opencode` 提供商；从 https://opencode.ai/auth 设置 `OPENCODE_API_KEY`（或
`OPENCODE_ZEN_API_KEY`）。

Notes:

- 模型引用使用 `opencode/<modelId>`（示例：`opencode/claude-opus-4-5`）。
- 如果您通过 `agents.defaults.models` 启用允许列表，请添加您计划使用的每个模型。
- 快捷方式：`openclaw onboard --auth-choice opencode-zen`。

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-5" },
      models: { "opencode/claude-opus-4-5": { alias: "Opus" } },
    },
  },
}
```

### Z.AI (GLM-4.7) — 提供商别名支持

Z.AI 模型可通过内置 `zai` 提供商获得。在您的环境中设置 `ZAI_API_KEY`
并通过提供商/模型引用模型。

快捷方式：`openclaw onboard --auth-choice zai-api-key`。

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

Notes:

- `z.ai/*` 和 `z-ai/*` 是接受的别名并标准化为 `zai/*`。
- 如果缺少 `ZAI_API_KEY`，对 `zai/*` 的请求将在运行时因认证错误而失败。
- 错误示例：`No API key found for provider "zai".`
- Z.AI 的通用 API 端点是 `https://api.z.ai/api/paas/v4`。GLM 编码
  请求使用专用的编码端点 `https://api.z.ai/api/coding/paas/v4`。
  内置 `zai` 提供商使用编码端点。如果您需要通用端点，请在 `models.providers` 中定义自定义提供商并覆盖基本 URL
  （参见上面的自定义提供商部分）。
- 在文档/配置中使用虚假占位符；永远不要提交真实的 API 密钥。

### Moonshot AI (Kimi)

使用 Moonshot 的 OpenAI 兼容端点：

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

Notes:

- 在环境中设置 `MOONSHOT_API_KEY` 或使用 `openclaw onboard --auth-choice moonshot-api-key`。
- 模型引用：`moonshot/kimi-k2.5`。
- 对于中国端点，要么：
  - 运行 `openclaw onboard --auth-choice moonshot-api-key-cn`（向导将设置 `https://api.moonshot.cn/v1`），或
  - 在 `models.providers.moonshot` 中手动设置 `baseUrl: "https://api.moonshot.cn/v1"`。

### Kimi 编码

使用 Moonshot AI 的 Kimi 编码端点（Anthropic 兼容，内置提供商）：

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

Notes:

- 在环境中设置 `KIMI_API_KEY` 或使用 `openclaw onboard --auth-choice kimi-code-api-key`。
- 模型引用：`kimi-coding/k2p5`。

### Synthetic (Anthropic 兼容)

使用 Synthetic 的 Anthropic 兼容端点：

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.1": { alias: "MiniMax M2.1" } },
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
            id: "hf:MiniMaxAI/MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
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

Notes:

- 设置 `SYNTHETIC_API_KEY` 或使用 `openclaw onboard --auth-choice synthetic-api-key`。
- 模型引用：`synthetic/hf:MiniMaxAI/MiniMax-M2.1`。
- 基本 URL 应省略 `/v1`，因为 Anthropic 客户端会附加它。

### 本地模型 (LM Studio) — 推荐设置

参见 [/gateway/local-models](/zh/gateway/local-models) 了解当前的本地指南。简而言之：在强大的硬件上通过 LM Studio Responses API 运行 MiniMax M2.1；保持托管模型合并以进行回退。

### MiniMax M2.1

直接使用 MiniMax M2.1，无需 LM Studio：

```json5
{
  agent: {
    model: { primary: "minimax/MiniMax-M2.1" },
    models: {
      "anthropic/claude-opus-4-5": { alias: "Opus" },
      "minimax/MiniMax-M2.1": { alias: "Minimax" },
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
            id: "MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: false,
            input: ["text"],
            // Pricing: update in models.json if you need exact cost tracking.
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

Notes:

- 设置 `MINIMAX_API_KEY` 环境变量或使用 `openclaw onboard --auth-choice minimax-api`。
- 可用模型：`MiniMax-M2.1`（默认）。
- 如果您需要准确的成本跟踪，请更新 `models.json` 中的定价。

### Cerebras (GLM 4.6 / 4.7)

通过其 OpenAI 兼容端点使用 Cerebras：

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

Notes:

- 对 Cerebras 使用 `cerebras/zai-glm-4.7`；对 Z.AI 直连使用 `zai/glm-4.7`。
- 在环境或配置中设置 `CEREBRAS_API_KEY`。

Notes:

- 支持的 API：`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai`
- 使用 `authHeader: true` + `headers` 进行自定义认证需求。
- 如果您希望 `models.json` 存储在其他地方（默认：`~/.openclaw/agents/main/agent`），请使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`）覆盖代理配置根目录。

### `session`

控制会话作用域、重置策略、重置触发器以及会话存储的写入位置。

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main",
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      dm: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    // Default is already per-agent under ~/.openclaw/agents/<agentId>/sessions/sessions.json
    // You can override with {agentId} templating:
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    // Direct chats collapse to agent:<agentId>:<mainKey> (default: "main").
    mainKey: "main",
    agentToAgent: {
      // Max ping-pong reply turns between requester/target (0–5).
      maxPingPongTurns: 5,
    },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

Fields:

- `mainKey`：直接聊天存储桶键（默认：`"main"`）。当您想”重命名”主 DM 线程而不更改 `agentId` 时很有用。
  - 沙箱注意：`agents.defaults.sandbox.mode: "non-main"` 使用此键检测主会话。任何与 `mainKey` 不匹配的会话键（群组/频道）都会被沙箱化。
- `dmScope`：DM 会话的分组方式（默认：`"main"`）。
  - `main`：所有 DM 共享主会话以保持连续性。
  - `per-peer`：按跨频道的发送者 ID 隔离 DM。
  - `per-channel-peer`：按频道 + 发送者隔离 DM（推荐用于多用户收件箱）。
  - `per-account-channel-peer`：按账户 + 频道 + 发送者隔离 DM（推荐用于多账户收件箱）。
  - 安全 DM 模式（推荐）：当多个人可以向 DM 机器人时设置 `session.dmScope: "per-channel-peer"`（共享收件箱、多人允许列表或 `dmPolicy: "open"`）。
- `identityLinks`：将规范 ID 映射到提供商前缀的对等点，以便同一人在使用 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 时跨频道共享 DM 会话。
  - 示例：`alice: ["telegram:123456789", "discord:987654321012345678"]`。
- `reset`：主重置策略。默认为 Gateway 主机本地时间凌晨 4:00 的每日重置。
  - `mode`：`daily` 或 `idle`（默认：当存在 `reset` 时为 `daily`）。
  - `atHour`：每日重置边界的本地小时（0-23）。
  - `idleMinutes`：以分钟为单位的滑动空闲窗口。当同时配置 daily + idle 时，先到期的获胜。
- `resetByType`：每个会话对 `dm`、`group` 和 `thread` 的覆盖。
  - 如果您仅设置传统 `session.idleMinutes` 而没有任何 `reset`/`resetByType`，OpenClaw 为了向后兼容将保持仅空闲模式。
- `heartbeatIdleMinutes`：心跳检查的可选空闲覆盖（启用时仍应用每日重置）。
- `agentToAgent.maxPingPongTurns`：请求者/目标之间的最大回复回合（0–5，默认 5）。
- `sendPolicy.default`：当没有规则匹配时的 `allow` 或 `deny` 回退。
- `sendPolicy.rules[]`：按 `channel`、`chatType`（`direct|group|room`）或 `keyPrefix`（例如 `cron:`）匹配。第一个拒绝获胜；否则允许。

### `skills`（技能配置）

控制捆绑允许列表、安装首选项、额外技能文件夹和每个技能的覆盖。
适用于**捆绑**技能和 `~/.openclaw/skills`（工作区技能在名称冲突时仍然获胜）。

Fields:

- `allowBundled`：仅适用于**捆绑**技能的可选允许列表。如果设置，则只有那些捆绑技能有资格（托管/工作区技能不受影响）。
- `load.extraDirs`：要扫描的其他技能目录（优先级最低）。
- `install.preferBrew`：在可用时首选 brew 安装程序（默认：true）。
- `install.nodeManager`：node 安装程序首选项（`npm` | `pnpm` | `yarn`，默认：npm）。
- `entries.<skillKey>`：每个技能的配置覆盖。

每个技能的字段：

- `enabled`：设置 `false` 以禁用技能，即使它已被捆绑/安装。
- `env`：为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`：为声明主要环境变量的技能提供的可选便利（例如 `nano-banana-pro` → `GEMINI_API_KEY`）。

Example:

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
    },
    entries: {
      "nano-banana-pro": {
        apiKey: "GEMINI_KEY_HERE",
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

### `plugins`（扩展）

控制插件发现、允许/拒绝和每个插件的配置。插件从
`~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及任何
`plugins.load.paths` 条目加载。**配置更改需要重启 Gateway。**
有关完整用法，请参见 [/plugin](/zh/plugin)。

Fields:

- `enabled`：插件加载的主开关（默认：true）。
- `allow`：插件 ID 的可选允许列表；设置后，仅加载列出的插件。
- `deny`：插件 ID 的可选拒绝列表（拒绝获胜）。
- `load.paths`：要加载的其他插件文件或目录（绝对路径或 `~`）。
- `entries.<pluginId>`：每个插件的覆盖。
  - `enabled`：设置 `false` 以禁用。
  - `config`：插件特定的配置对象（如果提供，由插件验证）。

Example:

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    load: {
      paths: ["~/Projects/oss/voice-call-extension"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
        },
      },
    },
  },
}
```

### `browser`（OpenClaw 管理的浏览器）

OpenClaw 可以为 openclaw 启动一个**专用、隔离的** Chrome/Brave/Edge/Chromium 实例并暴露一个小型环回控制服务。
配置文件可以通过 `profiles.<name>.cdpUrl` 指向**远程**基于 Chromium 的浏览器。远程
配置文件仅附加（禁用 start/stop/reset）。

`browser.cdpUrl` 保留用于传统单配置文件配置，以及作为仅设置 `cdpPort` 的配置文件的基本
方案/主机。

Defaults:

- 已启用：`true`
- evaluateEnabled：`true`（设置 `false` 以禁用 `act:evaluate` 和 `wait --fn`）
- 控制服务：仅环回（端口从 `gateway.port` 派生，默认 `18791`）
- CDP URL：`http://127.0.0.1:18792`（控制服务 + 1，传统单配置文件）
- 配置文件颜色：`#FF4500`（龙虾橙）
- 注意：控制服务器由运行的 Gateway 启动（OpenClaw.app 菜单栏或 `openclaw gateway`）。
- 自动检测顺序：如果基于 Chromium 则为默认浏览器；否则为 Chrome → Brave → Edge → Chromium → Chrome Canary。

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    defaultProfile: "chrome",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // Advanced:
    // headless: false,
    // noSandbox: false,
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false, // set true when tunneling a remote CDP to localhost
  },
}
```

### `ui`（外观）

本机应用程序用于 UI 铬的可选强调色（例如 Talk Mode 气泡色调）。

如果未设置，客户端回退到柔和的浅蓝色。

```json5
{
  ui: {
    seamColor: "#FF4500", // hex (RRGGBB or #RRGGBB)
    // Optional: Control UI assistant identity override.
    // If unset, the Control UI uses the active agent identity (config or IDENTITY.md).
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, or image URL/data URI
    },
  },
}
```

### `gateway`（Gateway 服务器模式 + 绑定）

使用 `gateway.mode` 显式声明此机器是否应运行 Gateway。

Defaults:

- 模式：**未设置**（视为”不自动启动”）
- 绑定：`loopback`
- 端口：`18789`（WS + HTTP 的单个端口）

```json5
{
  gateway: {
    mode: "local", // or "remote"
    port: 18789, // WS + HTTP multiplex
    bind: "loopback",
    // controlUi: { enabled: true, basePath: "/openclaw" }
    // auth: { mode: "token", token: "your-token" } // token gates WS + Control UI access
    // tailscale: { mode: "off" | "serve" | "funnel" }
  },
}
```

控制 UI 基本路径：

- `gateway.controlUi.basePath` 设置控制 UI 服务的 URL 前缀。
- 示例：`"/ui"`、`"/openclaw"`、`"/apps/openclaw"`。
- 默认值：根 (`/`)（未更改）。
- `gateway.controlUi.root` 设置控制 UI 资源的文件系统根目录（默认：`dist/control-ui`）。
- `gateway.controlUi.allowInsecureAuth` 允许控制 UI 仅使用令牌认证，当
  省略设备标识时（通常通过 HTTP）。默认：`false`。首选 HTTPS
  (Tailscale Serve) 或 `127.0.0.1`。
- `gateway.controlUi.dangerouslyDisableDeviceAuth` 禁用控制 UI 的设备标识检查
  （仅令牌/密码）。默认：`false`。仅供紧急情况使用。

相关文档：

- [控制 UI](/zh/web/control-ui)
- [Web 概述](/zh/web)
- [Tailscale](/zh/gateway/tailscale)
- [远程访问](/zh/gateway/remote)

可信代理：

- `gateway.trustedProxies`：在 Gateway 前面终止 TLS 的反向代理 IP 列表。
- 当连接来自这些 IP 之一时，OpenClaw 使用 `x-forwarded-for`（或 `x-real-ip`）确定本地配对检查和 HTTP auth/local 检查的客户端 IP。
- 仅列出您完全控制的代理，并确保它们**覆盖**传入的 `x-forwarded-for`。

说明：

- `openclaw gateway` 拒绝启动，除非 `gateway.mode` 设置为 `local`（或者您传递覆盖标志）。
- `gateway.port` 控制用于 WebSocket + HTTP（控制 UI、hooks、A2UI）的单个多路复用端口。
- OpenAI 聊天完成端点：**默认禁用**；通过 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- 优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > 默认 `18789`。
- 默认需要 Gateway 认证（令牌/密码或 Tailscale Serve 标识）。非环回绑定需要共享令牌/密码。
- 入门向导默认生成 Gateway 令牌（即使在环回上）。
- `gateway.remote.token` **仅**用于远程 CLI 调用；它不启用本地 Gateway 认证。`gateway.token` 被忽略。

认证和 Tailscale：

- `gateway.auth.mode` 设置握手要求（`token` 或 `password`）。未设置时，假定令牌认证。
- `gateway.auth.token` 存储令牌认证的共享令牌（由同一台机器上的 CLI 使用）。
- 当设置 `gateway.auth.mode` 时，仅接受该方法（加上可选的 Tailscale 标头）。
- `gateway.auth.password` 可以在此设置，或通过 `OPENCLAW_GATEWAY_PASSWORD`（推荐）。
- `gateway.auth.allowTailscale` 允许 Tailscale Serve 标识头
  (`tailscale-user-login`) 在请求通过环回
  到达时满足认证，带有 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host`。OpenClaw
  在接受之前通过 `tailscale whois` 解析 `x-forwarded-for` 地址来验证标识。
  当 `true` 时，Serve 请求不需要令牌/密码；设置 `false` 以需要明确的凭据。默认为
  `true`，当 `tailscale.mode = "serve"` 且认证模式不是 `password` 时。
- `gateway.tailscale.mode: "serve"` 使用 Tailscale Serve（仅 tailnet，环回绑定）。
- `gateway.tailscale.mode: "funnel"` 公开暴露仪表板；需要认证。
- `gateway.tailscale.resetOnExit` 在关闭时重置 Serve/Funnel 配置。

远程客户端默认值 (CLI)：

- `gateway.remote.url` 设置 CLI 调用的默认 Gateway WebSocket URL，当 `gateway.mode = "remote"` 时。
- `gateway.remote.transport` 选择 macOS 远程传输（`ssh` 默认，`direct` 用于 ws/wss）。当 `direct` 时，`gateway.remote.url` 必须是 `ws://` 或 `wss://`。`ws://host` 默认为端口 `18789`。
- `gateway.remote.token` 提供远程调用的令牌（不设置则无需认证）。
- `gateway.remote.password` 提供远程调用的密码（不设置则无需认证）。

macOS 应用行为：

- OpenClaw.app 监视 `~/.openclaw/openclaw.json`，并在 `gateway.mode` 或 `gateway.remote.url` 更改时实时切换模式。
- 如果未设置 `gateway.mode` 但设置了 `gateway.remote.url`，macOS 应用将其视为远程模式。
- 当您在 macOS 应用中更改连接模式时，它会将 `gateway.mode`（以及远程模式下的 `gateway.remote.url` + `gateway.remote.transport`）写回配置文件。

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "your-token",
      password: "your-password",
    },
  },
}
```

直接传输示例 (macOS 应用)：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "wss://gateway.example.ts.net",
      token: "your-token",
    },
  },
}
```

### `gateway.reload`（配置热重新加载）

Gateway监视 `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）并自动应用更改。

模式：

- `hybrid`（默认）：热应用安全更改；为关键更改重启Gateway。
- `hot`：仅应用热安全更改；需要重启时记录日志。
- `restart`：在任何配置更改时重启Gateway。
- `off`：禁用热重新加载。

```json5
{
  gateway: {
    reload: {
      mode: "hybrid",
      debounceMs: 300,
    },
  },
}
```

#### 热重新加载矩阵（文件 + 影响）

监视的文件：

- `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

热应用（无需完全重启Gateway）：

- `hooks`（webhook auth/path/mappings）+ `hooks.gmail`（Gmail 监视器重启）
- `browser`（浏览器控制服务器重启）
- `cron`（cron 服务重启 + 并发更新）
- `agents.defaults.heartbeat`（心跳运行器重启）
- `web`（WhatsApp web 频道重启）
- `telegram`、`discord`、`signal`、`imessage`（频道重启）
- `agent`、`models`、`routing`、`messages`、`session`、`whatsapp`、`logging`、`skills`、`ui`、`talk`、`identity`、`wizard`（动态读取）

需要完全重启Gateway：

- `gateway`（端口/绑定/认证/控制 UI/tailscale）
- `bridge`（传统）
- `discovery`
- `canvasHost`
- `plugins`
- 任何未知/不支持的配置路径（默认为安全起见重启）

### 多实例隔离

要在一个主机上运行多个Gateway（用于冗余或救援机器人），请隔离每个实例的状态 + 配置并使用唯一端口：

- `OPENCLAW_CONFIG_PATH`（每个实例的配置）
- `OPENCLAW_STATE_DIR`（会话/凭据）
- `agents.defaults.workspace`（记忆）
- `gateway.port`（每个实例唯一）

便利标志 (CLI)：

- `openclaw --dev …` → 使用 `~/.openclaw-dev` + 从基准 `19001` 偏移端口
- `openclaw --profile <name> …` → 使用 `~/.openclaw-<name>`（端口通过配置/环境/标志）

参见 [Gateway手册](/zh/gateway) 了解派生端口映射（Gateway/浏览器/canvas）。
参见 [多Gateway](/zh/gateway/multiple-gateways) 了解浏览器/CDP 端口隔离详情。

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

### `hooks`（Gateway Webhooks）

在Gateway HTTP 服务器上启用简单的 HTTP webhook 端点。

默认值：

- 已启用：`false`
- 路径：`/hooks`
- maxBodyBytes：`262144`（256 KB）

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
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

请求必须包含 hook 令牌：

- `Authorization: Bearer <token>` **或**
- `x-openclaw-token: <token>` **或**
- `?token=<token>`

端点：

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析

`/hooks/agent` 始终将摘要发布到主会话（并且可以通过 `wakeMode: "now"` 可选地触发即时心跳）。

映射说明：

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配负载字段（例如 `{ source: "gmail" }`），以便您可以使用通用 `/hooks/ingest` 路径。
- 像 `{{messages[0].subject}}` 这样的模板从负载中读取。
- `transform` 可以指向返回 hook 操作的 JS/TS 模块。
- `deliver: true` 将最终回复发送到频道；`channel` 默认为 `last`（回退到 WhatsApp）。
- 如果没有先前的传递路由，请显式设置 `channel` + `to`（Telegram/Discord/Google Chat/Slack/Signal/iMessage/MS Teams 需要）。
- `model` 覆盖此 hook 运行的 LLM（`provider/model` 或别名；如果设置了 `agents.defaults.models` 则必须允许）。

Gmail 辅助配置（由 `openclaw webhooks gmail setup` / `run` 使用）：

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

      // Optional: use a cheaper model for Gmail hook processing
      // Falls back to agents.defaults.model.fallbacks, then primary, on auth/rate-limit/timeout
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      // Optional: default thinking level for Gmail hooks
      thinking: "off",
    },
  },
}
```

Gmail hooks 的模型覆盖：

- `hooks.gmail.model` 指定用于 Gmail hook 处理的模型（默认为会话主模型）。
- 接受 `provider/model` 引用或来自 `agents.defaults.models` 的别名。
- 在认证/速率限制/超时时回退到 `agents.defaults.model.fallbacks`，然后 `agents.defaults.model.primary`。
- 如果设置了 `agents.defaults.models`，请在允许列表中包含 hooks 模型。
- 启动时，如果配置的模型不在模型目录或允许列表中，则会警告。
- `hooks.gmail.thinking` 设置 Gmail hooks 的默认思考级别，并被每个 hook 的 `thinking` 覆盖。

Gateway自动启动：

- 如果设置了 `hooks.enabled=true` 和 `hooks.gmail.account`，Gateway会在启动时
  启动 `gog gmail watch serve` 并自动续订监视。
- 设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以禁用自动启动（用于手动运行）。
- 避免在Gateway旁边运行单独的 `gog gmail watch serve`；它将因 `listen tcp 127.0.0.1:8788: bind: address already in use` 而失败。

注意：当 `tailscale.mode` 开启时，OpenClaw 将 `serve.path` 默认设置为 `/`，以便
Tailscale 可以正确代理 `/gmail-pubsub`（它会剥离 set-path 前缀）。
如果您需要后端接收带前缀的路径，请将
`hooks.gmail.tailscale.target` 设置为完整 URL（并调整 `serve.path`）。

### `canvasHost`（LAN/tailnet Canvas 文件服务器 + 实时重新加载）

Gateway通过 HTTP 提供 HTML/CSS/JS 目录，以便 iOS/Android 节点可以直接 `canvas.navigate` 访问它。

默认根目录：`~/.openclaw/workspace/canvas`
默认端口：`18793`（选择以避免 openclaw 浏览器 CDP 端口 `18792`）
服务器侦听**Gateway绑定主机**（LAN 或 Tailnet），以便节点可以访问它。

服务器：

- 在 `canvasHost.root` 下提供文件
- 将微型实时重新加载客户端注入提供的 HTML
- 监视目录并通过 `/__openclaw__/ws` 的 WebSocket 端点广播重新加载
- 目录为空时自动创建启动器 `index.html`（以便您立即看到某些内容）
- 还在 `/__openclaw__/a2ui/` 提供 A2UI 并向节点通告为 `canvasHostUrl`
  （节点始终用于 Canvas/A2UI）

如果目录很大或达到 `EMFILE`，请禁用实时重新加载（和文件监视）：

- 配置：`canvasHost: { liveReload: false }`

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    port: 18793,
    liveReload: true,
  },
}
```

对 `canvasHost.*` 的更改需要Gateway重启（配置重新加载将重启）。

通过以下方式禁用：

- 配置：`canvasHost: { enabled: false }`
- 环境：`OPENCLAW_SKIP_CANVAS_HOST=1`

### `bridge`（传统 TCP 网桥，已移除）

当前版本不再包含 TCP 网桥侦听器；`bridge.*` 配置键被忽略。
节点通过Gateway WebSocket 连接。本节保留供历史参考。

传统行为：

- Gateway可以为节点（iOS/Android）暴露简单的 TCP 网桥，通常在端口 `18790` 上。

默认值：

- 已启用：`true`
- 端口：`18790`
- 绑定：`lan`（绑定到 `0.0.0.0`）

绑定模式：

- `lan`：`0.0.0.0`（可在任何接口上访问，包括 LAN/Wi‑Fi 和 Tailscale）
- `tailnet`：仅绑定到机器的 Tailscale IP（推荐用于 Vienna ⇄ London）
- `loopback`：`127.0.0.1`（仅本地）
- `auto`：如果存在则首选 tailnet IP，否则 `lan`

TLS：

- `bridge.tls.enabled`：为网桥连接启用 TLS（启用时仅 TLS）。
- `bridge.tls.autoGenerate`：当不存在证书/密钥时生成自签名证书（默认：true）。
- `bridge.tls.certPath` / `bridge.tls.keyPath`：网桥证书 + 私钥的 PEM 路径。
- `bridge.tls.caPath`：可选的 PEM CA 包（自定义根或未来的 mTLS）。

当启用 TLS 时，Gateway在发现 TXT 记录中通告 `bridgeTls=1` 和 `bridgeTlsSha256`，以便节点可以固定证书。
手动连接使用首次使用信任（如果尚未存储指纹）。
自动生成的证书需要 PATH 上的 `openssl`；如果生成失败，网桥将不会启动。

```json5
{
  bridge: {
    enabled: true,
    port: 18790,
    bind: "tailnet",
    tls: {
      enabled: true,
      // Uses ~/.openclaw/bridge/tls/bridge-{cert,key}.pem when omitted.
      // certPath: "~/.openclaw/bridge/tls/bridge-cert.pem",
      // keyPath: "~/.openclaw/bridge/tls/bridge-key.pem"
    },
  },
}
```

### `discovery.mdns`（Bonjour / mDNS 广播模式）

控制 LAN mDNS 发现广播（`_openclaw-gw._tcp`）。

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`
- `full`：在 TXT 记录中包含 `cliPath` + `sshPort`
- `off`：完全禁用 mDNS 广播
- 主机名：默认为 `openclaw`（通告 `openclaw.local`）。通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

```json5
{
  discovery: { mdns: { mode: "minimal" } },
}
```

### `discovery.wideArea`（广域 Bonjour / 单播 DNS‑SD）

启用后，Gateway使用配置的发现域（例如：`openclaw.internal.`）在 `~/.openclaw/dns/` 下为 `_openclaw-gw._tcp` 编写单播 DNS-SD 区域。

要使 iOS/Android 跨网络发现（Vienna ⇄ London），请将其与以下内容配对：

- Gateway主机上提供您所选域的 DNS 服务器（推荐 CoreDNS）
- Tailscale **拆分 DNS**，以便客户端通过Gateway DNS 服务器解析该域

一次性设置助手（Gateway主机）：

```bash
openclaw dns setup --apply
```

```json5
{
  discovery: { wideArea: { enabled: true } },
}
```

## 模板变量

模板占位符在 `tools.media.*.models[].args` 和 `tools.media.models[].args`（以及任何未来的模板化参数字段）中扩展。

| 变量 | 描述 |
| ------------------ | ------------------------------------------------------------------------------- | -------- | ------- | ---------- | ----- | ------ | -------- | ------- | ------- | --- |
| `{{Body}}` | 完整的传入消息正文 |
| `{{RawBody}}` | 原始传入消息正文（无历史/发送者包装器；最适于命令解析） |
| `{{BodyStripped}}` | 去除群组提及的正文（代理的最佳默认值） |
| `{{From}}` | 发送者标识符（WhatsApp 为 E.164；可能因频道而异） |
| `{{To}}` | 目标标识符 |
| `{{MessageSid}}` | 频道消息 ID（可用时） |
| `{{SessionId}}` | 当前会话 UUID |
| `{{IsNewSession}}` | 创建新会话时为 `"true"` |
| `{{MediaUrl}}` | 传入媒体伪 URL（如果存在） |
| `{{MediaPath}}` | 本地媒体路径（如果已下载） |
| `{{MediaType}}` | 媒体类型（图像/音频/文档/…） |
| `{{Transcript}}` | 音频转录（启用时） |
| `{{Prompt}}` | CLI 条目的已解析媒体提示 |
| `{{MaxChars}}` | CLI 条目的已解析最大输出字符 |
| `{{ChatType}}` | `"direct"` 或 `"group"` |
| `{{GroupSubject}}` | 群组主题（尽力） |
| `{{GroupMembers}}` | 群组成员预览（尽力） |
| `{{SenderName}}` | 发送者显示名称（尽力） |
| `{{SenderE164}}` | 发送者电话号码（尽力） |
| `{{Provider}}` | 提供商提示（whatsapp | telegram | discord | googlechat | slack | signal | imessage | msteams | webchat | …） |

## Cron（Gateway调度程序）

Cron 是Gateway拥有的调度程序，用于唤醒和计划作业。有关功能概述和 CLI 示例，请参见 [Cron 作业](/zh/automation/cron-jobs)。

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2,
  },
}
```

---

_下一篇：[代理运行时](/zh/concepts/agent)_ 🦞
