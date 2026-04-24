---
summary: "在 Linux 伺服器或雲端 VPS 上執行 OpenClaw — 供應商選擇、架構與調優"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux 伺服器"
sidebarTitle: "Linux 伺服器"
---

# Linux 伺服器

在任何 Linux 伺服器或雲端 VPS 上執行 OpenClaw Gateway。本頁面協助您選擇供應商、解釋雲端部署的運作方式，並涵蓋適用於任何地方的通用 Linux 調優。

## 選擇供應商

<CardGroup cols={2}>
  <Card title="Railway" href="/zh-Hant/install/railway">
    單鍵、瀏覽器設定
  </Card>
  <Card title="Northflank" href="/zh-Hant/install/northflank">
    單鍵、瀏覽器設定
  </Card>
  <Card title="DigitalOcean" href="/zh-Hant/install/digitalocean">
    簡單付費 VPS
  </Card>
  <Card title="Oracle Cloud" href="/zh-Hant/install/oracle">
    永遠免費 ARM 層級
  </Card>
  <Card title="Fly.io" href="/zh-Hant/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh-Hant/install/hetzner">
    Hetzner VPS 上的 Docker
  </Card>
  <Card title="Hostinger" href="/zh-Hant/install/hostinger">
    具有一鍵設定的 VPS
  </Card>
  <Card title="GCP" href="/zh-Hant/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/zh-Hant/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/zh-Hant/install/exe-dev">
    具 HTTPS 代理的 VM
  </Card>
  <Card title="Raspberry Pi" href="/zh-Hant/install/raspberry-pi">
    ARM 自託管
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免費層)** 也運作良好。
社群影片逐步指南可在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
取得（社群資源——可能會變得無法使用）。

## 雲端設定的運作方式

- **Gateway 在 VPS 上運行**並擁有狀態與工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從筆記型電腦或手機進行連線。
- 將 VPS 視為事實來源，並定期**備份**狀態與工作區。
- 安全預設值：將 Gateway 保持在 loopback 並透過 SSH tunnel 或 Tailscale Serve 存取。
  如果您綁定到 `lan` 或 `tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

相關頁面：[Gateway 遠端存取](/zh-Hant/gateway/remote)、[平台中心](/zh-Hant/platforms)。

## VPS 上的共用公司代理程式

當每個使用者都在相同的信任邊界內，且該代理程式僅供商業用途時，為團隊執行單一代理程式是有效的設定。

- 請將其保留在專用的執行環境上 (VPS/VM/container + 專用 OS user/accounts)。
- 請勿將該執行環境登入個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理員設定檔。
- 如果使用者之間存在敵對關係，請依 gateway/host/OS user 進行區隔。

安全性模型詳細資訊：[安全性](/zh-Hant/gateway/security)。

## 搭配 VPS 使用節點

您可以將 Gateway 保留在雲端，並將您的本機裝置
(Mac/iOS/Android/headless) 與 **節點** 配對。節點提供本機螢幕/相機/畫布和 `system.run`
功能，而 Gateway 則停留在雲端。

文件：[節點](/zh-Hant/nodes)、[節點 CLI](/zh-Hant/cli/nodes)。

## 小型虛擬機和 ARM 主機的啟動調整

如果在低功耗虛擬機（或 ARM 主機）上感覺 CLI 指令執行緩慢，請啟用 Node 的模組編譯快取：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重複執行指令的啟動時間。
- `OPENCLAW_NO_RESPAWN=1` 可避免來自自我重生路徑的額外啟動負擔。
- 首次執行指令會預熱快取；後續執行會更快。
- 關於 Raspberry Pi 的詳細資訊，請參閱 [Raspberry Pi](/zh-Hant/install/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的虛擬機主機，建議考慮：

- 新增服務環境變數以獲得穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重啟行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 針對狀態/快取路徑，優先選用支援 SSD 的磁碟，以減少隨機 I/O 冷啟動的效能損失。

對於標準的 `openclaw onboard --install-daemon` 路徑，請編輯使用者單元：

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

如果您是刻意安裝了系統單元，請透過 `sudo systemctl edit openclaw-gateway.service` 編輯
`openclaw-gateway.service`。

`Restart=` 政策如何協助自動復原：
[systemd 可以自動化服務復原](https://www.redhat.com/en/blog/systemd-automate-recovery)。

關於 Linux OOM 行為、子程序受害者選擇和 `exit 137`
診斷，請參閱 [Linux 記憶體壓力和 OOM 終止](/zh-Hant/platforms/linux#memory-pressure-and-oom-kills)。
