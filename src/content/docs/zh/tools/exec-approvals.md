---
summary: "主机执行审批：策略控制、允许列表以及 YOLO/严格工作流"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "执行审批"
sidebarTitle: "执行审批"
---

执行审批是让沙箱隔离代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / 节点主机防护措施**。一种安全互锁机制：只有在策略 + 允许列表 + （可选）用户审批达成一致时，才允许执行命令。执行审批堆叠在工具策略和提升门控**之上**（除非提升设置为 `full`，这将跳过审批）。

有关 `deny`、`allowlist`、`ask`、`auto`、`full`、
Codex Guardian 映射以及 ACPX harness 权限的模式优先概述，请参阅
[Permission modes](/zh/tools/permission-modes)。

<Note>有效策略是 `tools.exec.*` 和批准默认值中**更严格**的一个；如果省略了批准字段，则使用 `tools.exec` 值。 主机执行还使用该机器上的本地批准状态——即 `~/.openclaw/exec-approvals.json` 中的主机本地 `ask: "always"`，即使会话或配置默认值请求 `ask: "on-miss"`，它也会继续提示。</Note>

## 检查有效策略

| 命令                                                             | 显示内容                                         |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略源以及有效结果。             |
| `openclaw exec-policy show`                                      | 本地机器合并视图。                               |
| `openclaw exec-policy set` / `preset`                            | 将本地请求的策略与本地主机批准文件同步一步完成。 |

当本地范围请求 `host=node` 时，`exec-policy show` 会在运行时将该范围报告为由节点管理，而不是假装本地批准文件是事实来源。

如果配套应用 UI **不可用**，任何通常会提示的请求都将由 **ask fallback**（默认：`deny`）解决。

<Tip>原生聊天批准客户端可以在待批准的消息上植入特定渠道的功能。例如，Matrix 植入反应快捷方式 (Matrix`✅` 允许一次，`❌` 拒绝，`♾️` 始终允许)，同时仍将 消息中的 `/approve ...` 命令作为备用方案。</Tip>

## 应用范围

执行批准在执行主机上本地执行：

- **Gateway(网关) 主机** → 网关机器上的 Gateway(网关)`openclaw` 进程。
- **节点主机** → 节点运行器（macOS 配套应用或无头节点主机）。

### 信任模型

- 经过 Gateway(网关) 身份验证的调用者是该 Gateway(网关) 的受信任操作员。
- 已配对的节点将该受信任操作员能力扩展到了节点主机上。
- Exec 批准可以降低意外执行的风险，但**不是**每用户身份验证边界或文件系统只读策略。
- 一旦获得批准，命令便可以根据所选主机或沙箱文件系统权限来变更文件。
- 已批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、env 绑定（如果存在），以及适用的固定可执行文件路径。
- 对于 Shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果该绑定文件在批准后但在执行前发生了更改，运行将被拒绝，而不会执行已更改的内容。
- 文件绑定是尽力而为的，**不是**每个解释器/运行时加载器路径的完整语义模型。如果批准模式无法准确识别要绑定的一个具体本地文件，它将拒绝创建基于批准的运行，而不是假装完全覆盖。

### macOS 拆分

- **节点主机服务**通过本地 IPC 将 `system.run`macOSIPC 转发给 **macOS 应用**。
- **macOS 应用** 执行批准并在 UI 上下文中执行命令。

## 设置和存储

批准记录位于执行主机上的本地 JSON 文件中：

```text
~/.openclaw/exec-approvals.json
```

架构示例：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略控制旋钮

### `tools.exec.mode`

`tools.exec.mode` 是主机执行的首选规范化策略界面。
取值包括：

- `deny` - 阻止主机执行。
- `allowlist` - 无需询问仅运行允许列表中的命令。
- `ask` - 使用允许列表策略，并在未命中时询问。
- `auto`OpenClaw - 使用允许列表策略，直接运行确定性匹配，并通过 OpenClaw 的原生自动审查程序发送批准未命中项，然后再回退到人工批准路径。
- `full` - 无需批准提示即可运行主机执行。

传统的 `tools.exec.security` / `tools.exec.ask` 仍然受支持，且在较窄的会话或代理范围内设置时仍然具有优先权。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 阻止所有主机执行请求。
  - `allowlist` - 仅允许在允许列表中的命令。
  - `full` - 允许一切（等同于提升模式）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 永不提示。
  - `on-miss` - 仅当允许列表不匹配时提示。
  - `always` - 每次命令都提示。当有效请求模式为 `always` 时，`allow-always` 持久化信任**不会**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问 UI 时的解决方案。

- `deny` - 阻止。
- `allowlist` - 仅当允许列表匹配时允许。
- `full` - 允许。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当 `true` 时，OpenClaw 将内联代码求值形式视为仅批准，即使解释器二进制文件本身在允许列表中也是如此。这是一种针对无法清晰地映射到一个稳定文件操作数的解释器加载器的深度防御措施。
</ParamField>

