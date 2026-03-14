---
summary: "Cron jobs + wakeups for the Gateway 网关 scheduler"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron Jobs"
---

# Cron jobs (Gateway 网关 scheduler)

> **Cron 与 Heartbeat？** 请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 了解何时使用各自的指导。

Cron is the Gateway 网关’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## TL;DR

- Cron runs **inside the Gateway 网关** (not inside the 模型).
- 作业持久化保存在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- Two execution styles:
  - **主会话**：将系统事件加入队列，然后在下一次心跳时运行。
  - **独立**：在 `cron:<jobId>` 中运行专用代理轮次，并传送输出（默认为公告或无）。
- 唤醒是一等公民：任务可以请求“立即唤醒”或“下一次心跳”。
- Webhook 发布是按任务通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 进行的。
- 当设置了 `cron.webhook` 时，对于带有 `notify: true` 的已存储任务，仍保留传统回退机制，请将这些任务迁移到 webhook 传送模式。
- 对于升级，`openclaw doctor --fix` 可以在调度程序接触它们之前规范化传统的 cron 存储字段。

## 快速开始（可操作）

创建一次性提醒，验证其存在，并立即运行它：

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

调度带有传送功能的周期性独立任务：

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

## 工具调用等效项（Gateway(网关) cron 工具）

