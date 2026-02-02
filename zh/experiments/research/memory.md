---
summary: "研究笔记：Clawd 工作区的离线 memory 系统（Markdown 事实来源 + 派生索引）"
read_when:
  - 设计超出每日 Markdown 日志的工作区 memory（~/.openclaw/workspace）
  - 决定：独立 CLI 还是深度集成 OpenClaw
  - 增加离线 recall + reflect（retain/recall/reflect）
title: "Workspace Memory Research"
---

# Workspace Memory v2（离线）：研究笔记

目标：Clawd 风格工作区（`agents.defaults.workspace`，默认 `~/.openclaw/workspace`），将“memory”存为按日 Markdown 文件（`memory/YYYY-MM-DD.md`）+ 少量稳定文件（如 `memory.md`、`SOUL.md`）。

本文提出**离线优先**的 memory 架构：Markdown 仍是可审阅的事实来源，但通过派生索引提供**结构化 recall**（搜索、实体摘要、置信度更新）。

## 为什么要改？

现有方案（每天一个文件）擅长：
- “只追加”日志
- 人工编辑
- git 支撑的持久性 + 可审计
- 低摩擦捕获（“直接写下来”）

但薄弱点：
- 高召回检索（“我们对 X 的结论是什么？”、“上次尝试 Y 是何时？”）
- 实体中心问答（“说说 Alice / The Castle / warelay”）而无需翻许多文件
- 观点/偏好的稳定性（及其变化的证据）
- 时间约束（“2025 年 11 月时哪些为真？”）与冲突消解

## 设计目标

- **离线**：无网络即可运行；可在 laptop/Castle 上运行；无云依赖。
- **可解释**：检索项可归因（文件 + 位置），推断与事实分离。
- **低仪式感**：日常记录仍是 Markdown，不引入重 schema。
- **可增量**：v1 仅 FTS 也有价值；向量/图谱为可选升级。
- **Agent 友好**：便于“在 token 预算内 recall”（返回小包事实）。

## 北极星模型（Hindsight × Letta）

融合两部分：

1) **Letta/MemGPT 风格控制循环**
- 保持一个小“核心”始终在上下文（persona + 关键用户事实）
- 其他内容在上下文外，通过工具检索
- 记忆写入是显式工具调用（append/replace/insert），持久化后再注入下一回合

2) **Hindsight 风格 memory 基座**
- 区分观察、信念与摘要
- 支持 retain/recall/reflect
- 观点带置信度，可随证据演化
- 实体感知检索 + 时间查询（即使没有完整图谱）

## 架构提议（Markdown 事实来源 + 派生索引）

### 规范存储（git 友好）

保持 `~/.openclaw/workspace` 为人类可读的记忆主仓。

建议布局：

```
~/.openclaw/workspace/
  memory.md                    # 小而核心：持久事实 + 偏好
  memory/
    YYYY-MM-DD.md              # 每日日志（追加；叙事）
  bank/                        # “类型化”记忆页（稳定、可审阅）
    world.md                   # 客观世界事实
    experience.md              # agent 做过的事（第一人称）
    opinions.md                # 主观偏好/判断 + 置信度 + 证据指针
    entities/
      Peter.md
      The-Castle.md
      warelay.md
      ...
```

注：
- **每日日志仍是每日日志**，不必改成 JSON。
- `bank/` 文件为**整理产物**，由反思任务生成，仍可手工编辑。
- `memory.md` 保持“小而核心”：希望 Clawd 每次会话都看到的内容。

### 派生存储（机器 recall）

在工作区添加派生索引（不一定纳入 git）：

```
~/.openclaw/workspace/.memory/index.sqlite
```

使用：
- SQLite schema 存事实 + 实体链接 + 观点元数据
- SQLite **FTS5** 提供词法检索（快、小、离线）
- 可选 embeddings 表用于语义检索（仍离线）

索引始终**可从 Markdown 重建**。

## Retain / Recall / Reflect（运行循环）

### Retain：将每日日志规范为“事实”

Hindsight 的关键洞见：存储**叙事、可自洽的事实**，而不是细碎片段。

对 `memory/YYYY-MM-DD.md` 的实用规则：
- 每日结束（或过程中）添加 `## Retain` 小节，包含 2–5 条：
  - 叙事化（保留跨回合上下文）
  - 自包含（单独拿出来也讲得通）
  - 带类型 + 实体标注

示例：

