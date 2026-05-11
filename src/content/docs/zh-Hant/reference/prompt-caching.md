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

- Anthropic prompt caching: [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI prompt caching: [https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API headers and request IDs: [https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic request IDs and errors: [https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

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
- OpenClaw 使用 `prompt_cache_key` 來保持快取路由在對話之間穩定，並且僅當直接 OpenAI 主機上選擇了 `cacheRetention: "long"` 時才使用 `prompt_cache_retention: "24h"`。
- 相容 OpenAI 的 Completions 供應商僅在其模型設定明確設定 `compat.supportsPromptCacheKey: true` 時才會收到 `prompt_cache_key`；`cacheRetention: "none"` 仍會抑制它。
- OpenAI 回應透過 `usage.prompt_tokens_details.cached_tokens` (或在 Responses API 事件上的 `input_tokens_details.cached_tokens`) 公開快取的提示 token。OpenClaw 將其對應至 `cacheRead`。
- OpenAI 不公開獨立的快取寫入 token 計數器，因此即使在供應商正在準備快取時，OpenAI 路徑上的 `cacheWrite` 仍保持 `0`。
- OpenAI 會傳回有用的追蹤和速率限制標頭，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但快取命中計算應來自使用量 payload，而非標頭。
- 在實踐中，OpenAI 的行為通常類似於初始前綴快取，而非 Anthropic 風格的移動式全歷史重用。穩定的長前綴文本輪次在目前的即時探測中，可能會落在接近 `4864` 個快取 Token 的平台期，而重度工具或 MCP 風格的對話記錄即使在完全重複的情況下，通常也會平台期停在接近 `4608` 個快取 Token。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型 (`anthropic-vertex/*`) 支援 `cacheRetention`，方式與直接使用 Anthropic 相同。
- `cacheRetention: "long"` 對應到 Vertex AI 端點上真正的 1 小時提示快取 TTL。
- `anthropic-vertex` 的預設快取保留時間符合 Anthropic 直接連線的預設值。
- Vertex 請求透過邊界感知的快取塑形進行路由，以便快取重用與供應商實際接收的內容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型參考 (`amazon-bedrock/*anthropic.claude*`) 支援明確的 `cacheRetention` 直通。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設定為 `cacheRetention: "none"`。

### OpenRouter 模型

對於 `openrouter/anthropic/*` 模型參考，僅當請求仍針對經過驗證的 OpenRouter 路由時（其預設端點上的 `openrouter`，或任何解析為 `openrouter.ai` 的提供者/基本 URL），OpenClaw 才會在系統/開發者提示區塊上注入 Anthropic `cache_control`，以改善提示快取的重用。

對於 `openrouter/deepseek/*`、`openrouter/moonshot*/*` 和 `openrouter/zai/*` 模型參考，允許使用 `contextPruning.mode: "cache-ttl"`，因為 OpenRouter 會自動處理提供者端的提示快取。OpenClaw 不會將 Anthropic `cache_control` 標記注入這些請求中。

DeepSeek 快取的構建是盡力而為的，可能需要幾秒鐘時間。緊接著的後續請求可能仍會顯示 `cached_tokens: 0`；請在短暫延遲後透過重複相同前綴的請求進行驗證，並將 `usage.prompt_tokens_details.cached_tokens` 作為快取命中的信號。

如果您將模型重新指向任意的 OpenAI 相容代理 URL，OpenClaw 將停止注入那些 OpenRouter 特有的 Anthropic 快取標記。

### 其他提供者

如果提供者不支援此快取模式，`cacheRetention` 將不會生效。

### Google Gemini 直接 API

- Direct Gemini 傳輸 (`api: "google-generative-ai"`) 透過上游 `cachedContentTokenCount` 回報快取命中；OpenClaw 將其對應至 `cacheRead`。
- 當在 Direct Gemini 模型上設定 `cacheRetention` 時，OpenClaw 會自動為 Google AI Studio 執行中的系統提示建立、重複使用和重新整理 `cachedContents` 資源。這意味著您不再需要手動預先建立快取內容處理常式。
- 您仍然可以透過設定模型上的 `params.cachedContent` (或舊版 `params.cached_content`) 傳遞現有的 Gemini cached-content 處理常式。
- 這與 Anthropic/OpenAI 的提示詞前綴快取分開。對於 Gemini，OpenClaw 管理供應商原生的 `cachedContents` 資源，而不是在請求中注入快取標記。

### Gemini CLI JSON 用量

- Gemini CLI JSON 輸出也可以透過 `stats.cached` 顯示快取命中；OpenClaw 將其對應至 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 會從 `stats.input_tokens - stats.cached` 推導輸入 token。
- 這僅是用量正規化。這並不意味著 OpenClaw 正在為 Gemini CLI 建立 Anthropic/OpenAI 風格的提示詞快取標記。

## 系統提示詞快取邊界

OpenClaw 將系統提示詞分割為由內部快取前綴邊界分隔的「穩定前綴」和「不穩定後綴」。邊界上方的內容 (工具定義、技能元資料、工作區檔案和其他相對靜態的上下文) 經過排序，使其在各回合之間保持位元組一致。邊界下方的內容 (例如 `HEARTBEAT.md`、執行時間戳記和其他每回合元資料) 允許變更而不會使快取的前綴失效。

關鍵設計選擇：

- 穩定的工作區專案上下文檔案排序在 `HEARTBEAT.md` 之前，因此心跳動作的變化不會破壞穩定的前綴。
- 該邊界應用於 Anthropic 系列、OpenAI 系列、Google 和 CLI 傳輸整形，因此所有支援的供應商都能從相同的前綴穩定性中受益。
- Codex Responses 和 Anthropic Vertex 請求是透過
  具備邊界感知的快取塑形來路由，以便快取重用與提供者實際
  接收到的內容保持一致。
- 系統提示詞指紋會進行正規化（空白字元、行尾符號、
  hook 新增的上下文、執行時期功能排序），因此語意上未變更的
  提示詞可以在各輪次之間共用 KV/快取。

如果您在設定或工作區變更後看到出乎意料的 `cacheWrite` 飙升，
請檢查該變更位於快取邊界的上方還是下方。將不穩定的內容
移至邊界下方（或使其穩定）通常能解決
此問題。

## OpenClaw 快取穩定性防護機制

在請求到達提供者之前，OpenClaw 也會確保幾個對快取敏感的 Payload 形狀保持確定性：

- 在工具註冊之前，Bundle MCP 工具目錄會經過確定性排序，因此 `listTools()` 順序的變更不會
  造成工具區塊的變動並擊穿提示詞快取前綴。
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

對於一般使用者導向的診斷，當即時會話項目缺少這些計數器時，`/status` 和其他使用摘要可以將最新的
紀錄使用項目作為 `cacheRead` /
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

- 預期透過 `cacheWrite` 進行明確的暖機寫入。
- 預期在重複輪次中能近乎完整地重用歷史記錄，因為 Anthropic 的快取控制會在對話中推進快取斷點。
- 目前的即時斷言仍然針對穩定路徑、工具路徑和影像路徑使用高命中率閾值。

### OpenAI 即時預期

- 僅預期 `cacheRead`。`cacheWrite` 保持 `0`。
- 將重複輪次的快取重用視為供應商特定的平台期，而非 Anthropic 式的移動全歷史重用。
- 目前的即時斷言使用從 `gpt-5.4-mini` 上觀測到的即時行為衍生的保守下限檢查：
  - 穩定前綴：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具文字記錄：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 影像文字記錄：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 風格文字記錄：`cacheRead >= 4096`，命中率 `>= 0.85`

2026-04-04 的全新綜合即時驗證結果為：

- 穩定前綴：`cacheRead=4864`，命中率 `0.966`
- 工具文字記錄：`cacheRead=4608`，命中率 `0.896`
- 影像文字記錄：`cacheRead=4864`，命中率 `0.954`
- MCP 風格文字記錄：`cacheRead=4608`，命中率 `0.891`

綜合閘道最近的本地牆上時間約為 `88s`。

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

- `OPENCLAW_CACHE_TRACE=1` 啟用快取追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆寫輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息負載擷取。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字擷取。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示擷取。

### 檢查內容

- 快取追蹤事件為 JSONL 格式，並包含階段性快照，例如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after`。
- 每個輪次的快取 Token 影響可透過 `cacheRead` 和 `cacheWrite` 在一般使用介面中查看 (例如 `/usage full` 和階段使用量摘要)。
- 對於 Anthropic，當啟用快取時，預期會同時出現 `cacheRead` 和 `cacheWrite`。
- 對於 OpenAI，預期在快取命中時會有 `cacheRead`，而 `cacheWrite` 保持 `0`；OpenAI 不會發布獨立的快取寫入 Token 欄位。
- 如果您需要請求追蹤，請將請求 ID 和速率限制標頭與快取指標分開記錄。OpenClaw 目前的快取追蹤輸出側重於提示/階段形狀和標準化 Token 使用量，而非原始供應商回應標頭。

## 快速疑難排解

- 大多數輪次的 `cacheWrite` 很高：請檢查是否有不穩定的系統提示輸入，並確認模型/供應商支援您的快取設定。
- Anthropic 上的高 `cacheWrite`：通常表示緩存斷點落在了每次請求都會變化的內容上。
- OpenAI 的 `cacheRead` 較低：請確認穩定前綴位於最前，重複的前綴至少為 1024 個 token，並且對於應共享緩存的輪次，重複使用了相同的 `prompt_cache_key`。
- `cacheRetention` 無效：請確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- 帶有快取設定的 Bedrock Nova/Mistral 請求：預期執行時會強制 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [Session 剪枝](/zh-Hant/concepts/session-pruning)
- [Gateway 配置參考](/zh-Hant/gateway/configuration-reference)

## 相關

- [Token 使用與成本](/zh-Hant/reference/token-use)
- [API 使用與成本](/zh-Hant/reference/api-usage-costs)
