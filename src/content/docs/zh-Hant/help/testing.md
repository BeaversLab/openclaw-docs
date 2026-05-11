---
summary: "測試套件：單元/E2E/Live 套件、Docker 執行器，以及每個測試涵蓋的內容"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "測試"
---

OpenClaw 有三個 Vitest 套件（單元/整合、e2e、live）和一小組 Docker 執行器。此文檔是一份「我們如何測試」指南：

- 每個套件涵蓋的內容（以及它刻意*不*涵蓋的內容）。
- 針對常見工作流程（本機、推送前、除錯）應執行的指令。
- Live 測試如何發現憑證並選擇模型/提供者。
- 如何為真實世界的模型/提供者問題加入回歸測試。

<Note>
**QA stack (qa-lab, qa-channel, live transport lanes)** 另有記載於：

- [QA 概述](/zh-Hant/concepts/qa-e2e-automation) — 架構、指令介面、情境撰寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) — `pnpm openclaw qa matrix` 的參考資料。
- [QA 頻道](/zh-Hant/channels/qa-channel) — 由 repo-backed scenarios 使用的合成傳輸外掛。

此頁面涵蓋了執行常規測試套件和 Docker/Parallels 執行器。下方的 QA 特定執行器章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 叫用，並指回上述參考資料。

</Note>

## 快速入門

大部分時候：

- 完整閘道（推送前預期執行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在寬敞的機器上進行更快的本機完整套件執行：`pnpm test:max`
- 直接 Vitest 監看迴圈：`pnpm test:watch`
- 直接檔案目標現在也會路由 extension/channel 路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您在處理單一失敗時，請優先使用目標執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 軌道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您修改測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當對真實提供者/模型進行除錯時（需要真實憑證）：

- Live 套件（模型 + gateway 工具/映像探測）：`pnpm test:live`
- 安靜地目標單一 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Docker live 模型掃描：`pnpm test:docker:live-models`
  - 每個選定的模型現在都會執行一個文字輪次加上一個小型的檔案讀取風格探測。
    其元資料宣稱支援 `image` 輸入的模型也會執行一個小型的圖片輪次。
    當隔離供應商故障時，使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 停用額外的探測。
  - CI 涵蓋範圍：每日 `OpenClaw Scheduled Live And E2E Checks` 和手動
    `OpenClaw Release Checks` 兩者都會使用 `include_live_suites: true` 呼叫可重複使用的 live/E2E 工作流程，
    其中包含依供應商分片的獨立 Docker live 模型矩陣任務。
  - 若要進行專注的 CI 重新執行，請使用 `include_live_suites: true` 和 `live_models_only: true` 分派 `OpenClaw Live And E2E Checks (Reusable)`。
  - 將新的高訊號供應商金鑰新增到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    排程/發布呼叫者。
- 原生 Codex bound-chat 煙霧測試：`pnpm test:docker:live-codex-bind`
  - 針對 Codex app-server 路徑執行 Docker live 通道，使用 `/codex bind` 綁定一個合成的
    Slack DM，執行 `/codex fast` 和
    `/codex permissions`，然後驗證純文字回覆和圖片附件
    是透過原生插件綁定而非 ACP 進行路由。
- Codex app-server harness 煙霧測試：`pnpm test:docker:live-codex-harness`
  - 透過插件擁有的 Codex app-server harness 執行 gateway agent 輪次，
    驗證 `/codex status` 和 `/codex models`，並且預設執行圖片、
    cron MCP、sub-agent 和 Guardian 探測。當隔離其他 Codex
    app-server 故障時，使用
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 停用 sub-agent 探測。
    若要進行專注的 sub-agent 檢查，請停用其他探測：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非設定
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否則此操作會在 sub-agent 探測後退出。
- Crestodian 救援指令煙霧測試：`pnpm test:live:crestodian-rescue-channel`
  - 針對 message-channel 救援指令介面的選用 belt-and-suspenders 檢查。
    它執行 `/crestodian status`，將永續模型變更排入佇列，
    回覆 `/crestodian yes`，並驗證 audit/config 寫入路徑。
- Crestodian 規劃器 Docker 煙霧測試：`pnpm test:docker:crestodian-planner`
  - 在無配置容器中以假裝的 Claude CLI 在 `PATH` 上執行 Crestodian，並驗證模糊規劃器回退機制已轉換為經過稽核的類型化配置寫入。
- Crestodian 首次執行 Docker 冒煙測試：`pnpm test:docker:crestodian-first-run`
  - 從空的 OpenClaw 狀態目錄開始，將裸露的 `openclaw` 路由到 Crestodian，應用 setup/model/agent/Discord 外掛程式 + SecretRef 寫入，驗證配置，並檢查稽核條目。相同的 Ring 0 設定路徑也由 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 在 QA Lab 中涵蓋。
