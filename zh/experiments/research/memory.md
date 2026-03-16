---
summary: "研究笔记：用于 Clawd 工作空间的离线记忆系统（Markdown 源真相 + 衍生索引）"
read_when:
  - Designing workspace memory (~/.openclaw/workspace) beyond daily Markdown logs
  - Deciding: standalone CLI vs deep OpenClaw integration
  - Adding offline recall + reflection (retain/recall/reflect)
title: "工作空间记忆研究"
---

# 工作空间记忆 v2（离线）：研究笔记

目标：Clawd 风格的工作空间 (`agents.defaults.workspace`，默认 `~/.openclaw/workspace`)，其中“记忆”存储为每天一个 Markdown 文件 (`memory/YYYY-MM-DD.md`) 加上一小组稳定文件（例如 `memory.md`，`SOUL.md`）。

本文档提出了一种 **离线优先** 的记忆架构，将 Markdown 保留为规范的、可审查的真实来源，但通过派生索引添加 **结构化召回**（搜索、实体摘要、置信度更新）。

## 为什么要改变？

当前的设置（每天一个文件）非常适合：

- “仅追加”日记
- 人工编辑
- git 支持的持久性和可审计性
- 低摩擦捕获（“直接写下来”）

它的弱点在于：

- 高召回检索（“关于 X 我们决定了什么？”，“上次我们尝试 Y 是什么时候？”）
- 以实体为中心的答案（“告诉我关于 Alice / The Castle / warelay 的情况”），而无需重读许多文件
- 意见/偏好稳定性（以及变化时的证据）
- 时间约束（“2025 年 11 月期间什么是真的？”）和冲突解决

## 设计目标

- **离线**：无需网络即可工作；可以在笔记本电脑/Castle 上运行；不依赖云服务。
- **可解释**：检索到的项目应可归因（文件 + 位置）并与推理分离。
- **低仪式感**：每日记录保持为 Markdown，无需繁重的模式工作。
- **增量式**：v1 仅使用 FTS 就有用；语义/向量和图是可选升级。
- **对代理友好**：使“在 token 预算内召回”变得容易（返回小捆的事实）。

## 北极星模型 (Hindsight × Letta)

结合两个部分：

1. **Letta/MemGPT 风格的控制循环**

- 在上下文中始终保持一个小的“核心”（人设 + 关键用户事实）
- 其他所有内容都在上下文之外，并通过工具检索
- 内存写入是显式工具调用（追加/替换/插入），持久化，然后在下一轮重新注入

2. **Hindsight 风格的记忆基底**

- 区分观察到的事物、相信的事物以及总结的事物
- 支持保留/回想/反思
- 带有置信度的观点，可随证据演变
- 感知实体的检索 + 时序查询（即使没有完整的知识图谱）

## 建议的架构（Markdown 源数据 + 派生索引）

### 规范存储（git 友好）

将 `~/.openclaw/workspace` 保持为可人工阅读的标准记忆。

建议的工作区布局：

```
~/.openclaw/workspace/
  memory.md                    # small: durable facts + preferences (core-ish)
  memory/
    YYYY-MM-DD.md              # daily log (append; narrative)
  bank/                        # “typed” memory pages (stable, reviewable)
    world.md                   # objective facts about the world
    experience.md              # what the agent did (first-person)
    opinions.md                # subjective prefs/judgments + confidence + evidence pointers
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

备注：

- **日志仍是日志**。无需将其转换为 JSON。
- `bank/` 文件经过**策展**，由反思任务生成，但仍可手动编辑。
- `memory.md` 保持“小而核心”：那些你希望 Clawd 在每次会话中都能看到的内容。

### 派生存储（机器回想）

在工作区下添加一个派生索引（不一定由 git 跟踪）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

支持：

- 用于事实、实体链接和观点元数据的 SQLite 架构
- 用于词汇回想的 SQLite **FTS5**（快速、小巧、离线）
- 用于语义回想的可选嵌入表（仍为离线）

索引始终可以**从 Markdown 重建**。

## 保留 / 回想 / 反思（操作循环）

### 保留：将日志标准化为“事实”

Hindsight 此处适用的关键见解：存储**叙事性的、自包含的事实**，而不是微小的片段。

`memory/YYYY-MM-DD.md` 的实际规则：

- 在一天结束时（或期间），添加一个 `## Retain` 部分，包含 2–5 个要点，这些要点需：
  - 叙述（保留跨轮次上下文）
  - 自包含（独立的内容在以后才有意义）
  - 带有类型和实体提及的标签

示例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最小化解析：

