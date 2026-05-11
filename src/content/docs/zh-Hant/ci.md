---
summary: "CI 作業圖、範圍閘道與本地指令對等項"
title: CI 管線
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

CI 會在每次推送到 `main` 及每個拉取請求時執行。它使用智慧範圍設定，僅在變更區域無關時跳過耗時的作業。手動 `workflow_dispatch` 執行會刻意繞過智慧範圍設定，並針對發行候選版本或廣泛驗證展開完整的正常 CI 圖。

`Full Release Validation` 是「發行前執行所有項目」的手動總管工作流程。它接受分支、標籤或完整的提交 SHA，以該目標分派手動 `CI` 工作流程，並針對安裝煙霧測試、套件驗收、Docker 發行路徑套組、即時/E2E、OpenWebUI、QA Lab 一致性、Matrix 和 Telegram 通道分派 `OpenClaw Release Checks`。當提供已發布套件規格時，它也可以執行發布後 `NPM Telegram Beta E2E` 工作流程。總管工作流程會記錄已分派的子執行 ID，而最終的 `Verify full validation` 作業會重新檢查目前的子執行結論。如果子工作流程被重新執行並變為通過，請僅重新執行父項驗證作業以重新整理總管結果。

發行即時/E2E 子項保持廣泛的原生 `pnpm test:live` 涵蓋範圍，但它透過 `scripts/test-live-shard.mjs` 將其作為具名分片（`native-live-src-agents`、`native-live-src-gateway`、`native-live-test`、`native-live-extensions-a-k` 和 `native-live-extensions-l-z`）執行，而不是單一序列作業。這在保持相同檔案涵蓋範圍的同時，讓緩慢的即時提供者失敗更容易重新執行和診斷。

`Package Acceptance` 是用於驗證套件產出而不阻塞發行工作流程的側邊執行工作流程。它從已發布的 npm 規格、使用選定 `workflow_ref` 工具建置的可信 `package_ref`、帶有 SHA-256 的 HTTPS tarball URL，或另一個 GitHub Actions 執行的 tarball 產出中解析一個候選，將其上傳為 `package-under-test`，然後使用該 tarball 重用 Docker 發行/E2E 排程器，而不是重新打包工作流程检出。設定檔涵蓋了 smoke、package、product、full 和 custom Docker lane 選擇。`package` 設定檔使用離線插件覆蓋，因此已發布套件驗證不會受到即時 ClawHub 可用性的限制。可選的 Telegram lane 在 `NPM Telegram Beta E2E` 工作流程中重用 `package-under-test` 產出，並保留已發布 npm 規格路徑以用於獨立派送。

## 套件驗收

當問題是「這個可安裝的 OpenClaw 套件是否能作為產品正常運作？」時，請使用 `Package Acceptance`。它與正常 CI 不同：正常 CI 驗證原始碼樹，而套件驗收則透過使用者安裝或更新後執行的相同 Docker E2E 工具來驗證單一 tarball。

該工作流程有四個作業：

1. `resolve_package` 檢出 `workflow_ref`，解析一個套件候選，寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，寫入 `.artifacts/docker-e2e-package/package-candidate.json`，將兩者作為 `package-under-test` 產出上傳，並在 GitHub 步驟摘要中列印來源、工作流程引用、套件引用、版本、SHA-256 和設定檔。
2. `docker_acceptance` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml` 並帶有 `ref=workflow_ref` 和 `package_artifact_name=package-under-test`。可重用的工作流程下載該產出、驗證 tarball 清單、在需要時準備套件摘要 Docker 映像檔，並對該套件執行選定的 Docker lanes，而不是打包工作流程检出。
3. `package_telegram` 選擇性地呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不是 `none` 時它會運行，並且當 Package Acceptance 解析出一個時，安裝相同的 `package-under-test` 構件；獨立的 Telegram 分派仍然可以安裝已發布的 npm 規格。
4. `summary` 會在軟體包解析、Docker 驗收或可選的 Telegram 通道失敗時讓工作流程失敗。

來源候選：

- `source=npm`：僅接受 `openclaw@beta`、`openclaw@latest` 或精確的 OpenClaw 發布版本，例如 `openclaw@2026.4.27-beta.2`。將此用於已發布的 beta/stable 驗收。
- `source=ref`：打包受信任的 `package_ref` 分支、標籤或完整 commit SHA。解析器會擷取 OpenClaw 分支/標籤，驗證選定的 commit 可從儲存庫分支歷史記錄或發布標籤抵達，在分離的工作樹中安裝相依項，並使用 `scripts/package-openclaw-for-docker.mjs` 將其打包。
- `source=url`：下載 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact`：從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於外部共享的構件應該提供。

