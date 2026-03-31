---
summary: "測試套件：單元/E2E/Live 測試套件、Docker 執行器，以及各個測試的涵蓋範圍"
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

- 完整閘道（推送前預期執行）： `pnpm build && pnpm check && pnpm test`
- 在資源充足的機器上進行更快的本機完整套件執行： `pnpm test:max`

當您修改測試或需要更多信心時：

- 覆蓋率閘道： `pnpm test:coverage`
- E2E 套件： `pnpm test:e2e`

當除錯真實的提供商/模型時（需要真實憑證）：

- Live 套件（模型 + 閘道工具/圖像探測）： `pnpm test:live`
- 安靜地針對單一 Live 檔案： `pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：當您只需要一個失敗案例時，建議優先使用下文所述的允許清單環境變數來縮小 Live 測試範圍。

## 測試套件（在哪裡執行什麼）

可以將這些測試套件視為「真實性遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：`scripts/test-parallel.mjs`（執行 `vitest.unit.config.ts`、`vitest.extensions.config.ts`、`vitest.gateway.config.ts`）
- 檔案：`src/**/*.test.ts`、`extensions/**/*.test.ts`
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway auth、routing、tooling、parsing、config）
  - 針對已知錯誤的決定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應快速且穩定
- 排程器備註：
  - `pnpm test` 目前會保留一個小型簽入的行為清單，用於真實的 pool/isolation 覆寫，以及另一個針對最慢單元檔案的計時快照。
  - 僅限擴充功能的本機執行現在也使用已提交的擴充功能計時快照，再加上在高記憶體主機上稍微粗略一點的共用批次目標，因此當兩次已測量的共用執行足夠時，共用擴充功能通道可避免產生額外的批次。
  - 高記憶體本機擴充功能共用批次現在也以比以前稍高的工作程序上限執行，這在不改變獨立擴充功能通道的情況下，縮短了剩餘的兩個共用擴充功能批次。
  - 高記憶體本機頻道執行現在重複使用已提交的頻道計時快照，將共用頻道通道分割成幾個已測量的批次，而不是一個長時間的共用工作程序。
  - 高記憶體本機頻道共用批次也以比共用單元批次稍低的工作程序上限執行，這有助於目標頻道重新執行避免 CPU 過度訂閱，一旦獨立頻道通道已在執行中。
  - 針對性的本機通道重新執行現在會提早一些開始分割共享通道工作，這能避免中等規模的針對性重新執行因一個過大的共享通道批次而成為關鍵路徑上的瓶頸。
  - 針對性的本機單元重新執行也會將中等規模的共享單元選擇分割為經過測量的批次，這有助於大型專注的重新執行進行重疊執行，而不是在單一漫長的共享單元通道後等待。
  - 高記憶體本機多表面執行也會使用略粗糙的共享 `unit-fast` 批次，因此混合規劃器在後續表面能夠重疊之前，花費在啟動額外共享單元工作者的時間會減少。
  - 共享單元、擴充功能、通道和閘道執行皆維持在 Vitest `forks` 上。
  - 此包裝器會將經過測量的分叉隔離例外與繁重的單例通道保持在 `test/fixtures/test-parallel.behavior.json` 中明確呈現。
  - 包裝器將測量到最重的檔案剝離到專用通道，而不是依賴不斷增加且需要手動維護的排除清單。
  - 對於僅限本機的介面執行，unit、extension 和 channel shared 通道可以重疊其獨立的熱點，而不是在單一序列前綴後等待。
  - 對於多介面的本機執行，包裝器會保持共享介面階段的順序，但同一共享階段內的批次現在會一起展開，延遲的獨立工作可以重疊下一個共享階段，且多餘的 `unit-fast` 頭現在有助於更早開始該延遲工作，而不是讓這些插槽閒置。
  - 在套件架構發生重大變更後，請使用 `pnpm test:perf:update-timings` 和 `pnpm test:perf:update-timings:extensions` 更新時序快照。
- 嵌入式執行器說明：
  - 當您變更 message-tool 探索輸入或壓縮執行時上下文時，
    請保持兩個層級的覆蓋率。
  - 針對純路由/標準化邊界新增專注的輔助迴歸測試。
  - 同時保持嵌入式執行器整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件驗證了範圍 ID 和壓縮行為仍然能流經
    真實的 `run.ts` / `compact.ts` 路徑；僅有輔助測試並非
    這些整合路徑的充分替代方案。
- 集區註記：
  - 基礎 Vitest 設定預設仍為 `forks`。
  - 單元、通道、擴充和 Gateway 包裝函式通道預設均為 `forks`。
  - 單元、通道和擴充設定預設為 `isolate: false` 以加快檔案啟動速度。
  - `pnpm test` 也會在包裝函式層級傳遞 `--isolate=false`。
  - 使用 `OPENCLAW_TEST_ISOLATE=1 pnpm test` 重新啟用 Vitest 檔案隔離。
  - `OPENCLAW_TEST_NO_ISOLATE=0` 或 `OPENCLAW_TEST_NO_ISOLATE=false` 也會強制執行隔離執行。
- 快速本機迭代說明：
  - `pnpm test:changed` 使用 `--changed origin/main` 執行包裝程式。
  - `pnpm test:changed:max` 保持相同的變更檔案過濾器，但使用包裝程式積極的本機規劃器設定檔。
  - `pnpm test:max` 針對完整的本機執行公開了相同的規劃器設定檔。
  - 在支援的本機 Node 版本（包括 Node 25）上，一般設定檔可以使用頂層通道平行處理。當您想要更積極的本機執行時，`pnpm test:max` 仍然會更積極地推動規劃器。
  - 基礎 Vitest 設定會將包裝程式清單/設定檔標記為 `forceRerunTriggers`，以便在排程器輸入變更時，變更模式重新執行能保持正確。
  - 包裝程式在支援的主機上保持啟用 `OPENCLAW_VITEST_FS_MODULE_CACHE`，但會指派一個 lane-local 的 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH`，這樣並發的 Vitest 程序就不會在一個共用的實驗性快取目錄中產生競爭。
  - 如果您想要一個用於直接單次執行效能分析的明確快取位置，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能除錯備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入細分輸出。
  - `pnpm test:perf:imports:changed` 將相同的效能分析視圖限定於自 `origin/main` 以來變更的檔案。
  - `pnpm test:perf:profile:main` 會為 Vitest/Vite 啟動和轉換開銷撰寫主執行緒 CPU 分析檔。
  - `pnpm test:perf:profile:runner` 會在停用檔案並行處理的情況下，為單元套件撰寫執行器 CPU+堆積分析檔。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用 Vitest `forks` 以確保跨檔案隔離的確定性。
  - 使用自適應工作行程（CI：最多 2 個，本機：預設為 1 個）。
  - 預設以靜默模式執行以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制指定工作行程數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的主控台輸出。
