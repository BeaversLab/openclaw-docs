---
summary: "明确 ACP 会话和 ACPX 进程所有权的迁移计划"
read_when:
  - Refactoring ACP session lifecycle or ACPX process cleanup
  - Debugging ACPX orphan processes, PID reuse, or multi-gateway cleanup safety
  - Changing sessions_list visibility for spawned ACP or subagent sessions
  - Designing ownership metadata for background tasks, ACP sessions, or process leases
title: "ACP 生命周期重构"
sidebarTitle: "ACP 生命周期重构"
---

ACP 生命周期目前运作正常，但其中太多内容是事后推断出来的。
进程清理根据 PID、命令字符串、包装器路径和活动进程表重建所有权。
会话可见性根据会话键字符串加上辅助 `sessions.list({ spawnedBy })` 查找来重建所有权。
这使得可以进行局部的修复，但也容易遗漏边缘情况：
PID 重用、带引号的命令、适配器孙进程、多 Gateway(网关) 状态根、
`cancel` 与 `close` 的对比，以及 `tree` 与 `all` 的可见性对比，都变成了
重新发现相同所有权规则的独立场所。

此次重构将所有权提升为一等公民。其目标并非推出新的 ACP 产品
表面；而是为现有的 ACP 和 ACPX 行为建立一个更安全的内部契约。

## 目标

- 除非当前的活动证据与 OpenClaw 拥有的租约匹配，否则清理操作绝不应向进程发送信号。
- `cancel`、`close` 和启动收割具有不同的生命周期意图。
- `sessions_list`、`sessions_history`、`sessions_send` 和状态检查使用
  相同的请求者拥有的会话模型。
- 多 Gateway(网关) 安装无法收割彼此的 ACPX 包装器。
- 旧的 ACPX 会话记录在迁移期间继续工作。
- 运行时仍由插件拥有；核心不会学习 ACPX 包的详细信息。

## 非目标

- 替换 ACPX 或更改公共 `/acp` 命令界面。
- 将供应商特定的 ACP 适配器行为移入核心。
- 要求用户在升级前手动清理状态。
- 让 `cancel` 关闭可重用的 ACP 会话。

## 目标模型

### Gateway(网关) 实例身份

每个 Gateway(网关) 进程都应具有一个稳定的运行时实例 ID：

```ts
type GatewayInstanceId = string;
```

它可以在 Gateway(网关) 启动时生成，并在该安装的生命周期内持久化存储在状态中。它不是安全机密；它是一种所有权区分符，用于避免将一个 Gateway(网关) 的 ACP 进程与另一个 Gateway(网关) 的进程混淆。

### ACP 会话所有权

每个生成的 ACP 会话都应具有规范化的所有权元数据：

```ts
type AcpSessionOwner = {
  sessionKey: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  ownerSessionKey: string;
  agentId: string;
  backend: "acpx";
  gatewayInstanceId: GatewayInstanceId;
  createdAt: number;
};
```

Gateway(网关) 应在已知这些字段的会话行上返回这些字段。可见性过滤应是对行元数据的纯检查：

```ts
canSeeSessionRow({
  row,
  requesterSessionKey,
  visibility,
  a2aPolicy,
});
```

这从可见性检查中移除了隐藏的次要 `sessions.list({ spawnedBy })` 调用。生成的跨代理 ACP 子进程之所以由请求者拥有，是因为行数据表明了这一点，而不是因为恰好通过第二次查询找到了它。

### ACPX 进程租约

每次生成的包装器启动都应创建一个租约记录：

```ts
type AcpxProcessLease = {
  leaseId: string;
  gatewayInstanceId: GatewayInstanceId;
  sessionKey: string;
  wrapperRoot: string;
  wrapperPath: string;
  rootPid: number;
  processGroupId?: number;
  commandHash: string;
  startedAt: number;
  state: "open" | "closing" | "closed" | "lost";
};
```

包装器进程应在其环境中接收租约 ID 和网关实例 ID：

```sh
OPENCLAW_ACPX_LEASE_ID=...
OPENCLAW_GATEWAY_INSTANCE_ID=...
```

当平台允许时，验证应优先使用不会被命令引用混淆的实时进程元数据：

- 根 PID 仍然存在
- 实时包装器路径位于 `wrapperRoot` 下
- 进程组在可用时与租约匹配
- 环境在可读时包含预期的租约 ID
- 命令哈希或可执行路径与租约匹配

如果无法验证实时进程，则清理失败（默认拒绝）。

## 生命周期控制器

引入一个 ACPX 生命周期控制器，该控制器拥有进程租约和清理策略：

```ts
interface AcpxLifecycleController {
  ensureSession(input: AcpRuntimeEnsureInput): Promise<AcpRuntimeHandle>;
  cancelTurn(handle: AcpRuntimeHandle): Promise<void>;
  closeSession(input: { handle: AcpRuntimeHandle; discardPersistentState?: boolean; reason?: string }): Promise<void>;
  reapStartupOrphans(): Promise<void>;
  verifyOwnedTree(lease: AcpxProcessLease): Promise<OwnedProcessTree | null>;
}
```

`cancelTurn` 请求仅负责取消轮次。它不得回收可重用的包装器或适配器进程。

`closeSession` 允许进行回收，但仅限于加载会话记录、加载租约并验证实时进程树仍属于该租约之后。

