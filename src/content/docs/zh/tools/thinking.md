---
summary: "/think、/fast、/verbose、/trace 和推理可见性的指令语法"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考级别"
---

# 思考级别（/think 指令）

## 作用

- 任何入站主体中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (最大预算)
  - xhigh → “ultrathink+” （GPT-5.2 + Codex 模型和 Anthropic Claude Opus 4.7 effort）
  - adaptive → 提供商管理的自适应思考（支持 Anthropic Claude 4.6 和 Opus 4.7）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest`、`max` 映射到 `high`。
- 提供商注意事项：
  - Anthropic Claude 4.6 模型在未设置显式思考级别时默认为 `adaptive`。
  - Anthropic Claude Opus 4.7 默认不采用自适应思考。其 API effort 默认值仍归提供商所有，除非您明确设置思考级别。
  - Anthropic Claude Opus 4.7 将 `/think xhigh` 映射到自适应思考外加 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的 effort 设置。
  - MiniMax (`minimax/*`) 在 Anthropic 兼容流式传输路径上默认为 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中明确设置了思考。这可以避免 MiniMax 非原生 Anthropic 流格式泄漏 `reasoning_content` 增量。
  - Z.AI (`zai/*`) 仅支持二元思考 (`on`/`off`)。任何非 `off` 级别都将被视为 `on` （映射到 `low`）。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射到 `thinking: { type: "disabled" }`，将任何非 `off` 级别映射到 `thinking: { type: "enabled" }`。启用思考后，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值标准化为 `auto`。

## 解析顺序

1. 消息中的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息来设置）。
3. 每个代理的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：Anthropic Claude 4.6 模型为 `adaptive`，Anthropic Claude Opus 4.7 为 `off`（除非明确配置），其他具备推理能力的模型为 `low`，其他情况为 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许包含空白字符），例如 `/think:medium` 或 `/t high`。
- 该设置在当前会话中生效（默认按发送方计算）；通过 `/think:off` 或会话空闲重置清除。
- 将发送确认回复 (`Thinking level set to high.` / `Thinking disabled.`)。如果级别无效（例如 `/thinking big`），命令将被拒绝并提示，且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）以查看当前的思考级别。

## 智能体应用

- **嵌入式 Pi**：解析后的级别将传递给进程内 Pi 智能体运行时。

## 快速模式 (/fast)

- 级别：`on|off`。
- 仅指令的消息会切换会话快速模式覆盖，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 按智能体默认值 (`agents.list[].fastModeDefault`)
  4. 按模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退值：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在两种认证路径之间保持一个共享的 `/fast` 切换开关。
- 对于直接公开的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式映射到 Anthropic 服务层：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖快速模式的默认值。OpenClaw 仍然会跳过非 Anthropic 代理基本 URL 的 Anthropic 服务层注入。

## 详细指令（/verbose 或 /v）

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话的详细模式，并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别将返回提示而不改变状态。
- `/verbose off` 存储显式的会话覆盖；通过 Sessions UI 选择 `inherit` 来清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）以查看当前的详细级别。
- 当详细模式开启时，发出结构化工具结果的代理（Pi，其他 JSON 代理）会将每个工具调用作为其自己的仅元数据消息发送回去，并在可用时加上 `<emoji> <tool-name>: <arg>` 前缀（路径/命令）。这些工具摘要会在每个工具启动时立即发送（独立的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍然可见，但除非详细级别为 `on` 或 `full`，否则原始错误详细信息后缀会被隐藏。
- 当详细级别为 `full` 时，工具输出也会在完成后转发（独立的气泡，截断到安全长度）。如果在运行进行中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 插件跟踪指令（/trace）

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该条消息；否则应用会话/全局默认值。
- 发送 `/trace`（或 `/trace:`）且不带参数，以查看当前的跟踪级别。
- `/trace` 比 `/verbose` 范围更窄：它仅公开插件拥有的跟踪/调试行，例如主动内存调试摘要。
- 跟踪行可以出现在 `/status` 中，也可以在正常助手回复之后作为后续诊断消息出现。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅包含指令的消息用于切换回复中是否显示思考块。
- 启用后，推理将作为一条以 `Reasoning:` 为前缀的**单独消息**发送。
- `stream`（仅限 Telegram）：在生成回复的同时，将推理流式传输到 Telegram 草稿气泡中，然后发送不带推理的最终答案。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）且不带参数，以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，接着是按代理默认值 (`agents.list[].reasoningDefault`)，最后是回退 (`off`)。

## 相关

- 提升模式文档位于 [Elevated mode](/zh/tools/elevated)。

## 心跳

- 心跳探测正文是配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但避免通过心跳更改会话默认值）。
- 心跳传递默认仅发送最终负载。要同时发送单独的 `Reasoning:` 消息（如果有），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或针对每个代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- 页面加载时，Web 聊天思考选择器会反映来自入站会话存储/配置的会话存储级别。
- 选择另一个级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等待下一次发送，也不是一次性 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析后的默认值来自活动会话模型：在 Anthropic 上使用 Claude 4.6 时为 `adaptive`，除非已配置，对于 Anthropic Claude Opus 4.7 为 `off`，对于其他具备推理能力的模型为 `low`，其他情况为 `off`。
- 选择器保持提供商感知（提供商-aware）：
  - 大多数提供商显示 `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 显示 `off | minimal | low | medium | high | xhigh | adaptive`
  - Z.AI 显示二元 `off | on`
- `/think:<level>` 仍然有效并更新相同的存储会话级别，因此聊天指令和选择器保持同步。
