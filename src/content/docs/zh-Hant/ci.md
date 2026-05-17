---
summary: "CI job graph, scope gates, release umbrellas, and local command equivalents"
title: "CI pipeline"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 會在每次推送到 `main` 及每個 pull request 時執行。`preflight` job 會對差異進行分類，並當只有無關區域變更時，將昂貴的通道關閉。手動 `workflow_dispatch` 執行會故意繞過智慧範圍設定，並針對發行候選版本及廣泛驗證展開完整圖譜。Android 通道透過 `include_android` 保持選用。僅限發行版的插件涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) workflow 中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動觸發執行。

## Pipeline 概覽

| Job                              | 目的                                                                                                      | 執行時機                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 偵測僅文檔變更、已變更範圍、已變更擴充功能，並建置 CI manifest                                            | 總是在非草稿推送和 PR 上執行       |
| `security-scm-fast`              | 透過 `zizmor` 進行金鑰偵測與 workflow 稽核                                                                | 總是在非草稿推送和 PR 上執行       |
| `security-dependency-audit`      | 針對 npm 公告進行無相依性生產鎖定檔審計                                                                   | 總是在非草稿推送和 PR 上執行       |
| `security-fast`                  | 快速安全性 jobs 的必要集合                                                                                | 總是在非草稿推送和 PR 上執行       |
| `check-dependencies`             | 生產 Knip 僅相依性傳遞加上未使用檔案允許清單防護                                                          | Node 相關變更                      |
| `build-artifacts`                | 建置 `dist/`、Control UI、建置成品檢查以及可重複使用的下游成品                                            | Node 相關變更                      |
| `checks-fast-core`               | 快速 Linux 正確性通道，例如 bundled/plugin-contract/protocol 檢查                                         | Node 相關變更                      |
| `checks-fast-contracts-channels` | 具穩定集合檢查結果的分片通道合約檢查                                                                      | Node 相關變更                      |
| `checks-node-core-test`          | 核心 Node 測試分片，排除 channel、bundled、contract 和 extension 通道                                     | Node 相關變更                      |
| `check`                          | Sharded main local gate equivalent: prod types, lint, guards, test types, and strict smoke                | Node-relevant changes              |
| `check-additional`               | Architecture, sharded boundary/prompt drift, extension guards, package boundary, and gateway watch        | Node-relevant changes              |
| `build-smoke`                    | Built-CLI smoke tests and startup-memory smoke                                                            | Node-relevant changes              |
| `checks`                         | Verifier for built-artifact channel tests                                                                 | Node-relevant changes              |
| `checks-node-compat-node22`      | Node 22 compatibility build and smoke lane                                                                | Manual CI dispatch for releases    |
| `check-docs`                     | Docs formatting, lint, and broken-link checks                                                             | Docs changed                       |
| `skills-python`                  | Ruff + pytest for Python-backed skills                                                                    | Python-skill-relevant changes      |
| `checks-windows`                 | Windows-specific process/path tests plus shared runtime import specifier regressions                      | Windows-relevant changes           |
| `macos-node`                     | macOS TypeScript test lane using the shared built artifacts                                               | macOS-relevant changes             |
| `macos-swift`                    | Swift lint, build, and tests for the macOS app                                                            | macOS-relevant changes             |
| `android`                        | Android unit tests for both flavors plus one debug APK build                                              | Android-relevant changes           |
| `test-performance-agent`         | Daily Codex slow-test optimization after trusted activity                                                 | Main CI success or manual dispatch |
| `openclaw-performance`           | Daily/on-demand Kova runtime performance reports with mock-provider, deep-profile, and GPT 5.4 live lanes | Scheduled and manual dispatch      |

## Fail-fast order

