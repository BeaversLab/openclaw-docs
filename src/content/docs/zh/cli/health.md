---
summary: "CLI 参考手册，用于 `openclaw health`（通过 RPC 获取网关健康快照）"
read_when:
  - You want to quickly check the running Gateway's health
title: "Health"
---

# `openclaw health`

从正在运行的 Gateway(网关) 网关 获取健康信息。

## 选项

| 标志             | 默认值  | 描述                                                 |
| ---------------- | ------- | ---------------------------------------------------- |
| `--json`         | `false` | 打印机器可读的 JSON 而不是文本。                     |
| `--timeout <ms>` | `10000` | 连接超时（以毫秒为单位）。                           |
| `--verbose`      | `false` | 详细日志记录。强制进行实时探测并展开每个代理的输出。 |
| `--debug`        | `false` | `--verbose` 的别名。                                 |

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

注意：

- 默认 `openclaw health` 会向正在运行的 Gateway 询问其健康快照。当
  Gateway 已经有新的缓存快照时，它可以返回该缓存负载并在
  后台刷新。
- `--verbose` 强制进行实时探测，打印 Gateway 连接详细信息，并将
  可读输出扩展到所有配置的帐户和代理。
- 当配置了多个代理时，输出包括每个代理的会话存储。

## 相关

- [CLI 参考](CLI/en/cli)
- [Gateway 健康状况](<Gateway(网关)/en/gateway/health>)
