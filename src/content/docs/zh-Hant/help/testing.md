---
summary: "測試套件：單元/e2e/live 測試套件、Docker 執行器，以及每個測試的覆蓋範圍"
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
**QA stack (qa-lab, qa-channel, live transport lanes)** 另有記載：

- [QA overview](/zh-Hant/concepts/qa-e2e-automation) - 架構、命令介面、場景編寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的參考資料。
- [QA channel](/zh-Hant/channels/qa-channel) - 由 repo 支援的場景所使用的合成傳輸外掛。

本頁涵蓋執行一般測試套件和 Docker/Parallels runner。下方的 QA 專屬 runner 章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 叫用，並回連至上述參考資料。

</Note>

## 快速入門

大部分時候：

- 完整閘道（推送前預期）：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在規格充足的機器上更快的本地完整套件執行：`pnpm test:max`
- 直接 Vitest 監看迴圈：`pnpm test:watch`
- 直接的檔案指定現在也支援 routing 擴充功能/channel 路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您在處理單一失敗時，請優先使用目標執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您修改測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當對真實提供者/模型進行除錯時（需要真實憑證）：

- Live 套件（models + gateway tool/image probes）：`pnpm test:live`
- 安靜地指定單一 live 檔案：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 執行時效能報告：使用 `live_gpt54=true` dispatch `OpenClaw Performance` 以取得真實的 `openai/gpt-5.4` agent 週期，或
  使用 `deep_profile=true` 取得 Kova CPU/heap/trace 檢測資料。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，每日排程執行會
  將 mock-provider、deep-profile 和 GPT 5.4 通道的檢測資料發布到
  `openclaw/clawgrit-reports`。Mock-provider 報告也包含源頭層級的 gateway 開機、記憶體、
  外掛壓力、重複的 fake-model hello-loop，以及 CLI 啟動數值。
