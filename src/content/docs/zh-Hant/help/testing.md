---
summary: "測試套件：單元/E2E/Live 測試套件、Docker 執行器以及各項測試涵蓋範圍"
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
**QA stack (qa-lab, qa-channel, live transport lanes)** 另有獨立文件說明：

- [QA 概覽](/zh-Hant/concepts/qa-e2e-automation) - 架構、指令介面、情境撰寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - `pnpm openclaw qa matrix` 參考資料。
- [QA channel](/zh-Hant/channels/qa-channel) - 由 repo-backed 情境所使用的合成傳輸外掛。

本頁涵蓋如何執行一般測試套件以及 Docker/Parallels 執行器。下方針對 QA 專屬執行器的章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 叫用指令，並連結回上述參考資料。

</Note>

## 快速入門

大部分時候：

- 完整閘道（推送前預期執行）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在資源充足的機器上更快速的本地完整套件執行：`pnpm test:max`
- 直接使用 Vitest 監看迴圈：`pnpm test:watch`
- 直接指定檔案現在也支援路由 extension/channel 路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您在處理單一失敗時，請優先使用目標執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您修改測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當對真實提供者/模型進行除錯時（需要真實憑證）：

- Live 套件（模型 + gateway 工具/圖像探測）：`pnpm test:live`
- 安靜地指定單一 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 執行時效能報告：針對真實的 `openai/gpt-5.5` agent 週期發送 `OpenClaw Performance` 搭配 `live_openai_candidate=true`，或針對 Kova CPU/堆疊/追蹤成果使用 `deep_profile=true`。每日排程執行會在配置 `CLAWGRIT_REPORTS_TOKEN` 時，將 mock-provider、deep-profile 和 GPT 5.5 通道成果發佈至 `openclaw/clawgrit-reports`。Mock-provider 報告也包含來源層級的 gateway 啟動、記憶體、外掛壓力、重複 fake-model hello 迴圈以及 CLI 啟動數據。
- Docker live 模型掃描：`pnpm test:docker:live-models`
  - 每個選定的模型現在都會執行一個文本輪次以及一個小型的檔案讀取式探測。
    其元資料宣稱支援 `image` 輸入的模型也會執行一個微小的圖像輪次。
    當隔離提供者失敗時，請使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 停用額外的探測。
  - CI 涵蓋範圍：每日 `OpenClaw Scheduled Live And E2E Checks` 和手動
    `OpenClaw Release Checks` 都會呼叫可重複使用的 live/E2E 工作流程並帶有
    `include_live_suites: true`，其中包括按提供者分片的獨立 Docker live model
    矩陣任務。
  - 若要進行特定的 CI 重新執行，請分派 `OpenClaw Live And E2E Checks (Reusable)`
    並帶有 `include_live_suites: true` 和 `live_models_only: true`。
  - 將新的高訊號提供者密鑰新增到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    定期/發布呼叫端。
- 原生 Codex 綁定聊天煙霧測試：`pnpm test:docker:live-codex-bind`
  - 針對 Codex app-server 路徑執行 Docker live 通道，使用 `/codex bind` 綁定一個合成的
    Slack DM，執行 `/codex fast` 和
    `/codex permissions`，然後驗證純文字回覆和圖像附件
    是透過原生外掛程式綁定而非 ACP 路由。
- Codex app-server 駕駛程式煙霧測試：`pnpm test:docker:live-codex-harness`
  - 透過外掛程式擁有的 Codex app-server 駕駛程式執行 gateway agent 輪次，
    驗證 `/codex status` 和 `/codex models`，並預設執行圖像、
    cron MCP、sub-agent 和 Guardian 探測。當隔離其他 Codex
    app-server 失敗時，請使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 停用 sub-agent 探測。
    若要進行專注的 sub-agent 檢查，請停用其他探測：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非設定了
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否則這會在 sub-agent 探測後退出。
- Codex 隨需安裝煙霧測試：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安裝打包好的 OpenClaw tarball，執行 OpenAI API-key
    入職流程，並驗證 Codex 外掛程式加上 `@openai/codex` 依賴項
    已隨需下載到受管理的 npm 根目錄中。
- Live 外掛程式工具依賴項煙霧測試：`pnpm test:docker:live-plugin-tool`
  - 打包一個具有真實 `slugify` 依賴的 fixture 插件，透過
    `npm-pack:` 安裝，在受管理的 npm 根目錄下驗證該依賴，然後要求
    即時 OpenAI 模型呼叫該插件工具並傳回隱藏的 slug。
- Crestodian 救援指令冒煙測試：`pnpm test:live:crestodian-rescue-channel`
  - 針對訊息頻道救援指令
    介面的自選雙重保險檢查。它執行 `/crestodian status`，將持久化模型
    變更加入佇列，回覆 `/crestodian yes`，並驗證審計/配置寫入路徑。
- Crestodian 規劃器 Docker 冒煙測試：`pnpm test:docker:crestodian-planner`
  - 在 `PATH` 上於無配置容器中以假的 Claude CLI
    執行 Crestodian，並驗證模糊規劃器後備機制會轉換為經審計的類型化
    配置寫入。
- Crestodian 首次執行 Docker 冒煙測試：`pnpm test:docker:crestodian-first-run`
  - 從空的 OpenClaw 狀態目錄開始，將純 `openclaw` 路由至
    Crestodian，應用設定/模型/代理程式/Discord 插件 + SecretRef 寫入，
    驗證配置，並驗證審計項目。QA Lab 中透過
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 也涵蓋了相同的 Ring 0 設定路徑。
- Moonshot/Kimi 成本冒煙測試：設定 `MOONSHOT_API_KEY` 後，執行
  `openclaw models list --provider moonshot --json`，然後針對 `moonshot/kimi-k2.6` 執行獨立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。驗證 JSON 回報 Moonshot/K2.6 以及
  助手文字記錄儲存了標準化的 `usage.cost`。

<Tip>當您只需要一個失敗的案例時，建議優先使用下述透過允許清單環境變數來縮小即時測試範圍的方法。</Tip>

## QA 專用執行器

當您需要 QA Lab 的真實性時，這些指令位於主要測試套件旁邊：

