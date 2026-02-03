---
title: "Fly.io"
description: 在 Fly.io 上部署 OpenClaw
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
3. `fly deploy`
4. SSH 进入创建配置或用 Control UI

## 1) 创建 Fly app

```bash
# 克隆仓库
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# 创建新的 Fly app（自定义名称）
fly apps create my-openclaw

# 创建持久化 volume（通常 1GB 足够）
fly volumes create openclaw_data --size 1 --region iad
```

**提示：** 选择离你更近的区域。常见：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

## 2) 配置 fly.toml

编辑 `fly.toml`，匹配你的 app 名称与需求。

**安全提示：** 默认配置会暴露公网 URL。若需无公网 IP 的加固部署，见 [Private Deployment](#private-deployment-hardened) 或使用 `fly.private.toml`。

```toml
app = "my-openclaw"  # 你的 app 名称
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

| Setting                        | Why                                                                |
| ------------------------------ | ------------------------------------------------------------------ |
| `--bind lan`                   | 绑定 `0.0.0.0`，让 Fly 代理可访问 gateway                          |
| `--allow-unconfigured`         | 无配置时也能启动（之后再创建配置）                                 |
| `internal_port = 3000`         | 必须匹配 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`），用于健康检查 |
| `memory = "2048mb"`            | 512MB 太小；推荐 2GB                                               |
| `OPENCLAW_STATE_DIR = "/data"` | 将状态持久化到 volume                                              |

## 3) 设置 secrets

```bash
# 必需：Gateway token（非 loopback 绑定需要）
fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

# 模型 provider API keys
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# 可选：其他 providers
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set GOOGLE_API_KEY=...

# 频道 tokens
fly secrets set DISCORD_BOT_TOKEN=MTQ...
```

**注意：**

- 非 loopback 绑定（`--bind lan`）需要 `OPENCLAW_GATEWAY_TOKEN` 以保证安全。
- 这些 token 视为密码。
- **优先用环境变量，不要放在配置文件**。避免 `openclaw.json` 泄露或被记录。

## 4) 部署

```bash
fly deploy
```

首次部署需要构建 Docker 镜像（约 2–3 分钟）。之后的部署会更快。

部署后验证：

```bash
fly status
fly logs
```

你应看到：

```
[gateway] listening on ws://0.0.0.0:3000 (PID xxx)
[discord] logged in to discord as xxx
```

## 5) 创建配置文件

SSH 进入机器创建配置：

```bash
fly ssh console
```

创建配置目录与文件：

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

- 环境变量：`DISCORD_BOT_TOKEN`（推荐）
- 配置文件：`channels.discord.token`

若使用环境变量，无需把 token 写入配置。gateway 会自动读取 `DISCORD_BOT_TOKEN`。

重启生效：

```bash
exit
fly machine restart <machine-id>
```

## 6) 访问 Gateway

### Control UI

在浏览器打开：

```bash
fly open
```

或访问 `https://my-openclaw.fly.dev/`

粘贴你的 gateway token（来自 `OPENCLAW_GATEWAY_TOKEN`）进行认证。

### Logs

```bash
fly logs              # 实时日志
fly logs --no-tail    # 最近日志
```

### SSH Console

```bash
fly ssh console
```

## Troubleshooting

### “App is not listening on expected address”

Gateway 绑定在 `127.0.0.1` 而不是 `0.0.0.0`。

**修复：** 在 `fly.toml` 的 process 命令里添加 `--bind lan`。

### Health checks failing / connection refused

Fly 无法访问配置端口上的 gateway。

**修复：** 确保 `internal_port` 与 gateway 端口一致（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / Memory Issues

容器频繁重启或被杀。迹象：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration` 或无提示重启。

**修复：** 在 `fly.toml` 中提升内存：

```toml
[[vm]]
  memory = "2048mb"
```

或更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：** 512MB 太小。1GB 可能勉强但仍会 OOM 或 verbose 时崩溃。**建议 2GB。**

### Gateway Lock Issues

Gateway 报“already running”无法启动。

这通常是容器重启后，PID lock 文件仍在 volume 上。

**修复：** 删除 lock 文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件在 `/data/gateway.*.lock`（不在子目录）。

### Config Not Being Read

若使用 `--allow-unconfigured`，gateway 会创建最小配置。你的 `/data/openclaw.json` 应在重启后被读取。

确认配置存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### Writing Config via SSH

`fly ssh console -C` 不支持 shell 重定向。写配置的方法：

```bash
# echo + tee（本地管道到远端）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：** `fly sftp` 若文件已存在可能失败。先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### State Not Persisting

若重启后凭据/会话丢失，说明 state dir 写在容器文件系统。

**修复：** 确认 `fly.toml` 中设置 `OPENCLAW_STATE_DIR=/data` 并重新部署。

## Updates

```bash
# 拉取最新改动
git pull

# 重新部署
fly deploy

# 健康检查
fly status
fly logs
```

### Updating Machine Command

如果需要在不重新部署的情况下修改启动命令：

```bash
# 获取 machine ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或同时提高内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：** `fly deploy` 后启动命令可能会重置为 `fly.toml` 中的配置。若你手动改过，部署后需重新应用。

## Private Deployment（加固）

默认情况下 Fly 会分配公网 IP，使你的 gateway 可通过 `https://your-app.fly.dev` 访问。方便但会被互联网扫描器（Shodan、Censys 等）发现。

若想 **不对公网暴露** 的加固部署，使用私有模板。

### 何时使用私有部署

- 只做**出站**调用/消息（无入站 webhooks）
- webhooks 通过 **ngrok 或 Tailscale** 隧道回调
- 通过 **SSH、代理或 WireGuard** 访问 gateway，而非浏览器
- 你希望部署**不被互联网扫描**

### 设置

使用 `fly.private.toml` 替代标准配置：

```bash
# 用私有配置部署
fly deploy -c fly.private.toml
```

或将已有部署改为私有：

```bash
# 列出当前 IP
fly ips list -a my-openclaw

# 释放公网 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换为私有配置，避免未来部署重新分配公网 IP
#（移除 [http_service] 或使用私有模板部署）
fly deploy -c fly.private.toml

# 分配私有 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

之后 `fly ips list` 应只显示 `private` 类型 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

没有公网 URL，可用以下方式之一：

**选项 1：本地代理（最简单）**

```bash
# 转发本地端口 3000 到 app
fly proxy 3000:3000 -a my-openclaw

# 然后打开 http://localhost:3000
```

**选项 2：WireGuard VPN**

```bash
# 创建 WireGuard 配置（一次性）
fly wireguard create

# 导入到 WireGuard 客户端，然后用内部 IPv6 访问
# 例如：http://[fdaa:x:x:x:x::x]:3000
```

**选项 3：仅 SSH**

```bash
fly ssh console -a my-openclaw
```

### 私有部署的 Webhooks

若你需要 webhook 回调（Twilio、Telnyx 等）但不想公网暴露：

1. **ngrok 隧道** - 在容器内或 sidecar 运行 ngrok
2. **Tailscale Funnel** - 仅暴露特定路径
3. **仅出站** - 某些 provider（Twilio）出站不依赖 webhooks

ngrok 的 voice-call 配置示例：

```json
{
  "plugins": {
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio",
          "tunnel": { "provider": "ngrok" }
        }
      }
    }
  }
}
```

ngrok 隧道运行在容器内，提供公网 webhook URL，而不暴露 Fly app。

### 安全收益

| Aspect            | Public       | Private    |
| ----------------- | ------------ | ---------- |
| Internet scanners | Discoverable | Hidden     |
| Direct attacks    | Possible     | Blocked    |
| Control UI access | Browser      | Proxy/VPN  |
| Webhook delivery  | Direct       | Via tunnel |

## 备注

- Fly.io 使用 **x86 架构**（非 ARM）
- Dockerfile 兼容两种架构
- WhatsApp/Telegram onboarding 使用 `fly ssh console`
- 持久数据在 `/data` volume
- Signal 需要 Java + signal-cli；使用自定义镜像并保持内存 2GB+

## 成本

推荐配置（`shared-cpu-2x`, 2GB RAM）：

- 约 $10–15/月（视用量而定）
- 免费层包含一定额度

详情见 [Fly.io pricing](https://fly.io/docs/about/pricing/)。
