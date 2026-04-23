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

- 完整門檻（推送前預期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
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
- Moonshot/Kimi 成本冒煙測試：設置 `MOONSHOT_API_KEY`，執行
  `openclaw models list --provider moonshot --json`，然後針對 `moonshot/kimi-k2.6` 執行一個獨立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。
  驗證 JSON 報告了 Moonshot/K2.6 且助手對話記錄儲存了標準化的 `usage.cost`。

提示：當您只需要一個失敗案例時，建議優先使用下面描述的 allowlist 環境變數來縮小即時測試範圍。

## QA 專用執行器

當您需要 QA 實驗室級別的真實性時，這些指令會位於主要測試套件旁邊：

- `pnpm openclaw qa suite`
  - 直接在主機上執行基於儲存庫的 QA 場景。
  - 預設使用獨立的 gateway worker 並行執行多個選定的場景。`qa-channel` 預設並發數為 4（受限於選定的場景數量）。使用 `--concurrency <count>` 調整 worker 數量，或使用 `--concurrency 1` 進行較舊的序列執行。
  - 當任何場景失敗時，以非零代碼退出。當您想要在不導致失敗退出的情況下取得產出物時，請使用 `--allow-failures`。
  - 支援供應商模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 會啟動一個本地的 AIMock 支援供應商伺服器，用於實驗性
    的 fixture 和協議 mock 覆蓋率，而不會取代具備場景感知能力的
    `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性使用的 Multipass Linux VM 中執行相同的 QA 套件。
  - 保持與主機上的 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的供應商/模型選擇旗標。
  - Live 執行會轉發實際上適合客端的支援 QA 驗證輸入：
    基於環境變數的供應商金鑰、QA live 供應商設定路徑，以及存在時的 `CODEX_HOME`。
  - 輸出目錄必須保持在儲存庫根目錄下，以便客端可以透過掛載的工作區寫回資料。
  - 在 `.artifacts/qa-e2e/...` 下寫入正常的 QA 報告 + 摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動基於 Docker 的 QA 站台，用於操作員風格的 QA 工作。
- `pnpm test:docker:bundled-channel-deps`
  - 在 Docker 中打包並安裝當前的 OpenClaw 構建，啟動配置了 OpenAI 的 Gateway，然後透過配置編輯啟用 Telegram 和 Discord。
  - 驗證第一次 Gateway 重啟會按需安裝每個打包的頻道插件的運行時依賴項，而第二次重啟不會重新安裝已啟用的依賴項。
- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，用於直接協議冒煙測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix Live QA 行程。
  - 此 QA 主機目前僅限 repo/dev 使用。打包的 OpenClaw 安裝不包含 `qa-lab`，因此不會公開 `openclaw qa`。
  - Repo 檢出會直接載入打包的 runner；無需單獨的安裝插件步驟。
  - 配置三個臨時 Matrix 使用者 (`driver`, `sut`, `observer`) 以及一個私人房間，然後啟動一個 QA gateway 子進程，將真實的 Matrix 插件作為 SUT 傳輸。
  - 預設使用固定的穩定 Tuwunel 映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。當您需要測試不同的映像檔時，可以使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆寫。
  - Matrix 不公開共享的憑證來源標誌，因為該行程會在本機配置一次性使用者。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Matrix QA 報告、摘要、觀察到的事件產出以及合併的 stdout/stderr 輸出日誌。
- `pnpm openclaw qa telegram`
  - 使用來自環境變數的 driver 和 SUT bot 權杖，針對真實的私人群組執行 Telegram Live QA 行程。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 id 必須是 Telegram 的數位聊天 id。
  - 支援 `--credential-source convex` 用於共享的集區憑證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 當任何情境失敗時以非零代碼退出。當您需要產出而不需要失敗的退出代碼時，請使用 `--allow-failures`。
  - 需要在同一私人群組中有兩個不同的 bot，且 SUT bot 公開 Telegram 使用者名稱。
  - 為了穩定的機器人對機器人觀測，請在 `@BotFather` 中為兩個機器人啟用機器人對機器人通訊模式，並確保驅動機器人可以觀察群組機器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下撰寫 Telegram QA 報告、摘要和已觀察訊息的產出。

Live transport lanes 共享一個標準合約，以便新的 transports 不會偏離：

`qa-channel` 仍然是廣泛的綜合 QA 套件，不是 live
transport 覆蓋率矩陣的一部分。

| Lane     | Canary | Mention gating | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command |
| -------- | ------ | -------------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ |
| Matrix   | x      | x              | x               | x               | x              | x                | x                | x                    |              |
| Telegram | x      |                |                 |                 |                |                  |                  |                      | x            |

### 透過 Convex 共享 Telegram 憑證 (v1)

當為 `openclaw qa telegram` 啟用
`--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從 Convex 支援的池中獲取獨佔租約，在 lane 執行時發送該租約的心跳，並在關閉時釋放租約。

