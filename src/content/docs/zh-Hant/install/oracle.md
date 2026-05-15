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

- Oracle Cloud 帳戶 ([註冊](https://www.oracle.com/cloud/free/)) -- 如果遇到問題，請參閱[社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
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
       - **OCPUs:** 2 (或最多 4)
       - **Memory:** 12 GB (或最多 24 GB)
       - **Boot volume:** 50 GB (最多 200 GB 免費)
       - **SSH key:** 新增您的公鑰
    4. 按一下 **Create** 並記下公用 IP 位址。

    <Tip>
    如果建立執行個體時失敗並顯示「Out of capacity」，請嘗試不同的可用性網域或稍後重試。免費層級的容量有限。
    </Tip>

  </Step>

  <Step title="連線並更新系統">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是編譯部分相依套件 ARM 版本所必需的。

  </Step>

  <Step title="設定使用者與主機名稱">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    啟用 linger 可讓使用者在登出後繼續執行服務。

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
    使用 Token 認證搭配 Tailscale Serve 以進行安全的遠端存取。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    這裡的 `gateway.trustedProxies=["127.0.0.1"]` 僅供本機 Tailscale Serve 代理程式的轉送 IP / 本機用戶端處理使用。這**不是** `gateway.auth.mode: "trusted-proxy"`。在此設定中，差異檢視器路由會保持「封閉時失敗」的行為：沒有轉送代理標頭的原始 `127.0.0.1` 檢視器請求可能會傳回 `Diff not found`。請使用 `mode=file` / `mode=both` 來處理附件，或者如果您需要可分享的檢視器連結，請刻意啟用遠端檢視器並設定 `plugins.entries.diffs.config.viewerBaseUrl`（或傳遞代理 `baseUrl`）。

  </Step>

  <Step title="鎖定 VCN 安全性">
    在網路邊緣阻擋所有 Tailscale 以外的流量：

    1. 在 OCI Console 中前往 **Networking > Virtual Cloud Networks**。
    2. 按一下您的 VCN，然後前往 **Security Lists > Default Security List**。
    3. **移除** `0.0.0.0/0 UDP 41641` (Tailscale) 以外的所有輸入規則。
    4. 保留預設的輸出規則（允許所有連出流量）。

    這會在網路邊緣阻擋連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有內容。從此刻起，您只能透過 Tailscale 進行連線。

  </Step>

  <Step title="驗證">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    從您 tailnet 上的任何裝置存取控制 UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    將 `<tailnet-name>` 取換為您的 tailnet 名稱（可在 `tailscale status` 中看見）。

  </Step>
</Steps>

## 驗證安全狀態

由於 VCN 已鎖定（僅開放 UDP 41641）且閘道已繫結至 loopback，公開流量會在網路邊緣被阻擋，且管理員存取僅限於 tailnet。這消除了對於幾項傳統 VPS 加固步驟的需求：

| 傳統步驟          | 需要嗎？ | 原因                                                    |
| ----------------- | -------- | ------------------------------------------------------- |
| UFW 防火牆        | 不需要   | VCN 會在流量到達執行個體之前進行阻擋。                  |
| fail2ban          | 不需要   | 連接埠 22 已在 VCN 層級被封鎖；沒有暴力破解的攻擊面。   |
| sshd 加固         | 不需要   | Tailscale SSH 不使用 sshd。                             |
| 停用 root 登入    | 不需要   | Tailscale 是透過 tailnet 身份進行驗證，而非系統使用者。 |
| 僅限 SSH 金鑰驗證 | 不需要   | 相同 — tailnet 身份取代系統 SSH 金鑰。                  |
| IPv6 加固         | 通常不   | 取決於 VCN/子網路設定；驗證實際指派/暴露的內容。        |

仍然建議：

- `chmod 700 ~/.openclaw` 以限制憑證檔案權限。
- `openclaw security audit` 以進行 OpenClaw 專用的姿態檢查。
- 定期執行 `sudo apt update && sudo apt upgrade` 以更新 OS 修補程式。
- 定期在 [Tailscale 管理主控台](https://login.tailscale.com/admin) 中檢閱裝置。

快速驗證指令：

```bash
# Confirm no public ports are listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely once Tailscale SSH is confirmed working
sudo systemctl disable --now ssh
```

## ARM 註記

Always Free 層級為 ARM (`aarch64`)。大部分 OpenClaw 功能運作正常；少數原生二進位檔案需要 ARM 建置版本：

- Node.js、Telegram、WhatsApp (Baileys)：純 JavaScript，沒有問題。
- 大多數包含原生程式碼的 npm 套件：有預先建置的 `linux-arm64` 檔案可用。
- 選用 CLI 輔助工具 (例如技能隨附的 Go/Rust 二進位檔案)：安裝前請檢查是否有 `aarch64` / `linux-arm64` 版本。

使用 `uname -m` 驗證架構 (應印出 `aarch64`)。對於沒有 ARM 建置版本的二進位檔案，請從原始碼安裝或跳過它們。

## 持久性與備份

OpenClaw 狀態位於：

- `~/.openclaw/` — `openclaw.json`、個別代理程式的 `auth-profiles.json`、通道/提供者狀態以及工作階段資料。
- `~/.openclaw/workspace/` — 代理程式工作區 (SOUL.md、記憶、成品)。

這些在重新開機後會保留。若要建立可攜式快照：

```bash
openclaw backup create
```

## 備援方案：SSH 通道

如果 Tailscale Serve 無法運作，請從您的本機機器使用 SSH 通道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後開啟 `http://localhost:18789`。

## 疑難排解

**執行個體建立失敗 (「容量不足」)** — 免費層級 ARM 執行個體很受歡迎。請嘗試不同的可用性網域或在離峰時段重試。

**Tailscale 無法連線** — 執行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新驗證。

**Gateway 無法啟動** — 執行 `openclaw doctor --non-interactive` 並使用 `journalctl --user -u openclaw-gateway.service -n 50` 檢查紀錄檔。

**ARM 二進位檔案問題** -- 大多數 npm 套件可在 ARM64 上運作。對於原生二進位檔案，請尋找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 驗證架構。

## 下一步

- [頻道](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 及更多
- [Gateway 配置](/zh-Hant/gateway/configuration) -- 所有配置選項
- [更新](/zh-Hant/install/updating) -- 保持 OpenClaw 為最新狀態

## 相關

- [安裝概覽](/zh-Hant/install)
- [GCP](/zh-Hant/install/gcp)
- [VPS 託管](/zh-Hant/vps)
