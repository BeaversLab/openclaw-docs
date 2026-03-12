---
summary: "Cron jobs + wakeups for the Gateway scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway scheduler)

> **Cron vs Heartbeat?** See [Cron vs Heartbeat](/zh/en/automation/cron-vs-heartbeat) for guidance on when to use each.

Cron is the Gateway’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

Troubleshooting: [/automation/troubleshooting](/zh/en/automation/troubleshooting)

## TL;DR

- Cron runs **inside the Gateway** (not inside the model).
- Jobs persist under `~/.openclaw/cron/` so restarts don’t lose schedules.
- Two execution styles:
  - **Main session**: enqueue a system event, then run on the next heartbeat.
  - **Isolated**: run a dedicated agent turn in `cron:<jobId>`, with delivery (announce by default or none).
- Wakeups are first-class: a job can request “wake now” vs “next heartbeat”.
- Webhook posting is per job via `delivery.mode = "webhook"` + `delivery.to = "<url>"`.
- Legacy fallback remains for stored jobs with `notify: true` when `cron.webhook` is set, migrate those jobs to webhook delivery mode.
- For upgrades, `openclaw doctor --fix` can normalize legacy cron store fields before the scheduler touches them.

## Quick start (actionable)

Create a one-shot reminder, verify it exists, and run it immediately:

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id>
openclaw cron runs --id <job-id>
```

Schedule a recurring isolated job with delivery:

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

## Tool-call equivalents (Gateway cron tool)

For the canonical JSON shapes and examples, see [JSON schema for tool calls](/zh/en/automation/cron-jobs#-schema-for-tool-calls).

## Where cron jobs are stored

Cron jobs are persisted on the Gateway host at `~/.openclaw/cron/jobs.json` by default.
The Gateway loads the file into memory and writes it back on changes, so manual edits
are only safe when the Gateway is stopped. Prefer `openclaw cron add/edit` or the cron
tool call API for changes.

## Beginner-friendly overview

Think of a cron job as: **when** to run + **what** to do.

1. **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳省略了时区，它将被视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用的代理轮次。

3. **选择负载**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：一次性作业 (`schedule.kind = "at"`) 默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 作业

Cron 作业是一个包含以下内容的存储记录：

- 一个 **时间表**（何时运行），
- 一个 **负载**（要做什么），
- 可选的 **传递模式** (`announce`、`webhook` 或 `none`)。
- 可选的 **代理绑定** (`agentId`)：在特定代理下运行作业；如果
  缺失或未知，网关将回退到默认代理。

作业由稳定的 `jobId` 标识（由 CLI/网关 API 使用）。
在代理工具调用中，`jobId` 是规范的；为了兼容性，接受旧版 `id`。
一次性作业默认在成功后自动删除；设置 `deleteAfterRun: false` 以保留它们。

### 时间表

Cron 支持三种时间表类型：

- `at`：通过 `schedule.at` (ISO 8601) 进行一次性时间戳设置。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式（或 6 字段带秒），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用网关主机的
本地时区。

为了减少许多网关在整点时的负载峰值，OpenClaw 会针对重复的
整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用最多 5 分钟的确定性逐作业错开窗口。定点小时
表达式（例如 `0 7 * * *`）保持精确。

对于任何 cron 计划，您可以使用 `schedule.staggerMs` 设置显式的交错窗口
(`0` 保持精确计时)。CLI 快捷方式：

- `--stagger 30s` (或 `1m`, `5m`) 用于设置显式的交错窗口。
- `--exact` 强制 `staggerMs = 0`。

### 主会话执行与隔离执行

#### 主会话任务（系统事件）

主任务将系统事件加入队列，并可选择唤醒心跳运行器。
它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"` (默认)：事件触发立即运行心跳。
- `wakeMode: "next-heartbeat"`：事件等待下一次计划的心跳。

当您想要正常的心跳提示 + 主会话上下文时，这是最佳选择。
请参阅 [心跳](/zh/en/gateway/heartbeat)。

#### 隔离任务（专用 cron 会话）

隔离任务在会话 `cron:<jobId>` 中运行专用的 agent 轮次。

关键行为：

