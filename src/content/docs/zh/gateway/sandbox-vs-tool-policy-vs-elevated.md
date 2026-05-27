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
- 当工具策略步骤移除工具或沙箱工具策略阻止调用时，Gateway(网关)日志会包含 Gateway(网关)`agents/tool-policy` 审计条目。使用 `openclaw logs` 可查看规则标签、配置键和受影响的工具名称。

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

- `group:runtime`: `exec`, `process`, `code_execution`（`bash` 被接受为
  `exec` 的别名）
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
  对于只读代理，请拒绝 `group:runtime` 以及可变文件系统工具，除非沙箱文件系统策略或独立的主机边界强制执行只读约束。
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `heartbeat_respond`, `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`, `update_plan`
- `group:media`：`image`、`image_generate`、`music_generate`、`video_generate`、`tts`
- `group:openclaw`OpenClaw：所有 OpenClaw 内置工具（不包括提供商插件）
- `group:plugins`：所有已加载的插件所属工具，包括通过 `bundle-mcp` 暴露的已配置 MCP 服务器

对于沙箱隔离的 MCP 服务器，沙箱工具策略是第二道允许关卡。如果已配置 `mcp.servers` 但沙箱隔离轮次仅显示内置工具，请将 `bundle-mcp`、`group:plugins` 或服务器前缀的 MCP 工具名称/通配符（如 `outlook__send_mail` 或 `outlook__*`）添加到 `tools.sandbox.tools.alsoAllow`，然后重启/重新加载网关并重新捕获工具列表。服务器通配符使用提供商安全的 MCP 服务器前缀：非 `[A-Za-z0-9_-]` 字符变为 `-`，不以字母开头的名称获得 `mcp-` 前缀，过长或重复的前缀可能会被截断或添加后缀。

`openclaw doctor`OpenClaw 目前针对 `mcp.servers` 中 OpenClaw 托管的服务器检查此形态。从捆绑插件清单或 Claude `.mcp.json` 加载的 MCP 服务器使用相同的沙箱关卡，但此诊断尚未枚举这些源；如果它们的工具在沙箱隔离轮次中消失，请使用相同的允许列表条目。

## 提升权限：仅执行“在主机上运行”

提升权限**不**授予额外工具；它仅影响 `exec`。

- 如果您处于沙箱隔离状态，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在沙箱外运行（可能仍需批准）。
- 使用 `/elevated full` 跳过该会话的执行批准。
- 如果您已经直接运行，提升权限实际上是空操作（仍然受限）。
- 提升权限**不**限定于技能范围，也**不**覆盖工具允许/拒绝设置。
- 提升模式（Elevated）并不授予来自 `host=auto` 的任意跨主机覆盖权限；它遵循常规执行目标规则，并且仅在配置的/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提升模式是分开的。它仅为授权发送者调整每次会话的执行默认值。

门槛（Gates）：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者白名单：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参见 [提升模式](/zh/tools/elevated)。

## 常见的“沙箱限制”修复方法

### “工具 X 被沙箱工具策略阻止”

修复键（任选其一）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或针对每个代理 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许该工具：
  - 将其从 `tools.sandbox.tools.deny` 中移除（或针对每个代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或针对每个代理允许）
- 检查 `openclaw logs` 中的 `agents/tool-policy` 条目。它记录了沙箱模式以及是允许还是拒绝规则阻止了该工具。

### “我以为这是主线，为什么它是沙箱隔离的？”

在 `"non-main"` 模式下，组/渠道密钥*不是*主线密钥。请使用主线会话密钥（由 `sandbox explain` 显示）或将模式切换到 `"off"`。

## 相关

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools) -- 针对每个代理的覆盖和优先级
- [提升模式](/zh/tools/elevated)
