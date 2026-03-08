---
summary: "心跳轮询消息和通知规则"
read_when:
  - "Adjusting heartbeat cadence or messaging"
  - "Deciding between heartbeat and cron for scheduled tasks"
title: "心跳"
---

# 心跳（网关）

> **心跳 vs Cron？** 参见[Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat)了解何时使用每个的指导。

心跳在主会话中运行**定期代理轮次**，以便模型可以
突出需要注意的任何事情，而不会垃圾信息轰炸你。

## 快速开始（初学者）

1. 保持心跳启用（默认为 `30m`，或对于 Anthropic OAuth/setup-token 为 `1h`）或设置你自己的节奏。
2. 在代理工作区中创建一个小的 `HEARTBEAT.md` 检查清单（可选但推荐）。
3. 决定心跳消息应该去哪里（`target: "last"` 是默认值）。
4. 可选：启用心跳推理传递以提高透明度。
5. 可选：将心跳限制在活动时间内（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（或当检测到 Anthropic OAuth/setup-token 为认证模式时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或每个代理的 `agents.list[].heartbeat.every`；使用 `0m` 禁用。
- 提示主体（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示作为用户消息**逐字**发送。系统
  提示包括”Heartbeat”部分，运行在内部被标记。
- 活动时间（`heartbeat.activeHours`）在配置的时区中检查。
  在窗口之外，心跳将被跳过，直到窗口内的下一次滴答。

## 心跳提示的用途

默认提示故意设计得很宽泛：

- **后台任务**：”考虑未完成的任务”促使代理审查
  后续跟进（收件箱、日历、提醒、排队的 work）并突出显示任何紧急事项。
- **人工检查**：”在白天有时检查你的人类”促使偶尔
  发送轻量级的”你需要什么？”消息，但通过使用你配置的本地时区避免夜间垃圾信息
  （参见[/concepts/timezone](/zh/concepts/timezone)）。

如果你希望心跳执行非常特定的操作（例如”检查 Gmail PubSub
统计”或”验证网关健康”），将 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）设置为自定义主体（逐字发送）。

## 响应约定

- 如果不需要关注，请回复 **`HEARTBEAT_OK`**。
- 在心跳运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，OpenClaw 将其视为确认。令牌会被剥离，如果剩余内容 **≤ `ackMaxChars`**（默认：300），则回复会被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会受到特殊处理。
- 对于警报，**不要**包含 `HEARTBEAT_OK`；仅返回警报文本。

在心跳之外，消息开头/结尾处的孤立 `HEARTBEAT_OK` 会被剥离
并记录；仅包含 `HEARTBEAT_OK` 的消息会被丢弃。

## Config

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-5",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        target: "last", // last | none | <channel id> (core or plugin, e.g. "bluebubbles")
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
- `agents.list[].heartbeat` 在顶部合并；如果任何代理有 `heartbeat` 块，**只有那些代理**运行心跳。
- `channels.defaults.heartbeat` 为所有频道设置可见性默认值。
- `channels.<channel>.heartbeat` 覆盖频道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户频道）覆盖每个频道的设置。

### 每个代理的心跳

如果任何 `agents.list[]` 条目包含 `heartbeat` 块，**只有那些代理**
运行心跳。每个代理的块在 `agents.defaults.heartbeat` 之上合并
（因此你可以设置一次共享默认值并按代理覆盖）。

示例：两个代理，只有第二个代理运行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
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

### 多账户示例

使用 `accountId` 来定位多账户频道（如 Telegram）上的特定账户：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678",
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
- `includeReasoning`：启用后，还在可用时传递单独的 `Reasoning:` 消息（与 `/reasoning on` 形状相同）。
- `session`：心跳运行的可选会话键。
  - `main`（默认）：代理主会话。
  - 显式会话键（从 `openclaw sessions --json` 或 [会话 CLI](/zh/cli/sessions) 复制）。
  - 会话键格式：参见[会话](/zh/concepts/session) 和[群组](/zh/concepts/groups)。
