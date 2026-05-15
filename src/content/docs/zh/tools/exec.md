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
  针对 `gateway` / `node` 执行的强制模式。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  针对 `gateway` / `node` 执行的批准提示行为。
</ParamField>

<ParamField path="node" type="string">
  当 `host=node` 时的节点 ID/名称。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  请求提升模式 — 逃出沙盒进入配置的主机路径。仅当 elevated 解析为 `full` 时，才会强制 `security=full`。
</ParamField>

备注：

- `host` 默认为 `auto`：如果该会话激活了沙盒运行时，则为沙盒，否则为网关。
- `host` 仅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器；类似主机名的值会在命令运行前被拒绝。
- `auto` 是默认的路由策略，而不是通配符。允许从 `auto` 进行单次调用 `host=node`；仅当未激活沙盒运行时时，才允许单次调用 `host=gateway`。
- 如果没有额外配置，`host=auto` 仍然“开箱即用”：没有沙盒意味着它解析为 `gateway`；活动的沙盒意味着它保留在沙盒中。
- `elevated` 逃离沙箱进入配置的主机路径：默认为 `gateway`，或者当 `tools.exec.host=node` 时（或者会话默认值是 `host=node`）为 `node`。仅当为当前会话/提供商启用了提升访问权限时，它才可用。
- `gateway`/`node` 批准由 `~/.openclaw/exec-approvals.json` 控制。
- `node` 需要一个配对节点（配套应用或无头节点主机）。
- 如果有多个节点可用，请设置 `exec.node` 或 `tools.exec.node` 来选择其中一个。
- `exec host=node` 是节点唯一的 shell 执行路径；传统的 `nodes.run` 包装器已被移除。
- `timeout` 适用于前台、后台、`yieldMs`、网关、沙箱和节点 `system.run`OpenClaw 执行。如果省略，OpenClaw 使用 `tools.exec.timeoutSec`；显式指定 `timeout: 0` 将禁用该调用的 exec 进程超时。
- 在非 Windows 主机上，exec 在设置时使用 Windows`SHELL`；如果 `SHELL` 是 `fish`，它优先使用 `bash`（或 `sh`）
  来自 `PATH` 以避免不兼容 fish 的脚本，如果两者都不存在则回退到 `SHELL`。
- 在 Windows 主机上，exec 优先发现 PowerShell 7 (Windows`pwsh`Windows)（Program Files、ProgramW6432，然后是 PATH），
  然后回退到 Windows PowerShell 5.1。
- 主机执行 (`gateway`/`node`) 拒绝 `env.PATH` 和加载器覆盖 (`LD_*`/`DYLD_*`) 以
  防止二进制劫持或代码注入。
- OpenClaw 在生成的命令环境中（包括 PTY 和沙箱执行）设置 OpenClaw`OPENCLAW_SHELL=exec`，以便 shell/配置文件规则可以检测 exec-工具 上下文。
- `openclaw channels login` 被阻止从 `exec` 运行，因为它是交互式渠道认证流程；请在网关主机上的终端中运行它，或者当存在时从聊天中使用渠道原生登录工具。
- 重要提示：沙箱隔离**默认关闭**。如果沙箱隔离关闭，隐式 `host=auto`
  解析为 `gateway`。显式 `host=sandbox` 仍将失败关闭，而不是静默
  在网关主机上运行。请启用沙箱隔离或使用经批准的 `host=gateway`。
- 脚本预检检查（针对常见的 Python/Node shell 语法错误）仅检查有效
  `workdir` 边界内的文件。如果脚本路径解析到 `workdir` 之外，则跳过该
  文件的预检。
- 对于现在开始的长时间运行的工作，请启动一次，并在启用且命令发出输出或失败时依赖自动
  完成唤醒。
  使用 `process` 查看日志、状态、输入或进行干预；不要使用睡眠循环、超时循环或重复轮询来
  模拟调度。
- 对于应该稍后发生或按计划进行的工作，请使用 cron，而不是
  `exec` 的睡眠/延迟模式。

## 配置

