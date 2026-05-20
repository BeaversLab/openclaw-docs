---
summary: "各平臺群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
sidebarTitle: "群組"
---

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

對於應提供安靜語境，除非代理程式明確發送可見訊息的常駐房間，請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

## 初學者介紹（2 分鐘）

OpenClaw「寄居」在您自己的訊息帳號上。沒有單獨的 WhatsApp 機器人使用者。如果**您**在某個群組中，OpenClaw 就能看到該群組並在那裡回應。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 除非您明確停用提及閘控，否則回覆需要提及。
- 群組/頻道中的可見回覆預設使用 `message` 工具。

翻譯：允許清單上的發送者可以透過提及來觸發 OpenClaw。

<Note>
**TL;DR**

- **DM 存取權**由 `*.allowFrom` 控制。
- **群組存取權**由 `*.groupPolicy` + 允許清單（`*.groups`、`*.groupAllowFrom`）控制。
- **回覆觸發**由提及閘控（`requireMention`、`/activation`）控制。

</Note>

快速流程（群組訊息會發生什麼事）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## 可見回覆

對於一般的群組/頻道請求，OpenClaw 預設為 `messages.groupChat.visibleReplies: "automatic"`。最終的助手文字會透過舊版的可見回覆路徑發佈，除非您將房間設定為僅使用訊息工具輸出。

當共享房間應讓代理程式透過呼叫 `message(action=send)` 來決定何時發言時，請使用 `messages.groupChat.visibleReplies: "message_tool"`。這對於由最新一代、工具可靠的模型（如 GPT 5.5）支援的群組房間最有效。如果模型未使用該工具並傳回實質的最終文字，OpenClaw 會將該最終文字保持私密，而不是發佈到房間中。

如果在現行工具政策下無法使用訊息工具，OpenClaw 將會
回退到自動可見回覆，而不是靜默抑制回應。
`openclaw doctor` 會針對此不符之處發出警告。

對於直接聊天和任何其他來源事件，請使用 `messages.visibleReplies: "message_tool"` 在全域套用相同的僅限工具可見回覆行為。Harness 也可以選擇將此作為其未設定的預設值；Codex harness 對 Codex 模式的直接聊天即是如此。`messages.groupChat.visibleReplies` 仍然是針對群組/頻道房間的更具體的覆寫設定。

這取代了舊的模式，即強迫模型在大多數潛伏模式輪次中回答 `NO_REPLY`。在僅限工具模式中，不做任何可見的事情僅表示不呼叫訊息工具。

對於直接的群組請求，仍然會傳送輸入指示器。當啟用環境式常駐房間事件時，除非代理程式呼叫訊息工具，否則它們將保持嚴格且安靜。

