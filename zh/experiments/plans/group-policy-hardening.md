---
summary: "Telegram 许可名单加固：前缀 + 空格标准化"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Telegram 许可名单加固"
---

# Telegram 允许列表加固

**日期**：2026-01-05  
**状态**：已完成  
**PR**：#216

## 摘要

Telegram 许可名单现在不区分大小写地接受 `telegram:` 和 `tg:` 前缀，并且容许意外的空格。这将入站许可名单检查与出站发送标准化保持一致。

## 变更内容

- 前缀 `telegram:` 和 `tg:` 被视为相同（不区分大小写）。
- 允许列表条目会被修剪；空条目将被忽略。

## 示例

对于同一个 ID，以下所有格式均被接受：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## 为何重要

从日志或聊天 ID 复制粘贴的内容通常包含前缀和空白字符。标准化可以避免
在决定是否响应私信或群组时出现漏判。

## 相关文档

- [群聊](/zh/en/concepts/groups)
- [Telegram 提供商](/zh/en/channels/telegram)

import zh from '/components/footer/zh.mdx';

<zh />
