---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 的 gateway 健康端点）"
read_when:
  - 你想快速检查运行中的 Gateway 健康状态
title: "health"
---

# `openclaw health`

从运行中的 Gateway 获取健康信息。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

说明：

- `--verbose` 会执行实时探测；当配置多个账号时会输出每个账号的耗时。
- 当配置多个 agent 时，输出包含每个 agent 的会话存储。