將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的受信任工作流程/線束程式碼。`package_ref` 是當 `source=ref` 時被打包的來源 commit。這讓當前的測試線束可以驗證較舊的受信任來源 commit，而無需執行舊的工作流程邏輯。

設定檔對應到 Docker 涵蓋範圍：

- `smoke`：`npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package`: `npm-onboard-channel-agent`、`doctor-switch`、
  `update-channel-switch`、`bundled-channel-deps-compat`、`plugins-offline`、
  `plugin-update`
- `product`: `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、
  `openai-web-search-minimal`、`openwebui`
- `full`: 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom`: 精確的 `docker_lanes`；當 `suite_profile=custom` 時需要

發布檢查會使用 `source=ref`、
`package_ref=<release-ref>`、`workflow_ref=<release workflow ref>`、
`suite_profile=custom`、
`docker_lanes='bundled-channel-deps-compat plugins-offline'` 和
`telegram_mode=mock-openai` 呼叫套件驗收（Package Acceptance）。發布路徑的 Docker
區塊涵蓋了重疊的套件/更新/外掛程式通道，而套件驗收則針對相同的已解析套件 tarball，確保
構件原生的綑綁通道相容性、離線外掛程式和 Telegram 驗證。
跨作業系統發布檢查仍涵蓋特定作業系統的上手、安裝程式和平台行為；
套件/更新產品驗證應從套件驗收開始。Windows 套件和安裝程式的新通道也會驗證
已安裝的套件是否能從原始的絕對 Windows 路徑匯入瀏覽器控制覆寫設定。

套件驗收透過 `2026.4.25` 為已發布的套件提供了一個有限的舊版相容視窗，包括 `2026.4.25-beta.*`。這些例外情況在此記錄，以免它們成為永久性的靜默跳過：`dist/postinstall-inventory.json` 中已知的私有 QA 項目可能在 tarball 遺漏這些檔案時發出警告；`doctor-switch` 可能在套件未公開該旗標時跳過 `gateway install --wrapper` 持續性子案例；`update-channel-switch` 可能會從 tarball 衍生的假 git fixture 中修剪遺失的 `pnpm.patchedDependencies`，並記錄遺失的已持續化 `update.channel`；plugin smokes 可能會讀取舊版安裝記錄位置或接受遺失的 marketplace 安裝記錄持續性；而 `plugin-update` 可能允許設定中繼資料遷移，同時仍要求安裝記錄和無重新安裝行為保持不變。在 `2026.4.25` 之後的套件必須符合現代契約；相同的條件會導致失敗而不是警告或跳過。

範例：

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

當調試失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 記錄、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或特定的 Docker lanes，而不是重新執行完整的發布驗證。

QA Lab 在主要的智慧範圍工作流程之外擁有專屬的 CI 通道。`Parity gate` 工作流程會在符合的 PR 變更和手動觸發時執行；它會建置私有的 QA 執行環境並比較模擬的 GPT-5.5 和 Opus 4.6 agentic 套件。`QA-Lab - All Lanes` 工作流程會在 `main` 上每日執行一次，並透過手動觸發；它會將模擬一致性檢查、即時 Matrix 通道，以及即時 Telegram 和 Discord 通道展開為並行的工作。即時工作使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex 租約。Matrix 針對排定和發布閘道使用 `--profile fast`，並僅在簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設值和手動工作流程輸入保持 `all`；手動 `matrix_profile=all` 觸發時總是會將完整的 Matrix 涵蓋範圍分割為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 工作。`OpenClaw Release Checks` 也會在發布核准前執行關鍵發布的 QA Lab 通道。

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的手動維護者工作流程。它預設為試執行，並且僅在 `apply=true` 時關閉明確列出的 PR。在修改 GitHub 之前，它會驗證已落地的 PR 已合併，且每個重複項都有共用的參照問題或重疊的變更區塊。

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於保持現有文件與最近落地的變更同步。它沒有單純的排程：在 `main` 上的成功非機器人推送 CI 執行可以觸發它，且手動觸發可以直接執行它。當 `main` 已繼續更新或在上個小時內已建立另一個非跳過的 Docs Agent 執行時，工作流程執行調用會跳過。當它執行時，它會審查從先前非跳過的 Docs Agent 來源 SHA 到目前 `main` 的提交範圍，因此每小時一次的執行可以涵蓋自上次文件處理以來累積的所有主要變更。

