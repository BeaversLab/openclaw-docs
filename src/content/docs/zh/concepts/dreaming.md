---
title: "Dreaming"
summary: "包含浅层、深层和 REM 阶段以及梦梦日记的后台记忆巩固系统"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Dreaming

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

- 读取短期召回状态、最近的每日记忆文件，以及在可用时读取经过编辑的会话记录。
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

## 会话记录摄取

Dreaming 可以将经过编辑的会话记录摄取到梦境语料库中。当记录可用时，它们将与每日记忆信号和召回痕迹一起被送入浅层阶段。在摄取之前，个人和敏感内容会被编辑。

## 梦境日记

Dreaming 还会在 `DREAMS.md` 中保留一份叙述性的**梦境日记**。在每个阶段有足够材料后，`memory-core` 会运行一个尽力而为的后台子代理轮次（使用默认运行时模型）并附加一条简短的日记条目。

此日记供人类在 Dreams UI 中阅读，而非提升来源。
Dreaming 生成的日记/报告制品被排除在短期
提升之外。只有基于事实的记忆片段才有资格提升到
`MEMORY.md`。

还有一个基于历史记录的回填通道，用于审查和恢复工作：

- `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的基于事实的日记输出。
- `memory rem-backfill --path ...` 将可逆的基于事实的日记条目写入 `DREAMS.md`。
- `memory rem-backfill --path ... --stage-short-term` 将基于事实的持久候选内容暂存到与普通深度阶段相同的短期证据存储中。
- `memory rem-backfill --rollback` 和 `--rollback-short-term` 移除那些暂存的回填制品，而不会触及普通日记条目或实时的短期召回。

控制 UI 暴露了相同的日记回填/重置流程，以便您可以在决定是否提升基于事实的候选项之前，在 Dreams 场景中检查结果。场景还显示了一个不同的基于事实的通道，以便您可以查看哪些暂存的短期条目来自历史重放，哪些提升的项是由基于事实的引导的，并且仅清除仅基于事实的暂存条目，而不触及普通的实时短期状态。

## 深层排名信号

深层排名使用六个加权的基础信号加上阶段强化：

| Signal     | 权重 | 描述                          |
| ---------- | ---- | ----------------------------- |
| 频率       | 0.24 | 该条目累积的短期信号数量      |
| 相关性     | 0.30 | 该条目的平均检索质量          |
| 查询多样性 | 0.15 | 使其显现的不同查询/每日上下文 |
| 最近性     | 0.15 | 时间衰减的新鲜度评分          |
| 整合       | 0.10 | 多日重复出现的强度            |
| 概念丰富度 | 0.06 | 源自片段/路径的概念标签密度   |

浅层和 REM 阶段的命中会增加一小部分来自
`memory/.dreams/phase-signals.json` 的随时间衰减的提升。

## 调度

启用后，`memory-core` 自动管理一个 cron 作业以执行完整的梦境
扫描。每次扫描按顺序运行各个阶段：浅层 -> REM -> 深层。

默认节奏行为：

| 设置                 | 默认值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |

## 快速开始

启用梦境：

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

启用梦境并自定义扫描节奏：

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

手动 `memory promote` 默认使用深度阶段阈值，除非使用 CLI 标志进行覆盖。

解释特定候选内容为何会或不会提升：

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

预览 REM 反思、候选事实和深度提升输出，而
不写入任何内容：

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

阶段策略、阈值和存储行为属于内部实现
细节（非面向用户的配置）。

有关完整的键列表，请参阅 [Memory configuration reference](/en/reference/memory-config#dreaming)。

## Dreams UI

启用后，Gateway(网关) 的 **Dreams** 选项卡将显示：

- 当前梦境启用状态
- 阶段级别状态和托管扫描状态
- 短期、落地、信号和今日提升计数
- 下次计划运行时间
- 一个独立的落地场景通道，用于暂存的历史重放条目
- 一个由 `doctor.memory.dreamDiary` 支持的可展开的梦境日记阅读器

## 相关

- [Memory](/en/concepts/memory)
- [Memory Search](/en/concepts/memory-search)
- [memory CLI](/en/cli/memory)
- [Memory configuration reference](/en/reference/memory-config)
