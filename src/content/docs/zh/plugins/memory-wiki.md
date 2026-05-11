---
summary: "memory-wiki: 具有溯源、主张、仪表板和桥接模式的编译知识库"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Memory wiki"
---

`memory-wiki` 是一个内置插件，可将持久化内存转变为编译好的知识库。

它并**不**替换 active memory 插件。Active memory 插件仍然负责召回、提升、索引和 dreaming。`memory-wiki` 与其并列，将持久化知识编译为具有确定性页面、结构化声明、来源追溯、仪表板和机器可读摘要的可导航 wiki。

当您希望记忆的行为更像是一个维护良好的知识层，而不像是一堆 Markdown 文件时，请使用它。

## 它增加了什么

- 一个具有确定性页面布局的专用 wiki 仓库
- 结构化的声明和证据元数据，而不仅仅是散文
- 页面级别的来源追溯、置信度、矛盾和未解决的问题
- 供代理/运行时使用者使用的编译摘要
- Wiki 原生的 search/get/apply/lint 工具
- 可选的 bridge 模式，用于从 active memory 插件导入公共产物
- 可选的 Obsidian 友好渲染模式和 CLI 集成

## 它如何与内存配合

可以这样理解这种划分：

| 层级                                               | 负责                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| Active memory 插件 (`memory-core`, QMD, Honcho 等) | 召回、语义搜索、提升、dreaming、内存运行时                                      |
| `memory-wiki`                                      | 编译后的 wiki 页面、富含来源追溯的综合、仪表板、特定于 wiki 的 search/get/apply |

如果 active memory 插件暴露了共享的召回产物，OpenClaw 可以使用 `memory_search corpus=all` 在一次操作中搜索这两个层级。

当您需要特定于 wiki 的排名、来源追溯或直接页面访问时，请改用 wiki 原生工具。

## 推荐的混合模式

对于本地优先的设置，一个强大的默认配置是：

- 使用 QMD 作为 active memory 后端，用于召回和广泛的语义搜索
- 使用 `memory-wiki` 的 `bridge` 模式，用于持久化的综合知识页面

这种划分效果很好，因为每个层级都保持专注：

- QMD 保持原始笔记、会话导出和额外集合的可搜索性
- `memory-wiki` 编译稳定的实体、声明、仪表板和源页面

实用规则：

- 当您希望对内存进行一次广泛的召回操作时，请使用 `memory_search`
- 当您需要具有来源追溯能力的 wiki 结果时，请使用 `wiki_search` 和 `wiki_get`
- 当您希望共享搜索跨越这两个层级时，请使用 `memory_search corpus=all`

如果桥接模式报告零个导出工件，则活动内存插件当前尚未公开公共桥接输入。请先运行 `openclaw wiki doctor`，然后确认活动内存插件支持公共工件。

## Vault 模式

`memory-wiki` 支持三种 Vault 模式：

### `isolated`

拥有自己的 Vault，自己的源文件，不依赖 `memory-core`。

当您希望 wiki 成为独立策划的知识存储库时，请使用此模式。

### `bridge`

通过公共插件 SDK 接缝从活动内存插件读取公共内存工件和内存事件。

当您希望 wiki 编译和组织内存插件的导出工件，而不涉及其私有插件内部时，请使用此模式。

桥接模式可以索引：

- 导出的内存工件
- 梦境报告
- 每日笔记
- 内存根文件
- 内存事件日志

### `unsafe-local`

针对本地私有路径的显式同机逃生舱口。

此模式有意设计为实验性的且不可移植。仅当您了解信任边界且特别需要桥接模式无法提供的本地文件系统访问权限时，才使用它。

## Vault 布局

该插件初始化 Vault 的方式如下：

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

托管内容保留在生成的块内。人工笔记块会被保留。

主要的页面组包括：

- `sources/` 用于导入的原始材料和桥接支持的页面
- `entities/` 用于持久的事物、人员、系统、项目和对象
- `concepts/` 用于想法、抽象概念、模式和策略
- `syntheses/` 用于编译的摘要和维护的汇总
- `reports/` 用于生成的仪表板

## 结构化声明和证据

页面可以携带结构化的 `claims` frontmatter，而不仅仅是自由格式的文本。

每个声明可以包括：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

证据条目可以包括：

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

这正是使 wiki 表现得更像是一个信念层而不是被动的笔记堆放的原因。声明可以被跟踪、评分、争议，并解析回来源。

## 编译管线

编译步骤读取 wiki 页面，规范化摘要，并在以下位置生成稳定的面向机器的产物：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

