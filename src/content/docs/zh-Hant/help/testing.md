---
summary: "測試套件：單元測試/E2E/即時測試套件、Docker 執行器，以及各項測試的涵蓋範圍"
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
- 在資源充足的機器上進行更快的本機完整套件執行：`pnpm test:max`
- 直接的 Vitest 監視迴圈（現代專案配置）：`pnpm test:watch`
- 直接檔案指定現在也會路由擴充功能/通道路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`

當您變更測試或需要額外信心時：

- 覆蓋率檢查：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當對真實的提供者/模型進行偵錯時（需要真實憑證）：

- 即時測試套件（模型 + 閘道工具/映像檔探查）：`pnpm test:live`
- 靜默指定單一即時測試檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：當您只需要一個失敗案例時，建議優先透過下方描述的允許清單環境變數來縮小即時測試範圍。

## 測試套件（什麼在哪裡執行）

您可以將這些套件視為「真實度遞增」（以及不穩定性/成本遞增）：

### 單元測試 / 整合測試（預設）

- 指令：`pnpm test`
- 配置：透過 `vitest.config.ts` 原生 Vitest `projects`
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/單元庫存，以及受 `vitest.unit.config.ts` 涵蓋的白名單 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、配置）
  - 已知錯誤的確定性迴歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 專案備註：
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:changed` 現在都使用相同的原生 Vitest 根 `projects` 配置。
  - 直接檔案過濾器會透過根專案圖表進行原生路由，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 不需要自訂包裝函式即可運作。
- 嵌入式執行器備註：
  - 當您變更訊息工具探索輸入或壓縮執行時期內容時，
    請同時保持這兩個層級的覆蓋率。
  - 為純路由/正規化邊界新增專注的輔助迴歸測試。
  - 同時維持嵌入式執行器整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證範圍 ID 和壓縮行為是否仍能
    流經真實的 `run.ts` / `compact.ts` 路徑；僅有輔助測試並不足以替代這些整合路徑。
- 集區備註：
  - 基礎 Vitest 設定現在預設為 `threads`。
  - 共用的 Vitest 設定也修復了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離執行器。
  - 根 UI 通道保留其 `jsdom` 設定和最佳化工具，但現在同樣在共用的非隔離執行器上執行。
  - `pnpm test` 繼承了根 `vitest.config.ts` 專案設定中相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在預設也會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本機執行期間的 V8 編譯震盪。如果您需要與原生 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本機疊代備註：
  - `pnpm test:changed` 使用 `--changed origin/main` 執行原生專案設定。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的原生專案設定，只是擁有更高的 worker 上限。
  - 本機 worker 自動擴展現在被刻意設計得較為保守，並且在主機平均負載已經很高時會退讓，因此預設情況下，多個同時進行的 Vitest 執行造成的影響會較小。
  - 基礎 Vitest 設定將專案/設定檔標記為 `forceRerunTriggers`，以便當測試接線變更時，變更模式的重新執行能保持正確。
  - 設定在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要一個明確的快取位置以進行直接效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能調試備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的分析檢視範圍限定為自 `origin/main` 以來變更的檔案。
  - `pnpm test:perf:profile:main` 會寫入 Vitest/Vite 啟動和轉換開銷的主執行緒 CPU 設定檔。
  - `pnpm test:perf:profile:runner` 會在停用檔案並行處理的情況下，寫入 unit suite 的執行器 CPU+堆積記憶體設定檔。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應 worker（CI：最多 2 個，本地：預設 1 個）。
  - 預設以靜音模式執行，以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 可強制設定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 可重新啟用詳細的主控台輸出。
- 範圍：
  - 多實例 gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在 pipeline 中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作元件（可能會較慢）

### E2E: OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫存的本機 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙箱 fs 橋接器驗證遠端規範的檔案系統行為
- 預期：
  - 僅供選擇性使用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 gateway 和沙箱
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 可在手動執行更廣泛的 e2e suite 時啟用測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 可指向非預設的 CLI 二進位檔或包裝程式腳本

