---
summary: "Exec 工具 usage, stdin modes, and TTY support"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Exec 工具"
---

在工作区中运行 Shell 命令。`exec` 是一个可变的 Shell 表面：只要所选主机或沙箱文件系统允许，命令就可以在任何位置创建、编辑或删除文件。禁用 OpenClaw 文件系统工具（如 `write`、`edit` 或 `apply_patch`）并不会使 `exec` 变为只读。

通过 `process` 支持前台 + 后台执行。如果不允许 `process`，`exec` 将同步运行并忽略 `yieldMs`/`background`。
后台会话按代理（agent）限定范围；`process` 只能看到来自同一代理的会话。

## 参数

<ParamField path="command" type="string" required>
  要运行的 Shell 命令。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  命令的工作目录。
</ParamField>

<ParamField path="env" type="object">
  合并到继承环境之上的键/值环境覆盖项。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  在此延迟（毫秒）后自动将命令置于后台。
</ParamField>

<ParamField path="background" type="boolean" default="false">
  立即将命令置于后台，而不是等待 `yieldMs`。
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  覆盖为此调用配置的 exec 超时时间。仅当命令应不受 exec 进程超时限制运行时，才设置 `timeout: 0`。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  在可用时在伪终端中运行。用于仅限 TTY 的 CLI、编码代理和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  在哪里执行。当沙盒运行时处于活动状态时，`auto` 解析为 `sandbox`，否则解析为 `gateway`。
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  对于普通工具调用会被忽略。`gateway` / `node` 安全性由 `tools.exec.security` 和 `~/.openclaw/exec-approvals.json` 控制；提升模式仅在操作员明确授予提升权限时才能强制执行 `security=full`。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  `gateway` / `node` 执行的批准提示行为。
</ParamField>

<ParamField path="node" type="string">
  当 `host=node` 时的节点 ID/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  请求提升模式 — 逃逸沙箱进入配置的主机路径。仅当提升模式解析为 `full` 时，才会强制 `security=full`。
</ParamField>

备注：

- `host` 默认为 `auto`：如果为会话启用了沙箱运行时，则为沙箱，否则为网关。
- `host` 仅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是一个主机名选择器；类似主机名的值会在命令运行之前被拒绝。
- `auto` 是默认路由策略，而非通配符。允许从 `auto` 进行每次调用的 `host=node`；仅当没有激活的沙箱运行时时，才允许每次调用的 `host=gateway`。
- 无需额外配置，`host=auto` 仍然可以“正常工作”：没有沙箱意味着它解析为 `gateway`；活跃的沙箱意味着它保留在沙箱中。
- `elevated` 转义沙盒到配置的主机路径：默认为 `gateway`，或者当 `tools.exec.host=node`（或会话默认为 `host=node`）时为 `node`。仅当为当前会话/提供商启用提升访问权限时，它才可用。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个配对节点（配套应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择一个。
- `exec host=node` 是节点唯一的 shell 执行路径；旧的 `nodes.run` 封装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、网关、沙箱和节点 `system.run` 执行。如果省略，OpenClaw 将使用 `tools.exec.timeoutSec`；显式的 `timeout: 0` 将禁用该调用的 exec 进程超时。
- 在非 Windows 主机上，如果设置了 `SHELL`，exec 会使用它；如果 `SHELL` 为 `fish`，它会优先使用 `PATH` 中的 `bash`（或 `sh`）以避免与 fish 不兼容的脚本，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7 (`pwsh`)（Program Files、ProgramW6432，然后是 PATH），
  然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`) 以
  防止二进制劫持或注入代码。
- OpenClaw 在生成的命令环境（包括 PTY 和沙盒执行）中设置了 OpenClaw`OPENCLAW_SHELL=exec`，以便 shell/个人资料规则可以检测 exec-工具 上下文。
- `openclaw channels login` 在 `exec` 中被阻止，因为它是一个交互式渠道认证流程；请在网关主机上的终端中运行它，或者在存在时使用聊天中的渠道原生登录工具。
- 重要：沙箱隔离**默认关闭**。如果沙箱隔离关闭，隐式 `host=auto`
  解析为 `gateway`。显式 `host=sandbox` 仍然会失败关闭，而不是在
  网关主机上静默运行。请启用沙箱隔离或使用 `host=gateway` 并配合审批。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）仅检查有效的 `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过对该文件的预检。
