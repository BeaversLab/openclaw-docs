---
summary: "Exec 工具使用说明、stdin 模式和 TTY 支持"
read_when:
  - 使用或修改 exec 工具
  - 调试 stdin 或 TTY 行为
title: "Exec 工具"
---

# Exec 工具

在工作区中运行 shell 命令。支持通过 `process` 进行前台 + 后台执行。
如果 `process` 不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话按 代理（agent）限定作用域；`process` 只能看到来自同一代理的会话。

## 参数

- `command` (必需)
- `workdir` (默认为 cwd)
- `env` (键/值覆盖)
- `yieldMs` (默认 10000)：延迟后自动后台运行
- `background` (布尔值)：立即后台运行
- `timeout` (秒，默认 1800)：到期时终止
- `pty` (布尔值)：在可用时在伪终端中运行 (仅限 TTY 的 CLI、编码代理、终端 UI)
- `host` (`sandbox | gateway | node`)：执行位置
- `security` (`deny | allowlist | full`)：`gateway`/`node` 的强制模式
- `ask` (`off | on-miss | always`)：`gateway`/`node` 的批准提示
- `node` (字符串)：用于 `host=node` 的节点 ID/名称
- `elevated` (布尔值)：请求提升模式 (网关主机)；仅当提升结果为 `full` 时才强制 `security=full`

说明：

- `host` 默认为 `sandbox`。
- 当关闭沙箱隔离 时，`elevated` 将被忽略 (exec 已在主机上运行)。
- `gateway`/`node` 的批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个已配对的节点 (配套应用 或无头节点主机)。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- 在非 Windows 主机上，exec 在设置了 `SHELL` 时会使用它；如果 `SHELL` 为 `fish`，它会优先从 `PATH` 中选择 `bash`（或 `sh`），以避免与 fish 不兼容的脚本，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先查找 PowerShell 7 (`pwsh`)（Program Files、ProgramW6432，然后是 PATH），然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 会拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`)，以防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境（包括 PTY 和沙箱执行）中设置 `OPENCLAW_SHELL=exec`，以便 shell/配置文件规则可以检测 exec 工具上下文。
- 重要：沙箱隔离**默认关闭**。如果沙箱隔离关闭且显式配置/请求了 `host=sandbox`，exec 现在将失败关闭，而不是在网关主机上静默运行。请启用沙箱隔离或使用带有审批的 `host=gateway`。
- 脚本预检查（针对常见的 Python/Node shell 语法错误）仅检查有效 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过该文件的预检查。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：为 true 时，后台 exec 会话将排队一个系统事件并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当需要审批的 exec 运行时间超过此值时，发出单个“running”通知（0 表示禁用）。
- `tools.exec.host`（默认值：`sandbox`）
- `tools.exec.security`（默认值：对于沙箱为 `deny`，未设置时对于网关 + 节点为 `allowlist`）
- `tools.exec.ask`（默认值：`on-miss`）
- `tools.exec.node` (默认：未设置)
- `tools.exec.pathPrepend`: 要添加到 `PATH` 前面的目录列表，用于 exec 运行（仅限网关 + 沙箱）。
- `tools.exec.safeBins`: 仅限 stdin 的安全二进制文件，无需明确的允许列表条目即可运行。有关行为详细信息，请参阅 [Safe bins](/zh/tools/exec-approvals#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`: 受信任用于 `safeBins` 路径检查的其他显式目录。`PATH` 条目绝不会自动受信。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`: 每个安全 bin 的可选自定义 argv 策略 (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`)。

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

- `host=gateway`: 将您的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖对于主机执行将被拒绝。守护进程本身仍以最小的 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: 在容器内运行 `sh -lc` (登录 shell)，因此 `/etc/profile` 可能会重置 `PATH`。OpenClaw 通过内部环境变量（无 shell 插值）在获取配置文件后添加 `env.PATH`；`tools.exec.pathPrepend` 也适用于此处。
- `host=node`: 只有您传递的未受阻止的环境覆盖才会发送到节点。`env.PATH` 覆盖对于主机执行将被拒绝，并被节点主机忽略。如果您在节点上需要额外的 PATH 条目，请配置节点主机服务环境 (systemd/launchd) 或将工具安装在标准位置。

每代理节点绑定（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制界面：Nodes 选项卡包含一个小的“Exec node binding”面板，用于设置相同的内容。

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**逐会话**默认值。
发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发送者**（渠道允许列表/配对加上 `commands.useAccessGroups`）有效。
它**仅更新会话状态**而不写入配置。要彻底禁用 exec，请通过工具策略（`tools.deny: ["exec"]` 或每个代理）拒绝它。除非您明确设置了
`security=full` 和 `ask=off`，否则主机审批仍然适用。

## Exec 审批（配套应用 / 节点主机）

沙箱隔离的代理可以要求在 `exec` 于网关或节点主机上运行之前进行每次请求的审批。
有关策略、允许列表和 UI 流程，请参阅 [Exec 审批](/zh/tools/exec-approvals)。

当需要审批时，exec 工具会立即返回
`status: "approval-pending"` 和一个审批 ID。一旦获得批准（或被拒绝 / 超时），
Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 后仍在运行，则会发出一条 `Exec running` 通知。

## 允许列表 + 安全回收站

手动允许列表强制执行**仅匹配已解析的二进制路径**（不匹配基本名称）。当
`security=allowlist` 时，仅当每个管道段都
在允许列表中或是安全回收站时，Shell 命令才会自动获得允许。链接（`;`、`&&`、`||`）和重定向在
允许列表模式下会被拒绝，除非每个顶层段都满足允许列表（包括安全回收站）。
重定向仍然不受支持。

`autoAllowSkills` 是 exec 批准中一个独立的便捷路径。它与手动路径允许列表条目不同。若要严格明确信任，请保持 `autoAllowSkills` 禁用。

使用这两个控件来处理不同的任务：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：为安全 bin 可执行路径明确指定的额外受信目录。
- `tools.exec.safeBinProfiles`：针对自定义安全 bin 的明确 argv 策略。
- allowlist：针对可执行路径的明确信任。

不要将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果需要这些，请使用明确的允许列表条目并保持批准提示已启用。
`openclaw security audit` 会在解释器/运行时 `safeBins` 条目缺少明确配置文件时发出警告，而 `openclaw doctor --fix` 可以构建缺失的自定义 `safeBinProfiles` 条目。

有关完整的策略详细信息和示例，请参阅 [Exec 批准](/zh/tools/exec-approvals#safe-bins-stdin-only) 和 [安全 bin 与允许列表对比](/zh/tools/exec-approvals#safe-bins-versus-allowlist)。

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

粘贴（默认使用括号）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch（实验性功能）

`apply_patch` 是 `exec` 的一个子工具，用于结构化多文件编辑。
请显式启用它：

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

注意事项：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["exec"]` 隐式允许 `apply_patch`。
- 配置位于 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限于工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外进行写入/删除操作时，才将其设置为 `false`。

import zh from "/components/footer/zh.mdx";

<zh />
