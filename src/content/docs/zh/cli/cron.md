---
summary: "CLI 参考用于 `openclaw cron`（调度和运行后台作业）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway(网关) 网关 调度器的 cron 作业。

<Tip>运行 `openclaw cron --help` 以获取完整的命令界面。请参阅 [Cron jobs](/zh/automation/cron-jobs) 了解概念指南。</Tip>

## Sessions

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建新的转录和会话 ID。
    - `current` 在创建时绑定到活动会话。
    - `session:<id>` 固定到显式的持久会话密钥。

  </Accordion>
  <Accordion title="Isolated 会话 semantics">
    隔离运行会重置环境对话上下文。渠道和组路由、发送/排队策略、提升、来源和 ACP 运行时绑定都会为新运行重置。安全首选项和显式用户选择的模型或身份验证覆盖可以在运行间保留。
  </Accordion>
</AccordionGroup>

## Delivery

`openclaw cron list` 和 `openclaw cron show <job-id>` 可预览已解析的传递路由。对于 `channel: "last"`，预览将显示路由是从主会话还是当前会话解析的，或者是否会失败关闭。

提供商前缀的目标可以消除未解析公告渠道的歧义。例如，当 `delivery.channel` 被省略或 `last` 时，`to: "telegram:123"` 会选择 Telegram。只有已加载插件通告的前缀才是提供商选择器。如果 `delivery.channel` 是显式的，则前缀必须与该渠道匹配；`channel: "whatsapp"` 带有 `to: "telegram:123"` 会被拒绝。服务前缀（如 `imessage:` 和 `sms:`）仍然是渠道拥有的目标语法。

<Note>独立的 `cron add` 任务默认为 `--announce` 传递。使用 `--no-deliver` 以保持输出内部化。`--deliver` 作为 `--announce` 的已弃用别名保留。</Note>

### 投递所有权

隔离的 cron 聊天投递在代理和运行器之间共享：

- 当存在聊天路由时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理未直接发送到解析目标时对最终回复进行回退传递。
- `webhook` 将完成的载荷发布到 URL。
- `none` 禁用运行器回退传递。

`--announce` 是针对最终回复的运行器回退传递。`--no-deliver` 禁用该回退，但在存在聊天路由时不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标，以便进行回退通知投递。内部会话密钥可能是小写的；不要将它们用作区分大小写的提供商 ID（例如 Matrix 房间 ID）的事实来源。

### 失败投递

失败通知按以下顺序解析：

1. 任务上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主要通知目标（当未设置显式失败目标时）。

<Note>主会话任务可能仅在主要传递模式为 `webhook` 时使用 `delivery.failureDestination`。独立任务在所有模式下均可接受它。</Note>

注意：隔离的 cron 运行会将运行级代理失败视为作业错误，即使没有生成回复负载，因此模型/提供商失败仍会增加错误计数器并触发失败通知。

如果独立运行在首次模型请求之前超时，`openclaw cron show`
和 `openclaw cron runs` 将包含特定于阶段的错误，例如
`setup timed out before runner start` 或
`stalled before first model call (last phase: context-engine)`。
对于基于 CLI 的提供程序，模型前监控程序将保持活动状态，直到外部
CLI 轮次开始，因此会话查找、钩子、身份验证、提示和 CLI 设置停滞
将被报告为模型前 cron 失败。

## 调度

### 一次性作业

`--at <datetime>` 计划一次运行。无偏移量的日期时间被视为 UTC，除非您还传递 `--tz <iana>`，它会将挂钟时间解释为给定时区中的时间。

<Note>一次性任务默认在成功后删除。使用 `--keep-after-run` 来保留它们。</Note>

### 周期性作业

周期性作业在连续错误后使用指数退避重试：30 秒、1 分钟、5 分钟、15 分钟、60 分钟。在下一次成功运行后，调度恢复正常。

跳过的运行与执行错误分开跟踪。它们不影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以选择让失败警报接收重复的跳过运行通知。

对于针对本地配置的模型提供商的隔离作业，cron 在启动代理轮次之前会运行轻量级的提供商预检。Loopback、专用网络和 `.local` `api: "ollama"` 提供商在 `/api/tags`OpenAI 处被探测；本地 OpenAI 兼容的提供商（如 vLLM、SGLang 和 LM Studio）在 `/models` 处被探测。如果端点不可达，该运行将被记录为 `skipped` 并在稍后的计划中重试；匹配的死端点会被缓存 5 分钟，以避免许多作业 hammering 同一个本地服务器。

注意：cron 作业定义存在于 `jobs.json` 中，而挂起的运行时状态存在于 `jobs-state.json` 中。如果 `jobs.json`Gateway(网关) 被外部编辑，Gateway(网关) 将重新加载已更改的计划并清除过时的挂起槽；仅格式化的重写不会清除挂起槽。

