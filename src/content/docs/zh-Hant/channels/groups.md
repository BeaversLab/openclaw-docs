---
summary: "各平臺群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
sidebarTitle: "群組"
---

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

對於應提供安靜上下文的常開房間，除非代理程式明確發送可見訊息，請參閱[環境房間事件](/zh-Hant/channels/ambient-room-events)。

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

對於群組/頻道房間，OpenClaw 預設為 `messages.groupChat.visibleReplies: "message_tool"`。
`openclaw doctor --fix` 會將此預設值寫入省略它的已設定頻道設定中。
這意味著代理程式仍會處理該輪次並可以更新記憶體/會話狀態，且當它有房間回覆時，應使用 `message(action=send)` 可見地發言。如果模型錯過該工具並返回實質性的最終文字，OpenClaw 會將該最終文字保持私密，而不是將其發布到房間。

此預設值取決於一個能可靠呼叫工具的模型/執行時環境。如果日誌顯示有助理文字但沒有 `didSendViaMessagingTool: false`，這表示模型私下回答了，而不是呼叫訊息工具。房間保持靜默，而閘道詳細日誌會記錄被抑制的最終載詮詮資料。這不是 Discord/Slack/Telegram 傳送失敗，而是一個工具紀律的訊號。請對群組/頻道階段作業使用可靠呼叫工具的模型，或者當您希望所有可見的群組回覆都使用舊版的最終回覆路徑時，請設定 `messages.groupChat.visibleReplies: "automatic"`。

如果在啟用的工具原則下無法使用訊息工具，OpenClaw 會退回到自動可見回覆，而不是無聲地抑制回應。`openclaw doctor` 會針對此不匹配發出警告。

對於直接聊天和其他任何來源事件，請使用 `messages.visibleReplies: "message_tool"` 來全域套用相同的「僅限工具」可見回覆行為。Harness 也可以選擇將此作為其未設定時的預設值；Codex harness 對於 Codex 模式的直接聊天就是這樣做的。`messages.groupChat.visibleReplies` 仍然是針對群組/頻道房間的更具體覆蓋設定。

這取代了強迫模型在大多數潛行模式轉換中回答 `NO_REPLY` 的舊模式。在僅限工具模式中，不做任何可見的事情簡單來說就是不呼叫訊息工具。

對於直接的群組請求，仍然會傳送輸入指示器。當啟用環境式常駐房間事件時，除非代理程式呼叫訊息工具，否則它們將保持嚴格且安靜。

若要將未提及的常駐群組閒聊作為安靜的房間語境而非使用者請求提交，請使用 [Ambient room events](/zh-Hant/channels/ambient-room-events)：

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

若要還原群組/頻道請求的舊版自動最終回覆：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

在儲存檔案後，閘道會熱重新載入 `messages` 設定。僅當在部署中停用檔案監看或設定重新載入時，才需要重新啟動。

若要要求每個來源聊天的可見輸出都必須透過訊息工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜線指令（Discord、Telegram 和其他支援原生指令的平台）會繞過 `visibleReplies: "message_tool"` 並始終可見回覆，以便頻道原生指令 UI 能收到預期的回應。這僅適用於經驗證的原生指令輪次；文字輸入的 `/...` 指令和一般聊天輪次仍遵循設定的群組預設值。

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
  <Accordion title="強化方向（計畫中）">
    - `contextVisibility: "all"`（預設）保持目前接收到的行為。
    - `contextVisibility: "allowlist"` 將補充內容過濾為僅允許清單中的發送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引用/回覆例外。

    在此強化模型於各頻道一致實作之前，預期各平台會有所差異。

  </Accordion>
</AccordionGroup>

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                                   | 設定方法                                                   |
| -------------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及 時回覆      | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                       | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                           | `groups: { "<group-id>": { ... } }`（無 `"*"` 鍵）         |
| 僅限您能在群組中觸發                   | `groupPolicy: "allowlist"`，`groupAllowFrom: ["+1555..."]` |
| 跨通道重複使用同一個受信任的發送者集合 | `groupAllowFrom: ["accessGroup:operators"]`                |

關於可重複使用的發送者允許清單，請參閱[存取群組](/zh-Hant/channels/access-groups)。

## Session keys

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` session keys（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 加入群組 ID，因此每個主題都有自己的 session。
- 直接聊天使用主 session（若已設定，則為每位發送者使用個別 session）。
- 群組會話會跳過心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Pattern: personal DMs + public groups (single agent)

是的 — 如果您的「個人」流量是 **DMs** 而「公開」流量是 **groups**，這個方式運作良好。

原因：在單一代理程式模式下，DMs 通常會進入 **main** session key (`agent:main:main`)，而群組則一律使用 **non-main** session keys (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙箱，這些群組會話會在設定的沙箱後端執行，而您的主 DM session 則維持在主機上。如果您不選擇後端，Docker 是預設後端。

這為您提供一個代理程式「大腦」（共享工作區 + 記憶體），但兩種執行姿態：

- **DMs**：完整工具（主機）
- **Groups**：沙箱 + 受限工具

<Note>如果您需要真正獨立的工作區/角色（「個人」和「公開」絕不能混合），請使用第二個代理程式 + 綁定。請參閱[多代理程式路由](/zh-Hant/concepts/multi-agent)。</Note>

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
    想要「群組只能看到資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙箱中：

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

- 配置金鑰與預設值：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- 偵錯工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是為房間/頻道保留的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

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
  <Accordion title="各頻道備註">
    - `groupPolicy` 與提及閘道（mention-gating，需要 @mentions）是分開的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以符合傳入的 Signal 群組 ID 或傳送者電話/UUID。
    - DM 配對核准（`*-allowFrom` 商店條目）僅適用於 DM 存取；群組傳送者授權保持明確指定給群組允許清單。
    - Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允許清單使用 `channels.slack.channels`。
    - Matrix：允許清單使用 `channels.matrix.groups`。建議優先使用房間 ID 或別名；已加入房間名稱查詢為盡力而為，執行時期會忽略無法解析的名稱。使用 `channels.matrix.groupAllowFrom` 來限制傳送者；也支援每個房間的 `users` 允許清單。
    - 群組 DM 受到單獨控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
    - Telegram 允許清單可以符合使用者 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴區分大小寫。
    - 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，則會阻擋群組訊息。
    - 執行時期安全性：當提供者區塊完全遺失（`channels.<provider>` 不存在）時，群組原則會回退到「預設封閉」模式（通常是 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心智模型（群組訊息的評估順序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy`（開放/停用/允許清單）。</Step>
  <Step title="Group allowlists">群組允許清單（`*.groups`、`*.groupAllowFrom`、特定頻道允許清單）。</Step>
  <Step title="提及閘控">提及閘控（`requireMention`、`/activation`）。</Step>
