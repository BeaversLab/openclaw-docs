---
summary: "測試套件：unit/e2e/live 測試組、Docker 執行器，以及每個測試的涵蓋範圍"
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

- 完整檢查（推送前預期執行）：`pnpm build && pnpm check && pnpm test`
- 在效能充足的機器上進行更快的本地完整測試組執行：`pnpm test:max`
- 直接 Vitest 監看迴圈：`pnpm test:watch`
- 直接指定檔案現在也會路由 extension/channel 路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您正在處理單一失敗時，優先使用指定範圍的執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您接觸測試或需要更多信心時：

- 覆蓋率檢查：`pnpm test:coverage`
- E2E 測試組：`pnpm test:e2e`

當除錯真實的提供商/模型時（需要真實憑證）：

- Live 測試組（模型 + gateway tool/image probes）：`pnpm test:live`
- 靜默指定一個 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：當您只需要一個失敗案例時，建議優先使用下方描述的 allowlist 環境變數來縮小 live 測試範圍。

## QA 專用執行器

當您需要 QA 實驗室的真實感時，這些指令位於主要測試組旁邊：

- `pnpm openclaw qa suite`
  - 直接在主機上執行儲存庫支援的 QA 情境。
  - 預設情況下，使用隔離的 gateway worker 並行執行多個選定的情境，最多 64 個 worker 或選定的情境數量。使用
    `--concurrency <count>` 調整 worker 數量，或使用 `--concurrency 1` 進行
    舊的序列通道執行。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 內執行相同的 QA 測試組。
  - 保持與主機上的 `qa suite` 相同的情境選擇行為。
  - 重用與 `qa suite` 相同的提供商/模型選擇旗標。
  - Live 執行會轉發客端實用的受支援 QA 認證輸入：
    基於環境變數的提供商金鑰、QA live 提供者設定路徑，以及當存在時的 `CODEX_HOME`。
  - 輸出目錄必須保持在儲存庫根目錄下，以便客端可以透過掛載的工作區寫回。
  - 在 `.artifacts/qa-e2e/...` 下寫入正常的 QA 報告 + 摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動支援 Docker 的 QA 網站，用於操作員風格的 QA 工作。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA 通道。
  - 佈建三個暫時的 Matrix 使用者 (`driver`, `sut`, `observer`) 加上一個私人聊天室，然後啟動一個 QA gateway 子進程，並使用真實的 Matrix 外掛作為 SUT 傳輸。
  - 預設使用固定的穩定 Tuwunel 映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。當您需要測試不同的映像檔時，請使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 進行覆寫。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Matrix QA 報告、摘要和觀察到的事件 artifact。
- `pnpm openclaw qa telegram`
  - 使用來自環境變數的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數位聊天 ID。
  - 需要在同一個私人群組中有兩個不同的機器人，且 SUT 機器人公開了 Telegram 使用者名稱。
  - 為了穩定的機器人對機器人觀察，請在 `@BotFather` 中為兩個機器人啟用 Bot-to-Bot 通訊模式，並確保驅動程式機器人可以觀察群組機器人流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察到的訊息 artifact。

即時傳輸通道共用一個標準合約，以確保新的傳輸方式不會偏離：

`qa-channel` 仍是廣泛的合成 QA 測試套件，並非即時傳輸覆蓋矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | 許可白名單區塊 | 頂層回覆 | 重啟恢復 | 串珠後續追蹤 | 串珠隔離 | 反應觀察 | 說明指令 |
| -------- | ------ | -------- | -------------- | -------- | -------- | ------------ | -------- | -------- | -------- |
| Matrix   | x      | x        | x              | x        | x        | x            | x        | x        |          |
| Telegram | x      |          |                |          |          |              |          |          | x        |

## 測試套件 (在哪裡執行什麼)

將測試套件視為「真實性遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合 (預設)

