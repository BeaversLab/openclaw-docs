---
title: Fly.io
summary: "在 Fly.io 上部署 OpenClaw 的詳細步驟，包含持久化儲存與 HTTPS"
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

# Fly.io 部署

**目標：** OpenClaw Gateway 在一台 [Fly.io](https://fly.io) 機器上運行，具備持久儲存、自動 HTTPS 以及 Discord/頻道存取權限。

## 您需要什麼

- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) 已安裝
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

  <Step title="設定 fly.toml">
    編輯 `fly.toml` 以符合您的應用程式名稱與需求。

    **安全提示：** 預設設定會公開 URL。若要進行沒有公開 IP 的強化部署，請參閱 [私有部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

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

    **主要設定：**

    | 設定                        | 原因                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 繫結到 `0.0.0.0` 以便 Fly 的 proxy 能連接到 gateway                     |
    | `--allow-unconfigured`         | 在沒有設定檔的情況下啟動（您稍後會建立一個）                      |
    | `internal_port = 3000`         | 必須符合 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）才能通過 Fly 健康檢查 |
    | `memory = "2048mb"`            | 512MB 太小；建議 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在 volume 上保存狀態                                                |

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

  <Step title="建立配置檔">
    SSH 進入機器以建立正確的配置：

    ```bash
    fly ssh console
    ```

    建立配置目錄與檔案：

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
        "bind": "auto"
      },
      "meta": {}
    }
    EOF
    ```

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 時，配置路徑為 `/data/openclaw.json`。

    **注意：** Discord 權杖可以來自以下任一來源：

    - 環境變數：`DISCORD_BOT_TOKEN`（推薦用於機密資訊）
    - 配置檔案：`channels.discord.token`

    如果使用環境變數，則無需在配置中新增權杖。Gateway 會自動讀取 `DISCORD_BOT_TOKEN`。

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

    或是造訪 `https://my-openclaw.fly.dev/`

    使用設定的共享金鑰進行驗證。本指南使用來自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway 權杖；如果您切換為密碼驗證，請改用該密碼。

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

Gateway 綁定到了 `127.0.0.1` 而不是 `0.0.0.0`。

**解決方法：** 在 `fly.toml` 的程序指令中新增 `--bind lan`。

### 健康檢查失敗 / 連線遭拒

Fly 無法在設定的連接埠上連線到閘道。

**解決方法：** 確保 `internal_port` 與 gateway 連接埠相符（設定 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 記憶體問題

Container 持續重啟或被終止。跡象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration`，或無聲重啟。

**解決方法：** 在 `fly.toml` 中增加記憶體：

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

鎖定檔案位於 `/data/gateway.*.lock`（不在子目錄中）。

### 設定未讀取

`--allow-unconfigured` 僅略過啟動守衛。它不會建立或修復 `/data/openclaw.json`，因此當您想要正常的本地 gateway 啟動時，請確保您的真實配置存在並包含 `gateway.mode="local"`。

驗證設定是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 透過 SSH 寫入設定

`fly ssh console -C` 指令不支援 shell 重導向。若要寫入配置檔案：

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

### 狀態未持續

如果您在重新啟動後遺失了設定檔、頻道/提供者狀態或會話，則狀態目錄正在寫入容器檔案系統。

**修正：** 確保在 `fly.toml` 中設定了 `OPENCLAW_STATE_DIR=/data` 並重新部署。

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

## 私人部署

預設情況下，Fly 會分配公用 IP，讓您的閘道可以在 `https://your-app.fly.dev` 存取。這雖然方便，但意味著您的部署會被網際網路掃描器（Shodan、Censys 等）發現。

若要進行**無公開暴露**的強化部署，請使用私人範本。

### 何時使用私人部署

- 您只進行**傳出**呼叫/訊息（無傳入 webhook）
- 您使用 **ngrok 或 Tailscale** 隧道進行任何 webhook 回呼
- 您透過 **SSH、Proxy 或 WireGuard** 而非瀏覽器來存取閘道
- 您希望部署**對網路掃描器隱藏**

### 設定

請使用 `fly.private.toml` 代替標準設定：

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

此後，`fly ips list` 應該只顯示 `private` 類型的 IP：

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

ngrok 隧道在容器內運行，並提供公開的 Webhook URL，而不會暴露 Fly 應用程式本身。將 `webhookSecurity.allowedHosts` 設定為公開的隧道主機名稱，以便接受轉發的主機標頭。

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
- 對於 WhatsApp/Telegram 註冊流程，請使用 `fly ssh console`
- 持久化資料儲存在磁碟區的 `/data`
- Signal 需要 Java + signal-cli；請使用自訂映像檔並將記憶體保持在 2GB 以上。

## 成本

使用推薦的設定（`shared-cpu-2x`，2GB RAM）：

- 依使用量約 $10-15/月
- 免費層級包含一定額度

詳情請參閱 [Fly.io 定價](https://fly.io/docs/about/pricing/)。

## 下一步

- 設定傳訊頻道：[頻道](/en/channels)
- 設定閘道：[閘道設定](/en/gateway/configuration)
- 保持 OpenClaw 更新：[更新](/en/install/updating)
