---
summary: "在 exe.dev (VM + HTTPS 代理) 上執行 OpenClaw Gateway 以進行遠端存取"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

目標：在 exe.dev VM 上執行 OpenClaw Gateway，並透過 `https://<vm-name>.exe.xyz` 從您的筆電存取：

本頁面假設使用 exe.dev 的預設 **exeuntu** 映像檔。如果您選擇了不同的發行版本，請相應地映射套件。

## 初學者快速路徑

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 視需要填入您的驗證金鑰/權杖
3. 點擊您 VM 旁邊的 "Agent"，並等待 Shelley 完成佈建
4. 開啟 `https://<vm-name>.exe.xyz/` 並使用設定的共用金鑰進行驗證 (本指南預設使用 token 驗證，但如果您切換 `gateway.auth.mode`，密碼驗證也可以運作)
5. 使用 `openclaw devices approve <requestId>` 批准任何待處理的裝置配對請求

## 您需要什麼

- exe.dev 帳戶
- `ssh exe.dev` [exe.dev](https://exe.dev) 虛擬機的存取權 (可選)

## 使用 Shelley 自動安裝

Shelley，[exe.dev](https://exe.dev) 的代理程式，可以使用我們的
提示立即安裝 OpenClaw。使用的提示如下：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手動安裝

## 1) 建立 VM

從您的裝置：

```bash
ssh exe.dev new
```

然後連線：

```bash
ssh <vm-name>.exe.xyz
```

<Tip>保持此 VM **具狀態**。OpenClaw 會將 `openclaw.json`、每個代理程式的 `auth-profiles.json`、工作階段以及通道/提供者狀態儲存在 `~/.openclaw/` 下，並將工作區儲存在 `~/.openclaw/workspace/` 下。</Tip>

## 2) 安裝先決條件（在 VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安裝 OpenClaw

執行 OpenClaw 安裝腳本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) 設定 nginx 將 OpenClaw 代理至埠 8000

使用以下內容編輯 `/etc/nginx/sites-enabled/default`

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

覆寫轉發標頭，而不是保留客戶端提供的鏈。
OpenClaw 僅信任來自明確設定之代理程式的轉送 IP 中繼資料，
且附加風格的 `X-Forwarded-For` 鏈會被視為安全加固風險。

## 5) 存取 OpenClaw 並授予權限

存取 `https://<vm-name>.exe.xyz/` (請參閱上架輸出的控制 UI)。如果提示驗證，請從 VM 貼上
設定的共用金鑰。本指南使用 token 驗證，因此請使用 `openclaw config get gateway.auth.token` 檢索 `gateway.auth.token`
(或使用 `openclaw doctor --generate-gateway-token` 產生一個)。
如果您將閘道變更為密碼驗證，請改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准裝置。如果有疑問，請從瀏覽器使用 Shelley！

## 遠端通道設定

對於遠端主機，比起多次 SSH 呼叫 `config set`，更傾向於使用單一 `config patch` 呼叫。將真實的 token 保留在 VM 環境或 `~/.openclaw/.env` 中，並僅將 SecretRefs 放入 `openclaw.json`。

在 VM 上，讓服務環境包含其所需的密鑰：

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

從您的本機，建立一個修補檔案並透過管道傳送至 VM：

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

當巢狀允許清單應該完全成為修補值時，請使用 `--replace-path`，例如在取代 Discord 頻道允許清單時：

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## 遠端存取

遠端存取由 [exe.dev](https://exe.dev) 的驗證機制處理。預設情況下，來自連接埠 8000 的 HTTP 流量會使用電子郵件驗證轉發至 `https://<vm-name>.exe.xyz`。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh-Hant/install/updating)

## 相關

- [遠端閘道](/zh-Hant/gateway/remote)
- [安裝總覽](/zh-Hant/install)
