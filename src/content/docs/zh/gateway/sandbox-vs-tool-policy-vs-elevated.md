---
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略以及提升执行门控"
title: 沙箱 vs 工具策略 vs 提升（Elevated）
read_when: "遇到了“沙箱监牢”错误或看到工具/提升执行被拒绝，并且想要更改确切的配置键。"
status: 活跃
---

OpenClaw 有三个相关（但不同）的控制机制：

1. **沙箱**（`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`）决定**工具在哪里运行**（沙箱后端还是主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.list[].tools.*`）决定**哪些工具可用/被允许**。
3. **Elevated**（`tools.elevated.*`、`agents.list[].tools.elevated.*`）是一个**仅执行的应急方案**，用于在您处于沙箱隔离状态时在沙箱外部运行（默认为 `gateway`，或者当执行目标配置为 `node` 时为 `node`）。

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
- `"non-main"`：仅非主会话会被沙箱隔离（这是群组/频道常见的“意外”情况）。
- `"all"`：所有内容都被沙箱隔离。

有关完整矩阵（范围、工作区挂载、镜像），请参阅[沙箱隔离](/zh/gateway/sandboxing)。

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
- 工具策略按名称过滤工具的可用性；它不检查 `exec` 内部的副作用。如果允许 `exec`，则拒绝 `write`、`edit` 或 `apply_patch` 并不会使 shell 命令变为只读。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
  提供程序工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

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

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 被接受为
  `exec` 的别名）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
  对于只读代理，请拒绝 `group:runtime` 以及可变文件系统工具，除非沙箱文件系统策略或单独的主机边界强制执行只读约束。
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `heartbeat_respond`, `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`, `update_plan`
- `group:media`: `image`, `image_generate`, `music_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有内置 OpenClaw 工具（不包括提供商插件）

## 提升权限：仅执行的“在主机上运行”

提升权限**不**授予额外的工具；它仅影响 `exec`。

- 如果您处于沙箱隔离状态，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在沙箱之外运行（可能仍需批准）。
- 使用 `/elevated full` 以跳过该会话的执行批准。
- 如果您已经以直接模式运行，提升权限实际上是无操作（仍然受控）。
- 提升权限**不**作用于技能范围，并且**不**覆盖工具允许/拒绝设置。
- 提升权限不授予来自 `host=auto` 的任意跨主机覆盖；它遵循正常的执行目标规则，并且仅在配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提升权限是分开的。它仅为授权发送者调整每次会话的执行默认值。

控制条件：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送方允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

请参阅[提升模式](/zh/tools/elevated)。

## 常见的“沙箱监狱”修复方法

### “工具 X 被沙箱工具策略阻止”

修复密钥（选择其一）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或每个代理 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许该工具：
  - 将其从 `tools.sandbox.tools.deny` 中移除（或每个代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或每个代理允许列表）

### “我以为这是 main，为什么它是沙箱隔离的？”

在 `"non-main"` 模式下，组/渠道密钥 _不是_ main。使用主会话密钥（由 `sandbox explain` 显示）或将模式切换为 `"off"`。

## 相关

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖和优先级
- [提升模式](/zh/tools/elevated)
