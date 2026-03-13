---
summary: "菜单栏状态逻辑及向用户展示的内容"
read_when:
  - Tweaking mac menu UI or status logic
title: "菜单栏"
---

# 菜单栏状态逻辑

## 显示内容

- 我们在菜单栏图标和菜单的第一状态行中显示当前的代理工作状态。
- 当工作处于活动状态时，健康状态会被隐藏；当所有会话处于空闲状态时，它会重新显示。
- 菜单中的“节点”区块仅列出**设备**（通过 `node.list` 配对的节点），不包括客户端/在线条目。
- 当提供商使用情况快照可用时，“使用情况”部分会显示在 Context 下方。

## 状态模型

- 会话：事件随 `runId`（每次运行）以及负载中的 `sessionKey` 一起到达。“主”会话是键 `main`；如果不存在，我们回退到最近更新的会话。
- 优先级：main 始终优先。如果 main 处于活动状态，则立即显示其状态。如果 main 处于空闲状态，则显示最近处于活动状态的非 main 会话。我们不会在活动期间反复切换；仅在当前会话变为空闲或 main 变为活动状态时才切换。
- 活动类型：
  - `job`：高级命令执行 (`state: started|streaming|done|error`)。
  - `tool`：带有 `toolName` 和 `meta/args` 的 `phase: start|result`。

## IconState 枚举 (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind → 图标

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 默认 → 🛠️

### 视觉映射

- `idle`：正常的小动物。
- `workingMain`：带有图标的徽章，全色调，腿部“工作”动画。
- `workingOther`：带有图标的徽章，柔和色调，无疾跑动画。
- `overridden`：无论活动状态如何，都使用选定的图标/色调。

## 状态行文本（菜单）

- 当工作处于活动状态时：`<Session role> · <activity label>`
  - 示例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件摄入

- 来源：控制通道 `agent` 事件 (`ControlChannel.handleAgentEvent`)。
- 解析字段：
  - 带有 `data.state` 的 `stream: "job"` 用于开始/停止。
  - 带有 `data.phase`、`name` 以及可选 `meta`/`args` 的 `stream: "tool"`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：缩短的路径。
  - `edit`：路径加上从 `meta`/diff counts 推断出的更改种类。
  - 回退：工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ “图标覆盖” 选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具种类）
  - `Working: other`（按工具种类）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- 触发主会话任务：验证图标立即切换，且状态行显示主标签。
- 在主会话空闲时触发非主会话任务：图标/状态显示非主会话；保持稳定直到完成。
- 在其他活动会话进行时启动主会话：图标立即翻转为主会话。
- 快速工具爆发：确保徽章不会闪烁（工具结果上的 TTL 宽限）。
- 当所有会话空闲时，健康行重新出现。

import zh from '/components/footer/zh.mdx';

<zh />
