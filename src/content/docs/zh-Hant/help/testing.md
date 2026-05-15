---
summary: "測試套件：單元/e2e/live 測試組、Docker 執行器，以及各項測試涵蓋的範圍"
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
**QA stack (qa-lab, qa-channel, live transport lanes)** 的說明文件位於另一處：

- [QA 概覽](/zh-Hant/concepts/qa-e2e-automation) - 架構、指令介面、情境撰寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的參考資料。
- [QA 頻道](/zh-Hant/channels/qa-channel) - 由 repo 支援的情境所使用的合成傳輸外掛。

本頁涵蓋了如何執行標準測試組以及 Docker/Parallels 執行器。下方的 QA 專用執行器章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 叫用指令，並指回上述的參考資料。

</Note>

## 快速入門

大部分時候：

- 完整閘道 (預推前執行)：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在效能充足的機器上更快速地執行本地完整測試組：`pnpm test:max`
- 直接使用 Vitest 監看迴圈：`pnpm test:watch`
- 直接指定檔案現在也支援擴充功能/頻道路由：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您在處理單一失敗時，請優先使用目標執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您修改測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 測試組：`pnpm test:e2e`

當對真實提供者/模型進行除錯時（需要真實憑證）：

- Live 測試組 (模型 + gateway 工具/圖像探測)：`pnpm test:live`
- 安靜地針對單一 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 執行時效能報告：發送帶有
  `live_gpt54=true` 的 `OpenClaw Performance` 以取得真實 `openai/gpt-5.4` 代理回合，
  或使用 `deep_profile=true` 取得 Kova CPU/堆疊/追蹤成品。每日排程執行
  會在設定 `CLAWGRIT_REPORTS_TOKEN` 後，將 mock-provider、deep-profile 和 GPT 5.4 通道成品發布至
  `openclaw/clawgrit-reports`。Mock-provider 報告也包含來源層級的 gateway 啟動、記憶體、
  外掛壓力、重複的假模型 hello-loop，以及 CLI 啟動數據。
- Docker live 模型掃描：`pnpm test:docker:live-models`
  - 每個選定的模型現在都會執行一個文本輪次以及一個小型檔案讀取風格的探測。
    其元資料聲稱支援 `image` 輸入的模型也會執行一個微型圖像輪次。
    在隔離提供者故障時，請使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 停用額外的探測。
  - CI 覆蓋範圍：每日 `OpenClaw Scheduled Live And E2E Checks` 和手動
    `OpenClaw Release Checks` 都會呼叫可重複使用的 live/E2E 工作流程，並帶有
    `include_live_suites: true`，其中包括按提供者分割的獨立 Docker live model
    矩陣任務。
  - 若要針對特定的 CI 重新運行，請分派 `OpenClaw Live And E2E Checks (Reusable)`
    並帶有 `include_live_suites: true` 和 `live_models_only: true`。
  - 將新的高訊號提供者機密新增至 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    排程/發布呼叫端。
- 原生 Codex 綁定聊天冒煙測試：`pnpm test:docker:live-codex-bind`
  - 針對 Codex app-server 路徑執行 Docker live 通道，使用 `/codex bind` 綁定綜合
    Slack DM，執行 `/codex fast` 和
    `/codex permissions`，然後驗證純文字回覆和圖像附件
    是透過原生插件綁定而不是 ACP 路由的。
- Codex app-server 線具冒煙測試：`pnpm test:docker:live-codex-harness`
  - 透過插件擁有的 Codex app-server 線具執行 gateway agent 輪次，
    驗證 `/codex status` 和 `/codex models`，並預設執行圖像、
    cron MCP、sub-agent 和 Guardian 探測。在隔離其他 Codex
    app-server 故障時，請使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 停用 sub-agent 探測。若要進行專注的 sub-agent 檢查，請停用其他探測：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非設定了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否則這會在 sub-agent 探測後退出。
- Codex 按需安裝冒煙測試：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安裝打包的 OpenClaw tarball，執行 OpenAI API 金鑰
    入職，並驗證 Codex 插件和 `@openai/codex` 依賴項
    是否已按需下載到受管理的 npm 根目錄中。
- Live plugin 工具依賴項冒煙測試：`pnpm test:docker:live-plugin-tool`
  - 將附帶真實 `slugify` 依賴項的 fixture 插件打包，透過
    `npm-pack:` 安裝，在受管理的 npm 根目錄下驗證該依賴項，然後要求
    即時 OpenAI 模型調用該插件工具並傳回隱藏的 slug。
- Crestodian 救援指令冒煙測試：`pnpm test:live:crestodian-rescue-channel`
  - 針對訊息通道救援指令
    介面的選用雙重保障檢查。它執行 `/crestodian status`，將持久性模型
    變更排入佇列，回覆 `/crestodian yes`，並驗證審計/配置寫入路徑。
- Crestodian 規劃器 Docker 冒煙測試：`pnpm test:docker:crestodian-planner`
  - 在 `PATH` 上的無配置容器中使用假的 Claude CLI 執行 Crestodian
    ，並驗證模糊規劃器後備機制是否轉換為經過審計的類型化
    配置寫入。
