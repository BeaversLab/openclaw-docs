---
summary: "使用 Discord 专用的入站工作器解耦 Discord 网关侦听器与长时间运行的 Agent 轮次的现状和后续步骤"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord 异步入站工作器计划"
---

# Discord 异步入站工作器计划

## 目标

通过使入站 Discord 轮次变为异步，消除 Discord 侦听器超时这一用户面临的故障模式：

1. 网关侦听器快速接收并规范化入站事件。
2. Discord 运行队列存储序列化的作业，这些作业使用与我们当前相同的排序边界作为键。
3. 工作器在 Carbon 侦听器生命周期之外执行实际的代理轮次。
4. 运行完成后，回复将发送回原始频道或线程。

这是针对排队的 Discord 运行在 Agent 运行本身仍在进行时于 `channels.discord.eventQueue.listenerTimeout` 超时的长期修复方案。

## 当前状态

该计划已部分实施。

已完成的工作：

- Discord 侦听器超时和 Discord 运行超时现在是独立的设置。
- 接受的入站 Discord 轮次被排队进入 `src/discord/monitor/inbound-worker.ts`。
- 工作器现在拥有长时间运行的轮次，而不是 Carbon 侦听器。
- 现有的每条路由排序通过队列键得以保留。
- Discord 工作器路径存在超时回归覆盖。

通俗地说，这意味着：

- 生产环境超时错误已修复
- 长时间运行的轮次不再仅仅因为 Discord 侦听器预算到期而终止
- 工作器架构尚未完成

仍然缺失的内容：

- `DiscordInboundJob` 仍仅部分规范化，并且仍携带实时运行时引用
- 命令语义（`stop`、`new`、`reset` 以及未来的会话控制）尚未完全适应工作器原生模式
- 工作器可观测性和操作员状态仍然很少
- 仍然没有重启持久性

## 存在原因

当前行为将完整的代理轮次与侦听器生命周期绑定在一起：

- `src/discord/monitor/listeners.ts` 应用超时和中止边界。
- `src/discord/monitor/message-handler.ts` 将排队的运行保持在边界内。
- `src/discord/monitor/message-handler.process.ts` 内联执行媒体加载、路由、分发、输入、草稿流式传输和最终回复传递。

该架构具有两个不良特性：

- 漫长但正常的回合可能会被监听器看门狗中止
- 即使下游运行时本应产生回复，用户也可能看不到任何回复

增加超时时间虽有帮助，但并未改变故障模式。

## 非目标

- 在此阶段不要重新设计非 Discord 渠道。
- 在初次实现中，不要将其扩展为通用的全渠道 Worker 框架。
- 暂且不要提取跨渠道共享的入站 Worker 抽象；仅在重复显而易见时共享底层原语。
- 在第一阶段不要添加持久的崩溃恢复功能，除非为了安全落地所必需。
- 在此计划中，不要更改路由选择、绑定语义或 ACP 策略。

## 当前约束

当前的 Discord 处理路径仍然依赖一些不应保留在长期任务负载中的实时运行时对象：

- Carbon `Client`
- 原始 Discord 事件结构
- 内存中的 guild 历史记录映射
- 线程绑定管理器回调
- 实时的输入指示和草稿流状态

我们已将执行迁移到 Worker 队列，但规范化边界仍未完成。目前的 Worker 是“稍后在同一进程中使用部分相同的实时对象运行”，而不是完全仅数据的任务边界。

## 目标架构

### 1. 监听器阶段

`DiscordMessageListener` 仍然是入口点，但其工作变为：

- 运行预检和策略检查
- 将接受的输入规范化为可序列化的 `DiscordInboundJob`
- 将任务加入每个会话或每个渠道的异步队列
- 入队成功后立即返回给 Carbon

监听器不应再拥有端到端 LLM 回合的生命周期。

### 2. 规范化的任务负载

引入一个可序列化的任务描述符，其中仅包含稍后运行该回合所需的数据。

最小结构：

- 路由身份
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 投递身份
  - 目标频道 ID
  - 回复目标消息 ID
  - 线程 ID（如果存在）
- 发送者身份
  - 发送者 ID、标签、用户名、标识
- 频道上下文
  - 服务器 ID
  - 频道名称或 slug
  - 线程元数据
  - 解析后的系统提示词覆盖
- 标准化消息正文
  - 基础文本
  - 有效消息文本
  - 附件描述符或已解析的媒体引用
- 决策控制
  - 提及要求结果
  - 命令授权结果
  - 绑定的会话或代理元数据（如适用）

任务负载不得包含实时的 Carbon 对象或可变闭包。

当前实现状态：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 已存在并定义了工作器移交
- 负载仍包含实时的 Discord 运行时上下文，应进一步精简

### 3. Worker 阶段

添加一个特定于 Discord 的 Worker 运行器，负责：

- 从 `DiscordInboundJob` 重建轮次上下文
- 加载运行所需的媒体和任何额外的频道元数据
- 分发代理轮次
- 投递最终的回复负载
- 更新状态和诊断信息

推荐位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

对于给定的路由边界，排序必须保持与今天等效。

推荐键：

- 使用与 `resolveDiscordRunQueueKey(...)` 相同的队列键逻辑

这保留了现有行为：

- 一个绑定的代理对话不会与自身交错
- 不同的 Discord 频道仍可独立进行

### 5. 超时模型

切换后，存在两个独立的超时类别：

- 监听器超时
  - 仅涵盖标准化和入队
  - 应较短
