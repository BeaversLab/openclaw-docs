---
summary: "macOS 上的 Gateway 生命週期 (launchd)"
read_when:
  - 將 mac 應用程式與 Gateway 生命週期整合
title: "Gateway 生命週期"
---

# macOS 上的 Gateway 生命週期

macOS 應用程式**預設透過 launchd 管理 Gateway**，並不會將 Gateway 作為子程序產生。它會先嘗試附加至已設定連接埠上正在執行的 Gateway；如果無法連接，它會透過外部 `openclaw` CLI 啟用 launchd 服務（無內建執行環境）。這能讓您在登入時可靠地自動啟動，並在當機時重新啟動。

子程序模式（由應用程式直接產生 Gateway）目前**未使用**。
如果您需要與 UI 更緊密的結合，請在終端機中手動執行 Gateway。

## 預設行為 (launchd)

- 該應用程式會安裝一個標籤為 `ai.openclaw.gateway` 的逐使用者 LaunchAgent
  （或在使用 `--profile`/`OPENCLAW_PROFILE` 時標記為 `ai.openclaw.<profile>`；支援舊版 `com.openclaw.*`）。
- 當啟用本機模式時，應用程式會確保已載入 LaunchAgent，並在需要時啟動 Gateway。
- 日誌會寫入 launchd gateway 日誌路徑（可在偵錯設定中看到）。

常用指令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

## 未簽署的開發版本

`scripts/restart-mac.sh --no-sign` 適用於當您沒有簽章金鑰時的快速本機建置。為了防止 launchd 指向未簽署的中繼二進位檔，它會：

- 寫入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的已簽署執行作業會在標記存在時清除此覆寫。若要手動重設：

```bash
rm ~/.openclaw/disable-launchagent
```

## 僅附加模式

若要強制 macOS 應用程式**永不安裝或管理 launchd**，請使用 `--attach-only`（或 `--no-launchd`）啟動它。這會設定 `~/.openclaw/disable-launchagent`，
因此應用程式僅會附加至已正在執行的 Gateway。您可以在「Debug Settings」中切換相同的行為。

## 遠端模式

遠端模式永遠不會啟動本機 Gateway。應用程式會使用通往遠端主機的 SSH 通道，並透過該通道進行連線。

## 為何我們偏好 launchd

- 登入時自動啟動。
- 內建的重新啟動/KeepAlive 語意。
- 可預期的日誌與監督。

如果再次需要真正的子程序模式，應將其記錄為一個獨立的、明確僅供開發使用的模式。

import en from "/components/footer/en.mdx";

<en />
