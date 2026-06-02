---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron?** 有关何时使用各自的指导，请参阅 [Automation](/zh/automation)。</Note>

Heartbeat 在主会话中运行**定期的 agent 轮次**，以便模型可以引起您对需要注意的事项的注意，而不会对您造成信息轰炸。

Heartbeat 是一个计划的会话轮次 — 它**不**创建 [background task](/zh/automation/tasks) 记录。任务记录用于分离的工作（ACP 运行、子代理、隔离的 cron 作业）。

故障排除：[Scheduled Tasks](/zh/automation/cron-jobs#troubleshooting)

## 快速开始（初学者）

<Steps>
  <Step title="选择频率">
    保持启用 heartbeat（默认为 `30m`，或者对于 Anthropic OAuth/token auth（包括 Claude CLI 复用）为 `1h`AnthropicOAuthCLI）或设置您自己的频率。
  </Step>
  <Step title="添加 HEARTBEAT.md（可选）">
    在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单或 `tasks:` 块。
  </Step>
  <Step title="决定 heartbeat 消息的去向">
    `target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人。
  </Step>
  <Step title="可选调整">
    - 启用 heartbeat 推理交付以提高透明度。
    - 如果 heartbeat 运行仅需要 `HEARTBEAT.md`，请使用轻量级引导上下文。
    - 启用隔离会话以避免每次 heartbeat 都发送完整的对话历史。
    - 将 heartbeat 限制在活动时间（本地时间）。

  </Step>
</Steps>

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
        skipWhenBusy: true, // optional: also defer when this agent's subagent or nested lanes are busy
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Thinking` message too
      },
    },
  },
}
```

## 默认值

- 间隔： `30m`（或者当检测到的身份验证模式为 Anthropic OAuth/token auth 时，包括 Claude CLI 复用，为 `1h`AnthropicOAuthCLI）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 以禁用。
- Prompt 正文（可通过 `agents.defaults.heartbeat.prompt` 配置）： `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 超时：未设置的心跳轮次在设置时使用 `agents.defaults.timeoutSeconds`。否则，它们使用上限为 600 秒的心跳间隔。请设置 `agents.defaults.heartbeat.timeoutSeconds` 或每个代理的 `agents.list[].heartbeat.timeoutSeconds` 以执行更长时间的心跳工作。
- 心跳提示将**逐字**作为用户消息发送。仅当为默认代理启用心跳且运行在内部被标记时，系统提示才会包含“Heartbeat”部分。
- 当使用 `0m` 禁用心跳时，正常运行也会从引导上下文中省略 `HEARTBEAT.md`，以使模型看不到仅限心跳的指令。
- 活动时间（`heartbeat.activeHours`）会在配置的时区中进行检查。在时间窗口之外，心跳将被跳过，直到窗口内的下一个时间刻度。
- 当 cron 工作处于活动或排队状态时，心跳会自动延迟。设置 `heartbeat.skipWhenBusy: true` 也可以使代理在其自己的会话键子代理或嵌套命令通道上延迟；同级代理不再仅仅因为另一个代理有正在运行的子代理工作而暂停。

## 心跳提示的用途

默认提示是有意保持宽泛的：

- **后台任务**：“Consider outstanding tasks”（考虑未完成的任务）会提示代理审查后续事项（收件箱、日历、提醒、排队工作）并突显任何紧急内容。
- **人工检查**：“Checkup sometimes on your human during day time”（有时在白天检查你的人类）会提示偶尔发送轻量级的“有什么你需要吗？”消息，但通过使用你配置的本地时区来避免夜间垃圾消息（请参阅 [Timezone](/zh/concepts/timezone)）。

心跳可以响应已完成的 [background tasks](/zh/automation/tasks)，但心跳运行本身不会创建任务记录。

如果你希望心跳执行非常具体的操作（例如“检查 Gmail PubSub 统计数据”或“验证网关运行状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应约定

- 如果没有任何事项需要注意，请回复 **`HEARTBEAT_OK`**。
- 具有工具调用能力的心跳运行可以改为调用带有 `notify: false` 的 `heartbeat_respond` 以不进行可见更新，或者调用 `notify: true` 加上 `notificationText` 以发送警报。当存在时，结构化工具响应优先于文本回退。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 将其视为确认。该标记会被去除，如果剩余内容**≤ `ackMaxChars`**（默认值：300），则该回复会被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**请勿**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头或结尾处的孤立的 `HEARTBEAT_OK` 会被去除并记录；如果消息仅包含 `HEARTBEAT_OK`，则该消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Thinking message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "imessage")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### 作用域和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在顶层进行合并；如果任何代理具有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号渠道）覆盖按渠道设置。

### 按代理心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅这些代理**运行心跳。按代理块在 `agents.defaults.heartbeat` 之上合并（因此您可以设置一次共享默认值，并针对每个代理进行覆盖）。

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

在此窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次计划心跳将正常运行。

### 全天候设置 (24/7 setup)

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>请勿将 `start` 和 `end` 设置为相同的时间（例如 `08:00` 到 `08:00`）。这将被视为零宽窗口，因此心跳将始终被跳过。</Warning>

