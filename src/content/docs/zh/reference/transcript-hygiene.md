---
summary: "参考：特定于提供者的转录清理和修复规则"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 会在运行（构建模型上下文）之前对记录应用**提供商特定的修复**。其中大多数是用于满足严格提供商要求的**内存中**调整。在加载会话之前，单独的会话文件修复传递也可能重写存储的 JSONL，方法是通过删除格式错误的 JSONL 行或修复在语法上有效但在重放期间已知会被提供商拒绝的持久化轮次。当发生修复时，原始文件将与会话文件一起备份。

范围包括：

- 仅运行时的提示上下文不包含在用户可见的记录轮次中
- 工具调用 ID 清理
- 工具调用输入验证
- 工具结果配对修复
- 轮次验证/排序
- 思维签名清理
- 思维签名清理
- 图像负载清理
- 用户输入来源标记（用于跨会话路由的提示）
- 针对 Bedrock Converse 重放的空助手错误轮次修复

如果您需要记录存储详细信息，请参阅：

- [Session management deep dive](/zh/reference/session-management-compaction)

---

## 全局规则：运行时上下文不是用户记录

运行时/系统上下文可以添加到某一轮的模型提示中，但它不是最终用户编写的内容。OpenClaw 为 Gateway(网关) 回复、排队跟进、ACP、CLI 和嵌入式 Pi 运行保留一个单独的面向记录的提示正文。存储的可见用户轮次使用该记录正文，而不是运行时增强的提示。

对于已经持久化运行时包装器的旧版会话，Gateway(网关) 历史记录表面会在向 WebChat、TUI、REST 或 SSE 客户端返回消息之前应用显示投影。

---

## 运行位置

所有记录清理都集中在嵌入式运行器中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定应用什么。

与记录清理分开，会话文件在加载之前会进行修复（如果需要）：

- `repairSessionFileIfNeeded` 中的 `src/agents/session-file-repair.ts`
- 从 `run/attempt.ts` 和 `compact.ts`（嵌入式运行器）调用

---

## 全局规则：图像清理

图像负载始终经过清理，以防止因大小限制被提供商端拒绝（缩小/重新压缩过大的 base64 图像）。

这也有助于控制具有视觉能力的模型的图像驱动 token 压力。较低的最大尺寸通常能减少 token 使用量；较高的尺寸则能保留细节。

实现：

- `sanitizeSessionMessagesImages` 在 `src/agents/pi-embedded-helpers/images.ts` 中
- `sanitizeContentBlocksImages` 在 `src/agents/tool-images.ts` 中
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认：`1200`）。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 两者的助手工具调用块将在构建模型上下文之前被丢弃。这可以防止因部分持久化的工具调用（例如，在速率限制失败后）导致的提供商拒绝。

实现：

- `sanitizeToolCallInputs` 在 `src/agents/session-transcript-repair.ts` 中
- 在 `src/agents/pi-embedded-runner/replay-history.ts` 的 `sanitizeSessionHistory` 中应用

---

## 全局规则：会话间输入来源

当代理通过 `sessions_send` 向另一个会话发送提示时（包括代理对代理的回复/公告步骤），OpenClaw 会持久化创建的用户轮次，并附带：

- `message.provenance.kind = "inter_session"`

此元数据在转录追加时写入，不会更改角色（`role: "user"` 保持不变以兼容提供商）。转录读取器可以使用此元数据来避免将路由的内部提示视为最终用户编写的指令。

在重建上下文期间，OpenClaw 还会在内存中向这些用户轮次前面添加一个简短的 `[Inter-session message]` 标记，以便模型能够将它们与外部最终用户指令区分开来。

---

## 提供商矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图像清理。
- 对于 OpenAI Responses/Codex 转录，丢弃孤立的推理签名（没有后续内容块的独立推理项），并在模型路由切换后丢弃可重放的 OpenAI 推理。
- 不进行工具调用 ID 清理。
- 工具结果配对修复可能会移动实际匹配的输出，并为丢失的工具调用合成 Codex 风格的 `aborted` 输出。
- 无轮次验证或重新排序。
- 缺失的 OpenAI Responses 系列工具输出将合成为 `aborted`，以匹配 Codex 重放标准化。
- 无思考签名剥离。

**兼容 OpenAI 的 Gemma 4**

- 历史助手思考/推理块会在重放之前被剥离，以便本地
  兼容 OpenAI 的 Gemma 4 服务器不会收到先前轮次的推理内容。
- 当前的同一轮工具调用连续性会将助手推理块
  附加到工具调用上，直到工具结果被重放。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具调用 ID 清理：严格的字母数字。
- 工具结果配对修复和合成工具结果。
- 轮次验证（Gemini 风格的轮次交替）。
- Google 轮次排序修复（如果历史记录以助手开头，则在前面添加一个微小的用户引导）。
- Antigravity Claude：标准化思考签名；丢弃未签名的思考块。

**Anthropic / Minimax (兼容 Anthropic)**

- 工具结果配对修复和合成工具结果。
- 轮次验证（合并连续的用户轮次以满足严格的交替要求）。
- 缺失、为空或空白重放签名的思考块会在
  转换为提供商之前被剥离。如果这清空了助手轮次，OpenClaw 会
  使用非空的“省略推理”文本来保持轮次形状。
- 必须被剥离的仅包含思考的旧助手轮次将被替换为
  非空的“省略推理”文本，以便提供商适配器不会丢弃重放
  轮次。

**Amazon Bedrock (Converse API)**

- 空的助手流错误轮次会在重放之前被修复为非空的回退文本块。
  Bedrock Converse 会拒绝带有 `content: []` 的助手消息，因此
  持久化带有 `stopReason: "error"` 且内容为空的助手轮次也会在
  加载之前在磁盘上被修复。
- 缺失、为空或空白重放签名的 Claude 思考块会在
  Converse 重放之前被剥离。如果这清空了助手轮次，OpenClaw
  会使用非空的“省略推理”文本来保持轮次形状。
- 必须被剥离的仅包含思考的旧助手轮次将被替换为
  非空的“省略推理”文本，以便 Converse 重放保持严格的轮次形状。
- 重放会过滤 OpenClaw 交付镜像和网关注入的助手轮次。
- 图像清理通过全局规则应用。

**Mistral（包括基于模型ID的检测）**

- 工具调用 ID 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- 思考签名清理：去除非 base64 `thought_signature` 值（保留 base64）。

**其他所有**

- 仅图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 版本发布之前，OpenClaw 应用多层转录清理：

- **transcript-sanitize 扩展**在每次上下文构建时运行，并且可以：
  - 修复工具使用/结果配对。
  - 清理工具调用 ID（包括一种保留 `_`/`-` 的非严格模式）。
- 运行器还执行了特定于提供商的清理，这导致了工作重复。
- 在提供商策略之外发生了额外的更改，包括：
  - 在持久化之前从助手文本中去除 `<final>` 标签。
  - 丢弃空的助手错误轮次。
  - 在工具调用后修剪助手内容。

这种复杂性导致了跨提供商的回归（尤其是 `openai-responses`
`call_id|fc_id` 配对）。2026.1.22 的清理工作移除了该扩展，将逻辑集中到运行器中，并使 OpenAI 在图像清理之外实现**no-touch**（不触碰）。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
