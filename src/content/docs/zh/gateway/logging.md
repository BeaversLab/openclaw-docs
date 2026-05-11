---
summary: "Logging surfaces, file logs, WS log styles, and console formatting"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway(网关) logging"
---

# 日志记录

有关面向用户的概述（CLI + 控制 UI + 配置），请参阅 [/logging](/zh/logging)。

OpenClaw 有两个日志“平面”：

- **终端输出**（您在终端 / 调试界面中看到的内容）。
- **文件日志**（JSON 行），由网关日志记录器写入。

## 基于文件的日志记录器

- 默认的滚动日志文件位于 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用网关主机的本地时区。
- Active log files rotate at `logging.maxFileBytes` (default: 100 MB), keeping
  up to five numbered archives and continuing to write a fresh active file.
- The log file path and level can be configured via `~/.openclaw/openclaw.json`:
  - `logging.file`
  - `logging.level`

The file format is one JSON object per line.

The Control UI Logs tab tails this file via the gateway (`logs.tail`).
CLI can do the same:

```bash
openclaw logs --follow
```

**Verbose vs. log levels**

- **File logs** are controlled exclusively by `logging.level`.
- `--verbose` only affects **console verbosity** (and WS log style); it does **not**
  raise the file log level.
- To capture verbose-only details in file logs, set `logging.level` to `debug` or
  `trace`.

## Console capture

The CLI captures `console.log/info/warn/error/debug/trace` and writes them to file logs,
while still printing to stdout/stderr.

You can tune console verbosity independently via:

- `logging.consoleLevel` (default `info`)
- `logging.consoleStyle` (`pretty` | `compact` | `json`)

## Redaction

OpenClaw can mask sensitive tokens before log or transcript output leaves the
process. The same redaction policy is applied at console, file-log, OTLP
log-record, and 会话 transcript text sinks, so matching secret values are
masked before JSONL lines or messages are written to disk.

- `logging.redactSensitive`: `off` | `tools` (default: `tools`)
- `logging.redactPatterns`: array of regex strings (overrides defaults)
  - Use raw regex strings (auto `gi`), or `/pattern/flags` if you need custom flags.
  - Matches are masked by keeping the first 6 + last 4 chars (length >= 18), otherwise `***`.
  - Defaults cover common key assignments, CLI flags, JSON fields, bearer headers, PEM blocks, and popular token prefixes.

## Gateway(网关) WebSocket logs

网关以两种模式打印 WebSocket 协议日志：

- **普通模式（无 `--verbose`）**：仅打印“有趣”的 RPC 结果：
  - 错误（`ok=false`）
  - 慢速调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持按网关切换样式：

- `--ws-log auto`（默认）：普通模式已优化；详细模式使用紧凑输出
- `--ws-log compact`：详细时的紧凑输出（配对的请求/响应）
- `--ws-log full`：详细时的完整每帧输出
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
# optimized (only errors/slow)
openclaw gateway

# show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# show all WS traffic (full meta)
openclaw gateway --verbose --ws-log full
```

## 控制台格式化（子系统日志记录）

控制台格式化程序是 **TTY 感知**的，并打印一致的、带前缀的行。
子系统记录器使输出保持分组且可扫描。

行为：

- **每行上的子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统稳定）加上级别颜色
- **当输出是 TTY 或环境看起来像富终端时着色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），尊重 `NO_COLOR`
- **缩短的子系统前缀**：去掉开头的 `gateway/` + `channels/`，保留最后 2 段（例如 `whatsapp/outbound`）
- **按子系统的子记录器**（自动前缀 + 结构化字段 `{ subsystem }`）
- 用于 QR/UX 输出的 **`logRaw()`**（无前缀，无格式化）
- **控制台样式**（例如 `pretty | compact | json`）
- **控制台日志级别**与文件日志级别分开（当 `logging.level` 设置为 `debug`/`trace` 时，文件保留完整细节）
- **WhatsApp 消息正文**在 `debug` 记录（使用 `--verbose` 查看它们）

这使得现有的文件日志保持稳定，同时使交互式输出易于扫描。

## 相关

- [日志记录](/zh/logging)
- [OpenTelemetry 导出](/zh/gateway/opentelemetry)
- [诊断导出](/zh/gateway/diagnostics)
