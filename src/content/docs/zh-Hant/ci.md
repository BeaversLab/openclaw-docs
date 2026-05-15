---
summary: "CI job graph, scope gates, release umbrellas, and local command equivalents"
title: "CI pipeline"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 `main` 和每個 pull request 時執行。`preflight` job 會分類差異，並在僅變更不相關區域時關閉昂貴的通道。手動 `workflow_dispatch` 執行會刻意繞過智慧範圍設定，並為發行候選版本和廣泛驗證展開完整圖表。Android 通道透過 `include_android` 保持選擇性加入。僅限發行版本的 plugin 涵蓋範圍位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) workflow 中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動分派執行。

## Pipeline 概覽

| Job                              | 目的                                                                                                      | 執行時機                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `preflight`                      | 偵測僅文檔變更、已變更範圍、已變更擴充功能，並建置 CI manifest                                            | 總是在非草稿推送和 PR 上執行       |
| `security-scm-fast`              | 透過 `zizmor` 進行私密金鑰偵測和 workflow 審計                                                            | 總是在非草稿推送和 PR 上執行       |
| `security-dependency-audit`      | 針對 npm 公告進行無相依性生產鎖定檔審計                                                                   | 總是在非草稿推送和 PR 上執行       |
| `security-fast`                  | 快速安全性 jobs 的必要集合                                                                                | 總是在非草稿推送和 PR 上執行       |
| `check-dependencies`             | 生產 Knip 僅相依性傳遞加上未使用檔案允許清單防護                                                          | Node 相關變更                      |
| `build-artifacts`                | 建置 `dist/`、Control UI、建置成品檢查和可重複使用的下游成品                                              | Node 相關變更                      |
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

