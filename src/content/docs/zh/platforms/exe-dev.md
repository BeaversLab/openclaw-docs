---
summary: "在 exe.dev (VM + HTTPS 代理) 上运行 OpenClaw Gateway 网关 以实现远程访问"
read_when:
  - You want a cheap always-on Linux host for the Gateway
  - You want remote Control UI access without running your own VPS
title: "exe.dev"
---

# exe.dev

目标：OpenClaw Gateway 网关 运行在 exe.dev 虚拟机上，可通过您的笔记本电脑访问： `https://<vm-name>.exe.xyz`

本页面假定使用 exe.dev 的默认 **exeuntu** 镜像。如果您选择了其他发行版，请相应地调整软件包。

## 新手快速入门

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 根据需要填写您的身份验证密钥/令牌
3. 点击虚拟机旁边的 "Agent"，然后等待...
4. ???
5. 成功

## 准备工作

- exe.dev 账户
- 对 [exe.dev](https://exe.dev) 虚拟机的 `ssh exe.dev` 访问权限（可选）

## 使用 Shelley 自动安装

Shelley，[exe.dev](https://exe.dev) 的代理，可以按照我们的提示立即安装 OpenClaw。使用的提示如下：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw device approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手动安装

## 1) 创建虚拟机

从您的设备：

```exec
ssh exe.dev new
```

然后连接：

```exec
ssh <vm-name>.exe.xyz
```

提示：保持此虚拟机**有状态 (stateful)**。OpenClaw 将状态存储在 `~/.openclaw/` 和 `~/.openclaw/workspace/` 下。

## 2) 安装先决条件（在虚拟机上）

```exec
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 OpenClaw

运行 OpenClaw 安装脚本：

```exec
curl -fsSL https://openclaw.ai/install.sh | bash
```

## 4) 设置 nginx 以将 OpenClaw 代理到端口 8000

编辑 `/etc/nginx/sites-enabled/default` 为

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

## 5) 访问 OpenClaw 并授予权限

访问 `https://<vm-name>.exe.xyz/?token=YOUR-TOKEN-FROM-TERMINAL`（请参阅入门时的控制 UI 输出）。使用 `openclaw devices list` 和 `openclaw devices approve <requestId>` 批准设备。如有疑问，请从浏览器使用 Shelley！

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的身份验证处理。默认情况下，来自端口 8000 的 HTTP 流量会通过电子邮件身份验证转发到 `https://<vm-name>.exe.xyz`。

## 更新

```exec
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[更新](/zh/install/updating)