- 提示前缀为 `[cron:<jobId> <job name>]` 以便进行追踪。
- 每次运行都会启动一个**全新的会话 ID**（不保留之前的对话上下文）。
- 默认行为：如果省略了 `delivery`，隔离任务会宣布一个摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 决定接下来发生什么：
  - `announce`：将摘要发送到目标频道，并向主会话发布简短摘要。
  - `webhook`：当完成的事件包含摘要时，将完成的事件负载 POST 到 `delivery.to`。
  - `none`：仅内部使用（不发送，没有主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次计划的心跳。

对于嘈杂、频繁或“后台杂务”，请使用隔离任务，以免它们刷屏
您的聊天记录。

### 负载形式（运行内容）

支持两种负载类型：

- `systemEvent`：仅限主会话，通过心跳提示路由。
- `agentTurn`：仅限隔离会话，运行专用的 agent 轮次。

常见的 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选超时覆盖。
- `lightContext`：针对不需要工作区启动文件注入的作业的可选轻量级启动模式。

交付配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定频道。
- `delivery.to`：频道特定目标（announce）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：避免在 announce 交付失败时使作业失败。

Announce 交付会抑制运行时的消息工具发送；请使用 `delivery.channel`/`delivery.to` 来定位聊天。当 `delivery.mode = "none"` 时，不会向主会话发布摘要。

如果为隔离作业省略了 `delivery`，OpenClaw 默认为 `announce`。

#### Announce 交付流程

当 `delivery.mode = "announce"` 时，cron 会通过出站频道适配器直接交付。不会启动主代理来制作或转发消息。

行为细节：

- 内容：交付使用隔离运行的出站负载（文本/媒体），并进行正常的分块和
  频道格式化。
- 仅 Heartbeat 的响应（没有真实内容的 `HEARTBEAT_OK`）不会被交付。
- 如果隔离运行已经通过消息工具向同一目标发送了消息，则
  跳过交付以避免重复。
- 缺失或无效的交付目标会导致作业失败，除非 `delivery.bestEffort = true`。
- 仅当 `delivery.mode = "announce"` 时，才会向主会话发布简短摘要。
- 主会话摘要遵循 `wakeMode`：`now` 会触发立即的 heartbeat，而
  `next-heartbeat` 会等待下一次计划的 heartbeat。

#### Webhook 交付流程

当 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件负载发布到 `delivery.to`。

行为细节：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试频道交付。
- 在 Webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的回退机制：带有 `notify: true` 的存储遗留作业仍会发布到 `cron.webhook`（如果已配置），并附带警告，以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思考重写

隔离作业 (`agentTurn`) 可以重写模型和思考级别：

- `model`：提供者/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思考级别 (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; 仅限 GPT-5.2 + Codex 模型)

注意：您也可以在主会话作业上设置 `model`，但这会更改共享的主会话模型。我们建议仅对隔离作业进行模型重写，以避免意外的上下文切换。

解析优先级：

1. 作业负载重写（最高）
2. 钩子特定的默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级引导上下文

隔离作业 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将其用于不需要工作区引导文件注入的定期琐事。
- 实际上，嵌入式运行时使用 `bootstrapContextMode: "lightweight"` 运行，这特意使 cron 引导上下文保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（渠道 + 目标）

隔离作业可以通过顶级 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道交付）、`webhook` (HTTP POST) 或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (插件) / `signal` / `imessage` / `last`。
- `delivery.to`：特定于渠道的接收者目标。

`announce` 投递仅对隔离任务（`sessionTarget: "isolated"`）有效。
`webhook` 投递对主任务和隔离任务均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的
“最后路由”（代理回复的最后一个位置）。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`，`user:<id>`）以避免歧义。
  Mattermost 纯 26 字符 ID 以**用户优先**方式解析（如果用户存在则为私信，否则为频道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 格式（见下文）。

#### Telegram 投递目标（主题 / 论坛话题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 投递，您可以将
主题/话题编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（推荐：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

也接受像 `telegram:...` / `telegram:group:...` 这样的带前缀目标：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

直接调用 Gateway `cron.*` 工具（代理工具调用或 RPC）时使用这些结构。
CLI 标志接受像 `20m` 这样的人类可读时长，但工具调用应使用 ISO 8601 字符串
作为 `schedule.at`，并使用毫秒作为 `schedule.everyMs`。

### cron.add 参数

一次性，主会话任务（系统事件）：

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "at": "2026-02-01T16:00:00Z" },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

带有投递的周期性隔离任务：

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "lightContext": true
  },
  "delivery": {
    "mode": "announce",
    "channel": "slack",
    "to": "channel:C1234567890",
    "bestEffort": true
  }
}
```

