---
summary: "即時（網路連線）測試：模型矩陣、CLI 後端、ACP、媒體供應商、憑證"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "測試：即時套件"
sidebarTitle: "即時測試"
---

如需快速入門、QA 執行器、單元/整合測試套件以及 Docker 流程，請參閱
[測試](/zh-Hant/help/testing)。本頁涵蓋 **即時**（網路連線）測試
套件：模型矩陣、CLI 後端、ACP 與媒體供應商即時測試，以及
憑證處理。

## Live：本地冒煙測試指令

在進行臨時即時檢查之前，請先在處理程序環境中匯出所需的供應商金鑰。

安全媒體冒煙測試：

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

安全語音通話就緒冒煙測試：

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

除非同時存在 `--yes`，否則 `voicecall smoke` 為試運行。僅當您有意發出真正的通知呼叫時，才使用 `--yes`。
對於 Twilio、Telnyx 和 Plivo，成功的就緒檢查需要公開的 Webhook URL；限本地的迴路/私有後援依設計會被拒絕。

## 即時：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 指令碼：`pnpm android:test:integration`
- 目標：呼叫連線的 Android 節點目前廣告的**每個指令**，並斷言指令合約行為。
- 範圍：
  - 前置條件/手動設定（該套件不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點，逐指令進行閘道 `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連線並與 gateway 配對。
  - 應用程式保持在前台。
  - 已授予您預期通過之功能的權限/擷取同意。
- 可選的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳細資訊：[Android 應用程式](/zh-Hant/platforms/android)

## 即時：模型冒煙測試（設定檔金鑰）

即時測試分為兩層，以便我們隔離失敗：

- "Direct model" 告訴我們 provider/model 是否能使用給定的金鑰回答。
- "Gateway smoke" 告訴我們完整的 gateway+agent 管線對該 model 是否正常運作（sessions、history、tools、sandbox policy 等）。

### Layer 1：Direct model completion（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉已探索的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 對每個模型執行一次小型完成（並在需要時執行目標迴歸測試）
- 如何啟用：
  - `pnpm test:live`（若直接叫用 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，為 modern 的別名）以實際執行此套件；否則會跳過以保持 `pnpm test:live` 專注於閘道冒煙測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
  - Modern/all 掃描預設為精選的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行完整的 Modern 掃描，或設定正數以使用較小的上限。
  - 完整掃描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作為整個 direct-model 測試的逾時時間。預設值：60 分鐘。
  - Direct-model probes 預設以 20 路並行執行；請設定 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 來覆寫。
- 如何選擇提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (逗號允許清單)
- 金鑰來源：
  - 預設：profile store 和 env 備援
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 為何存在：
  - 區分「provider API 故障 / 金鑰無效」與「gateway agent 管線故障」
  - 包含小型、獨立的迴歸測試（例如：OpenAI Responses/Codex Responses reasoning 重播 + tool-call 流程）

### Layer 2：Gateway + dev agent smoke（"@openclaw" 實際上做的事情）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內 gateway
  - 建立/修補 `agent:dev:*` session (每次執行的模型覆寫)
  - 對帶有金鑰的模型進行迭代並斷言：
    - "有意義" 的回應（無工具）
    - 真實工具呼叫運作正常（read probe）
    - 選用的額外工具探測（exec+read probe）
    - OpenAI 迴歸路徑（僅工具呼叫 → 後續）持續正常運作
- 探測細節（以便您快速解釋失敗原因）：
  - `read` probe：測試會在工作區寫入一個 nonce 檔案，並要求 agent `read` 該檔案並將 nonce 回傳。
  - `exec+read` probe：測試會要求 agent 將 nonce `exec`-寫入至暫存檔案，然後將其 `read` 回來。
  - image probe：測試會附加一個產生的 PNG (cat + 隨機程式碼)，並預期模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live` (若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`)
- 如何選擇模型：
  - 預設值：現代允許清單（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4.3）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 Modern 允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (或逗號清單) 以縮小範圍
  - Modern/all gateway 掃描預設為精選的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的 Modern 掃描，或設定正數以使用較小的上限。
- 如何選擇 providers（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (逗號允許清單)
- 在此即時測試中，工具與影像探測始終開啟：
  - `read` probe + `exec+read` probe (工具壓力測試)
  - 當模型宣稱支援影像輸入時，影像探測會執行
  - 流程（高階）：
    - 測試會產生一個帶有 "CAT" + 隨機程式碼的微小 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 傳送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 內嵌代理將多模態使用者訊息轉送給模型
    - 斷言：回覆包含 `cat` + 該程式碼 (OCR 容錯：允許微小的錯誤)

<Tip>
若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ids），請執行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live：CLI 後端冒煙測試（Claude、Gemini 或其他本機 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，而不影響您的預設配置。
- 特定後端的冒煙測試預設值位於所屬擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live`（或若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設供應商/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/影像行為來自所屬 CLI 後端外掛程式的中繼資料。
- 覆寫（可選）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以發送真實的圖片附件（路徑會被注入到提示中）。Docker 配方預設將此關閉，除非明確要求。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 引數傳遞，而不是透過提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制當設定 `IMAGE_ARG` 時如何傳遞圖片引數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 以選擇加入 Claude Sonnet -> Opus 同階段連續性探測，當選定的模型支援切換目標時。Docker 配方為了整體可靠性預設將此關閉。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 以選擇加入 MCP/工具回送探測。Docker 配方預設將此關閉，除非明確要求。

範例：

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

經濟實惠的 Gemini MCP 配置煙霧測試：

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

這不會要求 Gemini 產生回應。它會寫入與 OpenClaw 給 Gemini 相同的系統設定，然後執行 `gemini --debug mcp list` 以證明儲存的 `transport: "streamable-http"` 伺服器已正規化為 Gemini 的 HTTP MCP 形狀，並可連線到本機可串流 HTTP MCP 伺服器。

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

單一提供者 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在 repo Docker 映像檔中以非 root `node` 使用者身分執行即時 CLI 後端冒煙測試。
- 它會從所屬擴充功能解析 CLI 冒煙測試元資料，然後將匹配的 Linux CLI 套件（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過 `~/.claude/.credentials.json` 搭配 `claudeAiOauth.subscriptionType` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可攜式 Claude Code 訂閱 OAuth。它首先在 Docker 中驗證直接的 `claude -p`，然後執行兩輪 Gateway CLI 後端測試，而不保留 Anthropic API 金鑰環境變數。此訂閱通道預設會停用 Claude MCP/工具與圖像探測，因為 Claude 目前將第三方應用程式的使用路由計費為額外用量，而非一般訂閱方案上限。
- 即時 CLI 後端冒煙測試現在对 Claude 與 Gemini 執行相同的端對端流程：文字輪次、圖像分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設煙霧測試也會將工作階段從 Sonnet 修補為 Opus，並驗證恢復的工作階段仍記得先前的備註。

## Live：APNs HTTP/2 proxy 連線性

- 測試：`src/infra/push-apns-http2.live.test.ts`
- 目標：透過本機 HTTP CONNECT 通道連線至 Apple 的沙箱 APNs 端點，傳送 APNs HTTP/2 驗證請求，並斷言 Apple 的真實 `403 InvalidProviderToken` 回應透過通道路徑傳回。
- 啟用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- 選用逾時：
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用 live ACP agent 驗證真實的 ACP conversation-bind 流程：
  - 傳送 `/acp spawn <agent> --bind here`
  - 就地綁定一個合成 message-channel conversation
  - 在該同一個 conversation 上發送一個正常的後續訊息
  - 驗證後續訊息出現在已綁定的 ACP session 轉錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP 代理程式：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP 代理程式：`claude`
  - 合成通道：Slack DM 風格的 conversation context
  - ACP 後端：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.5`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.5`
- 備註：
  - 此通道使用具有僅限管理員的合成來源路由欄位的 gateway `chat.send` 介面，以便測試能附加訊息通道內容，而無需假裝對外傳遞。
  - 當 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未設定時，測試會使用內嵌 `acpx` 外掛程式中針對所選 ACP harness agent 的內建代理程式登錄檔。
  - 預設情況下，有界連線 cron MCP 建立是盡力而為為的，因為外部 ACP harness 可以在綁定/映像檔證明通過後取消 MCP 呼叫；請設定 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 以使該綁定後 cron 探測變為嚴格模式。

範例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 食譜：

```bash
pnpm test:docker:live-acp-bind
```

單一代理程式 Docker 食譜：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Docker 備註：

- Docker 執行器位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序對彙總即時 CLI agent 執行 ACP bind smoke：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 來縮小矩陣範圍。
- 它會將相符的 CLI 驗證資料暫存到容器中，然後在缺少時安裝要求的即時 CLI（`@anthropic-ai/claude-code`、`@openai/codex`、透過 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`）。ACP 後端本身來自官方 `acpx` 外掛程式的內嵌 `acpx/runtime` 套件。
- Droid Docker 變體會暫存 `~/.factory` 用於設定，轉發 `FACTORY_API_KEY`，並且需要該 API 金鑰，因為本機 Factory OAuth/鑰匙圈驗證無法移植到容器中。它使用 ACPX 內建的 `droid exec --output-format acp` 登錄項目。
- OpenCode Docker 變體是一個嚴格的單一 agent 回歸通道。它會從 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（預設 `opencode/kimi-k2.6`）寫入暫時性 `OPENCODE_CONFIG_CONTENT` 預設模型，並且 `pnpm test:docker:live-acp-bind:opencode` 需要有界助理的逐字稿，而不是接受通用的綁定後略過。
- 直接 `acpx` CLI 呼叫僅是在 Gateway 外部比較行為的手動/變通方法。Docker ACP bind smoke 會執行 OpenClaw 的內嵌 `acpx` 執行時後端。

## Live：Codex app-server harness smoke

- 目標：透過正常的閘道 `agent` 方法驗證外掛程式擁有的 Codex 組件：
  - 載入打包的 `codex` 外掛程式
  - 選取 `openai/gpt-5.5`，此選項預設會透過 Codex 路由 OpenAI agent 輪次
  - 在選取 Codex 組件的情況下，發送第一個閘道 agent 輪次至 `openai/gpt-5.5`
  - 傳送第二個回合到同一個 OpenClaw 作業階段，並驗證 app-server
    執行緒可以恢復
  - 透過相同的閘道指令路徑執行 `/codex status` 和 `/codex models`
  - （選用）執行兩個經 Guardian 審查的升級 shell 探測：一個應獲批准的
    良性指令，和一個應被拒絕的偽造機密上傳，以便代理程式會回應詢問
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`openai/gpt-5.5`
- 選用影像探查：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用 MCP/工具探查：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 選用 Guardian 探查：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 冒煙測試會強制使用供應商/模型 `agentRuntime.id: "codex"`，因此有問題的 Codex 組件無法透過靜默回退至 PI 來通過測試。
- 驗證：來自本機 Codex 訂閱登入的 Codex app-server 驗證。Docker 冒煙測試也可在適用時為非 Codex 探查提供 `OPENAI_API_KEY`，外加選用的複製 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

Local recipe：

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker recipe：

```bash
pnpm test:docker:live-codex-harness
```

Docker 說明：

- Docker 執行程式位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會傳遞 `OPENAI_API_KEY`，在存在時複製 Codex CLI 驗證檔案，將 `@openai/codex` 安裝至可寫入的已掛載 npm 前綴，暫存原始碼樹，然後僅執行 Codex 組件即時測試。
- Docker 預設會啟用影像、MCP/工具 和 Guardian 探查。當您需要更狹窄的偵錯執行時，請設定 `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或 `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的明確 Codex 執行時期配置，因此 legacy aliases 或 PI
  fallback 無法掩蓋 Codex harness 的回歸。

### 推薦的 live recipes

狹窄、明確的 allowlists 最快且最不穩定：

- 單一模型，直接（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重點（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google adaptive thinking smoke：
  - Gemini 3 動態預設：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 動態預算：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的 agent 端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（單獨的驗證 + 工具特性）。
- Gemini API 與 Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / profile 驗證）；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能有所不同（串流/工具支援/版本偏差）。

## Live: 模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型清單」（live 測試為選用），但這些是在擁有金鑰的開發機器上定期涵蓋的**推薦**模型。

### 現代化測試集（工具呼叫 + 圖片）

這是我們預期能持續運作的「通用模型」執行項目：

- OpenAI (非 Codex)：`openai/gpt-5.5`
- OpenAI Codex OAuth：`openai-codex/gpt-5.5`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免舊版 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek：`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M2.7`

執行包含工具與圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 可選執行）

每個提供商系列至少選擇一個：

- OpenAI：`openai/gpt-5.5`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- DeepSeek：`deepseek/deepseek-v4-flash`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M2.7`

可選的額外涵蓋範圍（最好有）：

- xAI：`xai/grok-4.3`（或最新可用版本）
- Mistral：`mistral/`…（選擇一個您已啟用的「工具」支援模型）
- Cerebras：`cerebras/`…（如果您有存取權）
- LM Studio：`lmstudio/`…（本機；工具呼叫取決於 API 模式）

### 視覺：圖片發送（附件 → 多模態訊息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺功能的變體等），以測試圖片探測功能。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...`（數百種模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選）
- OpenCode：`opencode/...` 用於 Zen，而 `opencode-go/...` 用於 Go（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

更多您可以包含在即時矩陣中的提供者（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），以及任何 OpenAI/Anthropic 相容的代理（LM Studio、vLLM、LiteLLM 等）

<Tip>請不要在文件中硬編碼「所有模型」。權威清單取決於 `discoverModels(...)` 在您的機器上傳回的內容，加上可用的金鑰。</Tip>

## 憑證（切勿提交）

即時測試會以與 CLI 相同的方式探索憑證。實際影響如下：

- 如果 CLI 運作正常，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」（無憑證），請像除錯 `openclaw models list` / 模型選擇一樣進行除錯。

- 每個代理程式的驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（這就是即時測試中「profile keys」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 舊版狀態目錄：`~/.openclaw/credentials/`（如果存在，會複製到暫存的即時主目錄中，但不是主要的設定檔金鑰儲存區）
- Live 本地執行會預設將現用設定、每個代理程式的 `auth-profiles.json` 檔案、舊版 `credentials/` 和支援的外部 CLI 認證目錄複製到臨時測試主目錄；staged live homes 會跳過 `workspace/` 和 `sandboxes/`，並且會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以確保探測不會接觸您真實的主機工作區。

如果您想依賴環境金鑰，請在本地測試前匯出它們，或使用下列帶有明確 `OPENCLAW_PROFILE_FILE` 的 Docker 執行器。

## Deepgram live (音訊轉錄)

- 測試：`extensions/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`extensions/byteplus/live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 選用的模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流程媒體 live

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 測試內建的 comfy 圖片、影片和 `music_generate` 路徑
  - 除非已設定 `plugins.entries.comfy.config.<capability>`，否則會跳過各項功能
  - 在變更 comfy 工作流程提交、輪詢、下載或外掛程式註冊後非常有用

## 圖像生成 live

- 測試：`test/image-generation.runtime.live.test.ts`
- 指令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- Harness：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖像生成供應商外掛程式
  - 在探測之前使用已匯出的供應商環境變數
  - 預設會優先使用 live/env API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 透過共享的圖像生成執行時環境執行每個已設定的供應商：
    - `<provider>:generate`
    - 當供應商宣告支援編輯時 `<provider>:edit`
- 目前涵蓋的內建供應商：
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用於強制 profile-store 驗證並忽略僅環境變數的覆寫

對於發布的 CLI 路徑，在提供者/執行時即時測試通過後，新增一個 `infer` 煙霧測試：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

這涵蓋了 CLI 參數解析、配置/預設代理程式解析、捆綁外掛程式啟用、共用映像生成執行時，以及即時提供者請求。外掛程式相依性預期在執行時載入前已存在。

## 音樂生成即時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 執行共用捆綁音樂生成提供者路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測前使用已匯出的提供者環境變數
  - 預設情況下優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 Shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 可用時執行兩種宣告的執行時模式：
    - `generate` 搭配僅提示詞輸入
    - 當提供者宣告 `capabilities.edit.enabled` 時執行 `edit`
  - 目前的共用通道覆蓋率：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：獨立的 Comfy 即時檔案，而非此共用掃描
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用於強制 profile-store 驗證並忽略僅環境變數的覆寫

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media video`
- 範圍：
  - 執行共用捆綁影片生成提供者路徑
  - 預設為釋出安全的冒煙路徑：非 FAL 提供者，每個提供者一個文字轉影片請求，一秒鐘的龍蝦提示，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每提供者操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為提供者端佇列延遲可能會主導釋出時間；傳遞 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在探測之前使用已匯出的提供者環境變數
  - 預設優先使用 live/env API 金鑰而非儲存的設定檔，因此 `auth-profiles.json` 中過時的測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用 auth/profile/model 的提供者
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時同時執行宣告的轉換模式：
    - 當提供者宣告 `capabilities.imageToVideo.enabled` 且選定的提供者/模型接受緩衝區支援的本地圖像輸入時，執行 `imageToVideo`
    - 當提供者宣告 `capabilities.videoToVideo.enabled` 且選定的提供者/模型接受緩衝區支援的本地影片輸入時，執行 `videoToVideo`
  - 目前共用掃描中已宣告但跳過的 `imageToVideo` 提供者：
    - `vydra` 因為內建的 `veo3` 僅支援文字，且內建的 `kling` 需要遠端圖像 URL
  - 特定提供者的 Vydra 覆蓋率：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案預設會執行 `veo3` 文字轉影片，加上使用遠端圖像 URL fixture 的 `kling` 通道
  - 目前的 `videoToVideo` 即時覆蓋率：
    - 僅當選定的模型為 `runway/gen4_aleph` 時，執行 `runway`
  - 目前共用掃描中已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai` 因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前共用的 Gemini/Veo 通道使用本機緩衝支援輸入，且該路徑在共用掃描中不被接受
    - `openai`，因為目前共用的通道缺乏組織特定的視訊重繪/混音存取保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在預設掃描中包含每個提供者，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個提供者的操作上限，進行積極的冒煙測試
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制設定檔存放區驗證並忽略僅限環境的覆寫

## 媒體即時線束

- 指令：`pnpm test:live:media`
- 用途：
  - 透過一個倉儲原生進入點執行共用的圖片、音樂和視訊即時測試套件
  - 使用已匯出的提供者環境變數
  - 根據預設，自動將每個測試套件縮小至目前具有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相關

- [測試](/zh-Hant/help/testing) - 單元、整合、QA 和 Docker 測試套件
