---
summary: "macOS 上的 Gateway 生命週期 (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway 生命週期"
---

# macOS 上的 Gateway 生命週期

macOS 應用程式預設會**透過 launchd 管理 Gateway**，而不會將
Gateway 產生為子行程。它會先嘗試附加至已設定連接埠上
正在執行的 Gateway；如果無法連線，它會透過外部 `openclaw` CLI 啟用 launchd
服務 (無內建執行環境)。這能讓您在登入時可靠地自動啟動，並在崩潰時重新啟動。
子行程模式 (Gateway 直接由應用程式產生) 目前**未使用**。
如果

子行程模式 (Gateway 直接由應用程式產生) 目前**未使用**。
如果您需要與 UI 更緊密地結合，請在終端機中手動執行 Gateway。

## 預設行為 (launchd)

- 應用程式會安裝一個標記為 `ai.openclaw.gateway` 的個別使用者 LaunchAgent
  (或在使用 `--profile`/`OPENCLAW_PROFILE` 時為 `ai.openclaw.<profile>`；支援舊版 `com.openclaw.*`)。
- 當啟用本機模式時，應用程式會確保 LaunchAgent 已載入並
  在需要時啟動 Gateway。
- 日誌會寫入 launchd gateway 日誌路徑 (可在「偵錯設定」中看到)。

常見指令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

執行命名設定檔時，請將標籤替換為 `ai.openclaw.<profile>`。

## 未簽署的開發組建

`scripts/restart-mac.sh --no-sign` 適用於當您沒有簽署金鑰時的快速本機組建。為了防止 launchd 指向未簽署的
中繼 binary，它會：

- 寫入 `~/.openclaw/disable-launchagent`。

`scripts/restart-mac.sh` 的簽署執行作業會在標記存在時清除此覆寫。若要手動重設：

```bash
rm ~/.openclaw/disable-launchagent
```

## 僅附加模式

若要強制 macOS 應用程式**永不安裝或管理 launchd**，請使用
`--attach-only` (或 `--no-launchd`) 來啟動它。這會設定 `~/.openclaw/disable-launchagent`，
因此應用程式僅會附加至已經在執行的 Gateway。您可以在「偵錯設定」中切換相同的行為。

## 遠端模式

遠端模式從不啟動本機 Gateway。應用程式會使用 SSH 通道連線至
遠端主機，並透過該通道進行連線。

## 為什麼我們偏好使用 launchd

- 登入時自動啟動。
- 內建的重新啟動/KeepAlive 語意。
- 可預測的日誌與監督。

如果日後真正需要子進程模式，應將其記載為一個獨立、明確且僅限開發的模式。
