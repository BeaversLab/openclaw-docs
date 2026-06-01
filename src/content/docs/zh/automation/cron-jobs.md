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
- 任务定义持久化保存在 `~/.openclaw/cron/jobs.json` 中，因此重启不会丢失计划。
- 运行时执行状态持久化保存在其旁边的 `~/.openclaw/cron/jobs-state.json` 中。如果您在 git 中跟踪 cron 定义，请跟踪 `jobs.json` 并将 `jobs-state.json` 加入 gitignore。
- 如果 `jobs.json`Gateway(网关) 包含格式错误的行，Gateway(网关) 会保持有效作业运行，从活动存储中删除格式错误的行，并将原始行保存在其旁边的 `jobs-quarantine.json` 中，以便稍后修复或审查。
- 拆分后，较旧的 OpenClaw 版本可以读取 OpenClaw`jobs.json`，但可能会将作业视为新作业，因为运行时字段现在位于 `jobs-state.json` 中。
- 当 Gateway(网关) 正在运行或已停止时编辑 `jobs.json`Gateway(网关)OpenClaw，OpenClaw 会将更改的计划字段与挂起的运行时段元数据进行比较，并清除过时的 `nextRunAtMs` 值。纯格式化或仅更改键顺序的重写将保留挂起的时段。
- 所有 cron 执行都会创建 [后台任务](/zh/automation/tasks) 记录。
- 在 Gateway(网关) 启动时，过期的隔离代理轮次任务将被重新调度到渠道连接窗口之外，而不是立即重放，因此 Discord/Telegram 启动和本机命令设置在重启后仍能保持响应。
- 一次性任务 (`--at`) 默认在成功后自动删除。
- Isolated cron 运行会在运行完成后尽力关闭其 `cron:<jobId>` 会话的被跟踪浏览器选项卡/进程，因此分离的浏览器自动化不会留下孤立的进程。
- 收到狭义 cron 自清理授权的 Isolated cron 运行仍然可以读取调度器状态、其当前作业的自过滤列表以及该作业的运行历史，因此状态/心跳检查可以在不获得更广泛的 cron 变更访问权限的情况下检查其自己的调度。
- Isolated cron 运行还可以防止过时的确认回复。如果第一个结果只是一个临时状态更新（`on it`、`pulling everything together`OpenClaw 和类似提示），并且没有后代子代理运行仍对最终答案负责，OpenClaw 会在交付之前重新提示一次以获取实际结果。
- Isolated cron 运行使用来自嵌入运行的结构化执行拒绝元数据，包括节点宿主 `UNAVAILABLE` 包装器，其嵌套的错误消息以 `SYSTEM_RUN_DENIED` 或 `INVALID_REQUEST` 开头，因此被阻止的命令不会作为绿色运行报告，而普通的助手文本也不会被视为拒绝。
- Isolated cron 运行还将运行级别的代理故障视为作业错误，即使没有产生回复负载，因此模型/提供商故障会增加错误计数并触发失败通知，而不是将作业清除为成功。
- 当隔离的代理轮次作业达到 `timeoutSeconds`Gateway(网关) 时，cron 会中止底层的代理运行并给予一个简短的清理窗口。如果运行没有排空，Gateway 所有的清理会在 cron 记录超时之前强制清除该运行的会话所有权，因此排队的聊天工作不会被滞留在过时的处理会话之后。
- 如果隔离的 agent-turn 在 runner 启动之前或第一次模型调用之前停滞，cron 会记录特定阶段的超时，例如 `setup timed out before runner start` 或 `stalled before first model call (last phase: context-engine)`。这些监控程序覆盖嵌入式提供者和 CLI 支持的提供者，在外部 CLI 进程实际启动之前，并且独立于长 `timeoutSeconds` 值进行封顶，以便冷启动/身份验证/上下文故障能够快速暴露，而不是等待完整的作业预算。
- 如果您使用系统 cron 或其他外部调度器来运行 `openclaw agent`，请使用硬终止升级对其进行包装，即使 CLI 处理 `SIGTERM`/`SIGINT`。Gateway(网关) 支持的运行会请求 Gateway(网关) 中止已接受的运行；本地和嵌入式回退运行会收到相同的中止信号。对于 GNU `timeout`，首选 `timeout -k 60 600 openclaw agent ...` 而不是普通的 `timeout 600 ...`；如果进程无法耗尽，`-k` 值是监督者的最后防线。对于 systemd 单元，通过使用 `SIGTERM` 停止信号加上宽限期（例如 `TimeoutStopSec`）来保持相同的形状，然后再进行最终终止。如果重试在原始 Gateway(网关) 运行仍处于活动状态时重用 `--run-id`，则重复项将被报告为正在进行中，而不是启动第二次运行。

