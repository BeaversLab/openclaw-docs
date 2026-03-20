---
title: "Session Pruning"
summary: "Session pruning: tool-result trimming to reduce context bloat"
read_when:
  - 您想要減少來自工具輸出的 LLM 內容增長
  - 您正在調整 agents.defaults.contextPruning
---

# Session Pruning

Session pruning 會在每次 LLM 呼叫之前，從記憶體中的內容修剪掉**舊的工具結果**。它**不會**重寫磁碟上的 session 歷史紀錄 (`*.jsonl`)。

## 執行時機

- 當啟用 `mode: "cache-ttl"` 且該 session 的最後一次 Anthropic 呼叫早於 `ttl` 時。
- 僅影響針對該請求發送給模型的訊息。
- 僅對 Anthropic API 呼叫（以及 OpenRouter Anthropic 模型）啟用。
- 為了獲得最佳結果，請將 `ttl` 與您的模型 `cacheRetention` 政策相符 (`short` = 5m，`long` = 1h)。
- 修剪後，TTL 視窗會重置，以便後續請求能保留快取，直到 `ttl` 再次過期。

## 智慧型預設值 (Anthropic)

- **OAuth 或 setup-token** 設定檔：啟用 `cache-ttl` 修剪並將心跳設為 `1h`。
- **API 金鑰** 設定檔：啟用 `cache-ttl` 修剪，將心跳設為 `30m`，並在 Anthropic 模型上預設啟用 `cacheRetention: "short"`。
- 如果您明確設定了這些值中的任何一個，OpenClaw 將**不會**覆寫它們。

## 改善項目 (成本 + 快取行為)

- **為什麼要修剪：** Anthropic 的提示詞快取僅在 TTL 內有效。如果 session 閒置時間超過 TTL，除非您先進行修剪，否則下一個請求會重新快取完整的提示詞。
- **什麼變便宜了：** 修剪會減少 TTL 過期後第一個請求的 **cacheWrite** 大小。
- **TTL 重置為何重要：** 一旦執行修剪，快取視窗就會重置，因此後續請求可以重用新快取的提示詞，而不是再次重新快取完整的歷史紀錄。
- **它不做什麼：** 修剪不會增加 token 或「加倍」成本；它只會改變在 TTL 過期後第一個請求上被快取的內容。

## 什麼可以被修剪

- 僅限 `toolResult` 訊息。
- 使用者 + 助理訊息**永遠不會**被修改。
- 最後的 `keepLastAssistants` 則助理訊息會受到保護；該切斷點之後的工具結果不會被修剪。
- 如果沒有足夠的助理訊息來確立切斷點，則會跳過修剪。
- 包含 **圖像區塊** 的工具結果會被跳過（從不修剪/清除）。

## 背景視窗估算

修剪使用估算的背景視窗（字元 ≈ token × 4）。基本視窗按以下順序解析：

1. `models.providers.*.models[].contextWindow` 覆蓋。
2. 模型定義 `contextWindow`（來自模型註冊表）。
3. 預設 `200000` token。

如果設定了 `agents.defaults.contextTokens`，它將被視為解析視窗的上限（最小值）。

## 模式

### cache-ttl

- 只有當最後一次 Anthropic 呼叫的時間早於 `ttl`（預設 `5m`）時，才會執行修剪。
- 執行時：與之前相同的軟修剪 + 硬清除行為。

## 軟修剪與硬修剪

- **軟修剪**：僅針對過大的工具結果。
  - 保留頭部 + 尾部，插入 `...`，並附加帶有原始大小的註釋。
  - 跳過帶有圖像區塊的結果。
- **硬清除**：將整個工具結果替換為 `hardClear.placeholder`。

## 工具選擇

- `tools.allow` / `tools.deny` 支援 `*` 萬用字元。
- 拒絕列表優先。
- 比對不區分大小寫。
- 空的允許列表 => 允許所有工具。

## 與其他限制的互動

- 內建工具已經會截斷自己的輸出；會話修剪是一個額外層級，可防止長時間對話在模型背景中累積過多的工具輸出。
- 壓縮是分開的：壓縮會進行摘要並持久化，而修剪是每次請求暫時性的。請參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)。

## 預設值（啟用時）

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## 範例

預設 (關閉)：

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

啟用具有 TTL 感知能力的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

限制修剪僅用於特定工具：

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

import en from "/components/footer/en.mdx";

<en />
