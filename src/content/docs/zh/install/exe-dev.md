---
summary: "在 exe.dev (VM + HTTPS 代理) 上运行 OpenClaw Gateway(网关) 网关 以进行远程访问"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

# exe.dev

目标：在 exe.dev 虚拟机上运行 OpenClaw Gateway(网关) 网关，可通过以下方式从笔记本电脑访问： `https://<vm-name>.exe.xyz`

本页面假设使用 exe.dev 默认的 **exeuntu** 镜像。如果您选择了其他发行版，请相应地调整软件包。

## 新手快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写您的授权密钥/令牌
3. 点击您虚拟机旁边的“Agent”并等待 Shelley 完成配置
4. 打开 `https://<vm-name>.exe.xyz/` 并使用配置的共享密钥进行身份验证（本指南默认使用令牌身份验证，但如果您切换 `gateway.auth.mode`，密码身份验证也可以使用）
5. 使用 `openclaw devices approve <requestId>` 批准任何待处理的设备配对请求

## 你需要准备

- exe.dev 账户
- `ssh exe.dev` 对 [exe.dev](https://exe.dev) 虚拟机的访问权限（可选）

## 使用 Shelley 自动安装

Shelley 是 [exe.dev](https://exe.dev) 的代理，可以使用我们的
提示符即时安装 OpenClaw。使用的提示符如下：

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

提示：保持此 VM 的**有状态**（stateful）。OpenClaw 将 `openclaw.json`、每个代理的
`auth-profiles.json`、会话以及渠道/提供商状态存储在
`~/.openclaw/` 下，并将工作区存储在 `~/.openclaw/workspace/` 下。

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

## 4) 设置 nginx 以将 OpenClaw 代理到端口 8000

使用以下内容编辑 `/etc/nginx/sites-enabled/default`

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

覆盖转发标头而不是保留客户端提供的链。
OpenClaw 仅信任来自显式配置的代理的转发 IP 元数据，
并且追加风格的 `X-Forwarded-For` 链被视为安全加固风险。

## 5) 访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/`（请参阅新手引导中的控制 UI 输出）。如果提示进行身份验证，请粘贴
来自 VM 的配置共享密钥。本指南使用令牌身份验证，因此请使用 `openclaw config get gateway.auth.token` 检索 `gateway.auth.token`
（或使用 `openclaw doctor --generate-gateway-token` 生成一个）。
如果您将网关更改为密码身份验证，请改用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`。
使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。如有疑问，请从浏览器使用 Shelley！

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的身份验证处理。默认
情况下，来自端口 8000 的 HTTP 流量通过电子邮件身份验证转发到 `https://<vm-name>.exe.xyz`。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh/install/updating)
