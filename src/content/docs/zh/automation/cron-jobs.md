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
  <Step title="检查你的作业">
    ```bash
    openclaw cron list
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
- 一次性作业（`--at`）默认在成功后自动删除。
- 隔离的 cron 运行会在运行完成后尽力为其 `cron:<jobId>` 会话关闭已跟踪的浏览器选项卡/进程，因此分离的浏览器自动化不会留下孤立的进程。
- 隔离的 cron 运行还可以防止过时的确认回复。如果第一个结果只是临时状态更新（`on it`、`pulling everything together` 和类似提示），并且没有后代子代理运行仍负责最终答案，OpenClaw 会在交付前针对实际结果重新提示一次。
- 隔离的 Cron 运行首选来自嵌入运行的结构化执行拒绝元数据，然后回退到已知的最终摘要/输出标记，如 `SYSTEM_RUN_DENIED` 和 `INVALID_REQUEST`，因此被阻止的命令不会被报告为绿色（成功）运行。
- 隔离的 Cron 运行还会将运行级别的代理故障视为作业错误，即使没有生成回复负载也是如此，因此模型/提供商故障会增加错误计数器并触发失败通知，而不是将作业清除为成功。

<a id="maintenance"></a>

<Note>
Cron 的任务协调首先由运行时拥有，其次由持久历史记录支持：只要 Cron 运行时仍然跟踪该作业正在运行，活动的 Cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业并且 5 分钟的宽限期到期，维护程序将检查持久化的运行日志和匹配 `cron:<jobId>:<startedAt>` 运行的作业状态。如果该持久历史记录显示终端结果，则任务账本将据此完成；否则 Gateway(网关) 拥有的维护程序可以将任务标记为 `lost`。离线 CLI 审计可以从持久历史记录中恢复，但它不会将其自己的空进程内活动作业集视为 Gateway(网关) 拥有的 Cron 运行已消失的证明。
</Note>

## 计划类型

| 类型    | CLI 标志  | 描述                                             |
| ------- | --------- | ------------------------------------------------ |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或类似 `20m` 的相对时间） |
| `every` | `--every` | 固定间隔                                         |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz`   |

没有时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟调度。

循环的整点表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式窗口。

### 月中和周日使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当“日期”和“星期”字段均非通配符时，croner 在 **任一** 字段匹配时即触发匹配——而非必须两者都匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每月触发约 5-6 次，而不是 0-1 次。OpenClaw 在此使用 Croner 的默认 OR 行为。若要求同时满足两个条件，请使用 Croner 的 `+` “星期”修饰符 (`0 9 15 * +1`)，或者在一个字段上安排计划并在作业的提示或命令中守护另一个字段。

## 执行方式

| 方式       | `--session` 值      | 运行于              | 最适合               |
| ---------- | ------------------- | ------------------- | -------------------- |
| 主会话     | `main`              | 下一次心跳轮次      | 提醒、系统事件       |
| 隔离       | `isolated`          | 专用 `cron:<jobId>` | 报告、后台杂务       |
| 当前会话   | `current`           | 在创建时绑定        | 感知上下文的循环工作 |
| 自定义会话 | `session:custom-id` | 持久化命名会话      | 基于历史记录的工作流 |

<AccordionGroup>
  <Accordion title="Main 会话 vs isolated vs custom">
    **Main 会话**（主会话）作业将一个系统事件排队，并可选地唤醒心跳 (`--wake now` 或 `--wake next-heartbeat`)。这些系统事件不会延长目标会话的每日/闲置重置新鲜度。**Isolated**（隔离）作业使用新会话运行专用的代理轮次。**Custom sessions**（自定义会话）(`session:xxx`) 在运行间持久化上下文，从而启用诸如基于先前摘要的每日站会之类的工作流。
  </Accordion>
  <Accordion title="What 'fresh 会话' means for isolated jobs">
    对于隔离任务，“全新会话”意味着每次运行都会有一个新的 transcript/会话 id。OpenClaw 可能会携带安全的偏好设置，例如 thinking/fast/verbose 设置、标签以及显式用户选择的模型/身份验证覆盖，但它不会从旧的 cron 记录继承环境对话上下文：渠道/组路由、发送或队列策略、提升、来源或 ACP 运行时绑定。当定期任务应有意识地构建在同一对话上下文上时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="Runtime cleanup">
    对于隔离任务，运行时拆解现在包括针对该 cron 会话的尽力而为的浏览器清理。清理失败会被忽略，因此实际的 cron 结果仍然优先。

    隔离的 cron 运行还会释放通过共享运行时清理路径为该任务创建的任何捆绑 MCP 运行时实例。这与主会话和自定义会话 MCP 客户端的拆解方式相匹配，因此隔离的 cron 任务不会在运行之间泄漏 stdio 子进程或长寿命的 MCP 连接。

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    当隔离的 cron 运行协调子代理时，交付也更倾向于使用最终后代输出而不是过时的父级临时文本。如果后代仍在运行，OpenClaw 将抑制该部分父级更新而不是宣布它。

    对于仅文本的 Discord 公告目标，OpenClaw 将一次性发送规范的最终助手文本，而不是重播流式/中间文本负载和最终答案。媒体和结构化的 Discord 负载仍然作为单独的负载交付，因此附件和组件不会丢失。

  </Accordion>