- Docker live model 掃描：`pnpm test:docker:live-models`
  - 每個選定的模型現在都會執行一個文本輪次加上一個小型檔案讀取樣式的探測。元數據宣稱支援 `image` 輸入的模型也會執行一個微小的圖像輪次。在隔離提供者故障時，請使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或 `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 停用額外的探測。
  - CI 覆蓋範圍：每日 `OpenClaw Scheduled Live And E2E Checks` 和手動 `OpenClaw Release Checks` 都會使用 `include_live_suites: true` 呼叫可重複使用的 live/E2E 工作流程，其中包括按提供者分片的獨立 Docker live model 矩陣任務。
  - 若要針對特定 CI 重新執行，請使用 `include_live_suites: true` 和 `live_models_only: true` 派送 `OpenClaw Live And E2E Checks (Reusable)`。
  - 將新的高訊號提供者秘密新增至 `scripts/ci-hydrate-live-auth.sh`，以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其定時/發行版本呼叫者。
- 原生 Codex bound-chat 冒煙測試：`pnpm test:docker:live-codex-bind`
  - 針對 Codex app-server 路徑執行 Docker live lane，使用 `/codex bind` 綁定一個合成的 Slack DM，執行 `/codex fast` 和 `/codex permissions`，然後驗證純文字回覆和圖像附件是透過原生插件綁定而非 ACP 路由。
- Codex app-server harness 冒煙測試：`pnpm test:docker:live-codex-harness`
  - 透過插件擁有的 Codex app-server harness 執行 gateway agent 輪次，驗證 `/codex status` 和 `/codex models`，並且預設會執行圖像、cron MCP、sub-agent 和 Guardian 探測。在隔離其他 Codex app-server 故障時，請使用 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 停用 sub-agent 探測。若要進行專注的 sub-agent 檢查，請停用其他探測：`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。除非設定了 `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否則這會在 sub-agent 探測後退出。
- Codex on-demand 安裝冒煙測試：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安裝打包好的 OpenClaw tarball，執行 OpenAI API-key 入職，並驗證 Codex 插件和 `@openai/codex` 相依性已按需下載到受管理的 npm 根目錄中。
- Live plugin tool 相依性冒煙測試：`pnpm test:docker:live-plugin-tool`
  - 打包一個帶有真實 `slugify` 依賴的 fixture 外掛，透過 `npm-pack:` 安裝它，在受管理的 npm 根目錄下驗證依賴，然後要求一個即時 OpenAI 模型呼叫外掛工具並回傳隱藏的 slug。
- Crestodian 救援命令冒煙測試：`pnpm test:live:crestodian-rescue-channel`
  - 針對訊息通道救援命令介面的可選擇性雙重保障檢查。它執行 `/crestodian status`，將持續性模型變更加入佇列，回覆 `/crestodian yes`，並驗證 audit/config 寫入路徑。
- Crestodian 規劃器 Docker 冒煙測試：`pnpm test:docker:crestodian-planner`
  - 在 `PATH` 上使用假的 Claude CLI，在無設定的容器中執行 Crestodian，並驗證模糊規劃器後備機制轉換為已稽核的型別化設定寫入。
- Crestodian 首次執行 Docker 冒煙測試：`pnpm test:docker:crestodian-first-run`
  - 從空的 OpenClaw 狀態目錄開始，將純 `openclaw` 路由至 Crestodian，套用 setup/model/agent/Discord 外掛 + SecretRef 寫入，驗證設定，並驗證稽核項目。相同的 Ring 0 設定路徑在 QA Lab 中也由 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 涵蓋。
- Moonshot/Kimi 成本冒煙測試：在設定 `MOONSHOT_API_KEY` 後，執行 `openclaw models list --provider moonshot --json`，然後對 `moonshot/kimi-k2.6` 執行獨立的 `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`。驗證 JSON 回報 Moonshot/K2.6 且助理對話記錄儲存了標準化的 `usage.cost`。

<Tip>當您只需要一個失敗的案例時，建議優先使用下述透過允許清單環境變數來縮小即時測試範圍的方法。</Tip>

## QA 專用執行器

當您需要 QA Lab 的真實性時，這些指令位於主要測試套件旁邊：

CI 會在專用的工作流程中執行 QA Lab。Agent parity 嵌套在
`QA-Lab - All Lanes` 和發布驗證之下，而非獨立的 PR 工作流程。
廣泛的驗證應使用帶有 `rerun_group=qa-parity` 或 release-checks QA 群組的
`Full Release Validation`。穩定/預設的發布檢查會將徹底的 live/Docker soak
保留在 `run_release_soak=true` 之後；`full` 設定檔會強制開啟 soak。
`QA-Lab - All Lanes` 每晚在 `main` 上執行，並透過手動觸發以 mock parity lane、
live Matrix lane、Convex-managed live Telegram lane 和 Convex-managed live Discord lane 作為
並行工作來執行。排程的 QA 和發布檢查會明確傳遞 Matrix
`--profile fast`，而 Matrix CLI 和手動工作流程輸入預設仍維持為
`all`；手動觸發可以將 `all` 分片為
`transport`、`media`、
`e2ee-smoke`、`e2ee-deep` 和
`e2ee-cli` 工作。`OpenClaw Release
Checks` 在發布核准前執行 parity 加上快速 Matrix 和 Telegram lane，使用
`mock-openai/gpt-5.5` 進行發傳輸檢查，使其保持確定性並避免正常的 provider-plugin 啟動。
這些 live 傳輸 gateway 會停用記憶體搜尋；記憶體行為仍由 QA parity 套件覆蓋。

完整的發布 live media 分片使用
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`，其中已經包含
`ffmpeg` 和 `ffprobe`。Docker live model/backend 分片使用
`ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔，該映像檔針對每個選定的
commit 建構一次，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 拉取它，而不是在每個
分片內部重新建構。

- `pnpm openclaw qa suite`
  - 直接在主機上執行倉庫支援的 QA 情境。
  - 預設情況下，透過獨立的 gateway worker
    並行執行多個選定的場景。`qa-channel` 預設併發數為 4（以
    選定的場景數量為上限）。使用 `--concurrency <count>` 來調整 worker
    數量，或使用 `--concurrency 1` 執行較舊的序列 lane。
  - 當任何情境失敗時，以非零值退出。當您想要產生檔案但不希望以失敗代碼退出時，請使用 `--allow-failures`。
  - 支援提供者模式 `live-frontier`、`mock-openai` 和 `aimock`。`aimock` 會啟動一個本機由 AIMock 支援的提供者伺服器，用於實驗性 fixture 和協定模擬覆蓋率，而不會取代具備情境感知能力的 `mock-openai` 通道。
- `pnpm test:plugins:kitchen-sink-live`
  - 透過 QA Lab 執行即時 OpenAI Kitchen Sink 外掛程式測試組。它會安裝外部 Kitchen Sink 套件、驗證外掛 SDK 介面庫存、探測 `/healthz` 和 `/readyz`、記錄閘道 CPU/RSS 証據、執行即時 OpenAI 回合，並檢查對抗性診斷。需要即時 OpenAI 驗證，例如 `OPENAI_API_KEY`。在已準備好的 Testbox 工作階段中，當存在 `openclaw-testbox-env` 輔助程式時，它會自動載入 Testbox live-auth 設定檔。
- `pnpm test:gateway:cpu-scenarios`
  - 執行閘道啟動基準測試以及一組小型的模擬 QA Lab 情境包 (`channel-chat-baseline`、`memory-failure-fallback`、`gateway-restart-inflight-run`)，並在 `.artifacts/gateway-cpu-scenarios/` 下寫入綜合 CPU 觀察摘要。
  - 預設情況下僅標記持續的 CPU 高負載觀察 (`--cpu-core-warn` 加上 `--hot-wall-warn-ms`)，因此短暫的啟動尖峰會被記錄為指標，而不會看起來像是長達數分鐘的閘道佔用回歸。
  - 使用已建置的 `dist` 檔案；當检出尚未包含最新的執行時輸出時，請先執行建置。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 內執行相同的 QA 套件。
  - 在主機上保持與 `qa suite` 相同的情境選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - 即時執行會轉發對客端來說可行的支援 QA 驗證輸入：基於環境變數的提供者金鑰、QA 即時提供者設定路徑，以及存在時的 `CODEX_HOME`。
  - 輸出目錄必須保持在 repo 根目錄下，以便 guest 可以透過
    掛載的寫入工作區回傳資料。
  - 在 `.artifacts/qa-e2e/...` 下寫入標準的 QA 報告和摘要加上 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動支援 Docker 的 QA 站台，用於操作員式的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從當前 checkout 建構 npm tarball，在 Docker 中全域安裝它，執行非互動式 OpenAI API 金鑰入門導覽，預設設定 Telegram，驗證打包的插件運行時在無需啟動依賴修復的情況下載入，執行 doctor，並針對模擬的 OpenAI 端點執行一次本地 agent 回合。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 透過 Discord 執行相同的
    套件安裝通道。
- `pnpm test:docker:session-runtime-context`
  - 針對嵌入式執行環境語境文字記錄，執行確定性
    的建置應用程式 Docker 偵測。它會驗證隱藏的 OpenClaw 執行環境語境
    是作為非顯示的自訂訊息保存，而不是洩漏到可見的使用者回合中，
    然後植入受影響的損壞會話 JSONL 並驗證
    `openclaw doctor --fix` 將其重寫到具有備份的目前分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安裝 OpenClaw 套件候選版本，執行已安裝套件的入門導覽，透過已安裝的 CLI 設定 Telegram，然後重用即時 Telegram QA 流程，並將該已安裝套件作為 SUT Gateway。
  - 此包裝器僅掛載來自檢出的 `qa-lab` 襟具來源；
    已安裝的套件擁有 `dist`、`openclaw/plugin-sdk` 和套件
    運算時外掛程式，因此通道不會將目前檢出的外掛程式混入
    受測套件中。
  - 預設為 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；設定
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或
    `OPENCLAW_CURRENT_PACKAGE_TGZ` 以測試已解析的本機 tarball，
    而不是從註冊表安裝。
  - 使用與 `pnpm openclaw qa telegram` 相同的 Telegram 環境憑證
    或 Convex 憑證來源。對於 CI/發布自動化，請設定
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上
    `OPENCLAW_QA_CONVEX_SITE_URL` 和角色密鑰。如果
    CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex 角色密鑰，
    Docker 包裝器會自動選取 Convex。
  - 包裝器會在 Docker 建置/安裝工作之前驗證主機上的
    Telegram 或 Convex 憑證環境。僅當刻意
    除錯憑證前設定時，才設定 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 會覆寫此通道的
    共用 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 將此通道公開為手動維護者工作流程
    `NPM Telegram Beta E2E`。它不會在合併時執行。該工作流程使用
    `qa-live-shared` 環境和 Convex CI 憑證租用。
- GitHub Actions 也公開了 `Package Acceptance`，用於針對單一候選套件進行側載產品驗證。它接受信任的 ref、已發布的 npm 規格、HTTPS tarball URL 加上 SHA-256，或是來自其他執行的 tarball 構件，將標準化的 `openclaw-current.tgz` 上傳為 `package-under-test`，然後使用 smoke、package、product、full 或 custom lane 設定檔執行現有的 Docker E2E 排程器。設定 `telegram_mode=mock-openai` 或 `live-frontier` 以針對相同的 `package-under-test` 構件執行 Telegram QA 工作流程。
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
  - 同時安裝一個已知的舊版 npm 基準，在執行 `openclaw update --tag <candidate>` 之前啟用 Telegram，並驗證候選套件的更新後診斷程式能清理舊版外掛程式相依性的殘留，而無需在arness 端進行 postinstall 修復。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 虛擬機上執行原生封裝安裝更新冒煙測試。每個選定的平台會先安裝要求的基準套件，然後在同一台虛擬機中執行已安裝的 `openclaw update` 指令，並驗證安裝版本、更新狀態、gateway 就緒狀態以及一次本地 agent 輪次。
  - 在對單一台虛擬機進行反覆運算時，請使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 來取得摘要構件路徑與各 lane 狀態。
  - OpenAI lane 預設使用 `openai/gpt-5.5` 進行即時 agent 輪次驗證。當刻意驗證其他 OpenAI 模型時，請傳遞 `--model <provider/model>` 或設定 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將耗時的本地執行包裝在主機逾時中，以免 Parallels 傳輸停滯佔用其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 腳本會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀 lane 日誌。在假設外層包裝器已當機之前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能會在冷啟動的客體機上花費 10 到 15 分鐘進行更新後診斷和套件更新；只要巢狀 npm 除錯日誌持續推進，這仍然屬於正常狀態。
  - 請勿將此彙整包裝程式與個別的 Parallels macOS、Windows 或 Linux 煙霧測試通道並行執行。它們共用 VM 狀態，可能會在還原快照、提供套件或客體機 gateway 狀態時發生衝突。
  - 更新後驗證會執行正常的打包外掛介面，因為語音、影像生成和媒體理解等功能外觀是透過打包執行時期 API 載入的，即使 agent 輪次本身僅檢查簡單的文字回應。

- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，以進行直接協定的煙霧測試。
- `pnpm openclaw qa matrix`
  - 針對一次性的 Docker 支援 Tuwunel homeserver 執行 Matrix live QA lane。僅限原始碼簽出 — 封裝安裝版本不附帶 `qa-lab`。
  - 完整的 CLI、設定檔/場景目錄、環境變數和成果佈局：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用環境變數中的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram 即時 QA 通道。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是數值形式的 Telegram 聊天 ID。
  - 支援 `--credential-source convex` 以共用集區認證。預設使用環境模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 預設值涵蓋金絲雀、提及閘控、命令定址、`/status`、機器人對機器人的提及回覆，以及核心原生命令回覆。`mock-openai` 預設值也涵蓋決定性回覆鏈和 Telegram 最終訊息串流回歸測試。請使用 `--list-scenarios` 進行可選探測，例如 `session_status`。
  - 當任何場景失敗時，會以非零狀態碼結束。當您希望取得工件但不要以失敗狀態碼結束時，請使用 `--allow-failures`。
  - 需要在同一個私密群組中有兩個不同的 bot，且 SUT bot 暴露 Telegram 使用者名稱。
  - 為了穩定的機器人對機器人觀察，請在兩個機器人的 `@BotFather` 中啟用 Bot-to-Bot Communication Mode，並確保驅動程式機器人能觀察群組機器人的流量。
  - 會在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和已觀察訊息工件。回覆場景包含從驅動程式發送請求到觀察到被測系統回覆的 RTT。

`Mantis Telegram Live` 是此通道的 PR 證據包裝器。它使用 Convex 租用的 Telegram 認證執行候選參考，在 Crabbox 桌面瀏覽器中渲染經過編輯的已觀察訊息逐字稿，錄製 MP4 證據，生成動態修剪的 GIF，上傳工件包，並在設定 `pr_number` 時透過 Mantis GitHub App 發布內嵌 PR 證據。維護者可以透過 `Mantis Scenario` (`scenario_id:
telegram-live`) 從 Actions UI 啟動它，或直接從 pull request 註解啟動：

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用於 PR 視覺證明的代理程式原生 Telegram Desktop 前/後包裝器。使用自由形式的 `instructions` 從 Actions UI 啟動它，透過 `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`)，或從 PR 註解啟動：

```text
@Mantis telegram desktop proof
```

Mantis agent 會閱讀 PR，決定哪些 Telegram 上可見的行為能證明此變更，在基準和候選 refs 上執行真實用戶 Crabbox Telegram Desktop 測試跑道，反覆迭代直到原生 GIF 具備實用價值，撰寫成對的 `motionPreview` manifest，並在設定 `pr_number` 時透過 Mantis GitHub App 張貼相同的雙欄 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重用 Crabbox Linux 桌面，安裝原生 Telegram Desktop，使用租用的 Telegram SUT bot token 配置 OpenClaw，啟動 gateway，並從可見的 VNC 桌面錄製螢幕截圖/MP4 證據。
  - 預設為 `--credential-source convex`，因此工作流程僅需要 Convex broker secret。使用 `--credential-source env` 時需搭配與 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 變數。
  - Telegram Desktop 仍需用戶登入/設定檔。bot token 僅用於配置 OpenClaw。使用 `--telegram-profile-archive-env <name>` 指定 base64 `.tgz` 設定檔壓縮檔，或使用 `--keep-lease` 並透過 VNC 手動登入一次。
  - 在輸出目錄下寫入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共用一份標準合約，以確保新的傳輸方式不會偏離；各 lane 的覆蓋率矩陣位於 [QA overview → Live transport coverage](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是廣泛的合成套件，並不屬於該矩陣的一部分。

### 透過 Convex 共用 Telegram 憑證 (v1)

當針對 live transport QA 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA lab 會從 Convex 支援的池中取得獨佔租約，在跑道執行期間發送該租約的心跳，並在關機時釋放租約。此章節名稱早於 Discord、Slack 和 WhatsApp 的支援；租約合約在各種類型間共用。

參考 Convex 專案架構：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的一個 secret：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI：`--credential-role maintainer|ci`
  - 環境變數預設值：`OPENCLAW_QA_CREDENTIAL_ROLE`（在 CI 中預設為 `ci`，否則為 `maintainer`）

可選環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS`（預設 `1200000`）
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS`（預設 `30000`）
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS`（預設 `90000`）
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS`（預設 `15000`）
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX`（預設 `/qa-credentials/v1`）
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID`（可選的 trace id）
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅用於本地開發的回送 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應使用 `https://`。

