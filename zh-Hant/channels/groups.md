---
summary: "各平台上的群組聊天行為（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo）"
read_when:
  - Changing group chat behavior or mention gating
title: "群組"
---

# 群組

OpenClaw 在各平台上一致地處理群組聊天：WhatsApp、Telegram、Discord、Slack、Signal、iMessage、Microsoft Teams、Zalo。

## 初學者簡介（2 分鐘）

OpenClaw 「存在」於您自己的通訊帳號上。沒有單獨的 WhatsApp 機器人用戶。
如果 **您** 在某個群組中，OpenClaw 就能看到該群組並在那裡回應。

預設行為：

- 群組受到限制 (`groupPolicy: "allowlist"`)。
- 回覆需要提及，除非您明確停用提及門控。

換句話說：允許清單上的發送者可以透過提及 OpenClaw 來觸發它。

> TL;DR
>
> - **DM 存取權** 由 `*.allowFrom` 控制。
> - **群組存取權** 由 `*.groupPolicy` + 允許清單 (`*.groups`, `*.groupAllowFrom`) 控制。
> - **回覆觸發** 由提及門控 (`requireMention`, `/activation`) 控制。

快速流程（群組訊息會發生什麼）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

如果您想要...

| 目標                             | 設定方式                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                 | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                     | `groups: { "<group-id>": { ... } }` (無 `"*"` 鍵)          |
| 僅有您可以在群組中觸發           | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Session keys

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` session keys（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，因此每個主題都有自己的會話。
- 直接聊天使用主會話（或若已設定則使用個別發送者會話）。
- 群組會話會跳過心跳。

## 模式：個人 DM + 公開群組（單一代理程式）

是的 —— 如果您的「個人」流量是 **DM**，而您的「公開」流量是 **群組**，這運作得很好。

原因：在單一代理模式下，私訊通常會落入 **主要** 會話金鑰 (`agent:main:main`)，而群組則始終使用 **非主要** 會話金鑰 (`agent:main:<channel>:group:<id>`)。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在 Docker 中執行，而您的主要私訊會話則保持在主機上。

這為您提供一個代理「大腦」（共享工作區 + 記憶體），但具有兩種執行姿態：

- **私訊**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正分開的工作區/人設（「個人」與「公開」絕對不能混合），請使用第二個代理 + 綁定。請參閱 [多代理路由](/zh-Hant/concepts/multi-agent)。

範例（私訊在主機上，群組在沙盒中 + 僅限訊息工具）：

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

希望「群組只能看到資料夾 X」而不是「無主機存取權」？請保留 `workspaceAccess: "none"`，並且僅將允許清單中的路徑掛載到沙盒中：

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

- 配置鍵與預設值：[Gateway configuration](/zh-Hant/gateway/configuration-reference#agents-defaults-sandbox)
- 調試工具被封鎖的原因：[Sandbox vs Tool Policy vs Elevated](/zh-Hant/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳情：[Sandboxing](/zh-Hant/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 是保留給房間/頻道的；群組聊天使用 `g-<slug>`（小寫，空格 -> `-`，保留 `#@+._-`）。

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

| 政策          | 行為                                  |
| ------------- | ------------------------------------- |
| `"open"`      | 群組繞過允許清單；提及閘門仍然適用。  |
| `"disabled"`  | 完全封鎖所有群組訊息。                |
| `"allowlist"` | 僅允許符合設定允許清單的群組/聊天室。 |

備註：

- `groupPolicy` 與提及閘控（需要 @mentions）是分開的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備方案：明確的 `allowFrom`）。
- DM 配對審核（`*-allowFrom` 儲存項目）僅適用於 DM 存取；群組發送者授權維持對群組允許清單的明確設定。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`（房間 ID、別名或名稱）。使用 `channels.matrix.groupAllowFrom` 限制發送者；也支援各房間的 `users` 允許清單。
- 群組 DM 是分開控制的 (`channels.discord.dm.*`, `channels.slack.dm.*`)。
- Telegram 允許清單可以匹配用戶 ID (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) 或用戶名 (`"@alice"` 或 `"alice"`)；前綴不區分大小寫。
- 預設值為 `groupPolicy: "allowlist"`；如果您的群組允許清單是空的，則會阻擋群組訊息。
- 執行時安全性：當提供者區塊完全缺失 (`channels.<provider>` 不存在) 時，群組原則會退回到「封閉失敗」模式 (通常為 `allowlist`)，而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型 (群組訊息的評估順序)：

1. `groupPolicy` (open/disabled/allowlist)
2. 群組允許清單 (`*.groups`, `*.groupAllowFrom`, 特定頻道的允許清單)
3. 提及閘控 (`requireMention`, `/activation`)

## 提及閘控 (預設)

除非針對每個群組進行覆寫，否則群組訊息需要提及。預設值位於 `*.groups."*"` 下的每個子系統中。

回覆機器人訊息即視為隱含提及 (當頻道支援回覆詮釋資料時)。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 提供明確提及的介面仍然會通過；模式僅作為後備方案。
- 每個 Agent 的覆寫：`agents.list[].groupChat.mentionPatterns` (當多個 Agent 共用群組時很有用)。
- 提及過濾僅在可進行提及偵測時執行（已設定原生提及或 `mentionPatterns`）。
- Discord 預設值位於 `channels.discord.guilds."*"`（可依伺服器/頻道覆寫）。
- 群組歷史紀錄上下文在各頻道間統一封裝，且為 **僅待處理**（因提及過濾而被跳過的訊息）；請使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）進行覆寫。設定 `0` 以停用。

## 群組/頻道工具限制（選用）

部分頻道設定支援限制在 **特定群組/聊天室/頻道內** 可用的工具。

- `tools`：允許/拒絕整個群組的工具。
- `toolsBySender`：群組內針對每個發送者的覆寫設定。
  使用明確的鍵前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴的鍵仍被接受，並且僅作為 `id:` 進行匹配。

解析順序（優先匹配更具體的項目）：

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
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

備註：

- 群組/頻道工具限制會與全域/代理工具原則一起套用（拒絕設定仍優先生效）。
- 某些頻道對房間/頻道使用不同的巢狀結構（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵會充當群組允許清單。請使用 `"*"` 來允許所有群組，同時仍設定預設提及行為。

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

4. 僅擁有者可以在群組中觸發（WhatsApp）

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

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人的自有 E.164）。將該指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## Context 欄位

群組輸入負載設定：

- `ChatType=group`
- `GroupSubject`（若已知）
- `GroupMembers`（若已知）
- `WasMentioned`（提及閘道結果）
- Telegram 論壇主題還包括 `MessageThreadId` 和 `IsForum`。

代理系統提示詞在新群組會話的第一輪包含群組簡介。它會提醒模型像人類一樣回應，避免 Markdown 表格，並避免輸入字面上的 `\n` 序列。

## iMessage 詳細資訊

- 在路由或允許清單時偏好使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是回到同一個 `chat_id`。

## WhatsApp 詳情

關於 WhatsApp 專用行為（歷史記錄注入、提及處理細節），請參閱 [群組訊息](/zh-Hant/channels/group-messages)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
