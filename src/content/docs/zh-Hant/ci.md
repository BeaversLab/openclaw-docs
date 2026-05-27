---
summary: "CI 工作圖、範圍閘道、發行傘與本地指令對等項"
title: "CI 管道"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 會在每次推送到 `main` 和每個拉取請求時執行。`preflight` 工作會對差異進行分類，並在只有不相關區域變更時關閉昂貴的通道。手動 `workflow_dispatch` 執行會刻意繞過智慧範圍設定，並為發行候選版本和廣泛驗證展開完整圖形。Android 通道透過 `include_android` 保持選用。僅限發行版本的插件涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流程中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動分派執行。

## 管道概覽

| 工作                               | 用途                                                                             | 執行時機                     |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `preflight`                        | 偵測僅文件變更、變更範圍、變更擴充功能，並建構 CI 清單                           | 總是在非草稿推送與 PR 上執行 |
| `security-fast`                    | 金鑰偵測、透過 `zizmor` 進行的工作流程審核，以及生產環境鎖定檔案審核             | 總是在非草稿推送與 PR 上執行 |
| `check-dependencies`               | Production Knip 僅依賴項目傳遞以及未使用檔案允許清單防護                         | Node 相關變更                |
| `build-artifacts`                  | 建置 `dist/`、Control UI、內建 CLI 燒錄測試、內建構件檢查以及可重複使用的構件    | Node 相關變更                |
| `checks-fast-core`                 | 快速的 Linux 正確性通道，例如 bundle、protocol 和 CI-routing 檢查                | Node 相關變更                |
| `checks-fast-contracts-plugins-*`  | 兩個分片的插件合約檢查                                                           | Node 相關變更                |
| `checks-fast-contracts-channels-*` | 兩個分片的通道合約檢查                                                           | Node 相關變更                |
| `checks-node-core-*`               | 核心 Node 測試分片，排除 channel、bundled、contract 和 extension 通道            | Node 相關變更                |
| `check-*`                          | 分片的主要本地閘道同等項目：prod types、lint、guards、test types 和 strict smoke | Node 相關變更                |
| `check-additional-*`               | 架構、分片邊界/提示漂移、擴充功能防護、套件邊界和執行時期拓撲                    | 與 Node 相關的變更           |
| `checks-node-compat-node22`        | Node 22 相容性建置和燒錄通道                                                     | 用於發行的手動 CI 分派       |
| `check-docs`                       | 文件格式、lint 和中斷連結檢查                                                    | 文件已變更                   |
| `skills-python`                    | 用於 Python 支援技能的 Ruff + pytest                                             | Python 技能相關變更          |
| `checks-windows`                   | Windows 特定的程序/路徑測試以及共用的執行時期匯入指定詞迴歸                      | Windows 相關變更             |
| `macos-node`                       | 使用共用建置產物 macOS TypeScript 測試通道                                       | macOS 相關變更               |
| `macos-swift`                      | macOS 應用程式的 Swift Lint、建置與測試                                          | macOS 相關變更               |
| `android`                          | 針對兩種風格的 Android 單元測試加上一個 Debug APK 建置                           | Android 相關變更             |
| `test-performance-agent`           | 受信任活動後的每日 Codex 慢速測試最佳化                                          | 主要 CI 成功或手動觸發       |
| `openclaw-performance`             | 每日/按需 Kova 執行時效能報告，包含模擬供應商、深度分析與 GPT 5.5 即時通道       | 排程與手動觸發               |

## 快速失敗順序

1. `preflight` 決定哪些通道會存在。`docs-scope` 和 `changed-scope` 邏輯是這個工作中的步驟，而非獨立的工作。
2. `security-fast`、`check-*`、`check-additional-*`、`check-docs` 和 `skills-python` 會快速失敗，而不會等待較繁重的產物與平台矩陣工作。
3. `build-artifacts` 與快速 Linux 通道重疊，因此下游消費者可以在共用建置準備好後儘快開始。
4. 較繁重的平台與執行時通道隨後展開：`checks-fast-core`、`checks-fast-contracts-plugins-*`、`checks-fast-contracts-channels-*`、`checks-node-core-*`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當有更新的推送送至同一個 PR 或 `main` 參考時，GitHub 可能會將被取代的工作標記為 `cancelled`。除非該參考的最新執行也失敗了，否則請將其視為 CI 雜訊。矩陣工作使用 `fail-fast: false`，而 `build-artifacts` 會直接報告內嵌通道、核心支援邊界 和 Gateway Watch 的失敗，而不是將微小的驗證工作排入佇列。自動 CI 並行索引鍵已版本化 (`CI-v7-*`)，因此 GitHub 端在舊佇列組中的殭屍程序不會無限期地封鎖較新的 main 執行。手動全套組執行使用 `CI-manual-v1-*` 並且不會取消正在進行的執行。

`ci-timings-summary` 工作會為每個非草稿 CI 執行上傳一個精簡的 `ci-timings-summary` 構件。它會記錄當前執行的耗用時間、排隊時間、最慢的工作以及失敗的工作，因此 CI 健康檢查不需要重複抓取完整的 Actions 載荷。

## 實際行為證明

外部貢獻者的 PR 會從 `.github/workflows/real-behavior-proof.yml` 執行 `Real behavior proof` 閘道。此工作流程會檢出受信任的基礎提交，並且僅評估 PR 內文；它不會執行來自貢獻者分支的程式碼。

此閘道適用於非儲存庫擁有者、成員、協作者或機器人的 PR 作者。當 PR 內文包含填有下列值的 `Real behavior proof` 區塊時，即會通過：

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

證據必須顯示在真實 OpenClaw 設定中，套用修補程式後的變更行為。螢幕擷圖、錄製、終端機擷取、主控台輸出、複製的即時輸出、編輯過的執行階段記錄以及連結的構件均可算數。單元測試、模擬物件、快照、Lint、型別檢查和 CI 結果都是有用的輔助驗證，但它們本身並不滿足此閘道的要求。

當檢查失敗時，請更新 PR 內文，而不是推送另一個程式碼提交。維護者僅在證明閘道不應套用至該 PR 時，才能套用 `proof: override`。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動分派會跳過變更範圍偵測，並使前檢查資訊清單如同每個已設定範圍的區域皆已變更般運作。

