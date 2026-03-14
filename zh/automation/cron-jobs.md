---
summary: "Cron jobs + wakeups for the Gateway 网关 scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway 网关 scheduler)

> **Cron vs Heartbeat?** See [Cron vs Heartbeat](/zh/en/automation/cron-vs-heartbeat) for guidance on when to use each.

Cron is the Gateway 网关’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

Troubleshooting: [/automation/故障排除](/zh/en/automation/故障排除)

## TL;DR

- Cron runs **inside the Gateway 网关** (not inside the 模型).
- 作业持久化保存在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- Two execution styles:
  - **主会话 (Main 会话)**：将一个系统事件加入队列，然后在下一次心跳时运行。
  - **隔离 (Isolated)**：在 `cron:<jobId>` 中运行一次专门的 Agent 轮次，并包含投递（默认为 announce 或 none）。
- Wakeups are first-class: a job can request “wake now” vs “next heartbeat”.
- Webhook 投递是通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 针对每个作业进行的。
- 当设置了 `cron.webhook` 时，针对带有 `notify: true` 的已存储作业，仍然保留旧版回退机制，请将这些作业迁移到 Webhook 投递模式。
- 对于升级，`openclaw doctor --fix` 可以在调度程序接触这些字段之前，规范化旧版 cron 存储字段。

## 快速开始 (actionable)

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

## Tool-call equivalents (Gateway 网关 cron 工具)

