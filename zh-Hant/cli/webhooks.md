---
summary: "CLI 參考資料 for `openclaw webhooks` (webhook helpers + Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Webhook helper 與整合 (Gmail Pub/Sub, webhook helpers)。

相關：

- Webhooks: [Webhook](/zh-Hant/automation/webhook)
- Gmail Pub/Sub: [Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

詳見 [Gmail Pub/Sub 文件](/zh-Hant/automation/gmail-pubsub)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