1. `preflight` 決定哪些通道實際上存在。`docs-scope` 和 `changed-scope` 邏輯是此 job 內的步驟，而非獨立的 jobs。
2. `security-scm-fast`、`security-dependency-audit`、`security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 會快速失敗，而不會等待較繁重的產出與平台矩陣任務。
3. `build-artifacts` 與快速 Linux 軌道重疊，因此下游消費者可以在共用組建完成後立即開始。
4. 較繁重的平台與執行時軌道會在此之後展開：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當有較新的推送抵達相同的 PR 或 `main` 參照時，GitHub 可能會將被取代的任務標記為 `cancelled`。除非該參照的最新執行也失敗了，否則請將其視為 CI 雜訊。聚合分片檢查使用 `!cancelled() && always()`，因此它們仍會回報正常的分片失敗，但在整個工作流程已被取代後不會再排入佇列。自動 CI 並行金鑰已設定版本 (`CI-v7-*`)，因此 GitHub 端舊佇列組中的殭屍任務無法無限期封鎖較新的 main 執行。手動完整套件執行使用 `CI-manual-v1-*` 且不會取消進行中的執行。

`ci-timings-summary` 任務會為每個非草稿 CI 執行上傳一個精簡的 `ci-timings-summary` 產出。它會記錄當前執行的耗時、佇列時間、最慢的任務與失敗的任務，因此 CI 健康檢查無需重複抓取完整的 Actions 載荷。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動分派會跳過變更範圍檢測，並讓 preflight 表現清單表現得就像每個範圍區域都變更了一樣。

- **CI 工作流程編輯** 會驗證 Node CI 圖形以及工作流程 linting，但本身不會強制執行 Windows、Android 或 macOS 原生建置；這些平台通道仍將範圍限定於平台原始碼變更。
- **僅限 CI 路由的編輯、選定的低成本核心測試 fixture 編輯，以及狹窄的 plugin contract helper/test-routing 編輯**會使用快速的僅 Node manifest 路徑：`preflight`、安全性以及單一 `checks-fast-core` 任務。當變更僅限於路由或 helper surface（即快速任務直接執行的部分）時，該路徑會跳過構建產物、Node 22 相容性、channel contracts、完整核心 shards、bundled-plugin shards 以及額外的 guard matrices。
- **Windows Node 檢查** 的範圍限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI runner helper、套件管理員設定，以及執行該路徑的 CI workflow 介面；無關的來源、外掛、install-smoke 和僅測試變更會保留在 Linux Node 路徑上。

最慢的 Node 測試組別經過拆分或平衡，以確保每個作業保持精簡，避免過度預留 Runners：channel contracts 作為三個加權的 Blacksmith 支援分片運行，並備有標準 GitHub runner 作為後備；核心 unit fast/support 軌道獨立運行；核心 runtime infra 則拆分為 state、process/config、cron 和 shared 分片；auto-reply 以平衡 worker 運行（reply 子樹拆分為 agent-runner、dispatch 與 commands/state-routing 分片）；agentic gateway/server configs 則拆分至 chat/auth/model/http-plugin/runtime/startup 軌道，而非等待構建產物。廣泛的 browser、QA、media 與其他 plugin 測試使用其專屬 Vitest 配置，而非共用的 plugin catch-all。Include-pattern 分片使用 CI 分片名稱記錄時序項目，因此 `.artifacts/vitest-shard-timings.json` 可區分完整配置與過濾分片。`check-additional` 將 package-boundary compile/canary 工作保持在一起，並將 runtime topology 架構與 gateway watch 涵蓋範圍分開；boundary guard 清單分散於四個矩陣分片，各並行執行選定的獨立 guard 並輸出各檢查的時序。昂貴的 Codex happy-path prompt snapshot 差異檢查作為額外獨立作業，僅在手動 CI 與影響 prompt 的變更時執行，使一般非關聯的 Node 變更無須等候冷啟 prompt snapshot 產生，同時保持 boundary 分片平衡，並將 prompt 差異仍釘在造成它的 PR 上；同一旗標亦會跳過構建產物的 core support-boundary 分片內的 prompt snapshot Vitest 產生。Gateway watch、channel 測試與核心 support-boundary 分片在 `dist/` 與 `dist-runtime/` 已構建後，於 `build-artifacts` 內並行執行。

Android CI 會同時執行 `testPlayDebugUnitTest` 與 `testThirdPartyDebugUnitTest`，然後建構 Play debug APK。第三方 flavor 並無獨立來源集或 manifest；其單元測試軌道仍會以 SMS/call-log BuildConfig 旗標編譯該 flavor，同時避免在每次與 Android 相關的推送上重複進行 debug APK 打包作業。

`check-dependencies` 分片執行 `pnpm deadcode:dependencies`（一個釘選到最新 Knip 版本的生產環境 Knip 僅依賴檢查，針對 `dlx` 安裝停用了 pnpm 的最小發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 在生產環境中發現的未使用檔案與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比較。當 PR 新增未經審查的未使用檔案或保留過時的允許清單條目時，未使用檔案防護會失敗，同時保留 Knip 無法靜態解析的刻意動態外掛、生成、建置、即時測試和套件橋接介面。

## ClawSweeeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 儲存庫活動到 ClawSweeper 的目標端橋接器。它不會簽出或執行不受信任的 PR 程式碼。該工作流程從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將精簡的 `repository_dispatch` 載荷分發至 `openclaw/clawsweeper`。

此工作流程有四個通道：

- 針對確切 Issue 和 PR 審查請求的 `clawsweeper_item`；
- 針對 Issue 留言中明確 ClawSweeper 指令的 `clawsweeper_comment`；
- 針對 `main` 推送上提交層級審查請求的 `clawsweeper_commit_review`；
- 針對 ClawSweeper 代理程式可能檢查的一般 GitHub 活動的 `github_activity`。

`github_activity` 通道僅轉發正規化後的中繼資料：事件類型、動作、執行者、儲存庫、項目編號、URL、標題、狀態，以及評論或審查（如有存在時）的簡短摘錄。它刻意避免轉發完整的 webhook 內容。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化事件發佈至給 ClawSweeper 代理程式的 OpenClaw Gateway 掛鉤。

一般活動僅供觀察，並非預設傳遞。ClawSweeper 代理程式會在其提示中接收 Discord 目標，並且僅在事件令人驚訝、可採取行動、有風險或具有營運用途時，才應張貼至 `#clawsweeper`。例行性的開啟、編輯、機器人異動、重複 webhook 雜訊和正常的審查流量應導致 `NO_REPLY`。

在此路徑中，應將 GitHub 標題、評論、內容、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是用於摘要和分類的輸入，而非工作流程或代理執行時期的指令。

## 手動觸發

手動 CI 排程執行與一般 CI 使用相同的工作圖，但會強制開啟所有非 Android 限定範圍的通道：Linux Node 分片、套件插件的分片、通道契約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS 以及 Control UI i18n。獨立的手動 CI 排程僅使用 `include_android=true` 執行 Android；完整的發行雨傘會透過傳遞 `include_android=true` 來啟用 Android。插件預先發行靜態檢查、僅限發行的 `agentic-plugins` 分片、完整的擴充功能批次掃描，以及插件預先發行 Docker 通道不包含在 CI 中。Docker 預先發行套件僅在 `Full Release Validation` 啟用 release-validation 閘道並排程獨立的 `Plugin Prerelease` 工作流程時執行。

手動執行使用獨特的並行群組，因此發行候選的完整套件不會被同一個 ref 上的另一個推送或 PR 執行所取消。可選的 `target_ref` 輸入允許受信任的呼叫者使用來自所選排程 ref 的工作流程檔案，針對分支、標籤或完整的提交 SHA 執行該工作圖。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 作業                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速的安全性工作與彙總（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速協定/契約/套件檢查、分片通道契約檢查、`check` 分片（除 lint 外）、`check-additional` 彙總、Node 測試彙總驗證器、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 預檢也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣可以更早進入佇列 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、較低權重的擴充功能分片、`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                                      |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke、Linux Node 測試分片、套件插件測試分片、`check-additional` 分片、`android`                                                                                                                                                                                                                                                                                            |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`，`check-lint`（對 CPU 夠敏感，以致於 8 vCPU 的成本高於其節省的成本）；install-smoke Docker 建置（32-vCPU 排隊時間的成本高於其節省的成本）                                                                                                                                                                                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                  |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 位於 `openclaw/openclaw`；fork 會回退到 `macos-latest`                                                                                                                                                                                                                                                                                                               |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 位於 `openclaw/openclaw`；fork 會回退到 `macos-latest`                                                                                                                                                                                                                                                                                                              |

