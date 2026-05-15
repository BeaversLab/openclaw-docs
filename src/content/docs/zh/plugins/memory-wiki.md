---
summary: "memory-wiki：具有溯源、声明、仪表板和网桥模式的编译知识库"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Memory wiki"
---

`memory-wiki` 是一个内置插件，可将持久记忆转化为编译的知识库。

它**不**替换活动内存插件。活动内存插件仍然拥有召回、提升、索引和做梦功能。`memory-wiki` 位于其旁边，并将持久知识编译为具有确定性页面、结构化声明、溯源、仪表板和机器可读摘要的可导航 wiki。

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

| 层级                                          | 负责                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| 活动内存插件（`memory-core`、QMD、Honcho 等） | 召回、语义搜索、提升、dreaming、内存运行时                                      |
| `memory-wiki`                                 | 编译后的 wiki 页面、富含来源追溯的综合、仪表板、特定于 wiki 的 search/get/apply |

如果活动内存插件暴露了共享的召回工件，OpenClaw 可以使用 OpenClaw`memory_search corpus=all` 在一次通过中搜索这两层。

当您需要特定于 wiki 的排名、来源追溯或直接页面访问时，请改用 wiki 原生工具。

## 推荐的混合模式

对于本地优先的设置，一个强大的默认配置是：

- 使用 QMD 作为 active memory 后端，用于召回和广泛的语义搜索
- 用于持久综合知识页面的 `bridge` 模式下的 `memory-wiki`

这种划分效果很好，因为每个层级都保持专注：

- QMD 保持原始笔记、会话导出和额外集合的可搜索性
- `memory-wiki` 编译稳定的实体、声明、仪表板和源页面

实用规则：

- 当您想要对记忆进行一次广泛的召回时，请使用 `memory_search`
- 当您想要具有溯源感知的 wiki 结果时，请使用 `wiki_search` 和 `wiki_get`
- 当您希望共享搜索跨越两层时，请使用 `memory_search corpus=all`

如果网桥模式报告零个导出的工件，则活动内存插件当前尚未暴露公共网桥输入。首先运行 `openclaw wiki doctor`，然后确认活动内存插件支持公共工件。

当网桥模式处于活动状态并启用 `bridge.readMemoryArtifacts` 时，`openclaw wiki status`、`openclaw wiki doctor`Gateway(网关)CLI 和 `openclaw wiki bridge
import` 通过运行中的 Gateway(网关) 进行读取。这使 CLI(命令行界面) 网桥检查与运行时内存插件上下文保持一致。如果禁用网桥或关闭工件读取，这些命令将保持其本地/离线行为。

## Vault modes

`memory-wiki` 支持三种 Vault 模式：

### `isolated`

拥有自己的库，拥有自己的源，不依赖于 `memory-core`。

当您希望 wiki 成为自己的精选知识存储时，请使用此模式。

### `bridge`

通过公共插件 SDK 接口从活动内存插件读取公共内存构件和内存事件。

当您希望 wiki 编译和组织内存插件导出的构件，而不深入访问私有插件内部时，请使用此模式。

桥接模式可以索引：

- 导出的内存构件
- 梦境报告
- 每日笔记
- 内存根文件
- 内存事件日志

### `unsafe-local`

针对本地私有路径的显式同机逃生舱口。

此模式是有意为之的实验性模式，且不可移植。仅当您了解信任边界并且特别需要桥接模式无法提供的本地文件系统访问权限时，才使用它。

## 库布局

该插件按如下方式初始化库：

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

托管的内容保留在生成的块内。人类笔记块会被保留。

主要页面组包括：

- `sources/` 用于导入的原始材料和桥接支持的页面
- `entities/` 用于持久的事物、人员、系统、项目和对象
- `concepts/` 用于想法、抽象、模式和策略
- `syntheses/` 用于编译的摘要和维护的汇总
- `reports/` 用于生成的仪表板

## 结构化声明和证据

页面可以携带结构化的 `claims` 前置元数据，而不仅仅是自由格式的文本。

每个声明可以包括：

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

证据条目可以包括：

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

这正是让 wiki 的表现更像是一个信念层，而不是被动的笔记堆栈的原因。声明可以被追踪、评分、争议，并回溯到源头进行解决。

## 面向代理的实体元数据

实体页面还可以携带供代理使用的路由元数据。这是通用的 frontmatter，因此适用于人员、团队、系统、项目或任何其他实体类型。

常见字段包括：

- `entityType`：例如 `person`、`team`、`system` 或 `project`
- `canonicalId`：跨别名和导入使用的稳定身份密钥
- `aliases`：应解析到同一页面的名称、句柄或标签
- `privacyTier`：`public`、`local-private`、`sensitive` 或 `confirm-before-use`
- `bestUsedFor` / `notEnoughFor`：紧凑的路由提示
- `lastRefreshedAt`：与页面编辑时间分开的源刷新时间戳
- `personCard`：可选的特定人员路由卡片，包含句柄、社交账号、
  电子邮件、时区、泳道、询问事项、避免询问事项、置信度和隐私设置
- `relationships`：指向相关页面的类型化边，包含目标、种类、权重、
  置信度、证据种类、隐私等级和备注

对于人员 wiki，代理通常应从 `reports/person-agent-directory.md` 开始，然后在使用联系详细信息或推断的事实之前，使用 `wiki_get` 打开人员页面。

示例：

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams and Azure routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft ecosystem
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad is useful for Microsoft Teams routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## 编译管道

编译步骤读取 wiki 页面，规范化摘要，并在以下位置生成稳定的面向机器的工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

这些摘要的存在是为了让代理和运行时代码不必抓取 Markdown 页面。

