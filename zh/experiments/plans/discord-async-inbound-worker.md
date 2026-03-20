---
summary: "通过 Discord 专用入站工作程序将 Discord Gateway(网关) 监听器与长时间运行的代理轮次解耦的状态和后续步骤"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord 异步入站工作程序计划"
---

# Discord 异步入站工作程序计划

## 目标

通过使入站 Discord 轮次变为异步，消除 Discord 监听器超时这一用户可见的故障模式：

1. Gateway(网关) 监听器快速接受并规范化入站事件。
2. Discord 运行队列存储序列化的作业，这些作业以我们今天使用的相同排序边界作为键。
3. 工作程序在 Carbon 监听器生命周期之外执行实际的代理轮次。
4. 运行完成后，回复将传送回原始渠道或线程。

这是针对排队 Discord 运行在代理运行本身仍在进行时在 `channels.discord.eventQueue.listenerTimeout` 处超时的长期修复。

## 当前状态

该计划已部分实施。

已完成的工作：

- Discord 监听器超时和 Discord 运行超时现在是单独的设置。
- 接受的入站 Discord 轮次被排队到 `src/discord/monitor/inbound-worker.ts` 中。
- 工作程序现在拥有长时间运行的轮次，而不是 Carbon 监听器。
- 通过队列键保留了现有的按路由排序。
- Discord 工作程序路径存在超时回归覆盖。

通俗来说这意味着：

- 生产超时错误已修复
- 长时间运行的轮次不再仅仅因为 Discord 监听器预算到期而终止
- 工作程序架构尚未完成

仍然缺失的内容：

- `DiscordInboundJob` 仍然只是部分规范化，并且仍然携带实时运行时引用
- 命令语义（`stop`、`new`、`reset` 以及未来的会话控制）尚未完全适应工作程序原生特性
- 工作程序可观察性和操作员状态仍然很少
- 仍然没有重启持久性

## 存在原因

当前行为将完整的代理轮次与监听器生命周期绑定在一起：

- `src/discord/monitor/listeners.ts` 应用超时和中止边界。
- `src/discord/monitor/message-handler.ts` 将排队的运行保持在该边界内。
- `src/discord/monitor/message-handler.process.ts` 内联执行媒体加载、路由、调度、输入状态显示、草稿流传输以及最终回复的发送。

该架构存在两个糟糕的特性：

- 漫长但正常的轮次可能会被监听器看门狗中止
- 即使下游运行时本来可以产生回复，用户也可能看不到任何回复

增加超时时间有帮助，但不会改变失败模式。

## 非目标

- 在此阶段不要重新设计非 Discord 渠道。
- 在第一次实现中，不要将其扩展为通用的全渠道 Worker 框架。
- 暂时不要提取共享的跨渠道入站 Worker 抽象；只有当重复显而易见时，才共享底层原语。
- 在第一次迭代中，除非需要安全落地，否则不要添加持久的崩溃恢复功能。
- 在此计划中，不要更改路由选择、绑定语义或 ACP 策略。

## 当前约束

当前的 Discord 处理路径仍然依赖于一些不应保留在长期作业负载中的实时运行时对象：

- Carbon `Client`
- 原始 Discord 事件形态
- 内存中的 guild 历史记录映射
- 线程绑定管理器回调
- 实时的输入状态和草稿流状态

我们已经将执行转移到了 Worker 队列上，但规范化边界仍然不完整。目前 Worker 是“稍后在同一进程中使用某些相同的实时对象运行”，而不是完全纯数据的作业边界。

## 目标架构

### 1. 监听器阶段

`DiscordMessageListener` 仍然是入口点，但其工作变为：

- 运行预检和政策检查
- 将接受的输入规范化为可序列化的 `DiscordInboundJob`
- 将作业加入每个会话或每个渠道的异步队列
- 入队成功后立即返回给 Carbon

监听器不应再拥有端到端 LLM 轮次的生命周期。

### 2. 规范化的作业负载

引入一个可序列化的作业描述符，其中仅包含稍后运行该轮次所需的数据。

最小形态：

- 路由身份
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 发送身份
  - 目标渠道 ID
  - 回复目标消息 ID
  - 线程 ID（如果存在）
- 发送者身份
  - 发送者 ID、标签、用户名、标签号
- 渠道上下文
  - guild ID
  - 渠道名称或 slug
  - thread 元数据
  - 已解析的系统提示词覆盖
- 规范化消息正文
  - 基础文本
  - 有效消息文本
  - 附件描述符或已解析的媒体引用
- 门控决策
  - 提及要求结果
  - 命令授权结果
  - 绑定的会话或代理元数据（如适用）

作业负载不得包含实时 Carbon 对象或可变闭包。

当前实现状态：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 已存在并定义了工作交接
- 负载仍包含实时 Discord 运行时上下文，应进一步精简

### 3. Worker 阶段

添加一个 Discord 特定的工作运行器，负责：

- 根据 `DiscordInboundJob` 重建轮次上下文
- 加载运行所需的媒体和任何其他渠道元数据
- 分发代理轮次
- 传递最终回复负载
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
- 不同的 Discord 渠道仍可独立进行

### 5. 超时模型

切换后，有两个独立的超时类别：

- 监听器超时
  - 仅涵盖规范化和入队
  - 应较短
