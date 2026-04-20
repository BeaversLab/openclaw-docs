---
summary: "Telegram 允許清單強化：前綴 + 空白正規化"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Telegram 允許清單強化"
---

# Telegram 允許清單強化

**日期**：2026-01-05  
**狀態**：已完成  
**PR**：#216

## 摘要

Telegram 允許清單現在會不區分大小寫地接受 `telegram:` 和 `tg:` 前綴，並容忍
意外出現的空白字元。這讓輸入的允許清單檢查與輸出的發送正規化保持一致。

## 變更內容

- 前綴 `telegram:` 和 `tg:` 被視為相同（不區分大小寫）。
- 允許清單項目會被修剪；空白項目會被忽略。

## 範例

對於同一個 ID，以下所有格式都會被接受：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 重要性

從日誌或聊天 ID 複製貼上時，通常會包含前綴和空白字元。進行正規化可以避免在決定是否回應私人訊息或群組時發生誤判。

## 相關文件

- [群組聊天](/zh-Hant/concepts/groups)
- [Telegram 提供者](/zh-Hant/channels/telegram)
