---
summary: "Gateway(网关)调度器的计划作业、webhook 和 Gmail PubSub 触发器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "计划任务"
sidebarTitle: "计划任务"
---

Cron 是 Gateway(网关) 的内置调度器。它持久化作业，在正确的时间唤醒代理，并可以将输出发送回聊天渠道或 webhook 端点。

## 快速开始

<Steps>
  <Step title="添加一次性提醒">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="检查你的任务">
    ```bash
    openclaw cron list
    openclaw cron get <job-id>
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="查看运行历史">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Cron 的工作原理

- Cron 在 **Gateway(网关)** 进程内运行（不在模型内部）。
- 作业定义持久化存储在 `~/.openclaw/cron/jobs.json` 中，因此重启不会丢失计划。
- 运行时执行状态与它相邻持久化存储在 `~/.openclaw/cron/jobs-state.json` 中。如果你在 git 中跟踪 cron 定义，请跟踪 `jobs.json` 并将 `jobs-state.json` 加入 gitignore。
- 拆分后，较旧的 OpenClaw 版本可以读取 `jobs.json`，但可能会将作业视为新作业，因为运行时字段现在位于 `jobs-state.json` 中。
- 当 `jobs.json` 在 Gateway(网关) 运行或停止时被编辑，OpenClaw 会将更改的计划字段与挂起的运行时槽元数据进行比较，并清除过时的 `nextRunAtMs` 值。纯格式化或仅更改键顺序的重写会保留挂起的槽。
- 所有 cron 执行都会创建[后台任务](/zh/automation/tasks)记录。
- 在 Gateway(网关) 启动时，过期的隔离 agent-turn 作业会在渠道连接窗口之外重新调度，而不是立即重放，因此 Discord/Telegram 启动和本机命令设置在重启后保持响应。
- 一次性作业 (`--at`) 默认在成功后自动删除。
- 当运行完成时，隔离的 cron 会尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器标签/进程，因此分离的浏览器自动化不会留下孤立的进程。
- 接收受限 cron 自清理授权的隔离 cron 运行仍然可以读取调度器状态、其当前作业的自过滤列表以及该作业的运行历史，因此状态/心跳检查可以检查它们自己的调度，而不会获得更广泛的 cron 修改权限。
- 隔离的 cron 运行还会防止过时的确认回复。如果第一个结果只是一个临时状态更新 (`on it`、`pulling everything together` 和类似提示) 并且没有后代子代理运行仍然对最终答案负责，则 OpenClaw 会在交付前重新提示一次以获取实际结果。
- 隔离的 cron 运行优先使用来自嵌入运行的结构化执行拒绝元数据，然后回退到已知的最终摘要/输出标记（例如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`），因此被阻止的命令不会被报告为绿色运行。
- 隔离的 cron 运行还会将运行级别的代理失败视为作业错误，即使没有生成回复负载，因此模型/提供商失败会增加错误计数并触发失败通知，而不是将作业清除为成功。
- 当隔离的 agent-turn 作业达到 `timeoutSeconds` 时，cron 会中止底层代理运行并给它一个短暂的清理窗口。如果运行没有排空，Gateway(网关) 拥有的清理会在 cron 记录超时之前强制清除该运行的会话所有权，因此排队的聊天工作不会被留在陈旧的处理会话之后。
- 如果一个独立的 agent-turn 在运行程序启动之前或第一次模型调用之前停滞，cron 会记录一个特定阶段的超时，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。这些监视程序涵盖嵌入式提供商和 CLI 支持的提供商，直到它们的外部 CLI 进程实际启动为止，并且这些超时独立于较长的 `timeoutSeconds` 值进行限制，以便冷启动/身份验证/上下文故障能快速暴露，而不是等待完整的作业预算。

<a id="maintenance"></a>