- `target`：
  - `last`（默认）：传递到最后使用的外部频道。
  - 显式频道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`：运行心跳但**不传递**到外部。
- `to`：可选的收件人覆盖（频道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。
- `accountId`：多账户频道的可选账户 ID。当 `target: "last"` 时，账户 ID 适用于解析的最后一个频道（如果它支持账户）；否则将被忽略。如果账户 ID 与解析频道的已配置账户不匹配，则跳过传递。
- `prompt`：覆盖默认提示主体（不合并）。
- `ackMaxChars`：`HEARTBEAT_OK` 之后允许传递的最大字符数。

## 传递行为

- 心跳默认在代理的主会话中运行（`agent:<id>:<mainKey>`），
  或当 `session.scope = "global"` 时为 `global`。设置 `session` 以覆盖到
  特定频道会话（Discord/WhatsApp 等）。
- `session` 仅影响运行上下文；传递由 `target` 和 `to` 控制。
- 要传递到特定频道/收件人，请设置 `target` + `to`。使用
  `target: "last"` 时，传递使用该会话的最后一个外部频道。
- 如果主队列忙，心跳将被跳过并稍后重试。
- 如果 `target` 解析为没有外部目的地，运行仍然会发生，但不会
  发送出站消息。
- 仅心跳回复**不会**保持会话活动；最后一个 `updatedAt`
  会被恢复，以便空闲过期正常工作。

## Visibility controls

By default, `HEARTBEAT_OK` acknowledgments are suppressed while alert content is
delivered. You can adjust this per channel or per account:

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

优先级：每个账户 → 每个频道 → 频道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅 OK 的回复时发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 的回复时发送警报内容。
- `useIndicator`：为 UI 状态表面发出指示器事件。

如果**所有三个**都为 false，OpenClaw 将完全跳过心跳运行（无模型调用）。

### Per-channel vs per-account examples

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
| 默认行为（静音 OK，开启警报） | _(无需配置)_                                                                     |
| 完全静音（无消息，无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息）             | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 仅在一个频道中显示 OK                  | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示会告诉
代理读取它。将其视为你的”心跳检查清单”：小而稳定，
并且可以安全地每 30 分钟包含一次。

如果 `HEARTBEAT.md` 存在但实际上为空（只有空行和 markdown
标题（如 `# Heading`）），OpenClaw 会跳过心跳运行以节省 API 调用。
如果文件缺失，心跳仍然运行，模型决定做什么。

保持它很小（简短的检查清单或提醒）以避免提示膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 吗？

可以 — 如果你要求它这样做。

`HEARTBEAT.md` 只是代理工作区中的一个普通文件，因此你可以告诉
代理（在正常聊天中）类似以下内容：

- “更新 `HEARTBEAT.md` 以添加每日日历检查。”
- “重写 `HEARTBEAT.md` 使其更短并专注于收件箱后续跟进。”

如果你希望主动发生这种情况，你还可以在心跳提示中包含明确的行，例如：”如果检查清单变得陈旧，请用更好的检查清单更新 HEARTBEAT.md。”

安全提示：不要将机密信息（API 密钥、电话号码、私人令牌）放入
`HEARTBEAT.md` — 它会成为提示上下文的一部分。

## Manual wake (on-demand)
你可以排队一个系统事件并使用以下命令立即触发心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多个代理配置了 `heartbeat`，手动唤醒会立即运行每个代理的心跳。

使用 `--mode next-heartbeat` 等待下一次计划的滴答。

## 推理传递（可选）

默认情况下，心跳只传递最终的”答案”载荷。

如果你想要透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，心跳还将传递一个单独的以 `Reasoning:` 为前缀的消息
（与 `/reasoning on` 形状相同）。当代理
管理多个会话/codex 并且你想查看它决定 ping 你的原因时，这可能很有用 —
但它也可能泄露比你想要的更多内部细节。在群聊中最好保持关闭。

## 成本意识

心跳运行完整的代理轮次。较短的间隔会消耗更多令牌。保持
`HEARTBEAT.md` 较小，如果你只想要内部状态更新，请考虑更便宜的 `model` 或 `target: "none"`。
