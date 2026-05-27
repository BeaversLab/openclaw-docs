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
**QA 堆疊 (qa-lab, qa-channel, live transport lanes)** 已記載於其他文件：

- [QA 概覽](/zh-Hant/concepts/qa-e2e-automation) - 架構、命令介面、情境編寫。
- [Matrix QA](/zh-Hant/concepts/qa-matrix) - `pnpm openclaw qa matrix` 的參考資料。
- [QA 頻道](/zh-Hant/channels/qa-channel) - 由 repo 支援的情境所使用的綜合傳輸外掛。

本頁涵蓋執行一般測試套件和 Docker/Parallels 執行器。下方的 QA 特定執行器章節 ([QA-specific runners](#qa-specific-runners)) 列出了具體的 `qa` 呼叫，並參照回上述資料。

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
  - 在 Docker 中安裝打包的 OpenClaw tarball，執行 OpenAI API 金鑰
    入門，並驗證 Codex 插件加上 `@openai/codex` 相依性
    已按需下載到受管理的 npm 根目錄中。
- Live 插件工具相依性煙霧測試：`pnpm test:docker:live-plugin-tool`
  - 打包一個帶有真實 `slugify` 依賴項的 fixture 插件，透過 `npm-pack:` 進行安裝，在受管理的 npm 根目錄下驗證該依賴項，然後要求即時 OpenAI 模型調用該插件工具並返回隱藏的 slug。
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

- 確切的 tarball URL 證明需要摘要並使用公開 URL 安全策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Enterprise/private tarball 鏡像使用明確的可信來源策略：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` 從受信任的工作流程參考讀取 `.github/package-trusted-sources.json`，並且不接受 URL 憑證或工作流程輸入的私有網路繞過。如果指定的策略宣告了 bearer auth，請配置固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密碼。

- Artifact proof 從另一個 Actions 執行中下載 tarball 成品：

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - 在 Docker 中打包並安裝當前的 OpenClaw 建置，使用已配置的 OpenAI 啟動 Gateway，然後透過配置編輯啟用捆綁的 channel/plugins。
  - 驗證設定發現會保留未配置的可下載插件為缺席狀態，第一次配置的 doctor 修復會明確安裝每個缺失的可下載插件，且第二次重新啟動不會執行隱藏的依賴項修復。
  - 同時安裝一個已知的較舊 npm 基準版本，在執行
    `openclaw update --tag <candidate>` 前啟用 Telegram，並驗證候選版本的
    post-update doctor 能夠在不依賴 harness 端 postinstall 修復的情況下，清除舊版外掛依賴殘留。
- `pnpm test:parallels:npm-update`
  - 在 Parallels 客體機中執行原生封裝安裝更新冒煙測試。每個
    選定的平台會先安裝要求的基線套件，然後在同一客體機中執行已安裝的 `openclaw update` 指令，並驗證
    已安裝的版本、更新狀態、Gateway 準備狀況以及一次本地 agent
    輪次。
  - 在針對單一客體機進行反覆測試時，請使用 `--platform macos`、`--platform windows` 或 `--platform linux`。請使用 `--json` 取得摘要構件路徑
    和各通道狀態。
  - OpenAI 通道預設使用 `openai/gpt-5.5` 作為即時 agent 輪次驗證。
    當刻意驗證其他 OpenAI 模型時，請傳入 `--model <provider/model>` 或設定
    `OPENCLAW_PARALLELS_OPENAI_MODEL`。
  - 將長時間的本地執行包裹在主機逾時中，以免 Parallels 傳輸停滯耗盡
    其餘的測試時間：

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - 此腳本會在 `/tmp/openclaw-parallels-npm-update.*` 下寫入巢狀通道日誌。
    在假設外層包裝程式已當機之前，請先檢查 `windows-update.log`、`macos-update.log` 或 `linux-update.log`。
  - Windows 更新可能在冷啟動的客體機上花費 10 到 15 分鐘進行更新後檢查和套件
    更新作業；只要巢狀 npm
    除錯日誌持續推進，這仍屬正常狀態。
  - 請勿將此彙總包裝程式與個別的 Parallels
    macOS、Windows 或 Linux 冒煙測試通道並行執行。它們共用 VM 狀態，可能會在
    還原快照、提供套件或客體機 Gateway 狀態時發生衝突。
  - 更新後驗證會執行正常的內建外掛介面，因為
    語音、影像生成和媒體理解等
    功能外觀是透過內建執行時期 API 載入的，即使 agent
    輪次本身僅檢查簡單的文字回應。

- `pnpm openclaw qa aimock`
  - 僅啟動本地 AIMock 提供者伺服器以進行直接通訊協定冒煙
    測試。
- `pnpm openclaw qa matrix`
  - 針對一次性 Docker 支援的 Tuwunel homeserver 執行 Matrix live QA lane。僅適用於原始碼檢出 - 打包安裝版本不附帶 `qa-lab`。
  - 完整的 CLI、profile/scenario 目錄、環境變數和 artifact 版面配置：[Matrix QA](/zh-Hant/concepts/qa-matrix)。
- `pnpm openclaw qa telegram`
  - 針對真實的私人群組執行 Telegram live QA lane，使用來自環境變數的 driver 和 SUT bot tokens。
  - 需要 `OPENCLAW_QA_TELEGRAM_GROUP_ID`、`OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` 和 `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`。群組 ID 必須是 Telegram 的數值聊天 ID。
  - 支援 `--credential-source convex` 以使用共用的 pooled 認證資訊。預設使用 env mode，或設定 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` 以選擇使用 pooled leases。
  - 預設涵蓋金絲雀、提及閘控、命令定址、`/status`、bot-to-bot 提及回覆以及核心原生命令回覆。`mock-openai` 預設也涵蓋決定性回覆鏈和 Telegram 最終訊息串流回歸測試。使用 `--list-scenarios` 進行選用性探測，例如 `session_status`。
  - 當任何 scenario 失敗時，以非零結束代碼退出。當您需要 artifact 而不希望有失敗的結束代碼時，請使用 `--allow-failures`。
  - 需要在同一個私人群組中有兩個不同的 bot，且 SUT bot 必須公開 Telegram username。
  - 為了穩定的 bot-to-bot 觀察，請在兩個 bot 的 `@BotFather` 中啟用 Bot-to-Bot 通訊模式，並確保 driver bot 可以觀察群組 bot 流量。
  - 在 `.artifacts/qa-e2e/...` 下寫入 Telegram QA 報告、摘要和 observed-messages artifact。回覆 scenario 包含從 driver 傳送請求到觀察到 SUT 回覆的 RTT。

`Mantis Telegram Live` 是此通道的 PR 證據包裝器。它使用 Convex 租用的 Telegram 憑證執行候選 ref，在 Crabbox 桌面瀏覽器中呈現經過編輯的觀察訊息紀錄，錄製 MP4 證據，生成動態修剪的 GIF，上傳構件套件，並在設定 `pr_number` 時透過 Mantis GitHub App 發布內聯 PR 證據。維護者可以透過 `Mantis Scenario` (`scenario_id:
telegram-live`) 從 Actions UI 啟動它，或直接從拉取請求留言啟動：

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` 是用於 PR 視覺證明的原生 Telegram Desktop 前後對比代理包裝器。使用自由形式的 `instructions` 從 Actions UI、透過 `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`) 啟動它，或從 PR 留言啟動：

```text
@openclaw-mantis telegram desktop proof
```

Mantis 代理會閱讀 PR，決定哪些 Telegram 可見行為可以證明變更，在基準和候選 ref 上執行真實用戶 Crabbox Telegram Desktop 證明通道，迭代直到原生 GIF 有用，撰寫配對的 `motionPreview` 清單，並在設定 `pr_number` 時透過 Mantis GitHub App 張貼相同的雙欄 GIF 表格。

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - 租用或重複使用 Crabbox Linux 桌面，安裝原生 Telegram Desktop，使用租用的 Telegram SUT 機器人權杖設定 OpenClaw，啟動閘道，並從可見的 VNC 桌面記錄螢幕截圖/MP4 證據。
  - 預設為 `--credential-source convex`，因此工作流程只需要 Convex broker secret。使用 `--credential-source env` 時需搭配與 `pnpm openclaw qa telegram` 相同的 `OPENCLAW_QA_TELEGRAM_*` 變數。
  - Telegram Desktop 仍需要用戶登入/設定檔。機器人權杖僅設定 OpenClaw。使用 `--telegram-profile-archive-env <name>` 搭配 base64 `.tgz` 設定檔存檔，或使用 `--keep-lease` 並透過 VNC 手動登入一次。
  - 在輸出目錄下寫入 `mantis-telegram-desktop-builder-report.md`、`mantis-telegram-desktop-builder-summary.json`、`telegram-desktop-builder.png` 和 `telegram-desktop-builder.mp4`。

Live transport lanes 共用一個標準合約，以確保新的 transport 不會偏離；per-lane 覆蓋率矩陣位於 [QA overview → Live transport coverage](/zh-Hant/concepts/qa-e2e-automation#live-transport-coverage)。`qa-channel` 是廣泛的綜合套件，並不屬於該矩陣的一部分。

### 透過 Convex 共享 Telegram 憑證 (v1)

當為 live transport QA 啟用 `--credential-source convex` (或 `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) 時，QA lab 會從支援 Convex 的池中取得獨佔租約，在 lane 執行期間對該租約發送心跳，並在關機時釋放該租約。此章節名稱早於 Discord、Slack 和 WhatsApp 支援；租約合約在各種類型之間共享。

參考 Convex 專案支架：

- `qa/convex-credential-broker/`

必要的環境變數：

- `OPENCLAW_QA_CONVEX_SITE_URL` (例如 `https://your-deployment.convex.site`)
- 所選角色的 Secret：
  - 用於 `maintainer` 的 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`
  - 用於 `ci` 的 `OPENCLAW_QA_CONVEX_SECRET_CI`
- 憑證角色選擇：
  - CLI：`--credential-role maintainer|ci`
  - 環境變數預設值：`OPENCLAW_QA_CREDENTIAL_ROLE` (在 CI 中預設為 `ci`，否則為 `maintainer`)

選用的環境變數：

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (預設 `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (預設 `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (預設 `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (預設 `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (預設 `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (選用的 trace id)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` 允許僅本機開發使用回送 `http://` Convex URL。

`OPENCLAW_QA_CONVEX_SITE_URL` 在正常操作中應使用 `https://`。

維護者管理指令 (pool add/remove/list) 特別需要 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER`。

維護者的 CLI 輔助工具：

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

在即時運行前使用 `doctor` 以檢查 Convex 網站 URL、broker secrets、端點前綴 (endpoint prefix)、HTTP 逾時以及 admin/list 的連線性，而不會印出 secret 值。在腳本和 CI 工具中使用 `--json` 以取得機器可讀的輸出。

預設端點合約 (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`)：

- `POST /acquire`
  - 請求：`{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - 成功：`{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - 已耗盡/可重試：`{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - 成功：`{ status: "ok", index, data }`
- `POST /heartbeat`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - 成功：`{ status: "ok" }` (或空值 `2xx`)
- `POST /release`
  - 請求：`{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - 成功：`{ status: "ok" }` (或空值 `2xx`)
- `POST /admin/add` (僅限維護者 secret)
  - 請求：`{ kind, actorId, payload, note?, status? }`
  - 成功：`{ status: "ok", credential }`
- `POST /admin/remove` (僅限維護者 secret)
  - 請求：`{ credentialId, actorId }`
  - 成功：`{ status: "ok", changed, credential }`
  - 活躍租約守衛 (Active lease guard)：`{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (僅限維護者 secret)
  - 請求：`{ kind?, status?, includePayload?, limit? }`
  - 成功：`{ status: "ok", credentials, count }`

Telegram 類型的 Payload 結構：

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` 必須是數字格式的 Telegram 聊天 ID 字串。
- `admin/add` 會驗證 `kind: "telegram"` 的此結構，並拒絕格式錯誤的 payload。

Telegram 真實用戶類型 的 Payload 結構：

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`、`testerUserId` 和 `telegramApiId` 必須是數字字串。
- `tdlibArchiveSha256` 和 `desktopTdataArchiveSha256` 必須是 SHA-256 十六進位字串。
- `kind: "telegram-user"` 是保留給 Mantis Telegram Desktop proof workflow 的。Generic QA Lab lanes 絕不能獲取它。

經 Broker 驗證的多通道 payload：

- Discord：`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp：`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Slack lanes 也可以從 pool 中租用，但 Slack payload 驗證目前存在於 Slack QA runner 而非 broker 中。請使用 `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }` 來處理 Slack rows。

### 將通道加入 QA

新通道適配器的架構和 scenario-helper 名稱位於 [QA overview → Adding a channel](/zh-Hant/concepts/qa-e2e-automation#adding-a-channel)。最低門檻：在共享的 `qa-lab` host seam 上實作 transport runner，在 plugin manifest 中宣告 `qaRunners`，掛載為 `openclaw qa <runner>`，並在 `qa/scenarios/` 下撰寫 scenarios。

## 測試套件（在哪裡執行什麼）

將這些套件視為「逐步增加的真實性」（以及逐步增加的不穩定性/成本）：

### 單元 / 整合（預設）

- 指令：`pnpm test`
- 設定：未指定目標的執行使用 `vitest.full-*.config.ts` shard set，並可能將多專案 shards 擴展為個別專案的 configs 以進行平行排程
- 檔案：`src/**/*.test.ts`、`packages/**/*.test.ts` 和 `test/**/*.test.ts` 下的 core/unit inventories；UI 單元測試在專用的 `unit-ui` shard 中執行
- 範圍：
  - 純單元測試
  - 程序內整合測試（gateway auth、routing、tooling、parsing、config）
  - 已知錯誤的確定性回歸測試
- 預期：
  - 在 CI 中執行
  - 不需要真實金鑰
  - 應該快速且穩定
  - Resolver 和 public-surface loader 測試必須使用生成的 tiny plugin fixtures 證明廣泛的 `api.js` 和 `runtime-api.js` 後備行為，而不是真實的打包 plugin 來源 API。真實的 plugin API 載入屬於 plugin 擁有的 contract/integration 套件。

原生依賴政策：

- 預設的測試安裝會略過選用性的原生 Discord opus 建置。Discord 語音接收使用純 JS `opusscript` 解碼器，並且 `@discordjs/opus` 在 `allowBuilds` 中保持停用，因此本機測試和 Testbox 通道不會編譯原生插件。
- 如果您刻意需要比較原生 opus 建置，請使用專屬的 Discord 語音效能或即時通道。請勿在預設的 `allowBuilds` 中將 `@discordjs/opus` 設為 `true`；這會導致不相關的安裝/測試迴路編譯原生程式碼。

<AccordionGroup>
  <Accordion title="專案、分片與範圍通道">

    - 無目標的 `pnpm test` 會執行十二個較小的分片配置（`core-unit-fast`、`core-unit-src`、`core-unit-security`、`core-unit-ui`、`core-unit-support`、`core-support-boundary`、`core-contracts`、`core-bundled`、`core-runtime`、`agentic`、`auto-reply`、`extensions`），而不是一個巨大的原生根專案程序。這降低了負載機器上的峰值 RSS，並避免自動回覆/擴充功能的工作搶占不相關測試套件的資源。
    - `pnpm test --watch` 仍使用原生根 `vitest.config.ts` 專案圖，因為多分片監控迴圈並不實際。
    - `pnpm test`、`pnpm test:watch` 和 `pnpm test:perf:imports` 會先將明確指定的檔案/目錄目標路由到範圍通道，因此 `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` 可避免付出完整的根專案啟動成本。
    - `pnpm test:changed` 預設會將變更的 git 路徑擴充為廉價的範圍通道：直接測試編輯、同層級 `*.test.ts` 檔案、明確來源對應，以及本地匯入圖相依項。除非您明確使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`，否則配置/設定/套件的編輯不會廣泛執行測試。
    - `pnpm check:changed` 是狹窄工作的正常智慧本地檢查閘門。它會將差異分類為核心、核心測試、擴充功能、擴充功能測試、應用程式、文件、發行元資料、即時 Docker 工具，以及工具，然後執行相符的類型檢查、lint 和 guard 指令。它不會執行 Vitest 測試；請呼叫 `pnpm test:changed` 或明確的 `pnpm test <target>` 進行測試驗證。僅包含發行元資料的版本升級會執行目標版本/配置/根相依項檢查，並配有一個會拒絕頂層版本欄位以外套件變更的防護機制。
    - 即時 Docker ACP 測試線束編輯會執行專注檢查：即時 Docker 認證腳本的 shell 語法以及即時 Docker 排程器試執行。`package.json` 變更僅在差異限制於 `scripts["test:docker:live-*"]` 時才會納入；相依項、匯出、版本和其他套件介面編輯仍使用更廣泛的防護機制。
    - 來自代理程式、指令、外掛程式、自動回覆助手、`plugin-sdk` 和類似純公用程式區域的輕量匯入單元測試會路由至 `unit-fast` 通道，該通道會跳過 `test/setup-openclaw-runtime.ts`；具狀態/執行時期繁重的檔案則留在現有通道上。
    - 選定的 `plugin-sdk` 和 `commands` 助手來源檔案也會將變更模式執行對應至這些輕量通道中的明確同層級測試，因此助手編輯可避免為該目錄重新執行完整的繁重套件。
    - `auto-reply` 擁有專用區塊用於頂層核心助手、頂層 `reply.*` 整合測試，以及 `src/auto-reply/reply/**` 子樹。CI 會進一步將回覆子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片，因此單一匯入繁重的區塊不會擁有完整的 Node 尾部。
    - 正常的 PR/main CI 會刻意略過擴充功能批次掃描和僅限發行的 `agentic-plugins` 分片。完整發行驗證會在發行候選版本上為這些外掛程式/擴充功能繁重的套件分派獨立的 `Plugin Prerelease` 子工作流程。

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - 當您變更 message-tool discovery inputs 或 compaction runtime context 時，請同時維持兩個層級的覆蓋率。
    - 為純路由和正規化邊界新增針對性的 helper 回歸測試。
    - 保持 embedded runner 整合套件的健全性：
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`、
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` 和
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`。
    - 這些套件會驗證 scoped ids 和 compaction 行為仍然能透過真實的 `run.ts` / `compact.ts` 路徑運作；僅有 helper 的測試無法充分取代這些整合路徑。

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - 基礎 Vitest 設定預設為 `threads`。
    - 共用的 Vitest 設定固定 `isolate: false`，並在根專案、e2e 和 live 設定之間使用 non-isolated runner。
    - 根 UI lane 保留其 `jsdom` 設定和最佳化工具，但也會在共用的 non-isolated runner 上執行。
    - 每個 `pnpm test` 分片都會繼承共用的 Vitest 設定中相同的 `threads` + `isolate: false`
      預設值。
    - `scripts/run-vitest.mjs` 預設會為 Vitest 子 Node 程序新增 `--no-maglev`，以減少大型本機執行期間的 V8 編譯消耗。
      設定 `OPENCLAW_VITEST_ENABLE_MAGLEV=1` 以與原版 V8 行為進行比較。

  </Accordion>

  <Accordion title="快速本機迭代">

    - `pnpm changed:lanes` 顯示變更觸發了哪些架構通道。
    - Pre-commit hook 僅進行格式化。它會重新暫存已格式化的檔案，並且不會執行 lint、typecheck 或測試。
    - 當您需要智慧的本機檢查閘道時，請在交付或推送前明確執行 `pnpm check:changed`。
    - `pnpm test:changed` 預設透過低成本的範圍通道進行路由。僅當代理決定對 harness、config、package 或 contract 的編輯確實需要更廣泛的 Vitest 覆蓋範圍時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。
    - `pnpm test:max` 和 `pnpm test:changed:max` 保持相同的路由行為，只是具有更高的 worker 上限。
    - 本機 worker 自動擴縮被有意設計為保守的，並且在主機平均負載已經很高時會退縮，因此多個併發的 Vitest 執行預設造成的影響較小。
    - 基礎 Vitest 配置將專案/配置檔案標記為 `forceRerunTriggers`，以便在測試接線發生變化時，變更模式下的重新執行保持正確。
    - 該配置在支援的主機上保持 `OPENCLAW_VITEST_FS_MODULE_CACHE` 啟用；如果您想要一個用於直接剖析的明確快取位置，請設定 `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path`。

  </Accordion>

  <Accordion title="效能調試">

    - `pnpm test:perf:imports` 啟用 Vitest 匯入持續時間報告以及
      匯入分解輸出。
    - `pnpm test:perf:imports:changed` 將相同的分析視圖限定在
      自 `origin/main` 以來變更的檔案。
    - 分片計時資料會寫入 `.artifacts/vitest-shard-timings.json`。
      完整設定組態執行使用設定路徑作為鍵值；包含模式的 CI
      分片會附加分片名稱，以便分別追蹤已篩選的分片。
    - 當單一熱門測試仍將大部分時間花費在啟動匯入時，
      請將繁重的相依性保持在狹窄的本機 `*.runtime.ts` 縫隙之後，
      並直接模擬該縫隙，而不是深度匯入執行時期輔助函式
      僅為了將其傳遞至 `vi.mock(...)`。
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` 將路由傳送的
      `test:changed` 與該提交差異的原生根專案路徑進行比較，並列印牆壁時間 以及 macOS 最大 RSS。
    - `pnpm test:perf:changed:bench -- --worktree` 透過將變更的檔案列表路由傳送至
      `scripts/test-projects.mjs` 和根 Vitest 設定，對當前髒樹 進行基準測試。
    - `pnpm test:perf:profile:main` 為 Vitest/Vite 啟動和轉換負載寫入主執行緒 CPU 設定檔。
    - `pnpm test:perf:profile:runner` 為停用檔案並行處理的單元套組寫入執行器 CPU + 堆積 設定檔。

  </Accordion>
</AccordionGroup>

### 穩定性 (gateway)

- 指令：`pnpm test:stability:gateway`
- 設定：`vitest.gateway.config.ts`，強制使用一個 worker
- 範圍：
  - 啟動一個預設啟用診斷功能的真實回送 Gateway
  - 透過診斷事件路徑驅動合成 gateway 訊息、記憶體和大型負載變動
  - 透過 Gateway WS RPC 查詢 `diagnostics.stability`
  - 涵蓋診斷穩定性套件持續性輔助函式
  - 斷言錄製器保持有界、合成 RSS 樣本保持在壓力預算內，且每個會話的佇列深度會排空回零
- 預期：
  - CI 安全且無金鑰
  - 用於穩定性回歸後續追蹤的狹窄通道，並非完整 Gateway 套組的替代方案

### E2E (repo aggregate)

- 指令：`pnpm test:e2e`
- 範圍：
  - 執行 gateway 煙霧 E2E 通道
  - 執行模擬的 Control UI 瀏覽器 E2E 通道
- 預期：
  - CI 安全且無需金鑰
  - 需要安裝 Playwright Chromium

### E2E (gateway smoke)

- 指令：`pnpm test:e2e:gateway`
- 設定：`vitest.e2e.config.ts`
- 檔案：`src/**/*.e2e.test.ts`、`test/**/*.e2e.test.ts`，以及位於 `extensions/` 下的 bundled-plugin E2E 測試
- 執行時期預設值：
  - 使用 Vitest `threads` 搭配 `isolate: false`，與 repo 其餘部分保持一致。
  - 使用自適應工作執行緒 (CI：最多 2 個，本機：預設 1 個)。
  - 預設以靜音模式執行，以減少主控台 I/O 開銷。
- 有用的覆寫選項：
  - `OPENCLAW_E2E_WORKERS=<n>` 用於強制指定工作執行緒數量 (上限為 16)。
  - `OPENCLAW_E2E_VERBOSE=1` 用於重新啟用詳細的主控台輸出。
- 範圍：
  - 多實例 Gateway 端對端行為
  - WebSocket/HTTP 介面、節點配對，以及較重的網路操作
- 預期：
  - 在 CI 中執行 (當在 pipeline 中啟用時)
  - 不需要真實的金鑰
  - 比單元測試有更多運作元件 (可能會較慢)

### E2E (Control UI mocked browser)

- 指令：`pnpm test:ui:e2e`
- 設定：`test/vitest/vitest.ui-e2e.config.ts`
- 檔案：`ui/src/**/*.e2e.test.ts`
- 範圍：
  - 啟動 Vite Control UI
  - 透過 Playwright 驅動真實的 Chromium 頁面
  - 使用確定性 (deterministic) 的瀏覽器內部模擬 來取代 Gateway WebSocket
- 預期：
  - 作為 `pnpm test:e2e` 的一部分在 CI 中執行
  - 不需要真實的 Gateway、代理程式 或 Provider 金鑰
  - 必須存在瀏覽器相依性 (`pnpm --dir ui exec playwright install chromium`)

### E2E：OpenShell backend smoke

- 指令：`pnpm test:e2e:openshell`
- 檔案：`extensions/openshell/src/backend.e2e.test.ts`
- 範圍：
  - 透過 Docker 在主機上啟動獨立的 OpenShell gateway
  - 從暫存的本機 Dockerfile 建立 sandbox
  - 透過真實的 `sandbox ssh-config` + SSH exec 測試 OpenClaw 的 OpenShell backend
  - 透過 sandbox fs 橋接器驗證遠端標準 (remote-canonical) 檔案系統行為
- 預期：
  - 僅供選擇加入；並非預設 `pnpm test:e2e` 執行的一部分
  - 需要本機 `openshell` CLI 以及可運作的 Docker daemon
  - 使用獨立的 `HOME` / `XDG_CONFIG_HOME`，接著銷毀測試 gateway 和 sandbox
- 有用的覆寫選項：
  - `OPENCLAW_E2E_OPENSHELL=1` 以在手動執行更廣泛的 e2e 測試套件時啟用該測試
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` 以指向非預設的 CLI 二進位檔或包裝腳本

### Live (真實的供應商 + 真實的模型)

- 指令：`pnpm test:live`
- 配置：`vitest.live.config.ts`
- 檔案：`src/**/*.live.test.ts`、`test/**/*.live.test.ts`，以及 `extensions/` 下的 bundled-plugin live 測試
- 預設：透過 `pnpm test:live` **啟用** (設定 `OPENCLAW_LIVE_TEST=1`)
- 範圍：
  - 「此供應商/模型在 _今天_ 是否能透過真實憑證實際運作？」
  - 捕捉供應商格式變更、工具呼叫怪癖、驗證問題以及速率限制行為
- 預期：
  - 設計上不保證 CI 穩定 (真實網路、真實供應商政策、配額、服務中斷)
  - 需要花費費用 / 使用速率限制
  - 偏好執行縮小的子集而非「全部」
- Live 執行使用已匯出的 API 金鑰和暫存的驗證設定檔。
- 預設情況下，Live 執行仍會隔離 `HOME` 並將配置/驗證資料複製到暫存測試主目錄，因此單元測試裝置不會變更您真實的 `~/.openclaw`。
- 僅當您有意讓 Live 測試使用您的真實主目錄時，才設定 `OPENCLAW_LIVE_USE_REAL_HOME=1`。
- `pnpm test:live` 預設為較安靜的模式：它會保留 `[live] ...` 進度輸出並靜音 gateway 引導日誌/Bonjour 閒聊。如果您想要完整的啟動日誌，請設定 `OPENCLAW_LIVE_TEST_QUIET=0`。
- API 金鑰輪換 (供應商特定)：以逗號/分號格式設定 `*_API_KEYS` 或 `*_API_KEY_1`、`*_API_KEY_2` (例如 `OPENAI_API_KEYS`、`ANTHROPIC_API_KEYS`、`GEMINI_API_KEYS`) 或透過 `OPENCLAW_LIVE_*_KEY` 進行每次 Live 的覆寫；測試會在速率限制回應時重試。
- 進度/心跳輸出：
  - Live 測試套件現在會向 stderr 輸出進度行，因此即使 Vitest 主控台擷取處於安靜狀態，長時間的供應商呼叫也能顯示為活動狀態。
  - `vitest.live.config.ts` 會停用 Vitest 主控台攔截，以便供應商/gateway 進度行在 Live 執行期間立即串流輸出。
  - 使用 `OPENCLAW_LIVE_HEARTBEAT_MS` 調整 direct-model 心跳。
  - 使用 `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS` 調整 gateway/probe 心跳。

## 我應該執行哪個測試套件？

請使用此決策表：

- 編輯邏輯/測試：執行 `pnpm test`（如果有大幅變更，則同時執行 `pnpm test:coverage`）
- 涉及 gateway 網路/WS 協定/配對：加入 `pnpm test:e2e`
- 偵錯「我的機器人掛了」/ 特定供應商失敗 / 工具呼叫：執行縮小範圍的 `pnpm test:live`

## Live（實際連線網路）測試

關於 live model 矩陣、CLI backend smokes、ACP smokes、Codex app-server harness，以及所有 media-provider live 測試（Deepgram、BytePlus、ComfyUI、image、music、video、media harness）——加上 live 執行的憑證處理——請參閱 [測試 live 套件](/zh-Hant/help/testing-live)。關於專用的更新與外掛驗證檢查清單，請參閱 [測試更新與外掛](/zh-Hant/help/testing-updates-plugins)。

## Docker 執行器（選用的「在 Linux 上運作」檢查）

這些 Docker 執行器分為兩類：

- Live-model 執行器：`test:docker:live-models` 和 `test:docker:live-gateway` 僅在 repo Docker 映像檔（`src/agents/models.profiles.live.test.ts` 和 `src/gateway/gateway-models.profiles.live.test.ts`）內執行其對應的 profile-key live 檔案，並掛載您的本機設定目錄、工作區和選用的 profile 環境檔案。對應的本機進入點為 `test:live:models-profiles` 和 `test:live:gateway-profiles`。
- Docker live 執行器預設為較小的 smoke 上限，以便完整的 Docker 掃描保持實用：
  `test:docker:live-models` 預設為 `OPENCLAW_LIVE_MAX_MODELS=12`，且
  `test:docker:live-gateway` 預設為 `OPENCLAW_LIVE_GATEWAY_SMOKE=1`、
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`、
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` 和
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`。當您
  明確需要較大的完整掃描時，請覆寫這些環境變數。
- `test:docker:all` 透過 `test:docker:live-build` 建構一次 live Docker 映像檔，透過 `scripts/package-openclaw-for-docker.mjs` 將 OpenClaw 打包一次為 npm tarball，然後建構/重用兩個 `scripts/e2e/Dockerfile` 映像檔。Bare 映像檔僅供 install/update/plugin-dependency lanes 使用的 Node/Git runner；這些 lanes 會掛載預先建構的 tarball。Functional 映像檔會將相同的 tarball 安裝到 `/app` 中，用於 built-app functionality lanes。Docker lane 定義位於 `scripts/lib/docker-e2e-scenarios.mjs`；planner 邏輯位於 `scripts/lib/docker-e2e-plan.mjs`；`scripts/test-docker-all.mjs` 會執行選定的計畫。Aggregate 使用加權的本機排程器：`OPENCLAW_DOCKER_ALL_PARALLELISM` 控制程序插槽，而資源上限則防止繁重的 live、npm-install 和 multi-service lanes 同時啟動。如果單一 lane 超過目前上限，排程器仍可在集區空閒時啟動它，並讓它單獨執行直到容量再次可用。預設值為 10 個插槽、`OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`；僅當 Docker 主機有更多餘裕時才調整 `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` 或 `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`。Runner 預設會執行 Docker preflight，移除過時的 OpenClaw E2E 容器，每 30 秒列印狀態，將成功的 lane 執行時間儲存在 `.artifacts/docker-tests/lane-timings.json`，並使用這些執行時間在後續執行中優先啟動較長的 lanes。使用 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 列印加權 lane 資訊清單而不建構或執行 Docker，或使用 `node scripts/test-docker-all.mjs --plan-json` 列印選定 lanes、套件/映像檔需求及憑證的 CI 計畫。
- `Package Acceptance` 是 GitHub 原生套件檢查閘道，用於確認「此可安裝 tarball 是否能作為產品正常運作？」它會從 `source=npm`、`source=ref`、`source=url` 或 `source=artifact` 解析出一個候選套件，將其上傳為 `package-under-test`，然後針對該確切的 tarball 執行可重複使用的 Docker E2E 通道，而非重新打包選定的 ref。Profiles 的排序依據涵蓋範圍：`smoke`、`package`、`product` 和 `full`。請參閱 [Testing updates and plugins](/zh-Hant/help/testing-updates-plugins) 以了解套件/更新/外掛合約、已發布升級存活矩陣、發布預設值與失敗分類。
- 建置與發布檢查會在 tsdown 之後執行 `scripts/check-cli-bootstrap-imports.mjs`。此防護機制會從 `dist/entry.js` 和 `dist/cli/run-main.js` 遍歷靜態建置圖，若在命令分派之前，預先分派啟動程序導入了套件相依性（如 Commander、prompt UI、undici 或 logging），就會導致失敗；它還能確保打包後的 gateway 執行區塊保持在預算範圍內，並拒絕對已知冷 gateway 路徑的靜態匯入。打包後的 CLI 煙霧測試也涵蓋了根目錄說明、入門說明、doctor 說明、狀態、設定綱要以及 model-list 指令。
- 套件驗收（Package Acceptance）的舊版相容性上限為 `2026.4.25`（包含 `2026.4.25-beta.*`）。在此截止版本之前，測試僅容許已發布套件的中繼資料缺口：省略的私人 QA 清單項目、缺少的 `gateway install --wrapper`、從 tarball 衍生的 git fixture 中缺少的修補檔、缺少持續化 `update.channel`、舊版外掛安裝記錄位置、缺少 marketplace 安裝記錄持續化，以及在 `plugins update` 期間的設定中繼資料移轉。對於 `2026.4.25` 之後的套件，這些路徑將會導致嚴格的失敗。
- Container smoke runners：`test:docker:openwebui`、`test:docker:onboard`、`test:docker:npm-onboard-channel-agent`、`test:docker:release-user-journey`、`test:docker:release-typed-onboarding`、`test:docker:release-media-memory`、`test:docker:release-upgrade-user-journey`、`test:docker:release-plugin-marketplace`、`test:docker:skill-install`、`test:docker:update-channel-switch`、`test:docker:upgrade-survivor`、`test:docker:published-upgrade-survivor`、`test:docker:session-runtime-context`、`test:docker:agents-delete-shared-workspace`、`test:docker:gateway-network`、`test:docker:browser-cdp-snapshot`、`test:docker:mcp-channels`、`test:docker:pi-bundle-mcp-tools`、`test:docker:cron-mcp-cleanup`、`test:docker:plugins`、`test:docker:plugin-update`、`test:docker:plugin-lifecycle-matrix` 和 `test:docker:config-reload` 會啟動一個或多個真實容器，並驗證更高層級的整合路徑。

live-model Docker runner 也僅 bind-mount 所需的 CLI auth 主目錄（或在運行未縮小範圍時掛載所有支援的主目錄），然後在運行前將其複製到容器主目錄中，以便外部-CLI OAuth 可以刷新 token 而不會變更主機 auth store：

- Direct models：`pnpm test:docker:live-models`（腳本：`scripts/test-live-models-docker.sh`）
- ACP bind smoke：`pnpm test:docker:live-acp-bind`（腳本：`scripts/test-live-acp-bind-docker.sh`；預設涵蓋 Claude、Codex 和 Gemini，並透過 `pnpm test:docker:live-acp-bind:droid` 和 `pnpm test:docker:live-acp-bind:opencode` 嚴格涵蓋 Droid/OpenCode）
- CLI backend smoke：`pnpm test:docker:live-cli-backend`（腳本：`scripts/test-live-cli-backend-docker.sh`）
- Codex app-server harness smoke：`pnpm test:docker:live-codex-harness`（腳本：`scripts/test-live-codex-harness-docker.sh`）
- Gateway + dev agent：`pnpm test:docker:live-gateway`（腳本：`scripts/test-live-gateway-models-docker.sh`）
- Observability smokes：`pnpm qa:otel:smoke`、`pnpm qa:prometheus:smoke` 和 `pnpm qa:observability:smoke` 是私有的 QA source-checkout 通道。它們有意不包含在套件 Docker 發布通道中，因為 npm tarball 省略了 QA Lab。
- Open WebUI live smoke：`pnpm test:docker:openwebui`（腳本：`scripts/e2e/openwebui-docker.sh`）
- Onboarding 精靈 (TTY, 完整腳手架)：`pnpm test:docker:onboard` (腳本：`scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke：`pnpm test:docker:npm-onboard-channel-agent` 會在 Docker 中全域安裝打包好的 OpenClaw tarball，透過 env-ref onboarding 預設設定 OpenAI 和 Telegram，執行 doctor，並執行一次模擬的 OpenAI agent 週期。使用 `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重用預先建置的 tarball，使用 `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0` 跳過主機重建，或使用 `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` 或 `OPENCLAW_NPM_ONBOARD_CHANNEL=slack` 切換 channel。

- Release user journey smoke：`pnpm test:docker:release-user-journey` 會在乾淨的 Docker home 中全域安裝打包好的 OpenClaw tarball，執行 onboarding，設定模擬的 OpenAI provider，執行 agent 週期，安裝/解除安裝外部外掛，對本機 fixture 設定 ClickClack，驗證 outbound/inbound 傳訊，重新啟動 Gateway，並執行 doctor。
- Release typed onboarding smoke：`pnpm test:docker:release-typed-onboarding` 會安裝打包好的 tarball，透過真實的 TTY 驅動 `openclaw onboard`，將 OpenAI 設定為 env-ref provider，驗證沒有原始金鑰的持久化，並執行模擬的 agent 週期。
- Release media/memory smoke：`pnpm test:docker:release-media-memory` 會安裝打包好的 tarball，驗證來自 PNG 附件的圖片理解、OpenAI 相容的圖片生成輸出、記憶體搜尋召回，以及跨越 Gateway 重新啟動的召回存續性。
- Release upgrade user journey smoke：`pnpm test:docker:release-upgrade-user-journey` 預設會安裝 `openclaw@latest`，在已發佈的套件上設定 provider/plugin/ClickClack 狀態，升級到候選 tarball，然後重新執行核心 agent/plugin/channel 旅程。使用 `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>` 覆寫基線。
- Release plugin marketplace smoke：`pnpm test:docker:release-plugin-marketplace` 會從本機 fixture marketplace 安裝，更新已安裝的外掛，將其解除安裝，並驗證外掛 CLI 隨安裝元資料被修剪而消失。
- Skill install smoke: `pnpm test:docker:skill-install` 在 Docker 中全域安裝打包好的 OpenClaw tarball，在設定中停用上傳的壓縮檔安裝，從搜尋解析當前即時的 ClawHub skill slug，使用 `openclaw skills install` 進行安裝，並驗證已安裝的 skill 以及 `.clawhub` origin/lock 中繼資料。
- Update channel switch smoke: `pnpm test:docker:update-channel-switch` 在 Docker 中全域安裝打包好的 OpenClaw tarball，從 package `stable` 切換到 git `dev`，驗證更新後持續的 channel 與 plugin 是否正常運作，然後切換回 package `stable` 並檢查更新狀態。
- Upgrade survivor smoke: `pnpm test:docker:upgrade-survivor` 將打包好的 OpenClaw tarball 安裝在一個髒舊的使用者 fixture 上，其中包含 agents、channel config、plugin allowlists、陳舊的 plugin 依賴狀態，以及現有的 workspace/session 檔案。它在沒有即時 provider 或 channel 金鑰的情況下執行 package 更新與非互動式 doctor，然後啟動 loopback Gateway 並檢查設定/狀態的保留以及啟動/狀態的預算。
- 已發佈升級倖存者冒煙測試：`pnpm test:docker:published-upgrade-survivor` 預設安裝 `openclaw@latest`，植入真實的現有使用者檔案，使用烘焙的指令配方配置該基準，驗證產生的配置，將該已發佈的安裝更新為候選 tarball，執行非互動式 doctor，寫入 `.artifacts/upgrade-survivor/summary.json`，然後啟動一個 loopback Gateway 並檢查已配置的 intents、狀態保留、啟動、`/healthz`、`/readyz` 和 RPC 狀態預算。使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 覆蓋一個基準，要求彙總排程器使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`（例如 `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`）擴展精確的本地基準，並使用 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`（例如 `reported-issues`）擴展 issue-shaped fixtures；回報的問題集包括 `configured-plugin-installs`，用於自動修復外部 OpenClaw 外掛程式的安裝。Package Acceptance 將這些暴露為 `published_upgrade_survivor_baseline`、`published_upgrade_survivor_baselines` 和 `published_upgrade_survivor_scenarios`，解析諸如 `last-stable-4` 或 `all-since-2026.4.23` 之類的 meta baseline tokens，而 Full Release Validation 則將 release-soak package gate 擴展為 `last-stable-4 2026.4.23 2026.5.2 2026.4.15` 加上 `reported-issues`。
- Session runtime context 冒煙測試：`pnpm test:docker:session-runtime-context` 驗證隱藏的 runtime context transcript 持久性，以及 doctor 對受影響的重複 prompt-rewrite 分支的修復。
- Bun 全域安裝冒煙測試：`bash scripts/e2e/bun-global-install-smoke.sh` 打包當前樹，在隔離的 home 中使用 `bun install -g` 安裝它，並驗證 `openclaw infer image providers --json` 回傳打包的映像提供者而不是掛起。使用 `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz` 重複使用預先建置的 tarball，使用 `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` 跳過主機建置，或者使用 `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local` 從已建置的 Docker 映像複製 `dist/`。
- 安裝程式 Docker smoke：`bash scripts/test-install-sh-docker.sh` 在其 root、update 和 direct-npm 容器之間共享一個 npm 快取。Update smoke 預設以 npm `latest` 作為升級至候選 tarball 之前的穩定基準。在本機使用 `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` 覆蓋，或在 GitHub 上使用 Install Smoke 工作流程的 `update_baseline_version` 輸入來覆蓋。非 root 安裝程式檢查會保持獨立的 npm 快取，以免 root 擁有的快取條目掩蓋使用者本機的安裝行為。設定 `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` 以在本機重新執行時重複使用 root/update/direct-npm 快取。
- Install Smoke CI 會使用 `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` 跳過重複的 direct-npm 全域更新；當需要直接的 `npm install -g` 覆蓋率時，請在沒有該環境變數的情況下於本機執行腳本。
- Agents delete shared workspace CLI smoke：`pnpm test:docker:agents-delete-shared-workspace` (腳本：`scripts/e2e/agents-delete-shared-workspace-docker.sh`) 預設會建構 root Dockerfile 映像檔，在獨立的容器 home 中植入兩個代理程式和一個工作區，執行 `agents delete --json`，並驗證有效的 JSON 以及保留工作區的行為。使用 `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1` 重複使用 install-smoke 映像檔。
- Gateway networking (兩個容器，WS auth + health)：`pnpm test:docker:gateway-network` (腳本：`scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke：`pnpm test:docker:browser-cdp-snapshot` (腳本：`scripts/e2e/browser-cdp-snapshot-docker.sh`) 會建構來源 E2E 映像檔加上 Chromium 層，使用原始 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證 CDP role 快照涵蓋連結 URL、游標提升的可點擊項目、iframe 參照和 frame 中繼資料。
- OpenAI Responses web_search minimal reasoning regression：`pnpm test:docker:openai-web-search-minimal` (腳本：`scripts/e2e/openai-web-search-minimal-docker.sh`) 會透過 Gateway 執行模擬的 OpenAI 伺服器，驗證 `web_search` 將 `reasoning.effort` 從 `minimal` 提升至 `low`，然後強制提供者 schema 拒絕並檢查原始細節是否出現在 Gateway 日誌中。
- MCP 頻道橋接器 (已植入種子的 Gateway + stdio 橋接器 + 原始 Claude 通知框架冒煙測試)：`pnpm test:docker:mcp-channels` (腳本：`scripts/e2e/mcp-channels-docker.sh`)
- Pi 套件 MCP 工具 (真實 stdio MCP 伺服器 + 嵌入式 Pi 設定檔允許/拒絕冒煙測試)：`pnpm test:docker:pi-bundle-mcp-tools` (腳本：`scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Cron/subagent MCP 清理 (真實 Gateway + stdio MCP 子程序在隔離 cron 和一次性 subagent 執行後的拆除)：`pnpm test:docker:cron-mcp-cleanup` (腳本：`scripts/e2e/cron-mcp-cleanup-docker.sh`)
- 外掛 (本地路徑、`file:`、具有提升依賴項的 npm 註冊表、格式錯誤的 npm 套件中繼資料、git 移動參照、ClawHub 萬能測試、市場更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試)：`pnpm test:docker:plugins` (腳本：`scripts/e2e/plugins-docker.sh`)
  設定 `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` 以跳過 ClawHub 區塊，或使用 `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` 和 `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID` 覆蓋預設的 kitchen-sink 套件/執行時對。如果沒有 `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`，測試將使用封閉的本地 ClawHub fixture 伺服器。
- 外掛更新未變更冒煙測試：`pnpm test:docker:plugin-update` (腳本：`scripts/e2e/plugin-update-unchanged-docker.sh`)
- 外掛生命週期矩陣冒煙測試：`pnpm test:docker:plugin-lifecycle-matrix` 在空容器中安裝打包的 OpenClaw tarball，安裝 npm 外掛，切換啟用/停用，通過本地 npm 註冊表進行升級和降級，刪除已安裝的代碼，然後驗證解除安裝仍會移除陳舊狀態，同時記錄每個生命週期階段的 RSS/CPU 指標。
- 配置重新載入中繼資料冒煙測試：`pnpm test:docker:config-reload` (腳本：`scripts/e2e/config-reload-source-docker.sh`)
- 外掛：`pnpm test:docker:plugins` 涵蓋本地路徑、`file:`、具有提升依賴項的 npm 註冊表、git 移動參照、ClawHub fixtures、市場更新以及 Claude-bundle 啟用/檢查的安裝/更新冒煙測試。`pnpm test:docker:plugin-update` 涵蓋已安裝外掛的未變更新行為。`pnpm test:docker:plugin-lifecycle-matrix` 涵蓋資源追蹤的 npm 外掛安裝、啟用、停用、升級、降級以及缺少代碼的解除安裝。

若要手動預先建置並重複使用共享的功能映像檔：

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

特定測試套件的映像檔覆寫（例如 `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`）在設定時仍然優先。當 `OPENCLAW_SKIP_DOCKER_BUILD=1` 指向遠端共享映像檔時，如果本機尚未存在，腳本會將其拉取下來。QR 和安裝程式 Docker 測試保留它們自己的 Dockerfiles，因為它們驗證的是套件/安裝行為，而不是共享的建置應用程式執行時期。

live-model Docker 執行器也會以唯讀方式綁定掛載目前的 checkout，並將其暫存到容器內的臨時工作目錄中。這既讓執行時映像檔保持精簡，又能針對您的確切本機原始碼/設定執行 Vitest。暫存步驟會跳過大型僅限本機的快取以及應用程式建置輸出，例如 `.pnpm-store`、`.worktrees`、`__openclaw_vitest__`，以及應用程式本機 `.build` 或 Gradle 輸出目錄，以免 Docker live 執行花費數分鐘時間複製機器特定的構件。
它們也會設定 `OPENCLAW_SKIP_CHANNELS=1`，讓 gateway live 探測不會在容器內啟動真實的 Telegram/Discord/等 頻道 worker。
`test:docker:live-models` 仍然會執行 `pnpm test:live`，因此當您需要縮小或從該 Docker lane 排除 gateway live 涵蓋範圍時，請一併傳遞 `OPENCLAW_LIVE_GATEWAY_*`。
`test:docker:openwebui` 是較高層級的相容性冒煙測試：它會啟動啟用 OpenAI 相容 HTTP 端點的 OpenClaw gateway 容器，對該 gateway 啟動固定的 Open WebUI 容器，透過 Open WebUI 登入，驗證 `/api/models` 是否暴露 `openclaw/default`，然後透過 Open WebUI 的 `/api/chat/completions` proxy 傳送真實的聊天請求。
針對應在 Open WebUI 登入和模型探索後停止，而不需等待 live model 完成的發布途徑 CI 檢查，請設定 `OPENWEBUI_SMOKE_MODE=models`。
第一次執行可能會明顯變慢，因為 Docker 可能需要拉取 Open WebUI 映像檔，且 Open WebUI 可能需要完成其自身的冷啟動設定。
此 lane 需要可用的 live model 金鑰。您可以透過處理程序環境、已暫存的 auth 設定檔，或明確的 `OPENCLAW_PROFILE_FILE` 來提供。
成功的執行會列印出一個小型 JSON 載荷，例如 `{ "ok": true, "model": "openclaw/default", ... }`。
`test:docker:mcp-channels` 是刻意的確定性測試，不需要真實的 Telegram、Discord 或 iMessage 帳號。它會啟動一個已植入種子的 Gateway 容器，啟動第二個產生 `openclaw mcp serve` 的容器，然後透過真實的 stdio MCP 橋接器驗證路由對話探索、逐字稿讀取、附件中繼資料、live 事件佇列行為、輸出傳送路由，以及 Claude 風格的頻道 + 權限通知。通知檢查會直接檢查原始 stdio MCP 框架，因此冒煙測試驗證的是橋接器實際發出的內容，而不僅僅是特定用戶端 SDK 恰好呈現的內容。
`test:docker:pi-bundle-mcp-tools` 是確定性的，不需要 live model 金鑰。它會建置 repo Docker 映像檔，在容器內啟動真實的 stdio MCP probe server，透過內嵌的 Pi bundle MCP 執行階段具體化該 server，執行工具，然後驗證 `coding` 和 `messaging` 是否保留 `bundle-mcp` 工具，同時 `minimal` 和 `tools.deny: ["bundle-mcp"]` 會將其過濾掉。
`test:docker:cron-mcp-cleanup` 是確定性的，不需要 live model 金鑰。它會啟動具有真實 stdio MCP probe server 的已植入種子 Gateway，執行隔離的 cron 週期和 `sessions_spawn` 一次性子週期，然後驗證 MCP 子程序在每次執行後會退出。

手動 ACP 自然語言執行緒冒煙測試（非 CI）：

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- 請保留此腳本用於迴歸/除錯工作流程。它可能再次需要用於 ACP 執行緒路由驗證，因此請勿刪除它。

有用的環境變數：

- `OPENCLAW_CONFIG_DIR=...` (預設： `~/.openclaw`) 掛載至 `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (預設： `~/.openclaw/workspace`) 掛載至 `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` 已掛載並在執行測試前載入
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` 以僅驗證從 `OPENCLAW_PROFILE_FILE` 載入的環境變數，使用暫時的設定/工作區目錄並且不掛載外部 CLI 認證
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (預設： `~/.cache/openclaw/docker-cli-tools`) 掛載至 `/home/node/.npm-global` 用於 Docker 內的快取 CLI 安裝
- `$HOME` 下的外部 CLI 認證目錄/檔案以唯讀方式掛載於 `/host-auth...` 下，然後在測試開始前複製到 `/home/node/...`
  - 預設目錄： `.minimax`
  - 預設檔案： `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - 縮小的提供者執行僅掛載從 `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS` 推斷出的所需目錄/檔案
  - 使用 `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, 或逗號列表如 `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex` 手動覆蓋
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` 以縮小執行範圍
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` 以在容器內過濾提供者
- `OPENCLAW_SKIP_DOCKER_BUILD=1` 以重用現有的 `openclaw:local-live` 映像檔，用於不需要重新建置的重新執行
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以確保憑證來自設定檔存放區（而非環境變數）
- `OPENCLAW_OPENWEBUI_MODEL=...` 以選擇閘道針對 Open WebUI 冒煙測試公開的模型
- `OPENCLAW_OPENWEBUI_PROMPT=...` 用於覆寫 Open WebUI 測試所使用的 nonce-check 提示
- `OPENWEBUI_IMAGE=...` 用於覆寫固定的 Open WebUI 映像檔標籤

## :Docs sanity

編輯文件後執行文件檢查：`pnpm check:docs`。
當您也需要頁內標題檢查時，請執行完整的 Mintlify 錨點驗證：`pnpm docs:check-links:anchors`。

## 離線迴歸測試（CI 安全）

這些是沒有真實提供者的「真實管線」迴歸測試：

- Gateway 工具調用（模擬 OpenAI、真實的 gateway + agent 迴圈）：`src/gateway/gateway.test.ts`（案例：「透過 gateway agent 迴圈端到端執行模擬的 OpenAI 工具調用」）
- Gateway 精靈（WS `wizard.start`/`wizard.next`，寫入組態 + 強制執行驗證）：`src/gateway/gateway.test.ts`（案例：「透過 ws 執行精靈並寫入驗證權杖組態」）

## Agent 可靠性評估（技能）

我們已經有一些 CI 安全的測試，其運作方式類似「agent 可靠性評估」：

- 透過真實的 gateway + agent 迴圈進行模擬工具調用（`src/gateway/gateway.test.ts`）。
- 端到端精靈流程，用於驗證 session 連線和組態效果（`src/gateway/gateway.test.ts`）。

技能方面仍然缺少的內容（請參閱 [Skills](/zh-Hant/tools/skills)）：

- **決策制定：** 當提示中列出了技能時，agent 是否會選擇正確的技能（或避免不相關的技能）？
- **合規性：** agent 是否在使用前讀取 `SKILL.md` 並遵循必要的步驟/引數？
- **工作流程合約：** 多輪場景，用於斷言工具順序、session 歷程傳遞以及沙箱邊界。

未來的評估應優先保持決定性：

- 使用模擬提供者的場景執行器，以斷言工具調用 + 順序、技能檔案讀取以及 session 連線。
- 一套針對技能的小型場景（使用 vs 避免、閘道、提示注入）。
- 僅在 CI 安全測試套件就位後，才進行選用的即時評估（選用、環境閘道）。

## 合約測試（外掛和頻道形狀）

Contract tests verify that every registered plugin and channel conforms to its
interface contract. They iterate over all discovered plugins and run a suite of
shape and behavior assertions. The default `pnpm test` unit lane intentionally
skips these shared seam and smoke files; run the contract commands explicitly
when you touch shared channel or provider surfaces.

### Commands

- All contracts: `pnpm test:contracts`
- Channel contracts only: `pnpm test:contracts:channels`
- Provider contracts only: `pnpm test:contracts:plugins`

### Channel contracts

Located in `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Basic plugin shape (id, name, capabilities)
- **setup** - Setup wizard contract
- **session-binding** - Session binding behavior
- **outbound-payload** - Message payload structure
- **inbound** - Inbound message handling
- **actions** - Channel action handlers
- **threading** - Thread ID handling
- **directory** - Directory/roster API
- **group-policy** - Group policy enforcement

### Provider status contracts

Located in `src/plugins/contracts/*.contract.test.ts`.

- **status** - Channel status probes
- **registry** - Plugin registry shape

### Provider contracts

Located in `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Auth flow contract
- **auth-choice** - Auth choice/selection
- **catalog** - Model catalog API
- **discovery** - Plugin discovery
- **loader** - Plugin loading
- **runtime** - Provider runtime
- **shape** - Plugin shape/interface
- **wizard** - Setup wizard

### When to run

- After changing plugin-sdk exports or subpaths
- After adding or modifying a channel or provider plugin
- After refactoring plugin registration or discovery

Contract tests run in CI and do not require real API keys.

## Adding regressions (guidance)

When you fix a provider/model issue discovered in live:

- Add a CI-safe regression if possible (mock/stub provider, or capture the exact request-shape transformation)
- If it's inherently live-only (rate limits, auth policies), keep the live test narrow and opt-in via env vars
- Prefer targeting the smallest layer that catches the bug:
  - provider request conversion/replay bug → direct models test
  - gateway session/history/tool pipeline bug → gateway live smoke or CI-safe gateway mock test
- SecretRef 遍歷防護：
  - `src/secrets/exec-secret-ref-id-parity.test.ts` 從註冊表元資料 (`listSecretTargetRegistryEntries()`) 為每個 SecretRef 類別推導一個取樣目標，然後斷言遍歷區段執行 ID 會被拒絕。
  - 如果您在 `src/secrets/target-registry-data.ts` 中新增新的 `includeInPlan` SecretRef 目標系列，請更新該測試中的 `classifyTargetClass`。該測試會在未分類的目標 ID 上故意失敗，因此新的類別無法被無聲略過。

## 相關

- [即時測試](/zh-Hant/help/testing-live)
- [測試更新與外掛程式](/zh-Hant/help/testing-updates-plugins)
- [CI](/zh-Hant/ci)
