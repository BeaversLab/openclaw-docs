---
summary: "在 Linux 伺服器或雲端 VPS 上執行 OpenClaw — 供應商選擇、架構與調優"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux 伺服器"
sidebarTitle: "Linux 伺服器"
---

在任何 Linux 伺服器或雲端 VPS 上執行 OpenClaw Gateway。本頁面協助您選擇供應商、說明雲端部署的運作方式，並涵蓋適用於任何地方的通用 Linux 調校。

## 選擇供應商

<CardGroup cols={2}>
  <Card title="Railway" href="/zh-Hant/install/railway">
    一鍵、瀏覽器設定
  </Card>
  <Card title="Northflank" href="/zh-Hant/install/northflank">
    一鍵、瀏覽器設定
  </Card>
  <Card title="DigitalOcean" href="/zh-Hant/install/digitalocean">
    簡單付費 VPS
  </Card>
  <Card title="Oracle Cloud" href="/zh-Hant/install/oracle">
    Always Free ARM 層級
  </Card>
  <Card title="Fly.io" href="/zh-Hant/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh-Hant/install/hetzner">
    在 Hetzner VPS 上使用 Docker
  </Card>
  <Card title="Hostinger" href="/zh-Hant/install/hostinger">
    一鍵設定的 VPS
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

**AWS (EC2 / Lightsail / free tier)** 也能良好運作。
社群影片教學可在以下網址取得：
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(社群資源 -- 可能會變成無法使用)。

## 雲端設定的運作方式

- **Gateway 在 VPS 上執行** 並擁有狀態 + 工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從筆記型電腦或手機連線。
- 將 VPS 視為可信來源，並定期**備份** 狀態 + 工作區。
- 安全預設值：將 Gateway 保留在 loopback 上，並透過 SSH 通道或 Tailscale Serve 存取。
  如果您綁定到 `lan` 或 `tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

相關頁面：[Gateway remote access](/zh-Hant/gateway/remote)、[Platforms hub](/zh-Hant/platforms)。

## 在 VPS 上共享的公司 Agent

當每位使用者都處於相同的信任邊界，且該 Agent 僅供業務使用時，為團隊執行單一 Agent 是一個有效的設定。

- 請將其保留在專用的執行環境（VPS/VM/容器 + 專用 OS 使用者/帳戶）中。
- 請勿使用該執行環境登入個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理器設定檔。
- 如果使用者之間存在相互競爭關係，請依照 Gateway/主機/OS 使用者進行拆分。

安全模型詳細資訊：[Security](/zh-Hant/gateway/security)。

## 搭配 VPS 使用節點

您可以將 Gateway 保留在雲端，並在您的本機裝置上配對**節點**（Mac/iOS/Android/headless）。節點提供本機畫面/相機/畫布和 `system.run`
功能，而 Gateway 則停留在雲端。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)。

## 小型 VM 和 ARM 主機的啟動調整

如果在低功率 VM（或 ARM 主機）上執行 CLI 指令感覺緩慢，請啟用 Node 的模組編譯快取：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重複執行指令的啟動時間。
- `OPENCLAW_NO_RESPAWN=1` 可避免來自自我重新啟動路徑的額外啟動負擔。
- 首次執行指令會預熱快取，後續執行會更快。
- 關於 Raspberry Pi 的詳細資訊，請參閱 [Raspberry Pi](/zh-Hant/install/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的 VM 主機，請考慮：

- 新增服務環境變數以確保穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重新啟動行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 對於狀態/快取路徑，建議優先使用 SSD 支援的磁碟，以減少隨機 I/O 冷啟動的效能損失。

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

如果您特意安裝了系統單元，請透過 `sudo systemctl edit openclaw-gateway.service` 編輯
`openclaw-gateway.service`。

`Restart=` 策略如何幫助自動恢復：
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery)。

關於 Linux OOM 行為、子進程受害者選擇以及 `exit 137`
診斷，請參閱 [Linux memory pressure and OOM kills](/zh-Hant/platforms/linux#memory-pressure-and-oom-kills)。

## 相關

- [Install overview](/zh-Hant/install)
- [DigitalOcean](/zh-Hant/install/digitalocean)
- [Fly.io](/zh-Hant/install/fly)
- [Hetzner](/zh-Hant/install/hetzner)
