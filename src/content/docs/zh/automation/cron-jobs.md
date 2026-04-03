---
summary: "Gateway(网关) 调度器的 Cron 作业 + 唤醒"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron 作业"
---

# Cron jobs (Gateway(网关) 网关 scheduler)

> **Cron 与 Heartbeat 对比？** 请参阅 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) 以获取关于何时使用每种机制的指导。

Cron is the Gateway(网关) 网关’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

所有 cron 执行都会创建 [后台任务](/en/automation/tasks) 记录。主要区别在于可见性：

- `sessionTarget: "main"` 创建一个具有 `silent` 通知策略的任务 —— 它为会话和心跳流程安排一个系统事件，但不生成通知。
- `sessionTarget: "isolated"` 或 `sessionTarget: "session:..."` 创建一个可见的任务，该任务会显示在 `openclaw tasks` 中并带有投递通知。

如果您想要“每天早上运行此任务”或“在 20 分钟后唤醒 Agent”，
cron 就是相应的机制。

故障排除：[/automation/故障排除](/en/automation/troubleshooting)

## 简而言之

- Cron 运行 **在 Gateway(网关) 内部**（而非在模型内部）。
- 作业持久化在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- 两种执行风格：
  - **主会话**：将一个系统事件加入队列，然后在下一次心跳时运行。
  - **隔离**：在 `cron:<jobId>` 或自定义会话中运行专用的 Agent 轮次，并进行投递（默认为公告或不投递）。
  - **当前会话**：绑定到创建 cron 的会话（`sessionTarget: "current"`）。
  - **自定义会话**：在持久的命名会话中运行（`sessionTarget: "session:custom-id"`）。
- 唤醒是一等公民：作业可以请求“立即唤醒”或“下一次心跳”。
- Webhook 投递是通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 按作业进行的。
- 当设置了 `cron.webhook` 时，对于具有 `notify: true` 的已存储作业，保留旧版回退机制，请将这些作业迁移到 Webhook 投递模式。
- 对于升级，`openclaw doctor --fix` 可以标准化旧的 cron 存储字段，包括旧的顶级投递提示，例如 `threadId`。

## 快速开始（可操作）

创建一个一次性提醒，验证其存在，并立即运行它：

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

安排一个带有投递的周期性隔离作业：

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

