---
summary: "CLI 参考文档，用于 `openclaw wiki`（memory-wiki vault status, search, compile, lint, apply, bridge, and Obsidian helpers）"
read_when:
  - You want to use the memory-wiki CLI
  - You are documenting or changing `openclaw wiki`
title: "wiki"
---

# `openclaw wiki`

检查并维护 `memory-wiki` 保险库。

由捆绑的 `memory-wiki` 插件提供。

相关：

- [Memory Wiki 插件](/en/plugins/memory-wiki)
- [Memory 概述](/en/concepts/memory)
- [CLI：memory](/en/cli/memory)

## 用途

当您需要具有以下功能的编译知识库时，请使用 `openclaw wiki`：

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

### `wiki doctor`

运行 wiki 运行状况检查并发现配置或保险库问题。

典型问题包括：

- 启用了 bridge 模式但没有公共 memory 生成的工件
- 无效或缺失的保险库布局
- 当预期为 Obsidian 模式时，缺少外部 Obsidian CLI

### `wiki init`

创建 wiki 保险库布局和起始页面。

这将初始化根结构，包括顶级索引和缓存目录。

### `wiki ingest <path-or-url>`

将内容导入 wiki 源层。

注意：

- URL 摄取由 `ingest.allowUrlIngest` 控制
- 导入的源页面会在 frontmatter 中保留来源信息
- 启用后，自动编译可以在摄取后运行

### `wiki compile`

重建索引、相关块、仪表板和编译摘要。

这会在以下位置写入稳定的面向机器的工件：

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

如果启用了 `render.createDashboards`，编译也会刷新报告页面。

### `wiki lint`

对保险库进行 lint 并报告：

- 结构问题
- 来源缺失
- 矛盾
- 未解决的问题
- 低置信度页面/声明
- 过时的页面/声明

在进行有意义的 wiki 更新后运行此命令。

### `wiki search <query>`

搜索 wiki 内容。

行为取决于配置：

- `search.backend`：`shared` 或 `local`
- `search.corpus`：`wiki`、`memory` 或 `all`

当您需要针对 wiki 的特定排名或出处详细信息时，请使用 `wiki search`。
对于一次广泛的共享检索过程，如果当前激活的内存插件暴露了共享搜索，则首选 `openclaw memory search`。

### `wiki get <lookup>`

通过 ID 或相对路径读取 wiki 页面。

示例：

```bash
openclaw wiki get entity.alpha
openclaw wiki get syntheses/alpha-summary.md --from 1 --lines 80
```

### `wiki apply`

应用受限的变更，而无需对页面进行自由形式的编辑。

支持的流程包括：

- 创建/更新综合页面
- 更新页面元数据
- 附加源 ID
- 添加问题
- 添加矛盾
- 更新置信度/状态
- 写入结构化声明

此命令的存在是为了让 wiki 能够安全地演进，而无需手动编辑
受管理的块。

### `wiki bridge import`

将活动的内存插件中的公共内存工件导入到支持 bridge 的
源页面中。

在 `bridge` 模式下，当您希望将最新导出的内存工件
拉取到 wiki vault 中时，请使用此命令。

### `wiki unsafe-local import`

在 `unsafe-local` 模式下，从显式配置的本地路径导入。

这是有意的实验性功能，仅限同一台机器使用。

### `wiki obsidian ...`

适用于运行在 Obsidian 兼容模式下的 vault 的 Obsidian 辅助命令。

子命令：

- `status`
- `search`
- `open`
- `command`
- `daily`

这些需要官方的 `obsidian` CLI 在 `PATH` 上，
当 `obsidian.useOfficialCli` 启用时。

## 实际使用指南

- 当出处和页面身份很重要时，请使用 `wiki search` + `wiki get`。
- 使用 `wiki apply` 代替手动编辑受管理的生成部分。
- 在信任相互矛盾或低置信度内容之前，请使用 `wiki lint`。
- 在批量导入或源更改后，如果您希望立即获得新的仪表板和编译摘要，请使用 `wiki compile`。
- 当桥接模式依赖于新导出的记忆产物时，请使用 `wiki bridge import`。

## 配置关联

`openclaw wiki` 的行为受以下因素影响：

- `plugins.entries.memory-wiki.config.vaultMode`
- `plugins.entries.memory-wiki.config.search.backend`
- `plugins.entries.memory-wiki.config.search.corpus`
- `plugins.entries.memory-wiki.config.bridge.*`
- `plugins.entries.memory-wiki.config.obsidian.*`
- `plugins.entries.memory-wiki.config.render.*`
- `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`

有关完整的配置模型，请参阅 [Memory Wiki plugin](/en/plugins/memory-wiki)。