- **CI workflow edits** 驗證 Node CI 圖譜與 workflow linting，但不會單獨強制執行 Windows、Android 或 macOS 原生建置；這些平台 lane 保持範圍限定於平台原始碼變更。
- **Docs on `main` pushes** 由獨立的 `Docs` workflow 檢查，使用與 CI 相同的 ClawHub docs 鏡像，因此混合程式碼與文件的推送不會再次將 CI `check-docs` shard 加入佇列。當文件變更時，Pull requests 與手動 CI 仍會從 CI 執行 `check-docs`。
- **TUI PTY** 是專注於 TUI 變更的 workflow。它會在 Linux Node 24 上針對 `src/tui/**`、watch harness、package script、lockfile 與 workflow edits 執行 `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`。必備 lane 使用具決定性的 `TuiBackend` fixture；較慢的 `tui --local` smoke 為選用，需透過 `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` 啟用，並僅模擬外部模型端點。
- **CI routing-only edits、選定的廉價 core-test fixture edits，以及狹窄的 plugin contract helper/test-routing edits** 使用僅包含 Node 的快速 manifest 路徑：`preflight`、security 與單一 `checks-fast-core` task。當變更僅限於 fast task 直接練習的 routing 或 helper surface 時，該路徑會略過 build artifacts、Node 22 相容性、channel contracts、完整 core shards、bundled-plugin shards 與額外的 guard matrices。
- **Windows Node checks** 範圍限於 Windows 特定的 process/path wrappers、npm/pnpm/UI runner helpers、package manager config 與執行該 lane 的 CI workflow surfaces；無關的原始碼、plugin、install-smoke 與 test-only 變更則維持在 Linux Node lanes。

最慢的 Node 測試系列會被拆分或平衡，以便每個作業保持輕巧而不過度佔用 Runners：Plugin contracts 和 channel contracts 各作為兩個加權的 Blacksmith 支援分片運行，並具備標準 GitHub Runner 備援，core unit fast/support lanes 分開運行，core runtime infra 被拆分為 state、process/config、shared 和三個 cron domain 分片，auto-reply 作為平衡的 workers 運行（reply 子樹被拆分為 agent-runner、dispatch 和 commands/state-routing 分片），而 agentic gateway/server configs 則分散在 chat/auth/model/http-plugin/runtime/startup lanes，而非等待建置完成的產出項目。Broad browser、QA、media 和各類 plugin 測試使用其專屬的 Vitest 設定，而非共享的 plugin catch-all。Include-pattern 分片會使用 CI 分片名稱記錄時序項目，以便 `.artifacts/vitest-shard-timings.json` 區分完整設定與過濾後的分片。`check-additional-*` 將 package-boundary compile/canary 工作保持在同一處，並將 runtime topology architecture 與 gateway watch coverage 分開；boundary guard 清單被條狀分割成一個耗用大量 prompt 的分片以及一個其餘 guard stripes 的合併分片，各自同時運行選定的獨立 guards 並列印各檢查的時序。昂貴的 Codex happy-path prompt snapshot drift 檢查會作為額外獨立作業，僅在手動 CI 和影響 prompt 的變更中運行，因此一般無關的 Node 變更不需等待冷啟 prompt snapshot 生成，且 boundary 分片得以保持平衡，同時將 prompt drift 釘選至造成該變更的 PR；同一標旗也會跳過 built-artifact core support-boundary 分片內的 prompt snapshot Vitest 生成。Gateway watch、channel tests 和 core support-boundary 分片會在 `dist/` 與 `dist-runtime/` 建置完成後，於 `build-artifacts` 內同時運行。

Android CI 會同時執行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建置 Play debug APK。第三方版本沒有獨立的原始碼集或 manifest；其單元測試通道仍會使用 SMS/call-log BuildConfig flags 編譯該版本，同時避免在每次與 Android 相關的推送時重複執行 debug APK 打包工作。

`check-dependencies` 分片會執行 `pnpm deadcode:dependencies`（這是一個釘選到最新 Knip 版本的生產環境 Knip 僅依賴檢查，針對 `dlx` 安裝停用了 pnpm 的最小發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 的生產環境未使用檔案發現與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比對。當 PR 新增未審查的未使用檔案或留下過時的允許清單項目時，未使用檔案防護會失敗，同時保留 Knip 無法靜態解析的有意為之的動態外掛、生成、建置、即時測試和套件橋接層。

## ClawSweeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 儲存庫活動到 ClawSweeeper 的目標端橋接器。它不會簽出或執行不受信任的請求程式碼。該工作流程從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將緊湊的 `repository_dispatch` payload 分派給 `openclaw/clawsweeper`。

該工作流程有四個通道：

- `clawsweeper_item` 用於精確的 Issue 和 Pull Request 審查請求；
- `clawsweeper_comment` 用於 Issue 留言中的明確 ClawSweeeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送的提交層級審查請求；
- `github_activity` 用於 ClawSweeeper 代理程式可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化的元資料：事件類型、動作、執行者、儲存庫、項目編號、URL、標題、狀態，以及出現時的留言或審查簡短摘錄。它特意避免轉發完整的 webhook 主體。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化的事件發佈到 ClawSweeeper 代理程式的 OpenClaw Gateway hook。

一般活動屬於觀察性質，而非預設進行傳遞。ClawSweeper 代理程式會在其提示中收到 Discord 目標，並且僅在事件令人驚訝、可採取行動、具有風險或具有營運用途時，才應發佈至 `#clawsweeper`。常規的開啟、編輯、Bot 翻轉、重複的 webhook 噪音以及正常的審查流量應導致 `NO_REPLY`。

在此路徑中，應將 GitHub 標題、評論、內文、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是用於摘要和分診的輸入，而非用於工作流程或代理程式執行時期的指令。

## 手動觸發