<Note>
Cron 的任务协调首先由运行时拥有，其次由持久历史记录支持：只要 cron 运行时仍将该任务跟踪为正在运行，活动的 cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该任务并且 5 分钟的宽限期过期，维护程序将检查匹配的 `cron:<jobId>:<startedAt>` 运行的持久运行日志和作业状态。如果该持久历史记录显示最终结果，则任务账本将据此完成；否则，Gateway(网关) 拥有的维护可以将任务标记为 `lost`。离线 CLI 审计可以从持久历史记录中恢复，但它不会将其自己的空进程内活动作业集视为 Gateway(网关) 拥有的 cron 运行已消失的证明。
</Note>

## Schedule types

| Kind    | CLI 标志  | Description                                          |
| ------- | --------- | ---------------------------------------------------- |
| `at`    | `--at`    | One-shot timestamp (ISO 8601 or relative like `20m`) |
| `every` | `--every` | Fixed interval                                       |
| `cron`  | `--cron`  | 5字段或6字段的cron表达式，带有可选的 `--tz`          |

不带时区的时间戳将被视为UTC时间。添加 `--tz America/New_York` 以进行本地墙钟时间调度。

整点重复执行的 cron 表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定明确的时间窗口。

### 月份中的日期和星期中的日期使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当日期（day-of-month）和星期（day-of-week）字段均为非通配符时，croner 在**任一**字段匹配时即匹配，而不需要两者同时匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这会每月触发约 5-6 次，而不是每月 0-1 次。OpenClaw 在此处使用 Croner 的默认 OR 行为。若要求两个条件同时满足，请使用 Croner 的 `+` 星期中的日期修饰符（`0 9 15 * +1`），或者在一个字段上调度并在任务的提示或命令中守卫另一个字段。

## 执行风格

| 风格       | `--session` 值      | 运行于                | 最适用于               |
| ---------- | ------------------- | --------------------- | ---------------------- |
| 主会话     | `main`              | 下一次心跳轮次        | 提醒、系统事件         |
| 隔离       | `isolated`          | 专用的 `cron:<jobId>` | 报告、后台杂务         |
| 当前会话   | `current`           | 在创建时绑定          | 上下文感知的重复性工作 |
| 自定义会话 | `session:custom-id` | 持久的命名会话        | 基于历史记录的工作流   |

<AccordionGroup>
  <Accordion title="主会话 vs 隔离 vs 自定义">
    **主会话** 任务将系统事件加入队列，并可选择唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。这些系统事件不会延长目标会话的每日/空闲重置新鲜度。**隔离** 任务使用全新会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在多次运行之间持久化上下文，从而实现基于先前摘要的每日站会等工作流。
  </Accordion>
  <Accordion title="“全新会话”对于隔离任务意味着什么">
    对于隔离任务，“全新会话”意味着每次运行都有新的记录/会话 ID。OpenClaw可能会携带安全的首选项，例如思考/快速/详细设置、标签和用户明确选择的模型/身份验证覆盖，但它不会从旧的 cron 行继承环境会话上下文：渠道/组路由、发送或排队策略、提升、来源或 ACP 运行时绑定。当周期性任务应有意识地建立在同一会话上下文之上时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="运行时清理">
    对于隔离任务，运行时拆卸现在包括针对该 cron 会话的最佳浏览器清理。清理失败将被忽略，以便实际的 cron 结果仍然优先。

    隔离的 cron 运行还会通过共享的运行时清理路径释放为该作业创建的所有捆绑 MCP 运行时实例。这与主会话和自定义会话 MCP 客户端的拆除方式相匹配，因此隔离的 cron 任务不会在运行之间泄漏 stdio 子进程或长期存在的 MCP 连接。

  </Accordion>
  <Accordion title="子代理和 Discord 交付">
    当隔离的 cron 运行编排子代理时，交付也更倾向于使用最终后代输出，而不是过时的父级中间文本。如果后代仍在运行，OpenClaw将抑制该部分父级更新，而不是宣布它。

    对于纯文本 Discord 通知目标，OpenClaw将发送一次规范的最终助手文本，而不是重放流式/中间文本负载和最终答案。媒体和结构化 Discord 负载仍作为单独的负载交付，因此附件和组件不会丢失。

  </Accordion>
