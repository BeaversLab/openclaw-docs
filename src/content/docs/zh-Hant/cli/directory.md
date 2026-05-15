---
summary: "CLI 參考資料，用於 `openclaw directory`（自己、對象、群組）"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "目錄"
---

# `openclaw directory`

針對支援的頻道進行目錄查詢（聯絡人/同儕、群組和「我」）。

## 通用旗標

- `--channel <name>`：頻道 ID/別名（當設定了多個頻道時為必填；若僅設定一個則自動選取）
- `--account <id>`：帳號 ID（預設值：頻道預設值）
- `--json`：輸出 JSON

## 備註

- `directory` 旨在幫助您尋找可貼上至其他指令的 ID（特別是 `openclaw message send --target ...`）。
- 對於許多頻道而言，結果是基於設定的（白名單 / 已設定的群組），而非即時的提供者目錄。
- 已安裝的頻道外掛程式仍可能不支援目錄；在這種情況下，該指令會回報不支援的目錄操作，而不是重新安裝外掛程式。
- 預設輸出為 `id`（有時包含 `name`），以 tab 分隔；請使用 `--json` 進行腳本撰寫。

## 搭配 `message send` 使用結果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（依頻道）

- WhatsApp：`+15551234567`（DM）、`1234567890-1234567890@g.us`（群組）、`120363123456789@newsletter`（頻道/電子報傳出目標）
- Telegram：`@username` 或數字聊天 ID；群組為數字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix (外掛程式)：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams (外掛程式)：`user:<id>` 和 `conversation:<id>`
- Zalo (外掛程式)：使用者 ID (Bot API)
- Zalo Personal / `zalouser` (外掛程式)：來自 `zca` 的 thread ID (DM/群組)（`me`、`friend list`、`group list`）

## 自我（「我」）

```bash
openclaw directory self --channel zalouser
```

## 同儕（聯絡人/使用者）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## 群組

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

## 相關

- [CLI 參考資料](/zh-Hant/cli)
