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
  - 思考菜单和选择器由提供商配置文件驱动。提供商插件为所选模型声明确切的级别集，包括诸如 binary `on` 之类的标签。
  - `adaptive`、`xhigh` 和 `max` 仅针对支持它们的提供商/模型配置文件进行通告。针对不支持级别的输入指令将被拒绝，并显示该模型的有效选项。
  - 现有的存储的不支持级别会通过提供商配置文件等级重新映射。在非自适应模型上，`adaptive` 会回退到 `medium`，而 `xhigh` 和 `max` 会回退到所选模型支持的最大非“关闭”级别。
  - 当没有设置显式的思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive`。
  - Anthropic Claude Opus 4.7 默认不采用自适应思考。除非您显式设置了思考级别，否则其 API 努力程度默认值仍由提供商控制。
  - Anthropic Claude Opus 4.7 将 `/think xhigh` 映射到自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的努力程度设置。
  - Anthropic Claude Opus 4.7 还暴露了 `/think max`；它映射到相同的由提供商控制的最大努力程度路径。
  - OpenAI GPT 模型通过特定于模型的 Responses API 努力程度支持来映射 `/think`。`/think off` 仅在目标模型支持时才发送 `reasoning.effort: "none"`；否则 OpenClaw 会省略禁用的推理负载，而不是发送不支持的值。
  - MiniMax (`minimax/*`) 在 Anthropic 兼容的流式传输路径上默认为 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中显式设置了 thinking。这可以避免从 MiniMax 的非原生 Anthropic 流格式中泄漏 `reasoning_content` 增量。
  - Z.AI (`zai/*`) 仅支持二元思维 (`on`/`off`)。任何非 `off` 级别都将被视为 `on` (映射到 `low`)。
  - Moonshot (`moonshot/*`) 将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。当启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息上的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息来设置）。
3. 每 Agent 默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：如果可用，使用提供商声明的默认值；对于其他标记为具备推理能力的目录模型使用 `low`，否则使用 `off`。

## 设置会话默认值

- 发送一条**仅**包含该指令的消息（允许空白字符），例如 `/think:medium` 或 `/t high`。
- 这将对当前会话生效（默认按发送者区分）；可通过 `/think:off` 或会话空闲重置清除。
- 将发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令将被拒绝并附带提示，且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）以查看当前的思考级别。

## 代理应用

- **嵌入式 Pi**：解析后的级别将传递给进程内 Pi 代理运行时。

## 快速模式

- 级别：`on|off`。
- 仅指令消息切换会话的快速模式覆盖，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖
  3. 每个代理的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退值：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先级处理。
- 对于 `openai-codex/*`，快速模式在 Codex 响应上发送相同的 `service_tier=priority` 标志。OpenClaw 在两种身份验证路径之间保持一个共享的 `/fast` 切换开关。
- 对于直接公开的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的经过 OAuth 身份验证的流量，快速模式映射到 Anthropic 服务层：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on` （或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 显式的 Anthropic `serviceTier` / `service_tier` 模型参数会在两者都设置时覆盖快速模式的默认值。对于非 OpenClaw 代理基础 URL，Anthropic 仍然会跳过 Anthropic 服务层注入。
- `/status` 仅在启用快速模式时显示 `Fast`。

## 详细指令 (/verbose 或 /v)

- 级别：`on`（最少）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话的详细设置并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别将返回提示而不更改状态。
- `/verbose off` 存储显式的会话覆盖；通过选择 `inherit` 在会话 UI 中将其清除。
- 内联指令仅影响该消息；否则适用会话/全局默认值。
- 发送 `/verbose` （或 `/verbose:`）不带参数以查看当前的详细级别。
- 当详细模式开启时，发出结构化工具结果的代理（Pi，其他 JSON 代理）会将每个工具调用作为其自己的仅元数据消息返回，并在可用时（路径/命令）加上 `<emoji> <tool-name>: <arg>` 前缀。这些工具摘要会在每个工具启动时（作为独立气泡）发送，而不是作为流式增量。
- 工具失败摘要在正常模式下仍然可见，但原始错误详细信息后缀会被隐藏，除非详细级别为 `on` 或 `full`。
- 当 verbose 为 `full` 时，工具输出也会在完成后转发（单独的气泡，截断至安全长度）。如果在运行进行中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。

## 插件跟踪指令 (/trace)

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息切换会话插件跟踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该消息；否则应用会话/全局默认值。
- 发送 `/trace`（或 `/trace:`）且不带参数以查看当前跟踪级别。
- `/trace` 比 `/verbose` 更窄：它仅显示插件拥有的跟踪/调试行，例如 Active Memory 调试摘要。
- 跟踪行可以出现在 `/status` 中，也可以作为正常助手回复后的后续诊断消息出现。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅指令消息用于切换回复中是否显示思维块。
- 启用后，推理将作为带有 `Reasoning:` 前缀的**单独消息**发送。
- `stream` (仅限 Telegram)：在生成回复时将推理流式传输到 Telegram 草稿气泡中，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，接着是每个代理的默认值（`agents.list[].reasoningDefault`），最后是后备值（`off`）。

## 相关

- 提升模式文档位于 [Elevated mode](/zh/tools/elevated)。

## 心跳

- 心跳探测主体是配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但避免从心跳更改会话默认值）。
- 心跳传递默认仅包含最终负载。若还要发送单独的 `Reasoning:` 消息（如果可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或每个代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- 当页面加载时，Web 聊天思考选择器会镜像反映入站会话存储/配置中存储的会话级别。
- 选择另一个级别会立即通过 `sessions.patch` 写入会话覆盖；它不会等待下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析后的默认值来自活动会话模型的提供商思考配置文件。
- 选择器使用网关会话行返回的 `thinkingOptions`。浏览器 UI 不维护自己的提供商正则表达式列表；插件拥有特定于模型的级别集。
- `/think:<level>` 仍然有效并更新相同的存储会话级别，因此聊天指令和选择器保持同步。

## 提供商配置文件

- 提供商插件可以暴露 `resolveThinkingProfile(ctx)` 来定义模型支持的级别和默认值。
- 每个配置文件级别都有一个存储的规范 `id` (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive`, 或 `max`)，并且可能包含一个显示 `label`。二进制提供商使用 `{ id: "low", label: "on" }`。
- 已发布的传统钩子 (`supportsXHighThinking`, `isBinaryThinking`, 和 `resolveDefaultThinkingLevel`) 保留作为兼容性适配器，但新的自定义级别集应该使用 `resolveThinkingProfile`。
- Gateway(网关) 行暴露 `thinkingOptions` 和 `thinkingDefault`，以便 ACP/聊天客户端呈现与运行时验证所使用的相同的配置文件。
