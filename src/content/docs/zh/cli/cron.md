---
summary: "CLICLI 参考文档 `openclaw cron`（调度和运行后台任务）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway(网关) 网关 调度器的 cron 作业。

<Tip>运行 `openclaw cron --help` 以查看完整的命令界面。有关概念指南，请参阅 [Cron jobs](/zh/automation/cron-jobs)。</Tip>

## 快速创建任务

`openclaw cron create` 是 `openclaw cron add` 的别名。对于新任务，请先输入调度时间，再输入提示词：

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Morning brief" \
  --agent ops
```

当任务应该 POST 完成的有效载荷而不是交付到聊天目标时，请使用 `--webhook <url>`：

```bash
openclaw cron create "0 18 * * 1-5" \
  "Summarize today's deploys as JSON." \
  --name "Deploy digest" \
  --webhook "https://example.invalid/openclaw/cron"
```

## 会话

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="会话密钥">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建新的记录和会话 ID。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到显式的持久会话密钥。

  </Accordion>
  <Accordion title="隔离会话语义">
    隔离运行会重置环境对话上下文。通道和组路由、发送/排队策略、提升、来源和 ACP 运行时绑定都会为新运行重置。安全首选项以及显式用户选择的模型或身份验证覆盖可以在运行之间传递。
  </Accordion>
</AccordionGroup>

## 交付

`openclaw cron list` 和 `openclaw cron show <job-id>` 预览已解析的交付路由。对于 `channel: "last"`，预览显示路由是从主会话还是当前会话解析的，或者是否将失败关闭。

带提供商前缀的目标可以消除未解析的通告渠道的歧义。例如，当省略 `delivery.channel` 或其为 `last` 时，`to: "telegram:123"` 会选择 Telegram。只有已加载插件通告的前缀才是提供商选择器。如果 `delivery.channel` 是显式的，则前缀必须与该渠道匹配；带有 `to: "telegram:123"` 的 `channel: "whatsapp"` 将被拒绝。诸如 `imessage:` 和 `sms:` 之类的服务前缀仍然是渠道拥有的目标语法。

<Note>隔离的 `cron add` 作业默认为 `--announce` 投递。使用 `--no-deliver` 将输出保持在内部。`--deliver` 保留为 `--announce` 的已弃用别名。</Note>

### 投递所有权

隔离的 cron 聊天投递在代理和运行器之间共享：

- 当聊天路由可用时，代理可以使用 `message` 工具直接发送。
- 仅当代理未直接发送到解析的目标时，`announce` 才会回退投递最终回复。
- `webhook` 将完成的负载发布到 URL。
- `none` 禁用运行器回退投递。

使用 `cron add|create --webhook <url>` 或 `cron edit <job-id> --webhook <url>` 设置 webhook 投递。请勿将 `--webhook` 与聊天投递标志（例如 `--announce`、`--no-deliver`、`--channel`、`--to`、`--thread-id` 或 `--account`）结合使用。

`--announce` 是针对最终回复的运行器回退投递。`--no-deliver` 禁用该回退，但在聊天路由可用时不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标以用于回退通告投递。内部会话密钥可能为小写；请勿将它们用作区分大小写的提供商 ID（例如 Matrix 房间 ID）的事实来源。

### 失败投递

失败通知按以下顺序解析：

1. `delivery.failureDestination` 在作业上。
2. 全局 `cron.failureDestination`。
3. 作业的主要通知目标（当未设置显式失败目标时）。

<Note>主会话作业仅当主要传递模式为 `webhook` 时才可使用 `delivery.failureDestination`。隔离作业在所有模式下均接受它。</Note>

注意：即使没有产生回复载荷，隔离的 cron 运行也会将运行级别的代理失败视为作业错误，因此模型/提供商失败仍然会增加错误计数器并触发失败通知。

如果隔离运行在第一次模型请求之前超时，`openclaw cron show` 和 `openclaw cron runs` 将包含特定阶段的错误，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`CLICLICLI。
对于由 CLI 支持的提供商，模型前监视程序会一直保持活动状态，直到外部 CLI 轮次开始，因此会话查找、挂钩、身份验证、提示和 CLI 设置停滞都会被报告为模型前 cron 失败。

