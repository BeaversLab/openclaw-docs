---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本文档介绍了 Codex harness 轮次的运行时合约。有关设置和路由，请从 [Codex harness](/zh/plugins/codex-harness) 开始。有关配置字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

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

压缩和 LLM 生命周期预测来自 Codex app-server 通知和 OpenClaw 适配器状态，而非原生 Codex hook 命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察结果，并非对 Codex 内部请求或压缩负载的逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` app-server 通知被投影为 `codex_app_server.hook` 代理事件，用于轨迹追踪和调试。它们不调用 OpenClaw 插件 hooks。

## V1 支持协议

Codex 运行时 v1 中支持的内容：

| 表面                              | 支持                                              | 原因                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环     | 支持                                              | Codex app-server 拥有 OpenAI 轮次、原生线程恢复和原生工具继续。                                                                                                |
| OpenClaw 渠由和投递               | 支持                                              | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道位于模型运行时之外。                                                                                    |
| OpenClaw 动态工具                 | 支持                                              | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 保留在执行路径中。                                                                                             |
| 提示词和上下文插件                | 支持                                              | OpenClaw 构建提示词覆盖层并将上下文投影到 Codex 轮次中，然后再启动或恢复线程。                                                                                 |
| 上下文引擎生命周期                | 支持                                              | 针对 Codex 回合运行的组装、摄取、回合后维护以及上下文引擎压缩协调。                                                                                            |
| 动态工具钩子                      | 支持                                              | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                       |
| 生命周期钩子                      | 作为适配器观察受支持                              | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 触发时带有真实的 Codex 模式负载。                                            |
| 最终答案修订网关                  | 通过原生钩子中继支持                              | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 请求 Codex 在最终确定之前再进行一次模型传递。                                                          |
| 原生 Shell、补丁和 MCP 阻止或观察 | 通过原生钩子中继支持                              | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的原生工具表面进行中继，包括 Codex 应用服务器 `0.125.0` 或更新版本上的 MCP 负载。支持阻止；不支持参数重写。      |
| 原生权限策略                      | 通过 Codex 应用服务器批准和兼容性原生钩子中继支持 | Codex 应用服务器批准请求在 Codex 审查后通过 OpenClaw 路由。对于原生批准模式，`PermissionRequest` 原生钩子中继是可选的，因为 Codex 在监护人审查之前就会发出它。 |
| 应用服务器轨迹捕获                | 支持                                              | OpenClaw 记录其发送到应用服务器的请求及其接收到的应用服务器通知。                                                                                              |

Codex 运行时 v1 中不支持：

| 表面                                          | V1 边界                                                                                                   | 未来路径                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 原生工具参数变更                              | Codex 原生前置工具钩子可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                 | 需要 Codex 钩子/架构支持以进行替换工具输入。                 |
| 可编辑的 Codex 原生记录历史                   | Codex 拥有规范的原生线程历史。OpenClaw 拥有一个镜像并且可以投射未来上下文，但不应变更不受支持的内部结构。 | 如果需要原生线程手术，请添加显式的 Codex 应用服务器 API。    |
| `tool_result_persist` 用于 Codex 原生工具记录 | 该钩子转换 OpenClaw 拥有的转录写入，而不是 Codex 原生工具记录。                                           | 可以镜像转换后的记录，但规范重写需要 Codex 支持。            |
| 丰富的原生压缩元数据                          | OpenClaw 会观察压缩的开始和完成，但不会收到稳定的保留/丢弃列表、token 增量或摘要负载。                    | 需要更丰富的 Codex 压缩事件。                                |
| 压缩干预                                      | 在 Codex 模式下，当前的 OpenClaw 压缩钩子处于通知级别。                                                   | 如果插件需要否决或重写原生压缩，请添加 Codex 压缩前/后钩子。 |
| 逐字节模型 API 请求捕获                       | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心在内部构建最终的 OpenAI API 请求。                    | 需要 Codex 模型请求跟踪事件或调试 API。                      |

## 原生权限和 MCP 询问

对于 `PermissionRequest`，当策略决定时，OpenClaw 仅返回明确的允许或拒绝决定。无决定的结果并不意味着允许。Codex 将其视为无钩子决定，并回退到其自身的守护程序或用户批准路径。

Codex 应用服务器批准模式默认省略此原生钩子。当 `permission_request` 被明确包含在 `nativeHookRelay.events` 中，或者兼容运行时安装它时，此行为适用。

当操作员为 Codex 原生权限请求选择 `allow-always` 时，OpenClaw 会在有限的会话窗口内记住该确切的提供商/会话/工具输入/cwd 指纹。记住的决定仅限精确匹配：更改的命令、参数、工具负载或 cwd 会创建一个新的批准请求。

当 Codex 将 OpenClaw`_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准引导将通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示被发送回发起的聊天，下一个排队的后续消息会回答该原生服务器请求，而不是被作为额外上下文进行引导。其他 MCP 引导请求将失败关闭。

