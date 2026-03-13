---
title: 沙箱 vs 工具策略 vs 提权
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略，以及提权执行门控"
read_when: "你遇到了 'sandbox jail' 或看到工具/提权被拒绝，并且想要更改确切的配置键。"
status: 活跃
---

# 沙箱 vs 工具策略 vs 提权

OpenClaw 有三个相关（但不同）的控制机制：

1. **沙箱** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 决定 **工具运行的位置**（Docker 还是主机）。
2. **工具策略** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 决定 **哪些工具可用/被允许**。
3. **提权** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅执行的逃生舱**，用于在处于沙箱环境时在主机上运行。

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
- `"non-main"`：仅非主会话被沙箱化（群组/频道的常见“意外”情况）。
- `"all"`：所有内容都被沙箱化。

有关完整矩阵（范围、工作区挂载、镜像），请参阅 [沙箱](/zh/en/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` _穿透_ 沙箱文件系统：你挂载的任何内容都会以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写模式；对于源代码/机密，建议使用 `:ro`。
- `scope: "shared"` 会忽略每个代理的绑定（仅应用全局绑定）。
- 绑定 `/var/run/docker.sock` 实际上会将主机控制权移交给沙箱；请仅在有意为之的情况下这样做。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）独立于绑定模式。

## 工具策略：哪些工具存在/可调用

有两个层级的因素：

- **工具配置**：`tools.profile` 和 `agents.list[].tools.profile`（基础允许列表）
- **提供商工具配置**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供商工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱模式下适用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，其他所有内容将被视为已阻止。
- 工具策略是硬性停止点：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送方的会话默认值；它不授予工具访问权限。
  提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、代理、沙箱）支持扩展为多个工具的 `group:*` 条目：

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
- `group:openclaw`：所有内置 OpenClaw 工具（不包括提供商插件）

## 提升权限：仅执行的“在主机上运行”

提升权限**不**授予额外的工具；它仅影响 `exec`。

- 如果您处于沙箱模式，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在主机上运行（可能仍需批准）。
- 使用 `/elevated full` 跳过该会话的执行批准。
- 如果您已经在直接运行，提升模式实际上是一个空操作（仍然受限）。
- 提升模式**不**按技能 范围划分，也**不**覆盖工具允许/拒绝设置。
- `/exec` 与提升模式是分开的。它仅针对授权发送者调整每次会话的 exec 默认值。

控制门：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者白名单：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

请参阅 [Elevated Mode](/zh/en/tools/elevated)。

## 常见的“沙盒监狱”修复方法

### “工具 X 被沙盒工具策略阻止”

修复键（任选其一）：

- 禁用沙盒：`agents.defaults.sandbox.mode=off`（或针对每个代理的 `agents.list[].sandbox.mode=off`）
- 在沙盒内允许该工具：
  - 从 `tools.sandbox.tools.deny` 中移除它（或针对每个代理的 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或针对每个代理的允许列表）

### “我以为这是主节点，为什么被沙盒化了？”

在 `"non-main"` 模式下，群组/频道键_不是_主节点。请使用主会话键（由 `sandbox explain` 显示）或将模式切换到 `"off"`。

import zh from '/components/footer/zh.mdx';

<zh />