Canonical 儲存庫 CI 將 Blacksmith 保留為預設執行器路徑。在 `preflight` 期間，`scripts/ci-runner-labels.mjs` 會檢查近期排隊和進行中的 Actions 執行，尋找排隊的 Blacksmith 工作。如果特定的 Blacksmith 標籤已有排隊的工作，該次執行中會使用該確切標籤的下游工作將僅針對該次執行回退至相符的 GitHub 託管執行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。相同 OS 系列中的其他 Blacksmith 大小則保持在其主要標籤上。如果 API 探測失敗，則不會套用回退機制。

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
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/build-smoke lanes matter
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

`OpenClaw Performance` 是產品/執行時期效能工作流程。它每日在 `main` 上執行，並可手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動觸發通常會對工作流程參照進行基準測試。設定 `target_ref` 以使用目前的工作流程實作對發佈標籤或其他分支進行基準測試。已發佈的報表路徑和最新指標是以受測參照為鍵值，且每個 `index.md` 都會記錄受測參照/SHA、工作流程參照/SHA、Kova 參照、設定檔、lane 授權模式、模型、重複計數和場景篩選器。

此工作流程會從固定發佈版本安裝 OCM，並從 `openclaw/Kova` 安裝 Kova，採用固定的 `kova_ref` 輸入，然後執行三個 lane：

- `mock-provider`：針對具有決定性偽造 OpenAI 相容授權的本機建置執行時期，執行 Kova 診斷場景。
- `mock-deep-profile`：針對啟動、閘道和 agent 週期熱點進行 CPU/堆疊/追蹤分析。
- `live-gpt54`：一次真實的 OpenAI `openai/gpt-5.4` agent 交談，當 `OPENAI_API_KEY` 不可用時會跳過。

Mock-provider lane 也會在 Kova pass 之後執行 OpenClaw 原生的 source probes：預設、hook 和 50 個 plugin 啟動案例中的 gateway 啟動時間和記憶體；重複的 mock-OpenAI `channel-chat-baseline` hello 迴圈；以及針對已啟動 gateway 的 CLI 啟動指令。Source probe Markdown 摘要位於報告包中的 `source/index.md`，旁邊附有原始 JSON。

每個 lane 都會上傳 GitHub artifacts。當配置了 `CLAWGRIT_REPORTS_TOKEN` 時，workflow 也會將 `report.json`、`report.md`、bundles、`index.md` 和 source-probe artifacts 提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。當前測試過的 ref 指標會被寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整版本驗證

`Full Release Validation` 是「發布前執行所有項目」的手動統一 workflow。它接受分支、標籤或完整的 commit SHA，使用該目標 dispatch 手動 `CI` workflow，為僅限發布的 plugin/package/static/Docker proof dispatch `Plugin Prerelease`，並為 install smoke、package acceptance、跨 OS package 檢查、QA Lab parity、Matrix 和 Telegram lanes dispatch `OpenClaw Release Checks`。穩定/預設執行會將詳盡的 live/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制啟用該 soak coverage，以便廣泛的諮詢驗證保持廣泛。有了 `rerun_group=all` 和 `release_profile=full`，它還會對來自發布檢查的 `release-package-under-test` artifact 執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 以在發布檢查、Package Acceptance、Docker、跨 OS 和 Telegram 之間重複使用已發布的 npm 套件，而無需重建。僅當 Telegram 必須證明不同的套件時，才使用 `npm_telegram_package_spec`。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解
階段矩陣、確切的工作流程作業名稱、設定檔差異、產出成品，以及
專注的重新執行控制碼。

`OpenClaw Release Publish` 是手動的變更性發布工作流程。在發布標籤存在且 OpenClaw npm 預檢成功後，請從 `release/YYYY.M.D` 或 `main` 觸發它。它會驗證 `pnpm plugins:sync:check`，針對所有可發布的外掛套件觸發 `Plugin NPM Release`，針對相同的發布 SHA 觸發 `Plugin ClawHub Release`，然後才會使用儲存的 `preflight_run_id` 觸發 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要對快速變動的分支進行固定 commit 驗證，請使用輔助程式代替 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch refs 必須是分支或標籤，不能是原始的 commit SHA。Helper 會在目標 SHA 處推送一個臨時 `release-ci/<sha>-...` 分支，從該固定 ref 分派 `Full Release Validation`，驗證每個子 workflow `headSha` 是否與目標匹配，並在執行完成時刪除臨時分支。如果任何子 workflow 在不同的 SHA 上執行，整合驗證器也會失敗。

`release_profile` 控制傳遞到 release 檢查的 live/provider 廣度。手動 release workflows 預設為 `stable`；僅當您刻意需要廣泛的 advisory provider/media 矩陣時才使用 `full`。`run_release_soak` 控制穩定/預設 release 檢查是否執行詳盡的 live/E2E 和 Docker release-path soak；`full` 會強制執行 soak。

- `minimum` 保留最快的 OpenAI/core 關鍵 release 通道。
- `stable` 新增穩定的 provider/backend 集合。
- `full` 執行廣泛的 advisory provider/media 矩陣。

整合會記錄已分派的子執行 ID，最終的 `Verify full validation` job 會重新檢查當前子執行的結論，並為每個子執行附加最慢 job 表格。如果子 workflow 被重新執行並變為綠燈（通過），僅需重新執行父驗證器 job 以重新整理整合結果和時間摘要。

