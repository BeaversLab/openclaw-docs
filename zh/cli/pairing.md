---
summary: “CLI 参考 `openclaw pairing`（批准/列出配对请求）”
read_when:
  - 您正在使用配对模式私信，并且需要批准发送方
title: “pairing”
---

# `openclaw pairing`

批准或检查私信（私信）配对请求（针对支持配对的频道）。

相关：

- 配对流程：[配对](/zh/channels/pairing)

## 命令

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## 说明

- 渠道输入：按位置传递 (`pairing list telegram`) 或使用 `--channel <channel>`。
- `pairing list` 支持多账户渠道的 `--account <accountId>`。
- `pairing approve` 支持 `--account <accountId>` 和 `--notify`。
- 如果仅配置了一个具有配对功能的渠道，则允许使用 `pairing approve <code>`。

import zh from "/components/footer/zh.mdx";

<zh />
