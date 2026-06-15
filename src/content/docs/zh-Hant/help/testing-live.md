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
[測試](/zh-Hant/help/testing)。本頁涵蓋 **live**（接觸網路）測試
套件：模型矩陣、CLI 後端、ACP 和媒體供應商即時測試，以及
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
- 設定 `OPENCLAW_LIVE_MODELS=modern`、`small` 或 `all`（modern 的別名）以實際執行此套件；否則會跳過以保持 `pnpm test:live` 專注於 gateway smoke
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單 (Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M3、Grok 4.3)
  - `OPENCLAW_LIVE_MODELS=small` 以執行受限的小型模型允許清單 (Qwen 8B/9B 本地相容路由、Ollama Gemma、OpenRouter Qwen/GLM 以及 Z.AI GLM)
  - `OPENCLAW_LIVE_MODELS=all` 是新版允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,..."`（逗號允許清單）
  - 本地 Ollama 小型模型執行預設為 `http://127.0.0.1:11434`；僅針對 LAN、自訂或 Ollama Cloud 端點設定 `OPENCLAW_LIVE_OLLAMA_BASE_URL`。
  - 現代/全部 和小型掃描預設為其策劃的上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行窮盡的已選設定檔掃描，或設定正數以使用較小的上限。
  - 窮盡掃描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作為整個直接模型測試的逾時時間。預設值：60 分鐘。
  - 直接模型探測預設以 20 路並行執行；設定 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 以覆寫。
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (逗號分隔允許清單)
- 金鑰來源：
  - 預設：設定檔儲存和環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **設定檔儲存**
- 為何存在此機制：
  - 區隔「供應商 API 故障 / 金鑰無效」與「閘道代理管線故障」
  - 包含小型、獨立的回歸測試 (例如：OpenAI Responses/Codex Responses 推理重放 + 工具呼叫流程)

### 第 2 層：閘道 + 開發代理煙霧測試 (即 "@openclaw" 實際執行的操作)

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內閘道
  - 建立/修補 `agent:dev:*` 工作階段 (每次執行的模型覆寫)
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義」的回應 (無工具)
    - 真實的工具呼叫運作正常 (讀取探測)
    - 選用的額外工具探測 (exec+read 探測)
    - OpenAI 回歸路徑 (僅工具呼叫 → 後續追蹤) 保持運作正常
- 探測詳細資訊 (以便您快速解釋失敗原因)：
  - `read` probe: the test writes a nonce file in the workspace and asks the agent to `read` it and echo the nonce back.
  - `exec+read` probe: the test asks the agent to `exec`-write a nonce into a temp file, then `read` it back.
  - image probe: the test attaches a generated PNG (cat + randomized code) and expects the model to return `cat <CODE>`.
  - Implementation reference: `src/gateway/gateway-models.profiles.live.test.ts` and `test/helpers/live-image-probe.ts`.
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- How to select models:
  - Default: modern allowlist (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M3, Grok 4.3)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` is an alias for the modern allowlist
  - Or set `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (or comma list) to narrow
  - Modern/all gateway sweeps default to a curated high-signal cap; set `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` for an exhaustive modern sweep or a positive number for a smaller cap.
- How to select providers (avoid "OpenRouter everything"):
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (comma allowlist)
- Tool + image probes are always on in this live test:
  - `read` probe + `exec+read` probe (tool stress)
  - image probe runs when the model advertises image input support
  - Flow (high level):
    - Test generates a tiny PNG with "CAT" + random code (`test/helpers/live-image-probe.ts`)
    - Sends it via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway parses attachments into `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent forwards a multimodal user message to the model
    - Assertion: reply contains `cat` + the code (OCR tolerance: minor mistakes allowed)

<Tip>
To see what you can test on your machine (and the exact `provider/model` ids), run:

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live: CLI backend smoke (Claude, Gemini, or other local CLIs)

- Test: `src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，而不影響您的預設配置。
- 特定後端的測試預設值位於擁有該後端的擴充功能的 `cli-backend.ts` 定義中。
- 啟用方式：
  - `pnpm test:live`（若直接呼叫 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設提供者/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/映像檔行為來自擁有的 CLI 後端外掛程式中繼資料。
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的圖片附件（路徑會被注入提示詞中）。Docker 指令稿預設會將此功能關閉，除非明確要求。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而非透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制當設定 `IMAGE_ARG` 時如何傳遞圖片參數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 以在選取的模型支援切換目標時，選擇加入 Claude Sonnet -> Opus 同階段連續性探測。Docker 指令稿預設會將此功能關閉，以確保整體可靠性。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 以選擇加入 MCP/tool 迴路探測。Docker 指令稿預設會將此功能關閉，除非明確要求。