1. `preflight` decides which lanes exist at all. The `docs-scope` and `changed-scope` logic are steps inside this job, not standalone jobs.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs`, and `skills-python` fail quickly without waiting on the heavier artifact and platform matrix jobs.
3. `build-artifacts` 與快速 Linux 通道重疊，因此下游消費者可以在共用建置準備就緒後立即開始。
4. 之後會展開更繁重的平台與執行時通道：`checks-fast-core`、`checks-fast-contracts-channels`、`checks-node-core-test`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

當較新的推送抵達相同的 PR 或 `main` ref 時，GitHub 可能會將被取代的作業標記為 `cancelled`。除非相同 ref 的最新執行也失敗，否則請將其視為 CI 雜訊。彙總分片檢查使用 `!cancelled() && always()`，因此它們仍會回報正常的分片失敗，但在整個工作流程已被取代之後不會進入佇列。自動 CI 並行金鑰已加上版本號 (`CI-v7-*`)，因此 GitHub 端舊佇列群組中的殭屍程序無法無限期地封鎖較新的 main 執行。手動全套組執行使用 `CI-manual-v1-*` 且不會取消進行中的執行。

`ci-timings-summary` 作業會為每個非草稿 CI 執行上傳一個精簡的 `ci-timings-summary` 構件。它會記錄當前執行的牆上時間、佇列時間、最慢的作業和失敗的作業，因此 CI 健康檢查不需要重複抓取完整的 Actions 載荷。

## 範圍與路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動發送會跳過變更範圍檢測，並使預檢清單的表現就像每個範圍區域都發生了變更一樣。

- **CI 工作流程編輯** 會驗證 Node CI 圖形以及工作流程 linting，但本身不會強制執行 Windows、Android 或 macOS 原生建置；這些平台通道仍將範圍限定於平台原始碼變更。
- **僅限 CI 路由的編輯、選定的低成本核心測試 fixture 編輯，以及狹隘的插件合約 helper/test-routing 編輯** 使用快速的僅 Node manifest 路徑：`preflight`、安全性，以及單一 `checks-fast-core` 任務。當變更僅限於快速任務直接執行的路由或 helper 介面時，該路徑會跳過建構成品、Node 22 相容性、頻道合約、完整核心分片、套件外掛分片以及額外的防護矩陣。
- **Windows Node 檢查** 的範圍限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI runner helper、套件管理員設定，以及執行該路徑的 CI workflow 介面；無關的來源、外掛、install-smoke 和僅測試變更會保留在 Linux Node 路徑上。

最慢的 Node 測試族會被分割或平衡，讓每個作業保持小型而不會過度預留 runner：channel contracts 作為三個加權的 Blacksmith 支援的分片執行，並搭配標準的 GitHub runner 後備方案；core unit fast/support lanes 分開執行；core runtime infra 分割在 state、process/config、cron 與 shared 分片；auto-reply 作為平衡的 worker 執行（其中 reply 子樹分割為 agent-runner、dispatch 與 commands/state-routing 分片）；而 agentic gateway/server configs 則分散在 chat/auth/model/http-plugin/runtime/startup lanes，而非等候建置成果。廣泛的 browser、QA、media 與其他 plugin 測試使用其專屬的 Vitest 設定，而非共用的 plugin 捕捉設定。Include-pattern 分片會使用 CI 分片名稱記錄計時項目，因此 `.artifacts/vitest-shard-timings.json` 可區分完整設定與過濾後的分片。`check-additional` 將 package-boundary compile/canary 工作保持在一起，並將 runtime topology architecture 與 gateway watch coverage 分開；boundary guard 清單會分散在四個矩陣分片，每個分片並行執行選定的獨立 guard 並輸出各項檢查的計時。昂貴的 Codex happy-path prompt snapshot drift 檢查作為額外的獨立作業，僅在手動 CI 與影響 prompt 的變更時執行，因此一般不相關的 Node 變更不會等候冷啟動的 prompt snapshot 生成，且 boundary 分片保持平衡，同時 prompt drift 仍固定在造成它的 PR 上；相同的旗標會跳過 built-artifact core support-boundary 分片內的 prompt snapshot Vitest 生成。Gateway watch、channel 測試與 core support-boundary 分片會在 `build-artifacts` 內並行執行，當 `dist/` 與 `dist-runtime/` 已經建置完成之後。

Android CI 會同時執行 `testPlayDebugUnitTest` 與 `testThirdPartyDebugUnitTest`，然後建置 Play debug APK。第三方 flavor 沒有獨立的來源集或 manifest；其單元測試 lane 仍會使用 SMS/call-log BuildConfig 旗標編譯該 flavor，同時避免在每次 Android 相關推送時重複執行 debug APK 打包作業。

`check-dependencies` 分片執行 `pnpm deadcode:dependencies`（一個釘選到最新 Knip 版本的生產環境 Knip 僅依賴項傳遞，針對 `dlx` 安裝停用了 pnpm 的最小發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 的生產環境未使用檔案發現與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比較。當 PR 新增未經審查的未使用檔案或保留過時的允許清單條目時，未使用檔案防護會失敗，同時保留 Knip 無法靜態解析的刻意動態外掛、生成、建置、即時測試和套件橋接介面。

## ClawSweeeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 儲存庫活動到 ClawSweeeper 的目標端橋接。它不會簽出或執行不受信任的 PR 程式碼。此工作流程從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將緊湊的 `repository_dispatch` 負載分派給 `openclaw/clawsweeper`。

此工作流程有四個通道：

- `clawsweeper_item` 用於精確的 Issue 和 PR 審查請求；
- `clawsweeper_comment` 用於 Issue 評論中的明確 ClawSweeeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送上的提交層級審查請求；
- `github_activity` 用於 ClawSweeeper 代理程式可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化的中繼資料：事件類型、動作、行為者、儲存庫、項目編號、URL、標題、狀態，以及評論或審查（如果存在）的簡短摘錄。它刻意避免轉發完整的 webhook 內文。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化的事件發佈到 ClawSweeeper 代理程式的 OpenClaw Gateway 掛鉤。

一般活動是觀察，而非預設傳遞。ClawSweeeper 代理程式會在其提示中收到 Discord 目標，並且應僅在事件令人驚訝、可採取行動、具風險或具有營運用途時，才將其發佈到 `#clawsweeper`。常規的開啟、編輯、機器人翻攪、重複 webhook 雜訊和正常審查流量應導致 `NO_REPLY`。

在此路徑中，應將 GitHub 標題、評論、內容、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是用於摘要和分類的輸入，而非工作流程或代理執行時期的指令。

## 手動觸發

手動 CI 觸發執行與一般 CI 相同的作業圖，但會強制開啟每個非 Android 範圍的通道：Linux Node 分片、捆綁外掛程式分片、通道合約、Node 22 相容性、`check`、`check-additional`、建置冒煙測試、文件檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 觸發僅透過 `include_android=true` 執行 Android；完整的發布傘會透過傳遞 `include_android=true` 來啟用 Android。外掛程式預發布靜態檢查、僅限發布的 `agentic-plugins` 分片、完整擴充功能批次掃描，以及外掛程式預發布 Docker 通道均不包含在 CI 中。Docker 預發布套件僅當 `Full Release Validation` 觸發啟用 release-validation 閘道的獨立 `Plugin Prerelease` 工作流程時才會執行。

