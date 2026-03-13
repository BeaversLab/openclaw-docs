---
summary: "心跳轮询消息和通知规则"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "心跳"
---

# 心跳（网关）

> **心跳 vs 定时任务（Cron）？** 关于何时使用哪一个，请参阅 [Cron vs Heartbeat](/zh/en/automation/cron-vs-heartbeat) 获取指导。

心跳在主会话中运行**周期性的代理轮次**，以便模型可以
呈现需要注意的事项，而不会通过垃圾消息打扰您。

故障排除：[/automation/troubleshooting](/zh/en/automation/troubleshooting)

## 快速入门（初学者）

1. 保持心跳启用（默认为 `30m`，对于 Anthropic OAuth/setup-token 则为 `1h`）或设置您自己的节奏。
2. 在代理工作区中创建一个微小的 `HEARTBEAT.md` 检查清单（可选但推荐）。
3. 确定心跳消息的去向（`target: "none"` 是默认值；设置 `target: "last"` 以路由到最后联系人）。
4. 可选：启用心跳推理传递以增加透明度。
5. 可选：如果心跳运行只需要 `HEARTBEAT.md`，则使用轻量级引导上下文。
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

- 间隔：`30m`（当检测到 Anthropic OAuth/setup-token 为认证模式时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示将**逐字**作为用户消息发送。系统
  提示包含“心跳”部分，且该运行在内部被标记。
- 活动时间（`heartbeat.activeHours`）会在配置的时区中检查。
  在时间窗口之外，心跳将被跳过，直到窗口内的下一次计时。

## 心跳提示的用途

默认提示是故意设计得比较宽泛的：

- **后台任务**：“考虑未完成的任务”会促使代理审查
  后续跟进（收件箱、日历、提醒、排队的工作）并呈现任何紧急事项。
- **人工检查**：“有时在白天检查你的主人”会促使
  偶尔的轻量级“有什么需要吗？”消息，但通过使用您配置的本地时区避免夜间垃圾信息
  （参见 [/concepts/timezone](/zh/en/concepts/timezone)）。

如果您希望心跳执行非常特定的任务（例如“检查 Gmail PubSub
统计信息”或“验证网关健康状况”），请将 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）设置为自定义正文（逐字发送）。

## 响应协议

- 如果没有需要注意的事项，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的
  **开头或结尾**时，OpenClaw 会将其视为确认。该标记会被去除，如果剩余内容**≤ `ackMaxChars`**（默认：300），则该回复会被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会被
  特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾处的孤立 `HEARTBEAT_OK` 会被去除
并记录；如果消息仅包含 `HEARTBEAT_OK`，则该消息会被丢弃。

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

### 范围和优先级

- `agents.defaults.heartbeat` 设置全局心跳行为。
- `agents.list[].heartbeat` 在其之上合并；如果任何代理具有 `heartbeat` 块，**则只有这些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有频道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖频道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号频道）覆盖每个频道的设置。

### 每个代理的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，**则只有这些代理**
运行心跳。每个代理的块在 `agents.defaults.heartbeat` 之上合并
（因此您可以设置一次共享默认值并针对每个代理进行覆盖）。

示例：两个代理，只有第二个代理运行心跳。

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

在此时间窗口之外（东部时间上午 9 点之前或晚上 10 点之后），心跳将被跳过。窗口内的下一次计划刻度将正常运行。

### 24/7 设置

如果您希望全天运行心跳，请使用以下模式之一：

- 完全省略 `activeHours`（没有时间窗口限制；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要将 `start` 和 `end` 设置为相同的时间（例如从 `08:00` 到 `08:00`）。
这将被视为零宽度窗口，因此总是跳过心跳。

### 多账户示例

在像 Telegram 这样的多账户渠道上，使用 `accountId` 来定位特定账户：

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
- `includeReasoning`：启用后，当有单独的 `Reasoning:` 消息时也发送该消息（形状与 `/reasoning on` 相同）。
- `lightContext`：如果为 true，心跳运行使用轻量级引导上下文，并仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `session`：心跳运行的可选会话密钥。
  - `main`（默认）：代理主会话。
  - 显式会话密钥（从 `openclaw sessions --json` 复制或使用 [sessions CLI](/zh/en/cli/sessions)）。
  - 会话密钥格式：参见 [Sessions](/zh/en/concepts/session) 和 [Groups](/zh/en/channels/groups)。
- `target`：
  - `last`：发送到上次使用的外部渠道。
  - 显式渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（默认）：运行心跳但**不对外发送**。
- `directPolicy`：控制直连/私信发送行为：
  - `allow`（默认）：允许直连/私信心跳发送。
  - `block`：禁止直连/私信发送（`reason=dm-blocked`）。
