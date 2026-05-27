---
summary: "OpenClawOpenClaw 如何跨会话记住事物"
title: "Memory 概述"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw 通过在您的 Agent 工作区中写入**纯 Markdown 文件**来记住事物。模型仅“记住”保存到磁盘的内容——不存在隐藏状态。

## 工作原理

您的 Agent 拥有三个与内存相关的文件：

- **`MEMORY.md`** — 长期记忆。持久的事实、偏好和
  决策。在每次私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** (或 **`memory/YYYY-MM-DD-<slug>.md`**) — 每日笔记。
  运行上下文和观察。今天和昨天的笔记会自动加载，现在还会连同仅日期的文件一起拾取由捆绑的会话记忆钩子在 `/new` 或 `/reset` 上生成的带短横线变体。
- **`DREAMS.md`** (可选) — 梦境日记和梦境扫描摘要，
  供人工审查，包括有根据的历史回填条目。

这些文件位于代理工作区中（默认为 `~/.openclaw/workspace`）。

## 什么放在哪里

`MEMORY.md` 是紧凑的、经过整理的层。将其用于持久事实、
偏好、长期决策以及应在主私人会话开始时可用的简短摘要。它不应作为原始记录、
每日日志或详尽的档案。

`memory/YYYY-MM-DD.md` 文件是工作层。将它们用于详细的每日笔记、
观察、会话摘要以及以后可能仍有用的原始上下文。这些文件被索引以供 `memory_search` 和 `memory_get` 使用，但在每一轮中
它们都不会被注入到正常的引导提示中。

随着时间的推移，代理应将每日笔记中的有用材料提炼到 `MEMORY.md` 中并删除陈旧的长期条目。生成的工作区指令和心跳流可以定期执行此操作；您无需
针对每个记忆的细节手动编辑 `MEMORY.md`。

如果 `MEMORY.md`OpenClaw 超过了引导文件预算，OpenClaw 会保持磁盘上的文件完整，但会截断注入到模型上下文中的副本。应将其视为将详细材料移回 `memory/*.md`、仅在 `MEMORY.md` 中保留持久摘要的信号，或者如果您明确希望花费更多提示预算，则可以提高引导限制。使用 `/context list`、`/context detail` 或 `openclaw doctor` 查看原始与注入的大小及截断状态。

<Tip>如果你想让你的智能体记住某事，只需告诉它：“记住我更偏好 TypeScript。”它会将其写入相应的文件中。</Tip>

## 动作敏感型记忆

大多数记忆可以写成普通的 Markdown 笔记。但有些记忆会影响代理以后应该做的事情。对于这些记忆，要捕捉何时根据笔记采取行动是安全的，而不仅仅是事实本身。

当笔记涉及以下情况时，捕捉该动作边界：

- 批准或许可要求，
- 临时约束，
- 移交给另一个会话、线程或人员，
- 过期条件，
- 可安全执行的时间，
- 来源或所有者权限，
- 避免采取诱惑性行动的指示。

一个有用的动作敏感型记忆应明确指出：

- 什么改变了未来的行为，
- 何时或在什么条件下适用，
- 何时过期，或者什么解锁了动作，
- 代理应该避免做什么，
- 谁是来源或所有者（如果这影响信任或权限）。

记忆可以保留批准上下文，但它不强制执行策略。使用 OpenClaw 批准设置、沙箱隔离和计划任务来进行硬性操作控制。

示例：

```md
The API migration is being designed in another session. Future turns should not edit the API implementation from this thread; use findings here only as design input until the migration plan lands.
```

另一个示例：

```md
A report from an untrusted source needs review before promotion. Future turns should treat it as evidence only; do not store it as durable memory until a trusted reviewer confirms the contents.
```

使用 [commitments](/zh/concepts/commitments) 进行推断的、短期的后续跟进。使用 [scheduled tasks](/zh/automation/cron-jobs) 进行精确提醒、定时检查和周期性工作。记忆仍然可以总结任何一条路径周围的持久上下文。

这并不是每个记忆的必需架构。简单的事实可以保持简洁。当丢失时间、权限、过期或可安全执行上下文可能导致代理以后做错事情时，请使用动作敏感型边界。

## 推断的承诺

一些未来的后续跟进并不是持久的事实。如果您提到明天有一个面试，有用的记忆可能是“面试后跟进”，而不是“永远将其存储在 `MEMORY.md` 中”。

[Commitments](/zh/concepts/commitments) 是针对这种情况的可选短期后续记忆。OpenClaw 会在隐藏的后台过程中推断它们，将其限定于同一代理和渠道，并通过心跳传递到期检查。显式提醒仍使用 [scheduled tasks](/zh/automation/cron-jobs)。

## Memory tools

代理有两个用于处理记忆的工具：

- **`memory_search`** — 使用语义搜索查找相关笔记，即使措辞与原文不同。
- **`memory_get`** — 读取特定的记忆文件或行范围。

这两个工具均由活动的记忆插件提供（默认：`memory-core`）。

## Memory Wiki companion plugin

如果您希望持久记忆更像是一个维护的知识库而不仅仅是原始笔记，请使用随附的 `memory-wiki` 插件。

`memory-wiki` 将持久知识编译到具有以下功能的 wiki 保管库中：

- 确定性页面结构
- 结构化的声明和证据
- 矛盾和新颖度跟踪
- 生成的仪表板
- 为代理/运行时使用者编译的摘要
- wiki 原生工具，如 `wiki_search`、`wiki_get`、`wiki_apply` 和 `wiki_lint`

