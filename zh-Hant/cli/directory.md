---
summary: "CLI 參考資料，適用於 `openclaw directory`（自己、聯絡人/對等方、群組）"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "directory"
---

# `openclaw directory`

針對支援頻道的目錄查詢（聯絡人/對等方、群組以及「我」）。

## 通用旗標

- `--channel <name>`：頻道 ID/別名（當設定了多個頻道時為必填；當僅設定一個頻道時則自動選取）
- `--account <id>`：帳號 ID（預設：頻道預設值）
- `--json`：輸出 JSON

## 備註

- `directory` 旨在協助您尋找可貼上至其他指令的 ID（尤其是 `openclaw message send --target ...`）。
- 對於許多頻道而言，結果是基於設定檔的（允許清單/已設定的群組），而非即時的供應商目錄。
- 預設輸出為 `id`（有時為 `name`），以 Tab 鍵分隔；請使用 `--json` 進行腳本撰寫。

## 使用 `message send` 的結果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（依頻道）

- WhatsApp：`+15551234567`（DM）、`1234567890-1234567890@g.us`（群組）
- Telegram：`@username` 或數字聊天 ID；群組為數字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（外掛程式）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（外掛程式）：`user:<id>` 和 `conversation:<id>`
- Zalo（外掛程式）：使用者 ID（Bot API）
- Zalo Personal / `zalouser` (plugin)：來自 `zca` 的 thread id (DM/group) (`me`, `friend list`, `group list`)

## 自己

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
