---
summary: "Gateway(网关) 调度器的 Cron 作业 + 唤醒"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron 作业"
---

# Cron jobs (Gateway 网关 scheduler)

> **Cron 与 Heartbeat 对比？** 请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 以获取关于何时使用每种方法的指导。

Cron is the Gateway 网关’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## TL;DR

- Cron runs **inside the Gateway 网关** (not inside the 模型).
- 作业持久化存储在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- Two execution styles:
  - **主会话**：将系统事件加入队列，然后在下一次心跳时运行。
  - **独立 (Isolated)**：在 `cron:<jobId>` 或自定义会话中运行专用的代理轮次，并进行投递（默认为公告或不投递）。
  - **当前会话**：绑定到创建 cron 的会话 (`sessionTarget: "current"`)。
  - **自定义会话**：在持久的命名会话中运行 (`sessionTarget: "session:custom-id"`)。
- 唤醒是一等公民：作业可以请求“立即唤醒”与“下一次心跳”。
- 通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 对每个作业进行 Webhook 投递。
- 当设置了 `cron.webhook` 时，对于带有 `notify: true` 的已存储作业，仍保留旧版回退机制，请将这些作业迁移到 webhook 投递模式。
- 对于升级，`openclaw doctor --fix` 可以在调度程序接触旧版 cron 存储字段之前对其进行规范化。

## 快速开始（可执行）

创建一次性提醒，验证其存在，并立即运行：

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

安排一个带有投递的周期性独立作业：

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