為了進行復原，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。針對發布候選版本請使用 `all`，針對僅包含一般完整 CI 子項目請使用 `ci`，針對僅包含外掛程式預先發布子項目請使用 `plugin-prerelease`，針對每個發布子項目請使用 `release-checks`，或者是在總管上使用更細分的群組：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。這能在針對性修復後，讓失敗的發布方塊重新執行的範圍受限。若有一個跨 OS 的區域失敗，請將 `rerun_group=cross-os` 與 `cross_os_suite_filter` 結合，例如 `windows/packaged-upgrade`；長時間的跨 OS 指令會輸出心跳行，且套件升級摘要會包含各階段的時間。QA 發布檢查區域屬於諮詢性質，因此僅 QA 的失敗會發出警告，但不會阻擋發布檢查驗證器。

`OpenClaw Release Checks` 會使用受信任的工作流程參照，將選取的參照解析一次成 `release-package-under-test` tarball，然後將該製件傳遞給跨 OS 檢查與套件驗收，以及在執行 soak 涵蓋範圍時傳遞給 live/E2E 發布路徑的 Docker 工作流程。這能讓發布方塊之間的套件位元組保持一致，並避免在多個子項目工作中重新封裝相同的候選版本。

針對 `ref=main` 和 `rerun_group=all` 的重複 `Full Release Validation` 執行
會取代舊的總管。父監視器會在父項目取消時，取消任何它
已經分派的子工作流程，因此較新的 main 驗證
不會卡在過時的兩小時發布檢查執行後面。發布分支/標籤
驗證和專注的重新執行群組會保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

發布的 live/E2E 子項目保留了廣泛的原生 `pnpm test:live` 涵蓋範圍，但它透過 `scripts/test-live-shard.mjs` 以具名分片的方式執行，而不是作為單一序列工作：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 經過提供者過濾的 `native-live-src-gateway-profiles` 工作
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割的媒體音訊/視訊分片以及經過提供者過濾的音樂分片

這在保持相同檔案覆蓋率的同時，讓緩慢的即時提供者失敗更容易重新執行和診斷。彙總的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍可用於手動一次性重新執行。

原生即時媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，由 `Live Media Runner Image` 工作流程建構。該映像檔預先安裝了 `ffmpeg` 和 `ffprobe`；媒體工作僅在設定之前驗證二進位檔案。請將 Docker 支援的即時測試套件保留在一般的 Blacksmith 執行器上——容器工作不是啟動巢狀 Docker 測試的正確位置。

Docker 支援的即時模型/後端分片針對每個選定的提交使用一個獨立的共享 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發布工作流程會建構並推送該映像檔一次，然後 Docker 即時模型、提供者分片的閘道、CLI 後端、ACP 綁定和 Codex 測試線束分片會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。閘道 Docker 分片在工作流程工作逾時之下，帶有明確的腳本層級 `timeout` 上限，以便卡住的容器或清理路徑能快速失敗，而不是耗盡整個發布檢查的預算。如果這些分片獨立地重新建構完整的原始碼 Docker 目標，則表示發布執行設定錯誤，並將在重複的映像檔建構上浪費實際時間。

## 套件驗收

當問題是「這個可安裝的 OpenClaw 套件是否能作為產品正常運作？」時，請使用 `Package Acceptance`。它與正常的 CI 不同：正常的 CI 驗證原始碼樹，而套件驗收則透過相同的 Docker E2E 測試線束驗證單一 tarball，這是使用者在安裝或更新後會執行的。

### 工作

1. `resolve_package` 檢出 `workflow_ref`，解析一個套件候選版本，寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，寫入 `.artifacts/docker-e2e-package/package-candidate.json`，將兩者作為 `package-under-test` 成件上傳，並在 GitHub 步驟摘要中列印來源、workflow ref、套件 ref、版本、SHA-256 以及設定檔。
2. `docker_acceptance` 呼叫帶有 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 的 `openclaw-live-and-e2e-checks-reusable.yml`。可重複使用的工作流程會下載該成件、驗證 tarball 清單、在需要時準備 package-digest Docker 映像檔，並對該套件執行選定的 Docker 通道，而不是打包工作流程檢出。當設定檔選擇多個目標 `docker_lanes` 時，可重複使用的工作流程會準備一次套件和共用映像檔，然後將這些通道作為具有獨特成件的平行目標 Docker 任務展開。
3. `package_telegram` 選擇性地呼叫 `NPM Telegram Beta E2E`。當 `telegram_mode` 不是 `none` 時它會執行，並且當套件驗收解析出一個時安裝相同的 `package-under-test` 成件；獨立的 Telegram 分派仍然可以安裝已發佈的 npm 規格。
4. 如果套件解析、Docker 驗收或可選的 Telegram 通道失敗，`summary` 會導致工作流程失敗。

### 候選來源

- `source=npm` 僅接受 `openclaw@beta`、`openclaw@latest`，或確切的 OpenClaw 發佈版本，例如 `openclaw@2026.4.27-beta.2`。將此用於已發佈的 pre-release/stable 驗收。
- `source=ref` 打包受信任的 `package_ref` 分支、標籤或完整提交 SHA。解析器會取得 OpenClaw 分支/標籤，驗證選定的提交可從儲存庫分支歷史或發佈標籤抵達，在分離的工作樹中安裝 deps，並使用 `scripts/package-openclaw-for-docker.mjs` 打包它。
- `source=url` 下載 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於外部共享的構件應提供。

將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的受信任工作流程/隨附程式碼。`package_ref` 是當 `source=ref` 時被打包的原始碼提交。這允許當前的測試隨附程式在不執行舊工作流程邏輯的情況下驗證較舊的受信任原始碼提交。

### 套件設定檔

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 完整的 Docker 發布路徑區塊，包含 OpenWebUI
- `custom` — 精確的 `docker_lanes`；當 `suite_profile=custom` 時為必填

