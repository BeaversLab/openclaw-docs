---
summary: "模型供應商概覽，包含範例設定與 CLI 流程"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "模型供應商"
sidebarTitle: "模型供應商"
---

**LLM/模型提供者**（不是 WhatsApp/Telegram 等聊天頻道）的參考。關於模型選擇規則，請參閱 [Models](/zh-Hant/concepts/models)。

## 快速規則

<AccordionGroup>
  <Accordion title="Model refs and CLI helpers">
    - 模型引用使用 `provider/model`（例如：`opencode/claude-opus-4-6`）。
    - 當設定 `agents.defaults.models` 時，它會充當允許清單。
    - CLI 輔助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` 設定提供者層級的預設值；`models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` 則針對每個模型進行覆蓋。
    - 備援規則、冷卻探測和會話覆蓋持續性：[Model failover](/zh-Hant/concepts/model-failover)。

  </Accordion>
  <Accordion title="Adding provider auth does not change your primary model">
    當您新增或重新驗證提供者時，`openclaw configure` 會保留現有的 `agents.defaults.model.primary`。`openclaw models auth login` 也有相同作用，除非您傳遞了 `--set-default`。提供者外掛程式可能仍會在其授權設定修補中返回建議的預設模型，但當主要模型已存在時，OpenClaw 會將其視為「讓此模型可用」，而非「取代目前的主要模型」。

    若要刻意切換預設模型，請使用 `openclaw models set <provider/model>` 或 `openclaw models auth login --provider <id> --set-default`。

  </Accordion>
  <Accordion title="OpenAI provider/runtime split">
    OpenAI 系列的路由是特定於前綴的：

    - `openai/<model>` 預設使用原生 Codex 應用程式伺服器束縛來處理代理程式回合。這是標準的 ChatGPT/Codex 訂閱設定。
    - `openai-codex/<model>` 是舊版設定，doctor 會將其重寫為 `openai/<model>`。
    - `openai/<model>` 加上提供者/模型 `agentRuntime.id: "pi"` 會針對明確的 API 金鑰或相容性路由使用 PI。

    請參閱 [OpenAI](/zh-Hant/providers/openai) 和 [Codex harness](/zh-Hant/plugins/codex-harness)。如果提供者/執行時期的區隔令人困惑，請先閱讀 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。

    外掛程式自動啟用遵循相同的界限：`openai/*` 代理程式引用會為預設路由啟用 Codex 外掛程式，而明確的提供者/模型 `agentRuntime.id: "codex"` 或舊版 `codex/<model>` 引用也需要它。

    GPT-5.5 在 `openai/gpt-5.5` 上預設透過原生 Codex 應用程式伺服器束縛提供，且只有在提供者/模型執行時期政策明確選擇 `pi` 時才透過 PI 提供。

  </Accordion>
  <Accordion title="CLI runtimes">
    CLI 執行階段使用相同的拆分：選擇標準模型引用，例如 `anthropic/claude-*` 或 `google/gemini-*`，然後在您需要本機 CLI 後端時，將提供者/模型執行階段原則設定為 `claude-cli` 或 `google-gemini-cli`。

    舊版 `claude-cli/*` 和 `google-gemini-cli/*` 引用會遷移回標準提供者引用，並單獨記錄執行階段。舊版 `codex-cli/*` 引用會遷移至 `openai/*` 並使用 Codex 應用伺服器路由；OpenClaw 不再維護捆綁的 Codex CLI 後端。

  </Accordion>
</AccordionGroup>

## 外掛程式擁有的提供者行為

大多數特定於提供者的邏輯位於提供者外掛 (`registerProvider(...)`) 中，而 OpenClaw 則保留通用推論迴圈。外掛負責上架、模型目錄、授權環境變數對應、傳輸/配置標準化、工具架構清理、故障轉移分類、OAuth 重新整理、使用情況報告、思考/推理設定檔等。

提供者 SDK 掛鉤與內建外掛程式範例的完整清單位於 [Provider plugins](/zh-Hant/plugins/sdk-provider-plugins)。需要完全自訂請求執行器的提供者，是一個獨立、更深層的擴充介面。

<Note>提供者擁有的執行器行為位於明確的提供者掛鉤上，例如重播原則、工具架構標準化、串流包裝以及傳輸/請求輔助程式。舊版 `ProviderPlugin.capabilities` 靜態包僅用於相容性，共享執行器邏輯不再讀取它。</Note>

## API 金鑰輪替

<AccordionGroup>
  <Accordion title="Key sources and priority">
    透過以下方式配置多個金鑰：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (單一即時覆寫，優先順序最高)
    - `<PROVIDER>_API_KEYS` (逗號或分號清單)
    - `<PROVIDER>_API_KEY` (主金鑰)
    - `<PROVIDER>_API_KEY_*` (編號清單，例如 `<PROVIDER>_API_KEY_1`)

    對於 Google 提供者，`GOOGLE_API_KEY` 也會作為後備包含在內。金鑰選擇順序會保留優先順序並將值去重。

  </Accordion>
  <Accordion title="When rotation kicks in">
    - 僅在遇到速率限制回應時（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 或週期性使用限制訊息），才會使用下一個金鑰重試請求。
    - 非速率限制的失敗會立即回報錯誤；不會嘗試輪換金鑰。
    - 當所有候選金鑰都失敗時，將會傳回最後一次嘗試的最終錯誤。

  </Accordion>
</AccordionGroup>

## 內建供應商 (pi-ai 目錄)

OpenClaw 內建 pi-ai catalog。這些供應商**不**需要 `models.providers` 設定；只需設定驗證並選擇模型即可。

### OpenAI

- 供應商：`openai`
- 驗證：`OPENAI_API_KEY`
- 可選輪換：`OPENAI_API_KEYS`、`OPENAI_API_KEY_1`、`OPENAI_API_KEY_2`，以及 `OPENCLAW_LIVE_OPENAI_KEY`（單一覆蓋）
- 範例模型：`openai/gpt-5.5`、`openai/gpt-5.4-mini`
- 如果特定安裝或 API 金鑰的行為不同，請使用 `openclaw models list --provider openai` 驗證帳戶/模型可用性。
- CLI：`openclaw onboard --auth-choice openai-api-key`
- 預設傳輸方式為 `auto`；OpenClaw 會將傳輸選項傳遞給 pi-ai。
- 透過 `agents.defaults.models["openai/<model>"].params.transport` 針對各個模型進行覆蓋（`"sse"`、`"websocket"` 或 `"auto"`）
- 可以透過 `agents.defaults.models["openai/<model>"].params.serviceTier` 啟用 OpenAI 優先處理
- `/fast` 和 `params.fastMode` 會將直接 `openai/*` Responses 要求對應到 `service_tier=priority` 上的 `api.openai.com`
- 當您想要明確的層級而不是共用的 `/fast` 切換開關時，請使用 `params.serviceTier`
- 隱藏的 OpenClaw 歸因標頭 (`originator`, `version`, `User-Agent`) 僅適用於前往 `api.openai.com` 的原生 OpenAI 流量，不適用於通用 OpenAI 相容代理
- 原生 OpenAI 路由也會保留 Responses `store`、提示詞快取提示以及 OpenAI 推理相容負載塑造；代理路由則不會
- `openai/gpt-5.3-codex-spark` 在 OpenClaw 中被有意隱藏，因為即時 OpenAI API 請求會拒絕它，且目前的 Codex 目錄未公開它

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- 供應商：`anthropic`
- 驗證：`ANTHROPIC_API_KEY`
- 選用輪換：`ANTHROPIC_API_KEYS`、`ANTHROPIC_API_KEY_1`、`ANTHROPIC_API_KEY_2`，以及 `OPENCLAW_LIVE_ANTHROPIC_KEY` (單一覆寫)
- 範例模型：`anthropic/claude-opus-4-6`
- CLI：`openclaw onboard --auth-choice apiKey`
- 直接公開的 Anthropic 請求支援共享的 `/fast` 切換開關和 `params.fastMode`，包括傳送到 `api.anthropic.com` 的 API 金鑰和 OAuth 驗證流量；OpenClaw 將其對應到 Anthropic `service_tier` (`auto` vs `standard_only`)
- 首選的 Claude CLI 設定會保持模型引用的規範性，並單獨選取 CLI
  後端：`anthropic/claude-opus-4-7` 搭配
  模型範圍的 `agentRuntime.id: "claude-cli"`。舊版
  `claude-cli/claude-opus-4-7` 引用為相容性仍可使用。

<Note>Anthropic 人員告訴我們，OpenClaw 風格的 Claude CLI 使用再次被允許，因此除非 Anthropic 發布新政策，否則 OpenClaw 將 Claude CLI 重複使用和 `claude -p` 使用視為此整合的授權行為。Anthropic setup-token 仍可作為支援的 OpenClaw token 路徑使用，但在可用時 OpenClaw 現在傾向於 Claude CLI 重複使用和 `claude -p`。</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- 供應商：`openai-codex`
- 驗證：OAuth (ChatGPT)
- 舊版 PI 模型引用：`openai-codex/gpt-5.5`
- 原生 Codex 應用程式伺服器套件引用：`openai/gpt-5.5`
- 原生 Codex 應用程式伺服器 線上 套件 文件：[Codex harness](/zh-Hant/plugins/codex-harness)
- 舊版模型參考：`codex/gpt-*`
- 插件邊界：`openai-codex/*` 會載入 OpenAI 插件；原生的 Codex app-server 插件僅由 Codex harness 運行時或舊版 `codex/*` 參考選取。
- CLI：`openclaw onboard --auth-choice openai-codex` 或 `openclaw models auth login --provider openai-codex`
- 預設傳輸為 `auto`（優先使用 WebSocket，後備 SSE）
- 透過 `agents.defaults.models["openai-codex/<model>"].params.transport` 針對每個 PI 模型進行覆蓋（`"sse"`、`"websocket"` 或 `"auto"`）
- `params.serviceTier` 也會在原生 Codex Responses 請求上轉發（`chatgpt.com/backend-api`）
- 隱藏的 OpenClaw 歸因標頭（`originator`、`version`、`User-Agent`）僅附加在前往 `chatgpt.com/backend-api` 的原生 Codex 流量上，而不附加於一般 OpenAI 相容代理
- 與直接 `openai/*` 共用相同的 `/fast` 切換開關和 `params.fastMode` 設定；OpenClaw 會將其對應至 `service_tier=priority`
- `openai-codex/gpt-5.5` 使用 Codex 目錄的原生 `contextWindow = 400000` 和預設運行時 `contextTokens = 272000`；使用 `models.providers.openai-codex.models[].contextTokens` 覆蓋運行時上限
- 政策說明：明確支援將 OpenAI Codex OAuth 用於外部工具/工作流程，例如 OpenClaw。
- 對於常見的訂閱加原生 Codex 運行時路由，請使用 `openai-codex` 驗證登入，但設定 `openai/gpt-5.5`；OpenAI 代理程式預設會選擇 Codex。
- 僅當您想要透過 PI 的相容性路由時，才使用 provider/model `agentRuntime.id: "pi"`；否則請將 `openai/gpt-5.5` 保持在預設的 Codex harness 上。
- `openai-codex/gpt-*` 參考仍為傳統 PI 路由。對於新的代理程式組態，請在原生 Codex 執行時間上優先使用 `openai/gpt-5.5`，並在您想要將舊的 `openai-codex/*` 參考遷移至標準 `openai/*` 參考時執行 `openclaw doctor --fix`。

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
    },
  },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### 其他訂閱式託管選項

<CardGroup cols={3}>
  <Card title="GLM 模型" href="/zh-Hant/providers/glm">
    Z.AI Coding Plan 或一般 API 端點。
  </Card>
  <Card title="MiniMax" href="/zh-Hant/providers/minimax">
    MiniMax Coding Plan OAuth 或 API 金鑰存取。
  </Card>
  <Card title="Qwen Cloud" href="/zh-Hant/providers/qwen">
    Qwen Cloud 提供者介面，以及 Alibaba DashScope 和 Coding Plan 端點對應。
  </Card>
</CardGroup>

### OpenCode

- 驗證：`OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)
- Zen 執行時間提供商：`opencode`
- Go 執行時間提供商：`opencode-go`
- 範例模型：`opencode/claude-opus-4-6`、`opencode-go/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (API 金鑰)

- 提供商：`google`
- 驗證：`GEMINI_API_KEY`
- 可選輪換：`GEMINI_API_KEYS`、`GEMINI_API_KEY_1`、`GEMINI_API_KEY_2`、`GOOGLE_API_KEY` 備援，以及 `OPENCLAW_LIVE_GEMINI_KEY` (單一覆寫)
- 範例模型：`google/gemini-3.1-pro-preview`、`google/gemini-3-flash-preview`
- 相容性：使用 `google/gemini-3.1-flash-preview` 的舊版 OpenClaw 配置會正規化為 `google/gemini-3-flash-preview`
- 別名：`google/gemini-3.1-pro` 被接受並正規化為 Google 的即時 Gemini API ID，`google/gemini-3.1-pro-preview`
- CLI：`openclaw onboard --auth-choice gemini-api-key`
- 思考：`/think adaptive` 使用 Google 動態思考。Gemini 3/3.1 省略固定的 `thinkingLevel`；Gemini 2.5 會發送 `thinkingBudget: -1`。
- 直接執行 Gemini 也接受 `agents.defaults.models["google/<model>"].params.cachedContent`（或舊版 `cached_content`）來轉發提供者原生的 `cachedContents/...` 處理程序；Gemini 快取命中會顯示為 OpenClaw `cacheRead`

### Google Vertex 和 Gemini CLI

- 提供者：`google-vertex`、`google-gemini-cli`
- 驗證：Vertex 使用 gcloud ADC；Gemini CLI 使用其 OAuth 流程

<Warning>OpenClaw 中的 Gemini CLI OAuth 是非官方整合。部分使用者回報在使用第三方用戶端後遭遇 Google 帳號限制。請詳閱 Google 條款，若您選擇繼續，請使用非關鍵帳號。</Warning>

Gemini CLI OAuth 是內建 `google` 外掛程式的一部分。

<Steps>
  <Step title="安裝 Gemini CLI">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="Enable plugin">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="登入">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    預設模型：`google-gemini-cli/gemini-3-flash-preview`。您**不**需要將用戶端 ID 或密鑰貼入 `openclaw.json`。CLI 登入流程會將權杖儲存在閘道主機上的驗證設定檔中。

  </Step>
  <Step title="設定專案（如需要）">
    如果登入後請求失敗，請在閘道主機上設定 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`。
  </Step>
</Steps>

Gemini CLI JSON 回覆會從 `response` 解析；使用量會回退到 `stats`，其中 `stats.cached` 會被正規化為 OpenClaw `cacheRead`。

### Z.AI (GLM)

- 提供者：`zai`
- 驗證：`ZAI_API_KEY`
- 範例模型：`zai/glm-5.1`
- CLI：`openclaw onboard --auth-choice zai-api-key`
  - 別名：`z.ai/*` 和 `z-ai/*` 會正規化為 `zai/*`
  - `zai-api-key` 會自動偵測對應的 Z.AI 端點；`zai-coding-global`、`zai-coding-cn`、`zai-global` 和 `zai-cn` 則會強制使用特定的介面

### Vercel AI Gateway

- 提供者：`vercel-ai-gateway`
- 驗證：`AI_GATEWAY_API_KEY`
- 範例模型：`vercel-ai-gateway/anthropic/claude-opus-4.6`、`vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- 提供者：`kilocode`
- 認證：`KILOCODE_API_KEY`
- 範例模型：`kilocode/kilo/auto`
- CLI：`openclaw onboard --auth-choice kilocode-api-key`
- 基礎 URL：`https://api.kilo.ai/api/gateway/`
- 靜態備用目錄內建 `kilocode/kilo/auto`；即時 `https://api.kilo.ai/api/gateway/models` 探索功能可進一步擴充執行時期目錄。
- `kilocode/kilo/auto` 背後的精確上游路由是由 Kilo Gateway 掌控，而非在 OpenClaw 中硬編碼。

有關設定詳細資訊，請參閱 [/providers/kilocode](/zh-Hant/providers/kilocode)。

### 其他內建提供者外掛

| 提供者                 | ID                               | 驗證環境變數                                                 | 範例模型                                      |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| BytePlus               | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`               |
| Cerebras               | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                        |
| Cloudflare AI Gateway  | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                             |
| DeepInfra              | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V3.2`         |
| DeepSeek               | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                  |
| GitHub Copilot         | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                             |
| Groq                   | `groq`                           | `GROQ_API_KEY`                                               | -                                             |
| Hugging Face Inference | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`         |
| Kilo Gateway           | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                          |
| Kimi Coding            | `kimi`                           | `KIMI_API_KEY` 或 `KIMICODE_API_KEY`                         | `kimi/kimi-for-coding`                        |
| MiniMax                | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                        |
| Mistral                | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                |
| Moonshot               | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                          |
| NVIDIA                 | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`    |
| OpenRouter             | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                             |
| Qianfan                | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                       |
| Qwen Cloud             | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                           |
| StepFun                | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                      |
| Together               | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`               |
| Venice                 | `venice`                         | `VENICE_API_KEY`                                             | -                                             |
| Vercel AI Gateway      | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| 火山引擎 (豆包)        | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`             |
| xAI                    | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4.3`                                |
| 小米                   | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                        |

#### 值得注意的特性

<AccordionGroup>
  <Accordion title="OpenRouter">
    僅在已驗證的 `openrouter.ai` 路由上套用其應用程式歸因標頭和 Anthropic `cache_control` 標記。DeepSeek、Moonshot 和 ZAI 引用符合 OpenRouter 管理的提示詞快取的快取 TTL 資格，但不會收到 Anthropic 快取標記。作為代理式 OpenAI 相容路徑，它會跳過僅限原生 OpenAI 的塑型（`serviceTier`、Responses `store`、提示詞快取提示、OpenAI 推理相容性）。備受 Gemini 支援的引用僅保留代理 Gemini 思維簽章清理功能。
  </Accordion>
  <Accordion title="Kilo Gateway">
    Gemini 支援的參照遵循相同的 proxy-Gemini 清理路徑；`kilocode/kilo/auto` 和其他不支援 proxy 推理的參照會跳過 proxy 推理注入。
  </Accordion>
  <Accordion title="MiniMax">
    API 金鑰導入會寫入明確的僅文字 M2.7 聊天模型定義；圖像理解保留在外掛程式擁有的 `MiniMax-VL-01` 媒體提供者上。
  </Accordion>
  <Accordion title="NVIDIA">
    模型 ID 使用 `nvidia/<vendor>/<model>` 命名空間（例如 `nvidia/nvidia/nemotron-...` 以及 `nvidia/moonshotai/kimi-k2.5`）；選擇器會保留字面的 `<provider>/<model-id>` 組成，而發送到 API 的標準金鑰則保持單一字首。
  </Accordion>
  <Accordion title="xAI">
    使用 xAI Responses 路徑。`grok-4.3` 是內建的預設聊天模型。`/fast` 或 `params.fastMode: true` 會將 `grok-3`、`grok-3-mini`、`grok-4` 和 `grok-4-0709` 重寫為其 `*-fast` 變體。`tool_stream` 預設為開啟；透過 `agents.defaults.models["xai/<model>"].params.tool_stream=false` 停用。
  </Accordion>
  <Accordion title="Cerebras">
    作為內建的 `cerebras` 提供者外掛程式提供。GLM 使用 `zai-glm-4.7`；OpenAI 相容的基礎 URL 是 `https://api.cerebras.ai/v1`。
  </Accordion>
</AccordionGroup>

## 透過 `models.providers` 的提供者（自訂/基礎 URL）

使用 `models.providers`（或 `models.json`）來新增 **自訂** 提供者或 OpenAI/Anthropic 相容的代理伺服器。

下列許多內建的提供者外掛程式已經發布了預設目錄。僅在您想要覆寫預設基礎 URL、標頭或模型清單時，才使用明確的 `models.providers.<id>` 項目。

Gateway 模型能力檢查也會讀取明確的 `models.providers.<id>.models[]` 中繼資料。如果自訂或 Proxy 模型接受圖片，請在該模型上設定 `input: ["text", "image"]`，以便 WebChat 和節點來源的附件路徑將圖片作為原生模型輸入傳遞，而不是僅限文字的媒體參照。

`agents.defaults.models["provider/model"]` 僅控制模型的可見性、別名以及 Agent 的個別模型中繼資料。它本身不會註冊新的執行時期模型。對於自訂供應商模型，還需新增 `models.providers.<provider>.models[]`，且至少包含匹配的 `id`。

### Moonshot AI (Kimi)

Moonshot 作為捆綁的供應商外掛程式提供。預設情況下請使用內建供應商，僅在您需要覆寫基礎 URL 或模型中繼資料時才新增明確的 `models.providers.moonshot` 項目：

- 供應商：`moonshot`
- 驗證：`MOONSHOT_API_KEY`
- 範例模型：`moonshot/kimi-k2.6`
- CLI：`openclaw onboard --auth-choice moonshot-api-key` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`

Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Kimi 程式設計

Kimi Coding 使用 Moonshot AI 的相容 Anthropic 端點：

- 供應商：`kimi`
- 驗證：`KIMI_API_KEY`
- 範例模型：`kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

舊版 `kimi/kimi-code` 和 `kimi/k2p5` 仍作為相容模型 ID 被接受，並會正規化為 Kimi 的穩定 API 模型 ID。

### 火山引擎 (Doubao)

火山引擎 (Volcano Engine) 提供存取中國境內 Doubao 及其他模型的途徑。

- 供應商：`volcengine` (編碼：`volcengine-plan`)
- 驗證：`VOLCANO_ENGINE_API_KEY`
- 範例模型：`volcengine-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

上架預設為編碼介面，但同時會註冊通用 `volcengine/*` 目錄。

在上架/設定模型選擇器中，Volcengine 驗證選擇偏好同時顯示 `volcengine/*` 和 `volcengine-plan/*` 列。如果尚未載入這些模型，OpenClaw 會回退到未篩選的目錄，而不是顯示空的供應商範圍選擇器。

<Tabs>
  <Tab title="標準模型">
    - `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222` (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

  </Tab>
  <Tab title="程式設計模型 (volcengine-plan)">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`

  </Tab>
</Tabs>

### BytePlus (國際版)

BytePlus ARK 為國際用戶提供與火山引擎相同的模型存取權。

- 提供商：`byteplus` (coding: `byteplus-plan`)
- 驗證：`BYTEPLUS_API_KEY`
- 範例模型：`byteplus-plan/ark-code-latest`
- CLI：`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

入門預設使用程式設計介面，但同時會註冊一般的 `byteplus/*` 目錄。

在入門/配置模型選擇器中，BytePlus 驗證選項會偏好 `byteplus/*` 和 `byteplus-plan/*` 列。如果這些模型尚未載入，OpenClaw 將會回退到未經篩選的目錄，而不是顯示空的提供商範圍選擇器。

<Tabs>
  <Tab title="標準模型">
    - `byteplus/seed-1-8-251228` (Seed 1.8)
    - `byteplus/kimi-k2-5-260127` (Kimi K2.5)
    - `byteplus/glm-4-7-251222` (GLM 4.7)

  </Tab>
  <Tab title="程式設計模型 (byteplus-plan)">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Synthetic

Synthetic 在 `synthetic` 提供商後方提供相容 Anthropic 的模型：

- 提供商：`synthetic`
- 驗證：`SYNTHETIC_API_KEY`
- 範例模型：`synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI：`openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

由於 MiniMax 使用自訂端點，因此透過 `models.providers` 進行配置：

- MiniMax OAuth (Global)：`--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN)：`--auth-choice minimax-cn-oauth`
- MiniMax API 金鑰 (全域): `--auth-choice minimax-global-api`
- MiniMax API 金鑰 (CN): `--auth-choice minimax-cn-api`
- 驗證：`MINIMAX_API_KEY` 用於 `minimax`；`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY` 用於 `minimax-portal`

有關設定詳細資訊、模型選項和組態程式碼片段，請參閱 [/providers/minimax](/zh-Hant/providers/minimax)。

<Note>在 MiniMax 相容 Anthropic 的串流路徑上，除非您明確設定，否則 OpenClaw 預設會停用思考，並且 `/fast on` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。</Note>

外掛擁有的功能拆分：

- 文字/聊天預設值保持為 `minimax/MiniMax-M2.7`
- 圖像生成為 `minimax/image-01` 或 `minimax-portal/image-01`
- 圖像理解在兩種 MiniMax 驗證路徑上皆為外掛擁有的 `MiniMax-VL-01`
- 網路搜尋保持為供應商 ID `minimax`

### LM Studio

LM Studio 作為內建的供應商外掛發布，它使用原生 API：

- 供應商: `lmstudio`
- 驗證: `LM_API_TOKEN`
- 預設推斷基礎 URL: `http://localhost:1234/v1`

然後設定一個模型 (替換為 `http://localhost:1234/api/v1/models` 返回的其中一個 ID)：

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw 使用 LM Studio 的原生 `/api/v1/models` 和 `/api/v1/models/load` 進行探索和自動載入，並預設使用 `/v1/chat/completions` 進行推論。如果您希望 LM Studio 擁有模型生命週期的 JIT 載入、TTL 和自動驅逐功能，請設定 `models.providers.lmstudio.params.preload: false`。有關設定和疑難排解，請參閱 [/providers/lmstudio](/zh-Hant/providers/lmstudio)。

### Ollama

Ollama 作為內建的供應商外掛發布，並使用 Ollama 的原生 API：

- 供應商: `ollama`
- 驗證：無需（本機伺服器）
- 範例模型: `ollama/llama3.3`
- 安裝：[https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

當您使用 `OLLAMA_API_KEY` 選擇加入時，Ollama 會在 `http://127.0.0.1:11434` 本機偵測到，且內建的提供者外掛程式會將 Ollama 直接新增至 `openclaw onboard` 和模型選擇器。有關入門、雲端/本機模式和自訂組態，請參閱 [/providers/ollama](/zh-Hant/providers/ollama)。

### vLLM

vLLM 作為內建的供應商外掛發布，用於本機/自託管的 OpenAI 相容伺服器：

- 供應商: `vllm`
- 驗證：可選（取決於您的伺服器）
- 預設基礎 URL: `http://127.0.0.1:8000/v1`

若要在本機選擇加入自動探索（如果您的伺服器不強制執行驗證，則任何值均可）：

```bash
export VLLM_API_KEY="vllm-local"
```

然後設定一個模型（替換為 `/v1/models` 回傳的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

有關詳細資訊，請參閱 [/providers/vllm](/zh-Hant/providers/vllm)。

### SGLang

SGLang 作為一個內建供應商插件，用於快速的自託管 OpenAI 相容伺服器：

- 提供者：`sglang`
- 驗證：選用（取決於您的伺服器）
- 預設基礎 URL：`http://127.0.0.1:30000/v1`

若要在本機選擇啟用自動探索（如果您的伺服器不強制執行驗證，則任何值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

然後設定一個模型（替換為 `/v1/models` 回傳的其中一個 ID）：

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

有關詳細資訊，請參閱 [/providers/sglang](/zh-Hant/providers/sglang)。

### 本機代理（LM Studio、vLLM、LiteLLM 等）

範例（OpenAI 相容）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Default optional fields">
    對於自訂提供者，`reasoning`、`input`、`cost`、`contextWindow` 和 `maxTokens` 是選用的。若省略，OpenClaw 預設為：

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    建議：設定符合您的代理/模型限制的明確值。

  </Accordion>
  <Accordion title="Proxy-route shaping rules">
    - 針對非原生端點（任何主機不是 `api.openai.com` 的非空 `baseUrl`）上的 `api: "openai-completions"`，OpenClaw 會強制使用 `compat.supportsDeveloperRole: false` 以避免因不支援的 `developer` 角色而導致的提供商 400 錯誤。
    - 代理風格的 OpenAI 相容路由也會跳過僅限原生 OpenAI 的請求塑造：無 `service_tier`、無 Responses `store`、無 Completions `store`、無提示快取提示、無 OpenAI 推理相容負載塑造，也無隱藏的 OpenClaw 歸因標頭。
    - 針對需要廠商特定欄位的 OpenAI 相容 Completions 代理，請設定 `agents.defaults.models["provider/model"].params.extra_body`（或 `extraBody`）以將額外的 JSON 合併到傳出請求主體中。
    - 針對 vLLM 聊天範本控制，請設定 `agents.defaults.models["provider/model"].params.chat_template_kwargs`。當會話思考層級關閉時，隨附的 vLLM 外掛會自動為 `vllm/nemotron-3-*` 發送 `enable_thinking: false` 和 `force_nonempty_content: true`。
    - 針對緩慢的本機模型或遠端 LAN/tailnet 主機，請設定 `models.providers.<id>.timeoutSeconds`。這會延長提供商模型 HTTP 請求處理，包括連線、標頭、主體串流和總受防護擷取中止，而不會增加整個代理程式執行階段逾時。如果 `agents.defaults.timeoutSeconds` 或執行特定逾時較低，請一併提高該上限；提供商逾時無法延長整個執行。
    - 模型提供商 HTTP 呼叫僅允許在 `198.18.0.0/15` 和 `fc00::/7` 中針對已設定的提供商 `baseUrl` 主機名稱使用 Surge、Clash 和 sing-box 的假 IP DNS 回應。自訂/本機提供商端點也會信任針對受防護模型請求的那個確切已設定 `scheme://host:port` 來源，包括回送、LAN 和 tailnet 主機。這不是一個新的設定選項；您設定的 `baseUrl` 僅會擴充該來源的請求原則。假 IP 主機名稱許可和確切來源信任是獨立的機制。其他私有、回送、連結本機、中繼資料目的地和不同連接埠仍然需要明確的 `models.providers.<id>.request.allowPrivateNetwork: true` 加入。設定 `models.providers.<id>.request.allowPrivateNetwork: false` 以退出確切來源信任。
    - 如果 `baseUrl` 為空/省略，OpenClaw 會保持預設的 OpenAI 行為（其解析為 `api.openai.com`）。
    - 為了安全起見，在非原生 `openai-completions` 端點上仍然會覆寫明確的 `compat.supportsDeveloperRole: true`。
    - 針對非直接端點（任何非正式 `anthropic` 的提供商，或主機不是公開 `api.anthropic.com` 端點的自訂 `models.providers.anthropic.baseUrl`）上的 `api: "anthropic-messages"`，OpenClaw 會隱含抑制 Anthropic beta 標頭（例如 `claude-code-20250219`、`interleaved-thinking-2025-05-14` 和 OAuth 標記），以免自訂 Anthropic 相容代理拒絕不支援的 beta 旗標。如果您的代理需要特定的 beta 功能，請明確設定 `models.providers.<id>.headers["anthropic-beta"]`。

  </Accordion>
</AccordionGroup>

## CLI 範例

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

另請參閱：[Configuration](/zh-Hant/gateway/configuration) 以取得完整的配置範例。

## 相關

- [Configuration reference](/zh-Hant/gateway/config-agents#agent-defaults) - 模型配置鍵
- [Model failover](/zh-Hant/concepts/model-failover) - 備援鏈與重試行為
- [Models](/zh-Hant/concepts/models) - 模型配置與別名
- [Providers](/zh-Hant/providers) - 各供應商設定指南
