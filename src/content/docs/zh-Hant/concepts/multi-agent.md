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

`sessions_history` 也是這裡較安全的跨會話召回路徑：它返回
有界的、經過清理的視圖，而不是原始的記錄傾倒。Assistant recall 會移除
思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML
負載（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、 `<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及被截斷的工具呼叫區塊）、
降級的工具呼叫腳手架、洩漏的 ASCII/全形模型控制
權杖，以及在編輯/截斷之前的格式錯誤的 MiniMax 工具呼叫 XML。

主要代理憑證**不會**自動共享。切勿跨代理重複使用 `agentDir`
（這會導致驗證/會衝突）。如果您想要共享憑證，
請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

技能是從每個代理的工作區以及諸如 `~/.openclaw/skills` 之類的共享根載入的，然後在
配置時根據有效的代理技能允許清單進行過濾。使用 `agents.defaults.skills` 作為共享基準，並
使用 `agents.list[].skills` 進行每個代理的替換。請參閱
[Skills: per-agent vs shared](/zh-Hant/tools/skills#per-agent-vs-shared-skills) 和
[Skills: agent skill allowlists](/zh-Hant/tools/skills#agent-skill-allowlists)。

Gateway 可以並排託管**一個代理**（預設）或**多個代理**。

**工作區備註：** 每個代理的工作區是**預設的 cwd**，而不是嚴格的
沙箱。相對路徑在工作區內解析，但除非啟用沙箱，否則絕對路徑可以
到達其他主機位置。請參閱
[Sandboxing](/zh-Hant/gateway/sandboxing)。

## 路徑（快速地圖）

- 設定： `~/.openclaw/openclaw.json` （或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄： `~/.openclaw` （或 `OPENCLAW_STATE_DIR`）
- 工作區： `~/.openclaw/workspace` （或 `~/.openclaw/workspace-<agentId>`）
- 代理目錄： `~/.openclaw/agents/<agentId>/agent` （或 `agents.list[].agentDir`）
- 會話： `~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不進行任何設定，OpenClaw 將執行單個代理：

- `agentId` 預設為 **`main`**。
- Sessions 的鍵值為 `agent:main:<mainKey>`。
- Workspace 預設為 `~/.openclaw/workspace` (當設定 `OPENCLAW_PROFILE` 時則為 `~/.openclaw/workspace-<profile>`)。
- State 預設為 `~/.openclaw/agents/main/agent`。

## Agent helper

使用 agent 精靈來新增一個新的獨立 agent：

```bash
openclaw agents add work
```

然後新增 `bindings` (或讓精靈幫您處理) 以路由傳入訊息。

使用以下指令驗證：

```bash
openclaw agents list --bindings
```

## Quick start

<Steps>
  <Step title="建立每個 agent workspace">

使用精靈或手動建立 workspace：

```bash
openclaw agents add coding
openclaw agents add social
```

每個 agent 都會獲得自己的 workspace，包含 `SOUL.md`、`AGENTS.md` 和可選的 `USER.md`，以及專屬的 `agentDir` 與位於 `~/.openclaw/agents/<agentId>` 下的 session store。

  </Step>

  <Step title="建立通道帳號">

在您偏好的通道上為每個 agent 建立一個帳號：

- Discord：每個 agent 一個 bot，啟用 Message Content Intent，複製每個 token。
- Telegram：透過 BotFather 為每個 agent 建立一個 bot，複製每個 token。
- WhatsApp：為每個帳號連結每個電話號碼。

```bash
openclaw channels login --channel whatsapp --account work
```

請參閱通道指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>

  <Step title="新增 agents、帳號和綁定">

在 `agents.list` 下新增 agents，在 `channels.<channel>.accounts` 下新增通道帳號，並使用 `bindings` 連接它們 (範例如下)。

  </Step>

  <Step title="重新啟動並驗證">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Multiple agents = 多個人員，多種性格

有了 **multiple agents**，每個 `agentId` 都會變成一個 **完全獨立的人格**：

- **不同的電話號碼/帳號** (依據每個通道 `accountId`)。
- **不同的性格** (每個 agent 的 workspace 檔案，例如 `AGENTS.md` 和 `SOUL.md`)。
- **分開的 auth + sessions** (除非明確啟用，否則不會互相交談)。

這讓**多人**可以共用一個 Gateway 伺服器，同時保持其 AI「大腦」和資料彼此隔離。

## 跨代理 QMD 記憶體搜尋

如果某個代理應該搜尋另一個代理的 QMD 會話記錄，請在 `agents.list[].memorySearch.qmd.extraCollections` 下新增額外的集合。
僅當每個代理都應繼承相同的共享記錄集合時，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

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

額外的集合路徑可以在代理之間共享，但當路徑位於代理工作區之外時，集合名稱
會保持明確。工作區內的路徑仍保持代理範圍，因此每個代理都保留自己的記錄搜尋集。

## 一個 WhatsApp 號碼，多人（DM 分流）

