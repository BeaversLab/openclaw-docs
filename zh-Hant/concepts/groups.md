---
summary: "各平台的群組聊天行為（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在各平台上始終如一地處理群組聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 初學者介紹（2 分鐘）

OpenClaw 「駐留」在您自己的通訊帳戶上。沒有獨立的 WhatsApp 機器人使用者。
如果 **您** 在群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受限 (`groupPolicy: "allowlist"`)。
- 回覆需要提及，除非您明確停用提及門控。

翻譯：允許清單上的發送者可以透過提及來觸發 OpenClaw。

> TL;DR
>
> - **DM 存取權** 由 `*.allowFrom` 控制。
> - **群組存取權** 由 `*.groupPolicy` + 允許清單 (`*.groups`, `*.groupAllowFrom`) 控制。
> - **回覆觸發** 由提及門控 (`requireMention`, `/activation`) 控制。

快速流程（群組訊息會發生什麼事）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果您想要...
| 目標 | 設定方式 |
|------|-------------|
| 允許所有群組，但僅在 @提及時回覆 | `groups: { "*": { requireMention: true } }` |
| 停用所有群組回覆 | `groupPolicy: "disabled"` |
| 僅限特定群組 | `groups: { "<group-id>": { ... } }` (沒有 `"*"` 鍵) |
| 只有您能在群組中觸發 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 會話金鑰

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會在群組 ID 中加入 `:topic:<threadId>`，因此每個主題都有自己的會話。
- 直接聊天使用主會話（或在有設定時使用每個發送者的會話）。
- 群組會話會跳過心跳檢測。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 —— 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這運作得很好。

原因：在單代理模式下，私訊通常會進入**主要**會話金鑰 (`agent:main:main`)，而群組總是使用**非主要**會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在 Docker 中運行，而您的主要私訊會話則保持在主機上。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但兩種執行模式：

- **私訊**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正分開的工作區/角色（「個人」和「公開」絕不能混合），請使用第二個代理 + 綁定。參見 [多代理路由](/zh-Hant/concepts/multi-agent)。

範例（私訊在主機上，群組在沙盒中 + 僅限傳訊工具）：

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
            "~/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

相關：

- 配置鍵與預設值：[閘道器配置](/zh-Hant/gateway/configuration#agentsdefaultssandbox)
- 除錯工具被封鎖的原因：[沙盒 vs 工具策略 vs 提升權限](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- 綁定掛載詳情：[沙盒機制](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

## 群組策略

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
      groupAllowFrom: ["123456789", "@username"],
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

| 策略          | 行為                                    |
| ------------- | --------------------------------------- |
| `"open"`      | 群組略過允許清單；提及限制仍然適用。    |
| `"disabled"`  | 完全封鎖所有群組訊息。                  |
| `"allowlist"` | 僅允許符合所設定的允許清單的群組/房間。 |

備註：

- `groupPolicy` 與提及限制（需要 @提及）分開。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`（房間 ID、別名或名稱）。使用 `channels.matrix.groupAllowFrom` 限制發送者；也支援每個房間 `users` 允許清單。
- 群組 DM 受單獨控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允許清單可以匹配用戶 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用戶名（`"@alice"` 或 `"alice"`）；前綴不區分大小寫。
- 預設值為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，則會封鎖群組訊息。

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy`（開放/停用/允許清單）
2. 群組允許清單（`*.groups`、`*.groupAllowFrom`、特定頻道允許清單）
3. 提及閘道（`requireMention`、`/activation`）

## 提及閘道（預設）

除非針對每個群組進行覆蓋，否則群組訊息需要提及。預設值位於 `*.groups."*"` 下的每個子系統中。

回覆機器人訊息視為隱式提及（當頻道支援回覆中繼資料時）。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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

- `mentionPatterns` 是不區分大小寫的正則表達式。
- 提供明確提及的介面仍然會通過；模式是後備方案。
- 每個代理的覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
- 只有在可以進行提及偵測時（已配置原生提及或 `mentionPatterns`），才會強制執行提及閘道。
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可依照伺服器/頻道覆蓋）。
- 群組歷史背景在頻道之間被統一包裝，並且僅包含**待處理**訊息（因提及閘道而被跳過的訊息）；使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（可選）

某些通道設定支援限制在**特定群組/房間/頻道內**可使用的工具。

- `tools`：針對整個群組允許/拒絕工具。
- `toolsBySender`：群組內針對個別發送者的覆寫設定（鍵值為發送者 ID/使用者名稱/電子郵件/電話號碼，視通道而定）。將 `"*"` 用作萬用字元。

解析順序（越具體者優先）：

1. 群組/頻道 `toolsBySender` 符合
2. 群組/頻道 `tools`
3. 預設 (`"*"`) `toolsBySender` 符合
4. 預設 (`"*"`) `tools`

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
            "123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

備註：

- 群組/頻道工具限制會與全域/代理工具策略一併套用（拒絕設定依然優先）。
- 部分通道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵值會作為群組允許清單。使用 `"*"` 可允許所有群組，同時仍設定預設的提及行為。

常見用途（複製/貼上）：

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

3. 允許所有群組但要求提及（明確指定）

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

## 啟用（僅限擁有者）

群組擁有者可以切換各群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人的自身 E.164 號碼）。請將指令作為獨立訊息傳送。其他介面目前會忽略 `/activation`。

## 內容欄位

群組傳入的 Payload 會設定：

- `ChatType=group`
- `GroupSubject` (如果已知)
- `GroupMembers` (如果已知)
- `WasMentioned` (提及閘道結果)
- Telegram 論壇主題也包含 `MessageThreadId` 和 `IsForum`。

代理系統提示詞在新群組會話的第一輪包含群組介紹。它提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面的 `\n` 序列。

## iMessage 詳細說明

- 在路由或加入允許清單時，偏好使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是回到同一個 `chat_id`。

## WhatsApp 詳細說明

請參閱 [群組訊息](/zh-Hant/concepts/group-messages) 以了解 WhatsApp 專用行為（歷史記錄注入、提及處理詳細資訊）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
