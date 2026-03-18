---
summary: "各通道的路由規則（WhatsApp、Telegram、Discord、Slack）與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "通道路由"
---

# 通道與路由

OpenClaw 會將回覆**路由回訊息來源通道**。模型不選擇通道；路由是確定性的，並由主機配置控制。

## 關鍵術語

- **通道**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每個通道的帳戶實例（當支援時）。
- 可選的通道預設帳戶：`channels.<channel>.defaultAccount` 選擇當出站路徑未指定 `accountId` 時所使用的帳戶。
  - 在多帳戶設定中，當配置了兩個或更多帳戶時，請設定明確的預設值（`defaultAccount` 或 `accounts.default`）。若未設定，後備路由可能會選取第一個標準化的帳戶 ID。
- **AgentId**：一個獨立的工作區 + 會話存儲（「大腦」）。
- **SessionKey**：用於存儲上下文和控制並發的桶鍵。

## 會話鍵形狀（範例）

直接訊息會折疊至代理的 **main** 會話：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

群組和通道根據每個通道保持獨立：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 通道/聊天室：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 討論串會將 `:thread:<threadId>` 附加至基礎鍵。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組鍵中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要 DM 路由固定

當 `session.dmScope` 為 `main` 時，直接訊息可能會共用一個主要會話。為了防止會話的 `lastRoute` 被非擁有者的 DM 覆蓋，當滿足以下所有條件時，OpenClaw 會從 `allowFrom` 推斷固定的擁有者：

- `allowFrom` 恰好包含一個非通配符條目。
- 該條目可以被標準化為該通道的具體發送者 ID。
- 入站 DM 發送者與該固定擁有者不匹配。

在該不匹配的情況下，OpenClaw 仍然會記錄入站會話元數據，但它會跳過更新主會話 `lastRoute`。

## 路由規則（如何選擇 Agent）

路由會為每條入站訊息選擇**一個 Agent**：

1. **精確對等匹配**（`bindings` 具有 `peer.kind` + `peer.id`）。
2. **父級對等匹配**（執行緒繼承）。
3. **伺服器 + 角色匹配**（Discord），透過 `guildId` + `roles`。
4. **伺服器匹配**（Discord），透過 `guildId`。
5. **團隊匹配**（Slack），透過 `teamId`。
6. **帳戶匹配**（通道上的 `accountId`）。
7. **通道匹配**（該通道上的任何帳戶，`accountId: "*"`）。
8. **預設 Agent**（`agents.list[].default`，否則為列表第一個條目，回退至 `main`）。

當綁定包含多個匹配欄位（`peer`、`guildId`、`teamId`、`roles`）時，**所有提供的欄位必須匹配**才能套用該綁定。

匹配的 Agent 決定了使用哪個工作區和會話存儲。

## 廣播群組（執行多個 Agent）

廣播群組讓您可以為同一個對等方執行**多個 Agent**，**在 OpenClaw 通常會回覆的時候**（例如：在 WhatsApp 群組中，在提及/啟動閘控之後）。

配置：

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

## 配置概覽

- `agents.list`：命名的 Agent 定義（工作區、模型等）。
- `bindings`：將入站通道/帳戶/對等方映射到 Agent。

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

## 會話存儲

會話存儲位於狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 腳本位於存儲旁邊

您可以透過 `session.store` 和 `{agentId}` 模板覆蓋存儲路徑。

Gateway 和 ACP 會話探索也會掃描預設 `agents/` 根目錄下以及範本化 `session.store` 根目錄下的磁碟備份代理程式存放區。探索到的存放區必須保持在該解析後的代理程式根目錄內，並使用常規的 `sessions.json` 檔案。符號連結和超出根目錄的路徑將被忽略。

## WebChat 行為

WebChat 會附加至 **選定的代理程式**，並預設使用該代理程式的主會話。因此，WebChat 讓您可以在一個地方查看該代理程式的跨通道上下文。

## 回覆上下文

傳入回覆包括：

- （若可用）`ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用的上下文會作為 `[Replying to ...]` 區塊附加到 `Body`。

這在所有通道中是一致的。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
