---
summary: "Telegram allowlist hardening: prefix + whitespace normalization"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Telegram Allowlist Hardening"
---

# Telegram 允许列表加固

**日期**：2026-01-05  
**状态**：已完成  
**PR**：#216

## 摘要

Telegram allowlists 现在不区分大小写地接受 `telegram:` 和 `tg:` 前缀，并容忍
意外的空白字符。这使入站 allowlist 检查与出站发送规范化保持一致。

## 变更内容

- 前缀 `telegram:` 和 `tg:` 被视为相同（不区分大小写）。
- 允许列表条目会被修剪；空条目将被忽略。

## 示例

对于同一个 ID，以下所有格式均被接受：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 为何重要

从日志或聊天 ID 复制/粘贴通常包含前缀和空白字符。规范化可以避免
在决定是否在 私信 或群组中回复时出现漏判。

## 相关文档

- [群组聊天](/zh/concepts/groups)
- [Telegram Provider](/zh/channels/telegram)

import en from "/components/footer/en.mdx";

<en />
