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
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅执行的逃生手段**，用于在沙箱隔离时在沙箱之外运行（默认为 `gateway`，或者当执行目标配置为 `node` 时为 `node`）。

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

沙箱隔离由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有内容在主机上运行。
- `"non-main"`：仅非主会话进行沙箱隔离（这是群组/频道的常见“意外”）。
- `"all"`：所有内容均进行沙箱隔离。

有关完整矩阵（范围、工作区挂载、镜像），请参阅 [沙箱隔离](/en/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` _穿透_ 沙箱文件系统：你挂载的任何内容都将以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写；对于源代码/机密，首选 `:ro`。
- `scope: "shared"` 忽略特定代理的挂载（仅全局挂载适用）。
- OpenClaw 对绑定源进行两次验证：首先是在标准化源路径上，然后是在通过最深的现有祖先解析后再次验证。符号链接父级逃逸无法绕过阻塞路径或允许根目录检查。
- 不存在的叶路径仍然会被安全检查。如果 `/workspace/alias-out/new-file` 通过符号链接父级解析到阻塞路径或配置的允许根目录之外，该绑定将被拒绝。
- 绑定 `/var/run/docker.sock` 实际上是将主机控制权移交给沙箱；请仅在有意为之时这样做。
- 工作区访问 (`workspaceAccess: "ro"`/`"rw"`) 独立于绑定模式。

## 工具策略：哪些工具存在/可调用

有两个重要的层级：

- **工具配置**：`tools.profile` 和 `agents.list[].tools.profile`（基础允许列表）
- **提供商工具配置**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/特定代理工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider 工具 policy**: `tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱 工具 policy** (仅适用于沙箱隔离时): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，其他所有内容将被视为被阻止。
- 工具策略是硬性限制：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
  Provider 工具 keys 接受 `provider` (例如 `google-antigravity`) 或 `provider/model` (例如 `openai/gpt-5.4`)。

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

- `group:runtime`: `exec`, `process`, `code_execution` (`bash` 被接受为
  `exec` 的别名)
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`
- `group:media`: `image`, `image_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有内置的 OpenClaw 工具（不包括提供商插件）

## 提升：仅限 exec 的“在主机上运行”

提升**不**授予额外的工具；它仅影响 `exec`。

- 如果您处于沙箱隔离状态，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在沙箱之外运行（可能仍需批准）。
- 使用 `/elevated full` 跳过该会话的 exec 批准。
- 如果您已经在直接运行，提升实际上是一个空操作（仍然受限）。
- 提升**不**限定于技能范围，并且**不**覆盖工具允许/拒绝设置。
- 提升不授予来自 `host=auto` 的任意跨主机覆盖；它遵循正常的 exec 目标规则，并且仅当配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提升是分开的。它仅为授权的发送者调整每个会话的 exec 默认值。

门控：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参见 [提升模式](/en/tools/elevated)。

## 常见的“沙箱监狱”修复方法

### “工具 X 被沙箱工具策略阻止”

修复密钥（选择一个）：

- 禁用沙箱：`agents.defaults.sandbox.mode=off`（或每个代理 `agents.list[].sandbox.mode=off`）
- 在沙箱内允许该工具：
  - 将其从 `tools.sandbox.tools.deny` 中移除（或每个代理 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或每个代理允许）

### “我以为这是主环境，为什么它是沙箱隔离的？”

在 `"non-main"` 模式下，group/渠道 键*不是* main。请使用主 会话 键（由 `sandbox explain` 显示）或将模式切换为 `"off"`。

## 另请参阅

- [沙箱隔离](/en/gateway/sandboxing) -- 完整的沙箱参考（模式、作用域、后端、镜像）
- [多代理沙箱与工具](/en/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖和优先级
- [提升模式](/en/tools/elevated)
