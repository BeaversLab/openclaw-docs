---
title: "Prompt Caching"
summary: "Prompt caching knobs, merge order, provider behavior, and tuning patterns"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Prompt caching

Prompt caching means the model provider can reuse unchanged prompt prefixes (usually system/developer instructions and other stable context) across turns instead of re-processing them every time. The first matching request writes cache tokens (`cacheWrite`), and later matching requests can read them back (`cacheRead`).

Why this matters: lower token cost, faster responses, and more predictable performance for long-running sessions. Without caching, repeated prompts pay the full prompt cost on every turn even when most input did not change.

This page covers all cache-related knobs that affect prompt reuse and token cost.

如需 Anthropic 定價詳細資訊，請參閱：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## 主要控制項

### `cacheRetention` (模型和每個 Agent)

在模型參數上設定快取保留：

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

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (比對 agent id；依鍵覆寫)

### 舊版 `cacheControlTtl`

舊版值仍被接受並對應：

- `5m` -> `short`
- `1h` -> `long`

對於新設定，建議使用 `cacheRetention`。

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗後修剪舊的工具結果上下文，以便閒置後的請求不會重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

請參閱 [Session Pruning](/zh-Hant/concepts/session-pruning) 以了解完整行為。

### 心跳保溫

心跳可以保持快取視窗處於熱狀態，並減少閒置間隔後的重複快取寫入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

`agents.list[].heartbeat` 支援每個代理程式的心跳。

## 供應商行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照植入 `cacheRetention: "short"`。

### Amazon Bedrock

- Anthropic Claude 模型參照 (`amazon-bedrock/*anthropic.claude*`) 支援顯式 `cacheRetention` 直通。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設定為 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型參照，OpenClaw 會在系統/開發者提示區塊中注入 Anthropic `cache_control`，以改善提示快取的重複使用。

### 其他供應商

如果供應商不支援此快取模式，`cacheRetention` 將不會產生效果。

## 調校模式

### 混合流量（建議預設值）

在主要代理上保持長期基準，並在突發性通知代理上停用快取：

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
- 僅對受益於預熱快取的代理，將心跳保持在 TTL 以下。

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

### 環境切換（一次性除錯）

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆蓋輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息載擷取。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示詞文字擷取。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示詞擷取。

### 檢查項目

- 快取追蹤事件是 JSONL 格式，並包含分階段快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每輪快取 Token 的影響可透過 `cacheRead` 和 `cacheWrite` 在一般使用介面中看到（例如 `/usage full` 和階段作業使用摘要）。

## 快速疑難排解

- 在大多數輪次中 `cacheWrite` 較高：請檢查不穩定的系統提示詞輸入，並驗證模型/提供商支援您的快取設定。
- `cacheRetention` 無效：請確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- 具有快取設定的 Bedrock Nova/Mistral 請求：預期執行時強制 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token Use and Costs](/zh-Hant/reference/token-use)
- [Session Pruning](/zh-Hant/concepts/session-pruning)
- [Gateway Configuration Reference](/zh-Hant/gateway/configuration-reference)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