手動 CI 觸發會執行與正常 CI 相同的工作圖，但會強制開啟每個非 Android 範圍的通道：Linux Node 分片、捆綁外掛程式分片、外掛程式和頻道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成品冒煙測試、文件檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 觸發僅透過 `include_android=true` 執行 Android；完整的發行版傘會透過傳遞 `include_android=true` 來啟用 Android。外掛程式預發行靜態檢查、僅限發行版的 `agentic-plugins` 分片、完整擴充功能批次掃描，以及外掛程式預發行 Docker 通道不包含在 CI 中。Docker 預發行套件僅在 `Full Release Validation` 觸發獨立的 `Plugin Prerelease` 工作流程並啟用 release-validation 閘道時才會執行。

手動執行使用唯一的並行群組，因此發行候選完整套件不會被同一 ref 上的另一次推送或 PR 執行取消。可選的 `target_ref` 輸入允許受信任的呼叫者在使用所選觸發 ref 中的工作流程檔案時，針對分支、標記或完整提交 SHA 執行該圖。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 工作                                                                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke preflight 也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣能更早排隊                                   |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`security-fast`、較低權重的擴充功能分片、`checks-fast-core`、外掛/通道合約分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 以及 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 測試分片、內建外掛測試分片、`check-additional-*` 分片、`android`                                                                                                                        |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（對 CPU 足夠敏感，使得 8 個 vCPU 的成本高於其所節省的成本）；install-smoke Docker 建置（32-vCPU 的佇列時間成本高於其所節省的成本）                                 |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                   |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 在 `openclaw/openclaw` 上；分支會退回至 `macos-latest`                                                                                                                                |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 在 `openclaw/openclaw` 上；分支會退回至 `macos-latest`                                                                                                                               |

Canonical-repo CI 將 Blacksmith 保持為預設的 runner 路徑。在 `preflight` 期間，`scripts/ci-runner-labels.mjs` 會檢查最近排程和進行中的 Actions 執行，尋找排程中的 Blacksmith 工作。如果特定的 Blacksmith 標籤已有排程的工作，會使用該確切標籤的下游工作將在該次執行中退回至相符的 GitHub 託管 runner（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。相同 OS 系列中的其他 Blacksmith 大小保持在其主要標籤上。如果 API 探測失敗，則不會套用退回機制。

## 本地對等項目

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/smoke checks matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## OpenClaw 效能

`OpenClaw Performance` 是產品/執行時段效能工作流程。它每天在 `main` 上執行，並且可以手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動觸發通常會對工作流程 ref 進行基準測試。設定 `target_ref` 即可使用目前的工作流程實作，對發布標籤或其他分支進行基準測試。已發布的報告路徑和最新指標是以受測 ref 為鍵值，而每個 `index.md` 會記錄受測 ref/SHA、工作流程 ref/SHA、Kova ref、設定檔、lane 授權模式、模型、重複次數和場景篩選器。

工作流程會從固定的發布版本安裝 OCM，並根據固定的 `kova_ref` 輸入從 `openclaw/Kova` 安裝 Kova，然後執行三個通道：

- `mock-provider`：針對使用決定性假 OpenAI 相容授權的本機建構執行環境執行 Kova 診斷場景。
- `mock-deep-profile`：針對啟動、閘道和 agent 週期熱點進行 CPU/堆疊/追蹤分析。
- `live-openai-candidate`：一次真實的 OpenAI `openai/gpt-5.5` agent 週期，當 `OPENAI_API_KEY` 不可用時會跳過。

模擬提供者通道也會在 Kova 通過後執行 OpenClaw 原始碼探測：預設、hook 和 50 外掛程式啟動案例下的閘道啟動時間和記憶體；重複的模擬 OpenAI `channel-chat-baseline` hello 迴圈；以及針對已啟動閘道的 CLI 啟動指令。原始碼探測的 Markdown 摘要位於報告套件中的 `source/index.md`，旁邊附有原始 JSON。

每個通道都會上傳 GitHub 成品。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、套件、`index.md` 和原始碼探測成品提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。目前的受測 ref 指標會寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整發布驗證

`Full Release Validation` 是「發布前執行所有項目」的手動統一工作流程。它接受分支、標籤或完整的 commit SHA，使用該目標觸發手動的 `CI` 工作流程，觸發 `Plugin Prerelease` 以進行僅限發布的 plugin/package/static/Docker 驗證，並觸發 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、跨 OS 套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道。穩定/預設執行會將詳盡的 live/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制啟用該浸潤式覆蓋率，以便廣泛的諮詢驗證保持廣泛。使用 `rerun_group=all` 和 `release_profile=full` 時，它也會針對來自發布檢查的 `release-package-under-test` 成品執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 以跨發布檢查、套件驗收、Docker、跨 OS 和 Telegram 重複使用已發布的 npm 套件，無需重建。僅當 Telegram 必須驗證不同的套件時，才使用 `npm_telegram_package_spec`。Codex plugin live 套件通道預設使用相同的選取狀態：已發布的 `release_package_spec=openclaw@<tag>` 推導出 `codex_plugin_spec=npm:@openclaw/codex@<tag>`，而 SHA/artifact 執行則從選取的 ref 打包 `extensions/codex`。針對自訂 plugin 來源（例如 `npm:`、`npm-pack:` 或 `git:` 規格），請明確設定 `codex_plugin_spec`。

請參閱 [Full release validation](/zh-Hant/reference/full-release-validation) 以了解階段矩陣、確切的工作流程作業名稱、設定檔差異、成品以及專注的重新執行控制代碼。

`OpenClaw Release Publish` 是手動變更版本的發布工作流程。在發布標籤存在且 OpenClaw npm 預檢成功後，從 `release/YYYY.M.D` 或 `main` 觸發它。它會驗證 `pnpm plugins:sync:check`，為所有可發布的外掛程式套件觸發 `Plugin NPM Release`，針對相同的發布 SHA 觸發 `Plugin ClawHub Release`，然後才會使用儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速變動的分支上取得釘選提交的證明，請使用輔助程式而不是 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub 工作流程觸發 refs 必須是分支或標籤，不能是原始的 commit SHA。輔助程式會在目標 SHA 推送一個暫時的 `release-ci/<sha>-...` 分支，從該釘選的 ref 觸發 `Full Release Validation`，驗證每個子工作流程 `headSha` 都符合目標，並在執行完成時刪除暫時分支。如果任何子工作流程在不同的 SHA 上執行，總管驗證程式也會失敗。