若要將未提及的常駐群組閒聊作為安靜的房間語境提交，而非作為使用者請求，請使用 [Ambient room events](/zh-Hant/channels/ambient-room-events)：

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
    },
  },
}
```

預設值為 `unmentionedInbound: "user_request"`。

被提及的訊息、指令、中止請求和私人訊息仍保持為使用者請求。

若要求群組/頻道請求的可見輸出必須透過訊息工具進行：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

檔案儲存後，閘道會熱重載 `messages` 設定。僅在部署中停用檔案監看或設定重載時才需要重新啟動。

若要要求每個來源聊天的可見輸出都必須透過訊息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜線指令（Discord、Telegram 和其他支援原生指令的平台）會略過 `visibleReplies: "message_tool"` 並始終可見回覆，以便平台原生的指令 UI 能獲得預期的回應。這僅適用於已驗證的原生指令回合；以文字輸入的 `/...` 指令和一般聊天回合仍遵循設定的群組預設值。

## 內容可見性與允許清單

群組安全性涉及兩種不同的控制：

- **觸發授權**：誰可以觸發代理程式（`groupPolicy`、`groups`、`groupAllowFrom`、特定頻道的允許清單）。
- **內容可見性**：哪些補充內容會被注入到模型中（回覆文字、引用、執行緒歷史、轉發的中繼資料）。

預設情況下，OpenClaw 優先考慮一般聊天行為，並主要保持接收到的內容不變。這意味著允許清單主要決定誰可以觸發動作，而不是對每個被引用或歷史片段設定通用的編輯邊界。

<AccordionGroup>
  <Accordion title="目前行為因頻道而異">
    - 部分頻道已經在特定路徑中對補充內容套用基於發送者的過濾（例如 Slack 執行緒植入、Matrix 回覆/執行緒查詢）。
    - 其他頻道仍會照樣傳遞引用/回覆/轉發內容。

  </Accordion>
  <Accordion title="Hardening direction (planned)">
    - `contextVisibility: "all"` (預設) 保持目前接收時的行為。
    - `contextVisibility: "allowlist"` 將補充內容過濾為僅限允許清單中的發送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引用/回覆例外。

    在此強化模型於各頻道一致實作之前，預期會因平台而異。

  </Accordion>
</AccordionGroup>

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                                   | 設定方法                                                   |
| -------------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及 時回覆      | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                       | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                           | `groups: { "<group-id>": { ... } }` (沒有 `"*"` 金鑰)      |
| 僅限您能在群組中觸發                   | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |
| 跨通道重複使用同一個受信任的發送者集合 | `groupAllowFrom: ["accessGroup:operators"]`                |

若要建立可重複使用的發送者允許清單，請參閱 [Access groups](/zh-Hant/channels/access-groups)。

## Session keys

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（房間/頻道則使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，讓每個主題都有自己的會話。
- 直接聊天使用主 session（若已設定，則為每位發送者使用個別 session）。
- 群組會話會跳過心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Pattern: personal DMs + public groups (single agent)

是的 — 如果您的「個人」流量是 **DMs** 而「公開」流量是 **groups**，這個方式運作良好。

原因：在單一代理程式模式下，私訊 (DM) 通常會落在 **主要** 會話金鑰 (`agent:main:main`) 中，而群組則始終使用 **非主要** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在設定的沙盒後端中執行，而您的主要私訊會話則會保留在主機上。如果您未選擇後端，則預設為 Docker。

這為您提供一個代理程式「大腦」（共享工作區 + 記憶體），但兩種執行姿態：

- **DMs**：完整工具（主機）
- **Groups**：沙箱 + 受限工具

<Note>如果您需要真正獨立的工作空間/角色設定（「個人」與「公開」絕不能混雜），請使用第二個代理程式 + 綁定。請參閱 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。</Note>

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
    想要「群組只能看到資料夾 X」而不是「無主機存取權」嗎？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載至沙箱：

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

- 設定金鑰與預設值：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- 除錯工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mount 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時會使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道使用的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

## 群組原則

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

| 原則          | 行為                                 |
| ------------- | ------------------------------------ |
| `"open"`      | 群組略過允許清單；提及閘門仍然適用。 |
| `"disabled"`  | 完全封鎖所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

<AccordionGroup>
  <Accordion title="每頻道備註">
    - `groupPolicy` 與提及閘道（提及閘道需要 @mentions）分開。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備方案：明確的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以符合傳入的 Signal 群組 ID 或發送者電話/UUID。
    - DM 配對核准（`*-allowFrom` store 條目）僅適用於 DM 存取；群組發送者授權保持對群組允許清單的明確性。
    - Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允許清單使用 `channels.slack.channels`。
    - Matrix：允許清單使用 `channels.matrix.groups`。優先使用房間 ID 或別名；已加入房間名稱查詢為盡力而為，未解析的名稱會在執行時被忽略。使用 `channels.matrix.groupAllowFrom` 來限制發送者；也支援每個房間的 `users` 允許清單。
    - 群組 DM 受到單獨控制（`channels.discord.dm.*`, `channels.slack.dm.*`）。
    - Telegram 允許清單可以符合使用者 ID（`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴不區分大小寫。
    - 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，則會封鎖群組訊息。
    - 執行時安全性：當提供者區塊完全遺失（`channels.<provider>` 缺失）時，群組原則會後備至預設封閉模式（通常為 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心智模型（群組訊息的評估順序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="群組允許清單">群組允許清單（`*.groups`, `*.groupAllowFrom`, 特定頻道的允許清單）。</Step>
  <Step title="提及閘道">提及閘道 (`requireMention`, `/activation`)。</Step>
</Steps>

## 提及閘控（預設）

群組訊息需要提及，除非針對特定群組進行覆寫。預設值按子系統存放於 `*.groups."*"` 之下。

