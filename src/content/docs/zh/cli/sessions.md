---
summary: "CLICLI reference for `openclaw sessions` (列出存储的会话 + 用法)"
read_when:
  - You want to list stored sessions and see recent activity
title: "会话"
---

# `openclaw sessions`

列出存储的对话会话。

会话列表不是渠道/提供商的存活检查。它们显示的是来自会话存储的持久化对话行。安静的 Discord、Slack、Telegram 或其他渠道可以在不创建新会话行的情况下成功重新连接，直到处理消息为止。当您需要实时的渠道连接时，请使用 DiscordSlackTelegram`openclaw channels status --probe`、`openclaw status --deep` 或 `openclaw health --verbose`。

`openclaw sessions`Gateway(网关) 和 Gateway(网关) `sessions.list`CLIGateway(网关)CLI 响应默认情况下是有界的，因此大型长期存在的存储无法独占 CLI 进程或 Gateway(网关) 事件循环。CLI 默认返回最新的 100 个会话；传递 `--limit <n>` 以获得更小/更大的窗口，或者当您有意需要整个存储时传递 `--limit all`。当调用者需要显示存在更多行时，JSON 响应包含 `totalCount`、`limitApplied` 和 `hasMore`。

RPC 客户端可以传递 RPC`configuredAgentsOnly: true` 以保持广泛的组合发现源，但仅返回当前存在于配置中的代理的行。控制 UI 默认使用该模式，以便已删除或仅存在于磁盘上的代理存储不会重新出现在会话视图中。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --verbose
openclaw sessions --json
```

范围选择：

- default：配置的默认代理存储
- `--verbose`：详细日志记录
- `--agent <id>`：一个配置的代理存储
- `--all-agents`：聚合所有配置的代理存储
- `--store <path>`：显式存储路径（不能与 `--agent` 或 `--all-agents` 结合使用）
- `--limit <n|all>`：要输出的最大行数（默认 `100`；`all` 恢复完整输出）

为存储的会话导出轨迹包：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是所有者批准执行请求后，`/export-trajectory` 斜杠命令使用的命令路径。输出目录始终解析为所选工作区内的 `.openclaw/trajectory-exports/`。

`openclaw sessions --all-agents` 读取已配置的代理存储。Gateway(网关) 和 ACP 会话发现范围更广：它们还包括在默认 `agents/` 根目录或模板化 `session.store` 根目录下找到的仅磁盘存储。这些发现的存储必须解析为代理根目录内的常规 `sessions.json` 文件；符号链接和根目录外的路径会被跳过。

JSON 示例：

`openclaw sessions --all-agents --json`：

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## 清理维护

立即运行维护（而不是等待下一个写入周期）：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用配置中的 `session.maintenance` 设置：

- 范围说明：`openclaw sessions cleanup` 维护会话存储、转录记录和轨迹附件。它不会修剪 cron 运行日志 (`cron/runs/<jobId>.jsonl`)，这些日志由 [Cron 配置](/zh/automation/cron-jobs#configuration) 中的 `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 管理，并在 [Cron 维护](/zh/automation/cron-jobs#maintenance) 中进行了解释。
- 清理还会修剪未被引用的主转录记录、压缩检查点和早于 `session.maintenance.pruneAfter` 的轨迹附件；仍被 `sessions.json` 引用的文件将被保留。

- `--dry-run`：预览将被修剪/封顶的条目数量，而不进行实际写入。
  - 在文本模式下，dry-run 会打印一个按会话分类的操作表 (`Action`, `Key`, `Age`, `Model`, `Flags`)，以便您查看哪些内容将被保留与删除。
- `--enforce`：即使 `session.maintenance.mode` 为 `warn`，也应用维护。
- `--fix-missing`：删除其转录文件缺失的条目，即使它们通常尚未因时间或计数而到期。
- `--fix-dm-scope`：当 `session.dmScope` 为 `main` 时，清理早期 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由遗留的陈旧对等键直接私信行。请先使用 `--dry-run`；执行清理会从 `sessions.json` 中删除这些行，并将其记录保存为已删除的存档。
- `--active-key <key>`：保护特定的活动键免受磁盘预算驱逐。持久的外部会话指针（例如群组会话和线程范围的聊天会话）也会按时间/计数/磁盘预算维护规则保留。
- `--agent <id>`：对单个配置的代理存储运行清理。
- `--all-agents`：对所有配置的代理存储运行清理。
- `--store <path>`：针对特定的 `sessions.json` 文件运行。
- `--json`：打印 JSON 摘要。配合 `--all-agents` 使用时，输出包含每个存储的摘要。

当 Gateway(网关) 可达时，对配置的代理存储进行的非试运行清理将通过 Gateway(网关) 发送，以便其与运行时流量共享相同的会话存储写入器。使用 `--store <path>` 可对存储文件进行显式离线修复。

`openclaw sessions cleanup --all-agents --dry-run --json`：

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

相关：

- 会话配置：[配置参考](/zh/gateway/config-agents#session)

## 相关

- [CLI 参考](/zh/cli)
- [会话管理](/zh/concepts/session)
