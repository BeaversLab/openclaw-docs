---
summary: "CLICLI 参考，用于 `openclaw cron`（调度和运行后台任务）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway(网关) 网关 调度器的 cron 作业。

<Tip>运行 `openclaw cron --help` 以查看完整的命令界面。请参阅 [Cron jobs](/zh/automation/cron-jobs) 了解概念指南。</Tip>

## Sessions

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="会话密钥">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建新的记录和会话 ID。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到显式的持久会话密钥。

  </Accordion>
  <Accordion title="隔离会话语义">
    隔离运行会重置环境对话上下文。渠道和组路由、发送/队列策略、提升、来源和 ACP 运行时绑定都会为新运行重置。安全首选项和显式用户选择的模型或身份验证覆盖可以跨运行保留。
  </Accordion>
</AccordionGroup>

## Delivery

`openclaw cron list` 和 `openclaw cron show <job-id>` 预览解析后的交付路由。对于 `channel: "last"`，预览会显示路由是解析自主会话还是当前会话，或者是否将失败关闭。

提供商标记的目标可以消除未解析公告渠道的歧义。例如，当 `delivery.channel` 被省略或 `last` 时，`to: "telegram:123"`Telegram 选择 Telegram。只有已加载插件通告的前缀才是提供商标识符。如果 `delivery.channel` 是显式的，则前缀必须与该渠道匹配；带有 `to: "telegram:123"` 的 `channel: "whatsapp"` 将被拒绝。服务前缀（如 `imessage:` 和 `sms:`）仍然是渠道拥有的目标语法。

<Note>隔离的 `cron add` 作业默认为 `--announce` 投递。使用 `--no-deliver` 以将输出保留在内部。`--deliver` 保留为 `--announce` 的已弃用别名。</Note>

### 投递所有权

隔离的 cron 聊天投递在代理和运行器之间共享：

- 当聊天路由可用时，代理可以使用 `message` 工具直接发送。
- 仅当代理未直接向解析的目标发送时，`announce` 才会回退投递最终回复。
- `webhook` 将完成的有效负载发布到 URL。
- `none` 禁用运行器回退投递。

`--announce` 是针对最终回复的运行器回退投递。`--no-deliver` 禁用该回退，但在聊天路由可用时不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天投递目标，以便进行回退通知投递。内部会话密钥可能是小写的；不要将它们用作区分大小写的提供商 ID（例如 Matrix 房间 ID）的事实来源。

### 失败投递

失败通知按以下顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主要通知目标（当未设置显式失败目标时）。

<Note>主会话作业只有在主要投递模式为 `webhook` 时才能使用 `delivery.failureDestination`。隔离作业在所有模式下都接受它。</Note>

注意：隔离的 cron 运行会将运行级代理失败视为作业错误，即使没有生成回复负载，因此模型/提供商失败仍会增加错误计数器并触发失败通知。

## 调度

### 一次性作业

`--at <datetime>` 安排一次性运行。除非您还传递 `--tz <iana>`，否则无偏移量的日期时间将被视为 UTC，后者会在给定的时区中解释挂钟时间。

<Note>一次性作业在成功后默认会被删除。使用 `--keep-after-run` 来保留它们。</Note>

### 周期性作业

重复性作业在连续错误后使用指数退避重试：30秒、1分钟、5分钟、15分钟、60分钟。在下次成功运行后，调度恢复正常。

跳过的运行与执行错误分开跟踪。它们不影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以选择让失败警报接收重复的跳过运行通知。

对于针对本地配置的模型提供商的隔离作业，cron 在启动代理轮次之前运行轻量级的提供商预检。环回、私有网络和 `.local` `api: "ollama"` 提供商在 `/api/tags` 处进行探测；本地 OpenAI 兼容的提供商（如 vLLM、SGLang 和 LM Studio）在 `/models` 处进行探测。如果端点不可达，该运行将被记录为 `skipped` 并在稍后的调度中重试；匹配的死端点将被缓存 5 分钟，以避免许多作业同时锤击同一个本地服务器。

