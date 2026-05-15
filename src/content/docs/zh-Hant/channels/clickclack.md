---
summary: "ClickClack bot-token 頻道設定與目標語法"
read_when:
  - Connecting OpenClaw to a ClickClack workspace
  - Testing ClickClack bot identities
title: "ClickClack"
---

ClickClack 透過一流的 ClickClack bot token 將 OpenClaw 連接到自託管的 ClickClack 工作區。

當您希望 OpenClaw 代理顯示為 ClickClack bot 使用者時，請使用此功能。ClickClack 支援獨立服務 bot 和使用者擁有的 bot；使用者擁有的 bot 會保留一個 `owner_user_id`，並且僅接收您授予的 token 範圍。

## 快速設定

在 ClickClack 中建立一個 bot token：

```bash
clickclack admin bot create \
  --workspace <workspace_id_or_slug> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

對於使用者擁有的 bot，請新增 `--owner <user_id>`。

設定 OpenClaw：

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
      agentId: "clickclack-bot",
      replyMode: "model",
    },
  },
}
```

然後執行：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

## 多個 bot

每個帳戶都會開啟自己的 ClickClack 即時連線，並使用自己的 bot token。

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
          replyMode: "model",
        },
        peter: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_PETER_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "peter-bot",
          replyMode: "model",
        },
      },
    },
  },
}
```

`replyMode: "model"` 直接使用 `api.runtime.llm.complete` 進行簡短的 bot 回覆。
當帳戶設定 `agentId` 時，OpenClaw 需要明確的
`plugins.entries.clickclack.llm.allowAgentIdOverride` 信任位元，此外掛程式
才能為該 bot 代理執行完成。如果您僅使用預設
代理路由，請將其關閉。

## 目標

- `channel:<name-or-id>` 發送到工作區頻道。純目標預設為 `channel:`。
- `dm:<user_id>` 建立或重複使用與該使用者的直接對話。
- `thread:<message_id>` 在現有執行緒中回覆。

範例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## 權限

ClickClack token 範圍由 ClickClack API 執行。

- `bot:read`：讀取工作區/頻道/訊息/執行緒/DM/即時/個人資料資料。
- `bot:write`：`bot:read` 加上頻道訊息、執行緒回覆、DM 和上傳。
- `bot:admin`：`bot:write` 加上頻道建立。

OpenClaw 只需要 `bot:write` 即可進行正常的代理聊天。

## 疑難排解

- `ClickClack is not configured`：設定 `channels.clickclack.token` 或 `CLICKCLACK_BOT_TOKEN`。
- `workspace not found`：將 `workspace` 設定為 ClickClack 傳回的工作區 ID 或 slug。
- 沒有傳入回覆：確認 token 具有即時讀取權限，且 bot 未回覆自己的訊息。
- 頻道發送失敗：請驗證機器人是工作區的成員並具有 `bot:write`。
