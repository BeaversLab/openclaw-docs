---
summary: "CLI 參考資料：`openclaw webhooks` (webhook 輔助程式 + Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Webhook 輔助程式與整合功能 (Gmail Pub/Sub、webhook 輔助程式)。

相關連結：

- Webhooks：[Webhook](/zh-Hant/automation/webhook)
- Gmail Pub/Sub：[Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

詳情請參閱 [Gmail Pub/Sub 文件](/zh-Hant/automation/gmail-pubsub)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
