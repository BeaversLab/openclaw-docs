---
summary: "OpenClaw on Raspberry Pi (budget self-hosted setup)"
read_when:
  - 在 Raspberry Pi 上設定 OpenClaw
  - 在 ARM 裝置上執行 OpenClaw
  - 建立一個廉價的永遠線上個人 AI
title: "Raspberry Pi"
---

# OpenClaw on Raspberry Pi

## 目標

在 Raspberry Pi 上執行持續、永遠線上的 OpenClaw Gateway，一次性費用約 **~$35-80**（無月費）。

適用於：

- 24/7 個人 AI 助理
- 家庭自動化中心
- 低功耗、永遠可用的 Telegram/WhatsApp 機器人

## 硬體需求

| Pi 型號        | 記憶體     | 可用性？   | 備註                              |
| --------------- | ------- | -------- | ---------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ 最佳  | 最快，推薦               |
| **Pi 4**        | 4GB     | ✅ 良好  | 大多數使用者的最佳選擇          |
| **Pi 4**        | 2GB     | ✅ OK    | 可運作，需增加 swap                    |
| **Pi 4**        | 1GB     | ⚠️ 緊張 | 配合 swap 可行，最小設定 |
| **Pi 3B+**      | 1GB     | ⚠️ 緩慢  | 可運作但反應遲頓                 |
| **Pi Zero 2 W** | 512MB   | ❌       | 不推薦                    |

**最低規格：** 1GB RAM，1 核心，500MB 磁碟空間  
**推薦規格：** 2GB+ RAM，64 位元 OS，16GB+ SD 卡（或 USB SSD）

## 您需要的項目

- Raspberry Pi 4 或 5（推薦 2GB 以上）
- MicroSD 卡（16GB 以上）或 USB SSD（效能更佳）
- 電源供應器（推薦使用官方 Pi PSU）
- 網路連線（乙太網路或 WiFi）
- 約 30 分鐘

## 1) 燒錄作業系統

使用 **Raspberry Pi OS Lite (64-bit)** — 無人頭伺服器不需要桌面環境。

1. 下載 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 選擇 OS：**Raspberry Pi OS Lite (64-bit)**
3. 點擊齒輪圖示 (⚙️) 進行預先設定：
   - 設定主機名稱：`gateway-host`
   - 啟用 SSH
   - 設定使用者名稱/密碼
   - 設定 WiFi（若不使用乙太網路）
4. 燒錄至您的 SD 卡 / USB 隨身碟
5. 插入 SD 卡並啟動 Pi

## 2) 透過 SSH 連線

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) 系統設定

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) 安裝 Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) 增加 Swap（對 2GB 或以下記憶體很重要）

Swap 可防止記憶體不足當機：

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for low RAM (reduce swappiness)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安裝 OpenClaw

### 選項 A：標準安裝（推薦）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 選項 B：可駭客安裝（適合研究調整）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可駭客安裝讓您能直接存取記錄檔和程式碼 — 適合除錯 ARM 特有的問題。

## 7) 執行 Onboarding

```bash
openclaw onboard --install-daemon
```

依照精靈指示：

1. **Gateway 模式：** Local
2. **驗證：** 推薦使用 API 金鑰（OAuth 在無人頭 Pi 上可能不穩定）
3. **頻道：** Telegram 最容易入門
4. **Daemon：** 是 (systemd)

## 8) 驗證安裝

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) 存取 OpenClaw Dashboard

將 `user@gateway-host` 取換為您的 Pi 使用者名稱和主機名稱或 IP 位址。

在您的電腦上，請 Pi 輸出一個全新的儀表板 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

該指令會輸出 `Dashboard URL:`。根據 `gateway.auth.token` 的設定方式，URL 可能是單純的 `http://127.0.0.1:18789/` 連結，或是包含 `#token=...` 的連結。

在您電腦的另一個終端機中，建立 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然後在您的本機瀏覽器中開啟列印出的儀表板 URL。

