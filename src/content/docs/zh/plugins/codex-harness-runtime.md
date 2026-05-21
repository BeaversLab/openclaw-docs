---
summary: "Codex harness 的运行时边界、钩子、工具、权限和诊断"
title: "Codex harness 运行时"
read_when:
  - You need the Codex harness runtime support contract
  - You are debugging native Codex tools, hooks, compaction, or feedback upload
  - You are changing plugin behavior across PI and Codex harness turns
---

本页面记录了 Codex harness 轮次的运行时约定。有关设置和
路由，请从 [Codex harness](/zh/plugins/codex-harness) 开始。有关配置字段，
请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)。

## 概述

Codex 模式并非底层调用不同模型的 PI。Codex 拥有更多原生模型循环的所有权，而 OpenClaw 则在该边界周围调整其插件、工具、会话和诊断表面。

OpenClaw 仍然拥有渠道路由、会话文件、可见消息传递、
OpenClaw 动态工具、审批、媒体传递和抄本镜像。
Codex 拥有规范的本地线程、本地模型循环、本地工具
延续和本地压缩，除非活动的 OpenClaw 上下文引擎
声明它拥有压缩。

提示路由遵循所选的运行时，而不仅仅是提供商字符串。
原生 Codex 轮次接收 Codex 应用服务器开发者指令，而
显式的 PI 兼容性路由即使使用 Codex 风格的 OpenClaw 身份验证或传输，也会保留正常的 OpenAI/PI 系统提示。

原生 Codex 根据活动的 Codex 线程配置保留 Codex 拥有的基础/模型/个性指令和
项目文档行为。轻量级
OpenClaw 运行仍保留其现有的项目文档抑制。OpenClaw
开发者指令涵盖 OpenClaw 运行时关注点，例如源渠道
交付、OpenClaw 动态工具、ACP 委托、适配器上下文以及
活动的代理工作区配置文件。OpenClaw 技能目录加上 `MEMORY.md`
和活动 `BOOTSTRAP.md` 内容被投射为原生 Codex 的轮次输入参考上下文。

## 线程绑定和模型更改

当 OpenClaw 会话附加到现有 Codex 线程时，下一轮
会将当前选定的 OpenAI 模型、批准策略、沙箱和服务
层级再次发送到应用服务器。从 `openai/gpt-5.5` 切换到
`openai/gpt-5.2` 会保留线程绑定，但要求 Codex 使用
新选择的模型继续。

## 可见回复和心跳

当直接/源聊天轮次通过 Codex harness 运行时，可见回复
默认为消息工具：最终助手文本保持私密，除非
代理调用 `message(action="send")`。这非常匹配 GPT 模型，因为它们
可以决定源渠道输出是否有用。设置
`messages.visibleReplies: "automatic"` 可恢复最终
助手文本自动发布的旧模式。

Codex 心跳轮次默认也会在可搜索的 OpenClaw 工具目录中获得 `heartbeat_respond`OpenClaw，以便代理可以记录唤醒应保持静默还是发出通知，而无需在最终文本中编码该控制流。

针对心跳的特定主动权指导会作为 Codex 协作模式的开发者指令发送在心跳轮次本身。普通聊天轮次会恢复 Codex 默认模式，而不是在其常规运行时提示中携带心跳理念。当存在非空的 `HEARTBEAT.md` 时，心跳协作模式指令会将 Codex 指向该文件，而不是内联其内容。

## Hook 边界

Codex 装置包含三个 Hook 层：

| 层级                       | 所有者            | 用途                                                 |
| -------------------------- | ----------------- | ---------------------------------------------------- |
| OpenClaw 插件 Hooks        | OpenClaw          | 跨 PI 和 Codex 装置的产品/插件兼容性。               |
| Codex 应用服务器扩展中间件 | OpenClaw 捆绑插件 | 围绕 OpenClaw 动态工具的每轮适配器行为。             |
| Codex 原生 Hooks           | Codex             | 来自 Codex 配置的低级 Codex 生命周期和原生工具策略。 |

