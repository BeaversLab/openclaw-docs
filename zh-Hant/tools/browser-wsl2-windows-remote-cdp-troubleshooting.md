---
summary: "分層排查 WSL2 Gateway + Windows Chrome 遠端 CDP 問題"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + 遠端 Chrome CDP 故障排除"
---

# WSL2 + Windows + 遠端 Chrome CDP 故障排除

本指南涵蓋常見的分離主機設定，其中：

- OpenClaw Gateway 在 WSL2 內部執行
- Chrome 在 Windows 上執行
- 瀏覽器控制必須跨越 WSL2/Windows 邊界

它也涵蓋了來自 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 的分層失敗模式：幾個獨立的問題可能同時出現，這導致錯誤的層級看起來像是先壞掉了。

## 首先選擇正確的瀏覽器模式

您有兩種有效的模式：

### 選項 1：從 WSL2 到 Windows 的原始遠端 CDP

使用從 WSL2 指向 Windows Chrome CDP 端點的遠端瀏覽器設定檔。

選擇此選項時：

- Gateway 保留在 WSL2 內
- Chrome 在 Windows 上執行
- 您需要瀏覽器控制跨越 WSL2/Windows 邊界

### 選項 2：主機本機 Chrome MCP

僅當 Gateway 本身與 Chrome 在同一台主機上執行時，才使用 `existing-session` / `user`。

選擇此選項時：

- OpenClaw 和 Chrome 在同一台機器上
- 您需要本機已登入的瀏覽器狀態
- 您不需要跨主機瀏覽器傳輸

對於 WSL2 Gateway + Windows Chrome，建議優先使用原始遠端 CDP。Chrome MCP 是主機本機的，不是 WSL2 到 Windows 的橋接器。

## 運作架構

參考形狀：

- WSL2 在 `127.0.0.1:18789` 上執行 Gateway
- Windows 在一般瀏覽器的 `http://127.0.0.1:18789/` 開啟控制 UI
- Windows Chrome 在連接埠 `9222` 上公開 CDP 端點
- WSL2 可以連接到該 Windows CDP 端點
- OpenClaw 將瀏覽器設定檔指向可從 WSL2 連線的位址

## 為什麼此設定令人困惑

多種失敗可能重疊：

- WSL2 無法連線到 Windows CDP 端點
- 控制 UI 是從非安全來源開啟的
- `gateway.controlUi.allowedOrigins` 與頁面來源不符
- 缺少權杖或配對
- 瀏覽器設定檔指向錯誤的位址

因此，修復一個層級後可能仍會顯示不同的錯誤。

## 控制 UI 的關鍵規則

當從 Windows 開啟 UI 時，請使用 Windows localhost，除非您有刻意設定的 HTTPS 設定。

使用：

`http://127.0.0.1:18789/`

請勿將控制 UI 的 IP 預設為區域網路 IP。在區域網路或 tailnet 位址上使用純 HTTP 可能會觸發與 CDP 本身無關的不安全來源/裝置驗證行為。請參閱 [控制 UI](/zh-Hant/web/control-ui)。

## 分層驗證

由上至下進行。不要跳過步驟。

### 第 1 層：驗證 Chrome 是否在 Windows 上提供 CDP

在 Windows 上啟動已啟用遠端偵錯的 Chrome：

```powershell
chrome.exe --remote-debugging-port=9222
```

在 Windows 上，先驗證 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失敗，OpenClaw 尚未構成問題。

### 第 2 層：驗證 WSL2 可以存取該 Windows 端點

從 WSL2 測試您計畫在 `cdpUrl` 中使用的確切位址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

好的結果：

- `/json/version` 會傳回包含瀏覽器 / 協定版本中繼資料的 JSON
- `/json/list` 會傳回 JSON（如果沒有開啟任何頁面，空陣列也沒關係）

如果失敗：

- Windows 尚未對 WSL2 開放連接埠
- 對於 WSL2 端來說，位址是錯誤的
- 防火牆 / 連接埠轉送 / 本機代理仍然遺失

在碰觸 OpenClaw 設定之前，請先修正此問題。

### 第 3 層：設定正確的瀏覽器設定檔

對於原始遠端 CDP，將 OpenClaw 指向可從 WSL2 存取的位址：

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

- 使用 WSL2 可存取的位址，而不是僅在 Windows 上有效的位址
- 對於外部管理的瀏覽器，請保持 `attachOnly: true`
- 在預期 OpenClaw 成功之前，先用 `curl` 測試相同的 URL

### 第 4 層：單獨驗證控制 UI 層

從 Windows 開啟 UI：

`http://127.0.0.1:18789/`

然後驗證：

- 頁面來源符合 `gateway.controlUi.allowedOrigins` 的預期
- 權杖驗證或配對設定正確
- 您沒有將控制 UI 驗證問題當作瀏覽器問題來偵錯

實用頁面：

- [控制 UI](/zh-Hant/web/control-ui)

### 第 5 層：驗證端對端瀏覽器控制

從 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

好的結果：

- 分頁會在 Windows Chrome 中開啟
- `openclaw browser tabs` 會傳回目標
- 後續動作 (`snapshot`、`screenshot`、`navigate`) 可從同一個設定檔運作

## 常見誤導性錯誤

將每個訊息視為特定層級的線索：

- `control-ui-insecure-auth`
  - UI 來源 / 安全內容問題，而非 CDP 傳輸問題
- `token_missing`
  - 驗證配置問題
- `pairing required`
  - 裝置核可問題
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 無法連線到設定的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍是 CDP 連線問題，或是遠端端點緩慢/無法連線
- `No Chrome tabs found for profile="user"`
  - 選取了本地 Chrome MCP 設定檔，但沒有可用的主機本地分頁

## 快速分類檢查清單

1. Windows：`curl http://127.0.0.1:9222/json/version` 能用嗎？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能用嗎？
3. OpenClaw 設定：`browser.profiles.<name>.cdpUrl` 是否使用了該確切的 WSL2 可連線位址？
4. 控制 UI：您開啟的是 `http://127.0.0.1:18789/` 而非 LAN IP 嗎？
5. 您是否嘗試在 WSL2 和 Windows 之間使用 `existing-session`，而不是原始遠端 CDP？

## 實用要點

此設定通常可行。困難之處在於瀏覽器傳輸、控制 UI 來源安全性，以及令牌/配對可能各自獨立失敗，但從使用者角度看起來很相似。

如果有疑問：

- 先在本地驗證 Windows Chrome 端點
- 接著從 WSL2 驗證同一端點
- 然後再除錯 OpenClaw 設定或控制 UI 驗證

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
