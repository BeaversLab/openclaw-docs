---
summary: "測試套件：單元/e2e/live 套件、Docker 執行器，以及各個測試涵蓋的內容"
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
**QA 技術堆疊 (qa-lab, qa-channel, live transport lanes)** 的文件在另一處：

- [QA 概覽](/zh-Hant/concepts/qa-e2e-automation) - 架構、命令介面、情境撰寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的參考資料。
- [QA 頻道](/zh-Hant/channels/qa-channel) - 由 repo 支援的情境所使用的合成傳輸外掛。

本頁涵蓋了執行一般測試套件和 Docker/Parallels 執行器。下方的特定 QA 執行器章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 呼叫並指向上述參考資料。

</Note>

## 快速入門

大部分時候：

- 完整閘道 (推送前預期執行)：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- 在效能強大的機器上更快的本地完整套件執行：`pnpm test:max`
- 直接 Vitest 監看迴圈：`pnpm test:watch`
- 直接檔案目標現在也會路由擴充功能/頻道路徑：`pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- 當您在處理單一失敗時，請優先使用目標執行。
- Docker 支援的 QA 站台：`pnpm qa:lab:up`
- Linux VM 支援的 QA 通道：`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

當您修改測試或需要更多信心時：

- 覆蓋率閘道：`pnpm test:coverage`
- E2E 套件：`pnpm test:e2e`

當對真實提供者/模型進行除錯時（需要真實憑證）：

- Live 套件 (模型 + gateway 工具/圖像探測)：`pnpm test:live`
- 安靜地以單一 live 檔案為目標：`pnpm test:live -- src/agents/models.profiles.live.test.ts`
- 執行時效能報告：針對真實的 `openai/gpt-5.5``deep_profile=true` agent 回合或
  Kova CPU/heap/trace 成品，使用帶有 `live_openai_candidate=true` 的 `OpenClaw Performance`。當 `CLAWGRIT_REPORTS_TOKEN`
  已設定時，每日排程執行會將 mock-provider、deep-profile 和 GPT 5.5 通道成品發佈到
  `openclaw/clawgrit-reports`。Mock-provider 報告也包含原始碼層級的 gateway 啟動、記憶體、
  外掛壓力、重複的 fake-model hello-loop，以及 CLI 啟動數據。
- Docker live 模型掃描：`pnpm test:docker:live-models`
  - 每個選定的模型現在會執行一次文本輪次加上一個小型文件讀取風格的探測。
    其元數據宣稱支援 `image` 輸入的模型也會執行一個微小的圖像輪次。
    在隔離提供商故障時，請使用 `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` 或
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` 停用額外的探測。
  - CI 覆蓋率：每日 `OpenClaw Scheduled Live And E2E Checks` 和手動
    `OpenClaw Release Checks` 都會呼叫可重複使用的 live/E2E 工作流程，並帶有
    `include_live_suites: true`，其中包括按提供商分割的獨立 Docker live model
    矩陣任務。
  - 若要進行專注的 CI 重新執行，請使用 `include_live_suites: true` 和 `live_models_only: true` 分派 `OpenClaw Live And E2E Checks (Reusable)`。
  - 將新的高信號提供商機密新增到 `scripts/ci-hydrate-live-auth.sh`
    以及 `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` 及其
    定時/發布呼叫端。
- 原生 Codex 綁定聊天煙霧測試：`pnpm test:docker:live-codex-bind`
  - 針對 Codex app-server 路徑執行 Docker live 通道，使用 `/codex bind` 綁定合成
    Slack DM，執行 `/codex fast` 和
    `/codex permissions`，然後驗證純文本回覆和圖像附件
    透過原生插件綁定而不是 ACP 路由。
- Codex app-server 襟具煙霧測試：`pnpm test:docker:live-codex-harness`
  - 透過插件擁有的 Codex app-server 襟具執行 gateway agent 輪次，
    驗證 `/codex status` 和 `/codex models`，並預設執行圖像、
    cron MCP、子代理程式 和 Guardian 探測。在隔離其他 Codex
    app-server 故障時，使用
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` 停用子代理程式探測。若要進行專注的子代理程式檢查，請停用其他探測：
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`。
    除非設定了
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0`，否則這會在子代理程式探測後退出。
- Codex 按需安裝煙霧測試：`pnpm test:docker:codex-on-demand`
  - 在 Docker 中安裝打包好的 OpenClaw tarball，執行 OpenAI API 金鑰
    入職 (onboarding)，並驗證 Codex 外掛以及 `@openai/codex` 依賴
    已按要求下載至受管理的 npm 專案根目錄。
- Live 插件工具相依性煙霧測試：`pnpm test:docker:live-plugin-tool`
  - 打包具有真實 `slugify` 依賴的 fixture 外掛，透過
    `npm-pack:` 進行安裝，驗證受管理的 npm 專案根目錄下的依賴項，
    然後要求即時 OpenAI 模型呼叫外掛工具並傳回隱藏的
    slug。
- Crestodian rescue command smoke: `pnpm test:live:crestodian-rescue-channel`
  - 針對 message-channel rescue command 介面的選用雙重保險檢查。它執行 `/crestodian status`，將持久化模型變更排入佇列，回覆 `/crestodian yes`，並驗證 audit/config 寫入路徑。
- Crestodian planner Docker smoke: `pnpm test:docker:crestodian-planner`
  - 在 `PATH` 上的無配置容器中，使用偽造的 Claude CLI 執行 Crestodian，並驗證模糊規劃器備選方案是否轉化為經過審計的類型化配置寫入。
- Crestodian first-run Docker smoke: `pnpm test:docker:crestodian-first-run`
  - 從空的 OpenClaw 狀態目錄開始，驗證現代化的板載 Crestodian 入口點，應用 setup/model/agent/Discord plugin + SecretRef 寫入，驗證配置，並驗證 audit 條目。QA Lab 中的 `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup` 也涵蓋了相同的 Ring 0 設定路徑。
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
- `pnpm openclaw qa coverage --match <query>`
  - 搜尋情境 ID、標題、介面、覆蓋範圍 ID、文件參照、程式碼參照、
    外掛和提供者需求，然後列印出符合的套件目標。
  - 在執行 QA Lab 之前使用此工具，當您知道受影響的行為或檔案路徑
    但不知道最小的情境時。這僅供參考；仍需從變更的行為中選擇 mock、
    live、Multipass、Matrix 或 transport proof。
- `pnpm test:plugins:kitchen-sink-live`
  - 透過 QA Lab 執行即時 OpenAI Kitchen Sink 外掛的一系列測試。它
    會安裝外部 Kitchen Sink 套件，驗證外掛 SDK 介面
    清單，探測 `/healthz` 和 `/readyz`，記錄 gateway CPU/RSS
    證據，執行即時 OpenAI 回合，並檢查對抗性診斷。
    需要即時 OpenAI 驗證，例如 `OPENAI_API_KEY`。在已啟用的 Testbox
    工作階段中，當 `openclaw-testbox-env` helper 存在時，
    它會自動載入 Testbox live-auth 設定檔。
