---
summary: "分層排除 WSL2 Gateway + Windows Chrome 遠端 CDP 故障"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + 遠端 Chrome CDP 故障排除"
---

# WSL2 + Windows + 遠端 Chrome CDP 故障排除

本指南涵蓋常見的分層主機設定，其中：

- OpenClaw Gateway 在 WSL2 內部執行
- Chrome 在 Windows 上執行
- 瀏覽器控制必須跨越 WSL2/Windows 邊界

它也涵蓋了 [issue #39369](https://github.com/openclaw/openclaw/issues/39369) 中的分層失敗模式：幾個獨立的問題可能同時出現，這會導致錯誤的層級看起來像是壞了。

## 首先選擇正確的瀏覽器模式

你有兩種有效的模式：

### 選項 1：從 WSL2 到 Windows 的原始遠端 CDP

使用從 WSL2 指向 Windows Chrome CDP 端點的遠端瀏覽器設定檔。

在此情況下選擇：

- Gateway 留在 WSL2 內
- Chrome 在 Windows 上執行
- 你需要瀏覽器控制跨越 WSL2/Windows 邊界

### 選項 2：主機本機 Chrome MCP

僅當 Gateway 本身與 Chrome 在同一台主機上執行時，才使用 `existing-session` / `user`。

在此情況下選擇：

- OpenClaw 和 Chrome 在同一台機器上
- 你想要本機登入的瀏覽器狀態
- 你不需要跨主機的瀏覽器傳輸

對於 WSL2 Gateway + Windows Chrome，優先使用原始遠端 CDP。Chrome MCP 是主機本機的，而不是 WSL2 到 Windows 的橋接器。

## 工作架構

參考結構：

- WSL2 在 `127.0.0.1:18789` 上執行 Gateway
- Windows 在正常瀏覽器的 `http://127.0.0.1:18789/` 開啟控制 UI
- Windows Chrome 在連接埠 `9222` 上公開 CDP 端點
- WSL2 可以存取該 Windows CDP 端點
- OpenClaw 將瀏覽器設定檔指向可從 WSL2 存取的位址

## 為何此設定令人困惑

幾種失敗可能重疊：

- WSL2 無法存取 Windows CDP 端點
- 控制 UI 是從非安全來源開啟的
- `gateway.controlUi.allowedOrigins` 與頁面來源不符
- 缺少權杖或配對
- 瀏覽器設定檔指向錯誤的位址

因此，修正一個層級後可能仍會顯示不同的錯誤。

## 控制 UI 的關鍵規則

當 UI 是從 Windows 開啟時，請使用 Windows localhost，除非你有刻意設定的 HTTPS 設定。

使用：

`http://127.0.0.1:18789/`

請勿預設為控制 UI 使用區域網路 (LAN) IP。在區域網路或 tailnet 位址上使用純 HTTP 可能會觸發與 CDP 本身無關的不安全來源/裝置驗證行為。請參閱 [控制 UI](/zh-Hant/web/control-ui)。

## 分層驗證

由上至下進行。請勿跳步。

### 第 1 層：驗證 Chrome 在 Windows 上正提供 CDP

在 Windows 上啟動 Chrome 並啟用遠端偵錯：

```powershell
chrome.exe --remote-debugging-port=9222
```

從 Windows，先驗證 Chrome 本身：

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

如果在 Windows 上失敗，OpenClaw 目前還不是問題所在。

### 第 2 層：驗證 WSL2 能連線至該 Windows 端點

從 WSL2，測試您計畫在 `cdpUrl` 中使用的確切位址：

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

預期的良好結果：

- `/json/version` 傳回包含瀏覽器 / 協定版本中繼資料的 JSON
- `/json/list` 傳回 JSON（如果沒有開啟任何分頁，空陣列也沒問題）

如果失敗：

- Windows 尚未將連接埠暴露給 WSL2
- 該位址對於 WSL2 端是錯誤的
- 防火牆 / 連接埠轉送 / 本機代理仍缺失

在修改 OpenClaw 設定之前先修正此問題。

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

- 使用 WSL2 可存取的位址，而不是只能在 Windows 上運作的位址
- 對於外部管理的瀏覽器請保留 `attachOnly: true`
- 在預期 OpenClaw 成功之前，先使用 `curl` 測試相同的 URL

### 第 4 層：分別驗證控制 UI 層

從 Windows 開啟 UI：

`http://127.0.0.1:18789/`

然後驗證：

- 頁面來源符合 `gateway.controlUi.allowedOrigins` 的預期
- 權杖驗證或配對設定正確
- 您並非在將控制 UI 驗證問題當作瀏覽器問題來偵錯

實用頁面：

- [控制 UI](/zh-Hant/web/control-ui)

### 第 5 層：驗證端對端瀏覽器控制

從 WSL2：

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

預期的良好結果：

- 分頁在 Windows Chrome 中開啟
- `openclaw browser tabs` 傳回目標
- 後續動作 (`snapshot`, `screenshot`, `navigate`) 從同一個設定檔運作

## 常見的誤導性錯誤

將每則訊息視為特定層級的線索：

- `control-ui-insecure-auth`
  - UI 來源 / 安全內容問題，而非 CDP 傳輸問題
- `token_missing`
  - 身份驗證配置問題
- `pairing required`
  - 裝置核准問題
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 無法連線至已設定的 `cdpUrl`
- `gateway timeout after 1500ms`
  - 通常仍然是 CDP 連線性問題，或是遠端端點緩慢或無法連線
- `No Chrome tabs found for profile="user"`
  - 選取了本機 Chrome MCP 設定檔，但沒有主機本機分頁可用

## 快速檢查清單

1. Windows：`curl http://127.0.0.1:9222/json/version` 能運作嗎？
2. WSL2：`curl http://WINDOWS_HOST_OR_IP:9222/json/version` 能運作嗎？
3. OpenClaw 設定：`browser.profiles.<name>.cdpUrl` 是否使用那個完全相同的 WSL2 可連線位址？
4. Control UI：您是否正在開啟 `http://127.0.0.1:18789/` 而非 LAN IP？
5. 您是否嘗試跨 WSL2 和 Windows 使用 `existing-session`，而不是原始遠端 CDP？

## 實際收穫

此設定通常是可行的。困難的部分在於瀏覽器傳輸、Control UI 來源安全性以及權杖/配對可能會各自獨立失敗，但在使用者看起來卻很相似。

如果不確定：

- 先從本機驗證 Windows Chrome 端點
- 再從 WSL2 驗證相同的端點
- 僅於此之後再除錯 OpenClaw 設定或 Control UI 身份驗證

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