`Test Performance Agent` 工作流程是一個事件驅動的 Codex 維護管道，
用於執行緩慢的測試。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行
可以觸發它，但如果當天（UTC 時間）另一個工作流程執行調用已經
執行或正在執行，它會跳過。手動觸發會繞過每日活動
閘門。該管道會構建完整的套件分組 Vitest 效能報告，讓 Codex
只進行小幅度的保留覆蓋率的測試效能修正，而不是大規模
的重構，然後重新執行完整套件報告並拒絕降低
通過基準測試數量的變更。如果基準中有失敗的測試，Codex 可能只會
修正明顯的失敗，並且在提交任何內容之前，代理之後的完整套件報告必須通過。
當 `main` 在機器人推送落地之前前進，該管道
會將驗證過的補丁變基，重新執行 `pnpm check:changed`，並重試推送；
衝突的過時補丁會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex
動作能保持與 docs 代理相同的 drop-sudo 安全姿態。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 工作概覽

| 工作                             | 目的                                                                     | 執行時機                 |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `preflight`                      | 偵測僅文件的變更、變更的範圍、變更的副檔名，並建構 CI 清單               | 始終在非草稿推送和 PR 上 |
| `security-scm-fast`              | 透過 `zizmor` 進行金鑰偵測和工作流程審核                                 | 始終在非草稿推送和 PR 上 |
| `security-dependency-audit`      | 針對 npm 公告的無依賴生產鎖定檔審核                                      | 始終在非草稿推送和 PR 上 |
| `security-fast`                  | 快速安全性工作的必要聚合                                                 | 始終在非草稿推送和 PR 上 |
| `build-artifacts`                | 建構 `dist/`、控制 UI、建置成品檢查以及可重複使用的下游成品              | Node 相關的變更          |
| `checks-fast-core`               | 快速 Linux 正確性管道，例如打包/外掛合約/協議檢查                        | Node 相關的變更          |
| `checks-fast-contracts-channels` | 具有穩定聚合檢查結果的分片頻道合約檢查                                   | Node 相關的變更          |
| `checks-node-extensions`         | 跨擴充功能套件的完整打包外掛測試分片                                     | Node 相關的變更          |
| `checks-node-core-test`          | 核心 Node 測試分片，排除 channel、bundled、contract 和 extension 軌道    | Node 相關變更            |
| `check`                          | 分片的主要本地閘道等效項：生產類型、lint、守衛、測試類型和嚴格的冒煙測試 | Node 相關變更            |
| `check-additional`               | 架構、邊界、擴展表面守衛、套件邊界和 gateway-watch 分片                  | Node 相關變更            |
| `build-smoke`                    | 已建構 CLI 冒煙測試和啟動記憶體冒煙測試                                  | Node 相關變更            |
| `checks`                         | 已建構軟體通道測試的驗證器                                               | Node 相關變更            |
| `checks-node-compat-node22`      | Node 22 相容性建置和冒煙測試軌道                                         | 發布的手動 CI 調度       |
| `check-docs`                     | 文件格式化、lint 和失效連結檢查                                          | 文件變更                 |
| `skills-python`                  | Python 支援技能的 Ruff + pytest                                          | Python 技能相關變更      |
| `checks-windows`                 | Windows 特定的程式/路徑測試加上共用執行時匯入指定符回歸測試              | Windows 相關變更         |
| `macos-node`                     | 使用共用已建構軟體的 macOS TypeScript 測試軌道                           | macOS 相關變更           |
| `macos-swift`                    | macOS 應用程式的 Swift lint、建置和測試                                  | macOS 相關變更           |
| `android`                        | 針對兩種風格的 Android 單元測試以及一個偵錯 APK 建置                     | Android 相關變更         |
| `test-performance-agent`         | 受信任活動之後每日 Codex 慢速測試最佳化                                  | 主要 CI 成功或手動調度   |

手動 CI 調度執行與正常 CI 相同的作業圖，但會強制開啟所有範圍軌道：Linux Node 分片、bundled-plugin 分片、通道契約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS、Android 和 Control UI i18n。手動執行使用唯一的並行群組，因此發布候選的完整套件不會被同一參考上的另一個推送或 PR 執行取消。可選的 `target_ref` 輸入允許受信任的呼叫者在使用所選調度參考中的工作流程檔案時，針對分支、標籤或完整提交 SHA 執行該圖。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 快速失敗順序