For the canonical JSON shapes and examples, see [JSON schema for 工具 calls](/zh/en/automation/cron-jobs#-schema-for-工具-calls).

## Where cron jobs are stored

Cron 作业默认持久化保存在 Gateway 网关 主机的 `~/.openclaw/cron/jobs.json` 处。
Gateway 网关 会将文件加载到内存中，并在更改时写回，因此只有在 Gateway 网关 停止时手动编辑才是安全的。建议使用 `openclaw cron add/edit` 或 cron 工具调用 API 进行更改。

## Beginner-friendly overview

Think of a cron job as: **when** to run + **what** to do.

1. **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳省略了时区，它将被视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行一次专门的 Agent 轮次。

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
- 可选的 **投递模式** (`announce`、`webhook` 或 `none`)。
- 可选的 **代理绑定** (`agentId`)：在特定代理下运行该作业；如果
  缺失或未知，网关将回退到默认代理。

作业通过稳定的 `jobId` 标识（由 CLI/Gateway 网关 API 使用）。
在代理工具调用中，`jobId` 是规范的；为兼容性保留 `id`。
一次性作业默认在成功后自动删除；设置 `deleteAfterRun: false` 以保留它们。

### 时间表

Cron 支持三种时间表类型：

- `at`：通过 `schedule.at` (ISO 8601) 指定的一次性时间戳。
- `every`：固定间隔（毫秒）。
- `cron`：5字段 cron 表达式（或带秒的6字段），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway 网关 主机的
本地时区。

为了减少跨多个网关的整点负载峰值，OpenClaw 对循环
整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用
确定性的每个作业长达 5 分钟的交错窗口。固定小时
表达式如 `0 7 * * *` 保持精确。

对于任何 cron 计划，您可以使用 `schedule.staggerMs`
（`0` 保持精确计时）设置显式交错窗口。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以设置显式交错窗口。
- `--exact` 以强制 `staggerMs = 0`。

### 主会话执行与隔离执行

#### 主会话任务（系统事件）

主作业将系统事件加入队列，并可选地唤醒心跳运行器。
它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发即时心跳运行。
- `wakeMode: "next-heartbeat"`：事件等待下一次计划的心跳。

当您想要正常的心跳提示 + 主会话上下文时，这是最佳选择。
请参阅 [心跳](/zh/en/gateway/heartbeat)。

#### 隔离任务（专用 cron 会话）

隔离作业在会话 `cron:<jobId>` 中运行专用的代理回合。

关键行为：

- 提示前缀为 `[cron:<jobId> <job name>]` 以便追溯。
- 每次运行都会启动一个**全新的会话 ID**（不保留之前的对话上下文）。
- 默认行为：如果省略了 `delivery`，隔离任务会宣布一个摘要 (`delivery.mode = "announce"`)。
- `delivery.mode` 决定了发生什么：
  - `announce`：将摘要发送到目标频道，并向主会话发布简要摘要。
  - `webhook`：当完成事件包含摘要时，将完成事件载荷 POST 到 `delivery.to`。
  - `none`：仅限内部（无投递，无主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次预定的心跳。

对于嘈杂、频繁或“后台杂务”，请使用隔离任务，以免它们刷屏
您的聊天记录。

### 负载形式（运行内容）

支持两种负载类型：

- `systemEvent`：仅限主会话，通过心跳提示路由。
- `agentTurn`：仅限隔离会话，运行专用的代理轮次。

常见的 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选的超时覆盖。
- `lightContext`：针对不需要工作区启动文件注入的任务的可选轻量级启动模式。

交付配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定频道。
- `delivery.to`：特定于频道的目标（announce）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果 announce 投递失败，避免使任务失败。

Announce 投递会抑制该运行的消息工具发送；请改用 `delivery.channel`/`delivery.to`
来定位聊天。当 `delivery.mode = "none"` 时，不会向主会话发布摘要。

如果对于独立作业省略了 `delivery`，OpenClaw 默认为 `announce`。

#### Announce 交付流程

当 `delivery.mode = "announce"` 时，cron 会通过出站通道适配器直接进行传递。主代理不会启动来构建或转发消息。

行为细节：

- 内容：交付使用隔离运行的出站负载（文本/媒体），并进行正常的分块和
  频道格式化。
- 仅包含心跳的响应（没有实际内容的 `HEARTBEAT_OK`）不会被传递。
- 如果隔离运行已经通过消息工具向同一目标发送了消息，则
  跳过交付以避免重复。
- 缺失或无效的传递目标会导致作业失败，除非设置了 `delivery.bestEffort = true`。
- 仅当 `delivery.mode = "announce"` 时，才会向主会话发布简短摘要。
- 主会话摘要遵循 `wakeMode`：`now` 触发立即心跳，
`next-heartbeat` 则等待下一次计划的心跳。

#### Webhook 交付流程

当 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件有效负载发布到 `delivery.to`。

行为细节：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试频道交付。
- 在 Webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的回退机制：具有 `notify: true` 的存储旧版作业仍会发布到 `cron.webhook`（如果已配置），并带有警告，以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思考重写

独立作业（`agentTurn`）可以覆盖模型和思考级别：

- `model`：提供商/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅限 GPT-5.2 + Codex 模型）

注意：您也可以在主会话作业上设置 `model`，但这会更改共享的主会话模型。我们建议仅在独立作业上使用模型覆盖，以避免意外的上下文变化。

解析优先级：

1. 作业负载重写（最高）
2. Hook 特定的默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级引导上下文

隔离作业（`agentTurn`）可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将其用于不需要工作区引导文件注入的定期琐事。
- 实际上，嵌入式运行时使用 `bootstrapContextMode: "lightweight"` 运行，这会故意使 cron 引导上下文保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（渠道 + 目标）

隔离作业可以通过顶级 `delivery` 配置将输送到通道：

- `delivery.mode`：`announce`（通道输送）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`。
- `delivery.to`：特定于通道的接收者目标。

`announce` 输送仅对隔离作业（`sessionTarget: "isolated"`）有效。
`webhook` 输送对主作业和隔离作业均有效。

如果省略 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的“最后路由”（代理最后回复的地方）。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
  Mattermost 纯 26 字符 ID 以“用户优先”方式解析（如果用户存在则为 私信，否则为频道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 形式（见下文）。

#### Telegram 投递目标（主题 / 论坛话题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 投递，您可以将主题/线程编码到 `to` 字段中：

- `-1001234567890`（仅限 chat id）
- `-1001234567890:topic:123`（首选：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

也接受像 `telegram:...` / `telegram:group:...` 这样的前缀目标：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

直接调用 Gateway 网关 `cron.*` 工具（代理工具调用或 RPC）时，请使用这些格式。CLI 标志接受像 `20m` 这样的人类可读时长，但工具调用应将 ISO 8601 字符串用于 `schedule.at`，将毫秒用于 `schedule.everyMs`。

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

- `schedule.kind`: `at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，可选 `tz`)。
- `schedule.at` 接受 ISO 8601（时区可选；如果省略则视为 UTC）。
- `everyMs` 为毫秒。
- `sessionTarget` 必须为 `"main"` 或 `"isolated"` 并且必须与 `payload.kind` 匹配。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（对于 `at` 默认为 true），
  `delivery`。