`release_profile` 控制傳遞給發布檢查的 live/provider 廣度。手動發布工作流程預設為 `stable`；僅當您刻意需要廣泛的 advisory provider/media 矩陣時才使用 `full`。`run_release_soak` 控制穩定/預設發布檢查是否執行完整的 live/E2E 和 Docker 發布路徑 soak；`full` 會強制開啟 soak。

- `minimum` 保留最快的 OpenAI/核心發布關鍵管道。
- `stable` 新增穩定的 provider/backend 集合。
- `full` 執行廣泛的 advisory provider/media 矩陣。

總管會記錄已觸發的子執行 ID，而最終的 `Verify full validation` 工作會重新檢查目前的子執行結論，並為每個子執行附加最慢工作表格。如果子工作流程被重新執行並轉為綠燈，只需重新執行父驗證程式工作即可重新整理總管結果和時序摘要。

若需復原，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。針對發行候選版本使用 `all`，針對僅有的一般完整 CI 子任務使用 `ci`，針對僅有外掛程式預先發行子任務使用 `plugin-prerelease`，針對每個發行子任務使用 `release-checks`，或在總管上使用較狹窄的群組：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。如此可在針對性修復後，讓失敗的發行方塊重新執行範圍受限。針對單一失敗的跨 OS 通道，請結合 `rerun_group=cross-os` 與 `cross_os_suite_filter`，例如 `windows/packaged-upgrade`；長時間的跨 OS 指令會輸出心跳行，且套件升級摘要包含各階段的計時資訊。QA 發行檢查通道僅供參考，但標準執行階段工具覆蓋率閘道除外；當必要的 OpenClaw 動態工具從標準層級摘要中偏移或消失時，該閘道會進行封鎖。

`OpenClaw Release Checks` 使用受信任的工作流程參照，將選定的參照解析一次成為 `release-package-under-test` tarball，然後將該成果傳遞給跨 OS 檢查和套件驗收，當執行 soaking 覆蓋率時，也會傳遞給 live/E2E 發行路徑 Docker 工作流程。這能讓套件位元組在發行方塊之間保持一致，並避免在多個子任務中重新打包相同的候選版本。針對 Codex npm-plugin live 通道，發行檢查會傳遞從 `release_package_spec` 衍生的相符已發布外掛程式規格、傳遞操作員提供的 `codex_plugin_spec`，或是將輸入留白，讓 Docker 腳本封裝所選取出之 Codex 的外掛程式。

針對 `ref=main` 和 `rerun_group=all` 的重複 `Full Release Validation` 執行
會取代較舊的整體執行。當父項被取消時，父項監視器會取消它已
分派的任何子工作流程，因此較新的 main 驗證
不會滯後於過時的兩小時 release-check 執行。Release 分支/tag
驗證和專注的重新執行群組會保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

Release live/E2E 子項保持廣泛的原生 `pnpm test:live` 覆蓋範圍，但它透過 `scripts/test-live-shard.mjs` 以命名分片的形式執行，而不是單一的序列工作：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 依提供者過濾的 `native-live-src-gateway-profiles` 工作
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒體音訊/視訊分片和依提供者過濾的音樂分片

這在保持相同檔案覆蓋範圍的同時，讓緩慢的 live 提供者失敗更容易重新執行和診斷。彙總的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍適用於手動一次性重新執行。

原生 live 媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，該映像檔由 `Live Media Runner Image` 工作流程建置。該映像檔預先安裝了 `ffmpeg` 和 `ffprobe`；媒體工作僅在設定前驗證二進位檔。請將 Docker 支援的 live 套件保留在一般的 Blacksmith runner 上——容器工作不是啟動巢狀 Docker 測試的正確位置。

Docker 支援的即時模型/後端分片針對每個選取的提交使用單獨的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發行工作流程會建構並推送該映像檔一次，然後 Docker 即時模型、提供者分片閘道、CLI 後端、ACP 繫結和 Codess 線具分片會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。Gateway Docker 分片攜帶明確的腳本層級 `timeout` 上限，低於工作流程作業逾時時間，以便卡住的容器或清理路徑能快速失敗，而不是消耗整個發行檢查預算。如果這些分片獨立重建完整的原始碼 Docker 目標，則表示發行執行設定錯誤，並將在重複的映像檔建構上浪費實際時間。

## 套件驗收

當問題是「此可安裝的 OpenClaw 套件是否能作為產品正常運作？」時，請使用 `Package Acceptance`。它與一般 CI 不同：一般 CI 驗證原始碼樹，而套件驗收則透過使用者安裝或更新後使用的相同 Docker E2E 線具來驗證單一 tarball。

### Jobs

1. `resolve_package` 會檢出 `workflow_ref`、解析一個套件候選項、寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`、寫入 `.artifacts/docker-e2e-package/package-candidate.json`、將兩者作為 `package-under-test` 構件上傳，並在 GitHub 步驟摘要中列印來源、工作流程參照、套件參照、版本、SHA-256 和設定檔。
2. `docker_acceptance` 會使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml`。可重複使用的工作流程會下載該構件、驗證 tarball 清單、在需要時準備套件摘要 Docker 映像檔，並對該套件執行選取的 Docker 通道，而不是封裝工作流程檢出。當設定檔選取多個目標 `docker_lanes` 時，可重複使用的工作流程會準備一次套件和共享映像檔，然後將這些通道作為具有唯一構件並行目標 Docker 作業展開。
3. `package_telegram` 可選擇性地呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不是 `none` 時它會執行，並且當 Package Acceptance 解析到時安裝相同的 `package-under-test` 構件；獨立的 Telegram 分派仍然可以安裝已發布的 npm 規格。
4. 如果套件解析、Docker 驗收或可選的 Telegram 通道失敗，`summary` 會導致工作流程失敗。

### 候選來源

