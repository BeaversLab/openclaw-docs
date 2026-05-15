---
summary: "多代理路由：隔離的代理、頻道帳號和綁定"
title: "多代理路由"
sidebarTitle: "多代理路由"
read_when: "您希望在一個閘道程序中擁有多個隔離的代理（工作區 + 身份驗證）。"
status: active
---

在單一執行的 Gateway 中執行多個*隔離的*代理——每個代理都有自己的工作區、狀態目錄 (`agentDir`) 和對話歷史——加上多個頻道帳號（例如兩個 WhatsApp）。傳入訊息透過綁定路由到正確的代理。

此處的**代理**是指完整的個人範圍：工作區檔案、身份驗證設定檔、模型註冊表和會話存儲。`agentDir` 是磁碟上的狀態目錄，用於在 `~/.openclaw/agents/<agentId>/` 保存此代理專屬的配置。**綁定** 則是將頻道帳號（例如 Slack 工作區或 WhatsApp 號碼）對應到其中一個代理。

## 什麼是「一個代理」？

一個 **代理** 是一個具有完整範圍的「大腦」，擁有自己的：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、個人規則）。
- **狀態目錄** (`agentDir`)，用於存放身份驗證設定檔、模型註冊表和代理專屬配置。
- **會話存儲**（聊天歷史 + 路由狀態），位於 `~/.openclaw/agents/<agentId>/sessions` 之下。

身份驗證設定檔是**每個代理獨立**的。每個代理從自己的位置讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
`sessions_history` 在這裡也是更安全的跨會話回溯路徑：它返回有界的、經過清理的視圖，而不是原始的記錄傾倒。助手回溯會去除思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）、降級的工具呼叫腳手架、洩漏的 ASCII/全形模型控制權杖，以及在編輯/截斷之前格式錯誤的 MiniMax 工具呼叫 XML。
</Note>

<Warning>切勿在不同的 agent 之間重複使用 `agentDir`（這會導致驗證/會話衝突）。當 agent 沒有本機設定檔時，可以讀取預設/主要 agent 的驗證設定檔，但 OpenClaw 不會將 OAuth 重新整理權杖複製到次要 agent 的儲存空間中。如果您想要一個獨立的 OAuth 帳號，請從該 agent 登入；如果您手動複製憑證，請僅複製可移植的靜態 `api_key` 或 `token` 設定檔。</Warning>

