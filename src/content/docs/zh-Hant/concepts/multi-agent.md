---
summary: "多代理路由：隔離的代理、通道帳號和綁定"
title: 多代理路由
read_when: "您希望在一個閘道程序中擁有多個隔離的代理（工作區 + 驗證）。"
status: active
---

# 多代理路由

目標：在一個運行的閘道中擁有多個*隔離的*代理（獨立的工作區 + `agentDir` + 會話），以及多個通道帳號（例如兩個 WhatsApp）。入站流量通過綁定路由到代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具有完整作用域的「大腦」，擁有自己獨立的：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、角色規則）。
- **狀態目錄**（`agentDir`），用於存放驗證設定檔、模型註冊表和每個代理的配置。
- **會話存儲**（聊天記錄 + 路由狀態）位於 `~/.openclaw/agents/<agentId>/sessions` 之下。

驗證設定檔是**按代理**區分的。每個代理從其自己的設定讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

主要代理憑證**不**會自動共享。切勿跨代理重複使用 `agentDir`
（這會導致驗證/會話衝突）。如果您想要共享憑證，
請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。

技能是按代理區分的，透過每個工作區的 `skills/` 資料夾存放，而共享技能
可從 `~/.openclaw/skills` 獲取。請參閱[技能：按代理 vs 共享](/en/tools/skills#per-agent-vs-shared-skills)。

閘道可以託管**一個代理**（預設）或並列託管**多個代理**。

**工作區備註：**每個代理的工作區是**預設 cwd**（目前工作目錄），而不是嚴格的
沙箱。相對路徑在工作區內解析，但絕對路徑可以
存取其他主機位置，除非啟用了沙箱機制。請參閱
[沙箱機制](/en/gateway/sandboxing)。

## 路徑（快速地圖）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作區：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目錄：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 會話：`~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不進行任何設定，OpenClaw 將執行單一代理程式：

- `agentId` 預設為 **`main`**。
- 會話的鍵值為 `agent:main:<mainKey>`。
- 工作區預設為 `~/.openclaw/workspace` (當設定 `OPENCLAW_PROFILE` 時則為 `~/.openclaw/workspace-<profile>`)。
- 狀態預設為 `~/.openclaw/agents/main/agent`。

## 代理程式輔助工具

使用代理程式精靈來新增一個新的獨立代理程式：

```bash
openclaw agents add work
```

然後新增 `bindings` (或讓精靈為您處理) 以路由傳送傳入訊息。

使用以下方式驗證：

```bash
openclaw agents list --bindings
```

## 快速開始

<Steps>
  <Step title="建立每個代理程式的工作區">

使用精靈或手動建立工作區：

```bash
openclaw agents add coding
openclaw agents add social
```

每個代理程式都會擁有自己的工作區，其中包含 `SOUL.md`、`AGENTS.md` 和選用的 `USER.md`，以及在 `~/.openclaw/agents/<agentId>` 下的專屬 `agentDir` 和會話儲存。

  </Step>

  <Step title="建立通道帳戶">

在您偏好的通道上，為每個代理程式建立一個帳戶：

- Discord：每個代理程式一個機器人，啟用訊息內容意圖，複製每個權杖。
- Telegram：透過 BotFather 為每個代理程式建立一個機器人，複製每個權杖。
- WhatsApp：將每個帳戶連結到其電話號碼。

```bash
openclaw channels login --channel whatsapp --account work
```

請參閱通道指南：[Discord](/en/channels/discord)、[Telegram](/en/channels/telegram)、[WhatsApp](/en/channels/whatsapp)。

  </Step>

  <Step title="新增代理程式、帳戶和綁定">

在 `agents.list` 下新增代理程式，在 `channels.<channel>.accounts` 下新增通道帳戶，並使用 `bindings` 將它們連接起來 (範例如下)。

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

有了 **多個代理程式**，每個 `agentId` 都會成為一個 **完全獨立的角色**：

- **不同的電話號碼/帳戶** (針對每個通道 `accountId`)。
- **不同的性格**（每個代理的工作區檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的認證 + 會話**（除非明確啟用，否則不會互相干擾）。

這讓**多人**可以共用一個 Gateway 伺服器，同時保持他們的 AI「大腦」和資料隔離。

## 一個 WhatsApp 號碼，多人（私訊分流）

您可以在**一個 WhatsApp 帳號**下，將**不同的 WhatsApp 私訊**路由到不同的代理。使用 `peer.kind: "direct"` 根據發送者 E.164（例如 `+15551234567`）進行匹配。回覆仍然來自同一個 WhatsApp 號碼（沒有每個代理的發送者身分）。

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

註記：

- 私訊存取控制是**每個 WhatsApp 帳號全域**的（配對/允許清單），而不是每個代理。
- 對於共用群組，將群組綁定到一個代理或使用 [廣播群組](/en/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理）

綁定是**確定性**的，且**最特定者優先**：

1. `peer` 匹配（精確的私訊/群組/頻道 ID）
2. `parentPeer` 匹配（執行緒繼承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. `accountId` 針對頻道的匹配
7. 頻道層級匹配（`accountId: "*"`）
8. 回退到預設代理（`agents.list[].default`，否則為清單中的第一個條目，預設值：`main`）

如果同一層級有多個綁定匹配，則設定檔順序中的第一個優先。
如果綁定設定了多個匹配欄位（例如 `peer` + `guildId`），則所有指定的欄位都是必需的（`AND` 語意）。

重要的帳號範圍細節：

- 省略 `accountId` 的綁定僅匹配預設帳號。
- 使用 `accountId: "*"` 作為所有帳號的頻道範圍回退。
- 如果您後續為同一個代理新增相同的綁定並指定明確的帳戶 ID，OpenClaw 會將現有的僅限通道的綁定升級為帳戶範圍的綁定，而不是重複建立。

## 多個帳戶 / 電話號碼

支援**多個帳戶**的通道（例如 WhatsApp）使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理，因此單一伺服器可以託管多個電話號碼，而不會混淆會話。

如果您希望在省略 `accountId` 時設定通道範圍的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。如果未設定，OpenClaw 會回退到 `default`（如果存在），否則回退到第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `bluebubbles`、`zalo`、`zalouser`、`nostr`、`feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每代理驗證、每代理會話儲存）。
- `accountId`：一個通道帳戶實例（例如 WhatsApp 帳戶 `"personal"` 與 `"biz"`）。
- `binding`：透過 `(channel, accountId, peer)` 和選用的伺服器/團隊 ID 將訊息路由到 `agentId`。
- 直接聊天會折疊至 `agent:<agentId>:<mainKey>`（每代理的「主」通道；`session.mainKey`）。

## 平台範例

### 每個代理的 Discord 機器人

每個 Discord 機器人帳戶都對應到唯一的 `accountId`。將每個帳戶綁定到一個代理，並為每個機器人維護允許清單。

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

- 邀請每個機器人加入伺服器並啟用「訊息內容意圖」。
- Tokens 位於 `channels.discord.accounts.<id>.token` 中（預設帳號可以使用 `DISCORD_BOT_TOKEN`）。

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

- 使用 BotFather 為每個 Agent 建立一個 Bot，並複製每個 token。
- Tokens 位於 `channels.telegram.accounts.<id>.botToken` 中（預設帳號可以使用 `TELEGRAM_BOT_TOKEN`）。

### 每個 Agent 的 WhatsApp 號碼

在啟動 gateway 之前先連結每個帳號：

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

## 範例：WhatsApp 每日閒聊 + Telegram 深度工作

依頻道分流：將 WhatsApp 路由至快速的日常 Agent，將 Telegram 路由至 Opus Agent。

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

- 如果您有一個頻道的多個帳號，請在綁定中加入 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 若要將單一 DM/群組路由至 Opus，同時讓其餘部分保持在 chat，請為該 peer 新增 `match.peer` 綁定；peer 比對永遠勝過頻道範圍的規則。

## 範例：相同頻道，其中一個 peer 導向 Opus

讓 WhatsApp 保持在快速 Agent，但將其中一個 DM 路由至 Opus：

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

Peer 綁定永遠優先，因此請將它們放在頻道範圍規則之上。

## 綁定至 WhatsApp 群組的家庭 Agent

將專屬的家庭 Agent 綁定到單一 WhatsApp 群組，並啟用提及過濾 (mention gating)
以及更嚴格的工具政策：

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

- 工具允許/拒絕清單針對的是 **工具**，而非技能。如果某個技能需要執行
  二進位檔，請確保允許 `exec` 且該二進位檔存在於 sandbox 中。
- 若要進行更嚴格的過濾，請設定 `agents.list[].groupChat.mentionPatterns` 並保持
  頻道的群組允許清單啟用。

## 個別 Agent 的 Sandbox 與工具設定

每個 Agent 都可以有自己的 sandbox 和工具限制：

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
當解析的範圍是 `"shared"` 時，會忽略個別 Agent 的 `sandbox.docker.*` 覆蓋設定。

**優點：**

- **安全隔離**：限制不受信任 Agent 的工具
- **資源控制**：將特定 Agent 置於 sandbox 中，同時讓其他 Agent 留在主機上
- **彈性政策**：每個 Agent 擁有不同的權限

注意：`tools.elevated` 是**全局的**且基於發送者；它無法針對每個代理進行配置。
如果您需要針對每個代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。
針對群組目標，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @mentions 能乾淨地對應到預期的代理。

請參閱 [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) 以取得詳細範例。