- `pnpm test:gateway:cpu-scenarios`
  - 執行 gateway 啟動基準測試以及一個小型模擬 QA Lab 場景包
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`)，並在 `.artifacts/gateway-cpu-scenarios/` 下寫入綜合 CPU 觀測
    摘要。
  - 預設僅標記持續的 CPU 高負載觀測值 (`--cpu-core-warn`
    加上 `--hot-wall-warn-ms`)，因此短暫的啟動激增會被記錄為指標，
    而不會看起來像是長達數分鐘的 gateway 掛載回歸問題。
  - 使用已建置的 `dist` 構件；當 checkout 尚未包含
    全新的執行期輸出時，請先執行建置。
- `pnpm openclaw qa suite --runner multipass`
  - 在一次性 Multipass Linux VM 中執行相同的 QA 套件。
  - 在主機上保持與 `qa suite` 相同的場景選擇行為。
  - 重複使用與 `qa suite` 相同的提供者/模型選擇旗標。
  - Live runs 會轉發對 guest 實用且受支援的 QA 認證輸入：
    基於環境變數的提供者金鑰、QA live 提供者設定路徑，以及存在的 `CODEX_HOME`。
  - 輸出目錄必須保持在 repo 根目錄下，以便 guest 能透過
    掛載的工作區寫回資料。
  - 在 `.artifacts/qa-e2e/...` 下寫入正常的 QA 報告 + 摘要以及 Multipass 日誌。
- `pnpm qa:lab:up`
  - 啟動 Docker 支援的 QA 站台以進行操作員風格的 QA 工作。
- `pnpm test:docker:npm-onboard-channel-agent`
  - 從目前的 checkout 建置 npm tarball，在 Docker 中全域安裝它，
    執行非互動式 OpenAI API 金鑰入門，預設設定 Telegram，
    驗證打包的 plugin runtime 在沒有啟動相依性修復的情況下載入，
    執行 doctor，並對模擬的 OpenAI 端點執行一個本機 agent 輪次。
  - 使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 透過 Discord 執行相同的打包安裝
    流程。
- `pnpm test:docker:session-runtime-context`
  - 針對嵌入式執行期內容逐字稿執行確定性建置應用程式 Docker 測試。它會驗證
    隱藏的 OpenClaw 執行期內容被持久化為非顯示自訂訊息，而不是洩漏到
    可見的使用者輪次中，然後植入受影響的損壞會話 JSONL 並驗證
    `openclaw doctor --fix` 將其重寫到具有備份的現用分支。
- `pnpm test:docker:npm-telegram-live`
  - 在 Docker 中安裝 OpenClaw 套件候選版本，執行已安裝套件的 onboarding，透過已安裝的 CLI 設定 Telegram，然後重用即時 Telegram QA lane，並將該已安裝套件作為 SUT Gateway。
  - 此 wrapper 僅掛載來自 checkout 的 `qa-lab` harness source；已安裝的套件擁有 `dist`、`openclaw/plugin-sdk` 和捆綁的 plugin runtime，因此該 lane 不會將當前 checkout 的 plugins 混入受測套件中。
  - 預設為 `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`；設定 `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` 或 `OPENCLAW_CURRENT_PACKAGE_TGZ` 以測試已解析的本機 tarball，而不是從 registry 安裝。
  - 使用與 `pnpm openclaw qa telegram` 相同的 Telegram 環境憑證或 Convex 憑證來源。針對 CI/release 自動化，請設定 `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` 加上 `OPENCLAW_QA_CONVEX_SITE_URL` 和 role secret。如果 CI 中存在 `OPENCLAW_QA_CONVEX_SITE_URL` 和 Convex role secret，Docker wrapper 會自動選擇 Convex。
  - 此 wrapper 會在 Docker build/install 工作之前，驗證主機上的 Telegram 或 Convex 憑證環境。僅在刻意偵錯憑證前設定時，才設定 `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`。
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` 會覆寫僅用於此 lane 的共享 `OPENCLAW_QA_CREDENTIAL_ROLE`。
  - GitHub Actions 將此 lane 公開為手動維護者工作流程 `NPM Telegram Beta E2E`。它不會在 merge 時執行。此工作流程使用 `qa-live-shared` 環境和 Convex CI 憑證租約。
- GitHub Actions 也公開了 `Package Acceptance`，用於對單一候選套件進行並行產品驗證。它接受受信任的 ref、已發布的 npm spec、HTTPS tarball URL 加上 SHA-256，或來自另一次執行的 tarball artifact，將正規化的 `openclaw-current.tgz` 上傳為 `package-under-test`，然後使用 smoke、package、product、full 或 custom lane 設定檔執行現有的 Docker E2E 排程器。設定 `telegram_mode=mock-openai` 或 `live-frontier` 以對同一個 `package-under-test` artifact 執行 Telegram QA 工作流程。
  - 最新的 beta 產品驗證：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- 確切的 tarball URL 證明需要摘要，並使用公開 URL 安全性原則：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- 企業/私人 tarball 鏡像使用明確的信任來源原則：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 從受信任的工作流程參考讀取 `.github/package-trusted-sources.json`，並不接受 URL 憑證或工作流程輸入的私人網路繞行。如果具名原則宣告了 bearer auth，請設定固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密鑰。

- Artifacts 證明會從另一個 Actions 執行下載 tarball artifact：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 將目前的 OpenClaw 建置打包並安裝到 Docker 中，啟動已設定 OpenAI 的 Gateway，然後透過設定編輯啟用隨附的通道/外掛。
  - 驗證設定探索會保留未設定的可下載外掛為不存在，第一次設定的 doctor 修復會明確安裝每個缺少的可下載外掛，且第二次重新啟動不會執行隱藏的相依性修復。
  - 同時安裝一個已知的舊版 npm 基準，在執行 `openclaw update --tag <candidate>` 前啟用 Telegram，並驗證候選版本的更新後 doctor 會清除舊版外掛相依性殘餘，而不需要 harness 端的 postinstall 修復。
