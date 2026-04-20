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
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 內執行相同的 QA 測試組。
  - 在主機上保持與 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - Live 執行會轉發適用於客端的受支援 QA 認證輸入：
    基於環境變數的提供者金鑰、QA live 提供者設定路徑，以及當存在時的 `CODEX_HOME`
    。
  - 輸出目錄必須保持在儲存庫根目錄下，以便客端可以透過掛載的工作區寫回。
  - 將標準 QA 報告 + 摘要以及 Multipass 日誌寫入
    `.artifacts/qa-e2e/...` 之下。
- `pnpm qa:lab:up`
  - 啟動支援 Docker 的 QA 網站，用於操作員風格的 QA 工作。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA 通道。
  - 此 QA 主機目前僅限儲存庫/開發者使用。打包的 OpenClaw 安裝程式不包含
    `qa-lab`，因此不會公開 `openclaw qa`。
  - 儲存庫檢出會直接載入內建的執行器；無需單獨安裝外掛程式的步驟。
  - 佈建三個暫時的 Matrix 使用者（`driver`、 `sut`、 `observer`）以及一個私人聊天室，然後以真實的 Matrix 外掛程式作為 SUT 傳輸層，啟動 QA gateway 子行程。
  - 預設使用固定的穩定 Tuwunel 映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。當您需要測試不同的映像檔時，使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆蓋。
  - Matrix 不公開共享的認證來源標誌，因為通道會在本地配置一次性使用者。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Matrix QA 報告、摘要和觀察到的事件（observed-events）產出物。
- `pnpm openclaw qa telegram`
  - 使用來自環境變數的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數位聊天 ID。
  - 支援 `--credential-source convex` 用於共享的集區認證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選用集區租用。
  - 需要在同一個私人群組中有兩個不同的機器人，且 SUT 機器人必須公開 Telegram 使用者名稱。
  - 為了進行穩定的機器人對機器人觀察，請在 `@BotFather` 中為兩個機器人啟用「機器人對機器人通訊模式」（Bot-to-Bot Communication Mode），並確保驅動程式機器人可以觀察群組機器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察到的訊息（observed-messages）產出物。

即時傳輸通道共享一個標準合約，以確保新的傳輸不會偏離標準：

`qa-channel` 仍然是廣泛的綜合 QA 測試套件，不是即時
傳輸覆蓋率矩陣的一部分。

| 通道     | 金絲雀 | 提及閘道 | 許可清單區塊 | 頂層回覆 | 重新啟動恢復 | 串列後續追蹤 | 串列隔離 | 反應觀察 | 說明指令 |
| -------- | ------ | -------- | ------------ | -------- | ------------ | ------------ | -------- | -------- | -------- |
| Matrix   | x      | x        | x            | x        | x            | x            | x        | x        |          |
| Telegram | x      |          |              |          |              |              |          |          | x        |

### 透過 Convex 共享 Telegram 認證 (v1)

當為 `openclaw qa telegram` 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，
QA 實驗室會從 Convex 支援的集區中取得獨佔租用，在通道執行時發送該租用的心跳，並在關閉時釋放租用。

參考 Convex 專案腳手架：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個密鑰：
  - 用於 `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI：`--credential-role maintainer|ci`
  - 環境變數預設值：`OPENCLAW_QA_CREDENTIAL_ROLE`（預設為 `maintainer`）

選用環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（預設 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（預設 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（預設 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（預設 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（預設 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（選用的追蹤 ID）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅本地開發使用回送 `http://` Convex URL。

正常操作中，`OPENCLAW_QA_CONVEX_SITE_URL` 應使用 `https://`。

維護者管理指令（pool add/remove/list）特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在腳本和 CI 公用程式中，使用 `--json` 以取得機器可讀的輸出。

預設端點契約（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 請求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
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
  - 作用中租約防護：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（僅限維護者密鑰）
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 形狀：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此形狀，並拒絕格式錯誤的 payload。

### 將頻道加入 QA

將頻道加入 markdown QA 系統只需要兩件事：

1. 該頻道的傳輸適配器。
2. 用於測試頻道契約的場景套件。

當共用的 `qa-lab` 主機可以擁有該流程時，請勿新增新的頂層 QA 命令根。

`qa-lab` 擁有共用主機機制：

- `openclaw qa` 命令根
- 套件啟動與拆卸
- 工作並行
- 寫入產出
- 報告生成
- 場景執行
- 舊版 `qa-channel` 場景的相容性別名

