---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 获取 gateway 健康端点）"
read_when:
  - "You want to quickly check the running Gateway's health"
title: "health"
---

# `openclaw health`

从运行中的 Gateway 获取健康状态。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

注意事项：

- `--verbose` 运行实时探针，并在配置多个账户时打印每个账户的计时。
- 当配置多个代理时，输出包括每个代理的会话存储。
