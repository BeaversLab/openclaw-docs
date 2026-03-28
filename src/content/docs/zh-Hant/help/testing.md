---
summary: "測試套件：單元/e2e/live 測試組、Docker 執行器，以及各項測試涵蓋的內容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

# 測試

OpenClaw 有三個 Vitest 測試組（單元/整合、e2e、live）和一小組 Docker 執行器。

本文是一份「我們如何測試」指南：

- 各測試組涵蓋的內容（以及刻意*不*涵蓋的內容）
- 常見工作流程應執行的指令（本地、推送前、除錯）
- Live 測試如何探索憑證並選擇模型/提供商
- 如何為真實世界的模型/提供商問題加入回歸測試

## 快速入門

大多數時候：

- 完整檢查閘道（推送前預期執行）：`pnpm build && pnpm check && pnpm test`

當您修改測試或需要更多信心時：

- 覆蓋率檢查閘道：`pnpm test:coverage`
- E2E 測試組：`pnpm test:e2e`

當除錯真實的提供商/模型時（需要真實憑證）：

- Live 套件（模型 + 閘道工具/影像探測）：`pnpm test:live`

提示：當您只需要一個失敗案例時，建議優先透過下方所述的 allowlist 環境變數來縮小 live 測試範圍。

## 測試套件（在哪裡執行什麼）

將這些套件視為「真實度遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`scripts/test-parallel.mjs` （執行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 檔案：`src/**/*.test.ts`、`extensions/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 排程器備註：
  - `pnpm test` 現在為真正的 pool/isolation 覆蓋保留了一個小型的簽入行為清單，並為最慢的單元檔案保留了一個獨立的計時快照。
  - 共用的單元覆蓋率保持開啟，但包裝器將測量出的最重檔案剝離到專用通道，而不是依賴不斷增長的手動維護排除清單。
  - 在主要套件形狀變更後，使用 `pnpm test:perf:update-timings` 更新計時快照。
- 嵌入式執行器注意事項：
  - 當您變更 message-tool 探索輸入或壓縮執行時間語境時，
    請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界新增專注的輔助回歸測試。
  - 同時也要保持嵌入式執行器整合套件的健康狀況：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些測試組會驗證範圍 ID 和壓縮行為仍然能夠
    透過真實的 `run.ts` / `compact.ts` 路徑流動；僅測試輔助函式並不足以
    取代那些整合路徑的測試。
- Pool 說明：
  - OpenClaw 在 Node 22、23 和 24 上使用 Vitest `vmForks` 以進行更快的單元分片。
  - 在 Node 25+ 上，在該處重新驗證 repo 之前，OpenClaw 會自動回退到常規的 `forks`。
  - 使用 `OPENCLAW_TEST_VM_FORKS=0` (強制 `forks`) 或 `OPENCLAW_TEST_VM_FORKS=1` (強制 `vmForks`) 手動覆寫。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、 `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用 Vitest `vmForks` 以加快檔案啟動速度。
  - 使用自適應 workers（CI：2-4，本機：4-8）。
  - 預設以靜默模式執行以減少主控台 I/O 開銷。
- 實用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 以強制設定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細主控台輸出。
- 範圍：
  - 多實例 gateway 端到端行為
  - WebSocket/HTTP 表面、節點配對以及更繁重的網路操作
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實的金鑰
  - 比單元測試有更多運作部件（可能較慢）

### E2E：OpenShell 後端冒煙測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫存的本地 Dockerfile 建立沙盒
  - 透過真實 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過 sandbox fs 橋接器驗證 remote-canonical 檔案系統行為
- 預期：
  - 僅供選擇加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 gateway 和 sandbox
