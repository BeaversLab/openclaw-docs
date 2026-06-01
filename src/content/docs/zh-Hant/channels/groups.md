---
summary: "各平臺群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
sidebarTitle: "群組"
---

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

對於除非代理程式明確發送可見訊息，否則應提供安靜背景的常駐房間，請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

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

對於直接聊天和任何其他來源事件，請使用 `messages.visibleReplies: "message_tool"` 在全域範圍內套用相同的「僅限工具」可見回覆行為。內部 WebChat 直接輪次預設為自動最終回覆傳遞，因此 Pi 和 Codex 會收到相同的可見回覆合約。設定 `messages.visibleReplies: "message_tool"` 以刻意要求 `message(action=send)` 進行可見輸出。`messages.groupChat.visibleReplies` 仍是針對群組/頻道房間的更具體覆寫設定。

這取代了強制模型在大多數潛伏模式輪次中回答 `NO_REPLY` 的舊模式。在僅限工具模式下，不做任何可見的動作僅意味著不呼叫訊息工具。

對於直接的群組請求，仍然會傳送輸入指示器。當啟用環境式常駐房間事件時，除非代理程式呼叫訊息工具，否則它們將保持嚴格且安靜。

Sessions 預設會抑制詳細的工具/進度摘要。使用 `/verbose on` 在除錯時顯示目前會話的這些摘要，並使用 `/verbose off` 返回僅限最終回覆的行為。相同的詳細狀態適用於直接聊天、群組、頻道和論壇主題。

若要將未提及的常駐群組閒聊作為安靜房間背景而非使用者請求提交，請使用 [Ambient room events](/zh-Hant/channels/ambient-room-events)：

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

提及的訊息、指令、中止請求和 DM 保持為使用者請求。

若要求針對群組/頻道請求的可見輸出必須透過訊息工具進行：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

檔案儲存後，閘道會熱重新載入 `messages` 設定。僅當部署中停用檔案監看或設定重新載入時才需要重新啟動。

若要求針對每個來源聊天的可見輸出必須透過訊息工具進行：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜線指令（Discord、Telegram 和其他具備原生指令支援的介面）會略過 `visibleReplies: "message_tool"` 並始終可見地回覆，以便頻道原生指令 UI 收到其預期的回應。這僅適用於已驗證的原生指令輪次；以文字輸入的 `/...` 指令和一般聊天輪次仍會遵循設定的群組預設值。

## Context visibility and allowlists

群組安全性涉及兩個不同的控制項：

- **觸發授權**：誰可以觸發代理程式（`groupPolicy`、`groups`、`groupAllowFrom`、特定頻道的允許清單）。
- **Context visibility**：將哪些補充語境注入模型（回覆文字、引用、執行緒歷史、轉發的中繼資料）。

預設情況下，OpenClaw 優先考慮正常聊天行為並幾乎按原樣保留語境。這意味著允許清單主要決定誰可以觸發動作，而不是每個引用或歷史片段的通用編輯邊界。

<AccordionGroup>
  <Accordion title="目前行為因頻道而異">
    - 部分頻道已經在特定路徑中對補充上下文套用基於發送者的過濾（例如 Slack thread seeding、Matrix reply/thread lookups）。
    - 其他頻道仍會按接收到的內容直接傳遞引用/回覆/轉發上下文。

  </Accordion>
  <Accordion title="Hardening direction (planned)">
    - `contextVisibility: "all"` (預設) 保持當前接收行為。
    - `contextVisibility: "allowlist"` 過濾補充上下文僅限允許清單中的發送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引用/回覆例外。

    在此強化模型於所有通道一致實作之前，不同介面可能會有差異。

  </Accordion>
</AccordionGroup>

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                               | 設定方法                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及 時回覆  | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                   | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                       | `groups: { "<group-id>": { ... } }` (無 `"*"` 鍵)          |
| 只有您能在群組中觸發               | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| 跨頻道重複使用一組信任的發送者清單 | `groupAllowFrom: ["accessGroup:operators"]`                |

