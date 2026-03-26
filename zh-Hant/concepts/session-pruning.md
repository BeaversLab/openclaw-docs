---
title: "Session Pruning"
summary: "Session pruning: tool-result trimming to reduce context bloat"
read_when:
  - You want to reduce LLM context growth from tool outputs
  - You are tuning agents.defaults.contextPruning
---

# Session Pruning

Session pruning trims **old tool results** from the in-memory context right before each LLM call. It does **not** rewrite the on-disk session history (`*.jsonl`).

## When it runs

- When `mode: "cache-ttl"` is enabled and the last Anthropic call for the session is older than `ttl`.
- Only affects the messages sent to the model for that request.
- Only active for Anthropic API calls (and OpenRouter Anthropic models).
- For best results, match `ttl` to your model `cacheRetention` policy (`short` = 5m, `long` = 1h).
- 修剪後，TTL 視窗會重置，因此後續請求會保持快取，直到 `ttl` 再次過期。

## 智慧預設值

- **OAuth 或 setup-token** 設定檔：啟用 `cache-ttl` 修剪並將心跳設定為 `1h`。
- **API 金鑰** 設定檔：啟用 `cache-ttl` 修剪，將心跳設定為 `30m`，並在 Anthropic 模型上預設 `cacheRetention: "short"`。
- 如果您明確設定了這些值中的任何一個，OpenClaw 將 **不** 會覆寫它們。

## 這能改善什麼（成本 + 快取行為）

- **為何修剪：** Anthropic 提示快取僅在 TTL 內適用。如果工作階段閒置超過 TTL，除非您先進行修剪，否則下一個請求會重新快取完整的提示。
- **什麼變得更便宜：** 修剪可減少 TTL 過期後第一次請求的 **cacheWrite** 大小。
- **為什麼 TTL 重置很重要：** 一旦執行修剪，快取視窗就會重置，因此後續請求可以重用剛剛快取的提示，而不是再次快取完整的歷史記錄。
- **它不做什麼：** 修剪不會增加 token 或「加倍」成本；它只會改變在第一個 TTL 後請求中被快取的內容。

## 可以修剪什麼

- 僅限 `toolResult` 訊息。
- 使用者 + 助手訊息**絕不會**被修改。
- 最後 `keepLastAssistants` 個助手訊息受到保護；該截止點之後的工具結果不會被修剪。
- 如果沒有足夠的助手訊息來確定截止點，則會跳過修剪。
- 包含 **圖像區塊** 的工具結果會被跳過（永不修剪/清除）。

## 上下文視窗估算

修剪使用估算的上下文視窗（字元 ≈ token × 4）。基本視窗按以下順序解析：

1. `models.providers.*.models[].contextWindow` 覆寫。
2. 模型定義 `contextWindow`（來自模型註冊表）。
3. 預設 `200000` 個 token。

如果設定了 `agents.defaults.contextTokens`，它將被視為解析視窗的上限（最小值）。

## 模式

### cache-ttl

- 僅當上一次 Anthropic 呼叫早於 `ttl` 時才執行修剪（預設 `5m`）。
- 執行時：具有與之前相同的軟修剪 + 硬清除行為。

## 軟修剪與硬修剪

- **軟修剪 (Soft-trim)**：僅針對過大的工具結果。
  - 保留頭部 + 尾部，插入 `...`，並附帶原始大小的註釋。
  - 跳過包含圖像區塊的結果。
- **硬清除 (Hard-clear)**：用 `hardClear.placeholder` 替換整個工具結果。

## 工具選擇

- `tools.allow` / `tools.deny` 支援 `*` 萬用字元。
- 拒絕優先。
- 比對不區分大小寫。
- 空的允許清單 => 允許所有工具。

## 與其他限制的互動

- 內建工具已經會截斷自己的輸出；會話修剪是一個額外層級，用於防止長時間對話在模型情境中累積過多工具輸出。
- 壓縮是分開的：壓縮會進行摘要與持久化，修剪則是每個請求暫時性的。請參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)。

## 預設值（啟用時）

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## 範例

預設（關閉）：

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

啟用具 TTL 感知的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

限制修剪為特定工具：

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        tools: { allow: ["exec", "read"], deny: ["*image*"] },
      },
    },
  },
}
```

請參閱設定參考：[Gateway Configuration](/zh-Hant/gateway/configuration)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