維護者管理員指令（pool add/remove/list）特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時執行之前使用 `doctor` 來檢查 Convex 網站 URL、broker secrets、
端點前綴、HTTP 逾時以及 admin/list 的連線狀態，而不會印出
secret 值。在腳本和 CI
工具中使用 `--json` 以取得機器可讀的輸出。

預設端點契約（`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`）：

- `POST /acquire`
  - 請求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功：`{ status: "ok", index, data }`
- `POST /heartbeat`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }`（或空的 `2xx`）
- `POST /release`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }`（或為空 `2xx`）
- `POST /admin/add`（僅限維護者秘密）
  - 請求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove`（僅限維護者秘密）
  - 請求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活躍租約守衛：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list`（僅限維護者秘密）
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字型態的 Telegram 聊天 ID 字串。
- `admin/add` 會針對 `kind: "telegram"` 驗證此結構，並拒絕格式錯誤的 payload。

Telegram 真實使用者類型的 Payload 結構：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必須是數字字串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必須是 SHA-256 十六進位字串。
- `kind: "telegram-user"` 代表一個 Telegram 傳號帳戶。請將租約視為整個帳戶的層級：TDLib CLI 驅動程式和 Telegram Desktop 視覺見證會從相同的 payload 還原，且同一時間只能有一個任務持有該租約。

