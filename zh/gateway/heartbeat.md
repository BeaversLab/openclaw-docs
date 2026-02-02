---
summary: "Heartbeat 轮询消息与通知规则"
read_when:
  - 调整 heartbeat 频率或消息
  - 在 heartbeat 与 cron 之间做调度选择
title: "Heartbeat（Gateway）"
---
# Heartbeat（Gateway）

> **Heartbeat vs Cron?** 参见 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 了解何时使用。

Heartbeat 会在主会话中运行**周期性 agent 回合**，让模型在不骚扰的情况下提示需要关注的事项。

## 快速开始（新手）

1. 保持 heartbeat 开启（默认 `30m`，Anthropic OAuth/setup-token 为 `1h`）或自定频率。
2. 在 agent workspace 创建小型 `HEARTBEAT.md` 清单（可选但推荐）。
3. 决定 heartbeat 消息投递位置（默认 `target: "last"`）。
4. 可选：开启 heartbeat 推理投递以增加透明度。
5. 可选：仅在活跃时段运行（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // 可选：额外发送 `Reasoning:` 消息
      }
    }
  }
}
```

## 默认值

- 间隔：`30m`（或检测到 Anthropic OAuth/setup-token 时为 `1h`）。设置 `agents.defaults.heartbeat.every` 或 per-agent `agents.list[].heartbeat.every`；用 `0m` 禁用。
- 提示词正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示词**逐字**作为用户消息发送。System prompt 包含 “Heartbeat” 小节并在内部标记该运行。
- 活跃时段（`heartbeat.activeHours`）按配置时区判断；窗口外跳过，直到下一次 tick 进入窗口。

## Heartbeat 提示词的用途

默认提示词刻意宽泛：
- **后台任务**：“Consider outstanding tasks” 促使 agent 复查待办（收件箱、日程、提醒、排队工作）并提示紧急事项。
- **人类 check-in**：“Checkup sometimes on your human during day time” 促使偶尔轻量问候，但会遵循你的本地时区，避免夜间打扰（见 [/concepts/timezone](/zh/concepts/timezone)）。

若希望 heartbeat 做更具体的事（例如 “检查 Gmail PubSub 统计” 或 “验证 gateway 健康”），设置 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）为自定义正文（逐字发送）。

## 响应约定

- 若无需关注事项，回复 **`HEARTBEAT_OK`**。
- 在 heartbeat 运行中，OpenClaw 仅当 `HEARTBEAT_OK` 出现在回复**开头或结尾**时视为 ack。该 token 会被剥离，若剩余内容**≤ `ackMaxChars`**（默认 300）则丢弃回复。
- 若 `HEARTBEAT_OK` 出现在回复**中间**，不作特殊处理。
- 对告警，**不要**包含 `HEARTBEAT_OK`；只返回告警文本。

非 heartbeat 时，若消息开头/结尾出现多余 `HEARTBEAT_OK` 会被剥离并记录；仅包含 `HEARTBEAT_OK` 的消息会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",           // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-5",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        target: "last",         // last | none | <channel id> (core or plugin, e.g. "bluebubbles")
        to: "+15551234567",     // optional channel-specific override
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300         // max chars allowed after HEARTBEAT_OK
      }
    }
  }
}
```

### 作用域与优先级

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.list[].heartbeat` 在其上合并；若任一 agent 有 `heartbeat` 块，则**只有这些 agents**运行 heartbeat。
- `channels.defaults.heartbeat` 设置所有渠道的可见性默认。
- `channels.<channel>.heartbeat` 覆盖渠道默认。
- `channels.<channel>.accounts.<id>.heartbeat`（多账号渠道）覆盖 per-channel 设置。

### Per-agent heartbeats

若任一 `agents.list[]` 条目包含 `heartbeat`，则**只有这些 agents**运行 heartbeat。per-agent 块会在 `agents.defaults.heartbeat` 之上合并（因此可设置共享默认，并按 agent 覆盖）。

示例：两个 agents，只有第二个运行 heartbeat。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last"
      }
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK."
        }
      }
    ]
  }
}
```

### 字段说明

- `every`：heartbeat 间隔（duration 字符串；默认单位=分钟）。
- `model`：heartbeat 运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用后，当可用时也会投递单独的 `Reasoning:` 消息（与 `/reasoning on` 同形）。
- `session`：heartbeat 运行的可选 session key。
  - `main`（默认）：agent 主会话。
  - 显式 session key（可从 `openclaw sessions --json` 或 [sessions CLI](/zh/cli/sessions) 复制）。
  - Session key 格式见 [Sessions](/zh/concepts/session) 与 [Groups](/zh/concepts/groups)。
