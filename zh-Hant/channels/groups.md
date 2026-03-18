---
summary: "各個平台（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo）的群組聊天行為"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在各個平台上的一致地處理群組聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams、Zalo。

## 初學者介紹（2 分鐘）

OpenClaw 「活」在您自己的訊息帳號上。沒有額外的 WhatsApp 機器人用戶。
如果 **您** 在某個群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 回覆需要提及，除非您明確停用提及閘門（mention gating）。

翻譯：在允許清單中的發送者可以透過提及來觸發 OpenClaw。

> TL;DR
>
> - **DM 存取權** 由 `*.allowFrom` 控制。
> - **群組存取權** 由 `*.groupPolicy` + 允許清單 (`*.groups`, `*.groupAllowFrom`) 控制。
> - **回覆觸發** 由提及閘門 (`requireMention`, `/activation`) 控制。

快速流程（群組訊息會發生什麼事）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![群組訊息流程](/images/groups-flow.svg)

如果您想要...

| 目標                            | 設定方式                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| 允許所有群組但僅在 @提及 時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                    | `groups: { "<group-id>": { ... } }` (沒有 `"*"` 金鑰)      |
| 只有您能在群組中觸發            | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- 群組工作階段使用 `agent:<agentId>:<channel>:group:<id>` 工作階段金鑰（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 加入群組 ID，因此每個主題都有自己的工作階段。
- 直接訊息使用主工作階段（或若有設定則使用每個發送者的工作階段）。
- 群組工作階段會跳過心跳檢測（heartbeats）。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這會運作得很好。

為何：在單代理模式下，私人訊息通常會落在 **主** 會話金鑰 (`agent:main:main`) 中，而群組總是使用 **非主** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在 Docker 中運行，而您的主私人訊息會話則保持在主機上。

這為您提供一個代理「大腦」（共享工作區 + 記憶），但擁有兩種執行姿態：

- **私人訊息**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正分開的工作區/角色（「私人」和「公開」絕不能混合），請使用第二個代理 + 綁定。請參閱 [多代理路由](/zh-Hant/concepts/multi-agent)。

範例（私人訊息在主機上，群組在沙盒中 + 僅限訊息工具）：

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

希望「群組只能看到資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙盒中：

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

- 配置金鑰和預設值：[閘道配置](/zh-Hant/gateway/configuration#agentsdefaultssandbox)
- 調試工具為何被封鎖：[沙盒 vs 工具策略 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- 綁定掛載詳情：[沙盒機制](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

## 群組策略

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
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
    },
  },
}
```

| 策略          | 行為                                  |
| ------------- | ------------------------------------- |
| `"open"`      | 群組略過允許清單；提及閘門仍然適用。  |
| `"disabled"`  | 完全封鎖所有群組訊息。                |
| `"allowlist"` | 僅允許符合已配置允許清單的群組/房間。 |

備註：

- `groupPolicy` 與提及閘門（需要 @提及）分開。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
- DM 配對審核（`*-allowFrom` store entries）僅適用於 DM 存取；群組發送者授權仍明確限制於群組許可清單。
- Discord：許可清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：許可清單使用 `channels.slack.channels`。
- Matrix：許可清單使用 `channels.matrix.groups`（房間 ID、別名或名稱）。使用 `channels.matrix.groupAllowFrom` 限制發送者；也支援各別房間的 `users` 許可清單。
- 群組 DM 受單獨控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram 許可清單可匹配使用者 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴區分大小寫。
- 預設值為 `groupPolicy: "allowlist"`；如果您的群組許可清單為空，則會封鎖群組訊息。
- 執行時期安全性：當供應者區塊完全缺失（`channels.<provider>` 不存在）時，群組政策會退回到故障關閉模式（通常是 `allowlist`），而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy`（open/disabled/allowlist）
2. 群組許可清單（`*.groups`、`*.groupAllowFrom`、通道特定許可清單）
3. 提及閘控（`requireMention`、`/activation`）

## 提及閘控（預設）

群組訊息需要提及，除非針對各別群組有特別覆寫。預設值依子系統存於 `*.groups."*"` 之下。

回覆機器人訊息被視為隱含提及（當通道支援回覆元資料時）。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 提供明確提及的介面仍會通過；模式僅作為後備方案。
- 各別代理覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
- 僅在可能進行提及偵測（原生提及或設定 `mentionPatterns`）時，才會執行提及閘門。
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可針對每個伺服器/頻道覆寫）。
- 群組歷史記錄內容在各頻道間統一包裝，且僅包含**待處理**項（因提及閘門而跳過的訊息）；使用 `messages.groupChat.historyLimit` 作為全域預設值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（選用）

部分頻道設定支援限制**在特定群組/聊天室/頻道內**可使用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內的個別發送者覆寫。
  使用明確的金鑰前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴金鑰仍被接受，且僅匹配為 `id:`。

解析順序（較具體者優先）：

1. 群組/頻道 `toolsBySender` 匹配
2. 群組/頻道 `tools`
3. 預設（`"*"`） `toolsBySender` 匹配
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

- 群組/頻道工具限制會與全域/代理工具原則一併套用（拒絕仍優先）。
- 部分頻道對聊天室/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些金鑰會作為群組允許清單。使用 `"*"` 允許所有群組，同時仍設定預設提及行為。

常見意圖（複製/貼上）：

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

4. 只有擁有者可以在群組中觸發 (WhatsApp)

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

群組擁有者可以切換各個群組的啟動狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定，則為機器人自身的 E.164）。請將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組入站負載會設定：

- `ChatType=group`
- `GroupSubject` (如果已知)
- `GroupMembers` (如果已知)
- `WasMentioned` (提及閘道結果)
- Telegram 論壇主題還包括 `MessageThreadId` 和 `IsForum`。

代理系統提示會在新群組會話的第一輪中包含群組介紹。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面上的 `\n` 序列。

## iMessage 詳情

- 在路由或設定允許清單時，建議優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆一律會傳回同一個 `chat_id`。

## WhatsApp 詳情

請參閱 [Group messages](/zh-Hant/channels/group-messages) 以了解 WhatsApp 專屬的行為（歷史記錄注入、提及處理詳情）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
