---
summary: "OpenClaw on DigitalOcean（簡單的付費 VPS 選項）"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean 上的 OpenClaw

## 目標

在 DigitalOcean 上執行持久化的 OpenClaw Gateway，費用為 **$6/月**（或使用預留定價 $4/月）。

如果您想要 $0/月的選項並且不介意 ARM 與特定供應商的設定，請參閱 [Oracle Cloud 指南](/zh-Hant/platforms/oracle)。

## 成本比較 (2026)

| 供應商       | 方案            | 規格                  | 月費        | 備註                     |
| ------------ | --------------- | --------------------- | ----------- | ------------------------ |
| Oracle Cloud | Always Free ARM | 最高 4 OCPU，24GB RAM | $0          | ARM，容量有限 / 註冊怪癖 |
| Hetzner      | CX22            | 2 vCPU，4GB RAM       | €3.79 (~$4) | 最便宜的付費選項         |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM       | $6          | 簡易介面，完善文件       |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM       | $6          | 多個機房位置             |
| Linode       | Nanode          | 1 vCPU，1GB RAM       | $5          | 現為 Akamai 的一部分     |

**選擇供應商：**

- DigitalOcean：最簡單的 UX + 可預期的設定（本指南）
- Hetzner：良好的價格效能比（請參閱 [Hetzner 指南](/zh-Hant/install/hetzner)）
- Oracle Cloud：可能免費（$0/月），但較為挑剔且僅限 ARM（請參閱 [Oracle 指南](/zh-Hant/platforms/oracle)）

---

## 先決條件

- DigitalOcean 帳戶（[註冊並獲得 $200 免費額度](https://m.do.co/c/signup)）
- SSH 金鑰對（或願意使用密碼驗證）
- 約 20 分鐘

## 1) 建立 Droplet

<Warning>使用乾淨的基礎映像檔（Ubuntu 24.04 LTS）。除非您 已審閱其啟動腳本和防火牆預設值，否則請避免使用第三方 Marketplace 一鍵映像檔。</Warning>

1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)
2. 點擊 **Create → Droplets**
3. 選擇：
   - **Region：** 距離您（或您的使用者）最近
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/mo** (1 vCPU, 1GB RAM, 25GB SSD)
   - **驗證：** SSH 金鑰（推薦）或密碼
4. 點擊 **Create Droplet**
5. 記下 IP 位址

## 2) 透過 SSH 連線

```exec
ssh root@YOUR_DROPLET_IP
```

## 3) 安裝 OpenClaw

```exec
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

## 4) 執行上架設定 (Run Onboarding)

```exec
openclaw onboard --install-daemon
```

精靈會引導您完成：

- 模型驗證 (API 金鑰或 OAuth)
- 通道設定 (Telegram、WhatsApp、Discord 等)
- Gateway 權杖 (自動產生)
- 常駐程式安裝 (systemd)

## 5) 驗證 Gateway

```exec
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) 存取儀表板

Gateway 預設綁定至 loopback。若要存取 Control UI：

**選項 A：SSH 通道（推薦）**

```exec
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**選項 B：Tailscale Serve (HTTPS，僅限 loopback)**

```exec
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

開啟：`https://<magicdns>/`

備註：

- Serve 保持 Gateway 僅限 loopback 存取，並透過 Tailscale 身分標頭驗證 Control UI/WebSocket 流量（無權杖驗證假設為受信任的 Gateway 主機；HTTP API 仍需要權杖/密碼）。
- 若要改為要求權杖/密碼，請設定 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**選項 C：Tailnet 綁定（無 Serve）**

```exec
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

開啟：`http://<tailscale-ip>:18789`（需要 token）。

## 7) 連接您的頻道

### Telegram

```exec
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```exec
openclaw channels login whatsapp
# Scan QR code
```

參閱 [頻道](/zh-Hant/channels) 瞭解其他供應商。

---

## 1GB RAM 的最佳化

$6 的 Droplet 只有 1GB RAM。為了保持運作順暢：

### 新增 swap（建議）

```exec
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更輕量的模型

如果遇到 OOM（記憶體不足），請考慮：

- 使用基於 API 的模型（Claude、GPT）而非本地模型
- 將 `agents.defaults.model.primary` 設定為更小的模型

### 監控記憶體

```exec
free -h
htop
```

---

## 持久性

所有狀態資料位於：

- `~/.openclaw/` — 設定、憑證、會話資料
- `~/.openclaw/workspace/` — 工作區（SOUL.md、記憶體等）

這些資料在重開機後會保留。請定期備份：

```exec
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免費替代方案

Oracle Cloud 提供 **Always Free** ARM 實例，其效能遠勝於此處任何付費選項 — 每月費用為 $0。

| 您將獲得           | 規格          |
| ------------------ | ------------- |
| **4 個 OCPU**      | ARM Ampere A1 |
| **24GB 記憶體**    | 綽綽有餘      |
| **200GB 儲存空間** | 區塊儲存卷    |
| **永久免費**       | 無信用卡扣款  |

**注意事項：**

- 註冊過程可能不太穩定（如果失敗請重試）
- ARM 架構 —— 大多數東西都能運作，但部分二進位檔案需要 ARM 版本

如需完整的設置指南，請參閱 [Oracle Cloud](/zh-Hant/platforms/oracle)。有關註冊提示和註冊過程疑難排解，請參閱此 [社群指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 疑難排解

### Gateway 無法啟動

```exec
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### 連接埠已被佔用

```exec
lsof -i :18789
kill <PID>
```

### 記憶體不足

```exec
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## 參閱

- [Hetzner 指南](/zh-Hant/install/hetzner) — 更便宜、更強大
- [Docker 安裝](/zh-Hant/install/docker) — 容器化設置
- [Tailscale](/zh-Hant/gateway/tailscale) — 安全遠端存取
- [設定](/zh-Hant/gateway/configuration) — 完整設定參考
