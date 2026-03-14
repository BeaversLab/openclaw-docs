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

- [/reference/会话-management-compaction](/zh/reference/会话-management-compaction)

---

## 运行位置

所有脚本清理都集中在嵌入式运行器中：

- 策略选择： `src/agents/transcript-policy.ts`
- 清理/修复应用： `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用什么。

与脚本清理分开，会话文件在加载之前会被修复（如果需要）：

- `repairSessionFileIfNeeded` 在 `src/agents/session-file-repair.ts` 中
- 从 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载总是经过清理，以防止因大小限制而导致提供商端拒绝（缩小/重新压缩过大的 base64 图像）。

这也有助于控制具有视觉能力的模型的图像驱动的 token 压力。较低的最大尺寸通常会减少 token 使用量；较高的尺寸则保留细节。

实现：

- `sanitizeSessionMessagesImages` 在 `src/agents/pi-embedded-helpers/images.ts` 中
- `sanitizeContentBlocksImages` 在 `src/agents/tool-images.ts` 中
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认： `1200`）。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块将在构建模型上下文之前被丢弃。这可以防止由于部分持久化的工具调用（例如，在速率限制失败后）导致提供商拒绝请求。

实现：

- `sanitizeToolCallInputs` 在 `src/agents/session-transcript-repair.ts` 中
- 应用于 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

---

## 全局规则：会话间输入溯源

当代理通过 `sessions_send` 将提示发送到另一个会话时（包括代理到代理的回复/公告步骤），OpenClaw 会持久化创建的用户轮次并附带：

- `message.provenance.kind = "inter_session"`

此元数据在转录追加时写入，不更改角色（`role: "user"` 保留以兼容提供商）。转录读取器可以使用此元数据来避免将路由的内部提示视为最终用户编写的指令。

在上下文重建期间，OpenClaw 还会在内存中为这些用户轮次添加一个简短的 `[Inter-session message]` 标记，以便模型可以将它们与外部最终用户指令区分开来。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅限图像清理。
- 对于 OpenAI Responses/Codex 转录，丢弃孤立的推理签名（没有后续内容块的独立推理项）。
- 不清理工具调用 ID。
- 不修复工具结果配对。
- 不进行轮次验证或重新排序。
- 不使用合成工具结果。
- 不去除思维签名。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具调用 ID 清理：严格的字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修复（如果历史记录以助手开始，则前置一个微小的用户引导）。
- Antigravity Claude：规范化思维签名；丢弃未签名的思维块。

**Anthropic / Minimax (Anthropic-compatible)**

- 工具结果配对修复和合成工具结果。
- 回合验证（合并连续的用户回合以满足严格的交替要求）。

**Mistral（包括基于模型 ID 的检测）**

- 工具调用 ID 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- Thought signature cleanup: strip non-base64 `thought_signature` values (keep base64).

**其他所有**

- 仅进行图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 应用多层转录清理：

- 每次构建上下文时都会运行 **transcript-sanitize 扩展**，它可以：
  - Repair 工具 use/result pairing.
  - Sanitize 工具 call ids (including a non-strict mode that preserved `_`/`-`).
- 运行器还执行了特定于提供商的清理，这导致了重复工作。
- 在提供商策略之外还发生了额外的变更，包括：
  - Stripping `<final>` tags from assistant text before persistence.
  - Dropping empty assistant error turns.
  - Trimming assistant content after 工具 calls.

This complexity caused cross-提供商 regressions (notably `openai-responses`
`call_id|fc_id` pairing). The 2026.1.22 cleanup removed the extension, centralized
logic in the runner, and made OpenAI **no-touch** beyond image sanitization.

import zh from '/components/footer/zh.mdx';

<zh />