參考 Convex 專案架構：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個秘密：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI： `--credential-role maintainer|ci`
  - Env 預設值： `OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

可選的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (可選的 trace id)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅用於本機開發的迴路 `http://` Convex URLs。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應該使用 `https://`。

維護者管理指令（pool add/remove/list）特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

供維護者使用的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在腳本和 CI 公用程式中使用 `--json` 以獲得機器可讀的輸出。

預設端點合約（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 請求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /admin/add`（僅限維護者密鑰）
  - 請求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（僅限維護者密鑰）
  - 請求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活躍租約守衛：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（僅限維護者密鑰）
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 形狀：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數值的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此形狀並拒絕格式錯誤的 payload。

### 將頻道加入 QA

將頻道加入 markdown QA 系統僅需要兩件事：

1. 該頻道的傳輸適配器。
2. 用於測試頻道合約的情境套件。

當共用的 `qa-lab` 主機可以
擁有該流程時，請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共用主機機制：

- `openclaw qa` 指令根目錄
- 套件啟動和拆卸
- 工作執行並行性
- 成品寫入
- 報告生成
- 場景執行
- 舊版 `qa-channel` 場景的相容性別名

Runner 插件擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共享的 `qa` 根目錄下
- 如何為該傳輸配置網關
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開逐字稿和標準化的傳輸狀態
- 如何執行傳輸支援的動作
- 如何處理傳輸特定的重置或清理

採用新管道的最低門檻是：

1. 保持 `qa-lab` 為共享 `qa` 根目錄的擁有者。
2. 在共享 `qa-lab` 主機接縫上實現傳輸 runner。
3. 將傳輸特定的機制保留在 runner 插件或管道繫具內。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根命令。
   Runner 插件應在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出匹配的 `qaRunnerCliRegistrations` 陣列。
   保持 `runtime-api.ts` 輕量化；延遲 CLI 和 runner 執行應保留在單獨的進入點後。
5. 在主題 `qa/scenarios/` 目錄下編寫或調整 markdown 場景。
6. 為新場景使用通用場景輔助函式。
7. 除非倉庫正在進行有意義的遷移，否則請保持現有相容性別名正常運作。

決策規則是嚴格的：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為依賴於一個管道傳輸，請將其保留在該 runner 插件或插件繫具中。
- 如果場景需要多個管道都可以使用的新功能，請新增通用輔助函式，而不是在 `suite.ts` 中新增管道特定的分支。
- 如果行為僅對一種傳輸有意義，請保持場景傳輸特定性，並在場景合約中明確說明。

新場景的首選通用輔助函式名稱為：

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

相容性別名對於現有場景仍然可用，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新通道的工作應使用通用輔助函式名稱。
相容性別名的存在是為了避免旗幟式遷移（flag day migration），而不是作為
編寫新場景的模型。

## 測試套件（在哪裡運行）

可以將這些套件視為「現實性遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：在現有的範圍限定 Vitest 專案上進行十個連續的分片運行（`vitest.full-*.config.ts`）
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的 core/unit 清單，以及由 `vitest.unit.config.ts` 涵蓋的白名單 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway 驗證、路由、工具、解析、設定）
  - 針對已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中運行
  - 不需要真實金鑰
  - 應該快速且穩定
- 專案說明：
  - 無目標 `pnpm test` 現在運行十一個較小的分片設定（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這降低了負載機器上的峰值 RSS，並避免自動回覆/擴充功能工作搶占不相關套件的資源。
  - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監看迴圈並不實際。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先透過範圍通道路由明確的檔案/目錄目標，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
  - 當差異僅涉及可路由的原始碼/測試檔案時，`pnpm test:changed` 會將變更的 git 路徑展開至相同的範圍通道；組態/設定編輯仍會退回到廣泛的根專案重新執行。
  - `pnpm check:changed` 是用於狹窄工作的正常智慧本地閘道。它會將差異分類為核心、核心測試、擴充功能、擴充功能測試、應用程式、文件和工具，然後執行對應的型別檢查/Lint/測試通道。由於擴充功能依賴這些核心合約，因此公開 Plugin SDK 和 plugin-contract 變更包含擴充功能驗證。
  - 來自代理程式、指令、外掛程式、自動回覆協助程式、`plugin-sdk` 和類似純工具區域的輕量匯入單元測試，會透過 `unit-fast` 通道進行路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；有狀態/重度執行時期的檔案則保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` 協助程式原始碼檔案也會將變更模式執行對應至這些輕量通道中的明確同層級測試，因此協助程式編輯可避免為該目錄重新執行完整的重度測試組。
  - `auto-reply` 現在有專用的三個儲存貯體：頂層核心協助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這可將最繁重的回覆擷取器工作從廉價的狀態/區塊/Token 測試中分離出來。
