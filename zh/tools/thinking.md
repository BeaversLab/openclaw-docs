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
- 对于 `openai/*`，快速模式应用 OpenAI 快速配置文件：在支持时应用 `service_tier=priority`，以及低推理强度和低文本冗长度。
- 对于 `openai-codex/*`，快速模式在 Codex 响应上应用相同的低延迟配置文件。OpenClaw 在这两种身份验证路径之间保持一个共享的 `/fast` 切换开关。
- 对于直接的 `anthropic/*` API 密钥请求，快速模式映射到 Anthropic 服务层级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- Anthropic 快速模式仅支持 API 密钥。OpenClaw 会跳过为 Claude 设置令牌 / Anthropic 认证以及非 OAuth 代理基础 URL 注入 Anthropic 服务层级的操作。

## 详细指令 (/verbose 或 /v)

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅指令消息会切换会话的详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别会返回提示而不改变状态。
- `/verbose off` 存储显式的会话覆盖；通过会话 UI 选择 `inherit` 来清除它。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）以查看当前的详细级别。
- 当详细模式开启时，发出结构化工具结果（Pi，其他 JSON 代理）的代理会将每个工具调用作为其自身的仅元数据消息发回，并在可用时（路径/命令）加上 `<emoji> <tool-name>: <arg>` 前缀。这些工具摘要会在每个工具启动时立即发送（独立的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍然可见，但原始错误详情后缀会被隐藏，除非详细级别为 `on` 或 `full`。
- 当详细级别为 `full` 时，工具输出也会在完成后转发（独立的气泡，截断至安全长度）。如果在运行过程中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅指令消息切换是否在回复中显示思考块。
- 启用后，推理会作为以 `Reasoning:` 为前缀的**单独消息**发送。
- `stream`（仅限 Telegram）：在生成回复时将推理流式传输到 Telegram 草稿气泡中，然后发送不含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，接着是每个代理的默认值（`agents.list[].reasoningDefault`），最后是回退值（`off`）。

## 相关

- 提升模式文档位于 [提升模式](/zh/tools/elevated)。

## 心跳

- 心跳探测正文是配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但避免从心跳更改会话默认值）。
- 心跳传递默认仅包含最终负载。要同时发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或每个代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- 页面加载时，Web 聊天思考选择器会镜像反映传入会话存储/配置中会话的存储级别。
- 选择其他级别仅适用于下一条消息（`thinkingOnce`）；发送后，选择器将恢复到存储的会话级别。
- 要更改会话默认值，请发送 `/think:<level>` 指令（如前所述）；选择器将在下次重新加载后反映这一点。

import zh from "/components/footer/zh.mdx";

<zh />
