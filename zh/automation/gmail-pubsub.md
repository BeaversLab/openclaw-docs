---
summary: "通过 gogcli 将 Gmail Pub/Sub 推送接入 OpenClaw webhook"
read_when:
  - Wiring Gmail inbox triggers to OpenClaw
  - Setting up Pub/Sub push for agent wake
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

目标：Gmail watch -> Pub/Sub 推送 -> `gog gmail watch serve` -> OpenClaw webhook。

## 先决条件

- `gcloud` 已安装并登录（[安装指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- `gog` (gogcli) 已安装并获得 Gmail 帐户的授权（[gogcli.sh](https://gogcli.sh/)）。
- OpenClaw 钩子已启用（参见 [Webhooks](/zh/automation/webhook)）。
- `tailscale` 已登录 ([tailscale.com](https://tailscale.com/))。受支持的设置使用 Tailscale Funnel 作为公共 HTTPS 端点。
  其他隧道服务可能也可以使用，但属于 DIY/不受支持的范围，并且需要手动连接。
  目前，我们支持 Tailscale。

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

要将 Gmail 摘要传送到聊天界面，请使用设置了 `deliver` + 可选 `channel`/`to` 的映射
覆盖预设：

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

如果您想要固定的渠道，请设置 `channel` + `to`。否则 `channel: "last"`
将使用最后一条交付路由（回退到 WhatsApp）。

要为 Gmail 运行强制使用更便宜的模型，请在映射中设置 `model`
（`provider/model` 或别名）。如果您强制执行 `agents.defaults.models`，请将其包含在内。

要专门为 Gmail hooks 设置默认模型和思考级别，请在您的配置中添加
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
- 回退顺序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → 主模型（认证/速率限制/超时）。
- 如果设置了 `agents.defaults.models`，则 Gmail 模型必须在允许列表中。
- 默认情况下，Gmail hook 内容会使用外部内容安全边界进行包装。
  要禁用（危险），请设置 `hooks.gmail.allowUnsafeExternalContent: true`。

要进一步自定义负载处理，请在 `~/.openclaw/hooks/transforms` 下添加 `hooks.mappings` 或 JS/TS 转换模块（参见 [Webhooks](/zh/automation/webhook)）。

## 向导（推荐）

使用 OpenClaw 助手将所有内容连接在一起（通过 brew 在 macOS 上安装依赖项）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

默认值：

- 使用 Tailscale Funnel 作为公共推送端点。
- 为 `openclaw webhooks gmail run` 写入 `hooks.gmail` 配置。
- 启用 Gmail hook 预设（`hooks.presets: ["gmail"]`）。

路径说明：当启用 `tailscale.mode` 时，OpenClaw 会自动将
`hooks.gmail.serve.path` 设置为 `/`，并将公共路径保持在
`hooks.gmail.tailscale.path`（默认为 `/gmail-pubsub`），因为 Tailscale
在代理之前会剥离 set-path 前缀。
如果您需要后端接收带前缀的路径，请将
`hooks.gmail.tailscale.target`（或 `--tailscale-target`）设置为类似
`http://127.0.0.1:8788/gmail-pubsub` 的完整 URL 并匹配 `hooks.gmail.serve.path`。

想要自定义端点？使用 `--push-endpoint <url>` 或 `--tailscale off`。

平台说明：在 macOS 上，向导会通过 Homebrew 安装 `gcloud`、`gogcli` 和 `tailscale`；
在 Linux 上，请先手动安装它们。

Gateway(网关) auto-start (recommended):

- 当设置了 `hooks.enabled=true` 和 `hooks.gmail.account` 时，Gateway(网关) 网关会在启动时启动 `gog gmail watch serve` 并自动续期监听。
- 设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以选择退出（如果您自己运行守护进程，这很有用）。
- 不要同时运行手动守护进程，否则您会遇到
  `listen tcp 127.0.0.1:8788: bind: address already in use`。

手动守护进程（启动 `gog gmail watch serve` + 自动续期）：

```bash
openclaw webhooks gmail run
```

## 一次性设置

1. 选择拥有 `gog` 所使用的 OAuth 客户端的 GCP 项目。

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail 监听要求 Pub/Sub 主题与 OAuth 客户端位于同一个项目中。

2. 启用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. 创建主题：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. 允许 Gmail 推送发布：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 启动监听

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

保存输出中的 `history_id`（用于调试）。

## 运行推送处理器

本地示例（共享令牌认证）：

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
- `--hook-url` 指向 OpenClaw `/hooks/gmail`（已映射；隔离运行 + 汇总至主进程）。
- `--include-body` 和 `--max-bytes` 控制发送到 OpenClaw 的正文片段。

推荐：`openclaw webhooks gmail run` 封装了相同的流程并自动续期监听。

## 暴露处理器（高级，不支持）

如果您需要非 Tailscale 隧道，请手动连接并在推送订阅中使用公共 URL（不支持，无防护措施）：

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

向受监听的收件箱发送消息：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

检查监听状态和历史记录：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排除

- `Invalid topicName`：项目不匹配（主题不在 OAuth 客户端项目中）。
- `User not authorized`：主题上缺少 `roles/pubsub.publisher`。
- 空消息：Gmail 推送仅提供 `historyId`；请通过 `gog gmail history` 获取。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```

import zh from '/components/footer/zh.mdx';

<zh />
