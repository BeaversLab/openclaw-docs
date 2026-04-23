---
summary: "跨表面的群組聊天行為（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在所有表面上對待群組聊天的方式是一致的：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

## 初學者介紹 (2 分鐘)

OpenClaw 「存在」於您自己的訊息帳號上。沒有額外的 WhatsApp 機器人用戶。
如果 **您** 在群組中，OpenClaw 就能看到該群組並在其中回覆。

預設行為：

- 群組受到限制（`groupPolicy: "allowlist"`）。
- 回覆需要被提及，除非您明確停用提及閘門。

翻譯：允許清單上的傳送者可以透過提及 OpenClaw 來觸發它。

> TL;DR
>
> - **DM 存取權**由 `*.allowFrom` 控制。
> - **群組存取權**由 `*.groupPolicy` + 允許清單（`*.groups`、`*.groupAllowFrom`）控制。
> - **回覆觸發**由提及閘控（`requireMention`、`/activation`）控制。

快速流程 (群組訊息會發生什麼事)：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## 上下文可見性與允許清單

群組安全性涉及兩個不同的控制項：

- **觸發授權**：誰可以觸發代理程式（`groupPolicy`、`groups`、`groupAllowFrom`、特定通道的允許清單）。
- **上下文可見性**：將哪些補充上下文注入到模型中（回覆文字、引言、執行緒歷史記錄、轉發的元資料）。

根據預設，OpenClaw 優先考慮正常的聊天行為，並主要按接收到的狀態保留上下文。這表示允許清單主要決定誰可以觸發動作，而不是對每個引言或歷史片段設定通用的編輯界線。

目前的行為因通道而異：

- 某些通道已經在特定路徑中對補充上下文套用基於發送者的過濾（例如 Slack 執行緒植入、Matrix 回覆/執行緒查詢）。
- 其他通道仍會按接收到的狀態傳遞引言/回覆/轉發上下文。

強化方向（計劃中）：

- `contextVisibility: "all"`（預設）保持目前按接收狀態處理的行為。
- `contextVisibility: "allowlist"` 將補充上下文過濾為僅包含允許清單中的發送者。
- `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一個明確的引言/回覆例外。

在該強化模型於所有通道中一致實施之前，請預期各介面之間會有差異。

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                           | 設定方式                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| 允許所有群組但僅在 @提及时回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆               | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                   | `groups: { "<group-id>": { ... } }`（無 `"*"` 金鑰）       |
| 僅限您可以在群組中觸發         | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- 群組工作階段使用 `agent:<agentId>:<channel>:group:<id>` 工作階段金鑰（房間/通道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，因此每個主題都有自己的工作階段。
- 直接訊息使用主要工作階段（或如果已設定，則使用每個發送者的工作階段）。
- 群組工作階段會跳過心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「私人」流量是 **DMs**，而您的「公開」流量是 **groups**，這樣的效果很好。

原因：在單一代理模式下，私人訊息通常會進入 **主** 會話金鑰 (`agent:main:main`)，而群組總是使用 **非主** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果你使用 `mode: "non-main"` 啟用沙盒，這些群組會話將在設定的沙盒後端運行，而你的主私人訊息會話則保持在主機上。如果你未選擇後端，Docker 是預設後端。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但兩種執行模式：

- **DMs**：完整工具（主機）
- **群組**：沙盒 + 受限工具

> 如果您需要真正獨立的工作區/角色（「私人」和「公開」絕不能混合），請使用第二個代理 + 綁定。請參閱 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。

範例（DMs 在主機上，groups 受沙箱限制 + 僅限訊息傳遞工具）：

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

想要「groups 只能存取資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙箱中：

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

相關：

- 配置金鑰和預設值：[Gateway configuration](/zh-Hant/gateway/configuration-reference#agentsdefaultssandbox)
- 調試工具被阻止的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給 rooms/channels 的；group chats 使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

## 群組原則

控制每個頻道如何處理 group/room 訊息：

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

| 原則          | 行為                                    |
| ------------- | --------------------------------------- |
| `"open"`      | 群組繞過允許清單；提及閘控仍然適用。    |
| `"disabled"`  | 完全阻止所有群組訊息。                  |
| `"allowlist"` | 僅允許符合配置允許清單的 groups/rooms。 |

注意：

- `groupPolicy` 與 mention-gating（需要 @mentions）是分開的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
- DM 配對批准 (`*-allowFrom` store entries) 僅適用於 DM 存取；群組發送者授權則明確依賴群組允許清單。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`。優先使用房間 ID 或別名；已加入房間的名稱查詢屬於盡力而為，未解析的名稱會在執行時被忽略。使用 `channels.matrix.groupAllowFrom` 來限制發送者；也支援每個房間 `users` 允許清單。
- 群組 DM 分別受到控制 (`channels.discord.dm.*`, `channels.slack.dm.*`)。
- Telegram 允許清單可以符合使用者 ID (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) 或使用者名稱 (`"@alice"` 或 `"alice"`)；前綴區分大小寫。
- 預設值為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，群組訊息將會被封鎖。
- 執行時期安全性：當供應者區塊完全遺失 (`channels.<provider>` 缺席) 時，群組原則會退回到失敗關閉模式 (通常是 `allowlist`)，而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型 (群組訊息的評估順序)：

