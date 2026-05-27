---
summary: "在具有持久化存储和HTTPS的Fly.io上逐步部署OpenClaw"
title: Fly.io
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

**目标：** 在 [OpenClaw](https://fly.io) 机器上运行 Gateway(网关) Fly.io，该机器具有持久存储、自动 HTTPS 以及 Discord/渠道访问权限。

## 你需要什么

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账户（免费层即可）
- 模型认证：所选模型提供商的 API 密钥
- 渠道凭证：Discord 机器人令牌，Telegram 令牌等。

## 新手快速入门

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建应用 + 卷 → 设置密钥
3. 使用 `fly deploy` 部署
4. SSH 登录以创建配置或使用控制 UI

<Steps>
  <Step title="创建 Fly 应用">
    ```bash
    # Clone the repo
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # Create a new Fly app (pick your own name)
    fly apps create my-openclaw

    # Create a persistent volume (1GB is usually enough)
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：** 选择一个离你较近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="Configure fly.toml">
    编辑 `fly.toml` 以匹配您的应用名称和需求。

    **安全提示：** 默认配置会暴露一个公开 URL。若要进行没有公开 IP 的加固部署，请参阅[私有部署](#private-deployment-hardened)或使用 `deploy/fly.private.toml`。

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

    OpenClaw Docker 镜像使用 `tini` 作为其入口点。Fly 进程命令会替换 Docker `CMD` 而不替换 `ENTRYPOINT`，因此进程仍在 `tini` 下运行。

    **关键设置：**

    | 设置                        | 原因                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | 绑定到 `0.0.0.0` 以便 Fly 的代理可以访问网关                     |
    | `--allow-unconfigured`         | 在没有配置文件的情况下启动（您将在之后创建一个）                      |
    | `internal_port = 3000`         | 必须匹配 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）以通过 Fly 健康检查 |
    | `memory = "2048mb"`            | 512MB 太小；推荐 2GB                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | 在卷上持久化状态                                                |

  </Step>

  <Step title="设置密钥">
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

    **注意事项：**

    - 非回环绑定 (`--bind lan`) 需要有效的网关认证路径。此 Fly.io 示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正确配置的非回环 `trusted-proxy` 部署也满足该要求。
    - 像对待密码一样对待这些令牌。
    - 对于所有 API 密钥和令牌，**优先使用环境变量而非配置文件**。这可以将密钥保留在 `openclaw.json` 之外，以免意外泄露或被记录。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署会构建 Docker 镜像（约 2-3 分钟）。随后的部署会更快。

    部署完成后，请验证：

    ```bash
    fly status
    fly logs
    ```

    您应该看到：

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="创建配置文件">
    SSH 进入机器以创建正确的配置：

    ```bash
    fly ssh console
    ```

    创建配置目录和文件：

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

    **注意：** 使用 `OPENCLAW_STATE_DIR=/data` 时，配置路径为 `/data/openclaw.json`。

    **注意：** 将 `https://my-openclaw.fly.dev` 替换为您真实的 Fly 应用
    源。Gateway(网关) 启动时从运行时的 `--bind` 和 `--port` 值为本地控制 UI 源设定种子，以便在配置存在之前进行首次启动，但通过 Fly 的浏览器访问仍需要 `gateway.controlUi.allowedOrigins` 中列出的确切 HTTPS 源。

    **注意：** Discord 令牌可以来自以下任一来源：

    - 环境变量：`DISCORD_BOT_TOKEN` (推荐用于机密信息)
    - 配置文件：`channels.discord.token`

    如果使用环境变量，则无需将令牌添加到配置中。Gateway(网关) 会自动读取 `DISCORD_BOT_TOKEN`。

    重启以应用更改：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问 Gateway(网关)">
    ### 控制界面

    在浏览器中打开：

    ```bash
    fly open
    ```

    或者访问 `https://my-openclaw.fly.dev/`

    使用配置的共享密钥进行身份验证。本指南使用来自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway

token；如果您切换到了密码认证，请改用该密码。

    ### 日志

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### SSH 控制台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 故障排除

### "App is not listening on expected address"

Gateway 绑定到了 `127.0.0.1` 而不是 `0.0.0.0`。

**修复：** 将 `--bind lan` 添加到 `fly.toml` 中的进程命令。

### 健康检查失败 / 连接被拒绝

Fly 无法在配置的端口上访问 Gateway(网关)。

**修复方法：** 确保 `internal_port` 与 Gateway(网关) 端口匹配（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 内存问题

容器不断重启或被终止。迹象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或静默重启。

**修复方法：** 在 `fly.toml` 中增加内存：

```toml
[[vm]]
  memory = "2048mb"
```

或者更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能可行，但在负载下或启用详细日志时可能会 OOM。**推荐 2GB。**

### Gateway(网关) 锁问题

Gateway(网关) 拒绝启动，并提示“already running”错误。

当容器重启但卷上的 PID 锁定文件仍然存在时，会发生这种情况。

**修复：** 删除锁定文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁定文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置未被读取

`--allow-unconfigured` 仅绕过启动守卫。它不会创建或修复 `/data/openclaw.json`，因此请确保您的真实配置存在，并且当您想要正常启动本地网关时包含 `gateway.mode="local"`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 命令不支持 shell 重定向。要写入配置文件：

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** 如果文件已存在，`fly sftp` 可能会失败。请先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

如果您在重启后丢失了认证配置文件、渠道/提供商状态或会话，说明状态目录正在写入容器文件系统。

**修复方法：** 确保在 `fly.toml` 中设置了 `OPENCLAW_STATE_DIR=/data` 并重新部署。

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

### 更新机器命令

如果您需要在无需完整重新部署的情况下更改启动命令：

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之后，机器命令可能会重置为 `fly.toml` 中的内容。如果您进行了手动更改，请在部署后重新应用它们。

## 私有部署（加固）

默认情况下，Fly 会分配公网 IP，使您的网关可在 `https://your-app.fly.dev` 访问。这很方便，但也意味着您的部署可能会被互联网扫描器（如 Shodan、Censys 等）发现。

对于具有**无公开暴露**的强化部署，请使用私有模板。

### 何时使用私有部署

- 您只进行**出站**调用/消息（没有入站 webhooks）
- 您使用 **ngrok 或 Tailscale** 隧道进行任何 webhook 回调
- 您通过 **SSH、代理或 WireGuard** 而不是浏览器访问网关
- 您希望部署**对互联网扫描器隐藏**

### 设置

使用 `deploy/fly.private.toml` 代替标准配置：

```bash
# Deploy with private config
fly deploy -c deploy/fly.private.toml
```

或者转换现有部署：

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

此后，`fly ips list` 应仅显示 `private` 类型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公共 URL，请使用以下方法之一：

**选项 1：本地代理（最简单）**

```bash
# Forward local port 3000 to the app
fly proxy 3000:3000 -a my-openclaw

# Then open http://localhost:3000 in browser
```

**选项 2：WireGuard VPN**

```bash
# Create WireGuard config (one-time)
fly wireguard create

# Import to WireGuard client, then access via internal IPv6
# Example: http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 私有部署的 Webhooks

如果您需要在无公网暴露的情况下接收 Webhook 回调（如 Twilio、Telnyx 等）：

1. **ngrok 隧道** - 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站** - 某些提供商（如 Twilio）可以在没有 webhooks 的情况下正常进行出站呼叫

使用 ngrok 的语音呼叫配置示例：

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

ngrok 隧道在容器内运行，并提供一个公网 webhook URL，而无需暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为公网隧道主机名，以便接受转发的主机头。

### 安全优势

| 方面         | 公网     | 私有     |
| ------------ | -------- | -------- |
| 互联网扫描器 | 可被发现 | 隐藏     |
| 直接攻击     | 可能     | 已阻止   |
| 控制 UI 访问 | 浏览器   | 代理/VPN |
| Webhook 投递 | 直接     | 通过隧道 |

## 注意

- Fly.io 使用 **x86 架构**（而非 ARM）
- Dockerfile 兼容这两种架构
- 对于 WhatsApp/Telegram 新手引导，请使用 `fly ssh console`
- 持久化数据存储位于 `/data` 的卷上
- Signal 需要 Java + signal-cli；请使用自定义镜像并将内存保持在 2GB 以上。

## 费用

使用推荐配置（`shared-cpu-2x`，2GB RAM）：

- 根据使用情况，约 10-15 美元/月
- 免费套餐包含一定额度

详情请参阅 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 后续步骤

- 设置消息通道：[Channels](/zh/channels)
- 配置 Gateway(网关)：[Gateway(网关) configuration](/zh/gateway/configuration)
- 保持 OpenClaw 最新：[Updating](/zh/install/updating)

## 相关

- [Install overview](/zh/install)
- [Hetzner](/zh/install/hetzner)
- [Docker](/zh/install/docker)
- [VPS hosting](/zh/vps)
