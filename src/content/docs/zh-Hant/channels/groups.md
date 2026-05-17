---
summary: "跨平台群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
sidebarTitle: "群組"
---

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初學者介紹 (2 分鐘)

OpenClaw 寄住在您自己的訊息帳號上。並沒有額外的 WhatsApp 機器人使用者。如果 **您** 在某個群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受到限制（`groupPolicy: "allowlist"`）。
- 回覆需要被提及，除非您明確停用提及閘門。
- 群組/頻道中的正常最終回覆預設為私人訊息。可見的房間輸出使用 `message` 工具。

翻譯：允許清單上的發送者可以透過提及 OpenClaw 來觸發它。

<Note>
**TL;DR**

- **DM 存取權** 由 `*.allowFrom` 控制。
- **群組存取權** 由 `*.groupPolicy` + 允許清單（`*.groups`、`*.groupAllowFrom`）控制。
- **回覆觸發** 由提及控管（`requireMention`、`/activation`）控制。

</Note>

快速流程（群組訊息會發生什麼）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 可見的回覆

對於群組/頻道房間，OpenClaw 預設為 `messages.groupChat.visibleReplies: "message_tool"`。
`openclaw doctor --fix` 會將此預設值寫入未指定它的已配置頻道設定中。
這意味著代理程式仍會處理該輪次並可以更新記憶體/會話狀態，但其正常的最終答案不會自動發布回房間中。若要公開發言，代理程式會使用 `message(action=send)`。

此預設值取決於能可靠呼叫工具的模型/執行時期。如果日誌顯示
助理文字但出現 `didSendViaMessagingTool: false`，表示模型
私下回答，而不是呼叫訊息工具。這不是
Discord/Slack/Telegram 的傳送失敗。請使用對工具呼叫可靠的模型用於
群組/頻道會話，或者設定
`messages.groupChat.visibleReplies: "automatic"` 以恢復舊版可見的
最終回覆。

如果在現有工具政策下無法使用訊息工具，OpenClaw 將
改為回退到自動可見回覆，而不是靜默抑制回應。
`openclaw doctor` 會對此不符之處發出警告。

對於直接聊天和任何其他來源輪次，請使用 `messages.visibleReplies: "message_tool"` 全局套用相同的「僅限工具」可見回覆行為。Harness 也可以選擇將此作為其未設定的預設值；Codex harness 對於 Codex 模式的直接聊天就是這樣做的。`messages.groupChat.visibleReplies` 仍然是針對群組/頻道房間的更具體的覆寫設定。

這取代了舊的模式，即強迫模型在大多數潛伏模式輪次中回答 `NO_REPLY`。在僅限工具模式下，不做任何可見的事情僅意味著不呼叫訊息工具。

當代理在僅限工具模式下工作時，仍然會發送輸入指示器。對於這些輪次，預設的群組輸入模式已從「message」升級為「instant」，因為在代理決定是否呼叫訊息工具之前，可能永遠不會有正常的助理訊息文字。明確的輸入模式配置仍然優先。

若要為群組/頻道房間恢復舊版的自動最終回覆：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

儲存檔案後，Gateway 會熱重載 `messages` 配置。僅當部署中停用了檔案監視或配置重載時才需要重新啟動。

若要求每個來源聊天的可見輸出都必須透過訊息工具進行：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜線指令（Discord、Telegram 和其他具有原生指令支援的介面）會繞過 `visibleReplies: "message_tool"` 並始終可見地回覆，以便頻道原生指令 UI 能獲得它預期的回應。這僅適用於已驗證的原生指令輪次；以文字輸入的 `/...` 指令和普通聊天輪次仍遵循已配置的群組預設值。

## 上下文可見性與允許清單

群組安全涉及兩個不同的控制項：

- **觸發授權**：誰可以觸發代理（`groupPolicy`、`groups`、`groupAllowFrom`、特定頻道的允許清單）。
- **上下文可見性**：將哪些補充上下文注入到模型中（回覆文字、引言、執行緒歷史、轉發的元資料）。

預設情況下，OpenClaw 優先考慮正常的聊天行為，並基本按原樣保留上下文。這意味著允許清單主要決定誰可以觸發操作，而不是每個被引用或歷史片段的通用編輯邊界。

