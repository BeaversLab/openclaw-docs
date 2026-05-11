---
summary: "跨表面的群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
sidebarTitle: "群組"
---

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初學者介紹 (2 分鐘)

OpenClaw 寄住在您自己的訊息帳號上。並沒有額外的 WhatsApp 機器人使用者。如果 **您** 在某個群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 回覆需要被提及，除非您明確停用提及閘門。

翻譯：允許清單上的傳送者可以透過提及 OpenClaw 來觸發它。

<Note>
**重點摘要**

- **DM 存取** 權由 `*.allowFrom` 控制。
- **群組存取** 權由 `*.groupPolicy` + 允許清單 (`*.groups`，`*.groupAllowFrom`) 控制。
- **回覆觸發** 由提及閘控控制 (`requireMention`，`/activation`)。
  </Note>

快速流程 (群組訊息會發生什麼事)：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 上下文可見性與允許清單

群組安全性涉及兩個不同的控制項：

- **觸發授權**：誰可以觸發代理程式 (`groupPolicy`，`groups`，`groupAllowFrom`，特定頻道的允許清單)。
- **上下文可見性**：將哪些補充上下文注入到模型中（回覆文字、引言、執行緒歷史記錄、轉發的元資料）。

根據預設，OpenClaw 優先考慮正常的聊天行為，並主要按接收到的狀態保留上下文。這表示允許清單主要決定誰可以觸發動作，而不是對每個引言或歷史片段設定通用的編輯界線。

<AccordionGroup>
  <Accordion title="目前行為取決於特定頻道">
    - 某些頻道已經在特定路徑中針對額外上下文套用基於發送者的篩選 (例如 Slack 執行緒植入、Matrix 回覆/執行緒查詢)。
    - 其他頻道仍然將引言/回覆/轉發上下文照收到的樣子傳遞。
  </Accordion>
  <Accordion title="加固方向 (計劃中)">
    - `contextVisibility: "all"` (預設) 保持目前照收到的行為。
    - `contextVisibility: "allowlist"` 將額外上下文篩選為僅限允許清單中的發送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引言/回覆例外。

    在此加固模型於各頻道間一致實作之前，請預期各介面會有差異。

  </Accordion>
</AccordionGroup>

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                           | 設定方式                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| 允許所有群組但僅在 @提及時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆               | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                   | `groups: { "<group-id>": { ... } }` (無 `"*"` 金鑰)        |
| 只有您可以在群組中觸發         | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，以便每個主題都有自己的會話。
- 直接訊息使用主會話（若已配置，則為每位發送者使用一個會話）。
- 群組會話會跳過心跳檢測。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這運作得很好。

原因：在單一代理程式模式下，DM 通常會進入 **主要** 會話金鑰（`agent:main:main`），而群組總是使用 **非主要** 會話金鑰（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 啟用沙盒，這些群組會話將在已配置的沙盒後端中運行，而您的主要 DM 會話則留在主機上。如果您不選擇後端，Docker 是預設後端。

這為您提供了一個代理程式「大腦」（共享工作區 + 記憶體），但具有兩種執行姿態：

- **DM**：完整工具（主機）
- **群組**：沙盒 + 受限工具

<Note>如果您需要真正分開的工作區/角色（「個人」和「公開」絕不能混合），請使用第二個代理程式 + 綁定。請參閱 [多代理程式路由](/zh-Hant/concepts/multi-agent)。</Note>

<Tabs>
  <Tab title="DMs on host, groups sandboxed">
    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main", // groups/channels are non-main -> sandboxed
            scope: "session", // strongest isolation (one container per group/channel)
            workspaceAccess: "none",
          },
        },
      },
      tools: {
        sandbox: {
          tools: {
            // If allow is non-empty, everything else is blocked (deny still wins).
            allow: ["group:messaging", "group:sessions"],
            deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Groups see only an allowlisted folder">
    想要「群組只能看到資料夾 X」而不是「沒有主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙盒中：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",
            scope: "session",
            workspaceAccess: "none",
            docker: {
              binds: [
                // hostPath:containerPath:mode
                "/home/user/FriendsShared:/data:ro",
              ],
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

相關：

- 配置金鑰和預設值：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- 調試工具被阻擋的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤會在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道使用的；群組聊天使用 `g-<slug>` (小寫，空格 -> `-`，保留 `#@+._-`)。

## 群組政策

控制每個頻道如何處理群組/房間訊息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // numeric Telegram user id (wizard can resolve @username)
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
      },
    },
  },
}
```

| 政策          | 行為                                 |
| ------------- | ------------------------------------ |
| `"open"`      | 群組繞過允許清單；提及限制仍然適用。 |
| `"disabled"`  | 完全阻擋所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

<AccordionGroup>
  <Accordion title="各頻道說明">
    - `groupPolicy` 與提及限制 (需要 @mentions) 分開。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom` (後備：明確的 `allowFrom`)。
    - DM 配對核准 (`*-allowFrom` store 項目) 僅適用於 DM 存取；群組發送者授權對群組允許清單保持明確。
    - Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允許清單使用 `channels.slack.channels`。
    - Matrix：允許清單使用 `channels.matrix.groups`。建議使用房間 ID 或別名；已加入房間名稱查詢僅為盡力而為，未解析的名稱在執行時會被忽略。使用 `channels.matrix.groupAllowFrom` 限制發送者；每個房間的 `users` 允許清單也受支援。
    - 群組 DM 受單獨控制 (`channels.discord.dm.*`, `channels.slack.dm.*`)。
    - Telegram 允許清單可以比對使用者 ID (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) 或使用者名稱 (`"@alice"` 或 `"alice"`)；前綴不區分大小寫。
    - 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，則會阻擋群組訊息。
    - 執行時安全性：當提供者區塊完全缺失 (`channels.<provider>` 缺失) 時，群組政策會回退到失敗關閉模式 (通常是 `allowlist`)，而不是繼承 `channels.defaults.groupPolicy`。
  </Accordion>
