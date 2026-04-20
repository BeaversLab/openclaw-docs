---
summary: "在 Oracle Cloud 上部署 OpenClaw (Always Free ARM)"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for low-cost VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud (Platform)"
---

# 在 Oracle Cloud (OCI) 上部署 OpenClaw

## 目標

在 Oracle Cloud 的 **Always Free** ARM 層級上運行一個持久的 OpenClaw 閘道。

Oracle 的免費層非常適合 OpenClaw（特別是如果您已經擁有 OCI 帳戶），但它也有一些取捨：

- ARM 架構（大多數情況下可以運作，但某些二進位檔案可能僅限 x86）
- 容量和註冊可能會比較棘手

## 成本比較 (2026)

| 提供商       | 方案            | 規格                     | 月費 | 備註                 |
| ------------ | --------------- | ------------------------ | ---- | -------------------- |
| Oracle Cloud | Always Free ARM | 最多 4 個 OCPU，24GB RAM | $0   | ARM，容量有限        |
| Hetzner      | CX22            | 2 vCPU，4GB RAM          | ~ $4 | 最便宜的付費選項     |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM          | $6   | UI 簡單，文件完善    |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM          | $6   | 機房位置多           |
| Linode       | Nanode          | 1 vCPU，1GB RAM          | $5   | 現為 Akamai 的一部分 |

---

## 先決條件