- `tools.exec.notifyOnExit`（默认值：true）：当为 true 时，后台执行的会话将系统事件排队，并在退出时请求心跳。
- `tools.exec.approvalRunningNoticeMs`（默认值：10000）：当需要审批的 exec 运行时间超过此值时，发出单个“运行中”通知（0 表示禁用）。
- `tools.exec.timeoutSec`（默认值：1800）：默认的每个命令 exec 超时时间（秒）。每次调用的 `timeout` 会覆盖它；每次调用的 `timeout: 0` 会禁用 exec 进程超时。
- `tools.exec.host`（默认值：`auto`；当沙箱运行时处于活动状态时解析为 `sandbox`，否则为 `gateway`）
- `tools.exec.security`（默认值：对于沙箱为 `deny`，对于未设置的网关和节点为 `full`）
- `tools.exec.ask`（默认值：`off`）
- 对于网关和节点，无批准的主机执行是默认设置。如果您需要批准/允许列表行为，请同时收紧 `tools.exec.*` 和主机 `~/.openclaw/exec-approvals.json`；请参阅 [Exec approvals](/zh/tools/exec-approvals#yolo-mode-no-approval)。
- YOLO 来自于主机策略默认值（`security=full`、`ask=off`），而不是来自 `host=auto`。如果您想强制网关或节点路由，请设置 `tools.exec.host` 或使用 `/exec host=...`。
- 在 `security=full` 加 `ask=off` 模式下，主机执行直接遵循配置的策略；没有额外的启发式命令混淆预过滤器或脚本预检拒绝层。
- `tools.exec.node`（默认值：未设置）
- `tools.exec.strictInlineEval`（默认值：false）：为 true 时，内联解释器 eval 形式（如 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、`lua -e` 和 `osascript -e`）始终需要明确批准。`allow-always` 仍然可以保留良性的解释器/脚本调用，但内联 eval 形式每次仍会提示。
- `tools.exec.pathPrepend`：要预先添加到 `PATH` 的目录列表，用于执行运行（仅限网关 + 沙箱）。
- `tools.exec.safeBins`：仅 stdin 的安全二进制文件，可以在没有明确允许列表条目的情况下运行。有关行为详细信息，请参阅 [Safe bins](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only)。
- `tools.exec.safeBinTrustedDirs`：针对 `safeBins` 路径检查受信任的其他显式目录。`PATH` 条目永远不会自动受信任。内置默认值为 `/bin` 和 `/usr/bin`。
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

- `host=gateway`：将您的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖项
  会被拒绝用于主机执行。守护进程本身仍然以最小的 `PATH` 运行：
  - macOS：`/opt/homebrew/bin`、`/usr/local/bin`、`/usr/bin`、`/bin`
  - Linux：`/usr/local/bin`、`/usr/bin`、`/bin`
- `host=sandbox`：在容器内运行 `sh -lc`（登录 shell），因此 `/etc/profile` 可能会重置 `PATH`。
  OpenClaw 在获取配置文件后通过内部环境变量（无 shell 插值）前置 `env.PATH`；
  `tools.exec.pathPrepend` 也适用于此。
- `host=node`：只有您传递的未被阻止的环境变量覆盖项才会发送到节点。`env.PATH` 覆盖项
  会被拒绝用于主机执行，并且会被节点主机忽略。如果您在节点上需要额外的 PATH 条目，
  请配置节点主机服务环境（systemd/launchd）或将工具安装在标准位置。

每代理节点绑定（使用配置中的代理列表索引）：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

控制 UI：节点选项卡包含一个小的“Exec 节点绑定”面板，用于相同的设置。

## 会话覆盖 (`/exec`)

使用 `/exec` 为 `host`、`security`、`ask` 和 `node` 设置**每会话**默认值。
发送不带参数的 `/exec` 以显示当前值。

示例：

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## 授权模型

`/exec` 仅对**授权发送者**（渠道允许列表/配对以及 `commands.useAccessGroups`）生效。
它仅更新**会话状态**而不写入配置。若要彻底禁用 exec，请通过工具
策略（`tools.deny: ["exec"]` 或针对每个代理）拒绝它。除非您显式设置
`security=full` 和 `ask=off`，否则主机批准仍然适用。

## Exec 批准（配套应用 / 节点主机）

沙箱隔离的代理可以要求在 `exec` 于 Gateway(网关) 或节点主机上运行之前进行每次请求的批准。
有关策略、允许列表和 UI 流程，请参阅 [Exec 批准](/zh/tools/exec-approvals)。

当需要批准时，exec 工具会立即返回
`status: "approval-pending"`Gateway(网关) 和一个批准 ID。一旦批准（或拒绝 / 超时），
Gateway(网关) 会发出系统事件（`Exec finished` / `Exec denied`）。如果命令在
`tools.exec.approvalRunningNoticeMs` 后仍在运行，则会发出一条 `Exec running` 通知。
在具有原生批准卡片/按钮的渠道上，代理应首先依赖该
原生 UI，并且仅在工具
结果明确指出聊天批准不可用或手动批准是
唯一途径时，才包含手动 `/approve` 命令。

## 允许列表 + 安全 bins

手动白名单强制执行匹配解析后的二进制路径通配符和裸命令名通配符。裸名称仅匹配通过 PATH 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。
当 `security=allowlist` 时，仅当管道中的每个段都在白名单中或是安全二进制文件时，Shell 命令才会被自动允许。在白名单模式下，除非每个顶层段都满足白名单（包括安全二进制文件），否则将拒绝链式操作（`;`、`&&`、`||`）和重定向。重定向仍然不受支持。
持久的 `allow-always` 信任不能绕过该规则：链式命令仍然要求每个顶层段都匹配。

`autoAllowSkills` 是 exec 批准中一个单独的便捷路径。它与手动路径白名单条目不同。为了严格显式信任，请保持 `autoAllowSkills` 禁用状态。

使用这两个控件来处理不同的任务：

- `tools.exec.safeBins`：小型的、仅限 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：针对安全二进制文件可执行路径的显式额外受信任目录。
- `tools.exec.safeBinProfiles`：针对自定义安全二进制文件的显式 argv 策略。
- allowlist：针对可执行路径的显式信任。

不要将 `safeBins` 视为通用允许列表（allowlist），也不要添加解释器/运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些文件，请使用显式的允许列表条目，并保持批准提示处于启用状态。
当解释器/运行时 `safeBins` 条目缺少显式配置文件（profiles）时，`openclaw security audit` 会发出警告，而 `openclaw doctor --fix` 可以搭建缺失的自定义 `safeBinProfiles` 条目。
当您显式地将行为范围较广的二进制文件（如 `jq`）重新添加到 `safeBins` 中时，`openclaw security audit` 和 `openclaw doctor` 也会发出警告。
如果您显式地将解释器列入允许列表，请启用 `tools.exec.strictInlineEval`，以便内联代码评估形式仍然需要新的批准。

有关完整的策略详细信息和示例，请参阅 [Exec 批准](/zh/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [安全 bin 与允许列表](/zh/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

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

轮询用于按需获取状态，而非用于等待循环。如果启用了自动完成唤醒，当命令输出内容或失败时，该命令可以唤醒会话。

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
对于 OpenAI 和 OpenAI Codex 模型，默认情况下启用它。仅当您想要禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

备注：

- 仅适用于 OpenAI/OpenAI Codex 模型。
- 工具策略仍然适用；`allow: ["write"]` 隐式允许 `apply_patch`。
- `deny: ["write"]` 不会拒绝 `apply_patch`；请显式拒绝 `apply_patch`，或者在还应阻止补丁写入时使用 `deny: ["group:fs"]`。
- 配置位于 `tools.exec.applyPatch` 之下。
- `tools.exec.applyPatch.enabled` 默认为 `true`；将其设置为 `false` 可为 OpenAI 模型禁用该工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外进行写入/删除操作时，才将其设置为 `false`。

## 相关

- [执行批准](/zh/tools/exec-approvals) — 针对Shell命令的批准门控
- [沙箱隔离](/zh/gateway/sandboxing) — 在沙箱隔离环境中运行命令
- [后台进程](/zh/gateway/background-process) — 长时间运行的执行和进程工具
- [安全性](/zh/gateway/security) — 工具策略和提升访问权限
