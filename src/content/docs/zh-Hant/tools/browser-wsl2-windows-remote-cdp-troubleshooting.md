---
summary: "分層排除 WSL2 Gateway + Windows Chrome 遠端 CDP 故障"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + 遠端 Chrome CDP 故障排除"
---

# WSL2 + Windows + 遠端 Chrome CDP 故障排除

本指南涵蓋常見的跨主機設定，其中：

- OpenClaw Gateway 在 WSL2 內執行
- Chrome 在 Windows 上執行
- 瀏覽器控制必須跨越 WSL2/Windows 邊界

它也涵蓋了 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 中的分層故障模式：多個獨立的問題可能同時出現，這使得錯誤的層級首先看起來像是壞了。

## 首先選擇正確的瀏覽器模式

您有兩種有效的模式：

### 選項 1：從 WSL2 到 Windows 的原始遠端 CDP

使用從 WSL2 指向 Windows Chrome CDP 端點的遠端瀏覽器設定檔。

在此情況下選擇：

- Gateway 留在 WSL2 內
- Chrome 在 Windows 上執行
- 您需要瀏覽器控制跨越 WSL2/Windows 邊界

### 選項 2：主機本端 Chrome MCP

僅當 Gateway 本身與 Chrome 在同一台主機上執行時，才使用 `existing-session` / `user`。

在此情況下選擇：

- OpenClaw 和 Chrome 在同一台機器上
- 您想要本機已登入的瀏覽器狀態
- 您不需要跨主機瀏覽器傳輸
- 您不需要高階的 managed/raw-CDP-only 路由，例如 `responsebody`、PDF
  匯出、下載攔截或批次動作

對於 WSL2 Gateway + Windows Chrome，優先使用原始遠端 CDP。Chrome MCP 是 host-local（主機本機），而非 WSL2 到 Windows 的橋接器。

## 運作架構

參考結構：

- WSL2 在 `127.0.0.1:18789` 上執行 Gateway
- Windows 在一般瀏覽器的 `http://127.0.0.1:18789/` 開啟 Control UI
- Windows Chrome 在連接埠 `9222` 上公開 CDP 端點
- WSL2 可以存取該 Windows CDP 端點
- OpenClaw 將瀏覽器設定檔指向可從 WSL2 存取的位址

## 為何此設定令人困惑

多個故障可能同時發生：

- WSL2 無法存取 Windows CDP 端點
- Control UI 是從非安全來源 (non-secure origin) 開啟的
- `gateway.controlUi.allowedOrigins` 與頁面來源不符
- 缺少 token 或配對 (pairing)
- 瀏覽器設定檔指向錯誤的位址

因此，修復其中一層可能仍會讓其他錯誤可見。

## Control UI 的關鍵規則

當 UI 從 Windows 開啟時，請使用 Windows localhost，除非您有刻意設定的 HTTPS 設定。

使用：

`http://127.0.0.1:18789/`

請勿預設將 Control UI 使用 LAN IP。在 LAN 或 tailnet 位址上的純 HTTP 可能會觸發與 CDP 本身無關的不安全來源/裝置驗證 行為。請參閱 [Control UI](/en/web/control-ui)。

## 分層驗證

由上至下進行。請勿跳過步驟。

### 第 1 層：驗證 Chrome 在 Windows 上是否正在提供 CDP

在 Windows 上啟動 Chrome 並啟用遠端偵錯：

```powershell
chrome.exe --remote-debugging-port=9222
```

從 Windows，先驗證 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失敗，OpenClaw 尚非問題所在。

### 第 2 層：驗證 WSL2 能否存取該 Windows 端點

從 WSL2，測試您計畫在 `cdpUrl` 中使用的確切位址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

成功的結果：

- `/json/version` 傳回包含 Browser / Protocol-Version 中繼資料的 JSON
- `/json/list` 傳回 JSON（如果沒有開啟任何頁面，空陣列也沒關係）

如果失敗：

- Windows 尚未將連接埠公開給 WSL2
- 位址對 WSL2 端而言是錯誤的
- 防火牆 / 連接埠轉送 / 本機代理仍然缺失

在觸及 OpenClaw 設定之前先解決此問題。

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

- 使用 WSL2 可存取的位址，而非僅在 Windows 上有效的位址
- 對於外部管理的瀏覽器，請保留 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)
- 僅當瀏覽器供應商提供直接的 DevTools socket URL 時，才使用 WS(S)
- 在預期 OpenClaw 成功之前，請先使用 `curl` 測試相同的 URL

### 第 4 層：單獨驗證 Control UI 層

從 Windows 開啟 UI：

`http://127.0.0.1:18789/`

然後驗證：

- 頁面來源符合 `gateway.controlUi.allowedOrigins` 的預期
- 權杖驗證或配對設定正確
- 您沒有將 Control UI 驗證問題當作瀏覽器問題來進行除錯

實用頁面：

- [Control UI](/en/web/control-ui)

### 第 5 層：驗證端對端瀏覽器控制

從 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

良好結果：

- 分頁在 Windows Chrome 中開啟
- `openclaw browser tabs` 傳回目標
- 後續動作 (`snapshot`、`screenshot`、`navigate`) 可從相同的設定檔運作

## 常見誤導性錯誤

請將每個訊息視為特定層級的線索：

- `control-ui-insecure-auth`
  - UI 來源 / 安全內容 問題，而非 CDP 傳輸問題
- `token_missing`
  - 驗證設定問題
- `pairing required`
  - 裝置核准問題
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 無法存取已設定的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端點已有回應，但仍無法開啟 DevTools WebSocket
- 遠端工作階段之後出現過時的視口 / 深色模式 / 地區設定 / 離線覆寫
  - 執行 `openclaw browser stop --browser-profile remote`
  - 這會關閉使用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，而不需重新啟動閘道或外部瀏覽器
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 連線性問題，或是遠端端點緩慢或無法連線
- `No Chrome tabs found for profile="user"`
  - 選取了本機 Chrome MCP 設定檔，但沒有可用的主機本機分頁

## 快速分類檢查清單

1. Windows： `curl http://127.0.0.1:9222/json/version` 能正常運作嗎？
2. WSL2： `curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能正常運作嗎？
3. OpenClaw 設定： `browser.profiles.<name>.cdpUrl` 是否使用完全相同的 WSL2 可存取位址？
4. 控制 UI：您是開啟 `http://127.0.0.1:18789/` 而非 LAN IP 嗎？
5. 您是否嘗試跨 WSL2 和 Windows 使用 `existing-session` 而非原始遠端 CDP？

## 實用要點

此設定通常是可行的。困難之處在於瀏覽器傳輸、控制 UI 來源安全性，以及權杖/配對都可能獨立失敗，但從使用者端看起來卻很相似。

如果不確定：

- 先在本機驗證 Windows Chrome 端點
- 接著從 WSL2 驗證相同的端點
- 然後再偵錯 OpenClaw 設定或控制 UI 驗證