- 运行超时
  - 可选的、Worker 拥有的、显式的且用户可见的
  - 不应意外继承自 Carbon 监听器设置

这消除了当前“Discord 网关监听器保持存活”与“代理运行健康”之间意外的耦合。

## 推荐实现阶段

### 阶段 1：规范化边界

- 状态：部分实现
- 已完成：
  - 提取了 `buildDiscordInboundJob(...)`
  - 添加了工作交接测试
- 剩余：
  - 使 `DiscordInboundJob` 仅包含纯数据
  - 将实时运行时依赖项移至 Worker 拥有的服务，而不是每个作业的负载
  - 停止通过将实时监听器引用缝合回作业中来重建进程上下文

### 阶段 2：内存中的 Worker 队列

- 状态：已实现
- 已完成：
  - 添加了以已解析运行队列键为键的 `DiscordInboundWorkerQueue`
  - 侦听器将作业排入队列，而不是直接等待 `processDiscordMessage(...)`
  - worker 在进程内执行作业，仅在内存中进行

这是首次功能切换。

### 阶段 3：进程拆分

- 状态：未开始
- 将交付、输入中和草稿流的所有权移至面向 worker 的适配器之后。
- 使用 worker 上下文重构来替换直接使用实时预检上下文。
- 如有需要，将 `processDiscordMessage(...)` 暂时保留为外观，然后将其拆分。

### 阶段 4：命令语义

- 状态：未开始
  确保当工作排队时，原生 Discord 命令仍然正确运行：

- `stop`
- `new`
- `reset`
- 任何未来的会话控制命令

worker 队列必须公开足够的运行状态，以便命令定位活动或已排队的轮次。

### 阶段 5：可观测性和操作员体验

- 状态：未开始
- 将队列深度和活动 worker 计数发送到监控状态
- 记录入队时间、开始时间、完成时间，以及超时或取消原因
- 在日志中清晰显示 worker 拥有的超时或交付失败

### 阶段 6：可选的持久化后续工作

- 状态：未开始
  仅在内存版本稳定之后：

- 确定排队的 Discord 作业是否应在网关重启后继续存在
- 如果是，请持久化作业描述符和交付检查点
- 如果否，请记录明确的内存边界

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

可能接下来的接触点：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 当前的下一步

下一步是将 worker 边界变为真实的，而不是局部的。

接下来执行此操作：

1. 将实时运行时依赖项移出 `DiscordInboundJob`
2. 将这些依赖项保留在 Discord worker 实例上
3. 将队列中的作业简化为纯 Discord 特定数据：
   - 路由身份
   - 投递目标
   - 发送者信息
   - 标准化消息快照
   - 门控和绑定决策
4. 在 Worker 内部，根据这些纯数据重建 Worker 执行上下文

实际上，这意味着：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他仅在运行时可变的句柄

应停止驻留在每个队列作业中，而是驻留在 Worker 本身或 Worker 拥有的适配器后面。

完成此步骤后，下一个后续工作应该是针对 `stop`、`new` 和 `reset` 的命令状态清理。

## 测试计划

将现有的超时复现覆盖范围保留在：

- `src/discord/monitor/message-handler.queue.test.ts`

为以下内容添加新测试：

1. 监听器在入队后返回，无需等待完整的轮次
2. 保留每个路由的顺序
3. 不同频道仍并发运行
4. 回复被投递到原始消息目标
5. `stop` 取消活动的 Worker 拥有的运行
6. Worker 故障产生可见的诊断信息，而不会阻塞后续作业
7. 绑定到 ACP 的 Discord 频道在 Worker 执行下仍能正确路由

## 风险与缓解措施

- 风险：命令语义从当前的同步行为偏移
  缓解措施：在相同的切换中实现命令状态管道，而不是推迟

- 风险：回复投递丢失线程或回复上下文
  缓解措施：使投递身份在 `DiscordInboundJob` 中成为一等公民

- 风险：在重试或队列重启期间重复发送
  缓解措施：仅在内存中保留第一遍，或在持久化之前添加显式投递幂等性

- 风险：在迁移期间 `message-handler.process.ts` 变得更难推理
  缓解措施：在 Worker 切换之前或期间拆分为标准化、执行和投递辅助程序

## 验收标准

当满足以下条件时，计划即完成：

1. Discord 监听器超时不再中止正常的长时间运行轮次。
2. 监听器生命周期和代理轮次生命周期在代码中是独立的概念。
3. 保留现有的每会话排序。
4. 绑定到 ACP 的 Discord 频道通过相同的 Worker 路径工作。
5. `stop` 针对的是 worker 拥有的 run，而不是旧的 listener 拥有的调用栈。
6. 超时和传递失败将成为明确的 worker 结果，而不是静默的 listener 丢弃。

## 剩余的落地策略

在后续 PR 中完成此工作：

1. 使 `DiscordInboundJob` 仅包含纯数据，并将实时运行时引用移至 worker
2. 清理 `stop`、`new` 和 `reset` 的命令状态所有权
3. 添加 worker 可观测性和操作员状态
4. 确定是否需要持久性，或明确记录内存边界

如果保持仅限于 Discord 并且我们继续避免过早的跨渠道 worker 抽象，这仍然是一个有范围的后续工作。

import en from "/components/footer/en.mdx";

<en />
