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

您的代理有两个地方可以存储记忆：

- **`MEMORY.md`** -- 长期记忆。持久性事实、偏好和决策。在每次 私信 会话开始时加载。
- **`memory/YYYY-MM-DD.md`** -- 每日笔记。运行的上下文和观察。今天的和昨天的笔记会自动加载。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

<Tip>如果您想让您的代理记住某事，只需告诉它：“记住我更喜欢 TypeScript。”它会将其写入适当的文件。</Tip>

## 记忆工具

代理有两个用于处理记忆的工具：

- **`memory_search`** -- 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** -- 读取特定的记忆文件或行范围。

这两个工具均由活动的记忆插件提供（默认：`memory-core`）。

## 记忆搜索

当配置了嵌入提供商（embedding 提供商）时，`memory_search` 使用**混合搜索**——结合向量相似度（语义含义）与关键词匹配（确切的术语，如 ID 和代码符号）。一旦您拥有任何受支持的提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会从可用的 API 密钥中自动检测您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，记忆搜索将自动启用。</Info>

有关搜索工作原理、调整选项和提供商设置的详细信息，请参阅
[记忆搜索](/en/concepts/memory-search)。

## 记忆后端

<CardGroup cols={3}>
  <Card title="内置（默认）" icon="数据库" href="/en/concepts/memory-builtin">
    基于 SQLite。开箱即用，支持关键词搜索、向量相似度和混合搜索。无额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    本地优先的伴随程序，具有重排序、查询扩展以及索引工作区之外目录的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    具有用户建模、语义搜索和多代理感知能力的 AI 原生跨会话记忆。需安装插件。
  </Card>
</CardGroup>

## 自动刷新内存

在[压缩](/en/concepts/compaction)总结您的对话之前，OpenClaw
会运行一个静默轮次，提醒代理将重要的上下文保存到内存文件中。默认情况下此功能处于开启状态——您无需进行任何配置。

<Tip>内存刷新可防止压缩过程中的上下文丢失。如果您的代理在对话中包含尚未写入文件的重要事实，它们将在总结发生之前自动保存。</Tip>

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸阅读

- [内置内存引擎](/en/concepts/memory-builtin) -- 默认的 SQLite 后端
- [QMD 内存引擎](/en/concepts/memory-qmd) -- 高级本地优先伴随程序
- [Honcho 内存](/en/concepts/memory-honcho) -- AI 原生跨会话内存
- [内存搜索](/en/concepts/memory-search) -- 搜索管道、提供商和
  调优
- [内存配置参考](/en/reference/memory-config) -- 所有配置选项
- [压缩](/en/concepts/compaction) -- 压缩如何与内存交互
