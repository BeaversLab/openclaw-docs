---
summary: "由封裝腳本生成的 macOS 偵錯版本簽署步驟"
read_when:
  - Building or signing mac debug builds
title: "macOS 簽署"
---

# mac 簽署（偵錯版本）

此應用程式通常從 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 建置，現在：

- 設定一個穩定的偵錯套件識別碼：`ai.openclaw.mac.debug`
- 使用該套件 ID 寫入 Info.plist（透過 `BUNDLE_ID=...` 覆蓋）
- 呼叫 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 來簽署主要二進位檔和應用程式套件，使 macOS 將每次重新建置視為同一個已簽署的套件，並保留 TCC 權限（通知、輔助功能、螢幕錄製、麥克風、語音）。若要獲得穩定的權限，請使用真實的簽署身分識別；臨時簽署（ad-hoc）為選用且不穩定（請參閱 [macOS 權限](/zh-Hant/platforms/mac/permissions)）。
- 預設使用 `CODESIGN_TIMESTAMP=auto`；它會為 Developer ID 簽章啟用受信任的時間戳記。設定 `CODESIGN_TIMESTAMP=off` 以跳過時間戳記（離線偵錯建置）。
- 將建置中繼資料注入 Info.plist：`OpenClawBuildTimestamp` (UTC) 和 `OpenClawGitCommit` (短雜湊)，以便「關於」面板能顯示建置、git 及偵錯/正式版通道。
- **打包預設為 Node 24**：該腳本會執行 TS 建置和控制介面建置。為了相容性，目前為 `22.16+` 的 Node 22 LTS 仍受支援。
- 從環境變數讀取 `SIGN_IDENTITY`。將 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或您的 Developer ID 應用程式憑證）新增到您的 shell rc 中，以便一律使用您的憑證進行簽署。臨時簽署需要透過 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 明確加入（不建議用於權限測試）。
- 在簽署後執行 Team ID 審計，如果應用程式套件內的任何 Mach-O 是由不同的 Team ID 簽署的，則會失敗。設定 `SKIP_TEAM_ID_CHECK=1` 以繞過。

## 使用方法

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### 臨時簽署說明

使用 `SIGN_IDENTITY="-"` (ad-hoc) 簽署時，腳本會自動停用 **Hardened Runtime** (`--options runtime`)。這是為了防止應用程式嘗試載入未共用相同 Team ID 的嵌入式框架（如 Sparkle）時發生崩潰所必須的。臨時簽署也會中斷 TCC 權限的持久性；請參閱 [macOS permissions](/zh-Hant/platforms/mac/permissions) 以了解復原步驟。

## 關於的建置元資料

`package-mac-app.sh` 會將以下資訊加印到套件上：

- `OpenClawBuildTimestamp`：打包時的 ISO8601 UTC 時間
- `OpenClawGitCommit`：簡短的 git 雜湊值（若無法取得則為 `unknown`）

「關於」標籤頁會讀取這些鍵以顯示版本、建置日期、git commit，以及是否為偵錯版本（透過 `#if DEBUG`）。在程式碼變更後，請執行打包器以重新整理這些數值。

## 原因

TCC 權限與 bundle identifier _以及_ 程式碼簽章綁定。具有變動 UUID 的未簽署偵錯版本導致 macOS 在每次重新建置後遺忘已授與的權限。簽署二進位檔（預設為 ad‑hoc）並保持固定的 bundle id/路徑（`dist/OpenClaw.app`）可在建置之間保留權限，這與 VibeTunnel 的做法一致。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
