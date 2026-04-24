---
summary: "測試套件：單元/e2e/live 測試套件、Docker 執行器，以及每個測試的覆蓋範圍"
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

- 完整閘道（推送前預期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在寬敞的機器上更快速地執行本地完整套件：`pnpm test:max`
- 直接 Vitest 監視迴圈：`pnpm test:watch`
- 直接的檔案目標現在也會路由擴充功能/通道路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您正在處理單一失敗時，優先使用指定範圍的執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您接觸測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當除錯真實的提供商/模型時（需要真實憑證）：

- Live 套件（模型 + 閘道工具/圖像探測）：`pnpm test:live`
- 靜默目標單一 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Moonshot/Kimi 成本偵測：設定 `MOONSHOT_API_KEY` 後，執行
  `openclaw models list --provider moonshot --json`，然後對 `moonshot/kimi-k2.6` 執行獨立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。驗證 JSON 回報 Moonshot/K2.6，且助理文字記錄儲存標準化的 `usage.cost`。

提示：當您只需要一個失敗案例時，建議優先使用下面描述的 allowlist 環境變數來縮小即時測試範圍。

## QA 專用執行器

當您需要 QA 實驗室級別的真實性時，這些指令會位於主要測試套件旁邊：

CI 在專用工作流程中執行 QA Lab。`Parity gate` 在符合的 PR 上執行，並透過模擬提供者進行手動觸發。`QA-Lab - All Lanes` 每晚在 `main` 上執行，並透過模擬同等閘道、live Matrix 通道和 Convex 管理的 live Telegram 通道作為並行工作進行手動觸發。`OpenClaw Release Checks`
在發布核准前執行相同的通道。

- `pnpm openclaw qa suite`
  - 直接在主機上執行儲存庫支援的 QA 情境。
  - 預設會使用獨立的閘道工作程序並行執行多個選取的情境。`qa-channel` 預設並行數為 4（受選取情境數量限制）。使用 `--concurrency <count>` 調整工作程序數量，或使用 `--concurrency 1` 執行較舊的序列通道。
  - 當任何情境失敗時，會以非零狀態碼結束。當您想要產生成品而不希望因失敗而結束時，請使用 `--allow-failures`。
  - 支援供應商模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 啟動一個本機 AIMock 支援的供應商伺服器，用於實驗性
    fixture 和協定模擬覆蓋率，而不取代具備場景感知能力的
    `mock-openai` 通道。
- `pnpm openclaw qa suite --runner multipass`
  - 在可拋棄的 Multipass Linux VM 內執行相同的 QA 測試組。
  - 保持與主機上的 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的供應商/模型選擇旗標。
  - 即時執行會轉發適合客端的受支援 QA 認證輸入：
    基於環境變數的供應商金鑰、QA 即時供應商設定路徑，以及 `CODEX_HOME`
    （當存在時）。
  - 輸出目錄必須保留在 repo root 下，以便客端可以透過
    掛載的工作區寫回資料。
  - 在 `.artifacts/qa-e2e/...` 下寫入正常的 QA 報告 + 摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動 Docker 支援的 QA 站台，用於操作員類型的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從目前的簽出版本建構 npm tarball，將其在 Docker 中全域安裝，
    執行非互動式 OpenAI API 金鑰入門，預設設定 Telegram，
    驗證啟用外掛程式會視需求安裝執行時期相依性，執行 doctor，
    並對模擬的 OpenAI 端點執行一次本機 agent 輪次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 以透過 Discord 執行相同的封裝安裝
    通道。
- `pnpm test:docker:bundled-channel-deps`
  - 在 Docker 中打包並安裝目前的 OpenClaw 建置版本，使用 OpenAI 設定啟動 Gateway，
    然後透過設定編輯啟用隨附的通道/外掛程式。
  - 驗證設定探索會讓未設定的外掛程式執行時期相依性保持不存在，
    第一次設定的 Gateway 或 doctor 執行會視需求安裝每個隨附外掛程式的
    執行時期相依性，且第二次重新啟動不會重新安裝已啟用的相依性。
  - 此外，會安裝一個已知的較舊 npm 基準版本，在執行
    `openclaw update --tag <candidate>` 之前啟用 Telegram，並驗證候選版本的
    更新後 doctor 會修復隨附通道執行時期相依性，而無需
    測試框架端的 postinstall 修復。
- `pnpm openclaw qa aimock`
  - 僅啟動本地的 AIMock 提供者伺服器，用於直接協議冒煙測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA 通道。
  - 此 QA 主機目前僅限 repo/dev 使用。打包的 OpenClaw 安裝版本不附帶 `qa-lab`，因此不會公開 `openclaw qa`。
  - Repo 檢出會直接載入內建的 runner，無需額外的外掛程式安裝步驟。
  - 預備三個暫時的 Matrix 使用者 (`driver`, `sut`, `observer`) 以及一個私人房間，然後以真實的 Matrix 外掛程式作為 SUT 傳輸，啟動 QA gateway 子進程。
  - 預設使用固定的穩定 Tuwunel 映像檔 `ghcr.io/matrix-construct/tuwunel:v1.5.1`。當您需要測試不同的映像檔時，可以使用 `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` 覆蓋。
  - Matrix 不會公開共享的憑證來源標誌，因為該通道會在本地預備一次性使用者。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Matrix QA 報告、摘要、觀察到的事件構件 以及組合的 stdout/stderr 輸出日誌。
- `pnpm openclaw qa telegram`
  - 針對真實的私人群組，使用來自環境變數的 driver 和 SUT bot tokens 執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是數值的 Telegram 聊天 ID。
  - 支援 `--credential-source convex` 以使用共享的集區憑證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 當任何情境失敗時，以非零值結束。當您希望在不因失敗而結束程序的情況下取得構件時，請使用 `--allow-failures`。
  - 需要在同一個私人群組中有兩個不同的機器人，且 SUT 機器人必須公開 Telegram 使用者名稱。
  - 為了穩定的機器人對機器人觀察，請在 `@BotFather` 中為這兩個機器人啟用機器人對機器人通訊模式，並確保 driver 機器人可以觀察群組機器人流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察到的訊息構件。

即時傳輸通道共用一個標準合約，以便新的傳輸不會偏離：

`qa-channel` 仍是廣泛的綜合 QA 測試套件，並非即時傳輸覆蓋率矩陣的一部分。