- 指令：`pnpm test`
- 設定：十個連續的分片執行 (`vitest.full-*.config.ts`)，涵蓋現有的範圍限定 Vitest 專案
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的 core/unit 清單，以及由 `vitest.unit.config.ts` 涵蓋的白名單 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway auth、routing、tooling、parsing、config）
  - 針對已知錯誤的決定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應快速且穩定
- 專案注意事項：
  - 非針對性的 `pnpm test` 現在會執行十一個較小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是單一巨大的原生根專案程序。這降低了負載機器上的峰值 RSS，並避免 auto-reply/extension 工作導致不相關的測試套件飢餓。
  - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監控迴圈不切實際。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先將明確的檔案/目錄目標路由到限定範圍的通道，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
  - 當差異僅涉及可路由的來源/測試檔案時，`pnpm test:changed` 會將變更的 git 路徑擴展為相同的限定範圍通道；config/setup 編輯仍會回退到廣泛的根專案重新執行。
  - 來自 agents、commands、plugins、auto-reply helpers、`plugin-sdk` 及類似純實用工具區域的低匯入單元測試，會透過 `unit-fast` 通道路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時繁重的檔案則保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` helper 源文件也會將變更模式執行對應到這些輕量級通道中的明確兄弟測試，因此對 helper 的編輯可以避免為該目錄重新執行完整的繁重測試套件。
  - `auto-reply` 現在有三個專用的桶：頂層核心 helpers、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這可以將最繁重的 reply harness 工作從廉價的 status/chunk/token 測試中分離出來。
- 嵌入式 runner 說明：
  - 當您變更 message-tool 發現輸入或壓縮執行時上下文時，請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界添加專注的 helper 回歸測試。
  - 同時請保持嵌入式 runner 整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證 scoped ids 和壓縮行為是否仍然流經真實的 `run.ts` / `compact.ts` 路徑；僅 helper 測試不足以替代這些整合路徑。
- Pool 說明：
  - 基礎 Vitest 設定現在預設為 `threads`。
  - 共用的 Vitest 設定也固定了 `isolate: false`，並在 root 專案、e2e 和 live 設定之間使用非隔離的 runner。
  - 根 UI 通道保留了其 `jsdom` 設定和最佳化工具，但現在也在共用的非隔離 runner 上執行。
  - 每個 `pnpm test` 分片都從共用的 Vitest 設定繼承相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在預設也會為 Vitest 子 Node 程序添加 `--no-maglev`，以減少大型本地執行期間的 V8 編譯反覆變動。如果您需要與標準 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代說明：
  - 當變更路徑乾淨地對應到較小的套件時，`pnpm test:changed` 會透過作用域通道進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 worker 上限。
  - 本機工作節點自動擴展目前刻意採用保守策略，並且當主機負載平均值已經偏高時也會退縮，因此預設情況下，多次並發執行 Vitest 造成的損害會較小。
  - 基礎 Vitest 設定會將專案/設定檔標記為 `forceRerunTriggers`，以便當測試連接變更時，變更模式下的重新執行能保持正確。
  - 此設定會在支援的主機上保持啟用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您想要一個明確的快取位置以便直接進行效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能除錯說明：
  - `pnpm test:perf:imports` 可啟用 Vitest 的匯入持續時間報告以及匯入細分輸出。
  - `pnpm test:perf:imports:changed` 將相同的效能分析範圍縮小至自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 會將路由傳送的 `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印耗時加上 macOS 最大駐留集大小 (RSS)。
- `pnpm test:perf:changed:bench -- --worktree` 會透過 `scripts/test-projects.mjs` 和根 Vitest 設定路由變更檔案清單，以此評測目前的髒樹 (dirty tree)。
  - `pnpm test:perf:profile:main` 會為 Vitest/Vite 啟動和轉換耗時寫入主執行緒 CPU 分析檔。
  - `pnpm test:perf:profile:runner` 會在停用檔案並行處理的情況下，為單元套件寫入執行器 CPU 和記憶體分析檔。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與儲存庫的其他部分相符。
  - 使用適應性工作節點 (CI：最多 2 個，本機：預設 1 個)。
  - 預設以靜默模式執行，以減少主控台 I/O 負擔。
