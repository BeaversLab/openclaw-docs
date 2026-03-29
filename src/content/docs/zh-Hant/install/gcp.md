---
summary: "在 GCP Compute Engine VM (Docker) 上全天候運行 OpenClaw Gateway，並具備持久化狀態"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw on GCP Compute Engine (Docker, Production VPS Guide)

## 目標

在 GCP Compute Engine VM 上使用 Docker 運行持久化的 OpenClaw Gateway，具備持久狀態、內建二進位文件和安全的重啟行為。

如果您想要「以約每月 5-12 美元的價格全天候運行 OpenClaw」，這是在 Google Cloud 上的一個可靠設定。
價格因機器類型和區域而異；請選擇適合您工作負載的最小 VM，如果遇到 OOM (記憶體不足) 則進行擴展。

## 我們要做什麼（簡單來說）？

- 建立 GCP 專案並啟用計費
- 建立 Compute Engine VM
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後仍然保留)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉發
- 如果您自行管理防火牆和令牌，可直接開放連接埠

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可以運作；請對應相關的套件。
關於通用 Docker 流程，請參閱 [Docker](/en/install/docker)。

---

## 快速路徑 (有經驗的操作人員)

1. 建立 GCP 專案 + 啟用 Compute Engine API
2. 建立 Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH 進入 VM
4. 安裝 Docker
5. 克隆 OpenClaw 存放庫
6. 建立持久化主機目錄
7. 設定 `.env` 和 `docker-compose.yml`
8. 內建所需的二進位文件，建置並啟動

---

## 您需要什麼

- GCP 帳戶 (e2-micro 符合免費層資格)
- 已安裝 gcloud CLI (或使用 Cloud Console)
- 從您的筆記型電腦進行 SSH 存取
- 具備基本的 SSH + 複製/貼上操作能力
- 約 20-30 分鐘
- Docker 和 Docker Compose
- 模型認證憑證
- 選用的提供商憑證
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

