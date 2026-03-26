---
summary: "在 GCP Compute Engine VM (Docker) 上 24/7 運行 OpenClaw Gateway，並具有持久狀態"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# 在 GCP Compute Engine 上運行 OpenClaw (Docker、生產環境 VPS 指南)

## 目標

使用 Docker 在 GCP Compute Engine VM 上運行持續的 OpenClaw Gateway，具有持久狀態、內建二進位檔和安全的重啟行為。

如果您想要「大約每個月 5-12 美元的 24/7 OpenClaw」，這是在 Google Cloud 上可靠的設定。
價格因機器類型和區域而異；選擇適合您工作負載的最小 VM，如果遇到 OOM (記憶體不足) 則進行擴展。

## 我們在做什麼 (簡單來說)？

- 建立 GCP 專案並啟用計費
- 建立 Compute Engine VM
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後存活)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

您可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉送
- 直接暴露連接埠（如果您自行管理防火牆和權杖）

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可以運作；請對應相應的套件。
若要了解通用的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑（適合經驗豐富的操作人員）

1. 建立 GCP 專案 + 啟用 Compute Engine API
2. 建立 Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH 進入 VM
4. 安裝 Docker
5. Clone OpenClaw 存放庫
6. 建立持久化主機目錄
7. 設定 `.env` 和 `docker-compose.yml`
8. 建置所需的二進位檔、建構並啟動

---

## 您需要什麼

- GCP 帳戶（e2-micro 符合免費層級資格）
- 已安裝 gcloud CLI（或使用 Cloud Console）
- 從您的筆記型電腦進行 SSH 存取
- 對 SSH + 複製/貼上有基本概念
- 約 20-30 分鐘
- Docker 和 Docker Compose
- 模型認證憑證
- 選用供應商憑證
  - WhatsApp QR 碼
  - Telegram 機器人權杖
  - Gmail OAuth

---

## 1) 安裝 gcloud CLI (或使用 Console)

**選項 A：gcloud CLI** (建議用於自動化)

從 https://cloud.google.com/sdk/docs/install 安裝

初始化並進行認證：

```bash
gcloud init
gcloud auth login
```

**選項 B：Cloud Console**

所有步驟都可以透過位於 https://console.cloud.google.com 的網頁介面完成

---

## 2) 建立 GCP 專案

**CLI:**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 https://console.cloud.google.com/billing 啟用計費 (Compute Engine 必需)。

啟用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**Console:**

1. 前往 IAM & Admin > 建立專案
2. 命名並建立
3. 為專案啟用計費
4. 前往 APIs & Services > Enable APIs > 搜尋 "Compute Engine API" > Enable

---

## 3) 建立 VM

**機器類型:**

| 類型     | 規格                   | 費用             | 備註                            |
| -------- | ---------------------- | ---------------- | ------------------------------- |
| e2-small | 2 vCPU, 2GB RAM        | 每月約 $12       | 建議                            |
| e2-micro | 2 vCPU (共享), 1GB RAM | 符合免費層級資格 | 負載下可能發生 OOM (記憶體不足) |

**CLI:**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**主控台：**

1. 前往 Compute Engine > VM 執行個體 > 建立執行個體
2. 名稱：`openclaw-gateway`
3. 區域：`us-central1`，區域：`us-central1-a`
4. 機器類型：`e2-small`
5. 開機磁碟：Debian 12，20GB
6. 建立

---

## 4) 連線至 VM (SSH)

**CLI：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**主控台：**

在 Compute Engine 主控台中，點擊您 VM 旁邊的「SSH」按鈕。

注意：在建立 VM 後，SSH 金鑰傳播可能需要 1-2 分鐘的時間。如果連線被拒絕，請稍後重試。

---

## 5) 安裝 Docker (於 VM 上)

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

然後再次 SSH 連線：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

驗證：

```bash
docker --version
docker compose version
```

---

## 6) 複製 OpenClaw 存放庫

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假設您將建構自訂映像檔，以確保二進位檔案的持續性。

---

## 7) 建立持續性主機目錄

Docker 容器是暫時性的。
所有長期存在的狀態都必須儲存在主機上。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) 設定環境變數

在儲存庫根目錄中建立 `.env`。

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

產生強式祕鑰：

```bash
openssl rand -hex 32
```

