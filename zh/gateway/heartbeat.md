---
summary: "心跳轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "心跳"
---

# 心跳（Gateway 网关）

> **Heartbeat vs Cron?** 有关何时使用每种方法的指导，请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## 快速入门（初学者）

1. 保持心跳启用（默认为 `30m`，对于 Anthropic OAuth/setup-token 则为 `1h`）或设置您自己的节奏。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单（可选但推荐）。
3. 决定心跳消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人）。
4. 可选：启用心跳推理传递以增加透明度。
5. 可选：如果心跳运行仅需要 `HEARTBEAT.md`，则使用轻量级引导上下文。
6. 可选：将心跳限制在活动时间（本地时间）内。

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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（当检测到 Anthropic OAuth/setup-token 为认证模式时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或逐代理设置 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- Prompt body（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示会作为用户消息**逐字**发送。系统提示包含“Heartbeat”部分，且该运行会在内部被标记。
- Active hours（`heartbeat.activeHours`）会在配置的时区中检查。
  在该时段之外，心跳将被跳过，直到该时段内的下一次跳动。

## 心跳提示的用途

默认提示故意设计得比较宽泛：

- **后台任务**：“Consider outstanding tasks”会提示智能体检查
  后续事项（收件箱、日历、提醒、排队的工作）并提出任何紧急事项。
- **人工检查**：“Checkup sometimes on your human during day time”会提示偶尔发送一条轻量级的“anything you need?”消息，但通过使用您配置的本地时区避免夜间骚扰（请参阅 [/concepts/timezone](/zh/concepts/timezone)）。

如果您希望心跳执行非常特定的任务（例如“check Gmail PubSub
stats”或“verify gateway health”），请将 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）设置为自定义正文（将逐字发送）。

## 响应约定

- 如果不需要关注任何内容，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，OpenClaw 将 `HEARTBEAT_OK` 视为确认信号，当其出现在回复的**开头或结尾**时。该标记会被剥离，如果剩余内容**≤ `ackMaxChars`**（默认值：300），则回复会被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会
  受到特殊处理。
- 对于警报，**切勿**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾的杂散 `HEARTBEAT_OK` 将被剥离
并记录；仅包含 `HEARTBEAT_OK` 的消息将被丢弃。

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

### 作用域和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在其上进行合并；如果任何代理具有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖按渠道设置。

### 按代理的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅这些代理**
运行心跳。按代理块在 `agents.defaults.heartbeat` 之上合并
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
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### 活跃时段示例

将心跳限制在特定时区的工作时间：

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

在此时间窗口之外（美东时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次预定滴答将正常运行。

### 24/7 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要设置相同的 `start` 和 `end` 时间（例如 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此心跳始终被跳过。

### 多账户示例

使用 `accountId` 来定位 Telegram 等多账户渠道中的特定账户：

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
- `includeReasoning`：启用后，还在可用时传递单独的 `Reasoning:` 消息（形状与 `/reasoning on` 相同）。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `session`：心跳运行的可选会话键。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 或 [sessions CLI](/zh/cli/sessions) 复制）。
  - 会话键格式：请参阅 [会话](/zh/concepts/session) 和 [组](/zh/channels/groups)。
- `target`：
  - `last`：发送到上次使用的外部渠道。
  - 显式渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（默认）：运行心跳但**不向外部发送**。
- `directPolicy`：控制直接/私信发送行为：
  - `allow`（默认）：允许直接/私信心跳发送。
  - `block`：禁止直接/私信发送 (`reason=dm-blocked`)。
- `to`：可选的接收者覆盖（特定于渠道的 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 话题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账号渠道的可选账号 ID。当 `target: "last"` 时，如果解析到的最后一个渠道支持账号，则该账号 ID 适用于该渠道；否则将被忽略。如果账号 ID 与解析到的渠道的已配置账号不匹配，则跳过发送。
- `prompt`：覆盖默认的提示词正文（不合并）。
- `ackMaxChars`：发送前 `HEARTBEAT_OK` 之后允许的最大字符数。
- `suppressToolErrorWarnings`：如果为 true，则在心跳运行期间抑制工具错误警告负载。
- `activeHours`：将心跳运行限制在时间窗口内。包含 `start`（HH:MM，包含；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；允许使用 `24:00` 表示一天的结束）和可选的 `timezone` 的对象。
  - 省略或 `"user"`：如果设置了您的 `agents.defaults.userTimezone` 则使用它，否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - 对于活动窗口，`start` 和 `end` 不能相等；相等的值将被视为零宽度（始终在窗口之外）。
  - 在活动窗口之外，心跳将被跳过，直到窗口内的下一次滴答。

## 发送行为

- 默认情况下，心跳在代理的主会话中运行 (`agent:<id>:<mainKey>`)，
  或在 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖为
  特定渠道会话（Discord/WhatsApp/等）。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要投递到特定渠道/接收者，请设置 `target` + `to`。使用
  `target: "last"` 时，投递将使用该会话的最后一个外部渠道。
- 心跳传递默认允许直接/私聊（私信）目标。设置 `directPolicy: "block"` 可以在仍运行心跳轮次的同时，抑制发送到直接目标。
- 如果主队列忙，心跳将被跳过并在稍后重试。
- 如果 `target` 解析为没有外部目标，运行仍然会发生，但不会
  发送出站消息。
- 仅限心跳的回复**不**会使会话保持活跃；会恢复最后的 `updatedAt`
  以使空闲过期正常运作。

## 可见性控制

默认情况下，在投递警报内容时会抑制 `HEARTBEAT_OK` 确认。您可以针对每个渠道或每个账户进行调整：

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

- `showOk`：当模型返回仅 OK 的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 的回复时，发送警报内容。
- `useIndicator`：为 UI 状态表面发出指示器事件。

如果**所有三个**均为 false，OpenClaw 将完全跳过本次心跳运行（不调用模型）。

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

| 目标                          | 配置                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，警报开启） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中发送 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告知
代理读取它。可以将其视为您的“心跳检查清单”：小巧、稳定，
并且每 30 分钟包含一次是安全的。

如果 `HEARTBEAT.md` 存在但实际上是空的（只有空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过心跳运行以节省 API 调用。如果文件缺失，心跳仍会运行，模型会决定做什么。

保持精简（简短的检查清单或提醒），以避免提示词膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 吗？

可以 —— 如果你要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，所以你可以在普通聊天中告诉代理类似这样的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更短，并专注于收件箱的后续跟进。”

如果你希望主动执行此操作，你也可以在心跳提示词中包含一行明确的指示，例如：“如果检查清单过时，用更好的版本更新 HEARTBEAT.md。”

安全提示：不要将机密信息（API 密钥、电话号码、私有令牌）放入 `HEARTBEAT.md` —— 它会成为提示词上下文的一部分。

## 手动唤醒（按需）

你可以将系统事件加入队列并使用以下命令触发即时心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒会立即运行每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的周期。

## 推理交付（可选）

默认情况下，心跳仅交付最终的“答案”有效载荷。

如果你希望透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将交付一条单独的以 `Reasoning:` 为前缀的消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/codex 时，这很有用，你想知道它为什么决定通知你 —— 但这也可能泄露比你想要的更多的内部细节。在群组聊天中最好保持关闭状态。

## 成本意识

Heartbeat 会运行完整的智能体轮次。间隔越短消耗的 token 就越多。请保持
`HEARTBEAT.md` 较小，如果您
只需要内部状态更新，请考虑使用更便宜的 `model` 或 `target: "none"`。

import zh from '/components/footer/zh.mdx';

<zh />