`package` 設定檔使用離線外掛程式覆蓋範圍，因此已發布套件的驗證不取決於即時 ClawHub 的可用性。選用的 Telegram 軌道會在 `NPM Telegram Beta E2E` 中重複使用 `package-under-test` 構件，並保留已發布 npm 規格路徑以供獨立分發使用。

如需關於專用的更新和外掛程式測試原則，包括本機指令、
Docker 通道、套件驗收輸入、發布預設值和故障分診，
請參閱 [測試更新和外掛程式](/zh-Hant/help/testing-updates-plugins)。

Release checks 呼叫 Package Acceptance 時會使用 `source=artifact`、準備好的 release package artifact `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 以及 `telegram_mode=mock-openai`。這能確保套件遷移、更新、live ClawHub skill 安裝、stale-plugin-dependency 清理、configured-plugin install repair、offline plugin、plugin-update 以及 Telegram proof 都在相同的解析套件 tarball 上進行。在發布 beta 後，在 Full Release Validation 或 OpenClaw Release Checks 上設定 `release_package_spec`，以便對已發布的 npm 套件執行相同的矩陣而無需重新建置；僅當 Package Acceptance 需要與其餘 release validation 不同的套件時，才設定 `package_acceptance_package_spec`。跨 OS release checks 仍涵蓋 OS 特定的導入、安裝程式和平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker lane 在阻塞性的 release 路徑中，每次執行驗證一個已發布的套件基準。在 Package Acceptance 中，解析出的 `package-under-test` tarball 始終是候選版本，而 `published_upgrade_survivor_baseline` 選擇後備的已發布基準，預設為 `openclaw@latest`；失敗 lane 的重新執行指令會保留該基準。具有 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展涵蓋四個最新的穩定 npm 版本，加上釘選的 plugin-compatibility boundary 版本以及針對 Feishu config、preserved bootstrap/persona 檔案、configured OpenClaw plugin 安裝、tilde log 路徑和 stale legacy plugin dependency 根目錄的 issue-shaped fixtures。多基準的已發布升級 survivor 選擇會依基準分片到個別目標 Docker runner 工作。當問題是徹底的已發布更新清理，而非一般的 Full Release CI 範圍時，獨立的 `Update Migration` 工作流程會使用帶有 `all-since-2026.4.23` 和 `plugin-deps-cleanup` 的 `update-migration` Docker lane。本機匯總執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持單一 lane（例如 `openclaw@2026.4.15`），或為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布的 lane 使用 baked 的 `openclaw config set` 指令配方設定基準，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探測 `/healthz`、`/readyz` 以及 RPC 狀態。Windows packaged 和 installer fresh lane 也會驗證已安裝的套件是否能從原始的絕對 Windows 路徑匯入 browser-control override。OpenAI 跨 OS agent-turn smoke 在設定時預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.4`，因此安裝和 gateway proof 會保持在 GPT-5 測試模型上，同時避免 GPT-4.x 預設值。

### 舊版相容性視窗

Package Acceptance 對於已發布的套件有有限的舊版相容性視窗。`2026.4.25` 之前的套件（包括 `2026.4.25-beta.*`）可以使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 項目可能指向 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久性子案例；
- `update-channel-switch` 可能會從從 tarball 衍生的偽 git fixture 中修剪遺失的 pnpm `patchedDependencies`，並且可能記錄遺失的持久化 `update.channel`；
- 外掛程式冒煙測試可能會讀取舊版安裝記錄位置，或接受遺失的 marketplace 安裝記錄持久性；
- `plugin-update` 可能會允許設定元資料遷移，同時仍然要求安裝記錄和無重新安裝行為保持不變。

已發布的 `2026.4.26` 套件也可能對已經發布的本地建置元資料戳記檔案發出警告。後續的套件必須滿足現代合約；相同的條件會導致失敗，而不是警告或跳過。

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

當偵錯失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或確切的 Docker lanes，而不是重新執行完整的發布驗證。

## 安裝冒煙測試

獨立的 `Install Smoke` 工作流程透過其自身的 `preflight` job 重複使用相同的 scope 腳本。它將 smoke 涵蓋範圍拆分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 針對涉及 Docker/套件表面、打包外掛程式套件/資訊清單變更，或 Docker 測試工作所測試的核心外掛程式/頻道/閘道/Plugin SDK 表面的 PR，會執行 **快速路徑**。僅限原始碼的打包外掛程式變更、僅限測試的編輯，以及僅限文件的編輯不會保留 Docker 工作者。快速路徑會建構一次根 Dockerfile 映像檔、檢查 CLI、執行代理程式刪除共用工作區 CLI 測試、執行容器閘道網路 E2E、驗證打包擴充功能的建構引數，並在 240 秒的總指令逾時下執行有界的打包外掛程式 Docker 設定檔（每個場景的 Docker 執行分別設有上限）。
- **完整路徑** 會為每日排程執行、手動分派、工作流程呼叫發行版本檢查，以及真正涉及安裝程式/套件/Docker 表面的 PR 保留 QR 套件安裝和安裝程式 Docker/更新覆蓋範圍。在完整模式下，install-smoke 會準備或重用一個目標 SHA GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試，以及快速打包外掛程式 Docker E2E 作為獨立工作執行，以便安裝程式工作不必等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時要求完整涵蓋範圍時，工作流程會保留快速的 Docker smoke，並將完整安裝 smoke 留給每夜或發布驗證。

緩慢的 Bun 全域安裝 image-provider smoke 測試由 `run_bun_global_install_smoke` 單獨控制。它會在排程的夜間構建和 release checks workflow 中執行，手動 `Install Smoke` 分發也可以選擇加入，但 pull request 和 `main` 推送則不會。QR 和安裝程式 Docker 測試保留了自己專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建構一個共享的 live-test 映像檔，將 OpenClaw 打包一次為 npm tarball，並建構兩個共享的 `scripts/e2e/Dockerfile` 映像檔：

