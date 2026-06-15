---
summary: "Gateway(网关)适用于 Gateway(网关) 调度器的定时任务、webhook 和 Gmail PubSub 触发器"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "定时任务"
sidebarTitle: "定时任务"
---

Cron 是 Gateway(网关) 的内置调度器。它持久化作业，在正确的时间唤醒代理，并可以将输出发送回聊天渠道或 webhook 端点。

## 快速开始

<Steps>
  <Step title="添加一次性提醒">
    ```bash
    openclaw cron create "2026-02-01T16:00:00Z" \
      --name "Reminder" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="检查您的任务">
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
- 作业定义、运行时状态和运行历史持久化存储在 OpenClaw 的共享 SQLite 状态数据库中，因此重启不会丢失计划。
- 升级时，请运行 `openclaw doctor --fix` 将旧的 `~/.openclaw/cron/jobs.json`、`jobs-state.json` 和 `runs/*.jsonl` 文件导入 SQLite，并为其添加 `.migrated` 后缀进行重命名。格式错误的作业行将在运行时被跳过，并复制到 `jobs-quarantine.json` 以供稍后修复或审查。
- `cron.store` 仍然作为逻辑 cron 存储键和 doctor 导入路径的名称。导入后，编辑该 JSON 文件将不再更改活动的 cron 作业；请改用 `openclaw cron add|edit|remove` 或 Gateway(网关) 的 cron RPC 方法。
- 所有 cron 执行都会创建 [background task](/zh/automation/tasks) 记录。
- 在 Gateway(网关) 启动时，过期的隔离代理回合作业会被重新安排到渠道连接窗口之外，而不是立即重放，这样 Discord/Telegram 启动和原生命令设置在重启后能保持响应。
- 一次性作业（`--at`）默认在成功后自动删除。
- 隔离的 cron 会在运行完成时尽力关闭为其 `cron:<jobId>` 会话跟踪的浏览器选项卡/进程，从而确保分离的浏览器自动化不会留下孤立的进程。
- 接收受限 cron 自清理授权的隔离 cron 运行仍然可以读取调度器状态、其当前作业的自过滤列表以及该作业的运行历史，因此状态/心跳检查可以在不获得更广泛 cron 修改权限的情况下检查其自己的计划。
- 隔离的 cron 运行还会防止过时的确认回复。如果第一个结果只是临时状态更新（`on it`、`pulling everything together` 和类似提示），并且没有后代子代理运行仍对最终答案负责，OpenClaw 会在交付前再次提示以获取实际结果。
- 隔离的 cron 运行使用来自嵌入运行的结构化执行拒绝元数据，包括节点宿主 `UNAVAILABLE` 包装器，其嵌套的错误消息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 开头，因此被阻止的命令不会被报告为绿色运行，而普通的助手文本也不会被视为拒绝。
- 独立的 cron 运行还将运行级代理失败视为作业错误，即使没有生成回复有效负载，因此模型/提供商失败会增加错误计数器并触发失败通知，而不是将作业清除为成功。
- 当隔离的代理轮次作业达到 `timeoutSeconds` 时，cron 会中止底层代理运行并给予其短暂的清理窗口。如果运行未排空，Gateway(网关) 拥有的清理程序会强制清除该运行的会话所有权，然后 cron 记录超时，这样排队的聊天工作就不会滞留在过时的处理会话之后。
- 如果隔离的 agent-turn 在启动程序之前或第一次模型调用之前停滞，cron 会记录特定阶段的超时，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。这些看门狗程序涵盖了嵌入式提供程序和 CLI 支持的提供程序，在它们的外部 CLI 进程实际启动之前，并且独立于较长的 `timeoutSeconds` 值进行封顶，以便冷启动/身份验证/上下文失败能够快速显现，而不是等待整个作业预算耗尽。
- 如果您使用系统 cron 或其他外部调度程序来运行 `openclaw agent`，请用硬终止升级来包装它，即使 CLI 处理 `SIGTERM`/`SIGINT`。Gateway(网关) 支持的运行会请求 Gateway(网关) 中止已接受的运行；本地和嵌入式回退运行会收到相同的中止信号。对于 GNU `timeout`，优先使用 `timeout -k 60 600 openclaw agent ...` 而不是普通的 `timeout 600 ...`；如果进程无法耗尽，`-k` 值是主管程序的兜底措施。对于 systemd 单元，通过使用 `SIGTERM` 停止信号加上宽限期（例如 `TimeoutStopSec`）来保持相同的结构，然后再进行最终终止。如果在原始 Gateway(网关) 运行仍处于活动状态时重试重用了 `--run-id`，则重复项将被报告为正在运行，而不是启动第二次运行。

<a id="maintenance"></a>

<Note>
Cron 的任务协调优先由运行时 (runtime) 管理，其次由持久化历史记录支持：只要 cron 运行时仍然跟踪该作业正在运行，活动的 cron 任务就会保持活动状态，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业并且 5 分钟的宽限期到期，维护程序会检查匹配 `cron:<jobId>:<startedAt>`Gateway(网关) 运行的持久化运行日志和作业状态。如果该持久化历史记录显示最终结果，则任务账簿将据此完成；否则，Gateway(网关) 拥有的维护程序可以将任务标记为 `lost`CLIGateway(网关)。离线 CLI 审计可以从持久化历史记录中恢复，但它不会将其自身为空的进程内活动作业集视为 Gateway(网关) 拥有的 cron 运行已消失的证明。
</Note>

## 计划类型

| 类型    | CLI 标志  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`）  |
| `every` | `--every` | 固定间隔                                       |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz` |

不带时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟时间调度。

循环的整点表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式窗口。

### 日期和星期使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当“月份中的某天”和“星期中的某天”字段都为非通配符时，croner 在 **任一** 字段匹配时匹配——而不是两者都匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每个月会触发约 5-6 次，而不是每个月 0-1 次。OpenClaw 在这里使用 Croner 的默认 OR 行为。要要求同时满足两个条件，请使用 Croner 的 OpenClaw`+` 星期几修饰符（`0 9 15 * +1`），或者在一个字段上进行调度，并在作业的提示或命令中保护另一个字段。

## 执行样式

| 样式       | `--session` 值      | 运行于                | 最适用于             |
| ---------- | ------------------- | --------------------- | -------------------- |
| 主会话     | `main`              | 专用的 cron 唤醒通道  | 提醒、系统事件       |
| 隔离       | `isolated`          | 专用的 `cron:<jobId>` | 报告、后台杂务       |
| 当前会话   | `current`           | 在创建时绑定          | 上下文感知的循环任务 |
| 自定义会话 | `session:custom-id` | 持久的命名会话        | 基于历史的工作流     |

<AccordionGroup>
  <Accordion title="Main 会话 vs isolated vs custom">
    **Main 会话** 作业将系统事件排入 cron 拥有的运行通道，并可选择唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。它们可以使用目标主会话的最后交付上下文进行回复，但它们不会将常规 cron 轮次附加到人类聊天通道，也不会延长目标会话的每日/空闲重置新鲜度。**Isolated** 作业使用新会话运行专用的代理轮次。**Custom sessions**（`session:xxx`）在运行之间保留上下文，从而实现基于先前摘要的每日站会等工作流。

    Main-会话 cron 事件是独立的系统事件提醒。它们不会自动包含默认心跳提示中的“Read HEARTBEAT.md”指令。如果定期提醒应查阅 `HEARTBEAT.md`，请在 cron 事件文本或代理自己的指令中明确说明。

  </Accordion>
  <Accordion title="What 'fresh 会话' means for isolated jobs"OpenClaw>
    对于独立作业，“fresh 会话”意味着每次运行都有新的转录/会话 ID。OpenClaw 可能会携带安全的首选项，例如思考/快速/详细设置、标签和显式的用户选择模型/身份验证覆盖，但它不会从旧的 cron 行继承环境对话上下文：渠道/组路由、发送或队列策略、提升、来源或 ACP 运行时绑定。当定期作业应有意基于相同的对话上下文构建时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="运行时清理">
    对于独立作业，运行时拆解现在包括针对该 cron 会话的尽力而为的浏览器清理。清理失败将被忽略，以便实际的 cron 结果仍然获胜。

    独立的 cron 运行还会释放通过共享运行时清理路径为作业创建的任何捆绑的 MCP 运行时实例。这与主会话和自定义会话 MCP 客户端的拆解方式相匹配，因此独立的 cron 作业不会在运行之间泄漏 stdio 子进程或长期存在的 MCP 连接。

  </Accordion>
  <Accordion title="Subagent 和 Discord 投递">
    当独立的 cron 运行编排子代理时，投递也更倾向于最终的子代输出，而不是过时的父级临时文本。如果子代仍在运行，OpenClaw 会抑制该部分父级更新，而不是发布它。

    对于仅文本的 Discord 公告目标，OpenClaw 会发送一次规范的最终助手文本，而不是重播流式/中间文本负载和最终答案。媒体和结构化的 Discord 负载仍作为单独的负载投递，因此不会丢失附件和组件。

  </Accordion>
</AccordionGroup>

### 独立作业的负载选项

<ParamField path="--message" type="string" required>
  提示词文本（隔离模式必需）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；使用任务所选的允许模型。
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

`--model` 使用所选的允许模型作为该任务的主要模型。这与聊天会话 `/model` 覆盖不同：当任务主要模型失败时，配置的回退链仍然适用。如果请求的模型不被允许或无法解析，cron 会因明确的验证错误而使运行失败，而不是静默回退到任务的代理/默认模型选择。

Cron 任务还可以携带负载级别的 `fallbacks`。当存在该列表时，它会替换任务的配置回退链。如果您希望进行仅尝试所选模型的严格 cron 运行，请在任务负载/API 中使用 `fallbacks: []`。如果任务具有 `--model` 但既没有负载也没有配置的回退，OpenClaw 将传递一个显式的空回退覆盖，这样代理主要模型就不会被附加为隐藏的额外重试目标。

本地提供商的预检检查会在将 cron 运行标记为 `skipped` 之前遍历配置的回退；`fallbacks: []` 保持该预检路径的严格性。

隔离任务的模型选择优先级为：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 每个任务的负载 `model`
3. 用户选择的已存储 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析的实时选择。如果所选模型配置具有 `params.fastMode`，隔离的 cron 默认使用它。存储的会话 `fastMode` 覆盖在任一方向上仍然胜过配置。

如果隔离运行遇到实时模型切换移交，cron 将使用切换后的提供商/模型重试，并在重试之前为活动运行保留该实时选择。当切换还携带新的身份验证配置文件时，cron 也会为活动运行保留该身份验证配置文件覆盖。重试是有限的：在初始尝试加上 2 次切换重试后，cron 将中止而不是无限循环。

在隔离的 cron 运行进入代理运行程序之前，OpenClaw 会检查可访问的本地提供商端点，寻找其 `baseUrl` 为 loopback、private-network 或 `.local` 的已配置 OpenClaw`api: "ollama"` 和 `api: "openai-completions"` 提供商。如果该端点宕机，运行将被记录为 `skipped`Ollama，并显示清晰的提供商/模型错误，而不是启动模型调用。端点结果会缓存 5 分钟，因此许多使用同一失效的本地 Ollama、vLLM、SGLang 或 LM Studio 服务器的到期任务将共享一次小的探测，而不是造成请求风暴。跳过的提供商预检运行不会增加执行错误退避；如果您需要重复的跳过通知，请启用 `failureAlert.includeSkipped`。

## 传递和输出

| 模式       | 发生了什么                               |
| ---------- | ---------------------------------------- |
| `announce` | 如果代理未发送，则回退传递最终文本到目标 |
| `webhook`  | 将完成的事件负载 POST 到 URL             |
| `none`     | 无运行器回退传递                         |

使用 `--announce --channel telegram --to "-1001234567890"`Telegram 进行渠道交付。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`OpenClawTelegram；OpenClaw 也接受 Telegram 拥有的 `-1001234567890:123`RPC 简写。直接调用 RPC/配置的用户可以将 `delivery.threadId`SlackDiscordMattermost 作为字符串或数字传递。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`Matrix）。Matrix 房间 ID 区分大小写；请使用来自 Matrix 的确切房间 ID 或 `room:!room:server`Matrix 格式。

当公告投递使用 `channel: "last"` 或省略 `channel` 时，带有提供商前缀的目标（例如 `telegram:123`）可以在 cron 回退到会话历史记录或单个配置渠道之前选择渠道。只有已加载插件通告的前缀才是提供商选择器。如果明确指定了 `delivery.channel`，则目标前缀必须命名相同的提供商；例如，`channel: "whatsapp"` 与 `to: "telegram:123"` 会被拒绝，而不会让 WhatsApp 将 Telegram ID 解释为电话号码。目标类型和服务前缀（例如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`）仍然是渠道拥有的目标语法，而不是提供商选择器。

对于隔离作业，聊天投递是共享的。如果聊天路由可用，即使作业使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到配置的/当前目标，OpenClaw 会跳过回退公告。否则，`announce`、`webhook` 和 `none` 仅控制运行程序在代理轮次之后对最终回复的处理。

当代理从活动聊天中创建隔离提醒时，OpenClaw 会为回退公告路由存储保留的实时投递目标。内部会话密钥可能是小写的；当存在当前聊天上下文时，提供商投递目标不会从这些密钥重建。

隐式公告投递使用配置的渠道允许列表来验证和重新路由过时的目标。私信配对存储批准不是回退自动化接收者；当计划作业应主动发送到私信时，请设置 `delivery.to` 或配置渠道 `allowFrom` 条目。

## 输出语言

Cron 任务不会从渠道、区域设置或之前的消息推断回复语言。将语言规则放入计划消息或模板中：

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

对于模板文件，请将语言指令保留在渲染的提示中，并
在作业运行之前验证 `{{language}}` 等占位符是否已填充。如果
输出混合了语言，请使规则明确，例如：“叙述文本使用中文，
技术术语保留英文。”

失败通知遵循单独的目标路径：

- `cron.failureDestination` 为失败通知设置全局默认值。
- `job.delivery.failureDestination` 会覆盖每个作业的设置。
- 如果两者均未设置，且任务已通过 `announce` 进行投递，失败通知现在将回退到该主要通告目标。
- `delivery.failureDestination` 仅在 `sessionTarget="isolated"` 任务上受支持，除非主要投递模式为 `webhook`。
- `failureAlert.includeSkipped: true` 使任务或全局 cron 警报策略加入重复跳过运行的警报。跳过的运行保留单独的连续跳过计数器，因此它们不会影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="周期性隔离任务">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="模型和思考覆盖">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Webhook 输出">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
</Tabs>

## Webhooks

Gateway(网关) 可以为外部触发器暴露 HTTP webhook 端点。在配置中启用：

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

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`

查询字符串中的令牌将被拒绝。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    为主会话加入一个系统事件：

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

    字段：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 操作。
  </Accordion>
</AccordionGroup>

<Warning>
请将 hook 端点置于 loopback（环回）、tailnet 或可信反向代理之后。

- 使用专用的 hook 令牌；不要复用 Gateway(网关) 认证令牌。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制 hook 可以定位的有效代理（Agent），包括省略 `agentId` 时的默认代理。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要调用方选择的会话。
- 如果启用 `hooks.allowRequestSessionKey`，还需设置 `hooks.allowedSessionKeyPrefixes` 来限制允许的会话密钥形式。
- 默认情况下，Hook 载荷会被安全边界包裹。

</Warning>

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

<Note>**先决条件：** `gcloud` CLI，CLI`gog` (gogcli)，已启用 OpenClaw hooks，用于公共 HTTPS 端点的 Tailscale。</Note>

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail` 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续期监听。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可选择退出。

### 手动一次性设置

<Steps>
  <Step title="选择 GCP 项目">
    选择拥有 GCP 客户端的 OAuth 项目，该客户端由 `gog` 使用：

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
openclaw cron create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` 在将手动运行加入队列后返回。对于关闭钩子（shutdown hooks）、维护脚本或其他必须阻塞直到队列中的运行完成的自动化任务，请使用 `--wait`。等待模式轮询确切的返回值 `runId`；对于状态 `ok`，它返回 `0`，对于 `error`、`skipped` 或等待超时，则返回非零值。

`openclaw cron create` 是 `openclaw cron add` 的别名，新任务可以使用位置性调度（`"0 9 * * 1"`、`"every 1h"`、`"20m"` 或 ISO 时间戳），后跟位置性代理提示。在 `cron add|create` 或 `cron edit` 上使用 `--webhook <url>` 将完成的运行负载 POST 到 HTTP 端点。Webhook 传递不能与聊天传递标志（如 `--announce`、`--channel`、`--to`、`--thread-id` 或 `--account`）结合使用。

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 会更改任务所选的模型。
- 如果该模型被允许，则该确切的提供商/模型将到达隔离的代理运行。
- 如果不允许或无法解析，cron 将使运行失败并显示明确的验证错误。
- 配置的回退链仍然适用，因为 cron `--model` 是任务主要设置，而不是会话 `/model` 覆盖。
- 负载 `fallbacks` 替换该任务的已配置回退；`fallbacks: []` 禁用回退并使运行变为严格模式。
- 没有明确或已配置回退列表的纯 `--model` 不会作为静默的额外重试目标回退到代理主要设置。

</Note>

## 配置

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 8,
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

`maxConcurrentRuns` 同时限制计划好的 cron 调度和隔离的代理轮次执行，默认值为 8。隔离的 cron 代理轮次在内部使用队列专用的 `cron-nested` 执行通道，因此提高此值允许独立的 cron LLM 运行并行进行，而不仅仅是启动它们的外部 cron 包装器。共享的非 cron `nested` 通道不会通过此设置变宽。

`cron.store` 是一个逻辑存储键和传统的 doctor 导入路径。运行 `openclaw doctor --fix` 将现有的 JSON 存储导入 SQLite 并对其进行归档；未来的 cron 更改应通过 CLI 或 Gateway(网关) API 进行。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **一次性重试**：瞬时错误（速率限制、过载、网络、服务器错误）最多重试 3 次，并采用指数退避。永久性错误会立即禁用。

    **周期性重试**：重试之间采用指数退避（30 秒到 60 分钟）。在下次成功运行后重置退避时间。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认 `24h`）会清理隔离的运行会话条目。`cron.runLog.keepLines` 限制每个作业保留的 SQLite 运行历史记录行数；`maxBytes` 保留是为了与较旧的基于文件的支持日志的配置兼容性。
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
    - 检查 `cron.enabled` 和 `OPENCLAW_SKIP_CRON` 环境变量。
    - 确认 Gateway(网关) 正在持续运行。
    - 对于 `cron` 计划，请验证时区 (`--tz`) 与主机时区是否一致。
    - 运行输出中的 `reason: not-due` 表示已使用 `openclaw cron run <jobId> --due` 检查了手动运行，但作业尚未到期。

  </Accordion>
  <Accordion title="Cron fired but no delivery">
    - 传递模式 `none` 意味着不预期执行器回退发送。当聊天路由可用时，代理仍可使用 `message` 工具直接发送。
    - 传递目标缺失/无效（`channel`/`to`）意味着出站被跳过。
    - 对于 Matrix，复制或遗留任务如果使用了小写的 `delivery.to` 房间 ID 可能会失败，因为 Matrix 房间 ID 区分大小写。请编辑任务以使用来自 Matrix 的精确 `!room:server` 或 `room:!room:server` 值。
    - 渠道认证错误（`unauthorized`、`Forbidden`）意味着传递被凭据阻止。
    - 如果隔离运行仅返回静默令牌（`NO_REPLY` / `no_reply`），OpenClaw 将抑制直接出站传递，同时也抑制回退的排队摘要路径，因此不会回发任何内容到聊天。
    - 如果代理应该自行向用户发送消息，请检查任务是否有可用路由（`channel: "last"` 搭配先前的聊天，或明确的渠道/目标）。

  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - 每日和空闲重置的新鲜度不是基于 `updatedAt`；请参阅 [会话管理](/zh/concepts/session#session-lifecycle)。
    - Cron 唤醒、心跳运行、执行通知和网管记录可能会更新会话行以用于路由/状态，但它们不会延长 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的旧行，当文件仍可用时，OpenClaw 可以从记录 JSONL 会话标头中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的遗留空闲行使用该恢复的开始时间作为其空闲基准。

  </Accordion>
  <Accordion title="时区注意事项">
    - 不带 `--tz` 的 Cron 使用网关主机的时区。
    - 不带时区的 `at` 计划被视为 UTC。
    - 心跳 `activeHours` 使用已配置的时区解析。

  </Accordion>
</AccordionGroup>

## 相关

- [自动化](/zh/automation) — 所有自动化机制概览
- [后台任务](/zh/automation/tasks) — Cron 执行的任务台账
- [心跳](/zh/gateway/heartbeat) — 周期性主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
