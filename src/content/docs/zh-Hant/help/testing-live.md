---
summary: "即時（網路連線）測試：模型矩陣、CLI 後端、ACP、媒體供應商、憑證"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "測試：即時套件"
sidebarTitle: "即時測試"
---

若要快速入門、查看 QA 執行器、單元/整合套件以及 Docker 流程，請參閱
[測試](/zh-Hant/help/testing)。本頁涵蓋 **即時**（接觸網路）測試
套件：模型矩陣、CLI 後端、ACP 和媒體供應商即時測試，以及
憑證處理。

## 即時：本機設定檔冒煙指令

在進行臨時即時檢查之前，請先 Source `~/.profile`，以便提供者金鑰和本機工具
路徑與您的 shell 相符：

```bash
source ~/.profile
```

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

除非同時存在 `--yes`，否則 `voicecall smoke` 只是試運行。請僅在您
有意發出真實通知呼叫時使用 `--yes`。對於 Twilio、Telnyx 和
Plivo，成功的就緒檢查需要公開的 webhook URL；僅限本機的
迴路/私人備選方案依設計會被拒絕。

## 即時：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫連線的 Android 節點目前廣告的**每個指令**，並斷言指令合約行為。
- 範圍：
  - 前置條件/手動設定（該套件不會安裝/執行/配對應用程式）。
  - 針對所選 Android 節點進行逐指令的 gateway `node.invoke` 驗證。
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

- 「直接模型」告訴我們提供者/模型是否能使用給定的金鑰進行回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線對該模型是否正常運作（sessions、history、tools、sandbox policy 等）。

### Layer 1：Direct model completion（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉已探索的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一次小型完成（並在需要時執行目標迴歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此套件；否則會跳過以保持 `pnpm test:live` 專注於 gateway smoke
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行 modern allowlist（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern allowlist 的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗號分隔 allowlist）
  - Modern/all 掃描預設為精心挑選的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行完整的 modern 掃描，或設定正數以使用較小的上限。
  - 完整掃描使用 `OPENCLAW_LIVE_TEST_TIMEOUT_MS` 作為整個 direct-model 測試逾時。預設值：60 分鐘。
  - Direct-model 探測預設以 20 路並行執行；設定 `OPENCLAW_LIVE_MODEL_CONCURRENCY` 以覆寫。
- 如何選擇提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔 allowlist）
- 金鑰來源：
  - 預設：profile store 和 env 備援
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 為何存在：
  - 區分「provider API 損壞 / 金鑰無效」與「gateway agent 管線損壞」
  - 包含小型、獨立的迴歸測試（例如：OpenAI Responses/Codex Responses reasoning 重播 + tool-call 流程）

### Layer 2：Gateway + dev agent smoke（"@openclaw" 實際上做的事情）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆寫）
  - 對帶有金鑰的模型進行迭代並斷言：
    - 「有意義的」回應（無工具）
    - 真實工具呼叫運作正常（read probe）
    - 選用的額外工具探測（exec+read probe）
    - OpenAI 迴歸路徑（僅工具呼叫 → 後續）持續正常運作
- 探測細節（以便您快速解釋失敗原因）：
  - `read` 探測：測試會在工作區寫入一個 nonce 檔案，並要求代理 `read` 該檔案並將 nonce 回傳。
  - `exec+read` 探測：測試會要求代理 `exec`-寫入一個 nonce 到暫存檔案，然後將其 `read` 回來。
  - 影像探測：測試會附加一個生成的 PNG（貓 + 隨機代碼）並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單（Opus/Sonnet 4.6+、GPT-5.2 + Codex、Gemini 3、DeepSeek V4、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）來縮小範圍
  - 現代/全部閘道掃描預設為精選的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的現代掃描，或設定正數以使用較小的上限。
- 如何選擇提供者（避免「OpenRouter 全部」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔的允許清單）
- 在此即時測試中，工具與影像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援影像輸入時，影像探測會執行
  - 流程（高階）：
    - 測試會生成一個帶有「CAT」+ 隨機代碼的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - 閘道將附件解析為 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 內嵌代理將多模態使用者訊息轉送給模型
    - 斷言：回覆包含 `cat` + 該代碼（OCR 容差：允許小錯誤）

