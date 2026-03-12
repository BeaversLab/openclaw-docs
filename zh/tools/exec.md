---
summary: "Exec 工具用法、stdin 模式和 TTY 支持"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec 工具"
---

# Exec 工具

在工作区中运行 shell 命令。通过 `process` 支持前台和后台执行。
如果 `process` 不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话的作用域按代理划分；`process` 只能看到来自同一代理的会话。

## 参数

- `command` (必需)
- `workdir` (默认为 cwd)
- `env` (键/值覆盖)
- `yieldMs` (默认 10000)：延迟后自动后台运行
- `background` (布尔值)：立即后台运行
- `timeout` (秒，默认 1800)：到期时终止
- `pty` (布尔值)：在可用时于伪终端中运行 (仅 TTY 的 CLI、编码代理、终端 UI)
- `host` (`sandbox | gateway | node`)：执行位置
- `security` (`deny | allowlist | full`)：`gateway`/`node` 的执行模式
- `ask` (`off | on-miss | always`)：`gateway`/`node` 的批准提示
- `node` (字符串)：`host=node` 的节点 ID/名称
- `elevated` (布尔值)：请求提升模式 (网关主机)；仅当提升解析为 `full` 时，才会强制 `security=full`

备注：

- `host` 默认为 `sandbox`。
- 当沙盒关闭时，`elevated` 会被忽略 (exec 已在主机上运行)。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要配对节点 (配套应用或无头节点主机)。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- 在非 Windows 主机上，如果设置了 `SHELL`，exec 会使用它；如果 `SHELL` 为 `fish`，它会优先选择 `bash` (或 `sh`)
  取自 `PATH` 以避免不兼容 fish 的脚本，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7 (`pwsh`)（Program Files、ProgramW6432，然后是 PATH），
  然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 会拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`) 以
  防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和沙盒执行），以便 shell/个人资料规则可以检测 exec-tool 上下文。
- 重要提示：沙盒功能**默认关闭**。如果沙盒关闭且 `host=sandbox` 被明确
  配置/请求，exec 现在将失败关闭，而不是在网关主机上静默运行。
  请启用沙盒或使用 `host=gateway` 并通过批准。
- 脚本预检查（针对常见的 Python/Node shell 语法错误）仅检查
  有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过
  该文件的预检查。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：当为 true 时，后台 exec 会话将系统事件加入队列并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当需要批准的 exec 运行时间超过此值时，发出一次“正在运行”通知（0 表示禁用）。
- `tools.exec.host`（默认值：`sandbox`）
- `tools.exec.security`（默认值：如果未设置，沙盒为 `deny`，网关 + 节点为 `allowlist`）
- `tools.exec.ask`（默认值：`on-miss`）
- `tools.exec.node`（默认值：未设置）
- `tools.exec.pathPrepend`：要前置到 exec 运行的 `PATH` 的目录列表（仅限网关 + 沙盒）。
- `tools.exec.safeBins`：可以在没有显式允许列表条目的情况下运行的仅 stdin 安全二进制文件。有关行为详细信息，请参阅 [安全二进制文件](/zh/en/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用于 `safeBins` 路径检查的其他受信任显式目录。`PATH` 条目永远不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个安全 bin（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）的可选自定义 argv 策略。

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

- `host=gateway`：将您的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖设置
  在主机执行中被拒绝。守护进程本身仍然使用最小的 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux: `/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 在通过配置文件（profile）获取后，通过内部环境变量（无 shell 插值）前置 `env.PATH`；
  `tools.exec.pathPrepend` 也适用于此处。
- `host=node`：只有您传递的未被阻止的环境覆盖设置才会发送到节点。`env.PATH` 覆盖设置
  在主机执行中被拒绝，并被节点主机忽略。如果您需要在节点上添加其他 PATH 条目，
  请配置节点主机服务环境（systemd/launchd）或在标准位置安装工具。

每个代理的节点绑定（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：Nodes 选项卡包含一个小的“Exec node binding”面板，用于进行相同的设置。

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每次会话**的默认值。
发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对 **授权发送者**（通道允许列表/配对以及 `commands.useAccessGroups`）生效。
它仅更新 **会话状态** 而不写入配置。要彻底禁用 exec，请通过工具
策略（`tools.deny: ["exec"]` 或按代理）拒绝它。除非您明确设置
`security=full` 和 `ask=off`，否则主机审批仍然适用。

## Exec 审批（配套应用 / 节点主机）

沙盒代理可以在 `exec` 于网关或节点主机上运行之前要求针对每个请求进行审批。
有关策略、允许列表和 UI 流程，请参阅 [Exec 审批](/zh/en/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 ID。一旦获得批准（或被拒绝/超时），
网关将发出系统事件（`Exec finished` / `Exec denied`）。如果在 `tools.exec.approvalRunningNoticeMs` 后命令仍在
运行，则会发出一个 `Exec running` 通知。

## 允许列表 + 安全二进制文件

手动允许列表执行仅匹配 **已解析的二进制路径**（不匹配基本名称）。当
`security=allowlist` 时，仅当管道的每个部分都
在允许列表中或是安全二进制文件时，shell 命令才会自动获得允许。在
允许列表模式下，链式操作（`;`、`&&`、`||`）和重定向会被拒绝，除非每个顶层部分都满足允许列表（包括安全二进制文件）。
重定向仍然不受支持。

`autoAllowSkills` 是 exec 审批中一个单独的便捷路径。它与
手动路径允许列表条目不同。为了严格明确的信任，请保持 `autoAllowSkills` 禁用。

请将这两个控制项用于不同的用途：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：用于安全二进制可执行路径的明确的额外受信任目录。
- `tools.exec.safeBinProfiles`：用于自定义安全二进制文件的明确 argv 策略。
- allowlist：可执行路径的明确信任。

不要将 `safeBins` 视为通用允许列表，并且不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果需要这些，请使用显式的允许列表条目并保持批准提示已启用。
`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少显式配置文件时发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。

有关完整的策略详细信息和示例，请参阅 [Exec approvals](/zh/en/tools/exec-approvals#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/zh/en/tools/exec-approvals#safe-bins-versus-allowlist)。

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

粘贴（默认使用括号模式）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch (实验性)

`apply_patch` 是 `exec` 的一个子工具，用于结构化多文件编辑。
需显式启用：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

注意：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["exec"]` 隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。
