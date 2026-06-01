---
summary: "/think、/fast、/verbose、/trace 和推理可见性的指令语法"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考级别"
---

## 作用

- 任何传入正文中的内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink" (max budget)
  - xhigh → "ultrathink+" (GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7+ 耗力)
  - adaptive → 提供商管理的自适应思考（在 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7+ 和 Google Gemini 动态思考中受支持）
  - max → 提供商最大推理（Anthropic Claude Opus 4.7+；Ollama 将其映射到其最高原生 `think` 耗力）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 映射至 `xhigh`。
  - `highest` 映射至 `high`。
- 提供商注意事项：
  - 思考菜单和选择器由提供商配置文件驱动。提供商插件会为所选模型声明确切的级别集，包括诸如二进制 `on` 之类的标签。
  - `adaptive`、`xhigh` 和 `max` 仅针对支持它们的提供商/模型配置文件进行展示。对于不受支持的级别，输入的指令将被拒绝，并显示该模型的有效选项。
  - 现有的已存储的不受支持的级别会根据提供商配置文件排名重新映射。在非自适应模型上，`adaptive` 会回退至 `medium`，而 `xhigh` 和 `max` 会回退至所选模型支持的最大的非关闭级别。
  - 当未设置明确的思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 除非明确设置思考级别，否则保持思考关闭。在启用自适应思考后，Opus 4.8 的提供商拥有的耗力默认值为 `high`。
  - Anthropic Claude Opus 4.7+ 将 `/think xhigh` 映射到自适应思考加上 `output_config.effort: "xhigh"`，因为 `/think` 是思考指令，而 `xhigh` 是 Opus 耗力设置。
  - Anthropic Claude Opus 4.7+ 还公开了 `/think max`；它映射到相同的提供商拥有的最大耗力路径。
  - 直接 DeepSeek V4 模型公开 `/think xhigh|max`；两者都映射到 DeepSeek `reasoning_effort: "max"`，而较低的非官方级别映射到 `high`。
  - OpenRouter 路由的 DeepSeek V4 模型公开 `/think xhigh` 并发送 OpenRouter 支持的 `reasoning_effort` 值。存储的 `max` 覆盖项回退到 `xhigh`。
  - Ollama 支持思考的模型公开 `/think low|medium|high|max`；`max` 映射到原生 `think: "high"`，因为 Ollama 的原生 API 接受 `low`、`medium` 和 `high` 耗力字符串。
  - OpenAI GPT 模型通过特定于模型的 Responses API 努力支持来映射 OpenAI`/think`API。`/think off` 仅在目标模型支持时才发送 `reasoning.effort: "none"`OpenClaw；否则 OpenClaw 会省略已禁用的推理负载，而不是发送不支持的值。
  - 自定义 OpenAI 兼容的目录条目可以通过将 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 设置为包含 `"xhigh"`OpenAI 来选择加入 OpenAI`/think xhigh`。这使用相同的兼容元数据来映射出站 OpenAI 推理努力负载，因此菜单、会话验证、agent CLI 和 `llm-task` 与传输行为保持一致。
  - 过时配置的 OpenRouter Hunter Alpha 引用会跳过代理推理注入，因为该已停用的路由可能会通过推理字段返回最终答案文本。
  - Google Gemini 将 `/think adaptive` 映射到 Gemini 提供商拥有的动态思考。Gemini 3 请求省略固定的 `thinkingLevel`，而 Gemini 2.5 请求发送 `thinkingBudget: -1`；固定级别仍然映射到该模型系列最接近的 Gemini `thinkingLevel` 或预算。
  - Anthropic 兼容流路径上的 MiniMax (MiniMax`minimax/*`Anthropic) 默认为 `thinking: { type: "disabled" }`，除非您在模型参数或请求参数中显式设置了思考。这可以避免从 MiniMax 的非原生 Anthropic 流格式中泄漏 `reasoning_content`MiniMaxAnthropic 增量。
  - Z.AI (`zai/*`) 仅支持二元思考 (`on`/`off`)。任何非 `off` 级别都将被视为 `on`（映射到 `low`）。
  - Moonshot (Moonshot`moonshot/*`) 将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`Moonshot。当启用思考时，Moonshot 仅接受 `tool_choice` `auto|none`OpenClaw；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息中的内联指令（仅适用于该消息）。
2. 会话覆盖（通过发送仅包含指令的消息来设置）。
3. 每个代理的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退：如果可用，使用提供商声明的默认值；否则，具备推理能力的模型解析为 `medium` 或该模型支持的最接近的非 `off` 级别，而不具备推理能力的模型保持 `off`。

## 设置会话默认值

- 发送一条**仅**包含指令的消息（允许使用空白字符），例如 `/think:medium` 或 `/t high`。
- 该设置适用于当前会话（默认按发送者）。使用 `/think default` 清除会话覆盖并继承配置/提供商的默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- `/think off` 会存储一个显式的关闭覆盖。它会禁用思考，直到你更改或清除会话覆盖。
- 将发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令将被拒绝并附带提示，且会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）以查看当前的思考级别。

## 由代理应用

- **嵌入式 OpenClaw**：解析出的级别将传递给进程内 OpenClaw 代理运行时。
- **Claude CLI 后端**：使用 `claude-cli`CLI 时，非关闭级别将作为 CLI`--effort` 传递给 Claude Code；请参阅 [CLI 后端](/zh/gateway/cli-backends)。

## 快速模式 (/fast)

- 级别：`on|off|default`。
- 仅指令消息切换会话快速模式覆盖并回复 `Fast mode enabled.` / `Fast mode disabled.`。使用 `/fast default` 清除会话覆盖并继承配置的默认值；别名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 发送 `/fast`（或 `/fast status`）且不带模式，以查看当前有效的快速模式状态。
- OpenClaw 按以下顺序解析快速模式：
  1. 内联/仅指令 `/fast on|off` 覆盖（`/fast default` 清除此层级）
  2. 会话覆盖
  3. 每个代理默认（`agents.list[].fastModeDefault`）
  4. 每个模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 后备：`off`
- 对于 `openai/*`，快速模式通过在支持的 Responses 请求中发送 `service_tier=priority` 映射到 OpenAI 优先处理。
- 对于 `openai-codex/*`，快速模式在 Codex Responses 上发送相同的 `service_tier=priority` 标志。OpenClaw 在这两种身份验证路径之间保持一个共享的 `/fast` 切换。
- 对于直接公开的 `anthropic/*` 请求，包括发送到 `api.anthropic.com` 的 OAuth 身份验证流量，快速模式映射到 Anthropic 服务层级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 当两者都设置时，显式的 Anthropic `serviceTier` / `service_tier` 模型参数会覆盖快速模式默认值。对于非 OpenClaw 代理基础 URL，Anthropic 仍然会跳过 Anthropic 服务层级的注入。
- `/status` 仅在启用快速模式时显示 `Fast`。

## 详细指令（/verbose 或 /v）

- 级别：`on`（最小）| `full` | `off`（默认）。
- 仅包含指令的消息会切换会话的详细模式并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效的级别将返回提示而不更改状态。
- `/verbose off` 会存储一个显式的会话覆盖设置；可以通过在 Sessions UI 中选择 `inherit` 来清除它。
- 经过授权的外部渠道发送方可以持久化会话详细覆盖设置。内部网关/Web 客户端需要 `operator.admin` 才能持久化该设置。
- 内联指令仅影响该消息；否则将应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）以查看当前的详细级别。
- 当开启详细模式时，发送结构化工具结果的代理会将每个工具调用作为仅包含元数据的消息发回，如果可用，前缀为 `<emoji> <tool-name>: <arg>`。这些工具摘要会在每个工具启动时立即发送（单独的气泡），而不是作为流式增量发送。
- 工具失败摘要在正常模式下仍然可见，但原始错误详细信息后缀会被隐藏，除非详细级别为 `full`。
- 当详细级别为 `full` 时，工具输出也会在完成后转发（单独的气泡，截断为安全长度）。如果在运行进行中切换 `/verbose on|full|off`，随后的工具气泡将遵循新设置。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和进度草稿工具行的形式。使用 `"explain"`（默认）以获取紧凑的人工标签，例如 `🛠️ Exec: checking JS syntax`；如果您还希望附加原始命令/详细信息以进行调试，请使用 `"raw"`。每个代理的 `agents.list[].toolProgressDetail` 会覆盖默认设置。
  - `explain`: `🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`: `🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 插件跟踪指令 (/trace)

- 级别：`on` | `off`（默认）。
- 仅包含指令的消息会切换会话插件追踪输出并回复 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 内联指令仅影响该条消息；否则适用会话/全局默认值。
- 发送不带参数的 `/trace`（或 `/trace:`）以查看当前的追踪级别。
- `/trace` 比 `/verbose` 范围更窄：它仅显示插件拥有的追踪/调试行，例如 Active Memory 调试摘要。
- 追踪行可以出现在 `/status` 中，也可以作为正常助手回复之后的后续诊断消息出现。

## 推理可见性 (/reasoning)

- 级别：`on|off|stream`。
- 仅包含指令的消息切换是否在回复中显示思考块。
- 启用后，推理将作为前缀为 `Thinking` 的**单独消息**发送。
- `stream`：当活动渠道支持推理预览时，在生成回复时流式传输推理，然后发送不包含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）以查看当前的推理级别。
- 解析顺序：内联指令，然后是会话覆盖，接着是每个代理的默认值 (`agents.list[].reasoningDefault`)，然后是全局默认值 (`agents.defaults.reasoningDefault`)，最后是回退值 (`off`)。

格式错误的本地模型推理标签会被保守处理。已关闭的 `<think>...</think>` 块在正常回复中保持隐藏，已在可见文本之后未关闭的推理也会被隐藏。如果回复完全被单个未关闭的开始标签包裹，且原本会作为空文本发送，OpenClaw 会移除格式错误的开始标签并发送剩余文本。

## 相关

- 提升模式文档位于 [提升模式](/zh/tools/elevated)。

## 心跳

- 心跳探测主体是已配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令照常应用（但请避免从心跳更改会话默认值）。
- 心跳传递默认仅发送最终载荷。若还要发送单独的 `Thinking` 消息（如果有），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或按代理设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天界面

- Web 聊天思考选择器会在页面加载时镜像反映入站会话存储/配置中保存的会话级别。
- 选择另一个级别会通过 `sessions.patch` 立即写入会话覆盖；它不会等待下一次发送，也不是一次性 `thinkingOnce` 覆盖。
- 第一个选项始终是清除覆盖的选择。它显示 `Inherited: <resolved level>`，包括禁用继承思考时的 `Inherited: Off`。
- 显式选择器选项使用其直接级别标签，同时保留现有的提供商标签（例如，对于提供商标记的 `max` 选项，显示 `Maximum`）。
- 选择器使用网关会话行/默认值返回的 `thinkingLevels`，并将 `thinkingOptions` 保留为旧版标签列表。浏览器界面不维护自己的提供商正则表达式列表；插件拥有特定于模型的级别集。
- `/think:<level>` 仍然有效，并更新相同的已存储会话级别，因此聊天指令和选择器保持同步。

## 提供商配置

- 提供商插件可以公开 `resolveThinkingProfile(ctx)` 以定义模型支持的级别和默认值。
- 代理 Claude 模型的提供商插件应重用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目录保持一致。
- 每个配置文件级别都有一个存储的规范 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），并且可能包含一个显示 `label`。二进制提供商使用 `{ id: "low", label: "on" }`。
- 配置文件钩子在可用时会接收合并的目录事实，包括 `reasoning`、`compat.thinkingFormat` 和 `compat.supportedReasoningEfforts`。仅当配置的请求合约支持匹配的负载时，请使用这些事实来公开二进制或自定义配置文件。
- 需要验证显式思考覆盖的工具插件应使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它们不应保留自己的提供商/模型级别列表。
- 有权访问配置的自定义模型元数据的工具插件可以将 `catalog` 传递到 `resolveThinkingPolicy` 中，以便 `compat.supportedReasoningEfforts` 选择加入能反映在插件端验证中。
- 已发布的旧版钩子（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）仍保留为兼容性适配器，但新的自定义级别集应使用 `resolveThinkingProfile`。
- Gateway(网关) 行/默认值公开 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/聊天客户端呈现与运行时验证使用的相同的配置文件 ID 和标签。
