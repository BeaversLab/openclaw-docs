---
title: "Thinking Levels"
summary: "/think + /verbose 的指令语法与对模型推理的影响"
read_when:
  - 调整 thinking 或 verbose 指令解析/默认值
---
# 思考等级（/think 指令）

## 它做什么
- 可在任意入站消息中使用行内指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 等级（别名）：`off | minimal | low | medium | high | xhigh`（仅 GPT-5.2 + Codex 模型）
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink”（最大预算）
  - xhigh → “ultrathink+”（仅 GPT-5.2 + Codex 模型）
  - `highest`、`max` 映射为 `high`。
- Provider 说明：
  - Z.AI（`zai/*`）仅支持二元 thinking（`on`/`off`）。任何非 `off` 都视为 `on`（映射到 `low`）。

## 解析顺序
1. 消息中的行内指令（仅对该消息生效）。
2. 会话覆盖（通过仅指令消息设置）。
3. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
4. 回退：对支持推理的模型为 low，否则为 off。

## 设置会话默认值
- 发送 **仅包含** 指令的消息（允许空白），例如 `/think:medium` 或 `/t high`。
- 会对当前会话生效（默认按发送者）；可用 `/think:off` 或会话空闲重置清除。
- 会发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。若等级无效（如 `/thinking big`），命令会被拒绝并提示，且会话状态不变。
- 发送 `/think`（或 `/think:`）且不带参数可查看当前思考等级。

## 按 agent 的应用
- **Embedded Pi**：解析后的等级会传递给进程内的 Pi agent 运行时。

## Verbose 指令（/verbose 或 /v）
- 等级：`on`（最小）| `full` | `off`（默认）。
- 仅指令消息会切换会话 verbose，并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效等级会返回提示且不改变状态。
- `/verbose off` 会存储显式会话覆盖；在 Sessions UI 中选择 `inherit` 可清除。
- 行内指令仅影响该消息；否则遵循会话/全局默认值。
- 发送 `/verbose`（或 `/verbose:`）且不带参数可查看当前 verbose 等级。
- 当 verbose 为 on 时，输出结构化工具结果的 agent（Pi、其他 JSON agent）会把每个工具调用作为单独的元数据消息返回，若可用则前缀 `<emoji> <tool-name>: <arg>`（路径/命令）。这些工具摘要在每个工具开始时发送（独立气泡），而不是流式增量。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（独立气泡，截断到安全长度）。如果在运行中切换 `/verbose on|full|off`，后续工具气泡会遵循新的设置。

## 推理可见性（/reasoning）
- 等级：`on|off|stream`。
- 仅指令消息会切换是否在回复中显示思考块。
- 启用后，推理会作为 **单独消息** 发送，前缀 `Reasoning:`。
- `stream`（仅 Telegram）：在回复生成过程中把推理流式写入 Telegram 草稿气泡，然后发送不带推理的最终答案。
- 别名：`/reason`。
- 发送 `/reasoning`（或 `/reasoning:`）且不带参数可查看当前推理等级。

## 相关
- Elevated 模式文档见 [Elevated 模式](/zh/tools/elevated)。

## Heartbeats
- Heartbeat 探测正文为配置的 heartbeat prompt（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。Heartbeat 消息中的行内指令照常生效（但避免通过 heartbeat 更改会话默认）。
- Heartbeat 投递默认仅发送最终 payload。若也需发送单独的 `Reasoning:` 消息（可用时），设置 `agents.defaults.heartbeat.includeReasoning: true` 或按 agent 设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web chat UI
- Web chat 的思考等级选择器在页面加载时会镜像入站会话存储/配置中的会话等级。
- 选择其他等级仅影响下一条消息（`thinkingOnce`）；发送后选择器会回退到已存储的会话等级。
- 要改变会话默认值，发送 `/think:<level>` 指令（同前）；下次刷新后选择器会体现。
