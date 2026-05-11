---
summary: "修復 OpenClaw 瀏覽器控制在 Linux 上的 Chrome/Brave/Edge/Chromium CDP 啟動問題"
read_when: "瀏覽器控制在 Linux 上失敗，特別是使用 snap Chromium 時"
title: "Browser troubleshooting"
---

## 問題：「無法在埠 18800 上啟動 Chrome CDP」

OpenClaw 的瀏覽器控制伺服器無法啟動 Chrome/Brave/Edge/Chromium，並出現錯誤：

```
{"error":"Error: Failed to start Chrome CDP on port 18800 for profile \"openclaw\"."}
```

### 根本原因

在 Ubuntu（以及許多 Linux 發行版）上，預設的 Chromium 安裝是一個 **snap 套件**。Snap 的 AppArmor 限制會干擾 OpenClaw 產生和監控瀏覽器程序的過程。

`apt install chromium` 指令會安裝一個重新導向至 snap 的虛設套件：

```
Note, selecting 'chromium-browser' instead of 'chromium'
chromium-browser is already the newest version (2:1snap1-0ubuntu2).
```

這不是真正的瀏覽器——它只是一個包裝程式。

其他常見的 Linux 啟動失敗情況：

- `The profile appears to be in use by another Chromium process` 表示 Chrome
  在受管理的設定檔目錄中發現過時的 `Singleton*` 鎖定檔案。當鎖定指向已停止或
  不同主機的程序時，OpenClaw
  會移除那些鎖定並重試一次。
- `Missing X server or $DISPLAY` 表示在沒有桌面工作階段的主機上明確
  要求顯示瀏覽器。預設情況下，當 Linux 上同時未設定 `DISPLAY` 和
  `WAYLAND_DISPLAY` 時，本機受管理的
  設定檔現在會退回至無頭模式。如果您設定了 `OPENCLAW_BROWSER_HEADLESS=0`、
  `browser.headless: false` 或 `browser.profiles.<name>.headless: false`，
  請移除該有頭覆寫，設定 `OPENCLAW_BROWSER_HEADLESS=1`，啟動 `Xvfb`，
  執行 `openclaw browser start --headless` 進行一次性受管理啟動，或在真實桌面工作階段中
  執行 OpenClaw。

### 解決方案 1：安裝 Google Chrome（推薦）

安裝官方的 Google Chrome `.deb` 套件，它不受 snap 的沙盒限制：

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt --fix-broken install -y  # if there are dependency errors
```

然後更新您的 OpenClaw 設定（`~/.openclaw/openclaw.json`）：

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

### 解決方案 2：搭配僅附加模式使用 Snap Chromium

如果您必須使用 snap Chromium，請設定 OpenClaw 附加至手動啟動的瀏覽器：

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

3. （可選）建立一個 systemd 使用者服務以自動啟動 Chrome：

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

使用方式啟用： `systemctl --user enable --now openclaw-browser.service`

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

| 選項                             | 說明                                                        | 預設值                                         |
| -------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `browser.enabled`                | 啟用瀏覽器控制                                              | `true`                                         |
| `browser.executablePath`         | Chromium 瀏覽器二進位檔的路徑（Chrome/Brave/Edge/Chromium） | 自動偵測（當為 Chromium 時優先使用預設瀏覽器） |
| `browser.headless`               | 不使用 GUI 執行                                             | `false`                                        |
| `OPENCLAW_BROWSER_HEADLESS`      | 本機管理的瀏覽器無頭模式的個別程序覆寫                      | 未設定                                         |
| `browser.noSandbox`              | 新增 `--no-sandbox` 標誌（某些 Linux 設定需要）             | `false`                                        |
| `browser.attachOnly`             | 不要啟動瀏覽器，僅附加到現有瀏覽器                          | `false`                                        |
| `browser.cdpPort`                | Chrome DevTools Protocol 連接埠                             | `18800`                                        |
| `browser.localLaunchTimeoutMs`   | 本機管理 Chrome 的探索逾時                                  | `15000`                                        |
| `browser.localCdpReadyTimeoutMs` | 本機管理啟動後 CDP 就緒逾時                                 | `8000`                                         |

在 Raspberry Pi、舊版 VPS 主機或慢速儲存裝置上，當 Chrome 需要更多時間來公開其 CDP HTTP 端點時，請提高 `browser.localLaunchTimeoutMs`。當啟動成功但 `openclaw browser start` 仍報告 `not reachable after start` 時，請提高 `browser.localCdpReadyTimeoutMs`。數值必須是不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。

### 問題："找不到 profile=\"user\" 的 Chrome 分頁"

您正在使用 `existing-session` / Chrome MCP 設定檔。OpenClaw 可以看到本機 Chrome，但沒有可附加的開啟分頁。

修復選項：

1. **使用管理的瀏覽器：** `openclaw browser start --browser-profile openclaw`
   （或設定 `browser.defaultProfile: "openclaw"`）。
2. **使用 Chrome MCP：** 確保本機 Chrome 正在執行並至少有一個開啟的分頁，然後使用 `--browser-profile user` 重試。

備註：

- `user` 僅限主機使用。對於 Linux 伺服器、容器或遠端主機，建議優先使用 CDP 設定檔。
- `user` / 其他 `existing-session` 設定檔會保留目前的 Chrome MCP 限制：
  參照驅動的操作、單一檔案上傳掛鉤、無對話方塊逾時覆寫、無
  `wait --load networkidle`，以及無 `responsebody`、PDF 匯出、下載
  攔截或批次操作。
- 本機 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl`；僅針對遠端 CDP 設定這些值。
- 遠端 CDP 設定檔接受 `http://`、`https://`、`ws://` 和 `wss://`。
  對於 `/json/version` 探索請使用 HTTP(S)，或者當您的瀏覽器
  服務提供直接的 DevTools socket URL 時使用 WS(S)。

## 相關

- [瀏覽器](/zh-Hant/tools/browser)
- [瀏覽器登入](/zh-Hant/tools/browser-login)
- [瀏覽器 WSL2 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
