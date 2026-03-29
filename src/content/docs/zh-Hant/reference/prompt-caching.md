---
title: "提示詞快取"
summary: "提示詞快取控制項、合併順序、提供者行為與調整模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示詞快取

提示詞快取是指模型提供者可以在多輪對話中重複使用未變更的提示詞前綴（通常是系統/開發者指示及其他穩定的上下文），而不必每次重新處理。第一個符合的請求會寫入快取權杖 (`cacheWrite`)，而後續符合的請求則可以讀回它們 (`cacheRead`)。

為什麼這很重要：降低權杖成本、更快的回應速度，以及對於長時間執行的會話提供更可預期的效能。若沒有快取，即使大部分輸入都沒有改變，重複的提示詞在每一輪仍需支付完整的提示詞費用。

本頁涵蓋所有影響提示詞重複使用與權杖成本的相關快取控制項。

如需 Anthropic 定價詳細資訊，請參閱：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制項

### `cacheRetention` (模型與個別代理程式)

在模型參數上設定快取保留：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

個別代理程式覆寫：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (符合代理程式 ID；依鍵值覆寫)

### 舊版 `cacheControlTtl`

仍接受並對應舊版數值：

- `5m` -> `short`
- `1h` -> `long`

對於新設定，建議優先使用 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

會在快取 TTL 視窗之後修剪舊的工具結果上下文，以免閒置後的請求重新快取過大的歷史紀錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行為請參閱 [會話修剪](/en/concepts/session-pruning)。

### 心跳保持溫暖

心跳可以讓快取視窗保持溫熱，並減少閒置間隔後的重複快取寫入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支援在 `agents.list[].heartbeat` 進行個別代理程式的心跳設定。

## 提供者行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照設定預設值 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型引用 (`amazon-bedrock/*anthropic.claude*`) 支援顯式 `cacheRetention` 傳遞。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型引用，OpenClaw 會在系統/開發者提示區塊上注入 Anthropic `cache_control`，以提高提示快取的重複使用率。

### 其他提供商

如果提供商不支援此快取模式，`cacheRetention` 將不會生效。

## 調整模式

### 混合流量（推薦預設值）

在您的主要代理上保持長期運行的基準，並在突發通知代理上停用快取：

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

### 成本優先基準

- 設定基準 `cacheRetention: "short"`。
- 啟用 `contextPruning.mode: "cache-ttl"`。
- 僅針對能從暖快取中受益的代理，將心跳保持在您的 TTL 之下。

## 快取診斷

OpenClaw 針對嵌入式代理執行公開了專用的快取追蹤診斷功能。

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

- `filePath`： `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`： `true`
- `includePrompt`： `true`
- `includeSystem`： `true`

### 環境切換（一次性除錯）

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆蓋輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息載擷取。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字擷取。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示擷取。

### 檢查項目

- 快取追蹤事件為 JSONL 格式，並包含分階段快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每回合的快取 Token 影響可透過一般使用介面中的 `cacheRead` 和 `cacheWrite` 查看（例如 `/usage full` 和工作階段使用摘要）。

## 快速疑難排解

- 大多數輪次的 `cacheWrite` 很高：檢查不穩定的系統提示輸入，並確認模型/供應商支援您的快取設定。
- `cacheRetention` 沒有效果：確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- 帶有快取設定的 Bedrock Nova/Mistral 請求：預期執行時強制設為 `none`。

相關文件：

- [Anthropic](/en/providers/anthropic)
- [Token 使用與成本](/en/reference/token-use)
- [會話修剪](/en/concepts/session-pruning)
- [Gateway 配置參考](/en/gateway/configuration-reference)
