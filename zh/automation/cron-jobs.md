---
summary: "Gateway(网关) 调度器的 Cron 作业 + 唤醒"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring automation that should run with or alongside heartbeats
  - Deciding between heartbeat and cron for scheduled tasks
title: "Cron 作业"
---

# Cron jobs (Gateway 网关 scheduler)

> **Cron 与 Heartbeat 对比？** 请参阅 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) 以获取有关何时使用每种方式的指导。

Cron is the Gateway 网关’s built-in scheduler. It persists jobs, wakes the agent at
the right time, and can optionally deliver output back to a chat.

If you want _“run this every morning”_ or _“poke the agent in 20 minutes”_,
cron is the mechanism.

故障排除：[/automation/故障排除](/en/automation/troubleshooting)

## TL;DR

- Cron runs **inside the Gateway 网关** (not inside the 模型).
- 作业持久化存储在 `~/.openclaw/cron/` 下，因此重启不会丢失计划。
- Two execution styles:
  - **主会话**：将系统事件加入队列，然后在下一次心跳时运行。
  - **独立（Isolated）**：在 `cron:<jobId>` 或自定义会话中运行专用的代理轮次，并附带传递（默认为通知或不传递）。
  - **当前会话**：绑定到创建 cron 的会话（`sessionTarget: "current"`）。
  - **自定义会话**：在持久的命名会话中运行（`sessionTarget: "session:custom-id"`）。
- 唤醒是一等公民：作业可以请求“立即唤醒”或“下一次心跳”。
- Webhook 投递是通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 针对每个作业进行的。
- 对于设置了 `cron.webhook` 且具有 `notify: true` 的已存储作业，保留旧版回退，请将这些作业迁移到 webhook 投递模式。
- 对于升级，`openclaw doctor --fix` 可以在调度器接触它们之前规范化旧版 cron 存储字段。

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

调度带有投递的循环独立作业：

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

## 工具调用等效项（Gateway cron 工具）

