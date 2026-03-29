---
summary: "各平台的群組聊天行為 (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在各平台上對群組聊天的處理方式是一致的：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams、Zalo。

## 初學者介紹 (2 分鐘)

OpenClaw 「存在」於您自己的訊息帳號上。沒有額外的 WhatsApp 機器人用戶。
如果 **您** 在群組中，OpenClaw 就能看到該群組並在其中回覆。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 回覆需要被提及，除非您明確停用提及閘門。

翻譯：允許清單上的傳送者可以透過提及 OpenClaw 來觸發它。

> TL;DR
>
> - **DM 存取** 由 `*.allowFrom` 控制。
> - **群組存取** 由 `*.groupPolicy` + 允許清單 (`*.groups`, `*.groupAllowFrom`) 控制。
> - **回覆觸發** 由提及閘門 (`requireMention`, `/activation`) 控制。

快速流程 (群組訊息會發生什麼事)：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                             | 設定方式                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                 | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                     | `groups: { "<group-id>": { ... } }` (沒有 `"*"` 金鑰)      |
| 只有您能在群組中觸發             | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- 群組工作階段使用 `agent:<agentId>:<channel>:group:<id>` 工作階段金鑰 (聊天室/頻道使用 `agent:<agentId>:<channel>:channel:<id>`)。
- Telegram 論壇主題會在群組 ID 中加入 `:topic:<threadId>`，讓每個主題都有自己的工作階段。
- 直接聊天使用主要工作階段 (若已設定，則為每位傳送者獨立)。
- 群組工作階段會跳過心跳。

## 模式：個人 DM + 公開群組 (單一代理程式)

是的 — 如果您的「個人」流量是 **DM**，而您的「公開」流量是 **群組**，這個模式運作良好。

原因：在單代理模式下，私人訊息通常會進入**主要**會話金鑰 (`agent:main:main`)，而群組則始終使用**非主要**會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您啟用沙盒化功能 (`mode: "non-main"`)，這些群組會話將在 Docker 中運行，而您的主要私人訊息會話則保持在主機上。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但具有兩種執行態勢：

- **私人訊息**：完整工具 (主機)
- **群組**：沙盒 + 受限工具 (Docker)

> 如果您需要真正獨立的工作區/角色（「個人」和「公開」絕不能混合），請使用第二個代理 + 綁定。請參閱 [多代理路由](/en/concepts/multi-agent)。

範例（私人訊息在主機上，群組在沙盒中 + 僅限訊息傳遞工具）：

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

想要「群組只能看到資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙盒中：

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

- 設定鍵和預設值：[閘道設定](/en/gateway/configuration-reference#agentsdefaultssandbox)
- 調試工具被封鎖的原因：[沙盒 vs 工具政策 vs 提升權限](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[沙盒化](/en/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道的；群組聊天使用 `g-<slug>` (小寫，空格 -> `-`，保留 `#@+._-`)。

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
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
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

備註：

- `groupPolicy` 與提及閘門（需要 @提及）分開。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom` (後備：明確的 `allowFrom`)。
- DM 配對批准（`*-allowFrom` 儲存條目）僅適用於 DM 存取；群組傳送者授權仍對群組允許清單保持明確。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`（房間 ID、別名或名稱）。使用 `channels.matrix.groupAllowFrom` 限制傳送者；也支援每個房間 `users` 允許清單。
- 群組 DM 分別控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允許清單可以匹配使用者 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴不區分大小寫。
- 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，則會封鎖群組訊息。
- 執行時期安全性：當供應者區塊完全缺失（`channels.<provider>` 缺席）時，群組政策會回退到失敗關閉模式（通常是 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy`（開放/已停用/允許清單）
2. 群組允許清單（`*.groups`、`*.groupAllowFrom`、特定頻道允許清單）
3. 提及閘控（`requireMention`、`/activation`）

## 提及閘控（預設）

群組訊息需要提及，除非針對每個群組另有覆寫。預設值存在於 `*.groups."*"` 下的每個子系統中。

回覆機器人訊息算作隱式提及（當頻道支援回覆中繼資料時）。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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

註記：

- `mentionPatterns` 是不區分大小寫的安全正規表達式模式；無效的模式和不安全的巢狀重複形式會被忽略。
- 提供明確提及的介面仍然會通過；模式是一種後備機制。
- 每個代理程式的覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理程式共用一個群組時很有用）。
- 提及門控僅在偵測到提及（原生提及或已設定 `mentionPatterns`）時才會強制執行。
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可依伺服器/頻道覆寫）。
- 群組歷史背景在所有頻道中皆以統一方式封裝，且僅包含 **待處理**（因提及門控而跳過的訊息）訊息；使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（選用）

部分頻道設定支援限制在 **特定群組/房間/頻道內** 可使用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內依發送者覆寫。
  使用明確的鍵前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴的鍵仍被接受，並僅匹配為 `id:`。

解析順序（越具體者優先）：

1. 群組/頻道 `toolsBySender` 匹配
2. 群組/頻道 `tools`
3. 預設（`"*"`）`toolsBySender` 匹配
4. 預設（`"*"`）`tools`

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

- 群組/頻道工具限制會與全域/代理程式工具政策一併套用（拒絕仍優先）。
- 部分頻道對房間/頻道使用不同的巢狀結構（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵即作為群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設提及行為。

常見用途（複製/貼上）：

1. 停用所有群組回覆

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. 僅允許特定群組（WhatsApp）

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

3. 允許所有群組但要求提及（明確）

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 只有擁有者才能在群組中觸發（WhatsApp）

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

群組擁有者可以切換每個群組的啟動狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人自身的 E.164）。將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組進入的 payload 會設定：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及閘道結果）
- Telegram 論壇主題還包含 `MessageThreadId` 和 `IsForum`。

Agent 系統提示在新的群組會話的第一輪會包含群組簡介。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面的 `\n` 序列。

## iMessage 特定事項

- 在路由或建立允許清單時，建議優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會傳回同一個 `chat_id`。

## WhatsApp 特定事項

請參閱 [群組訊息](/en/channels/group-messages) 以了解 WhatsApp 專屬的行為（歷史記錄注入、提及處理細節）。