**不要提交此檔案。**

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

      # Optional: only if you run iOS/Android nodes against this VM and need Canvas host.
      # If you expose this publicly, read /gateway/security and firewall accordingly.
      # - "18793:18793"
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

## 10) 將所需的二進位檔案內建至映像檔中（關鍵）

在執行中的容器內安裝二進位檔案是一個陷阱。
任何在執行時期安裝的項目都會在重新啟動時遺失。

技能所需的所有外部二進位檔案都必須在映像檔建置時期安裝。

以下的範例僅顯示三種常見的二進位檔案：

- 用於 Gmail 存取的 `gog`
- 用於 Google Places 的 `goplaces`
- 用於 WhatsApp 的 `wacli`

這些只是範例，並非完整的清單。
您可以使用相同的模式安裝任意數量的二進位檔案。

如果您後續新增依賴其他二進位檔案的技能，您必須：

1. 更新 Dockerfile
2. 重新建置映像檔
3. 重新啟動容器

**範例 Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 11) 建置並啟動

```bash
docker compose build
docker compose up -d openclaw-gateway
```

驗證二進位檔：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

預期輸出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 12) 驗證 Gateway

```bash
docker compose logs -f openclaw-gateway
```

成功：

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) 從您的筆記型電腦存取

建立 SSH 通道以轉發 Gateway 連接埠：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在瀏覽器中開啟：

`http://127.0.0.1:18789/`

貼上您的 gateway 權杖。

---

## 什麼內容在哪裡保存（事實來源）

OpenClaw 在 Docker 中執行，但 Docker 並非事實來源。
所有長期狀態必須在重啟、重建和重新啟動後繼續存在。

| 元件              | 位置                              | 保存機制          | 備註                        |
| ----------------- | --------------------------------- | ----------------- | --------------------------- |
| Gateway 設定      | `/home/node/.openclaw/`           | 主機磁碟區掛載    | 包含 `openclaw.json`、權杖  |
| 模型驗證設定檔    | `/home/node/.openclaw/`           | 主機磁碟區掛載    | OAuth 權杖、API 金鑰        |
| Skill 設定        | `/home/node/.openclaw/skills/`    | 主機磁碟區掛載    | Skill 層級狀態              |
| Agent 工作區      | `/home/node/.openclaw/workspace/` | 主機磁碟區掛載    | 程式碼與 Agent 成果         |
| WhatsApp 工作階段 | `/home/node/.openclaw/`           | 主機磁碟區掛載    | 保留 QR 登入                |
| Gmail 鑰匙圈      | `/home/node/.openclaw/`           | 主機磁碟區 + 密碼 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二進位檔案    | `/usr/local/bin/`                 | Docker 映像檔     | 必須在建置時納入            |
| Node 執行環境     | 容器檔案系統                      | Docker 映像檔     | 每次建置映像檔時重新建置    |
| OS 套件           | 容器檔案系統                      | Docker 映像檔     | 請勿在執行時期安裝          |
| Docker 容器       | 暫時性                            | 可重新啟動        | 可安全銷毀                  |

---

## 更新

若要更新 VM 上的 OpenClaw：

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## 疑難排解

**SSH 連線被拒**

在建立 VM 後，SSH 金鑰傳播可能需要 1-2 分鐘。請稍後再試。

**OS 登入問題**

檢查您的 OS 登入設定檔：

```bash
gcloud compute os-login describe-profile
```

確保您的帳戶具備所需的 IAM 權限 (Compute OS Login 或 Compute OS Admin Login)。

**記憶體不足 (OOM)**

如果使用 e2-micro 並遇到 OOM，請升級至 e2-small 或 e2-medium：

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

## 服務帳戶（安全性最佳實踐）

對於個人用途，您的預設使用者帳戶即可正常運作。

對於自動化或 CI/CD 管線，請建立一個具有最小權限的專用服務帳戶：

1. 建立服務帳戶：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色（或更狹隘的自訂角色）：
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免在自動化中使用 Owner 角色。請遵循最小權限原則。

請參閱 https://cloud.google.com/iam/docs/understanding-roles 以了解 IAM 角色詳細資訊。

---

## 後續步驟

- 設定訊息管道：[管道](/zh-Hant/channels)
- 將本機裝置配對為節點：[節點](/zh-Hant/nodes)
- 設定 Gateway：[Gateway 設定](/zh-Hant/gateway/configuration)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
