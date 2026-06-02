---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

本页面记录了 Codex harness 轮次的运行时合约。有关设置和路由，请从 [Codex harness](/zh/plugins/codex-harness) 开始。有关配置字段，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 概述

Codex 模式不仅仅是底层调用不同模型的 OpenClaw。Codex 拥有更多
原生模型循环的控制权，而 OpenClaw 则围绕该边界调整其插件、工具、会话和
诊断表面。

OpenClaw 仍然拥有渠道路由、会话文件、可见消息传递、OpenClaw 动态工具、审批、媒体传递和记录镜像。Codex 拥有规范的原生线程、原生模型循环、原生工具延续和原生压缩。

提示路由遵循所选的运行时，而不仅仅是提供商字符串。
原生 Codex 轮次接收 Codex 应用服务器开发者指令，而
显式的 OpenClaw 兼容路由则保留正常的 OpenClaw 系统提示，
即使它使用 Codex 风格的 OpenAI 身份验证或传输。

原生 Codex 根据活动的 Codex 线程配置，保留 Codex 拥有的基础/模型指令和项目文档行为。OpenClaw 在禁用 Codex 内置个性的情况下启动和恢复原生 Codex 线程，以便工作区个性文件和 OpenClaw 代理身份保持权威。轻量级 OpenClaw 运行仍保留其现有的项目文档抑制。OpenClaw 开发者指令涵盖 OpenClaw 运行时关注点，例如源渠道交付、OpenClaw 动态工具、ACP 委派、适配器上下文和活动代理工作区配置文件。OpenClaw 技能目录和工具路由的 OpenClawOpenClawOpenClawOpenClawOpenClawOpenClawOpenClaw`MEMORY.md` 指针被投影为原生 Codex 的轮次范围协作开发者指令。活动 `BOOTSTRAP.md` 内容和完整 `MEMORY.md` 回退注入仍使用轮次输入引用上下文。

## 线程绑定和模型更改

当 OpenClaw 会话附加到现有的 Codex 线程时，下一轮会将当前选定的 OpenAI 模型、批准策略、沙盒和服务层级再次发送到应用服务器。从 OpenClawOpenAI`openai/gpt-5.5` 切换到 `openai/gpt-5.2` 会保留线程绑定，但要求 Codex 使用新选定的模型继续。

## 可见回复和心跳

当直接/源聊天轮次通过 Codex harness 运行时，可见回复默认为内部 WebChat 表面的自动最终助手交付。这使 Codex 与 Pi harness 提示合约保持一致：代理正常回复，OpenClaw 将最终文本发布到源对话。当直接/源聊天有意保留最终助手文本为私有时，请设置 WebChatOpenClaw`messages.visibleReplies: "message_tool"`，除非代理调用 `message(action="send")`。

Codex 心跳轮次默认也会在可搜索的 OpenClaw 工具目录中获取 `heartbeat_respond`OpenClaw，因此代理可以记录唤醒应保持静默还是发送通知，而无需在最终文本中对该控制流进行编码。

特定于心跳的主动权指导会作为 Codex 协作模式开发者指令，在心跳轮次本身发送。普通聊天轮次会恢复 Codex 默认模式，而不是在其常规运行时提示中承载心跳理念。当存在非空的 `HEARTBEAT.md` 时，心跳协作模式指令会将 Codex 指向该文件，而不是内联其内容。

## Hook 边界

Codex 装置包含三个 Hook 层：

| 层级                       | 所有者            | 用途                                                 |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| OpenClaw 插件 Hooks        | OpenClaw          | 跨 OpenClaw 和 Codex harness 的产品/插件兼容性。     |
| Codex 应用服务器扩展中间件 | OpenClaw 捆绑插件 | 围绕 OpenClaw 动态工具的每轮适配器行为。             |
| Codex 原生 Hooks           | Codex             | 来自 Codex 配置的低级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目级或全局 Codex OpenClaw`hooks.json`OpenClawOpenClaw 文件来路由 OpenClaw 插件行为。对于受支持的原生工具和权限桥，OpenClaw 会为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。

