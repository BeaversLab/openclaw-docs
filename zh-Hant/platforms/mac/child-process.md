---
summary: "macOS 上的 Gateway 生命週期 (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway 生命週期"
---

# macOS 上的 Gateway 生命週期

macOS 應用程式**預設透過 launchd 管理 Gateway**，且不會將 Gateway 產生為子處理程序。它會先嘗試附加至設定連接埠上已執行的 Gateway；如果無法連線，它會透過外部 `openclaw` CLI 啟用 launchd 服務（無內建執行階段）。這讓您獲得可靠的登入時自動啟動及當機後重新啟動功能。

子處理程序模式（由應用程式直接產生的 Gateway）目前**未使用**。
如果您需要與 UI 更緊密的耦合，請在終端機中手動執行 Gateway。

## 預設行為 (launchd)

- 該應用程式會安裝一個標記為 `ai.openclaw.gateway` 的 per‑user LaunchAgent
  （或在使用 `--profile`/`OPENCLAW_PROFILE` 時使用 `ai.openclaw.<profile>`；支援舊版 `com.openclaw.*`）。
- 啟用本機模式時，應用程式會確保 LaunchAgent 已載入，並視需要啟動 Gateway。
- 日誌會寫入 launchd gateway 日誌路徑（可在偵錯設定中看到）。

常用指令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行具名設定檔時，請將 label 替換為 `ai.openclaw.<profile>`。

## 未簽署的開發版本

`scripts/restart-mac.sh --no-sign` 適用於沒有簽署金鑰時的快速本機建置。為了防止 launchd 指向未簽署的中繼二進位檔，它會：

- 寫入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的簽署執行作業會清除此覆寫（如果標記存在）。若要手動重設：

```bash
rm ~/.openclaw/disable-launchagent
```

## 僅附加模式

若要強制 macOS 應用程式**永遠不安裝或管理 launchd**，請使用
`--attach-only` （或 `--no-launchd`）啟動。這會設定 `~/.openclaw/disable-launchagent`，
因此應用程式只會附加到已執行的 Gateway。您也可以在偵錯設定中切換相同的行為。

## 遠端模式

遠端模式永遠不會啟動本機 Gateway。應用程式使用 SSH 通道連線至遠端主機，並透過該通道進行連線。

## 為何我們偏好 launchd

- 登入時自動啟動。
- 內建的重新啟動/KeepAlive 語意。
- 可預期的日誌與監督。

如果將來再次需要真正的子進程模式，應將其記錄為一種
獨立的、明確的僅限開發的模式。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
