---
summary: "macOS 上的 Gateway 生命週期 (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway lifecycle on macOS"
---

macOS 應用程式預設**透過 launchd 管理 Gateway**，且不會將 Gateway
當作子程序產生。它首先會嘗試附加至設定埠號上已執行中的
Gateway；如果無法連線，它會透過外部 `openclaw` CLI 啟用 launchd
服務（無內嵌執行時期）。這能為您提供可靠的登入時自動啟動
及當機後重新啟動功能。
子程序模式（由應用程式直接產生的 Gateway）目前**未使用**。
如果您需要與 UI 更緊密的整合，

子程序模式（由應用程式直接產生的 Gateway）目前**未使用**。
如果您需要與 UI 更緊密的整合，請在終端機中手動執行 Gateway。

## 預設行為 (launchd)

- 該應用程式會安裝一個標記為 `ai.openclaw.gateway` 的
  每位使用者 LaunchAgent（或在使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；支援舊版 `com.openclaw.*`）。
- 當啟用本機模式時，應用程式會確保已載入 LaunchAgent 並
  在需要時啟動 Gateway。
- 日誌會寫入 launchd gateway 日誌路徑（可在 Debug Settings 中看見）。

常用指令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

## 未簽署的開發版本

`scripts/restart-mac.sh --no-sign` 適用於當您沒有
簽署金鑰時的快速本機組建。為了防止 launchd 指向未簽署的 relay 二進位檔案，它會：

- 寫入 `~/.openclaw/disable-launchagent`。

如果標記存在，`scripts/restart-mac.sh` 的簽署執行會清除此覆寫。若要手動重設：

```bash
rm ~/.openclaw/disable-launchagent
```

## 僅附加模式

若要強制 macOS 應用程式**永遠不安裝或管理 launchd**，請使用
`--attach-only`（或 `--no-launchd`）啟動。這會設定 `~/.openclaw/disable-launchagent`，
因此應用程式僅會附加至已執行中的 Gateway。您可以在 Debug Settings 中切換
相同的行為。

## 遠端模式

遠端模式從不啟動本機 Gateway。該應用程式使用通往遠端主機的 SSH 通道並透過該通道進行連線。

## 為何我們偏好 launchd

- 登入時自動啟動。
- 內建重新啟動/KeepAlive 語意。
- 可預測的日誌與監督。

如果再次需要真正的子程序模式，應將其記錄為一個
獨立的、僅限開發的明確模式。

## 相關

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [Gateway 操作手冊](/zh-Hant/gateway)