- Moonshot/Kimi 成本冒煙測試：設定 `MOONSHOT_API_KEY`，執行 `openclaw models list --provider moonshot --json`，然後針對 `moonshot/kimi-k2.6` 執行獨立的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。驗證 JSON 回報 Moonshot/K2.6，且助理對話紀錄儲存了標準化的 `usage.cost`。

<Tip>當您只需要一個失敗案例時，建議優先使用下方描述的允許清單環境變數來縮小即時測試的範圍。</Tip>

## QA 專屬執行器

當您需要 QA Lab 的真實模擬時，這些指令位於主要測試套件旁邊：

CI 在專用工作流程中執行 QA Lab。`Parity gate` 在符合條件的 PR 上執行，並透過手動觸發搭配模擬提供者執行。`QA-Lab - All Lanes` 每晚在 `main` 上執行，並透過手動觸發以模擬同等性閘道、即時 Matrix 通道、Convex 管理的即時 Telegram 通道，以及 Convex 管理的即時 Discord 通道作為並行作業。排定的 QA 和發布檢查會明確傳遞 Matrix `--profile fast`，而 Matrix CLI 和手動工作流程輸入預設值維持 `all`；手動觸發可以將 `all` 分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作業。`OpenClaw Release Checks` 在發布核准前執行同等性檢查以及快速 Matrix 和 Telegram 通道。

- `pnpm openclaw qa suite`
  - 直接在主機上執行儲存庫支援的 QA 情境。
  - 預設情況下，使用獨立的 gateway worker 並行執行多個選定的場景。`qa-channel` 預設併發數為 4（受選定場景數量限制）。使用 `--concurrency <count>` 來調整 worker 數量，或者使用 `--concurrency 1` 來使用舊的序列 lane。
  - 當任何場景失敗時，以非零代碼退出。當您需要產生工件而不希望因失敗而退出時，請使用 `--allow-failures`。
  - 支援 provider 模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 會啟動一個本地的 AIMock 後端 provider 伺服器，用於實驗性的 fixture 和 protocol-mock 覆蓋率，而不取代具備場景感知能力的 `mock-openai` lane。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 中執行相同的 QA suite。
  - 保持與主機上的 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的 provider/model 選擇標誌。
  - Live 執行會轉發對客端實用的支援 QA 認證輸入：基於環境變數的 provider 金鑰、QA live provider 配置路徑，以及存在的 `CODEX_HOME`。
  - 輸出目錄必須保持在 repo 根目錄下，以便客端可以通過掛載的工作區寫回。
  - 在 `.artifacts/qa-e2e/...` 下寫入正常的 QA 報告和摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動基於 Docker 的 QA 站台，用於操作員風格的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從當前 checkout 建立 npm tarball，將其全域安裝在 Docker 中，執行非互動式 OpenAI API 金鑰入門，預設配置 Telegram，驗證啟用外掛程式會按需安裝執行時依賴項，執行 doctor，並針對模擬的 OpenAI 端點執行一次本地 agent 輪次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 透過 Discord 執行相同的打包安裝 lane。
- `pnpm test:docker:session-runtime-context`
  - 針對嵌入式執行時語境 (runtime context) 的逐字稿，執行確定性建置應用程式的 Docker 煙霧測試。它會驗證隱藏的 OpenClaw 執行時語境是作為非顯示的自訂訊息保存，而不是洩漏到可見的使用者輪次中，然後植入一個受影響的損壞工作階段 JSONL 並驗證 `openclaw doctor --fix` 將其重寫至具有備份的目前分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安裝 OpenClaw 套件候選版本，執行已安裝套件的入門流程，透過已安裝的 CLI 設定 Telegram，然後重複使用即時 Telegram QA 通道，並將該已安裝套件作為 SUT Gateway。
  - 預設為 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；設定 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以測試已解析的本機 tarball，而不是從登錄庫安裝。
  - 使用與 `pnpm openclaw qa telegram` 相同的 Telegram 環境憑證或 Convex 憑證來源。對於 CI/發布自動化，請設定 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色金鑰。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色金鑰，Docker 包裝程式會自動選擇 Convex。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 會僅針對此通道覆寫共享的 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 將此通道公開為手動維護者工作流程 `NPM Telegram Beta E2E`。它不會在合併時執行。該工作流程使用 `qa-live-shared` 環境和 Convex CI 憑證租用。