- `pnpm test:parallels:npm-update`
  - 跨 Parallels 客體執行原生打包安裝更新冒煙測試。每個選定的平台會先安裝要求的基準套件，然後在同一個客體中執行已安裝的 `openclaw update` 指令，並驗證安裝的版本、更新狀態、Gateway 就緒狀態以及一個本機 agent 輪次。
  - 在針對一個客體進行反覆運算時，使用 `--platform macos`、`--platform windows` 或 `--platform linux`。使用 `--json` 來取得摘要 artifact 路徑和各通道狀態。
  - OpenAI 通道預設使用 `openai/gpt-5.5` 進行即時 agent 輪次證明。當刻意驗證其他 OpenAI 模型時，請傳遞 `--model <provider/model>` 或設定 `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將長時間的本機執行包裝在主機逾時中，以免 Parallels 傳輸停滯佔用其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 腳本會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀 lane 日誌。
    在假設外層包裝器已卡死之前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能會在冷啟動的客戶機上花費 10 到 15 分鐘進行更新後的診斷和套件更新工作；只要巢狀 npm 偵錯日誌有在推進，這仍然是正常的。
  - 請勿將此彙總包裝器與個別的 Parallels macOS、Windows 或 Linux smoke lanes 並行執行。它們共享 VM 狀態，並可能在還原快照、提供套件或客戶機 gateway 狀態時發生衝突。
  - 更新後的驗證會執行正常的內建插件表面，因為諸如語音、影像生成和媒體理解等功能外觀，即使 agent 輪次本身只檢查簡單的文字回應，也是透過內建執行時期 API 載入的。

- `pnpm openclaw qa aimock`
  - 僅啟動本機 AIMock 提供者伺服器，以進行直接協議的冒煙測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix live QA lane。僅適用於原始碼檢出 - 套件安裝版本不附帶 `qa-lab`。
  - 完整的 CLI、設定檔/情境目錄、環境變數和構件佈局：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 使用來自環境變數的驅動程式和 SUT 機器人權杖，針對真實的私人群組執行 Telegram live QA lane。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數位聊天 ID。
  - 支援 `--credential-source convex` 以使用共用的集區憑證。預設使用環境模式，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇加入集區租用。
  - 預設項目涵蓋 canary、提及閘控、命令定址、`/status`、bot-to-bot 提及回覆，以及核心原生命令回覆。`mock-openai` 預設項目也涵蓋決定性回覆鏈和 Telegram 最終訊息串流回歸測試。請使用 `--list-scenarios` 進行可選探測，例如 `session_status`。
  - 當任何情境失敗時，會以非零結束代碼退出。當您需要構件而不希望因失敗而退出時，請使用 `--allow-failures`。
  - 需要在同一個私人群組中有兩個不同的機器人，且 SUT 機器人會公開 Telegram 用戶名。
  - 為了進行穩定的機器人對機器人觀察，請在 `@BotFather` 中為兩個機器人啟用 Bot-to-Bot 通訊模式，並確保驅動程式機器人可以觀察群組機器人的流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和觀察到的訊息構件。回覆場景包括從驅動程式傳送請求到觀察到 SUT 回覆的 RTT。

`Mantis Telegram Live` 是此管道的 PR 證據包裝器。它使用 Convex 租用的 Telegram 憑證執行候選 ref，在 Crabbox 桌面瀏覽器中呈現經過編輯的觀察訊息紀錄，錄製 MP4 證據，產生動態修剪的 GIF，上傳構件套件，並在設定 `pr_number` 時透過 Mantis GitHub App 張貼內聯 PR 證據。維護者可以透過 `Mantis Scenario` 從 Actions UI 啟動它（`scenario_id:
telegram-live`）或直接從拉取請求評論啟動：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用於 PR 視覺證明的代理原生 Telegram Desktop
前後包裝器。使用自由形式的 `instructions` 從 Actions UI 啟動它，透過 `Mantis Scenario`（`scenario_id:
telegram-desktop-proof`），或從 PR 評論啟動：

```text
@openclaw-mantis telegram desktop proof
```

Mantis 代理會閱讀 PR，決定哪些 Telegram 可見行為可證明變更，在基準和候選 ref 上執行真實使用者 Crabbox Telegram Desktop 證明管道，反覆迭代直到原生 GIF 有用，寫入配對的 `motionPreview` 清單，並在設定 `pr_number` 時透過 Mantis GitHub App 張貼相同的雙欄 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重複使用 Crabbox Linux 桌面，安裝原生 Telegram Desktop，使用租用的 Telegram SUT 機器人權杖設定 OpenClaw，啟動閘道，並從可見的 VNC 桌面錄製螢幕擷圖/MP4 證據。
  - 預設為 `--credential-source convex`，因此工作流程只需要 Convex broker 密鑰。使用 `--credential-source env` 搭配與 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 變數。
  - Telegram Desktop 仍需要使用者登入/設定檔。Bot 權杖僅用於設定 OpenClaw。使用 `--telegram-profile-archive-env <name>` 來指定 base64 `.tgz` 設定檔封存，或使用 `--keep-lease` 並透過 VNC 手動登入一次。
  - 在輸出目錄下寫入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共用一個標準契約，以便新的傳輸不會產生偏離；每個 lane 的覆蓋率矩陣位於 [QA 概觀 → Live transport 覆蓋率](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage) 中。`qa-channel` 是廣泛的合成套件，並不屬於該矩陣的一部分。

### 透過 Convex 共用 Telegram 憑證 (v1)

當針對 live transport QA 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA 實驗室會從由 Convex 支援的池中取得獨租約，在 lane 執行時對該租約發送心跳，並在關閉時釋放租約。此章節名稱早於 Discord、Slack 和 WhatsApp 支援；租約契約在各種類型間共用。

參考 Convex 專案 scaffolding：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的密鑰之一：
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 用於 `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` 用於 `ci`
- 憑證角色選擇：
  - CLI：`--credential-role maintainer|ci`
  - Env 預設值：`OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

選用的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的 trace id)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅限本機開發時使用回傳 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作下應使用 `https://`。

維護者管理指令 (pool add/remove/list) 特別需要
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時運行前使用 `doctor` 以檢查 Convex 網站 URL、broker secret、
端點前綴、HTTP 逾時以及 admin/list 的連線性，而不會印出
secret 值。請在腳本和 CI
工具中使用 `--json` 以取得機器可讀的輸出。

預設端點約定 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

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
- `POST /admin/add` (僅限維護者 secret)
  - 請求： `{ kind, actorId, payload, note?, status? }`
  - 成功： `{ status: "ok", credential }`
