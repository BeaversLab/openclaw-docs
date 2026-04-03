---
summary: "心跳轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "心跳"
---

# 心跳（Gateway(网关) 网关）

> **Heartbeat vs Cron?** 有关何时使用它们的指南，请参阅 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

Heartbeat 是一个计划的主会话轮次 —— 它并**不**创建 [background task](/en/automation/tasks) 记录。
任务记录用于分离的工作（ACP 运行、子代理、独立的 cron 作业）。

故障排除：[/automation/故障排除](/en/automation/troubleshooting)

## 快速开始（初学者）

1. 保持启用 heartbeat（默认为 `30m`，对于 Anthropic OAuth/setup-token 则为 `1h`）或设置您自己的节奏。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单（可选但推荐）。
3. 确定 heartbeat 消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后一个联系人）。
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

- 间隔：`30m`（当检测到 Anthropic OAuth/setup-token 为认证模式时，则为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示作为用户消息**逐字**发送。系统
  提示包含“Heartbeat”部分，且该运行在内部被标记。
- 活跃时间（`heartbeat.activeHours`）在配置的时区中检查。
  在时间窗口之外，heartbeat 将被跳过，直到窗口内的下一次滴答。

## Heartbeat 提示的用途

默认提示故意设置得很宽泛：

- **后台任务**：“考虑未完成的任务”提示代理审查
  后续事项（收件箱、日历、提醒、排队的工作）并呈现任何紧急事项。
- **人工签到**：“白天偶尔检查一下你的人类”会偶尔发送一条轻量级的“有什么需要吗？”消息，但通过使用您配置的本地时区（请参阅 [/concepts/timezone](/en/concepts/timezone)）来避免夜间骚扰。

Heartbeat 可以对已完成的 [background tasks](/en/automation/tasks) 做出反应，但 heartbeat 运行本身不会创建任务记录。

如果您希望 heartbeat 执行非常具体的操作（例如“检查 Gmail PubSub 统计数据”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应约定