CI 會在專用的工作流程中執行 QA Lab。Agent 對等性測試嵌套在 `QA-Lab - All Lanes` 和發布驗證之下，而非獨立的 PR 工作流程。廣泛的驗證應使用帶有 `rerun_group=qa-parity` 的 `Full Release Validation` 或 release-checks QA 群組。穩定/預設的發布檢查會將徹底的 live/Docker soak 測試保留在 `run_release_soak=true` 之後；`full` 設定檔會強制開啟 soak 測試。`QA-Lab - All Lanes` 會在 `main` 上每夜執行，並透過手動觸發，將 mock parity lane、live Matrix lane、Convex 管理的 live Telegram lane 和 Convex 管理的 live Discord lane 作為並行工作來執行。排程的 QA 和發布檢查會明確傳遞 Matrix `--profile fast`，而 Matrix CLI 和手動工作流程輸入的預設值仍為 `all`；手動觸發可以將 `all` 分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 工作。「OpenClaw Release Checks」會在發布核准前執行 parity 加上快速的 Matrix 和 Telegram lanes，使用 `mock-openai/gpt-5.5` 進行發傳輸檢查，以保持確定性並避免正常的 provider-plugin 啟動。這些 live transport gateway 會停用記憶體搜尋；記憶體行為仍由 QA parity suites 涵蓋。

完整的發布 live media 分片使用 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已經包含 `ffmpeg` 和 `ffprobe`。Docker live model/backend 分片使用為每個選定的 commit 構建一次的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每個分片內部重新構建。

- `pnpm openclaw qa suite`
  - 直接在主機上執行倉庫支援的 QA 情境。
  - 預設情況下，使用獨立的 gateway workers 並行執行多個選定的場景。`qa-channel` 預設並發數為 4（以選定的場景數量為界）。使用 `--concurrency <count>` 調整 worker 數量，或使用 `--concurrency 1` 進行舊版的序列 lane 測試。
  - 當任何場景失敗時，以非零代碼退出。當您希望獲得產物而不希望因失敗而退出時，請使用 `--allow-failures`。
  - 支援提供者模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 會啟動一個本機的、由 AIMock 支援的提供者伺服器，用於實驗性的 fixture 和協議 mock 覆蓋率，而不會取代感知場景的 `mock-openai` 通道。
- `pnpm test:plugins:kitchen-sink-live`
  - 透過 QA Lab 執行即時 OpenAI Kitchen Sink 插件測試。它會安裝外部 Kitchen Sink 套件，驗證插件 SDK 表面清單，探測 `/healthz` 和 `/readyz`，記錄閘道 CPU/RSS 證據，執行即時 OpenAI 互動，並檢查對抗性診斷。需要即時 OpenAI 身份驗證，例如 `OPENAI_API_KEY`。在已套用的 Testbox 工作階段中，當 `openclaw-testbox-env` 輔助程式存在時，它會自動套用 Testbox 即時身分驗證設定檔。
- `pnpm test:gateway:cpu-scenarios`
  - 執行閘道啟動基準測試以及一小組模擬 QA Lab 場景套件 (`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`)，並在 `.artifacts/gateway-cpu-scenarios/` 下寫入綜合 CPU 觀察摘要。
  - 預設僅標記持續的高 CPU 觀察結果 (`--cpu-core-warn` 加上 `--hot-wall-warn-ms`)，因此短暫的啟動峰值會被記錄為指標，而不會看起來像長達數分鐘的閘道佔用回歸。
  - 使用已建置的 `dist` 產物；當簽出尚未包含新的執行時輸出時，請先執行建置。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 內執行相同的 QA 套件。
  - 在主機上保持與 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - 即時執行會轉發來賓可實用的支援 QA 身份驗證輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及 `CODEX_HOME` (如果存在的話)。
  - 輸出目錄必須保持在 repo 根目錄下，以便 guest 可以透過
    掛載的寫入工作區回傳資料。
  - 在 `.artifacts/qa-e2e/...` 下寫入標準的 QA 報告和摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動支援 Docker 的 QA 站台，用於操作員式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從當前 checkout 建構 npm tarball，在 Docker 中全域安裝它，執行非互動式 OpenAI API 金鑰入門導覽，預設設定 Telegram，驗證打包的插件運行時在無需啟動依賴修復的情況下載入，執行 doctor，並針對模擬的 OpenAI 端點執行一次本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 透過 Discord 執行相同的封裝安裝通道。