</Steps>

## 提及閘控（預設）

群組訊息需要提及（mention），除非針對特定群組進行了覆寫。預設值位於各子系統下的 `*.groups."*"` 中。

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
    - `mentionPatterns` 為不區分大小寫的安全正則表達式模式；無效的模式和不安全的巢狀重複形式將被忽略。
    - 提供明確提及的介面仍會通過；模式僅作為後備方案。
    - 針對每個代理的覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
    - 僅當可以進行提及偵測時（已配置原生提及或 `mentionPatterns`），才會強制執行提及篩選。
    - 將群組或發送者加入允許清單並不會停用提及篩選；當所有訊息都應觸發時，請將該群組的 `requireMention` 設定為 `false`。
    - 自動群組聊天提示詞上下文每輪都會攜帶已解析的靜音回覆指令；工作區檔案不應重複 `NO_REPLY` 機制。
    - 允許自動靜音回覆的群組會將純粹空白或僅包含推理的模型輪次視為靜音，等同於 `NO_REPLY`。直接聊天永遠不會接收 `NO_REPLY` 指引，且僅使用訊息工具的群組回覆會透過不呼叫 `message(action=send)` 來保持靜默。
    - 環境常駐群組閒聊預設使用使用者請求語義。請設定 `messages.groupChat.unmentionedInbound: "room_event"` 將其提交為靜音上下文。請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events) 以了解設定範例。
    - 房間事件不會儲存為假的使用者請求，且來自無訊息工具房間事件的私人助理文字不會重播為聊天記錄。
    - Discord 預設值位於 `channels.discord.guilds."*"`（可依伺服器/頻道覆寫）。
    - 群組歷史記錄上下文在所有頻道中均以統一方式包裝。啟用提及篩選的群組會保留待處理的已跳過訊息；當頻道支援時，常駐群組也可能會保留最近的已處理房間訊息。請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。請設定 `0` 以停用。

  </Accordion>
</AccordionGroup>

## 群組/頻道工具限制（選用）

某些通道設定支援限制在**特定群組/房間/通道內**可使用的工具。

- `tools`: 針對整個群組允許/拒絕工具。
- `toolsBySender`: 群組內針對個別發送者的覆寫。使用明確的鍵前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。通道 ID 使用標準的 OpenClaw 通道 ID；例如 `teams` 的別名會正規化為 `msteams`。舊版無前綴的鍵仍被接受，並僅匹配為 `id:`。

解析順序（較具體者優先）：

<Steps>
  <Step title="Group toolsBySender">群組/通道 `toolsBySender` 匹配。</Step>
  <Step title="Group tools">群組/通道 `tools`。</Step>
  <Step title="Default toolsBySender">預設 (`"*"`) `toolsBySender` 匹配。</Step>
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

<Note>群組/通道工具限制會與全域/代理程式工具政策一併套用（拒絕仍然優先）。某些通道對房間/通道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會充當群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設的提及行為。

<Warning>常見混淆：DM 配對批准與群組授權並不相同。對於支援 DM 配對的頻道，配對儲存庫僅解鎖 DM。群組指令仍需要來自配置允許清單（例如 `groupAllowFrom`）或該頻道記載的配置後援的明確群組傳送者授權。</Warning>

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

所有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人的自身 E.164）。請將指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組傳入的 Payload 會設定：

- `ChatType=group`
- `GroupSubject` （如果已知）
- `GroupMembers` （如果已知）
- `WasMentioned` （提及閘道結果）
- Telegram 論壇主題還包括 `MessageThreadId` 和 `IsForum`。

代理系統提示會在新的群組會話第一輪包含群組簡介。它會提醒模型像人類一樣回應，避免 Markdown 表格，盡量減少空行並遵循一般的聊天間距，並避免輸入字面的 `\n` 序列。來自頻道的群組名稱和參與者標籤會呈現為被包圍的不可信元數據，而非內聯系統指令。

## iMessage 詳細資訊

- 在路由或加入允許清單時，建議優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會傳回相同的 `chat_id`。

## WhatsApp 系統提示

請參閱 [WhatsApp](/zh-Hant/channels/whatsapp#system-prompts) 以了解正規的 WhatsApp 系統提示詞規則，包括群組與直接提示詞解析、萬用字元行為以及帳號覆蓋語義。

## WhatsApp 詳細資訊

請參閱 [群組訊息](/zh-Hant/channels/group-messages) 以了解 WhatsApp 專屬的行為（歷史記錄注入、提及處理細節）。

## 相關

- [廣播群組](/zh-Hant/channels/broadcast-groups)
- [通道路由](/zh-Hant/channels/channel-routing)
- [群組訊息](/zh-Hant/channels/group-messages)
- [配對](/zh-Hant/channels/pairing)
