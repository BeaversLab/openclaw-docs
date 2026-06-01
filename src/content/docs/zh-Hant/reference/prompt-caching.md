---
summary: "Prompt caching knobs, merge order, provider behavior, and tuning patterns"
title: "Prompt caching"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

Prompt caching 意味著模型提供者可以在不同的對話回合中重複使用未變更的提示詞前綴（通常是系統/開發者指示和其他穩定的上下文），而不必每次都重新處理。OpenClaw 會將提供者的使用量正規化為 `cacheRead` 和 `cacheWrite`，前提是上游 API 直接暴露了這些計數器。

當即時會話快照缺少快取計數器時，狀態介面也可以從最新的對話記錄使用日誌中還原它們，因此 `/status` 可以在部分會話中繼資料遺失後繼續顯示快取行。現有的非零即時快取值仍優先於對話記錄的回退值。

為什麼這很重要：更低的 token 成本、更快的回應，以及對長時間執行的會話提供更可預測的效能。如果沒有快取，即使大部分輸入沒有改變，重複的提示詞在每個回合仍需支付完整的提示詞成本。

以下章節涵蓋了所有影響提示詞重複使用和 token 成本的快取相關設定。

提供者參考資料：

- Anthropic 提示詞快取：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示詞快取：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 標頭與請求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 請求 ID 與錯誤：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要設定

### `cacheRetention` (全域預設值、模型和個別 Agent)

將所有模型的快取保留設為全域預設值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

針對個別模型進行覆寫：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

個別 Agent 的覆寫：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

設定合併順序：

1. `agents.defaults.params` (全域預設值 — 適用於所有模型)
2. `agents.defaults.models["provider/model"].params` (針對個別模型的覆寫)
3. `agents.list[].params` (符合的 agent id；依鍵值進行覆寫)

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗之後修剪舊的工具結果上下文，以確保閒置後的請求不會重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

請參閱 [Session Pruning](/zh-Hant/concepts/session-pruning) 以了解完整行為。

### Heartbeat 保持溫暖

Heartbeat 可以保持快取視窗處於溫暖狀態，並減少閒置間隔後的重複快取寫入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支援在 `agents.list[].heartbeat` 進行個別代理的心跳。

## 供應商行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型引用植入 `cacheRetention: "short"`。
- Anthropic 原生 Messages 回應會同時公開 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同時顯示 `cacheRead` 和 `cacheWrite`。
- 對於原生 Anthropic 請求，`cacheRetention: "short"` 對應至預設的 5 分鐘暫時性快取，而 `cacheRetention: "long"` 僅在直接 `api.anthropic.com` 主機上會升級為 1 小時 TTL。

### OpenAI (直接 API)

- 在支援的最新模型上，提示快取是自動的。OpenClaw 不需要注入區塊層級的快取標記。
- OpenClaw 使用 `prompt_cache_key` 來在回合之間保持快取路由穩定。當選擇 `cacheRetention: "long"` 時，直接 OpenAI 主機會使用 `prompt_cache_retention: "24h"`。
- 相容 OpenAI 的 Completions 提供者僅在其模型設定明確設定 `compat.supportsPromptCacheKey: true` 時才會收到 `prompt_cache_key`；透過相同的選擇加入，明確的 `cacheRetention: "long"` 也會轉發 `prompt_cache_retention: "24h"`，而 `cacheRetention: "none"` 則會抑制這兩個欄位。
- OpenAI 回應透過 `usage.prompt_tokens_details.cached_tokens` (或在 Responses API 事件上的 `input_tokens_details.cached_tokens`) 公開快取的提示詞 token。OpenClaw 將其對應到 `cacheRead`。
- OpenAI 未公開個別的快取寫入 token 計數器，因此即使在提供者正在預熱快取時，OpenAI 路徑上的 `cacheWrite` 仍保持 `0`。
- OpenAI 會傳回有用的追蹤與速率限制標頭，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但快取命中帳務應來自使用量 payload，而非來自標頭。
- 實務上，OpenAI 的行為通常像初始前綴快取，而非 Anthropic 風格的移動式完整歷史重用。穩定的長前綴文字回合在目前的即時探測中，快取 token 可能會達到接近 `4864` 的平台期，而重度工具或 MCP 風格的文字記錄即使在完全重複時，快取 token 也常平台期於接近 `4608`。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型 (`anthropic-vertex/*`) 支援 `cacheRetention`，方式與直接 Anthropic 相同。
- `cacheRetention: "long"` 對應到 Vertex AI 端點上真實的 1 小時提示詞快取 TTL。
- `anthropic-vertex` 的預設快取保留與直接 Anthropic 預設值相符。
- Vertex 請求透過邊界感知的快取塑形進行路由，以便快取重用與供應商實際接收的內容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用 (`amazon-bedrock/*anthropic.claude*`) 支援顯式的 `cacheRetention` 傳遞。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制 `cacheRetention: "none"`。

