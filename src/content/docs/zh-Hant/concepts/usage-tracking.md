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
- 可讀的狀態輸出會正規化為 `X% left`，即使上游 API 回報的是已用配額、剩餘配額，或僅有原始計數。
- 當即時會話快照資訊稀疏時，層級的 `/status` 與 `session_status` 可以退回到最新的逐字稿使用記錄。該退回機制會填補遺失的 token/cache 計數器，還可還原當前的執行時期模型標籤，並在會詮詮資料遺失或較小時，偏好選擇較大的提示導向總數。既有的非零即時數值仍會優先被採用。

## 顯示位置

- 聊天中的 `/status`：包含會話 tokens + 預估成本（僅限 API 金鑰）、豐富 emoji 的狀態卡片。當提供者使用量可作為正規化 `X% left` 視窗使用時，會顯示**目前模型提供者**的使用量。
- 聊天中的 `/usage off|tokens|full`：每次回應的使用量頁尾（OAuth 僅顯示 tokens）。
- 聊天中的 `/usage cost`：從 OpenClaw 會話日誌匯總的本機成本摘要。
- CLI：`openclaw status --usage` 會列印出依提供者區分的完整明細。
- CLI：`openclaw channels list` 會在提供者設定旁列印相同的使用量快照（使用 `--no-usage` 跳過）。
- macOS 選單列：Context 下的「Usage」區段（僅在有可用資料時顯示）。

## 提供者 + 憑證

- **Anthropic (Claude)**：auth 設定檔中的 OAuth tokens。
- **GitHub Copilot**：auth 設定檔中的 OAuth tokens。
- **Gemini CLI**：auth 設定檔中的 OAuth tokens。
  - JSON 使用量會退回到 `stats`；`stats.cached` 會正規化為 `cacheRead`。
- **OpenAI Codex**：auth 設定檔中的 OAuth tokens（若存在則使用 accountId）。
- **MiniMax**：API 金鑰或 MiniMax OAuth 設定檔。OpenClaw 將
  `minimax`、`minimax-cn` 和 `minimax-portal` 視為同一個 MiniMax 配額
  介面，偏好使用儲存的 MiniMax OAuth（如果存在），否則會回退
  至 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 的原始 `usage_percent` / `usagePercent` 欄位代表**剩餘**
  配額，因此 OpenClaw 會在顯示前將其反轉；當存在以計數為基礎的欄位時，則優先採用。
  - Coding-plan 視窗標籤來自提供者的小時/分鐘欄位（如果
    存在），否則回退至 `start_time` / `end_time` 區間。
  - 如果 coding-plan 端點返回 `model_remains`，OpenClaw 偏好
    使用聊天模型條目，當缺少明確的
    `window_hours` / `window_minutes` 欄位時，會從時間戳記推導視窗標籤，並在計畫標籤中包含模型
    名稱。
- **Xiaomi MiMo**：透過 env/config/auth store 的 API 金鑰 (`XIAOMI_API_KEY`)。
- **z.ai**：透過 env/config/auth store 的 API 金鑰。

當無法解析可用的提供者用量認證時，用量資訊會被隱藏。提供者
可以提供外掛特定的用量認證邏輯；否則 OpenClaw 會回退
至從認證設定檔、環境變數
或設定中匹配 OAuth/API-key 憑證。
