---
summary: "与渠道无关的会话绑定架构及第 1 次迭代交付范围"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "进行中"
last_updated: "2026-02-21"
title: "与渠道无关的会话绑定计划"
---

# 与渠道无关的会话绑定计划

## 概述

本文档定义了长期的与渠道无关的会话绑定模型以及下一次实施迭代的具体范围。

目标：

- 使子代理绑定的会话路由成为一项核心功能
- 将特定于渠道的行为保留在适配器中
- 避免正常的 Discord 行为出现倒退

## 存在原因

当前行为混合了：

- 完成内容策略
- 目标路由策略
- Discord 特定细节

这导致了边缘情况，例如：

- 在并发运行下主通道和线程的重复投递
- 在重用的绑定管理器上使用过时的令牌
- 缺少 webhook 发送的活动统计

## 第 1 次迭代范围

此次迭代是有意限制范围的。

### 1. 添加与渠道无关的核心接口

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

核心服务合约：

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

### 2. 为子代理完成添加一个核心投递路由器

为完成事件添加单一的目标解析路径。

路由器合约：

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

- 只有 `task_completion` 通过此新路径进行路由
- 其他事件类型的现有路径保持不变

### 3. 将 Discord 保留为适配器

Discord 仍然是第一个适配器实现。

适配器职责：

- 创建/重用线程对话
- 通过 webhook 或通道发送来发送绑定消息
- 验证线程状态（已归档/已删除）
- 映射适配器元数据（webhook 身份，线程 ID）

### 4. 修复当前已知的正确性问题

此次迭代要求：

- 重用现有线程绑定管理器时刷新令牌使用
- 记录基于 webhook 的 Discord 发送的出站活动
- 当为会话模式完成选择了绑定的线程目标时，停止隐式的主通道回退

### 5. 保留当前的运行时安全默认值

对于禁用了线程绑定生成的用户，行为没有变化。

默认值保持为：

- `channels.discord.threadBindings.spawnSubagentSessions = false`

结果：

- 普通 Discord 用户保持当前行为
- 新的核心路径仅在启用时影响已绑定会话完成的路由

## 不在迭代 1 中

明确推迟：

- ACP 绑定目标 (`targetKind: "acp"`)
- Discord 以外的新通道适配器
- 全局替换所有交付路径 (`spawn_ack`，未来 `subagent_message`)
- 协议级别的变更
- 针对所有绑定持久化的存储迁移/版本控制重新设计

关于 ACP 的说明：

- 接口设计为 ACP 预留了空间
- ACP 的实施在本轮迭代中尚未开始

## 路由不变性

这些不变性对于迭代 1 是强制性的。

- 目的地选择和内容生成是分开的步骤
- 如果会话模式完成解析为活动的绑定目的地，则交付必须针对该目的地
- 没有从绑定目的地到主通道的隐藏重路由
- 回退行为必须是显式且可观察的

## 兼容性和推出

兼容性目标：

- 对于关闭了线程绑定生成的用户，没有回归
- 在本轮迭代中，非 Discord 通道没有变化

推出：

1. 在当前功能门之后落地接口和路由器。
2. 将 Discord 完成模式绑定交付通过路由器进行路由。
3. 为非绑定流程保留旧路径。
4. 通过定向测试和金丝雀运行时日志进行验证。

## 迭代 1 中所需的测试

需要的单元测试和集成测试覆盖率：

- 管理器令牌轮换在管理器重用后使用最新的令牌
- webhook 发送更新通道活动时间戳
- 同一请求通道中的两个活动绑定会话不会复制到主通道
- 绑定会话模式运行的完成仅解析为线程目的地
- 禁用的生成标志保持旧行为不变

## 建议的实施文件

核心：

- `src/infra/outbound/session-binding-service.ts` (新)
- `src/infra/outbound/bound-delivery-router.ts` (新)
- `src/agents/subagent-announce.ts` (完成目的地解析集成)

Discord 适配器和运行时：

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

测试：

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## 迭代 1 的完成标准

- 核心接口已存在并已连接以用于完成路由
- 上述正确性修复已与测试合并
- 在会话模式绑定运行中，主线程和子线程没有重复的完成交付
- 对于禁用绑定生成（bound spawn）的部署，行为没有变化
- ACP 仍显式推迟