有关规范的 JSON 形状和示例，请参阅 [工具调用的 JSON 架构](/en/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业的存储位置

默认情况下，Cron 作业持久化存储在 Gateway(网关) 主机的 `~/.openclaw/cron/jobs.json` 中。
Gateway(网关) 会将文件加载到内存中，并在更改时写回，因此只有当 Gateway(网关) 停止时，手动编辑才是安全的。建议使用 `openclaw cron add/edit` 或 cron
工具调用 API 进行更改。

## 适合初学者的概述

可以将 cron 作业视为：**何时**运行 + **做什么**。

1. **选择计划**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳未指定时区，则将其视为 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下次心跳期间以主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用的 Agent 轮次。
   - `sessionTarget: "current"` → 绑定到当前会话（在创建时解析为 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在持久化的命名会话中运行，该会话在多次运行之间维护上下文。

   默认行为（未更改）：
   - `systemEvent` 载荷默认为 `main`
   - `agentTurn` 载荷默认为 `isolated`

   要使用当前会话绑定，请显式设置 `sessionTarget: "current"`。

3. **选择载荷**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：单次作业（`schedule.kind = "at"`）默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 作业

Cron 作业是一条存储的记录，包含：

- 一个 **时间表**（何时运行），
- 一个 **载荷**（做什么），
- 可选的 **传递模式**（`announce`、`webhook` 或 `none`）。
- 可选的 **Agent 绑定**（`agentId`）：在特定的 Agent 下运行作业；如果
  缺失或未知，Gateway 将回退到默认 Agent。

作业通过稳定的 `jobId` 标识（由 CLI/Gateway APIs 使用）。
在 Agent 工具调用中，`jobId` 是规范的；为了兼容性，接受旧版 `id`。
单次作业默认在成功后自动删除；设置 `deleteAfterRun: false` 以保留它们。

### 时间表

Cron 支持三种时间表类型：

- `at`：通过 `schedule.at`（ISO 8601）进行一次性时间戳。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式（或带秒的 6 字段），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway 主机的
本地时区。

为了减少众多网关在整点时刻的负载峰值，OpenClaw 会为重复的整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用确定性的每任务最长 5 分钟的错峰窗口。诸如 `0 7 * * *` 之类的固定小时表达式则保持精确计时。

对于任何 cron 计划，您可以使用 `schedule.staggerMs` 设置显式的错峰窗口（`0` 保持精确计时）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以设置显式的错峰窗口。
- `--exact` 以强制 `staggerMs = 0`。

### 主执行与隔离执行

#### 主会话任务（系统事件）

主任务将系统事件加入队列，并可选择唤醒心跳运行器。它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即的心跳运行。
- `wakeMode: "next-heartbeat"`：事件等待下一次计划的心跳。

当您希望获得正常的心跳提示词以及主会话上下文时，这是最佳选择。请参阅 [Heartbeat](/en/gateway/heartbeat)。

#### 隔离任务（专用的 cron 会话）

隔离任务在会话 `cron:<jobId>` 或自定义会话中运行一次专用的代理轮次。

主要行为：

- 提示词前缀为 `[cron:<jobId> <job name>]` 以便进行追踪。
- 每次运行都会启动一个**全新的会话 ID**（不保留之前的对话），除非使用自定义会话。
- 自定义会话（`session:xxx`）在多次运行之间保留上下文，从而支持诸如基于先前摘要的每日站会等工作流。
- 默认行为：如果省略了 `delivery`，隔离任务将宣布一个摘要（`delivery.mode = "announce"`）。
- `delivery.mode` 决定后续操作：
  - `announce`：将摘要发送到目标渠道，并向主会话发布简短摘要。
  - `webhook`：当完成的事件包含摘要时，将完成的事件负载 POST 到 `delivery.to`。
  - `none`：仅限内部（无投递，无主会话摘要）。
- `wakeMode` 控制主会话摘要的发布时间：
  - `now`：立即进行心跳。
  - `next-heartbeat`：等待下一次计划的心跳。

对于嘈杂、频繁或“后台杂务”的任务，请使用独立作业，以免充斥您的主聊天历史记录。

### 有效负载形状（运行内容）

支持两种有效负载类型：

- `systemEvent`：仅限主会话，通过心跳提示路由。
- `agentTurn`：仅限独立会话，运行专用的代理轮次。

常用 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选的超时覆盖。
- `lightContext`：针对不需要工作区引导文件注入的作业，可选的轻量级引导模式。

传递配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定渠道。
- `delivery.to`：特定于渠道的目标（公告）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果公告传递失败，避免作业失败。

公告传递会抑制该运行的发送消息工具；请改用 `delivery.channel`/`delivery.to`
来定位聊天。当 `delivery.mode = "none"` 时，不会将摘要发布到主会话。

如果省略了独立作业的 `delivery`，OpenClaw 默认为 `announce`。

#### 公告传递流程

当 `delivery.mode = "announce"` 时，cron 直接通过出站渠道适配器进行传递。
不会启动主代理来制作或转发消息。

行为细节：

- 内容：传递使用独立运行的出站有效负载（文本/媒体），并采用正常的分块和
  渠道格式。
- 仅心跳的响应（`HEARTBEAT_OK` 没有实际内容）不会被传递。
- 如果独立运行已经通过消息工具向同一目标发送了消息，则跳过投递以避免重复。
- 除非设置了 `delivery.bestEffort = true`，否则缺失或无效的投递目标将导致任务失败。
- 仅当设置 `delivery.mode = "announce"` 时，才会向主会话发布简短摘要。
- 主会话摘要遵循 `wakeMode`：`now` 触发立即心跳，而 `next-heartbeat` 等待下一次计划的心跳。

#### Webhook 投递流程

当设置 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件负载发布到 `delivery.to`。

行为细节：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试渠道投递。
- 在 webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的回退方案：存储的带有 `notify: true` 的旧任务仍会发布到 `cron.webhook`（如果已配置），并会发出警告以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思考覆盖设置

独立任务 (`agentTurn`) 可以覆盖模型和思考级别：

- `model`：提供程序/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`：思考级别 (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; 仅限 GPT-5.2 + Codex 模型)

注意：您也可以在主会话任务上设置 `model`，但这会更改共享的主会话模型。我们建议仅对独立任务使用模型覆盖，以避免意外的上下文变化。

解析优先级：

1. 任务负载覆盖（最高）
2. 钩子特定的默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级引导上下文

独立任务 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将此用于不需要工作区启动文件注入的定时任务。
- 实际上，嵌入式运行时在 `bootstrapContextMode: "lightweight"` 下运行，这有意使 cron 启动上下文保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（渠道 + 目标）

隔离任务可以通过顶级 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道交付）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`。
- `delivery.to`：特定于渠道的接收者目标。

`announce` 交付仅对隔离任务（`sessionTarget: "isolated"`）有效。
`webhook` 交付对主任务和隔离任务均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的
“最后路由”（代理最后回复的位置）。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
  Mattermost 纯 26 字符 ID 按**用户优先**解析（如果用户存在则为私信，否则为渠道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 话题应使用 `:topic:` 形式（见下文）。

#### Telegram 交付目标（话题 / 论坛主题）

Telegram 通过 `message_thread_id` 支持论坛话题。对于 cron 交付，您可以将
话题/主题编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（首选：显式话题标记）
- `-1001234567890:123` （简写：数字后缀）

也接受像 `telegram:...` / `telegram:group:...` 这样的带前缀目标：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

直接调用 Gateway(网关) `cron.*` 工具时（代理工具调用或 RPC），请使用这些格式。
CLI 标志接受人类可读的持续时间，如 `20m`，但工具调用应对 `schedule.at` 使用 ISO 8601 字符串，
对 `schedule.everyMs` 使用毫秒。

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

带有传递的循环，隔离任务：

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

自定义持久化会话中的循环任务：

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

- `schedule.kind`: `at` (`at`), `every` (`everyMs`), 或 `cron` (`expr`, 可选 `tz`)。
- `schedule.at` 接受 ISO 8601 格式（时区可选；如果省略则视为 UTC）。
- `everyMs` 单位为毫秒。
- `sessionTarget`: `"main"`, `"isolated"`, `"current"`, 或 `"session:<custom-id>"`。
- `"current"` 会在创建时解析为 `"session:<sessionKey>"`。
- 自定义会话 (`session:xxx`) 在运行期间维护持久化上下文。
- 可选字段：`agentId`, `description`, `enabled`, `deleteAfterRun` (对于 `at` 默认为 true),
  `delivery`。
- 如果省略 `wakeMode`，默认为 `"now"`。

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

- `jobId` 是规范格式；为兼容性接受 `id`。
- 在补丁中使用 `agentId: null` 来清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（Gateway 管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，根据大小和行数自动修剪）。
- `sessions.json` 中的隔离 cron 运行会话由 `cron.sessionRetention` 修剪（默认 `24h`；设置 `false` 可禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当作业失败时，OpenClaw 会将错误分类为**暂时性**（可重试）或**永久性**（立即禁用）。

### 暂时性错误（已重试）

- 速率限制（429，请求过多，资源耗尽）
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误（超时、ECONNRESET、获取失败、套接字）
- 服务器错误（5xx）
- 与 Cloudflare 相关的错误

### 永久性错误（不重试）

- 身份验证失败（API 密钥无效，未授权）
- 配置或验证错误
- 其他非暂时性错误

### 默认行为（无配置）

**一次性作业 (`schedule.kind: "at"`)：**

- 发生暂时性错误时：重试最多 3 次，并采用指数退避（30s → 1m → 5m）。
- 发生永久性错误时：立即禁用。
- 成功或跳过时：禁用（如果 `deleteAfterRun: true` 则删除）。

**循环作业 (`cron` / `every`)：**

- 发生任何错误时：在下次计划运行之前应用指数退避（30s → 1m → 5m → 15m → 60m）。
- 作业保持启用状态；退避会在下次成功运行后重置。

配置 `cron.retry` 以覆盖这些默认值（请参阅 [配置](/en/automation/cron-jobs#configuration)）。

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

- 首选：为每个作业设置带有 `delivery.to: "https://..."` 的 `delivery.mode: "webhook"`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，负载为 cron 完成事件 JSON。
- 如果设置了 `cron.webhookToken`，则 auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不会发送 `Authorization` header。
- 已弃用的后备方案：存储的具有 `notify: true` 的旧版任务在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false` (配置)
- `OPENCLAW_SKIP_CRON=1` (环境变量)

## 维护

Cron 有两个内置的维护路径：隔离的运行会话保留和运行日志修剪。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话修剪）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 隔离运行会创建会话条目 (`...:cron:<jobId>:run:<uuid>`) 和记录文件。
- 清理器会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于会话存储不再引用的已移除运行会话，OpenClaw 会存档记录文件，并在相同的保留窗口内清除旧的已删除存档。
- 每次运行追加后，都会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，它将被修剪为最新的 `runLog.keepLines` 行。

### 高负载调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护机制，但宽松的限制仍可能导致不必要的 I/O 和清理工作。

注意监控：

- 存在许多隔离运行的 `cron.sessionRetention` 长窗口
- 较高的 `cron.runLog.keepLines` 结合较大的 `runLog.maxBytes`
- 许多嘈杂的重复性任务写入同一个 `cron/runs/<jobId>.jsonl`

建议做法：

- 在调试/审计需求允许的范围内，尽可能保持 `cron.sessionRetention` 短暂
- 使用适度的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志大小
- 将嘈杂的后台任务移至隔离模式，并使用避免不必要通知的传递规则
- 定期使用 `openclaw cron runs` 审查增长情况，并在日志变大之前调整保留策略

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

针对高频 cron 使用进行优化（示例）：

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

重复性隔离任务（通知到 WhatsApp）：

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

具有明确 30 秒错峰的重复性 cron 任务：

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

重复性隔离任务（投递到 Telegram 主题）：

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

具有模型和思维覆盖的隔离任务：

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

手动运行（强制运行是默认值，使用 `--due` 仅在到期时运行）：

```bash
openclaw cron run <jobId>
openclaw cron run <jobId> --due
```

`cron.run` 现在会在手动运行排队后立即确认，而不是在任务完成后。成功的排队响应看起来像 `{ ok: true, enqueued: true, runId }`。如果任务已在运行或者 `--due` 发现没有到期的任务，响应将保持为 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` 网关方法来检查最终的完成条目。

编辑现有任务（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有的 cron 任务准确按计划运行（无错峰）：

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

## Gateway(网关) API 接口

- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（强制或到期）、`cron.runs`
  对于没有任务的即时系统事件，请使用 [`openclaw system event`](/en/cli/system)。

## 故障排除

### “没有任务运行”

- 检查是否已启用 cron：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 是否在持续运行（cron 在 Gateway(网关) 进程内运行）。
- 对于 `cron` 计划：确认时区 (`--tz`) 与主机时区是否一致。

### 重复性任务在失败后不断延迟

- OpenClaw 在连续错误后对周期性任务应用指数退避重试：
  30s, 1m, 5m, 15m，然后重试间隔为 60m。
- 在下次成功运行后，退避会自动重置。
- 一次性 (`at`) 任务会对瞬态错误（速率限制、过载、网络、server_error）重试最多 3 次，并带有退避机制；永久性错误会立即禁用任务。请参阅 [重试策略](/en/automation/cron-jobs#retry-policy)。

### Telegram 投递到了错误的位置

- 对于论坛主题，请使用 `-100…:topic:<id>`，这样既明确又无歧义。
- 如果在日志或存储的“上次路由”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 投递接受这些前缀，并且仍能正确解析主题 ID。

### Subagent 公告投递重试

- 当子代理运行完成时，网关会将结果通知给请求者会话。
- 如果公告流程返回 `false`（例如请求者会话正忙），网关会重试最多 3 次，并通过 `announceRetryCount` 进行跟踪。
- 超过 `endedAt` 5 分钟的公告将被强制过期，以防止过时条目无限循环。
- 如果在日志中看到重复的公告投递，请检查子代理注册表中 `announceRetryCount` 值较高的条目。

import zh from "/components/footer/zh.mdx";

<zh />
