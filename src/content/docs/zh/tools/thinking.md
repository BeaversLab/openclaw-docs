---
summary: "/think、/fast、/verbose、/trace 和推理可见性的指令语法"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考级别"
---

# 思考级别（/think 指令）

## 作用

- 任何入站主体中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (最大预算)
  - xhigh → “ultrathink+” （GPT-5.2 + Codex 模型和 Anthropic Claude Opus 4.7 effort）
  - adaptive → 提供商管理的自适应思考（支持 Anthropic/Bedrock 上的 Claude 4.6 和 Anthropic Claude Opus 4.7）
  - max → 提供商最大推理（目前为 Anthropic Claude Opus 4.7）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest` 映射到 `high`。
- 提供商说明：
  - `adaptive` 仅在声明支持自适应思考的提供商/模型的原生命令菜单和选择器中显示。为了与现有配置和别名兼容，它仍然作为键入的指令被接受。
  - `max` 仅在声明支持最大思考的提供商/模型的原生命令菜单和选择器中显示。当所选模型不支持 `max` 时，现有的已存储 `max` 设置将重新映射到该模型支持的最大级别。
  - Anthropic Claude 4.6 模型在未设置明确思考级别时默认为 `adaptive`。
  - Anthropic Claude Opus 4.7 默认不采用自适应思考。除非您明确设置了思考级别，否则其 API 努力程度默认值仍由提供商拥有。
  - Anthropic Claude Opus 4.7 将 `/think xhigh` 映射到自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的努力程度设置。
  - Anthropic Claude Opus 4.7 还公开了 `/think max`；它映射到同一条提供商拥有的最大努力程度路径。
  - OpenAI GPT 模型通过模型特定的 Responses API 努力程度支持来映射 `/think`。`/think off` 仅在目标模型支持时发送 `reasoning.effort: "none"`；否则，OpenClaw 将省略禁用的推理有效负载，而不是发送不支持的值。
  - 在 Anthropic 兼容的流式路径上，MiniMax (`minimax/*`) 默认使用 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中显式设置了 thinking。这可以避免从 MiniMax 非原生的 Anthropic 流格式中泄漏 `reasoning_content` 增量。
  - Z.AI (`zai/*`) 仅支持二元思考 (`on`/`off`)。任何非 `off` 级别都将被视为 `on` (映射到 `low`)。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。当启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值标准化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 每个代理的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退值：对于 Anthropic Claude 4.6 模型为 `adaptive`；对于 Anthropic Claude Opus 4.7 为 `off`（除非明确配置）；对于其他具备推理能力的模型为 `low`；否则为 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许包含空白字符），例如 `/think:medium` 或 `/t high`。
- 该设置在当前会话中持续有效（默认按发送者区分）；通过 `/think:off` 或会话空闲重置清除。
- 将发送确认回复 (`Thinking level set to high.` / `Thinking disabled.`)。如果级别无效（例如 `/thinking big`），该命令将被拒绝并附带提示，且会话状态保持不变。
- 发送不带参数的 `/think` (或 `/think:`) 以查看当前的思考级别。

## 由代理应用

- **嵌入式 Pi**：解析后的级别会传递给进程内的 Pi 代理运行时。

## 快速模式 (/fast)

- 级别：`on|off`。
- 仅指令消息会切换会话快速模式覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不附带模式的 `/fast`（或 `/fast status`）以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每个代理的默认值 (`agents.list[].fastModeDefault`)
  4. 每个模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在两种认证路径之间保留一个共享的 `/fast` 切换开关。
- 对于直接公开的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式映射到 Anthropic 服务层：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 明确的 Anthropic `serviceTier` / `service_tier` 模型参数会在两者都设置时覆盖快速模式默认值。OpenClaw 仍会为非 Anthropic 代理基础 URL 跳过 Anthropic 服务层注入。

## 详细指令 (/verbose 或 /v)

- 级别：`on`（最小）| `full` | `off`（默认）。
- 仅指令消息切换会话详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别返回提示而不更改状态。
- `/verbose off` 存储明确的会话覆盖；通过在 Sessions UI 中选择 `inherit` 来清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/verbose`（或 `/verbose:`）且不带参数，以查看当前的详细级别。
- 当 verbose 开启时，发出结构化工具结果（Pi、其他 JSON agents）的 agents 会将每个工具调用作为仅元数据的消息发送回去，并在可用时（路径/命令）以 `<emoji> <tool-name>: <arg>` 为前缀。这些工具摘要会在每个工具启动时立即发送（独立的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下保持可见，但原始错误详细信息后缀是隐藏的，除非 verbose 为 `on` 或 `full`。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（独立的气泡，截断到安全长度）。如果在运行过程中切换 `/verbose on|full|off`，随后的工具气泡将遵守新设置。

## 插件跟踪指令 (/trace)

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/trace`（或 `/trace:`）且不带参数，以查看当前的跟踪级别。
- `/trace` 比 `/verbose` 更窄：它仅显示插件拥有的跟踪/调试行，例如 Active Memory 调试摘要。
- 跟踪行可以出现在 `/status` 中，并作为正常助手回复之后的后续诊断消息。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅包含指令的消息切换是否在回复中显示思考块。
- 启用时，推理将作为以 `Reasoning:` 为前缀的**单独消息**发送。
- `stream`（仅限 Telegram）：在生成回复时将推理内容流式传输到 Telegram 草稿气泡中，然后发送不包含推理内容的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，接着是每个代理的默认值（`agents.list[].reasoningDefault`），最后是回退值（`off`）。

## 相关

- 高级模式文档位于 [高级模式](/zh/tools/elevated)。

## 心跳检测

- 心跳探测正文是配置的心跳提示词（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但请避免通过心跳更改会话默认值）。
- 心跳传递默认仅发送最终负载。要同时发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或每个代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- Web 聊天思考选择器在页面加载时反映入站会话存储/配置中存储的会话级别。
- 选择另一个级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等待下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析的默认值来自活动会话模型：对于 Anthropic 上的 Claude 4.6 为 `adaptive`，对于 Anthropic Claude Opus 4.7 除非另有配置否则为 `off`，对于其他具有推理能力的模型为 `low`，否则为 `off`。
- 选择器保持提供商感知：
  - 大多数提供商显示 `off | minimal | low | medium | high`
  - Anthropic/Bedrock Claude 4.6 显示 `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 显示 `off | minimal | low | medium | high | xhigh | adaptive | max`
  - Z.AI 显示二进制 `off | on`
- `/think:<level>` 仍然有效并更新相同的存储会话级别，因此聊天指令和选择器保持同步。
