---
summary: "用於 qa-lab、qa-channel、種子場景和協議報告的私人 QA 自動化形狀"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E 自動化"
---

# QA E2E 自動化

私人 QA 堆疊旨在以比單一單元測試更貼近現實、以頻道為形狀的方式來測試 OpenClaw。

目前的組成部分：

- `extensions/qa-channel`：具有 DM、頻道、執行緒、反應、編輯和刪除表面的合成訊息頻道。
- `extensions/qa-lab`：除錯器 UI 和 QA 匯流排，用於觀察對話記錄、注入傳入訊息以及匯出 Markdown 報告。
- `qa/`：用於啟動任務和基準 QA 場景的倉儲支援種子資產。

長期目標是一個雙面板 QA 站台：

- 左側：包含代理程式的 Gateway 儀表板（控制 UI）。
- 右側：QA Lab，顯示類似 Slack 的對話記錄和場景計畫。

這讓操作員或自動化迴圈能夠給予代理程式 QA 任務，觀察真實的頻道行為，並記錄成功、失敗或保持受阻的內容。

## 倉儲支援的種子

種子資產位於 `qa/`：

- `qa/QA_KICKOFF_TASK.md`
- `qa/seed-scenarios.json`

這些有意存放在 git 中，以便人類和代理程式都能看到 QA 計畫。基準清單應保持足夠廣泛以涵蓋：

- DM 和頻道聊天
- 執行緒行為
- 訊息操作生命週期
- cron 回呼
- 記憶回憶
- 模型切換
- 子代理程式移交
- 讀取倉儲和文件
- 一個小型的建置任務，例如 Lobster Invaders

## 報告

`qa-lab` 從觀察到的匯流排時間軸匯出 Markdown 協議報告。該報告應回答：

- 什麼有效
- 什麼失敗
- 什麼保持受阻
- 值得添加哪些後續場景

## 相關文件

- [測試](/en/help/testing)
- [QA 頻道](/en/channels/qa-channel)
- [儀表板](/en/web/dashboard)
