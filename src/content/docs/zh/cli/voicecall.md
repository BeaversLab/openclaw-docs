---
summary: "`openclaw voicecall`CLICLI参考（voice-call 插件命令表面）"
read_when:
  - You use the voice-call plugin and want every CLI entry point
  - You need flag tables and defaults for setup, smoke, call, continue, speak, dtmf, end, status, tail, latency, expose, and start
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` 是一个插件提供的命令。它仅在安装并启用了 voice-call 插件时出现。

当 Gateway(网关) 运行时，操作命令（Gateway(网关)`call`、`start`、`continue`、`speak`、`dtmf`、`end`、`status`Gateway(网关)Gateway(网关)CLI）被路由到该 Gateway(网关) 的语音通话运行时。如果无法连接到任何 Gateway(网关)，它们将回退到独立的 CLI 运行时。

## 子命令

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| 子命令     | 描述                                                        |
| ---------- | ----------------------------------------------------------- |
| `setup`    | 显示提供商和 webhook 的就绪检查。                           |
| `smoke`    | 运行就绪检查；仅在使用 `--yes` 时进行实时测试通话。         |
| `call`     | 发起 outbound 语音通话。                                    |
| `start`    | `call` 的别名，其中 `--to` 是必需的，`--message` 是可选的。 |
| `continue` | 说话并等待下一个回复。                                      |
| `speak`    | 说话而不等待回复。                                          |
| `dtmf`     | 向活动通话发送 DTMF 数字。                                  |
| `end`      | 挂断活动通话。                                              |
| `status`   | 检查活动通话（或通过 `--call-id` 检查一个）。               |
| `tail`     | 跟踪 `calls.jsonl`（在提供商测试期间有用）。                |
| `latency`  | 汇总来自 `calls.jsonl` 的轮次延迟指标。                     |
| `expose`   | 为 webhook 端点切换 Tailscale serve/funnel。                |

## 设置和冒烟测试

### `setup`

默认打印人类可读的就绪检查。传递 `--json` 用于脚本。

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

运行相同的就绪检查。除非同时存在 `--to` 和 `--yes`，否则它不会拨打电话。

| 标志               | 默认值                            | 描述                                   |
| ------------------ | --------------------------------- | -------------------------------------- |
| `-t, --to <phone>` | （无）                            | 用于实际冒烟测试的电话号码。           |
| `--message <text>` | `OpenClaw voice call smoke test.` | 冒烟测试期间播放的消息。               |
| `--mode <mode>`    | `notify`                          | 呼叫模式：`notify` 或 `conversation`。 |
| `--yes`            | `false`                           | 实际拨打出站电话。                     |
| `--json`           | `false`                           | 打印机器可读的 JSON。                  |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

<Note>对于外部提供商 (`twilio`, `telnyx`, `plivo`)，`setup` 和 `smoke` 需要来自 `publicUrl`Tailscale、隧道或 Tailscale 暴露的公共 Webhook URL。回环或私有服务回退会被拒绝，因为运营商无法访问它。</Note>

## 呼叫生命周期

### `call`

发起出站语音呼叫。

| Flag                   | 必填 | 默认值          | 描述                                                                |
| ---------------------- | ---- | --------------- | ------------------------------------------------------------------- |
| `-m, --message <text>` | 是   | (无)            | 呼叫接通时要朗读的消息。                                            |
| `-t, --to <phone>`     | 否   | 配置 `toNumber` | 要呼叫的 E.164 电话号码。                                           |
| `--mode <mode>`        | 否   | `conversation`  | 呼叫模式：`notify`（消息结束后挂断）或 `conversation`（保持连接）。 |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

### `start`

`call` 的别名，具有不同的默认标志形态。

| 标志               | 必需 | 默认值         | 描述                                   |
| ------------------ | ---- | -------------- | -------------------------------------- |
| `--to <phone>`     | 是   | (无)           | 要拨打的电话号码。                     |
| `--message <text>` | 否   | (无)           | 呼叫接通时要朗读的消息。               |
| `--mode <mode>`    | 否   | `conversation` | 呼叫模式：`notify` 或 `conversation`。 |

### `continue`

朗读一条消息并等待响应。

| 标志               | 必需 | 描述           |
| ------------------ | ---- | -------------- |
| `--call-id <id>`   | 是   | 呼叫 ID。      |
| `--message <text>` | 是   | 要朗读的消息。 |

### `speak`

朗读一条消息而不等待响应。

| 标志               | 必需 | 描述           |
| ------------------ | ---- | -------------- |
| `--call-id <id>`   | 是   | 通话 ID。      |
| `--message <text>` | 是   | 要朗读的消息。 |

### `dtmf`

向活动通话发送 DTMF 数字。

| 标志                | 必需 | 描述                                     |
| ------------------- | ---- | ---------------------------------------- |
| `--call-id <id>`    | 是   | 通话 ID。                                |
| `--digits <digits>` | 是   | DTMF 数字（例如 `ww123456#` 表示等待）。 |

### `end`

挂断活动通话。

| 标志             | 必需 | 描述      |
| ---------------- | ---- | --------- |
| `--call-id <id>` | 是   | 通话 ID。 |

### `status`

检查活动通话。

| 标志             | 默认值  | 描述                   |
| ---------------- | ------- | ---------------------- |
| `--call-id <id>` | （无）  | 将输出限制为一个通话。 |
| `--json`         | `false` | 打印机器可读的 JSON。  |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## 日志和指标

### `tail`

跟踪 voice-call JSONL 日志。启动时打印最后 `--since` 行，然后在新行写入时流式传输它们。

| Flag            | Default          | Description            |
| --------------- | ---------------- | ---------------------- |
| `--file <path>` | 从插件存储解析   | `calls.jsonl` 的路径。 |
| `--since <n>`   | `25`             | 跟踪前要打印的行数。   |
| `--poll <ms>`   | `250`（最少 50） | 轮询间隔（毫秒）。     |

### `latency`

汇总 `calls.jsonl` 中的轮次延迟 (turn-latency) 和监听等待 (listen-wait) 指标。输出为 JSON，包含 `recordsScanned`、`turnLatency` 和 `listenWait` 汇总信息。

| Flag            | Default        | Description            |
| --------------- | -------------- | ---------------------- |
| `--file <path>` | 从插件存储解析 | `calls.jsonl` 的路径。 |
| `--last <n>`    | `200` (至少 1) | 要分析的最近记录数量。 |

## 公开 Webhook

### `expose`

启用、禁用或更改语音 Webhook 的 Tailscale serve/funnel 配置。

| 标志                  | 默认值                                  | 描述                                          |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| `--mode <mode>`       | `funnel`                                | `off`、`serve` (tailnet) 或 `funnel` (公网)。 |
| `--path <path>`       | 配置 `tailscale.path` 或 `--serve-path` | 要公开的 Tailscale 路径。                     |
| `--port <port>`       | 配置 `serve.port` 或 `3334`             | 本地 Webhook 端口。                           |
| `--serve-path <path>` | 配置 `serve.path` 或 `/voice/webhook`   | 本地 Webhook 路径。                           |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>请仅将 Webhook 端点暴露给您信任的网络。如果可能，请优先使用 Tailscale Serve 而非 Funnel。</Warning>

## 相关

- [CLI 参考](/zh/cli)
- [语音通话插件](/zh/plugins/voice-call)