當頻道支援回覆中繼資料時，回覆機器人訊息會被視為隱含提及。在公開引用中繼資料的頻道上，引用機器人訊息也可視為隱含提及。目前內建的案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
  <Accordion title="提及篩選備註">
    - `mentionPatterns` 是不區分大小寫的安全正則表達式模式；無效的模式和不安全的嵌套重複形式會被忽略。
    - 提供明確提及的介面仍然會通過；模式僅作為後備方案。
    - 針對每個代理的覆寫：`agents.list[].groupChat.mentionPatterns` （當多個代理共用一個群組時很有用）。
    - 只有在可以進行提及檢測時（已配置原生提及或 `mentionPatterns`），才會強制執行提及篩選。
    - 將群組或發送者加入允許清單並不會停用提及篩選；當所有訊息都應觸發時，請將該群組的 `requireMention` 設為 `false`。
    - 自動群組聊天提示語境在每個回合都會帶有已解析的無聲回覆指令；工作區檔案不應重複 `NO_REPLY` 機制。
    - 允許自動無聲回覆的群組會將乾淨的空白或僅包含推理的模型回合視為無聲，等效於 `NO_REPLY`。直接聊天永遠不會收到 `NO_REPLY` 指引，且僅使用訊息工具的群組回覆會透過不呼叫 `message(action=send)` 來保持安靜。
    - 環境常駐群組閒聊預設使用使用者請求語意。設定 `messages.groupChat.unmentionedInbound: "room_event"` 將其作為安靜語境提交。有關設定範例，請參閱[環境室內事件](/zh-Hant/channels/ambient-room-events)。
    - 室內事件不會儲存為假的使用者請求，且來自無訊息工具室內事件的私人助理文字不會重播為聊天記錄。
    - Discord 預設值位於 `channels.discord.guilds."*"` 中（可依伺服器/頻道覆寫）。
    - 群組記錄語境在所有頻道中均以統一方式包裝。進行提及篩選的群組會保留待處理的已跳過訊息；當頻道支援時，常駐群組也可能會保留最近的已處理室內訊息。請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

  </Accordion>
</AccordionGroup>

## 群組/頻道工具限制（選用）

某些通道設定支援限制在**特定群組/房間/通道內**可使用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內針對每位發送者的覆寫。使用明確的金鑰前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 與 `"*"` 萬用字元。頻道 ID 使用標準的 OpenClaw 頻道 ID；諸如 `teams` 等別名會正規化為 `msteams`。舊版無前綴的金鑰仍被接受，並僅作為 `id:` 進行比對。

解析順序（較具體者優先）：

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

<Note>群組/頻道工具限制會與全域/代理工具策略一起套用（拒絕仍優先）。部分頻道針對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群組允許清單

當設定了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些金鑰會作為群組允許清單。使用 `"*"` 可允許所有群組，同時仍設定預設提及行為。

<Warning>常見誤解：DM 配對批准不等同於群組授權。對於支援 DM 配對的頻道，配對儲存庫僅會解鎖 DM。群組指令仍需要來自設定允許清單（例如 `groupAllowFrom`）或該頻道文件中記載的設定後援機制的明確群組發送者授權。</Warning>

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
  <Tab title="僅限所有者觸發 (WhatsApp)">
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

## 啟用（僅限所有者）

群組所有者可以切換各群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組傳入的 Payload 會設定：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及閘道結果）
- Telegram 論壇主題還包含 `MessageThreadId` 和 `IsForum`。

代理系統提示在新的群組會話第一輪中包含群組介紹。它會提醒模型像人類一樣回應，避免 Markdown 表格，盡量減少空行並遵循正常的聊天間距，並避免輸入字面的 `\n` 序列。來自頻道的群組名稱和參與者標籤會被渲染為圍欄的不受信任元數據，而非內聯系統指令。

## iMessage 詳細資訊

- 在路由或許可清單中，建議優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會回到同一個 `chat_id`。

## WhatsApp 系統提示

請參閱 [WhatsApp](/zh-Hant/channels/whatsapp#system-prompts) 以了解標準的 WhatsApp 系統提示規則，包括群組和直接提示解析、萬用字元行為以及帳號覆寫語義。

## WhatsApp 詳細資訊

請參閱 [Group messages](/zh-Hant/channels/group-messages) 以了解僅限 WhatsApp 的行為（歷史記錄注入、提及處理細節）。

## 相關

- [Broadcast groups](/zh-Hant/channels/broadcast-groups)
- [Channel routing](/zh-Hant/channels/channel-routing)
- [Group messages](/zh-Hant/channels/group-messages)
- [Pairing](/zh-Hant/channels/pairing)
