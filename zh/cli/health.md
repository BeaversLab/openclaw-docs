---
summary: "CLI 参考，用于 `openclaw health`（通过 RPC 的网关健康端点）"
read_when:
  - 您想要快速检查运行中的 Gateway(网关) 的健康状况
title: "health"
---

# `openclaw health`

从正在运行的 Gateway 网关 获取健康信息。

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

备注：

- `--verbose` 运行实时探测，并在配置了多个账户时打印每个账户的计时信息。
- 当配置了多个代理时，输出包括每个代理的会话存储。

import en from "/components/footer/en.mdx";

<en />
