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
- `host` (`sandbox | gateway | node`)：执行位置
- `security` (`deny | allowlist | full`)：针对 `gateway`/`node` 的强制执行模式
- `ask` (`off | on-miss | always`)：针对 `gateway`/`node` 的审批提示
- `node`（字符串）：用于 `host=node` 的节点 ID/名称
- `elevated`（布尔值）：请求提升模式（网关主机）；仅当提升解析为 `full` 时才强制 `security=full`

备注：

- `host` 默认为 `sandbox`。
- 当沙箱关闭时，`elevated` 会被忽略（exec 已在主机上运行）。
- `gateway`/`node` 审批由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个配对节点（伴侣应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择其中一个。
- 在非 Windows 主机上，exec 在设置时使用 `SHELL`；如果 `SHELL` 是 `fish`，它会优先选择 `bash`（或 `sh`）
  来自 `PATH` 以避免不兼容 fish 的脚本，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先选择 PowerShell 7 (`pwsh`) 发现（Program Files、ProgramW6432，然后是 PATH），
  然后回退到 Windows PowerShell 5.1。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境（包括 PTY 和沙盒执行）中设置 `OPENCLAW_SHELL=exec`，以便 shell/profile 规则可以检测 exec-工具 上下文。
- 重要提示：沙箱隔离**默认关闭**。如果沙箱隔离关闭且明确配置/请求了 `host=sandbox`，exec 现在将失败关闭，而不是在网关主机上静默运行。请启用沙箱隔离或使用带有审批的 `host=gateway`。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过该文件的预检。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：为 true 时，后台 exec 会话将排队一个系统事件并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当需要审批的 exec 运行时间超过此值时，发出单个“正在运行”通知（0 表示禁用）。
- `tools.exec.host`（默认值：`sandbox`）
- `tools.exec.security`（默认值：sandbox 为 `deny`，未设置时 gateway + node 为 `allowlist`）
- `tools.exec.ask`（默认值：`on-miss`）
- `tools.exec.node`（默认值：未设置）
- `tools.exec.strictInlineEval`（默认值：false）：当为 true 时，内联解释器 eval 形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始终需要显式批准，并且永远不会被 `allow-always` 持久化。
- `tools.exec.pathPrepend`：要在 exec 运行（仅限网关 + 沙盒）的 `PATH` 前添加的目录列表。
- `tools.exec.safeBins`：仅限 stdin 的安全二进制文件，无需明确的允许列表条目即可运行。有关行为详细信息，请参阅[安全二进制文件](/en/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：针对 `safeBins` 路径检查受信任的其他显式目录。`PATH` 条目永远不会自动受信任。内置默认值为 `/bin` 和 `/usr/bin`。
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

- `host=gateway`：将您的登录 shell `PATH` 合并到 exec 环境中。对于主机执行，会拒绝 `env.PATH` 覆盖。守护进程本身仍以最小的 `PATH` 运行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 在通过内部环境变量获取配置文件后前置 `env.PATH`（无 shell 插值）；
  `tools.exec.pathPrepend` 也适用于此处。
- `host=node`：只有您传递的未被阻止的环境变量覆盖项才会发送到节点。`env.PATH` 覆盖项在主机执行时被拒绝，并被节点主机忽略。如果您在节点上需要额外的 PATH 条目，请配置节点主机服务环境（systemd/launchd）或将工具安装在标准位置。

按代理绑定节点（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：节点选项卡包含一个用于相同设置的小型“Exec 节点绑定”面板。

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每次会话**的默认值。
发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**经过授权的发送者**（渠道允许列表/配对加上 `commands.useAccessGroups`）有效。
它仅更新**会话状态**而不写入配置。要彻底禁用 exec，请通过工具策略（`tools.deny: ["exec"]` 或按代理）拒绝它。除非您明确设置了 `security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec 批准（配套应用 / 节点主机）

沙箱隔离的代理可以在 `exec` 于网关或节点主机上运行之前要求每次请求都获得批准。
有关策略、允许列表和 UI 流程，请参阅[执行批准](/en/tools/exec-approvals)。

当需要批准时，exec 工具会立即返回 `status: "approval-pending"` 和一个批准 ID。一旦获得批准（或被拒绝/超时），Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果在 `tools.exec.approvalRunningNoticeMs` 后命令仍在运行，则会发出一个 `Exec running` 通知。

## 允许列表 + 安全二进制文件

手动允许列表执行仅匹配**解析后的二进制路径**（不匹配基本名称）。当
`security=allowlist` 时，仅当每个管道段
都在允许列表中或者是安全二进制文件时，Shell 命令才会被自动允许。在允许列表模式下，链接（`;`、`&&`、`||`）和重定向会被拒绝，除非每个顶级段都满足允许列表（包括安全二进制文件）。
重操作仍然不受支持。

`autoAllowSkills` 是 exec 批准中一个独立的便捷路径。它与
手动路径允许列表条目不同。为了严格的显式信任，请保持 `autoAllowSkills` 禁用。

使用这两个控件来处理不同的工作：

- `tools.exec.safeBins`：小型、仅标准输入（stdin）的流过滤器。
- `tools.exec.safeBinTrustedDirs`：用于安全二进制可执行文件路径的显式额外受信任目录。
- `tools.exec.safeBinProfiles`：针对自定义安全二进制文件的显式 argv 策略。
- allowlist：针对可执行文件路径的显式信任。

不要将 `safeBins` 视为通用允许列表，并且不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些，请使用显式允许列表条目并保持批准提示启用。
当解释器/运行时 `safeBins` 条目缺少显式配置文件时，`openclaw security audit` 会发出警告，而 `openclaw doctor --fix` 可以搭建缺失的自定义 `safeBinProfiles` 条目。
当您明确将具有广泛行为的二进制文件（例如 `jq`）重新添加到 `safeBins` 中时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。
如果您明确允许列出了解释器，请启用 `tools.exec.strictInlineEval`，以便内联代码评估表单仍然需要新的批准。

有关完整的策略详细信息和示例，请参阅[执行批准](/en/tools/exec-approvals#safe-bins-stdin-only)和[安全二进制文件与允许列表](/en/tools/exec-approvals#safe-bins-versus-allowlist)。

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

粘贴（默认带括号）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。
对于 OpenAI 和 OpenAI Codex 模型，默认启用该工具。仅当您想要
禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

注意事项：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 以禁用 OpenAI 模型的此工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作空间内）。仅当您有意希望 `apply_patch` 在工作空间目录之外写入/删除时，才将其设置为 `false`。
