---
summary: "Group chat behavior across surfaces (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groups"
---

# 群組

OpenClaw 在各個平台上的一致地處理群組聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams、Zalo。

## 初學者介紹（2 分鐘）

OpenClaw “lives” on your own messaging accounts. There is no separate WhatsApp bot user.
If **you** are in a group, OpenClaw can see that group and respond there.

預設行為：

- Groups are restricted (`groupPolicy: "allowlist"`).
- 回覆需要提及，除非您明確停用提及閘門（mention gating）。

翻譯：在允許清單中的發送者可以透過提及來觸發 OpenClaw。

> TL;DR
>
> - **DM access** is controlled by `*.allowFrom`.
> - **Group access** is controlled by `*.groupPolicy` + allowlists (`*.groups`, `*.groupAllowFrom`).
> - **Reply triggering** is controlled by mention gating (`requireMention`, `/activation`).

快速流程（群組訊息會發生什麼事）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果您想要...

| 目標                            | 設定方式                                                   |
| ------------------------------- | ---------------------------------------------------------- |
| 允許所有群組但僅在 @提及 時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                    | `groups: { "<group-id>": { ... } }` (no `"*"` key)         |
| 只有您能在群組中觸發            | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- Group sessions use `agent:<agentId>:<channel>:group:<id>` session keys (rooms/channels use `agent:<agentId>:<channel>:channel:<id>`).
- Telegram forum topics add `:topic:<threadId>` to the group id so each topic has its own session.
- 直接訊息使用主工作階段（或若有設定則使用每個發送者的工作階段）。
- 群組工作階段會跳過心跳檢測（heartbeats）。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DM** 而「公開」流量是 **群組**，這會運作得很好。

Why: in single-agent mode, DMs typically land in the **main** session key (`agent:main:main`), while groups always use **non-main** session keys (`agent:main:<channel>:group:<id>`). If you enable sandboxing with `mode: "non-main"`, those group sessions run in Docker while your main DM session stays on-host.

這為您提供一個代理「大腦」（共享工作區 + 記憶），但擁有兩種執行姿態：

- **私人訊息**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> If you need truly separate workspaces/personas (“personal” and “public” must never mix), use a second agent + bindings. See [Multi-Agent Routing](/zh-Hant/concepts/multi-agent).

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

Want “groups can only see folder X” instead of “no host access”? Keep `workspaceAccess: "none"` and mount only allowlisted paths into the sandbox:

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

- Configuration keys and defaults: [Gateway configuration](/zh-Hant/gateway/configuration#agentsdefaultssandbox)
- Debugging why a tool is blocked: [Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts details: [Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- 如有可用的 UI 標籤會使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道使用的；群組聊天使用 `g-<slug>` (小寫，空格 -> `-`，保留 `#@+._-`)。

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

- `groupPolicy` 與提及閘門分開 (提及閘門需要 @mentions)。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom` (後備方案：明確的 `allowFrom`)。
- DM 配對審核 (`*-allowFrom` 儲存項目) 僅適用於 DM 存取；群組傳送者授權保持對群組允許清單的明確指定。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups` (房間 ID、別名或名稱)。使用 `channels.matrix.groupAllowFrom` 來限制傳送者；也支援每個房間 `users` 允許清單。
- 群組 DM 受到單獨控制 (`channels.discord.dm.*`、`channels.slack.dm.*`)。
- Telegram 允許清單可以比對使用者 ID (`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`) 或使用者名稱 (`"@alice"` 或 `"alice"`)；前綴區分大小寫。
- 預設值為 `groupPolicy: "allowlist"`；如果您的群組允許清單是空的，則群組訊息將被阻擋。
- 執行時期安全性：當提供者區塊完全缺失 (`channels.<provider>` 缺失) 時，群組策略會退回到失效安全模式 (通常是 `allowlist`)，而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型（群組訊息的評估順序）：

1. `groupPolicy` (開放/停用/允許清單)
2. 群組允許清單 (`*.groups`、`*.groupAllowFrom`、特定頻道的允許清單)
3. 提及閘門 (`requireMention`、`/activation`)

## 提及閘控（預設）

除非針對特定群組另有覆寫，否則群組訊息需要提及。預設值位於各子系統下的 `*.groups."*"`。

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

- `mentionPatterns` 是不區分大小寫的安全正則表達式模式；無效的模式和不安全的巢狀重複形式會被忽略。
- 提供明確提及的介面仍會通過；模式僅作為後備方案。
- 個別代理覆寫：`agents.list[].groupChat.mentionPatterns`（當多個代理共用一個群組時很有用）。
- 僅當可以進行提及檢測（已設定原生提及或 `mentionPatterns`）時，才會強制執行提及閘道。
- Discord 的預設值位於 `channels.discord.guilds."*"`（可針對每個伺服器/頻道覆寫）。
- 群組歷史記錄上下文在所有頻道中統一包裝，並且僅包含**待處理**訊息（因提及閘道而跳過的訊息）；請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（選用）

部分頻道設定支援限制**在特定群組/聊天室/頻道內**可使用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內針對個別發送者的覆寫。
  使用明確的金鑰前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴金鑰仍被接受，並且僅作為 `id:` 進行比對。

解析順序（較具體者優先）：

1. 群組/頻道 `toolsBySender` 比對
2. 群組/頻道 `tools`
3. 預設（`"*"`）`toolsBySender` 比對
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

- 群組/頻道工具限制會與全域/代理工具原則一併套用（拒絕仍優先）。
- 某些頻道對房間/頻道使用不同的巢狀結構（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、MS Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些金鑰會充當群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設提及行為。

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

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定，則為機器人自身的 E.164 號碼）。請將該指令作為獨立訊息發送。其他平台目前會忽略 `/activation`。

## Context 欄位

群組入站負載會設定：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及門控結果）
- Telegram 論壇主題也包含 `MessageThreadId` 和 `IsForum`。

代理系統提示會在新群組會話的第一輪包含群組簡介。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面上的 `\n` 序列。

## iMessage 詳情

- 在路由或加入允許列表時，請優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會傳回同一個 `chat_id`。

## WhatsApp 詳情

請參閱 [群組訊息](/zh-Hant/channels/group-messages) 以了解僅限 WhatsApp 的行為（歷史記錄注入、提及處理細節）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