注释：

- `schedule.kind`：`at`（`at`）、`every`（`everyMs`）或 `cron`（`expr`，可选 `tz`）。
- `schedule.at` 接受 ISO 8601 格式（时区可选；省略时视为 UTC）。
- `everyMs` 单位为毫秒。
- `sessionTarget` 必须是 `"main"` 或 `"isolated"` 并且必须匹配 `payload.kind`。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（对于 `at` 默认为 true），
  `delivery`。
- 如果省略，`wakeMode` 默认为 `"now"`。

### cron.update 参数

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

备注：

- `jobId` 为标准字段；`id` 被接受以保证兼容性。
- 在补丁中使用 `agentId: null` 来清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 任务存储：`~/.openclaw/cron/jobs.json`（Gateway 管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，根据大小和行数自动修剪）。
- `sessions.json` 中的隔离 cron 运行会话由 `cron.sessionRetention` 修剪（默认 `24h`；设置 `false` 以禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当任务失败时，OpenClaw 会将错误分类为 **瞬时**（可重试）或 **永久**（立即禁用）。

### 瞬时错误（可重试）

- 速率限制 (429, 请求过多, 资源耗尽)
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误 (超时, ECONNRESET, 获取失败, 套接字)
- 服务器错误 (5xx)
- Cloudflare 相关错误

### 永久错误（不重试）

- 认证失败 (无效的 API 密钥, 未授权)
- 配置或验证错误
- 其他非瞬时错误

### 默认行为（无配置）

**一次性任务 (`schedule.kind: "at"`)：**

- 发生瞬时错误时：使用指数退避重试最多 3 次 (30秒 → 1分钟 → 5分钟)。
- 发生永久错误时：立即禁用。
- 成功或跳过时：禁用（如果设置了 `deleteAfterRun: true` 则删除）。

**循环任务 (`cron` / `every`)：**

- 发生任何错误时：在下一次计划运行之前应用指数退避 (30秒 → 1分钟 → 5分钟 → 15分钟 → 60分钟)。
- 任务保持启用状态；退避将在下一次成功运行后重置。