## 调度

### 一次性作业

`--at <datetime>` 安排一次一次性运行。除非您还传递 `--tz <iana>`，否则无偏移量的日期时间将被视为 UTC，后者会将挂钟时间解释为给定时区中的时间。

<Note>一次性作业默认在成功后删除。使用 `--keep-after-run` 来保留它们。</Note>

### 循环作业

循环作业在连续错误后使用指数退避重试：30秒、1分钟、5分钟、15分钟、60分钟。在下一次成功运行后，调度恢复正常。

跳过的运行与执行错误分开跟踪。它们不会影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以选择将失败警报加入重复的跳过运行通知中。

对于针对本地配置的模型提供商的隔离作业，cron 在启动代理轮次之前会运行轻量级的提供商预检。Loopback、私有网络和 `.local` `api: "ollama"` 提供商在 `/api/tags`OpenAI 处被探测；本地 OpenAI 兼容的提供商（如 vLLM、SGLang 和 LM Studio）在 `/models` 处被探测。如果端点不可达，运行将被记录为 `skipped` 并在稍后的计划中重试；匹配的死端点将被缓存 5 分钟，以避免许多作业冲击同一个本地服务器。

注意：cron 作业定义位于 `jobs.json` 中，而挂起的运行时状态位于 `jobs-state.json` 中。如果 `jobs.json`Gateway(网关) 在外部被编辑，Gateway(网关) 将重新加载已更改的计划并清除过期的挂起槽位；仅格式化的重写不会清除挂起槽位。格式错误的作业行在将其原始内容复制到 `jobs-quarantine.json` 后，会在加载时从活动的 `jobs.json` 中删除。

### 手动运行

`openclaw cron run <job-id>` 默认强制运行并在手动运行排队后立即返回。成功的响应包含 `{ ok: true, enqueued: true, runId }`。使用返回的 `runId` 来检查后续结果：

```bash
openclaw cron run <job-id>
openclaw cron runs --id <job-id> --run-id <run-id>
```

当脚本应该阻塞，直到那个特定的排队运行记录了终止状态时，请添加 `--wait`：

```bash
openclaw cron run <job-id> --wait --wait-timeout 10m --poll-interval 2s
```

使用 `--wait`CLI 时，CLI 仍然首先调用 `cron.run`，然后针对返回的 `runId` 轮询 `cron.runs`。仅当运行以 `ok` 状态完成时，该命令才以 `0` 退出。当运行以 `error` 或 `skipped`Gateway(网关) 完成、当 Gateway(网关) 响应不包含 `runId`，或当 `--wait-timeout` 过期时，它以非零值退出。`--poll-interval` 必须大于零。

<Note>当您希望手动命令仅在作业当前到期时运行时，请使用 `--due`。如果 `--due --wait` 未将运行加入队列，该命令将返回正常的非运行响应，而不是轮询。</Note>

## 模型

`cron add|edit --model <ref>` 为作业选择一个允许的模型。

<Warning>如果模型不被允许或无法解析，cron 将以显式验证错误使运行失败，而不是回退到作业的代理或默认模型选择。</Warning>

Cron `--model` 是一个**作业主选项**，而不是聊天会话 `/model` 覆盖。这意味着：

- 当所选的作业模型失败时，配置的模型回退仍然适用。
- 每个作业的有效负载 `fallbacks` 在存在时会替换配置的回退列表。
- 空的每个作业回退列表（作业负载/API 中的 `fallbacks: []`）会使 cron 运行变得严格。
- 当作业具有 `--model` 但未配置回退列表时，OpenClaw 会传递一个显式的空回退覆盖，以便代理主选项不会作为隐藏的重试目标被附加。
- 本地提供商的预检检查会在将 cron 运行标记为 `skipped` 之前遍历配置的回退。

