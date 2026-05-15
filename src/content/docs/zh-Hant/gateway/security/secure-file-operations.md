---
summary: "OpenClaw 如何安全處理本機檔案存取，以及為什麼可選的 fs-safe Python 輔助程式預設為關閉"
read_when:
  - Changing file access, archive extraction, workspace storage, or plugin filesystem helpers
title: "Secure file operations"
---

OpenClaw 使用 [`@openclaw/fs-safe`](https://github.com/openclaw/fs-safe) 進行安全敏感的本機檔案操作：受根目錄限制的讀寫、原子替換、封存檔解壓縮、暫存工作區、JSON 狀態以及機密檔案處理。

目標是為接收受信任路徑名稱的受信任 OpenClaw 程式碼提供一致的**程式庫防護**。這不是沙箱。主機檔案系統權限、OS 使用者、容器和代理程式/工具政策仍然定義了真正的影響範圍。

## 預設值：無 Python 輔助程式

OpenClaw 預設將 fs-safe POSIX Python 輔助程式設定為**關閉 (off)**。

原因：

- 除非操作員選擇加入，否則閘道不應產生永續的 Python 側車；
- 許多安裝不需要額外的父目錄變更防護硬化；
- 停用 Python 可讓套件/執行時行為在桌面、Docker、CI 和捆綁應用程式環境中更具可預測性。

OpenClaw 僅變更預設值。如果您明確設定模式，fs-safe 將會遵循該設定：

```bash
# Default OpenClaw behavior: Node-only fs-safe fallbacks.
OPENCLAW_FS_SAFE_PYTHON_MODE=off

# Opt into the helper when available, falling back if unavailable.
OPENCLAW_FS_SAFE_PYTHON_MODE=auto

# Fail closed if the helper cannot start.
OPENCLAW_FS_SAFE_PYTHON_MODE=require

# Optional explicit interpreter.
OPENCLAW_FS_SAFE_PYTHON=/usr/bin/python3
```

通用的 fs-safe 名稱也適用：`FS_SAFE_PYTHON_MODE` 和 `FS_SAFE_PYTHON`。

## 無 Python 時仍受保護的內容

即使關閉輔助程式，OpenClaw 仍使用 fs-safe 的 Node 路徑來：

- 拒絕相對路徑逸出 (例如 `..`)、絕對路徑，以及在僅允許名稱的情況下使用路徑分隔符；
- 透過受信任的根目錄控制代碼解析操作，而不是臨時檢查 `path.resolve(...).startsWith(...)`；
- 在需要該政策的 API 上拒絕符號連結和硬連結模式；
- 在 API 傳回或取用檔案內容時，使用身分識別檢查來開啟檔案；
- 針對狀態/設定檔進行原子同層暫存寫入；
- 針對讀取和封存檔解壓縮的位元組限制；
- 在 API 要求的情況下，針對機密和狀態檔案使用私人模式。

這些防護涵蓋了正常的 OpenClaw 威脅模型：在單一受信任操作員邊界內，處理受信任模型/外掛/通道路徑輸入的受信任閘道程式碼。

## Python 新增的功能

在 POSIX 系統上，fs-safe 的可選輔助程式會維持一個持續運作的 Python 處理程序，並針對父目錄的變更操作（如重新命名、移除、建立目錄、stat/list 以及部分寫入路徑）使用相對於檔案描述元（fd-relative）的檔案系統操作。

這縮小了相同 UID 的競爭條件視窗，避免其他處理程序在驗證與變更之間交換父目錄。對於那些不受信任的本地處理程序可以修改 OpenClaw 正在操作的相同目錄的主機而言，這是一種縱深防禦。

如果您的部署環境存在此風險，且保證 Python 存在，請使用：

```bash
OPENCLAW_FS_SAFE_PYTHON_MODE=require
```

當該輔助程式是您安全態勢的一部分時，請使用 `require` 而非 `auto`；如果輔助程式無法使用，`auto` 會刻意回退到僅使用 Node.js 的行為。

## 外掛與核心指南

- 當路徑來自訊息、模型輸出、配置或外掛輸入時，面向外掛的檔案存取應透過 `openclaw/plugin-sdk/*` 輔助程式進行，而非使用原始的 `fs`。
- 核心程式碼應使用 `src/infra/*` 下的本地 fs-safe 包裝函式，以便一致地套用 OpenClaw 的處理程序原則。
- 壓縮檔解壓縮應使用 fs-safe 壓縮檔輔助程式，並明確設定大小、項目計數、連結和目標地限制。
- 機密資料應使用 OpenClaw 機密輔助程式或 fs-safe 機密/私有狀態輔助程式；請勿自行撰寫圍繞 `fs.writeFile` 的模式檢查邏輯。
- 如果您需要對抗惡意本地使用者的隔離，請勿僅依賴 fs-safe。請在獨立的 OS 使用者/主機下執行個別的閘道，或使用沙盒機制。

相關連結：[Security](/zh-Hant/gateway/security)、[Sandboxing](/zh-Hant/gateway/sandboxing)、[Exec approvals](/zh-Hant/tools/exec-approvals)、[Secrets](/zh-Hant/gateway/secrets)。