- 範圍：
  - 多執行個體閘道端對端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真正的金鑰
  - 比單元測試有更多變動的部分（可能較慢）

### E2E：OpenShell 後端冒煙測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動隔離的 OpenShell 閘道
  - 從暫存的本地 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙箱 fs 橋接器驗證遠端正規檔案系統行為
- 預期：
  - 僅限選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker 守護程式
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後摧毀測試閘道與沙箱
- 有用的覆寫：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 套件時啟用測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：根據 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此提供者/模型在今天的實際操作中真的能使用真實憑證嗎？」
  - 捕捉提供者格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 依設計不穩定於 CI（真實網路、真實提供者政策、配額、停機）
  - 需要花費金錢 / 使用速率限制
  - 建議執行縮小範圍的子集而非「所有項目」
- Live 執行會 source `~/.profile` 以取得缺失的 API 金鑰。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將設定/驗證資料複製到臨時測試家目錄，因此單元裝置無法修改您的真實 `~/.openclaw`。
- 僅當您故意需要 Live 測試使用您的真實家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為更安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知並靜音 gateway 啟動日誌/Bonjour 閒談。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替 (特定提供者)：以逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2` (例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行每個 live 測試的覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 套件現在會發出進度行到 stderr，因此即使 Vitest 主控台擷取處於安靜狀態，較長的提供者呼叫也能明顯保持運作中。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截功能，以便在即時執行期間立即串流顯示提供者/閘道進度行。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測的心跳。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更了很多內容，則執行 `pnpm test:coverage`）
- 涉及閘道網路/WS 通訊協定/配對：新增 `pnpm test:e2e`
- 除錯「我的機器人當機」/特定提供者失敗/工具呼叫：執行縮小範圍的 `pnpm test:live`

## 即時：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：叫用連線的 Android 節點目前廣告的**每個指令**，並斷言指令合約行為。
- 範圍：
  - 預先處理/手動設定（測試套件不會安裝/執行/配對應用程式）。
  - 針對選取的 Android 節點進行逐個指令的 gateway `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連線並與 gateway 配對。
  - 應用程式保持在前台。
  - 已為您預期會通過的功能授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳情：[Android 應用程式](/en/platforms/android)