</AccordionGroup>

### Payload options for isolated jobs

<ParamField path="--message" type="string" required>
  提示词文本（隔离模式必需）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；使用为任务选定的允许模型。
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

`--model` 使用为该任务选定的允许模型。如果请求的模型不被允许，cron 会记录警告并回退到任务的代理/默认模型选择。配置的回退链仍然适用，但如果没有明确的针对特定任务的回退列表，普通的模型覆盖不再将代理主要模型作为隐藏的额外重试目标追加。

隔离任务的模型选择优先级如下：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 针对特定任务的载荷 `model`
3. 用户选择的存储 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析后的实时选择。如果所选模型配置具有 `params.fastMode`，隔离 cron 默认使用它。存储的会话 `fastMode` 覆盖在任一方向上都优先于配置。

如果隔离运行遇到实时模型切换移交，cron 将使用切换后的提供商/模型重试，并在重试之前为活动运行保留该实时选择。当切换还携带新的身份验证配置文件时，cron 也会为活动运行保留该身份验证配置文件覆盖。重试是有界的：在初始尝试加上 2 次切换重试后，cron 将中止而不是无限循环。

## 交付和输出

| 模式       | 发生情况                                 |
| ---------- | ---------------------------------------- |
| `announce` | 如果代理未发送，则回退交付最终文本到目标 |
| `webhook`  | 将完成事件载荷 POST 到 URL               |
| `none`     | 无运行器回退交付                         |

使用 `--announce --channel telegram --to "-1001234567890"` 进行渠道投递。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`，`user:<id>`）。Matrix 房间 ID 区分大小写；请使用确切的房间 ID 或来自 Matrix 的 `room:!room:server` 形式。

对于隔离作业，聊天投递是共享的。如果聊天路由可用，即使作业使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到配置的/当前目标，OpenClaw 会跳过备用通知。否则，`announce`、`webhook` 和 `none` 仅控制运行程序在代理回合后对最终回复的处理。

当代理从活动聊天中创建隔离提醒时，OpenClaw 会存储保留的实时投递目标，用于备用通知路由。内部会话密钥可能为小写；当当前聊天上下文可用时，提供商投递目标不会从这些密钥重建。

故障通知遵循单独的目标路径：

- `cron.failureDestination` 设置故障通知的全局默认值。
- `job.delivery.failureDestination` 为每个作业覆盖该设置。
- 如果两者均未设置且作业已通过 `announce` 投递，故障通知现在将回退到该主通知目标。
- 除非主投递模式为 `webhook`，否则 `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 作业上受支持。
- `failureAlert.includeSkipped: true` 使作业或全局 cron 告警策略选择加入重复跳过运行告警。跳过的运行保留单独的连续跳过计数器，因此它们不影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="重复隔离作业">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型和思考覆盖">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway(网关)可以公开用于外部触发器的 HTTP webhook 端点。在配置中启用：

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

每个请求必须通过标头包含 hook 令牌：

- `Authorization: Bearer <token>` （推荐）
- `x-openclaw-token: <token>`

查询字符串令牌将被拒绝。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    为主会话排队一个系统事件：

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

    字段：`message`（必需）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="映射的 hooks (POST /hooks/<name>)">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意有效载荷转换为 `wake` 或 `agent` 操作。
  </Accordion>
</AccordionGroup>

<Warning>
请将 hook 端点置于回环接口、tailnet 或可信的反向代理之后。

- 使用专用的 hook token；不要复用 Gateway(网关) 的认证 token。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制显式的 `agentId` 路由。
- 保留 `hooks.allowRequestSessionKey=false`，除非您需要由调用方选择的会话。
- 如果您启用了 `hooks.allowRequestSessionKey`，请同时设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- Hook 载荷默认会被安全边界包装。
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

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续期监视。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

