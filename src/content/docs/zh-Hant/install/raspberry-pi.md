---
summary: "在 Raspberry Pi 上託管 OpenClaw 以實現持續的自託管"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# Raspberry Pi

在 Raspberry Pi 上執行持續運作的 OpenClaw Gateway。由於 Pi 僅作為閘道（模型透過 API 在雲端執行），即使是規格一般的 Pi 也能妥善處理工作負載。

## 先決條件

- Raspberry Pi 4 或 5，記憶體 2 GB 以上（建議 4 GB）
- MicroSD 卡（16 GB 以上）或 USB SSD（效能更佳）
- 官方 Pi 電源供應器
- 網路連線（乙太網路或 WiFi）
- 64 位元 Raspberry Pi OS（必要 — 請勿使用 32 位元）
- 大約 30 分鐘

## 設定

<Steps>
  <Step title="安裝作業系統">
    請使用 **Raspberry Pi OS Lite (64-bit)** -- 無人頭伺服器不需要桌面環境。

    1. 下載 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 選擇作業系統：**Raspberry Pi OS Lite (64-bit)**。
    3. 在設定對話方塊中，預先設定：
       - 主機名稱：`gateway-host`
       - 啟用 SSH
       - 設定使用者名稱和密碼
       - 設定 WiFi（如果不使用乙太網路）
    4. 將系統刷入您的 SD 卡或 USB 隨身碟，插入並啟動 Pi。

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

  <Step title="新增 Swap（對 2 GB 或以下記憶體很重要）">
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

  <Step title="執行上架精靈">
    ```bash
    openclaw onboard --install-daemon
    ```

    請依照精靈指示操作。對於無人頭裝置，建議使用 API 金鑰而非 OAuth。Telegram 是最容易入手的頻道。

  </Step>

<Step title="驗證">```bash openclaw status sudo systemctl status openclaw journalctl -u openclaw -f ```</Step>

  <Step title="存取控制介面">
    在您的電腦上，從 Pi 獲取儀表板 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然後在另一個終端機中建立 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在您的本機瀏覽器中開啟列印出來的 URL。若要進行隨時遠端存取，請參閱 [Tailscale 整合](/en/gateway/tailscale)。

  </Step>
</Steps>

## 效能提示

**使用 USB SSD** -- SD 卡速度較慢且容易損壞。USB SSD 能大幅提升效能。請參閱 [Pi USB 開機指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**啟用模組編譯快取** -- 在低功耗 Pi 主機上加速重複的 CLI 呼叫：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

**減少記憶體使用量** -- 針對無介面設定，釋放 GPU 記憶體並停用未使用的服務：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

## 疑難排解

**記憶體不足** -- 使用 `free -h` 驗證 swap 是否已啟用。停用未使用的服務 (`sudo systemctl disable cups bluetooth avahi-daemon`)。僅使用基於 API 的模型。

**效能緩慢** -- 使用 USB SSD 代替 SD 卡。使用 `vcgencmd get_throttled` 檢查 CPU 節流情況 (應傳回 `0x0`)。

**服務無法啟動** -- 使用 `journalctl -u openclaw --no-pager -n 100` 檢查日誌並執行 `openclaw doctor --non-interactive`。

**ARM 二進位檔問題** -- 如果技能因「exec format error」而失敗，請檢查二進位檔是否有 ARM64 版本。使用 `uname -m` 驗證架構 (應顯示 `aarch64`)。

**WiFi 斷線** -- 停用 WiFi 電源管理：`sudo iwconfig wlan0 power off`。

## 下一步

- [頻道](/en/channels) -- 連接 Telegram、WhatsApp、Discord 等
- [Gateway 設定](/en/gateway/configuration) -- 所有設定選項
- [更新](/en/install/updating) -- 讓 OpenClaw 保持最新狀態
