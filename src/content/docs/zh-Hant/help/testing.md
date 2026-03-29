---
summary: "測試套件：單元/E2E/即時套件、Docker 執行器，以及各項測試涵蓋的範圍"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

# 測試

OpenClaw 擁有三個 Vitest 套件（單元/整合、E2E、即時）以及一小組 Docker 執行器。

本文是一份「我們如何進行測試」的指南：

- 各個套件涵蓋的內容（以及刻意*不*涵蓋的內容）
- 針對常見工作流程（本地、推送前、除錯）應執行的指令
- 即時測試如何探索憑證並選擇模型/提供者
- 如何為真實世界的模型/提供者問題加入回歸測試

## 快速入門

大多數時候：

- 完整閘道（推送前預期）： `pnpm build && pnpm check && pnpm test`

當您修改測試或需要更多信心時：

- 覆蓋率閘道： `pnpm test:coverage`
- E2E 套件： `pnpm test:e2e`

當除錯真實的提供者/模型時（需要真實憑證）：

- 即時套件（模型 + 閘道工具/圖像探測）： `pnpm test:live`

提示：當您只需要一個失敗案例時，建議透過下方描述的允許清單環境變數來縮小即時測試的範圍。

## 測試套件（何處執行什麼）

您可以將這些套件視為「遞增的真實性」（以及遞增的不穩定性/成本）：

### 單元 / 整合（預設）