| 跑道     | 金絲雀 | 提及閘控 | 白名單區塊 | 頂層回覆 | 重新啟動恢復 | 串追蹤 | 串隔離 | 反應觀察 | 幫助指令 |
| -------- | ------ | -------- | ---------- | -------- | ------------ | ------ | ------ | -------- | -------- |
| 矩陣     | x      | x        | x          | x        | x            | x      | x      | x        |          |
| Telegram | x      |          |            |          |              |        |        |          | x        |

### 透過 Convex 共用 Telegram 憑證 (v1)

當為 `openclaw qa telegram` 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從 Convex 支援的池中取得獨佔租約，在跑道運行期間對該租約發送心跳，並在關閉時釋放租約。

參考 Convex 專案腳手架：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 選定角色的一個金鑰：
  - 用於 `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - 用於 `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 憑證角色選擇：
  - CLI： `--credential-role maintainer|ci`
  - Env 預設值： `OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

選用的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的追蹤 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅用於本機開發的回送 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應使用 `https://`。

維護者管理指令 (pool add/remove/list) 專門需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

供維護者使用的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在腳本和 CI 公用程式中使用 `--json` 以取得機器可讀的輸出。

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
  - 有效租約保護：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（僅限維護者密鑰）
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 形狀：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是一個數字的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此形狀，並拒絕格式錯誤的 payloads。

### 將頻道加入 QA

將頻道加入 markdown QA 系統只需要兩件事：

1. 該頻道的傳輸配接器。
2. 一個用於測試頻道合約的情境套件。

當共用的 `qa-lab` 主機能擁有該流程時，
請勿新增新的頂層 QA 指令根目錄。

`qa-lab` 擁有共用的主機機制：

- `openclaw qa` 指令根目錄
- 測試套件的啟動與拆卸
- Worker 並行處理
- 寫入構件
- 報告生成
- 情境執行
- 舊版 `qa-channel` 情境的相容性別名

Runner 外掛程式擁有傳輸合約：

- `openclaw qa <runner>` 如何掛載在共用的 `qa` 根目錄下
- 針對該傳輸如何設定閘道
- 如何檢查就緒狀態
- 如何注入傳入事件
- 如何觀察傳出訊息
- 如何公開對話紀錄和標準化傳輸狀態
- 如何執行傳輸支援的操作
- 如何處理特定傳輸的重置或清理

採用新頻道的最低門檻如下：

1. 保持 `qa-lab` 作為共享 `qa` 根目錄的擁有者。
2. 在共享 `qa-lab` 主機接縫上實作傳輸執行器。
3. 將特定傳輸的機制保留在執行器外掛或頻道套件中。
4. 將執行器掛載為 `openclaw qa <runner>`，而不是註冊競爭的根指令。
   執行器外掛應該在 `openclaw.plugin.json` 中宣告 `qaRunners`，並從 `runtime-api.ts` 匯出相符的 `qaRunnerCliRegistrations` 陣列。
   保持 `runtime-api.ts` 輕量；延遲載入的 CLI 和執行器執行應保留在獨立的進入點後方。
5. 在主題式 `qa/scenarios/` 目錄下撰寫或調整 markdown 情境。
6. 對新情境使用通用情境輔助函式。
7. 除非儲存庫正在進行有意識的遷移，否則請保持現有的相容性別名正常運作。

決策規則如下：

- 如果行為可以在 `qa-lab` 中表達一次，請將其放在 `qa-lab` 中。
- 如果行為取決於單一頻道傳輸，請將其保留在該執行器外掛或外掛套件中。
- 如果情境需要多個頻道都能使用的新功能，請新增通用輔助函式，而不是在 `suite.ts` 中新增特定頻道的分支。
- 如果某個行為僅對一種傳輸有意義，請保持情境的傳輸特定性，並在情境合約中明確說明。

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

兼容性別名仍可用於現有場景，包括：

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

新頻道的工作應使用通用輔助函數名稱。
兼容性別名的存在是為了避免一次性遷移，而不是作為
新場景編寫的範例。

## 測試套件（什麼在哪裡運行）

您可以將這些套件視為「真實度遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 配置：在現有範圍內的 Vitest 專案上進行十次連續分片執行（`vitest.full-*.config.ts`）
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts`、`test/**/*.test.ts` 下的核心/單元庫清單，以及由 `vitest.unit.config.ts` 涵蓋的已列入白名單的 `ui` 節點測試
- 範圍：
  - 純單元測試
  - 程序內整合測試（閘道驗證、路由、工具、解析、配置）
  - 已知錯誤的確定性迴歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
- 專案說明：
  - 無目標的 `pnpm test` 現在執行十一個較小的分片配置（`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這減少了負載機器上的峰值 RSS，並避免自動回覆/擴充功能工作導致不相關的套件飢餓。
  - `pnpm test --watch` 仍然使用原生根 `vitest.config.ts` 專案圖，因為多分片監視迴圈不切實際。
  - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會首先將顯式檔案/目錄目標透過範圍通道進行路由，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
  - `pnpm test:changed` 會將變更的 git 路徑擴展到相同的範圍通道，當差異僅涉及可路由的原始碼/測試檔案時；配置/設定的編輯仍然會回退到廣泛的根專案重新執行。
  - `pnpm check:changed` 是用於細微工作的正常智慧本地閘道。它會將差異分類為核心、核心測試、擴充功能、擴充功能測試、應用程式、文件、發行元資料和工具，然後執行匹配的型別檢查/程式碼檢查/測試通道。由於擴充功能依賴這些核心合約，公開的外掛 SDK 和外掛合約變更包括擴充功能驗證。僅涉及發行元資料的版本升級會執行目標版本/配置/根依賴檢查，而不是完整的測試套件，並且有一個防護機制會拒絕頂層版本欄位之外的套件變更。
  - 來自代理程式、指令、外掛、自動回覆協助程式、`plugin-sdk` 和類似純工具區域的輕量級單元測試會透過 `unit-fast` 通道路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時繁重的檔案會保留在現有通道上。
  - 選定的 `plugin-sdk` 和 `commands` 協助程式原始碼檔案也會將變更模式執行對應到那些輕量通道中的明確同層級測試，因此協助程式的編輯可以避免為該目錄重新執行完整的繁重測試套件。
  - `auto-reply` 現在有三個專用的儲存桶：頂層核心協助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。這將最繁重的回覆線束工作與廉價的狀態/區塊/權杖測試分開。
