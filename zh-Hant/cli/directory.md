---
summary: "CLI 參考資料，適用於 `openclaw directory`（自己、連絡人、群組）"
read_when:
  - 您想要查詢頻道的連絡人/群組/自己 ID
  - 您正在開發頻道目錄適配器
title: "directory"
---

# `openclaw directory`

對支援目錄查詢的頻道進行查詢（連絡人/對等節點、群組以及「我」）。

## 通用旗標

- `--channel <name>`：頻道 ID/別名（當配置了多個頻道時為必填；僅配置一個時為自動）
- `--account <id>`：帳號 ID（預設值：頻道預設值）
- `--json`：輸出 JSON

## 注意事項

- `directory` 旨在幫助您找到可以貼上到其他指令的 ID（特別是 `openclaw message send --target ...`）。
- 對於許多頻道，結果是基於配置的（允許清單/已配置的群組），而不是即時的提供者目錄。
- 預設輸出為 `id`（有時為 `name`），以 Tab 字元分隔；請使用 `--json` 進行腳本撰寫。

## 搭配 `message send` 使用結果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（依頻道）

- WhatsApp：`+15551234567`（私訊）、`1234567890-1234567890@g.us`（群組）
- Telegram：`@username` 或數字聊天 ID；群組為數字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（外掛程式）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（外掛程式）：`user:<id>` 和 `conversation:<id>`
- Zalo（外掛程式）：使用者 ID（Bot API）
- Zalo 個人版 / `zalouser` (外掛程式)：來自 `zca` 的執行緒 ID (DM/群組) (`me`、`friend list`、`group list`)

## 自己 ("me")

```bash
openclaw directory self --channel zalouser
```

## 對象 (聯絡人/使用者)

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

import en from "/components/footer/en.mdx";

<en />
