---
summary: "macOS 上的 Gateway 生命週期 (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway 生命週期"
---

# macOS 上的 Gateway 生命週期

macOS 應用程式預設**透過 launchd 管理 Gateway**，且不會將 Gateway 產生為子行程。它會先嘗試附加到設定連接埠上已經在執行的 Gateway；如果無法連線，它會透過外部 `openclaw` CLI 啟用 launchd 服務（無內嵌執行時期）。這讓您能夠在登入時可靠地自動啟動，並在當機時重新啟動。

子行程模式（由應用程式直接產生的 Gateway）目前**未在使用**。
如果您需要與 UI 更緊密的整合，請在終端機中手動執行 Gateway。

## 預設行為 (launchd)

- 該應用程式會安裝一個標籤為 `ai.openclaw.gateway` 的使用者層級 LaunchAgent
  （或在使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；支援傳統的 `com.openclaw.*`）。
- 啟用本機模式時，應用程式會確保 LaunchAgent 已載入，並在需要時啟動 Gateway。
- 日誌會寫入 launchd gateway 日誌路徑（可在 Debug Settings 中查看）。

常用指令：

```exec
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

## 未簽署的開發版本

`scripts/restart-mac.sh --no-sign` 適用於當您沒有簽署金鑰時的快速本地建置。為了防止 launchd 指向未簽署的 relay binary，它會：

- 寫入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的簽署執行如果發現標記，會清除此覆寫。若要手動重設：

```exec
rm ~/.openclaw/disable-launchagent
```

## 僅附加模式

若要強制 macOS 應用程式**永不安裝或管理 launchd**，請使用 `--attach-only` (或 `--no-launchd`) 啟動它。這會設定 `~/.openclaw/disable-launchagent`，因此應用程式僅會附加到已經在執行的 Gateway。您可以在 Debug Settings 中切換相同的行為。

## 遠端模式

遠端模式從不啟動本機 Gateway。應用程式會使用通往遠端主機的 SSH 通道，並透過該通道進行連線。

## 為何我們偏好 launchd

- 登入時自動啟動。
- 內建重新啟動/KeepAlive 語意。
- 可預測的日誌與監控。

如果日後再次需要真正的子程序模式，應將其記錄為一個獨立、明確的僅限開發模式。
