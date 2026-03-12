---
summary: "用于可靠交互式进程监督（PTY 和非 PTY）的生产计划，具有明确的所有权、统一的生命周期和确定性的清理"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "进行中"
last_updated: "2026-02-15"
title: "PTY 和进程监督计划"
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

- 监督器模块已置于 `src/process/supervisor/*` 之下。
- Exec 运行时和 CLI 运行器已经通过监督器的生成 和等待 进行路由。
- 注册表终结是幂等的。

### 本轮完成的工作

1. 显式 PTY 命令契约

- `SpawnInput` 现在是 `src/process/supervisor/types.ts` 中的可辨识联合。
- PTY 运行需要 `ptyCommand`，而不是重用通用的 `argv`。
- 监督器不再通过 `src/process/supervisor/supervisor.ts` 中的 argv 连接重建 PTY 命令字符串。
- Exec 运行时现在直接在 `src/agents/bash-tools.exec-runtime.ts` 中传递 `ptyCommand`。

2. 进程层类型解耦

- 监督器类型不再从 agents 导入 `SessionStdin`。
- 进程本地 stdin 契约位于 `src/process/supervisor/types.ts` (`ManagedRunStdin`) 中。
- 适配器现在仅依赖于进程级类型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 进程工具生命周期所有权改进

- `src/agents/bash-tools.process.ts` 现在首先通过监督器请求取消。
- `process kill/remove` 现在在监督程序查找失败时使用进程树回退终止。
- `remove` 通过在请求终止后立即删除正在运行的会话条目来保持确定性的删除行为。

4. 单一来源的看门狗默认值

- 在 `src/agents/cli-watchdog-defaults.ts` 中添加了共享默认值。
- `src/agents/cli-backends.ts` 使用这些共享默认值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共享默认值。

5. 死掉的辅助程序清理

- 从 `src/agents/bash-tools.shared.ts` 中移除了未使用的 `killSession` 辅助路径。

6. 添加了直接监督程序路径测试

- 添加了 `src/agents/bash-tools.process.supervisor.test.ts` 以覆盖通过监督程序取消进行的 kill 和 remove 路由。

7. 可靠性缺口修复已完成

- `src/agents/bash-tools.process.ts` 现在在监督程序查找失败时回退到真实的操作系统级进程终止。
- `src/process/supervisor/adapters/child.ts` 现在对默认的取消/超时 kill 路径使用进程树终止语义。
- 在 `src/process/kill-tree.ts` 中添加了共享进程树实用程序。

8. 添加了 PTY 合约边缘情况覆盖

- 添加了 `src/process/supervisor/supervisor.pty-command.test.ts` 用于逐字 PTY 命令转发和空命令拒绝。
- 添加了 `src/process/supervisor/adapters/child.test.ts` 用于子适配器取消中的进程树 kill 行为。

## 4. 剩余缺口和决策

### 可靠性状态

此阶段所需的两个可靠性缺口现已关闭：

- `process kill/remove` 现在在监督程序查找失败时具有真实的操作系统终止回退。
- 子取消/超时现在对默认 kill 路径使用进程树 kill 语义。
- 为这两种行为添加了回归测试。

### 持久性和启动协调

重启行为现在明确定义为仅内存生命周期。

- 根据设计，`reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍然是一个空操作。
- 进程重启后不会恢复正在运行的运行。
- 此边界对于此实现阶段是有意为之，以避免部分持久化风险。

### 可维护性后续工作

1. `runExecProcess` 中的 `src/agents/bash-tools.exec-runtime.ts` 仍然处理多个职责，可以在后续工作中拆分为专注的辅助程序。

## 5. 实施计划

针对所需可靠性和契约项目的实施阶段已完成。

已完成：

- `process kill/remove` 回退真实终止
- 子适配器默认终止路径的进程树取消
- 回退终止和子适配器终止路径的回归测试
- 在显式 `ptyCommand` 下进行的 PTY 命令边缘情况测试
- 使用 `reconcileOrphans()` 的显式内存重启边界，设计上为空操作

可选后续工作：

- 将 `runExecProcess` 拆分为专注于特定功能的辅助函数，且无行为偏差

## 6. 文件映射

### 进程监督器

- `src/process/supervisor/types.ts` 已更新，包含可区分的生成输入和进程本地 stdin 契约。
- `src/process/supervisor/supervisor.ts` 已更新以使用显式 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 已与代理类型解耦。
- `src/process/supervisor/registry.ts` 幂等式 finalize 保持不变并予以保留。

### Exec 和进程集成

- `src/agents/bash-tools.exec-runtime.ts` 已更新，以显式传递 PTY 命令并保留回退路径。
- `src/agents/bash-tools.process.ts` 已更新，通过监督器取消，并执行真实的进程树回退终止。
- `src/agents/bash-tools.shared.ts` 移除了直接终止辅助函数路径。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已添加为共享基线。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 现在使用相同的默认值。

## 7. 本轮次中运行的验证

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

- 在此仓库中使用 `pnpm build`（以及用于完整 lint/docs 门禁的 `pnpm check`）。提及 `pnpm tsgo` 的旧说明已过时。

## 8. 保留的操作保证

- Exec 环境加固行为保持不变。
- 批准和允许列表流程保持不变。
- 输出清理和输出上限保持不变。
- PTY 适配器仍然保证在强制终止和监听器释放时的等待完成。

## 9. 完成定义

1. 监督器是托管运行的生命周期所有者。
2. PTY 生成使用显式命令契约，不进行 argv 重构。
3. 进程层在监控程序 stdin 契约方面不依赖于代理层的类型。
4. 看门狗默认值是单一来源。
5. 有针对性的单元测试和端到端测试保持通过（绿色）。
6. 重启持久性边界已明确记录或完全实现。

## 10. 总结

该分支现在具有一致且更安全的监控形态：

- 显式 PTY 契约
- 更清晰的进程分层
- 监控程序驱动的进程操作取消路径
- 当监控程序查找失败时的实际回退终止
- 子运行默认终止路径的进程树取消
- 统一的看门狗默认值
- 显式的内存重启边界（本阶段不处理跨重启的孤立进程协调）
