---
summary: "每個頻道的路由規則（WhatsApp、Telegram、Discord、Slack）與共享語境"
read_when:
  - 變更頻道路由或收件匣行為
title: "Channel Routing"
---

# 通道與路由

OpenClaw 會將回覆**路由回訊息來自的頻道**。模型不會選擇頻道；路由是確定性的，並由主機組態控制。

## 關鍵術語

- **頻道**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每個通道的帳戶實例（當支援時）。
- 選用的頻道預設帳號：`channels.<channel>.defaultAccount` 會選擇當傳出路徑未指定 `accountId` 時使用的帳號。
  - 在多帳號設定中，當設定兩個或多個帳號時，請設定明確的預設值（`defaultAccount` 或 `accounts.default`）。若未設定，後備路由可能會選取第一個正規化的帳號 ID。
- **AgentId**：一個獨立的工作區 + 會話存儲（「大腦」）。
- **SessionKey**：用於存儲上下文和控制並發的桶鍵。

## 會話鍵形狀（範例）

直接訊息會折疊至代理的 **main** 會話：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

群組和通道根據每個通道保持獨立：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 頻道/房間：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 會將 `:thread:<threadId>` 附加至基底金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要 DM 路由固定

當 `session.dmScope` 為 `main` 時，私訊可能會共享一個主要工作階段。為了防止工作階段的 `lastRoute` 被非擁有者的私訊覆寫，OpenClaw 會在所有以下條件均符合時從 `allowFrom` 推斷釘選的擁有者：

- `allowFrom` 恰好有一個非萬用字元的條目。
- 該條目可以被標準化為該通道的具體發送者 ID。
- 入站 DM 發送者與該固定擁有者不匹配。

在該不一致的情況下，OpenClaw 仍會記錄傳入的工作階段元資料，但會跳過更新主要工作階段 `lastRoute`。

## 路由規則（如何選擇 Agent）

路由會為每條入站訊息選擇**一個 Agent**：

1. **確切對等相符**（`bindings` 且帶有 `peer.kind` + `peer.id`）。
2. **父級對等匹配**（執行緒繼承）。
3. **伺服器 + 角色相符**（Discord），透過 `guildId` + `roles`。
4. **伺服器相符**（Discord），透過 `guildId`。
5. **Team match** (Slack) 透過 `teamId`。
6. **Account match**（頻道上的 `accountId`）。
7. **Channel match**（該頻道上的任何帳號，`accountId: "*"`）。
8. **Default agent**（`agents.list[].default`，否則為第一個列表條目，最後退回到 `main`）。

當綁定包含多個比對欄位（`peer`、`guildId`、`teamId`、`roles`）時，**所有提供的欄位都必須比對成功**，該綁定才會套用。

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

請參閱：[Broadcast Groups](/zh-Hant/channels/broadcast-groups)。

## 配置概覽

- `agents.list`：具名的代理程式定義（工作區、模型等）。
- `bindings`：將傳入頻道/帳號/節點對應到代理程式。

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

Session stores 儲存在狀態目錄下（預設為 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 腳本位於存儲旁邊

您可以透過 `session.store` 和 `{agentId}` 模板來覆寫 store 路徑。

Gateway 和 ACP 會話探索也會掃描預設 `agents/` 根目錄以及模板化 `session.store` 根目錄下的磁碟備份代理程式 stores。探索到的
stores 必須保留在解析後的代理程式根目錄內，並使用標準的
`sessions.json` 檔案。符號連結和根目錄外的路徑將會被忽略。

## WebChat 行為

WebChat 會附加到**選定的代理程式**，並預設為該代理程式的主要
會話。因此，WebChat 讓您可以在一個地方查看該代理程式的跨頻道
語境。

## 回覆上下文

傳入回覆包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（當可用時）。
- 引用的語境會以 `[Replying to ...]` 區塊的形式附加到 `Body`。

這在所有通道中是一致的。

import en from "/components/footer/en.mdx";

<en />
