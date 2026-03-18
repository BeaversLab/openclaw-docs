---
summary: "測試套件：單元/E2E/Live 套件、Docker 執行器，以及每個測試的涵蓋範圍"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

# 測試

OpenClaw 具有三個 Vitest 套件（單元/整合、e2e、live）和一小組 Docker 執行器。

本文檔是一份「我們如何進行測試」的指南：

- 每個套件涵蓋的內容（以及它刻意*不*涵蓋的內容）
- 針對常見工作流程（本地、推送前、除錯）應執行的指令
- Live 測試如何探索憑證並選擇模型/供應商
- 如何為真實世界的模型/供應商問題加入回歸測試

## 快速入門

大部分時候：

- 完整檢查（預期在推送前執行）： `pnpm build && pnpm check && pnpm test`

當您修改測試或需要額外的信心時：

- 覆蓋率檢查： `pnpm test:coverage`
- E2E 套件： `pnpm test:e2e`

當對真實的供應商/模型進行除錯時（需要真實憑證）：

- Live 套件（模型 + 閘道工具/映像探測）： `pnpm test:live`

提示：當您只需要一個失敗案例時，建議透過下方描述的允許清單環境變數來縮小 Live 測試的範圍。

## 測試套件（在哪裡執行什麼）

您可以將這些套件視為「現實感逐級提升」（且不穩定性/成本也隨之增加）：

### 單元 / 整合（預設）

- 指令： `pnpm test`
- 設定： `scripts/test-parallel.mjs`（執行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 檔案： `src/**/*.test.ts`、`extensions/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 針對已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 執行緒池備註：
  - OpenClaw 在 Node 22、23 和 24 上使用 Vitest `vmForks` 以加快單元測試的分片速度。
  - 在 Node 25+ 上，OpenClaw 會自動回退到標準 `forks`，直到該儲存庫在此版本上重新驗證為止。
  - 可以使用 `OPENCLAW_TEST_VM_FORKS=0`（強制使用 `forks`）或 `OPENCLAW_TEST_VM_FORKS=1`（強制使用 `vmForks`）手動覆蓋。

### E2E（閘道冒煙測試）

- 指令： `pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用 Vitest `vmForks` 以加快檔案啟動速度。
  - 使用自適應工作執行緒（CI：2-4，本機：4-8）。
  - 預設以靜音模式執行，以減少控制台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用來強制指定工作執行緒數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用來重新啟用詳細的控制台輸出。
- 範圍：
  - 多執行個體閘道端對端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在管道中啟用時）
  - 不需要真實的金鑰
  - 比單元測試有更多運作部件（可能較慢）

### E2E：OpenShell 後端冒煙測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個隔離的 OpenShell 閘道
  - 從暫存的本機 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙箱 fs 橋接器驗證遠端標準檔案系統行為
- 預期：
  - 僅供選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可正常運作的 Docker 守護程式
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試閘道和沙箱
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 用在手動執行更廣泛的 e2e 測試套件時啟用該測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用來指向非預設的 CLI 二進位檔或包裝腳本

### Live（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設值：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型在擁有真實憑證的情況下，是否真的能於 _今天_ 運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定性（真實網路、真實供應商政策、配額、故障）
  - 需要花費費用 / 使用速率限制
  - 建議執行縮小範圍的子集，而非「全部」
  - Live 執行會 source `~/.profile` 以取得缺失的 API 金鑰
- API 金鑰輪替（特定於提供者）：設定 `*_API_KEYS` 採用逗號/分號格式，或使用 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行每次 live 的覆寫；測試會在速率限制回應時重試。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您修改了很多內容，則也執行 `pnpm test:coverage`）
- 涉及閘道網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人當機」/ 特定提供者的失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫連線的 Android 節點目前**廣告的每個指令**，並斷言指令合約行為。
- 範圍：
  - 前置條件/手動設定（該套件不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點，進行逐個指令的閘道 `node.invoke` 驗證。
- 必要的前置設定：
  - Android 應用程式已連線並與閘道配對。
  - 應用程式保持在前景。
  - 已授予您預期通過之功能的權限/捕獲同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定細節：[Android 應用程式](/zh-Hant/platforms/android)

## Live：model smoke (設定檔金鑰)

Live 測試分為兩層，以便我們隔離失敗：