- `pnpm test:docker:session-runtime-context`
  - 針對嵌入式執行環境語境記錄，執行確定性建置應用程式 Docker smoke 測試。它會驗證隱藏的 OpenClaw 執行環境語境被保存為非顯示的自訂訊息，而不是洩漏到可見的使用者回合中，然後植入受影響的損壞工作階段 JSONL 並驗證 `openclaw doctor --fix` 是否將其重寫到具有備份的目前分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安裝 OpenClaw 套件候選版本，執行已安裝套件的入門導覽，透過已安裝的 CLI 設定 Telegram，然後重用即時 Telegram QA 流程，並將該已安裝套件作為 SUT Gateway。
  - 此包裝器僅掛載來自簽出項目的 `qa-lab` 駕馭程式原始碼；已安裝的套件擁有 `dist`、`openclaw/plugin-sdk` 和打包的外掛程式執行環境，因此該通道不會將目前簽出的外掛程式混入受測套件中。
  - 預設為 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；設定 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以測試已解析的本機 tarball，而不是從登錄檔安裝。
  - 使用與 `pnpm openclaw qa telegram` 相同的 Telegram 環境認證或 Convex 認證來源。針對 CI/發佈自動化，請設定 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 以及 `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密鑰。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密鑰，Docker 包裝器會自動選擇 Convex。
  - 包裝器會在 Docker 建置/安裝工作之前，驗證主機上的 Telegram 或 Convex 認證環境。僅在刻意調試認證前設定時設定 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 會僅針對此通道覆寫共用的 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 將此通道公開為手動維護者工作流程 `NPM Telegram Beta E2E`。它不會在合併時執行。該工作流程使用 `qa-live-shared` 環境和 Convex CI 認證租用。
- GitHub Actions 也公開了 `Package Acceptance`，以便針對單一候選套件進行側載產品驗證。它接受一個受信任的 ref、已發布的 npm spec、HTTPS tarball URL 加上 SHA-256，或來自另一個執行的 tarball 成品，將標準化的 `openclaw-current.tgz` 上傳為 `package-under-test`，然後使用 smoke、package、product、full 或 custom lane 配置檔執行現有的 Docker E2E 排程器。設定 `telegram_mode=mock-openai` 或 `live-frontier`，以針對相同的 `package-under-test` 成品執行 Telegram QA 工作流程。
  - 最新的 beta 產品驗證：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 精確 tarball URL 驗證需要摘要：

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

- `pnpm test:docker:plugins`
  - 將目前的 OpenClaw 建置打包並在 Docker 中安裝，以設定好的 OpenAI 啟動 Gateway，然後透過配置編輯啟用隨附的通道/外掛。
  - 驗證設定探索會保留未設定的可下載外掛為缺失狀態，第一次設定的 doctor 修復會明確安裝每個缺失的可下載外掛，且第二次重新啟動不會執行隱藏的相依性修復。
  - 也會安裝一個已知的舊版 npm 基準，在執行 `openclaw update --tag <candidate>` 之前啟用 Telegram，並驗證候選套件的更新後 doctor 能夠在不進行 harness 端 postinstall 修復的情況下，清理舊版外掛程式相依性的殘留。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 客體環境中執行原生封裝安裝的更新冒煙測試。每個選定的平台會先安裝要求的基準套件，然後在同一個客體中執行已安裝的 `openclaw update` 指令，並驗證已安裝的版本、更新狀態、Gateway 就緒狀態以及一個本地代理程式回合。
  - 在針對單一客體進行反覆運算時，請使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 取得摘要成品路徑和各 lane 的狀態。
  - OpenAI lane 預設使用 `openai/gpt-5.5` 進行即時代理程式回合驗證。當刻意驗證其他 OpenAI 模型時，請傳遞 `--model <provider/model>` 或設定 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將耗時的本地執行包裝在主機逾時中，以免 Parallels 傳輸停滯佔用其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 該腳本會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀的 lane 日誌。在假設外層包裝程式已當機之前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能會在冷啟動的客體機上花費 10 到 15 分鐘進行更新後診斷和套件更新；只要巢狀 npm 除錯日誌持續推進，這仍然屬於正常狀態。
  - 請勿將此彙整包裝程式與個別的 Parallels macOS、Windows 或 Linux 煙霧測試通道並行執行。它們共用 VM 狀態，可能會在還原快照、提供套件或客體機 gateway 狀態時發生衝突。
  - 更新後驗證會執行正常的打包外掛介面，因為語音、影像生成和媒體理解等功能外觀是透過打包執行時期 API 載入的，即使 agent 輪次本身僅檢查簡單的文字回應。

- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，以進行直接協定的煙霧測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA lane。僅限原始碼簽出 —— 封裝安裝版本不會附帶 `qa-lab`。
  - 完整的 CLI、設定檔/場景目錄、環境變數以及產出配置：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用環境變數中的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 聊天室的數字 ID。
  - 支援 `--credential-source convex` 以使用共用的集區認證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 預設值涵蓋 canary、提及閘控、命令定址、`/status`、Bot 對 Bot 的提及回覆，以及核心原生命令回覆。`mock-openai` 預設值也涵蓋決定性回覆鏈和 Telegram 最終訊息串流回歸測試。對於選用的探測（例如 `session_status`），請使用 `--list-scenarios`。
  - 當任何場景失敗時，會以非零狀態碼結束。當您希望產出產出物而不包含失敗的結束狀態碼時，請使用 `--allow-failures`。
  - 需要在同一個私密群組中有兩個不同的 bot，且 SUT bot 暴露 Telegram 使用者名稱。
  - 為了進行穩定的 Bot 對 Bot 觀測，請在兩個 Bot 的 `@BotFather` 中啟用 Bot 對 Bot 通訊模式，並確保驅動程式 Bot 能觀測到群組 Bot 的流量。
  - 會在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀測訊息產出物。回覆場景包含從驅動程式發送請求到觀測到 SUT 回覆的 RTT。

`Mantis Telegram Live` 是此管道的 PR 證據包裝器。它使用 Convex 租用的 Telegram 憑證執行候選 ref，在 Crabbox 桌面瀏覽器中渲染經過編修的觀測訊息逐字稿，錄製 MP4 證據，生成動態修剪的 GIF，上傳產出物組合，並在設定 `pr_number` 時透過 Mantis GitHub App 發布內嵌 PR 證據。維護者可以透過 `Mantis Scenario` (`scenario_id:
telegram-live`) 從 Actions UI 啟動它，或直接從 PR 評論啟動：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用於 PR 視覺證明的 Agentic 原生 Telegram Desktop 前/後對比包裝器。您可以從 Actions UI 使用自由格式的 `instructions` 啟動它、透過 `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`) 啟動，或從 PR 評論啟動：

```text
@openclaw-mantis telegram desktop proof
```

Mantis 代理讀取 PR，決定哪些 Telegram 可見行為可以證明變更，在基準和候選 refs 上執行真實使用者 Crabbox Telegram Desktop 證明通道，反覆迭代直到原生 GIF 有用，寫入成對的 `motionPreview` manifest，並在設定 `pr_number` 時透過 Mantis GitHub App 發布相同的 2 欄 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重用 Crabbox Linux 桌面，安裝原生 Telegram Desktop，使用租用的 Telegram SUT bot token 配置 OpenClaw，啟動 gateway，並從可見的 VNC 桌面錄製螢幕截圖/MP4 證據。
  - 預設為 `--credential-source convex`，因此工作流程只需要 Convex broker secret。使用 `--credential-source env` 並搭配與 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 變數。
  - Telegram Desktop 仍然需要使用者登入/設定檔。Bot token 僅配置 OpenClaw。使用 `--telegram-profile-archive-env <name>` 來指定 base64 `.tgz` 設定檔壓縮檔，或是使用 `--keep-lease` 並透過 VNC 手動登入一次。
  - 在輸出目錄下寫入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

即時傳輸通道共用一個標準合約，以免新傳輸方式出現差異；各通道覆蓋率矩陣位於 [QA 概觀 → 即時傳輸覆蓋率](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是廣泛的綜合套件，不屬於該矩陣的一部分。

### 透過 Convex 共用 Telegram 憑證 (v1)

當為即時傳輸 QA 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從 Convex 支援的集區中取得獨佔租約，在通道執行期間對該租約發送心跳，並在關閉時釋放租約。此章節名稱早於 Discord、Slack 和 WhatsApp 支援；租約合約在各種類型間共用。

參考 Convex 專案架構：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個 secret：
  - `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 憑證角色選擇：
  - CLI： `--credential-role maintainer|ci`
  - Env 預設值： `OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

可選環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的追蹤 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許在僅限本機的開發中使用回送 `http://` Convex URL。

