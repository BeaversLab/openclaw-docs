---
title: Fly.io
description: 在 Fly.io 上部署 OpenClaw
---

# Fly.io 部署

**目標：** 在具有持久存儲、自動 HTTPS 和 Discord/頻道存取權限的 [Fly.io](https://fly.io) 機器上運行 OpenClaw Gateway。

## 您需要的東西

- 已安裝 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 帳戶（免費層級即可）
- 模型身份驗證：Anthropic API 金鑰（或其他供應商金鑰）
- 頻道憑證：Discord bot token、Telegram token 等。

## 初學者快速路徑

1. 複製儲存庫 → 自訂 `fly.toml`
2. 建立應用程式 + 磁碟區 → 設定機密
3. 使用 `fly deploy` 部署
4. SSH 進去建立配置或使用 Control UI

## 1) 建立 Fly 應用程式

```bash
# Clone the repo
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Create a new Fly app (pick your own name)
fly apps create my-openclaw

# Create a persistent volume (1GB is usually enough)
fly volumes create openclaw_data --size 1 --region iad
```

**提示：** 選擇一個靠近您的區域。常見選項：`lhr` (倫敦)、`iad` (維吉尼亞州)、`sjc` (聖荷西)。

## 2) 設定 fly.toml

編輯 `fly.toml` 以符合您的應用程式名稱和需求。

**安全說明：** 預設配置會公開 URL。對於沒有公開 IP 的強化部署，請參閱 [私有部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

```toml
app = "my-openclaw"  # Your app name
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  OPENCLAW_PREFER_PNPM = "1"
  OPENCLAW_STATE_DIR = "/data"
  NODE_OPTIONS = "--max-old-space-size=1536"

[processes]
  app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[vm]]
  size = "shared-cpu-2x"
  memory = "2048mb"

[mounts]
  source = "openclaw_data"
  destination = "/data"
```

**關鍵設定：**

| 設定                        | 原因                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `--bind lan`                   | 綁定到 `0.0.0.0` 以便 Fly 的代理可以連接到 gateway                     |
| `--allow-unconfigured`         | 在沒有配置檔案的情況下啟動（您之後會建立一個）                      |
| `internal_port = 3000`         | 必須符合 `--port 3000` (或 `OPENCLAW_GATEWAY_PORT`) 才能進行 Fly 健康檢查 |
| `memory = "2048mb"`            | 512MB 太小；建議使用 2GB                                         |
| `OPENCLAW_STATE_DIR = "/data"` | 在磁碟區上保存狀態                                                |

## 3) 設定機密

```bash
# Required: Gateway token (for non-loopback binding)
fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

# Model provider API keys
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Optional: Other providers
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_API_KEY=...

# Channel tokens
fly secrets set DISCORD_BOT_TOKEN=MTQ...
```

**說明：**

- 非回環綁定 (`--bind lan`) 為了安全需要 `OPENCLAW_GATEWAY_TOKEN`。
- 將這些 token 視為密碼處理。
- **針對所有 API 金鑰和 token，優先使用環境變數而非配置檔案**。這可以保持機密不進入 `openclaw.json`，以免被意外洩露或記錄。

## 4) 部署

```bash
fly deploy
```

首次部署會建置 Docker 映像檔（約 2-3 分鐘）。後續部署會更快。

部署後，驗證：

```bash
fly status
fly logs
```

您應該會看到：

```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) 建立配置檔案

SSH 進入機器以建立適當的配置：

```bash
fly ssh console
```

建立設定目錄與檔案：

```bash
mkdir -p /data
cat > /data/openclaw.json << 'EOF'
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-5",
        "fallbacks": ["anthropic/claude-sonnet-4-5", "openai/gpt-4o"]
      },
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "main",
        "default": true
      }
    ]
  },
  "auth": {
    "profiles": {
      "anthropic:default": { "mode": "token", "provider": "anthropic" },
      "openai:default": { "mode": "token", "provider": "openai" }
    }
  },
  "bindings": [
    {
      "agentId": "main",
      "match": { "channel": "discord" }
    }
  ],
  "channels": {
    "discord": {
      "enabled": true,
      "groupPolicy": "allowlist",
      "guilds": {
        "YOUR_GUILD_ID": {
          "channels": { "general": { "allow": true } },
          "requireMention": false
        }
      }
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "auto"
  },
  "meta": {
    "lastTouchedVersion": "2026.1.29"
  }
}
EOF
```

**注意：** 使用 `OPENCLAW_STATE_DIR=/data` 時，設定路徑為 `/data/openclaw.json`。

**注意：** Discord 權杖可以來自以下任一來源：

- 環境變數：`DISCORD_BOT_TOKEN`（建議用於機密資訊）
- 設定檔：`channels.discord.token`

如果使用環境變數，則不需要將權杖加入設定檔。閘道會自動讀取 `DISCORD_BOT_TOKEN`。

重新啟動以套用變更：

```bash
exit
fly machine restart <machine-id>
```

## 6) 存取閘道

### 控制介面

在瀏覽器中開啟：

```bash
fly open
```

或前往 `https://my-openclaw.fly.dev/`

貼上您的閘道權杖（來自 `OPENCLAW_GATEWAY_TOKEN` 的那一個）以進行驗證。

### 日誌

```bash
fly logs              # Live logs
fly logs --no-tail    # Recent logs
```

### SSH 主控台

```bash
fly ssh console
```

## 疑難排解

### "應用程式未在預期位址上監聽"

閘道正綁定至 `127.0.0.1` 而非 `0.0.0.0`。

**解決方法：** 在 `fly.toml` 的程序指令中加入 `--bind lan`。

