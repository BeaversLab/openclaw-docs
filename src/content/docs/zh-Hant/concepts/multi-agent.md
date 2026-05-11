---
summary: "多代理路由：隔離的代理、頻道帳戶和綁定"
title: "多代理路由"
sidebarTitle: "多代理路由"
read_when: "您想要在一個 gateway 進程中擁有多個隔離的代理（工作區 + 身份驗證）。"
status: active
---

在一個運行的 Gateway 中執行多個*隔離的*代理——每個代理都有自己的工作區、狀態目錄 (`agentDir`) 和 session 歷史記錄——加上多個頻道帳戶（例如兩個 WhatsApp）。透過綁定將傳入訊息路由到正確的代理。

這裡的**代理** 是完整的 per-persona 範圍：工作區檔案、身份驗證設定檔、模型註冊表和 session 儲存。`agentDir` 是儲存此每代理配置的磁碟狀態目錄，位於 `~/.openclaw/agents/<agentId>/`。**綁定** 將頻道帳戶（例如 Slack 工作區或 WhatsApp 號碼）對應到其中一個代理。

## 什麼是「一個代理」？

一個**代理** 是一個具有完整範圍的大腦，擁有自己的：

- **工作區**（檔案、AGENTS.md/SOUL.md/USER.md、本地筆記、persona 規則）。
- **狀態目錄** (`agentDir`)，用於身份驗證設定檔、模型註冊表和每代理配置。
- **Session 儲存**（聊天記錄 + 路由狀態），位於 `~/.openclaw/agents/<agentId>/sessions` 下。

身份驗證設定檔是**每代理的**。每個代理從自己的設定讀取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
`sessions_history` 也是這裡更安全的跨 session 回憶路徑：它返回有界的、經過清理的視圖，而不是原始記錄傾倒。Assistant 回憶會在刪減/截斷之前去除思考標籤、`<relevant-memories>` 腳手架、純文字工具呼叫 XML 載荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和截斷的工具呼叫區塊）、降級的工具呼叫腳手架、洩漏的 ASCII/全形模型控制令牌，以及格式錯誤的 MiniMax 工具呼叫 XML。
</Note>

<Warning>主要代理憑證**不會**自動共用。切勿跨代理重複使用 `agentDir`（這會導致驗證/會衝突）。如果您想共用憑證，請將 `auth-profiles.json` 複製到另一個代理的 `agentDir` 中。</Warning>