- 有用的覆寫：
  - 手動執行更廣泛的 e2e suite 時，使用 `OPENCLAW_E2E_OPENSHELL=1` 來啟用測試
  - 使用 `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非預設的 CLI binary 或 wrapper script

### Live (真實 providers + 真實 models)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：透過 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - “此提供商/模型在 _今天_ 是否能使用真實憑證實際運作？”
  - 捕捉提供商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 出於設計原因，在 CI 中不穩定（真實網路、真實提供商政策、配額、中斷）
  - 需要花費金錢 / 使用速率限制
  - 建議執行縮小的子集，而非「所有內容」
  - Live 執行將 source `~/.profile` 以取得缺失的 API 金鑰
- API 金鑰輪替（特定提供者）：以逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或透過 `OPENCLAW_LIVE_*_KEY` 進行個別 live 覆蓋；測試會在速率限制回應時重試。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您改了很多，則執行 `pnpm test:coverage`）
- 涉及閘道網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 特定提供者失敗 / 工具呼叫：執行狹義範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：調用已連接的 Android 節點當前廣告的**所有命令**，並斷言命令契約行為。
- 範圍：
  - 預先條件/手動設置（該測試套件不會安裝/運行/配對應用程式）。
  - 針對所選 Android 節點進行逐個命令的網關 `node.invoke` 驗證。
- 必要的預先設置：
  - Android 應用程式已連接並與網關配對。
  - 應用程式保持在前台。
  - 已為您期望通過的功能授予權限/擷取同意。
- 可選的目標覆蓋：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設置詳情：[Android App](/zh-Hant/platforms/android)

## Live: model smoke (profile keys)

Live 測試分為兩層，以便我們隔離故障：

- “直接模型”告訴我們提供商/模型是否能使用給定的金鑰進行回應。
- “閘道煙霧測試”告訴我們完整的閘道+代理流程是否對該模型有效（例如：sessions、history、tools、sandbox policy 等）。

### 第 1 層：直接模型補全（無閘道）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉已發現的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 對每個模型執行一個小型補全（並在需要時執行針對性的迴歸測試）
- 如何啟用：
  - `pnpm test:live`（若直接調用 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此測試套件；否則會跳過，以保持 `pnpm test:live` 專注於閘道煙霧測試
- 如何選取模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以運行現代允許清單 (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (逗號分隔的允許清單)
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (逗號分隔的允許清單)
- 金鑰來源：
  - 預設：profile store 和環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 存在原因：
  - 區分「供應商 API 故障 / 金鑰無效」與「gateway agent pipeline 故障」
  - 包含小型、獨立的回歸測試 (例如：OpenAI Responses/Codex Responses reasoning replay + tool-call 流程)

### Layer 2: Gateway + dev agent smoke (這是 "@openclaw" 實際執行的操作)

- 測試： `src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動一個進程內的 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆寫）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的調用工具可正常運作（讀取探測）
    - 可選的額外工具探測（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續正常運作
- 探測細節（以便您快速解釋失敗原因）：
  - `read` probe：測試在工作區中寫入一個 nonce 檔案，並要求代理程式 `read` 它並將 nonce 回傳。
  - `exec+read` probe：測試要求代理程式 `exec`-write 一個 nonce 到暫存檔案，然後將其 `read` 回來。
  - image probe：測試附加一個生成的 PNG（貓圖 + 隨機程式碼），並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單 (Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.5、Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）以縮小範圍
- 如何選擇提供商（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔允許清單）
- 在此即時測試中，工具 + 影像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援影像輸入時，會執行影像探測
  - 流程（高階）：
    - 測試會生成一個帶有「CAT」+ 隨機代碼的微小 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理將多模態使用者訊息轉發至模型
    - 斷言：回覆包含 `cat` + 程式碼 (OCR 容錯：允許少量錯誤)

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```exec
openclaw models list
openclaw models list --json
```

## Live: Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token profile）能否完成 Anthropic 提示。
- 啟用：
  - `pnpm test:live` （若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（選擇一項）：
  - Profile：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始令牌：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（可選）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

設定範例：

```exec
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## 即時：CLI 後端冒煙測試（Claude Code CLI 或其他本地 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI 後端驗證 Gateway + 代理 管線，而不影響您的預設配置。
- 啟用：
  - `pnpm test:live`（如果直接調用 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用於發送真實圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用於將圖片檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用於在設置 `IMAGE_ARG` 時控制圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用於發送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 用於保持 Claude Code CLI MCP 配置啟用（預設情況下會使用臨時空檔案停用 MCP 配置）。

範例：

```exec
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 配方

狹窄、明確的允許清單是最快且最穩定的：

- 單一模型，直連（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway 冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重點（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的 agent 端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的驗證 + 工具怪癖)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 設定檔驗證)；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫外部的本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能有所不同 (串流/工具支援/版本差異)。