若要重複使用發送者允許清單，請參閱 [存取群組](/zh-Hant/channels/access-groups)。

## Session 金鑰

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰 (房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`)。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，因此每個主題都有自己的會話。
- 直接訊息使用主會話（若已設定，則使用每個發送者的會話）。
- 群組會話會跳過心跳檢測。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DMs** 而「公開」流量是 **groups**，這個模式運作得很好。

原因：在單一代理模式下，私訊通常落在 **主要** 會話金鑰 (`agent:main:main`) 中，而群組始終使用 **非主要** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒，這些群組會話將在設定的沙盒後端中執行，而您的主要私訊會話則留在主機上。如果您未選擇後端，Docker 是預設後端。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但兩種執行姿態：

- **私訊**：完整工具（主機）
- **群組**：沙盒 + 受限工具

<Note>如果您需要真正完全分開的工作區/角色 (「個人」和「公開」絕不能混合)，請使用第二個代理 + 綁定。請參閱 [多代理路由](/zh-Hant/concepts/multi-agent)。</Note>

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
    想要「群組只能看到資料夾 X」而不是「無主機存取權」嗎？保留 `workspaceAccess: "none"` 並且僅將允許清單中的路徑掛載至沙盒中：

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

- 組態金鑰與預設值： [Gateway 組態](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- 除錯工具被封鎖的原因： [沙盒與工具原則與提權](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- 如果可用，UI 標籤使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給 房間/頻道 的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

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
| `"open"`      | 群組略過允許清單；提及閘門仍然適用。 |
| `"disabled"`  | 完全封鎖所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

<AccordionGroup>
  <Accordion title="Per-channel notes">
    - `groupPolicy` 與提及閘控（mention-gating，需要 @mentions）是分開的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（備選：明確的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以符合傳入的 Signal 群組 ID 或傳送者電話/UUID。
    - DM 配對審核（`*-allowFrom` 商店項目）僅適用於 DM 存取；群組傳送者授權保持對群組允許清單的明確設定。
    - Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允許清單使用 `channels.slack.channels`。
    - Matrix：允許清單使用 `channels.matrix.groups`。建議優先使用房間 ID 或別名；已加入房間的名稱查詢為盡力而為，未解析的名稱會在執行時被忽略。使用 `channels.matrix.groupAllowFrom` 來限制傳送者；也支援每個房間 `users` 允許清單。
    - 群組 DM 分開控制（`channels.discord.dm.*`, `channels.slack.dm.*`）。
    - Telegram 允許清單可以符合使用者 ID（`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴不區分大小寫。
    - 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，群組訊息將會被封鎖。
    - 執行時安全性：當提供商區塊完全遺失（`channels.<provider>` 不存在）時，群組政策會退回到失效封閉模式（通常是 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心智模型（群組訊息的評估順序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="Group allowlists">群組允許清單 (`*.groups`, `*.groupAllowFrom`, 特定頻道的允許清單)。</Step>
  <Step title="提及控制">提及控制 (`requireMention`，`/activation`)。</Step>
</Steps>

## 提及閘道 (預設)

群組訊息需要提及，除非每個群組另有設定。預設值位於各子系統的 `*.groups."*"` 下。

當頻道支援回覆元數據時，回覆機器人訊息會視為隱含提及。在支援引用元數據的頻道上，引用機器人訊息也可能視為隱含提及。目前內建的案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
  <Accordion title="提及過濾備註">
    - `mentionPatterns` 為不區分大小寫的安全正規表達式模式；無效的模式和不安全的巢狀重複形式會被忽略。
    - 提供明確提及的介面仍然會通過；模式僅作為備用方案。
    - 每個代理的覆寫：`agents.list[].groupChat.mentionPatterns` （當多個代理共用一個群組時很有用）。
    - 僅當可以進行提及偵測時（已設定原生提及或 `mentionPatterns`），才會執行提及過濾。
    - 將群組或發送者加入允許清單並不會停用提及過濾；當所有訊息都應觸發時，請將該群組的 `requireMention` 設定為 `false`。
    - 自動群組聊天提示詞上下文每個回合都會帶有已解析的靜默回覆指令；工作區檔案不應重複 `NO_REPLY` 機制。
    - 允許自動靜默回覆的群組會將純空白或僅包含推理的模型回合視為靜默，等同於 `NO_REPLY`。直接聊天永遠不會收到 `NO_REPLY` 指引，且僅使用訊息工具的群組回覆會因不呼叫 `message(action=send)` 而保持安靜。
    - 環境常駐的群組閒聊預設使用使用者請求語意。設定 `messages.groupChat.unmentionedInbound: "room_event"` 可將其提交為安靜的上下文。設定範例請參閱 [環境房間事件](/zh-Hant/channels/ambient-room-events)。
    - 房間事件不會儲存為假的使用者請求，且來自無訊息工具房間事件的私人助理文字不會作為聊天記錄重播。
    - Discord 預設值位於 `channels.discord.guilds."*"` 中（可依伺服器/頻道覆寫）。
    - 群組歷史記錄上下文在所有頻道中均以統一方式包裝。設有提及過濾的群組會保留待處理的已跳過訊息；當頻道支援時，常駐群組也可能會保留最近已處理的房間訊息。使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 可停用。

  </Accordion>
</AccordionGroup>

## 群組/頻道工具限制（可選）

某些頻道設定支援限制**特定群組/聊天室/頻道**內可用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內依據發送者的覆寫。使用明確的鍵前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。頻道 ID 使用標準 OpenClaw 頻道 ID；別名如 `teams` 會正規化為 `msteams`。舊版無前綴的鍵仍被接受，並僅作為 `id:` 進行比對。

解析順序（越具體優先級越高）：

<Steps>
  <Step title="Group toolsBySender">群組/頻道 `toolsBySender` 比對。</Step>
  <Step title="Group tools">群組/頻道 `tools`。</Step>
  <Step title="Default toolsBySender">預設（`"*"`）`toolsBySender` 比對。</Step>
  <Step title="Default tools">預設（`"*"`）`tools`。</Step>
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

<Note>群組/頻道工具限制會與全域/代理工具策略一起套用（拒絕仍然優先）。部分頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會作為群組允許清單。使用 `"*"` 以允許所有群組，同時仍然設定預設提及行為。

<Warning>常見誤解：DM 配對批准不等同於群組授權。對於支援 DM 配對的頻道，配對儲存僅會解鎖 DM。群組指令仍然需要來自配置允許清單（例如 `groupAllowFrom`）的明確群組發送者授權，或是該頻道文件中說明的配置後援。</Warning>

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

群組所有者可以切換各別群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組傳入負載會設定：

- `ChatType=group`
- `GroupSubject`（若已知）
- `GroupMembers`（若已知）
- `WasMentioned`（提及閘道結果）
- Telegram 論壇主題還包含 `MessageThreadId` 和 `IsForum`。

代理系統提示詞在新群組會話的第一輪包含群組介紹。它提醒模型要像人類一樣回應、避免使用 Markdown 表格、盡量減少空行並遵循正常的聊天間距，以及避免輸入字面的 `\n` 序列。來自頻道的群組名稱和參與者標籤會被渲染為圍欄不受信任的元數據，而非內聯系統指令。

## iMessage 特定事項

- 路由或加入允許清單時，建議優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆一律傳回同一個 `chat_id`。

## WhatsApp 系統提示

關於標準的 WhatsApp 系統提示詞規則，包括群組與直接提示詞解析、萬用字元行為和帳號覆寫語意，請參閱 [WhatsApp](/zh-Hant/channels/whatsapp#system-prompts)。

## WhatsApp 特定事項

關於 WhatsApp 專屬行為（歷史記錄插入、提及處理細節），請參閱 [Group messages](/zh-Hant/channels/group-messages)。

## 相關

- [Broadcast groups](/zh-Hant/channels/broadcast-groups)
- [Channel routing](/zh-Hant/channels/channel-routing)
- [Group messages](/zh-Hant/channels/group-messages)
- [Pairing](/zh-Hant/channels/pairing)
