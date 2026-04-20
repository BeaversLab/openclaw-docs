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
  - xhigh → “ultrathink+” (仅限 GPT-5.2 + Codex 模型)
  - adaptive → 提供商管理的自适应推理预算（支持 Anthropic Claude 4.6 模型系列）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest`、`max` 映射到 `high`。
- 提供商注意事项：
  - Anthropic Claude 4.6 模型在未设置显式思考级别时默认为 `adaptive`。
  - MiniMax (`minimax/*`) 在 Anthropic 兼容的流式传输路径上默认为 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中显式设置了思考。这可以避免从 MiniMax 非原生 Anthropic 流格式中泄露 `reasoning_content` 增量。
  - Z.AI (`zai/*`) 仅支持二元思考 (`on`/`off`)。任何非 `off` 级别都将被视为 `on` (映射到 `low`)。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值标准化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息来设置）。
3. 每个代理的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 后备值：对于 Anthropic Claude 4.6 模型为 `adaptive`，对于其他具备推理能力的模型为 `low`，否则为 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许空白），例如 `/think:medium` 或 `/t high`。
- 该设置将应用于当前会话（默认为每个发送者）；通过 `/think:off` 或会话空闲重置来清除。
- 将发送确认回复 (`Thinking level set to high.` / `Thinking disabled.`)。如果级别无效（例如 `/thinking big`），该命令将被拒绝并显示提示，且会话状态保持不变。
- 发送不带参数的 `/think` (或 `/think:`) 以查看当前的思考级别。

## 代理应用

- **嵌入式 Pi**：解析后的级别将传递给进程内 Pi 代理运行时。

## 快速模式 (/fast)

- 级别：`on|off`。
- 仅限指令的消息会切换会话快速模式覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送 `/fast`（或 `/fast status`） 且不带模式，以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每个代理的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 后备：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在这两种身份验证路径中保持一个共享的 `/fast` 开关。
- 对于直接公共 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 身份验证流量，快速模式映射到 Anthropic 服务层级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 显式的 Anthropic `serviceTier` / `service_tier` 模型参数会在两者都已设置时覆盖快速模式默认值。OpenClaw 仍然会跳过非 Anthropic 代理基本 URL 的 Anthropic 服务层级注入。

## 详细指令（/verbose 或 /v）

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅限指令的消息会切换会话详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别将返回提示而不更改状态。
- `/verbose off` 存储显式会话覆盖；通过选择 `inherit` 在 Sessions UI 中清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/verbose`（或 `/verbose:`）且不带参数，以查看当前的详细级别。
- 启用详细模式时，发出结构化工具结果（Pi，其他 JSON 代理）的代理会将每个工具调用作为仅元数据消息发回，并在可用时以 `<emoji> <tool-name>: <arg>` 为前缀（路径/命令）。这些工具摘要会在每个工具启动时立即发送（独立的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下保持可见，但原始错误详细信息后缀会被隐藏，除非详细级别为 `on` 或 `full`。
- 当详细级别为 `full` 时，工具输出也会在完成后转发（独立的气泡，截断至安全长度）。如果在运行过程中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 插件跟踪指令 (/trace)

- 级别：`on` | `off` (默认)。
- 仅包含指令的消息会切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送不带参数的 `/trace` (或 `/trace:`) 以查看当前的跟踪级别。
- `/trace` 比 `/verbose` 更窄：它仅显示插件拥有的跟踪/调试行，例如主动内存 (Active Memory) 调试摘要。
- 跟踪行可以出现在 `/status` 中，也可以在正常助手回复后作为后续诊断消息出现。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅包含指令的消息切换回复中是否显示思考块。
- 启用后，推理会作为带有 `Reasoning:` 前缀的**单独消息**发送。
- `stream` (仅限 Telegram)：在回复生成时将推理流式传输到 Telegram 草稿气泡中，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning` (或 `/reasoning:`) 以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，然后是每代理默认值 (`agents.list[].reasoningDefault`)，最后是回退值 (`off`)。

## 相关

- 提升模式 (Elevated mode) 文档位于 [提升模式](/en/tools/elevated)。

## 心跳

- 心跳探测正文是配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但请避免通过心跳更改会话默认值）。
- 心跳传送默认仅发送最终负载。若也要发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或每代理 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- 页面加载时，网页聊天思考选择器会反映入站会话存储/配置中存储的会话级别。
- 选择另一个级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等待下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析后的默认值来自活动会话模型：对于 Anthropic/Bedrock 上的 Claude 4.6 为 `adaptive`，对于其他具备推理能力的模型为 `low`，其他情况则为 `off`。
- 选择器保持对提供商的感知：
  - 大多数提供商显示 `off | minimal | low | medium | high | adaptive`
  - Z.AI 显示二进制的 `off | on`
- `/think:<level>` 仍然有效，并更新相同的存储会话级别，因此聊天指令和选择器保持同步。
