---
summary: "Run OpenClaw Gateway 24/7 on a GCP Compute Engine VM (Docker) with durable state"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw on GCP Compute Engine (Docker, Production VPS Guide)

## Goal

Run a persistent OpenClaw Gateway on a GCP Compute Engine VM using Docker, with durable state, baked-in binaries, and safe restart behavior.

If you want "OpenClaw 24/7 for ~$5-12/mo", this is a reliable setup on Google Cloud.
Pricing varies by machine type and region; pick the smallest VM that fits your workload and scale up if you hit OOMs.

## What are we doing (simple terms)?

- Create a GCP project and enable billing
- Create a Compute Engine VM
- Install Docker (isolated app runtime)
- Start the OpenClaw Gateway in Docker
- Persist `~/.openclaw` + `~/.openclaw/workspace` on the host (survives restarts/rebuilds)
- Access the Control UI from your laptop via an SSH tunnel

The Gateway can be accessed via:

- SSH port forwarding from your laptop
- Direct port exposure if you manage firewalling and tokens yourself

This guide uses Debian on GCP Compute Engine.
Ubuntu also works; map packages accordingly.
For the generic Docker flow, see [Docker](/zh-Hant/install/docker).

---

## Quick path (experienced operators)

1. Create GCP project + enable Compute Engine API
2. Create Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH into the VM
4. Install Docker
5. Clone OpenClaw repository
6. Create persistent host directories
7. Configure `.env` and `docker-compose.yml`
8. Bake required binaries, build, and launch

---

## What you need

- GCP account (free tier eligible for e2-micro)
- gcloud CLI installed (or use Cloud Console)
- SSH access from your laptop
- Basic comfort with SSH + copy/paste
- ~20-30 minutes
- Docker and Docker Compose
- Model auth credentials
- Optional provider credentials
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

## 1) Install gcloud CLI (or use Console)

**Option A: gcloud CLI** (recommended for automation)

Install from https://cloud.google.com/sdk/docs/install

Initialize and authenticate:

```bash
gcloud init
gcloud auth login
```

**Option B: Cloud Console**

All steps can be done via the web UI at https://console.cloud.google.com

---

## 2) 建立 GCP 專案

**CLI：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 https://console.cloud.google.com/billing 啟用計費（Compute Engine 需要）。

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

| 類型     | 規格                   | 費用             | 備註                 |
| -------- | ---------------------- | ---------------- | -------------------- |
| e2-small | 2 vCPU，2GB RAM        | ~$12/月          | 推薦                 |
| e2-micro | 2 vCPU (共享)，1GB RAM | 符合免費方案條件 | 負載下可能會發生 OOM |

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
3. 區域：`us-central1`，區域：`us-central1-a`
4. 機器類型：`e2-small`
5. 開機磁碟：Debian 12，20GB
6. 建立

---

## 4) 透過 SSH 連線進 VM

**CLI：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Console：**

在 Compute Engine 主控台中，點擊 VM 旁邊的「SSH」按鈕。

注意：SSH 金鑰傳播可能需要在 VM 建立後花費 1-2 分鐘。如果連線被拒，請稍後重試。

---

## 5) 安裝 Docker (在 VM 上)

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

然後再次透過 SSH 連線：

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

本指南假設您將建構自訂映像檔以確保二進位檔的持久性。

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

在程式庫根目錄建立 `.env`。

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

## 10) 將所需的二進位檔打包至映像檔中 (關鍵)

在執行中的容器內安裝二進位檔是一個陷阱。
在執行時期安裝的任何東西都會在重啟後遺失。

技能所需的任何外部二進位檔都必須在映像檔建置時安裝。

以下範例僅顯示三種常見的二進位檔：

- `gog` 用於 Gmail 存取
- `goplaces` 用於 Google Places
- `wacli` 用於 WhatsApp

這些只是範例，並非完整清單。
您可以使用相同模式安裝所需數量的二進位檔。

如果您稍後新增依賴其他二進位檔的技能，您必須：

1. 更新 Dockerfile
2. 重新建構映像檔
3. 重新啟動容器

**Example Dockerfile**

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

## 11) Build and launch

```bash
docker compose build
docker compose up -d openclaw-gateway
```

Verify binaries:

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

Expected output:

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 12) Verify Gateway

```bash
docker compose logs -f openclaw-gateway
```

Success:

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) Access from your laptop

Create an SSH tunnel to forward the Gateway port:

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

Open in your browser:

`http://127.0.0.1:18789/`

Paste your gateway token.

---

## What persists where (source of truth)

OpenClaw runs in Docker, but Docker is not the source of truth.
All long-lived state must survive restarts, rebuilds, and reboots.

| Component           | Location                          | Persistence mechanism  | Notes                            |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Gateway config      | `/home/node/.openclaw/`           | Host volume mount      | Includes `openclaw.json`, tokens |
| Model auth profiles | `/home/node/.openclaw/`           | Host volume mount      | OAuth tokens, API keys           |
| Skill configs       | `/home/node/.openclaw/skills/`    | Host volume mount      | Skill-level state                |
| Agent workspace     | `/home/node/.openclaw/workspace/` | Host volume mount      | Code and agent artifacts         |
| WhatsApp session    | `/home/node/.openclaw/`           | Host volume mount      | Preserves QR login               |
| Gmail keyring       | `/home/node/.openclaw/`           | Host volume + password | Requires `GOG_KEYRING_PASSWORD`  |
| External binaries   | `/usr/local/bin/`                 | Docker image           | Must be baked at build time      |
| Node runtime        | Container filesystem              | Docker image           | Rebuilt every image build        |
| OS packages         | Container filesystem              | Docker image           | Do not install at runtime        |
| Docker container    | Ephemeral                         | Restartable            | Safe to destroy                  |

---

## Updates

To update OpenClaw on the VM:

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## Troubleshooting

**SSH connection refused**

SSH key propagation can take 1-2 minutes after VM creation. Wait and retry.

**OS Login issues**

Check your OS Login profile:

```bash
gcloud compute os-login describe-profile
```

Ensure your account has the required IAM permissions (Compute OS Login or Compute OS Admin Login).

**Out of memory (OOM)**

If using e2-micro and hitting OOM, upgrade to e2-small or e2-medium:

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

## Service accounts (security best practice)

For personal use, your default user account works fine.

For automation or CI/CD pipelines, create a dedicated service account with minimal permissions:

1. Create a service account:

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. Grant Compute Instance Admin role (or narrower custom role):
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

Avoid using the Owner role for automation. Use the principle of least privilege.

See https://cloud.google.com/iam/docs/understanding-roles for IAM role details.

---

## 下一步

- 設定傳訊頻道：[Channels](/zh-Hant/channels)
- 將本機裝置配對為節點：[Nodes](/zh-Hant/nodes)
- 設定 Gateway：[Gateway configuration](/zh-Hant/gateway/configuration)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
