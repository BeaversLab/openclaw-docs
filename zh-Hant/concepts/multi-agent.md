---
summary: "多代理路由：隔離的代理、頻道帳戶和綁定"
title: 多代理路由
read_when: "您想要在一個網關進程中擁有多個隔離的代理（工作區 + 身份驗證）。"
status: 活躍
---

# 多代理路由

目標：在單一執行的 Gateway 中，擁有多個*隔離的*代理（獨立的工作區 + `agentDir` + 會話），以及多個頻道帳戶（例如兩個 WhatsApp）。傳入訊息會透過綁定路由到特定代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具有完整範圍的大腦，擁有獨立的：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、角色規則）。
- **狀態目錄** (`agentDir`)，用於存放身份驗證設定檔、模型註冊表以及各代理的配置。
- **會話儲存**（聊天記錄 + 路由狀態）位於 `~/.openclaw/agents/<agentId>/sessions` 之下。

身份驗證設定檔是**依代理區分**的。每個代理從其自己的位置讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主要代理憑證**不會**自動共享。絕不要跨代理重複使用 `agentDir`
（這會導致身份驗證/會衝突）。如果您想共享憑證，
請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

技能透過各個工作區的 `skills/` 資料夾區分為各代理專屬，並可從 `~/.openclaw/skills` 取得共享技能。
請參閱 [技能：代理專屬 vs 共享](/zh-Hant/tools/skills#per-agent-vs-shared-skills)。

Gateway 可以託管 **一個代理**（預設）或並排託管 **多個代理**。

**工作區備註：** 每個代理的工作區是 **預設 cwd**（目前工作目錄），而非嚴格的
沙箱。相對路徑會在工作區內解析，但絕對路徑可以存取
其他主機位置，除非啟用了沙箱機制。請參閱
[沙箱機制](/zh-Hant/gateway/sandboxing)。

## 路徑（快速地圖）

- 配置： `~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄： `~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作區： `~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目錄： `~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 會話： `~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不進行任何設定，OpenClaw 將執行單一代理程式：

- `agentId` 預設為 **`main`**。
- Session 的鍵值為 `agent:main:<mainKey>`。
- Workspace 預設為 `~/.openclaw/workspace`（若設定 `OPENCLAW_PROFILE` 則為 `~/.openclaw/workspace-<profile>`）。
- State 預設為 `~/.openclaw/agents/main/agent`。

## Agent helper

使用 agent wizard 來新增一個新的獨立代理程式：

```bash
openclaw agents add work
```

然後新增 `bindings`（或讓 wizard 自動處理）以路由傳入訊息。

使用以下方式驗證：

```bash
openclaw agents list --bindings
```

## Quick start

<Steps>
  <Step title="建立每個 agent workspace">

使用 wizard 或手動建立 workspace：

```bash
openclaw agents add coding
openclaw agents add social
```

每個 agent 都會獲得自己的 workspace，其中包含 `SOUL.md`、`AGENTS.md` 和可選的 `USER.md`，以及專屬的 `agentDir` 和位於 `~/.openclaw/agents/<agentId>` 下的 session store。

  </Step>

  <Step title="建立通道帳戶">

在您偏好的通道上為每個 agent 建立一個帳戶：

- Discord：每個 agent 一個 bot，啟用 Message Content Intent，複製每個 token。
- Telegram：透過 BotFather 為每個 agent 建立一個 bot，複製每個 token。
- WhatsApp：將每個電話號碼連結至對應的帳戶。

```bash
openclaw channels login --channel whatsapp --account work
```

請參閱通道指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>

  <Step title="新增 agents、帳戶和 bindings">

在 `agents.list` 下新增 agents，在 `channels.<channel>.accounts` 下新增通道帳戶，並使用 `bindings` 將它們連接起來（範例見下）。

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

擁有 **multiple agents**，每個 `agentId` 都會成為一個 **完全獨立的人格**：

- **不同的電話號碼/帳戶**（每個通道 `accountId`）。
- **不同的個性**（每個代理的工作區檔案，如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的驗證 + 會話**（除非明確啟用，否則無相互干擾）。

這讓**多人**可以共用一個 Gateway 伺服器，同時保持其 AI 「大腦」和資料隔離。

## 一個 WhatsApp 號碼，多人（私訊分流）

您可以在**一個 WhatsApp 帳戶**上，將**不同的 WhatsApp 私訊**路由到不同的代理。使用 `peer.kind: "direct"` 匹配發送者 E.164（例如 `+15551234567`）。回覆仍來自同一個 WhatsApp 號碼（無每代理發送者身分）。

重要細節：直接聊天會折疊為代理的**主會話金鑰**，因此真正的隔離需要**每人一個代理**。

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

註記：

- 私訊存取控制是**每個 WhatsApp 帳戶的全域設定**（配對/允許清單），而非每個代理的設定。
- 對於共用群組，將群組綁定至一個代理或使用 [廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理）

綁定是**確定性**的，且**最特定者優先**：

1. `peer` 匹配（精確的私訊/群組/頻道 ID）
2. `parentPeer` 匹配（執行緒繼承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 頻道匹配
7. 頻道層級匹配（`accountId: "*"`）
8. 回退至預設代理（`agents.list[].default`，否則清單第一個項目，預設值：`main`）

如果在同一層級中有多個綁定匹配，則設定檔順序中的第一個優先。
如果綁定設定了多個匹配欄位（例如 `peer` + `guildId`），則所有指定的欄位都是必需的（`AND` 語意）。

重要的帳戶範圍細節：

- 省略 `accountId` 的綁定僅匹配預設帳戶。
- 使用 `accountId: "*"` 進行所有帳戶的頻道全域回退。
- 如果您稍後為同一個代理添加了具有明確帳戶 ID 的相同綁定，OpenClaw 會將現有的僅通道綁定升級為帳戶範圍綁定，而不是重複創建它。

## 多個帳戶 / 電話號碼

支援 **多個帳戶**（例如 WhatsApp）的通道使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理，因此一台伺服器可以託管多個電話號碼而不會混淆會話。

如果您希望在省略 `accountId` 時設定通道範圍的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。如果未設定，OpenClaw 將回退到 `default`（如果存在），否則使用第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `bluebubbles`、`zalo`、`zalouser`、`nostr`、`feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每個代理的驗證、每個代理的會話儲存）。
- `accountId`：一個通道帳戶實例（例如 WhatsApp 帳戶 `"personal"` 對比 `"biz"`）。
- `binding`：根據 `(channel, accountId, peer)` 以及可選的公會/團隊 ID 將傳入訊息路由到 `agentId`。
- 直接訊息會合併為 `agent:<agentId>:<mainKey>`（每個代理的「主」通道；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳戶都對應到一個唯一的 `accountId`。將每個帳戶綁定到一個代理，並為每個機器人維護允許清單。

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
- Tokens 存活於 `channels.discord.accounts.<id>.token` 中（預設帳號可使用 `DISCORD_BOT_TOKEN`）。

### 每個 Agent 的 Telegram Bot

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

- 使用 BotFather 為每個 Agent 建立一個 Bot，並複製每個 Token。
- Tokens 存活於 `channels.telegram.accounts.<id>.botToken` 中（預設帳號可使用 `TELEGRAM_BOT_TOKEN`）。

### 每個 Agent 的 WhatsApp 號碼

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

按通道拆分：將 WhatsApp 路由到快速的日常 Agent，將 Telegram 路由到 Opus Agent。

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

- 如果您有一個通道的多個帳號，請將 `accountId` 新增到綁定中（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要在將單一 DM/群組路由到 Opus 的同時將其餘部分保持在聊天模式，請為該對等端新增 `match.peer` 綁定；對等端匹配總是會勝過通道範圍的規則。

## 範例：相同通道，一個對等端到 Opus

將 WhatsApp 保持在快速 Agent 上，但將一個 DM 路由到 Opus：

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

對等端綁定總是優先，因此請將它們放在通道範圍規則之上。

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

- 工具允許/拒絕清單是 **tools**，而非 skills。如果 skill 需要執行
  binary，請確保允許 `exec` 且該 binary 存在於沙箱中。
- 對於更嚴格的閘控，請設定 `agents.list[].groupChat.mentionPatterns` 並
  保持通道的群組允許清單已啟用。

## 每個 Agent 的沙箱和工具設定

從 v2026.1.6 開始，每個 Agent 都可以擁有自己的沙箱和工具限制：

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
當解析的範圍為 `"shared"` 時，每個 Agent 的 `sandbox.docker.*` 覆寫將被忽略。

**優點：**

- **安全隔離**：限制不受信任 Agent 的工具
- **資源控制**：將特定 Agent 置於沙箱中，同時將其他 Agent 保持在主機上
- **靈活策略**：每個 Agent 具有不同的權限

注意：`tools.elevated` 是**全域**且基於發送者的；無法針對每個代理程式進行設定。
如果您需要針對每個代理程式的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。
針對群組目標定位，請使用 `agents.list[].groupChat.mentionPatterns`，讓 @mentions 能乾淨地對應到預期的代理程式。

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得詳細範例。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