- Crestodian 首次執行 Docker 冒煙測試：`pnpm test:docker:crestodian-first-run`
  - 從空的 OpenClaw 狀態目錄開始，將純 `openclaw` 路由至
    Crestodian，應用 setup/model/agent/Discord 插件 + SecretRef 寫入，
    驗證配置，並檢查審計項目。相同的 Ring 0 設定路徑
    也在 QA Lab 中由
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 涵蓋。
- Moonshot/Kimi 成本冒煙測試：設定 `MOONSHOT_API_KEY`，執行
  `openclaw models list --provider moonshot --json`，然後對 `moonshot/kimi-k2.6` 執行獨立的
  `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  。驗證 JSON 報告 Moonshot/K2.6 且
  助理對話記錄儲存了標準化的 `usage.cost`。

<Tip>當您只需要一個失敗的案例時，建議優先使用下述透過允許清單環境變數來縮小即時測試範圍的方法。</Tip>

## QA 專用執行器

當您需要 QA Lab 的真實性時，這些指令位於主要測試套件旁邊：

CI 會在專用的工作流程中執行 QA Lab。代理同等性測試嵌套在 `QA-Lab - All Lanes` 和發布驗證之下，而非獨立的 PR 工作流程。廣泛驗證應使用帶有 `rerun_group=qa-parity` 的 `Full Release Validation` 或 release-checks QA 群組。穩定/預設發布檢查將完整的 live/Docker soak 測試保留在 `run_release_soak=true` 之後；`full` 設定檔則會強制開啟 soak 測試。`QA-Lab - All Lanes` 會在 `main` 上每夜執行，並透過手動觸發，將 mock parity lane、live Matrix lane、Convex 管理的 live Telegram lane 以及 Convex 管理的 live Discord lane 作為並行任務來執行。排程的 QA 和發布檢查會明確傳遞 Matrix `--profile fast`，而 Matrix CLI 和手動工作流程輸入預設保持 `all`；手動觸發可以將 `all` 分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 任務。`OpenClaw Release Checks` 會在發布批准前執行同等性測試以及快速 Matrix 和 Telegram lane，對發布傳輸檢查使用 `mock-openai/gpt-5.5`，以保持其確定性並避免正常的 provider-plugin 啟動。這些 live 傳輸閘道會停用記憶體搜尋；記憶體行為仍由 QA parity 測試套件覆蓋。

完整的發布 live media 分片使用 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，它已經包含 `ffmpeg` 和 `ffprobe`。Docker live model/backend 分片使用共用的 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔，該映像檔會根據選定的 commit 建構一次，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取，而不是在每個分片內部重新建構。

- `pnpm openclaw qa suite`
  - 直接在主機上執行倉庫支援的 QA 情境。
  - 預設會使用獨立的閘道工作程序並行執行多個選定的情境。`qa-channel` 預設並行數為 4（以選定的情境數量為上限）。使用 `--concurrency <count>` 來調整工作程序數量，或使用 `--concurrency 1` 執行較舊的序列 lane。
  - 當任何場景失敗時，以非零代碼退出。當您
    想要產生產出物而不以失敗代碼退出時，請使用 `--allow-failures`。
  - 支援提供者模式 `live-frontier`、`mock-openai` 和 `aimock`。
    `aimock` 啟動一個本地的 AIMock 支援提供者伺服器，用於實驗性
    的 fixture 和 protocol-mock 覆蓋率，而不替換具備場景感知能力的
    `mock-openai` lane。
- `pnpm test:plugins:kitchen-sink-live`
  - 透過 QA Lab 執行即時 OpenAI Kitchen Sink 外掛程式的完整測試。
    它會安裝外部 Kitchen Sink 套件，驗證外掛 SDK 介面
    清單，探測 `/healthz` 和 `/readyz`，記錄 gateway CPU/RSS
    證據，執行即時 OpenAI 回合，並檢查對抗性診斷。
    需要即時 OpenAI 驗證，例如 `OPENAI_API_KEY`。在已啟動的 Testbox
    工作階段中，當存在 `openclaw-testbox-env` helper 時，它會自動
    引入 Testbox live-auth 設定檔。
- `pnpm test:gateway:cpu-scenarios`
  - 執行 gateway 啟動基準測試以及一組小型的模擬 QA Lab 場景套件
    (`channel-chat-baseline`、`memory-failure-fallback`、
    `gateway-restart-inflight-run`)，並在 `.artifacts/gateway-cpu-scenarios/` 下寫入
    綜合 CPU 觀察摘要。
  - 預設僅標記持續的高 CPU 觀察結果 (`--cpu-core-warn`
    加上 `--hot-wall-warn-ms`)，因此短暫的啟動峰值會被記錄為指標
    而不會看起來像持續數分鐘的 gateway 掛起回歸。
  - 使用已建構的 `dist` 產出物；當簽出尚未具有最新的執行時輸出時，
    請先執行建構。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 內執行相同的 QA 套件。
  - 在主機上保持與 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - 即時執行會轉送對客端實用的支援 QA 驗證輸入：
    基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及
    現有的 `CODEX_HOME`。
  - 輸出目錄必須保持在 repo 根目錄下，以便 guest 可以透過
    掛載的寫入工作區回傳資料。
  - 將標準 QA 報告 + 摘要以及 Multipass 日誌寫入
    `.artifacts/qa-e2e/...` 下。
- `pnpm qa:lab:up`
  - 啟動支援 Docker 的 QA 站台，用於操作員式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從當前 checkout 建構 npm tarball，在 Docker 中全域安裝它，執行非互動式 OpenAI API 金鑰入門導覽，預設設定 Telegram，驗證打包的插件運行時在無需啟動依賴修復的情況下載入，執行 doctor，並針對模擬的 OpenAI 端點執行一次本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 透過 Discord 執行相同的打包安裝
    流程。
- `pnpm test:docker:session-runtime-context`
  - 針對嵌入式運行時語境記錄執行確定性建構應用程式 Docker 測試。它驗證隱藏的 OpenClaw 運行時語境被持久化為非顯示的自訂訊息，而不是洩漏到可見的使用者回合中，然後植入受影響的損壞會話 JSONL 並驗證
    `openclaw doctor --fix` 將其備份後重寫到活動分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安裝 OpenClaw 套件候選版本，執行已安裝套件的入門導覽，透過已安裝的 CLI 設定 Telegram，然後重用即時 Telegram QA 流程，並將該已安裝套件作為 SUT Gateway。
  - 包裝器僅從 checkout 掛載 `qa-lab` 測試工具來源；已安裝的套件擁有 `dist`、`openclaw/plugin-sdk` 和捆綁的插件
    運行時，因此該流程不會將當前 checkout 的插件混入受測
    套件中。
  - 預設為 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；設定
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ` 以測試已解析的本地 tarball，而不是從註冊表安裝。
  - 使用與 `pnpm openclaw qa telegram` 相同的 Telegram 環境憑證或 Convex 憑證來源。對於 CI/發行自動化，請設定
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色金鑰。如果
    `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色金鑰存在於 CI 中，
    Docker 包裝器會自動選擇 Convex。
  - 在 Docker 建置或安裝工作之前，包裝器會驗證主機上的 Telegram 或 Convex 憑證環境變數。僅當刻意偵錯憑證前設定時，才設定 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 會僅針對此通道覆寫共享的 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 將此通道公開為手動維護者工作流程 `NPM Telegram Beta E2E`。它不會在合併時執行。此工作流程使用 `qa-live-shared` 環境與 Convex CI 憑證租用。
- GitHub Actions 也公開了 `Package Acceptance`，用於針對單一候選套件進行側載產品驗證。它接受受信任的 ref、已發布的 npm 規格、HTTPS tarball URL 加上 SHA-256，或是來自其他執行的 tarball 成品，上傳正規化的 `openclaw-current.tgz` 為 `package-under-test`，然後使用 smoke、package、product、full 或 custom 通道設定檔執行現有的 Docker E2E 排程器。設定 `telegram_mode=mock-openai` 或 `live-frontier` 以針對相同的 `package-under-test` 成品執行 Telegram QA 工作流程。
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
  - 同時會安裝一個已知較舊的 npm 基準，在執行 `openclaw update --tag <candidate>` 之前啟用 Telegram，並驗證候選版本的更新後 doctor 能夠清除舊版外掛相依性殘留，而無需 harness 端的 postinstall 修復。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels 虛擬機執行原生套件安裝更新冒煙測試。每個選定的平台會先安裝要求的基準套件，然後在同一台虛擬機中執行已安裝的 `openclaw update` 指令，並驗證已安裝的版本、更新狀態、Gateway 準備情況以及一次本機 agent 交談。
  - 在對單一客體機進行反覆迭代時，請使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 來取得摘要構件路徑與各通道的狀態。
  - OpenAI 通道預設使用 `openai/gpt-5.5` 作為即時 agent 輪次驗證。當刻意驗證其他 OpenAI 模型時，請傳入 `--model <provider/model>` 或設定 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將耗時的本地執行包裝在主機逾時中，以免 Parallels 傳輸停滯佔用其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 該指令碼會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀通道日誌。在假設外層包裝程式已停滯前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能會在冷啟動的客體機上花費 10 到 15 分鐘進行更新後診斷和套件更新；只要巢狀 npm 除錯日誌持續推進，這仍然屬於正常狀態。
  - 請勿將此彙整包裝程式與個別的 Parallels macOS、Windows 或 Linux 煙霧測試通道並行執行。它們共用 VM 狀態，可能會在還原快照、提供套件或客體機 gateway 狀態時發生衝突。
  - 更新後驗證會執行正常的打包外掛介面，因為語音、影像生成和媒體理解等功能外觀是透過打包執行時期 API 載入的，即使 agent 輪次本身僅檢查簡單的文字回應。

- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，以進行直接協定的煙霧測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix 即時 QA 通道。僅適用於原始碼結帳——打包安裝版本並未隨附 `qa-lab`。
  - 完整的 CLI、設定檔/場景目錄、環境變數與構件配置：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用環境變數中的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數字聊天 ID。
  - 支援 `--credential-source convex` 以用於共享的共用憑證。預設使用 env 模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入共用租用。
  - 預設項涵蓋 canary、提及閘控、命令定址、`/status`、bot-to-bot 提及回覆以及核心原生命令回覆。`mock-openai` 預設項也涵蓋確定性回覆鏈和 Telegram 最終訊息串流回歸測試。針對選擇性探測（例如 `session_status`），請使用 `--list-scenarios`。
  - 當任何情境失敗時，會以非零代碼結束。當您
    需要產出檔案但不希望因失敗而結束程式時，請使用 `--allow-failures`。
  - 需要在同一個私密群組中有兩個不同的 bot，且 SUT bot 暴露 Telegram 使用者名稱。
  - 為了穩定的 bot-to-bot 觀察，請在兩個 bot 的 `@BotFather` 中啟用 Bot-to-Bot 通訊模式，並確保驅動程式 bot 可以觀察群組 bot 流量。
  - 會在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察訊息檔案。回覆情境包含從驅動程式傳送請求到觀察到 SUT 回覆的 RTT。

`Mantis Telegram Live` 是此通道的 PR 證據封裝。它使用 Convex 租用的 Telegram 憑證執行候選參考，在 Crabbox 桌面瀏覽器中呈現經過編修的觀察訊息紀錄，錄製 MP4 證據，生成動態修剪的 GIF，上傳檔案包束，並在設定 `pr_number` 時透過 Mantis GitHub App 發布內嵌 PR 證據。維護者可以透過 `Mantis Scenario` 從 Actions UI 啟動它（`scenario_id:
telegram-live`）或直接從 pull request 註解啟動：

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重用 Crabbox Linux 桌面，安裝原生 Telegram Desktop，使用租用的 Telegram SUT bot 權杖設定 OpenClaw，啟動閘道，並從可見的 VNC 桌面錄製螢幕擷圖/MP4 證據。
  - 預設為 `--credential-source convex`，因此工作流程只需要 Convex broker secret。請使用 `--credential-source env`，並搭配與 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 變數。
  - Telegram Desktop 仍需要使用者登入/個人檔案。Bot token 僅設定 OpenClaw。請使用 `--telegram-profile-archive-env <name>` 作為 base64 `.tgz` 個人檔案存檔，或使用 `--keep-lease` 並透過 VNC 手動登入一次。
  - 在輸出目錄下寫入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共用一個標準合約，以免新的 transports 偏離；各 lane 的涵蓋率矩陣位於 [QA overview → Live transport coverage](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是廣泛的綜合套件，不屬於該矩陣的一部分。

### 透過 Convex 共用 Telegram 憑證 (v1)

當針對 live transport QA 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA lab 會從 Convex 支援的 pool 中取得獨佔租約，在 lane 執行期間發送該租約的心跳，並在關閉時釋放租約。此章節名稱早於 Discord、Slack 和 WhatsApp 支援；租約合約在各種類型之間共用。

參考 Convex 專案架構：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的密鑰：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI：`--credential-role maintainer|ci`
  - 環境變數預設值：`OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

