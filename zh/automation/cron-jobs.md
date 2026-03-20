---
summary: "Cron jobs + wakeups for the Gateway(网关) scheduler"
read_when:
  - 安排后台作业或唤醒
  - 连接应与心跳一起或伴随心跳运行的自动化
  - 在计划任务中选择使用心跳还是 cron
title: "Cron Jobs"
---

# Cron 作业 (Gateway(网关) 调度程序)

> **Cron vs Heartbeat?** 有关何时使用每种方法的指南，请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)。

Cron 是 Gateway(网关) 的内置调度程序。它持久化作业，在正确的时间唤醒代理，并且可以选择将输出传递回聊天。

如果您想要 _“每天早上运行此任务”_ 或 _“在 20 分钟后提醒代理”_，
cron 就是相应的机制。

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## TL;DR

- Cron 在 **Gateway(网关) 内部** 运行（而不是在模型内部）。
- 作业在 `~/.openclaw/cron/` 下持久化，因此重启不会丢失计划。
- 两种执行样式：
  - **主会话**：将系统事件加入队列，然后在下一次心跳时运行。
  - **隔离**：在 `cron:<jobId>` 或自定义会话中运行专用代理轮次，并带有传递功能（默认为公告或不传递）。
  - **当前会话**：绑定到创建 cron 的会话 (`sessionTarget: "current"`)。
  - **自定义会话**：在持久化的命名会话中运行 (`sessionTarget: "session:custom-id"`)。
- 唤醒是一等公民：作业可以请求“立即唤醒”与“下一次心跳”。
- 通过 `delivery.mode = "webhook"` + `delivery.to = "<url>"` 按作业进行 Webhook 发布。
- 当设置了 `cron.webhook` 时，保留带有 `notify: true` 的存储作业的旧版回退，将这些作业迁移到 webhook 传递模式。
- 对于升级，`openclaw doctor --fix` 可以在调度程序接触旧版 cron 存储字段之前对其进行规范化。

## 快速入门（可操作）

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

安排带有传递功能的定期隔离作业：

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

## 工具调用等效项 (Gateway(网关) cron 工具)