手動執行使用獨特的併發群組，因此發布候選版本的完整套件不會被同一個 ref 上的另一次推送或 PR 執行所取消。可選的 `target_ref` 輸入允許受信任的呼叫者在使用所選觸發 ref 的工作流程檔案的同時，針對分支、標籤或完整提交 SHA 執行該圖。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 作業                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`、快速安全性作業和彙總（`security-scm-fast`、`security-dependency-audit`、`security-fast`）、快速協定/合約/捆綁檢查、分片通道合約檢查、`check` 分片（lint 除外）、`check-additional` 彙總、Node 測試彙總驗證器、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 預檢也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣可以更早排隊 |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、較低權重的擴充分片、`checks-fast-core`、`checks-node-compat-node22`、`check-prod-types` 和 `check-test-types`                                                                                                                                                                                                                                   |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`、build-smoke、Linux Node 測試分片、bundled plugin 測試分片、`check-additional` 分片、`android`                                                                                                                                                                                                                                                           |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`（對 CPU 敏感程度高，使得 8 vCPU 的成本高於其所節省的成本）；install-smoke Docker 建置（32-vCPU 排隊時間的成本高於其所節省的成本）                                                                                                                                                                                                                             |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-6vcpu-macos-latest`  | `openclaw/openclaw` 上的 `macos-node`；fork 會回退到 `macos-latest`                                                                                                                                                                                                                                                                                                        |
| `blacksmith-12vcpu-macos-latest` | `openclaw/openclaw` 上的 `macos-swift`；fork 會回退到 `macos-latest`                                                                                                                                                                                                                                                                                                       |

Canonical-repo CI 將 Blacksmith 保持為預設的 runner 路徑。在 `preflight` 期間，`scripts/ci-runner-labels.mjs` 會檢查近期佇列中和進行中的 Actions 執行，尋找佇列中的 Blacksmith 工作。如果特定的 Blacksmith 標籤已有佇列工作，那麼將使用該確切標籤的下游工作會在該次執行中回退至對應的 GitHub 託管 runner（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。相同 OS 系列中的其他 Blacksmith 大小則保持在主要標籤上。如果 API 探測失敗，則不會套用回退機制。

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

`OpenClaw Performance` 是產品/執行時效能工作流程。它每日在 `main` 上執行，並可手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動觸發通常會對工作流程 ref 進行基準測試。設定 `target_ref` 即可使用當前工作流程實作對發布標籤或其他分支進行基準測試。已發布的報告路徑和最新指標是以測試的 ref 為鍵值，並且每個 `index.md` 都會記錄測試的 ref/SHA、工作流程 ref/SHA、Kova ref、設定檔、通道授權模式、模型、重複次數和場景篩選器。

工作流程從固定的版本安裝 OCM，並從 `openclaw/Kova` 在固定的 `kova_ref` 輸入安裝 Kova，然後執行三個通道：

- `mock-provider`：針對具有確定性偽造 OpenAI 相容驗證的本機建構執行環境的 Kova 診斷情境。
- `mock-deep-profile`：針對啟動、閘道和代理程式輪次熱點進行 CPU/堆疊/追蹤分析。
- `live-gpt54`：一個真實的 OpenAI `openai/gpt-5.4` 代理程式輪次，當 `OPENAI_API_KEY` 不可用時會跳過。

模擬提供者通道也會在 Kova 通過後執行 OpenClaw 原生來源探測：預設、hook 和 50 個外掛程式啟動案例的閘道引導計時與記憶體；重複的模擬 OpenAI `channel-chat-baseline` hello 迴圈；以及針對已啟動閘道的 CLI 啟動指令。來源探測的 Markdown 摘要位於報告套件中的 `source/index.md`，旁邊附有原始 JSON。

