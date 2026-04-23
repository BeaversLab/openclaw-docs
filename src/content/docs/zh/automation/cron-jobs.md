---
summary: "Gateway(网关) 调度器的定时任务、Webhook 和 Gmail PubSub 触发器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "Scheduled Tasks"
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
openclaw cron show <job-id>

# See run history
openclaw cron runs --id <job-id>
```

## Cron 的工作原理

- Cron 在 Gateway(网关)\*\* 进程内运行（而非在模型内部）。
- 作业定义持久化存储在 `~/.openclaw/cron/jobs.json` 中，因此重启不会丢失调度计划。
- 运行时执行状态与其持久化存储在 `~/.openclaw/cron/jobs-state.json` 中。如果您在 git 中跟踪 cron 定义，请跟踪 `jobs.json` 并将 `jobs-state.json` 加入 gitignore。
- 拆分后，较旧的 OpenClaw 版本可以读取 `jobs.json`，但可能会将作业视为新作业，因为运行时字段现在位于 `jobs-state.json` 中。
- 所有 cron 执行都会创建[后台任务](/zh/automation/tasks)记录。
- 一次性作业 (`--at`) 默认在成功后自动删除。
- 隔离的 cron 运行会在运行完成时尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器标签页/进程，因此分离的浏览器自动化不会留下孤立的进程。
- 隔离的 cron 运行还可以防止过时的确认回复。如果第一个结果只是临时状态更新 (`on it`、`pulling everything
together` 和类似提示)，并且没有后代子代理运行仍对最终答案负责，则 OpenClaw 会在交付前再次提示以获取实际结果。

<a id="maintenance"></a>

Cron 的任务对账由运行时拥有：只要 cron 运行时仍跟踪该作业正在运行，活动的 cron 任务就会保持活跃状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业并且 5 分钟的宽限期到期，维护程序可以将任务标记为 `lost`。

## 计划类型

| 种类    | CLI 标志  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`）  |
| `every` | `--every` | 固定间隔                                       |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz` |

不带时区的时间戳被视为 UTC 时间。添加 `--tz America/New_York` 以进行本地时钟调度。

每小时重复执行的表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式的时间窗口。

### 月份中的日期和星期中的日期使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当月份中的日期和星期中的日期字段均为非通配符时，croner 在 **任一** 字段匹配时即匹配——不需要两者都匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每月触发约 5-6 次，而不是每月 0-1 次。OpenClaw 在此处使用 Croner 的默认 OR 行为。若要求同时满足两个条件，请使用 Croner 的 `+` 星期中的日期修饰符 (`0 9 15 * +1`)，或者在一个字段上安排计划，并在作业的提示词或命令中对另一个字段进行防护。

## 执行样式

| 样式       | `--session` 值      | 运行于              | 最适用于               |
| ---------- | ------------------- | ------------------- | ---------------------- |
| 主会话     | `main`              | 下一个心跳轮次      | 提醒、系统事件         |
| 独立       | `isolated`          | 专用 `cron:<jobId>` | 报告、后台琐事         |
| 当前会话   | `current`           | 创建时绑定          | 上下文感知的周期性工作 |
| 自定义会话 | `session:custom-id` | 持久化的命名会话    | 基于历史构建的工作流   |

**主会话** 作业将一个系统事件加入队列，并可选择唤醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。**独立** 作业使用全新的会话运行专用的代理轮次。**自定义会话** (`session:xxx`) 在运行之间保留上下文，从而支持诸如基于先前摘要的每日站会之类的工作流。

对于独立作业，运行时拆解现在包括针对该 cron 会话的最大努力浏览器清理。清理失败将被忽略，以便实际的 cron 结果仍然优先。

当独立的 cron 运行编排子代理时，传递也更偏向最终的子代输出，而不是过时的父级临时文本。如果子代仍在运行，OpenClaw 将抑制该部分父级更新，而不是公告它。

### 独立作业的有效载荷选项

- `--message`：提示文本（独立作业必需）
- `--model` / `--thinking`：模型和思考级别覆盖
- `--light-context`：跳过工作区引导文件注入
- `--tools exec,read`：限制任务可以使用的工具

`--model` 使用为该任务选择的允许模型。如果请求的模型
不被允许，cron 会记录警告并回退到任务的代理/默认
模型选择。配置的回退链仍然适用，但如果没有明确的
每个任务的回退列表，单纯的模型覆盖不再将代理主要模型
作为隐藏的额外重试目标附加。

隔离任务的模型选择优先级为：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且该覆盖被允许时）
2. 每个任务的负载 `model`
3. 存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析后的实时选择。如果所选模型配置
包含 `params.fastMode`，隔离 cron 默认使用该设置。存储的会话
`fastMode` 覆盖在任何方向上都优先于配置。

如果隔离运行遇到实时模型切换移交，cron 会使用切换后的
提供商/模型重试，并在重试之前持久化该实时选择。当切换还
带有新的身份验证配置文件时，cron 也会持久化该身份验证
配置文件覆盖。重试是有界的：在初始尝试加上 2 次切换
重试后，cron 将中止而不是无限循环。

## 交付和输出

| 模式       | 发生了什么                                 |
| ---------- | ------------------------------------------ |
| `announce` | 如果代理未发送，则回退将最终文本交付给目标 |
| `webhook`  | 将完成的事件负载 POST 到 URL               |
| `none`     | 无运行器回退交付                           |

使用 `--announce --channel telegram --to "-1001234567890"` 进行渠道交付。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`， `user:<id>`）。