</AccordionGroup>

### 隔离任务的负载选项

<ParamField path="--message" type="string" required>
  提示文本（独立任务所必需）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；使用任务选定允许的模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考级别覆盖。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳过工作区引导文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制任务可以使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用选定的允许模型作为该任务的主要模型。这与会话会话的 `/model` 覆盖不同：当任务主要模型失败时，配置的回退链仍然适用。如果请求的模型不被允许或无法解析，cron 将使运行失败并显示明确的验证错误，而不是静默回退到任务的代理/默认模型选择。

Cron 任务还可以携带有效负载级别的 `fallbacks`。如果存在该列表，它将替换任务的已配置回退链。当你想要一个仅尝试选定模型的严格 cron 运行时，请在任务有效负载/API 中使用 `fallbacks: []`。如果一个任务有 `--model` 但既没有有效负载也没有配置回退，OpenClaw 将传递一个明确的空回退覆盖，这样代理主模型就不会被附加为隐藏的额外重试目标。

独立任务的模型选择优先级为：

1. Gmail 钩子模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 每个任务的有效负载 `model`
3. 用户选择的存储的 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析后的实时选择。如果选定的模型配置具有 `params.fastMode`，独立 cron 默认使用它。存储的会话 `fastMode` 覆盖在任一方向上仍然优先于配置。

如果隔离运行遇到实时模型切换切换，cron 将使用切换后的提供商/模型进行重试，并在重试前为当前运行持久化该实时选择。当切换还包含新的身份验证配置文件时，cron 也会为当前运行持久化该身份验证配置文件覆盖。重试是有限制的：在初始尝试加上 2 次切换重试后，cron 将中止而不是无限循环。

在隔离的 cron 运行进入代理运行器之前，OpenClaw 会检查已配置的 OpenClaw`api: "ollama"` 和 `api: "openai-completions"` 提供商的可访问本地提供商端点，这些提供商的 `baseUrl` 是环回、私有网络或 `.local`。如果该端点已关闭，该运行将被记录为 `skipped`Ollama 并带有明确的提供商/模型错误，而不是启动模型调用。端点结果会缓存 5 分钟，因此许多使用同一失效本地 Ollama、vLLM、SGLang 或 LM Studio 服务器的到期作业将共享一次小型探测，而不是创建请求风暴。跳过的提供商预检运行不会增加执行错误退避；当您需要重复的跳过通知时，请启用 `failureAlert.includeSkipped`。

## 交付和输出

| 模式       | 发生的情况                                 |
| ---------- | ------------------------------------------ |
| `announce` | 如果代理未发送，则回退将最终文本传递到目标 |
| `webhook`  | 将完成的事件负载 POST 到 URL               |
| `none`     | 无运行器回退交付                           |

使用 `--announce --channel telegram --to "-1001234567890"`Telegram 进行渠道交付。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`RPC；直接 RPC/配置调用者也可以将 `delivery.threadId`SlackDiscordMattermost 作为字符串或数字传递。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`Matrix）。Matrix 房间 ID 区分大小写；请使用准确的房间 ID 或来自 Matrix 的 `room:!room:server`Matrix 格式。

