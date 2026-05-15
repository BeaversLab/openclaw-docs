---
summary: "菜单栏状态逻辑及向用户展示的内容"
read_when:
  - Tweaking mac menu UI or status logic
title: "菜单栏"
---

## 显示内容

- 我们在菜单栏图标和菜单的第一状态行中显示当前的代理工作状态。
- 当工作处于活动状态时，健康状态会被隐藏；当所有会话都处于空闲状态时，它会重新显示。
- 根级别的“Context”（上下文）子菜单包含最近的会话，而不是直接在根菜单中展开它们。
- 根菜单中的“Nodes”（节点）块仅列出**设备**（通过 `node.list` 配对的节点），而不列出客户端/在线状态条目。
- 当提供商使用情况快照可用时，根菜单中 Context 下方会出现“Usage”（使用情况）部分，随后在使用成本详情可用时显示这些详情。

## 状态模型

- 会话：事件随 `runId`（每次运行）以及负载中的 `sessionKey` 一起到达。“main”（主）会话是键 `main`；如果不存在，我们会回退到最近更新的会话。
- 优先级：main 始终优先。如果 main 处于活动状态，则立即显示其状态。如果 main 处于空闲状态，则显示最近活动的非 main 会话。我们不会在活动期间反复切换；仅当当前会话变为空闲或 main 变为活动状态时才切换。
- 活动类型：
  - `job`：高级命令执行 (`state: started|streaming|done|error`)。
  - `tool`: 带有 `toolName` 和 `meta/args` 的 `phase: start|result`。

## IconState 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### ActivityKind → 字形

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 默认 → 🛠️

### 视觉映射

- `idle`: 普通生物。
- `workingMain`：带有字形、全色调、腿部“working”（工作）动画的徽章。
- `workingOther`: 带字形的徽章，柔和色调，无疾驰。
- `overridden`: 无论活动如何，均使用选定的字形/色调。

## Context 子菜单

- 根菜单显示一个带有会话计数/状态的“Context”行，并打开一个子菜单。
- Context 子菜单标题显示过去 24 小时内的活动会话计数。
- 每个会话行保留其令牌栏、时间、预览、思考/详细模式、重置、精简和删除操作。
- 加载中、已断开连接和会话加载错误消息显示在 Context 子菜单内。
- 提供商使用情况和使用成本详情保留在 Context 下方的根级别，以便无需打开子菜单即可一目了然。

## 状态行文本（菜单）

- 工作处于活动状态时：`<Session role> · <activity label>`
  - 示例：`Main · exec: pnpm test`，`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件引入

- 来源：控制渠道 `agent` 事件 (`ControlChannel.handleAgentEvent`)。
- 解析字段：
  - `stream: "job"` 带有 `data.state` 用于开始/停止。
  - `stream: "tool"` 搭配 `data.phase`、`name`、可选的 `meta`/`args`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：缩短的路径。
  - `edit`：路径加上根据 `meta`/diff 计数推断的更改类型。
  - 回退：工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ “Icon override” 选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具类型）
  - `Working: other`（按工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试清单

- 触发主会话作业：验证图标立即切换，且状态行显示主标签。
- 在主会话空闲时触发非主会话作业：图标/状态显示非主会话；保持稳定直到完成。
- 在其他会话活动时启动主会话：图标立即切换到主会话。
- 快速工具爆发：确保徽章不闪烁（工具结果的 TTL 宽限）。
- 所有会话空闲后，健康行重新出现。

## 相关

- [macOS 应用](macOS/en/platforms/macos)
- [菜单栏图标](/zh/platforms/mac/icon)
