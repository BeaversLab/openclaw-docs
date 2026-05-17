---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本页面记录了 Codex harness 轮次的运行时契约。有关设置和路由，请从 [Codex harness](/zh/plugins/codex-harness) 开始。有关配置字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 概述

Codex 模式并非底层调用不同模型的 PI。Codex 拥有更多原生模型循环的所有权，而 OpenClaw 则在该边界周围调整其插件、工具、会话和诊断表面。

OpenClaw 仍然拥有渠道路由、会话文件、可见消息传递、OpenClaw 动态工具、审批、媒体传递和记录镜像。Codex 拥有规范的原生线程、原生模型循环、原生工具延续和原生压缩。

## 线程绑定和模型变更

当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会再次将当前选定的 OpenAI 模型、审批策略、沙盒和服务层级发送到 app-server。从 `openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保持线程绑定，但会要求 Codex 使用新选择的模型继续。

## 可见回复和心跳

当源聊天回合通过 Codex harness 运行时，如果部署未显式配置 `messages.visibleReplies`，可见回复默认为 OpenClaw `message` 工具。Agent 仍可私下完成其 Codex 回合；仅在调用 `message(action="send")` 时才会发布到渠道。设置 `messages.visibleReplies: "automatic"` 可将直接聊天的最终回复保留在旧版自动传递路径上。

默认情况下，Codex 心跳回合也会在可搜索的 OpenClaw 工具目录中获得 `heartbeat_respond`，因此 Agent 可以记录唤醒应保持静默还是发出通知，而无需在最终文本中编码该控制流。

特定于心跳的主动指导是作为心跳轮次本身的 Codex 协作模式开发者指令发送的。普通聊天轮次会恢复 Codex 默认模式，而不是在其常规运行时提示中承载心跳理念。

## Hook 边界

Codex 挂接具有三个 Hook 层：

| 层                         | 所有者            | 用途                                                   |
| -------------------------- | ----------------- | ------------------------------------------------------ |
| OpenClaw 插件 Hook         | OpenClaw          | 跨越 PI 和 Codex 挂接的产品/插件兼容性。               |
| Codex 应用服务器扩展中间件 | OpenClaw 内置插件 | 围绕 OpenClaw 动态工具的每轮适配器行为。               |
| Codex 原生 Hook            | Codex             | 来自 Codex 配置的低级别 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex `hooks.json` 文件来路由 OpenClaw 插件行为。对于支持的原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。

当启用 Codex 应用服务器审批时，即 `approvalPolicy` 不为 `"never"`，默认注入的原生 Hook 配置会省略 `PermissionRequest`，以便 Codex 的应用服务器审查器和 OpenClaw 的审批桥接在审查后处理真正的升级。当操作员需要兼容性中继时，可以显式地将 `permission_request` 添加到 `nativeHookRelay.events` 中。

其他 Codex Hook（如 `SessionStart` 和 `UserPromptSubmit`）仍然是 Codex 级别的控制项。它们在 v1 合同中未作为 OpenClaw 插件 Hook 公开。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，因此 OpenClaw 会在适配器中触发其拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范的工具记录。OpenClaw 可以镜像选定的事件，但除非 Codex 通过 app-server 或原生 hook 回调暴露该操作，否则它无法重写原生 Codex 线程。

Codex app-server 项目通知还为未被原生 `PostToolUse` 中继覆盖的原生工具完成提供异步 `after_tool_call` 观察结果。这些观察结果仅用于遥测和插件兼容性；它们不能阻止、延迟或更改原生工具调用。

压缩和 LLM 生命周期预测来自 Codex app-server 通知和 OpenClaw 适配器状态，而不是原生 Codex hook 命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察结果，而非 Codex 内部请求或压缩负载的字节级捕获。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知被投影为 `codex_app_server.hook` 代理事件，用于轨迹和调试。它们不调用 OpenClaw 插件 hooks。

## V1 支持契约

在 Codex 运行时 v1 中支持：

| 表面                              | 支持                                              | 原因                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环     | 支持                                              | Codex app-server 拥有 OpenAI 轮次、原生线程恢复和原生工具继续。                                                                                                      |
| OpenClaw 渠道路由和投递           | 支持                                              | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道保持在模型运行时之外。                                                                                        |
| OpenClaw 动态工具                 | 支持                                              | Codex 要求 OpenClaw 执行这些工具，因此 OpenClaw 保持在执行路径中。                                                                                                   |
| 提示词和上下文插件                | 支持                                              | OpenClaw 构建提示词覆盖层，并在启动或恢复线程之前将上下文投影到 Codex 轮次中。                                                                                       |
| 上下文引擎生命周期                | 支持                                              | 针对 Codex 回合，执行组装、摄取、回合后维护以及上下文引擎压缩协调。                                                                                                  |
| 动态工具钩子                      | 支持                                              | `before_tool_call`、`after_tool_call`OpenClaw 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                     |
| 生命周期钩子                      | 作为适配器观察得到支持                            | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 触发时带有真实的 Codex 模式负载。                                                  |
| 最终答案修订闸门                  | 通过原生钩子中继支持                              | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 在最终确定之前要求 Codex 再进行一次模型传递。                                                                |
| 原生 shell、补丁和 MCP 阻止或观察 | 通过原生钩子中继支持                              | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的原生工具表面进行中继，包括 Codex 应用服务器 `0.125.0` 或更新版本上的 MCP 负载。支持阻止；不支持参数重写。            |
| 原生权限策略                      | 通过 Codex 应用服务器批准和兼容性原生钩子中继支持 | Codex 应用服务器批准请求在 Codex 审查后通过 OpenClaw 路由。OpenClaw`PermissionRequest` 原生钩子中继对于原生批准模式是可选的，因为 Codex 在监护人审查之前就会发出它。 |
| 应用服务器轨迹捕获                | 支持                                              | OpenClaw 记录其发送到应用服务器的请求及其收到的应用服务器通知。                                                                                                      |

Codex 运行时 v1 中不支持：

| 表面                                          | V1 边界                                                                                                     | 未来路径                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 原生工具参数变更                              | Codex 原生前置工具钩子可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                   | 需要 Codex 钩子/架构支持以替换工具输入。                     |
| 可编辑的 Codex 原生记录历史                   | Codex 拥有规范的原生线程历史。OpenClaw 拥有一个镜像并且可以投射未来的上下文，但不应该变更不支持的内部结构。 | 如果需要原生线程手术，请添加明确的 Codex 应用服务器 API。    |
| `tool_result_persist` 用于 Codex 原生工具记录 | 该钩子转换 OpenClaw 拥有的脚本写入，而非 Codex 原生工具记录。                                               | 可以镜像转换后的记录，但规范重写需要 Codex 支持。            |
| 丰富的原生压缩元数据                          | OpenClaw 可以观察压缩的开始和完成，但不会收到稳定的保留/丢弃列表、token 增量或摘要负载。                    | 需要更丰富的 Codex 压缩事件。                                |
| 压缩干预                                      | 当前的 OpenClaw 压缩钩子在 Codex 模式下处于通知级别。                                                       | 如果插件需要否决或重写原生压缩，请添加 Codex 压缩前/后钩子。 |
| 逐字节的模型 API 请求捕获                     | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心在内部构建最终的 OpenAI API 请求。                      | 需要一个 Codex 模型请求跟踪事件或调试 API。                  |

## 原生权限和 MCP 询问

对于 `PermissionRequest`，OpenClaw 仅在策略决定时返回明确的允许或拒绝决定。未决定的结果并非允许。Codex 将其视为无钩子决定，并回退到其自身的守护者或用户批准路径。

Codex 应用服务器批准模式默认省略此原生钩子。当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中或兼容运行时安装它时，此行为适用。

当操作员为 Codex 原生权限请求选择 `allow-always` 时，OpenClaw 会记住该确切的 提供商/会话/工具 输入/cwd 指纹，用于有界的会话窗口。记住的决定有意仅限精确匹配：更改的命令、参数、工具负载或 cwd 会创建一个新的批准。

当 Codex 将 `_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准提示会通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示会发送回发起聊天，下一个排队的后续消息会回答该原生服务器请求，而不是作为额外上下文被引导。其他 MCP 提示请求失败。