每個通道都會上傳 GitHub 成品。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、套件、`index.md` 和來源探測成品提交到 `openclaw/clawgrit-reports` 下的 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`。目前測試的 ref 指標會寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整版本驗證

`Full Release Validation` 是「發布前執行所有動作」的手動綜合工作流程。它接受分支、標籤或完整的 commit SHA，使用該目標觸發手動 `CI` 工作流程，針對僅限發布的外掛/套件/靜態/Docker 驗證觸發 `Plugin Prerelease`，並針對安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 對應、Matrix 和 Telegram 軌道觸發 `OpenClaw Release Checks`。穩定/預設執行會將完整的 Live/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 會強制啟用該浸泡覆蓋率，使廣泛的諮詢驗證保持廣泛。透過 `rerun_group=all` 和 `release_profile=full`，它也會針對發布檢查中的 `release-package-under-test` 成果執行 `NPM Telegram Beta E2E`。發布後，傳遞 `npm_telegram_package_spec` 以針對已發布的 npm 套件重新執行相同的 Telegram 套件軌道。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解階段矩陣、精確的工作流程工作名稱、設定檔差異、成果及專用的重新執行控制碼。

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

有關專門的更新和外掛程式測試策略，包括本機指令、
Docker 軌道、套件驗收輸入、發布預設值和故障分診，
請參閱 [測試更新和外掛程式](/zh-Hant/help/testing-updates-plugins)。

版本檢查會使用 `source=artifact`、準備好的發行套件物件 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 和 `telegram_mode=mock-openai` 呼叫 Package Acceptance。這可確保套件遷移、更新、即時 ClawHub 技能安裝、過時外掛相依性清理、已設定外掛安裝修復、離線外掛、外掛更新以及 Telegram 驗證都在同一個解析出的套件 tarball 上進行。在完整版本驗證或 OpenClaw 版本檢查上設定 `package_acceptance_package_spec`，即可針對已發布的 npm 套件（而非 SHA 建構的物件）執行相同的矩陣。跨作業系統版本檢查仍涵蓋特定作業系統的上手、安裝程式和平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker 軌道在阻塞性發行路徑中，每次執行會驗證一個已發布的套件基準。在 Package Acceptance 中，解析出的 `package-under-test` tarball 一定是候選版本，而 `published_upgrade_survivor_baseline` 會選擇退回的已發布基準，預設為 `openclaw@latest`；失敗軌道重新執行指令會保留該基準。具備 `run_release_soak=true` 或 `release_profile=full` 的完整版本驗證會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以擴展至四個最新的穩定 npm 發行版，加上固定的外掛相容性邊界發行版，以及針對 Feishu 設定、保留的 bootstrap/persona 檔案、已設定的 OpenClaw 外掛安裝、tilde 記錄檔路徑和過時的舊版外掛相依性根目錄的 issue-shaped fixtures。多基準已發布升級的篩選項目會依基準分片到不同的目標 Docker 執行器工作。當問題是窮盡式的已發布更新清理，而非一般的完整版本 CI 廣度時，獨立的 `Update Migration` 工作流程會使用 `update-migration` Docker 軌道，並搭配 `all-since-2026.4.23` 和 `plugin-deps-cleanup`。本機彙總執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳遞確切的套件規格，使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` (例如 `openclaw@2026.4.15`) 保持單一軌道，或是為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布軌道會使用內建的 `openclaw config set` 指令配方設定基準，在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探測 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包和安裝程式全新軌道也會驗證已安裝的套件是否能從原始的 Windows 絕對路徑匯入瀏覽器控制覆寫。OpenAI 跨作業系統代理轉換冒煙測試在設定時預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.4`，因此安裝和閘道驗證會保持在 GPT-5 測試模型上，同時避免使用 GPT-4.x 預設值。

### 舊版相容性視窗

針對已發布的套件，套件驗收有著有限的舊版相容性視窗。到 `2026.4.25` 為止的套件（包括 `2026.4.25-beta.*`）可以使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私人 QA 項目可能指向 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持久性子案例；
- `update-channel-switch` 可能會從源自 tarball 的假 git fixture 中修剪遺失的 `pnpm.patchedDependencies`，並記錄遺失的持久化 `update.channel`；
- 外掛程式冒煙測試可能會讀取舊版安裝記錄位置，或接受遺失的 marketplace 安裝記錄持久性；
- `plugin-update` 可能會允許設定元數據遷移，同時仍要求安裝記錄和無重新安裝行為保持不變。

已發布的 `2026.4.26` 套件也可能針對已經 shipped 的本地組建元數據戳記檔案發出警告。後續的套件必須滿足現代合約；相同的情況會導致失敗而不是警告或跳過。

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

當除錯失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 製件：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 記錄、階段計時和重新執行指令。建議優先重新執行失敗的套件設定檔或特定的 Docker lane，而不是重新執行完整的發行版本驗證。

## 安裝冒煙測試

獨立的 `Install Smoke` 工作流程透過其自己的 `preflight` 工作重複使用相同的範圍腳本。它將冒煙測試覆蓋範圍分為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- 針對涉及 Docker/套件表面、打包外掛程式套件/資訊清單變更，或 Docker 測試工作所測試的核心外掛程式/頻道/閘道/Plugin SDK 表面的 PR，會執行 **快速路徑**。僅限原始碼的打包外掛程式變更、僅限測試的編輯，以及僅限文件的編輯不會保留 Docker 工作者。快速路徑會建構一次根 Dockerfile 映像檔、檢查 CLI、執行代理程式刪除共用工作區 CLI 測試、執行容器閘道網路 E2E、驗證打包擴充功能的建構引數，並在 240 秒的總指令逾時下執行有界的打包外掛程式 Docker 設定檔（每個場景的 Docker 執行分別設有上限）。
- **完整路徑** 會為每日排程執行、手動分派、工作流程呼叫發行版本檢查，以及真正涉及安裝程式/套件/Docker 表面的 PR 保留 QR 套件安裝和安裝程式 Docker/更新覆蓋範圍。在完整模式下，install-smoke 會準備或重用一個目標 SHA GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/閘道測試、安裝程式/更新測試，以及快速打包外掛程式 Docker E2E 作為獨立工作執行，以便安裝程式工作不必等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時要求完整覆蓋範圍，工作流程會保留快速 Docker 測試，並將完整安裝測試留給每日排程或發行版本驗證。

緩慢的 Bun 全域安裝映像提供者測試單獨由 `run_bun_global_install_smoke` 閘控。它會在每日排程和發行版本檢查工作流程中執行，手動 `Install Smoke` 分派可以選擇加入，但 PR 和 `main` 推送則不會。QR 和安裝程式 Docker 測試會保留自己專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建構一個共用的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，並建構兩個共用的 `scripts/e2e/Dockerfile` 映像檔：

- 一個用於安裝程式/更新/外掛程式相依性通道的裸機 Node/Git 執行器；
- 一個將相同 tarball 安裝到 `/app` 的功能性映像檔，用於正常功能通道。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計畫。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選擇鏡像，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調整參數

| 變數                                   | 預設值  | 用途                                                                          |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 正常通道的主要池插槽數量。                                                    |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 供應商敏感的尾部池插槽數量。                                                  |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並發即時通道上限，以避免供應商進行限流。                                      |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並發 npm 安裝通道上限。                                                       |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並發多服務通道上限。                                                          |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道啟動之間的交錯延遲，以避免 Docker 守護程式建立風暴；設定 `0` 可取消交錯。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的後備逾時（120 分鐘）；選定的即時/尾部通道使用更嚴格的上限。         |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未設定  | `1` 列印排程器計畫而不執行通道。                                              |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未設定  | 逗號分隔的精確通道列表；跳過清理偵測，以便代理可以重現單一失敗的通道。        |

高於其有效上限的通道仍可以從空池啟動，然後單獨執行直到釋放容量。本地聚合程式會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出作用中通道狀態、保存通道計時以進行最長優先排序，並且預設在第一次失敗後停止排程新的池化通道。

### 可重複使用的即時/E2E 工作流程

可重用的即時/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像檔種類、即時映像檔、通道以及憑證涵蓋範圍。`scripts/docker-e2e.mjs` 接著將該計劃轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件構件，或從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；當計劃需要已安裝套件的通道時，透過 Blacksmith 的 Docker 層快取建置並推送具有套件摘要標籤的 bare/functional GHCR Docker E2E 映像檔；並重複使用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不是重新建置。Docker 映像檔提取會以每次嘗試 180 秒的有限逾時時間重試，因此卡住的註冊表/快取串流會快速重試，而不會消耗大部分 CI 關鍵路徑。

### Release-path 區塊

Release Docker 涵蓋範圍會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的區塊工作，因此每個區塊僅提取其所需的映像檔種類，並透過相同的加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的 release Docker 區塊為 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a` 透過 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 仍為彙總的外掛程式/執行時期別名。`install-e2e` 通道別名仍是這兩個提供者安裝程式通道的彙總手動重新執行別名。

