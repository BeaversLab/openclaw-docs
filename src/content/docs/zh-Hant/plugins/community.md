---
summary: "尋找並發布社群維護的 OpenClaw 外掛"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin on ClawHub
title: "社群外掛"
doc-schema-version: 1
---

社群外掛是透過通道、工具、提供者、掛鉤或其他功能來擴充 OpenClaw 的第三方套件。請使用 [ClawHub](/zh-Hant/clawhub) 作為公開社群外掛的主要探索平台。

## 尋找外掛

從 CLI 搜尋 ClawHub：

```bash
openclaw plugins search "calendar"
```

安裝具有明確來源前綴的 ClawHub 外掛：

```bash
openclaw plugins install clawhub:<package-name>
```

在啟動切換期間，npm 仍是支援的直接安裝路徑：

```bash
openclaw plugins install npm:<package-name>
```

使用 [管理外掛](/zh-Hant/plugins/manage-plugins) 查看常見的安裝、更新、檢查和解除安裝範例。使用 [`openclaw plugins`](/zh-Hant/cli/plugins) 取得完整的命令參考和來源選擇規則。

## 發布外掛

當您希望 OpenClaw 使用者探索並安裝外掛時，請在 ClawHub 上發布公開的社群外掛。ClawHub 掌管即時套件列表、發布歷史、掃描狀態和安裝提示；文件並不維護靜態的第三方外掛目錄。

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

發布前，請確保外掛具有套件中繼資料、外掛資訊清單、設定文件，以及明確的維護負責人。ClawHub 會在建立發布版本前驗證擁有者範圍、套件名稱、版本、檔案限制和來源中繼資料，然後在審查和驗證完成之前，將新發布版本對一般的安裝和下載介面保持隱藏。

發布前請使用此檢查清單：

| 需求               | 原因                                               |
| ------------------ | -------------------------------------------------- |
| 發布於 ClawHub     | 使用者需要 `openclaw plugins install` 提示才能運作 |
| 公開 GitHub 儲存庫 | 來源審查、問題追蹤、透明度                         |
| 設定與使用文件     | 使用者需要知道如何進行設定                         |
| 積極維護           | 最近的更新或妥善處理問題                           |

使用這些頁面以了解完整的發布合約：

- [ClawHub 發布](/zh-Hant/clawhub/publishing) 說明擁有者、範圍、發布版本、審查、套件驗證和套件移轉。
- [建置外掛](/zh-Hant/plugins/building-plugins) 展示外掛套件結構和首次發布工作流程。
- [外掛資訊清單](/zh-Hant/plugins/manifest) 定義原生外掛資訊清單欄位。

## 相關

- [外掛程式](/zh-Hant/tools/plugin) - 安裝、設定、重新啟動及疑難排解
- [管理外掛程式](/zh-Hant/plugins/manage-plugins) - 指令範例
- [ClawHub 發佈](/zh-Hant/clawhub/publishing) - 發佈與發行規則
