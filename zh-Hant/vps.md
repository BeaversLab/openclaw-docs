---
summary: "OpenClaw 的 VPS 託管中心 (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "VPS 託管"
---

# VPS 託管

此中心連結至支援的 VPS/託管指南，並從高層級說明雲端部署的運作方式。

## 選擇提供商

- **Railway** (一鍵 + 瀏覽器設定)： [Railway](/zh-Hant/install/railway)
- **Northflank** (一鍵 + 瀏覽器設定)： [Northflank](/zh-Hant/install/northflank)
- **Oracle Cloud (Always Free)**： [Oracle](/zh-Hant/platforms/oracle) — $0/月 (Always Free，ARM；容量/註冊可能較為棘手)
- **Fly.io**： [Fly.io](/zh-Hant/install/fly)
- **Hetzner (Docker)**： [Hetzner](/zh-Hant/install/hetzner)
- **GCP (Compute Engine)**： [GCP](/zh-Hant/install/gcp)
- **exe.dev** (VM + HTTPS 代理)： [exe.dev](/zh-Hant/install/exe-dev)
- **AWS (EC2/Lightsail/免費層)**：也運作良好。影片指南：
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## 雲端設定運作方式

- **Gateway 在 VPS 上執行** 並擁有狀態 + 工作區。
- 您可以透過 **控制 UI** 或 **Tailscale/SSH** 從筆記型電腦/手機連線。
- 將 VPS 視為事實來源，並 **備份** 狀態 + 工作區。
- 安全預設值：將 Gateway 保持在 loopback 並透過 SSH 通道或 Tailscale Serve 存取。
  若您綁定至 `lan`/`tailnet`，請要求 `gateway.auth.token` 或 `gateway.auth.password`。

遠端存取： [Gateway remote](/zh-Hant/gateway/remote)  
平台中心： [Platforms](/zh-Hant/platforms)

## VPS 上的共用公司代理程式

當使用者位於同一個信任邊界 (例如一個公司團隊) 時，這是一個有效的設定，且代理程式僅供商業用途。

- 將其保留在專用的執行環境 (VPS/VM/容器 + 專用 OS 使用者/帳戶)。
- 請勿將該執行環境登入個人的 Apple/Google 帳戶或個人的瀏覽器/密碼管理員設定檔。
- 如果使用者之間存在對立關係，請依 gateway/host/OS 使用者進行區隔。

安全性模型詳細資訊： [Security](/zh-Hant/gateway/security)

## 搭配 VPS 使用節點

您可以將 Gateway 保留在雲端，並在您的本地裝置（Mac/iOS/Android/headless）上配對 **nodes**。Nodes 提供本地螢幕/相機/畫布和 `system.run` 功能，而 Gateway 則留在雲端。

文件：[Nodes](/zh-Hant/nodes)、[Nodes CLI](/zh-Hant/cli/nodes)

## 小型虛擬機和 ARM 主機的啟動調整

如果 CLI 指令在低功耗虛擬機（或 ARM 主機）上感覺緩慢，請啟用 Node 的模組編譯快取：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` 可改善重複指令的啟動時間。
- `OPENCLAW_NO_RESPAWN=1` 可避免來自自重新生成路徑的額外啟動負擔。
- 首次執行指令會預熱快取；後續執行會更快。
- 關於 Raspberry Pi 的具體細節，請參閱 [Raspberry Pi](/zh-Hant/platforms/raspberry-pi)。

### systemd 調整檢查清單（可選）

對於使用 `systemd` 的虛擬機主機，請考慮：

- 新增服務環境變數以穩定啟動路徑：
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- 保持重新啟動行為明確：
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- 對於狀態/快取路徑，建議優先使用 SSD 支援的磁碟，以減少隨機 I/O 冷啟動的效能損失。

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

`Restart=` 策略如何協助自動復原：
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
