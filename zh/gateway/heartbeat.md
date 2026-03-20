---
summary: "Heartbeat 轮询消息和通知规则"
read_when:
  - 调整 Heartbeat 频率或消息
  - 在计划任务中决定使用 heartbeat 还是 cron
title: "Heartbeat"
---

# Heartbeat (Gateway(网关))

> **Heartbeat vs Cron?** 有关何时使用哪种方法的指导，请参阅 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)。

Heartbeat 在主会话中运行**定期的代理轮次**，以便模型可以在不骚扰您的情况下引起您对需要注意的事项的注意。

故障排除：[/automation/故障排除](/zh/automation/troubleshooting)

## 快速开始（初学者）

1. 保持启用 heartbeat（默认为 `30m`，对于 Anthropic OAuth/setup-token 则为 `1h`）或设置您自己的频率。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 清单（可选但建议）。
3. 确定 heartbeat 消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后联系人）。
4. 可选：启用 heartbeat 推理传递以提高透明度。
5. 可选：如果 heartbeat 运行只需要 `HEARTBEAT.md`，请使用轻量级引导上下文。
6. 可选：启用独立会话，以避免每次 heartbeat 时发送完整的对话历史记录。
7. 可选：将 heartbeat 限制在活动时间内（本地时间）。

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

- 间隔：`30m`（当检测到的身份验证模式为 Anthropic OAuth/setup-token 时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示作为用户消息**逐字**发送。系统提示包含“Heartbeat”部分，并且该运行在内部被标记。
- 活动时间（`heartbeat.activeHours`）在配置的时区中检查。
  在时间窗口之外，将跳过 heartbeat，直到窗口内的下一个刻度。

## Heartbeat 提示的用途

默认提示是有意宽泛的：

- **后台任务**：“Consider outstanding tasks”提示代理审查后续工作（收件箱、日历、提醒、排队的任务）并提出任何紧急事项。
- **人工检查**：“Checkup sometimes on your human during day time”会促使代理偶尔发送一条轻量级的“anything you need?”消息，但通过使用您配置的本地时区避免夜间垃圾消息（请参阅 [/concepts/timezone](/zh/concepts/timezone)）。

如果您希望心跳执行非常特定的操作（例如“check Gmail PubSub stats”或“verify gateway health”），请将 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）设置为自定义正文（按原样发送）。

## 响应合约

- 如果无需关注，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 会将其视为确认。该标记会被移除，如果剩余内容**≤ `ackMaxChars`**（默认：300），则该回复将被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会对其进行特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾处出现的孤立的 `HEARTBEAT_OK` 会被移除并记录；如果消息仅包含 `HEARTBEAT_OK`，则该消息会被丢弃。

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
- `agents.list[].heartbeat` 合并在其上；如果任何代理具有 `heartbeat` 块，则**仅这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号渠道）覆盖按渠道设置。

### 按代理的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，则**仅这些代理**
运行心跳。按代理块合并在 `agents.defaults.heartbeat` 之上
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

将心跳限制在特定时区的营业时间内：

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

在此窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次计划运行将正常进行。

### 24/7 设置

如果您希望心跳全天运行，请使用以下模式之一：

- 完全省略 `activeHours`（无时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要将 `start` 和 `end` 设置为相同的时间（例如 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此心跳总是会被跳过。

### 多账户示例

使用 `accountId` 针对 Telegram 等多账户渠道上的特定账户：

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

- `every`：心跳间隔（时长字符串；默认单位 = 分钟）。
- `model`：心跳运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用后，也会在可用时传送单独的 `Reasoning:` 消息（形状与 `/reasoning on` 相同）。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳都在没有先前对话历史记录的新会话中运行。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。大幅减少每次心跳的 token 成本。结合 `lightContext: true` 以实现最大程度的节省。传送路由仍然使用主会话上下文。
- `session`：心跳运行的可选会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 复制或从 [sessions CLI](/zh/cli/sessions) 获取）。
  - 会话密钥格式：请参阅 [会话](/zh/concepts/session) 和 [组](/zh/channels/groups)。
- `target`：
  - `last`: 投递到上次使用的外部渠道。
  - 显式渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（默认）：运行心跳但**不进行外部投递**。
- `directPolicy`：控制直接/私信投递行为：
  - `allow`（默认）：允许直接/私信心跳投递。
  - `block`：禁止直接/私信投递（`reason=dm-blocked`）。
