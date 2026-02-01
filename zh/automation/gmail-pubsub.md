---
summary: "通过 gogcli 将 Gmail Pub/Sub 推送接入 OpenClaw Webhooks"
read_when:
  - 将 Gmail 收件箱触发接入 OpenClaw
  - 设置用于唤醒代理的 Pub/Sub 推送
---

# Gmail Pub/Sub -> OpenClaw

目标：Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> OpenClaw webhook。

## 前置条件

- 已安装并登录 `gcloud`（[安装指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- 已安装并授权 `gog`（gogcli）用于 Gmail 账号（[gogcli.sh](https://gogcli.sh/)）。
- 已启用 OpenClaw hooks（参见 [Webhooks](/zh/automation/webhook)）。
- 已登录 `tailscale`（[tailscale.com](https://tailscale.com/)）。推荐方案使用 Tailscale Funnel 作为公网 HTTPS 入口。
  其他隧道服务可以用，但需要手动接线且不受支持。
  目前我们仅支持 Tailscale。

示例 hook 配置（启用 Gmail 预设映射）：

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"]
  }
}
```

要把 Gmail 摘要投递到聊天渠道，可用映射覆盖预设，设置 `deliver` + 可选 `channel`/`to`：

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
        messageTemplate:
          "New email from {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last"
        // to: "+15551234567"
      }
    ]
  }
}
```

如果你想固定投递渠道，设置 `channel` + `to`。否则 `channel: "last"`
会使用最近一次投递路径（回退到 WhatsApp）。

要强制 Gmail 运行使用更省的模型，在映射里设置 `model`
（`provider/model` 或别名）。如果启用了 `agents.defaults.models`，也要在其中包含该模型。

若要为 Gmail hook 设置默认模型与思考等级，在配置中添加
`hooks.gmail.model` / `hooks.gmail.thinking`：

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off"
    }
  }
}
```

注意：
- 映射里的 `model`/`thinking` 仍会覆盖这些默认值。
- 回退顺序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → primary（鉴权/限流/超时等）。
- 若设置了 `agents.defaults.models`，Gmail 模型必须在 allowlist 中。
- Gmail hook 内容默认包裹外部内容安全边界。
  如需禁用（危险），设置 `hooks.gmail.allowUnsafeExternalContent: true`。

若要更深度地自定义 payload 处理，可在 `hooks.mappings` 中配置，或在
`hooks.transformsDir` 下添加 JS/TS 转换模块（参见 [Webhooks](/zh/automation/webhook)）。

## 向导（推荐）

使用 OpenClaw 帮助器把一切连起来（macOS 会通过 brew 安装依赖）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

默认行为：
- 使用 Tailscale Funnel 作为公网推送入口。
- 写入 `hooks.gmail` 配置，供 `openclaw webhooks gmail run` 使用。
- 启用 Gmail hook 预设（`hooks.presets: ["gmail"]`）。

路径说明：当开启 `tailscale.mode` 时，OpenClaw 会自动把
`hooks.gmail.serve.path` 设为 `/`，并将公网路径保留在
`hooks.gmail.tailscale.path`（默认 `/gmail-pubsub`），因为 Tailscale
会在代理前剥离设置的路径前缀。
如果你需要后端收到带前缀的路径，请将
`hooks.gmail.tailscale.target`（或 `--tailscale-target`）设置为完整 URL，比如
`http://127.0.0.1:8788/gmail-pubsub`，并匹配 `hooks.gmail.serve.path`。

想自定义端点？使用 `--push-endpoint <url>` 或 `--tailscale off`。

平台说明：macOS 上向导会通过 Homebrew 安装 `gcloud`、`gogcli`、`tailscale`；
Linux 上请先手动安装。

Gateway 自动启动（推荐）：
- 当 `hooks.enabled=true` 且设置了 `hooks.gmail.account` 时，Gateway 会在启动时
  运行 `gog gmail watch serve` 并自动续订 watch。
- 设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可跳过（适合你自己运行守护进程的场景）。
- 不要与手动守护进程同时运行，否则会出现
  `listen tcp 127.0.0.1:8788: bind: address already in use`。

手动守护进程（启动 `gog gmail watch serve` + 自动续订）：

```bash
openclaw webhooks gmail run
```

## 一次性设置

1) 选择**拥有 OAuth 客户端**的 GCP 项目（供 `gog` 使用）。

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail watch 要求 Pub/Sub 主题位于与 OAuth 客户端相同的项目中。

2) 启用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3) 创建主题：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4) 允许 Gmail push 发布：

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

本地示例（共享 token 鉴权）：

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
- `--include-body` 与 `--max-bytes` 控制发送给 OpenClaw 的正文片段。

推荐：`openclaw webhooks gmail run` 会封装同样流程并自动续订 watch。

## 暴露处理器（高级，非官方支持）

如果需要非 Tailscale 隧道，请手动接线，并在 push 订阅中使用公网 URL
（不提供防护与保障）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用生成的 URL 作为 push 端点：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

生产环境：使用稳定 HTTPS 端点并配置 Pub/Sub OIDC JWT，然后运行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 测试

向被监控收件箱发送消息：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

检查 watch 状态与历史：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排查

- `Invalid topicName`：项目不匹配（主题不在 OAuth 客户端项目中）。
- `User not authorized`：主题缺少 `roles/pubsub.publisher` 权限。
- 空消息：Gmail push 只提供 `historyId`，需用 `gog gmail history` 拉取。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
