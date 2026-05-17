---
summary: "CLI 參考資料 for `openclaw webhooks` (Gmail Pub/Sub 設定與執行器)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You need the full flag list and default values
title: "Webhooks"
---

# `openclaw webhooks`

Webhook 協助程式與整合。目前此範圍僅限於與內建 `gog` 監聽器整合的 Gmail Pub/Sub 流程。

## 子指令

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| 子指令        | 描述                                                               |
| ------------- | ------------------------------------------------------------------ |
| `gmail setup` | 設定 Gmail 監聽、Pub/Sub 主題/訂閱以及 OpenClaw webhook 傳遞目標。 |
| `gmail run`   | 執行 `gog watch serve` 以及監聽自動續約迴圈。                      |

## `webhooks gmail setup`

設定 Gmail 監聽、Pub/Sub 與 OpenClaw webhook 傳遞。

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### 必要

| 旗標                | 描述                  |
| ------------------- | --------------------- |
| `--account <email>` | 要監聽的 Gmail 帳號。 |

### Pub/Sub 選項

| 旗標                    | 預設值                 | 描述                                            |
| ----------------------- | ---------------------- | ----------------------------------------------- |
| `--project <id>`        | (無)                   | GCP 專案 ID (OAuth 客戶端擁有者)。              |
| `--topic <name>`        | `gog-gmail-watch`      | Pub/Sub 主題名稱。                              |
| `--subscription <name>` | `gog-gmail-watch-push` | Pub/Sub 訂閱名稱。                              |
| `--label <label>`       | `INBOX`                | 要監聽的 Gmail 標籤。                           |
| `--push-endpoint <url>` | (無)                   | 明確指定的 Pub/Sub 推送端點。將覆寫 Tailscale。 |

### OpenClaw 傳遞選項

| 旗標                   | 預設值 | 描述                                  |
| ---------------------- | ------ | ------------------------------------- |
| `--hook-url <url>`     | (無)   | OpenClaw webhook URL。                |
| `--hook-token <token>` | (無)   | OpenClaw webhook 權杖。               |
| `--push-token <token>` | (無)   | 轉發至 `gog watch serve` 的推送權杖。 |

### `gog watch serve` 選項

| 旗標                  | 預設值          | 描述                                                    |
| --------------------- | --------------- | ------------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | `gog watch serve` 綁定主機。                            |
| `--port <port>`       | `8788`          | `gog watch serve` 連接埠。                              |
| `--path <path>`       | `/gmail-pubsub` | `gog watch serve` 路徑。                                |
| `--include-body`      | `true`          | 包含電子郵件內文摘要。傳遞 `--no-include-body` 以停用。 |
| `--max-bytes <n>`     | `20000`         | 每個內文摘要的最大位元組數。                            |
| `--renew-minutes <n>` | `720` (12h)     | 每 N 分鐘更新 Gmail watch。                             |

### Tailscale 暴露

| Flag                      | 預設     | 描述                                                          |
| ------------------------- | -------- | ------------------------------------------------------------- |
| `--tailscale <mode>`      | `funnel` | 透過 tailscale 暴露推送端點：`funnel`、`serve` 或 `off`。     |
| `--tailscale-path <path>` | (無)     | Tailscale serve/funnel 的路徑。                               |
| `--tailscale-target <t>`  | (無)     | Tailscale serve/funnel 的目標（連接埠、`host:port` 或 URL）。 |

### 輸出

| Flag     | 描述                         |
| -------- | ---------------------------- |
| `--json` | 列印機器可讀的摘要而非文字。 |

## `webhooks gmail run`

在前台執行 `gog watch serve` 以及 watch 自動更新迴圈。

```bash
openclaw webhooks gmail run --account you@example.com
```

`run` 接受與 `setup` 相同的 `gog watch serve`、OpenClaw 傳遞、Pub/Sub 和 Tailscale flags，但除外：

- `--account` 在 `run` 上是**可選的**（它會退回至設定的帳戶）。
- `run` **不**接受 `--project`、`--push-endpoint` 或 `--json`。
- `run` flags 沒有內建的預設值；缺失的值會退回至由 `setup` 寫入的值。

| 類別              | Flags                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Pub/Sub           | `--account`、`--topic`、`--subscription`、`--label`                              |
| OpenClaw 傳遞     | `--hook-url`、`--hook-token`、`--push-token`                                     |
| `gog watch serve` | `--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes` |
| Tailscale         | `--tailscale`、`--tailscale-path`、`--tailscale-target`                          |

<Note>對於 `run`，`--topic` 值是完整的 Pub/Sub 主題路徑 (`projects/.../topics/...`)，而不僅是短主題名稱。</Note>

## 端對端流程

請參閱 [Gmail Pub/Sub 整合](/zh-Hant/automation/cron-jobs#gmail-pubsub-integration)，了解與這些 CLI 命令配對的 GCP 專案、OAuth 和閘道端設定。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [Webhook 自動化](/zh-Hant/automation/webhook)
- [Gmail Pub/Sub](/zh-Hant/automation/cron-jobs#gmail-pubsub-integration)