作業的排序確保廉價的檢查在昂貴的作業執行前失敗：

1. `preflight` 決定哪些通道存在。`docs-scope` 和 `changed-scope` 邏輯是此作業內的步驟，而非獨立作業。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，無需等待較重的構件和平台矩陣作業。
3. `build-artifacts` 與快速 Linux 通道重疊，以便下游消費者可以在共用構件準備好時立即開始。
4. 較重的平台和執行時通道隨後展開：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-extensions`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

範圍邏輯位於 `scripts/ci-changed-scope.mjs`，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。
手動觸發會跳過變更範圍檢測，並使預檢清單表現得就像每個範圍區域都變更了一樣。
CI 工作流程編輯會驗證 Node CI 圖譜以及工作流程 lint，但不會自行強制執行 Windows、Android 或 macOS 原生建置；這些平台通道僅限於平台原始碼變更。
僅限 CI 路由的編輯、選定的低成本核心測試 fixture 編輯，以及狹窄的 plugin contract helper/test-routing 編輯使用僅限 Node 的快速清單路徑：預檢、安全性，以及單一 `checks-fast-core` 任務。當變更檔案僅限於快速任務直接執行的路由或 helper 介面時，該路徑會避開建置產物、Node 22 相容性、channel contracts、完整核心分片、bundled-plugin 分片以及額外的防護矩陣。
Windows Node 檢查僅限於 Windows 特定的 process/path 包裝器、npm/pnpm/UI runner helper、套件管理員設定，以及執行該通道的 CI 工作流程介面；不相關的原始碼、plugin、install-smoke 和僅測試的變更會留在 Linux Node 通道上，以免為已由一般測試分片執行的覆蓋率預留 16 vCPU 的 Windows worker。
獨立的 `install-smoke` 工作流程透過其自己的 `preflight` 任務重複使用相同的範圍腳本。它將 smoke 覆蓋率分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。Pull requests 會針對 Docker/套件介面、bundled plugin 套件/清單變更，以及 Docker smoke 任務練習的核心 plugin/channel/gateway/Plugin SDK 介面執行快速路徑。僅原始碼的 bundled plugin 變更、僅測試的編輯和僅文件的編輯不會預留 Docker worker。快速路徑會建置根 Dockerfile 映像檔一次、檢查 CLI、執行 agents delete shared-workspace CLI smoke、執行 container gateway-network e2e、驗證 bundled extension build arg，並在 240 秒的總合指令逾時下執行有界的 bundled-plugin Docker 設定檔，每個情境的 Docker 執行個別設有上限。完整路徑會為定期排程執行、手動觸發、workflow-call release 檢查，以及真正觸及安裝程式/套件/Docker 介面的 pull requests 保留 QR 套件安裝和安裝程式 Docker 更新覆蓋率。`main` 的推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯在推送時請求完整覆蓋率時，工作流程會保留快速 Docker smoke 並將完整安裝 smoke 留給定期或 release 驗證。緩慢的 Bun 全域安裝 image-provider smoke 由 `run_bun_global_install_smoke` 另外閘控；它在定期排程和 release 檢查工作流程上執行，手動 `install-smoke` 觸發可以選擇加入，但 pull requests 和 `main` 推送不會執行它。QR 和安裝程式 Docker 測試保留各自專注於安裝的 Dockerfiles。本機 `test:docker:all` 會預先建置一個共用的 live-test 映像檔、將 OpenClaw 打包一次為 npm tarball，並建置兩個共用的 `scripts/e2e/Dockerfile` 映像檔：一個用於安裝程式/更新/plugin 相依性通道的裸機 Node/Git runner，以及一個將相同 tarball 安裝進 `/app` 用於正常功能通道的功能性映像檔。Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而 runner 只執行選定的計畫。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選擇映像檔，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道；使用 `OPENCLAW_DOCKER_ALL_PARALLELISM` 調整預設的 main-pool 插槽數量 10，並使用 `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` 調整供應器敏感的 tail-pool 插槽數量 10。重型通道上限預設為 `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`、`OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` 和 `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`，因此 npm install 和多服務通道不會過度承諾 Docker，同時較輕量的通道仍會填滿可用插槽。單一通道若重於有效上限，仍可從空的集區開始，然後獨自執行直到釋放容量。通道預設錯開 2 秒啟動，以避免本機 Docker daemon 建立風暴；可以使用 `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` 或其他毫秒值覆蓋。本機總合預檢 Docker、移除過時的 OpenClaw E2E 容器、輸出 active-lane 狀態、保存通道時序以進行最長優先排序，並支援 `OPENCLAW_DOCKER_ALL_DRY_RUN=1` 以供排程器檢查。預設情況下，它會在第一次失敗後停止排程新的集區通道，且每個通道都有 120 分鐘的後備逾時，可使用 `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` 覆蓋；選定的 live/tail 通道使用更嚴格的每通道上限。`OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` 會執行精確的排程器通道，包括僅限 release 的通道（例如 `install-e2e`）和分割的 bundled 更新通道（例如 `bundled-channel-update-acpx`），同時跳過清理 smoke，以便 agents 可以重現單一失敗通道。可重複使用的 live/E2E 工作流程詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪個套件、映像種類、live 映像、通道和憑證覆蓋率，然後 `scripts/docker-e2e.mjs` 將該計畫轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件產物，或從 `package_artifact_run_id` 下載套件產物；驗證 tarball 清單；當計畫需要已安裝套件的通道時，透過 Blacksmith 的 Docker 層級快取建置並推送標記套件摘要的裸機/功能性 GHCR Docker E2E 映像；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像，而非重新建置。`Package Acceptance` 工作流程是高階的套件閘道：它從 npm、受信任的 `package_ref`、HTTPS tarball 加上 SHA-256 或先前的的工作流程產物解析候選項，然後將該單一 `package-under-test` 產物傳遞到可重複使用的 Docker E2E 工作流程。它將 `workflow_ref` 與 `package_ref` 分開，以便目前的 acceptance 邏輯可以在不檢出舊工作流程程式碼的情況下驗證較舊的受信任提交。Release 檢查會針對目標 ref 執行自訂的套件驗收差異：bundled-channel 相容性、離線 plugin fixtures，以及針對已解析 tarball 的 Telegram 套件 QA。Release 路徑 Docker 套件會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行四個分區工作，因此每個分區僅提取其所需的映像種類，並透過相同的加權排程器（`OPENCLAW_DOCKER_ALL_PROFILE=release-path`、`OPENCLAW_DOCKER_ALL_CHUNK=core|package-update|plugins-runtime|bundled-channels`）執行多個通道。當完整的 release 路徑覆蓋率要求時，OpenWebUI 會被納入 `plugins-runtime`，並僅針對僅 OpenWebUI 的觸發保留獨立的 `openwebui` 分區。`package-update` 分區會將安裝程式 E2E 分割為 `install-e2e-openai` 和 `install-e2e-anthropic`；`install-e2e` 仍為總合手動重新執行別名。`bundled-channels` 分區會執行分割的 `bundled-channel-*` 和 `bundled-channel-update-*` 通道，而非序列化的 all-in-one `bundled-channel-deps` 通道；`plugins-integrations` 仍為用於手動重新執行的舊版總合別名。每個分區都會上傳 `.artifacts/docker-tests/`，其中包含通道日誌、時序、`summary.json`、`failures.json`、階段時序、排程器計畫 JSON、慢速通道表格和每通道重新執行指令。工作流程 `docker_lanes` 輸入會針對準備好的映像檔執行選定的通道，而非分區工作，這使得失敗通道的偵錯僅限於一個目標 Docker 工作，並為該執行準備、下載或重複使用套件產物；如果選定的通道是 live Docker 通道，目標工作會為該重新執行在本機建置 live-test 映像檔。產生的每通道 GitHub 重新執行指令會在這些值存在時包含 `package_artifact_run_id`、`package_artifact_name` 和準備好的映像輸入，因此失敗的通道可以重複使用失敗執行中的確切套件和映像。使用 `pnpm test:docker:rerun <run-id>` 從 GitHub 執行下載 Docker 產物並列印總合/每通道目標重新執行指令；使用 `pnpm test:docker:timings <summary.json>` 取得慢速通道和階段關鍵路徑摘要。排程的 live/E2E 工作流程每天執行完整的 release 路徑 Docker 套件。bundled 更新矩陣會依更新目標分割，因此重複的 npm update 和 doctor repair 修復回合可以與其他 bundled 檢查分片。

區域變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該區域檢查閘門對於架構邊界的限制比廣泛的 CI 平台範圍更嚴格：核心生產環境變更會執行核心 prod 和核心 test typecheck 以及核心 lint/guards，核心僅測試變更只會執行核心 test typecheck 以及核心 lint，擴充功能生產環境變更會執行擴充功能 prod 和擴充功能 test typecheck 以及擴充功能 lint，而擴充功能僅測試變更則執行擴充功能 test typecheck 以及擴充功能 lint。公開 Plugin SDK 或 plugin-contract 的變更會擴展到擴充功能 typecheck，因為擴充功能依賴於這些核心合約，但 Vitest 擴充功能掃描是明確的測試工作。僅發行元資料的版本更新會執行針對特定版本/config/root-dependency 的檢查。未知的 root/config 變更會容錯執行所有檢查通道。

手動 CI 分派會執行 `checks-node-compat-node22` 作為發行候選版本的相容性覆蓋。一般的 PR 和 `main` 推送會跳過該通道，並將矩陣集中在 Node 24 測試/通道上。

最慢的 Node 測試系列會進行分割或平衡，以確保每個作業保持小型而不會過度預約 Runner：通道合約作為三個加權分片運行，捆綁插件測試在六個擴展工作器之間平衡，小型核心單元通道成對運行，自動回覆作為四個平衡的工作器運行，並將回覆子樹分割為 agent-runner、dispatch 以及 commands/state-routing 分片，而代理網關/插件配置則分散到現有的僅源碼代理 Node 作業中，而不是等待已建構的成品。廣泛的瀏覽器、QA、媒體和雜項插件測試使用其專用的 Vitest 配置，而不是共享的插件通用配置。擴展分片作業一次運行最多兩個插件配置組，每組一個 Vitest 工作器，並配備較大的 Node 堆，以便導入密集的插件批次不會產生額外的 CI 作業。廣泛的代理通道使用共享的 Vitest 檔案並行調度器，因為它是由導入/調度主導，而不是由單個慢速測試檔案佔有。`runtime-config` 與 infra core-runtime 分片一起運行，以防止共享 runtime 分片佔有尾部。包含模式分片使用 CI 分片名稱記錄計時條目，因此 `.artifacts/vitest-shard-timings.json` 可以區分完整配置與過濾後的分片。`check-additional` 將包邊界編譯/金絲雀工作保持在一起，並將 runtime 拓撲架構與網監控覆蓋範圍分開；邊界守衛分片在一個作業內並發運行其小型獨立守衛。網監控、通道測試和核心支援邊界分片在 `build-artifacts` 內並發運行，前提是 `dist/` 和 `dist-runtime/` 已經建構完成，保留其舊的檢查名稱作為輕量級驗證作業，同時避免兩個額外的 Blacksmith 工作器和第二個成品消費者佇列。
Android CI 同時運行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建構 Play debug APK。第三方風格沒有單獨的來源集或清單；其單元測試通道仍然使用 SMS/call-log BuildConfig 標誌編譯該風格，同時避免在每次 Android 相關推送時重複執行 debug APK 打包作業。
當較新的推送抵達同一個 PR 或 `main` ref 時，GitHub 可能會將被取代的作業標記為 `cancelled`。將其視為 CI 噪音，除非該 ref 的最新運行也失敗。聚合分片檢查使用 `!cancelled() && always()`，以便它們仍然報告正常的分片失敗，但在整個工作流程已被取代後不排隊。
自動 CI 並發金鑰是版本化的 (`CI-v7-*`)，因此舊佇列組中 GitHub 端的殭屍程序無法無限期地阻塞較新的 main 運行。手動全套運行使用 `CI-manual-v1-*` 並且不取消正在進行的運行。

## 執行器

| 執行器                           | 工作                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全工作與匯總（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速協定/合約/打包檢查、分片通道合約檢查、除 lint 外的 `check` 分片、`check-additional` 分片與匯總、Node 測試匯總驗證器、文件檢查、 Python 技能檢查、workflow-sanity、labeler、auto-response；install-smoke 預檢也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣能更早排隊 |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 測試分片、打包外掛測試分片、`android`                                                                                                                                                                                                                                                                                                  |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`，其仍對 CPU 相當敏感，因此 8 個 vCPU 的成本高於其節省的；install-smoke Docker 建置，其中 32 個 vCPU 的排隊時間成本高於其節省的                                                                                                                                                                                                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 於 `openclaw/openclaw`；分支會退回至 `macos-latest`                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 於 `openclaw/openclaw`；分支會退回至 `macos-latest`                                                                                                                                                                                                                                                                                                                 |

## 本地等價指令

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:changed   # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## 相關

- [安裝概覽](/zh-Hant/install)
- [發布通道](/zh-Hant/install/development-channels)
