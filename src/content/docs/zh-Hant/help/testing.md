---
summary: "測試套件：單元/E2E/Live 套件、Docker 執行器，以及每個測試涵蓋的內容"
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

- 完整閘道（推送前預期執行）：`pnpm build && pnpm check && pnpm test`
- 在資源充足的機器上更快的本機完整套件執行：`pnpm test:max`
- 直接 Vitest 監視迴圈：`pnpm test:watch`
- 直接檔案目標現在也會路由擴充功能/通道路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Docker 支援的 QA 站台：`pnpm qa:lab:up`

當您觸及測試或需要額外的信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當偵錯真實的供應商/模型時（需要真實的憑證）：

- Live 套件（模型 + Gateway 工具/圖像探測）：`pnpm test:live`
- 靜靜地目標指向一個 Live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：當您只需要一個失敗的案例時，建議透過下面描述的允許清單環境變數來縮小 Live 測試範圍。

## 測試套件（什麼在哪裡執行）

將這些套件視為「增加真實性」（以及增加不穩定性/成本）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：在現有的範圍 Vitest 專案上進行十次連續分片執行（`vitest.full-*.config.ts`）
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的 core/unit 清單，以及由 `vitest.unit.config.ts` 涵蓋的已列入白名單的 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（Gateway 驗證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實的金鑰
  - 應該快速且穩定
- 專案備註：
  - 無目標 `pnpm test` 現在運行十一個較小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這減少了負載機器上的峰值 RSS，並避免自動回覆/擴充功能工作導致不相關的測試套件飢餓。
  - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監視迴圈不切實際。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先透過限定範圍的通道路由明確的檔案/目錄目標，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
  - 當差異僅涉及可路由的原始碼/測試檔案時，`pnpm test:changed` 會將變更的 git 路徑擴充為相同的限定範圍通道；配置/設定編輯仍會回退到廣泛的根專案重新執行。
  - 選定的 `plugin-sdk` 和 `commands` 測試也會透過跳過 `test/setup-openclaw-runtime.ts` 的專用輕量級通道路由；有狀態/運行時繁重的檔案保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` 輔助原始碼檔案也會將變更模式執行映射到這些輕量級通道中的明確同層級測試，因此輔助編輯可避免為該目錄重新執行完整的繁重測試套件。
  - `auto-reply` 現在三個專用的貯體：頂層核心輔助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這可使最繁重的回覆裝置工作與廉價的狀態/區塊/符號測試分開。
- 嵌入式執行器備註：
  - 當您變更 message-tool 探索輸入或壓縮運行時上下文時，
    請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界新增專注的輔助迴歸測試。
  - 同時也要保持嵌入式執行器整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 以及
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證範圍 ID 和壓縮行為仍然流經真實的 `run.ts` / `compact.ts` 路徑；僅包含輔助函式的測試不足以替代這些整合路徑。
- Pool 說明：
  - 基礎 Vitest 設定現已預設為 `threads`。
  - 共用的 Vitest 設定也修正了 `isolate: false`，並在根專案、e2e 和 live 設定中使用非隔離執行器。
  - 根 UI 通道保留其 `jsdom` 設定和最佳化工具，但現在同樣在共用的非隔離執行器上執行。
  - 每個 `pnpm test` 分片都會從共用的 Vitest 設定繼承相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在預設也會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本機執行期間的 V8 編譯變動。如果您需要與原生 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本機迭代說明：
  - 當變更的路徑清楚地對應到較小的套件時，`pnpm test:changed` 會透過範圍通道進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 Worker 上限。
  - 本機 Worker 自動擴展現在是有意採取保守策略的，並且在主機平均負載已經很高時會退讓，因此預設情況下，多個並發的 Vitest 執行造成的影響會較小。
  - 基礎 Vitest 設定會將專案/設定檔標記為 `forceRerunTriggers`，以便當測試連線變更時，變更模式下的重新執行保持正確。
  - 該設定會在支援的主機上保持啟用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您想要一個明確的快取位置以進行直接效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能除錯說明：
  - `pnpm test:perf:imports` 會啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 會將相同的分析檢視範圍縮小至自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由的 `test:changed` 與該提交差異的原生根專案路徑進行比較，並輸出執行時間以及 macOS 最大 RSS。
- `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs` 和根 Vitest 設定路由變更的檔案清單，來對當前的髒樹進行基準測試。
  - `pnpm test:perf:profile:main` 寫入主要執行緒 CPU 設定檔，用於 Vitest/Vite 啟動和轉換開銷。
  - `pnpm test:perf:profile:runner` 寫入單元套件的執行器 CPU 和記憶體堆積設定檔，並停用檔案並行處理。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用具有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應工作行程 (CI：最多 2 個，本機：預設 1 個)。
  - 預設以靜默模式執行，以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 以強制工作行程數量 (上限為 16)。
  - `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細的主控台輸出。
