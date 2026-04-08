---
summary: "CLI 参考手册，用于 `openclaw health`（通过 RPC 获取网关健康快照）"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

从正在运行的 Gateway(网关) 网关 获取健康信息。

选项：

- `--json`：机器可读的输出
- `--timeout <ms>`：连接超时（以毫秒为单位）（默认 `10000`）
- `--verbose`：详细日志记录
- `--debug`：`--verbose` 的别名

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

说明：

- 默认的 `openclaw health` 会向正在运行的网关请求其健康快照。当
  网关已有新鲜的缓存快照时，它可以返回该缓存内容并在
  后台进行刷新。
- `--verbose` 强制进行实时探测，打印网关连接详细信息，并在所有配置的账户和代理上展开
  人类可读的输出。
- 当配置了多个代理时，输出包含每个代理的会话存储。