- 有用的覆寫選項：
  - 使用 `OPENCLAW_E2E_WORKERS=<n>` 以強制指定工作節點數量 (上限為 16)。
  - 使用 `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細的主控台輸出。
- 範圍：
  - 多執行個體 Gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對和較繁重的網路操作
- 預期：
  - 在 CI 中執行 (當在管線中啟用時)
  - 不需要真正的金鑰
  - 比單元測試有更多運作部件 (可能較慢)

### E2E: OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell 閘道
  - 從暫時的本地 Dockerfile 建立沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙盒 fs 橋接器驗證遠端標準檔案系統行為
- 預期：
  - 僅選擇性加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本地 `openshell` CLI 以及可運作的 Docker daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後摧毀測試閘道和沙盒
- 有用的覆寫：
  - 手動執行更廣泛的 e2e suite 時，使用 `OPENCLAW_E2E_OPENSHELL=1` 以啟用測試
  - 使用 `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實供應商 + 真實模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設值：由 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型是否在 _今天_ 真的能透過真實憑證運作？」
  - 擷取供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定 (真實網路、真實供應商政策、配額、停機)
  - 花費金錢 / 使用速率限制
  - 優先執行縮小範圍的子集，而非「所有項目」
- Live runs 來源 `~/.profile` 以取得遺失的 API 金鑰。
- 預設情況下，live runs 仍會隔離 `HOME` 並將設定/驗證資料複製到暫時的測試家目錄，因此單元 fixture 無法變更您的真實 `~/.openclaw`。
- 僅當您刻意需要 live 測試使用您的真實家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為安靜模式：它保留 `[live] ...` 進度輸出，但隱藏額外的 `~/.profile` 通知並靜音閘道啟動日誌/Bonjour 雜訊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替 (特定供應商)：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2` (例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行個別的 live 覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會將進度行輸出到 stderr，因此即使當 Vitest 主控台擷取處於靜默狀態，長時間的供應商呼叫仍可見為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，以便供應商/閘道進度行在 live 執行期間立即串流傳輸。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試時：執行 `pnpm test` (如果您變更了許多內容，則執行 `pnpm test:coverage`)
- 涉及閘道網路功能 / WS 通訊協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人當機了」 / 特定供應商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live: Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫已連接的 Android 節點**目前廣告的所有指令**，並斷言指令合約行為。
- 範圍：
  - 預先條件/手動設定 (該測試套件不會安裝/執行/配對應用程式)。
  - 針對選定的 Android 節點進行逐個指令的閘道 `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連接並與閘道配對。
  - 應用程式保持在前景。
  - 針對您預期會通過的功能，已授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳細資訊：[Android 應用程式](/en/platforms/android)

## Live: 模型冒煙測試 (設定檔金鑰)

Live 測試分為兩個層級，以便我們隔離失敗：

- 「Direct model」告訴我們提供者/模型是否能使用給定的金鑰回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線是否對該模型正常運作（sessions、history、tools、sandbox policy 等）。

### Layer 1: Direct model completion (no gateway)