- 「Direct model」告訴我們該提供者/模型是否能在給定金鑰的情況下回應。
- 「Gateway smoke」告訴我們完整的閘道+代理程式管線對該模型是否正常運作（工作階段、歷史記錄、工具、沙箱政策等）。

### 第 1 層：Direct model 完成（無閘道）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉已探索的模型
  - 使用 `getApiKeyForModel` 來選擇您擁有憑證的模型
  - 對每個模型執行一個小型完成操作（並在需要時進行目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，現代的別名）以實際執行此套件；否則會跳過以保持 `pnpm test:live` 專注於網關冒煙測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔的允許清單）
- 金鑰來源：
  - 預設值：設定檔儲存和環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **設定檔儲存**
- 為何存在：
  - 將「供應商 API 故障 / 金鑰無效」與「網關代理管道故障」區分開來
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具呼叫流程）

### 第 2 層：網關 + 開發代理冒煙測試（這是「@openclaw」實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內網關
  - 建立/修補 `agent:dev:*` 階段（每次執行的模型覆寫）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實工具呼叫運作正常（讀取探測）
    - 可選的額外工具探測（執行+讀取探測）
    - OpenAI 回歸路徑（僅工具呼叫 → 後續跟進）持續運作
- 探測詳情（以便您快速解釋失敗原因）：
  - `read` 探測：測試在工作區中寫入一個 nonce 檔案，並要求代理 `read` 它並回傳 nonce。
  - `exec+read` 探測：測試要求代理 `exec`-寫入一個 nonce 到臨時檔案，然後 `read` 回來。
  - 影像探測：測試附加一個生成的 PNG（貓 + 隨機代碼），並預期模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（或者如果是直接調用 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單 (Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或者設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）來縮小範圍
- 如何選擇供應商（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔允許清單）
- 在此即時測試中，工具和圖像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援圖像輸入時，會執行圖像探測
  - 流程（高層級）：
    - 測試會生成一個帶有「CAT」+ 隨機代碼的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容錯：允許微小的錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token profile）能否完成 Anthropic 提示。
- 啟用：
  - `pnpm test:live`（或者如果是直接調用 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（擇一）：
  - Profile：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 Token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（可選）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

設定範例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## 即時：CLI backend smoke (Claude Code CLI 或其他本機 CLI)

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + 代理管道，而不會變更您的預設配置。
- 啟用：
  - `pnpm test:live`（或者如果是直接調用 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 模型：`claude-cli/claude-sonnet-4-6`
  - 指令：`claude`
  - 參數：`["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆寫（可選）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以發送真實的圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以在設定 `IMAGE_ARG` 時控制圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持啟用 Claude Code CLI 的 MCP 配置（預設會使用暫時的空檔案停用 MCP 配置）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 測試配方

狹窄、明確的允許清單速度最快且最不穩定：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 專注（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API（API 金鑰）。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的代理端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（單獨的驗證 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / 檔案設定驗證）；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 會調用本地的 `gemini` 二進制文件；它有自己的驗證方式，並且行為可能有所不同（串流/工具支援/版本偏差）。

## Live：模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型列表」（Live 是可選加入的），但這些是在開發機器上使用金鑰定期涵蓋的**推薦**模型。

### 現代冒煙測試集（工具調用 + 圖像）

這是我們期望保持正常運作的「常見模型」執行集：

- OpenAI (非 Codex)：`openai/gpt-5.2` (選用：`openai/gpt-5.1`)
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-5`)
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用較舊的 Gemini 2.x 模型)
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

執行包含工具與圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫 (Read + 選用 Exec)

每個供應商系列至少選擇一個：