- 嵌入式執行器說明：
  - 當您變更訊息工具探索輸入或壓縮執行時上下文時，
    請保持兩個層級的覆蓋率。
  - 為純路由/正規化邊界新增專注的協助程式回歸測試。
  - 此外，請保持嵌入式執行器整合套件的健全性：
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
  - 這些套件會驗證範圍 ID 和壓縮行為仍然流經
    真實的 `run.ts` / `compact.ts` 路徑；僅協助程式測試並不是
    這些整合路徑的充分替代方案。
- 集區說明：
  - Base Vitest 配置現在預設為 `threads`。
  - 共用的 Vitest 配置也修復了 `isolate: false`，並在根專案、e2e 和 live 配置中跨專案使用非隔離執行器。
  - 根 UI 通道保留其 `jsdom` 設定和優化器，但現在也運行在共用的非隔離執行器上。
  - 每個 `pnpm test` 分片都從共用的 Vitest 配置繼承相同的 `threads` + `isolate: false` 預設值。
  - 共用的 `scripts/run-vitest.mjs` 啟動器現在也會預設為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯開銷。如果您需要與原版 V8 行為進行比較，請設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1`。
- 快速本地迭代說明：
  - `pnpm changed:lanes` 會顯示差異觸發了哪些架構通道。
  - Pre-commit hook 會在暫存的格式化/linting 之後執行 `pnpm check:changed --staged`，因此除非核心提交涉及公開的 extension-facing contracts，否則不會支付擴充測試成本。僅包含 Release metadata 的提交會保持在目標版本/config/root-dependency 通道上。
  - 如果特定的暫存變更集已經透過同等或更強的門控進行了驗證，請使用 `scripts/committer --fast "<message>" <files...>` 來僅跳過變更範圍的 hook 重新執行。暫存的 format/lint 仍會執行。請在交接中提及已完成的門控。如果隔離的偶發 hook 失敗重新執行後通過並具備範圍證明，這也是可接受的。
  - 當變更路徑乾淨地對應到較小的套件時，`pnpm test:changed` 會透過範圍通道進行路由。
  - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 worker 上限。
  - 本地 worker 自動擴展現在是有意保持保守的，並且當主機負載平均值已經很高時也會退讓，因此多個並發的 Vitest 執行預設造成的損害較小。
  - Base Vitest 配置將專案/配置檔案標記為 `forceRerunTriggers`，以便當測試連線變更時，變更模式重新執行保持正確。
  - 此配置在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您需要一個明確的快取位置以進行直接效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。
- 效能調試備註：
  - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及匯入分解輸出。
  - `pnpm test:perf:imports:changed` 將相同的分析視圖限定在自 `origin/main` 以來變更的檔案。
- `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由後的 `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印牆上時間以及 macOS 最大 RSS。
- `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs` 和根 Vitest 配置路由變更檔案列表，對當前的髒程式碼樹進行基準測試。
  - `pnpm test:perf:profile:main` 寫入 Vitest/Vite 啟動和轉換開銷的主執行緒 CPU 分析檔案。
  - `pnpm test:perf:profile:runner` 在停用檔案並行處理的情況下，寫入單元測試套件的執行器 CPU 和堆積分析檔案。

### 穩定性 (閘道)

- 指令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 啟動一個預設啟用診斷功能的真實迴路閘道
  - 透過診斷事件路徑驅動合成閘道訊息、記憶體和大額載入的變動
  - 透過閘道 WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持久化輔助工具
  - 斷言錄製器保持有限，合成 RSS 樣本保持在壓力預算內，且每個會話的佇列深度會排空至零
- 預期：
  - CI 安全且無需金鑰
  - 這是追蹤穩定性回歸的窄道，而非完整閘道測試套件的替代品

### E2E (閘道冒煙測試)

- 指令：`pnpm test:e2e`
- 配置：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的打包外掛程式 E2E 測試
- 執行時期預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與儲存庫的其他部分保持一致。
  - 使用自適應 worker（CI：最多 2 個，本機：預設 1 個）。
  - 預設以靜默模式執行，以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 以強制執行工作程序計數（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 以重新啟用詳細的主控台輸出。
- 範圍：
  - 多實例閘道端到端行為
  - WebSocket/HTTP 介面、節點配對以及較重的網路傳輸
- 預期：
  - 在 CI 中執行（當在 pipeline 中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作部件（可能較慢）

### E2E：OpenShell 後端冒煙測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell 閘道
  - 從暫存的本地 Dockerfile 建立沙盒
  - 透過真實的 `sandbox ssh-config` + SSH 執行來測試 OpenClaw 的 OpenShell 後端
  - 透過沙盒 fs 橋接器驗證遠端標準檔案系統行為
- 預期：
  - 僅供選擇性加入；不是預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試閘道和沙盒
- 有用的覆寫：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用此測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live（真實供應商 + 真實模型）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設值：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型在今天是否真的能使用真實憑證運作？」
  - 發現供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 依設計而言在 CI 中不穩定（真實網路、真實供應商政策、配額、中斷）
  - 需要花費金錢 / 使用速率限制
  - 偏好執行縮減的子集，而不是「所有東西」
- Live 執行會 source `~/.profile` 以取得缺失的 API 金鑰。
- 預設情況下，live 執行仍會隔離 `HOME`，並將設定/認證資料複製到暫存的測試家目錄中，以免單元裝置變更您的真實 `~/.openclaw`。
- 僅當您故意需要 live 測試使用您的真實家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知，並使閘道啟動程式日誌/Bonjour 雜訊靜音。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替（特定於提供者）：設定 `*_API_KEYS`，使用逗號/分號格式或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行每次 live 的覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會向 stderr 發出進度行，因此即使 Vitest 主控台擷取處於安靜狀態，長時間的提供者呼叫也能顯示為作用中。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，以便提供者/閘道進度行在 live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測的心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更了很多內容，還要執行 `pnpm test:coverage`）
- 涉及閘道網路/WS 通訊協定/配對：新增 `pnpm test:e2e`
- 除錯「我的機器人掛了」/特定提供者的失敗/工具呼叫：執行縮減範圍的 `pnpm test:live`

## Live：Android 節點功能掃描

- 測試：`src/gateway/android-node.capabilities.live.test.ts`
- 腳本：`pnpm android:test:integration`
- 目標：叫用連線的 Android 節點**目前宣佈的每個指令**，並斷言指令合約行為。
- 範圍：
  - 預先設定/手動設定（測試套件不會安裝/執行/配對應用程式）。
  - 針對選取的 Android 節點，逐指令驗證 gateway `node.invoke`。
- 必要的預先設定：
  - Android 應用程式已連接並與 gateway 配對。
  - 應用程式保持在前台。
  - 已授予您預期會通過的功能所需的權限/捕獲同意。
- 可選的目標覆寫：
  - `OPENCLAW_ANDROID_NODE_ID` 或 `OPENCLAW_ANDROID_NODE_NAME`。
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`。
- 完整的 Android 設定詳細資訊：[Android App](/zh-Hant/platforms/android)

