---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Usage Tracking"
---

# 使用量追蹤

## 簡介

- 直接從供應商的使用量端點拉取供應商的使用量/配額。
- 沒有估算成本；僅顯示供應商回報的視窗。

## 顯示位置

- `/status` 在聊天中：包含 Session tokens 與預估成本（僅限 API 金鑰）的豐富表情符號狀態卡片。當有資料時，會顯示**目前模型供應商**的使用量。
- `/usage off|tokens|full` 在聊天中：每次回應的使用量頁尾（OAuth 僅顯示 tokens）。
- `/usage cost` 在聊天中：從 OpenClaw session logs 彙整的本地成本總結。
- CLI：`openclaw status --usage` 列印完整的各供應商細項。
- CLI：`openclaw channels list` 列印相同的使用量快照以及供應商設定（使用 `--no-usage` 跳過）。
- macOS 選單列：Context 下的「Usage」區段（僅在可用時）。

## 供應商 + 憑證

- **Anthropic (Claude)**：auth 設定檔中的 OAuth tokens。
- **GitHub Copilot**：auth 設定檔中的 OAuth tokens。
- **Gemini CLI**：auth 設定檔中的 OAuth tokens。
- **Antigravity**：auth 設定檔中的 OAuth tokens。
- **OpenAI Codex**：auth 設定檔中的 OAuth tokens（存在時使用 accountId）。
- **MiniMax**：API 金鑰（coding plan 金鑰；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小時的 coding plan 視窗。
- **z.ai**：透過 env/config/auth store 的 API 金鑰。

如果不存在相符的 OAuth/API 憑證，使用量將會隱藏。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
