---
summary: "memory-wiki：具有溯源、声明、仪表板和桥接模式的编译知识库"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "记忆 Wiki"
---

# 记忆 Wiki

`memory-wiki` 是一个内置插件，可将持久记忆转换为编译后的知识库。

它并**不**替换活动记忆插件。活动记忆插件仍然拥有召回、提升、索引和梦境功能。`memory-wiki` 位于其旁边，并将持久知识编译为具有确定性页面、结构化声明、溯源、仪表板和机器可读摘要的可浏览 Wiki。

当您希望记忆更像是一个维护良好的知识层，而不只是一堆 Markdown 文件时，请使用它。

## 它添加的内容

- 一个具有确定性页面布局的专用 Wiki 库
- 结构化的声明和证据元数据，而不仅仅是散文
- 页面级溯源、置信度、矛盾和未决问题
- 供代理/运行时使用者使用的编译摘要
- Wiki 原生的搜索/获取/应用/检查工具
- 可选的桥接模式，用于从活动记忆插件导入公共工件
- 可选的 Obsidian 友好渲染模式和 CLI 集成

## 它如何与记忆配合

可以这样理解这种划分：

| 层                                            | 拥有                                                                |
| --------------------------------------------- | ------------------------------------------------------------------- |
| 活动记忆插件（`memory-core`、QMD、Honcho 等） | 召回、语义搜索、提升、梦境、记忆运行时                              |
| `memory-wiki`                                 | 编译的 Wiki 页面、丰富的溯源综合、仪表板、Wiki 特定的搜索/获取/应用 |

如果活动记忆插件暴露了共享的召回工件，OpenClaw 可以使用 `memory_search corpus=all` 一次性搜索这两层。

当您需要 Wiki 特定的排名、溯源或直接页面访问时，请改用 Wiki 原生工具。

## 库模式

`memory-wiki` 支持三种库模式：

### `isolated`

自己的库，自己的来源，不依赖于 `memory-core`。

当您希望 Wiki 成为它自己策划的知识存储时，请使用此模式。

### `bridge`

通过公共插件 SDK 接口，从活动记忆插件读取公共记忆工件和记忆事件。

当您希望 wiki 编译并整理 memory 插件导出的产物，而不访问私有插件内部时，请使用此模式。

Bridge 模式可以索引：

- 导出的记忆产物
- 梦境报告
- 每日笔记
- 记忆根文件
- 记忆事件日志

### `unsafe-local`

针对本地私有路径的显式同机逃生舱。

此模式是有意为之的实验性且不可移植的模式。仅当您理解信任边界且特别需要 Bridge 模式无法提供的本地文件系统访问权限时才使用它。

## Vault 布局

该插件初始化的 vault 如下所示：

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

托管内容保留在生成的块内。人类笔记块会被保留。

主要页面分组包括：

- `sources/` 用于导入的原始材料和 Bridge 支持的页面
- `entities/` 用于持久化的事物、人物、系统、项目和对象
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

这使得 wiki 的行为更像是一个信念层，而不是被动的笔记转储。声明可以被跟踪、评分、质疑并回溯到源头。

## 编译管道

编译步骤读取 wiki 页面，规范化摘要，并在以下位置输出稳定的面向机器的产物：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

这些摘要的存在使得代理和运行时代码不必抓取 Markdown 页面。

编译的输出还支持：

- 用于搜索/获取流程的首遍 wiki 索引
- 通过声明 ID 回溯查找所属页面
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

这些报告追踪以下内容：

- 矛盾笔记集群
- 竞争主张集群
- 缺少结构化证据的主张
- 低置信度的页面和主张
- 陈旧或未知的新鲜度
- 包含未解决问题的页面

## 搜索和检索

`memory-wiki` 支持两种搜索后端：

- `shared`：在可用时使用共享的内存搜索流
- `local`：在本地搜索 wiki

它还支持三种语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 在可能时使用编译摘要作为第一遍
- 主张 ID 可以解析回所属页面
- 有争议/陈旧/新鲜的主张会影响排名
- 出处标签可以保留到结果中

实用规则：

- 使用 `memory_search corpus=all` 进行一次广泛的召回
- 当您关心 wiki 特定排名、出处或页面级信念结构时，请使用 `wiki_search` + `wiki_get`

## Agent 工具

该插件注册了以下工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它们的作用：

- `wiki_status`：当前库模式、健康状况、Obsidian CLI 可用性
- `wiki_search`：搜索 wiki 页面，并在配置后搜索共享的内存语料库
- `wiki_get`：通过 id/路径读取 wiki 页面，或回退到共享的内存语料库
- `wiki_apply`：在不进行自由式页面编辑的情况下进行狭窄的综合/元数据变更
- `wiki_lint`：结构检查、出处缺失、矛盾、未决问题

该插件还注册了一个非独占的记忆语料库补充，因此当活动记忆插件支持语料库选择时，共享的 `memory_search` 和 `memory_get` 可以访问 wiki。

## 提示词与上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示词部分会附加来自 `agent-digest.json` 的紧凑编译快照。

该快照有意设计得体积小且信号价值高：

- 仅包含顶层页面
- 仅包含顶层声明
- 矛盾计数
- 问题计数
- 置信度/时效性限定词

这是可选项，因为它会改变提示词的形状，并且主要用于明确使用记忆补充的上下文引擎或旧版提示词组装。

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

- `vaultMode`: `isolated`、`bridge` 或 `unsafe-local`
- `vault.renderMode`: `native` 或 `obsidian`
- `bridge.readMemoryArtifacts`: 导入活动记忆插件的公共工件
- `bridge.followMemoryEvents`: 在桥接模式下包含事件日志
- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`: 将紧凑摘要快照附加到记忆提示词部分
- `render.createBacklinks`: 生成确定性相关块
- `render.createDashboards`: 生成仪表板页面

## CLI

`memory-wiki` 还暴露了一个顶层 CLI 接口：

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

有关完整的命令参考，请参阅 [CLI: wiki](/en/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，插件会写入 Obsidian 友好的 Markdown，并可以选择使用官方 `obsidian` CLI。

支持的工作流程包括：

- 状态探测
- 库搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是可选的。Wiki 仍可在没有 Obsidian 的原生模式下工作。

## 推荐的工作流程

1. 保留您的主动内存插件用于检索/提升/梦境。
2. 启用 `memory-wiki`。
3. 除非您明确需要 bridge 模式，否则请从 `isolated` 模式开始。
4. 当来源出处很重要时，使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 进行窄幅综合或元数据更新。
6. 在进行有意义的更改后运行 `wiki_lint`。
7. 如果您希望查看过时/矛盾的内容，请打开仪表板。

## 相关文档

- [内存概述](/en/concepts/memory)
- [CLI: memory](/en/cli/memory)
- [CLI: wiki](/en/cli/wiki)
- [插件 SDK 概述](/en/plugins/sdk-overview)