编译输出还支持：

- 用于搜索/获取流程的首次 wiki 索引
- 反向查找声明 ID (claim-id) 到所属页面
- 紧凑的提示补充材料
- 报告/仪表板生成

## 仪表板和健康报告

当启用 `render.createDashboards` 时，编译会在 `reports/` 下维护仪表板。

内置报告包括：

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

这些报告追踪以下内容：

- 矛盾笔记集群
- 竞争主张集群
- 缺少结构化证据的主张
- 低置信度页面和主张
- 陈旧或时效性未知
- 包含未解决问题的页面
- 人员/实体路由卡片
- 结构化关系边
- 证据类别覆盖范围
- 在使用前需要审查的非公开隐私层级

## 搜索和检索

`memory-wiki` 支持两种搜索后端：

- `shared`：在可用时使用共享内存搜索流程
- `local`：本地搜索 wiki

它还支持三种语料库：

- `wiki`
- `memory`
- `all`

重要行为：

- `wiki_search` 和 `wiki_get` 尽可能将编译摘要作为第一遍
- 主张 ID 可以解析回所属页面
- 有争议/陈旧/新的主张会影响排名
- 来源标签可以保留到结果中
- 搜索模式可以针对人员查找、问题路由、源证据或原始主张对排名进行加权

实用规则：

- 使用 `memory_search corpus=all` 进行一次广泛的召回
- 当您关注 wiki 特定排名、来源或页面级信念结构时，使用 `wiki_search` + `wiki_get`

搜索模式：

- `auto`：平衡的默认模式
- `find-person`：提升类似人员的实体、别名、句柄、社交账号和规范 ID
- `route-question`：提升智能体卡片、请求提示、最佳用途提示和关系上下文
- `source-evidence`：提升源页面和结构化证据元数据
- `raw-claim`：提升匹配的结构化主张并在结果中返回主张/证据元数据

当结果匹配结构化声明时，`wiki_search` 可以在其详细信息负载中返回
`matchedClaimId`、`matchedClaimStatus`、`matchedClaimConfidence`、
`evidenceKinds` 和 `evidenceSourceIds`。文本输出
还包括紧凑的 `Claim:` 和 `Evidence:` 行（如果有）。

## Agent 工具

该插件注册了以下工具：

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

它们的功能：

- `wiki_status`：当前库模式、健康状况、Obsidian CLI 可用性
- `wiki_search`：搜索 wiki 页面，如果已配置，还包括共享记忆语料库；
  接受 `mode` 用于人员查找、问题路由、源证据或原始
  声明下钻
- `wiki_get`：通过 id/路径 读取 wiki 页面，或者回退到共享记忆语料库
- `wiki_apply`：狭窄的综合/元数据变更，不涉及自由形式的页面修改
- `wiki_lint`：结构检查、来源缺口、矛盾、未决问题

该插件还注册了一个非独占的记忆语料库补充，因此共享的
`memory_search` 和 `memory_get` 可以在主动记忆
插件支持语料库选择时访问 wiki。

## 提示词和上下文行为

当启用 `context.includeCompiledDigestPrompt` 时，记忆提示部分
会附加来自 `agent-digest.json` 的紧凑编译快照。

该快照有意设计得小而高信噪比：

- 仅限顶级页面
- 仅限顶级声明
- 矛盾计数
- 问题计数
- 置信度/时效性限定符

这是可选的，因为它会改变提示词的形状，并且主要对明确消费记忆补充的
上下文引擎或旧式提示词组装有用。

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

- `vaultMode`：`isolated`、`bridge`、`unsafe-local`
- `vault.renderMode`: `native` 或 `obsidian`
- `bridge.readMemoryArtifacts`: 导入活动内存插件的公共工件
- `bridge.followMemoryEvents`: 在桥接模式下包含事件日志
- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`、`memory` 或 `all`
- `context.includeCompiledDigestPrompt`: 将紧凑的摘要快照附加到内存提示部分
- `render.createBacklinks`: 生成确定性相关块
- `render.createDashboards`: 生成仪表板页面

### 示例：QMD + 桥接模式

当您希望使用 QMD 进行召回，并使用 `memory-wiki` 作为维护的知识层时，请使用此配置：

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
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

这将保持：

- QMD 负责活动内存召回
- `memory-wiki` 专注于编译页面和仪表板
- 在您有意启用编译摘要提示之前，提示的形状保持不变

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

有关完整的命令参考，请参阅 [CLI: wiki](/zh/cli/wiki)。

## Obsidian 支持

当 `vault.renderMode` 为 `obsidian` 时，该插件会编写 Obsidian 友好的 Markdown，并且可以选择使用官方的 `obsidian` CLI。

支持的工作流包括：

- 状态探测
- 知识库搜索
- 打开页面
- 调用 Obsidian 命令
- 跳转到每日笔记

这是可选的。在没有 Obsidian 的情况下，wiki 仍然可以在原生模式下工作。

## 推荐工作流

1. 保留您的活动内存插件用于召回/提升/做梦。
2. 启用 `memory-wiki`。
3. 除非您明确需要桥接模式，否则请从 `isolated` 模式开始。
4. 当来源很重要时，使用 `wiki_search` / `wiki_get`。
5. 使用 `wiki_apply` 进行狭窄的综合或元数据更新。
6. 在进行有意义的更改后运行 `wiki_lint`。
7. 如果您希望查看陈旧/矛盾信息，请打开仪表板。

## 相关文档

- [Memory Overview](/zh/concepts/memory)
- [CLI: memory](CLI/en/cli/memory)
- [CLI: wiki](CLI/en/cli/wiki)
- [Plugin SDK overview](/zh/plugins/sdk-overview)
