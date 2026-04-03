---
title: "Prompt Caching"
summary: "Prompt caching knobs, merge order, provider behavior, and tuning patterns"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示詞快取

Prompt caching 表示模型提供者可以跨輪次重複使用未變更的提示詞前綴（通常是系統/開發者指令和其他穩定的上下文），而不必每次都重新處理。第一個符合的請求會寫入快取權杖 (`cacheWrite`)，而後續符合的請求則可以讀取它們 (`cacheRead`)。

為什麼這很重要：降低權杖成本、更快的回應速度，以及對於長時間執行的會話提供更可預期的效能。若沒有快取，即使大部分輸入都沒有改變，重複的提示詞在每一輪仍需支付完整的提示詞費用。

本頁涵蓋所有影響提示詞重複使用與權杖成本的相關快取控制項。

有關 Anthropic 定價的詳細資訊，請參閱：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制項

### `cacheRetention` (全域預設值、模型與個別 Agent)

為所有模型設定快取保留的全域預設值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

依模型覆寫：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

個別 Agent 覆寫：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

設定合併順序：

1. `agents.defaults.params` (全域預設值 — 適用於所有模型)
2. `agents.defaults.models["provider/model"].params` (依模型覆寫)
3. `agents.list[].params` (符合的 agent id；依鍵值覆寫)

### 舊版 `cacheControlTtl`

仍接受並映射舊版數值：

- `5m` -> `short`
- `1h` -> `long`

新設定建議使用 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗後修剪舊的工具結果上下文，以讓閒置後的請求不會重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行為請參閱 [Session Pruning](/en/concepts/session-pruning)。

### 心跳保持溫暖

心跳可以保持快取視窗處於溫暖狀態，並減少閒置間隔後重複寫入快取。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支援在 `agents.list[].heartbeat` 設定個別 Agent 的心跳。

## 提供者行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照預設植入 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型參照 (`amazon-bedrock/*anthropic.claude*`) 支援明確傳遞 `cacheRetention`。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型參照，OpenClaw 會在系統/開發者提示區塊上注入 Anthropic `cache_control`，以改善提示快取的複用。

### 其他提供者

如果提供者不支援此快取模式，`cacheRetention` 將不會生效。

## 調優模式

### 混合流量（推薦預設值）

在您的主要代理上保持長期運行的基線，並在突發性通知代理上停用快取：

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### 成本優先基線

- 設定基線 `cacheRetention: "short"`。
- 啟用 `contextPruning.mode: "cache-ttl"`。
- 僅對受益於暖快取的代理，將心跳保持在低於您的 TTL 的水平。

## 快取診斷

OpenClaw 針對嵌入式代理執行公開了專用的快取追蹤診斷。

### `diagnostics.cacheTrace` 設定

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

預設值：

- `filePath`: `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`: `true`
- `includePrompt`: `true`
- `includeSystem`: `true`

### 環境變數切換（一次性偵錯）

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆寫輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息負載捕獲。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字捕獲。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示捕獲。

### 檢查項目

- 快取追蹤事件採用 JSONL 格式，並包含分階段的快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每輪快取 Token 的影響會透過 `cacheRead` 和 `cacheWrite` 在一般使用介面中顯示（例如 `/usage full` 和工作階段使用量摘要）。

## 快速疑難排解

- 大多數輪次中 `cacheWrite` 較高：請檢查是否有不穩定的系統提示輸入，並確認模型/提供者支援您的快取設定。
- `cacheRetention` 無效：請確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- 使用快取設定的 Bedrock Nova/Mistral 請求：預期執行時會強制設為 `none`。

相關文件：

- [Anthropic](/en/providers/anthropic)
- [Token Use and Costs](/en/reference/token-use)
- [Session Pruning](/en/concepts/session-pruning)
- [Gateway Configuration Reference](/en/gateway/configuration-reference)
