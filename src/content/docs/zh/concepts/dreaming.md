---
summary: "包含浅度、深度和快速眼动（REM）阶段以及梦境日记的后台记忆巩固系统"
title: "梦境（Dreaming）"
sidebarTitle: "梦境（Dreaming）"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Dreaming 是 `memory-core` 中的后台记忆巩固系统。它帮助 OpenClaw 将强烈的短期信号转化为持久记忆，同时保持过程的可解释性和可审查性。

<Note>Dreaming 是**选择性加入（opt-in）**的，默认情况下处于禁用状态。</Note>

## Dreaming 写入的内容

Dreaming 保留两种输出：

- `memory/.dreams/` 中的**机器状态**（回忆存储、阶段信号、摄取检查点、锁）。
- `DREAMS.md`（或现有的 `dreams.md`）中的**人类可读输出**，以及 `memory/dreaming/<phase>/YYYY-MM-DD.md` 下的可选阶段报告文件。

长期提升仍然只写入 `MEMORY.md`。

## 阶段模型

Dreaming 使用三个协作阶段：

| 阶段 | 目的                           | 持久写入          |
| ---- | ------------------------------ | ----------------- |
| 浅层 | 对最近的短期材料进行排序和暂存 | 否                |
| 深层 | 对持久候选项进行评分并提升     | 是（`MEMORY.md`） |
| REM  | 反思主题和反复出现的想法       | 否                |

这些阶段是内部实现细节，不是单独的用户配置“模式”。

<AccordionGroup>
  <Accordion title="浅度阶段">
    浅度阶段摄取近期的日常记忆信号和回忆痕迹，对其进行去重，并暂存候选行。

    - 从短期回忆状态、最近的日常记忆文件和可用的编辑过的会话转录中读取。
    - 当存储包含内联输出时，写入托管 `## Light Sleep` 块。
    - 记录强化信号以供后续深度排名。
    - 永不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="深度阶段">
    深度阶段决定什么成为长期记忆。

    - 使用加权评分和阈值门限对候选进行排名。
    - 要求 `minScore`、`minRecallCount` 和 `minUniqueQueries` 均通过。
    - 在写入之前从实时日常文件中重新提取片段，因此会跳过过时/已删除的片段。
    - 将提升的条目追加到 `MEMORY.md`。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md` 并可选地写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM 阶段">
    REM 阶段提取模式和反思信号。

    - 根据最近的短期痕迹构建主题和反思摘要。
    - 当存储包含内联输出时，写入受管理的 `## REM Sleep` 块。
    - 记录深度排名使用的 REM 强化信号。
    - 绝不写入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## 会话记录摄取

Dreaming 可以将经过编辑的会话记录摄取到 dreaming 语料库中。当记录可用时，它们将与每日记忆信号和回忆痕迹一起被输入到轻度阶段中。个人和敏感内容在摄取前会被编辑。

## 梦境日记

Dreaming 还会在 `DREAMS.md` 中保存叙事性的 **Dream Diary**（梦境日记）。在每个阶段有足够材料后，`memory-core` 会运行一个尽力而为的后台子代理轮次，并追加一条简短的日记条目。除非配置了 `dreaming.model`，否则它使用默认运行时模型。如果配置的模型不可用，Dream Diary 会使用会话默认模型重试一次。

<Note>此日记仅供在 Dreams UI 中供人类阅读，并非提升来源。Dreaming 生成的日记/报告构件被排除在短期提升之外。只有基于事实的记忆片段才有资格提升到 `MEMORY.md`。</Note>

还有一个基于事实的历史回填通道，用于审查和恢复工作：

