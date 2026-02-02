---
summary: "Gateway 调度器的 Cron 作业与唤醒"
read_when:
  - 安排后台作业或唤醒
  - 为需要与心跳一起运行的自动化流程接线
  - 在定时任务里决定使用 heartbeat 还是 cron
title: "定时任务"
---
# 定时任务（Gateway 调度器）

> **Cron 还是 Heartbeat？** 参考 [Cron vs Heartbeat](/zh/automation/cron-vs-heartbeat) 了解何时使用哪一种。

Cron 是 Gateway 内置的调度器。它会持久化作业，在合适时间唤醒代理，并可选地把输出发送回聊天。

如果你想要 *“每天早上运行一次”* 或 *“20 分钟后提醒我”*，cron 就是机制。

## TL;DR
- Cron **在 Gateway 内部运行**（不在模型内部）。
- 作业保存在 `~/.openclaw/cron/`，重启不会丢失计划。
- 两种执行风格：
  - **主会话**：排队一个系统事件，在下一次心跳中运行。
  - **隔离**：在 `cron:<jobId>` 中运行独立的代理轮次，可选发送输出。
- 唤醒是第一等能力：作业可以请求“现在唤醒”或“下次心跳”。

## 新手友好概览
把 cron 作业理解为：**什么时候**运行 + **做什么**。

1) **选择调度方式**
   - 单次提醒 → `schedule.kind = "at"`（CLI: `--at`）
   - 重复任务 → `schedule.kind = "every"` 或 `schedule.kind = "cron"`
   - ISO 时间戳如果不包含时区，会被当作 **UTC**。

2) **选择运行位置**
   - `sessionTarget: "main"` → 在下一次心跳中用主会话上下文运行。
   - `sessionTarget: "isolated"` → 在 `cron:<jobId>` 中运行独立代理轮次。

3) **选择载荷**
   - 主会话 → `payload.kind = "systemEvent"`
   - 隔离会话 → `payload.kind = "agentTurn"`

可选：`deleteAfterRun: true` 会在单次作业成功后从存储中移除。

## 概念

### 作业
一个 cron 作业是一个持久化记录，包含：
- **schedule**（何时运行）、
- **payload**（做什么）、
- 可选的 **delivery**（输出要发送到哪里）。
- 可选 **agent 绑定**（`agentId`）：用指定 agent 运行；缺失或未知时，Gateway 会回退到默认 agent。

作业通过稳定的 `jobId` 标识（CLI/Gateway API 使用）。
在 agent 工具调用中，`jobId` 为规范字段；旧字段 `id` 为兼容而保留。
单次作业成功后可通过 `deleteAfterRun: true` 自动删除。

### 调度方式
Cron 支持三种调度类型：
- `at`：单次时间戳（epoch 毫秒）。Gateway 接受 ISO 8601 并转成 UTC。
- `every`：固定间隔（毫秒）。
- `cron`：5 字段 cron 表达式，可选 IANA 时区。

Cron 表达式使用 `croner`。如未指定时区，使用 Gateway 主机的本地时区。

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
- 会将摘要发布到主会话（前缀 `Cron`，可配置）。
- `wakeMode: "now"` 会在发布摘要后立即触发心跳。
- 若 `payload.deliver: true`，输出会投递到频道；否则保持内部。

当任务噪声高、频率高或是“后台杂活”而不想刷屏主聊天记录时，建议使用隔离作业。

### 载荷结构（运行什么）
支持两类载荷：
- `systemEvent`：仅主会话，通过心跳提示词路由。
- `agentTurn`：仅隔离会话，运行独立代理轮次。

常见 `agentTurn` 字段：
- `message`：必需的文本提示词。
- `model` / `thinking`：可选覆盖（见下）。
- `timeoutSeconds`：可选超时覆盖。
- `deliver`：`true` 时把输出发送到频道目标。
- `channel`：`last` 或具体频道。
- `to`：频道的具体目标（手机号/聊天/频道 id）。
- `bestEffortDeliver`：投递失败也不让作业失败。

隔离选项（仅 `session=isolated`）：
- `postToMainPrefix`（CLI: `--post-prefix`）：发布到主会话的系统事件前缀。
- `postToMainMode`：`summary`（默认）或 `full`。
- `postToMainMaxChars`：`postToMainMode=full` 时的最大字符数（默认 8000）。

### 模型与 thinking 覆盖
隔离作业（`agentTurn`）可以覆盖模型与 thinking 级别：
- `model`：Provider/model 字符串（如 `anthropic/claude-sonnet-4-20250514`）或别名（如 `opus`）
- `thinking`：thinking 级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`；仅 GPT-5.2 + Codex 模型）

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

如果 `channel` 或 `to` 缺失，cron 可以回退到主会话的“last route”（代理上一次回复的地方）。

投递说明：
- 只要设置了 `to`，即便省略 `deliver`，cron 也会自动投递最终输出。
- 想要不显式设置 `to` 也投递到 last route，请使用 `deliver: true`。
- 用 `deliver: false` 可以即使存在 `to` 也不投递，让输出保持内部。

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
    maxConcurrentRuns: 1 // default 1
  }
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
  --deliver \
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
  --deliver \
  --channel telegram \
  --to "-1001234567890:topic:123"
```