Runner 外掛擁有傳輸契約：

- `openclaw qa <runner>` 如何掛載在共用的 `qa` 根之下
- 針對該傳輸如何設定閘道
- 如何檢查就緒狀態
- 如何注入入站事件
- 如何觀察出站訊息
- 如何公開對話紀錄和正規化的傳輸狀態
- 如何執行傳輸支援的操作
- 如何處理傳輸特定的重設或清理

採用新頻道的最低門檻是：

1. 保持 `qa-lab` 作為共用 `qa` 根的擁有者。
2. 在共用的 `qa-lab` 主機接縫上實作傳輸 runner。
3. 將傳輸特定的機制保留在 runner 外掛或頻道線具內。
4. 將 runner 掛載為 `openclaw qa <runner>`，而不是註冊競爭的根命令。
   Runner 外掛應在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。
   保持 `runtime-api.ts` 輕量化；延遲 CLI 和 runner 執行應保留在個別的進入點後方。
5. 在 `qa/scenarios/` 下撰寫或調整 markdown 場景。
6. 針對新的情境使用通用情境輔助函式。
7. 除非 repo 正在進行有意識的遷移，否則請保持現有的相容性別名可正常運作。

決策規則很嚴格：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於單一通道傳輸，請將其保留在該 runner 外掛程式或外掛程式 harness 中。
- 如果情境需要多個通道都能使用的新功能，請新增一個通用輔助函式，而不是在 `suite.ts` 中新增特定於通道的分支。
- 如果某個行為僅對一種傳輸有意義，請將情境保持為特定於傳輸，並在情境合約中明確說明。

新情境的首選通用輔助函式名稱為：

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

相容性別名仍可於現有情況中使用，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新通道的工作應使用通用輔助函式名稱。
相容性別名的存在是為了避免一次性大遷移，而非作為
新情境編寫的模型。

## 測試套件（在哪裡執行什麼）

將這些套件視為「真實性遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：在現有的已設定範圍的 Vitest 專案上進行十次連續分片執行（`vitest.full-*.config.ts`）
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清單，以及由 `vitest.unit.config.ts` 涵蓋的白名單 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway auth、routing、tooling、parsing、config）
  - 針對已知錯誤的決定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實的金鑰
  - 應該快速且穩定
- 專案備註：
  - 未指定目標的 `pnpm test` 現在會執行十一個較小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是單一巨大的原生根專案程序。這減少了負載機器上的峰值 RSS，並避免自動回覆/擴充功能工作導致不相關的測試套件飢餓。
  - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監視循環並不實際。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先將明確的檔案/目錄目標路由到限定範圍的通道，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
  - 當差異僅涉及可路由的來源/測試檔案時，`pnpm test:changed` 會將變更的 git 路徑擴充至相同的限定範圍通道；配置/設定的編輯仍會回退到廣泛的根專案重新執行。
  - 來自代理程式、命令、外掛程式、自動回覆輔助程式、`plugin-sdk` 以及類似純工具區域的低匯入負載單元測試，會透過 `unit-fast` 通道進行路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；有狀態/運行時負載較重的檔案則保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` 輔助程式來源檔案也會將變更模式執行對應到那些輕量通道中的明確同層級測試，因此輔助程式的編輯可避免為該目錄重新執行完整的繁重測試套件。
  - `auto-reply` 現在有三個專用的貯體：頂層核心輔助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這可將最繁重的回覆線束工作與廉價的狀態/區塊/記號測試分開。
- 嵌入式執行程式備註：
  - 當您變更 message-tool 發現輸入或壓縮執行時期內容時，
    請同時保持這兩個層級的覆蓋率。
  - 為純路由/正規化邊界增加專注的輔助迴歸測試。
  - 同時也要保持嵌入式 runner 整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證範圍 ID 和壓縮行為是否仍能正確通過真實的 `run.ts` / `compact.ts` 路徑；僅依靠輔助測試並無法完全取代這些整合路徑。
- 集區備註：
  - 基礎 Vitest 設定現在預設為 `threads`。
  - 共享的 Vitest 設定也修正了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離 runner。
  - 根 UI lane 保留了其 `jsdom` 設定和最佳化工具，但現在也運行在共享的非隔離 runner 上。
  - 每個 `pnpm test` 分片都會從共享 Vitest 設定繼承相同的 `threads` + `isolate: false` 預設值。
  - 共享的 `scripts/run-vitest.mjs` 啟動器現在也會預設為 Vitest 子 Node 程序加入 `--no-maglev`，以減少大型本地執行期間的 V8 編譯反覆運算。如果您需要與標準 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地疊代備註：
  - 當變更的路徑清楚地對應到較小的套件時，`pnpm test:changed` 會透過範圍 lane 進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 worker 上限。
  - 本地 worker 自動擴展現在是有意設計為保守的，並且當主機平均負載已經很高時也會退讓，因此預設情況下多個並發的 Vitest 執行造成的損害較小。
  - 基礎 Vitest 設定將專案/設定檔標記為 `forceRerunTriggers`，以便當測試接線變更時，變更模式的重新執行保持正確。
  - 該設定在支援的主機上保持啟用 `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果您需要一個明確的快取位置以進行直接分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能除錯備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的分析檢視範圍限制在自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由的 `test:changed` 與該提交差異的原生根專案路徑進行比較，並印出 wall time 以及 macOS max RSS。
