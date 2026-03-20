---
summary: "`openclaw webhooks` 的 CLI 參考（webhook 輔助程式 + Gmail Pub/Sub）"
read_when:
  - 您想將 Gmail Pub/Sub 事件連接到 OpenClaw
  - 您需要 webhook 輔助指令
title: "webhooks"
---

# `openclaw webhooks`

Webhook 輔助程式與整合（Gmail Pub/Sub、webhook 輔助程式）。

相關連結：

- Webhooks：[Webhook](/zh-Hant/automation/webhook)
- Gmail Pub/Sub：[Gmail Pub/Sub](/zh-Hant/automation/gmail-pubsub)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

詳情請參閱 [Gmail Pub/Sub 文件](/zh-Hant/automation/gmail-pubsub)。

import en from "/components/footer/en.mdx";

<en />
