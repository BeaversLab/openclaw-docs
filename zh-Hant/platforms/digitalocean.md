---
summary: "DigitalOcean 上的 OpenClaw（簡單付費 VPS 選項）"
read_when:
  - 在 DigitalOcean 上設置 OpenClaw
  - 尋找 OpenClaw 的便宜 VPS 主機
title: "DigitalOcean"
---

# DigitalOcean 上的 OpenClaw

## 目標

在 DigitalOcean 上運行持久化的 OpenClaw Gateway，費用為 **$6/月**（或使用預留價格 $4/月）。

如果您想要 $0/月的選項並且不介意 ARM 和特定供應商的設置，請參閱 [Oracle Cloud 指南](/zh-Hant/platforms/oracle)。

## 成本比較 (2026)

| 供應商       | 方案            | 規格                     | 月費        | 備註                     |
| ------------ | --------------- | ------------------------ | ----------- | ------------------------ |
| Oracle Cloud | Always Free ARM | 高達 4 個 OCPU，24GB RAM | $0          | ARM，容量有限 / 註冊異常 |
| Hetzner      | CX22            | 2 vCPU，4GB RAM          | €3.79 (~$4) | 最便宜的付費選項         |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM          | $6          | 簡單的 UI，完善的文件    |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM          | $6          | 多個位置                 |
| Linode       | Nanode          | 1 vCPU，1GB RAM          | $5          | 現為 Akamai 的一部分     |

**選擇供應商：**

- DigitalOcean：最簡單的 UX + 可預期的設置（本指南）
- Hetzner：高性價比（參閱 [Hetzner 指南](/zh-Hant/install/hetzner)）
- Oracle Cloud：可以 $0/月 使用，但較為挑剔且僅限 ARM（參閱 [Oracle 指南](/zh-Hant/platforms/oracle)）

---

## 先決條件

- DigitalOcean 帳戶（[註冊獲得 $200 免費額度](https://m.do.co/c/signup)）
- SSH 金鑰對（或願意使用密碼驗證）
- 約 20 分鐘

## 1) 建立 Droplet

<Warning>
  使用乾淨的基礎映像檔 (Ubuntu 24.04
  LTS)。除非您已審查其啟動腳本和防火牆預設值，否則請避免使用第三方 Marketplace 一鍵映像檔。
</Warning>

1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)
2. 點擊 **Create → Droplets**
3. 選擇：
   - **Region：** 離您最近（或您的使用者）的區域
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/mo** (1 vCPU, 1GB RAM, 25GB SSD)
   - **Authentication：** SSH 金鑰（建議）或密碼
4. 點擊 **Create Droplet**
5. 記下 IP 位址

## 2) 透過 SSH 連線

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) 安裝 OpenClaw

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version
```

## 4) 執行 Onboarding

```bash
openclaw onboard --install-daemon
```

精靈會引導您完成以下步驟：

- Model auth (API 金鑰或 OAuth)
- Channel 設定 (Telegram、WhatsApp、Discord 等)
- Gateway 權杖 (自動產生)
- Daemon 安裝 (systemd)

## 5) 驗證 Gateway

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) 存取 Dashboard

Gateway 預設綁定至 loopback。若要存取 Control UI：

**選項 A：SSH Tunnel (建議)**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**選項 B：Tailscale Serve (HTTPS，僅限 loopback)**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

開啟：`https://<magicdns>/`

註記：

- Serve 保持僅限 Gateway 本地回環（loopback-only），並透過 Tailscale 身分標頭驗證控制 UI/WebSocket 流量（無 Token 驗證假定受信任的 Gateway 主機；HTTP API 仍需 Token/密碼）。
- 若改為要求 Token/密碼，請設定 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**選項 C：Tailnet 綁定（無 Serve）**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

開啟：`http://<tailscale-ip>:18789`（需要 Token）。

## 7) 連接您的頻道

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# Scan QR code
```

請參閱 [頻道](/zh-Hant/channels) 以了解其他供應商。

---

## 1GB RAM 的最佳化

$6 的 Droplet 只有 1GB RAM。為了保持運作順暢：

### 新增 swap（建議）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更輕量的模型

如果您遇到 OOM（記憶體不足）問題，請考慮：

- 使用基於 API 的模型（Claude、GPT）而非本機模型
- 將 `agents.defaults.model.primary` 設定為較小的模型

### 監控記憶體

```bash
free -h
htop
```

---

## 持續性

所有狀態都位於：

- `~/.openclaw/` — 設定、認證資訊、工作階段資料
- `~/.openclaw/workspace/` — 工作區（SOUL.md、記憶體等）

這些資料在重開機後會保留。請定期備份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免費替代方案

Oracle Cloud 提供的 **Always Free** ARM 執行個體比這裡任何付費選項都強大得多 —— 而且是每月 $0。

| 您將獲得           | 規格          |
| ------------------ | ------------- |
| **4 個 OCPU**      | ARM Ampere A1 |
| **24GB RAM**       | 綽綽有餘      |
| **200GB 儲存空間** | 區塊儲存卷    |
| **永久免費**       | 無信用卡費用  |

**注意事項：**

- 註冊過程可能有些棘手（如果失敗請重試）
- ARM 架構 —— 大多數東西都能運作，但部分二進位檔案需要 ARM 版本

如需完整的設定指南，請參閱 [Oracle Cloud](/zh-Hant/platforms/oracle)。關於註冊提示和註冊流程疑難排解，請參閱此 [社群指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 疑難排解

### Gateway 無法啟動

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### 連接埠已被佔用

```bash
lsof -i :18789
kill <PID>
```

### 記憶體不足

```bash
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## 另請參閱

- [Hetzner 指南](/zh-Hant/install/hetzner) — 更便宜、更強大
- [Docker 安裝](/zh-Hant/install/docker) — 容器化設定
- [Tailscale](/zh-Hant/gateway/tailscale) — 安全遠端存取
- [設定](/zh-Hant/gateway/configuration) — 完整設定參考

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