这些摘要的存在使得代理和运行时代码不必去抓取 Markdown 页面。

编译输出还驱动：

- 用于搜索/获取流程的首轮 wiki 索引
- 声明 ID 反向查找到所属页面
- 紧凑的提示补充
- 报告/仪表板生成

## 仪表板和健康报告

当启用 `render.createDashboards` 时，编译会在 `reports/` 下维护仪表板。

内置报告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

这些报告跟踪诸如：

- 矛盾笔记集群
- 竞争声明集群
- 缺少结构化证据的声明
- 低置信度的页面和声明
- 过时或未知的新鲜度
- 包含未解决问题的页面

## 搜索与检索

`memory-wiki` 支持两个搜索后端：

- `shared`：在可用时使用共享的内存搜索流程
- `local`：本地搜索 wiki

它还支持三个语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 在可能的情况下将编译摘要作为第一遍使用
- 声明 ID 可以解析回所属页面
- 有争议/过时/新鲜的声明会影响排名
- 出处标签可以保留到结果中

实用规则：

- 使用 `memory_search corpus=all` 进行一次广泛的召回
- 当您关心特定于 wiki 的排名、出处或页面级信念结构时，请使用 `wiki_search` + `wiki_get`

## Agent 工具

该插件注册了以下工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它们的作用：

- `wiki_status`：当前保险库模式、健康状况、Obsidian CLI 可用性
- `wiki_search`：搜索 wiki 页面，如果已配置，还可搜索共享记忆语料库
- `wiki_get`：通过 id/路径读取 wiki 页面，或回退到共享记忆语料库
- `wiki_apply`：进行狭窄的合成/元数据变更，不进行自由形式的页面编辑
- `wiki_lint`：结构检查、出处缺失、矛盾、未决问题

该插件还注册了一个非独占的记忆语料库补充，因此当活动记忆插件支持语料库选择时，共享的 `memory_search` 和 `memory_get` 可以访问 wiki。

## 提示和上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示部分会附加来自 `agent-digest.json` 的精简编译快照。

该快照特意设计得很小且具有高信噪比：

- 仅包含顶级页面
- 仅包含顶级声明
- 矛盾计数
- 问题计数
- 置信度/新鲜度限定符

这是可选的，因为它会改变提示的形状，并且主要用于明确使用记忆补充的上下文引擎或旧版提示组装。

## 配置

将配置放在 `plugins.entries.memory-wiki.config` 下：

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

关键开关：

- `vaultMode`： `isolated`、 `bridge`、 `unsafe-local`
- `vault.renderMode`： `native` 或 `obsidian`
- `bridge.readMemoryArtifacts`： 导入活动记忆插件的公共构件
- `bridge.followMemoryEvents`： 在桥接模式下包含事件日志
- `search.backend`： `shared` 或 `local`
- `search.corpus`: `wiki`, `memory`, 或 `all`
- `context.includeCompiledDigestPrompt`: 将紧凑的摘要快照附加到内存提示部分
- `render.createBacklinks`: 生成确定性相关块
- `render.createDashboards`: 生成仪表板页面

### 示例：QMD + 桥接模式

当你希望使用 QMD 进行检索，并使用 `memory-wiki` 作为维护的知识层时，请使用此配置：

```json5
{
  memory: {
    backend: "qmd",
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

这保留了：

- QMD 负责主动内存检索
- `memory-wiki` 专注于编译页面和仪表板
- 在你有意启用编译摘要提示之前，提示形状保持不变

## CLI

`memory-wiki` 还提供了一个顶层的 CLI 界面：

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

有关完整的命令参考，请参阅 [CLI: wiki](/zh/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，该插件会编写 Obsidian 友好的 Markdown，并且可以选择使用官方的 `obsidian` CLI。

支持的工作流程包括：

- 状态探测
- 库搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是可选的。如果没有 Obsidian，wiki 仍然可以在本机模式下工作。

## 推荐的工作流程

1. 保留你的主动内存插件用于检索/提升/梦想。
2. 启用 `memory-wiki`。
3. 除非你明确想要桥接模式，否则从 `isolated` 模式开始。
4. 当来源出处很重要时，使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 进行狭窄的综合或元数据更新。
6. 在有意义的更改之后运行 `wiki_lint`。
7. 如果你想要查看过时/矛盾的信息，请打开仪表板。

## 相关文档

- [内存概述](/zh/concepts/memory)
- [CLI: memory](/zh/cli/memory)
- [CLI: wiki](/zh/cli/wiki)
- [插件 SDK 概述](/zh/plugins/sdk-overview)
