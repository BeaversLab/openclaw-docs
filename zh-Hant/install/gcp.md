---
summary: "使用 Docker 在 GCP Compute Engine VM 上全天候運行 OpenClaw Gateway，並具有持久狀態"
read_when:
  - 您希望在 GCP 上全天候運行 OpenClaw
  - 您希望在自己的 VM 上擁有生產級別、始終運行的 Gateway
  - 您希望對持久性、二進位檔和重啟行為擁有完全控制權
title: "GCP"
---

# OpenClaw on GCP Compute Engine (Docker, 生產 VPS 指南)

## 目標

使用 Docker 在 GCP Compute Engine VM 上運行持久的 OpenClaw Gateway，具備持久狀態、內建二進位檔和安全的重啟行為。

如果您想要「每月約 $5-12 美元的全天候 OpenClaw」，這是在 Google Cloud 上可靠的設置。
價格因機器類型和區域而異；選擇適合您工作負載的最小 VM，如果遇到 OOM 則進行擴展。

## 我們在做什麼（簡單來說）？

- 建立 GCP 專案並啟用計費
- 建立 Compute Engine VM
- 安裝 Docker（隔離的應用程式執行環境）
- 在 Docker 中啟動 OpenClaw Gateway
- 將 `~/.openclaw` + `~/.openclaw/workspace` 持久化在主機上（在重啟/重建後存活）
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

Gateway 可以透過以下方式存取：

- 從您的筆記型電腦進行 SSH 連接埠轉發
- 如果您自己管理防火牆和權杖，可直接暴露連接埠

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可行；請對應相關的套件。
關於一般 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑（有經驗的操作人員）

1. 建立 GCP 專案 + 啟用 Compute Engine API
2. 建立 Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH 進入 VM
4. 安裝 Docker
5. Clone OpenClaw 儲存庫
6. 建立持久化主機目錄
7. 設定 `.env` 和 `docker-compose.yml`
8. 內建所需的二進位檔、建置並啟動

---

## 您需要什麼

- GCP 帳戶（e2-micro 符合免費層資格）
- 已安裝 gcloud CLI（或使用 Cloud Console）
- 從您的筆記型電腦進行 SSH 存取
- 基本熟悉 SSH + 複製/貼上
- 約 20-30 分鐘
- Docker 和 Docker Compose
- 模型驗證認證
- 選用的提供商認證
  - WhatsApp QR
  - Telegram 機器人權杖
  - Gmail OAuth

---

## 1) 安裝 gcloud CLI（或使用 Console）

**選項 A：gcloud CLI**（建議用於自動化）

從 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安裝

初始化並驗證：

```bash
gcloud init
gcloud auth login
```

**選項 B：Cloud Console**

所有步驟都可以透過 [https://console.cloud.google.com](https://console.cloud.google.com) 的網頁 UI 完成

---

## 2) 建立 GCP 專案

**CLI：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 啟用計費（Compute Engine 必要項目）。

啟用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**Console：**

1. 前往 IAM & Admin > Create Project
2. 命名並建立
3. 為專案啟用計費
4. 前往 APIs & Services > Enable APIs > 搜尋「Compute Engine API」> Enable

---

## 3) 建立 VM

**機器類型：**

| 類型      | 規格                   | 費用             | 備註                                     |
| --------- | ---------------------- | ---------------- | ---------------------------------------- |
| e2-medium | 2 vCPU, 4GB RAM        | ~$25/月          | 對本地 Docker 建置而言最穩定             |
| e2-small  | 2 vCPU, 2GB RAM        | ~$12/月          | Docker 建置的最低建議                    |
| e2-micro  | 2 vCPU (共享), 1GB RAM | 符合免費層級資格 | 經常因 Docker 建置 OOM (exit 137) 而失敗 |

**CLI：**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**Console：**

1. 前往 Compute Engine > VM instances > Create instance
2. 名稱：`openclaw-gateway`
3. 區域：`us-central1`, 區域：`us-central1-a`
4. 機器類型：`e2-small`
5. 開機磁碟：Debian 12, 20GB
6. 建立

---

## 4) SSH 連線至 VM

**CLI：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Console：**

點擊 Compute Engine 儀表板中您的 VM 旁邊的「SSH」按鈕。

注意：SSH 金鑰傳播在 VM 建立後可能需要 1-2 分鐘。如果連線被拒絕，請稍後重試。

---

## 5) 安裝 Docker（於 VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

登出並重新登入以使群組變更生效：

```bash
exit
```

然後再次 SSH 連入：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

驗證：

```bash
docker --version
docker compose version
```

---

## 6) 複製 OpenClaw 程式庫

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假設您將建置自訂映像檔以確保二進位檔的持久性。

---

## 7) 建立持久化主機目錄

Docker 容器是暫時性的。
所有長期狀態都必須存在於主機上。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) 設定環境變數