### Live (真實的供應商 + 真實的模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：透過 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型在使用真實憑證的情況下，是否在 _今天_ 真的能運作？」
  - 擷取供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 依設計並非 CI 穩定（真實網路、真實供應商政策、配額、中斷）
  - 會花費金錢 / 使用速率限制
  - 建議優先執行縮小的子集，而不是「所有項目」
- Live 執行會來源 `~/.profile` 以取得遺失的 API 金鑰。
- 根據預設，live 執行仍然會隔離 `HOME`，並將設定/驗證資料複製到暫存的測試目錄，因此單元 fixture 無法變更您的真實 `~/.openclaw`。
- 僅當您故意需要 live 測試使用您的真實家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知並靜音 gateway 啟動日誌/Bonjour 雜訊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換（供應商特定）：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或透過 `OPENCLAW_LIVE_*_KEY` 進行 per-live 覆寫；測試在收到速率限制回應時會重試。
- 進度/心跳輸出：
  - Live suite 現在會發出進度列到 stderr，因此即使 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，以便供應商/gateway 進度列在 live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 心跳。

## 我應該執行哪個 suite？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更很多，則執行 `pnpm test:coverage`）
- 觸及閘道網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人停機」/ 特定供應商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：叫用連線的 Android 節點目前宣傳的**每個指令**，並斷言指令合約行為。
- 範圍：
  - 預先條件/手動設定（測試組不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點進行逐個指令的閘道 `node.invoke` 驗證。
- 必要預先設定：
  - Android 應用程式已連線並已與閘道配對。
  - 保持應用程式在前台。
  - 已針對您預期通過的功能授予權限/擷取同意。
- 選用目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳細資訊：[Android App](/en/platforms/android)

## Live：模型冒煙測試（設定檔金鑰）

Live 測試分為兩層，以便我們隔離失敗：

- 「直接模型」告訴我們供應商/模型是否可以使用給定金鑰進行回應。
- 「閘道冒煙測試」告訴我們完整的閘道+代理程式管線對該模型是否有效（工作階段、歷程記錄、工具、沙箱原則等）。

### 第 1 層：直接模型完成（無閘道）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 為每個模型執行小型完成（以及需要的目標回歸測試）
- 如何啟用：
  - `pnpm test:live`（若直接叫用 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，現代的別名）以實際執行此測試組；否則它會跳過，以保持 `pnpm test:live` 專注於閘道冒煙測試
- 如何選取模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號允許清單）
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity"`（逗號允許清單）
- 金鑰來源：
  - 預設：profile store 和環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 存在原因：
  - 區分「供應商 API 故障 / 金鑰無效」與「gateway agent pipeline 故障」
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重放 + 工具調用流程）

### 第 2 層：Gateway + dev agent smoke（"@openclaw" 實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆蓋）
  - 遍歷帶金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實工具調用運作正常（read probe）
    - 選用的額外工具探測（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續運作
- 探測細節（以便快速解釋失敗原因）：
  - `read` probe：測試在工作區寫入一個 nonce 檔案，並要求 agent `read` 該檔案並將 nonce 回傳。
  - `exec+read` probe：測試要求 agent `exec`-write 一個 nonce 到暫存檔案，然後 `read` 回來。
  - image probe：測試附加一個生成的 PNG（貓 + 隨機代碼），並預期模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代化允許清單（Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代化允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號清單）以縮小範圍
- 如何選擇供應商（避免「全部用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,openai,anthropic,zai,minimax"`（逗號允許清單）
- 在此 live 測試中，工具 + 圖像探測總是開啟：
  - `read` probe + `exec+read` probe（工具壓力測試）
  - 當模型宣佈支援圖片輸入時，會執行圖片探測
  - 流程（高層級）：
    - 測試會生成一個帶有 “CAT” + 隨機碼的小型 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - Embedded agent 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 該代碼（OCR 容錯：允許少量錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用即時 ACP agent 驗證真實的 ACP conversation-bind 流程：
  - 發送 `/acp spawn <agent> --bind here`
  - 就地綁定一個合成的 message-channel 對話
  - 在該對話上發送一個正常的後續訊息
  - 驗證後續訊息會出現在綁定的 ACP 會話紀錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - ACP agent：`claude`
  - 合成頻道：Slack DM 風格的對話上下文
  - ACP backend：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 備註：
  - 此通道使用 gateway `chat.send` 介面，並搭配僅限管理員使用的合成 originating-route 欄位，以便測試附加 message-channel 上下文，而無需假裝從外部傳送。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式的內建 agent 註冊表，用於選定的 ACP harness agent。

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

