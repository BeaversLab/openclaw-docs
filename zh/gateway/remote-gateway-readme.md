---
summary: "OpenClaw.app 通过 SSH 隧道连接远程 gateway 的设置"
read_when: "在 macOS app 中通过 SSH 连接远程 gateway"
title: "使用远程 Gateway 运行 OpenClaw.app"
---

# 使用远程 Gateway 运行 OpenClaw.app

OpenClaw.app 通过 SSH 隧道连接远程 gateway。本文说明如何设置。

## 概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Machine                          │
│                                                              │
│  OpenClaw.app ──► ws://127.0.0.1:18789 (local port)           │
│                     │                                        │
│                     ▼                                        │
│  SSH Tunnel ────────────────────────────────────────────────│
│                     │                                        │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         Remote Machine                        │
│                                                              │
│  Gateway WebSocket ──► ws://127.0.0.1:18789 ──►              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 快速设置

### Step 1：添加 SSH 配置

编辑 `~/.ssh/config` 并添加：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>          # e.g., 172.27.187.184
    User <REMOTE_USER>            # e.g., jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 与 `<REMOTE_USER>` 替换为你的值。

### Step 2：复制 SSH Key

将公钥复制到远程机器（仅需输入一次密码）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### Step 3：设置 Gateway Token

```bash
launchctl setenv OPENCLAW_GATEWAY_TOKEN "<your-token>"
```

### Step 4：启动 SSH 隧道

```bash
ssh -N remote-gateway &
```

### Step 5：重启 OpenClaw.app

```bash
# Quit OpenClaw.app (⌘Q), then reopen:
open /path/to/OpenClaw.app
```

App 将通过 SSH 隧道连接远程 gateway。

---

## 登录时自动启动隧道

若要在登录时自动启动 SSH 隧道，创建 Launch Agent。

### 创建 PLIST 文件

保存为 `~/Library/LaunchAgents/bot.molt.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>bot.molt.ssh-tunnel</string>
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
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/bot.molt.ssh-tunnel.plist
```

隧道将：
- 登录时自动启动
- 崩溃后自动重启
- 后台持续运行

旧说明：若存在残留 `com.openclaw.ssh-tunnel` LaunchAgent，请移除。

---

## 排查

**检查隧道是否运行：**

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

**重启隧道：**

```bash
launchctl kickstart -k gui/$UID/bot.molt.ssh-tunnel
```

**停止隧道：**

```bash
launchctl bootout gui/$UID/bot.molt.ssh-tunnel
```

---

## 工作原理

| 组件 | 作用 |
|-----------|--------------|
| `LocalForward 18789 127.0.0.1:18789` | 将本地 18789 端口转发到远程 18789 端口 |
| `ssh -N` | 不执行远程命令的 SSH（仅端口转发） |
| `KeepAlive` | 隧道崩溃时自动重启 |
| `RunAtLoad` | Agent 加载时启动隧道 |

OpenClaw.app 连接客户端机器上的 `ws://127.0.0.1:18789`，SSH 隧道将该连接转发到远端 Gateway 所在机器的 18789 端口。