<Tip>
若要查看您在機器上可以測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live: CLI 後端煙霧測試（Claude、Codex、Gemini 或其他本機 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，而不影響您的預設配置。
- 特定於後端的煙霧測試預設值位於所屬擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live` （如果直接呼叫 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設提供者/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/影像行為來自所屬 CLI 後端外掛程式的中繼資料。
- 覆寫（可選）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的影像附件（路徑會被注入到提示詞中）。除非明確要求，否則 Docker 配方預設將此關閉。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將影像檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以在設定 `IMAGE_ARG` 時控制影像參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` 以選擇加入 Claude Sonnet -> Opus 同階段連續性探測，當選定的模型支援切換目標時。為了整體可靠性，Docker 配方預設將此關閉。
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` 以選擇加入 MCP/工具回環探測。除非明確要求，否則 Docker 配方預設將此關閉。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.2" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

經濟實惠的 Gemini MCP 配置煙霧測試：

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

這不會要求 Gemini 產生回應。它會寫入 OpenClaw 提供給 Gemini 的相同系統
設定，然後執行 `gemini --debug mcp list` 以證明已儲存的
`transport: "streamable-http"` 伺服器被正規化為 Gemini 的 HTTP MCP
形狀，並能連線到本機可串流的 HTTP MCP 伺服器。

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

單一提供者 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在儲存庫 Docker 映像檔中作為非 root 使用者 `node` 執行即時 CLI 後端煙霧測試。
- 它會從所屬擴充功能解析 CLI 煙霧測試元數據，然後將匹配的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的可寫入快取前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過帶有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可攜式 Claude Code 訂閱 OAuth。它首先在 Docker 中證明直接的 `claude -p`，然後執行兩次 Gateway CLI 後端輪次，而不保留 Anthropic API 金鑰環境變數。此訂閱通道預設會停用 Claude MCP/工具和圖像探測，因為 Claude 目前將第三方應用程式使用量路由至額外使用量計費，而非一般的訂閱方案限制。
- 即時 CLI 後端煙霧測試現今會對 Claude、Codex 和 Gemini 執行相同的端對端流程：文字輪次、圖像分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設煙霧測試也會將工作階段從 Sonnet 修補為 Opus，並驗證恢復的工作階段仍記得先前的備註。

## 即時：ACP 繫結煙霧測試（`/acp spawn ... --bind here`）

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用即時 ACP 代理程式驗證真實的 ACP 對話繫結流程：
  - 傳送 `/acp spawn <agent> --bind here`
  - 就地把一個合成訊息通道對話繫結到位
  - 在該同一對話上傳送正常的後續訊息
  - 驗證後續訊息已抵達繫結的 ACP 工作階段文字紀錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP 代理程式：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP 代理程式：`claude`
  - 合成通道：Slack DM 風格的對話上下文
  - ACP 後端：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.2`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.2`
- 備註：
  - 此通道使用具有僅限管理員的合成來源路由欄位的閘道 `chat.send` 介面，以便測試可以在不偽裝外部傳遞的情況下附加訊息通道上下文。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會針對所選的 ACP 指引代理程式，使用內嵌的 `acpx` 外掛程式內建代理程式註冊表。
  - 繫結會話 cron MCP 建立預設為盡力而為，因為外部 ACP 指引可以在繫結/映像檔證明通過後取消 MCP 呼叫；請設定 `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` 以將該繫結後 cron 探測設為嚴格模式。

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
- 預設情況下，它會依序對彙總即時 CLI 代理程式執行 ACP 繫結冒煙測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` 來縮小矩陣範圍。
- 它會來源 `~/.profile`，將相符的 CLI 驗證資料暫存到容器中，然後安裝要求的即時 CLI（`@anthropic-ai/claude-code`、`@openai/codex`、透過 `https://app.factory.ai/cli` 的 Factory Droid、`@google/gemini-cli` 或 `opencode-ai`）（如果缺少的話）。ACP 後端本身是來自 `acpx` 外掛程式的內建嵌入式 `acpx/runtime` 套件。
- Droid Docker 變體會暫存 `~/.factory` 用於設定，轉送 `FACTORY_API_KEY`，並且需要該 API 金鑰，因為本機 Factory OAuth/鑰匙圈驗證無法移植到容器中。它使用 ACPX 內建的 `droid exec --output-format acp` 註冊表項目。
- OpenCode Docker 版本是一個嚴格的單代理回歸通道。在獲取 `~/.profile` 後，它會從 `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL`（預設 `opencode/kimi-k2.6`）寫入一個臨時的 `OPENCODE_CONFIG_CONTENT` 預設模型，並且 `pnpm test:docker:live-acp-bind:opencode` 需要一個綁定的助理轉錄，而不是接受通用的綁定後跳過。
- 直接 `acpx` CLI 調用僅用於在 Gateway 外部比較行為的手動/變通方法。Docker ACP bind 測試會執行 OpenClaw 內嵌的 `acpx` 運行時後端。

## Live: Codex app-server harness smoke