有关规范的 JSON 结构和示例，请参阅 [工具调用的 JSON 架构](/zh/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业的存储位置

Cron 作业默认持久化存储在 Gateway(网关) 主机的 `~/.openclaw/cron/jobs.json` 中。
Gateway(网关) 会将文件加载到内存中并在更改时写回，因此只有在 Gateway(网关) 停止时手动编辑才是安全的。建议使用 `openclaw cron add/edit` 或 cron
工具调用 API 进行更改。

## 新手友好的概述

可以将 cron 作业理解为：**何时**运行 + **做什么**。

1. **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI：`--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳省略了时区，则将其视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用的代理回合。
   - `sessionTarget: "current"` → 绑定到当前会话（在创建时解析为 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持久化命名会话中运行，该会话在多次运行之间保持上下文。

   默认行为（未更改）：
   - `systemEvent` 有效负载默认为 `main`
   - `agentTurn` 有效负载默认为 `isolated`

   要使用当前会话绑定，请显式设置 `sessionTarget: "current"`。

3. **选择有效负载**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：一次性任务（`schedule.kind = "at"`）默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 任务

Cron 任务是一个存储的记录，包含：

- 一个 **时间表**（何时运行），
- 一个 **有效负载**（做什么），
- 可选的 **传递模式**（`announce`、`webhook` 或 `none`）。
- 可选的 **代理绑定**（`agentId`）：在特定代理下运行任务；如果
  缺失或未知，网关将回退到默认代理。

任务由稳定的 `jobId` 标识（由 CLI/Gateway(网关) API 使用）。
在代理工具调用中，`jobId` 是规范的；为兼容起见接受旧版 `id`。
一次性任务默认在成功后自动删除；设置 `deleteAfterRun: false` 以保留它们。

### 时间表

Cron 支持三种时间表类型：

- `at`：通过 `schedule.at` 指定的一次性时间戳（ISO 8601）。
- `every`：固定间隔（毫秒）。
- `cron`：5字段 cron 表达式（或6字段，包含秒），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway(网关) 主机的
本地时区。

为了减少许多网关在整点时的负载峰值，OpenClaw 对重复的整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用确定性的每任务最长 5 分钟的交错窗口。固定小时的表达式（如 `0 7 * * *`）保持精确计时。

对于任何 cron 计划，您可以使用 `schedule.staggerMs` 设置显式交错窗口（`0` 保持精确计时）。CLI 快捷方式：

- 使用 `--stagger 30s`（或 `1m`、`5m`）来设置显式交错窗口。
- 使用 `--exact` 强制执行 `staggerMs = 0`。

### 主执行与隔离执行

#### 主会话任务（系统事件）

主任务将一个系统事件加入队列，并可选地唤醒心跳运行器。它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即的心跳运行。
- `wakeMode: "next-heartbeat"`：事件等待下一个计划的心跳。

当您想要正常的 heartbeat 提示 + 主会话上下文时，这是最佳选择。
请参阅 [Heartbeat](/zh/gateway/heartbeat)。

#### 隔离任务（专用 cron 会话）

隔离任务在会话 `cron:<jobId>` 或自定义会话中运行专用的代理轮次。

关键行为：

- 提示词前缀为 `[cron:<jobId> <job name>]` 以便于追踪。
- 每次运行都会启动一个**新的会话 ID**（没有先前的对话延续），除非使用自定义会话。
- 自定义会话（`session:xxx`）在运行之间保持上下文，从而启用诸如建立在先前摘要基础之上的每日站会等工作流。
- 默认行为：如果省略 `delivery`，隔离任务将宣布摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 决定发生什么：
  - `announce`：将摘要传递给目标渠道，并向主会话发布简短摘要。
  - `webhook`：当完成的事件包含摘要时，将完成的事件负载 POST 到 `delivery.to`。
  - `none`：仅限内部（不进行传递，无主会话摘要）。
- `wakeMode` 控制主会话摘要的发布时间：
  - `now`：立即执行心跳。
  - `next-heartbeat`：等待下一次计划的心跳。

对于嘈杂、频繁或不应刷屏主聊天记录的“后台杂务”，请使用隔离任务。

### 负载形式（运行内容）

支持两种负载类型：

- `systemEvent`：仅限主会话，通过心跳提示路由。
- `agentTurn`：仅限隔离会话，运行专用的代理轮次。

常见的 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖项（见下文）。
- `timeoutSeconds`：可选超时覆盖项。
- `lightContext`：可选的轻量级引导模式，适用于不需要工作区引导文件注入的任务。

交付配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定渠道。
- `delivery.to`：特定于渠道的目标（公告）或 Webhook URL（Webhook 模式）。
- `delivery.bestEffort`：如果公告交付失败，避免导致任务失败。

公告交付会抑制该运行的消息工具发送；请改用 `delivery.channel`/`delivery.to`
来定位聊天。当 `delivery.mode = "none"` 时，不会向主会话发布摘要。

如果省略了隔离任务的 `delivery`，OpenClaw 默认为 `announce`。

#### 公告交付流程

当 `delivery.mode = "announce"` 时，cron 通过出站渠道适配器直接交付。
不会启动主代理来制作或转发消息。

行为细节：

- 内容：交付使用隔离运行的出站负载（文本/媒体），并进行正常的分块和
  渠道格式化。
- 仅心跳响应（没有实际内容的 `HEARTBEAT_OK`）不会被交付。
- 如果隔离运行已经通过消息工具向同一目标发送了消息，则跳过投递以避免重复。
- 缺失或无效的投递目标会导致任务失败，除非 `delivery.bestEffort = true`。
- 仅当 `delivery.mode = "announce"` 时，才会向主会话发布简短摘要。
- 主会话摘要遵循 `wakeMode`：`now` 触发即时心跳，而 `next-heartbeat` 等待下一次计划的心跳。

#### Webhook 投递流程

当 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件载荷发布到 `delivery.to`。

行为细节：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试进行渠道投递。
- 在 webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的回退：存储的具有 `notify: true` 的旧版任务仍会发布到 `cron.webhook`（如果已配置），并附带警告，以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思考覆盖

隔离任务 (`agentTurn`) 可以覆盖模型和思考级别：

- `model`：提供者/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅限 GPT-5.2 + Codex 模型）

注意：您也可以在主会话任务上设置 `model`，但这会更改共享的主会话模型。我们建议仅在隔离任务中使用模型覆盖，以避免意外的上下文切换。

解析优先级：

1. 任务载荷覆盖（最高）
2. Hook 特定的默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级启动上下文

隔离任务 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级启动上下文运行。

- 将此用于不需要工作区引导文件注入的定时任务。
- 实际上，嵌入式运行时使用 `bootstrapContextMode: "lightweight"` 运行，这有意保持 cron 引导上下文为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（渠道 + 目标）

隔离任务可以通过顶级 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道交付）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`: `whatsapp` / `telegram` / `discord` / `slack` / `signal` / `imessage` / `irc` / `googlechat` / `line` / `last`，以及扩展渠道，如 `msteams` / `mattermost`（插件）。
- `delivery.to`: 特定渠道的接收者目标。

`announce` 传递仅对隔离作业（`sessionTarget: "isolated"`）有效。
`webhook` 传递对主作业和隔离作业均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的
“最后路由”（代理最后回复的地方）。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`，`user:<id>`）以避免歧义。
  Mattermost 裸 26 字符 ID 的解析优先级为“用户优先”（如果用户存在则为私信，否则为渠道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 格式（见下文）。

#### Telegram 交付目标（主题 / 论坛主题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 传递，您可以将
主题/线程编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（首选：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

带有前缀的目标（如 `telegram:...` / `telegram:group:...`）也是可以接受的：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

在直接调用 Gateway(网关) `cron.*` 工具（代理 工具调用或 RPC）时，请使用这些格式。
CLI 标志接受像 `20m` 这样的人类可读时长，但 工具调用应对 `schedule.at` 使用 ISO 8601 字符串，并对 `schedule.everyMs` 使用毫秒。

### cron.add 参数

一次性、主会话作业（系统事件）：

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

具有投递功能的周期性隔离作业：

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

绑定到当前会话的周期性作业（创建时自动解析）：

```json
{
  "name": "Daily standup",
  "schedule": { "kind": "cron", "expr": "0 9 * * *" },
  "sessionTarget": "current",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize yesterday's progress."
  }
}
```

自定义持久会话中的周期性作业：

```json
{
  "name": "Project monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "sessionTarget": "session:project-alpha-monitor",
  "payload": {
    "kind": "agentTurn",
    "message": "Check project status and update the running log."
  }
}
```

注：

- `schedule.kind`：`at` (`at`)、`every` (`everyMs`) 或 `cron` (`expr`，可选 `tz`)。
- `schedule.at` 接受 ISO 8601 格式。不带时区的 工具/API 值将被视为 UTC；CLI 也接受 `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` 用于本地时钟的一次性任务。
- `everyMs` 以毫秒为单位。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 在创建时会被解析为 `"session:<sessionKey>"`。
- 自定义会话 (`session:xxx`) 在多次运行之间保持持久上下文。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun` (对于 `at` 默认为 true)、
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