OpenClaw 不使用项目或全局 Codex OpenClaw`hooks.json`OpenClawOpenClaw 文件来路由 OpenClaw 插件行为。对于支持的原生工具和权限桥接，OpenClaw 会为 `PreToolUse`、`PostToolUse`、`PermissionRequest` 和 `Stop` 注入每线程 Codex 配置。

当启用 Codex 应用服务器审批时，即 `approvalPolicy` 不为 `"never"` 时，默认注入的原生 Hook 配置会省略 `PermissionRequest`OpenClaw，以便在审查后由 Codex 的应用服务器审查器和 OpenClaw 的审批桥接处理实际的升级。当需要兼容性中继时，操作员可以显式地将 `permission_request` 添加到 `nativeHookRelay.events`。

其他 Codex Hooks（如 `SessionStart` 和 `UserPromptSubmit`OpenClaw）仍然是 Codex 级别的控制。它们在 v1 协议中不会作为 OpenClaw 插件 Hooks 暴露。

对于 OpenClaw 动态工具，OpenClaw 在 Codex 请求调用后执行该工具，因此 OpenClaw 会触发其在 harness 适配器中拥有的插件和中间件行为。对于 Codex 原生工具，Codex 拥有规范工具记录。OpenClaw 可以镜像选定的事件，但除非 Codex 通过应用服务器或原生 hook 回调暴露该操作，否则它无法重写原生 Codex 线程。

Codex 应用服务器项目通知还为原生工具完成提供异步 `after_tool_call` 观察结果，这些观察结果尚未被原生 `PostToolUse` 中继覆盖。这些观察结果仅用于遥测和插件兼容性；它们无法阻止、延迟或改变原生工具调用。

压缩和 LLM 生命周期预测来自 Codex 应用服务器通知和 OpenClaw 适配器状态，而非原生 Codex hook 命令。OpenClaw 的 `before_compaction`、`after_compaction`、`llm_input` 和 `llm_output` 事件是适配器级别的观察结果，而非 Codex 内部请求或压缩负载的字节级捕获。

Codex 原生 `hook/started` 和 `hook/completed` 应用服务器通知被投射为 `codex_app_server.hook` 代理事件，用于轨迹追踪和调试。它们不会调用 OpenClaw 插件 hooks。

## V1 支持合约

Codex 运行时 v1 中支持：

| 表面                              | 支持                                              | 原因                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 通过 Codex 进行 OpenAI 模型循环   | 支持                                              | Codex 应用服务器拥有 OpenAI 轮次、原生线程恢复和原生工具续接。                                                                                                                                                                                                                        |
| OpenClaw 渠由和投递               | 支持                                              | Telegram、Discord、Slack、WhatsApp、iMessage 和其他渠道位于模型运行时之外。                                                                                                                                                                                                           |
| OpenClaw 动态工具                 | 支持                                              | Codex 请求 OpenClaw 执行这些工具，因此 OpenClaw 保持在执行路径中。                                                                                                                                                                                                                    |
| 提示词和上下文插件                | 支持                                              | OpenClaw 将 OpenClaw 特有的提示词/上下文注入到 Codex 轮次中，同时将 Codex 拥有的基础、模型、个性和配置的项目文档提示词保留在原生 Codex 通道中。原生 Codex 开发者指令仅接受显式限定于 OpenClawOpenClaw`codex_app_server` 的命令指导；旧版的全局命令提示仍保留用于非 Codex 提示词表面。 |
| 上下文引擎生命周期                | 支持                                              | 为 Codex 轮次运行组装、摄取、轮次后维护以及上下文引擎压缩协调。                                                                                                                                                                                                                       |
| 动态工具钩子                      | 支持                                              | `before_tool_call`、`after_tool_call`OpenClaw 和工具结果中间件围绕 OpenClaw 拥有的动态工具运行。                                                                                                                                                                                      |
| 生命周期钩子                      | 作为适配器观察支持                                | `llm_input`、`llm_output`、`agent_end`、`before_compaction` 和 `after_compaction` 会使用真实的 Codex 模式负载触发。                                                                                                                                                                   |
| 最终答案修订网关                  | 通过原生钩子中继支持                              | Codex `Stop` 被中继到 `before_agent_finalize`；`revise` 要求 Codex 在最终确定之前再进行一次模型传递。                                                                                                                                                                                 |
| 原生 shell、补丁和 MCP 阻塞或观察 | 通过原生钩子中继支持                              | Codex `PreToolUse` 和 `PostToolUse` 针对已提交的原生工具表面进行中继，包括 Codex 应用服务器 `0.125.0` 或更新版本上的 MCP 负载。支持阻塞；不支持参数重写。                                                                                                                             |
| 原生权限策略                      | 通过 Codex 应用服务器批准和兼容性原生钩子中继支持 | Codex 应用服务器批准请求在 Codex 审查后通过 OpenClaw 路由。对于原生批准模式，OpenClaw`PermissionRequest` 原生钩子中继是可选启用的，因为 Codex 会在守护者审查之前发出它。                                                                                                              |
| 应用服务器轨迹捕获                | 支持                                              | OpenClaw 记录其发送到应用服务器的请求及其收到的应用服务器通知。                                                                                                                                                                                                                       |

