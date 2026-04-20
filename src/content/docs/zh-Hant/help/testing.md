---
summary: "測試套件：單元/e2e/live 測試組、Docker 執行器，以及各項測試涵蓋的內容"
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

- 完整檢查（推送前預期執行）： `pnpm build && pnpm check && pnpm test`
- 在效能較強的機器上更快速的本機完整套件執行： `pnpm test:max`
- 直接執行 Vitest 監控迴圈： `pnpm test:watch`
- 直接檔案指定現在也會路由擴充功能/通道路徑： `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您正在處理單一失敗時，優先使用指定範圍的執行。
- Docker 支援的 QA 站台： `pnpm qa:lab:up`
- Linux VM 支援的 QA 通道： `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您接觸測試或需要更多信心時：

- 覆蓋率檢查： `pnpm test:coverage`
- E2E 測試組： `pnpm test:e2e`

當除錯真實的提供商/模型時（需要真實憑證）：

- Live 測試組（模型 + gateway 工具/圖像探測）： `pnpm test:live`
- 安靜地指定單一 live 檔案： `pnpm test:live -- src/agents/models.profiles.live.test.ts`

提示：當您只需要一個失敗案例時，建議優先使用下方描述的 allowlist 環境變數來縮小 live 測試範圍。

## QA 專用執行器

當您需要 QA 實驗室的真實感時，這些指令位於主要測試組旁邊：

- `pnpm openclaw qa suite`
  - 直接在主機上執行儲存庫支援的 QA 情境。
  - 預設會以獨立的 gateway workers 並行執行多個選定的場景，最多支援 64 個 workers 或選定的場景數量。使用
    `--concurrency <count>` 來調整 worker 數量，或是使用 `--concurrency 1` 來執行
    舊版的序列通道。
  - 支援提供者模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 啟動一個本地由 AIMock 支援的提供者伺服器，用於實驗性
    fixture 和協議 mock 覆蓋，而不需替換具備場景感知能力的
    `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在用完即棄的 Multipass Linux VM 中執行相同的 QA 套件。
  - 保持與主機上的 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - Live 執行會轉發實用於客端的支援 QA 認證輸入：
    基於環境變數的提供者金鑰、QA live 提供者設定路徑，以及 `CODEX_HOME`
    （如果存在的話）。
  - 輸出目錄必須保留在 repo 根目錄下，以便客端可以透過
    掛載的工作區寫回。
  - 將正常的 QA 報告 + 摘要以及 Multipass 日誌寫入
    `.artifacts/qa-e2e/...` 下。
- `pnpm qa:lab:up`
  - 啟動由 Docker 支援的 QA 站台，用於操作員風格的 QA 工作。
- `pnpm openclaw qa aimock`
  - 僅啟動本地的 AIMock 提供者伺服器，以進行直接的協議冒煙
    測試。
- `pnpm openclaw qa matrix`
  - 對一次性由 Docker 支援的 Tuwunel homeserver 執行 Matrix live QA 通道。
  - 此 QA 主機目前僅限 repo/開發使用。打包的 OpenClaw 安裝版不附帶
    `qa-lab`，因此不會公開 `openclaw qa`。
  - Repo 檢出會直接載入捆綁的 runner；不需要單獨的外掛安裝
    步驟。
  - 配置三個臨時 Matrix 使用者（`driver`、`sut`、`observer`）以及一個私人房間，然後啟動一個 QA gateway 子進程，並將真實的 Matrix 外掛作為 SUT 傳輸。
  - 預設使用固定的穩定 Tuwunel 映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。當您需要測試不同的映像檔時，請使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆蓋。
  - Matrix 不會公開共用的認證來源旗標，因為該通道會在本地配置一次性使用者。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Matrix QA 報告、摘要、觀察到的事件構件以及結合的 stdout/stderr 輸出日誌。
- `pnpm openclaw qa telegram`
  - 使用來自環境變數的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 頻道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數位聊天 ID。
  - 支援 `--credential-source convex` 以使用共享的集區憑證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 需要在同一個私人群組中有兩個不同的機器人，其中 SUT 機器人必須公開 Telegram 使用者名稱。
  - 為了獲得穩定的機器人對機器人觀測功能，請在兩個機器人的 `@BotFather` 中啟用「機器人對機器人通訊模式」，並確保驅動機器人可以觀測群組機器人的流量。
  - 會在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀測訊息構件。

即時傳輸頻道共用一個標準合約，以確保新的傳輸方式不會產生偏離：

`qa-channel` 仍是廣泛的合成 QA 測試套件，並非即時傳輸覆蓋率矩陣的一部分。

| 頻道     | Canary | 提及閘道 | 允許清單封鎖 | 頂層回覆 | 重新啟動恢復 | 執行緒後續追蹤 | 執行緒隔離 | 反應觀測 | 說明指令 |
| -------- | ------ | -------- | ------------ | -------- | ------------ | -------------- | ---------- | -------- | -------- |
| 矩陣     | x      | x        | x            | x        | x            | x              | x          | x        |          |
| Telegram | x      |          |              |          |              |                |            |          | x        |

### 透過 Convex 共用 Telegram 憑證 (v1)

當為 `openclaw qa telegram` 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從 Convex 支援的集區中取得獨佔租用，在頻道執行時對該租用發送心跳，並在關閉時釋放租用。

參考 Convex 專案腳手架：

- `qa/convex-credential-broker/`

所需的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個祕密金鑰：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI： `--credential-role maintainer|ci`
  - Env 預設值： `OPENCLAW_QA_CREDENTIAL_ROLE` (預設為 `maintainer`)

選用的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設為 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設為 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的追蹤 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許用於僅限本機開發的迴路 `http://` Convex URLs。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應使用 `https://`。