## Live：模型矩陣 (我們涵蓋的範圍)

沒有固定的「CI 模型清單」（Live 測試為選用），但這些是**建議**在開發機器上使用金鑰定期涵蓋的模型。

### 現代煙霧測試集（工具呼叫 + 圖片）

這是我們預期持續正常運作的「常見模型」測試執行：

- OpenAI（非 Codex）：`openai/gpt-5.2`（選用：`openai/gpt-5.1`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免舊版 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/minimax-m2.5`

使用工具 + 圖片執行 gateway 煙霧測試：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具調用（讀取 + 可選執行）

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/minimax-m2.5`

可選的其他覆蓋範圍（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個您已啟用的支援「工具」的模型)
- Cerebras: `cerebras/`… (如果您有權限)
- LM Studio: `lmstudio/`… (本地；工具調用取決於 API 模式)

### 視覺：圖片發送（附件 → 多模態訊息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援影像的模型（Claude/Gemini/OpenAI 具備視覺能力的變體等），以測試影像探測功能。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` （數百種模型；使用 `openclaw models scan` 尋找支援工具與影像的候選者）
- OpenCode: Zen 使用 `opencode/...` ，Go 使用 `opencode-go/...` （透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行身份驗證）

更多您可以加入即時矩陣的供應商（如果您有憑證/配置）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要嘗試在文件中將「所有模型」寫死。權威清單是 `discoverModels(...)` 在您的機器上傳回的內容加上任何可用的金鑰。

## 憑證（切勿提交）

即時測試探索憑證的方式與 CLI 相同。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」（無憑證），請以除錯 `openclaw models list` / 模型選擇的相同方式進行除錯。

- 設定檔存放區：`~/.openclaw/credentials/`（首選；即測試中「profile keys」的含義）
- 設定檔：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境變數金鑰（例如在您的 `~/.profile` 中匯出），請在 `source ~/.profile` 之後執行本機測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live (音訊轉錄)

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可選模型覆蓋：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## Image generation live

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 範圍：
  - 列舉每個已註冊的圖像生成提供者插件
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入缺失的提供者環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 透過共享執行時功能執行標準圖像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的打包提供者：
  - `openai`
  - `google`
- 可選範圍縮小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的身份驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 強制使用設定檔儲存的身份驗證並忽略僅環境變數的覆蓋

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些在 repo Docker 映像檔內執行 `pnpm test:live`，掛載您的本地設定目錄和工作區（並載入 `~/.profile` 如果已掛載）。它們還會在存在時 bind 掛載 CLI 認證主目錄，例如 `~/.codex`、`~/.claude`、`~/.qwen` 和 `~/.minimax`，然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以刷新令牌而不會變更主機認證儲存：

- Direct models：`pnpm test:docker:live-models` (腳本：`scripts/test-live-models-docker.sh`)
- Gateway + dev agent：`pnpm test:docker:live-gateway` (腳本：`scripts/test-live-gateway-models-docker.sh`)
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Gateway 網路（兩個容器，WS auth + health）：`pnpm test:docker:gateway-network` （腳本： `scripts/e2e/gateway-network-docker.sh`）
- 外掛（自訂擴充載入 + registry smoke）：`pnpm test:docker:plugins` （腳本： `scripts/e2e/plugins-docker.sh`）

