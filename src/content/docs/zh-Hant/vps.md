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
  <Card title="Railway" href="/en/install/railway">
    單鍵、瀏覽器設定
  </Card>
  <Card title="Northflank" href="/en/install/northflank">
    單鍵、瀏覽器設定
  </Card>
  <Card title="DigitalOcean" href="/en/install/digitalocean">
    簡單付費 VPS
  </Card>
  <Card title="Oracle Cloud" href="/en/install/oracle">
    永遠免費 ARM 層級
  </Card>
  <Card title="Fly.io" href="/en/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/en/install/hetzner">
    Hetzner VPS 上的 Docker
  </Card>
  <Card title="GCP" href="/en/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/en/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/en/install/exe-dev">
    VM with HTTPS proxy
  </Card>
  <Card title="Raspberry Pi" href="/en/install/raspberry-pi">
    ARM self-hosted
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免費層)** 也運作良好。
社群影片教學位於
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
（社群資源 — 可能會失效）。

## 雲端設定的運作方式

- **Gateway 在 VPS 上執行** 並擁有狀態 + 工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從您的筆記型電腦或手機進行連線。
- 將 VPS 視為事實來源，並定期**備份**狀態 + 工作區。
- 安全預設值：將 Gateway 保持在 loopback 介面並透過 SSH tunnel 或 Tailscale Serve 存取。
  若您繫結到 `lan` 或 `tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

相關頁面：[Gateway remote access](/en/gateway/remote)、[Platforms hub](/en/platforms)。

## VPS 上的共享公司代理程式

當每位使用者都處於相同的信任邊界且該代理程式僅供商業用途時，為團隊執行單一代理程式是一個有效的設定。

- 請將其保留在專用的執行環境上（VPS/VM/container + 專用的 OS 使用者/帳戶）。
- 請勿將該執行環境登入至個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理員設定檔。
- 如果使用者之間存在潛在衝突，請依照 gateway/host/OS 使用者進行分割。

安全性模型詳情：[Security](/en/gateway/security)。

## 搭配 VPS 使用節點

您可以將 Gateway 保留在雲端，並在您的本地裝置
(Mac/iOS/Android/headless) 上配對 **節點** (nodes)。當 Gateway 保留在雲端時，節點會提供本機的螢幕/相機/畫布 和 `system.run`
功能。

文件：[Nodes](/en/nodes)、[Nodes CLI](/en/cli/nodes)。

## 小型 VM 和 ARM 主機的啟動調整

如果在低功率 VM（或 ARM 主機）上執行 CLI 指令感到緩慢，請啟用 Node 的模組編譯快取：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重複執行指令的啟動時間。
- `OPENCLAW_NO_RESPAWN=1` 可避免來自查自重啟路徑的額外啟動負擔。
- 首次執行指令會預熱快取；後續的執行會更快。
- 關於 Raspberry Pi 的細節，請參閱 [Raspberry Pi](/en/install/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的 VM 主機，請考慮：

- 新增服務環境變數以獲得穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重啟行為的明確性：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 對於狀態/快取路徑，建議優先使用支援 SSD 的磁碟，以減少隨機 I/O 冷啟動的效能損失。

範例：

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

`Restart=` 政策如何幫助自動恢復：
[systemd 可以自動化服務恢復](https://www.redhat.com/en/blog/systemd-automate-recovery)。