- `POST /admin/remove` (僅限維護者 secret)
  - 請求： `{ credentialId, actorId }`
  - 成功： `{ status: "ok", changed, credential }`
  - 作用中租約守衛： `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (僅限維護者 secret)
  - 請求： `{ kind?, status?, includePayload?, limit? }`
  - 成功： `{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字形式的 Telegram chat id 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此結構並拒絕格式錯誤的 payload。

Telegram real-user 類型的 Payload 結構：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必須為數字字串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必須為 SHA-256 十六進位字串。
- `kind: "telegram-user"` 是保留給 Mantis Telegram Desktop proof workflow 的。通用 QA Lab lanes 不得獲取它。

經 Broker 驗證的多通道 payloads：

- Discord：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack lanes 也可以從 pool 中租用，但 Slack payload 驗證目前位於 Slack QA runner 中而非 broker。請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`
用於 Slack rows。

### 將通道加入 QA

新通道適配器的架構和 scenario-helper 名稱位於 [QA overview → Adding a channel](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低門檻：在共享的 `qa-lab` host seam 上實作 transport runner，在 plugin manifest 中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下撰寫 scenarios。

## 測試套件（何處執行何種測試）

將套件視為「遞增的真實性」（以及遞增的不穩定性/成本）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：未指定的執行使用 `vitest.full-*.config.ts` shard set，並可能將多專案 shards 擴展為 per-project configs 以進行並行排程
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit inventories；UI 單元測試在專用的 `unit-ui` shard 中執行
- 範圍：
  - 純單元測試
  - 行程內整合測試（gateway auth、routing、tooling、parsing、config）
  - 已知錯誤的確定性迴歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實的金鑰
  - 應該快速且穩定
  - Resolver 和 public-surface loader 測試必須透過生成的微小 plugin fixtures 證明廣泛的 `api.js` 和
    `runtime-api.js` 後備行為，而非
    真實的打包外掛原始 API。真實的外掛 API 載入屬於
    外掛擁有的 contract/integration 套件。

原生相依性原則：

- 預設測試安裝會略過可選的原生 Discord opus 建置。Discord 語音使用內建的 `libopus-wasm`，且 `@discordjs/opus` 在 `allowBuilds` 中保持停用，因此本地測試和 Testbox 軌道不會編譯原生附加元件。
- 請在 `libopus-wasm` 基準測試 repo 中比較原生 opus 效能，而不是在預設的 OpenClaw 安裝/測試迴圈中。請勿在預設的 `allowBuilds` 中將 `@discordjs/opus` 設為 `true`；這會讓無關的安裝/測試迴圈編譯原生程式碼。

<AccordionGroup>
  <Accordion title="專案、分片與範圍通道">

    - 無目標 `pnpm test` 會執行十二個較小的分片設定 (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`)，而不是單一的巨型原生根專案程序。這能降低高負載機器上的尖峰 RSS，並避免自動回覆/擴充套件工作使不相關的套件挨餓。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監看迴圈不切實際。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會將明確的檔案/目錄目標優先透過範圍通道路由，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免支付完整的根專案啟動成本。
    - `pnpm test:changed` 預設會將變更的 git 路徑擴展為低成本的範圍通道：直接測試編輯、同層 `*.test.ts` 檔案、明確來源對應，以及本機匯入圖相依項。設定/建置/套件編輯不會廣泛執行測試，除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm check:changed` 是用於狹窄工作的常規智慧本機檢查閘道。它會將差異分類為核心、核心測試、擴充套件、擴充套件測試、應用程式、文件、發行元資料、Live Docker 工具以及工具，然後執行相符的型別檢查、Lint 和 Guard 指令。它不會執行 Vitest 測試；請呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 以取得測試證明。僅發行元資料的版本遞增會執行目標版本的版本/設定/根相依項檢查，並具備 Guard，可拒絕頂層版本欄位以外的套件變更。
    - Live Docker ACP 結具編輯會執行聚焦檢查：Live Docker 驗證指令碼的 Shell 語法，以及 Live Docker 排程器的試執行。`package.json` 變更僅在差異限於 `scripts["test:docker:live-*"]` 時才包含在內；相依項、匯出、版本和其他套件介面編輯仍使用更廣泛的 Guards。
    - 來自 Agents、Commands、Plugins、自動回覆助手、`plugin-sdk` 和類似純公用程式區域的低匯入單元測試，會透過 `unit-fast` 通道路由，該通道會跳過 `test/setup-openclaw-runtime.ts`；具狀態/繁重執行時期的檔案則保留在現有通道上。
    - 選定的 `plugin-sdk` 和 `commands` 助手來源檔案也會將變更模式執行對應到那些輕量通道中的明確同層測試，因此助手編輯可避免為該目錄重新執行完整的繁重套件。
    - `auto-reply` 具有專用儲存區，用於頂層核心助手、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。CI 會進一步將 reply 子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片，因此單一繁重匯入的儲存區不會擁有完整的 Node 結尾。
    - 一般 PR/main CI 會刻意略過擴充套件批次掃描和僅限發行的 `agentic-plugins` 分片。完整發行驗證會針對那些外掛/擴充套件繁重的套件在發行候選版本上分派獨立的 `Plugin Prerelease` 子工作流程。

  </Accordion>

  <Accordion title="嵌入式執行器覆蓋範圍">

    - 當您變更訊息工具探索輸入或壓縮執行時語境時，請保持兩個層級的覆蓋範圍。
    - 針對純路由與正規化邊界，新增專注的輔助回歸測試。
    - 保持嵌入式執行器整合套件的健全性：
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`、
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts` 和
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`。
    - 這些套件用於驗證作用域 ID 與壓縮行為仍能透過真實的 `run.ts` / `compact.ts` 路徑流動；僅靠輔助測試不足以取代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool 與隔離預設值">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共用的 Vitest 設定固定 `isolate: false`，並在根專案、e2e 與 live 設定之間使用非隔離執行器。
    - 根 UI 通道保留其 `jsdom` 設定與優化器，但同樣在共用的非隔離執行器上執行。
    - 每個 `pnpm test` 分片都會從共用 Vitest 設定繼承相同的 `threads` + `isolate: false`
      預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本機執行期間的 V8 編譯迴圈。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 可與標準 V8 行為進行比較。
    - `scripts/run-vitest.mjs` 會在 5 分鐘內沒有 stdout 或 stderr 輸出時終止明確的非監看 Vitest 執行。設定
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` 可針對刻意靜默的調查停用看門狗。

  </Accordion>

  <Accordion title="快速本機迭代">

    - `pnpm changed:lanes` 會顯示差異觸發了哪些架構通道。
    - Pre-commit hook 僅負責格式化。它會重新暫存格式化後的檔案，
      且不會執行 lint、typecheck 或測試。
    - 當你需要智慧的本機檢查閘道時，請在交接或推送前
      明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設會透過低成本的作用域通道進行路由。僅當 agent
      判定 harness、config、package 或合約編輯真的需要更廣泛的
      Vitest 涵蓋範圍時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由
      行為，只是具有更高的 worker 上限。
    - 本機 worker 自動擴展被有意設計得較為保守，且當主機負載平均值
      已經很高時會退讓，因此預設情況下多個並發的
      Vitest 執行所造成的損害較小。
    - 基礎 Vitest 設定會將專案/設定檔標記為
      `forceRerunTriggers`，以便當測試
      接線變更時，變更模式下的重新執行保持正確。
    - 該設定會在支援的主機上保持啟用
      `OPENCLAW_VITEST_FS_MODULE_CACHE`；如果你想要
      一個明確的快取位置以進行直接分析，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` 啟用 Vitest import-duration 報告以及
      import-breakdown 輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析視圖限定在
      自 `origin/main` 以來變更的檔案。
    - 分片計時資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整配置執行使用配置路徑作為鍵；include-pattern CI
      分片會附加分片名稱，以便獨立追蹤已過濾的分片。
    - 當某個熱門測試仍然將大部分時間花費在啟動導入時，
      請將繁重的依賴項保留在狹窄的本地 `*.runtime.ts` 縫隙之後，
      並直接 mock 該縫隙，而不是深度導入運行時輔助程式
      僅為了將其傳遞給 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由的
      `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印牆時間和 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過 `scripts/test-projects.mjs`
      和根 Vitest 配置路由變更的檔案列表，來對當前的髒樹進行基準測試。
    - `pnpm test:perf:profile:main` 為
      Vitest/Vite 啟動和轉換開銷寫入主執行緒 CPU 分析檔案。
    - `pnpm test:perf:profile:runner` 為停用檔案並行處理的
      unit suite 寫入 runner CPU+heap 分析檔案。

  </Accordion>
</AccordionGroup>

### 穩定性 (gateway)

- 指令：`pnpm test:stability:gateway`
- 配置：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 啟動一個預設啟用診斷功能的真實 loopback Gateway
  - 透過診斷事件路徑驅動合成的 gateway 訊息、記憶體和大負載變動
  - 透過 Gateway WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持久化輔助程式
  - 斷言錄音器保持受限、合成 RSS 樣本保持在壓力預算內，且每個會話的佇列深度會耗盡回歸零
- 預期：
  - CI 安全且無需金鑰
  - 穩定性回歸後續追蹤的狹窄通道，並非完整 Gateway suite 的替代方案

### E2E (repo aggregate)

- 指令：`pnpm test:e2e`
- 範圍：
  - 執行 gateway smoke E2E 通道
  - 執行 mocked Control UI 瀏覽器 E2E 通道
- 預期：
  - CI 安全且無需金鑰
  - 需要安裝 Playwright Chromium

### E2E（gateway smoke）

- 指令：`pnpm test:e2e:gateway`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及位於 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時期預設值：
  - 使用 Vitest `threads` 搭配 `isolate: false`，與儲存庫 其餘部分一致。
  - 使用自適應 Worker（CI：最多 2 個，本機：預設 1 個）。
  - 預設以靜音模式執行以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制指定 Worker 數量（上限為 16）。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的主控台輸出。
- 範圍：
  - 多實例 Gateway 的端對端行為
  - WebSocket/HTTP 介面、節點配對 以及較重的網路操作
- 預期：
  - 在 CI 中執行（當在管線中啟用時）
  - 不需要真實金鑰
  - 比單元測試有更多運作環節（可能會較慢）

### E2E（Control UI mocked browser）

- 指令：`pnpm test:ui:e2e`
- 設定：`test/vitest/vitest.ui-e2e.config.ts`
- 檔案：`ui/src/**/*.e2e.test.ts`
- 範圍：
  - 啟動 Vite Control UI
  - 透過 Playwright 驅動真實的 Chromium 頁面
  - 以確定性的瀏覽器內部模擬 取代 Gateway WebSocket
- 預期：
  - 作為 `pnpm test:e2e` 的一部分在 CI 中執行
  - 不需要真實的 Gateway、Agents 或 Provider 金鑰
  - 必須具備瀏覽器相依性（`pnpm --dir ui exec playwright install chromium`）

### E2E：OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從本機暫存 Dockerfile 建立沙盒
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell 後端
  - 透過沙盒 fs 橋接 驗證遠端標準檔案系統行為
- 預期：
  - 僅供選擇加入；非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，然後銷毀測試 gateway 和沙盒
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用該測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實供應商 + 真實模型)

- 指令：`pnpm test:live`
- 設定：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設值：透過 `pnpm test:live` **啟用**（設定 `OPENCLAW_LIVE_TEST=1`）
- 範圍：
  - 「此供應商/模型在真實憑證下*今天*是否真的能運作？」
  - 偵測供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不具 CI 穩定性（真實網路、真實供應商政策、配額、故障）
  - 需要花費費用 / 使用速率限制
  - 建議執行縮小的子集而非「全部」
- Live 執行使用已匯出的 API 金鑰和預存的驗證設定檔。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將設定/驗證資料複製到臨時測試目錄，以免單元 fixture 異動您的真實 `~/.openclaw`。
- 僅在您有意讓 Live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 預設為較安靜的模式：它會保留 `[live] ...` 進度輸出，並靜音 gateway bootstrap 日誌/Bonjour 雜訊。若您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪替（供應商特定）：以逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2`（例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`），或透過 `OPENCLAW_LIVE_*_KEY` 進行單一 live 覆寫；測試在遇到速率限制回應時會重試。
- 進度/心跳輸出：
  - Live 測試套件現在會向 stderr 發出進度行，因此即使 Vitest 主控台擷取處於靜默狀態，冗長的供應商呼叫也能顯示為作用中。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，使供應商/gateway 進度行在 live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整直接模型心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 心跳。

## 我應該執行哪個測試套件？

使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果您修改了很多內容，則執行 `pnpm test:coverage`）
- 涉及 gateway 網路 / WS 協定 / 配對：新增 `pnpm test:e2e`
- 除錯「我的機器人停機」/ 特定提供商失敗 / 工具呼叫：執行縮減的 `pnpm test:live`

## Live (接觸網路) 測試

關於 live model 矩陣、CLI backend smokes、ACP smokes、Codex app-server
harness 以及所有 media-provider live 測試（Deepgram、BytePlus、ComfyUI、image、
music、video、media harness）——加上 live 執行的憑證處理——請參閱
[測試 live 套件](/zh-Hant/help/testing-live)。關於專用的更新和
plugin 驗證檢查清單，請參閱
[測試更新和 plugins](/zh-Hant/help/testing-updates-plugins)。

## Docker runners (可選的「適用於 Linux」檢查)

這些 Docker runners 分為兩類：

- Live-model runners：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在 repo Docker 映像檔內執行其對應的 profile-key live 檔案（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`），並掛載您的本機 config 目錄、工作區和可選的 profile env 檔案。對應的本機入口點是 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live runners 會在需要時保留自己的實務上限：
  `test:docker:live-models` 預設為策劃的支援高訊號集，而
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您明確想要較小的上限或較大的掃描範圍時，請設定 `OPENCLAW_LIVE_MAX_MODELS`
  或 gateway 環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建置一次 live Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，然後建置/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅是針對 install/update/plugin-dependency lanes 的 Node/Git runner；這些 lanes 掛載預先建置的 tarball。Functional 映像檔將相同的 tarball 安裝到 `/app`，用於 built-app functionality lanes。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 執行選定的計劃。Aggregate 使用加權的本機排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制處理程序插槽，而資源上限確保 heavy live、npm-install 和 multi-service lanes 不會同時啟動。如果單一 lane 的負載超過當前上限，排程器仍可在集區空閒時啟動它，並讓其單獨執行直到容量再次可用。預設值為 10 個插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時，才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。Runner 預設執行 Docker preflight，移除過時的 OpenClaw E2E 容器，每 30 秒列印狀態，將成功的 lane 執行時間儲存在 `.artifacts/docker-tests/lane-timings.json` 中，並在後續執行中利用這些時間優先啟動較長的 lanes。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 來列印加權 lane manifest 而不建置或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 來列印所選 lanes、套件/映像檔需求和憑證的 CI 計劃。
