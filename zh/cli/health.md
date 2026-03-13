---
summary: "CLI 参考（通过 RPC 获取网关健康端点）`openclaw health`"
read_when:
  - You want to quickly check the running Gateway’s health
title: "health"
---

# `openclaw health`

从正在运行的 Gateway 获取健康状态。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

注意：

- `--verbose` 运行实时探测，并在配置了多个账户时打印每个账户的计时信息。
- 当配置了多个代理时，输出包含每个代理的会话存储。

import zh from '/components/footer/zh.mdx';

<zh />
