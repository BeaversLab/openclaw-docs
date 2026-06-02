---
summary: "從 OpenClaw 監督 Codex 應用伺服器階段。"
read_when:
  - You are installing, configuring, or auditing the codex-supervisor plugin
title: "Codex Supervisor 外掛程式"
---

# Codex Supervisor 外掛程式

從 OpenClaw 監督 Codex 應用伺服器階段。

## 發行版本

- 套件：`@openclaw/codex-supervisor`
- 安裝路徑：包含於 OpenClaw 中

## 介面

合約：工具

{/* openclaw-plugin-reference:manual-start */}

## 會話列表

`codex_sessions_list` 預設僅包含已載入的 Codex 會話。設定 `include_stored` 以包含已儲存的歷史記錄；此外掛程式使用 Codex 應用程式伺服器的僅狀態資料庫列表路徑，並預設將已儲存的結果上限設為 200。傳遞 `max_stored_sessions` 可降低或提高該上限，最高至 1000。

{/* openclaw-plugin-reference:manual-end */}
