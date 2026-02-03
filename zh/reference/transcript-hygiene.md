---
summary: "参考：各 provider 的转录清理与修复规则"
title: "转录清理"
read_when:
  - 调试因转录结构导致的 provider 请求拒绝
  - 修改转录清理或工具调用修复逻辑
  - 调查跨 provider 的 tool-call id 不匹配
---

# 转录清理（Provider 修复）

本文描述在运行前（构建模型上下文时）对转录应用的 **provider 特定修复**。这些调整仅在 **内存中** 进行，用于满足严格的 provider 要求，**不会** 重写磁盘上的 JSONL 转录。

范围包括：

- Tool call id 清理
- Tool result 配对修复
- 回合校验/排序
- Thought signature 清理
- 图片载荷清理

如需转录存储细节，请参见：

- [/reference/session-management-compaction](/zh/reference/session-management-compaction)

---

## 运行位置

所有转录清理集中在内置 runner：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`src/agents/pi-embedded-runner/google.ts` 中的 `sanitizeSessionHistory`

策略使用 `provider`、`modelApi`、`modelId` 决定应用哪些规则。

---

## 全局规则：图片清理

图片载荷始终会清理，以避免因大小限制被 provider 拒绝（对过大的 base64 图片进行降采样/重压缩）。

实现：

- `src/agents/pi-embedded-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `src/agents/tool-images.ts` 中的 `sanitizeContentBlocksImages`

---

## Provider 矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图片清理。
- 切换到 OpenAI Responses/Codex 时，丢弃孤立的 reasoning signature（没有后续 content block 的 reasoning 项）。
- 不清理 tool call id。
- 不修复 tool result 配对。
- 不进行回合校验或重排。
- 不生成合成 tool result。
- 不移除 thought signature。

**Google（Generative AI / Gemini CLI / Antigravity）**

- Tool call id 清理：严格字母数字。
- Tool result 配对修复与合成 tool result。
- 回合校验（Gemini 风格回合交替）。
- Google 回合排序修复（若历史以 assistant 开头，前置一个极小的 user 引导）。
- Antigravity Claude：规范化 thinking signatures；丢弃未签名的 thinking block。

**Anthropic / Minimax（Anthropic 兼容）**

- Tool result 配对修复与合成 tool result。
- 回合校验（合并连续 user 回合以满足严格交替）。

**Mistral（含基于 model-id 的检测）**

- Tool call id 清理：strict9（长度 9 的字母数字）。

**OpenRouter Gemini**

- Thought signature 清理：移除非 base64 的 `thought_signature` 值（保留 base64）。

**其他**

- 仅图片清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本之前，OpenClaw 对转录应用了多层清理：

- 每次构建上下文都会运行 **transcript-sanitize extension**，它可以：
  - 修复 tool use/result 配对。
  - 清理 tool call id（包括保留 `_`/`-` 的非严格模式）。
- Runner 也执行 provider 特定清理，造成重复工作。
- 还有一些不在 provider 策略内的变更，例如：
  - 持久化前移除 assistant 文本中的 `<final>` 标签。
  - 丢弃空的 assistant error 回合。
  - 在 tool call 后裁剪 assistant 内容。

这些复杂性导致跨 provider 回归（尤其是 `openai-responses` 的
`call_id|fc_id` 配对）。2026.1.22 的清理移除了该扩展，将逻辑集中到 runner，并使 OpenAI 除图片清理外 **不再触碰**。
