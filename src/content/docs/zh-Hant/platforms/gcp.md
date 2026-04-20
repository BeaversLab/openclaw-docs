---
summary: "Run OpenClaw Gateway 24/7 on a GCP Compute Engine VM (Docker) with durable state"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw on GCP Compute Engine (Docker, Production VPS Guide)

## 目標

使用 Docker 在 GCP Compute Engine VM 上執行持續運行的 OpenClaw Gateway，並具備持久狀態、內建二進位檔和安全的重啟行為。

如果您想要「每月約 $5-12 美元的 OpenClaw 24/7 服務」，這是在 Google Cloud 上可靠的設定方案。
價格因機器類型和區域而異；請選擇符合您工作負載的最小 VM，如果遇到 OOM (記憶體不足) 則進行擴展。

## 我們正在做什麼（簡單來說）？

- 建立 GCP 專案並啟用計費
- 建立 Compute Engine VM
- 安裝 Docker（隔離的應用程式執行環境）
- 在 Docker 中啟動 OpenClaw Gateway
- 將 `~/.openclaw` + `~/.openclaw/workspace` 持久化在主機上（在重啟/重建後仍然存在）
- 透過 SSH 隧道從筆記型電腦存取控制 UI

可以透過以下方式存取 Gateway：

- 從筆記型電腦進行 SSH 連接埠轉發
- 直接公開連接埠（如果您自行管理防火牆和權杖）

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可以運作；請對應相應的套件。
關於通用的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑（適合經驗豐富的操作員）

1. 建立 GCP 專案 + 啟用 Compute Engine API
2. 建立 Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH 連入 VM
4. 安裝 Docker
5. 複製 OpenClaw 程式庫
6. 建立持久化主機目錄
7. 設定 `.env` 和 `docker-compose.yml`
8. 建構所需的二進位檔、進行建置並啟動

---

## 您需要什麼

- GCP 帳戶 (e2-micro 符合免費層資格)
- 已安裝 gcloud CLI (或使用 Cloud Console)
- 可從筆記型電腦進行 SSH 存取
- 具備基本的 SSH + 複製/貼上操作能力
- 約 20-30 分鐘
- Docker 和 Docker Compose
- 模型驗證憑證
- 選用的提供者憑證
  - WhatsApp QR Code
  - Telegram 機器人權杖
  - Gmail OAuth

---

## 1) 安裝 gcloud CLI (或使用 Console)

**選項 A：gcloud CLI** (建議用於自動化)

從 https://cloud.google.com/sdk/docs/install 安裝

初始化並進行驗證：

```bash
gcloud init
gcloud auth login
```

**選項 B：Cloud Console**

所有步驟都可以透過 https://console.cloud.google.com 的網頁 UI 完成

---

## 2) 建立 GCP 專案

**CLI：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 https://console.cloud.google.com/billing 啟用計費（Compute Engine 需要此步驟）。

啟用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**主控台：**

1. 前往 IAM 與管理員 > 建立專案
2. 命名並建立
3. 為專案啟用計費
4. 前往 API 和服務 > 啟用 API > 搜尋 "Compute Engine API" > 啟用

---

## 3) 建立 VM

**機器類型：**

| 類型     | 規格                   | 費用             | 備註                     |
| -------- | ---------------------- | ---------------- | ------------------------ |
| e2-small | 2 vCPU，2GB RAM        | 約 $12/月        | 建議                     |
| e2-micro | 2 vCPU (共享)，1GB RAM | 符合免費方案資格 | 負載過高時可能會發生 OOM |

**CLI：**

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
2. 名稱： `openclaw-gateway`
3. 區域： `us-central1`，區域： `us-central1-a`
4. 機器類型： `e2-small`
5. 開機磁碟： Debian 12, 20GB
6. 建立

---

## 4) SSH 進入 VM

**CLI：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**主控台：**

在 Compute Engine 儀表板中，點擊您的 VM 旁邊的 "SSH" 按鈕。

注意：VM 建立後，SSH 金鑰傳播可能需要 1-2 分鐘。如果連線被拒，請稍後重試。

---

## 5) 安裝 Docker (在 VM 上)

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

然後再次 SSH 進入：

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

