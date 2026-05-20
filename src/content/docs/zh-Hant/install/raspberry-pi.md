---
summary: "在 Raspberry Pi 上託管 OpenClaw 以實現永遠線上的自我託管"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

在 Raspberry Pi 上執行持續、永遠線上的 OpenClaw Gateway。由於 Pi 僅作為 Gateway（模型透過 API 在雲端執行），即使是規格普通的 Pi 也能很好地處理工作負載——典型的硬體成本為 **$35–80 一次性費用**，無月費。

## 硬體相容性

| Pi 型號     | 記憶體 (RAM) | 可用？ | 備註                             |
| ----------- | ------------ | ------ | -------------------------------- |
| Pi 5        | 4/8 GB       | 最佳   | 最快，推薦。                     |
| Pi 4        | 4 GB         | 良好   | 大多數用戶的最佳平衡點。         |
| Pi 4        | 2 GB         | 可     | 新增 swap。                      |
| Pi 4        | 1 GB         | 緊湊   | 配合 swap 可行，需使用最小設定。 |
| Pi 3B+      | 1 GB         | 慢     | 可用但反應遲緩。                 |
| Pi Zero 2 W | 512 MB       | 否     | 不推薦。                         |

**最低需求：** 1 GB RAM，1 核心處理器，500 MB 可用磁碟空間，64 位元作業系統。
**推薦規格：** 2 GB+ RAM，16 GB+ SD 卡（或 USB SSD），乙太網路連線。

## 先決條件

- 具備 2 GB+ RAM（推薦 4 GB）的 Raspberry Pi 4 或 5
- MicroSD 卡（16 GB+）或 USB SSD（效能更佳）
- 官方 Pi 電源供應器
- 網路連線（乙太網路或 WiFi）
- 64 位元 Raspberry Pi OS（必須——請勿使用 32 位元版本）
- 約 30 分鐘

## 安裝設定

<Steps>
  <Step title="Flash the OS">
    使用 **Raspberry Pi OS Lite (64-bit)** —— 無桌面環境的無頭伺服器不需要桌面。

    1. 下載 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 選擇作業系統：**Raspberry Pi OS Lite (64-bit)**。
    3. 在設定對話方塊中，預先設定：
       - 主機名稱：`gateway-host`
       - 啟用 SSH
       - 設定使用者名稱和密碼
       - 設定 WiFi（如果不使用乙太網路）
    4. 燒錄到您的 SD 卡或 USB 隨身碟，插入並啟動 Pi。

  </Step>

<Step title="透過 SSH 連線">```bash ssh user@gateway-host ```</Step>

  <Step title="更新系統">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set timezone (important for cron and reminders)
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

<Step title="安裝 Node.js 24">```bash curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - sudo apt install -y nodejs node --version ```</Step>

  <Step title="新增 swap（對 2 GB 或以下記憶體很重要）">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # Reduce swappiness for low-RAM devices
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

<Step title="安裝 OpenClaw">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Step>

  <Step title="執行引導程式">
    ```bash
    openclaw onboard --install-daemon
    ```

    請依照精靈步驟操作。對於無頭裝置，建議使用 API 金鑰而非 OAuth。Telegram 是最簡單的入門管道。

  </Step>

<Step title="驗證">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Access the Control UI">
    在您的電腦上，從 Pi 獲取儀表板 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然後在另一個終端機中建立 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在您的本機瀏覽器中開啟列印的 URL。如需永久遠端存取，請參閱 [Tailscale 整合](/zh-Hant/gateway/tailscale)。

  </Step>
</Steps>

## 效能建議

**使用 USB SSD** —— SD 卡速度慢且容易損壞。USB SSD 可大幅提升效能。請參閱 [Pi USB 開機指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**啟用模組編譯快取** —— 可加快在低功耗 Pi 主機上重複執行 CLI 的速度：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

`OPENCLAW_NO_RESPAWN=1` 將常規的 Gateway 重新啟動保持在程序內，這避免了額外的程序移交，並讓 PID 追蹤在小型主機上保持簡單。

**減少記憶體使用量** —— 對於無頭設定，請釋放 GPU 記憶體並停用未使用的服務：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**systemd drop-in 用於穩定的重新啟動** —— 如果這台 Pi 主要用於執行 OpenClaw，請新增一個服務 drop-in：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

然後執行 `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`。在無頭 Pi 上，還要啟用一次 lingering，以便使用者服務在登出後繼續執行：`sudo loginctl enable-linger "$(whoami)"`。

## 建議的型號設定

由於 Pi 僅執行閘道，因此請使用雲端託管的 API 模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

不要在 Pi 上執行本機 LLM —— 即使是小型模型也太慢而無法使用。讓 Claude 或 GPT 處理模型工作。

## ARM 二進位檔案說明

大多數 OpenClaw 功能可在 ARM64 上無變更運作 (Node.js, Telegram, WhatsApp/Baileys, Chromium)。偶爾缺少 ARM 建置的二進位檔案通常是技能附帶的選用 Go/Rust CLI 工具。在回退到從原始碼建置之前，請先驗證缺少的二進位檔案的發佈頁面是否有 `linux-arm64` / `aarch64` 檔案。

## 持久化與備份

OpenClaw 狀態位於：

- `~/.openclaw/` — `openclaw.json`, per-agent `auth-profiles.json`, channel/provider state, sessions.
- `~/.openclaw/workspace/` — agent workspace (SOUL.md, memory, artifacts).

這些資料在重新開機後會保留。使用以下指令建立可移植的快照：

```bash
openclaw backup create
```

如果您將這些資料儲存在 SSD 上，效能和耐用性都會比使用 SD 卡更好。

## 疑難排解

**記憶體不足** -- 使用 `free -h` 驗證 swap 是否已啟用。停用未使用的服務 (`sudo systemctl disable cups bluetooth avahi-daemon`)。僅使用基於 API 的模型。

**效能緩慢** -- 使用 USB SSD 代替 SD 卡。使用 `vcgencmd get_throttled` 檢查 CPU 是否有降頻 (應回傳 `0x0`)。

**服務無法啟動** -- 使用 `journalctl --user -u openclaw-gateway.service --no-pager -n 100` 檢查日誌並執行 `openclaw doctor --non-interactive`。如果是無介面 Pi，請也驗證是否已啟用 linger：`sudo loginctl enable-linger "$(whoami)"`。

**ARM 執行檔問題** -- 如果某個技能因 "exec format error" 而失敗，請檢查該執行檔是否有 ARM64 版本。使用 `uname -m` 驗證架構 (應顯示 `aarch64`)。

**WiFi 斷線** -- 停用 WiFi 電源管理：`sudo iwconfig wlan0 power off`。

## 下一步

- [Channels](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 等更多服務
- [Gateway configuration](/zh-Hant/gateway/configuration) -- 所有設定選項
- [Updating](/zh-Hant/install/updating) -- 保持 OpenClaw 為最新版本

## 相關內容

- [Install overview](/zh-Hant/install)
- [Linux server](/zh-Hant/vps)
- [Platforms](/zh-Hant/platforms)
