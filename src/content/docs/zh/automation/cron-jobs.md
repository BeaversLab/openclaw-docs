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
- 作业持久保存在 `~/.openclaw/cron/jobs.json`，因此重启不会丢失计划。
- 所有 cron 执行都会创建[后台任务](/en/automation/tasks)记录。
- 一次性作业 (`--at`) 在成功后默认会自动删除。
- 隔离的 cron 运行会在运行完成时尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器标签/进程，因此分离的浏览器自动化不会留下孤立的进程。
- 隔离的 cron 运行还可以防止过时的确认回复。如果第一个结果只是临时状态更新（`on it`、`pulling everything
together` 和类似提示），并且没有后代子代理运行仍然对最终答案负责，OpenClaw 会在交付前再次提示以获取实际结果。

<a id="maintenance"></a>

Cron 的任务协调由运行时所有：只要 cron 运行时仍然跟踪该作业正在运行，活动的 cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业并且 5 分钟的宽限期到期，维护可以将任务标记为 `lost`。

## 计划类型

| 类型    | CLI 标志  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`）  |
| `every` | `--every` | 固定间隔                                       |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz` |

不带时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟计划。

循环的整点表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式窗口。

## 执行样式

| 样式       | `--session` 值      | 运行于              | 最适用于               |
| ---------- | ------------------- | ------------------- | ---------------------- |
| 主会话     | `main`              | 下一次心跳轮次      | 提醒、系统事件         |
| 隔离       | `isolated`          | 专用 `cron:<jobId>` | 报告、后台杂务         |
| 当前会话   | `current`           | 创建时绑定          | 上下文感知的周期性工作 |
| 自定义会话 | `session:custom-id` | 持久化命名会话      | 基于历史的工作流       |

**主会话**作业将系统事件加入队列，并可选择唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。**独立**作业使用新会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在运行之间保持上下文，从而支持基于先前摘要的每日站会等工作流。

对于独立作业，运行时拆解现在包括对该 cron 会话尽最大努力的浏览器清理。清理失败将被忽略，以便实际的 cron 结果仍然获胜。

当独立 cron 运行编排子代理时，交付也更偏好最终后代输出，而不是过时的父级临时文本。如果后代仍在运行，OpenClaw 将抑制该部分父级更新，而不是宣布它。

### 独立作业的负载选项

- `--message`：提示文本（独立作业必需）
- `--model` / `--thinking`：模型和思考级别覆盖
- `--light-context`：跳过工作区引导文件注入
- `--tools exec,read`：限制作业可使用的工具

`--model` 使用为该作业选择的允许模型。如果请求的模型不被允许，cron 会记录警告并回退到作业的代理/默认模型选择。配置的回退链仍然适用，但是没有明确的每作业回退列表的纯模型覆盖不再将代理主要模型附加为隐藏的额外重试目标。

独立作业的模型选择优先级为：

1. Gmail 钩子模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 每作业负载 `model`
3. 存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析的实时选择。如果所选模型配置具有 `params.fastMode`，独立 cron 默认使用它。存储的会话 `fastMode` 覆盖仍然胜过任一方向的配置。

如果隔离运行遇到实时模型切换切换，cron 会使用切换后的提供商/模型重试，并在重试前持久化该实时选择。当切换还带有新的身份验证配置文件时，cron 也会持久化该身份验证配置文件覆盖。重试是有界限的：在初始尝试加上 2 次切换重试后，cron 将中止而不是无限循环。

## 传递和输出

| 模式       | 发生的情况                                 |
| ---------- | ------------------------------------------ |
| `announce` | 将摘要传递到目标渠道（隔离模式的默认设置） |
| `webhook`  | 将完成的事件负载 POST 到 URL               |
| `none`     | 仅限内部，不进行传递                       |

