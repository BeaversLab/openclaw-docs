---
title: Fly.io
summary: "在 Fly.io 上逐步部署 OpenClaw，包含持久化存儲與 HTTPS"
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

# Fly.io 部署

**目標：** 在一台 [Fly.io](https://fly.io) 機器上運行 OpenClaw Gateway，具備持久化存儲、自動 HTTPS 以及 Discord/頻道存取權限。

## 所需準備

- 已安裝 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 帳號（免費層級即可）
- 模型驗證：您選擇的模型提供商的 API 金鑰
- 頻道憑證：Discord bot 權杖、Telegram 權杖等。

## 新手快速入門

1. 複製儲存庫 → 自訂 `fly.toml`
2. 建立 App + 儲存卷 → 設定密鑰
3. 使用 `fly deploy` 進行部署
4. 使用 SSH 建立設定或使用控制 UI

<Steps>
  <Step title="建立 Fly 應用程式">
    ```bash
    # Clone the repo
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # Create a new Fly app (pick your own name)
    fly apps create my-openclaw

    # Create a persistent volume (1GB is usually enough)
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：** 選擇一個靠近您的區域。常見選項：`lhr` (倫敦)、`iad` (維吉尼亞)、`sjc` (聖荷西)。

  </Step>

  <Step title="Configure fly.toml">
    編輯 `fly.toml` 以符合您的應用程式名稱和需求。

    **安全提示：** 預設配置會公開網址。若要進行沒有公開 IP 的強化部署，請參閱 [Private Deployment](#private-deployment-hardened) 或使用 `fly.private.toml`。

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
    | `--bind lan`                   | 繫結到 `0.0.0.0` 以便 Fly 的 Proxy 能連接到 Gateway                     |
    | `--allow-unconfigured`         | 在沒有配置檔案的情況下啟動（您之後會建立一個）                      |
    | `internal_port = 3000`         | 必須符合 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）才能通過 Fly 健康檢查 |
    | `memory = "2048mb"`            | 512MB 太小；建議 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在 Volume 上持續儲存狀態                                                |

  </Step>

  <Step title="設定機密">
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

    **備註：**

    - 非回環綁定 (`--bind lan`) 為了安全需要 `OPENCLAW_GATEWAY_TOKEN`。
    - 請像處理密碼一樣對待這些權杖。
    - 對於所有 API 金鑰和權杖，**優先使用環境變數而非設定檔**。這可以讓機密資料遠離 `openclaw.json`，避免其意外暴露或被記錄。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署會建置 Docker 映像檔（約 2-3 分鐘）。後續的部署會更快。

    部署完成後，請驗證：

    ```bash
    fly status
    fly logs
    ```

    您應該會看到：

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="建立設定檔">
    透過 SSH 連線至機器以建立適當的設定：

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
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-4o"]
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
      "meta": {}
    }
    EOF
    ```

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 時，設定路徑為 `/data/openclaw.json`。

    **注意：** Discord 權杖可以來自以下任一來源：

    - 環境變數：`DISCORD_BOT_TOKEN`（建議用於機密資訊）
    - 設定檔：`channels.discord.token`

    如果使用環境變數，則無需將權杖加入設定檔。閘道會自動讀取 `DISCORD_BOT_TOKEN`。

    重新啟動以套用變更：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="存取 Gateway">
    ### 控制介面 (Control UI)

    在瀏覽器中開啟：

    ```bash
    fly open
    ```

    或訪問 `https://my-openclaw.fly.dev/`

    貼上您的 gateway token（來自 `OPENCLAW_GATEWAY_TOKEN` 的那一個）以進行驗證。

    ### 記錄檔 (Logs)

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### SSH 主控台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 疑難排解

### "App is not listening on expected address"

Gateway 正在綁定到 `127.0.0.1` 而不是 `0.0.0.0`。

**修復方法：** 在 `fly.toml` 中的程序指令中新增 `--bind lan`。

### 健康檢查失敗 / 連線被拒

Fly 無法在設定的連接埠上連線到 Gateway。

**修復方法：** 確保 `internal_port` 符合 gateway 連接埠（設定 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 記憶體問題

容器不斷重啟或被終止。跡象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或靜默重啟。

**修復方法：** 在 `fly.toml` 中增加記憶體：

```toml
[[vm]]
  memory = "2048mb"
```

或更新現有機器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可行，但在負載下或使用詳細日誌時可能會 OOM。**建議使用 2GB。**

### Gateway 鎖定問題

Gateway 拒絕啟動並顯示「already running」錯誤。

當容器重啟但 PID 鎖定檔案仍保留在卷上時，會發生這種情況。

**修復方法：** 刪除鎖定檔案：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

鎖定檔案位於 `/data/gateway.*.lock`（不在子目錄中）。

### 未讀取配置

如果使用 `--allow-unconfigured`，Gateway 會建立最小配置。位於 `/data/openclaw.json` 的自訂配置應在重啟時讀取。

驗證配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 透過 SSH 撰寫配置

`fly ssh console -C` 指令不支援 shell 重導向（redirection）。若要寫入設定檔：

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** 如果檔案已存在，`fly sftp` 可能會失敗。請先刪除檔案：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 狀態未持久化

如果您在重新啟動後遺失了憑證或工作階段（session），那是因為狀態目錄正在寫入容器檔案系統。

**解決方法：** 確認已在 `fly.toml` 中設定 `OPENCLAW_STATE_DIR=/data` 並重新部署。

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

如果您需要在不進行完整重新部署的情況下變更啟動指令：

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 執行 `fly deploy` 後，機器指令可能會重設為 `fly.toml` 中的設定。如果您進行了手動變更，請在部署後重新套用。

## 私有部署

預設情況下，Fly 會分配公有 IP，讓您的閘道可以透過 `https://your-app.fly.dev` 存取。這很方便，但也代表您的部署可能被網路掃描器（如 Shodan、Censys 等）發現。

若要進行**沒有公開暴露**的強化部署，請使用私有範本。

### 何時使用私有部署

- 您只進行**出站**呼叫/訊息（沒有入站 webhook）
- 您使用 **ngrok 或 Tailscale** 隧道進行任何 webhook 回呼
- 您透過 **SSH、Proxy 或 WireGuard** 而非瀏覽器來存取閘道
- 您希望部署**對網路掃描器隱藏**

### 設定

使用 `fly.private.toml` 取代標準設定：

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

或是轉換現有的部署：

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

在此之後，`fly ips list` 應該只會顯示 `private` 類型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 存取私有部署

由於沒有公開的 URL，請使用以下其中一種方法：

**選項 1：本機代理（最簡單）**

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

### 私人部署的 Webhook

如果您需要在無需公開暴露的情況下接收 Webhook 回調（Twilio、Telnyx 等）：

1. **ngrok 隧道** - 在容器內或作為 sidecar 執行 ngrok
2. **Tailscale Funnel** - 透過 Tailscale 公開特定路徑
3. **僅限出站** - 部分提供商（如 Twilio）即使沒有 Webhook 也能正常進行出站呼叫

使用 ngrok 的語音通話設定範例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

ngrok 隧道在容器內執行，並提供公開的 Webhook URL，而無需暴露 Fly 應用程式本身。將 `webhookSecurity.allowedHosts` 設定為公開的隧道主機名稱，以便接受轉送的主機標頭。

### 安全性優勢

| 面向         | 公開     | 私人     |
| ------------ | -------- | -------- |
| 網路掃描器   | 可被發現 | 隱藏     |
| 直接攻擊     | 可能     | 已封鎖   |
| 控制 UI 存取 | 瀏覽器   | 代理/VPN |
| Webhook 傳送 | 直接     | 透過隧道 |

## 註記

- Fly.io 使用 **x86 架構**（非 ARM）
- 此 Dockerfile 相容於這兩種架構
- 若要進行 WhatsApp/Telegram 註冊，請使用 `fly ssh console`
- 持久化資料儲存於磁碟區的 `/data`
- Signal 需要 Java + signal-cli；請使用自訂映像檔並將記憶體保持在 2GB 以上。

## 成本

使用推薦設定（`shared-cpu-2x`、2GB RAM）：

- 視使用量而定，約每月 $10-15
- 免費方案包含一定的配額

詳情請參閱 [Fly.io 定價](https://fly.io/docs/about/pricing/)。

## 下一步

- 設定訊息頻道：[頻道](/zh-Hant/channels)
- 設定 Gateway：[Gateway 設定](/zh-Hant/gateway/configuration)
- 保持 OpenClaw 為最新狀態：[更新](/zh-Hant/install/updating)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