<AccordionGroup>
  <Accordion title="目前的行為因頻道而異">
    - 某些頻道已經在特定路徑中對補充內容應用基於發送者的過濾（例如 Slack 執行緒植入、Matrix 回覆/執行緒查詢）。
    - 其他頻道仍然會將引用/回覆/轉發的內容按接收到的情況傳遞。

  </Accordion>
  <Accordion title="加強方向（計畫中）">
    - `contextVisibility: "all"` (預設) 保持目前的接收行為。
    - `contextVisibility: "allowlist"` 將補充內容過濾為僅包含允許清單中的發送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引用/回覆例外。

    在此加強模型於各頻道一致實施之前，預期會因介面不同而有所差異。

  </Accordion>
</AccordionGroup>

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                            | 設定方式                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| 允許所有群組但僅在 @提及 時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                    | `groups: { "<group-id>": { ... } }` (無 `"*"` 金鑰)        |
| 只有您可以在群組中觸發          | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| 跨頻道重複使用一組信任的發送者  | `groupAllowFrom: ["accessGroup:operators"]`                |

關於可重複使用的發送者許可清單，請參閱 [存取群組](/zh-Hant/channels/access-groups)。

## 工作階段金鑰

- 群組工作階段使用 `agent:<agentId>:<channel>:group:<id>` 工作階段金鑰（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 加入群組 ID，因此每個主題都有自己的工作階段。
- 直接訊息使用主工作階段（或如果已設定，則使用每個發送者的專屬工作階段）。
- 群組工作階段會跳過心跳檢測。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：個人 DM + 公開群組（單一代理程式）

可以 — 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這樣運作效果很好。

原因：在單一代理模式中，DM 通常位於 **main** 會話金鑰 (`agent:main:main`)，而群組始終使用 **non-main** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒，這些群組會話將在設定的沙盒後端運行，而您的主要 DM 會話則保持在主機上。如果您不選擇後端，Docker 是預設的後端。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但具有兩種執行態勢：

- **DM**：完整工具 (主機)
- **群組**：沙盒 + 受限工具

<Note>如果您需要完全獨立的工作區/角色（「個人」和「公開」絕不能混合），請使用第二個代理程式 + 綁定。請參閱 [多代理程式路由](/zh-Hant/concepts/multi-agent)。</Note>

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
    您想要「群組只能看到資料夾 X」而不是「無主機存取權」嗎？保留 `workspaceAccess: "none"` 並且僅將允許清單中的路徑掛載到沙盒中：

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

相關連結：

