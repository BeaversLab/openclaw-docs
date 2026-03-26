---
summary: "在 Linux 伺服器或雲端 VPS 上執行 OpenClaw — 提供商選擇、架構與調整"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux 伺服器"
sidebarTitle: "Linux 伺服器"
---

# Linux 伺服器

在任何 Linux 伺服器或雲端 VPS 上執行 OpenClaw Gateway。本頁面協助您選擇供應商、說明雲端部署的運作方式，並涵蓋適用於各處的通用 Linux 調整。

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
    永久免費 ARM 層級
  </Card>
  <Card title="Fly.io" href="/zh-Hant/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/zh-Hant/install/hetzner">
    Hetzner VPS 上的 Docker
  </Card>
  <Card title="GCP" href="/zh-Hant/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/zh-Hant/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/zh-Hant/install/exe-dev">
    附 HTTPS 代理的 VM
  </Card>
  <Card title="Raspberry Pi" href="/zh-Hant/install/raspberry-pi">
    ARM 自託管
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / 免費層)** 也能良好運作。
社群影片教學可於
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
取得（社群資源 — 可能會失效）。

## 雲端設定的運作方式

- **Gateway 在 VPS 上執行** 並擁有狀態與工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從筆記型電腦或手機進行連線。
- 將 VPS 視為唯一來源並定期**備份**狀態與工作區。
- 安全預設值：將 Gateway 保持在 loopback 並透過 SSH tunnel 或 Tailscale Serve 存取。
  若綁定至 `lan` 或 `tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

相關頁面：[Gateway remote access](/zh-Hant/gateway/remote)、[Platforms hub](/zh-Hant/platforms)。

## 在 VPS 上共用公司代理程式

當所有使用者都位於相同的信任邊界且代理程式僅用於業務時，為團隊執行單一代理程式是有效的設定。

- 請將其保留在專用的執行環境（VPS/VM/容器 + 專用 OS 使用者/帳戶）上。
- 請勿將該執行環境登入至個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理器設定檔。
- 若使用者之間存在潛在利益衝突，請依 gateway/host/OS 使用者進行分割。

安全模型詳細資訊：[Security](/zh-Hant/gateway/security)。

## 將節點與 VPS 搭配使用

您可以將 Gateway 保留在雲端，並將本地裝置
(Mac/iOS/Android/headless) 上的 **nodes** 進行配對。
當 Gateway 留在雲端時，Nodes 會提供本機畫面/相機/畫布 (canvas) 和 `system.run`
功能。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)。

## 小型 VM 和 ARM 主機的啟動調整

如果在低功耗 VM（或 ARM 主機）上感覺 CLI 指令執行緩慢，請啟用 Node 的模組編譯快取：

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
- 第一次執行指令會預熱快取；後續執行會更快。
- 關於 Raspberry Pi 的詳細資訊，請參閱 [Raspberry Pi](/zh-Hant/install/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的 VM 主機，建議考慮：

- 新增服務環境變數以獲得穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重新啟動行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 針對狀態/快取路徑，建議優先選用 SSD 支援的磁碟，以減少隨機 I/O 冷啟動的效能損失。

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

`Restart=` 策略如何協助自動化復原：
[systemd 可以自動化服務復原](https://www.redhat.com/en/blog/systemd-automate-recovery)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
