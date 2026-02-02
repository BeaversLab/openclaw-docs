---
summary: "~/.openclaw/openclaw.json 的全部配置项与示例"
read_when:
  - 添加或修改配置字段时
title: "配置 🔧"
---
# 配置 🔧

OpenClaw 会读取可选的 **JSON5** 配置文件 `~/.openclaw/openclaw.json`（允许注释与尾随逗号）。

如果文件缺失，OpenClaw 会使用较安全的默认值（内置 Pi agent + 按发件人分会话 + 工作区 `~/.openclaw/workspace`）。你通常只在需要时才配置：
- 限制哪些人可以触发机器人（`channels.whatsapp.allowFrom`, `channels.telegram.allowFrom` 等）
- 控制群组 allowlist 与提及行为（`channels.whatsapp.groups`, `channels.telegram.groups`, `channels.discord.guilds`, `agents.list[].groupChat`）
- 自定义消息前缀（`messages`）
- 设置 agent 的工作区（`agents.defaults.workspace` 或 `agents.list[].workspace`）
- 调整内置 agent 默认值与会话行为（`agents.defaults` 与 `session`）
- 设置每个 agent 的身份（`agents.list[].identity`）

> **第一次配置？** 请看 [配置示例](/zh/gateway/configuration-examples)，包含完整示例与详细说明！

## 严格配置校验

OpenClaw 只接受完全匹配 schema 的配置。
未知键、错误类型或非法值会让 Gateway **拒绝启动**，以确保安全。

当校验失败时：
- Gateway 不会启动。
- 只允许诊断命令（例如：`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`, `openclaw service`, `openclaw help`）。
- 运行 `openclaw doctor` 查看具体问题。
- 运行 `openclaw doctor --fix`（或 `--yes`）应用迁移/修复。

Doctor 不会写入任何更改，除非你明确选择 `--fix`/`--yes`。

## Schema + UI 提示

Gateway 通过 `config.schema` 提供配置的 JSON Schema 表示给 UI 编辑器。
Control UI 会基于该 schema 渲染表单，并提供 **Raw JSON** 编辑器作为逃生舱。

频道插件与扩展可以注册 schema 与 UI 提示，使频道设置在各应用中保持 schema 驱动，
无需硬编码表单。

提示（标签、分组、敏感字段）与 schema 一同发布，这样客户端可以渲染更好的表单，
而无需硬编码配置知识。

## 应用 + 重启（RPC）

用 `config.apply` 一步完成校验 + 写入完整配置，并重启 Gateway。
它会写入重启哨兵，并在 Gateway 恢复后 ping 最近活跃会话。

警告：`config.apply` 会替换 **整个配置**。如果你只想修改少量键，
请使用 `config.patch` 或 `openclaw config set`。务必备份 `~/.openclaw/openclaw.json`。

参数：
- `raw`（string）— 完整配置的 JSON5 载荷
- `baseHash`（可选）— 来自 `config.get` 的配置哈希（当配置已存在时必需）
- `sessionKey`（可选）— 用于唤醒 ping 的最近活跃会话 key
- `note`（可选）— 写入重启哨兵的备注
- `restartDelayMs`（可选）— 重启前延迟（默认 2000）

示例（通过 `gateway call`）：

```bash
openclaw gateway call config.get --params '{}' # capture payload.hash
openclaw gateway call config.apply --params '{
  "raw": "{\\n  agents: { defaults: { workspace: \\\"~/.openclaw/workspace\\\" } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 局部更新（RPC）

使用 `config.patch` 将部分更新合并进现有配置，而不会覆盖无关键。
它应用 JSON merge patch 语义：
- 对象递归合并
- `null` 删除键
- 数组整体替换
像 `config.apply` 一样，它会校验、写入配置、存储重启哨兵，并安排重启
（当提供 `sessionKey` 时可选唤醒）。

参数：
- `raw`（string）— 只包含变更键的 JSON5 载荷
- `baseHash`（必需）— 来自 `config.get` 的配置哈希
- `sessionKey`（可选）— 用于唤醒 ping 的最近活跃会话 key
- `note`（可选）— 写入重启哨兵的备注
- `restartDelayMs`（可选）— 重启前延迟（默认 2000）

示例：

```bash
openclaw gateway call config.get --params '{}' # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{\\n  channels: { telegram: { groups: { \\\"*\\\": { requireMention: false } } } }\\n}\\n",
  "baseHash": "<hash-from-config.get>",
  "sessionKey": "agent:main:whatsapp:dm:+15555550123",
  "restartDelayMs": 1000
}'
```

## 最小配置（推荐起点）

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }
}
```

先构建默认镜像：
```bash
scripts/sandbox-setup.sh
```

## 自聊模式（群控推荐）

为避免机器人在群里响应 WhatsApp 的 @-mentions（只对特定文字触发响应）：

```json5
{
  agents: {
    defaults: { workspace: "~/.openclaw/workspace" },
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["@openclaw", "reisponde"] }
      }
    ]
  },
  channels: {
    whatsapp: {
      // Allowlist 仅适用于私聊；包含自己的号码可启用自聊模式。
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  }
}
```

## 配置包含（`$include`）

使用 `$include` 指令将配置拆分为多个文件。这对于以下场景很有用：
- 组织大型配置（例如按客户分的 agent 定义）
- 在不同环境间共享通用设置
- 将敏感配置分离

### 基本用法

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  
  // 引入单个文件（替换该键的值）
  agents: { "$include": "./agents.json5" },
  
  // 引入多个文件（按顺序深度合并）
  broadcast: { 
    "$include": [
      "./clients/mueller.json5",
      "./clients/schmidt.json5"
    ]
  }
}
```

```json5
// ~/.openclaw/agents.json5
{
  defaults: { sandbox: { mode: "all", scope: "session" } },
  list: [
    { id: "main", workspace: "~/.openclaw/workspace" }
  ]
}
```

### 合并行为

- **单个文件**：替换包含 `$include` 的对象
- **文件数组**：按顺序深度合并（后者覆盖前者）
- **带同级键**：同级键在 include 之后合并（覆盖 include 值）
- **同级键 + 数组/基础类型**：不支持（include 内容必须为对象）

```json5
// 同级键覆盖 include 值
{
  "$include": "./base.json5",   // { a: 1, b: 2 }
  b: 99                          // 结果: { a: 1, b: 99 }
}
```

### 嵌套 include

被包含的文件自身也可以包含 `$include` 指令（最多 10 层）：

```json5
// clients/mueller.json5
{
  agents: { "$include": "./mueller/agents.json5" },
  broadcast: { "$include": "./mueller/broadcast.json5" }
}
```

### 路径解析

- **相对路径**：相对于包含它的文件解析
- **绝对路径**：原样使用
- **父目录**：`../` 可正常工作

```json5
{ "$include": "./sub/config.json5" }      // relative
{ "$include": "/etc/openclaw/base.json5" } // absolute
{ "$include": "../shared/common.json5" }   // parent dir
```

### 错误处理

- **文件缺失**：给出解析后的路径与清晰错误
- **解析错误**：提示哪个被包含的文件失败
- **循环 include**：检测并报告 include 链

### 示例：多客户法律设置

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789, auth: { token: "secret" } },
  
  // 通用 agent 默认值
  agents: {
    defaults: {
      sandbox: { mode: "all", scope: "session" }
    },
    // 合并所有客户的 agent 列表
    list: { "$include": [
      "./clients/mueller/agents.json5",
      "./clients/schmidt/agents.json5"
    ]}
  },
  
  // 合并 broadcast 配置
  broadcast: { "$include": [
    "./clients/mueller/broadcast.json5",
    "./clients/schmidt/broadcast.json5"
  ]},
  
  channels: { whatsapp: { groupPolicy: "allowlist" } }
}
```

```json5
// ~/.openclaw/clients/mueller/agents.json5
[
  { id: "mueller-transcribe", workspace: "~/clients/mueller/transcribe" },
  { id: "mueller-docs", workspace: "~/clients/mueller/docs" }
]
```

```json5
// ~/.openclaw/clients/mueller/broadcast.json5
{
  "120363403215116621@g.us": ["mueller-transcribe", "mueller-docs"]
}
```

## 常见选项

### 环境变量 + `.env`

OpenClaw 从父进程（shell、launchd/systemd、CI 等）读取环境变量。

此外，还会加载：
- 当前工作目录中的 `.env`（若存在）
- `~/.openclaw/.env` 的全局回退 `.env`（即 `$OPENCLAW_STATE_DIR/.env`）

两个 `.env` 文件都不会覆盖已有环境变量。

你也可以在配置中提供内联环境变量。这些仅在进程环境缺少该 key 时生效
（同样的“不覆盖”规则）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-..."
    }
  }
}
```

完整优先级与来源见：[/zh/environment](/zh/environment)。

### `env.shellEnv`（可选）

可选的便捷项：开启后，当预期 key 尚未设置时，OpenClaw 会运行登录 shell 并只导入缺失的 key（从不覆盖）。
这相当于“source”你的 shell 配置文件。

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000
    }
  }
}
```

环境变量等效项：
- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

### 配置中的环境变量替换