- 範圍：
  - 多重執行個體 gateway 端對端行為
  - WebSocket/HTTP 介面、節點配對和較重的網路操作
- 預期：
  - 在 CI 中執行 (當在 pipeline 中啟用時)
  - 不需要真實的金鑰
  - 比單元測試有更多運作部件 (可能會較慢)

### E2E: OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫時的本機 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙箱 fs 橋接器驗證遠端正規檔案系統行為
- 預期：
  - 僅供選擇性加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及運作中的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，然後摧毀測試 gateway 和沙箱
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 套件時啟用測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實的供應商 + 真實的模型)

- 指令： `pnpm test:live`
- 設定： `vitest.live.config.ts`
- 檔案： `src/**/*.live.test.ts`
- 預設：透過 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型在擁有真實憑證的 _今天_ 是否真的能運作？」
  - 發現供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上非 CI 穩定 (真實網路、真實供應商政策、配額、當機)
  - 花費金錢 / 使用速率限制
  - 建議執行縮小的子集，而非「所有項目」
- Live 執行來源 `~/.profile` 以取得遺失的 API 金鑰。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將設定/驗證資料複製到暫時的測試主目錄，因此單元裝置無法變更您的真實 `~/.openclaw`。
- 僅當您刻意需要 Live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，但隱藏額外的 `~/.profile` 通知並靜音閘道啟動日誌/Bonjour 閒聊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換 (特定供應商)：以逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、 `*_API_KEY_2` (例如 `OPENAI_API_KEYS`、 `ANTHROPIC_API_KEYS`、 `GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行 per-live 覆寫；測試會在收到速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會向 stderr 發出進度行，因此即使當 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能明確顯示其活動狀態。
  - `vitest.live.config.ts` 停用 Vitest 主控台攔截，以便供應商/閘道進度行在 Live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更很多，則加上 `pnpm test:coverage`）
- 涉及 gateway 網路 / WS 協定 / 配對：加入 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 特定提供者失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫連線的 Android 節點目前**廣告的所有指令**，並斷言指令合約行為。
- 範圍：
  - 前置條件/手動設定（該測試套件不會安裝/執行/配對應用程式）。
  - 針對所選 Android 節點逐一進行 gateway `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連線並配對至 gateway。
  - 應用程式保持在前台。
  - 已針對您預期會通過的功能授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定細節：[Android App](/en/platforms/android)

## Live：model smoke（設定檔金鑰）

Live 測試分為兩層，以便我們隔離失敗：

- 「Direct model」告訴我們提供者/模型是否能使用給定金鑰回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線對該模型是否正常運作（工作階段、歷史記錄、工具、沙盒原則等）。

### 第 1 層：Direct model 完成作業（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一個小型完成作業（並視需要進行目標迴歸測試）
- 如何啟用：
  - `pnpm test:live`（若直接叫用 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，現代版的別名）以實際執行此測試套件；否則會跳過，讓 `pnpm test:live` 專注於 gateway smoke
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔的允許清單）
- 金鑰來源：
  - 預設值：profile store 與 env 後備機制
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 存在原因：
  - 將「供應商 API 損壞 / 金鑰無效」與「gateway agent pipeline 損壞」區分開來
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重放 + tool-call 流程）

### 第 2 層：Gateway + dev agent smoke（"@openclaw" 實際執行的操作）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內的 gateway
  - 建立/修補 `agent:dev:*` session（每次執行時覆寫模型）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的工具調用運作正常（read 探針）
    - 可選的額外工具探針（exec+read 探針）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續運作
- 探針細節（以便您可以快速解釋失敗原因）：
  - `read` 探針：測試在工作區中寫入一個 nonce 檔案，並要求 agent `read` 該檔案並將 nonce 回傳。
  - `exec+read` 探針：測試要求 agent `exec`-write 一個 nonce 到暫存檔案，然後 `read` 回來。
  - 影像探針：測試附加一個生成的 PNG（貓 + 隨機代碼），並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設值：現代允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）以縮小範圍
- 如何選擇提供者（避免「全用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (逗號允許清單)
- 在此即時測試中，工具 + 圖像探測始終處於開啟狀態：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援圖像輸入時，會執行圖像探測
  - 流程（高層級）：
    - 測試會生成一個標有「CAT」+ 隨機代碼的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容差：允許輕微錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：CLI 後端冒煙測試（Claude、Codex、Gemini 或其他本地 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI 後端驗證 Gateway + 代理流程，且不接觸您的預設配置。
- 特定後端的冒煙測試預設值與擁有擴充功能的 `cli-backend.ts` 定義放在一起。
- 啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設提供者/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/圖像行為來自擁有 CLI 後端的外掛程式中繼資料。
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以發送真實圖像附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖像檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (或 `"list"`) 用於控制設定 `IMAGE_ARG` 時圖像參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以停用預設的 Claude Sonnet -> Opus 同工作階段連續性探測（當選取的模型支援切換目標時，設定為 `1` 可強制啟用）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 配方：

```bash
pnpm test:docker:live-cli-backend
```

單一供應商 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會以非 root 使用者 `node` 的身分，在儲存庫 Docker 映像檔內執行即時 CLI 後端冒煙測試。
- 它會解析擁有擴充功能的 CLI 冒煙測試中繼資料，然後將符合的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 的快取可寫入前綴中（預設：`~/.cache/openclaw/docker-cli-tools`）。
- 即時 CLI 後端冒煙測試現在會對 Claude、Codex 和 Gemini 執行相同的端對端流程：文字輪次、影像分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設冒煙測試也會將工作階段從 Sonnet 修補至 Opus，並驗證恢復的工作階段仍然記得先前的註記。

## 即時：ACP 繫結冒煙測試（`/acp spawn ... --bind here`）

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用即時 ACP 代理程式驗證真實的 ACP 對話繫結流程：
  - 發送 `/acp spawn <agent> --bind here`
  - 將合成訊息通道對話繫結到位
  - 在該同一對話上發送一般的後續訊息
  - 驗證後續訊息會出現在繫結的 ACP 工作階段記錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP 代理程式：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP 代理程式：`claude`
  - 合成通道：Slack DM 風格的對語內容
  - ACP 後端：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 備註：
  - 此通道使用具有僅限管理員的合成 originating-route 欄位的 gateway `chat.send` 介面，以便測試可以在無需假裝外部投遞的情況下附加 message-channel 上下文。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌的 `acpx` 外掛程式的內建代理程式註冊表，用於選定的 ACP 載具代理程式。

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
pnpm test:docker:live-acp-bind:gemini
```

Docker 說明：

- Docker 執行器位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序針對所有支援的即時 CLI 代理程式執行 ACP 綁定冒煙測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮小範圍。
- 它會來源 `~/.profile`，將匹配的 CLI 認證資料暫存到容器中，將 `acpx` 安裝到可寫入的 npm 前綴中，然後如果缺少請求的即時 CLI（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`），則安裝它們。
- 在 Docker 內部，執行器會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保持來源設定檔中的提供者環境變數可供子載具 CLI 使用。

### 推薦的即時配方

狹窄、明確的允許列表是最快且最不不穩定的：

- 單一模型，直接（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway 冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個提供者的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

說明：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的代理程式端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的認證 + 工具怪癖)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 設定檔認證)；這就是大多數使用者所說的「Gemini」。
  - CLI：OpenClaw 會呼叫本地的 `gemini` 二進位檔；它有自己的驗證機制，且行為可能有所不同（串流/工具支援/版本偏差）。

