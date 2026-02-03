---
title: "菜单栏"
summary: "菜单栏状态逻辑与对用户展示的内容"
read_when:
  - 调整 mac 菜单 UI 或状态逻辑
---
# 菜单栏状态逻辑

## 显示内容
- 在菜单栏图标与菜单第一行状态中显示当前代理工作状态。
- 工作进行中时隐藏健康状态；所有会话空闲后恢复显示。
- 菜单中的 “Nodes” 区块只列 **设备**（通过 `node.list` 配对的节点），不含 client/presence 条目。
- 当提供商使用量快照可用时，Context 下会出现 “Usage” 区块。

## 状态模型
- 会话：事件带 `runId`（每次运行）以及 payload 中的 `sessionKey`。“main” 会话的 key 为 `main`；若缺失，则回退到最近更新的会话。
- 优先级：main 始终优先。若 main 活跃，立即显示其状态；若 main 空闲，则显示最近活跃的非 main 会话。活动中不来回切换，只在当前会话空闲或 main 变为活跃时切换。
- 活动类型：
  - `job`：高层命令执行（`state: started|streaming|done|error`）。
  - `tool`：`phase: start|result`，带 `toolName` 和 `meta/args`。

## IconState 枚举（Swift）
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
- default → 🛠️

### 视觉映射
- `idle`：正常小爪兽图标。
- `workingMain`：带图标徽章、完整色调、腿部“工作”动画。
- `workingOther`：带图标徽章、色调较淡、无奔跑动画。
- `overridden`：无论活动如何都使用选定图标/色调。

## 状态行文本（菜单）
- 工作进行中：`<Session role> · <activity label>`
  - 示例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 空闲时：回退到健康摘要。

## 事件接入
- 来源：control‑channel 的 `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析字段：
  - `stream: "job"`，使用 `data.state` 判定开始/结束。
  - `stream: "tool"`，使用 `data.phase`、`name`、可选 `meta`/`args`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：截断后的路径。
  - `edit`：路径 + 从 `meta`/diff 计数推断的变更类型。
  - fallback：工具名。

## 调试覆盖
- Settings ▸ Debug ▸ “Icon override” 选择器：
  - `System (auto)`（默认）
  - `Working: main`（按工具类型）
  - `Working: other`（按工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储，映射到 `IconState.overridden`。

## 测试清单
- 触发 main 会话 job：确认图标立即切换，状态行显示 main 标签。
- main 空闲时触发非 main 会话 job：图标/状态显示非 main，并保持直到完成。
- 其他会话活跃时启动 main：图标立刻切换到 main。
- 快速工具事件：确保徽章不闪烁（工具结果有 TTL 缓冲）。
- 所有会话空闲后健康行重新出现。
