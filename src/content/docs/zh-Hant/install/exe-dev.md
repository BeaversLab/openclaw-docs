---
summary: "在 exe.dev 上執行 OpenClaw Gateway（VM + HTTPS 代理）以進行遠端存取"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

# exe.dev

目標：在 exe.dev VM 上執行 OpenClaw Gateway，可透過以下方式從您的筆記型電腦存取：`https://<vm-name>.exe.xyz`

本頁面假設使用 exe.dev 預設的 **exeuntu** 映像檔。如果您選擇了不同的發行版，請相應地對應套件。

## 初學者快速路徑

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 視需要填入您的驗證金鑰/權杖
3. 點擊您 VM 旁邊的「Agent」並等待 Shelley 完成佈建
4. 開啟 `https://<vm-name>.exe.xyz/` 並使用設定的共用金鑰進行驗證（本指南預設使用 token 驗證，但如果您切換 `gateway.auth.mode`，密碼驗證也可以運作）
5. 使用 `openclaw devices approve <requestId>` 批准任何待處理的裝置配對請求

## 您需要什麼

- exe.dev 帳戶
- `ssh exe.dev` 存取 [exe.dev](https://exe.dev) 虛擬機（選用）

## 使用 Shelley 自動安裝

Shelley，[exe.dev](https://exe.dev) 的代理程式，可以使用我們的提示詞立即安裝 OpenClaw。
使用的提示詞如下：

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

提示：保持此 VM **有狀態 (stateful)**。OpenClaw 將 `openclaw.json`、每個代理程式的
`auth-profiles.json`、工作階段以及通道/提供者狀態儲存在
`~/.openclaw/` 下，以及位於 `~/.openclaw/workspace/` 的工作區。

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

## 4) 設定 nginx 將 OpenClaw 代理至連接埠 8000

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

覆寫轉送標頭，而不是保留客戶端提供的鏈結。
OpenClaw 僅信任來自明確設定之代理程式的轉送 IP 元數據，
而附加樣式的 `X-Forwarded-For` 鏈結會被視為安全性強化風險。

## 5) 存取 OpenClaw 並授予權限

存取 `https://<vm-name>.exe.xyz/`（請參閱入門時的 Control UI 輸出）。如果提示進行驗證，請貼上
來自 VM 的設定共用金鑰。本指南使用 token 驗證，因此請使用 `openclaw config get gateway.auth.token` 檢索 `gateway.auth.token`
（或使用 `openclaw doctor --generate-gateway-token` 產生一個）。
如果您將閘道變更為密碼驗證，請改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准裝置。如果不確定，請從瀏覽器使用 Shelley！

## 遠端存取

遠端存取由 [exe.dev](https://exe.dev) 的驗證機制處理。根據
預設，來自連接埠 8000 的 HTTP 流量會使用電子郵件驗證轉送到
`https://<vm-name>.exe.xyz`。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/en/install/updating)