當完整的 release-path 涵蓋範圍要求時，OpenWebUI 會被合併到 `plugins-runtime-services` 中，並且僅針對僅 OpenWebUI 的分派保留獨立的 `openwebui` 區塊。Bundled-channel 更新通道會針對暫時性 npm 網路失敗重試一次。

每個區塊會上傳 `.artifacts/docker-tests/`，其中包含通道日誌、計時、`summary.json`、`failures.json`、階段計時、排程器計畫 JSON、慢速通道表格以及各通道重新執行指令。工作流程 `docker_lanes` 輸入會針對準備好的映像檔而非區塊工作來執行選定的通道，這能將失敗通道的除錯範圍限制在一個目標 Docker 工作內，並為該次執行準備、下載或重用套件工件；如果選定的通道是即時 Docker 通道，目標工作會在本地為該次重新執行建構即時測試映像檔。產生的各通道 GitHub 重新執行指令包含 `package_artifact_run_id`、`package_artifact_name` 以及準備好的映像檔輸入（當這些值存在時），以便失敗的通道能重用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程每日執行完整的發布路徑 Docker 測試套件。

## 外掛程式預先發行

`Plugin Prerelease` 是成本較高的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或明確的操作員分派的獨立工作流程。一般的 pull request、`main` 推送和獨立的手動 CI 分派會讓該測試套件保持關閉。它會在八個擴充工作程序之間平衡套件的外掛程式測試；這些擴充分片工作每次會執行最多兩個外掛程式設定群組，每個群組配有一個 Vitest 工作程序，並使用較大的 Node 堆積，以避免匯入負擔較重的外掛程式批次產生額外的 CI 工作。僅限發布的 Docker 預先發行路徑會將目標 Docker 通道分批為小組，以避免為一到三分鐘的工作保留數十個執行器。