- 一個用於安裝程式/更新/外掛程式相依性通道的裸機 Node/Git 執行器；
- 一個功能映像檔，將相同的 tarball 安裝到 `/app` 中，用於正常的功能通道。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計劃。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選擇映像檔，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調整參數

| 變數                                   | 預設值  | 用途                                                                   |
| -------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常通道的主要池插槽數量。                                             |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾部池插槽數量。                                           |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並發即時通道上限，以避免供應商進行限流。                               |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並發 npm 安裝通道上限。                                                |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並發多服務通道上限。                                                   |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 在通道啟動之間錯開以避免 Docker daemon 建立風暴；設定 `0` 以不錯開。   |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的後備逾時（120 分鐘）；選定的即時/尾部通道使用更嚴格的上限。  |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未設定  | `1` 列印排程器計劃而不執行通道。                                       |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未設定  | 逗號分隔的精確通道列表；跳過清理偵測，以便代理可以重現單一失敗的通道。 |

高於其有效上限的通道仍可以從空池啟動，然後單獨執行直到釋放容量。本地聚合程式會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出作用中通道狀態、保存通道計時以進行最長優先排序，並且預設在第一次失敗後停止排程新的池化通道。

### 可重複使用的即時/E2E 工作流程

可重用的 live/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像類型、live 映像、通道和憑證覆蓋範圍。`scripts/docker-e2e.mjs` 然後將該計劃轉換為 GitHub 輸出和摘要。它透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載當前執行的套件構件，或從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；當計劃需要已安裝套件的通道時，透過 Blacksmith 的 Docker 層快取建置並推送具有套件摘要標籤的 bare/functional GHCR Docker E2E 映像；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像，而不是重新建置。Docker 映像拉取會重試，每次嘗試有 180 秒的有界逾時，因此卡住的 registry/cache 串流會快速重試，而不是消耗大部分 CI 的關鍵路徑。

### Release-path 區塊

Release Docker 覆蓋範圍使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的分塊作業，因此每個分塊僅拉取其所需的映像類型，並透過相同的加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的 release Docker 分塊是 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 和 `plugins-runtime-install-a` 透過 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍保持為彙總的 plugin/runtime 別名。`install-e2e` 通道別名仍是這兩個 provider installer 通道的彙總手動重新執行別名。

當完整的 release-path 覆蓋範圍要求時，OpenWebUI 會合併到 `plugins-runtime-services` 中，並僅針對僅 OpenWebUI 的派發保留獨立的 `openwebui` 分塊。Bundled-channel 更新通道會針對暫時性的 npm 網路失敗重試一次。

每個區塊都會上傳帶有通道日誌、計時資訊、`summary.json`、`failures.json`、階段計時、排程器計劃 JSON、慢速通道表格和每通道重新執行指令的 `.artifacts/docker-tests/`。工作流程 `docker_lanes` 輸入會對準備好的映像檔（而非區塊工作）執行選定的通道，這使得失敗通道的偵錯限制在單一目標 Docker 工作中，並為該次執行準備、下載或重複使用套件構件；如果選定的通道是即時 Docker 通道，目標工作會在本地為該次重新執行建置即時測試映像檔。產生的每通道 GitHub 重新執行指令包含 `package_artifact_run_id`、`package_artifact_name` 以及當這些值存在時的準備映像輸入，因此失敗的通道可以重複使用失敗執行中的確切套件和映像。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程每日執行完整的發布路徑 Docker 測試套件。

## 外掛程式預先發行

`Plugin Prerelease` 是成本較高的產品/套件覆蓋率，因此它是由 `Full Release Validation` 或特定操作員觸發的獨立工作流程。一般的拉取請求、`main` 推送和獨立的手動 CI 觸發都會關閉該套組。它會將捆綁的外掛程式測試分佈在八個擴充工作者之間；這些擴充分片工作一次最多執行兩個外掛程式設定組，每組一個 Vitest 工作者，並使用較大的 Node 堆積，以避免導入負重的外掛程式批次產生額外的 CI 工作。僅限發行版本的 Docker 發行前路徑會將目標 Docker 通道分批為小組，以避免為一到三分鐘的工作保留數十個執行器。該工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性的 `plugin-inspector-advisory` 構件；檢查器的發現是分類輸入，並不會改變阻擋性的外掛程式發行前閘門。

## QA Lab

QA Lab 在主要智能範圍工作流程之外擁有專用的 CI 通道。代理程式對等性嵌套在廣泛的 QA 和發佈線束之下，而非獨立的 PR 工作流程。當對等性應隨廣泛驗證執行進行時，請使用帶有 `rerun_group=qa-parity` 的 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流程每晚在 `main` 上運行，並可手動觸發；它會將 mock parity 通道、live Matrix 通道以及 live Telegram 和 Discord 通道作為並行作業展開。Live 作業使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex leases。

Release 檢查會使用確定性 mock 提供者和 mock-qualified 模型（`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`）運行 Matrix 和 Telegram live 傳輸通道，以便將通道合約與 live 模型延遲以及正常的提供者外掛程式啟動隔離開來。Live 傳輸閘道會停用記憶體搜尋，因為 QA parity 會單獨涵蓋記憶體行為；提供者連線則由個別的 live 模型、原生提供者和 Docker 提供者套件涵蓋。

Matrix 針對預定和 Release 閘道使用 `--profile fast`，僅在簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設和手動工作流程輸入保持為 `all`；手動 `matrix_profile=all` 分派總是將完整的 Matrix 涵蓋範圍分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作業。

`OpenClaw Release Checks` 也會在 Release 核准前執行對 Release 至關重要的 QA Lab 通道；其 QA parity 閘道會將候選和 baseline 套件作為並行通道作業執行，然後將兩個成品下載到一個小型報告作業中，以進行最終 parity 比較。

對於一般的 PR，請遵循具有範圍的 CI/檢查證據，而非將對等性視為必要狀態。

## CodeQL

