---
summary: "CLI 参考，用于 `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "memory"
---

# `openclaw memory`

管理语义记忆索引和搜索。
由激活的记忆插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 以禁用）。

相关：

- 记忆概念：[Memory](/en/concepts/memory)
- 记忆 Wiki：[Memory Wiki](/en/plugins/memory-wiki)
- Wiki CLI：[wiki](/en/cli/wiki)
- 插件：[Plugins](/en/tools/plugin)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --fix
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory promote --limit 10 --min-score 0.75
openclaw memory promote --apply
openclaw memory promote --json --min-recall-count 0 --min-unique-queries 0
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
openclaw memory rem-harness
openclaw memory rem-harness --json
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

`memory status` 和 `memory index`：

- `--agent <id>`：将范围限定到单个代理。如果不使用该选项，这些命令将针对每个配置的代理运行；如果没有配置代理列表，则回退到默认代理。
- `--verbose`：在探测和索引期间发出详细日志。

`memory status`：

- `--deep`：探测向量 + 嵌入可用性。
- `--index`：如果存储不干净，则运行重新索引（隐含 `--deep`）。
- `--fix`：修复过期的召回锁并规范化升级元数据。
- `--json`：打印 JSON 输出。

`memory index`：

- `--force`：强制完全重新索引。

`memory search`：

- 查询输入：传递位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，则 `--query` 优先。
- 如果两者均未提供，该命令将以错误退出。
- `--agent <id>`：将范围限定到单个代理（默认：默认代理）。
- `--max-results <n>`：限制返回的结果数量。
- `--min-score <n>`：过滤掉低分匹配项。
- `--json`：打印 JSON 结果。

`memory promote`：

预览并应用短期记忆升级。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 将升级内容写入 `MEMORY.md`（默认：仅预览）。
- `--limit <n>` -- 限制显示的候选项数量。
- `--include-promoted` -- 包含在先前周期中已提升的条目。

完整选项：

- 使用加权提升信号（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）对 `memory/YYYY-MM-DD.md` 中的短期候选项进行排名。
- 使用来自记忆回溯和每日摄取过程的短期信号，以及轻度/REM阶段增强信号。
- 启用梦境功能时，`memory-core` 会自动管理一个 cron 作业，该作业在后台运行全面扫描（`light -> REM -> deep`）（无需手动 `openclaw cron add`）。
- `--agent <id>`：将范围限定为单个智能体（默认为默认智能体）。
- `--limit <n>`：返回/应用的最大候选项数。
- `--min-score <n>`：最低加权提升分数。
- `--min-recall-count <n>`：候选项所需的最低回溯次数。
- `--min-unique-queries <n>`：候选项所需的最低不同查询次数。
- `--apply`：将选定的候选项追加到 `MEMORY.md` 并将它们标记为已提升。
- `--include-promoted`：在输出中包含已提升的候选项。
- `--json`：打印 JSON 输出。

`memory promote-explain`：

解释特定的提升候选项及其分数细分。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候选项键、路径片段或代码片段。
- `--agent <id>`：将范围限定为单个智能体（默认为默认智能体）。
- `--include-promoted`：包含已提升的候选项。
- `--json`：打印 JSON 输出。

`memory rem-harness`：

预览 REM 反思、候选项事实和深度提升输出，而不写入任何内容。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：将范围限定为单个智能体（默认为默认智能体）。
- `--include-promoted`：包含已提升的深度候选项。
- `--json`：打印 JSON 输出。

## 梦境（实验性）

梦境是后台记忆整合系统，包含三个协作阶段：**light**（整理/暂存短期素材）、**deep**（将持久事实提升到 `MEMORY.md`）和 **REM**（反思并呈现主题）。

- 使用 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用。
- 使用 `/dreaming on|off` 从聊天中切换（或使用 `/dreaming status` 检查）。
- 梦境在一个托管扫描计划（`dreaming.frequency`）上运行，并按顺序执行阶段：light、REM、deep。
- 只有 deep 阶段会将持久记忆写入 `MEMORY.md`。
- 人类可读的阶段输出和日记条目会写入 `DREAMS.md`（或现有的 `dreams.md`），并可在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中获取可选的分阶段报告。
- 排名使用加权信号：召回频率、检索相关性、查询多样性、时间近因、跨天整合以及衍生概念丰富度。
- 在写入 `MEMORY.md` 之前，提升过程会重新读取实时每日笔记，因此已编辑或删除的短期片段不会从过时的召回存储快照中得到提升。
- 除非传递 CLI 阈值覆盖参数，否则计划和手动 `memory promote` 运行共享相同的 deep 阶段默认值。
- 自动运行会扩散到所有已配置的内存工作区。

默认调度：

- **扫描节奏**：`dreaming.frequency = 0 3 * * *`
- **Deep 阈值**：`minScore=0.8`、`minRecallCount=3`、`minUniqueQueries=3`、`recencyHalfLifeDays=14`、`maxAgeDays=30`

示例：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

注意事项：

- `memory index --verbose` 打印每个阶段的详细信息（提供商、模型、来源、批次活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果有效活动的内存远程 API 键字段被配置为 SecretRefs，该命令会从活动网关快照中解析这些值。如果网关不可用，该命令将快速失败。
- Gateway(网关) 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的网关；较旧的网关会返回未知方法错误。
- 使用 `dreaming.frequency` 调整预定清理的频率。深层提升策略通常是内部的；当您需要一次性手动覆盖时，请使用 CLI 标志在 `memory promote` 上进行操作。
- 有关完整的阶段描述和配置参考，请参阅 [Dreaming](/en/concepts/dreaming)。