## Live：model 燈塔測試（設定檔金鑰）

Live 測試分為兩層，以便我們能夠隔離失敗：

- 「Direct model」告訴我們提供者/模型是否能夠使用給定的金鑰進行回答。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線對該模型是否正常運作（工作階段、歷史記錄、工具、沙箱原則等）。

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
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet/Haiku 4.5、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔的允許清單）
- 金鑰來源：
  - 預設：設定檔儲存與環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **設定檔儲存**
- 為何存在：
  - 將「供應商 API 故障 / 金鑰無效」與「閘道代理程式管線故障」區隔開來
  - 包含小型、獨立的迴歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具呼叫流程）

### 第 2 層：閘道 + 開發代理程式冒煙測試（即 "@openclaw" 實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內閘道
  - 建立/修補 `agent:dev:*` 工作階段（每次執行覆寫模型）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義」的回應（無工具）
    - 真實工具調用正常運作（讀取探測）
    - 選用的額外工具探測（執行+讀取探測）
    - OpenAI 迴歸路徑（僅工具調用 → 後續追蹤）持續運作
- 探測詳細資訊（讓您能快速解釋失敗原因）：
  - `read` 探測：測試在工作區寫入一個 nonce 檔案，並要求代理程式 `read` 它並將 nonce 回傳。
  - `exec+read` 探測：測試要求代理程式將 nonce `exec`-寫入暫存檔，然後將其 `read` 回來。
  - 影像探測：測試附加一個生成的 PNG（貓 + 隨機程式碼）並預期模型傳回 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live` (若直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`)
