---
summary: "Logging surfaces, file logs, WS log styles, and console formatting"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway(网关) Logging"
---

# 日志记录

有关面向用户的概述（CLI + 控制 UI + 配置），请参阅 [/logging](/en/logging)。

OpenClaw 有两个日志“平面”：

- **终端输出**（您在终端 / 调试界面中看到的内容）。
- **文件日志**（JSON 行），由网关日志记录器写入。

## 基于文件的日志记录器

- 默认的滚动日志文件位于 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用网关主机的本地时区。
- 日志文件路径和级别可以通过 `~/.openclaw/openclaw.json` 进行配置：
  - `logging.file`
  - `logging.level`

文件格式为每行一个 JSON 对象。

控制 UI 日志选项卡通过 Gateway 网关 (`logs.tail`) 跟踪此文件。
CLI 也可以执行相同的操作：

```bash
openclaw logs --follow
```

**Verbose 与日志级别**

- **文件日志**完全由 `logging.level` 控制。
- `--verbose` 仅影响 **控制台详细程度**（以及 WS 日志样式）；它**不会**
  提高文件日志级别。
- 若要在文件日志中捕获仅限 Verbose 的详细信息，请将 `logging.level` 设置为 `debug` 或
  `trace`。

## 控制台捕获

CLI 捕获 `console.log/info/warn/error/debug/trace` 并将其写入文件日志，同时仍然打印到 stdout/stderr。

您可以通过以下方式独立调整控制台详细程度：

- `logging.consoleLevel`（默认为 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 工具摘要脱敏

详细的工具摘要（例如 `🛠️ Exec: ...`）可以在敏感令牌进入
控制台流之前将其屏蔽。这**仅适用于工具**，不会更改文件日志。

- `logging.redactSensitive`: `off` | `tools`（默认：`tools`）
- `logging.redactPatterns`: 正则字符串数组（覆盖默认值）
  - 使用原始正则字符串（自动 `gi`），如果需要自定义标志，则使用 `/pattern/flags`。
  - 匹配项通过保留前 6 个 + 后 4 个字符（长度 >= 18）来屏蔽，否则使用 `***`。
  - 默认值涵盖常见的密钥分配、CLI 标志、JSON 字段、承载头、PEM 块和流行的令牌前缀。

## Gateway(网关) 网关 WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **普通模式（无 `--verbose`）**：仅打印“有趣”的 RPC 结果：
  - 错误 (`ok=false`)
  - 慢速调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持按网关切换样式：

- `--ws-log auto`（默认）：优化了普通模式；详细模式使用紧凑输出
- `--ws-log compact`：详细时使用紧凑输出（配对的请求/响应）
- `--ws-log full`：详细时使用完整逐帧输出
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

控制台格式化程序是 **TTY 感知的**，并打印一致的、带前缀的行。
子系统日志记录器保持输出分组且易于扫描。

行为：

- 每行都有 **子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统稳定）加上级别着色
- **当输出是 TTY 或环境看起来像富终端时着色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），尊重 `NO_COLOR`
- **缩短的子系统前缀**：去掉前导 `gateway/` + `channels/`，保留最后 2 段（例如 `whatsapp/outbound`）
- **按子系统划分的子日志记录器**（自动前缀 + 结构化字段 `{ subsystem }`）
- **`logRaw()`** 用于 QR/UX 输出（无前缀，无格式化）
- **控制台样式**（例如 `pretty | compact | json`）
- **控制台日志级别**与文件日志级别分开（当 `logging.level` 设置为 `debug`/`trace` 时，文件保留完整细节）
- **WhatsApp 消息正文**在 `debug` 记录（使用 `--verbose` 查看它们）

这既保持了现有文件日志的稳定，又使交互式输出易于浏览。