当启用 Codex 应用服务器批准时，即 `approvalPolicy` 不为 `"never"` 时，默认注入的原生 Hook 配置会省略 `PermissionRequest`OpenClaw，以便 Codex 的应用服务器审查器和 OpenClaw 的批准桥在审查后处理真正的升级。当需要兼容性中继时，操作员可以显式地将 `permission_request` 添加到 `nativeHookRelay.events`。

其他 Codex Hook（如 `SessionStart` 和 `UserPromptSubmit`OpenClaw）仍然是 Codex 级别的控制。它们不会在 v1 协议中作为 OpenClaw 插件 Hook 暴露。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，因此 OpenClaw 会触发其在 harness 适配器中拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范工具记录。OpenClaw 可以镜像选定的事件，但除非 Codex 通过应用服务器或原生 hook 回调暴露该操作，否则它无法重写原生 Codex 线程。

Codex 应用服务器报告模式 `PreToolUse`OpenClaw 事件将插件审批请求
推迟到匹配的应用服务器审批。如果 OpenClaw `before_tool_call` 钩子
返回 `requireApproval`，而原生有效负载设置了报告审批模式
（`openclaw_approval_mode` 为 `"report"`OpenClaw），则原生钩子中继会记录
插件审批要求，并且不返回原生决策。当 Codex 发送针对相同工具使用的
应用服务器审批请求时，OpenClaw 会打开插件
审批提示并将决策映射回 Codex。Codex `PermissionRequest`OpenClaw
事件是一个单独的审批路径，并且当运行时配置为该桥接模式时，
仍然可以路由通过 OpenClaw 审批。

Codex 应用服务器项目通知还提供异步 `after_tool_call`
观察结果，用于尚未由原生 `PostToolUse` 中继
覆盖的原生工具完成。这些观察结果仅用于遥测和插件
兼容性；它们无法阻止、延迟或更改原生工具调用。