1. `groupPolicy` (open/disabled/allowlist)
2. 群組允許清單 (`*.groups`, `*.groupAllowFrom`, 特定頻道允許清單)
3. 提及閘控 (`requireMention`, `/activation`)

## 提及閘控 (預設)

群組訊息需要提及，除非每個群組有另外覆寫。預設值位於每個子系統下的 `*.groups."*"`。

當頻道支援回覆元數據時，回覆機器人訊息會被視為隱式提及。在暴露引用元數據的頻道上，引用機器人訊息也可以被視為隱式提及。目前內建的案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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

備註：

- `mentionPatterns` 是不區分大小寫的安全正規表示式模式；無效的模式和不安全的巢狀重複形式會被忽略。
- 提供明確提及的介面仍然會通過；模式是後備方案。
- 每個代理的覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
- 僅在可進行提及偵測時（已設定原生提及或 `mentionPatterns`）才會執行提及閘控。
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可依伺服器/頻道覆寫）。
- 群組歷史記錄語境在各頻道間以統一方式包裝，且為**僅限待處理**（因提及閘控而跳過的訊息）；請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（選用）

部分頻道設定支援限制**特定群組/房間/頻道內**可用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內依發送者覆寫。
  使用明確的索引鍵前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴的索引鍵仍被接受，且僅作為 `id:` 比對。

解析順序（愈具體者優先）：

1. 群組/頻道 `toolsBySender` 比對
2. 群組/頻道 `tools`
3. 預設（`"*"`） `toolsBySender` 比對
4. 預設（`"*"`） `tools`

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

備註：

- 群組/頻道工具限制是套用於全域/代理工具原則之外（拒絕仍優先）。
- 部分頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些索引鍵會充當群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設的提及行為。

常見誤解：DM 配對核准不同於群組授權。
對於支援 DM 配對的頻道，配對儲存庫僅解鎖 DM。群組指令仍需要來自設定允許清單（例如 `groupAllowFrom`）或該頻道記載的設定回退方案的明確群組發送者授權。

常見意圖（複製/貼上）：

1. 停用所有群組回覆

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. 僅允許特定群組 (WhatsApp)

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

3. 允許所有群組但需要提及（明確）

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 僅擁有者可在群組中觸發 (WhatsApp)

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

## 啟動（僅限擁有者）

群組擁有者可以切換各群組的啟動狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組輸入 payload 設定：

- `ChatType=group`
- `GroupSubject` (如果已知)
- `GroupMembers` (如果已知)
- `WasMentioned` (提及閘道結果)
- Telegram 論壇主題也包含 `MessageThreadId` 和 `IsForum`。

頻道特定說明：

- BlueBubbles 可以選擇在填入 `GroupMembers` 之前，從本機聯絡人資料庫中豐富未命名的 macOS 群組參與者資訊。此功能預設為關閉，且僅在正常的群組閘道檢查通過後執行。

代理系統提示在新群組會話的第一輪包含群組簡介。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，盡量減少空行並遵循一般聊天間距，並避免輸入字面意義上的 `\n` 序列。

## iMessage 詳細資訊

- 在路由或建立允許清單時，偏好使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會發回至相同的 `chat_id`。

## WhatsApp 詳細資訊

請參閱 [群組訊息](/zh-Hant/channels/group-messages) 以了解 WhatsApp 專屬行為（歷史記錄注入、提及處理細節）。