```
## Retain
- W @Peter: Currently in Marrakech (Nov 27–Dec 1, 2025) for Andy’s birthday.
- B @warelay: I fixed the Baileys WS crash by wrapping connection.update handlers in try/catch (see memory/2025-11-27.md).
- O(c=0.95) @Peter: Prefers concise replies (<1500 chars) on WhatsApp; long content goes into files.
```

最小解析：
- 类型前缀：`W`（world）、`B`（experience/biographical）、`O`（opinion）、`S`（observation/summary；通常生成）
- 实体：`@Peter`、`@warelay` 等（slug 映射到 `bank/entities/*.md`）
- 观点置信度：`O(c=0.0..1.0)` 可选

若不想让作者思考：reflect 任务可从其他日志推断，但显式 `## Retain` 是最简单的质量杠杆。

### Recall：基于派生索引的查询

Recall 应支持：
- **词法**：精确词/名称/命令（FTS5）
- **实体**：“告诉我 X”（实体页 + 实体关联事实）
- **时间**：“11 月 27 日左右发生了什么”/“最近一周”
- **观点**：“Peter 的偏好是什么”（带置信度 + 证据）

返回应对 agent 友好且可溯源：
- `kind`（`world|experience|opinion|observation`）
- `timestamp`（来源日期或抽取时间范围）
- `entities`（`["Peter","warelay"]`）
- `content`（叙事事实）
- `source`（`memory/2025-11-27.md#L12` 等）

### Reflect：生成稳定页面 + 更新信念

反思是定时任务（每日或 heartbeat `ultrathink`）：
- 用近期事实更新 `bank/entities/*.md`（实体摘要）
- 基于强化/反证更新 `bank/opinions.md` 的置信度
- 可选：向 `memory.md` 提议编辑（“核心事实”）

观点演化（简单可解释）：
- 每条观点包含：
  - statement
  - 置信度 `c ∈ [0,1]`
  - last_updated
  - 证据链接（支持/反对的 fact IDs）
- 新事实到来：
  - 按实体重叠 + 相似性找候选观点（先 FTS，后 embeddings）
  - 用小步长调整置信度；大幅变化需强反证 + 重复证据

## CLI 集成：独立 vs 深度集成

建议：**深度集成到 OpenClaw**，但保留可分离核心库。

### 为什么集成进 OpenClaw？
- OpenClaw 已知：
  - workspace 路径（`agents.defaults.workspace`）
  - 会话模型 + heartbeats
  - 日志 + 排障习惯
- 希望 agent 直接调用工具：
  - `openclaw memory recall "…" --k 25 --since 30d`
  - `openclaw memory reflect --since 7d`

### 为什么仍要拆库？
- 让 memory 逻辑可在无 gateway/runtime 下测试
- 可复用到其他场景（本地脚本、未来桌面应用等）

形态：
Memory 工具定位为小型 CLI + 库层，但目前仅为探索。

## “S-Collide” / SuCo：何时使用（研究）

如果 “S-Collide” 指 **SuCo (Subspace Collision)**：它是一种 ANN 检索方法，通过子空间碰撞实现较强的召回/延迟权衡（论文：arXiv 2411.14754, 2024）。

对 `~/.openclaw/workspace` 的务实结论：
- **不要一开始就用 SuCo**。
- 先用 SQLite FTS +（可选）简单 embeddings；立刻获得大部分 UX 提升。
- 只有在以下条件满足时再考虑 SuCo/HNSW/ScaNN 类方案：
  - 语料很大（数万/数十万 chunks）
  - 粗暴的 embedding 搜索太慢
  - 词法检索成为明显瓶颈

离线友好替代（复杂度递增）：
- SQLite FTS5 + 元数据过滤（零 ML）
- Embeddings + 全量扫描（chunk 少时惊人有效）
- HNSW 索引（常见、稳健；需要库绑定）
- SuCo（研究级；需可嵌入的稳定实现）

开放问题：
- 在你的机器（laptop + desktop）上，“个人助手 memory”的**最佳**离线 embedding 模型是什么？
  - 若已用 Ollama：用本地模型 embedding；否则在工具链中携带小模型。

## 最小可用试点

如果想要一个最小但有用的版本：

- 添加 `bank/` 实体页与每日日志的 `## Retain`。
- 用 SQLite FTS 做带引用的 recall（路径 + 行号）。
- 仅当召回质量或规模需要时再加 embeddings。

## 参考

- Letta / MemGPT 概念：“core memory blocks” + “archival memory” + 工具驱动自编辑记忆。
- Hindsight Technical Report：retain/recall/reflect、四网络记忆、叙事事实抽取、观点置信度演化。
- SuCo：arXiv 2411.14754 (2024)：Subspace Collision 近似近邻检索。
