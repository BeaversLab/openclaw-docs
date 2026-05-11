---
summary: "CLI 参考，即 `openclaw proxy`，本地调试代理和捕获检查器"
read_when:
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "代理"
---

# `openclaw proxy`

运行本地显式调试代理并检查捕获的流量。

这是一个用于传输级调试的调查命令。它可以启动本地代理，在启用捕获的情况下运行子命令，列出捕获会话，查询常见流量模式，读取捕获的二进制大对象，以及清除本地捕获数据。

## 命令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

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
- 捕获内容是本地调试数据；完成后请使用 `openclaw proxy purge`。

## 相关

- [CLI 参考](/zh/cli)
- [受信任的代理身份验证](/zh/gateway/trusted-proxy-auth)