注意：cron 作业定义存在于 `jobs.json` 中，而挂起的运行时状态存在于 `jobs-state.json` 中。如果 `jobs.json` 被外部编辑，Gateway(网关) 将重新加载更改的调度并清除过期的挂起槽位；仅格式化的重写不会清除挂起槽位。

### 手动运行

`openclaw cron run` 在手动运行排队后立即返回。成功的响应包含 `{ ok: true, enqueued: true, runId }`。使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

<Note>
`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 以保留旧的“仅在到期时运行”行为。
</Note>

## 模型

`cron add|edit --model <ref>` 为作业选择一个允许的模型。

<Warning>如果模型不被允许或无法解析，cron 将显式验证错误使运行失败，而不是回退到作业的代理或默认模型选择。</Warning>

Cron `--model` 是 **作业主要** 设置，而不是会话 `/model` 覆盖。这意味着：

- 当选定的作业模型失败时，配置的模型回退仍然适用。
- 当存在时，每个作业的有效负载 `fallbacks` 会替换已配置的回退列表。
- 空的每作业回退列表（作业有效负载/API 中的 `fallbacks: []`）会使 cron 以严格模式运行。
- 当作业具有 `--model` 但未配置回退列表时，OpenClaw 会传递一个显式的空回退覆盖，这样代理主节点就不会作为隐藏的重试目标被附加。

### 隔离的 cron 模型优先级

隔离的 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 每个作业的 `--model`。
3. 存储的 cron 会话模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

隔离的 cron 快速模式遵循解析后的实时模型选择。默认情况下应用模型配置 `params.fastMode`，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前为活动运行持久化切换后的提供商和模型（以及切换后的身份验证配置文件覆盖，如果存在）。外部重试循环在初始尝试后限制为两次切换重试，然后中止而不是无限循环。

## 运行输出和拒绝

### 过期确认抑制

隔离的 cron 会抑制仅包含过期确认的回复。如果第一个结果只是一个临时的状态更新，并且没有后代子代理运行对最终答案负责，cron 会在交付前重新提示一次以获取真实结果。

### 静默令牌抑制

如果隔离的 cron 运行仅返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 会抑制直接出站交付和回退队列摘要路径，因此不会将任何内容发布回聊天。

### 结构化拒绝

隔离的 cron 运行优先使用来自嵌入运行的结构化执行拒绝元数据，然后回退到最终输出中的已知拒绝标记，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 和批准绑定拒绝短语。

`cron list` 和运行历史会显示拒绝原因，而不是将阻止的命令报告为 `ok`。

## 保留

保留和清理在配置中控制：

- `cron.sessionRetention`（默认 `24h`）清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>如果您拥有当前交付和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧的 cron 字段（`jobId`、`schedule.cron`、包括旧的 `threadId` 在内的顶级交付字段、payload `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 交付。</Note>

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

向特定渠道发布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

向 Telegram 论坛主题发布：

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

`--light-context` 仅适用于隔离的代理轮次作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

## 常见管理命令

手动运行和检查：

```bash
openclaw cron list
openclaw cron list --agent ops
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`openclaw cron list` 默认显示所有匹配的作业。传递 `--agent <id>` 以仅显示有效规范化代理 ID 匹配的作业；没有存储代理 ID 的作业计为配置的默认代理。

`cron list --json` 和 `cron show <job-id> --json` 在每个作业上包含一个顶级 `status` 字段，该字段根据 `enabled`、`state.runningAtMs` 和 `state.lastRunStatus` 计算。值包括：`disabled`、`running`、`ok`、`error`、`skipped` 或 `idle`。这反映了人类可读的状态列，以便外部工具可以在不重新推导的情况下读取作业状态。

`cron runs` 条目包含传递诊断信息，包括预期的 cron 目标、解析后的目标、message-工具 发送、回退使用情况以及传递状态。

代理和会话重新定位：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

如果在代理轮次作业中省略 `--agent`，`openclaw cron add` 会发出警告并回退到默认代理（`main`）。在创建时传递 `--agent <id>` 以固定特定代理。

传递调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](/zh/cli)
- [计划任务](/zh/automation/cron-jobs)