- 嵌入式執行器注意事項：
  - 當您變更 message-tool 探索輸入或壓縮執行時期內容時，
    請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界新增專注的協助程式回歸測試。
  - 同時也要保持嵌入式執行器整合測試組的健康狀況：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件驗證了範圍 ID 和壓縮行為仍然流經真實的 `run.ts` / `compact.ts` 路徑；僅測試輔助函數並不足以取代這些整合路徑的測試。
- Pool 說明：
  - 基礎 Vitest 設定現在預設為 `threads`。
  - 共用的 Vitest 設定也修正了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離執行器。
  - 根 UI 通道保留了其 `jsdom` 設定和最佳化工具，但現在也運行在共用的非隔離執行器上。
  - 每個 `pnpm test` 分片都繼承了共用 Vitest 設定中相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在預設也會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯反覆重複。如果您需要與原生 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代說明：
  - `pnpm changed:lanes` 顯示差異觸發了哪些架構通道。
  - Pre-commit hook 在暫存格式化/Linting 之後運行 `pnpm check:changed --staged`，因此僅影響核心的提交不會付出擴充功能測試的代價，除非它們涉及公開對外的擴充功能契約。
  - 當變更的路徑清晰對應到較小的套件時，`pnpm test:changed` 會透過範圍通道進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 Worker 上限。
  - 本地 Worker 自動擴縮現在刻意採取保守策略，並且在主機平均負載已經很高時會退縮，因此多個並發的 Vitest 執行預設造成的影響會較小。
  - 基礎 Vitest 設定將專案/設定檔標記為 `forceRerunTriggers`，以便當測試接線變更時，變更模式下的重新執行保持正確。
  - 該設定在支援的主機上保持啟用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您想要一個明確的快取位置進行直接效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能除錯說明：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的性能分析視圖範圍限定為自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由的 `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印 wall time 和 macOS max RSS。
- `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs` 和根 Vitest 配置路由變更檔案列表，對當前的 dirty tree 進行基準測試。
  - `pnpm test:perf:profile:main` 為 Vitest/Vite 啟動和轉換開銷撰寫主執行緒 CPU 配置檔案。
  - `pnpm test:perf:profile:runner` 在停用檔案並行處理的情況下，為單元測試套件撰寫 runner CPU+heap 配置檔案。

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應 workers (CI: 最多 2 個，本機: 預設 1 個)。
  - 預設以靜音模式執行以減少 console I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制 worker 數量 (上限為 16)。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細 console 輸出。
- 範圍：
  - 多實例 gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對以及更繁重的網路操作
- 預期：
  - 在 CI 中執行 (當在 pipeline 中啟用時)
  - 不需要真實的金鑰
  - 比單元測試有更多活動部件 (可能會比較慢)

### E2E: OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個隔離的 OpenShell gateway
  - 從暫存的本地 Dockerfile 建立一個沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙盒 fs 橋接器驗證 remote-canonical 檔案系統行為
- 預期：
  - 僅供選擇加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後摧毀測試 gateway 和沙盒
- 有用的覆寫：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用此測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live（真實的供應商 + 真實的模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型在*今天*是否能實際使用真實憑證運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定（真實網路、真實供應商政策、配額、服務中斷）
  - 需要花費金錢 / 使用速率限制
  - 優先執行縮小的子集，而非「全部」
- Live 執行會 source `~/.profile` 以載入缺失的 API 金鑰。
- 預設情況下，live 執行仍會隔離 `HOME`，並將設定/驗證資料複製到臨時測試主目錄中，因此單元測試 fixture 無法修改您的真實 `~/.openclaw`。
- 僅當您有意讓 live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為更安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知並靜音 gateway bootstrap 日誌/Bonjour 雜訊。如果您想要恢復完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換（特定供應商）：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行個別 live 覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會向 stderr 輸出進度行，因此即使 Vitest console 擷取處於安靜狀態，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest console 攔截，以便在 live 執行期間立即串流供應商/gateway 的進度行。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直連模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道器/探測的心跳。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果修改很多，則執行 `pnpm test:coverage`）
- 涉及閘道器網路功能 / WS 協議 / 配對時：新增 `pnpm test:e2e`
- 調試「我的機器人掛了」/ 特定提供商故障 / 工具調用：執行指定的 `pnpm test:live`

## 實時：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：呼叫已連接 Android 節點**當前廣告的每個指令**，並斷言指令合約行為。
- 範圍：
  - 預設/手動設定（該套件不會安裝/執行/配對應用程式）。
  - 對所選 Android 節點逐一指令進行閘道器 `node.invoke` 驗證。
- 必需的預先設定：
  - Android 應用程式已連接並與閘道器配對。
  - 應用程式保持在前台。
  - 已授予您預期會通過的功能所需權限/擷取同意。
- 可選的目標覆蓋：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定細節：[Android App](/zh-Hant/platforms/android)

## 實時：模型冒煙測試 (profile keys)

實時測試分為兩層，以便我們隔離故障：

- 「Direct model」告訴我們提供商/模型是否能使用指定的金鑰進行回應。
- 「Gateway smoke」告訴我們完整的閘道器+代理管道是否對該模型正常運作（sessions、歷史記錄、工具、沙箱原則等）。

### 第一層：直連模型完成（無閘道器）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉已發現的模型
  - 使用 `getApiKeyForModel` 來選擇您有憑證的模型
  - 對每個模型執行一個小型完成操作（並在需要時執行目標迴歸測試）
- 如何啟用：
  - `pnpm test:live`（或直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此套件；否則它會跳過，以保持 `pnpm test:live` 專注於 gateway 的冒煙測試
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行現代版白名單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是現代版白名單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號分隔白名單）
  - Modern/all 掃描預設為經過挑選的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行完整的現代掃描，或設定一個正數作為較小的上限。
- 如何選擇提供商：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔白名單）
- 金鑰來源：
  - 預設：profile store 和環境變數後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 為何存在此設定：
  - 區分「提供者 API 損壞 / 金鑰無效」與「gateway agent pipeline 損壞」
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses reasoning replay + tool-call flows）

### Layer 2: Gateway + dev agent smoke（即 "@openclaw" 實際執行的內容）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內的 gateway
  - 建立/修補 `agent:dev:*` session（每次執行時覆蓋模型）
  - 迭代帶有金鑰的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實的工具呼叫運作正常（read probe）
    - 可選的額外工具探針（exec+read probe）
    - OpenAI 回歸路徑（tool-call-only → follow-up）持續運作
- 探針詳情（以便您快速解釋失敗原因）：
  - `read` probe：測試會在工作區寫入一個 nonce 檔案，並要求 agent `read` 該檔案並回傳 nonce。
  - `exec+read` probe：測試會要求 agent `exec`-write 一個 nonce 到暫存檔，然後 `read` 回來。
  - image probe：測試會附加一個生成的 PNG（cat + 隨機程式碼）並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（如果直接調用 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代白名單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代白名單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔列表）以縮小範圍
  - 現代/所有 Gateway 掃描預設為精選的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的現代掃描，或設定正數以使用較小的上限。
- 如何選擇供應商（避免「全部透過 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔白名單）
- 在此即時測試中，工具 + 圖片探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型宣稱支援圖片輸入時，會執行圖片探測
  - 流程（高層級）：
    - 測試生成一個包含「CAT」+ 隨機代碼的微小 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]`（`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`）
    - 嵌入式代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 代碼（OCR 容錯率：允許小幅錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：CLI 後端冒煙測試（Claude、Codex、Gemini 或其他本地 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI 後端驗證 Gateway + 代理流程，且不影響您的預設配置。
