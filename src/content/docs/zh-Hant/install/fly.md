---
summary: "OpenClaw 在 Fly.io 上進行具有持久化儲存和 HTTPS 的逐步部署"
title: Fly.io
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

# Fly.io 部署

**目標：** 在具有持久化儲存、自動 HTTPS 和 Discord/頻道存取權限的 [Fly.io](https://fly.io) 機器上執行 OpenClaw Gateway。

## 您需要什麼

- 已安裝 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 帳戶（免費層級即可）
- 模型驗證：您選擇的模型供應商的 API 金鑰
- 頻道憑證：Discord 機器人權杖、Telegram 權杖等。

## 新手快速入門

1. 複製儲存庫 → 自訂 `fly.toml`
2. 建立 App + 磁碟區 → 設定機密
3. 使用 `fly deploy` 進行部署
4. 透過 SSH 建立設定或使用 Control UI

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

    **提示：** 選擇一個靠近您的區域。常見選項：`lhr` (倫敦)、`iad` (維吉尼亞州)、`sjc` (聖荷西)。

  </Step>

  <Step title="Configure fly.toml">
    編輯 `fly.toml` 以符合您的應用程式名稱和需求。

    **安全性提示：** 預設配置會公開 URL。如需沒有公開 IP 的強化部署，請參閱 [Private Deployment](#private-deployment-hardened) 或使用 `fly.private.toml`。

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
    | `--bind lan`                   | 繫結至 `0.0.0.0`，以便 Fly 的 proxy 可以連線到 gateway                     |
    | `--allow-unconfigured`         | 在沒有配置檔案的情況下啟動（您之後會建立一個）                      |
    | `internal_port = 3000`         | 必須符合 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）才能通過 Fly 健康檢查 |
    | `memory = "2048mb"`            | 512MB 太小；建議使用 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在磁碟區上持久化狀態                                                |

  </Step>

  <Step title="設定 secrets">
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

    **注意事項：**

    - 非迴路繫結（non-loopback binds，`--bind lan`）需要有效的 gateway 認證路徑。此 Fly.io 範例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正確設定的非迴路 `trusted-proxy` 部署也符合要求。
    - 請將這些 tokens 視為密碼處理。
    - 針對所有 API 金鑰與 tokens，**建議優先使用環境變數而非設定檔**。這能避免 secrets 出現在 `openclaw.json` 中，進而防止意外外洩或被記錄。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署會建構 Docker 映像檔（約 2-3 分鐘）。後續的部署會更快。

    部署後，請驗證：

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
    透過 SSH 連線到機器以建立正確的設定：

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

    **注意：** 若使用 `OPENCLAW_STATE_DIR=/data`，設定路徑為 `/data/openclaw.json`。

    **注意：** 將 `https://my-openclaw.fly.dev` 替換為您真實的 Fly 應用程式
    origin。Gateway 啟動時會從執行時期的 `--bind` 與
    `--port` 數值來植入本地 Control UI 的 origins，以便設定存在前就能完成首次開機，
    但透過 Fly 的瀏覽器存取仍需要 `gateway.controlUi.allowedOrigins` 中列出的確切 HTTPS origin。

    **注意：** Discord 權杖可以來自：

    - 環境變數： `DISCORD_BOT_TOKEN` (建議用於 secrets)
    - 設定檔： `channels.discord.token`

    若使用環境變數，則不需要將權杖加入設定中。Gateway 會自動讀取 `DISCORD_BOT_TOKEN`。

    重新啟動以套用變更：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="存取 Gateway">
    ### Control UI

    在瀏覽器中開啟：

    ```bash
    fly open
    ```

    或前往 `https://my-openclaw.fly.dev/`

    使用設定的共用 secret 進行驗證。本指南使用來自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway
    權杖；若您已改用密碼驗證，請改用該密碼。

    ### 日誌

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### SSH Console

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 疑難排解

### "App is not listening on expected address"

Gateway 正在綁定到 `127.0.0.1` 而非 `0.0.0.0`。

**修復方法：** 在 `fly.toml` 中將 `--bind lan` 加入您的程序指令。

### 健康檢查失敗 / 連線遭拒

Fly 無法在設定的連接埠上連線到閘道。

**修復方法：** 確認 `internal_port` 符合 gateway 連接埠 (設定 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`)。

### OOM / 記憶體問題

Container 持續重新啟動或被終止。跡象： `SIGABRT`、 `v8::internal::Runtime_AllocateInYoungGeneration` 或無聲重新啟動。

**修復方法：** 在 `fly.toml` 中增加記憶體：

```toml
[[vm]]
  memory = "2048mb"
```

或更新現有機器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可用，但在負載下或使用詳細記錄時可能會 OOM。**建議使用 2GB。**

### Gateway 鎖定問題

Gateway 拒絕啟動並顯示「already running」錯誤。

當容器重新啟動但 PID 鎖定檔案仍保留在儲存卷上時，會發生這種情況。

**解決方法：** 刪除鎖定檔案：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

鎖定檔位於 `/data/gateway.*.lock` (不在子目錄中)。

### 設定未被讀取

`--allow-unconfigured` 僅繞過啟動保護機制。它不會建立或修復 `/data/openclaw.json`，因此當您希望正常啟動本機 gateway 時，請確保您的真實組態存在且包含 `gateway.mode="local"`。

驗證設定是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 透過 SSH 寫入組態

`fly ssh console -C` 指令不支援 shell 重導向。若要寫入組態檔：

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

如果您在重新啟動後遺失了設定檔、頻道/提供者狀態或會話，則狀態目錄正在寫入容器檔案系統。

**修復方法：** 確保已在 `fly.toml` 中設定 `OPENCLAW_STATE_DIR=/data` 並重新部署。

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

**注意：** 在 `fly deploy` 之後，機器指令可能會重設為 `fly.toml` 中的內容。如果您進行了手動變更，請在部署後重新套用它們。

## 私有部署（強化版）

預設情況下，Fly 會分配公用 IP，使您的 gateway 可透過 `https://your-app.fly.dev` 存取。這很方便，但也意味著您的部署可被網際網路掃描器（如 Shodan、Censys 等）發現。

若要進行**無公開暴露**的強化部署，請使用私人範本。

### 何時使用私人部署

- 您只進行**傳出**呼叫/訊息（無傳入 webhook）
- 您使用 **ngrok 或 Tailscale** 隧道進行任何 webhook 回呼
- 您透過 **SSH、Proxy 或 WireGuard** 而非瀏覽器來存取閘道
- 您希望部署**對網路掃描器隱藏**

### 設定

使用 `fly.private.toml` 代替標準組態：

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

或是轉換現有部署：

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

此後，`fly ips list` 應僅顯示 `private` 類型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 存取私有部署

由於沒有公開 URL，請使用以下方法之一：

**選項 1：本地 Proxy（最簡單）**

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

### 私有部署與 Webhooks

如果您需要在不公開暴露的情況下使用 Webhook 回呼（Twilio、Telnyx 等）：

1. **ngrok 隧道** - 在容器內或作為 sidecar 執行 ngrok
2. **Tailscale Funnel** - 透過 Tailscale 暴露特定路徑
3. **僅限輸出** - 某些提供商（如 Twilio）即使沒有 Webhooks 也能正常進行輸出通話

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

ngrok 隧道在容器內執行，並在不暴露 Fly 應用程式的情況下提供公用 webhook URL。將 `webhookSecurity.allowedHosts` 設定為公用隧道主機名稱，以便接受轉送的主機標頭。

### 安全性優勢

| 面向         | 公開     | 私有      |
| ------------ | -------- | --------- |
| 網路掃描器   | 可被發現 | 隱藏      |
| 直接攻擊     | 可能     | 已阻擋    |
| 控制 UI 存取 | 瀏覽器   | Proxy/VPN |
| Webhook 傳遞 | 直接     | 透過隧道  |

## 備註

- Fly.io 使用 **x86 架構**（而非 ARM）
- Dockerfile 同時支援兩種架構
- 對於 WhatsApp/Telegram 入門，請使用 `fly ssh console`
- 持久化資料儲存在位於 `/data` 的磁碟區上
- Signal 需要 Java + signal-cli；請使用自訂映像檔並將記憶體保持在 2GB 以上。

## 成本

使用推薦的組態（`shared-cpu-2x`，2GB RAM）：

- 依使用量約 $10-15/月
- 免費層級包含一定額度

詳情請參閱 [Fly.io 定價](https://fly.io/docs/about/pricing/)。

## 下一步

- 設定訊息頻道：[頻道](/zh-Hant/channels)
- 設定 Gateway：[Gateway 組態](/zh-Hant/gateway/configuration)
- 保持 OpenClaw 更新：[更新](/zh-Hant/install/updating)

## 相關

- [安裝概覽](/zh-Hant/install)
- [Hetzner](/zh-Hant/install/hetzner)
- [Docker](/zh-Hant/install/docker)
- [VPS 主機託管](/zh-Hant/vps)