注：

- `jobId` 是标准形式；`id` 为兼容性而被接受。
- 在补丁中使用 `agentId: null` 来清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史记录

- 作业存储：`~/.openclaw/cron/jobs.json` (由 Gateway(网关) 管理的 JSON)。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl` (JSONL，按大小和行数自动修剪)。
- `sessions.json` 中的隔离 cron 运行会话由 `cron.sessionRetention` 清理（默认为 `24h`；设置 `false` 以禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当作业失败时，OpenClaw 会将错误归类为 **瞬时**（可重试）或 **永久**（立即禁用）。

### 瞬时错误（将重试）

- 速率限制（429，请求过多，资源耗尽）
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误（超时、ECONNRESET、获取失败、套接字）
- 服务器错误（5xx）
- Cloudflare 相关错误

### 永久错误（不重试）

- 身份验证失败（API 密钥无效，未授权）
- 配置或验证错误
- 其他非瞬时错误

### 默认行为（无配置）

**一次性作业 (`schedule.kind: "at"`)：**

- 发生瞬时错误时：最多重试 3 次，采用指数退避（30s → 1m → 5m）。
- 发生永久错误时：立即禁用。
- 成功或跳过时：禁用（如果为 `deleteAfterRun: true` 则删除）。

**周期性作业 (`cron` / `every`)：**

- 发生任何错误时：在下次计划运行之前应用指数退避（30s → 1m → 5m → 15m → 60m）。
- 作业保持启用状态；退避在下次成功运行后重置。

配置 `cron.retry` 以覆盖这些默认值（请参阅 [配置](/zh/automation/cron-jobs#configuration)）。

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

- `cron.runLog.maxBytes`：清理前的最大运行日志文件大小。
- `cron.runLog.keepLines`：清理时，仅保留最新的 N 行。
- 两者均适用于 `cron/runs/<jobId>.jsonl` 文件。

Webhook 行为：

- 首选：为每个作业使用 `delivery.to: "https://..."` 设置 `delivery.mode: "webhook"`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，负载为 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不发送 `Authorization` header。
- 已弃用的回退：存储的具有 `notify: true` 的旧版作业在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false` (配置)
- `OPENCLAW_SKIP_CRON=1` (环境变量)

