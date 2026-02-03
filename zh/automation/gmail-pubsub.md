---
summary: "通过 gogcli 将 Gmail Pub/Sub 推送接入 OpenClaw Webhooks"
read_when:
  - 将 Gmail 收件箱触发接入 OpenClaw
  - 设置用于唤醒代理的 Pub/Sub 推送
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

目标：Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> OpenClaw webhook。

## 前置条件

- 已安装并登录 `gcloud`（[安装指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- 已安装并授权 `gog`（gogcli）用于 Gmail 账号（[gogcli.sh](https://gogcli.sh/)）。
- 已启用 OpenClaw hooks（参见 [Webhooks](/zh/automation/webhook)）。
- 已登录 `tailscale`（[tailscale.com](https://tailscale.com/)）。支持方案使用 Tailscale Funnel 作为公网 HTTPS 端点。
  其他隧道服务可以使用，但需要手动接线且不受支持。
  目前我们只支持 Tailscale。

示例 hook 配置（启用 Gmail 预设映射）：

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"],
  },
}
```

要将 Gmail 摘要投递到聊天界面，可以使用映射覆盖预设，设置 `deliver` + 可选的 `channel`/`to`：

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "New email from {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last",
        // to: "+15551234567"
      },
    ],
  },
}
```

如果需要固定渠道，设置 `channel` + `to`。否则 `channel: "last"`
会使用最后一次投递路径（回退到 WhatsApp）。

要强制 Gmail 运行使用更便宜的模型，在映射中设置 `model`
（`provider/model` 或别名）。如果强制执行 `agents.defaults.models`，需要将模型包含在其中。

要专门为 Gmail hooks 设置默认模型和思考等级，在配置中添加
`hooks.gmail.model` / `hooks.gmail.thinking`：

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

注意事项：

- 映射中每个 hook 的 `model`/`thinking` 仍然会覆盖这些默认值。
- 回退顺序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → primary（鉴权/限流/超时）。
- 如果设置了 `agents.defaults.models`，Gmail 模型必须在允许列表中。
- Gmail hook 内容默认使用外部内容安全边界包裹。
  要禁用（危险），设置 `hooks.gmail.allowUnsafeExternalContent: true`。

要进一步自定义 payload 处理，可以添加 `hooks.mappings`或在 `hooks.transformsDir` 下添加 JS/TS 转换模块
（参见 [Webhooks](/zh/automation/webhook)）。

## 向导（推荐）

使用 OpenClaw 帮助工具将一切连接起来（在 macOS 上通过 brew 安装依赖）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

默认行为：

- 使用 Tailscale Funnel 作为公网推送端点。
- 为 `openclaw webhooks gmail run` 写入 `hooks.gmail` 配置。
- 启用 Gmail hook 预设（`hooks.presets: ["gmail"]`）。

路径说明：当启用 `tailscale.mode` 时，OpenClaw 会自动将
`hooks.gmail.serve.path` 设置为 `/`，并将公网路径保留在
`hooks.gmail.tailscale.path`（默认 `/gmail-pubsub`），因为 Tailscale
会在代理前剥离设置的路径前缀。
如果需要后端接收带前缀的路径，设置
`hooks.gmail.tailscale.target`（或 `--tailscale-target`）为完整 URL，如
`http://127.0.0.1:8788/gmail-pubsub` 并匹配 `hooks.gmail.serve.path`。

想要自定义端点？使用 `--push-endpoint <url>` 或 `--tailscale off`。

平台说明：在 macOS 上，向导通过 Homebrew 安装 `gcloud`、`gogcli` 和 `tailscale`；
在 Linux 上先手动安装。

Gateway 自动启动（推荐）：

- 当 `hooks.enabled=true` 并设置了 `hooks.gmail.account` 时，Gateway 会在启动时
  启动 `gog gmail watch serve` 并自动续订 watch。
- 设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可以选择退出（如果你自己运行守护进程，这很有用）。
- 不要同时运行手动守护进程，否则会遇到
  `listen tcp 127.0.0.1:8788: bind: address already in use`。

手动守护进程（启动 `gog gmail watch serve` + 自动续订）：

```bash
openclaw webhooks gmail run
```

## 一次性设置

1. 选择**拥有 OAuth 客户端**的 GCP 项目（供 `gog` 使用）。

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail watch 要求 Pub/Sub 主题与 OAuth 客户端位于同一项目中。

2. 启用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. 创建主题：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. 允许 Gmail push 发布：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 启动 watch

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

保存输出中的 `history_id`（用于调试）。

## 运行推送处理器

本地示例（共享 token 认证）：

```bash
gog gmail watch serve \
  --account openclaw@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <shared> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token OPENCLAW_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

说明：

- `--token` 保护推送端点（`x-gog-token` 或 `?token=`）。
- `--hook-url` 指向 OpenClaw `/hooks/gmail`（已映射；隔离运行 + 摘要回主会话）。
- `--include-body` 和 `--max-bytes` 控制发送给 OpenClaw 的正文片段。

推荐：`openclaw webhooks gmail run` 封装了相同的流程并自动续订 watch。

## 暴露处理器（高级，不支持）

如果需要非 Tailscale 隧道，手动接线并在推送订阅中使用公网 URL
（不支持，没有保障）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用生成的 URL 作为推送端点：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

生产环境：使用稳定的 HTTPS 端点并配置 Pub/Sub OIDC JWT，然后运行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 测试

向被监控的收件箱发送消息：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

检查 watch 状态和历史：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排查

- `Invalid topicName`：项目不匹配（主题不在 OAuth 客户端项目中）。
- `User not authorized`：主题上缺少 `roles/pubsub.publisher`。
- 空消息：Gmail push 只提供 `historyId`；通过 `gog gmail history` 获取。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