Codex 运行时 v1 中不支持：

| 表面                                          | V1 边界                                                                                                   | 未来路径                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 原生工具参数变更                              | Codex 原生前置工具挂钩可以阻止，但 OpenClaw 不会重写 Codex 原生工具参数。                                 | 需要 Codex 挂钩/架构支持来替换工具输入。                         |
| 可编辑的 Codex 原生对话记录历史               | Codex 拥有规范的本地线程历史。OpenClaw 拥有一个镜像并且可以投射未来上下文，但不应该更改不支持的内部结构。 | 如果需要本地线程手术，请添加显式的 Codex 应用服务器 API。        |
| `tool_result_persist` 用于 Codex 原生工具记录 | 该挂钩转换 OpenClaw 拥有的对话记录写入，而不是 Codex 原生工具记录。                                       | 可以镜像转换后的记录，但规范重写需要 Codex 支持。                |
| 丰富的本地压缩元数据                          | OpenClaw 观察压缩的开始和完成，但不会收到稳定的保留/删除列表、令牌增量或摘要负载。                        | 需要更丰富的 Codex 压缩事件。                                    |
| 压缩干预                                      | 当前的 OpenClaw 压缩挂钩在 Codex 模式下属于通知级别。                                                     | 如果插件需要否决或重写本地压缩，请添加 Codex 前置/后置压缩挂钩。 |
| 逐字节的模型 API 请求捕获                     | OpenClaw 可以捕获应用服务器请求和通知，但 Codex 核心在内部构建最终的 OpenAI API 请求。                    | 需要 Codex 模型请求跟踪事件或调试 API。                          |

## 本地权限和 MCP 询问

对于 `PermissionRequest`，当策略决定时，OpenClaw 仅返回明确的允许或拒绝决定。无决定结果不是允许。Codex 将其视为无挂钩决定，并回退到其自身的守护程序或用户批准路径。

Codex 应用服务器批准模式默认省略此本地挂钩。当 `permission_request` 被显式包含在 `nativeHookRelay.events` 中，或者兼容运行时安装它时，此行为适用。

当操作员为 Codex 原生权限请求选择 `allow-always`OpenClaw 时，OpenClaw 会在有限的会话窗口内记住该确切的提供商/会话/工具输入/cwd 指纹。记住的决定故意仅限精确匹配：更改的命令、参数、工具负载或 cwd 会创建一个新的审批。

当 Codex 将 OpenClaw`_meta.codex_approval_kind` 标记为 `"mcp_tool_call"` 时，Codex MCP 工具审批请求会通过 OpenClaw 的插件审批流程进行路由。Codex `request_user_input` 提示会发送回发起的聊天，下一个排队的后续消息会回答该原生服务器请求，而不是作为额外的上下文被引导。其他 MCP 请求将失败关闭。

## 队列引导

活动运行的队列引导映射到 Codex 应用服务器的 `turn/steer`。使用默认的 `messages.queue.mode: "steer"`OpenClaw，OpenClaw 会将引导模式聊天消息在配置的静默窗口内进行批处理，并按照到达顺序作为一个 `turn/steer` 请求发送它们。

