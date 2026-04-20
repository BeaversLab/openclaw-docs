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

# See run history
openclaw cron runs --id <job-id>
```

## Cron 的工作原理

- Cron 在 Gateway(网关)\*\* 进程内运行（而非在模型内部）。
- 任务持久化存储在 `~/.openclaw/cron/jobs.json`，因此重启不会丢失调度。
- 所有 cron 执行都会创建 [background task](/zh/automation/tasks) 记录。
- 一次性任务 (`--at`) 默认在成功后自动删除。
- 独立的 cron 运行会在运行完成时尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器标签页/进程，因此分离的浏览器自动化不会留下孤立进程。
- 独立的 cron 运行也会防止过时的确认回复。如果第一个结果只是临时状态更新 (`on it`、`pulling everything
together` 和类似提示)，并且没有后代子代理运行仍对最终答案负责，OpenClaw 会在交付前再次提示以获取实际结果。

<a id="maintenance"></a>

Cron 的任务对账由运行时负责：只要 cron 运行时仍跟踪该作业正在运行，活动的 cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业且 5 分钟宽限期到期，维护可以将任务标记为 `lost`。

## 计划类型

| 类型    | CLI 标志  | 描述                                            |
| ------- | --------- | ----------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳 (ISO 8601 或类似 `20m` 的相对时间) |
| `every` | `--every` | 固定间隔                                        |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz`  |

不带时区的时间戳将被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟调度。

循环的整点表达式会自动错开最多 5 分钟以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式窗口。

### 月份日期和星期日期使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当“每月的第几天”和“每周的第几天”字段都非通配符时，只要**任一**字段匹配，croner 就会匹配——而不是两者都要匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每个月会触发约 5-6 次，而不是 0-1 次。OpenClaw 在此处使用 Croner 的默认 OR 行为。若要求两个条件都满足，请使用 Croner 的 `+` day-of-week 修饰符（`0 9 15 * +1`），或者在一个字段上调度并在任务的提示或命令中守护另一个字段。

## 执行方式

| 方式       | `--session` 值      | 运行于              | 最适合                 |
| ---------- | ------------------- | ------------------- | ---------------------- |
| 主会话     | `main`              | 下一次心跳轮次      | 提醒、系统事件         |
| 隔离       | `isolated`          | 专用 `cron:<jobId>` | 报告、后台杂务         |
| 当前会话   | `current`           | 创建时绑定          | 上下文相关的周期性工作 |
| 自定义会话 | `session:custom-id` | 持久化命名会话      | 基于历史记录的工作流   |

**主会话** 任务将系统事件加入队列，并可选地唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。**隔离** 任务使用全新的会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在多次运行之间持久化上下文，从而支持诸如基于先前摘要的每日站会等工作流。

对于隔离任务，运行时拆解现在包括针对该 cron 会话的最大努力浏览器清理。清理失败会被忽略，以便实际的 cron 结果仍然胜出。

当隔离 cron 运行编排子代理时，交付也更倾向于最终的子代输出，而不是过时的父级临时文本。如果子代仍在运行，OpenClaw 将抑制该部分父级更新，而不是宣布它。

### 隔离任务的 Payload 选项

- `--message`：提示文本（隔离任务必需）
- `--model` / `--thinking`：模型和思考级别覆盖
- `--light-context`：跳过工作区启动文件注入
- `--tools exec,read`：限制任务可使用的工具

`--model` 使用为该作业选定的允许模型。如果请求的模型不被允许，cron 会记录警告并回退到作业的代理/默认模型选择。配置的回退链仍然适用，但没有显式每作业回退列表的纯模型覆盖不再将代理主要模型作为隐藏的额外重试目标附加。

隔离作业的模型选择优先级如下：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 每作业负载 `model`
3. 存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析后的实时选择。如果所选模型配置具有 `params.fastMode`，隔离的 cron 默认使用它。存储的会话 `fastMode` 覆盖在任一方向上仍然优先于配置。

如果隔离运行遇到实时模型切换交接，cron 会使用切换后的提供商/模型重试，并在重试之前持久化该实时选择。当切换还带有新的身份验证配置文件时，cron 也会持久化该身份验证配置文件覆盖。重试是有界的：在初始尝试加上 2 次切换重试后，cron 会中止而不是永远循环。