- GitHub Actions 也公開了 `Package Acceptance`，用於針對單一候選套件進行側邊執行的產品驗證。它接受受信任的 ref、已發布的 npm spec、HTTPS tarball URL 加上 SHA-256，或來自另一次執行的 tarball 成品，將標準化的 `openclaw-current.tgz` 上傳為 `package-under-test`，然後使用煙霧、套件、產品、完整或自訂通道設定檔執行現有的 Docker E2E 排程器。設定 `telegram_mode=mock-openai` 或 `live-frontier` 以針對相同的 `package-under-test` 成品執行 Telegram QA 工作流程。
  - 最新的 Beta 版產品驗證：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 確切的 tarball URL 驗證需要摘要：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 成品驗證會從另一個 Actions 執行下載 tarball 成品：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:bundled-channel-deps`
  - 將目前的 OpenClaw 建置打包並安裝在 Docker 中，啟動已設定 OpenAI 的 Gateway，然後透過設定編輯啟用打包的通道/外掛。
  - 驗證設定探索會保留未設定外掛的執行階段相依性，第一次設定的 Gateway 或 doctor 執行會按需安裝每個打包外掛的執行階段相依性，且第二次重新啟動不會重新安裝已啟用的相依性。
  - 同時安裝已知的較舊 npm 基準，在執行 `openclaw update --tag <candidate>` 前啟用 Telegram，並驗證候選版本的更新後 doctor 可修復打包通道執行階段相依性，而無需工具端 postinstall 修復。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 虛擬機上執行原生打包安裝更新冒煙測試。每個選定的平台會先安裝要求的基準套件，然後在同一虛擬機中執行已安裝的 `openclaw update` 指令，並驗證已安裝的版本、更新狀態、gateway 準備情況以及一次本機 agent 輪次。
  - 針對單一虛擬機進行反覆測試時，請使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 取得摘要構件路徑及各通道狀態。
  - OpenAI 通道預設使用 `openai/gpt-5.5` 進行即時 agent 輪次驗證。當刻意驗證其他 OpenAI 模型時，請傳遞 `--model <provider/model>` 或設定 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將長時間的本機執行作業包裝在主機逾時中，以免 Parallels 傳輸停滯佔用其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 該指令碼會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀通道記錄。在假設外層包裝已當機前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新在冷啟動虛擬機上進行更新後 doctor/執行階段相依性修復時，可能會花費 10 到 15 分鐘；只要巢狀 npm 除錯記錄持續前進，這仍屬正常狀態。
  - 請勿將此彙總包裝與個別 Parallels macOS、Windows 或 Linux 冒煙測試通道並行執行。它們共用 VM 狀態，可能在還原快照、提供套件或虛擬機 gateway 狀態時發生衝突。
  - 更新後的驗證會執行正常的捆綁插件表面，因為語音、影像生成和媒體理解等功能外掛是透過捆綁的執行時期 API 載入的，即使代理回合本身僅檢查簡單的文字回應。

- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，以進行直接協定冒煙測試。
- `pnpm openclaw qa matrix`
  - 對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA 通道。僅限原始碼結帳 — 打包安裝不附帶 `qa-lab`。
  - 完整的 CLI、設定檔/場景目錄、環境變數和產出配置：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 對真實的私人群組執行 Telegram 即時 QA 通道，使用來自環境變數的驅動程式和 SUT 機器人權杖。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數位聊天 ID。
  - 支援 `--credential-source convex` 以共用集區權杖。預設使用環境模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 當任何場景失敗時，以非零值結束。當您需要產出而不希望因失敗而結束時，請使用 `--allow-failures`。
  - 需要在同一個私人群組中有兩個不同的機器人，且 SUT 機器人公開 Telegram 使用者名稱。
  - 為了穩定的機器人對機器人觀察，請在 `@BotFather` 中為兩個機器人啟用機器人對機器人通訊模式，並確保驅動程式機器人可以觀察群組機器人流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察訊息產出。回覆場景包含從驅動程式傳送請求到觀察到 SUT 回應的 RTT。

即時傳輸通道共用一個標準合約，以便新傳輸不會產生偏離；每通道覆蓋率矩陣位於 [QA 概觀 → 即時傳輸覆蓋率](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是廣泛的綜合套件，並非該矩陣的一部分。

### 透過 Convex 共用的 Telegram 憑證 (v1)

當為 `openclaw qa telegram` 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從 Convex 支援的池中獲取獨佔租約，在 lane 執行期間發送租約心跳，並在關閉時釋放租約。

參考 Convex 專案腳手架：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個密鑰：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI: `--credential-role maintainer|ci`
  - 環境變數預設值: `OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

