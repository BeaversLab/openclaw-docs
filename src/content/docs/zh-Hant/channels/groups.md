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

![Group message flow](/images/groups-flow.svg)

如果您想要...

| 目標                             | 設定方式                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| 允許所有群組，但僅在 @提及時回覆 | `groups: { "*": { requireMention: true } }`                |
| 停用所有群組回覆                 | `groupPolicy: "disabled"`                                  |
| 僅限特定群組                     | `groups: { "<group-id>": { ... } }`（沒有 `"*"` 鍵）       |
| 只有您能在群組中觸發             | `groupPolicy: "allowlist"`、`groupAllowFrom: ["+1555..."]` |

## 工作階段金鑰

- 群組會話使用 `agent:<agentId>:<channel>:group:<id>` 會話金鑰（房間/頻道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 論壇主題會將 `:topic:<threadId>` 新增至群組 ID，以便每個主題都有自己的會話。
- 直接聊天使用主要工作階段 (若已設定，則為每位傳送者獨立)。
- 群組工作階段會跳過心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：個人 DM + 公開群組（單一代理程式）

是的 — 如果您的「個人」流量是 **DM**，而您的「公開」流量是 **群組**，這樣效果很好。

原因：在單一代理程式模式下，DM 通常會落在 **主要** 會話金鑰（`agent:main:main`）中，而群組則總是使用 **非主要** 會話金鑰（`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 啟用沙盒機制，這些群組會話將在 Docker 中執行，而您的主要 DM 會話則保持在主機上。

這為您提供了一個代理程式「大腦」（共享工作區 + 記憶體），但具有兩種執行態勢：

- **DM**：完整工具（主機）
- **群組**：沙盒 + 受限工具（Docker）

> 如果您需要真正獨立的工作區/角色設定（「個人」和「公開」絕不能混合），請使用第二個代理程式 + 綁定。請參閱 [Multi-Agent Routing](/en/concepts/multi-agent)。

範例（DM 在主機上，群組在沙盒中 + 僅限訊息傳遞工具）：

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

想要「群組只能看到資料夾 X」而不是「無主機存取權」？保留 `workspaceAccess: "none"` 並僅將允許清單中的路徑掛載到沙箱：

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

相關連結：

- 配置鍵與預設值：[Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- 偵錯工具被阻擋的原因：[Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- Bind mounts 詳細資訊：[Sandboxing](/en/gateway/sandboxing#custom-bind-mounts)

## 顯示標籤

- UI 標籤在可用時使用 `displayName`，格式為 `<channel>:<token>`。
- `#room` 保留給房間/頻道；群組聊天使用 `g-<slug>`（小寫，空格轉換為 `-`，保留 `#@+._-`）。

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
| `"open"`      | 群組略過允許清單；提及閘門仍然適用。 |
| `"disabled"`  | 完全封鎖所有群組訊息。               |
| `"allowlist"` | 僅允許符合設定允許清單的群組/房間。  |

備註：

- `groupPolicy` 與提及閘門（需要 @提及）分開。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（後備：明確的 `allowFrom`）。
- DM 配對核准（`*-allowFrom` 商店項目）僅適用於 DM 存取權；群組傳送者授權保持對群組允許清單的明確指定。
- Discord：允許清單使用 `channels.discord.guilds.<id>.channels`。
- Slack：允許清單使用 `channels.slack.channels`。
- Matrix：允許清單使用 `channels.matrix.groups`。建議優先使用房間 ID 或別名；已加入房間名稱查詢為盡力而為，且執行時會忽略無法解析的名稱。使用 `channels.matrix.groupAllowFrom` 限制傳送者；也支援各房間 `users` 允許清單。
- 群組 DM 受到單獨控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。
- Telegram 允許清單可以比對使用者 ID (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) 或使用者名稱 (`"@alice"` 或 `"alice"`)；前綴不區分大小寫。
- 預設為 `groupPolicy: "allowlist"`；如果您的群組允許清單是空的，則會封鎖群組訊息。
- 執行時期安全性：當提供者區塊完全遺失 (`channels.<provider>` 不存在) 時，群組政策會回退到「失敗關閉」模式 (通常是 `allowlist`)，而不是繼承 `channels.defaults.groupPolicy`。

快速心智模型 (群組訊息的評估順序)：

1. `groupPolicy` (開啟/停用/允許清單)
2. 群組允許清單 (`*.groups`, `*.groupAllowFrom`, 通道特定允許清單)
3. 提及閘控 (`requireMention`, `/activation`)

## 提及閘控 (預設)

除非針對每個群組進行覆蓋，否則群組訊息需要提及。預設值位於每個子系統下的 `*.groups."*"`。

回覆機器人訊息算作隱含提及 (當通道支援回覆元資料時)。這適用於 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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
- 每個代理程式的覆寫：`agents.list[].groupChat.mentionPatterns` (當多個代理程式共用一個群組時很有用)。
- 只有在能夠進行提及偵測 (已設定原生提及或 `mentionPatterns`) 時，才會強制執行提及閘控。
- Discord 的預設值位於 `channels.discord.guilds."*"` 中 (可針對每個伺服器/通道覆寫)。
- 群組歷史記錄內容在所有通道中被一致地包裝，並且是 **僅限擱置中** (因提及閘控而跳過的訊息)；使用 `messages.groupChat.historyLimit` 作為全域預設值，並使用 `channels.<channel>.historyLimit` (或 `channels.<channel>.accounts.*.historyLimit`) 進行覆寫。設定 `0` 以停用。

## 群組/通道工具限制 (選用)

部分頻道配置支援限制在**特定群組/房間/頻道內**可使用的工具。

- `tools`：針對整個群組的允許/拒絕工具。
- `toolsBySender`：群組內針對每個發送者的覆寫。
  使用明確的鍵前綴：
  `id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 萬用字元。
  舊版無前綴的鍵仍被接受，並僅作為 `id:` 進行匹配。

解析順序（最優先者勝出）：

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

- 群組/頻道工具限制會與全域/代理工具策略一併套用（拒絕仍然優先）。
- 部分頻道對房間/頻道使用不同的巢狀結構（例如，Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。

## 群組允許清單

當設定 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 時，這些鍵將作為群組允許清單。使用 `"*"` 以允許所有群組，同時仍設定預設提及行為。

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

## 啟用（僅限擁有者）

群組擁有者可以切換各個群組的啟用狀態：

- `/activation mention`
- `/activation always`

擁有者由 `channels.whatsapp.allowFrom` 決定（若未設定則為機器人的自身 E.164）。請將指令作為獨立訊息發送。其他介面目前會忽略 `/activation`。

## 上下文欄位

群組傳入負載會設定：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及閘道結果）
- Telegram 論壇主題也包括 `MessageThreadId` 和 `IsForum`。

頻道特定說明：

- BlueBubbles 可以選擇在填充 `GroupMembers` 之前，從本機聯絡人資料庫中豐富未命名的 macOS 群組參與者。此功能預設為關閉，且僅在常規群組閘道通過後執行。

代理程式系統提示詞在新群組會話的第一輪中包含群組簡介。它會提醒模型像人類一樣回應，避免使用 Markdown 表格，並避免輸入字面意義的 `\n` 序列。

## iMessage 詳情

- 在路由或設置允許清單時，優先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群組回覆總是會傳回同一個 `chat_id`。

## WhatsApp 詳情

請參閱 [群組訊息](/en/channels/group-messages) 以了解 WhatsApp 專屬的行為（歷史記錄注入、提及處理詳情）。
