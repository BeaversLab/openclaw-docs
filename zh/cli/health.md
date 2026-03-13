---
summary: "`openclaw health` 的 CLI 参考（通过 RPC 的网关健康端点）"
read_when:
  - You want to quickly check the running Gateway’s health
title: 健康
---

# `openclaw health`

从正在运行的 Gateway 获取健康信息。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

备注：

- 当配置了多个账户时，`--verbose` 会运行实时探测并打印每个账户的计时信息。
- 当配置了多个代理时，输出包括每个代理的会话存储。

import zh from '/components/footer/zh.mdx';

<zh />
