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
  - 如果 `MEMORY.md` 和 `memory.md` 都存在于工作区根目录下，OpenClaw 仅加载 `MEMORY.md`。
  - 仅当 `MEMORY.md` 不存在时，才将小写的 `memory.md` 作为备用。
  - **仅在主私人会话中加载**（绝不在群组上下文中加载）。

这些文件位于工作区下（`agents.defaults.workspace`，默认为
`~/.openclaw/workspace`）。有关完整布局，请参阅 [Agent workspace](/zh/concepts/agent-workspace)。

## Memory 工具

OpenClaw 为这些 Markdown 文件提供了两个面向代理的工具：

- `memory_search` -- 对索引片段的语义召回。
- `memory_get` -- 针对特定 Markdown 文件/行范围的目标读取。

`memory_get` 现在可以在文件不存在时**优雅降级**（例如，
在首次写入之前当天的每日日志）。内置管理器和 QMD
后端都返回 `{ text: "", path }` 而不是抛出 `ENOENT`，因此代理可以
处理“尚未记录任何内容”并继续其工作流，而无需将
工具调用包装在 try/catch 逻辑中。

## 何时写入 Memory

- 决策、偏好和持久化事实写入 `MEMORY.md`。
- 日常笔记和运行上下文写入 `memory/YYYY-MM-DD.md`。
- 如果有人说“记住这个”，请将其写下来（不要将其保留在 RAM 中）。
- 此领域仍在发展中。提醒模型存储记忆会有所帮助；它知道该怎么做。
- 如果您希望某事被记住，**请要求机器人将其写入**记忆。

## 自动 memory 刷新（压缩前 ping）

当会话**接近自动压缩**时，OpenClaw 会触发一个**静默的
代理轮次**，提醒模型在上下文被压缩**之前**写入持久化记忆。默认提示明确指出模型*may reply*，
但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到此轮次。

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

- **软阈值**：当会话 token 估计值超过
  `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- **静默**：默认情况下，提示包含 `NO_REPLY`，因此不会传递任何内容。
- **两个提示词**：一个用户提示词加上一个系统提示词来附加提醒。
- **每个压缩周期刷新一次**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话在 `workspaceAccess: "ro"` 或 `"none"` 下以沙箱隔离方式运行，则跳过刷新。

有关完整的压缩生命周期，请参阅
[会话管理 + 压缩](/zh/reference/session-management-compaction)。

## 向量记忆搜索

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上构建小型向量索引，以便
即使措辞不同，语义查询也能找到相关笔记。混合搜索
（BM25 + 向量）可用于结合语义匹配和精确关键词
查找。

内存搜索支持多种嵌入提供商（OpenAI、Gemini、Voyage、
Mistral、Ollama 和本地 GGUF 模型）、可选的 QMD 附属后端用于
高级检索，以及后处理功能，如 MMR 多样性重排序
和时间衰减。

有关完整的配置参考——包括嵌入提供商设置、QMD
后端、混合搜索调整、多模态内存和所有配置选项——请参阅
[内存配置参考](/zh/reference/memory-config)。

import zh from "/components/footer/zh.mdx";

<zh />
