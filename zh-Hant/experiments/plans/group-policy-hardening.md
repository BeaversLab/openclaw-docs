---
summary: "Telegram 允許清單強化：前綴 + 空白字元正規化"
read_when:
  - 審查歷史 Telegram 允許清單變更
title: "Telegram Allowlist Hardening"
---

# Telegram 允許清單強化

**Date**: 2026-01-05  
**Status**: Complete  
**PR**: #216

## 摘要

Telegram 允許清單現在以不區分大小寫的方式接受 `telegram:` 和 `tg:` 前綴，並容許意外出現的空白字元。這使輸入的允許清單檢查與輸出的發送正規化保持一致。

## 變更內容

- 前綴 `telegram:` 和 `tg:` 被視為相同（不區分大小寫）。
- 允許清單項目會被修剪；空白項目會被忽略。

## 範例

以下所有項目都被視為相同的 ID：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 為何重要

從日誌或聊天 ID 複製貼上時，通常會包含前綴和空白字元。進行正規化可避免在決定是否在 DM 或群組中回應時產生誤判。

## 相關文件

- [群組聊天](/zh-Hant/concepts/groups)
- [Telegram 提供者](/zh-Hant/channels/telegram)

import en from "/components/footer/en.mdx";

<en />
