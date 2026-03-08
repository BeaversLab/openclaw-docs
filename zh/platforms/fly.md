---
title: "Fly.io"
description: "在 Fly.io 上部署 OpenClaw"
---

# Fly.io Deployment

**目标：** 在 [Fly.io](https://fly.io) 上运行 OpenClaw Gateway，具备持久化存储、自动 HTTPS 与 Discord/频道访问。

## 你需要什么

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费层可用）
- 模型认证：Anthropic API key（或其它 provider key）
- 频道凭据：Discord bot token、Telegram token 等

## 新手快速路径

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建 app + volume → 设置 secrets
4. SSH 进入创建配置或用 Control UI
4. SSH 进入创建配置或用 Control UI

<!-- i18n:todo -->
## 1) 创建 Fly 应用

```bash
# Clone the repo
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Create a new Fly app (pick your own name)
fly apps create my-openclaw

# Create a persistent volume (1GB is usually enough)
fly volumes create openclaw_data --size 1 --region iad
```

**提示：** 选择靠近你的区域。常用选项：`lhr` (伦敦)、`iad` (弗吉尼亚)、`sjc` (圣何塞)。

## 2) 配置 fly.toml

**安全提示：** 默认配置会暴露公网 URL。若需无公网 IP 的加固部署，见 [Private 部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

**关键设置：**

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

**关键设置：**

| Setting                        | Why                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `--bind lan`                   | Binds to `0.0.0.0` so Fly's proxy can reach the gateway                     |
| `--allow-unconfigured`         | Starts without a config file (you'll create one after)                      |
| `internal_port = 3000`         | Must match `--port 3000` (or `OPENCLAW_GATEWAY_PORT`) for Fly health checks |
| `memory = "2048mb"`            | 512MB is too small; 2GB recommended                                         |
| `OPENCLAW_STATE_DIR = "/data"` | Persists state on the volume                                                |

## 3) 设置密钥

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

**注意：**

- 这些 token 视为密码。
- **优先用环境变量，不要放在配置文件**。避免 `openclaw.json` 泄露或被记录。
- **优先使用环境变量而不是配置文件** 来存储所有 API 密钥和 token。这样可以将密钥保存在 `openclaw.json` 之外，避免意外暴露或记录。

## 4) 部署

```bash
fly deploy
```

部署后验证：

你应看到：

```bash
fly status
fly logs
```

你应该看到：

```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) 创建配置文件

创建配置目录与文件：

```bash
fly ssh console
```

**注意：** 设置了 `OPENCLAW_STATE_DIR=/data` 后，配置路径为 `/data/openclaw.json`。

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

**注意：** Discord token 可来自：

**注意：** Discord token 可来自：

- 配置文件：`channels.discord.token`
- 配置文件：`channels.discord.token`

重启生效：

重启以应用：

```bash
exit
fly machine restart <machine-id>
```

### Control UI

### Control UI（控制界面）

或访问 `https://my-openclaw.fly.dev/`

```bash
fly open
```

粘贴你的 gateway token（来自 `OPENCLAW_GATEWAY_TOKEN`）进行认证。

粘贴你的 gateway token（来自 `OPENCLAW_GATEWAY_TOKEN`）进行认证。

### SSH Console

```bash
fly logs              # Live logs
fly logs --no-tail    # Recent logs
```

## Troubleshooting

```bash
fly ssh console
```

### “App is not listening on expected address”

### "App 未在预期地址上监听"

**修复：** 在 `fly.toml` 的 process 命令里添加 `--bind lan`。

**修复：** 在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败 / 连接被拒绝

**修复：** 确保 `internal_port` 与 gateway 端口一致（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

**修复：** 确保 `internal_port` 与 gateway 端口一致（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 内存问题

**修复：** 在 `fly.toml` 中提升内存：

或更新现有机器：

```toml
[[vm]]
  memory = "2048mb"
```

**注意：** 512MB 太小。1GB 可能勉强但仍会 OOM 或 verbose 时崩溃。**建议 2GB。**

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能勉强但仍会在负载大或详细日志时 OOM。**建议 2GB。**

### Gateway 锁文件问题

这通常是容器重启后，PID lock 文件仍在 volume 上。

**修复：** 删除 lock 文件：

锁文件在 `/data/gateway.*.lock`（不在子目录）。

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置文件未被读取

确认配置存在：

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

**注意：** `fly sftp` 若文件已存在可能失败。先删除：

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** `fly sftp` 若文件已存在可能失败。先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

**修复：** 确认 `fly.toml` 中设置 `OPENCLAW_STATE_DIR=/data` 并重新部署。

**修复：** 确保 `OPENCLAW_STATE_DIR=/data` 在 `fly.toml` 中设置并重新部署。

### Updating Machine Command

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

**注意：** `fly deploy` 后启动命令可能会重置为 `fly.toml` 中的配置。若你手动改过，部署后需重新应用。

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之后，机器命令可能会重置为 `fly.toml` 中的配置。如果你进行了手动更改，部署后需重新应用。

## 私有部署（加固版）

若想 **不对公网暴露** 的加固部署，使用私有模板。

若需要 **无公网暴露** 的加固部署，请使用私有模板。

### 何时使用私有部署

- webhooks 通过 **ngrok 或 Tailscale** 隧道回调
- 通过 **SSH、代理或 WireGuard** 访问 gateway，而非浏览器
- 你希望部署**不被互联网扫描**
- 你希望部署**对互联网扫描器隐藏**

### 设置

或将已有部署改为私有：

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

之后 `fly ips list` 应只显示 `private` 类型 IP：

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

之后，`fly ips list` 应该只显示 `private` 类型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

**选项 1：本地代理（最简单）**

**选项 2：WireGuard VPN**

```bash
# Forward local port 3000 to the app
fly proxy 3000:3000 -a my-openclaw

# Then open http://localhost:3000 in browser
```

**选项 3：仅 SSH**

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

### 私有部署中的 Webhooks

如果你需要 webbook 回调（Twilio、Telnyx 等）而不暴露到公网：

2. **Tailscale Funnel** - 仅暴露特定路径
3. **仅出站** - 某些 provider（Twilio）出站不依赖 webhooks
3. **仅出站** - 某些 provider（Twilio）出站调用无需 webhook 即可正常工作

ngrok 隧道运行在容器内，提供公网 webhook URL，而不暴露 Fly app。

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

ngrok 隧道运行在容器内，提供公网 webhook URL，而不会暴露 Fly app 本身。将 `webhookSecurity.allowedHosts` 设置为公网隧道主机名，以便接受转发的 host 标头。

## 备注

| Aspect            | Public       | Private    |
| ----------------- | ------------ | ---------- |
| Internet scanners | Discoverable | Hidden     |
| Direct attacks    | Possible     | Blocked    |
| Control UI access | Browser      | Proxy/VPN  |
| Webhook delivery  | Direct       | Via tunnel |

## 备注

- Dockerfile 兼容两种架构
- WhatsApp/Telegram onboarding 使用 `fly ssh console`
- 持久数据在 `/data` volume
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存 2GB+
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存 2GB+。

## 成本

使用推荐配置（`shared-cpu-2x`、2GB RAM）：

- 免费层包含一定额度
- 免费层包含一定额度

详见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。