## Live：模型矩陣（我們涵蓋的範圍）

沒有固定的「CI 模型清單」（live 是選用的），但這些是**建議**在擁有金鑰的開發機上定期涵蓋的模型。

### 現代煙霧測試集（工具呼叫 + 圖片）

這是我們預期持續運作的「通用模型」執行：

- OpenAI (非 Codex)：`openai/gpt-5.4`（選用：`openai/gpt-5.4-mini`）
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview`（避免較舊的 Gemini 2.x 模型）
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

執行包含工具 + 圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 選用執行）

每個提供商系列至少選擇一個：

- OpenAI：`openai/gpt-5.4`（或 `openai/gpt-5.4-mini`）
- Anthropic：`anthropic/claude-opus-4-6`（或 `anthropic/claude-sonnet-4-6`）
- Google：`google/gemini-3-flash-preview`（或 `google/gemini-3.1-pro-preview`）
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

選用的額外涵蓋範圍（最好有）：

- xAI：`xai/grok-4`（或最新可用版本）
- Mistral：`mistral/`…（選擇一個您已啟用的支援「工具」的模型）
- Cerebras：`cerebras/`…（如果您有存取權）
- LM Studio：`lmstudio/`…（本地；工具呼叫取決於 API 模式）

### 視覺：圖片發送（附件 → 多模態訊息）

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試圖片探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具和圖像功能的候選模型)
- OpenCode: Zen 版本為 `opencode/...`，Go 版本為 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多您可以包含在即時矩陣中的提供商（如果您有憑證/配置）：

- 內建：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何相容 OpenAI/Anthropic 的代理 (LM Studio, vLLM, LiteLLM 等)

提示：不要試圖在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上返回的任何內容 + 可用的任何金鑰。

## 憑證 (切勿提交)

即時測試發現憑證的方式與 CLI 相同。實際影響：

- 如果 CLI 可以運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」(無憑證)，請像調試 `openclaw models list` / 模型選擇那樣進行調試。

- 每個代理的驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (這就是即時測試中「profile keys」的含義)
- 配置：`~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 舊版狀態目錄：`~/.openclaw/credentials/` (如果存在，會複製到暫存的即時主目錄中，但不是主要的設定檔金鑰儲存區)
- Live 本地執行預設會將活動配置、每個代理程式的 `auth-profiles.json` 檔案、舊版 `credentials/` 以及支援的外部 CLI 認證目錄複製到暫存測試主目錄中；staged live homes 會跳過 `workspace/` 和 `sandboxes/`，並會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以便探測程式不會接觸到您真實的主機工作區。

