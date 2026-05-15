---
summary: "在便宜的 Hetzner VPS (Docker) 上 24/7 執行 OpenClaw Gateway，具備持久狀態和內建二進位檔"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

## 目標

在 Hetzner VPS 上使用 Docker 執行持久化的 OpenClaw Gateway，具備持久狀態、內建二進位檔以及安全的重啟行為。

如果您想要「約 5 美元的 24/7 OpenClaw」，這是最簡單可靠的設定。
Hetzner 的價格可能會變動；請選擇最小的 Debian/Ubuntu VPS，如果遇到 OOM（記憶體不足）再進行擴充。

安全模式提醒：

- 當所有人都在相同的信任邊界內且執行時環境僅用於業務時，公司共用的代理程式是沒問題的。
- 保持嚴格的分離：專用的 VPS/執行時環境 + 專用帳戶；該主機上不得有個人的 Apple/Google/瀏覽器/密碼管理員設定檔。
- 如果使用者之間存在惡意對抗，請依 Gateway/主機/OS 使用者進行區隔。

請參閱[安全性](/zh-Hant/gateway/security)和 [VPS 託管](/zh-Hant/vps)。

## 我們在做什麼（簡單來說）？

- 租用一台小型 Linux 伺服器 (Hetzner VPS)
- 安裝 Docker (隔離的應用程式執行環境)
- 在 Docker 中啟動 OpenClaw Gateway
- 在主機上持久化 `~/.openclaw` + `~/.openclaw/workspace` (在重啟/重建後仍能存活)
- 透過 SSH 隧道從您的筆記型電腦存取控制 UI

該掛載的 `~/.openclaw` 狀態包含 `openclaw.json`、各代理程式的
`agents/<agentId>/agent/auth-profiles.json` 和 `.env`。

可以透過以下方式存取 Gateway：

- 從您的筆記型電腦進行 SSH 連線埠轉送
- 直接開放連線埠，如果您自行管理防火牆和權杖

本指南假設在 Hetzner 上使用 Ubuntu 或 Debian。
如果您使用其他 Linux VPS，請對應調整套件。
關於一般的 Docker 流程，請參閱 [Docker](/zh-Hant/install/docker)。

---

## 快速路徑 (有經驗的操作人員)

1. 佈建 Hetzner VPS
2. 安裝 Docker
3. 複製 OpenClaw 程式庫
4. 建立持久化主機目錄
5. 設定 `.env` 和 `docker-compose.yml`
6. 將所需的二進位檔製作到映像檔中
7. `docker compose up -d`
8. 驗證持久化和 Gateway 存取

---

## 您需要什麼

- 具有 root 存取權限的 Hetzner VPS
- 從您的筆記型電腦進行 SSH 存取
- 對 SSH + 複製/貼上有基本掌握
- 約 20 分鐘
- Docker 和 Docker Compose
- 模型驗證憑證
- 選用的提供者憑證
  - WhatsApp QR 碼
  - Telegram 機器人權杖
  - Gmail OAuth

---

<Steps>
  <Step title="佈建 VPS">
    在 Hetzner 中建立 Ubuntu 或 Debian VPS。

    以 root 身份連線：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假設 VPS 是有狀態的。
    請勿將其視為可拋棄的基礎設施。

  </Step>

  <Step title="安裝 Docker（在 VPS 上）">
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

  <Step title="Clone OpenClaw 程式庫">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假設您將建構自訂映像檔以保證二進位檔的持久性。

  </Step>

  <Step title="建立持久化的主機目錄">
    Docker 容器是暫時性的。
    所有長期存在的狀態都必須儲存在主機上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="設定環境變數">
    在程式庫根目錄中建立 `.env`。

    ```bash
    OPENCLAW_IMAGE=openclaw:latest
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    當您想要透過 `.env` 管理穩定的閘道權杖時，請設定 `OPENCLAW_GATEWAY_TOKEN`；否則在依賴跨重新啟動的用戶端之前，請先設定 `gateway.auth.token`。如果這兩個來源都不存在，OpenClaw 將在該次啟動時使用僅限執行時期的權杖。產生一個金鑰圈密碼並將其貼上到 `GOG_KEYRING_PASSWORD` 中：

    ```bash
    openssl rand -hex 32
    ```

    **請勿提交此檔案。**

    這個 `.env` 檔案是用於容器/執行時期環境變數，例如 `OPENCLAW_GATEWAY_TOKEN`。
    儲存的提供者 OAuth/API 金鑰驗證位於已掛載的 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

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

    `--allow-unconfigured` 僅為了啟動便利性，它並非適當閘道設定的替代品。仍需設定驗證（`gateway.auth.token` 或密碼），並針對您的部署使用安全的綁定設定。

  </Step>

  <Step title="共用 Docker VM 執行時步驟">
    使用共用執行時指南來了解通用的 Docker 主機流程：

    - [將所需的二進位檔案內建至映像檔中](/zh-Hant/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [建置與啟動](/zh-Hant/install/docker-vm-runtime#build-and-launch)
    - [什麼東西會保存在哪裡](/zh-Hant/install/docker-vm-runtime#what-persists-where)
    - [更新](/zh-Hant/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 專屬存取">
    在完成共用的建置與啟動步驟後，請完成以下設定以開啟通道：

    **先決條件：** 確保您的 VPS sshd 設定允許 TCP 轉發。如果您
    已經強化過 SSH 設定，請檢查 `/etc/ssh/sshd_config` 並設定為：

    ```
    AllowTcpForwarding local
    ```

    `local` 允許來自您筆記型電腦的 `ssh -L` 本機轉發，同時阻擋
    來自伺服器的遠端轉發。將其設定為 `no` 將會導致通道
    失敗，並顯示：
    `channel 3: open failed: administratively prohibited: open failed`

    確認已啟用 TCP 轉發後，請重新啟動 SSH 服務
    (`systemctl restart ssh`) 並從您的筆記型電腦執行通道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    開啟：

    `http://127.0.0.1:18789/`

    貼上已設定的共用金鑰。本指南預設使用 Gateway Token；
    如果您切換為密碼驗證，請改用該密碼。

  </Step>
</Steps>

共用的持久性對應圖位於 [Docker VM Runtime](/zh-Hant/install/docker-vm-runtime#what-persists-where) 中。

## 基礎設施即程式碼

對於偏好基礎設施即程式碼 工作流程的團隊，社群維護的 Terraform 設定提供了：

- 模組化的 Terraform 設定，具備遠端狀態管理
- 透過 cloud-init 進行自動化佈建
- 部署指令碼 (bootstrap、deploy、backup/restore)
- 安全性強化 (防火牆、UFW、僅限 SSH 存取)
- 用於 Gateway 存取的 SSH 通道設定

**儲存庫：**

- 基礎設施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 設定：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法透過可重現的部署、受版本控制的基礎設施，以及自動化災難還原，補充了上述的 Docker 設定。

<Note>社群維護。如有問題或貢獻，請參閱上方的儲存庫連結。</Note>

## 後續步驟

- 設定訊息頻道：[頻道](/zh-Hant/channels)
- 設定 Gateway：[Gateway 組態](/zh-Hant/gateway/configuration)
- 保持 OpenClaw 更新：[更新](/zh-Hant/install/updating)

## 相關

- [安裝總覽](/zh-Hant/install)
- [Fly.io](/zh-Hant/install/fly)
- [Docker](/zh-Hant/install/docker)
- [VPS 託管](/zh-Hant/vps)
