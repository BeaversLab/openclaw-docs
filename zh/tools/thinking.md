---
summary: “/think、/fast、/verbose 以及推理可见性的指令语法”
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: “思考级别”
---

# 思考级别（/think 指令）

## 作用

- 任何入站正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “think”（思考）
  - low → “think hard”（深入思考）
  - medium → “think harder”（更深入思考）
  - high → “ultrathink”（超常思考，最大预算）
  - xhigh → “ultrathink+” （仅限 GPT-5.2 + Codex 模型）
  - adaptive → 提供商管理的自适应推理预算（支持 Anthropic Claude 4.6 系列模型）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射到 `xhigh`。
  - `highest`、`max` 映射到 `high`。
- 提供商说明：
  - 当未设置显式思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive`。
  - Z.AI (`zai/*`) 仅支持二元思考 (`on`/`off`)。任何非 `off` 级别都被视为 `on`（映射到 `low`）。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射到 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射到 `thinking: { type: "enabled" }`。当启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值标准化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息来设置）。
3. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
4. 回退值：Anthropic Claude 4.6 模型为 `adaptive`，其他具备推理能力的模型为 `low`，其他情况为 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许包含空格），例如 `/think:medium` 或 `/t high`。
- 该设置将在当前会话中保持有效（默认为按发送者）；通过 `/think:off` 或会话空闲重置来清除。
- 发送确认回复 (`Thinking level set to high.` / `Thinking disabled.`)。如果级别无效（例如 `/thinking big`），该命令将被拒绝并给出提示，且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）以查看当前的思考级别。

## Agent 应用

- **嵌入式 Pi**：解析出的级别会传递给进程内的 Pi agent 运行时。

## 快速模式 (/fast)

- 级别：`on|off`。
- 仅指令消息切换会话快速模式覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送 `/fast`（或 `/fast status`）且不带模式，以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  4. 回退：`off`
- 对于 `openai/*`，快速模式应用 OpenAI 快速配置文件：`service_tier=priority`（受支持时），外加低推理强度和低文本冗长度。
- 对于 `openai-codex/*`，快速模式在 Codex 响应上应用相同的低延迟配置文件。OpenClaw 在两种身份验证路径之间保持一个共享的 `/fast` 开关。
- 对于直接的 `anthropic/*` API 密钥请求，快速模式映射到 Anthropic 服务等级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- Anthropic 快速模式仅限于 API 密钥。对于 Claude 设置令牌 / OAuth 身份验证以及非 Anthropic 代理基础 URL，OpenClaw 会跳过注入 Anthropic 服务等级。

## 详细指令 (/verbose 或 /v)

- 级别：`on` (最少) | `full` | `off` (默认)。
- 仅包含指令的消息会切换会话详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别将返回提示而不会更改状态。
- `/verbose off` 存储显式的会话覆盖；通过选择 `inherit` 在会话 UI 中清除它。
- 内联指令仅影响该消息；否则适用会话/全局默认设置。
- 发送 `/verbose`（或 `/verbose:`）且不带参数，以查看当前的详细级别。
- 当详细模式开启时，发出结构化工具结果的智能体（Pi、其他 JSON 智能体）会将每个工具调用作为仅包含元数据的消息发回，并在可用时加上 `<emoji> <tool-name>: <arg>` 前缀（路径/命令）。这些工具摘要会在每个工具启动时立即发送（独立的气泡），而不是作为流式增量发送。
- 工具失败摘要在普通模式下仍然可见，但原始错误详情后缀会被隐藏，除非详细模式为 `on` 或 `full`。
- 当 `full` 详细模式时，工具输出也会在完成后被转发（单独的气泡，截断为安全长度）。如果在运行进行中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅指令消息切换回复中是否显示思考块。
- 启用后，推理作为**单独消息**发送，前缀为 `Reasoning:`。
- `stream`（仅限 Telegram）：在回复生成期间将推理流式传输到 Telegram 草稿气泡，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）且不带参数，以查看当前的推理级别。

## 相关

- Elevated 模式文档位于 [Elevated mode](/zh/en/tools/elevated)。

## 心跳

- 心跳探测主体是配置的心跳提示词（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常适用（但请避免从心跳更改会话默认值）。
- 心跳传送默认仅针对最终载荷。要同时发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或按代理设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- Web 聊天思考选择器在页面加载时反映传入会话存储/配置中会话的存储级别。
- 选择另一个级别仅适用于下一条消息（`thinkingOnce`）；发送后，选择器将恢复为存储的会话级别。
- 要更改会话默认值，请发送 `/think:<level>` 指令（与之前相同）；选择器将在下次重新加载后反映更改。

import zh from '/components/footer/zh.mdx';

<zh />