Docker 備註：

- Docker 執行器位於 `scripts/test-live-acp-bind-docker.sh`。
- 它會來源 `~/.profile`，將相符的 CLI 驗證資料暫存到容器中，將 `acpx` 安裝到可寫入的 npm 前綴中，然後如果缺少要求的即時 CLI (`@anthropic-ai/claude-code` 或 `@openai/codex`)，則予以安裝。
- 在 Docker 內部，runner 設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，讓 acpx 將來源設定檔中的 provider 環境變數保留給子 harness CLI 使用。

### 推薦的 Live 食譜

狹窄且明確的允許清單是最快且最不不穩定的：

- 單一模型，直接連線（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個 provider 的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的 agent 端點）。

## Live: 模型矩陣（我們涵蓋的內容）

沒有固定的「CI 模型清單」（live 是選用的），但這些是**推薦**在開發機器上使用金鑰定期涵蓋的模型。

### 現代 smoke 集合（工具呼叫 + 圖片）

這是我們預期能持續運作的「常見模型」執行：

- OpenAI (非 Codex): `openai/gpt-5.4` (選用: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免較舊的 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

執行包含工具 + 圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基線：工具呼叫（讀取 + 選用執行）

每個 provider 系列至少選擇一個：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

選用額外涵蓋範圍（有更好）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選取一個您已啟用的「tools」功能模型)
- Cerebras: `cerebras/`… (如果您有權限)
- LM Studio: `lmstudio/`… (本地；工具呼叫取決於 API 模式)

