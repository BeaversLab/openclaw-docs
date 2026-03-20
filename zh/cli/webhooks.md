---
summary: "CLI 参考 `openclaw webhooks` （webhook 帮助程序 + Gmail Pub/Sub）"
read_when:
  - 您希望将 Gmail Pub/Sub 事件连接到 OpenClaw
  - 您希望使用 webhook 帮助程序命令
title: "webhooks"
---

# `openclaw webhooks`

Webhook 帮助程序和集成（Gmail Pub/Sub、webhook 帮助程序）。

相关：

- Webhooks：[Webhook](/zh/automation/webhook)
- Gmail Pub/Sub：[Gmail Pub/Sub](/zh/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

有关详细信息，请参阅 [Gmail Pub/Sub 文档](/zh/automation/gmail-pubsub)。

import en from "/components/footer/en.mdx";

<en />
