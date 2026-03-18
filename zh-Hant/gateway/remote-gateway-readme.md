---
summary: "用於 OpenClaw.app 連線到遠端閘道的 SSH 隧道設定"
read_when: "透過 SSH 將 macOS 應用程式連線到遠端閘道"
title: "遠端閘道設定"
---

# 使用遠端閘道執行 OpenClaw.app

OpenClaw.app 使用 SSH 隧道連線到遠端閘道。本指南將向您說明如何進行設定。

## 概觀

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

## 快速設定

### 步驟 1：新增 SSH 設定

編輯 `~/.ssh/config` 並新增：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>          # e.g., 172.27.187.184
    User <REMOTE_USER>            # e.g., jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

將 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替換為您的值。

### 步驟 2：複製 SSH 金鑰

將您的公鑰複製到遠端機器（輸入一次密碼）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### 步驟 3：設定閘道權杖

```bash
launchctl setenv OPENCLAW_GATEWAY_TOKEN "<your-token>"
```

### 步驟 4：啟動 SSH 隧道

```bash
ssh -N remote-gateway &
```

### 步驟 5：重新啟動 OpenClaw.app

```bash
# Quit OpenClaw.app (⌘Q), then reopen:
open /path/to/OpenClaw.app
```

應用程式現在將透過 SSH 隧道連線到遠端閘道。

---

## 登入時自動啟動隧道

若要讓 SSH 隧道在您登入時自動啟動，請建立一個 Launch Agent。

### 建立 PLIST 檔案

將此儲存為 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

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

### 載入 Launch Agent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道現在將會：

- 在您登入時自動啟動
- 如果當機則重新啟動
- 在背景持續執行

舊版備註：如果有任何殘留的 `com.openclaw.ssh-tunnel` LaunchAgent，請將其移除。

---

## 疑難排解

**檢查隧道是否正在執行：**

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

**重新啟動隧道：**

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

**停止隧道：**

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

---

## 運作原理

| 元件                                 | 作用                                      |
| ------------------------------------ | ----------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 將本地連接埠 18789 轉發到遠端連接埠 18789 |
| `ssh -N`                             | SSH 不執行遠端指令（僅進行連接埠轉發）    |
| `KeepAlive`                          | 如果隧道當機會自動重新啟動                |
| `RunAtLoad`                          | 在代理程式載入時啟動隧道                  |

OpenClaw.app 連線到您用戶端機器上的 `ws://127.0.0.1:18789`。SSH 隧道會將該連線轉發到執行閘道的遠端機器上的連接埠 18789。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
