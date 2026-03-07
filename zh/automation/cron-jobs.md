---
summary: "Gateway 调度器的 Cron 作业与唤醒"
read_when:
  - 安排后台作业或唤醒
  - 为需要与心跳一起运行的自动化流程接线
  - 在定时任务里决定使用 heartbeat 还是 cron
title: "Cron 任务"
---

# 定时任务（Gateway 调度器）

> **Cron 还是 Heartbeat？** 参考 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 了解何时使用哪一种。

Cron 是 Gateway 内置的调度器。它会持久化作业，在合适时间唤醒代理，并可选地把输出发送回聊天。

如果你想要 _"每天早上运行一次"_ 或 _"20 分钟后提醒我"_，cron 就是机制。

## TL;DR

- Cron **在 Gateway 内部运行**（不在模型内部）。
- 作业保存在 `~/.openclaw/cron/`，重启不会丢失计划。
- 两种执行风格：
  - **主会话**：排队一个系统事件，在下一次心跳中运行。
  - **隔离**：在 `cron:<jobId>` 中运行独立的代理轮次，带投递（默认 announce 或 none）。
- 唤醒是第一等能力：作业可以请求"现在唤醒"或"下次心跳"。

## 快速开始（可执行）

创建一个单次提醒，验证它存在，并立即运行：

```bash
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

openclaw cron list
openclaw cron run <job-id> --force
openclaw cron runs --id <job-id>
```

调度一个循环的隔离作业并投递：

```bash
```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

## 工具调用等效操作（Gateway cron 工具）