## Live：model smoke（設定檔金鑰）

Live 測試分為兩層，以便我們隔離失敗原因：

- 「Direct model」告訴我們提供者/模型是否可以使用給定的金鑰進行回應。
- 「Gateway smoke」告訴我們完整的 gateway+agent 管線是否適用於該模型（sessions、history、tools、sandbox policy 等）。

### 第 1 層：直接模型完成（無 gateway）

- 測試：`src/agents/models.profiles.live.test.ts`
- 目標：
  - 列舉探索到的模型
  - 使用 `getApiKeyForModel` 來選取您有憑證的模型
  - 針對每個模型執行少量完成操作（並在需要時執行目標迴歸測試）
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則使用 `OPENCLAW_LIVE_TEST=1`）
- 設定 `OPENCLAW_LIVE_MODELS=modern`（或 `all`，modern 的別名）以實際執行此套件；否則它會跳過，以保持 `pnpm test:live` 專注於 gateway smoke
- 如何選取模型：
  - `OPENCLAW_LIVE_MODELS=modern` 以執行 modern 允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_MODELS=all` 是 modern 允許清單的別名
  - 或 `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."`（逗號分隔的允許清單）
  - Modern/all 掃描預設為精心挑選的高訊號上限；設定 `OPENCLAW_LIVE_MAX_MODELS=0` 以進行完整的 modern 掃描，或設定一個正數以使用較小的上限。
- 如何選取提供者：
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"`（逗號分隔的允許清單）
- 金鑰來源：
  - 預設：profile store 和 env 後備機制
  - 設定 `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制僅使用 **profile store**
- 存在原因：
  - 將「提供者 API 故障 / 金鑰無效」與「gateway agent 管線故障」區分開來
  - 包含小型、獨立的回歸測試（例如：OpenAI Responses/Codex Responses 推理重播 + 工具調用流程）

### 第 2 層：Gateway + 開發代理程式冒煙測試（即 "@openclaw" 實際執行的操作）

- 測試：`src/gateway/gateway-models.profiles.live.test.ts`
- 目標：
  - 啟動程序內網關
  - 建立/修補 `agent:dev:*` 工作階段（每次執行皆可覆寫模型）
  - 迭代具有金鑰的模型並斷言：
    - 「有意義」的回應（無工具）
    - 真實的工具調用正常運作（讀取探測）
    - 可選的額外工具探測（exec+read 探測）
    - OpenAI 回歸路徑（僅工具調用 → 後續追蹤）持續正常運作
- 探測詳情（以便您快速解釋失敗原因）：
  - `read` 探測：測試在工作區寫入一個 nonce 檔案，並要求代理程式 `read` 讀取它並回傳 nonce。
  - `exec+read` 探測：測試要求代理程式 `exec`-寫入一個 nonce 到臨時檔案，然後 `read` 讀取回傳。
  - 圖片探測：測試附加一個生成的 PNG（cat + 隨機代碼）並期望模型回傳 `cat <CODE>`。
  - 實作參考：`src/gateway/gateway-models.profiles.live.test.ts` 和 `src/gateway/live-image-probe.ts`。
- 如何啟用：
  - `pnpm test:live`（若直接呼叫 Vitest 則為 `OPENCLAW_LIVE_TEST=1`）
- 如何選擇模型：
  - 預設：現代允許清單（Opus/Sonnet 4.6+、GPT-5.x + Codex、Gemini 3、GLM 4.7、MiniMax M2.7、Grok 4）
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` 是現代允許清單的別名
  - 或設定 `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"`（或逗號分隔清單）以縮小範圍
  - 現代/所有網關掃描預設使用策劃的高訊號上限；設定 `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` 以進行完整的現代掃描，或設定正數以使用較小的上限。
- 如何選擇提供者（避免「全部使用 OpenRouter」）：
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"`（逗號分隔允許清單）
- 在此即時測試中，工具 + 圖片探測始終開啟：
  - `read` 探測 + `exec+read` 探測（工具壓力測試）
  - 當模型聲稱支援圖片輸入時，會執行圖片探測
  - 流程（高層級）：
    - 測試生成一個包含「CAT」+ 隨機代碼的微小 PNG（`src/gateway/live-image-probe.ts`）
    - 透過 `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]` 發送
    - Gateway 將附件解析為 `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - 嵌入式代理將多模態使用者訊息轉發給模型
    - 斷言：回覆包含 `cat` + 程式碼（OCR 容差：允許小錯誤）

提示：若要查看您可以在機器上測試的內容（以及確切的 `provider/model` ID），請執行：

```bash
openclaw models list
openclaw models list --json
```

## Live：CLI 後端冒煙測試（Claude、Codex、Gemini 或其他本機 CLI）

- 測試：`src/gateway/gateway-cli-backend.live.test.ts`
- 目標：使用本機 CLI 後端驗證 Gateway + 代理管道，而不接觸您的預設配置。
- 特定後端的冒煙測試預設值隨附於擁有擴充功能的 `cli-backend.ts` 定義中。
- 啟用：
  - `pnpm test:live`（如果直接調用 Vitest，則為 `OPENCLAW_LIVE_TEST=1`）
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- 預設值：
  - 預設提供者/模型：`claude-cli/claude-sonnet-4-6`
  - 命令/參數/影像行為來自擁有 CLI 後端的外掛程式中繼資料。
- 覆寫（可選）：
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` 以發送真實的影像附件（路徑會被注入到提示中）。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` 以將影像檔案路徑作為 CLI 參數傳遞，而不是提示注入。
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"`（或 `"list"`）以控制在設定 `IMAGE_ARG` 時如何傳遞影像參數。
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` 以發送第二輪並驗證恢復流程。
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` 以停用預設的 Claude Sonnet -> Opus 同階段連續性探測（當選定的模型支援切換目標時，設為 `1` 以強制啟用它）。

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

單一提供者 Docker 配方：

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

備註：