- `source=npm` 僅接受 `openclaw@beta`、`openclaw@latest`，或確切的 OpenClaw 發布版本（例如 `openclaw@2026.4.27-beta.2`）。將此用於已發布的預發布/穩定版驗收。
- `source=ref` 打包一個受信任的 `package_ref` 分支、標籤或完整的提交 SHA。解析器會擷取 OpenClaw 分支/標籤，驗證選定的提交可從儲存庫分支歷史或發布標籤抵達，在分離的工作樹中安裝相依項，並使用 `scripts/package-openclaw-for-docker.mjs` 進行打包。
- `source=url` 下載一個公開的 HTTPS `.tgz`；需要 `package_sha256`。此路徑會拒絕 URL 憑證、非預設的 HTTPS 連接埠、私密/內部/特殊用途的主機名稱或解析出的 IP，以及超出相同公開安全策略的重定向。
- `source=trusted-url` 從 `.github/package-trusted-sources.json` 中命名的受信任來源策略下載 HTTPS `.tgz`；需要 `package_sha256` 和 `trusted_source_id`。僅將此用於維護者擁有的企業鏡像或需要設定主機、連接埠、路徑前綴、重定向主機或私人網路解析的私人套件儲存庫。如果策略宣告了 bearer auth，工作流程會使用固定的 `OPENCLAW_TRUSTED_PACKAGE_TOKEN` 密鑰；內嵌於 URL 中的憑證仍會被拒絕。
- `source=artifact` 從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於對外分享的構件應該提供。

請將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的可信工作流程/套件程式碼。`package_ref` 是當 `source=ref` 時被打包的來源提交。這允許當前的測試套件程式驗證較舊的可信來源提交，而無需執行舊的工作流程邏輯。