当公告交付使用 `channel: "last"` 或省略 `channel` 时，带有提供商前缀的目标（如 `telegram:123`）可以在 cron 回退到会话历史或单个配置的渠道之前选择渠道。只有已加载插件通告的前缀才是提供商选择器。如果 `delivery.channel` 是显式的，则目标前缀必须命名相同的提供商；例如，`channel: "whatsapp"` 配合 `to: "telegram:123"` 会被拒绝，而不是让 WhatsApp 将 Telegram ID 解释为电话号码。目标类型和服务前缀（如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`）仍然是渠道拥有的目标语法，而不是提供商选择器。

对于隔离任务，聊天交付是共享的。如果聊天路由可用，即使任务使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到配置的/当前目标，OpenClaw 会跳过回退公告。否则，`announce`、`webhook` 和 `none` 仅控制运行器在代理轮次之后对最终回复的处理。

当代理从活跃聊天中创建隔离提醒时，OpenClaw 会存储保留的实时交付目标用于回退公告路由。内部会话密钥可能是小写的；当当前聊天上下文可用时，提供商交付目标不会从这些密钥重建。

隐式公告交付使用配置的渠道允许列表来验证和重新路由过时的目标。私信配对存储批准不是回退自动化接收者；当计划任务应主动发送到私信时，请设置 `delivery.to` 或配置渠道 `allowFrom` 条目。

故障通知遵循单独的目标路径：

- `cron.failureDestination` 为故障通知设置全局默认值。
- `job.delivery.failureDestination` 会为每个任务覆盖该设置。
- 如果两者均未设置，且作业已通过 `announce` 进行交付，失败通知现在将回退到该主要公告目标。
- 除非主要交付模式为 `webhook`，否则 `delivery.failureDestination` 仅受 `sessionTarget="isolated"` 作业支持。
- `failureAlert.includeSkipped: true` 使作业或全局 cron 警报策略选择接收重复的跳过运行警报。跳过的运行保持单独的连续跳过计数器，因此它们不会影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="单次提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="周期性隔离作业">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型和思维覆盖">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway(网关) 可以暴露 HTTP webhook 端点以供外部触发器使用。请在配置中启用：

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

- `Authorization: Bearer <token>` (推荐)
- `x-openclaw-token: <token>`

拒绝查询字符串 token。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    将系统事件加入主会话的队列：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"New email received","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      事件描述。
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` 或 `next-heartbeat`。
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    运行一个隔离的 agent 轮次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="映射的 Hooks (POST /hooks/<name>)">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意 payload 转换为 `wake` 或 `agent` 操作。
  </Accordion>
</AccordionGroup>

<Warning>
将 hook 端点保留在 loopback、tailnet 或可信的反向代理之后。

- 使用专用的 hook token；不要复用 Gateway auth tokens。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 路由。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要调用方选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，请同时设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- Hook payloads 默认被安全边界包裹。

</Warning>

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

<Note>**先决条件：** `gcloud` CLI、`gog` (gogcli)、已启用 OpenClaw hooks、用于公共 HTTPS 端点的 Tailscale。</Note>

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当 `hooks.enabled=true` 和 `hooks.gmail.account`Gateway(网关) 被设置时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续订监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

<Steps>
  <Step title="GCP选择 GCP 项目"GCPOAuth>
    选择拥有 `gog` 使用的 OAuth 客户端的 GCP 项目：

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="创建主题并授予 Gmail 推送访问权限">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="启动监视">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

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

# Get one stored job as JSON
openclaw cron get <jobId>