- `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs` 和根 Vitest 設定路由變更的檔案清單，對當前的 dirty tree 進行基準測試。
  - `pnpm test:perf:profile:main` 為 Vitest/Vite 啟動和轉換開銷寫入主執行緒 CPU profile。
  - `pnpm test:perf:profile:runner` 在停用檔案並行處理的情況下，為 unit suite 寫入 runner CPU+heap profiles。

### E2E (gateway smoke)

- 指令： `pnpm test:e2e`
- 設定： `vitest.e2e.config.ts`
- 檔案： `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應 workers (CI：最多 2 個，本機：預設 1 個)。
  - 預設以靜默模式執行，以減少 console I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制設定 worker 數量 (上限 16 個)。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的 console 輸出。
- 範圍：
  - 多實例 gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對以及更繁重的網路操作
- 預期：
  - 在 CI 中執行 (當在 pipeline 中啟用時)
  - 不需要真實的金鑰
  - 比單元測試有更多運作部件 (可能較慢)

### E2E: OpenShell backend smoke

- 指令： `pnpm test:e2e:openshell`
- 檔案： `test/openshell-sandbox.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個隔離的 OpenShell gateway
  - 從暫時的本機 Dockerfile 建立一個沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙盒 fs 橋接器驗證 remote-canonical 檔案系統行為
- 預期：
  - 僅供選擇加入；不屬於預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可正常運作的 Docker daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 gateway 和 sandbox
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 用於在手動執行更廣泛的 e2e suite 時啟用測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用於指向非預設的 CLI binary 或包裝腳本

### Live (真實供應商 + 真實模型)

- 指令： `pnpm test:live`
- 設定： `vitest.live.config.ts`
- 檔案： `src/**/*.live.test.ts`
- 預設：由 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型在*今天*是否真的能使用真實憑證運作？」
  - 擷取供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 依設計不具 CI 穩定性 (真實網路、真實供應商政策、配額、停機)
  - 需要花費 / 使用速率限制
  - 建議執行縮小的子集而非「全部」
