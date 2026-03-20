---
summary: "可靠交互式进程监控（PTY + 非 PTY）的生产计划，具有明确的所有权、统一的生命周期和确定性清理"
read_when:
  - 致力于 exec/process 生命周期所有权和清理
  - 调试 PTY 和非 PTY 监控行为
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "PTY 和进程监控计划"
---

# PTY 和进程监控计划

## 1. 问题与目标

我们需要一个可靠的生命周期，用于跨以下场景的长期命令执行：

- `exec` 前台运行
- `exec` 后台运行
- `process` 后续操作（`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`）
- CLI 代理运行器子进程

目标不仅仅是支持 PTY。目标是可预测的所有权、取消、超时和清理，且不使用不安全的进程匹配启发式方法。

## 2. 范围与边界

- 将实现保留在 `src/process/supervisor` 内部。
- 不要为此创建新包。
- 在可行的情况下保持当前行为的兼容性。
- 不要将范围扩大到终端回放或 tmux 风格的会话持久化。

## 3. 本分支中已实现

### 监控器基线已存在

- 监控器模块已置于 `src/process/supervisor/*` 之下。
- Exec 运行时和 CLI 运行器已通过监控器的生成和等待进行路由。
- 注册表最终化是幂等的。

### 本轮已完成

1. 显式 PTY 命令合约

- `SpawnInput` 现在是 `src/process/supervisor/types.ts` 中的可区分联合体。
- PTY 运行需要 `ptyCommand`，而不是重用通用的 `argv`。
- 监控器不再在 `src/process/supervisor/supervisor.ts` 中从 argv 连接重建 PTY 命令字符串。
- Exec 运行时现在在 `src/agents/bash-tools.exec-runtime.ts` 中直接传递 `ptyCommand`。

2. 进程层类型解耦

- 监控器类型不再从代理导入 `SessionStdin`。
- 进程本地 stdin 协议位于 `src/process/supervisor/types.ts` (`ManagedRunStdin`)。
- 适配器现在仅依赖于进程级类型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 进程工具生命周期所有权改进

- `src/agents/bash-tools.process.ts` 现在首先通过主管请求取消。
- 当主管查找失败时，`process kill/remove` 现在使用进程树回退终止。
- `remove` 通过在请求终止后立即删除运行中的会话条目，保持确定性的删除行为。

4. 单一来源看门狗默认值

- 在 `src/agents/cli-watchdog-defaults.ts` 中添加了共享默认值。
- `src/agents/cli-backends.ts` 使用共享默认值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共享默认值。

5. 死掉的辅助程序清理

- 从 `src/agents/bash-tools.shared.ts` 中删除了未使用的 `killSession` 辅助程序路径。

6. 添加了直接主管路径测试

- 添加了 `src/agents/bash-tools.process.supervisor.test.ts` 以覆盖通过主管取消进行的终止和移除路由。

7. 可靠性差距修复已完成

- 当主管查找失败时，`src/agents/bash-tools.process.ts` 现在回退到真实的操作系统级进程终止。
- `src/process/supervisor/adapters/child.ts` 现在对默认取消/超时终止路径使用进程树终止语义。
- 在 `src/process/kill-tree.ts` 中添加了共享进程树工具。

8. 添加了 PTY 协议边缘情况覆盖

- 添加了 `src/process/supervisor/supervisor.pty-command.test.ts` 用于逐字 PTY 命令转发和空命令拒绝。
- 添加了 `src/process/supervisor/adapters/child.test.ts` 用于子适配器取消中的进程树终止行为。

## 4. 剩余差距和决策

### 可靠性状态

此阶段所需的两个可靠性差距现已关闭：

- 当主管查找失败时，`process kill/remove` 现在具有真实的操作系统终止回退。
- 子取消/超时现在对默认终止路径使用进程树终止语义。
- 为这两种行为添加了回归测试。

### 持久性和启动协调

重启行为现在被明确定义为仅内存生命周期。

- 根据设计，`reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍然是一个空操作。
- 进程重启后不会恢复正在进行的运行。
- 此边界是本实现阶段有意为之的，以避免部分持久化风险。

### 可维护性后续工作

1. `runExecProcess` 中的 `src/agents/bash-tools.exec-runtime.ts` 仍处理多项职责，可在后续工作中拆分为专注的辅助程序。

## 5. 实施计划

所需的可靠性和合约项目的实施阶段已完成。

已完成：

- `process kill/remove` 回退真实终止
- 子适配器默认终止路径的进程树取消
- 回退终止和子适配器终止路径的回归测试
- 显式 `ptyCommand` 下的 PTY 命令边缘情况测试
- 使用 `reconcileOrphans()` 的显式内存重启边界（设计上为空操作）

可选后续工作：

- 将 `runExecProcess` 拆分为专注的辅助程序，且不产生行为偏差

## 6. 文件映射

### 进程监督器

- `src/process/supervisor/types.ts` 已更新，包含可区分的生成输入和进程本地 stdin 合约。
- `src/process/supervisor/supervisor.ts` 已更新，以使用显式的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 已从代理类型解耦。
- `src/process/supervisor/registry.ts` 幂等式终结保持不变并予以保留。

### Exec 和进程集成

- `src/agents/bash-tools.exec-runtime.ts` 已更新，以显式传递 PTY 命令并保留回退路径。
- `src/agents/bash-tools.process.ts` 已更新，以通过监督器取消，并使用真实的进程树回退终止。
- `src/agents/bash-tools.shared.ts` 已移除直接 kill 辅助程序路径。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已作为共享基线添加。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 现在消费相同的默认值。

## 7. 本阶段验证运行

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

- 在本仓库中使用 `pnpm build`（并使用 `pnpm check` 进行完整的 lint/docs 检查）。提到 `pnpm tsgo` 的旧笔记已过时。

## 8. 保留的操作保证

- 执行环境加固行为未变。
- 审批和允许列表流程未变。
- 输出清理和输出上限未变。
- PTY 适配器仍然保证在强制终止和监听器释放时完成等待结算。

## 9. 完成的定义

1. Supervisor 是托管运行的生命周期所有者。
2. PTY 生成使用显式命令合约，不进行 argv 重建。
3. 进程层对代理层没有 supervisor stdin 合约的类型依赖。
4. 看门狗默认值是单一来源。
5. 有针对性的单元测试和 e2e 测试保持绿色。
6. 重启持久性边界已明确记录或完全实施。

## 10. 总结

该分支现在具有一个更连贯、更安全的监管形态：

- 显式 PTY 合约
- 更清晰的进程分层
- 由 supervisor 驱动的进程操作取消路径
- 当 supervisor 查找失败时的真实回退终止
- 子运行默认终止路径的进程树取消
- 统一的看门狗默认值
- 显式的内存内重启边界（本阶段不涉及跨重启的孤立协调）

import en from "/components/footer/en.mdx";

<en />