- `target`：
  - `last`（默认）：投递到上一次使用的外部渠道。
  - 显式渠道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`：运行 heartbeat 但**不对外投递**。
- `to`：可选接收方覆盖（渠道特定 id，例如 WhatsApp E.164 或 Telegram chat id）。
- `prompt`：覆盖默认提示词正文（不合并）。
- `ackMaxChars`：`HEARTBEAT_OK` 之后允许的最大字符数，超过则投递。

## 投递行为

- Heartbeat 默认在 agent 主会话运行（`agent:<id>:<mainKey>`），或当 `session.scope = "global"` 时为 `global`。设置 `session` 可覆盖到特定渠道会话（Discord/WhatsApp 等）。
- `session` 只影响运行上下文；投递由 `target` 与 `to` 控制。
- 若需投递到特定渠道/接收方，设置 `target` + `to`。当 `target: "last"` 时，投递使用该会话最后一个外部渠道。
- 若主队列繁忙，heartbeat 会跳过并稍后重试。
- 若 `target` 解析不到外部目的地，仍会运行但不发送外部消息。
- 仅 heartbeat 回复**不会**延长会话存活；`updatedAt` 会恢复，以保持空闲过期逻辑。

## 可见性控制

默认情况下，`HEARTBEAT_OK` ack 会被抑制，而告警内容会投递。你可按渠道或账号调整：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false      # Hide HEARTBEAT_OK (default)
      showAlerts: true   # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true       # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

优先级：per-account → per-channel → 渠道默认 → 内置默认。

### 每个标志的作用

- `showOk`：模型返回仅 OK 的回复时发送 `HEARTBEAT_OK` ack。
- `showAlerts`：模型返回非 OK 回复时发送告警内容。
- `useIndicator`：为 UI 状态表面发出 indicator 事件。

若**三者皆为 false**，OpenClaw 会完全跳过 heartbeat 运行（不调用模型）。

### 按渠道 vs 按账号示例

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

| 目标 | 配置 |
| --- | --- |
| 默认行为（OK 静默、告警发送） | *(no config needed)* |
| 完全静默（无消息、无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }` |
| 仅在某渠道显示 OK | `channels.telegram.heartbeat: { showOk: true }` |

## HEARTBEAT.md（可选）

若 workspace 中存在 `HEARTBEAT.md`，默认提示词会要求 agent 读取它。可把它视为“heartbeat 清单”：小、稳定且可每 30 分钟安全注入。

若 `HEARTBEAT.md` 存在但实际上为空（只有空行或 `# Heading` 之类的 Markdown 标题），OpenClaw 会跳过 heartbeat 运行以节省 API 调用。
若文件缺失，heartbeat 仍会运行，由模型决定。

保持它简短（小清单或提醒）以避免 prompt 膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down *what is missing* and ask Peter next time.
```

### agent 能更新 HEARTBEAT.md 吗？

可以——只要你要求它。

`HEARTBEAT.md` 是 agent workspace 中的普通文件，你可以在常规聊天中对它说：
- “更新 `HEARTBEAT.md`，添加每日日历检查。”
- “重写 `HEARTBEAT.md`，更短并聚焦收件箱跟进。”

若希望它主动发生，也可在 heartbeat prompt 中加一句：“若清单过时，请更新 HEARTBEAT.md”。

安全提示：不要把密钥（API keys、手机号、私有 token）写进 `HEARTBEAT.md` — 它会进入 prompt 上下文。

## 手动唤醒（按需）

可通过系统事件入队并立即触发 heartbeat：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

若多个 agents 配置了 `heartbeat`，手动唤醒会立即运行每个 agent 的 heartbeat。

使用 `--mode next-heartbeat` 等到下一次计划 tick。

## 推理投递（可选）

默认情况下，heartbeat 仅投递最终“答案”。

如需透明度，启用：
- `agents.defaults.heartbeat.includeReasoning: true`

启用后，heartbeat 会额外投递一个以 `Reasoning:` 开头的消息（与 `/reasoning on` 同形）。当 agent 管理多个 sessions/codexes 且你想看它为何提醒时很有用，但也可能泄露更多内部细节。在群聊中建议关闭。

## 成本意识

Heartbeat 运行完整 agent 回合。间隔越短消耗越多 tokens。保持
`HEARTBEAT.md` 简短，并考虑使用更便宜的 `model` 或 `target: "none"`（若只需内部状态更新）。