严格模式可以捕获的示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍需要显式批准，且 `allow-always` 不会自动为它们保存新的允许列表条目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false" OpenClaw>
  仅控制 exec 审批提示中的呈现。启用后，OpenClaw 可以附加解析器派生的命令范围，以便 Web 审批 提示可以突出显示命令标记。将其设置为 `true` 以启用 命令文本突出显示。
</ParamField>

此设置 **不会** 更改 `security`、`ask`、允许列表匹配、
严格的内联评估行为、审批转发或命令执行。
可以在 `tools.exec.commandHighlighting` 下全局设置，也可以在 `agents.list[].tools.exec.commandHighlighting` 下按代理设置。

## YOLO 模式（无需审批）

如果您希望主机 exec 无需审批提示即可运行，则必须打开
**两个** 策略层 - OpenClaw 配置中的请求 exec 策略
(OpenClaw`tools.exec.*`) **和** `~/.openclaw/exec-approvals.json` 中的主机本地审批策略。

除非您明确收紧它，否则 YOLO 是默认的主机行为：

| 层                    | YOLO 设置                    |
| --------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上的 `full` |
| `tools.exec.ask`      | `off`                        |
| 主机 `askFallback`    | `full`                       |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 选择 exec **在何处**运行：可用时在沙箱中运行，否则在网关中运行。
- YOLO 选择主机 exec **如何**被批准：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不会在配置的主机 exec 策略之上添加单独的启发式命令混淆批准门或脚本预检拒绝层。
- `auto` 不会使网关路由成为从沙箱隔离会话的自由覆盖。允许从 `auto` 发出单次调用 `host=node` 请求；仅当没有沙箱运行时处于活动状态时，才允许从 `auto` 发出 `host=gateway` 请求。对于稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

</Warning>

暴露自己的非交互式权限模式的 CLI 支持提供商可以遵循此策略。当 CLI 的有效 exec 策略为 YOLO 时，Claude OpenClaw 会添加 `--permission-mode bypassPermissions`。对于 OpenClaw 托管的 Claude 实时会话，OpenClaw 的有效 exec 策略优先于 Claude 的原生权限模式：YOLO 将实时启动标准化为 `--permission-mode bypassPermissions`，而限制性的有效 exec 策略将实时启动标准化为 `--permission-mode default`，即使原始 Claude 后端参数指定了另一种模式。

如果您想要更保守的设置，请将 OpenClaw exec 策略收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久化网关主机“从不提示”设置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配主机批准文件">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### 本地快捷方式

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式会同时更新两者：

- 本地 `tools.exec.host/security/ask`。
- 本地 `~/.openclaw/exec-approvals.json` 默认值。

它被有意设计为仅限本地。要远程更改网关主机或节点主机的批准，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### 节点主机

对于节点主机，请在该节点上应用相同的批准文件：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
**仅限本地的限制：**