- 如何選擇模型：
  - 預設：現代允許清單 (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (或逗號分隔清單) 以縮小範圍
- 如何選擇供應商 (避免「全部使用 OpenRouter」)：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (逗號分隔允許清單)
- 在此即時測試中，工具 + 圖像偵測始終開啟：
  - `read` 偵測 + `exec+read` 偵測 (工具壓力測試)
  - 當模型宣稱支援圖像輸入時，會執行圖像偵測
  - 流程 (高層級)：
    - 測試會產生一個帶有「CAT」+ 隨機代碼的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送它
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 該代碼 (OCR 容錯：允許輕微錯誤)

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` id），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：Anthropic setup-token smoke

- 測試：`src/agents/anthropic.setup-token.live.test.ts`
- 目標：驗證 Claude Code CLI setup-token（或貼上的 setup-token 設定檔）能否完成 Anthropic 提示。
- 啟用：
  - `pnpm test:live`（若直接呼叫 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Token 來源（擇一）：
  - 設定檔：`OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - 原始 Token：`OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- 模型覆寫（選用）：
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

設定範例：

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live: CLI 後端冒煙測試（Claude Code CLI 或其他本機 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + agent 管線，而不會影響您的預設設定。
- 啟用方式：
  - `pnpm test:live`（若是直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 模型：`claude-cli/claude-sonnet-4-6`
  - 指令：`claude`
  - 參數：`["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- 覆寫（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以發送真實的圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` （或 `"list"` ）以控制當設定了 `IMAGE_ARG` 時如何傳遞圖片參數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` 以保持 Claude Code CLI MCP 設定啟用（預設會使用暫時的空白檔案來停用 MCP 設定）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 指令：

```bash
pnpm test:docker:live-cli-backend
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在 repo Docker 映像檔中以非 root 使用者 `node` 執行 live CLI-backend smoke，因為 Claude CLI 在以 root 執行時會拒絕 `bypassPermissions`。
- 對於 `claude-cli`，它會將 Linux `@anthropic-ai/claude-code` 套件安裝到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 的可寫入快取前綴中（預設值：`~/.cache/openclaw/docker-cli-tools`）。
- 如果可用，它會將 `~/.claude` 複製到容器中，但在 Claude 驗證由 `ANTHROPIC_API_KEY` 支援的機器上，它也會透過 `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV` 為子 Claude CLI 保留 `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD`。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- Goal: validate the real ACP conversation-bind flow with a live ACP agent:
  - send `/acp spawn <agent> --bind here`
  - bind a synthetic message-channel conversation in place
  - send a normal follow-up on that same conversation
  - verify the follow-up lands in the bound ACP session transcript
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - ACP agent: `claude`
  - Synthetic channel: Slack DM-style conversation context
  - ACP backend: `acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- 備註：
  - This lane uses the gateway `chat.send` surface with admin-only synthetic originating-route fields so tests can attach message-channel context without pretending to deliver externally.
  - 當 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` 未設定時，測試會使用已設定/內建的 acpx 指令。如果您的 harness 認證依賴 `~/.profile` 中的環境變數，建議使用自訂的 `acpx` 指令，以保留 provider 的環境變數。

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

Docker 說明：

- Docker 執行程式位於 `scripts/test-live-acp-bind-docker.sh`。
- 它會 source `~/.profile`，將對應的 CLI 認證 home (`~/.claude` 或 `~/.codex`) 複製到容器中，將 `acpx` 安裝到可寫入的 npm 前綴，然後如果缺少請求的 live CLI (`@anthropic-ai/claude-code` 或 `@openai/codex`)，則進行安裝。
- 在 Docker 內部，執行程式會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保留來自已載入設定檔的 provider 環境變數，供子 harness CLI 使用。

### 推薦的即時配方

狹窄、明確的允許清單速度最快且最不穩定：

- 單一模型，直接（無閘道）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，閘道冒煙測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 專注（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的代理端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具怪癖）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 設定檔驗證)；這是大多數使用者所說的「Gemini」。
  - CLI：OpenClaw 會調用本地的 `gemini` 二進制檔案；它有自己的身份驗證，並且行為可能會有所不同（串流/工具支援/版本偏差）。

## Live：模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型清單」（live 是選用的），但這些是**推薦**在擁有金鑰的開發機上定期涵蓋的模型。

### 現代煙霧測試集（工具調用 + 圖像）

這是我們期望保持運作的「通用模型」執行：

- OpenAI (非 Codex)：`openai/gpt-5.2` (選用：`openai/gpt-5.1`)
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用舊版 Gemini 2.x 模型)
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

使用工具 + 圖片執行 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 可選執行）

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.2` (或 `openai/gpt-5-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

可選的額外覆蓋範圍（最好有）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個您已啟用的支援「工具」功能的模型)
- Cerebras: `cerebras/`… (如果您有存取權限)
- LM Studio：`lmstudio/`…（本機；工具呼叫取決於 API 模式）

### Vision：影像傳送（附件 → 多模態訊息）

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中包含至少一個支援影像的模型（Claude/Gemini/OpenAI 支援影像的變體等），以執行影像探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...`（數百個模型；使用 `openclaw models scan` 尋找支援工具與影像的候選者）
- OpenCode：`opencode/...` 用於 Zen，以及 `opencode-go/...` 用於 Go（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

您可以包含在即時矩陣中的更多提供者（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax` (cloud/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio, vLLM, LiteLLM, 等)

提示：不要試圖在文檔中硬編碼「所有模型」。權威列表是 `discoverModels(...)` 在您的機器上返回的內容加上任何可用的金鑰。

## 憑證（切勿提交）

即時測試以與 CLI 相同的方式發現憑證。實際影響：

- 如果 CLI 正常運作，即時測試應該能找到相同的金鑰。
- 如果即時測試提示「無憑證」，請以除錯 `openclaw models list` / 模型選擇的相同方式進行除錯。

- 設定檔存放區：`~/.openclaw/credentials/`（首選；即測試中「設定檔金鑰」的含義）
- 設定：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 即時本機執行預設會將活動設定和認證存放區複製到臨時測試主目錄中；在該暫存副本中會移除 `agents.*.workspace` / `agentDir` 路徑覆蓋設定，以便探測不會影響您真實的主機工作區。

如果您想依賴環境金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live (音訊轉錄)

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可選模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## 圖像生成 live

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 範圍：
  - 列舉每個已註冊的圖像生成提供者外掛程式
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入缺失的提供者環境變數
  - 預設優先使用即時/環境變數 API 金鑰，而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會掩蓋真實的 Shell 憑證
  - 跳過沒有可用認證/設定檔/模型的提供者
  - 透過共享執行時期功能執行標準映像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的捆綁提供者：
  - `openai`
  - `google`
- 可選的範圍縮小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存區認證並忽略僅限環境變數的覆寫

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 在儲存庫 Docker 映像檔內執行 `pnpm test:live`，掛載您的本機設定目錄和工作區（並在掛載時載入 `~/.profile`）。
- 容器基礎測試執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一或多個真實容器並驗證更高層級的整合路徑。

即時模型 Docker 執行器也只會 bind-mount 所需的 CLI 認證主目錄（或在執行範圍未縮減時掛載所有支援的主目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以重新整理權杖，而無需修改主機認證儲存庫：

- 直接模型：`pnpm test:docker:live-models` (腳本：`scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (腳本： `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (腳本： `scripts/test-live-cli-backend-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (腳本： `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke: `pnpm test:docker:openwebui` (腳本： `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (腳本： `scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health): `pnpm test:docker:gateway-network` (腳本： `scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke): `pnpm test:docker:mcp-channels` (腳本： `scripts/e2e/mcp-channels-docker.sh`)
- 外掛程式（安裝冒煙測試 + `/plugin` 別名 + Claude-bundle 重新啟動語意）：`pnpm test:docker:plugins` (腳本: `scripts/e2e/plugins-docker.sh`)

live-model Docker 執行器也會將目前的 checkout 以唯讀方式 bind-mount，並將其暫存到容器內的暫時工作目錄中。這讓執行時映像檔保持精簡，同時仍能針對您確切的本地原始碼/設定執行 Vitest。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway live probes 不會在容器內啟動真實的 Telegram/Discord/等頻道工作程式。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 管道縮小或排除 gateway live 涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是一個高階相容性冒煙測試：它會啟動一個具備 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 暴露了 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理傳送真實的聊天請求。首次執行可能會明顯較慢，因為 Docker 可能需要下載 Open WebUI 映像檔，且 Open WebUI 可能需要完成自身的冷啟動設定。此管道預期可用的 live model 金鑰，而在 Docker 化執行中提供它的主要方式是 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）。成功的執行會列印一個小型 JSON 載荷，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。`test:docker:mcp-channels` 是刻意確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個植入種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後驗證路由對話探索、逐字稿讀取、附件中繼資料、live 事件佇列行為、 outbound send 路由，以及透過真實 stdio MCP 橋接器的 Claude 風格頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此冒煙測試驗證的是橋接器實際發出的內容，而不僅是特定客戶端 SDK 恰好呈現的內容。

手動 ACP 自然語言執行緒冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請將此腳本保留用於迴歸/除錯工作流程。之後可能會再次需要它來進行 ACP 執行緒路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載到 `/home/node/.profile`，並在執行測試前載入
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設值：`~/.cache/openclaw/docker-cli-tools`）掛載到 `/home/node/.npm-global`，用於 Docker 內的快取 CLI 安裝
- 位於 `$HOME` 下的外部 CLI 認證目錄會以唯讀方式掛載在 `/host-auth/...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設：掛載所有支援的目錄 (`.codex`, `.claude`, `.minimax`)
  - 縮減的提供者執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, 或逗號列表如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 手動覆蓋
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 來縮減執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內篩選提供者
- 使用 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存區 (而非環境變數)
- `OPENCLAW_OPENWEBUI_MODEL=...` 用於選擇由 Gateway 公開給 Open WebUI smoke 的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用於覆寫 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用於覆寫固定的 Open WebUI 映像標籤

## 文件健全性檢查

在編輯文件後執行文件檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線迴歸測試 (CI 安全)

這些是沒有真實供應商的「真實管線」迴歸測試：

- Gateway 工具呼叫（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts` (案例: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`，寫入配置 + 強制執行驗證)：`src/gateway/gateway.test.ts` (案例: "runs wizard over ws and writes auth token config")

## Agent 可靠性評估 (技能)

我們已經有一些 CI 安全的測試，其行為類似於「agent reliability evals」：

- 透過真實 gateway + agent 迴圈的 Mock 工具呼叫 (`src/gateway/gateway.test.ts`)。
- 驗證 session 連線和配置效果的端到端精靈流程 (`src/gateway/gateway.test.ts`)。

針對技能目前仍缺失的部分 (參見 [Skills](/en/tools/skills))：

- **決策制定：**當提示詞中列出技能時，agent 會選擇正確的技能（或避免不相關的技能）嗎？
- **合規性：**agent 在使用前會閱讀 `SKILL.md` 並遵循必要的步驟/參數嗎？
- **工作流程合約：** 斷言工具順序、對話歷史傳遞與沙箱邊界的多輪次場景。

未來的評估應首先保持確定性：

- 使用模擬提供者的場景運行器，來斷言工具呼叫與順序、技能檔案讀取以及會話連線。
- 一組小型的專注於技能的場景（使用與避免、閘控、提示注入）。
- 僅在 CI 安全的測試套件就緒後，才進行可選的即時評估（選用、受環境限制）。

## 合約測試（外掛與頻道形狀）

合約測試會驗證每個已註冊的外掛和頻道是否符合其
介面合約。它會遍歷所有發現的外掛，並執行一套
關於形狀與行為的斷言。預設的 `pnpm test` 單元通道會刻意
跳過這些共享的接縫 和冒煙 測試檔案；當您接觸共享的
頻道或提供者介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限頻道合約：`pnpm test:contracts:channels`
- 僅限提供者合約：`pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件結構 (id、name、capabilities)
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息載荷結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - 執行緒 ID 處理
- **directory** - 目錄/名單 API
- **group-policy** - 群組政策執行

### 提供者狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - 插件註冊表結構

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - Auth choice/selection
- **catalog** - Model catalog API
- **discovery** - Plugin discovery
- **loader** - Plugin loading
- **runtime** - Provider runtime
- **shape** - Plugin shape/interface
- **wizard** - Setup wizard

### 何時執行

- 變更 plugin-sdk 匯出或子路徑後
- 新增或修改通道或提供者外掛程式後
- 重構外掛程式註冊或探索功能後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試（指引）

當您修正在 live 中發現的提供者/模型問題時：

- 如果可能，請新增 CI 安全的迴歸測試（模擬/存根提供者，或擷取確切的請求形狀轉換）
- 如果它本質上僅限 live（速率限制、授權原則），請保持 live 測試狹窄並透過環境變數選擇加入
- 優先定位捕獲錯誤的最小層級：
  - provider request conversion/replay bug → direct models test
  - gateway session/history/tool pipeline bug → gateway live smoke 或 CI-safe gateway mock test
- SecretRef traversal guardrail：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從 registry 元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導一個採樣目標，然後斷言 traversal-segment exec id 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了新的 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會針對未分類的目標 id 刻意失敗，以免新的類別被無聲跳過。
