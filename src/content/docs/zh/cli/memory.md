---
summary: "CLI 参考，用于 `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You're debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "Memory"
---

# `openclaw memory`

管理语义记忆索引和搜索。
由激活的记忆插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 以禁用）。

相关：

- 内存概念：[Memory](/zh/concepts/memory)
- 内存百科：[Memory Wiki](/zh/plugins/memory-wiki)
- 百科 CLI：[wiki](/zh/cli/wiki)
- 插件：[Plugins](/zh/tools/plugin)

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

- `--deep`：探测本地向量存储就绪状态、嵌入提供商就绪状态以及语义向量搜索就绪状态。普通的 `memory status` 保持快速，不会运行实时嵌入或提供商发现工作；未知的向量存储或语义向量状态表示该命令未对其进行探测。QMD 词法 `searchMode: "search"` 跳过语义向量探测和嵌入维护，即使使用了 `--deep`。
- `--index`：如果存储库是脏的，则运行重新索引（意味着 `--deep`）。
- `--fix`：修复过时的召回锁并规范化提升元数据。
- `--json`：打印 JSON 输出。

如果 `memory status` 显示 `Dreaming status: blocked`，则托管式定时梦境任务已启用，但驱动它的心跳未针对默认代理触发。有关两个常见原因，请参阅 [Dreaming never runs](/zh/concepts/dreaming#dreaming-never-runs-status-shows-blocked)。

`memory index`：

- `--force`：强制完全重新索引。

`memory search`：

- 查询输入：传递位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，`--query` 优先。
- 如果两者都未提供，该命令将报错退出。
- `--agent <id>`：将范围限定到单个代理（默认：默认代理）。
- `--max-results <n>`：限制返回的结果数量。
- `--min-score <n>`：过滤掉低分匹配项。
- `--json`：打印 JSON 结果。

`memory promote`：

预览并应用短期记忆提升。

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- 将提升内容写入 `MEMORY.md`（默认：仅预览）。
- `--limit <n>` -- 限制显示的候选项数量。
- `--include-promoted` -- 包含在之前的周期中已提升的条目。

完整选项：

- 使用加权提升信号（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）对来自 `memory/YYYY-MM-DD.md` 的短期候选项进行排名。
- 使用来自记忆回溯和每日摄取传递的短期信号，加上轻度/REM 阶段的强化信号。
- 当启用梦境功能时，`memory-core` 会自动管理一个 cron 作业，在后台运行全量扫描（`light -> REM -> deep`）（无需手动 `openclaw cron add`）。
- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--limit <n>`：要返回/应用的最大候选项数。
- `--min-score <n>`：最低加权提升分数。
- `--min-recall-count <n>`：候选项所需的最低召回次数。
- `--min-unique-queries <n>`：候选项所需的最低不同查询数量。
- `--apply`：将选定的候选项追加到 `MEMORY.md` 并将它们标记为已提升。
- `--include-promoted`：在输出中包含已提升的候选项。
- `--json`：打印 JSON 输出。

`memory promote-explain`：

解释特定的提升候选及其分数细分。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候选项键、路径片段或代码片段。
- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的候选项。
- `--json`：打印 JSON 输出。

`memory rem-harness`：

在不写入任何内容的情况下预览 REM 反思、候选事实和深度提升输出。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的深度候选项。
- `--json`：打印 JSON 输出。

## Dreaming

梦境是后台记忆整合系统，具有三个协作阶段：**浅睡**（对短期材料进行排序/暂存）、**深睡**（将持久事实提升到 `MEMORY.md`）和 **REM**（反映并呈现主题）。

- 使用 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用。
- 通过 `/dreaming on|off` 从聊天中切换（或使用 `/dreaming status` 进行检查）。
- Dreaming 在一个托管扫描计划（`dreaming.frequency`）上运行，并按顺序执行各个阶段：浅睡眠、快速眼动（REM）、深度睡眠。
- 只有深度睡眠阶段会将持久化内存写入 `MEMORY.md`。
- 人类可读的阶段输出和日记条目会写入 `DREAMS.md`（或现有的 `dreams.md`），并在 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中提供可选的每个阶段的报告。
- 排序使用加权信号：召回频率、检索相关性、查询多样性、时间最近度、跨日巩固以及衍生概念的丰富度。
- 在写入 `MEMORY.md` 之前，Promotion 会重新读取实时每日笔记，因此已编辑或已删除的短期摘录不会从过时的召回存储快照中被提升。
- 计划和手动 `memory promote` 运行共享相同的深度阶段默认值，除非您传递 CLI CLI 阈值覆盖。
- 自动运行会分散到配置的内存工作区中。

默认调度：

- **扫描频率**：`dreaming.frequency = 0 3 * * *`
- **深度阈值**：`minScore=0.8`、`minRecallCount=3`、`minUniqueQueries=3`、`recencyHalfLifeDays=14`、`maxAgeDays=30`

例如：

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

注意：

- `memory index --verbose` 打印每个阶段的详细信息（提供商、模型、源、批处理活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果实际上有效的远程 API 键字段被配置为 SecretRefs，该命令将从活动的 Gateway 快照中解析这些值。如果 Gateway 不可用，该命令将快速失败。
- Gateway(网关) 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的网关；较旧的网关会返回未知方法错误。
- 使用 `dreaming.frequency` 调整计划的扫描频率。深度提升策略在内部处理；当您需要一次性手动覆盖时，请在 `memory promote` 上使用 CLI 标志。
- `memory rem-harness --path <file-or-dir> --grounded` 预览来自历史每日笔记的有根据的 `What Happened`、`Reflections` 和 `Possible Lasting Updates`，而不写入任何内容。
- `memory rem-backfill --path <file-or-dir>` 将可逆的有根据的日记条目写入 `DREAMS.md` 以供 UI 审查。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 还将有根据的持久化候选者种子到实时短期提升存储中，以便正常的深度阶段可以对它们进行排名。
- `memory rem-backfill --rollback` 删除先前写入的有根据的日记条目，而 `memory rem-backfill --rollback-short-term` 删除先前暂存的有根据的短期候选者。
- 有关完整的阶段描述和配置参考，请参阅 [Dreaming](/zh/concepts/dreaming)。

## 相关

- [CLI 参考](/zh/cli)
- [内存概述](/zh/concepts/memory)