<a id="maintenance"></a>

<Note>
Cron 的任务协调以运行时所有为首要，以持久化历史为次要：只要 cron 运行时仍将某任务跟踪为运行中，该活动 cron 任务就会保持活跃，即使旧的子会话行仍然存在。一旦运行时停止拥有该作业且 5 分钟宽限期到期，维护程序将检查匹配 `cron:<jobId>:<startedAt>`Gateway(网关) 运行的持久化运行日志和作业状态。如果该持久化历史显示最终结果，则任务账簿将据此定稿；否则 Gateway(网关) 拥有的维护程序可以将任务标记为 `lost`CLIGateway(网关)。离线 CLI 审计可以从持久化历史中恢复，但它不会将其自身空的进程中活动作业集作为 Gateway(网关) 拥有的 cron 运行已消失的证明。
</Note>

## 计划类型

| 类型    | CLI 标志  | 描述                                           |
| ------- | --------- | ---------------------------------------------- |
| `at`    | `--at`    | 一次性时间戳（ISO 8601 或相对时间，如 `20m`）  |
| `every` | `--every` | 固定间隔                                       |
| `cron`  | `--cron`  | 5 字段或 6 字段 cron 表达式，带有可选的 `--tz` |

不带时区的时间戳被视为 UTC。添加 `--tz America/New_York` 以进行本地挂钟调度。

循环的整点表达式会自动错开最多 5 分钟，以减少负载峰值。使用 `--exact` 强制精确计时，或使用 `--stagger 30s` 指定显式窗口。

### 月份中的某日和星期中的某日使用 OR 逻辑

