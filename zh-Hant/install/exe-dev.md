---
summary: "在 exe.dev 上運行 OpenClaw Gateway (VM + HTTPS 代理) 以進行遠端存取"
read_when:
  - 您希望為 Gateway 使用一個便宜且始終運行的 Linux 主機
  - 您希望遠端存取控制 UI，而不需要自行執行 VPS
title: "exe.dev"
---

# exe.dev

目標：在 exe.dev VM 上執行 OpenClaw Gateway，並可透過以下方式從您的筆記型電腦存取：`https://<vm-name>.exe.xyz`

本頁面假設使用 exe.dev 的預設 **exeuntu** 映像檔。如果您選擇了其他發行版，請對應地調整套件。

## 初學者快速途徑

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根據需要填入您的授權金鑰/權杖
3. 在您的 VM 旁邊點擊「Agent」並等待...
4. ???
5. 成功

## 您需要什麼

- exe.dev 帳戶
- `ssh exe.dev` 對 [exe.dev](https://exe.dev) 虛擬機器的存取權限 (選用)

## 使用 Shelley 自動安裝

Shelley，[exe.dev](https://exe.dev) 的代理程式，可以使用我們的提示立即安裝 OpenClaw。使用的提示如下：

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

提示：保持此 VM 為 **有狀態 (stateful)**。OpenClaw 將狀態儲存在 `~/.openclaw/` 和 `~/.openclaw/workspace/` 中。

## 2) 安裝必要條件 (在 VM 上)

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

編輯 `/etc/nginx/sites-enabled/default` 為

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

## 5) 存取 OpenClaw 並授予權限

存取 `https://<vm-name>.exe.xyz/` (請參閱入門時的控制 UI 輸出)。如果提示進行身份驗證，請貼上 VM 上 `gateway.auth.token` 中的權杖 (使用 `openclaw config get gateway.auth.token` 檢索，或使用 `openclaw doctor --generate-gateway-token` 產生)。使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批準裝置。如果有疑問，請從瀏覽器使用 Shelley！

## 遠端存取

遠端存取由 [exe.dev](https://exe.dev) 的身份驗證處理。根據預設，來自連接埠 8000 的 HTTP 流量會轉發到 `https://<vm-name>.exe.xyz` 並使用電子郵件驗證。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh-Hant/install/updating)

import en from "/components/footer/en.mdx";

<en />
