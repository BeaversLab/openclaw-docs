---
summary: "OpenClaw.app 連線到遠端閘道的 SSH 通道設定"
read_when: "透過 SSH 將 macOS 應用程式連線到遠端閘道"
title: "遠端閘道設定"
---

> 此內容已合併至 [遠端存取](/en/gateway/remote#macos-persistent-ssh-tunnel-via-launchagent)。請參閱該頁面以取得最新指南。

# 使用遠端閘道執行 OpenClaw.app

OpenClaw.app 使用 SSH 隧道連線至遠端閘道。本指南將說明如何進行設定。

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

將 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替換為您的實際值。

### 步驟 2：複製 SSH 金鑰

將您的公鑰複製到遠端機器（輸入一次密碼）：

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

### 步驟 3：設定遠端閘道驗證

```bash
openclaw config set gateway.remote.token "<your-token>"
```

如果您的遠端閘道使用密碼驗證，請改用 `gateway.remote.password`。
`OPENCLAW_GATEWAY_TOKEN` 作為 shell 層級的覆寫仍然有效，但持久化的
remote-client 設定是 `gateway.remote.token` / `gateway.remote.password`。

### 步驟 4：啟動 SSH 隧道

```bash
ssh -N remote-gateway &
```

### 步驟 5：重新啟動 OpenClaw.app

```bash
# Quit OpenClaw.app (⌘Q), then reopen:
open /path/to/OpenClaw.app
```

應用程式現將透過 SSH 隧道連接至遠端閘道。

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

隧道現將會：

- 在您登入時自動啟動
- 如果崩潰則重新啟動
- 在背景持續執行

舊版備註：如果存在任何殘留的 `com.openclaw.ssh-tunnel` LaunchAgent，請將其移除。

---

## 故障排除

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

| 元件                                 | 功能                                      |
| ------------------------------------ | ----------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 將本地連接埠 18789 轉發至遠端連接埠 18789 |
| `ssh -N`                             | 不執行遠端指令的 SSH（僅連接埠轉發）      |
| `KeepAlive`                          | 如果隧道崩潰，自動重新啟動                |
| `RunAtLoad`                          | 當代理載入時啟動隧道                      |

OpenClaw.app 連接至您用戶端機器上的 `ws://127.0.0.1:18789`。SSH 隧道會將該連接轉發至執行 Gateway 的遠端機器上的連接埠 18789。
