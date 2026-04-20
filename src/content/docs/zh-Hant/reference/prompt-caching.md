---
title: "Prompt Caching"
summary: "提示快取控制項、合併順序、提供者行為以及調整模式"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# 提示詞快取

提示快取是指模型提供者可以在多輪對話中重複使用未變更的提示前綴（通常是系統/開發者指示和其他穩定的上下文），而不必每次都重新處理。當上游 API 直接公開這些計數器時，OpenClaw 會將提供者用量標準化為 `cacheRead` 和 `cacheWrite`。

當即時會話快照缺少快取計數器時，狀態介面也可以從最新的轉錄用量日誌中還原它們，因此 `/status` 可以在部分會詞元資料遺失後繼續顯示快取行。現有的非零即時快取值仍優先於轉錄備用值。

重要性：降低詞元成本、更快的回應時間，以及對長時間執行的會話提供更可預測的效能。如果沒有快取，即使大部分輸入沒有改變，重複的提示在每一輪都要支付完整的提示成本。

本頁涵蓋所有影響提示重複使用和詞元成本的相關快取控制項。

提供者參考資料：

- Anthropic 提示快取：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示快取：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 標頭和請求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 請求 ID 和錯誤：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要控制項

### `cacheRetention` (全域預設值、模型和個別代理程式)

設定全域預設的快取保留，適用於所有模型：

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

個別代理程式覆寫：

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
3. `agents.list[].params` (符合的代理程式 ID；依鍵值覆寫)

### `contextPruning.mode: "cache-ttl"`

在快取 TTL 視窗後修剪舊的工具結果上下文，以讓閒置後的請求不會重新快取過大的歷史記錄。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行為請參閱 [會話修剪](/zh-Hant/concepts/session-pruning)。

### 心跳保持溫暖

心跳可以保持快取視窗處於溫暖狀態，並減少閒置間隔後重複寫入快取。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

支援在 `agents.list[].heartbeat` 設定個別代理程式的 heartbeat。

## 提供者行為

### Anthropic (直接 API)

- 支援 `cacheRetention`。
- 使用 Anthropic API 金鑰驗證設定檔時，若未設定，OpenClaw 會為 Anthropic 模型參照植入 `cacheRetention: "short"`。
- Anthropic 原生 Messages 回應同時公開 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同時顯示 `cacheRead` 和 `cacheWrite`。
- 對於原生 Anthropic 請求，`cacheRetention: "short"` 對應預設的 5 分鐘暫時性快取，而 `cacheRetention: "long"` 僅在直接 `api.anthropic.com` 主機上升級為 1 小時 TTL。

### OpenAI (直接 API)

- 在支援的最新模型上，提示詞快取是自動的。OpenClaw 不需要插入區塊級別的快取標記。
- OpenClaw 使用 `prompt_cache_key` 來保持跨輪次的快取路由穩定，並且僅當在直接 OpenAI 主機上選擇 `cacheRetention: "long"` 時才使用 `prompt_cache_retention: "24h"`。
- OpenAI 回應透過 `usage.prompt_tokens_details.cached_tokens` (或在 Responses API 事件上透過 `input_tokens_details.cached_tokens`) 公開快取的提示詞 Token。OpenClaw 將其對應至 `cacheRead`。
- OpenAI 未公開獨立的快取寫入 Token 計數器，因此即使供應商正在預熱快取，`cacheWrite` 在 OpenAI 路徑上仍保持 `0`。
- OpenAI 會傳回有用的追蹤和速率限制標頭，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但快取命中計算應來自使用量 Payload，而非標頭。
- 實際上，OpenAI 的行為通常像是初始前綴快取，而不是 Anthropic 風格的移動式完整歷史記錄重複使用。穩定的長前綴文字輪次在當前的即時探測中可接近 `4864` 個快取 Token 的平台期，而重度工具或 MCP 風格的文字記錄即使在完全重複時也通常平台期接近 `4608` 個快取 Token。

### Anthropic Vertex

- Vertex AI 上的 Anthropic 模型 (`anthropic-vertex/*`) 以與直接 Anthropic 相同的方式支援 `cacheRetention`。
- `cacheRetention: "long"` 對應 Vertex AI 端點上真實的 1 小時提示詞快取 TTL。
- `anthropic-vertex` 的預設快取保留時間符合直接 Anthropic 的預設值。
- Vertex 請求透過邊界感知的快取塑形進行路由，以便快取重用與供應商實際接收的內容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型參照 (`amazon-bedrock/*anthropic.claude*`) 支援顯式 `cacheRetention` 傳遞。
- 非 Anthropic 的 Bedrock 模型在執行時會被強制設為 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