- Oracle Cloud 帳戶 ([註冊](https://www.oracle.com/cloud/free/)) — 如果遇到問題，請參閱 [社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帳戶（於 [tailscale.com](https://tailscale.com) 免費註冊）
- 約 30 分鐘

## 1) 建立 OCI 執行個體

1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 前往 **Compute → Instances → Create Instance**
3. 設定：
   - **名稱：** `openclaw`
   - **映像檔：** Ubuntu 24.04 (aarch64)
   - **Shape：** `VM.Standard.A1.Flex` (Ampere ARM)
   - **OCPUs：** 2（或最多 4 個）
   - **記憶體：** 12 GB（或最多 24 GB）
   - **開機磁碟區：** 50 GB（最多 200 GB 免費）
   - **SSH 金鑰：** 新增您的公開金鑰
4. 點擊 **Create**
5. 記下公用 IP 位址

**提示：** 如果建立執行個體失敗並顯示 "Out of capacity"，請嘗試不同的可用性網域或稍後重試。免費層的容量有限。

## 2) 連線並更新

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** 部分相依套件的 ARM 編譯需要 `build-essential`。

## 3) 設定使用者與主機名稱

```bash
# Set hostname
sudo hostnamectl set-hostname openclaw

# Set password for ubuntu user
sudo passwd ubuntu

# Enable lingering (keeps user services running after logout)
sudo loginctl enable-linger ubuntu
```

## 4) 安裝 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

這會啟用 Tailscale SSH，因此您可以從 tailnet 中的任何裝置透過 `ssh openclaw` 連線——不需要公用 IP。

驗證：

```bash
tailscale status
```

**從現在開始，透過 Tailscale 連線：** `ssh ubuntu@openclaw`（或使用 Tailscale IP）。

## 5) 安裝 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

當被提示「您想如何孵化您的機器人？」時，請選擇 **「稍後再做」**。

> 注意：如果您遇到 ARM 原生建置問題，請先嘗試系統套件（例如 `sudo apt install -y build-essential`），再使用 Homebrew。

## 6) 設定 Gateway (loopback + token auth) 並啟用 Tailscale Serve

預設使用 token auth。這樣做可預期，且無需任何「不安全認證」的 Control UI 標誌。

```bash
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway.service
```

這裡的 `gateway.trustedProxies=["127.0.0.1"]` 僅用於本機 Tailscale Serve Proxy 的轉發 IP/本機用戶端處理。它**不是** `gateway.auth.mode: "trusted-proxy"`。在此設定中，差異檢視器路由保持故障關閉行為：沒有轉發 Proxy 標頭的原始 `127.0.0.1` 檢視器請求可能會傳回 `Diff not found`。請使用 `mode=file` / `mode=both` 來存取附件，或者如果您需要可分享的檢視器連結，請刻意啟用遠端檢視器並設定 `plugins.entries.diffs.config.viewerBaseUrl`（或傳遞 Proxy `baseUrl`）。

## 7) 驗證

```bash
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway.service

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789
```

## 8) 鎖定 VCN 安全性

現在一切運作正常，鎖定 VCN 以阻擋 Tailscale 以外的所有流量。OCI 的虛擬雲端網路 (Virtual Cloud Network) 充當網路邊緣的防火牆 —— 流量在到達您的實例之前就會被阻擋。

1. 在 OCI Console 中前往 **Networking → Virtual Cloud Networks**
2. 點擊您的 VCN → **Security Lists** → Default Security List
3. **移除** 除了以下項目之外的所有輸入規則：
   - `0.0.0.0/0 UDP 41641` (Tailscale)
4. 保留預設的輸出規則（允許所有出站流量）

這會在網路邊緣阻擋連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有內容。從現在開始，您只能透過 Tailscale 進行連線。

---

## 存取控制 UI

從您 Tailscale 網路上的任何裝置：

```
https://openclaw.<tailnet-name>.ts.net/
```

將 `<tailnet-name>` 替換為您的 tailnet 名稱（可在 `tailscale status` 中查看）。

不需要 SSH tunnel。Tailscale 提供：

- HTTPS 加密（自動憑證）
- 透過 Tailscale 身份進行驗證
- 從您 tailnet 上的任何裝置（筆記型電腦、手機等）進行存取

---

## 安全性：VCN + Tailscale（建議的基準）

隨著 VCN 被鎖定（僅開放 UDP 41641）並且 Gateway 綁定到 loopback，您將獲得強大的縱深防禦：公開流量在網路邊緣被阻擋，而管理存取則在您的 tailnet 上進行。

此設置通常消除了僅為阻止互聯網範圍內的 SSH 暴力破解而對額外基於主機的防火牆規則的*需求*——但您仍應保持操作系統更新，運行 `openclaw security audit`，並驗證您是否未意外監聽公共接口。

### 已受保護

| 傳統步驟            | 需要？     | 原因                                             |
| ------------------- | ---------- | ------------------------------------------------ |
| UFW 防火牆          | 否         | VCN 在流量到達實例之前進行阻擋                   |
| fail2ban            | 否         | 如果在 VCN 處阻擋了端口 22，則不會有暴力破解     |
| sshd 加固           | 否         | Tailscale SSH 不使用 sshd                        |
| 禁用 root 登錄      | 否         | Tailscale 使用 Tailscale 身份，而非系統用戶      |
| 僅 SSH 密鑰身份驗證 | 否         | Tailscale 通過您的 tailnet 進行身份驗證          |
| IPv6 加固           | 通常不需要 | 取決於您的 VCN/子網設置；驗證實際分配/暴露的內容 |

### 仍然建議

- **憑證權限：** `chmod 700 ~/.openclaw`
- **安全審計：** `openclaw security audit`
- **系統更新：** 定期 `sudo apt update && sudo apt upgrade`
- **監控 Tailscale：** 在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 中查看設備

### 驗證安全姿態

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## 後備方案：SSH 隧道

如果 Tailscale Serve 無法工作，請使用 SSH 隧道：

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後打開 `http://localhost:18789`。

---

## 故障排除

### 實例創建失敗（「容量不足」）

免費層 ARM 實例很受歡迎。請嘗試：

- 不同的可用性域
- 在非高峰時段重試（清晨）
- 選擇形狀時使用「Always Free」篩選器

### Tailscale 無法連接

```bash
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway 無法啟動

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway.service -n 50
```

### 無法到達控制 UI

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway.service
```

### ARM 二進製文件問題

某些工具可能沒有 ARM 版本。請檢查：

```bash
uname -m  # Should show aarch64
```

大多數 npm 包都可以正常工作。對於二進製文件，請尋找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久性

所有狀態位於：

- `~/.openclaw/` — `openclaw.json`，每個代理的 `auth-profiles.json`，通道/提供程序狀態以及會話數據
- `~/.openclaw/workspace/` — 工作區 (SOUL.md，記憶，工件)

定期備份：

```bash
openclaw backup create
```

---

## 參見

- [Gateway 遠程訪問](/zh-Hant/gateway/remote) — 其他遠程訪問模式
- [Tailscale 集成](/zh-Hant/gateway/tailscale) — 完整的 Tailscale 文檔
- [Gateway 配置](/zh-Hant/gateway/configuration) — 所有配置選項
- [DigitalOcean 指南](/zh-Hant/platforms/digitalocean) — 如果您想要付費且註冊更容易
- [Hetzner 指南](/zh-Hant/install/hetzner) — 基於 Docker 的替代方案