- OpenAI：`openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-5`)
- Google：`google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

選用的額外覆蓋率 (最好有)：

- xAI：`xai/grok-4` (或最新可用版本)
- Mistral：`mistral/`… (選擇一個您已啟用且支援「工具」的模型)
- Cerebras：`cerebras/`… (如果您有存取權限)
- LM Studio：`lmstudio/`… (本地；工具呼叫取決於 API 模式)

### 視覺：圖片傳送 (附件 → 多模態訊息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型 (Claude/Gemini/OpenAI 支援視覺的版本等)，以測試圖片探針。

### 聚合器 / 替代閘道

如果您已啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選)
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多您可以納入即時矩陣的供應商 (如果您有憑證/設定)：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），以及任何相容 OpenAI/Anthropic 的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上傳回的任何內容 + 任何可用的金鑰。

## 憑證（絕不要提交）

即時測試會以與 CLI 相同的方式探索憑證。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請像偵錯 `openclaw models list` / 模型選擇一樣進行偵錯。

- 設定檔存放區：`~/.openclaw/credentials/`（首選；測試中「設定檔金鑰」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境變數金鑰（例如在您的 `~/.profile` 中匯出），請在 `source ~/.profile` 之後執行本機測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載至容器中）。

## Deepgram 即時（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 編碼計畫即時

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## Docker 執行器（選用的「在 Linux 中運作」檢查）

這些在 repo Docker 映像檔內執行 `pnpm test:live`，掛載您的本機設定目錄和工作區（並在已掛載時載入 `~/.profile`）。當存在時，它們也會繫結掛載 CLI auth 主目錄，例如 `~/.codex`、`~/.claude`、`~/.qwen` 和 `~/.minimax`，以便外部 CLI OAuth 在容器內保持可用：

- 直接模型：`pnpm test:docker:live-models` (腳本：`scripts/test-live-models-docker.sh`)
- Gateway + dev agent：`pnpm test:docker:live-gateway` (腳本：`scripts/test-live-gateway-models-docker.sh`)
- 入門嚮導 (TTY, 完整腳手架)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Gateway 網路 (兩個容器，WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- 外掛程式 (自訂擴充功能載入 + registry 冒煙測試)：`pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)

Live-model Docker 執行器也會以唯讀方式繫結掛載目前的 checkout，並將其暫存到容器內的暫存工作目錄中。這讓執行時映像檔保持精簡，同時仍能針對您的確切本機來源/設定執行 Vitest。

手動 ACP 平實語言 thread 冒煙測試 (非 CI)：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本用於回歸/除錯工作流程。未來可能需要再次用於 ACP thread 路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` (預設：`~/.openclaw`) 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (預設：`~/.openclaw/workspace`) 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (預設：`~/.profile`) 掛載至 `/home/node/.profile` 並在執行測試前載入
- `$HOME` 下的外部 CLI auth 目錄 (`.codex`、`.claude`、`.qwen`、`.minimax`) 若存在，會以唯讀方式掛載至對應的 `/home/node/...` 路徑
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保認證資訊來自設定檔（而非環境變數）

## 文件健全性檢查

編輯文件後執行檢查：`pnpm docs:list`。

## 離線回歸測試（CI 安全）

這些是沒有真實提供者的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例："runs a mock OpenAI tool call end-to-end via gateway agent loop"）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例："runs wizard over ws and writes auth token config"）

## Agent 可靠性評估（Skills）

我們已經有一些 CI 安全的測試，其行為類似「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.test.ts`）。
- 驗證 session 接線與設定效果的端到端精靈流程（`src/gateway/gateway.test.ts`）。

Skills 目前仍缺少什麼（請參閱 [Skills](/zh-Hant/tools/skills))：

- **決策制定：** 當 prompt 中列出 skills 時，agent 是否會選擇正確的 skill（或避免不相關的）？
- **合規性：** agent 在使用前是否會讀取 `SKILL.md` 並遵循必要步驟/引數？
- **工作流程合約：** 斷言工具順序、session 歷史傳遞與沙箱邊界的多輪對話情境。

未來的評估應優先保持確定性：

- 使用模擬提供者的情境執行器，以斷言工具呼叫 + 順序、skill 檔案讀取與 session 接線。
- 一小組專注於 skill 的情境（使用 vs 避免、閘道、prompt 注入）。
- 僅在 CI 安全測試套件就位後，才進行選用的即時評估（選擇加入、受環境變數控制）。

## 新增回歸測試（指導原則）

當您修正在 live 中發現的 provider/model 問題時：

- 如果可行，請新增 CI 安全的回歸測試（模擬/存根 provider，或擷取確切的請求形狀轉換）
- 若本質上僅限 live（速率限制、驗證政策），請保持 live 測試的精簡性，並透過環境變數選擇加入
- 優先以能捕捉該 bug 的最小層級為目標：
  - provider 請求轉換/重放 bug → 直接 models 測試
  - gateway session/history/tool pipeline bug → gateway live smoke 或 CI-safe gateway mock test
- SecretRef traversal guardrail:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從 registry 元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導一個採樣目標，然後斷言 traversal-segment exec id 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會針對未分類的目標 id 故意失敗，以免新類別被無聲跳過。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