- 指令： `pnpm test`
- 設定： `scripts/test-parallel.mjs` （執行 `vitest.unit.config.ts`、 `vitest.extensions.config.ts`、 `vitest.gateway.config.ts`）
- 檔案： `src/**/*.test.ts`、 `extensions/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 排程器註記：
  - `pnpm test` 現在會保留一個小的已簽入行為清單，用於真正的 pool/isolation 覆寫，以及一個用於最慢單元檔案的獨立時間快照。
  - 共享的單元覆蓋率現在預設為 `threads`，而清單則保持測量的僅限 fork 例外和沉重的 singleton 通道的明確性。
  - 共享擴展通道預設仍為 `threads`；當檔案無法安全地共用非隔離 worker 時，wrapper 會將明確的僅 fork 例外保持在 `test/fixtures/test-parallel.behavior.json` 中。
  - 通道套件 (`vitest.channels.config.ts`) 現在也預設為 `threads`；2026 年 3 月 22 日的直接全套件控制執行順利通過，沒有特定通道的 fork 例外。
  - Wrapper 將測量負荷最重的檔案剝離到專用通道中，而不是依賴日益龐大的人工維護排除清單。
  - 在主要套件結構變更後，使用 `pnpm test:perf:update-timings` 更新計時快照。
- 嵌入式執行器說明：
  - 當您變更 message-tool 發現輸入或壓縮執行時期內容時，
    請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界添加專注的輔助回歸測試。
  - 同時請保持嵌入式執行器整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件驗證了範圍 ID 和壓縮行為是否仍然流經
    真實的 `run.ts` / `compact.ts` 路徑；僅輔助測試並不是
    這些整合路徑的充分替代方案。
- Pool 說明：
  - 基礎 Vitest 設定預設仍為 `forks`。
  - Unit wrapper 通道預設為 `threads`，並包含明確的 manifest 僅 fork 例外。
  - Extension 範圍設定預設為 `threads`。
  - Channel 範圍設定預設為 `threads`。
  - Unit、channel 和 extension 設定預設為 `isolate: false` 以加快檔案啟動。
  - `pnpm test` 也會在 wrapper 層級傳遞 `--isolate=false`。
  - 使用 `OPENCLAW_TEST_ISOLATE=1 pnpm test` 重新選擇啟用 Vitest 檔案隔離。
  - `OPENCLAW_TEST_NO_ISOLATE=0` 或 `OPENCLAW_TEST_NO_ISOLATE=false` 也會強制執行隔離執行。
- 快速本機迭代說明：
  - `pnpm test:changed` 使用 `--changed origin/main` 執行 wrapper。
  - 基礎 Vitest 設定將 wrapper manifests/config 檔案標記為 `forceRerunTriggers`，以便在排程器輸入變更時，變更模式下的重新執行仍保持正確。
  - Vitest 的檔案系統模組快取現在預設為 Node 端測試重新執行啟用。
  - 如果您懷疑轉換快取行為過時，請使用 `OPENCLAW_VITEST_FS_MODULE_CACHE=0` 或 `OPENCLAW_VITEST_FS_MODULE_CACHE=false` 退出。
- 效能除錯備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的分析視圖範圍限定為自 `origin/main` 以來變更的檔案。
  - `pnpm test:perf:profile:main` 為 Vitest/Vite 啟動和轉換開銷寫入主執行緒 CPU 分析檔案。
  - `pnpm test:perf:profile:runner` 為停用檔案並行處理的單元測試套件寫入執行器 CPU + 堆積分析檔案。

### E2E（gateway 煙霧測試）

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用 Vitest `forks` 進行確定性的跨檔案隔離。
  - 使用自適應 workers（CI：最多 2 個，本機：預設 1 個）。
  - 預設在靜音模式下執行，以減少主控台 I/O 開銷。
- 有用的覆寫：
  - `OPENCLAW_E2E_WORKERS=<n>` 以強制設定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細的主控台輸出。
- 範圍：
  - 多執行個體 gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對和較重的網路傳輸
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作部件（可能較慢）

### E2E：OpenShell 後端煙霧測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫存的本機 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙箱 fs 橋接器驗證遠端規範檔案系統行為
- 預期：
  - 僅選擇加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker 守護程序
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 gateway 和沙箱
- 有用的覆寫：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實的供應商 + 真實的模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：透過 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型是否真的在*今天*能使用真實的憑證運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不穩定於 CI (真實的網路、真實的供應商政策、配額、故障)
  - 需要花費 / 使用速率限制
  - 偏好執行縮減的子集，而不是「所有項目」
  - Live 執行將讀取 `~/.profile` 以取得缺少的 API 金鑰
- API 金鑰輪替 (特定供應商)：設定 `*_API_KEYS` 採用逗號/分號格式或 `*_API_KEY_1`、`*_API_KEY_2` (例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行個別 live 覆寫；測試會在收到速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會將進度行發送到 stderr，因此即使 Vitest 主控台擷取處於靜默狀態，長時間的供應商呼叫也會顯示為活動狀態。
  - `vitest.live.config.ts` 停用 Vitest 主控台攔截，讓供應商/閘道進度行在 live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測的心跳。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test` (如果您變更很多，也執行 `pnpm test:coverage`)