`CodeQL` 工作流程刻意設計為狹窄的首輪安全掃描器，而非完整的存放區掃描。每日、手動和非草稿拉取請求保護執行會掃描 Actions 工作流程程式碼以及風險最高的 JavaScript/TypeScript 介面，並使用高可信度的安全查詢過濾出高/嚴重等級的 `security-severity`。

PR 守護保持輕量：它僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並且它執行與排程工作流程相同的高信心度安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設中。

### Security categories

| Category                                          | Surface                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, and gateway baseline                                          |
| `/codeql-security-high/channel-runtime-boundary`  | 核心通道實作合約以及通道插件執行時期、閘道、Plugin SDK、祕密、稽核接觸點                    |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、網路守衛、web-fetch 以及 Plugin SDK SSRF 政策表層                       |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 伺服器、程序執行輔助程式、輸出傳遞以及代理工具執行閘門                                  |
| `/codeql-security-high/plugin-trust-boundary`     | Plugin 安裝、載入器、清單、註冊表、套件管理器安裝、來源載入以及 Plugin SDK 套件合約信任表層 |

### 平台特定安全分片

- `CodeQL Android Critical Security` — 排程的 Android 安全分片。在工作流程健全性所接受的最小型 Blacksmith Linux 執行器上，為 CodeQL 手動建置 Android 應用程式。上傳至 `/codeql-critical-security/android` 下。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選掉相依性建置結果，並上傳至 `/codeql-critical-security/macos` 下。由於即使乾淨建置，macOS 建置仍佔據大部分執行時間，因此保留在每日預設之外。

### 關鍵品質類別

`CodeQL Critical Quality` 是對應的非安全性分片。它在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面，僅執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 防禦措施刻意設計得比排程設定檔更精簡：非草稿 PR 僅針對代理程式命令/模型/工具執行與回覆分發程式碼、設定架構/遷移/IO 程式碼、驗證/機密/沙箱/安全性程式碼、核心管道與打包管道外掛程式執行時、閘道協定/伺服器方法、記憶體執行時/SDK 膠合程式碼、MCP/程序/出站傳遞、提供者執行時/模型目錄、工作階段診斷/傳遞佇列、外掛程式載入器、外掛程式 SDK/套件合約，或外掛程式 SDK 回覆執行時變更，執行對應的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定與品質工作流程的變更則會執行全部十二個 PR 品質分片。

手動分派接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是用於單獨執行一個品質分片的教學/反覆運算掛鉤。

| 類別                                                    | 表面                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、密碼、Sandbox、Cron 和閘道安全性邊界程式碼                                                                    |
| `/codeql-critical-quality/config-boundary`              | 設定 Schema、遷移、正規化和 IO 合約                                                                                 |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道協定 Schema 和伺服器方法合約                                                                                    |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心頻道與內建頻道外掛程式實作合約                                                                                  |
| `/codeql-critical-quality/agent-runtime-boundary`       | 指令執行、模型/提供者分派、自動回覆分派與佇列，以及 ACP 控制平面執行時期合約                                        |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器和工具橋接器、程序監督輔助程式，以及出站傳遞合約                                                          |
| `/codeql-critical-quality/memory-runtime-boundary`      | 記憶體主機 SDK、記憶體執行時期外觀、記憶體外掛程式 SDK 別名、記憶體執行時期啟動膠合程式，以及記憶體醫生指令         |
| `/codeql-critical-quality/session-diagnostics-boundary` | 回覆佇列內部結構、工作階段傳遞佇列、輸出工作階段繫結/傳遞輔助程式、診斷事件/日誌套件介面，以及工作階段醫生 CLI 契約 |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | 外掛程式 SDK 輸入回覆分派、回覆承載/分塊/執行階段輔助程式、通道回覆選項、傳遞佇列，以及工作階段/執行緒繫結輔助程式  |
| `/codeql-critical-quality/provider-runtime-boundary`    | 模型目錄正規化、提供者驗證與探索、提供者執行階段註冊、提供者預設值/目錄，以及網頁/搜尋/擷取/嵌入登錄                |
| `/codeql-critical-quality/ui-control-plane`             | 控制 UI 啟動程序、本機持續性、閘道控制流程，以及任務控制平面執行階段契約                                            |
| `/codeql-critical-quality/web-media-runtime-boundary`   | 核心網頁擷取/搜尋、媒體 IO、媒體理解、圖像生成，以及媒體生成執行階段契約                                            |
| `/codeql-critical-quality/plugin-boundary`              | 載入器、登錄、公開介面，以及外掛程式 SDK 進入點契約                                                                 |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | 已發行的套件端外掛程式 SDK 來源與外掛程式套件契約輔助程式                                                           |

品質與安全性保持分離，以便在不掩蓋安全性訊號的情況下，對品質發現進行排程、測量、停用或擴充。只有在精簡設定檔具有穩定的執行階段和訊號後，才應將 Swift、Python 和隨附外掛程式的 CodeQL 擴充作為範圍限定或分片的後續工作重新加入。

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護管道，用於將現有文件與最近提交的變更保持同步。它沒有單純的時間表：在 `main` 上成功執行的非機器人推送 CI 執行可以觸發它，而手動分派可以直接執行它。當 `main` 已有進展，或過去一小時內已建立另一個非跳過的 Docs Agent 執行時，工作流程執行呼叫會跳過。當它執行時，它會審查從上一次非跳過的 Docs Agent 來源 SHA 到當前 `main` 的提交範圍，因此每小時一次的執行可以涵蓋自上次文件處理以來累積的所有主要變更。

### Test Performance Agent

