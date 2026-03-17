---
summary: "心跳轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "心跳"
---

# 心跳（Gateway 网关）

> **Heartbeat vs Cron？** 请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 以获取有关何时使用各自的指导。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## 快速入门（初学者）

1. 保持心跳启用（默认为 `30m`，对于 Anthropic OAuth/setup-token 则为 `1h`）或设置您自己的节奏。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单（可选但推荐）。
3. 决定心跳消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人）。
4. 可选：启用心跳推理传递以增加透明度。
5. 可选：如果心跳运行仅需要 `HEARTBEAT.md`，则使用轻量级引导上下文。
6. 可选：启用隔离会话以避免每次心跳时发送完整的对话历史记录。
7. 可选：将心跳限制在活动时间内（本地时间）。

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

- 间隔：`30m`（或当检测到的身份验证模式为 Anthropic OAuth/setup-token 时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示词主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示词将**逐字**作为用户消息发送。系统提示词包含“Heartbeat”部分，且运行在内部被标记。
- 活动时间（`heartbeat.activeHours`）会在配置的时区中检查。
  在时间窗口外，心跳将被跳过，直到窗口内的下一个刻度。

## 心跳提示词的用途

默认提示词有意设计得很宽泛：

- **后台任务**：“Consider outstanding tasks”提示代理查看
  后续工作（收件箱、日历、提醒、排队的工作）并突出显示任何紧急事项。
- **人工检查**：“Checkup sometimes on your human during day time”会提示偶尔发送
  一条轻松的“anything you need?”消息，但通过使用您配置的本地时区来避免夜间垃圾信息
  （请参阅 [/concepts/timezone](/zh/concepts/timezone)）。

如果您希望心跳执行非常具体的操作（例如“检查 Gmail PubSub
统计数据”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）设置为自定义主体（逐字发送）。

## 响应约定

- 如果不需要关注，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的
  **开头或结尾**时，OpenClaw 会将其视为确认。该标记会被移除，如果剩余内容
  **≤ `ackMaxChars`**（默认：300），则回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**请勿**包含 `HEARTBEAT_OK`；仅返回警报文本。

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

### 范围与优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在此基础上合并；如果任何代理具有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖单渠道设置。

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

### 活跃时间示例

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

在此窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内下一次计划的滴答将正常运行。

### 24/7 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要设置相同的 `start` 和 `end` 时间（例如 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此心跳始终被跳过。

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

- `every`：心跳间隔（持续时间字符串；默认单位 = 分钟）。
- `model`：心跳运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用后，如果可用，还会传递单独的 `Reasoning:` 消息（形状与 `/reasoning on` 相同）。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都在一个新的会话中运行，没有先前的对话历史记录。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的 token 成本。结合 `lightContext: true` 使用以实现最大程度的节省。传递路由仍使用主会话上下文。
- `session`：心跳运行的可选会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 复制或从 [sessions CLI](/zh/cli/sessions) 复制）。
  - 会话密钥格式：请参阅 [Sessions](/zh/concepts/session) 和 [Groups](/zh/channels/groups)。
- `target`：
  - `last`：传递到上次使用的外部渠道。
  - 显式渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（默认）：运行心跳但**不要在外部传递**。
- `directPolicy`：控制直接/私信传递行为：
  - `allow`（默认）：允许直接/私信心跳传递。
  - `block`：禁止直接/私信传递（`reason=dm-blocked`）。
