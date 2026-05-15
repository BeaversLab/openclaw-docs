---
summary: "每個頻道的路由規則（WhatsApp、Telegram、Discord、Slack）與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "通道路由"
---

# 頻道與路由

OpenClaw 會將回覆**路由回訊息來源的頻道**。模型不會選擇頻道；路由是確定性的，並由主機配置控制。

## 關鍵術語

- **頻道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及外掛頻道。`webchat` 是內部的 WebChat UI 頻道，並非可配置的出站頻道。
- **AccountId**：每個通道的帳戶實例（當支援時）。
- 選用的頻道預設帳號：當出站路徑未指定 `accountId` 時，`channels.<channel>.defaultAccount` 會選擇使用的帳號。
  - 在多帳號設定中，當配置了兩個或多個帳號時，請設定一個明確的預設值（`defaultAccount` 或 `accounts.default`）。若無設定，後備路由可能會選擇第一個標準化的帳號 ID。
- **AgentId**：一個隔離的工作區 + 會話存儲（「大腦」）。
- **SessionKey (會話金鑰)**：用於存儲上下文和控制並發的桶鍵。

## 出站目標前綴

明確的出站目標可能包含提供者前綴，例如 `telegram:123` 或 `tg:123`。只有當選定的通道是 `last` 或未解析，並且加載的插件宣稱支援該前綴時，Core 才會將該前綴視為通道選擇提示。如果呼叫者已經選擇了一個明確的通道，提供者前綴必須與該通道相符；諸如將 WhatsApp 訊息投遞到 `telegram:123` 的跨通道組合會在插件特定的目標正規化之前失敗。

目標類型和服務前綴，如 `channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>`，保留在所選通道的語法範圍內。它們不會自行選擇提供者。

## 會話金鑰形狀（範例）

預設情況下，直接訊息會折疊到 Agent 的 **main** 會話：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

即使直接訊息的對話歷史與 main 共用，沙箱和工具策略也會使用針對外部 DM 的每個帳戶衍生的直接聊天運行時金鑰，以便來自通道的訊息不會被視為本機 main 會話運行。

群組和通道按通道保持隔離：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 通道/房間：`agent:<agentId>:<channel>:channel:<id>`

串列（Threads）：

- Slack/Discord 串列會將 `:thread:<threadId>` 附加到基礎金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入到群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要 DM 路由釘選

當 `session.dmScope` 為 `main` 時，直接訊息可能會共用一個 main 會話。
為了防止會話的 `lastRoute` 被非擁有者的 DM 覆蓋，
當以下所有條件都滿足時，OpenClaw 會從 `allowFrom` 推斷出一個釘選的擁有者：

- `allowFrom` 只有唯一的非萬用字元條目。
- 該條目可被標準化為該通道的具體發送者 ID。
- 傳入的 DM 發送者與該釘選的所有者不符。

在這種不匹配的情況下，OpenClaw 仍會記錄傳入會話元數據，但會跳過更新主會話 `lastRoute`。

## 防護式傳入記錄

當防護路徑不得建立新的 OpenClaw 會話時，通道外掛可以將傳入會話記錄標記為 `createIfMissing: false`。在該模式下，OpenClaw 可能會更新現有會話的元數據和 `lastRoute`，但它不僅因為觀察到訊息就建立僅路由的會話條目。

## 路由規則（如何選擇代理程式）

路由會為每條傳入訊息選擇**一個代理程式**：

1. **確切節點匹配** (`bindings` 搭配 `peer.kind` + `peer.id`)。
2. **父節點匹配**（執行緒繼承）。
3. **伺服器 + 角色匹配** (Discord) 透過 `guildId` + `roles`。
4. **伺服器匹配** (Discord) 透過 `guildId`。
5. **團隊匹配** (Slack) 透過 `teamId`。
6. **帳號匹配** (`accountId` 在該通道上)。
7. **通道匹配** (該通道上的任何帳號，`accountId: "*"`)。
8. **預設代理程式** (`agents.list[].default`，否則為清單第一個條目，退回至 `main`)。

當綁定包含多個匹配欄位 (`peer`, `guildId`, `teamId`, `roles`) 時，**所有提供的欄位都必須匹配** 該綁定才會套用。

匹配的代理程式決定使用哪個工作區和會話存儲。

## 廣播群組（執行多個代理程式）

廣播群組讓您能夠為同一個節點執行**多個代理程式**，**在 OpenClaw 通常會回覆時**（例如：在 WhatsApp 群組中，在提及/啟動閘控之後）。

設定：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

請參閱：[廣播群組](/zh-Hant/channels/broadcast-groups)。

## 設定概覽

- `agents.list`：具名的代理程式定義（工作區、模型等）。
- `bindings`：將輸入通道/帳戶/對應方對應到代理程式。

範例：

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## Session 儲存

Session 儲存位於狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 逐字稿與儲存並存

您可以透過 `session.store` 和 `{agentId}` 模板覆寫儲存路徑。

Gateway 和 ACP session 探索也會掃描預設 `agents/` 根目錄下以及模板化 `session.store` 根目錄下的磁碟備份代理程式儲存。探索到的儲存必須保持在該解析的代理程式根目錄內，並使用常規的 `sessions.json` 檔案。符號連結和根目錄外的路徑將被忽略。

## WebChat 行為

WebChat 連接到**選定的代理程式**，並預設為該代理程式的主要 session。因此，WebChat 讓您可以在一個地方查看該代理程式的跨通道上下文。

## 回覆上下文

輸入回覆包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果可用）。
- 引用的上下文會以 `[Replying to ...]` 區塊的形式附加到 `Body`。

這在所有通道中都是一致的。

## 相關

- [群組](/zh-Hant/channels/groups)
- [廣播群組](/zh-Hant/channels/broadcast-groups)
- [配對](/zh-Hant/channels/pairing)
