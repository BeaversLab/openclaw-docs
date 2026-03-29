---
summary: "每個頻道的路由規則（WhatsApp、Telegram、Discord、Slack）與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "頻道路由"
---

# 頻道與路由

OpenClaw 會將回覆**路由回訊息來源的頻道**。模型不會選擇頻道；路由是確定性的，並由主機配置控制。

## 關鍵術語

- **頻道 (Channel)**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及擴充頻道。`webchat` 是內部 WebChat UI 頻道，不是可配置的出站頻道。
- **AccountId (帳號 ID)**：每個頻道的帳號實例（若支援）。
- 選用的頻道預設帳號：當出站路徑未指定 `accountId` 時，`channels.<channel>.defaultAccount` 會選擇使用的帳號。
  - 在多帳號設定中，當配置了兩個或多個帳號時，請設定一個明確的預設值（`defaultAccount` 或 `accounts.default`）。若無設定，後備路由可能會選擇第一個標準化的帳號 ID。
- **AgentId (代理程式 ID)**：一個獨立的工作空間 + 會話存儲（「大腦」）。
- **SessionKey (會話金鑰)**：用於存儲上下文和控制並發的桶鍵。

## 會話金鑰結構（範例）

直接訊息會收斂至代理程式的**主要**會話：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

群組和頻道依頻道保持獨立：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 頻道/聊天室：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 討論串會將 `:thread:<threadId>` 附加到基礎金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要 DM 路由固定

當 `session.dmScope` 為 `main` 時，私訊可能會共用一個主要工作階段。為了防止工作階段的 `lastRoute` 被非擁有者的私訊覆寫，當所有以下條件成立時，OpenClaw 會從 `allowFrom` 推斷固定的擁有者：

- `allowFrom` 恰好有一個非萬用字元條目。
- 該條目可正規化為該頻道的具體傳送者 ID。
- 傳入的私訊傳送者與該固定擁有者不符。

在這種不符的情況下，OpenClaw 仍會記錄傳入的工作階段中繼資料，但會跳過更新主要工作階段 `lastRoute`。

## 路由規則（如何選擇代理程式）

路由會為每則傳入訊息挑選 **一個代理程式**：

1. **精確對等匹配** (`bindings` 含有 `peer.kind` + `peer.id`)。
2. **父級對等匹配**（執行緒繼承）。
3. **伺服器 + 角色匹配**（Discord），透過 `guildId` + `roles`。
4. **伺服器匹配**（Discord），透過 `guildId`。
5. **團隊匹配**（Slack），透過 `teamId`。
6. **帳號匹配**（頻道上的 `accountId`）。
7. **頻道匹配**（該頻道上的任何帳號，`accountId: "*"`）。
8. **預設代理程式** (`agents.list[].default`，否則為第一個列表條目，退回至 `main`)。

當綁定包含多個匹配欄位 (`peer`, `guildId`, `teamId`, `roles`) 時，**所有提供的欄位必須都符合** 該綁定才會套用。

符合的代理程式決定了使用哪個工作區和工作階段儲存。

## 廣播群組（執行多個代理程式）

廣播群組讓您可以針對同一個對等端 **在 OpenClaw 通常會回覆時執行多個代理程式**（例如：在 WhatsApp 群組中，在提及/啟動閘門之後）。

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

請參閱：[廣播群組](/en/channels/broadcast-groups)。

## 設定概覽

- `agents.list`：具名的代理程式定義（工作區、模型等）。
- `bindings`：將傳入頻道/帳號/對等端對應到代理程式。

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

## 會話儲存

會話儲存位於狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 轉錄檔案與儲存庫並存

您可以透過 `session.store` 和 `{agentId}` 樣板覆寫儲存路徑。

Gateway 和 ACP 會話探索也會掃描預設 `agents/` 根目錄下以及樣板化 `session.store` 根目錄下的磁碟備份代理儲存庫。探索到的儲存庫必須保留在該解析後的代理根目錄內，並使用標準的 `sessions.json` 檔案。符號連結和超出根目錄的路徑將被忽略。

## WebChat 行為

WebChat 連接到**選定的代理**並預設使用該代理的主會話。因此，WebChat 讓您可以在一個地方查看該代理的跨通道上下文。

## 回覆上下文

傳入的回覆包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如有可用）。
- 引用的上下文會作為 `[Replying to ...]` 區塊附加到 `Body`。

這在各通道間是一致的。
