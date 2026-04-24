---
summary: "每個頻道的路由規則（WhatsApp、Telegram、Discord、Slack）與共享上下文"
read_when:
  - Changing channel routing or inbox behavior
title: "頻道路由"
---

# 頻道與路由

OpenClaw 會將回覆**路由回訊息來源的頻道**。模型不會選擇頻道；路由是確定性的，並由主機配置控制。

## 關鍵術語

- **頻道**：`telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及外掛頻道。`webchat` 是內部的 WebChat UI 頻道，並非可配置的出站頻道。
- **AccountId (帳號 ID)**：每個頻道的帳號實例（若支援）。
- 選用的頻道預設帳號：當出站路徑未指定 `accountId` 時，`channels.<channel>.defaultAccount` 會選擇使用的帳號。
  - 在多帳號設定中，當配置了兩個或多個帳號時，請設定一個明確的預設值（`defaultAccount` 或 `accounts.default`）。若無設定，後備路由可能會選擇第一個標準化的帳號 ID。
- **AgentId (代理程式 ID)**：一個獨立的工作空間 + 會話存儲（「大腦」）。
- **SessionKey (會話金鑰)**：用於存儲上下文和控制並發的桶鍵。

## 會話金鑰結構（範例）

直接訊息預設會合併至代理人的 **主要** 工作階段：

- `agent:<agentId>:<mainKey>`（預設：`agent:main:main`）

即使直接訊息的對話記錄與主要工作階段共用，沙箱與工具原則仍會針對外部直接訊息使用衍生出的每個帳號直接聊天執行時期金鑰，以便將來自頻道的訊息與本機主要工作階段的執行區分開來。

群組與頻道仍依各頻道保持獨立：

- 群組：`agent:<agentId>:<channel>:group:<id>`
- 頻道/房間：`agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord 討論串會將 `:thread:<threadId>` 附加至基礎金鑰。
- Telegram 論壇主題會將 `:topic:<topicId>` 嵌入群組金鑰中。

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主要直接訊息路由釘選

當 `session.dmScope` 為 `main` 時，直接訊息可能會共用一個主要工作階段。
為防止工作階段的 `lastRoute` 被非擁有者的直接訊息覆寫，
當以下所有條件皆符合時，OpenClaw 會從 `allowFrom` 推斷出釘選的擁有者：

- `allowFrom` 恰好有一個非萬用字元條目。
- 該條目可正規化為該頻道的具體發送者 ID。
- 傳入的直接訊息發送者不符合該釘選的擁有者。

在此不符的情況下，OpenClaw 仍會記錄傳入的工作階段元數據，但會
略過更新主要工作階段 `lastRoute`。

## 路由規則（如何選擇代理人）

路由會為每則傳入訊息挑選 **一個代理人**：

1. **確切對等相符**（`bindings` 搭配 `peer.kind` + `peer.id`）。
2. **父級對等相符**（討論串繼承）。
3. **伺服器 + 角色相符**（Discord）透過 `guildId` + `roles`。
4. **伺服器匹配** (Discord) 透過 `guildId`。
5. **團隊匹配** (Slack) 透過 `teamId`。
6. **帳號匹配** (通道上的 `accountId`)。
7. **通道匹配** (該通道上的任何帳號，`accountId: "*"`)。
8. **預設代理程式** (`agents.list[].default`，否則為清單第一個項目，回退至 `main`)。

當綁定包含多個匹配欄位 (`peer`, `guildId`, `teamId`, `roles`) 時，該綁定要生效，**所有提供的欄位都必須匹配**。

匹配的代理程式決定使用哪個工作區和會話儲存。

## 廣播群組 (執行多個代理程式)

廣播群組讓您可以在 OpenClaw 通常會**回覆的時候**，為同一個對等端執行**多個代理程式** (例如：在 WhatsApp 群組中，在提及/啟動閘門之後)。

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

- `agents.list`：具名代理程式定義 (工作區、模型等)。
- `bindings`：將傳入通道/帳號/對等端對應到代理程式。

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

會話儲存位於狀態目錄下 (預設為 `~/.openclaw`)：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 逐字稿與儲存並存

您可以透過 `session.store` 和 `{agentId}` 模板化覆寫儲存路徑。

閘道和 ACP 會話探索也會掃描預設 `agents/` 根目錄下以及模板化 `session.store` 根目錄下的磁碟支援代理程式儲存。發現的儲存必須保留在該解析的代理程式根目錄內，並使用常規的 `sessions.json` 檔案。符號連結和根目錄外的路徑會被忽略。

## WebChat 行為

WebChat 連結到**選定的代理程式**，並預設為該代理程式的主會話。因此，WebChat 讓您可以在一個地方查看該代理程式的跨通道上下文。

## 回覆上下文

傳入回覆包括：

- 當可用時的 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用的上下文會以 `[Replying to ...]` 區塊的形式附加到 `Body` 中。

這在所有通道中都是一致的。
