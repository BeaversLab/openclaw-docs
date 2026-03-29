---
summary: "CLI 參考資料，用於 `openclaw directory`（自己、對象、群組）"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "directory"
---

# `openclaw directory`

針對支援的頻道（聯絡人/對象、群組及「我」）進行目錄查詢。

## 通用旗標

- `--channel <name>`：頻道 ID/別名（當設定了多個頻道時為必填；若僅設定一個則自動選取）
- `--account <id>`：帳號 ID（預設值：頻道預設值）
- `--json`：輸出 JSON

## 備註

- `directory` 旨在幫助您尋找可貼上至其他指令的 ID（特別是 `openclaw message send --target ...`）。
- 對於許多頻道而言，結果是基於設定的（白名單 / 已設定的群組），而非即時的提供者目錄。
- 預設輸出為以 tab 分隔的 `id`（有時包含 `name`）；請使用 `--json` 進行腳本撰寫。

## 搭配 `message send` 使用結果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（依頻道）

- WhatsApp：`+15551234567`（DM）、`1234567890-1234567890@g.us`（群組）
- Telegram：`@username` 或數值聊天 ID；群組為數值 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix (外掛)：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams (外掛)：`user:<id>` 和 `conversation:<id>`
- Zalo (外掛)：user id (Bot API)
- Zalo Personal / `zalouser` (外掛)：來自 `zca` (`me`、`friend list`、`group list`) 的 thread id (DM/群組)

## Self ("me")

```bash
openclaw directory self --channel zalouser
```

## Peers (contacts/users)

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## Groups

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```