- 特定於後端的冒煙測試預設值位於所屬擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live`（如果直接調用 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設：
  - 預設供應商/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/圖片行為來自所屬 CLI 後端外掛程式的元數據。
- 覆寫（可選）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 用於發送真實圖片附件（路徑會被注入到提示詞中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 用於將圖片檔案路徑作為 CLI 參數傳遞，而不是透過提示詞注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (或 `"list"`) 用於控制當設定 `IMAGE_ARG` 時圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 用於發送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 用於停用預設的 Claude Sonnet -> Opus 同一會話連續性探測（當選定的模型支援切換目標時，設為 `1` 可強制啟用）。

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
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 執行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它以非 root 使用者 `node` 的身分，在 repo Docker 映像檔內執行即時 CLI-backend smoke 測試。
- 它會解析所屬擴充功能的 CLI smoke 元資料，然後將相應的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過 `~/.claude/.credentials.json` 搭配 `claudeAiOauth.subscriptionType` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可攜式 Claude Code 訂閱 OAuth 驗證。它首先證明 Docker 中直接的 `claude -p`，然後執行兩個 Gateway CLI-backend 輪次，而不保留 Anthropic API-key 環境變數。此訂閱通道預設停用 Claude MCP/工具和圖片探測，因為 Claude 目前將第三方應用程式使用量路由透過額外使用量計費，而不是正常的訂閱方案限制。
- 即時 CLI-backend smoke 現在對 Claude、Codex 和 Gemini 執行相同的端到端流程：文字輪次、圖片分類輪次，然後是透過 gateway CLI 驗證的 MCP `cron` 工具呼叫。
- Claude 的預設 smoke 也會將會話從 Sonnet 切換到 Opus，並驗證恢復的會話仍記得之前的註記。

## 即時：ACP 綁定 smoke (`/acp spawn ... --bind here`)

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用真實的 ACP 代理驗證真實的 ACP 對話綁定流程：
  - 傳送 `/acp spawn <agent> --bind here`
  - 就地綁定一個綜合訊息通道對話
  - 在同一個對話上傳送一個正常的後續訊息
  - 驗證後續訊息是否出現在綁定的 ACP 會話記錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP 代理：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP 代理：`claude`
  - 綜合通道：Slack 私訊風格的對話上下文
  - ACP 後端：`acpx`
- 覆蓋：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 備註：
  - 此通道使用具有僅限管理員的綜合來源路由欄位的閘道 `chat.send` 表面，以便測試可以附加訊息通道上下文，而無需假裝在外部傳遞。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式的內建代理登錄表來處理選定的 ACP 鞍具代理。

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

單一代理 Docker 配方：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker 備註：

- Docker 執行器位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序針對所有支援的即時 CLI 代理執行 ACP 綁定冒煙測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮減矩陣。
- 它來源 `~/.profile`，將相符的 CLI 認證資料暫存到容器中，將 `acpx` 安裝到可寫入的 npm 前綴中，然後如果缺少請求的即時 CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`) 則安裝它。
- 在 Docker 內部，執行器設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 讓來源設定檔中的提供者環境變數可供子鞍具 CLI 使用。

