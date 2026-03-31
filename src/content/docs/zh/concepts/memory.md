---
title: "Memory"
summary: "OpenClaw 记忆的工作原理（工作区文件 + 自动记忆刷新）"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 记忆

OpenClaw 记忆是 **代理工作区中的纯 Markdown**。文件是
事实来源；模型仅“记住”写入磁盘的内容。

记忆搜索工具由活动的记忆插件提供（默认为：
`memory-core`）。使用 `plugins.slots.memory = "none"` 禁用记忆插件。

## Memory files (Markdown)

默认工作区布局使用两层内存：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 在会话开始时读取今天 + 昨天的记录。
- `MEMORY.md`（可选）
  - 精选长期记忆。
  - 如果工作区根目录下同时存在 `MEMORY.md` 和 `memory.md`，OpenClaw 会加载两者（通过 realpath 去重，因此指向同一文件的符号链接不会被重复注入）。
  - **仅在主私有会话中加载**（切勿在群组上下文中加载）。

这些文件位于工作区（`agents.defaults.workspace`，默认为
`~/.openclaw/workspace`）之下。有关完整布局，请参阅[Agent workspace](/en/concepts/agent-workspace)。

## Memory 工具

OpenClaw 针对这些 Markdown 文件提供了两个面向模型的工具：

- `memory_search` -- 对索引片段进行语义召回。
- `memory_get` -- 针对特定 Markdown 文件/行范围进行定向读取。

`memory_get` 现在在文件不存在时**能够优雅降级**（例如，首次写入之前的今日日志）。内置管理器和 QMD 后端均返回 `{ text: "", path }` 而非抛出 `ENOENT`，因此模型可以处理“尚未记录任何内容”的情况，并继续其工作流程，而无需将工具调用包裹在 try/catch 逻辑中。

## 何时写入 Memory

- 决策、偏好和持久性事实存入 `MEMORY.md`。
- 日常笔记和运行上下文存入 `memory/YYYY-MM-DD.md`。
- 如果有人说“记住这个”，请将其写下来（不要仅保留在 RAM 中）。
- 该领域仍在不断发展。提醒模型存储记忆会有所帮助；它知道该怎么做。
- 如果您希望某些信息被保留，**请要求机器人将其写入** memory。

## 自动 Memory 刷新（预压缩 ping）

当会话**接近自动压缩**时，OpenClaw 会触发一个**静默的、智能体的轮次**，提醒模型在上下文被压缩**之前**写入持久化内存。默认提示明确指出模型*可以回复*，但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到此轮次。
活动的内存插件拥有该刷新的提示/路径策略；默认的 `memory-core` 插件会写入 `memory/YYYY-MM-DD.md` 下的标准每日文件。

这由 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

详细信息：

- **软阈值**：当会话 token 估算值超过
  `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- **默认静默**：提示包含 `NO_REPLY`，因此不会发送任何内容。
- **两个提示词**：一个用户提示词加上一个系统提示词，用于追加提醒。
- **每个压缩周期刷新一次**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话在
  `workspaceAccess: "ro"` 或 `"none"` 的沙箱隔离环境中运行，则跳过刷新。

有关完整的压缩生命周期，请参阅
[Session management + compaction](/en/reference/session-management-compaction)。

## 向量记忆搜索

OpenClaw 可以基于 `MEMORY.md` 和 `memory/*.md` 构建一个小型向量索引，以便即使措辞不同，语义查询也能找到相关的笔记。混合搜索
（BM25 + 向量）可用于将语义匹配与精确关键字查找结合起来。

内存搜索适配器 ID 来自活动的内存插件。默认的
`memory-core` 插件为 OpenAI、Gemini、Voyage、Mistral、
Ollama 和本地 GGUF 模型提供了内置支持，外加一个可选的 QMD 边车后端，用于高级检索和后处理功能，例如 MMR 多样性重排序
和时间衰减。

有关完整的配置参考——包括嵌入提供商设置、QMD
后端、混合搜索调整、多模态内存和所有配置旋钮——请参阅
[Memory configuration reference](/en/reference/memory-config)。