技能是從每個代理的工作區加上共享根目錄（例如 `~/.openclaw/skills`）載入的，然後在配置時根據有效的代理技能允許清單進行過濾。使用 `agents.defaults.skills` 作為共享基準，並使用 `agents.list[].skills` 進行每個代理的替換。請參閱[技能：每個代理與共享](/zh-Hant/tools/skills#per-agent-vs-shared-skills)和[技能：代理技能允許清單](/zh-Hant/tools/skills#agent-skill-allowlists)。

Gateway 可以承載**單個代理**（預設）或**多個代理**並行運作。

<Note>**工作區說明：**每個代理的工作區是**預設 cwd**，而不是嚴格的沙箱。相對路徑在工作區內解析，但絕對路徑可以存取其他主機位置，除非啟用了沙箱機制。請參閱[沙箱機制](/zh-Hant/gateway/sandboxing)。</Note>

## 路徑（快速地圖）

- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 狀態目錄：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作區：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 代理目錄：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 會話：`~/.openclaw/agents/<agentId>/sessions`

### 單代理模式（預設）

如果您不進行任何設定，OpenClaw 將運行單個代理：

- `agentId` 預設為 **`main`**。
- 會話的鍵值為 `agent:main:<mainKey>`。
- 工作區預設為 `~/.openclaw/workspace`（或當設定 `OPENCLAW_PROFILE` 時為 `~/.openclaw/workspace-<profile>`）。
- 狀態預設為 `~/.openclaw/agents/main/agent`。

## 代理助手

使用代理精靈新增一個新的隔離代理：

```bash
openclaw agents add work
```

然後新增 `bindings`（或讓精靈為您新增）以路由傳入訊息。

使用以下命令驗證：

```bash
openclaw agents list --bindings
```

## 快速入門

<Steps>
  <Step title="Create each agent workspace">
    使用精靈或手動建立工作區：

    ```bash
    openclaw agents add coding
    openclaw agents add social
    ```

    每個代理程式都會獲得自己的工作區，包含 `SOUL.md`、`AGENTS.md` 和可選的 `USER.md`，以及位於 `~/.openclaw/agents/<agentId>` 下的專用 `agentDir` 和會話存儲。

  </Step>
  <Step title="Create channel accounts">
    在您偏好的頻道上為每個代理程式建立一個帳號：

    - Discord：每個代理程式一個機器人，啟用訊息內容意圖，複製每個權杖。
    - Telegram：透過 BotFather 為每個代理程式建立一個機器人，複製每個權杖。
    - WhatsApp：每個帳號連結一個電話號碼。

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    參閱頻道指南：[Discord](/zh-Hant/channels/discord)、[Telegram](/zh-Hant/channels/telegram)、[WhatsApp](/zh-Hant/channels/whatsapp)。

  </Step>
  <Step title="Add agents, accounts, and bindings">
    在 `agents.list` 下加入代理程式，在 `channels.<channel>.accounts` 下加入頻道帳號，並使用 `bindings` 連接它們（範例見下文）。
  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw agents list --bindings
    openclaw channels status --probe
    ```
  </Step>
</Steps>

## 多個代理程式 = 多個人，多種個性

使用 **多個代理程式** 時，每個 `agentId` 都會變成一個 **完全隔離的角色**：

- **不同的電話號碼/帳號**（每個頻道 `accountId`）。
- **不同的個性**（每個代理程式的工作區檔案，例如 `AGENTS.md` 和 `SOUL.md`）。
- **分開的驗證 + 會話**（除非明確啟用，否則不會互通）。

這讓 **多個人** 可以共用一個 Gateway 伺服器，同時保持各自的 AI「大腦」和資料隔離。

## 跨代理程式 QMD 記憶體搜尋

如果一個代理程式應該搜尋另一個代理程式的 QMD 會話紀錄，請在 `agents.list[].memorySearch.qmd.extraCollections` 下加入額外的集合。僅當每個代理程式都應繼承相同的共用會話紀錄集合時，才使用 `agents.defaults.memorySearch.qmd.extraCollections`。

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

額外的集合路徑可以在代理之間共享，但當路徑位於代理工作區之外時，集合名稱保持顯式。工作區內的路徑仍屬於代理範圍，因此每個代理都保留自己的對話搜尋集。

## 一個 WhatsApp 號碼，多個人（DM 分割）

您可以在保持**一個 WhatsApp 帳戶**的同時，將**不同的 WhatsApp 私訊**路由到不同的代理。使用 `peer.kind: "direct"` 根據發送者 E.164（例如 `+15551234567`）進行匹配。回覆仍來自同一個 WhatsApp 號碼（沒有每個代理的發送者身分）。

<Note>直接對話會折疊到代理的**主會話金鑰**，因此真正的隔離需要**每個人一個代理**。</Note>

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

- 私訊存取控制是**每個 WhatsApp 帳戶的全域設定**（配對/允許清單），而非每個代理的設定。
- 對於共享群組，請將群組綁定到一個代理或使用[廣播群組](/zh-Hant/channels/broadcast-groups)。

## 路由規則（訊息如何選擇代理）

綁定是**確定性**的，並且**最特定者優先**：

<Steps>
  <Step title="peer match">精確的私訊/群組/頻道 ID。</Step>
  <Step title="parentPeer match">執行緒繼承。</Step>
  <Step title="guildId + roles">Discord 角色路由。</Step>
  <Step title="guildId">Discord。</Step>
  <Step title="teamId">Slack。</Step>
  <Step title="accountId match for a channel">每個帳戶的後備選項。</Step>
  <Step title="Channel-level match">`accountId: "*"`。</Step>
  <Step title="Default agent">後備至 `agents.list[].default`，否則為列表第一個條目，預設值為：`main`。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Tie-breaking and AND semantics">- 如果同一層級有多個綁定相符，則在設定順序中的第一個會優先勝出。 - 如果綁定設定了多個比對欄位（例如 `peer` + `guildId`），則需要所有指定的欄位都符合（`AND` 語義）。</Accordion>
  <Accordion title="Account-scope detail">- 省略 `accountId` 的綁定只會符合預設帳戶。 - 使用 `accountId: "*"` 作為跨所有帳戶的通道範圍備援方案。 - 如果您之後為同一個代理程式新增帶有明確帳戶 ID 的相同綁定，OpenClaw 會將現有的僅限通道綁定升級為帳戶範圍，而不是重複建立它。</Accordion>
</AccordionGroup>

## 多個帳戶 / 電話號碼

支援 **多個帳戶** 的通道（例如 WhatsApp）會使用 `accountId` 來識別每個登入。每個 `accountId` 都可以路由到不同的代理程式，因此一台伺服器可以託管多個電話號碼，而不會混淆會話。

如果您想要在省略 `accountId` 時擁有通道範圍的預設帳戶，請設定 `channels.<channel>.defaultAccount`（可選）。如果未設定，OpenClaw 會在存在時回退到 `default`，否則會回退到第一個設定的帳戶 ID（已排序）。

支援此模式的常見通道包括：

- `whatsapp`、 `telegram`、 `discord`、 `slack`、 `signal`、 `imessage`
- `irc`、 `line`、 `googlechat`、 `mattermost`、 `matrix`、 `nextcloud-talk`
- `bluebubbles`、 `zalo`、 `zalouser`、 `nostr`、 `feishu`

## 概念

- `agentId`：一個「大腦」（工作區、個別代理程式的驗證、個別代理程式的會話儲存）。
- `accountId`：一個通道帳號實例（例如 WhatsApp 帳號 `"personal"` vs `"biz"`）。
- `binding`：透過 `(channel, accountId, peer)` 以及可選的 guild/team ids 將傳入訊息路由至 `agentId`。
- 直接聊天會合併為 `agent:<agentId>:<mainKey>`（每個 Agent 的「main」；`session.mainKey`）。

## 平台範例

<AccordionGroup>
  <Accordion title="每個 Agent 的 Discord 機器人">
    每個 Discord 機器人帳號都對應到唯一的 `accountId`。將每個帳號綁定到一個 Agent，並為每個機器人維護允許清單。

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

    - 邀請每個機器人加入 guild 並啟用 Message Content Intent。
    - Token 存放在 `channels.discord.accounts.<id>.token`（預設帳號可以使用 `DISCORD_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每個 Agent 的 Telegram 機器人">
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

    - 使用 BotFather 為每個 Agent 建立一個機器人並複製每個 Token。
    - Token 存放在 `channels.telegram.accounts.<id>.botToken`（預設帳號可以使用 `TELEGRAM_BOT_TOKEN`）。

  </Accordion>
  <Accordion title="每個 Agent 的 WhatsApp 號碼">
    在啟動 gateway 之前連結每個帳號：

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
    依通道分流：將 WhatsApp 路由至一個快速的日常 Agent，將 Telegram 路由至一個 Opus Agent。

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

    - 如果您的一個通道有多個帳號，請在綁定中加入 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
    - 若要將單一 DM/群組路由至 Opus，同時將其餘保留在 chat，請為該對等方新增 `match.peer` 綁定；對等方比對一律優先於通道範圍規則。

  </Tab>
  <Tab title="Same channel, one peer to Opus">
    讓 WhatsApp 保持在快速代理上，但將某個私訊路由到 Opus：

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

    Peer 綁定優先級較高，因此請將其置於通道範圍規則之上。

  </Tab>
  <Tab title="Family agent bound to a WhatsApp group">
    將專用的家庭代理綁定到單一 WhatsApp 群組，並啟用提及門控和更嚴格的工具政策：

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

    - 工具允許/拒絕清單指的是 **工具**，而非技能。如果某個技能需要執行二進位檔，請確保允許 `exec` 且該二進位檔存在於沙箱中。
    - 若要實施更嚴格的門控，請設定 `agents.list[].groupChat.mentionPatterns` 並為該通道啟用群組允許清單。

  </Tab>
</Tabs>

## 個別代理沙箱與工具配置

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

<Note>`setupCommand` 位於 `sandbox.docker` 之下，並在建立容器時執行一次。當解析的範圍為 `"shared"` 時，會忽略每個代理的 `sandbox.docker.*` 覆蓋設定。</Note>

**優點：**

- **安全隔離**：限制不受信任代理的工具。
- **資源控制**：將特定代理放入沙箱，同時讓其他代理在主機上運行。
- **彈性政策**：每個代理具備不同的權限。

<Note>`tools.elevated` 是 **全域性** 且基於發送者的；無法針對每個代理進行配置。如果您需要每個代理的邊界，請使用 `agents.list[].tools` 來拒絕 `exec`。若要針對群組，請使用 `agents.list[].groupChat.mentionPatterns`，這樣 @提及就能乾淨地對應到預定的代理。</Note>

詳細範例請參閱 [Multi-agent sandbox and tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

## 相關內容

- [ACP agents](/zh-Hant/tools/acp-agents) — 執行外部編碋線束
- [Channel routing](/zh-Hant/channels/channel-routing) — 訊息如何路由至代理
- [Presence](/zh-Hant/concepts/presence) — 代理的狀態與可用性
- [Session](/zh-Hant/concepts/session) — 會話隔離與路由
- [Sub-agents](/zh-Hant/tools/subagents) — 產生背景代理執行