- `to`：可选的收件人覆盖设置（特定渠道 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 主题/话题，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：用于多渠道账户的可选账户 ID。当 `target: "last"` 时，如果解析出的最后一个渠道支持账户，则账户 ID 应用于该渠道；否则将忽略。如果账户 ID 与解析出的渠道的已配置账户不匹配，则跳过投递。
- `prompt`：覆盖默认提示正文（不合并）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之后投递前允许的最大字符数。
- `suppressToolErrorWarnings`：如果为 true，则在心跳运行期间抑制工具错误警告有效载荷。
- `activeHours`：将心跳运行限制在时间窗口内。包含 `start`（HH:MM，包含；使用 `00:00` 表示一天的开始）、`end`（HH:MM，不包含；允许使用 `24:00` 表示一天的结束）和可选的 `timezone` 的对象。
  - 省略或 `"user"`：如果已设置，则使用您的 `agents.defaults.userTimezone`，否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任何 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上述 `"user"` 行为。
  - 对于活动窗口，`start` 和 `end` 不得相等；相等的值将被视为零宽度（始终在窗口之外）。
  - 在活动窗口之外，心跳将被跳过，直到窗口内的下一次滴答。

## 投递行为

- 心跳默认在代理的主会话（`agent:<id>:<mainKey>`）中运行，或者在 `session.scope = "global"` 时在 `global` 中运行。设置 `session` 以覆盖到特定的渠道会话（Discord/WhatsApp/等）。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要投递到特定渠道/接收者，请设置 `target` + `to`。使用 `target: "last"` 时，投递使用该会话的最后一个外部渠道。
- 心跳投递默认允许直接/私信目标。设置 `directPolicy: "block"` 以在仍运行心跳轮次的同时抑制直接目标发送。
- 如果主队列繁忙，心跳将被跳过并在稍后重试。
- 如果 `target` 解析为无外部目标，运行仍会发生，但不会发送出站消息。
- 仅心跳回复并**不**保持会话活跃；将恢复最后的 `updatedAt`，以便空闲过期正常工作。

## 可见性控制

默认情况下，在投递警报内容时会抑制 `HEARTBEAT_OK` 确认。您可以在每个渠道或每个帐户的基础上调整此设置：

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

- `showOk`：当模型返回仅 OK 的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时，发送警报内容。
- `useIndicator`：为 UI 状态界面发出指示器事件。

如果**这三项**均为假，OpenClaw 将完全跳过心跳运行（不调用模型）。

### 单渠道与单账户示例

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

| 目标                           | 配置                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| 默认行为（静默正常，警报开启） | _（无需配置）_                                                                           |
| 完全静默（无消息，无指示器）   | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）             | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个渠道中显示正常消息     | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示词会指示
代理读取它。可以将其视为您的“心跳检查清单”：短小、稳定，
并且可以安全地每 30 分钟包含一次。

如果存在 `HEARTBEAT.md` 但实际上为空（仅包含空行和 markdown
标题如 `# Heading`），OpenClaw 将跳过心跳运行以节省 API 调用。
如果文件丢失，心跳仍会运行，模型将决定采取什么操作。

保持其内容极少（简短的检查清单或提醒），以避免提示词膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 吗？

可以 — 如果您要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此您可以（在普通聊天中）
告诉代理类似以下内容：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md`，使其更短并专注于收件箱跟进。”

如果您希望代理主动执行此操作，您还可以在心跳提示词中包含
明确的行，例如：“如果检查清单变得陈旧，请用更好的版本更新 HEARTBEAT.md”。

安全提示：请勿将机密信息（API 密钥、电话号码、私有令牌）放入
`HEARTBEAT.md` — 它将成为提示词上下文的一部分。

## 手动唤醒（按需）

您可以加入系统事件并通过以下方式触发立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒将立即运行
每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的时间点。

## 推理交付（可选）

默认情况下，心跳仅交付最终的“答案”有效载荷。

如果您希望提高透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将发送一条带有 `Reasoning:` 前缀的单独消息（形状与 `/reasoning on` 相同）。当代理管理多个会话/代码集，并且您希望了解它决定 ping 您的原因时，这会很有用——但它也可能泄露超出您预期的内部细节。建议在群聊中保持关闭状态。

## 成本意识

心跳运行完整的代理轮次。间隔越短消耗的 token 越多。要降低成本：

- 使用 `isolatedSession: true` 避免发送完整的对话历史记录（每次运行从约 100K token 减少到约 2-5K token）。
- 使用 `lightContext: true` 将引导文件限制为仅 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 较小。
- 如果您只需要内部状态更新，请使用 `target: "none"`。

import zh from "/components/footer/zh.mdx";

<zh />
