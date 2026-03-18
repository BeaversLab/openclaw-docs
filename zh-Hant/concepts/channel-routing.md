---
summary: "每個通道的轉送規則（WhatsApp、Telegram、Discord、Slack）與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "通道轉送"
---

# 通道與轉送

OpenClaw 會將回覆**轉送回訊息來源通道**。模型不會選擇通道；轉送是確定性的，由主機配置控制。

## 關鍵詞彙

- **通道 (Channel)**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId (帳戶 ID)**：單一通道的帳戶實例（支援時）。
- **AgentId (代理 ID)**：一個獨立的工作區 + 會話儲存（「大腦」）。
- **SessionKey (會話金鑰)**：用來儲存上下文與控制並行的儲存桶金鑰。

## 會話金鑰結構（範例）

私訊會收斂至代理的 **主要** 會話：

- `agent:<agentId>:<mainKey>`（預設值：`agent:main:main`）

群組與通道則依通道保持隔離：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 通道/房間：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 討論串會將 `:thread:<threadId>` 附加到基礎金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 轉送規則（如何選擇代理）

轉送會為每則傳入訊息選擇 **一個代理**：

1. **精準用戶匹配**（具有 `peer.kind` + `peer.id` 的 `bindings`）。
2. **公會匹配**（Discord），透過 `guildId`。
3. **團隊匹配**（Slack），透過 `teamId`。
4. **帳戶匹配**（通道上的 `accountId`）。
5. **通道匹配**（該通道上的任何帳戶）。
6. **預設代理**（`agents.list[].default`，否則為列表第一項，回退至 `main`）。

匹配的代理決定使用哪個工作區與會話儲存。

## 廣播群組（執行多個代理）

廣播群組讓您可以為相同的對端執行**多個代理程式**，**在 OpenClaw 通常會回覆的時候**（例如：在 WhatsApp 群組中，在提及/啟動閘檢之後）。

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
- `bindings`：將輸入通道/帳戶/對端對應到代理程式。

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

會話儲存在狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 腳本與儲存並存

您可以透過 `session.store` 和 `{agentId}` 模板來覆寫儲存路徑。

## WebChat 行為

WebChat 附加到**選定的代理程式**，並預設為該代理程式的主
會話。因此，WebChat 讓您可以在一個地方查看該
代理程式的跨通道情境。

## 回覆情境

輸入回覆包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果有的話）。
- 引用情境會附加到 `Body` 作為 `[Replying to ...]` 區塊。

這在所有通道中都是一致的。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