Telegram 真實使用者租約還原：

```bash
tmp=$(mktemp -d /tmp/openclaw-telegram-user.XXXXXX)
node --import tsx scripts/e2e/telegram-user-credential.ts lease-restore \
  --user-driver-dir "$tmp/user-driver" \
  --desktop-workdir "$tmp/desktop" \
  --lease-file "$tmp/lease.json"
TELEGRAM_USER_DRIVER_STATE_DIR="$tmp/user-driver" \
  uv run ~/.codex/skills/custom/telegram-e2e-bot-to-bot/scripts/user-driver.py status --json
node --import tsx scripts/e2e/telegram-user-credential.ts release --lease-file "$tmp/lease.json"
```

當需要視覺錄影時，請搭配 `Telegram -workdir "$tmp/desktop"` 使用還原的 Desktop 設定檔。在本機操作員環境中，如果缺少處理程序環境變數，`scripts/e2e/telegram-user-credential.ts` 預設會讀取 `~/.codex/skills/custom/telegram-e2e-bot-to-bot/convex.local.env`。

Agent 驅動的 Crabbox 工作階段：

```bash
pnpm qa:telegram-user:crabbox -- start \
  --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz \
  --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json \
  --text /status
pnpm qa:telegram-user:crabbox -- finish \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` 會租用 `telegram-user` 憑證，將相同的帳戶還原到 Crabbox Linux 桌面機上的 TDLib 和 Telegram Desktop，從當前的 checkout 啟動本機模擬 SUT gateway，開啟可見的 Telegram 聊天，開始桌面錄影，並寫入私有的 `session.json`。在工作階段存續期間，agent 可以持續測試直到滿意為止：

- `send --session <file> --text <message>` 透過真實的 TDLib 使用者發送訊息並等待 SUT 回覆。
- `run --session <file> -- <remote command>` 在 Crabbox 上執行任意命令並儲存其輸出，例如 `bash -lc 'source /tmp/openclaw-telegram-user-crabbox/env.sh && python3 /tmp/openclaw-telegram-user-crabbox/user-driver.py transcript --limit 20 --json'`。
- `screenshot --session <file>` 擷取目前可見的桌面。
- `status --session <file>` 列印租約和 WebVNC 命令。
- `finish --session <file>` 停止錄製器、擷取螢幕截圖/影片/動態修剪構件、釋放 Convex 憑證、停止本機 SUT 程序，並停止 Crabbox 租約，除非傳遞了 `--keep-box`。
- `publish --session <file> --pr <number>` 預設會發佈僅包含 GIF 的 PR 註解。僅在有意需要日誌或 JSON 構件時才傳遞 `--full-artifacts`。

為了確定的視覺化重現，請將 `--mock-response-file <path>` 傳遞給 `start` 或單一指令 `probe` 簡寫。執行器預設使用標準 Crabbox 類別、24fps 錄製、24fps 動態 GIF 預覽和 1920px GIF 寬度。僅在證明需要不同的擷取設定時，才使用 `--class`、`--record-fps`、`--preview-fps` 和 `--preview-width` 覆寫。

單一指令 Crabbox 證明：

```bash
pnpm qa:telegram-user:crabbox -- --text /status
```

預設的 `probe` 指令是一個 start/send/finish 週期的簡寫。將其用於快速 `/status` 冒煙測試。對於 PR 審查、錯誤重現工作，或代理在決定證明完成前需要數分鐘任意實驗的任何情況，請使用會話指令。使用 `--id <cbx_...>` 重用溫暖的桌面租約，使用 `--keep-box` 在完成後保持 VNC 開啟，使用 `--desktop-chat-title <name>` 選擇可見的聊天，以及當使用預先製作的 Linux `libtdjson.so` 存檔而不是在新機器上建置 TDLib 時，使用 `--tdlib-url <tgz>`。執行器會使用 `--tdlib-sha256 <hex>` 或預設的同層級 `<url>.sha256` 檔案驗證 `--tdlib-url`。

經 Broker 驗證的多頻道負載：