範例：

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

低成本的 Gemini MCP 配置測試：

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

此步驟不會要求 Gemini 產生回應。它會寫入 OpenClaw 提供給 Gemini 的相同系統設定，然後執行 `gemini --debug mcp list` 以證明已儲存的 `transport: "streamable-http"` 伺服器已正規化為 Gemini 的 HTTP MCP 形式，並能連線至本機可串流的 HTTP MCP 伺服器。

Docker 指令稿：

```bash
pnpm test:docker:live-cli-backend
```

單一提供者 Docker 指令稿：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在 repo Docker 映像檔中以非 root 使用者 `node` 的身分執行即時 CLI 後端測試。
- 它從擁有者擴充功能解析 CLI 煙霧測試元數據，然後將匹配的 Linux CLI 套件（`@anthropic-ai/claude-code` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過搭配 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json`，或是來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可攜式 Claude Code 訂閱 OAuth 驗證。它首先在 Docker 中證明直接的 `claude -p`，然後執行兩次 Gateway CLI 後端輪次，且不保留 Anthropic API 金鑰環境變數。此訂閱通道預設會停用 Claude MCP/工具和映像探測，因為 Claude 目前將第三方應用程式的使用路由至額外用量計費，而非一般的訂閱方案限制。
- 即時 CLI 後端煙霧測試現在同樣執行 Claude 和 Gemini 的相同端到端流程：文字輪次、映像分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設煙霧測試也會將工作階段從 Sonnet 修補為 Opus，並驗證恢復的工作階段仍記得先前的註記。

## 即時：APNs HTTP/2 代理連線能力

- 測試：`src/infra/push-apns-http2.live.test.ts`
- 目標：透過本機 HTTP CONNECT 代理通道傳輸至 Apple 的沙箱 APNs 端點，傳送 APNs HTTP/2 驗證請求，並斷言來自 Apple 的真實 `403 InvalidProviderToken` 回應會透過代理路徑傳回。
- 啟用：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- 選用逾時：
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## 即時：ACP 繫結煙霧測試 (`/acp spawn ... --bind here`)

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用即時 ACP 代理程式驗證真實的 ACP 對話繫結流程：
  - 傳送 `/acp spawn <agent> --bind here`
  - 繫結合成的訊息通道對話
  - 在同一個對話上傳送正常的後續訊息
  - 驗證後續訊息已抵達繫結的 ACP 工作階段紀錄
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP 代理程式：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP 代理程式：`claude`
  - 合成頻道：類似 Slack 私訊的對話上下文
  - ACP 後端：`acpx`
- 覆寫設定：
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
  - 此通道使用具管理員專用合成來源路由欄位的閘道 `chat.send` 介面，以便測試能附加訊息頻道上下文，而無需假裝要從外部傳遞。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式內建的代理程式註冊表來供選定的 ACP 鞍具代理程式使用。
  - 繫結階段 cron MCP 建立預設為盡力而為，因為外部 ACP 鞍具可以在通過繫結/映像檔證明後取消 MCP 呼叫；請設定 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 以讓繫結後 cron 探測變成嚴格模式。

範例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-acp-bind
```

單一代理程式 Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Docker 備註：

