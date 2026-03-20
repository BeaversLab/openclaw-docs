---
summary: "研究笔记：Clawd 工作空间的离线记忆系统（Markdown 源真理 + 派生索引）"
read_when:
  - 设计超越每日 Markdown 日志的工作空间记忆 (~/.openclaw/workspace)
  - 决策：独立 CLI vs 深度 OpenClaw 集成
  - 添加离线回忆 + 反思（保留/回忆/反思）
title: "Workspace Memory Research"
---

# Workspace Memory v2（离线）：研究笔记

目标：Clawd 风格的工作空间 (`agents.defaults.workspace`, 默认 `~/.openclaw/workspace`)，其中“记忆”每天存储为一个 Markdown 文件 (`memory/YYYY-MM-DD.md`) 以及少量稳定文件 (例如 `memory.md`, `SOUL.md`)。

本文档提出了一种**离线优先** 的记忆架构，该架构将 Markdown 保留为规范的、可审查的源真理，但通过派生索引添加**结构化回忆**（搜索、实体摘要、置信度更新）。

## 为什么要改变？

当前的设置（每天一个文件）非常适合：

- “仅追加” 日志记录
- 人工编辑
- git 支持的持久性 + 可审计性
- 低摩擦捕获（“直接记下来”）

其弱点在于：

- 高召回检索（“我们就 X 做了什么决定？”，“上次我们尝试 Y 的情况？”）
- 以实体为中心的答案（“告诉我关于 Alice / The Castle / warelay 的情况”）而无需重读许多文件
- 观点/偏好的稳定性（以及发生变化时的证据）
- 时间约束（“2025 年 11 月期间什么是真实的？”）和冲突解决

## 设计目标

- **离线**：无需网络即可工作；可在笔记本电脑/Castle 上运行；无云依赖。
- **可解释**：检索到的项目应可归因（文件 + 位置）并与推断分离。
- **低仪式感**：日常日志保持 Markdown 格式，无需繁重的模式工作。
- **增量**：v1 仅使用 FTS 即有用；语义/向量和图是可选升级。
- **对代理友好**：使“在 token 预算内的回忆”变得容易（返回小的事实束）。

## 北极星模型 (Hindsight × Letta)

要融合的两个部分：

1. **Letta/MemGPT 风格的控制循环**

- 在上下文中始终保持一个小的“核心”（人设 + 关键用户事实）
- 其他所有内容都在上下文之外，并通过工具检索
- 记忆写入是显式的工具调用（追加/替换/插入），持久化，然后在下一轮重新注入

2. **Hindsight 风格的记忆基板**

- 将观察到的事物、相信的事物和总结的事物区分开来
- 支持保留/检索/反思
- 带有置信度的观点，可随证据演变
- 实体感知检索 + 时间查询（即使没有完整知识图谱）

## 提议的架构（Markdown 单一事实来源 + 派生索引）

### 规范存储（git 友好）

将 `~/.openclaw/workspace` 作为规范的人类可读记忆保留。

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

- **每日日志保持为每日日志**。无需将其转换为 JSON。
- `bank/` 文件是经过**策展**的，由反思任务生成，但仍可手动编辑。
- `memory.md` 保持“小而核心”：即您希望 Clawd 在每次会话中看到的内容。

### 派生存储（机器检索）

在工作区下添加派生索引（不一定由 git 跟踪）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

支持方式：

- 用于事实 + 实体链接 + 观点元数据的 SQLite 架构
- 用于词汇检索的 SQLite **FTS5**（快速、轻量、离线）
- 用于语义检索的可选嵌入表（仍为离线）

索引始终**可从 Markdown 重建**。

## 保留 / 检索 / 反思（操作循环）

### 保留：将每日日志标准化为“事实”

Hindsight 此处的一个关键见解：存储**叙事性的、自包含的事实**，而不是微小的片段。

针对 `memory/YYYY-MM-DD.md` 的实用规则：

- 在一天结束时（或期间），添加一个 `## Retain` 部分，其中包含 2-5 个要点，要求如下：
  - 叙事性（保留跨轮上下文）
  - 自包含（独立存在，稍后仍有意义）
  - 标记了类型和实体提及