live-model Docker 執行器也會將目前的 checkout 以唯讀方式 bind-mount，並暫存至容器內的暫時工作目錄。這讓執行時映像檔保持精簡，同時仍能針對您確切的本機原始碼/設定執行 Vitest。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小範圍或從該 Docker 排除 gateway live 涵蓋範圍時，也請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。

手動 ACP 純文字執行緒 smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本以用於回歸/調試工作流程。日後可能需要再次用於 ACP 執行緒路由驗證，因此請勿刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` (預設值：`~/.openclaw`) 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (預設值：`~/.openclaw/workspace`) 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (預設值：`~/.profile`) 掛載至 `/home/node/.profile` 並在執行測試前進行 source
- `$HOME` 下的外部 CLI 認證目錄 (`.codex`, `.claude`, `.qwen`, `.minimax`) 會以唯讀方式掛載於 `/host-auth/...` 下，然後在測試開始前複製到 `/home/node/...`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾提供者
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存（非環境變數）

## 文件健全性

在編輯文件後執行檢查：`pnpm docs:list`。

## 離線回歸測試（CI 安全）

這些是不含真實提供者的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「runs a mock OpenAI tool call end-to-end via gateway agent loop」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「runs wizard over ws and writes auth token config」）

## Agent 可靠性評估（技能）

我們已經有一些適用於 CI 的測試，其行為類似於「agent reliability evals」：

- 透過真實的 gateway + agent 來 mock 呼叫工具 (`src/gateway/gateway.test.ts`)。
- 驗證 session 連線和配置效果的端到端 wizard 流程 (`src/gateway/gateway.test.ts`)。

針對 skills 目前仍缺少的部分（參見 [Skills](/zh-Hant/tools/skills)）：

- **決策 (Decisioning)：** 當 skills 列在提示詞中時，agent 是否會選擇正確的 skill（或避免不相關的 skill）？
- **合規性 (Compliance)：** agent 是否在使用前讀取 `SKILL.md` 並遵循必須的步驟/參數？
- **工作流程合約 (Workflow contracts)：** 斷言工具順序、session 歷史傳遞以及沙箱邊界的多輪場景。

未來的評估應首先保持確定性：

- 使用 mock 提供者的情境執行器，以斷言工具呼叫 + 順序、skill 檔案讀取以及 session 連線。
- 一組專注於技能的場景（使用與避免、閘控、提示注入）。
- 可選的即時評估（自選、環境閘控）僅在 CI 安全的套件就緒後進行。

## 合約測試（外掛與通道形狀）

合約測試驗證每個註冊的外掛和通道都符合其介面合約。它們會遍歷所有發現的外掛，並執行一系列形狀和行為斷言。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限通道合約：`pnpm test:contracts:channels`
- 僅限提供者合約：`pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本的外掛形狀（id、name、capabilities）
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息負載結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理程式
- **threading** - 執行緒 ID 處理
- **directory** - 目錄/名冊 API
- **group-policy** - 群組原則強制執行
- **status** - 通道狀態探測
- **registry** - 外掛程式登錄區結構

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛程式探索
- **loader** - 外掛程式載入
- **runtime** - 提供者執行環境
- **shape** - 外掛程式結構/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改通道或提供者外掛程式之後
- 重構外掛程式註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試 (指引)

當您修正 live 中發現的提供者/模型問題時：

- 如果可行，請加入 CI 相容的回歸測試（模擬/存根提供者，或擷取確切的請求形狀轉換）
- 如果是僅限即時測試（速率限制、身份驗證策略），請保持即時測試範圍縮小，並透過環境變數選擇加入
- 優先定位到能捕獲錯誤的最小層級：
  - 提供者請求轉換/重放錯誤 → 直接模型測試
  - 閘道會話/歷程/工具管線錯誤 → 閘道即時冒煙測試或 CI 相容的閘道模擬測試
- SecretRef 遍歷防護機制：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄表元資料 (`listSecretTargetRegistryEntries()`) 推導每個 SecretRef 類別的一個抽樣目標，然後斷言遍歷區段執行 ID 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，以免新類別被靜默跳過。