配置 `cron.retry` 以覆盖这些默认值（参见 [配置](/zh/en/automation/cron-jobs#configuration)）。

## 配置

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // default 1
    // Optional: override retry policy for one-shot jobs
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-webhook-token", // optional bearer token for webhook mode
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

运行日志修剪行为：

- `cron.runLog.maxBytes`：修剪前的最大运行日志文件大小。
- `cron.runLog.keepLines`：修剪时，仅保留最新的 N 行。
- 两者均适用于 `cron/runs/<jobId>.jsonl` 文件。

Webhook 行为：

- 首选：针对每个作业，使用 `delivery.to: "https://..."` 设置 `delivery.mode: "webhook"`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，payload 为 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，auth 标头为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不发送 `Authorization` 标头。
- 已弃用的回退机制：存储的带有 `notify: true` 的旧版作业在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false` (config)
- `OPENCLAW_SKIP_CRON=1` (env)

## 维护

Cron 有两个内置的维护路径：独立运行会话保留和运行日志修剪。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话修剪）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 独立运行会创建会话条目 (`...:cron:<jobId>:run:<uuid>`) 和转录文件。
- 清理器会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于会话存储不再引用的已移除运行会话，OpenClaw 会存档转录文件，并在同一保留窗口内清除旧的已删除存档。
- 每次运行追加后，会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，它将被修剪为最新的 `runLog.keepLines` 行。

### 高频调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护机制，但宽松的限制仍可能造成不必要的 IO 和清理工作。

需要注意的事项：

- 包含许多独立运行的较长 `cron.sessionRetention` 窗口
- 较高的 `cron.runLog.keepLines` 结合较大的 `runLog.maxBytes`
- 许多向同一个 `cron/runs/<jobId>.jsonl` 写入的嘈杂循环作业

应对措施：

- 在调试/审计需求允许的范围内，尽可能将 `cron.sessionRetention` 设置得较短
- 通过适度的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志的大小
- 将嘈杂的后台任务移至隔离模式，并使用能避免不必要消息传递的传递规则
- 使用 `openclaw cron runs` 定期检查增长情况，并在日志变大之前调整保留策略

### 自定义示例

保留运行会话一周，并允许更大的运行日志：

```json5
{
  cron: {
    sessionRetention: "7d",
    runLog: {
      maxBytes: "10mb",
      keepLines: 5000,
    },
  },
}
```

禁用隔离运行会话的清理，但保留运行日志的清理：

```json5
{
  cron: {
    sessionRetention: false,
    runLog: {
      maxBytes: "5mb",
      keepLines: 3000,
    },
  },
}
```

针对高频 cron 使用的调优（示例）：

```json5
{
  cron: {
    sessionRetention: "12h",
    runLog: {
      maxBytes: "3mb",
      keepLines: 1500,
    },
  },
}
```

## CLI 快速入门

一次性提醒（UTC ISO，成功后自动删除）：

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

一次性提醒（主会话，立即唤醒）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

定期隔离任务（通知到 WhatsApp）：

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

带有显式 30 秒交错（stagger）的定期 cron 任务：

```bash
openclaw cron add \
  --name "Minute watcher" \
  --cron "0 * * * * *" \
  --tz "UTC" \
  --stagger 30s \
  --session isolated \
  --message "Run minute watcher checks." \
  --announce
```

定期隔离任务（发送到 Telegram 话题）：

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

覆盖模型和思考配置的隔离任务：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

代理选择（多代理设置）：

```bash
# Pin a job to agent "ops" (falls back to default if that agent is missing)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# Switch or clear the agent on an existing job
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手动运行（强制运行是默认行为，使用 `--due` 以仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 现在在手动运行加入队列后即确认，而不是在任务完成后。成功的队列响应看起来像 `{ ok: true, enqueued: true, runId }`。如果任务正在运行或者 `--due` 发现没有到期任务，响应将保持为 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法来检查最终的完成条目。

编辑现有任务（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有的 cron 任务按计划准确运行（无交错）：

```bash
openclaw cron edit <jobId> --exact
```

运行历史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

不创建任务的即时系统事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 表面

- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（强制或到期）、`cron.runs`
  对于没有任务的即时系统事件，请使用 [`openclaw system event`](/zh/en/cli/system)。

## 故障排查

### “没有任务运行”

- 检查 cron 是否已启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway 是否持续运行（cron 在 Gateway 进程内运行）。
- 对于 `cron` 计划：确认时区（`--tz`）与主机时区是否一致。

### 周期性任务在失败后不断延迟

- 在连续发生错误后，OpenClaw 会对周期性任务应用指数退避重试机制：
  30秒、1分钟、5分钟、15分钟，然后重试间隔为60分钟。
- 退避机制会在下一次成功运行后自动重置。
- 一次性 (`at`) 任务会对瞬时错误（速率限制、过载、网络、server_error）重试最多3次，并采用退避策略；永久性错误会立即禁用任务。请参阅[重试策略](/zh/en/automation/cron-jobs#retry-policy)。

### Telegram 递送到了错误的位置

- 对于论坛话题，请使用 `-100…:topic:<id>`，这样既明确又无歧义。
- 如果你在日志或存储的“last route”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 递送接受它们，并且仍然能正确解析话题 ID。

### 子代理公告递送重试

- 当子代理运行完成时，网关会将结果公告给请求者会话。
- 如果公告流程返回 `false`（例如请求者会话正忙），网关将重试最多3次，并通过 `announceRetryCount` 进行跟踪。
- 超过 `endedAt` 5分钟以上的公告将被强制过期，以防止过期条目无限循环。
- 如果日志中出现重复的公告递送，请检查子代理注册表中 `announceRetryCount` 值较高的条目。