示例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (&lt;1500 chars) on WhatsApp; long content goes into files.
```

最小化解析：

- 类型前缀：`W`（世界）、`B`（经历/传记）、`O`（观点）、`S`（观察/摘要；通常生成）
- 实体：`@Peter`、`@warelay` 等（slug 映射到 `bank/entities/*.md`）
- 观点置信度：`O(c=0.0..1.0)` 可选

如果您不想让作者为此操心：reflect 任务可以从日志的其余部分推断这些要点，但拥有一个明确的 `## Retain` 部分是最简单的“质量调节手段”。

### 召回：对派生索引的查询

召回应支持：

- **词法**：“查找确切的术语 / 名称 / 命令”（FTS5）
- **实体**：“告诉我关于 X 的情况”（实体页面 + 实体关联的事实）
- **时间**：“11 月 27 日左右发生了什么” / “自上周以来”
- **观点**：“Peter 更喜欢什么？”（附带置信度 + 证据）

返回格式应适合智能体并引用来源：

- `kind` (`world|experience|opinion|observation`)
- `timestamp` (来源日期，或存在时提取的时间范围)
- `entities` (`["Peter","warelay"]`)
- `content` (叙述性事实)
- `source` (`memory/2025-11-27.md#L12` 等)

### 反思：生成稳定页面 + 更新信念

反思是一项计划任务（每日或心跳 `ultrathink`)，用于：

- 根据近期事实更新 `bank/entities/*.md`（实体摘要）
- 根据强化/矛盾更新 `bank/opinions.md` 置信度
- 可选择性地提议编辑 `memory.md`（“核心类”持久事实）

观点演变（简单、可解释）：

- 每个观点包含：
  - 陈述
  - 置信度 `c ∈ [0,1]`
  - last_updated
  - 证据链接（支持 + 矛盾的事实 ID）
- 当新事实到达时：
  - 通过实体重叠 + 相似性查找候选观点（先是 FTS，后是嵌入）
  - 通过较小的增量更新置信度；大幅跳跃需要强烈的矛盾 + 重复的证据

## CLI 集成：独立集成与深度集成

建议：**在 OpenClaw 中深度集成**，但保持核心库可分离。

### 为什么要集成到 OpenClaw？

- OpenClaw 已经知道：
  - 工作区路径 (`agents.defaults.workspace`)
  - 会话模型 + 心跳
  - 日志记录 + 故障排除模式
- 您希望智能体本身调用工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 为什么还要拆分出一个库？

- 保持内存逻辑可在没有网关/运行时的情况下进行测试
- 在其他上下文中复用（本地脚本、未来的桌面应用等）

形态：
内存工具旨在作为一个小型 CLI + 库层，但这仅是探索性的。

## “S-Collide” / SuCo：何时使用它（研究）

如果 “S-Collide” 指的是 **SuCo (Subspace Collision)**：这是一种 ANN 检索方法，通过在子空间中使用学习/结构化碰撞来针对强大的召回率/延迟权衡（论文：arXiv 2411.14754, 2024）。

针对 `~/.openclaw/workspace` 的务实看法：

- **不要**从 SuCo 开始。
- 从 SQLite FTS + （可选的）简单嵌入开始；你会立即获得大部分用户体验收益。
- 仅在以下情况考虑 SuCo/HNSW/ScaNN 类解决方案：
  - 语料库很大（数万/数十万个块）
  - 暴力嵌入搜索变得太慢
  - 召回质量受到词汇搜索的严重瓶颈

离线友好的替代方案（按复杂性递增）：

- SQLite FTS5 + 元数据过滤器（零机器学习）
- 嵌入 + 暴力力（如果块数量少，效果惊人地好）
- HNSW 索引（常见、稳健；需要库绑定）
- SuCo（研究级；如果有可以嵌入的可靠实现，则很有吸引力）

未解决的问题：

- 在你的机器（笔记本电脑 + 台式机）上，“个人助手内存”的**最佳**离线嵌入模型是什么？
  - 如果你已经有了 Ollama：使用本地模型进行嵌入；否则在工具链中附带一个小的嵌入模型。

## 最小可用试点

如果你想要一个最小但仍可用的版本：

- 添加 `bank/` 实体页面和 `## Retain` 部分在每日日志中。
- 使用 SQLite FTS 进行带引用（路径 + 行号）的召回。
- 仅当召回质量或规模需要时才添加嵌入。

## 参考文献

- Letta / MemGPT 概念：“核心内存块” + “归档内存” + 工具驱动的自编辑内存。
- Hindsight 技术报告：“保留 / 召回 / 反思”，四网络内存，叙事事实提取，观点信心演变。
- SuCo：arXiv 2411.14754 (2024)：“子空间碰撞”近似最近邻检索。

import en from "/components/footer/en.mdx";

<en />
