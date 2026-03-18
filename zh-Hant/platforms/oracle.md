---
summary: "OpenClaw on Oracle Cloud (Always Free ARM)"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for low-cost VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

# OpenClaw on Oracle Cloud (OCI)

## 目標

在 Oracle Cloud 的 **Always Free** ARM 層級上運行持久化的 OpenClaw Gateway。

Oracle 的免費層級可能非常適合 OpenClaw（特別是如果您已經擁有 OCI 帳戶），但它也有一些取捨：

- ARM 架構（大多數東西都能運行，但某些二進位檔案可能僅限 x86）
- 容量和註冊可能會比較棘手

## 成本比較 (2026)

| 提供商       | 方案            | 規格                     | 價格/月 | 備註                 |
| ------------ | --------------- | ------------------------ | ------- | -------------------- |
| Oracle Cloud | Always Free ARM | 最多 4 個 OCPU，24GB RAM | $0      | ARM，容量有限        |
| Hetzner      | CX22            | 2 vCPU，4GB RAM          | ~ $4    | 最便宜的付費選項     |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM          | $6      | UI 簡單，文檔完善    |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM          | $6      | 多個地區             |
| Linode       | Nanode          | 1 vCPU，1GB RAM          | $5      | 現為 Akamai 的一部分 |

---

## 前置需求

- Oracle Cloud 帳戶 ([註冊](https://www.oracle.com/cloud/free/)) — 如果遇到問題，請參閱 [社群註冊指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帳戶（在 [tailscale.com](https://tailscale.com) 免費註冊）
- 約 30 分鐘

## 1) 建立 OCI 執行個體

1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 前往 **Compute → Instances → Create Instance**
3. 設定：
   - **名稱：** `openclaw`
   - **映像檔：** Ubuntu 24.04 (aarch64)
   - **形狀：** `VM.Standard.A1.Flex` (Ampere ARM)
   - **OCPUs：** 2（或最多 4 個）
   - **記憶體：** 12 GB（或最多 24 GB）
   - **開機磁碟區：** 50 GB（免費額度最多 200 GB）
   - **SSH 金鑰：** 新增您的公開金鑰
4. 點擊 **Create**
5. 記下公開 IP 位址

**提示：** 如果建立執行個體時失敗並顯示「Out of capacity」，請嘗試不同的可用性網域或稍後重試。免費層級的容量有限。

## 2) 連線並更新

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** 編譯部分相依項目的 ARM 版本需要 `build-essential`。

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

這將啟用 Tailscale SSH，因此您可以從 tailnet 上的任何裝置透過 `ssh openclaw` 進行連線 —— 無需公開 IP。

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

當提示「您要如何孵化您的機器人？」時，請選取 **「稍後再處理」**。

> 注意：如果您遇到 ARM 原生建置問題，請先從系統套件（例如 `sudo apt install -y build-essential`）開始，再嘗試使用 Homebrew。

## 6) 設定閘道（loopback + token auth）並啟用 Tailscale Serve

使用 token auth 作為預設值。這具有可預測性，且不需要任何「不安全認證」的控制 UI 旗標。

```bash
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway
```

## 7) 驗證

```bash
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789
```

## 8) 鎖定 VCN 安全性

現在一切運作正常，請鎖定 VCN 以阻擋 Tailscale 以外的所有流量。OCI 的虛擬雲端網路 (VCN) 充當網路邊緣的防火牆 —— 流量在到達您的執行個體之前就會被阻擋。

1. 在 OCI 主控台中前往 **Networking → Virtual Cloud Networks**
2. 點選您的 VCN → **Security Lists** → Default Security List
3. **移除**所有輸入規則，除了：
   - `0.0.0.0/0 UDP 41641` (Tailscale)
4. 保留預設的輸出規則（允許所有輸出流量）

這會在網路邊緣阻擋連接埠 22 上的 SSH、HTTP、HTTPS 以及其他所有內容。從現在開始，您只能透過 Tailscale 進行連線。

---

## 存取控制 UI

從您 Tailscale 網路上的任何裝置：

```
https://openclaw.<tailnet-name>.ts.net/
```

將 `<tailnet-name>` 替換為您的 tailnet 名稱（可在 `tailscale status` 中看到）。

不需要 SSH 通道。Tailscale 提供：

- HTTPS 加密（自動憑證）
- 透過 Tailscale 身份進行驗證
- 從您 tailnet 上的任何裝置存取（筆記型電腦、手機等）

---

## 安全性：VCN + Tailscale（建議的基準）

隨著 VCN 被鎖定（僅開放 UDP 41641）且閘道綁定至 loopback，您將獲得強大的縱深防禦：公開流量在網路邊緣被阻擋，且管理存取是透過您的 tailnet 進行的。

此設定通常消除了僅為了阻止互聯網範圍的 SSH 暴力破解而對額外主機型防火牆規則的 _需求_ —— 但您仍應保持 OS 更新，執行 `openclaw security audit`，並驗證您未意外監聽公開介面。

### 已受保護的項目

| 傳統步驟        | 是否需要？ | 原因                                                     |
| --------------- | ---------- | -------------------------------------------------------- |
| UFW 防火牆      | 否         | 流量到達執行個體前 VCN 即已阻擋                          |
| fail2ban        | 否         | 若在 VCN 阻擋連接埠 22 則無暴力破解                      |
| sshd 加固       | 否         | Tailscale SSH 不使用 sshd                                |
| 停用 root 登入  | 否         | Tailscale 使用 Tailscale 身份，而非系統使用者            |
| 僅 SSH 金鑰認證 | 否         | Tailscale 透過您的 tailnet 進行驗證                      |
| IPv6 加固       | 通常不需要 | 取決於您的 VCN/子網路設定；請驗證實際指派/暴露的內容為何 |

### 仍然建議

- **憑證權限：** `chmod 700 ~/.openclaw`
- **安全稽核：** `openclaw security audit`
- **系統更新：** 定期執行 `sudo apt update && sudo apt upgrade`
- **監控 Tailscale：** 在 [Tailscale 管理主控台](https://login.tailscale.com/admin) 中檢視裝置

### 驗證安全狀態

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## 備援方案：SSH 通道

如果 Tailscale Serve 無法運作，請使用 SSH 通道：

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然後開啟 `http://localhost:18789`。

---

## 疑難排解

### 建立執行個體失敗（「容量不足」）

免費層級 ARM 執行個體很受歡迎。請嘗試：

- 不同的可用性網域
- 在離峰時段重試（清晨）
- 選擇形狀 時使用「Always Free」篩選器

### Tailscale 無法連線

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
journalctl --user -u openclaw-gateway -n 50
```

### 無法存取控制介面 (UI)

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway
```

### ARM 二進位檔問題

部分工具可能沒有 ARM 版本。請檢查：

```bash
uname -m  # Should show aarch64
```

大多數 npm 套件都能正常運作。對於二進位檔，請尋找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久性

所有狀態都位於：

- `~/.openclaw/` — 設定、憑證、工作階段資料
- `~/.openclaw/workspace/` — 工作區 (SOUL.md、記憶、成品)

定期備份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## 參見

- [Gateway 遠端存取](/zh-Hant/gateway/remote) — 其他遠端存取模式
- [Tailscale 整合](/zh-Hant/gateway/tailscale) — 完整 Tailscale 文件
- [Gateway 設定](/zh-Hant/gateway/configuration) — 所有設定選項
- [DigitalOcean 指南](/zh-Hant/platforms/digitalocean) — 如果您需要付費 + 更簡單的註冊流程
- [Hetzner 指南](/zh-Hant/install/hetzner) — 基於 Docker 的替代方案

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
