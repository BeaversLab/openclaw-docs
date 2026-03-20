---
summary: "測試套件：單元/E2E/Live 測試套件、Docker 執行器，以及各測試涵蓋的內容"
read_when:
  - 在本地或 CI 中執行測試
  - 針對模型/供應商錯誤加入回歸測試
  - 除錯閘道與代理程式行為
title: "測試"
---

# 測試

OpenClaw 擁有三個 Vitest 測試套件（單元/整合、E2E、Live）以及一小組 Docker 執行器。

這份文件是一份「我們如何測試」的指南：

- 各測試套件涵蓋的範圍（以及刻意_不_涵蓋的內容）
- 常見工作流程應執行的指令（本地、推送前、除錯）
- Live 測試如何發現憑證並選擇模型/供應商
- 如何為真實世界的模型/供應商問題加入回歸測試

## 快速入門

大多數時候：

- 完整檢測（預期在推送前執行）：`pnpm build && pnpm check && pnpm test`

當您修改測試或想要額外的信心時：

- 覆蓋率檢測：`pnpm test:coverage`
- E2E 測試套件：`pnpm test:e2e`

當除錯真實供應商/模型時（需要真實憑證）：

- Live 測試套件（模型 + 閘道工具/映像檔探測）：`pnpm test:live`

提示：當您只需要一個失敗案例時，建議使用下方描述的允許清單環境變數來縮小 Live 測試範圍。

## 測試套件（執行位置）

請將這些測試套件視為「真實感遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`scripts/test-parallel.mjs`（執行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 檔案：`src/**/*.test.ts`、`extensions/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 針對已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 嵌入式執行器備註：
  - 當您變更訊息工具探索輸入或壓縮執行時語境時，
    請保持這兩個層級的覆蓋率。
  - 針對純路由/正規化邊界加入專注的輔助回歸測試。
  - 同時請維持嵌入式執行器整合測試套件的健康狀態：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些測試套件會驗證範圍 ID 和壓縮行為仍然流經真實的 `run.ts` / `compact.ts` 路徑；僅針對輔助函式的測試無法完全替代這些整合路徑。
- 集區備註：
  - OpenClaw 在 Node 22、23 和 24 上使用 Vitest `vmForks` 以加快單元測試分片速度。
  - 在 Node 25+ 上，OpenClaw 會自動回退到標準 `forks`，直到該版本庫重新驗證為止。
  - 使用 `OPENCLAW_TEST_VM_FORKS=0` (強制 `forks`) 或 `OPENCLAW_TEST_VM_FORKS=1` (強制 `vmForks`) 手動覆蓋。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用 Vitest `vmForks` 以加快檔案啟動速度。
  - 使用自適應 Worker (CI：2-4，本機：4-8)。
  - 預設以靜音模式執行以減少主控台 I/O 開銷。
- 實用的覆寫選項：
  - 使用 `OPENCLAW_E2E_WORKERS=<n>` 強制指定 Worker 數量 (上限 16)。
  - 使用 `OPENCLAW_E2E_VERBOSE=1` 重新啟用詳細主控台輸出。
- 範圍：
  - 多執行個體 Gateway 的端對端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行 (當在管線中啟用時)
  - 不需要真實金鑰
  - 比單元測試有更多變動環節 (可能較慢)

### E2E: OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動隔離的 OpenShell Gateway
  - 從本機暫時性的 Dockerfile 建立沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙盒檔案系統橋接器驗證遠端標準檔案系統行為
- 預期：
  - 僅供選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及運作正常的 Docker Daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 Gateway 和沙盒
- 實用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用該測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指定非預設的 CLI 二進位檔或包裝腳本

### Live（真實提供商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設值：透過 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此提供商/模型在 _今天_ 是否真的能使用真實憑證運作？」
  - 偵測提供商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定性（真實網路、真實提供商政策、配額、停機）
  - 需要花費費用 / 會使用速率限制
  - 建議執行縮小範圍的子集，而不是執行「全部」
  - Live 執行會 source `~/.profile` 以取得遺失的 API 金鑰
- API 金鑰輪替（特定提供商）：設定 `*_API_KEYS` 使用逗號/分號格式，或設定 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行單次 live 覆寫；測試會在遇到速率限制回應時重試。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試時：執行 `pnpm test`（如果您變更了很多內容，則執行 `pnpm test:coverage`）
- 涉及 gateway 網路功能 / WS 通訊協定 / 配對時：加入 `pnpm test:e2e`
- 偵錯「我的機器人掛了」 / 特定提供商失敗 / 工具呼叫時：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫已連接的 Android 節點**目前廣告的所有指令**，並斷言指令契約行為。
- 範圍：
  - 前置條件/手動設定（該測試套件不會安裝/執行/配對應用程式）。
  - 針對所選 Android 節點，逐一指令進行 gateway `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連接並與 gateway 配對。
  - 應用程式保持在前台。
  - 已針對您預期通過的功能授予權限/擷取同意。
