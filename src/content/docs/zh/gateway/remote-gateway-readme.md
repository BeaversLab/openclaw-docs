---
summary: "OpenClaw.app 连接到远程网关的 SSH 隧道设置"
read_when: "通过 SSH 将 macOS 应用程序连接到远程网关"
title: "远程 Gateway(网关) 网关 设置"
---

> 此内容已合并至[远程访问](/en/gateway/remote#macos-persistent-ssh-tunnel-via-launchagent)。请参阅该页面以获取最新指南。

# 运行使用远程Gateway(网关)的 OpenClaw.app

OpenClaw.app 使用 SSH 隧道连接到远程网关。本指南将向您展示如何进行设置。

## 概述

```mermaid
flowchart TB
    subgraph Client["Client Machine"]
        direction TB
        A["OpenClaw.app"]
        B["ws://127.0.0.1:18789\n(local port)"]
        T["SSH Tunnel"]

        A --> B
        B --> T
    end
    subgraph Remote["Remote Machine"]
        direction TB
        C["Gateway WebSocket"]
        D["ws://127.0.0.1:18789"]

        C --> D
    end
    T --> C
```

## 快速设置

### 步骤 1：添加 SSH 配置

编辑 `~/.ssh/config` 并添加：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>          # e.g., 172.27.187.184
    User <REMOTE_USER>            # e.g., jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为您的值。

### 步骤 2：复制 SSH 密钥

将您的公钥复制到远程机器（输入一次密码）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### 步骤 3：配置远程 Gateway 身份验证

```bash
openclaw config set gateway.remote.token "<your-token>"
```

如果您的远程 Gateway 使用密码认证，请改用 `gateway.remote.password`。
`OPENCLAW_GATEWAY_TOKEN` 作为 Shell 级别的覆盖仍然有效，但持久的
remote-client 设置是 `gateway.remote.token` / `gateway.remote.password`。

### 步骤 4：启动 SSH 隧道

```bash
ssh -N remote-gateway &
```

### 步骤 5：重启 OpenClaw.app

```bash
# Quit OpenClaw.app (⌘Q), then reopen:
open /path/to/OpenClaw.app
```

应用程序现在将通过 SSH 隧道连接到远程 Gateway。

---

## 登录时自动启动隧道

要使 SSH 隧道在您登录时自动启动，请创建一个 Launch Agent。

### 创建 PLIST 文件

将此保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

### 加载 Launch Agent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道现在将：

- 在您登录时自动启动
- 崩溃时自动重启
- 在后台保持运行

旧版说明：如果存在，请删除所有剩余的 `com.openclaw.ssh-tunnel` LaunchAgent。

---

## 故障排除

**检查隧道是否正在运行：**

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

**重启隧道：**

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

**停止隧道：**

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

---

## 工作原理

| 组件                                 | 作用                                  |
| ------------------------------------ | ------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789 |
| `ssh -N`                             | SSH 不执行远程命令（仅端口转发）      |
| `KeepAlive`                          | 如果隧道崩溃，自动重启隧道            |
| `RunAtLoad`                          | 当代理加载时启动隧道                  |

OpenClaw.app 连接到您客户端机器上的 `ws://127.0.0.1:18789`。SSH 隧道将该连接转发到运行 Gateway 的远程机器上的端口 18789。