`Test Performance Agent` 工作流程是一個用於慢速測試的事件驅動 Codex 維護管道。它沒有單純的時間表：在 `main` 上成功執行的非機器人推送 CI 執行可以觸發它，但如果同一 UTC 天已經有另一個工作流程執行呼叫正在執行或已執行，則會跳過。手動分派會繞過該每日活動閘門。該管道會建置完整的群組化 Vitest 效能報告，讓 Codex 僅進行保持覆蓋率的小幅測試效能修正，而不是大幅重構，然後重新執行完整套件報告並拒絕會減少通過基準測試計數的變更。如果基準有失敗的測試，Codex 可能只修正明顯的失敗，且在提交任何內容之前，代理之後的完整套件報告必須通過。當 `main` 在機器人推送落地之前推進時，該管道會對驗證過的修補程式進行變基，重新執行 `pnpm check:changed`，並重試推送；衝突的過期修補程式將被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 動作可以保持與文件代理相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複項清理的手動維護者工作流程。它預設為試運行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證落地的 PR 已合併，並且每個重複項都有共用的參照 issue 或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本機檢查閘門和變更路由

區本變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該區本檢查閘門對架構邊界的限制比廣泛的 CI 平台範圍更嚴格：

- 核心生產環境變更會執行核心生產環境和核心測試類型檢查以及核心 lint/guards；
- 核心僅測試變更僅執行核心測試類型檢查以及核心 lint；
- 擴充功能生產環境變更會執行擴充功能生產環境和擴充功能測試類型檢查以及擴充功能 lint；
- 擴充功能僅測試變更會執行擴充功能測試類型檢查以及擴充功能 lint；
- 公用 Plugin SDK 或 plugin-contract 變更會擴展為擴充功能類型檢查，因為擴充功能依賴這些核心合約（Vitest 擴充功能掃描仍為明確的測試工作）；
- 僅包含發行版元資料的版本遞增會執行目標版本、配置或根依賴項檢查；
- 未知的根/配置更改會安全地失敗至所有檢查通道。

區本變更測試路由位於 `scripts/test-projects.test-support.mjs` 中，且故意設計得比 `check:changed` 更便宜：直接測試編輯會自行執行，原始碼編輯偏好明確映射，然後是同層級測試和匯入圖依賴項。共用群組房間遞送配置是明確映射之一：對群組可見回覆配置、來源回覆遞送模式或訊息工具系統提示的變更，會透過核心回覆測試加上 Discord 和 Slack 遞送迴歸進行路由，以便共用預設值的變更在第一次 PR 推送前就失敗。僅當變更範圍夠廣以致廉價的映射集無法作為可信代理時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是維護者 Linux proof 的 repo 擁有的遠端 box 包裝函式。當檢查對於區本編輯迴圈來說過於廣泛、當 CI 一致性很重要，或者當 proof 需要秘密、Docker、套件通道、可重複使用的 box 或遠端日誌時，請從 repo 根目錄使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 停機、配額問題或明確擁有容量測試時的後備。

Crabbox 支援的 Blacksmith 會執行預熱、認領、同步、執行、報告和清理一次性 Testboxes。當所需的根檔案（例如 `pnpm-lock.yaml`）消失，或當 `git status --short` 顯示至少 200 個追蹤刪除時，內建同步健全性檢查會快速失敗。對於故意的大量刪除 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 也會終止在同步階段停留超過五分鐘而沒有同步後輸出的區本 Blacksmith CLI 叫用。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以停用該防護，或是針對異常大的區本差異使用更大的毫秒值。

在首次執行之前，請從 repo 根目錄檢查包裝函式：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Repo 包裝函式會拒絕不宣告 `blacksmith-testbox` 的過時 Crabbox 二進位檔。即使 `.crabbox.yaml` 有擁有雲端預設值，仍請明確傳遞提供者。

變更閘門：

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

專注測試重新執行：

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

閱讀最終的 JSON 摘要。有用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。單次由 Blacksmith 支援的 Crabbox 執行應自動停止 Testbox；如果執行中斷或清理不明確，請檢查運行中的盒子並僅停止您建立的盒子：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅在您有意需要對同一個準備好的盒子執行多個指令時才使用重複使用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是發生問題的層級，但 Blacksmith 本身正常運作，請僅將直接 Blacksmith 用於診斷用途，例如 `list`、`status` 和清理。在將直接 Blacksmith 執行視為維護者證明之前，請先修復 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 正常運作，但新的預熱在幾分鐘後仍處於 `queued` 狀態且沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith 提供者、佇列、計費或組織限制的壓力。停止您建立的已排程 ID，避免啟動更多 Testbox，並將證明轉移至下方的擁有 Crabbox 容量路徑，同時讓某人檢查 Blacksmith 儀表板、計費和組織限制。

僅在 Blacksmith 停機、配額受限、缺少所需環境，或擁有容量明確為目標時，才升級至擁有的 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，避免使用 `class=beast`，除非任務真正需要 48xlarge 級別的 CPU。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需標準配額的最簡單方式。Repo 擁有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域和 `capacity.hints: true`，因此託管的 AWS 租約會列印選定的區域/市場、配額壓力、Spot 回退以及高壓類別警告。對於較重的廣泛檢查，請使用 `fast`；僅在標準/快速不足時使用 `large`；並且僅對於特殊的 CPU 密集型通道（如完整套件或全外掛 Docker 矩陣、明確的發行/阻斷驗證或高核心效能分析）使用 `beast`。不要為 `pnpm check:changed`、專注的測試、僅文檔工作、普通的 lint/typecheck、小型 E2E 重現或 Blacksmith 停機排查使用 `beast`。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場波動混入信號中。

`.crabbox.yaml` 擁有自有雲通道的提供者、同步和 GitHub Actions 水合預設值。它排除本地 `.git`，以便水合的 Actions 檢出保留其自己的遠端 Git 元數據，而不是同步維護者本地的遠端和物件存儲，並且它排除不應被傳輸的本地運行時/構建工件。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲 `crabbox run --id <cbx_id>` 命令的檢出、Node/pnpm 設置、`origin/main` 獲取以及非秘密環境交接。

## 相關

- [安裝概述](/zh-Hant/install)
- [開發通道](/zh-Hant/install/development-channels)