有关规范的 JSON 结构和示例，请参阅[工具调用的 JSON 架构](/en/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业的存储位置

Cron 作业默认持久化在 Gateway(网关) 主机的 `~/.openclaw/cron/jobs.json` 中。Gateway(网关) 会将文件加载到内存中，并在更改时写回，因此只有停止 Gateway(网关) 后手动编辑才是安全的。建议优先使用 `openclaw cron add/edit` 或 cron 工具调用 API 进行更改。

## 新手友好概述

可以将 cron 作业视为：**何时**运行 + **做什么**。

1. **选择时间表**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳未指定时区，则将其视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用 agent 轮次。
   - `sessionTarget: "current"` → 绑定到当前会话（在创建时解析为 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持久化的命名会话中运行，该会话在多次运行之间维护上下文。

   默认行为（未更改）：
   - `systemEvent` 负载默认为 `main`
   - `agentTurn` 负载默认为 `isolated`

   要使用当前会话绑定，请显式设置 `sessionTarget: "current"`。

3. **选择负载**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：一次性作业 (`schedule.kind = "at"`) 默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 作业

Cron 作业是包含以下内容的存储记录：

- 一个 **时间表** (何时运行)，
- 一个 **负载** (做什么)，
- 可选的 **交付模式** (`announce`、`webhook` 或 `none`)。
- 可选的 **agent 绑定** (`agentId`)：在特定的 agent 下运行作业；如果
  缺失或未知，网关将回退到默认 agent。

作业通过一个稳定的 `jobId` 进行标识（由 CLI/Gateway(网关) API 使用）。在代理工具调用中，`jobId` 是规范的；为了兼容性，也会接受旧版 `id`。一次性作业默认在成功后自动删除；设置 `deleteAfterRun: false` 可保留它们。

### 计划

Cron 支持三种计划类型：

- `at`：通过 `schedule.at`（ISO 8601）指定的一次性时间戳。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式（或带秒的 6 字段），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway(网关) 主机的本地时区。

为了减少跨越许多网关的小时峰值负载，OpenClaw 对周期性的整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用了长达 5 分钟的确定性单作业错开窗口。固定小时的表达式（如 `0 7 * * *`）保持精确。

对于任何 cron 计划，您可以使用 `schedule.staggerMs` 设置显式错开窗口（`0` 保持精确计时）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以设置显式错开窗口。
- `--exact` 以强制 `staggerMs = 0`。

### 主执行与隔离执行

#### 主会话作业（系统事件）

主作业将一个系统事件排入队列，并可选择唤醒心跳运行器。它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即运行心跳。
- `wakeMode: "next-heartbeat"`：事件等待下一次计划的心跳。

当您需要正常的心跳提示 + 主会话上下文时，这是最合适的选择。参见 [Heartbeat](/en/gateway/heartbeat)。

主会话 cron 作业会创建具有 `silent` 通知策略（默认无通知）的 [background task](/en/automation/tasks) 记录。它们出现在 `openclaw tasks list` 中，但不生成投递消息。

#### 独立作业（专用 cron 会话）

独立作业在会话 `cron:<jobId>` 中运行专用的代理轮次，或在自定义会话中运行。

关键行为：

- 提示词前缀带有 `[cron:<jobId> <job name>]` 以便进行跟踪。
- 每次运行都会启动一个**全新的会话 ID**（不继承之前的对话），除非使用自定义会话。
- 自定义会话（`session:xxx`）在运行之间持久化上下文，从而实现基于先前摘要的每日站会等工作流。
- 默认行为：如果省略 `delivery`，独立作业将宣布摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 决定发生什么：
  - `announce`：将摘要传递到目标渠道，并在主会话中发布简短摘要。
  - `webhook`：当完成事件包含摘要时，将完成事件负载 POST 到 `delivery.to`。
  - `none`：仅限内部（无传递，无主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次计划的心跳。

将独立作业用于那些不应垃圾刷屏主聊天历史记录的嘈杂、频繁或“后台杂务”。

这些分离的运行会创建在 `openclaw tasks` 中可见的[后台任务](/en/automation/tasks)记录，并受任务审计和维护的约束。

### 负载形状（运行内容）

支持两种负载类型：

- `systemEvent`：仅限主会话，通过心跳提示词路由。
- `agentTurn`：仅限独立会话，运行专用的代理轮次。

常见的 `agentTurn` 字段：

- `message`：必需的文本提示词。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选超时覆盖。
- `lightContext`：针对不需要工作区引导文件注入的作业的可选轻量级引导模式。
- `toolsAllow`：可选的工具名称数组，用于限制任务可以使用哪些工具（例如 `["exec", "read", "write"]`）。

传递配置：

- `delivery.mode`： `none` | `announce` | `webhook`。
- `delivery.channel`： `last` 或特定渠道。
- `delivery.to`：特定于渠道的目标（公告）或 webhook URL（webhook 模式）。
- `delivery.threadId`：当目标渠道支持线程化传递时，可选的显式线程或主题 ID。
- `delivery.bestEffort`：如果公告传递失败，避免任务失败。

公告传递会抑制该运行的消息工具发送；请改用 `delivery.channel`/`delivery.to` 来定位聊天。当 `delivery.mode = "none"` 时，不会将摘要发布到主会话。

如果为独立任务省略 `delivery`，OpenClaw 默认为 `announce`。

#### 公告传递流程

当 `delivery.mode = "announce"` 时，cron 会通过出站渠道适配器直接传递。主代理不会启动来编写或转发消息。

行为详情：

- 内容：传递使用独立运行的出站负载（文本/媒体），并进行正常的分块和渠道格式化。
- 仅 Heartbeat 的响应（`HEARTBEAT_OK` 且没有实际内容）不会被传递。
- 如果独立运行已通过消息工具向同一目标发送了消息，则跳过传递以避免重复。
- 除非 `delivery.bestEffort = true`，否则缺失或无效的传递目标将导致任务失败。
- 仅当 `delivery.mode = "announce"` 时，才会将简短摘要发布到主会话。
- 主会话摘要遵循 `wakeMode`： `now` 触发立即 heartbeat，而 `next-heartbeat` 等待下一次计划的 heartbeat。

#### Webhook 传递流程

当 `delivery.mode = "webhook"` 时，如果完成的事件包含摘要，cron 会将完成的事件负载发布到 `delivery.to`。

行为详情：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试渠道投递。
- 在 webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，则 auth 标头为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的后备方案：存储的具有 `notify: true` 的旧版作业仍会发布到 `cron.webhook`（如果已配置），并带有警告，以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思考覆盖

隔离作业 (`agentTurn`) 可以覆盖模型和思考级别：

- `model`：提供商/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅限 GPT-5.2 + Codex 模型）

注意：您也可以在主会话作业上设置 `model`，但这会更改共享的主会话模型。我们建议仅对隔离作业使用模型覆盖，以避免意外的上下文切换。

解析优先级：

1. 作业负载覆盖（最高）
2. Hook 特定默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级引导上下文

隔离作业 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将其用于不需要工作区引导文件注入的例行任务。
- 实际上，嵌入式运行时运行时使用 `bootstrapContextMode: "lightweight"`，这有意使 cron 引导上下文保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 投递（渠道 + 目标）

隔离作业可以通过顶层 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道投递）、`webhook` (HTTP POST) 或 `none`。
- `delivery.channel`：`last` 或任何可交付的渠道 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `delivery.to`: 特定于渠道的接收目标。
- `delivery.threadId`：针对 Telegram、Slack、Discord 或 Matrix 等频道的可选线程/话题覆盖，当你想要一个特定线程而不将其编码进 `delivery.to` 时。

`announce` 传递仅对隔离作业（`sessionTarget: "isolated"`）有效。
`webhook` 传递对主作业和隔离作业均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的“last route”（代理回复的最后一个位置）。

目标格式提醒：

- Slack/Discord/Mattermost (插件) 目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
  Mattermost 纯 26 字符 ID 按“**用户优先**”（如果用户存在则为私信，否则为渠道）解析 —— 请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 形式（见下文）。

#### Telegram 投递目标（主题 / 论坛话题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 投递，您可以将主题/线程编码到 `to` 字段中：

- `-1001234567890` (仅限聊天 id)
- `-1001234567890:topic:123`（首选：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

带有前缀的目标，如 `telegram:...` / `telegram:group:...` 也是可以接受的：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 模式

直接调用 Gateway(网关) `cron.*` 工具（代理工具调用或 RPC）时使用这些格式。
CLI 标志接受类似 `20m` 的人类可读时长，但工具调用应对 `schedule.at` 使用 ISO 8601 字符串，并对 `schedule.everyMs` 使用毫秒。

### cron.add 参数

一次性、主会话任务（系统事件）：

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

带有投递的、循环的隔离任务：

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

绑定到当前会话的循环任务（创建时自动解析）：

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

位于自定义持久化会话中的循环任务：

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

备注：

- `schedule.kind`：`at`（`at`）、`every`（`everyMs`）或 `cron`（`expr`，可选 `tz`）。
- `schedule.at` 接受 ISO 8601 格式。不带时区的工具/API 值将被视为 UTC；CLI 也接受 `openclaw cron add|edit --at "<offset-less-iso>" --tz <iana>` 用于本地时钟的一次性任务。
- `everyMs` 是以毫秒为单位。
- `sessionTarget`: `"main"`，`"isolated"`，`"current"`，或 `"session:<custom-id>"`。
- `"current"` 在创建时被解析为 `"session:<sessionKey>"`。
- 自定义会话（`session:xxx`）在多次运行之间维护持久化上下文。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（对于 `at` 默认为 true）、
  `delivery`、`toolsAllow`。
- `toolsAllow`：可选的工具名称数组，用于限制作业可以使用哪些工具（例如 `["exec", "read"]`）。省略或设置为 `null` 以使用所有工具。
- 如果省略 `wakeMode`，则默认为 `"now"`。

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

说明：

- `jobId` 是规范的；`id` 为了兼容性被接受。
- 在补丁中使用 `agentId: null` 来清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（Gateway(网关)管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，根据大小和行数自动修剪）。
- `sessions.json` 中的隔离 cron 运行会话由 `cron.sessionRetention` 修剪（默认 `24h`；设置 `false` 以禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当作业失败时，OpenClaw 会将错误分类为 **瞬态**（可重试）或 **永久**（立即禁用）。

### 瞬态错误（可重试）

- 速率限制（429，请求过多，资源耗尽）
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误（超时、ECONNRESET、获取失败、套接字）
- 服务器错误（5xx）
- Cloudflare 相关错误

### 永久错误（不重试）

- 认证失败（无效的 API 密钥，未授权）
- 配置或验证错误
- 其他非瞬态错误

### 默认行为（无配置）

**一次性作业（`schedule.kind: "at"`）：**

- 发生瞬态错误时：使用指数退避重试最多 3 次（30s → 1m → 5m）。
- 发生永久错误时：立即禁用。
- 成功或跳过时：禁用（如果设置了 `deleteAfterRun: true` 则删除）。

**循环作业（`cron` / `every`）：**

- 发生任何错误时：在下次计划运行前应用指数退避（30s → 1m → 5m → 15m → 60m）。
- 作业保持启用状态；退避会在下次成功运行后重置。

配置 `cron.retry` 以覆盖这些默认值（参见 [配置](/en/automation/cron-jobs#configuration)）。

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

- 首选：为每个作业设置 `delivery.mode: "webhook"` 并带有 `delivery.to: "https://..."`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，payload 是 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不会发送 `Authorization` header。
- 已弃用的回退机制：存储的带有 `notify: true` 的旧版作业在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false`（配置）
- `OPENCLAW_SKIP_CRON=1`（环境变量）

## 维护

Cron 有两个内置的维护路径：隔离的运行会话保留和运行日志清理。

### 默认值

- `cron.sessionRetention`: `24h`（将 `false` 设置为禁用运行会话清理）
- `cron.runLog.maxBytes`: `2_000_000` 字节
- `cron.runLog.keepLines`: `2000`

### 工作原理

- 隔离运行会创建会话条目（`...:cron:<jobId>:run:<uuid>`）和记录文件。
- 清理器会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于不再被会话存储引用的已移除运行会话，OpenClaw 会归档记录文件，并在相同的保留窗口内清除旧的已删除归档。
- 每次运行追加后，会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，它将被修剪为最新的 `runLog.keepLines` 行。

### 高负载调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护功能，但宽松的限制仍可能导致不必要的 I/O 和清理工作。

需要注意的事项：

- 存在许多隔离运行的长 `cron.sessionRetention` 窗口
- 高 `cron.runLog.keepLines` 结合大 `runLog.maxBytes`
- 许多写入同一 `cron/runs/<jobId>.jsonl` 的嘈杂循环作业

建议采取的措施：

- 在满足调试/审计需求的前提下，将 `cron.sessionRetention` 保持得尽可能短
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

禁用隔离的运行会话清理，但保留运行日志清理：

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

定期隔离作业（通知到 WhatsApp）：

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

具有明确 30 秒错峰的定期 cron 作业：

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

工具允许列表（限制作业可使用的工具）：

```bash
# Only allow exec and read tools for this job
openclaw cron add --name "Scoped job" --cron "0 8 * * *" --session isolated --message "Run scoped checks" --tools exec,read

# Update an existing job's tool allowlist
openclaw cron edit <jobId> --tools exec,read,write

# Remove a tool allowlist (use all tools)
openclaw cron edit <jobId> --clear-tools
```

手动运行（强制为默认值，使用 `--due` 以仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 现在会在手动运行排队后立即确认，而不是在作业完成后。成功的排队响应类似于 `{ ok: true, enqueued: true, runId }`。如果作业已在运行或 `--due` 发现没有到期的作业，响应将保持为 `{ ok: true, ran: false, reason }`。请使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` 网关方法来检查最终完成的条目。

编辑现有作业（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有 cron 作业按计划精确运行（无错峰）：

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

## Gateway(网关) API 表面

- `cron.list`，`cron.status`，`cron.add`，`cron.update`，`cron.remove`
- `cron.run`（强制或到期），`cron.runs`
  对于没有作业的即时系统事件，请使用 [`openclaw system event`](/en/cli/system)。

## 故障排除

### “什么都没有运行”

- 检查 cron 是否已启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 是否持续运行（cron 在 Gateway(网关) 进程内运行）。
- 对于 `cron` 计划：确认时区（`--tz`）与主机时区是否一致。

### 定期作业在失败后持续延迟

- OpenClaw 会对连续出错的周期性作业应用指数退避重试：
  30s、1m、5m、15m，之后每次重试间隔 60m。
- 退避会在下一次成功运行后自动重置。
- 一次性（`at`）作业会重试瞬时错误（速率限制、过载、网络、server_error）最多 3 次，并采用退避策略；永久错误会立即禁用作业。请参阅 [重试策略](/en/automation/cron-jobs#retry-policy)。

### Telegram 投递到了错误的位置

- 对于论坛话题，请使用 `-100…:topic:<id>`，这样表述明确且无歧义。
- 如果在日志或存储的“上次路由”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 投递接受此前缀，并仍能正确解析话题 ID。

### 子代理通告投递重试

- 当子代理运行完成时，网关会将结果通告给请求者会话。
- 如果通告流程返回 `false`（例如请求者会话正忙），网关将通过 `announceRetryCount` 进行跟踪，并最多重试 3 次。
- 超过 `endedAt` 5 分钟的通告将被强制过期，以防止过期条目无限循环。
- 如果在日志中看到重复的通告投递，请检查子代理注册表中 `announceRetryCount` 值较高的条目。

## 相关内容

- [自动化概览](/en/automation) —— 所有自动化机制一览
- [Cron 与 Heartbeat 的对比](/en/automation/cron-vs-heartbeat) —— 何时使用哪一个
- [后台任务](/en/automation/tasks) —— cron 执行的任务台账
- [Heartbeat](/en/gateway/heartbeat) —— 周期性主会话轮转
- [故障排除](/en/automation/troubleshooting) —— 调试自动化问题
