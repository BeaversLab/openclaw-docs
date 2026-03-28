---
summary: "在廉價的 Hetzner VPS (Docker) 上全天候執行 OpenClaw Gateway，具備持久狀態和內建二進位檔"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目標

使用 Docker 在 Hetzner VPS 上執行持久化的 OpenClaw Gateway，具備持久狀態、內建二進位檔和安全的重啟行為。

如果您想要「全天候執行 OpenClaw，約 $5」，這是最簡單可靠的設定。
Hetzner 的價格可能會變動；選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM（記憶體不足）再進行擴充。

安全模型提醒：

- 當所有人都在相同的信任邊界內，並且執行環境僅用於業務時，公司共用的代理程式是可以接受的。
- 保持嚴格隔離：專用的 VPS/執行環境 + 專用帳戶；該主機上不得有個人 Apple/Google/瀏覽器/密碼管理器設定檔。
- 如果使用者之間存在對抗性，請依 gateway/host/OS 使用者進行分割。

請參閱[安全性](/zh-Hant/gateway/security)與 [VPS 託管](/zh-Hant/vps)。

## 我們在做什麼（簡單來說）？

- 租用一個小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持續儲存 `~/.openclaw` + `~/.openclaw/workspace` (能在重啟/重建後存活)
- 透過 SSH 通道從筆記型電腦存取控制介面

可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連接埠轉發
- 如果您自行管理防火牆和權杖，可直接開放連接埠

本指南假設在 Hetzner 上使用 Ubuntu 或 Debian。
如果您使用其他 Linux VPS，請對應調整套件。
關於一般 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑 (經驗豐富的操作者)

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. 克隆 OpenClaw 程式庫
4. 建立持續性主機目錄
5. 設定 `.env` 和 `docker-compose.yml`
6. 將所需的二進位檔案內建至映像檔中
7. `docker compose up -d`
8. 驗證持續性和 Gateway 存取

---

## 你需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 具備基本的 SSH + 複製/貼上操作能力
- 約 20 分鐘
- Docker 和 Docker Compose
- 模型驗證認證資訊
- 選用的提供商認證資訊
  - WhatsApp QR Code
  - Telegram 機器人權杖
  - Gmail OAuth

---

<Steps>
  <Step title="佈建 VPS">
    在 Hetzner 中建立 Ubuntu 或 Debian VPS。

    以 root 身分連線：

    ```exec
    ssh root@YOUR_VPS_IP
    ```

    本指南假設 VPS 是有狀態的。
    請勿將其視為可拋棄的基礎設施。

  </Step>

  <Step title="安裝 Docker（在 VPS 上）">
    ```exec
    apt-get update
    apt-get install -y git curl ca-certificates
    curl -fsSL https://get.docker.com | sh
    ```

    驗證：

    ```exec
    docker --version
    docker compose version
    ```

  </Step>

  <Step title="克隆 OpenClaw 儲存庫">
    ```exec
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假設您將建置自訂映像檔，以確保二進位檔的持續性。

  </Step>

  <Step title="建立持久化主機目錄">
    Docker 容器是暫時性的。
    所有長期存在的狀態都必須儲存在主機上。

    ```exec
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="設定環境變數">
    在儲存庫根目錄中建立 `.env`。

    ```exec
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=change-me-now
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=change-me-now
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    產生強祕鑰：

    ```exec
    openssl rand -hex 32
    ```

    **請勿提交此檔案。**

  </Step>

  <Step title="Docker Compose 配置">
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

    `--allow-unconfigured` 僅為了便於啟動，它不能取代適當的 Gateway 配置。仍須設定驗證（`gateway.auth.token` 或密碼），並對您的部署使用安全的綁定設定。

  </Step>

  <Step title="共用 Docker VM 執行階段步驟">
    使用共用執行階段指南了解一般的 Docker 主機流程：

    - [將所需的二進位檔案內建至映像檔中](/zh-Hant/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [建置與啟動](/zh-Hant/install/docker-vm-runtime#build-and-launch)
    - [什麼會保留在哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)
    - [更新](/zh-Hant/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 專用存取">
    在完成通用的建置與啟動步驟後，從您的筆記型電腦建立通道：

    ```exec
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    開啟：

    `http://127.0.0.1:18789/`

    貼上您的 gateway 權杖。

  </Step>
</Steps>

共用的持久化映射位於 [Docker VM Runtime](/zh-Hant/install/docker-vm-runtime#what-persists-where) 中。

## 基礎設施即程式碼

對於偏好基礎設施即程式碼工作流程的團隊，社群維護的 Terraform 設定提供：

- 模組化的 Terraform 設定，具備遠端狀態管理功能
- 透過 cloud-init 自動佈建
- 部署腳本（bootstrap、deploy、backup/restore）
- 安全加固（防火牆、UFW、僅限 SSH 存取）
- 用於 gateway 存取的 SSH 通道設定

**儲存庫：**

- 基礎設施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 設定：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法補充了上述 Docker 設定，提供可重現的部署、版本控制的基礎架構以及自動化災難恢復。

> **注意：** 由社群維護。如有問題或貢獻，請參閱上述儲存庫連結。

## 後續步驟

- 設定訊息頻道：[Channels](/zh-Hant/channels)
- 設定 Gateway：[Gateway configuration](/zh-Hant/gateway/configuration)
- 保持 OpenClaw 為最新狀態：[Updating](/zh-Hant/install/updating)