### 手动运行

`openclaw cron run <job-id>` 默认进行强制运行，并在手动运行排队后立即返回。成功的响应包括 `{ ok: true, enqueued: true, runId }`。使用返回的 `runId` 来检查后续结果：

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

当脚本应阻塞，直到该特定的排队运行记录最终状态时，请添加 `--wait`：

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait`CLI 时，CLI 仍然首先调用 `cron.run`，然后轮询 `cron.runs` 以获取返回的 `runId`。仅当运行以状态 `ok` 完成时，该命令才以 `0` 退出。当运行以 `error` 或 `skipped`Gateway(网关) 完成、Gateway(网关) 响应未包含 `runId`，或 `--wait-timeout` 过期时，它将以非零值退出。`--poll-interval` 必须大于零。

<Note>当您希望手动命令仅在作业当前到期时才运行时，请使用 `--due`。如果 `--due --wait` 未将运行排队，则该命令返回正常的非运行响应，而不是进行轮询。</Note>

## 模型

`cron add|edit --model <ref>` 为任务选择一个允许的模型。

<Warning>如果模型不被允许或无法解析，cron 将显式验证错误使运行失败，而不是回退到任务的代理或默认模型选择。</Warning>

Cron `--model` 是一个**任务主要配置**，而不是聊天会话 `/model` 覆盖。这意味着：

- 当所选任务模型失败时，配置的模型回退仍然适用。
- 每个任务的有效负载 `fallbacks` 在存在时将替换配置的回退列表。
- 空的每个任务回退列表（任务有效负载/API 中的 `fallbacks: []`）使 cron 运行变为严格模式。
- 当任务有 `--model` 但未配置回退列表时，OpenClaw 会传递一个显式的空回退覆盖，以便代理主模型不会作为隐藏的重试目标被附加。

`openclaw doctor` 报告已设置 `payload.model` 的任务，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况。当实时聊天和计划任务之间的身份验证、提供商或计费行为看起来不同时，请使用该检查。

### 隔离的 Cron 模型优先级

隔离的 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 每个任务的 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

隔离的 cron 快速模式遵循解析的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前为活动运行持久化切换的提供商和模型（以及切换的身份验证配置文件覆盖（如果存在））。外部重试循环在初始尝试后限制为两次切换重试，然后中止而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

隔离的 cron 运行会抑制过时的仅确认回复。如果第一个结果只是临时状态更新，且没有后代子代理运行负责最终答案，cron 会在交付前针对真实结果重新提示一次。

### 静默令牌抑制

如果隔离的 cron 运行仅返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 将抑制直接出站交付和回退队列摘要路径，因此不会回发任何内容到聊天。

### 结构化拒绝

隔离的 cron 运行首选来自嵌入运行的结构化执行拒绝元数据，然后回退到最终输出中的已知拒绝标记，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和审批绑定拒绝短语。

`cron list` 和运行历史会显示拒绝原因，而不是将被阻止的命令报告为 `ok`。

## 保留

保留和清理在配置中控制：

- `cron.sessionRetention`（默认 `24h`）清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>如果您拥有当前交付和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会标准化旧版 cron 字段（`jobId`、`schedule.cron`、包括旧版 `threadId` 的顶级交付字段、payload `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 交付。</Note>

## 常见编辑

更新交付设置而不更改消息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

禁用隔离作业的交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

公告到特定渠道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

公告到 Telegram 论坛主题：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建具有轻量级引导上下文的隔离作业：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的 agent-turn 任务。对于 cron 运行，轻量级模式会使 bootstrap 上下文保持为空，而不是注入完整的工作区 bootstrap 集。

## 常用管理命令

手动运行和检查：

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron get <job-id>
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron run <job-id> --wait --wait-timeout 10m
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
openclaw cron runs --id <job-id> --limit 50
openclaw cron runs --id <job-id> --run-id <run-id>
```

`openclaw cron list` 默认显示所有匹配的任务。传递 `--agent <id>` 以仅显示有效标准化 agent id 匹配的任务；没有存储 agent id 的任务计为配置的默认 agent。

`openclaw cron get <job-id>` 直接返回存储的任务 JSON。当您需要具有交付路由预览的可读视图时，请使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 在每个任务上包含一个顶级的 `status` 字段，该字段根据 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算得出。值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。这反映了可读的状态列，以便外部工具可以读取任务状态而无需重新推导。

`cron runs` 条目包含交付诊断信息，其中包括预期的 cron 目标、解析的目标、消息工具发送、回退使用以及已交付状态。

Agent 和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

当在 agent-turn 任务中省略 `--agent` 时，`openclaw cron add` 会发出警告并回退到默认 agent (`main`)。在创建时传递 `--agent <id>` 以固定特定的 agent。

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](CLI/en/cli)
- [计划任务](/zh/automation/cron-jobs)
