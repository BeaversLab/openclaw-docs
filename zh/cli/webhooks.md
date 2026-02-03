---
summary: "`openclaw webhooks` 的 CLI 参考（webhook 助手 + Gmail Pub/Sub）"
title: "webhooks"
read_when:
  - 需要将 Gmail Pub/Sub 事件接入 OpenClaw
  - 需要 webhook 辅助命令
---

# `openclaw webhooks`

Webhook 助手与集成（Gmail Pub/Sub、webhook helpers）。

相关：

- Webhooks：[Webhook](/zh/automation/webhook)
- Gmail Pub/Sub：[Gmail Pub/Sub](/zh/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

详情见 [Gmail Pub/Sub 文档](/zh/automation/gmail-pubsub)。
