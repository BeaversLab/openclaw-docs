---
title: 沙箱 vs 工具策略 vs 提权
summary: "为什么工具被阻止：沙箱运行时、工具允许/拒绝策略以及提升执行门控"
read_when: "遇到了“沙箱监牢”错误或看到工具/提升执行被拒绝，并且想要更改确切的配置键。"
status: 活跃
---

# 沙箱 vs 工具策略 vs 提权

OpenClaw 有三个相关（但不同）的控制机制：

1. **沙箱**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定**工具的运行位置**（Docker 与主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定**哪些工具可用/被允许**。
3. **提升**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一个**仅执行的应急方案**，用于在处于沙箱环境中时在主机上运行。

## 快速调试

使用检查器查看 OpenClaw _实际_ 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它会打印：

- 有效的沙箱模式/范围/工作区访问权限
- 会话当前是否处于沙箱中（主会话 vs 非主会话）
- 有效的沙箱工具允许/拒绝（以及它是来自代理/全局/默认设置）
- 提权门控和修复键路径

## 沙箱：工具运行的地方

沙箱由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有内容都在主机上运行。
- `"non-main"`：仅非主会话会被置于沙箱中（这是群组/频道常见的“意外”）。
- `"all"`：所有内容都置于沙箱中。

有关完整矩阵（范围、工作区挂载、镜像），请参阅 [沙箱](/zh/en/gateway/沙箱隔离)。

### 绑定挂载（安全快速检查）

- `docker.binds` _穿透_沙箱文件系统：你挂载的任何内容都会以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写；对于源代码/机密，建议使用 `:ro`。
- `scope: "shared"` 会忽略每代理绑定（仅全局绑定生效）。
- 绑定 `/var/run/docker.sock` 实际上会将主机控制权移交给沙箱；请仅在有意为之的情况下这样做。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）独立于绑定模式。

## 工具策略：哪些工具存在/可调用

有两个层级的因素：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile`（基本允许列表）
- **提供者工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider 工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱 工具策略**（仅在沙箱化时适用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，其他所有内容都将被视为被阻止。
- 工具策略是硬性限制：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
  Provider 工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、代理、沙箱）支持 `group:*` 条目，这些条目可扩展为多个工具：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

可用组：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内置的 OpenClaw 工具（不包括 Provider 插件）

## 提升权限：仅执行的“在主机上运行”

Elevated **不会**授予额外的工具权限；它仅影响 `exec`。

- 如果您处于沙盒环境中，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在主机上运行（可能仍需批准）。
- 使用 `/elevated full` 跳过该会话的执行批准。
- 如果您已经在直接运行，提升模式实际上是一个空操作（仍然受限）。
- 提升模式**不**按技能 范围划分，也**不**覆盖工具允许/拒绝设置。
- `/exec` 与提升权限是分开的。它仅为经过授权的发件人调整每次会话的执行默认值。

控制门：

- 启用方法：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发件人允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

请参阅 [Elevated Mode](/zh/en/tools/elevated)。

## 常见的“沙盒监狱”修复方法

### “工具 X 被沙盒工具策略阻止”

修复键（任选其一）：

- 禁用沙盒：`agents.defaults.sandbox.mode=off`（或针对每个代理的 `agents.list[].sandbox.mode=off`）
- 在沙盒内允许该工具：
  - 从 `tools.sandbox.tools.deny` 中将其移除（或针对每个代理的 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或针对每个代理的允许列表）

### “我以为这是主节点，为什么被沙盒化了？”

在 `"non-main"` 模式下，群组/频道密钥_不是_主密钥。请使用主会话密钥（由 `sandbox explain` 显示）或将模式切换到 `"off"`。

import zh from '/components/footer/zh.mdx';

<zh />
