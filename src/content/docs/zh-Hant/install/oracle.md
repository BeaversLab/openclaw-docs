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

- Oracle Cloud 帳戶 ([註冊](https://www.oracle.com/cloud/free/)) —— 如果遇到問題，請參閱 [社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帳戶（於 [tailscale.com](https://tailscale.com) 免費註冊）
- 一組 SSH 金鑰對
- 約 30 分鐘

## 設定

<Steps>
  <Step title="建立 OCI 執行個體">
    1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)。
    2. 前往 **Compute > Instances > Create Instance**。
    3. 設定：
       - **Name：** `openclaw`
       - **Image：** Ubuntu 24.04 (aarch64)
       - **Shape：** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs：** 2（或最高 4）
       - **Memory：** 12 GB（或最高 24 GB）
       - **Boot volume：** 50 GB（最高 200 GB 免費）
       - **SSH key：** 新增您的公開金鑰
    4. 按一下 **Create** 並記下公用 IP 位址。

    <Tip>
    如果建立執行個體時因「容量不足」而失敗，請嘗試不同的可用性網域或稍後重試。免費層級的容量有限。
    </Tip>

  </Step>

  <Step title="連線並更新系統">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    編譯部分相依項目的 ARM 版本時需要 `build-essential`。

  </Step>

  <Step title="設定使用者與主機名稱">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    啟用 linger 可讓使用者服務在登出後繼續運作。

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

    當系統提示「How do you want to hatch your bot?」時，請選擇 **Do this later**。

  </Step>

  <Step title="設定閘道">
    搭配 Tailscale Serve 使用權杖驗證以進行安全的遠端存取。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    此處的 `gateway.trustedProxies=["127.0.0.1"]` 僅供本機 Tailscale Serve 代理程式的轉送 IP/本機用戶端處理使用。這**並非** `gateway.auth.mode: "trusted-proxy"`。在此設定中，差異檢視器路由會保持失敗關閉 行為：沒有轉送代理程式標頭的原始 `127.0.0.1` 檢視器請求可能會傳回 `Diff not found`。請使用 `mode=file` / `mode=both` 來處理附件，或者如果您需要可分享的檢視器連結，請刻意啟用遠端檢視器並設定 `plugins.entries.diffs.config.viewerBaseUrl`（或傳遞代理程式 `baseUrl`）。

  </Step>

  <Step title="鎖定 VCN 安全性">
    在網路邊緣阻擋 Tailscale 以外的所有流量：

    1. 在 OCI Console 中前往 **Networking > Virtual Cloud Networks**。
    2. 按一下您的 VCN，然後按一下 **Security Lists > Default Security List**。
    3. **移除** 除了 `0.0.0.0/0 UDP 41641` (Tailscale) 以外的所有輸入規則。
    4. 保留預設輸出規則（允許所有輸出流量）。

    這會在網路邊緣阻擋連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有項目。從現在開始，您只能透過 Tailscale 進行連線。

  </Step>

  <Step title="驗證">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    從您 tailnet 上的任何設備存取控制 UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    將 `<tailnet-name>` 替換為您的 tailnet 名稱（可在 `tailscale status` 中查看）。

  </Step>
</Steps>

## 備用方案：SSH 隧道

如果 Tailscale Serve 無法運作，請從您的本機機器使用 SSH 隧道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後打開 `http://localhost:18789`。

## 疑難排解

**建立執行個體失敗 ("Out of capacity")** -- 免費層級 ARM 執行個體很受歡迎。請嘗試不同的可用性網域，或於離峰時間重試。

**Tailscale 無法連線** -- 執行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新驗證。

**Gateway 無法啟動** -- 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查日誌。

**ARM 二進位檔問題** -- 大多數 npm 套件可在 ARM64 上運作。對於原生二進位檔，請尋找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 驗證架構。

## 下一步

- [頻道](/en/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [Gateway 設定](/en/gateway/configuration) -- 所有設定選項
- [更新](/en/install/updating) -- 讓 OpenClaw 保持最新狀態
