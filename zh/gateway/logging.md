---
summary: "日志输出面、文件日志、WS 日志样式与控制台格式"
read_when:
  - 修改日志输出或格式
  - 排查 CLI 或 gateway 输出
title: "日志"
---

# 日志

用户侧概览（CLI + Control UI + config）见 [/logging](/zh/logging)。

OpenClaw 有两个日志“面”：

- **控制台输出**（终端/Debug UI 中看到的内容）。
- **文件日志**（gateway 写入的 JSON 行）。

## 文件日志

- 默认滚动日志位于 `/tmp/openclaw/`（每日一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用 gateway 主机本地时区。
- 可通过 `~/.openclaw/openclaw.json` 配置日志路径与级别：
  - `logging.file`
  - `logging.level`

文件格式为每行一个 JSON 对象。

Control UI 的 Logs 标签通过 gateway（`logs.tail`）跟踪此文件。
CLI 也可跟踪：

```bash
openclaw logs --follow
```

**Verbose vs 日志级别**

- **文件日志**仅受 `logging.level` 控制。
- `--verbose` 只影响**控制台详细程度**（以及 WS 日志样式）；**不会**提升文件日志级别。
- 若要捕获 verbose 细节到文件日志，请将 `logging.level` 设为 `debug` 或 `trace`。

## 控制台捕获

CLI 会捕获 `console.log/info/warn/error/debug/trace` 并写入文件日志，同时仍输出到 stdout/stderr。

可独立调节控制台详细程度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 工具摘要脱敏

Verbose 工具摘要（例如 `🛠️ Exec: ...`）在进入控制台流前可掩码敏感 token。这**仅作用于工具摘要**，不会修改文件日志。

- `logging.redactSensitive`：`off` | `tools`（默认 `tools`）
- `logging.redactPatterns`：正则字符串数组（覆盖默认）
  - 使用原始正则字符串（自动 `gi`），或 `/pattern/flags` 以自定义 flags。
  - 命中后保留首 6 + 末 4 字符（长度 >= 18），否则替换为 `***`。
  - 默认覆盖常见 key 赋值、CLI flags、JSON 字段、bearer headers、PEM 块以及常见 token 前缀。

## Gateway WebSocket 日志

gateway 以两种模式打印 WebSocket 协议日志：

- **正常模式（无 `--verbose`）**：仅打印“重要” RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **Verbose 模式（`--verbose`）**：打印全部 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持每 gateway 的样式切换：

- `--ws-log auto`（默认）：正常模式优化；verbose 模式使用 compact 输出
- `--ws-log compact`：verbose 下使用紧凑输出（配对 req/res）
- `--ws-log full`：verbose 下输出完整逐帧信息
- `--compact`：`--ws-log compact` 别名

示例：

```bash
# 优化模式（仅错误/慢调用）
openclaw gateway

# 显示全部 WS 流量（配对）
openclaw gateway --verbose --ws-log compact

# 显示全部 WS 流量（完整元数据）
openclaw gateway --verbose --ws-log full
```

## 控制台格式（子系统日志）

控制台格式**感知 TTY**，输出一致的前缀行。子系统日志保持分组与可读性。

行为：

- **子系统前缀**（如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（按子系统稳定分配）+ 级别颜色
- **仅在 TTY/富终端环境输出颜色**（`TERM`/`COLORTERM`/`TERM_PROGRAM`），并尊重 `NO_COLOR`
- **缩短子系统前缀**：去掉 `gateway/` + `channels/`，保留最后 2 段（如 `whatsapp/outbound`）
- **子系统子 logger**（自动前缀 + 结构化字段 `{ subsystem }`）
- **`logRaw()`** 用于 QR/UX 输出（无前缀、无格式）
- **控制台样式**（如 `pretty | compact | json`）
- **控制台级别**与文件日志级别分离（当 `logging.level` 为 `debug`/`trace` 时文件仍保留完整细节）
- **WhatsApp 消息正文**以 `debug` 级别记录（用 `--verbose` 可见）

这样既保持文件日志稳定，又让交互输出可扫读。
