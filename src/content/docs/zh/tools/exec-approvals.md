---
summary: "主机执行批准：策略旋钮、允许列表以及 YOLO/严格工作流"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox-escape prompts and their implications
title: "执行批准"
sidebarTitle: "执行批准"
---

执行批准是让沙箱隔离的代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用/节点主机护栏**。这是一种安全互锁机制：只有当策略 + 允许列表 +（可选）用户批准一致时，才允许执行命令。执行批准堆叠在工具策略和提升门控之上（除非 elevated 设置为 `full`，这将跳过批准）。

<Note>有效策略是 `tools.exec.*` 和批准默认值中**更严格**的一个；如果省略了批准字段，则使用 `tools.exec` 值。主机执行还使用该机器上的本地批准状态——即使是 `~/.openclaw/exec-approvals.json` 中的主机本地 `ask: "always"`，如果会话或配置默认值请求 `ask: "on-miss"`，它也会继续提示。</Note>

## 检查有效策略

| 命令                                                             | 显示内容                                     |
| ---------------------------------------------------------------- | -------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略源以及有效结果。         |
| `openclaw exec-policy show`                                      | 本地机器合并视图。                           |
| `openclaw exec-policy set` / `preset`                            | 一步将本地请求的策略与本地主机批准文件同步。 |

当本地范围请求 `host=node` 时，`exec-policy show` 会在运行时将该范围报告为由节点管理，而不是假装本地批准文件是事实来源。

如果配套应用 UI **不可用**，任何通常会提示的请求都将由 **ask fallback** 解析（默认值：`deny`）。

<Tip>原生聊天审批客户端可以在待审批消息上设置特定渠道的辅助操作。例如，Matrix 会预设反应快捷方式（`✅` 允许一次，`❌` 拒绝，`♾️` 始终允许），同时仍将 `/approve ...` 命令保留在消息中作为备用方案。</Tip>

## 适用范围

执行审批是在执行主机上本地强制执行的：

- **Gateway(网关) 主机** → 网关机器上的 `openclaw` 进程。
- **Node 主机** → 节点运行器（macOS 伴侣应用或无头节点主机）。

### 信任模型

- 经过 Gateway(网关) 身份验证的调用者是该 Gateway(网关) 的受信任操作员。
- 配对的节点将这种受信任操作员的能力扩展到了节点主机上。
- 执行审批降低了意外执行的风险，但**不是**每用户身份验证边界。
- 已批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、环境绑定（如果存在）以及固定的可执行文件路径（如果适用）。
- 对于 Shell 脚本和直接的解释器/运行时文件调用，OpenClaw 还会尝试绑定一个具体的本地文件操作数。如果绑定文件在批准后但在执行前发生了更改，则运行将被拒绝，而不是执行已偏移的内容。
- 文件绑定是特意尽力而为的，**不是**每个解释器/运行时加载器路径的完整语义模型。如果审批模式无法识别确切的一个具体本地文件进行绑定，它将拒绝创建基于审批的运行，而不是假装完全覆盖。

### macOS 拆分

- **节点主机服务** 通过本地 IPC 将 `system.run` 转发到 **macOS 应用**。
- **macOS 应用** 强制执行审批并在 UI 上下文中执行命令。

## 设置和存储

审批存储在执行主机上的本地 JSON 文件中：

```text
~/.openclaw/exec-approvals.json
```

模式示例：

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

## 策略控制

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` — 阻止所有主机执行请求。 - `allowlist` — 仅允许在允许列表中的命令。 - `full` — 允许所有操作（等同于已提升权限）。
</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` — 永不提示。 - `on-miss` — 仅在允许列表不匹配时提示。 - `always` — 每次执行命令时都提示。当有效询问模式为 `always` 时，`allow-always` 的持久信任**不会**抑制提示。
</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问 UI 时的处理方式。

- `deny` — 阻止。
- `allowlist` — 仅当允许列表匹配时允许。
- `full` — 允许。
  </ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当 `true` 时，OpenClaw 将内联代码求值形式视为仅批准模式， 即使解释器二进制文件本身在允许列表中。这是针对无法清晰映射到 单个稳定文件操作数的解释器加载程序的纵深防御。
</ParamField>

严格模式拦截的示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍需要显式批准，并且
`allow-always` 不会为它们自动持久化新的允许列表条目。

## YOLO 模式（免批准）

如果您希望主机执行无需批准提示即可运行，必须打开
**两层** 策略 —— OpenClaw 配置中的请求执行策略
(`tools.exec.*`) **以及**
`~/.openclaw/exec-approvals.json` 中的主机本地批准策略。

除非您显式收紧策略，否则 YOLO 是默认的主机行为：

| 层级                  | YOLO 设置                     |
| --------------------- | ----------------------------- |
| `tools.exec.security` | `full` 在 `gateway`/`node` 上 |
| `tools.exec.ask`      | `off`                         |
| 主机 `askFallback`    | `full`                        |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 决定 exec 在**哪里**运行：可用时在沙箱中运行，否则在网关中运行。
- YOLO 决定主机 exec **如何**获得批准：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不会**在配置的主机 exec 策略之上添加单独的启发式命令混淆批准门控或脚本预检拒绝层。
- `auto` 不会使网关路由成为从沙箱隔离会话发起的免费覆盖。允许从 `auto` 发起每次调用 `host=node` 请求；仅当没有沙箱运行时处于活动状态时，才允许从 `auto` 发起 `host=gateway`。对于稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。
  </Warning>