對於 `openrouter/anthropic/*` 模型參照，OpenClaw 會在系統/開發者提示區塊上注入 Anthropic
`cache_control`，僅當請求仍針對經過驗證的 OpenRouter 路由時
(其預設端點上的 `openrouter`，或任何解析為
`openrouter.ai` 的供應商/基底 URL)，以改善提示快取的重用。

如果您將模型重新指向任意的 OpenAI 相容代理 URL，OpenClaw
將停止注入那些 OpenRouter 專用的 Anthropic 快取標記。

### 其他供應商

如果供應商不支援此快取模式，`cacheRetention` 將不會生效。

### Google Gemini 直接 API

- 直接 Gemini 傳輸 (`api: "google-generative-ai"`) 透過上游 `cachedContentTokenCount` 回報快取命中；
  OpenClaw 將其對應到 `cacheRead`。
- 當在直接 Gemini 模型上設定 `cacheRetention` 時，OpenClaw 會自動
  在 Google AI Studio 執行期間為系統提示建立、重用和重新整理 `cachedContents` 資源。這意味著您不再需要手動預先建立
  cached-content 控制碼。
- 您仍然可以將預先存在的 Gemini cached-content 控制碼作為
  `params.cachedContent` (或舊版 `params.cached_content`) 傳遞給已設定的
  模型。
- 這與 Anthropic/OpenAI 的提示前綴快取分開。對於 Gemini，
  OpenClaw 管理供應商原生的 `cachedContents` 資源，而不是
  在請求中注入快取標記。

### Gemini CLI JSON 用法

- Gemini CLI JSON 輸出也可以透過 `stats.cached` 顯示快取命中；
  OpenClaw 將其對應到 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 會從
  `stats.input_tokens - stats.cached` 推導輸入 token。
- 這僅是使用量標準化。並不代表 OpenClaw 正在為 Gemini CLI 建立
  Anthropic/OpenAI 風格的提示詞快取標記。

## 系統提示詞快取邊界

OpenClaw 將系統提示詞分割為 **穩定前綴** 和 **易變
後綴**，並以內部快取前綴邊界分隔。邊界上方的內容
（工具定義、技能元數據、工作區檔案和其他相對靜態的上下文）經過排序，
以便在對話輪次之間保持位元組一致。邊界下方的內容
（例如 `HEARTBEAT.md`、執行階段時間戳和其他
每輪次元數據）允許變更，而不會使快取的前綴失效。

關鍵設計選擇：

- 穩定的工作區專案上下文檔案會排序在 `HEARTBEAT.md` 之前，
  因此心跳抖動不會破壞穩定前綴。
- 該邊界會應用於 Anthropic 系列、OpenAI 系列、Google 和
  CLI 傳輸塑形，以便所有支援的提供者都能從相同的前綴
  穩定性中受益。
- Codex 回應和 Anthropic Vertex 請求會透過
  感知邊界的快取塑形進行路由，以便快取重用與提供者
  實際收到的內容保持一致。
- 系統提示詞指紋會進行標準化（空白字元、行尾符號、
  Hook 新增的上下文、執行階段功能排序），以便語意未變的
  提示詞在輪次之間共用 KV/快取。

如果在組態或工作區變更後看到意外的 `cacheWrite` 飆升，
請檢查變更落在快取邊界的上方還是下方。將易變內容移至
邊界下方（或使其穩定）通常能解決問題。

## OpenClaw 快取穩定性防護

OpenClaw 還會在請求到達提供者之前，保持幾個對快取敏感的
Payload 形狀具確定性：

- Bundle MCP 工具目錄在工具註冊前會進行確定性排序，
  因此 `listTools()` 順序的變更不會導致工具區塊抖動
  並破壞提示詞快取前綴。
- 具有持久化圖像區塊的舊版工作階段會保持 **最近 3 個
  已完成輪次** 完整；較舊的已處理圖像區塊可能會
  被替換為標記，以免圖像密集的後續操作不斷重新發送
  大型的過時 Payload。

## 調整模式

### 混合流量（建議的預設值）

在您的主要代理上保持長效基準，在突發性通知代理上停用快取：

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

### 以成本為基準的基線

- 設定基線 `cacheRetention: "short"`。
- 啟用 `contextPruning.mode: "cache-ttl"`。
- 僅針對受益於熱快取的代理，將心跳保持在您的 TTL 以下。

## 快取診斷

OpenClaw 針對嵌入式代理執行公開了專用的快取追蹤診斷功能。

