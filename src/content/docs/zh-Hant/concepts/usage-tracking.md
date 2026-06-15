---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "使用量追蹤"
---

## 它是什麼

- 直接從提供者的使用量端點提取提供者使用量/配額。
- 無估算成本；僅提供業者回報的配額視窗或帳戶狀態摘要。
- 可讀的配額視窗狀態輸出會正規化為 `X% left`，即使上游 API 回報的是已用配額、剩餘配額或僅有原始計數。沒有可重設配額視窗的業者可以改為顯示業者摘要文字，例如餘額。
- 當即時會話快照稀疏時，工作階段層級的 `/status` 和 `session_status` 可以回退到最新的文字記錄使用量項目。該回退機制會填補遺失的 token/cache 計數器，可以恢復作用中的執行時期模型標籤，並且在工作階段中繼資料遺失或較少時，傾向於使用較大的提示導向總計。既有的非零即時值優先。

## 顯示位置

- 聊天中的 `/status`：包含豐富表情符號的狀態卡片，顯示 Session tokens + 估算成本（僅限 API key）。當可用時，會以正規化的 `X% left` 視窗或業者摘要文字顯示**當前模型業者**的使用量。
- 聊天中的 `/usage off|tokens|full`：個別回應的使用量頁尾（OAuth 僅顯示 token）。
- 聊天中的 `/usage cost`：從 OpenClaw 工作階段日誌彙總的本機成本摘要。
- CLI：`openclaw status --usage` 會列印完整的各提供者明細。
- CLI：`openclaw channels list` 會在提供者設定旁列印相同的使用量快照（使用 `--no-usage` 跳過）。
- macOS 選單列：Context 下的「Usage」區段（僅在可用時顯示）。

## 提供者 + 憑證

- **Anthropic (Claude)**：驗證設定檔中的 OAuth 權杖。
- **GitHub Copilot**：驗證設定檔中的 OAuth 權杖。
- **Gemini CLI**：驗證設定檔中的 OAuth 權杖。
  - JSON 使用量會回退至 `stats`；`stats.cached` 會標準化為 `cacheRead`。
- **OpenAI Codex**：驗證設定檔中的 OAuth 權杖（如有 accountId 則會使用）。
- **MiniMax**：API 金鑰或 MiniMax OAuth 設定檔。OpenClaw 將
  `minimax`、`minimax-cn` 和 `minimax-portal` 視為相同的 MiniMax 配額
  介面，若存在則優先使用已儲存的 MiniMax OAuth，否則退回到
  `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  使用量輪詢會從 `models.providers.minimax-portal.baseUrl`
  或 `models.providers.minimax.baseUrl` 推導 Coding Plan 主機（當已設定時），否則使用
  MiniMax CN 主機。
  MiniMax 的原始 `usage_percent` / `usagePercent` 欄位代表 **剩餘**
  配額，因此 OpenClaw 會在顯示前將其反轉；當存在以計數為基礎的欄位時則優先採用。
  - Coding-plan 視窗標籤優先取自提供者的小時/分鐘欄位（當存在時），
    然後退回到 `start_time` / `end_time` 期間。
  - 如果 coding-plan 端點回傳 `model_remains`，OpenClaw 優先採用
    chat-model 項目，當缺乏明確的
    `window_hours` / `window_minutes` 欄位時，會從時間戳記推導視窗標籤，並在計畫標籤中包含模型
    名稱。
- **Xiaomi MiMo**：透過 env/config/auth store 的 API 金鑰 (`XIAOMI_API_KEY`)。
- **z.ai**：透過 env/config/auth store 的 API 金鑰。
- **DeepSeek**：透過 env/config/auth store 的 API key (`DEEPSEEK_API_KEY`)。
  OpenClaw 會呼叫 DeepSeek 的餘額端點，並將業者回報的餘額以文字顯示，而非百分比剩餘配額視窗。

當無法解析可用的業者使用量驗證時，使用量會被隱藏。業者可以提供外掛特定的使用量驗證邏輯；否則 OpenClaw 會退而求其次，從設定檔、環境變數或設定中比對 OAuth/API key 憑證。

## 相關

- [Token use and costs](/zh-Hant/reference/token-use)
- [API usage and costs](/zh-Hant/reference/api-usage-costs)
- [Prompt caching](/zh-Hant/reference/prompt-caching)