在程式庫根目錄中建立 `.env`。

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

產生強密碼：

```bash
openssl rand -hex 32
```

**切勿提交此檔案。**

---

## 9) Docker Compose 設定

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
      # Recommended: keep the Gateway loopback-only on the VM; access via SSH tunnel.
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
      ]
```

---

## 10) 共用 Docker VM 執行階段步驟

使用共用執行階段指南以了解通用的 Docker 主機流程：

- [將必要的二進位檔建置至映像檔中](/zh-Hant/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [建置並啟動](/zh-Hant/install/docker-vm-runtime#build-and-launch)
- [什麼資料會保留在哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)
- [更新](/zh-Hant/install/docker-vm-runtime#updates)

---

## 11) GCP 專屬啟動備註

在 GCP 上，如果在 `pnpm install --frozen-lockfile` 期間因 `Killed` 或 `exit code 137` 導致建置失敗，表示 VM 記憶體不足。請至少使用 `e2-small`，或使用 `e2-medium` 以獲得更可靠的首建置體驗。

當綁定到 LAN (`OPENCLAW_GATEWAY_BIND=lan`) 時，請在繼續之前設定受信任的瀏覽器來源：

```bash
docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
```

如果您變更了 Gateway 連接埠，請將 `18789` 替換為您設定的連接埠。

## 12) 從您的筆記型電腦存取

建立 SSH 隧道以轉發 Gateway 連接埠：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在瀏覽器中開啟：

`http://127.0.0.1:18789/`

取得一個新的包含 token 的儀表板連結：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

從該 URL 貼上 token。

如果 Control UI 顯示 `unauthorized` 或 `disconnected (1008): pairing required`，請批准瀏覽器裝置：

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

需要再次查看共享的持久化和更新參考嗎？
請參閱 [Docker VM Runtime](/zh-Hant/install/docker-vm-runtime#what-persists-where) 和 [Docker VM Runtime updates](/zh-Hant/install/docker-vm-runtime#updates)。

---

## 疑難排解

**SSH 連線被拒**

在 VM 建立後，SSH 金鑰傳播可能需要 1-2 分鐘。請稍後重試。

**OS 登入問題**

檢查您的 OS 登入設定檔：

```bash
gcloud compute os-login describe-profile
```

確保您的帳戶具備所需的 IAM 權限 (Compute OS Login 或 Compute OS Admin Login)。

**記憶體不足 (OOM)**

如果 Docker 建置因 `Killed` 和 `exit code 137` 而失敗，表示 VM 遭到 OOM 強制終止。請升級至 e2-small (最低) 或 e2-medium (建議用於可靠的本地建置)：

```bash
# Stop the VM first
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# Start the VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## 服務帳戶 (安全性最佳實務)

對於個人使用，您的預設使用者帳戶即可正常運作。

對於自動化或 CI/CD 流水線，請建立一個具備最小權限的專用服務帳戶：

1. 建立服務帳戶：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色 (或更狹隘的自訂角色)：

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免在自動化中使用 Owner 角色。請使用最小權限原則。

請參閱 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) 以了解 IAM 角色詳情。

---

## 下一步

- 設定訊息頻道：[Channels](/zh-Hant/channels)
- 將本地裝置配對為節點：[Nodes](/zh-Hant/nodes)
- 設定 Gateway：[Gateway configuration](/zh-Hant/gateway/configuration)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
