---
summary: "由打包腳本生成的 macOS 除錯版本簽署步驟"
read_when:
  - Building or signing mac debug builds
title: "macOS 簽署"
---

# mac 簽署（除錯版本）

此應用程式通常從 [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) 構建，現在：

- 設置一個穩定的除錯 bundle 識別碼： `ai.openclaw.mac.debug`
- 使用該 bundle id 寫入 Info.plist（可透過 `BUNDLE_ID=...` 覆蓋）
- 呼叫 [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) 來簽署主二進位檔案和 app bundle，以便 macOS 將每次重新構建視為同一個已簽署的 bundle，並保持 TCC 權限（通知、輔助功能、螢幕錄製、麥克風、語音）。為了獲得穩定的權限，請使用真實的簽署身分；Ad-hoc 簽署是可選的且不穩定（參見 [macOS 權限](/zh-Hant/platforms/mac/permissions)）。
- 預設使用 `CODESIGN_TIMESTAMP=auto`；它會為 Developer ID 簽章啟用受信任的時間戳記。設定 `CODESIGN_TIMESTAMP=off` 以跳過時間戳記（離線除錯構建）。
- 將構建元資料注入 Info.plist： `OpenClawBuildTimestamp` (UTC) 和 `OpenClawGitCommit` (短雜湊)，以便「關於」面板可以顯示構建、git 和除錯/發布通道。
- **打包預設使用 Node 24**：該腳本會執行 TS 構建和控制 UI 構建。目前為 `22.14+` 的 Node 22 LTS 仍為了相容性而獲得支援。
- 從環境變數讀取 `SIGN_IDENTITY`。將 `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"` （或您的 Developer ID Application 憑證）新增到您的 shell rc 中，以便始終使用您的憑證進行簽署。Ad-hoc 簽署需要透過 `ALLOW_ADHOC_SIGNING=1` 或 `SIGN_IDENTITY="-"` 明確選擇加入（不建議用於權限測試）。
- 在簽署後執行 Team ID 審計，如果 app bundle 內的任何 Mach-O 是由不同的 Team ID 簽署的，則會失敗。設定 `SKIP_TEAM_ID_CHECK=1` 以略過。

## 使用方法

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### Ad-hoc 簽署注意事項

使用 `SIGN_IDENTITY="-"`（臨時簽署）簽署時，腳本會自動停用 **Hardened Runtime**（`--options runtime`）。這對於防止應用程式嘗試載入不共用相同 Team ID 的嵌入式框架（如 Sparkle）時發生崩潰是必要的。臨時簽署也會破壞 TCC 權限的持久性；請參閱 [macOS permissions](/zh-Hant/platforms/mac/permissions) 以了解恢復步驟。

## 建置「關於」的中繼資料

`package-mac-app.sh` 會在套件組合中標記：

- `OpenClawBuildTimestamp`：封裝時的 ISO8601 UTC 時間
- `OpenClawGitCommit`：簡短的 git 雜湊值（如果無法取得則為 `unknown`）

「關於」分頁會讀取這些金鑰以顯示版本、建置日期、 git 提交，以及是否為除錯建置（透過 `#if DEBUG`）。在程式碼變更後，請執行封裝工具以重新整理這些值。

## 為什麼

TCC 權限與套件組合識別碼 _和_ 程式碼簽章綁定。UUID 會變動的未簽署除錯建置會導致 macOS 在每次重建後遺失授權。對二進位檔案進行簽署（預設為臨時簽署）並保持固定的套件組合 id/路徑（`dist/OpenClaw.app`），可以在建置之間保留授權，這與 VibeTunnel 的方法一致。
