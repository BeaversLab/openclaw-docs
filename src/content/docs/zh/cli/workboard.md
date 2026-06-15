---
summary: "CLICLI 参考文档，用于 `openclaw workboard` 卡片、调度和工作运行"
read_when:
  - You want to inspect or create Workboard cards from the terminal
  - You want to dispatch Workboard worker runs from the CLI
  - You are debugging Workboard CLI or slash command behavior
title: "CLIWorkboard CLI"
---

`openclaw workboard` 是捆绑的
[Workboard 插件](</en/plugins/workboardGateway(网关)>) 的终端界面。它允许操作员列出卡片、创建
卡片、检视单个卡片，并请求正在运行的 Gateway(网关) 将就绪的工作调度到
子代理工作运行中。

在使用该命令之前，请先启用插件：

```bash
openclaw plugins enable workboard
openclaw gateway restart
```

## 用法

```bash
openclaw workboard list [--board <id>] [--status <status>] [--json]
openclaw workboard create <title...> [--notes <text>] [--status <status>] [--priority <priority>] [--agent <id>] [--board <id>] [--labels <items>] [--json]
openclaw workboard show <id> [--json]
openclaw workboard dispatch [--url <url>] [--token <token>] [--timeout <ms>] [--json]
```

该命令读取和写入与仪表板和 Workboard 代理工具使用的同一个插件拥有的 SQLite 数据库。当命令接受卡片 id 时，可以通过完整 id 或明确的前缀传递卡片 id。

## `list`

```bash
openclaw workboard list
openclaw workboard list --board default --status ready
openclaw workboard list --json
```

文本输出格式紧凑：

```text
7f4a2c10  ready     high    default agent-a  Fix stale worker heartbeat
```

列包括 id 前缀、状态、优先级、面板 id、可选的代理 id 和标题。

标志：

| 标志                | 用途                               |
| ------------------- | ---------------------------------- |
| `--board <id>`      | 将结果限制为一个面板命名空间       |
| `--status <status>` | 将结果限制为一种 Workboard 状态    |
| `--json`            | 以机器 JSON 格式打印完整的卡片列表 |

## `create`

```bash
openclaw workboard create "Fix stale worker heartbeat" --priority high --labels bug,workboard
openclaw workboard create "Write Workboard docs" --status ready --agent docs-agent --board docs --notes "Cover CLI, slash command, dispatch, and SQLite state."
```

标志：

| 标志                    | 用途                           |
| ----------------------- | ------------------------------ |
| `--notes <text>`        | 初始卡片备注                   |
| `--status <status>`     | 初始状态，默认为 `todo`        |
| `--priority <priority>` | 优先级，默认为 `normal`        |
| `--agent <id>`          | 将卡片分配给代理或所有者 id    |
| `--board <id>`          | 将卡片存储在面板命名空间中     |
| `--labels <items>`      | 逗号分隔的标签                 |
| `--json`                | 以机器 JSON 格式打印创建的卡片 |

`create` 直接写入 Workboard SQLite 状态。该卡片立即在控制 UI 的 Workboard 选项卡以及 Workboard 工具中可见。

## `show`

```bash
openclaw workboard show 7f4a2c10
openclaw workboard show 7f4a2c10 --json
```

文本输出打印紧凑的卡片行和备注。JSON 输出返回完整的卡片记录，包括执行元数据、尝试、评论、链接、证明、工件、工作日志、协议状态、诊断和自动化元数据。

## `dispatch`