暴露自己的非交互式权限模式的 CLI 支持的提供商可以遵循此策略。当 CLI 请求的 exec 策略为 YOLO 时，Claude OpenClaw 会添加
`--permission-mode bypassPermissions`。可以使用 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下的显式 Claude 参数覆盖该后端行为
—
例如 `--permission-mode default`、`acceptEdits` 或
`bypassPermissions`。

如果您想要更保守的设置，可以将任一层重新收紧至
`allowlist` / `on-miss` 或 `deny`。

### 持久网关主机“永不提示”设置

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

该本地快捷方式会同时更新：

- 本地 `tools.exec.host/security/ask`。
- 本地 `~/.openclaw/exec-approvals.json` 默认值。

它是有意设计为仅限本地的。要远程更改网关主机或节点主机
批准，请使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

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

- `openclaw exec-policy` 不会同步节点审批。
- `openclaw exec-policy set --host node` 会被拒绝。
- 节点执行审批会在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`。
  </Note>

### 仅限会话的快捷方式

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一种应急快捷方式，也会跳过该会话的执行审批。

如果主机审批文件比配置更严格，则更严格的主机策略仍然优先。

## 允许列表（按代理）

允许列表是**按代理**划分的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式为 glob 匹配。

模式可以是解析后的二进制路径 glob 或纯命令名称 glob。纯名称仅匹配通过 `PATH` 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不**匹配 `./rg` 或 `/tmp/rg`。当您想要信任某个特定的二进制位置时，请使用路径 glob。

旧的 `agents.default` 条目会在加载时迁移到 `agents.main`。诸如 `echo ok && pwd` 之类的 shell 链仍然需要每个顶层片段都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目跟踪：

| 字段               | 含义                    |
| ------------------ | ----------------------- |
| `id`               | 用于 UI 身份的稳定 UUID |
| `lastUsedAt`       | 上次使用的时间戳        |
| `lastUsedCommand`  | 上次匹配的命令          |
| `lastResolvedPath` | 上次解析的二进制路径    |

## 自动允许技能 CLI

启用**自动允许技能 CLI** 后，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上会被视为已加入允许列表。这通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制列表。如果您需要严格的手动允许列表，请禁用此功能。

<Warning>- 这是一个**隐式便捷允许列表**，与手动路径允许列表条目分开。 - 适用于 Gateway(网关) 和节点位于同一信任边界内的可信操作员环境。 - 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。</Warning>

## 安全二进制文件与审批转发

有关安全二进制文件（仅 stdin 快速路径）、解释器绑定详细信息，以及如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为本地审批客户端运行），请参阅[Exec approvals — advanced](/zh/tools/exec-approvals-advanced)。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖和允许列表。选择一个范围（默认值或某个代理），调整策略，添加/删除允许列表模式，然后**保存**。UI 显示每个模式的最后使用的元数据，以便您可以保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地审批）或一个 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未通告 exec 审批，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑——请参阅[Approvals CLI](/zh/cli/approvals)。

## 审批流程

当需要提示时，网关向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发到节点主机。

对于 `host=node`，审批请求包含一个规范的 `systemRunPlan` 有效负载。当转发批准的 `system.run` 请求时，网关将该计划用作权威的 command/cwd/会话 上下文。

这对于异步审批延迟很重要：

- 节点执行路径预先准备了一个规范计划。
- 审批记录存储该计划及其绑定元数据。
- 获得批准后，最终转发的 `system.run` 调用重用存储的计划，而不是信任稍后调用者的编辑。
- 如果调用方在创建审批请求后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关将拒绝转发的运行，将其视为审批不匹配。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）。
- `Exec finished`。
- `Exec denied`。

这些内容会在节点报告事件后发布到代理的会话中。Gateway(网关) 托管的 exec 审批会在命令完成时（以及可选地在运行时间超过阈值时）发出相同的生命周期事件。受审批限制的 exec 会重用审批 ID 作为这些消息中的 `runId`，以便于关联。

## 审批拒绝行为

当异步 exec 审批被拒绝时，OpenClaw 会阻止代理重用会话中同一命令的任何早期运行的输出。拒绝原因会附带明确指导传递，指出没有可用的命令输出，从而阻止代理声称有新输出或使用先前成功运行中的陈旧结果重复被拒绝的命令。

## 影响

- **`full`** 功能强大；请尽可能优先使用允许列表。
- **`ask`** 让您随时了解情况，同时仍允许快速审批。
- 每个代理的允许列表可防止一个代理的审批泄漏到其他代理。
- 审批仅适用于来自**授权发送方**的主机 exec 请求。未经授权的发送方无法发出 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利功能，设计上会跳过审批。要完全阻止主机 exec，请将审批安全设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

## 相关

<CardGroup cols={2}>
  <Card title="Exec 审批 — 高级" href="/zh/tools/exec-approvals-advanced" icon="gear">
    安全二进制文件、解释器绑定以及向聊天转发审批。
  </Card>
  <Card title="Exec 工具" href="/zh/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="提权模式" href="/zh/tools/elevated" icon="shield-exclamation">
    紧急路径，同时跳过审批。
  </Card>
  <Card title="沙箱隔离" href="/zh/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="安全" href="/zh/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提权" href="/zh/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制。
  </Card>
  <Card title="Skills" href="/zh/tools/skills" icon="sparkles">
    基于 Skills 的自动允许行为。
  </Card>
</CardGroup>
