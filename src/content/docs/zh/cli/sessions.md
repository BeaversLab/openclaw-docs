---
summary: "CLICLI reference for `openclaw sessions` (list stored sessions + usage)"
read_when:
  - You want to list stored sessions and see recent activity
title: "会话"
---

# `openclaw sessions`

列出存储的对话会话。

会话列表并非渠道/提供商的存活检查。它们显示的是会话存储中持久化的对话行。一个安静的 Discord、Slack、Telegram 或其他渠道可以在不创建新会话行的情况下成功重新连接，直到处理消息为止。当您需要实时的渠道连接时，请使用 DiscordSlackTelegram`openclaw channels status --probe`、`openclaw status --deep` 或 `openclaw health --verbose`。

`openclaw sessions`Gateway(网关) 和 Gateway(网关) `sessions.list`CLIGateway(网关)CLI 响应默认情况下是受限的，因此大型长期存储不会独占 CLI 进程或 Gateway(网关) 事件循环。CLI 默认返回最新的 100 个会话；传递 `--limit <n>` 以获取更小/更大的窗口，或者当您有意需要完整存储时传递 `--limit all`。当调用者需要显示存在更多行时，JSON 响应包含 `totalCount`、`limitApplied` 和 `hasMore`。

RPC 客户端可以传递 RPC`configuredAgentsOnly: true` 以保持广泛的组合发现源，但仅返回当前存在于配置中的代理的行。控制 UI 默认使用该模式，以便已删除或仅磁盘的代理存储不会重新出现在“会话”视图中。

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
- `--verbose`: verbose logging
- `--agent <id>`: one configured agent store
- `--all-agents`: aggregate all configured agent stores
- `--store <path>`: explicit store path (cannot be combined with `--agent` or `--all-agents`)
- `--limit <n|all>`: max rows to output (default `100`; `all` restores full output)

Tail human-readable trajectory progress for stored sessions:

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` 将最近的轨迹 JSONL 事件渲染为紧凑的进度行。如果没有 `--session-key`，它会首先跟踪正在运行的会话，然后是最新存储的会话。`--tail <count>` 控制在跟随模式之前打印多少现有事件；默认为 `80`，而 `0` 从当前末尾开始。`--follow` 保持监视所选的轨迹文件，包括由 `<session>.trajectory-path.json` 引用的已重定位文件。

进度视图是有意保守的：提示文本、工具参数和工具结果正文不会打印。工具调用使用 `{...redacted...}` 显示工具名称；工具结果显示状态，例如 `ok`、`error` 或 `done`；模型完成行显示提供商/模型和终端状态。

为存储的会话导出轨迹包：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

这是所有者批准执行请求后，`/export-trajectory` 斜杠命令使用的命令路径。输出目录始终在所选工作区内的 `.openclaw/trajectory-exports/` 内解析。

`openclaw sessions --all-agents` 读取配置的代理存储。Gateway(网关) 和 ACP 会话发现范围更广：它们还包括在默认 `agents/` 根目录或模板化 `session.store` 根目录下找到的仅磁盘存储。那些发现的存储必须解析为代理根目录内的常规 `sessions.json` 文件；符号链接和超出根目录的路径将被跳过。

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

- 范围说明：`openclaw sessions cleanup` 维护会话存储、副本和轨迹附件。它不会修剪 cron 运行历史，该历史由 [Cron 配置](/zh/automation/cron-jobs#configuration) 中的 `cron.runLog.keepLines` 管理，并在 [Cron 维护](/zh/automation/cron-jobs#maintenance) 中进行了解释。
- 清理还会修剪未引用的主要记录、压缩检查点和早于 `session.maintenance.pruneAfter` 的轨迹附件；被 `sessions.json` 引用的文件将被保留。

- `--dry-run`：预览将被修剪/封顶的条目数量，而不进行实际写入。
  - 在文本模式下，dry-run 会打印每个会话的操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），以便您查看哪些内容将被保留或删除。
- `--enforce`：即使 `session.maintenance.mode` 为 `warn`，也应用维护。
- `--fix-missing`：删除其记录文件缺失或仅为标头/空白的条目，即使它们通常尚未达到过期/计数上限。
- `--fix-dm-scope`：当 `session.dmScope` 为 `main` 时，停用早期 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由遗留的过时 peer-keyed direct-私信 行。请先使用 `--dry-run`；应用清理会从 `sessions.json` 中移除这些行，并将其记录保留为已删除的存档。
- `--active-key <key>`：保护特定的活动密钥免受磁盘预算驱逐。持久的外部对话指针（例如群组会话和线程范围的聊天会话）也会按年龄/计数/磁盘预算维护进行保留。
- `--agent <id>`：对单个配置的代理存储运行清理。
- `--all-agents`：对所有配置的代理存储运行清理。
- `--store <path>`：针对特定的 `sessions.json` 文件运行。
- `--json`：打印 JSON 摘要。使用 `--all-agents` 时，输出包含每个存储的摘要。

当 Gateway(网关) 可达时，针对已配置代理存储的非试运行清理将通过 Gateway(网关) 发送，以便其与运行时流量共享相同的会话存储写入器。使用 Gateway(网关)Gateway(网关)`--store <path>` 可显式离线修复存储文件。

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

- [CLI 参考](CLI/en/cli)
- [会话管理](/zh/concepts/session)