如果您想要依賴環境金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live (音訊轉錄)

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 執行內建的 comfy 圖片、影片和 `music_generate` 路徑
  - 除非已設定 `models.providers.comfy.<capability>`，否則會跳過每個功能
  - 在變更 comfy workflow 提交、輪詢、下載或外掛程式註冊後很有用

## 影像生成 live

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 測試工具：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的影像生成供應商外掛程式
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入遺失的供應商環境變數
  - 預設優先使用 live/env API 金鑰而非已儲存的認證設定檔，因此 `auth-profiles.json` 中過期的測試金鑰不會掩蓋真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 透過共享執行時功能執行庫存影像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的內建供應商：
  - `openai`
  - `google`
- 選用縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用於強制執行設定檔儲存驗證並忽略僅限環境變數的覆寫

## 音樂生成即時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 測試共享打包的音樂生成提供者路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前，從您的登入 shell 載入提供者環境變數 (`~/.profile`)
  - 預設優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會掩蓋真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 當可用時，執行兩個宣告的執行時模式：
    - `generate` 僅使用提示輸入
    - 當提供者宣告 `capabilities.edit.enabled` 時執行 `edit`
  - 目前共享通道覆蓋率：
    - `google`： `generate`， `edit`
    - `minimax`： `generate`
    - `comfy`： 獨立的 Comfy 即時檔案，而非此共享掃描
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 用於強制執行設定檔儲存驗證並忽略僅限環境變數的覆寫

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media video`
- 範圍：
  - 測試共享打包的影片生成提供者路徑
  - 在探測之前，從您的登入 shell 載入提供者環境變數 (`~/.profile`)
  - 預設優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會掩蓋真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 當可用時，執行兩個宣告的執行時模式：
    - `generate` 僅使用提示輸入
    - `imageToVideo` 當提供者聲明 `capabilities.imageToVideo.enabled` 且選定的提供者/模型在共享掃描中接受緩衝區支援的本機影像輸入時
    - `videoToVideo` 當提供者聲明 `capabilities.videoToVideo.enabled` 且選定的提供者/模型在共享掃描中接受緩衝區支援的本機影片輸入時
  - 共享掃描中目前已聲明但跳過的 `imageToVideo` 提供者：
    - `vydra` 因為捆綁的 `veo3` 僅支援文字，且捆綁的 `kling` 需要遠端影像 URL
  - 特定提供者的 Vydra 涵蓋範圍：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案會執行 `veo3` 文字轉影片，以及預設使用遠端影像 URL 設定的 `kling` 通道
  - 目前的 `videoToVideo` 即時涵蓋範圍：
    - `runway` 僅當選定的模型為 `runway/gen4_aleph` 時
  - 共享掃描中目前已聲明但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前的共享 Gemini/Veo 通道使用本機緩衝區支援輸入，而該路徑在共享掃描中不被接受
    - `openai`，因為目前的共享通道缺乏組織特定的影片重繪/重混存取權限保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存驗證，並忽略僅限環境變數的覆蓋設定

## 媒體即時測試工具

- 指令：`pnpm test:live:media`
- 用途：
  - 透過一個儲存庫原生進入點執行共享的影像、音樂和影片即時測試套件
  - 從 `~/.profile` 自動載入缺少的提供者環境變數
  - 預設自動將每個套件縮小範圍至目前具有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（可選的「適用於 Linux」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器： `test:docker:live-models` 和 `test:docker:live-gateway` 僅在 repo Docker 映像檔內執行其對應的 profile-key 即時檔案（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），掛載您的本機設定目錄和工作區（並在已掛載時載入 `~/.profile`）。對應的本機進入點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設為較小的 smoke 上限，以便完整的 Docker 巡查保持實用性：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確想要進行較大的詳盡掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次即時 Docker 映像檔，然後在兩個即時 Docker 通道中重複使用它。
- 容器 smoke 執行器： `test:docker:openwebui`、 `test:docker:onboard`、 `test:docker:gateway-network`、 `test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一或多個真實容器並驗證更高層級的整合路徑。