### 套件設定檔

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom` — 精確的 `docker_lanes`；當 `suite_profile=custom` 時為必要項

`package` 設定檔使用離線外掛程式覆蓋率，因此已發布套件的驗證不會受制於即時 ClawHub 的可用性。選用的 Telegram 通道會在 `NPM Telegram Beta E2E` 中重複使用 `package-under-test` 構件，並保留已發布的 npm 規格路徑用於獨立分派。

關於專門的更新和外掛程式測試策略，包括本機指令、Docker 通道、套件驗收輸入、發布預設值和故障分診，請參閱 [測試更新和外掛程式](/zh-Hant/help/testing-updates-plugins)。

版本檢查會使用 `source=artifact`、準備好的版本套件構件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 呼叫 Package Acceptance。這能確保套件遷移、更新、即時 ClawHub 技能安裝、過時外掛相依性清理、已配置外掛安裝修復、離線外掛、外掛更新以及 Telegram 驗證都在同一個解析出的套件 tarball 上進行。在發布 beta 版後，在 Full Release Validation 或 OpenClaw Release Checks 上設定 `release_package_spec`，即可在不重新建構的情況下，對已發布的 npm 套件執行相同的矩陣測試；僅當 Package Acceptance 需要使用與其餘版本驗證不同的套件時，才設定 `package_acceptance_package_spec`。跨 OS 版本檢查仍涵蓋 OS 特定的入門、安裝程式和平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker 通道會在阻斷式版本路徑中，每次執行驗證一個已發布的套件基準。在 Package Acceptance 中，解析出的 `package-under-test` tarball 始終是候選版本，而 `published_upgrade_survivor_baseline` 會選擇備用的已發布基準，預設為 `openclaw@latest`；失敗通道的重新執行指令會保留該基準。具有 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展至四個最新的穩定 npm 版本，加上釘選的外掛相容性邊界版本，以及針對 Feishu 配置、保留的 bootstrap/persona 檔案、已配置的 OpenClaw 外掛安裝、波浪號記錄檔路徑和過時的舊版外掛相依性根目錄的問題形狀固定裝置。多基準已發布升級的幸存者選擇會按基準分片到個別的目標 Docker 執行器工作。當問題是詳盡的已發布更新清理，而非正常的 Full Release CI 範圍時，獨立的 `Update Migration` 工作流程會使用帶有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker 通道。本機匯總執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持單一通道（例如 `openclaw@2026.4.15`），或為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布通道會使用內建的 `openclaw config set` 指令配方來設定基準，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探查 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包和安裝程式全新通道也會驗證已安裝的套件是否能從原始絕對 Windows 路徑匯入瀏覽器控制覆寫。當設定時，OpenAI 跨 OS 代理輪次預設測試會使用 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則使用 `openai/gpt-5.5`，因此安裝和 gateway 驗證會保持在 GPT-5 測試模型上，同時避免 GPT-4.x 預設值。

### 舊版相容性視窗

套件驗收對已發布的套件有設定的舊版相容性視窗。`2026.4.25`（含）之前的套件，包括 `2026.4.25-beta.*`，可能會使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 項目可能指向已從 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久化子案例；
- `update-channel-switch` 可能會從從 tarball 衍生的假 git fixture 中移除缺失的 pnpm `patchedDependencies`，並且可能記錄缺失的持久化 `update.channel`；
- 外掛程式冒煙測試可能會讀取舊版安裝紀錄位置或接受遺漏的 marketplace 安裝紀錄持久化；
- `plugin-update` 可能允許設定中繼資料遷移，同時仍要求安裝紀錄和無重新安裝行為保持不變。

已發布的 `2026.4.26` 套件也可能針對已經發送的本地建置中繼資料戳記檔案發出警告。後續的套件必須滿足現代合約；相同的條件將會失敗而不是警告或跳過。

### 範例

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

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
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

當調試失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或特定的 Docker lane，而不是重新執行完整的發布驗證。

## 安裝冒煙測試

獨立的 `Install Smoke` 工作流程透過其自身的 `preflight` 作業重複使用相同的範圍腳本。它將冒煙測試覆蓋範圍分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 對於涉及 Docker/套件表面、打包外掛程式套件/資訊清單變更，或 Docker 測試工作所練習的核心外掛程式/頻道/閘道/外掛程式 SDK 表面的拉取請求，會執行 **快速路徑**。僅限原始碼的打包外掛程式變更、僅限測試的編輯，以及僅限文件的編輯不會佔用 Docker 工作者。快速路徑會建置根 Dockerfile 映像檔一次，檢查 CLI，執行刪除共享工作區的 CLI 測試，執行容器閘道網路端對端測試，驗證打包擴充功能的建置參數，並在 240 秒的彙總指令逾時下執行有界的打包外掛程式 Docker 設定檔（每個情境的 Docker 執行分別設定上限）。
- **完整路徑** 會為每夜排程執行、手動分派、工作流程呼叫發行檢查，以及真正涉及安裝程式/套件/Docker 表面的拉取請求保留 QR 套件安裝和安裝程式 Docker/更新涵蓋範圍。在完整模式下，install-smoke 會準備或重複使用一個目標 SHA 的 GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試，以及快速的打包外掛程式 Docker E2E 作為個別工作執行，因此安裝程式工作不必等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時要求完整涵蓋範圍時，工作流程會保留快速 Docker 測試，並將完整安裝測試留給每夜或發行驗證。

緩慢的 Bun 全域安裝映像提供者測試受到 `run_bun_global_install_smoke` 的個別閘道控制。它會在每夜排程和發行檢查工作流程中執行，且手動 `Install Smoke` 分派可以選擇加入，但拉取請求和 `main` 推送則不會。QR 和安裝程式 Docker 測試會保留自己專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建置一個共用的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，並建置兩個共用的 `scripts/e2e/Dockerfile` 映像檔：

- 用於安裝程式/更新/外掛程式相依性路徑的純 Node/Git 執行器；
- 一個功能性映像檔，將相同的 tarball 安裝到 `/app` 中，用於正常功能路徑。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計畫。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選擇映像，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調參數

| 變數                                   | 預設值  | 用途                                                                         |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 一般通道的主集區位置計數。                                                   |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾端集區位置計數。                                               |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並行運行通道上限，以避免供應商進行限速。                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並行 npm 安裝通道上限。                                                      |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並行多服務通道上限。                                                         |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道啟動之間的錯開時間，以避免 Docker daemon 建立風暴；設定 `0` 表示不錯開。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的回退逾時（120 分鐘）；選定的運行/尾端通道使用更嚴格的上限。        |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | unset   | `1` 列印排程器計畫而不執行通道。                                             |
| `OPENCLAW_DOCKER_ALL_LANES`            | unset   | 逗號分隔的確切通道清單；跳過清理偵測以便代理可以重現單一失敗的通道。         |

高於其有效上限的通道仍可從空集區啟動，然後單獨執行直到釋放容量。本地聚合程序會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出運行中通道狀態、持續保存通道計時以用於最長優先排序，並且預設在第一次失敗後停止排程新的集區通道。

### 可重複使用的即時/E2E 工作流程

可重用的即時/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像檔類型、即時映像檔、通道以及憑證涵蓋範圍。`scripts/docker-e2e.mjs` 然後將該計畫轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件構件，或從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；當計畫需要安裝套件的通道時，透過 Blacksmith 的 Docker 層級快取建置並推送標記有套件摘要的 bare/functional GHCR Docker E2E 映像檔；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不重新建置。Docker 映像檔提取作業會以每次嘗試 180 秒的受限逾時時間進行重試，以便卡住的 registry/cache 串流能快速重試，而不是佔用大部分的 CI 關鍵路徑。

### 發布路徑區塊

發布 Docker 涵蓋範圍會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的分區作業，因此每個區塊只會提取其所需的映像檔類型，並透過同一個加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的發布 Docker 區塊包含 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`package-update-openai` 包含即時 Codex 外掛套件通道，會安裝候選的 OpenClaw 套件、從 `codex_plugin_spec` 安裝 Codex 外掛或具有明確 Codex CLI 安裝核准的相同參考 tarball、執行 Codex CLI 預檢，然後對 OpenAI 執行多個相同階段的 OpenClaw 代理回合。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍是彙總的外掛/執行時期別名。`install-e2e` 通道別名仍是這兩個提供者安裝程式通道的彙總手動重新執行別名。

當完整發行路徑覆蓋要求時，OpenWebUI 會合併到 `plugins-runtime-services` 中，並僅針對純 OpenWebUI 分派保留獨立的 `openwebui` 區塊。打包頻道更新管道會對暫時性 npm 網路失敗重試一次。

每個區塊都會上傳 `.artifacts/docker-tests/`，其中包含管道日誌、計時資訊、`summary.json`、`failures.json`、階段計時、排程器計劃 JSON、慢速管道表格，以及各管道的重新執行指令。工作流程 `docker_lanes` 輸入會對準備好的映像檔（而非區塊工作）執行選定的管道，這將失敗管道的偵錯範圍限制在一個目標 Docker 工作內，並為該執行準備、下載或重複使用套件成品；如果選定的管道是即時 Docker 管道，目標工作會在本地為該次重新執行建構即時測試映像檔。產生的各管道 GitHub 重新執行指令包含 `package_artifact_run_id`、`package_artifact_name` 以及準備好的映像檔輸入（當這些值存在時），因此失敗的管道可以重複使用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程會每天執行完整的發行路徑 Docker 測試套件。

## 外掛程式預先發行

`Plugin Prerelease` 是成本更高的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或特定操作員分派的獨立工作流程。一般的 Pull Request、`main` 推送和獨立的手動 CI 分派都會關閉該測試套件。它會將打包的外掛程式測試分散到八個擴充工作程序；這些擴充分片工作一次最多執行兩個外掛程式設定組，每組使用一個 Vitest 工作程序，並使用較大的 Node 堆積，以免導入負擔較重的外掛程式批次產生額外的 CI 工作。僅限發行的 Docker 預先發行路徑會將目標 Docker 管道分批為小組，以避免為一到三分鐘的工作保留數十個執行器。該工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性的 `plugin-inspector-advisory` 成品；檢查器的發現僅作為分類輸入，並不會改變具有阻擋性的外掛程式預先發行閘門。

## QA 實驗室

QA Lab 在主要的智能範圍工作流程之外有專用的 CI 通道。Agentic parity 嵌套在廣泛的 QA 和 release harnesses 下，而不是獨立的 PR 工作流程。當 parity 應隨廣泛驗證執行時，請搭配 `rerun_group=qa-parity` 使用 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流程每晚在 `main` 上以及手動分派時執行；它會將 mock parity 通道、live Matrix 通道以及 live Telegram 和 Discord 通道作為並行工作展開。Live 工作使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex leases。

Release checks 使用確定性 mock 提供者和 mock-qualified 模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`）執行 Matrix 和 Telegram live transport 通道，因此通道合約與 live model 延遲和正常的 provider-plugin 啟動隔離。Live transport gateway 會停用記憶體搜尋，因為 QA parity 單獨涵蓋了記憶體行為；provider 連線性由獨立的 live model、native provider 和 Docker provider 套件涵蓋。

