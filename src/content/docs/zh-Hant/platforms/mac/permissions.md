---
summary: "macOS 權限持久化 (TCC) 與簽署要求"
read_when:
  - Debugging missing or stuck macOS permission prompts
  - Deciding whether to grant Accessibility to node or a CLI runtime
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

## Node 與 CLI 執行時的輔助功能權限授予

建議將輔助功能權限授予 OpenClaw.app、Peekaboo.app 或其他具有自有 Bundle ID 的已簽署輔助程式，而不是通用的 `node` 二進位檔案。

macOS TCC 會將輔助功能權限授予其所見行程的程式碼識別身份。如果 Homebrew、nvm、pnpm 或 npm 工作流程導致共享的 `node` 可執行檔獲得輔助功能權限，則透過同一個可執行檔啟動的任何 JavaScript 套件都可能繼承 GUI 自動化權限。

請將系統設定中的 `node` 項目視為該 Node 執行時的廣泛權限，而非單一 npm 套件的權限。除非您信任透過該特定 Node 安裝版本啟動的每個腳本與套件，否則請避免將輔助功能權限授予 `node`。

如果您不小心將輔助功能權限授予了 `node`，請從「系統設定」>「隱私與安全性」>「輔助功能」中移除該項目。然後將權限授予應該擁有 UI 自動化功能的已簽署應用程式或輔助程式。

## 當提示消失時的恢復檢查清單

1. 退出應用程式。
2. 移除「系統設定」>「隱私與安全性」中的應用程式項目。
3. 從相同路徑重新啟動應用程式並重新授予權限。
4. 如果提示仍未出現，請使用 `tccutil` 重設 TCC 項目並重試。
5. 某些權限只有在完全重新啟動 macOS 後才會重新出現。

重設範例（視需要替換 Bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 檔案與資料夾權限（桌面/文件/下載）

macOS 也可能對終端機/背景行程的桌面、文件和下載資料夾進行存取限制。如果檔案讀取或目錄列表停頓，請將存取權限授予執行檔案操作的同一行程上下文（例如 Terminal/iTerm、LaunchAgent 啟動的應用程式或 SSH 行程）。

變通方法：如果您想避免逐一授予資料夾權限，可以將檔案移動到 OpenClaw 工作區（`~/.openclaw/workspace`）中。

如果您正在測試權限，請務必使用真實憑證進行簽署。Ad-hoc 建置僅適用於不需要權限的快速本機執行。

## 相關

- [macOS app](/zh-Hant/platforms/macos)
- [macOS signing](/zh-Hant/platforms/mac/signing)