Skills 會從每個 agent 的工作區以及諸如 `~/.openclaw/skills` 的共享根目錄載入，然後在配置時根據有效的 agent skill 允許清單進行篩選。請使用 `agents.defaults.skills` 作為共享基準，並使用 `agents.list[].skills` 進行各個 agent 的替換。請參閱 [Skills: per-agent vs shared](/zh-Hant/tools/skills#per-agent-vs-shared-skills) 和 [Skills: agent skill allowlists](/zh-Hant/tools/skills#agent-skill-allowlists)。

Gateway 可以託管 **一個 agent**（預設）或並行託管 **多個 agent**。

<Note>**工作區備註：**每個 agent 的工作區都是 **預設的 cwd**，而不是一個嚴格的沙盒。相對路徑會在工作區內解析，但絕對路徑可以到達其他主機位置，除非啟用了沙盒機制。請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。</Note>

## 路徑（快速地圖）

- 設定檔：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作區：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- Agent 目錄：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 會話：`~/.openclaw/agents/<agentId>/sessions`

### 單一 Agent 模式（預設）

如果您不進行任何設定，OpenClaw 將運行單一 agent：

- `agentId` 預設為 **`main`**。
- 會話以 `agent:main:<mainKey>` 作為鍵值。
- 工作區預設為 `~/.openclaw/workspace`（或當設定了 `OPENCLAW_PROFILE` 時為 `~/.openclaw/workspace-<profile>`）。
- 狀態預設為 `~/.openclaw/agents/main/agent`。

## Agent 輔助工具

使用 agent 精靈來新增一個新的獨立 agent：

```bash
openclaw agents add work
```

然後新增 `bindings`（或讓精靈為您新增）以路由傳入訊息。

使用以下方式驗證：

```bash
openclaw agents list --bindings
```

## 快速入門

<Steps>
  <Step title="建立每個 Agent 的工作區">
    使用精靈或手動建立工作區：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每個 Agent 都會獲得自己的工作區，包含 `SOUL.md`、`AGENTS.md` 和選用的 `USER.md`，以及專屬的 `agentDir` 和位於 `~/.openclaw/agents/<agentId>` 下的會話儲存區。

  </Step>
  <Step title="建立頻道帳號">
    在您偏好的頻道上為每個 Agent 建立一個帳號：

    - Discord：每個 Agent 一個機器人，啟用訊息內容意圖，並複製每個權杖。
    - Telegram：透過 BotFather 為每個 Agent 建立一個機器人，並複製每個權杖。
    - WhatsApp：將每個電話號碼連結至各個帳號。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    請參閱頻道指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>
  <Step title="新增 Agent、帳號和綁定">
    在 `agents.list` 下新增 Agent，在 `channels.<channel>.accounts` 下新增頻道帳號，並使用 `bindings` 將它們連接起來（範例見下文）。
  </Step>
  <Step title="重新啟動並驗證">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多個 Agent = 多個人，多種個性

使用 **多個 Agent**，每個 `agentId` 都會變成一個**完全獨立的個性**：

- **不同的電話號碼/帳號**（針對每個頻道 `accountId`）。
- **不同的個性**（每個 Agent 的工作區檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的驗證 + 會話**（除非明確啟用，否則不會有交叉互動）。

這讓**多個人**可以共用一個 Gateway 伺服器，同時保持其 AI「大腦」和資料的隔離。

## 跨 Agent QMD 記憶體搜尋

如果一個 Agent 應該搜尋另一個 Agent 的 QMD 會話紀錄，請在 `agents.list[].memorySearch.qmd.extraCollections` 下新增額外的集合。僅當每個 Agent 都應繼承相同的共用會話紀錄集合時，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

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

額外的集合路徑可以在 Agent 之間共用，但當路徑位於 Agent 工作區之外時，集合名稱會保持明確。工作區內的路徑仍屬於 Agent 範圍，因此每個 Agent 都會保留自己的會話紀錄搜尋集。

## 一個 WhatsApp 號碼，多個人 (DM 分割)

您可以在維持**同一個 WhatsApp 帳號**的同時，將**不同的 WhatsApp 私訊** 路由到不同的 Agent。使用 `peer.kind: "direct"` 根據發送者 E.164 (例如 `+15551234567`) 進行比對。回覆仍來自同一個 WhatsApp 號碼 (沒有每個 Agent 的發送者身分)。

<Note>直接聊天會收斂為 Agent 的**主要會話金鑰**，因此真正的隔離需要**每個人一個 Agent**。</Note>

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

- DM 存取控制是**每個 WhatsApp 帳號的全域設定** (配對/允許清單)，而非每個 Agent 獨立。
- 對於共用群組，請將群組綁定到一個 Agent，或使用 [廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則 (訊息如何選擇 Agent)

綁定是**確定性** 的，且**最特定者優先**：

<Steps>
  <Step title="peer match">精確的 DM/群組/頻道 ID。</Step>
  <Step title="parentPeer match">執行緒繼承。</Step>
  <Step title="guildId + roles">Discord 角色路由。</Step>
  <Step title="guildId">Discord。</Step>
  <Step title="teamId">Slack。</Step>
  <Step title="accountId match for a channel">每個帳號的後備。</Step>
  <Step title="Channel-level match">`accountId: "*"`。</Step>
  <Step title="Default agent">後備至 `agents.list[].default`，否則為清單第一個項目，預設為：`main`。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Tie-breaking and AND semantics">
    - 如果在相同層級中有多個綁定匹配，則設定檔順序中的第一個優先。
    - 如果綁定設定了多個匹配欄位（例如 `peer` + `guildId`），則所有指定的欄位都是必須的（`AND` 語義）。

  </Accordion>
  <Accordion title="Account-scope detail">
    - 省略 `accountId` 的綁定僅匹配預設帳戶。
    - 使用 `accountId: "*"` 作為所有帳戶的通道級別回退。
    - 如果您後續為同一個代理添加具有明確帳戶 ID 的相同綁定，OpenClaw 會將現有的僅通道綁定升級為帳戶範圍綁定，而不是重複建立它。

  </Accordion>
</AccordionGroup>

## 多個帳戶 / 電話號碼

支援 **多個帳戶**（例如 WhatsApp）的通道使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理，因此一台伺服器可以託管多個電話號碼而不會混合會話。

如果您希望在省略 `accountId` 時有一個通道級別的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。當未設定時，如果存在 `default`，OpenClaw 會回退到它，否則回退到第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `zalo`, `zalouser`, `nostr`, `feishu`

## 概念

- `agentId`：一個「大腦」（工作區、每個代理的身份驗證、每個代理的會話儲存）。
- `accountId`：一個頻道帳號實例（例如 WhatsApp 帳號 `"personal"` vs `"biz"`）。
- `binding`：根據 `(channel, accountId, peer)` 以及可選的公會/團隊 ID，將傳入訊息路由到 `agentId`。
- 直接聊天會合併為 `agent:<agentId>:<mainKey>`（每個代理的「主要」；`session.mainKey`）。

## 平台範例

<AccordionGroup>
  <Accordion title="每個代理的 Discord 機器人">
    每個 Discord 機器人帳號都對應到一個唯一的 `accountId`。將每個帳號綁定到一個代理，並為每個機器人保留允許列表。

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

    - 邀請每個機器人加入公會並啟用訊息內容意圖。
    - Token 存在 `channels.discord.accounts.<id>.token` 中（預設帳號可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每個代理的 Telegram 機器人">
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

    - 使用 BotFather 為每個代理建立一個機器人並複製每個 Token。
    - Token 存在 `channels.telegram.accounts.<id>.botToken` 中（預設帳號可以使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每個代理的 WhatsApp 號碼">
    在啟動 gateway 之前先連結每個帳號：

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

  </Accordion>
</AccordionGroup>

## 常見模式

<Tabs>
  <Tab title="WhatsApp 日常 + Telegram 深度工作">
    按頻道拆分：將 WhatsApp 路由到一個快速的日常代理，將 Telegram 路由到 Opus 代理。

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

    註記：

    - 如果您在一個頻道有多個帳號，請在綁定中新增 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 若要將單一 DM/群組路由到 Opus，同時將其餘保留在 chat，請為該對等端新增 `match.peer` 綁定；對等端匹配一律優先於全頻道規則。

  </Tab>
  <Tab title="Same channel, one peer to Opus">
    將 WhatsApp 保留在快速代理上，但將一個私訊路由到 Opus：

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

    對等綁定總是優先，因此請將它們保持在頻道範圍規則之上。

  </Tab>
  <Tab title="Family agent bound to a WhatsApp group">
    將專用的家庭代理綁定到單一 WhatsApp 群組，並啟用提及門控和更嚴格的工具策略：

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

    註記：

    - 工具允許/拒絕清單是 **工具**，而非技能。如果技能需要執行二進位檔案，請確保允許 `exec` 且該二進位檔案存在於沙箱中。
    - 若要進行更嚴格的門控，請設定 `agents.list[].groupChat.mentionPatterns` 並為該頻道保持啟用群組允許清單。

  </Tab>
</Tabs>

## 各代理的沙箱與工具配置

每個代理都可以擁有自己的沙箱與工具限制：

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

<Note>`setupCommand` 位於 `sandbox.docker` 之下，並在容器建立時執行一次。當解析範圍為 `"shared"` 時，將忽略各代理的 `sandbox.docker.*` 覆寫。</Note>

**優勢：**

- **安全隔離**：限制不受信任代理的工具。
- **資源控制**：將特定代理放入沙箱，同時讓其他代理留在主機上。
- **靈活策略**：每個代理具有不同的權限。

<Note>`tools.elevated` 是 **全域性** 且基於發送者的；無法針對每個代理進行配置。如果您需要各代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。針對群組目標，請使用 `agents.list[].groupChat.mentionPatterns`，以便 @提及 能乾淨地對應到預期的代理。</Note>

請參閱 [多代理沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) 以取得詳細範例。

## 相關

- [ACP 代理](/zh-Hant/tools/acp-agents) — 執行外部編碼線束
- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息如何路由到代理
- [在線狀態](/zh-Hant/concepts/presence) — 代理在線狀態與可用性
- [會話](/zh-Hant/concepts/session) — 會話隔離與路由
- [子代理](/zh-Hant/tools/subagents) — 產生背景代理執行