## QA Lab

QA Lab 在主要智慧範圍工作流程之外擁有專用的 CI 通道。代理對等性嵌套在廣泛的 QA 和發布機制之下，而非獨立的 PR 工作流程。當對等性應隨著廣泛驗證執行進行時，請使用帶有 `rerun_group=qa-parity` 的 `Full Release Validation`。

- `QA-Lab - All Lanes` 工作流程每夜在 `main` 上執行，並可手動分派；它會將模擬對等性通道、即時 Matrix 通道以及即時 Telegram 和 Discord 通道作為平行工作展開。即時工作使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex 租約。

發布檢查會搭配確定性模擬提供者和模擬合格模型 (`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`) 執行 Matrix 和 Telegram 即時傳輸通道，因此通道合約會與即時模型延遲及一般提供者外掛程式的啟動程序隔離。即時傳輸閘道會停用記憶體搜尋，因為 QA 對等性會單獨涵蓋記憶體行為；提供者連線則由獨立的即時模型、原生提供者和 Docker Provider 測試套件涵蓋。

Matrix 針對排程和發布閘道使用 `--profile fast`，僅在簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設和手動工作流程輸入維持 `all`；手動 `matrix_profile=all` 分派總是將完整的 Matrix 涵蓋範圍分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 工作。

`OpenClaw Release Checks` 也會在發布核准前執行發布關鍵的 QA Lab 通道；其 QA 對等性閘道會將候選和基準套件以平行通道工作執行，然後將兩個成品下載至小型報告工作中以進行最終的對等性比較。

對於一般的 PR，請遵循具有範圍的 CI/檢查證據，而非將對等性視為必要狀態。

## CodeQL

`CodeQL` 工作流程特意設計為狹隘的首輪安全掃描器，而非完整的程式庫掃描。每日、手動和非草稿 PR 的守護執行會掃描 Actions 工作流程程式碼加上最高風險的 JavaScript/TypeScript 介面，並使用高信心安全查詢篩選出高/嚴重 `security-severity`。

PR 守護機制保持輕量化：它僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並且執行與排程工作流程相同的高信心安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設值中。

### Security categories

| Category                                          | Surface                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, and gateway baseline                                          |
| `/codeql-security-high/channel-runtime-boundary`  | 核心通道實作合約以及通道插件執行時期、閘道、Plugin SDK、祕密、稽核接觸點                    |
| `/codeql-security-high/network-ssrf-boundary`     | 核心 SSRF、IP 解析、網路守衛、web-fetch 以及 Plugin SDK SSRF 政策表層                       |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP 伺服器、程序執行輔助程式、輸出傳遞以及代理工具執行閘門                                  |
| `/codeql-security-high/plugin-trust-boundary`     | Plugin 安裝、載入器、清單、註冊表、套件管理器安裝、來源載入以及 Plugin SDK 套件合約信任表層 |