- Live 執行會 source `~/.profile` 以取得遺失的 API 金鑰。
- 預設情況下，live 執行仍會隔離 `HOME` 並將設定/驗證資料複製到暫存測試主目錄，因此 unit fixtures 不會修改您的真實 `~/.openclaw`。
- 僅當您刻意需要 live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它保留 `[live] ...` 進度輸出，但隱藏額外的 `~/.profile` 通知並靜音 gateway bootstrap 日誌/Bonjour 閒談。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替 (特定供應商)：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、 `*_API_KEY_2` (例如 `OPENAI_API_KEYS`、 `ANTHROPIC_API_KEYS`、 `GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行 per-live 覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live suites 現在會將進度行輸出到 stderr，因此即使 Vitest console 擷取處於安靜狀態，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，讓提供者/閘道的進度行在即時執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測的心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果變動很大，也執行 `pnpm test:coverage`）
- 涉及閘道網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 偵錯「我的機器人掛了」/ 特定提供者失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：叫用已連接的 Android 節點**目前廣告的每個指令**，並斷言指令合約行為。
- 範圍：
  - 前置條件/手動設定（該測試套件不會安裝/執行/配對應用程式）。
  - 針對選定的 Android 節點進行逐項指令的閘道 `node.invoke` 驗證。
- 必要的前置設定：
  - Android 應用程式已連線並與閘道配對。
  - 應用程式保持在前台。
  - 已針對您預期通過的功能授予權限/擷取同意。
- 選用的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定細節：[Android 應用程式](/en/platforms/android)

## Live：模型冒煙測試 (profile keys)

Live 測試分為兩層，以便我們隔離失敗原因：

- 「直接模型」告訴我們該提供者/模型是否至少能使用給定的金鑰進行回應。
- 「閘道冒煙測試」告訴我們完整的閘道+代理管線對該模型是否運作正常（工作階段、歷程記錄、工具、沙箱原則等）。

### 第 1 層：直接模型補全（無閘道）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 對每個模型執行小型補全（以及在需要時執行目標迴歸測試）
- 啟用方式：
  - `pnpm test:live`（如果直接調用 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此測試套件；否則會跳過，以保持 `pnpm test:live` 專注於 gateway smoke
- 如何選擇模型：
  - `OPENCLAW_LIVE_MODELS=modern` 用於執行 modern allowlist（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern allowlist 的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號分隔 allowlist）
  - Modern/all 掃描預設為經過策劃的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行徹底的 modern 掃描，或設定正數以使用較小的上限。
- 如何選擇提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔 allowlist）
- Key 來源：
  - 預設：profile store 和 env 後備
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以僅強制使用 **profile store**
- 存在原因：
  - 將「提供者 API 損壞 / key 無效」與「gateway agent 管道損壞」區分開來
  - 包含小型、獨立的迴歸測試（例如：OpenAI Responses/Codex Responses reasoning replay + tool-call flows）

### Layer 2: Gateway + dev agent smoke（即 "@openclaw" 實際執行的操作）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動一個程序內的 gateway
  - 建立/修補 `agent:dev:*` session（每次執行覆寫模型）
  - 迭代帶有 key 的模型並斷言：
    - 「有意義的」回應（無工具）
    - 真實工具調用運作正常（read probe）
    - 可選的額外工具探測（exec+read probe）
    - OpenAI 迴歸路徑（tool-call-only → follow-up）保持正常運作
- 探測細節（以便您快速解釋失敗原因）：
  - `read` 探測：測試在工作區中寫入一個 nonce 檔案，並要求 agent `read` 它並將 nonce 回顯回來。
  - `exec+read` 探測：測試要求 agent 將 nonce `exec`-寫入暫存檔案，然後將其 `read` 回來。
  - 圖像探測：測試附加一個生成的 PNG（貓 + 隨機代碼）並期望模型返回 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live` (或 `OPENCLAW_LIVE_TEST=1` 若直接呼叫 Vitest)
- 如何選擇模型：
  - 預設：現代允許清單 (Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (或逗號清單) 來縮小範圍
  - 現代/所有 Gateway 掃描預設為精選的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的現代掃描，或設定正數以使用更小的上限。
- 如何選擇供應商 (避免「OpenRouter 全選")：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (逗號允許清單)
- 在即時測試中，工具 + 圖片探測始終開啟：
  - `read` 探測 + `exec+read` 探測 (工具壓力)
  - 當模型宣稱支援圖片輸入時，會執行圖片探測
  - 流程 (高層級)：
    - 測試產生一個帶有「CAT」+ 隨機代碼的微型 PNG (`src/gateway/live-image-probe.ts`)
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理 將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 該代碼 (OCR 容錯：允許輕微錯誤)

提示：若要查看您機器上可以測試的內容 (以及確切的 `provider/model` id)，請執行：

```bash
openclaw models list
openclaw models list --json
```

## 即時：CLI 後端冒煙測試 (Claude、Codex、Gemini 或其他本地 CLI)

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本地 CLI 後端驗證 Gateway + 代理 管線，而不會影響您的預設設定。
- 特定後端的冒煙測試預設值與擁有擴充功能的 `cli-backend.ts` 定義在一起。
- 啟用：
  - `pnpm test:live` (或 `OPENCLAW_LIVE_TEST=1` 若直接呼叫 Vitest)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設供應商/模型：`claude-cli/claude-sonnet-4-6`
  - 指令/參數/圖片行為來自擁有的 CLI 後端外掛程式中繼資料。
- 覆寫 (選用)：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以傳送真實的圖片附件（路徑會被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將圖片檔案路徑作為 CLI 參數傳遞，而非透過提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制當設定 `IMAGE_ARG` 時，圖片參數的傳遞方式。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪對話並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以停用預設的 Claude Sonnet -> Opus 同期連續性探測（當選定的模型支援切換目標時，設定為 `1` 可強制啟用）。

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

- Docker 執行程式位於 `scripts/test-live-cli-backend-docker.sh`。
- 它會在儲存庫 Docker 映像檔中，以非 root 使用者 `node` 的身分執行即時 CLI 後端冒煙測試。
- 它會從擁有的擴充功能解析 CLI 冒煙測試元資料，然後將相符的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR`（預設：`~/.cache/openclaw/docker-cli-tools`）的快取可寫入前綴中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過 `claude setup-token` 的 `~/.claude/.credentials.json` 搭配 `claudeAiOauth.subscriptionType` 或 `CLAUDE_CODE_OAUTH_TOKEN` 來取得可攜式 Claude Code 訂閱 OAuth。它首先在 Docker 中證明直接的 `claude -p`，然後在不保留 Anthropic API 金鑰環境變數的情況下執行兩個 Gateway CLI 後端輪次。此訂閱通道預設會停用 Claude MCP/工具和圖片探測，因為 Claude 目前將第三方應用程式使用量透過額外使用量計費而非一般訂閱方案限制進行路由。
- 即時 CLI 後端冒煙測試現在对 Claude、Codex 和 Gemini 執行相同的端到端流程：文字輪次、圖片分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設 smok 測試也會將 session 從 Sonnet 切換至 Opus，並驗證恢復的 session 是否仍記得先前的註記。

## Live：ACP bind smok 測試 (`/acp spawn ... --bind here`)

- 測試：`src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用真實的 ACP agent 驗證真實的 ACP conversation-bind 流程：
  - 發送 `/acp spawn <agent> --bind here`
  - 原地綁定一個綜合 message-channel conversation
  - 在同一個 conversation 上發送正常的後續訊息
  - 驗證後續訊息是否出現在綁定的 ACP session 記錄中
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP agents：`claude,codex,gemini`
  - 直接 `pnpm test:live ...` 的 ACP agent：`claude`
  - 綜合頻道：Slack DM 風格的 conversation 語境
  - ACP 後端：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- 備註：
  - 此通道使用具有僅限管理員的綜合 originating-route 欄位的 gateway `chat.send` 介面，以便測試可以在無需偽裝外部交付的情況下附加 message-channel 語境。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式的內建 agent 註冊表來選取 ACP harness agent。

範例：

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Docker 食譜：

```bash
pnpm test:docker:live-acp-bind
```

單一 agent Docker 食譜：

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Docker 備註：

- Docker runner 位於 `scripts/test-live-acp-bind-docker.sh`。
- 預設情況下，它會依序對所有支援的即時 CLI agents 執行 ACP bind smok 測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮小矩陣範圍。
- 它會來源 `~/.profile`，將符合的 CLI 認證資料暫存到容器中，將 `acpx` 安裝到可寫入的 npm 前綴，然後安裝請求的即時 CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`) (如果缺少的話)。
- 在 Docker 內部，執行器會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 從來源的 profile 中保留提供者環境變數，供子層 harness CLI 使用。

## Live：Codex app-server harness smoke

- 目標：透過正常的 gateway
  `agent` 方法驗證外掛擁有的 Codex harness：
  - 載入打包的 `codex` 外掛
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 發送第一個 gateway agent 輪次到 `codex/gpt-5.4`
  - 發送第二個輪次到同一個 OpenClaw session 並驗證 app-server
    thread 能夠恢復
  - 透過相同的 gateway 指令
    路徑執行 `/codex status` 和 `/codex models`
- 測試： `src/gateway/gateway-codex-harness.live.test.ts`
- 啟用： `OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型： `codex/gpt-5.4`
- 可選映像檔探測： `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 可選 MCP/工具探測： `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 此 smoke 測試會設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法通過無聲退回到 PI 來偽裝成功。
- 驗證：來自 shell/profile 的 `OPENAI_API_KEY`，加上可選複製的
  `~/.codex/auth.json` 和 `~/.codex/config.toml`

Local 指令碼：

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker 指令碼：

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker 說明：

- Docker 執行器位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會來源掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，當存在時複製 Codex CLI
  驗證檔，安裝 `@openai/codex` 到可寫入的掛載 npm
  前綴，暫存原始碼樹，然後僅執行 Codex-harness live 測試。
- Docker 預設啟用映像檔和 MCP/工具探測。當你需要更狹窄的除錯執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，符合 live
  測試設定，以便 `openai-codex/*` 或 PI 退回無法隱藏 Codex harness
  回歸問題。

### 推薦的 live 指令碼

狹窄、明確的允許清單是最快且最不不穩定的：

- 單一模型，直接 (無 gateway)：
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個提供者的工具呼叫：
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 側重（Gemini API 金鑰 + Antigravity）：
  - Gemini (API 金鑰)：`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth)：`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

備註：

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器（Cloud Code Assist 風格的 agent 端點）。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI（獨立的驗證 + 工具特性）。
- Gemini API vs Gemini CLI：
  - API：OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / 個人資料驗證)；這也是大多數使用者所指的「Gemini」。
  - CLI：OpenClaw 呼叫本機 `gemini` 執行檔；它有自己的驗證方式，且行為可能有所不同（串流/工具支援/版本差異）。

## Live：模型矩陣（涵蓋範圍）

沒有固定的「CI 模型清單」（Live 為選用），但這些是在開發機器上使用金鑰定期測試的**建議**模型。

### 現代基本測試集（工具呼叫 + 圖片）

這是我們預期持續運作的「通用模型」執行：

- OpenAI (non-Codex)：`openai/gpt-5.4` (選用：`openai/gpt-5.4-mini`)
- OpenAI Codex：`openai-codex/gpt-5.4`
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API)：`google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免舊版 Gemini 2.x 模型)
- Google (Antigravity)：`google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

執行包含工具與圖片的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（讀取 + 選用執行）

每個供應商系列至少選擇一個：

- OpenAI：`openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic：`anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google：`google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM)：`zai/glm-4.7`
- MiniMax：`minimax/MiniMax-M2.7`

選用的額外涵蓋範圍（最好具備）：

- xAI：`xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (挑選一個您已啟用且支援「工具」功能的模型)
- Cerebras: `cerebras/`… (如果您有權限存取)
- LM Studio: `lmstudio/`… (本機；工具呼叫取決於 API 模式)

### Vision: 圖片發送 (附件 → 多模態訊息)

請在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援圖片的模型（Claude/Gemini/OpenAI 支援視覺的變體等）以測試圖片探針。

### 聚合器 / 其他閘道

如果您啟用了金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百個模型；使用 `openclaw models scan` 尋找支援工具+圖片的候選模型)
- OpenCode: Zen 使用 `opencode/...`，Go 使用 `opencode-go/...` (透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證)