## 维护

Cron 有两个内置的维护路径：隔离运行会话保留和运行日志修剪。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话清理）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 隔离运行会创建会话条目 (`...:cron:<jobId>:run:<uuid>`) 和转录文件。
- 清理程序会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于不再被会话存储引用的已移除运行会话，OpenClaw 会归档转录文件，并在相同的保留窗口内清除旧的已删除归档。
- 每次运行追加后，都会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，则将其修剪为最新的 `runLog.keepLines` 行。

### 高负载调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护机制，但宽松的限制仍可能导致不必要的 IO 和清理工作。

注意事项：

- 具有许多隔离运行的长 `cron.sessionRetention` 窗口
- 高 `cron.runLog.keepLines` 结合大 `runLog.maxBytes`
- 许多嘈杂的重复作业写入同一个 `cron/runs/<jobId>.jsonl`

建议做法：

- 在调试/审计需求允许的范围内，尽可能将 `cron.sessionRetention` 保持简短
- 使用适度的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志
- 将嘈杂的后台任务移至隔离模式，并使用可避免不必要消息传递的交付规则
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

禁用隔离的运行会话修剪，但保留运行日志修剪：

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

针对大量 cron 使用进行调整（示例）：

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

定期隔离作业（发布到 WhatsApp）：

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

带有明确 30 秒交错时间的定期 cron 作业：

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

定期隔离作业（发送到 Telegram 主题）：

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

具有模型和思考覆盖设置的隔离作业：

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

`cron.run` 现在会在手动运行加入队列后立即确认，而不是在作业完成后。成功的队列响应类似于 `{ ok: true, enqueued: true, runId }`。如果作业正在运行或 `--due` 发现没有到期任务，响应保持为 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` 网关方法来检查最终的完成条目。

编辑现有作业（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有的 cron 作业完全按计划运行（无交错）：

```bash
openclaw cron edit <jobId> --exact
```

运行历史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

不创建作业的即时系统事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway(网关) API 接口

- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（强制或到期）、`cron.runs`
  对于没有作业的即时系统事件，请使用 [`openclaw system event`](/zh/cli/system)。

## 故障排除

### "什么都没运行"

- 检查是否已启用 cron：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 是否正在持续运行（cron 在 Gateway(网关) 进程内运行）。
- 对于 `cron` 调度：确认时区（`--tz`）与主机时区是否一致。

### 定期作业在失败后不断延迟

- 对于连续错误后的循环作业，OpenClaw 会应用指数退避重试：
  30s, 1m, 5m, 15m, 然后每次重试间隔 60m。
- 在下一次成功运行后，退避会自动重置。
- 单次（`at`）作业会使用退避策略重试临时错误（速率限制、过载、网络、server_error）最多 3 次；永久错误会立即禁用。请参阅[重试策略](/zh/automation/cron-jobs#retry-policy)。

### Telegram 投递到了错误的地方

- 对于论坛主题，请使用 `-100…:topic:<id>`，这样更明确且无歧义。
- 如果您在日志或存储的“上次路由”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 传递接受它们，并且仍然能正确解析主题 ID。

### 子代理公告投递重试

- 当子代理运行完成时，网关会将结果公告给请求者会话。
- 如果公告流程返回 `false`（例如请求者会话正忙），网关将通过 `announceRetryCount` 进行跟踪并重试最多 3 次。
- 超过 `endedAt` 时间 5 分钟以上的公告将被强制过期，以防止过期条目无限循环。
- 如果在日志中看到重复的公告投递，请检查子代理注册表中 `announceRetryCount` 值较高的条目。
