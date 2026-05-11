---
summary: "Exec 工具 usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec 工具"
---

在工作区中运行 Shell 命令。支持通过 `process` 进行前台 + 后台执行。
如果 `process` 不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话的作用域限于每个代理；`process` 只能看到来自同一代理的会话。

## 参数

<ParamField path="command" type="string" required>
  要运行的 Shell 命令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  命令的工作目录。
</ParamField>

<ParamField path="env" type="object">
  键值对环境变量覆盖，将合并到继承的环境变量之上。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  在此延迟（毫秒）后自动将命令置于后台。
</ParamField>

<ParamField path="background" type="boolean" default="false">
  立即将命令置于后台，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  覆盖为此调用配置的 exec 超时时间。仅当命令应无 exec 进程超时运行时，才设置 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  在可用时在伪终端中运行。用于仅限 TTY 的 CLI、编码代理和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  执行位置。当沙箱运行时处于活动状态时，`auto` 解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  `gateway` / `node` 执行的强制执行模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  `gateway` / `node` 执行的批准提示行为。
</ParamField>

<ParamField path="node" type="string">
  当 `host=node` 时的节点 ID/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  请求提升模式——逃离沙箱至配置的主机路径。`security=full` 仅在提升解析为 `full` 时被强制执行。
</ParamField>

注意事项：