- Docker 運行器位於 `scripts/test-live-cli-backend-docker.sh`。
- 它在儲存庫 Docker 映像檔中以非 root 使用者 `node` 身分執行即時 CLI 後端冒煙測試。
- 它從擁有的擴展中解析 CLI smoke 元數據，然後將匹配的 Linux CLI 套件（`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`）安裝到位於 `OPENCLAW_DOCKER_CLI_TOOLS_DIR` 的快取可寫入前綴（預設：`~/.cache/openclaw/docker-cli-tools`）中。
- `pnpm test:docker:live-cli-backend:claude-subscription` 需要透過帶有 `claudeAiOauth.subscriptionType` 的 `~/.claude/.credentials.json` 或來自 `claude setup-token` 的 `CLAUDE_CODE_OAUTH_TOKEN` 進行可攜式 Claude Code 訂閱 OAuth 驗證。它首先證明 Docker 中的直接 `claude -p`，然後在不保留 Anthropic API 金鑰環境變數的情況下執行兩次 Gateway CLI 後端輪次。此訂閱通道預設停用 Claude MCP/工具和影像探測，因為 Claude 目前將第三方應用程式使用量路由至額外使用量計費，而非正常的訂閱方案限制。
- 即時 CLI 後端 smoke 現在會對 Claude、Codex 和 Gemini 執行相同的端對端流程：文字輪次、影像分類輪次，然後透過 gateway CLI 驗證 MCP `cron` 工具呼叫。
- Claude 的預設 smoke 也會將工作階段從 Sonnet 修補為 Opus，並驗證恢復的工作階段仍記得先前的註記。

## Live: ACP bind smoke (`/acp spawn ... --bind here`)

- Test: `src/gateway/gateway-acp-bind.live.test.ts`
- 目標：使用即時 ACP agent 驗證真實的 ACP conversation-bind 流程：
  - 發送 `/acp spawn <agent> --bind here`
  - 就地綁定合成訊息通道對話
  - 在同一對話中發送正常的後續訊息
  - 驗證後續訊息已抵達綁定的 ACP 工作階段文字記錄
- 啟用：
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- 預設值：
  - Docker 中的 ACP agents：`claude,codex,gemini`
  - 用於直接 `pnpm test:live ...` 的 ACP agent：`claude`
  - 合成通道：Slack DM 風格的對話上下文
  - ACP 後端：`acpx`
