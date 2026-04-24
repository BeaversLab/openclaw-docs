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

- Memory 概念：[Memory](/zh/concepts/memory)
- Memory 维基：[Memory Wiki](/zh/plugins/memory-wiki)
- Wiki CLI：[wiki](/zh/cli/wiki)
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

- `--deep`：探测向量 + 嵌入可用性。
- `--index`：如果存储不干净，则运行重新索引（隐含 `--deep`）。
- `--fix`：修复过期的召回锁并规范化升级元数据。
- `--json`：打印 JSON 输出。

如果 `memory status` 显示 `Dreaming status: blocked`，则说明托管的做梦 cron 已启用，但驱动它的心跳对于默认代理未触发。有关两个常见原因，请参阅 [Dreaming never runs](/zh/concepts/dreaming#dreaming-never-runs-status-shows-blocked)。

`memory index`：

- `--force`：强制进行完整重新索引。

`memory search`：

- 查询输入：传递位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，`--query` 优先。
- 如果两者都未提供，该命令将报错退出。
- `--agent <id>`：限定在单个代理（默认：默认代理）。
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
- `--include-promoted` -- 包含在先前周期中已提升的条目。

完整选项：

- 使用加权提升信号（`frequency`、`relevance`、`query diversity`、`recency`、`consolidation`、`conceptual richness`）对来自 `memory/YYYY-MM-DD.md` 的短期候选进行排序。
- 使用来自记忆回溯和每日摄取传递的短期信号，加上轻度/REM 阶段的强化信号。
- 启用 dreaming 后，`memory-core` 会自动管理一个 cron 作业，该作业在后台运行完整扫描（`light -> REM -> deep`）（无需手动 `openclaw cron add`）。
- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--limit <n>`：要返回/应用的最大候选数。
- `--min-score <n>`：最低加权提升分数。
- `--min-recall-count <n>`：候选所需的最小召回计数。
- `--min-unique-queries <n>`：候选所需的最小不同查询计数。
- `--apply`：将选定的候选追加到 `MEMORY.md` 并将其标记为已提升。
- `--include-promoted`：在输出中包含已提升的候选。
- `--json`：打印 JSON 输出。

`memory promote-explain`：

解释特定的提升候选及其分数细分。

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>`：要查找的候选键、路径片段或代码片段。
- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的候选。
- `--json`：打印 JSON 输出。

`memory rem-harness`：

在不写入任何内容的情况下预览 REM 反思、候选事实和深度提升输出。

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>`：将范围限定为单个代理（默认：默认代理）。
- `--include-promoted`：包含已提升的深度候选内容。
- `--json`：打印 JSON 输出。

## Dreaming

Dreaming 是后台记忆整合系统，具有三个协作阶段：**light**（整理/暂存短期材料）、**deep**（将持久事实提升至 `MEMORY.md`）和 **REM**（反思并呈现主题）。

- 通过 `plugins.entries.memory-core.config.dreaming.enabled: true` 启用。
- 使用 `/dreaming on|off` 从聊天中切换（或使用 `/dreaming status` 进行检查）。
- Dreaming 在一个托管扫描计划（`dreaming.frequency`）上运行，并按顺序执行各个阶段：light、REM、deep。
- 只有深度阶段会将持久化内存写入 `MEMORY.md`。
- 人类可读的阶段输出和日记条目会写入 `DREAMS.md`（或现有的 `dreams.md`），其中可选的每阶段报告位于 `memory/dreaming/<phase>/YYYY-MM-DD.md` 中。
- 排序使用加权信号：召回频率、检索相关性、查询多样性、时间最近度、跨日巩固以及衍生概念的丰富度。
- 在写入 `MEMORY.md` 之前，提升过程会重新读取实时的每日笔记，因此经过编辑或删除的短期片段不会从过时的召回存储快照中被提升。
- 除非你传递 CLI 阈值覆盖，否则预定和手动 `memory promote` 运行共享相同的深度阶段默认值。
- 自动运行会分散到配置的内存工作区中。

默认调度：

- **扫描频率**：`dreaming.frequency = 0 3 * * *`
- **Deep thresholds**: `minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

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

- `memory index --verbose` 打印每个阶段的详细信息（提供商、模型、来源、批处理活动）。
- `memory status` 包括通过 `memorySearch.extraPaths` 配置的任何额外路径。
- 如果实际上有效的远程 API 键字段被配置为 SecretRefs，该命令将从活动的 Gateway 快照中解析这些值。如果 Gateway 不可用，该命令将快速失败。
- Gateway 版本偏差说明：此命令路径需要支持 `secrets.resolve` 的 Gateway；较旧的 Gateway 会返回未知方法错误。
- 使用 `dreaming.frequency` 调整计划扫描的频率。深层提升策略通常是内部的；当您需要一次性手动覆盖时，请使用 `memory promote` 上的 CLI 标志。
- `memory rem-harness --path <file-or-dir> --grounded` 预览历史每日笔记中的 grounded `What Happened`、`Reflections` 和 `Possible Lasting Updates`，而不进行任何写入。
- `memory rem-backfill --path <file-or-dir>` 将可逆的 grounded 日记条目写入 `DREAMS.md` 以供 UI 审查。
- `memory rem-backfill --path <file-or-dir> --stage-short-term` 还会将 grounded 持久候选者播种到实时短期提升存储中，以便正常的深层阶段可以对它们进行排名。
- `memory rem-backfill --rollback` 删除先前写入的 grounded 日记条目，而 `memory rem-backfill --rollback-short-term` 删除先前暂存的 grounded 短期候选者。
- 有关完整的阶段描述和配置参考，请参阅 [Dreaming](/zh/concepts/dreaming)。