```bash
openclaw workboard dispatch
openclaw workboard dispatch --json
openclaw workboard dispatch --url http://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

`dispatch` 首先调用正在运行的 Gateway(网关) RPC 方法 `workboard.cards.dispatch`。该路径使用与仪表板分派操作相同的子代理运行时，因此就绪卡片会成为带有链接会话密钥的任务跟踪工作运行。已分配代理的卡片使用代理范围的子代理会话密钥；未分配的卡片保留无范围的子代理密钥，以便保留 Gateway(网关) 配置的默认代理。

分派循环：

1. 将依赖关系就绪的子项提升为 `ready`。
2. 阻止过期的声明或超时的工作运行。
3. 在就绪卡片上记录分派元数据。
4. 选择一小批未声明的就绪卡片。
5. 为每个选定的卡片声明分派器或已分配的代理。
6. 启动带有受限卡片上下文和卡片声明令牌的子代理工作运行。
7. 当 Gateway(网关) 任务分类账报告时，存储工作运行 ID、会话密钥、任务链接、执行状态以及卡片上的工作日志。

选择是故意保守的。默认情况下，一次分派最多启动三个工作程序，跳过已归档或已声明的卡片，并且在一次传递中仅启动每个所有者或代理的一个卡片。已由活动运行或审查工作拥有的卡片将留给后续分派。

如果在声明卡片后工作程序启动失败，Workboard 会阻止该卡片，清除声明，并将失败记录在卡片执行和工作日志元数据中。这使失败的启动保持可见，而不是将卡片静默返回到队列。

如果未提供显式的 Gateway(网关) 目标，并且本地 Gateway(网关) 不可用或尚未暴露 Workboard 分派方法，则 CLI 会回退到针对本地 Workboard 状态的仅数据分派。仅数据分派仍然可以提升依赖关系、清除过时声明并阻止超时运行，但它不会启动工作程序。直接报告身份验证、权限、验证失败以及针对显式 `--url` 或 `--token` 目标的失败。

文本输出报告工作程序启动：

```text
dispatch complete: started=2 failures=0
```

回退输出是显式的：

```text
gateway unavailable; data dispatch only: promoted=1 blocked=0
```

JSON 输出包含调度结果。Gateway(网关) 支持的调度可以包含 Gateway(网关)`started` 和 `startFailures`；仅数据回退包含 `gatewayUnavailable: true`。声明令牌 (Claim tokens) 已从卡片 JSON 输出中编辑掉。

在仪表板中，相同的调度结果显示为简短摘要，以便操作员可以看到有多少卡片已启动、升级、阻塞、重新声明或失败，而无需打开卡片详细信息。

## 斜杠命令一致性

支持命令的频道可以使用匹配的斜杠命令：

```text
/workboard list
/workboard show 7f4a2c10
/workboard create Fix stale worker heartbeat
/workboard dispatch
```

斜杠命令调度也使用 Gateway(网关) 子代理运行时，因此它遵循与仪表板和 CLI Gateway(网关) 路径相同的声明、工作器启动和失败行为。

`/workboard list` 和 `/workboard show` 是供授权命令发送者使用的读取命令。`/workboard create` 和 `/workboard dispatch`Gateway(网关) 会更改看板状态，并要求在聊天界面上具有所有者状态，或者是具有 `operator.write` 或 `operator.admin` 的 Gateway(网关) 客户端。

## 权限

CLI 调度路径使用 CLIGateway(网关)RPC`operator.read` 和 `operator.write`Gateway(网关) 作用域调用 Gateway(网关) RPC。只读 Gateway(网关) 令牌可以通过读取方法检查 Workboard 数据，但不能创建卡片或调度工作器。

本地 `list`、`create` 和 `show`OpenClaw 命令在当前配置文件使用的本地 OpenClaw 状态目录上运行。当您需要不同的状态根时，请在顶级 `openclaw` 命令上使用 `--dev` 或 `--profile <name>`。

## 故障排除

### 没有卡片出现

确认为相同的配置文件和状态根启用了插件：

```bash
openclaw plugins inspect workboard --runtime --json
```

如果仪表板显示卡片但 CLI 未显示，请检查两个命令是否使用相同的 CLI`--dev` 或 `--profile` 设置。

### 调度显示仅数据

启动或重启 Gateway(网关)：

```bash
openclaw gateway restart
openclaw gateway status --deep
```

然后重试 `openclaw workboard dispatch`Gateway(网关)。仅数据回退对于本地状态清理很有用，但 Worker 运行需要一个活动的 Gateway(网关)。

### Dispatch 未启动任何内容

检查是否至少有一张 `ready` 卡片没有活动的认领：

```bash
openclaw workboard list --status ready
```

当同一所有者已经拥有正在运行或正在审查的工作时，卡片也可能被跳过。将已完成的工作移动到 `done`，通过 Workboard 工具释放过期的认领，或者在活动的 Worker 完成后再次运行 dispatch。

## 相关

- [Workboard plugin](/zh/plugins/workboard)
- [CLI 参考](CLI/en/cli)
- [Slash commands](/zh/tools/slash-commands)
- [Control UI](/zh/web/control-ui)
