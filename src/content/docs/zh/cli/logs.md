---
summary: "用于 `openclaw logs`（通过 RPC 跟踪网关日志）的 CLI 参考"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `openclaw logs`

通过 RPC 跟踪 Gateway(网关) 网关 文件日志（适用于远程模式）。

相关：

- 日志概览：[日志](/zh/logging)
- Gateway(网关) CLI：[gateway](/zh/cli/gateway)

## 选项

- `--limit <n>`：要返回的日志行最大数量（默认为 `200`）
- `--max-bytes <n>`：从日志文件中读取的最大字节数（默认为 `250000`）
- `--follow`：跟踪日志流
- `--interval <ms>`：跟踪时的轮询间隔（默认为 `1000`）
- `--json`：输出行分隔的 JSON 事件
- `--plain`：不带样式格式的纯文本输出
- `--no-color`：禁用 ANSI 颜色
- `--local-time`：以您的本地时区渲染时间戳

## 共享 Gateway(网关) RPC 选项

`openclaw logs` 也接受标准的 Gateway(网关) 客户端标志：

- `--url <url>`：Gateway(网关) WebSocket URL
- `--token <token>`：Gateway(网关) 令牌
- `--timeout <ms>`：超时时间，以毫秒为单位（默认为 `30000`）
- `--expect-final`：当 Gateway(网关) 调用由代理支持时，等待最终响应

当您传递 `--url` 时，CLI 不会自动应用配置或环境凭据。如果目标 Gateway(网关) 需要身份验证，请显式包含 `--token`。

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## 注

- 使用 `--local-time` 以您的本地时区渲染时间戳。
- 如果本地环回 Gateway(网关) 请求配对，`openclaw logs` 会自动回退到配置的本地日志文件。显式的 `--url` 目标不使用此回退机制。