您可以在保持**一個 WhatsApp 帳戶**的同時，將**不同的 WhatsApp 私訊**路由到不同的代理。使用 `peer.kind: "direct"` 比對發送者 E.164（例如 `+15551234567`）。回覆仍來自同一個 WhatsApp 號碼（沒有每個代理的發送者身分）。

重要細節：直接聊天會合併為代理的**主會話金鑰**，因此真正的隔離需要**每人一個代理**。

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

- DM 存取控制是**每個 WhatsApp 帳戶的全域設定**（配對/允許清單），而不是每個代理的設定。
- 對於共享群組，請將群組綁定到一個代理，或使用 [廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理）

綁定是**決定性**的，並遵循**最特定者優先**：

1. `peer` 比對（精確的 DM/群組/頻道 ID）
2. `parentPeer` 比對（執行緒繼承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 比對特定頻道
7. 頻道層級比對（`accountId: "*"`）
8. 回退至預設代理（`agents.list[].default`，否則為列表第一個項目，預設為：`main`）

如果同一層級有多個綁定相符，則設定順序中的第一個優先。
如果綁定設定了多個比對欄位（例如 `peer` + `guildId`），則需要所有指定的欄位（`AND` 語意）。

重要的帳戶範圍細節：

- 省略 `accountId` 的綁定僅符合預設帳戶。
- 請使用 `accountId: "*"` 作為所有帳戶的通道級別後備。
- 如果您稍後為同一個代理添加相同的綁定並指定明確的帳戶 ID，OpenClaw 會將現有的僅限通道的綁定升級為帳戶範圍的綁定，而不是重複建立它。

## 多個帳戶 / 電話號碼

支援**多個帳戶**的通道（例如 WhatsApp）使用 `accountId` 來識別
每個登入。每個 `accountId` 都可以路由到不同的代理，因此一個伺服器可以託管
多個電話號碼而不會混淆會話。

如果您希望在省略 `accountId` 時擁有通道範圍的預設帳戶，請設定
`channels.<channel>.defaultAccount`（可選）。若未設定，OpenClaw 將後備至
`default`（如果存在），否則為第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`，`telegram`，`discord`，`slack`，`signal`，`imessage`
- `irc`，`line`，`googlechat`，`mattermost`，`matrix`，`nextcloud-talk`
- `bluebubbles`，`zalo`，`zalouser`，`nostr`，`feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每個代理的驗證、每個代理的會話儲存）。
- `accountId`：一個通道帳戶實例（例如 WhatsApp 帳戶 `"personal"` 與 `"biz"`）。
- `binding`：透過 `(channel, accountId, peer)` 以及可選的伺服器/團隊 ID 將傳入訊息路由到 `agentId`。
- 直接聊天會合併到 `agent:<agentId>:<mainKey>`（每個代理的「主」；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳號都對應一個唯一的 `accountId`。將每個帳號綁定到一個代理並為每個機器人保留允許清單。

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
- Token 存在於 `channels.telegram.accounts.<id>.botToken` 中（預設帳號可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每個代理的 WhatsApp 號碼

在啟動閘道之前連結每個帳號：

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

按頻道分流：將 WhatsApp 路由到一個快速的日常代理，將 Telegram 路由到一個 Opus 代理。

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

- 如果一個頻道有多個帳號，請在綁定中加入 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要將單個私訊/群組路由到 Opus，同時將其餘部分保留在聊天代理，請為該對等方新增 `match.peer` 綁定；對等方匹配總是優先於頻道範圍的規則。

## 範例：相同頻道，一個對等方到 Opus

將 WhatsApp 保持在快速代理上，但將一個私訊路由到 Opus：

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

對等方綁定總是優先，因此請將它們放在頻道範圍的規則之上。

## 綁定到 WhatsApp 群組的家庭代理

將專用的家庭代理綁定到單個 WhatsApp 群組，並啟用提及閘門
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

- 工具允許/拒絕清單是 **工具**，而不是技能。如果技能需要執行
  二進位檔案，請確保允許 `exec` 並且二進位檔案存在於沙箱中。
- 為了更嚴格的閘門控制，請設定 `agents.list[].groupChat.mentionPatterns` 並保持
  該頻道的群組允許清單已啟用。

## 每個代理的沙箱與工具配置

每個代理都可以擁有自己的沙箱和工具限制：

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
- **資源控制**：沙箱特定代理，同時將其他代理保留在主機上
- **靈活的政策**：每個代理有不同的權限

注意：`tools.elevated` 是**全域**的且基於發送者；無法針對每個代理程式個別設定。
如果您需要針對每個代理程式的界限，請使用 `agents.list[].tools` 來拒絕 `exec`。
針對群組目標定位，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @提及能乾淨地對應到預期的代理程式。

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得詳細範例。

## 相關

- [Channel Routing](/zh-Hant/channels/channel-routing) — 訊息如何路由到代理程式
- [Sub-Agents](/zh-Hant/tools/subagents) — 產生背景代理程式執行
- [ACP Agents](/zh-Hant/tools/acp-agents) — 執行外部編碼機制
- [Presence](/zh-Hant/concepts/presence) — 代理程式狀態與可用性
- [Session](/zh-Hant/concepts/session) — 會話隔離與路由