- Discord：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack 頻道也可以從集區租用，但 Slack payload 驗證目前位於 Slack QA runner 而非 broker 中。請對 Slack rows 使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`。

### 將頻道加入 QA

新通道配接器的架構和場景輔助名稱位於 [QA overview → Adding a channel](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低要求：在共用的 `qa-lab` host seam 上實作傳輸 runner，在外掛清單中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下編寫場景。

## 測試套件 (在哪裡執行什麼)

將這些套件視為「逐漸增加的真實性」（以及逐漸增加的不穩定性/成本）：

### 單元 / 整合 (預設)

- 指令：`pnpm test`
- 設定：無目標執行使用 `vitest.full-*.config.ts` 分片集，並可能將多專案分片擴展為個別專案設定以進行平行排程
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit 清單；UI 單元測試在專用的 `unit-ui` 分片中執行
- 範圍：
  - 純單元測試
  - 程序內整合測試 (gateway auth、routing、tooling、parsing、config)
  - 已知錯誤的決定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
  - Resolver 和公開 surface loader 測試必須使用產生的微型 plugin fixture 證明廣泛的 `api.js` 和
    `runtime-api.js` 後援行為，而非
    真實的打包插件來源 API。真實的插件 API 載入屬於
    插件擁有的合約/整合套件。

原生相依性策略：

- 預設測試安裝會跳過選用的原生 Discord opus 建置。Discord 語音接收使用純 JS 的 `opusscript` 解碼器，而 `@discordjs/opus` 在 `allowBuilds` 中保持停用，因此本機測試和 Testbox lanes 不會編譯原生 addon。
- 如果您有意需要比較原生的 opus 建置，請使用專用的 Discord 語音效能或 live lane。不要在預設的 `allowBuilds` 中將 `@discordjs/opus` 設為 `true`；這會讓不相關的安裝/測試迴圈編譯原生程式碼。

<AccordionGroup>
  <Accordion title="專案、分片與範圍通道">

    - 未指定目標的 `pnpm test` 會執行十二個較小的分片設定 (`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`)，而不是一個巨大的原生根專案程序。這可以降低負載機器上的峰值 RSS，並避免自動回應/擴充功能工作導致不相關套件飢餓。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監看迴圈並不實用。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先將明確的檔案/目錄目標透過範圍通道路由，以便 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 避免支付完整的根專案啟動成本。
    - `pnpm test:changed` 預設會將變更的 git 路徑擴充為低成本的範圍通道：直接測試編輯、同級 `*.test.ts` 檔案、明確來源對應以及本機匯入圖相依項。除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否則設定/設定檔/套件編輯不會廣泛執行測試。
    - `pnpm check:changed` 是狹窄工作的常智慧本地檢查閘道。它會將差異分類為核心、核心測試、擴充功能、擴充功能測試、應用程式、文件、發行中繼資料、Live Docker 工具和工具，然後執行相符的型別檢查、Lint 和 Guard 指令。它不會執行 Vitest 測試；請呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試驗證。僅發行中繼資料的版本升級會執行目標版本/設定/根相依項檢查，並設有防護機制，拒絕頂層版本欄位以外的套件變更。
    - Live Docker ACP 線束編輯會執行焦點檢查：Live Docker 驗證指令碼的 Shell 語法以及 Live Docker 排程器試執行。`package.json` 變更僅在差異僅限於 `scripts["test:docker:live-*"]` 時才會納入；相依項、匯出、版本和其他套件層級編輯仍使用廣泛的防護機制。
    - 來自代理程式、指令、外掛程式、自動回應輔助程式、`plugin-sdk` 和類似純公用程式區域的輕量匯入單元測試會透過 `unit-fast` 通道路由，這會跳過 `test/setup-openclaw-runtime.ts`；有狀態/執行時期沉重的檔案則留在現有通道上。
    - 選定的 `plugin-sdk` 和 `commands` 輔助程式來源檔案也會將變更模式執行對應到這些輕量通道中的明確同級測試，因此輔助程式編輯可避免為該目錄重新執行完整的沉重套件。
    - `auto-reply` 有頂層核心輔助程式、頂層 `reply.*` 整合測試和 `src/auto-reply/reply/**` 子樹的專用貯體。CI 會將回應子樹進一步分割為 agent-runner、dispatch 和 commands/state-routing 分片，以便單一匯入密集的貯體不會佔用完整的 Node 尾部。
    - 正常的 PR/main CI 會刻意跳過擴充功能批次掃描和僅發行 `agentic-plugins` 分片。完整的發行驗證會在發行候選版本上，針對這些外掛程式/擴充功能繁重的套件分派單獨的 `Plugin Prerelease` 子工作流程。

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - 當您變更 message-tool 探索輸入或壓縮執行時語境時，請保持這兩個層級的覆蓋率。
    - 針對純路由和正規化邊界，新增專注的輔助迴歸測試。
    - 維護 embedded runner 整合測試套件的健全性：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 這些測試套件會驗證 scoped id 與壓縮行為仍然能透過真正的 `run.ts` / `compact.ts` 路徑流動；僅有輔助程式的測試並不足以取代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共用的 Vitest 設定固定了 `isolate: false`，並在根專案、e2e 和 live 設定之間使用非隔離的 runner。
    - 根 UI lane 保持其 `jsdom` 設定和最佳化工具，但也會在共用的非隔離 runner 上執行。
    - 每個 `pnpm test` 分片都會從共用 Vitest 設定繼承相同的 `threads` + `isolate: false`
      預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node
      程序新增 `--no-maglev`，以減少大型本地執行期間的 V8 編譯反覆消耗。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以與原生 V8
      行為進行比較。

  </Accordion>

  <Accordion title="快速本地迭代">

    - `pnpm changed:lanes` 顯示變更觸發了哪些架構通道。
    - 預提交僅執行格式化。它會重新暫存已格式化的檔案，
      且不執行 lint、typecheck 或測試。
    - 當您需要智慧本地檢查閘道時，請在移交或推送前明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設透過低成本的範圍通道路由。僅當代理程式
      決定對 harness、設定、套件或合約的編輯確實需要更廣泛的
      Vitest 覆蓋率時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由
      行為，只是具有更高的 worker 上限。
    - 本地 worker 自動擴展是有意保持保守的，當主機平均負載已經很高時會後退，
      因此預設情況下多個並發的 Vitest 執行造成的損害較小。
    - 基礎 Vitest 設定將專案/設定檔標記為
      `forceRerunTriggers`，以便當測試
      接線變更時，變更模式下的重新執行保持正確。
    - 該設定在支援的
      主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要
      一個明確的快取位置以進行直接剖析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="效能調試">

    - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及
      匯入細分輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析視圖範圍限定為
      自 `origin/main` 以來變更的檔案。
    - 分片計時資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整設定執行使用設定路徑作為鍵值；包含模式 CI
      分片會附加分片名稱，以便單獨追蹤
      已過濾的分片。
    - 當某個熱門測試仍然將大部分時間花費在啟動匯入上時，
      請將繁重的相依性放在狹窄的本地 `*.runtime.ts` 縫隙之後，並
      直接模擬該縫隙，而不是深層匯入執行時期輔助函式
      只是為了將其傳遞給 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 比較
      路由後的 `test:changed` 與該提交差異
      的原生根專案路徑，並列印實際執行時間以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過將變更檔案清單路由透過
      `scripts/test-projects.mjs` 和根 Vitest 設定，對
      當前臟樹進行基準測試。
    - `pnpm test:perf:profile:main` 為
      Vitest/Vite 啟動和轉換開銷撰寫主執行緒 CPU 分析資料。
    - `pnpm test:perf:profile:runner` 在
      停用檔案平行處理的情況下，為單元套件撰寫執行器 CPU+堆積分析資料。

  </Accordion>
</AccordionGroup>

### 穩定性 (gateway)

- 指令：`pnpm test:stability:gateway`
- 設定：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 預設啟用診斷功能，啟動真實的 loopback Gateway
  - 透過診斷事件路徑驅動合成 gateway 訊息、記憶體和大型負載變動
  - 透過 Gateway WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持久性輔助函式
  - 斷言記錄器保持有界、合成 RSS 樣本保持在壓力預算之下，且每個會話的佇列深度會排空回歸零
- 預期：
  - CI 安全且無金鑰
  - 追蹤穩定性回歸的狹窄通道，而非完整 Gateway 套件的替代品

### E2E (gateway smoke)

- 指令：`pnpm test:e2e`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時預設值：
  - 使用帶有 `isolate: false` 的 Vitest `threads`，與 repo 的其餘部分相符。
  - 使用自適應 workers（CI：最多 2 個，本地：預設 1 個）。
  - 預設以靜默模式執行以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 可強制設定 worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 可重新啟用詳細的主控台輸出。
- 範圍：
  - 多執行個體 gateway 端對端行為
  - WebSocket/HTTP 介面、節點配對以及較繁重的網路操作
- 預期：
  - 在 CI 中執行（當在 pipeline 中啟用時）
  - 不需要真實的金鑰
  - 移動部分比單元測試多（可能較慢）

### E2E：OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動一個隔離的 OpenShell gateway
  - 從暫存的本機 Dockerfile 建立一個 sandbox
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過 sandbox fs 橋接器驗證 remote-canonical 檔案系統行為
- 預期：
  - 僅供選用；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用隔離的 `HOME` / `XDG_CONFIG_HOME`，接著銷毀測試 gateway 與 sandbox
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 可在手動執行更廣泛的 e2e suite 時啟用此測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 可指定非預設的 CLI binary 或包裝腳本

### Live (真實 providers + 真實 models)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設：由 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此 provider/model 在使用真實憑證的情況下，今天真的能運作嗎？」
  - 捕捉 provider 格式變更、tool-calling 怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定性（真實網路、真實供應商策略、配額、服務中斷）
  - 需要花費金錢/使用速率限制
  - 優先執行縮小的子集而非「全部」
- Live 執行使用已匯出的 API 金鑰和已暫存的認證設定檔。
- 預設情況下，live 執行仍會隔離 `HOME` 並將設定/認證資料複製到暫存測試目錄中，以免單元夾具修改您真實的 `~/.openclaw`。
- 僅當您刻意需要 live 測試使用您真實的家目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 預設為較安靜的模式：它保留 `[live] ...` 進度輸出，並靜音 gateway bootstrap 日誌/Bonjour 閒談。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換（特定提供者）：使用逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 針對每次即時執行進行覆寫；測試會在收到速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會發出進度行至 stderr，因此即使 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，讓提供者/閘道的進度行在即時執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整閘道/探測心跳。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果變更很多則執行 `pnpm test:coverage`）
- 涉及閘道網路功能/WS 協定/配對：新增 `pnpm test:e2e`
- 除錯「我的機器人當機」/ 特定提供者失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live（涉及網路）測試

關於即時模型矩陣、CLI 後端冒煙測試、ACP 冒煙測試、Codex app-server
harness，以及所有媒體提供者即時測試（Deepgram、BytePlus、ComfyUI、影像、
音樂、影片、媒體 harness）——加上即時執行的憑證處理——請參閱
[測試即時套件](/zh-Hant/help/testing-live)。關於專用的更新和
插件驗證檢查清單，請參閱
[測試更新與插件](/zh-Hant/help/testing-updates-plugins)。

## Docker 執行器（可選的「適用於 Linux」檢查）

這些 Docker 執行器分為兩類：

- 即時模型執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在儲存庫 Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其相符的設定檔金鑰即時檔案，並掛載您的本機設定目錄、工作區和可選的設定檔環境檔案。相符的本機進入點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 執行器預設使用較小的 smoke 上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您明確想要進行較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次 live Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，然後建構/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅包含用於 install/update/plugin-dependency lanes 的 Node/Git 執行器；這些 lanes 會掛載預先建構的 tarball。Functional 映像檔則將相同的 tarball 安裝到 `/app` 中，以用於 built-app functionality lanes。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計劃。Aggregator 使用加權的本機排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制程序插槽，而資源上限則防止繁重的 live、npm-install 和 multi-service lanes 同時啟動。如果單一 lane 的負載高於目前上限，排程器仍可集區為空時啟動它，然後讓其單獨執行直到容量恢復可用。預設值為 10 個插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時，才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。執行器預設會執行 Docker preflight，移除過時的 OpenClaw E2E 容器，每 30 秒列印狀態，將成功的 lane 執行時間儲存在 `.artifacts/docker-tests/lane-timings.json` 中，並在後續執行時利用這些時間優先啟動較長的 lanes。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 來列印加權 lane 清單而不建構或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 來列印所選 lanes、套件/映像需求及認證的 CI 計劃。
- `Package Acceptance` 是 GitHub 原生套件閘道，用於驗證「此可安裝 tarball 是否能作為產品正常運作？」。它會從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該特定 tarball 執行可重複使用的 Docker E2E 通道，而不是重新打包所選的引用。設定檔按廣度排序：`smoke`、`package`、`product` 和 `full`。請參閱[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)以了解套件/更新/外掛合約、已發布升級存取者矩陣、發行預設值及失敗分流。
- 建置與發行檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。此防護機制會從 `dist/entry.js` 和 `dist/cli/run-main.js` 遍歷靜態建置圖形，若在分派指令前於啟動階段匯入 Commander、prompt UI、undici 或 logging 等套件相依性，即會失敗；它也會將打包後的 gateway 執行區塊控制在預算內，並拒絕對已知冷路徑 gateway 的靜態匯入。打包的 CLI 測試也涵蓋根目錄說明、入門說明、診斷說明、狀態、設定架構以及 model-list 指令。
- 套件驗收的舊版相容性上限為 `2026.4.25`（含 `2026.4.25-beta.*`）。在該截止版本之前，測試架構僅容忍已發佈套件的 metadata 遺漏：遺漏的私人 QA 清單項目、缺失的 `gateway install --wrapper`、衍生自 tarball 的 git fixture 中遺漏的修補檔案、遺漏的已持續化 `update.channel`、舊版外掛安裝記錄位置、遺漏的 marketplace 安裝記錄持續性，以及在 `plugins update` 期間的設定 metadata 遷移。對於 `2026.4.25` 之後的套件，這些路徑均屬嚴重失敗。
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix`, 和 `test:docker:config-reload` 啟動一個或多個真實容器並驗證更高層級的整合路徑。

即時模型 Docker 執行器也只會 bind-mount 所需的 CLI 認證主目錄（或者在執行範圍未縮小時掛載所有支援的目錄），然後在執行前將其複製到容器主目錄中，以便外部 CLI OAuth 可以重新整理權杖，而無需變更主機認證儲存區：

- Direct models: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; 預設覆蓋 Claude、Codex 和 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 嚴格覆蓋 Droid/OpenCode)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke: `pnpm qa:otel:smoke` 是一個私有的 QA source-checkout lane。它故意不包含在 package Docker release lanes 中，因為 npm tarball 省略了 QA Lab。
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，透過 env-ref onboarding 預設設定 OpenAI 以及 Telegram，執行 doctor，並執行一次模擬的 OpenAI agent 週期。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 與 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切換通道。

- Release user journey smoke: `pnpm test:docker:release-user-journey` 會在一個乾淨的 Docker home 中全域安裝打包好的 OpenClaw tarball，執行 onboarding，設定一個模擬的 OpenAI provider，執行 agent 週期，安裝/解除安裝外掛程式，針對本地 fixture 設定 ClickClack，驗證輸出/輸入訊息，重新啟動 Gateway，並執行 doctor。
- Release typed onboarding smoke: `pnpm test:docker:release-typed-onboarding` 會安裝打包好的 tarball，透過真實 TTY 驅動 `openclaw onboard`，將 OpenAI 設定為 env-ref provider，驗證沒有原始金鑰持久化，並執行模擬的 agent 週期。
- Release media/memory smoke: `pnpm test:docker:release-media-memory` 會安裝打包好的 tarball，驗證來自 PNG 附件的圖片理解、OpenAI 相容的圖片生成輸出、記憶體搜尋召回，以及 Gateway 重新啟動後的召回存活。
- Release upgrade user journey smoke: `pnpm test:docker:release-upgrade-user-journey` 預設會安裝 `openclaw@latest`，在已發布的套件上設定 provider/plugin/ClickClack 狀態，升級至候選 tarball，然後重新執行核心 agent/plugin/channel 旅程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆寫基準。
- Release plugin marketplace smoke: `pnpm test:docker:release-plugin-marketplace` 會從本地 fixture marketplace 安裝，更新已安裝的外掛程式，將其解除安裝，並驗證外掛程式 CLI 隨安裝元資料修剪而消失。
- Skill install smoke: `pnpm test:docker:skill-install` 在 Docker 中全域安裝打包好的 OpenClaw tarball，在設定中停用已上傳的 archive 安裝，從搜尋解析目前 live ClawHub skill slug，使用 `openclaw skills install` 安裝它，並驗證已安裝的 skill 以及 `.clawhub` origin/lock 中繼資料。
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` 在 Docker 中全域安裝打包好的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證持久化的 channel 和外掛更新後的運作，然後切換回 package `stable` 並檢查更新狀態。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` 將打包好的 OpenClaw tarball 安裝在一個包含 agents、channel config、plugin allowlists、陳舊的 plugin dependency 狀態以及既有 workspace/session files 的 dirty old-user fixture 上。它在沒有 live provider 或 channel keys 的情況下執行 package update 和非互動式 doctor，然後啟動 loopback Gateway 並檢查 config/state 的保留以及啟動/狀態的預算。
- 已發布升級存留者測試：`pnpm test:docker:published-upgrade-survivor` 預設安裝 `openclaw@latest`，植入真實的現有使用者檔案，使用內建的指令配方設定該基準，驗證產生的設定，將該已發布的安裝更新為候選 tarball，執行非互動式 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動一個迴路 Gateway 並檢查已設定的 intents、狀態保留、啟動、`/healthz`、`/readyz` 和 RPC 狀態預算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫一個基準，要求聚合排程器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）擴展精確的本機基準，並使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）擴展 issue-shaped fixtures；回報的問題集包含 `configured-plugin-installs`，用於自動修復外部 OpenClaw 外掛程式安裝。Package Acceptance 將其公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基準 token（例如 `last-stable-4` 或 `all-since-2026.4.23`），而 Full Release Validation 則將 release-soak package gate 擴展為 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- Session runtime context 測試：`pnpm test:docker:session-runtime-context` 驗證隱藏的 runtime context 文字記錄持久性，以及 doctor 對受影響的重複 prompt-rewrite 分支的修復。
- Bun 全域安裝測試：`bash scripts/e2e/bun-global-install-smoke.sh` 打包當前樹狀結構，在隔離的 home 目錄中使用 `bun install -g` 進行安裝，並驗證 `openclaw infer image providers --json` 回傳打包的圖像提供者而非卡住。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建置，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從已建置的 Docker 映像複製 `dist/`。
- 安裝程式 Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共享一個 npm 快取。Update smoke 預設以 npm `latest` 作為升級到候選 tarball 之前的穩定基線。可以在本機使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆寫，或在 GitHub 上使用 Install Smoke workflow 的 `update_baseline_version` 輸入。非 root 安裝程式檢查會保持獨立的 npm 快取，因此 root 擁有的快取條目不會掩蓋使用者本機的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本地重新執行時重用 root/update/direct-npm 快取。
- Install Smoke CI 使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要 direct `npm install -g` 覆蓋率時，請在本地不帶該環境變數的情況下執行腳本。
- Agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace` (腳本: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設建構 root Dockerfile 映像檔，在獨立的容器 home 中為兩個 agents 植入一個 workspace，執行 `agents delete --json`，並驗證有效的 JSON 以及保留的 workspace 行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重用 install-smoke 映像檔。
- Gateway networking (兩個容器, WS auth + health)：`pnpm test:docker:gateway-network` (腳本: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke：`pnpm test:docker:browser-cdp-snapshot` (腳本: `scripts/e2e/browser-cdp-snapshot-docker.sh`) 建構來源 E2E 映像檔加上 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP role 快照涵蓋連結 URL、游標提升的可點擊元素、iframe 參照和 frame 中繼資料。
- OpenAI Responses web_search minimal reasoning regression：`pnpm test:docker:openai-web-search-minimal` (腳本: `scripts/e2e/openai-web-search-minimal-docker.sh`) 透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制供應商 schema 拒絕並檢查原始詳細資訊是否出現在 Gateway 日誌中。
- MCP 通道橋接器（已植入的 Gateway + stdio 橋接器 + 原始 Claude 通知幀冒煙測試）：`pnpm test:docker:mcp-channels` (腳本： `scripts/e2e/mcp-channels-docker.sh`)
- Pi 捆綁 MCP 工具（真實 stdio MCP 伺服器 + 嵌入式 Pi 設定檔允許/拒絕冒煙測試）：`pnpm test:docker:pi-bundle-mcp-tools` (腳本： `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/子代理 MCP 清理（真實 Gateway + stdio MCP 子程序在獨立 cron 和一次性子代理運行後的拆解）：`pnpm test:docker:cron-mcp-cleanup` (腳本： `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 外掛程式（本地路徑、`file:`、具有提升依賴關係的 npm 註冊表、格式錯誤的 npm 套件元數據、git 移動參照、ClawHub 百寶箱、市集更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試）： `pnpm test:docker:plugins` (腳本： `scripts/e2e/plugins-docker.sh`)
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆寫預設的百寶箱套件/運行時對。如果沒有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，測試將使用封閉的本地 ClawHub fixture 伺服器。
- 外掛程式更新未變更冒煙測試： `pnpm test:docker:plugin-update` (腳本： `scripts/e2e/plugin-update-unchanged-docker.sh`)
- 外掛程式生命週期矩陣冒煙測試： `pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安裝打包的 OpenClaw tarball，安裝 npm 外掛程式，切換啟用/停用，透過本地 npm 註冊表升級和降級它，刪除已安裝的程式碼，然後驗證解除安裝仍會移除過時狀態，同時記錄每個生命週期階段的 RSS/CPU 指標。
- 設定重新載入元數據冒煙測試： `pnpm test:docker:config-reload` (腳本： `scripts/e2e/config-reload-source-docker.sh`)
- 外掛程式： `pnpm test:docker:plugins` 涵蓋本地路徑、`file:`、具有提升依賴關係的 npm 註冊表、git 移動參照、ClawHub fixture、市集更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試。 `pnpm test:docker:plugin-update` 涵蓋已安裝外掛程式的未變更更新行為。 `pnpm test:docker:plugin-lifecycle-matrix` 涵蓋資源追蹤的 npm 外掛程式安裝、啟用、停用、升級、降級和缺少程式碼的解除安裝。

若要手動預先建置並重複使用共用的功能映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

諸如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` 等特定套件的映像檔覆寫設定在被設定後仍然優先。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共用映像檔時，如果該映像檔尚未在本地，腳本會將其拉取下來。QR 碼與安裝程式 Docker 測試保留自己的 Dockerfile，因為它們驗證的是套件/安裝行為，而不是共用建置應用程式的執行環境。

live-model Docker 執行器也會以唯讀方式掛載目前的 checkout，並將其暫存到容器內的暫時工作目錄中。這讓執行時映像檔保持精簡，同時仍能針對您確切的本地來源/設定執行 Vitest。暫存步驟會跳過大型本地專用快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本地的 `.build` 或 Gradle 輸出目錄，以免 Docker live 執行花費數分鐘複製機器特定的成品。它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，讓 gateway live probes 不會在容器內啟動真實的 Telegram/Discord/等通道工作者。`test:docker:live-models` 仍會執行 `pnpm test:live`，因此當您需要縮小或從該 Docker 軌道排除 gateway live 涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。`test:docker:openwebui` 是較高層級的相容性檢測：它會啟動啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動固定版本的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` 代理傳送真實的聊天請求。針對應在 Open WebUI 登入和模型探索後停止，而不等待 live model 完成的發行版本路徑 CI 檢查，請設定 `OPENWEBUI_SMOKE_MODE=models`。第一次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成自身的冷啟動設定。此軌道需要可用的 live model 金鑰。您可以透過流程環境、已暫存的 auth 設定檔或明確的 `OPENCLAW_PROFILE_FILE` 來提供。成功的執行會列印小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。`test:docker:mcp-channels` 刻意為確定性，不需要真實的 Telegram、Discord 或 iMessage 帳戶。它會啟動帶有種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後驗證路由的對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、傳出傳送路由，以及透過真實 stdio MCP 橋接器的 Claude 風格通道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此檢測驗證的是橋接器實際發出的內容，而不僅是特定客戶端 SDK 恰好呈現的內容。`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP probe server，透過內嵌的 Pi bundle MCP 執行時具現化該 server，執行工具，然後驗證 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 則會將其過濾掉。`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動帶有真實 stdio MCP probe server 的已植入種子 Gateway，執行隔離的 cron 週期和 `/subagents spawn` 一次性子週期，然後驗證 MCP 子程序在每次執行後會結束。

手動 ACP 純語言執行緒冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於迴歸/除錯工作流程。可能需要再次用它來驗證 ACP 執行緒路由，因此請勿刪除。

實用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` （預設：`~/.openclaw`） 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` （預設：`~/.openclaw/workspace`） 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 已掛載並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用臨時的設定/工作區目錄且無外部 CLI 認證掛載
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` （預設：`~/.cache/openclaw/docker-cli-tools`） 掛載至 `/home/node/.npm-global` 以在 Docker 內部快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案會以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄： `.minimax`
  - 預設檔案： `~/.codex/auth.json` 、 `~/.codex/config.toml` 、 `.claude.json` 、 `~/.claude/.credentials.json` 、 `~/.claude/settings.json` 、 `~/.claude/settings.local.json`
  - 縮減的供應商執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all` 、 `OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號分隔列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` ）手動覆寫
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮減執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾供應商
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔，用於不需重新建置的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔儲存（非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇 Gateway 為 Open WebUI 冒煙測試暴露的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用來覆寫 Open WebUI smoke 測試使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用來覆寫固定的 Open WebUI 映像檔標籤

## Docs sanity

在文件編輯後執行文件檢查：`pnpm check:docs`。
當您也需要頁面內標題檢查時，執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線回歸測試 (CI-safe)

這些是沒有真實供應商的「真實管線」回歸測試：

- Gateway 工具呼叫 (模擬 OpenAI、真實 gateway + agent 迴圈)：`src/gateway/gateway.test.ts` (案例："runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway 精靈 (WS `wizard.start`/`wizard.next`，寫入設定 + 強制執行驗證)：`src/gateway/gateway.test.ts` (案例："runs wizard over ws and writes auth token config")

## Agent 可靠性評估

我們已經有一些 CI-safe 測試，其行為類似於「agent 可靠性評估」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫 (`src/gateway/gateway.test.ts`)。
- 驗證 session 連線和配置效果的端對端精靈流程 (`src/gateway/gateway.test.ts`)。

技能 (Skills) 目前仍缺失的部分 (請參閱 [Skills](/zh-Hant/tools/skills))：

- **決策：** 當提示中列出了技能時，agent 是否會選擇正確的技能 (或避免不相關的技能)？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程契約：** 多輪對話情境，用來斷言工具順序、session 歷史傳遞，以及沙箱邊界。

未來的評估應首先保持確定性：

- 使用模擬供應商的情境執行器，以斷言工具呼叫 + 順序、技能檔案讀取和 session 連線。
- 一小套專注於技能的情境 (使用 vs 避免、閘道控制、提示注入)。
- 僅在 CI-safe 測試套件就位後，才進行選用的即時評估 (opt-in、env-gated)。

## 契約測試 (plugin 和 channel 形狀)

合約測試會驗證每個已註冊的外掛和通道都符合其介面合約。它們會迭代所有發現的外掛，並執行一組形狀和行為斷言。預設的 `pnpm test` unit 軌道會刻意跳過這些共享邊界 和基礎測試檔案；當您接觸共享通道或供應商 介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限通道合約：`pnpm test:contracts:channels`
- 僅限供應商合約：`pnpm test:contracts:plugins`

### 通道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀 (id、name、capabilities)
- **setup** - 設定精靈合約
- **session-binding** - Session 繫結行為
- **outbound-payload** - 訊息 payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 通道動作處理器
- **threading** - Thread ID 處理
- **directory** - Directory/roster API
- **group-policy** - 群組原則執行

### 供應商狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 通道狀態探測
- **registry** - 外掛註冊表形狀

### 供應商合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - Auth 流程合約
- **auth-choice** - Auth 選擇/選取
- **catalog** - 模型目錄 API
- **discovery** - 外掛探索
- **loader** - 外掛載入
- **runtime** - 供應商執行時
- **shape** - 外掛形狀/介面
- **wizard** - 設定精靈

### 何時執行

- 變更 plugin-sdk 匯出或子路徑之後
- 新增或修改通道或供應商外掛之後
- 重構外掛註冊或探索之後

合約測試在 CI 中執行，不需要真實的 API 金鑰。

## 新增回歸測試 (指引)

當您修復在 live 環境中發現的供應商/模型問題時：

- 如果可能的話，新增一個 CI 安全的回歸測試 (模擬/存根供應商，或是擷取確切的請求形狀轉換)
- 如果本質上僅限 live (速率限制、驗證策略)，請保持 live 測試範圍狹窄，並透過環境變數選擇加入
- 優先針對能捕捉該錯誤的最小層級：
  - 供應商請求轉換/重播錯誤 → 直接模型測試
  - gateway session/history/tool 管線錯誤 → gateway live 基礎測試或 CI 安全的 gateway mock 測試
- SecretRef 遍歷防護：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從登錄表元資料 (`listSecretTargetRegistryEntries()`) 為每個 SecretRef 類別推導一個採樣目標，然後斷言遍歷區段執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會針對未分類的目標 ID 故意失敗，以確保新類別不會被無聲跳過。

## 相關

- [即時測試](/zh-Hant/help/testing-live)
- [測試更新與外掛](/zh-Hant/help/testing-updates-plugins)
- [CI](/zh-Hant/ci)
