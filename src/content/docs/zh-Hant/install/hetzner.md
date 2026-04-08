---
summary: "在廉價的 Hetzner VPS (Docker) 上全天候運行 OpenClaw Gateway，具備持久狀態和內建二進製檔案"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目標

使用 Docker 在 Hetzner VPS 上運行持久化的 OpenClaw Gateway，具備持久狀態、內建二進製檔案和安全的重啟行為。

如果您想要「以約 5 美元的價格全天候運行 OpenClaw」，這是最簡單可靠的設定。
Hetzner 的價格可能會變動；請選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM (記憶體不足) 再進行擴充。

安全性模型提醒：

- 當所有人都在相同的信任邊界內且執行環境僅用於商業用途時，共用公司代理程式是可以接受的。
- 保持嚴格的分離：專用的 VPS/執行環境 + 專用帳戶；該主機上不得有個人的 Apple/Google/瀏覽器/密碼管理器設定檔。
- 如果使用者之間存在潛在衝突，請依據 gateway/host/OS 使用者進行分隔。

請參閱[安全性](/en/gateway/security)和 [VPS 託管](/en/vps)。

## 我們在做什麼（簡單來說）？

- 租用一台小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後存活)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

該掛載的 `~/.openclaw` 狀態包括 `openclaw.json`、每個代理的
`agents/<agentId>/agent/auth-profiles.json` 和 `.env`。

您可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉送
- 如果您自行管理防火牆和 Token，則可直接暴露連接埠

本指南假設您在 Hetzner 上使用 Ubuntu 或 Debian。  
如果您使用的是其他 Linux VPS，請對應相應的套件。
關於一般的 Docker 流程，請參閱 [Docker](/en/install/docker)。

---

## 快速路徑 (適合有經驗的操作者)

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. 複製 OpenClaw 存放庫
4. 建立持久主機目錄
5. 設定 `.env` 和 `docker-compose.yml`
6. 將所需的二進位檔案內建到映像中
7. `docker compose up -d`
8. 驗證持久化和 Gateway 存取權

---

## 您需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 具備基本的 SSH + 複製/貼上操作能力
- 約 20 分鐘
- Docker 和 Docker Compose
- 模型驗證認證
- 選用的提供者認證
  - WhatsApp QR
  - Telegram 機器人 Token
  - Gmail OAuth

---

<Steps>
  <Step title="佈建 VPS">
    在 Hetzner 中建立 Ubuntu 或 Debian VPS。

    以 root 身分連線：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假設 VPS 是有狀態的。
    請勿將其視為可拋棄的基礎架構。

  </Step>

  <Step title="安裝 Docker (在 VPS 上)">
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

  </Step>

  <Step title="複製 OpenClaw 存放庫">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假設您將建構自訂映像以確保二進位檔案的持久化。

  </Step>

  <Step title="建立持久主機目錄">
    Docker 容器是短暫的。
    所有長期狀態都必須存在於主機上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="設定環境變數">
    在倉庫根目錄中建立 `.env`。

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

    生成強祕鑰：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此檔案。**

    此 `.env` 檔案用於容器/運行時環境變數，例如 `OPENCLAW_GATEWAY_TOKEN`。
    已儲存的供應商 OAuth/API 金鑰認證位於已掛載的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="Docker Compose 設定">
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

    `--allow-unconfigured` 僅為了便於啟動，它不能取代適當的 Gateway 設定。仍需設定認證 (`gateway.auth.token` 或密碼)，並針對您的部署使用安全的綁定設定。

  </Step>

  <Step title="共用的 Docker VM 運行時步驟">
    使用共用的運行時指南來了解一般的 Docker 主機流程：

    - [將所需的二進位檔案製作到映像中](/en/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [建置與啟動](/en/install/docker-vm-runtime#build-and-launch)
    - [資料持久化位置](/en/install/docker-vm-runtime#what-persists-where)
    - [更新](/en/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 專屬存取方式">
    在完成共用的建置和啟動步驟後，從您的筆記型電腦建立通道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    開啟：

    `http://127.0.0.1:18789/`

    貼上已設定的共用祕鑰。本指南預設使用 Gateway 權杖；
    如果您切換到密碼認證，請改用該密碼。

  </Step>
</Steps>

共用的持久化對應表位於 [Docker VM 運行時](/en/install/docker-vm-runtime#what-persists-where) 中。

## 基礎設施即程式碼

對於偏好基礎設施即程式碼工作流程的團隊，社群維護的 Terraform 設定提供了：

- 具有遠端狀態管理的模組化 Terraform 設定
- 透過 cloud-init 自動化佈建
- 部署腳本
- 安全性強化 (防火牆、UFW、僅限 SSH 存取)
- 用於 Gateway 存取的 SSH 通道設定

**儲存庫：**

- 基礎架構：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 設定：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法透過可重現的部署、版本控制的基礎架構和自動化災難恢復，補充了上述 Docker 設定。

> **注意：** 由社群維護。如有問題或貢獻，請參閱上方儲存庫連結。

## 後續步驟

- 設定訊息通道：[通道](/en/channels)
- 設定 Gateway：[Gateway 設定](/en/gateway/configuration)
- 保持 OpenClaw 為最新狀態：[更新](/en/install/updating)