- `to`：可选的接收者覆盖（特定于渠道的 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。对于 Telegram 话题/线程，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`: 用于多账号渠道的可选账号 ID。当为 `target: "last"` 时，如果解析到的最后一个频道支持账号，该账号 ID 将应用于该频道；否则将被忽略。如果账号 ID 与解析到的频道的已配置账号不匹配，则跳过投递。
- `prompt`: 覆盖默认的提示词主体（不合并）。
- `ackMaxChars`: 在 `HEARTBEAT_OK` 之后投递前允许的最大字符数。
- `suppressToolErrorWarnings`: 如果为 true，则在心跳运行期间抑制工具错误警告负载。
- `activeHours`: 将心跳运行限制在时间窗口内。包含 `start` (HH:MM, 包含；使用 `00:00` 表示一天的开始), `end` (HH:MM, 不包含；允许使用 `24:00` 表示一天的结束) 和可选的 `timezone` 的对象。
  - 省略或设置为 `"user"`: 如果设置了 `agents.defaults.userTimezone` 则使用它，否则回退到主机系统时区。
  - `"local"`: 始终使用主机系统时区。
  - 任何 IANA 标识符 (例如 `America/New_York`): 直接使用；如果无效，则回退到上述 `"user"` 的行为。
  - 对于活动窗口，`start` 和 `end` 不得相等；相等的值将被视为零宽度（始终在窗口外）。
  - 在活动窗口之外，将跳过心跳，直到窗口内的下一次标记。

## 投递行为

- 默认情况下，心跳在代理的主会话中运行 (`agent:<id>:<mainKey>`)，
  或当 `session.scope = "global"` 时运行于 `global`。设置 `session` 以覆盖到
  特定的渠道会话 (Discord/WhatsApp/等)。
- `session` 仅影响运行上下文；投递由 `target` 和 `to` 控制。
- 要投递到特定频道/接收者，请设置 `target` + `to`。如果使用
  `target: "last"`，则投递使用该会话的最后一个外部渠道。
- 心跳投递默认允许直接/私信目标。设置 `directPolicy: "block"` 可以在仍然运行心跳轮次的同时抑制直接目标发送。
- 如果主队列忙，心跳将被跳过并在稍后重试。
- 如果 `target` 解析为无外部目标，运行仍会发生但无
  外发消息被发送。
- 仅心跳回复**不会**保持会话活跃；将恢复最后的 `updatedAt`
  以使空闲过期正常工作。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认在发送警报内容时被抑制。你可以按频道或按账户调整此设置：

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

优先级：按账户 → 按频道 → 频道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅 OK 的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 的回复时，发送警报内容。
- `useIndicator`：为 UI 状态表面发出指示器事件。

如果**所有三个**均为假，OpenClaw 将完全跳过心跳运行（不调用模型）。

### 按频道与按账户示例

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

| 目标                                     | 配置                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，开启警报） | _(无需配置)_                                                                     |
| 完全静默（无消息，无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）             | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个频道中显示 OK             | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会指示
智能体读取它。可以将其视为您的“心跳检查清单”：短小、稳定，
并且每 30 分钟包含一次也是安全的。

如果 `HEARTBEAT.md` 存在但实际上是空的（仅包含空行和 markdown
标题，如 `# Heading`），OpenClaw 会跳过此次心跳运行以节省 API 调用。
如果文件丢失，心跳仍会运行，模型会决定做什么。

保持简短（简短的检查清单或提醒）以避免提示膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 智能体可以更新 HEARTBEAT.md 吗？

可以 —— 如果您要求它这样做。

`HEARTBEAT.md` 只是智能体工作区中的一个普通文件，因此您可以
告诉智能体（在普通聊天中）类似这样的话：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更简短，并专注于收件箱跟进。”

如果您希望这种情况主动发生，您还可以在心跳提示中包含明确的一行，
例如：“如果检查清单变得陈旧，请用更好的版本更新 HEARTBEAT.md。”

安全提示：不要将秘密信息（API 密钥、电话号码、私有令牌）放入
`HEARTBEAT.md` —— 它会成为提示上下文的一部分。

## 手动唤醒（按需）

您可以加入一个系统事件并通过以下方式触发即时心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果配置了多个 `heartbeat`，手动唤醒会立即运行
每个智能体的心跳。

使用 `--mode next-heartbeat` 等待下一个计划的时间刻度。

## 推理传递（可选）

默认情况下，心跳仅传递最终的“答案”有效载荷。

如果您希望透明，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将传递一条单独的消息，前缀为
`Reasoning:`（形状与 `/reasoning on` 相同）。当智能体
管理多个会话/密码本并且您想查看它决定向您发送 ping 的原因时，这很有用 ——
但也可能泄露比您想要的更多的内部细节。在群聊中建议保持关闭状态。

## 成本意识

心跳运行完整的智能体轮次。较短的间隔会消耗更多的 Token。如果您只需要内部状态更新，请保持 `HEARTBEAT.md` 较小，并考虑使用更便宜的 `model` 或 `target: "none"`。

import zh from '/components/footer/zh.mdx';

<zh />