### OpenRouter 模型

對於 `openrouter/anthropic/*` 模型引用，僅當請求仍針對已驗證的 OpenRouter 路由（預設端點上的 `openrouter`，或任何解析為 `openrouter.ai` 的 provider/base URL）時，OpenClaw 才會在系統/開發者提示區塊上注入 Anthropic `cache_control`，以改善提示快取的重複使用。

對於 `openrouter/deepseek/*`、`openrouter/moonshot*/*` 和 `openrouter/zai/*` 模型引用，允許使用 `contextPruning.mode: "cache-ttl"`，因為 OpenRouter 會自動處理提供者端的提示快取。OpenClaw 不會將 Anthropic `cache_control` 標記注入到這些請求中。

DeepSeek 快取的構建是盡力而為的，可能需要幾秒鐘時間。立即後續的請求可能仍會顯示 `cached_tokens: 0`；請在短暫延遲後透過重複的相同前綴請求進行驗證，並將 `usage.prompt_tokens_details.cached_tokens` 作為快取命中訊號。

如果您將模型重新指向任意的 OpenAI 相容代理 URL，OpenClaw 將停止注入那些 OpenRouter 特有的 Anthropic 快取標記。

### 其他提供者

如果提供者不支援此快取模式，`cacheRetention` 將不會生效。

### Google Gemini 直接 API

- 直接 Gemini 傳輸 (`api: "google-generative-ai"`) 透過上游 `cachedContentTokenCount` 回報快取命中；OpenClaw 將其映射至 `cacheRead`。
- 當在直接 Gemini 模型上設定 `cacheRetention` 時，OpenClaw 會自動為 Google AI Studio 執行中的系統提示建立、重複使用和重新整理 `cachedContents` 資源。這意味著您不再需要手動預先建立 cached-content handle。
- 您仍然可以透過設定模型上的 `params.cachedContent`（或舊版的 `params.cached_content`）傳遞現有的 Gemini cached-content handle。
- 這與 Anthropic/OpenAI 的提示前綴快取是分開的。對於 Gemini，OpenClaw 管理的是提供者原生的 `cachedContents` 資源，而不是將快取標記注入到請求中。

### Gemini CLI JSON 用量

- Gemini CLI JSON 輸出也可以透過 `stats.cached` 顯示快取命中；
  OpenClaw 將其對應至 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 tokens。
- 這僅是用量正規化。這並不意味著 OpenClaw 正在為 Gemini CLI 建立 Anthropic/OpenAI 風格的提示詞快取標記。

## 系統提示詞快取邊界

OpenClaw 將系統提示詞拆分為 **穩定前綴 (stable prefix)** 和 **變動後綴 (volatile
suffix)**，並以內部快取前綴邊界分隔。邊界上方的內容
（工具定義、技能元資料、工作區檔案和其他相對靜態的上下文）經過排序，以確保在對話輪次之間保持位元組一致。
邊界下方的內容（例如 `HEARTBEAT.md`、執行時間戳記和其他
每輪次元資料）允許變更而不會使已快取的前綴失效。

關鍵設計選擇：

- 穩定的工作區專案上下文檔案會排序在 `HEARTBEAT.md` 之前，
  因此心跳頻繁變動不會破壞穩定的前綴。
- 該邊界應用於 Anthropic 系列、OpenAI 系列、Google 和 CLI 傳輸整形，因此所有支援的供應商都能從相同的前綴穩定性中受益。
- Codex Responses 和 Anthropic Vertex 請求是透過
  具備邊界感知的快取塑形來路由，以便快取重用與提供者實際
  接收到的內容保持一致。
- 系統提示詞指紋會進行正規化（空白字元、行尾符號、
  hook 新增的上下文、執行時期功能排序），因此語意上未變更的
  提示詞可以在各輪次之間共用 KV/快取。

如果您在設定或工作區變更後發現意外的 `cacheWrite` 飆升，
請檢查變更是落在邊界之上還是之下。將變動內容移至邊界下方
（或是使其穩定）通常能解決此問題。

## OpenClaw 快取穩定性防護機制

在請求到達提供者之前，OpenClaw 也會確保幾個對快取敏感的 Payload 形狀保持確定性：

- Bundle MCP 工具目錄會在工具註冊前進行確定性排序，
  因此 `listTools()` 順序的變動不會導致工具區塊頻繁變動並
  破壞提示詞快取前綴。
- 具有持久化圖像區塊的舊版會話會保持 **3 個最近完成的
  輪次** 完整；較舊且已處理過的圖像區塊可能會
  被替換為標記，以免後續的圖像密集請求不斷重新傳送大型
  過時 Payload。

## 調校模式

### 混合流量（建議的預設值）

在您的主要代理上保持長期存在的基準，並在突發式通知代理上停用快取：

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

### 成本優先的基準

- 設定基準 `cacheRetention: "short"`。
- 啟用 `contextPruning.mode: "cache-ttl"`。
- 僅對受益於預熱快取的代理，將心跳保持低於您的 TTL。