你可以在任何配置字符串值中使用 `${VAR_NAME}` 直接引用环境变量。
变量会在配置加载时、校验前被替换。

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}"
      }
    }
  },
  gateway: {
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}"
    }
  }
}
```

**规则：**
- 仅匹配大写环境变量名：`[A-Z_][A-Z0-9_]*`
- 环境变量缺失或为空会在加载时抛错
- 用 `$${VAR}` 转义，输出字面量 `${VAR}`
- 与 `$include` 一起使用时，包含文件也会做替换

**内联替换：**

```json5
{
  models: {
    providers: {
      custom: {
        baseUrl: "${CUSTOM_API_BASE}/v1"  // → "https://api.example.com/v1"
      }
    }
  }
}
```

### 认证存储（OAuth + API keys）

OpenClaw 会将 **每个 agent** 的认证配置（OAuth + API keys）存储在：
- `<agentDir>/auth-profiles.json`（默认：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`）

另见：[/zh/concepts/oauth](/zh/concepts/oauth)

旧版 OAuth 导入：
- `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）

内置 Pi agent 的运行时缓存：
- `<agentDir>/auth.json`（自动管理；不要手动编辑）

旧版 agent 目录（多 agent 之前）：
- `~/.openclaw/agent/*`（由 `openclaw doctor` 迁移到 `~/.openclaw/agents/<defaultAgentId>/agent/*`）

覆盖项：
- OAuth 目录（仅旧版导入）：`OPENCLAW_OAUTH_DIR`
- Agent 目录（默认 agent 根目录覆盖）：`OPENCLAW_AGENT_DIR`（推荐），`PI_CODING_AGENT_DIR`（旧版）

首次使用时，OpenClaw 会将 `oauth.json` 条目导入到 `auth-profiles.json`。

### `auth`

认证配置的可选元数据。**不**存储密钥；它将 profile ID 映射到 provider + 模式（以及可选 email），并定义用于 failover 的 provider 轮换顺序。

```json5
{
  auth: {
    profiles: {
      "anthropic:me@example.com": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" }
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"]
    }
  }
}
```

### `agents.list[].identity`

可选的每个 agent 身份，用于默认值与 UX。由 macOS onboarding 助手写入。

如已设置，OpenClaw 会派生默认值（仅在你未显式设置时）：
- `messages.ackReaction` 来自 **当前 agent** 的 `identity.emoji`（无则回退为 👀）
- `agents.list[].groupChat.mentionPatterns` 来自 agent 的 `identity.name`/`identity.emoji`（让“@Samantha”在 Telegram/Slack/Discord/Google Chat/iMessage/WhatsApp 群里都可用）
- `identity.avatar` 接受工作区内相对路径，或远程 URL/data URL。本地文件必须位于 agent 工作区内。

`identity.avatar` 支持：
- 工作区内相对路径（必须在 agent 工作区内）
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
          avatar: "avatars/samantha.png"
        }
      }
    ]
  }
}
```

### `wizard`

由 CLI 向导（`onboard`, `configure`, `doctor`）写入的元数据。

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local"
  }
}
```

### `logging`

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- 如果需要稳定路径，将 `logging.file` 设为 `/tmp/openclaw/openclaw.log`。
- 控制台输出可单独调整：
  - `logging.consoleLevel`（默认 `info`，`--verbose` 时升为 `debug`）
  - `logging.consoleStyle`（`pretty` | `compact` | `json`）
- 工具摘要可脱敏以避免泄露机密：
  - `logging.redactSensitive`（`off` | `tools`，默认 `tools`）
  - `logging.redactPatterns`（正则字符串数组；覆盖默认值）

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty",
    redactSensitive: "tools",
    redactPatterns: [
      // 示例：用你的规则覆盖默认值。
      "\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1",
      "/\\bsk-[A-Za-z0-9_-]{8,}\\b/gi"
    ]
  }
}
```

### `channels.whatsapp.dmPolicy`

控制 WhatsApp 私聊（DM）的处理方式：
- `"pairing"`（默认）：未知发件人获取配对码；需 owner 批准
- `"allowlist"`：只允许 `channels.whatsapp.allowFrom`（或配对允许库）中的发件人
- `"open"`：允许所有私聊（**需要** `channels.whatsapp.allowFrom` 包含 `"*"`）
- `"disabled"`：忽略所有私聊

配对码 1 小时过期；只有在创建新请求时才会发送配对码。待处理的 DM 配对请求默认每个频道最多 **3 个**。

配对审批：
- `openclaw pairing list whatsapp`
- `openclaw pairing approve whatsapp <code>`

### `channels.whatsapp.allowFrom`

允许触发 WhatsApp 自动回复的 E.164 电话号码 allowlist（**仅私聊**）。
若为空且 `channels.whatsapp.dmPolicy="pairing"`，未知发件人会收到配对码。
群组请使用 `channels.whatsapp.groupPolicy` + `channels.whatsapp.groupAllowFrom`。

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000, // optional outbound chunk size (chars)
      chunkMode: "length", // optional chunking mode (length | newline)
      mediaMaxMb: 50 // optional inbound media cap (MB)
    }
  }
}
```

### `channels.whatsapp.sendReadReceipts`

控制是否将入站 WhatsApp 消息标记为已读（蓝勾）。默认：`true`。

自聊模式即使开启也会跳过已读回执。

每账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`。

```json5
{
  channels: {
    whatsapp: { sendReadReceipts: false }
  }
}
```

### `channels.whatsapp.accounts`（多账号）

在一个 gateway 中运行多个 WhatsApp 账号：

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
        }
      }
    }
  }
}
```

说明：
- 出站命令默认使用 `default` 账号；若不存在，则使用排序后的第一个账号 id。
- 旧版单账号 Baileys auth 目录会由 `openclaw doctor` 迁移到 `whatsapp/default`。

### `channels.telegram.accounts` / `channels.discord.accounts` / `channels.googlechat.accounts` / `channels.slack.accounts` / `channels.mattermost.accounts` / `channels.signal.accounts` / `channels.imessage.accounts`

每个渠道运行多个账号（每个账号有自己的 `accountId` 与可选 `name`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC..."
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ..."
        }
      }
    }
  }
}
```

说明：
- `default` 在省略 `accountId` 时使用（CLI + 路由）。
- 环境变量 token 仅适用于 **default** 账号。
- 基础频道设置（群策略、提及门控等）对所有账号生效，除非每账号覆盖。
- 使用 `bindings[].match.accountId` 将每个账号路由到不同的 `agents.defaults`。

### 群聊提及门控（`agents.list[].groupChat` + `messages.groupChat`）

群消息默认 **需要提及**（元数据提及或正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 与 iMessage 群聊。

**提及类型：**
- **元数据提及**：平台原生 @-mention（例如 WhatsApp 点选提及）。在 WhatsApp 自聊模式中被忽略（见 `channels.whatsapp.allowFrom`）。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中定义的正则。无论是否自聊模式都检查。
- 只有在可检测提及时（原生提及或至少一个 `mentionPattern`）才会执行提及门控。

```json5
{
  messages: {
    groupChat: { historyLimit: 50 }
  },
  agents: {
    list: [
      { id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }
    ]
  }
}
```

`messages.groupChat.historyLimit` 设置群历史上下文的全局默认值。各频道可通过 `channels.<channel>.historyLimit`（或多账号 `channels.<channel>.accounts.*.historyLimit`）覆盖。设为 `0` 可禁用历史拼接。

#### 私聊历史上限

私聊对话使用 agent 管理的会话历史。你可以限制每个 DM 会话保留的用户轮次：

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,  // limit DM sessions to 30 user turns
      dms: {
        "123456789": { historyLimit: 50 }  // per-user override (user ID)
      }
    }
  }
}
```

解析顺序：
1. 每 DM 覆盖：`channels.<provider>.dms[userId].historyLimit`
2. 频道默认：`channels.<provider>.dmHistoryLimit`
3. 无上限（保留全部历史）

支持的 provider：`telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`。

每 agent 覆盖（设置即生效，甚至 `[]` 也覆盖）：
```json5
{
  agents: {
    list: [
      { id: "work", groupChat: { mentionPatterns: ["@workbot", "\\+15555550123"] } },
      { id: "personal", groupChat: { mentionPatterns: ["@homebot", "\\+15555550999"] } }
    ]
  }
}
```

提及门控的默认值按频道定义（`channels.whatsapp.groups`, `channels.telegram.groups`, `channels.imessage.groups`, `channels.discord.guilds`）。当设置了 `*.groups` 时，它也充当群 allowlist；包含 `"*"` 可允许所有群。

仅对特定文字触发回复（忽略原生 @-mentions）：
```json5
{
  channels: {
    whatsapp: {
      // 包含自己的号码以启用自聊模式（忽略原生 @-mentions）。
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          // 只有这些文本模式会触发回应
          mentionPatterns: ["reisponde", "@openclaw"]
        }
      }
    ]
  }
}
```

### 群策略（按频道）

使用 `channels.*.groupPolicy` 控制是否接受群/房间消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    },
    telegram: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["tg:123456789", "@alice"]
    },
    signal: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"]
    },
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["chat_id:123"]
    },
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"]
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "GUILD_ID": {
          channels: { help: { allow: true } }
        }
      }
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } }
    }
  }
}
```

说明：
- `"open"`：群消息绕过 allowlist；提及门控仍生效。
- `"disabled"`：阻止所有群/房间消息。
- `"allowlist"`：只允许配置的群/房间。
- `channels.defaults.groupPolicy` 为 provider 的默认值（当其 `groupPolicy` 未设置时）。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams 使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- Discord/Slack 使用频道 allowlist（`channels.discord.guilds.*.channels`, `channels.slack.channels`）。
- 群 DM（Discord/Slack）仍由 `dm.groupEnabled` + `dm.groupChannels` 控制。
- 默认 `groupPolicy: "allowlist"`（除非 `channels.defaults.groupPolicy` 覆盖）；若未配置 allowlist，则群消息被阻止。

### 多 agent 路由（`agents.list` + `bindings`）

在一个 Gateway 中运行多个隔离的 agent（独立工作区、`agentDir`、会话）。
入站消息通过 bindings 路由到某个 agent。

- `agents.list[]`：每个 agent 的覆盖。
  - `id`：稳定的 agent id（必需）。
  - `default`：可选；若多个设为默认，则取第一个并记录警告。
    若未设置，列表中的 **第一个条目** 为默认 agent。
  - `name`：agent 展示名称。
  - `workspace`：默认 `~/.openclaw/workspace-<agentId>`（`main` 会回退到 `agents.defaults.workspace`）。
  - `agentDir`：默认 `~/.openclaw/agents/<agentId>/agent`。
  - `model`：每 agent 默认模型，覆盖该 agent 的 `agents.defaults.model`。
    - 字符串形式：`"provider/model"`，只覆盖 `agents.defaults.model.primary`
    - 对象形式：`{ primary, fallbacks }`（fallbacks 覆盖 `agents.defaults.model.fallbacks`；`[]` 禁用该 agent 的全局 fallback）
  - `identity`：每 agent 名称/主题/emoji（用于提及模式 + ack 反应）。
  - `groupChat`：每 agent 提及门控（`mentionPatterns`）。
  - `sandbox`：每 agent 沙盒配置（覆盖 `agents.defaults.sandbox`）。
    - `mode`：`"off"` | `"non-main"` | `"all"`
    - `workspaceAccess`：`"none"` | `"ro"` | `"rw"`
    - `scope`：`"session"` | `"agent"` | `"shared"`
    - `workspaceRoot`：自定义沙盒工作区根
    - `docker`：每 agent docker 覆盖（如 `image`, `network`, `env`, `setupCommand`, limits；当 `scope: "shared"` 时忽略）
    - `browser`：每 agent 沙盒浏览器覆盖（当 `scope: "shared"` 时忽略）
    - `prune`：每 agent 沙盒清理覆盖（当 `scope: "shared"` 时忽略）
  - `subagents`：每 agent 子 agent 默认值。
    - `allowAgents`：该 agent 允许 `sessions_spawn` 的 agent id allowlist（`["*"]` = 允许任何；默认：仅同 agent）
  - `tools`：每 agent 工具限制（在沙盒工具策略之前生效）。
    - `profile`：基础工具 profile（在 allow/deny 之前生效）
    - `allow`：允许的工具名数组
    - `deny`：拒绝的工具名数组（deny 优先）
- `agents.defaults`：共享 agent 默认值（模型、工作区、沙盒等）。
- `bindings[]`：将入站消息路由到 `agentId`。
  - `match.channel`（必需）
  - `match.accountId`（可选；`*` = 任意账号；省略 = 默认账号）
  - `match.peer`（可选；`{ kind: dm|group|channel, id }`）
  - `match.guildId` / `match.teamId`（可选；按频道）

确定性匹配顺序：
1) `match.peer`
2) `match.guildId`
3) `match.teamId`
4) `match.accountId`（精确，无 peer/guild/team）
5) `match.accountId: "*"`（频道级，无 peer/guild/team）
6) 默认 agent（`agents.list[].default`，否则首条，否则 `"main"`）

在每个匹配层级内，`bindings` 中第一条匹配项生效。

#### 每 agent 访问档案（多 agent）

每个 agent 都可携带自己的沙盒 + 工具策略。用它在一个 gateway 内混合不同访问级别：
- **完全访问**（个人 agent）
- **只读** 工具 + 工作区
- **无文件系统访问**（仅消息/会话工具）

详见 [多 agent 沙盒与工具](/zh/multi-agent-sandbox-tools) 了解优先级与更多示例。

完全访问（无沙盒）：
```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" }
      }
    ]
  }
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
          workspaceAccess: "ro"
        },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"]
        }
      }
    ]
  }
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
          workspaceAccess: "none"
        },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"]
        }
      }
    ]
  }
}
```

示例：两个 WhatsApp 账号 → 两个 agent：

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" }
    ]
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } }
  ],
  channels: {
    whatsapp: {
      accounts: {
        personal: {},
        biz: {},
      }
    }
  }
}
```

### `tools.agentToAgent`（可选）

Agent 到 Agent 消息需要显式启用：

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"]
    }
  }
}
```

### `messages.queue`

控制当 agent 正在运行时入站消息的处理方式。

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
        webchat: "collect"
      }
    }
  }
}
```

### `messages.inbound`

对 **同一发件人** 的快速入站消息做去抖，这样连续消息会合并成一次 agent 轮次。
去抖按频道 + 会话维度生效，并使用最新消息做回复线程/ID。

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500
      }
    }
  }
}
```

说明：
- 去抖只合并 **纯文本** 消息；媒体/附件会立即刷新。
- 控制命令（如 `/queue`, `/new`）会绕过去抖，保持独立。

### `commands`（聊天命令处理）

控制聊天命令在连接器中的启用方式。

```json5
{
  commands: {
    native: "auto",         // register native commands when supported (auto)
    text: true,             // parse slash commands in chat messages
    bash: false,            // allow ! (alias: /bash) (host-only; requires tools.elevated allowlists)
    bashForegroundMs: 2000, // bash foreground window (0 backgrounds immediately)
    config: false,          // allow /config (writes to disk)
    debug: false,           // allow /debug (runtime-only overrides)
    restart: false,         // allow /restart + gateway restart tool
    useAccessGroups: true   // enforce access-group allowlists/policies for commands
  }
}
```

说明：
- 文本命令必须作为 **独立消息** 发送，并以 `/` 开头（无纯文本别名）。
- `commands.text: false` 禁用聊天消息的命令解析。
- `commands.native: "auto"`（默认）在 Discord/Telegram 启用原生命令，而 Slack 关闭；不支持的频道保持 text-only。
- 设 `commands.native: true|false` 可强制全部开启/关闭，或用 `channels.discord.commands.native`, `channels.telegram.commands.native`, `channels.slack.commands.native`（布尔或 `"auto"`）按频道覆盖。`false` 会在启动时清空 Discord/Telegram 的已注册命令；Slack 命令由 Slack 应用管理。
- `channels.telegram.customCommands` 添加额外的 Telegram bot 菜单项。名称会归一化；与原生命令冲突时会被忽略。
- `commands.bash: true` 启用 `! <cmd>` 运行宿主 shell 命令（`/bash <cmd>` 也是别名）。需要 `tools.elevated.enabled` 并在 `tools.elevated.allowFrom.<channel>` 中 allowlist 发件人。
- `commands.bashForegroundMs` 控制 bash 前台等待时间。在 bash 运行期间，新的 `! <cmd>` 请求会被拒绝（一次仅允许一个）。
- `commands.config: true` 启用 `/config`（读取/写入 `openclaw.json`）。
- `channels.<provider>.configWrites` 控制该频道发起的配置修改（默认 true）。这适用于 `/config set|unset` 以及频道特定的自动迁移（Telegram 超级群 ID 变更、Slack 频道 ID 变更）。
- `commands.debug: true` 启用 `/debug`（仅运行时覆盖）。
- `commands.restart: true` 启用 `/restart` 与 gateway 重启动作。
- `commands.useAccessGroups: false` 允许命令绕过 access-group allowlist/policy。
- 斜杠命令与指令只对 **授权发件人** 生效。授权来自
  频道 allowlist/配对 + `commands.useAccessGroups`。

### `web`（WhatsApp web 频道运行时）

WhatsApp 通过 gateway 的 web 频道（Baileys Web）运行。有已连接会话时会自动启动。
将 `web.enabled: false` 设为默认关闭。

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
      maxAttempts: 0
    }
  }
}
```

### `channels.telegram`（bot 传输）

OpenClaw 仅在存在 `channels.telegram` 配置段时启动 Telegram。bot token 从 `channels.telegram.botToken`（或 `channels.telegram.tokenFile`）读取，默认账号还可回退到 `TELEGRAM_BOT_TOKEN`。
设 `channels.telegram.enabled: false` 可禁用自动启动。
多账号支持在 `channels.telegram.accounts` 下（见上方多账号章节）。环境变量 token 仅适用于默认账号。
设 `channels.telegram.configWrites: false` 可阻止 Telegram 发起的配置写入（包括超级群 ID 迁移与 `/config set|unset`）。

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",                 // pairing | allowlist | open | disabled
      allowFrom: ["tg:123456789"],         // optional; "open" requires ["*"]
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic."
            }
          }
        }
      },
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" }
      ],
      historyLimit: 50,                     // include last N group messages as context (0 disables)
      replyToMode: "first",                 // off | first | all
      linkPreview: true,                   // toggle outbound link previews
      streamMode: "partial",               // off | partial | block (draft streaming; separate from block streaming)
      draftChunk: {                        // optional; only for streamMode=block
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph"       // paragraph | newline | sentence
      },
      actions: { reactions: true, sendMessage: true }, // tool action gates (false disables)
      reactionNotifications: "own",   // off | own | all
      mediaMaxMb: 5,
      retry: {                             // outbound retry policy
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1
      },
      network: {                           // transport overrides
        autoSelectFamily: false
      },
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook"
    }
  }
}
```

草稿流式说明：
- 使用 Telegram `sendMessageDraft`（草稿气泡，不是正式消息）。
- 需要 **私聊话题**（DM 中的 `message_thread_id`；bot 已启用话题）。
- `/reasoning stream` 会把推理流入草稿，然后发送最终答案。
重试策略默认值与行为详见 [重试策略](/zh/concepts/retry)。

### `channels.discord`（bot 传输）

配置 Discord bot 的 token 与可选 gating：
多账号支持在 `channels.discord.accounts` 下（见上方多账号章节）。环境变量 token 仅适用于默认账号。

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 8,                          // clamp inbound media size
      allowBots: false,                       // allow bot-authored messages
      actions: {                              // tool action gates (false disables)
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
        moderation: false
      },
      replyToMode: "off",                     // off | first | all
      dm: {
        enabled: true,                        // disable all DMs when false
        policy: "pairing",                    // pairing | allowlist | open | disabled
        allowFrom: ["1234567890", "steipete"], // optional DM allowlist ("open" requires ["*"])
        groupEnabled: false,                 // enable group DMs
        groupChannels: ["openclaw-dm"]          // optional group DM allowlist
      },
      guilds: {
        "123456789012345678": {               // guild id (preferred) or slug
          slug: "friends-of-openclaw",
          requireMention: false,              // per-guild default
          reactionNotifications: "own",       // off | own | all | allowlist
          users: ["987654321098765432"],      // optional per-guild user allowlist
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "Short answers only."
            }
          }
        }
      },
      historyLimit: 20,                       // include last N guild messages as context
      textChunkLimit: 2000,                   // optional outbound text chunk size (chars)
      chunkMode: "length",                    // optional chunking mode (length | newline)
      maxLinesPerMessage: 17,                 // soft max lines per message (Discord UI clipping)
      retry: {                                // outbound retry policy
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

OpenClaw 仅在存在 `channels.discord` 配置段时启动 Discord。token 从 `channels.discord.token` 读取，默认账号还可回退到 `DISCORD_BOT_TOKEN`（除非 `channels.discord.enabled` 为 `false`）。使用 `user:<id>`（DM）或 `channel:<id>`（guild 频道）指定 cron/CLI 目标；裸数字 ID 易混淆且会被拒绝。
Guild slug 为小写、空格替换为 `-`；频道 key 使用 slug 化的频道名（不含前导 `#`）。优先使用 guild id 作为键以避免重命名歧义。
默认忽略 bot 自发消息。若需启用，设 `channels.discord.allowBots`（自身消息仍会被过滤以防自回复循环）。
反应通知模式：
- `off`：不发反应事件。
- `own`：仅机器人自己的消息反应（默认）。
- `all`：所有消息的所有反应。
- `allowlist`：来自 `guilds.<id>.users` 的反应（空列表禁用）。
出站文本按 `channels.discord.textChunkLimit` 分块（默认 2000）。设 `channels.discord.chunkMode="newline"` 可先按空行（段落边界）分块再按长度分块。Discord 客户端可能截断很高的消息，因此 `channels.discord.maxLinesPerMessage`（默认 17）会拆分多行长回复，即使未超过 2000 字符。
重试策略默认值与行为详见 [重试策略](/zh/concepts/retry)。

### `channels.googlechat`（Chat API webhook）

Google Chat 通过 HTTP webhook + 应用级认证（服务账号）运行。
多账号支持在 `channels.googlechat.accounts` 下（见上方多账号章节）。环境变量仅适用于默认账号。

```json5
{
  channels: {
    "googlechat": {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url",             // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",        // optional; improves mention detection
      dm: {
        enabled: true,
        policy: "pairing",                // pairing | allowlist | open | disabled
        allowFrom: ["users/1234567890"]   // optional; "open" requires ["*"]
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true }
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20
    }
  }
}
```

说明：
- 服务账号 JSON 可以内联（`serviceAccount`）或文件方式（`serviceAccountFile`）。
- 默认账号的环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- `audienceType` + `audience` 必须匹配 Chat 应用的 webhook 认证配置。
- 设置投递目标时使用 `spaces/<spaceId>` 或 `users/<userId|email>`。

### `channels.slack`（socket mode）

Slack 通过 Socket Mode 运行，需要 bot token 与 app token：

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
        groupChannels: ["G123"]
      },
      channels: {
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Short answers only."
        }
      },
      historyLimit: 50,          // include last N channel/group messages as context (0 disables)
      allowBots: false,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["U123"],
      replyToMode: "off",           // off | first | all
      thread: {
        historyScope: "thread",     // thread | channel
        inheritParent: false
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true
      },
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true
      },
      textChunkLimit: 4000,
      chunkMode: "length",
      mediaMaxMb: 20
    }
  }
}
```

多账号支持在 `channels.slack.accounts` 下（见上方多账号章节）。环境变量 token 仅适用于默认账号。

OpenClaw 在 provider 启用且 token 配齐时启动 Slack（配置或 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。指定 cron/CLI 目标时使用 `user:<id>`（DM）或 `channel:<id>`。
设 `channels.slack.configWrites: false` 可阻止 Slack 发起的配置写入（包括频道 ID 迁移与 `/config set|unset`）。

默认忽略 bot 自发消息。可通过 `channels.slack.allowBots` 或 `channels.slack.channels.<id>.allowBots` 启用。

反应通知模式：
- `off`：不发反应事件。
- `own`：仅机器人自己的消息反应（默认）。
- `all`：所有消息的所有反应。
- `allowlist`：来自 `channels.slack.reactionAllowlist` 的反应（空列表禁用）。

线程会话隔离：
- `channels.slack.thread.historyScope` 控制线程历史是按线程（`thread`，默认）还是共享频道（`channel`）。
- `channels.slack.thread.inheritParent` 控制新线程会话是否继承父频道记录（默认：false）。

Slack action 组（控制 `slack` 工具动作）：
| Action group | Default | Notes |
| --- | --- | --- |
| reactions | enabled | React + list reactions |
| messages | enabled | Read/send/edit/delete |
| pins | enabled | Pin/unpin/list |
| memberInfo | enabled | Member info |
| emojiList | enabled | Custom emoji list |

### `channels.mattermost`（bot token）

Mattermost 以插件形式发布，不包含在核心安装里。
先安装：`openclaw plugins install @openclaw/mattermost`（或在 git checkout 中用 `./extensions/mattermost`）。

Mattermost 需要 bot token 与服务器 base URL：

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
      chunkMode: "length"
    }
  }
}
```

OpenClaw 在账号配置完成（bot token + base URL）且启用时启动 Mattermost。token + base URL 从 `channels.mattermost.botToken` + `channels.mattermost.baseUrl` 或 `MATTERMOST_BOT_TOKEN` + `MATTERMOST_URL` 读取（默认账号，除非 `channels.mattermost.enabled` 为 `false`）。

聊天模式：
- `oncall`（默认）：仅在 @ 提及时回复频道消息。
- `onmessage`：回复所有频道消息。
- `onchar`：消息以触发前缀开头时回复（`channels.mattermost.oncharPrefixes`，默认 `[">", "!"]`）。

访问控制：
- 默认私聊：`channels.mattermost.dmPolicy="pairing"`（未知发件人获取配对码）。
- 公开私聊：`channels.mattermost.dmPolicy="open"` + `channels.mattermost.allowFrom=["*"]`。
- 群组：默认 `channels.mattermost.groupPolicy="allowlist"`（提及门控）。使用 `channels.mattermost.groupAllowFrom` 限制发件人。

多账号支持在 `channels.mattermost.accounts` 下（见上方多账号章节）。环境变量仅适用于默认账号。
指定投递目标时使用 `channel:<id>` 或 `user:<id>`（或 `@username`）；裸 id 会被当作频道 id。

### `channels.signal`（signal-cli）

Signal 反应会发出系统事件（共享反应工具）：

```json5
{
  channels: {
    signal: {
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50 // include last N group messages as context (0 disables)
    }
  }
}
```

反应通知模式：
- `off`：不发反应事件。
- `own`：仅机器人自己的消息反应（默认）。
- `all`：所有消息的所有反应。
- `allowlist`：来自 `channels.signal.reactionAllowlist` 的反应（空列表禁用）。

### `channels.imessage`（imsg CLI）

OpenClaw 会启动 `imsg rpc`（基于 stdio 的 JSON-RPC）。无需 daemon 或端口。

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
      historyLimit: 50,    // include last N group messages as context (0 disables)
      includeAttachments: false,
      mediaMaxMb: 16,
      service: "auto",
      region: "US"
    }
  }
}
```

多账号支持在 `channels.imessage.accounts` 下（见上方多账号章节）。

说明：
- 需要对 Messages DB 的完全磁盘访问权限。
- 首次发送会提示 Messages 自动化权限。
- 优先使用 `chat_id:<id>` 作为目标。`imsg chats --limit 20` 可列出聊天。
- `channels.imessage.cliPath` 可指向包装脚本（例如通过 `ssh` 连接另一台 Mac 来运行 `imsg rpc`）；使用 SSH key 避免密码提示。
- 对远程 SSH 包装器，设置 `channels.imessage.remoteHost` 可在 `includeAttachments` 启用时通过 SCP 拉取附件。

包装脚本示例：
```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

### `agents.defaults.workspace`

设置 agent 进行文件操作的 **全局工作区目录**。

默认：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } }
}
```

若启用 `agents.defaults.sandbox`，非 main 会话可以在 `agents.defaults.sandbox.workspaceRoot` 下使用各自的 per-scope 工作区。

### `agents.defaults.repoRoot`

可选仓库根路径，用于系统提示中的 Runtime 行。如果未设置，OpenClaw 会从工作区（以及当前工作目录）向上查找 `.git` 目录。该路径必须存在才能使用。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } }
}
```

### `agents.defaults.skipBootstrap`

禁用自动创建工作区 bootstrap 文件（`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`）。

用于预置部署（工作区文件来自 repo）。

```json5
{
  agents: { defaults: { skipBootstrap: true } }
}
```

### `agents.defaults.bootstrapMaxChars`

每个工作区 bootstrap 文件在注入系统提示前允许的最大字符数。默认：`20000`。

超过该限制时，OpenClaw 会记录警告，并注入截断后的 head/tail 与标记。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } }
}
```

### `agents.defaults.userTimezone`

设置系统提示中的 **用户时区**（不影响消息封装中的时间戳）。未设置时，OpenClaw 使用运行时的主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } }
}
```

### `agents.defaults.timeFormat`

控制系统提示中 **时间格式** 的显示。默认：`auto`（OS 偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } } // auto | 12 | 24
}
```

### `messages`

控制入站/出站前缀与可选 ack 反应。
队列、会话与流式上下文参见 [Messages](/zh/concepts/messages)。

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions",
    removeAckAfterReply: false
  }
}
```

`responsePrefix` 会应用于 **所有出站回复**（工具摘要、块流式、最终回复）且跨频道一致，除非已存在前缀。

如果 `messages.responsePrefix` 未设置，默认不会加前缀。WhatsApp 自聊回复是例外：
若设置了 `identity.name`，默认 `[{identity.name}]`，否则 `[openclaw]`，
以保证同号对话清晰可读。
将其设为 `"auto"` 可为路由到的 agent 自动派生 `[{identity.name}]`（若已设置）。

#### 模板变量

`responsePrefix` 可包含动态解析的模板变量：

| 变量 | 说明 | 示例 |
|----------|-------------|---------|
| `{model}` | 短模型名 | `claude-opus-4-5`, `gpt-4o` |
| `{modelFull}` | 完整模型标识 | `anthropic/claude-opus-4-5` |
| `{provider}` | Provider 名 | `anthropic`, `openai` |
| `{thinkingLevel}` | 当前思考等级 | `high`, `low`, `off` |
| `{identity.name}` | Agent 身份名 | （同 "auto"） |

变量不区分大小写（`{MODEL}` = `{model}`）。`{think}` 是 `{thinkingLevel}` 的别名。
未解析的变量将作为字面文本保留。

```json5
{
  messages: {
    responsePrefix: "[{model} | think:{thinkingLevel}]"
  }
}
```

示例输出：`[claude-opus-4-5 | think:high] Here's my response...`

WhatsApp 入站前缀通过 `channels.whatsapp.messagePrefix` 配置（已弃用：`messages.messagePrefix`）。默认保持 **不变**：`"[openclaw]"` 当 `channels.whatsapp.allowFrom` 为空，否则 `""`（无前缀）。当使用 `"[openclaw]"` 时，如果路由到的 agent 设置了 `identity.name`，OpenClaw 会改用 `[{identity.name}]`。

`ackReaction` 会在支持反应的频道（Slack/Discord/Telegram/Google Chat）对入站消息发送最佳努力的表情反应。默认使用当前 agent 的 `identity.emoji`，否则为 `"👀"`。设为 `""` 可禁用。

`ackReactionScope` 控制反应触发时机：
- `group-mentions`（默认）：仅当群/房间需要提及 **且** 机器人被提及
- `group-all`：所有群/房间消息
- `direct`：仅私聊
- `all`：所有消息

`removeAckAfterReply` 会在回复发送后移除机器人的 ack 反应
（仅 Slack/Discord/Telegram/Google Chat）。默认：`false`。

#### `messages.tts`

为出站回复启用文本转语音。开启后，OpenClaw 使用 ElevenLabs 或 OpenAI 生成音频并附加到回复中。Telegram 发送 Opus 语音消息；其他频道发送 MP3 音频。

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all (include tool/block replies)
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true
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
          speed: 1.0
        }
      },
      openai: {
        apiKey: "openai_api_key",
        model: "gpt-4o-mini-tts",
        voice: "alloy"
      }
    }
  }
}
```

说明：
- `messages.tts.auto` 控制自动 TTS（`off`, `always`, `inbound`, `tagged`）。
- `/tts off|always|inbound|tagged` 设置会话级自动模式（覆盖配置）。
- `messages.tts.enabled` 已废弃；doctor 会迁移为 `messages.tts.auto`。
- `prefsPath` 存储本地覆盖项（provider/限额/摘要）。
- `maxTextLength` 是 TTS 输入硬上限；摘要会截断以适配。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
  - 接受 `provider/model` 或 `agents.defaults.models` 中的别名。
- `modelOverrides` 启用模型驱动覆盖，如 `[[tts:...]]` 标签（默认启用）。
- `/tts limit` 与 `/tts summary` 控制每用户摘要设置。
- `apiKey` 会回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 与 `OPENAI_API_KEY`。
- `elevenlabs.baseUrl` 覆盖 ElevenLabs API 基础 URL。
- `elevenlabs.voiceSettings` 支持 `stability`/`similarityBoost`/`style`（0..1）、
  `useSpeakerBoost` 与 `speed`（0.5..2.0）。

### `talk`

Talk 模式的默认值（macOS/iOS/Android）。未设置时，Voice ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
未设置时，`apiKey` 回退到 `ELEVENLABS_API_KEY`（或 gateway 的 shell profile）。
`voiceAliases` 让 Talk 指令使用友好名称（例如 `"voice":"Clawd"`）。

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    voiceAliases: {
      Clawd: "EXAVITQu4vr4xnSDxMaL",
      Roger: "CwhRBWXzGAHq8TQ4Fs17"
    },
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    interruptOnSpeech: true
  }
}
```

### `agents.defaults`

控制内置 agent 运行时（模型/思考/verbose/超时）。
`agents.defaults.models` 定义配置的模型目录（也作为 `/model` 的 allowlist）。
`agents.defaults.model.primary` 设置默认模型；`agents.defaults.model.fallbacks` 是全局 failover。
`agents.defaults.imageModel` 可选，**仅当主模型不支持图像输入** 时使用。
每个 `agents.defaults.models` 条目可包含：
- `alias`（可选模型快捷名，如 `/opus`）。
- `params`（可选的 provider 特定 API 参数，透传到模型请求）。

`params` 同样应用于流式运行（内置 agent + compaction）。目前支持 `temperature`, `maxTokens`。这些会与调用时选项合并，调用方优先。`temperature` 是高级参数—除非明确需要改变模型默认值，否则保持未设置。

示例：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5-20250929": {
          params: { temperature: 0.6 }
        },
        "openai/gpt-5.2": {
          params: { maxTokens: 8192 }
        }
      }
    }
  }
}
```

Z.AI GLM-4.x 模型会自动启用思考模式，除非：
- 设置 `--thinking off`，或
- 自行配置 `agents.defaults.models["zai/<model>"].params.thinking`。

OpenClaw 还提供一些内置别名快捷方式。只有当模型已存在于 `agents.defaults.models` 时才会应用默认值：

- `opus` -> `anthropic/claude-opus-4-5`
- `sonnet` -> `anthropic/claude-sonnet-4-5`
- `gpt` -> `openai/gpt-5.2`
- `gpt-mini` -> `openai/gpt-5-mini`
- `gemini` -> `google/gemini-3-pro-preview`
- `gemini-flash` -> `google/gemini-3-flash-preview`

如果你自行配置了同名别名（不区分大小写），你的值会生效（默认值不会覆盖）。

示例：Opus 4.5 主模型 + MiniMax M2.1 回退（托管 MiniMax）：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-5": { alias: "opus" },
        "minimax/MiniMax-M2.1": { alias: "minimax" }
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: ["minimax/MiniMax-M2.1"]
      }
    }
  }
}
```

MiniMax 认证：设置 `MINIMAX_API_KEY`（环境变量）或配置 `models.providers.minimax`。

#### `agents.defaults.cliBackends`（CLI 回退）

可选的 CLI 后端用于文本回退运行（不含工具调用）。当 API provider 失败时很有用。配置 `imageArg` 接受文件路径即可支持图像透传。

说明：
- CLI 后端 **文本优先**；始终禁用工具。
- 设置 `sessionArg` 时支持会话；session id 会按后端持久化。
- 对 `claude-cli` 已有默认值。如 PATH 很小（launchd/systemd），请覆盖命令路径。

示例：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude"
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
          imageMode: "repeat"
        }
      }
    }
  }
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
              clear_thinking: false
            }
          }
        }
      },
      model: {
        primary: "anthropic/claude-opus-4-5",
        fallbacks: [
          "openrouter/deepseek/deepseek-r1:free",
          "openrouter/meta-llama/llama-3.3-70b-instruct:free"
        ]
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: [
          "openrouter/google/gemini-2.0-flash-vision:free"
        ]
      },
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      heartbeat: {
        every: "30m",
        target: "last"
      },
      maxConcurrent: 3,
      subagents: {
        model: "minimax/MiniMax-M2.1",
        maxConcurrent: 1,
        archiveAfterMinutes: 60
      },
      exec: {
        backgroundMs: 10000,
        timeoutSec: 1800,
        cleanupMs: 1800000
      },
      contextTokens: 200000
    }
  }
}
```

#### `agents.defaults.contextPruning`（工具结果裁剪）

`agents.defaults.contextPruning` 会在向 LLM 发送请求之前，从内存上下文中裁剪 **旧的工具结果**。
它 **不会** 修改磁盘上的会话历史（`*.jsonl` 仍完整保留）。

该功能用于减少在高频工具输出场景中的 token 使用。

高层规则：
- 从不触碰用户/助手消息。
- 保护最近 `keepLastAssistants` 条助手消息（该位置之后的工具结果不裁剪）。
- 保护 bootstrap 前缀（第一条用户消息之前的内容不裁剪）。
- 模式：
  - `adaptive`：当估算上下文比例超过 `softTrimRatio` 时，对超长工具结果进行软裁剪（保留头尾）。
    然后当估算上下文比例超过 `hardClearRatio` **且** 有足够可裁剪量（`minPrunableToolChars`）时，硬清除最老的可裁剪工具结果。
  - `aggressive`：总是将截止点之前的可裁剪工具结果替换为 `hardClear.placeholder`（不做比例判断）。

软裁剪 vs 硬清除（上下文发送给 LLM 时的变化）：
- **软裁剪**：仅针对 *超大* 工具结果。保留开头 + 结尾，并在中间插入 `...`。
  - Before: `toolResult("…very long output…")`
  - After: `toolResult("HEAD…\n...\n…TAIL\n\n[Tool result trimmed: …]")`
- **硬清除**：将完整工具结果替换为占位符。
  - Before: `toolResult("…very long output…")`
  - After: `toolResult("[Old tool result content cleared]")`

说明 / 当前限制：
- 包含 **图片块** 的工具结果当前会被跳过（永不裁剪/清除）。
- 估算的“上下文比例”基于 **字符数**（近似），不是精确 token。
- 如果会话还没有 `keepLastAssistants` 条助手消息，会跳过裁剪。
- 在 `aggressive` 模式中，`hardClear.enabled` 被忽略（符合条件的工具结果总是被替换）。

默认（adaptive）：
```json5
{
  agents: { defaults: { contextPruning: { mode: "adaptive" } } }
}
```

禁用：
```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } }
}
```

默认值（当 `mode` 为 `"adaptive"` 或 `"aggressive"`）：
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`（仅 adaptive）
- `hardClearRatio`: `0.5`（仅 adaptive）
- `minPrunableToolChars`: `50000`（仅 adaptive）
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`（仅 adaptive）
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

示例（aggressive，最小配置）：
```json5
{
  agents: { defaults: { contextPruning: { mode: "aggressive" } } }
}
```

示例（adaptive 调优）：
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
        // 可选：仅对特定工具裁剪（deny 优先；支持 "*" 通配）
        tools: { deny: ["browser", "canvas"] },
      }
    }
  }
}
```

详见 [/zh/concepts/session-pruning](/zh/concepts/session-pruning) 了解行为细节。

#### `agents.defaults.compaction`（预留 headroom + 记忆刷新）

`agents.defaults.compaction.mode` 选择 compaction 的总结策略。默认 `default`；设为 `safeguard` 可为超长历史启用分块总结。详见 [/zh/concepts/compaction](/zh/concepts/compaction)。

`agents.defaults.compaction.reserveTokensFloor` 为 Pi compaction 强制最低 `reserveTokens`（默认 `20000`）。设为 `0` 可禁用该下限。

`agents.defaults.compaction.memoryFlush` 会在自动 compaction 前运行 **静默** 的 agent 轮次，指示模型将持久记忆写入磁盘（例如 `memory/YYYY-MM-DD.md`）。当会话 token 估算跨过 compaction 限制下方的软阈值时触发。

旧版默认值：
- `memoryFlush.enabled`: `true`
- `memoryFlush.softThresholdTokens`: `4000`
- `memoryFlush.prompt` / `memoryFlush.systemPrompt`: 内置默认值，带 `NO_REPLY`
- 说明：当会话工作区为只读时跳过 memory flush
  (`agents.defaults.sandbox.workspaceAccess: "ro"` 或 `"none"`)。

示例（调优）：
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
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

块流式：
- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"`（默认 off）。
- 频道覆盖：`*.blockStreaming`（以及每账号变体）强制开/关块流式。
  非 Telegram 频道需要显式设置 `*.blockStreaming: true` 才启用块回复。
- `agents.defaults.blockStreamingBreak`: `"text_end"` 或 `"message_end"`（默认: text_end）。
- `agents.defaults.blockStreamingChunk`: 软分块配置。默认
  800–1200 字符，优先段落（`\n\n`），其次换行，再次句子。
  示例：
  ```json5
  {
    agents: { defaults: { blockStreamingChunk: { minChars: 800, maxChars: 1200 } } }
  }
  ```
- `agents.defaults.blockStreamingCoalesce`: 在发送前合并流式块。
  默认 `{ idleMs: 1000 }`，并继承 `blockStreamingChunk` 的 `minChars`
  且 `maxChars` 被限制为频道文本上限。Signal/Slack/Discord/Google Chat 默认
  `minChars: 1500`，除非覆盖。
  频道覆盖：`channels.whatsapp.blockStreamingCoalesce`, `channels.telegram.blockStreamingCoalesce`,
  `channels.discord.blockStreamingCoalesce`, `channels.slack.blockStreamingCoalesce`, `channels.mattermost.blockStreamingCoalesce`,
  `channels.signal.blockStreamingCoalesce`, `channels.imessage.blockStreamingCoalesce`, `channels.msteams.blockStreamingCoalesce`,
  `channels.googlechat.blockStreamingCoalesce`
  （以及每账号变体）。
- `agents.defaults.humanDelay`: 在第一段之后 **块回复** 之间加入随机延迟。
  模式：`off`（默认）、`natural`（800–2500ms）、`custom`（使用 `minMs`/`maxMs`）。
  每 agent 覆盖：`agents.list[].humanDelay`。
  示例：
  ```json5
  {
    agents: { defaults: { humanDelay: { mode: "natural" } } }
  }
  ```
详见 [/zh/concepts/streaming](/zh/concepts/streaming) 了解行为与分块细节。

输入指示器：
- `agents.defaults.typingMode`: `"never" | "instant" | "thinking" | "message"`。默认
  在私聊/提及时为 `instant`，在未提及的群聊为 `message`。
- `session.typingMode`: 每会话覆盖。
- `agents.defaults.typingIntervalSeconds`: 输入信号刷新间隔（默认 6s）。
- `session.typingIntervalSeconds`: 每会话刷新间隔覆盖。
详见 [/zh/concepts/typing-indicators](/zh/concepts/typing-indicators) 了解行为细节。

`agents.defaults.model.primary` 应设置为 `provider/model`（例如 `anthropic/claude-opus-4-5`）。
别名来自 `agents.defaults.models.*.alias`（例如 `Opus`）。
若省略 provider，OpenClaw 当前会临时假定为 `anthropic`。
Z.AI 模型可用 `zai/<model>`（例如 `zai/glm-4.7`），需要环境变量 `ZAI_API_KEY`（或旧版 `Z_AI_API_KEY`）。

`agents.defaults.heartbeat` 配置周期性 heartbeat 运行：
- `every`: 时长字符串（`ms`, `s`, `m`, `h`）；默认单位分钟。默认：
  `30m`。设为 `0m` 可禁用。
- `model`: 可选覆盖 heartbeat 使用的模型（`provider/model`）。
- `includeReasoning`: 为 `true` 时，heartbeat 也会在可用时发送单独的 `Reasoning:` 消息（与 `/reasoning on` 同形）。默认：`false`。
- `session`: 可选会话 key，用于控制 heartbeat 运行在哪个会话中。默认：`main`。
- `to`: 可选收件人覆盖（频道特定 id，如 WhatsApp E.164、Telegram chat id）。
- `target`: 可选投递频道（`last`, `whatsapp`, `telegram`, `discord`, `slack`, `msteams`, `signal`, `imessage`, `none`）。默认：`last`。
- `prompt`: 可选覆盖 heartbeat 内容（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。覆盖会被原样发送；若仍希望读取文件，请包含 `Read HEARTBEAT.md`。
- `ackMaxChars`: `HEARTBEAT_OK` 之后允许的最大字符数（默认 300）。

每 agent heartbeat：
- 设置 `agents.list[].heartbeat` 可为特定 agent 启用/覆盖 heartbeat 设置。
- 若任一 agent 条目定义了 `heartbeat`，**仅这些 agent** 运行 heartbeat；默认值成为这些 agent 的共享基线。

Heartbeat 会运行完整的 agent 轮次。更短的间隔会消耗更多 token；注意控制 `every`，让 `HEARTBEAT.md` 保持精简，或选择更便宜的模型。

`tools.exec` 配置后台 exec 默认值：
- `backgroundMs`: 自动后台化前的等待时间（ms，默认 10000）
- `timeoutSec`: 超时自动终止（秒，默认 1800）
- `cleanupMs`: 结束会话在内存中保留时间（ms，默认 1800000）
- `notifyOnExit`: 后台 exec 退出时入队系统事件 + 触发 heartbeat（默认 true）
- `applyPatch.enabled`: 启用实验性 `apply_patch`（仅 OpenAI/OpenAI Codex；默认 false）
- `applyPatch.allowModels`: 可选模型 allowlist（如 `gpt-5.2` 或 `openai/gpt-5.2`）
注：`applyPatch` 仅在 `tools.exec` 下。

`tools.web` 配置 web 搜索 + 抓取工具：
- `tools.web.search.enabled`（当 key 存在时默认 true）
- `tools.web.search.apiKey`（推荐：`openclaw configure --section web` 配置，或用 `BRAVE_API_KEY` 环境变量）
- `tools.web.search.maxResults`（1–10，默认 5）
- `tools.web.search.timeoutSeconds`（默认 30）
- `tools.web.search.cacheTtlMinutes`（默认 15）
- `tools.web.fetch.enabled`（默认 true）
- `tools.web.fetch.maxChars`（默认 50000）
- `tools.web.fetch.timeoutSeconds`（默认 30）
- `tools.web.fetch.cacheTtlMinutes`（默认 15）
- `tools.web.fetch.userAgent`（可选覆盖）
- `tools.web.fetch.readability`（默认 true；禁用则仅做基础 HTML 清理）
- `tools.web.fetch.firecrawl.enabled`（当 API key 已设置时默认 true）
- `tools.web.fetch.firecrawl.apiKey`（可选；默认 `FIRECRAWL_API_KEY`）
- `tools.web.fetch.firecrawl.baseUrl`（默认 https://api.firecrawl.dev）
- `tools.web.fetch.firecrawl.onlyMainContent`（默认 true）
- `tools.web.fetch.firecrawl.maxAgeMs`（可选）
- `tools.web.fetch.firecrawl.timeoutSeconds`（可选）

`tools.media` 配置入站媒体理解（图像/音频/视频）：
- `tools.media.models`: 共享模型列表（带能力标签；用于 per-cap 列表之后）。
- `tools.media.concurrency`: 最大并发能力运行数（默认 2）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - `enabled`: 开关（当模型已配置时默认 true）。
  - `prompt`: 可选提示词覆盖（图像/视频会自动附加 `maxChars` 提示）。
  - `maxChars`: 最大输出字符数（图像/视频默认 500；音频未设置）。
  - `maxBytes`: 发送媒体的最大大小（默认：图像 10MB、音频 20MB、视频 50MB）。
  - `timeoutSeconds`: 请求超时（默认：图像 60s、音频 60s、视频 120s）。
  - `language`: 可选音频提示。
  - `attachments`: 附件策略（`mode`, `maxAttachments`, `prefer`）。
  - `scope`: 可选 gating（先匹配者生效），支持 `match.channel`, `match.chatType`, `match.keyPrefix`。
  - `models`: 有序模型条目；失败或媒体过大时回退到下一条。
- 每个 `models[]` 条目：
  - Provider 条目（`type: "provider"` 或省略）：
    - `provider`: API provider id（`openai`, `anthropic`, `google`/`gemini`, `groq` 等）。
    - `model`: 模型 id 覆盖（图像必需；音频 provider 默认 `gpt-4o-mini-transcribe`/`whisper-large-v3-turbo`，视频默认 `gemini-3-flash-preview`）。
    - `profile` / `preferredProfile`: 认证 profile 选择。
  - CLI 条目（`type: "cli"`）：
    - `command`: 要运行的可执行文件。
    - `args`: 模板化参数（支持 `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}` 等）。
  - `capabilities`: 可选列表（`image`, `audio`, `video`），用于门控共享条目。省略时默认：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
  - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language` 可在条目内覆盖。

若未配置模型（或 `enabled: false`），理解会被跳过；模型仍会收到原始附件。

Provider 认证遵循标准模型认证顺序（auth profiles、`OPENAI_API_KEY`/`GROQ_API_KEY`/`GEMINI_API_KEY` 等环境变量，或 `models.providers.*.apiKey`）。

示例：
```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }]
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] }
        ]
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }]
      }
    }
  }
}
```

`agents.defaults.subagents` 配置子 agent 默认值：
- `model`: 子 agent 默认模型（字符串或 `{ primary, fallbacks }`）。若省略，子 agent 继承调用者模型，除非 per-agent 或 per-call 覆盖。
- `maxConcurrent`: 子 agent 最大并发（默认 1）
- `archiveAfterMinutes`: 子 agent 会话自动归档分钟数（默认 60；设 `0` 禁用）
- 子 agent 工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`（deny 优先）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置 **基础工具 allowlist**：
- `minimal`: 仅 `session_status`
- `coding`: `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging`: `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full`: 无限制（同未设置）

每 agent 覆盖：`agents.list[].tools.profile`。

示例（默认 messaging-only，但允许 Slack + Discord 工具）：
```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"]
  }
}
```

示例（coding profile，但全局禁用 exec/process）：
```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"]
  }
}
```

`tools.byProvider` 让你 **进一步限制** 特定 provider（或单个 `provider/model`）的工具。
每 agent 覆盖：`agents.list[].tools.byProvider`。

顺序：基础 profile → provider profile → allow/deny 策略。
Provider key 接受 `provider`（如 `google-antigravity`）或 `provider/model`
（如 `openai/gpt-5.2`）。

示例（保持全局 coding profile，但 Google Antigravity 使用 minimal）：
```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

示例（provider/model 专用 allowlist）：
```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] }
    }
  }
}
```

`tools.allow` / `tools.deny` 配置全局工具 allow/deny 策略（deny 优先）。
匹配不区分大小写，并支持 `*` 通配（`"*"` 表示所有工具）。
即使 Docker 沙盒 **关闭**，也会应用该策略。

示例（全局禁用 browser/canvas）：
```json5
{
  tools: { deny: ["browser", "canvas"] }
}
```

工具组（简写）在 **全局** 与 **每 agent** 工具策略中均可使用：
- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有内置 OpenClaw 工具（不含 provider 插件）

`tools.elevated` 控制提升的（宿主）exec 访问：
- `enabled`: 允许提升模式（默认 true）
- `allowFrom`: 各频道 allowlist（空 = 禁用）
  - `whatsapp`: E.164 号码
  - `telegram`: chat id 或用户名
  - `discord`: user id 或用户名（若省略则回退到 `channels.discord.dm.allowFrom`）
  - `signal`: E.164 号码
  - `imessage`: 句柄/chat id
  - `webchat`: 会话 id 或用户名

示例：
```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["steipete", "1234567890123"]
      }
    }
  }
}
```

每 agent 覆盖（进一步限制）：
```json5
{
  agents: {
    list: [
      {
        id: "family",
        tools: {
          elevated: { enabled: false }
        }
      }
    ]
  }
}
```

说明：
- `tools.elevated` 是全局基线。`agents.list[].tools.elevated` 只能进一步收紧（两者必须都允许）。
- `/elevated on|off|ask|full` 为每会话存储状态；内联指令仅对单条消息生效。
- 提升模式的 `exec` 在宿主机上运行，绕过沙盒。
- 工具策略仍适用；若 `exec` 被拒绝，则无法使用提升模式。

`agents.defaults.maxConcurrent` 设置内置 agent 在跨会话并行执行的最大数量。每个会话仍是串行执行（每个 session key 同时仅一个运行）。默认：1。

### `agents.defaults.sandbox`

可选 **Docker 沙盒** 用于内置 agent。用于非 main 会话以限制访问宿主系统。

详见：[沙盒](/zh/gateway/sandboxing)

默认值（启用时）：
- scope：`"agent"`（每 agent 一个容器 + 工作区）
- Debian bookworm-slim 镜像
- agent 工作区访问：`workspaceAccess: "none"`（默认）
  - `"none"`：在 `~/.openclaw/sandboxes` 下使用每 scope 沙盒工作区
- `"ro"`：沙盒工作区在 `/workspace`，agent 工作区只读挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"`：agent 工作区读写挂载到 `/workspace`
- 自动清理：空闲 > 24h 或年龄 > 7d
- 工具策略：仅允许 `exec`, `process`, `read`, `write`, `edit`, `apply_patch`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`（deny 优先）
  - 通过 `tools.sandbox.tools` 配置；每 agent 覆盖通过 `agents.list[].tools.sandbox.tools`
  - 沙盒策略支持工具组简写：`group:runtime`, `group:fs`, `group:sessions`, `group:memory`（详见 [Sandbox vs Tool Policy vs Elevated](/zh/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands)）
- 可选沙盒浏览器（Chromium + CDP, noVNC 观察）
- 加固选项：`network`, `user`, `pidsLimit`, `memory`, `cpus`, `ulimits`, `seccompProfile`, `apparmorProfile`

警告：`scope: "shared"` 表示共享容器与共享工作区。没有跨会话隔离。需要隔离时使用 `scope: "session"`。

旧版：仍支持 `perSession`（`true` → `scope: "session"`, `false` → `scope: "shared"`）。

`setupCommand` 在容器创建后 **仅运行一次**（容器内 `sh -lc`）。
若需安装包，请确保网络可出站、根文件系统可写、且用户为 root。

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
            nproc: 256
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/var/run/docker.sock:/var/run/docker.sock", "/home/user/source:/source:rw"]
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
          autoStartTimeoutMs: 12000
        },
        prune: {
          idleHours: 24,  // 0 disables idle pruning
          maxAgeDays: 7   // 0 disables max-age pruning
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

构建默认沙盒镜像：
```bash
scripts/sandbox-setup.sh
```

注意：沙盒容器默认 `network: "none"`；若需要出站访问，请设置 `agents.defaults.sandbox.docker.network`
为 `"bridge"`（或自定义网络）。

注意：入站附件会暂存到活动工作区 `media/inbound/*`。`workspaceAccess: "rw"` 时，这些文件会写入 agent 工作区。

注意：`docker.binds` 会挂载额外宿主目录；全局与每 agent 的 binds 会合并。

构建可选浏览器镜像：
```bash
scripts/sandbox-browser-setup.sh
```

当 `agents.defaults.sandbox.browser.enabled=true` 时，browser 工具使用沙盒内的 Chromium 实例（CDP）。如果开启 noVNC（headless=false 时默认开启），noVNC URL 会注入到系统提示中以供 agent 引用。
这不需要在主配置中开启 `browser.enabled`；沙盒控制 URL 会按会话注入。

`agents.defaults.sandbox.browser.allowHostControl`（默认：false）允许沙盒会话通过 browser 工具显式连接 **宿主** 浏览器控制服务（`target: "host"`）。如果想要严格隔离，请保持关闭。

远程控制 allowlist：
- `allowedControlUrls`：允许的精确控制 URL（`target: "custom"`）
- `allowedControlHosts`：允许的主机名（仅主机名，不含端口）
- `allowedControlPorts`：允许的端口（默认：http=80, https=443）
默认：所有 allowlist 未设置（无任何限制）。`allowHostControl` 默认 false。

### `models`（自定义 provider + base URLs）

OpenClaw 使用 **pi-coding-agent** 模型目录。你可以通过写入
`~/.openclaw/agents/<agentId>/agent/models.json` 或在 OpenClaw 配置中 `models.providers`
定义相同 schema 来添加自定义 provider（LiteLLM、本地 OpenAI 兼容服务器、Anthropic 代理等）。
各 provider 概览与示例：[/zh/concepts/model-providers](/zh/concepts/model-providers)。

当存在 `models.providers` 时，OpenClaw 会在启动时写入/合并 `models.json` 到
`~/.openclaw/agents/<agentId>/agent/`：
- 默认行为：**merge**（保留已有 provider，按名称覆盖）
- 设 `models.mode: "replace"` 可覆盖文件内容

通过 `agents.defaults.model.primary`（provider/model）选择模型。

```json5
{
  agents: {
    defaults: {
      model: { primary: "custom-proxy/llama-3.1-8b" },
      models: {
        "custom-proxy/llama-3.1-8b": {}
      }
    }
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
            maxTokens: 32000
          }
        ]
      }
    }
  }
}
```

### OpenCode Zen（多模型代理）

OpenCode Zen 是一个多模型网关，提供按模型分的端点。OpenClaw 使用
pi-ai 内置的 `opencode` provider；设置 `OPENCODE_API_KEY`（或
`OPENCODE_ZEN_API_KEY`）来自 https://opencode.ai/auth。

说明：
- 模型引用使用 `opencode/<modelId>`（示例：`opencode/claude-opus-4-5`）。
- 如果通过 `agents.defaults.models` 开启 allowlist，请加入你计划使用的模型。
- 快捷方式：`openclaw onboard --auth-choice opencode-zen`。

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-5" },
      models: { "opencode/claude-opus-4-5": { alias: "Opus" } }
    }
  }
}
```

### Z.AI（GLM-4.7）— provider alias 支持

Z.AI 模型通过内置 `zai` provider 提供。设置 `ZAI_API_KEY`
并使用 provider/model 引用模型。

快捷方式：`openclaw onboard --auth-choice zai-api-key`。

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} }
    }
  }
}
```

说明：
- `z.ai/*` 与 `z-ai/*` 是兼容别名，会归一化为 `zai/*`。
- 若缺少 `ZAI_API_KEY`，对 `zai/*` 的请求会在运行时报认证错误。
- 错误示例：`No API key found for provider "zai".`
- Z.AI 的通用 API 端点是 `https://api.z.ai/api/paas/v4`。GLM 编码请求
  使用专用 Coding 端点 `https://api.z.ai/api/coding/paas/v4`。
  内置 `zai` provider 使用 Coding 端点。如需通用端点，请在 `models.providers`
  中定义自定义 provider 并覆盖 base URL（见上方自定义 provider 章节）。
- 文档/配置中请使用占位符，不要提交真实 API key。

### Moonshot AI（Kimi）

使用 Moonshot 的 OpenAI 兼容端点：

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: { "moonshot/kimi-k2.5": { alias: "Kimi K2.5" } }
    }
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
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

说明：
- 设置 `MOONSHOT_API_KEY` 环境变量或使用 `openclaw onboard --auth-choice moonshot-api-key`。
- 模型引用：`moonshot/kimi-k2.5`。
- 如果需要中国区端点，请使用 `https://api.moonshot.cn/v1`。

### Kimi Code

使用 Kimi Code 的专用 OpenAI 兼容端点（与 Moonshot 分离）：

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-code/kimi-for-coding" },
      models: { "kimi-code/kimi-for-coding": { alias: "Kimi Code" } }
    }
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-for-coding",
            name: "Kimi For Coding",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32768,
            headers: { "User-Agent": "KimiCLI/0.77" },
            compat: { supportsDeveloperRole: false }
          }
        ]
      }
    }
  }
}
```

说明：
- 设置 `KIMICODE_API_KEY` 环境变量或使用 `openclaw onboard --auth-choice kimi-code-api-key`。
- 模型引用：`kimi-code/kimi-for-coding`。

### Synthetic（Anthropic 兼容）

使用 Synthetic 的 Anthropic 兼容端点：

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.1" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.1": { alias: "MiniMax M2.1" } }
    }
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
            maxTokens: 65536
          }
        ]
      }
    }
  }
}
```

说明：
- 设置 `SYNTHETIC_API_KEY` 或使用 `openclaw onboard --auth-choice synthetic-api-key`。
- 模型引用：`synthetic/hf:MiniMaxAI/MiniMax-M2.1`。
- base URL 应省略 `/v1`，因为 Anthropic 客户端会追加它。

### 本地模型（LM Studio）— 推荐设置

详见 [/zh/gateway/local-models](/zh/gateway/local-models) 了解当前本地指南。TL;DR：在高性能硬件上用 LM Studio Responses API 运行 MiniMax M2.1；保留托管模型用于回退。

### MiniMax M2.1

不使用 LM Studio 直接配置 MiniMax M2.1：

```json5
{
  agent: {
    model: { primary: "minimax/MiniMax-M2.1" },
    models: {
      "anthropic/claude-opus-4-5": { alias: "Opus" },
      "minimax/MiniMax-M2.1": { alias: "Minimax" }
    }
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
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

说明：
- 设置 `MINIMAX_API_KEY` 环境变量或使用 `openclaw onboard --auth-choice minimax-api`。
- 可用模型：`MiniMax-M2.1`（默认）。
- 若需精确成本跟踪，请在 `models.json` 更新定价。

### Cerebras（GLM 4.6 / 4.7）

使用 Cerebras 的 OpenAI 兼容端点：

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: {
        primary: "cerebras/zai-glm-4.7",
        fallbacks: ["cerebras/zai-glm-4.6"]
      },
      models: {
        "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
        "cerebras/zai-glm-4.6": { alias: "GLM 4.6 (Cerebras)" }
      }
    }
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
          { id: "zai-glm-4.6", name: "GLM 4.6 (Cerebras)" }
        ]
      }
    }
  }
}
```

说明：
