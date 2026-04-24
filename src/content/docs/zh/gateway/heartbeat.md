---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# 心跳（Gateway(网关) 网关）

> **Heartbeat vs Cron？** 请参阅 [Automation & Tasks](/zh/automation) 以获取关于何时使用它们的指导。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

Heartbeat 是一个定期的主会话轮次——它**不会**创建 [background task](/zh/automation/tasks) 记录。
任务记录用于分离的工作（ACP 运行、子代理、独立的 cron 作业）。

故障排除：[Scheduled Tasks](/zh/automation/cron-jobs#troubleshooting)

## 快速开始（初学者）

1. 保持启用 heartbeat（默认为 `30m`，或者对于 Anthropic OAuth/token 身份验证（包括 Claude CLI 重用）为 `1h`）或设置您自己的节奏。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单或 `tasks:` 块（可选但推荐）。
3. 决定 heartbeat 消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人）。
4. 可选：启用 heartbeat 推理交付以提高透明度。
5. 可选：如果 heartbeat 运行只需要 `HEARTBEAT.md`，请使用轻量级引导上下文。
6. 可选：启用独立会话以避免每次 heartbeat 都发送完整的对话历史。
7. 可选：将 heartbeat 限制在活跃时间（本地时间）。

配置示例：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: only inject HEARTBEAT.md from bootstrap files
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（当检测到 Anthropic OAuth/token 身份验证模式，包括 Claude CLI 重用时，为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示词主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示词将作为用户消息**逐字**发送。仅当为默认代理启用了 heartbeat 时，系统提示词才会包含“Heartbeat”部分，并且运行会在内部被标记。
- 当使用 `0m` 禁用 heartbeat 时，正常运行也会从引导上下文中省略 `HEARTBEAT.md`，以便模型不会看到仅限 heartbeat 的指令。
- 活动时间 (`heartbeat.activeHours`) 会根据配置的时区进行检查。
  在该时间窗口之外，heartbeat 将被跳过，直到窗口内的下一个刻度。

## Heartbeat 提示词的用途

默认提示词是有意设定得比较宽泛的：

- **后台任务**：“考虑未完成的任务”会促使代理审查后续事项（收件箱、日历、提醒、排队的工作）并提出任何紧急事项。
- **Human check-in**：“Checkup sometimes on your human during day time”会偶尔推送一条轻量的“anything you need?”消息，但通过使用您配置的本地时区来避免夜间垃圾信息（请参阅 [/concepts/timezone](/zh/concepts/timezone)）。

Heartbeat 可以对已完成的 [background tasks](/zh/automation/tasks) 做出反应，但 Heartbeat 运行本身不会创建任务记录。

如果你希望 heartbeat 执行非常具体的操作（例如“检查 Gmail PubSub 统计信息”或“验证网关运行状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（将逐字发送）。

## 响应约定

- 如果需要注意，请回复 **`HEARTBEAT_OK`**。
- 在 heartbeat 运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认。该标记将被去除，如果剩余内容**≤ `ackMaxChars`**（默认值：300），则该回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，它不会
  被特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾处出现的零散 `HEARTBEAT_OK` 会被剥离
并记录；仅包含 `HEARTBEAT_OK` 的消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "bluebubbles")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### 范围和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在此基础上进行合并；如果任何代理拥有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号渠道）覆盖按渠道设置。

### 按代理的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅这些代理**
运行心跳。按代理块会在 `agents.defaults.heartbeat` 之上合并
（因此您可以设置一次共享默认值并按代理覆盖）。

示例：两个代理，仅第二个代理运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### 活跃时段示例

将心跳限制在特定时区的工作时间内：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

在此时间窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一个预定滴答将正常运行。

### 24/7 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要将 `start` 和 `end` 时间设置为相同（例如从 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此心跳总是被跳过。

### 多账号示例

使用 `accountId` 来定位 Telegram 等多账号渠道上的特定账号：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### 字段说明

- `every`：心跳间隔（持续时间字符串；默认单位 = 分钟）。
- `model`：心跳运行的可选模型覆盖 (`provider/model`)。
- `includeReasoning`：启用后，如果有可用的单独 `Reasoning:` 消息，也会发送它（形状与 `/reasoning on` 相同）。
- `lightContext`：如果为 true，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：如果为 true，每次心跳都在没有先前对话历史记录的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的 token 成本。与 `lightContext: true` 结合使用以最大程度节省成本。传递路由仍使用主会话上下文。
- `session`：心跳运行的可选会话密钥。
  - `main`（默认值）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 或 [sessions CLI](/zh/cli/sessions) 复制）。
  - 会话密钥格式：参见 [Sessions](/zh/concepts/session) 和 [Groups](/zh/channels/groups)。
- `target`：
  - `last`：发送到最后使用的外部渠道。
  - 显式渠道：任何已配置的渠道或插件 id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（默认值）：运行心跳但**不发送**到外部。
- `directPolicy`：控制直接/私信传递行为：
  - `allow`（默认值）：允许直接/私信心跳传递。
  - `block`：禁止直接/私信传递 (`reason=dm-blocked`)。
- `to`：可选的接收者覆盖（特定于渠道的 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id）。对于 Telegram 主题/线索，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账号渠道的可选账号 ID。当 `target: "last"` 时，账号 ID 应用于解析到的最后一个渠道（如果该渠道支持账号）；否则将被忽略。如果账号 ID 与解析到的渠道的已配置账号不匹配，则跳过投递。
- `prompt`：覆盖默认的提示词正文（不合并）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之后、投递之前允许的最大字符数。
- `suppressToolErrorWarnings`：如果为 true，则在心跳运行期间抑制工具错误警告负载。
- `activeHours`：将心跳运行限制在时间窗口内。对象包含 `start`（HH:MM，包含；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；允许使用 `24:00` 表示一天的结束）和可选的 `timezone`。
  - 省略或 `"user"`：如果已设置 `agents.defaults.userTimezone` 则使用它，否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - 对于活动窗口，`start` 和 `end` 不得相等；相等的值将被视为零宽度（始终在窗口外）。
  - 在活动窗口之外，心跳将被跳过，直到窗口内的下一次滴答。