## 队列引导

活动运行队列引导映射到 Codex 应用服务器 `turn/steer`。使用默认的 `messages.queue.mode: "steer"`OpenClaw，OpenClaw 会为配置的静默窗口批量处理排队的聊天消息，并按到达顺序作为一个 `turn/steer` 请求发送它们。传统的 `queue` 模式会发送单独的 `turn/steer` 请求。

Codex 审查和手动压缩回合可以拒绝同轮引导。在这种情况下，如果所选模式允许回退，OpenClaw 会使用后续队列。请参阅 [Steering queue](OpenClaw/en/concepts/queue-steering)。

## Codex 反馈上传

当针对使用原生 Codex harness 的会话批准 `/diagnostics [note]`OpenClaw 时，OpenClaw 还会为相关的 Codex 线程调用 Codex 应用服务器 `feedback/upload`。上传要求应用服务器包含每个列出的线程以及可用的衍生 Codex 子线程的日志。

上传通过 Codex 的正常反馈路径传输到 OpenAI 服务器。如果在该应用服务器中禁用了 Codex 反馈，该命令将返回应用服务器错误。完成的诊断回复列出了已发送线程的频道、OpenClaw 会话 ID、Codex 线程 ID 和本地 OpenAIOpenClaw`codex resume <thread-id>` 命令。

如果您拒绝或忽略批准，OpenClaw 将不会打印那些 Codex ID，也不会发送 Codex 反馈。上传不会替代本地 Gateway 诊断导出。有关批准、隐私、本地包和群组聊天的行为，请参阅 [Diagnostics export](<OpenClawGateway(网关)/en/gateway/diagnostics>)。

仅当您特别需要当前附加线程的 Codex 反馈上传而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`。

## 压缩和记录镜像

当选定的模型使用 Codex harness 时，原生线程压缩被委托给 Codex 应用服务器。OpenClaw 会保留一份记录镜像，用于渠道历史、搜索、OpenClaw`/new`、`/reset` 以及未来的模型或 harness 切换。

当应用服务器发出这些内容时，镜像会包括用户提示、最终助手文本以及轻量级的 Codex 推理或计划记录。目前，OpenClaw 仅记录原生压缩的开始和完成信号。它尚未公开人类可读的压缩摘要，也未公开 Codex 在压缩后保留的条目的可审计列表。

由于 Codex 拥有规范的 native 线程，`tool_result_persist` 目前不会重写 Codex-native 工具结果记录。它仅适用于 OpenClaw 正在编写 OpenClaw 拥有的会话转录工具结果的情况。

## 媒体和交付

OpenClaw 继续负责媒体交付和媒体提供商选择。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、批准和消息工具输出继续通过正常的 OpenClaw 交付路径进行。媒体生成不需要 PI。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [插件钩子](/zh/plugins/hooks)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [诊断导出](/zh/gateway/diagnostics)
- [轨迹导出](/zh/tools/trajectory)