Cron 表达式由 [croner](https://github.com/Hexagon/croner) 解析。当“月份中的某日”和“星期中的某日”字段均为非通配符时，croner 在 **任一** 字段匹配时即匹配——而不是两者都匹配。这是标准的 Vixie cron 行为。

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

这每个月触发约 5-6 次，而不是每个月 0-1 次。OpenClaw 在此处使用 Croner 的默认 OR 行为。若要同时满足这两个条件，请使用 Croner 的 OpenClaw`+` 星期几修饰符（`0 9 15 * +1`），或者在一个字段上进行调度，并在作业的提示或命令中对另一个字段进行守卫。

## 执行样式

| 样式       | `--session` 值      | 运行于                | 最适用于                 |
| ---------- | ------------------- | --------------------- | ------------------------ |
| 主会话     | `main`              | 专用的 cron 唤醒通道  | 提醒、系统事件           |
| 独立       | `isolated`          | 专用的 `cron:<jobId>` | 报告、后台杂务           |
| 当前会话   | `current`           | 在创建时绑定          | 感知上下文的周期性工作   |
| 自定义会话 | `session:custom-id` | 持久化的命名会话      | 基于历史记录构建的工作流 |

<AccordionGroup>
  <Accordion title="主会话 vs 独立 vs 自定义">
    **主会话** 作业将系统事件加入 cron 拥有的运行通道，并可选择唤醒心跳（`--wake now` 或 `--wake next-heartbeat`）。它们可以使用目标主会话的最后一次投递上下文进行回复，但它们不会将常规的 cron 轮次附加到人类聊天通道中，也不会延长目标会话的每日/空闲重置的新鲜度。**独立** 作业使用新会话运行专用的代理轮次。**自定义会话**（`session:xxx`）在多次运行之间持久化上下文，从而启用像每日站会那样基于先前摘要的工作流。

    主会话 cron 事件是自包含的系统事件提醒。它们
    不会自动包含默认心跳提示词的“Read
    HEARTBEAT.md”指令。如果周期性提醒需要查阅
    `HEARTBEAT.md`，请在 cron 事件文本中或代理自身的指令中明确说明。

  </Accordion>
  <Accordion title="“新会话”对独立作业意味着什么">
    对于独立作业，“新会话”意味着每次运行都有一个新的 transcript/会话 id。OpenClaw 可以携带安全的首选项，如思考/快速/详细设置、标签和显式用户选择的模型/身份验证覆盖，但它不会从旧的 cron 行继承环境对话上下文：渠道/组路由、发送或排队策略、提升、来源或 ACP 运行时绑定。当周期性作业应有意识地基于相同的对话上下文构建时，请使用 `current` 或 `session:<id>`。
  </Accordion>
  <Accordion title="Runtime cleanup">
    对于隔离作业，运行时现在会尽最大努力清理该 cron 会话的浏览器。清理失败会被忽略，因此实际的 cron 结果仍然优先。

    隔离的 cron 运行还会释放为该作业创建的所有捆绑 MCP 运行时实例，途径是共享的运行时清理路径。这与主会话和自定义会话 MCP 客户端的清理方式一致，因此隔离的 cron 作业不会在运行之间泄漏 stdio 子进程或持久 MCP 连接。

  </Accordion>
  <Accordion title="Subagent and Discord delivery">
    当隔离的 cron 运行编排子代理时，传递过程也更倾向于使用最终的后代输出，而不是过时的父级临时文本。如果后代仍在运行，OpenClaw 将抑制该部分父级更新，而不是宣布它。

    对于纯文本 Discord 通知目标，OpenClaw 仅发送一次规范的最终助手文本，而不是重播流式/中间文本负载和最终答案。媒体和结构化的 Discord 负载仍作为单独的负载传递，以免丢失附件和组件。

  </Accordion>
</AccordionGroup>

### 隔离作业的负载选项

<ParamField path="--message" type="string" required>
  提示词文本（隔离作业必需）。
</ParamField>
<ParamField path="--model" type="string">
  模型覆盖；使用为该作业选择的允许模型。
</ParamField>
<ParamField path="--thinking" type="string">
  思考级别覆盖。
</ParamField>
<ParamField path="--light-context" type="boolean">
  跳过工作区引导文件注入。
</ParamField>
<ParamField path="--tools" type="string">
  限制作业可使用的工具，例如 `--tools exec,read`。
</ParamField>

`--model` 使用所选的允许模型作为该作业的主要模型。这与聊天会话 `/model` 覆盖不同：当作业主要模型失败时，配置的回退链仍然适用。如果请求的模型不被允许或无法解析，cron 将以显式验证错误使运行失败，而不是静默回退到作业的代理/默认模型选择。

Cron 作业还可以携带有效载荷级别的 `fallbacks`。当存在时，该列表将替换作业的配置回退链。当您希望进行严格的 cron 运行且仅尝试所选模型时，请在作业有效载荷/API 中使用 `fallbacks: []`。如果作业具有 `--model` 但既没有有效载荷也没有配置的回退，OpenClaw 会传递一个显式的空回退覆盖，这样代理主要模型就不会被附加为隐藏的额外重试目标。

本地提供商预检检查会在将 cron 运行标记为 `skipped` 之前遍历已配置的回退；`fallbacks: []` 保持该预检路径严格。

隔离作业的模型选择优先级为：

1. Gmail hook 模型覆盖（当运行来自 Gmail 且允许该覆盖时）
2. 每个作业的有效载荷 `model`
3. 用户选择的存储 cron 会话模型覆盖
4. 代理/默认模型选择

快速模式也遵循解析的实时选择。如果所选模型配置具有 `params.fastMode`，隔离的 cron 默认使用它。存储的会话 `fastMode` 覆盖在任何方向上仍然胜过配置。

如果隔离的运行遇到实时模型切换移交，cron 将使用切换后的提供商/模型重试，并在重试之前为活动运行保留该实时选择。当切换还携带新的身份验证配置文件时，cron 也会为活动运行保留该身份验证配置文件覆盖。重试是有界的：在初始尝试加上 2 次切换重试后，cron 将中止而不是永远循环。

在隔离的 Cron 运行进入代理运行器之前，OpenClaw 会检查可访问的本地提供商端点，查找配置的 OpenClaw`api: "ollama"` 和 `api: "openai-completions"` 提供商，这些提供商的 `baseUrl` 为 loopback、private-network 或 `.local`。如果该端点宕机，运行将被记录为 `skipped`Ollama，并附带清晰的提供商/模型错误，而不是启动模型调用。端点结果会缓存 5 分钟，因此许多使用同一失效本地 Ollama、vLLM、SGLang 或 LM Studio 服务器的到期作业将共享一次小型探测，而不是创建请求风暴。跳过的提供商预检运行不会增加执行错误的退避时间；如果您希望重复收到跳过通知，请启用 `failureAlert.includeSkipped`。

## 传递和输出

| 模式       | 发生的情况                               |
| ---------- | ---------------------------------------- |
| `announce` | 如果代理未发送，则回退传递最终文本到目标 |
| `webhook`  | 将完成事件负载 POST 到 URL               |
| `none`     | 无运行器回退传递                         |

使用 `--announce --channel telegram --to "-1001234567890"`Telegram 进行渠道传递。对于 Telegram 论坛主题，请使用 `-1001234567890:topic:123`OpenClawTelegram；OpenClaw 也接受 Telegram 拥有的 `-1001234567890:123`RPC 简写。直接 RPC/配置调用者可以将 `delivery.threadId`SlackDiscordMattermost 作为字符串或数字传递。Slack/Discord/Mattermost 目标应使用显式前缀（`channel:<id>`、`user:<id>`Matrix）。Matrix 房间 ID 区分大小写；请使用 Matrix 中的确切房间 ID 或 `room:!room:server`Matrix 格式。

当通告交付使用 `channel: "last"` 或省略 `channel` 时，带有提供商前缀的目标（如 `telegram:123`）可以在 cron 回退到会话历史记录或单个配置渠道之前选择渠道。只有已加载插件通告的前缀才是提供商选择器。如果 `delivery.channel` 是显式的，目标前缀必须指定同一个提供商；例如，带有 `to: "telegram:123"` 的 `channel: "whatsapp"` 会被拒绝，而不是让 WhatsApp 将 Telegram ID 解释为电话号码。目标类型和服务前缀（如 `channel:<id>`、`user:<id>`、`imessage:<handle>` 和 `sms:<number>`）仍然是渠道拥有的目标语法，而不是提供商选择器。

对于隔离作业，聊天交付是共享的。如果聊天路由可用，即使作业使用 `--no-deliver`，代理也可以使用 `message` 工具。如果代理发送到配置的/当前目标，OpenClaw 会跳过回退通告。否则，`announce`、`webhook` 和 `none` 仅控制运行器在代理轮次之后对最终回复的处理。

当代理从活动聊天中创建隔离提醒时，OpenClaw 会存储保留的实时交付目标，用于回退通告路由。内部会话密钥可能是小写的；当当前聊天上下文可用时，提供商交付目标不会从这些密钥重建。

隐式通告交付使用配置的渠道允许列表来验证并重新路由过时的目标。私信配对存储批准不是回退自动化接收方；当计划任务应主动发送给私信时，请设置 `delivery.to` 或配置渠道 `allowFrom` 条目。

## 输出语言

Cron 作业不会从渠道、区域设置或以前的邮件中推断回复语言。将语言规则放入计划消息或模板中：

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

对于模板文件，请在渲染后的提示中保留语言指令，并验证 `{{language}}` 等占位符在作业运行前是否已填充。如果输出混合了多种语言，请明确规则，例如：“叙述性文本使用中文，技术术语保留英文。”

失败通知遵循单独的目标路径：

- `cron.failureDestination` 为失败通知设置全局默认值。
- `job.delivery.failureDestination` 会针对每个作业覆盖该默认值。
- 如果两者均未设置，且作业已通过 `announce` 进行投递，失败通知现在将回退到该主通知目标。
- 除非主要投递模式为 `webhook`，否则 `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 作业。
- `failureAlert.includeSkipped: true` 使作业或全局 cron 告警策略选择接收重复的跳过运行告警。跳过的运行维护一个单独的连续跳过计数器，因此它们不会影响执行错误退避。

## CLI 示例

<Tabs>
  <Tab title="一次性提醒">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="周期性隔离作业">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
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

每个请求必须通过 Header 包含 hook token：

- `Authorization: Bearer <token>` (推荐)
- `x-openclaw-token: <token>`

查询字符串中的 token 将被拒绝。

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    将系统事件加入主会话队列：

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
    运行隔离的 agent 轮次：

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    字段：`message`（必填）、`name`、`agentId`、`wakeMode`、`deliver`、`channel`、`to`、`model`、`fallbacks`、`thinking`、`timeoutSeconds`。

  </Accordion>
  <Accordion title="映射的 hook (POST /hooks/<name>)">
    自定义 hook 名称通过配置中的 `hooks.mappings` 解析。映射可以使用模板或代码转换将任意负载转换为 `wake` 或 `agent` 动作。
  </Accordion>
</AccordionGroup>

<Warning>
请将 hook 端点置于环回接口（loopback）、tailnet 或可信反向代理之后。

- 使用专用的 hook 令牌；不要复用网关认证令牌。
- 将 `hooks.path` 保持在专用子路径上；`/` 会被拒绝。
- 设置 `hooks.allowedAgentIds` 以限制 hook 可以针对的有效 agent，包括省略 `agentId` 时的默认 agent。
- 除非您需要调用方选择的会话，否则保持 `hooks.allowRequestSessionKey=false` 开启。
- 如果启用 `hooks.allowRequestSessionKey`，还需设置 `hooks.allowedSessionKeyPrefixes` 以约束允许的会话密钥形状。
- 默认情况下，hook 负载会被安全边界包裹。

</Warning>

## Gmail PubSub 集成

通过 Google PubSub 将 Gmail 收件箱触发器连接到 OpenClaw。

<Note>**先决条件：** `gcloud`CLI CLI，`gog`OpenClawTailscale (gogcli)，已启用 OpenClaw hooks，用于公共 HTTPS 端点的 Tailscale。</Note>

### 向导设置（推荐）

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

这会写入 `hooks.gmail`Tailscale 配置，启用 Gmail 预设，并使用 Tailscale Funnel 作为推送端点。

### Gateway(网关) 自动启动

当设置了 `hooks.enabled=true` 和 `hooks.gmail.account`Gateway(网关) 时，Gateway(网关) 会在启动时启动 `gog gmail watch serve` 并自动续期监听。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以退出。

### 一次性手动设置

<Steps>
  <Step title="GCP选择 GCP 项目"GCPOAuth>
    选择拥有 `gog` 所使用的 OAuth 客户端的 GCP 项目：

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
  <Step title="启动监听">
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

`openclaw cron run <jobId>` 在将手动运行加入队列后返回。对于必须阻塞直到队列运行完成的关闭钩子、维护脚本或其他自动化，请使用 `--wait`。等待模式轮询确切的返回 `runId`；对于状态 `ok`，它返回 `0`；对于 `error`、`skipped` 或等待超时，它返回非零值。

`openclaw cron create` 是 `openclaw cron add` 的别名，新作业可以使用位置参数形式的时间表（`"0 9 * * 1"`、`"every 1h"`、`"20m"` 或 ISO 时间戳），后跟位置参数形式的代理提示。在 `cron add|create` 或 `cron edit` 上使用 `--webhook <url>` 将完成的运行负载 POST 到 HTTP 端点。Webhook 传递不能与聊天传递标志（如 `--announce`、`--channel`、`--to`、`--thread-id` 或 `--account`）结合使用。

<Note>
模型覆盖说明：

- `openclaw cron add|edit --model ...` 更改作业的选定模型。
- 如果允许使用该模型，则该确切的提供商/模型会到达隔离的代理运行。
- 如果不允许该模型或无法解析，cron 将使运行失败，并返回明确的验证错误。
- 配置的回退链仍然适用，因为 cron `--model` 是作业主要设置，而不是会话 `/model` 覆盖。
- 负载 `fallbacks` 替换该作业的配置回退；`fallbacks: []` 禁用回退并使运行变为严格模式。
- 如果没有明确或配置的回退列表，则单纯的 `--model` 不会作为静默的额外重试目标回退到代理主要设置。

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

`maxConcurrentRuns` 限制计划的 cron 调度和隔离代理轮次执行，默认值为 8。隔离的 cron 代理轮次在内部使用队列专用的 `cron-nested`LLM 执行通道，因此提高此值允许独立的 cron LLM 运行并行进行，而不仅仅是启动其外部 cron 包装器。共享的非 cron `nested` 通道不会通过此设置加宽。

运行状态 sidecar 源自 `cron.store`：例如 `~/clawd/cron/jobs.json` 这样的 `.json` 存储使用 `~/clawd/cron/jobs-state.json`，而没有 `.json` 后缀的存储路径则附加 `-state.json`。

如果您手动编辑 `jobs.json`，请将 `jobs-state.json`OpenClaw 排除在源代码管理之外。OpenClaw 使用该伴随文件来处理待定槽位、活动标记、上次运行的元数据以及调度标识，该标识告知调度器何时对外部编辑的作业进行全新的 `nextRunAtMs`。

禁用 cron：`cron.enabled: false` 或 `OPENCLAW_SKIP_CRON=1`。

<AccordionGroup>
  <Accordion title="重试行为">
    **单次重试**：瞬态错误（速率限制、过载、网络、服务器错误）最多重试 3 次，采用指数退避。永久性错误立即禁用。

    **循环重试**：重试之间采用指数退避（30 秒到 60 分钟）。下一次成功运行后，退避会重置。

  </Accordion>
  <Accordion title="维护">
    `cron.sessionRetention`（默认为 `24h`）会清理隔离的运行会话条目。`cron.runLog.maxBytes` / `cron.runLog.keepLines` 会自动清理运行日志文件。
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
    - 运行输出中的 `reason: not-due` 表示已通过 `openclaw cron run <jobId> --due` 检查了手动运行，但作业尚未到期。

  </Accordion>
  <Accordion title="Cron 已触发但未投递">
    - 投递模式 `none` 表示不期望执行器回退发送。当聊天路由可用时，代理仍可使用 `message` 工具直接发送。
    - 投递目标缺失/无效 (`channel`/`to`) 表示已跳过出站操作。
    - 对于 Matrix，如果复制或遗留任务使用了小写的 `delivery.to` 房间 ID，则可能会失败，因为 Matrix 房间 ID 区分大小写。请编辑任务，使用从 Matrix 获取的确切 `!room:server` 或 `room:!room:server` 值。
    - 渠道授权错误 (`unauthorized`, `Forbidden`) 表示投递被凭据阻止。
    - 如果隔离运行仅返回静默令牌 (`NO_REPLY` / `no_reply`)，OpenClaw 将抑制直接出站投递，并抑制回退的排队摘要路径，因此不会向聊天回发任何内容。
    - 如果代理应该自行向用户发送消息，请检查任务是否具有可用路由 (`channel: "last"` 配合先前的聊天，或明确的渠道/目标)。

  </Accordion>
  <Accordion title="Cron 或心跳似乎阻止了 /new-style 轮换">
    - 每日和空闲重置的新鲜度不基于 `updatedAt`；请参阅 [会话管理](/zh/concepts/session#session-lifecycle)。
    - Cron 唤醒、心跳运行、执行通知和网管簿记可能会更新会话行以用于路由/状态，但它们不会延长 `sessionStartedAt` 或 `lastInteractionAt`。
    - 对于在这些字段存在之前创建的旧行，如果文件仍可用，OpenClaw 可以从转录 JSONL 会话标头中恢复 `sessionStartedAt`。没有 `lastInteractionAt` 的遗留空闲行将该恢复的开始时间用作其空闲基线。

  </Accordion>
  <Accordion title="时区注意事项">
    - 未指定 `--tz` 的 Cron 使用网关主机的时区。
    - 未指定时区的 `at` 计划将被视为 UTC。
    - 心跳 `activeHours` 使用配置的时区解析方式。

  </Accordion>
</AccordionGroup>

## 相关

- [自动化](/zh/automation) — 快速浏览所有自动化机制
- [后台任务](/zh/automation/tasks) — Cron 执行的任务账本
- [心跳](/zh/gateway/heartbeat) — 周期性的主会话轮次
- [时区](/zh/concepts/timezone) — 时区配置
