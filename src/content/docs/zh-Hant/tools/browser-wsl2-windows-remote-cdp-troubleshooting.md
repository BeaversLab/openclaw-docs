---
summary: "分層排除 WSL2 Gateway + Windows Chrome 遠端 CDP 故障"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + 遠端 Chrome CDP 故障排除"
---

在常見的跨主機設定中，OpenClaw Gateway 在 WSL2 內運行，Chrome 在 Windows 上運行，而瀏覽器控制必須跨越 WSL2 和 Windows 的邊界。來自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分層故障模式意味著多個獨立的問題可能同時出現，這會導致錯誤的層級先看起來像是壞了。

## 首先選擇正確的瀏覽器模式

您有兩種有效的模式：

### 選項 1：從 WSL2 到 Windows 的原始遠端 CDP

使用一個從 WSL2 指向 Windows Chrome CDP 端點的遠端瀏覽器設定檔。

在以下情況選擇此選項：

- Gateway 留在 WSL2 內
- Chrome 在 Windows 上運行
- 您需要瀏覽器控制跨越 WSL2/Windows 邊界

### 選項 2：主機本機 Chrome MCP

僅當 Gateway 本身與 Chrome 在同一台主機上運行時，才使用 `existing-session` / `user`。

在以下情況選擇此選項：

- OpenClaw 和 Chrome 在同一台機器上
- 您需要本機已登入的瀏覽器狀態
- 您不需要跨主機瀏覽器傳輸
- 您不需要進階的 managed/raw-CDP-only 路由，例如 `responsebody`、PDF
  匯出、下載攔截或批次動作

對於 WSL2 Gateway + Windows Chrome，建議優先使用原始遠端 CDP。Chrome MCP 是主機本機的，而非 WSL2 到 Windows 的橋接器。

## 運作架構

參考結構：

- WSL2 在 `127.0.0.1:18789` 上運行 Gateway
- Windows 在一般瀏覽器中於 `http://127.0.0.1:18789/` 開啟控制 UI
- Windows Chrome 在連接埠 `9222` 上公開 CDP 端點
- WSL2 可以存取該 Windows CDP 端點
- OpenClaw 將瀏覽器設定檔指向可從 WSL2 存取的位址

## 為何此設定令人困惑

多種故障可能重疊：

- WSL2 無法存取 Windows CDP 端點
- 控制 UI 是從非安全來源開啟的
- `gateway.controlUi.allowedOrigins` 與頁面來源不符
- 缺少 token 或配對資訊
- 瀏覽器設定檔指向錯誤的位址

因此，修復一個層級可能仍然會顯示出另一個錯誤。

## 控制 UI 的關鍵規則

當從 Windows 開啟 UI 時，除非您有刻意設定的 HTTPS 設定，否則請使用 Windows localhost。

使用：

`http://127.0.0.1:18789/`

請勿預設使用 LAN IP 作為控制 UI。在 LAN 或 tailnet 位址上使用純 HTTP 可能會觸發與 CDP 本身無關的不安全來源/裝置驗證行為。請參閱[控制 UI](/zh-Hant/web/control-ui)。

## 分層驗證

請由上至下操作。不要跳步。

### 第 1 層：驗證 Chrome 是否在 Windows 上提供 CDP

在 Windows 上啟動 Chrome 並啟用遠端偵錯：

```powershell
chrome.exe --remote-debugging-port=9222
```

在 Windows 上，先驗證 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失敗，OpenClaw 尚未成為問題。

### 第 2 層：驗證 WSL2 可以連線到該 Windows 端點

從 WSL2 測試您計畫在 `cdpUrl` 中使用的確切位址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

良好的結果：

- `/json/version` 會傳回包含瀏覽器 / 協定版本中繼資料的 JSON
- `/json/list` 會傳回 JSON（如果沒有開啟任何分頁，空陣列是可以接受的）

如果失敗：

- Windows 尚未將連接埠公開給 WSL2
- WSL2 端的位址錯誤
- 防火牆 / 連接埠轉發 / 本機代理仍然缺失

在變更 OpenClaw 設定之前，請先修正此問題。

### 第 3 層：設定正確的瀏覽器設定檔

對於原始遠端 CDP，請將 OpenClaw 指向可從 WSL2 連線的位址：

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

注意事項：

- 使用可從 WSL2 連線的位址，而不是僅在 Windows 上有效的位址
- 對於外部管理的瀏覽器，請保持 `attachOnly: true`
- `cdpUrl` 可以是 `http://`、`https://`、`ws://` 或 `wss://`
- 當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)
- 僅當瀏覽器提供者提供直接的 DevTools 通訊端 URL 時，才使用 WS(S)
- 在預期 OpenClaw 成功之前，請先使用 `curl` 測試相同的 URL

### 第 4 層：分別驗證控制 UI 層

從 Windows 開啟 UI：

`http://127.0.0.1:18789/`

然後驗證：

- 頁面來源符合 `gateway.controlUi.allowedOrigins` 的預期
- 權杖驗證或配對已正確設定
- 您沒有將控制 UI 驗證問題當作瀏覽器問題來進行偵錯

有幫助的頁面：

- [控制 UI](/zh-Hant/web/control-ui)

### 第 5 層：驗證端對端瀏覽器控制

從 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

良好的結果：

- 分頁在 Windows Chrome 中開啟
- `openclaw browser tabs` 會傳回目標
- 後續操作（`snapshot`、`screenshot`、`navigate`）可在同一個設定檔中運作

## 常見的誤導性錯誤

請將每個訊息視為特定層級的線索：

- `control-ui-insecure-auth`
  - UI 來源 / 安全內容問題，而非 CDP 傳輸問題
- `token_missing`
  - 身份驗證配置問題
- `pairing required`
  - 裝置核准問題
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 無法連線至已配置的 `cdpUrl`
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - HTTP 端點已回應，但 DevTools WebSocket 仍無法開啟
- 遠端工作階段後出現過時的視口 / 深色模式 / 地區設定 / 離線覆寫
  - 執行 `openclaw browser stop --browser-profile remote`
  - 這會關閉使用中的控制工作階段並釋放 Playwright/CDP 模擬狀態，而無需重新啟動閘道或外部瀏覽器
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 連線能力問題，或是遠端端點緩慢或無法連線
- `No Chrome tabs found for profile="user"`
  - 選取了本地 Chrome MCP 設定檔，但沒有可用的主機本機分頁

## 快速排查檢查清單

1. Windows：`curl http://127.0.0.1:9222/json/version` 能正常運作嗎？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能運作嗎？
3. OpenClaw 設定：`browser.profiles.<name>.cdpUrl` 是否使用該確切的 WSL2 可連線位址？
4. 控制 UI：您是開啟 `http://127.0.0.1:18789/` 而不是 LAN IP 嗎？
5. 您是否嘗試跨 WSL2 和 Windows 使用 `existing-session`，而不是原始遠端 CDP？

## 實際要點

此設置通常是可行的。困難之處在於，瀏覽器傳輸、控制 UI 源安全性以及令牌/配對都可能各自獨立失敗，但從用戶角度看起來卻很相似。

如有疑問：

- 首先在本地驗證 Windows Chrome 端點
- 接著從 WSL2 驗證同一個端點
- 只有在那之後，才調試 OpenClaw 配置或控制 UI 認證

## 相關

- [瀏覽器](/zh-Hant/tools/browser)
- [瀏覽器登入](/zh-Hant/tools/browser-login)
- [瀏覽器 Linux 疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)
