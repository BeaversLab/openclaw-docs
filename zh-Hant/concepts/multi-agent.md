---
summary: "多代理路由：隔離的代理、頻道帳戶與綁定"
title: 多代理路由
read_when: "您希望在一個閘道程序中擁有多個隔離的代理（工作區 + 身份驗證）。"
status: active
---

# 多代理路由

目標：在單一執行中的閘道內，擁有多個*隔離的*代理（獨立工作區 + `agentDir` + 會話），以及多個頻道帳戶（例如兩個 WhatsApp）。入站流量透過綁定路由至特定代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具備完整作用域的「大腦」，擁有：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、角色規則）。
- **狀態目錄**（`agentDir`），用於存放身分驗證設定檔、模型登錄表與各代理的配置。
- **會話存儲**（聊天紀錄 + 路由狀態），位於 `~/.openclaw/agents/<agentId>/sessions` 之下。

Auth profiles 是**每個 Agent 各自獨立**的。每個 Agent 從其自身的：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主要 Agent 憑證**不會**自動共用。切勿跨 Agent 重複使用 `agentDir`
（這會導致 auth/session 衝突）。如果您想共用憑證，
請將 `auth-profiles.json` 複製到另一個 Agent 的 `agentDir` 中。

Skills 透過每個 workspace 的 `skills/` 資料夾對應到各個 Agent，並可從 `~/.openclaw/skills` 取用共用的 skills。
請參閱 [Skills: per-agent vs shared](/zh-Hant/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以託管**一個 Agent**（預設）或**並排託管多個 Agents**。

**Workspace 註記：**每個 Agent 的 workspace 是**預設的 cwd**，而不是嚴格的
sandbox。相對路徑會在 workspace 內解析，但除非啟用 sandboxing，否則絕對路徑可以
存取其他主機位置。請參閱
[Sandboxing](/zh-Hant/gateway/sandboxing)。

## 路徑（快速地圖）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作區：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目錄：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 會話：`~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不做任何操作，OpenClaw 將運行單個代理：

- `agentId` 預設為 **`main`**。
- 會話鍵值為 `agent:main:<mainKey>`。
- 工作區預設為 `~/.openclaw/workspace`（或在設定 `OPENCLAW_PROFILE` 時為 `~/.openclaw/workspace-<profile>`）。
- 狀態預設為 `~/.openclaw/agents/main/agent`。

## 代理助手

使用代理精靈新增一個新的隔離代理：

```bash
openclaw agents add work
```

然後新增 `bindings`（或讓精靈為您新增）以路由傳入訊息。

驗證方式：

```bash
openclaw agents list --bindings
```

## 快速開始

<Steps>
  <Step title="建立每個代理程式工作區">

使用精靈或手動建立工作區：

```bash
openclaw agents add coding
openclaw agents add social
```

每個代理程式都會獲得自己的工作區，其中包含 `SOUL.md`、`AGENTS.md` 和選用的 `USER.md`，外加專屬的 `agentDir` 和 `~/.openclaw/agents/<agentId>` 下的會話儲存庫。

  </Step>

  <Step title="建立通道帳號">

在您偏好的通道上為每個代理建立一個帳號：

- Discord：每個代理一個機器人，啟用 Message Content Intent，複製每個 token。
- Telegram：透過 BotFather 為每個代理建立一個機器人，複製每個 token。
- WhatsApp：將每個電話號碼連結至對應的帳號。

```bash
openclaw channels login --channel whatsapp --account work
```

參閱通道指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>

  <Step title="新增代理、帳號與綁定">

在 `agents.list` 下新增代理，在 `channels.<channel>.accounts` 下新增通道帳號，並使用 `bindings` 將它們連接起來（範例見下文）。

  </Step>

  <Step title="重新啟動並驗證">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## 多個代理程式 = 多個人，多種個性

在**多個代理程式**的情況下，每個 `agentId` 都會成為一個**完全獨立的個性**：

- **不同的電話號碼/帳戶**（每個頻道 `accountId`）。
- **不同的個性**（每個代理程式的工作區檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的驗證 + 會話**（除非明確啟用，否則不會有串線）。

這讓**多個人**可以共用一個 Gateway 伺服器，同時保持他們的 AI 「大腦」和資料互相隔離。

## 一個 WhatsApp 號碼，多個人（私訊分發）

您可以在使用 **一個 WhatsApp 帳號** 的同時，將 **不同的 WhatsApp 私訊** 路由到不同的代理程式。使用 `peer.kind: "direct"` 比對發送者 E.164（例如 `+15551234567`）。回覆仍來自同一個 WhatsApp 號碼（沒有按代理程式區分的發送者身分）。

重要細節：直接聊天會合併到代理程式的 **主要會話金鑰**，因此要實現真正的隔離需要 **每個人一個代理程式**。

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

- 私訊存取控制是 **每個 WhatsApp 帳號全域的**（配對/允許清單），而不是按代理程式區分。
- 對於共用群組，將群組綁定到一個代理程式或使用 [廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理程式）

綁定是 **確定性** 的且 **最特指定規則優先**：

1. `peer` 比對（精確的私訊/群組/頻道 ID）
2. `parentPeer` 比對（執行緒繼承）
3. `guildId + roles` (Discord 角色路由)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. `accountId` 符合頻道
7. 頻道層級符合 (`accountId: "*"`)
8. 回退至預設代理程式 (`agents.list[].default`，否則為清單第一個項目，預設值：`main`)

如果同一層級有多個綁定符合，則以設定順序的第一個為準。
如果綁定設定了多個符合欄位 (例如 `peer` + `guildId`)，則需要所有指定的欄位 (`AND` 語意)。

重要的帳號範圍細節：

- 省略 `accountId` 的綁定僅符合預設帳號。
- 使用 `accountId: "*"` 作為跨所有帳號的頻道全域回退。
- 如果您之後針對同一個代理程式使用明確的帳戶 ID 新增相同的綁定，OpenClaw 會將現有的僅限通道綁定升級為帳戶範圍，而不是重複建立。

## 多個帳戶 / 電話號碼

支援 **多個帳戶** 的通道（例如 WhatsApp）使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理程式，因此一台伺服器可以託管多個電話號碼，而不會混淆會話。

如果您想要在省略 `accountId` 時設定通道預設的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。如果未設定，OpenClaw 會回退到 `default`（如果存在），否則回退到第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`，`telegram`，`discord`，`slack`，`signal`，`imessage`
- `irc`，`line`，`googlechat`，`mattermost`，`matrix`，`nextcloud-talk`
- `bluebubbles`，`zalo`，`zalouser`，`nostr`，`feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每個代理的認證、每個代理的會話儲存）。
- `accountId`：一個頻道帳號實例（例如 WhatsApp 帳號 `"personal"` 對比 `"biz"`）。
- `binding`：根據 `(channel, accountId, peer)` 以及可選的公會/團隊 ID，將傳入訊息路由至 `agentId`。
- 直接聊天會合併為 `agent:<agentId>:<mainKey>`（每個代理的「主要」；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳戶都對應到唯一的 `accountId`。將每個帳戶綁定到一個代理，並為每個機器人設定允許名單。

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

- 邀請每個機器人加入伺服器，並啟用訊息內容意圖。
- Token 存放於 `channels.discord.accounts.<id>.token`（預設帳戶可使用 `DISCORD_BOT_TOKEN`）。

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

- 透過 BotFather 為每個代理建立一個機器人，並複製每個 Token。
- Token 存放於 `channels.telegram.accounts.<id>.botToken`（預設帳戶可使用 `TELEGRAM_BOT_TOKEN`）。

### 每個代理的 WhatsApp 號碼

在啟動 Gateway 之前連結每個帳號：

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5)：

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

按頻道分流：將 WhatsApp 路由到快速日常 Agent，將 Telegram 路由到 Opus Agent。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
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

- 如果您在某個頻道擁有多個帳號，請在綁定中加入 `accountId` (例如 `{ channel: "whatsapp", accountId: "personal" }`)。
- 若要將單一 DM/群組路由到 Opus，其餘保持為 chat，請為該 peer 新增 `match.peer` 綁定；peer 匹配總是優先於頻道範圍的規則。

## 範例：相同頻道，一個 peer 至 Opus

將 WhatsApp 保持在快速 Agent，但將一個 DM 路由到 Opus：

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
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

Peer 綁定總是優先，因此請將它們放在頻道範圍規則之上。

## 綁定到 WhatsApp 群組的家庭 Agent

將專用的家庭 Agent 綁定到單一 WhatsApp 群組，並啟用提及閘控
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

- 工具允許/拒絕清單是 **工具**，而非技能。如果技能需要執行
  二進制檔案，請確保允許 `exec` 且該二進制檔案存在於沙箱中。
- 若要進行更嚴格的閘道控制，請設定 `agents.list[].groupChat.mentionPatterns` 並
  對頻道啟用群組允許清單。

## 個別代理程式的沙箱與工具設定

每個代理程式都可以擁有自己的沙箱與工具限制：

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
當解析的作用域為 `"shared"` 時，將忽略個別代理程式的 `sandbox.docker.*` 覆寫設定。

**優點：**

- **安全隔離**：限制不受信任代理程式的工具
- **資源控制**：將特定代理程式放入沙箱，同時將其他代理程式保留在主機上
- **彈性原則**：每個代理程式擁有不同的權限

注意：`tools.elevated` 是**全局**且基於發送者的；它無法針對每個代理進行配置。
如果您需要針對每個代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。
若要針對群組目標，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能乾淨地對應到預期的代理。

詳情請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