- Test: `src/agents/models.profiles.live.test.ts`
- Goal:
  - Enumerate discovered models
  - Use `getApiKeyForModel` to select models you have creds for
  - Run a small completion per model (and targeted regressions where needed)
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- Set `OPENCLAW_LIVE_MODELS=modern` (or `all`, alias for modern) to actually run this suite; otherwise it skips to keep `pnpm test:live` focused on gateway smoke
- How to select models:
  - `OPENCLAW_LIVE_MODELS=modern` to run the modern allowlist (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` is an alias for the modern allowlist
  - or `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (comma allowlist)
  - Modern/all sweeps default to a curated high-signal cap; set `OPENCLAW_LIVE_MAX_MODELS=0` for an exhaustive modern sweep or a positive number for a smaller cap.
- How to select providers:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (comma allowlist)
- Where keys come from:
  - By default: profile store and env fallbacks
  - Set `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` to enforce **profile store** only
- Why this exists:
  - Separates “provider API is broken / key is invalid” from “gateway agent pipeline is broken”
  - Contains small, isolated regressions (example: OpenAI Responses/Codex Responses reasoning replay + tool-call flows)

### Layer 2: Gateway + dev agent smoke (what "@openclaw" actually does)

- Test: `src/gateway/gateway-models.profiles.live.test.ts`
- Goal:
  - Spin up an in-process gateway
  - Create/patch a `agent:dev:*` session (model override per run)
  - Iterate models-with-keys and assert:
    - “meaningful” response (no tools)
    - a real tool invocation works (read probe)
    - optional extra tool probes (exec+read probe)
    - OpenAI regression paths (tool-call-only → follow-up) keep working
- Probe details (so you can explain failures quickly):
  - `read` probe：測試會在工作區中寫入一個 nonce 檔案，並要求 agent `read` 它並將 nonce 回傳。
  - `exec+read` probe：測試會要求 agent 將 nonce `exec`-寫入暫存檔案，然後將其 `read` 回來。
  - image probe：測試會附加一個產生的 PNG（貓 + 隨機代碼），並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（如果是直接呼叫 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：modern allowlist（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是 modern allowlist 的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）來縮小範圍
  - Modern/all gateway sweeps 預設為一個經過策劃的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 可進行完整的 modern sweep，或設定一個正數以使用較小的上限。
- 如何選擇提供者（避免「OpenRouter 全選」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔 allowlist）
- 在此 live 測試中，工具 + image probe 始終開啟：
  - `read` probe + `exec+read` probe（工具壓力測試）
  - 當模型宣稱支援圖片輸入時，會執行 image probe
  - 流程（高階）：
    - 測試產生一個帶有「CAT」+ 隨機代碼的微小 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - Embedded agent 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 該代碼（OCR 容錯：允許 minor mistakes）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` id），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：CLI backend smoke（Claude、Codex、Gemini 或其他本地 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，而不需修改您的預設配置。
- 特定於後端的冒煙測試預設值位於擁有擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live`（若直接呼叫 Vitest，則使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設提供商/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/映像檔行為來自擁有的 CLI 後端外掛程式中繼資料。
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的圖片附件（路徑會被注入至提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑當作 CLI 參數傳遞，而非透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）用於在設定 `IMAGE_ARG` 時控制圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以停用預設的 Claude Sonnet -> Opus 同一會話連續性探測（若選取的模型支援切換目標，可設定為 `1` 以強制啟用）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 食譜：

```bash
pnpm test:docker:live-cli-backend
```

單一提供商 Docker 食譜：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在存放庫 Docker 映像檔內以非 root 使用者 `node` 身分執行即時 CLI 後端冒煙測試。
- 它會從擁有的擴充功能解析 CLI 冒煙測試中繼資料，然後將相符的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝至 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過 `~/.claude/.credentials.json` 搭配 `claudeAiOauth.subscriptionType` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可移植的 Claude Code 訂閱 OAuth。它首先在 Docker 中證明直接的 `claude -p`，然後運行兩個 Gateway CLI 後端輪次，而不保留 Anthropic API 金鑰環境變數。此訂閱通道預設會停用 Claude MCP/工具和映像探測，因為 Claude 目前透過額外用量計費而非正常訂閱方案限制來路由第三方應用程式使用量。
- 即時 CLI 後端冒煙測試現在會對 Claude、Codex 和 Gemini 執行相同的端到端流程：文字輪次、映像分類輪次，然後透過 Gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設冒煙測試也會將工作階段從 Sonnet 修補為 Opus，並驗證恢復的工作階段仍記得先前的註記。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- 目標：透過即時 ACP 代理程式驗證真實的 ACP 對話綁定流程：
  - send `/acp spawn <agent> --bind here`
  - bind a synthetic message-channel conversation in place
  - send a normal follow-up on that same conversation
  - verify the follow-up lands in the bound ACP session transcript
- Enable:
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Defaults:
  - ACP agents in Docker: `claude,codex,gemini`
  - ACP agent for direct `pnpm test:live ...`: `claude`
  - Synthetic channel: Slack DM-style conversation context
  - ACP backend: `acpx`
- Overrides:
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notes:
  - 此通道使用具有僅限管理員的合成起始路由欄位的 gateway `chat.send` 介面，以便測試可以附加訊息通道內容，而無需假裝從外部遞送。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式的內建代理程式註冊表給選定的 ACP harness 代理程式。

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
- 根據預設，它會依序對所有支援的即時 CLI 代理程式執行 ACP bind smoke 測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮小範圍。
- 它會 source `~/.profile`，將符合的 CLI 認證資料暫存至容器中，將 `acpx` 安裝至可寫入的 npm 前綴，然後在缺少時安裝要求的即時 CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`)。
- 在 Docker 內部，執行器會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 將來自 sourced 設定檔的提供者環境變數提供給子 harness CLI 使用。

## Live: Codex app-server harness smoke

- 目標：透過正常的 gateway
  `agent` 方法驗證外掛程式擁有的 Codex harness：
  - 載入捆綁的 `codex` 外掛程式
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 傳送第一個 gateway agent turn 到 `codex/gpt-5.4`
  - 傳送第二個 turn 到同一個 OpenClaw 工作階段，並驗證 app-server
    thread 可以恢復
  - 透過相同的 gateway 指令
    路徑執行 `/codex status` 和 `/codex models`
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`codex/gpt-5.4`
- 選用影像探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用 MCP/tool 探測：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- smoke 測試會設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法透過靜默回退至 PI 而通過測試。
- 認證：來自 shell/profile 的 `OPENAI_API_KEY`，以及選用的複製
  `~/.codex/auth.json` 和 `~/.codex/config.toml`

本機配方：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 配方：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker 說明：

- Docker 執行程式位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會載入掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，在存在時複製 Codex CLI
  認證檔案，將 `@openai/codex` 安裝到可寫入的已掛載 npm
  前綴，暫存來源樹，然後僅執行 Codex-harness 即時測試。
- Docker 預設會啟用映像檔和 MCP/工具探測。當您需要更狹窄的除錯執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，以符合即時
  測試設定，使 `openai-codex/*` 或 PI 備援機制無法隱藏 Codex harness
  的回歸問題。

### 推薦的即時測試配方

狹窄且明確的允許清單速度最快且最穩定：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)： `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)： `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的代理端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的認證 + 工具怪癖)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 個人資料認證)；這是大多數使用者所說的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的認證，且行為可能有所不同 (串流/工具支援/版本差異)。

## 即時：模型矩陣 (涵蓋範圍)

沒有固定的「CI 模型清單」(即時為選用)，但這些是在開發機器上使用金鑰定期涵蓋的**推薦**模型。

### 現代冒煙測試集 (工具呼叫 + 映像檔)

這是我們預期能持續運作的「通用模型」執行：

- OpenAI (非 Codex)： `openai/gpt-5.4` (選用： `openai/gpt-5.4-mini`)
- OpenAI Codex： `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用較舊的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

執行包含工具 + 圖片的 gateway smoke:
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫 (Read + 選用 Exec)

每個提供商系列至少選擇一個：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

選用的額外覆蓋範圍 (最好有)：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個您已啟用的支援「工具」功能的模型)
- Cerebras: `cerebras/`… (如果您有存取權)
- LM Studio: `lmstudio/`… (本機；工具呼叫取決於 API 模式)

### 視覺：圖片發送 (附件 → 多模態訊息)

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援圖片的模型 (Claude/Gemini/OpenAI 支援視覺的變體等)，以測試圖片探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百個模型；使用 `openclaw models scan` 尋找支援工具+圖片的候選)
- OpenCode: Zen 使用 `opencode/...`，Go 使用 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多您可以加入 live matrix 的提供商 (如果您有憑證/配置)：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax` (cloud/API)，加上任何 OpenAI/Anthropic 相容的代理 (LM Studio、vLLM、LiteLLM 等)

提示：不要試圖在文件中硬編碼「所有模型」。權威清單是你的機器上 `discoverModels(...)` 回傳的任何內容 + 任何可用的金鑰。

## 憑證 (絕不要提交)

即時測試會以與 CLI 相同的方式發現憑證。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請像除錯 `openclaw models list` / 模型選擇一樣進行除錯。

- 每個代理的 auth profiles：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（這就是「profile keys」在即時測試中的意思）
- 設定：`~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 舊版狀態目錄：`~/.openclaw/credentials/`（如果存在會複製到暫存的即時目錄，但不是主要的 profile-key 儲存位置）
- 本機即時執行預設會將現用設定、每個代理的 `auth-profiles.json` 檔案、舊版 `credentials/`，以及支援的外部 CLI auth 目錄複製到暫存測試家目錄；暫存的即時家目錄會跳過 `workspace/` 和 `sandboxes/`，並且 `agents.*.workspace` / `agentDir` 路徑覆寫會被移除，以便探針不會接觸你真實的主機工作區。

如果你想依賴環境變數金鑰（例如在你的 `~/.profile` 中匯出），請在 `source ~/.profile` 之後執行本機測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live (音訊轉錄)

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus 編碼計畫即時

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 選用模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流程媒體即時

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 測試內建的 comfy 圖片、影片與 `music_generate` 路徑
  - 除非設定 `models.providers.comfy.<capability>`，否則會跳過各項功能
  - 在更動 comfy 工作流程提交、輪詢、下載或外掛程式註冊後非常有用

## 圖片生成即時

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 測試工具：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖片生成提供者外掛程式
  - 在探測前，從您的登入 shell 載入遺漏的提供者環境變數 (`~/.profile`)
  - 預設會優先使用即時/環境 API 金鑰，而非已儲存的設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供者
  - 透過共享執行時期功能執行標準圖片生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的內建提供者：
  - `openai`
  - `google`
- 選用縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 選用驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存區驗證並忽略僅限環境變數的覆寫

## 音樂生成即時

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 測試共享的內建音樂生成提供者路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測前從您的登入 shell 載入提供者環境變數 (`~/.profile`)
  - 預設優先使用 live/env API 金鑰，而非儲存的設定檔，因此 `auth-profiles.json` 中過期的測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用 auth/profile/model 的供應商
  - 可用時執行兩個宣告的執行時模式：
    - `generate` 僅使用提示詞輸入
    - 當供應商宣告 `capabilities.edit.enabled` 時執行 `edit`
  - 目前的共享通道覆蓋率：
    - `google`: `generate`、`edit`
    - `minimax`: `generate`
    - `comfy`: 獨立的 Comfy live 檔案，而非此共享掃描
- 可選篩選：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存的驗證並忽略僅 env 的覆寫

## 影片生成即時

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試套件：`pnpm test:live:media video`
- 範圍：
  - 測試共享的內建影片生成供應商路徑
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入供應商環境變數
  - 預設優先使用 live/env API 金鑰，而非儲存的設定檔，因此 `auth-profiles.json` 中過期的測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用 auth/profile/model 的供應商
  - 可用時執行兩個宣告的執行時模式：
    - `generate` 僅使用提示詞輸入
    - 當供應商宣告 `capabilities.imageToVideo.enabled` 且選定的供應商/模型在共享掃描中接受 buffer-backed 的本機圖片輸入時，執行 `imageToVideo`
    - 當供應商宣告 `capabilities.videoToVideo.enabled` 且選定的供應商/模型在共享掃描中接受 buffer-backed 的本機影片輸入時，執行 `videoToVideo`
  - 目前共享掃描中已宣告但跳過的 `imageToVideo` 供應商：
    - `vydra`，因為內建的 `veo3` 僅支援文字，而內建的 `kling` 需要遠端圖片 URL
  - 供應商特定的 Vydra 覆蓋率：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案執行 `veo3` 文字生成影片，加上一個 `kling` 軌道，預設使用遠端圖片 URL fixture
  - 目前的 `videoToVideo` 即時覆蓋率：
    - `runway` 僅在選取的模型是 `runway/gen4_aleph` 時
  - 目前共用的掃描中已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前共用的 Gemini/Veo 軌道使用本地緩衝區支援的輸入，且共用掃描不接受該路徑
    - `openai`，因為目前共用的軌道缺乏特定組織的影片修補/remix 存取權限保證
- 可選縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔存放區驗證並忽略僅限環境變數的覆蓋

## 媒體即時測試框架

- 指令：`pnpm test:live:media`
- 用途：
  - 透過一個 repo-native entrypoint 執行共用的圖片、音樂和影片即時測試套件
  - 從 `~/.profile` 自動載入遺失的提供者環境變數
  - 預設自動將每個測試套件縮小至目前擁有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式的行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在 repo Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的 profile-key 即時檔案，掛載您的本地設定目錄和工作區（並在掛載時載入 `~/.profile`）。對應的本地入口點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 執行程式預設使用較小的 smoke 上限，以便完整的 Docker 掃描保持實際：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`，
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`，
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`，和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確需要較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 live Docker 映像，然後在兩個 live Docker 通道中重複使用它。
- Container smoke 執行程式：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一個或多個真實容器並驗證更高層級的整合路徑。

live-model Docker 執行程式也僅 bind-mount 所需的 CLI auth homes (或在未縮小執行範圍時掛載所有支援的 homes)，然後在執行前將其複製到容器 home 中，以便 external-CLI OAuth 可以重新整理權杖而不會變更 host auth store：

- Direct models：`pnpm test:docker:live-models` (腳本：`scripts/test-live-models-docker.sh`)
- ACP bind smoke：`pnpm test:docker:live-acp-bind` (腳本：`scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke：`pnpm test:docker:live-cli-backend` (腳本：`scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness` (腳本：`scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent：`pnpm test:docker:live-gateway` (腳本：`scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke：`pnpm test:docker:openwebui` (腳本：`scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke)：`pnpm test:docker:mcp-channels` (腳本：`scripts/e2e/mcp-channels-docker.sh`)
- 外掛程式（安裝冒煙測試 + `/plugin` 別名 + Claude-bundle 重啟語意）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

即時模型 Docker 執行器也會以唯讀方式綁定掛載目前的檢出，並將其暫存至容器內的臨時工作目錄。這既保持了執行時映像檔的精簡，又能針對您的確切本機原始碼/設定執行 Vitest。
暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，以免 Docker 即時執行花費數分鐘時間複製機器特定的成品。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，讓 gateway 即時探測不會在容器內啟動真實的 Telegram/Discord/等頻道工作執行緒。
`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或排除該 Docker 通道的 gateway 即時覆蓋範圍時，也請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是更高層級的相容性冒煙測試：它會啟動一個啟用了 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對著該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 暴露了 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理程式傳送真實的聊天請求。
第一次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，而且 Open WebUI 可能需要完成自己的冷啟動設定。
此通道需要一個可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。
成功的執行會列印出一個小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意的確定性測試，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個帶有種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器，驗證路由的對話發現、記錄讀取、附件中繼資料、即時事件佇列行為、外寄發送路由，以及 Claude 風格的頻道與權限通知。通知檢查會直接檢查原始的 stdio MCP 幀，因此該冒煙測試驗證的是橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 恰好呈現的內容。

手動 ACP 自然語言 thread 測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本用於迴歸/除錯工作流程。ACP thread 路由驗證可能會再次需要它，因此請勿將其刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試之前載入
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設值：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 以便在 Docker 內部快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案會以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮小範圍的提供者執行只掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（例如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 來縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內過濾提供者
- 使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 重複使用現有的 `openclaw:local-live` 映像檔，以進行不需要重建的重新執行
- 使用 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 確認憑證來自設定檔存放區（而非環境變數）
- 使用 `OPENCLAW_OPENWEBUI_MODEL=...` 選擇由閘道為 Open WebUI 測試公開的模型
- 使用 `OPENCLAW_OPENWEBUI_PROMPT=...` 覆寫 Open WebUI 測試所使用的 nonce-check 提示
- 使用 `OPENWEBUI_IMAGE=...` 覆寫固定的 Open WebUI 映像檔標籤

## 文件完整性檢查

編輯文件後執行文件檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試（CI 安全）

這些是沒有真實提供者的「真實管線」回歸測試：

- Gateway 工具調用（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例："runs a mock OpenAI tool call end-to-end via gateway agent loop"）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例："runs wizard over ws and writes auth token config"）

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全的測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具調用（`src/gateway/gateway.test.ts`）。
- 驗證 session 連線和設定效果的端對端精靈流程（`src/gateway/gateway.test.ts`）。

技能方面仍然缺失的內容（請參閱 [Skills](/en/tools/skills)）：

- **決策：** 當提示中列出技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：** agent 在使用前是否會讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程約定：** 斷言工具順序、session 歷史傳遞和沙箱邊界的多輪場景。

未來的評估應首先保持確定性：

- 使用模擬提供者的場景運行器，以斷言工具調用 + 順序、技能檔案讀取和 session 連線。
- 一小套專注於技能的場景（使用 vs 避免、閘控、提示注入）。
- 可選的即時評估（選擇加入，環境限制）僅在 CI 安全套件到位之後。

## 合約測試（外掛程式和通道形狀）

合約測試驗證每個註冊的外掛程式和通道都符合其介面合約。它們遍歷所有發現的外掛程式並執行一組形狀和行為斷言。預設的 `pnpm test` 單元通道故意跳過這些共享的縫合和冒煙檔案；當您接觸共享通道或提供者介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限通道合約：`pnpm test:contracts:channels`
- 僅限提供者合約：`pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀 (id、name、capabilities)
- **setup** - 設定精靈合約
- **session-binding** - Session 綁定行為
- **outbound-payload** - 訊息載荷結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理器
- **threading** - Thread ID 處理
- **directory** - 目錄/名冊 API
- **group-policy** - 群組政策執行

### 提供者狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道狀態探測
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

- 變更 plugin-sdk 匯出或子路徑後
- 新增或修改通道或提供者外掛後
- 重構外掛註冊或探索後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試 (指引)

當您修正在 live 中發現的提供者/模型問題時：

- 如果可能，請新增 CI 安全的迴歸測試 (模擬/存根提供者，或擷取確切的要求形狀轉換)
- 如果本質上僅限 live (速率限制、驗證政策)，請保持 live 測試狹窄並透過環境變數選擇加入
- 優先以能捕捉錯誤的最小層級為目標：
  - 提供者要求轉換/重放錯誤 → 直接模型測試
  - gateway session/history/tool 管線錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 巡防防護：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元資料 (`listSecretTargetRegistryEntries()`) 推導出每個 SecretRef 類別的一個抽樣目標，然後斷言巡防區段 exec id 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。此測試會在未分類的目標 id 上故意失敗，以免新類別被無聲跳過。