对于隔离任务，聊天投递是共享的。如果聊天路由可用，即使任务使用了 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到配置的/当前目标，OpenClaw 会跳过备用通知。否则，`announce`、`webhook` 和 `none` 仅控制代理轮次后运行程序对最终回复的处理。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 为失败通知设置全局默认值。
- `job.delivery.failureDestination` 会针对每个任务覆盖该设置。
- 如果两者均未设置且任务已通过 `announce` 投递，失败通知现在将回退到该主通知目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 任务上受支持，除非主投递模式为 `webhook`。

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

带有投递的周期性隔离任务：

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

带有模型和思考覆盖的隔离任务：

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

Gateway(网关) 可以公开 HTTP webhook 端点以供外部触发。在配置中启用：

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

每个请求必须通过标头包含 hook token：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串 token 会被拒绝。

### POST /hooks/wake

为主会话加入一个系统事件队列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必需）：事件描述
- `mode`（可选）：`now`（默认）或 `next-heartbeat`

### POST /hooks/agent

运行一个隔离的代理轮次：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 映射的钩子（POST /hooks/\<name\>）

自定义挂钩名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。

### 安全性

- 将挂钩端点保留在回环、tailnet 或可信反向代理之后。
- 使用专用的挂钩令牌；不要重复使用 Gateway(网关) 认证令牌。
- 将 `hooks.path` 保留在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式的 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false` 开启，除非您需要调用者选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，还应设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- 默认情况下，挂钩负载会被安全边界包裹。

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

**先决条件**：`gcloud` CLI，`gog` (gogcli)，已启用 OpenClaw 挂钩，用于公共 HTTPS 端点的 Tailscale。

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续订监听。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

1. 选择拥有 `gog` 使用的 OAuth 客户端的 GCP 项目：

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

3. 启动监听：

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

## 管理作业

```bash
# List all jobs
openclaw cron list

# Show one job, including resolved delivery route
openclaw cron show <jobId>

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

- `openclaw cron add|edit --model ...` 会更改作业所选的模型。
- 如果该模型是允许的，则该确切的提供商/模型将到达隔离的代理
  运行环境。
- 如果该模型不被允许，cron 将发出警告并回退到作业的代理/默认
  模型选择。
- 配置的回退链仍然适用，但普通的 `--model` 覆盖如果
  没有显式的每个作业的回退列表，将不再静默地回退到代理
  主模型作为额外的重试目标。

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

运行时状态侧挂源自 `cron.store`：例如 `~/clawd/cron/jobs.json` 这样的 `.json` 存储使用 `~/clawd/cron/jobs-state.json`，而不带 `.json` 后缀的存储路径则会附加 `-state.json`。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

**一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，并采用指数退避。永久性错误则立即禁用。

**周期性重试**：重试之间采用指数退避（30 秒到 60 分钟）。下一次成功运行后重置退避时间。

**维护**：`cron.sessionRetention`（默认 `24h`）会清理隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动清理运行日志文件。

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
- 对于 `cron` 调度，请验证时区 (`--tz`) 与主机时区是否一致。
- 运行输出中的 `reason: not-due` 表示已通过 `openclaw cron run <jobId> --due` 检查了手动运行，但任务尚未到期。

### Cron 已触发但未投递

- 投递模式 `none` 意味着不预期运行器回退发送。当聊天路由可用时，代理仍可使用 `message` 工具直接发送。
- 投递目标缺失/无效 (`channel`/`to`) 表示跳过了出站操作。
- 频道认证错误 (`unauthorized`, `Forbidden`) 表示投递被凭据阻止。
- 如果隔离运行仅返回静默令牌 (`NO_REPLY` / `no_reply`)，
  OpenClaw 将抑制直接出站投递，并抑制回退
  队列摘要路径，因此不会回贴任何内容到聊天。
- 如果代理应该自己向用户发送消息，请检查作业是否有可用的
  路由（带有先前聊天记录的 `channel: "last"`，或明确的渠道/目标）。

### 时区注意事项

- 不带 `--tz` 的 Cron 使用网关主机的时区。
- 不带时区的 `at` 计划将被视为 UTC。
- Heartbeat `activeHours` 使用已配置的时区解析。

## 相关

- [自动化与任务](/zh/automation) — 所有自动化机制概览
- [后台任务](/zh/automation/tasks) — cron 执行的任务账本
- [Heartbeat](/zh/gateway/heartbeat) — 周期性的主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
