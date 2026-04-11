---
title: "Dreaming (experimental)"
summary: "包含浅层、深层和 REM 阶段以及梦梦日记的后台记忆巩固系统"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Dreaming (实验性)

Dreaming 是 `memory-core` 中的后台记忆巩固系统。
它帮助 OpenClaw 将强烈的短期信号转化为持久记忆，同时
保持过程的可解释性和可审查性。

Dreaming 是**可选加入 (opt-in)** 的，默认情况下处于禁用状态。

## Dreaming 写入的内容

Dreaming 保留两种输出：

- `memory/.dreams/` 中的 **机器状态**（召回存储、阶段信号、摄取检查点、锁）。
- `DREAMS.md`（或现有的 `dreams.md`）中的 **人类可读输出** 以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可选阶段报告文件。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

Dreaming 使用三个协作阶段：

| 阶段 | 目的                           | 持久写入         |
| ---- | ------------------------------ | ---------------- |
| 浅层 | 对最近的短期材料进行排序和暂存 | 否               |
| 深层 | 对持久候选项进行评分并提升     | 是 (`MEMORY.md`) |
| REM  | 反思主题和反复出现的想法       | 否               |

这些阶段是内部实现细节，不是单独的用户配置
“模式”。

### 浅层阶段

浅层阶段摄取最近的每日记忆信号和召回记录，对其进行去重，
并暂存候选项行。

- 从短期召回状态和最近的每日记忆文件中读取。
- 当存储包含内联输出时，写入受管理的 `## Light Sleep` 块。
- 记录强化信号以供后续深度排名使用。
- 从不写入 `MEMORY.md`。

### 深层阶段

深层阶段决定什么成为长期记忆。

- 使用加权评分和阈值门对候选项进行排名。
- 需要 `minScore`、`minRecallCount` 和 `minUniqueQueries` 通过。
- 在写入之前从实时每日文件中重新提取片段，因此会跳过陈旧/已删除的片段。
- 将提升的条目追加到 `MEMORY.md`。
- 将 `## Deep Sleep` 摘要写入 `DREAMS.md` 并可选择写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

### REM 阶段

REM 相提取模式和反思信号。

- 根据最近的短期痕迹构建主题和反思摘要。
- 当存储包含内联输出时，写入受管理的 `## REM Sleep` 块。
- 记录深度排名使用的 REM 增强信号。
- 从不写入 `MEMORY.md`。

## 梦境日记

Dreaming 还会在 `DREAMS.md` 中保持一份叙述性的 **Dream Diary**。
在每个阶段有足够材料后，`memory-core` 会运行一个尽力而为的后台
子代理轮次（使用默认运行时模型）并追加一条简短的日记条目。

该日记供在 Dreams UI 中进行人工阅读，而非提升来源。

## 深度排名信号

深度排名使用六个加权基础信号加上阶段增强：

| Signal     | 权重 | 描述                              |
| ---------- | ---- | --------------------------------- |
| 频率       | 0.24 | 条目累积了多少短期信号            |
| 相关性     | 0.30 | 该条目的平均检索质量              |
| 查询多样性 | 0.15 | 检索到它的不同查询/每日上下文数量 |
| 近期度     | 0.15 | 时间衰减的新鲜度得分              |
| 巩固       | 0.10 | 多日重复出现的强度                |
| 概念丰富度 | 0.06 | 来自片段/路径的概念标签密度       |

浅层和 REM 阶段的命中会从
`memory/.dreams/phase-signals.json` 增加微小的近期衰减提升。

## 调度

启用后，`memory-core` 会自动管理一个 cron 任务以进行完整的 dream
扫描。每次扫描按顺序运行各阶段：light -> REM -> deep。

默认的节奏行为：

| 设置                 | 默认值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |

## 快速开始

启用 Dreaming：

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

以自定义扫描节奏启用 Dreaming：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## 斜杠命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

使用 CLI 提升功能进行预览或手动应用：

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

手动 `memory promote` 默认使用 deep-phase 阈值，除非被
CLI 标志覆盖。

解释为什么特定的候选者会或不会提升：

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

在不写入任何内容的情况下预览 REM 反思、候选真理和深度提升输出：

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## 关键默认值

所有设置均位于 `plugins.entries.memory-core.config.dreaming` 之下。

| 键          | 默认值      |
| ----------- | ----------- |
| `enabled`   | `false`     |
| `frequency` | `0 3 * * *` |

阶段策略、阈值和存储行为属于内部实现细节（而非面向用户的配置）。

有关完整的键列表，请参阅 [Memory configuration reference](/en/reference/memory-config#dreaming-experimental)。

## Dreams UI

启用后，Gateway(网关) 中的 **Dreams** 标签页会显示：

- 当前 dreaming 启用状态
- 阶段级状态和托管扫描状态
- 短期、长期和今日提升计数
- 下一次计划运行时间
- 一个可展开的 Dream Diary 阅读器，由 `doctor.memory.dreamDiary` 支持

## 相关

- [Memory](/en/concepts/memory)
- [Memory Search](/en/concepts/memory-search)
- [memory CLI](/en/cli/memory)
- [Memory configuration reference](/en/reference/memory-config)
