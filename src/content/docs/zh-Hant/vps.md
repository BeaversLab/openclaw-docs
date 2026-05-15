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

**AWS (EC2 / Lightsail / free tier)** 也運作良好。
社群影片教學可在
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
觀看（社群資源 —— 可能會變成無法使用）。

## 雲端設定的運作方式

- **Gateway 在 VPS 上執行** 並擁有狀態 + 工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從筆記型電腦或手機連線。
- 將 VPS 視為可信來源，並定期**備份** 狀態 + 工作區。
- 安全預設值：將 Gateway 保留在 loopback 上，並透過 SSH 通道或 Tailscale Serve 存取。
  如果您綁定到 `lan` 或 `tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

相關頁面：[Gateway remote access](/zh-Hant/gateway/remote)、[Platforms hub](/zh-Hant/platforms)。

## 先加強管理員存取權

在您於公開 VPS 上安裝 OpenClaw 之前，請先決定您要如何管理
該主機本身。

- 如果您只想透過 Tailnet 進行管理員存取，請先安裝 Tailscale，將 VPS
  加入您的 tailnet，透過 Tailscale IP 或
  MagicDNS 名稱驗證第二個 SSH 連線，然後限制公開 SSH。
- 如果您不使用 Tailscale，請在公開更多服務之前，對您的 SSH
  路徑套用同等的強化措施。
- 這與 Gateway 的存取是分開的。您仍然可以將 OpenClaw 綁定到
  loopback 並使用 SSH tunnel 或 Tailscale Serve 來存取儀表板。

特定於 Tailscale 的 Gateway 選項位於 [Tailscale](/zh-Hant/gateway/tailscale)。

## 在 VPS 上使用共用公司代理程式

當每個使用者都在相同的信任邊界內，且該代理程式僅用於商業用途時，為團隊執行單一代理程式是一個有效的設定。

- 將其保留在專用的執行環境（VPS/VM/container + 專用的 OS 使用者/帳戶）上。
- 請勿將該執行環境登入個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理員設定檔。
- 如果使用者之間存在潛在對立，請依 gateway/host/OS 使用者進行分割。

安全模型詳細資訊：[Security](/zh-Hant/gateway/security)。

## 將節點與 VPS 搭配使用

您可以將 Gateway 保留在雲端，並在您的本機裝置上配對 **節點**
(Mac/iOS/Android/headless)。當 Gateway 保留在雲端時，節點提供本機螢幕/攝影機/canvas 和 `system.run`
功能。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)。

## 小型 VM 和 ARM 主機的啟動調整

如果在低功率 VM（或 ARM 主機）上感覺 CLI 指令執行緩慢，請啟用 Node 的模組編譯快取：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重複指令的啟動時間。
- `OPENCLAW_NO_RESPAWN=1` 可避免來自自我重新啟動路徑的額外啟動負擔。
- 第一次執行指令會預熱快取；後續執行會比較快。
- 關於 Raspberry Pi 的細節，請參閱 [Raspberry Pi](/zh-Hant/install/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的 VM 主機，請考慮：

- 新增服務環境變數以確保穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重啟行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 針對狀態/快取路徑，優先選用 SSD 支援的磁碟，以減少隨機 I/O 冷啟動的效能損失。

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

如果您刻意安裝了系統單元，請透過 `sudo systemctl edit openclaw-gateway.service` 編輯
`openclaw-gateway.service`。

`Restart=` 策略如何有助於自動修復：
[systemd 可以自動化服務修復](https://www.redhat.com/en/blog/systemd-automate-recovery)。

關於 Linux OOM 行為、子程序受害者選擇以及 `exit 137`
診斷，請參閱 [Linux 記憶體壓力與 OOM 殺死程序](/zh-Hant/platforms/linux#memory-pressure-and-oom-kills)。

## 相關

- [安裝概覽](/zh-Hant/install)
- [DigitalOcean](/zh-Hant/install/digitalocean)
- [Fly.io](/zh-Hant/install/fly)
- [Hetzner](/zh-Hant/install/hetzner)
