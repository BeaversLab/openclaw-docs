---
summary: "渠道无关会话绑定架构和第 1 次迭代交付范围"
read_when:
  - 重构渠道无关会话路由和绑定
  - 调查跨渠道重复、陈旧或缺失的会话交付
owner: "onutc"
status: "in-progress"
last_updated: "2026-02-21"
title: "Session Binding Channel Agnostic Plan"
---

# Session Binding Channel Agnostic Plan

## 概述

本文档定义了长期渠道无关会话绑定模型以及下一次实现迭代的具体范围。

目标：

- 使子代理绑定会话路由成为一项核心功能
- 将特定于渠道的行为保留在适配器中
- 避免正常 Discord 行为的回归

## 存在原因

当前行为混合了：

- 完成内容策略
- 目标路由策略
- Discord 特定细节

这导致了如下边缘情况：

- 并发运行时重复的主帖和线程交付
- 在重用的绑定管理器上使用了过期的令牌
- 缺少 webhook 发送的活动核算

## 第 1 次迭代范围

此次迭代是经过有意限制的。

### 1. 添加渠道无关核心接口

添加绑定和路由的核心类型和服务接口。

建议的核心类型：

```ts
export type BindingTargetKind = "subagent" | "session";
export type BindingStatus = "active" | "ending" | "ended";

export type ConversationRef = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
};

export type SessionBindingRecord = {
  bindingId: string;
  targetSessionKey: string;
  targetKind: BindingTargetKind;
  conversation: ConversationRef;
  status: BindingStatus;
  boundAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
};
```

核心服务契约：

```ts
export interface SessionBindingService {
  bind(input: {
    targetSessionKey: string;
    targetKind: BindingTargetKind;
    conversation: ConversationRef;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: {
    bindingId?: string;
    targetSessionKey?: string;
    reason: string;
  }): Promise<SessionBindingRecord[]>;
}
```

### 2. 为子代理完成添加一个核心交付路由器

为完成事件添加单一的目标解析路径。

路由器契约：

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: {
    eventKind: "task_completion";
    targetSessionKey: string;
    requester?: ConversationRef;
    failClosed: boolean;
  }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

对于此次迭代：

- 仅 `task_completion` 通过此新路径路由
- 其他类型事件的现有路径保持不变

### 3. 将 Discord 保持为适配器

Discord 仍然是第一个适配器实现。

适配器职责：

- 创建/重用线程对话
- 通过 webhook 或渠道发送发送绑定消息
- 验证线程状态（已归档/已删除）
- 映射适配器元数据（webhook 身份、线程 ID）

### 4. 修复当前已知的正确性问题

此次迭代中要求：

- 重用现有线程绑定管理器时刷新令牌使用
- 记录基于 webhook 的 Discord 发送的出站活动
- 当为会话模式完成选择绑定线程目标时，停止隐式的主渠道回退

### 5. 保留当前的运行时安全默认值

对于禁用了线程绑定生成的用户，行为没有变化。

默认值保持：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

结果：

- normal Discord users stay on current behavior
- new core path affects only bound 会话 completion routing where enabled

## Not in iteration 1

Explicitly deferred:

- ACP binding targets (`targetKind: "acp"`)
- new 渠道 adapters beyond Discord
- global replacement of all delivery paths (`spawn_ack`, future `subagent_message`)
- protocol level changes
- store migration/versioning redesign for all binding persistence

Notes on ACP:

- interface design keeps room for ACP
- ACP implementation is not started in this iteration

## Routing invariants

These invariants are mandatory for iteration 1.

- destination selection and content generation are separate steps
- if 会话 mode completion resolves to an active bound destination, delivery must target that destination
- no hidden reroute from bound destination to main 渠道
- fallback behavior must be explicit and observable

## Compatibility and rollout

Compatibility target:

- no regression for users with thread bound spawning off
- no change to non-Discord channels in this iteration

Rollout:

1. Land interfaces and router behind current feature gates.
2. Route Discord completion mode bound deliveries through router.
3. Keep legacy path for non-bound flows.
4. Verify with targeted tests and canary runtime logs.

## Tests required in iteration 1

Unit and integration coverage required:

- manager token rotation uses latest token after manager reuse
- webhook sends update 渠道 activity timestamps
- two active bound sessions in same requester 渠道 do not duplicate to main 渠道
- completion for bound 会话 mode run resolves to thread destination only
- disabled spawn flag keeps legacy behavior unchanged

## Proposed implementation files

Core:

- `src/infra/outbound/session-binding-service.ts` (new)
- `src/infra/outbound/bound-delivery-router.ts` (new)
- `src/agents/subagent-announce.ts` (completion destination resolution integration)

Discord adapter and runtime:

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

Tests:

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## Done criteria for iteration 1

- core interfaces exist and are wired for completion routing
- correctness fixes above are merged with tests
- 在会话模式绑定运行中，没有主线程和线程的重复完成交付
- 对于禁用绑定生成的部署，行为没有变化
- ACP 显式保持延迟

import en from "/components/footer/en.mdx";

<en />