- 目標：通過正常的 gateway
  `agent` 方法驗證外掛擁有的 Codex harness：
  - 加載捆綁的 `codex` 外掛
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 在強制使用 Codex harness 的情況下，向 `openai/gpt-5.2` 發送第一個 gateway 代理輪次
  - 向同一個 OpenClaw 會話發送第二個輪次，並驗證 app-server
    線程可以恢復
  - 通過相同的 gateway 指令
    路徑運行 `/codex status` 和 `/codex models`
  - 可選地運行兩個 Guardian 審查的升級 shell 探測：一個應被批准的良性
    指令，和一個應被拒絕的偽機密上傳，以便代理詢問回饋
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`openai/gpt-5.2`
- 可選圖像探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可選 MCP/工具探測：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 可選 Guardian 探測：`OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- 該測試設定了 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法通過靜默回退到 PI 來通過測試。
- 身份驗證：來自本地 Codex 訂閱登錄的 Codex app-server 身份驗證。Docker
  測試還可以在適用時為非 Codex 探測提供 `OPENAI_API_KEY`，以及可選的複製 `~/.codex/auth.json` 和 `~/.codex/config.toml`。

本地配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.2 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker 說明：

- Docker 運行器位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會 source 掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，在有時複製 Codex CLI
  auth 檔案，將 `@openai/codex` 安裝到可寫入的掛載 npm
  前綴中，暫存原始碼樹，然後僅執行 Codex-harness 即時測試。
- Docker 預設會啟用映像檔、MCP/工具 和 Guardian 探測。當您需要進行
  更狹窄的除錯執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，與即時
  測試設定相符，以便遺留別名或 PI 偏退無法掩蓋 Codex harness
  的回歸問題。

### 推薦的即時配方

狹窄且明確的允許清單最快且最穩定：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重點 (Gemini API 金鑰 + Antigravity)：
  - Gemini (API 金鑰)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 自適應思考冒煙測試：
  - 如果本機金鑰位於 shell profile 中：`source ~/.profile`
  - Gemini 3 動態預設：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Gemini 2.5 動態預算：`pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的代理端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的驗證 + 工具怪癖)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / profile 驗證)；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能會有所不同 (串流/工具支援/版本偏差)。

## Live: 模型矩陣 (涵蓋範圍)

沒有固定的「CI 模型清單」(即時測試為選用)，但這些是建議在具有金鑰的開發機上定期涵蓋的模型。

### 現代冒煙測試集 (工具呼叫 + 映像檔)

這是我們期望持續運作的「常見模型」執行：

- OpenAI (非 Codex)：`openai/gpt-5.2`
- OpenAI Codex OAuth：`openai-codex/gpt-5.2`
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免舊版 Gemini 2.x 模型)
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- DeepSeek：`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M2.7`

執行包含工具 + 圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：tool calling (讀取 + 選用執行)

每個供應商系列至少選一個：

- OpenAI：`openai/gpt-5.2`
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google：`google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- DeepSeek：`deepseek/deepseek-v4-flash`
- Z.AI (GLM)：`zai/glm-5.1`
- MiniMax：`minimax/MiniMax-M2.7`

選用的額外覆蓋範圍 (最好有)：

- xAI：`xai/grok-4` (或最新可用版本)
- Mistral：`mistral/`… (選一個你已啟用的具備「工具」能力的模型)
- Cerebras：`cerebras/`… (如果你有權限)
- LM Studio：`lmstudio/`… (本機；tool calling 取決於 API 模式)

### Vision：圖片發送 (附件 → 多模態訊息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型 (Claude/Gemini/OpenAI 支援 vision 的變體等)，以測試圖片探測。

### 彙總器 / 替代 gateway

如果你有啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具+圖片的候選者)
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多可以包含在 live matrix 中的供應商 (如果你有憑證/設定)：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio、vLLM、LiteLLM 等)

<Tip>不要在文件中硬碼「所有模型」。權威清單是指 `discoverModels(...)` 在您的機器上傳回的內容加上任何可用的金鑰。</Tip>

## 憑證 (切勿提交)

即時測試會使用與 CLI 相同的方式來尋找憑證。實際影響：

- 如果 CLI 能正常運作，即時測試應該也能找到相同的金鑰。
- 如果即時測試顯示「no creds」(無憑證)，請使用您偵錯 `openclaw models list` / 模型選擇的相同方式來進行偵錯。

- 各代理程式的驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (這即是即時測試中「profile keys」的含義)
- 設定：`~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 舊版狀態目錄：`~/.openclaw/credentials/` (如果存在，會複製到暫存的即時測試家目錄中，但不是主要的設定檔金鑰儲存庫)
- 即時本機執行預設會將現用設定、各代理程式的 `auth-profiles.json` 檔案、舊版 `credentials/` 以及支援的外部 CLI 驗證目錄複製到暫存測試家目錄；暫存的即時測試家目錄會略過 `workspace/` 和 `sandboxes/`，並且會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以便探測保持在您真實的主機工作區之外。

