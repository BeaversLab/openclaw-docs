---
summary: "OpenClaw 在 Fly.io 上進行具有持久化儲存和 HTTPS 的逐步部署"
title: Fly.io
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

**目標：** 在 [Fly.io](https://fly.io) 機器上運行具有持久存儲、自動 HTTPS 和 Discord/通道訪問權限的 OpenClaw Gateway。

## 您需要什麼

- 已安裝 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 帳戶（免費層即可）
- 模型認證：您選擇的模型提供商的 API 密鑰
- 通道憑證：Discord 機器人令牌、Telegram 令牌等

## 初學者快速路徑

1. Clone repo → 自訂 `fly.toml`
2. 建立 app + volume → 設定 secrets
3. 使用 `fly deploy` 部署
4. SSH 進入以建立配置或使用 Control UI

<Steps>
  <Step title="建立 Fly app">
    ```bash
    # Clone the repo
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # Create a new Fly app (pick your own name)
    fly apps create my-openclaw

    # Create a persistent volume (1GB is usually enough)
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：** 選擇一個離您較近的區域。常見選項：`lhr` (倫敦)、`iad` (維吉尼亞州)、`sjc` (聖荷西)。

  </Step>

  <Step title="設定 fly.toml">
    編輯 `fly.toml` 以符合您的 app 名稱和需求。

    **安全提示：** 預設配置會公開 URL。若要進行沒有公開 IP 的強化部署，請參閱 [Private Deployment](#private-deployment-hardened) 或使用 `deploy/fly.private.toml`。

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

    OpenClaw Docker 映像檔使用 `tini` 作為其進入點。Fly 程序指令會取代 Docker `CMD` 而不取代 `ENTRYPOINT`，因此程序仍在 `tini` 下運行。

    **關鍵設定：**

    | 設定                        | 原因                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 綁定到 `0.0.0.0` 以便 Fly 的代理可以存取 gateway                     |
    | `--allow-unconfigured`         | 在沒有配置檔案的情況下啟動（您稍後會建立一個）                      |
    | `internal_port = 3000`         | 必須符合 `--port 3000` (或 `OPENCLAW_GATEWAY_PORT`) 才能通過 Fly 健康檢查 |
    | `memory = "2048mb"`            | 512MB 太小；建議使用 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在 volume 上保存狀態                                                |

  </Step>

  <Step title="設定金鑰">
    ```bash
    # Required: Gateway token (for non-loopback binding)
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # Model provider API keys
    fly secrets set ANTHROPIC_API_KEY=example-anthropic-key-not-real

    # Optional: Other providers
    fly secrets set OPENAI_API_KEY=example-openai-key-not-real
    fly secrets set GOOGLE_API_KEY=...

    # Channel tokens
    fly secrets set DISCORD_BOT_TOKEN=example-discord-bot-token
    ```

    **備註：**

    - 非迴路綁定 (`--bind lan`) 需要有效的 Gateway Auth Path。此 Fly.io 範例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正確設定的非迴路 `trusted-proxy` 部署也符合需求。
    - 請將這些權杖視為密碼處理。
    - 針對所有 API 金鑰與權杖，**優先使用環境變數而非設定檔**。這能將金鑰保持在 `openclaw.json` 之外，避免意外外洩或被記錄。

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
    SSH 連入機器以建立正確的設定：

    ```bash
    fly ssh console
    ```

    建立設定目錄和檔案：

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]
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
        "bind": "auto",
        "controlUi": {
          "allowedOrigins": [
            "https://my-openclaw.fly.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
          ]
        }
      },
      "meta": {}
    }
    EOF
    ```

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 時，設定路徑為 `/data/openclaw.json`。

    **注意：** 將 `https://my-openclaw.fly.dev` 替換為您真實的 Fly 應用程式來源。閘道啟動時會從執行時的 `--bind` 和 `--port` 值植入本機 Control UI 的來源，以便在設定存在之前進行首次啟動，但透過 Fly 的瀏覽器存取仍需要 `gateway.controlUi.allowedOrigins` 中列出的確切 HTTPS 來源。

    **注意：** Discord 令牌可以來自以下任一來源：

    - 環境變數：`DISCORD_BOT_TOKEN`（建議用於機密）
    - 設定檔：`channels.discord.token`

    如果使用環境變數，則無需將令牌加入設定中。閘道會自動讀取 `DISCORD_BOT_TOKEN`。

    重新啟動以套用變更：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="存取 Gateway">
    ### 控制介面

    在瀏覽器中開啟：

    ```bash
    fly open
    ```

    或造訪 `https://my-openclaw.fly.dev/`

    使用設定的共用金鑰進行驗證。本指南使用來自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway
    token；如果您切換到密碼驗證，請改用該密碼。

    ### 日誌

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

Gateway 正在綁定 `127.0.0.1` 而非 `0.0.0.0`。

**修正方法：** 在 `fly.toml` 的程序指令中新增 `--bind lan`。

### Health checks failing / connection refused

Fly 無法在設定的連接埠上連接到 Gateway。

**修正方法：** 確保 `internal_port` 符合 Gateway 連接埠（設定 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 記憶體問題

Container 不斷重新啟動或被終止。跡象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或無聲重啟。

**修正方法：** 在 `fly.toml` 中增加記憶體：

```toml
[[vm]]
  memory = "2048mb"
```

或更新現有的機器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可行，但在負載下或使用詳細日誌時可能會發生 OOM。**建議使用 2GB。**

### Gateway 鎖定問題

Gateway 拒絕啟動並顯示 "already running" 錯誤。

當 Container 重新啟動但 PID 鎖定檔案仍保留在磁碟區上時，就會發生這種情況。

**修正方法：** 刪除鎖定檔案：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

鎖定檔案位於 `/data/gateway.*.lock`（不在子目錄中）。

### 未讀取設定

`--allow-unconfigured` 僅繞過啟動防護。它不會建立或修復 `/data/openclaw.json`，因此請確保您的真實設定存在，並且在您想要正常本地 Gateway 啟動時包含 `gateway.mode="local"`。

驗證設定是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 透過 SSH 寫入設定

`fly ssh console -C` 指令不支援 shell 重導向。若要寫入設定檔：

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

### 狀態未持續保存

如果您在重新啟動後遺失了認證設定檔、頻道/提供者狀態或工作階段，
表示狀態目錄正在寫入容器檔案系統。

**解決方法：** 確認 `OPENCLAW_STATE_DIR=/data` 已在 `fly.toml` 中設定，然後重新部署。

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

如果您需要變更啟動指令而不進行完整重新部署：

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之後，機器指令可能會重設為 `fly.toml` 中的內容。如果您進行了手動變更，請在部署後重新套用它們。

## 私有部署 (強化版)

預設情況下，Fly 會分配公用 IP，讓您的閘道可以在 `https://your-app.fly.dev` 存取。這很方便，但也意味著您的部署可能被網路掃描器 (Shodan、Censys 等) 發現。

若要進行**無公開暴露**的強化部署，請使用私有範本。

### 何時使用私有部署

- 您只發出**外撥**呼叫/訊息 (無 inbound webhook)
- 您使用 **ngrok 或 Tailscale** 隧道進行任何 webhook 回呼
- 您透過 **SSH、Proxy 或 WireGuard** 存取閘道，而不是瀏覽器
- 您希望部署**對網路掃描器隱藏**

### 設定

使用 `deploy/fly.private.toml` 代替標準設定：

```bash
# Deploy with private config
fly deploy -c deploy/fly.private.toml
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
fly deploy -c deploy/fly.private.toml

# Allocate private-only IPv6
fly ips allocate-v6 --private -a my-openclaw
```

在此之後，`fly ips list` 應該只顯示 `private` 類型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 存取私有部署

由於沒有公開 URL，請使用下列其中一種方法：

**選項 1：本地 Proxy (最簡單)**

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

**選項 3：僅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 使用私有部署的 Webhook

如果您需要 Webhook 回呼 (Twilio、Telnyx 等) 但不公開暴露：

1. **ngrok 隧道** - 在容器內或作為 sidecar 執行 ngrok
2. **Tailscale Funnel** - 透過 Tailscale 公開特定路徑
3. **僅外撥** - 某些提供者 (Twilio) 即使沒有 webhook 也能正常進行外撥呼叫

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

ngrok 隧道在容器內執行，並提供公開的 webhook URL，而不會暴露 Fly 應用程式本身。將 `webhookSecurity.allowedHosts` 設定為公開隧道主機名稱，以便接受轉送的主機標頭。

### 安全性優勢

| 面向         | 公用     | 私有     |
| ------------ | -------- | -------- |
| 網路掃描器   | 可被發現 | 隱藏     |
| 直接攻擊     | 可能     | 已封鎖   |
| 控制 UI 存取 | 瀏覽器   | 代理/VPN |
| Webhook 傳遞 | 直接     | 透過隧道 |

## 備註

- Fly.io 使用 **x86 架構**（非 ARM）
- Dockerfile 相容於這兩種架構
- 若要進行 WhatsApp/Telegram 註冊，請使用 `fly ssh console`
- 持久化資料存放在位於 `/data` 的磁碟區上
- Signal 需要 Java + signal-cli；請使用自訂映像檔並將記憶體保持在 2GB 以上。

## 費用

使用推薦設定（`shared-cpu-2x`，2GB RAM）：

- 視使用量而定，約每月 $10-15
- 免費層級包含部分額度

詳情請參閱 [Fly.io 定價](https://fly.io/docs/about/pricing/)。

## 後續步驟

- 設定訊息頻道：[頻道](/zh-Hant/channels)
- 設定 Gateway：[Gateway 設定](/zh-Hant/gateway/configuration)
- 保持 OpenClaw 為最新狀態：[更新](/zh-Hant/install/updating)

## 相關

- [安裝概覽](/zh-Hant/install)
- [Hetzner](/zh-Hant/install/hetzner)
- [Docker](/zh-Hant/install/docker)
- [VPS 主機代管](/zh-Hant/vps)