- 涉及閘道網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人停機」 / 特定供應商失敗 / 工具呼叫：執行縮減的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫連線的 Android 節點目前廣告的**每個指令**，並斷言指令合約行為。
- 範圍：
  - 預先處理/手動設定（此測試套件不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點，進行逐個指令的 gateway `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連線並與 gateway 配對。
  - 應用程式保持在前景。
  - 已針對您預期會通過的功能授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳情：[Android 應用程式](/en/platforms/android)

## Live: 模型冒煙測試 (設定檔金鑰)

Live 測試分為兩層，以便我們隔離失敗原因：

- 「直接模型」告訴我們提供者/模型是否能夠使用給定的金鑰回答。
- 「Gateway 冒煙測試」告訴我們完整的 gateway + agent 管線是否適用於該模型（工作階段、歷史記錄、工具、沙盒政策等）。

### 第一層：直接模型完成（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 對每個模型執行一個小型完成（並在需要的地方執行目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（或如果直接呼叫 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，即 modern 的別名）以實際執行此測試套件；否則它會跳過，以保持 `pnpm test:live` 專注於 gateway 冒煙測試
- 如何選取模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
- 如何選取提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔的允許清單）
- 金鑰來源：
  - 預設：設定檔儲存庫和 env 後備機制
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **設定檔儲存庫**
- 存在原因：
  - 區分「供應商 API 故障 / 金鑰無效」與「閘道代理程式管線故障」
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具呼叫流程）

### 第 2 層：閘道 + 開發代理程式冒煙測試（即 "@openclaw" 實際執行的操作）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內閘道
  - 建立/修補 `agent:dev:*` 工作階段（每次執行覆寫模型）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義」的回應（無工具）
    - 真實工具呼叫正常運作（讀取探測）
    - 可選的額外工具探測（執行+讀取探測）
    - OpenAI 回歸路徑（僅工具呼叫 → 後續追蹤）持續正常運作
- 探測細節（以便您快速解釋失敗原因）：
  - `read` 探測：測試在工作區中寫入一個 nonce 檔案，並要求代理程式 `read` 它並將 nonce 回傳。
  - `exec+read` 探測：測試要求代理程式 `exec`-寫入一個 nonce 到暫存檔案，然後將其 `read` 回來。
  - 影像探測：測試附加一個生成的 PNG（貓 + 隨機代碼），並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（如果直接呼叫 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）以縮小範圍
- 如何選擇供應商（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔允許清單）
- 在此即時測試中，工具 + 影像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣佈支援影像輸入時，影像探測會執行
  - 流程（高層次）：
    - 測試生成一個帶有「CAT」+ 隨機代碼的微型 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 程式碼 (OCR 容錯：允許小幅錯誤)

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token smoke

- 測試： `src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或是貼上的 setup-token profile）能否完成 Anthropic 提示。
- 啟用：
  - `pnpm test:live` (若是直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（選擇一項）：
  - Profile： `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 token： `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（選用）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

設定範例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live：CLI 後端 smoke (Claude Code CLI 或其他本機 CLI)

- 測試： `src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，且不變更您的預設設定。
- 啟用：
  - `pnpm test:live` (若是直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 模型： `claude-cli/claude-sonnet-4-6`
  - 指令： `claude`
  - 參數： `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的圖片附件（路徑會被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 將圖片檔案路徑作為 CLI 參數傳遞，而非透過提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (或 `"list"`) 以控制設定 `IMAGE_ARG` 時圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 設定啟用（預設會以暫時的空白檔案停用 MCP 設定）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### 推薦的 Live 配方

狹窄、明確的允許清單速度最快且最不不穩定：

- 單一模型，直接連線（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke 測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的 agent 端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具特性）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API（API 金鑰 / profile 驗證）；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能有所不同（串流/工具支援/版本偏差）。

## Live：模型矩陣（我們涵蓋的範圍）

沒有固定的「CI 模型清單」（live 是選用的），但這些是**建議**在有金鑰的開發機上定期涵蓋的模型。

### 現代 smoke 測試集（工具呼叫 + 圖片）

這是我們期望持續運作的「通用模型」測試：

- OpenAI (非 Codex): `openai/gpt-5.2` (選用: `openai/gpt-5.1`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免較舊的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

使用工具 + 圖片執行 gateway smoke 測試：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 選用執行）

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可選的額外覆蓋範圍（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個你已啟用且支援「工具」的模型)
- Cerebras: `cerebras/`… (如果你有存取權限)
- LM Studio: `lmstudio/`… (本機；工具呼叫取決於 API 模式)

### Vision：圖片發送 (附件 → 多模態訊息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型 (Claude/Gemini/OpenAI 支援視覺的變體等) 以測試圖片探針。

### 聚合器 / 替代閘道

如果你已啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百個模型；使用 `openclaw models scan` 尋找支援工具+圖片的候選)
- OpenCode: 用於 Zen 的 `opencode/...` 和用於 Go 的 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多你可以包含在即時矩陣中的提供者 (如果你有憑證/設定)：