在正常操作中，`OPENCLAW_QA_CONVEX_SITE_URL` 應該使用 `https://`。

維護者管理指令 (pool add/remove/list) 特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時運行之前使用 `doctor` 來檢查 Convex 網站 URL、代理程式密鑰、
端點前綴、HTTP 逾時以及管理員/清單的連線性，而不會列印
機密值。在腳本和 CI
公用程式中，使用 `--json` 以取得機器可讀的輸出。

預設端點合約 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 請求： `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功： `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗盡/可重試： `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 請求： `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功： `{ status: "ok", index, data }`
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
  - 活躍租約防護： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（僅限維護者密鑰）
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字形式的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的格式，並拒絕格式錯誤的內容。

Telegram 真實使用者類型的 Payload 結構：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必須是數字字串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必須是 SHA-256 十六進位字串。
- `kind: "telegram-user"` 是保留給 Mantis Telegram Desktop proof workflow 使用的。通用 QA Lab 通道不得佔用它。

經 Broker 驗證的多通道內容：

- Discord：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 通道也可以從池中租用，但 Slack 內容驗證目前位於 Slack QA runner 而非 broker 中。請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }` 來處理 Slack 資料列。

### 新增通道至 QA

新增通道配接器的架構和場景輔助名稱位於 [QA 概觀 → 新增通道](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共用的 `qa-lab` 主機接縫上實作傳輸 runner，在插件清單中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下編寫場景。

## 測試套件（在何處執行什麼）

可以將這些套件視為「真實性遞增」（以及不穩定性/成本遞增）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：未指定的執行會使用 `vitest.full-*.config.ts` 分片集，並可能將多專案分片擴展為每個專案的設定以進行平行排程
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清單；UI 單元測試在專用的 `unit-ui` 分片中執行
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway 驗證、路由、工具、解析、設定）
  - 針對已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
  - Resolver 和 public-surface loader 測試必須使用生成的微型 plugin fixtures 來證明廣泛的 `api.js` 和
    `runtime-api.js` 退路行為，而不是使用真實打包的 plugin 來源 API。真實的 plugin API 載入屬於 plugin 所有的 contract/integration 測試套件。

原生相依性政策：

- 預設測試安裝會跳過可選的原生 Discord opus 建置。Discord 語音接收使用純 JS 的 `opusscript` 解碼器，並且 `@discordjs/opus` 在 `allowBuilds` 中保持停用，因此本地測試和 Testbox 通道不會編譯原生附加元件。
- 如果您有意比較原生 opus 建置，請使用專用的 Discord 語音效能或即時通道。不要在預設的 `allowBuilds` 中將 `@discordjs/opus` 設為 `true`；那會讓不相關的安裝/測試迴路編譯原生程式碼。

<AccordionGroup>
  <Accordion title="專案、分片與範圍通道">

    - 未指定目標的 `pnpm test` 會執行 12 個較小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是單一巨大的原生根專案程序。這能降低高負載機器上的峰值 RSS，並避免自動回覆/擴充功能工作導致不相關套件飢餓。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監看迴圈並不實際。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會優先透過範圍通道路由明確的檔案/目錄目標，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
    - `pnpm test:changed` 預設會將變更的 git 路徑擴展為低成本的範圍通道：直接的測試編輯、同層 `*.test.ts` 檔案、明確的來源對應，以及本地匯入相依項。除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否則配置/安裝/套件編輯不會廣泛執行測試。
    - `pnpm check:changed` 是窄幅工作的正常智慧本機檢查閘道。它會將差異分類為核心、核心測試、擴充功能、擴充功能測試、應用程式、文件、發行中繼資料、Live Docker 工具，以及工具，然後執行相符的型別檢查、Lint 和 Guard 指令。它不會執行 Vitest 測試；請呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 以取得測試證明。僅包含發行中繼資料的版本遞增會執行目標版本/配置/根相依項檢查，並搭配一個會拒絕頂層版本欄位以外套件變更的 Guard。
    - Live Docker ACP 線具編輯會執行專注的檢查：Live Docker 驗證腳本的 Shell 語法與 Live Docker 排程器試執行。`package.json` 變更僅在差異限縮於 `scripts["test:docker:live-*"]` 時才會包含；相依項、匯出、版本與其他套件表層編輯仍會使用更廣泛的 Guard。
    - 來自 Agents、指令、外掛、自動回覆輔助程式、`plugin-sdk` 及類似純公用工具區域的低匯入單元測試，會透過 `unit-fast` 通道路由，這會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時繁重的檔案會保留在現有通道上。
    - 選定的 `plugin-sdk` 與 `commands` 輔助程式來源檔案也會將變更模式執行對應至那些輕量通道中的明確同層測試，因此輔助程式編輯可避免為該目錄重新執行完整的繁重套件。
    - `auto-reply` 具有頂層核心輔助程式、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹的專用貯體。CI 會進一步將回覆子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片，因此單一高匯入貯體不會佔用完整的 Node 尾部。
    - 一般的 PR/main CI 會刻意跳過擴充功能批次掃描和僅發行版 `agentic-plugins` 分片。完整發行驗證會針對發行候選版本上那些外掛/擴充功能繁重的套件，分派獨立的 `Plugin Prerelease` 子工作流程。

  </Accordion>

  <Accordion title="嵌入式運行器覆蓋率">

    - 當您變更 message-tool discovery 輸入或 compaction runtime
      context 時，請保持這兩個層級的覆蓋率。
    - 針對純路由和正規化邊界，加入專注的 helper 回歸測試。
    - 請保持嵌入式運行器整合套件的健康：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 這些套件驗證了 scoped ids 與 compaction 行為仍能正確通過實際的
      `run.ts` / `compact.ts` 路徑；僅有 helper 測試
      不足以取代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool 與隔離預設值">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共用的 Vitest 設定固定了 `isolate: false`，並在根專案、e2e 與 live
      設定之間使用非隔離運行器。
    - 根 UI lane 保留其 `jsdom` 設定與優化器，但也會在
      共用的非隔離運行器上執行。
    - 每個 `pnpm test` shard 都會繼承共用 Vitest 設定中相同的
      `threads` + `isolate: false` 預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node
      程序加入 `--no-maglev`，以減少大型本機執行時的 V8 編譯消耗。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 即可與原版 V8
      行為進行比較。

  </Accordion>

  <Accordion title="快速本地反覆運算">

    - `pnpm changed:lanes` 顯示 diff 觸發了哪些架構通道。
    - Pre-commit hook 僅執行格式化。它會重新暫存格式化後的檔案，
      且不執行 lint、typecheck 或測試。
    - 當您需要智慧本地檢查閘道時，請在交付或推送前明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設透過廉價的範圍通道路由。僅當 agent
      決定對 harness、config、package 或 contract 的編輯確實需要更廣泛的
      Vitest 覆蓋率時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由
      行為，只是具有更高的 worker 上限。
    - 本地 worker 自動擴展故意採取保守策略，並在主機負載平均值已經很高時退讓，
      因此多個並發的 Vitest 執行預設造成的影響較小。
    - 基礎 Vitest 設定將專案/設定檔標記為
      `forceRerunTriggers`，以便當測試
      接線變更時，變更模式下的重新執行保持正確。
    - 該設定在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；
      如果您需要一個明確的快取位置用於直接效能分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="效能調試">

    - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及
      匯入細項輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析視角限定於
      自 `origin/main` 以來變更的檔案。
    - 分片計時資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整設定檔執行使用設定檔路徑作為鍵值；包含模式 CI
      分片會附加分片名稱，以便獨立追蹤已過濾的分片。
    - 當某個熱門測試仍將大部分時間花費在啟動匯入時，
      請將繁重的相依性限制在狹隘的區域 `*.runtime.ts` 縫隙之後，並
      直接模擬該縫隙，而不是深度匯入執行時期輔助函式僅
      為了將其傳遞給 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由後的
      `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印執行時間以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過將變更檔案列表路由至
      `scripts/test-projects.mjs` 和根 Vitest 設定，對當前的髒樹進行基準測試。
    - `pnpm test:perf:profile:main` 為
      Vitest/Vite 啟動和轉換開銷寫入主執行緒 CPU 分析檔。
    - `pnpm test:perf:profile:runner` 為
      已停用檔案並行處理的單元套件寫入執行器 CPU 與堆積分析檔。

  </Accordion>