- `to`：可选的收件人覆盖（特定于渠道的 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id）。对于 Telegram 话题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`: 多账户渠道的可选账户 ID。当 `target: "last"` 时，如果解析到的最后一个渠道支持账户，则该账户 ID 适用于该渠道；否则将被忽略。如果账户 ID 与解析渠道的已配置账户不匹配，则跳过投递。
- `prompt`: 覆盖默认的提示正文（不合并）。
- `ackMaxChars`: 在 `HEARTBEAT_OK` 之后、投递之前允许的最大字符数。
- `suppressToolErrorWarnings`: 为 true 时，抑制心跳运行期间的工具错误警告负载。
- `activeHours`: 将心跳运行限制在特定时间窗口内。包含 `start` (HH:MM，包含；使用 `00:00` 表示一天的开始)、`end` (HH:MM，不包含；允许使用 `24:00` 表示一天的结束) 和可选的 `timezone` 的对象。
  - 省略或 `"user"`: 如果设置了 `agents.defaults.userTimezone`，则使用它，否则回退到主机系统时区。
  - `"local"`: 始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - 对于活动窗口，`start` 和 `end` 不得相等；相等的值被视为零宽度（始终在窗口之外）。
  - 在活动窗口之外，将跳过心跳，直到窗口内的下一次跳数。

## 投递行为

- 心跳默认在代理的主会话（`agent:<id>:<mainKey>`）中运行，或者在 `session.scope = "global"` 时在 `global` 中运行。设置 `session` 以覆盖到特定的渠道会话（Discord/WhatsApp/etc.）。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要投递到特定的渠道/接收者，请设置 `target` + `to`。使用
  `target: "last"` 时，投递将使用该会话的最后一个外部渠道。
- 默认情况下，心跳投递允许直接/私信目标。设置 `directPolicy: "block"` 可以在继续运行心跳轮次的同时禁止直接目标发送。
- 如果主队列繁忙，心跳将被跳过并在稍后重试。
- 如果 `target` 解析为无外部目标，运行仍会发生，但不会
  发送出站消息。
- 仅心跳的回复**不会**保持会话活跃；将恢复上一个 `updatedAt`
  以使空闲过期正常工作。

## 可见性控制

默认情况下，在投递警报内容时会抑制 `HEARTBEAT_OK` 确认。
您可以针对每个渠道或每个账户进行调整：

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

如果**这三个全部**为 false，OpenClaw 将完全跳过心跳运行（不调用模型）。

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
| 默认行为（静默 OK，开启警报） | （无需配置）                                                                             |
| 完全静默（无消息，无指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉
代理阅读它。可以将其视为您的“心跳检查清单”：短小、稳定，并且
可以安全地每 30 分钟包含一次。

如果 `HEARTBEAT.md` 存在但实际上为空（仅包含空行和 `# Heading` 等 markdown
标题），OpenClaw 将跳过心跳运行以节省 API 调用。
如果文件缺失，心跳仍会运行，由模型决定做什么。

保持简短（简短的检查清单或提醒）以避免提示词膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 吗？

可以 —— 如果你要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此你可以在正常聊天中告诉
代理类似这样的内容：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更简短，并专注于收件箱后续跟进。”

如果你希望代理主动执行此操作，还可以在心跳提示中包含一行明确的说明，例如：
“如果检查清单变得过时，请用更好的版本更新 HEARTBEAT.md。”

安全提示：不要将机密信息（API 密钥、电话号码、私有令牌）放入
`HEARTBEAT.md` —— 它将成为提示词上下文的一部分。

## 手动唤醒（按需）

你可以将系统事件加入队列并使用以下方法触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒将立即运行这些代理的
每一个心跳。

使用 `--mode next-heartbeat` 等待下一次计划的触发。

## 推理传递（可选）

默认情况下，心跳仅传递最终的“答案”有效负载。

如果你希望增加透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将传递一条单独的消息，前缀为
`Reasoning:`（形状与 `/reasoning on` 相同）。当代理
管理多个会话/codex 且你想了解它决定通知你的原因时，这会很有用
—— 但它也可能泄露比你想要的更多的内部细节。建议在群组聊天中将其保持关闭状态。

## 成本意识

心跳运行完整的代理轮次。间隔越短，消耗的令牌越多。为了降低成本：

- 使用 `isolatedSession: true` 避免发送完整的对话历史记录（每次运行从约 100K 令牌减少到约 2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 简短。
- 如果你只想要内部状态更新，请使用 `target: "none"`。

import zh from "/components/footer/zh.mdx";

<zh />
