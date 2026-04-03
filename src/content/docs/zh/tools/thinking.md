---
summary: "/think、/fast、/verbose 和推理可见性的指令语法"
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
  - Z.AI (`zai/*`) 仅支持二进制思考 (`on`/`off`)。任何非 `off` 级别将被视为 `on` (映射到 `low`)。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射到 `thinking: { type: "disabled" }`，将任何非 `off` 级别映射到 `thinking: { type: "enabled" }`。启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 每代理默认（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：对于 Anthropic Claude 4.6 模型为 `adaptive`，对于其他具备推理能力的模型为 `low`，否则为 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许包含空格），例如 `/think:medium` 或 `/t high`。
- 该设置在当前会话中保持有效（默认为按发送者）；通过 `/think:off` 或会话空闲重置清除。
- 发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），则拒绝该命令并给出提示，且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）以查看当前的思考级别。

## 代理应用

- **嵌入式 Pi**：解析出的级别会传递给进程内 Pi 代理运行时。

## 快速模式 (/fast)

- 级别：`on|off`。
- 仅包含指令的消息会切换会话快速模式覆盖，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每代理默认（`agents.list[].fastModeDefault`）
  4. 每模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在两条身份验证路径之间保持一个共享的 `/fast` 切换开关。
- 对于直接公开的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，快速模式映射到 Anthropic 服务层：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖快速模式的默认值。对于非 OpenClaw 代理基础 URL，Anthropic 仍然跳过 Anthropic 服务层注入。

## 详细指令 (/verbose 或 /v)

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅指令的消息切换会话详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别返回提示而不改变状态。
- `/verbose off` 存储显式的会话覆盖；通过 Sessions UI 通过选择 `inherit` 清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）以查看当前详细级别。
- 当详细模式开启时，发出结构化工具结果的代理（Pi，其他 JSON 代理）将每个工具调用作为其自己的仅元数据消息发回，并在可用时以 `<emoji> <tool-name>: <arg>` 为前缀（路径/命令）。这些工具摘要在每个工具启动时立即发送（单独的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍然可见，但除非详细模式为 `on` 或 `full`，否则原始错误详细信息后缀会被隐藏。
- 当 verbose 为 `full` 时，工具输出也会在完成后被转发（单独的气泡，截断至安全长度）。如果在运行过程中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅指令消息切换是否在回复中显示思考块。
- 启用后，推理将作为一条**单独的消息**发送，前缀为 `Reasoning:`。
- `stream`（仅限 Telegram）：在生成回复时，将推理流式传输到 Telegram 的草稿气泡中，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）且不带参数，以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，然后是每个代理的默认值（`agents.list[].reasoningDefault`），最后是回退值（`off`）。

## 相关

- Elevated 模式文档位于 [Elevated mode](/en/tools/elevated)。

## 心跳

- 心跳探测正文是配置的心跳提示（默认值：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但应避免从心跳中更改会话默认值）。
- 心跳传递默认仅发送最终有效载荷。若要同时发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或每个代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- 页面加载时，Web 聊天思考选择器会镜像反映传入会话存储/配置中会话的存储级别。
- 选择另一个级别仅适用于下一条消息（`thinkingOnce`）；发送后，选择器会恢复到存储的会话级别。
- 要更改会话默认值，请发送 `/think:<level>` 指令（照常）；选择器将在下次重新加载后反映该设置。