## 快取診斷

OpenClaw 針對嵌入式代理執行公開了專用的快取追蹤診斷功能。

對於一般面向使用者的診斷，當即時會話條目沒有這些計數器時，
`/status` 和其他使用摘要可以使用最新的逐字稿使用條目
作為 `cacheRead` /
`cacheWrite` 的備用來源。

## 即時回歸測試

OpenClaw 針對重複的前綴、工具輪次、圖像輪次、MCP 風格工具紀錄以及 Anthropic 無快取控制，保留了一個合併的即時快取回歸閘道。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

使用以下指令執行狹窄的即時閘道：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基準檔案儲存了最近觀測到的即時數值，以及測試使用的供應商特定回歸下限。執行器也針對每次執行使用新的工作階段 ID 和提示詞命名空間，以免先前的快取狀態污染目前的回歸樣本。

這些測試故意不在不同的供應商之間使用相同的成功標準。

### Anthropic 即時預期

- 預期會透過 `cacheWrite` 進行明確的預熱寫入。
- 預期在重複輪次中能近乎完整地重用歷史記錄，因為 Anthropic 的快取控制會在對話中推進快取斷點。
- 目前的即時斷言仍然針對穩定路徑、工具路徑和影像路徑使用高命中率閾值。

### OpenAI 即時預期

- 僅預期 `cacheRead`。`cacheWrite` 保持 `0`。
- 將重複輪次的快取重用視為供應商特定的平台期，而非 Anthropic 式的移動全歷史重用。
- 目前的即時斷言使用從 `gpt-5.4-mini` 上觀察到的即時行為
  推導出的保守底限檢查：
  - 穩定前綴：`cacheRead >= 4608`，命中率 `>= 0.90`
  - tool transcript: `cacheRead >= 4096`, hit rate `>= 0.85`
  - image transcript: `cacheRead >= 3840`, hit rate `>= 0.82`
  - MCP-style transcript: `cacheRead >= 4096`, hit rate `>= 0.85`

2026-04-04 的全新綜合即時驗證結果為：

- stable prefix: `cacheRead=4864`, hit rate `0.966`
- tool transcript: `cacheRead=4608`, hit rate `0.896`
- image transcript: `cacheRead=4864`, hit rate `0.954`
- MCP-style transcript: `cacheRead=4608`, hit rate `0.891`

Recent local wall-clock time for the combined gate was about `88s`.

斷言差異的原因：

- Anthropic 提供了明確的快取斷點和可移動的對話歷史重用功能。
- OpenAI 提示快取仍然對精確前綴敏感，但在即時回應流量中，有效的可重複使用前綴可能會比完整的提示更早進入平台期。
- 因此，使用單一跨供應商百分比閾值來比較 Anthropic 和 OpenAI 會導致錯誤的回歸結果。

### `diagnostics.cacheTrace` config

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

### 環境切換 (一次性除錯)

- `OPENCLAW_CACHE_TRACE=1` enables cache tracing.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` overrides output path.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` toggles full message payload capture.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` toggles prompt text capture.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` toggles system prompt capture.

### 檢查內容

- Cache trace events are JSONL and include staged snapshots like `session:loaded`, `prompt:before`, `stream:context`, and `session:after`.
- Per-turn cache token impact is visible in normal usage surfaces via `cacheRead` and `cacheWrite` (for example `/usage full` and session usage summaries).
- For Anthropic, expect both `cacheRead` and `cacheWrite` when caching is active.
- For OpenAI, expect `cacheRead` on cache hits and `cacheWrite` to remain `0`; OpenAI does not publish a separate cache-write token field.
- 如果您需要請求追蹤，請將請求 ID 和速率限制標頭與快取指標分開記錄。OpenClaw 目前的快取追蹤輸出側重於提示/階段形狀和標準化 Token 使用量，而非原始供應商回應標頭。

## 快速疑難排解

- 大多數輪次的 `cacheWrite` 很高：請檢查不穩定的 system-prompt 輸入，並確認模型/供應商支援您的快取設定。
- Anthropic 的 `cacheWrite` 很高：通常表示快取斷點落在每次請求都會變更的內容上。
- OpenAI `cacheRead` 很低：請確認穩定的前綴位於開頭、重複的前綴至少為 1024 個 token，且共享用快取的輪次重複使用了相同的 `prompt_cache_key`。
- `cacheRetention` 無效：請確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- Bedrock Nova/Mistral 帶有快取設定的請求：預期執行時會強制 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token use and costs](/zh-Hant/reference/token-use)
- [Session pruning](/zh-Hant/concepts/session-pruning)
- [Gateway configuration reference](/zh-Hant/gateway/configuration-reference)

## 相關

- [Token use and costs](/zh-Hant/reference/token-use)
- [API usage and costs](/zh-Hant/reference/api-usage-costs)
