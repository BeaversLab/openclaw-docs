---
summary: "每個頻道的路由規則 (WhatsApp, Telegram, Discord, Slack) 與共享情境"
read_when:
  - Changing channel routing or inbox behavior
title: "頻道路由"
---

# 頻道與路由

OpenClaw 會將回覆**路由回訊息來源的頻道**。模型不會選擇頻道；路由是確定性的，並由主機設定控制。

## 關鍵詞彙

- **頻道 (Channel)**：`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`webchat`。
- **AccountId**：每個頻道的帳戶執行個體 (在支援時)。
- 可選的頻道預設帳號：`channels.<channel>.defaultAccount` 選擇當出路徑未指定 `accountId` 時使用的帳號。
  - 在多帳號設定中，當配置了兩個或多個帳號時，設定明確的預設值 (`defaultAccount` 或 `accounts.default`)。若未設定，備用路由可能會選擇第一個正規化的帳號 ID。
- **AgentId**：一個獨立的工作區 + 會話存儲（「大腦」）。
- **SessionKey**：用於存儲上下文和控制並發的存儲桶金鑰。

## 會話金鑰形狀（範例）

直接訊息會收斂至代理程式的 **主要** 會話：

- `agent:<agentId>:<mainKey>` (預設值： `agent:main:main`)

群組和頻道根據頻道保持隔離：

- 群組： `agent:<agentId>:<channel>:group:<id>`
- 頻道/房間： `agent:<agentId>:<channel>:channel:<id>`

執行緒：

- Slack/Discord 執行緒會將 `:thread:<threadId>` 附加到基底金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要 DM 路由固定

當 `session.dmScope` 為 `main` 時，私人訊息可能會共用一個主要工作階段。
為了防止工作階段的 `lastRoute` 被非擁有者的私人訊息覆寫，
當以下所有條件均符合時，OpenClaw 會從 `allowFrom` 推斷固定的擁有者：

- `allowFrom` 恰好有一個非萬用字元項目。
- 該項目可以被正規化為該管道的具體傳送者 ID。
- 傳入的私人訊息傳送者不符合該固定的擁有者。

在該不匹配的情況下，OpenClaw 仍然會記錄入站會話元數據，但會跳過更新主會話 `lastRoute`。

## 路由規則（如何選擇 Agent）

路由會為每條入站訊息選擇**一個 Agent**：

1. **精確對等匹配**（`bindings` 具有 `peer.kind` + `peer.id`）。
2. **父級對等匹配**（thread inheritance，串接繼承）。
3. **伺服器 + 角色匹配**（Discord）透過 `guildId` + `roles`。
4. **伺服器匹配**（Discord）透過 `guildId`。
5. **團隊匹配**（Slack）透過 `teamId`。
6. **帳號匹配**（通道上的 `accountId`）。
7. **通道匹配**（該通道上的任何帳號，`accountId: "*"`）。
8. **預設代理程式** (`agents.list[].default`，否則為列表第一項，後備為 `main`)。

當綁定包含多個比對欄位 (`peer`、`guildId`、`teamId`、`roles`) 時，**所有提供的欄位都必須符合**，該綁定才會套用。

符合的代理程式會決定使用哪個工作區與會話儲存。

## 廣播群組 (執行多個代理程式)

廣播群組讓您可以在 **OpenClaw 通常會回覆時**，為同一個對等點執行 **多個代理程式** (例如：在 WhatsApp 群組中，在提及/啟動閘門之後)。

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

- `agents.list`：具名的代理程式定義 (工作區、模型等)。
- `bindings`：將輸入通道/帳戶/對應端映射到代理程式。

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

## Session storage

Session stores live under the state directory (default `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL transcripts live alongside the store

You can override the store path via `session.store` and `{agentId}` templating.

Gateway and ACP session discovery also scans disk-backed agent stores under the
default `agents/` root and under templated `session.store` roots. Discovered
stores must stay inside that resolved agent root and use a regular
`sessions.json` file. Symlinks and out-of-root paths are ignored.

## WebChat behavior

WebChat 會附加至**選定的代理程式**，並預設為該代理程式的主要工作階段。因此，WebChat 讓您可以在一個地方查看該代理程式的跨通道情境。

## 回覆情境

傳入的回覆包括：

- `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`（如果可用）。
- 引用的情境會以 `[Replying to ...]` 區塊附加到 `Body`。

這在所有通道中都是一致的。
