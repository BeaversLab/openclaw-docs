---
summary: "Routing rules per channel (WhatsApp, Telegram, Discord, Slack) and shared context"
read_when:
  - Changing channel routing or inbox behavior
title: "Channel Routing"
---

# 通道與轉送

OpenClaw routes replies **back to the channel where a message came from**. The
model does not choose a channel; routing is deterministic and controlled by the
host configuration.

## 關鍵詞彙

- **Channel**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId (帳戶 ID)**：單一通道的帳戶實例（支援時）。
- **AgentId (代理 ID)**：一個獨立的工作區 + 會話儲存（「大腦」）。
- **SessionKey (會話金鑰)**：用來儲存上下文與控制並行的儲存桶金鑰。

## 會話金鑰結構（範例）

私訊會收斂至代理的 **主要** 會話：

- `agent:<agentId>:<mainKey>` (default: `agent:main:main`)

群組與通道則依通道保持隔離：

- Groups: `agent:<agentId>:<channel>:group:<id>`
- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

討論串：

- Slack/Discord threads append `:thread:<threadId>` to the base key.
- Telegram forum topics embed `:topic:<topicId>` in the group key.

範例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 轉送規則（如何選擇代理）

轉送會為每則傳入訊息選擇 **一個代理**：

1. **Exact peer match** (`bindings` with `peer.kind` + `peer.id`).
2. **Guild match** (Discord) via `guildId`.
3. **Team match** (Slack) via `teamId`.
4. **Account match** (`accountId` on the channel).
5. **通道匹配**（該通道上的任何帳戶）。
6. **Default agent** (`agents.list[].default`, else first list entry, fallback to `main`).

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

See: [Broadcast Groups](/zh-Hant/broadcast-groups).

## 設定概覽

- `agents.list`: named agent definitions (workspace, model, etc.).
- `bindings`: map inbound channels/accounts/peers to agents.

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

Session stores live under the state directory (default `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 腳本與儲存並存

You can override the store path via `session.store` and `{agentId}` templating.

## WebChat 行為

WebChat attaches to the **selected agent** and defaults to the agent’s main
session. Because of this, WebChat lets you see cross‑channel context for that
agent in one place.

## 回覆情境

輸入回覆包括：

- `ReplyToId`, `ReplyToBody`, and `ReplyToSender` when available.
- 引用上下文會作為 `[Replying to ...]` 區塊附加到 `Body`。

這在所有通道中都是一致的。

import en from "/components/footer/en.mdx";

<en />
