---
summary: "在 DigitalOcean Droplet 上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean

在 DigitalOcean Droplet 上執行持久化的 OpenClaw Gateway。

## 先決條件

- DigitalOcean 帳戶（[註冊](https://cloud.digitalocean.com/registrations/new)）
- SSH 金鑰對（或願意使用密碼驗證）
- 大約 20 分鐘

## 設定

<Steps>
  <Step title="建立 Droplet">
    <Warning>
    使用乾淨的基底映像檔（Ubuntu 24.04 LTS）。除非您已審閱其啟動腳本和防火牆預設值，否則請避免使用第三方 Marketplace 一鍵映像檔。
    </Warning>

    1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 點擊 **Create > Droplets**。
    3. 選擇：
       - **Region：** 離您最近的區域
       - **Image：** Ubuntu 24.04 LTS
       - **Size：** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication：** SSH 金鑰（建議）或密碼
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
    openclaw --version
    ```

  </Step>

  <Step title="執行入門設定">
    ```bash
    openclaw onboard --install-daemon
    ```

    精靈會引導您完成模型驗證、通道設定、Gateway 權杖產生及常駐程式安裝（systemd）。

  </Step>

  <Step title="新增 swap（建議用於 1 GB Droplet）">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="驗證 gateway">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="存取控制 UI">
    Gateway 預設會綁定到 loopback。請選擇其中一個選項。

    **選項 A：SSH tunnel（最簡單）**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    然後開啟 `http://localhost:18789`。

    **選項 B：Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    然後從您 tailnet 上的任何裝置開啟 `https://<magicdns>/`。

    **選項 C：Tailnet bind（無 Serve）**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然後開啟 `http://<tailscale-ip>:18789`（需要權杖）。

  </Step>
</Steps>

## 疑難排解

**Gateway 無法啟動** -- 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查日誌。

**連接埠已被使用** -- 執行 `lsof -i :18789` 尋找程序，然後將其停止。

**記憶體不足** -- 使用 `free -h` 驗證 swap 是否已啟用。如果仍然遇到 OOM，請使用基於 API 的模型（Claude、GPT）而不是本地模型，或者升級到 2 GB 的 Droplet。

## 後續步驟

- [頻道](/en/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [Gateway 設定](/en/gateway/configuration) -- 所有設定選項
- [更新](/en/install/updating) -- 保持 OpenClaw 為最新版本