- `host` 默认为 `auto`：当沙箱运行时对该会话激活时为沙箱，否则为网关。
- `auto` 是默认路由策略，并非通配符。允许从 `auto` 进行每次调用的 `host=node`；仅当没有激活沙箱运行时时才允许每次调用的 `host=gateway`。
- 在没有额外配置的情况下，`host=auto` 仍然“正常工作”：没有沙箱意味着它解析为 `gateway`；实时沙箱意味着它停留在沙箱中。
- `elevated` 逃离沙箱至配置的主机路径：默认为 `gateway`，或当 `tools.exec.host=node` 时（或会话默认为 `host=node`）为 `node`。它仅在为当前会话/提供商启用提升访问权限时可用。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个配对的节点（伴侣应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧版 `nodes.run` 封装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、网关、沙箱和节点 `system.run` 执行。如果省略，OpenClaw 将使用 `tools.exec.timeoutSec`；显式的 `timeout: 0` 将禁用该调用的执行进程超时。
- 在非 Windows 主机上，exec 在设置了 `SHELL` 时会使用它；如果 `SHELL` 为 `fish`，它优先从 `PATH` 中选择 `bash`（或 `sh`）以避免与 fish 不兼容的脚本，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先使用 PowerShell 7 (`pwsh`) 发现（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 会拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`)，以防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境（包括 PTY 和沙箱执行）中设置 `OPENCLAW_SHELL=exec`，以便 shell/配置文件规则可以检测 exec 工具上下文。
- 重要提示：沙箱隔离**默认关闭**。如果关闭沙箱隔离，隐式 `host=auto` 将解析为 `gateway`。显式 `host=sandbox` 仍将失败关闭，而不是在网关主机上静默运行。请启用沙箱隔离或使用带有审批的 `host=gateway`。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过该文件的预检。
- 对于从现在开始长时间运行的工作，请启动一次并依赖自动完成唤醒，当它被启用且命令发出输出或失败时。使用 `process` 查看日志、状态、输入或进行干预；不要使用 sleep 循环、超时循环或重复轮询来模拟调度。
- 对于应该稍后发生或按计划进行的工作，请使用 cron 而不是 `exec` sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：为 true 时，后台执行的会话将排队一个系统事件并在退出时请求一次心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当需要审批的 exec 运行时间超过此值时，发出单个“running”通知（0 表示禁用）。
- `tools.exec.timeoutSec`（默认值：1800）：每个命令的默认 exec 超时时间（秒）。每次调用 `timeout` 会覆盖它；每次调用 `timeout: 0` 会禁用 exec 进程超时。
- `tools.exec.host`（默认值：`auto`；当沙箱运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`）
- `tools.exec.security`（默认值：沙箱为 `deny`，如果未设置则为 gateway + node 为 `full`）
- `tools.exec.ask`（默认值：`off`）
- 对于 gateway + node，无审批的主机 exec 是默认设置。如果您希望获得审批/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；请参阅 [Exec approvals](/zh/tools/exec-approvals#no-approval-yolo-mode)。
- YOLO 来自主机策略默认值（`security=full`，`ask=off`），而不是来自 `host=auto`。如果您想强制使用 gateway 或 node 路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主机 exec 直接遵循配置的策略；没有额外的启发式命令混淆预过滤器或脚本预检拒绝层。
- `tools.exec.node`（默认值：未设置）
- `tools.exec.strictInlineEval` (默认: false): 为 true 时，内联解释器求值形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始终需要显式批准。`allow-always` 仍可持久化良性解释器/脚本调用，但内联求值形式每次仍会提示。
- `tools.exec.pathPrepend`: 在 exec 运行时要前置到 `PATH` 的目录列表（仅限网关 + 沙箱）。
- `tools.exec.safeBins`: 仅限 stdin 的安全二进制文件，可在无需显式允许列表条目的情况下运行。有关行为详情，请参阅 [安全二进制文件](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`: 用于 `safeBins` 路径检查的其他受信任显式目录。`PATH` 条目永远不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`: 每个安全二进制文件的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

示例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### PATH 处理

- `host=gateway`: 将您的登录 shell `PATH` 合并到 exec 环境中。主机执行会拒绝
  `env.PATH` 覆盖。守护进程本身仍以最小的 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux: `/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`: 在容器内运行 `sh -lc` (登录 shell)，因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 在配置文件 sourcing 之后，通过一个内部环境变量（无 shell 插值）在 `env.PATH` 前添加前缀；
  此处也适用 `tools.exec.pathPrepend`。
- `host=node`: 只有您传递的非被阻止的环境变量覆盖项才会被发送到节点。`env.PATH` 覆盖项
  在主机执行时会被拒绝，并被节点主机忽略。如果您在节点上需要额外的 PATH 条目，
  请配置节点主机服务环境 (systemd/launchd) 或将工具安装在标准位置。

Per-agent node binding (use the agent list index in config):

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI: the Nodes tab includes a small “Exec node binding” panel for the same settings.

## Session overrides (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每会话 (per-会话)** 的默认值。
发送不带参数的 `/exec` 以显示当前值。

Example:

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Authorization 模型

`/exec` 仅对**授权发送者**（渠道允许列表/配对加上 `commands.useAccessGroups`）有效。
它仅更新**会话状态**，不会写入配置。要彻底禁用 exec，请通过工具
策略（`tools.deny: ["exec"]` 或每代理）拒绝它。除非您显式设置了
`security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec approvals (companion app / node host)

沙箱隔离代理在 `exec` 于网关或节点主机上运行之前，可能需要每次请求的批准。
有关策略、允许列表和 UI 流程，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 ID。一旦获批（或被拒绝/超时），
Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 后仍在运行，则会发出一条 `Exec running` 通知。
在具有原生审批卡片/按钮的频道上，Agent 应首先依赖该
原生 UI，仅当工具结果明确说明聊天审批不可用或手动审批是
唯一途径时，才包含手动 `/approve` 命令。

## Allowlist + safe bins

手动 allowlist 强制执行会匹配解析的二进制路径 glob 和纯命令名
glob。纯名称仅匹配通过 PATH 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配
`/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。
当 `security=allowlist` 时，仅当每个管道
段都已加入 allowlist 或属于 safe bin 时，shell 命令才会被自动允许。链接（`;`、`&&`、`||`）和重定向
在 allowlist 模式下会被拒绝，除非每个顶层段都满足
allowlist（包括 safe bin）。重定向仍然不受支持。
持久的 `allow-always` 信任不能绕过该规则：链接的命令仍然要求每个
顶层段都匹配。

`autoAllowSkills` 是 exec 审批中一个单独的便捷路径。它不同于
手动路径 allowlist 条目。为了严格显式信任，请保持 `autoAllowSkills` 禁用。

请使用这两个控件来处理不同的任务：

- `tools.exec.safeBins`：仅限 stdin 的小型流过滤器。
- `tools.exec.safeBinTrustedDirs`：用于 safe-bin 可执行路径的显式额外受信任目录。
- `tools.exec.safeBinProfiles`：针对自定义 safe bin 的显式 argv 策略。
- allowlist：针对可执行路径的显式信任。

不要将 `safeBins` 视为通用允许列表，并且不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果需要这些，请使用显式的允许列表条目并保持批准提示启用。
`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少显式配置文件时发出警告，而 `openclaw doctor --fix` 可以搭建缺失的自定义 `safeBinProfiles` 条目。
`openclaw security audit` 和 `openclaw doctor` 还会在您显式地将广泛行为的二进制文件（如 `jq`）重新添加到 `safeBins` 时发出警告。
如果您显式地允许解释器，请启用 `tools.exec.strictInlineEval`，以便内联代码求值表单仍然需要新的批准。

有关完整的策略详情和示例，请参阅 [Exec 批准](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [安全二进制文件与允许列表](/zh/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

## 示例

前台运行：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台运行 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

轮询用于按需状态，而不是等待循环。如果启用了自动完成唤醒，当命令输出内容或失败时，它可以唤醒会话。

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

提交（仅发送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认加括号）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。
默认情况下，它对 OpenAI 和 OpenAI Codex 模型启用。仅当您想禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

说明：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式地允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 以禁用 OpenAI 模型的工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限制在工作区内）。仅当您有意让 `apply_patch` 在工作区目录之外进行写入/删除时，才将其设置为 `false`。

## 相关

- [Exec Approvals](/zh/tools/exec-approvals) — Shell 命令的审批门槛
- [沙箱隔离](/zh/gateway/sandboxing) — 在沙箱隔离环境中运行命令
- [Background Process](/zh/gateway/background-process) — 长期运行的执行和进程工具
- [Security](/zh/gateway/security) — 工具策略和提升访问权限
