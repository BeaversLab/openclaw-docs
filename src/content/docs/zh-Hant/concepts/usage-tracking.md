---
summary: "Usage tracking surfaces and credential requirements"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "使用量追蹤"
---

## 它是什麼

- 直接從提供者的使用量端點提取提供者使用量/配額。
- 無估算成本；僅顯示提供者回報的視窗。
- 人類可讀的狀態輸出會標準化為 `X% left`，即使上游 API 回報的是已用配額、剩餘配額，或僅是原始計數。
- 當即時會話快照稀疏時，工作階段層級的 `/status` 和 `session_status` 可以回退到最新的文字記錄使用量項目。該回退機制會填補遺失的 token/cache 計數器，可以恢復作用中的執行時期模型標籤，並且在工作階段中繼資料遺失或較少時，傾向於使用較大的提示導向總計。既有的非零即時值優先。

## 顯示位置

- 聊天中的 `/status`：包含工作階段 token + 估算成本（僅限 API 金鑰）的豐富表情符號狀態卡。提供者使用量會顯示**目前模型提供者**的資訊（如有），並以標準化的 `X% left` 視窗呈現。
- 聊天中的 `/usage off|tokens|full`：個別回應的使用量頁尾（OAuth 僅顯示 token）。
- 聊天中的 `/usage cost`：從 OpenClaw 工作階段日誌彙總的本機成本摘要。
- CLI：`openclaw status --usage` 會列印完整的各提供者明細。
- CLI：`openclaw channels list` 會在提供者設定旁列印相同的使用量快照（使用 `--no-usage` 跳過）。
- macOS 选單列：Context 下的「Usage」區段（僅在可用時顯示）。

## 提供者 + 憑證

- **Anthropic (Claude)**：驗證設定檔中的 OAuth 權杖。
- **GitHub Copilot**：驗證設定檔中的 OAuth 權杖。
- **Gemini CLI**：驗證設定檔中的 OAuth 權杖。
  - JSON 使用量會回退至 `stats`；`stats.cached` 會標準化為 `cacheRead`。
- **OpenAI Codex**：驗證設定檔中的 OAuth 權杖（如有 accountId 則會使用）。
- **MiniMax**：API 金鑰或 MiniMax OAuth 設定檔。OpenClaw 將
  `minimax`、`minimax-cn` 和 `minimax-portal` 視為相同的 MiniMax 配額
  介面，如果存在儲存的 MiniMax OAuth 則優先使用，否則回退
  至 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 的原始 `usage_percent` / `usagePercent` 欄位表示**剩餘**
  配額，因此 OpenClaw 會在顯示前將其反轉；如果存在基於計數的欄位，則優先使用。
  - Coding-plan 視窗標籤來自提供商的小時/分鐘欄位（如果
    存在），然後回退至 `start_time` / `end_time` 範圍。
  - 如果 coding-plan 端點返回 `model_remains`，OpenClaw 會優先使用
    chat-model 條目，當缺少明確的
    `window_hours` / `window_minutes` 欄位時，從時間戳記推導視窗標籤，並在計畫標籤中包含模型
    名稱。
- **Xiaomi MiMo**：透過 env/config/auth store 的 API 金鑰 (`XIAOMI_API_KEY`)。
- **z.ai**：透過 env/config/auth store 的 API 金鑰。

當無法解析可用的提供商用量認證時，用量資訊將被隱藏。提供商
可以提供外掛特定的用量認證邏輯；否則 OpenClaw 會回退至
從認證設定檔、環境變數
或設定中匹配 OAuth/API 金鑰憑證。

## 相關

- [Token 使用量與成本](/zh-Hant/reference/token-use)
- [API 使用量與成本](/zh-Hant/reference/api-usage-costs)
- [提示快取](/zh-Hant/reference/prompt-caching)