Codex 审查和手动压缩轮次可以拒绝同轮引导。在这种情况下，OpenClaw 会等待活动运行完成后再开始提示。当消息默认应该排队而不是引导时，请使用 OpenClaw`/queue followup` 或 `/queue collect`。请参阅 [引导队列](/zh/concepts/queue-steering)。

## Codex 反馈上传

当为使用原生 Codex harness 的会话批准 `/diagnostics [note]`OpenClaw 时，OpenClaw 还会为相关的 Codex 线程调用 Codex 应用服务器 `feedback/upload`。上传会请求应用服务器包含每个列出的线程以及生成的 Codex 子线程（如果可用）的日志。

上传通过 Codex 的常规反馈路径发送到 OpenAI 服务器。如果在该应用服务器中禁用了 Codex 反馈，该命令将返回应用服务器错误。完成的诊断回复列出了已发送线程的频道、OpenClaw 会话 ID、Codex 线程 ID 和本地 OpenAIOpenClaw`codex resume <thread-id>` 命令。

如果您拒绝或忽略该批准，OpenClaw 将不会打印那些 Codex ID，也不会发送 Codex 反馈。该上传不会替换本地的 Gateway(网关) 诊断导出。有关批准、隐私、本地包和群聊行为，请参阅 [诊断导出](<OpenClawGateway(网关)/en/gateway/diagnostics>)。

仅当您特别想要当前附加线程的 Codex 反馈上传，而不需要完整的 Gateway(网关) 诊断包时，才使用 `/codex diagnostics [note]`Gateway(网关)。

## 压缩和记录镜像

当所选的模型使用 Codex harness 时，除非活动的上下文引擎声明 `ownsCompaction: true`OpenClawOpenClaw，否则原生线程压缩会委托给 Codex 应用服务器。拥有上下文引擎会先进行压缩，并导致 OpenClaw 放弃旧的 Codex 后端线程，以便下一轮可以从引擎管理的上下文中重新填充新线程。OpenClaw 会保留渠道历史记录、搜索、`/new`、`/reset` 以及未来的模型或 harness 切换的记录镜像。

当上下文引擎请求 Codex 线程引导投影时，OpenClaw 会将工具调用名称和 ID、输入形状以及经过编辑的工具结果内容投射到新的 Codex 线程中。它不会将原始工具调用参数值复制到该投影中。

当应用服务器发出记录时，镜像包括用户提示、最终助手文本以及轻量级的 Codex 推理或计划记录。目前，OpenClaw 仅记录原生压缩开始和完成信号。它尚未公开人类可读的压缩摘要或 Codex 在压缩后保留的条目的可审计列表。

由于 Codex 拥有规范的原生线程，`tool_result_persist`OpenClawOpenClaw 目前不会重写 Codex 原生工具结果记录。它仅适用于 OpenClaw 正在写入 OpenClaw 拥有的会话记录工具结果的情况。

## 媒体和交付

OpenClaw 继续拥有媒体交付和媒体提供商选择权。图像、视频、音乐、PDF、TTS 和媒体理解使用匹配的提供商/模型设置，例如 OpenClaw`agents.defaults.imageGenerationModel`、`videoGenerationModel`、`pdfModel` 和 `messages.tts`。

文本、图像、视频、音乐、TTS、审批和消息工具输出继续通过常规的 OpenClaw 交付路径。媒体生成不需要 PI。当 Codex 发出带有 OpenClaw`savedPath`OpenClaw 的原生图像生成项时，即使 Codex 轮次没有助手文本，OpenClaw 也会通过常规回复媒体路径转发该确切的文件。

## 相关

- [Codex harness](/zh/plugins/codex-harness)
- [Codex harness reference](/zh/plugins/codex-harness-reference)
- [Native Codex plugins](/zh/plugins/codex-native-plugins)
- [Plugin hooks](/zh/plugins/hooks)
- [Agent harness plugins](/zh/plugins/sdk-agent-harness)
- [Diagnostics export](/zh/gateway/diagnostics)
- [Trajectory export](/zh/tools/trajectory)
