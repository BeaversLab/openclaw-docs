---
summary: "分層排除 WSL2 Gateway + Windows Chrome 遠端 CDP 的故障"
read_when:
  - 在 WSL2 中執行 OpenClaw Gateway，而 Chrome 執行於 Windows
  - 在 WSL2 和 Windows 上看到重疊的瀏覽器/控制 UI 錯誤
  - 在分割主機設定中，選擇 host-local Chrome MCP 或原始遠端 CDP
title: "WSL2 + Windows + remote Chrome CDP troubleshooting"
---

# WSL2 + Windows + remote Chrome CDP troubleshooting

本指南涵蓋常見的分割主機設定，其中：

- OpenClaw Gateway 在 WSL2 內執行
- Chrome 在 Windows 上執行
- 瀏覽器控制必須跨越 WSL2/Windows 邊界

它也涵蓋了來自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分層故障模式：幾個獨立的問題可能同時出現，這會導致錯誤的圖層看起來像是壞掉了。

## 先選擇正確的瀏覽器模式

你有兩種有效的模式：

### 選項 1：從 WSL2 到 Windows 的原始遠端 CDP

使用從 WSL2 指向 Windows Chrome CDP 端點的遠端瀏覽器設定檔。

在以下情況選擇此項：

- Gateway 留在 WSL2 內
- Chrome 在 Windows 上執行
- 你需要瀏覽器控制跨越 WSL2/Windows 邊界

### 選項 2：Host-local Chrome MCP

僅當 Gateway 本身與 Chrome 在同一台主機上執行時，才使用 `existing-session` / `user`。

在以下情況選擇此項：

- OpenClaw 和 Chrome 在同一台機器上
- 你需要本機登入的瀏覽器狀態
- 你不需要跨主機瀏覽器傳輸

對於 WSL2 Gateway + Windows Chrome，建議優先使用原始遠端 CDP。Chrome MCP 是 host-local，不是 WSL2 到 Windows 的橋接器。

## 運作架構

參考架構：

- WSL2 在 `127.0.0.1:18789` 上執行 Gateway
- Windows 在 `http://127.0.0.1:18789/` 的正常瀏覽器中開啟 Control UI
- Windows Chrome 在埠 `9222` 上公開 CDP 端點
- WSL2 可以連接該 Windows CDP 端點
- OpenClaw 將瀏覽器設定檔指向可從 WSL2 存取的位址

## 為什麼此設定令人困惑

多種故障可能重疊發生：

- WSL2 無法連接 Windows CDP 端點
- Control UI 是從非安全來源開啟的
- `gateway.controlUi.allowedOrigins` 與頁面來源不符
- 遺失 token 或配對資訊
- 瀏覽器設定檔指向錯誤的位址

因此，修正一個圖層後，可能仍會看到另一個錯誤。

## Control UI 的關鍵規則

當從 Windows 開啟 UI 時，除非您刻意設定了 HTTPS，否則請使用 Windows localhost。

使用：

`http://127.0.0.1:18789/`

請勿將控制 UI 預設為 LAN IP。在 LAN 或 tailnet 位址上的純 HTTP 可能會觸發與 CDP 本身無關的不安全來源/裝置驗證行為。請參閱[控制 UI](/zh-Hant/web/control-ui)。

## 分層驗證

由上至下操作。請勿跳躍。

### 第 1 層：驗證 Chrome 是否在 Windows 上提供 CDP 服務

在 Windows 上啟動 Chrome 並啟用遠端偵錯：

```powershell
chrome.exe --remote-debugging-port=9222
```

從 Windows 驗證 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失敗，則 OpenClaw 尚非問題所在。

### 第 2 層：驗證 WSL2 能否存取該 Windows 端點

從 WSL2 測試您計畫在 `cdpUrl` 中使用的確切位址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

正確結果：

- `/json/version` 會傳回包含 Browser / Protocol-Version 中繼資料的 JSON
- `/json/list` 會傳回 JSON（如果沒有開啟任何分頁，空陣列也沒關係）

如果失敗：

- Windows 尚未將連接埠開放給 WSL2
- 該位址在 WSL2 端不正確
- 防火牆 / 連接埠轉送 / 本地代理程式仍然缺失

在動 OpenClaw 設定之前先修正這些問題。

### 第 3 層：設定正確的瀏覽器設定檔

對於原始遠端 CDP，請將 OpenClaw 指向可從 WSL2 存取的位址：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

備註：

- 使用 WSL2 可存取的位址，而不是只在 Windows 上有效的位址
- 對於外部管理的瀏覽器，請保留 `attachOnly: true`
- 在預期 OpenClaw 成功之前，請使用 `curl` 測試相同的 URL

### 第 4 層：分別驗證控制 UI 層

從 Windows 開啟 UI：

`http://127.0.0.1:18789/`

然後驗證：

- 頁面來源符合 `gateway.controlUi.allowedOrigins` 的預期
- 權杖驗證或配對設定正確
- 您並非將控制 UI 驗證問題當作瀏覽器問題來進行偵錯

實用頁面：

- [控制 UI](/zh-Hant/web/control-ui)

### 第 5 層：驗證端對端瀏覽器控制

從 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

正確結果：

- 分頁在 Windows Chrome 中開啟
- `openclaw browser tabs` 會傳回目標
- 後續操作 (`snapshot`、`screenshot`、`navigate`) 從相同的設定檔運作

## 常見的誤導性錯誤

將每個訊息視為特定層級的線索：

- `control-ui-insecure-auth`
  - UI 來源 / 安全內容問題，而非 CDP 傳輸問題
- `token_missing`
  - 驗證配置問題
- `pairing required`
  - 裝置核准問題
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 無法連線至已配置的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍為 CDP 連線能力問題，或是遠端端點緩慢/無法連線
- `No Chrome tabs found for profile="user"`
  - 選取了本機 Chrome MCP 設定檔，但沒有可用的主機本機分頁

## 快速分類檢查清單

1. Windows：`curl http://127.0.0.1:9222/json/version` 能運作嗎？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能運作嗎？
3. OpenClaw 配置：`browser.profiles.<name>.cdpUrl` 是否使用了該確切的 WSL2 可連線位址？
4. Control UI：您是否開啟 `http://127.0.0.1:18789/` 而非 LAN IP？
5. 您是否嘗試跨 WSL2 和 Windows 使用 `existing-session` 而非原始遠端 CDP？

## 實用要點

此設置通常可行。困難之處在於瀏覽器傳輸、Control UI 來源安全性，以及權杖/配對各自可能獨立失敗，但在使用者看來卻很相似。

如有疑問：

- 先從本機驗證 Windows Chrome 端點
- 接著從 WSL2 驗證相同的端點
- 然後再除錯 OpenClaw 配置或 Control UI 驗證

import en from "/components/footer/en.mdx";

<en />
