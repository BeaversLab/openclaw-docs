---
summary: "OpenClaw 在 Raspberry Pi 上（預算自託管設置）"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# OpenClaw 在 Raspberry Pi 上

## 目標

在 Raspberry Pi 上運行持久、始終在線的 OpenClaw Gateway，一次性成本約 **~$35-80**（無月費）。

非常適合：

- 24/7 個人 AI 助手
- 家庭自動化中心
- 低功耗、始終可用的 Telegram/WhatsApp 機器人

## 硬體需求

| Pi 型號         | 記憶體 (RAM) | 可用？  | 備註                     |
| --------------- | ------------ | ------- | ------------------------ |
| **Pi 5**        | 4GB/8GB      | ✅ 最佳 | 最快，推薦               |
| **Pi 4**        | 4GB          | ✅ 良好 | 大多數用戶的最佳平衡點   |
| **Pi 4**        | 2GB          | ✅ 尚可 | 可運作，需新增 swap      |
| **Pi 4**        | 1GB          | ⚠️ 緊張 | 配合 swap 可行，最小配置 |
| **Pi 3B+**      | 1GB          | ⚠️ 緩慢 | 可運作但反應遲鈍         |
| **Pi Zero 2 W** | 512MB        | ❌      | 不推薦                   |

**最低規格：** 1GB RAM，1 核心，500MB 磁碟空間  
**推薦規格：** 2GB+ RAM，64-bit OS，16GB+ SD 卡（或 USB SSD）

## 您需要什麼

- Raspberry Pi 4 或 5（推薦 2GB+）
- MicroSD 卡 (16GB+) 或 USB SSD（效能更好）
- 電源供應器（推薦官方 Pi PSU）
- 網路連線（乙太網路或 WiFi）
- 約 30 分鐘

## 1) 安裝作業系統

使用 **Raspberry Pi OS Lite (64-bit)** — 無人伺服器不需要桌面環境。

1. 下載 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 選擇 OS：**Raspberry Pi OS Lite (64-bit)**
3. 點擊齒輪圖示 (⚙️) 進行預先設定：
   - 設定主機名稱：`gateway-host`
   - 啟用 SSH
   - 設定使用者名稱/密碼
   - 設定 WiFi（如果不使用乙太網路）
4. 燒錄到您的 SD 卡 / USB 隨身碟
5. 插入並啟動 Pi

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

## 5) 新增 Swap（對 2GB 或以下記憶體很重要）

Swap 可防止記憶體不足導致的當機：

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

### 選項 B：可駭安裝（適合喜愛嘗試者）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可駭安裝讓您能直接存取記錄檔和程式碼 — 對於除錯 ARM 特定問題很有幫助。

## 7) 執行入門設定

```bash
openclaw onboard --install-daemon
```

依照精靈指引：

1. **Gateway 模式：** 本地
2. **驗證：** 推薦使用 API 金鑰（OAuth 在無人值守的 Pi 上可能不太穩定）
3. **頻道：** Telegram 最容易上手
4. **Daemon：** 是

## 8) 驗證安裝

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) 存取 OpenClaw 儀表板

將 `user@gateway-host` 替換為您的 Pi 使用者名稱和主機名稱或 IP 位址。

在您的電腦上，要求 Pi 輸出一個全新的儀表板 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

該指令會輸出 `Dashboard URL:`。根據 `gateway.auth.token`
的配置方式，URL 可能是一個普通的 `http://127.0.0.1:18789/` 連結，或者是包含
`#token=...` 的連結。

在您電腦上的另一個終端機中，建立 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然後在您的本機瀏覽器中開啟輸出的儀表板 URL。

如果 UI 要求進行身份驗證，請將來自 `gateway.auth.token`
（或 `OPENCLAW_GATEWAY_TOKEN`）的權杖貼上到 Control UI 設定中。

若要進行永遠線上的遠端存取，請參閱 [Tailscale](/zh-Hant/gateway/tailscale)。

---

## 效能最佳化

### 使用 USB SSD (大幅提升)

SD 卡速度慢且容易損壞。使用 USB SSD 可大幅提升效能：

