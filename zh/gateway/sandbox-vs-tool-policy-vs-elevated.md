---
title: "沙箱 vs 工具策略 vs 提升权限"
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略以及提升执行 Gateway"
read_when: "您遇到"沙箱监狱"或看到工具/提升权限拒绝，并想要更改确切的配置键。"
status: "active"
---

# 沙箱 vs 工具策略 vs 提升权限

OpenClaw 有三个相关（但不同）的控制：

1. **沙箱**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定**工具在哪里运行**（Docker vs 主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定**哪些工具可用/被允许**。
3. **提升权限**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一个**仅执行的逃生舱**，用于在您被沙箱化时在主机上运行。

## 快速调试

使用检查器查看 OpenClaw _实际_在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它打印：

- 有效的沙箱模式/范围/工作区访问
- 会话当前是否被沙箱化（主会话 vs 非主会话）
- 有效的沙箱工具允许/拒绝（以及它是否来自代理/全局/默认）
- 提升权限 Gateway 和修复键路径

## 沙箱：工具运行的地方

沙箱由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：一切都在主机上运行。
- `"non-main"`：只有非主会话被沙箱化（组/频道的常见”意外”）。
- `"all"`：一切都是沙箱化的。

参阅[沙箱](/zh/gateway/sandboxing)了解完整矩阵（范围、工作区挂载、镜像）。

### 绑定挂载（安全快速检查）

- `docker.binds` _刺穿_ 沙箱文件系统：您挂载的任何内容都以您设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写模式；对于源/机密，首选 `:ro`。
- `scope: "shared"` 忽略每个代理的绑定（仅全局绑定适用）。
- 绑定 `/var/run/docker.sock` 实际上将主机控制权交给沙箱；请仅在有意的情况下这样做。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）独立于绑定模式。

## 工具策略：哪些工具存在/可调用

两个层次很重要：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile`（基本允许列表）
- **提供商工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每个代理的工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供商工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱化时适用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 总是获胜。
- 如果 `allow` 非空，其他所有内容都被视为已阻止。
- 工具策略是硬性停止：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
  提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

### 工具组（简写）

工具策略（全局、代理、沙箱）支持 `group:*` 条目，这些条目扩展为多个工具：

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
- `group:openclaw`：所有内置的 OpenClaw 工具（不包括提供商插件）

## 提升权限：仅执行的”在主机上运行”

提升权限**不会**授予额外的工具；它仅影响 `exec`。

- 如果您被沙箱化，`/elevated on`（或带有 `elevated: true` 的 `exec`）在主机上运行（可能仍需批准）。
- 使用 `/elevated full` 跳过会话的执行批准。
- 如果您已经直接运行，提升权限实际上是空操作（仍然受 Gateway 限制）。
- 提升权限**不是**技能范围的，并且**不会**覆盖工具允许/拒绝。
- `/exec` 与提升权限分开。它仅调整授权发送者的每个会话执行默认值。

Gateway：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参阅[提升权限模式](/zh/tools/elevated)。

## 常见的”沙箱监狱”修复

### “工具 X 被沙箱工具策略阻止”

修复键（选择一个）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或每个代理的 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许工具：
  - 从 `tools.sandbox.tools.deny` 中删除它（或每个代理的 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或每个代理的允许）

### “我以为这是主会话，为什么被沙箱化了？”

在 `"non-main"` 模式下，组/频道键_不是_主会话。使用主会话键（由 `sandbox explain` 显示）或将模式切换到 `"off"`。
