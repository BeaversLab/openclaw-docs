---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# 心跳（Gateway(网关) 网关）

> **Heartbeat 还是 Cron？** 请参阅 [自动化与任务](/en/automation) 了解有关何时使用各自的指导。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

Heartbeat 是一个按计划进行的主会话轮次——它**不会**创建[后台任务](/en/automation/tasks)记录。
任务记录用于分离的工作（ACP 运行、子代理、独立的 cron 作业）。

故障排除：[计划任务](/en/automation/cron-jobs#troubleshooting)

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
- Heartbeat 提示作为用户消息**逐字**发送。系统
  提示包含“Heartbeat”部分，且该运行在内部被标记。
- 活动时间（`heartbeat.activeHours`）会在配置的时区中进行检查。
  在时间窗口之外，将跳过 heartbeat，直到窗口内的下一次跳动。

## Heartbeat 提示的用途

默认提示故意设置得很宽泛：

- **后台任务**：“考虑未完成的任务”提示代理审查
  后续事项（收件箱、日历、提醒、排队的工作）并呈现任何紧急事项。
- **人工检查**：“Checkup sometimes on your human during day time”会偶尔发出轻量级的“anything you need？”消息，但通过使用您配置的本地时区避免夜间垃圾消息（请参阅 [/concepts/timezone](/en/concepts/timezone)）。

Heartbeat 可以对已完成的[后台任务](/en/automation/tasks)做出反应，但 heartbeat 运行本身不会创建任务记录。

如果您希望心跳执行非常特定的操作（例如“检查 Gmail PubSub 统计数据”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（按原样发送）。

## 响应约定

- 如果不需要关注任何内容，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认。该标记会被移除，如果剩余内容**≤ `ackMaxChars`**（默认值：300），则该回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**请勿**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头或结尾处孤立的 `HEARTBEAT_OK` 会被移除并记录；如果消息仅包含 `HEARTBEAT_OK`，则该消息会被丢弃。

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
- `agents.list[].heartbeat` 在顶部合并；如果有任何代理具有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖每个渠道的设置。

### Per-agent heartbeats

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅这些代理**运行心跳。每个代理块在 `agents.defaults.heartbeat` 之上合并（因此您可以设置一次共享默认值并针对每个代理进行覆盖）。

示例：两个 agents，只有第二个 agent 运行 heartbeat。

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

### Active hours example

将 heartbeat 限制在特定时区的工作时间内：

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

在此时间窗口之外（美东时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次预定刻度将正常运行。

### 24/7 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要设置相同的 `start` 和 `end` 时间（例如从 `08:00` 到 `08:00`）。这将被视为零宽度窗口，因此心跳总是被跳过。

### 多账号示例

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
- `model`：可选的心跳运行模型覆盖 (`provider/model`)。
- `includeReasoning`：启用时，如果有可用的单独 `Reasoning:` 消息，也会发送该消息（形状与 `/reasoning on` 相同）。
- `lightContext`：为 true 时，心跳运行使用轻量级启动上下文，并且仅保留工作区启动文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都在没有先前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的令牌成本。与 `lightContext: true` 结合使用以实现最大程度的节省。传递路由仍使用主会话上下文。
- `session`：心跳运行的可选会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 复制或使用 [sessions CLI](/en/cli/sessions)）。
  - 会话密钥格式：请参阅 [Sessions](/en/concepts/session) 和 [Groups](/en/channels/groups)。
- `target`：
  - `last`：投递到上次使用的外部渠道。
  - 显式渠道：任何已配置的渠道或插件 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（默认）：运行心跳但**不进行外部投递**。
- `directPolicy`：控制直接/私信投递行为：
  - `allow`（默认）：允许直接/私信心跳投递。
  - `block`：禁止直接/私信投递 (`reason=dm-blocked`)。
- `to`：可选的接收者覆盖（特定于渠道的 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 主题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账号渠道的可选账号 ID。当为 `target: "last"` 时，如果解析到的最后一个渠道支持账号，则该账号 ID 适用于该渠道；否则将其忽略。如果账号 ID 与解析到的渠道的配置账号不匹配，则跳过发送。
- `prompt`：覆盖默认的提示主体（不合并）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之后发送之前允许的最大字符数。
- `suppressToolErrorWarnings`：为 true 时，在心跳运行期间抑制工具错误警告负载。
- `activeHours`：将心跳运行限制在时间窗口内。包含 `start`（HH:MM，包含在内；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；`24:00` 允许用于一天结束）和可选的 `timezone` 的对象。
  - 省略或设置为 `"user"`：如果设置了，则使用您的 `agents.defaults.userTimezone`，否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - `start` 和 `end` 对于活动窗口不得相等；相等的值将被视为零宽度（始终在窗口外）。
  - 在活动窗口之外，心跳将被跳过，直到窗口内的下一个刻度。

## 投递行为

- 默认情况下，心跳在代理的主会话（`agent:<id>:<mainKey>`）中运行，或者当为 `session.scope = "global"` 时在 `global` 中运行。设置 `session` 以覆盖到特定的渠道会话（Discord/WhatsApp/等）。
- `session` 仅影响运行上下文；发送由 `target` 和 `to` 控制。
- 要发送到特定的渠道/接收者，请设置 `target` + `to`。对于 `target: "last"`，发送使用该会话的最后一个外部渠道。
- Heartbeat 投递默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在仍然运行 heartbeat 轮次的同时抑制直接目标的发送。
- 如果主队列繁忙，心跳将被跳过并稍后重试。
- 如果 `target` 解析为没有外部目标，运行仍会发生，但不会发送出站消息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 均被禁用，则该运行将作为 `reason=alerts-disabled` 在最开始被跳过。
- 如果仅禁用了告警投递，OpenClaw 仍然可以运行 heartbeat、更新待处理任务的时间戳、恢复会话空闲时间戳并抑制外部告警负载。
- 仅 Heartbeat 的回复**不**保持会话活跃；恢复最后的 `updatedAt` 以便空闲过期正常进行。
- 分离的[后台任务](/en/automation/tasks)可以排队系统事件，并在主会话需要快速注意到某些事情时唤醒 heartbeat。这种唤醒不会使 heartbeat 运行后台任务。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认在投递告警内容时会被抑制。您可以针对每个渠道或每个账户进行调整：

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
- `showAlerts`：当模型返回非 OK 的回复时，发送告警内容。
- `useIndicator`：为 UI 状态表面发出指示器事件。

如果**全部三个**都为 false，OpenClaw 将完全跳过 heartbeat 运行（不调用模型）。

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
| 默认行为（静默 OK，告警开启） | （无需配置）                                                                             |
| 完全静默（无消息，无指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md （可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示词会告知代理
读取它。可以将其视为您的“心跳检查清单”：短小、稳定，并且
可以安全地每 30 分钟包含一次。

如果 `HEARTBEAT.md` 存在但实际上是空的（仅包含空行和像 `# Heading` 这样的 markdown 标题），OpenClaw 会跳过此次心跳运行以节省 OpenClaw 调用。
该跳过操作会报告为 `reason=empty-heartbeat-file`。
如果文件丢失，心跳仍会运行，由模型决定做什么。

保持其短小（简短的检查清单或提醒）以避免提示词膨胀。

`HEARTBEAT.md` 示例：

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

- OpenClaw 解析 `tasks:` 代码块，并根据其自己的 `interval` 检查每个任务。
- 只有**到期**的任务才会包含在该次心跳的提示词中。
- 如果没有任务到期，心跳将被完全跳过 (`reason=no-tasks-due`)，以避免浪费模型调用。
- `HEARTBEAT.md` 中的非任务内容将被保留，并作为额外上下文追加在到期任务列表之后。
- 任务上次运行的时间戳存储在会话状态 (`heartbeatTaskState`) 中，因此间隔设置在正常重启后仍然有效。
- 任务时间戳仅在心跳运行完成其正常回复路径后才更新。被跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

当您希望一个心跳文件包含多个定期检查而又不想每次都为所有检查付费时，任务模式非常有用。

### 代理可以更新 HEARTBEAT.md 吗？

可以 — 如果您要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此您可以（在正常聊天中）
告诉代理一些类似这样的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更短，并专注于收件箱跟进。”

如果您希望主动执行此操作，还可以在心跳提示中包含一行明确的说明，例如：“如果检查清单变得陈旧，请用更好的检查清单更新 HEARTBEAT.md。”

安全提示：不要将机密信息（API 密钥、电话号码、私有令牌）放入 API keys，手机号码，私有令牌）放入 `HEARTBEAT.md` — 它将成为提示上下文的一部分。

## 手动唤醒（按需）

您可以加入一个系统事件并通过以下方式立即触发心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果配置了多个 `heartbeat` 的代理，手动唤醒将立即运行其中每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的刻度（tick）。

## 推理交付（可选）

默认情况下，心跳仅传递最终的“答案”有效载荷。

如果您希望提高透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将传递一条以 `Reasoning:` 为前缀的单独消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/代码库且您想查看其决定 ping 您的原因时，这非常有用 — 但这也可能会泄露比您想要的更多内部细节。建议在群组聊天中保持关闭状态。

## 成本意识

心跳运行完整的代理回合。间隔越短消耗的 Token 越多。为了降低成本：

- 使用 `isolatedSession: true` 以避免发送完整的对话历史（从每次运行约 100K Token 降至约 2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果您只希望更新内部状态，请使用 `target: "none"`。

## 相关

- [自动化与任务](/en/automation) — 所有自动化机制概览
- [后台任务](/en/automation/tasks) — 如何跟踪分离的工作
- [时区](/en/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/en/automation/cron-jobs#troubleshooting) — 调试自动化问题