`openclaw doctor` 会报告已经设置了 `payload.model` 的作业，包括提供商命名空间计数以及与 `agents.defaults.model` 的不匹配情况。当实时聊天和计划作业之间的身份验证、提供商或计费行为看起来不同时，请使用该检查。

### 隔离的 cron 模型优先级

隔离的 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 每个作业的 `--model`。
3. 存储的 cron-会话 模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

隔离的 cron 快速模式遵循解析后的实时模型选择。模型配置 `params.fastMode` 默认适用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试前为活动运行持久化已切换的提供商和模型（如果存在，还包括已切换的身份验证配置文件覆盖）。外部重试循环在初始尝试后限制为两次切换重试，然后中止而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

隔离 cron 运行会抑制仅包含过时确认的回复。如果第一个结果只是临时状态更新，且没有后代子代理运行负责最终答案，cron 会在交付前重新提示一次以获取真实结果。

### 静默令牌抑制

如果隔离 cron 运行仅返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 会抑制直接出站交付和回退队列摘要路径，因此不会将任何内容回发到聊天中。

### 结构化拒绝

隔离 cron 运行使用来自嵌入运行的结构化执行拒绝元数据作为权威拒绝信号。当嵌套的结构化错误消息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 开头时，它们还会遵守节点主机 `UNAVAILABLE` 包装器。

除非嵌入运行也提供结构化拒绝元数据，否则 cron 不会将最终输出的散文或看起来像审批的拒绝短语归类为拒绝，因此普通助手文本不会被视为被阻止的命令。

`cron list` 和运行历史会显示拒绝原因，而不是将被阻止的命令报告为 `ok`。

## 保留

保留和修剪在配置中控制：

- `cron.sessionRetention`（默认 `24h`）修剪已完成的隔离运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>如果您有来自当前交付和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧的 cron 字段（`jobId`、`schedule.cron`、包括旧的 `threadId` 在内的顶级交付字段、payload `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 交付。</Note>

## 常见编辑

更新交付设置而不更改消息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

禁用独立作业的交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为独立作业启用轻量级启动上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定渠道发布公告：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 论坛主题发布公告：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "-1001234567890" --thread-id 42
```

创建一个具有轻量级启动上下文的独立作业：

```bash
openclaw cron create "0 7 * * *" \
  "Summarize overnight updates." \
  --name "Lightweight morning brief" \
  --session isolated \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于独立的 agent-turn 作业。对于 cron 运行，轻量级模式使启动上下文保持为空，而不是注入完整的工作区启动集。

## 常见管理员命令

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

`openclaw cron list` 默认显示所有匹配的作业。传递 `--agent <id>` 以仅显示其有效规范化 agent id 匹配的作业；没有存储 agent id 的作业计入配置的默认 agent。

`openclaw cron get <job-id>` 直接返回存储的作业 JSON。当您需要包含交付路由预览的人类可读视图时，请使用 `cron show <job-id>`。

`cron list --json` 和 `cron show <job-id> --json` 在每个作业上包含一个顶级 `status` 字段，该字段根据 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算得出。取值：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。这反映了人类可读的状态列，以便外部工具可以读取作业状态而无需重新推导。

`cron runs` 条目包含传送诊断信息，其中包括预期的 cron 目标、解析后的目标、消息工具发送、回退使用情况以及已传送状态。

代理和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

当在代理轮次作业中省略 `--agent` 时，`openclaw cron add` 会发出警告并回退到默认代理 (`main`)。请在创建时传递 `--agent <id>` 以固定特定代理。

传送调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --webhook "https://example.invalid/openclaw/cron"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](CLI/en/cli)
- [计划任务](/zh/automation/cron-jobs)