更多您可以包含在即時矩陣中的提供商 (如果您有憑證/設定)：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers` (自訂端點)：`minimax` (雲端/API)，以及任何 OpenAI/Anthropic 相容的代理 (LM Studio、vLLM、LiteLLM 等)

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上傳回的內容加上任何可用的金鑰。

## 憑證 (切勿提交)

即時測試使用與 CLI 相同的方式探索憑證。實際影響：

- 如果 CLI 能正常運作，即時測試應該也能找到相同的金鑰。
- 如果即時測試顯示「no creds」(無憑證)，請使用與偵錯 `openclaw models list` / 模型選擇相同的方式進行偵錯。

- Per-agent auth profiles: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (this is what “profile keys” means in the live tests)
- Config: `~/.openclaw/openclaw.json` (or `OPENCLAW_CONFIG_PATH`)
- Legacy state dir: `~/.openclaw/credentials/` (copied into the staged live home when present, but not the main profile-key store)
- Live local runs copy the active config, per-agent `auth-profiles.json` files, legacy `credentials/`, and supported external CLI auth dirs into a temp test home by default; staged live homes skip `workspace/` and `sandboxes/`, and `agents.*.workspace` / `agentDir` path overrides are stripped so probes stay off your real host workspace.

If you want to rely on env keys (e.g. exported in your `~/.profile`), run local tests after `source ~/.profile`, or use the Docker runners below (they can mount `~/.profile` into the container).

## Deepgram live (audio transcription)

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
  - 透過共享執行時功能運行庫存圖像生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的打包供應商：
  - `openai`
  - `google`
- 可選範圍縮小：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- 可選身份驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制執行配置文件存儲的身份驗證並忽略僅限環境的覆蓋

## 音樂生成實時測試

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試框架：`pnpm test:live:media music`
- 範圍：
  - 運行共享打包的音樂生成供應商路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在探測之前從您的登入 shell (`~/.profile`) 加載供應商環境變量
  - 預設優先使用實時/環境 API 金鑰而非存儲的身份驗證配置文件，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用身份驗證/配置文件/模型的供應商
  - 可用時運行兩個聲明的執行時模式：
    - `generate` 使用僅提示輸入
    - 當供應商聲明 `capabilities.edit.enabled` 時運行 `edit`
  - 當前共享通道覆蓋範圍：
    - `google`: `generate`, `edit`
    - `minimax`: `generate`
    - `comfy`: 單獨的 Comfy 實時文件，而非此共享掃描
- 可選範圍縮小：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選身份驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制執行配置文件存儲的身份驗證並忽略僅限環境的覆蓋

## 影片生成實時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試框架：`pnpm test:live:media video`
- 範圍：
  - 運行共享打包的影片生成供應商路徑
  - 預設為發行安全的冒煙測試路徑：非 FAL 提供者、每個提供者一個文生影片請求、一秒鐘的龙虾提示詞，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供者操作上限（預設為 `180000`）
  - 預設跳過 FAL，因為提供者端的佇列延遲可能會主導發行時間；傳遞 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入提供者環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過期測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用認證/設定檔/模型的提供者
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時也執行宣告的轉換模式：
    - 當提供者宣告 `capabilities.imageToVideo.enabled` 且選定的提供者/模型在共用掃描中接受緩衝區支援的本機圖片輸入時，執行 `imageToVideo`
    - 當提供者宣告 `capabilities.videoToVideo.enabled` 且選定的提供者/模型在共用掃描中接受緩衝區支援的本機影片輸入時，執行 `videoToVideo`
  - 目前共用掃描中已宣告但跳過的 `imageToVideo` 提供者：
    - `vydra`，因為內建的 `veo3` 僅支援文字，而內建的 `kling` 需要遠端圖片 URL
  - 特定提供者的 Vydra 涵蓋範圍：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案預設執行 `veo3` 文生影片，加上一個使用遠端圖片 URL 設備的 `kling` 通道
  - 目前的 `videoToVideo` 即時涵蓋範圍：
    - `runway` 僅在選定的模型是 `runway/gen4_aleph` 時
  - 目前共用掃描中已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前共享的 Gemini/Veo 通道使用本機緩衝備份輸入，而該路徑在共享掃描中不被接受
    - `openai`，因為目前共享的通道缺乏特定組織的視訊修補/重混存取權限保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以將每個提供者包含在預設掃描中，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個提供者的操作上限，進行積極的冒煙測試
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔存放區驗證，並忽略僅限環境變數的覆寫

## 媒體即時套件

- 指令：`pnpm test:live:media`
- 目的：
  - 透過一個儲存庫原生進入點執行共享的圖片、音樂和視訊即時測試套件
  - 從 `~/.profile` 自動載入缺失的提供者環境變數
  - 預設會自動將每個測試套件縮小範圍至目前具有可用驗證的提供者
  - 重複使用 `scripts/test-live.mjs`，因此心跳和靜音模式的行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（可選的「適用於 Linux」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在儲存庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其匹配的設定檔金鑰即時檔案，掛載您的本機設定目錄和工作區（並在掛載時載入 `~/.profile`）。匹配的本機進入點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設使用較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確想要進行較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 live Docker 映像檔，然後在兩個 live Docker 通道中重複使用它。
- Container smoke 執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:gateway-network`、`test:docker:mcp-channels` 和 `test:docker:plugins` 會啟動一或多個真實容器並驗證更高層級的整合路徑。

