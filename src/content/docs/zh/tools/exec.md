---
summary: "Exec 工具 usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec Tool"
---

# Exec 工具

在工作区中运行 shell 命令。通过 `process` 支持前台和后台执行。
如果 `process` 被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话按代理作用域划分；`process` 只能看到来自同一代理的会话。

## 参数

- `command`（必需）
- `workdir`（默认为 cwd）
- `env`（键/值覆盖）
- `yieldMs`（默认 10000）：延迟后自动后台运行
- `background`（布尔值）：立即后台运行
- `timeout`（秒，默认 1800）：到期时终止
- `pty`（布尔值）：在可用时在伪终端中运行（仅限 TTY 的 CLI、编码代理、终端 UI）
- `host` (`auto | sandbox | gateway | node`): 在何处执行
- `security` (`deny | allowlist | full`)：针对 `gateway`/`node` 的强制执行模式
- `ask` (`off | on-miss | always`)：针对 `gateway`/`node` 的审批提示
- `node`（字符串）：用于 `host=node` 的节点 ID/名称
- `elevated` (bool)：请求提升模式（逃离沙箱至配置的主机路径）；仅当 elevated 解析为 `full` 时，才会强制执行 `security=full`

备注：

- `host` 默认为 `auto`: 当会话激活沙箱运行时时为沙箱，否则为网关。
- `auto` 是默认的路由策略，而非通配符。允许从 `auto` 进行每次调用 `host=node`；仅当没有沙箱运行时处于活动状态时，才允许每次调用 `host=gateway`。
- 在没有额外配置的情况下，`host=auto` 仍然“正常工作”：没有沙箱意味着它解析为 `gateway`；活跃的沙箱意味着它停留在沙箱中。
- `elevated` 逃离沙箱至配置的主机路径：默认为 `gateway`，或者当 `tools.exec.host=node` 时（或会话默认值为 `host=node`）为 `node`。仅当为当前会话/提供商启用了提升访问权限时，它才可用。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个配对的节点（配套应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 包装器已被移除。
- 在非 Windows 主机上，如果设置了 exec，则使用 `SHELL`；如果 `SHELL` 是 `fish`，它优先使用 `PATH` 中的 `bash`（或 `sh`）以避免不兼容 fish 的脚本，如果都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7 (`pwsh`)（Program Files、ProgramW6432，然后是 PATH），
  然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 会拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`) 以
  防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境（包括 PTY 和沙箱执行）中设置 `OPENCLAW_SHELL=exec`，以便 shell/配置文件规则可以检测 exec 工具上下文。
- 重要提示：沙箱隔离**默认关闭**。如果关闭沙箱隔离，隐式的 `host=auto`
  将解析为 `gateway`。显式的 `host=sandbox` 仍将失败关闭，而不是静默
  在网关主机上运行。请启用沙箱隔离或使用带有审批功能的 `host=gateway`。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过对该文件的预检。
- 对于现在开始的长时工作，请启动一次并依赖自动
  完成唤醒（当其启用且命令发出输出或失败时触发）。
  使用 `process` 查看日志、状态、输入或进行干预；不要使用
  sleep 循环、timeout 循环或重复轮询来模拟调度。
- 对于应该稍后发生或按计划进行的工作，请使用 cron 而不是
  `exec` 的 sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit` (默认值: true): 当为 true 时，后台执行的会话将排队一个系统事件并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs` (默认值: 10000): 当需要审批的执行运行时间超过此值时，发出一次“运行中”通知（0 表示禁用）。
- `tools.exec.host` (默认值: `auto`; 当沙箱运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`)
- `tools.exec.security` (默认值: 沙箱为 `deny`，未设置时网关 + 节点为 `full`)
- `tools.exec.ask` (默认值: `off`)
- 网关和节点的默认配置是不需要批准的主机执行。如果您想要批准/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；请参阅 [执行批准](/en/tools/exec-approvals#no-approval-yolo-mode)。
- YOLO 来自主机策略默认值（`security=full`、`ask=off`），而不是来自 `host=auto`。如果您想强制使用网关或节点路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主机执行直接遵循配置的策略；没有额外的启发式命令混淆预过滤器。
- `tools.exec.node`（默认值：未设置）
- `tools.exec.strictInlineEval`（默认值：false）：为 true 时，内联解释器求值形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始终需要明确批准。`allow-always` 仍可保留无害的解释器/脚本调用，但内联求值形式每次仍会提示。
- `tools.exec.pathPrepend`：要在执行运行（仅限网关 + 沙盒）时添加到 `PATH` 前面的目录列表。
- `tools.exec.safeBins`：无需明确允许列表条目即可运行的仅 stdin 安全二进制文件。有关行为详情，请参阅 [安全二进制文件](/en/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用于 `safeBins` 路径检查的其他受信任显式目录。`PATH` 条目永远不会自动受信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个安全二进制文件的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`: 将您的登录 shell `PATH` 合并到 exec 环境中。对于主机执行，
  `env.PATH` 覆盖会被拒绝。守护进程本身仍以最小的 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: 在容器内运行 `sh -lc` (登录 shell)，因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 在获取 profile 后通过内部环境变量 (无 shell 插值) 前置 `env.PATH`；
  `tools.exec.pathPrepend` 也适用于此。
- `host=node`: 只有您传递的未被阻止的环境覆盖才会发送到节点。对于主机执行，
  `env.PATH` 覆盖会被拒绝，并被节点主机忽略。如果节点上需要额外的 PATH 条目，
  请配置节点主机服务环境 (systemd/launchd) 或在标准位置安装工具。

Per-agent node binding (use the agent list index in config):

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Control UI: the Nodes tab includes a small “Exec node binding” panel for the same settings.

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每次会话**的默认值。
发送不带参数的 `/exec` 以显示当前值。

Example:

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Authorization 模型

`/exec` 仅对**经过授权的发送者** (渠道允许列表/配对加上 `commands.useAccessGroups`) 有效。
它仅更新**会话状态**，不写入配置。要彻底禁用 exec，请通过工具策略
(`tools.deny: ["exec"]` 或每个代理) 拒绝它。除非您明确设置
`security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec 审批（companion app / node host）

沙箱隔离的代理可能需要在 `exec` 于网关或节点主机上运行之前获得每次请求的批准。
有关策略、允许列表和 UI 流程，请参阅 [Exec 审批](/en/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 ID。一旦获得批准（或被拒绝/超时），
Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 后仍在运行，则会发出一条 `Exec running` 通知。
在具有原生审批卡片/按钮的频道上，代理应首先依赖该
原生 UI，并且仅在工具结果明确说明聊天审批不可用或手动审批是
唯一途径时才包含手动 `/approve` 命令。

## Allowlist + 安全回收站

手动允许列表强制执行仅匹配**已解析的二进制路径**（不匹配基本名称）。当
`security=allowlist` 时，仅当每个管道段都在
allowlist 中或是安全回收站时，shell 命令才会被自动允许。在 allowlist 模式下，链接（`;`、`&&`、`||`）和重定向将被拒绝，
除非每个顶级段都满足 allowlist（包括安全回收站）。
重定向仍然不受支持。
持久的 `allow-always` 信任不能绕过该规则：链接命令仍然需要每个
顶级段都匹配。

`autoAllowSkills` 是 exec 审批中一个单独的便捷路径。它与
手动路径 allowlist 条目不同。为了严格明确的信任，请保持 `autoAllowSkills` 为禁用状态。

使用这两个控件来完成不同的工作：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：针对安全回收站可执行路径的明确额外受信任目录。
- `tools.exec.safeBinProfiles`：针对自定义安全回收站的明确 argv 策略。
- allowlist：针对可执行路径的明确信任。

不要将 `safeBins` 视为通用允许列表，并且不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些，请使用显式的允许列表条目并保持批准提示已启用。
当解释器/运行时 `safeBins` 条目缺少显式配置文件时，`openclaw security audit` 会发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。
当您显式地将行为广泛的二进制文件（例如 `jq`）重新添加到 `safeBins` 时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。
如果您显式地将解释器加入允许列表，请启用 `tools.exec.strictInlineEval`，以便内联代码评估表单仍然需要新的批准。

有关完整的策略详情和示例，请参阅 [执行批准](/en/tools/exec-approvals#safe-bins-stdin-only) 和 [安全 bin 与允许列表](/en/tools/exec-approvals#safe-bins-versus-allowlist)。

## 示例

前台：

```json
{ "tool": "exec", "command": "ls -la" }
```

后台 + 轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

轮询用于按需状态，而不是等待循环。如果启用了自动完成唤醒，命令在发出输出或失败时可以唤醒会话。

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

粘贴（默认使用括号）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用于结构化的多文件编辑。
默认情况下，它针对 OpenAI 和 OpenAI Codex 模型启用。仅当您想要禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.4"] },
    },
  },
}
```

备注：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 可为 OpenAI 模型禁用此工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（工作区内）。仅在您有意让 `apply_patch` 在工作区目录之外进行写入/删除时，才将其设置为 `false`。

## 相关

- [Exec Approvals](/en/tools/exec-approvals) — Shell 命令的审批门控
- [沙箱隔离](/en/gateway/sandboxing) — 在沙箱隔离环境中运行命令
- [Background Process](/en/gateway/background-process) — 长期运行的 exec 和进程工具
- [Security](/en/gateway/security) — 工具策略和提升访问权限
