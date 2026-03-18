---
summary: "透過 gogcli 將 Gmail Pub/Sub 推送連接到 OpenClaw webhook"
read_when:
  - Wiring Gmail inbox triggers to OpenClaw
  - Setting up Pub/Sub push for agent wake
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

目標：Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> OpenClaw webhook。

## 先決條件

- `gcloud` 已安裝並登入（[安裝指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- `gog` (gogcli) 已安裝並已獲得 Gmail 帳戶授權（[gogcli.sh](https://gogcli.sh/)）。
- OpenClaw hooks 已啟用（參見 [Webhooks](/zh-Hant/automation/webhook)）。
- `tailscale` 已登入（[tailscale.com](https://tailscale.com/)）。支援的設定使用 Tailscale Funnel 作為公開 HTTPS 端點。
  其他隧道服務也可以使用，但屬於 DIY/不支援的範疇，且需要手動連接。
  目前我們僅支援 Tailscale。

Hook 設定範例（啟用 Gmail 預設對應）：

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

若要將 Gmail 摘要傳送到聊天介面，請使用設定 `deliver` + 選用 `channel`/`to` 的對應來覆寫預設：

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

如果您想要固定的頻道，請設定 `channel` + `to`。否則 `channel: "last"`
會使用最後一個傳送路徑（後援至 WhatsApp）。

若要在 Gmail 執行時強制使用更便宜的模型，請在對應中設定 `model`
（`provider/model` 或別名）。如果您強制執行 `agents.defaults.models`，請將其包含在內。

若要專門為 Gmail hooks 設定預設模型和思考層級，請在您的設定中新增
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

備註：

- 對應中個別 hook 的 `model`/`thinking` 仍會覆寫這些預設值。
- 後援順序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → primary (auth/rate-limit/timeouts)。
- 如果設定了 `agents.defaults.models`，Gmail 模型必須在允許清單中。
- Gmail hook 內容預設會使用外部內容安全邊界包裝。
  若要停用（危險），請設定 `hooks.gmail.allowUnsafeExternalContent: true`。

若要進一步自訂 Payload 處理，請在 `~/.openclaw/hooks/transforms` 下新增 `hooks.mappings` 或 JS/TS 轉換模組（請參閱 [Webhooks](/zh-Hant/automation/webhook)）。

## 精靈（建議）

使用 OpenClaw 輔助工具將所有內容連接起來（透過 brew 在 macOS 上安裝相依項）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

預設值：

- 使用 Tailscale Funnel 作為公開推送端點。
- 寫入 `openclaw webhooks gmail run` 的 `hooks.gmail` 設定。
- 啟用 Gmail hook 預設設定（`hooks.presets: ["gmail"]`）。

路徑備註：啟用 `tailscale.mode` 時，OpenClaw 會自動將 `hooks.gmail.serve.path` 設定為 `/`，並將公開路徑保持在 `hooks.gmail.tailscale.path`（預設 `/gmail-pubsub`），因為 Tailscale 會在代理之前移除設定路徑的前綴。如果您需要後端接收帶有前綴的路徑，請將 `hooks.gmail.tailscale.target`（或 `--tailscale-target`）設定為像 `http://127.0.0.1:8788/gmail-pubsub` 這樣的完整 URL，並符合 `hooks.gmail.serve.path`。

想要自訂端點？請使用 `--push-endpoint <url>` 或 `--tailscale off`。

平台備註：在 macOS 上，精靈會透過 Homebrew 安裝 `gcloud`、`gogcli` 和 `tailscale`；在 Linux 上，請先手動安裝它們。

閘道自動啟動（建議）：

- 當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，閘道會在開機時啟動 `gog gmail watch serve` 並自動續訂監看。
- 設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以選擇退出（如果您自行執行守護程式，這會很有用）。
- 請勿同時執行手動守護程式，否則會遇到 `listen tcp 127.0.0.1:8788: bind: address already in use`。

手動守護程式（啟動 `gog gmail watch serve` + 自動續訂）：

```bash
openclaw webhooks gmail run
```

## 一次性設定

1. 選擇擁有 `gog` 所使用 OAuth 用戶端的 GCP 專案。

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail 監看要求 Pub/Sub 主題必須與 OAuth 用戶端位於同一個專案中。

2. 啟用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. 建立主題：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. 允許 Gmail 推送發佈：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 開始監看

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

從輸出中儲存 `history_id`（用於偵錯）。

## 執行推送處理器

本機範例（共用 Token 驗證）：

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

備註：

- `--token` 會保護推送端點（`x-gog-token` 或 `?token=`）。
- `--hook-url` 指向 OpenClaw `/hooks/gmail`（已映射；獨立運行 + 匯總至主程序）。
- `--include-body` 和 `--max-bytes` 控制發送給 OpenClaw 的正文摘要。

建議：`openclaw webhooks gmail run` 封裝了相同的流程並自動續訂監視。

## 公開處理程序（進階，不支援）

如果您需要非 Tailscale 隧道，請手動配置並在推送訂閱中使用公開 URL
（不支援，無防護措施）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用產生的 URL 作為推送端點：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

生產環境：使用穩定的 HTTPS 端點並配置 Pub/Sub OIDC JWT，然後執行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 測試

傳送訊息到受監視的收件匣：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

檢查監視狀態和歷史記錄：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排除

- `Invalid topicName`：項目不匹配（主題不在 OAuth 用戶端項目中）。
- `User not authorized`：主題上缺少 `roles/pubsub.publisher`。
- 空訊息：Gmail 推送僅提供 `historyId`；透過 `gog gmail history` 獲取。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
