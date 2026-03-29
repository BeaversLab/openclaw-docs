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
- After a prune, the TTL window resets so subsequent requests keep cache until `ttl` expires again.

## Smart defaults (Anthropic)

- **OAuth or setup-token** profiles: enable `cache-ttl` pruning and set heartbeat to `1h`.
- **API key** profiles: enable `cache-ttl` pruning, set heartbeat to `30m`, and default `cacheRetention: "short"` on Anthropic models.
- If you set any of these values explicitly, OpenClaw does **not** override them.

## What this improves (cost + cache behavior)

- **Why prune:** Anthropic prompt caching only applies within the TTL. If a session goes idle past the TTL, the next request re-caches the full prompt unless you trim it first.
- **What gets cheaper:** pruning reduces the **cacheWrite** size for that first request after the TTL expires.
- **Why the TTL reset matters:** once pruning runs, the cache window resets, so follow‑up requests can reuse the freshly cached prompt instead of re-caching the full history again.
- **What it does not do:** pruning doesn’t add tokens or “double” costs; it only changes what gets cached on that first post‑TTL request.

## What can be pruned

- Only `toolResult` messages.
- User + assistant messages are **never** modified.
- 最後 `keepLastAssistants` 條助手訊息受保護；該截止點之後的工具結果不會被修剪。
- 如果沒有足夠的助手訊息來確定截止點，則跳過修剪。
- 包含 **圖像區塊** (image blocks) 的工具結果會被跳過（從不修剪/清除）。

## 上下文視窗估算

修剪使用估算的上下文視窗（字元 ≈ token × 4）。基礎視窗按以下順序解析：

1. `models.providers.*.models[].contextWindow` 覆蓋。
2. 模型定義 `contextWindow`（來自模型註冊表）。
3. 預設 `200000` token。

如果設定了 `agents.defaults.contextTokens`，它將被視為解析視窗的上限（最小值）。

## 模式

### cache-ttl

- 僅當上一次 Anthropic 呼叫超過 `ttl`（預設 `5m`）時，才會執行修剪。
- 執行時：與之前相同的軟修剪 + 硬清除行為。

## 軟修剪與硬修剪

- **軟修剪** (Soft-trim)：僅針對過大的工具結果。
  - 保留頭部和尾部，插入 `...`，並附加包含原始大小的註釋。
  - 跳過包含圖像區塊的結果。
- **硬清除** (Hard-clear)：用 `hardClear.placeholder` 替換整個工具結果。

## 工具選擇

- `tools.allow` / `tools.deny` 支援 `*` 萬用字元。
- 拒絕 規則優先。
- 匹配不區分大小寫。
- 空的允許清單 => 允許所有工具。

## 與其他限制的互動

- 內建工具已經會截斷其自身的輸出；會話修剪是一個額外的層級，可防止長時間對話在模型上下文中積累過多的工具輸出。
- 壓縮 (Compaction) 是分開的：壓縮進行摘要和持久化，而修剪是每個請求的瞬態處理。請參閱 [/concepts/compaction](/en/concepts/compaction)。

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

啟用具備 TTL 感知的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

將修剪限制於特定工具：

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

請參閱設定參考：[Gateway Configuration](/en/gateway/configuration)
