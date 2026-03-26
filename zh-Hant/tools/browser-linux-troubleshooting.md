---
summary: "修復 OpenClaw 在 Linux 上瀏覽器控制的 Chrome/Brave/Edge/Chromium CDP 啟動問題"
read_when: "瀏覽器控制在 Linux 上失敗，特別是使用 snap Chromium 時"
title: "瀏覽器故障排除"
---

# 瀏覽器故障排除 (Linux)

## 問題：「無法在連接埠 18800 上啟動 Chrome CDP」

OpenClaw 的瀏覽器控制伺服器無法啟動 Chrome/Brave/Edge/Chromium，並出現以下錯誤：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（以及許多 Linux 發行版）上，預設的 Chromium 安裝是一個 **snap 套件**。Snap 的 AppArmor 限制會干擾 OpenClaw 產生和監控瀏覽器進程的方式。

`apt install chromium` 指令會安裝一個重新導向至 snap 的存根套件：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

這並不是一個真正的瀏覽器——它只是一個包裝器。

### 解決方案 1：安裝 Google Chrome（推薦）

安裝官方的 Google Chrome `.deb` 套件，它不受 snap 的沙盒限制：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

然後更新您的 OpenClaw 設定 (`~/.openclaw/openclaw.json`)：

```json
{
  "browser": {
    "enabled": true,
    "executablePath": "/usr/bin/google-chrome-stable",
    "headless": true,
    "noSandbox": true
  }
}
```

### 解決方案 2：使用 Snap Chromium 搭配僅附加模式

如果您必須使用 snap Chromium，請將 OpenClaw 設定為附加到手動啟動的瀏覽器：

1. 更新設定：

```json
{
  "browser": {
    "enabled": true,
    "attachOnly": true,
    "headless": true,
    "noSandbox": true
  }
}
```

2. 手動啟動 Chromium：

```bash
chromium-browser --headless --no-sandbox --disable-gpu \
  --remote-debugging-port=18800 \
  --user-data-dir=$HOME/.openclaw/browser/openclaw/user-data \
  about:blank &
```

3. 您可以選擇建立一個 systemd 使用者服務以自動啟動 Chrome：

```ini
# ~/.config/systemd/user/openclaw-browser.service
[Unit]
Description=OpenClaw Browser (Chrome CDP)
After=network.target

[Service]
ExecStart=/snap/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=18800 --user-data-dir=%h/.openclaw/browser/openclaw/user-data about:blank
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

使用以下指令啟用：`systemctl --user enable --now openclaw-browser.service`

### 驗證瀏覽器是否正常運作

檢查狀態：

```bash
curl -s http://127.0.0.1:18791/ | jq '{running, pid, chosenBrowser}'
```

測試瀏覽：

```bash
curl -s -X POST http://127.0.0.1:18791/start
curl -s http://127.0.0.1:18791/tabs
```

### 設定參考

| 選項                     | 說明                                                           | 預設值                                               |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| `browser.enabled`        | 啟用瀏覽器控制                                                 | `true`                                               |
| `browser.executablePath` | Chromium 架構瀏覽器二進位檔的路徑 (Chrome/Brave/Edge/Chromium) | 自動偵測（若是 Chromium 架構，則優先使用預設瀏覽器） |
| `browser.headless`       | 無圖形介面執行                                                 | `false`                                              |
| `browser.noSandbox`      | 新增 `--no-sandbox` 標誌（某些 Linux 設定需要）                | `false`                                              |
| `browser.attachOnly`     | 不要啟動瀏覽器，僅附加到現有瀏覽器                             | `false`                                              |
| `browser.cdpPort`        | Chrome DevTools Protocol 連接埠                                | `18800`                                              |

### 問題：「找不到 profile=\"user\" 的 Chrome 分頁」

您正在使用 `existing-session` / Chrome MCP 設定檔。OpenClaw 可以看到本機 Chrome，但沒有可連結的開啟分頁。

修復選項：

1. **使用受管理的瀏覽器：** `openclaw browser start --browser-profile openclaw`
   (或設定 `browser.defaultProfile: "openclaw"`)。
2. **使用 Chrome MCP：** 確保本機 Chrome 正在執行並且至少有一個開啟的分頁，然後使用 `--browser-profile user` 重試。

備註：

- `user` 僅限本機主機。對於 Linux 伺服器、容器或遠端主機，建議使用 CDP 設定檔。
- 本機 `openclaw` 設定檔會自動指定 `cdpPort`/`cdpUrl`；僅針對遠端 CDP 設定這些值。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