### 平台特定安全分片

- `CodeQL Android Critical Security` — 排程的 Android 安全分片。在工作流程健全性所接受的最小 Blacksmith Linux 執行器上，為 CodeQL 手動建置 Android 應用程式。上傳於 `/codeql-critical-security/android` 之下。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選出相依性建置結果，並上傳於 `/codeql-critical-security/macos` 之下。因為即使在乾淨狀態下，macOS 建置也會佔據大部分執行時間，所以排除在每日預設值之外。

### 關鍵品質類別

`CodeQL Critical Quality` 是匹配的非安全性分片。它僅在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 防護刻意小於排程設定檔：非草稿 PR 僅針對代理程式指令/模型/工具執行與回覆分派程式碼、設定 Schema/遷移/IO 程式碼、驗證/密碼/Sandbox/安全性程式碼、核心頻道與內建頻道外掛程式執行時期、閘道協定/伺服器方法、記憶體執行時期/SDK 膠合程式、MCP/程序/出站傳遞、提供者執行時期/模型目錄、工作階段診斷/傳遞佇列、外掛程式載入器、外掛程式 SDK/套件合約，或外掛程式 SDK 回覆執行時期變更執行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定與品質工作流程變更會執行所有十二個 PR 品質分片。

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

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於使現有文件與最近送出的變更保持一致。它沒有純粹的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，而手動分派可以直接執行它。當 `main` 已向前推進，或最近一小時內已建立了另一個未跳過的 Docs Agent 執行時，工作流程執行調用會跳過。當它執行時，它會檢閱從上一次未跳過的 Docs Agent 來源 SHA 到目前 `main` 的提交範圍，因此一小時執行一次即可涵蓋自上次文件傳遞以來累積的所有主要變更。

### Test Performance Agent

`Test Performance Agent` 工作流程是一個用於緩慢測試的事件驅動 Codex 維護通道。它沒有純粹的排程：在 `main` 上的成功非機器人推送 CI 執行可以觸發它，但如果另一個工作流程執行調用已經在該 UTC 天執行或正在執行，它將會跳過。手動分派會繞過該每日活動閘門。該通道會建置完整的套件分組 Vitest 效能報告，讓 Codex 僅進行維持覆蓋率的小幅測試效能修正，而不是大規模的重構，然後重新執行完整套件報告，並拒絕會減少通過基準測試數量的變更。如果基準測試有失敗的測試，Codex 可能只會修正明顯的失敗，並且在提交任何內容之前，代理程式執行後的完整套件報告必須通過。當 `main` 在機器人推送落地之前推進時，該通道會將驗證過的修補程式變基底，重新執行 `pnpm check:changed`，並重試推送；衝突的過時修補程式將會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 操作能夠保持與文件代理程式相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於合併後重複項清理的手動維護者工作流程。它預設為空執行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證已合併的 PR 已被合併，並且每個重複項都具有共享的引用問題或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本機檢查閘門和變更路由

本機變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。該本機檢查閘門對於架構邊界的限制比廣泛的 CI 平台範圍更嚴格：

- 核心生產環境變更會執行核心生產環境和核心測試類型檢查以及核心 lint/guards；
- 核心僅測試變更僅執行核心測試類型檢查以及核心 lint；
- 擴充功能生產環境變更會執行擴充功能生產環境和擴充功能測試類型檢查以及擴充功能 lint；
- 擴充功能僅測試變更會執行擴充功能測試類型檢查以及擴充功能 lint；
- 公用 Plugin SDK 或 plugin-contract 變更會擴展為擴充功能類型檢查，因為擴充功能依賴這些核心合約（Vitest 擴充功能掃描仍為明確的測試工作）；
- 僅包含發行版元資料的版本遞增會執行目標版本、配置或根依賴項檢查；
- 未知的根/配置更改會安全地失敗至所有檢查通道。

