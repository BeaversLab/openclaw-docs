---
summary: "macOS 權限持久化 (TCC) 與簽署要求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 權限"
---

macOS 的權限授予非常脆弱。TCC 將權限授予與應用程式的程式碼簽署、Bundle ID 和磁碟路徑相關聯。如果這些項目發生變更，macOS 會將應用程式視為新應用程式，並可能捨棄或隱藏提示。

## 維持穩定權限的條件

- 相同路徑：從固定位置執行應用程式（對於 OpenClaw，為 `dist/OpenClaw.app`）。
- 相同的 Bundle ID：變更 Bundle ID 會建立一個新的權限身分識別。
- 已簽署的應用程式：未簽署或臨時簽署 的建置版本不會保留權限。
- 一致的簽署：使用真實的 Apple Development 或 Developer ID 憑證，以便簽署在重新建置期間保持穩定。

臨時簽署會在每次建置時產生新的身分識別。macOS 將會忘記先前的授予，並且在清除過期條目之前，提示可能會完全消失。

## 提示消失時的恢復檢查清單

1. 結束應用程式。
2. 在「系統設定」->「隱私權與安全性」中移除應用程式項目。
3. 從相同路徑重新啟動應用程式並重新授與權限。
4. 如果提示仍未出現，請使用 `tccutil` 重設 TCC 條目，然後重試。
5. 某些權限只有在完全重新啟動 macOS 後才會重新出現。

重設範例（視需要替換 Bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案和資料夾權限（桌面/文件/下載）

macOS 也可能對終端機/背景程序封鎖桌面、文件和下載資料夾。如果檔案讀取或目錄列表卡住，請授與執行檔案操作的相同程序上下文存取權（例如 Terminal/iTerm、LaunchAgent 啟動的應用程式或 SSH 程序）。

解決方法：如果您想要避免針對每個資料夾授與權限，請將檔案移至 OpenClaw 工作區（`~/.openclaw/workspace`）。

如果您正在測試權限，請務必使用真實憑證進行簽署。只有在權限不重要的快速本機執行中，臨時建置版本才可以接受。

## 相關

- [macOS 應用程式](/zh-Hant/platforms/macos)
- [macOS 簽署](/zh-Hant/platforms/mac/signing)
