---
title: "提示詞快取"
summary: "提示詞快取控制、合併順序、供應商行為以及調整模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示詞快取

提示詞快取是指模型供應商可以在對話回合之間重複使用未變更的提示詞前綴（通常是系統/開發者指示詞和其他穩定的上下文），而不必每次都重新處理。第一個符合的請求會寫入快取權杖 (`cacheWrite`)，而後續符合的請求則可以讀取它們 (`cacheRead`)。

為什麼這很重要：降低權杖成本、更快的回應，以及對長時間執行階段更可預期的效能。如果沒有快取，即使大部分輸入沒有變更，重複的提示詞在每個回合仍需支付完整的提示詞成本。

本頁面涵蓋所有影響提示詞重複使用與權杖成本的相關快取控制選項。

如需 Anthropic 的價格詳細資訊，請參閱：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制選項

### `cacheRetention` (模型與每個代理程式)

在模型參數上設定快取保留：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

每個代理程式的覆寫：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (符合代理程式 id；依鍵值覆寫)

### 舊版 `cacheControlTtl`

仍接受並對應舊版值：

- `5m` -> `short`
- `1h` -> `long`

新設定建議使用 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗之後修剪舊的工具結果上下文，以便閒置後的請求不會重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

有關完整行為，請參閱 [階段修剪](/zh-Hant/concepts/session-pruning)。

### 心跳保持喚醒

心跳可以保持快取視窗處於喚醒狀態，並減少閒置間隔後的重複快取寫入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

在 `agents.list[].heartbeat` 支援每個代理程式的心跳。

## 供應商行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照植入 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型參考 (`amazon-bedrock/*anthropic.claude*`) 支援顯式 `cacheRetention` 傳遞。
- 非 Anthropic 的 Bedrock 模型在執行時期會被強制設為 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型參考，OpenClaw 會在系統/開發者提示區塊上注入 Anthropic `cache_control`，以改善提示快取的重複使用。

### 其他供應商

如果供應商不支援此快取模式，`cacheRetention` 將不會生效。

## 調整模式

### 混合流量（推薦預設值）

在您的主要代理上保持長期運行的基線，並在突發通知代理上停用快取：

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
- 僅針對受益於預熱快取的代理，將心跳保持在低於您的 TTL。

## 快取診斷

OpenClaw 公開了專屬的快取追蹤診斷功能，用於嵌入式代理執行。

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

- `filePath`：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`：`true`
- `includePrompt`：`true`
- `includeSystem`：`true`

### 環境變數切換（一次性除錯）

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆寫輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息負載擷取。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字擷取。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示擷取。

### 檢查項目

- 快取追蹤事件採用 JSONL 格式，並包含分階段的快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每次回合的快取 Token 影響可透過 `cacheRead` 和 `cacheWrite` 在一般使用介面中查看（例如 `/usage full` 和階段作業使用摘要）。

## 快速疑難排解

- 多數輪次的 `cacheWrite` 很高：請檢查是否有不穩定的系統提示詞輸入，並確認模型/提供者支援您的快取設定。
- `cacheRetention` 沒有效果：請確認模型金鑰與 `agents.defaults.models["provider/model"]` 相符。
- 帶有快取設定的 Bedrock Nova/Mistral 請求：預期執行時期強制 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [工作階段修剪](/zh-Hant/concepts/session-pruning)
- [Gateway 設定參考](/zh-Hant/gateway/configuration-reference)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
