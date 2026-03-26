---
summary: "Telegram 允許清單硬化：前綴 + 空白正規化"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Telegram 允許清單硬化"
---

# Telegram 允許清單硬化

**日期**：2026-01-05  
**狀態**：完成  
**PR**：#216

## 摘要

Telegram 許可清單現在接受不區分大小寫的 `telegram:` 和 `tg:` 前綴，並容許意外的空白字元。這將傳入許可清單檢查與傳出發送標準化保持一致。

## 變更內容

- 前綴 `telegram:` 和 `tg:` 被視為相同（不區分大小寫）。
- 許可清單項目會被修剪；空白項目會被忽略。

## 範例

對於相同的 ID，以下所有格式均被接受：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 為何重要

從日誌或聊天 ID 複製/貼上時，經常會包含前綴和空白字元。進行正規化可以避免在決定是否在私訊 (DM) 或群組中回應時產生誤判。

## 相關文件

- [群組聊天](/zh-Hant/concepts/groups)
- [Telegram 提供者](/zh-Hant/channels/telegram)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
