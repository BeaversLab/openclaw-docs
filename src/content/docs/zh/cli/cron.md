---
summary: "CLI 参考 for `openclaw cron`（调度和运行后台任务）"
read_when:
  - You want scheduled jobs and wakeups
  - You are debugging cron execution and logs
title: "Cron"
---

# `openclaw cron`

管理 Gateway(网关) 网关 调度器的 cron 作业。

<Tip>运行 `openclaw cron --help` 以查看完整的命令界面。有关概念指南，请参阅 [Cron jobs](/zh/automation/cron-jobs)。</Tip>

## Sessions

`--session` 接受 `main`、`isolated`、`current` 或 `session:<id>`。

<AccordionGroup>
  <Accordion title="Session keys">
    - `main` 绑定到代理的主会话。
    - `isolated` 为每次运行创建新的对话记录和会话 ID。
    - `current` 绑定到创建时的活动会话。
    - `session:<id>` 固定到显式的持久会话密钥。
  </Accordion>
  <Accordion title="Isolated 会话 semantics">
    隔离运行会重置环境对话上下文。渠道和组路由、发送/队列策略、升级、来源和 ACP 运行时绑定都会为新的运行进行重置。安全首选项和显式用户选择的模型或身份验证覆盖可以在运行之间保留。
  </Accordion>
</AccordionGroup>

## Delivery

`openclaw cron list` 和 `openclaw cron show <job-id>` 预览解析后的交付路由。对于 `channel: "last"`，预览显示路由是解析自主会话还是当前会话，或者将会失败关闭。

<Note>隔离的 `cron add` 任务默认为 `--announce` 交付。使用 `--no-deliver` 使输出保持在内部。`--deliver` 仍作为 `--announce` 的已弃用别名保留。</Note>

### Delivery ownership

隔离的 cron 聊天交付在代理和运行器之间共享：

- 当聊天路由可用时，代理可以使用 `message` 工具直接发送。
- `announce` 仅在代理未直接向解析目标发送时，才会回退交付最终回复。
- `webhook` 将完成的负载发布到 URL。
- `none` 禁用运行器回退传递。

`--announce` 是针对最终回复的运行器回退传递。`--no-deliver` 禁用该回退，但在存在聊天路由时不会移除代理的 `message` 工具。

从活动聊天创建的提醒会保留实时聊天传递目标，用于回退公告传递。内部会话键可能是小写的；请勿将其作为区分大小写的提供商 ID（如 Matrix 房间 ID）的真实来源。

### 失败传递

失败通知按以下顺序解析：

1. 作业上的 `delivery.failureDestination`。
2. 全局 `cron.failureDestination`。
3. 作业的主要公告目标（当未设置显式失败目标时）。

<Note>主会话作业仅在主要传递模式为 `webhook` 时才能使用 `delivery.failureDestination`。隔离作业在所有模式下均接受它。</Note>

注意：隔离的 cron 运行将运行级代理失败视为作业错误，即使未产生回复负载也是如此，因此模型/提供商的失败仍会增加错误计数器并触发失败通知。

## 调度

### 单次作业

`--at <datetime>` 调度单次运行。无偏移的日期时间被视为 UTC，除非您还传递了 `--tz <iana>`，它会将挂钟时间解释为给定时区中的时间。

<Note>单次作业在成功后默认会被删除。使用 `--keep-after-run` 来保留它们。</Note>

### 循环作业

循环作业在连续错误后使用指数重试退避：30s、1m、5m、15m、60m。在下次成功运行后，调度恢复正常。

跳过的运行与执行错误分开跟踪。它们不影响重试退避，但 `openclaw cron edit <job-id> --failure-alert-include-skipped` 可以选择让失败警报接收重复的跳过运行通知。

注意：cron 作业定义位于 `jobs.json` 中，而挂起的运行时状态位于 `jobs-state.json` 中。如果 `jobs.json` 被外部编辑，Gateway(网关) 会重新加载更改的调度并清除过期的挂起时段；仅格式化的重写不会清除挂起时段。

### 手动运行

`openclaw cron run` 在手动运行排队后立即返回。成功的响应包括 `{ ok: true, enqueued: true, runId }`。使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

<Note>
`openclaw cron run <job-id>` 默认强制运行。使用 `--due` 以保留旧的“仅在到期时运行”行为。
</Note>

## 模型

`cron add|edit --model <ref>` 为作业选择一个允许的模型。

<Warning>如果模型不被允许，cron 会发出警告并回退到作业的代理或默认模型选择。配置的回退链仍然适用，但没有明确按作业回退列表的简单模型覆盖不再将代理主要模型作为隐藏的额外重试目标附加。</Warning>

### 隔离 cron 模型优先级

隔离 cron 按以下顺序解析活动模型：

1. Gmail-hook 覆盖。
2. 按作业 `--model`。
3. 存储的 cron-会话 模型覆盖（当用户选择了一个时）。
4. 代理或默认模型选择。

### 快速模式

隔离 cron 快速模式遵循解析的实时模型选择。模型配置 `params.fastMode` 默认应用，但存储的会话 `fastMode` 覆盖仍然优先于配置。

### 实时模型切换重试

如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在重试之前为活动运行持久化切换的提供商和模型（以及存在的切换认证配置文件覆盖）。外部重试循环在初始尝试后限制为两次切换重试，然后中止而不是无限循环。

## 运行输出和拒绝

### 过时确认抑制

隔离 cron 开启抑制过时仅确认回复。如果第一个结果只是临时状态更新，并且没有后代子代理运行对最终答案负责，cron 会在交付前再次提示以获取真实结果。

### 静默令牌抑制

如果隔离 cron 运行仅返回静默令牌（`NO_REPLY` 或 `no_reply`），cron 会抑制直接出站交付和回退队列摘要路径，因此不会发布任何内容回聊天。

### 结构化拒绝

独立的 cron 运行优先使用来自嵌入式运行的结构化执行拒绝元数据，然后回退到最终输出中的已知拒绝标记，例如 `SYSTEM_RUN_DENIED`、`INVALID_REQUEST` 以及批准绑定拒绝短语。

`cron list` 和运行历史记录会显示拒绝原因，而不是将被阻止的命令报告为 `ok`。

## 保留

保留和清理在配置中进行控制：

- `cron.sessionRetention`（默认为 `24h`）会清理已完成的独立运行会话。
- `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 会清理 `~/.openclaw/cron/runs/<jobId>.jsonl`。

## 迁移旧作业

<Note>如果您拥有来自当前交付和存储格式之前的 cron 作业，请运行 `openclaw doctor --fix`。Doctor 会规范化旧版 cron 字段（`jobId`、`schedule.cron`、包括旧版 `threadId` 的顶层交付字段、payload `provider` 交付别名），并在配置了 `cron.webhook` 时将简单的 `notify: true` webhook 回退作业迁移到显式 webhook 交付。</Note>

## 常见编辑

更新交付设置而不更改消息：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为独立作业禁用交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为独立作业启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

向特定渠道宣布：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

创建具有轻量级引导上下文的独立作业：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于独立的 agent-turn 作业。对于 cron 运行，轻量级模式保持引导上下文为空，而不是注入完整的工作区引导集。

## 常用管理命令

手动运行和检查：

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

`cron runs` 条目包含交付诊断信息，包括预期的 cron 目标、解析的目标、消息工具发送、回退使用以及已交付状态。

代理和会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

## 相关

- [CLI 参考](/zh/cli)
- [计划任务](/zh/automation/cron-jobs)