- 設定金鑰與預設值：[Gateway configuration](/zh-Hant/gateway/config-agents#agentsdefaultssandbox)
- 除錯工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給 房間/頻道 使用的；群組聊天使用 `g-<slug>` (小寫，空格 -> `-`，保留 `#@+._-`)。

## 群組政策

控制如何處理每個頻道的群組/房間訊息：

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
| `"open"`      | 群組繞過允許清單；提及閘門仍然適用。 |
| `"disabled"`  | 完全封鎖所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

<AccordionGroup>
  <Accordion title="各頻道備註">
    - `groupPolicy` 與提及限制（require @mentions）是分開的。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（備用：明確的 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以符合傳入的 Signal 群組 ID 或發送者的電話/UUID。
    - DM 配對核准（`*-allowFrom` 儲存條目）僅適用於 DM 存取；群組發送者授權保持明確依賴群組允許清單。
    - Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允許清單使用 `channels.slack.channels`。
    - Matrix：允許清單使用 `channels.matrix.groups`。建議優先使用房間 ID 或別名；已加入房間名稱的查詢為盡力而為，無法解析的名稱會在執行時被忽略。使用 `channels.matrix.groupAllowFrom` 來限制發送者；也支援各房間的 `users` 允許清單。
    - 群組 DM 是分開控制的（`channels.discord.dm.*`, `channels.slack.dm.*`）。
    - Telegram 允許清單可以符合使用者 ID（`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴不區分大小寫。
    - 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單是空的，群組訊息將被封鎖。
    - 執行時期安全性：當某個供應者區塊完全遺失（`channels.<provider>` 不存在）時，群組政策會回退到預設封閉模式（通常為 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速的心智模型（群組訊息的評估順序）：

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist)。</Step>
  <Step title="Group allowlists">群組允許清單（`*.groups`, `*.groupAllowFrom`, 特定頻道允許清單）。</Step>
  <Step title="提及門檻">提及門檻 (`requireMention`, `/activation`)。</Step>
</Steps>

## 提及門檻（預設）

群組訊息需要提及才會回應，除非針對特定群組另有覆寫。預設值存在於各子系統的 `*.groups."*"` 下。

當頻道支援回覆元資料時，回覆機器人訊息視為隱含提及。在支援引言元資料的頻道上，引用機器人訊息也可以視為隱含提及。目前內建的案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
  <Accordion title="提及閘控備註">
    - `mentionPatterns` 為不區分大小寫的安全正規表達式模式；無效的模式和不安全的巢狀重複形式會被忽略。
    - 提供明確提及的介面仍然會通過；模式僅作為後備方案。
    - 每個代理的覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
    - 只有在可以進行提及偵測時（已設定原生提及或 `mentionPatterns`），才會執行提及閘控。
    - 將群組或發送者加入允許清單並不會停用提及閘控；當所有訊息都應觸發時，請將該群組的 `requireMention` 設為 `false`。
    - 群組聊天提示詞上下文每回合都會攜帶已解析的靜音回覆指令；工作區檔案不應重複 `NO_REPLY` 機制。
    - 允許靜音回覆的群組會將純空白或僅包含推理的模型回合視為靜音，等同於 `NO_REPLY`。直接聊天僅在明確允許直接靜音回覆時才會這樣做；否則，空白回覆將保持為代理失敗的回合。
    - Discord 的預設值位於 `channels.discord.guilds."*"`（可依伺服器/頻道覆寫）。
    - 群組歷史記錄上下文在所有頻道中以統一方式包裝。受提及閘控的群組會保留待處理的略過訊息；始終開啟的群組在頻道支援的情況下，也可能會保留最近已處理的房間訊息。請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

  </Accordion>
</AccordionGroup>

## 群組/頻道工具限制（可選）

某些頻道配置支援限制**在特定群組/房間/頻道內**可用的工具。

- `tools`：針對整個群組允許/拒絕工具。
- `toolsBySender`：群組內針對每個發送者的覆寫。使用明確的鍵前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。頻道 ID 使用標準的 OpenClaw 頻道 ID；別名例如 `teams` 會正規化為 `msteams`。仍接受舊版無前綴的鍵，且僅將其匹配為 `id:`。

解析順序（最特定者優先）：

<Steps>
  <Step title="Group toolsBySender">群組/頻道 `toolsBySender` 符合。</Step>
  <Step title="Group tools">群組/頻道 `tools`。</Step>
  <Step title="Default toolsBySender">預設 (`"*"`) `toolsBySender` 符合。</Step>
  <Step title="Default tools">預設 (`"*"`) `tools`。</Step>
</Steps>

範例（Telegram）：

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

<Note>群組/頻道工具限制會與全域/代理程式工具政策一併套用（拒絕權限優先）。部分頻道針對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。</Note>

## 群組允許清單

當設定了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會作為群組允許清單。請使用 `"*"` 來允許所有群組，同時仍設定預設提及行為。

<Warning>常見誤解：DM 配對批准與群組授權並不相同。對於支援 DM 配對的頻道，配對儲存庫僅會解鎖 DM。群組指令仍需要來自組態允許清單（例如 `groupAllowFrom`）或該頻道文件中所述組態後援機制的明確群組傳送者授權。</Warning>

常見意圖（複製/貼上）：

<Tabs>
  <Tab title="Disable all group replies">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="Allow only specific groups (WhatsApp)">
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
  <Tab title="Allow all groups but require mention">
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
  <Tab title="Owner-only triggers (WhatsApp)">
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

群組擁有者可以切換各個群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。請將該指令作為獨立訊息傳送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組輸入 Payload 設定：

- `ChatType=group`
- `GroupSubject` (如果已知)
- `GroupMembers` (如果已知)
- `WasMentioned` (提及過濾結果)
- Telegram 論壇主題也包含 `MessageThreadId` 和 `IsForum`。

代理系統提示在新群組會話的第一輪包含群組介紹。它提醒模型像人類一樣回應，避免 Markdown 表格，盡量減少空行並遵循正常的聊天間距，並避免輸入字面 `\n` 序列。來自頻道的群組名稱和參與者標籤被渲染為圍欄不信任元數據，而不是行內系統指令。

## iMessage 詳細資訊

- 在路由或允許列舉時優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是回到同一個 `chat_id`。

## WhatsApp 系統提示

有關規範的 WhatsApp 系統提示規則（包括群組和直接提示解析、萬用字元行為和帳戶覆蓋語義），請參閱 [WhatsApp](/zh-Hant/channels/whatsapp#system-prompts)。

## WhatsApp 特定細節

有關 WhatsApp 專屬行為（歷史記錄注入、提及處理細節），請參閱 [Group messages](/zh-Hant/channels/group-messages)。

## 相關內容

- [Broadcast groups](/zh-Hant/channels/broadcast-groups)
- [Channel routing](/zh-Hant/channels/channel-routing)
- [Group messages](/zh-Hant/channels/group-messages)
- [Pairing](/zh-Hant/channels/pairing)