Matrix 對於排定和 release 閘道使用 `--profile fast`，僅當簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設和手動工作流程輸入保持為 `all`；手動 `matrix_profile=all` 分派總是將完整的 Matrix 涵蓋範圍分割為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 工作。

`OpenClaw Release Checks` 也會在 release 核准之前執行關鍵的 QA Lab 通道；其 QA parity 閘道會將 candidate 和 baseline packs 作為並行通道工作執行，然後將兩個成品下載到一個小型報告工作中以進行最終 parity 比較。

對於一般的 PR，請遵循範圍內的 CI/check 證據，而不是將 parity 視為必要狀態。

## CodeQL

`CodeQL` 工作流程刻意設計為窄範圍的首輪安全掃描器，而非完整的程式庫掃描。每日、手動以及非草稿的 PR guard 執行會掃描 Actions 工作流程程式碼，加上最高風險的 JavaScript/TypeScript 表面，並針對高嚴重性/嚴重級別 `security-severity` 篩選高信心的安全性查詢。

PR guard 保持輕量化：它僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並且執行與排程工作流程相同的高信心安全性矩陣。Android 和 macOS CodeQL 不包含在 PR 預設值中。

### 安全性類別

| 類別                                              | 表面                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | 驗證、機密、沙箱、cron 和閘道基準                                                      |
| `/codeql-security-high/channel-runtime-boundary`  | 核心通道實作合約加上通道外掛執行時期、閘道、Plugin SDK、機密、審計接觸點               |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、網路防護、web-fetch 和 Plugin SDK SSRF 原則表面                    |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 伺服器、程序執行輔助程式、輸出傳遞和代理工具執行閘門                               |
| `/codeql-security-high/plugin-trust-boundary`     | 外掛安裝、載入器、清單、登錄檔、套件管理器安裝、來源載入和 Plugin SDK 套件合約信任表面 |

### 平台特定的安全分片

- `CodeQL Android Critical Security` — 排程的 Android 安全分片。在工作流程健全性所接受的最小 Blacksmith Linux 執行器上，為 CodeQL 手動建置 Android 應用程式。在 `/codeql-critical-security/android` 下上傳。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選出相依性建置結果，並在 `/codeql-critical-security/macos` 下上傳。保留在每日預設值之外，因為即使在乾淨的狀態下，macOS 建置也會佔據絕大部分的執行時間。

### 關鍵品質類別

`CodeQL Critical Quality` 是對應的非安全分片。它在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值區域，僅執行錯誤嚴重性、非安全的 JavaScript/TypeScript 品質查詢。其 PR 防護意圖上比排程設定檔更小：非草稿 PR 僅針對代理程式命令/模型/工具執行與回覆分派程式碼、設定 Schema/遷移/IO 程式碼、驗證/密碼/沙箱/安全性程式碼、核心通道和捆綁通道插件執行階段、閘道協定/伺服器方法、記憶體執行階段/SDK 介接層、MCP/程序/輸出傳遞、提供者執行階段/模型目錄、工作階段診斷/傳遞佇列、插件載入器、Plugin SDK/套件合約，或 Plugin SDK 回覆執行階段的變更，執行對應的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定與品質工作流程的變更會執行全部十二個 PR 品質分片。

手動分派接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是用於獨立執行單一品質分片的教學/迭代掛鉤。

| 類別                                                    | 區域                                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、密碼、沙箱、排程和閘道安全性邊界程式碼                                                             |
| `/codeql-critical-quality/config-boundary`              | 設定 Schema、遷移、標準化和 IO 契約                                                                      |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道協定 Schema 和伺服器方法合約                                                                         |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心通道和捆綁通道插件實作合約                                                                           |
| `/codeql-critical-quality/agent-runtime-boundary`       | 命令執行、模型/提供者分派、自動回覆分派與佇列，以及 ACP 控制平面執行階段合約                             |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器和工具橋接器、程序監督輔助工具，以及輸出傳遞合約                                               |
| `/codeql-critical-quality/memory-runtime-boundary`      | 記憶體主機 SDK、記憶體執行階段外觀、記憶體 Plugin SDK 別名、記憶體執行階段啟動介接層，以及記憶體醫生命令 |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回覆佇列內部、會話傳遞佇列、輸出會話綁定/傳遞輔助程式、診斷事件/日誌套件介面，以及會話醫生 CLI 合約      |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK 輸入回覆分派、回酬載/分塊/執行時輔助程式、通道回覆選項、傳遞佇列，以及會話/執行緒綁定輔助程式 |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目錄正規化、提供者驗證與探索、提供者執行時註冊、提供者預設值/目錄，以及網頁/搜尋/擷取/嵌入登錄       |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 引導程序、本機持續性、閘道控制流程，以及任務控制平面執行時合約                                   |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心網頁擷取/搜尋、媒體 IO、媒體理解、圖像生成，以及媒體生成執行時合約                                   |
| `/codeql-critical-quality/plugin-boundary`              | 載入器、登錄、公開介面，以及 Plugin SDK 進入點合約                                                       |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已發布套件端 Plugin SDK 來源和外掛程式套件合約輔助程式                                                   |

品質與安全性分開，以便在不模糊安全訊號的情況下，排程、測量、停用或擴充品質發現。只有在狹窄設定檔具有穩定的執行時和訊號之後，才應將 Swift、Python 和隨附外掛程式的 CodeQL 擴充作為範圍或分片的後續工作新增回去。

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護管道，用於讓現有文件與最近的變更保持同步。它沒有純排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，而手動分派可以直接執行它。當 `main` 已前進或在一小時內建立了另一個非跳過的 Docs Agent 執行時，工作流程執行叫用會跳過。當它執行時，它會檢視從上一次非跳過的 Docs Agent 來源 SHA 到目前 `main` 的提交範圍，因此每小時執行一次可以涵蓋自上次文件處理以來累積的所有主要變更。

### 測試效能 Agent

