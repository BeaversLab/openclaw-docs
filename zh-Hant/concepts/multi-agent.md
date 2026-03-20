---
summary: "Multi-agent routing: isolated agents, channel accounts, and bindings"
title: Multi-Agent Routing
read_when: "You want multiple isolated agents (workspaces + auth) in one gateway process."
status: active
---

# Multi-Agent Routing

目標：在一個運行中的 Gateway 中擁有多個*隔離*的代理（獨立的工作區 + `agentDir` + 會話），以及多個通道帳戶（例如兩個 WhatsApp）。訊息透過綁定路由至代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具有完整作用域的「大腦」，擁有自己獨立的：

- **工作區** (Workspace)（檔案、AGENTS.md/SOUL.md/USER.md、本機筆記、角色規則）。
- **狀態目錄** (`agentDir`)，用於儲存設定檔、模型註冊表以及每個代理的配置。
- **會話存儲** (Session store)（聊天記錄 + 路由狀態）位於 `~/.openclaw/agents/<agentId>/sessions` 之下。

設定檔是 **每個代理獨立** 的。每個代理從其自身的位置讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主要代理的憑證**不會**自動共享。切勿跨代理重複使用 `agentDir`
（這會導致認證/會話衝突）。如果您想共享憑證，
請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

技能透過每個工作區的 `skills/` 資料夾實現每個代理獨立，並可從 `~/.openclaw/skills` 獲取共享技能。
請參閱 [Skills: per-agent vs shared](/zh-Hant/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以並行託管 **一個代理**（預設）或 **多個代理**。

**工作區備註：** 每個代理的工作區是 **預設 cwd**（目前工作目錄），而非嚴格的
沙盒。相對路徑在工作區內解析，但除非啟用了沙盒機制，否則絕對路徑可以
存取主機上的其他位置。請參閱
[Sandboxing](/zh-Hant/gateway/sandboxing)。

## 路徑 (快速地圖)

- 設定： `~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 狀態目錄： `~/.openclaw` (或 `OPENCLAW_STATE_DIR`)
- 工作區： `~/.openclaw/workspace` (或 `~/.openclaw/workspace-<agentId>`)
- 代理目錄： `~/.openclaw/agents/<agentId>/agent` (或 `agents.list[].agentDir`)
- 會話： `~/.openclaw/agents/<agentId>/sessions`

### 單代理模式 (預設)

如果您不做任何設定，OpenClaw 將運行單一代理：

- `agentId` 預設為 **`main`**。
- Session 的鍵值為 `agent:main:<mainKey>`。
- Workspace 預設為 `~/.openclaw/workspace`（當設定了 `OPENCLAW_PROFILE` 時則為 `~/.openclaw/workspace-<profile>`）。
- State 預設為 `~/.openclaw/agents/main/agent`。

## Agent helper

使用 agent wizard 來新增一個新的 isolated agent：

```bash
openclaw agents add work
```

然後新增 `bindings`（或讓 wizard 自動處理）以路由 inbound messages。

驗證方式：

```bash
openclaw agents list --bindings
```

## Quick start

<Steps>
  <Step title="建立每個 agent workspace">

使用 wizard 或手動建立 workspaces：

```bash
openclaw agents add coding
openclaw agents add social
```

每個 agent 都會獲得自己的 workspace，包含 `SOUL.md`、`AGENTS.md` 和選用的 `USER.md`，以及位於 `~/.openclaw/agents/<agentId>` 下的專屬 `agentDir` 與 session store。

  </Step>

  <Step title="建立 channel accounts">

在您偏好的 channels 上為每個 agent 建立一個帳號：

- Discord：每個 agent 一個 bot，啟用 Message Content Intent，並複製每個 token。
- Telegram：透過 BotFather 為每個 agent 建立一個 bot，並複製每個 token。
- WhatsApp：將每個電話號碼連結至對應的帳號。

```bash
openclaw channels login --channel whatsapp --account work
```

請參閱 channel 指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>

  <Step title="新增 agents、accounts 與 bindings">

在 `agents.list` 下新增 agents，在 `channels.<channel>.accounts` 下新增 channel accounts，並使用 `bindings` 將它們連接起來（範例見下文）。

  </Step>

  <Step title="重新啟動並驗證">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Multiple agents = multiple people, multiple personalities

在 **multiple agents** 模式下，每個 `agentId` 都會成為一個 **完全獨立的 persona**：

- **不同的電話號碼/帳號**（每個 channel `accountId` 一組）。
- **不同的性格**（每個 agent 的 workspace 檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **獨立的驗證 + 工作階段**（除非明確啟用，否則不會發生交談）。

這讓**多人**可以共用一個 Gateway 伺服器，同時保持他們的 AI「大腦」和資料隔離。

## 一個 WhatsApp 號碼，多個人（私訊分派）

您可以在維持**一個 WhatsApp 帳號**的同時，將**不同的 WhatsApp 私訊**路由傳送到不同的代理程式。使用 `peer.kind: "direct"` 根據發送者 E.164（例如 `+15551234567`）進行配對。回覆仍來自同一個 WhatsApp 號碼（沒有每個代理程式的發送者身分）。

重要細節：私訊會折疊到代理程式的**主要工作階段金鑰**，因此若要實現真正的隔離，必須是**每人一個代理程式**。

範例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

備註：

- 私訊存取控制是**每個 WhatsApp 帳號全域**的（配對/允許清單），而非每個代理程式。
- 對於共用群組，請將群組綁定到一個代理程式，或使用 [廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理程式）

綁定是**確定性**的，且**最明確者優先**：

1. `peer` 配對（精確的私訊/群組/頻道 ID）
2. `parentPeer` 配對（執行緒繼承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId` （Discord）
5. `teamId` （Slack）
6. 頻道的 `accountId` 配對
7. 頻道層級配對 (`accountId: "*"`)
8. 回退到預設代理程式 (`agents.list[].default`，否則為列表中的第一個項目，預設值：`main`)

如果多個綁定在同一層級中配對成功，則設定順序中的第一個優先。
如果一個綁定設定了多個配對欄位（例如 `peer` + `guildId`），則所有指定的欄位都是必需的（`AND` 語義）。

重要的帳號範圍細節：

- 省略 `accountId` 的綁定僅配對預設帳號。
- 使用 `accountId: "*"` 針對所有帳號進行頻道範圍的回退。
- 如果您後續為同一個代理程式新增具有明確帳號 ID 的相同綁定，OpenClaw 會將現有的僅頻道綁定升級為帳號範圍，而不是重複建立它。

## 多個帳號 / 電話號碼

支援**多個帳戶**（例如 WhatsApp）的頻道使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理，因此一台伺服器可以託管多個電話號碼而不會混合會話。

如果您希望當省略 `accountId` 時有一個頻道範圍的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。當未設定時，OpenClaw 會回退到 `default`（如果存在），否則回退到第一個設定的帳戶 ID（排序後）。

支援此模式的常見頻道包括：

- `whatsapp`，`telegram`，`discord`，`slack`，`signal`，`imessage`
- `irc`，`line`，`googlechat`，`mattermost`，`matrix`，`nextcloud-talk`
- `bluebubbles`，`zalo`，`zalouser`，`nostr`，`feishu`

## 概念

- `agentId`：一個「大腦」（工作區、個別代理驗證、個別代理會話儲存）。
- `accountId`：一個頻道帳戶實例（例如 WhatsApp 帳戶 `"personal"` vs `"biz"`）。
- `binding`：透過 `(channel, accountId, peer)` 和選用的公會/團隊 ID 將傳入訊息路由到 `agentId`。
- 直接聊天會折疊為 `agent:<agentId>:<mainKey>`（每個代理的「主要」；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳戶都對應到唯一的 `accountId`。將每個帳戶綁定到一個代理，並為每個機�器人維護允許清單。

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
  ],
  channels: {
    discord: {
      groupPolicy: "allowlist",
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: {
            "123456789012345678": {
              channels: {
                "333333333333333333": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

備註：

- 邀請每個機器人加入公會並啟用訊息內容意圖。
- Token 存活於 `channels.discord.accounts.<id>.token` 中（預設帳戶可以使用 `DISCORD_BOT_TOKEN`）。

### 每個代理的 Telegram 機器人

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "telegram", accountId: "default" } },
    { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
  ],
  channels: {
    telegram: {
      accounts: {
        default: {
          botToken: "123456:ABC...",
          dmPolicy: "pairing",
        },
        alerts: {
          botToken: "987654:XYZ...",
          dmPolicy: "allowlist",
          allowFrom: ["tg:123456789"],
        },
      },
    },
  },
}
```

備註：

- 使用 BotFather 為每個代理建立一個機器人，並複製每個 token。
- Tokens 存活於 `channels.telegram.accounts.<id>.botToken` 中（預設帳戶可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每個代理的 WhatsApp 號碼

在啟動閘道之前連結每個帳戶：

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5):

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // Deterministic routing: first match wins (most-specific first).
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // Optional per-peer override (example: send a specific group to work agent).
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // Off by default: agent-to-agent messaging must be explicitly enabled + allowlisted.
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## 範例：WhatsApp 日常聊天 + Telegram 深度工作

依頻道分割：將 WhatsApp 路由到一個快速的日常代理，並將 Telegram 路由到 Opus 代理。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-5",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

備註：

- 如果您有一個頻道的多個帳戶，請將 `accountId` 加入綁定中（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要在將其餘部分保留在聊天模式時，將單一 DM/群組路由到 Opus，請為該對等點新增 `match.peer` 綁定；對等點比對永遠勝過頻道範圍的規則。

## 範例：相同頻道，一個對等點到 Opus

將 WhatsApp 保持在快速代理上，但將一個 DM 路由到 Opus：

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-5",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    {
      agentId: "opus",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
    },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

對等點綁定永遠優先，因此請將它們保持在頻道範圍規則之上。

## 綁定到 WhatsApp 群組的家庭代理

將專用的家庭代理綁定到單一 WhatsApp 群組，並設定提及閘門
和更嚴格的工具政策：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"],
        },
        sandbox: {
          mode: "all",
          scope: "agent",
        },
        tools: {
          allow: [
            "exec",
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
        },
      },
    ],
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" },
      },
    },
  ],
}
```

備註：

- 工具允許/拒絕清單是 **tools**，而不是 skills。如果技能需要執行
  二進位檔案，請確保允許 `exec` 並且該二進位檔案存在於沙箱中。
- 若要進行更嚴格的閘門控制，請設定 `agents.list[].groupChat.mentionPatterns` 並對該頻道
  保持群組允許清單的啟用狀態。

## 各代理沙箱和工具設定

從 v2026.1.6 開始，每個代理都可以有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // Always sandboxed
          scope: "agent",  // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"],    // Deny others
        },
      },
    ],
  },
}
```

注意：`setupCommand` 位於 `sandbox.docker` 之下，並在建立容器時執行一次。
當解析的範圍是 `"shared"` 時，會忽略各代理的 `sandbox.docker.*` 覆寫。

**優點：**

- **安全隔離**：限制不受信任代理的工具
- **資源控制**：將特定代理沙箱化，同時將其他代理保持在主機上
- **靈活政策**：每個代理有不同的權限

注意：`tools.elevated` 是 **global** 且基於發送者的；它無法針對每個代理進行設定。
如果您需要各代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。
針對群組目標設定，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能乾淨地對應到預期的代理。

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得詳細範例。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
