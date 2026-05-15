---
summary: "CLICLI 参考，适用于 `openclaw wiki`（memory-wiki vault 状态、搜索、编译、检查、应用、桥接和 Obsidian 辅助工具）"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "Wiki"
---

# `openclaw wiki`

检查并维护 `memory-wiki` 仓库。

由捆绑的 `memory-wiki` 插件提供。

相关：

- [Memory Wiki 插件](/zh/plugins/memory-wiki)
- [Memory 概述](/zh/concepts/memory)
- [CLI：memory](CLI/en/cli/memory)

## 用途

当您需要具有以下功能的已编译知识仓库时，请使用 `openclaw wiki`：

- 原生的 wiki 搜索和页面读取
- 来源丰富的综合分析
- 矛盾和新旧程度报告
- 从活动 memory 插件进行 bridge 导入
- 可选的 Obsidian CLI 辅助工具

## 常用命令

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki search "who should I ask about Teams?" --mode route-question
openclaw wiki get entity.alpha --from 1 --lines 80

openclaw wiki apply synthesis "Alpha Summary" \
  --body "Short synthesis body" \
  --source-id source.alpha

openclaw wiki apply metadata entity.alpha \
  --source-id source.alpha \
  --status review \
  --question "Still active?"

openclaw wiki bridge import
openclaw wiki unsafe-local import

openclaw wiki obsidian status
openclaw wiki obsidian search "alpha"
openclaw wiki obsidian open syntheses/alpha-summary.md
openclaw wiki obsidian command workspace:quick-switcher
openclaw wiki obsidian daily
```

## 命令

### `wiki status`

检查当前保险库模式、运行状况以及 Obsidian CLI 可用性。

当您不确定保险库是否已初始化、bridge 模式是否健康或 Obsidian 集成是否可用时，请首先使用此命令。

当桥接模式处于活动状态并配置为读取 memory 构件时，此命令会查询正在运行的 Gateway(网关)，以便它看到的活跃 memory 插件上下文与 agent/runtime memory 相同。

### `wiki doctor`

运行 wiki 健康检查并揭示配置或仓库问题。

当桥接模式处于活动状态并配置为读取 memory 构件时，此命令会在生成报告之前查询正在运行的 Gateway(网关)。已禁用的桥接导入和不读取 memory 构件的桥接配置将保持本地/离线状态。

典型问题包括：

- 启用了桥接模式但没有公开的 memory 构件
- 仓库布局无效或缺失
- 预期为 Obsidian 模式但缺少外部 Obsidian CLI

### `wiki init`

创建 wiki 仓库布局和起始页面。

这将初始化根结构，包括顶级索引和缓存目录。

### `wiki ingest <path-or-url>`

将内容导入到 wiki 源层。

注意：

- URL 摄取由 `ingest.allowUrlIngest` 控制
- 导入的源页面会在 frontmatter 中保留出处
- 启用后，自动编译可以在摄取后运行

### `wiki compile`

重建索引、相关块、仪表板和编译摘要。

这会将稳定的面向机器的构件写入到以下位置：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果启用了 `render.createDashboards`，编译还会刷新报告页面。

### `wiki lint`

检查知识库并报告：

- 结构问题
- 来源缺失
- 矛盾点
- 未解决的问题
- 低置信度的页面/主张
- 过时的页面/主张

在进行有意义的 wiki 更新后运行此命令。

### `wiki search <query>`

搜索 wiki 内容。

行为取决于配置：

- `search.backend`: `shared` 或 `local`
- `search.corpus`: `wiki`, `memory`, 或 `all`
- `--mode`: `auto`, `find-person`, `route-question`, `source-evidence`, 或
  `raw-claim`

当你需要针对 wiki 的特定排名或来源细节时，请使用 `wiki search`。
对于一次广泛的共享召回，当活动的 memory 插件暴露共享搜索时，首选 `openclaw memory search`。

搜索模式有助于代理选择正确的搜索面：

- `find-person`: 别名、句柄、社交媒体账号、规范 ID 和人员页面
- `route-question`: 请求/最佳用途提示以及关系上下文
- `source-evidence`: 来源页面和结构化证据字段
- `raw-claim`: 带有主张/证据元数据的结构化主张文本

示例：

```bash
openclaw wiki search "bgroux" --mode find-person
openclaw wiki search "who knows Teams rollout?" --mode route-question
openclaw wiki search "maintainer-whois" --mode source-evidence
openclaw wiki search "strong route Teams" --mode raw-claim --json
```

当结果匹配结构化主张时，文本输出包含 `Claim:` 和 `Evidence:` 行。JSON 输出还额外暴露 `matchedClaimId`、
`matchedClaimStatus`、`matchedClaimConfidence`、`evidenceKinds` 和
`evidenceSourceIds`，用于代理端下钻。

### `wiki get <lookup>`

通过 id 或相对路径读取 wiki 页面。

示例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

应用狭义的变更，而无需进行自由形式的页面修改。

支持的流程包括：

- 创建/更新综合页面
- 更新页面元数据
- 附加来源 ID
- 添加问题
- 添加矛盾点
- 更新置信度/状态
- 写入结构化主张

此命令的存在是为了使 wiki 能够在不手动编辑受管块的情况下安全地演进。

### `wiki bridge import`

将活跃的内存插件中的公共内存构件导入到基于 bridge 支持的源页面中。

当您希望将最新导出的内存构件拉取到 wiki 仓库时，请在 `bridge` 模式下使用此命令。

对于活跃的 bridge 构件读取，CLI 通过 Gateway(网关) RPC 路由导入，以便导入使用运行时内存插件上下文。如果禁用了 bridge 导入或关闭了构件读取，该命令将保持本地/离线的零导入行为。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，从显式配置的本地路径导入。

这是有意为之的实验性功能，且仅限于同一台机器上使用。

### `wiki obsidian ...`

针对在 Obsidian 友好模式下运行的仓库的 Obsidian 辅助命令。

子命令：

- `status`
- `search`
- `open`
- `command`
- `daily`

这些命令在启用 `obsidian.useOfficialCli` 时，需要在 `PATH` 上安装官方的 `obsidian` CLI。

## 实际使用指南

- 当来源和页面标识很重要时，请使用 `wiki search` + `wiki get`。
- 使用 `wiki apply` 代替手动编辑托管生成的部分。
- 在信任相互矛盾或低置信度的内容之前，请使用 `wiki lint`。
- 在批量导入或源更改后，如果您希望立即获得新的仪表板和编译摘要，请使用 `wiki compile`。
- 当 bridge 模式依赖于新导出的内存构件时，请使用 `wiki bridge import`。

## 配置关联

`openclaw wiki` 的行为受以下因素影响：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

有关完整的配置模型，请参阅 [Memory Wiki plugin](/zh/plugins/memory-wiki)。

## 相关

- [CLI 参考](/zh/cli)
- [Memory wiki](/zh/plugins/memory-wiki)
