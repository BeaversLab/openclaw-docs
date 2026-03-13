---
summary: "提案：ACP 绑定对话的长期命令授权模型"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "ACP 绑定命令授权（提案）"
---

# ACP 绑定命令授权（提案）

状态：已提议，**尚未实施**。

本文档描述了 ACP 绑定对话中原生命令的长期授权模型。这是一个实验性提案，不会取代当前的生产环境行为。

有关已实施的行为，请阅读以下源代码和测试：

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## 问题

目前我们有针对特定命令的检查（例如 `/new` 和 `/reset`），即使允许列表为空，这些检查也需要在 ACP 绑定的频道/主题中工作。这解决了当前的用户体验痛点，但基于命令名称的例外情况无法扩展。

## 长期形态

将命令授权从临时的处理程序逻辑转移到命令元数据和共享的策略评估器。

### 1) 将授权策略元数据添加到命令定义

每个命令定义都应声明一个授权策略。示例形态：

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` 和 `/reset` 将使用 `bound_acp_or_owner_or_allowlist`。
大多数其他命令将保持 `owner_or_allowlist`。

### 2) 在频道之间共享一个评估器

引入一个辅助函数，使用以下内容评估命令授权：

- 命令策略元数据
- 发送者授权状态
- 已解析的对话绑定状态

Telegram 和 Discord 原生处理程序都应调用同一个辅助函数，以避免行为漂移。

### 3) 使用绑定匹配作为绕过边界

当策略允许绑定 ACP 绕过时，仅当为当前对话解析了配置的绑定匹配时才授权（不仅仅是因为当前会话密钥看起来像 ACP）。

这使边界保持明确，并最大限度地减少意外扩大。

## 为什么这样更好

- 可扩展到未来的命令，而无需添加更多基于命令名称的条件判断。
- 保持跨频道的行为一致性。
- 通过要求显式绑定匹配来保留当前的安全模型。
- 保持允许列表作为可选的强化措施，而不是普遍要求。

## 推出计划（未来）

1. 将命令授权策略字段添加到命令注册类型和命令数据中。
2. 实现共享评估器并迁移 Telegram 和 Discord 原生处理器。
3. 将 `/new` 和 `/reset` 迁移到元数据驱动的策略。
4. 针对每种策略模式和渠道界面添加测试。

## 非目标

- 本提案不改变 ACP 会话生命周期行为。
- 本提案不要求所有 ACP 绑定命令都使用允许列表。
- 本提案不改变现有的路由绑定语义。

## 注意

本提案意在增量添加，不会删除或替换现有的实验文档。

import zh from '/components/footer/zh.mdx';

<zh />