</AccordionGroup>

### 穩定性

- 指令：`pnpm test:stability:gateway`
- 設定：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 預設啟用診斷功能，啟動真實的迴路閘道
  - 透過診斷事件路徑驅動合成閘道訊息、記憶體和大型承載變動
  - 透過閘道 WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持久化輔助函式
  - 斷言記錄器保持有界、合成 RSS 樣本保持在壓力預算內，且每個會話的佇列深度會排空回零
- 預期：
  - CI 安全且無需金鑰
  - 穩定性回歸追蹤的狹窄通道，而非完整閘道套件的替代方案

### E2E

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與儲存庫其他部分一致。
  - 使用自適應 Workers（CI：最多 2 個，本機：預設 1 個）。
  - 預設以靜默模式執行以減少 Console I/O 開銷。
- 有用的覆寫選項：
  - 使用 `OPENCLAW_E2E_WORKERS=<n>` 強制指定 Worker 數量（上限為 16）。
  - 使用 `OPENCLAW_E2E_VERBOSE=1` 重新啟用詳細的 Console 輸出。
- 範圍：
  - 多實例 Gateway 端到端行為
  - WebSocket/HTTP 介面、節點配對以及較重的網路操作
- 預期：
  - 在 CI 中執行（當在 Pipeline 中啟用時）
  - 不需要真實的金鑰
  - 比單元測試有更多變動部分（可能較慢）

### E2E：OpenShell 後端冒煙測試

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個獨立的 OpenShell Gateway
  - 從暫存的本地 Dockerfile 建立一個沙箱
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙箱 fs 橋接驗證遠端標準檔案系統行為
- 預期：
  - 僅供選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker 守護程序
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，接著銷毀測試 Gateway 和沙箱
- 有用的覆寫選項：
  - 使用 `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用此測試
  - 使用 `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 執行檔或包裝腳本

### Live (真實 Provider + 真實模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此 Provider/模型是否真的在 _今天_ 能透過真實憑證運作？」
  - 捕捉 Provider 格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期事項：
  - 設計上無法在 CI 中保持穩定（真實網路、真實的供應商政策、配額、服務中斷）
  - 需要花費金錢 / 使用速率限制
  - 建議執行縮小範圍的子集，而非「所有」測試
- Live 執行會使用已匯出的 API 金鑰和暫存的認證設定檔。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將設定檔/認證資料複製到暫存測試目錄中，以免單元測試的固定裝置變更您的真實 `~/.openclaw`。
- 僅當您刻意需要 Live 測試使用您的真實家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 預設為較安靜的模式：它會保留 `[live] ...` 的進度輸出並靜音 gateway 啟動日誌/Bonjour 聊天訊息。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替（特定供應商）：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行個別 Live 覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試組現在會將進度行輸出至 stderr，因此即使 Vitest 控制台擷取很安靜，長時間的供應商呼叫也能顯示其正在運作。
  - `vitest.live.config.ts` 會停用 Vitest 控制台攔截，以便在 Live 執行期間立即串流供應商/gateway 的進度行。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 的心跳。

## 我應該執行哪個測試組？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您變更很多，則執行 `pnpm test:coverage`）
- 涉及 gateway 網路功能 / WS 協定 / 配對：加入 `pnpm test:e2e`
- 除錯「我的機器人掛了」/ 特定供應商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live（涉及網路）測試

