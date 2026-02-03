---
title: "exe.dev"
summary: "在 exe.dev（VM + HTTPS 代理）上运行 OpenClaw Gateway 以便远程访问"
read_when:
  - 你想要便宜的常驻 Linux 主机运行 Gateway
  - 你想在不自建 VPS 的情况下远程访问 Control UI
---

# exe.dev

目标：在 exe.dev VM 上运行 OpenClaw Gateway，通过 `https://<vm-name>.exe.xyz` 从笔记本访问。

本页假设你使用 exe.dev 默认的 **exeuntu** 镜像；若选择了其他发行版，请按需调整包名。

## 新手快速路径

1. [https://exe.new/openclaw](https://exe.new/openclaw)
2. 按需填写 auth key/token
3. 点击 VM 旁的 “Agent”，然后等待…
4. ???
5. Profit

## 你需要什么

- exe.dev 账号
- 通过 `ssh exe.dev` 访问 [exe.dev](https://exe.dev) 虚拟机（可选）

## 使用 Shelley 自动安装

Shelley 是 [exe.dev](https://exe.dev) 的 agent，可用下面的 prompt 即时安装 OpenClaw：

```
Set up OpenClaw (https://docs.openclaw.ai/install) on this VM. Use the non-interactive and accept-risk flags for openclaw onboarding. Add the supplied auth or token as needed. Configure nginx to forward from the default port 18789 to the root location on the default enabled site config, making sure to enable Websocket support. Pairing is done by "openclaw devices list" and "openclaw device approve <request id>". Make sure the dashboard shows that OpenClaw's health is OK. exe.dev handles forwarding from port 8000 to port 80/443 and HTTPS for us, so the final "reachable" should be <vm-name>.exe.xyz, without port specification.
```

## 手动安装

## 1) 创建 VM

在你的设备上：

```bash
ssh exe.dev new
```

然后连接：

```bash
ssh <vm-name>.exe.xyz
```

提示：保持该 VM **有状态**。OpenClaw 状态保存在 `~/.openclaw/` 与 `~/.openclaw/workspace/`。

## 2) 安装前置依赖（VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl jq ca-certificates openssl
```

## 3) 安装 OpenClaw

运行安装脚本：

```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```

## 4) 配置 nginx 代理 OpenClaw 到 8000 端口

编辑 `/etc/nginx/sites-enabled/default`：

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

访问 `https://<vm-name>.exe.xyz/?token=YOUR-TOKEN-FROM-TERMINAL`。
用 `openclaw devices list` 与 `openclaw device approve` 批准设备。
不确定时可在浏览器里使用 Shelley！

## 远程访问

远程访问由 [exe.dev](https://exe.dev) 的认证处理。
默认情况下，8000 端口的 HTTP 会被转发到 `https://<vm-name>.exe.xyz`，并使用邮箱认证。

## 更新

```bash
npm i -g openclaw@latest
openclaw doctor
openclaw gateway restart
openclaw health
```

指南：[Updating](/zh/install/updating)
