---
summary: "CLI 参考文档（CLI`openclaw proxy`），包括运营商管理的代理验证以及本地调试代理捕获检查器"
read_when:
  - You need to validate operator-managed proxy routing before deployment
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "代理"
---

# `openclaw proxy`

验证运营商管理的代理路由，或运行本地显式调试代理并检查捕获的流量。

在启用 OpenClaw 代理路由之前，请使用 `validate` 对运营商管理的正向代理进行预检。其他命令是用于传输层调查的调试工具：它们可以启动本地代理，在启用捕获的情况下运行子命令，列出捕获会话，查询常见流量模式，读取捕获的数据块，以及清除本地捕获数据。

## 命令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 验证

`openclaw proxy validate` 检查来自 `--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 的有效运营商管理代理 URL。当未启用且未配置代理时，它会报告配置问题；在更改配置之前，请使用 `--proxy-url` 进行一次性预检。默认情况下，它会验证公共目标是否通过代理成功，以及代理是否无法到达临时环回 Canary。自定义拒绝目标是故障关闭的：除非您可以单独验证特定于部署的拒绝信号，否则 HTTP 响应和不明确的传输失败都会导致失败。添加 `--apns-reachable` 还可以通过代理打开 APNs HTTP/2 CONNECT 隧道并确认沙盒 APNs 有响应；探测使用故意无效的提供商令牌，因此 APNs `403 InvalidProviderToken` 响应是成功的可达性信号。

选项：

- `--json`：打印机器可读的 JSON。
- `--proxy-url <url>`：验证此代理 URL 而不是配置或环境变量。
- `--allowed-url <url>`：添加一个预期通过代理成功的目标。重复此选项可检查多个目标。
- `--denied-url <url>`：添加一个预期被代理阻止的目标。重复此选项可检查多个目标。
- `--apns-reachable`：同时验证沙盒 APNs HTTP/2 是否可通过代理访问。
- `--apns-authority <url>`：使用 `--apns-reachable` 探测的 APNs 权限（默认为 `https://api.sandbox.push.apple.com`；生产环境为 `https://api.push.apple.com`）。
- `--timeout-ms <ms>`：每个请求的超时时间（毫秒）。

有关部署指南和拒绝语义，请参阅 [网络代理](/zh/security/network-proxy)。

## 查询预设

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注意

- 除非设置了 `--host`，否则 `start` 默认为 `127.0.0.1`。
- `run` 启动本地调试代理，然后运行 `--` 之后的命令。
- 调试代理的直接上游转发会打开上游套接字以进行诊断。当启用 OpenClaw 托管代理模式时，默认禁用代理请求和 CONNECT 隧道的直接转发；仅对批准的本地诊断设置 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。
- 当代理配置或目标检查失败时，`validate` 退出并返回代码 1。
- 捕获数据是本地调试数据；完成后请使用 `openclaw proxy purge`。

## 相关

- [CLI 参考](/zh/cli)
- [网络代理](/zh/security/network-proxy)
- [受信任代理认证](/zh/gateway/trusted-proxy-auth)
