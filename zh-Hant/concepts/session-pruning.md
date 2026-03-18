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
- 最後的 `keepLastAssistants` 條助理訊息會受到保護；該截止點之後的工具結果不會被修剪。
- 如果沒有足夠的助理訊息來建立截止點，則會跳過修剪。
- 包含 **圖像區塊** 的工具結果會被跳過（永遠不修剪/清除）。

## 脈絡視窗估算

修剪使用估算的脈絡視窗（字元 ≈ tokens × 4）。基本視窗按以下順序解析：

1. `models.providers.*.models[].contextWindow` 覆蓋。
2. 模型定義 `contextWindow`（來自模型註冊表）。
3. 預設 `200000` tokens。

如果設定了 `agents.defaults.contextTokens`，它將被視為解析視窗的上限（最小值）。

## 模式

### cache-ttl

- 僅當最後一次 Anthropic 呼叫早於 `ttl`（預設為 `5m`）時，才會執行修剪。
- 執行時：與以前相同的軟修剪 + 硬清除行為。

## 軟修剪 vs 硬修剪

- **軟修剪**：僅針對過大的工具結果。
  - 保留頭部和尾部，插入 `...`，並附加原始大小的說明。
  - 跳過帶有圖像區塊的結果。
- **硬清除**：將整個工具結果替換為 `hardClear.placeholder`。

## 工具選擇

- `tools.allow` / `tools.deny` 支援 `*` 通配符。
- 拒絕優先。
- 匹配不區分大小寫。
- 空的允許列表 => 允許所有工具。

## 與其他限制的互動

- 內建工具已經會截斷自己的輸出；會話修剪是一個額外的層級，可防止長時間對話在模型脈絡中累積過多的工具輸出。
- 壓縮是分開的：壓縮會進行摘要並持久化，而修剪是每次請求的暫時性操作。請參閱 [/concepts/compaction](/zh-Hant/concepts/compaction)。

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

啟用具有 TTL 感知的修剪：

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

限制修剪僅套用於特定工具：

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

請參閱配置參考：[Gateway Configuration](/zh-Hant/gateway/configuration)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
