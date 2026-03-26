---
summary: "用于可靠交互式进程监控（PTY + 非 PTY）的生产计划，具有明确的所有权、统一的生命周期和确定性的清理"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "进行中"
last_updated: "2026-02-15"
title: "PTY 和进程监控计划"
---

# PTY 和进程监督计划

## 1. 问题与目标

我们需要一个可靠的生命周期来处理跨以下情况的长时间运行的命令执行：

- `exec` 前台运行
- `exec` 后台运行
- `process` 后续操作 (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- CLI 代理运行器子进程

目标不仅仅是支持 PTY。目标是实现可预测的所有权、取消、超时和清理，且不使用不安全的进程匹配启发式方法。

## 2. 范围与边界

- 将实现保留在 `src/process/supervisor` 内部。
- 不要为此创建新的包。
- 在切实可行的情况下保持当前行为的兼容性。
- 不要将范围扩大到终端回放或 tmux 风格的会话持久化。

## 3. 本分支中实现的内容

### 监督器基线已存在

- 监控器模块已置于 `src/process/supervisor/*` 下。
- Exec 运行时和 CLI 运行器已经通过监督器的生成 和等待 进行路由。
- 注册表终结是幂等的。

### 本轮完成的工作

1. 显式 PTY 命令契约

- `SpawnInput` 现在是 `src/process/supervisor/types.ts` 中的可辨识联合体。
- PTY 运行需要 `ptyCommand`，而不是复用通用的 `argv`。
- 监控器不再通过 `src/process/supervisor/supervisor.ts` 中的 argv 连接重建 PTY 命令字符串。
- Exec 运行时现在在 `src/agents/bash-tools.exec-runtime.ts` 中直接传递 `ptyCommand`。

2. 进程层类型解耦

- 监控器类型不再从 agents 导入 `SessionStdin`。
- 进程本地 stdin 契约位于 `src/process/supervisor/types.ts` (`ManagedRunStdin`) 中。
- 适配器现在仅依赖于进程级类型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 进程工具生命周期所有权改进

- `src/agents/bash-tools.process.ts` 现在首先通过主管请求取消。
- `process kill/remove` 现在在主管查找失败时使用进程树回退终止。
- `remove` 通过在请求终止后立即删除正在运行的会话条目，保持了确定性的删除行为。

4. 单一来源的监视程序默认值

- 在 `src/agents/cli-watchdog-defaults.ts` 中添加了共享默认值。
- `src/agents/cli-backends.ts` 使用共享默认值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共享默认值。

5. 死掉的辅助程序清理

- 从 `src/agents/bash-tools.shared.ts` 中移除了未使用的 `killSession` 辅助程序路径。

6. 添加了直接主管路径测试

- 添加了 `src/agents/bash-tools.process.supervisor.test.ts` 以覆盖通过主管取消进行的终止和删除路由。

7. 可靠性差距修复已完成

- `src/agents/bash-tools.process.ts` 现在在主管查找失败时回退到真实的操作系统级进程终止。
- `src/process/supervisor/adapters/child.ts` 现在对默认的取消/超时终止路径使用进程树终止语义。
- 在 `src/process/kill-tree.ts` 中添加了共享的进程树工具。

8. 添加了 PTY 契约边缘情况覆盖

- 添加了 `src/process/supervisor/supervisor.pty-command.test.ts` 用于逐字 PTY 命令转发和空命令拒绝。
- 添加了 `src/process/supervisor/adapters/child.test.ts` 用于子适配器取消中的进程树终止行为。

## 4. 剩余差距和决策

### 可靠性状态

此阶段所需的两个可靠性差距现已填补：

- `process kill/remove` 现在具有当主管查找失败时的真实操作系统终止回退机制。
- 子级取消/超时现在对默认终止路径使用进程树终止语义。
- 为这两种行为都添加了回归测试。

### 持久性和启动协调

重启行为现在明确定义为仅限内存生命周期。

- 根据设计，`reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍然是空操作（no-op）。
- 进程重启后，正在运行的任务不会被恢复。
- 这一边界是本次实现特意设定的，旨在避免部分持久化的风险。

### 可维护性后续工作

1. `runExecProcess` 在 `src/agents/bash-tools.exec-runtime.ts` 中仍然处理多项职责，可以在后续跟进中拆分为专用的辅助函数。

## 5. 实施计划

针对所需可靠性和契约项目的实施步骤已完成。

已完成：

- `process kill/remove` 回退真实终止
- 子适配器默认终止路径的进程树取消
- 回退终止和子适配器终止路径的回归测试
- 显式 `ptyCommand` 下的 PTY 命令边缘情况测试
- 显式内存重启边界，根据设计 `reconcileOrphans()` 为空操作

可选后续工作：

- 将 `runExecProcess` 拆分为专用的辅助函数，且不改变行为

## 6. 文件映射

### 进程监督器

- `src/process/supervisor/types.ts` 已更新，包含区分化的生成输入和进程本地 stdin 契约。
- `src/process/supervisor/supervisor.ts` 已更新，以使用显式的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 已与代理类型解耦。
- `src/process/supervisor/registry.ts` 幂等式最终确定保持不变并予以保留。

### Exec 和进程集成

- `src/agents/bash-tools.exec-runtime.ts` 已更新，以显式传递 PTY 命令并保留回退路径。
- `src/agents/bash-tools.process.ts` 已更新，通过监督器进行取消，并附带真实的进程树回退终止。
- `src/agents/bash-tools.shared.ts` 移除了直接终止辅助路径。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已作为共享基线添加。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 现在使用相同的默认值。

## 7. 本轮验证运行

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

E2E targets：

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

Typecheck note：

- Use `pnpm build` (and `pnpm check` for full lint/docs gate) in this repo. Older notes that mention `pnpm tsgo` are obsolete.

## 8. Operational guarantees preserved

- Exec env hardening behavior is unchanged.
- Approval and allowlist flow is unchanged.
- Output sanitization and output caps are unchanged.
- PTY adapter still guarantees wait settlement on forced kill and listener disposal.

## 9. Definition of done

1. Supervisor is lifecycle owner for managed runs.
2. PTY spawn uses explicit command contract with no argv reconstruction.
3. Process layer has no type dependency on agent layer for supervisor stdin contracts.
4. Watchdog defaults are single source.
5. Targeted unit and e2e tests remain green.
6. Restart durability boundary is explicitly documented or fully implemented.

## 10. Summary

The branch now has a coherent and safer supervision shape：

- explicit PTY contract
- cleaner process layering
- supervisor driven cancellation path for process operations
- real fallback termination when supervisor lookup misses
- process-tree cancellation for child-run default kill paths
- unified watchdog defaults
- explicit in-memory restart boundary (no orphan reconciliation across restart in this pass)

import zh from "/components/footer/zh.mdx";

<zh />