## 队列引导

活动运行队列引导映射到 Codex 应用服务器 `turn/steer`。使用默认 `messages.queue.mode: "steer"` 时，OpenClaw 会将排队的聊天消息在配置的静默窗口内进行批处理，并按到达顺序作为一个 `turn/steer` 请求发送。旧版 `queue` 模式会发送单独的 `turn/steer` 请求。

Codex 审查和手动压缩回合可以拒绝同回合引导。在这种情况下，当所选模式允许回退时，OpenClaw 会使用后续队列。请参阅 [Steering queue](/zh/concepts/queue-steering)。

## Codex 反馈上传

当针对使用原生 Codex 约束的会话批准 `/diagnostics [note]` 时，OpenClaw 还会为相关的 Codex 线程调用 Codex 应用服务器 `feedback/upload`。上传请求应用服务器包含每个列出的线程以及生成的 Codex 子线程（如果有）的日志。

上传通过 Codex 的正常反馈路径发送到 OpenAI 服务器。如果在该应用服务器中禁用了 Codex 反馈，该命令将返回应用服务器错误。完成的诊断回复会列出已发送线程的频道、OpenClaw 会话 ID、Codex 线程 ID 和本地 `codex resume <thread-id>` 命令。

如果您拒绝或忽略批准，OpenClaw 将不会打印这些 Codex ID，也不会发送 Codex 反馈。上传不会替换本地 Gateway(网关) 诊断导出。关于批准、隐私、本地包和群聊行为，请参阅 [Diagnostics export](/zh/gateway/diagnostics)。

仅当您特别想要当前附加线程的 Codex 反馈上传而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

## 压缩和副本镜像

当所选模型使用 Codex harness 时，原生线程压缩被委托给 Codex 应用服务器。OpenClaw 保留渠道历史记录、搜索、OpenClaw`/new`、`/reset` 以及未来的模型或 harness 切换的副本镜像。

当应用服务器发出时，镜像包括用户提示、最终助手文本以及轻量级的 Codex 推理或计划记录。目前，OpenClaw 仅记录原生压缩开始和完成信号。它尚未公开人类可读的压缩摘要或 Codex 压缩后保留条目的可审核列表。

由于 Codex 拥有规范的原生线程，`tool_result_persist`OpenClawOpenClaw 目前不会重写 Codex 原生的工具结果记录。它仅在 OpenClaw 正在写入 OpenClaw 拥有的会话副本工具结果时适用。

## 媒体和交付

OpenClaw 继续拥有媒体交付和媒体提供商选择权。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的提供商/模型设置，例如 OpenClaw`agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、批准和消息工具输出继续通过正常的 OpenClaw 交付路径。媒体生成不需要 PI。当 Codex 发出带有 OpenClaw`savedPath`OpenClaw 的原生图像生成项目时，OpenClaw 会通过正常的回复媒体路径转发该确切文件，即使 Codex 轮次没有助手文本。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [插件钩子](/zh/plugins/hooks)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [诊断导出](/zh/gateway/diagnostics)
- [轨迹导出](/zh/tools/trajectory)