關於即時模型矩陣、CLI 後端冒煙測試、ACP 冒煙測試、Codex app-server 測試線束，以及所有媒體供應商即時測試（Deepgram、BytePlus、ComfyUI、影像、音樂、影片、media harness）——加上即時運行的憑證處理——請參閱[測試即時套件](/zh-Hant/help/testing-live)。關於專用的更新與插件驗證檢查清單，請參閱[測試更新與插件](/zh-Hant/help/testing-updates-plugins)。

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩大類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在存放庫 Docker 映像檔內執行其對應的 profile-key 即時檔案（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），並掛載您的本機設定目錄、工作區和可選的 profile 環境檔。對應的本機進入點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設為較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確需要較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 Live Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，接著建置/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅包含用於 install/update/plugin-dependency lanes 的 Node/Git runner；這些 lanes 會掛載預建的 tarball。Functional 映像檔則將相同的 tarball 安裝至 `/app`，以用於 built-app functionality lanes。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 會執行選定的計畫。Aggregate 使用加權本地排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制處理程序槽位，而資源上限則防止繁重的 live、npm-install 和 multi-service lanes 同時啟動。如果單一 lane 的負載高於啟用的上限，排程器仍可在集區空閒時啟動它，並讓其單獨執行直到容量再次可用。預設值為 10 個槽位、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。Runner 預設會執行 Docker preflight，移除過時的 OpenClaw E2E 容器，每 30 秒列印一次狀態，將成功的 lane 執行時間儲存在 `.artifacts/docker-tests/lane-timings.json` 中，並在後續執行中使用這些時間優先啟動較長的 lanes。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 來列印加權 lane 清單而不建置或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 來列印所選 lanes、套件/映像檔需求及憑證的 CI 計畫。
- `Package Acceptance` 是 GitHub 原生的套件檢查閘道，用於驗證「此可安裝 tarball 是否能作為產品正常運作？」。它從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該特定 tarball 執行可重複使用的 Docker E2E 通道，而不是重新打包所選的引用。Profiles 按廣度排序：`smoke`、`package`、`product` 和 `full`。請參閱 [測試更新與外掛](/zh-Hant/help/testing-updates-plugins) 以了解套件/更新/外掛合約、已發佈升級相容性矩陣、發佈預設值以及故障分診。
- 建置和發佈檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。此防護機制會遍歷來自 `dist/entry.js` 和 `dist/cli/run-main.js` 的靜態建置圖，若在命令分發之前的啟動階段匯入了套件相依性（例如 Commander、提示 UI、undici 或 logging），則會失敗；它還能確保打包後的 gateway 執行區塊保持在預算範圍內，並拒絕對已知冷啟 gateway 路徑的靜態匯入。打包後的 CLI 煙霧測試也涵蓋了根目錄說明、onboard 說明、doctor 說明、status、config 結構描述以及 model-list 命令。
- 套件驗收 的舊版相容性上限為 `2026.4.25`（含 `2026.4.25-beta.*`）。在此截止版本之前，測試架構僅容許已發佈套件的詮釋資料缺口：省略的私有 QA 清單項目、遺失的 `gateway install --wrapper`、從 tarball 衍生的 git fixture 中遺失的修補檔案、遺失的已持久化 `update.channel`、舊版外掛安裝記錄位置、遺失的 marketplace 安裝記錄持久化，以及 `plugins update` 期間的設定詮釋資料移轉。對於 `2026.4.25` 之後的套件，這些路徑將被視為嚴重失敗。
- Container smoke runners：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 會啟動一個或多個真實容器，並驗證更高層級的整合路徑。

Live-model Docker runner 也只會 bind-mount 所需的 CLI auth homes（如果執行範圍未縮小，則會包含所有支援的 homes），然後在執行前將它們複製到容器 home 中，以便 external-CLI OAuth 可以刷新 token 而不修改 host auth store：