- `Package Acceptance` 是 GitHub 原生套件檢查機制，用於確認「此可安裝的 tarball 是否能作為產品正常運作？」它會從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該確切的 tarball 執行可重複使用的 Docker E2E 通道，而非重新打包選定的 ref。設定檔按廣度排序：`smoke`、`package`、`product` 和 `full`。請參閱[測試更新與外掛](/zh-Hant/help/testing-updates-plugins)以了解套件/更新/外掛合約、已發布升級存留矩陣、發布預設值以及失敗分診。
- 建置與發布檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。此守衛程式會從 `dist/entry.js` 和 `dist/cli/run-main.js` 遍歷靜態建置圖，如果在命令分派之前，預分派啟動程序匯入了套件相依性（如 Commander、prompt UI、undici 或 logging），則會導致失敗；它還會確保捆綁的 gateway 執行區塊保持在預算範圍內，並拒絕已知冷 gateway 路徑的靜態匯入。封裝的 CLI 煙霧測試也涵蓋了根目錄說明、入門說明、診斷說明、狀態、設定結構描述以及 model-list 指令。
- 套件驗收的舊版相容性上限為 `2026.4.25`（包含 `2026.4.25-beta.*`）。直到該版本截止點為止，測試框架僅容忍已發布套件的中繼資料遺漏：省略的私有 QA 清單項目、遺漏的 `gateway install --wrapper`、tarball 衍生 git fixture 中遺漏的修補檔案、遺漏的持久化 `update.channel`、舊版外掛安裝記錄位置、遺漏的 marketplace 安裝記錄持久化，以及在 `plugins update` 期間的設定中繼資料遷移。對於 `2026.4.25` 之後的套件，這些路徑皆會導致嚴格失敗。
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:agent-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix`, 以及 `test:docker:config-reload` 會啟動一個或多個真實的容器，並驗證高層次的整合路徑。
- Docker/Bash E2E lanes 會透過 `scripts/lib/openclaw-e2e-instance.sh` 安裝打包好的 OpenClaw tarball，並將 `npm install` 限制為 `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT`（預設為 `600s`；設定 `0` 可停用此包裝器以便進行除錯）。

live-model Docker runners 也只會 bind-mount 所需的 CLI auth homes（若執行範圍未縮小，則會掛載所有支援的 homes），然後在執行前將其複製到容器 home 中，如此 external-CLI OAuth 即可更新權杖，而無需變更主機的 auth store：

- Direct models: `pnpm test:docker:live-models` (腳本: `scripts/test-live-models-docker.sh`)
- ACP bind smoke: `pnpm test:docker:live-acp-bind` (腳本: `scripts/test-live-acp-bind-docker.sh`；預設涵蓋 Claude、Codex 與 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 與 `pnpm test:docker:live-acp-bind:opencode` 嚴格涵蓋 Droid/OpenCode)
- CLI backend smoke: `pnpm test:docker:live-cli-backend` (腳本: `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke: `pnpm test:docker:live-codex-harness` (腳本: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent: `pnpm test:docker:live-gateway` (腳本: `scripts/test-live-gateway-models-docker.sh`)
- 可觀測性冒煙測試：`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 和 `pnpm qa:observability:smoke` 是私有的 QA 原始碼結帳通道。它們故意不包含在套件 Docker 發布通道中，因為 npm tarball 省略了 QA Lab。
- Open WebUI 即時冒煙測試：`pnpm test:docker:openwebui` (腳本：`scripts/e2e/openwebui-docker.sh`)
- 入門嚮導 (TTY，完整腳手架)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Npm tarball 入門/通道/代理冒煙測試：`pnpm test:docker:npm-onboard-channel-agent` 在 Docker 中全域安裝打包的 OpenClaw tarball，透過 env-ref 入門預設配置 OpenAI 和 Telegram，執行 doctor，並執行一次模擬的 OpenAI 代理輪次。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用預先建置的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切換通道。

- 發布使用者旅程冒煙測試：`pnpm test:docker:release-user-journey` 在乾淨的 Docker 家目錄中全域安裝打包的 OpenClaw tarball，執行入門流程，配置模擬的 OpenAI 提供者，執行代理輪次，安裝/解除安裝外部插件，針對本地 fixture 配置 ClickClack，驗證出站/入站訊息傳遞，重新啟動 Gateway，並執行 doctor。
- 發布鍵入式入門冒煙測試：`pnpm test:docker:release-typed-onboarding` 安裝打包的 tarball，透過真實 TTY 驅動 `openclaw onboard`，將 OpenAI 配置為 env-ref 提供者，驗證沒有原始金鑰持久化，並執行模擬的代理輪次。
- 發布媒體/記憶體冒煙測試：`pnpm test:docker:release-media-memory` 安裝打包的 tarball，驗證來自 PNG 附件的圖片理解、OpenAI 相容的圖片生成輸出、記憶體搜尋召回，以及在 Gateway 重新啟動後的召回存續。
- 發布升級使用者旅程冒煙測試：`pnpm test:docker:release-upgrade-user-journey` 預設安裝 `openclaw@latest`，在已發布的套件上配置提供者/插件/ClickClack 狀態，升級到候選 tarball，然後重新執行核心代理/插件/通道旅程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆寫基準線。
- Release plugin marketplace smoke: `pnpm test:docker:release-plugin-marketplace` 從本機 fixture marketplace 安裝，更新已安裝的插件，將其解除安裝，並驗證插件 CLI 已隨安裝元資料修剪而消失。
- Skill install smoke: `pnpm test:docker:skill-install` 在 Docker 中全域安裝打包的 OpenClaw tarball，在配置中停用上傳的存檔安裝，從搜尋中解析當前即時的 ClawHub skill slug，使用 `openclaw skills install` 安裝它，並驗證已安裝的 skill 以及 `.clawhub` origin/lock 元資料。
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` 在 Docker 中全域安裝打包的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證持久化的頻道和更新後的外掛程式能正常運作，然後切換回 package `stable` 並檢查更新狀態。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` 將打包的 OpenClaw tarball 安裝在包含 agent、channel config、plugin allowlists、stale plugin dependency state 以及現有 workspace/session files 的髒舊用戶 fixture 之上。它會在沒有即時 provider 或 channel 金鑰的情況下執行 package update 以及非互動式 doctor，然後啟動 loopback Gateway 並檢查配置/狀態保留以及啟動/狀態預算。
- 已發布升級存留者測試 (survivor smoke)：`pnpm test:docker:published-upgrade-survivor` 預設安裝 `openclaw@latest`，植入真實的既有使用者檔案，使用預先設定的指令配方配置該基準，驗證產生的設定，將該已發布的安裝更新為候選 tarball，執行非互動式診斷程式，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動迴路 Gateway 並檢查已設定的意圖、狀態保留、啟動、`/healthz`、`/readyz` 和 RPC 狀態預算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆寫一個基準，要求聚合排程器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` (例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`) 擴充確切的本地基準，並使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` (例如 `reported-issues`) 擴充問題狀的測試資料；回報問題集合包含 `configured-plugin-installs`，用於自動修復外部 OpenClaw 外掛程式的安裝。Package Acceptance 將其公開為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析元基準標記 (例如 `last-stable-4` 或 `all-since-2026.4.23`)，而 Full Release Validation 則將發布 soak 套件閘門擴充為 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- 會話執行時期內容測試 (Session runtime context smoke)：`pnpm test:docker:session-runtime-context` 驗證隱藏的執行時期內容逐字稿持久性，以及診斷程式對受影響的重複提示重寫分支的修復。
- Bun 全域安裝測試：`bash scripts/e2e/bun-global-install-smoke.sh` 打包目前的樹狀結構，在獨立的家目錄中使用 `bun install -g` 安裝它，並驗證 `openclaw infer image providers --json` 傳回打包的映像提供者而不是掛起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建置，或使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從已建置的 Docker 映像複製 `dist/`。
- Installer Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共享一個 npm 快取。Update smoke 預設在升級到候選 tarball 之前，使用 npm `latest` 作為穩定基準。可以在本機使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆蓋，或在 GitHub 上使用 Install Smoke workflow 的 `update_baseline_version` 輸入來覆蓋。非 root 安裝程式檢查會維持一個獨立的 npm 快取，以免 root 擁有的快取條目遮蔽使用者本機的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本機重新執行時重複使用 root/update/direct-npm 快取。
- Install Smoke CI 會使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要 direct `npm install -g` 覆蓋率時，請在沒有該環境變數的情況下於本機執行腳本。
- Agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace` (腳本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設會建構 root Dockerfile 映像檔，在獨立的容器 home 中使用一個工作空間植入兩個代理程式，執行 `agents delete --json`，並驗證有效的 JSON 以及保留的工作空間行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重複使用 install-smoke 映像檔。
- Gateway networking (兩個容器，WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke：`pnpm test:docker:browser-cdp-snapshot` (腳本：`scripts/e2e/browser-cdp-snapshot-docker.sh`) 會建構來源 E2E 映像檔加上 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP 角色快照涵蓋連結 URL、游標提升的可點擊元素、iframe 參照和 frame 中繼資料。
- OpenAI Responses web_search minimal reasoning regression：`pnpm test:docker:openai-web-search-minimal` (腳本：`scripts/e2e/openai-web-search-minimal-docker.sh`) 會透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升到 `low`，然後強制供應商 schema 拒絕並檢查原始詳細資訊是否出現在 Gateway 日誌中。
- MCP 頻道橋接器（已植入的 Gateway + stdio 橋接器 + 原始 Claude 通知框架冒煙測試）：`pnpm test:docker:mcp-channels`（腳本：`scripts/e2e/mcp-channels-docker.sh`）
- OpenClaw 捆綁 MCP 工具（真實的 stdio MCP 伺服器 + 嵌入式 OpenClaw 設定檔允許/拒絕冒煙測試）：`pnpm test:docker:agent-bundle-mcp-tools`（腳本：`scripts/e2e/agent-bundle-mcp-tools-docker.sh`）
- Cron/子代理 MCP 清理（真實 Gateway + stdio MCP 子程序在隔離 cron 和一次性子代理運行後的拆解）：`pnpm test:docker:cron-mcp-cleanup`（腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`）
- 外掛（本地路徑、`file:`、具有提升依賴項的 npm 註冊表、格式錯誤的 npm 套件元數據、git 移動引用、ClawHub 萬能測試、marketplace 更新以及 Claude 捆綁啟用/檢查的安裝/更新冒煙測試）：`pnpm test:docker:plugins`（腳本：`scripts/e2e/plugins-docker.sh`）
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆蓋預設的萬能測試套件/執行時間對。如果沒有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，測試會使用一個封閉的本地 ClawHub fixture 伺服器。
- 外掛更新未變更冒煙測試：`pnpm test:docker:plugin-update`（腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`）
- 外掛生命週期矩陣冒煙測試：`pnpm test:docker:plugin-lifecycle-matrix` 在裸容器中安裝打包的 OpenClaw tarball，安裝一個 npm 外掛，切換啟用/停用，透過本地 npm 註冊表升級和降級它，刪除已安裝的程式碼，然後驗證解除安裝仍然會移除過時狀態，同時為每個生命週期階段記錄 RSS/CPU 指標。
- 設定重新載入元數據冒煙測試：`pnpm test:docker:config-reload`（腳本：`scripts/e2e/config-reload-source-docker.sh`）
- 插件：`pnpm test:docker:plugins` 涵盖本地路徑的安裝/更新冒煙測試、`file:`、具有提升依賴關係的 npm registry、git 移動 refs、ClawHub fixtures、marketplace 更新以及 Claude-bundle 的啟用/檢查。`pnpm test:docker:plugin-update` 涵蓋已安裝插件的未更改更新行為。`pnpm test:docker:plugin-lifecycle-matrix` 涵蓋資源追蹤的 npm 插件安裝、啟用、停用、升級、降級以及遺失程式碼的解除安裝。

若要手動預先建置並重複使用共享的功能映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

當設定套件特定的映像檔覆寫（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）時，該設定仍優先生效。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共享映像檔時，如果本機尚未存在，腳本會將其拉取下來。QR 和安裝程式 Docker 測試保留其自己的 Dockerfile，因為它們驗證的是套件/安裝行為，而不是共享的建置應用程式執行時期。

live-model Docker 執行程式也會以唯讀方式綁定掛載當前的 checkout，並將其暫存到容器內的臨時工作目錄中。這既保持了執行時映像檔的精簡，又能針對您確切的本地原始碼/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取和應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__` 以及應用程式本機的 `.build` 或 Gradle 輸出目錄，以免 Docker live 執行花費數分鐘複製機器特定的產出檔案。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，以便 gateway live probes 不會在容器內啟動真正的 Telegram/Discord/等頻道工作程式。
`test:docker:live-models` 仍然會執行 `pnpm test:live`，因此當您需要縮小或從該 Docker 排除 gateway live 涵蓋範圍時，也請傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是一個高層次的相容性測試：它會啟動一個啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，針對該 gateway 啟動一個固定版本的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否公開 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` proxy 發送真實的聊天請求。
針對應在 Open WebUI 登入和模型探索後停止、無需等待 live model 完成的發布路徑 CI 檢查，請設定 `OPENWEBUI_SMOKE_MODE=models`。
第一次執行可能會明顯較慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成其自身的冷啟動設定。
此通道需要一個可用的 live model 金鑰。您可以透過流程環境、暫存的設定檔或明確的 `OPENCLAW_PROFILE_FILE` 來提供它。
成功的執行會列印出一個小型 JSON 載荷，例如 `{ "ok": true, "model":
"openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意確定性的，不需要真正的 Telegram、Discord 或 iMessage 帳號。它會啟動一個植入種子的 Gateway 容器，啟動第二個衍生出 `openclaw mcp serve` 的容器，然後驗證透過真實 stdio MCP 橋接器進行的路由對話探索、逐字稿讀取、附件中繼資料、即時事件佇列行為、外寄傳送路由，以及 Claude 風格的通道 + 通知權限。通知檢查會直接檢查原始 stdio MCP 幀，因此此測試驗證的是橋接器實際發出的內容，而不僅僅是特定用戶端 SDK 恰好呈現的內容。
`test:docker:agent-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP probe server，透過內嵌的 OpenClaw bundle MCP 執行階段具象化該 server，執行該工具，然後驗證 `coding` 和 `messaging` 保留 `bundle-mcp` 工具，而 `minimal` 和 `tools.deny: ["bundle-mcp"]` 則會過濾掉它們。
`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動一個帶有真實 stdio MCP probe server 的植入種子 Gateway，執行一個隔離的 cron 輪次和一個 `sessions_spawn` 一次性子輪次，然後驗證 MCP 子程序在每次執行後會結束。

手動 ACP 自然語言 thread 冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 保留此腳本以用於迴歸/除錯工作流程。它可能再次需要用於 ACP thread 路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...`（預設：`~/.openclaw`）掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...`（預設：`~/.openclaw/workspace`）掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 已掛載並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用臨時設定/工作區目錄且無外部 CLI 認證掛載
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...`（預設：`~/.cache/openclaw/docker-cli-tools`）掛載至 `/home/node/.npm-global` 以用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...` 中
  - 預設目錄：`.minimax`
  - 預設檔案：`~/.codex/auth.json`、`~/.codex/config.toml`、`.claude.json`、`~/.claude/.credentials.json`、`~/.claude/settings.json`、`~/.claude/settings.local.json`
  - 縮小的 provider 執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`、`OPENCLAW_DOCKER_AUTH_DIRS=none` 或逗號列表（如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`）手動覆寫
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內篩選 providers
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔，用於不需要重建的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道為 Open WebUI 冒煙測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 來覆寫 Open WebUI smoke 使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 來覆寫固定的 Open WebUI 映像標籤

## Docs sanity

在文件編輯後執行文件檢查：`pnpm check:docs`。
當您也需要頁內標題檢查時，執行完整的 Mintlify anchor 驗證：`pnpm docs:check-links:anchors`。

## Offline regression (CI-safe)

這些是沒有真實供應商的「真實管線」回歸測試：

- Gateway 工具呼叫（模擬 OpenAI、真實 gateway + agent 迴圈）：`src/gateway/gateway.test.ts` (案例：「runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway wizard (WS `wizard.start`/`wizard.next`, 寫入配置 + 強制執行驗證)：`src/gateway/gateway.test.ts` (案例：「runs wizard over ws and writes auth token config")

## Agent reliability evals (skills)

我們已經有一些 CI-safe 測試，其行為類似於「agent reliability evals」：

- 透過真實 gateway + agent 迴圈進行模擬工具呼叫 (`src/gateway/gateway.test.ts`)。
- 端到端 wizard 流程，驗證 session wiring 和配置效果 (`src/gateway/gateway.test.ts`)。

Skills 目前仍缺少什麼（參見 [Skills](/zh-Hant/tools/skills))：

- **決策：** 當 skills 在提示中列出時，agent 是否會選擇正確的 skill (或避免不相關的)？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/參數？
- **工作流程約束：** 多輪次場景，用於斷言工具順序、session 歷史傳遞以及 sandbox 邊界。

未來的評估應首先保持確定性：

- 使用模擬供應商的場景執行器，以斷言工具呼叫 + 順序、skill 文件讀取和 session wiring。
- 一小套專注於 skill 的場景（使用 vs 避免、閘道、提示注入）。
- 僅在 CI-safe 套件就位後，才進行選用的即時評估（opt-in、env-gated）。

## Contract tests (plugin and channel shape)

合約測試會驗證每個已註冊的外掛和頻道是否符合其介面合約。它們會遍歷所有已發現的外掛，並執行一系列形狀和行為斷言。預設的 `pnpm test` unit 軌道會刻意跳過這些共享縫隙和冒煙測試檔案；當您接觸共享頻道或供應商介面時，請明確執行合約指令。

### 指令

- 所有合約：`pnpm test:contracts`
- 僅限頻道合約：`pnpm test:contracts:channels`
- 僅限供應商合約：`pnpm test:contracts:plugins`

### 頻道合約

位於 `src/channels/plugins/contracts/*.contract.test.ts`：

- **plugin** - 基本外掛形狀 (id、name、capabilities)
- **setup** - 設定精靈合約
- **session-binding** - 會話綁定行為
- **outbound-payload** - 訊息 Payload 結構
- **inbound** - 傳入訊息處理
- **actions** - 頻道動作處理器
- **threading** - Thread ID 處理
- **directory** - 目錄/名冊 API
- **group-policy** - 群組原則強制執行

### 供應商狀態合約

位於 `src/plugins/contracts/*.contract.test.ts`。

- **status** - 頻道狀態探測
- **registry** - 外掛註冊表形狀

### 供應商合約

位於 `src/plugins/contracts/*.contract.test.ts`：

- **auth** - 驗證流程合約
- **auth-choice** - 驗證選擇/選取
- **catalog** - 模型型錄 API
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

## 新增迴歸測試 (指引)

當您修正在 live 中發現的供應商/模型問題時：

- 如果可能，請加入一個可在 CI 中安全執行的迴歸測試 (模擬/存根供應商，或擷取確切的請求形狀轉換)
- 如果本質上只能在 live 中執行 (速率限制、驗證原則)，請保持 live 測試精簡並透過環境變數選擇加入
- 優先以能捕捉該錯誤的最小層級為目標：
  - 供應商請求轉換/重播錯誤 → 直接模型測試
  - 閘道會話/歷史/工具管線錯誤 → 閘道 live 冒煙測試或 CI 安全的閘道模擬測試
- SecretRef 遍遍防護措施：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元數據 (`listSecretTargetRegistryEntries()`) 為每個 SecretRef 類別衍生一個採樣目標，然後斷言遍歷段執行 ID 被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，以免新類別被無聲跳過。

## 相關

- [測試即時狀態](/zh-Hant/help/testing-live)
- [測試更新和外掛程式](/zh-Hant/help/testing-updates-plugins)
- [CI](/zh-Hant/ci)