可選的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (可選的追蹤 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅限本機開發的迴路 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應該使用 `https://`。

維護者管理命令 (pool add/remove/list) 特別需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時執行之前使用 `doctor` 來檢查 Convex 網站 URL、broker 密鑰、端點前綴、HTTP 逾時以及管理員/列表連線能力，而不會列印出密鑰值。在腳本和 CI 工具中使用 `--json` 以獲得機器可讀的輸出。

預設端點合約 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - 請求: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }` (或空 `2xx`)
- `POST /release`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }` (或空 `2xx`)
- `POST /admin/add` (僅限維護者密鑰)
  - 請求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove` (僅限維護者密鑰)
  - 請求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活躍租約守衛：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (僅限維護者密鑰)
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字形式的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此結構，並拒絕格式錯誤的 payload。

### 將通道新增至 QA

新通道介面卡的架構與場景輔助程式名稱位於 [QA 概述 → 新增通道](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共享的 `qa-lab` 主機接縫上實作傳輸運行器，在插件清單中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下撰寫場景。

## 測試套件 (在哪裡執行什麼)

將這些測試套件視為「漸進的真實性」 (以及漸進的不穩定性/成本)：

### 單元 / 整合 (預設)

- 指令：`pnpm test`
- 設定：無針對性的執行會使用 `vitest.full-*.config.ts` 分片集合，並可能將多專案分片擴展為各專案的設定以便進行並行排程
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的核心/單元清單；UI 單元測試在專用的 `unit-ui` 分片中執行
- 範圍：
  - 純單元測試
  - 進程內整合測試（gateway 認證、路由、工具、解析、設定）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實的金鑰
  - 應該快速且穩定

<AccordionGroup>
  <Accordion title="專案、分片和範圍通道">

    - 無目標的 `pnpm test` 會執行十二個較小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這會降低負載機器上的 RSS 峰值，並避免自動回覆/擴充套件工作導致不相關套件飢餓。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監視迴圈並不實際。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先透過範圍通道路由明確的檔案/目錄目標，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
    - `pnpm test:changed` 預設會將變更的 git 路徑擴充為廉價的範圍通道：直接測試編輯、同層級 `*.test.ts` 檔案、明確來源對應，以及本機匯入圖相依項。除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否則配置/設定/套件編輯不會廣泛執行測試。
    - `pnpm check:changed` 是用於狹窄工作的正常智慧本機檢查閘道。它會將差異分類為核心、核心測試、擴充套件、擴充套件測試、應用程式、文件、發行中繼資料、Live Docker 工具和工具，然後執行相符的型別檢查、Lint 和 Guard 指令。它不會執行 Vitest 測試；請呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試驗證。僅包含發行中繼資料的版本遞增會執行目標版本/配置/根相依項檢查，並使用 Guard 拒絕頂層版本欄位以外的套件變更。
    - Live Docker ACP 擴充機具編輯會執行焦點檢查：Live Docker 驗證腳本的 Shell 語法和 Live Docker 排程器試執行。`package.json` 變更僅在差異限於 `scripts["test:docker:live-*"]` 時才會納入；相依項、匯出、版本和其他套件表面編輯仍使用更廣泛的 Guard。
    - 來自代理程式、指令、外掛程式、自動回覆協助程式、`plugin-sdk` 和類似純工具區域的低匯入單元測試會透過 `unit-fast` 通道路由，這會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時較重的檔案保留在現有通道上。
    - 選定的 `plugin-sdk` 和 `commands` 協助程式來源檔案也會將變更模式執行對應到這些輕量通道中的明確同層級測試，因此協助程式編輯可避免為該目錄重新執行完整的繁重套件。
    - `auto-reply` 具有頂層核心協助程式、頂層 `reply.*` 整合測試和 `src/auto-reply/reply/**` 子樹的專用儲存區。CI 會將回覆子樹進一步分割為代理程式執行器、分派和指令/狀態路由分片，因此單一匯入繁重的儲存區不會擁有完整的 Node 尾部。

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - 當您變更 message-tool 探索輸入或壓縮執行時上下文時，請同時保持兩個層級的覆蓋率。
    - 針對純路由與正規化邊界，新增專注的輔助迴歸測試。
    - 維護嵌入式執行器整合套件的健全性：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 以及
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 這些套件用於驗證範圍 ID 與壓縮行為仍能流經真實的 `run.ts` / `compact.ts` 路徑；僅包含輔助函式的測試不足以替代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共享的 Vitest 設定固定 `isolate: false`，並在根專案、e2e 與 live 設定之間使用非隔離執行器。
    - 根 UI 通道保留其 `jsdom` 設定與最佳化工具，但同樣在共享的非隔離執行器上執行。
    - 每個 `pnpm test` 分片都會從共享 Vitest 設定繼承相同的 `threads` + `isolate: false`
      預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯消耗。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可與標準 V8 行為進行比較。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 顯示差異觸發了哪些架構通道。
    - 預提交 Hook 僅負責格式化。它會重新暫存格式化後的檔案，並且不會執行 lint、typecheck 或測試。
    - 當您需要智慧本地檢查閘道時，請在交接或推送之前明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設透過廉價的作用域通道進行路由。僅當代理決定對測試工具、配置、套件或合約的編輯確實需要更廣泛的 Vitest 覆蓋範圍時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 Worker 上限。
    - 本地 Worker 自動伸縮策略故意採取保守態度，當主機負載平均值已經很高時會後退，因此多個併發的 Vitest 執行預設造成的影響較小。
    - 基礎 Vitest 配置將專案/配置檔案標記為 `forceRerunTriggers`，以便當測試連線變更時，變更模式下的重新執行保持正確。
    - 該配置在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要一個用於直接分析的明確快取位置，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="效能調試">

    - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及
      匯入分解輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析範圍縮小至
      自 `origin/main` 以來變更的檔案。
    - Shard 計時資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整設定執行使用設定路徑作為鍵；include-pattern CI
      shard 會附加 shard 名稱，以便單獨追蹤已過濾的 shard。
    - 當單一熱測試仍將大部分時間花費在啟動匯入時，
      請將繁重的相依性保持在狹窄的本機 `*.runtime.ts` 介面之後，
      並直接模擬該介面，而不是深度匯入執行時期輔助程式
      只為了將其傳遞給 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 比對路由後的
      `test:changed` 與該提交差異的原生根專案路徑，並印出牆上時間 (wall time) 加上 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過將變更的檔案列表路由至
      `scripts/test-projects.mjs` 與根 Vitest 設定，對目前
      的 dirty tree 進行基準測試。
    - `pnpm test:perf:profile:main` 為 Vitest/Vite 啟動
      和轉換負載撰寫主執行緒 CPU profile。
    - `pnpm test:perf:profile:runner` 在停用檔案並行處理的情況下，
      為 unit suite 撰寫 runner CPU+heap profiles。

  </Accordion>
</AccordionGroup>

### 穩定性 (gateway)

- 指令：`pnpm test:stability:gateway`
- 設定：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 啟動一個預設啟用診斷功能的真實 loopback Gateway
  - 透過診斷事件路徑驅動合成的 gateway 訊息、記憶體和大型承載變動
  - 透過 Gateway WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持久化輔助程式
  - 斷言記錄器保持有限、合成的 RSS 樣本保持在壓力預算之下，且每個工作階段的佇列深度會排空回歸零
- 預期：
  - CI 安全且無需金鑰
  - 適用於穩定性回歸後續追蹤的狹窄管道，而非完整 Gateway suite 的替代方案

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時預設值：
  - 使用 Vitest `threads` 搭配 `isolate: false`，與 repo 其餘部分一致。
  - 使用自適應 workers（CI：最多 2 個，本地：預設 1 個）。
  - 預設以靜默模式執行以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制指定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的主控台輸出。
- 範圍：
  - 多實例 gateway 的端到端行為
  - WebSocket/HTTP 介面、節點配對以及較重的網路操作
- 預期：
  - 在 CI 中執行（當在 pipeline 中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作部件（可能會較慢）

### E2E：OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個獨立的 OpenShell gateway
  - 從暫時的本機 Dockerfile 建立一個沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙箱 fs 橋接器驗證遠端標準的檔案系統行為
- 預期：
  - 僅限選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，接著摧毀測試用的 gateway 與沙箱
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 用於在手動執行更廣泛的 e2e suite 時啟用此測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用於指定非預設的 CLI 執行檔或包裝腳本

### Live (真實提供者 + 真實模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「這個提供者/模型今天是否真的能夠使用真實憑證運作？」
  - 捕捉提供者格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不穩定於 CI（真實網路、真實供應商策略、配額、故障）
  - 需花費金錢 / 使用速率限制
  - 建議執行縮小範圍的子集，而非「全部」
- Live 執行來源 `~/.profile` 以拾取遺失的 API 金鑰。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將配置/認證資料複製到臨時測試主目錄，因此單元裝置不會修改您的真實 `~/.openclaw`。
- 僅當您有意需要 Live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，但會抑制額外的 `~/.profile` 通知並靜音 gateway bootstrap 日誌/Bonjour 閒談。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換（特定於供應商）：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`）或透過 `OPENCLAW_LIVE_*_KEY` 進行每個 Live 的覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 套件現在會向 stderr 輸出進度行，因此即使 Vitest console capture 很安靜，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest console 攔截，以便提供者/gateway 進度行在 Live 執行期間立即串流。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 心跳。

## 我應該執行哪個套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您修改了很多內容，還要執行 `pnpm test:coverage`）
- 涉及 gateway 網路功能 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人當機」 / 特定供應商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live（涉及網路）測試

關於即時模型矩陣、CLI 後端冒煙測試、ACP 冒煙測試、Codex app-server
harness，以及所有媒體提供商即時測試（Deepgram、BytePlus、ComfyUI、影像、
音樂、影片、media harness）——加上即時執行的憑證處理——請參閱
[Testing — live suites](/zh-Hant/help/testing-live)。

## Docker 執行器（選用的「在 Linux 上運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在倉庫 Docker 映像檔內執行其對應的 profile-key 即時檔案（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），掛載您的本機設定目錄和工作區（並在掛載時載入 `~/.profile`）。對應的本機進入點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設為較小的冒煙測試上限，以便完整的 Docker 掃描能保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確想要進行較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 live Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，然後建置/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅用於 install/update/plugin-dependency 通道的 Node/Git 執行器；這些通道會掛載預先建置的 tarball。Functional 映像檔則會將相同的 tarball 安裝到 `/app` 中，用於 built-app 功能通道。Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；計劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 會執行選定的計劃。聚合器使用加權本地排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制程序插槽，而資源上限則防止繁重的 live、npm-install 和 multi-service 通道同時啟動。如果單一通道的負載超過啟用上限，排程器仍可在集區空閒時啟動它，並讓其單獨執行直到容量恢復可用。預設值為 10 個插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。執行器預設會執行 Docker 預檢，移除過時的 OpenClaw E2E 容器，每 30 秒列印一次狀態，將成功的通道計時儲存在 `.artifacts/docker-tests/lane-timings.json` 中，並在後續執行時使用這些計時優先啟動較長的通道。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 列印加權通道清單而不建置或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 列印所選通道的 CI 計劃、套件/映像檔需求以及憑證。
- `Package Acceptance` 是 GitHub 原生套件閘道，用於檢查「此可安裝的 tarball 是否能作為產品正常運作？」它會從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該確切的 tarball 執行可重複使用的 Docker E2E 通道，而不是重新打包選定的 ref。`workflow_ref` 選擇受信任的工作流程/harness 腳本，而 `package_ref` 選擇在 `source=ref` 時要打包的來源提交/分支/標籤；這允許當前的驗收邏輯驗證較舊的受信任提交。設定檔按廣度排序：`smoke` 是快速安裝/通道/代理程式加上閘道/配置，`package` 是套件/更新/外掛合約，也是大多數 Parallels 套件/更新覆蓋範圍的預設原生替代方案，`product` 增加了 MCP 通道、cron/subagent 清理、OpenAI 網頁搜尋和 OpenWebUI，而 `full` 則執行含 OpenWebUI 的發布路徑 Docker 區塊。發布驗證會執行自訂套件差異 (`bundled-channel-deps-compat plugins-offline`) 加上 Telegram 套件 QA，因為發布路徑 Docker 區塊已涵蓋重疊的套件/更新/外掛通道。從構件產生的目標式 GitHub Docker 重新執行指令，會在可用時包含先前的套件構件和準備好的映像檔輸入，因此失敗的通道可以避免重建套件和映像檔。
- 建置和發布檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。防護機制會遍歷 `dist/entry.js` 和 `dist/cli/run-main.js` 的靜態建置圖表，如果在分派命令之前的啟動階段匯入了 Commander、prompt UI、undici 或 logging 等套件相依性，就會失敗。打包的 CLI 偵測也涵蓋了根說明、上手說明、doctor 說明、狀態、配置 schema 以及模型列表指令。
- Package Acceptance 舊版兼容性上限為 `2026.4.25`（包含 `2026.4.25-beta.*`）。在該截止版本之前，harness 僅容許已發佈套件的 metadata 缺失：省略私有 QA inventory 項目、缺少 `gateway install --wrapper`、缺少 tarball 衍生的 git fixture 中的 patch 檔案、缺少持續化的 `update.channel`、舊版外掛程式安裝記錄位置、缺少 marketplace 安裝記錄持久化，以及在 `plugins update` 期間的設定 metadata 遷移。對於 `2026.4.25` 之後的套件，這些路徑均視為嚴重失敗。
- Container smoke 執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:update-channel-switch`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update` 和 `test:docker:config-reload` 會啟動一個或多個真實容器並驗證更高層級的整合路徑。

Live-model Docker 執行器也僅 bind-mount 所需的 CLI 認證主目錄（或在執行範圍未縮小時掛載所有支援的目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以更新 token 而不會修改主機認證儲存區：

- Direct models：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`；預設涵蓋 Claude、Codex 和 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 嚴格涵蓋 Droid/OpenCode）
- CLI backend smoke：`pnpm test:docker:live-cli-backend`（腳本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（腳本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Observability smoke：`pnpm qa:otel:smoke` 是一個私有的 QA 原始碼檢出通道。它故意不包含在套件 Docker 發布通道中，因為 npm tarball 中省略了 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui` （腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard` （腳本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball onboarding/channel/agent smoke：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全域安裝打包好的 OpenClaw tarball，透過 env-ref onboarding 加上預設的 Telegram 來設定 OpenAI，驗證 doctor 修復了啟用的外掛程式執行階段相依性，並執行一次模擬的 OpenAI agent 回合。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 切換通道。
- Update channel switch smoke：`pnpm test:docker:update-channel-switch` 在 Docker 中全域安裝打包好的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證持續存在的通道和外掛程式更新後能正常運作，然後切換回 package `stable` 並檢查更新狀態。
- Session runtime context smoke：`pnpm test:docker:session-runtime-context` 驗證隱藏的執行階段內容文字記錄持續性，以及 doctor 對受影響的重複提示重寫分支的修復。
- Bun global install smoke：`bash scripts/e2e/bun-global-install-smoke.sh` 打包目前的程式碼樹，在獨立的 home 目錄中使用 `bun install -g` 安裝它，並驗證 `openclaw infer image providers --json` 傳回打包的圖像提供者而不是卡住。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建置，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從建置的 Docker 映像檔複製 `dist/`。
- Installer Docker smoke: `bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共享一個 npm 快取。Update smoke 預設使用 npm `latest` 作為升級至候選 tarball 之前的穩定基準。可在本地透過 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆蓋，或在 GitHub 上透過 Install Smoke workflow 的 `update_baseline_version` 輸入覆蓋。非 root installer 檢查會保持獨立的 npm 快取，以免 root 擁有的快取項目掩蓋使用者本地的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本地重新執行時重複使用 root/update/direct-npm 快取。
- Install Smoke CI 會使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要直接 `npm install -g` 覆蓋率時，請在本地不帶該環境變數執行腳本。
- Agents delete shared workspace CLI smoke: `pnpm test:docker:agents-delete-shared-workspace` (腳本: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設會建構 root Dockerfile 映像檔，在獨立的容器主目錄中用一個工作區植入兩個代理程式，執行 `agents delete --json`，並驗證有效的 JSON 以及保留的工作區行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重複使用 install-smoke 映像檔。
- Gateway networking (兩個容器, WS auth + health): `pnpm test:docker:gateway-network` (腳本: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke: `pnpm test:docker:browser-cdp-snapshot` (腳本: `scripts/e2e/browser-cdp-snapshot-docker.sh`) 會建構來源 E2E 映像檔加上 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP 角色快照涵蓋連結 URL、游標促進的可點擊元素、iframe 參照和 frame 中繼資料。
- OpenAI Responses web_search minimal reasoning regression: `pnpm test:docker:openai-web-search-minimal` (腳本: `scripts/e2e/openai-web-search-minimal-docker.sh`) 會透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制供應商 schema 拒絕並檢查原始細節是否出現在 Gateway 日誌中。
- MCP 通道橋接器（已植入的 Gateway + stdio 橋接器 + 原始 Claude 通知框架冒煙測試）：`pnpm test:docker:mcp-channels`（腳本：`scripts/e2e/mcp-channels-docker.sh`）
- Pi 套件 MCP 工具（真實 stdio MCP 伺服器 + 嵌入式 Pi 設定檔允許/拒絕冒煙測試）：`pnpm test:docker:pi-bundle-mcp-tools`（腳本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`）
- Cron/子代理 MCP 清理（真實 Gateway + stdio MCP 子程序在隔離的 cron 和一次性子代理運行後拆解）：`pnpm test:docker:cron-mcp-cleanup`（腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 外掛（安裝冒煙測試、ClawHub 安裝/解除安裝、市集更新，以及 Claude 套件啟用/檢查）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過即時 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆蓋預設套件。
- 外掛更新未變更冒煙測試：`pnpm test:docker:plugin-update`（腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 設定檔重新載入元資料冒煙測試：`pnpm test:docker:config-reload`（腳本：`scripts/e2e/config-reload-source-docker.sh`）
- 打包外掛運行時依賴：`pnpm test:docker:bundled-channel-deps` 預設會建置一個小型 Docker 執行器映像檔，在主機上建構並打包一次 OpenClaw，然後將該 tarball 掛載到每個 Linux 安裝場景中。使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 重複使用映像檔，在全新本地建構後使用 `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0` 跳過主機重新建構，或使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 指向現有的 tarball。完整的 Docker 聚合和發布路徑 `bundled-channels` 區塊會預先打包此 tarball 一次，然後將打包通道檢查分片到獨立的通道，包括 Telegram、Discord、Slack、Feishu、memory-lancedb 和 ACPX 的獨立更新通道。舊版的 `plugins-integrations` 區塊仍是手動重新執行的聚合別名。直接執行打包通道時，使用 `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` 來縮小通道矩陣，或使用 `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` 來縮小更新場景。該通道也會驗證 `channels.<id>.enabled=false` 和 `plugins.entries.<id>.enabled=false` 會抑制 doctor/runtime-dependency 修復。
- 透過停用不相關的情境，在反覆運算時縮小打包的插件執行階段相依性，例如：
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`。

若要手動預先建置並重複使用共享的功能映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

設定特定套件的映像檔覆寫（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）仍然具有優先權。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共享映像檔時，如果尚未在本機，腳本會將其拉取下來。QR 和安裝程式 Docker 測試會保留自己的 Dockerfile，因為它們驗證的是套件/安裝行為，而不是共享的建置應用程式執行階段。

live-model Docker runner 也會以唯讀方式 bind-mount 目前的 checkout，並將其暫存到容器內的臨時工作目錄中。這能在保持執行時映像檔精簡的同時，針對您的確切本機來源/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，以免 Docker live 執行耗費數分鐘複製機器特定的構件。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，這樣 gateway live probes 就不會在容器內啟動真實的 Telegram/Discord 等頻道 worker。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或排除該 Docker lane 的 gateway live 涵蓋範圍時，請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是較高層級的相容性測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` proxy 發送真實的聊天請求。首次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成其自身的冷啟動設定。此 lane 需要可用的 live model 金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。成功的執行會列印出一個小的 JSON payload，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 是刻意設計為確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳號。它會啟動一個帶有種子的 Gateway 容器，啟動第二個衍生出 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP bridge 驗證路由對話探索、對話紀錄讀取、附件中繼資料、即時事件佇列行為、輸出發送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此測試驗證的是 bridge 實際發出的內容，而不僅是特定用戶端 SDK 恰好呈現的內容。`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP probe server，透過內嵌的 Pi bundle MCP runtime 具體化該 server，執行工具，然後驗證 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 會將其過濾掉。`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動一個帶有真實 stdio MCP probe server 的已設定種子的 Gateway，執行獨立的 cron 週期和 `/subagents spawn` 一次性子週期，然後驗證 MCP 子程序在每次執行後會結束。

手動 ACP 自然語言串流程壓力測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本用於回歸/除錯工作流程。針對 ACP 串流程路由驗證可能會再次需要它，因此請勿刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile` 並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 用於僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用暫時性設定/工作區目錄且不掛載外部 CLI 驗證
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 以在 Docker 內快取 CLI 安裝
- `$HOME` 下的外部 CLI 驗證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，並在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮減的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內篩選供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔進行不需要重建的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道為 Open WebUI 壓力測試暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用於覆寫 Open WebUI 測試使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用於覆寫固定的 Open WebUI 映像檔標籤

## 文件完整性檢查

在編輯文件後執行檢查：`pnpm check:docs`。
當您需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試（CI 安全）

這些是沒有真實供應商的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「透過 gateway agent 迴圈端到端執行模擬 OpenAI 工具呼叫」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「透過 ws 執行精靈並寫入驗證權杖設定」）

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.test.ts`）。
- 驗證 session 連接和設定效果的端到端精靈流程（`src/gateway/gateway.test.ts`）。

技能目前仍缺少什麼（請參閱 [技能](/zh-Hant/tools/skills)）：

- **決策：** 當提示中列出了技能，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/引數？
- **工作流程合約：** 斷言工具順序、session 歷史傳承和沙箱邊界的多輪次情境。

未來的評估應首先保持決定性：

- 使用模擬供應商來斷言工具呼叫 + 順序、技能檔案讀取和 session 連接的情境執行器。
- 一套專注於技能的小型情境測試（使用與避免、閘道控制、提示注入）。
- 只有在 CI 安全測試套件就位後，才進行選用的即時評估（選擇加入、環境閘道）。

## 合約測試（外掛和頻道形狀）

合約測試（Contract tests）驗證每個已註冊的插件和通道是否符合其介面合約。它們會遍歷所有已發現的插件，並執行一組形狀和行為斷言。預設的 `pnpm test` unit lane 會刻意跳過這些共享 seam 和 smoke 檔案；當您修改共享通道或 Provider 介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限通道合約：`pnpm test:contracts:channels`
- 僅限 Provider 合約：`pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本插件形狀 (id, name, capabilities)
- **setup** - 設定精靈合約
- **session-binding** - Session 綁定行為
- **outbound-payload** - 訊息 payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理程式
- **threading** - Thread ID 處理
- **directory** - Directory/roster API
- **group-policy** - 群組政策執行

### Provider 狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道狀態探測
- **registry** - 插件註冊表形狀

### Provider 合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 插件探索
- **loader** - 插件載入
- **runtime** - Provider 執行時
- **shape** - 插件形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改通道或 Provider 插件之後
- 重構插件註冊或探索功能之後

合約測試在 CI 中執行，且不需要真實的 API 金鑰。

## 新增迴歸測試（指引）

當您修復在 live 中發現的 provider/model 問題時：

- 如果可行，請新增 CI 安全的迴歸測試 (mock/stub provider，或擷取確切的請求形狀轉換)
- 如果本質上僅限 live (速率限制、驗證政策)，請保持 live 測試狹窄，並透過環境變數選擇加入
- 優先以能發現錯誤的最小層級為目標：
  - provider 請求轉換/重放錯誤 → 直接模型測試
  - gateway session/history/tool pipeline 錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍歷防護措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄表元數據 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導出一個抽樣目標，然後斷言遍歷段執行 ID 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。該測試會故意在未分類的目標 ID 上失敗，以免新類別被無聲跳過。

## 相關內容

- [即時測試 (Testing live)](/zh-Hant/help/testing-live)
- [CI](/zh-Hant/ci)
