---
summary: "各個平台上的群組聊天行為（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams）"
read_when:
  - 變更群組聊天行為或提及閘控
title: "Groups"
---

# 群組

OpenClaw 在各平台上始終如一地處理群組聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams。

## 初學者介紹（2 分鐘）

OpenClaw “寄宿”在您自己的訊息帳號上。沒有獨立的 WhatsApp 機器人使用者。
如果 **您** 在某個群組中，OpenClaw 就能看到該群組並在那裡回覆。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 回覆需要提及，除非您明確停用提及門控。

翻譯：允許清單上的發送者可以透過提及來觸發 OpenClaw。

> TL;DR
>
> - **DM 存取權** 由 `*.allowFrom` 控制。
> - **群組存取權** 由 `*.groupPolicy` + 允許清單 (`*.groups`, `*.groupAllowFrom`) 控制。
> - **回覆觸發** 由提及閘控 (`requireMention`, `/activation`) 控制。

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
| 僅限特定群組 | `groups: { "<group-id>": { ... } }` (無 `"*"` 金鑰) |
| 只有您能在群組中觸發 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 會話金鑰

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（聊天室/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，以便每個主題都有自己的會話。
- 直接聊天使用主會話（或在有設定時使用每個發送者的會話）。
- 群組會話會跳過心跳檢測。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 —— 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這運作得很好。

原因：在單一代理程式模式下，私訊通常會進入 **主要** 會話金鑰 (`agent:main:main`)，而群組總是使用 **非主要** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在 Docker 中執行，而您的主要私訊會話則保持在主機上。

這為您提供了一個代理「大腦」（共享工作區 + 記憶），但兩種執行模式：

- **私訊**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正分開的工作區/角色（「個人」和「公開」絕不能混雜），請使用第二個代理程式 + 綁定。請參閱 [Multi-Agent Routing](/zh-Hant/concepts/multi-agent)。

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

希望「群組只能看到資料夾 X」而不是「無主機存取權」？請保留 `workspaceAccess: "none"`，並僅將允許清單中的路徑掛載到沙盒中：

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

- 組態金鑰與預設值：[Gateway configuration](/zh-Hant/gateway/configuration#agentsdefaultssandbox)
- 除錯工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mount 詳細資訊：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI labels use `displayName` when available, formatted as `<channel>:<token>`.
- `#room` is reserved for rooms/channels; group chats use `g-<slug>` (lowercase, spaces -> `-`, keep `#@+._-`).

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

- `groupPolicy` is separate from mention-gating (which requires @mentions).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams: use `groupAllowFrom` (fallback: explicit `allowFrom`).
- Discord: allowlist uses `channels.discord.guilds.<id>.channels`.
- Slack: allowlist uses `channels.slack.channels`.
- Matrix: allowlist uses `channels.matrix.groups` (room IDs, aliases, or names). Use `channels.matrix.groupAllowFrom` to restrict senders; per-room `users` allowlists are also supported.
- Group DMs are controlled separately (`channels.discord.dm.*`, `channels.slack.dm.*`).
- Telegram allowlist can match user IDs (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) or usernames (`"@alice"` or `"alice"`); prefixes are case-insensitive.
- Default is `groupPolicy: "allowlist"`; if your group allowlist is empty, group messages are blocked.

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy` (open/disabled/allowlist)
2. group allowlists (`*.groups`, `*.groupAllowFrom`, channel-specific allowlist)
3. mention gating (`requireMention`, `/activation`)

## 提及閘道（預設）

Group messages require a mention unless overridden per group. Defaults live per subsystem under `*.groups."*"`.

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

- `mentionPatterns` are case-insensitive regexes.
- 提供明確提及的介面仍然會通過；模式是後備方案。
- Per-agent override: `agents.list[].groupChat.mentionPatterns` (useful when multiple agents share a group).
- Mention gating is only enforced when mention detection is possible (native mentions or `mentionPatterns` are configured).
- Discord 預設值位於 `channels.discord.guilds."*"` 中（可依伺服器/頻道覆寫）。
- 群組歷程背景內容在各頻道間均以統一方式包裝，且為**僅待處理**（因提及閘門而略過的訊息）；使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（可選）

某些通道設定支援限制在**特定群組/房間/頻道內**可使用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內依發送者進行的覆寫（金鑰為發送者 ID/使用者名稱/電子郵件/電話號碼，視頻道而定）。使用 `"*"` 作為萬用字元。

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
- 部分頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，金鑰會充當群組許可清單。使用 `"*"` 以允許所有群組，同時仍設定預設提及行為。

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

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定，則為機器人自身的 E.164）。將指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## 內容欄位

群組傳入的 Payload 會設定：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及閘門結果）
- Telegram 論壇主題還包含 `MessageThreadId` 和 `IsForum`。

代理系統提示在新群組會話的第一輪中包含群組介紹。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面的 `\n` 序列。

## iMessage 詳細說明

- 路由或加入允許清單時，優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆一律會回到同一個 `chat_id`。

## WhatsApp 詳細說明

請參閱 [Group messages](/zh-Hant/concepts/group-messages) 以了解僅限 WhatsApp 的行為（歷史記錄注入、提及處理細節）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
