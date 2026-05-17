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

<Note>有效策略是 `tools.exec.*` 和审批默认值中的**较严格者**；如果省略了审批字段，则使用 `tools.exec` 值。主机执行还使用该机器上的本地审批状态——即 `~/.openclaw/exec-approvals.json` 中的主机本地 `ask: "always"` 会继续提示，即使会话或配置默认值请求 `ask: "on-miss"`。</Note>

## 检查有效策略

| 命令                                                             | 显示内容                                     |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略源以及有效结果。         |
| `openclaw exec-policy show`                                      | 本地机器合并视图。                           |
| `openclaw exec-policy set` / `preset`                            | 一步将本地请求的策略与本地主机批准文件同步。 |

当本地范围请求 `host=node` 时，`exec-policy show` 会在运行时将该范围报告为由节点托管，而不是假设本地审批文件是事实来源。

如果配套应用 UI **不可用**，任何通常会提示的请求将通过 **ask fallback**（默认：`deny`）进行解析。

<Tip>原生聊天审批客户端可以在待审批消息中植入特定渠道的功能。例如，Matrix 会植入反应快捷方式（Matrix`✅` 允许一次，`❌` 拒绝，`♾️` 始终允许），同时仍在消息中保留 `/approve ...` 命令作为后备。</Tip>

## 适用范围

执行审批是在执行主机上本地强制执行的：

- **Gateway(网关) 主机** → 网关机器上的 Gateway(网关)`openclaw` 进程。
- **Node 主机** → 节点运行器（macOS 伴侣应用或无头节点主机）。

### 信任模型

- 经过 Gateway(网关) 身份验证的调用者是该 Gateway(网关) 的受信任操作员。
- 配对的节点将这种受信任操作员的能力扩展到了节点主机上。
- Exec approvals 可降低意外执行风险，但**不是**每用户身份验证边界或文件系统只读策略。
- 一旦获得批准，命令可以根据所选主机或沙箱文件系统权限修改文件。
- 已批准的 node-host 运行会绑定规范执行上下文：规范 cwd、精确 argv、存在的 env 绑定，以及适用的固定可执行文件路径。
- 对于 shell 脚本和直接的解释器/运行时文件调用，OpenClaw 还会尝试绑定一个具体的本地文件操作数。如果该绑定文件在批准之后、执行之前发生了更改，运行将被拒绝，而不是执行已偏离的内容。
- 文件绑定是尽力而为的，**不是**每个解释器/运行时加载器路径的完整语义模型。如果批准模式无法识别要绑定的确切一个具体本地文件，它将拒绝创建由批准支持的运行，而不是假装完全覆盖。

### macOS 拆分

- **节点主机服务** 通过本地 macOS 将 `system.run` 转发给 **IPC 应用**。
- **macOS app** 强制执行批准并在 UI 上下文中执行命令。

## 设置和存储

批准存储在执行主机上的本地 JSON 文件中：

```text
~/.openclaw/exec-approvals.json
```

示例架构：

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

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 阻止所有主机执行请求。
  - `allowlist` - 仅允许在允许列表中的命令。
  - `full` - 允许所有操作（等同于提升权限模式）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 永不提示。
  - `on-miss` - 仅在允许列表不匹配时提示。
  - `always` - 每次执行命令时都提示。当有效的请求模式为 `always` 时，`allow-always` 持久信任**不会**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问 UI 时的解决方案。

- `deny` - 阻止。
- `allowlist` - 仅在允许列表匹配时允许。
- `full` - 允许。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当 `true`OpenClaw 时，即使解释器二进制文件本身在允许列表中，OpenClaw 也会将内联代码求值形式视为仅限批准。这是针对无法清晰映射到单个稳定文件操作数的解释器加载器的纵深防御。
</ParamField>

严格模式捕获的示例：

