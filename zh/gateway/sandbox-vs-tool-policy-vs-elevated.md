---
title: 沙箱 vs 工具策略 vs 提升权限
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略以及提升执行门控"
read_when: "遇到“沙箱监狱”或看到工具/提升拒绝，并且想要更改确切的配置键时。"
status: active
---

# 沙箱 vs 工具策略 vs 提升权限

OpenClaw 具有三个相关（但不同）的控制：

1. **沙箱** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 决定 **工具在哪里运行** (Docker vs host)。
2. **工具策略** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 决定 **哪些工具可用/被允许**。
3. **提升权限** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅执行的逃生通道**，用于在您处于沙箱隔离状态时在主机上运行。

## 快速调试

使用检查器查看 OpenClaw _实际上_ 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它打印：

- 有效的沙箱模式/范围/工作区访问权限
- 会话当前是否处于沙箱隔离状态 (main vs non-main)
- 有效的沙箱工具允许/拒绝（以及它是否来自代理/全局/默认）
- 提升门控和修复键路径

## 沙箱：工具在哪里运行

沙箱隔离由 `agents.defaults.sandbox.mode` 控制：

- `"off"`: 一切都在主机上运行。
- `"non-main"`: 只有非主会话被沙箱隔离 (群组/频道的常见“意外”)。
- `"all"`: 一切都被沙箱隔离。

有关完整矩阵 (范围、工作区挂载、镜像)，请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

### 绑定挂载 (安全快速检查)

- `docker.binds` _穿透_ 沙箱文件系统：您挂载的任何内容都以您设置的模式 (`:ro` 或 `:rw`) 在容器内部可见。
- 如果省略模式，默认为读写；对于源代码/机密，请首选 `:ro`。
- `scope: "shared"` 会忽略每个代理的绑定 (仅应用全局绑定)。
- 绑定 `/var/run/docker.sock` 实际上是将主机控制权移交给沙箱；请仅在有意为之时执行此操作。
- 工作区访问 (`workspaceAccess: "ro"`/`"rw"`) 独立于绑定模式。

## 工具策略：存在哪些工具/可调用哪些工具

有两个层面很重要：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile`（基础允许列表）
- **提供者工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱隔离时适用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终获胜。
- 如果 `allow` 非空，其他所有内容都将被视为被阻止。
- 工具策略是硬性停止：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改已授权发送者的会话默认值；它不授予工具访问权限。
  提供者工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

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
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有内置 OpenClaw 工具（不包括提供商插件）

## 提升权限：仅限执行“在主机上运行”

提升权限**不会**授予额外的工具；它仅影响 `exec`。

- 如果您处于沙箱隔离状态，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在主机上运行（可能仍需批准）。
- 使用 `/elevated full` 跳过该会话的执行批准。
- 如果您已经直接运行，提升权限实际上是空操作（仍受限）。
- 提升权限**不**受技能范围限制，也**不**覆盖工具允许/拒绝策略。
- `/exec` 与提升权限是分开的。它仅为授权发件人调整每次会话的执行默认值。

控制门：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发件人允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参见 [提升权限模式](/zh/tools/elevated)。

## 常见的“沙箱监狱”修复方法

### “工具 X 被沙箱工具策略阻止”

修复密钥（选择一项）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或每个代理 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许该工具：
  - 从 `tools.sandbox.tools.deny` 中将其移除（或每个代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或每个代理允许列表）

### “我以为这是主密钥，为什么被沙箱隔离了？”

在 `"non-main"` 模式下，群组/渠道密钥**不是**主密钥。请使用主会话密钥（由 `sandbox explain` 显示）或将模式切换到 `"off"`。

import en from "/components/footer/en.mdx";

<en />
