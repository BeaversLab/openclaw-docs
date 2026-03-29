---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage Tracking"
---

# 使用量追蹤

## 什麼是使用量追蹤

- 直接從供應商的使用量端點提取提供者的使用量/配額。
- 不包含預估成本；僅包含供應商回報的視窗。

## 顯示位置

- `/status` 在聊天中：包含表情符號的狀態卡片，顯示 session tokens 和預估成本（僅限 API key）。如果有提供，會顯示**目前模型提供者**的使用量。
- `/usage off|tokens|full` 在聊天中：每次回應的使用量頁尾（OAuth 僅顯示 tokens）。
- `/usage cost` 在聊天中：從 OpenClaw session 日誌匯總的本地成本摘要。
- CLI：`openclaw status --usage` 會印出每個提供者的完整詳細資料。
- CLI：`openclaw channels list` 會在提供者設定旁印出相同的使用量快照（使用 `--no-usage` 跳過）。
- macOS 選單列：Context 下的「Usage」區段（僅在可用時）。

## 提供者 + 憑證

- **Anthropic (Claude)**：auth 設定檔中的 OAuth tokens。
- **GitHub Copilot**：auth 設定檔中的 OAuth tokens。
- **Gemini CLI**：auth 設定檔中的 OAuth tokens。
- **Antigravity**：auth 設定檔中的 OAuth tokens。
- **OpenAI Codex**：auth 設定檔中的 OAuth tokens（如果有 accountId 則會使用）。
- **MiniMax**：API key（coding plan key；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小時的 coding plan 視窗。
- **z.ai**：透過 env/config/auth store 的 API key。

如果沒有對應的 OAuth/API 憑證，使用量將會隱藏。