Live-model Docker 執行器也會僅 bind-mount 所需的 CLI 認證主目錄 (或在執行範圍未縮小時，掛載所有支援的目錄)，然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以重新整理權杖，而無需變更主機認證儲存區：

- Direct models：`pnpm test:docker:live-models` (腳本：`scripts/test-live-models-docker.sh`)
- ACP bind smoke：`pnpm test:docker:live-acp-bind` (腳本：`scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke：`pnpm test:docker:live-cli-backend` (腳本：`scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness` (腳本：`scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent：`pnpm test:docker:live-gateway` (腳本：`scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke：`pnpm test:docker:openwebui` (腳本：`scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke)：`pnpm test:docker:mcp-channels` (腳本：`scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics)：`pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)

即時模型 Docker 執行器也會以唯讀方式綁定掛載目前的 checkout，並將其暫存到容器內的臨時工作目錄中。這能讓執行時映像檔保持精簡，同時仍針對您的確切本機原始碼/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，因此 Docker 即時執行不會花費數分鐘時間複製機器特定的構件。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway 即時探查不會在容器內啟動真實的 Telegram/Discord/等頻道工作程式。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或排除該 Docker 軌道中的 gateway 即時涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是較高層級的相容性冒煙測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理程式傳送真實的聊天請求。第一次執行可能會明顯較慢，因為 Docker 可能需要提取 Open WebUI 映像檔，而 Open WebUI 可能需要完成其自身的冷啟動設定。此軌道需要可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。成功的執行會列印一個小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 是刻意具確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個帶有種子的 Gateway 容器，啟動第二個生成 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由的對話探索、逐字稿讀取、附件元資料、即時事件佇列行為、外傳傳送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此冒煙測試會驗證橋接器實際發出的內容，而不僅僅是特定用戶端 SDK 恰好顯示的內容。

手動 ACP 自然語言 thread 冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於迴歸/除錯工作流程。未來可能再次需要用它來進行 ACP thread 路由驗證，因此請勿刪除。

實用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設值：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設值：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設值：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用暫時的設定/工作區目錄且不掛載外部 CLI 認證
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設值：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 以用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，並在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮減的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮減執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內篩選供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重複使用現有的 `openclaw:local-live` 映像檔進行無需重新建構的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保認證資訊來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道針對 Open WebUI 冒煙測試暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用於覆寫 Open WebUI smock 使用的 nonce 檢查提示
- `OPENWEBUI_IMAGE=...` 用於覆寫固定的 Open WebUI 映像檔標籤

## :Docs sanity

:在文件編輯後執行文件檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## :Offline regression (CI-safe)

:這些是沒有真實提供者的「真實管線」回歸測試：

- :Gateway 工具呼叫（模擬 OpenAI、真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts` (case: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- :Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 執行認證）：`src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## :Agent reliability evals (skills)

:我們已經有一些 CI-safe 的測試，其行為類似於「agent reliability evals」：

- :透過真實 gateway + agent 迴圈進行模擬工具呼叫 (`src/gateway/gateway.test.ts`)。
- :端到端的精靈流程，用於驗證 session 接線和設定效果 (`src/gateway/gateway.test.ts`)。

:Skills 仍然缺失的內容（參見 [Skills](/en/tools/skills))：