`Test Performance Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於緩慢測試。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，但如果另一個工作流程執行調用在該 UTC 日已經執行或正在執行，它會跳過。手動觸發會繞過該每日活動閘門。該通道構建完整的套件組合 Vitest 效能報告，讓 Codex 只進行小幅保留覆蓋率的測試效能修正，而不是大規模重構，然後重新執行完整套件報告並拒絕降低通過基準測試數量的變更。如果基準有失敗的測試，Codex 可能只修正明顯的失敗，並且在代理執行後的完整套件報告必須通過才能提交任何內容。當 `main` 在機器人推送落地之前推進，該通道會重新變基驗證的補丁，重新執行 `pnpm check:changed`，並重試推送；衝突的過時補丁會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 操作能保持與 docs 代理相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的手動維護者工作流程。它預設為空運行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證已落地的 PR 已合併，並且每個重複 PR 都有共享的參照問題或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地檢查閘門和變更路由

本地變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本地檢查閘門對架構邊界的嚴格程度高於廣泛的 CI 平台範圍：

- 核心生產變更會執行 core prod 和 core test typecheck 以及 core lint/guards；
- 核心僅測試變更僅執行 core test typecheck 以及 core lint；
- 擴充功能生產變更會執行 extension prod 和 extension test typecheck 以及 extension lint；
- 擴充功能僅測試變更僅執行 extension test typecheck 以及 extension lint；
- 公開 Plugin SDK 或 plugin-contract 變更會擴展至 extension typecheck，因為擴充功能依賴這些核心合約（Vitest extension sweeps 保持為明確的測試工作）；
- 僅釋出元數據的版本遞增會執行針對性的版本/配置/根依賴檢查；
- 未知的根/配置更改會安全地失效於所有檢查通道。

本地變更測試的路由存在於 `scripts/test-projects.test-support.mjs` 中，且刻意設計得比 `check:changed` 更低廉：直接對測試的編輯會執行自身，來源編輯則偏好明確映射，接著是同層測試和匯入圖的相依項。共享群組房間遞送配置是明確映射之一：對群組可見回覆配置、來源回覆遞送模式或訊息工具系統提示的更改，會透過核心回覆測試加上 Discord 與 Slack 的遞送迴歸進行路由，以便共享預設的變更能在首次 PR 推送前失敗。僅當變更範圍夠廣、導致廉價的映射集合不再是可信的代理時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是適用於維護者 Linux proof 的 repo 擁有遠端盒子包裝器。當檢查對於本機編輯迴圈來說過於廣泛、當 CI 一致性很重要，或者當 proof 需要 secrets、Docker、套件通道、可重複使用的盒子或遠端紀錄時，請從 repo 根目錄使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 停機、配額問題或明確的擁有容量測試時的後援。

由 Crabbox 支援的 Blacksmith 會執行暖機、認領、同步、執行、回報並清理一次性 Testbox。當 `pnpm-lock.yaml` 等必要的根檔案消失，或者當 `git status --short` 顯示至少 200 個被追蹤的刪除項目時，內建的同步健全性檢查會快速失效。對於有意進行大量刪除的 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 也會終止停留在同步階段超過五分鐘且沒有同步後輸出的本機 Blacksmith CLI 呼叫。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以停用該防護，或者對於異常巨大的本機差異使用更大的毫秒數值。

在首次執行之前，請從 repo 根目錄檢查包裝器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Repo 包裝器會拒絕未宣告 `blacksmith-testbox` 的過時 Crabbox 二進位檔。即使 `.crabbox.yaml` 有 owned-cloud 預設值，仍需明確傳遞提供者。在 Codex worktree 或連結/稀疏簽出中，請避免使用本地的 `pnpm crabbox:run` 腳本，因為 pnpm 可能會在 Crabbox 啟動前協調相依性；請改為直接叫用 node 包裝器：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

已變更的閘道：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

專注的測試重新執行：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

完整套件：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

讀取最終的 JSON 摘要。實用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性由 Blacksmith 支援的 Crabbox 執行應自動停止 Testbox；如果執行中斷或清理不明確，請檢查運行中的 box 並僅停止您建立的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅當您刻意需要在同一個已準備好的 box 上執行多個指令時，才使用 reuse：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是發生錯誤的層級，但 Blacksmith 本身運作正常，請僅將直接 Blacksmith 用於 `list`、`status` 和清理等診斷用途。在將直接 Blacksmith 執行視為維護者證明之前，請先修正 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但新的 warmups 幾分鐘後仍處於 `queued` 且沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith 提供者、佇列、計費或組織限制的壓力。停止您建立的佇列 id，避免啟動更多 Testbox，並在有人檢查 Blacksmith 儀表板、計費和組織限制的同時，將證明移至下方的 owned Crabbox 容量路徑。

僅當 Blacksmith 停機、配額受限、缺少所需環境，或擁有容量明確為目標時，才將問題升級至擁有的 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務真正需要 48xlarge 類別的 CPU，否則請避免使用 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需標準配額的最簡單方式。倉庫擁有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域和 `capacity.hints: true`，因此託管的 AWS 租約會列印選定的區域/市場、配額壓力、Spot 後備和高壓類別警告。將 `fast` 用於更重的廣泛檢查，僅在標準/快速不足時使用 `large`，並僅將 `beast` 用於特殊的 CPU 密集型通道，例如全套件或所有插件 Docker 矩陣、明確的發布/阻斷驗證或高核心效能分析。請勿將 `beast` 用於 `pnpm check:changed`、專注的測試、僅文件工作、一般的 lint/typecheck、小型 E2E 重現或 Blacksmith 中斷分診。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場波動混入訊號中。

`.crabbox.yaml` 擁有自有雲通道的 provider、sync 和 GitHub Actions 水合預設值。它排除本機 `.git`，以便水合的 Actions checkout 保持其自己的遠端 Git 元數據，而不是同步維護者本機遠端和物件存儲，並且它排除不應傳輸的本機執行時/建置產物。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲 `crabbox run --id <cbx_id>` 指令的 checkout、Node/pnpm 設定、`origin/main` 獲取和非機密環境交接。

## 相關

- [安裝概覽](/zh-Hant/install)
- [開發通道](/zh-Hant/install/development-channels)
