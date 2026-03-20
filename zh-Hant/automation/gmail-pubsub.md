---
summary: "透過 gogcli 將 Gmail Pub/Sub 推送連接到 OpenClaw Webhooks"
read_when:
  - 將 Gmail 收件匣觸發連線至 OpenClaw
  - 設定 Pub/Sub 推送以喚醒代理程式
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

目標：Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> OpenClaw webhook。

## 先決條件

- 已安裝並登入 `gcloud`（[安裝指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- 已安裝並授權 `gog` (gogcli) 給 Gmail 帳戶（[gogcli.sh](https://gogcli.sh/)）。
- 已啟用 OpenClaw hooks（請參閱 [Webhooks](/zh-Hant/automation/webhook)）。
- 已登入 `tailscale`（[tailscale.com](https://tailscale.com/)）。支援的設定使用 Tailscale Funnel 作為公開 HTTPS 端點。
  其他通道服務也可以使用，但是屬於 DIY/不支援且需要手動連線。
  目前，我們支援 Tailscale。

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

若要將 Gmail 摘要傳送到聊天介面，請使用對應來覆寫預設
該對應會設定 `deliver` + 可選的 `channel`/`to`：

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

如果您想要固定頻道，請設定 `channel` + `to`。否則 `channel: "last"`
會使用最後的傳送路由（預設為 WhatsApp）。

若要為 Gmail 執行強制使用更便宜的模型，請在對應中設定 `model`
（`provider/model` 或別名）。如果您強制執行 `agents.defaults.models`，請將其包含在該處。

若要專門為 Gmail hooks 設定預設模型和思考等級，請在您的設定中新增
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

- 對應中每個 hook 的 `model`/`thinking` 仍然會覆寫這些預設值。
- 後備順序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → primary (auth/rate-limit/timeouts)。
- 如果設定了 `agents.defaults.models`，Gmail 模型必須位於允許清單中。
- Gmail hook 內容預設會以外部內容安全邊界包裝。
  若要停用（危險），請設定 `hooks.gmail.allowUnsafeExternalContent: true`。

若要進一步自訂 payload 處理方式，請在 `~/.openclaw/hooks/transforms` 下新增 `hooks.mappings` 或 JS/TS 轉換模組（請參閱 [Webhooks](/zh-Hant/automation/webhook)）。

## 精靈（推薦）

使用 OpenClaw 輔助程式將所有內容連接起來（在 macOS 上透過 brew 安裝 deps）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

預設值：

- 使用 Tailscale Funnel 作為公開推送端點。
- 寫入 `hooks.gmail` 設定給 `openclaw webhooks gmail run`。
- 啟用 Gmail hook 預設集（`hooks.presets: ["gmail"]`）。

路徑說明：啟用 `tailscale.mode` 時，OpenClaw 會自動將 `hooks.gmail.serve.path` 設定為 `/`，並將公開路徑保持在 `hooks.gmail.tailscale.path`（預設為 `/gmail-pubsub`），因為 Tailscale 會在代理之前移除設定路徑的前綴。
如果您需要後端接收帶前綴的路徑，請將 `hooks.gmail.tailscale.target`（或 `--tailscale-target`）設定為完整的 URL，例如 `http://127.0.0.1:8788/gmail-pubsub`，並配合 `hooks.gmail.serve.path`。

想要自訂端點？請使用 `--push-endpoint <url>` 或 `--tailscale off`。

平台說明：在 macOS 上，精靈會透過 Homebrew 安裝 `gcloud`、`gogcli` 和 `tailscale`；在 Linux 上請先手動安裝它們。

閘道自動啟動（推薦）：

- 當設定 `hooks.enabled=true` 和 `hooks.gmail.account` 時，閘道會在開機時啟動 `gog gmail watch serve` 並自動續訂監視。
- 設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以選擇退出（如果您自己執行 daemon，這會很有用）。
- 請勿同時執行手動 daemon，否則會遇到 `listen tcp 127.0.0.1:8788: bind: address already in use`。

手動 daemon（啟動 `gog gmail watch serve` + 自動續訂）：

```bash
openclaw webhooks gmail run
```

## 一次性設定

1. 選取 `gog` 使用的 OAuth 用戶端**所屬的** GCP 專案。

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail watch 要求 Pub/Sub 主題必須與 OAuth 用戶端位於同一個專案中。

2. 啟用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. 建立主題：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. 允許 Gmail 推送發布：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 啟動監視

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

請儲存輸出中的 `history_id`（用於除錯）。

## 執行推送處理程式

本機範例（共用 token 驗證）：

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

說明：

- `--token` 保護推播端點（`x-gog-token` 或 `?token=`）。
- `--hook-url` 指向 OpenClaw `/hooks/gmail`（已對映；獨立執行 + 摘要發送至主程式）。
- `--include-body` 和 `--max-bytes` 控制發送至 OpenClaw 的內文摘要。

建議：`openclaw webhooks gmail run` 封裝了相同的流程並自動續訂監聽。

## 公開處理程式（進階，不支援）

如果您需要非 Tailscale 隧道，請手動進行連線，並在推播訂閱中使用公開 URL（不支援，無防護措施）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用產生的 URL 作為推播端點：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

正式環境：使用穩定的 HTTPS 端點並設定 Pub/Sub OIDC JWT，然後執行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 測試

傳送訊息至受監聽的收件匣：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

檢查監聽狀態與歷史記錄：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排除

- `Invalid topicName`：專案不符（主題不在 OAuth 用戶端專案中）。
- `User not authorized`：主題上缺少 `roles/pubsub.publisher`。
- 空訊息：Gmail 推播僅提供 `historyId`；請透過 `gog gmail history` 擷取。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```

import en from "/components/footer/en.mdx";

<en />