<AccordionGroup>
  <Accordion title="Backfill commands">
    - `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的基于事实的日记输出。
    - `memory rem-backfill --path ...` 将可逆的基于事实的日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 将基于事实的持久候选项暂存到正常深度阶段已使用的同一个短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 移除那些暂存的回填产物，而不影响普通日记条目或实时短期回溯。

  </Accordion>
</AccordionGroup>

控制 UI 暴露了相同的日记回填/重置流程，以便您在确定基于事实的候选项是否值得提升之前，可以在梦境场景中检查结果。该场景还显示了一个独特的基于事实的通道，因此您可以查看哪些暂存的短期条目来自历史回放，哪些已提升的项目是基于事实主导的，并且可以仅清除基于事实的暂存条目，而无需影响普通的实时短期状态。

## 深度排名信号

深度排名使用六个加权基础信号加上阶段强化：

| Signal     | 权重 | 描述                        |
| ---------- | ---- | --------------------------- |
| 频率       | 0.24 | 该条目累积的短期信号数量    |
| 相关性     | 0.30 | 该条目的平均检索质量        |
| 查询多样性 | 0.15 | 显示它的不同查询/每日上下文 |
| 最近性     | 0.15 | 时间衰减的新鲜度分数        |
| 巩固       | 0.10 | 多日重复强度                |
| 概念丰富度 | 0.06 | 来自片段/路径的概念标签密度 |

浅睡和 REM 阶段的命中会从 `memory/.dreams/phase-signals.json` 增加少量的时间衰减增益。

## 调度

启用后，`memory-core` 会自动管理一个 cron 作业以进行完整的梦境扫描。每次扫描按顺序运行各个阶段：浅睡 → REM → 深睡。

扫描范围包括主要运行时工作区和任何已配置的代理工作区，并按路径去重，因此子代理工作区的扇出不会排除主代理的 `DREAMS.md` 和记忆状态。

默认节奏行为：

| 设置                 | 默认值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |
| `dreaming.model`     | 默认模型    |

## 快速开始

<Tabs>
  <Tab title="Enable dreaming">
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
  </Tab>
  <Tab title="Custom sweep cadence">
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
  </Tab>
</Tabs>

## 斜杠命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

<Tabs>
  <Tab title="Promotion preview / apply">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    手动 `memory promote` 默认使用深度阶段阈值，除非被 CLI 标志覆盖。

  </Tab>
  <Tab title="Explain promotion">
    解释特定候选项为何会或不会提升：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM harness preview">
    预览 REM 反思、候选真理以及深度提升输出，且不进行任何写入：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 关键默认值

所有设置均位于 `plugins.entries.memory-core.config.dreaming` 之下。

<ParamField path="enabled" type="boolean" default="false">
  启用或禁用 dreaming 扫描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整 dreaming 扫描的 Cron 频率。
</ParamField>
<ParamField path="model" type="string">
  可选的 Dream Diary 子代理模型覆盖。在同时设置子代理 `allowedModels` 白名单时，使用规范的 `provider/model` 值。
</ParamField>

<Warning>`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。若要限制它，还需设置 `plugins.entries.memory-core.subagent.allowedModels`。信任或白名单失败将保持可见，而不是静默回退；重试仅覆盖模型不可用错误。</Warning>

<Note>阶段策略、阈值和存储行为是内部实现细节（非面向用户的配置）。完整键列表请参阅 [Memory configuration reference](/zh/reference/memory-config#dreaming)。</Note>

## Dreams UI

启用后，Gateway(网关) **Dreams** 标签页将显示：

- 当前 dreaming 启用状态
- 阶段级状态和托管扫描的存在情况
- 短期、落地、信号和今日提升计数
- 下次计划运行时间
- 用于暂存历史回放条目的独立落地 Scene 通道
- 由 `doctor.memory.dreamDiary` 支持的可扩展 Dream Diary 阅读器

## Dreaming 从未运行：状态显示为受阻

如果 `openclaw memory status` 报告 `Dreaming status: blocked`，则存在托管 cron 但默认代理心跳未触发。请检查默认代理是否启用心跳，且其目标不是 `none`，然后在下一个心跳间隔后再次运行 `openclaw memory status --deep`。

## 相关

- [Memory](/zh/concepts/memory)
- [Memory CLI](/zh/cli/memory)
- [Memory 配置参考](/zh/reference/memory-config)
- [Memory 搜索](/zh/concepts/memory-search)
