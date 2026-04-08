---
summary: "Gateway(网关)调度器的计划作业、webhook和Gmail PubSub触发器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "计划任务"
---

# 计划任务 (Cron)

Cron 是 Gateway(网关) 的内置调度器。它持久化作业，在正确的时间唤醒代理，并可以将输出发送回聊天渠道或 webhook 端点。

## 快速开始

```bash
# Add a one-shot reminder
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

# Check your jobs
openclaw cron list

# See run history
openclaw cron runs --id <job-id>
```

## Cron 的工作原理

- Cron 在 Gateway(网关)\*\* 进程内运行（而非在模型内部）。
- 作业持久化存储在 `~/.openclaw/cron/jobs.json`，因此重启不会丢失计划。
- 所有 Cron 执行都会创建 [background task](/en/automation/tasks) 记录。
- 单次作业 (`--at`) 默认在成功后自动删除。
- 隔离的 Cron 运行会在运行结束时尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器标签/进程，从而避免分离的浏览器自动化留下孤立的进程。
- 隔离的 Cron 运行还可以防止过时的确认回复。如果第一个结果只是临时状态更新 (`on it`、`pulling everything
together` 和类似提示)，并且没有后代子代理运行仍对最终答案负责，OpenClaw 会在交付前重新提示一次以获取实际结果。

Cron 的任务协调由运行时拥有：只要 cron 运行时仍跟踪该作业正在运行，活动的 cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业并且 5 分钟的宽限期到期，维护便可以将任务标记为 `lost`。

## 计划类型

| 种类    | CLI 标志  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 单次时间戳（ISO 8601 或相对时间如 `20m`）      |
| `every` | `--every` | 固定间隔                                       |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz` |

不带时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地时钟计划。

循环的整点表达式会自动错开最多 5 分钟，以减少负载峰值。请使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定明确的时间窗口。

## 执行样式

| 样式       | `--session` 值      | 运行于              | 最适用于             |
| ---------- | ------------------- | ------------------- | -------------------- |
| 主会话     | `main`              | 下一次心跳轮次      | 提醒、系统事件       |
| 隔离       | `isolated`          | 专用 `cron:<jobId>` | 报告、后台杂务       |
| 当前会话   | `current`           | 创建时绑定          | 上下文感知的循环工作 |
| 自定义会话 | `session:custom-id` | 持久化命名会话      | 基于历史的工作流     |

**主会话** 任务会将一个系统事件加入队列，并可选择唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。**隔离** 任务使用新会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在运行之间保持上下文，从而支持基于先前摘要的每日站会等工作流。

对于隔离任务，运行时拆解现在包括尽力而为的浏览器清理，针对该 cron 会话。清理失败将被忽略，以确保实际的 cron 结果优先。

当隔离 cron 运行编排子代理时，交付也优先选择最终后代输出，而不是过时的父级临时文本。如果后代仍在运行，OpenClaw 将抑制该部分父级更新，而不是发布它。

### 隔离任务的负载选项

- `--message`: 提示文本（隔离模式必需）
- `--model` / `--thinking`: 模型和思考级别覆盖
- `--light-context`: 跳过工作区引导文件注入
- `--tools exec,read`: 限制任务可以使用的工具

`--model` 使用该任务选定的允许模型。如果请求的模型不被允许，cron 会记录警告并回退到任务的代理/默认模型选择。配置的回退链仍然适用，但没有明确的每个任务回退列表的纯模型覆盖不再将代理主要模型附加为隐藏的额外重试目标。

独立任务的模型选择优先级如下：

1. Gmail hook 模型覆盖（当运行源自 Gmail 且允许该覆盖时）
2. 每个任务的 Payload `model`
3. 存储的 cron 会话模型覆盖
4. Agent/默认 模型选择

快速模式也遵循解析出的实时选择。如果所选模型配置具有
`params.fastMode`，独立的 cron 默认使用它。存储的会话
`fastMode` 覆盖在任一方向上都优先于配置。

如果独立运行遇到实时的模型切换切换，cron 会使用切换后的
提供商/模型重试，并在重试前持久化该实时选择。当切换还携带
新的身份验证配置文件时，cron 也会持久化该身份验证配置文件覆盖。
重试是有界的：在初始尝试加上 2 次切换重试后，cron 将中止而不是无限循环。

## 交付和输出

| 模式       | 发生的情况                               |
| ---------- | ---------------------------------------- |
| `announce` | 将摘要传送到目标渠道（独立任务的默认值） |
| `webhook`  | 将完成事件 Payload POST 到 URL           |
| `none`     | 仅内部使用，不交付                       |

使用 `--announce --channel telegram --to "-1001234567890"` 进行渠道交付。对于 Telegram 论坛主题，使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`, `user:<id>`）。

