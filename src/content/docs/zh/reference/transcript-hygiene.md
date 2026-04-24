---
summary: "参考：特定于提供者的转录清理和修复规则"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "转录清理"
---

# 脚本清理（提供商修复）

本文档描述了在运行（构建模型上下文）之前应用于脚本（transcript）的**特定于提供商的修复**。这些是用于满足严格提供商要求的**内存中**调整。这些清理步骤**不会**重写磁盘上存储的 JSONL 脚本；但是，单独的会话文件修复过程可能会在加载会话之前通过删除无效行来重写格式错误的 JSONL 文件。当发生修复时，原始文件将与会话文件一起备份。

范围包括：

- 工具调用 ID 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证/排序
- 思维签名清理
- 图像负载清理
- 用户输入来源标记（用于跨会话路由的提示词）

如果您需要脚本存储详细信息，请参阅：

- [/reference/会话-management-compaction](/zh/reference/session-management-compaction)

---

## 运行位置

所有脚本清理均集中在嵌入式运行器中：

- 策略选择： `src/agents/transcript-policy.ts`
- 清理/修复应用：`sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用哪些内容。

与脚本清理分开，会话文件在加载前会进行修复（如需要）：

- `repairSessionFileIfNeeded` 中的 `src/agents/session-file-repair.ts`
- 由 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载始终会被清理，以防止由于大小限制导致提供商端拒绝（缩小/重新压缩过大的 base64 图像）。

这还有助于控制具有视觉功能的模型的图像驱动的 token 压力。较低的最大尺寸通常会减少 token 使用量；较高的尺寸则保留细节。

实现：

- `src/agents/pi-embedded-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `src/agents/tool-images.ts` 中的 `sanitizeContentBlocksImages`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认： `1200`）。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块将在构建模型上下文之前被丢弃。这可以防止因部分持久化的工具调用（例如，在速率限制失败后）导致的提供商拒绝。

实现：

- `src/agents/session-transcript-repair.ts` 中的 `sanitizeToolCallInputs`
- 应用于 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

---

## 全局规则：会话间输入来源

当代理通过 `sessions_send` 向另一个会话发送提示时（包括代理对代理的回复/宣布步骤），OpenClaw 会持久化创建的用户轮次，并附带：

- `message.provenance.kind = "inter_session"`

此元数据在追加到记录时写入，且不会更改角色
(`role: "user"` 保持不变，以确保提供商兼容性)。记录读取器可以使用
此元数据来避免将路由的内部提示视为最终用户编写的指令。

在上下文重建期间，OpenClaw 还会在内存中为这些用户轮次前置一个简短的 `[Inter-session message]` 标记，以便模型能够将其与外部最终用户指令区分开来。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图像清理。
- 对于 OpenAI Responses/Codex 转录，删除孤立的推理签名（没有后续内容块的独立推理项）。
- 不进行工具调用 ID 清理。
- 不进行工具结果配对修复。
- 不进行轮次验证或重新排序。
- 不生成合成工具结果。
- 不剥离思维签名。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具调用 ID 清理：严格的字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修复（如果历史记录以助手开头，则前置一个微小的用户引导）。
- Antigravity Claude：规范化思维签名；删除未签名的思维块。

**Anthropic / Minimax (Anthropic-compatible)**

- 工具结果配对修复和合成工具结果。
- 轮次验证（合并连续的用户轮次以满足严格的交替要求）。

**Mistral（包括基于模型 ID 的检测）**

- 工具调用 ID 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- 思维签名清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**其他所有情况**

- 仅进行图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 应用多层转录卫生处理：

- **transcript-sanitize 扩展** 在每次构建上下文时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 ID（包括一种保留 `_`/`-` 的非严格模式）。
- 运行器还执行了特定于提供商的清理，这导致了工作重复。
- 在提供商策略之外还发生了其他变更，包括：
  - 在持久化之前，从助手的文本中剥离 `<final>` 标签。
  - 丢弃空的助手错误轮次。
  - 在工具调用之后修剪助手内容。

这种复杂性导致了跨提供商的回归（特别是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理工作移除了该扩展，将逻辑集中到了运行器中，并使 OpenAI 在除图片清理之外保持 **no-touch**。