压缩和 LLM 生命周期投影来自 Codex 应用服务器
通知和 OpenClaw 适配器状态，而不是原生 Codex 钩子命令。
OpenClaw 的 LLMOpenClawOpenClaw`before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是适配器级别的观察结果，而不是 Codex
内部请求或压缩有效负载的逐字节捕获。

Codex 原生 `hook/started` 和 `hook/completed` 应用服务器通知被
投射为 `codex_app_server.hook`OpenClaw 代理事件，用于轨迹和调试。
它们不会调用 OpenClaw 插件钩子。

## V1 支持合约

Codex 运行时 v1 中支持：

| 接口                              | 支持                                                | 原因                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环     | 支持                                                | Codex 应用服务器拥有 OpenAI 轮次、原生线程恢复和原生工具继续。                                                                                                                                                                                                                                                                                                |
| OpenClaw 渠道路由和投递           | 支持                                                | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道位于模型运行时之外。                                                                                                                                                                                                                                                                                   |
| OpenClaw 动态工具                 | 支持                                                | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                                                                                                                                                                            |
| 提示词和上下文插件                | 支持                                                | OpenClaw 将 OpenClaw 特定的提示/上下文投射到 Codex 回合中，同时将 Codex 拥有的基础、模型和配置的项目文档提示保留在本机 Codex 通道中。OpenClaw 禁用 Codex 在本机线程中的内置角色，以便代理工作区角色文件保持权威性。本机 Codex 开发者指令仅接受显式限定为 OpenClawOpenClawOpenClaw`codex_app_server` 的命令指导；遗留的全局命令提示仅适用于非 Codex 提示表面。 |
| 上下文引擎生命周期                | 支持                                                | 组装、摄取和轮次后维护围绕 Codex 轮次运行。上下文引擎不会取代原生 Codex 压缩。                                                                                                                                                                                                                                                                                |
| 动态工具钩子                      | 已支持                                              | `before_tool_call`、`after_tool_call`OpenClaw 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                                                                                                                                                                                                              |
| 生命周期钩子                      | 作为适配器观察支持                                  | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 使用真实的 Codex 模式负载触发。                                                                                                                                                                                                                                             |
| 最终答案修订门控                  | 通过原生钩子中继支持                                | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 要求 Codex 在最终确定之前再进行一次模型传递。                                                                                                                                                                                                                                                         |
| 原生 shell、补丁和 MCP 阻止或观察 | 通过原生钩子中继支持                                | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的本机工具表面进行中继，包括 Codex 应用服务器 `0.125.0` 或更新版本上的 MCP 负载。支持阻塞；不支持参数重写。                                                                                                                                                                                                     |
| 原生权限策略                      | 通过 Codex 应用服务器审批和兼容的原生 Hook 中继支持 | Codex 应用服务器批准请求在 Codex 审查后通过 OpenClaw 路由。由于 Codex 在守护者审查之前发出 OpenClaw`PermissionRequest` 本机钩子中继，因此对于本机批准模式，该中继是可选的。                                                                                                                                                                                   |
| 应用服务器轨迹捕获                | 支持                                                | OpenClaw 记录其发送到应用服务器的请求及其接收到的应用服务器通知。                                                                                                                                                                                                                                                                                             |

在 Codex 运行时 v1 中不支持：

| 表面                                            | V1 边界                                                                                                       | 未来路径                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 原生工具参数变更                                | Codex 原生工具前 Hook 可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                     | 需要 Codex Hook/架构支持以替换工具输入。                      |
| 可编辑的 Codex 原生脚本历史记录                 | Codex 拥有规范的原生线程历史记录。OpenClaw 拥有一个镜像并且可以投影未来上下文，但不应该变更不支持的内部结构。 | 如果需要原生线程编辑，请添加显式的 Codex 应用服务器 API。     |
| 针对 Codex 本机工具记录的 `tool_result_persist` | 该 Hook 转换 OpenClaw 拥有的脚本写入，而不是 Codex 原生工具记录。                                             | 可以镜像转换后的记录，但规范重写需要 Codex 支持。             |
| 丰富的原生压缩元数据                            | OpenClaw 可以请求原生压缩，但不会收到稳定的保留/丢弃列表、Token 增量、完成摘要或摘要负载。                    | 需要更丰富的 Codex 压缩事件。                                 |
| 压缩干预                                        | OpenClaw 不允许插件或上下文引擎否决、重写或替换原生 Codex 压缩。                                              | 如果插件需要否决或重写原生压缩，请添加 Codex 压缩前/后 Hook。 |
| 逐字节的模型 API 请求捕获                       | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                      | 需要 Codex 模型请求跟踪事件或调试 API。                       |

## 原生权限和 MCP 引出

对于 `PermissionRequest`OpenClaw，OpenClaw 仅在策略决定时返回显式的允许或拒绝决定。无决定结果不等于允许。Codex 将其视为无钩子决定，并回退到其自己的守护者或用户批准路径。

Codex 应用服务器批准模式默认忽略此本机钩子。当 `permission_request` 显式包含在 `nativeHookRelay.events` 中，或者兼容性运行时安装了它时，此行为适用。

当操作员为 Codex 原生权限请求选择 `allow-always`OpenClaw 时，OpenClaw 会在有界的会话窗口内记住该确切的提供商/会话/工具输入/当前目录指纹。记住的决策特意仅限精确匹配：更改命令、参数、工具负载或当前目录会创建一个新的批准。

当 Codex 将 OpenClaw`_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求将通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示将发送回发起聊天，下一个排队的后续消息将回答该原生服务器请求，而不是作为额外上下文被引导。其他 MCP 请求将被关闭（失败）。

有关传递这些提示的常规插件批准流程，请参阅 [Plugin permission requests](/zh/plugins/plugin-permission-requests)。

## 队列引导

