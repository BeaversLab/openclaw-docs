---
summary: "CI 工作圖、範圍閘道、發行傘與本地指令對等項"
title: "CI 管道"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI 在每次推送到 `main` 和每個拉取請求時運行。`preflight` 工作會對差異進行分類，並在只有不相關區域變更時關閉昂貴的通道。手動 `workflow_dispatch` 執行會有意繞過智慧範圍設定，並針對發行候選版本和廣泛驗證展開完整圖形。Android 通道透過 `include_android` 保持選用。僅限發行版的插件覆蓋率位於獨立的 [`Plugin Prerelease`](#plugin-prerelease) 工作流程中，且僅從 [`Full Release Validation`](#full-release-validation) 或明確的手動分派執行。

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

## 範圍和路由

範圍邏輯位於 `scripts/ci-changed-scope.mjs` 中，並由 `src/scripts/ci-changed-scope.test.ts` 中的單元測試涵蓋。手動觸發會略過變更範圍偵測，並使預檢清單 表現得就像每個範圍區域都已變更一樣。

- **CI 工作流程編輯** 會驗證 Node CI 圖形以及工作流程 Lint 檢查，但本身不會強制執行 Windows、Android 或 macOS 原生建置；這些平台通道仍僅限於平台原始碼變更的範圍。
- **`main` 推送上的文件** 會由獨立的 `Docs` 工作流程檢查，並使用與 CI 相同的 ClawHub 文件鏡像，因此混合程式碼與文件的推送不會另外將 CI `check-docs` 片段 排入佇列。當文件變更時，Pull Request 和手動 CI 仍會從 CI 執行 `check-docs`。
- **僅限 CI 路由的編輯、選定的低成本核心測試裝置編輯，以及狹窄的外掛合約輔助程式/測試路由編輯** 使用快速僅 Node 資訊清單路徑：`preflight`、安全性 和單一 `checks-fast-core` 工作。當變更僅限於快速工作直接練習的路由或輔助介面時，該路徑會略過建置構件、Node 22 相容性、通道合約、完整核心片段、捆綁外掛片段以及其他防護矩陣。
- **Windows Node checks** 的範圍限於 Windows 特定的處理程序/路徑包裝器、npm/pnpm/UI 執行器輔助程式、套件管理員設定，以及執行該管道的 CI 工作流程介面；不相關的原始碼、外掛、安裝測試以及僅測試變更仍保留在 Linux Node 管道上。

最慢的 Node 測試系列會進行分割或負載平衡，以便每個作業保持輕小而不過度保留執行器：外掛合約和頻道合約各自作為兩個加權的 Blacksmith 支援分片執行，並搭配標準 GitHub 執行器備援，核心單元快速/支援管道分開執行，核心執行時期基礎架構分割為 state、process/config、shared 和三個 cron 網域分片，auto-reply 作為平衡的 worker 執行（將回覆子樹分割為 agent-runner、dispatch 和 commands/state-routing 分片），而 agentic gateway/server 設定則分散在 chat/auth/model/http-plugin/runtime/startup 管道，而非等待建置成品。廣泛的瀏覽器、QA、媒體和雜項外掛測試使用其專用的 Vitest 設定，而非共享的外攬全部捕獲設定。Include-pattern 分片會使用 CI 分片名稱記錄計時條目，以便 `.artifacts/vitest-shard-timings.json` 能區分完整設定與過濾後的分片。`check-additional-*` 將套件邊界 compile/canary 工作保持在一起，並將執行時期拓撲架構與 gateway watch 覆蓋範圍分開；邊界守衛清單被劃分為一個提示繁重的分片和一個包含其餘守衛條紋的合併分片，每個分片同時執行選定的獨立守衛並列印每次檢查的計時。昂貴的 Codex happy-path 提示快照漂移檢查會作為額外的獨立作業執行，僅用於手動 CI 和影響提示的變更，因此一般不相關的 Node 變更不必等待冷提示快照的生成，且邊界分片在提示漂移仍被歸咎於導致該問題的 PR 時能保持平衡；同一個標記會跳過建置成品核心支援邊界分片內的提示快照 Vitest 生成。Gateway watch、頻道測試和核心支援邊界分片會在 `dist/` 和 `dist-runtime/` 已建置完成後，於 `build-artifacts` 內同時執行。

Android CI 會同時執行 `testPlayDebugUnitTest` 和 `testThirdPartyDebugUnitTest`，然後建構 Play debug APK。第三方風格沒有獨立的來源集或清單；其單元測試通道仍會使用 SMS/通話記錄 BuildConfig 標誌來編譯該風格，同時避免在每次與 Android 相關的推送時重複執行 debug APK 打包工作。

`check-dependencies` 分片會執行 `pnpm deadcode:dependencies`（這是釘選到最新 Knip 版本的生產 Knip 僅依賴通道，並針對 `dlx` 安裝停用了 pnpm 的最低發行年限）和 `pnpm deadcode:unused-files`，後者會將 Knip 的生產未使用檔案發現結果與 `scripts/deadcode-unused-files.allowlist.mjs` 進行比較。當 PR 新增未經審查的未使用檔案或留下過時的允許清單項目時，未使用檔案防護會失敗，同時保留 Knip 無法靜態解析的刻意動態外掛、生成、建置、即時測試和套件橋接層介面。

## ClawSweeper 活動轉發

`.github/workflows/clawsweeper-dispatch.yml` 是從 OpenClaw 存放庫活動到 ClawSweeper 的目標端橋接器。它不會檢出或執行不受信任的 PR 程式碼。工作流程從 `CLAWSWEEPER_APP_PRIVATE_KEY` 建立 GitHub App 權杖，然後將精簡的 `repository_dispatch` 負載分發到 `openclaw/clawsweeper`。

工作流程有四個通道：

- `clawsweeper_item` 用於精確的問題和 PR 審查請求；
- `clawsweeper_comment` 用於問題評論中的明確 ClawSweeper 指令；
- `clawsweeper_commit_review` 用於 `main` 推送上的提交層級審查請求；
- `github_activity` 用於 ClawSweeper 代理程式可能檢查的一般 GitHub 活動。

`github_activity` 通道僅轉發正規化後的中繼資料：事件類型、動作、行為者、存放庫、項目編號、URL、標題、狀態，以及評論或審查（如有）的簡短摘錄。它刻意避免轉發完整的 webhook 內容。`openclaw/clawsweeper` 中的接收工作流程是 `.github/workflows/github-activity.yml`，它會將正規化事件張貼到給 ClawSweeper 代理程式的 OpenClaw Gateway hook。

一般活動是觀察，而非預設發送。ClawSweeper 代理程式會在其提示中接收 Discord 目標，且僅當事件令人驚訝、可採取行動、具有風險或具操作效用時，才應發佈至 `#clawsweeper`。常規的開啟、編輯、機器人動態、重複 webhook 雜訊以及正常的審查流量應導致 `NO_REPLY`。

在整個路徑中，應將 GitHub 標題、評論、內容、審查文字、分支名稱和提交訊息視為不受信任的資料。它們是摘要和分類的輸入，而非工作流程或代理程式執行時的指令。

## 手動觸發

手動 CI 觸發執行與正常 CI 相同的工作圖，但會強制開啟每個非 Android 範圍的通道：Linux Node 分片、捆綁插件分片、插件和通道合約分片、Node 22 相容性、`check-*`、`check-additional-*`、建構成品煙霧測試、文件檢查、Python 技能、Windows、macOS 和 Control UI i18n。獨立的手動 CI 觸發僅使用 `include_android=true` 執行 Android；完整的發行版本傘透過傳遞 `include_android=true` 來啟用 Android。插件發行前靜態檢查、僅發行版的 `agentic-plugins` 分片、完整擴充功能批次掃描以及插件發行前 Docker 通道從 CI 中排除。Docker 發行前套件僅當 `Full Release Validation` 觸發獨立的 `Plugin Prerelease` 工作流程並啟用發行驗證閘道時才會執行。

手動執行使用唯一的並行群組，因此發行候選完整套件不會被同一 ref 上的其他推送或 PR 執行取消。可選的 `target_ref` 輸入允許受信任的呼叫者對分支、標籤或完整提交 SHA 執行該圖，同時使用來自所選觸發 ref 的工作流程檔案。

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## 執行器

| 執行器                           | 工作                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`、文件檢查、Python 技能、workflow-sanity、labeler、auto-response；install-smoke 預檢也使用 GitHub 託管的 Ubuntu，以便 Blacksmith 矩陣可以更早排隊                               |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`、`security-fast`、低權重擴充分片、`checks-fast-core`、外掛/頻道合約分片、`checks-node-compat-node22`、`check-guards`、`check-prod-types` 以及 `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Linux Node 測試分片、捆綁外掛測試分片、`check-additional-*` 分片、`android`                                                                                                                |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`、`check-lint`（對 CPU 敏感程度高，8 個 vCPU 的成本超過其節省的費用）；install-smoke Docker 建置（32 個 vCPU 的佇列時間成本超過其節省的費用）                             |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                           |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` 於 `openclaw/openclaw`；分支會回退至 `macos-latest`                                                                                                                           |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` 於 `openclaw/openclaw`；分支會回退至 `macos-latest`                                                                                                                          |

Canonical-repo CI 將 Blacksmith 保留為預設執行器路徑。在 `preflight` 期間，`scripts/ci-runner-labels.mjs` 會檢查近期佇列中以及進行中的 Actions 執行，尋找佇列中的 Blacksmith 工作。如果特定的 Blacksmith 標籤已有佇列工作，則使用該確切標籤的下游工作將僅針對該次執行回退至相符的 GitHub 託管執行器（`ubuntu-24.04`、`windows-2025` 或 `macos-latest`）。相同 OS 系列中的其他 Blacksmith 大小則保持在其主要標籤上。如果 API 探測失敗，則不會套用回退機制。

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

`OpenClaw Performance` 是產品/執行時期效能工作流程。它會每日在 `main` 上執行，並可手動觸發：

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

手動分派通常會對工作流程參照進行基準測試。設定 `target_ref` 即可使用當前的工作流程實作對發行標籤或其他分支進行基準測試。已發佈的報告路徑和最新指標是以受測參照為鍵值，而每個 `index.md` 都會記錄受測參照/SHA、工作流程參照/SHA、Kova 參照、設定檔、通道授權模式、模型、重複次數和場景過濾器。

該工作流程會從固定的發行版本安裝 OCM，並從固定的 `kova_ref` 輸入安裝 `openclaw/Kova` 中的 Kova，然後執行三個通道：

- `mock-provider`：針對具有決定性偽造 OpenAI 相容授權的本機建構執行時期，執行 Kova 診斷場景。
- `mock-deep-profile`：針對啟動、閘道和代理程式輪次熱點進行 CPU/堆疊/追蹤效能分析。
- `live-openai-candidate`：一次真實的 OpenAI `openai/gpt-5.5` 代理程式輪次，當 `OPENAI_API_KEY` 不可用時會跳過。

模擬提供者通道也會在 Kova 通過後執行 OpenClaw 原生源頭探測：針對預設、Hook 和 50 個外掛程式啟動案例的閘道啟動時間和記憶體；重複的模擬 OpenAI `channel-chat-baseline` hello 迴圈；以及針對已啟動閘道的 CLI 啟動指令。源頭探測的 Markdown 摘要位於報告套件中的 `source/index.md`，旁邊附有原始 JSON。

每個通道都會上傳 GitHub 成品。當設定 `CLAWGRIT_REPORTS_TOKEN` 時，工作流程也會將 `report.json`、`report.md`、套件、`index.md` 和源頭探測成品提交到 `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/` 下的 `openclaw/clawgrit-reports`。目前的受測參照指標會寫入為 `openclaw-performance/<tested-ref>/latest-<lane>.json`。

## 完整版本驗證

`Full Release Validation` 是用於「發布前執行所有項目」的手動總管工作流程。它接受分支、標籤或完整提交 SHA，使用該目標分發手動 `CI` 工作流程，分發 `Plugin Prerelease` 以進行僅發布版外掛程式/套件/靜態/Docker 驗證，並分發 `OpenClaw Release Checks` 以進行安裝冒煙測試、套件驗收、跨作業系統套件檢查、QA Lab 一致性、Matrix 和 Telegram 通道。穩定/預設執行會將詳盡的即時/E2E 和 Docker 發布路徑覆蓋率保留在 `run_release_soak=true` 之後；`release_profile=full` 強制開啟該覆蓋率，使廣泛的諮詢驗證保持廣泛。使用 `rerun_group=all` 和 `release_profile=full`，它還會針對發布檢查中的 `release-package-under-test` 構件執行 `NPM Telegram Beta E2E`。發布後，傳遞 `release_package_spec` 以在發布檢查、套件驗收、Docker、跨作業系統和 Telegram 之間重複使用已發布的 npm 套件，而無需重建。僅當 Telegram 必須驗證不同的套件時，才使用 `npm_telegram_package_spec`。

請參閱 [完整發布驗證](/zh-Hant/reference/full-release-validation) 以了解階段矩陣、確切的工作流程作業名稱、設定檔差異、構件和專注的重新執行處理程式。

`OpenClaw Release Publish` 是手動變更發布的工作流程。在發布標籤存在且 OpenClaw npm 預檢成功後，請從 `release/YYYY.M.D` 或 `main` 分發它。它會驗證 `pnpm plugins:sync:check`，為所有可發布的外掛程式套件分發 `Plugin NPM Release`，為相同的發布 SHA 分發 `Plugin ClawHub Release`，然後才使用已儲存的 `preflight_run_id` 分發 `OpenClaw NPM Release`。

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

若要在快速變動的分支上對固定提交進行驗證，請使用輔助程式而非 `gh workflow run ... --ref main -f ref=<sha>`：

```bash
pnpm ci:full-release --sha <full-sha>
```

GitHub workflow dispatch 引用必須是分支或標籤，而非原始的 commit SHA。此輔助工具會在目標 SHA 處推送一個暫時的 `release-ci/<sha>-...` 分支，從該固定引用觸發 `Full Release Validation`，驗證每個子工作流程 `headSha` 都符合目標，並在執行完成後刪除暫時分支。如果任何子工作流程在不同的 SHA 上執行，總管驗證器也會失敗。

`release_profile` 控制傳入版本檢查的 live/provider 廣度。手動版本工作流程預設為 `stable`；僅當您有意需要廣泛的 advisory provider/media 矩陣時才使用 `full`。`run_release_soak` 控制穩定/預設版本檢查是否執行完整的 live/E2E 和 Docker 版本路徑浸泡測試；`full` 會強制執行浸泡測試。

- `minimum` 保留最快的 OpenAI/core 版本關鍵通道。
- `stable` 加入穩定的 provider/backend 集合。
- `full` 執行廣泛的 advisory provider/media 矩陣。

總管會記錄已觸發的子執行 ID，而最終的 `Verify full validation` 工作會重新檢查目前子執行的結論，並為每個子執行附加最慢工作表格。如果子工作流程被重新執行並通過，請僅重新執行父驗證器工作以重新整理總管結果和時序摘要。

針對復原，`Full Release Validation` 和 `OpenClaw Release Checks` 都接受 `rerun_group`。針對發行候選版本，請使用 `all`；針對僅有一般完整 CI 子項目，請使用 `ci`；針對僅有外掛程式發行前子項目，請使用 `plugin-prerelease`；針對每個發行子項目，請使用 `release-checks`；或是使用匯總項目上較小的群組：`install-smoke`、`cross-os`、`live-e2e`、`package`、`qa`、`qa-parity`、`qa-live` 或 `npm-telegram`。這能讓失敗的發行版本重新執行在經過針對性修復後保持受限。針對單一失敗的跨 OS 通道，請將 `rerun_group=cross-os` 與 `cross_os_suite_filter` 結合，例如 `windows/packaged-upgrade`；長時間的跨 OS 指令會輸出心跳行，且套件升級摘要包含各階段的時間。QA 發行檢查通道僅供參考，除了標準執行階段工具覆蓋率閘道之外，當所需的 OpenClaw 動態工具從標準層級摘要中變動或消失時，該閘道會進行封鎖。

`OpenClaw Release Checks` 使用受信任的工作流程參照，將選取的參照解析一次成為 `release-package-under-test` tarball，然後將該構件傳遞給跨 OS 檢查和套件驗收，以及在執行浸泡覆蓋率時傳遞給即時/E2E 發行路徑 Docker 工作流程。這能讓套件位元組在發行版本之間保持一致，並避免在多個子項目工作中重新封裝相同的候選版本。

針對 `ref=main` 和 `rerun_group=all` 的重複 `Full Release Validation` 執行會取代較舊的匯總項目。父項監視器會在父項取消時取消它已分派的任何子項工作流程，因此較新的主要驗證不會卡在停滯的兩小時發行檢查執行之後。發行分支/標籤驗證和針對性重新執行群組會保留 `cancel-in-progress: false`。

## Live 和 E2E 分片

發行版本的即時/E2E 子項目保持廣泛的原生 `pnpm test:live` 覆蓋率，但它會透過 `scripts/test-live-shard.mjs` 以具名的分片來執行，而不是單一的序列工作：

- `native-live-src-agents`
- `native-live-src-gateway-core`
- 依供應商篩選的 `native-live-src-gateway-profiles` 工作
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- 分割媒體音訊/視訊分片以及依供應商篩選的音樂分片

這在保持相同檔案覆蓋率的同時，讓緩慢的即時供應商失敗更容易重新執行和診斷。匯總的 `native-live-extensions-o-z`、`native-live-extensions-media` 和 `native-live-extensions-media-music` 分片名稱仍可用於手動一次性重新執行。

原生即時媒體分片在 `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04` 中執行，由 `Live Media Runner Image` 工作流程建置。該映像檔預先安裝了 `ffmpeg` 和 `ffprobe`；媒體工作僅在設定前驗證二進位檔。請將 Docker 支援的即時測試套件保留在一般的 Blacksmith 執行器上——容器工作不是啟動巢狀 Docker 測試的正確位置。

Docker 支援的即時模型/後端分片對於每個選定的提交使用一個獨立的共用 `ghcr.io/openclaw/openclaw-live-test:<sha>` 映像檔。即時發行工作流程會建置並推送該映像檔一次，然後 Docker 即時模型、依供應商分片的閘道、CLI 後端、ACP 綁定和 Codex 測試線圈分片會以 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行。閘道 Docker 分片在 workflow job timeout 之下承載了明確的腳本層級 `timeout` 上限，以便卡住的容器或清理路徑能快速失敗，而不是耗費整個 release-check 預算。如果這些分片獨立重新建置完整的來源 Docker 目標，則表示發行執行設定錯誤，並會在重複的映像檔建置上浪費牆上時鐘時間。

## 套件驗收

當問題是「這個可安裝的 OpenClaw 套件是否能作為產品運作？」時，請使用 `Package Acceptance`。這與正常的 CI 不同：正常的 CI 驗證來源樹，而套件驗收則透過使用者安裝或更新後執行的相同 Docker E2E 測試線圈來驗證單一 tarball。

### 工作

1. `resolve_package` 檢出 `workflow_ref`，解析一個候選套件，寫入 `.artifacts/docker-e2e-package/openclaw-current.tgz`，寫入 `.artifacts/docker-e2e-package/package-candidate.json`，將兩者作為 `package-under-test` 構件上傳，並在 GitHub 步驟摘要中列印來源、工作流程參照、套件參照、版本、SHA-256 和設定檔。
2. `docker_acceptance` 使用 `ref=workflow_ref` 和 `package_artifact_name=package-under-test` 呼叫 `openclaw-live-and-e2e-checks-reusable.yml`。可重複使用的工作流程會下載該構件，驗證 tarball 清單，在需要時準備 package-digest Docker 映像檔，並針對該套件執行選定的 Docker 通道，而不是封裝工作流程檢出。當設定檔選擇了多個目標 `docker_lanes` 時，可重複使用的工作流程會準備一次套件和共用映像檔，然後將這些通道作為具有唯一構件的平行目標 Docker 工作進行分發。
3. `package_telegram` 可選地呼叫 `NPM Telegram Beta E2E`。它會在 `telegram_mode` 不是 `none` 時執行，並在 Package Acceptance 解析出一個套件時安裝相同的 `package-under-test` 構件；獨立的 Telegram 分派仍然可以安裝已發布的 npm 規格。
4. 如果套件解析、Docker 驗收或選用的 Telegram 通道失敗，`summary` 將導致工作流程失敗。

### 候選來源

- `source=npm` 僅接受 `openclaw@beta`、`openclaw@latest` 或確切的 OpenClaw 發布版本（例如 `openclaw@2026.4.27-beta.2`）。請將此用於已發布的 prelease/stable 驗收。
- `source=ref` 封裝受信任的 `package_ref` 分支、標籤或完整提交 SHA。解析器會擷取 OpenClaw 分支/標籤，驗證選定的提交可從儲存庫分支歷史記錄或發布標籤到達，在分離的工作樹中安裝 deps，並使用 `scripts/package-openclaw-for-docker.mjs` 進行封裝。
- `source=url` 下載 HTTPS `.tgz`；需要 `package_sha256`。
- `source=artifact` 會從 `artifact_run_id` 和 `artifact_name` 下載一個 `.tgz`；`package_sha256` 是可選的，但對於外部共享的產品應該提供。

請將 `workflow_ref` 和 `package_ref` 分開。`workflow_ref` 是執行測試的可信工作流程/harness 代碼。`package_ref` 是在 `source=ref` 時被打包的來源提交。這讓當前的測試 harness 可以在不執行舊工作流程邏輯的情況下，驗證較舊的可信來源提交。

### 套件設定檔

- `smoke` — `npm-onboard-channel-agent`、`gateway-network`、`config-reload`
- `package` — `npm-onboard-channel-agent`、`doctor-switch`、`update-channel-switch`、`skill-install`、`update-corrupt-plugin`、`upgrade-survivor`、`published-upgrade-survivor`、`update-restart-auth`、`plugins-offline`、`plugin-update`
- `product` — `package` 加上 `mcp-channels`、`cron-mcp-cleanup`、`openai-web-search-minimal`、`openwebui`
- `full` — 包含 OpenWebUI 的完整 Docker 發布路徑區塊
- `custom` — 精確的 `docker_lanes`；當 `suite_profile=custom` 時為必填

`package` 設定檔使用離線外掛覆蓋率，因此已發布套件的驗證不受即時 ClawHub 可用性的限制。選用的 Telegram 路徑會在 `NPM Telegram Beta E2E` 中重複使用 `package-under-test` 產品，並保留已發布的 npm spec 路徑以供單獨分發使用。

關於專門的更新和外掛測試政策，包括本地指令、
Docker 路徑、套件驗收輸入、發布預設值和失敗分診，
請參閱 [Testing updates and plugins](/zh-Hant/help/testing-updates-plugins)。

Release checks 會呼叫 Package Acceptance，並傳入 `source=artifact`、準備好的發布套件產出物 `suite_profile=custom`、`docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` 以及 `telegram_mode=mock-openai`。這能確保套件遷移、更新、即時 ClawHub 技能安裝、過時插件依賴清理、已配置插件安裝修復、離線插件、外掛更新以及 Telegram 驗證都針對同一個解析出的套件 tarball 進行。在發布 Beta 之後，於 Full Release Validation 或 OpenClaw Release Checks 上設定 `release_package_spec`，即可在不重新建置的情況下，針對已發布的 npm 套件執行相同的矩陣；只有在 Package Acceptance 需要使用與其餘發布驗證不同的套件時，才設定 `package_acceptance_package_spec`。跨作業系統的發布檢查仍然涵蓋特定作業系統的入門、安裝程式與平台行為；套件/更新產品驗證應從 Package Acceptance 開始。`published-upgrade-survivor` Docker lane 會在阻塞性發布路徑中，每次執行驗證一個已發布的套件基準。在 Package Acceptance 中，解析出的 `package-under-test` tarball 永遠是候選版本，而 `published_upgrade_survivor_baseline` 則用於選擇後備的已發布基準，預設為 `openclaw@latest`；失敗 lane 的重新執行指令會保留該基準。具備 `run_release_soak=true` 或 `release_profile=full` 的 Full Release Validation 會設定 `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` 和 `published_upgrade_survivor_scenarios=reported-issues`，以將範圍擴展至四個最新的穩定 npm 發布版本，加上釘選的插件相容性邊界發布版本，以及針對 Feishu 設定、保留的 bootstrap/persona 檔案、已配置的 OpenClaw 插件安裝、tilde 路徑和過時的舊版插件依賴根目錄的問題場景 fixture。多基準的已發布升級篩選會依基準分片至個別的目標 Docker runner 工作。當問題是針對已發布更新進行徹底清理，而非一般的 Full Release CI 範疇時，獨立的 `Update Migration` 工作流程會使用 `update-migration` Docker lane，並搭配 `all-since-2026.4.23` 與 `plugin-deps-cleanup`。本地聚合執行可以使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` 傳入確切的套件規格、使用 `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` 保持單一 lane（例如 `openclaw@2026.4.15`），或是為情境矩陣設定 `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS`。已發布的 lane 會使用內建的 `openclaw config set` 指令配方來設定基準、在 `summary.json` 中記錄配方步驟，並在 Gateway 啟動後探測 `/healthz`、`/readyz` 以及 RPC 狀態。Windows 打包與安裝程式全新安裝 lane 也會驗證已安裝的套件是否能從原始的 Windows 絕對路徑匯入瀏覽器控制覆寫。OpenAI 跨作業系統 agent-turn 測試若有設定則預設為 `OPENCLAW_CROSS_OS_OPENAI_MODEL`，否則為 `openai/gpt-5.5`，因此安裝與 gateway 驗證會保持在 GPT-5 測試模型上，同時避免使用 GPT-4.x 的預設值。

### 舊版相容性視窗

Package Acceptance 針對已發佈的套件有有限的舊版相容性視窗。透過 `2026.4.25` 的套件，包括 `2026.4.25-beta.*`，可以使用相容性路徑：

- `dist/postinstall-inventory.json` 中已知的私有 QA 項目可能指向 tarball 中省略的檔案；
- 當套件未公開該旗標時，`doctor-switch` 可能會跳過 `gateway install --wrapper` 持續性子案例；
- `update-channel-switch` 可能會從 tarball 衍生的假 git fixture 中修剪遺失的 pnpm `patchedDependencies`，並且可能記錄遺失的持續性 `update.channel`；
- plugin smokes 可能會讀取舊版安裝記錄位置或接受遺失的 marketplace 安裝記錄持續性；
- `plugin-update` 可能允許設定元數據遷移，同時仍要求安裝記錄和不重新安裝行為保持不變。

已發佈的 `2026.4.26` 套件也可能針對已經發運的本地建置元數據戳記檔案發出警告。後續套件必須滿足現代合約；相同的條件將會失敗而不是警告或跳過。

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

當除錯失敗的套件驗收執行時，請從 `resolve_package` 摘要開始，以確認套件來源、版本和 SHA-256。然後檢查 `docker_acceptance` 子執行及其 Docker 成品：`.artifacts/docker-tests/**/summary.json`、`failures.json`、lane 日誌、階段計時和重新執行指令。優先重新執行失敗的套件設定檔或確切的 Docker lanes，而不是重新執行完整的發佈驗證。

## 安裝 smoketest

獨立的 `Install Smoke` 工作流程透過其自己的 `preflight` 工作重複使用相同的 scope 腳本。它將 smoketest 覆蓋範圍分割為 `run_fast_install_smoke` 和 `run_full_install_smoke`。

- **Fast path** 針對涉及 Docker/套件表層、套件捆绑套件/資訊清單變更，或 Docker 測試工作所執行的核心外掛/通道/閘道/Plugin SDK 表層的 Pull Request 執行。僅原始碼的套件捆绑外掛變更、僅測試的編輯和僅文件的編輯不會佔用 Docker 工作程序。Fast path 會建置一次根 Dockerfile 映像檔、檢查 CLI、執行 agents delete shared-workspace CLI 測試、執行容器 gateway-network e2e、驗證套件捆绑擴充功能的建置參數，並在 240 秒的總計指令逾時下執行受限的套件捆绑外掛 Docker 設定檔（每個場景的 Docker 執行個別設有上限）。
- **Full path** 會保留每夜排程執行、手動分派、workflow-call 發行版本檢查，以及真正涉及安裝程式/套件/Docker 表層的 Pull Request 的 QR 套件安裝和安裝程式 Docker/更新覆蓋範圍。在完整模式下，install-smoke 會準備或重複使用一個目標 SHA 的 GHCR 根 Dockerfile 測試映像檔，然後將 QR 套件安裝、根 Dockerfile/gateway 測試、安裝程式/更新測試，以及快速套件捆绑外掛 Docker E2E 作為獨立工作執行，以便安裝程式工作不必等待根映像測試完成。

`main` 推送（包括合併提交）不會強制執行完整路徑；當變更範圍邏輯會在推送時要求完整覆蓋範圍，工作流程會保留快速 Docker 測試，並將完整安裝測試留給每夜或發行版本驗證。

緩慢的 Bun 全域安裝映像提供者測試是另外由 `run_bun_global_install_smoke` 控管的。它會在每夜排程以及發行版本檢查工作流程中執行，且手動 `Install Smoke` 分派可以選擇加入，但 Pull Request 和 `main` 推送則不會。QR 和安裝程式 Docker 測試會保留自己專注於安裝的 Dockerfiles。

## 本機 Docker E2E

`pnpm test:docker:all` 預先建置一個共用的即時測試映像檔，將 OpenClaw 打包一次為 npm tarball，並建置兩個共用的 `scripts/e2e/Dockerfile` 映像檔：

- 用於安裝程式/更新/外掛相依性通道的裸 Node/Git 執行器；
- 一個將相同 tarball 安裝到 `/app` 的功能映像檔，用於正常功能通道。

Docker 通道定義位於 `scripts/lib/docker-e2e-scenarios.mjs`，規劃器邏輯位於 `scripts/lib/docker-e2e-plan.mjs`，而執行器僅執行選定的計畫。排程器使用 `OPENCLAW_DOCKER_E2E_BARE_IMAGE` 和 `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE` 為每個通道選擇映像，然後使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行通道。

### 可調整參數

| 變數                                   | 預設值  | 用途                                                                            |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10      | 一般通道的主要集區位置數量。                                                    |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10      | 提供者敏感的尾部集區位置數量。                                                  |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9       | 並行即時通道上限，以避免提供者進行節流。                                        |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10      | 並行 npm install 通道上限。                                                     |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7       | 並行多服務通道上限。                                                            |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000    | 通道啟動之間的錯開時間，以避免 Docker 守護程式建立風暴；設定 `0` 以表示不錯開。 |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000 | 每個通道的後備逾時時間（120 分鐘）；選定的即時/尾部通道使用更嚴格的上限。       |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | 未設定  | `1` 會列印排程器計畫而不執行通道。                                              |
| `OPENCLAW_DOCKER_ALL_LANES`            | 未設定  | 以逗號分隔的確切通道列表；跳過清理測試，以便代理程式可以重現單一失敗的通道。    |

高於其有效上限的通道仍可從空集區啟動，然後單獨執行直到釋放容量。本地匯總會預檢 Docker、移除過時的 OpenClaw E2E 容器、發出活動通道狀態、持續保存通道計時以用於最長優先排序，並在預設情況下於首次失敗後停止排程新的集區通道。

### 可重複使用的即時/E2E 工作流程

可重用的 live/E2E 工作流程會詢問 `scripts/test-docker-all.mjs --plan-json` 需要哪些套件、映像檔類型、live 映像檔、通道以及憑證涵蓋範圍。`scripts/docker-e2e.mjs` 接著將該計畫轉換為 GitHub 輸出和摘要。它會透過 `scripts/package-openclaw-for-docker.mjs` 打包 OpenClaw、下載目前執行的套件構件，或是從 `package_artifact_run_id` 下載套件構件；驗證 tarball 清單；當計畫需要安裝套件的通道時，透過 Blacksmith 的 Docker 層快取建置並推送標記有套件摘要的 bare/functional GHCR Docker E2E 映像檔；並重用提供的 `docker_e2e_bare_image`/`docker_e2e_functional_image` 輸入或現有的套件摘要映像檔，而不進行重建。Docker 映像檔拉取會以每次嘗試 180 秒的受限逾時進行重試，因此當暫存區/快取串流失敗時會快速重試，而不會消耗大部分的 CI 關鍵路徑。

### Release-path 區塊

Release Docker 涵蓋範圍會使用 `OPENCLAW_SKIP_DOCKER_BUILD=1` 執行較小的分區工作，因此每個區塊僅拉取其所需的映像檔類型，並透過相同的加權排程器執行多個通道：

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

目前的 release Docker 區塊為 `core`、`package-update-openai`、`package-update-anthropic`、`package-update-core`、`plugins-runtime-plugins`、`plugins-runtime-services` 以及 `plugins-runtime-install-a` 到 `plugins-runtime-install-h`。`plugins-runtime-core`、`plugins-runtime` 和 `plugins-integrations` 保持為匯總的 plugin/runtime 別名。`install-e2e` 通道別名保持為兩個提供者安裝程式通道的匯總手動重新執行別名。

當完整的 release-path 涵蓋範圍要求時，OpenWebUI 會被納入 `plugins-runtime-services`，並僅針對僅 OpenWebUI 的分派保留獨立的 `openwebui` 區塊。Bundled-channel 更新通道會因暫時性 npm 網路失敗而重試一次。

每個區塊會上傳 `.artifacts/docker-tests/`，其中包含通道日誌、計時資訊、`summary.json`、`failures.json`、階段計時、排程器計劃 JSON、慢速通道表格以及各通道的重新執行指令。工作流程 `docker_lanes` 輸入會對準備好的映像檔（而非區塊工作）執行選定的通道，這能讓失敗通道的偵錯工作侷限於單一目標 Docker 工作，並為該執行準備、下載或重用套件構件；如果選定的通道是即時 Docker 通道，目標工作會為該次重新執行在本機建置即時測試映像檔。產生的各通道 GitHub 重新執行指令在數值存在時會包含 `package_artifact_run_id`、`package_artifact_name` 以及準備好的映像檔輸入，因此失敗的通道可以重用失敗執行中的確切套件和映像檔。

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

排程的即時/E2E 工作流程每日會執行完整的發行路徑 Docker 測試組。

## 外掛程式預先發行

`Plugin Prerelease` 是成本更高的產品/套件覆蓋範圍，因此它是由 `Full Release Validation` 或特定操作員分派的獨立工作流程。一般的拉取請求、`main` 推送和獨立的手動 CI 分派都會讓該測試組保持關閉。它會將捆綁的外掛程式測試分散到八個擴充工作執行緒；這些擴充分片工作每次最多執行兩個外掛程式設定群組，每個群組使用一個 Vitest 工作執行緒和更大的 Node 堆積，以便匯入負擔較重的外掛程式批次不會產生額外的 CI 工作。僅限發行的 Docker 預先發行路徑會將目標 Docker 通道分成小批次執行，以避免為一到三分鐘的工作保留數十個執行器。該工作流程也會從 `@openclaw/plugin-inspector` 上傳資訊性 `plugin-inspector-advisory` 構件；檢查器的發現是分類輸入，並不會改變封鎖性的外掛程式預先發行閘道。

## QA 實驗室

QA 實驗室在主要智慧範圍工作流程之外擁有專屬的 CI 通道。Agentic parity 巢狀包含於廣泛的 QA 和發行協作工具之下，而非獨立的 PR 工作流程。當 parity 應隨著廣泛驗證執行進行時，請使用 `Full Release Validation` 搭配 `rerun_group=qa-parity`。

- `QA-Lab - All Lanes` 工作流程每晚在 `main` 上運行，並在手動觸發時運行；它會將 mock parity lane、live Matrix lane 以及 live Telegram 和 Discord lanes 作為並行作業展開。Live 作業使用 `qa-live-shared` 環境，而 Telegram/Discord 則使用 Convex 租約。

Release checks 使用確定性 mock 提供者和合格 mock 模型 (`mock-openai/gpt-5.5` 和 `mock-openai/gpt-5.5-alt`) 執行 Matrix 和 Telegram live transport lanes，以便將通道合約與 live model 延遲和正常的提供者外掛程式啟動隔離開來。Live transport gateway 會停用記憶體搜尋，因為 QA parity 會單獨涵蓋記憶體行為；提供者連線能力則由獨立的 live model、native provider 和 Docker provider suites 涵蓋。

Matrix 針對預定和 release gates 使用 `--profile fast`，僅在簽出的 CLI 支援時才新增 `--fail-fast`。CLI 預設值和手動工作流程輸入保持為 `all`；手動 `matrix_profile=all` 觸發總是將完整的 Matrix 涵蓋範圍分片為 `transport`、`media`、`e2ee-smoke`、`e2ee-deep` 和 `e2ee-cli` 作業。

`OpenClaw Release Checks` 也會在發布核准前執行發布關鍵的 QA Lab lanes；其 QA parity gate 會將候選和 baseline packs 作為並行 lane 作業執行，然後將這兩個構件下載到一個小型報告作業中，以進行最終的 parity 比較。

對於一般的 PR，請依照範圍限定的 CI/check 證據，而不是將 parity 視為必要狀態。

## CodeQL

`CodeQL` 工作流程是有意設計為狹窄的第一道安全掃描器，而非完整的存放庫掃描。每日、手動和非草稿 PR guard runs 會掃描 Actions workflow 程式碼以及風險最高的 JavaScript/TypeScript 介面，並使用高信心度的安全性查詢，過濾出高/嚴重等級的 `security-severity`。

Pull request guard 保持輕量：僅針對 `.github/actions`、`.github/codeql`、`.github/workflows`、`packages` 或 `src` 下的變更啟動，並執行與排程工作流程相同的高信心安全矩陣。Android 和 macOS CodeQL 不包含在 PR 預設中。

### 安全性類別

| 類別                                              | 層面                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth、secrets、sandbox、cron 和 gateway baseline                                                                                  |
| `/codeql-security-high/channel-runtime-boundary`  | Core channel 實作合約以及 channel plugin runtime、gateway、Plugin SDK、secrets、audit touchpoints                                 |
| `/codeql-security-high/network-ssrf-boundary`     | Core SSRF、IP 解析、network guard、web-fetch 和 Plugin SDK SSRF policy surfaces                                                   |
| `/codeql-security-high/mcp-process-tool-boundary` | MCP servers、process execution helpers、outbound delivery 和 agent tool-execution gates                                           |
| `/codeql-security-high/plugin-trust-boundary`     | Plugin install、loader、manifest、registry、package-manager install、source-loading 和 Plugin SDK package contract trust surfaces |

### 平台特定安全性分片

- `CodeQL Android Critical Security` — 排程的 Android 安全性分片。在工作流程健全性所接受的最小 Blacksmith Linux runner 上為 CodeQL 手動建置 Android 應用程式。上傳於 `/codeql-critical-security/android` 之下。
- `CodeQL macOS Critical Security` — 每週/手動 macOS 安全性分片。在 Blacksmith macOS 上為 CodeQL 手動建置 macOS 應用程式，從上傳的 SARIF 中篩選掉相依性建置結果，並上傳於 `/codeql-critical-security/macos` 之下。保持在每日預設之外，因為即使在乾淨的狀態下，macOS 建置也佔據了大部分執行時間。

### 關鍵品質類別

`CodeQL Critical Quality` 是對應的非安全性分片。它會在較小的 Blacksmith Linux 執行器上，針對狹窄的高價值表面，僅執行錯誤嚴重性、非安全性的 JavaScript/TypeScript 品質查詢。其 PR 防護意圖上比排程設定檔更小：非草稿 PR 僅會針對代理程式指令/模型/工具執行和回覆分派程式碼、設定檔 schema/遷移/IO 程式碼、驗證/密鑰/沙盒/安全性程式碼、核心頻道和內建頻道外掛程式執行時、閘道通訊協定/伺服器方法、記憶體執行時/SDK 連接、MCP/處理程序/外寄傳遞、提供者執行時/模型目錄、工作階段診斷/傳遞佇列、外掛程式載入器、外掛程式 SDK/套件合約或外掛程式 SDK 回覆執行時變更執行匹配的 `agent-runtime-boundary`、`config-boundary`、`core-auth-secrets`、`channel-runtime-boundary`、`gateway-runtime-boundary`、`memory-runtime-boundary`、`mcp-process-runtime-boundary`、`provider-runtime-boundary`、`session-diagnostics-boundary`、`plugin-boundary`、`plugin-sdk-package-contract` 和 `plugin-sdk-reply-runtime` 分片。CodeQL 設定和品質工作流程變更會執行所有十二個 PR 品質分片。

手動分派接受：

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

狹窄設定檔是教學/迭代掛鉤，用於單獨執行一個品質分片。

| 類別                                                    | 表面                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | 驗證、密鑰、沙盒、 cron 和閘道安全性邊界程式碼                                                                                                                    |
| `/codeql-critical-quality/config-boundary`              | 設定檔 schema、遷移、正規化和 IO 合約                                                                                                                             |
| `/codeql-critical-quality/gateway-runtime-boundary`     | 閘道通訊協定 schema 和伺服器方法合約                                                                                                                              |
| `/codeql-critical-quality/channel-runtime-boundary`     | 核心頻道和內建頻道外掛程式實作合約                                                                                                                                |
| `/codeql-critical-quality/agent-runtime-boundary`       | 指令執行、模型/提供者分派、自動回覆分派和佇列，以及 ACP 控制平面執行時合約                                                                                        |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | MCP 伺服器和工具橋接器、處理程序監督輔助程式，以及外寄傳遞合約                                                                                                    |
| `/codeql-critical-quality/memory-runtime-boundary`      | 記憶體主機 SDK、記憶體執行時外觀、記憶體外掛程式 SDK 別名、記憶體執行時啟用連接，以及記憶體醫生指令                                                               |
| `/codeql-critical-quality/session-diagnostics-boundary` | Reply queue internals, session delivery queues, outbound session binding/delivery helpers, diagnostic event/log bundle surfaces, and session doctor CLI contracts |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Plugin SDK inbound reply dispatch, reply payload/chunking/runtime helpers, channel reply options, delivery queues, and session/thread binding helpers             |
| `/codeql-critical-quality/provider-runtime-boundary`    | Model catalog normalization, provider auth and discovery, provider runtime registration, provider defaults/catalogs, and web/search/fetch/embedding registries    |
| `/codeql-critical-quality/ui-control-plane`             | Control UI bootstrap, local persistence, gateway control flows, and task control-plane runtime contracts                                                          |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Core web fetch/search, media IO, media understanding, image-generation, and media-generation runtime contracts                                                    |
| `/codeql-critical-quality/plugin-boundary`              | Loader, registry, public-surface, and Plugin SDK entrypoint contracts                                                                                             |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Published package-side Plugin SDK source and plugin package contract helpers                                                                                      |

Quality stays separate from security so quality findings can be scheduled, measured, disabled, or expanded without obscuring security signal. Swift, Python, and bundled-plugin CodeQL expansion should be added back as scoped or sharded follow-up work only after the narrow profiles have stable runtime and signal.

## 維護工作流程

### Docs Agent

`Docs Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於保持現有文件與最近落地的變更保持一致。它沒有純排程：在 `main` 上的成功非機器人推送 CI 執行可以觸發它，並且手動調度可以直接運行它。當 `main` 已經移動或當過去一小時內建立了另一個非跳過的 Docs Agent 執行時，工作流程執行調用會跳過。當它運行時，它會審查從先前非跳過的 Docs Agent 來源 SHA 到當前 `main` 的提交範圍，因此每小時一次的執行可以涵蓋自上次文件傳遞以來累積的所有主要變更。

### 測試效能代理

`Test Performance Agent` 工作流程是一個事件驅動的 Codex 維護通道，用於執行緩慢的測試。它沒有單純的排程：在 `main` 上成功的非機器人推送 CI 執行可以觸發它，但如果該 UTC 天內已經有另一個工作流程執行調用已運行或正在運行，它就會跳過。手動分派會繞過該每日活動閘門。該通道會建置一個完整的套件分組 Vitest 效能報告，讓 Codex 只進行小幅度的保留覆蓋率的測試效能修正，而不是廣泛的重構，然後重新執行完整套件報告並拒絕會減少通過基準測試數量的變更。如果基準有失敗的測試，Codex 可能只會修正明顯的失敗，且在提交任何內容之前，代理後的完整套件報告必須通過。當 `main` 在機器人推送落地之前推進時，該通道會將驗證過的修補程式變基，重新執行 `pnpm check:changed`，並重試推送；衝突的過時修補程式會被跳過。它使用 GitHub 託管的 Ubuntu，以便 Codex 動作能保持與 docs agent 相同的 drop-sudo 安全姿態。

### 合併後的重複 PR

`Duplicate PRs After Merge` 工作流程是一個用於落地後重複清理的維護者手動工作流程。它預設為試執行，並且僅在 `apply=true` 時關閉明確列出的 PR。在變更 GitHub 之前，它會驗證落地的 PR 已合併，且每個重複項都有共享的參照 issue 或重疊的變更區塊。

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## 本地檢查閘門與變更路由

本地變更通道邏輯位於 `scripts/changed-lanes.mjs` 中，並由 `scripts/check-changed.mjs` 執行。與廣泛的 CI 平台範圍相比，該本地檢查閘門對架構邊界更為嚴格：

- 核心生產變更會執行 core prod 和 core test typecheck 以及 core lint/guards；
- 核心僅測試變更僅執行 core test typecheck 以及 core lint；
- 擴充生產變更會執行 extension prod 和 extension test typecheck 以及 extension lint；
- 擴充僅測試變更僅執行 extension test typecheck 以及 extension lint；
- 公開 Plugin SDK 或 plugin-contract 變更會擴展至 extension typecheck，因為擴充功能依賴這些核心合約（Vitest 擴充掃描仍保持為明確的測試工作）；
- 僅發行元數據 的版本遞增會執行針對性的版本/配置/根依賴檢查；
- 未知的根/配置變更會容錯為所有檢查通道。

本地變更測試的路由位於 `scripts/test-projects.test-support.mjs`，且有意設計得比 `check:changed` 更廉價：直接對測試的編輯會自行執行，原始碼編輯則偏好明確對應，然後是兄弟測試和匯入圖依賴項。共用的群組室遞送配置是明確對應之一：對群組可見回覆配置、來源回覆遞送模式或訊息工具系統提示的變更會路由經過核心回覆測試，加上 Discord 和 Slack 遞送回歸測試，因此共用的預設變更會在首次 PR 推送前失敗。僅當變更範圍廣泛到廉價的對應集不是可靠的代理時，才使用 `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`。

## Testbox 驗證

Crabbox 是版本庫擁有的遠端機器包裝器，用於維護者 Linux proof。當檢查對於本地編輯迴圈來說過於廣泛、當 CI 一致性很重要，或者 proof 需要密碼、Docker、套件通道、可重用機器或遠端日誌時，請從版本庫根目錄使用它。正常的 OpenClaw 後端是 `blacksmith-testbox`；擁有的 AWS/Hetzner 容量是 Blacksmith 停機、配額問題或明確的擁有容量測試的後備。

由 Crabbox 支援的 Blacksmith 會執行啟動、索取、同步、執行、報告和清理一次性 Testbox。當必要的根檔案（例如 `pnpm-lock.yaml`）消失，或當 `git status --short` 顯示至少 200 個受追蹤的刪除項目時，內建的同步健全性檢查會快速失敗。對於有意進行大量刪除的 PR，請為遠端指令設定 `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1`。

Crabbox 也會終止在同步階段停留超過五分鐘且沒有同步後輸出的本地 Blacksmith CLI 呼叫。設定 `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` 以停用該防護，或者針對異常大的本地差異使用更大的毫秒值。

在首次執行之前，請從版本庫根目錄檢查該包裝器：

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

repo wrapper 會拒絕未廣告 `blacksmith-testbox` 的過時 Crabbox 二進位檔。即使 `.crabbox.yaml` 有自有雲預設值，仍需明確傳遞 provider。在 Codex worktree 或連結/稀疏結帳中，請避免使用本地的 `pnpm crabbox:run` 腳本，因為 pnpm 可能在 Crabbox 啟動前協調相依性；請改為直接呼叫 node wrapper：

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

變更的 gate：

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

專注測試重跑：

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

讀取最終的 JSON 摘要。有用的欄位包括 `provider`、`leaseId`、`syncDelegated`、`exitCode`、`commandMs` 和 `totalMs`。單次 Blacksmith 支援的 Crabbox 執行應該會自動停止 Testbox；如果執行中斷或清理狀況不明，請檢查運作中的 box 並僅停止您建立的 box：

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

僅在您有意對同一個已準備好的 box 執行多個指令時才使用 reuse：

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

如果 Crabbox 是故障層級但 Blacksmith 本身運作正常，請僅將直接使用 Blacksmith 用於 `list`、`status` 和清理等診斷目的。在將直接 Blacksmith 執行視為維護者證明之前，請先修正 Crabbox 路徑。

如果 `blacksmith testbox list --all` 和 `blacksmith testbox status` 運作正常，但新的 warmups 在幾分鐘後仍 `queued` 且沒有 IP 或 Actions 執行 URL，請將其視為 Blacksmith provider、佇列、計費或 org 限制的壓力。停止您建立的已佇列 id，避免啟動更多 Testbox，並在其他人檢查 Blacksmith 儀表板、計費和 org 限制時，將證明移至下方的自有 Crabbox 容量路徑。

僅在 Blacksmith 當機、配額受限、缺少所需環境，或自有容量明確為目標時，才升級至自有 Crabbox 容量：

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

在 AWS 壓力下，除非任務確實需要 48xlarge 類別的 CPU，否則請避免使用 `class=beast`。`beast` 請求從 192 個 vCPU 開始，是觸發區域 EC2 Spot 或按需標準配額的最簡單方式。倉庫擁有的 `.crabbox.yaml` 預設為 `standard`、多個容量區域以及 `capacity.hints: true`，因此經仲介的 AWS 租約會列印選定的區域/市場、配額壓力、Spot 回退以及高壓力類別警告。對於較重的廣泛檢查，請使用 `fast`；只有在標準/快速檢查不足時才使用 `large`；並且僅對異常的 CPU 密集型通道使用 `beast`，例如全套件或所有外掛 Docker 矩陣、明確的發行/阻斷性驗證，或高核心效能分析。請勿對 `pnpm check:changed`、聚焦測試、僅文檔工作、一般 lint/typecheck、小型 E2E 重現或 Blacksmith 停機排查使用 `beast`。使用 `--market on-demand` 進行容量診斷，以免 Spot 市場波動混入訊號中。

`.crabbox.yaml` 擁有自有雲端通道的提供者、同步和 GitHub Actions 水合預設值。它排除本機 `.git`，因此水合的 Actions 檢出會保留其自己的遠端 Git 元數據，而不是同步維護者本機遠端和物件存儲，並且它排除不應傳輸的本機運行時/構建產物。`.github/workflows/crabbox-hydrate.yml` 擁有自有雲端 `crabbox run --id <cbx_id>` 指令的檢出、Node/pnpm 設定、`origin/main` 獲取以及非秘密環境交接。

## 相關

- [安裝概述](/zh-Hant/install)
- [開發頻道](/zh-Hant/install/development-channels)