即時模型 Docker 執行器也只會掛載所需的 CLI auth 家目錄（或在執行範圍未縮小時掛載所有支援的目錄），然後在執行前將其複製到容器家目錄中，以便外部 CLI OAuth 可以重新整理權杖，而無需變更主機 auth 儲存區：

- 直接模型： `pnpm test:docker:live-models` （指令碼： `scripts/test-live-models-docker.sh`）
- ACP 繫結 smoke： `pnpm test:docker:live-acp-bind` （指令碼： `scripts/test-live-acp-bind-docker.sh`）
- CLI 後端 smoke： `pnpm test:docker:live-cli-backend` （指令碼： `scripts/test-live-cli-backend-docker.sh`）
- Gateway + 開發代理程式： `pnpm test:docker:live-gateway` （指令碼： `scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 即時冒煙測試： `pnpm test:docker:openwebui` (腳本： `scripts/e2e/openwebui-docker.sh`)
- 入門嚮導 (TTY，完整腳手架)： `pnpm test:docker:onboard` (腳本： `scripts/e2e/onboard-docker.sh`)
- Gateway 網路功能 (兩個容器，WS 驗證 + 健康檢查)： `pnpm test:docker:gateway-network` (腳本： `scripts/e2e/gateway-network-docker.sh`)
- MCP 頻道橋接器 (已設置的 Gateway + stdio 橋接器 + 原始 Claude 通知框架冒煙測試)： `pnpm test:docker:mcp-channels` (腳本： `scripts/e2e/mcp-channels-docker.sh`)
- 外掛程式 (安裝冒煙測試 + `/plugin` 別名 + Claude-bundle 重啟語意)： `pnpm test:docker:plugins` (腳本： `scripts/e2e/plugins-docker.sh`)

即時模型 Docker 執行器也會以唯讀方式綁定掛載目前的檢出，並將其暫存到容器內的暫時工作目錄中。這在保持執行時映像檔精簡的同時，仍能針對您確切的本地來源/設定執行 Vitest。暫存步驟會跳過大型本地快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本地的 `.build` 或 Gradle 輸出目錄，因此 Docker 即時執行不會花費數分鐘複製特定於機器的產出資料。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便閘道即時探測不會在容器內啟動真實的 Telegram/Discord/等頻道工作程式。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 管道縮小或排除閘道即時覆蓋範圍時，請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高階的相容性冒煙測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw 閘道容器，針對該閘道啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理程式傳送真實的聊天請求。
第一次執行可能會明顯變慢，因為 Docker 可能需要提取 Open WebUI 映像檔，且 Open WebUI 可能需要完成自身的冷啟動設定。
此管道需要可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。
成功的執行會列印一個小型 JSON 載荷，如 `{ "ok": true, "model": "openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳號。它會啟動一個植入種子的 Gateway 容器，啟動一個產生 `openclaw mcp serve` 的第二個容器，然後透過真實的 stdio MCP 橋接器驗證路由對話探索、逐字稿讀取、附件元資料、即時事件佇列行為、輸出發送路由，以及 Claude 風格的頻道和權限通知。通知檢查會直接檢查原始 stdio MCP 幀，因此冒煙測試會驗證橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 恰好公開的內容。

手動 ACP 平實語言 thread smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 將此腳本保留用於迴歸/除錯工作流程。未來可能需要再次用於 ACP thread 路由驗證，因此請勿刪除。

實用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` （預設： `~/.openclaw`） 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` （預設： `~/.openclaw/workspace`） 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` （預設： `~/.profile`） 掛載至 `/home/node/.profile` 並在執行測試前 source
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` （預設： `~/.cache/openclaw/docker-cli-tools`） 掛載至 `/home/node/.npm-global` 以供 Docker 內部快取的 CLI 安裝
- `$HOME` 下的外部 CLI auth 目錄/檔案以唯讀方式掛載於 `/host-auth...`，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄： `.minimax`
  - 預設檔案： `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 縮小的 provider 執行只掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, 或逗號分隔列表如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 手動覆寫
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內過濾 provider
- 使用 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 確認認證來自 profile store（而非 env）
- 使用 `OPENCLAW_OPENWEBUI_MODEL=...` 選擇 gateway 為 Open WebUI smoke 提供的模型
- 使用 `OPENCLAW_OPENWEBUI_PROMPT=...` 覆寫 Open WebUI smoke 使用的 nonce-check 提示
- 使用 `OPENWEBUI_IMAGE=...` 覆寫固定的 Open WebUI 映像標籤

## Docs sanity

在編輯文檔後運行文檔檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，運行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試（CI 安全）

這些是不包含真實提供商的「真實管道」回歸測試：

- Gateway 工具調用（模擬 OpenAI，真實 gateway + agent 循環）：`src/gateway/gateway.test.ts`（案例：「透過 gateway agent 循環端到端運行模擬的 OpenAI 工具調用」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入配置 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「透過 ws 運行精靈並寫入 auth token 配置」）

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 循環進行模擬工具調用（`src/gateway/gateway.test.ts`）。
- 驗證會話連線和配置效果的端到端精靈流程（`src/gateway/gateway.test.ts`）。

技能方面仍然缺失的部分（請參閱 [Skills](/en/tools/skills))：

- **決策：**當技能在提示中列出時，agent 會選擇正確的技能（或避免不相關的技能）嗎？
- **合規性：**agent 在使用前是否會閱讀 `SKILL.md` 並遵循所需的步驟/參數？
- **工作流程契約：**斷言工具順序、會話歷史傳遞和沙箱邊界的多輪次場景。

未來的評估應首先保持確定性：

- 使用模擬提供商來斷言工具調用 + 順序、技能檔案讀取和會話連線的場景運行器。
- 一套專注於技能的場景（使用 vs 避免、閘控、提示注入）。
- 僅在 CI 安全套件就位後，才進行可選的即時評估（選擇加入、環境閘控）。

## 契約測試（外掛和頻道形狀）

契約測試驗證每個已註冊的外掛和頻道是否符合其
介面契約。它們會遍歷所有發現的外掛並運行一組
形狀和行為斷言。預設的 `pnpm test` 單元通道故意
跳過這些共享的接縫和冒煙檔案；當您接觸共享頻道或提供者介面時，請明確運行契約命令。

### 命令

- 所有契約：`pnpm test:contracts`
- 僅限頻道契約：`pnpm test:contracts:channels`
- 僅限 Provider 契約：`pnpm test:contracts:plugins`

### Channel 契約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀 (id, name, capabilities)
- **setup** - 設定精靈契約
- **session-binding** - Session 繫結行為
- **outbound-payload** - 訊息載荷結構
- **inbound** - 傳入訊息處理
- **actions** - Channel 動作處理程式
- **threading** - Thread ID 處理
- **directory** - Directory/roster API
- **group-policy** - 群組原則執行

### Provider 狀態契約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - Channel 狀態探測
- **registry** - 外掛登錄形狀

### Provider 契約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - Auth 流程契約
- **auth-choice** - Auth 選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛探索
- **loader** - 外掛載入
- **runtime** - Provider 執行時
- **shape** - 外插件狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑後
- 新增或修改 channel 或 provider 外掛後
- 重構外掛註冊或探索後

契約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試 (指導原則)

當您修正在 live 中發現的 provider/model 問題時：

- 如果可能，請加入 CI 安全的回歸測試 (mock/stub provider，或擷取確切的請求形狀轉換)
- 如果本質上僅限 live (速率限制、auth 原則)，請保持 live 測試狹窄並透過 env 變數選擇加入
- 優先針對捕捉到錯誤的最小層級：
  - provider 請求轉換/重放錯誤 → 直接模型測試
  - gateway session/history/tool 管線錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍歷防護措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄資料 (`listSecretTargetRegistryEntries()`) 推導每個 SecretRef 類別的一個抽樣目標，然後斷言遍歷區段 exec id 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 id 上刻意失敗，以免新類別被無聲略過。
