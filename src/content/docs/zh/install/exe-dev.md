---
summary: "OpenClawGateway(网关)在 exe.dev (VM + HTTPS 代理) 上运行 OpenClaw Gateway(网关) 以进行远程访问"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

目标：在 exe.dev 虚拟机上运行 OpenClaw Gateway(网关)，可通过以下方式从笔记本电脑访问：OpenClawGateway(网关)`https://<vm-name>.exe.xyz`

本页面假设使用 exe.dev 的默认 **exeuntu** 镜像。如果您选择了不同的发行版，请相应地映射软件包。

## 初学者快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写您的身份验证密钥/令牌
3. 点击您的虚拟机旁边的“Agent”，并等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/` 并使用配置的共享密钥进行身份验证（本指南默认使用令牌身份验证，但如果您切换 `gateway.auth.mode`，密码身份验证也可以）
5. 使用 `openclaw devices approve <requestId>` 批准任何待处理的设备配对请求

## 您需要准备

- exe.dev 账户
- `ssh exe.dev` 访问 [exe.dev](https://exe.dev) 虚拟机（可选）

## 使用 Shelley 自动安装

Shelley，[exe.dev](https://exe.dev) 的代理，可以通过我们的提示词即时安装 OpenClaw。所使用的提示词如下：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw devices approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手动安装

## 1) 创建虚拟机

从您的设备：

```bash
ssh exe.dev new
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

<Tip>请保持此 VM **有状态**。OpenClaw 将 `openclaw.json`、每个代理的 `auth-profiles.json`、会话以及渠道/提供商状态存储在 `~/.openclaw/` 下，并将工作区存储在 `~/.openclaw/workspace/` 下。</Tip>

## 2) 安装先决条件（在虚拟机上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 OpenClaw

运行 OpenClaw 安装脚本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) 设置 nginx 将 OpenClaw 代理到端口 8000

使用以下内容编辑 `/etc/nginx/sites-enabled/default`：

```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 8000;
    listen [::]:8000;

    server_name _;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

覆盖转发标头，而不是保留客户端提供的链。
OpenClaw 仅信任来自显式配置的代理的转发 IP 元数据，
并且追加式 `X-Forwarded-For` 链被视为一种加固风险。

## 5) 访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/`（请参阅新手引导中的控制 UI 输出）。如果提示进行身份验证，请粘贴
从 VM 配置的共享密钥。本指南使用令牌身份验证，因此请使用 `openclaw config get gateway.auth.token` 检索 `gateway.auth.token`
（或使用 `openclaw doctor --generate-gateway-token` 生成一个）。
如果您将网关更改为密码身份验证，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。如果有疑问，请从浏览器使用 Shelley！

## 远程渠道设置

对于远程主机，相比于多次调用 `config set` 进行 SSH 调用，更倾向于进行一次 `config patch` 调用。将真实的令牌保留在 VM 环境或 `~/.openclaw/.env` 中，并且只在 `openclaw.json` 中放入 SecretRefs。

在 VM 上，使服务环境包含其所需的密钥：

```bash
cat >> ~/.openclaw/.env <<'EOF'
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
DISCORD_BOT_TOKEN=...
OPENAI_API_KEY=sk-...
EOF
```

从您的本地计算机，创建一个补丁文件并将其通过管道传输到 VM：

```json5
// openclaw.remote.patch.json5
{
  secrets: {
    providers: {
      default: { source: "env" },
    },
  },
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      groupPolicy: "open",
      requireMention: false,
    },
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
      dmPolicy: "disabled",
      dm: { enabled: false },
      groupPolicy: "allowlist",
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
      models: {
        "openai/gpt-5.5": { params: { fastMode: true } },
      },
    },
  },
}
```

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --dry-run' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin' < ./openclaw.remote.patch.json5
ssh <vm-name>.exe.xyz 'openclaw gateway restart && openclaw health'
```

当嵌套的白名单应该完全变为补丁值时，请使用 `--replace-path`Discord，例如替换 Discord 渠道白名单时：

```bash
ssh <vm-name>.exe.xyz 'openclaw config patch --stdin --replace-path "channels.discord.guilds[\"123\"].channels"' < ./discord.patch.json5
```

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的身份验证处理。默认情况下，来自端口 8000 的 HTTP 流量将通过电子邮件身份验证转发到 `https://<vm-name>.exe.xyz`。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh/install/updating)

## 相关

- [远程网关](/zh/gateway/remote)
- [安装概述](/zh/install)