## 即時：Codex 應用程式伺服器鞍具冒煙測試

- 目標：透過一般的 gateway
  `agent` 方法驗證 plugin-owned Codex harness：
  - 載入打包好的 `codex` 外掛程式
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 傳送第一個 gateway agent 輪次到 `codex/gpt-5.4`
  - 傳送第二個輪次到同一個 OpenClaw session，並驗證 app-server
    thread 可以恢復
  - 透過相同的 gateway 指令路徑
    執行 `/codex status` 和 `/codex models`
- 測試： `src/gateway/gateway-codex-harness.live.test.ts`
- 啟用： `OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型： `codex/gpt-5.4`
- 選用圖像探測： `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用 MCP/tool 探測： `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 此 smoke 測試設定了 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法透過無聲回退到 PI 來通過測試。
- 驗證：來自 shell/profile 的 `OPENAI_API_KEY`，以及可選的複製
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

Docker 備註：

- Docker runner 位於 `scripts/test-live-codex-harness-docker.sh`。
- 它來源於掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，在存在時複製 Codex CLI
  驗證檔案，將 `@openai/codex` 安裝到可寫入的掛載 npm
  前綴，暫存來源樹，然後僅執行 Codex-harness live 測試。
- Docker 預設會啟用圖像和 MCP/tool 探測。當您需要更窄的除錯執行時，設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，符合 live
  測試設定，因此 `openai-codex/*` 或 PI 回退無法隱藏 Codex harness
  的迴歸。

### 推薦的 live 配方

狹窄、明確的許可清單最快且最不不穩定：

- 單一模型，直接（無 gateway）：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個提供者的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 重點（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)： `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)： `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist-style agent endpoint)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (獨立的 auth + tooling quirks)。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 通過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / profile auth)；這就是大多數使用者所指的 “Gemini”。
  - CLI：OpenClaw 呼叫本機 `gemini` 二進位檔案；它有自己的 auth，並且行為可能不同 (streaming/tool support/version skew)。

## Live: model matrix (涵蓋範圍)

沒有固定的 “CI 模型清單” (live 是選用的)，但這些是在擁有金鑰的開發機器上建議定期涵蓋的模型。

### Modern smoke set (工具呼叫 + 圖片)

這是我們預期保持運作的「常見模型」執行：

- OpenAI (non-Codex): `openai/gpt-5.4` (選用: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免舊版 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

執行包含工具 + 圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Baseline: tool calling (Read + 選用 Exec)

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

選用的額外涵蓋範圍 (最好有)：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個您已啟用的「工具」相容模型)
- Cerebras: `cerebras/`… (如果您有存取權)
- LM Studio: `lmstudio/`… (本地；工具調取取決於 API 模式)

### Vision：圖片發送 (附件 → 多模態訊息)

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型 (Claude/Gemini/OpenAI 支援圖片的變體等)，以運行圖片探測。

### 聚合器 / 替代閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter：`openrouter/...` (數百個模型；使用 `openclaw models scan` 尋找支援工具和圖片的候選)
- OpenCode：`opencode/...` 用於 Zen，`opencode-go/...` 用於 Go (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行身份驗證)

您可以在即時矩陣中包含的其他供應商 (如果您有憑證/設定)：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio、vLLM、LiteLLM 等)

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上返回的內容，加上可用的金鑰。

## 憑證 (絕不提交)

即時測試以與 CLI 相同的方式發現憑證。實際含義如下：

- 如果 CLI 可以運作，即時測試應該能找到相同的金鑰。
- 如果即時測試顯示「no creds」(無憑證)，請像除錯 `openclaw models list` / 模型選擇一樣進行除錯。

- 每個代理的身份驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (這就是即時測試中「profile keys」的含義)
- 設定：`~/.openclaw/openclaw.json` (或 `OPENCLAW_CONFIG_PATH`)
- 舊版狀態目錄：`~/.openclaw/credentials/`（如果存在，會複製到暫存 live 主目錄中，但不會複製到主要 profile-key 存儲）
- Live 本地運行預設會將現用設定、每個代理的 `auth-profiles.json` 檔案、舊版 `credentials/` 和支援的外部 CLI 認證目錄複製到臨時測試主目錄中；暫存 live 主目錄會跳過 `workspace/` 和 `sandboxes/`，並且會移除 `agents.*.workspace` / `agentDir` 路徑覆蓋，以便探測不會接觸到您真實的主機工作區。

如果您想依賴環境金鑰（例如在您的 `~/.profile` 中匯出的金鑰），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live（音訊轉錄）

- 測試：`src/media-understanding/providers/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`src/agents/byteplus.live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- 可選模型覆蓋：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI 工作流程媒體 live

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 測試內建的 comfy 圖片、影片和 `music_generate` 路徑
  - 除非已設定 `models.providers.comfy.<capability>`，否則跳過每個功能
  - 在變更 comfy 工作流程提交、輪詢、下載或外掛程式註冊後很有用

## 圖片生成 live

- 測試：`src/image-generation/runtime.live.test.ts`
- 指令：`pnpm test:live src/image-generation/runtime.live.test.ts`
- 測試工具：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖片生成提供者外掛程式
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入缺失的提供者環境變數
  - 預設優先使用 live/env API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的提供者
  - 透過共享執行時功能執行標準圖片生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的捆綁提供商：
  - `openai`
  - `google`
- 可選範圍縮小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 強制使用設定檔儲存的驗證，並忽略僅限環境變數的覆蓋設定

## 音樂生成即時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試框架：`pnpm test:live:media music`
- 範圍：
  - 測試共用的捆綁音樂生成提供商路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前，從您的登入 Shell (`~/.profile`) 載入提供商環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的驗證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 Shell 憑證
  - 跳過沒有可用驗證/設定檔/模型的提供商
  - 當可用時，執行兩種宣告的執行模式：
    - `generate` 使用僅提示詞輸入
    - 當提供商宣告 `capabilities.edit.enabled` 時使用 `edit`
  - 目前共用通道的覆蓋範圍：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：獨立的 Comfy 即時檔案，並非此共用的掃描測試
- 可選範圍縮小：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 強制使用設定檔儲存的驗證，並忽略僅限環境變數的覆蓋設定

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試框架：`pnpm test:live:media video`
- 範圍：
  - 測試共用的捆綁影片生成提供商路徑
  - 預設為發布安全的冒煙測試路徑：非 FAL 提供商、每個提供商一個文字生成影片請求、一秒鐘的龍蝦提示詞，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供商操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為供應商端的佇列延遲可能佔據大部分發布時間；請傳入 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入供應商環境變數
  - 預設優先使用即時/環境變數 API 金鑰，而非儲存的認證設定檔，因此 `auth-profiles.json` 中過期的測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的供應商
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時一併執行宣告的轉換模式：
    - 當供應商宣告 `capabilities.imageToVideo.enabled` 且所選供應商/模型在共享測試中接受緩衝區支援的本機圖片輸入時，執行 `imageToVideo`
    - 當供應商宣告 `capabilities.videoToVideo.enabled` 且所選供應商/模型在共享測試中接受緩衝區支援的本機影片輸入時，執行 `videoToVideo`
  - 目前在共享測試中已宣告但跳過的 `imageToVideo` 供應商：
    - `vydra`，因為內建的 `veo3` 僅支援文字，而內建的 `kling` 需要遠端圖片 URL
  - 供應商特定的 Vydra 涵蓋範圍：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案預設會執行 `veo3` 文字生影片，加上使用遠端圖片 URL fixture 的 `kling` 通道
  - 目前 `videoToVideo` 的即時涵蓋範圍：
    - 僅當選定的模型為 `runway/gen4_aleph` 時才執行 `runway`
  - 目前在共享測試中已宣告但跳過的 `videoToVideo` 供應商：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前的共享 Gemini/Veo 通道使用本機緩衝區支援的輸入，而該路徑在共享測試中不被接受
    - `openai`，因為目前的共享通道缺乏組織特定的影片重繪/重混存取保證
- 選用性縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以在預設掃描中包含每個提供者，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個提供者的操作上限，進行積極的冒煙測試
- 可選的授權行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用 profile-store 授權並忽略僅環境變數的覆寫

## 媒體即時測試工具

- 指令：`pnpm test:live:media`
- 目的：
  - 透過一個倉庫原生入口點執行共享的圖片、音樂和影片即時測試套件
  - 從 `~/.profile` 自動載入缺失的提供者環境變數
  - 預設情況下，會自動將每個套件縮小至目前具有可用授權的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式的行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（可選的「適用於 Linux」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在倉庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的 profile-key 即時檔案，並掛載您的本機設定目錄和工作區（如果掛載了 `~/.profile` 也會載入）。對應的本機入口點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設使用較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確想要進行較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次即時 Docker 映像檔，然後在兩個即時 Docker 路徑中重複使用它。
- Container smoke 執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一個或多個真實容器並驗證更高層級的整合路徑。

即時模型 Docker 執行器還會僅 bind-mount 所需的 CLI 認證家目錄（或在執行範圍未縮小時掛載所有支援的目錄），然後在執行前將其複製到容器家目錄中，以便外部 CLI OAuth 可以刷新令牌而不會變更主機認證儲存：

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

live-model Docker 執行器也會以唯讀方式掛載目前的 checkout，並將其暫存到容器內的暫時工作目錄中。這使執行時映像檔保持精簡，同時仍能針對您本地的確切原始碼/設定執行 Vitest。暫存步驟會跳過大型本地快取與應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本地的 `.build` 或 Gradle 輸出目錄，因此 Docker live 執行不會花費數分鐘複製機器特定的成品。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，讓 gateway live probes 不會在容器內啟動真正的 Telegram/Discord/等頻道 worker。`test:docker:live-models` 仍然會執行 `pnpm test:live`，因此當您需要從該 Docker 通道縮小或排除 gateway live 涵蓋範圍時，也請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高層級的相容性冒煙測試：它會啟動一個已啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` proxy 發送真實的聊天請求。第一次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成其自身的冷啟動設定。此通道預期需要可用的 live model 金鑰，而在 Docker 化執行中，`OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是提供它的主要方式。成功的執行會列印一個小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 是刻意設計為確定性的，不需要真正的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個已植入種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、外發傳送路由，以及 Claude 風格的頻道與權限通知。通知檢查會直接檢查原始 stdio MCP 幀，因此冒煙測試驗證的是橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 恰好呈現的內容。

手動 ACP 純文字執行緒冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本用於回歸/除錯工作流程。它可能再次需要用於 ACP 執行緒路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` (預設： `~/.openclaw`) 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (預設： `~/.openclaw/workspace`) 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (預設： `~/.profile`) 掛載至 `/home/node/.profile` 並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用臨時設定/工作區目錄且無外部 CLI 認證掛載
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (預設： `~/.cache/openclaw/docker-cli-tools`) 掛載至 `/home/node/.npm-global` 用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載在 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄： `.minimax`
  - 預設檔案： `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 縮小的提供者執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、 `OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號清單（例如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆蓋
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾提供者
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔進行不需要重建的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保認證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道為 Open WebUI 冒煙測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用來覆寫 Open WebUI smoke 使用的 nonce 檢查提示
- `OPENWEBUI_IMAGE=...` 用來覆寫固定的 Open WebUI 映像檔標籤

## 文件完整性檢查

文件編輯後執行文件檢查：`pnpm check:docs`。
當您也需要頁內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線迴歸測試（CI 安全）

這些是沒有真實供應商的「真實管道」迴歸測試：

- Gateway 工具調用（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts` (案例: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`, 寫入設定 + 強制執行驗證)：`src/gateway/gateway.test.ts` (案例: "runs wizard over ws and writes auth token config")

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全的測試，其行為類似「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具調用 (`src/gateway/gateway.test.ts`)。
- 驗證會話連線和設定效果的端到端精靈流程 (`src/gateway/gateway.test.ts`)。

技能方面仍然缺少什麼（參見 [技能](/zh-Hant/tools/skills))：

- **決策：**當提示中列出了技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：**agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約：**斷言工具順序、會話歷史延續以及沙箱邊界的多輪場景。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景運行器，以斷言工具調用 + 順序、技能檔案讀取和會話連線。
- 一小套專注於技能的場景（使用 vs 避免、閘門、提示注入）。
- 僅在建立 CI 安全測試套件後，才進行選用的即時評估（自選、環境閘門）。

## 合約測試（外掛程式和通道形狀）

合約測試會驗證每個已註冊的外掛和頻道都符合其介面合約。它們會遍歷所有發現的外掛，並執行一系列形狀和行為斷言。預設的 `pnpm test` unit lane 會故意跳過這些共享的 seam 和 smoke 檔案；當您觸及共享的頻道或 provider 表面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限頻道合約：`pnpm test:contracts:channels`
- 僅限 Provider 合約：`pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本 plugin 形狀（id, name, capabilities）
- **setup** - 設定精靈合約
- **session-binding** - Session 綁定行為
- **outbound-payload** - 訊息 payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - Thread ID 處理
- **directory** - Directory/roster API
- **group-policy** - 群組原則執行

### Provider 狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - Plugin registry 形狀

### Provider 合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - Auth 流程合約
- **auth-choice** - Auth 選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - Plugin 探索
- **loader** - Plugin 載入
- **runtime** - Provider 執行時期
- **shape** - Plugin 形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改頻道或 provider plugin 之後
- 重構 plugin 註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試（指引）

當您修復在 live 中發現的 provider/model 問題時：

- 如果可能，加入 CI 安全的迴歸測試（mock/stub provider，或擷取確切的 request-shape 轉換）
- 如果它本質上只能在 live 中執行（速率限制、auth 原則），請將 live 測試縮小範圍並透過環境變數 opt-in
- 優先以能捕捉到 bug 的最小層級為目標：
  - provider request 轉換/重放 bug → direct models 測試
  - gateway session/history/tool pipeline bug → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍歷防護措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別派生一個採樣目標，然後斷言遍歷區段執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會對未分類的目標 ID 故意導致失敗，以免新類別被無聲略過。