关于规范的 JSON 形状和示例，参见 [工具调用的 JSON schema](/zh/automation/cron-jobs#json-schema-for-tool-calls)。

## Cron 作业的存储位置

Cron 作业默认持久化在 Gateway 主机的 `~/.openclaw/cron/jobs.json`。
Gateway 会把文件加载到内存并在变更时写回，因此手动编辑只在 Gateway 停止时才安全。
建议使用 `openclaw cron add/edit` 或 cron 工具调用 API 来修改。

## 新手友好概览

把 cron 作业理解为：**什么时候**运行 + **做什么**。

1. **选择调度方式**
   - 单次提醒 → `schedule.kind = "at"`（CLI: `--at`）
   - 重复任务 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - 如果 ISO 时间戳省略时区，会被当作 **UTC**。

2. **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳中用主会话上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行独立代理轮次。

3. **选择载荷**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：单次作业（`schedule.kind = "at"`）默认在成功后删除。设置
`deleteAfterRun: false` 来保留它们（它们会在成功后禁用）。

## 概念

### 作业

一个 cron 作业是一个持久化记录，包含：

- **schedule**（何时运行）、
- **payload**（做什么）、
- 可选的 **delivery mode**（announce 或 none）。
- 可选 **agent 绑定**（`agentId`）：用指定 agent 运行；缺失或未知时，Gateway 会回退到默认 agent。

作业通过稳定的 `jobId` 标识（CLI/Gateway API 使用）。
在 agent 工具调用中，`jobId` 为规范字段；旧字段 `id` 为兼容而保留。
单次作业默认在成功后自动删除；设置 `deleteAfterRun: false` 来保留它们。

### 调度方式

Cron 支持三种调度类型：

- `at`：通过 `schedule.at` 的单次时间戳（ISO 8601）。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式，可选 IANA 时区。

Cron 表达式使用 `croner`。如果省略时区，使用 Gateway 主机的本地时区。

### 主会话 vs 隔离执行

#### 主会话作业（系统事件）

主会话作业会排队一个系统事件，并可选唤醒心跳运行器。
必须使用 `payload.kind = "systemEvent"`。

- `wakeMode: "next-heartbeat"`（默认）：事件等待下一次计划心跳。
- `wakeMode: "now"`：触发一次立即心跳运行。

当你希望使用正常的心跳提示词 + 主会话上下文时，这是最佳选择。
参见 [Heartbeat](/zh/gateway/heartbeat)。

#### 隔离作业（专用 cron 会话）

隔离作业会在会话 `cron:<jobId>` 中运行一次独立代理轮次。

关键行为：

- 提示词会加上 `[cron:<jobId> <job name>]` 前缀，便于追踪。
- 每次运行都会使用 **全新的会话 id**（不继承旧对话）。
- 默认行为：如果省略 `delivery`，隔离作业会发布摘要（`delivery.mode = "announce"`）。
- `delivery.mode`（仅隔离）选择发生什么：
  - `announce`：向目标频道投递摘要，并向主会话发布简要摘要。
  - `none`：仅内部（无投递，无主会话摘要）。
- `wakeMode` 控制主会话摘要何时发布：
  - `now`：立即心跳。
  - `next-heartbeat`：等待下一次计划心跳。

当任务噪声高、频率高或是"后台杂活"而不想刷屏主聊天记录时，建议使用隔离作业。

### 载荷结构（运行什么）

支持两类载荷：

- `systemEvent`：仅主会话，通过心跳提示词路由。
- `agentTurn`：仅隔离会话，运行独立代理轮次。

常见 `agentTurn` 字段：

- `message`：必需的文本提示词。
- `model` / `thinking`：可选覆盖（见下）。
- `timeoutSeconds`：可选超时覆盖。

投递配置（仅隔离作业）：

- `delivery.mode`：`none` | `announce`。
- `delivery.channel`：`last` 或具体频道。
- `delivery.to`：频道的具体目标（手机号/聊天/频道 id）。
- `delivery.bestEffort`：在投递失败时避免作业失败。

Announce 投递会为该次运行抑制消息工具发送；使用 `delivery.channel`/`delivery.to`
来定位聊天。当 `delivery.mode = "none"` 时，不会向主会话发布摘要。

如果隔离作业省略 `delivery`，OpenClaw 默认为 `announce`。

#### Announce 投递流程

当 `delivery.mode = "announce"` 时，cron 通过出站频道适配器直接投递。
不会启动主代理来制作或转发消息。

行为详情：

- 内容：投递使用隔离运行的出站载荷（文本/媒体），包含正常分块和
  频道格式。
- 仅心跳响应（`HEARTBEAT_OK` 无实际内容）不会被投递。
- 如果隔离运行已通过消息工具向同一目标发送消息，投递会
  跳过以避免重复。
- 缺失或无效的投递目标会导致作业失败，除非 `delivery.bestEffort = true`。
- 仅当 `delivery.mode = "announce"` 时才向主会话发布简要摘要。
- 主会话摘要遵守 `wakeMode`：`now` 触发立即心跳，
  `next-heartbeat` 等待下一次计划心跳。

### 模型与 thinking 覆盖

隔离作业（`agentTurn`）可以覆盖模型与思考级别：

- `model`：Provider/model 字符串（如 `anthropic/claude-sonnet-4-20250514`）或别名（如 `opus`）
- `thinking`：思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅 GPT-5.2 + Codex 模型）

注意：主会话作业也可以设置 `model`，但这会改变共享的主会话模型。
我们建议只在隔离作业中做模型覆盖，以避免意外的上下文切换。

优先级顺序：

1. 作业载荷覆盖（最高）
2. Hook 特定默认值（例如 `hooks.gmail.model`）
3. Agent 配置默认值

### 投递（频道 + 目标）

隔离作业可以把输出投递到频道。作业载荷可指定：

- `channel`：`whatsapp` / `telegram` / `discord` / `slack` / `mattermost`（插件）/ `signal` / `imessage` / `last`
- `to`：频道的具体接收目标

如果 `channel` 或 `to` 缺失，cron 可以回退到主会话的"last route"（代理上一次回复的地方）。

投递说明：

- 只要设置了 `to`，即便省略 `delivery`，cron 也会自动投递最终输出。
- 想要不显式设置 `to` 也投递到 last route，请使用 `delivery.mode = "announce"`。
- 用 `delivery.mode = "none"` 可以即使存在 `to` 也不投递，让输出保持内部。

目标格式提醒：

- Slack/Discord/Mattermost（插件）目标应使用显式前缀（例如 `channel:<id>`、`user:<id>`），避免歧义。
- Telegram 话题应使用 `:topic:` 形式（见下）。

#### Telegram 投递目标（话题 / 论坛线程）

Telegram 通过 `message_thread_id` 支持论坛话题。对于 cron 投递，可将话题/线程编码进 `to` 字段：

- `-1001234567890`（仅 chat id）
- `-1001234567890:topic:123`（推荐：显式话题标记）
- `-1001234567890:123`（简写：数字后缀）

也接受带前缀的目标：

- `telegram:group:-1001234567890:topic:123`

## 工具调用的 JSON schema

直接调用 Gateway `cron.*` 工具时使用这些形状（agent 工具调用或 RPC）。
CLI 标志接受人类可读的时长如 `20m`，但工具调用使用 epoch 毫秒表示
`atMs` 和 `everyMs`（`at` 时间接受 ISO 时间戳）。

### cron.add 参数

单次、主会话作业（系统事件）：

```json
{
  "name": "Reminder",
  "schedule": { "kind": "at", "atMs": 1738262400000 },
  "sessionTarget": "main",
  "wakeMode": "now",
  "payload": { "kind": "systemEvent", "text": "Reminder text" },
  "deleteAfterRun": true
}
```

循环、隔离作业并投递：

```json
{
  "name": "Morning brief",
  "schedule": { "kind": "cron", "expr": "0 7 * * *", "tz": "America/Los_Angeles" },
  "sessionTarget": "isolated",
  "wakeMode": "next-heartbeat",
  "payload": {
    "kind": "agentTurn",
    "message": "Summarize overnight updates.",
    "delivery": {
      "mode": "announce",
      "channel": "slack",
      "to": "channel:C1234567890"
    }
  },
  "isolation": { "postToMainPrefix": "Cron", "postToMainMode": "summary" }
}
```

说明：

- `schedule.kind`：`at`（`atMs`）、`every`（`everyMs`）或 `cron`（`expr`，可选 `tz`）。
- `atMs` 和 `everyMs` 是 epoch 毫秒。
- `sessionTarget` 必须是 `"main"` 或 `"isolated"` 且必须匹配 `payload.kind`。
- 可选字段：`agentId`、`description`、`enabled`、`deleteAfterRun`、`isolation`。
- 省略时 `wakeMode` 默认为 `"next-heartbeat"`。

### cron.update 参数

```json
{
  "jobId": "job-123",
  "patch": {
    "enabled": false,
    "schedule": { "kind": "every", "everyMs": 3600000 }
  }
}
```

说明：

- `jobId` 为规范字段；`id` 为兼容而保留。
- 在 patch 中使用 `agentId: null` 来清除 agent 绑定。

### cron.run 和 cron.remove 参数

```json
{ "jobId": "job-123", "mode": "force" }
```

```json
{ "jobId": "job-123" }
```

## 存储与历史

- 作业存储：`~/.openclaw/cron/jobs.json`（Gateway 管理的 JSON）。
- 运行历史：`~/.openclaw/cron/runs/<jobId>.jsonl`（JSONL，自动清理）。
- 覆盖存储路径：配置中的 `cron.store`。

## 配置

```json5
{
  cron: {
    enabled: true, // default true
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1, // default 1
  },
}
```

完全禁用 cron：

- `cron.enabled: false`（config）
- `OPENCLAW_SKIP_CRON=1`（env）

## CLI 快速开始

单次提醒（UTC ISO，成功后自动删除）：

```bash
openclaw cron add \
  --name "Send reminder" \
  --at "2026-01-12T18:00:00Z" \
  --session main \
  --system-event "Reminder: submit expense report." \
  --wake now \
  --delete-after-run
```

单次提醒（主会话，立即唤醒）：

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

循环隔离作业（投递到 WhatsApp）：

```bash
openclaw cron add \
  --name "Morning status" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize inbox + calendar for today." \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

循环隔离作业（投递到 Telegram 话题）：

```bash
openclaw cron add \
  --name "Nightly summary (topic)" \
  --cron "0 22 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize today; send to the nightly topic." \
  --announce \
  --channel telegram \
  --to "-1001234567890:topic:123"
```

带模型和 thinking 覆盖的隔离作业：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Agent 选择（多 agent 设置）：

```bash
# 把作业固定到 agent "ops"（若该 agent 缺失则回退到默认）
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops

# 切换或清除现有作业的 agent
openclaw cron edit <jobId> --agent ops
openclaw cron edit <jobId> --clear-agent
```

手动运行（调试）：

```bash
openclaw cron run <jobId> --force
```

编辑现有作业（patch 字段）：

```bash
openclaw cron edit <jobId> \
  --message "Updated prompt" \
  --model "opus" \
  --thinking low
```

运行历史：

```bash
openclaw cron runs --id <jobId> --limit 50
```

不创建作业的直接系统事件：

```bash
openclaw system event --mode now --text "Next heartbeat: check battery."
```

## Gateway API 接口

- `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`
- `cron.run`（force 或 due）、`cron.runs`
  对于不通过作业的立即系统事件，使用 [`openclaw system event`](/zh/cli/system)。

## 故障排查

### "什么都不运行"

- 检查 cron 是否启用：`cron.enabled` 和 `OPENCLAW_SKIP_CRON`。
- 检查 Gateway 是否持续运行（cron 在 Gateway 进程内运行）。
- 对于 `cron` 调度：确认时区（`--tz`）vs 主机时区。

### Telegram 投递到错误的地方

- 对于论坛话题，使用 `-100…:topic:<id>` 让它显式且无歧义。
- 如果在日志或存储的"last route"目标中看到 `telegram:...` 前缀，这是正常的；
  cron 投递接受它们并且仍然正确解析话题 ID。
