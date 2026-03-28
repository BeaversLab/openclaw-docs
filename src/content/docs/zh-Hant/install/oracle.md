---
summary: "在 Oracle Cloud 的 Always Free ARM 層級上託管 OpenClaw"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

# Oracle Cloud

在 Oracle Cloud 的 **Always Free** ARM 層級（最高 4 個 OCPU、24 GB RAM、200 GB 儲存空間）上免費執行持續運作的 OpenClaw Gateway。

## 先決條件

- Oracle Cloud 帳戶（[註冊](https://www.oracle.com/cloud/free/)）——如果遇到問題，請參閱[社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帳戶（[tailscale.com](https://tailscale.com)免費提供）
- 一組 SSH 金鑰對
- 大約 30 分鐘

## 設定

<Steps>
  <Step title="建立 OCI 執行個體">
    1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)。
    2. 前往 **Compute > Instances > Create Instance**。
    3. 設定：
       - **Name:** `openclaw`
       - **Image:** Ubuntu 24.04 (aarch64)
       - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs:** 2 (最多可設為 4)
       - **Memory:** 12 GB (最多可設為 24 GB)
       - **Boot volume:** 50 GB (免費層上限為 200 GB)
       - **SSH key:** 新增您的公鑰
    4. 按一下 **Create** 並記下公用 IP 位址。

    <Tip>
    如果建立執行個體時因「Out of capacity」而失敗，請嘗試不同的可用性網域或稍後重試。免費層的容量有限。
    </Tip>

  </Step>

  <Step title="連接並更新系統">
    ```exec
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是編譯部分 ARM 依賴項所必需的。

  </Step>

  <Step title="配置使用者與主機名稱">
    ```exec
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    啟用 linger 可讓使用者在登出後繼續執行使用者服務。

  </Step>

  <Step title="安裝 Tailscale">
    ```exec
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    從現在開始，請透過 Tailscale 連線：`ssh ubuntu@openclaw`。

  </Step>

  <Step title="安裝 OpenClaw">
    ```exec
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    當出現提示「How do you want to hatch your bot?」時，請選取 **Do this later**。

  </Step>

  <Step title="設定閘道">
    結合 Tailscale Serve 使用權杖驗證，以進行安全的遠端存取。

    ```exec
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway
    ```

  </Step>

  <Step title="鎖定 VCN 安全性">
    在網路邊緣阻擋 Tailscale 以外的所有流量：

    1. 在 OCI 主控台前往 **Networking > Virtual Cloud Networks**。
    2. 按一下您的 VCN，然後前往 **Security Lists > Default Security List**。
    3. **移除** `0.0.0.0/0 UDP 41641` (Tailscale) 以外的所有輸入規則。
    4. 保留預設輸出規則 (允許所有輸出流量)。

    這會在網路邊緣阻擋連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有內容。從現在起，您只能透過 Tailscale 進行連線。

  </Step>

  <Step title="驗證">
    ```exec
    openclaw --version
    systemctl --user status openclaw-gateway
    tailscale serve status
    curl http://localhost:18789
    ```

    從您 tailnet 上的任何裝置存取控制 UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    將 `<tailnet-name>` 替換為您的 tailnet 名稱（可在 `tailscale status` 中看到）。

  </Step>
</Steps>

## 備用方案：SSH 隧道

如果 Tailscale Serve 無法運作，請從您的本機裝置使用 SSH 隧道：

```exec
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後開啟 `http://localhost:18789`。

## 疑難排解

**執行個體建立失敗（「容量不足」）** -- 免費層級 ARM 執行個體很熱門。請嘗試不同的可用性網域，或在離尖峰時段重試。

**Tailscale 無法連線** -- 執行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新進行驗證。

**Gateway 無法啟動** -- 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway -n 50` 檢查日誌。

**ARM 二進制檔問題** -- 大多數 npm 套件可在 ARM64 上運作。對於原生二進制檔，請尋找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 驗證架構。

## 下一步

- [頻道](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 等更多平台
- [Gateway 配置](/zh-Hant/gateway/configuration) -- 所有配置選項
- [更新](/zh-Hant/install/updating) -- 保持 OpenClaw 為最新版本