- `python -c`
- `node -e`， `node --eval`， `node -p`
- `ruby -e`
- `perl -e`， `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍然需要显式批准，并且 `allow-always` 不会自动为它们持久化新的允许列表条目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  仅控制 exec 审批提示中的呈现形式。启用后， OpenClaw 可能会附加解析器派生的命令范围，以便 Web 审批 提示能够高亮显示命令标记。将其设置为 `true` 即可启用 命令文本高亮。
</ParamField>

此设置**不会**更改 `security`、`ask`、允许列表匹配、严格的内联求值行为、批准转发或命令执行。它可以在 `tools.exec.commandHighlighting` 下全局设置，也可以在 `agents.list[].tools.exec.commandHighlighting` 下针对每个代理进行设置。

## YOLO 模式（无需批准）

如果您希望主机执行（host exec）在无需批准提示的情况下运行，则必须打开**两个**策略层 —— OpenClaw 配置中的请求执行策略 (OpenClaw config
(`tools.exec.*`)) **以及** `~/.openclaw/exec-approvals.json` 中的主机本地批准策略。

YOLO 是默认的主机行为，除非您明确收紧它：

| 层                    | YOLO 设置                     |
| --------------------- | ----------------------------- |
| `tools.exec.security` | `full` 在 `gateway`/`node` 上 |
| `tools.exec.ask`      | `off`                         |
| 主机 `askFallback`    | `full`                        |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 选择 exec 运行的**位置**：如果可用则为沙箱，否则为网关。
- YOLO 选择**如何**批准主机 exec：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不会**在已配置的主机 exec 策略之上添加单独的启发式命令混淆批准门或脚本预检拒绝层。
- `auto` 并不使网关路由成为从沙箱隔离会话发出的免费覆盖。允许从 `auto` 发出单次 `host=node` 请求；仅当没有活动的沙箱运行时时，才允许从 `auto` 发出 `host=gateway`。对于稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

</Warning>

那些提供自己的非交互式权限模式的 CLI 支持提供商可以遵循此策略。当 CLI 请求的执行策略为 YOLO 时，Claude OpenClaw 会添加 `--permission-mode bypassPermissions`。使用 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下的显式 Claude 参数覆盖该后端行为——例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果您希望采用更保守的设置，请将任一层收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久的网关主机“从不提示”设置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配主机审批文件">
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

该本地快捷方式会同时更新：

- 本地 `tools.exec.host/security/ask`。
- 本地 `~/.openclaw/exec-approvals.json` 默认值。

它是有意仅限本地的。要远程更改网关主机或节点主机的审批，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### 节点主机

对于节点主机，请在该节点上应用相同的审批文件：

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
- 节点执行批准在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`。

</Note>

### 仅限当前会话的快捷方式

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一种紧急情况快捷方式，该会话也会跳过执行审批。

如果主机审批文件比配置更严格，则以更严格的主机策略为准。

## 允许列表（按代理）

允许列表是**按代理** 的。如果存在多个代理，请在 macOS 应用中切换正在编辑的代理。模式采用 glob 匹配。

模式可以是已解析的二进制路径 glob 或裸命令名 glob。裸名称仅匹配通过 `PATH` 调用的命令，因此 `rg` 可以在命令为 `rg` 时匹配 `/opt/homebrew/bin/rg`，但**不**匹配 `./rg` 或 `/tmp/rg`。当您想要信任一个特定的二进制位置时，请使用路径 glob。

加载时，旧的 `agents.default` 条目会被迁移到 `agents.main`。
如 `echo ok && pwd` 等Shell链仍然需要每个顶层段
都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制参数

当允许列表条目需要匹配二进制文件和特定的参数形状时，请添加 `argPattern`OpenClaw。OpenClaw 会根据解析后的命令参数（不包括可执行文件令牌（`argv[0]`））来评估正则表达式。对于手动编写的条目，参数会以单个空格连接，因此如果需要精确匹配，请锚定模式。

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

该条目允许 `python3 safe.py`；`python3 other.py` 则是允许列表未命中。如果存在针对同一二进制文件的仅路径条目，不匹配的参数仍可回退到该仅路径条目。如果目的是将二进制文件限制为声明的参数，则应省略该仅路径条目。

通过审批流程保存的条目可以使用内部分隔符格式来进行精确的 argv 匹配。建议使用 UI 或审批流程重新生成这些条目，而不是手动编辑编码后的值。如果 OpenClaw 无法解析命令段的 argv，则带有 `argPattern` 的条目将无法匹配。

每个允许列表条目支持：

| 字段               | 含义                                         |
| ------------------ | -------------------------------------------- |
| `pattern`          | 已解析的二进制路径 glob 或裸命令名称 glob    |
| `argPattern`       | 可选的 argv 正则表达式；省略的条目仅包含路径 |
| `id`               | 用于 UI 身份的稳定 UUID                      |
| `source`           | 条目来源，例如 `allow-always`                |
| `commandText`      | 批准流程创建条目时捕获的命令文本             |
| `lastUsedAt`       | 上次使用的时间戳                             |
| `lastUsedCommand`  | 最后匹配的命令                               |
| `lastResolvedPath` | 最后解析的二进制路径                         |

