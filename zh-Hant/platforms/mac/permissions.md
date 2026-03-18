---
summary: "macOS 權限持久性 (TCC) 與簽署需求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Packaging or signing the macOS app
  - Changing bundle IDs or app install paths
title: "macOS 權限"
---

# macOS 權限 (TCC)

macOS 權限的授予非常脆弱。TCC 會將權限授予與應用程式的程式碼簽署、Bundle 識別碼以及磁碟上的路徑關聯起來。如果其中任何一項發生變更，macOS 會將該應用程式視為新的，並可能捨棄或隱藏提示。

## 穩定權限的需求

- 相同路徑：從固定位置執行應用程式（對於 OpenClaw，為 `dist/OpenClaw.app`）。
- 相同 Bundle 識別碼：變更 Bundle ID 會建立新的權限身分。
- 已簽署的應用程式：未簽署或臨時簽署 的建置版本不會持久保存權限。
- 一致的簽署：使用真實的 Apple Development 或 Developer ID 憑證，以便簽署在重新建置之間保持穩定。

臨時簽署 每次建置都會產生一個新的身分。macOS 會忘記之前的授予，而且在清除過期條目之前，提示可能會完全消失。

## 當提示消失時的恢復檢查清單

1. 結束應用程式。
2. 在系統設定 -> 隱私權與安全性 中移除應用程式項目。
3. 從相同的路徑重新啟動應用程式並重新授予權限。
4. 如果提示仍然沒有出現，請使用 `tccutil` 重設 TCC 條目然後再試一次。
5. 某些權限只有在完全重新啟動 macOS 後才會重新出現。

重設範例（視需要替換 Bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案和資料夾權限 (桌面/文件/下載)

macOS 也可能會對終端機/背景程序封鎖桌面、文件和下載資料夾。如果檔案讀取或目錄列表卡住，請向執行檔案操作的相同程序內容授權（例如 Terminal/iTerm、由 LaunchAgent 啟動的應用程式或 SSH 程序）。

解決方法：如果您想避免針對每個資料夾授予權限，請將檔案移至 OpenClaw 工作區 (`~/.openclaw/workspace`)。

如果您正在測試權限，請務必使用真實憑證進行簽署。只有在權限不重要的快速本機執行中，臨時建置 才是可以接受的。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