- 对于现在开始且长时间运行的工作，只需启动一次，并在其启用且命令发出输出或失败时依赖自动完成唤醒。使用 `process` 查看日志、状态、输入或进行干预；不要使用 sleep 循环、timeout 循环或重复轮询来模拟调度。
- 对于应该稍后发生或按计划进行的工作，请使用 cron 而不是 `exec` 的 sleep/delay 模式。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：当为 true 时，后台执行的 exec 会话将排队一个系统事件，并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当受审批限制的 exec 运行时间超过此值时，发出一次“running”通知（0 表示禁用）。
- `tools.exec.timeoutSec`（默认值：1800）：默认的每条命令执行超时时间（秒）。单次调用 `timeout` 会覆盖此设置；单次调用 `timeout: 0` 会禁用执行进程超时。
- `tools.exec.host`（默认值：`auto`；当沙盒运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`）
- `tools.exec.security`（默认值：对于沙箱为 `deny`，对于网关 + 节点在未设置时为 `full`）
- `tools.exec.ask`（默认值：`off`）
- 网关 + 节点的默认设置是无审批的主机执行。如果您需要审批/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；请参阅 [Exec approvals](/zh/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 来自主机策略默认值（`security=full`，`ask=off`），而不是来自 `host=auto`。如果您想强制网关或节点路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加上 `ask=off` 模式下，主机 exec 直接遵循配置的策略；没有额外的启发式命令混淆预过滤器或脚本预检拒绝层。
- `tools.exec.node`（默认：未设置）
- `tools.exec.strictInlineEval`（默认值：false）：为 true 时，诸如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e` 等内联解释器 eval 形式始终需要显式批准。`allow-always` 仍可保留良性解释器/脚本调用，但内联 eval 形式仍会在每次使用时提示。
- `tools.exec.commandHighlighting` (默认值: false): 当为 true 时，批准提示可以在命令文本中高亮显示解析器衍生的命令范围。全局设置或针对每个代理设置为 `true`，以便在不更改 exec 批准策略的情况下启用命令文本高亮显示。
- `tools.exec.pathPrepend`: 要添加到 `PATH` 前面的目录列表，用于 exec 运行（仅限网关 + 沙盒）。
- `tools.exec.safeBins`：仅 stdin 的安全二进制文件，无需显式允许列表条目即可运行。有关行为详细信息，请参阅 [安全二进制文件](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：用于 `safeBins` 路径检查的其他受信任显式目录。`PATH` 条目永远不会被自动信任。内置默认值为 `/bin` 和 `/usr/bin`。
- `tools.exec.safeBinProfiles`：每个安全 bin 的可选自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。

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

- `host=gateway`: 将您的登录 shell `PATH` 合并到 exec 环境中。主机执行会拒绝 `env.PATH` 覆盖。守护进程本身仍在最小 `PATH` 下运行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux：Linux`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`OpenClaw。
  OpenClaw 在配置文件源化（sourcing）后，通过一个内部环境变量（无 shell 插值）前置 `env.PATH`；
  `tools.exec.pathPrepend` 也适用于此。
- `host=node`：仅发送您传递的未被阻止的环境变量覆盖到节点。`env.PATH` 覆盖将在主机执行时被拒绝，并被节点主机忽略。如果您在节点上需要额外的 PATH 条目，请配置节点主机服务环境（systemd/launchd）或将工具安装在标准位置。

每代理节点绑定（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：节点选项卡包含一个用于相同设置的小型“Exec 节点绑定”面板。

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每个会话**的默认值。
发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发送者**（渠道允许列表/配对加上 `commands.useAccessGroups`）有效。
它仅更新**会话状态**，不写入配置。若要彻底禁用 exec，请通过工具策略（`tools.deny: ["exec"]` 或按代理）拒绝它。除非您显式设置
`security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec 批准（配套应用 / 节点主机）

沙箱隔离的代理可以要求在 `exec` 于网关或节点主机上运行之前获得逐请求批准。
请参阅 [Exec 批准](/zh/tools/exec-approvals) 以了解策略、允许列表和 UI 流程。

当需要批准时，exec 工具 会立即返回 `status: "approval-pending"` 和一个批准 ID。一旦批准（或拒绝/超时），Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在 `tools.exec.approvalRunningNoticeMs` 后仍在运行，则会发出一条 `Exec running` 通知。在具有原生批准卡片/按钮的渠道上，Agent 应首先依赖该原生 UI，并且仅在 工具 结果明确说明聊天批准不可用或手动批准是唯一途径时，才包含手动 `/approve` 命令。

## 允许列表 + 安全二进制文件

手动强制执行允许列表会匹配已解析的二进制路径 glob 和裸命令名
glob。裸名称仅匹配通过 PATH 调用的命令，因此 `rg` 可以在命令为 `rg` 时匹配
`/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。
当 `security=allowlist` 时，仅当管道中的每个
段都在允许列表中或是安全二进制文件时，Shell 命令才会被自动允许。在允许列表模式下，除非每个顶级段都满足
允许列表（包括安全二进制文件），否则将拒绝链接（`;`、`&&`、`||`）和重定向。
重定向仍然不受支持。持久的 `allow-always` 信任不能绕过该规则：链接命令仍然要求每个
顶级段都匹配。

`autoAllowSkills` 是 exec 批准中一个单独的便利路径。它不同于
手动路径允许列表条目。为了严格明确的信任，请保持 `autoAllowSkills` 禁用。

使用这两个控件来处理不同的任务：

- `tools.exec.safeBins`：小型的、仅限 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：用于 safe-bin 可执行文件路径的显式额外受信任目录。
- `tools.exec.safeBinProfiles`: 针对自定义安全二进制文件的显式 argv 策略。
- allowlist: 对可执行路径的显式信任。

请勿将 `safeBins` 视为通用允许列表，也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些，请使用显式的允许列表条目，并保持批准提示处于启用状态。
当解释器/运行时 `safeBins` 条目缺少显式配置文件时，`openclaw security audit` 会发出警告，而 `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles` 条目生成脚手架。
当您明确将具有广泛行为的二进制文件（如 `jq`）重新添加到 `safeBins` 中时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。
如果您显式允许列出了解释器，请启用 `tools.exec.strictInlineEval`，以便内联代码评估形式仍需要新的批准。

有关完整的策略详细信息和示例，请参阅 [Exec approvals](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/zh/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

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

轮询用于按需获取状态，而非等待循环。如果启用了自动完成唤醒，命令在输出内容或失败时可以唤醒会话。

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

## apply_patch

`apply_patch` 是 `exec` 的一个子工具，用于结构化的多文件编辑。
它默认对 OpenAI 和 OpenAI Codex 模型启用。仅当您想要禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

注意：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- `deny: ["write"]` 不会拒绝 `apply_patch`；如果补丁写入也应被阻止，请显式拒绝 `apply_patch` 或使用 `deny: ["group:fs"]`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 可针对 OpenAI 模型禁用此工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限于工作区内）。仅当您有意让 `apply_patch` 在工作区目录之外进行写入/删除操作时，才将其设置为 `false`。

## 相关

- [Exec Approvals](/zh/tools/exec-approvals) — shell 命令的审批门
- [沙箱隔离](/zh/gateway/sandboxing) — 在沙箱隔离环境中运行命令
- [Background Process](/zh/gateway/background-process) — 长时间运行的 exec 和进程工具
- [Security](/zh/gateway/security) — 工具策略和提升访问权限
