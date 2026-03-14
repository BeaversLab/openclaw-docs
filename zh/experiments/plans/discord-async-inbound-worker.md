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

1. Gateway 网关 侦听器快速接收并规范化入站事件。
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
- 交付标识
  - 目标渠道 ID
  - 回复目标消息 ID
  - 线程 ID（如果存在）
- 发送者标识
  - 发送者 ID、标签、用户名、标识符
- 渠道上下文
  - 服务器 ID
  - 渠道名称或别名
  - 线程元数据
  - 已解析的系统提示词覆盖
- 标准化消息正文
  - 基础文本
  - 有效消息文本
  - 附件描述符或已解析的媒体引用
- 门控决策
  - 提及要求结果
  - 命令授权结果
  - 绑定的会话或代理元数据（如适用）

任务负载不得包含活动的 Carbon 对象或可变的闭包。

当前实现状态：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 存在并定义了工作程序交接
- payload 仍然包含活跃的 Discord 运行时上下文，应进一步减少

### 3. 工作程序阶段

添加一个特定于 Discord 的 Worker 运行器，负责：

- 根据 `DiscordInboundJob` 重建轮次上下文
- 加载运行所需的媒体和任何其他渠道元数据
- 分派代理轮次
- 交付最终回复负载
- 更新状态和诊断信息

推荐位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

对于给定的路由边界，排序必须保持与当前等效。

推荐键：

- 使用与 `resolveDiscordRunQueueKey(...)` 相同的队列键逻辑

这保留了现有的行为：

- 一个绑定的代理对话不会与自身交错
- 不同的 Discord 渠道仍可独立进行

### 5. 超时模型

切换后，有两个单独的超时类别：

- 监听器超时
  - 仅涵盖规范化和入队
  - 应该较短
- 运行超时
  - 可选、工作程序拥有、显式且对用户可见
  - 不应意外地从 Carbon 监听器设置继承

这消除了当前“Discord 网关监听器保持存活”与“Agent 运行状况良好”之间意外的耦合。

## 推荐的实施阶段

### 阶段 1：规范化边界

- 状态：部分实施
- 已完成：
  - 提取了 `buildDiscordInboundJob(...)`
  - 添加了 Worker 交接测试
- 剩余：
  - 使 `DiscordInboundJob` 仅包含纯数据
  - 将实时运行时依赖项移至 Worker 拥有的服务，而不是每个任务的负载
  - 停止通过将实时监听器引用缝合回任务中来重建进程上下文

### 阶段 2：内存 Worker 队列

- 状态：已实施
- 已完成：
  - 添加了以解析的运行队列键为键的 `DiscordInboundWorkerQueue`
  - 监听器将任务加入队列，而不是直接等待 `processDiscordMessage(...)`
  - Worker 在进程内执行任务，且仅在内存中

这是第一次功能切换。

### 阶段 3：进程拆分

- 状态：未开始
- 将交付、输入和草稿流的所有权移至面向 Worker 的适配器后面。
- 使用 Worker 上下文重建代替直接使用实时预检上下文。
- 如果需要，暂时将 `processDiscordMessage(...)` 保留为门面，然后将其拆分。

### 阶段 4：命令语义

- 状态：未开始
  确保当任务加入队列时，原生 Discord 命令仍然能正确运行：

- `stop`
- `new`
- `reset`
- 任何未来的会话控制命令

Worker 队列必须暴露足够的运行状态，以便命令能够定位活动或已排队轮次。

### 阶段 5：可观测性和操作员体验

- 状态：未开始
- 将队列深度和活动 Worker 计数发送到监控状态中
- 记录入队时间、开始时间、完成时间以及超时或取消原因
- 在日志中清晰地展示 Worker 拥有的超时或交付失败

### 阶段 6：可选的持久化后续跟进

- 状态：未开始
  仅在内存版本稳定之后：

- 确定排队的 Discord 任务是否应在网关重启后继续存在
- 如果是，则持久化任务描述符和交付检查点
- 如果否，则记录明确的内存边界

除非需要重启恢复才能落地，否则这应该是一个单独的后续跟进。

## 文件影响

当前主要文件：

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

当前 Worker 文件：

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

可能的后续接触点：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 下一步

下一步是使 Worker 边界成为真正的边界，而不是部分边界。

接下来这样做：

1. 将实时运行时依赖项移出 `DiscordInboundJob`
2. 将这些依赖关系保留在 Discord Worker 实例上
3. 将排队的作业简化为纯 Discord 特定数据：
   - 路由身份
   - 投递目标
   - 发送者信息
   - 规范化消息快照
   - 门控和绑定决策
4. 在 Worker 内部根据这些纯数据重建 Worker 执行上下文

实际上，这意味着：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可变的仅运行时句柄

应停止存在于每个排队作业上，而是存在于 Worker 本身或 Worker 拥有的适配器后面。

在完成这些之后，下一个后续工作应该是为 `stop`、`new` 和 `reset` 清理命令状态。

## 测试计划

将现有的超时复现覆盖保留在：

- `src/discord/monitor/message-handler.queue.test.ts`

添加新测试以覆盖：

1. 侦听器在入队后返回，而不等待完整的轮次
2. 保持每个路由的顺序
3. 不同的频道仍然并发运行
4. 回复被投递到原始消息目标
5. `stop` 取消活动的 Worker 拥有的运行
6. Worker 故障产生可见的诊断信息，而不会阻塞后续作业
7. 绑定到 ACP 的 Discord 渠道在 Worker 执行下仍能正确路由

## 风险与缓解措施

- 风险：命令语义与当前的同步行为发生偏离
  缓解措施：在同一个切换过程中实现命令状态管道，而不是稍后再做

- 风险：回复投递丢失线程或回复上下文
  缓解措施：在 `DiscordInboundJob` 中将投递身份设为一等公民

- 风险：重试或队列重启期间发生重复发送
  缓解措施：保持第一遍仅在内存中，或者在持久化之前添加显式的投递幂等性

- 风险：在迁移期间，`message-handler.process.ts` 变得更难推理
  缓解措施：在 Worker 切换之前或期间，将其拆分为规范化、执行和投递辅助程序

## 验收标准

该计划完成时：

1. Discord 监听器超时不再中止健康的长时间运行回合。
2. 监听器生命周期和 Agent 轮次生命周期在代码中是两个独立的概念。
3. 保留现有的每次会话排序。
4. 绑定到 ACP 的 Discord 渠道通过同一 Worker 路径工作。
5. `stop` 针对 Worker 拥有的运行，而不是旧的监听器拥有的调用栈。
6. 超时和投递失败成为显式的 Worker 结果，而不是静默的监听器丢弃。

## 剩余的落地策略

在后续 PR 中完成此工作：

1. 使 `DiscordInboundJob` 仅包含纯数据，并将实时运行时引用移至 Worker
2. 清理 `stop`、`new` 和 `reset` 的命令状态所有权
3. 添加 Worker 可观测性和操作员状态
4. 确定是否需要持久性，或显式记录内存边界

如果保持 Discord 专有，并且如果我们继续避免过早的跨渠道 Worker 抽象，这仍然是一个有界的后续任务。

import zh from '/components/footer/zh.mdx';

<zh />