如果您想依賴環境變數金鑰 (例如在您的 `~/.profile` 中匯出)，請在 `source ~/.profile` 之後執行本機測試，或是使用下方的 Docker 執行器 (它們可以將 `~/.profile` 掛載至容器中)。

## Deepgram live (音訊轉錄)

- 測試：`extensions/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus 編碼計畫即時測試

- 測試：`extensions/byteplus/live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流程媒體即時測試

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 會測試隨附的 comfy 圖片、影片和 `music_generate` 路徑
  - 除非設定 `plugins.entries.comfy.config.<capability>`，否則會跳過每項功能
  - 在變更 comfy 工作流程提交、輪詢、下載或外掛程式註冊後很有用

## 圖片生成即時測試

- 測試：`test/image-generation.runtime.live.test.ts`
- 指令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 測試工具：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖片生成提供者外掛程式
  - 在探測前，從您的登入 shell (`~/.profile`) 載入遺失的提供者環境變數
  - 預設會優先使用即時/環境 API 金鑰，而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 透過共享的圖片生成執行階段執行每個已設定的提供者：
    - `<provider>:generate`
    - 當提供者宣告支援編輯時執行 `<provider>:edit`
- 目前涵蓋的隨附提供者：
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 選用縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 選用驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔存放區驗證並忽略僅環境變數的覆寫

對於隨附的 CLI 路徑，在提供者/執行階段即時測試通過後，加入一個 `infer` 測試：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

這涵蓋了 CLI 參數解析、設定/預設代理程式解析、捆綁外掛程式啟用、隨需捆綁執行時相依性修復、共享的影像生成執行時以及即時提供者請求。

## 即時音樂生成

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 驗證共享的捆綁音樂生成提供者路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前，從您的登入 shell 載入提供者環境變數 (`~/.profile`)
  - 預設情況下優先使用即時/環境 API 金鑰，而非已儲存的設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 當可用時，執行兩個宣告的執行時模式：
    - `generate` 僅搭配提示詞輸入
    - `edit` 當供應商宣告 `capabilities.edit.enabled` 時
  - 目前的共享通道覆蓋率：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 獨立的 Comfy 即時測試檔案，而非此共享掃描
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用 profile-store 驗證並忽略僅環境變數的覆蓋

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 工具：`pnpm test:live:media video`
- 範圍：
  - 執行共享的內建影片生成供應商路徑
  - 預設為發布安全的冒煙測試路徑：非 FAL 提供者、每個提供者一個文生視訊請求、一秒鐘的龙虾提示詞，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供者操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為提供者端佇列延遲可能會佔據發布時間；請傳遞 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在探測之前，從您的登入 Shell (`~/.profile`) 載入提供者環境變數
  - 預設優先使用即時/環境變數 API 金鑰而非已儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時同時執行已宣告的轉換模式：
    - 當提供者宣告 `capabilities.imageToVideo.enabled` 且選取的提供者/模型在共同掃描中接受緩衝區支援的本機圖片輸入時，`imageToVideo`
    - 當提供者宣告 `capabilities.videoToVideo.enabled` 且選取的提供者/模型在共同掃描中接受緩衝區支援的本機影片輸入時，`videoToVideo`
  - 共同掃描中目前已宣告但跳過的 `imageToVideo` 提供者：
    - `vydra`，因為隨附的 `veo3` 僅支援文字，且隨附的 `kling` 需要遠端圖片 URL
  - 提供者特定的 Vydra 涵蓋範圍：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案會執行 `veo3` 文字生成影片，以及一條預設使用遠端圖片 URL 樣本的 `kling` 通道
  - 目前 `videoToVideo` 即時涵蓋範圍：
    - 僅當選取的模型是 `runway/gen4_aleph` 時 `runway`
  - 共同掃描中目前已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前共同的 Gemini/Veo 通道使用本機緩衝區支援的輸入，且共同掃描不接受該路徑
    - `openai`，因為目前的共同通道缺乏特定組織的影片修補/重混存取權限保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含預設掃描中的每個提供者，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個提供者的操作上限，進行更嚴格的冒煙測試
- 選用的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔存放區驗證並忽略僅限環境變數的覆寫

## 媒體即時線束

- 指令：`pnpm test:live:media`
- 用途：
  - 透過一個原生的程式庫入口點執行共享的圖片、音樂和視訊即時測試組
  - 自動從 `~/.profile` 載入遺失的提供者環境變數
  - 預設會自動將每個測試組縮小至目前具有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，以便心跳與安靜模式的行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## 相關

- [測試](/zh-Hant/help/testing) — 單元、整合、QA 和 Docker 測試組
