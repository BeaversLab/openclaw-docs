---
summary: "使用量追蹤介面與憑證需求"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "使用量追蹤"
---

# 使用量追蹤

## 簡介

- 直接從提供者的用量端點提取提供者使用量/配額。
- 無估算成本；僅顯示提供者回報的視窗。

## 顯示位置

- 聊天中的 `/status`：包含工作階段 Token 和估算成本（僅限 API 金鑰）的豐富 Emoji 狀態卡。當有資料時，會顯示 **目前模型提供者** 的使用量。
- 聊天中的 `/usage off|tokens|full`：每次回應的使用量頁尾（OAuth 僅顯示 Token）。
- 聊天中的 `/usage cost`：從 OpenClaw 工作階段日誌彙總的本機成本摘要。
- CLI：`openclaw status --usage` 會列印完整的各提供者明細。
- CLI：`openclaw channels list` 會在提供者設定旁列印相同的用量快照（使用 `--no-usage` 跳過）。
- macOS 選單列：Context 下的「Usage」區段（僅在可用時）。

## Providers + credentials

- **Anthropic (Claude)**：auth profile 中的 OAuth 權杖。
- **GitHub Copilot**：auth profile 中的 OAuth 權杖。
- **Gemini CLI**：auth profile 中的 OAuth 權杖。
- **Antigravity**：auth profile 中的 OAuth 權杖。
- **OpenAI Codex**：auth profile 中的 OAuth 權杖（若存在則使用 accountId）。
- **MiniMax**：API 金鑰（coding plan key；`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_API_KEY`）；使用 5 小時的 coding plan 視窗。
- **z.ai**：透過 env/config/auth store 的 API 金鑰。

若沒有相符的 OAuth/API 憑證，則會隱藏用量資訊。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