### Vision: 圖片傳送 (附件 → 多模態訊息)

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型 (Claude/Gemini/OpenAI 的支援視覺變體等) 以執行圖片探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百個模型；使用 `openclaw models scan` 尋找支援工具與圖片的候選)
- OpenCode: Zen 使用 `opencode/...`，Go 使用 `opencode-go/...` (驗證透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

更多您可以包含在即時矩陣中的提供者 (如果您有憑證/設定)：

- 內建：`openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的 Proxy (LM Studio, vLLM, LiteLLM 等)

提示：不要試圖在文件中硬寫「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上傳回的內容 + 任何可用的金鑰。

## 憑證 (絕不要提交)

即時測試會像 CLI 一樣探索憑證。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」，請用與除錯 `openclaw models list` / 模型選取相同的方式進行除錯。

- Per-agent auth profiles: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (這就是即時測試中 “profile keys” 的含義)
- Config: `~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- Legacy state dir: `~/.openclaw/credentials/` (如果存在，會被複製到暫存的即時 home 目錄中，但不是主要的 profile-key store)
- 即時本地執行預設會將活動的 config、每個 agent 的 `auth-profiles.json` 檔案、legacy `credentials/` 以及支援的外部 CLI auth 目錄複製到臨時測試 home 中；在該暫存 config 中會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以便探測不會接觸到您真實的主機工作區。

如果您想依賴環境金鑰 (例如在您的 `~/.profile` 中匯出的)，請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器 (它們可以將 `~/.profile` 掛載到容器中)。

## Deepgram live (音訊轉錄)

- Test: `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Enable: `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test: `src/agents/byteplus.live.test.ts`
- Enable: `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Optional model override: `BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- Test: `extensions/comfy/comfy.live.test.ts`
- Enable: `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Scope:
  - Exercises the bundled comfy image, video, and `music_generate` paths
  - Skips each capability unless `models.providers.comfy.<capability>` is configured
  - Useful after changing comfy workflow submission, polling, downloads, or plugin registration

## Image generation live

- Test: `src/image-generation/runtime.live.test.ts`
- Command: `pnpm test:live src/image-generation/runtime.live.test.ts`
- Scope:
  - Enumerates every registered image-generation provider plugin
  - Loads missing provider env vars from your login shell (`~/.profile`) before probing
  - Uses live/env API keys ahead of stored auth profiles by default, so stale test keys in `auth-profiles.json` do not mask real shell credentials
  - Skips providers with no usable auth/profile/model
  - Runs the stock image-generation variants through the shared runtime capability:
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的內建供應商：
  - `openai`
  - `google`
- 可選縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存驗證並忽略僅限環境變數的覆蓋設定

## 音樂生成即時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 範圍：
  - 執行共用的內建音樂生成供應商路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前從您的登入 shell (`~/.profile`) 載入供應商環境變數
  - 跳過沒有可用驗證/設定檔/模型的供應商
- 可選縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在程式碼庫 Docker 映像檔內執行其相符的設定檔金鑰即時檔案 (`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`)，並掛載您的本機設定目錄和工作區（如果已掛載，則載入 `~/.profile`）。相符的本機進入點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設為較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您明確想要較大的完整掃描時，請覆蓋這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次即時 Docker 映像檔，然後將其重複用於兩個即時 Docker 通道。
- 容器冒煙測試執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一個或多個真實容器並驗證更高層級的整合路徑。

即時模型 Docker 執行器也只會綁定掛載所需的 CLI 驗證主目錄（或在未縮小執行範圍時掛載所有支援的主目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以重新整理權杖而不會修改主機驗證儲存庫：

- 直接模型：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP 綁定冒煙測試：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`）
- 閘道 + 開發代理程式：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI 即時冒煙測試：`pnpm test:docker:openwebui`（腳本：`scripts/e2e/openwebui-docker.sh`）
- 入門精靈（TTY、完整腳手架）：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- 閘道網路（兩個容器、WS 驗證 + 健康狀態）：`pnpm test:docker:gateway-network`（腳本：`scripts/e2e/gateway-network-docker.sh`）
- MCP 頻道橋接器（已植入的閘道 + stdio 橋接器 + 原始 Claude 通知框架冒煙測試）：`pnpm test:docker:mcp-channels`（腳本：`scripts/e2e/mcp-channels-docker.sh`）
- 外掛程式（安裝冒煙測試 + `/plugin` 別名 + Claude 套件重新啟動語義）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

即時模型 Docker 執行器也會將目前的程式碼庫以唯讀方式掛載，並將其暫存到容器內的暫時工作目錄中。這在保持執行時映像檔精簡的同時，仍能針對您確切的本地原始碼/設定執行 Vitest。
暫存步驟會跳過大型本地快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本地的 `.build` 或 Gradle 輸出目錄，因此 Docker 即時執行不會花費數分鐘時間複製機器特定的產出檔案。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway 即時探測不會在容器內啟動真實的 Telegram/Discord/等頻道工作程式。
`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或排除該 Docker 管道中的 gateway 即時覆蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一個更高層級的相容性冒煙測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理傳送真實的聊天請求。
第一次執行可能會明顯變慢，因為 Docker 可能需要提取 Open WebUI 映像檔，而 Open WebUI 可能需要完成自身的冷啟動設定。
此管道需要可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。
成功的執行會列印一個小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意的確定性測試，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個已播種種子的 Gateway 容器，啟動第二個生成 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由的對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、外傳傳送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 幀，因此冒煙測試驗證的是橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 偶然呈現的內容。

手動 ACP 明確語言 thread smoke（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本用於回歸/除錯工作流程。它可能會再次用於 ACP thread routing 驗證，因此請勿將其刪除。

實用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前 source
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設值：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 用於 Docker 內的 CLI 快取安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 縮小的 provider 執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 來縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內過濾 providers
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存（而非 env）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇 gateway 為 Open WebUI smoke 公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 以覆寫 Open WebUI smoke 使用的 nonce-check prompt
- `OPENWEBUI_IMAGE=...` 以覆寫固定的 Open WebUI image tag

## 文件完整性檢查

在文件編輯後運行文件檢查：`pnpm check:docs`。
當您也需要頁內標題檢查時，運行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸 (CI-safe)

這些是不包含真實供應商的「真實管線」回歸測試：

- Gateway 工具調用 (模擬 OpenAI、真實 gateway + agent 迴圈): `src/gateway/gateway.test.ts` (案例: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`, 寫入設定 + 強制執行驗證): `src/gateway/gateway.test.ts` (案例: "runs wizard over ws and writes auth token config")