維護者管理指令 (pool add/remove/list) 特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在腳本和 CI 工具中使用 `--json` 以取得機器可讀的輸出。

預設端點合約 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 請求： `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功： `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗盡/可重試： `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 請求： `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功： `{ status: "ok" }` (或空 `2xx`)
- `POST /release`
  - 請求： `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功： `{ status: "ok" }` (或空 `2xx`)
- `POST /admin/add` (僅限維護者密鑰)
  - 請求： `{ kind, actorId, payload, note?, status? }`
  - 成功： `{ status: "ok", credential }`
- `POST /admin/remove` (僅限維護者密鑰)
  - 請求： `{ credentialId, actorId }`
  - 成功： `{ status: "ok", changed, credential }`
  - 作用中的租用防護： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (僅限維護者密鑰)
  - 請求： `{ kind?, status?, includePayload?, limit? }`
  - 成功： `{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數值的 Telegram 聊天 ID 字串。
- `admin/add` 會針對 `kind: "telegram"` 驗證此結構，並拒絕格式錯誤的 payload。

### 新增頻道至 QA

將頻道加入 markdown QA 系統需要剛好兩件事：

1. 該頻道的傳輸適配器（transport adapter）。
2. 一套用來測試頻道合約的情境包（scenario pack）。

當共享的 `qa-lab` 主機可以擁有此流程時，請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共享主機機制：

- `openclaw qa` 指令根目錄
- 測試套件的啟動與拆解
- 工作並發（worker concurrency）
- 寫入產出
- 報告生成
- 情境執行
- 舊版 `qa-channel` 情境的相容性別名

執行器外掛程式擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置閘道
- 如何檢查就緒狀態
- 如何注入傳入事件
- 如何觀察傳出訊息
- 如何公開對話紀錄和正規化的傳輸狀態
- 如何執行由傳輸支援的動作
- 如何處理傳輸特定的重置或清理

採用新頻道的最低門檻為：

1. 讓 `qa-lab` 保持為共享 `qa` 根目錄的擁有者。
2. 在共享的 `qa-lab` 主機接縫上實作傳輸執行器。
3. 將傳輸特定的機制保留在執行器外掛程式或頻道線束（channel harness）內部。
4. 將執行器掛載為 `openclaw qa <runner>`，而不是註冊競爭的根指令。
   執行器外掛程式應該在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出匹配的 `qaRunnerCliRegistrations` 陣列。
   保持 `runtime-api.ts` 輕量化；延遲 CLI 和執行器執行應保留在各自的進入點後方。
5. 在主題式 `qa/scenarios/` 目錄下撰寫或改寫 markdown 情境。
6. 對新情境使用通用的情境輔助程式。
7. 除非儲存庫正在進行有意遷移，否則請保持現有的相容性別名正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於單一頻道傳輸，請將其保留在該執行器外掛程式或外掛程式線束中。
- 如果某個場景需要多個通道都能使用的新功能，請在 `suite.ts` 中新增一個通用輔助函數，而不是新增通道特定的分支。
- 如果某個行為僅對一種傳輸有意義，請將該場景保持為特定於傳輸的，並在場景合約中明確說明。

新場景的首選通用輔助函數名稱為：

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

現有場景仍可使用相容性別名，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新通道的工作應使用通用輔助函數名稱。
相容性別名的存在是為了避免「旗幟日」式的遷移，而非作為新場景編寫的範例。

## 測試套件（什麼在哪裡執行）

將套件視為「現實感逐漸增加」（以及不穩定性/成本逐漸增加）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：在現有的已設定範圍的 Vitest 專案上進行十次連續的分片執行（`vitest.full-*.config.ts`）
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的 core/unit 清單，以及 `vitest.unit.config.ts` 涵蓋的已列入白名單的 `ui` node 測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、設定）
  - 已知錯誤的決定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應快速且穩定
- 專案備註：
  - 未指定的 `pnpm test` 現在會執行十一個較小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生 root-project 程序。這降低了高負載機器上的峰值 RSS，並避免了自動回覆/擴展工作搶占不相關套件的資源。
  - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監視迴圈並不實用。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先將明確的檔案/目錄目標路由到特定範圍的通道，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免付出完整的根專案啟動成本。
  - 當差異僅涉及可路由的來源/測試檔案時，`pnpm test:changed` 會將變更的 git 路徑擴展到相同的特定範圍通道；配置/設定編輯仍會退回到廣泛的根專案重新執行。
  - 來自代理、指令、外掛、自動回覆輔助程式、`plugin-sdk` 和類似純公用程式區域的匯入輕量型單元測試，會透過 `unit-fast` 通道路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時期繁重的檔案則保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` 輔助程式來源檔案也會將變更模式執行映射到這些輕量型通道中的明確同層級測試，因此輔助程式編輯可避免為該目錄重新執行完整的繁重套件。
  - `auto-reply` 現在有三個專用的儲存區：頂層核心輔助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這讓最繁重的回覆套接工作不會干擾廉價的狀態/區塊/符號測試。
- 嵌入式執行器說明：
  - 當您變更 message-tool 探索輸入或壓縮執行時期上下文時，請保留這兩個層級的覆蓋率。
  - 為純路由/正規化邊界加入專注的輔助迴歸測試。
  - 同時保持嵌入式執行器整合套件的健康狀態：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證作用域 ID 和壓縮行為是否仍能流經真實的 `run.ts` / `compact.ts` 路徑；僅依靠輔助測試不足以替代這些整合路徑。
- 集區備註：
  - 基礎 Vitest 設定現在預設為 `threads`。
  - 共用的 Vitest 設定也修正了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離執行器。
  - 根 UI 通道保留了其 `jsdom` 設定和優化器，但現在也運行在共用的非隔離執行器上。
  - 每個 `pnpm test` 分片都從共用的 Vitest 設定繼承相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在預設也會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯耗損。如果您需要與原生 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本機迭代備註：
  - 當變更的路徑清晰地對應到較小的套件時，`pnpm test:changed` 會透過作用域通道進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 Worker 上限。
  - 本機 Worker 自動擴展現在是有意為之的保守作法，並且當主機負載平均值已經很高時也會退讓，因此預設情況下多個並發的 Vitest 執行造成的損害較小。
  - 基礎 Vitest 設定將專案/設定檔標記為 `forceRerunTriggers`，以便當測試接線變更時，變更模式的重新執行保持正確。
  - 該設定在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要一個明確的快取位置以進行直接分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能調試備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的分析視圖限定於自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 比對路由後的 `test:changed` 與該提交差異的原生根專案路徑，並列印牆上時鐘時間以及 macOS 最大 RSS。
- `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs` 和根 Vitest 設定路由變更檔案清單，對目前的髒樹進行基準測試。
  - `pnpm test:perf:profile:main` 寫入 Vitest/Vite 啟動和轉換開銷的主執行緒 CPU 分析。
  - `pnpm test:perf:profile:runner` 為停用檔案並行處理的單元套件寫入執行程式 CPU+堆積記憶體分析。

### E2E（gateway smoketest）

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應 Worker（CI：最多 2 個，本機：預設 1 個）。
  - 預設以靜默模式執行，以減少主控台 I/O 開銷。
- 有用的覆寫：
  - `OPENCLAW_E2E_WORKERS=<n>` 以強制設定 Worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細的主控台輸出。
- 範圍：
  - 多執行個體 Gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多變動部分（可能較慢）

### E2E：OpenShell 後端 smoketest

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動隔離的 OpenShell Gateway
  - 從本機暫時性 Dockerfile 建立沙箱
  - 透過真實的 `sandbox ssh-config` + SSH 執行來測試 OpenClaw 的 OpenShell 後端
  - 透過沙箱 fs 橋接器驗證遠端標準檔案系統行為
- 預期：
  - 僅供選擇加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可正常運作的 Docker 守護程式
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試閘道和沙盒
- 有用的覆寫選項：
  - 當手動執行更廣泛的 e2e 測試套件時，使用 `OPENCLAW_E2E_OPENSHELL=1` 來啟用測試
  - 使用 `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實供應商 + 真實模型)

