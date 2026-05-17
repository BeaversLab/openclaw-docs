---
summary: "CLICLI 参考文档，适用于 `openclaw webhooks`（Gmail Pub/Sub 设置和运行器）"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You need the full flag list and default values
title: "Webhooks"
---

# `openclaw webhooks`

Webhook 辅助工具和集成。目前此功能范围限定于与内置 `gog` 监视器集成的 Gmail Pub/Sub 流程。

## 子命令

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| 子命令        | 描述                                                               |
| ------------- | ------------------------------------------------------------------ |
| `gmail setup` | 配置 Gmail 监视、Pub/Sub 主题/订阅以及 OpenClaw webhook 交付目标。 |
| `gmail run`   | 运行 `gog watch serve` 以及监视自动续期循环。                      |

## `webhooks gmail setup`

配置 Gmail 监视、Pub/Sub 和 OpenClaw webhook 交付。

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### 必需

| 标志                | 描述                  |
| ------------------- | --------------------- |
| `--account <email>` | 要监视的 Gmail 帐户。 |

### Pub/Sub 选项

| 标志                    | 默认值                 | 描述                                    |
| ----------------------- | ---------------------- | --------------------------------------- |
| `--project <id>`        | （无）                 | GCP 项目 ID（OAuth 客户端所有者）。     |
| `--topic <name>`        | `gog-gmail-watch`      | Pub/Sub 主题名称。                      |
| `--subscription <name>` | `gog-gmail-watch-push` | Pub/Sub 订阅名称。                      |
| `--label <label>`       | `INBOX`                | 要监听的 Gmail 标签。                   |
| `--push-endpoint <url>` | （无）                 | 显式 Pub/Sub 推送端点。覆盖 Tailscale。 |

### OpenClaw 投递选项

| 标志                   | 默认值 | 描述                                  |
| ---------------------- | ------ | ------------------------------------- |
| `--hook-url <url>`     | （无） | OpenClaw Webhook URL。                |
| `--hook-token <token>` | （无） | OpenClaw Webhook 令牌。               |
| `--push-token <token>` | （无） | 转发到 `gog watch serve` 的推送令牌。 |

### `gog watch serve` 选项

| 标志                  | 默认值          | 描述                                                |
| --------------------- | --------------- | --------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | `gog watch serve` 绑定主机。                        |
| `--port <port>`       | `8788`          | `gog watch serve` 端口。                            |
| `--path <path>`       | `/gmail-pubsub` | `gog watch serve` 路径。                            |
| `--include-body`      | `true`          | 包含邮件正文片段。传递 `--no-include-body` 以禁用。 |
| `--max-bytes <n>`     | `20000`         | 每个正文片段的最大字节数。                          |
| `--renew-minutes <n>` | `720` (12h)     | 每 N 分钟续订一次 Gmail 监视。                      |

### Tailscale 暴露

| 标志                      | 默认值   | 描述                                                        |
| ------------------------- | -------- | ----------------------------------------------------------- |
| `--tailscale <mode>`      | `funnel` | 通过 tailscale 暴露推送端点：`funnel`、`serve` 或 `off`。   |
| `--tailscale-path <path>` | （无）   | tailscale serve/funnel 的路径。                             |
| `--tailscale-target <t>`  | （无）   | Tailscale serve/funnel 的目标（端口、`host:port` 或 URL）。 |

### 输出

| 标志     | 描述                           |
| -------- | ------------------------------ |
| `--json` | 打印机器可读的摘要而不是文本。 |

## `webhooks gmail run`

在前台运行 `gog watch serve` 以及监视自动续期循环。

```bash
openclaw webhooks gmail run --account you@example.com
```

`run` 接受与 `setup` 相同的 `gog watch serve`、OpenClaw 交付、Pub/Sub 和 Tailscale 标志，除了：

- 在 `run` 上，`--account` 是**可选的**（它会回退到配置的账户）。
- `run` **不**接受 `--project`、`--push-endpoint` 或 `--json`。
- `run` 标志没有内置默认值；缺失的值将回退到 `setup` 写入的值。

| 类别              | 标志                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| Pub/Sub           | `--account`, `--topic`, `--subscription`, `--label`                              |
| OpenClaw 交付     | `--hook-url`, `--hook-token`, `--push-token`                                     |
| `gog watch serve` | `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes` |
| Tailscale         | `--tailscale`, `--tailscale-path`, `--tailscale-target`                          |

<Note>对于 `run`，`--topic` 值是完整的 Pub/Sub 主题路径 (`projects/.../topics/...`)，而不仅仅是短主题名称。</Note>

## 端到端流程

请参阅 [Gmail Pub/Sub 集成](/zh/automation/cron-jobs#gmail-pubsub-integration)，了解与这些 GCP 命令配对的 OAuth 项目、CLI 和网关端设置。

## 相关

- [CLI 参考](/zh/cli)
- [Webhook 自动化](/zh/automation/webhook)
- [Gmail Pub/Sub](/zh/automation/cron-jobs#gmail-pubsub-integration)
