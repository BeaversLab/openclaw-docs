---
summary: "在便宜的 Hetzner VPS (Docker) 上 24/7 執行 OpenClaw Gateway，具有持久狀態和內置的二進制文件"
read_when:
  - 您希望在雲端 VPS 上 24/7 執行 OpenClaw（而不是在您的筆記型電腦上）
  - 您希望在自己的 VPS 上擁有一個生產級別、始終運行的 Gateway
  - 您希望對持久性、二進制文件和重啟行為擁有完全控制權
  - 您正在 Hetzner 或類似提供商上使用 Docker 執行 OpenClaw
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目標

使用 Docker 在 Hetzner VPS 上執行持久化的 OpenClaw Gateway，具有持久的狀態、內置的二進制文件和安全的重啟行為。

如果您想要「以約 $5 的價格 24/7 執行 OpenClaw」，這是最簡單可靠的設定。
Hetzner 的定價可能會變動；選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM（記憶體不足）再進行升級。

安全模型提醒：

- 當每個人都在同一信任邊界內並且執行環境僅用於業務時，公司共用的代理是可以接受的。
- 保持嚴格的隔離：專用 VPS/執行環境 + 專用帳戶；該主機上不得有個人 Apple/Google/瀏覽器/密碼管理器設定檔。
- 如果使用者之間存在對抗關係，請按 gateway/host/OS 使用者進行拆分。

請參閱 [安全性](/zh-Hant/gateway/security) 和 [VPS 託管](/zh-Hant/vps)。

## 我們正在做什麼（簡單來說）？

- 租賃一台小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace`（在重啟/重建後仍然保留）
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉發
- 如果您自行管理防火牆和令牌，則可以直接暴露連接埠

本指南假設 Hetzner 上使用的是 Ubuntu 或 Debian。
如果您使用的是其他 Linux VPS，請相應地映射軟體包。
關於通用的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速途徑（經驗豐富的操作人員）

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. Clone OpenClaw 儲存庫
4. 建立持久化的主機目錄
5. 配置 `.env` 和 `docker-compose.yml`
6. 將所需的二進制文件內置到映像中
7. `docker compose up -d`
8. 驗證持久性和 Gateway 存取

---

## 您需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 具備 SSH + 複製/貼上的基本操作能力
- 約 20 分鐘
- Docker 與 Docker Compose
- 模型驗證認證
- 選用的供應商認證
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

## 1) 配置 VPS

在 Hetzner 中建立一個 Ubuntu 或 Debian VPS。

以 root 身份連線：

```bash
ssh root@YOUR_VPS_IP
```

本指南假設 VPS 具有狀態。
請勿將其視為可拋棄的基礎設施。

---

## 2) 安裝 Docker (在 VPS 上)

```bash
apt-get update
apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
```

驗證：

```bash
docker --version
docker compose version
```

---

## 3) 複製 OpenClaw 程式庫

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假設您將建構自訂映像檔，以確保二進位檔案的持久性。

---

## 4) 建立持久化主機目錄

Docker 容器是暫時性的。
所有長期存在的狀態都必須存在於主機上。

```bash
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
```

---

## 5) 設定環境變數

在程式庫根目錄中建立 `.env`。

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/root/.openclaw
OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

產生強式祕密：

```bash
openssl rand -hex 32
```

**不要提交此檔案。**

---

## 6) Docker Compose 設定

建立或更新 `docker-compose.yml`。

```yaml
services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE}
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOME=/home/node
      - NODE_ENV=production
      - TERM=xterm-256color
      - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
      - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
      - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
      - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
      - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    volumes:
      - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
    ports:
      # Recommended: keep the Gateway loopback-only on the VPS; access via SSH tunnel.
      # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}",
        "--allow-unconfigured",
      ]
```

`--allow-unconfigured` 僅為了啟動便利性，它不能取代適當的 gateway 設定。仍然要設定驗證 (`gateway.auth.token` 或密碼)，並為您的部署使用安全的綁定設定。

---

## 7) 共用 Docker VM 執行時段步驟

請使用共用執行時段指南來了解一般 Docker 主機流程：

- [將所需的二進位檔案建構至映像檔中](/zh-Hant/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [建構與啟動](/zh-Hant/install/docker-vm-runtime#build-and-launch)
- [什麼內容在哪裡持久化](/zh-Hant/install/docker-vm-runtime#what-persists-where)
- [更新](/zh-Hant/install/docker-vm-runtime#updates)

---

## 8) Hetzner 專屬存取

在完成共用的建構與啟動步驟後，從您的筆記型電腦建立通道：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

開啟：

`http://127.0.0.1:18789/`

貼上您的 gateway token。

---

共用的持久化對應表位於 [Docker VM Runtime](/zh-Hant/install/docker-vm-runtime#what-persists-where)。

## 基礎設施即程式碼

對於偏好基礎設施即程式碼工作流程的團隊，社群維護的 Terraform 設定提供：

- 具備遠端狀態管理的模組化 Terraform 設定
- 透過 cloud-init 自動化配置
- 部署腳本 (bootstrap, deploy, backup/restore)
- 安全性強化 (防火牆、UFW、僅限 SSH 存取)
- 用於 gateway 存取的 SSH 通道設定

**程式庫：**

- 基礎設施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 設定：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法在上述 Docker 設定的基礎上，補充了可重現的部署、版本控制的基礎架構以及自動化的災難恢復。

> **注意：** 由社群維護。如有問題或貢獻，請參閱上方的儲存庫連結。

import en from "/components/footer/en.mdx";

<en />
