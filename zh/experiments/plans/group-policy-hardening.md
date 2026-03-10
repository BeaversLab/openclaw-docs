---
summary: "Telegram 允许列表加固：前缀 + 空格标准化"
read_when:
  - "Reviewing historical Telegram allowlist changes"
title: "Telegram 允许列表加固"
---

# Telegram 允许列表加固

**Date**: 2026-01-05
**Status**: Complete
**PR**: #216

## Summary

Telegram 允许列表现在不区分大小写地接受 `telegram:` 和 `tg:` 前缀，并容忍意外的空格。这将入站允许列表检查与出站发送标准化保持一致。

## What changed

- 前缀 `telegram:` 和 `tg:` 被视为相同（不区分大小写）。
- 允许列表条目被修剪；空条目被忽略。

## Examples

所有这些都被接受用于相同的 ID：

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## Why it matters

从日志或聊天 ID 复制/粘贴通常包括前缀和空格。标准化可以避免在决定是否在 DM 或群组中响应时出现假阴性。

## Related docs

- [Group Chats](/zh/concepts/groups)
- [Telegram Provider](/zh/channels/telegram)
