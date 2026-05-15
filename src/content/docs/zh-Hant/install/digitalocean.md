---
summary: "在 DigitalOcean Droplet 上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

在 DigitalOcean Droplet 上執行持久化的 OpenClaw Gateway（1 GB 基礎方案約 $6/月）。

DigitalOcean 是最簡單的付費 VPS 方案。如果您偏好更便宜或免費的選項：

- [Hetzner](/zh-Hant/install/hetzner) — €3.79/月，每美元能獲得更多核心/RAM。
- [Oracle Cloud](/zh-Hant/install/oracle) — 永久免費 ARM（最高 4 個 OCPU，24 GB RAM），但註冊可能比較棘手且僅限 ARM。

## 先決條件

- DigitalOcean 帳戶（[註冊](https://cloud.digitalocean.com/registrations/new)）
- SSH 金鑰對（或願意使用密碼驗證）
- 大約 20 分鐘

## 設定

<Steps>
  <Step title="建立 Droplet">
    <Warning>
    請使用乾淨的基礎映像檔（Ubuntu 24.04 LTS）。避免使用第三方 Marketplace 的一鍵映像檔，除非您已審查其啟動腳本和防火牆預設值。
    </Warning>

    1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 點擊 **Create > Droplets**。
    3. 選擇：
       - **Region（區域）：** 離您最近
       - **Image（映像檔）：** Ubuntu 24.04 LTS
       - **Size（規格）：** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication（驗證）：** SSH 金鑰（推薦）或密碼
    4. 點擊 **Create Droplet** 並記下 IP 位址。

  </Step>

  <Step title="連線並安裝">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 24
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs

    # Install OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | bash

    # Create the non-root user that will own OpenClaw state and services.
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```

    僅將 root shell 用於系統引導。請以非 root `openclaw` 使用者身分執行 OpenClaw 指令，以便狀態儲存在 `/home/openclaw/.openclaw/` 下，並且 Gateway 會安裝為該使用者的 systemd 服務。

  </Step>

  <Step title="執行上手引導">
    ```bash
    openclaw onboard --install-daemon
    ```

    精靈會引導您完成模型驗證、頻道設定、Gateway Token 產生以及守護程式安裝（systemd）。

  </Step>

  <Step title="新增 Swap（建議用於 1 GB Droplets）">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="驗證 Gateway">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="存取控制介面">
    閘道預設繫結至 loopback。請選擇下列其中一個選項。

    **選項 A：SSH 通道（最簡單）**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    然後開啟 `http://localhost:18789`。

    **選項 B：Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sudo sh
    sudo tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    然後從您 tailnet 中的任何裝置開啟 `https://<magicdns>/`。

    Tailscale Serve 透過 tailnet 身分標頭驗證控制介面與 WebSocket 流量，這假設閘道主機本身是受信任的。無論如何，HTTP API 端點仍遵循閘道的正常驗證模式（token/密碼）。若要透過 Serve 要求明確的共享金鑰憑證，請設定 `gateway.auth.allowTailscale: false` 並使用 `gateway.auth.mode: "token"` 或 `"password"`。

    **選項 C：Tailnet 繫結（不使用 Serve）**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然後開啟 `http://<tailscale-ip>:18789`（需要 token）。

  </Step>
</Steps>

## 持久化與備份

OpenClaw 的狀態儲存於：

- `~/.openclaw/` — `openclaw.json`、各個代理程式的 `auth-profiles.json`、通道/提供者狀態以及工作階段資料。
- `~/.openclaw/workspace/` — 代理程式的工作區（SOUL.md、記憶、構件）。

這些資料在 Droplet 重新啟動後仍會保留。若要建立可攜式的快照：

```bash
openclaw backup create
```

DigitalOcean 快照會備份整個 Droplet；`openclaw backup create` 可在不同主機間移植。

## 1 GB RAM 小撇步

$6 的 Droplet 僅有 1 GB RAM。為了保持運作順暢：

- 請確保上述的 swap 步驟已寫入 `/etc/fstab`，以便在重新啟動後仍能保留。
- 優先選擇基於 API 的模型（Claude、GPT）而非本地模型——本地 LLM 推論無法在 1 GB 記憶體中運作。
- 如果您在大型提示詞時遇到 OOM（記憶體不足），請將 `agents.defaults.model.primary` 設定為較小的模型。
- 使用 `free -h` 與 `htop` 進行監控。

## 疑難排解

**閘道無法啟動** -- 請執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查日誌。

**連接埠已被佔用** -- 請執行 `lsof -i :18789` 找出程序，然後將其停止。

**記憶體不足** -- 請使用 `free -h` 驗證 swap 是否已啟用。如果仍然發生 OOM，請使用基於 API 的模型（Claude、GPT）而非本地模型，或是升級至 2 GB 的 Droplet。

## 下一步

- [頻道](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 等更多平台
- [Gateway 配置](/zh-Hant/gateway/configuration) -- 所有配置選項
- [更新](/zh-Hant/install/updating) -- 保持 OpenClaw 為最新版本

## 相關

- [安裝總覽](/zh-Hant/install)
- [Fly.io](/zh-Hant/install/fly)
- [Hetzner](/zh-Hant/install/hetzner)
- [VPS 主機](/zh-Hant/vps)