使用 `--announce --channel telegram --to "-1001234567890"` 进行渠道传递。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`）。

对于 cron 拥有的隔离作业，运行器拥有最终的传递路径。提示代理返回纯文本摘要，然后通过 `announce`、`webhook` 发送该摘要，或者对于 `none` 在内部保留。`--no-deliver` 不会将传递权交还给代理；它在内部保留运行。

如果原始任务明确要求向某个外部接收者发送消息，代理应在输出中注明该消息应发送给谁/发送到哪里，而不是尝试直接发送。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 设置失败通知的全局默认值。
- `job.delivery.failureDestination` 为每个作业覆盖该设置。
- 如果两者均未设置，并且作业已经通过 `announce` 传递，失败通知现在将回退到该主要通告目标。
- `delivery.failureDestination` 仅受 `sessionTarget="isolated"` 作业支持，除非主要传递模式是 `webhook`。

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

带有传递的循环隔离作业：

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

带有模型和思维覆盖的隔离作业：

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

Gateway(网关) 可以暴露 HTTP webhook 端点用于外部触发器。在配置中启用：

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

每个请求必须通过 header 包含 hook token：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串令牌（Query-string tokens）会被拒绝。

### POST /hooks/wake

为主会话（会话）加入系统事件队列：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必需）：事件描述
- `mode`（可选）：`now`（默认）或 `next-heartbeat`

### POST /hooks/agent

运行一个独立的代理轮次：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

字段：`message`（必需），`name`，`agentId`，`wakeMode`，`deliver`，`channel`，`to`，`model`，`thinking`，`timeoutSeconds`。

### 映射钩子（POST /hooks/\<name\>）

自定义钩子名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。

### 安全性

- 将钩子端点置于回环地址（loopback）、tailnet 或可信反向代理之后。
- 使用专用的钩子令牌；不要重用 Gateway 认证令牌。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式的 `agentId` 路由。
- 除非您需要调用者选择的会话（session），否则请保持 `hooks.allowRequestSessionKey=false`。
- 如果您启用了 `hooks.allowRequestSessionKey`，还要设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- 默认情况下，钩子负载会被安全边界包裹。

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

**先决条件**：`gcloud` CLI，`gog` (gogcli)，已启用 OpenClaw 钩子，用于公共 HTTPS 端点的 Tailscale。

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续订监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 手动一次性设置

1. 选择拥有 `gog` 所使用的 OAuth 客户端的 GCP 项目：

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

## 管理作业

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

- `openclaw cron add|edit --model ...` 会更改作业所选的模型。
- 如果该模型是允许的，则该确切的提供商/模型会到达隔离的代理运行。
- 如果不允许，cron 会发出警告并回退到作业的代理/默认模型选择。
- 配置的回退链仍然适用，但如果没有显式的每个作业的回退列表，普通的 `--model` 覆盖将不再作为一个静默的额外重试目标回退到代理主要选项。

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

**一次性重试**：瞬态错误（速率限制、过载、网络、服务器错误）最多重试 3 次，并采用指数退避。永久错误立即禁用。

**周期性重试**：重试之间采用指数退避（30 秒到 60 分钟）。下次成功运行后重置退避。

**维护**：`cron.sessionRetention`（默认 `24h`）会修剪隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动修剪运行日志文件。

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
- 运行输出中的 `reason: not-due` 意味着使用 `openclaw cron run <jobId> --due` 检查了手动运行，但该作业尚未到期。

### Cron 已触发但无投递

- 投递模式为 `none` 表示不期望有外部消息。
- 投递目标缺失/无效 (`channel`/`to`) 表示已跳过出站操作。
- 频道身份验证错误（`unauthorized`，`Forbidden`）表示传递被凭据阻止。
- 如果隔离运行仅返回静默令牌（`NO_REPLY` / `no_reply`），
  OpenClaw 将抑制直接出站传递，同时也会抑制后备
  队列摘要路径，因此不会将任何内容发布回聊天。
- 对于 cron 拥有的隔离作业，不要指望代理使用消息工具
  作为后备。运行者拥有最终传递权；`--no-deliver` 将其
  保留在内部，而不是允许直接发送。

### 时区注意事项

- 不带 `--tz` 的 Cron 使用网关主机时区。
- 不带时区的 `at` 计划被视为 UTC。
- 心跳 `activeHours` 使用配置的时区解析。

## 相关

- [自动化与任务](/en/automation) — 所有自动化机制一览
- [后台任务](/en/automation/tasks) — cron 执行的任务账本
- [心跳](/en/gateway/heartbeat) — 周期性主会话轮次
- [时区](/en/concepts/timezone) — 时区配置
