---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron?** 请参阅 [Automation & Tasks](/zh/automation) 以获取有关何时使用每种功能的指导。</Note>

Heartbeat 在主会话中运行**定期的 agent 轮次**，以便模型可以引起您对需要注意的事项的注意，而不会对您造成信息轰炸。

Heartbeat 是一个计划的主会话轮次 —— 它**不会**创建 [background task](/zh/automation/tasks) 记录。任务记录用于分离的工作（ACP 运行、子 agent、隔离的 cron 作业）。

故障排除：[Scheduled Tasks](/zh/automation/cron-jobs#troubleshooting)

## 快速开始（初学者）

<Steps>
  <Step title="选择节奏">保持 heartbeat 启用（默认为 `30m`，或者对于 Anthropic Anthropic/token 认证，包括复用 Claude OAuth 时为 `1h`）或设置您自己的节奏。</Step>
  <Step title="添加 HEARTBEAT.md（可选）">在 agent 工作区中创建一个微型的 `HEARTBEAT.md` 检查清单或 `tasks:` 块。</Step>
  <Step title="确定 heartbeat 消息的去向">`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人。</Step>
  <Step title="可选调整">- 启用 heartbeat 推理交付以提高透明度。 - 如果 heartbeat 运行只需要 `HEARTBEAT.md`，则使用轻量级引导上下文。 - 启用隔离会话以避免每次 heartbeat 都发送完整的对话历史记录。 - 将 heartbeat 限制在活跃时间内（本地时间）。</Step>
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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（或者在检测到 Anthropic OAuth/token 认证模式时为 `1h`，包括复用 Claude CLI）。设置 `agents.defaults.heartbeat.every` 或每个 agent 的 `agents.list[].heartbeat.every`；使用 `0m` 进行禁用。
- 提示词正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示会作为用户消息**逐字**发送。仅当为默认代理启用心跳时，系统提示中才会包含“心跳”部分，并且该运行会在内部被标记。
- 当使用 `0m` 禁用心跳时，正常运行也会从引导上下文中省略 `HEARTBEAT.md`，以便模型看不到仅限心跳的指令。
- 活动时间（`heartbeat.activeHours`）会在配置的时区中进行检查。在时间窗口之外，心跳将被跳过，直到窗口内的下一次检查。

## 心跳提示的作用

默认提示是有意宽泛的：

- **后台任务**：“考虑未完成的任务”会推动代理审查后续工作（收件箱、日历、提醒、排队工作）并提出任何紧急事项。
- **人工检查**：“白天有时检查你的人类”会推动偶尔发送轻量级的“你需要什么吗？”消息，但通过使用你配置的本地时区避免夜间垃圾信息（参见[时区](/zh/concepts/timezone)）。

心跳可以对已完成的[后台任务](/zh/automation/tasks)做出反应，但心跳运行本身不会创建任务记录。

如果你希望心跳执行非常具体的操作（例如“检查 Gmail PubSub 统计数据”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应约定

- 如果没有任何需要注意的事情，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认。该标记将被去除，如果剩余内容**≤ `ackMaxChars`**（默认：300），则回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾处出现的杂散 `HEARTBEAT_OK` 将被去除并记录；仅包含 `HEARTBEAT_OK` 的消息将被丢弃。

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
- `agents.list[].heartbeat` 合并在其上；如果任何 agent 包含 `heartbeat` 块，**只有这些 agent** 会运行心跳。
- `channels.defaults.heartbeat` 设置所有渠道的默认可见性。
- `channels.<channel>.heartbeat` 覆盖渠道默认设置。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号渠道）覆盖特定渠道的设置。

### 按 Agent 的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，**只有这些 agent** 会运行心跳。按 agent 的块会合并在 `agents.defaults.heartbeat` 之上（因此您可以设置一次共享默认值并按 agent 覆盖）。

示例：两个 agent，只有第二个 agent 运行心跳。

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

在此时间窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次预定 tick 将正常运行。

### 全天候 (24/7) 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>不要设置相同的 `start` 和 `end` 时间（例如 `08:00` 到 `08:00`）。这将被视为零宽度窗口，因此心跳总是会被跳过。</Warning>

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

### 实地笔记

<ParamField path="every" type="string">
  心跳间隔（持续时间字符串；默认单位 = 分钟）。
</ParamField>
<ParamField path="model" type="string">
  心跳运行的可选模型覆盖（`provider/model`）。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  启用后，当有单独的 `Reasoning:` 消息可用时也进行传递（形状与 `/reasoning on` 相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  为 true 时，心跳运行使用轻量级启动上下文，并且仅保留工作区启动文件中的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  为 true 时，每次心跳都在没有先前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的 token 成本。与 `lightContext: true` 结合使用以实现最大节省。传递路由仍使用主会话上下文。
</ParamField>
<ParamField path="session" type="string">
  心跳运行的可选会话密钥。

- `main`（默认）：代理主会话。
- 显式会话密钥（从 `openclaw sessions --json` 或 [sessions CLI](/zh/cli/sessions) 复制）。
- 会话密钥格式：请参阅 [会话](/zh/concepts/session) 和 [组](/zh/channels/groups)。
  </ParamField>
<ParamField path="target" type="string">
- `last`：发送到上次使用的外部渠道。
- 显式渠道：任何已配置的渠道或插件 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none` (默认): 运行心跳但**不向外发送**。

  </ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
控制直发/私信发送行为。`allow`: 允许直发/私信心跳发送。`block`: 禁止直发/私信发送 (`reason=dm-blocked`)。
</ParamField>
<ParamField path="to" type="string">
可选的接收者覆盖（特定于渠道的 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id）。对于 Telegram 话题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
</ParamField>
<ParamField path="accountId" type="string">
多账户渠道的可选账户 id。当为 `target: "last"` 时，账户 id 应用于解析出的最后一个渠道（如果该渠道支持账户）；否则将被忽略。如果账户 id 与解析出的渠道的已配置账户不匹配，则跳过发送。
</ParamField>
<ParamField path="prompt" type="string">
覆盖默认的提示词主体（不进行合并）。
</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
在 `HEARTBEAT_OK` 之后、发送之前允许的最大字符数。
</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
为 true 时，在心跳运行期间禁止工具错误警告载荷。
</ParamField>
<ParamField path="activeHours" type="object">
将心跳运行限制在时间窗口内。对象包含 `start` (HH:MM，包含；使用 `00:00` 表示一天的开始)、`end` (HH:MM，不包含；允许使用 `24:00` 表示一天的结束) 和可选的 `timezone`。

- 如果省略或为 `"user"`: 如果设置了 `agents.defaults.userTimezone` 则使用它，否则回退到主机系统时区。
- `"local"`: 始终使用主机系统时区。
- 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
- 对于活动窗口，`start` 和 `end` 必须不相等；相等的值将被视为零宽度（始终在窗口之外）。
- 在活动窗口之外，跳过心跳直到窗口内的下一次计时。
  </ParamField>

## 投递行为

<AccordionGroup>
  <Accordion title="Session and target routing">
    - 心跳默认在代理的主会话中运行（`agent:<id>:<mainKey>`），或者在 `session.scope = "global"` 时运行 `global`。设置 `session` 以覆盖到特定的渠道会话（Discord/WhatsApp/etc.）。
    - `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
    - 要投递到特定渠道/接收者，请设置 `target` + `to`。使用 `target: "last"` 时，投递将使用该会话的最后一个外部渠道。
    - 心跳投递默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在仍然运行心跳轮次的同时抑制直接目标发送。
    - 如果主队列忙碌，则跳过心跳并在稍后重试。
    - 如果 `target` 解析为没有外部目的地，运行仍然会发生，但不会发送出站消息。
  </Accordion>
  <Accordion title="可见性和跳过行为">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 均被禁用，该运行将作为 `reason=alerts-disabled` 在最开始被跳过。
    - 如果仅禁用了警报传递，OpenClaw 仍可运行心跳，更新到期任务时间戳，恢复会话空闲时间戳，并抑制向外的警报负载。
    - 如果解析出的心跳目标支持正在输入，则在心跳运行处于活动状态时，OpenClaw 会显示正在输入。这使用与心跳将发送聊天输出相同的目标，并且由 `typingMode: "never"` 禁用。
  </Accordion>
  <Accordion title="会话生命周期和审计">
    - 仅心跳的回复并**不**保持会话活跃。心跳元数据可能会更新会话行，但空闲过期使用来自最后一条真实用户/渠道消息的 `lastInteractionAt`，而每日过期使用 `sessionStartedAt`。
    - 控制UI和 WebChat 历史记录会隐藏心跳提示和仅OK的确认。底层会话记录仍可能包含这些轮次以供审计/重放。
    - 分离的[后台任务](/zh/automation/tasks)可以加入系统事件并在主会话应快速注意某些事项时唤醒心跳。该唤醒不会使心跳运行成为后台任务。
  </Accordion>
</AccordionGroup>

## 可见性控制

默认情况下，在传递警报内容时会抑制 `HEARTBEAT_OK` 确认。您可以对每个渠道或每个帐户进行调整：

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

优先级：每个帐户 → 每个渠道 → 渠道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅OK的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非OK的回复时，发送警报内容。
- `useIndicator`：为UI状态表面发出指示器事件。

如果**三者全部**为假，OpenClaw 将完全跳过心跳运行（不调用模型）。

### 每个渠道与每个帐户的示例

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
| 默认行为（静默OK，警报开启） | （无需配置）                                                                             |
| 完全静默（无消息，无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）           | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示 OK        | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉代理读取它。你可以将其视为你的“心跳检查清单”：简短、稳定，并且可以安全地每 30 分钟包含一次。

在正常运行中，仅当为默认代理启用了心跳引导时，才会注入 `HEARTBEAT.md`。使用 `0m` 禁用心跳节奏或设置 `includeSystemPromptSection: false` 会将其从正常的引导上下文中省略。

如果 `HEARTBEAT.md` 存在但实际上为空（仅包含空行和如 `# Heading` 之类的 markdown 标题），OpenClaw 将跳过心跳运行以节省 API 调用。该跳过操作将报告为 `reason=empty-heartbeat-file`。如果文件丢失，心跳仍会运行，模型将决定要做什么。

保持其内容微小（简短的检查清单或提醒），以避免提示膨胀。

`HEARTBEAT.md` 示例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小型的结构化 `tasks:` 块，用于心跳内部的基于间隔的检查。

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
  <Accordion title="Behavior">
    - OpenClaw 解析 `tasks:` 块，并根据其自己的 `interval` 检查每个任务。 - 只有**到期**的任务才会包含在该次心跳的提示中。 - 如果没有任务到期，则完全跳过心跳（`reason=no-tasks-due`），以避免浪费模型调用。 - `HEARTBEAT.md` 中的非任务内容将被保留，并在到期任务列表之后作为附加上下文追加。 - 任务的最后运行时间戳存储在会话状态（`heartbeatTaskState`）中，因此间隔可以在正常重启后保留。 -
    只有在心跳运行完成其正常回复路径后，任务时间戳才会前进。跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。
  </Accordion>
</AccordionGroup>

当你希望一个心跳文件包含多个定期检查，但又不想在每次跳动时为所有检查付费时，任务模式非常有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以 —— 如果你要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，所以你可以（在正常聊天中）告诉代理类似这样的话：

- "更新 `HEARTBEAT.md` 以添加每日日历检查。"
- "重写 `HEARTBEAT.md`，使其更简短并专注于收件箱跟进。"

如果你希望代理主动执行此操作，你也可以在心跳提示中包含一行明确的指令，例如：“如果检查清单变得过时，请用更好的版本更新 HEARTBEAT.md。”

<Warning>不要将机密信息（API 密钥、电话号码、私人令牌）放入 `HEARTBEAT.md` —— 它会成为提示上下文的一部分。</Warning>

## 手动唤醒（按需）

你可以将系统事件加入队列并通过以下方式触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒将立即运行每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的跳动。

## 推理传递（可选）

默认情况下，心跳仅传递最终的“答案”有效载荷。

如果你希望提高透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将传递一条以 `Reasoning:` 为前缀的单独消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/代码库并且你想了解它决定 ping 你的原因时，这很有用 —— 但这也可能会泄露比你想要的更多的内部细节。建议在群聊中保持关闭状态。

## 成本意识

心跳运行完整的代理轮次。间隔越短消耗的 token 越多。要降低成本：

- 使用 `isolatedSession: true` 避免发送完整的对话历史（每次运行从约 100K token 降至约 2-5K token）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果你只想要内部状态更新，请使用 `target: "none"`。

## 相关内容

- [Automation & Tasks](/zh/automation) — 一目了然的所有自动化机制
- [Background Tasks](/zh/automation/tasks) — 如何跟踪分离的工作
- [Timezone](/zh/concepts/timezone) — 时区如何影响心跳调度
- [Troubleshooting](/zh/automation/cron-jobs#troubleshooting) — 自动化问题的调试
