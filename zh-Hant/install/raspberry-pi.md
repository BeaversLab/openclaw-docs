---
summary: "在 Raspberry Pi 上託管 OpenClaw 以實現永久自託管"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# Raspberry Pi

在 Raspberry Pi 上執行持久且永遠在線的 OpenClaw Gateway。由於 Pi 只是閘道（模型透過 API 在雲端執行），即使規格普通的 Pi 也能良好處理工作負載。

## 先決條件

- Raspberry Pi 4 或 5，具備 2 GB 以上 RAM（建議 4 GB）
- MicroSD 記憶卡（16 GB 以上）或 USB SSD（效能更好）
- 官方 Pi 電源供應器
- 網路連線（以太網或 WiFi）
- 64 位元 Raspberry Pi OS（必須 —— 請勿使用 32 位元）
- 大約 30 分鐘

## 安裝設定

<Steps>
  <Step title="Flash the OS">
    使用 **Raspberry Pi OS Lite (64-bit)** -- 無人值守伺服器不需要桌面環境。

    1. 下載 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 選擇 OS：**Raspberry Pi OS Lite (64-bit)**。
    3. 在設定對話方塊中，預先設定：
       - Hostname: `gateway-host`
       - 啟用 SSH
       - 設定使用者名稱和密碼
       - 設定 WiFi (如果不使用 Ethernet)
    4. 燒錄到您的 SD 卡或 USB 隨身碟，插入它並啟動 Pi。

  </Step>

<Step title="Connect via SSH">```bash ssh user@gateway-host ```</Step>

  <Step title="Update the system">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set timezone (important for cron and reminders)
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

<Step title="Install Node.js 24">
  ```bash curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - sudo apt install -y
  nodejs node --version ```
</Step>

  <Step title="新增 Swap（對於 2 GB 或以下記憶體的裝置很重要）">
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

    請依照精靈指示操作。對於無介面裝置，建議使用 API 金鑰而非 OAuth。Telegram 是最簡單的入門頻道。

  </Step>

<Step title="驗證">
  ```bash openclaw status sudo systemctl status openclaw journalctl -u openclaw -f ```
</Step>

  <Step title="存取控制 UI">
    在您的電腦上，從 Pi 取得儀表板 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然後在另一個終端機中建立 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在您的本機瀏覽器中開啟列印出的 URL。如需永遠線上的遠端存取，請參閱 [Tailscale 整合](/zh-Hant/gateway/tailscale)。

  </Step>
</Steps>

## 效能秘訣

**使用 USB SSD** -- SD 卡速度較慢且容易磨損。USB SSD 能大幅提升效能。請參閱 [Pi USB 開機指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**啟用模組編譯快取** -- 加速在低功耗 Pi 主機上重複執行 CLI 的速度：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

**減少記憶體使用量** -- 對於無介面 (headless) 設定，請釋放 GPU 記憶體並停用未使用的服務：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

## 疑難排解

**記憶體不足** -- 使用 `free -h` 驗證 swap 是否已啟用。停用未使用的服務 (`sudo systemctl disable cups bluetooth avahi-daemon`)。僅使用 API 型模型。

**效能緩慢** -- 使用 USB SSD 代替 SD 卡。使用 `vcgencmd get_throttled` 檢查 CPU 是否降頻 (應該回傳 `0x0`)。

**服務無法啟動** -- 使用 `journalctl -u openclaw --no-pager -n 100` 檢查日誌並執行 `openclaw doctor --non-interactive`。

**ARM 二進制檔案問題** -- 如果某個技能因 "exec format error" 而失敗，請檢查該二進制檔案是否有 ARM64 版本。使用 `uname -m` 驗證架構 (應顯示 `aarch64`)。

**WiFi 斷線** -- 停用 WiFi 電源管理：`sudo iwconfig wlan0 power off`。

## 下一步

- [頻道](/zh-Hant/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [Gateway configuration](/zh-Hant/gateway/configuration) -- 所有設定選項
- [Updating](/zh-Hant/install/updating) -- 保持 OpenClaw 更新

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