有关规范的 JSON 形状和示例，请参阅 [工具调用的 JSON 架构](/zh/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业的存储位置

Cron 作业默认持久化在 Gateway(网关) 主机的 `~/.openclaw/cron/jobs.json`。
Gateway(网关) 会将文件加载到内存中并在更改时写回，因此只有在 Gateway(网关) 停止时手动编辑才是安全的。建议优先使用 `openclaw cron add/edit` 或 cron 工具调用 API 进行更改。

## 适合新手的概述

可以将 cron 作业理解为：**何时** 运行 + **做** 什么。

1. **选择调度**
   - 一次性提醒 → `schedule.kind = "at"` (CLI: `--at`)
   - 重复作业 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果您的 ISO 时间戳未指定时区，则视为 **UTC** 时间。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳期间使用主上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行专用的代理轮次。
   - `sessionTarget: "current"` → 绑定到当前会话（在创建时解析为 `session:<sessionKey>`）。
   - `sessionTarget: "session:custom-id"` → 在一个持久化的命名会话中运行，该会话在多次运行之间维护上下文。

   默认行为（保持不变）：
   - `systemEvent` 载荷默认为 `main`
   - `agentTurn` 载荷默认为 `isolated`

   要使用当前会话绑定，请显式设置 `sessionTarget: "current"`。

3. **选择载荷**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：一次性作业 (`schedule.kind = "at"`) 默认在成功后删除。设置
`deleteAfterRun: false` 以保留它们（它们将在成功后禁用）。

## 概念

### 作业

Cron 作业是一条存储的记录，包含：

- 一个 **调度**（何时运行），
- 一个 **载荷**（做什么），
- 可选的 **传递模式**（`announce`、`webhook` 或 `none`）。
- 可选的 **代理绑定**（`agentId`）：在特定代理下运行作业；如果
  缺失或未知，网关将回退到默认代理。

作业由一个稳定的 `jobId` 标识（由 CLI/Gateway(网关) API 使用）。在代理工具调用中，`jobId` 是规范的；为兼容起见，接受旧版 `id`。默认情况下，一次性作业在成功后会自动删除；请设置 `deleteAfterRun: false` 以保留它们。

### 调度

Cron 支持三种调度类型：

- `at`：通过 `schedule.at` (ISO 8601) 指定的一次性时间戳。
- `every`：固定间隔（毫秒）。
- `cron`：5字段 cron 表达式（或带秒的 6字段），可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，则使用 Gateway(网关) 主机的本地时区。

为了减少跨多个网关的整点负载峰值，OpenClaw 会为循环的整点表达式（例如 `0 * * * *`、`0 */2 * * *`）应用最多 5 分钟的确定性每作业错开窗口。固定小时表达式（如 `0 7 * * *`）保持精确。

对于任何 cron 调度，您可以使用 `schedule.staggerMs` 设置显式错开窗口（`0` 保持精确计时）。CLI 快捷方式：

- `--stagger 30s`（或 `1m`、`5m`）以设置显式错开窗口。
- `--exact` 强制 `staggerMs = 0`。

### 主执行与隔离执行

#### 主会话作业（系统事件）

主作业将一个系统事件加入队列，并可选择唤醒心跳运行器。它们必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "now"`（默认）：事件触发立即心跳运行。
- `wakeMode: "next-heartbeat"`：事件等待下一个计划心跳。

当您需要正常的心跳提示 + 主会话上下文时，这是最佳选择。请参阅 [Heartbeat](/zh/gateway/heartbeat)。

#### 隔离作业（专用 cron 会话）

隔离作业在会话 `cron:<jobId>` 或自定义会话中运行专用的代理轮次。

关键行为：

- 提示前面加有 `[cron:<jobId> <job name>]` 以便进行追踪。
- 每次运行都会启动一个新的 **会话 ID**（无先前对话的延续），除非使用自定义会话。
- 自定义会话 (`session:xxx`) 在多次运行之间持久化上下文，从而实现基于先前摘要的每日站会等工作流。
- 默认行为：如果省略 `delivery`，隔离任务将宣布一个摘要 (`delivery.mode = "announce"`)。
- `delivery.mode` 决定接下来发生什么：
  - `announce`：将摘要传递到目标渠道，并向主会话发布简短摘要。
  - `webhook`：当完成事件包含摘要时，将完成事件负载 POST 到 `delivery.to`。
  - `none`：仅限内部（无投递，无主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次计划的心跳。

将隔离任务用于那些嘈杂、频繁或“后台琐事”，这些任务不应刷屏你的主聊天记录。

### 负载形式（运行内容）

支持两种负载类型：

- `systemEvent`：仅限主会话，通过心跳提示路由。
- `agentTurn`：仅限隔离会话，运行专用的 Agent 回合。

常见的 `agentTurn` 字段：

- `message`：必需的文本提示。
- `model` / `thinking`：可选覆盖（见下文）。
- `timeoutSeconds`：可选超时覆盖。
- `lightContext`：可选的轻量级引导模式，适用于不需要工作区引导文件注入的任务。

投递配置：

- `delivery.mode`：`none` | `announce` | `webhook`。
- `delivery.channel`：`last` 或特定渠道。
- `delivery.to`：特定于渠道的目标（宣布）或 webhook URL（webhook 模式）。
- `delivery.bestEffort`：如果宣布投递失败，避免任务失败。

Announce delivery 会抑制该次运行的 messaging 工具 发送；请使用 `delivery.channel`/`delivery.to` 来定位聊天。当 `delivery.mode = "none"` 时，不会向主会话发布摘要。

如果省略了独立作业的 `delivery`，OpenClaw 默认为 `announce`。

#### Announce delivery 流程

当 `delivery.mode = "announce"` 时，cron 会通过出站渠道适配器直接投递。不会启动主代理来制作或转发消息。

行为详情：

- 内容：投递使用独立运行的出站负载（文本/媒体），并采用常规分块和渠道格式。
- 仅心跳响应（没有真实内容的 `HEARTBEAT_OK`）不会被投递。
- 如果独立运行已通过 message 工具 向同一目标发送了消息，则会跳过投递以避免重复。
- 缺失或无效的投递目标会导致作业失败，除非 `delivery.bestEffort = true`。
- 仅当 `delivery.mode = "announce"` 时，才会向主会话发布简短摘要。
- 主会话摘要遵循 `wakeMode`：`now` 触发立即心跳，而 `next-heartbeat` 等待下一次计划的心跳。

#### Webhook 投递流程

当 `delivery.mode = "webhook"` 时，如果完成事件包含摘要，cron 会将完成事件负载发布到 `delivery.to`。

行为详情：

- 端点必须是有效的 HTTP(S) URL。
- 在 webhook 模式下不会尝试进行渠道投递。
- 在 webhook 模式下不会发布主会话摘要。
- 如果设置了 `cron.webhookToken`，auth header 为 `Authorization: Bearer <cron.webhookToken>`。
- 已弃用的回退：存储的具有 `notify: true` 的旧版作业仍会发布到 `cron.webhook`（如果已配置），并带有警告，以便您可以迁移到 `delivery.mode = "webhook"`。

### 模型和思维覆盖

独立作业（`agentTurn`）可以覆盖模型和思维级别：

- `model`：提供商/模型字符串（例如 `anthropic/claude-sonnet-4-20250514`）或别名（例如 `opus`）
- `thinking`: 思考级别 (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`; 仅限 GPT-5.2 + Codex 模型)