<Steps>
  <Step title="选择 GCP 项目">
    选择拥有 `gog` 使用的 GCP 客户端的 OAuth 项目：

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

## 管理任务

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

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改作业所选的模型。
- 如果该模型被允许，则该确切的提供商/模型将到达隔离的代理运行。
- 如果不被允许，cron 会发出警告并回退到作业的代理/默认模型选择。
- 配置的回退链仍然适用，但如果没有显式的每作业回退列表，则纯 `--model` 覆盖不再会作为静默的额外重试目标回退到代理主模型。
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

`maxConcurrentRuns` 同时限制了预定的 cron 调度和隔离的代理轮次执行。隔离的 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此提高此值可以让独立的 cron LLM 运行并行进行，而不仅仅是启动它们的外部 cron 包装器。共享的非 cron `nested` 通道不会因此设置而变宽。

运行状态 sidecar 派生自 `cron.store`：诸如 `~/clawd/cron/jobs.json` 之类的 `.json` 存储使用 `~/clawd/cron/jobs-state.json`，而没有 `.json` 后缀的存储路径则附加 `-state.json`。

如果您手动编辑 `jobs.json`，请将 `jobs-state.json` 保留在源代码管理之外。OpenClaw 使用该 sidecar 来处理待定槽位、活动标记、上次运行元数据，以及调度器标识，该标识会告诉调度器何时需要为外部编辑的作业重新生成 `nextRunAtMs`。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **一次性重试**：瞬态错误（速率限制、过载、网络、服务器错误）最多重试 3 次，并采用指数退避。永久错误会立即禁用。

    **循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。在下次成功运行后重置退避。

  </Accordion>
  <Accordion title="Maintenance">
    `cron.sessionRetention` (默认 `24h`) 会清理隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动清理运行日志文件。
  </Accordion>
</AccordionGroup>

## 故障排查

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
  <Accordion title="Cron not firing">
    - 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
    - 确认 Gateway(网关) 正在持续运行。
    - 对于 `cron` 调度，请验证时区 (`--tz`) 与主机时区是否一致。
    - 运行输出中的 `reason: not-due` 表示已通过 `openclaw cron run <jobId> --due` 检查了手动运行，但任务尚未到期。
  </Accordion>
  <Accordion title="Cron fired but no delivery">
    - 传递模式 `none` 意味着不应期待运行器后备发送。当聊天路由可用时，代理仍可使用 `message` 工具直接发送。
    - 传递目标缺失/无效 (`channel`/`to`) 意味着跳过了出站操作。
    - 对于 Matrix，复制或旧版任务如果使用了小写的 `delivery.to` 房间 ID 可能会失败，因为 Matrix 房间 ID 区分大小写。请将任务编辑为 Matrix 中确切的 `!room:server` 或 `room:!room:server` 值。
    - 渠道认证错误 (`unauthorized`, `Forbidden`) 意味着传递被凭据阻止。
    - 如果隔离运行仅返回静默令牌 (`NO_REPLY` / `no_reply`)，OpenClaw 将抑制直接出站传递，并抑制后备队列摘要路径，因此不会向聊天发回任何内容。
    - 如果代理应该亲自向用户发送消息，请检查任务是否有可用路由 (`channel: "last"` 配合先前的聊天，或显式的渠道/目标)。
  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - 每日重置和空闲重置的新鲜度不基于 `updatedAt`；请参阅 [会话管理](/zh/concepts/session#session-lifecycle)。
    - Cron 唤醒、heartbeat 运行、执行通知和网管维护可能会更新会话行以用于路由/状态，但它们不会延长 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的旧行，如果文件仍然可用，OpenClaw 可以从 transcript JSONL 会话头中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的旧空闲行使用该恢复的启动时间作为其空闲基准。
  </Accordion>
  <Accordion title="Timezone gotchas">
    - 没有 `--tz` 的 Cron 使用网关主机时区。
    - 没有时区的 `at` 计划被视为 UTC。
    - Heartbeat `activeHours` 使用配置的时区解析。
  </Accordion>
</AccordionGroup>

## 相关

- [自动化与任务](/zh/automation) — 概览所有自动化机制
- [后台任务](/zh/automation/tasks) — Cron 执行的任务账本
- [心跳](/zh/gateway/heartbeat) — 定期主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
