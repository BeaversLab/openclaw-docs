---
summary: "OpenClaw 如何跨会话记住事物"
title: "内存概览"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw 通过在您的 Agent 工作区中写入**纯 Markdown 文件**来记住事物。模型仅“记住”保存到磁盘的内容——不存在隐藏状态。

## 工作原理

您的 Agent 拥有三个与内存相关的文件：

- **`MEMORY.md`** —— 长期记忆。持久化的事实、偏好和决策。在每个 私信 会话开始时加载。
- **`memory/YYYY-MM-DD.md`** —— 每日笔记。运行中的上下文和观察。今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（可选）—— 供人工审阅的梦境日记和梦境扫描摘要，包括有依据的历史回填条目。

这些文件位于 Agent 工作区中（默认为 `~/.openclaw/workspace`）。

<Tip>如果您希望您的 Agent 记住某事，只需告诉它：“记住我更喜欢 TypeScript。”它会将其写入相应的文件中。</Tip>

## 内存工具

Agent 拥有两个用于处理内存的工具：

- **`memory_search`** —— 使用语义搜索查找相关笔记，即使措辞与原文不同也能找到。
- **`memory_get`** —— 读取特定的内存文件或行范围。

这两个工具均由活动的内存插件提供（默认：`memory-core`）。

## 内存 Wiki 伴随插件

如果您希望持久化内存更像是一个维护良好的知识库，而不仅仅是原始笔记，请使用附带的 `memory-wiki` 插件。

`memory-wiki` 将持久化知识编译为一个具有以下特点的 Wiki 仓库：

- 确定的页面结构
- 结构化的声明和证据
- 矛盾和新鲜度追踪
- 生成的仪表盘
- 供 Agent/运行时使用者使用的编译摘要
- Wiki 原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会替换活动的内存插件。活动的内存插件仍然拥有回忆、提升和 dreaming 功能。`memory-wiki` 在其旁边增加了一个来源丰富的知识层。

请参阅 [Memory Wiki](/zh/plugins/memory-wiki)。

## 内存搜索

当配置了嵌入提供商时，`memory_search` 使用 **混合搜索** —— 将向量相似度（语义含义）与关键词匹配（如 ID 和代码符号等精确术语）相结合。一旦您拥有任何受支持提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会根据可用的 API 密钥自动检测您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，内存搜索将自动启用。</Info>

有关搜索工作原理、调优选项和提供商设置的详细信息，请参阅 [Memory Search](/zh/concepts/memory-search)。

## 内存后端

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/zh/concepts/memory-builtin">
    基于 SQLite。支持关键词搜索、向量相似度和混合搜索，开箱即用。无额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/zh/concepts/memory-qmd">
    具有重排序、查询扩展以及索引工作区外目录功能的本地优先 sidecar。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh/concepts/memory-honcho">
    AI 原生跨会话内存，具有用户建模、语义搜索和多智能体感知功能。需安装插件。
  </Card>
</CardGroup>

## 知识 wiki 层

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/zh/plugins/memory-wiki">
    将持久化内存编译为具有溯源信息的 wiki 仓库，包含声明、仪表板、桥接模式和 Obsidian 友好的工作流程。
  </Card>
</CardGroup>

## 自动内存刷新

在 [compaction](/zh/concepts/compaction) 总结您的对话之前，OpenClaw 会运行一个静默轮次，提醒智能体将重要上下文保存到内存文件中。默认情况下此功能处于开启状态 —— 您无需进行任何配置。

<Tip>内存刷新可防止压缩期间上下文丢失。如果您的代理在对话中有尚未写入文件的重要事实，它们将在摘要发生之前自动保存。</Tip>

## 梦境（Dreaming）

梦境是一个可选的内存后台合并过程。它收集短期信号，对候选内容进行评分，并仅将合格的项目提升到长期内存（`MEMORY.md`）中。

其设计旨在保持长期内存的高信噪比：

- **可选加入（Opt-in）**：默认禁用。
- **定时执行**：启用后，`memory-core` 会自动管理一个循环的 cron 作业以进行完整的梦境扫描。
- **阈值控制**：提升操作必须通过评分、召回频率和查询多样性等关卡。
- **可审查**：阶段摘要和日记条目被写入 `DREAMS.md` 供人工审查。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅[梦境（Dreaming）](/zh/concepts/dreaming)。

## 有据回填与实时提升

梦境系统现在有两个密切相关的审查通道：

- **实时梦境（Live dreaming）** 在 `memory/.dreams/` 下的短期梦境存储中工作，这是正常的深度阶段在决定哪些内容可以晋升到 `MEMORY.md` 时所使用的机制。
- **有据回填（Grounded backfill）** 将历史 `memory/YYYY-MM-DD.md` 笔记作为独立的每日文件读取，并将结构化的审查输出写入 `DREAMS.md`。

当您想要重放旧笔记并检查系统认为哪些内容是持久的，而又不想手动编辑 `MEMORY.md` 时，有据回填非常有用。

当您使用时：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

有据的持久化候选项不会被直接提升。它们被暂存到正常深度阶段已经使用的同一个短期梦境存储中。这意味着：

- `DREAMS.md` 仍然是人工审查界面。
- 短期存储仍然是面向机器的排名界面。
- `MEMORY.md` 仍然只能通过深度提升来写入。

如果您决定重放没有用处，您可以删除暂存的工件，而无需触及普通的日记条目或正常的召回状态：

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸阅读

- [内置内存引擎（Builtin memory engine）](/zh/concepts/memory-builtin)：默认的 SQLite 后端。
- [QMD memory engine](/zh/concepts/memory-qmd)：高级的本地优先 sidecar。
- [Honcho memory](/zh/concepts/memory-honcho)：AI 原生的跨会话记忆。
- [Memory Wiki](/zh/plugins/memory-wiki)：编译的知识库和 wiki 原生工具。
- [Memory search](/zh/concepts/memory-search)：搜索管道、提供商和调优。
- [Dreaming](/zh/concepts/dreaming)：从短期回溯到长期记忆的后台提升。
- [Memory configuration reference](/zh/reference/memory-config)：所有配置选项。
- [Compaction](/zh/concepts/compaction)：压缩如何与内存交互。

## 相关

- [Active memory](/zh/concepts/active-memory)
- [Memory search](/zh/concepts/memory-search)
- [Builtin memory engine](/zh/concepts/memory-builtin)
- [Honcho memory](/zh/concepts/memory-honcho)