注意：您也可以在主会话作业上设置 `model`，但这会更改共享的主会话模型。为了避免意外的上下文变化，我们建议仅对独立作业使用模型覆盖。

解析优先级：

1. 作业负载覆盖（最高）
2. Hook 特定默认值（例如，`hooks.gmail.model`）
3. Agent 配置默认值

### 轻量级引导上下文

独立作业 (`agentTurn`) 可以设置 `lightContext: true` 以使用轻量级引导上下文运行。

- 将其用于不需要工作区引导文件注入的定时琐事。
- 实际上，嵌入式运行时以 `bootstrapContextMode: "lightweight"` 运行，这有意使 cron 引导上下文保持为空。
- CLI 等效项：`openclaw cron add --light-context ...` 和 `openclaw cron edit --light-context`。

### 交付（渠道 + 目标）

独立作业可以通过顶层的 `delivery` 配置将输出发送到渠道：

- `delivery.mode`：`announce`（渠道交付）、`webhook`（HTTP POST）或 `none`。
- `delivery.channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost` (插件) / `signal` / `imessage` / `last`。
- `delivery.to`：特定于渠道的接收者目标。

`announce` 交付仅对独立作业 (`sessionTarget: "isolated"`) 有效。
`webhook` 交付对主作业和独立作业均有效。

如果省略了 `delivery.channel` 或 `delivery.to`，cron 可以回退到主会话的“最后路由”（Agent 最后回复的位置）。

目标格式提醒：

- Slack/Discord/Mattermost (plugin) 目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`）以避免歧义。
  Mattermost 纯 26 字符 ID 的解析优先级为**用户优先**（如果用户存在则为私信，否则为渠道）——请使用 `user:<id>` 或 `channel:<id>` 进行确定性路由。
- Telegram 主题应使用 `:topic:` 格式（见下文）。

#### Telegram 投递目标（主题 / 论坛话题）

Telegram 通过 `message_thread_id` 支持论坛主题。对于 cron 投递，您可以将主题/话题编码到 `to` 字段中：

- `-1001234567890`（仅聊天 ID）
- `-1001234567890:topic:123`（推荐：显式主题标记）
- `-1001234567890:123`（简写：数字后缀）

带有前缀的目标（如 `telegram:...` / `telegram:group:...`）也可以被接受：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON 架构

直接调用 Gateway(网关) `cron.*` 工具时（代理工具调用或 RPC），请使用这些格式。
CLI 标志接受人类可读的持续时间，如 `20m`，但工具调用应对 `schedule.at` 使用 ISO 8601 字符串，对 `schedule.everyMs` 使用毫秒。

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

带有投递的周期性、隔离任务：

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

绑定到当前会话的周期性任务（创建时自动解析）：

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

自定义持久会话中的周期性任务：

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
- `schedule.at` 接受 ISO 8601 格式（时区可选；若省略则视为 UTC）。
- `everyMs` 为毫秒。
- `sessionTarget`：`"main"`、`"isolated"`、`"current"` 或 `"session:<custom-id>"`。
- `"current"` 在创建时解析为 `"session:<sessionKey>"`。
- 自定义会话 (`session:xxx`) 在多次运行之间保持持久上下文。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`（对于 `at` 默认为 true）、
  `delivery`。