對於一般的使用者導向診斷，當即時會話條目沒有這些計數器時，`/status` 和其他使用摘要可以使用最新的逐字稿使用條目作為 `cacheRead` /
`cacheWrite` 的備用來源。

## 即時回歸測試

OpenClaw 為重複的前綴、工具輪次、圖像輪次、MCP 風格的工具逐字稿以及 Anthropic 的無快取控制保留了一個組合的即時快取回歸閘門。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

執行狹窄的即時閘門：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

基線檔案儲存最近觀察到的即時數字以及測試使用的供應商特定回歸下限。執行器還會使用每次執行的新會話 ID 和提示詞命名空間，因此先前的快取狀態不會污染當前的回歸樣本。

這些測試故意不跨供應商使用相同的成功標準。

### Anthropic 即時預期

- 預期透過 `cacheWrite` 進行明確的暖機寫入。
- 預期在重複輪次中幾乎完全重用歷史記錄，因為 Anthropic 的快取控制會在對話中推進快取斷點。
- 目前的即時斷言對穩定、工具和圖像路徑仍使用高命中率閾值。

### OpenAI 即時預期

- 僅預期 `cacheRead`。`cacheWrite` 保持 `0`。
- 將重複輪次的快取重用視為供應商特定的平台期，而非 Anthropic 風格的移動式全歷史重用。
- 目前的即時斷言使用從 `gpt-5.4-mini` 上觀察到的即時行為衍生的保守下限檢查：
  - 穩定前綴：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具逐字稿：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 圖像逐字稿：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 風格逐字稿：`cacheRead >= 4096`，命中率 `>= 0.85`

2026-04-04 的最新綜合即時驗證結果為：

- 穩定前綴：`cacheRead=4864`，命中率 `0.966`
- 工具逐字稿：`cacheRead=4608`，命中率 `0.896`
- 圖片逐字稿：`cacheRead=4864`，命中率 `0.954`
- MCP 風格逐字稿：`cacheRead=4608`，命中率 `0.891`

該綜合閘道最近的本地牆上時間約為 `88s`。

為何斷言會不同：

- Anthropic 公開了明確的緩存斷點和移動的對話歷史重用。
- OpenAI 的提示緩存仍然對精確前綴敏感，但在即時 Responses 流量中，有效的可重用前綴可能會早於完整提示達到平台期。
- 因此，使用單一跨供應商百分比閾值來比較 Anthropic 和 OpenAI 會導致虛假回歸。

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

### 環境變數開關 (一次性除錯)

- `OPENCLAW_CACHE_TRACE=1` 啟用緩存追蹤。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆寫輸出路徑。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切換完整訊息負載捕獲。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切換提示文字捕獲。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切換系統提示捕獲。

### 檢查項目

- 緩存追蹤事件為 JSONL 格式，並包含 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等分階段快照。
- 每輪緩存 Token 的影響可透過一般用量介面中的 `cacheRead` 和 `cacheWrite` 查看 (例如 `/usage full` 和 Session 使用量摘要)。
- 對於 Anthropic，當快取啟用時，預期會同時看到 `cacheRead` 和 `cacheWrite`。
- 對於 OpenAI，預期快取命中時會有 `cacheRead`，且 `cacheWrite` 會保持 `0`；OpenAI 未發布單獨的快取寫入欄位。
- 如果您需要請求追蹤，請將請求 ID 和速率限制標頭與快取指標分別記錄。OpenClaw 目前的快取追蹤輸出專注於提示詞/會話形狀和標準化的 token 使用量，而非原始供應商回應標頭。

## 快速疑難排解

- 大多數輪次的 `cacheWrite` 很高：檢查是否有不穩定的系統提示詞輸入，並確認模型/供應商支援您的快取設定。
- Anthropic 的 `cacheWrite` 很高：通常表示快取斷點落在了每次請求都會變更的內容上。
- OpenAI 的 `cacheRead` 很低：確認穩定的前綴位於開頭，重複的前綴至少為 1024 個 token，且應共享快取的輪次重複使用了相同的 `prompt_cache_key`。
- `cacheRetention` 無效：確認模型金鑰符合 `agents.defaults.models["provider/model"]`。
- 包含快取設定的 Bedrock Nova/Mistral 請求：預期執行時期會強制 `none`。

相關文件：

- [Anthropic](/zh-Hant/providers/anthropic)
- [Token 使用與成本](/zh-Hant/reference/token-use)
- [會話修剪](/zh-Hant/concepts/session-pruning)
- [閘道設定參考](/zh-Hant/gateway/configuration-reference)
