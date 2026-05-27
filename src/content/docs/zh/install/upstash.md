---
summary: "OpenClaw在 Upstash Box 上托管 OpenClaw，并支持保活和 SSH 隧道访问"
read_when:
  - Deploying OpenClaw to Upstash Box
  - You want a managed Linux environment for OpenClaw with SSH-tunneled dashboard access
title: "Upstash Box"
---

在 Upstash Box 上运行持久的 OpenClaw Gateway(网关)，这是一个支持保活生命周期的托管 Linux 环境。

使用 SSH 隧道访问仪表板。请勿将 Gateway(网关) 端口直接暴露到公共互联网。

## 先决条件

- Upstash 账户
- 保活的 Upstash Box
- 本地机器上的 SSH 客户端

## 创建一个 Box

在 Upstash 控制台中创建一个保活 Box。记下 Box ID（例如 `right-flamingo-14486`API）和您的 Box API 密钥。

Upstash 在 [OpenClaw 设置](OpenClawOpenClawhttps://upstash.com/docs/box/guides/openclaw-setup) 中维护了其当前的 OpenClaw Box 指南。

## 使用 SSH 隧道连接

将 OpenClaw 仪表板端口转发到您的本地机器。当提示时，使用您的 Box API 密钥作为 SSH 密码：

```bash
ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

保活选项可减少新手引导期间的空闲隧道断开。

## 安装 OpenClaw

在 Box 内部：

```bash
sudo npm install -g openclaw
```

## 运行新手引导

```bash
openclaw onboard --install-daemon
```

按照提示操作。新手引导完成后，复制仪表板 URL 和令牌。

## 启动 Gateway(网关)

为 Box 网络配置 Gateway(网关) 并在后台启动它：

```bash
openclaw config set gateway.bind lan
nohup openclaw gateway > gateway.log 2>&1 &
```

保持 SSH 隧道处于活动状态，然后在本地打开仪表板 URL：

```text
http://127.0.0.1:18789/#token=<your-token>
```

## 自动重启

将此命令设置为 Box 初始化脚本，以便 Box 启动时 Gateway(网关) 会自动重启：

```bash
nohup openclaw gateway > gateway.log 2>&1 &
```

## 故障排除

如果 SSH 在新手引导期间冻结，请使用干净的 SSH 配置和保活设置重新连接：

```bash
ssh -F /dev/null -o ControlMaster=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L 18789:127.0.0.1:18789 <box-id>@us-east-1.box.upstash.com
```

这会绕过陈旧的本地 `~/.ssh/config` 设置，并在网络空闲期间保持隧道活动。

## 相关

- [远程访问](/zh/gateway/remote)
- [Gateway(网关) 安全性](<Gateway(网关)/en/gateway/security>)
- [更新 OpenClaw](OpenClaw/en/install/updating)