選用的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的追蹤 ID)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅用於本地開發的回送 `http://` Convex URLs。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應使用 `https://`。

維護者管理命令（pool add/remove/list）特別需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時運行前使用 `doctor` 來檢查 Convex 網站 URL、broker secrets、端點前綴、HTTP 超時以及 admin/list 的連通性，而不會列印 secret 值。在腳本和 CI 工具中使用 `--json` 以獲得機器可讀的輸出。

預設端點契約 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 請求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }` (或空的 `2xx`)
- `POST /release`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }` (或空的 `2xx`)
- `POST /admin/add` (僅限維護者 secret)
  - 請求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove` (僅限維護者 secret)
  - 請求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 有效租約守衛：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (僅限維護者 secret)
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 形狀：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字格式的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此形狀，並拒絕格式錯誤的 payload。

Broker 驗證的多頻道 payloads：

- Discord：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slab lanes 也可以從池中租用，但 Slack payload 驗證目前位於 Slack QA runner 而非 broker 中。針對 Slack rows，請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`。

### 將頻道加入 QA

新頻道轉接器的架構和 scenario-helper 名稱位於 [QA overview → Adding a channel](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低門檻：在共享的 `qa-lab` host seam 上實作 transport runner，在 plugin manifest 中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下撰寫場景。

## 測試套件（何處執行何內容）

請將這些套件視為「遞增的真實性」（以及遞增的不穩定性/成本）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：未指定目標的執行會使用 `vitest.full-*.config.ts` shard set，並可能將多專案 shards 擴展為各專案的 configs 以進行平行排程
- 檔案：core/unit inventories 位於 `src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 之下；UI 單元測試在專用的 `unit-ui` shard 中執行
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway auth、routing、tooling、parsing、config）
  - 針對已知錯誤的決定性迴歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實的金鑰
  - 應該快速且穩定
  - Resolver 和 public-surface loader 測試必須透過生成的微小 plugin fixtures 來證明廣泛的 `api.js` 和
    `runtime-api.js` 回退行為，而非
    真實的打包 plugin 來源 API。真實的 plugin API 載入屬於
    plugin 擁有的 contract/integration 套件。

原生依賴原則：

- 預設的測試安裝會略過選用的原生 Discord opus 建置。Discord 語音接收使用純 JS 的 `opusscript` 解碼器，且 `@discordjs/opus` 保持在 `ignoredBuiltDependencies` 狀態，因此本地測試和 Testbox lanes 不會編譯原生 addon。
- 如果您有意需要比較原生 opus 構建版本，請使用專用的 Discord 語音效能或即時通道。請勿將 `@discordjs/opus` 加回預設的 `onlyBuiltDependencies`；這會導致無關的安裝/測試循環編譯原生程式碼。

<AccordionGroup>
  <Accordion title="專案、分片和作用域通道">

    - 無目標 `pnpm test` 會運行十二個較小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這降低了負載機器上的峰值 RSS，並避免自動回覆/擴充套件工作導致不相關套件飢餓。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監視迴圈不切實際。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 首先將明確的檔案/目錄目標透過作用域通道路由，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免了支付完整的根專案啟動成本。
    - `pnpm test:changed` 預設將變更的 git 路徑擴展為廉價的作用域通道：直接測試編輯、同層級 `*.test.ts` 檔案、明確來源映射和本地匯入圖依賴項。配置/安裝/套件編輯不會廣泛運行測試，除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed` 是針對狹窄工作的正常智慧本機檢查閘道。它將差異分類為核心、核心測試、擴充套件、擴充套件測試、應用程式、文件、發行後設資料、即時 Docker 工具和工具，然後運行匹配的型別檢查、Lint 和守衛指令。它不運行 Vitest 測試；呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試證明。僅發行後設資料的版本升級會執行目標版本/配置/根依賴項檢查，並帶有一個守衛，拒絕頂層版本欄位之外的套件變更。
    - 即時 Docker ACP 線束編輯會執行焦點檢查：即時 Docker 身份驗證腳本的 Shell 語法和即時 Docker 排程器試運行。`package.json` 變更僅在差異限於 `scripts["test:docker:live-*"]` 時才包含在內；依賴項、匯出、版本和其他套件表面編輯仍使用更廣泛的守衛。
    - 來自代理程式、指令、外掛程式、自動回覆輔助程式、`plugin-sdk` 和類似純實用程式區域的輕量匯入單元測試透過 `unit-fast` 通道路由，該通道跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時繁重的檔案保留在現有通道上。
    - 選定的 `plugin-sdk` 和 `commands` 輔助程式來源檔案還將變更模式執行映射到這些輕量通道中的明確同層級測試，因此輔助程式編輯可避免為該目錄重新運行完整的繁重套件。
    - `auto-reply` 具有專用貯體，用於頂層核心輔助程式、頂層 `reply.*` 整合測試和 `src/auto-reply/reply/**` 子樹。CI 將回覆子樹進一步分割為 agent-runner、dispatch 和 commands/state-routing 分片，因此一個匯入繁重的貯體不會擁有完整的 Node 尾部。
    - 正常的 PR/main CI 有意跳過擴充套件批次掃描和僅發行版 `agentic-plugins` 分片。完整發行版驗證會在發行候選版本上為這些外掛程式/擴充套件繁重的套件分派單獨的 `Plugin Prerelease` 子工作流。

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - 當您變更 message-tool 探索輸入或壓縮執行時語境時，請保持這兩個層級的覆蓋率。
    - 針對純路由和正規化邊界，加入專注的 helper 回歸測試。
    - 確保 embedded runner 整合套件的健康狀況：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 這些套件會驗證 scoped id 與壓縮行為是否仍能流經真實的 `run.ts` / `compact.ts` 路徑；僅有 helper 的測試並不足以替代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共用的 Vitest 設定固定了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離的 runner。
    - 根 UI lane 保留其 `jsdom` 設定與優化器，但同樣在共用的非隔離 runner 上執行。
    - 每個 `pnpm test` 分片都會從共用 Vitest 設定繼承相同的 `threads` + `isolate: false`
      預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node
      程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯消耗。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以便與原版 V8
      行為進行比較。

  </Accordion>

  <Accordion title="快速本機疊代">

    - `pnpm changed:lanes` 顯示差異觸發了哪些架構通道。
    - Pre-commit hook 僅進行格式化。它會重新暫存已格式化的檔案，並且不會執行 lint、typecheck 或測試。
    - 當您需要智慧的本機檢查閘道時，請在移交或推送之前明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設透過廉價的範圍限定通道進行路由。僅當 Agent 決定對 harness、config、package 或合約的編輯確實需要更廣泛的 Vitest 涵蓋範圍時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 Worker 上限。
    - 本機 Worker 自動擴展策略刻意保守，當主機平均負載已經很高時會後退，因此多個並發的 Vitest 執行預設造成的損害較小。
    - 基礎 Vitest 配置將專案/配置檔案標記為 `forceRerunTriggers`，以便當測試接線變更時，變更模式下的重新執行保持正確。
    - 該配置在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要一個明確的快取位置用於直接分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="效能調試">

    - `pnpm test:perf:imports` 啟用 Vitest import-duration 報告以及
      import-breakdown 輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析視圖範圍限制在
      自 `origin/main` 以來變更的檔案。
    - Shard 時序資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整設定執行使用設定路徑作為鍵值；include-pattern CI
      shards 會附加 shard 名稱，以便單獨追蹤
      經過篩選的 shards。
    - 當某個熱門測試仍然將大部分時間花費在啟動匯入時，
      請將繁重的依賴項放在狹窄的本地 `*.runtime.ts` 縫隙之後，
      並直接模擬該縫隙，而不是深度匯入執行時期輔助程式
      僅為了將其傳遞給 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 比較路由後的
      `test:changed` 與該提交差異的原生根專案路徑，並印出 wall time 和 macOS max RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過將變更的檔案清單路由傳遞至
      `scripts/test-projects.mjs` 和根 Vitest 設定，對當前
      dirty tree 進行基準測試。
    - `pnpm test:perf:profile:main` 為
      Vitest/Vite 啟動和轉換開銷寫入主執行緒 CPU 分析檔案。
    - `pnpm test:perf:profile:runner` 在停用檔案並行處理的情況下，為
      unit suite 寫入 runner CPU+heap 分析檔案。

  </Accordion>
</AccordionGroup>

### 穩定性

- 指令：`pnpm test:stability:gateway`
- 設定：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 預設啟用診斷功能，啟動真實的 loopback Gateway
  - 透過診斷事件路徑驅動合成 gateway 訊息、記憶體和大型 payload 週轉
  - 透過 Gateway WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性 bundle 持久化輔助程式
  - 斷言錄製器保持受限、合成 RSS 樣本保持在壓力預算之下，且每個會話的佇列深度會排空回零
- 預期：
  - CI 安全且無需金鑰
  - 穩定性回歸追蹤的狹窄管道，而非完整 Gateway suite 的替代方案

### E2E

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及位於 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時預設值：
  - 使用 Vitest `threads` 搭配 `isolate: false`，與 repo 的其餘部分一致。
  - 使用自適應 workers（CI：最多 2 個，本機：預設 1 個）。
  - 預設以靜音模式執行以減少控制台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制設定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的控制台輸出。
- 範圍：
  - 多執行個體 gateway 的端對端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在 pipeline 中啟用時）
  - 不需要真實的金鑰
  - 比單元測試有更多運作部件（可能較慢）

### E2E：OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫存的本地 Dockerfile 建立沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過沙盒 fs 橋接器驗證 remote-canonical 檔案系統行為
- 預期：
  - 僅供選用；不屬於預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，接著銷毀測試 gateway 和沙盒
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 用於在手動執行更廣泛的 e2e suite 時啟用該測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 用於指定非預設的 CLI binary 或 wrapper script

### Live（真實的 providers + 真實的 models）

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及位於 `extensions/` 下的 bundled-plugin live 測試
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此 provider/model 在使用真實憑證的情況下，_今天_ 是否真的能運作？」
  - 捕捉 provider 格式變更、tool-calling 怪癖、認證問題以及速率限制行為
- 預期事項：
  - 依設計不具 CI 穩定性（涉及真實網路、真實供應商策略、配額、服務中斷）
  - 需要花費 / 使用速率限制
  - 建議優先執行縮減後的子集，而非「全部」
- Live 執行會 sourcing `~/.profile` 以取得遺漏的 API 金鑰。
- 預設情況下，Live 執行仍會隔離 `HOME`，並將設定/認證資料複製到暫存測試 home 目錄，以免單元 fixture 修改您真實的 `~/.openclaw`。
- 僅在您刻意需要 Live 測試使用您真實的 home 目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 現在預設為較安靜的模式：它會保留 `[live] ...` 的進度輸出，但會隱藏額外的 `~/.profile` 通知，並靜音 gateway bootstrap 日誌/Bonjour 雜訊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替（依供應商而異）：請以逗號/分號格式設定 `*_API_KEYS`，或設定 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行個別 Live 覆寫；測試會在收到速率限制回應時重試。
- 進度/心跳輸出：
  - Live 套件現在會將進度行輸出至 stderr，因此即使 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能顯示為作用中。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截功能，讓供應商/gateway 的進度行能在 Live 執行期間即時串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型的心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 的心跳。

## 我應該執行哪個套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您有大幅修改，則執行 `pnpm test:coverage`）
- 涉及 gateway 網路功能 / WS 協定 / 配對：加入 `pnpm test:e2e`
- 偵錯「我的機器人掛了」/ 供應商特定錯誤 / 工具呼叫：執行縮減後的 `pnpm test:live`

## Live（涉及網路存取）測試

關於即時模型矩陣、CLI 後端冒煙測試、ACP 冒煙測試、Codex app-server 測試工具，以及所有媒體提供者的即時測試（Deepgram、BytePlus、ComfyUI、圖片、音樂、影片、媒體測試工具）——加上即時執行的憑證處理——請參閱[Testing live suites](/zh-Hant/help/testing-live)。關於專用的更新和外掛驗證檢查清單，請參閱[Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)。

## Docker 執行器（可選的「在 Linux 中運作」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在儲存庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的設定檔金鑰即時檔案，掛載您的本機設定目錄和工作區（如果掛載了則會執行 `~/.profile`）。對應的本機進入點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker 即時執行器預設使用較小的冒煙測試上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，而
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確想要進行較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次即時 Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，然後建構/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅用於 install/update/plugin-dependency lanes 的 Node/Git runner；這些 lanes 掛載預先建構的 tarball。Functional 映像檔則將相同的 tarball 安裝到 `/app`，用於 built-app functionality lanes。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計畫。Aggregate 使用加權的本機排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制程序插槽，而資源上限則防止繁重的 live、npm-install 和 multi-service lanes 同時啟動。如果單一 lane 超過啟用時的上限，排程器仍可在集區為空時啟動它，然後讓其單獨執行直到容量再次可用。預設值為 10 個插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時，才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。Runner 預設會執行 Docker 預檢，移除過時的 OpenClaw E2E 容器，每 30 秒列印一次狀態，將成功的 lane 執行時間儲存在 `.artifacts/docker-tests/lane-timings.json` 中，並在後續執行時利用這些時間優先啟動較長的 lanes。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 來列印加權 lane 清單而不建構或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 來列印選定 lanes 的 CI 計畫、套件/映像檔需求以及憑證。
- `Package Acceptance` 是 GitHub 原生的套件檢查門檻，用於確認「此可安裝的 tarball 是否作為產品正常運作？」它會從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 中解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該確切的 tarball 執行可重複使用的 Docker E2E 通道，而非重新打包所選的 ref。Profile 依照廣度排序：`smoke`、`package`、`product` 和 `full`。請參閱 [測試更新與外掛](/zh-Hant/help/testing-updates-plugins) 以了解套件/更新/外掛合約、已發布升級相容性矩陣、發布預設值以及故障分類。
- 建置和發布檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。此防護機制會從 `dist/entry.js` 和 `dist/cli/run-main.js` 遍歷靜態建置圖，若在分派命令前，啟動程序導入的套件依賴（如 Commander、prompt UI、undici 或 logging）則會失敗；它也會確保打包的 gateway 執行區塊保持在預算內，並拒絕對已知冷 gateway 路徑的靜態導入。打包的 CLI 測試也涵蓋了根目錄說明、入門說明、診斷說明、狀態、配置架構以及 model-list 指令。
- 套件驗收的舊版相容性僅限於 `2026.4.25`（含 `2026.4.25-beta.*`）。在該截止版本之前，測試框架僅容忍已發布套件的元資料缺失：省略的私有 QA 清單項目、缺少的 `gateway install --wrapper`、從 tarball 衍生的 git fixture 中缺少的修補檔案、缺少的持續化 `update.channel`、舊版外掛安裝記錄位置、缺少的 marketplace 安裝記錄持久化，以及在 `plugins update` 期間的配置元資料遷移。對於 `2026.4.25` 之後的套件，這些路徑均會視為嚴重失敗。
- Container smoke 執行器：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 會啟動一個或多個真實容器並驗證更高層級的整合路徑。

Live-model Docker 執行器也僅 bind-mount 所需的 CLI 認證主目錄（或者在執行範圍未縮小時掛載所有支援的目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以刷新權杖而無需變更主機認證存儲：

- Direct models：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`；預設涵蓋 Claude、Codex 和 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 提供嚴格的 Droid/OpenCode 涵蓋範圍）
- CLI backend smoke：`pnpm test:docker:live-cli-backend`（腳本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（腳本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Observability smoke：`pnpm qa:otel:smoke` 是一個私有的 QA source-checkout lane。它有意不包含在套件 Docker 發布 lanes 中，因為 npm tarball 省略了 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding wizard (TTY, full scaffolding)：`pnpm test:docker:onboard`（腳本：`scripts/e2e/onboard-docker.sh`）
- Npm tarball onboarding/channel/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，透過 env-ref onboarding 預設設定 OpenAI 和 Telegram，執行 doctor，並執行一個模擬的 OpenAI agent 週期。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用預先建立的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切換頻道。
- Skill install smoke: `pnpm test:docker:skill-install` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，在設定中停用上傳的封存安裝，從搜尋中解析目前的即時 ClawHub skill slug，使用 `openclaw skills install` 進行安裝，並驗證已安裝的 skill 以及 `.clawhub` origin/lock 中繼資料。
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證持續存在的頻道和外掛更新後的工作，然後切換回 package `stable` 並檢查更新狀態。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` 會將打包好的 OpenClaw tarball 安裝在一個包含 agents、頻道設定、外掛允許清單、過時的外掛相依性狀態以及現有工作區/會話檔案的髒舊使用者 fixture 上。它會執行 package 更新以及非互動式 doctor，且不使用即時 provider 或頻道金鑰，然後啟動一個 loopback Gateway 並檢查設定/狀態保留以及啟動/狀態預算。
- 已發布升級存留者煙霧測試：`pnpm test:docker:published-upgrade-survivor` 預設安裝 `openclaw@latest`，植入真實的現有使用者檔案，使用烘焙的指令配方設定該基準，驗證產生的設定，將該已發布的安裝更新為候選 tarball，執行非互動式診斷程式，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動一個迴路 Gateway 並檢查已設定的 intents、狀態保留、啟動、`/healthz`、`/readyz` 以及 RPC 狀態預算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫一個基準，要求聚合排程器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）擴展精確的本機基準，並使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）擴展問題形狀的固定裝置；回報的問題集合包含 `configured-plugin-installs` 以用於自動修復外部 OpenClaw 外掛程式的安裝。套件驗收將其公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基準標記（如 `last-stable-4` 或 `all-since-2026.4.23`），而完整版本驗證則將版本浸泡套件閘門擴展為 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 會話執行時上下文煙霧測試：`pnpm test:docker:session-runtime-context` 驗證隱藏的執行時上下文紀錄持久性，以及診斷程式對受影響的重複提示重寫分支的修復。
- Bun 全域安裝煙霧測試：`bash scripts/e2e/bun-global-install-smoke.sh` 打包當前樹，在隔離的 home 目錄中使用 `bun install -g` 安裝它，並驗證 `openclaw infer image providers --json` 返回捆綁的映像供應商而不是掛起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用預先建構的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建構，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從已建構的 Docker 映像複製 `dist/`。
- 安裝程式 Docker smoke 測試：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共用一個 npm 快取。Update smoke 預設以 npm `latest` 作為升級至候選 tarball 之前的穩定基準。可在本機使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆蓋，或在 GitHub 上使用 Install Smoke workflow 的 `update_baseline_version` 輸入。非 root 安裝程式檢查會保持獨立的 npm 快取，以免 root 擁有的快取條目掩蓋使用者本機的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 即可在本機重複執行時重複使用 root/update/direct-npm 快取。
- Install Smoke CI 會使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要直接的 `npm install -g` 覆蓋率時，請在本機不使用該環境變數的情況下執行腳本。
- Agents 刪除共用工作區 CLI smoke 測試：`pnpm test:docker:agents-delete-shared-workspace` (腳本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設會建構 root Dockerfile 映像檔，在獨立的容器主目錄中用一個工作區植入兩個代理程式，執行 `agents delete --json`，並驗證有效的 JSON 以及工作區保留行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重複使用 install-smoke 映像檔。
- Gateway 網路連線 (兩個容器，WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- 瀏覽器 CDP 快照 smoke 測試：`pnpm test:docker:browser-cdp-snapshot` (腳本：`scripts/e2e/browser-cdp-snapshot-docker.sh`) 會建構來源 E2E 映像檔加上 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP 角色快照涵蓋連結 URL、游標提昇的可點擊元素、iframe 參照和框架元資料。
- OpenAI Responses web_search 最小推理回歸測試：`pnpm test:docker:openai-web-search-minimal` (腳本：`scripts/e2e/openai-web-search-minimal-docker.sh`) 透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制供應商 schema 拒絕並檢查原始詳細資料是否出現在 Gateway 日誌中。
- MCP 頻道橋接器 (已植入的 Gateway + stdio 橋接器 + 原始 Claude 通知框架煙霧測試)：`pnpm test:docker:mcp-channels` (腳本：`scripts/e2e/mcp-channels-docker.sh`)
- Pi 套件 MCP 工具 (真實的 stdio MCP 伺服器 + 嵌入式 Pi 設定檔允許/拒絕煙霧測試)：`pnpm test:docker:pi-bundle-mcp-tools` (腳本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/subagent MCP 清理 (真實的 Gateway + 在隔離的 cron 和一次性 subagent 執行後的 stdio MCP 子程序拆除)：`pnpm test:docker:cron-mcp-cleanup` (腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 外掛程式 (本地路徑、`file:`、具有提升依賴項的 npm 註冊表、git 移動參考、ClawHub 綜合測試、marketplace 更新以及 Claude-bundle 啟用/檢查的安裝/更新煙霧測試)：`pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆寫預設的綜合測試套件/執行時配對。如果沒有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，測試會使用一個封閉的本地 ClawHub fixture 伺服器。
- 外掛程式更新未變更的煙霧測試：`pnpm test:docker:plugin-update` (腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`)
- 外掛程式生命週期矩陣煙霧測試：`pnpm test:docker:plugin-lifecycle-matrix` 在一個裸容器中安裝打包好的 OpenClaw tarball，安裝一個 npm 外掛程式，切換啟用/停用，透過本地 npm 註冊表進行升級和降級，刪除已安裝的程式碼，然後驗證解除安裝仍然會移除過時狀態，同時記錄每個生命週期階段的 RSS/CPU 指標。
- 設定重新載入中繼資料煙霧測試：`pnpm test:docker:config-reload` (腳本：`scripts/e2e/config-reload-source-docker.sh`)
- 外掛程式：`pnpm test:docker:plugins` 涵蓋本地路徑、`file:`、具有提升依賴項的 npm 註冊表、git 移動參考、ClawHub fixture、marketplace 更新以及 Claude-bundle 啟用/檢查的安裝/更新煙霧測試。`pnpm test:docker:plugin-update` 涵蓋已安裝外掛程式的未變更新行為。`pnpm test:docker:plugin-lifecycle-matrix` 涵蓋資源追蹤的 npm 外掛程式安裝、啟用、停用、升級、降級和程式碼遺失的解除安裝。

若要手動預建並重用共享的功能映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

若設定了 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 等測試套件特定的映像檔覆寫設定，則該設定優先採用。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共享映像檔時，若本地尚未存在，腳本會將其拉取下來。QR 碼與安裝程式的 Docker 測試會保留各自的 Dockerfile，因為它們驗證的是套件/安裝行為，而非共享的建置應用程式執行環境。

即時模型 Docker 執行器也會將目前的檢出以唯讀方式綁定掛載，並將其暫存至容器內的暫存工作目錄中。這樣可以在保持執行時映像檔精簡的同時，針對您的確切本機來源/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機的 `.build` 或 Gradle 輸出目錄，以免 Docker 即時執行耗費數分鐘時間複製機器特定的產出資料。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway 即時探測不會在容器內啟動真實的 Telegram/Discord/等頻道工作者。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要從該 Docker 通道縮小或排除 gateway 即時覆蓋範圍時，請同時傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是較高階的相容性冒煙測試：它會啟動一個啟用了 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動一個固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否暴露 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理程式傳送真實的聊天請求。對於應在 Open WebUI 登入和模型探索後停止，而無需等待即時模型完成的發行途徑 CI 檢查，請設定 `OPENWEBUI_SMOKE_MODE=models`。首次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，而 Open WebUI 可能需要完成自身的冷啟動設定。此通道需要可用的即時模型金鑰，而 `OPENCLAW_PROFILE_FILE`（預設為 `~/.profile`）是在 Docker 化執行中提供它的主要方式。成功的執行會列印出類似於 `{ "ok": true, "model": "openclaw/default", ... }` 的小型 JSON 載荷。`test:docker:mcp-channels` 是刻意確定性的，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動一個已植入種子的 Gateway 容器，啟動第二個生成 `openclaw mcp serve` 的容器，然後驗證路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、外寄傳送路由，以及透過真實 stdio MCP 橋接器的 Claude 風格通道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此冒煙測試會驗證橋接器實際發出的內容，而不僅是特定用戶端 SDK 偶然呈現的內容。`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要即時模型金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP 探測伺服器，透過嵌入式 Pi bundle MCP 執行時具體化該伺服器，執行工具，然後驗證 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 會將其過濾掉。`test:docker:cron-mcp-cleanup` 是確定性的，不需要即時模型金鑰。它會啟動一個具有真實 stdio MCP 探測伺服器的已植入種子 Gateway，執行隔離的 cron 迴圈和 `/subagents spawn` 一次性子迴圈，然後驗證 MCP 子程序在每次執行後退出。

手動 ACP 自然語言串流冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於回歸/除錯工作流程。ACP 串流路由驗證可能再次需要它，因此請勿刪除。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...`（預設：`~/.profile`）掛載至 `/home/node/.profile`，並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用臨時設定/工作區目錄且無外部 CLI 認證掛載
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global`，用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載在 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮小的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔清單（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆蓋
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重複使用現有的 `openclaw:local-live` 映像檔，用於不需要重建的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確認憑證來自設定檔儲存（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇針對 Open WebUI 冒煙測試由閘道暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用於覆寫 Open WebUI 煙霧測試所使用的 nonce 檢查提示
- `OPENWEBUI_IMAGE=...` 用於覆寫固定的 Open WebUI 映像檔標籤

## 文件健全性檢查

在編輯文件後執行檢查：`pnpm check:docs`。
當您也需要檢查頁面內標題時，請執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試（CI 安全）

這些是沒有真實供應商的「真實管線」回歸測試：

- Gateway 工具調用（模擬 OpenAI，真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「透過 gateway agent 迴圈端對端執行模擬的 OpenAI 工具調用」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「透過 ws 執行精靈並寫入驗證權杖設定」）

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全的測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具調用（`src/gateway/gateway.test.ts`）。
- 端對端精靈流程，用於驗證 session 連線和設定效果（`src/gateway/gateway.test.ts`）。

技能目前仍缺少的內容（參見 [技能](/zh-Hant/tools/skills))：

- **決策制定：**當提示中列出技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：**agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程合約：**斷言工具順序、session 歷史傳遞和沙箱邊界的多輪場景。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景執行器，以斷言工具調用 + 順序、技能檔案讀取和 session 連線。
- 一套小型的專注於技能的場景（使用與避免、閘控、提示注入）。
- 只有在 CI 安全測試套件就位後，才進行選用的即時評估（自願參加、環境閘控）。

## 合約測試（外掛和頻道形狀）

合約測試驗證每個已註冊的外掛和頻道都符合其介面合約。它們會遍歷所有發現的外掛並執行一系列形狀和行為斷言。預設的 `pnpm test` unit lane 會刻意跳過這些共享的 seam 和 smoke 檔案；當您接觸共享頻道或供應商介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限頻道合約：`pnpm test:contracts:channels`
- 僅限供應商合約：`pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀（id、name、capabilities）
- **setup** - 設定精靈合約
- **session-binding** - Session binding 行為
- **outbound-payload** - 訊息 payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - Thread ID 處理
- **directory** - Directory/roster API
- **group-policy** - 群組政策強制執行

### 供應商狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - 外掛註冊表形狀

### 供應商合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛探索
- **loader** - 外掛載入
- **runtime** - 供應商執行時期
- **shape** - 外掛形狀/介面
- **wizard** - 設定精靈

### 執行時機

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改頻道或供應商外掛之後
- 重構外掛註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增迴歸測試（指引）

當您修正在 live 中發現的供應商/模型問題時：

- 如果可能的話，新增一個對 CI 安全的迴歸測試（mock/stub 供應商，或擷取精確的請求形狀轉換）
- 如果它本質上僅限於 live（速率限制、驗證政策），請保持 live 測試狹窄並透過環境變數選擇加入
- 優先以能捕捉錯誤的最小層級為目標：
  - provider request conversion/replay bug → direct models test
  - gateway session/history/tool pipeline bug → gateway live smoke 或 CI-safe gateway mock test
- SecretRef 遍歷防護措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元資料 (`listSecretTargetRegistryEntries()`) 中為每個 SecretRef 類別推導出一個採樣目標，然後斷言遍歷區段 (traversal-segment) 執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增了 `includeInPlan` SecretRef 目標系列，請在該測試中更新 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，以便新的類別不會被無聲跳過。

## 相關

- [即時測試](/zh-Hant/help/testing-live)
- [測試更新與外掛](/zh-Hant/help/testing-updates-plugins)
- [CI](/zh-Hant/ci)
