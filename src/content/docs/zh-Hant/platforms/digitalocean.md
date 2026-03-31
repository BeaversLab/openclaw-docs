---
summary: "OpenClaw on DigitalOcean (簡單的付費 VPS 選項)"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean (平台)"
---

# DigitalOcean 上的 OpenClaw

## 目標

在 DigitalOcean 上執行永續的 OpenClaw Gateway，費用為 **$6/月**（若使用預約價格則為 $4/月）。

如果您想要一個 $0/月的選項，且不介意 ARM 架構與特定供應商的設定，請參閱 [Oracle Cloud 指南](/en/platforms/oracle)。

## 費用比較 (2026)

| 供應商       | 方案            | 規格                  | 月費        | 備註                          |
| ------------ | --------------- | --------------------- | ----------- | ----------------------------- |
| Oracle Cloud | Always Free ARM | 最高 4 OCPU，24GB RAM | $0          | ARM 架構，容量有限 / 註冊怪癖 |
| Hetzner      | CX22            | 2 vCPU，4GB RAM       | €3.79 (~$4) | 最便宜的付費選項              |
| DigitalOcean | Basic           | 1 vCPU，1GB RAM       | $6          | 操作介面簡單，文件完善        |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM       | $6          | 機房位置多                    |
| Linode       | Nanode          | 1 vCPU，1GB RAM       | $5          | 現為 Akamai 的一部分          |

**選擇供應商：**

- DigitalOcean：UX 最簡單 + 設定可預期（本指南）
- Hetzner：價格/效能比佳（請參閱 [Hetzner 指南](/en/install/hetzner)）
- Oracle Cloud：可為 $0/月，但較為麻煩且僅限 ARM（請參閱 [Oracle 指南](/en/platforms/oracle)）

---

## 前置需求

- DigitalOcean 帳號（[註冊獲得 $200 免費額度](https://m.do.co/c/signup)）
- SSH 金鑰對（或願意使用密碼驗證）
- 約 20 分鐘

## 1) 建立 Droplet

<Warning>使用乾淨的基礎映像檔 (Ubuntu 24.04 LTS)。除非您已審閱其啟動腳本和防火牆預設值，否則請避免使用第三方 Marketplace 一鍵映像檔。</Warning>

1. 登入 [DigitalOcean](https://cloud.digitalocean.com/)
2. 點擊 **Create → Droplets**
3. 選擇：
   - **Region：** 離您（或您的使用者）最近的地區
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/mo** (1 vCPU, 1GB RAM, 25GB SSD)
   - **Authentication：** SSH 金鑰（推薦）或密碼
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

精靈將會引導您完成：

- 模型驗證 (API 金鑰或 OAuth)
- 通道設定 (Telegram, WhatsApp, Discord 等)
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

## 6) 存取儀表板

Gateway 預設綁定至 loopback。若要存取控制 UI：

**選項 A：SSH Tunnel（推薦）**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**選項 B：Tailscale Serve (HTTPS，僅限回環)**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

開啟：`https://<magicdns>/`

備註：

- Serve 會保持閘道僅限回環存取，並透過 Tailscale 身分標頭驗證控制 UI/WebSocket 流量（無 Token 驗證假設閘道主機受信任；HTTP API 仍需 Token/密碼）。
- 若改為需要 Token/密碼，請設定 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**選項 C：Tailnet bind (不使用 Serve)**

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

請參閱 [頻道](/en/channels) 以了解其他供應商。

---

## 1GB RAM 的最佳化設定

$6 的 Droplet 只有 1GB RAM。為了保持運作順暢：

### 新增 Swap（建議）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用較輕量的模型

如果遇到 OOM（記憶體不足）錯誤，請考慮：

- 使用基於 API 的模型（Claude、GPT）而非本地模型
- 將 `agents.defaults.model.primary` 設定為較小的模型

### 監控記憶體

```bash
free -h
htop
```

---

## 持久化

所有狀態資料儲存於：

- `~/.openclaw/` — 設定、憑證、工作階段資料
- `~/.openclaw/workspace/` — 工作區（SOUL.md、記憶體等）

這些資料在重新開機後會保留。請定期進行備份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免費替代方案

Oracle Cloud 提供 **Always Free** ARM 實例，其效能遠超此處任何付費選項 — 每月費用為 $0。

| 您將獲得           | 規格          |
| ------------------ | ------------- |
| **4 個 OCPU**      | ARM Ampere A1 |
| **24GB RAM**       | 綽綽有餘      |
| **200GB 儲存空間** | 區塊儲存卷    |
| **永久免費**       | 無信用卡費用  |

**注意事項：**

- 註冊過程可能不穩定（若失敗請重試）
- ARM 架構 — 大多數功能均可運作，但部分二元檔案需要 ARM 版本

如需完整的設定指南，請參閱 [Oracle Cloud](/en/platforms/oracle)。如需註冊提示和註冊流程的疑難排解，請參閱此 [社群指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 疑難排解

### 閘道無法啟動

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

## 參閱

- [Hetzner 指南](/en/install/hetzner) — 更便宜、更強大
- [Docker 安裝](/en/install/docker) — 容器化設定
- [Tailscale](/en/gateway/tailscale) — 安全的遠端存取
- [設定](/en/gateway/configuration) — 完整設定參考