活动运行队列引导映射到 Codex 应用服务器 `turn/steer`。使用默认 `messages.queue.mode: "steer"`OpenClaw，OpenClaw 会批量处理为配置的静默窗口准备的引导模式聊天消息，并按到达顺序将它们作为 `turn/steer` 请求发送。

Codex 审查和手动压缩回合可以拒绝同回合引导。在这种情况下，OpenClaw 会等待活动运行完成后才开始提示。当消息默认应排队而不是引导时，请使用 OpenClaw`/queue followup` 或 `/queue collect`。请参阅 [Steering queue](/zh/concepts/queue-steering)。

## Codex 反馈上传

当为使用原生 Codex harness 的会话批准 `/diagnostics [note]`OpenClaw 时，OpenClaw 还会为相关 Codex 线程调用 Codex 应用服务器 `feedback/upload`。上传会请求应用服务器包含每个列出的线程及生成的 Codex 子线程的日志（如果可用）。

上传会通过 Codex 的常规反馈路径发送到 OpenAI 服务器。如果在该应用服务器中禁用了 Codex 反馈，该命令将返回应用服务器错误。完成后的诊断回复会列出已发送线程的渠道、OpenClaw 会话 ID、Codex 线程 ID 以及本地 `codex resume <thread-id>` 命令。

如果您拒绝或忽略批准，OpenClaw 将不会打印那些 Codex ID，也不会发送 Codex 反馈。此上传不会替换本地 Gateway(网关) 诊断导出。有关批准、隐私、本地包和群组聊天行为，请参阅 [诊断导出](/zh/gateway/diagnostics)。

仅当您专门想要针对当前附加线程的 Codex 反馈上传，而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`。

## 压缩和脚本镜像

当所选模型使用 Codex harness 时，原生线程压缩属于 Codex 应用服务器。OpenClaw 不会为 Codex 轮次运行预检压缩，不会用上下文引擎压缩替换 Codex 压缩，并且当无法启动原生 Codex 压缩时，也不会回退到 OpenClaw 或公共 OpenAI 摘要生成。OpenClaw 会保留用于渠道历史记录、搜索、`/new`、`/reset` 以及未来模型或 harness 切换的脚本镜像。

显式压缩请求（例如 `/compact` 或插件请求的手动压缩操作）会使用 `thread/compact/start` 启动原生 Codex 压缩。OpenClaw 在启动该原生操作后返回。它不会等待完成、强加单独的 OpenClaw 超时、重启共享的 Codex 应用服务器，也不会将该操作记录为 OpenClaw 已完成的压缩。

当上下文引擎请求 Codex 线程引导投影 时，OpenClaw 会将工具调用名称和 ID、输入形状以及编辑过的工具结果内容投射到新的 Codex 线程中。它不会将原始工具调用参数值复制到该投影中。

镜像包括用户提示、最终助手文本以及轻量级 Codex 推理或计划记录（当应用服务器发出它们时）。目前，OpenClaw 仅在请求压缩时记录显式的原生压缩启动信号。它不会公开人类可读的压缩摘要或 Codex 压缩后保留的条目的可审核列表。

由于 Codex 拥有规范的原生线程，`tool_result_persist` 目前不会重写 Codex 原生工具结果记录。它仅在 OpenClaw 正在写入 OpenClaw 拥有的会话脚本工具结果时适用。

## 媒体和交付

OpenClaw 继续负责媒体传输和媒体提供商的选择。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的提供商/模型设置，例如 OpenClaw`agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、审批和消息工具输出继续通过正常的 OpenClaw 传输路径进行。媒体生成不需要遗留运行时。当 Codex 发出带有 OpenClaw`savedPath`OpenClaw 的原生图像生成项时，即使 Codex 轮次没有助手文本，OpenClaw 也会通过正常回复媒体路径转发该确切文件。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness reference](/zh/plugins/codex-harness-reference)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Plugin hooks](/zh/plugins/hooks)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Diagnostics export](/zh/gateway/diagnostics)
- [Trajectory export](/zh/tools/trajectory)
