---
summary: "`openclaw webhooks`（Webhook 辅助工具 + Gmail Pub/Sub）的 CLI 参考"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Webhook 辅助工具和集成（Gmail Pub/Sub、webhook 辅助工具）。

相关：

- Webhooks：[Webhook](/zh/en/automation/webhook)
- Gmail Pub/Sub：[Gmail Pub/Sub](/zh/en/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

有关详细信息，请参阅 [Gmail Pub/Sub 文档](/zh/en/automation/gmail-pubsub)。

import zh from '/components/footer/zh.mdx';

<zh />
