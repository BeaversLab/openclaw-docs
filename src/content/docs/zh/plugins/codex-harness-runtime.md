---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across OpenClaw and Codex harness turns
---

本页面记录了 Codex harness 轮次的运行时协议。有关设置和
路由，请从 [Codex harness](/zh/plugins/codex-harness) 开始。有关配置字段，
请参阅 [Codex harness reference](/zh/plugins/codex-harness-reference)。

## 概述

Codex 模式不仅仅是底层调用不同模型的 OpenClaw。Codex 拥有更多
原生模型循环的控制权，而 OpenClaw 则围绕该边界调整其插件、工具、会话和
诊断表面。

OpenClaw 仍然拥有渠道路由、会话文件、可见消息传递、OpenClaw 动态工具、审批、媒体传递和记录镜像。Codex 拥有规范的原生线程、原生模型循环、原生工具延续和原生压缩。

提示路由遵循所选的运行时，而不仅仅是提供商字符串。
原生 Codex 轮次接收 Codex 应用服务器开发者指令，而
显式的 OpenClaw 兼容路由则保留正常的 OpenClaw 系统提示，
即使它使用 Codex 风格的 OpenAI 身份验证或传输。

原生 Codex 根据 Codex 线程配置保留 Codex 拥有的基础/模型指令和项目文档行为。
OpenClaw 启动和恢复原生 Codex 线程时会禁用 Codex 的内置个性，以便工作区
个性文件和 OpenClaw 代理身份保持权威。轻量级
OpenClaw 运行仍保留其现有的项目文档抑制功能。OpenClaw
开发者指令涵盖 OpenClaw 运行时问题，例如源渠道
交付、OpenClaw 动态工具、ACP 委托、适配器上下文以及
活动代理工作区配置文件。OpenClaw 技能目录以及 `MEMORY.md`
和活动 `BOOTSTRAP.md` 内容被投影为原生 Codex 的轮次输入参考上下文。

## 线程绑定和模型更改

当 OpenClaw 会话附加到现有 Codex 线程时，下一轮
会将当前选定的 OpenAI 模型、批准策略、沙箱和服务
层级再次发送到应用服务器。从 `openai/gpt-5.5` 切换到
`openai/gpt-5.2` 会保留线程绑定，但要求 Codex 使用
新选择的模型继续。

## 可见回复和心跳

当直接/源聊天轮次通过 Codex harness 运行时，可见回复
默认为内部 WebChat 表面的自动最终助手交付。
这使 Codex 与 Pi harness 提示协议保持一致：代理正常
回复，而 OpenClaw 将最终文本发布到源对话中。设置
`messages.visibleReplies: "message_tool"` 当直接/源聊天应
有意保留最终助手文本为私有，除非代理调用
`message(action="send")`。

Codex 心跳轮次默认也会在可搜索的 OpenClaw 工具目录中获得 `heartbeat_respond`OpenClaw，以便代理可以记录唤醒应保持静默还是发出通知，而无需在最终文本中编码该控制流。

针对心跳的特定主动权指导会作为 Codex 协作模式的开发者指令发送在心跳轮次本身。普通聊天轮次会恢复 Codex 默认模式，而不是在其常规运行时提示中携带心跳理念。当存在非空的 `HEARTBEAT.md` 时，心跳协作模式指令会将 Codex 指向该文件，而不是内联其内容。

## Hook 边界

Codex 装置包含三个 Hook 层：

| 层级                       | 所有者            | 用途                                                 |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| OpenClaw 插件 Hooks        | OpenClaw          | 跨 OpenClaw 和 Codex harness 的产品/插件兼容性。     |
| Codex 应用服务器扩展中间件 | OpenClaw 捆绑插件 | 围绕 OpenClaw 动态工具的每轮适配器行为。             |
| Codex 原生 Hooks           | Codex             | 来自 Codex 配置的低级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex OpenClaw`hooks.json`OpenClawOpenClaw 文件来路由 OpenClaw 插件行为。对于支持的原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。