有关规范的 JSON 形状和示例，请参阅 [JSON schema for 工具 calls](/zh/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 任务的存储位置

Cron 作业默认持久化在 Gateway(网关) 主机的 `~/.openclaw/cron/jobs.json` 处。Gateway(网关) 会将文件加载到内存中，并在发生更改时写回，因此只有在 Gateway(网关) 停止时，手动编辑才是安全的。对于更改，请首选 `openclaw cron add/edit` 或 cron 工具调用 API。

## 适合初学者的概述

可以将 cron 任务视为：**何时**运行 + **做**什么。

1. **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复任务 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳省略了时区，它将被视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行一次专用的代理轮次。

3. **选择负载（Payload）**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：单次作业（`schedule.kind = "at"`）默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 作业

Cron 作业是一条存储的记录，包含：

- 一个 **调度（schedule）**（何时运行），
- 一个 **负载（payload）**（做什么），
- 可选的 **交付模式**（`announce`、`webhook` 或 `none`）。
- 可选的 **代理绑定（agent binding）**（`agentId`）：在特定代理下运行该作业；如果
  缺失或未知，网关将回退到默认代理。

作业由一个稳定的 `jobId`（由 CLI/Gateway(网关) API 使用）标识。
在代理工具调用中，`jobId` 是规范的；为了兼容性，也接受传统的 `id`。
一次性作业默认在成功后自动删除；设置 `deleteAfterRun: false` 以保留它们。

### 调度

Cron 支持三种调度类型：

- `at`：通过 `schedule.at` 指定的一次性时间戳（ISO 8601）。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式（或 6 字段含秒），可带 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway(网关) 主机的本地时区。

为了减少许多 Gateway 网关在整点的负载峰值，OpenClaw 会针对循环的整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用确定的、最长 5 分钟的按任务错峰窗口。诸如 `0 7 * * *` 之类的固定小时表达式保持精确。

对于任何 cron 计划，您都可以使用 `schedule.staggerMs` 设置显式的错开窗口
（`0` 保持精确计时）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以设置显式的错开窗口。
- `--exact` 以强制 `staggerMs = 0`。

### 主执行与隔离执行

#### 主会话作业（系统事件）

主作业将系统事件加入队列，并可选择唤醒 heartbeat 运行器。
它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即的 heartbeat 运行。
- `wakeMode: "next-heartbeat"`：事件等待下一次计划的 heartbeat。

当您需要正常的 heartbeat 提示词 + 主会话上下文时，这是最佳选择。
请参阅 [Heartbeat](/zh/gateway/heartbeat)。

#### 隔离作业（专用 cron 会话）

隔离作业在会话 `cron:<jobId>` 中运行专用的 agent 轮次。

关键行为：

- 提示词前缀为 `[cron:<jobId> <job name>]` 以便追踪。
- 每次运行都会启动一个**全新的会话 ID**（无先前对话的延续）。
- 默认行为：如果省略 `delivery`，隔离作业将宣布摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 决定发生的情况：
  - `announce`：将摘要发送到目标渠道，并向主会话发布简短摘要。
  - `webhook`：当完成的事件包含摘要时，将完成的事件负载 POST 到 `delivery.to`。
  - `none`：仅限内部（无发送，无主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即 heartbeat。
  - `next-heartbeat`：等待下一次计划的 heartbeat。

请对嘈杂、频繁或“后台杂务”使用隔离作业，以免它们刷屏
您的主聊天历史记录。

### Payload shapes（运行内容）

支持两种 Payload 类型：

- `systemEvent`：仅限主会话，通过 heartbeat 提示路由。
- `agentTurn`：仅限隔离会话，运行专用的 Agent 轮次。

常用 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选的覆盖设置（见下文）。
- `timeoutSeconds`：可选的超时覆盖。
- `lightContext`：可选的轻量级引导模式，适用于不需要工作区引导文件注入的任务。

交付配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定渠道。
- `delivery.to`：特定于渠道的目标（announce）或 Webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果 announce 交付失败，避免导致任务失败。

Announce 交付会抑制运行时的消息工具发送；请使用 `delivery.channel`/`delivery.to`
来定位聊天。当 `delivery.mode = "none"` 时，不会将摘要发布到主会话。

如果独立作业省略了 `delivery`，OpenClaw 默认为 `announce`。

#### Announce 交付流程

当 `delivery.mode = "announce"` 时，cron 通过出站渠道适配器直接交付。
不会启动主 Agent 来编写或转发消息。

行为详情：

- 内容：交付使用隔离运行的出站 Payload（文本/媒体），并采用正常的分块和
  渠道格式化。
- 仅 Heartbeat 的响应（`HEARTBEAT_OK` 且没有实际内容）将不会被交付。
- 如果隔离运行已通过消息工具向同一目标发送了消息，则将
  跳过交付以避免重复。
- 除非设置 `delivery.bestEffort = true`，否则缺失或无效的投递目标将导致任务失败。
- 仅当 `delivery.mode = "announce"` 时，才会将简短摘要发布到主会话。
- 主会话摘要遵循 `wakeMode`：`now` 触发立即心跳，
  而 `next-heartbeat` 等待下一次计划的心跳。

#### Webhook 投递流程

当设置 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件负载发布到 `delivery.to`。

行为细节：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试进行渠道投递。
- 在 webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的后备方案：存储的具有 `notify: true` 的传统任务仍会发布到 `cron.webhook`（如果已配置），并附带警告，以便您迁移到 `delivery.mode = "webhook"`。

### 模型和思维覆盖设置

独立任务（`agentTurn`）可以覆盖模型和思维级别：

- `model`：提供商/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思维级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅限 GPT-5.2 + Codex 模型）

注意：您也可以在主会话任务上设置 `model`，但这会改变共享的主
会话模型。我们建议仅对独立任务使用模型覆盖，以避免
意外的上下文变化。

解析优先级：

1. 任务负载覆盖（最高）
2. 钩子特定的默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级启动上下文

隔离作业（`agentTurn`）可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将其用于不需要工作区引导文件注入的计划任务。
- 实际上，嵌入式运行时使用 `bootstrapContextMode: "lightweight"` 运行，这使得 cron 引导上下文特意保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 投递（渠道 + 目标）

隔离作业可以通过顶级 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道投递）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`。
- `delivery.to`：特定于渠道的收件人目标。

`announce` 投递仅对隔离作业（`sessionTarget: "isolated"`）有效。
`webhook` 投递对主作业和隔离作业均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的
“最后路由”（代理回复的最后位置）。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
  Mattermost 原生 26 字符 ID 的解析方式为**用户优先**（如果用户存在则为私信，否则为渠道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 格式（见下文）。

#### Telegram 投递目标（主题 / 论坛话题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 传递，您可以将主题/线索编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（推荐：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

也接受像 `telegram:...` / `telegram:group:...` 这样的前缀目标：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

直接调用 Gateway 网关 `cron.*` 工具（代理工具调用或 RPC）时，请使用这些格式。
CLI 标志接受人类可读的时长，如 `20m`，但工具调用应对 `schedule.at` 使用 ISO 8601 字符串，
对 `schedule.everyMs` 使用毫秒。

### cron.add 参数

一次性主会话作业（系统事件）：

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

带有传递的循环隔离作业：

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

注：

- `schedule.kind`：`at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，可选 `tz`)。
- `schedule.at` 接受 ISO 8601（时区可选；省略时视为 UTC）。
- `everyMs` 为毫秒。
- `sessionTarget` 必须是 `"main"` 或 `"isolated"` 并且必须匹配 `payload.kind`。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（对于 `at` 默认为 true）、
  `delivery`。
- 省略时 `wakeMode` 默认为 `"now"`。

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

注：

- `jobId` 是规范名称；为了兼容性也接受 `id`。
- 在补丁中使用 `agentId: null` 清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（Gateway(网关) 网关管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，按大小和行数自动修剪）。
- `sessions.json` 中隔离的 cron 运行会话通过 `cron.sessionRetention` 进行修剪（默认为 `24h`；设置 `false` 可禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当任务失败时，OpenClaw 会将错误分类为**瞬态**（可重试）或**永久**（立即禁用）。

### 瞬态错误（已重试）

- 速率限制（429，请求过多，资源耗尽）
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误（超时、ECONNRESET、抓取失败、套接字）
- 服务器错误（5xx）
- 与 Cloudflare 相关的错误

### 永久错误（不重试）

- 认证失败（API 密钥无效，未授权）
- 配置或验证错误
- 其他非瞬态错误

### 默认行为（无配置）

**一次性任务 (`schedule.kind: "at"`)：**

