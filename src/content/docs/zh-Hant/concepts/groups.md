---
summary: "各平台上的群聊行為 (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams)"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在各平台上對群聊的處理方式保持一致：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 初學者介紹 (2 分鐘)

OpenClaw 「駐留」在您自己的訊息帳號上。沒有額外的 WhatsApp 機器人用戶。
如果 **您** 在一個群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受限 (`groupPolicy: "allowlist"`)。
- 除非您明確停用提及閘門，否則回覆需要提及。

翻譯：允許清單上的發送者可以透過提及 OpenClaw 來觸發它。

> TL;DR
>
> - **DM 存取權**由 `*.allowFrom` 控制。
> - **群組存取權**由 `*.groupPolicy` + 允許清單（`*.groups`、`*.groupAllowFrom`）控制。
> - **回覆觸發**由提及閘控（`requireMention`、`/activation`）控制。

快速流程（群組訊息會發生什麼）：

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
| 僅限特定群組 | `groups: { "<group-id>": { ... } }`（無 `"*"` 索引鍵） |
| 僅限您自己在群組中觸發 | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |

## Session keys

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（聊天室/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，以便每個主題都有自己的會話。
- 直接聊天使用主會話（若已配置，則為每位傳送者各一個會話）。
- 群組會話會略過心跳檢測。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DM**，而您的「公開」流量是 **群組**，這樣的效果很好。

原因：在單一代理程式模式下，DM 通常會進入 **主要** 會話金鑰（`agent:main:main`），而群組則總是使用 **非主要** 會話金鑰（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 啟用沙箱機制，這些群組會話將在 Docker 中執行，而您的主要 DM 會話則保持在主機上。

這讓您擁有一個代理程式「大腦」（共用工作區 + 記憶體），但具有兩種執行模式：

- **DMs（私人訊息）**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正分離的工作區/角色（「個人」和「公開」絕不能混淆），請使用第二個代理程式 + 綁定。請參閱 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。

範例（DMs 在主機上，群組在沙盒中 + 僅限訊息工具）：

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

想要「群組只能看到資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並且僅將允許清單中的路徑掛載到沙盒中：

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

- 設定金鑰和預設值：[Gateway configuration](/zh-Hant/gateway/configuration#agentsdefaultssandbox)
- 偵錯工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mount 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道使用的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

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

| 政策          | 行為                                 |
| ------------- | ------------------------------------ |
| `"open"`      | 群組繞過允許清單；提及閘門仍然適用。 |
| `"disabled"`  | 完全封鎖所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

備註：

- `groupPolicy` 與提及閘門（需要 @mentions）分開。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`（房間 ID、別名或名稱）。使用 `channels.matrix.groupAllowFrom` 限制發送者；亦支援每個房間的 `users` 允許清單。
- 群組 DM 分開控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允許清單可比對使用者 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或使用者名稱（`"@alice"` 或 `"alice"`）；前綴區分大小寫。
- 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單為空，群組訊息將會被阻擋。

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy` (open/disabled/allowlist)
2. 群組允許清單 (`*.groups`, `*.groupAllowFrom`, channel-specific allowlist)
3. 提及閘道 (`requireMention`, `/activation`)

## 提及閘道（預設）

除非針對特定群組另有設定，否則群組訊息需要提及。預設值依各子系統儲存在 `*.groups."*"` 下。

回覆機器人訊息視為隱含提及（當頻道支援回覆中繼資料時）。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 提供明確提及的介面仍然通過；模式是後備方案。
- 每個代理的覆寫：`agents.list[].groupChat.mentionPatterns` （當多個代理共享一個群組時很有用）。
- 僅在可以進行提及偵測時（已配置原生提及或 `mentionPatterns`），才會執行提及閘門。
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可按伺服器/頻道覆寫）。
- 群組歷史記錄上下文在所有頻道中統一包裝，並且為 **僅待處理**（因提及閘門而跳過的訊息）；使用 `messages.groupChat.historyLimit` 作為全域預設值，使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（可選）

某些頻道設定支援限制 **特定群組/房間/頻道內** 可用的工具。

- `tools`：針對整個群組的允許/拒絕工具。
- `toolsBySender`：群組內針對發送者的覆寫（鍵值為根據頻道而定的發送者 ID/使用者名稱/電子郵件/電話號碼）。使用 `"*"` 作為萬用字元。

解析順序（最優先者生效）：

1. 群組/頻道 `toolsBySender` 匹配
2. 群組/頻道 `tools`
3. 預設 (`"*"`) `toolsBySender` 匹配
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

- 群組/頻道工具限制會與全域/代理工具政策一起套用（拒絕仍然優先）。
- 部分頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會作為群組允許清單。請使用 `"*"` 允許所有群組，同時仍設定預設提及行為。

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

4. 僅擁有者可在群組中觸發（WhatsApp）

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

## 啟用（僅擁有者）

群組擁有者可以切換各個群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定，則為機器人自身的 E.164）。將指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組入站 payload 設定：

- `ChatType=group`
- `GroupSubject` (若已知)
- `GroupMembers` (若已知)
- `WasMentioned` (提及閘道結果)
- Telegram 論壇主題還包含 `MessageThreadId` 和 `IsForum`。

代理系統提示在新群組會話的第一輪中包含群組簡介。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面的 `\n` 序列。

## iMessage 詳情

- 在路由或設定允許清單時，偏好使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會回到同一個 `chat_id`。

## WhatsApp 規格

請參閱 [Group messages](/zh-Hant/concepts/group-messages) 以了解 WhatsApp 專屬行為（歷史記錄注入、提及處理詳情）。