```bash
# Check if booting from USB
lsblk
```

請參閱 [Pi USB 開機指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) 以進行設定。

### 加快 CLI 啟動速度 (模組編譯快取)

在低功耗 Pi 主機上，啟用 Node 的模組編譯快取，以便重複執行 CLI 時速度更快：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

注意事項：

- `NODE_COMPILE_CACHE` 可加快後續執行的速度 (`status`、`health`、`--help`)。
- `/var/tmp` 比 `/tmp` 更能於重新開機後保留。
- `OPENCLAW_NO_RESPAWN=1` 可避免 CLI 自我重新啟動 帶來的額外啟動成本。
- 首次執行會預熱快取；後續執行受益最大。

### systemd 啟動調整 (可選)

如果這台 Pi 主要用於執行 OpenClaw，請新增 service drop-in 以減少重啟
抖動並保持啟動環境穩定：

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

如果可能的話，請將 OpenClaw 的狀態/快取保存在 SSD 儲存空間上，以避免在冷啟動
期間因 SD 卡隨機 I/O 造成的瓶頸。

`Restart=` 策略如何幫助自動還原：
[systemd 可以自動化服務還原](https://www.redhat.com/en/blog/systemd-automate-recovery)。

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

## ARM 特別注意事項

### 二進位檔相容性

大多數 OpenClaw 功能都能在 ARM64 上運作，但某些外部二進位檔可能需要 ARM 版本：

| 工具               | ARM64 狀態 | 備註                                |
| ------------------ | ---------- | ----------------------------------- |
| Node.js            | ✅         | 運作良好                            |
| WhatsApp (Baileys) | ✅         | 純 JS，無問題                       |
| Telegram           | ✅         | 純 JS，無問題                       |
| gog (Gmail CLI)    | ⚠️         | 檢查是否有 ARM 版本                 |
| Chromium (瀏覽器)  | ✅         | `sudo apt install chromium-browser` |

如果某個技能失敗，請檢查其二進位檔是否有 ARM 版本。許多 Go/Rust 工具有提供；有些則沒有。

### 32 位元 vs 64 位元

**務必使用 64 位元作業系統。** Node.js 和許多現代工具都需要它。使用以下指令檢查：

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## 推薦的模型設定

由於 Pi 只是 Gateway（模型在雲端執行），請使用基於 API 的模型：

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

## 開機時自動啟動

入門流程會設定此功能，但若要驗證：

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
- 檢查 CPU 節流：`vcgencmd get_throttled` (應該傳回 `0x0`)

### 服務無法啟動

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### ARM 二進位檔案問題

如果某個技能因「exec format error」而失敗：

1. 檢查該二進位檔案是否有 ARM64 版本
2. 嘗試從原始碼建置
3. 或是使用支援 ARM 的 Docker 容器

### WiFi 連線中斷

對於使用 WiFi 的無頭 Pi：

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本比較

| 設定           | 一次性成本 | 每月成本 | 備註               |
| -------------- | ---------- | -------- | ------------------ |
| **Pi 4 (2GB)** | ~$45       | $0       | + 電力 (~$5/年)    |
| **Pi 4 (4GB)** | ~$55       | $0       | 建議               |
| **Pi 5 (4GB)** | ~$60       | $0       | 最佳效能           |
| **Pi 5 (8GB)** | ~$80       | $0       | 效能過剩但具未來性 |
| DigitalOcean   | $0         | $6/月    | $72/年             |
| Hetzner        | $0         | €3.79/月 | 約 $50/年          |

**回本點：** 與雲端 VPS 相比，Pi 在約 6-12 個月內即可回本。

---

## 另見

- [Linux 指南](/zh-Hant/platforms/linux) — 一般 Linux 設定
- [DigitalOcean 指南](/zh-Hant/platforms/digitalocean) — 雲端替代方案
- [Hetzner 指南](/zh-Hant/install/hetzner) — Docker 設定
- [Tailscale](/zh-Hant/gateway/tailscale) — 遠端存取
- [節點](/zh-Hant/nodes) — 將您的筆記型電腦/手機與 Pi 閘道配對

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
