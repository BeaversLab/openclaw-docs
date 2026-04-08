---
summary: "用於 `openclaw webhooks`（webhook 輔助程式 + Gmail Pub/Sub）的 CLI 參考資料"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Webhook helper 和整合 (Gmail Pub/Sub, webhook helpers)。

相關：

- Webhooks：[Webhooks](/en/automation/cron-jobs#webhooks)
- Gmail Pub/Sub：[Gmail Pub/Sub](/en/automation/cron-jobs#gmail-pubsub-integration)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

### `webhooks gmail setup`

設定 Gmail watch、Pub/Sub 和 OpenClaw webhook 傳送。

必要：

- `--account <email>`

選項：

- `--project <id>`
- `--topic <name>`
- `--subscription <name>`
- `--label <label>`
- `--hook-url <url>`
- `--hook-token <token>`
- `--push-token <token>`
- `--bind <host>`
- `--port <port>`
- `--path <path>`
- `--include-body`
- `--max-bytes <n>`
- `--renew-minutes <n>`
- `--tailscale <funnel|serve|off>`
- `--tailscale-path <path>`
- `--tailscale-target <target>`
- `--push-endpoint <url>`
- `--json`

範例：

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### `webhooks gmail run`

執行 `gog watch serve` 以及 watch 自動更新迴圈。

選項：

- `--account <email>`
- `--topic <topic>`
- `--subscription <name>`
- `--label <label>`
- `--hook-url <url>`
- `--hook-token <token>`
- `--push-token <token>`
- `--bind <host>`
- `--port <port>`
- `--path <path>`
- `--include-body`
- `--max-bytes <n>`
- `--renew-minutes <n>`
- `--tailscale <funnel|serve|off>`
- `--tailscale-path <path>`
- `--tailscale-target <target>`

範例：

```bash
openclaw webhooks gmail run --account you@example.com
```

請參閱 [Gmail Pub/Sub 文件](/en/automation/cron-jobs#gmail-pubsub-integration) 以了解端到端設定流程和操作詳細資訊。
