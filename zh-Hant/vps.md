---
summary: "OpenClaw 的 VPS 託管中心 (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - 您想在雲端中執行 Gateway
  - 您需要 VPS/託管指南的快速地圖
title: "VPS 託管"
---

# VPS 託管

此中心連結至支援的 VPS/託管指南，並從高階層面說明雲端部署運作方式。

## 選擇供應商

- **Railway** (一鍵 + 瀏覽器設定)： [Railway](/zh-Hant/install/railway)
- **Northflank** (一鍵 + 瀏覽器設定)： [Northflank](/zh-Hant/install/northflank)
- **Oracle Cloud (Always Free)**： [Oracle](/zh-Hant/platforms/oracle) — $0/月 (Always Free，ARM；容量/註冊可能比較棘手)
- **Fly.io**： [Fly.io](/zh-Hant/install/fly)
- **Hetzner (Docker)**： [Hetzner](/zh-Hant/install/hetzner)
- **GCP (Compute Engine)**： [GCP](/zh-Hant/install/gcp)
- **exe.dev** (VM + HTTPS 代理)： [exe.dev](/zh-Hant/install/exe-dev)
- **AWS (EC2/Lightsail/free tier)**： 效果也很好。影片指南：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 雲端設定如何運作

- **Gateway 在 VPS 上執行** 並擁有狀態 + 工作區。
- 您可以透過 **Control UI** 或 **Tailscale/SSH** 從您的筆記型電腦/手機連線。
- 將 VPS 視為事實來源，並 **備份** 狀態 + 工作區。
- 安全的預設值： 將 Gateway 保持在 loopback 上，並透過 SSH tunnel 或 Tailscale Serve 存取。
  如果您綁定到 `lan`/`tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

遠端存取： [Gateway remote](/zh-Hant/gateway/remote)  
平台中心： [Platforms](/zh-Hant/platforms)

## VPS 上的共用公司代理程式

當使用者位於同一個信任邊界 (例如一個公司團隊) 中，且代理程式僅供業務使用時，這是一個有效的設定。

- 將其保留在專用的執行環境 (VPS/VM/容器 + 專用的 OS 使用者/帳戶) 上。
- 不要使用該執行環境登入個人 Apple/Google 帳戶或個人瀏覽器/密碼管理器設定檔。
- 如果使用者之間存在對立關係，請依照 gateway/host/OS 使用者進行分割。

安全模型詳細資訊： [Security](/zh-Hant/gateway/security)

## 搭配 VPS 使用節點

您可以將 Gateway 保留在雲端，並在您的本機裝置
(Mac/iOS/Android/headless) 上配對 **nodes**。Nodes 提供本機螢幕/相機/canvas 和 `system.run`
功能，而 Gateway 則保持在雲端。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)

## 針對小型 VM 和 ARM 主機的啟動調整

如果 CLI 指令在低功耗 VM（或 ARM 主機）上感覺緩慢，請啟用 Node 的模組編譯快取：

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
- 首次執行指令會預熱快取；後續執行會更快。
- 關於 Raspberry Pi 的具體細節，請參閱 [Raspberry Pi](/zh-Hant/platforms/raspberry-pi)。

### systemd 調整檢查清單（選用）

對於使用 `systemd` 的 VM 主機，請考慮：

- 新增服務環境變數以確保穩定的啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重新啟動行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 狀態/快取路徑建議優先使用 SSD 支援的磁碟，以減少隨機 I/O 冷啟動的效能損失。

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

`Restart=` 政策如何協助自動復原：
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery)。

import en from "/components/footer/en.mdx";

<en />
