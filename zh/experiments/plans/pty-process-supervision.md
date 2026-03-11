---
summary: "可靠交互式进程监督（PTY + 非 PTY）的生产计划，具有明确的所有权、统一的生命周期和确定性的清理"
read_when:
  - "Working on exec/process lifecycle ownership and cleanup"
  - "Debugging PTY and non-PTY supervision behavior"
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "PTY 和进程监督计划"
---

# PTY 和进程监督计划

## 1. 问题与目标

我们需要一个可靠的生命周期来处理长期运行的命令执行，涵盖：

- `exec` 前台运行
- `exec` 后台运行
- `process` 后续操作（`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`）
- CLI agent runner 子进程

目标不仅仅是支持 PTY。目标是实现可预测的所有权、取消、超时和清理，无需不安全的进程匹配启发式方法。

## 2. 范围与边界

- 将实现保留在 `src/process/supervisor` 内部。
- 不要为此创建新的包。
- 在可行的情况下保持当前行为的兼容性。
- 不要扩大范围到终端回放或 tmux 风格的会话持久化。

## 3. 本分支中已实现的内容

### 监督器基线已存在

- 监督器模块已在 `src/process/supervisor/*` 下就位。
- Exec runtime 和 CLI runner 已经通过监督器 spawn 和 wait 进行路由。
- 注册表终结是幂等的。

### 本阶段完成的内容

1. 明确的 PTY 命令契约

- `SpawnInput` 现在是 `src/process/supervisor/types.ts` 中的可辨识联合类型。
- PTY 运行需要 `ptyCommand`，而不是重用通用 `argv`。
- 监督器不再从 `src/process/supervisor/supervisor.ts` 中的 argv 连接重建 PTY 命令字符串。
- Exec runtime 现在直接在 `src/agents/bash-tools.exec-runtime.ts` 中传递 `ptyCommand`。

2. 进程层类型解耦

- 监督器类型不再从 agents 导入 `SessionStdin`。
- 进程本地 stdin 契约位于 `src/process/supervisor/types.ts`（`ManagedRunStdin`）中。
- 适配器现在仅依赖进程层类型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 进程工具生命周期所有权改进

- `src/agents/bash-tools.process.ts` 现在首先通过监督器请求取消。
- `process kill/remove` 现在在监督器查找失败时使用进程树回退终止。
- `remove` 通过在请求终止后立即删除运行中的会话条目来保持确定性的移除行为。

4. 单一源看门狗默认值

- 在 `src/agents/cli-watchdog-defaults.ts` 中添加了共享默认值。
- `src/agents/cli-backends.ts` 使用共享默认值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共享默认值。

5. 死代码清理

- 从 `src/agents/bash-tools.shared.ts` 中删除了未使用的 `killSession` 辅助路径。

6. 添加了直接监督器路径测试

- 添加了 `src/agents/bash-tools.process.supervisor.test.ts` 以覆盖通过监督器取消的 kill 和 remove 路由。

7. 可靠性缺陷修复完成

- `src/agents/bash-tools.process.ts` 现在在监督器查找失败时回退到真实的操作系统级进程终止。
- `src/process/supervisor/adapters/child.ts` 现在对默认取消/超时 kill 路径使用进程树终止语义。
- 在 `src/process/kill-tree.ts` 中添加了共享进程树工具。

8. 添加了 PTY 契约边界情况覆盖

- 添加了 `src/process/supervisor/supervisor.pty-command.test.ts` 用于逐字 PTY 命令转发和空命令拒绝。
- 添加了 `src/process/supervisor/adapters/child.test.ts` 用于子适配器取消中的进程树 kill 行为。

## 4. 剩余缺陷与决策

### 可靠性状态

本阶段所需的两个可靠性缺陷现已关闭：

- `process kill/remove` 现在在监督器查找失败时有真实的操作系统终止回退。
- 子进程取消/超时现在对默认 kill 路径使用进程树 kill 语义。
- 为这两种行为添加了回归测试。

### 持久性与启动协调

重启行为现在明确定义为仅内存生命周期。

- `reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍然是一个空操作（no-op），这是设计如此。
- 进程重启后不会恢复运行中的任务。
- 此边界对于本实现阶段是有意的，以避免部分持久化风险。

### 可维护性后续工作

1. `src/agents/bash-tools.exec-runtime.ts` 中的 `runExecProcess` 仍然处理多个职责，可以在后续工作中拆分为专注于特定功能的辅助函数。

## 5. 实现计划

所需的可靠性和契约项目的实现阶段已完成。

已完成：

- `process kill/remove` 回退真实终止
- 子适配器默认 kill 路径的进程树取消
- 回退 kill 和子适配器 kill 路径的回归测试
- 显式 `ptyCommand` 下的 PTY 命令边界情况测试
- 明确的内存重启边界，`reconcileOrphans()` 设计上为空操作

可选后续工作：

- 将 `runExecProcess` 拆分为专注于特定功能的辅助函数，不改变行为

## 6. 文件映射

### 进程监督器

- `src/process/supervisor/types.ts` 更新了可辨识 spawn 输入和进程本地 stdin 契约。
- `src/process/supervisor/supervisor.ts` 更新为使用显式 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 与 agent 类型解耦。
- `src/process/supervisor/registry.ts` 幂等终结保持不变并保留。

### Exec 和进程集成

- `src/agents/bash-tools.exec-runtime.ts` 更新为显式传递 PTY 命令并保留回退路径。
- `src/agents/bash-tools.process.ts` 更新为通过监督器取消，并具有真实的进程树回退终止。
- `src/agents/bash-tools.shared.ts` 删除了直接 kill 辅助路径。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 添加为共享基线。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 现在使用相同的默认值。

## 7. 本阶段的验证运行

单元测试：

- `pnpm vitest src/process/supervisor/registry.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts`
- `pnpm vitest src/process/supervisor/adapters/child.test.ts`
- `pnpm vitest src/agents/cli-backends.test.ts`
- `pnpm vitest src/agents/bash-tools.exec.pty-cleanup.test.ts`
- `pnpm vitest src/agents/bash-tools.process.poll-timeout.test.ts`
- `pnpm vitest src/agents/bash-tools.process.supervisor.test.ts`
- `pnpm vitest src/process/exec.test.ts`

E2E 目标：

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

类型检查说明：

- 在此仓库中使用 `pnpm build`（以及 `pnpm check` 用于完整的 lint/docs gate）。提到 `pnpm tsgo` 的旧说明已过时。

## 8. 保留的操作保证

- Exec 环境加固行为保持不变。
- 审批和允许列表流程保持不变。
- 输出清理和输出上限保持不变。
- PTY 适配器仍然保证在强制 kill 和监听器释放时等待 settle。

## 9. 完成定义

1. 监督器是托管运行的生命周期所有者。
2. PTY spawn 使用显式命令契约，无需 argv 重建。
3. 进程层对监督器 stdin 契约没有对 agent 层的类型依赖。
4. 看门狗默认值是单一来源。
5. 目标单元测试和 E2E 测试保持通过。
6. 重启持久性边界已明确记录或完全实现。

## 10. 摘要

该分支现在具有一个更连贯、更安全的监督架构：

- 显式 PTY 契约
- 更清晰的进程分层
- 进程操作的监督器驱动取消路径
- 监督器查找失败时的真实回退终止
- 子运行默认 kill 路径的进程树取消
- 统一的看门狗默认值
- 显式内存重启边界（本阶段不跨越重启进行孤立协调）