- 指令： `pnpm test:live`
- 設定： `vitest.live.config.ts`
- 檔案： `src/**/*.live.test.ts`
- 預設值：由 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型今天實際上是否能用真實憑證運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定 (真實網路、真實供應商政策、配額、停機)
  - 需要花費費用 / 使用速率限制
  - 偏好執行縮減的子集，而非「全部」
- Live 執行會 source `~/.profile` 以取得遺失的 API 金鑰。
- 預設情況下，live 執行仍會隔離 `HOME` 並將設定/驗證資料複製到臨時測試主目錄中，以免單元 fixture 修改您的真實 `~/.openclaw`。
- 僅在您有意需要 live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知並靜音閘道啟動日誌/Bonjour 閒聊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換 (特定供應商)：設定 `*_API_KEYS` 使用逗號/分號格式或 `*_API_KEY_1`, `*_API_KEY_2` (例如 `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行 per-live 覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會將進度行輸出到 stderr，以便即使 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能明確顯示其活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 的 console 攔截功能，讓提供商/閘道的進度行在 live runs 期間能立即串流顯示。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 來調整 direct-model 心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 來調整 gateway/probe 心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更了很多內容，則執行 `pnpm test:coverage`）
- 涉及閘道網路功能 / WS 協定 / 配對時：加入 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 特定提供商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫已連線的 Android 節點**目前廣告的所有指令**，並斷言指令合約行為。
- 範圍：
  - 預先條件/手動設定（此測試套件不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點，進行逐個指令的閘道 `node.invoke` 驗證。
- 必要的預先設定：
  - Android 應用程式已連線並與閘道配對。
  - 應用程式保持在前台。
  - 針對您預期會通過的功能，已授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳情：[Android App](/zh-Hant/platforms/android)

## Live：模型冒煙測試 (profile keys)

Live 測試分為兩個層級，以便我們隔離失敗：

- 「Direct model」告訴我們該提供商/模型是否能夠使用指定的金鑰回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線對該模型是否運作正常（sessions、history、tools、sandbox policy 等）。

### 第 1 層：Direct model 完成（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一個小型的完成請求（並在需要時執行目標的回歸測試）
- 如何啟用：
  - `pnpm test:live`（如果直接調用 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此套件；否則它會跳過以保持 `pnpm test:live` 專注於 gateway 測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行 modern 允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號分隔允許清單）
  - Modern/all sweeps 預設為一個經過策劃的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 可進行完整的 modern sweep，或設定一個正數以取得較小的上限。
- 如何選擇供應商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔允許清單）
- 金鑰來源：
  - 預設：profile store 和 env 後備機制
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 存在原因：
  - 將「供應商 API 故障 / 金鑰無效」與「gateway agent pipeline 故障」區分開來
  - 包含小型、獨立的迴歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具調用流程）

### 第 2 層：Gateway + dev agent 測試（"@openclaw" 實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動進程內 gateway
  - 建立/修補 `agent:dev:*` session（每次執行的模型覆寫）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的工具調用正常運作（read probe）
    - 可選的額外工具探測（exec+read probe）
    - OpenAI 迴歸路徑（僅工具調用 → 後續追蹤）保持正常運作
- 探測詳細資訊（以便您可以快速解釋失敗原因）：
  - `read` probe：測試在工作區中寫入一個 nonce 檔案，並要求 agent `read` 它並將 nonce 回傳。
  - `exec+read` probe：測試要求 agent `exec` 寫入一個 nonce 到暫存檔案，然後 `read` 回傳。
  - image probe：測試附加一個生成的 PNG（cat + 隨機程式碼）並期望模型返回 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（或直接呼叫 Vitest 時使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代白名單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代白名單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）以縮小範圍
  - 現代/所有 Gateway 掃描預設使用精選的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的現代掃描，或設定正數以使用較小的上限。
- 如何選擇供應商（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔白名單）
- 在此即時測試中，工具 + 圖像探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援圖像輸入時，會執行圖像探測
  - 流程（高層級）：
    - 測試會生成一個含有「CAT」 + 隨機代碼的微小 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 內嵌代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容錯度：允許微小錯誤）

提示：若要查看您機器上可以測試的內容（以及確切的 `provider/model` id），請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：CLI 後端冒煙測試（Claude、Codex、Gemini 或其他本機 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + 代理管道，而不影響您的預設配置。
- 特定後端的冒煙測試預設值位於所屬擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live`（或直接呼叫 Vitest 時使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設供應商/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/圖像行為來自所屬 CLI 後端外掛程式的元資料。
- 覆寫值（選用）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制當設定 `IMAGE_ARG` 時如何傳遞圖片參數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以傳送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以停用預設的 Claude Sonnet -> Opus 同一會話連續性探測（當選定的模型支援切換目標時，設定為 `1` 以強制啟用）。

範例：

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Docker 指令：

```bash
pnpm test:docker:live-cli-backend
```

單一供應商 Docker 指令：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在存放庫 Docker 映像檔內以非 root 使用者 `node` 的身分執行即時 CLI 後端冒煙測試。
- 它會從擁有的擴充功能解析 CLI 冒煙測試中繼資料，然後將相符的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過 `~/.claude/.credentials.json` 搭配 `claudeAiOauth.subscriptionType` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可移植的 Claude Code 訂閱 OAuth。它首先證明 Docker 中的直接 `claude -p`，然後在不保留 Anthropic API 金鑰環境變數的情況下執行兩個 Gateway CLI 後端輪次。此訂閱通道預設會停用 Claude MCP/工具和圖片探測，因為 Claude 目前將第三方應用程式的使用路徑由額外使用量計費而非一般訂閱方案限制。
- 即時 CLI 後端冒煙測試現在對 Claude、Codex 和 Gemini 執行相同的端對端流程：文字輪次、圖片分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設冒煙測試也會將會話從 Sonnet 修補為 Opus，並驗證恢復的會話仍記得之前的註記。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用真實的 ACP agent 驗證真實的 ACP conversation-bind 流程：
  - send `/acp spawn <agent> --bind here`
  - bind a synthetic message-channel conversation in place
  - send a normal follow-up on that same conversation
  - verify the follow-up lands in the bound ACP session transcript
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - ACP agents in Docker: `claude,codex,gemini`
  - ACP agent for direct `pnpm test:live ...`: `claude`
  - Synthetic channel: Slack DM-style conversation context
  - ACP backend: `acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 備註：
  - 此通道使用 gateway `chat.send` surface 以及僅限管理員的 synthetic originating-route 欄位，因此測試可以附加 message-channel context 而無需假裝從外部傳遞。
  - 當 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 未設定時，測試會使用嵌入式 `acpx` 外掛程式的內建 agent registry 來選取 ACP harness agent。

範例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker recipe:

```bash
pnpm test:docker:live-acp-bind
```

Single-agent Docker recipes:

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker notes:

- Docker runner 位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序針對所有支援的 live CLI agents 執行 ACP bind smoke：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮小範圍。
- 它來源 `~/.profile`，將相符的 CLI auth material 暫存至容器中，將 `acpx` 安裝至可寫入的 npm prefix，然後在缺少時安裝請求的 live CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`)。
- 在 Docker 內部，runner 會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，讓 acpx 保留來自載入設定檔的提供者環境變數，供子進程的 harness CLI 使用。