当启用 Codex 应用服务器审批时，即 `approvalPolicy` 不为 `"never"` 时，默认注入的原生 Hook 配置会省略 `PermissionRequest`OpenClaw，以便在审查后由 Codex 的应用服务器审查器和 OpenClaw 的审批桥接处理实际的升级。当需要兼容性中继时，操作员可以显式地将 `permission_request` 添加到 `nativeHookRelay.events`。

其他 Codex Hooks（如 `SessionStart` 和 `UserPromptSubmit`OpenClaw）仍然是 Codex 级别的控制。它们在 v1 协议中不会作为 OpenClaw 插件 Hooks 暴露。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，因此 OpenClaw 会触发其在 harness 适配器中拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范工具记录。OpenClaw 可以镜像选定的事件，但除非 Codex 通过应用服务器或原生 hook 回调暴露该操作，否则它无法重写原生 Codex 线程。

Codex 应用服务器报告模式 `PreToolUse`OpenClaw 事件将插件批准请求
推迟到匹配的应用服务器批准。如果 OpenClaw `before_tool_call` 钩子
返回 `requireApproval`，同时原生负载设置了报告批准模式
（`openclaw_approval_mode` 为 `"report"`OpenClaw），则原生钩子中继会记录
插件批准要求，并且不返回原生决定。当 Codex 针对相同的工具使用发送
应用服务器批准请求时，OpenClaw 会打开插件批准提示并将决定映射回 Codex。Codex `PermissionRequest`OpenClaw
事件是一条单独的批准路径，当运行时配置为该桥接时，仍然可以通过 OpenClaw
批准进行路由。

Codex 应用服务器项目通知还为原生工具完成提供异步 `after_tool_call`
观察，这些尚未由原生 `PostToolUse` 中继覆盖。
这些观察仅用于遥测和插件兼容性；它们不能阻止、延迟或更改原生工具调用。

压缩和 LLM 生命周期预测来自 Codex 应用服务器
通知和 OpenClaw 适配器状态，而非原生 Codex 钩子命令。
OpenClaw 的 LLMOpenClawOpenClaw`before_compaction`、`after_compaction`、`llm_input` 和
`llm_output` 事件是适配器级别的观察，而非 Codex 内部请求或压缩负载的字节级捕获。

Codex 原生 `hook/started` 和 `hook/completed` 应用服务器通知被
投影为 `codex_app_server.hook`OpenClaw 代理事件，用于轨迹和调试。
它们不会调用 OpenClaw 插件钩子。

## V1 支持合约

Codex 运行时 v1 中支持：

| 接口                              | 支持                                                | 原因                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 的 OpenAI 模型循环     | 支持                                                | Codex 应用服务器拥有 OpenAI 轮次、原生线程恢复和原生工具继续。                                                                                                                                                                                                                                                                                  |
| OpenClaw 渠道路由和投递           | 支持                                                | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道位于模型运行时之外。                                                                                                                                                                                                                                                                     |
| OpenClaw 动态工具                 | 支持                                                | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 仍处于执行路径中。                                                                                                                                                                                                                                                                              |
| 提示词和上下文插件                | 支持                                                | OpenClaw 将 OpenClaw 特定的提示词/上下文投射到 Codex 轮次中，同时将 Codex 拥有的基础、模型和配置的项目文档提示词保留在原生 Codex 通道中。OpenClaw 会为原生线程禁用 Codex 的内置角色，以便智能体工作区角色文件保持权威性。原生 Codex 开发者指令仅接受明确限定范围为 `codex_app_server` 的命令指导；遗留的全局命令提示仍用于非 Codex 提示词界面。 |
| 上下文引擎生命周期                | 支持                                                | 组装、摄取和轮次后维护围绕 Codex 轮次运行。上下文引擎不会取代原生 Codex 压缩。                                                                                                                                                                                                                                                                  |
| 动态工具钩子                      | 已支持                                              | `before_tool_call`、`after_tool_call` 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                                                                                                                                                                                                        |
| 生命周期钩子                      | 作为适配器观察支持                                  | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会使用真实的 Codex 模式负载触发。                                                                                                                                                                                                                             |
| 最终答案修订门控                  | 通过原生钩子中继支持                                | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 请求 Codex 在最终确定之前再进行一次模型传递。                                                                                                                                                                                                                                           |
| 原生 shell、补丁和 MCP 阻止或观察 | 通过原生钩子中继支持                                | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的原生工具界面进行中继，包括 Codex 应用服务器 `0.125.0` 或更新版本上的 MCP 负载。支持阻止；不支持参数重写。                                                                                                                                                                                       |
| 原生权限策略                      | 通过 Codex 应用服务器审批和兼容的原生 Hook 中继支持 | Codex 应用服务器审批请求在 Codex 审查后通过 OpenClaw 路由。`PermissionRequest` 原生 Hook 中继对于原生审批模式是可选的，因为 Codex 在监护人审查之前发出它。                                                                                                                                                                                      |
| 应用服务器轨迹捕获                | 支持                                                | OpenClaw 记录其发送到应用服务器的请求及其接收到的应用服务器通知。                                                                                                                                                                                                                                                                               |