- `openclaw exec-policy` 不会同步节点批准。
- `openclaw exec-policy set --host node` 会被拒绝。
- 节点执行批准会在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`。

</Note>

### 仅限会话的快捷方式

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一种应急快捷方式，只有当请求的策略和主机批准文件都解析为 `security: "full"` 和 `ask: "off"` 时，它才会跳过执行批准。更严格的主机文件（例如 `ask: "always"`）仍然会提示。

如果主机批准文件比配置更严格，则更严格的主机策略仍然优先。

## 允许列表（每个代理）

允许列表是**针对每个代理的**。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是 glob 匹配。

模式可以是已解析的二进制路径 glob 或裸命令名称 glob。裸名称仅匹配通过 `PATH` 调用的命令，因此 `rg` 可以在命令为 `rg` 时匹配 `/opt/homebrew/bin/rg`，但**不能**匹配 `./rg` 或 `/tmp/rg`。当您想要信任一个特定的二进制位置时，请使用路径 glob。

传统的 `agents.default` 条目会在加载时迁移到 `agents.main`。诸如 `echo ok && pwd` 之类的 Shell 链仍然需要每个顶层段都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制参数

当允许列表条目需要匹配二进制文件和特定的参数形状时，请添加 `argPattern`OpenClaw。OpenClaw 会根据解析后的命令参数评估正则表达式，但不包括可执行文件标记 (`argv[0]`)。对于手动编写的条目，参数会以单个空格连接，因此如果需要精确匹配，请定位模式。

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

该条目允许 `python3 safe.py`；而 `python3 other.py` 则属于允许列表未命中。如果同一二进制文件也存在仅路径的条目，未匹配的参数仍可能回退到该仅路径条目。如果目标是将二进制文件限制为声明的参数，则省略该仅路径条目。

由批准流程保存的条目可以使用内部分隔符格式进行精确 argv 匹配。建议使用 UI 或批准流程重新生成这些条目，而不是手动编辑编码值。如果 OpenClaw 无法解析命令段的 argv，则带有 OpenClaw`argPattern` 的条目将不会匹配。

每个允许列表条目支持：

| 字段               | 含义                                       |
| ------------------ | ------------------------------------------ |
| `pattern`          | 解析后的二进制路径 glob 或纯命令名称 glob  |
| `argPattern`       | 可选的 argv 正则表达式；省略的条目为仅路径 |
| `id`               | 用于 UI 身份的稳定 UUID                    |
| `source`           | 条目来源，例如 `allow-always`              |
| `commandText`      | 批准流程创建条目时捕获的命令文本           |
| `lastUsedAt`       | 上次使用时间戳                             |
| `lastUsedCommand`  | 上次匹配的命令                             |
| `lastResolvedPath` | 上次解析的二进制路径                       |

## 自动允许技能 CLI

当启用 **自动允许技能 CLI** 时，已知技能引用的可执行文件将被视为节点（macOS 节点或无头节点主机）上的已允许列表条目。这通过 Gateway RPC 使用 macOS`skills.bins`Gateway(网关)RPC 来获取技能二进制文件列表。如果您需要严格的手动允许列表，请禁用此功能。

<Warning>
- 这是一个**隐式便利允许列表**，独立于手动路径允许列表条目。
- 它适用于受信任的操作员环境，其中Gateway(网关)和节点位于同一信任边界内。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

</Warning>

## 安全二进制文件与审批转发

有关安全二进制文件（仅 stdin 的快速路径）、解释器绑定详细信息，以及如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为原生审批客户端运行），请参阅
[Exec approvals - advanced](/zh/tools/exec-approvals-advanced)。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片编辑默认值、
按代理覆盖和允许列表。选择一个范围（默认值或代理），
调整策略，添加/删除允许列表模式，然后单击 **Save**。UI
显示每个模式的最后使用元数据，以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地审批）或一个 **Node**。
节点必须通告 `system.execApprovals.get/set`（macOS 应用或
无头节点主机）。如果节点尚未通告 exec approvals，
请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI： `openclaw approvals` 支持网关或节点编辑 - 请参阅
[Approvals CLI](/zh/cli/approvals)。

## 审批流程

当需要提示时，网关会向操作员客户端广播
`exec.approval.requested`。Control UI 和 macOS
应用通过 `exec.approval.resolve` 解析它，然后网关将
批准的请求转发到节点主机。

对于 `host=node`，审批请求包含一个规范 `systemRunPlan`
负载。网关在转发批准的 `system.run`
请求时，使用该计划作为权威的
命令/cwd/会话上下文。

这对于异步审批延迟很重要：

- 节点执行路径会提前准备一个规范计划。
- 审批记录存储该计划及其绑定元数据。
- 一旦批准，最终的转发 `system.run` 调用将重用存储的计划，而不是信任后续调用者的修改。
- 如果在创建批准请求后，调用者更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关将因批准不匹配而拒绝转发的运行。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）。
- `Exec finished`。

这些内容在节点报告事件后发布到代理的会话中。被拒绝的 exec 批准对于主机命令本身是终结性的：命令不会运行。对于具有原始会话的主代理异步批准，OpenClaw 会将拒绝作为内部后续操作回发到该会话，以便代理停止等待异步命令并避免结果缺失修复。如果没有会话或无法恢复会话，OpenClaw 仍可向操作员或直接聊天路由报告简明的拒绝。子代理会话的拒绝不会回发到子代理。Gateway(网关) 托管的 exec 批准在命令完成时（以及可选地，当运行时间超过阈值时）发出相同的生命周期事件。受批准限制的 exec 在这些消息中重用批准 ID 作为 `runId`，以便于关联。

## 拒绝批准的行为

当异步 exec 批准被拒绝时，OpenClaw 将主机命令视为终结性的并以故障关闭方式处理。对于主代理会话，拒绝将作为内部会话后续操作传递，告知代理异步命令未运行。这在不暴露过时命令输出的情况下保留了记录连续性。如果无法进行会话传递，当存在安全路由时，OpenClaw 将回退到简明的操作员或直接聊天拒绝。

## 影响

- **`full`** 功能强大；请尽可能使用允许列表。
- **`ask`** 让您随时了解情况，同时仍允许快速批准。
- 每个代理的允许列表（allowlists）防止一个代理的审批泄露到其他代理。
- 审批仅适用于来自**授权发送者**的主机执行请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是一种为授权操作员提供的会话级便利功能，设计上会跳过审批。若要彻底阻止主机执行，请将审批安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

## 相关

<CardGroup cols={2}>
  <Card title="执行审批 - 高级" href="/zh/tools/exec-approvals-advanced" icon="gear">
    安全二进制文件、解释器绑定以及向聊天转发审批。
  </Card>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="提权模式" href="/zh/tools/elevated" icon="shield-exclamation">
    紧急备用路径，同样会跳过审批。
  </Card>
  <Card title="沙箱隔离" href="/zh/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="安全" href="/zh/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提权" href="/zh/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制机制。
  </Card>
  <Card title="Skills" href="/zh/tools/skills" icon="sparkles">
    由 Skills 支持的自动允许行为。
  </Card>
</CardGroup>
