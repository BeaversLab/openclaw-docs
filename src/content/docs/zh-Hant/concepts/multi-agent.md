---
summary: "多代理路由：隔離的代理、頻道帳號與綁定"
title: 多代理路由
read_when: "您想要在一個閘道程序中擁有多個隔離的代理（工作區 + 認證）。"
status: active
---

# 多代理路由

目標：在一個運行的 Gateway 中實現多個 _隔離的_ 代理（獨立的工作區 + `agentDir` + 會話），以及多個頻道帳號（例如兩個 WhatsApp）。入站流量通過綁定路由到特定代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具有完整作用域的「大腦」，擁有自己獨立的：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、角色規則）。
- 用於認證配置檔案、模型註冊表和每個代理配置的 **狀態目錄** (`agentDir`)。
- 位於 `~/.openclaw/agents/<agentId>/sessions` 下的 **會話存儲**（聊天記錄 + 路由狀態）。

驗證設定檔是**按代理**區分的。每個代理從其自己的設定讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主代理憑證**不**會自動共享。切勿跨代理重複使用 `agentDir`
（這會導致認證/會話衝突）。如果您想共享憑證，
請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

技能是每個代理獨有的，通過每個工作區的 `skills/` 資料夾管理，而共享技能
可從 `~/.openclaw/skills` 獲取。請參閱 [Skills: per-agent vs shared](/en/tools/skills#per-agent-vs-shared-skills)。

閘道可以託管**一個代理**（預設）或並列託管**多個代理**。

**工作區注意事項：** 每個代理的工作區是 **默認的 cwd**，而不是嚴格的
沙盒。相對路徑在工作區內解析，但除非啟用了沙盒機制，否則絕對路徑可以
存取主機上的其他位置。請參閱
[Sandboxing](/en/gateway/sandboxing)。

## 路徑（快速地圖）

- 配置：`~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 狀態目錄：`~/.openclaw` (或 `OPENCLAW_STATE_DIR`)
- 工作區：`~/.openclaw/workspace` (或 `~/.openclaw/workspace-<agentId>`)
- 代理目錄：`~/.openclaw/agents/<agentId>/agent` (或 `agents.list[].agentDir`)
- 會話：`~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不進行任何設定，OpenClaw 將執行單一代理程式：

- `agentId` 默認為 **`main`**。
- 會話的鍵值為 `agent:main:<mainKey>`。
- 工作區默認為 `~/.openclaw/workspace`（或在設置 `OPENCLAW_PROFILE` 時為 `~/.openclaw/workspace-<profile>`）。
- 狀態默認為 `~/.openclaw/agents/main/agent`。

## 代理程式輔助工具

使用代理程式精靈來新增一個新的獨立代理程式：

```bash
openclaw agents add work
```

然後新增 `bindings` （或讓精靈協助您）以路由傳入訊息。

使用以下方式驗證：

```bash
openclaw agents list --bindings
```

## 快速開始

<Steps>
  <Step title="建立每個 Agent 的工作區">

使用精靈或手動建立工作區：

```bash
openclaw agents add coding
openclaw agents add social
```

每個 Agent 都會獲得自己的工作區，包含 `SOUL.md`、`AGENTS.md` 和可選的 `USER.md`，以及位於 `~/.openclaw/agents/<agentId>` 下的專屬 `agentDir` 和會話儲存。

  </Step>

  <Step title="建立通道帳號">

在您偏好的通道上為每個 Agent 建立一個帳號：

- Discord：每個 Agent 一個 bot，啟用 Message Content Intent，複製每個 token。
- Telegram：透過 BotFather 為每個 Agent 建立一個 bot，複製每個 token。
- WhatsApp：將每個電話號碼連結至每個帳號。

```bash
openclaw channels login --channel whatsapp --account work
```

請參閱通道指南：[Discord](/en/channels/discord)、[Telegram](/en/channels/telegram)、[WhatsApp](/en/channels/whatsapp)。

  </Step>

  <Step title="新增 Agent、帳號和綁定">

在 `agents.list` 下新增 Agent，在 `channels.<channel>.accounts` 下新增通道帳號，並使用 `bindings` 將它們連接起來（範例如下）。

  </Step>

  <Step title="重新啟動並驗證">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## 多個代理程式 = 多人、多種個性

擁有 **多個 Agent** 時，每個 `agentId` 都會變成一個 **完全隔離的角色**：

- **不同的電話號碼/帳號** （每個通道 `accountId`）。
- **不同的個性** （每個 Agent 的工作區檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的認證 + 會話**（除非明確啟用，否則不會互相干擾）。

這讓**多人**可以共用一個 Gateway 伺服器，同時保持他們的 AI「大腦」和資料隔離。

## 跨 Agent QMD 記憶搜尋

如果某個 Agent 應該搜尋另一個 Agent 的 QMD 會話紀錄，請在 `agents.list[].memorySearch.qmd.extraCollections` 下新增額外的集合。
僅當每個 Agent 都應繼承相同的共享會話紀錄集合時，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // resolves inside workspace -> collection named "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

額外的集合路徑可以在代理之間共享，但當路徑位於代理工作區之外時，集合名稱保持顯式。工作區內的路徑保持代理作用域，因此每個代理都保留自己的對話紀錄搜尋集。

## 一個 WhatsApp 號碼，多人（私訊分流）

您可以在**同一個 WhatsApp 帳戶**中，將**不同的 WhatsApp 私訊**路由到不同的代理。使用 `peer.kind: "direct"` 根據發送者 E.164（例如 `+15551234567`）進行匹配。回覆仍來自同一個 WhatsApp 號碼（沒有每個代理的發送者身份）。

重要細節：直接聊天會合併到代理的**主會話金鑰**，因此真正的隔離需要**每人一個代理**。

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

- 私訊存取控制是**每個 WhatsApp 帳戶全域**（配對/允許清單），而不是每個代理。
- 對於共用群組，將群組綁定到一個代理或使用 [廣播群組](/en/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理）

綁定是**確定性**的，且**最具體者優先**：

1. `peer` 匹配（精確私訊/群組/頻道 ID）
2. `parentPeer` 匹配（執行緒繼承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 匹配某個頻道
7. 頻道級別匹配（`accountId: "*"`）
8. 回退到預設代理（`agents.list[].default`，否則為清單第一個條目，預設為：`main`）

如果多個綁定在同一層級匹配，則配置順序中的第一個獲勝。如果綁定設定了多個匹配欄位（例如 `peer` + `guildId`），則所有指定欄位都是必需的（`AND` 語義）。

重要的帳號作用域細節：

- 省略 `accountId` 的綁定僅匹配預設帳號。
- 使用 `accountId: "*"` 進行跨所有帳號的頻道範圍回退。
- 如果您稍後使用明確的帳號 ID 為同一個代理添加相同的綁定，OpenClaw 將現有的僅限頻道的綁定升級為帳號作用域，而不是複製它。

## 多個帳號 / 電話號碼

支援 **多重帳號** 的通道（例如 WhatsApp）使用 `accountId` 來識別
每個登入。每個 `accountId` 都可以被路由到不同的代理，因此一台伺服器可以託管
多個電話號碼而不會混雜會話。

如果您希望在省略 `accountId` 時有一個通道級別的預設帳號，請設定
`channels.<channel>.defaultAccount`（選用）。當未設定時，OpenClaw 會回退
至 `default`（如果存在），否則為第一個設定的帳號 ID（排序後）。

支援此模式的常見通道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每個代理的認證、每個代理的會話儲存）。
- `accountId`：一個通道帳號實例（例如 WhatsApp 帳號 `"personal"` 與 `"biz"`）。
- `binding`：透過 `(channel, accountId, peer)` 以及選用的公會/團隊 ID 將傳入訊息路由到 `agentId`。
- 私聊會折疊至 `agent:<agentId>:<mainKey>`（每個代理的「主要」；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳號對應到一個唯一的 `accountId`。將每個帳號綁定到一個代理，並為每個機器人保留允許清單。

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

- 邀請每個機器人加入伺服器並啟用訊息內容意圖。
- Token 存在於 `channels.discord.accounts.<id>.token` 中（預設帳號可以使用 `DISCORD_BOT_TOKEN`）。

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

- 使用 BotFather 為每個代理建立一個機器人並複製每個 token。
- Token 存在於 `channels.telegram.accounts.<id>.botToken` 中（預設帳戶可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每個代理的 WhatsApp 號碼

在啟動閘道之前連結每個帳戶：

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

按通道拆分：將 WhatsApp 路由到快速的日常代理，將 Telegram 路由到 Opus 代理。

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

- 如果您有一個通道的多個帳戶，請將 `accountId` 新增到綁定（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要將單一 DM/群組路由到 Opus，同時將其餘部分保留在聊天模式，請為該對等端新增 `match.peer` 綁定；對等端匹配始終優先於通道範圍的規則。

## 範例：相同通道，一個對等端至 Opus

將 WhatsApp 保留在快速代理上，但將一個 DM 路由到 Opus：

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

對等端綁定始終優先，因此請將其保留在通道範圍規則之上。

## 綁定到 WhatsApp 群組的家庭代理

將專用的家庭代理綁定到單一 WhatsApp 群組，並啟用提及閘控
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
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
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

- 工具允許/拒絕清單是 **tools**，而不是 skills。如果 skill 需要執行
  binary，請確保允許 `exec` 且該 binary 存在於沙箱中。
- 若要進行更嚴格的閘控，請設定 `agents.list[].groupChat.mentionPatterns` 並對通道保持
  啟用群組允許清單。

## 個別代理的沙箱和工具配置

每個代理都可以有自己的沙箱和工具限制：

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
當解析的範圍為 `"shared"` 時，將忽略每個代理的 `sandbox.docker.*` 覆蓋。

**優點：**

- **安全隔離**：限制不受信任代理的工具
- **資源控制**：將特定代理置於沙箱中，同時將其他代理保留在主機上
- **靈活政策**：每個代理有不同的權限

注意：`tools.elevated` 是 **全域的** 且基於發送者；無法針對每個代理進行配置。
如果您需要每個代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。
若要針對群組，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 清晰地對應到預期的代理。

有關詳細範例，請參閱 [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools)。

## 相關

- [Channel Routing](/en/channels/channel-routing) — 訊息如何路由到代理程式
- [Sub-Agents](/en/tools/subagents) — 產生背景代理程式執行
- [ACP Agents](/en/tools/acp-agents) — 執行外部編程工具
- [Presence](/en/concepts/presence) — 代理程式上線狀態與可用性
- [Session](/en/concepts/session) — 會話隔離與路由
