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

- **`MEMORY.md`** -- 长期记忆。持久的事实、偏好和
  决策。在每次私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** -- 每日笔记。持续的上下文和观察。
  今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（实验性，可选） -- 供人工审查的梦境日记和梦境扫描
  摘要。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

<Tip>如果您想让代理记住某事，只需告诉它：“记住我更喜欢 TypeScript。”它会将其写入相应的文件中。</Tip>

## 内存工具

代理有两个用于处理内存的工具：

- **`memory_search`** -- 使用语义搜索查找相关笔记，即使
  措辞与原文不同。
- **`memory_get`** -- 读取特定的内存文件或行范围。

这两个工具均由活动内存插件提供（默认：`memory-core`）。

## Memory Wiki 伴随插件

如果您希望持久记忆更像是一个维护中的知识库，而不仅仅是原始笔记，请使用捆绑的 `memory-wiki` 插件。

`memory-wiki` 将持久知识编译成包含以下内容的 wiki 仓库：

- 确定性页面结构
- 结构化的声明和证据
- 矛盾和新颖度追踪
- 生成的仪表板
- 供代理/运行时使用者使用的编译摘要
- 原生的 wiki 工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会取代活动内存插件。活动内存插件仍然拥有召回、提升和做梦功能。`memory-wiki` 在其旁边添加了一个具有丰富来源的知识层。

请参阅 [Memory Wiki](/en/plugins/memory-wiki)。

## 内存搜索

当配置了嵌入提供商时，`memory_search` 使用 **混合搜索** -- 将向量相似度（语义含义）与关键词匹配
（ID 和代码符号等精确术语）结合起来。一旦您拥有任何支持的提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会从可用的 API 密钥中自动检测您的嵌入提供商。如果您 配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，内存搜索将 自动启用。</Info>

有关搜索工作原理、调优选项和提供商设置的详细信息，请参阅
[Memory Search](/en/concepts/memory-search)。

## 内存后端

<CardGroup cols={3}>
  <Card title="内置（默认）" icon="数据库" href="/en/concepts/memory-builtin">
    基于 SQLite。开箱即用，支持关键词搜索、向量相似度搜索和 混合搜索。无需额外依赖。
  </Card>
  <Card title="QMD" icon="搜索" href="/en/concepts/memory-qmd">
    本地优先的侧边车（sidecar），支持重排序、查询扩展以及索引 工作区之外目录的能力。
  </Card>
  <Card title="Honcho" icon="大脑" href="/en/concepts/memory-honcho">
    AI 原生的跨会话记忆，具有用户建模、语义搜索和 多智能体感知功能。需安装插件。
  </Card>
</CardGroup>

## 知识库层

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="书籍" href="/en/plugins/memory-wiki">
    将持久化记忆编译为具有丰富出处（provenance-rich）的知识库库，包含主张、 仪表板、桥接模式和 Obsidian 友好的工作流。
  </Card>
</CardGroup>

## 自动内存刷新

在[压缩](/en/concepts/compaction)总结您的对话之前，OpenClaw
会运行一轮静默操作，提醒代理将重要的上下文保存到
内存文件中。默认情况下此功能已开启——您无需进行任何配置。

<Tip>内存刷新可防止压缩期间的上下文丢失。如果您的代理在对话中有 尚未写入文件的重要事实，它们将在摘要生成前被自动保存。</Tip>

## 梦境（实验性）

梦境是一个可选的后台内存整合过程。它收集
短期信号，对候选项目评分，并仅将合格的项目提升至
长期记忆 (`MEMORY.md`)。

其设计旨在保持长期记忆的高信噪比：

- **可选加入**：默认禁用。
- **计划执行**：启用后，`memory-core` 会自动管理一个循环的 cron 作业
  以进行完整的梦境扫描。
- **阈值限制**：提升操作必须通过评分、召回频率和查询
  多样性的关卡。
- **可审查**：阶段摘要和日记条目会被写入到 `DREAMS.md` 中以供人工审查。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅 [Dreaming (experimental)](/en/concepts/dreaming)。

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸阅读

- [Builtin Memory Engine](/en/concepts/memory-builtin) -- 默认的 SQLite 后端
- [QMD Memory Engine](/en/concepts/memory-qmd) -- 高级的本地优先 sidecar
- [Honcho Memory](/en/concepts/memory-honcho) -- AI 原生的跨会话记忆
- [Memory Wiki](/en/plugins/memory-wiki) -- 编译的知识库和 wiki 原生工具
- [Memory Search](/en/concepts/memory-search) -- 搜索管道、提供程序和
  调优
- [Dreaming (experimental)](/en/concepts/dreaming) -- 从短期回忆
  提升到长期记忆的后台进程
- [Memory configuration reference](/en/reference/memory-config) -- 所有配置选项
- [Compaction](/en/concepts/compaction) -- 压缩如何与内存交互
