---
summary: "在 DigitalOcean Droplet 上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean

在 DigitalOcean Droplet 上執行持續運作的 OpenClaw Gateway。

## 先決條件

- DigitalOcean 帳號（[註冊](https://cloud.digitalocean.com/registrations/new)）
- SSH 金鑰對（或願意使用密碼驗證）
- 大約 20 分鐘

## 設置

<Steps>
  <Step title="建立 Droplet">
    <Warning>
    使用乾淨的基礎映像檔 (Ubuntu 24.04 LTS)。除非您已審閱其啟動腳本與防火牆預設值，否則請避免使用第三方市集的一鍵映像檔。
    </Warning>

    1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 點擊 **Create > Droplets**。
    3. 選擇：
       - **Region:** 離您最近的區域
       - **Image:** Ubuntu 24.04 LTS
       - **Size:** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication:** SSH 金鑰 (推薦) 或密碼
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

  <Step title="執行上架精靈">
    ```bash
    openclaw onboard --install-daemon
    ```

    此精靈會引導您完成模型驗證、通道設定、閘道權杖產生及常駐程式安裝 (systemd)。

  </Step>

  <Step title="新增 swap (建議用於 1 GB Droplets)">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="驗證閘道">
  ```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u
  openclaw-gateway.service -f ```
</Step>

  <Step title="存取控制 UI">
    閘道預設會綁定到 loopback。請選擇以下其中一個選項。

    **選項 A：SSH 通道 (最簡單)**

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

    然後從你 tailnet 上的任何裝置開啟 `https://<magicdns>/`。

    **選項 C：Tailnet 綁定 (不使用 Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然後開啟 `http://<tailscale-ip>:18789` (需要 token)。

  </Step>
</Steps>

## 疑難排解

**閘道無法啟動** -- 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查紀錄檔。

**連接埠已被佔用** -- 執行 `lsof -i :18789` 尋找程序，然後將其停止。

**記憶體不足** -- 使用 `free -h` 驗證 swap 是否已啟用。如果仍然遇到 OOM，請使用基於 API 的模型（Claude、GPT）而非本地模型，或升級至 2 GB Droplet。

## 下一步

- [頻道](/en/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [閘道器設定](/en/gateway/configuration) -- 所有設定選項
- [更新](/en/install/updating) -- 保持 OpenClaw 為最新狀態

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
