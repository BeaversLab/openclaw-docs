---
summary: "包含浅度、深度和快速眼动（REM）阶段以及梦境日记的后台记忆巩固系统"
title: "梦境（Dreaming）"
sidebarTitle: "梦境（Dreaming）"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Dreaming 是 `memory-core` 中的后台记忆巩固系统。它帮助 OpenClaw 将强烈的短期信号转化为持久记忆，同时保持过程可解释和可审查。

<Note>Dreaming 是**选择性加入（opt-in）**的，默认情况下处于禁用状态。</Note>

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

这些阶段是内部实现细节，不是单独的用户配置“模式”。

<AccordionGroup>
  <Accordion title="Light phase">
    Light phase 摄取最近的每日记忆信号和召回轨迹，对其进行去重，并暂存候选行。

    - 从短期召回状态、最近的每日记忆文件以及可用的编辑后会话记录中读取。
    - 当存储包含内联输出时，写入受管的 `## Light Sleep` 块。
    - 记录强化信号以供后续深度排序使用。
    - 从不写入 `MEMORY.md`。

  </Accordion>
  <Accordion title="Deep phase">
    Deep phase 决定什么成为长期记忆。

    - 使用加权评分和阈值门对候选项进行排序。
    - 要求 `minScore`、`minRecallCount` 和 `minUniqueQueries` 通过。
    - 在写入之前从实时每日文件中重新填充片段，因此会跳过过时/已删除的片段。
    - 将提升的条目追加到 `MEMORY.md`。
    - 将 `## Deep Sleep` 摘要写入 `DREAMS.md` 并可选地写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

  </Accordion>
  <Accordion title="REM phase">
    REM phase 提取模式和反思信号。

    - 从最近的短期轨迹中构建主题和反思摘要。
    - 当存储包含内联输出时，写入受管的 `## REM Sleep` 块。
    - 记录深度排序使用的 REM 强化信号。
    - 从不写入 `MEMORY.md`。

  </Accordion>
</AccordionGroup>

## 会话记录摄取

Dreaming 可以将经过编辑的会话记录摄取到 dreaming 语料库中。当记录可用时，它们将与每日记忆信号和回忆痕迹一起被输入到轻度阶段中。个人和敏感内容在摄取前会被编辑。

## 梦境日记

Dreaming 还会在 `DREAMS.md` 中保留叙事性的 **Dream Diary**（梦境日记）。当每个阶段积累了足够的材料后，`memory-core` 会尽力运行后台子代理轮次，并追加一条简短的日记条目。除非配置了 `dreaming.model`，否则它使用默认的运行时模型。如果配置的模型不可用，Dream Diary 将使用会话默认模型重试一次。

<Note>此日记仅供人类在 Dreams UI 中阅读，而非晋升来源。Dreaming 生成的日记/报告构件被排除在短期晋升之外。只有基于事实的记忆片段才有资格晋升到 `MEMORY.md` 中。</Note>

还有一个基于事实的历史回填通道，用于审查和恢复工作：

<AccordionGroup>
  <Accordion title="Backfill commands">
    - `memory rem-harness --path ... --grounded` 预览来自历史 `YYYY-MM-DD.md` 笔记的基于事实的日记输出。
    - `memory rem-backfill --path ...` 将可逆的基于事实的日记条目写入 `DREAMS.md`。
    - `memory rem-backfill --path ... --stage-short-term` 将基于事实的持久化候选暂存到正常深度阶段已使用的同一短期证据存储中。
    - `memory rem-backfill --rollback` 和 `--rollback-short-term` 移除那些暂存的回填构件，而不会触及普通日记条目或实时短期回忆。

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

Light（轻度）和 REM（快速眼动）阶段的命中会从 `memory/.dreams/phase-signals.json` 增加一个基于近期衰减的小幅提升。

影子试验结果可以在任何持久化写入之前作为审查信号叠加在该基础分数之上。有益的试验会给候选者带来微小的有界提升，中性试验使其保持推迟状态，而有害的试验将其标记为在该次评分通过中被拒绝。该信号仍然是仅报告的：它可以改变候选者排序或审查元数据，但不会自行写入 `MEMORY.md` 或提升候选者。

