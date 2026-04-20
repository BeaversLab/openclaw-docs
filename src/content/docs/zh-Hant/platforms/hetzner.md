---
summary: "在便宜的 Hetzner VPS (Docker) 上全天候 (24/7) 運行 OpenClaw Gateway，並具備持久化狀態和內建二進位檔"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目標

在 Hetzner VPS 上使用 Docker 運行持久化的 OpenClaw Gateway，具備持久化狀態、內建二進位檔以及安全的重啟行為。

如果您想要「以約 5 美元的價格全天候運行 OpenClaw」，這是最簡單可靠的設定。
Hetzner 的價格可能會變動；請選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM（記憶體不足）再進行擴展。

## 我們在做什麼（簡單來說）？

- 租用一台小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後仍會保留)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉送
- 如果您自行管理防火牆和 Token，則直接開放連接埠

本指南假設 Hetzner 上使用的是 Ubuntu 或 Debian。
如果您使用其他 Linux VPS，請對應相應的套件。
關於通用的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑 (適合有經驗的操作者)

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. Clone OpenClaw 儲存庫
4. 建立持久化主機目錄
5. 設定 `.env` 和 `docker-compose.yml`
6. 將所需的二進位檔內建至映像檔中
7. `docker compose up -d`
8. 驗證持久化和 Gateway 存取

---

## 您需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 具備 SSH + 複製/貼上 的基本操作能力
- 約 20 分鐘
- Docker 和 Docker Compose
- 模型驗證認證
- 選用的供應商認證
  - WhatsApp QR Code
  - Telegram Bot Token
  - Gmail OAuth

---

## 1) 佈建 VPS

在 Hetzner 中建立 Ubuntu 或 Debian VPS。

以 root 身分連線：

```bash
ssh root@YOUR_VPS_IP
```

本指南假設 VPS 是有狀態的。
請不要將其視為一次性基礎設施。

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

## 3) Clone OpenClaw 儲存庫

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假設您將建構自訂映像檔，以確保二進位檔的持久化。

---

## 4) 建立持久化主機目錄

Docker 容器是暫時性的。
所有長期存在的狀態必須存放在主機上。

```bash
mkdir -p /root/.openclaw
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
chown -R 1000:1000 /root/.openclaw/workspace
```

---

## 5) 設定環境變數

在儲存庫根目錄中建立 `.env`。

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
    command: ["node", "dist/index.js", "gateway", "--bind", "${OPENCLAW_GATEWAY_BIND}", "--port", "${OPENCLAW_GATEWAY_PORT}"]
```

---

## 7) 將所需的二進位檔案建置至映像中（關鍵）

在執行中的容器內安裝二進位檔案是一個陷阱。
在執行時期安裝的任何內容都會在重啟時遺失。

技能所需的所有外部二進位檔案都必須在建置映像時安裝。

以下範例僅顯示三種常見的二進位檔案：

- 用於 Gmail 存取的 `gog`
- 用於 Google Places 的 `goplaces`
- 用於 WhatsApp 的 `wacli`

這些只是範例，並非完整清單。
您可以使用相同的模式安裝所需數量的二進位檔案。

如果您稍後新增依賴其他二進位檔案的新技能，您必須：

1. 更新 Dockerfile
2. 重新建置映像
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

## 8) 建置並啟動

```bash
docker compose build
docker compose up -d openclaw-gateway
```

驗證二進位檔案：

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

貼上您的 gateway 權杖。

---

## 什麼內容存在於何處（可信來源）

OpenClaw 在 Docker 中執行，但 Docker 並非可信來源。
所有長期狀態必須在重啟、重新建置和重新開機後保留。

| 組件              | 位置                              | 持久機制          | 備註                        |
| ----------------- | --------------------------------- | ----------------- | --------------------------- |
| Gateway 設定      | `/home/node/.openclaw/`           | 主機掛載卷        | 包含 `openclaw.json`、權杖  |
| Model 驗證設定檔  | `/home/node/.openclaw/`           | 主機掛載卷        | OAuth 權杖、API 金鑰        |
| 技能設定          | `/home/node/.openclaw/skills/`    | 主機掛載卷        | 技能層級狀態                |
| Agent 工作區      | `/home/node/.openclaw/workspace/` | 主機掛載卷        | 程式碼與 agent 成果         |
| WhatsApp 工作階段 | `/home/node/.openclaw/`           | 主機掛載卷        | 保留 QR 登入                |
| Gmail 金鑰圈      | `/home/node/.openclaw/`           | 主機掛載卷 + 密碼 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二進位檔案    | `/usr/local/bin/`                 | Docker 映像       | 必須在建置時建置            |
| Node 執行時       | 容器檔案系統                      | Docker 映像       | 每次建置映像時重新建置      |
| OS 套件           | 容器檔案系統                      | Docker 映像       | 請勿在執行時安裝            |
| Docker 容器       | 暫時性                            | 可重新啟動        | 可安全銷毀                  |