- 可選的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳細資訊：[Android 應用程式](/zh-Hant/platforms/android)

## Live: 模型冒煙測試 (設定檔金鑰)

Live 測試分為兩層，以便我們隔離故障：

- 「直接模型」告訴我們供應商/模型是否能使用給定的金鑰回應。
- 「Gateway 冒煙測試」告訴我們完整的 gateway+agent 管線對該模型是否有效（工作階段、歷史記錄、工具、沙盒原則等）。

### 第 1 層：直接模型完成 (無 gateway)

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉發現的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行小型完成操作 (並在需要時執行目標迴歸測試)
- 如何啟用：
  - `pnpm test:live` (或 `OPENCLAW_LIVE_TEST=1` 如果直接呼叫 Vitest)
- 設定 `OPENCLAW_LIVE_MODELS=modern` (或 `all`，modern 的別名) 以實際執行此套件；否則它會跳過，以保持 `pnpm test:live` 專注於 gateway 冒煙測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單 (Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (逗號分隔的允許清單)
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (逗號分隔的允許清單)
- 金鑰來源：
  - 預設：設定檔儲存庫和環境變數後援
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **設定檔儲存庫**
- 存在原因：
  - 區隔「供應商 API 故障 / 金鑰無效」與「gateway agent 管線故障」
  - 包含小型、獨立的迴歸測試 (例如：OpenAI Responses/Codex Responses 推理重播 + 工具呼叫流程)

### 第 2 層：Gateway + dev agent 冒煙測試 ("@openclaw" 實際執行的操作)

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內 gateway
  - 建立/修補 `agent:dev:*` 工作階段 (每次執行的模型覆寫)
  - 反覆執行具有金鑰的模型並斷言：
    - 「有意義」的回應 (無工具)
    - 真實工具調用運作正常（讀取探測）
    - 選用的額外工具探測（執行+讀取探測）
    - OpenAI 迴歸路徑（僅工具調用 → 後續追蹤）持續運作
- 探測詳細資訊（以便您能快速解釋失敗原因）：
  - `read` 探測：測試會在工作區寫入一個 nonce 檔案，並要求代理程式 `read` 該檔案並將 nonce 回傳。
  - `exec+read` 探測：測試會要求代理程式將一個 nonce `exec` 寫入暫存檔案，然後將其 `read` 回傳。
  - 影像探測：測試會附加一個生成的 PNG（貓 + 隨機代碼），並期待模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設值：現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）以縮小範圍
- 如何選擇提供者（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔允許清單）
- 在此即時測試中，工具與影像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型聲稱支援影像輸入時，會執行影像探測
  - 流程（高階）：
    - 測試會生成一個帶有「CAT」+ 隨機代碼的微小 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 傳送
    - Gateway 將附件解析為 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理程式將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容錯：允許輕微錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token profile）能否完成 Anthropic prompt。
- 啟用：
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token sources (pick one):
  - Profile: `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Raw token: `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Model override (optional):
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Setup example:

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI backend smoke (Claude Code CLI or other local CLIs)

- Test: `src/gateway/gateway-cli-backend.live.test.ts`
- Goal: validate the Gateway + agent pipeline using a local CLI backend, without touching your default config.
- 啟用：
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Defaults:
  - Model: `claude-cli/claude-sonnet-4-6`
  - Command: `claude`
  - Args: `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Overrides (optional):
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` to send a real image attachment (paths are injected into the prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` to pass image file paths as CLI args instead of prompt injection.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (or `"list"`) to control how image args are passed when `IMAGE_ARG` is set.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` to send a second turn and validate resume flow.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` to keep Claude Code CLI MCP config enabled (default disables MCP config with a temporary empty file).

Example:

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recommended live recipes

Narrow, explicit allowlists are fastest and least flaky:

- Single model, direct (no gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Single model, gateway smoke:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Tool calling across several providers:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google focus (Gemini API key + Antigravity):
  - Gemini (API key): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes:

- `google/...` uses the Gemini API (API key).
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的代理端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具細節）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / 個人資料驗證）；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證機制，且行為可能有所不同（串流 / 工具支援 / 版本偏差）。

## Live：模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型清單」（Live 是選用的），但這些是在擁有金鑰的開發機上定期涵蓋的**建議**模型。

### 現代煙霧測試集（工具呼叫 + 圖片）

這是我們預期能持續運作的「通用模型」執行：

- OpenAI (non-Codex)：`openai/gpt-5.2`（選用：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免使用較舊的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

使用工具 + 圖片執行 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（Read + 選用 Exec）

每個供應商系列至少選擇一個：

- OpenAI：`openai/gpt-5.2`（或 `openai/gpt-5-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-5`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

選用的額外涵蓋範圍（最好有）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`…（選擇一個您已啟用的「tools」支援模型）
- Cerebras：`cerebras/`…（如果您有存取權限）
- LM Studio：`lmstudio/`…（本機；工具呼叫取決於 API 模式）

### 視覺：圖片發送（附件 → 多模態訊息）

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試圖片探測功能。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...`（數百種模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選）
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

您可以將更多提供商納入即時矩陣（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），以及任何 OpenAI/Anthropic 相容的 Proxy（LM Studio、vLLM、LiteLLM 等）

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單取決於 `discoverModels(...)` 在您的機器上傳回的內容，加上可用的金鑰。

## 憑證（切勿提交）

即時測試會以與 CLI 相同的方式探索憑證。實際影響如下：

- 如果 CLI 運作正常，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「無憑證」，請像除錯 `openclaw models list` / 模型選擇一樣進行除錯。

- 設定檔儲存：`~/.openclaw/credentials/`（首選；測試中「設定檔金鑰」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live（音訊轉錄）

- 測試： `src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用： `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試： `src/agents/byteplus.live.test.ts`
- 啟用： `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 選用的模型覆寫： `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Image generation live

- 測試： `src/image-generation/runtime.live.test.ts`
- 指令： `pnpm test:live src/image-generation/runtime.live.test.ts`
- 範圍：
  - 列舉每個已註冊的圖像生成供應商插件
  - 在探測之前，從您的登入 shell（`~/.profile`）載入遺失的供應商環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會掩蓋真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 透過共享執行時功能執行標準圖像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的內建供應商：
  - `openai`
  - `google`
- 選用的縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 選用的認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存的認證並忽略僅環境變數的覆寫

## Docker 執行器（選用的「適用於 Linux」檢查）

這些會在儲存庫 Docker 映像檔內執行 `pnpm test:live`，掛載您的本地設定目錄和工作區（如果掛載了會 sourcing `~/.profile`）。它們也會在存在時 bind-mount CLI 認證主目錄，例如 `~/.codex`、`~/.claude`、`~/.qwen` 和 `~/.minimax`，然後在執行前將其複製到容器主目錄，以便外部 CLI OAuth 可以刷新權杖而不會修改主機認證儲存：

- 直接模型： `pnpm test:docker:live-models` （腳本： `scripts/test-live-models-docker.sh`）
- Gateway + dev agent: `pnpm test:docker:live-gateway` (腳本：`scripts/test-live-gateway-models-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health): `pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- Plugins (custom extension load + registry smoke): `pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)

