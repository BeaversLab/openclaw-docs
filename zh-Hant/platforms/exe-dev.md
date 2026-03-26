---
summary: "在 exe.dev (VM + HTTPS proxy) 上執行 OpenClaw Gateway 以進行遠端存取"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

# exe.dev

目標：在 exe.dev VM 上執行 OpenClaw Gateway，並透過以下方式從您的筆電存取：`https://<vm-name>.exe.xyz`

本頁面假設使用 exe.dev 預設的 **exeuntu** 映像檔。如果您選擇了不同的發行版，請相應地對映套件。

## 初學者快速途徑

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根據需要填入您的授權金鑰/權杖
3. 點擊您 VM 旁邊的 "Agent"，然後等待...
4. ???
5. 完成

## 您需要什麼

- exe.dev 帳戶
- `ssh exe.dev` 存取 [exe.dev](https://exe.dev) 虛擬機 (選用)

## 使用 Shelley 自動安裝

Shelley，[exe.dev](https://exe.dev) 的代理程式，可以使用我們的
提示立即安裝 OpenClaw。使用的提示如下：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw device approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手動安裝

## 1) 建立虛擬機

從您的裝置：

```bash
ssh exe.dev new
```

然後連線：

```bash
ssh <vm-name>.exe.xyz
```

提示：保持此虛擬機為**有狀態**。OpenClaw 將狀態儲存在 `~/.openclaw/` 和 `~/.openclaw/workspace/` 中。

## 2) 安裝先決條件（在虛擬機上）

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

存取 `https://<vm-name>.exe.xyz/?token=YOUR-TOKEN-FROM-TERMINAL`（請參閱入門時的控制 UI 輸出）。使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 核准裝置。如有疑問，請從瀏覽器使用 Shelley！

## 遠端存取

遠端存取由 [exe.dev](https://exe.dev) 的認證處理。預設情況下，來自連接埠 8000 的 HTTP 流量會透過電子郵件認證轉送至 `https://<vm-name>.exe.xyz`。

## 更新中

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh-Hant/install/updating)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