如果 UI 要求身分驗證，請將 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`) 中的 token 貼上到 Control UI 設定中。

若需永遠在線的遠端存取，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

---

## 效能最佳化

### 使用 USB SSD (大幅改善)

SD 卡速度較慢且容易磨損。USB SSD 可大幅提升效能：

```bash
# Check if booting from USB
lsblk
```

設定方式請參閱 [Pi USB boot guide](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

### 加速 CLI 啟動 (模組編譯快取)

在低功耗的 Pi 主機上，啟用 Node 的模組編譯快取可讓重複執行 CLI 的速度更快：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

備註：

- `NODE_COMPILE_CACHE` 可加速後續的執行 (`status`、`health`、`--help`)。
- `/var/tmp` 比起 `/tmp` 更能承受重開機。
- `OPENCLAW_NO_RESPAWN=1` 可避免 CLI 自我重新產生 (respawn) 所帶來的額外啟動成本。
- 第一次執行會預熱快取，之後的執行會受益最大。

### systemd 啟動微調 (選用)

如果這台 Pi 主要用於執行 OpenClaw，請新增一個 service drop-in 以減少重啟時的抖動並保持啟動環境穩定：

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

然後套用：

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

如果可能的話，請將 OpenClaw 的狀態/快取保留在支援 SSD 的儲存空間上，以避免冷啟動時發生 SD 卡隨機讀寫 (I/O) 的瓶頸。

`Restart=` 政策如何協助自動修復：
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery)。

### 降低記憶體使用量

```bash
# Disable GPU memory allocation (headless)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
```

### 監控資源

```bash
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop
```

---

## ARM 專屬說明

### 二進位相容性

大多數 OpenClaw 功能皆可在 ARM64 上運作，但部分外部二進位檔案可能需要 ARM 版本：

| 工具               | ARM64 狀態 | 備註                               |
| ------------------ | ------------ | ----------------------------------- |
| Node.js            | ✅           | 運作良好                         |
| WhatsApp (Baileys) | ✅           | 純 JS，無問題                  |
| Telegram           | ✅           | 純 JS，無問題                  |
| gog (Gmail CLI)    | ⚠️           | 請檢查是否有 ARM 版本               |
| Chromium (瀏覽器) | ✅           | `sudo apt install chromium-browser` |

如果某個技能失敗，請檢查其二進位檔案是否有 ARM 版本。許多 Go/Rust 工具有提供；有些則沒有。

### 32 位元與 64 位元

**請務必使用 64 位元作業系統。** Node.js 和許多現代工具都需要它。可以使用以下指令檢查：

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## 推薦型號設定

由於 Pi 只是作為閘道（模型在雲端執行），請使用 API 型模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**不要嘗試在 Pi 上執行本機 LLM** — 即使是小型模型也太慢了。讓 Claude/GPT 來處理繁重的工作。

---

## 開機自動啟動

上架流程會設定好這個功能，若要驗證：

```bash
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw
```

---

## 故障排除

### 記憶體不足 (OOM)

```bash
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi
```

### 效能緩慢

- 使用 USB SSD 代替 SD 卡
- 停用未使用的服務：`sudo systemctl disable cups bluetooth avahi-daemon`
- 檢查 CPU 節流：`vcgencmd get_throttled` (應該回傳 `0x0`)

### 服務無法啟動

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### ARM 二進位問題

如果某個技能因「exec format error」而失敗：

1. 檢查該二進位檔案是否有 ARM64 版本
2. 嘗試從原始碼建置
3. 或是使用支援 ARM 的 Docker 容器

### WiFi 斷線

對於使用 WiFi 的無頭 Pi：

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本比較

| 設定          | 一次性成本 | 每月成本 | 備註                     |
| -------------- | ------------- | ------------ | ------------------------- |
| **Pi 4 (2GB)** | ~$45          | $0           | + 電力 (~$5/年)          |
| **Pi 4 (4GB)** | ~$55          | $0           | 推薦               |
| **Pi 5 (4GB)** | ~$60          | $0           | 最佳效能          |
| **Pi 5 (8GB)** | ~$80          | $0           | 過於強大但具未來擴充性 |
| DigitalOcean   | $0            | $6/月        | $72/年                  |
| Hetzner        | $0            | €3.79/月     | ~$50/年                 |

**回本點：** 相較於雲端 VPS，Pi 大約在 6-12 個月內就能回本。

---

## 參見

- [Linux 指南](/zh-Hant/platforms/linux) — 一般 Linux 設定
- [DigitalOcean 指南](/zh-Hant/platforms/digitalocean) — 雲端替代方案
- [Hetzner 指南](/zh-Hant/install/hetzner) — Docker 設定
- [Tailscale](/zh-Hant/gateway/tailscale) — 遠端存取
- [節點](/zh-Hant/nodes) — 將您的筆記型電腦/手機與 Pi 閘道配對

import en from "/components/footer/en.mdx";

<en />