- Docker 執行器位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序針對聚合即時 CLI 代理程式執行 ACP 繫結冒煙測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 來縮小範圍。
- 它會將相符的 CLI 驗證資料暫存到容器中，然後在缺少時安裝所要求的即時 CLI (`@anthropic-ai/claude-code`、`@openai/codex`、透過 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`)。ACP 後端本身則是來自官方 `acpx` 外掛程式的內嵌 `acpx/runtime` 套件。
- Droid Docker 變體為設定預備 `~/.factory`，轉發 `FACTORY_API_KEY`，並且需要該 API 金鑰，因為本機 Factory OAuth/金鑰圈驗證無法移植到容器中。它使用 ACPX 內建的 `droid exec --output-format acp` 註冊表項目。
- OpenCode Docker 變體是一個嚴格的單代理回歸通道。它會從 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL` 寫入一個臨時的 `OPENCODE_CONFIG_CONTENT` 預設模型（預設為 `opencode/kimi-k2.6`），並且 `pnpm test:docker:live-acp-bind:opencode` 需要一個已綁定的助手對話紀錄，而不是接受綁定後通用的跳過行為。
- 直接 `acpx` CLI 呼叫只是一種用於在 Gateway 外部比較行為的手動/變通方法。Docker ACP bind smoke 會測試 OpenClaw 內建的 `acpx` 執行後端。

## Live: Codex app-server harness smoke

- 目標：透過標準的 gateway `agent` 方法驗證外掛擁有的 Codex 測試工具：
  - 載入打包的 `codex` 外掛
  - 選擇 `openai/gpt-5.5`，預設會透過 Codex 路由 OpenAI 代理回合
  - 發送第一個 gateway 代理回合到 `openai/gpt-5.5`，並選擇 Codex 測試工具
  - 發送第二個回合到同一個 OpenClaw 工作階段，並驗證 app-server 執行緒可以恢復
  - 透過相同的 gateway 指令路徑執行 `/codex status` 和 `/codex models`
  - 選擇性地執行兩個 Guardian 審查的升級 shell 探測：一個應該被批准的良性指令，以及一個應該被拒絕的偽造密鑰上傳，以便代理反過來詢問
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`openai/gpt-5.5`
- 選用圖片探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用 MCP/工具探測：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 選用 Guardian 探測：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 此 smoke 會強制設定供應商/模型 `agentRuntime.id: "codex"`，因此損壞的 Codex 測試工具無法透過靜默回退到 OpenClaw 來通過測試。
- Auth：來自本機 Codex 訂閱登入的 Codex app-server auth。Docker
  smokes 也可以在適用時為非 Codex 探測提供 `OPENAI_API_KEY`，
  以及可選的複製 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

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
- 它會傳遞 `OPENAI_API_KEY`，在存在時複製 Codex CLI auth 檔案，將
  `@openai/codex` 安裝到可寫入的已掛載 npm
  前綴，暫存原始碼樹，然後僅執行 Codex-harness 即時測試。
- Docker 預設會啟用 image、MCP/tool 和 Guardian 探測。當您需要較狹窄的偵錯
  執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 使用相同的明確 Codex 執行時期設定，因此舊版別名或 OpenClaw
  後備機制無法隱藏 Codex harness 回歸。

### 建議的即時指令

狹窄、明確的允許清單是最快且最不穩定的：

- 單一模型，直接（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- 小型模型直接設定檔：
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- Ollama Cloud API smoke：
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- 單一模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的 tool calling：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 專注（Gemini API key + Antigravity）：
  - Gemini (API key)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google adaptive thinking smoke：
  - Gemini 3 dynamic default：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 dynamic budget：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

說明：

- `google/...` 使用 Gemini API (API key)。
- `google-antigravity/...` 使用 Antigravity OAuth bridge (Cloud Code Assist-style agent endpoint)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (個別的 auth + tooling quirks)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 經由 HTTP 呼叫 Google 託管的 Gemini API (API key / profile auth)；這就是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 會調用本地的 `gemini` 二進位檔案；它有自己的認證方式，且行為可能有所不同（串流/工具支援/版本差異）。

## Live：模型矩陣（涵蓋範圍）

沒有固定的「CI 模型列表」（live 測試為選用），但這些是建議在具備金鑰的開發機上定期涵蓋的模型。

### Modern smoke set（工具呼叫 + 圖片）

這是我們預期能持續運作的「通用模型」執行組：

- OpenAI (non-Codex)：`openai/gpt-5.5`
- OpenAI ChatGPT/Codex OAuth：`openai/gpt-5.5`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用較舊的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek：`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M3`

執行包含工具與圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M3" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Baseline：工具呼叫（Read + 選用 Exec）

每個提供商系列至少選擇一個：

- OpenAI：`openai/gpt-5.5`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- DeepSeek：`deepseek/deepseek-v4-flash`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M3`

選用的額外涵蓋範圍（最好有）：

- xAI：`xai/grok-4.3`（或最新可用版本）
- Mistral：`mistral/`…（選擇一個您已啟用的具備「工具」能力的模型）
- Cerebras：`cerebras/`…（如果您有權限存取）
- LM Studio：`lmstudio/`…（本機；工具呼叫取決於 API 模式）

### Vision：圖片傳送（附件 → 多模態訊息）

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試圖片探測功能。

### 聚合器 / 替代 gateway

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...`（數百種模型；使用 `openclaw models scan` 尋找支援工具與影像的候選）
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

您可以包含在即時矩陣中的更多供應商（如果您有憑證/設定）：

- 內建：`openai`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），以及任何相容 OpenAI/Anthropic 的 Proxy（LM Studio、vLLM、LiteLLM 等）

<Tip>請勿在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上回傳的任何內容，再加上可用的金鑰。</Tip>

## 憑證（絕不提交）

即時測試會以與 CLI 相同的方式探索憑證。實際含義：

- 如果 CLI 可以運作，即時測試應該會找到相同的金鑰。
- 如果即時測試顯示「無憑證」，請使用與除錯 `openclaw models list` / 模型選擇相同的方式進行除錯。

- 各代理驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（這就是即時測試中「設定檔金鑰」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 舊版狀態目錄：`~/.openclaw/credentials/`（存在時會複製到暫存的即時主目錄，但不是主要的設定檔金鑰儲存）
- 即時本機執行預設會將現用設定、各代理程式的 `auth-profiles.json` 檔案、傳統 `credentials/`，以及支援的外部 CLI 認證目錄複製到暫存測試主目錄中；暫存的即時主目錄會跳過 `workspace/` 和 `sandboxes/`，並會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以便探測作業不會接觸您的真實主機工作區。

如果您希望依賴環境金鑰，請在進行本機測試前匯出它們，或是使用下方具有明確 `OPENCLAW_PROFILE_FILE` 的 Docker 執行器。

## Deepgram 即時（音訊轉錄）

- 測試：`extensions/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 編碼計劃即時

- 測試：`extensions/byteplus/live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流程媒體即時

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 執行內建的 comfy 圖片、影片和 `music_generate` 路徑
  - 除非已設定 `plugins.entries.comfy.config.<capability>`，否則跳過每個功能
  - 在變更 comfy workflow 提交、輪詢、下載或外掛程式註冊後很有用

## 圖片生成即時測試

- 測試：`test/image-generation.runtime.live.test.ts`
- 指令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- Harness：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖片生成供應商外掛程式
  - 在探測前使用已匯出的供應商環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的供應商
  - 透過共享的映像生成執行階段執行每個已設定的提供者：
    - `<provider>:generate`
    - 當提供者宣告支援編輯時 `<provider>:edit`
- 目前涵蓋的內建提供者：
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
- 可選的認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用 profile-store 認證並忽略僅環境變數的覆蓋

對於已發佈的 CLI 路徑，在供應商/運行時即時測試通過後，新增 `infer` 冒煙測試：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

這涵蓋了 CLI 引數解析、config/default-agent 解析、捆綁外掛程式啟用、共享的影像生成運行時，以及即時供應商請求。外掛程式相依性預期在運行時載入之前就已存在。

## 音樂生成即時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 測試共享的捆綁音樂生成供應商路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前使用已匯出的供應商環境變數
  - 預設情況下優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 當可用時執行兩種宣告的運行時模式：
    - `generate` 使用僅提示詞輸入
    - 當供應商宣告 `capabilities.edit.enabled` 時使用 `edit`
  - 目前的共享通道覆蓋率：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：個別的 Comfy 即時檔案，而非此共享掃描
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可選的認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用 profile-store 認證並忽略僅環境變數的覆蓋

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media video`
- 範圍：
  - 測試共享的捆綁影片生成供應商路徑
  - 預設為發布安全的冒煙測試路徑：非 FAL 提供者、每個提供者一個文字轉視訊要求、一秒鐘的龙虾提示，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供者操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為提供者端的佇列延遲可能會主導發布時間；請傳入 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在探測之前使用已匯出的提供者環境變數
  - 預設優先使用即時/環境 API 金鑰，而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時同時執行宣告的轉換模式：
    - 當提供者宣告 `capabilities.imageToVideo.enabled` 且選定的提供者/模型在共同掃描中接受 buffer 支援的本地圖片輸入時，執行 `imageToVideo`
    - `videoToVideo` 當供應商聲明 `capabilities.videoToVideo.enabled` 且選定的供應商/模型在共享掃描中接受緩衝區支援的本機影片輸入時
  - 目前共享掃描中已聲明但跳過的 `imageToVideo` 供應商：
    - `vydra` 因為內建的 `veo3` 僅支援文字，且內建的 `kling` 需要遠端圖片 URL
  - 供應商特定的 Vydra 覆蓋率：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案執行 `veo3` 文字生成影片，加上一個預設使用遠端圖片 URL fixture 的 `kling` 通道
  - 目前 `videoToVideo` 即時覆蓋率：
    - `runway` 僅在選定的模型為 `runway/gen4_aleph` 時
  - 共用掃描中目前已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為那些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google` 因為目前共用的 Gemini/Veo 通道使用本機緩衝區支援的輸入，且該路徑在共用掃描中不被接受
    - `openai` 因為目前共用的通道缺乏組織特定的影片編輯存取權限保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在預設掃描中包含每個提供者，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以減少每個提供者的作業上限，進行積極的冒煙測試
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制設定檔儲存驗證並忽略僅環境變數的覆寫

## 媒體即時測試套件

- 指令：`pnpm test:live:media`
- 目的：
  - 透過一個儲存庫原生進入點執行共用的圖片、音樂和影片即時測試套件
  - 使用已匯出的提供者環境變數
  - 預設會自動將每個套件縮小範圍至目前具有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和安靜模式行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相關

- [測試](/zh-Hant/help/testing) - 單元、整合、QA 和 Docker 測試套件