<Steps>
  <Step title="安裝 gcloud CLI (或使用 Console)">
    **選項 A：gcloud CLI** (建議用於自動化)

    從 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安裝

    初始化並進行驗證：

    ```bash
    gcloud init
    gcloud auth login
    ```

    **選項 B：Cloud Console**

    所有步驟均可透過網頁介面在 [https://console.cloud.google.com](https://console.cloud.google.com) 完成

  </Step>

  <Step title="建立 GCP 專案">
    **CLI：**

    ```bash
    gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
    gcloud config set project my-openclaw-project
    ```

    在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 啟用計費 (Compute Engine 必需)。

    啟用 Compute Engine API：

    ```bash
    gcloud services enable compute.googleapis.com
    ```

    **Console：**

    1. 前往 IAM & Admin > Create Project
    2. 命名並建立
    3. 為專案啟用計費
    4. 前往 APIs & Services > Enable APIs > 搜尋 "Compute Engine API" > Enable

  </Step>

  <Step title="建立 VM">
    **機器類型：**

    | Type      | Specs                    | Cost               | Notes                                        |
    | --------- | ------------------------ | ------------------ | -------------------------------------------- |
    | e2-medium | 2 vCPU, 4GB RAM          | ~$25/mo            | 本機 Docker 建置最可靠                         |
    | e2-small  | 2 vCPU, 2GB RAM          | ~$12/mo            | Docker 建置的最低建議                          |
    | e2-micro  | 2 vCPU (共享), 1GB RAM   | 符合免費層資格      | 常因 Docker 建置 OOM (exit 137) 而失敗         |

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
    2. Name: `openclaw-gateway`
    3. Region: `us-central1`, Zone: `us-central1-a`
    4. Machine type: `e2-small`
    5. Boot disk: Debian 12, 20GB
    6. Create

  </Step>

  <Step title="SSH 進入 VM">
    **CLI：**

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a
    ```

    **Console：**

    在 Compute Engine 介面中點擊您 VM 旁的 "SSH" 按鈕。

    備註：SSH 金鑰傳播在 VM 建立後可能需要 1-2 分鐘。如果連線被拒，請稍後重試。

  </Step>

  <Step title="安裝 Docker (於 VM 上)">
    ```bash
    sudo apt-get update
    sudo apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    ```

    登出並重新登入以讓群組變更生效：

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

  </Step>

  <Step title="Clone the OpenClaw repository">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假設您將構建自定義鏡像以確保二進製文件的持久性。

  </Step>

  <Step title="Create persistent host directories">
    Docker 容器是臨時的。
    所有長期存在的狀態必須駐留在主機上。

    ```bash
    mkdir -p ~/.openclaw
    mkdir -p ~/.openclaw/workspace
    ```

  </Step>

  <Step title="Configure environment variables">
    在存儲庫根目錄中創建 `.env`。

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

    生成強密鑰：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

  </Step>

  <Step title="Docker Compose configuration">
    創建或更新 `docker-compose.yml`。

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
            "--allow-unconfigured",
          ]
    ```

    `--allow-unconfigured` 僅用於引導便利性，它不能代替適當的網關配置。仍需設置身份驗證 (`gateway.auth.token` 或密碼)，並為您的部署使用安全的綁定設置。

  </Step>

  <Step title="Shared Docker VM runtime steps">
    使用共享運行時指南了解常見的 Docker 主機流程：

    - [將所需的二進製文件烘焙到鏡像中](/en/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [構建和啟動](/en/install/docker-vm-runtime#build-and-launch)
    - [什麼持久化在哪裡](/en/install/docker-vm-runtime#what-persists-where)
    - [更新](/en/install/docker-vm-runtime#updates)

  </Step>

  <Step title="GCP-specific launch notes">
    在 GCP 上，如果在 `pnpm install --frozen-lockfile` 期間構建失敗並出現 `Killed` 或 `exit code 137`，則表示 VM 內存不足。最少使用 `e2-small`，或者使用 `e2-medium` 以獲得更可靠的首​​次構建。

    綁定到 LAN (`OPENCLAW_GATEWAY_BIND=lan`) 時，請在繼續之前配置受信任的瀏覽器來源：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
    ```

    如果您更改了網關端口，請將 `18789` 替換為您配置的端口。

  </Step>

  <Step title="從您的筆記型電腦存取">
    建立 SSH 通道以轉發 Gateway 連接埠：

    ```bash
    gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
    ```

    在瀏覽器中開啟：

    `http://127.0.0.1:18789/`

    取得全新的 token 儀表板連結：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

    貼上該 URL 中的 token。

    如果 Control UI 顯示 `unauthorized` 或 `disconnected (1008): pairing required`，請批准瀏覽器裝置：

    ```bash
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    需要再次查看共享的持久化和更新參考嗎？
    請參閱 [Docker VM Runtime](/en/install/docker-vm-runtime#what-persists-where) 和 [Docker VM Runtime updates](/en/install/docker-vm-runtime#updates)。

  </Step>
</Steps>

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

如果 Docker 建置因 `Killed` 和 `exit code 137` 而失敗，表示 VM 已因 OOM 被終止。請升級至 e2-small (最低) 或 e2-medium (建議用於可靠的本地建置)：

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

對於個人用途，您的預設使用者帳戶即可正常運作。

對於自動化或 CI/CD 管線，請建立具備最低權限的專用服務帳戶：

1. 建立服務帳戶：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色 (或範圍更窄的自訂角色)：

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免對自動化使用 Owner 角色。請遵循最低權限原則。

請參閱 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) 以了解 IAM 角色詳細資訊。

---

## 下一步

- 設定訊息管道：[Channels](/en/channels)
- 將本地裝置配對為節點：[Nodes](/en/nodes)
- 設定 Gateway：[Gateway configuration](/en/gateway/configuration)