- 覆寫：
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.4`
- 備註：
  - 此路徑使用具有管理員專用合成來源路由欄位的 gateway `chat.send` 介面，以便測試可以在無需假裝外部傳遞的情況下附加訊息通道上下文。
  - 當未設定 `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` 時，測試會使用內嵌 `acpx` 外掛程式的內建代理程式註冊表用於所選的 ACP 駕駛程式代理程式。

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
- 依預設，它會依序對所有支援的即時 CLI 代理程式執行 ACP 綁定冒煙測試：`claude`、`codex`，然後是 `gemini`。
- 使用 `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`、`OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` 或 `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` 來縮小矩陣範圍。
- 它來源自 `~/.profile`，將匹配的 CLI 認證資料暫存到容器中，將 `acpx` 安裝到可寫入的 npm 前綴，然後如果缺少請求的即時 CLI (`@anthropic-ai/claude-code`、`@openai/codex` 或 `@google/gemini-cli`) 則進行安裝。
- 在 Docker 內部，執行器會設定 `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx`，以便 acpx 保留來源設定檔中的提供者環境變數供子駕駛程式 CLI 使用。

## 即時：Codex 應用程式伺服器駕駛程式冒煙測試

- 目標：透過正常的 gateway `agent` 方法驗證外掛程式擁有的 Codex 駕駛程式：
  - 載入捆綁的 `codex` 外掛程式
  - 選擇 `OPENCLAW_AGENT_RUNTIME=codex`
  - 將第一個 gateway 代理程式回合發送到 `codex/gpt-5.4`
  - 將第二個回合發送到同一個 OpenClaw 會話並驗證應用程式伺服器執行緒是否可以恢復
  - 透過相同的 gateway 指令路徑執行 `/codex status` 和 `/codex models`
  - （可選）執行兩個 Guardian 審查的提升 shell 探測：一個應該被核准的良性指令和一個應該被拒絕的假機密上傳，以便代理程式回頭詢問
- 測試：`src/gateway/gateway-codex-harness.live.test.ts`
- 啟用：`OPENCLAW_LIVE_CODEX_HARNESS=1`
- 預設模型：`codex/gpt-5.4`
- 可選映像探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- 選用的 MCP/tool probe: `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- 選用的 Guardian probe: `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- smoke 設定 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，因此損壞的 Codex
  harness 無法透過靜默回退到 PI 來通過測試。
- Auth: `OPENAI_API_KEY` 來自 shell/profile，加上可選的複製
  `~/.codex/auth.json` 和 `~/.codex/config.toml`

Local recipe:

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Docker recipe:

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Docker notes:

- Docker runner 位於 `scripts/test-live-codex-harness-docker.sh`。
- 它會載入掛載的 `~/.profile`，傳遞 `OPENAI_API_KEY`，在存在時複製 Codex CLI
  auth 檔案，將 `@openai/codex` 安裝到可寫入的掛載 npm
  prefix，暫存原始碼樹，然後僅執行 Codex-harness live 測試。
- Docker 預設啟用 image、MCP/tool 和 Guardian probes。當您需要更狹窄的
  除錯執行時，請設定
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` 或
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0`。
- Docker 也會匯出 `OPENCLAW_AGENT_HARNESS_FALLBACK=none`，以符合 live
  測試配置，使 `openai-codex/*` 或 PI 回退無法隱藏 Codex harness
  的回歸。

### 建議的 live recipes

狹窄、明確的允許列表是最快且最不不穩定的：

- 單一模型，直接 (無 gateway):
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- 單一模型，gateway smoke:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- 跨多個供應商的 tool 呼叫:
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google 專注 (Gemini API 金鑰 + Antigravity):
  - Gemini (API 金鑰): `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth): `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes:

- `google/...` 使用 Gemini API (API 金鑰)。
- `google-antigravity/...` 使用 Antigravity OAuth 橋接器 (Cloud Code Assist-style agent endpoint)。
- `google-gemini-cli/...` 使用您機器上的本機 Gemini CLI (單獨的 auth + tooling quirks)。
- Gemini API vs Gemini CLI:
  - API: OpenClaw 透過 HTTP 呼叫 Google 託管的 Gemini API (API 金鑰 / profile auth)；這是大多數使用者所指的「Gemini」。
  - CLI: OpenClaw 呼叫本機 `gemini` 二進位檔；它有自己的 auth，且行為可能有所不同 (串流/tool 支援/版本差異)。

## Live：模型矩陣（涵蓋範圍）

沒有固定的「CI 模型清單」（Live 採用選用制），但這些是**建議**在開發機上使用金鑰定期涵蓋的模型。

### Modern smoke set（工具呼叫 + 影像）

這是我們期望持續運作的「通用模型」執行：

- OpenAI (non-Codex): `openai/gpt-5.4` (選用: `openai/gpt-5.4-mini`)
- OpenAI Codex: `openai-codex/gpt-5.4`
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google (Gemini API): `google/gemini-3.1-pro-preview` 和 `google/gemini-3-flash-preview` (避免使用舊版 Gemini 2.x 模型)
- Google (Antigravity): `google-antigravity/claude-opus-4-6-thinking` 和 `google-antigravity/gemini-3-flash`
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

執行包含工具與影像的 gateway smoke：
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### 基準：工具呼叫（Read + 選用 Exec）

每個供應商系列至少選擇一個：

- OpenAI: `openai/gpt-5.4` (或 `openai/gpt-5.4-mini`)
- Anthropic: `anthropic/claude-opus-4-6` (或 `anthropic/claude-sonnet-4-6`)
- Google: `google/gemini-3-flash-preview` (或 `google/gemini-3.1-pro-preview`)
- Z.AI (GLM): `zai/glm-4.7`
- MiniMax: `minimax/MiniMax-M2.7`

選用的額外涵蓋範圍（加分選項）：

- xAI: `xai/grok-4` (或最新可用版本)
- Mistral: `mistral/`… (選擇一個您已啟用的「工具」支援模型)
- Cerebras: `cerebras/`… (如果您有存取權)
- LM Studio: `lmstudio/`… (本機；工具呼叫取決於 API 模式)

### Vision：影像傳送（附件 → 多模態訊息）

在 `OPENCLAW_LIVE_GATEWAY_MODELS` 中至少包含一個支援影像的模型（Claude/Gemini/OpenAI 支援視覺的變體等），以測試影像探測功能。

### 聚合器 / 替代 gateway

如果您已啟用金鑰，我們也支援透過以下方式進行測試：

- OpenRouter: `openrouter/...` (數百種模型；使用 `openclaw models scan` 尋找支援工具與影像的候選模型)
- OpenCode: `opencode/...` for Zen 和 `opencode-go/...` for Go（透過 `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY` 進行驗證）

更多您可以包含在即時矩陣中的提供者（如果您有憑證/配置）：

- 內建：`openai`、`openai-codex`、`anthropic`、`google`、`google-vertex`、`google-antigravity`、`google-gemini-cli`、`zai`、`openrouter`、`opencode`、`opencode-go`、`xai`、`groq`、`cerebras`、`mistral`、`github-copilot`
- 透過 `models.providers`（自訂端點）：`minimax`（雲端/API），加上任何相容 OpenAI/Anthropic 的代理（LM Studio、vLLM、LiteLLM 等）

提示：不要嘗試在文件中硬編碼「所有模型」。權威清單是 `discoverModels(...)` 在您的機器上傳回的任何內容 + 可用的任何金鑰。

## 憑證（切勿提交）

即時測試探索憑證的方式與 CLI 相同。實際影響：

- 如果 CLI 運作正常，即時測試應該會找到相同的金鑰。
- 如果即時測試顯示「no creds」（無憑證），請像偵錯 `openclaw models list` / 模型選擇一樣進行偵錯。

- 每個代理程式的驗證設定檔：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（這就是即時測試中「profile keys」的含義）
- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 舊版狀態目錄：`~/.openclaw/credentials/`（如果存在，會複製到暫存的即時主目錄中，但不是主要的設定檔金鑰儲存區）
- 即時本機執行預設會將使用中的配置、每個代理程式的 `auth-profiles.json` 檔案、舊版 `credentials/` 以及支援的外部 CLI 驗證目錄複製到臨時測試主目錄；暫存的即時主目錄會跳過 `workspace/` 和 `sandboxes/`，並且會移除 `agents.*.workspace` / `agentDir` 路徑覆寫，以便探針不會接觸到您真實的主機工作區。

如果您想依賴 env 金鑰（例如在您的 `~/.profile` 中匯出的），請在 `source ~/.profile` 之後執行本地測試，或使用下方的 Docker 執行器（它們可以將 `~/.profile` 掛載到容器中）。

## Deepgram live（音訊轉錄）

- 測試：`extensions/deepgram/audio.live.test.ts`
- 啟用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- 測試：`extensions/byteplus/live.test.ts`
- 啟用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可選的模型覆寫：`BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- 測試：`extensions/comfy/comfy.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 範圍：
  - 測試打包的 comfy 圖片、視訊和 `music_generate` 路徑
  - 除非設定 `models.providers.comfy.<capability>`，否則跳過每個功能
  - 在變更 comfy 工作流程提交、輪詢、下載或外掛程式註冊後很有用

## 圖片生成 live

- 測試：`test/image-generation.runtime.live.test.ts`
- 指令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 測試套件：`pnpm test:live:media image`
- 範圍：
  - 列舉每個已註冊的圖片生成提供者外掛程式
  - 在探測之前，從您的登入 shell (`~/.profile`) 載入缺失的提供者 env 變數
  - 預設優先使用 live/env API 金鑰而非儲存的 auth 配置檔案，因此 `auth-profiles.json` 中的過時測試金鑰不會遮蔽真實的 shell 憑證
  - 跳過沒有可用 auth/profile/model 的提供者
  - 透過共享執行時能力執行標準圖片生成變體：
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- 目前涵蓋的打包提供者：
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `vydra`
  - `xai`
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,xai:default-generate,xai:default-edit"`
- 可選的 auth 行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用配置檔案儲存 auth 並忽略僅限 env 的覆寫

## 音樂生成 live

- 測試：`extensions/music-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media music`
- 範圍：
  - 測試共享的捆綁音樂生成提供者路徑
  - 目前涵蓋 Google 和 MiniMax
  - 在偵測之前，從您的登入 Shell (`~/.profile`) 載入提供者環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會掩蓋真實的 Shell 憑證
  - 跳過沒有可用認證/設定檔/模型的提供者
  - 如果可用，會執行兩個宣告的執行時模式：
    - 使用 `generate` 進行僅提示詞輸入
    - 當提供者宣告 `capabilities.edit.enabled` 時，執行 `edit`
  - 目前的共享通道覆蓋率：
    - `google`：`generate`、`edit`
    - `minimax`：`generate`
    - `comfy`：獨立的 Comfy 即時檔案，並非此共享掃描
- 可選縮小範圍：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- 可選認證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制使用設定檔儲存的認證並忽略僅環境變數的覆寫

## 影片生成即時測試

- 測試：`extensions/video-generation-providers.live.test.ts`
- 啟用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- 測試工具：`pnpm test:live:media video`
- 範圍：
  - 測試共享的捆綁影片生成提供者路徑
  - 預設為釋出安全的冒煙測試路徑：非 FAL 提供者，每個提供者一個文字轉影片請求，一秒鐘的龍蝦提示詞，以及來自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每個提供者操作上限 (預設為 `180000`)
  - 預設跳過 FAL，因為提供者端的佇列延遲可能會佔據大部分釋出時間；請傳遞 `--video-providers fal` 或 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` 以明確執行它
  - 在偵測之前，從您的登入 Shell (`~/.profile`) 載入提供者環境變數
  - 預設優先使用即時/環境 API 金鑰而非儲存的認證設定檔，因此 `auth-profiles.json` 中的過時測試金鑰不會掩蓋真實的 Shell 憑證
  - 跳過沒有可用認證/設定檔/模型的提供者
  - 預設僅執行 `generate`
  - 設定 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 以在可用時也執行宣告的轉換模式：
    - 當提供者宣告 `capabilities.imageToVideo.enabled` 且選定的提供者/模型在共用掃描中接受緩衝區支援的本機圖片輸入時，執行 `imageToVideo`
    - 當提供者宣告 `capabilities.videoToVideo.enabled` 且選定的提供者/模型在共用掃描中接受緩衝區支援的本機視訊輸入時，執行 `videoToVideo`
  - 目前在共用掃描中已宣告但跳過的 `imageToVideo` 提供者：
    - `vydra`，因為內建的 `veo3` 僅支援文字，且內建的 `kling` 需要遠端圖片 URL
  - 特定提供者的 Vydra 覆蓋率：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 該檔案執行 `veo3` 文字生成視訊，以及一個預設使用遠端圖片 URL 固定裝置的 `kling` 通道
  - 目前的 `videoToVideo` 即時覆蓋率：
    - 僅當選定的模型是 `runway/gen4_aleph` 時執行 `runway`
  - 目前在共用掃描中已宣告但跳過的 `videoToVideo` 提供者：
    - `alibaba`、`qwen`、`xai`，因為這些路徑目前需要遠端 `http(s)` / MP4 參考 URL
    - `google`，因為目前的共用 Gemini/Veo 通道使用本機緩衝區備份輸入，且共用掃描不接受該路徑
    - `openai`，因為目前的共用通道缺乏特定組織的視訊重繪/混音存取權限保證
- 可選的縮小範圍：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含預設掃描中的每個提供者，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每個提供者的操作上限，進行激進的冒煙測試
- 可選的驗證行為：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以強制執行設定檔存放區驗證並忽略僅限環境變數的覆寫

## 媒體即時測試框架

- 指令：`pnpm test:live:media`
- 目的：
  - 透過一個倉庫原生入口點執行共享的圖片、音樂和影片即時套件
  - 從 `~/.profile` 自動載入遺失的供應商環境變數
  - 預設情況下，會自動將每個套件縮小範圍至目前具有可用驗證的供應商
  - 重複使用 `scripts/test-live.mjs`，因此心跳與靜音模式的行為保持一致
- 範例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker 執行器（選用的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在倉庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的設定檔金鑰即時檔案，並掛載您的本機設定目錄和工作區（如果已掛載則來源化 `~/.profile`）。對應的本機入口點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設使用較小的冒煙上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確需要較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次即時 Docker 映像檔，然後將其用於兩個即時 Docker 通道。它也會透過 `test:docker:e2e-build` 建構一個共享的 `scripts/e2e/Dockerfile` 映像檔，並將其用於對已建構應用程式進行測試的 E2E 容器冒煙執行器。
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:gateway-network`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, 和 `test:docker:config-reload` 啟動一或多個真實容器並驗證更高層級的整合路徑。

live-model Docker runners 也只會 bind-mount 所需的 CLI auth homes（或在執行範圍未縮減時掛載所有支援的），然後在執行前將其複製到 container home 中，以便 external-CLI OAuth 可以刷新 token 而不修改主機的 auth store：

- Direct models: `pnpm test:docker:live-models` (腳本: `scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (腳本: `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (腳本: `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness` (腳本: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (腳本: `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke: `pnpm test:docker:openwebui` (腳本: `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (腳本: `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全域安裝打包的 OpenClaw tarball，透過 env-ref onboarding 加上預設的 Telegram 來設定 OpenAI，驗證啟用 plugin 時會按需安裝其 runtime deps，執行 doctor，並執行一次模擬的 OpenAI agent 週期。使用 `OPENCLAW_NPM_ONBOARD_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預建的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切換 channel。
- Gateway networking (兩個容器, WS auth + health): `pnpm test:docker:gateway-network` (腳本: `scripts/e2e/gateway-network-docker.sh`)
- OpenAI Responses web_search minimal reasoning regression：`pnpm test:docker:openai-web-search-minimal`（腳本：`scripts/e2e/openai-web-search-minimal-docker.sh`）透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制供應商架構拒絕並檢查原始詳細資訊是否出現在 Gateway 記錄中。
- MCP channel bridge（seeded Gateway + stdio bridge + raw Claude notification-frame smoke）：`pnpm test:docker:mcp-channels`（腳本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi bundle MCP tools（real stdio MCP server + embedded Pi profile allow/deny smoke）：`pnpm test:docker:pi-bundle-mcp-tools`（腳本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/subagent MCP cleanup（real Gateway + stdio MCP child teardown after isolated cron and one-shot subagent runs）：`pnpm test:docker:cron-mcp-cleanup`（腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- Plugins（install smoke + `/plugin` alias + Claude-bundle restart semantics）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）
- Plugin update unchanged smoke：`pnpm test:docker:plugin-update`（腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- Config reload metadata smoke：`pnpm test:docker:config-reload`（腳本：`scripts/e2e/config-reload-source-docker.sh`）
- Bundled plugin runtime deps：`pnpm test:docker:bundled-channel-deps` 預設會建置一個小型的 Docker runner 映像檔，在主機上建置並打包一次 OpenClaw，然後將該 tarball 掛載到每個 Linux 安裝場景中。使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 重複使用該映像檔，在進行全新的本機建置後使用 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 跳過主機重建，或者使用 `OPENCLAW_BUNDLED_CHANNEL_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向現有的 tarball。
- 在反覆運算時透過停用不相關的場景來縮小 bundled plugin runtime deps 的範圍，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

若要手動預先建置並重複使用共享的 built-app 映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

套件特定的映像覆寫（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在設定時仍然優先生效。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共用映像時，如果本地尚未存在，腳本會將其拉取下來。QR 和安裝程式 Docker 測試保留自己的 Dockerfile，因為它們驗證的是套件/安裝行為，而不是共用建置應用程式執行時期。

live-model Docker 執行器也會將當前 checkout 以唯讀方式 bind-mount，並將其暫存到容器內的暫時工作目錄中。這在保持執行時映像檔精簡的同時，仍能針對您的確切本機原始碼/設定執行 Vitest。暫存步驟會跳過大型本機快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，因此 Docker live 執行不會花費數分鐘時間複製機器特定的構件。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway live probes 不會在容器內啟動真實的 Telegram/Discord/等頻道 worker。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 通道縮小或排除 gateway live 涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是更高層級的相容性檢測：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` proxy 發送真實的聊天請求。首次執行可能會明顯變慢，因為 Docker 可能需要提取 Open WebUI 映像檔，且 Open WebUI 可能需要完成其自身的冷啟動設定。此通道需要可用的 live model 金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。成功的執行會列印出一個小的 JSON payload，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 是有意設計為確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個已植入種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由的對話發現、紀錄讀取、附件中繼資料、即時事件佇列行為、外發傳送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此該檢測驗證的是橋接器實際發出的內容，而不僅僅是特定客戶端 SDK 恰好呈現的內容。`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建構 repo Docker 映像檔，在容器內啟動真實的 stdio MCP probe server，透過內嵌的 Pi bundle MCP 執行時具體化該 server，執行工具，然後驗證 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 會過濾它們。`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動一個帶有真實 stdio MCP probe server 的已植入種子的 Gateway，執行隔離的 cron 輪次和 `/subagents spawn`一次性子輪次，然後驗證 MCP 子程序在每次執行後退出。

手動 ACP 自然語言串流程式煙霧測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於回歸/除錯工作流程。稍後可能再次需要它來進行 ACP 串流程式路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用暫時性 config/workspace 目錄且不掛載外部 CLI 認證
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 以在 Docker 內快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮小的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- 使用 `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 縮小執行範圍
- 使用 `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 在容器內過濾供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重複使用現有的 `openclaw:local-live` 映像檔，用於不需要重新建置的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保認證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道針對 Open WebUI 煙霧測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用來覆寫 Open WebUI smoke 測試所使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用來覆寫固定的 Open WebUI 映像檔標籤

## 文件健全性檢查

編輯文件後執行檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線迴歸測試 (CI-safe)

這些是沒有真實供應商的「真實管線」迴歸測試：

- Gateway 工具呼叫 (模擬 OpenAI，真實 gateway + agent 迴圈)：`src/gateway/gateway.test.ts` (案例："runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證)：`src/gateway/gateway.test.ts` (案例："runs wizard over ws and writes auth token config")

## Agent 可靠性評估 (skills)

我們已經有一些 CI-safe 測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫 (`src/gateway/gateway.test.ts`)。
- 驗證 session 接線和配置效果的端到端精靈流程 (`src/gateway/gateway.test.ts`)。

Skills 仍然缺失的部分 (參見 [Skills](/zh-Hant/tools/skills))：

- **決策制定：** 當 prompt 中列出 skills 時，agent 是否會選擇正確的 skill (或避免不相關的 skill)？
- **合規性：** agent 在使用前是否會讀取 `SKILL.md` 並遵循必要的步驟/引數？
- **工作流程合約：** 斷言工具順序、session 歷史傳遞和沙箱邊界的多輪次場景。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景執行器，以斷言工具呼叫 + 順序、skill 檔案讀取和 session 接線。
- 一小套專注於 skill 的場景 (使用 vs 避免，閘控，prompt 注入)。
- 只有在 CI-safe 測試套件到位後，才進行選用的即時評估 (選擇加入，環境閘控)。

## 合約測試 (plugin 和 channel 形狀)

合約測試用於驗證每個已註冊的外掛和頻道是否符合其介面合約。它們會遍歷所有發現的外掛並執行一系列形狀和行為斷言。預設的 `pnpm test` unit 執行線會刻意跳過這些共享的縫合和冒煙檔案；當您修改共享的頻道或提供者介面時，請明確執行合約指令。

### 指令

- 所有合約： `pnpm test:contracts`
- 僅限頻道合約： `pnpm test:contracts:channels`
- 僅限提供者合約： `pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀 (id, name, capabilities)
- **setup** - 設定精靈合約
- **session-binding** - Session 綁定行為
- **outbound-payload** - 訊息酬載結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - Thread ID 處理
- **directory** - 目錄/名單 API
- **group-policy** - 群組政策執行

### 提供者狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - 外掛註冊表形狀

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - Auth 流程合約
- **auth-choice** - Auth 選擇/選取
- **catalog** - Model 目錄 API
- **discovery** - 外掛探索
- **loader** - 外掛載入
- **runtime** - 提供者執行時期
- **shape** - 外掛形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改頻道或提供者外掛之後
- 重構外掛註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試 (指導原則)

當您修復在 live 中發現的提供者/model 問題時：

- 如果可能的話，請新增 CI 安全的迴歸測試 (mock/stub 提供者，或是擷取精確的請求形狀轉換)
- 如果它本質上僅限 live (速率限制、auth 政策)，請保持 live 測試狹窄，並透過環境變數選擇加入
- 優先以能捕捉到錯誤的最小層級為目標：
  - provider 請求轉換/重播錯誤 → 直接 models 測試
  - gateway session/history/tool 管線錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍遍防護欄：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導出一個抽樣目標，然後斷言遍歷區段執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會對未分類的目標 ID 故意導致失敗，以免新類別被無聲跳過。
