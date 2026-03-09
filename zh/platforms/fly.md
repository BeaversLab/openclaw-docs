---
title: "Fly.io"
description: "在 Fly.io 上部署 OpenClaw"
---

# Fly.io 部署

**目标：** 在 [Fly.io](https://fly.io) 机器上运行 OpenClaw Gateway，具备持久化存储、自动 HTTPS 和 Discord/频道访问。

## 你需要什么

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费层可用）
- 模型认证：Anthropic API key（或其它 provider key）
- 频道凭据：Discord bot token、Telegram token 等

## 新手快速路径

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建 app + volume → 设置 secrets
3. 使用 `fly deploy` 部署
4. SSH 进入创建配置或使用控制界面

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

**提示：** 选择靠近你的区域。常用选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

## 2) 配置 fly.toml

编辑 `fly.toml` 以匹配你的应用名称和需求。

**安全提示：** 默认配置会暴露公网 URL。若需无公网 IP 的加固部署，见[私有部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

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

| 设置 | 原因 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `--bind lan` | 绑定到 `0.0.0.0` 以便 Fly 的代理可以访问 gateway |
| `--allow-unconfigured` | 无配置文件启动（你会在之后创建） |
| `internal_port = 3000` | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）匹配，用于 Fly 健康检查 |
| `memory = "2048mb"` | 512MB 太小；建议 2GB |
| `OPENCLAW_STATE_DIR = "/data"` | 在 volume 上持久化状态 |

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

**注意事项：**

- 非本地绑定（`--bind lan`）出于安全需要 `OPENCLAW_GATEWAY_TOKEN`。
- 将这些 token 视为密码。
- **优先使用环境变量而非配置文件** 存储所有 API 密钥和 token。这样可以将密钥保存在 `openclaw.json` 之外，避免意外暴露或记录。

## 4) 部署

```bash
fly deploy
```

首次部署会构建 Docker 镜像（约 2-3 分钟）。后续部署会更快。

部署后，验证：

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

SSH 进入机器创建合适的配置：

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

**注意：** 设置了 `OPENCLAW_STATE_DIR=/data` 后，配置路径为 `/data/openclaw.json`。

**注意：** Discord token 可来自：

- 环境变量：`DISCORD_BOT_TOKEN`（推荐用于 secrets）
- 配置文件：`channels.discord.token`

如果使用环境变量，无需在配置中添加 token。Gateway 会自动读取 `DISCORD_BOT_TOKEN`。

重启以应用：

```bash
exit
fly machine restart <machine-id>
```

## 6) 访问 Gateway

### 控制界面

在浏览器中打开：

```bash
fly open
```

或访问 `https://my-openclaw.fly.dev/`

粘贴你的 gateway token（来自 `OPENCLAW_GATEWAY_TOKEN`）进行认证。

### 日志

```bash
fly logs              # Live logs
fly logs --no-tail    # Recent logs
```

### SSH 控制台

```bash
fly ssh console
```

## 故障排查

### "App 未在预期地址上监听"

Gateway 绑定到了 `127.0.0.1` 而非 `0.0.0.0`。

**修复：** 在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败 / 连接被拒绝

Fly 无法在配置的端口上访问 gateway。

**修复：** 确保 `internal_port` 与 gateway 端口匹配（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 内存问题

容器不断重启或被杀死。迹象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或静默重启。

**修复：** 在 `fly.toml` 中增加内存：

```toml
[[vm]]
  memory = "2048mb"
```

或更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能勉强但会在负载大或详细日志时 OOM。**建议 2GB。**

### Gateway 锁文件问题

Gateway 拒绝启动，出现 "already running" 错误。

这通常发生在容器重启但 PID 锁文件仍保留在 volume 上。

**修复：** 删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置文件未被读取

如果使用 `--allow-unconfigured`，gateway 会创建最小配置。重启时应读取 `/data/openclaw.json` 处的自定义配置。

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

**注意：** 如果文件已存在，`fly sftp` 可能失败。先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

如果重启后丢失凭据或会话，说明状态目录正在写入容器文件系统。

**修复：** 确保 `OPENCLAW_STATE_DIR=/data` 在 `fly.toml` 中设置并重新部署。

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

如果需要更改启动命令而不完全重新部署：

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** 在 `fly deploy` 之后，机器命令可能会重置为 `fly.toml` 中的配置。如果进行了手动更改，部署后需重新应用。

## 私有部署（加固版）

默认情况下，Fly 会分配公网 IP，使你的 gateway 可通过 `https://your-app.fly.dev` 访问。这很方便，但意味着你的部署可被互联网扫描器（Shodan、Censys 等）发现。

若需要 **无公网暴露** 的加固部署，请使用私有模板。

### 何时使用私有部署

- 你只进行 **出站** 调用/消息（无入站 webhooks）
- 你使用 **ngrok 或 Tailscale** 隧道进行 webhook 回调
- 你通过 **SSH、代理或 WireGuard** 访问 gateway，而非浏览器
- 你希望部署**对互联网扫描器隐藏**

### 设置

使用 `fly.private.toml` 代替标准配置：

```bash
# Deploy with private config
fly deploy -c fly.private.toml
```

或将现有部署转换为私有：

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

之后，`fly ips list` 应只显示 `private` 类型的 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公网 URL，使用以下方法之一：

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

### 私有部署下的 Webhooks

如果需要 webhook 回调（Twilio、Telnyx 等）而不暴露公网：

1. **ngrok 隧道** - 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** - 通过 Tailscale 暴露特定路径
3. **仅出站** - 某些提供商（Twilio）在没有 webhooks 的情况下可以正常进行出站调用

使用 ngrok 的语音通话配置示例：

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

ngrok 隧道在容器内运行，提供公网 webhook URL 而不暴露 Fly 应用本身。将 `webhookSecurity.allowedHosts` 设置为公网隧道主机名，以便接受转发的 host 头。

### 安全优势

| 方面 | 公网部署 | 私有部署 |
| ----------------- | ------------ | ---------- |
| 互联网扫描器 | 可被发现 | 隐藏 |
| 直接攻击 | 可能 | 被阻止 |
| 控制界面访问 | 浏览器 | 代理/VPN |
| Webhook 投递 | 直接 | 通过隧道 |

## 注意事项

- Fly.io 使用 **x86 架构**（非 ARM）
- Dockerfile 兼容两种架构
- WhatsApp/Telegram 入职使用 `fly ssh console`
- 持久化数据位于 volume 的 `/data`
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存在 2GB 以上。

## 成本

使用推荐配置（`shared-cpu-2x`，2GB RAM）：

- 约 $10-15/月，取决于使用情况
- 免费层包含一定额度

详见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。
