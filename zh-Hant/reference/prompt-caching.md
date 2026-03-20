---
title: "Prompt 快取"
summary: "Prompt 快取控制參數、合併順序、提供者行為以及調整模式"
read_when:
  - 您希望透過快取保留來降低 prompt token 成本
  - 您需要在多代理設定中取得每個代理的快取行為
  - 您正在同時調整心跳和 cache-ttl 的修剪機制
---

# Prompt 快取

Prompt 快取是指模型提供者可以在不同輪次之間重複使用未變更的 prompt 前綴（通常是系統/開發者指令和其他穩定的上下文），而不必每次都重新處理。第一個符合的請求會寫入快取 token (`cacheWrite`)，而後續符合的請求則可以讀回它們 (`cacheRead`)。

為什麼這很重要：降低 token 成本、更快的回應時間，以及長時間執行工作階段中更可預測的效能。如果沒有快取，即使大部分輸入都沒有改變，重複的 prompt 在每一輪仍需支付完整的 prompt 成本。

本頁涵蓋所有影響 prompt 重複使用與 token 成本的快取相關控制參數。

關於 Anthropic 的定價詳細資訊，請參閱：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制參數

### `cacheRetention` (模型與每個代理)

在模型參數上設定快取保留：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

每個代理的覆寫：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

設定合併順序：

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (符合的代理 ID；依鍵值覆寫)

### 舊版 `cacheControlTtl`

舊版數值仍然被接受並對應：

- `5m` -> `short`
- `1h` -> `long`

針對新設定建議使用 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗之後修剪舊的工具結果上下文，以避免閒置後的請求重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

請參閱 [Session Pruning](/zh-Hant/concepts/session-pruning) 以了解完整行為。

### 心跳保持溫暖

心跳可以讓快取視窗保持溫暖，並減少閒置間隔後重複寫入快取的次數。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

在 `agents.list[].heartbeat` 支援每個代理的心跳。

## 提供者行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照預設設定 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型參照 (`amazon-bedrock/*anthropic.claude*`) 支援顯式的 `cacheRetention` 直通。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型參照，OpenClaw 會在 system/developer 提示塊上注入 Anthropic `cache_control`，以改善提示快取的複用。

### 其他提供商

如果提供商不支援此快取模式，`cacheRetention` 將不會產生效果。

## 調整模式

### 混合流量（建議的預設值）

在您的主要代理上保持長期存在的基準，在突發式通知代理上停用快取：

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
- 僅對受益於溫快取的代理，將心跳保持在 TTL 以下。

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

- `filePath`：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`：`true`
- `includePrompt`：`true`
- `includeSystem`：`true`

### 環境切換（一次性除錯）

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆寫輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息負載擷取。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字擷取。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示擷取。

### 檢查項目

- 快取追蹤事件為 JSONL 格式，並包含 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等分段快照。
- 每個回合的快取 token 影響可透過 `cacheRead` 和 `cacheWrite` 在一般使用介面中看到（例如 `/usage full` 和工作階段使用摘要）。

## 快速疑難排解

- 大多數輪次中的 `cacheWrite` 較高：請檢查不穩定的系統提示詞輸入，並驗證模型/供應商支援您的快取設定。
- `cacheRetention` 無效：請確認模型金鑰與 `agents.defaults.models["provider/model"]` 相符。
- 帶有快取設定的 Bedrock Nova/Mistral 請求：預期執行時期強制設為 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token Use and Costs](/zh-Hant/reference/token-use)
- [Session Pruning](/zh-Hant/concepts/session-pruning)
- [Gateway Configuration Reference](/zh-Hant/gateway/configuration-reference)

import en from "/components/footer/en.mdx";

<en />
