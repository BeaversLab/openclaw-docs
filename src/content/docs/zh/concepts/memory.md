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

- **`MEMORY.md`** -- 长期记忆。持久性事实、偏好和决策。在每次 私信 会话开始时加载。
- **`memory/YYYY-MM-DD.md`** -- 每日笔记。运行的上下文和观察。今天的和昨天的笔记会自动加载。
- **`DREAMS.md`**（实验性，可选）-- 梦境日记和梦境扫描摘要，供人类查看。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

<Tip>如果您想让代理记住某事，只需告诉它：“记住我更喜欢 TypeScript。”它会将其写入相应的文件中。</Tip>

## 内存工具

代理有两个用于处理内存的工具：

- **`memory_search`** -- 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** -- 读取特定的内存文件或行范围。

这两个工具均由活动的内存插件提供（默认：`memory-core`）。

## 内存搜索

当配置了嵌入提供商时，`memory_search` 使用**混合搜索**——结合向量相似性（语义含义）与关键词匹配（如 ID 和代码符号等精确术语）。一旦您拥有任何受支持提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会根据可用的 API 密钥自动检测您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，内存搜索将自动启用。</Info>

有关搜索工作原理、调整选项和提供商设置的详细信息，请参阅[内存搜索](/en/concepts/memory-search)。

## 内存后端

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/en/concepts/memory-builtin">
    基于 SQLite。支持关键词搜索、向量相似性和混合搜索，开箱即用。无额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    本地优先的侧边车，支持重排序、查询扩展以及索引工作区外的目录。
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    AI 原生的跨会话记忆，具有用户建模、语义搜索和多代理感知功能。插件安装。
  </Card>
</CardGroup>

## 自动内存刷新

在 [compaction](/en/concepts/compaction) 总结您的对话之前，OpenClaw
会运行一个静默轮次，提醒代理将重要上下文保存到内存
文件中。此功能默认开启 -- 您无需进行任何配置。

<Tip>内存刷新可防止在压缩期间发生上下文丢失。如果您的代理在对话中包含尚未写入文件的重要事实，它们将在总结发生之前自动保存。</Tip>

## 梦境（实验性）

梦境是内存的一个可选后台整合过程。它收集
短期信号，对候选项进行评分，并仅将合格的项目提升到
长期内存 (`MEMORY.md`) 中。

其设计旨在保持长期内存的高信噪比：

- **选择加入**：默认禁用。
- **计划任务**：启用后，`memory-core` 会自动管理一个周期性的 cron 作业
  以进行完整的梦境扫描。
- **阈值过滤**：提升操作必须通过评分、召回频率和查询
  多样性门槛。
- **可审查**：阶段摘要和日记条目被写入 `DREAMS.md`
  供人工审查。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅
[梦境（实验性）](/en/concepts/dreaming)。

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## 延伸阅读

- [内置内存引擎](/en/concepts/memory-builtin) -- 默认 SQLite 后端
- [QMD 内存引擎](/en/concepts/memory-qmd) -- 高级本地优先 sidecar
- [Honcho 内存](/en/concepts/memory-honcho) -- AI 原生跨会话内存
- [内存搜索](/en/concepts/memory-search) -- 搜索管道、提供程序和
  调优
- [梦境（实验性）](/en/concepts/dreaming) -- 从短期回忆到长期内存的
  后台提升
- [内存配置参考](/en/reference/memory-config) -- 所有配置选项
- [压缩](/en/concepts/compaction) -- 压缩如何与内存交互
