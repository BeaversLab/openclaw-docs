---
summary: "macOS 權限持久性 (TCC) 與簽署需求"
read_when:
  - 除錯 macOS 權限提示遺失或卡住的問題
  - 封裝或簽署 macOS 應用程式
  - 變更 Bundle ID 或應用程式安裝路徑
title: "macOS 權限"
---

# macOS 權限 (TCC)

macOS 權限授予非常脆弱。TCC 將權限授予與應用程式的程式碼簽章、Bundle 識別符以及磁碟路徑相關聯。如果其中任何一項發生變更，macOS 會將該應用程式視為新的應用程式，並可能遺失或隱藏提示。

## 權限穩定的需求

- 相同路徑：從固定位置執行應用程式 (對於 OpenClaw，則是 `dist/OpenClaw.app`)。
- 相同的 Bundle 識別符：變更 Bundle ID 會建立新的權限身分。
- 已簽署的應用程式：未簽署或臨時簽署 的組建不會保留權限。
- 一致的簽章：使用真正的 Apple Development 或 Developer ID 憑證，以便簽章在重新組建期間保持穩定。

臨時簽章 每次組建都會產生新的身分。macOS 將會忘記先前的授予內容，且提示可能會完全消失，直到過時的項目被清除為止。

## 提示消失時的恢復檢查清單

1. 結束應用程式。
2. 在「系統設定」->「隱私權與安全性」中移除應用程式項目。
3. 從相同的路徑重新啟動應用程式，並重新授予權限。
4. 如果提示仍未出現，請使用 `tccutil` 重設 TCC 項目，然後再試一次。
5. 某些權限只有在完全重新啟動 macOS 後才會重新出現。

重設範例 (視需要置換 Bundle ID)：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案與資料夾權限 (桌面/文件/下載)

macOS 可能也會對終端機/背景程序封鎖桌面、文件和下載資料夾。如果檔案讀取或目錄列表停止回應，請授予執行檔案操作的相同程序內容存取權 (例如 Terminal/iTerm、由 LaunchAgent 啟動的應用程式或 SSH 程序)。

解決方法：如果您想避免逐一授權資料夾，請將檔案移至 OpenClaw 工作區 (`~/.openclaw/workspace`)。

如果您正在測試權限，請務必使用真正的憑證進行簽署。臨時組建 僅適用於權限不重要的快速本機執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