Live-model Docker 執行器也會將目前的 checkout 以唯讀方式 bind-mount，並在容器內將其暫存至暫時的工作目錄。這能保持執行時映像檔精簡，同時針對您的本機原始碼/設定執行 Vitest。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 通道縮小或排除 gateway live 涵蓋範圍時，也請一併傳入 `OPENCLAW_LIVE_GATEWAY_*`。

手動 ACP 自然語言 thread smoke (非 CI)：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本用於回歸/除錯工作流程。未來可能需要用它來驗證 ACP thread 路由，因此請勿刪除。

實用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` (預設：`~/.openclaw`) 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (預設：`~/.openclaw/workspace`) 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (預設：`~/.profile`) 掛載至 `/home/node/.profile` 並在執行測試前載入
- `$HOME` 下的外部 CLI 認證目錄 (`.codex`, `.claude`, `.qwen`, `.minimax`) 會以唯讀方式掛載在 `/host-auth/...` 下，然後在測試開始前複製到 `/home/node/...`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 用於縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 用於在容器內篩選提供者
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用於確保憑證來自設定檔存放區 (而非環境變數)

## Docs sanity

在編輯文檔後運行文檔檢查：`pnpm docs:list`。

## 離線回歸測試（CI 安全）

這些是沒有真實供應商的「真實管道」回歸測試：

- Gateway 工具調用（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「透過 gateway agent 迴圈端到端運行模擬 OpenAI 工具調用」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入配置 + 強制執行 auth）：`src/gateway/gateway.test.ts`（案例：「透過 ws 運行精靈並寫入 auth token 配置」）

## Agent 可靠性評估（skills）

我們已經有一些 CI 安全的測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具調用（`src/gateway/gateway.test.ts`）。
- 驗證會話連線和配置效果的端到端精靈流程（`src/gateway/gateway.test.ts`）。

skills 仍然缺少什麼（請參閱 [Skills](/zh-Hant/tools/skills))：

- **決策：** 當提示中列出了 skills，agent 是否會選擇正確的 skill（或避免不相關的 ones）？
- **合規性：** agent 是否在使用前閱讀 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程契約：** 斷言工具順序、會話歷史傳遞和沙箱邊界的多輪情境。

未來的評估應首先保持確定性：

- 使用模擬供應商的情境執行器來斷言工具調用 + 順序、skill 文件讀取和會話連線。
- 一小套專注於 skills 的情境（使用 vs 避免、閘控、提示注入）。
- 可選的即時評估（選擇加入、環境閘控）僅在 CI 安全套件到位之後。

## 添加回歸測試（指引）

當您修復在即時測試中發現的供應商/模型問題時：

- 如果可能，請添加 CI 安全的回歸測試（模擬/存根供應商，或捕獲確切的要求形狀轉換）
- 如果它本質上僅限於即時（速率限制、身份驗證策略），請保持即時測試狹窄並透過環境變數選擇加入
- 優先針對捕獲錯誤的最小層級：
  - 供應商請求轉換/重放錯誤 → 直接模型測試
  - gateway 會話/歷史/工具管道錯誤 → gateway 即時冒煙測試或 CI 安全 gateway 模擬測試
- SecretRef 遍歷防護欄：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元資料 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導出一個抽樣目標，然後斷言遍歷區段執行 id 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 id 上故意失敗，因此新類別無法被無聲略過。

import en from "/components/footer/en.mdx";

<en />
