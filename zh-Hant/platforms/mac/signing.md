---
summary: "由打包腳本生成的 macOS 偵錯組建的簽署步驟"
read_when:
  - Building or signing mac debug builds
title: "macOS 簽署"
---

# mac 簽署（偵錯組建）

此應用程式通常由 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 組建，現在它：

- 設定一個穩定的偵錯 bundle 識別碼：`ai.openclaw.mac.debug`
- 使用該 bundle 識別碼寫入 Info.plist（可透過 `BUNDLE_ID=...` 覆蓋）
- 呼叫 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 來簽署主要二進位檔和 app bundle，使 macOS 將每次重新組建視為同一個已簽署的 bundle，並保留 TCC 權限（通知、輔助功能、螢幕錄製、麥克風、語音）。為了獲得穩定的權限，請使用真實的簽署身分識別；臨時簽署（ad-hoc）屬於選用且較為脆弱（請參閱 [macOS 權限](/zh-Hant/platforms/mac/permissions)）。
- 預設使用 `CODESIGN_TIMESTAMP=auto`；它會為 Developer ID 簽署啟用受信任的時間戳記。設定 `CODESIGN_TIMESTAMP=off` 以跳過時間戳記（離線偵錯組建）。
- 將組建元數據注入 Info.plist：`OpenClawBuildTimestamp` (UTC) 和 `OpenClawGitCommit` (簡短雜湊)，以便「關於」面板能顯示組建、git 和偵錯/發布通道。
- **打包預設為 Node 24**：該腳本會執行 TS 組建和 Control UI 組建。目前為 `22.16+` 的 Node 22 LTS 仍受支援以保持相容性。
- 從環境中讀取 `SIGN_IDENTITY`。將 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"`（或您的 Developer ID Application 憑證）新增到您的 shell rc 中，以便一律使用您的憑證進行簽署。臨時簽署需要透過 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 明確選用（不建議用於權限測試）。
- 在簽署後執行 Team ID 稽核，如果 app bundle 內的任何 Mach-O 是由不同的 Team ID 簽署的，則會失敗。設定 `SKIP_TEAM_ID_CHECK=1` 以略過。

## 用法

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### 臨時簽署注意事項

使用 `SIGN_IDENTITY="-"` (ad-hoc) 簽署時，腳本會自動停用 **Hardened Runtime** (`--options runtime`)。這是為了防止應用程式嘗試載入未共用相同 Team ID 的嵌入式框架（例如 Sparkle）時發生崩潰。Ad-hoc 簽章還會中斷 TCC 權限的持續性；請參閱 [macOS permissions](/zh-Hant/platforms/mac/permissions) 以了解復原步驟。

## 「關於」的建置元資料

`package-mac-app.sh` 會將以下資訊標記至套件組合：

- `OpenClawBuildTimestamp`：封裝時的 ISO8601 UTC 時間
- `OpenClawGitCommit`：簡短的 git 雜湊值（如果無法取得則為 `unknown`）

「關於」分頁會讀取這些金鑰以顯示版本、建置日期、 git 提交，以及是否為偵錯建置（透過 `#if DEBUG`）。變更程式碼後，請執行封裝程式以重新整理這些數值。

## 原因

TCC 權限與套件組合識別碼 _and_ 程式碼簽章綁定。UUID 不斷變更的未簽署偵錯建置會導致 macOS 在每次重新建置後遺忘先前授予的權限。簽署二進位檔案（預設為 ad‑hoc）並保持固定的 bundle id/path (`dist/OpenClaw.app`) 可在重新建置之間保留權限，這與 VibeTunnel 的方法一致。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
