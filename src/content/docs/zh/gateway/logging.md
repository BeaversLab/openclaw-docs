---
summary: "日志表面、文件日志、WS 日志样式和控制台格式"
read_when:
  - Changing logging output or formats
  - Debugging CLI or gateway output
title: "Gateway(网关) 日志记录"
---

# 日志记录

有关面向用户的概述（CLI + Control UI + 配置），请参阅 [/logging](/zh/logging)。

OpenClaw 有两个日志“表面”：

- **终端输出**（您在终端 / 调试界面中看到的内容）。
- **文件日志**（JSON 行），由网关日志记录器写入。

启动时，Gateway(网关) 会记录已解析的默认代理模型以及影响新会话的模式默认值，例如：

```text
agent model: openai-codex/gpt-5.5 (thinking=medium, fast=on)
```

`thinking` 来自默认代理、模型参数或全局代理默认值；当其未设置时，启动摘要显示 `medium`。`fast` 来自默认代理或模型 `fastMode` 参数。

## 基于文件的记录器

- 默认滚动日志文件位于 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用网关主机的本地时区。
- 活动日志文件在 `logging.maxFileBytes` 处轮换（默认：100 MB），最多保留五个编号的存档，并继续写入一个新的活动文件。
- 日志文件路径和级别可以通过 `~/.openclaw/openclaw.json` 配置：
  - `logging.file`
  - `logging.level`

文件格式是每行一个 JSON 对象。

Talk、实时语音和托管室代码路径使用共享文件记录器来记录有边界生命周期的记录。这些记录旨在用于操作调试和 OTLP 日志导出；转录文本、音频负载、回合 ID、呼叫 ID 和提供商项目 ID 不会复制到日志记录中。

Control UI 的日志选项卡通过网关（`logs.tail`）跟踪此文件。
CLI 也可以执行相同的操作：

```bash
openclaw logs --follow
```

**详细模式与日志级别**

- **文件日志** 仅由 `logging.level` 控制。
- `--verbose` 仅影响 **控制台详细程度**（以及 WS 日志样式）；它**不会**提高文件日志级别。
- 要在文件日志中捕获仅详细模式下的详细信息，请将 `logging.level` 设置为 `debug` 或
  `trace`。
- 跟踪日志还包括所选热路径的诊断计时摘要，例如插件工具工厂准备。请参阅 [/tools/plugin#slow-plugin-工具-setup](/zh/tools/plugin#slow-plugin-tool-setup)。

## 控制台捕获

CLI 捕获 `console.log/info/warn/error/debug/trace` 并将其写入文件日志，同时仍打印到 stdout/stderr。

您可以通过以下方式独立调整控制台详细程度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 编辑

OpenClaw 可以在日志或记录输出离开进程之前屏蔽敏感令牌。此日志编辑策略应用于控制台、文件日志、OTLP 日志记录和会话记录文本接收器，因此在将 JSONL 行或消息写入磁盘之前，匹配的机密值会被屏蔽。

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：正则表达式字符串数组（覆盖默认值）
  - 使用原始正则表达式字符串（自动 `gi`），或者如果需要自定义标志，请使用 `/pattern/flags`。
  - 通过保留前 6 个 + 后 4 个字符（长度 >= 18）来屏蔽匹配项，否则 `***`。
  - 默认值覆盖常见的密钥分配、CLI 标志、JSON 字段、Bearer 标头、PEM 块、流行的令牌前缀以及支付凭证字段名称，例如卡号、CVC/CVV、共享支付令牌和支付凭证。

无论 `logging.redactSensitive` 如何，某些安全边界始终会进行编辑。这包括 Control UI 工具调用事件、`sessions_history` 工具输出、诊断支持导出、提供商错误观察、exec 批准命令显示以及 Gateway(网关) WebSocket 协议日志。这些表面可能仍将 `logging.redactPatterns` 用作附加模式，但 `redactSensitive: "off"` 不会使其发出原始机密。

## Gateway(网关) WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **正常模式（无 `--verbose`RPC）**：仅打印“有趣”的 RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持针对每个网关的样式开关：

- `--ws-log auto`（默认）：正常模式已优化；详细模式使用紧凑输出
- `--ws-log compact`：详细模式时使用紧凑输出（配对的请求/响应）
- `--ws-log full`：详细模式时使用每帧完整输出
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
子系统日志记录器保持输出分组且易于扫描。

行为：

- 每行都有 **子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统固定）加上级别颜色
- **当输出是 TTY 或环境看起来像富终端时显示颜色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），尊重 `NO_COLOR`
- **缩短的子系统前缀**：去掉开头的 `gateway/` + `channels/`，保留最后 2 个段（例如 `whatsapp/outbound`）
- **按子系统设置子记录器**（自动前缀 + 结构化字段 `{ subsystem }`）
- **`logRaw()`** 用于 QR/UX 输出（无前缀，无格式）
- **控制台样式**（例如 `pretty | compact | json`）
- **控制台日志级别** 与文件日志级别分开（当 `logging.level` 设置为 `debug`/`trace` 时，文件保留完整详细信息）
- **WhatsApp 消息正文** 在 WhatsApp`debug` 级别记录（使用 `--verbose` 查看它们）

这使现有文件日志保持稳定，同时使交互式输出易于扫描。

## 相关

- [日志记录](/zh/logging)
- [OpenTelemetry 导出](/zh/gateway/opentelemetry)
- [诊断导出](/zh/gateway/diagnostics)
