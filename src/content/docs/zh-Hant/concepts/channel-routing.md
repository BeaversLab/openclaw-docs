---
summary: "每個通道（WhatsApp、Telegram、Discord、Slack）的路由規則與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "通道路由"
---

# 通道與路由

OpenClaw 會將回覆**路由回訊息來源的通道**。
模型不會選擇通道；路由是確定性的，並由主機配置控制。

## 關鍵術語

- **通道**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每個通道的帳戶實例（當支援時）。
- **AgentId**：一個獨立的工作區 + 會話儲存（「大腦」）。
- **SessionKey**：用於儲存上下文和控制並發的儲存桶鍵。

## 會話鍵形式（範例）

私訊會折疊為代理的**主**會話：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

群組和通道根據通道保持隔離：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 通道/房間：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 討論串會將 `:thread:<threadId>` 附加到基礎鍵。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組鍵中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 路由規則（如何選擇代理）

路由會為每個傳入訊息選擇**一個代理**：

1. **精確對等匹配**（具有 `peer.kind` + `peer.id` 的 `bindings`）。
2. **公會匹配**（Discord），透過 `guildId`。
3. **團隊匹配**（Slack），透過 `teamId`。
4. **帳戶匹配**（通道上的 `accountId`）。
5. **通道匹配**（該通道上的任何帳戶）。
6. **預設代理**（`agents.list[].default`，否則為清單第一項，回退至 `main`）。

匹配的代理決定了使用哪個工作區和會話儲存。

## 廣播群組（執行多個代理）

廣播群組讓您在 **OpenClaw 通常會回覆時** 為同一個對等端執行 **多個代理程式**（例如：在 WhatsApp 群組中，在提及/啟動閘門之後）。

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

請參閱：[廣播群組](/zh-Hant/broadcast-groups)。

## 設定概覽

- `agents.list`：具名的代理程式定義（工作區、模型等）。
- `bindings`：將傳入通道/帳戶/對等端對應到代理程式。

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
- JSONL 逐字稿與儲存並存

您可以透過 `session.store` 和 `{agentId}` 模板覆寫儲存路徑。

## WebChat 行為

WebChat 附加到 **選定的代理程式** 並預設為該代理程式的主要會話。因此，WebChat 讓您可以在一個地方查看該代理程式的跨通道上下文。

## 回覆上下文

傳入回覆包括：

- 當可用時，包括 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用的上下文會作為 `[Replying to ...]` 區塊附加到 `Body`。

這在所有通道中都是一致的。