### 多账户示例

使用 `accountId` 来定位多账户渠道（如 Telegram）上的特定账户：

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

<ParamField path="every" type="string">
  心跳间隔（时长字符串；默认单位 = 分钟）。
</ParamField>
<ParamField path="model" type="string">
  心跳运行的可选模型覆盖（`provider/model`）。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  启用后，如果存在单独的 `Thinking` 消息，也将其发送（形状与 `/reasoning on` 相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  为 true 时，心跳运行使用轻量级引导上下文，并仅保留工作区引导文件中的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  为 true 时，每次心跳在新的会话中运行，没有先前的对话历史。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的 token 成本。与 `lightContext: true` 结合使用以实现最大程度的节省。传递路由仍使用主会话上下文。
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  为 true 时，心跳运行会在该代理的其他繁忙通道上等待：其自身的基于会话键的子代理或嵌套命令工作。Cron 通道始终会让心跳等待，即使没有此标志，因此本地模型主机不会同时运行 cron 和心跳提示。
</ParamField>
<ParamField path="session" type="string">
  心跳运行的可选会话键。

- `main`（默认）：Agent 主会话。
- 显式会话密钥（从 `openclaw sessions --json`CLI 或 [sessions CLI](/zh/cli/sessions) 复制）。
- 会话密钥格式：请参阅 [Sessions](/zh/concepts/session) 和 [Groups](/zh/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `last`：发送到上次使用的外部渠道。
- 显式渠道：任何已配置的渠道或插件 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none`（默认）：运行心跳，但**不进行外部发送**。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制直接/私信发送行为。`allow`：允许直接/私信心跳发送。`block`：禁止直接/私信发送（`reason=dm-blocked`）。

</ParamField>
<ParamField path="to" type="string"WhatsAppTelegramTelegram>
  可选的接收者覆盖（特定于渠道的 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 主题/线程，请使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多账户渠道的可选账户 ID。当为 `target: "last"` 时，如果解析出的最后渠道支持账户，则账户 ID 适用于该渠道；否则将被忽略。如果账户 ID 与解析出的渠道的已配置账户不匹配，则跳过发送。

</ParamField>
<ParamField path="prompt" type="string">
  覆盖默认提示正文（不合并）。

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  `HEARTBEAT_OK` 之后发送前允许的最大字符数。

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  为 true 时，在 heartbeat 运行期间抑制工具错误警告载荷。

</ParamField>
<ParamField path="timeoutSeconds" type="number" default="global timeout or min(every, 600)">
  心跳代理轮次在被中止前允许的最大秒数。保持未设置以在设置时使用 `agents.defaults.timeoutSeconds`，否则心跳节奏上限为 600 秒。

</ParamField>
<ParamField path="activeHours" type="object">
  将心跳运行限制在时间窗口内。对象包含 `start`（HH:MM，包含；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；允许使用 `24:00` 表示一天的结束）和可选的 `timezone`。

- 省略或 `"user"`：如果设置了则使用您的 `agents.defaults.userTimezone`，否则回退到主机系统时区。
- `"local"`：始终使用主机系统时区。
- 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
- 对于活动窗口，`start` 和 `end` 不能相等；相等的值将被视为零宽度（始终在窗口外）。
- 在活动窗口之外，心跳将被跳过，直到窗口内的下一次跳动。

</ParamField>

## 交付行为

<AccordionGroup>
  <Accordion title="会话与目标路由">
    - 心跳默认在代理的主会话中运行 (`agent:<id>:<mainKey>`)，或者在 `session.scope = "global"` 时运行于 `global`。设置 `session` 以覆盖到特定的渠道会话 (Discord/WhatsApp/等)。
    - `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
    - 要投递到特定渠道/接收者，请设置 `target` + `to`。如果使用 `target: "last"`，投递将使用该会话的最后一个外部渠道。
    - 心跳投递默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在运行心跳轮次的同时抑制直接目标发送。
    - 如果主队列、目标会话通道、cron 通道或活动的 cron 作业正忙，心跳将被跳过并稍后重试。
    - 如果 `skipWhenBusy: true`，此代理的基于会话键的子代理和嵌套通道也会推迟心跳运行。其他代理的繁忙通道不会推迟此代理。
    - 如果 `target` 解析为无外部目标，运行仍会发生，但不会发送出站消息。

  </Accordion>
  <Accordion title="可见性与跳过行为">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 均被禁用，则运行将在开始时被跳过 (`reason=alerts-disabled`)。
    - 如果仅禁用了警报投递，OpenClaw 仍可运行心跳，更新到期任务时间戳，恢复会话空闲时间戳，并抑制向外的警报负载。
    - 如果解析出的心跳目标支持输入指示，OpenClaw 会在心跳运行期间显示输入指示。这使用与心跳发送聊天输出相同的目标，并会被 `typingMode: "never"` 禁用。

  </Accordion>
  <Accordion title="Session lifecycle and audit">
    - 仅含心跳的回复**不**会使会话保持活跃。心跳元数据可能会更新会话行，但空闲过期使用的是最后一条真实用户/渠道消息的 `lastInteractionAt`，而每日过期使用的是 `sessionStartedAt`。
    - 控制UI和WebChat历史记录会隐藏心跳提示和仅含OK的确认。底层会话记录仍可能包含这些轮次，以用于审计/回放。
    - 独立的[后台任务](/zh/automation/tasks)可以加入系统事件并在主会话需要快速注意到某些事情时唤醒心跳。该唤醒不会导致心跳运行后台任务。

  </Accordion>
</AccordionGroup>

## 可见性控制

默认情况下，在传递警报内容时会抑制 `HEARTBEAT_OK` 确认。您可以针对每个渠道或每个账户进行调整：

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

优先级：按账户 → 按渠道 → 渠道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅含OK的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非OK的回复时，发送警报内容。
- `useIndicator`：为UI状态表面发出指示器事件。

如果**所有三个**标志均为false，OpenClaw将完全跳过心跳运行（不调用模型）。

### 按渠道与按账户的示例

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

| 目标                         | 配置                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默OK，警报开启） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）           | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告知代理读取它。可以将其视为您的“心跳检查清单”：小型、稳定，并且可以每30分钟安全地进行考量。

在正常运行中，仅当为默认代理启用了心跳指导时，才会注入 `HEARTBEAT.md`。使用 `0m` 禁用心跳节奏或设置 `includeSystemPromptSection: false` 会将其从正常引导上下文中省略。

在原生 Codex 线束上，`HEARTBEAT.md` 内容不会注入到轮次中。如果文件存在且包含非空白内容，心跳协作模式指令会将 Codex 指向该文件，并告诉它在继续之前进行读取。

如果 `HEARTBEAT.md` 存在但实际为空（仅包含空行和类似 `# Heading`OpenClawAPI 的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。该跳过操作被报告为 `reason=empty-heartbeat-file`。如果文件缺失，心跳仍会运行，模型将决定做什么。

保持其极小（简短的清单或提醒）以避免提示膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小的结构化 `tasks:` 块，用于心跳内部的基于间隔的检查。

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

<AccordionGroup>
  <Accordion title="Behavior"OpenClaw>
    - OpenClaw 解析 `tasks:` 块，并根据其自己的 `interval` 检查每个任务。
    - 只有**到期**的任务才会包含在该时刻的心跳提示中。
    - 如果没有任务到期，则完全跳过心跳（`reason=no-tasks-due`）以避免浪费模型调用。
    - `HEARTBEAT.md` 中的非任务内容将被保留，并在到期任务列表之后作为附加上下文追加。
    - 任务的最后运行时间戳存储在会话状态（`heartbeatTaskState`）中，因此间隔可以在正常重启后保留。
    - 任务时间戳仅在心跳运行完成其正常回复路径后才会推进。跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

  </Accordion>
</AccordionGroup>

当您希望一个心跳文件包含多个定期检查，而不必为每个时刻的所有检查付费时，任务模式非常有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以 —— 如果你要求它这样做的话。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，所以你可以（在普通聊天中）告诉代理类似这样的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更简短并专注于收件箱后续跟进。”

如果你希望代理主动执行此操作，你也可以在心跳提示中包含一行明确的说明，例如：“如果清单变得陈旧，请用更好的清单更新 HEARTBEAT.md。”

<Warning>不要将机密信息（API 密钥、电话号码、私有令牌）放入 `HEARTBEAT.md` —— 它会成为提示上下文的一部分。</Warning>

## 手动唤醒（按需）

你可以将系统事件加入队列并使用以下方式触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒将立即运行每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的运行。

## 推理交付（可选）

默认情况下，心跳仅交付最终的“答案”有效负载。

如果你希望保持透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将交付一条以 `Thinking` 为前缀的单独消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/codexes 并且你想查看它决定 ping 你的原因时，这会很有用 —— 但这也可能泄露比预期更多的内部细节。建议在群聊中保持关闭。

## 成本意识

心跳运行完整的代理回合。间隔越短消耗的 token 越多。要降低成本：

- 使用 `isolatedSession: true` 以避免发送完整的对话历史（每次运行从约 100K token 降至约 2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果你只需要内部状态更新，请使用 `target: "none"`。

## 心跳后的上下文溢出

如果心跳之前在较小的本地模型（例如窗口大小为 32k 的 Ollama 模型）上留下了现有会话，并且下一个主会话轮次报告了上下文溢出，请将会话运行时模型重置回配置的主模型。当最后的运行时模型与配置的 `heartbeat.model` 匹配时，OpenClaw 的重置消息会指出这一点。

当前的心跳在运行完成后会保留共享会话的现有运行时模型。您仍然可以使用 `isolatedSession: true` 在新会话中运行心跳，将其与 `lightContext: true` 结合以获得最小的提示词，或者选择一个上下文窗口足够大的心跳模型以适应共享会话。

## 相关

- [自动化](/zh/automation) — 快速了解所有自动化机制
- [后台任务](/zh/automation/tasks) — 如何跟踪分离的工作
- [时区](/zh/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/zh/automation/cron-jobs#troubleshooting) — 调试自动化问题