## QA 影子试验报告覆盖范围

QA Lab 包含一个仅报告场景，用于探索未来的梦境影子试验如何在提升之前审查候选记忆。该场景要求代理将基准答案与可以使用候选记忆的答案进行比较，然后撰写一份包含结论、理由和风险标志的本地报告。

此覆盖范围有意限定于 QA。它验证报告产物与 `MEMORY.md` 保持分离，并且代理不会声称候选者已被提升。它不添加生产环境影子试验行为或更改深度阶段提升引擎。

`memory-core` 影子试验运行器为需要稳定产物的代码路径保持相同的仅报告契约。它接受候选者、试验提示、基准结果、候选结果、结论、理由、风险标志和证据引用，然后使用 `promotion action: report-only` 撰写报告。有益结论对应 `promote` 建议，中性结论对应 `defer`，有害结论对应 `reject`；这些建议均不会写入 `MEMORY.md` 或应用深度阶段提升。

## 调度

启用后，`memory-core` 会自动管理一个 cron 作业以进行完整的梦境扫描。每次扫描按顺序运行各阶段：light → REM → deep。

扫描包括主要运行时工作区和任何已配置的代理工作区，并按路径去重，因此子代理工作区的展开不会排除主代理的 `DREAMS.md` 和记忆状态。

默认节奏行为：

| 设置                 | 默认值      |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |
| `dreaming.model`     | 默认模型    |

## 快速开始

<Tabs>
  <Tab title="启用梦境">
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
  <Tab title="自定义扫描周期">
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
  <Tab title="升级预览 / 应用">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    手动 `memory promote` 默认使用深层阶段阈值，除非使用 CLI 标志进行覆盖。

  </Tab>
  <Tab title="解释升级">
    解释特定候选是否会升级及其原因：

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="REM 约束预览">
    预览 REM 反思、候选真理和深层升级输出，而不进行任何写入：

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## 关键默认值

所有设置均位于 `plugins.entries.memory-core.config.dreaming` 下。

<ParamField path="enabled" type="boolean" default="false">
  启用或禁用梦境扫描。
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  完整梦境扫描的 Cron 周期。
</ParamField>
<ParamField path="model" type="string">
  可选的梦境日记子代理模型覆盖。在设置子代理 `allowedModels` 允许列表时，使用规范的 `provider/model` 值。
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  从每个升级到 `MEMORY.md` 的短期回忆片段中保留的最大估计令牌数。排名来源仍然可见。
</ParamField>

<Warning>`dreaming.model` 需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`。要限制它，请同时设置 `plugins.entries.memory-core.subagent.allowedModels`。信任或允许列表失败将保持可见，而不是静默回退；重试仅涵盖模型不可用错误。</Warning>

<Note>大多数阶段策略、阈值和存储行为都是内部实现细节。有关完整的键列表，请参阅 [Memory configuration reference](/zh/reference/memory-config#dreaming)。</Note>

## Dreams UI

启用后，Gateway(网关) 中的 **Dreams** 选项卡会显示：

- 当前 dreaming 启用状态
- 阶段级别状态和 managed-sweep 存在情况
- 短期、grounded、signal 和今日提升的计数
- 下一次计划的运行时间
- 一个用于分段历史重放条目的独立落地场景通道
- 一个由 `doctor.memory.dreamDiary` 支持的可展开梦境日记阅读器

## Dreaming 从未运行：状态显示已阻塞

如果 `openclaw memory status` 报告 `Dreaming status: blocked`，则表示托管的 cron 存在，但默认代理的心跳未触发。检查默认代理是否启用心跳，且其目标不是 `none`，然后在下一个心跳间隔后再次运行 `openclaw memory status --deep`。

## 相关

- [Memory](/zh/concepts/memory)
- [Memory CLI](CLI/en/cli/memory)
- [Memory configuration reference](/zh/reference/memory-config)
- [Memory search](/zh/concepts/memory-search)
