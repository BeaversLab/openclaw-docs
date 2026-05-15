---
summary: "参考：特定于提供者的转录清理和修复规则"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 在运行（构建模型上下文）之前对记录应用**提供商特定的修复**。其中大多数是**内存中**的调整，用于满足严格的提供商要求。单独的会话文件修复过程也可能在加载会话之前重写存储的 JSONL，但仅针对格式错误的行或作为无效持久记录的持久化轮次。已传递的助手回复会保留在磁盘上；提供商特定的助手预填充剥离仅发生在构建出站负载时。当发生修复时，原始文件会与会话文件一起备份。

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

- [会话管理深度剖析](/zh/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户记录

运行时/系统上下文可以添加到某一轮的模型提示中，但它不是
最终用户编写的内容。OpenClaw 为 Gateway(网关) 回复、
排队的后续跟进、ACP、CLI 和嵌入式 Pi 运行保留单独的
面向记录的提示主体。存储的可见用户轮次使用该记录主体，
而不是运行时增强的提示。

对于已经持久化了运行时包装器的旧会话，Gateway(网关) 历史
表面在将消息返回给 WebChat、TUI、REST 或 SSE 客户端之前
会应用显示投影。

---

## 运行位置

所有记录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用什么。

与记录清理分开，会话文件在加载之前（如果需要）会被修复：

- `repairSessionFileIfNeeded` 中的 `src/agents/session-file-repair.ts`
- 从 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载总是经过清理，以防止因大小限制而被提供商端拒绝（对过大的 base64 图像进行缩小/重新压缩）。

这也有助于控制具有视觉能力的模型因图像驱动的 token 压力。较低的最大尺寸通常能减少 token 使用量；较高的尺寸则保留细节。

实现：

- `sanitizeSessionMessagesImages` 中的 `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` 中的 `src/agents/tool-images.ts`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认：`1200`）。
- 在此遍历重放内容时，空白文本块将被移除。变为空的助手轮次将从重放副本中删除；变为空的用户和工具结果轮次将收到一个非空的省略内容占位符。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块将在构建模型上下文之前被删除。这可以防止因部分持久化的工具调用（例如，在速率限制失败后）导致的提供商拒绝。

实现：

- `sanitizeToolCallInputs` 中的 `src/agents/session-transcript-repair.ts`
- 应用于 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

---

## 全局规则：会话间输入来源

当代理通过 `sessions_send`OpenClaw 将提示发送到另一个会话（包括代理到代理的回复/公告步骤）时，OpenClaw 会使用以下内容持久化创建的用户轮次：

- `message.provenance.kind = "inter_session"`

OpenClaw 还会在路由提示文本之前添加一个同轮次 OpenClaw`[Inter-session message ... isUser=false]` 标记，以便活动的模型调用可以区分外部会话输出与外部最终用户指令。该标记在可用时包括源会话、渠道和工具。为了提供商兼容性，记录仍使用 `role: "user"`，但可见文本和来源元数据都将该轮次标记为会话间数据。

在重建上下文期间，OpenClaw 会将相同的标记应用于仅具有来源元数据的旧持久化会话间用户轮次。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图片清理。
- 对于 OpenAI Responses/Codex 记录，丢弃孤立的推理签名（没有后续内容块的独立推理项）；在模型路由切换后，丢弃可重放的 OpenAI 推理。
- 保留可重放的 OpenAI Responses 推理项载荷，包括加密的空摘要项，以便手动/WebSocket 重放能够保持必需的 OpenAI`rs_*` 状态与助手输出项配对。
- 原生 ChatGPT Codex Responses 遵循 Codex 线路对等性，通过在没有先前项 ID 的情况下重放先前的 Responses 推理/消息/函数载荷，同时保留会话 `prompt_cache_key`。
- 不进行工具调用 ID 清理。
- 工具结果配对修复可能会移动真实的匹配输出，并为缺失的工具调用合成 Codex 风格的 `aborted` 输出。
- 不进行回合验证或重新排序。
- 缺失的 OpenAI Responses 系列工具输出会被合成为 OpenAI`aborted`，以匹配 Codex 重放规范化。
- 不剥离思维签名。

**OpenAI 兼容的 Gemma 4**

- 历史助手思维/推理块会在重放前被剥离，以便本地
  OpenAI 兼容的 Gemma 4 服务器不会收到先前回合的推理内容。
- 当前同回合工具调用延续会将助手推理块
  附加到工具调用上，直到工具结果被重放为止。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具调用 ID 清理：严格的字母数字。
- 工具结果配对修复和合成工具结果。
- 回合验证（Gemini 风格的回合交替）。
- Google 回合排序修复（如果历史记录以助手开始，则在前面添加一个微小的用户引导）。
- Antigravity Claude：规范化思维签名；丢弃未签名的思维块。

**Anthropic / Minimax (Anthropic 兼容)**

- 工具结果配对修复和合成工具结果。
- 回合验证（合并连续的用户回合以满足严格的交替要求）。
- 当启用思考功能时，包括 Cloudflare AI Gateway(网关) 路由在内，会在传出的 AnthropicGateway(网关) 消息负载中去除尾部助手预填充轮次。
- 在提供商转换之前，会去除缺少、空白或重放签名为空的思考块。如果这清空了助手轮次，OpenClaw 会保留轮次形状，并使用非空的省略推理文本。
- 必须去除的仅包含思考内容的旧版助手轮次将被替换为非空的省略推理文本，以便提供商适配器不会丢弃重放轮次。

**Amazon Bedrock (Converse API)**

- 在重放之前，空的助手流错误轮次会被修复为非空的回退文本块。Bedrock Converse 会拒绝包含 `content: []` 的助手消息，因此包含 `stopReason: "error"` 且内容为空的持久化助手轮次也会在加载前在磁盘上得到修复。
- 仅包含空白文本块的助手流错误轮次将从内存中的重放副本中删除，而不是重放无效的空白块。
- 在 Converse 重放之前，会去除缺少、空白或重放签名为空的 Claude 思考块。如果这清空了助手轮次，OpenClaw 会保留轮次形状，并使用非空的省略推理文本。
- 必须去除的仅包含思考内容的旧版助手轮次将被替换为非空的省略推理文本，以便 Converse 重放保持严格的轮次形状。
- 重放会过滤 OpenClaw 交付镜像和网关注入的助手轮次。
- 图像清理通过全局规则应用。

**Mistral（包括基于模型 ID 的检测）**

- 工具调用 ID 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- 思考签名清理：去除非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 当启用推理时，尾随的助手预填充回合将从经过验证的 OpenRouter
  OpenAI 兼容的 Anthropic 模型有效负载中剥离，以匹配
  直接的 Anthropic 和 Cloudflare Anthropic 重放行为。

**其他所有情况**

- 仅进行图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 应用了多层对话记录清理：

- 一个 **transcript-sanitize 扩展** 在每次构建上下文时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 ID（包括保留 `_`/`-` 的非严格模式）。
- 运行器还执行了特定于提供商的清理，这导致了工作重复。
- 在提供商策略之外发生了额外的变更，包括：
  - 在持久化之前从助手文本中剥离 `<final>` 标签。
  - 丢弃空的助手错误回合。
  - 在工具调用后修剪助手内容。

这种复杂性导致了跨提供商的回归（特别是 `openai-responses`
`call_id|fc_id`OpenAI 配对）。2026.1.22 的清理工作移除了该扩展，将
逻辑集中在运行器中，并使 %%PH:GLOSSARY:83:40e39b26** 不再触碰** 除图像清理以外的任何内容。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