- :**決策：**當 skills 在提示中列出時，agent 是否會選擇正確的 skill（或避免不相關的）？
- :**合規性：**agent 是否在使用前閱讀 `SKILL.md` 並遵循必要的步驟/參數？
- :**工作流程合約：**斷言工具順序、session 歷史傳遞和沙箱邊界的多輪場景。

:未來的 evals 應首先保持確定性：

- :使用模擬提供者的場景運行器，以斷言工具呼叫 + 順序、skill 檔案讀取和 session 接線。
- :一小套以 skills 為中心的場景（使用與避免、閘道、提示注入）。
- :只有在 CI-safe 套件就位後，才進行可選的即時 evals（選擇加入、env-gated）。

## :Contract tests (plugin and channel shape)

合約測試驗證每個已註冊的插件和頻道都符合其介面合約。它們會遍歷所有發現的插件並執行一系列形狀和行為斷言。預設的 `pnpm test` unit lane 會刻意跳過這些共享 seam 和 smoke 檔案；當您觸及共享頻道或 provider 介面時，請明確執行合約指令。

### 指令

- 所有合約： `pnpm test:contracts`
- 僅限頻道合約： `pnpm test:contracts:channels`
- 僅限 Provider 合約： `pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本 plugin 形狀 (id, name, capabilities)
- **setup** - 設定精靈合約
- **session-binding** - Session binding 行為
- **outbound-payload** - 訊息 payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道 action 處理器
- **threading** - Thread ID 處理
- **directory** - 目錄/名單 API
- **group-policy** - 群組原則強制執行

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

- 在更動 plugin-sdk 匯出或子路徑之後
- 在新增或修改頻道或 provider plugin 之後
- 在重構 plugin 註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試 (指導原則)

當您修正在 live 中發現的 provider/model 問題時：

- 如果可能，請加入 CI 安全的回歸測試 (mock/stub provider，或擷取確切的 request-shape 轉換)
- 如果本質上僅限 live (速率限制、auth 原則)，請將 live 測試縮小範圍並透過環境變數加入選擇性執行
- 優先以能捕捉錯誤的最小層級為目標：
  - provider request 轉換/重放錯誤 → 直接 models 測試
  - gateway session/history/tool 管線錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍歷防護：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元數據（`listSecretTargetRegistryEntries()`）為每個 SecretRef 類別派生一個採樣目標，然後斷言遍歷片段執行 ID 會被拒絕。
  - 如果你在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，以防止新類別被無聲跳過。
