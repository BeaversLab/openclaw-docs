---
summary: "参考：特定于提供者的转录清理和修复规则"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 在运行之前（构建模型上下文时）对脚本应用**提供商特定的修复**。其中大多数是用于满足严格提供商要求的**内存中**调整。在加载会话之前，单独的会话文件修复传递也可能重写存储的 JSONL，但仅针对格式错误的行或作为无效持久记录的已持久化轮次。传递的助手回复保留在磁盘上；提供商特定的助手预填充剥离仅在构建出站有效负载时发生。当发生修复时，原始文件会在原子替换之前写入到临时的 OpenClaw`*.bak-<pid>-<ts>` 同级文件中，并在替换成功后删除；只有在清理本身失败时才会保留备份（在这种情况下会报告回路径）。

范围包括：

- 仅运行时的提示上下文不包含在用户可见的记录轮次中
- 工具调用 ID 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证/排序
- 思维签名清理
- 思维签名清理
- 图像负载清理
- 提供商重放前的空白文本块清理
- 用户输入来源标记（用于跨会话路由的提示）
- 用于 Bedrock Converse 重放的空助手错误轮次修复

如果您需要记录存储的详细信息，请参阅：

- [Session management deep dive](/zh/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户记录

运行时/系统上下文可以添加到某个轮次的模型提示词中，但它不是由最终用户编写的内容。OpenClaw 为 Gateway(网关) 回复、排队后续跟进、ACP、CLI 和嵌入式 OpenClaw 运行保留了一个单独的面向对话记录的提示词主体。存储的可见用户轮次使用该对话记录主体，而不是经过运行时增强的提示词。

对于已经持久化了运行时包装器的旧会话，Gateway(网关) 历史
表面在将消息返回给 WebChat、TUI、REST 或 SSE 客户端之前
会应用显示投影。

---

## 运行位置

所有记录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：位于 `src/agents/embedded-agent-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用什么。

与记录清理分开，会话文件在加载之前（如果需要）会被修复：

- `repairSessionFileIfNeeded` 在 `src/agents/session-file-repair.ts` 中
- 从 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载总是经过清理，以防止因大小限制而被提供商端拒绝（对过大的 base64 图像进行缩小/重新压缩）。

这也有助于控制具有视觉能力的模型因图像驱动的 token 压力。较低的最大尺寸通常能减少 token 使用量；较高的尺寸则保留细节。

实现：

- 位于 `src/agents/embedded-agent-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `sanitizeContentBlocksImages` 在 `src/agents/tool-images.ts` 中
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认值：`1200`）。
- 在此遍历重放内容时，空白文本块将被移除。变为空的助手轮次将从重放副本中删除；变为空的用户和工具结果轮次将收到一个非空的省略内容占位符。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块将在构建模型上下文之前被删除。这可以防止因部分持久化的工具调用（例如，在速率限制失败后）而导致的提供商拒绝。

实现：

- `sanitizeToolCallInputs` 在 `src/agents/session-transcript-repair.ts` 中
- 应用在 `src/agents/embedded-agent-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

---

## 全局规则：会话间输入来源

当代理通过 `sessions_send`OpenClaw 将提示发送到另一个会话时（包括代理到代理的回复/宣告步骤），OpenClaw 会持久化创建的用户轮次，并附带：

- `message.provenance.kind = "inter_session"`

OpenClaw 还会在路由提示文本之前添加一个同轮 OpenClaw`[Inter-session message ... isUser=false]` 标记，以便当前模型调用可以区分外部会话输出与外部最终用户指令。该标记在可用时包含源会话、渠道和工具。为了与提供商兼容，会话记录仍使用 `role: "user"`，但可见文本和来源元数据都将该轮次标记为会话间数据。

在重建上下文期间，OpenClaw 会将相同的标记应用于仅具有来源元数据的旧持久化会话间用户轮次。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图片清理。
- 对于 OpenAI Responses/Codex 记录，丢弃孤立的推理签名（没有后续内容块的独立推理项）；在模型路由切换后，丢弃可重放的 OpenAI 推理。
- 保留可重放的 OpenAI Responses 推理项载荷，包括加密的空摘要项，以便手动/WebSocket 重放时将所需的 OpenAI`rs_*` 状态与助手输出项保持配对。
- 原生 ChatGPT Codex Responses 遵循 Codex 线路奇偶校验，通过重放先前的 Responses 推理/消息/功能载荷且不使用先前的项 ID，同时保留会话 `prompt_cache_key`。
- OpenAI Responses 系列重放保留了规范的 `call_*|fc_*` 同模型推理对，但在进行 pi-ai 载荷转换之前，会确定性地规范化格式错误或过长的 `call_id` / 函数调用项 ID。
- 工具结果配对修复可能会移动真实匹配的输出，并为缺失的工具调用合成 Codex 风格的 `aborted` 输出。
- 不进行回合验证或重新排序。
- 缺失的 OpenAI Responses 系列工具输出会被合成为 `aborted`，以匹配 Codex 重放规范化。
- 不剥离思维签名。

**OpenAI 兼容的聊天补全**

- 历史助手思考/推理块会在重放之前被剥离，因此本地和代理风格的 OpenAI 兼容服务器不会收到诸如 `reasoning` 或 `reasoning_content` 之类的先前轮次推理字段。
- 当前同回合工具调用延续会将助手推理块
  附加到工具调用上，直到工具结果被重放为止。
- 提供商拥有的例外可以在其线路协议需要重放推理元数据时选择退出。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具调用 ID 清理：严格的字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证 (Gemini 风格的轮次交替)。
- Google 轮次排序修复 (如果历史记录以助手开头，则在前面添加一个微小的用户引导)。
- Antigravity Claude：规范化思考签名；丢弃未签名的思考块。

**Anthropic / Minimax (Anthropic 兼容)**

- 工具结果配对修复和合成工具结果。
- 轮次验证 (合并连续的用户轮次以满足严格的交替要求)。
- 当启用思考功能时，从传出的 Anthropic 消息
  负载中剥离尾部的助手预填充轮次，包括 Cloudflare AI 网关路由。
- 缺失、空白或重放签名为空的思考块会在提供商转换之前被剥离。
  如果这清空了助手轮次，OpenClaw 会使用非空的“省略推理”文本来保持轮次形状。
- 必须被剥离的旧版仅思考助手轮次会被替换为
  非空的“省略推理”文本，以便提供商适配器不会丢弃重放
  轮次。

**Amazon Bedrock (Converse API)**

- 空的助手流错误轮次在重放之前会被修复为非空的回退文本块。Bedrock Converse 会拒绝带有 `content: []` 的助手消息，因此在加载之前，具有 `stopReason: "error"` 和空内容的持久化助手轮次也会在磁盘上被修复。
- 仅包含空白文本块的助手流错误轮次将从内存中的重放副本中删除，
  而不是重放无效的空白块。
- 缺少、为空或空白重放签名的 Claude 思考块会在 Converse 重放之前被剥离。如果这导致助手轮次变空，OpenClaw 会保留非空的 omitted-reasoning 文本以维持轮次形状。
- 必须被剥离的较旧的纯思考助手轮次会被替换为非空的 omitted-reasoning 文本，以便 Converse 重放保持严格的轮次形状。
- 重放会过滤掉 OpenClaw 交付镜像和网关注入的助手轮次。
- 应用全局规则进行图像清理。

**Mistral（包括基于模型ID的检测）**

- 工具调用 ID 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- 思维签名清理：去除非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 当启用推理时，尾随的助手预填充轮次会从经过验证的 OpenRouter OpenAI 兼容 Anthropic 模型负载中剥离，以匹配直接 Anthropic 和 Cloudflare Anthropic 的重放行为。

**其他所有情况**

- 仅进行图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 应用多层记录清理：

- 一个 **transcript-sanitize 扩展** 在每次构建上下文时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 ID（包括一种保留了 `_`/`-` 的非严格模式）。
- 运行器还执行了特定于提供商的清理，这导致了工作重复。
- 在提供商策略之外还发生了额外的变更，包括：
  - 在持久化之前从助手文本中去除 `<final>` 标签。
  - 删除空的助手错误轮次。
  - 在工具调用之后修剪助手内容。

这种复杂性导致了跨提供商回归（特别是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理工作移除了该扩展，将逻辑集中在运行器中，并使 OpenAI 除了图像清理外保持**不干预**（no-touch）。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