- 运行超时
  - 可选、Worker 拥有、显式且用户可见
  - 不应意外继承自 Carbon 监听器设置

这消除了当前“Discord 网关监听器保持存活”与“代理运行健康”之间意外的耦合。

## 推荐的实现阶段

### 阶段 1：标准化边界

- 状态：部分实现
- 已完成：
  - 提取了 `buildDiscordInboundJob(...)`
  - 添加了工作器移交测试
- 剩余工作：
  - 使 `DiscordInboundJob` 仅包含纯数据
  - 将实时运行时依赖项移动到 worker 拥有的服务，而不是每个作业的负载中
  - 停止通过将实时侦听器引用拼接回作业中来重建进程上下文

### 第 2 阶段：内存 worker 队列

- 状态：已实现
- 已完成：
  - 添加了以解析的运行队列键为键的 `DiscordInboundWorkerQueue`
  - 侦听器将作业排队，而不是直接等待 `processDiscordMessage(...)`
  - worker 在进程中、仅在内存中执行作业

这是首次功能切换。

### 第 3 阶段：进程拆分

- 状态：未开始
- 将交付、输入和草稿流传输的所有权移至 worker 面向的适配器后面。
- 使用 worker 上下文重建替换对实时预检上下文的直接使用。
- 如有需要，暂时将 `processDiscordMessage(...)` 保留为外观，然后将其拆分。

### 第 4 阶段：命令语义

- 状态：未开始
  确保当工作排队时，原生 Discord 命令仍然表现正确：

- `stop`
- `new`
- `reset`
- 任何未来的会话控制命令

Worker 队列必须公开足够的运行状态，以便命令能够针对活动或排队的轮次。

### 第 5 阶段：可观测性和操作员体验

- 状态：未开始
- 将队列深度和活动 worker 计数发送到监控状态
- 记录入队时间、开始时间、完成时间以及超时或取消原因
- 在日志中清晰地展示 worker 拥有的超时或交付失败

### 第 6 阶段：可选的持久化后续工作

- 状态：未开始
  仅在内存版本稳定之后：

- 决定排队的 Discord 作业是否应该在网关重启后继续存在
- 如果是，则持久化作业描述符和交付检查点
- 如果否，则记录明确的内存边界

除非需要重启恢复才能落地，否则这应该是一个单独的后续工作。

## 文件影响

当前主要文件：

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

当前 worker 文件：

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

可能的后续接触点：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 下一步行动

下一步是将 worker 边界变为真实的，而不是局部的。

接下来做这件事：

1. 将实时运行时依赖项从 `DiscordInboundJob` 中移出
2. 将这些依赖保留在 Discord worker 实例上
3. 将排队的作业减少为纯 Discord 特定数据：
   - 路由身份
   - 投递目标
   - 发送者信息
   - 标准化消息快照
   - 门控和绑定决策
4. 在 worker 内部根据这些纯数据重建 worker 执行上下文

实际上，这意味着：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可变的仅运行时句柄

不应继续存在于每个排队作业中，而应存在于 worker 本身或 worker 拥有的适配器后面。

在此落地之后，接下来的后续工作应该是针对 `stop`、`new` 和 `reset` 的命令状态清理。

## 测试计划

将现有的超时复现覆盖保留在：

- `src/discord/monitor/message-handler.queue.test.ts`

为以下内容添加新测试：

1. listener 在入队后返回，而不等待完整的轮次
2. 保留每路由排序
3. 不同频道仍然并发运行
4. 回复被投递到原始消息目标
5. `stop` 取消活动的 worker 拥有的运行
6. worker 失败产生可见的诊断信息，而不会阻止后续作业
7. 绑定到 ACP 的 Discord 频道在 worker 执行下仍然正确路由

## 风险和缓解措施

- 风险：命令语义与当前的同步行为发生偏差
  缓解措施：在同一次切换中实现命令状态管道，而不是延后

- 风险：回复投递丢失线程或回复上下文
  缓解措施：在 `DiscordInboundJob` 中将传递身份设为一等公民

- 风险：重试或队列重启期间重复发送
  缓解措施：第一阶段仅保留在内存中，或在持久化之前添加显式的投递幂等性

- 风险：在迁移过程中，`message-handler.process.ts` 变得更难推断
  缓解措施：在 Worker 切换之前或期间，将其拆分为规范化、执行和交付辅助模块

## 验收标准

计划完成的标准如下：

1. Discord 监听器超时不再中断正常的长时间运行回合。
2. 监听器生命周期和 Agent 回合生命周期在代码中是分开的概念。
3. 保留现有的每会话排序。
4. 绑定 ACP 的 Discord 频道通过相同的 Worker 路径工作。
5. `stop` 针对 worker 拥有的运行，而不是旧的侦听器拥有的调用栈。
6. 超时和交付失败成为显式的 Worker 结果，而不是静默的监听器丢弃。

## 剩余落地策略

在后续 PR 中完成此工作：

1. 使 `DiscordInboundJob` 仅包含纯数据，并将实时运行时引用移动到 worker 上
2. 清理 `stop`、`new` 和 `reset` 的命令状态所有权
3. 添加 Worker 可观测性和操作员状态
4. 确定是否需要持久性，或明确记录内存边界

如果仅限 Discord 使用，并且我们继续避免过早的跨通道 Worker 抽象，这仍然是一个有界的后续工作。

import zh from '/components/footer/zh.mdx';

<zh />