## Live：Codex app-server harness 測試

- 目標：透過一般的 gateway
  `agent` 方法驗證外掛擁有的 Codex harness：
  - 載入打包的 `codex` 外掛
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 傳送第一個 gateway agent 輪次到 `codex/gpt-5.4`
  - 向同一個 OpenClaw session 傳送第二個輪次，並驗證 app-server
    thread 能否恢復
  - 透過相同的 gateway 指令路徑
    執行 `/codex status` 和 `/codex models`
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`codex/gpt-5.4`
- 選用影像探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用 MCP/工具探測：`OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 該測試會設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法透過靜默回退到 PI 來通過測試。
- 驗證：來自 shell/profile 的 `OPENAI_API_KEY`，以及選用的複製
  `~/.codex/auth.json` 和 `~/.codex/config.toml`

本地配方：

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

- Docker runner 位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會載入掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，在有時複製 Codex CLI
  驗證檔，將 `@openai/codex` 安裝到可寫入的掛載 npm
  前綴，暫存原始碼樹，然後僅執行 Codex-harness 測試。
- Docker 預設會啟用影像和 MCP/工具探測。當您需要進行範圍較小的除錯執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，以符合測試
  設定，因此 `openai-codex/*` 或 PI 回退無法隱藏 Codex harness
  的回歸問題。

### 推薦的配方

狹窄、明確的允許清單速度最快且最不穩定：

- 單一模型，直接（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway 測試：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個提供者的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 專注 (Gemini API 金鑰 + Antigravity)：
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist 風格的 agent 端點)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的驗證 + 工具細節)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 檔案驗證)；這是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的驗證方式，且行為可能有所不同 (串流/工具支援/版本差異)。

## Live：模型矩陣 (我們涵蓋的範圍)

沒有固定的「CI 模型清單」 (live 是選用的)，但這些是在開發機器上使用金鑰定期涵蓋的 **建議** 模型。

### 現代化煙霧測試集 (工具呼叫 + 影像)

這是我們預期保持運作的「通用模型」執行：

- OpenAI (非 Codex): `openai/gpt-5.4` (選用: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免舊版 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

執行包含工具 + 影像的 gateway 煙霧測試：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫 (讀取 + 選用執行)

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

選用的額外涵蓋範圍 (最好有)：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral：`mistral/`…（選擇一個您已啟用的「工具」模型）
- Cerebras：`cerebras/`…（如果您有權限）
- LM Studio：`lmstudio/`…（本地；工具呼叫取決於 API 模式）

### Vision：影像發送（附件 → 多模態訊息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援影像的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試影像探測。

### 聚合器 / 替代閘道

如果您已啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...`（數百個模型；使用 `openclaw models scan` 尋找支援工具與影像的候選模型）
- OpenCode：Zen 使用 `opencode/...`，Go 使用 `opencode-go/...`（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

更多您可以在即時矩陣中包含的提供者（如果您有憑證/設定）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），以及任何 OpenAI/Anthropic 相容的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上返回的內容 + 可用的任何金鑰。

## 憑證（絕不提交）

即時測試會以與 CLI 相同的方式發現憑證。實際影響：

- 如果 CLI 能運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「無憑證」，請以除錯 `openclaw models list` / 模型選擇的相同方式進行除錯。

- Per-agent auth profiles: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (這就是 live 測試中「profile keys」的含義)
- Config: `~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- Legacy state dir: `~/.openclaw/credentials/` (如果存在，會複製到暫存的 live home 中，但不會複製到主要的 profile-key store)
- Live local runs 預設會將 active config、per-agent `auth-profiles.json` 檔案、legacy `credentials/` 以及支援的外部 CLI auth 目錄複製到臨時測試 home 中；staged live homes 會跳過 `workspace/` 和 `sandboxes/`，並且會移除 `agents.*.workspace` / `agentDir` 路徑覆蓋設定，以便探測不會影響您真實的 host workspace。

如果您想依賴 env keys (例如在您的 `~/.profile` 中匯出的)，請在 `source ~/.profile` 之後執行本機測試，或使用下方的 Docker runners (它們可以將 `~/.profile` 掛載到容器中)。

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
- Harness: `pnpm test:live:media image`
- Scope:
  - Enumerates every registered image-generation provider plugin
  - Loads missing provider env vars from your login shell (`~/.profile`) before probing
  - Uses live/env API keys ahead of stored auth profiles by default, so stale test keys in `auth-profiles.json` do not mask real shell credentials
  - Skips providers with no usable auth/profile/model
  - 透過共享執行時功能執行內建的圖像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的內建提供商：
  - `openai`
  - `google`
- 可選篩選：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存驗證並忽略僅環境變數的覆蓋設定

## 音樂生成即時測試

- 測試： `extensions/music-generation-providers.live.test.ts`
- 啟用： `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試框架： `pnpm test:live:media music`
- 範圍：
  - 執行共享的內建音樂生成提供商路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前，從您的登入 Shell (`~/.profile`) 載入提供商環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 Shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供商
  - 可用時執行兩個宣告的執行時模式：
    - `generate` 僅使用提示輸入
    - 當提供商宣告 `capabilities.edit.enabled` 時使用 `edit`
  - 目前共享通道的涵蓋範圍：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 獨立的 Comfy 即時檔案，非此共享掃描
- 可選篩選：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存驗證並忽略僅環境變數的覆蓋設定

## 影片生成即時測試

- 測試： `extensions/video-generation-providers.live.test.ts`
- 啟用： `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試框架： `pnpm test:live:media video`
- 範圍：
  - 執行共享的內建影片生成提供商路徑
  - 預設為版本安全的冒煙路徑：非 FAL 提供商、每個提供商一個文字到影片請求、一秒鐘的龍蝦提示，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供商操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為提供商端的佇列延遲可能會主導發佈時間；傳遞 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入提供商環境變數
  - 預設優先使用 live/env API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會掩蓋真實的 shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供商
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時也執行宣告的轉換模式：
    - 當提供商宣告 `capabilities.imageToVideo.enabled` 且選定的提供商/模型在共用掃描中接受緩衝支援的本機影像輸入時，執行 `imageToVideo`
    - 當提供商宣告 `capabilities.videoToVideo.enabled` 且選定的提供商/模型在共用掃描中接受緩衝支援的本機影片輸入時，執行 `videoToVideo`
  - 目前在共用掃描中已宣告但跳過的 `imageToVideo` 提供商：
    - `vydra` 因為捆綁的 `veo3` 僅限文字，且捆綁的 `kling` 需要遠端影像 URL
  - 特定提供商的 Vydra 涵蓋範圍：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案預設會執行 `veo3` 文字到影片，以及一個使用遠端影像 URL 裝置的 `kling` 通道
  - 目前的 `videoToVideo` 即時涵蓋範圍：
    - 僅當選定的模型為 `runway/gen4_aleph` 時執行 `runway`
  - 目前在共用掃描中已宣告但跳過的 `videoToVideo` 提供商：
    - `alibaba`、`qwen`、`xai` 因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google` 因為目前共用的 Gemini/Veo 通道使用本機緩衝區支援的輸入，而該路徑在共用掃描中不被接受
    - `openai` 因為目前共用的通道缺乏組織專屬的視訊重繪/重混存取保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在預設掃描中包含每個供應商，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個供應商的操作上限，進行積極的冒煙測試
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制執行設定檔存放區驗證並忽略僅限環境變數的覆寫

## 媒體即時測試線束

- 指令：`pnpm test:live:media`
- 目的：
  - 透過一個程式碼庫原生的入口點執行共用的圖片、音樂和視訊即時測試套件
  - 從 `~/.profile` 自動載入缺失的供應商環境變數
  - 預設情況下，自動將每個測試套件縮小範圍至目前具有可用驗證的供應商
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（可選的「適用於 Linux」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在程式碼庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的設定檔鍵值即時檔案，掛載您的本機設定目錄和工作區（並在掛載時載入 `~/.profile`）。對應的本機入口點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設使用較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確需要較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 live Docker 映像檔，然後將其重用於兩條 live Docker 路徑。
- Container smoke runners：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一個或多個真實容器，並驗證更高層級的整合路徑。

Live-model Docker runners 也只會 bind-mount 所需的 CLI auth 主目錄（或者在執行範圍未縮小時，掛載所有支援的主目錄），然後在執行前將其複製到容器主目錄中，以便外部-CLI OAuth 可以在不變更主機 auth 儲存區的情況下更新權杖：

- Direct models：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`）
- CLI backend smoke：`pnpm test:docker:live-cli-backend`（腳本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（腳本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Open WebUI live smoke：`pnpm test:docker:openwebui`（腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- Gateway networking (two containers, WS auth + health)：`pnpm test:docker:gateway-network`（腳本：`scripts/e2e/gateway-network-docker.sh`）
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke)：`pnpm test:docker:mcp-channels`（腳本：`scripts/e2e/mcp-channels-docker.sh`）
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics)：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）

即時模型 Docker 執行器也會將當前的原始碼以唯讀方式 bind-mount，並將其暫存至容器內的暫時工作目錄中。這既能保持執行時映像檔精簡，又能針對您的確切本地原始碼/設定執行 Vitest。
暫存步驟會跳過大型僅限本地的快取以及應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本地的 `.build` 或 Gradle 輸出目錄，如此一來，Docker 即時執行就不會花費數分鐘時間複製機器特定的產出。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以防止 gateway 即時探測在容器內啟動真正的 Telegram/Discord/等通道工作者。
`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 管道縮小或排除 gateway 即時覆蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一個更高層級的相容性測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定版本的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理傳送真實的聊天請求。
第一次執行可能會明顯變慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成自身的冷啟動設定。
此管道需要可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 執行中提供金鑰的主要方式。
成功的執行會列印出一個小型 JSON 載荷，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意的確定性測試，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個帶有種子的 Gateway 容器，啟動一個衍生 `openclaw mcp serve` 的第二個容器，然後透過真實的 stdio MCP 橋接器驗證路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的通道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 幀，因此測試驗證的是橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 恰好暴露的內容。

手動 ACP 自然語言執行緒冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於回歸/除錯工作流程。可能需要再次使用它來驗證 ACP 執行緒路由，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載到 `/home/node/.profile` 並在執行測試之前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用暫時的設定檔/工作區目錄且不掛載外部 CLI 認證
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設值：`~/.cache/openclaw/docker-cli-tools`）掛載到 `/home/node/.npm-global` 以用於 Docker 內的 CLI 快取安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案會以唯讀方式掛載到 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮減的提供者執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆蓋
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾提供者
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔，用於不需要重新建構的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保認證來自設定檔儲存（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道為 Open WebUI 冒煙測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用來覆寫 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用來覆寫固定的 Open WebUI 映像檔標籤

## Docs sanity

在文件編輯後執行檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify anchor 驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試（CI-safe）

這些是沒有真實提供者的「真實管線」回歸測試：

- Gateway 工具調用（模擬 OpenAI，真實的 gateway + agent 迴圈）：`src/gateway/gateway.test.ts` (案例："runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行認證）：`src/gateway/gateway.test.ts` (案例："runs wizard over ws and writes auth token config")

## Agent 可靠性評估（skills）

我們已經有一些行為類似「agent 可靠性評估」的 CI-safe 測試：

- 透過真實 gateway + agent 迴圈進行模擬工具調用 (`src/gateway/gateway.test.ts`)。
- 驗證 session 連線和配置效果的端對端精靈流程 (`src/gateway/gateway.test.ts`)。

Skills 目前仍缺少的部分（參見 [Skills](/zh-Hant/tools/skills)）：

- **決策：** 當 skills 列在提示中時，agent 是否會選擇正確的 skill（或避免不相關的）？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/引數？
- **工作流程合約：** 斷言工具順序、session 歷史傳遞和沙箱邊界的多輪對話場景。

未來的評估應首先保持確定性：

- 使用模擬提供者的場景執行器，以斷言工具調用 + 順序、skill 檔案讀取和 session 連線。
- 一小套專注於 skill 的場景（使用 vs 避免、閘道、提示注入）。
- 可選的實時評估（opt-in，env-gated）僅在 CI-safe 套件就緒後進行。

## 合約測試（plugin 和 channel 形狀）

合約測試驗證每個已註冊的外掛程式和頻道都符合其介面合約。它們會遍歷所有發現的外掛程式並執行一系列形狀和行為斷言。預設的 `pnpm test` unit 軌道會刻意跳過這些共享接縫和冒煙測試檔案；當您接觸共享頻道或供應商介面時，請明確執行合約指令。

### 指令

- 所有合約： `pnpm test:contracts`
- 僅限頻道合約： `pnpm test:contracts:channels`
- 僅限供應商合約： `pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛程式形狀 (id, name, capabilities)
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息 Payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - Thread ID 處理
- **directory** - 名錄/名冊 API
- **group-policy** - 群組政策強制執行

### 供應商狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - 外掛程式註冊表形狀

### 供應商合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型型錄 API
- **discovery** - 外掛程式探索
- **loader** - 外掛程式載入
- **runtime** - 供應商執行時
- **shape** - 外掛程式形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改頻道或供應商外掛程式之後
- 重構外掛程式註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試 (指引)

當您修正在 live 中發現的供應商/模型問題時：

- 如果可能的話，請加入 CI 相容的回歸測試 (mock/stub 供應商，或擷取確切的請求形狀轉換)
- 如果本質上僅限 live (速率限制、驗證政策)，請保持 live 測試的範圍狹窄，並透過環境變數選擇加入
- 優先以能捕捉到 Bug 的最小層級為目標：
  - 供應商請求轉換/重播 Bug → 直接模型測試
  - gateway 會話/歷史/工具管線 Bug → gateway live 冒煙測試或 CI 相容的 gateway mock 測試
- SecretRef 遍列防護機制：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄表元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別衍生一個採樣目標，然後斷言遍列區段 (traversal-segment) 執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。該測試會針對未分類的目標 ID 故意失敗，以免新類別被無聲略過。
