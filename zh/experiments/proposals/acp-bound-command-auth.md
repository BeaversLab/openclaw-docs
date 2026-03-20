---
summary: "Proposal: long-term command authorization 模型 for ACP-bound conversations"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "ACP Bound Command Authorization (Proposal)"
---

# ACP 绑定命令授权（提案）

状态：已提议，**尚未实施**。

This document describes a long-term authorization 模型 for native commands in
ACP-bound conversations. It is an experiments proposal and does not replace
current production behavior.

有关已实施的行为，请阅读以下源代码和测试：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 问题

Today we have command-specific checks (for example `/new` and `/reset`) that
need to work inside ACP-bound channels/topics even when allowlists are empty.
This solves immediate UX pain, but command-name-based exceptions do not scale.

## 长期形态

Move command authorization from ad-hoc handler logic to command metadata plus a
shared policy evaluator.

### 1) 将授权策略元数据添加到命令定义

每个命令定义都应声明一个授权策略。示例形态：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` and `/reset` would use `bound_acp_or_owner_or_allowlist`.
Most other commands would remain `owner_or_allowlist`.

### 2) 在频道之间共享一个评估器

引入一个辅助函数，使用以下内容评估命令授权：

- 命令策略元数据
- 发送者授权状态
- 已解析的对话绑定状态

Both Telegram and Discord native handlers should call the same helper to avoid
behavior drift.

### 3) 使用绑定匹配作为绕过边界

When policy allows bound ACP bypass, authorize only if a configured binding
match was resolved for the current conversation (not just because current
会话 key looks ACP-like).

这使边界保持明确，并最大限度地减少意外扩大。

## 为什么这样更好

- 可扩展到未来的命令，而无需添加更多基于命令名称的条件判断。
- 保持跨频道的行为一致性。
- 通过要求显式绑定匹配来保留当前的安全模型。
- 保持允许列表作为可选的强化措施，而不是普遍要求。

## 推出计划（未来）

1. 将命令授权策略字段添加到命令注册类型和命令数据中。
2. 实现共享评估器并迁移 Telegram 和 Discord 原生处理器。
3. Move `/new` and `/reset` to metadata-driven policy.
4. 针对每种策略模式和渠道界面添加测试。

## 非目标

- 本提案不改变 ACP 会话生命周期行为。
- 本提案不要求所有 ACP 绑定命令都使用允许列表。
- 本提案不改变现有的路由绑定语义。

## 注意

This proposal is intentionally additive and does not delete or replace existing
experiments documents.

import zh from "/components/footer/zh.mdx";

<zh />