在 Codex 运行时 v1 中不支持：

| 表面                                            | V1 边界                                                                                                       | 未来路径                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 原生工具参数变更                                | Codex 原生工具前 Hook 可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                     | 需要 Codex Hook/架构支持以替换工具输入。                      |
| 可编辑的 Codex 原生脚本历史记录                 | Codex 拥有规范的原生线程历史记录。OpenClaw 拥有一个镜像并且可以投影未来上下文，但不应该变更不支持的内部结构。 | 如果需要原生线程编辑，请添加显式的 Codex 应用服务器 API。     |
| 用于 Codex 原生工具记录的 `tool_result_persist` | 该 Hook 转换 OpenClaw 拥有的脚本写入，而不是 Codex 原生工具记录。                                             | 可以镜像转换后的记录，但规范重写需要 Codex 支持。             |
| 丰富的原生压缩元数据                            | OpenClaw 可以请求原生压缩，但不会收到稳定的保留/丢弃列表、Token 增量、完成摘要或摘要负载。                    | 需要更丰富的 Codex 压缩事件。                                 |
| 压缩干预                                        | OpenClaw 不允许插件或上下文引擎否决、重写或替换原生 Codex 压缩。                                              | 如果插件需要否决或重写原生压缩，请添加 Codex 压缩前/后 Hook。 |
| 逐字节的模型 API 请求捕获                       | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心会在内部构建最终的 OpenAI API 请求。                      | 需要 Codex 模型请求跟踪事件或调试 API。                       |

## 原生权限和 MCP 引出

对于 `PermissionRequest`OpenClaw，OpenClaw 仅在策略决定时返回明确的允许或拒绝决策。无决策结果并非允许。Codex 将其视为无 hook 决策，并回退到其自己的 guardian 或用户批准路径。

Codex 应用服务器批准模式默认省略此原生 hook。当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中或兼容运行时安装它时，此行为适用。

当操作员为 Codex 原生权限请求选择 `allow-always`OpenClaw 时，OpenClaw 会在有限的会话窗口内记住该确切的提供商/会话/工具输入/cwd 指纹。记住的决策仅限于精确匹配：更改的命令、参数、工具负载或 cwd 会创建一个新的批准请求。