## 自动允许技能 CLI

当启用 **Auto-allow skill CLIs** 时，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。这将通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制文件列表。如果您需要严格的手动允许列表，请禁用此功能。

<Warning>
- 这是一个**隐式便捷允许列表**，与手动路径允许列表条目分开。
- 它适用于受信任的操作员环境，其中 Gateway(网关) 和节点位于同一信任边界内。
- 如果您需要严格的显式信任，请保持 Gateway(网关)`autoAllowSkills: false` 并仅使用手动路径允许列表条目。

</Warning>

## 安全二进制文件和审批转发

关于安全二进制文件（仅 stdin 快速路径）、解释器绑定详情，以及如何将审批提示转发到 Slack/Discord/Telegram（或作为原生审批客户端运行），请参阅
[Exec approvals - advanced](/zh/tools/exec-approvals-advanced)。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、
每个代理的覆盖和白名单。选择一个范围（默认值或某个代理），
调整策略，添加/删除白名单模式，然后点击 **Save**。该 UI
会显示每个模式最后使用的元数据，以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地审批）或 **Node**。
节点必须通告 Gateway(网关)`system.execApprovals.get/set`macOS（macOS 应用或
无头节点主机）。如果节点尚未通告执行审批，
请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：CLI`openclaw approvals` 支持网关或节点编辑 - 请参阅 [Approvals CLI](/zh/cli/approvals)。

## 审批流程

当需要提示时，网关会向操作员客户端广播
`exec.approval.requested`。控制 UI 和 macOS
应用通过 `exec.approval.resolve` 对其进行解析，然后网关将
已批准的请求转发到节点主机。

对于 `host=node`，批准请求包含一个规范的 `systemRunPlan` 载荷。网关在转发已批准的 `system.run` 请求时，将该计划用作权威的命令/cwd/会话上下文。

这对于异步批准延迟很重要：

- 节点执行路径会预先准备一个规范计划。
- 批准记录会存储该计划及其绑定元数据。
- 一旦获得批准，最终转发的 `system.run` 调用将重用存储的计划，而不是信任后续调用者的修改。
- 如果调用者在创建批准请求后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关将因批准不匹配而拒绝转发的运行。

## 系统事件

执行生命周期以系统消息的形式呈现：

- `Exec running`（仅当命令超过运行通知阈值时）。
- `Exec finished`。
- `Exec denied`。

这些事件会在节点报告事件后发布到代理的会话中。当命令完成时（以及可选地，当运行时间超过阈值时），Gateway(网关)托管的 exec 审批会发出相同的生命周期事件。受审批限制的 exec 会在这些消息中复用审批 ID 作为 Gateway(网关)`runId` 以便于关联。

## 拒绝审批的行为

当异步执行批准被拒绝时，OpenClaw 会阻止代理重用会话中同一命令的任何早期运行的输出。拒绝原因会附带明确指导，指示没有可用的命令输出，从而阻止代理声称有新输出或使用先前成功运行的陈旧结果重复被拒绝的命令。

## 影响

- **`full`** 功能强大；尽可能首选允许列表（allowlists）。
- **`ask`** 让您保持知情，同时仍允许快速审批。
- 针对每个代理的允许列表可防止一个代理的审批泄漏到其他代理。
- 审批仅适用于来自**授权发送者**的主机执行请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是专为授权操作员提供的会话级便利功能，设计上会跳过审批。若要彻底阻止主机执行，请将审批安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

## 相关

<CardGroup cols={2}>
  <Card title="Exec approvals - advanced" href="/zh/tools/exec-approvals-advanced" icon="gear">
    安全二进制、解释器绑定以及将审批转发至聊天。
  </Card>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="Elevated mode" href="/zh/tools/elevated" icon="shield-exclamation">
    也会跳过审批的应急路径。
  </Card>
  <Card title="沙箱隔离" href="/zh/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="Security" href="/zh/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="沙箱与工具策略与提升权限" href="/zh/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制。
  </Card>
  <Card title="Skills" href="/zh/tools/skills" icon="sparkles">
    基于 Skills 的自动允许行为。
  </Card>
</CardGroup>