本指南假設您將建置自訂映像檔以確保二進位檔的持久性。

---

## 7) 建立持久化主機目錄

Docker 容器是暫時的。
所有長期存在的狀態都必須存在於主機上。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) 設定環境變數

在存放庫根目錄建立 `.env`。

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

生成強密碼：

```bash
openssl rand -hex 32
```

**請勿提交此檔案。**

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
    command: ["node", "dist/index.js", "gateway", "--bind", "${OPENCLAW_GATEWAY_BIND}", "--port", "${OPENCLAW_GATEWAY_PORT}"]
```

---

## 10) 將所需的二進位檔內建至映像檔中 (關鍵)

在執行中的容器內安裝二進位檔是一個陷阱。
任何在執行時期安裝的內容都會在重新啟動時遺失。

技能所需的所有外部二進位檔都必須在映像檔建置期間安裝。

以下範例僅顯示三種常見的二進位檔：

- `gog` 用於 Gmail 存取
- `goplaces` 用於 Google Places
- `wacli` 用於 WhatsApp

這些只是範例，並非完整清單。
您可以使用相同的模式安裝所需數量的二進位檔。

如果您稍後新增依賴額外二進位檔的新技能，您必須：

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

建立 SSH 隧道以轉發 Gateway 連接埠：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在瀏覽器中開啟：

`http://127.0.0.1:18789/`

貼上您的 gateway 權杖。

---

## 什麼在何處持久化 (單一來源)

OpenClaw 在 Docker 中執行，但 Docker 並非單一來源。
所有長期狀態都必須在重啟、重建和重新開機後存續。

| 元件              | 位置                              | 持久化機制    | 備註                        |
| ----------------- | --------------------------------- | ------------- | --------------------------- |
| Gateway 設定      | `/home/node/.openclaw/`           | 主機卷掛載    | 包含 `openclaw.json`、權杖  |
| 模型驗證設定檔    | `/home/node/.openclaw/`           | 主機卷掛載    | OAuth 權杖、API 金鑰        |
| Skill 設定        | `/home/node/.openclaw/skills/`    | 主機卷掛載    | Skill 層級狀態              |
| Agent 工作區      | `/home/node/.openclaw/workspace/` | 主機卷掛載    | 程式碼和 agent 成品         |
| WhatsApp 工作階段 | `/home/node/.openclaw/`           | 主機卷掛載    | 保留 QR 登入                |
| Gmail 金鑰圈      | `/home/node/.openclaw/`           | 主機卷 + 密碼 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二進位檔      | `/usr/local/bin/`                 | Docker 映像檔 | 必須在建置時納入            |
| Node 執行時       | 容器檔案系統                      | Docker 映像檔 | 每次建置映像檔時重建        |
| OS 套件           | 容器檔案系統                      | Docker 映像檔 | 請勿在執行時安裝            |
| Docker 容器       | 暫時性                            | 可重新啟動    | 可安全銷毀                  |

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

**SSH 連線遭到拒絕**

SSH 金鑰傳播在 VM 建立後可能需要 1-2 分鐘。請稍後再試。

**OS 登入問題**

檢查您的 OS 登入設定檔：

```bash
gcloud compute os-login describe-profile
```

確保您的帳戶具備所需的 IAM 權限 (Compute OS Login 或 Compute OS Admin Login)。

**記憶體不足 (OOM)**

如果使用 e2-micro 且遇到 OOM，請升級至 e2-small 或 e2-medium：

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

## 服務帳戶 (安全最佳實務)

對於個人用途，您的預設使用者帳戶即可正常運作。

對於自動化或 CI/CD 管線，請建立具備最低權限的專用服務帳戶：

1. 建立服務帳戶：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色 (或範圍更狹窄的自訂角色)：
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

請避免將 Owner 角色用於自動化。請遵循最低權限原則。

請參閱 https://cloud.google.com/iam/docs/understanding-roles 以了解 IAM 角色詳細資訊。

---

## 後續步驟

- 設置訊息通道：[通道](/zh-Hant/channels)
- 將本地設備配對為節點：[節點](/zh-Hant/nodes)
- 設定 Gateway：[Gateway 設定](/zh-Hant/gateway/configuration)