## Agent 可靠性評估 (skills)

我們已經有一些 CI-safe 測試，其行為類似於「agent 可靠性評估」：

- 通過真實 gateway + agent 迴圈進行模擬工具調用 (`src/gateway/gateway.test.ts`)。
- 端到端精靈流程，用於驗證會話連線和配置效果 (`src/gateway/gateway.test.ts`)。

技能目前仍缺失的內容 (參見 [Skills](/en/tools/skills))：

- **決策:** 當技能在提示中列出時，agent 會選擇正確的技能 (或避免不相關的技能) 嗎？
- **合規性:** agent 是否會在使用前閱讀 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約:** 多輪對話場景，用於斷言工具順序、會話歷史傳遞和沙箱邊界。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景運行器，以斷言工具調用 + 順序、技能文件讀取和會話連線。
- 一小套針對技能的場景 (使用與避免、閘控、提示注入)。
- 只有在 CI-safe 測試套件到位後，才進行可選的即時評估 (選擇加入、環境閘控)。

## 合約測試 (plugin 和 channel 形狀)

合約測試驗證每個已註冊的 plugin 和 channel 都符合其
介面合約。它們會遍歷所有發現的 plugin 並運行一套
形狀和行為斷言。預設的 `pnpm test` 單元通道故意
跳過這些共享的縫合和冒煙測試文件；當您接觸共享的 channel 或
provider 介面時，請明確運行合約命令。

### 命令

- 所有合約: `pnpm test:contracts`
- 僅限 Channel 合約: `pnpm test:contracts:channels`
- 僅限提供者合約：`pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形狀 (id、name、capabilities)
- **setup** - 設定精靈合約
- **session-binding** - 工作階段繫結行為
- **outbound-payload** - 訊息承載結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理器
- **threading** - Thread ID 處理
- **directory** - 目錄/名冊 API
- **group-policy** - 群組政策執行

### 提供者狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道狀態探測
- **registry** - 插件登錄形狀

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 插件探索
- **loader** - 插件載入
- **runtime** - 提供者執行時間
- **shape** - 插件形狀/介面
- **wizard** - 設定精靈

### 何時執行

- 變更 plugin-sdk 匯出或子路徑後
- 新增或修改通道或提供者插件後
- 重構插件註冊或探索後

合約測試在 CI 中執行，且不需要真實的 API 金鑰。

## 新增回歸測試 (指引)

當您修復在 live 中發現的提供者/模型問題時：

- 如果可能，請新增 CI 安全的回歸測試 (模擬/樁存提供者，或擷取確切的請求形狀轉換)
- 如果本質上僅限 live (速率限制、驗證政策)，請保持 live 測試範圍狹窄，並透過環境變數選擇加入
- 優先以能捕捉錯誤的最小層級為目標：
  - 提供者請求轉換/重放錯誤 → 直接模型測試
  - 閘道工作階段/歷史/工具管線錯誤 → 閘道 live 測試或 CI 安全的閘道模擬測試
- SecretRef 歷遍防護機制：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄元資料 (`listSecretTargetRegistryEntries()`) 為每個 SecretRef 類別推匯出一個抽樣目標，然後斷言歷遍區段 exec id 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。該測試會在未分類的目標 id 上故意失敗，以免新類別被無聲略過。