### 健康檢查失敗 / 連線被拒

Fly 無法在設定的連接埠連上閘道。

**解決方法：** 確認 `internal_port` 符合閘道連接埠（設定 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 記憶體問題

容器持續重啟或被終止。徵兆：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或無聲重啟。

**解決方法：** 在 `fly.toml` 中增加記憶體：

```toml
[[vm]]
  memory = "2048mb"
```

或更新現有的機器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可行，但在負載下或啟用詳細記錄時可能會 OOM。**建議使用 2GB。**

### 閘道鎖定問題

閘道因「already running」（已執行中）錯誤而拒絕啟動。

當容器重啟但 PID 鎖定檔仍保留在磁碟區上時，會發生這種情況。

**解決方法：** 刪除鎖定檔：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

鎖定檔位於 `/data/gateway.*.lock`（不在子目錄中）。

### 未讀取設定

如果使用 `--allow-unconfigured`，閘道會建立一個最小設定。您位於 `/data/openclaw.json` 的自訂設定應該會在重啟時被讀取。

驗證設定是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 透過 SSH 寫入設定

`fly ssh console -C` 指令不支援 Shell 重新導向。若要寫入設定檔：

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** 如果檔案已存在，`fly sftp` 可能會失敗。請先刪除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 狀態未持久化

如果您在重新啟動後丟失了憑證或會話，那是因為狀態目錄正在寫入容器檔案系統。

**解決方法：** 確保在 `fly.toml` 中設定了 `OPENCLAW_STATE_DIR=/data` 並重新部署。

## 更新

```bash
# Pull latest changes
git pull

# Redeploy
fly deploy

# Check health
fly status
fly logs
```

### 更新機器指令

如果您需要在沒有完全重新部署的情況下變更啟動指令：

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之後，機器指令可能會重置為 `fly.toml` 中的內容。如果您進行了手動變更，請在部署後重新套用它們。

## 私有部署（強化版）

預設情況下，Fly 會分配公用 IP，使您的閘道可透過 `https://your-app.fly.dev` 存取。這很方便，但意味著您的部署可能會被網路掃描器（Shodan、Censys 等）發現。

若要進行**沒有公開暴露**的強化部署，請使用私有範本。

### 何時使用私有部署

- 您僅發出**輸出**呼叫/訊息（沒有輸入 webhook）
- 您對任何 webhook 回調使用 **ngrok 或 Tailscale** 隧道
- 您透過 **SSH、Proxy 或 WireGuard** 而非瀏覽器存取閘道
- 您希望部署**對網路掃描器隱藏**

### 設定

使用 `fly.private.toml` 代替標準設定：

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

或轉換現有部署：

```bash
# List current IPs
fly ips list -a my-openclaw

# Release public IPs
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# Switch to private config so future deploys don't re-allocate public IPs
# (remove [http_service] or deploy with the private template)
fly deploy -c fly.private.toml

# Allocate private-only IPv6
fly ips allocate-v6 --private -a my-openclaw
```

在此之後，`fly ips list` 應僅顯示 `private` 類型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 存取私有部署

由於沒有公用 URL，請使用以下方法之一：

**選項 1：本機 Proxy（最簡單）**

```bash
# Forward local port 3000 to the app
fly proxy 3000:3000 -a my-openclaw

# Then open http://localhost:3000 in browser
```

**選項 2：WireGuard VPN**

```bash
# Create WireGuard config (one-time)
fly wireguard create

# Import to WireGuard client, then access via internal IPv6
# Example: http://[fdaa:x:x:x:x::x]:3000
```

**選項 3：僅限 SSH**

```bash
fly ssh console -a my-openclaw
```

### 使用私有部署的 Webhook

如果您需要在沒有公開暴露的情況下進行 webhook 回調（Twilio、Telnyx 等）：

1. **ngrok 隧道** - 在容器內或作為 sidecar 運行 ngrok
2. **Tailscale Funnel** - 透過 Tailscale 暴露特定路徑
3. **僅輸出** - 某些提供者（Twilio）可以在沒有 webhook 的情況下正常進行輸出呼叫

使用 ngrok 的語音通話設定範例：

```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "tunnel": { "provider": "ngrok" },
          "webhookSecurity": {
            "allowedHosts": ["example.ngrok.app"]
          }
        }
      }
    }
  }
}
```

ngrok 隧道在容器內運行，並提供公開的 webhook URL，而不會暴露 Fly 應用程式本身。將 `webhookSecurity.allowedHosts` 設定為公開隧道主機名稱，以便接受轉送的主機標頭。

### 安全性優勢

| 方面            | 公開       | 私有    |
| ----------------- | ------------ | ---------- |
| 網路掃描器 | 可被發現 | 隱藏     |
| 直接攻擊    | 可能     | 已封鎖    |
| 控制 UI 存取 | 瀏覽器      | Proxy/VPN  |
| Webhook 傳遞  | 直接       | 透過隧道 |

## 備註

- Fly.io 使用 **x86 架構** (非 ARM)
- Dockerfile 相容這兩種架構
- 若是 WhatsApp/Telegram 註冊，請使用 `fly ssh console`
- 持久資料位於 `/data` 的磁碟區上
- Signal 需要 Java + signal-cli；請使用自訂映像檔並將記憶體保持在 2GB 以上。

## 費用

使用建議設定 (`shared-cpu-2x`, 2GB RAM)：

- 視使用量而定，約為 $10-15/月
- 免費層包含部分配額

詳情請見 [Fly.io 定價](https://fly.io/docs/about/pricing/)。

import en from "/components/footer/en.mdx";

<en />