它不会取代活动的记忆插件。活动的记忆插件仍然拥有回溯、提升和 dreaming 功能。`memory-wiki` 在其旁边增加了一个具有丰富来源的知识层。

参见 [Memory Wiki](/zh/plugins/memory-wiki)。

## Memory search

当配置了嵌入提供商时，`memory_search` 使用 **混合搜索** —— 结合向量相似性（语义含义）与关键词匹配（精确术语，如 ID 和代码符号）。一旦您拥有任何受支持提供商的 API 密钥，此功能即可开箱即用。

<Info>OpenClaw 会从可用的 API 密钥中自动检测您的嵌入提供商。如果您配置了 OpenAI、Gemini、Voyage 或 Mistral 密钥，记忆搜索将自动启用。</Info>

有关搜索工作原理、调整选项和提供商设置的详细信息，请参阅
[Memory Search](/zh/concepts/memory-search)。

## Memory backends

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/zh/concepts/memory-builtin">
    基于 SQLite。开箱即用，支持关键词搜索、向量相似度和 混合搜索。无需额外依赖。
  </Card>
  <Card title="QMD" icon="search" href="/zh/concepts/memory-qmd">
    本地优先的 sidecar，具备重排序、查询扩展以及索引 工作区外部目录的能力。
  </Card>
  <Card title="Honcho" icon="brain" href="/zh/concepts/memory-honcho">
    AI 原生的跨会话记忆，具备用户建模、语义搜索和 多智能体感知功能。需安装插件。
  </Card>
  <Card title="LanceDB" icon="layers" href="/zh/plugins/memory-lancedb">
    捆绑的 LanceDB 支持记忆，具备 OpenAI 兼容的嵌入、自动回想、 自动捕获以及本地 Ollama 嵌入支持。
  </Card>
</CardGroup>

## Knowledge wiki layer

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/zh/plugins/memory-wiki">
    将持久记忆编译为具有丰富出处信息的 wiki 仓库，包含声明、 仪表板、桥接模式和 Obsidian 友好的工作流。
  </Card>
</CardGroup>

## Automatic memory flush

在 [compaction](/zh/concepts/compaction) 总结您的对话之前，OpenClaw
会运行一个静默轮次，提醒智能体将重要上下文保存到记忆
文件中。此功能默认开启 —— 您无需配置任何内容。

要在本地模型上保留该整理轮次，请设置精确的 memory-flush 模型
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

该覆盖仅适用于 memory-flush 轮次，不继承
活动会话的回退链。

<Tip>内存刷新可防止在压缩过程中丢失上下文。如果您的代理在对话中包含尚未写入文件的重要事实，它们将在摘要发生前自动保存。</Tip>

## 梦境

梦境是内存的一个可选后台整合过程。它收集短期信号，对候选项进行评分，并仅将合格的项目提升到长期内存 (`MEMORY.md`) 中。

其设计旨在保持长期内存的高信噪比：

- **可选加入**：默认禁用。
- **计划执行**：启用后，`memory-core` 会自动管理一个循环的 cron 作业以进行完整的梦境扫描。
- **阈值控制**：提升项目必须通过分数、召回频率和查询多样性门控。
- **可审查**：阶段摘要和日记条目会被写入 `DREAMS.md` 供人工审查。

有关阶段行为、评分信号和梦境日记的详细信息，请参阅 [梦境](/zh/concepts/dreaming)。

## 基于事实的回填和实时提升

梦境系统现在有两条密切相关的审查通道：

- **实时梦境** 处理 `memory/.dreams/` 下的短期梦境存储，这是正常的深度阶段在决定哪些内容可以升级到 `MEMORY.md` 时所使用的依据。
- **基于事实的回填** 读取历史 `memory/YYYY-MM-DD.md` 笔记作为独立的日文件，并将结构化的审查输出写入 `DREAMS.md`。

当您想要重放旧笔记并检查系统认为哪些内容持久有效，而又无需手动编辑 `MEMORY.md` 时，基于事实的回填非常有用。

当您使用它时：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

基于事实的持久候选项不会被直接提升。它们被暂存到正常的深度阶段已经使用的同一个短期梦境存储中。这意味着：

- `DREAMS.md` 仍然是人工审查界面。
- 短期存储仍然是机器层面的排序界面。
- `MEMORY.md` 仍然仅由深度提升写入。

如果您决定重放没有用处，您可以删除暂存的工件，而无需触及普通日记条目或正常的召回状态：

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
- [QMD memory engine](/zh/concepts/memory-qmd): advanced local-first sidecar.
- [Honcho memory](/zh/concepts/memory-honcho): AI-native cross-会话 memory.
- [Memory LanceDB](/zh/plugins/memory-lancedbOpenAI): LanceDB-backed plugin with OpenAI-compatible embeddings.
- [Memory Wiki](/zh/plugins/memory-wiki): compiled knowledge vault and wiki-native tools.
- [Memory search](/zh/concepts/memory-search): search pipeline, providers, and tuning.
- [Dreaming](/zh/concepts/dreaming): background promotion from short-term recall to long-term memory.
- [Memory configuration reference](/zh/reference/memory-config): all config knobs.
- [Compaction](/zh/concepts/compaction): how compaction interacts with memory.

## Related

- [Active memory](/zh/concepts/active-memory)
- [Memory search](/zh/concepts/memory-search)
- [Builtin memory engine](/zh/concepts/memory-builtin)
- [Honcho memory](/zh/concepts/memory-honcho)
- [Memory LanceDB](/zh/plugins/memory-lancedb)
- [Commitments](/zh/concepts/commitments)
