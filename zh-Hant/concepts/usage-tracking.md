---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage Tracking"
---

# 用量追蹤

## 簡介

- 直接從使用量端點提取提供者的使用量/配額。
- 不包含估算成本；僅包含提供者回報的視窗。

## 顯示位置

- `/status` 在聊天中：包含 Emoji 的狀態卡片，顯示 session tokens 與估算成本（僅限 API key）。若可用，會顯示**目前模型提供者**的使用量。
- `/usage off|tokens|full` 在聊天中：逐回應的使用量頁尾（OAuth 僅顯示 tokens）。
- `/usage cost` 在聊天中：從 OpenClaw session logs 彙總的本機成本摘要。
- CLI：`openclaw status --usage` 會印出完整的各提供者明細。
- CLI：`openclaw channels list` 會在提供者設定旁印出相同的使用量快照（使用 `--no-usage` 以跳過）。
- macOS 選單列：「Context」下的「Usage」區段（僅在可用時）。

## 提供者 + 憑證

- **Anthropic (Claude)**：auth 檔案中的 OAuth tokens。
- **GitHub Copilot**：auth 檔案中的 OAuth tokens。
- **Gemini CLI**：auth 檔案中的 OAuth tokens。
- **Antigravity**：auth 檔案中的 OAuth tokens。
- **OpenAI Codex**：auth 檔案中的 OAuth tokens（若存在則使用 accountId）。
- **MiniMax**：API key（程式設計方案金鑰；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小時程式設計方案視窗。
- **z.ai**：透過 env/config/auth store 取得的 API key。

若沒有相符的 OAuth/API 憑證，使用量會隱藏。

import en from "/components/footer/en.mdx";

<en />