- Direct models：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`；預設覆蓋 Claude、Codex 和 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 嚴格覆蓋 Droid/OpenCode）
- CLI backend smoke：`pnpm test:docker:live-cli-backend`（腳本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（腳本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Observability smoke：`pnpm qa:otel:smoke` 是一個私有 QA source-checkout lane。它故意不包含在 package Docker release lanes 中，因為 npm tarball 省略了 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding wizard（TTY、full scaffolding）：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball 入門/頻道/代理 煙霧測試：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全域安裝打包好的 OpenClaw tarball，透過 env-ref 入門預設配置 OpenAI 和 Telegram，執行 doctor，並執行一次模擬的 OpenAI 代理輪次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建構的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切換頻道。

- 發布用戶旅程 煙霧測試：`pnpm test:docker:release-user-journey` 在乾淨的 Docker home 中全域安裝打包好的 OpenClaw tarball，執行入門，配置模擬的 OpenAI 提供者，執行代理輪次，安裝/解除安裝外部外掛，針對本地 fixture 配置 ClickClack，驗證出站/入站訊息，重啟 Gateway，並執行 doctor。
- 發布類型入門 煙霧測試：`pnpm test:docker:release-typed-onboarding` 安裝打包好的 tarball，透過真實的 TTY 驅動 `openclaw onboard`，將 OpenAI 配置為 env-ref 提供者，驗證無原始金鑰持久化，並執行模擬代理輪次。
- 發布媒體/記憶體 煙霧測試：`pnpm test:docker:release-media-memory` 安裝打包好的 tarball，驗證來自 PNG 附件的圖片理解、OpenAI 相容的圖片生成輸出、記憶體搜索召回，以及 Gateway 重啟後的召回留存。
- 發布升級用戶旅程 煙霧測試：`pnpm test:docker:release-upgrade-user-journey` 預設安裝 `openclaw@latest`，在已發布的套件上配置提供者/外掛/ClickClack 狀態，升級到候選 tarball，然後重新執行核心代理/外掛/頻道旅程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆寫基線。
- 發布外掛市集 煙霧測試：`pnpm test:docker:release-plugin-marketplace` 從本地 fixture 市集安裝，更新已安裝的外掛，解除安裝它，並驗證外掛 CLI 隨安裝元數據被清除而消失。
- Skill install smoke: `pnpm test:docker:skill-install` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，在配置中停用上傳的歸檔安裝，從搜尋中解析當前實際的 ClawHub skill slug，使用 `openclaw skills install` 安裝它，並驗證已安裝的 skill 以及 `.clawhub` origin/lock 中繼資料。
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證更新後持續存在的 channel 和 plugin 運作正常，然後切換回 package `stable` 並檢查更新狀態。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` 會在包含 agents、channel 配置、plugin 許可清單、過時 plugin 依賴狀態以及現有 workspace/session 檔案的骯髒舊用戶 fixture 上安裝打包好的 OpenClaw tarball。它會在沒有實際 provider 或 channel 金鑰的情況下執行 package 更新以及非互動式 doctor，然後啟動 loopback Gateway 並檢查配置/狀態的保留以及啟動/狀態預算。
- Published upgrade survivor smoke: `pnpm test:docker:published-upgrade-survivor` 預設安裝 `openclaw@latest`，植入真實的既有使用者檔案，使用內建的指令配方設定該基準，驗證產生的設定，將該已發布的安裝更新為候選 tarball，以非互動模式執行 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動迴路 Gateway 並檢查已設定的 intents、狀態保留、啟動、`/healthz`、`/readyz` 和 RPC 狀態預算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆蓋其中一個基準，要求彙總排程器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）來擴充精確的本地基準，並使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）來擴充 issue-shaped fixtures；回報的 issues 集合包含 `configured-plugin-installs`，用於自動修復外部 OpenClaw 外掛安裝。Package Acceptance 將這些公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基準 token（例如 `last-stable-4` 或 `all-since-2026.4.23`），而 Full Release Validation 則將 release-soak 套件閘門擴充為 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- Session runtime context smoke: `pnpm test:docker:session-runtime-context` 驗證隱藏的執行時期內容紀錄持久性，以及 doctor 對受影響的重複提示重寫分支的修復。
- Bun global install smoke: `bash scripts/e2e/bun-global-install-smoke.sh` 將當前樹狀結構打包，在獨立的 home 目錄中使用 `bun install -g` 安裝它，並驗證 `openclaw infer image providers --json` 回傳打包的映像提供者而不是卡住。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建置，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從已建置的 Docker 映像複製 `dist/`。
- 安裝程式 Docker smoke 測試：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共享一個 npm 快取。Update smoke 預設以 npm `latest` 作為升級至候選 tarball 之前的穩定基準。在本機使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆蓋，或在 GitHub 上使用 Install Smoke workflow 的 `update_baseline_version` 輸入來覆蓋。非 root 安裝程式檢查會保持獨立的 npm 快取，因此 root 擁有的快取條目不會掩蓋使用者本機的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以便在本機重新執行時重複使用 root/update/direct-npm 快取。
- Install Smoke CI 會使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要直接的 `npm install -g` 覆蓋率時，請在沒有該環境變數的情況下於本機執行腳本。
- Agents delete shared workspace CLI smoke 測試：`pnpm test:docker:agents-delete-shared-workspace` (腳本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設會建構 root Dockerfile 映像檔，在獨立的容器主目錄中用一個工作區設定兩個代理程式，執行 `agents delete --json`，並驗證有效的 JSON 以及保留的工作區行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重複使用 install-smoke 映像檔。
- Gateway 網路功能 (兩個容器，WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- 瀏覽器 CDP 快照 smoke 測試：`pnpm test:docker:browser-cdp-snapshot` (腳本：`scripts/e2e/browser-cdp-snapshot-docker.sh`) 會建構來源 E2E 映像檔以及 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP 角色快照是否涵蓋連結 URL、游標提升的可點擊元素、iframe 參照和框架元資料。
- OpenAI Responses web_search 最小推理回歸測試：`pnpm test:docker:openai-web-search-minimal` (腳本：`scripts/e2e/openai-web-search-minimal-docker.sh`) 透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制提供者架構拒絕並檢查原始細節是否出現在 Gateway 日誌中。
- MCP 通道橋接器（已植入的 Gateway + stdio 橋接器 + 原始 Claude 通知框架冒煙測試）：`pnpm test:docker:mcp-channels` (腳本：`scripts/e2e/mcp-channels-docker.sh`)
- Pi 捆綁 MCP 工具（真實的 stdio MCP 伺服器 + 嵌入式 Pi 設定檔允許/拒絕冒煙測試）：`pnpm test:docker:pi-bundle-mcp-tools` (腳本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/子代理 MCP 清理（真實 Gateway + 在隔離的 cron 和一次性子代理執行後的 stdio MCP 子程序拆除）：`pnpm test:docker:cron-mcp-cleanup` (腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 外掛程式（本地路徑、`file:`、具有提升依賴項的 npm 註冊表、格式錯誤的 npm 套件元資料、git 移動引用、ClawHub 萬能測試、市場更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試）：`pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆寫預設的萬能測試套件/執行環境對。如果沒有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，測試會使用封閉的本地 ClawHub fixture 伺服器。
- 外掛程式更新未變更冒煙測試：`pnpm test:docker:plugin-update` (腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`)
- 外掛程式生命週期矩陣冒煙測試：`pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安裝打包的 OpenClaw tarball，安裝 npm 外掛程式，切換啟用/停用，透過本地 npm 註冊表升級和降級它，刪除已安裝的程式碼，然後驗證解除安裝仍然會移除過時狀態，同時記錄每個生命週期階段的 RSS/CPU 指標。
- 設定重新載入元資料冒煙測試：`pnpm test:docker:config-reload` (腳本：`scripts/e2e/config-reload-source-docker.sh`)
- 外掛程式：`pnpm test:docker:plugins` 涵蓋本地路徑、`file:`、具有提升依賴項的 npm 註冊表、git 移動引用、ClawHub fixtures、市場更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試。`pnpm test:docker:plugin-update` 涵蓋已安裝外掛程式的未變更新行為。`pnpm test:docker:plugin-lifecycle-matrix` 涵蓋資源追蹤的 npm 外掛程式安裝、啟用、停用、升級、降級和缺少程式碼的解除安裝。

若要手動預建並重複使用共享的 functional 映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

設定後，Suite 特定的映像檔覆寫（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）仍然優先。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共享映像檔時，如果該映像檔尚未在本機，腳本會將其拉取下來。QR 和安裝程式 Docker 測試保留它們自己的 Dockerfile，因為它們驗證的是套件/安裝行為，而不是共享的 built-app 執行環境。

live-model Docker 執行器也會將目前的 checkout 以唯讀方式 bind-mount，並將其暫存至容器內的臨時工作目錄。這使執行階段映像檔保持精簡，同時仍能針對您的確切本機來源/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，以免 Docker live 執行花費數分鐘複製機器特定的構件。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，這樣 gateway live 探測就不會在容器內啟動真正的 Telegram/Discord/等頻道 worker。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或從該 Docker 通道排除 gateway live 涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是一個較高層級的相容性冒煙測試：它會啟動一個啟用了 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理程式傳送真實的聊天請求。針對應在 Open WebUI 登入和模型探索後停止，而無需等待 live model 完成的發行路徑 CI 檢查，請設定 `OPENWEBUI_SMOKE_MODE=models`。第一次執行可能會明顯較慢，因為 Docker 可能需要提取 Open WebUI 映像檔，而且 Open WebUI 可能需要完成其自身的冷啟動設定。此通道期望一個可用的 live model 金鑰。請透過流程環境、暫存的認證設定檔或明確的 `OPENCLAW_PROFILE_FILE` 提供它。成功的執行會列印出一個小型的 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 是刻意確定性的，不需要真正的 Telegram、Discord 或 iMessage 帳號。它會啟動一個帶有種子的 Gateway 容器，啟動第二個生成 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、輸出傳送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此冒煙測試驗證的是橋接器實際發出的內容，而不僅是特定用戶端 SDK 恰好呈現的內容。`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP 探測伺服器，透過內嵌的 Pi bundle MCP 執行階段具體化該伺服器，執行工具，然後驗證 `coding` 和 `messaging` 是否保留 `bundle-mcp` 工具，同時 `minimal` 和 `tools.deny: ["bundle-mcp"]` 則會過濾它們。`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動一個帶有真實 stdio MCP 探測伺服器的帶種子 Gateway，執行隔離的 cron 輪次和 `/subagents spawn`一次性子輪次，然後驗證 MCP 子程序在每次執行後會結束。

手動 ACP 平面語言 thread 煙霧測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於回歸/除錯工作流程。未來可能再次需要它來驗證 ACP thread 路由，因此請勿刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載到 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載到 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 已掛載並在執行測試前 sourced
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以僅驗證從 `OPENCLAW_PROFILE_FILE` sourced 的環境變數，使用暫時的 config/workspace 目錄且無外部 CLI auth 掛載
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設：`~/.cache/openclaw/docker-cli-tools`）掛載到 `/home/node/.npm-global` 以用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI auth 目錄/檔案以唯讀方式掛載到 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮小的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內篩選供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔，用於不需要重新建置的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確認認證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇 gateway 為 Open WebUI 煙霧測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用來覆寫 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用來覆寫固定的 Open WebUI 映像檔標籤

## :文件完整性檢查

:在編輯文件後執行文件檢查：`pnpm check:docs`。
:當您也需要頁面內標題檢查時，請執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線迴歸測試（CI-safe）

這些是沒有真實供應商的「真實管線」迴歸測試：

- 閘道工具呼叫（模擬 OpenAI，真實閘道 + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「透過閘道 agent 迴圈端對端執行模擬 OpenAI 工具呼叫」）
- 閘道精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「透過 WS 執行精靈並寫入驗證權杖設定」）

## Agent 可靠性評估（skills）

我們已經有一些行為類似「agent 可靠性評估」的 CI-safe 測試：

- 透過真實閘道 + agent 迴圈進行模擬工具呼叫（`src/gateway/gateway.test.ts`）。
- 驗證會話連線和設定效果的端對端精靈流程（`src/gateway/gateway.test.ts`）。

關於 skills 仍然缺少的內容（請參閱 [Skills](/zh-Hant/tools/skills))：

- **決策制定：**當提示詞中列出了 skills 時，agent 是否會選擇正確的 skill（或避免不相關的）？
- **合規性：**agent 在使用前是否會讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約：**斷言工具順序、會話歷史傳遞和沙箱邊界的多輪場景。

未來的評估應首先保持確定性：

- 使用模擬供應商來斷言工具呼叫 + 順序、skill 檔案讀取和會話連線的場景執行器。
- 一小套專注於 skill 的場景（使用與避免、閘道控制、提示詞注入）。
- 只有在 CI-safe 套件到位後，才進行選用的即時評估（選擇加入、env-gated）。

## 合約測試（plugin 和 channel 形狀）

合約測試會驗證每個已註冊的外掛程式和通道都符合其介面合約。它們會對所有發現的外掛程式進行迭代，並執行一組結構和行為斷言。預設的 `pnpm test` unit 軌道會刻意跳過這些共享縫合和冒煙測試檔案；當您接觸共享通道或提供者介面時，請明確執行合約指令。

### 指令

- 所有合約： `pnpm test:contracts`
- 僅限通道合約： `pnpm test:contracts:channels`
- 僅限提供者合約： `pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛程式結構（id、名稱、功能）
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息載荷結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理程式
- **threading** - Thread ID 處理
- **directory** - 目錄/名冊 API
- **group-policy** - 群組政策執行

### 提供者狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道狀態探測
- **registry** - 外掛程式註冊表結構

### 提供者合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛程式探索
- **loader** - 外掛程式載入
- **runtime** - 提供者執行時
- **shape** - 外掛程式結構/介面
- **wizard** - 設定精靈

### 何時執行

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改通道或提供者外掛程式之後
- 重構外掛程式註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試（指導原則）

當您修正在 live 中發現的提供者/模型問題時：

- 如果可能，新增一個 CI 安全的回歸測試（模擬/樁提供者，或擷取確切的要求結構轉換）
- 如果本質上僅限 live（速率限制、驗證政策），請保持 live 測試狹隘，並透過環境變數選擇加入
- 優先以能捕捉錯誤的最小層級為目標：
  - 提供者要求轉換/重放錯誤 → 直接 models 測試
  - gateway 會話/歷程/工具管線錯誤 → gateway live smoke 或 CI 安全的 gateway mock 測試
- SecretRef 遍遍防護：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元資料 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別衍生一個採樣目標，然後斷言遍歷區段 (traversal-segment) 執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了新的 `includeInPlan` SecretRef 目標家族，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，以免新類別被無聲略過。

## 相關

- [Testing live](/zh-Hant/help/testing-live)
- [Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)
- [CI](/zh-Hant/ci)
