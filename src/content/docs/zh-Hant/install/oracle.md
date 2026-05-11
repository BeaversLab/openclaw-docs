---
summary: "在 Oracle Cloud 的 Always Free ARM 層級上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

在 Oracle Cloud 的 **Always Free** ARM 層級上執行永續的 OpenClaw Gateway（最高 4 個 OCPU、24 GB RAM、200 GB 儲存空間），完全免費。

## 先決條件

- Oracle Cloud 帳戶（[註冊](https://www.oracle.com/cloud/free/)）——如果遇到問題，請參閱[社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帳戶（在 [tailscale.com](https://tailscale.com) 免費註冊）
- 一組 SSH 金鑰對
- 大約 30 分鐘

## 設定

<Steps>
  <Step title="建立 OCI 執行個體">
    1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)。
    2. 瀏覽至 **Compute > Instances > Create Instance**。
    3. 設定：
       - **Name:** `openclaw`
       - **Image:** Ubuntu 24.04 (aarch64)
       - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs:** 2 (或最高 4 個)
       - **Memory:** 12 GB (或最高 24 GB)
       - **Boot volume:** 50 GB (最高 200 GB 免費)
       - **SSH key:** 新增您的公開金鑰
    4. 按一下 **Create** 並記下公開 IP 位址。

    <Tip>
    如果建立執行個體時失敗並顯示 "Out of capacity"，請嘗試不同的可用性網域或稍後重試。免費層級的容量有限。
    </Tip>

  </Step>

  <Step title="連線並更新系統">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是編譯部分相依性 ARM 版本所必需的。

  </Step>

  <Step title="設定使用者與主機名稱">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    啟用 linger 可讓使用者服務在登出後繼續執行。

  </Step>

  <Step title="安裝 Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    從現在起，請透過 Tailscale 連線：`ssh ubuntu@openclaw`。

  </Step>

  <Step title="安裝 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    當系統提示 "How do you want to hatch your bot?" 時，請選擇 **Do this later**。

  </Step>

  <Step title="設定閘道">
    結合 Tailscale Serve 使用 Token 認證以進行安全的遠端存取。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    此處的 `gateway.trustedProxies=["127.0.0.1"]` 僅供本機 Tailscale Serve Proxy 的轉送 IP/本機客戶端處理使用。這**並不是** `gateway.auth.mode: "trusted-proxy"`。在此設定中，Diff viewer 路由保持失敗關閉 的行為：沒有轉送 Proxy 標頭的原始 `127.0.0.1` viewer 請求可能會回傳 `Diff not found`。請使用 `mode=file` / `mode=both` 處理附件，或者如果您需要可分享的 viewer 連結，請刻意啟用遠端 viewer 並設定 `plugins.entries.diffs.config.viewerBaseUrl` (或傳遞 proxy `baseUrl`)。

  </Step>

  <Step title="鎖定 VCN 安全性">
    在網路邊緣封鎖 Tailscale 以外的所有流量：

    1. 前往 OCI 主控台中的 **Networking > Virtual Cloud Networks**。
    2. 點擊您的 VCN，然後點擊 **Security Lists > Default Security List**。
    3. **移除** `0.0.0.0/0 UDP 41641` (Tailscale) 以外的所有入口規則。
    4. 保留預設的出口規則 (允許所有傳出流量)。

    這會在網路邊緣封鎖連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有內容。從現在起，您只能透過 Tailscale 進行連線。

  </Step>

  <Step title="驗證">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    從您 tailnet 上的任何裝置存取 Control UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    將 `<tailnet-name>` 替換為您的 tailnet 名稱 (可在 `tailscale status` 中看到)。

  </Step>
</Steps>

## 備案：SSH 通道

如果 Tailscale Serve 無法運作，請從您的本機機器使用 SSH 通道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後開啟 `http://localhost:18789`。

## 疑難排解

**建立執行個體失敗 (「Out of capacity」)** -- 免費層級 ARM 執行個體很受歡迎。請嘗試不同的可用性網域 或在離峰時間重試。

**Tailscale 無法連線** -- 執行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新進行驗證。

**閘道無法啟動** -- 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查紀錄檔。

**ARM 二進位檔案問題** -- 大多數 npm 套件適用於 ARM64。對於原生二進位檔案，請尋找 `linux-arm64` 或 `aarch64` 版本。請使用 `uname -m` 驗證架構。

## 下一步

- [頻道]/en/channels -- 連接 Telegram、WhatsApp、Discord 及更多
- [Gateway 設定]/en/gateway/configuration -- 所有設定選項
- [更新]/en/install/updating -- 保持 OpenClaw 為最新狀態

## 相關

- [安裝總覽]/en/install
- [GCP]/en/install/gcp
- [VPS 託管]/en/vps
