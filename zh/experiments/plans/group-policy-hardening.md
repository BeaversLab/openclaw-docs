---
summary: "Telegram allowlist 加固：前缀 + 空白归一化"
read_when:
  - 回顾历史 Telegram allowlist 变更
title: "Telegram Allowlist Hardening"
---
# Telegram Allowlist 加固

**日期**：2026-01-05  
**状态**：完成  
**PR**：#216

## 摘要

Telegram allowlist 现支持不区分大小写的 `telegram:` 与 `tg:` 前缀，并容忍意外空白。这使入站 allowlist 检查与出站发送的归一化对齐。

## 变更内容

- `telegram:` 与 `tg:` 前缀同等对待（不区分大小写）。
- allowlist 条目会被 trim；空条目会忽略。

## 示例

以下都等价于同一个 ID：

- `telegram:123456`
- `TG:123456`
- ` tg:123456 `

## 重要性

从日志或聊天 ID 复制粘贴时常带前缀/空白。归一化可避免 DM 或群聊响应判定的误拒。

## 相关文档

- [Group Chats](/zh/concepts/groups)
- [Telegram Provider](/zh/channels/telegram)
