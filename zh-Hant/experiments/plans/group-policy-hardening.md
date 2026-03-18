---
summary: "Telegram 允許清單強化：前綴 + 空白正規化"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Telegram 允許清單強化"
---

# Telegram 允許清單強化

**日期**: 2026-01-05  
**狀態**: 已完成  
**PR**: #216

## 摘要

Telegram 允許清單現在不區分大小寫地接受 `telegram:` 和 `tg:` 前綴，並容
意外的空白字元。這使輸入的允許清單檢查與輸出傳送正規化一致。

## 變更內容

- 前綴 `telegram:` 和 `tg:` 被視為相同（不區分大小寫）。
- 允許清單項目會被修剪；空白項目會被忽略。

## 範例

以下所有項目都被視為相同的 ID：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 為何重要

從記錄檔或聊天 ID 複製貼上時，通常包含前綴與空白字元。正規化可避免在決定
是否在私訊或群組中回應時產生誤判。

## 相關文件

- [群組聊天](/zh-Hant/concepts/groups)
- [Telegram 提供者](/zh-Hant/channels/telegram)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