- 內建: `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 透過 `models.providers` (自訂端點): `minimax` (雲端/API)，加上任何 OpenAI/Anthropic 相容的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在你的機器上返回的內容 + 任何可用的金鑰。

## 憑證 (絕不提交)

即時測試發現憑證的方式與 CLI 相同。實際影響：

- 如果 CLI 能運作，即時測試應該也能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請按照偵錯 `openclaw models list` / 模型選擇的相同方式進行偵錯。

- 設定檔存放區：`~/.openclaw/credentials/`（首選；即測試中「profile keys」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）

如果您想依賴環境變數金鑰（例如在您的 `~/.profile` 中匯出），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram 即時（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 編碼計畫即時

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## 影像生成即時

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 範圍：
  - 列舉每個已註冊的影像生成供應商外掛程式
  - 在探測之前，從您的登入 shell（`~/.profile`）載入缺失的供應商環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 透過共享執行時功能執行標準影像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的捆綁供應商：
  - `openai`
  - `google`
- 選用縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 選用認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔存放區認證並忽略僅環境變數的覆寫

## Docker 執行器（選用的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- Live-model 運行器：`test:docker:live-models` 和 `test:docker:live-gateway` 在 repo Docker 映像內執行 `pnpm test:live`，掛載您的本機設定目錄和工作區（並在已掛載時載入 `~/.profile`）。
- Container smoke 運行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network` 和 `test:docker:plugins` 會啟動一或多個真實容器並驗證更高層級的整合路徑。

Live-model Docker 運行器也只會 bind-mount 所需的 CLI 認證主目錄（或在執行範圍未縮減時掛載所有支援的目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以重新整理權杖，而無需變更主機認證儲存庫：

- Direct models：`pnpm test:docker:live-models` （腳本：`scripts/test-live-models-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway` （腳本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI live smoke：`pnpm test:docker:openwebui` （腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding wizard（TTY、完整腳手架）：`pnpm test:docker:onboard` （腳本：`scripts/e2e/onboard-docker.sh`）
- Gateway 網路（兩個容器、WS 認證 + 健康檢查）：`pnpm test:docker:gateway-network` （腳本：`scripts/e2e/gateway-network-docker.sh`）
- 外掛（安裝 smoke + `/plugin` 別名 + Claude-bundle 重新啟動語意）：`pnpm test:docker:plugins` （腳本：`scripts/e2e/plugins-docker.sh`）

live-model Docker 執行器也會將目前的 checkout 以唯讀方式 bind-mount，
並將其暫存至容器內的暫時工作目錄中。這讓執行時映像檔保持精簡，
同時仍能針對您確切的本地端來源/設定執行 Vitest。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，使 gateway live probes 不會在
容器內啟動真實的 Telegram/Discord 等通道工作者。
`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要
縮小或排除該 Docker 路徑中的 gateway live 涵蓋範圍時，也請傳遞
`OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是較高層級的相容性檢測：它會啟動一個
啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，
對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，
驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的
`/api/chat/completions` 代理程式傳送真實的聊天請求。
第一次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，
且 Open WebUI 可能需要完成其自身的冷啟動設定。
此路徑需要可用的 live model 金鑰，而 `OPENCLAW_PROFILE_FILE`
（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。
成功的執行會列印出一個小型 JSON 載荷，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。

手動 ACP 自然語言執行緒檢測（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本用於迴歸/除錯工作流程。因為再次進行 ACP 執行緒路由驗證時可能會用到它，所以請勿刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前載入
- `$HOME` 下的外部 CLI 認證目錄會以唯讀方式掛載至 `/host-auth/...` 下，然後在測試開始前複製到 `/home/node/...` 中
  - 預設：掛載所有支援的目錄 (`.codex`、`.claude`、`.qwen`、`.minimax`)
  - 縮小範圍的提供者執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的必要目錄
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 來縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內過濾提供者
- 使用 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 確保憑證來自設定檔存放區（而非環境變數）
- 使用 `OPENCLAW_OPENWEBUI_MODEL=...` 選擇針對 Open WebUI 煙霧測試由 Gateway 公開的模型
- 使用 `OPENCLAW_OPENWEBUI_PROMPT=...` 覆寫 Open WebUI 煙霧測試所使用的 nonce-check 提示詞
- 使用 `OPENWEBUI_IMAGE=...` 覆寫固定的 Open WebUI 映像檔標籤

