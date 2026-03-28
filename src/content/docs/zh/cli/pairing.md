---
summary: "`openclaw pairing` 的 CLI 参考（批准/列出配对请求）"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "配对"
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

- 频道输入：按位置传递（`pairing list telegram`）或使用 `--channel <channel>`。
- `pairing list` 支持多账号频道的 `--account <accountId>`。
- `pairing approve` 支持 `--account <accountId>` 和 `--notify`。
- 如果只配置了一个支持配对的频道，则允许 `pairing approve <code>`。