## 投递行为

- 心跳默认在代理的主会话中运行（`agent:<id>:<mainKey>`），或者当 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖到特定渠道会话（Discord/WhatsApp/等）。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要发送到特定的渠道/收件人，请设置 `target` + `to`。使用 `target: "last"` 时，发送使用该会话的最后一个外部渠道。
- 心跳发送默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在仍运行心跳轮次的同时抑制直接目标的发送。
- 如果主队列繁忙，则跳过心跳并稍后重试。
- 如果 `target` 解析为没有外部目的地，运行仍会发生，但不会发送出站消息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 均被禁用，则该运行将被作为 `reason=alerts-disabled` 而预先跳过。
- 如果仅禁用了警报发送，OpenClaw 仍可运行心跳、更新到期任务时间戳、恢复会话空闲时间戳并抑制向外发送的警报有效载荷。
- 如果解析后的心跳目标支持正在输入，OpenClaw 会在心跳运行激活时显示正在输入。这使用与心跳发送聊天输出相同的目标，并且默认被 `typingMode: "never"` 禁用。
- 仅心跳回复**不**保持会话活跃；最后的 `updatedAt` 会被恢复，以便空闲超时正常工作。
- 分离的 [background tasks](/zh/automation/tasks) 可以将系统事件加入队列，并在主会话应注意某事时唤醒心跳。该唤醒不会导致心跳运行后台任务。

## 可见性控制

默认情况下，在传递警报内容时会抑制 `HEARTBEAT_OK` 确认。您可以针对每个渠道或每个帐户调整此项：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # Hide HEARTBEAT_OK (default)
      showAlerts: true # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

优先级：每帐户 → 每渠道 → 渠道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅 OK 的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 的回复时，发送警报内容。
- `useIndicator`：为 UI 状态表面发出指示器事件。

如果**这三个**都为假，OpenClaw 将完全跳过心跳运行（不调用模型）。

### 每渠道与每帐户示例

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # all Slack accounts
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suppress alerts for the ops account only
  telegram:
    heartbeat:
      showOk: true
```

### 常见模式

| 目标                          | 配置                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，开启警报） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中确认            | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告知代理
读取它。可以将其视为您的“心跳检查清单”：小巧、稳定，
并且每 30 分钟包含一次是安全的。

在正常运行中，只有当为默认代理启用心跳指导时，
才会注入 `HEARTBEAT.md`。使用 `0m` 禁用心跳节奏或
设置 `includeSystemPromptSection: false` 会将其从正常启动
上下文中省略。

如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。该跳过被报告为 `reason=empty-heartbeat-file`。如果文件丢失，心跳仍会运行，模型决定做什么。

保持其极小（简短的清单或提醒）以避免提示膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 代码块

`HEARTBEAT.md` 还支持一个小型的结构化 `tasks:` 代码块，用于心跳内部的基于间隔的检查。

示例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

行为：

- OpenClaw 解析 `tasks:` 代码块，并根据其自身的 `interval` 检查每个任务。
- 只有**到期**的任务才会包含在该心跳提示的该次周期中。
- 如果没有到期任务，心跳将被完全跳过 (`reason=no-tasks-due`)，以避免浪费模型调用。
- `HEARTBEAT.md` 中的非任务内容将被保留，并作为额外的上下文附加到到期任务列表之后。
- 任务的上次运行时间戳存储在会话状态 (`heartbeatTaskState`) 中，因此时间间隔可以在正常重启后保留。
- 任务时间戳仅在心跳运行完成其正常回复路径后才会推进。被跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

当您希望一个心跳文件包含多个定期检查，但又不想每次都为所有检查付费时，任务模式非常有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以——如果您要求它这样做的话。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此您可以（在普通聊天中）告诉
代理类似这样的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更简短并专注于收件箱跟进。”

如果您希望主动执行此操作，还可以在心跳提示中包含一行明确的说明，例如：“如果检查清单过时，请用更好的版本更新 HEARTBEAT.md。”

安全提示：请勿将机密信息（API 密钥、电话号码、私有令牌）放入 `HEARTBEAT.md` —— 它会成为提示上下文的一部分。

## 手动唤醒（按需）

您可以加入一个系统事件并使用以下命令触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果配置了多个 `heartbeat` 的代理，手动唤醒会立即运行其中每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的心跳。

## 推理交付（可选）

默认情况下，心跳仅传递最终的“答案”负载。

如果您希望提高透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还会发送一条单独的、前缀为 `Reasoning:` 的消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/代码库，且您希望了解其决定 ping 您的原因时，这会很有用——但它也可能泄露比您预期更多的内部细节。在群组聊天中，建议保持关闭状态。

## 成本意识

心跳会运行完整的代理轮次。较短的间隔会消耗更多的 token。为了降低成本：

- 使用 `isolatedSession: true` 以避免发送完整的对话历史记录（每次运行从约 100K token 降至约 2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果您仅希望更新内部状态，请使用 `target: "none"`。

## 相关

- [自动化与任务](/zh/automation) — 快速了解所有自动化机制
- [后台任务](/zh/automation/tasks) — 如何追踪分离的工作
- [时区](/zh/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/zh/automation/cron-jobs#troubleshooting) — 调试自动化问题