## 文件健全性檢查

編輯文件後執行文件檢查：`pnpm docs:list`。

## 離線回歸測試 (CI-safe)

這些是沒有真實提供者的「真實管線」回歸測試：

- Gateway 工具呼叫 (模擬 OpenAI、真實 Gateway + Agent 迴圈)：`src/gateway/gateway.test.ts` (案例："runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`，寫入設定檔 + 執行驗證)：`src/gateway/gateway.test.ts` (案例："runs wizard over ws and writes auth token config")

## Agent 可靠性評估 (Skills)

我們已經有一些行為類似於「Agent 可靠性評估」的 CI-safe 測試：

- 透過真實 Gateway + Agent 迴圈進行模擬工具呼叫 (`src/gateway/gateway.test.ts`)。
- 驗證連線與設定效果的端對端精靈流程 (`src/gateway/gateway.test.ts`)。

Skills 仍缺少的功能 (請參閱 [Skills](/en/tools/skills))：

- **決策：** 當提示詞中列出了 Skills 時，Agent 是否會選擇正確的 Skill（或避免無關的 Skill）？
- **合規性：** Agent 在使用前是否會讀取 `SKILL.md` 並遵循必要步驟/參數？
- **工作流程合約：**斷言工具順序、會話歷史傳遞以及沙箱邊界的多輪對話場景。

未來的評估應首先保持確定性：

- 使用模擬提供者來斷言工具呼叫 + 順序、技能檔案讀取以及會話連線的場景執行器。
- 一小套以技能為導向的場景（使用與避免、閘控、提示注入）。
- 僅在 CI 安全的套件就位後，才進行選用的即時評估（選擇加入、環境閘控）。

## 合約測試（外掛與頻道形狀）

合約測試驗證每個已註冊的外掛和頻道是否符合其介面合約。它們會遍歷所有發現的外掛，並執行一系列形狀和行為斷言。

### 指令

- 所有合約： `pnpm test:contracts`
- 僅限頻道合約： `pnpm test:contracts:channels`
- 僅限提供者合約： `pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本的外掛形狀（id、名稱、功能）
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息 Payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - 執行緒 ID 處理
- **directory** - 目錄/名單 API
- **group-policy** - 群組原則強制執行
- **status** - 頻道狀態探測
- **registry** - 外掛註冊表形狀

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛探索
- **loader** - 外掛載入
- **runtime** - 提供者執行時
- **shape** - 外掛形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 在變更 plugin-sdk 匯出或子路徑之後
- 在新增或修改頻道或提供者外掛之後
- 在重構外掛註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試（指導）

當您修正在即時測試中發現的提供者/模型問題時：

- 如果可能，請新增 CI 安全的回歸測試（模擬/樁提供者，或捕獲精確的請求形狀轉換）
- 如果它本質上僅限即時（速率限制、驗證原則），請保持即時測試狹窄，並透過環境變數選擇加入
- 優先以能抓出 bug 的最小層級為目標：
  - provider request conversion/replay bug → direct models test
  - gateway session/history/tool pipeline bug → gateway live smoke 或 CI-safe gateway mock test
- SecretRef traversal guardrail：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從 registry metadata (`listSecretTargetRegistryEntries()`) 為每個 SecretRef class 推導出一個取樣目標，然後斷言 traversal-segment exec ids 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了 `includeInPlan` SecretRef target family，請在該測試中更新 `classifyTargetClass`。該測試會在未分類的 target ids 上故意失敗，以免新類別被無聲略過。
