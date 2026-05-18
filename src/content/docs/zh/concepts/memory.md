---
summary: "OpenClawOpenClaw 如何跨会话记忆事物"
title: "Memory overview"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw 通过在您的 Agent 工作区中写入**纯 Markdown 文件**来记住事物。模型仅“记住”保存到磁盘的内容——不存在隐藏状态。

## 工作原理

您的 Agent 拥有三个与内存相关的文件：

- **`MEMORY.md`** — 长期记忆。持久的事实、偏好和决策。在每次私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`**（或 **`memory/YYYY-MM-DD-<slug>.md`**）——每日笔记。
  运行上下文和观察记录。今天和昨天的笔记会自动加载，现在连同仅包含日期的文件一起，也会加载由 `/new` 或 `/reset` 上的内置 会话-memory hook 写入的带 slug 变体。
- **`DREAMS.md`**（可选）——供人工审阅的梦境日记和梦境扫描摘要，包括有依据的历史回填条目。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

## 什么放在哪里

`MEMORY.md` 是紧凑、精选的层。将其用于持久事实、偏好、长期决策以及应在主私有会话开始时可用的简短摘要。它并非旨在作为原始记录、每日日志或详尽档案。

`memory/YYYY-MM-DD.md` 文件是工作层。将它们用于详细的每日笔记、观察、会话摘要以及稍后可能仍有用的原始上下文。这些文件为 `memory_search` 和 `memory_get` 建立了索引，但不会在每一轮中注入到正常的引导提示中。

随着时间的推移，代理应将每日笔记中的有用材料提炼到 `MEMORY.md` 中，并删除陈旧的长期条目。生成的工作区指令和心跳流可以定期执行此操作；您无需为每个记忆的细节手动编辑 `MEMORY.md`。

如果 `MEMORY.md` 增长超出引导文件预算，OpenClaw 会保持磁盘上的文件完整，但会截断注入到模型上下文中的副本。应将其视为一个信号，将详细材料移回 `memory/*.md`，在 `MEMORY.md` 中仅保留持久摘要，或者如果您明确希望花费更多提示预算，则可以提高引导限制。使用 `/context list`、`/context detail` 或 `openclaw doctor` 查看原始与注入的大小以及截断状态。

<Tip>如果你想让你的智能体记住某事，只需告诉它：“记住我更偏好 TypeScript。”它会将其写入相应的文件中。</Tip>

## 推断的承诺

有些后续事项并非持久性事实。如果你提到明天有一场面试，有用的记忆可能是“面试后跟进”，而不是“将此永久存储在 `MEMORY.md` 中”。

[Commitments](/zh/concepts/commitmentsOpenClaw) 是针对此类情况的自愿选择、短期的后续记忆。OpenClaw 会在隐藏的后台过程中推断它们，将它们限定在相同的代理和渠道，并通过心跳传递到期的检查事项。明确的提醒仍使用 [scheduled tasks](/zh/automation/cron-jobs)。

## 记忆工具

智能体有两个用于处理记忆的工具：

- **`memory_search`** — 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** — 读取特定的内存文件或行范围。

这两个工具均由活动的内存插件提供（默认：`memory-core`）。

## Memory Wiki 伴生插件

如果你希望持久性记忆更像是一个维护中的知识库，而不仅仅是原始笔记，请使用随附的 `memory-wiki` 插件。

`memory-wiki` 将持久性知识编译到一个具有以下功能的 wiki 仓库中：

- 确定性页面结构
- 结构化的声明和证据
- 矛盾和新鲜度跟踪
- 生成的仪表板
- 供智能体/运行时使用者使用的编译摘要
- 类似 wiki 的原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会替换活动的内存插件。活动的内存插件仍然拥有召回、提升和 dreaming 功能。`memory-wiki` 在其旁边添加了一个具有丰富来源信息的知识层。

参见 [Memory Wiki](/zh/plugins/memory-wiki)。

## 记忆搜索

当配置了嵌入提供商时，`memory_search`API 使用**混合搜索**——结合向量相似度（语义含义）与关键词匹配（如 ID 和代码符号等精确术语）。一旦你拥有任何受支持提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会根据可用的 API 密钥自动检测您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，内存搜索将自动启用。</Info>

有关搜索工作原理、调优选项和提供商设置的详细信息，请参阅 [Memory Search](/zh/concepts/memory-search)。

## Memory backends

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/zh/concepts/memory-builtin">
    基于 SQLite。开箱即用，支持关键词搜索、向量相似度和混合搜索。无额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/zh/concepts/memory-qmd">
    本地优先的伴随服务，具有重排序、查询扩展以及索引工作区外目录的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh/concepts/memory-honcho">
    AI 原生的跨会话内存，具有用户建模、语义搜索和多智能体感知功能。需安装插件。
  </Card>
  <Card title="LanceDB" icon="layers" href="/zh/plugins/memory-lancedb">
    内置的 LanceDB 支持的内存，具有 OpenAI 兼容的嵌入、自动召回、自动捕获以及本地 Ollama 嵌入支持。
  </Card>
</CardGroup>

## Knowledge wiki layer

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/zh/plugins/memory-wiki">
    将持久化内存编译成具有丰富溯源信息的 wiki 知识库，包含声明、仪表盘、桥接模式和 Obsidian 友好的工作流程。
  </Card>
</CardGroup>

## Automatic memory flush

在 [compaction](/zh/concepts/compactionOpenClaw) 总结你的对话之前，OpenClaw 会运行一个静默轮次，提醒代理将重要上下文保存到内存文件中。此功能默认开启——你无需配置任何内容。

为了在本地模型上保留该维护轮次，请设置一个精确的内存刷新模型
覆盖：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "model": "ollama/qwen3:8b"
        }
      }
    }
  }
}
```

该覆盖仅适用于内存刷新轮次，不继承
活动会话的回退链。

<Tip>内存刷新可防止压缩期间上下文丢失。如果您的代理在对话中有 尚未写入文件的重要事实，它们 将在总结发生前自动保存。</Tip>

## 梦境

Dreaming 是一个可选的内存后台整合过程。它收集短期信号，对候选项进行评分，并仅将合格的项目提升到长期内存 (`MEMORY.md`) 中。

其设计旨在保持长期记忆的高信噪比：

- **可选加入**：默认禁用。
- **定时**：启用后，`memory-core` 自动管理一个循环的 cron 作业以进行完整的 dreaming 扫描。
- **基于阈值**：晋升必须通过评分、召回频率和查询
  多样性的门槛。
- **可审核**：阶段摘要和日记条目被写入 `DREAMS.md` 以供人工审核。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅 [Dreaming](/zh/concepts/dreaming)。

## 基于事实的回填和实时晋升

梦境系统现在有两条密切相关的审查通道：

- **Live dreaming** 作用于 `memory/.dreams/` 下的短期 dreaming 存储，这是正常的深度阶段在决定什么可以升级到 `MEMORY.md` 时所使用的方法。
- **Grounded backfill** 将历史 `memory/YYYY-MM-DD.md` 笔记作为独立的日文件读取，并将结构化的审核输出写入 `DREAMS.md`。

当您想要回放较旧的笔记并检查系统认为哪些内容是持久的，而无需手动编辑 `MEMORY.md` 时，Grounded backfill 非常有用。

当您使用：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

有据的持久化候选项不会被直接提升。它们被暂存到
与常规深度阶段使用的相同的短期梦境存储中。那
意味着：

- `DREAMS.md` 仍然是人工审核界面。
- 短期存储仍然是面向机器的排序界面。
- `MEMORY.md` 仍然仅由深度提升写入。

如果您决定回放没有用处，您可以删除暂存的工件，而无需触及普通日记条目或正常的召回状态：

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

- [内置内存引擎](/zh/concepts/memory-builtin)：默认的 SQLite 后端。
- [QMD 内存引擎](/zh/concepts/memory-qmd)：高级的本地优先 sidecar。
- [Honcho memory](/zh/concepts/memory-honcho)：AI 原生的跨会话内存。
- [Memory LanceDB](/zh/plugins/memory-lancedb)：基于 LanceDB 的插件，具有 OpenAI 兼容的嵌入。
- [Memory Wiki](/zh/plugins/memory-wiki)：编译的知识库和 wiki 原生工具。
- [Memory search](/zh/concepts/memory-search)：搜索管道、提供商和调优。
- [Dreaming](/zh/concepts/dreaming)：从短期回溯到长期内存的后台提升。
- [Memory configuration reference](/zh/reference/memory-config)：所有配置选项。
- [Compaction](/zh/concepts/compaction)：压缩如何与内存交互。

## 相关

- [Active memory](/zh/concepts/active-memory)
- [Memory search](/zh/concepts/memory-search)
- [内置记忆引擎](/zh/concepts/memory-builtin)
- [Honcho 记忆](/zh/concepts/memory-honcho)
- [Memory LanceDB](/zh/plugins/memory-lancedb)
- [承诺](/zh/concepts/commitments)
