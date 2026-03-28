---
summary: "macOS 權限持久性 (TCC) 與簽署需求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 權限"
---

# macOS 權限 (TCC)

macOS 權限授予非常脆弱。TCC 將權限授予與應用程式的程式碼簽署、套件組合識別碼 及磁碟路徑 相關聯。如果其中任何一項發生變更，macOS 會將該應用程式視為新的，並可能丟棄或隱藏提示。

## 穩定權限的需求

- 相同路徑：從固定位置執行應用程式 (對於 OpenClaw，則為 `dist/OpenClaw.app`)。
- 相同的套件組合識別碼：變更套件 ID 會建立新的權限身分。
- 已簽署的應用程式：未簽署或臨時簽署 的建置版本無法持久保存權限。
- 一致的簽署：使用真實的 Apple Development 或 Developer ID 憑證，以便簽署在重新建置時保持穩定。

Ad-hoc 簽章會在每次建置時產生新的身分識別。macOS 將會忘記先前的授權，而在清除過時條目之前，提示可能完全消失。

## 當提示消失時的修復檢查清單

1. 結束應用程式。
2. 在「系統設定」->「隱私權與安全性」中移除應用程式項目。
3. 從相同路徑重新啟動應用程式並重新授權權限。
4. 如果提示仍未出現，請使用 `tccutil` 重設 TCC 項目並再試一次。
5. 部分權限只有在完全重新啟動 macOS 後才會重新出現。

重設範例（視需要取代 Bundle ID）：

```exec
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案和資料夾權限（桌面/文件/下載）

macOS 可能也會對終端機/背景程式封鎖桌面、文件和下載資料夾。如果檔案讀取或目錄列表停頓，請授權給執行檔案作業的相同程序內容（例如 Terminal/iTerm、LaunchAgent 啟動的應用程式或 SSH 程序）。

變通方法：如果您想避免逐個資料夾授權，請將檔案移至 OpenClaw 工作區 (`~/.openclaw/workspace`)。

如果您正在測試權限，請務必使用真實憑證進行簽署。Ad-hoc 建置僅適用於無需權限的快速本機執行。