# Show one job, including resolved delivery route
openclaw cron show <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Force run a job now and wait for its terminal status
openclaw cron run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# View one exact run
openclaw cron runs --id <jobId> --run-id <runId>

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` 在将手动运行加入队列后返回。将 `--wait` 用于关闭挂钩、维护脚本或其他必须阻塞直到排队运行完成的自动化任务。等待模式会轮询确切返回的 `runId`；对于状态 `ok`，它以 `0` 退出，对于 `error`、`skipped` 或等待超时，它以非零值退出。

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 更改作业的选定模型。
- 如果允许该模型，则该确切的提供商/模型将到达隔离的代理运行。
- 如果不允许或无法解析，cron 将使运行失败，并显示明确的验证错误。
- 配置的回退链仍然适用，因为 cron `--model` 是作业主要设置，而不是会话 `/model` 覆盖。
- 有效负载 `fallbacks` 替换该作业的配置回退；`fallbacks: []` 禁用回退并使运行变为严格模式。
- 没有显式或配置回退列表的纯 `--model` 不会静默地将代理主要设置作为额外的重试目标进行回退。

</Note>

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

`maxConcurrentRuns` 同时限制计划的 cron 调度和隔离的代理轮次执行。隔离的 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此增加此值允许独立的 cron LLM 运行并行进行，而不仅仅是启动它们的外部 cron 包装器。共享的非 cron `nested` 通道不会通过此设置加宽。

运行状态侧边栏源自 `cron.store`：例如 `~/clawd/cron/jobs.json` 这样的 `.json` 存储会使用 `~/clawd/cron/jobs-state.json`，而没有 `.json` 后缀的存储路径会附加 `-state.json`。

如果你手动编辑 `jobs.json`，请将 `jobs-state.json`OpenClaw 排除在源代码管理之外。OpenClaw 使用该侧边栏来处理待定插槽、活动标记、上次运行的元数据，以及告知调度器何时需要为外部编辑的作业生成新的 `nextRunAtMs` 的调度标识。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久错误会立即禁用。

    **循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。下次成功运行后，退避时间会重置。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认 `24h`）会清理隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动清理运行日志文件。
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron 未触发">
    - 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON`Gateway(网关) 环境变量。
    - 确认 Gateway(网关) 正在持续运行。
    - 对于 `cron` 调度，请验证时区（`--tz`）与主机时区是否一致。
    - 运行输出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 检查了手动运行，但作业尚未到期。

  </Accordion>
  <Accordion title="Cron fired but no delivery">
    - 投递模式 `none` 意味着不预期会有运行器回退发送。当聊天路由可用时，代理仍可使用 `message` 工具直接发送。
    - 投递目标缺失/无效 (`channel`/`to`Matrix) 意味着跳过了出站操作。
    - 对于 Matrix，带有小写 `delivery.to`Matrix 房间 ID 的复制或遗留任务可能会失败，因为 Matrix 房间 ID 区分大小写。请将任务编辑为 Matrix 中准确的 `!room:server` 或 `room:!room:server`Matrix 值。
    - 渠道认证错误 (`unauthorized`, `Forbidden`) 意味着投递被凭据阻止。
    - 如果隔离运行仅返回静默令牌 (`NO_REPLY` / `no_reply`OpenClaw)，OpenClaw 将抑制直接出站投递，并抑制回退队列摘要路径，因此不会向聊天回发任何内容。
    - 如果代理应该自行向用户发送消息，请检查任务是否具有可用路由 (`channel: "last"` 且有之前的聊天，或显式渠道/目标)。

  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - 每日和空闲重置的新鲜度并非基于 `updatedAt`；请参阅 [会话管理](/zh/concepts/session#session-lifecycle)。
    - Cron 唤醒、心跳运行、执行通知和网管维护可能会更新会话行以进行路由/状态更新，但它们不会延长 `sessionStartedAt` 或 `lastInteractionAt`OpenClaw。
    - 对于在这些字段存在之前创建的遗留行，如果文件仍然可用，OpenClaw 可以从记录 JSONL 会话标头中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的遗留空闲行使用该恢复的起始时间作为其空闲基线。

  </Accordion>
  <Accordion title="时区注意事项">
    - 不带 `--tz` 的 Cron 使用网关主机的时区。
    - 不带时区的 `at` 计划被视为 UTC。
    - Heartbeat `activeHours` 使用已配置的时区解析。

  </Accordion>
</AccordionGroup>

## 相关

- [自动化](/zh/automation) — 一目了然的所有自动化机制
- [后台任务](/zh/automation/tasks) — Cron 执行的任务分类账
- [Heartbeat](/zh/gateway/heartbeat) — 定期主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