对于 cron 拥有的独立任务，运行器拥有最终交付路径。
Agent 被提示返回纯文本摘要，然后该摘要通过 `announce`、`webhook` 发送，
或者在 `none` 模式下保持内部。`--no-deliver`
不会将交付交还给 Agent；它使运行保持在内部。

如果原始任务明确要求向某个外部收件人发送消息，
Agent 应在其输出中注明该消息应发送给谁/哪里，而不是尝试直接发送。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 为失败通知设置全局默认值。
- `job.delivery.failureDestination` 会针对每个任务覆盖该设置。
- 如果两者均未设置且任务已通过 `announce` 投递，失败通知现在会回退到该主要通告目标。
- 除非主要投递模式为 `webhook`，否则 `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 任务上受支持。

## CLI 示例

一次性提醒（主会话）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

带投递的定期隔离任务：

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

带模型和思考覆盖的隔离任务：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce
```

## Webhooks

Gateway(网关) 可以暴露 HTTP webhook 端点以供外部触发。在配置中启用：

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### 身份验证

每个请求必须通过 header 包含 hook 令牌：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

拒绝查询字符串令牌。

### POST /hooks/wake

为主会话入队一个系统事件：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必需）：事件描述
- `mode`（可选）：`now`（默认）或 `next-heartbeat`

### POST /hooks/agent

运行一个隔离的 agent 轮次：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 映射的 hooks（POST /hooks/\<name\>）

自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。

### 安全性

- 将 hook 端点置于环回接口、tailnet 或受信任的反向代理之后。
- 使用专用的 hook 令牌；不要重复使用网关身份验证令牌。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false` 开启，除非您需要调用方选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以限制允许的会话密钥格式。
- Hook payloads 默认使用安全边界进行封装。

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

**先决条件**：`gcloud` CLI，`gog` (gogcli)，启用 OpenClaw hooks，用于公共 HTTPS 端点的 Tailscale。

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续订监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手动一次性设置

1. 选择拥有 `gog` 使用的 GCP 客户端的 OAuth 项目：

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. 创建主题并授予 Gmail 推送访问权限：

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. 启动监视：

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Gmail 模型覆盖

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## 管理任务

```bash
# List all jobs
openclaw cron list

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改任务所选的模型。
- 如果允许使用该模型，则该特定的提供商/模型将到达隔离的代理
  运行。
- 如果不允许，cron 会警告并回退到任务的代理/默认
  模型选择。
- 配置的回退链仍然适用，但简单的 `--model` 覆盖
  如果没有明确的每个任务的回退列表，则不再将代理主
  作为静默的额外重试目标。

## 配置

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

**一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，并采用指数退避。永久错误立即禁用。

**循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。在下次成功运行后重置退避。

**维护**：`cron.sessionRetention`（默认 `24h`）修剪隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 自动修剪运行日志文件。

## 故障排除

### 命令阶梯

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

### Cron 未触发

- 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
- 确认 Gateway(网关) 正在持续运行。
- 对于 `cron` 计划，请验证时区 (`--tz`) 与主机时区是否一致。
- 运行输出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 检查手动运行，但任务尚未到期。

### Cron 已触发但无投递

- 投递模式为 `none` 表示不期望有外部消息。
- 投递目标缺失/无效 (`channel`/`to`) 表示已跳过出站传输。
- 频道身份验证错误 (`unauthorized`, `Forbidden`) 表示投递被凭据阻止。
- 如果隔离运行仅返回静默令牌 (`NO_REPLY` / `no_reply`)，OpenClaw 将抑制直接出站投递，并且也会抑制回退的排队摘要路径，因此不会有任何内容回发到聊天。
- 对于 cron 拥有的隔离作业，不要期望代理使用消息工具作为回退。运行器拥有最终投递权；`--no-deliver` 将其保留在内部，而不是允许直接发送。

### 时区注意事项

- 没有 `--tz` 的 Cron 使用网关主机时区。
- 没有时区的 `at` 计划被视为 UTC。
- Heartbeat `activeHours` 使用配置的时区解析方式。

## 相关内容

- [自动化与任务](/en/automation) — 所有自动化机制一览
- [后台任务](/en/automation/tasks) — cron 执行的任务账本
- [Heartbeat](/en/gateway/heartbeat) — 周期性主会话轮次
- [时区](/en/concepts/timezone) — 时区配置
