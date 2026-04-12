---
title: "内存概述"
summary: "OpenClaw 如何跨会话记忆事物"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

# 内存概述

OpenClaw 通过在您的代理工作区中编写**纯 Markdown 文件**来记忆事物。模型只“记住”保存到磁盘上的内容——没有隐藏状态。

## 工作原理

您的代理有三个与内存相关的文件：

- **`MEMORY.md`** -- 长期记忆。持久的事实、偏好和决策。在每次私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** -- 每日笔记。运行的上下文和观察。今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（实验性，可选）-- 供人类审核的梦境日记和梦境扫描摘要，包括有根据的历史回填条目。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

<Tip>如果您想让代理记住某事，只需告诉它：“记住我更喜欢 TypeScript。”它会将其写入相应的文件中。</Tip>

## 内存工具

代理有两个用于处理内存的工具：

- **`memory_search`** -- 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** -- 读取特定的内存文件或行范围。

这两个工具均由活动的内存插件提供（默认：`memory-core`）。

## Memory Wiki 伴随插件

如果您希望持久内存的行为更像一个维护良好的知识库，而不仅仅是原始笔记，请使用捆绑的 `memory-wiki` 插件。

`memory-wiki` 将持久知识编译到具有以下功能的 wiki 仓库中：

- 确定性页面结构
- 结构化的声明和证据
- 矛盾和新颖度追踪
- 生成的仪表板
- 供代理/运行时使用者使用的编译摘要
- 类似 wiki 的原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会替换活动的内存插件。活动的内存插件仍然拥有回忆、提升和梦境功能。`memory-wiki` 在其旁边添加了一个富含来源的知识层。

请参阅 [Memory Wiki](/en/plugins/memory-wiki)。

## 内存搜索

当配置了嵌入提供商时，`memory_search` 使用 **混合搜索** -- 将向量相似度（语义含义）与关键词匹配（ID 和代码符号等精确术语）相结合。一旦您拥有任何受支持提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会从可用的 API 密钥中自动检测您的嵌入提供商。如果您 配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，内存搜索将 自动启用。</Info>

有关搜索工作原理、调整选项和提供商设置的详细信息，请参阅 [Memory Search](/en/concepts/memory-search)。

## 内存后端

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/en/concepts/memory-builtin">
    基于 SQLite。开箱即用，支持关键词搜索、向量相似度搜索和 混合搜索。无额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    本地优先的侧边栏，具有重排序、查询扩展以及索引工作区 外目录的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    AI 原生的跨会话记忆，包含用户建模、语义搜索和 多智能体感知。需安装插件。
  </Card>
</CardGroup>

## 知识库层

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/en/plugins/memory-wiki">
    将持久化记忆编译为具有丰富溯源信息的 wiki 知识库，包含声明、 仪表板、桥接模式和 Obsidian 友好的工作流。
  </Card>
</CardGroup>

## 自动内存刷新

在 [压缩](/en/concepts/compaction) 总结您的对话之前，OpenClaw
会运行一个静默轮次，提醒智能体将重要的上下文保存到记忆
文件中。此功能默认开启 -- 您无需进行任何配置。

<Tip>内存刷新可防止压缩期间的上下文丢失。如果您的代理在对话中有 尚未写入文件的重要事实，它们将在摘要生成前被自动保存。</Tip>

## 梦境（实验性）

梦境是一个可选的记忆后台整合过程。它会收集
短期信号，对候选项目评分，并仅将合格的项目提升至
长期记忆 (`MEMORY.md`)。

其设计旨在保持长期记忆的高信噪比：

- **可选加入**：默认禁用。
- **计划任务**：启用后，`memory-core` 会自动管理一个循环的 cron 作业
  以执行完整的梦境扫描。
- **阈值限制**：提升操作必须通过评分、召回频率和查询
  多样性的关卡。
- **可审查**：阶段摘要和日记条目会被写入 `DREAMS.md`
  供人工审查。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅
[梦境（实验性）](/en/concepts/dreaming)。

## 基于事实的回填和实时提升

梦境系统现在有两个密切相关的审查通道：

- **实时做梦** 从 `memory/.dreams/` 下的短期做梦存储中工作，这是正常深度阶段在决定什么可以升级到 `MEMORY.md` 时使用的机制。
- **有依据的回填** 读取历史 `memory/YYYY-MM-DD.md` 笔记作为独立的每日文件，并将结构化的审查输出写入 `DREAMS.md`。

当您想重放旧笔记并检查系统认为哪些内容持久化时，有依据的回填非常有用，而无需手动编辑 `MEMORY.md`。

当您使用时：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

有依据的持久化候选内容不会直接升级。它们被暂存到正常深度阶段已经使用的同一个短期做梦存储中。这意味着：

- `DREAMS.md` 仍然是人工审查界面。
- 短期存储仍然是面向机器的排序界面。
- `MEMORY.md` 仍然仅由深度升级写入。

如果您决定重放没有用，您可以删除暂存的工件，而无需触及普通的日记条目或正常的召回状态：

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

- [内置内存引擎](/en/concepts/memory-builtin) -- 默认的 SQLite 后端
- [QMD 内存引擎](/en/concepts/memory-qmd) -- 高级的本地优先侧车
- [Honcho 内存](/en/concepts/memory-honcho) -- AI 原生的跨会话记忆
- [内存 Wiki](/en/plugins/memory-wiki) -- 编译的知识库和 Wiki 原生工具
- [内存搜索](/en/concepts/memory-search) -- 搜索管道、提供商和
  调优
- [做梦（实验性）](/en/concepts/dreaming) -- 从短期召回到长期记忆的
  后台升级
- [内存配置参考](/en/reference/memory-config) -- 所有配置选项
- [压缩](/en/concepts/compaction) -- 压缩如何与内存交互
