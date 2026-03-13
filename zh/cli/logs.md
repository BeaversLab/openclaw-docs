---
summary: "`openclaw logs` 的 CLI 参考（通过 RPC 跟踪 Gateway 日志）"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `openclaw logs`

通过 RPC 跟踪 Gateway 文件日志（适用于远程模式）。

相关：

- 日志概述：[Logging](/zh/en/logging)

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
```

使用 `--local-time` 以您的本地时区显示时间戳。

import zh from '/components/footer/zh.mdx';

<zh />
