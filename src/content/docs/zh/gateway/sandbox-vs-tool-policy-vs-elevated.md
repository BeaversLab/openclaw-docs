---
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略以及提升执行门控"
title: 沙箱 vs 工具策略 vs 提升（Elevated）
read_when: "遇到了“沙箱监牢”错误或看到工具/提升执行被拒绝，并且想要更改确切的配置键。"
status: 活跃
---

OpenClaw 有三个相关（但不同）的控制机制：

1. **沙箱**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定**工具在哪里运行**（沙箱后端还是主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定**哪些工具可用/被允许**。
3. **提升（Elevated）**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一种**仅执行的应急手段**，用于在您处于沙箱隔离状态下在沙箱外运行（默认为 `gateway`，或者当执行目标配置为 `node` 时为 `node`）。

## 快速调试

使用检查器来查看 OpenClaw _实际_ 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它将打印：

- 有效的沙箱模式/作用域/工作区访问权限
- 会话当前是否处于沙箱隔离状态（主会话 vs 非主会话）
- 有效的沙箱工具允许/拒绝（以及来源是代理/全局/默认值）
- 提升门控和修复关键路径

## 沙箱：工具运行的位置

沙箱隔离由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有内容都在主机上运行。
- `"non-main"`：只有非主会话会被沙箱隔离（组/频道的常见“意外”情况）。
- `"all"`：所有内容都被沙箱隔离。

有关完整矩阵（作用域、工作区挂载、镜像），请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` _穿透_ 沙箱文件系统：您挂载的任何内容都将以您设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写模式；对于源代码/机密，建议首选 `:ro`。
- `scope: "shared"` 会忽略每个代理的绑定（仅应用全局绑定）。
- OpenClaw 会对绑定源进行两次检查：首先是在规范化源路径上，其次是在通过最深层的现有祖先解析后再次检查。通过符号链接父级的逃逸无法绕过对受阻路径或允许根目录的检查。
- 不存在的叶路径仍会被安全地检查。如果 `/workspace/alias-out/new-file` 通过符号链接父级解析到受阻路径或配置的允许根目录之外，该绑定将被拒绝。
- 绑定 `/var/run/docker.sock` 实际上是将主机控制权移交给沙箱；请仅在有意为之的情况下这样做。
- 工作区访问 (`workspaceAccess: "ro"`/`"rw"`) 独立于绑定模式。

## 工具策略：哪些工具存在/可调用

涉及两层：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile`（基础允许列表）
- **提供商工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/每代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供商工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱隔离时适用）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终获胜。
- 如果 `allow` 非空，其他所有内容都将被视为受阻。
- 工具策略是硬性终止：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
  提供商工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

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

- `group:runtime`：`exec`，`process`，`code_execution`（`bash` 被接受为
  `exec` 的别名）
- `group:fs`：`read`，`write`，`edit`，`apply_patch`
- `group:sessions`：`sessions_list`，`sessions_history`，`sessions_send`，`sessions_spawn`，`sessions_yield`，`subagents`，`session_status`
- `group:memory`：`memory_search`，`memory_get`
- `group:web`：`web_search`，`x_search`，`web_fetch`
- `group:ui`：`browser`，`canvas`
- `group:automation`：`cron`，`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:agents`：`agents_list`
- `group:media`：`image`，`image_generate`，`video_generate`，`tts`
- `group:openclaw`：所有内置 OpenClaw 工具（不包括提供商插件）

## Elevated：仅执行的“在主机上运行”

Elevated **不** 授予额外的工具；它仅影响 `exec`。

- 如果您处于沙箱隔离状态，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在沙箱之外运行（可能仍需批准）。
- 使用 `/elevated full` 以跳过该会话的执行批准。
- 如果您已经在直接运行，Elevated 实际上是一个空操作（仍然受限）。
- Elevated **不** 限定于技能范围，也 **不** 覆盖工具的允许/拒绝设置。
- 提升模式并不允许从 `host=auto` 进行任意的跨主机覆盖；它遵循正常的 exec 目标规则，并且仅当已配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提升模式是分开的。它仅为经过授权的发送者调整每次会话的 exec 默认值。

控制门禁：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送方白名单：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

请参阅 [提升模式](/zh/tools/elevated)。

## 常见的“沙箱隔离”修复方法

### “工具 X 被沙箱工具策略阻止”

修复键（任选其一）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或针对每个代理 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许该工具：
  - 将其从 `tools.sandbox.tools.deny` 中移除（或针对每个代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或针对每个代理的允许列表）

### “我以为这是 main，为什么它被沙箱隔离了？”

在 `"non-main"` 模式下，组/渠道键*不是* main。使用主会话键（由 `sandbox explain` 显示）或将模式切换到 `"off"`。

## 相关

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools) -- 针对每个代理的覆盖和优先级
- [提升模式](/zh/tools/elevated)