- 发生瞬态错误：使用指数退避重试最多 3 次（30s → 1m → 5m）。
- 发生永久错误：立即禁用。
- 成功或跳过：禁用（如果 `deleteAfterRun: true` 则删除）。

**周期性任务 (`cron` / `every`)：**

- 发生任何错误：在下次计划运行前应用指数退避（30s → 1m → 5m → 15m → 60m）。
- 任务保持启用；退避会在下次成功运行后重置。

配置 `cron.retry` 以覆盖这些默认值（请参阅[配置](/zh/automation/cron-jobs#configuration)）。

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
- 两者都适用于 `cron/runs/<jobId>.jsonl` 文件。

Webhook 行为：

- 首选做法：针对每个作业，使用 `delivery.to: "https://..."` 设置 `delivery.mode: "webhook"`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，有效负载是 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，auth 标头为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不发送 `Authorization` 标头。
- 已弃用的后备方案：存储的具有 `notify: true` 的旧版作业在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false` (配置)
- `OPENCLAW_SKIP_CRON=1` (环境变量)

## 维护

Cron 有两个内置维护路径：独立运行会话保留和运行日志修剪。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话修剪）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 独立运行会创建会话条目 (`...:cron:<jobId>:run:<uuid>`) 和转录文件。
- 清理器会移除早于 `cron.sessionRetention` 的已过期运行会话条目。
- 对于会话存储不再引用的已移除运行会话，OpenClaw 会在同一保留窗口内归档脚本文件并清除旧的已删除归档。
- 每次运行追加后，都会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，则会将其修剪为最新的 `runLog.keepLines` 行。

### 高频调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用空间。虽然已内置维护功能，但宽松的限制仍可能导致不必要的 IO 和清理工作。

注意要点：

- 存在许多独立运行的较长 `cron.sessionRetention` 窗口
- 高 `cron.runLog.keepLines` 结合大 `runLog.maxBytes`
- 许多嘈杂的重复性作业写入同一个 `cron/runs/<jobId>.jsonl`

解决方案：

- 根据调试/审计需求，将 `cron.sessionRetention` 保持得尽可能短
- 使用适度的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志
- 将嘈杂的后台作业移至隔离模式，并使用避免不必要的闲聊的传递规则
- 定期使用 `openclaw cron runs` 检查增长情况，并在日志变大之前调整保留策略

### 自定义示例

保留运行会话一周并允许更大的运行日志：

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

禁用隔离运行会话清理，但保留运行日志清理：

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

针对高容量 cron 使用的调优（示例）：

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

循环独立作业（通知到 WhatsApp）：

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

具有明确的 30 秒交错时间的重复性 cron 作业：

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

循环独立作业（投递到 Telegram 话题）：

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

具有模型和思维覆盖的隔离作业：

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

手动运行（强制是默认值，使用 `--due` 仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 现在在手动运行排队后立即确认，而不是在作业完成后。成功的排队响应看起来像 `{ ok: true, enqueued: true, runId }`。如果作业已经在运行或者 `--due` 没有找到到期作业，响应将保持 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` 网关方法来检查最终完成的条目。

编辑现有作业（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有的 cron 作业严格按照计划运行（无交错）：

```bash
openclaw cron edit <jobId> --exact
```

运行历史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

立即创建系统事件而不创建作业：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway 网关 API 表面

- `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`
- `cron.run` (force or due), `cron.runs`
  对于没有作业的即时系统事件，请使用 [`openclaw system event`](/zh/cli/system)。

## 故障排查

### “没有任务运行”

- 检查是否启用了 cron：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 网关是否持续运行（cron 在 Gateway(网关) 网关进程内运行）。
- 对于 `cron` 计划：确认时区 (`--tz`) 与主机时区是否一致。

### 周期性作业在失败后持续延迟

- OpenClaw 会在连续错误后对周期性任务应用指数退避重试策略：
  30s、1m、5m、15m，然后每次重试间隔 60m。
- 退避机制会在下一次成功运行后自动重置。
- 一次性 (`at`) 作业会重试瞬时错误（速率限制、过载、网络、server_error）最多 3 次，采用退避策略；永久错误会立即禁用作业。请参阅 [重试策略](/zh/automation/cron-jobs#retry-policy)。

### Telegram 递送到了错误的位置

- 对于论坛主题，请使用 `-100…:topic:<id>`，这样既明确又无歧义。
- 如果您在日志或存储的“last route”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 传送接受这些前缀，并且仍然能正确解析主题 ID。

### 子代理公告传送重试

- 当子代理运行完成时，网关会将结果公告给请求者会话。
- 如果公告流程返回 `false`（例如请求者会话正忙），网关将最多重试 3 次，并通过 `announceRetryCount` 进行跟踪。
- 超过 `endedAt` 时间 5 分钟以上的公告将被强制过期，以防止陈旧条目无限循环。
- 如果您在日志中看到重复的公告传送，请检查子代理注册表中具有较高 `announceRetryCount` 值的条目。

import zh from '/components/footer/zh.mdx';

<zh />