- 当省略时，`wakeMode` 默认为 `"now"`。

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

- `jobId` 是规范名称；为兼容性接受 `id`。
- 在补丁中使用 `agentId: null` 来清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（Gateway 网关 托管的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，按大小和行数自动修剪）。
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

配置 `cron.retry` 以覆盖这些默认值（参见 [Configuration](/zh/en/automation/cron-jobs#configuration)）。

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

- 首选：为每个任务设置 `delivery.mode: "webhook"` 并带有 `delivery.to: "https://..."`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，payload 为 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，则 auth 标头为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不发送 `Authorization` 标头。
- 已弃用的回退：具有 `notify: true` 的存储遗留任务在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false`（配置）
- `OPENCLAW_SKIP_CRON=1`（环境变量）

## 维护

Cron 有两个内置的维护路径：独立运行会话保留和运行日志修剪。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话修剪）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 隔离运行会创建会话条目（`...:cron:<jobId>:run:<uuid>`）和转录文件。
- 清理器会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于会话存储不再引用的已移除运行会话，OpenClaw 会存档转录文件，并在同一保留窗口内清除旧的已删除存档。
- 在每次运行追加后，会对 `cron/runs/<jobId>.jsonl` 进行大小检查：
  - 如果文件大小超过 `runLog.maxBytes`，则将其修剪为最新的 `runLog.keepLines` 行。

### 高频调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护机制，但宽松的限制仍可能造成不必要的 IO 和清理工作。

需要注意的事项：

- 包含许多隔离运行的漫长 `cron.sessionRetention` 窗口
- 高 `cron.runLog.keepLines` 结合大 `runLog.maxBytes`
- 许多嘈杂的重复性作业写入同一个 `cron/runs/<jobId>.jsonl`

应对措施：

- 在调试/审计需求允许的范围内，尽可能保持 `cron.sessionRetention` 短暂
- 使用适中的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志的大小
- 将嘈杂的后台任务移至隔离模式，并使用能避免不必要消息传递的传递规则
- 定期使用 `openclaw cron runs` 检查增长情况，并在日志变大之前调整保留策略

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

手动运行（默认为强制，使用 `--due` 仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 现在会在手动运行排队后立即确认，而不是在作业完成后。成功的排队响应看起来像 `{ ok: true, enqueued: true, runId }`。如果作业正在运行或 `--due` 发现没有到期的作业，响应保持为 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` 网关方法来检查最终的完成条目。

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

## Gateway 网关 API 表面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run`（强制或到期），`cron.runs`
  对于没有作业的即时系统事件，请使用 [`openclaw system event`](/zh/en/cli/system)。

## 故障排查

### “没有任务运行”

- 检查 cron 是否已启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway 网关 是否持续运行（cron 在 Gateway 网关 进程内运行）。
- 对于 `cron` 计划：确认时区 (`--tz`) 与主机时区。

### 周期性任务在失败后不断延迟

- 在连续发生错误后，OpenClaw 会对周期性任务应用指数退避重试机制：
  30秒、1分钟、5分钟、15分钟，然后重试间隔为60分钟。
- 退避机制会在下一次成功运行后自动重置。
- 一次性 (`at`) 任务会重试瞬态错误（速率限制、过载、网络、server_error），最多重试 3 次并采用退避策略；永久错误则立即禁用。请参阅 [重试策略](/zh/en/automation/cron-jobs#retry-policy)。

### Telegram 递送到了错误的位置

- 对于论坛主题，请使用 `-100…:topic:<id>`，这样既明确又无歧义。
- 如果您在日志或存储的“last route”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 递送接受它们，并且仍然能正确解析话题 ID。

### 子代理公告递送重试

- 当子代理运行完成时，网关会将结果公告给请求者会话。
- 如果 announce flow 返回 `false`（例如请求者会话正忙），网关将通过 `announceRetryCount` 进行追踪，最多重试 3 次。
- 超过 `endedAt` 5 分钟的 announce 将被强制过期，以防止陈旧条目无限循环。
- 如果您在日志中看到重复的 announce 传递，请检查 subagent 注册表中具有高 `announceRetryCount` 值的条目。

import zh from '/components/footer/zh.mdx';

<zh />