`reapStartupOrphans` 从状态中打开的租约开始。它可以使用进程表查找后代进程，但不应先扫描任意的看似 ACP 的命令，然后再决定它们可能属于我们。

## 包装器契约

生成的包装器应保持小巧。它们应该：

- 在支持的平台上于进程组中启动适配器
- 将正常的终止信号转发给进程组
- 检测父进程死亡
- 在父进程死亡时，发送 SIGTERM，然后保持包装器存活，直到 SIGKILL
  回退程序运行
- 在可用时，将根 PID 和进程组 ID 报告回生命周期控制器

包装器不应决定会话策略。它们仅针对其自己的适配器组强制执行本地进程树清理。

## 会话可见性契约

可见性应使用规范化的行所有权：

```ts
type SessionVisibilityInput = {
  requesterSessionKey: string;
  row: {
    key: string;
    agentId: string;
    ownerSessionKey?: string;
    spawnedBy?: string;
    parentSessionKey?: string;
  };
  visibility: "self" | "tree" | "agent" | "all";
  a2aPolicy: AgentToAgentPolicy;
};
```

规则：

- `self`：仅请求者会话。
- `tree`：请求者会话加上由请求者拥有或从其生成的行。
- `all`：所有相同代理的行、允许 a2a 的跨代理行，以及请求者拥有的已生成跨代理行，即使在通用 a2a 被禁用时也是如此。
- `agent`：仅限相同代理，除非显式的所有者关系表明该行属于请求者。

这使得 `tree` 和 `all` 具有单调性：`all` 不得隐藏 `tree` 会显示的拥有的子项。

## 迁移计划

### 阶段 1：添加身份和租约

- 将 `gatewayInstanceId` 添加到 Gateway(网关) 状态。
- 在 ACPX 状态目录下添加一个 ACPX 租约存储。
- 在生成生成的包装器之前写入租约。
- 在新的 ACPX 会话记录上存储 `leaseId`。
- 保留旧记录的现有 PID 和命令字段。

### 阶段 2：租约优先清理

- 更改关闭清理以首先加载 `leaseId`。
- 在发信号之前根据租约验证实时进程所有权。
- 仅对旧记录保留当前的根 PID 和包装器根回退。
- 在验证清理后将租约标记为 `closed`。
- 当进程在清理之前消失时，将租约标记为 `lost`。

### 阶段 3：租约优先启动回收

- 启动回收扫描开放的租约。
- 对于每个租约，验证根进程并收集后代。
- 子进程优先回收已验证的树。
- 使用有界的保留窗口使旧的 `closed` 和 `lost` 租约过期。
- 仅将命令标记扫描作为临时的旧版回退保留，并在可能的情况下受包装器根和 Gateway(网关) 实例保护。

### 阶段 4：会话所有权行

- 将所有权元数据添加到 Gateway(网关) 会话行。
- 指导 ACPX、子代理、后台任务和会话存储的写入者填充
  `ownerSessionKey` 或 `spawnedBy`。
- 将会话可见性检查转换为使用行元数据。
- 移除可见性时的辅助 `sessions.list({ spawnedBy })` 查找。

### 阶段 5：移除旧版启发式规则

在一个发布窗口期之后：

- 对于非旧版 ACPX 清理，停止依赖存储的根命令字符串
- 移除命令标记启动扫描
- 移除可见性回退列表查找
- 针对丢失或无法验证的租约，保留防御性的故障关闭行为

## 测试

添加两个表驱动测试套件。

进程生命周期模拟器：

- PID 被无关进程重用
- PID 被另一个 Gateway(网关) 的包装器根进程重用
- 存储的包装器命令是 shell 引用的，而实时 `ps` 命令则不是
- 适配器子进程退出，孙进程仍留在进程组中
- 父进程死亡 SIGTERM 回退达到 SIGKILL
- 进程列表不可用
- 进程丢失的陈旧租约
- 带有包装器、适配器子进程和孙进程的启动孤立进程

会话可见性矩阵：

- `self`、`tree`、`agent`、`all`
- 启用和禁用 a2a
- 同代理行
- 跨代理行
- 请求者拥有的生成型跨代理 ACP 行
- 沙箱隔离请求者被限制为 `tree`
- 列表、历史记录、发送和状态操作

重要不变性：只要配置的可见性包含请求者会话树，请求者拥有的生成型子进程就是可见的，并且 `all` 的能力不低于 `tree`。

## 兼容性说明

旧的会话记录可能没有 `leaseId`。它们应使用旧版
故障关闭清理路径：

- 要求存在实时的根进程
- 当预期存在生成的包装器时，要求包装器根所有权
- 对于非包装器根，要求命令一致
- 绝不仅基于陈旧的存储 PID 元数据发送信号

如果无法验证旧记录，请保留原样。启动租约清理和
下一个发布窗口期最终应淘汰此回退机制。

## 成功标准

- 关闭旧的或过期的 ACPX 会话无法终止另一个 Gateway(网关) 的进程。
- 父进程消亡不会遗留顽固的适配器子进程运行。
- `cancel` 中止活动轮次而不关闭可重用的会话。
- `sessions_list` 可以在 `tree` 和 `all` 下显示请求者拥有的跨代理 ACP 子进程。
- 启动清理由租约驱动，而不是广泛的命令字符串扫描。
- 有针对性的进程和可见性矩阵测试涵盖了以前需要一次性审查修复的每一个边缘情况。