- 省略时，`wakeMode` 默认为 `"now"`。

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

- `jobId` 是规范的；`id` 被接受以保持兼容性。
- 在补丁中使用 `agentId: null` 以清除代理绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储和历史记录

- 任务存储：`~/.openclaw/cron/jobs.json`（Gateway(网关) 托管的 JSON）。
- 运行历史记录：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，根据大小和行数自动修剪）。
- `sessions.json` 中的隔离 cron 运行会话由 `cron.sessionRetention` 修剪（默认 `24h`；设置 `false` 以禁用）。
- 覆盖存储路径：配置中的 `cron.store`。

## 重试策略

当任务失败时，OpenClaw 将错误分类为**瞬时**（可重试）或**永久**（立即禁用）。

### 瞬时错误（可重试）

- 速率限制 (429, too many requests, resource exhausted)
- 提供商过载（例如 Anthropic `529 overloaded_error`，过载回退摘要）
- 网络错误 (timeout, ECONNRESET, fetch failed, socket)
- 服务器错误 (5xx)
- Cloudflare 相关错误

### 永久错误（不重试）

- 认证失败（无效的 API 密钥，未授权）
- 配置或验证错误
- 其他非瞬时错误

### 默认行为（无配置）

**单次任务 (`schedule.kind: "at"`)：**

- 发生瞬时错误时：使用指数退避重试最多 3 次 (30s → 1m → 5m)。
- 发生永久错误时：立即禁用。
- 成功或跳过时：禁用（如果 `deleteAfterRun: true` 则删除）。

**周期性任务 (`cron` / `every`)：**

- 出现任何错误时：在下次计划运行之前应用指数退避（30s → 1m → 5m → 15m → 60m）。
- 作业保持启用状态；退避会在下次成功运行后重置。

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

运行日志清理行为：

- `cron.runLog.maxBytes`：清理前的最大运行日志文件大小。
- `cron.runLog.keepLines`：清理时，仅保留最新的 N 行。
- 两者均适用于 `cron/runs/<jobId>.jsonl` 文件。

Webhook 行为：

- 推荐做法：为每个作业设置带有 `delivery.to: "https://..."` 的 `delivery.mode: "webhook"`。
- Webhook URL 必须是有效的 `http://` 或 `https://` URL。
- 发布时，有效负载为 cron 完成事件的 JSON。
- 如果设置了 `cron.webhookToken`，则 auth 标头为 `Authorization: Bearer <cron.webhookToken>`。
- 如果未设置 `cron.webhookToken`，则不发送 `Authorization` 标头。
- 已弃用的回退方案：存储的带有 `notify: true` 的旧作业在存在时仍使用 `cron.webhook`。

完全禁用 cron：

- `cron.enabled: false`（配置）
- `OPENCLAW_SKIP_CRON=1`（环境变量）

## 维护

Cron 有两个内置的维护路径：隔离运行会话保留和运行日志清理。

### 默认值

- `cron.sessionRetention`：`24h`（设置 `false` 以禁用运行会话清理）
- `cron.runLog.maxBytes`：`2_000_000` 字节
- `cron.runLog.keepLines`：`2000`

### 工作原理

