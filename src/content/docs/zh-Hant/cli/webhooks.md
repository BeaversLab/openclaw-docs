---
summary: "CLI 參考資料，用於 `openclaw webhooks` (webhook helper + Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Webhook helper 和整合 (Gmail Pub/Sub, webhook helpers)。

相關：

- Webhooks: [Webhook](/en/automation/webhook)
- Gmail Pub/Sub: [Gmail Pub/Sub](/en/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

詳細資訊請參閱 [Gmail Pub/Sub 文件](/en/automation/gmail-pubsub)。
