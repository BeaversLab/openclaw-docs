---
summary: "在便宜的 Hetzner VPS (Docker) 上全天候 24/7 運行 OpenClaw Gateway，具備持久狀態和內建二進位檔"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目標

使用 Docker 在 Hetzner VPS 上運行持久化的 OpenClaw Gateway，具備持久狀態、內建二進位檔和安全的重啟行為。

如果您想要「以約 5 美元的價格全天候運行 OpenClaw」，這是最簡單可靠的設定。
Hetzner 的定價可能會變更；請選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM (記憶體不足) 再進行擴充。

## 我們在做什麼（簡單來說）？

- 租用一台小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後仍然存在)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

可透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉送
- 如果您自行管理防火牆和權杖，則可直接開放連接埠

本指南假設您在 Hetzner 上使用 Ubuntu 或 Debian。  
如果您使用其他 Linux VPS，請對應調整套件。
若要了解一般的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑 (經驗豐富的操作者)

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. 複製 OpenClaw 程式庫
4. 建立永久主機目錄
5. 設定 `.env` 和 `docker-compose.yml`
6. 將所需二進位檔案內建至映像檔中
7. `docker compose up -d`
8. 驗證持久性和 Gateway 存取

---

## 您需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 具備基本的 SSH + 複製/貼上操作能力
- 約 20 分鐘
- Docker 和 Docker Compose
- Model 驗證憑證
- 選用供應商憑證
  - WhatsApp QR 碼
  - Telegram 機器人權杖
  - Gmail OAuth

---

## 1) 佈建 VPS

在 Hetzner 中建立 Ubuntu 或 Debian VPS。

以 root 身份連線：

```bash
ssh root@YOUR_VPS_IP
```

本指南假設 VPS 是有狀態的。
請勿將其視為可拋棄的基礎設施。

---

## 2) 安裝 Docker（於 VPS 上）

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

本指南假設您將建構自訂映像檔，以確保二進位檔的持久性。

---

## 4) 建立持久主機目錄

Docker 容器是短暫的。
所有長期狀態必須存在於主機上。

```bash
mkdir -p /root/.openclaw
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
chown -R 1000:1000 /root/.openclaw/workspace
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

產生強密鑰：

```bash
openssl rand -hex 32
```

**請勿提交此檔案。**

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

      # Optional: only if you run iOS/Android nodes against this VPS and need Canvas host.
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

## 7) 將必要的二進位檔建置至映像檔中（關鍵）

在執行中的容器內安裝二進位檔是個陷阱。
任何在執行時期安裝的項目都會在重啟後遺失。

所有技能所需的外部二進制檔案都必須在映像檔建置時安裝。

以下範例僅顯示三種常見的二進制檔案：

- `gog` 用於 Gmail 存取
- `goplaces` 用於 Google Places
- `wacli` 用於 WhatsApp

這些只是範例，並非完整的清單。
您可以使用相同的模式安裝所需的任意數量的二進制檔案。

如果您稍後新增依賴其他二進制檔案的技能，您必須：

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

## 8) 建置與啟動

```bash
docker compose build
docker compose up -d openclaw-gateway
```

驗證二進制檔案：

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

## 9) 驗證 Gateway

```bash
docker compose logs -f openclaw-gateway
```

成功：

```
[gateway] listening on ws://0.0.0.0:18789
```

從您的筆記型電腦：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

開啟：

`http://127.0.0.1:18789/`

貼上您的 gateway token。

---

## 什麼在哪裡持久化（可信來源）

OpenClaw 在 Docker 中執行，但 Docker 並非可信來源。
所有長期的狀態必須在重新啟動、重新建置和重新開機後仍然存在。

| 組件             | 位置                              | 持久化機制    | 備註                        |
| ---------------- | --------------------------------- | ------------- | --------------------------- |
| Gateway 配置     | `/home/node/.openclaw/`           | 主機卷掛載    | 包含 `openclaw.json`、令牌  |
| 模型驗證配置文件 | `/home/node/.openclaw/`           | 主機卷掛載    | OAuth 令牌、API 密鑰        |
| 技能配置         | `/home/node/.openclaw/skills/`    | 主機卷掛載    | 技能級別狀態                |
| Agent 工作區     | `/home/node/.openclaw/workspace/` | 主機卷掛載    | 程式碼與 Agent 產出         |
| WhatsApp 會話    | `/home/node/.openclaw/`           | 主機卷掛載    | 保留 QR 登入                |
| Gmail 鑰匙圈     | `/home/node/.openclaw/`           | 主機卷 + 密碼 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二進位文件   | `/usr/local/bin/`                 | Docker 映像檔 | 必須在建置時納入            |
| Node 執行環境    | 容器檔案系統                      | Docker 映像檔 | 每次建置映像時重建          |
| 作業系統套件     | 容器檔案系統                      | Docker 映像檔 | 請勿在執行時安裝            |
| Docker 容器      | 暫時性                            | 可重新啟動    | 可安全銷毀                  |

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