当 Codex 将 OpenClaw`_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具批准请求通过 OpenClaw 的插件批准流程进行路由。Codex `request_user_input` 提示被发送回原始聊天，并且下一个排队的后续消息回答该原生服务器请求，而不是作为额外上下文被引导。其他 MCP 请求以失败关闭。

有关携带这些提示的常规插件批准流程，请参阅 [插件权限请求](/zh/plugins/plugin-permission-requests)。

## 队列引导

活动运行队列引导映射到 Codex 应用服务器 `turn/steer`。使用默认的 `messages.queue.mode: "steer"`OpenClaw，OpenClaw 会将引导模式的聊天消息在配置的静默窗口内进行批处理，并按到达顺序作为一个 `turn/steer` 请求发送。

Codex 审查和手动压缩回合可以拒绝同回合引导。在这种情况下，OpenClaw 会等待活动运行完成后再开始提示。当消息默认应排队而不是被引导时，请使用 OpenClaw`/queue followup` 或 `/queue collect`。请参阅 [引导队列](/zh/concepts/queue-steering)。

## Codex 反馈上传

当 `/diagnostics [note]`OpenClaw 针对使用原生 Codex harness 的会话获得批准时，OpenClaw 也会为相关的 Codex 线程调用 Codex app-server `feedback/upload`。此上传请求 app-server 包含每个列出的线程以及生成的 Codex 子线程的日志（如果有）。

上传会通过 Codex 的常规反馈路径发送到 OpenAI 服务器。如果该 app-server 中禁用了 Codex 反馈，该命令将返回 app-server 错误。完成的诊断回复会列出已发送线程的渠道、OpenClaw 会话 ID、Codex 线程 ID 以及本地 OpenAIOpenClaw`codex resume <thread-id>` 命令。

如果您拒绝或忽略该批准，OpenClaw 将不会打印那些 Codex ID，也不会发送 Codex 反馈。此上传不会取代本地的 Gateway 诊断导出。有关批准、隐私、本地包和群聊行为，请参阅[诊断导出](<OpenClawGateway(网关)/en/gateway/diagnostics>)。

仅当您特别想要针对当前附加线程的 Codex 反馈上传而不需要完整的 Gateway 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

## 压缩和脚本镜像

当所选模型使用 Codex harness 时，原生线程压缩属于 Codex app-server。OpenClaw 不会为 Codex 轮次运行预检压缩，不会用上下文引擎压缩取代 Codex 压缩，并且在无法启动原生 Codex 压缩时也不会回退到 OpenClaw 或公共 OpenAI 摘要生成。OpenClaw 会为渠道历史记录、搜索、OpenClawOpenClawOpenAIOpenClaw`/new`、`/reset` 以及未来的模型或 harness 切换保留脚本镜像。

显式压缩请求，例如 `/compact` 或插件请求的手动压缩操作，会使用 `thread/compact/start` 启动原生 Codex 压缩。OpenClaw 在启动该原生操作后即返回。它不会等待完成、强加单独的 OpenClaw 超时、重启共享的 Codex 应用服务器，或将该操作记录为 OpenClaw 完成的压缩。

当上下文引擎请求 Codex 线程引导投影 时，OpenClaw 会将工具调用名称和 ID、输入形状以及编辑过的工具结果内容投射到新的 Codex 线程中。它不会将原始工具调用参数值复制到该投影中。

镜像包括用户提示、最终助手文本以及轻量级 Codex 推理或计划记录（当应用服务器发出它们时）。目前，OpenClaw 仅在请求压缩时记录显式的原生压缩启动信号。它不会公开人类可读的压缩摘要或 Codex 压缩后保留的条目的可审核列表。

由于 Codex 拥有规范的原生线程，因此 `tool_result_persist` 目前不会重写 Codex 原生工具结果记录。它仅适用于 OpenClaw 正在写入 OpenClaw 拥有的会话转录工具结果的情况。

## 媒体和交付

OpenClaw 继续拥有媒体交付和媒体提供商的选择权。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的提供商/模型设置，例如 `agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、批准和消息工具输出继续通过正常的 OpenClaw 交付路径进行。媒体生成不需要遗留运行时。当 Codex 发出带有 `savedPath` 的原生图像生成项时，OpenClaw 会通过正常回复媒体路径转发该确切文件，即使 Codex 回合没有助手文本。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness 参考](/zh/plugins/codex-harness-reference)
- [原生 Codex 插件](/zh/plugins/codex-native-plugins)
- [插件挂钩](/zh/plugins/hooks)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
- [诊断导出](/zh/gateway/diagnostics)
- [轨迹导出](/zh/tools/trajectory)