</AccordionGroup>

快速心智模型（群組訊息的評估順序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="群組允許清單">群組允許清單 (`*.groups`, `*.groupAllowFrom`, 特定頻道允許清單)。</Step>
  <Step title="提及閘門">提及閘門 (`requireMention`, `/activation`)。</Step>
</Steps>

## 提及閘門（預設）

除非針對特定群組另有設定，否則群組訊息需要提及才能觸發。預設值依照各子系統位於 `*.groups."*"` 之下。

當頻道支援回覆元資料時，回覆機器人訊息視為隱含提及。在提供引用元資料的頻道上，引用機器人訊息也可能視為隱含提及。目前內建的案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="提及閘門備註">
    - `mentionPatterns` 是不區分大小寫的安全正規表達式模式；無效的模式和不安全的巢狀重複形式會被忽略。
    - 提供明確提及的介面仍然會通過；模式僅作為後備方案。
    - 依代理程式覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理程式共用一個群組時很有用）。
    - 僅當能夠進行提及偵測時才會強制執行提及閘門（已設定原生提及或 `mentionPatterns`）。
    - 允許無聲回覆的群組會將純空白或僅包含推理的模型輪次視為無聲，等同於 `NO_REPLY`。直接對話仍將空白回覆視為失敗的代理程式輪次。
    - Discord 的預設值位於 `channels.discord.guilds."*"`（可依照伺服器/頻道覆寫）。
    - 群組歷史紀錄語境在各頻道間統一包裝，並且是 **待處理（pending-only）**（因提及閘門而跳過的訊息）；請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。
  </Accordion>
</AccordionGroup>

## 群組/頻道工具限制（選用）

某些頻道設定支援限制**特定群組/房間/頻道內**可用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內針對發送者的覆寫設定。使用明確的鍵前綴：`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。舊版無前綴的鍵仍被接受，並僅作為 `id:` 進行比對。

解析順序（越具體者優先）：

<Steps>
  <Step title="Group toolsBySender">群組/頻道 `toolsBySender` 比對。</Step>
  <Step title="Group tools">群組/頻道 `tools`。</Step>
  <Step title="Default toolsBySender">預設 (`"*"`) `toolsBySender` 比對。</Step>
  <Step title="Default tools">預設 (`"*"`) `tools`。</Step>
</Steps>

範例 (Telegram)：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

<Note>群組/頻道工具限制會與全域/代理工具策略一併套用（拒絕仍優先）。部分頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會作為群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設提及行為。

<Warning>常見混淆：DM 配對批准與群組授權並不相同。對於支援 DM 配對的頻道，配對存儲僅解鎖 DM。群組指令仍需來自配置允許清單（如 `groupAllowFrom`）或該頻道記錄的配置後備方案的明確群組發送者授權。</Warning>

常見意圖（複製/貼上）：

<Tabs>
  <Tab title="停用所有群組回覆">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="僅允許特定群組 (WhatsApp)">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: {
            "123@g.us": { requireMention: true },
            "456@g.us": { requireMention: false },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="允許所有群組但需要提及">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="僅限擁有者觸發 (WhatsApp)">
    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 啟用（僅限擁有者）

群組擁有者可以切換各群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。請將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組輸入的 Payload 會設定：

- `ChatType=group`
- `GroupSubject` （若已知）
- `GroupMembers` （若已知）
- `WasMentioned` （提及閘門結果）
- Telegram 論壇主題也包含 `MessageThreadId` 和 `IsForum`。

特定頻道說明：

- BlueBubbles 可以選擇在填充 `GroupMembers` 之前，從本機聯絡人資料庫豐富未命名的 macOS 群組參與者。此功能預設關閉，且僅在通過正常群組閘門後執行。

Agent 系統提示詞在新的群組會話的第一輪會包含群組介紹。它會提醒模型要像人類一樣回應、避免 Markdown 表格、盡量減少空行並遵循正常的聊天間距，並避免輸入字面的 `\n` 序列。來自頻道的群組名稱和參與者標籤會以圍欄的不受信任元數據呈現，而非內聯系統指令。

## iMessage 特定細節

- 在路由或設定允許清單時，請優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆一律會傳回同一個 `chat_id`。

## WhatsApp 系統提示詞

請參閱 [WhatsApp](/zh-Hant/channels/whatsapp#system-prompts) 以了解正式的 WhatsApp 系統提示詞規則，包括群組和直接提示詞解析、萬用字元行為以及帳號覆寫語意。

## WhatsApp 特定細節

請參閱 [群組訊息](/zh-Hant/channels/group-messages) 以了解僅限 WhatsApp 的行為（歷史記錄插入、提及處理細節）。

## 相關連結

- [廣播群組](/zh-Hant/channels/broadcast-groups)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [群組訊息](/zh-Hant/channels/group-messages)
- [配對](/zh-Hant/channels/pairing)