## 交付和输出

| 模式       | 发生的情况                               |
| ---------- | ---------------------------------------- |
| `announce` | 将摘要传递到目标渠道（隔离模式的默认值） |
| `webhook`  | 将完成事件负载 POST 到 URL               |
| `none`     | 仅限内部，不进行交付                     |

使用 `--announce --channel telegram --to "-1001234567890"` 进行渠道交付。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`）。

对于 cron 拥有的隔离作业，运行器拥有最终交付路径。代理被提示返回纯文本摘要，然后该摘要通过 `announce`、`webhook` 发送，或者在 `none` 的情况下保留在内部。`--no-deliver` 不会将交付交还给代理；它将运行保留在内部。

如果原始任务明确要求向某些外部接收者发送消息，
agent 应该在其输出中注明该消息的发送对象/位置，而不是
尝试直接发送。

失败通知遵循单独的目标路径：

- `cron.failureDestination` 设置了失败通知的全局默认值。
- `job.delivery.failureDestination` 会针对每个任务覆盖该默认值。
- 如果两者均未设置，且任务已通过 `announce` 传递输出，失败通知现在将回退到该主目标。
- 除非主要传递模式是 `webhook`，否则 `delivery.failureDestination` 仅受 `sessionTarget="isolated"` 任务支持。

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

带传递的循环独立作业：

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

带模型和思维覆盖的独立作业：

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

Gateway(网关) 可以公开 HTTP webhook 端点以供外部触发器使用。在配置中启用：

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

查询字符串 token 会被拒绝。

### POST /hooks/wake

为主会话加入一个系统事件：

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text`（必需）：事件描述
- `mode`（可选）：`now`（默认）或 `next-heartbeat`

### POST /hooks/agent

运行一次独立的 agent 轮次：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

### 映射的钩子（POST /hooks/\<name\>）

自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。

### 安全性

- 将 hook 端点置于环回接口、tailnet 或受信任的反向代理之后。
- 使用专用的 hook token；不要复用 gateway 认证 token。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要调用方选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，请同时设置 `hooks.allowedSessionKeyPrefixes` 以限制允许的会话密钥形状。
- 默认情况下，Hook 负载会被安全边界包裹。

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

**先决条件**：`gcloud` CLI，`gog` (gogcli)，已启用 OpenClaw hooks，用于公共 HTTPS 端点的 Tailscale。

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续订监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以选择退出。

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
- 如果该模型被允许，则该特定的提供商/模型会到达隔离的代理
  运行。
- 如果不被允许，cron 会发出警告并回退到作业的代理/默认
  模型选择。
- 配置的回退链仍然适用，但如果没有显式的每个作业回退列表，普通的 `--model` 覆盖
  不再会静默地回退到代理主要模型作为额外的重试目标。

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

**一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久错误会立即禁用。

**循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。下次成功运行后重置退避。

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
- 对于 `cron` 计划，请验证时区（`--tz`）与主机时区是否一致。
- 运行输出中的 `reason: not-due` 表示已通过 `openclaw cron run <jobId> --due` 检查了手动运行，但任务尚未到期。

### Cron 已触发但无投递

- 投递模式为 `none` 表示不期望有外部消息。
- 投递目标缺失/无效（`channel`/`to`）表示跳过了出站操作。
- 频道身份验证错误（`unauthorized`，`Forbidden`）表示投递被凭据阻止。
- 如果隔离运行仅返回静默令牌（`NO_REPLY` / `no_reply`），
  OpenClaw 将抑制直接出站投递，同时也抑制回退
  的排队摘要路径，因此不会有任何内容回发到聊天。
- 对于 cron 拥有的隔离作业，不要期望代理使用消息工具
  作为回退。运行器拥有最终投递权；`--no-deliver` 会将其
  保持在内部，而不是允许直接发送。

### 时区注意事项

- 没有 `--tz` 的 Cron 使用网关主机时区。
- 没有时区的 `at` 计划将被视为 UTC。
- 心跳 `activeHours` 使用配置的时区解析。

## 相关

- [自动化与任务](/zh/automation) — 所有自动化机制概览
- [后台任务](/zh/automation/tasks) — cron 执行的任务账本
- [心跳](/zh/gateway/heartbeat) — 周期性主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
