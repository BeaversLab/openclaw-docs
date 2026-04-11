---
summary: "Private QA automation shape for qa-lab, qa-channel, seeded scenarios, and protocol reports"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E Automation"
---

# QA E2E 自動化

私人 QA 堆疊旨在以比單一單元測試更貼近現實、以頻道為形狀的方式來測試 OpenClaw。

目前的組成部分：

- `extensions/qa-channel`：具有 DM、頻道、執行緒、反應、編輯和刪除介面的綜合訊息頻道。
- `extensions/qa-lab`：用於觀察傳輸記錄、注入入站訊息和匯出 Markdown 報告的偵錯器 UI 和 QA 匯流排。
- `qa/`：用於初始任務和基準 QA 情境的儲存庫支援的種子資產。

目前的 QA 操作員流程是一個雙面板的 QA 網站：

- 左側：包含代理程式的 Gateway 儀表板（控制 UI）。
- 右側：QA Lab，顯示類似 Slack 的對話記錄和場景計畫。

執行方式如下：

```bash
pnpm qa:lab:up
```

這會建置 QA 網站、啟動 Docker 支援的 Gateway 通道，並公開 QA Lab 頁面，操作員或自動化迴圈可以在其中為代理程式指派 QA 任務、觀察真實的頻道行為，並記錄成功、失敗或受阻的內容。

為了在不每次重建 Docker 映像檔的情況下加速 QA Lab UI 迭代，請使用 bind-mounted QA Lab 套件啟動堆疊：

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` 將 Docker 服務保持在預先建置的映像檔上，並將 `extensions/qa-lab/web/dist` bind-mount 到 `qa-lab` 容器中。`qa:lab:watch` 會在變更時重建該套件，當 QA Lab 資產雜湊變更時，瀏覽器會自動重新載入。

## 儲存庫支援的種子

種子資產位於 `qa/`：

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

這些有意放在 git 中，以便人類和代理程式都能看到 QA 計劃。基準清單應保持足夠廣泛以涵蓋：

- DM 和頻道聊天
- 執行緒行為
- 訊息操作生命週期
- cron 回呼
- 記憶回溯
- 模型切換
- 子代理程式交接
- 閱讀儲存庫和閱讀文件
- 一個小型建置任務，例如 Lobster Invaders

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協議報告。該報告應回答：

- 什麼有效
- 什麼失敗
- 什麼仍然受阻
- 哪些後續情境值得新增

## 相關文件

- [測試](/en/help/testing)
- [QA 頻道](/en/channels/qa-channel)
- [儀表板](/en/web/dashboard)