- 隔离运行会创建会话条目（`...:cron:<jobId>:run:<uuid>`）和转录文件。
- 清理器会移除早于 `cron.sessionRetention` 的过期运行会话条目。
- 对于会话存储不再引用的已移除运行会话，OpenClaw 会对转录文件进行归档，并在相同的保留期内清除旧的已删除归档。
- 每次运行追加后，会检查 `cron/runs/<jobId>.jsonl` 的大小：
  - 如果文件大小超过 `runLog.maxBytes`，它将被修剪为最新的 `runLog.keepLines` 行。

### 高负载调度器的性能注意事项

高频 cron 设置可能会产生大量的运行会话和运行日志占用。虽然内置了维护功能，但宽松的限制仍然会导致本可避免的 IO 和清理工作。

注意事项：

- 包含多次独立运行的长期 `cron.sessionRetention` 窗口
- 高 `cron.runLog.keepLines` 配合大 `runLog.maxBytes`
- 许多写入同一 `cron/runs/<jobId>.jsonl` 的嘈杂循环作业

解决方案：

- 在调试/审计需求允许的范围内，尽可能保持 `cron.sessionRetention` 短暂
- 使用适度的 `runLog.maxBytes` 和 `runLog.keepLines` 限制运行日志
- 将嘈杂的后台作业转移到独立模式，并使用避免不必要对话的通知规则
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

禁用独立运行会话清理，但保留运行日志清理：

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

针对大规模 cron 使用的优化（示例）：

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

循环独立作业（通知 WhatsApp）：

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

具有明确 30 秒错峰的循环 cron 作业：

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

循环独立作业（发送到 Telegram 主题）：

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

具有模型和思考覆盖的独立作业：

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

Agent 选择（多 Agent 设置）：

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

`cron.run` 现在在手动运行加入队列后即确认，而不是在作业完成后。成功的队列响应看起来像 `{ ok: true, enqueued: true, runId }`。如果作业已在运行或 `--due` 未发现到期作业，响应保持为 `{ ok: true, ran: false, reason }`。使用 `openclaw cron runs --id <jobId>` 或 `cron.runs` gateway 方法来检查最终的完成条目。

编辑现有作业（修补字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

强制现有 cron 作业完全按计划运行（无错峰）：

```bash
openclaw cron edit <jobId> --exact
```

运行历史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

不创建作业的直接系统事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway(网关) API 接口

- `cron.list`，`cron.status`，`cron.add`，`cron.update`，`cron.remove`
- `cron.run` (force 或 due)，`cron.runs`
  对于没有作业的即时系统事件，请使用 [`openclaw system event`](/zh/cli/system)。

## 故障排除

### “没有任何任务运行”

- 检查 cron 是否已启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway(网关) 是否持续运行（cron 在 Gateway(网关) 进程内运行）。
- 对于 `cron` 计划：确认时区 (`--tz`) 与主机时区。

### 周期性作业在失败后持续延迟

- OpenClaw 在周期性作业连续出错后应用指数退避重试：
  30秒、1分钟、5分钟、15分钟，然后重试间隔为60分钟。
- 下次成功运行后，退避会自动重置。
- 一次性 (`at`) 作业会对瞬态错误（速率限制、过载、网络、server_error）进行最多3次退避重试；永久错误会立即禁用。请参阅 [重试策略](/zh/automation/cron-jobs#retry-policy)。

### Telegram 投递到了错误的位置

- 对于论坛主题，请使用 `-100…:topic:<id>`，这样明确且无歧义。
- 如果您在日志或存储的“last route”目标中看到 `telegram:...` 前缀，这是正常的；
  cron 投递接受它们，并且仍然能正确解析主题 ID。

### 子代理公告投递重试

- 当子代理运行完成时，网关会将结果公告给请求者会话。
- 如果公告流程返回 `false`（例如请求者会话正忙），网关会通过 `announceRetryCount` 最多重试3次。
- 超过 `endedAt` 5分钟以上的公告将被强制过期，以防止过时条目无限循环。
- 如果您在日志中看到重复的公告投递，请检查子代理注册表中 `announceRetryCount` 值较高的条目。

import en from "/components/footer/en.mdx";

<en />