- 如果无需关注，请回复 **`HEARTBEAT_OK`**。
- 在 heartbeat 运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认。该 token 会被移除，如果剩余内容**≤ `ackMaxChars`**（默认值：300），则该回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在 heartbeat 之外，消息开头/结尾处多余的 `HEARTBEAT_OK` 会被移除并记录；如果消息仅包含 `HEARTBEAT_OK`，则该消息将被丢弃。

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

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.list[].heartbeat` 在其上进行合并；如果任何 agent 具有 `heartbeat` 块，则**仅那些 agents** 运行 heartbeat。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）覆盖按渠道设置。

### Per-agent heartbeats

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅那些 agents**
运行 heartbeat。Per-agent 块合并于 `agents.defaults.heartbeat`
之上（因此您可以设置一次共享默认值并按 agent 覆盖）。

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

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要设置相同的 `start` 和 `end` 时间（例如 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此心跳将始终被跳过。

### 多账号示例

使用 `accountId` 来定位多账号渠道（如 Telegram）上的特定账号：

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
- `model`：用于心跳运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用后，当有单独的 `Reasoning:` 消息可用时，也传递该消息（格式与 `/reasoning on` 相同）。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都在没有先前对话历史的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅降低每次心跳的 token 成本。与 `lightContext: true` 结合使用以实现最大程度节省。传递路由仍然使用主会话上下文。
- `session`：用于心跳运行的可选会话密钥。
  - `main`（默认）：agent 主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 复制或通过 [sessions CLI](/en/cli/sessions)）。
  - 会话密钥格式：参见 [Sessions](/en/concepts/session) 和 [Groups](/en/channels/groups)。
- `target`：
  - `last`：投递到最后使用的外部渠道。
  - 显式渠道：任何已配置的渠道或插件 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（默认）：运行心跳但**不向外部投递**。
- `directPolicy`：控制直接/私信投递行为：
  - `allow`（默认）：允许直接/私信心跳投递。
  - `block`：禁止直接/私信投递（`reason=dm-blocked`）。
- `to`：可选的收件人覆盖（特定渠道的 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 话题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账户渠道的可选账户 ID。当 `target: "last"` 时，如果解析到的最后一个渠道支持账户，则该账户 ID 适用于该渠道；否则将被忽略。如果账户 ID 与解析到的渠道的已配置账户不匹配，则跳过投递。
- `prompt`：覆盖默认提示主体（不合并）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之后、投递之前允许的最大字符数。
- `suppressToolErrorWarnings`：如果为 true，则在心跳运行期间抑制工具错误警告负载。
- `activeHours`：将心跳运行限制在时间窗口内。对象包含 `start`（HH:MM，包含在内；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；允许使用 `24:00` 表示一天的结束）和可选的 `timezone`。
  - 省略或 `"user"`：如果设置了 `agents.defaults.userTimezone`，则使用它；否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - `start` 和 `end` 在活动窗口中不得相等；相等的值将被视为零宽度（始终在窗口外）。
  - 在活动窗口之外，心跳将被跳过，直到窗口内的下一个刻度。

## 投递行为

- 默认情况下，心跳在代理的主会话中运行 (`agent:<id>:<mainKey>`)，
  或在 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖为
  特定渠道会话 (Discord/WhatsApp/等)。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要投递到特定渠道/接收者，请设置 `target` + `to`。使用
  `target: "last"` 时，投递使用该会话的最后一个外部渠道。
- 心跳投递默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在仍运行心跳轮次的同时抑制发送至直接目标。
- 如果主队列繁忙，心跳将被跳过并稍后重试。
- 如果 `target` 解析为没有外部目标，运行仍会发生，但不会
  发送出站消息。
- 仅心跳回复**不会**保持会话活动；将恢复最后的 `updatedAt`
  以使空闲过期正常工作。
- 分离的[后台任务](/en/automation/tasks) 可以将系统事件加入队列，并在主会话需要快速注意到某些情况时唤醒心跳。该唤醒不会使心跳运行后台任务。

## 可见性控制

默认情况下，投递警报内容时会抑制 `HEARTBEAT_OK` 确认。
您可以针对每个渠道或每个帐户进行调整：

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
- `useIndicator`：为 UI 状态界面发出指示器事件。

如果**所有三个**都为假，OpenClaw 将完全跳过心跳运行（不调用模型）。

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

| 目标                               | 配置                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默正常状态，开启警报） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器）       | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）                 | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道显示正常状态           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉
代理读取它。可以将其视为您的“心跳检查清单”：短小、稳定，
并且可以安全地每 30 分钟包含一次。

如果 `HEARTBEAT.md` 存在但实际上是空的（仅包含空行和 markdown
标头（如 `# Heading`）），OpenClaw 将跳过心跳运行以节省 API 调用。
如果文件丢失，心跳仍会运行，模型将决定做什么。

保持其短小（简短的检查清单或提醒）以避免提示膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 吗？

可以——如果您要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此您可以告诉
代理（在正常聊天中）类似的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更简短并专注于收件箱跟进。”

如果您希望主动发生这种情况，您还可以在
心跳提示中包含明确的行，例如：“如果检查清单变得陈旧，请用更好的内容更新 HEARTBEAT.md。”

安全提示：不要将机密信息（API 密钥、电话号码、私有令牌）放入
`HEARTBEAT.md` —— 它将成为提示上下文的一部分。

## 手动唤醒（按需）

您可以加入系统事件并使用以下方式触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒将立即运行
每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的刻度。

## 推理交付（可选）

默认情况下，心跳仅交付最终的“答案”负载。

如果您希望透明，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将发送一条单独的、前缀为
`Reasoning:` 的消息（形状与 `/reasoning on` 相同）。当代理
正在管理多个会话/代码库，且您想了解其决定向您 ping 的原因时，这很有用
—— 但这也可能会泄露超出您预期的更多内部细节。在群聊中，建议保持关闭状态。

## 成本意识

心跳运行完整的代理轮次。间隔越短，消耗的 token 越多。为降低成本：

- 使用 `isolatedSession: true` 以避免发送完整的对话历史（每次运行从约 100K token 降至约 2-5K）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果您只需要内部状态更新，请使用 `target: "none"`。

## 相关

- [自动化概述](/en/automation) — 一目了然的自动化机制
- [Cron 与心跳](/en/automation/cron-vs-heartbeat) — 何时使用哪种
- [后台任务](/en/automation/tasks) — 如何跟踪分离的工作
- [时区](/en/concepts/timezone) — 时区如何影响心跳调度
- [故障排除](/en/automation/troubleshooting) — 调试自动化问题