- 类型前缀：`W`（世界），`B`（经历/传记），`O`（观点），`S`（观察/总结；通常生成）
- 实体：`@Peter`，`@warelay` 等（slug 映射到 `bank/entities/*.md`）
- 观点置信度：`O(c=0.0..1.0)` 可选

如果你不希望作者考虑这一点：reflect 任务可以从日志的其余部分推断这些要点，但拥有一个显式的 `## Retain` 部分是最简单的“质量杠杆”。

### 召回：对派生索引的查询

召回应支持：

- **词法**：“查找精确的术语 / 名称 / 命令”（FTS5）
- **实体**：“告诉我关于 X 的事情”（实体页面 + 实体关联的事实）
- **时间**：“11月27日左右发生了什么” / “自上周以来”
- **观点**：“Peter 更喜欢什么？”（附置信度 + 证据）

返回格式应该对代理友好并引用来源：

- `kind`（`world|experience|opinion|observation`）
- `timestamp`（来源日期，如果存在则是提取的时间范围）
- `entities`（`["Peter","warelay"]`）
- `content`（叙述性事实）
- `source`（`memory/2025-11-27.md#L12` 等）

### 反思：生成稳定页面 + 更新信念

反思是一个计划任务（每天或心跳 `ultrathink`），用于：

- 根据最新事实更新 `bank/entities/*.md`（实体摘要）
- 根据强化/矛盾更新 `bank/opinions.md` 置信度
- 可选建议对 `memory.md` 的编辑（“核心类”持久事实）

观点演变（简单，可解释）：

- 每个观点都有：
  - 陈述
  - 置信度 `c ∈ [0,1]`
  - last_updated
  - 证据链接（支持 + 反驳的事实 ID）
- 当新事实到达时：
  - 通过实体重叠 + 相似性（先是 FTS，然后是嵌入）查找候选观点
  - 通过小的增量更新置信度；大幅跃升需要强烈的矛盾 + 重复的证据

## CLI 集成：独立集成与深度集成

建议：与 OpenClaw 深度集成，但保持核心库可分离。

### 为什么要集成到 OpenClaw 中？

- OpenClaw 已经知道：
  - 工作区路径 (`agents.defaults.workspace`)
  - 会话模型 + 心跳
  - 日志记录 + 故障排除模式
- 你希望代理本身调用工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 为什么仍然要拆分出一个库？

- 保持内存逻辑在没有网关/运行时的情况下可测试
- 从其他上下文（本地脚本、未来的桌面应用程序等）重用

形态：
记忆工具旨在作为一个小型 CLI + 库层，但这仅用于探索。

## “S-Collide” / SuCo：何时使用它（研究）

如果 “S-Collide” 指的是 **SuCo (Subspace Collision)**：它是一种 ANN 检索方法，通过在子空间中使用学习/结构化碰撞来针对强大的召回/延迟权衡（论文：arXiv 2411.14754，2024）。

针对 `~/.openclaw/workspace` 的务实看法：

- **不要**从 SuCo 开始。
- 从 SQLite FTS + （可选）简单嵌入开始；你将立即获得大部分用户体验收益。
- 仅在以下情况考虑 SuCo/HNSW/ScaNN 类解决方案：
  - 语料库很大（数万/数十万个块）
  - 暴力嵌入搜索变得太慢
  - 召回质量明显受到词汇搜索的瓶颈限制

离线友好的替代方案（按复杂度递增）：

- SQLite FTS5 + 元数据过滤器（零机器学习）
- 嵌入 + 暴力搜索（如果块数量少，效果出奇地好）
- HNSW 索引（常见，稳健；需要库绑定）
- SuCo（研究级；如果有可以嵌入的可靠实现，则很有吸引力）

未解决的问题：

- 在你的机器（笔记本电脑 + 台式机）上，用于“个人助手记忆”的**最佳**离线嵌入模型是什么？
  - 如果您已经拥有 Ollama：使用本地模型进行嵌入；否则在工具链中附带一个小型的嵌入模型。

## 最小的有用试点

如果你想要一个最小化但仍可用的版本：

- 添加 `bank/` 实体页面和每日日志中的 `## Retain` 部分。
- 使用 SQLite FTS 进行带引用（路径 + 行号）的召回。
- 仅当召回质量或规模需要时才添加嵌入。

## 参考资料

- Letta / MemGPT 概念：“核心内存块”+“归档内存”+ 工具驱动的自编辑内存。
- Hindsight 技术报告：“保留 / 召回 / 反思”，四网络记忆，叙事事实提取，观点置信度演变。
- SuCo：arXiv 2411.14754 (2024)：“子空间碰撞”近似最近邻检索。

import zh from "/components/footer/zh.mdx";

<zh />