本地變更測試的路由位於 `scripts/test-projects.test-support.mjs` 中，且設計上比 `check:changed` 更便宜：直接測試編輯會自行執行，來源編輯偏好顯式對應，然後是同層級測試和匯入圖依賴項。共用群組室傳遞配置是顯式對應之一：對群組可見回覆配置、來源回覆傳遞模式或訊息工具系統提示詞的更改，會透過核心回覆測試加上 Discord 和 Slack 傳遞回歸進行路由，以便共用預設值的變更在首次 PR 推送前就會失敗。僅當更改範圍足夠廣泛（涵蓋整個測試框架），導致廉價的對應集不再是可信的代理時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

從倉庫根目錄執行 Testbox，並對於廣泛驗證偏好使用新預熱的盒子。在重複使用、已過期或剛報告意外大量同步的盒子上花費緩慢的檢查閘道之前，請先在盒子內執行 `pnpm testbox:sanity`。

當 `pnpm-lock.yaml` 等必要的根檔案消失，或當 `git status --short` 顯示至少 200 個追蹤刪除時，健全性檢查會快速失敗。這通常表示遠端同步狀態不是 PR 的可信副本；請停止該盒子並預熱一個新的，而不是調試產品測試失敗。對於故意的大量刪除 PR，請為該健全性執行設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

`pnpm testbox:run` 也會終止在同步階段停留超過五分鐘且沒有同步後輸出的本地 Blacksmith CLI 呼叫。設定 `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` 以停用該保護，或是對於異常大的本地差異使用更大的毫秒值。

Crabbox 是倉庫擁有的遠端盒子包裝函式，用於維護者的 Linux 驗證。當檢查對於本地編輯迴圈來說過於廣泛、當 CI 一致性很重要，或是當驗證需要密碼、Docker、套件通道、可重複使用盒子或遠端日誌時，請使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 中斷、配額問題或明確擁有容量測試的後備方案。

在第一次執行之前，請從倉庫根目錄檢查包裝函式：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

倉庫包裝器會拒絕未宣佈 `blacksmith-testbox` 的過時 Crabbox 二進制檔案。即使 `.crabbox.yaml` 具有自有雲端的預設值，也請明確傳遞提供者。

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

閱讀最終的 JSON 摘要。有用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。一次性 Blacksmith 支援的 Crabbox 執行應該會自動停止 Testbox；如果執行中斷或清理不明確，請檢查運行中的 box 並僅停止您建立的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅當您有意在同一個已準備好的 box 上執行多個指令時才使用重複使用：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障層但 Blacksmith 本身運作正常，請使用直接 Blacksmith 作為狹窄的後備方案：

```bash
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
blacksmith testbox stop --id <tbx_id>
```

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但新的
warmups 幾分鐘後仍處於 `queued` 狀態且沒有 IP 或 Actions 執行 URL，
請將其視為 Blacksmith 提供者、佇列、帳單或組織限制的壓力。停止您建立的
已排隊 ID，避免啟動更多 Testbox，並在有人檢查 Blacksmith 儀表板、
帳單和組織限制的同時，將驗證轉移至下方的自有 Crabbox 容量路徑。

僅當 Blacksmith 停機、配額受限、缺少所需環境，或明確以自有容量為目標時，才升級至自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務確實需要 48xlarge 級別的 CPU，否則請避免使用 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需標準配額的最簡單方式。Repo 所有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域以及 `capacity.hints: true`，因此經仲介的 AWS 租約會列印選定的區域/市場、配額壓力、Spot 回退以及高壓力類別警告。對於較重的廣泛檢查，請使用 `fast`；僅在標準/快速檢查不足時使用 `large`；並且僅對特殊的 CPU 密集型通道使用 `beast`，例如全套件或全外掛 Docker 矩陣、明確的發布/阻斷驗證或高核心效能分析。請勿將 `beast` 用於 `pnpm check:changed`、專注測試、僅文檔工作、一般 lint/typecheck、小型 E2E 重現或 Blacksmith 中斷診斷。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場的波動干擾信號。

`.crabbox.yaml` 擁有自有雲通道的 provider、sync 和 GitHub Actions hydration 預設值。它排除了本地的 `.git`，因此經過 hydration 的 Actions checkout 會保留其自己的遠端 Git 元數據，而不是同步維護者本地的遠端和物件存儲，並且它排除了絕不應該被傳輸的本地運行時/構建工件。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲 `crabbox run --id <cbx_id>` 指令的 checkout、Node/pnpm 設置、`origin/main` 獲取以及非機密環境交接。

## 相關

- [安裝概覽](/zh-Hant/install)
- [開發頻道](/zh-Hant/install/development-channels)
