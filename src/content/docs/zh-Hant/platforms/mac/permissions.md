---
summary: "macOS 權限持久化 (TCC) 與簽署要求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 權限"
---

# macOS 權限 (TCC)

macOS 權限授予非常脆弱。TCC 將權限授予與應用程式的程式碼簽署、Bundle 識別符以及磁碟路徑關聯起來。如果其中任何一項發生變更，macOS 會將該應用程式視為新應用程式，並可能捨棄或隱藏提示。

## 維持權限穩定的要求

- 相同路徑：從固定位置執行應用程式 (對於 OpenClaw，則是 `dist/OpenClaw.app`)。
- 相同的 Bundle 識別符：變更 Bundle ID 會建立一個新的權限身分。
- 已簽署的應用程式：未簽署或臨時簽署 的組建不會持久化權限。
- 一致的簽署：使用真實的 Apple Development 或 Developer ID 憑證，以便簽署在重新組建期間保持穩定。

臨時簽署會在每次組建時產生新的身分。macOS 將會忘記先前的授予，並且提示可能會完全消失，直到過時的項目被清除。

## 當提示消失時的修復檢查清單

1. 結束應用程式。
2. 在系統設定 -> 隱私權與安全性中移除應用程式項目。
3. 從相同路徑重新啟動應用程式並重新授予權限。
4. 如果提示仍未出現，請使用 `tccutil` 重設 TCC 項目，然後再試一次。
5. 部分權限僅在完全重新啟動 macOS 後才會重新出現。

重設範例 (視需要替換 Bundle ID)：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案和資料夾權限 (桌面/文件/下載)

macOS 也可能會對終端機/背景程序限制桌面、文件和下載資料夾的存取。如果檔案讀取或目錄列表掛起，請授予執行檔案操作的相同程序內容存取權限 (例如 Terminal/iTerm、由 LaunchAgent 啟動的應用程式或 SSH 程序)。

解決方法：如果您想避免逐一授予資料夾權限，請將檔案移至 OpenClaw 工作區 (`~/.openclaw/workspace`)。

如果您正在測試權限，請務必使用真實憑證進行簽署。臨時組建僅適用於權限不重要的快速本機執行。
